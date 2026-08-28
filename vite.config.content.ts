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
    outDir: resolve(distDir, 'content'),
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      formats: ['iife'],
      name: 'content',
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
});
