import { test } from '@playwright/test';
import { OcrDashboardPage } from '../src/pages/ocr-dashboard.page';
import { readOcrProcessId } from '../src/utils/ocr-process-env';

test.setTimeout(120_000);

test('sign in to OCR and submit the configured pending process for review', async ({ page }) => {
    const email = process.env.OCR_EMAIL;
    const password = process.env.OCR_PASSWORD;
    const processId = await readOcrProcessId();

    if (!email || !password) {
        throw new Error('Set OCR_EMAIL and OCR_PASSWORD in your ignored local .env.stage file.');
    }
    if (!processId) {
        throw new Error('Set OCR_PROCESS_ID in your ignored local .env.stage file.');
    }

    const ocr = new OcrDashboardPage(page);
    await test.step('Open OCR dashboard and sign in', async () => {
        await ocr.openDashboard();
        await ocr.login(email, password);
    });
    await test.step(`Open pending process ${processId}`, async () => {
        await ocr.openPendingProcessReview(processId);
    });
    await test.step(`Submit process ${processId} for review`, async () => {
        await ocr.submitForReview();
    });
});
