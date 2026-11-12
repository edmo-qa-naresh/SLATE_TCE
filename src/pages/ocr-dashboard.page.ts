import { expect, type Locator, type Page } from '@playwright/test';

const DEFAULT_OCR_DASHBOARD_URL = 'https://landing-stage-hil.goedmo.com/hil/dashboard';
const PROCESS_ROW_TIMEOUT_MS = 60_000;
const PROCESS_ROW_RETRY_INTERVAL_MS = 10_000;

type ApiResponseSnapshot = { url: string; body: unknown };
type ApiRecordListMatch = { url: string; records: unknown[]; index: number };

function containsProcessId(value: unknown, processId: string): boolean {
    if (typeof value === 'string') {
        return value === processId;
    }
    if (Array.isArray(value)) {
        return value.some((item) => containsProcessId(item, processId));
    }
    if (value && typeof value === 'object') {
        return Object.values(value).some((item) => containsProcessId(item, processId));
    }
    return false;
}

function findApiRecordLists(value: unknown, processId: string, url: string): ApiRecordListMatch[] {
    const matches: ApiRecordListMatch[] = [];

    if (Array.isArray(value)) {
        const index = value.findIndex((item) => containsProcessId(item, processId));
        if (index >= 0 && value.every((item) => item !== null && typeof item === 'object')) {
            matches.push({ url, records: value, index });
        }
        for (const item of value) {
            matches.push(...findApiRecordLists(item, processId, url));
        }
    } else if (value && typeof value === 'object') {
        for (const item of Object.values(value)) {
            matches.push(...findApiRecordLists(item, processId, url));
        }
    }

    return matches;
}

/** Page object for signing in to and submitting an OCR process for review. */
export class OcrDashboardPage {
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;
    protected readonly apiResponses: ApiResponseSnapshot[] = [];
    protected readonly apiCaptureTasks: Promise<void>[] = [];

    constructor(private readonly page: Page) {
        this.emailInput = this.page
            .getByLabel(/email/i)
            .or(this.page.locator('input[type="email"], input[autocomplete="username"]'))
            .first();
        this.passwordInput = this.page
            .getByLabel(/password/i)
            .or(this.page.locator('input[type="password"]'))
            .first();
        this.loginButton = this.page
            .getByRole('button', { name: /^(log in|login|sign in)$/i })
            .or(this.page.locator('input[type="submit"]'))
            .first();

        this.page.on('response', (response) => {
            if (!new URL(response.url()).pathname.includes('/api/')) {
                return;
            }
            const responseUrl = response.url();
            this.apiCaptureTasks.push(response.json()
                .then((body: unknown) => {
                    this.apiResponses.push({ url: responseUrl, body });
                })
                .catch((error: unknown) => {
                    console.warn(`[OCR] Could not parse JSON from ${new URL(responseUrl).pathname}: ${String(error)}`);
                }));
        });
    }

    async openDashboard(): Promise<void> {
        const dashboardUrl = process.env.OCR_DASHBOARD_URL ?? DEFAULT_OCR_DASHBOARD_URL;
        console.info(`[OCR] Opening dashboard ${new URL(dashboardUrl).origin}.`);
        await this.page.goto(dashboardUrl);
    }

    async login(email: string, password: string): Promise<void> {
        console.info('[OCR] Signing in with the configured OCR account.');
        await this.emailInput.waitFor({ state: 'visible' });
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
        console.info('[OCR] Submitted login form.');
    }

    protected async resetCapturedApiResponses(): Promise<void> {
        while (this.apiCaptureTasks.length > 0) {
            await Promise.all(this.apiCaptureTasks.splice(0));
        }
        this.apiResponses.length = 0;
    }

    protected async findProcessRowIndex(processId: string, rows: Locator): Promise<number | undefined> {
        await Promise.all(this.apiCaptureTasks);
        const latestResponsesByUrl = new Map<string, ApiResponseSnapshot>();
        for (const response of [...this.apiResponses].reverse()) {
            if (!latestResponsesByUrl.has(response.url)) {
                latestResponsesByUrl.set(response.url, response);
            }
        }
        const matchingResponses = [...latestResponsesByUrl.values()].filter((response) =>
            response.url.includes(processId) || containsProcessId(response.body, processId));
        const listMatches = matchingResponses.flatMap((response) =>
            findApiRecordLists(response.body, processId, response.url));
        const visibleRowCount = await rows.count();
        const recordList = listMatches.find((match) => match.records.length === visibleRowCount);

        if (recordList) {
            console.info(`[OCR] Process ${processId} maps to API record ${recordList.index + 1}/${recordList.records.length} in ${new URL(recordList.url).pathname}; dashboard data rows: ${visibleRowCount}.`);
            return recordList.index;
        }

        return undefined;
    }

