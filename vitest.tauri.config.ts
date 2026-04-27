import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fileuni/ts-shared': fileURLToPath(new URL('../ts_shared', import.meta.url)),
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./node_modules/lucide-react', import.meta.url)),
      clsx: fileURLToPath(new URL('./node_modules/clsx', import.meta.url)),
      'tailwind-merge': fileURLToPath(new URL('./node_modules/tailwind-merge', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/tauri-test-setup.ts'],
    include: ['src/**/*.tauri.test.ts?(x)'],
    restoreMocks: true,
    clearMocks: true,
  },
});
