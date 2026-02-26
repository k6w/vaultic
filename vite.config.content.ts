import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@hooks': resolve(__dirname, 'src/hooks'),
    },
  },
  build: {
    outDir: 'dist/content',
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
