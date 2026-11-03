import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // Vite scans every .html in the root by default, which would include backup/.
    entries: ['index.html'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
