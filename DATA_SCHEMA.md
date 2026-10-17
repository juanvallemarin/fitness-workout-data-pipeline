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
