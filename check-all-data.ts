#!/usr/bin/env node

// Script to check all data in database
import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from './shared/schema.ts';

// Load environment variables
config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const client = postgres(databaseUrl, {
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false
});
const db = drizzle(client, { schema });

async function checkAllData() {
  console.log('🔍 Checking all database data...\n');

  try {
    // Check all tables
    const companies = await db.query.company.findMany();
    const employees = await db.query.employee.findMany();
    const adminUsers = await db.query.admin_user.findMany();
    const invites = await db.query.employee_invite.findMany();

    console.log('📊 Database Summary:');
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Admin Users: ${adminUsers.length}`);
    console.log(`   Employees: ${employees.length}`);
    console.log(`   Invites: ${invites.length}\n`);

    if (adminUsers.length > 0) {
      console.log('👑 Admin Users:');
      console.log('================================================================================');
      for (const admin of adminUsers) {
        console.log(`👑 ${admin.email}`);
        console.log(`   Company ID: ${admin.company_id}`);
        console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`);
        console.log('----------------------------------------');
      }
    }

    if (employees.length > 0) {
      console.log('\n👥 Employees:');
      console.log('================================================================================');
      for (const emp of employees) {
        console.log(`👤 ${emp.full_name}`);
        console.log(`   Company ID: ${emp.company_id}`);
        console.log(`   Status: ${emp.status}`);
        console.log(`   Telegram: ${emp.telegram_user_id ? '✅ Connected' : '❌ Not connected'}`);
        console.log('----------------------------------------');
      }
    }

    if (invites.length > 0) {
      console.log('\n🎫 Invites:');
      console.log('================================================================================');
      for (const inv of invites) {
        console.log(`🎫 ${inv.full_name} (${inv.code})`);
        console.log(`   Company ID: ${inv.company_id}`);
        console.log(`   Status: ${inv.used_at ? '✅ Used' : '⏳ Pending'}`);
        console.log('----------------------------------------');
      }
    }

    // Check for data consistency issues
    console.log('\n🔍 Data Consistency Check:');
    
    const uniqueCompanyIds = new Set([
      ...employees.map(e => e.company_id),
      ...invites.map(i => i.company_id),
      ...adminUsers.map(a => a.company_id)
    ]);

    console.log(`   Unique Company IDs referenced: ${uniqueCompanyIds.size}`);
    for (const id of uniqueCompanyIds) {
      console.log(`   - ${id}`);
    }

    if (companies.length === 0 && uniqueCompanyIds.size > 0) {
      console.log('\n❌ PROBLEM: No companies exist, but data references company IDs!');
      console.log('   This is causing the foreign key constraint errors.');
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await client.end();
  }
}

checkAllData();
