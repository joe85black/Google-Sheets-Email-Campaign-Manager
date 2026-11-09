# Contributing

Thanks for your interest in improving Google Sheets Campaign Manager. Bug reports, fixes, and focused improvements are all welcome.

## Before you start

- For anything larger than a small fix, please [open an issue](../../issues/new/choose) first so we can agree on the approach.
- Security problems should be reported privately. See [SECURITY.md](SECURITY.md).

## Development setup

The script runs in Google Apps Script, but linting and unit tests run locally with Node.js 20 or later.

```bash
npm install
npm run check   # lint + tests
```

| Command | What it does |
| --- | --- |
| `npm run lint` | Runs ESLint over `src/*.gs` and the test files |
| `npm test` | Runs the unit tests in `tests/` with Node's built-in test runner |
| `npm run check` | Both of the above (this is what CI runs) |

The tests load the `.gs` files into a sandbox that mimics Apps Script's shared global scope, so pure logic (validation, encoding, template rendering) can be tested without Google services. Code that calls `SpreadsheetApp`, `GmailApp`, and similar services should be tested manually in a real spreadsheet.

To try your changes in a sheet, use the [clasp workflow](README.md#option-2-clasp-command-line) and `clasp push`. Use a test spreadsheet and send only to addresses you own.

## Guidelines

- **Keep modules focused.** Each file in `src/` has one responsibility. Sheet access belongs in `SheetRepo.gs`, sending in `Mailer.gs`, and so on.
- **Read `CONFIG` at runtime**, never at file load time, so files work in any order in the Apps Script editor.
- **Validate input, encode output.** Anything read from the sheet is untrusted. Add tests for new validation or encoding logic.
- **Don't widen OAuth scopes** without explaining why in the pull request.
- **No personal data.** Use `example.com`, `example.org`, or similar reserved domains in code, tests, and docs.
- Update the README and [CHANGELOG.md](CHANGELOG.md) when behavior or settings change.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change, with tests where practical.
3. Run `npm run check`.
4. Open a pull request and fill in the template.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE), and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
