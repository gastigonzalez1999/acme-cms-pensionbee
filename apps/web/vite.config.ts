import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: 5173,
    // Proxy API requests to the NestJS backend in development.
    // In production, VITE_API_BASE_URL is set to the Render URL.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pages': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Content can embed relative links to these (e.g. content/blog/index.md
      // links to /rss.xml) — proxy them too so those links work in dev.
      '/rss.xml': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
