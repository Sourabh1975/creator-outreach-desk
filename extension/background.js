// Creator Desk WhatsApp Auto-Sender Background Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "close_tab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {});
  }
});
