import { test } from '@playwright/test';
import { MaterialPage } from '../src/pages/materialpage';
import { SlateReaderPage } from '../src/pages/slate-reader.page';
import { saveOcrProcessId } from '../src/utils/ocr-process-env';

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
    const transcriptName = materialName;

    if (!materialPath) {
        throw new Error('Set SLATE_MATERIAL_PATH to an approved test-material file before running the TCE flow.');
    }

    const reader = new SlateReaderPage(page);
    const materialPage = new MaterialPage(page);

    await test.step('Upload the configured material', async () => {
        console.info('[TCE/HIL] Opening Slate and locating the configured record.');
        await page.goto('/manage/');
        await materialPage.openRecordByName(recordName);
        await materialPage.openMaterials();
        await materialPage.openNewMaterial();
        await materialPage.createMaterial({
            materialType,
            materialName,
            filePath: materialPath,
        });
        await materialPage.expectMaterialExists('Applicant Transcript', materialName);
    });

    await test.step('Initialize TCE for the uploaded material', async () => {
        await reader.openReader();
        await reader.openRecord(recordName);
        console.info('[TCE/HIL] Selecting the newly uploaded transcript.');
        const processId = await reader.initializeTce(transcriptName);
        await saveOcrProcessId(processId, transcriptName);
        console.info('[TCE/HIL] Saved the process and transcript handoff to .env.stage.');
    });
});
