import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev the API runs on :5000; in production nginx proxies /api to it.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' },
  },
})