    async openPendingProcessReview(processId: string): Promise<void> {
        const rows = this.page.getByRole('table').getByRole('rowgroup').last().getByRole('row');
        const deadline = Date.now() + PROCESS_ROW_TIMEOUT_MS;
        let matchingRowIndex: number | undefined;
        let processFoundInApi = false;
        console.info(`[OCR] Looking for process ${processId} in captured dashboard API responses.`);

        while (true) {
            matchingRowIndex = await this.findProcessRowIndex(processId, rows);
            const matchingResponses = this.apiResponses.filter((response) =>
                response.url.includes(processId) || containsProcessId(response.body, processId));

            if (matchingResponses.length > 0 && !processFoundInApi) {
                processFoundInApi = true;
                console.info(`[OCR] Process ${processId} FOUND in API response(s): ${matchingResponses.map((response) => new URL(response.url).pathname).join(', ')}.`);
            }

            if (matchingRowIndex !== undefined) {
                break;
            }

            if (matchingResponses.length === 0) {
                console.info(`[OCR] Process ${processId} NOT FOUND in ${this.apiResponses.length} captured API response(s).`);
            } else {
                console.info(`[OCR] Process ${processId} is in the API, but its response does not yet map to a visible dashboard row.`);
            }

            const remainingTime = deadline - Date.now();
            if (remainingTime <= 0) {
                break;
            }

            await this.page.waitForTimeout(Math.min(PROCESS_ROW_RETRY_INTERVAL_MS, remainingTime));
            await this.resetCapturedApiResponses();
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.page.waitForTimeout(2_000);
        }

        if (matchingRowIndex === undefined) {
            const endpoints = [...new Set(this.apiResponses.map((response) => new URL(response.url).pathname))];
            console.info(`[OCR] Process ${processId} ${processFoundInApi ? 'was found in API but not mapped to a visible row' : 'was NOT FOUND in dashboard API'} after ${PROCESS_ROW_TIMEOUT_MS / 1_000} seconds. Captured endpoints: ${endpoints.join(', ') || '(none)'}.`);
            throw new Error(`Could not map API process ${processId} to a dashboard row; refusing to choose a different pending process.`);
        }

        const processRow = rows.nth(matchingRowIndex);
        const pendingButton = processRow.getByRole('button', { name: /^status pending$/i });
        await expect(pendingButton, `The dashboard row for process ${processId} should have a Pending status button`).toBeVisible();
        const reviewAction = processRow.getByRole('button', { name: /^Review$/i })
            .or(processRow.getByRole('link', { name: /^Review$/i }));
        await expect(reviewAction, `The dashboard row for process ${processId} should have a Review action`).toBeVisible();
        console.info(`[OCR] Clicking Review for process ${processId} on dashboard row ${matchingRowIndex + 1}.`);
        await reviewAction.click();
    }

    async expectProcessCompleted(processId: string): Promise<void> {
        const rows = this.page.getByRole('table').getByRole('rowgroup').last().getByRole('row');
        const deadline = Date.now() + PROCESS_ROW_TIMEOUT_MS;

        while (Date.now() < deadline) {
            const rowIndex = await this.findProcessRowIndex(processId, rows);
            if (rowIndex !== undefined) {
                const statusCell = rows.nth(rowIndex).getByRole('cell').nth(3);
                const statusIsVisible = await statusCell.isVisible();
                const statusText = statusIsVisible ? (await statusCell.innerText()).trim() : 'unavailable';
                if (/^Completed$/i.test(statusText)) {
                    console.info(`[TCE] Process ${processId} FOUND in API and status is Completed in dashboard row ${rowIndex + 1}.`);
                    return;
                }

                console.info(`[TCE] Process ${processId} FOUND in API, but dashboard status is "${statusText}"; waiting for Completed.`);
            } else {
                console.info(`[TCE] Process ${processId} not yet mapped from API response to a dashboard row.`);
            }

            await this.page.waitForTimeout(PROCESS_ROW_RETRY_INTERVAL_MS);
            await this.resetCapturedApiResponses();
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.page.waitForTimeout(2_000);
        }

        throw new Error(`Process ${processId} did not reach Completed status in the dashboard within ${PROCESS_ROW_TIMEOUT_MS / 1_000} seconds.`);
    }

    async submitForReview(): Promise<void> {
        const submitButton = this.page.getByRole('button', { name: /^submit for review$/i });
        const confirmButton = this.page.getByRole('button', { name: /^Yes$/i });
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();

        // The confirmation belongs to the explicitly requested Submit for Review action.
        this.page.once('dialog', async (dialog) => {
            await dialog.accept();
        });
        console.info('[OCR] Clicking Submit for Review.');
        await submitButton.click();
        await expect(confirmButton).toBeVisible();
        await expect(confirmButton).toBeEnabled();
        console.info('[OCR] Confirming submission for review.');
        await confirmButton.click();
    }
}
