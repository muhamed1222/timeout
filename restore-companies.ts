#!/usr/bin/env node

// Script to restore missing companies from Supabase users
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from './shared/schema.ts';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceRoleKey || !databaseUrl) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const client = postgres(databaseUrl, {
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false
});
const db = drizzle(client, { schema });

async function restoreMissingCompanies() {
  console.log('🔧 Restoring missing companies...\n');

  try {
    // Get all users from Supabase
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    // Get existing companies from PostgreSQL
    const existingCompanies = await db.query.company.findMany();
    const existingCompanyIds = new Set(existingCompanies.map(c => c.id));

    console.log(`📊 Found ${users.users.length} users in Supabase`);
    console.log(`📊 Found ${existingCompanies.length} companies in PostgreSQL\n`);

    // Find missing companies
    const missingCompanyIds = new Set();
    const companyNames = new Map();

    for (const user of users.users) {
      const companyId = user.user_metadata?.company_id;
      if (companyId && !existingCompanyIds.has(companyId)) {
        missingCompanyIds.add(companyId);
        // Try to get company name from user metadata or use email domain
        const companyName = user.user_metadata?.company_name || 
                           user.email.split('@')[1] || 
                           'Unknown Company';
        companyNames.set(companyId, companyName);
      }
    }

    console.log(`🔍 Found ${missingCompanyIds.size} missing companies:\n`);

    if (missingCompanyIds.size === 0) {
      console.log('✅ All companies exist in PostgreSQL!');
      return;
    }

    // Create missing companies
    for (const companyId of missingCompanyIds) {
      const companyName = companyNames.get(companyId) || 'Unknown Company';
      
      try {
        const [newCompany] = await db.insert(schema.company).values({
          id: companyId,
          name: companyName,
          created_at: new Date()
        }).returning();

        console.log(`✅ Created company: ${newCompany.name} (${newCompany.id})`);
      } catch (error) {
        console.error(`❌ Failed to create company ${companyId}:`, error.message);
      }
    }

    console.log('\n🎉 Company restoration complete!');

  } catch (error) {
    console.error('❌ Error restoring companies:', error);
  } finally {
    await client.end();
  }
}

restoreMissingCompanies();
