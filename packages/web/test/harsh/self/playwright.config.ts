// Harsh mode's own tests: the tests here are run with harsh mode off and on by test/harsh-self.test.mjs, which says
// what each must do in each run. Some are races on purpose (a read that a fast machine wins and harsh mode makes lose),
// so this config is never part of the package's Playwright run (playwright.config.ts reads src/ only).
import { defineConfig, devices } from '@playwright/test';
import { harshConfig, harshProject } from '../../harsh.js';

export default defineConfig({
  ...harshConfig(),
  testDir: '.',
  testMatch: '*.self.ts',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: { deviceScaleFactor: 1, colorScheme: 'light' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ].map(harshProject),
});
