import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests for the app's pure modules (formatting, notification text). Screens are
// checked in the simulator instead.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
