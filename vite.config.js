import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    allowedHosts: true,
    proxy: {
      '/dashboard.html': 'http://127.0.0.1:8000',
      '/dashboard.html/': 'http://127.0.0.1:8000',
      '/dashboard/': 'http://127.0.0.1:8000',
      '/dashboard': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/map.html': 'http://127.0.0.1:8000',
      '/expiry-radar.html': 'http://127.0.0.1:8000',
      '/simulator.html': 'http://127.0.0.1:8000',
      '/audit.html': 'http://127.0.0.1:8000',
      '/recommendations': 'http://127.0.0.1:8000',
      '/approve': 'http://127.0.0.1:8000',
      '/risks': 'http://127.0.0.1:8000',
      '/runs': 'http://127.0.0.1:8000',
      '/run-now': 'http://127.0.0.1:8000',
      '/reorders': 'http://127.0.0.1:8000',
      '/map': 'http://127.0.0.1:8000',
      '/expiry-radar': 'http://127.0.0.1:8000',
      '/metrics': 'http://127.0.0.1:8000',
      '/digest': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/simulate': 'http://127.0.0.1:8000',
      '/audit': 'http://127.0.0.1:8000',
      '/dispatch-complete': 'http://127.0.0.1:8000',
      '/dispatch-tasks': 'http://127.0.0.1:8000',
      '/import': 'http://127.0.0.1:8000',
      '/forecast-accuracy': 'http://127.0.0.1:8000',
      '/outlets': 'http://127.0.0.1:8000'
    }
  }
});

