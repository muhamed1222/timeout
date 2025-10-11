import 'dotenv/config';
import { supabaseAdmin, hasServiceRoleKey } from '../server/lib/supabase';
import { storage } from '../server/storage';

async function main() {
  if (!hasServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to create demo admin.');
  }

  const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@timeout.app';
  const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';
  const DEMO_COMPANY = process.env.DEMO_COMPANY || 'Demo Company';
  const DEMO_FULL_NAME = process.env.DEMO_FULL_NAME || 'Demo Admin';

  // Find or create company
  const allCompanies = await storage.getAllCompanies();
  let company = allCompanies.find((c) => c.name === DEMO_COMPANY);
  if (!company) {
    company = await storage.createCompany({ name: DEMO_COMPANY });
    console.log('Created demo company:', company.id, company.name);
  } else {
    console.log('Using existing demo company:', company.id, company.name);
  }

  // Try to create user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      company_id: company.id,
      full_name: DEMO_FULL_NAME,
    },
  });

  if (error) {
    if (String(error.message).toLowerCase().includes('already registered')) {
      console.log('Demo user already exists, skipping creation.');
    } else {
      throw error;
    }
  } else {
    console.log('Created demo user:', data.user?.id);
  }

  console.log('\nDemo credentials:');
  console.log('  Email   :', DEMO_EMAIL);
  console.log('  Password:', DEMO_PASSWORD);
  console.log('  Company :', company.name, `(${company.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


