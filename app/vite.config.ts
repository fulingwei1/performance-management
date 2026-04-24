import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'vendor-react';
          }

          if (id.includes('/@radix-ui/')) {
            return 'vendor-ui';
          }

          if (id.includes('/recharts/') || id.includes('/reactflow/') || id.includes('/dagre/')) {
            return 'vendor-charts';
          }

          if (id.includes('/framer-motion/') || id.includes('/lucide-react/') || id.includes('/@heroicons/')) {
            return 'vendor-visual';
          }

          if (id.includes('/axios/') || id.includes('/zustand/') || id.includes('/date-fns/') || id.includes('/zod/')) {
            return 'vendor-utils';
          }

          return undefined;
        },
      },
    },
  },
});
