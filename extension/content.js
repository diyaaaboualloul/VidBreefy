// content.js — VidBreefy Transcript Extraction (UI-interaction method)
// Works for both auto-generated AND manually-uploaded YouTube transcripts

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

  // Step 1: transcript already open — read from DOM directly
  let text = readTranscriptDOM();
  if (text) return { success: true, title, videoId, transcript: text };

  // Step 2: expand description if collapsed, then look for transcript button
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

  // Step 3: try 3-dot menu (more actions button)
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