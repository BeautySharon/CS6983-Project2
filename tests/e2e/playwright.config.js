import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { databaseUri } from './test-environment.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const frontend = 'http://127.0.0.1:5192';
const backend = 'http://127.0.0.1:8092';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontend,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm start',
      cwd: `${root}pawtrust-backend`,
      url: `${backend}/pawtrust/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test', PORT: '8092', PawTrust_DB_URI: databaseUri,
        PawTrust_db: 'pawtrust_test', JWT_SECRET: randomUUID(), CORS_ORIGIN: frontend,
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5192 --strictPort',
      cwd: `${root}pawtrust-frontend`,
      url: frontend,
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: backend },
    },
  ],
});
