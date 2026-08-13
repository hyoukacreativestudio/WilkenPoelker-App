import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The desktop tool is a plain web app served to every company PC. It talks to
// the SAME backend as the mobile app. In dev it proxies /api to the local
// backend; in production set VITE_API_URL to https://api.wilkenpoelker.de/api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': { target: 'http://localhost:5002', changeOrigin: true },
    },
  },
});
