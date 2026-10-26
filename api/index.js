import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import notificationRouter from '../routes/notifications.js';
import telegramRouter from '../routes/telegram.js';
import apiControllerRouter, { apiGatekeeper } from '../routes/apiController.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Load Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iahytcrmstlkvnmwfxgs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// 1. API Gatekeeper & Route Controller
app.use('/api/control', apiControllerRouter);
app.use(apiGatekeeper);

// 2. Notification & Telegram Routes
app.use('/api/notify', notificationRouter);
app.use('/api/telegram', telegramRouter);

// 3. Fallback Query Proxy (if queried directly)
app.get('/api/query', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing target url parameter' });

  try {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    };
    const response = await fetch(targetUrl, { method: 'GET', headers });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).send(err);
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Export default app for Vercel Serverless
export default app;
