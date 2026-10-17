const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'workout_sync.gs'), 'utf8');
const headers = ['workout_id', 'completed_at', 'exercise_id', 'exercise_name',
  'set_number', 'reps', 'weight_kg', 'sync_key'];

function harness(options = {}) {
  const data = (options.data || []).map(row => row.slice());
  const events = [];
  const sheet = {
    getLastRow: () => data.length,
    getRange(row, col, height, width) {
      return {
        getValues: () => Array.from({length: height}, (_, i) =>
          Array.from({length: width}, (_, j) => (data[row - 1 + i] || [])[col - 1 + j] ?? '')),
        setValues(values) {
          if (options.writeError) throw new Error('Write failed');
          values.forEach((valuesRow, i) => {
            data[row - 1 + i] ||= [];
            valuesRow.forEach((value, j) => { data[row - 1 + i][col - 1 + j] = value; });
          });
          events.push('write');
        }
      };
    }
  };
  const context = vm.createContext({
    console: {log() {}},
    PropertiesService: {getScriptProperties: () => ({
      getProperty: key => (options.properties || {})[key] || null
    })},
    LockService: {getScriptLock: () => ({
      tryLock: () => { events.push('lock'); return !options.busy; },
      releaseLock: () => events.push('release')
    })},
    SpreadsheetApp: {
      openById: () => { events.push('open'); return {getSheetByName: () => options.missingSheet ? null : sheet}; },
      flush: () => events.push('flush')
    },
    UrlFetchApp: {fetch: () => ({
      getResponseCode: () => options.status || 200,
      getContentText: () => options.body ?? '{"workouts":[]}'
    })}
  });
  vm.runInContext(source, context);
  return {api: context, data, events};
}
function workout(set = {reps: 12, weightKg: 30}) {
  return [{id: 'w1', exercises: [{id: 'e1', name: 'Press', sets: [set]}]}];
}

