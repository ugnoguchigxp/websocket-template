/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
      ],
    },
    // Exclude E2E tests from Vitest
    exclude: [
      'node_modules/',
      'e2e/',
      'dist/',
      '**/*.config.*',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@logger': path.resolve(__dirname, './src/modules/logger'),
    },
  },
})
