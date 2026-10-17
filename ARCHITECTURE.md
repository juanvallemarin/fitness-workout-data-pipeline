# Architecture

## System context

The project is a provider-neutral extract-transform-load pipeline hosted in Google Apps Script. It reads nested workout data from a REST API and appends normalized exercise-set rows to Google Sheets.

```text
Manual run or optional time-driven trigger
        |
        v
synchronizeWorkouts
        |
        v
fetchWorkouts <-> Provider REST API: authenticate, request, validate HTTP and JSON
        |
        v
transformWorkouts: validate and flatten workouts/exercises/sets
        |
        v
writeNewRows: lock, verify schema, deduplicate, escape, append
        |
        v
Google Sheets (one row per set)
```

The public endpoint and bearer-token configuration are examples. A real provider integration belongs behind the fetch and mapping boundary.

## Component boundaries

### Provider boundary

`fetchWorkouts` owns the example HTTP request and validates the response status, JSON syntax, and top-level `workouts` collection. Provider-specific authentication, pagination, retries, rate limits, token refresh, and field mapping should be implemented here without changing persistence semantics.

### Transformation

`transformWorkouts` validates nested collections and converts every set to the eight-column public schema. `buildSyncKey` combines stable source identifiers, the one-based set position, repetitions, and weight. Optional zero values remain zero; absent optional values become blank cells.

### Persistence

`writeNewRows`:

1. Validates every row before opening the spreadsheet.
2. Acquires an Apps Script lock.
3. Creates the canonical header only on an empty sheet, or rejects an incompatible header.
4. Loads existing synchronization keys.
5. Filters keys already stored and duplicates within the current batch.
6. Escapes formula-like text and appends new rows in one operation.
7. Releases the lock in a `finally` block.

### Orchestration

`synchronizeWorkouts` reads runtime configuration from Script Properties, fetches data, transforms it, persists new rows, and returns the number of rows written. It can be invoked manually or by an Apps Script time-driven trigger after the deployment has passed the validation procedure.

## Idempotency contract

The synchronization key has this form:

```text
workout_id|exercise_id|set_number|reps|weight_kg
```

Workout and exercise identifiers must therefore be present and must not contain `|`. The set number is positional and starts at one. Two visually identical sets at different positions remain distinct, while replaying the same source response produces the same keys and writes no duplicates. A changed measurement produces a new append-only record rather than modifying an earlier row.

## Failure behavior

The pipeline fails before writing when configuration is missing, the API status is unsuccessful, JSON is invalid, the payload shape is incompatible, identifiers are unsafe, row widths are incorrect, or the sheet schema differs. A write lock is always released after success or failure. Error messages intentionally avoid including response bodies or credentials.

## Scope exclusions

The reference implementation does not provide a live provider connector, automatic trigger provisioning, historical reconciliation, row updates, deletion propagation, or cross-project locking. It also excludes private endpoints, credentials, account identifiers, and real workout data.
