import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // The parity harness boots a full jsdom document per seed.
    testTimeout: 120_000,
  },
})
