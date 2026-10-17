# Setup and validation

This guide configures the provider-neutral reference pipeline with an isolated Google Sheet. The checked-in URL and bearer authentication are placeholders; verify your provider's permitted API or export route and adapt the private provider boundary before using real data.

Do not enable a scheduled trigger until the import, idempotency, and error checks below pass.

## 1. Run the local test suite

Install a current Node.js release and run from the repository root:

```bash
node --test
```

All tests must pass before deploying the script.

## 2. Create an isolated test spreadsheet

1. Create a new Google Sheet containing no personal production data.
2. Add an empty tab named `Workouts`.
3. Copy the spreadsheet ID from its URL for later use.

The script will create this exact header on the first successful write:

```text
workout_id, completed_at, exercise_id, exercise_name,
set_number, reps, weight_kg, sync_key
```

## 3. Create the Apps Script project

1. Open **Extensions > Apps Script** from the test spreadsheet.
2. Replace the editor contents with `workout_sync.gs`.
3. Add the included `appsscript.json` manifest if you manage the project with `clasp`, or confirm that the V8 runtime is enabled in project settings.

## 4. Adapt the private provider boundary

Before supplying credentials, confirm that you have authorized API or export access under the provider's terms. Update only the private deployment as needed for:

- Base URL and workout route.
- Authentication method.
- Pagination and retry behavior.
- Mapping the provider response to `workouts[]`, `exercises[]`, and `sets[]`.

Keep private endpoints, cookies, account identifiers, and provider payloads out of this public repository.

## 5. Store configuration securely

In **Project settings > Script Properties**, add:

- `FITNESS_API_TOKEN`: the credential used by your private adapter.
- `SPREADSHEET_ID`: the ID of the isolated test spreadsheet.

Enter secrets directly in Apps Script. Never paste them into chat, source code, commits, screenshots, or issue reports.

## 6. Validate the first synchronization

1. Select `synchronizeWorkouts` in the Apps Script editor.
2. Run it manually and approve only the expected permissions.
3. Open the `Workouts` tab and verify:
   - The eight headers are exact and in order.
   - Every source set appears once.
   - Timestamps, exercise names, repetitions, and weights are correct.
   - Zero repetitions or zero weight remain `0`, not blank.
   - Every `sync_key` is populated and unique.
4. Review the Apps Script execution log for errors without logging credentials or response bodies.

## 7. Validate idempotency

Without changing the source data:

1. Record the sheet row count.
2. Run `synchronizeWorkouts` again.
3. Confirm that the function reports `0` rows written.
4. Confirm that the row count is unchanged.
5. Confirm that the `sync_key` column still contains no duplicates.

Do not continue if the second run adds rows.

## 8. Validate error handling

Use the isolated project and restore each setting after its check:

- Temporarily remove one Script Property and confirm that the error names the missing property without exposing a secret.
- Use a deliberately invalid test credential and confirm that a non-success HTTP status stops the run without writing rows.
- In a disposable sheet copy, alter a header and confirm that the schema mismatch stops the run.
- Confirm after each failed run that no partial rows were appended and a later valid run can proceed.

## 9. Enable scheduling only after validation

Only after the first import, repeated-run idempotency, and error checks all pass may you create a time-driven trigger for `synchronizeWorkouts` in Apps Script. This repository does not create or enable triggers automatically.
