import { expect, type Locator, type Page } from '@playwright/test';
import { OcrDashboardPage } from './ocr-dashboard.page';

/** Dashboard actions for the human-reviewed TCE completion verification flow. */
export class TceDashboardPage extends OcrDashboardPage {
    readonly finalizeEvaluationButton: Locator;
    readonly finalizeButton: Locator;
    readonly backButton: Locator;

    constructor(page: Page) {
        super(page);
        this.finalizeEvaluationButton = page.getByRole('button', { name: 'Finalize Evaluation', exact: true });
        this.finalizeButton = page.getByRole('button', { name: 'Finalize', exact: true });
        this.backButton = page.locator('button').filter({
            has: page.locator('img[alt="back-icon"]'),
        });
    }

    async finalizeEvaluation(): Promise<void> {
        console.info('[TCE] Waiting for Finalize Evaluation button.');
        await expect(this.finalizeEvaluationButton).toBeVisible();
        console.info('[TCE] Clicking Finalize Evaluation.');
        await this.finalizeEvaluationButton.click();

        console.info('[TCE] Waiting for Finalize confirmation button.');
        await expect(this.finalizeButton).toBeVisible();
        console.info('[TCE] Clicking Finalize confirmation.');
        await this.finalizeButton.click();

        console.info('[TCE] Waiting for Finalize confirmation to close.');
        await expect(this.finalizeButton).toBeHidden({ timeout: 60_000 });
        console.info('[TCE] Finalization confirmed.');
    }

    async goBackToDashboard(): Promise<void> {
        console.info('[TCE] Waiting for the Back button.');
        await expect(this.backButton).toBeVisible();
        await expect(this.backButton).toBeEnabled();
        console.info('[TCE] Waiting briefly before returning to the dashboard.');
        await this.backButton.page().waitForTimeout(3_000);
        await this.resetCapturedApiResponses();
        console.info('[TCE] Clicking the Back button.');
        await this.backButton.click();
        await expect(this.backButton.page()).toHaveURL(/\/hil\/dashboard\/?(?:[?#].*)?$/, { timeout: 60_000 });
        console.info('[TCE] Returned to the dashboard.');
    }
}
