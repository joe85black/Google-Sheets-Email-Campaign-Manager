/**
 * SheetRepo.gs
 * All spreadsheet reads/writes live here. Column B is never touched.
 */

const SheetRepo = (() => {
  // CONFIG is read inside each function (not at load time) so file order in the editor doesn't matter.

  function getSheetById(sheetId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheets()
      .find((s) => s.getSheetId() === sheetId);
    if (!sheet) throw new CampaignError('The campaign sheet no longer exists.');
    return sheet;
  }

  function readSettings(sheet) {
    return {
      sender: Validation.normalizeEmail(sheet.getRange(CONFIG.CELL.SENDER).getDisplayValue()),
      templateName: String(sheet.getRange(CONFIG.CELL.TEMPLATE).getDisplayValue()).trim(),
      // Control chars/CR/LF stripped here; length and characters are validated at Start.
      senderName: Validation.cleanText(sheet.getRange(CONFIG.CELL.SENDER_NAME).getDisplayValue(), 1000),
    };
  }

  function dataRowCount_(sheet) {
    return Math.max(0, sheet.getLastRow() - CONFIG.FIRST_DATA_ROW + 1);
  }

  /** Reads columns A, C and D only (plus notes on A for failure markers). */
  function readRows(sheet) {
    const n = dataRowCount_(sheet);
    if (n === 0) return [];

    const sentRange = sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.SENT, n, 1);
    const sent = sentRange.getValues();
    const notes = sentRange.getNotes();
    const emails = sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.EMAIL, n, 1).getValues();
    const names = sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.FIRST_NAME, n, 1).getValues();

    return sent.map((_, i) => ({
      row: CONFIG.FIRST_DATA_ROW + i,
      sent: sent[i][0] === true,
      failed: String(notes[i][0]).startsWith(CONFIG.FAIL_NOTE_PREFIX),
      email: Validation.normalizeEmail(emails[i][0]),
      firstName: Validation.cleanText(names[i][0], CONFIG.MAX_NAME_LENGTH),
    }));
  }

  function markSent(sheet, row) {
    const cell = sheet.getRange(row, CONFIG.COL.SENT);
    cell.setValue(true);
    cell.clearNote();
  }

  function markFailed(sheet, row, reason) {
    sheet.getRange(row, CONFIG.COL.SENT).setNote(`${CONFIG.FAIL_NOTE_PREFIX} ${reason}`);
  }

  function clearFailureNotes(sheet) {
    const n = dataRowCount_(sheet);
    if (n > 0) sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.SENT, n, 1).clearNote();
  }

  /** Unchecks A, clears notes on A, clears C and D, clears G1:G3. Leaves B and headers alone. */
  function clearCampaignData(sheet) {
    const n = dataRowCount_(sheet);
    if (n > 0) {
      const sentRange = sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.SENT, n, 1);
      sentRange.uncheck();
      sentRange.clearNote();
      sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.EMAIL, n, 1).clearContent();
      sheet.getRange(CONFIG.FIRST_DATA_ROW, CONFIG.COL.FIRST_NAME, n, 1).clearContent();
    }
    sheet.getRange(CONFIG.CELL.SENDER).clearContent();
    sheet.getRange(CONFIG.CELL.TEMPLATE).clearContent();
    sheet.getRange(CONFIG.CELL.SENDER_NAME).clearContent();
  }

  return Object.freeze({
    getSheetById,
    readSettings,
    readRows,
    markSent,
    markFailed,
    clearFailureNotes,
    clearCampaignData,
  });
})();
