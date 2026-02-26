import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname, 'src/popup'),
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@hooks': resolve(__dirname, 'src/hooks'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist/popup'),
    emptyOutDir: false,
  },
});
