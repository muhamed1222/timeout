import { createClient } from '@supabase/supabase-js';

// Поддержка различных форматов переменных окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Логирование для отладки
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set in environment variables');
  console.error('Please set one of: VITE_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_URL');
}

if (!supabaseAnonKey) {
  console.error('❌ SUPABASE_ANON_KEY is not set in environment variables');
  console.error('Please set one of: VITE_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_ANON_KEY');
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
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY is not set - Admin API operations may be limited');
  console.warn('Some features like user registration may not work properly');
}
