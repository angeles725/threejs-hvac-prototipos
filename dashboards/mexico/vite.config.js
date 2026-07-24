import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import niagaraMock from './vite/niagara-mock-plugin.js';

export default defineConfig({
  plugins: [react(), niagaraMock()],
  server: {
    host: true,
    port: 5173,
  },
});
