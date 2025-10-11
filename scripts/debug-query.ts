import 'dotenv/config';
import { storage } from '../server/storage';

async function main() {
  const employeeId = process.argv[2];
  const companyId = process.argv[3];

  if (!employeeId && !companyId) {
    console.error('Usage: tsx scripts/debug-query.ts <employeeId?> <companyId?>');
    process.exit(1);
  }

  if (employeeId) {
    const employee = await storage.getEmployee(employeeId);
    console.log('Employee by ID:', employee);
  }

  if (companyId) {
    const employees = await storage.getEmployeesByCompany(companyId);
    console.log('Employees by company:', employees);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


