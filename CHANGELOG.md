# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-10-17

### Added

- Provider-neutral Apps Script pipeline for fetching, normalizing, and appending workout sets.
- Deterministic duplicate prevention and concurrency-safe Google Sheets writes.
- Automated Node.js tests and GitHub Actions continuous integration.
- Architecture, schema, setup, security, and release documentation.
- Apps Script V8 manifest and ignore rules for local secrets and generated files.

### Security

- Runtime secrets are read from Script Properties instead of source code.
- Formula-like text is escaped before spreadsheet writes.
- Public examples contain no private endpoints, credentials, identifiers, or real workout data.
