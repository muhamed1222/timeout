#!/usr/bin/env node

// Script to check company data in database
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

async function checkCompanyData() {
  console.log('🔍 Checking company data...\n');

  try {
    // Check companies
    const companies = await db.query.company.findMany();
    console.log(`📊 Total companies: ${companies.length}\n`);
    
    if (companies.length === 0) {
      console.log('❌ No companies found in database!');
      console.log('This explains the foreign key constraint error.');
      return;
    }

    console.log('🏢 Companies:');
    console.log('================================================================================');
    for (const company of companies) {
      console.log(`🏢 ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Created: ${new Date(company.created_at).toLocaleString()}`);
      console.log('----------------------------------------');
    }

    // Check employees
    const employees = await db.query.employee.findMany();
    console.log(`\n👥 Total employees: ${employees.length}\n`);
    
    console.log('👥 Employees:');
    console.log('================================================================================');
    for (const emp of employees) {
      console.log(`👤 ${emp.full_name}`);
      console.log(`   Company ID: ${emp.company_id}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Telegram: ${emp.telegram_user_id ? '✅ Connected' : '❌ Not connected'}`);
      console.log('----------------------------------------');
    }

    // Check for orphaned employees
    const orphanedEmployees = employees.filter(emp => 
      !companies.some(comp => comp.id === emp.company_id)
    );

    if (orphanedEmployees.length > 0) {
      console.log(`\n⚠️  Found ${orphanedEmployees.length} orphaned employees (company doesn't exist):`);
      for (const emp of orphanedEmployees) {
        console.log(`   - ${emp.full_name} (Company ID: ${emp.company_id})`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking company data:', error);
  } finally {
    await client.end();
  }
}

checkCompanyData();
