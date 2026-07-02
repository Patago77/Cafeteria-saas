import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-jwt-secret-solo-para-tests',
      ENCRYPTION_KEY: 'aa'.repeat(32),
    },
  },
});
