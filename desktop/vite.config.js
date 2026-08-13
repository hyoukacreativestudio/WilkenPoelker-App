import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The desktop tool is a plain web app served to every company PC. It talks to
// the SAME backend as the mobile app. In dev it proxies /api to the local
// backend; in production set VITE_API_URL to https://api.wilkenpoelker.de/api.
// Proxy target: local backend by default; set VITE_PROXY_TARGET to the live
// server (https://api.wilkenpoelker.de) so the desktop tool runs against
// production without any CORS setup.
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:5002';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true, // reachable from other PCs on the network
    proxy: {
      '/api': { target, changeOrigin: true, secure: false },
    },
  },
  preview: {
    port: 5180,
    host: true,
    proxy: {
      '/api': { target, changeOrigin: true, secure: false },
    },
  },
});
