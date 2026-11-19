import { defineConfig, devices } from '@playwright/test';

const python = process.env.FORENTRACE_E2E_PYTHON;
if (!python) throw new Error('Run npm run test:e2e to prepare the disposable PostgreSQL schema.');

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } }],
  webServer: [
    { command: `"${python}" -m uvicorn app.main:app --host 127.0.0.1 --port 8000`, url: 'http://127.0.0.1:8000/health', reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
  ],
});
