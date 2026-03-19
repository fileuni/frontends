import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  build: {
    format: 'file',
  },
  integrations: [react()],
  vite: {
    server: {
      // Avoid stale module cache in Tauri WebView dev mode.
      headers: {
        'Cache-Control': 'no-store',
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:19000',
          changeOrigin: true,
          ws: true,
        },
        // WebDAV is mounted at `/dav` (configurable; docs default to `/@dav`).
        // In dev we proxy both so clients can probe via the Astro dev server origin.
        '/dav': {
          target: 'http://127.0.0.1:19000',
          changeOrigin: true,
        },
        '/@dav': {
          target: 'http://127.0.0.1:19000',
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ['libphonenumber-js/max'],
      esbuildOptions: {
        loader: {
          '.keep': 'text',
        },
      },
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    }
  },
});
