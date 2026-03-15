import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals:     true,
    include:     ['tests/js/**/*.test.js'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    coverage: {
      provider:  'v8',
      include:   ['web/*.js'],
      exclude:   ['web/app.js', 'web/ui-core.js', 'web/layout-instruction.js'],
    },
  },
})
