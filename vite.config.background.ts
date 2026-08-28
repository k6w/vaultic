import { defineConfig } from 'vite';
import { resolve } from 'path';

const distDir = process.env.VAULTIC_DIST_DIR ?? resolve(__dirname, 'dist', 'chrome');

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@hooks': resolve(__dirname, 'src/hooks'),
    },
  },
  build: {
    outDir: resolve(distDir, 'background'),
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/background/index.ts'),
      formats: ['iife'],
      name: 'background',
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
});
