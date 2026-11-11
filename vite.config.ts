import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shadcn components import from "@/...": here that is the shared copy.
    alias: { '@': path.resolve(__dirname, './src/shared') },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely: separate files stay cached across app updates.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        },
      },
    },
  },
});
