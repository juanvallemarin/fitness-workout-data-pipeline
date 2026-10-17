/**
 * Fitness Workout Data Pipeline
 * Provider-neutral demonstration.
 */
const CONFIG = {
  API_BASE_URL: 'https://api.example.com',
  WORKOUT_PATH: '/v1/workouts',
  SHEET_NAME: 'Workouts',
  LOOKBACK_DAYS: 14
};

function synchronizeWorkouts() {
  const properties = PropertiesService.getScriptProperties();
  const apiToken = properties.getProperty('FITNESS_API_TOKEN');
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (!apiToken || !spreadsheetId) throw new Error('Missing required configuration.');
  const rows = transformWorkouts(fetchWorkouts(apiToken));
  writeNewRows(spreadsheetId, rows);
}

function fetchWorkouts(apiToken) {
  const after = new Date(Date.now() - CONFIG.LOOKBACK_DAYS * 86400000);
  const url = CONFIG.API_BASE_URL + CONFIG.WORKOUT_PATH +
    '?completedAfter=' + encodeURIComponent(toIsoSeconds(after));
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + apiToken, Accept: 'application/json' },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200)
    throw new Error('API request failed with HTTP ' + response.getResponseCode());
  return JSON.parse(response.getContentText()).workouts || [];
}

function transformWorkouts(workouts) {
  const rows = [];
  workouts.forEach(function(workout) {
    (workout.exercises || []).forEach(function(exercise) {
      (exercise.sets || []).forEach(function(set, index) {
        const key = [workout.id, exercise.id, index + 1,
          set.reps || '', set.weightKg || ''].join('|');
        rows.push([workout.id || '', workout.completedAt || '',
          exercise.id || '', exercise.name || '', index + 1,
          set.reps || '', set.weightKg || '', key]);
      });
    });
  });
  return rows;
}

function writeNewRows(spreadsheetId, rows) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Target sheet not found.');
  const lastRow = sheet.getLastRow();
  const existingKeys = new Set(lastRow > 1
    ? sheet.getRange(2, 8, lastRow - 1, 1).getValues().flat() : []);
  const newRows = rows.filter(function(row) { return !existingKeys.has(row[7]); });
  if (newRows.length)
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 8).setValues(newRows);
  console.log('New workout sets synchronized: ' + newRows.length);
}

function toIsoSeconds(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
