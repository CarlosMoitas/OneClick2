import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'text', 'text-summary'],
      reportsDirectory: './coverage',
      exclude: ["src/**/*.html", "src/app/app.routes.ts", "**/*.json"],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    }
  },
});
