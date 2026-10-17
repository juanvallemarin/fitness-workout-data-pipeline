# Fitness Workout Data Pipeline

A lightweight automation project for collecting structured workout data from a REST API, transforming the JSON response and synchronizing it with Google Sheets.

## Overview

This project demonstrates an end-to-end data integration pipeline designed to run automatically without manual data entry.

The pipeline:

1. Authenticates against a REST API.
2. Retrieves workout data in JSON format.
3. Extracts exercises, sets, repetitions, weights and timestamps.
4. Transforms nested API responses into tabular records.
5. Generates deterministic keys for duplicate detection.
6. Writes new records to Google Sheets.
7. Runs automatically on a scheduled trigger.

## Architecture

REST API  
↓  
Authentication & Session Handling  
↓  
JSON Workout Data  
↓  
Data Transformation  
↓  
Deduplication  
↓  
Google Sheets  
↓  
Scheduled Synchronization

## Technologies

- JavaScript
- Google Apps Script
- REST APIs
- JSON
- Google Sheets API / Spreadsheet Service
- Time-driven automation

## Engineering Challenges

The project addresses several practical integration problems:

- API authentication and session management
- HTTP request handling
- Nested JSON parsing
- Data normalization
- Idempotent synchronization
- Duplicate prevention
- Date/time handling
- Automated scheduled execution
- Error handling

## Data Model

Each workout set can be stored as an individual structured record containing fields such as:

- workout identifier
- workout timestamp
- exercise identifier
- exercise name
- set number
- repetitions
- weight
- calories
- activity points
- synchronization key

## Privacy and Security

Credentials are never stored in source code.

Authentication information must be provided through secure configuration or script properties.

The public repository contains no personal workout data, account identifiers or proprietary API credentials.

## Status

Working prototype validated with real-world workout data.

The public version is provider-neutral and intended to demonstrate the architecture and engineering approach rather than expose any private or proprietary integration.

## License

MIT
