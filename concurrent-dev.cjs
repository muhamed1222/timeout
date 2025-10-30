#!/usr/bin/env node

// Script to run frontend and backend simultaneously in development mode

const { spawn } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

console.log('🚀 Starting project in development mode...\n');

// Start backend
console.log('🔧 Starting backend on port 3001...');
const backend = spawn('npx', ['tsx', '-r', 'dotenv/config', 'server/index.ts'], {
  env: {
    ...process.env,
    PORT: '3001',
    // Default safe dev env
    USE_INMEMORY_STORAGE: process.env.USE_INMEMORY_STORAGE || 'true',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shiftmanager',
    SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'dev-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-service-role-key',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'dev-telegram-token',
    BOT_API_SECRET: process.env.BOT_API_SECRET || '0123456789abcdef0123456789abcdef',
    SESSION_SECRET: process.env.SESSION_SECRET || 'fedcba9876543210fedcba9876543210',
    // Prefer IPv4 DNS results to avoid ENOTFOUND issues in some environments
    NODE_OPTIONS: process.env.NODE_OPTIONS
      ? `${process.env.NODE_OPTIONS} --dns-result-order=ipv4first`
      : '--dns-result-order=ipv4first',
  },
  stdio: 'inherit'
});

// Start frontend
console.log('🎨 Starting frontend on port 5173...');
const frontend = spawn('npx', ['vite'], {
  stdio: 'inherit'
});

// Handle process termination
backend.on('close', (code) => {
  console.log(`🔧 Backend exited with code ${code}`);
  frontend.kill();
});

frontend.on('close', (code) => {
  console.log(`🎨 Frontend exited with code ${code}`);
  backend.kill();
});

// Handle exit signals
process.on('SIGINT', () => {
  console.log('\n🛑 Received termination signal, stopping processes...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received termination signal, stopping processes...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

console.log('\n✅ Project started!');
console.log('   Frontend: http://localhost:5173');
console.log('   Backend API: http://localhost:3001/api/*');
console.log('\nPress Ctrl+C to stop.');