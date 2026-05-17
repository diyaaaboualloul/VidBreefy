// content.js — VidBreefy Transcript Extraction
// Method 1: ytInitialPlayerResponse from page (works for ~90% of captioned videos)
// Method 2: UI click transcript panel + read DOM (fallback for manual transcripts)
// Method 3: 3-dot menu (last resort for edge cases)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoInfo") {
    const title = document.title.replace(" - YouTube", "").trim();
    const videoId = new URLSearchParams(window.location.search).get("v");
    const channelEl = document.querySelector("#channel-name a, ytd-channel-name a, #owner #channel-name a");
    sendResponse({ title, videoId, channel: channelEl?.textContent?.trim() || "" });
    return true;
  }
  if (request.action === "getTranscript") {
    getTranscript().then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
});

async function getTranscript() {
  const title = document.title.replace(" - YouTube", "").trim();
  const videoId = new URLSearchParams(window.location.search).get("v");

  // METHOD 1: Read from page's ytInitialPlayerResponse (page-level player data)
  try {
    const transcript = await fetchFromPlayerResponse();
    if (transcript) {
      console.log('[VidBreefy] Got transcript via player response, length:', transcript.length);
      return { success: true, title, videoId, transcript };
    }
  } catch (e) {
    console.log('[VidBreefy] Method 1 failed:', e.message);
  }

  // METHOD 2: DOM if transcript panel already open
  let text = readTranscriptDOM();
  if (text) return { success: true, title, videoId, transcript: text };

  // Click "Show transcript" button (handles manually uploaded transcripts)
  const expandBtn = document.querySelector("tp-yt-paper-button#expand, #expand, ytd-text-inline-expander #expand");
  if (expandBtn) { expandBtn.click(); await sleep(400); }

  const allButtons = document.querySelectorAll("button, tp-yt-paper-button, yt-button-shape button, ytd-button-renderer button");
  for (const btn of allButtons) {
    const txt = (btn.textContent || btn.getAttribute("aria-label") || "").toLowerCase().trim();
    if (txt.includes("transcript")) {
      btn.click();
      await sleep(1500);
      text = readTranscriptDOM();
      if (text) return { success: true, title, videoId, transcript: text };
      break;
    }
  }

  // METHOD 3: 3-dot menu fallback
  const menuBtns = document.querySelectorAll('#button-shape button, ytd-menu-renderer #button, button[aria-label*="more" i], button[aria-label*="actions" i]');
  for (const btn of menuBtns) {
    btn.click();
    await sleep(600);
    const items = document.querySelectorAll("ytd-menu-service-item-renderer, tp-yt-paper-item, yt-formatted-string");
    for (const item of items) {
      if (item.textContent?.toLowerCase().includes("transcript")) {
        item.click();
        await sleep(1800);
        text = readTranscriptDOM();
        if (text) return { success: true, title, videoId, transcript: text };
        break;
      }
    }
    document.body.click();
    await sleep(200);
  }

  throw new Error("Could not find transcript. Make sure the video has captions — look for the 'CC' button in the YouTube player.");
}

// Method 1: Read transcript from YouTube's ytInitialPlayerResponse stored in the page
async function fetchFromPlayerResponse() {
  // Find ytInitialPlayerResponse from page HTML
  const html = document.documentElement.innerHTML;
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/s);
  if (!match) {
    // Try alternate pattern used in newer YouTube
    const altMatch = html.match(/"captions":\s*"([^"]+)"/);
    return null;
  }

  let playerResponse;
  try {
    playerResponse = JSON.parse(match[1]);
  } catch (e) {
    return null;
  }

  const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || !captions.length) return null;

  // Find a track with a working baseUrl
  for (const track of captions) {
    const baseUrl = track?.baseUrl;
    if (!baseUrl) continue;

    try {
      const res = await fetch(baseUrl, { credentials: 'include' });
      if (!res.ok) continue;
      const xml = await res.text();
      const text = parseTimedtextXML(xml);
      if (text && text.length > 50) return text;
    } catch (e) {
      continue;
    }
  }

  return null;
}

// Parse YouTube timedtext XML into plain text
function parseTimedtextXML(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const texts = doc.querySelectorAll('text');
  if (!texts.length) return null;

  const lines = [];
  for (const t of texts) {
    let txt = t.textContent?.trim();
    if (txt) lines.push(txt);
  }
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

function readTranscriptDOM() {
  const sel = "ytd-transcript-segment-renderer .segment-text";
  const els = document.querySelectorAll(sel);
  if (els.length > 2) {
    const text = Array.from(els).map(e => e.textContent.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 50) return text;
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }