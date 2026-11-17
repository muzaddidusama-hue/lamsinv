import express from 'express';
import crypto from 'crypto';
import { authenticateEmployee, requireRole } from './auth.js';

const router = express.Router();
const adminOnly = [authenticateEmployee, requireRole('Admin', 'CEO')];
const allowedRoles = new Set(['Staff', 'Admin', 'CEO']);

function getAuthAdmin(client) {
  if (!client) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for user administration.');
  return client.auth.admin;
}

async function findAuthUserByEmail(authAdmin, email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  throw new Error('Too many auth users to safely locate this account.');
}

router.get('/users', ...adminOnly, async (req, res) => {
  const { data, error } = await req.supabaseAdmin.from('users').select('id, emp_id, name, email, role, is_active').order('id');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ users: data || [] });
});

router.post('/users', ...adminOnly, async (req, res) => {
  const empId = String(req.body.emp_id || '').trim().toUpperCase();
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = String(req.body.role || 'Staff');
  if (!empId || !name || !email || !allowedRoles.has(role)) return res.status(400).json({ error: 'Valid employee ID, name, email, and role are required.' });

  const authAdmin = getAuthAdmin(req.supabaseAdmin);
  const temporaryPassword = crypto.randomBytes(32).toString('base64url');
  const { data: created, error: createError } = await authAdmin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name, emp_id: empId },
    app_metadata: { role }
  });
  if (createError) return res.status(400).json({ error: createError.message });

  const { data: profile, error: dbError } = await req.supabaseAdmin.from('users').insert([{
    emp_id: empId, name, email, role, is_active: true
  }]).select('id, emp_id, name, email, role, is_active').single();
  if (dbError) {
    await authAdmin.deleteUser(created.user.id);
    return res.status(400).json({ error: dbError.message });
  }
  return res.status(201).json({ user: profile });
});

router.patch('/users/:id', ...adminOnly, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = String(req.body.role || '');
  if (!name || !email || !allowedRoles.has(role)) return res.status(400).json({ error: 'Valid name, email, and role are required.' });

  const { data: current, error: currentError } = await req.supabaseAdmin.from('users').select('*').eq('id', req.params.id).maybeSingle();
  if (currentError) return res.status(500).json({ error: currentError.message });
  if (!current) return res.status(404).json({ error: 'Employee not found.' });
  if (current.emp_id === 'ADMIN100' && role !== 'CEO') return res.status(403).json({ error: 'The owner account role cannot be reduced.' });

  const authAdmin = getAuthAdmin(req.supabaseAdmin);
  try {
    const authUser = await findAuthUserByEmail(authAdmin, current.email);
    if (authUser) {
      const { error } = await authAdmin.updateUserById(authUser.id, {
        email,
        user_metadata: { ...authUser.user_metadata, name },
        app_metadata: { ...authUser.app_metadata, role }
      });
      if (error) throw error;
    }
    const { data, error } = await req.supabaseAdmin.from('users').update({ name, email, role }).eq('id', req.params.id)
      .select('id, emp_id, name, email, role, is_active').single();
    if (error) throw error;
    return res.json({ user: data });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch('/users/:id/access', ...adminOnly, async (req, res) => {
  if (typeof req.body.is_active !== 'boolean') return res.status(400).json({ error: 'is_active must be a boolean.' });
  const { data: current, error: currentError } = await req.supabaseAdmin.from('users').select('emp_id').eq('id', req.params.id).maybeSingle();
  if (currentError) return res.status(500).json({ error: currentError.message });
  if (!current) return res.status(404).json({ error: 'Employee not found.' });
  if (current.emp_id === 'ADMIN100' && !req.body.is_active) return res.status(403).json({ error: 'The owner account cannot be blocked.' });
  const { error } = await req.supabaseAdmin.from('users').update({ is_active: req.body.is_active }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

router.delete('/users/:id', ...adminOnly, async (req, res) => {
  const { data: profile, error: profileError } = await req.supabaseAdmin.from('users').select('id, emp_id, email').eq('id', req.params.id).maybeSingle();
  if (profileError) return res.status(500).json({ error: profileError.message });
  if (!profile) return res.status(404).json({ error: 'Employee not found.' });
  if (profile.emp_id === 'ADMIN100') return res.status(403).json({ error: 'The owner account cannot be deleted.' });

  const authAdmin = getAuthAdmin(req.supabaseAdmin);
  try {
    const authUser = await findAuthUserByEmail(authAdmin, profile.email);
    if (authUser) {
      const { error } = await authAdmin.deleteUser(authUser.id);
      if (error) throw error;
    }
    const { error } = await req.supabaseAdmin.from('users').delete().eq('id', profile.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
