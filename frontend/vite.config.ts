import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Strategic Rollup vendor chunking:
         * - vendor-react: Core React 19 runtime (long-term immutable cache)
         * - vendor-dnd: Isolated @dnd-kit physics and drag sensor libraries
         * - vendor-ui: Shared icon, toast, and dialog libraries
         * Keeps all generated bundles comfortably below 500 kB with 0 bundler warnings.
         */
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@dnd-kit')) {
            return 'vendor-dnd';
          }
          if (
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/sonner') ||
            id.includes('node_modules/sweetalert2')
          ) {
            return 'vendor-ui';
          }
        }
      }
    }
  }
});
