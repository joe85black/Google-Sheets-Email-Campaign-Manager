/**
 * Validation.gs
 * Input validation and output encoding (OWASP: validate input, encode output).
 */

const Validation = (() => {
  // Pragmatic RFC 5322 subset. Rejects commas, semicolons, spaces and angle
  // brackets, so a single cell can never expand into multiple recipients.
  const EMAIL_RE =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

  const HTML_ENTITIES = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });

  function normalizeEmail(value) {
    return String(value == null ? '' : value).trim();
  }

  function isValidEmail(value) {
    return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
  }

  /** Strips control characters (incl. CR/LF, preventing header injection) and caps length. */
  function cleanText(value, maxLength) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
  }

  /**
   * Sender display name: non-empty, length-capped, and free of characters that
   * could make it look like (or inject) a different address in the From header.
   */
  function isValidDisplayName(value) {
    return (
      typeof value === 'string' &&
      value.length > 0 &&
      value.length <= CONFIG.MAX_SENDER_NAME_LENGTH &&
      !/[<>"@\\]/.test(value)
    );
  }

  return Object.freeze({ normalizeEmail, isValidEmail, cleanText, escapeHtml, isValidDisplayName });
})();
