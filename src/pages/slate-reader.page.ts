import { expect, type Locator, type Page } from '@playwright/test';

/** Page object for the Slate reader UI. Prefer accessible locators over brittle CSS. */
export class SlateReaderPage {
    readonly readerLink: Locator;
    readonly recordLink: Locator;
    readonly transferCreditEvaluatorButton: Locator;
    readonly transcriptDropdown: Locator;
    readonly initiateButton: Locator;
    readonly loadingHeading: Locator;

    constructor(private readonly page: Page) {
        this.readerLink = this.page.getByRole('link', { name: /^Reader$/i });
        this.recordLink = this.page.getByRole('link', { name: /Christie, Martina/i });
        this.transferCreditEvaluatorButton = this.page.getByRole('button', { name: /transfer credit evaluator/i });
        this.transcriptDropdown = this.page.locator('select[aria-labelledby="tce-heading"]');
        this.initiateButton = this.page.getByRole('button', { name: /initiate transfer credit evaluation/i });
        this.loadingHeading = this.page.getByRole('heading', { name: /reading/i });
    }

    async openReader(): Promise<void> {
        await this.readerLink.click();
    }

    async openRecord(recordName: string): Promise<void> {
        await this.openReader();
        const recordMatch = this.page.getByRole('link', { name: new RegExp(recordName, 'i') }).first();
        await expect(recordMatch).toBeVisible();
        await recordMatch.click();
    }

    async openTransferCreditEvaluator(): Promise<void> {
        await this.transferCreditEvaluatorButton.click();
    }

    async selectTranscriptByName(materialName: string): Promise<void> {
        await this.transcriptDropdown.waitFor({ state: 'visible' });
        await this.transcriptDropdown.selectOption({ label: materialName });
    }

    async initiateTce(): Promise<void> {
        await this.initiateButton.click();
        await expect(this.loadingHeading).toBeVisible();
    }

    async uploadMaterial(filePath: string): Promise<void> {
        const upload: Locator = this.page.getByLabel(/upload|choose file/i);
        await upload.setInputFiles(filePath);
    }

    async initializeTce(transcriptName = process.env.SLATE_TRANSCRIPT_NAME ?? 'NK_001'): Promise<void> {
        await this.openReader();
        await this.recordLink.click();
        await this.openTransferCreditEvaluator();
        await this.selectTranscriptByName(transcriptName);
        await this.initiateButton.click();
        await expect(this.loadingHeading).toBeVisible();
    }
}
