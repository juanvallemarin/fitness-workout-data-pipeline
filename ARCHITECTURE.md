# Architecture

## Data flow

```text
REST API
   |
   v
Authentication / HTTP client
   |
   v
Nested workout JSON
   |
   v
Transformation: one row per exercise set
   |
   v
Deterministic sync key / deduplication
   |
   v
Google Sheets
   |
   v
Time-driven scheduled synchronization
```

## Design goals

- Provider-neutral public implementation
- No credentials or personal identifiers in source control
- Idempotent repeated synchronization
- Small, understandable components
- Clear separation between retrieval, transformation and persistence

## Security

Secrets belong in Google Apps Script Script Properties, never in source code.
The repository uses synthetic example data and placeholder endpoints only.
