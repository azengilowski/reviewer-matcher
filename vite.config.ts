import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' keeps asset paths relative so the build works on GitHub Pages
// project sites (served from /<repo>/) without hardcoding the repo name.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Installable PWA: precache the app shell (incl. the ONNX wasm) so the tool
    // works offline after the first visit (SPEC §8–9). The embedding model is
    // additionally cached at runtime from its CDN.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Reviewer Matcher',
        short_name: 'Matcher',
        description: 'Match academic reviewers to papers — runs entirely in your browser.',
        theme_color: '#2f5fe0',
        background_color: '#f7f7f8',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,svg}'],
        // The onnxruntime wasm is ~21 MB; raise the precache size cap to include it.
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('huggingface.co') || url.hostname.includes('jsdelivr.net'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'embedding-model',
              expiration: { maxEntries: 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // The match worker dynamically imports transformers.js (code-splitting),
  // which requires ES module workers rather than the default IIFE format.
  worker: { format: 'es' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
