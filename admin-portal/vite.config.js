import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/admin',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      // Override for local testing: ADMIN_API_PROXY=http://localhost:3300 npm run dev
      '/api': process.env.ADMIN_API_PROXY || 'https://api.grahvarta.com',
    },
  },
});
