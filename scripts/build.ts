import { execSync } from 'child_process';
import { rmSync, mkdirSync, cpSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '..');
// Parse --target arg (default: chrome)
const args = process.argv.slice(2);
const targetArg = args.find((a) => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'chrome';

if (target !== 'chrome' && target !== 'firefox') {
  console.error(`Unknown target: ${target}. Use "chrome" or "firefox".`);
  process.exit(1);
}

const DIST = join(ROOT, 'dist', target);
process.env.VAULTIC_DIST_DIR = DIST;

function run(cmd: string) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

// Step 1: Clean dist/
console.log('Cleaning dist/...');
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// Step 2: Build each target sequentially
const configs = [
  'vite.config.popup.ts',
  'vite.config.sidepanel.ts',
  'vite.config.background.ts',
  'vite.config.content.ts',
];

for (const config of configs) {
  run(`npx vite build --config ${config}`);
}

// Step 3: Copy manifest
const manifestSrc = join(ROOT, 'src', 'manifest', `${target}.json`);
const manifestDest = join(DIST, 'manifest.json');

if (!existsSync(manifestSrc)) {
  console.error(`Manifest not found: ${manifestSrc}`);
  process.exit(1);
}

cpSync(manifestSrc, manifestDest);
console.log(`\nCopied ${target} manifest to dist/manifest.json`);

// Step 4: Copy icons
const iconsSrc = join(ROOT, 'public', 'icons');
const iconsDest = join(DIST, 'icons');

if (existsSync(iconsSrc)) {
  mkdirSync(iconsDest, { recursive: true });
  cpSync(iconsSrc, iconsDest, { recursive: true });
  console.log('Copied icons to dist/icons/');
} else {
  console.warn('Warning: public/icons/ not found, skipping icon copy.');
}

console.log('\nBuild complete!');
