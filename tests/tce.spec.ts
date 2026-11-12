import { test } from '@playwright/test';
import { SlateReaderPage } from '../src/pages/slate-reader.page';
import { TceDashboardPage } from '../src/pages/tce-dashboard.page';
import { readOcrProcessId, readOcrTranscriptName } from '../src/utils/ocr-process-env';

test('finalize TCE, verify Completed status, and view the same transcript analysis in Slate', async ({ browser }) => {
    const email = process.env.TCE_EMAIL ?? 'yash.gupta+tce@goedmo.com';
    const password = process.env.TCE_PASSWORD ?? process.env.OCR_PASSWORD;
    const processId = await readOcrProcessId();
    const transcriptName = await readOcrTranscriptName();
    const recordName = process.env.SLATE_RECORD_NAME ?? 'Christie, Martina';

    if (!password) {
        throw new Error('Set TCE_PASSWORD or OCR_PASSWORD in your ignored local .env.stage file.');
    }
    if (!processId) {
        throw new Error('Set OCR_PROCESS_ID in your ignored local .env.stage file.');
    }
    if (!transcriptName) {
        throw new Error('No transcript name is saved for this TCE process. Run the TCE/HIL initialization flow first.');
    }

    await test.step(`Finalize OCR process ${processId}`, async () => {
        const tceContext = await browser.newContext();
        try {
            const tcePage = await tceContext.newPage();
            const tce = new TceDashboardPage(tcePage);
            await test.step('Sign in to the TCE dashboard', async () => {
                await tce.openDashboard();
                await tce.login(email, password);
            });
            await test.step(`Finalize process ${processId}`, async () => {
                await tce.openPendingProcessReview(processId);
                await tce.finalizeEvaluation();
                await tce.goBackToDashboard();
            });
            await test.step(`Verify process ${processId} is Completed`, async () => {
                await tce.expectProcessCompleted(processId);
            });
        } finally {
            await tceContext.close();
            console.info('[TCE] Closed the dashboard browser context.');
        }
    });

    await test.step('Submit the initiated Slate transcript analysis', async () => {
        const slateContext = await browser.newContext({ storageState: '.auth/slate.json' });
        try {
            const slatePage = await slateContext.newPage();
            const slateBaseUrl = process.env.SLATE_BASE_URL ?? 'https://edm.test.technolutions.net';
            const reader = new SlateReaderPage(slatePage);
            await test.step('Open the configured record and select the initiated transcript', async () => {
                await slatePage.goto(slateBaseUrl);
                await reader.openReader();
                await reader.openRecord(recordName);
                await reader.openTransferCreditEvaluator();
                await reader.selectTranscriptByName(transcriptName);
            });
            await test.step('Submit the transcript analysis', async () => {
                await reader.openAnalysisAndSubmit();
            });
            await test.step('Verify the Final Evaluation Report', async () => {
                await reader.expectFinalEvaluationReport();
            });
        } finally {
            await slateContext.close();
            console.info('[Slate] Closed the reader browser context.');
        }
    });
});
