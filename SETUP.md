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
