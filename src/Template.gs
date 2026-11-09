/**
 * Template.gs
 * Finds the Gmail draft used as the template and fills in placeholders.
 */

const Template = (() => {
  function findDraftBySubject(subject) {
    const matches = GmailApp.getDrafts().filter(
      (d) => d.getMessage().getSubject() === subject
    );
    if (matches.length === 0) {
      throw new CampaignError(`No Gmail draft found with the subject "${subject}".`);
    }
    if (matches.length > 1) {
      throw new CampaignError(
        `${matches.length} drafts have the subject "${subject}". Please make it unique.`
      );
    }
    return matches[0];
  }

  /** Loads the draft's content once per batch. */
  function load(draftId) {
    let message;
    try {
      message = GmailApp.getDraft(draftId).getMessage();
    } catch (e) {
      throw new CampaignError('The template draft was deleted or can no longer be read.');
    }

    const htmlBody = message.getBody();
    return Object.freeze({
      subject: message.getSubject(),
      htmlBody,
      plainBody: message.getPlainBody(),
      attachments: message.getAttachments({ includeInlineImages: false }),
      inlineImages: extractInlineImages_(message, htmlBody),
    });
  }

  /** Returns a per-recipient copy with the first name inserted, encoded for each context. */
  function render(template, firstName) {
    const name = firstName || CONFIG.NAME_FALLBACK;
    return {
      subject: fill_(template.subject, name), // already stripped of CR/LF
      plainBody: fill_(template.plainBody, name),
      htmlBody: fill_(template.htmlBody, Validation.escapeHtml(name)),
    };
  }

  // Replacement via function so "$&"-style sequences in a name are not interpreted.
  function fill_(text, value) {
    return text.replace(new RegExp(CONFIG.PLACEHOLDER_SOURCE, 'gi'), () => value);
  }

  /** Maps cid references in the HTML to the draft's inline image blobs. */
  function extractInlineImages_(message, html) {
    const inline = message.getAttachments({
      includeInlineImages: true,
      includeAttachments: false,
    });
    if (inline.length === 0) return {};

    const byName = {};
    inline.forEach((blob) => {
      byName[blob.getName()] = blob;
    });

    const result = {};
    const imgRe = /<img[^>]+src="cid:([^"]+)"[^>]*>/gi;
    let match;
    let index = 0;
    while ((match = imgRe.exec(html)) !== null) {
      const alt = /alt="([^"]*)"/i.exec(match[0]);
      const blob = (alt && byName[alt[1]]) || inline[index];
      if (blob) result[match[1]] = blob;
      index++;
    }
    return result;
  }

  return Object.freeze({ findDraftBySubject, load, render });
})();
