import express from 'express';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import cors from 'cors';
import dotenv from 'dotenv';
import notificationRouter from '../routes/notifications.js';
import telegramRouter from '../routes/telegram.js';
import whatsappRouter from '../routes/whatsapp.js';
import apiControllerRouter, { apiGatekeeper } from '../routes/apiController.js';
import authRouter, { authenticateEmployee } from '../routes/auth.js';
import adminUsersRouter from '../routes/adminUsers.js';
import aiRouter from '../routes/ai.js';

dotenv.config();

process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY || '';

const app = express();

const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'https://lamspower.pro.bd,https://www.lamspower.pro.bd,http://localhost:5173,http://127.0.0.1:5173').split(',').map(origin => origin.trim()).filter(Boolean));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)), optionsSuccessStatus: 204 }));
app.use(express.json({ limit: '10mb', verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); } }));

// Load Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// 1. API Gatekeeper & Route Controller
app.use('/api/auth', authRouter);
app.use('/api/admin', adminUsersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/control', apiControllerRouter);
app.use(apiGatekeeper);

app.get('/api/query', authenticateEmployee, async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing target url parameter' });
  let parsedTarget;
  try {
    parsedTarget = new URL(String(targetUrl));
    if (parsedTarget.origin !== new URL(supabaseUrl).origin || !parsedTarget.pathname.startsWith('/rest/v1/')) {
      return res.status(400).json({ error: 'Only Supabase REST URLs for this project are allowed.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid target URL.' });
  }
  try {
    const response = await fetch(parsedTarget, {
      method: 'GET',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${req.authToken}`, 'Content-Type': 'application/json' }
    });
    const body = await response.text();
    res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(body);
  } catch {
    return res.status(502).json({ error: 'Failed to fetch data from Supabase.' });
  }
});

app.post('/api/invalidate', authenticateEmployee, (req, res) => {
  const tableName = String(req.query.table || '');
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) return res.status(400).json({ error: 'Invalid table name.' });
  return res.json({ success: true, keysDeleted: 0 });
});

// 2. Notification, Telegram & WhatsApp Routes
app.use('/api/notify', notificationRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/whatsapp', whatsappRouter);

// Export default app for Vercel Serverless
export default app;
