import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  root: 'site',
  base: './',
  build: {
    outDir: '../site-dist',
    emptyOutDir: true,
    // Preserve standard fallback declarations across browser targets.
    cssMinify: false,
    rollupOptions: {
      input: {
        playground: resolve('site/index.html'),
        campaign: resolve('site/campaign/index.html'),
        behavior: resolve('site/behavior/index.html'),
      },
    },
  },
});
