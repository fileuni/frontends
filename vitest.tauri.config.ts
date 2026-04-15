import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fileuni/ts-shared': fileURLToPath(new URL('../ts_shared', import.meta.url)),
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
