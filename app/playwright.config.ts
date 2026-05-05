import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5175);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 3102);
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const backendUrl = `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `cd ../backend && env PORT=${backendPort} USE_MEMORY_DB=true INITIAL_EMPLOYEE_TEMP_PASSWORD=123456 JWT_SECRET=e2e-test-secret-please-change CORS_ORIGINS=${frontendUrl} npm run dev`,
      url: `${backendUrl}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `env VITE_API_URL=${backendUrl}/api npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
