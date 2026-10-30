import { test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const authFile = '.auth/slate.json';

setup('sign in to Slate interactively and save local session', async ({ page, context }) => {
    await mkdir(dirname(authFile), { recursive: true });

    const loginUrl = process.env.SLATE_LOGIN_URL;
    if (!loginUrl) {
        throw new Error('SLATE_LOGIN_URL is not set. Add it to the active env file or export it before running tests.');
    }

    const username = process.env.SLATE_USERNAME;
    const password = process.env.SLATE_PASSWORD;

    await page.goto(loginUrl);

    if (username && password) {
        await page.locator('#user').waitFor({ state: 'visible', timeout: 30_000 });
        await page.locator('#user').fill(username);
        await page.locator('#password').fill(password);
        await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in")').first().click();
    }

    console.log('Sign in through Slate/SSO, then resume the test in Playwright Inspector. Do not put credentials in test code.');

    // Explicit human checkpoint handles SSO/MFA and avoids storing credentials.

    await context.storageState({ path: authFile });
});
