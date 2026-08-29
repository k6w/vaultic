import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const distDir = process.env.VAULTIC_DIST_DIR ?? resolve(rootDir, 'dist', 'chrome');

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(rootDir, 'src/shared'),
      '@hooks': resolve(rootDir, 'src/hooks'),
    },
  },
  build: {
    outDir: resolve(distDir, 'background'),
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: resolve(rootDir, 'src/background/index.ts'),
      formats: ['iife'],
      name: 'background',
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
});
