import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Key: Use jsdom to simulate browser environment, so you can test DOM operations in files
    environment: 'jsdom',
    // Globally enable APIs like describe, it, expect, etc., so you don't need to manually import each time
    globals: true,
  },
})