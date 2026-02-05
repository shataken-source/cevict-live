import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  
  // Optimized parallel execution
  workers: process.env.CI ? 4 : undefined,
  
  // Fast-fail strategy: stop after 10 failures
  maxFailures: process.env.CI ? 10 : undefined,
  
  // Timeout settings
  timeout: 90 * 1000, // 90 seconds per test (increased for CI)
  expect: {
    timeout: 30000, // 30 seconds for assertions (increased for CI)
  },

  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'], // GitHub Actions annotations
    ['list'], // Console output
    ...(process.env.CI ? [['blob']] : []), // Blob reporter for sharding
  ],

  
  use: {
    baseURL: process.env.CI ? 'http://localhost:4173' : (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'),

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Performance optimizations
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 30 * 1000, // 30 seconds for navigation
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Run fewer browsers in CI for speed
    ...(process.env.CI ? [] : [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'mobile-chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'mobile-safari',
        use: { ...devices['iPhone 12'] },
      },
    ]),
  ],
  
  webServer: {
    command: process.env.CI ? 'npm run build && npm run preview' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 3 minutes to build and start
    stdout: 'pipe',
    stderr: 'pipe',
  },

});

