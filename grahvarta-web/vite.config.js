import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/web-api': {
        target: `http://localhost:${process.env.SERVER_PORT || 8787}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/web-api/, '/api'),
      },
    },
  },
})
