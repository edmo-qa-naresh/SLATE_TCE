import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

/** Page object for the Slate reader UI. Prefer accessible locators over brittle CSS. */
export class SlateReaderPage {
    readonly readerLink: Locator;
    readonly tceFrame: FrameLocator;
    readonly transferCreditEvaluatorButton: Locator;
    readonly transcriptDropdown: Locator;
    readonly initiateButton: Locator;
    readonly viewAnalysisButton: Locator;
    readonly analysisSubmitButton: Locator;
    readonly finalEvaluationReportLabel: Locator;

    constructor(private readonly page: Page) {
        this.readerLink = this.page.getByRole('link', { name: /^Reader$/i });
        this.tceFrame = this.page.frameLocator('.reader_viewer2 > iframe').frameLocator('iframe');
        this.transferCreditEvaluatorButton = this.tceFrame.getByRole('button', { name: 'Transfer Credit Evaluator', exact: true });
        this.transcriptDropdown = this.tceFrame.locator('select[aria-labelledby="tce-heading"]');
        this.initiateButton = this.tceFrame.getByRole('button', { name: /initiate transfer credit evaluation/i });
        this.viewAnalysisButton = this.tceFrame.getByRole('button', { name: 'View Analysis', exact: true });
        this.analysisSubmitButton = this.tceFrame.getByRole('button', { name: 'Submit', exact: true });
        this.finalEvaluationReportLabel = this.tceFrame.getByText('Final Evaluation Report', { exact: true });
    }

    async openReader(): Promise<void> {
        console.info('[Slate] Opening Reader.');
        await expect(this.readerLink).toBeVisible();
        await this.readerLink.hover();
    }

    async openRecord(recordName: string): Promise<void> {
        const recordMatch = this.page.getByRole('link', { name: new RegExp(recordName, 'i') }).first();
        await expect(recordMatch).toBeVisible();
        await recordMatch.click();
        console.info('[Slate] Opened the configured Reader record.');
    }

    async openTransferCreditEvaluator(): Promise<void> {
        await expect(this.transferCreditEvaluatorButton).toBeVisible();
        await this.transferCreditEvaluatorButton.click();
        console.info('[Slate] Opened Transfer Credit Evaluator.');
    }

    async selectTranscriptByName(materialName: string): Promise<void> {
        await this.transcriptDropdown.waitFor({ state: 'visible' });
        const escapedName = materialName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchingOption = this.transcriptDropdown.locator('option')
            .filter({ hasText: new RegExp(`^\\s*${escapedName}\\s*$`) });
        await expect(matchingOption, `Expected exactly one TCE option named "${materialName}".`).toHaveCount(1);
        const [selectedValue] = await this.transcriptDropdown.selectOption({ label: materialName });
        if (selectedValue === undefined) {
            throw new Error(`Could not select TCE transcript "${materialName}".`);
        }
        await expect(this.transcriptDropdown.locator('option:checked')).toHaveText(materialName);
        console.info('[Slate] Selected the exact initiated TCE transcript.');
    }

    async openAnalysis(): Promise<void> {
        console.info('[Slate] Opening View Analysis for the selected transcript.');
        await expect(this.viewAnalysisButton).toBeVisible({ timeout: 60_000 });
        await expect(this.viewAnalysisButton).toBeEnabled({ timeout: 60_000 });
        await this.viewAnalysisButton.click();
        // The Submit control confirms that the analysis view has opened.
        await expect(this.analysisSubmitButton).toBeVisible({ timeout: 60_000 });
    }

    async openAnalysisAndSubmit(): Promise<void> {
        await this.openAnalysis();
        await expect(this.analysisSubmitButton).toBeEnabled({ timeout: 60_000 });
        console.info('[Slate] Clicking Submit for the selected TCE analysis.');
        await this.analysisSubmitButton.click();
    }

    async expectFinalEvaluationReport(): Promise<void> {
        console.info('[Slate] Waiting for Final Evaluation Report after Submit.');
        await expect(this.finalEvaluationReportLabel).toBeVisible({ timeout: 60_000 });
        console.info('[Slate] Final Evaluation Report is visible.');
    }

    async initiateTce(): Promise<string> {
        console.info('[Slate] Initiating Transfer Credit Evaluation.');
        const processResponsePromise = this.page.waitForResponse((response) => {
            const responseUrl = new URL(response.url());
            return response.request().method() === 'GET'
                && response.ok()
                && /\/api\/edmo\/process\/[^/]+\/?$/i.test(responseUrl.pathname);
        }, { timeout: 45_000 });

        await this.initiateButton.click();
        const processResponse = await processResponsePromise;
        const processId = new URL(processResponse.url()).pathname.match(/\/api\/edmo\/process\/([^/]+)\/?$/i)?.[1];

        if (!processId) {
            throw new Error('TCE was initiated, but no process ID was found in the process-details response URL.');
        }

        console.info(`[Slate] TCE initiated with process ID ${processId}.`);
        return processId;
    }

    async initializeTce(transcriptName = process.env.SLATE_TRANSCRIPT_NAME ?? 'NK_001'): Promise<string> {
        await this.openTransferCreditEvaluator();
        await this.selectTranscriptByName(transcriptName);
        return this.initiateTce();
    }
}
