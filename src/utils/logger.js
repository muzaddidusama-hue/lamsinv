import { supabase } from '../supabaseClient';

export const logAction = async (action, details) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('audit_logs').insert([{
      user_name: session.user.user_metadata.name,
      role: session.user.user_metadata.role,
      action: action,
      details: details
    }]);
  } catch (error) {
    console.error("Audit log failed:", error);
  }
};