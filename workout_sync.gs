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

const HEADERS = ['workout_id', 'completed_at', 'exercise_id', 'exercise_name',
  'set_number', 'reps', 'weight_kg', 'sync_key'];

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
  const payload = JSON.parse(response.getContentText());
  if (!payload || !Array.isArray(payload.workouts)) {
    throw new Error('API response must contain a workouts array.');
  }
  return payload.workouts;
}

function transformWorkouts(workouts) {
  if (!Array.isArray(workouts)) throw new Error('Workouts must be an array.');
  const rows = [];
  workouts.forEach(function(workout) {
    if (!workout || workout.id == null || workout.id === '') {
      throw new Error('Workout ID is required.');
    }
    (workout.exercises || []).forEach(function(exercise) {
      if (!exercise || exercise.id == null || exercise.id === '') {
        throw new Error('Exercise ID is required.');
      }
      (exercise.sets || []).forEach(function(set, index) {
        const key = [workout.id, exercise.id, index + 1,
          set.reps == null ? '' : set.reps, set.weightKg == null ? '' : set.weightKg].join('|');
        rows.push([workout.id || '', workout.completedAt || '',
          exercise.id || '', exercise.name || '', index + 1,
          set.reps == null ? '' : set.reps, set.weightKg == null ? '' : set.weightKg, key]);
      });
    });
  });
  return rows;
}

/**
 * Serialize the read/check/append transaction across executions of this script.
 * The append-only key retains the existing format for nonzero records.
 */
function writeNewRows(spreadsheetId, rows) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another synchronization is running.');
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error('Target sheet not found.');
    let lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      lastRow = 1;
    } else {
      const header = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
      if (!HEADERS.every(function(name, index) { return header[index] === name; })) {
        throw new Error('Target sheet headers do not match DATA_SCHEMA.md.');
      }
    }
    const existingKeys = new Set(lastRow > 1
      ? sheet.getRange(2, 8, lastRow - 1, 1).getValues().flat() : []);
    const newRows = rows.filter(function(row) {
      if (existingKeys.has(row[7])) return false;
      existingKeys.add(row[7]);
      return true;
    }).map(function(row) {
      // Spreadsheet Service interprets strings starting with "=" as formulas.
      return row.map(function(value) {
        return typeof value === 'string' && value.startsWith('=') ? "'" + value : value;
      });
    });
    if (newRows.length) {
      sheet.getRange(lastRow + 1, 1, newRows.length, HEADERS.length).setValues(newRows);
    }
    // Commit buffered writes before another execution can acquire the lock.
    SpreadsheetApp.flush();
    console.log('New workout sets synchronized: ' + newRows.length);
    return newRows.length;
  } finally {
    lock.releaseLock();
  }
}

function toIsoSeconds(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
