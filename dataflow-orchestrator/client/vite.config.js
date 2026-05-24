import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 4281,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4280',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'es2022'
  }
});
