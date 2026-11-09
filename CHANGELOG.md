# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-09

### Added

- **Campaign** menu with *Start*, *Stop*, and *Clear* actions.
- Gmail drafts as templates, including HTML formatting, inline images, and attachments.
- `{{first_name}}` and `[name]` placeholders in the subject and body, with a configurable fallback.
- Sending from verified "Send mail as" aliases with a custom display name.
- Background batching on a time-driven trigger, with a per-run time budget and send limit.
- Daily quota detection with automatic pause and resume.
- Per-row failure notes and emailed error summaries to configured recipients.
- Input validation, HTML output encoding, header-injection protection, and least-privilege OAuth scopes.
- ESLint configuration, unit tests, and a GitHub Actions CI workflow.

[Unreleased]: https://github.com/joe85black/Google-Sheets-Email-Campaign-Manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/joe85black/Google-Sheets-Email-Campaign-Manager/releases/tag/v1.0.0
