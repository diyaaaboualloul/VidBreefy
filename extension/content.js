// VidBreefy Content Script - runs on YouTube pages
// Extracts transcript using multiple methods

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TRANSCRIPT') {
    console.log('[VidBreefy Content] GET_TRANSCRIPT received, URL:', window.location.href);
    extractTranscript()
      .then(result => {
        console.log('[VidBreefy Content] Success, transcript length:', result?.length || 0);
        sendResponse({ success: true, transcript: result });
      })
      .catch(error => {
        console.log('[VidBreefy Content] Failed:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function extractTranscript() {
  // Try method 1: Direct timedtext API (no CORS from YouTube origin)
  try {
    const result = await tryTimedtextAPI();
    if (result) return result;
  } catch (e) {
    console.log('[VidBreefy Content] Method 1 failed:', e.message);
  }

  // Try method 2: Read from DOM if transcript panel is open
  try {
    const result = scanForTranscriptInDOM();
    if (result) return result;
  } catch (e) {
    console.log('[VidBreefy Content] Method 2 failed:', e.message);
  }

  // Try method 3: Try to open transcript panel and read
  try {
    const result = await tryOpenTranscriptPanel();
    if (result) return result;
  } catch (e) {
    console.log('[VidBreefy Content] Method 3 failed:', e.message);
  }

  throw new Error('No transcript found');
}

// Method 1: YouTube's timedtext API (captions stored on Google's servers)
async function tryTimedtextAPI() {
  const videoId = new URL(window.location.href).searchParams.get('v');
  if (!videoId) return null;

  // YouTube's timedtext API - works for auto-generated and uploaded captions
  // Try en (English) first, then default
  const langs = ['en', 'en-US', 'en-GB'];
  const TIMEDTEXT_URL = 'https://www.youtube.com/api/timedtext';

  for (const lang of langs) {
    try {
      const url = `${TIMEDTEXT_URL}?v=${videoId}&lang=${lang}&fmt=json3`;
      console.log('[VidBreefy Content] Trying timedtext API:', url);
      const response = await fetch(url, {
        credentials: 'include',
        mode: 'cors'
      });
      if (response.ok) {
        const text = await response.text();
        if (text && text.includes('transcriptSegmentListRenderer')) {
          const segments = extractSegmentsFromTimedtext(text);
          if (segments && segments.length > 10) {
            console.log('[VidBreefy Content] Got', segments.length, 'segments via timedtext API');
            return segments;
          }
        }
      }
    } catch (e) {
      console.log('[VidBreefy Content] timedtext', lang, 'failed:', e.message);
    }
  }

  return null;
}

// Extract transcript segments from YouTube's timedtext JSON3 format
function extractSegmentsFromTimedtext(text) {
  try {
    const data = JSON.parse(text);
    const segments = data?.transcriptSegmentListRenderer?.segments;
    if (!segments || !Array.isArray(segments)) return null;

    const texts = [];
    for (const seg of segments) {
      if (seg?.transcriptSegmentRenderer?.snippet?.simpleText) {
        texts.push(seg.transcriptSegmentRenderer.snippet.simpleText);
      } else if (seg?.transcriptSegmentRenderer?.snippet?.runs) {
        // Some segments use runs (rich text) instead of simpleText
        const runText = seg.transcriptSegmentRenderer.snippet.runs
          .map(r => r.string).join('');
        if (runText) texts.push(runText);
      }
    }

    return texts.length > 10 ? texts.join(' ') : null;
  } catch (e) {
    return null;
  }
}

// Method 2: Scan DOM for already-open transcript panel
function scanForTranscriptInDOM() {
  // Look for the transcript body content
  const transcriptBody = document.querySelector('ytd-transcript-body-renderer, yt-transcript-body-renderer, .transcript-body, [class*="transcript-body"]');
  if (transcriptBody) {
    const text = transcriptBody.textContent?.trim();
    if (text && text.length > 100) {
      // Filter out timestamps
      const lines = text.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 5 && !/^\d{1,2}:\d{2}/.test(trimmed) && !/^\d{1,2}:\d{2}:\d{2}/.test(trimmed);
      });
      if (lines.length > 5) {
        return lines.join(' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  // Try reading yt-transcript-segment-list-renderer directly
  const segmentList = document.querySelector('yt-transcript-segment-list-renderer, ytd-transcript-segment-list-renderer');
  if (segmentList) {
    const segments = segmentList.querySelectorAll('yt-formatted-string, [class*="segment-text"]');
    if (segments.length > 0) {
      const texts = Array.from(segments).map(s => s.textContent.trim()).filter(t => t.length > 0);
      if (texts.length > 10) {
        return texts.join(' ');
      }
    }
  }

  return null;
}

// Method 3: Click "Show transcript" button and read the panel
async function tryOpenTranscriptPanel() {
  // First, try to find and click the transcript button in the menu
  const menuButtons = document.querySelectorAll('button[aria-label*="transcript" i], ytd-menu-service-item-renderer');

  // Look for transcript in overflow menu
  const moreMenuBtn = document.querySelector('button[aria-label="More actions"], yt-icon-button#avatar-btn + yt-button-renderer button');
  if (moreMenuBtn) {
    moreMenuBtn.click();
    await sleep(800);

    // Now look in the menu that appeared
    const menuItems = document.querySelectorAll('tp-yt-paper-item, ytd-menu-service-item-renderer, ytd-menu-item-renderer');
    for (const item of menuItems) {
      const text = item.textContent?.toLowerCase() || '';
      if (text.includes('transcript') && !text.includes('generate')) {
        item.click();
        await sleep(1500);
        const result = scanForTranscriptInDOM();
        if (result) return result;
      }
    }

    // Click elsewhere to close menu
    document.body.click();
  }

  // Try direct transcript button (bottom right of video)
  const directBtn = document.querySelector('button[aria-label="Show transcript"], button[aria-label="Open transcript"], #transcript-button');
  if (directBtn && directBtn.offsetHeight > 0) {
    directBtn.click();
    await sleep(2000);
    const result = scanForTranscriptInDOM();
    if (result) return result;
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}