import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Das Repo wird als GitHub-Pages-Projektseite unter /strick-app/ ausgeliefert.
  base: '/strick-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Strick-App',
        short_name: 'Strick-App',
        description: 'Reihen- und Maschenzähler fürs Stricken',
        lang: 'de',
        display: 'standalone',
        // Farben aus src/index.css (Light-Theme)
        theme_color: '#fdf8f2',
        background_color: '#fdf8f2',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Alles aus dem Build vorab cachen, damit die App offline startet.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
