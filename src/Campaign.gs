/**
 * Campaign.gs
 * Start / stop / clear logic and the background batch processor.
 * Functions ending in "_" are private (hidden from the Run menu and google.script.run).
 */

// ---------- Menu actions ----------

function startCampaign() {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    ui.alert('Another campaign action is in progress. Please try again in a moment.');
    return;
  }

  try {
    if (State.getStatus() === STATUS.RUNNING) {
      ui.alert('A campaign is already running. Stop it first if you want to restart.');
      return;
    }

    const sheet = SpreadsheetApp.getActiveSheet();
    const { sender, templateName, senderName } = SheetRepo.readSettings(sheet);

    if (!sender) throw new CampaignError(`Enter the sender address in ${CONFIG.CELL.SENDER}.`);
    if (!Validation.isValidEmail(sender)) {
      throw new CampaignError(`${CONFIG.CELL.SENDER} is not a valid email address.`);
    }
    if (!Mailer.isAllowedSender(sender)) {
      throw new CampaignError(
        `"${sender}" is not a verified "Send mail as" address on this Google account.`
      );
    }
    if (!senderName) {
      throw new CampaignError(`Enter the sender's display name in ${CONFIG.CELL.SENDER_NAME}.`);
    }
    if (!Validation.isValidDisplayName(senderName)) {
      throw new CampaignError(
        `The name in ${CONFIG.CELL.SENDER_NAME} must be ${CONFIG.MAX_SENDER_NAME_LENGTH} characters or fewer ` +
          'and cannot contain < > " @ or \\.'
      );
    }
    if (!templateName) {
      throw new CampaignError(`Enter the template draft's subject line in ${CONFIG.CELL.TEMPLATE}.`);
    }

    const draft = Template.findDraftBySubject(templateName);
    Template.load(draft.getId()); // confirms it is readable

    const pending = SheetRepo.readRows(sheet).filter((r) => !r.sent && r.email);
    if (pending.length === 0) {
      ui.alert('There are no unsent rows with an email address.');
      return;
    }

    const quota = Mailer.remainingQuota();
    const quotaNote =
      pending.length > quota
        ? `\n\nOnly ${quota} can go out today. The rest will send automatically once the daily quota resets.`
        : '';

    const answer = ui.alert(
      'Start campaign?',
      `Recipients: ${pending.length}\nFrom: ${senderName} <${sender}>\nTemplate: ${templateName}${quotaNote}`,
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;

    SheetRepo.clearFailureNotes(sheet); // retry previously failed rows
    State.saveSettings({
      sheetId: sheet.getSheetId(),
      sender,
      senderName,
      draftId: draft.getId(),
      templateName,
      quotaNotified: false,
    });
    State.setStatus(STATUS.RUNNING);
    installTrigger_();

    SpreadsheetApp.getActive().toast('Campaign started. Emails begin within about a minute.', 'Campaign');
  } catch (e) {
    showError_(e);
  } finally {
    lock.releaseLock();
  }
}

function stopCampaign() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (State.getStatus() !== STATUS.RUNNING) {
      removeTriggers_();
      ui.alert('No campaign is running.');
      return;
    }
    haltCampaign_();
    ui.alert(
      'Campaign stopped.\n\nRows already sent stay checked. Choosing "Start campaign" again resumes from the unchecked rows.'
    );
  } catch (e) {
    showError_(e);
  }
}

function clearCampaign() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    'Clear campaign?',
    'This stops any running campaign and permanently clears:\n' +
      '• All checkboxes in column A\n' +
      '• All emails (column C) and first names (column D)\n' +
      `• Sender (${CONFIG.CELL.SENDER}), template (${CONFIG.CELL.TEMPLATE}) and sender name (${CONFIG.CELL.SENDER_NAME})\n\n` +
      'Column B and the header row are not changed.',
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;

  try {
    const settings = State.getSettings();
    haltCampaign_();

    // Wait for an in-flight batch to notice the stop and exit.
    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(30000)) {
      throw new CampaignError('A batch is still finishing. Please try "Clear campaign" again in a minute.');
    }
    try {
      let sheet = SpreadsheetApp.getActiveSheet();
      if (settings && settings.sheetId != null) {
        try {
          sheet = SheetRepo.getSheetById(settings.sheetId);
        } catch (ignored) {
          // Campaign sheet was deleted; fall back to the active sheet.
        }
      }
      SheetRepo.clearCampaignData(sheet);
      State.clearAll();
    } finally {
      lock.releaseLock();
    }

    SpreadsheetApp.getActive().toast('Campaign cleared.', 'Campaign');
  } catch (e) {
    showError_(e);
  }
}

