import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxies any request starting with /api-freetogame to FreeToGame servers directly
      '/api-freetogame': {
        target: 'https://www.freetogame.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api-freetogame/, ''),
      },
    },
  },
});