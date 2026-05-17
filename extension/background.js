// VidBreefy Chrome Extension - Background Service Worker
// Simplified: only handles daily count tracking

const API_BASE = 'http://142.132.189.59:3001/api';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getDailyCount') {
    getDailyCount().then(count => {
      sendResponse({ count, remaining: Math.max(0, 100 - count) });
    });
    return true;
  }
});

function getDailyCount() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['vidbreefy_guest_daily'], (result) => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const stored = result.vidbreefy_guest_daily;
      if (stored && stored.date === today) {
        resolve(stored.count);
      } else {
        resolve(0);
      }
    });
  });
}