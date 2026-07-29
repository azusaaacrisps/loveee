import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/loveee/',
  build: {
    sourcemap: 'hidden',
  },
  server: {
    hmr: {
      overlay: false,
    },
    proxy: {
      '/netease': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/netease/, ''),
      },
      '/weather/open-meteo': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/weather\/open-meteo/, ''),
      },
      '/weather/geocoding': {
        target: 'https://geocoding-api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/weather\/geocoding/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})
