import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
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

          if (id.includes('/recharts/')) {
            return 'vendor-recharts';
          }

          if (id.includes('/framer-motion/') || id.includes('/lucide-react/') || id.includes('/@heroicons/')) {
            return 'vendor-visual';
          }

          if (id.includes('/zustand/') || id.includes('/date-fns/')) {
            return 'vendor-utils';
          }

          return undefined;
        },
      },
    },
  },
});
