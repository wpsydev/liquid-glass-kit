import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  root: 'site',
  base: './',
  build: {
    outDir: '../site-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        playground: resolve('site/index.html'),
        campaign: resolve('site/campaign/index.html'),
      },
    },
  },
});
