# OCR pending-process review test

The standalone `ocr-chromium` project signs in to the OCR dashboard, checks captured API JSON for the configured process ID, and maps its API record index to the visible table row. It reloads/rechecks every 10 seconds for up to 60 seconds, logs whether the process was found, verifies the row is Pending, then clicks that row's Review action followed by Submit for Review. It fails rather than selecting an arbitrary row when the API record cannot be mapped safely.

## Local environment

The default environment file is `.env.stage` (loaded by `playwright.config.ts`). The file is already ignored by Git. Copy `.env.example` to `.env.stage`, then set `OCR_EMAIL`, `OCR_PASSWORD`, and `OCR_PROCESS_ID` locally. Keep actual credentials out of source control and do not place them in `.env.example`.

`OCR_DASHBOARD_URL` defaults to the stage dashboard URL and may be changed in `.env.stage` when needed. The test deliberately runs without Slate storage state or the Slate auth setup project.

## Run

Run `npm run test:e2e:ocr`. The browser is headed so login and the submission flow can be observed. The test submits the selected process for review; use a test process that you are authorized to submit.

The page object uses accessible labels and button names. If the tenant's login form or process table uses different labels, update `OcrDashboardPage` after inspecting that authorized test UI rather than broadening the locators to unrelated controls.
