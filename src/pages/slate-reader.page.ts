import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

/** Page object for the Slate reader UI. Prefer accessible locators over brittle CSS. */
export class SlateReaderPage {
    readonly readerLink: Locator;
    readonly tceFrame: FrameLocator;
    readonly transferCreditEvaluatorButton: Locator;
    readonly transcriptDropdown: Locator;
    readonly initiateButton: Locator;
    readonly transcriptReviewLabel: Locator;

    constructor(private readonly page: Page) {
        this.readerLink = this.page.getByRole('link', { name: /^Reader$/i });
        this.tceFrame = this.page.frameLocator('.reader_viewer2 > iframe').frameLocator('iframe');
        this.transferCreditEvaluatorButton = this.tceFrame.getByRole('button', { name: 'Transfer Credit Evaluator', exact: true });
        this.transcriptDropdown = this.tceFrame.locator('select[aria-labelledby="tce-heading"]');
        this.initiateButton = this.tceFrame.getByRole('button', { name: /initiate transfer credit evaluation/i });
        this.transcriptReviewLabel = this.tceFrame.getByText('Transcript Review', { exact: true });
    }

    async openReader(): Promise<void> {
        await this.readerLink.hover();

    }

    async openRecord(recordName: string): Promise<void> {
        const recordMatch = this.page.getByRole('link', { name: new RegExp(recordName, 'i') }).first();
        await expect(recordMatch).toBeVisible();
        await recordMatch.click();
    }

    async openTransferCreditEvaluator(): Promise<void> {
        await expect(this.transferCreditEvaluatorButton).toBeVisible();
        await this.transferCreditEvaluatorButton.click();
    }

    async selectTranscriptByName(materialName: string): Promise<void> {
        await this.transcriptDropdown.waitFor({ state: 'visible' });
        await this.transcriptDropdown.selectOption({ label: materialName });
    }

    async initiateTce(): Promise<void> {
        await this.initiateButton.click();
        await expect(this.transcriptReviewLabel).toBeVisible();
    }

    async uploadMaterial(filePath: string): Promise<void> {
        const upload: Locator = this.page.getByLabel(/upload|choose file/i);
        await upload.setInputFiles(filePath);
    }

    async initializeTce(transcriptName = process.env.SLATE_TRANSCRIPT_NAME ?? 'NK_001'): Promise<void> {
        await this.openTransferCreditEvaluator();
        await this.selectTranscriptByName(transcriptName);
        await this.initiateTce();
    }
}
