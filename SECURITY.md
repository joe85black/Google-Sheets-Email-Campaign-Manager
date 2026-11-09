# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, report them privately through GitHub's
[private vulnerability reporting](../../security/advisories/new)
(**Security → Report a vulnerability** on this repository).

Please include:

- A description of the issue and its potential impact
- Steps to reproduce, or a proof of concept
- Any suggested remediation

You can expect an acknowledgment within a few business days. Confirmed issues will be fixed and disclosed once a patch is available.

## Scope

In scope:

- Injection through sheet data (email addresses, names, sender settings)
- Bypassing sender verification or display-name restrictions
- Duplicate or unintended sends caused by concurrency or state handling
- Exposure of data beyond the bound spreadsheet and the running account's Gmail

Out of scope:

- Gmail or Google Workspace platform behavior and quotas
- Misconfiguration by the deploying user (e.g., unverified aliases, overly broad sharing of the spreadsheet)

## Deployment recommendations

- Share the spreadsheet only with people who should be able to send campaigns. Anyone with edit access can run the menu.
- Review the OAuth scopes in `src/appsscript.json` before authorizing.
- Keep `ERROR_RECIPIENTS` limited to trusted administrators.
