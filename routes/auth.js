import express from 'express';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

export const router = express.Router();

const getConfig = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
});

let authClient;
let adminClient;
function getClients() {
  const { url, anonKey, serviceKey } = getConfig();
  if (!url || !anonKey || !serviceKey) return null;
  authClient ||= createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  adminClient ||= createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { authClient, adminClient };
}

export async function authenticateEmployee(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const clients = getClients();
  if (!clients) return res.status(503).json({ error: 'Server authentication is not configured.' });

  try {
    const { data: { user }, error: authError } = await clients.authClient.auth.getUser(token);
    if (authError || !user?.email) return res.status(401).json({ error: 'Session is invalid or expired.' });

    const { data: profile, error: profileError } = await clients.adminClient
      .from('users')
      .select('id, emp_id, name, email, role, is_active')
      .ilike('email', user.email)
      .maybeSingle();
    if (profileError) {
      console.error('[Auth profile lookup failed]:', profileError.message);
      return res.status(503).json({ error: 'Unable to validate employee access.' });
    }
    if (!profile || profile.is_active !== true) return res.status(403).json({ error: 'This account is not active.' });

    req.employee = profile;
    req.authUser = user;
    req.authToken = token;
    req.supabaseAdmin = clients.adminClient;
    return next();
  } catch (error) {
    console.error('[Authentication error]:', error.message);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.employee?.role)) return res.status(403).json({ error: 'Insufficient permissions.' });
    return next();
  };
}

router.get('/profile', authenticateEmployee, (req, res) => {
  const { id, emp_id: empId, name, email, role } = req.employee;
  return res.json({ profile: { id, empId, name, email, role } });
});

export function getAdminClient() {
  return getClients()?.adminClient || null;
}
