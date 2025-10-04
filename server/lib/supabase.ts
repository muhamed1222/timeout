import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is not set');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const hasServiceRoleKey = !!supabaseServiceRoleKey;

if (!hasServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set - Admin API operations may be limited');
}
