# Security policy

## Supported versions

Security fixes are maintained for the latest `1.0.x` release.

## Reporting a vulnerability

Do not open a public issue containing credentials, private endpoints, account identifiers, personal data, or exploit details. Use GitHub's private vulnerability reporting or a private security advisory when available. If a secret has been exposed, revoke or rotate it first; removing it from current files does not remove it from Git history.

## Deployment guidance

- Store credentials and spreadsheet IDs in Apps Script Script Properties.
- Never log access tokens, cookies, authorization headers, or full API response bodies.
- Grant the minimum API and Google permissions required.
- Validate with a dedicated test spreadsheet and, where possible, a limited test credential.
- Review and comply with the data provider's API, privacy, and retention terms.
- Keep provider-specific adapters, endpoints, and real workout data outside the public repository.

The public endpoint and payload are synthetic and do not provide access to a real service.

## License scope

The MIT License applies only to original code and documentation in this repository. It does not grant rights to third-party APIs, trademarks, services, credentials, or data.
