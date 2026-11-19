import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const proxy = {
  '/api/v1': 'http://127.0.0.1:8000',
  '/health': 'http://127.0.0.1:8000',
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy,
  },
  preview: { proxy },
});
