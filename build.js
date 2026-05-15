/**
 * Build script — compiles Investigation Tools into a standalone Windows executable.
 *
 * Usage:
 *   node build.js
 *
 * Output:
 *   dist-app/
 *     InvestigationTools.exe   (backend + Node.js runtime, ~60 MB)
 *     public/                  (React frontend static files)
 *
 * Requirements (run once before first build):
 *   cd backend && npm install
 *   cd frontend && npm install
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const FRONTEND = path.join(ROOT, 'frontend');
const BACKEND = path.join(ROOT, 'backend');
const BACKEND_PUBLIC = path.join(BACKEND, 'public');
const DIST = path.join(ROOT, 'dist-app');

console.log('\n╔══════════════════════════════════════╗');
console.log('║   Investigation Tools — Build        ║');
console.log('╚══════════════════════════════════════╝\n');

// ── Step 1: Build React frontend ──────────────────────────────────────────────
console.log('[1/3] Building React frontend...');
execSync('npm run build', { cwd: FRONTEND, stdio: 'inherit' });

// ── Step 2: Copy frontend/dist → backend/public ────────────────────────────
console.log('\n[2/3] Copying frontend build to backend/public...');
const FRONTEND_DIST = path.join(FRONTEND, 'dist');
if (!fs.existsSync(FRONTEND_DIST)) {
  console.error('ERROR: frontend/dist not found. Run "npm run build" in frontend first.');
  process.exit(1);
}
if (fs.existsSync(BACKEND_PUBLIC)) fs.rmSync(BACKEND_PUBLIC, { recursive: true });
copyDir(FRONTEND_DIST, BACKEND_PUBLIC);
console.log(`  Copied to: ${BACKEND_PUBLIC}`);

// ── Step 3: Compile with pkg ──────────────────────────────────────────────────
console.log('\n[3/3] Compiling to standalone executable (this may take a minute)...');
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const exePath = path.join(DIST, 'InvestigationTools.exe');
execSync(
  `npx pkg . --targets node18-win-x64 --output "${exePath}"`,
  { cwd: BACKEND, stdio: 'inherit' }
);

// Copy public folder next to the executable (frontend assets)
const DIST_PUBLIC = path.join(DIST, 'public');
if (fs.existsSync(DIST_PUBLIC)) fs.rmSync(DIST_PUBLIC, { recursive: true });
copyDir(BACKEND_PUBLIC, DIST_PUBLIC);

// ── Done ──────────────────────────────────────────────────────────────────────
const exeSizeMB = (fs.statSync(exePath).size / 1024 / 1024).toFixed(1);

console.log('\n✓ Build complete!\n');
console.log(`Output folder: ${DIST}`);
console.log(`  InvestigationTools.exe  (${exeSizeMB} MB)`);
console.log(`  public/                 (${countFiles(DIST_PUBLIC)} files)`);
console.log('\nHow to use:');
console.log('  1. Copy the entire dist-app/ folder to the target machine');
console.log('  2. Double-click InvestigationTools.exe');
console.log('  3. A browser window will open automatically at http://localhost:3001\n');

// ── Helpers ───────────────────────────────────────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function countFiles(dir) {
  let count = 0;
  function walk(p) {
    for (const item of fs.readdirSync(p)) {
      const full = path.join(p, item);
      fs.statSync(full).isDirectory() ? walk(full) : count++;
    }
  }
  if (fs.existsSync(dir)) walk(dir);
  return count;
}
