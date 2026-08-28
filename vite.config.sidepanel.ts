import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const distDir = process.env.VAULTIC_DIST_DIR ?? resolve(__dirname, 'dist', 'chrome');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname, 'src/sidepanel'),
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@hooks': resolve(__dirname, 'src/hooks'),
    },
  },
  build: {
    outDir: resolve(distDir, 'sidepanel'),
    emptyOutDir: false,
  },
});
