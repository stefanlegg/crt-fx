import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'crt-fx': path.resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
