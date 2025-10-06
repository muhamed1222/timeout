#!/usr/bin/env node
// Simple integration smoke test for violations & ratings API

const BASE = process.env.BASE_URL || 'http://localhost:3001';
const COMPANY_ID = process.env.COMPANY_ID || process.env.TEST_COMPANY_ID || '';
const EMPLOYEE_ID = process.env.EMPLOYEE_ID || process.env.TEST_EMPLOYEE_ID || '';
const RULE_NAME = process.env.RULE_NAME || 'Тестовое нарушение';
const RULE_CODE = process.env.RULE_CODE || 'test_rule';

async function main() {
  if (!COMPANY_ID) {
    console.error('Set COMPANY_ID env');
    process.exit(1);
  }

  console.log('🏁 Start API smoke test');

  // 1) Fetch rules
  console.log('\n1) GET violation rules');
  let res = await fetch(`${BASE}/api/companies/${COMPANY_ID}/violation-rules`);
  console.log('Status:', res.status);
  let rules = await res.json();
  console.log('Rules:', Array.isArray(rules) ? rules.length : rules);

  // 2) Ensure a rule exists (create if not)
  let rule = Array.isArray(rules) ? rules.find(r => r.code === RULE_CODE) : null;
  if (!rule) {
    console.log('\n2) POST create violation rule');
    res = await fetch(`${BASE}/api/violation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        code: RULE_CODE,
        name: RULE_NAME,
        penalty_percent: 5,
        auto_detectable: false,
        is_active: true,
      })
    });
    console.log('Status:', res.status);
    rule = await res.json();
  }

  if (!EMPLOYEE_ID) {
    console.log('\nℹ️ EMPLOYEE_ID not set; skipping violation create.');
    process.exit(0);
  }

  // 3) Create a violation for employee
  console.log('\n3) POST create violation');
  res = await fetch(`${BASE}/api/violations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee_id: EMPLOYEE_ID,
      company_id: COMPANY_ID,
      rule_id: rule.id,
      source: 'manual',
      reason: 'Smoke test'
    })
  });
  console.log('Status:', res.status);
  const violationResp = await res.json();
  console.log('Violation:', violationResp);

  // 4) Recalculate company ratings
  console.log('\n4) POST recalc company ratings');
  res = await fetch(`${BASE}/api/companies/${COMPANY_ID}/ratings/recalculate`, { method: 'POST' });
  console.log('Status:', res.status);
  const recalc = await res.json();
  console.log('Recalc:', recalc);

  // 5) Read ratings for current month
  console.log('\n5) GET company ratings (current month)');
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  res = await fetch(`${BASE}/api/companies/${COMPANY_ID}/ratings?periodStart=${periodStart}&periodEnd=${periodEnd}`);
  console.log('Status:', res.status);
  const ratings = await res.json();
  console.log('Ratings count:', Array.isArray(ratings) ? ratings.length : ratings);

  console.log('\n✅ Done');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