// ---------- Background processor (time-driven trigger) ----------

function processCampaignBatch() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) return; // previous batch still running

  const startedAt = Date.now();
  const errors = [];
  let settings = null;

  try {
    if (State.getStatus() !== STATUS.RUNNING) {
      removeTriggers_();
      return;
    }

    settings = State.getSettings();
    if (!settings) throw new CampaignError('Campaign settings are missing.');

    if (!settings.senderName) {
      throw new CampaignError('Sender name is missing. Stop the campaign and start it again.');
    }

    const sheet = SheetRepo.getSheetById(settings.sheetId);
    if (!Mailer.isAllowedSender(settings.sender)) {
      throw new CampaignError(`Sender "${settings.sender}" is no longer a verified alias.`);
    }
    const template = Template.load(settings.draftId);

    const pending = SheetRepo.readRows(sheet).filter((r) => !r.sent && !r.failed && r.email);
    if (pending.length === 0) {
      haltCampaign_();
      return;
    }

    let quota = Mailer.remainingQuota();
    if (quota <= 0) {
      notifyQuotaOnce_(settings, pending.length);
      return;
    }
    if (settings.quotaNotified) {
      settings.quotaNotified = false;
      State.saveSettings(settings);
    }

    let sentThisRun = 0;
    for (const r of pending) {
      if (
        sentThisRun >= CONFIG.BATCH_MAX_SENDS ||
        quota <= 0 ||
        Date.now() - startedAt > CONFIG.RUN_TIME_BUDGET_MS ||
        State.getStatus() !== STATUS.RUNNING
      ) {
        break;
      }

      if (!Validation.isValidEmail(r.email)) {
        recordFailure_(sheet, r, 'Invalid email address', errors);
        continue;
      }

      try {
        Mailer.send(
          settings.sender,
          settings.senderName,
          template,
          Template.render(template, r.firstName),
          r.email
        );
        SheetRepo.markSent(sheet, r.row);
        SpreadsheetApp.flush(); // persist progress immediately to prevent duplicates
        sentThisRun++;
        quota--;
        Utilities.sleep(CONFIG.SEND_DELAY_MS);
      } catch (e) {
        if (Mailer.isQuotaError(e)) {
          notifyQuotaOnce_(settings, pending.length - sentThisRun);
          break;
        }
        recordFailure_(sheet, r, safeMessage_(e), errors);
      }
    }
  } catch (e) {
    // Fatal problem (template deleted, alias removed, sheet deleted...): stop and report.
    haltCampaign_();
    errors.push(`CAMPAIGN STOPPED: ${safeMessage_(e)}`);
    console.error(e);
  } finally {
    if (errors.length > 0) {
      Mailer.notifyAdmins('Errors during campaign', [
        `Spreadsheet: ${SpreadsheetApp.getActiveSpreadsheet().getName()}`,
        `Template: ${settings ? settings.templateName : 'unknown'}`,
        `Sender: ${settings ? `${settings.senderName} <${settings.sender}>` : 'unknown'}`,
        '',
        ...errors,
      ]);
    }
    lock.releaseLock();
  }
}

// ---------- Private helpers ----------

function haltCampaign_() {
  State.setStatus(STATUS.STOPPED);
  removeTriggers_();
}

function installTrigger_() {
  removeTriggers_();
  ScriptApp.newTrigger(CONFIG.TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_INTERVAL_MINUTES)
    .create();
}

function removeTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === CONFIG.TRIGGER_HANDLER)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

function recordFailure_(sheet, rowInfo, reason, errors) {
  SheetRepo.markFailed(sheet, rowInfo.row, reason);
  errors.push(`Row ${rowInfo.row} (${rowInfo.email}): ${reason}`);
}

function notifyQuotaOnce_(settings, remaining) {
  if (settings.quotaNotified) return;
  settings.quotaNotified = true;
  State.saveSettings(settings);
  Mailer.notifyAdmins('Daily sending quota reached', [
    `Template: ${settings.templateName}`,
    `About ${remaining} emails remain. The campaign is paused and will resume automatically when the quota resets.`,
  ]);
}

function safeMessage_(error) {
  const msg = error && error.message ? error.message : String(error);
  return Validation.cleanText(msg, CONFIG.MAX_ERROR_TEXT);
}

/** Shows expected errors as-is; hides internals of unexpected ones. */
function showError_(error) {
  console.error(error);
  const message =
    error instanceof CampaignError
      ? error.message
      : 'Something went wrong. Details were written to the script log (Extensions › Apps Script › Executions).';
  SpreadsheetApp.getUi().alert('Campaign', message, SpreadsheetApp.getUi().ButtonSet.OK);
}
