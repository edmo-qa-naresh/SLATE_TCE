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
    readonly materialTypeDropdown: Locator;
    readonly materialNameInput: Locator;
    readonly fileInput: Locator;
    readonly uploadButton: Locator;
    readonly saveButton: Locator;

    constructor(private readonly page: Page) {
        this.recordsLink = this.page.getByRole('link', { name: 'Records' });
        this.materialsLink = this.page.getByRole('link', { name: 'Materials' });
        this.newMaterialLink = this.page.getByRole('link', { name: 'New Material' });
        this.materialTypeDropdown = this.page.getByRole('row', { name: /Material/i }).getByLabel(/Material/i);
        this.materialNameInput = this.page.locator('input.expanded.maxlength_enabled[name="summary"]');
        this.fileInput = this.page.locator('input[name="file"][type="file"]');
        this.uploadButton = this.page.getByRole('button', { name: /upload/i });
        this.saveButton = this.page.getByRole('button', { name: /save/i });
    }

    async openRecordByName(recordName: string): Promise<void> {
        await this.recordsLink.click();

        const namePattern = new RegExp(recordName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const recordLink = this.page.locator('a.menu_link, a[href*="/manage/lookup/"]').filter({ hasText: namePattern }).first();

        await recordLink.scrollIntoViewIfNeeded();
        await recordLink.hover({ force: true });
        await expect(recordLink).toBeVisible({ visible: true });
    }

    async openMaterials(): Promise<void> {
        await this.materialsLink.click();
        await expect(this.materialsLink).toBeVisible();
    }

    async openNewMaterial(): Promise<void> {
        await this.newMaterialLink.click();
        await expect(this.page.getByRole('link', { name: 'New Material' })).toBeVisible();
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
        await this.selectMaterialType(options.materialType);
        await this.setUniqueMaterialName(options.materialName);
        await this.uploadFile(options.filePath);
        await this.submitUpload();
        await this.saveMaterial();
    }

    async expectMaterialExists(materialType: string, materialName: string): Promise<void> {
        const row = this.page.locator('tr').filter({ hasText: materialType }).filter({ hasText: materialName });
        await expect(row.first()).toBeVisible();
        await expect(row.first()).toContainText(materialType);
        await expect(row.first()).toContainText(materialName);
    }
}
