/**
 * Menu.gs
 * Adds the "Campaign" menu when the spreadsheet opens.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(CONFIG.MENU_NAME)
    .addItem('Start campaign', 'startCampaign')
    .addItem('Stop campaign', 'stopCampaign')
    .addSeparator()
    .addItem('Clear campaign', 'clearCampaign')
    .addToUi();
}
