import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run dev` starts the API (tsx, server/index.ts) next to Vite. The browser only ever talks
// to Vite's origin; /api is proxied to the Express server (default port 3001, override with API_PORT).
const apiTarget = `http://localhost:${process.env.API_PORT ?? 3001}`

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiTarget,
      '/.well-known': apiTarget,
    },
  },
  optimizeDeps: {
    include: ['@zxing/browser', '@zxing/library'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})
