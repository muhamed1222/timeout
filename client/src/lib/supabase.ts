import { createClient } from '@supabase/supabase-js';

// Поддержка обеих систем переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Проверка наличия переменных
if (!supabaseUrl) {
  console.error('❌ supabaseUrl is required. Please set VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  console.error('❌ supabaseAnonKey is required. Please set VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
