# TCE dashboard completion verification

The TCE flow runs three dependent projects in order: `tce-hil` uploads the configured material, initiates TCE, and saves its process ID and transcript name to `.env.stage`; `ocr-chromium` submits that process for review; then `tce-dashboard-chromium` finalizes the same process, clicks the dashboard Back button, verifies its Completed status, closes the TCE browser context, and opens Slate in a separate context to select the same transcript, click Submit, and wait for Final Evaluation Report. A failed prerequisite prevents later projects from running.

Set `TCE_EMAIL` and `TCE_PASSWORD` in the ignored `.env.stage` file. If `TCE_PASSWORD` is omitted, the test uses `OCR_PASSWORD`. It reads the target process from `OCR_PROCESS_ID`.

Set `SLATE_RECORD_NAME` to the record associated with the process. The TCE/HIL initialization flow saves the selected transcript as `SLATE_TRANSCRIPT_NAME`; use that same `.env.stage` file for both tests.

Run `npm run test:e2e:tce-flow` to run the full sequence in headed mode with one worker. The `tce-hil` project uses the previously saved Slate session and does not rerun Slate authentication.
