import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'REPO_TREE.md');

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.husky', '.idea', '.vscode', '.pnpm-store', '.yarn', '.cache', '.turbo', '.next', '.nuxt',
  'dist', 'build', 'out', 'coverage', '.vercel', '.sst', '.docusaurus', '.expo', '.parcel-cache', 'tmp', 'temp'
]);

const EXCLUDE_FILES = new Set(['.DS_Store']);

function isExcludedDir(name) {
  return EXCLUDE_DIRS.has(name);
}

function isExcludedFile(name) {
  return EXCLUDE_FILES.has(name);
}

function listDir(dir) {
  try {
    let entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => {
        if (d.isDirectory() && isExcludedDir(d.name)) return false;
        if (!d.isDirectory() && isExcludedFile(d.name)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
      });
    return entries;
  } catch (err) {
    return [];
  }
}

function buildTree(dir, prefix = '') {
  const entries = listDir(dir);
  let lines = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
    const full = path.join(dir, e.name);

    lines.push(prefix + connector + e.name);
    
    if (e.isDirectory()) {
      const subTree = buildTree(full, nextPrefix);
      lines = lines.concat(subTree);
    }
  }

  return lines;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const treeLines = buildTree(ROOT);
const rootName = path.basename(ROOT);

const output = [
  '# Repository Tree',
  '',
  ...treeLines
];

fs.writeFileSync(OUT, output.join('\n'), 'utf8');
console.log('✅ Written:', OUT);
