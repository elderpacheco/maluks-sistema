// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Dica: garanta que você tenha @types/node instalado para o import de 'node:path' funcionar em TS.
// npm i -D @types/node

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Agora "@" aponta para /src
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Habilite isto SOMENTE se quiser testar o PWA no ambiente de desenvolvimento:
      // devOptions: { enabled: true },

      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],
      manifest: {
        name: 'Maluks - Sistema',
        short_name: 'Maluks',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#7c3aed',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      // (Opcional) Algumas estratégias de cache default do Workbox
      // workbox: { /* runtimeCaching etc. */ },
    }),
  ],
  build: {
    outDir: 'dist',
  },
  server: {
    // Opcional: ajuste se quiser travar porta/host
    // port: 5173,
    // host: true,
  },
  preview: {
    // A prévia usa por padrão 4173. Você pode fixar outra porta se quiser.
    // port: 4173,
  },
})
