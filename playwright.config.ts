import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.PLAYWRIGHT_ENV_FILE ?? '.env.stage' });

const baseURL = process.env.SLATE_BASE_URL ?? 'https://edm.test.technolutions.net';
const ocrDashboardURL = process.env.OCR_DASHBOARD_URL ?? 'https://landing-stage-hil.goedmo.com/hil/dashboard';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    timeout: 1200000,
    expect: { timeout: 10_000 },
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        ignoreHTTPSErrors: false,
    },
    projects: [
        {
            name: 'auth-setup',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Edge'] },
        },
        {
            name: 'chromium',
            testIgnore: /auth\.setup\.ts|ocr\.spec\.ts|tce-hil\.spec\.ts|tce\.spec\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/slate.json',
            },
        },
        {
            name: 'tce-hil',
            testMatch: /tce-hil\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                baseURL,
                storageState: '.auth/slate.json',
            },
        },
        {
            name: 'ocr-chromium',
            testMatch: /ocr\.spec\.ts/,
            dependencies: ['tce-hil'],
            use: {
                ...devices['Desktop Chrome'],
                baseURL: ocrDashboardURL,
                storageState: { cookies: [], origins: [] },
            },
        },
        {
            name: 'tce-dashboard-chromium',
            testMatch: /tce\.spec\.ts/,
            dependencies: ['ocr-chromium'],
            use: {
                ...devices['Desktop Chrome'],
                baseURL: ocrDashboardURL,
                storageState: { cookies: [], origins: [] },
            },
        },
    ],
});
