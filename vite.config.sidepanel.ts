import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = process.env.VAULTIC_DIST_DIR ?? resolve(rootDir, 'dist', 'chrome');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(rootDir, 'src/sidepanel'),
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(rootDir, 'src/shared'),
      '@hooks': resolve(rootDir, 'src/hooks'),
    },
  },
  build: {
    outDir: resolve(distDir, 'sidepanel'),
    emptyOutDir: false,
  },
});
