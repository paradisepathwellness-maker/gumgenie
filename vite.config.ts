import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Stable dev port to avoid conflicts with other services commonly using 3000.
// If 3110 is taken, Vite will fail fast (strictPort=true) so devs know immediately.
const DEV_PORT = 3110;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: DEV_PORT,
      strictPort: true,
      host: '0.0.0.0',
      // Allow Playwright running from Docker (MCP) to access the dev server.
      // Vite 6 blocks unknown hosts by default.
      allowedHosts: ['host.docker.internal'],
    },
    plugins: [react()],
    // PRE-LAUNCH ONLY: client-side Gemini requires an API key in the browser.
    // Before shipping publicly, remove this and proxy Gemini through the backend.
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_MODEL_DEFAULT': JSON.stringify(env.GEMINI_MODEL_DEFAULT),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
