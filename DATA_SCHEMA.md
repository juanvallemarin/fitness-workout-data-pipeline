# Data schema

The `Workouts` sheet uses a fixed eight-column schema. Each output row represents one exercise set.

| Column | Field | Type | Required | Description |
| ---: | --- | --- | --- | --- |
| A | `workout_id` | string | yes | Stable source workout identifier. |
| B | `completed_at` | string or blank | no | Completion timestamp supplied by the provider adapter. |
| C | `exercise_id` | string | yes | Stable source exercise identifier within the workout. |
| D | `exercise_name` | string or blank | no | Human-readable exercise name. |
| E | `set_number` | positive integer | yes | One-based position in the source `sets` array. |
| F | `reps` | number or blank | no | Repetition count; zero is preserved. |
| G | `weight_kg` | number or blank | no | Weight in kilograms; zero is preserved. |
| H | `sync_key` | string | yes | Deterministic idempotency key. |

## Input rules

- The top-level `workouts` value must be an array.
- Missing or `null` `exercises` and `sets` values are treated as empty collections. If present with another type, they are rejected.
- Each set must be an object.
- Workout and exercise IDs are required and cannot contain the `|` delimiter.
- Missing or `null` optional values become blank cells. Falsy values such as numeric zero are retained.

## Synchronization key

```text
sync_key = workout_id + "|" + exercise_id + "|" + set_number
           + "|" + reps + "|" + weight_kg
```

The set number is positional. This distinguishes repeated sets with identical measurements. Including the measurements preserves the established append-only behavior: a corrected measurement creates a new row, while an unchanged replay does not.

## Persistence rules

- The exact header order above is mandatory.
- A completely empty sheet receives the header automatically.
- A non-empty sheet with a different header is rejected.
- Existing and in-batch `sync_key` values are not appended again.
- String cells beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe to prevent spreadsheet formula interpretation.
- The public schema intentionally excludes provider-specific aggregate metrics.
