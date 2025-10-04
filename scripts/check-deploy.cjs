#!/usr/bin/env node

// Скрипт проверки готовности к деплою на Vercel

const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка готовности к деплою на Vercel...\n');

const checks = [
  {
    name: 'Проверка vercel.json',
    check: () => fs.existsSync('vercel.json'),
    fix: 'Файл vercel.json уже создан'
  },
  {
    name: 'Проверка vercel.json на корректность',
    check: () => {
      try {
        const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
        // Проверяем что нет секции functions с runtime
        return !vercelConfig.functions || !vercelConfig.functions['api/**/*.js'] || !vercelConfig.functions['api/**/*.js'].runtime;
      } catch (e) {
        return false;
      }
    },
    fix: 'Удалите секцию "functions" из vercel.json или см. VERCEL_FIX.md'
  },
  {
    name: 'Проверка API функции',
    check: () => fs.existsSync('api/index.js'),
    fix: 'API функция уже создана в api/index.js'
  },
  {
    name: 'Проверка .env.example',
    check: () => fs.existsSync('.env.example'),
    fix: 'Файл .env.example уже создан'
  },
  {
    name: 'Проверка README.md',
    check: () => fs.existsSync('README.md'),
    fix: 'Файл README.md уже создан'
  },
  {
    name: 'Проверка папки dist/public после сборки',
    check: () => fs.existsSync('dist/public/index.html'),
    fix: 'Запустите: npm run build'
  },
  {
    name: 'Проверка package.json scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts && pkg.scripts['build:vercel'];
    },
    fix: 'Скрипт build:vercel уже добавлен'
  }
];

let allPassed = true;

checks.forEach((check, i) => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${i + 1}. ${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   💡 ${check.fix}\n`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 Проект готов к деплою на Vercel!');
  console.log('\nСледующие шаги:');
  console.log('1. Создайте репозиторий на GitHub');
  console.log('2. Загрузите код: git add . && git commit -m "Ready for Vercel" && git push');
  console.log('3. Подключите репозиторий в Vercel Dashboard');
  console.log('4. Настройте переменные окружения в Vercel');
  console.log('5. Деплойте проект!');
} else {
  console.log('⚠️  Необходимо исправить ошибки перед деплоем');
}

console.log('\n📖 Подробная инструкция: см. файл DEPLOY.md');