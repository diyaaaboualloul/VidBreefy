// VidBreefy Chrome Extension - Background Service Worker

const API_BASE = 'http://142.132.189.59:3001/api';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'summarize') {
    handleSummarize(message.data)
      .then(response => {
        console.log('[VidBreefy BG] Summarize success, keys:', Object.keys(response));
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('[VidBreefy BG] Summarize error:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'checkAuth') {
    chrome.storage.local.get(['vidbreefy_token', 'vidbreefy_user'], (result) => {
      sendResponse({
        isLoggedIn: !!result.vidbreefy_token,
        user: result.vidbreefy_user
      });
    });
    return true;
  }

  if (message.type === 'setAuth') {
    chrome.storage.local.set({
      vidbreefy_token: message.token,
      vidbreefy_user: message.user
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'clearAuth') {
    chrome.storage.local.remove(['vidbreefy_token', 'vidbreefy_user'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'getDailyCount') {
    getDailyCount().then(count => {
      sendResponse({ count, remaining: Math.max(0, 100 - count) });
    });
    return true;
  }

  if (message.type === 'incrementDaily') {
    incrementDaily().then(() => sendResponse({ success: true }));
    return true;
  }
});

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['vidbreefy_token'], (result) => {
      resolve(result.vidbreefy_token);
    });
  });
}

async function handleSummarize({ url, format }) {
  const token = await getToken();
  const isGuest = !token;

  console.log('[VidBreefy BG] handleSummarize called, url:', url, '| has token:', !!token);

  // Check daily limit for guests
  if (isGuest) {
    const daily = await getDailyCount();
    if (daily >= 100) {
      throw new Error('Daily limit reached (100/day). Sign up for unlimited summaries.');
    }
  }

  // Get transcript from content script if available
  let transcriptText = null;
  try {
    const transcriptResponse = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          console.log('[VidBreefy BG] Querying tab', tabs[0].id, 'for transcript');
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_TRANSCRIPT' }, (response) => {
            console.log('[VidBreefy BG] Transcript response:', response);
            resolve(response);
          });
        } else {
          resolve(null);
        }
      });
    });
    if (transcriptResponse?.transcript) {
      transcriptText = transcriptResponse.transcript;
      console.log('[VidBreefy BG] Got transcript from content script:', transcriptText.length, 'chars');
    } else {
      console.log('[VidBreefy BG] No transcript from content script:', transcriptResponse?.error || 'null');
    }
  } catch (e) {
    console.log('[VidBreefy BG] Could not extract transcript:', e.message);
  }

  console.log('[VidBreefy BG] Posting to', `${API_BASE}/summaries`, 'with token:', !!token);

  const response = await fetch(`${API_BASE}/summaries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',  // Important: include cookies!
    body: JSON.stringify({ url, format, transcript: transcriptText })
  });

  console.log('[VidBreefy BG] Response status:', response.status);

  console.log('[VidBreefy BG] Response status:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error', status: response.status }));
    console.error('[VidBreefy BG] API error:', error);
    throw new Error(error.message || `Failed to summarize (${response.status})`);
  }

  const data = await response.json();
  console.log('[VidBreefy BG] Success, summary length:', data.summary?.length || 0);
  return data;
}

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

function incrementDaily() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['vidbreefy_guest_daily'], (result) => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const stored = result.vidbreefy_guest_daily;

      let count = 0;
      if (stored && stored.date === today) {
        count = stored.count;
      }

      chrome.storage.local.set({
        vidbreefy_guest_daily: { date: today, count: count + 1 }
      }, resolve);
    });
  });
}