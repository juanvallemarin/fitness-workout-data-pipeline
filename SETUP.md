# Setup

1. Create a Google Sheet with a worksheet named `Workouts`.
2. Create a Google Apps Script project.
3. Add `workout_sync.gs` to the project.
4. Add Script Properties:
   - `FITNESS_API_TOKEN`
   - `SPREADSHEET_ID`
5. Replace the placeholder API base URL and path with an API you are authorized to use.
6. Adapt the response mapping if the provider JSON schema differs from the example.
7. Run `synchronizeWorkouts()` manually once to authorize required Google services.
8. Add a time-driven trigger for `synchronizeWorkouts()`.

## Expected columns

The sample implementation writes:

1. workout ID
2. completion timestamp
3. exercise ID
4. exercise name
5. set number
6. repetitions
7. weight in kg
8. synchronization key

## Important

Do not commit credentials, access tokens, personal workout data, private spreadsheet IDs or proprietary API details.

## Sheet initialization and validation

Leave the worksheet empty on the first run: the script creates the eight headers
listed in DATA_SCHEMA.md. Existing sheets must have exactly those names in A1:H1,
in that order. Rename existing headers before running the updated script; a
mismatch stops synchronization without appending data.

## Local verification

Install Node.js 22 or later, then run `node --test` from the repository root.
No npm dependencies or Google credentials are needed. The tests use in-memory
Apps Script service doubles; authorize and verify a manual run against a test
spreadsheet before enabling a production trigger.
