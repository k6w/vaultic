import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetArgument = process.argv.find((argument) => argument.startsWith('--target='));
const target = targetArgument?.split('=')[1] ?? 'chrome';
if (!['chrome', 'firefox'].includes(target)) throw new Error(`Unknown target: ${target}`);

const output = join(root, 'dist', target);
process.env.VAULTIC_DIST_DIR = output;
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const config of [
  'vite.config.popup.ts',
  'vite.config.sidepanel.ts',
  'vite.config.background.ts',
  'vite.config.content.ts',
]) {
  console.log(`\n> vite build --config ${config}`);
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  execFileSync(process.execPath, [vite, 'build', '--config', config, '--configLoader', 'runner'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
}

const manifest = join(root, 'src', 'manifest', `${target}.json`);
if (!existsSync(manifest)) throw new Error(`Manifest not found: ${manifest}`);
cpSync(manifest, join(output, 'manifest.json'));

const icons = join(root, 'public', 'icons');
if (existsSync(icons)) cpSync(icons, join(output, 'icons'), { recursive: true });
console.log(`\nBuilt ${target} extension in dist/${target}`);