test('existing Apps Script transformation tests pass', () => {
  const {api} = harness();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'workout_sync_test.gs'), 'utf8'), api);
  api.runTests();
});
test('sample produces five rows', () => {
  const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sample_workout.json'), 'utf8'));
  const rows = harness().api.transformWorkouts(sample.workouts);
  assert.equal(rows.length, 5);
  assert.ok(rows.every(row => row.length === headers.length));
  assert.notEqual(rows[0][7], rows[1][7]);
});
test('multiple workouts, exercises and sets preserve row order', () => {
  const input = [
    {id: 'w1', completedAt: '2026-10-16T08:00:00Z', exercises: [
      {id: 'e1', name: 'Press', sets: [{reps: 8, weightKg: 20}, {reps: 6, weightKg: 22}]},
      {id: 'e2', name: 'Row', sets: [{reps: 10, weightKg: 25}]}
    ]},
    {id: 'w2', exercises: [{id: 'e3', sets: [{reps: 12}]}]}
  ];
  const rows = harness().api.transformWorkouts(input);
  assert.equal(rows.length, 4);
  assert.deepEqual(Array.from(rows, row => row[0]), ['w1', 'w1', 'w1', 'w2']);
  assert.deepEqual(Array.from(rows, row => row[4]), [1, 2, 1, 1]);
  assert.equal(rows[3][3], '');
  assert.equal(rows[3][6], '');
});
test('empty and missing nested collections produce no rows', () => {
  const {api} = harness();
  assert.equal(api.transformWorkouts([]).length, 0);
  assert.equal(api.transformWorkouts([{id: 'w'}]).length, 0);
  assert.equal(api.transformWorkouts([{id: 'w', exercises: [{id: 'e'}]}]).length, 0);
});
test('zero values survive and differ from missing values', () => {
  const {api} = harness();
  const zero = api.transformWorkouts(workout({reps: 0, weightKg: 0}))[0];
  const missing = api.transformWorkouts(workout({}))[0];
  assert.equal(zero[5], 0);
  assert.equal(zero[6], 0);
  assert.equal(missing[5], '');
  assert.notEqual(zero[7], missing[7]);
});
test('invalid identities fail before persistence', () => {
  const {api} = harness();
  assert.throws(() => api.transformWorkouts(null), /array/);
  assert.throws(() => api.transformWorkouts([{}]), /Workout ID/);
  assert.throws(() => api.transformWorkouts([{id: 'w', exercises: [{}]}]), /Exercise ID/);
  assert.throws(() => api.transformWorkouts([{id: 'bad|id'}]), /must not contain/);
  assert.throws(() => api.transformWorkouts([{id: 'w', exercises: {}}]), /must be an array/);
  assert.throws(() => api.transformWorkouts([{id: 'w', exercises: [{id: 'e', sets: [null]}]}]), /object/);
});
test('missing configuration is reported without exposing secrets', () => {
  const {api} = harness({properties: {FITNESS_API_TOKEN: 'secret'}});
  assert.throws(() => api.synchronizeWorkouts(), /SPREADSHEET_ID/);
});
test('initializes headers and deduplicates within and between executions', () => {
  const {api, data, events} = harness();
  const row = api.transformWorkouts(workout())[0];
  assert.equal(api.writeNewRows('sheet', [row, row]), 1);
  assert.deepEqual(data[0], headers);
  assert.equal(api.writeNewRows('sheet', [row]), 0);
  assert.equal(data.length, 2);
  assert.deepEqual(events.slice(-2), ['flush', 'release']);
});
test('existing headers are validated without appending', () => {
  const {api, data, events} = harness({data: [['incorrect']]});
  assert.throws(() => api.writeNewRows('sheet', []), /headers/);
  assert.equal(data.length, 1);
  assert.equal(events.at(-1), 'release');
});
test('lock contention prevents sheet access', () => {
  const {api, events} = harness({busy: true});
  assert.throws(() => api.writeNewRows('sheet', []), /running/);
  assert.deepEqual(events, ['lock']);
});
test('lock is released after sheet and write errors', () => {
  for (const options of [{missingSheet: true}, {writeError: true, data: [headers]}]) {
    const {api, events} = harness(options);
    assert.throws(() => api.writeNewRows('sheet', api.transformWorkouts(workout())));
    assert.equal(events.at(-1), 'release');
  }
});
test('formula-like strings are written as literal text without mutating input rows', () => {
  for (const prefix of ['=', '+', '-', '@']) {
    const {api, data} = harness();
    const input = workout();
    input[0].exercises[0].name = prefix + 'formula';
    const rows = api.transformWorkouts(input);
    api.writeNewRows('sheet', rows);
    assert.equal(data[1][3], "'" + prefix + 'formula');
    assert.equal(rows[0][3], prefix + 'formula');
  }
});
test('formula-like identifiers remain idempotent after escaping', () => {
  const {api, data} = harness();
  const rows = api.transformWorkouts([{id: '=workout', exercises: [
    {id: '+exercise', sets: [{reps: 1, weightKg: 0}]}
  ]}]);
  assert.equal(api.writeNewRows('sheet', rows), 1);
  assert.equal(api.writeNewRows('sheet', rows), 0);
  assert.equal(data.length, 2);
  assert.equal(data[1][0], "'=workout");
  assert.equal(data[1][7], "'=workout|+exercise|1|1|0");
});
test('invalid API responses are rejected; empty arrays are valid', () => {
  for (const body of ['{}', 'null', '{"workouts":{}}', 'invalid']) {
    assert.throws(() => harness({body}).api.fetchWorkouts('token'));
  }
  assert.equal(harness().api.fetchWorkouts('token').length, 0);
  assert.throws(() => harness({status: 401}).api.fetchWorkouts('token'), /HTTP 401/);
});
test('ISO timestamps omit milliseconds', () => {
  const {api} = harness();
  assert.equal(api.toIsoSeconds(new Date('2026-10-17T08:09:10.123Z')), '2026-10-17T08:09:10Z');
});
test('row schema is validated before sheet access', () => {
  const {api, events} = harness();
  assert.throws(() => api.writeNewRows('sheet', [['incomplete']]), /schema/);
  assert.throws(() => api.writeNewRows('sheet', null), /array/);
  assert.deepEqual(events, []);
});
