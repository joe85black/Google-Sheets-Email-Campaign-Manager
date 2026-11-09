# Google Sheets Campaign Manager

[![CI](https://github.com/joe85black/Google-Sheets-Email-Campaign-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/joe85black/Google-Sheets-Email-Campaign-Manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Google Apps Script](https://img.shields.io/badge/Built%20with-Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)

Turn a Google Sheet into a lightweight, personalized email campaign manager.

Recipients live in the sheet, the email lives in a Gmail draft, and a **Campaign** menu lets anyone on your team start, stop, or reset a send without touching code. Every message is personalized, sent from the address and display name you choose, and checked off in the sheet the moment it goes out.

Built entirely on Google Apps Script. No third-party services, no external servers, no API keys.

---

## Features

- **One-click campaigns.** A custom **Campaign** menu with *Start*, *Stop*, and *Clear*.
- **Gmail drafts as templates.** Design the email in Gmail with full formatting, inline images, and attachments.
- **Personalization.** Insert each recipient's first name with `{{first_name}}` or `[name]`, in the subject or the body.
- **Send-as aliases and display names.** Send from any verified "Send mail as" address under a custom sender name.
- **Resumable and duplicate-safe.** Each row is checked off immediately after sending. Stopping and restarting picks up where it left off.
- **Automatic batching.** Large lists send in the background on a timed trigger, staying within Apps Script's execution limits.
- **Quota-aware.** Pauses when the daily Gmail quota is reached and resumes automatically when it resets.
- **Error alerts.** Failed rows are flagged in the sheet, and a summary is emailed to the addresses you configure.
- **Secure by default.** Input validation, output encoding, header-injection protection, and least-privilege OAuth scopes. See [Security](#security).

---

## Sheet layout

Row 1 holds headers. Data starts on row 2.

| Column / Cell | Contents | Managed by |
| --- | --- | --- |
| **A** | Checkbox: sent status | Script (ticked after each send) |
| **B** | Your own data (IDs, numbers, etc.) | You (never read or modified) |
| **C** | Recipient email address | You |
| **D** | Recipient first name | You |
| **G1** | Sender address (a verified "Send mail as" alias) | You |
| **G2** | Subject line of the Gmail draft to use as the template | You |
| **G3** | Sender display name, e.g. `Jane Doe - Acme Co.` | You (required) |

Column A should be formatted as checkboxes (**Insert → Checkbox**).

To get started quickly, import [`examples/sheet-template.csv`](examples/sheet-template.csv) (**File → Import → Upload**), then select A2:A and choose **Insert → Checkbox**. Column F holds optional labels for the settings cells and is not read by the script.

All positions are defined in [`src/Config.gs`](src/Config.gs) and can be changed there.

---

## Installation

### Option 1: Copy and paste (no tools required)

1. Open your Google Sheet and go to **Extensions → Apps Script**.
2. Delete the default `Code.gs`.
3. For each file in [`src/`](src), create a script file with the same name (**+ → Script**) and paste in its contents.
4. Open **Project Settings** (gear icon), enable **Show "appsscript.json" manifest file in editor**, then replace the manifest's contents with [`src/appsscript.json`](src/appsscript.json).
5. Save, then reload the spreadsheet. The **Campaign** menu appears in the toolbar.

### Option 2: clasp (command line)

1. In your sheet, open **Extensions → Apps Script → Project Settings** and copy the **Script ID**.
2. In the repository root, create `.clasp.json` (already listed in `.gitignore`):

   ```json
   { "scriptId": "<YOUR_SCRIPT_ID>", "rootDir": "src" }
   ```

3. Push the code:

   ```bash
   npm install -g @google/clasp
   clasp login
   clasp push
   ```

### Configure alert recipients

In [`src/Config.gs`](src/Config.gs), replace the placeholder addresses in `ERROR_RECIPIENTS` with the people who should receive error and quota alerts:

```js
ERROR_RECIPIENTS: Object.freeze([
  'admin@example.com',
  'it-support@example.com',
]),
```

Placeholder addresses at `example.com` are ignored. If no real addresses are configured, alerts go to the Google account running the script.

Optionally, set `timeZone` in `appsscript.json` to your own time zone.

---

## Usage

### 1. Create the template

1. In Gmail, compose a new email. Leave the **To** field empty.
2. Write the subject and body. Use `{{first_name}}` or `[name]` wherever the recipient's first name should appear:

   > **Subject:** `{{first_name}}, your application update`
   >
   > Hi {{first_name}},
   >
   > Thanks for reaching out…

3. Close the email so it saves to **Drafts**.

> Use a regular **draft**, not Gmail's *Templates* feature. Templates are stored separately and are not accessible to Apps Script.

If a first name is blank, the placeholder is replaced with `there` (e.g., "Hi there,"). The fallback is configurable via `NAME_FALLBACK`.

### 2. Fill in the sheet

- Add recipients to columns **C** (email) and **D** (first name).
- Set **G1** to the sender address, **G2** to the draft's exact subject line, and **G3** to the sender display name.

### 3. Run the campaign

| Menu item | What it does |
| --- | --- |
| **Campaign → Start campaign** | Validates the settings, shows a confirmation with the recipient count, sender, and template, then begins sending in the background. You can close the sheet while it runs. |
| **Campaign → Stop campaign** | Halts sending. Sent rows stay checked, so *Start* resumes from the first unchecked row. |
| **Campaign → Clear campaign** | After confirmation, stops any running campaign and clears the checkboxes, emails, first names, and G1–G3. Column B and the header row are untouched. |

The first time you run a menu item, Google will ask you to authorize the script.

---

## How it works

```
Start campaign
   │  validate G1–G3 · find draft · confirm
   ▼
Time-driven trigger (every minute)
   │
   ├─ acquire document lock (no overlapping runs)
   ├─ load template once per batch
   ├─ for each unchecked row:
   │     validate → personalize → send → tick checkbox → flush
   ├─ stop when: batch limit · time budget · quota exhausted · campaign stopped
   └─ email a summary of any errors to the configured recipients
   │
   ▼
All rows sent → trigger removed automatically
```

| Setting (`Config.gs`) | Default | Purpose |
| --- | --- | --- |
| `BATCH_MAX_SENDS` | `75` | Maximum emails per run |
| `RUN_TIME_BUDGET_MS` | 4.5 minutes | Stops safely before Apps Script's 6-minute limit |
| `SEND_DELAY_MS` | `1000` | Delay between sends to reduce spam flagging |
| `TRIGGER_INTERVAL_MINUTES` | `1` | How often batches run |

### Sending limits

Gmail enforces daily recipient quotas: roughly **100/day** on consumer Gmail accounts and **1,500/day** on Google Workspace. The script checks the remaining quota before every batch. When it runs out, the campaign pauses, a single alert is sent, and sending resumes automatically after the quota resets.

### Error handling

| Situation | Result |
| --- | --- |
| Invalid email address in a row | Row skipped and flagged with a `NOT SENT:` note on its checkbox |
| Send failure for one recipient | Row flagged; campaign continues |
| Template draft deleted, alias removed, or sheet deleted | Campaign stops; alert emailed |
| Daily quota reached | Campaign pauses; alert emailed once; resumes automatically |

Flagged rows are retried the next time the campaign is started.

---

## Security

This project follows OWASP and SANS secure coding guidance where applicable to Apps Script.

- **Input validation.** Recipient and sender addresses must match a strict format, which also prevents a single cell from expanding into multiple recipients (e.g., `a@x.com,b@y.com`).
- **Output encoding.** First names are HTML-escaped before insertion into the HTML body, preventing markup or link injection from sheet data.
- **Header-injection protection.** Control characters, including CR/LF, are stripped from names. Sender display names reject `< > " @ \` to prevent address spoofing.
- **Sender verification.** The sender must be the account itself or a verified Gmail "Send mail as" alias.
- **Least privilege.** OAuth scopes are declared explicitly in `appsscript.json`, and the spreadsheet scope is limited to the bound document.
- **Concurrency control.** `LockService` prevents overlapping runs from sending duplicates.
- **Safe error reporting.** Users see friendly messages; internal details go only to the execution log.
- **No secrets in code.** The script requires no API keys, tokens, or credentials.

> **Note on Gmail permissions:** reading drafts and sending through aliases requires the full Gmail scope (`https://mail.google.com/`), so Google's authorization screen will request broad Gmail access. The script only reads drafts and sends mail.

To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## Project structure

```
src/                 Apps Script source (this is what gets deployed)
├── Config.gs        Sheet layout, limits, and alert recipients
├── Menu.gs          Adds the Campaign menu
├── Campaign.gs      Start, stop, clear, and the background batch processor
├── Template.gs      Locates the Gmail draft and fills in placeholders
├── Mailer.gs        Sending, alias verification, quota checks, alerts
├── SheetRepo.gs     All spreadsheet reads and writes
├── State.gs         Campaign state in Document Properties
├── Validation.gs    Input validation and output encoding
└── appsscript.json  Manifest: runtime and OAuth scopes
tests/               Unit tests for validation and template rendering
examples/            Starter sheet you can import
```

Each module has a single responsibility, and every file reads configuration at runtime, so files load correctly in any order in the Apps Script editor.

---

## Development

Linting and unit tests run locally with Node.js 20 or later. Node is only needed for development; the script itself runs entirely in Apps Script.

```bash
npm install
npm run check   # ESLint + unit tests, the same checks CI runs
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, and [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Troubleshooting

| Problem | Solution |
| --- | --- |
| `ReferenceError: CONFIG is not defined` | Make sure `Config.gs` exists and contains the code from this repo. |
| The **Campaign** menu doesn't appear | Run `onOpen` once from the Apps Script editor, authorize, and reload the sheet. |
| "Not a verified Send mail as address" | Add the address under **Gmail → Settings → Accounts → Send mail as**. |
| "No Gmail draft found" | G2 must match the draft's subject exactly, including capitalization and placeholders. |
| Background batches fail with an authorization error | In `appsscript.json`, change `spreadsheets.currentonly` to `spreadsheets`. |

---

## Responsible use

Only send to recipients who have agreed to hear from you, and comply with applicable laws such as CAN-SPAM, GDPR, and CASL. Test with your own addresses before running a real campaign.

---

## License

Released under the [MIT License](LICENSE).
