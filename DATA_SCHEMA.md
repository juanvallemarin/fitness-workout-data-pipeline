# Data schema

The pipeline stores one row per exercise set.

| Column | Description |
|---|---|
| workout_id | Identifier of the workout |
| completed_at | Workout completion timestamp |
| exercise_id | Identifier of the exercise |
| exercise_name | Human-readable exercise name |
| set_number | Position of the set within the exercise |
| reps | Number of repetitions |
| weight_kg | Weight in kilograms |
| sync_key | Deterministic key used for idempotent synchronization |

The public example uses synthetic data only.

## Synchronization semantics

Zero repetitions and zero weight are preserved; missing or null measurements
produce blank cells. Workout and exercise IDs are required.

The append-only key is `workout_id|exercise_id|set_number|reps|weight_kg`.
Duplicate keys are ignored within a response and across runs. Changed measurements
create a new row; existing rows are not updated or deleted. Providers must supply
IDs without `|` and use each exercise ID at most once per workout. Adapt the
mapping and key if your provider represents repeated exercise blocks.

The corrected zero handling changes keys for records that previously lost zero
values. Such historical rows may need manual reconciliation before rerunning.

Writes are serialized with a script lock and flushed before release. This protects
executions in the same Apps Script project; do not run multiple independent projects
against the same worksheet. Strings beginning with `=` are escaped as literal text.
