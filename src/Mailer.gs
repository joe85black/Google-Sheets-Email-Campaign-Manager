/**
 * Mailer.gs
 * Sending, sender verification, quota checks and admin notifications.
 */

const Mailer = (() => {
  /** Sender must be the account itself or a verified "Send mail as" alias. */
  function isAllowedSender(address) {
    const target = String(address).toLowerCase();
    const primary = String(Session.getEffectiveUser().getEmail()).toLowerCase();
    if (target === primary) return true;
    return GmailApp.getAliases().some((a) => a.toLowerCase() === target);
  }

  function remainingQuota() {
    return MailApp.getRemainingDailyQuota();
  }

  function isQuotaError(error) {
    return /too many times|quota|limit exceeded/i.test(String(error && error.message));
  }

  function send(sender, senderName, template, rendered, recipient) {
    GmailApp.sendEmail(recipient, rendered.subject, rendered.plainBody, {
      from: sender,
      name: senderName,
      htmlBody: rendered.htmlBody,
      attachments: template.attachments,
      inlineImages: template.inlineImages,
    });
  }

  /** Configured alert recipients, minus placeholders; falls back to the script owner. */
  function alertRecipients_() {
    const configured = CONFIG.ERROR_RECIPIENTS.filter(
      (a) => Validation.isValidEmail(a) && !/@example\.com$/i.test(a)
    );
    return configured.length > 0 ? configured : [Session.getEffectiveUser().getEmail()];
  }

  /** Plain-text notice to the admin list. Never throws. */
  function notifyAdmins(subject, lines) {
    try {
      GmailApp.sendEmail(
        alertRecipients_().join(','),
        `[Campaign] ${subject}`,
        lines.join('\n')
      );
    } catch (e) {
      console.error('Failed to notify admins:', e);
    }
  }

  return Object.freeze({ isAllowedSender, remainingQuota, isQuotaError, send, notifyAdmins });
})();
