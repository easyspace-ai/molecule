import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    process.env.ANALYZE === 'true' &&
      visualizer({
        open: false,
        filename: 'dist/stats.html',
        gzipSize: true,
      }),
  ].filter(Boolean),
  server: {
    port: 5199,
  },
  preview: {
    port: 5199,
    host: '127.0.0.1',
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor')) {
            return 'monaco';
          }
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
