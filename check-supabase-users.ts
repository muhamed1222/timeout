#!/usr/bin/env node

// Script to check Supabase users
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase configuration.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkSupabaseUsers() {
  console.log('🔍 Checking Supabase users...\n');

  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log(`📊 Total users: ${users.users.length}\n`);

    if (users.users.length === 0) {
      console.log('❌ No users found in Supabase!');
      console.log('   This means no one has registered yet.');
      return;
    }

    console.log('👥 Users:');
    console.log('================================================================================');
    for (const user of users.users) {
      console.log(`👤 ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Company ID: ${user.user_metadata?.company_id || 'Not set'}`);
      console.log(`   Full Name: ${user.user_metadata?.full_name || 'Not set'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? '✅ Yes' : '❌ No'}`);
      console.log('----------------------------------------');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkSupabaseUsers();
