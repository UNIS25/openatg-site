import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '*.spec.ts', fullyParallel: true,
  workers: 3, retries: 0, timeout: 30_000,
  reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-results.json' }]],
  outputDir: 'artifacts/test-results',
  use: { baseURL: 'http://127.0.0.1:4188', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 1024, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'python3 -m http.server 4188 --bind 127.0.0.1 --directory ..',
    url: 'http://127.0.0.1:4188/varathans25/en/cigar-collection/',
    reuseExistingServer: false,
    stdout: 'ignore', stderr: 'ignore',
  },
});
