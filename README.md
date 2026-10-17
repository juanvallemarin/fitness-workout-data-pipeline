# Fitness Workout Data Pipeline

A compact, serverless data pipeline that retrieves nested workout JSON from a REST API, normalizes it into one Google Sheets row per exercise set, and prevents duplicate writes across repeated synchronizations.

The repository is deliberately provider-neutral. Its endpoint, authentication example, and sample payload are synthetic; connecting a real service requires a provider-specific adapter that remains outside this public project.

## What this project demonstrates

- REST API integration with an example bearer-token flow.
- Explicit HTTP-status, JSON-shape, and identifier validation.
- Normalization of workouts, exercises, and sets into a stable tabular schema.
- Deterministic synchronization keys for idempotent imports.
- Concurrency-safe writes to Google Sheets with Apps Script locks.
- Secret management through Apps Script Script Properties.
- Optional time-driven Apps Script execution after manual validation.
- Automated Node.js tests and continuous integration.
- Operational, architecture, schema, and security documentation.

## Data flow

```text
REST API -> fetch and validate -> normalize nested JSON
         -> build deterministic keys -> acquire script lock
         -> verify sheet schema -> append only unseen rows
```

## Example input and output

An abbreviated synthetic input:

```json
{
  "workouts": [
    {
      "id": "workout-demo-001",
      "completedAt": "2026-10-17T08:30:00Z",
      "exercises": [
        {
          "id": "exercise-demo-001",
          "name": "Example press",
          "sets": [{ "reps": 10, "weightKg": 25 }]
        }
      ]
    }
  ]
}
```

Each set becomes one row:

| workout_id | completed_at | exercise_id | exercise_name | set_number | reps | weight_kg | sync_key |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| workout-demo-001 | 2026-10-17T08:30:00Z | exercise-demo-001 | Example press | 1 | 10 | 25 | workout-demo-001\|exercise-demo-001\|1\|10\|25 |

The exact contract is documented in [DATA_SCHEMA.md](DATA_SCHEMA.md).

## Reliability and idempotency

The pipeline derives each `sync_key` from the workout ID, exercise ID, one-based set position, repetitions, and weight. Before appending, it loads existing keys from the sheet and filters both previously stored rows and duplicates in the current response. A script lock serializes competing executions. Repeating an unchanged synchronization therefore writes zero rows; a corrected measurement is retained as a new append-only record.

Malformed identifiers, unexpected collection types, invalid JSON, unsuccessful HTTP responses, missing configuration, and incompatible sheet headers fail explicitly. Values equal to zero are preserved. Text that could be interpreted as a spreadsheet formula is escaped before writing.

## Technology

- Google Apps Script and Google Sheets
- JavaScript
- Node.js built-in test runner
- GitHub Actions

## Testing

Run the complete local suite:

```bash
node --test
```

The tests cover normalization, zero-value preservation, empty nested collections, multiple workouts and exercises, deterministic key construction, duplicate filtering across repeated and concurrent runs, header creation and rejection, formula escaping, lock release, missing configuration, HTTP failures, invalid JSON, invalid response shapes, and ISO timestamp conversion.

The public suite uses test doubles and synthetic data. A real provider adapter still requires a manual two-run validation against an isolated test spreadsheet before any scheduled trigger is enabled.

## Setup

Follow [SETUP.md](SETUP.md) to run the tests, create an isolated spreadsheet, add the Apps Script project, store secrets safely, adapt the provider boundary, and perform the two-run idempotency check.

## Security and privacy

Do not commit API credentials, cookies, spreadsheet IDs, private endpoints, or personal workout data. Store runtime configuration in Script Properties and review [SECURITY.md](SECURITY.md) before connecting a service.

## Limitations

- `https://api.example.com/v1/workouts` is a placeholder, not a live integration.
- Bearer authentication is an example. Pagination, retries, rate-limit handling, token refresh, backfills, and provider-field mapping belong in the private adapter.
- The destination is append-only; upstream corrections to already imported sets are not reconciled.
- The Apps Script lock coordinates executions within one script project, not independent deployments.
- The public eight-column schema intentionally excludes provider-specific aggregate metrics.

## Status

Version 1.0.0 is a provider-neutral reference implementation derived from a working personal automation. Private adapters, endpoints, credentials, and workout data are intentionally not included.

## License

The original code and documentation in this repository are licensed under the MIT License. Third-party APIs, trademarks, services, and user data are not covered by that license and remain subject to their respective terms.
