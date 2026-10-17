/**
 * Minimal tests for the provider-neutral transformation logic.
 * Run in Google Apps Script together with workout_sync.gs.
 */
function runTests() {
  testTransformWorkouts();
  testDeterministicSyncKey();
  console.log('All tests passed.');
}

function testTransformWorkouts() {
  const input = [{
    id: 'workout-1',
    completedAt: '2026-10-15T18:20:26Z',
    exercises: [{
      id: 'exercise-1',
      name: 'Chest Press',
      sets: [
        { reps: 12, weightKg: 30 },
        { reps: 10, weightKg: 32 }
      ]
    }]
  }];

  const rows = transformWorkouts(input);
  assertEqual(rows.length, 2, 'one row should be created per set');
  assertEqual(rows[0][3], 'Chest Press', 'exercise name should be preserved');
  assertEqual(rows[0][5], 12, 'repetitions should be preserved');
  assertEqual(rows[0][6], 30, 'weight should be preserved');
}

function testDeterministicSyncKey() {
  const input = [{
    id: 'workout-1',
    exercises: [{
      id: 'exercise-1',
      sets: [{ reps: 12, weightKg: 30 }]
    }]
  }];

  const first = transformWorkouts(input)[0][7];
  const second = transformWorkouts(input)[0][7];
  assertEqual(first, second, 'sync key should be deterministic');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message + ': expected ' + expected + ', got ' + actual);
  }
}
