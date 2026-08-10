const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load Supabase credentials from server env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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
      console.log(`[Redis]: Redis Client connected and ready at ${redisUrl}`);
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

// 2. GET API Query Caching Endpoint
app.get('/api/query', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target url parameter' });
  }

  const cacheKey = `redis-cache:${targetUrl}`;

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
      'Authorization': `Bearer ${supabaseAnonKey}`
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
app.post('/api/invalidate', async (req, res) => {
  const tableName = req.query.table;

  if (!tableName) {
    return res.status(400).json({ error: 'Missing table parameter' });
  }

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

// 4. Production Static File Serving
// In production mode, serve built Vite React files
const path = require('path');
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// For React SPA routes, fall back to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  Caching & Redis Proxy Server running on port ${PORT}`);
  console.log(`  Target Supabase URL: ${supabaseUrl}`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================================`);
});
