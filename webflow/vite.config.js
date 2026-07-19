import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const N8N_TARGET =
  process.env.VITE_N8N_BASE_URL?.replace(/\/$/, '') || 'https://lifesolvenow.onrender.com'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/n8n': {
        target: N8N_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
    },
  },
})
