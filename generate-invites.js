#!/usr/bin/env node

// Script to generate invite codes for existing employees
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from './shared/schema.ts';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceRoleKey || !databaseUrl) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Initialize database connection
const client = postgres(databaseUrl, { 
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false 
});
const db = drizzle(client, { schema });

// Initialize Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function generateInviteForEmployee(employee) {
  try {
    // Generate unique invite code
    const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Create invite
    const [invite] = await db.insert(schema.employee_invite).values({
      company_id: employee.company_id,
      code: code,
      full_name: employee.full_name,
      position: employee.position
    }).returning();
    
    console.log(`✅ Created invite for ${employee.full_name}: ${code}`);
    return invite;
  } catch (error) {
    console.error(`❌ Error creating invite for ${employee.full_name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding employees without Telegram connection...\n');
  
  try {
    // Get all employees without telegram_user_id
    const employeesWithoutTelegram = await db
      .select()
      .from(schema.employee)
      .where(eq(schema.employee.telegram_user_id, null));
    
    console.log(`📊 Found ${employeesWithoutTelegram.length} employees without Telegram connection\n`);
    
    if (employeesWithoutTelegram.length === 0) {
      console.log('✅ All employees already have Telegram connections!');
      return;
    }
    
    // Generate invites for each employee
    const invites = [];
    for (const employee of employeesWithoutTelegram) {
      const invite = await generateInviteForEmployee(employee);
      if (invite) {
        invites.push(invite);
      }
    }
    
    console.log(`\n🎉 Generated ${invites.length} invite codes!\n`);
    
    // Display invite links
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourBotName';
    
    console.log('📱 Invite Links:');
    console.log('='.repeat(50));
    
    for (const invite of invites) {
      const deepLink = `https://t.me/${botUsername}?start=${invite.code}`;
      console.log(`👤 ${invite.full_name} (${invite.position || 'No position'})`);
      console.log(`🔗 ${deepLink}`);
      console.log(`📋 Code: ${invite.code}`);
      console.log('-'.repeat(30));
    }
    
    console.log('\n📝 Instructions:');
    console.log('1. Send the invite links to your employees');
    console.log('2. They should click the link or use /start <code> in the bot');
    console.log('3. Once they connect, they will be able to use the bot');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.end();
  }
}

main();
