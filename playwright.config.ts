import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: process.env.PLAYWRIGHT_ENV_FILE ?? '.env.stage' });

const baseURL = process.env.SLATE_BASE_URL ?? 'https://edm.test.technolutions.net';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    timeout: 60_000,
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
            testIgnore: /auth\.setup\.ts/,
            dependencies: ['auth-setup'],
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/slate.json',
            },
        },
    ],
});
