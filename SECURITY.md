# Security Policy

## Scope
HA Engineering Console can connect to a Home Assistant instance and inspect configuration, entity state and diagnostics. Treat its output and generated YAML as proposals requiring review, not as proof that a home or automation is safe.

## Credentials and configuration
- Home Assistant long-lived access tokens are privileged credentials. Do not commit them, paste them into issues, or include them in exported reports.
- Tokens are kept in component memory and are not persisted by the connection-settings feature. Browser scripts running in the same origin may still access in-memory values while the page is active.
- Use HTTPS when connecting across untrusted networks. Plain HTTP exposes credentials and API traffic to network observers.
- Review diagnostic exports before sharing: entity names, device models, addresses, topology and configuration snippets can reveal private details.
- Back up Home Assistant configuration before applying any generated YAML. Validate against the target Home Assistant version and review diffs before applying changes.

## Safe operation
Use read-only mode unless a write action is explicitly required and approved. Do not apply generated configuration automatically to a live home without a backup and a rollback plan.

## Reporting
Report suspected vulnerabilities privately through GitHub private vulnerability reporting when available, or contact the maintainer privately. Do not include access tokens, private entity states or full configuration dumps in public issues.

## Limitations
Synthetic profiles are simulations, not live-device evidence. Diagnostic rules may produce false positives or miss problems. Passing tests does not establish complete security or safety.