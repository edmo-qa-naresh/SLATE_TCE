import { expect, type Locator, type Page } from '@playwright/test';

export type MaterialUploadOptions = {
    materialType: string;
    materialName: string;
    filePath: string;
};

export class MaterialPage {
    readonly recordsLink: Locator;
    readonly materialsLink: Locator;
    readonly newMaterialLink: Locator;
    readonly recordSearchInput: Locator;
    readonly materialTypeDropdown: Locator;
    readonly materialNameInput: Locator;
    readonly fileInput: Locator;
    readonly uploadButton: Locator;
    readonly saveButton: Locator;

    constructor(private readonly page: Page) {
        this.recordsLink = this.page.getByRole('link', { name: 'Records' });
        this.recordSearchInput = this.page.locator('input#search_quick[name="filter_search_operand"]');
        this.materialsLink = this.page.getByRole('link', { name: 'Materials' });
        this.newMaterialLink = this.page.getByRole('link', { name: 'New Material' });
        this.materialTypeDropdown = this.page.getByRole('row', { name: /Material/i }).getByLabel(/Material/i);
        this.materialNameInput = this.page.locator('input.expanded.maxlength_enabled[name="summary"]');
        this.fileInput = this.page.locator('input[name="file"][type="file"]:not([disabled])');
        this.uploadButton = this.page.getByRole('button', { name: /upload/i });
        this.saveButton = this.page.getByRole('button', { name: /save/i });
    }

    async openRecordByName(recordName: string): Promise<void> {
        console.info('[Slate] Searching Records for the configured record.');
        await this.recordsLink.click();
        await this.recordSearchInput.waitFor({ state: 'visible' });
        await this.recordSearchInput.fill('');
        await this.recordSearchInput.pressSequentially(recordName);

        const displayedName = recordName.split(',').pop()?.trim() ?? recordName;
        const namePattern = new RegExp(displayedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const recordLink = this.page.locator('td a[href*="/manage/lookup/?id="]').filter({ hasText: namePattern }).first();

        await expect(recordLink).toBeVisible();
        await recordLink.click();
        console.info('[Slate] Opened the configured record.');
    }

    async openMaterials(): Promise<void> {
        console.info('[Slate] Opening record Materials.');
        await this.materialsLink.click();
        await expect(this.newMaterialLink).toBeVisible();
    }

    async openNewMaterial(): Promise<void> {
        console.info('[Slate] Opening the New Material form.');
        await this.newMaterialLink.click();
        await expect(this.materialTypeDropdown).toBeVisible();
    }

    async selectMaterialType(materialType: string): Promise<void> {
        await this.materialTypeDropdown.selectOption(materialType);
    }

    async setUniqueMaterialName(materialName: string): Promise<void> {
        await this.materialNameInput.fill(materialName);
    }

    async uploadFile(filePath: string): Promise<void> {
        await this.fileInput.setInputFiles(filePath);
        await expect(this.fileInput).toBeVisible();
    }

    async submitUpload(): Promise<void> {
        await this.uploadButton.click();
    }

    async saveMaterial(): Promise<void> {
        await this.saveButton.click();
    }

    async createMaterial(options: MaterialUploadOptions): Promise<void> {
        console.info(`[Slate] Creating configured material (${options.materialType}).`);
        await this.selectMaterialType(options.materialType);
        await this.setUniqueMaterialName(options.materialName);
        await this.uploadFile(options.filePath);
        await this.submitUpload();
        await this.saveMaterial();
        console.info('[Slate] Submitted material for upload.');
    }

    async expectMaterialExists(materialType: string, materialName: string): Promise<void> {
        const row = this.page.locator('tr').filter({ hasText: materialType }).filter({ hasText: materialName });
        await expect(row.first()).toBeVisible();
        await expect(row.first()).toContainText(materialType);
        await expect(row.first()).toContainText(materialName);
    }
}
