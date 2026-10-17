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
const SYNC_KEY_INDEX = HEADERS.indexOf('sync_key');
const SYNC_KEY_SHEET_COLUMN = SYNC_KEY_INDEX + 1;

function synchronizeWorkouts() {
  const properties = PropertiesService.getScriptProperties();
  const apiToken = properties.getProperty('FITNESS_API_TOKEN');
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const missing = [];
  if (!apiToken) missing.push('FITNESS_API_TOKEN');
  if (!spreadsheetId) missing.push('SPREADSHEET_ID');
  if (missing.length) {
    throw new Error('Missing required Script Properties: ' + missing.join(', ') + '.');
  }
  const rows = transformWorkouts(fetchWorkouts(apiToken));
  return writeNewRows(spreadsheetId, rows);
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
  let payload;
  try {
    payload = JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error('API returned invalid JSON.');
  }
  if (!payload || !Array.isArray(payload.workouts)) {
    throw new Error('API response must contain a workouts array.');
  }
  return payload.workouts;
}

function transformWorkouts(workouts) {
  if (!Array.isArray(workouts)) throw new Error('Workouts must be an array.');
  const rows = [];
  workouts.forEach(function(workout) {
    assertIdentifier(workout && workout.id, 'Workout');
    arrayOrEmpty(workout.exercises, 'Workout exercises').forEach(function(exercise) {
      assertIdentifier(exercise && exercise.id, 'Exercise');
      arrayOrEmpty(exercise.sets, 'Exercise sets').forEach(function(set, index) {
        if (!set || typeof set !== 'object') throw new Error('Set must be an object.');
        const setNumber = index + 1;
        const reps = valueOrBlank(set.reps);
        const weightKg = valueOrBlank(set.weightKg);
        const key = buildSyncKey(workout.id, exercise.id, setNumber, reps, weightKg);
        rows.push([workout.id, valueOrBlank(workout.completedAt),
          exercise.id, valueOrBlank(exercise.name), setNumber,
          reps, weightKg, key]);
      });
    });
  });
  return rows;
}

function assertIdentifier(value, label) {
  if (value == null || value === '') throw new Error(label + ' ID is required.');
  if (String(value).indexOf('|') !== -1) {
    throw new Error(label + ' ID must not contain "|".');
  }
}

function arrayOrEmpty(value, label) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(label + ' must be an array.');
  return value;
}

function valueOrBlank(value) {
  return value == null ? '' : value;
}

function buildSyncKey(workoutId, exerciseId, setNumber, reps, weightKg) {
  return [workoutId, exerciseId, setNumber, reps, weightKg].join('|');
}

/**
 * Serialize the read/check/append transaction across executions of this script.
 * The append-only key retains the existing format for nonzero records.
 */
function writeNewRows(spreadsheetId, rows) {
  if (!Array.isArray(rows)) throw new Error('Rows must be an array.');
  rows.forEach(function(row) {
    if (!Array.isArray(row) || row.length !== HEADERS.length || !row[SYNC_KEY_INDEX]) {
      throw new Error('Each row must match the documented schema and contain a sync key.');
    }
  });
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
      ? sheet.getRange(2, SYNC_KEY_SHEET_COLUMN, lastRow - 1, 1).getValues().flat() : []);
    const safeRows = rows.map(function(row) {
      return row.map(escapeSpreadsheetValue);
    });
    const newRows = safeRows.filter(function(row) {
      if (existingKeys.has(row[SYNC_KEY_INDEX])) return false;
      existingKeys.add(row[SYNC_KEY_INDEX]);
      return true;
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

function escapeSpreadsheetValue(value) {
  // Prevent provider-controlled strings from being interpreted as formulas.
  return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'" + value : value;
}

function toIsoSeconds(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
