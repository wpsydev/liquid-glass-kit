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
        motion: resolve('site/motion/index.html'),
        optics: resolve('site/optics/index.html'),
        mobile: resolve('site/mobile/index.html'),
        aiDesign: resolve('site/ai-design/index.html'),
        overlays: resolve('site/overlays/index.html'),
        microMotion: resolve('site/micro-motion/index.html'),
        performance: resolve('site/performance/index.html'),
        flow: resolve('site/flow/index.html'),
        fusion: resolve('site/fusion/index.html'),
        loading: resolve('site/loading/index.html'),
        caustics: resolve('site/caustics/index.html'),
        workbench: resolve('site/workbench/index.html'),
        dock: resolve('site/dock/index.html'),
      },
    },
  },
});
