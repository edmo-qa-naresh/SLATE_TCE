import { test, expect } from '@playwright/test';
import { MaterialPage } from '../src/pages/materialpage';
import { SlateReaderPage } from '../src/pages/slate-reader.page';

test.use({ storageState: '.auth/slate.json' });

/**
 * Human-reviewed TCE/HIL flow. Do not automatically approve, alter, or submit
 * evaluation decisions. OCR checks are verification-only and require a reviewer.
 */
test('upload approved material and inspect TCE/HIL OCR results', async ({ page }) => {
    const recordName = process.env.SLATE_RECORD_NAME ?? 'Christie, Martina';
    const materialPath = process.env.SLATE_MATERIAL_PATH;
    const materialType = process.env.SLATE_MATERIAL_TYPE ?? 'applicant_transcript';
    const uniqueSuffix = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const materialName = process.env.SLATE_MATERIAL_NAME ?? `TCE_${uniqueSuffix}`;
    const transcriptName = process.env.SLATE_TRANSCRIPT_NAME ?? materialName;

    test.skip(!materialPath, 'Set SLATE_MATERIAL_PATH to an approved test-material file.');

    const reader = new SlateReaderPage(page);
    const materialPage = new MaterialPage(page);

    await page.goto('/manage/records/');
    await materialPage.openRecordByName(recordName);

    await materialPage.openMaterials();
    await materialPage.openNewMaterial();
    await materialPage.createMaterial({
        materialType,
        materialName,
        filePath: materialPath!,
    });

    await materialPage.expectMaterialExists('Applicant Transcript', materialName);

    await reader.openReader();
    await reader.openRecord(recordName);
    await reader.initializeTce(transcriptName);

    // TODO: Confirm the actual HIL route and OCR result selectors in the test tenant.
    // The test intentionally pauses at inspection; a human verifies extracted fields
    // against the source document and performs any final submission manually.
    await expect(reader.tceFrame.getByText(/transfer credit evaluation/i).first()).toBeVisible();
    await page.pause();
});
