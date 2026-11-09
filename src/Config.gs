/**
 * Config.gs
 * Single source of truth for sheet layout and tunables.
 * If the sheet layout changes, only this file should need editing.
 */

const CONFIG = Object.freeze({
  MENU_NAME: 'Campaign',

  // Row 1 holds headers; data starts on row 2.
  FIRST_DATA_ROW: 2,

  // 1-based column positions. Column B (2) is intentionally never read or written.
  COL: Object.freeze({
    SENT: 1,       // A: checkbox
    EMAIL: 3,      // C: recipient email
    FIRST_NAME: 4, // D: recipient first name
  }),

  CELL: Object.freeze({
    SENDER: 'G1',   // "Send mail as" address
    TEMPLATE: 'G2', // Subject line of the Gmail draft used as the template
    SENDER_NAME: 'G3', // Display name recipients see (required)
  }),

  // Placeholders replaced with the recipient's first name (case-insensitive).
  // Supports {{first_name}} and [name].
  PLACEHOLDER_SOURCE: '\\{\\{\\s*first_name\\s*\\}\\}|\\[\\s*name\\s*\\]',
  NAME_FALLBACK: 'there',
  MAX_NAME_LENGTH: 100,
  MAX_SENDER_NAME_LENGTH: 80,

  // Who receives error and quota alerts. Replace these placeholders with real
  // addresses. Any address at example.com (a reserved domain) is ignored, and if
  // none remain, alerts go to the Google account that runs the script.
  ERROR_RECIPIENTS: Object.freeze([
    'admin@example.com',
    'it-support@example.com',
  ]),

  // Batching (Google Workspace: ~1,500 recipients/day, 6 min per execution).
  BATCH_MAX_SENDS: 75,
  RUN_TIME_BUDGET_MS: 4.5 * 60 * 1000,
  SEND_DELAY_MS: 1000,
  TRIGGER_INTERVAL_MINUTES: 1,
  TRIGGER_HANDLER: 'processCampaignBatch',

  // Prefix for cell notes on rows that could not be sent.
  FAIL_NOTE_PREFIX: 'NOT SENT:',
  MAX_ERROR_TEXT: 300,
});

const STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
});

/** Expected, user-facing errors (safe to display). */
class CampaignError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CampaignError';
  }
}
