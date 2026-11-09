/**
 * State.gs
 * Persists campaign state in Document Properties.
 * Status is stored under its own key so "Stop" can flip it without
 * racing against a running batch that updates other settings.
 */

const State = (() => {
  const KEY_STATUS = 'CAMPAIGN_STATUS';
  const KEY_SETTINGS = 'CAMPAIGN_SETTINGS';

  const props = () => PropertiesService.getDocumentProperties();

  function getStatus() {
    return props().getProperty(KEY_STATUS) || STATUS.STOPPED;
  }

  function setStatus(status) {
    props().setProperty(KEY_STATUS, status);
  }

  /** @returns {{sheetId:number, sender:string, senderName:string, draftId:string, templateName:string, quotaNotified:boolean}|null} */
  function getSettings() {
    const raw = props().getProperty(KEY_SETTINGS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveSettings(settings) {
    props().setProperty(KEY_SETTINGS, JSON.stringify(settings));
  }

  function clearAll() {
    props().deleteProperty(KEY_STATUS);
    props().deleteProperty(KEY_SETTINGS);
  }

  return Object.freeze({ getStatus, setStatus, getSettings, saveSettings, clearAll });
})();
