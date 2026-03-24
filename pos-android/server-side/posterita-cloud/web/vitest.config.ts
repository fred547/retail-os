import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 60000,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/app/api/**/*.ts', 'src/lib/**/*.ts'],
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        'e2e/**',
        '**/*.d.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
