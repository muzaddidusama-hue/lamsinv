import express from 'express';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import cors from 'cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import notificationRouter from './routes/notifications.js';
import telegramRouter from './routes/telegram.js';
import whatsappRouter from './routes/whatsapp.js';
import apiControllerRouter, { apiGatekeeper } from './routes/apiController.js';
import authRouter, { authenticateEmployee } from './routes/auth.js';
import adminUsersRouter from './routes/adminUsers.js';
import aiRouter from './routes/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'https://lamspower.pro.bd,https://www.lamspower.pro.bd,http://localhost:5173,http://127.0.0.1:5173').split(',').map(origin => origin.trim()).filter(Boolean));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)), optionsSuccessStatus: 204 }));
app.use(express.json({ limit: '10mb', verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); } }));

// Load Supabase credentials from server env
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.warn('[Server Warning]: VITE_SUPABASE_ANON_KEY is not defined in environment variables.');
}

// 1. Initialize Redis Client
let redisClient = null;
let isRedisConnected = false;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function connectRedis() {
  try {
    redisClient = createClient({
      url: redisUrl,
      // Reconnect strategy
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.error('[Redis]: Max reconnection retries reached. Running without Redis cache.');
            isRedisConnected = false;
            return false; // Stop retrying
          }
          return Math.min(retries * 500, 2000); // Retry delay
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Redis Error]:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis]: Connecting to Redis store...');
    });

    redisClient.on('ready', () => {
      console.log('[Redis]: Redis Client connected and ready.');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (err) {
    console.error('[Redis Initialization Error]: Running in fallback mode without Redis caching.', err.message);
    isRedisConnected = false;
  }
}

connectRedis();

// Cache TTL in seconds (5 minutes)
const REDIS_CACHE_TTL = 300;

// 2. API Gatekeeper & Route Controller
app.use('/api/auth', authRouter);
app.use('/api/admin', adminUsersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/control', apiControllerRouter);
app.use(apiGatekeeper);

// 3. GET API Query Caching Endpoint
app.get('/api/query', authenticateEmployee, async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target url parameter' });
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(String(targetUrl));
    const expected = new URL(supabaseUrl);
    if (parsedTarget.origin !== expected.origin || !parsedTarget.pathname.startsWith('/rest/v1/')) {
      return res.status(400).json({ error: 'Only Supabase REST URLs for this project are allowed.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid target URL.' });
  }

  const cacheKey = `redis-cache:${req.employee.id}:${targetUrl}`;

  // A. Check Redis Cache
  if (isRedisConnected && redisClient) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis Cache Hit]: ${targetUrl}`);
        return res.json(JSON.parse(cachedData));
      }
    } catch (err) {
      console.error('[Redis Read Error]:', err.message);
    }
  }

  // B. Cache Miss: Fetch from Supabase
  console.log(`[Redis Cache Miss]: Fetching from Supabase API: ${targetUrl}`);
  try {
    // Construct headers, forwarding supabase key if available
    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${req.authToken}`
    };

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    const data = await response.json();

    // C. Save to Redis Cache (async)
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(data), {
          EX: REDIS_CACHE_TTL
        });
        console.log(`[Redis Cache Set]: Successfully cached query for ${targetUrl}`);
      } catch (err) {
        console.error('[Redis Write Error]:', err.message);
      }
    }

    return res.json(data);
  } catch (err) {
    console.error('[Supabase Fetch Error]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch from data source', details: err.message });
  }
});

// 3. POST Cache Invalidation Endpoint
app.post('/api/invalidate', authenticateEmployee, async (req, res) => {
  const tableName = req.query.table;

  if (!tableName) {
    return res.status(400).json({ error: 'Missing table parameter' });
  }
  if (!/^[a-z_][a-z0-9_]*$/i.test(String(tableName))) return res.status(400).json({ error: 'Invalid table name.' });

  console.log(`[Redis Invalidate Request]: Purging keys for table [${tableName}]`);

  if (!isRedisConnected || !redisClient) {
    return res.json({ success: true, message: 'Redis not active, client-side cache handles invalidation.' });
  }

  try {
    // Pattern to look for: redis-cache:*rest/v1/tableName*
    const pattern = `redis-cache:*rest/v1/${tableName}*`;
    
    // In production Redis environments, scan is preferred over KEYS for performance
    let cursor = 0;
    let keysDeleted = 0;
    
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      cursor = reply.cursor;
      const keys = reply.keys;
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        keysDeleted += keys.length;
      }
    } while (cursor !== 0);

    console.log(`[Redis Invalidation Success]: Deleted ${keysDeleted} cached keys matching [${tableName}]`);
    return res.json({ success: true, keysDeleted });
  } catch (err) {
    console.error('[Redis Invalidation Error]:', err.message);
    return res.status(500).json({ error: 'Failed to invalidate cache', details: err.message });
  }
});

// 4. Notification & Telegram Routes
app.use('/api/notify', notificationRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/whatsapp', whatsappRouter);

// 5. Production Static File Serving
// In production mode, serve built Vite React files
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// For React SPA routes, fall back to index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  Caching & Proxy Server running on port ${PORT}`);
  console.log(`  Target Supabase URL: ${supabaseUrl}`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================================`);
});
