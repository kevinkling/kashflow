import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Fase 10: reemplaza public/manifest.json + public/sw.js (Workbox generado en build,
    // no en dev). Paridad de estrategia con el sw.js viejo (kashflow-static-v18): HTML
    // siempre NetworkFirst para no quedar pegado a una solapa vieja; assets hasheados de
    // Vite tambien NetworkFirst con fallback a cache si no hay red.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'KashFlow',
        short_name: 'KashFlow',
        description: 'Finanzas personales — ingresos, egresos, obligaciones y simulador.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Nunca cachear /api: los datos son responsabilidad de los repositories/stores,
        // no del service worker (regla de negocio: nunca tragar un error en silencio).
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Navegaciones (documents): red primero, cache como fallback offline.
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'kf-documents', networkTimeoutSeconds: 5 },
          },
          {
            // Assets hasheados de Vite (JS/CSS/fuentes): red primero, con cache de respaldo.
            urlPattern: ({ request }: { request: Request }) =>
              ['script', 'style', 'font', 'image'].includes(request.destination),
            handler: 'NetworkFirst',
            options: { cacheName: 'kf-assets' },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Fase 0/1: el backend Express real corre en :3000 (pnpm dev en la raiz del repo).
      // Todo /api en desarrollo se reenvia ahi para no duplicar CORS/config.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
