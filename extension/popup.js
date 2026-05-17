// popup.js — VidBreefy Extension

const API_BASE = 'http://142.132.189.59:3001/api';
const $ = (id) => document.getElementById(id);

let currentTranscript = null;
let currentTitle = "";
let currentVideoId = null;
let currentChannel = "";
let isYouTubeVideo = false;
let transcriptSource = 'transcript';

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  showScreen("main");
  await loadVideoInfo();
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(`${name}-screen`).classList.add("active");
}

// ─── Load Video Info ───────────────────────────────────────────────────────────
async function loadVideoInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes("youtube.com/watch")) {
    $("videoCard").classList.add("hidden");
    $("notYoutube").classList.remove("hidden");
    setActionBtnsEnabled(false);
    isYouTubeVideo = false;
    return;
  }

  isYouTubeVideo = true;
  $("notYoutube").classList.add("hidden");
  $("videoCard").classList.remove("hidden");
  setActionBtnsEnabled(true);

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (_) {}

  await new Promise((r) => setTimeout(r, 150));

  try {
    const info = await chrome.tabs.sendMessage(tab.id, { action: "getVideoInfo" });
    if (info) {
      $("videoTitle").textContent = info.title || "YouTube Video";
      $("videoChannel").textContent = info.channel || "";
      currentTitle = info.title || "YouTube Video";
      currentVideoId = info.videoId;
      currentChannel = info.channel || "";
    }
  } catch (e) {
    $("videoTitle").textContent = tab.title?.replace(" - YouTube", "") || "YouTube Video";
    currentTitle = $("videoTitle").textContent;
    currentChannel = "";
  }
}

function setActionBtnsEnabled(enabled) {
  [$("summarizeBtn"), $("keyPointsBtn"), $("topicsBtn"), $("askBtn"), $("questionInput")].forEach(
    (el) => { if (el) el.disabled = !enabled; }
  );
}

// ─── Transcript ──────────────────────────────────────────────────────────────
async function ensureTranscript() {
  if (currentTranscript) return currentTranscript;

  showLoading("Fetching transcript…");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await new Promise((r) => setTimeout(r, 150));
  } catch (_) {}

  const result = await chrome.tabs.sendMessage(tab.id, { action: "getTranscript" });

  if (!result?.success || !result?.transcript) {
    throw new Error(result?.error || "Could not find transcript for this video.");
  }

  currentTranscript = result.transcript;
  transcriptSource = 'transcript';
  return currentTranscript;
}

// ─── Backend API ──────────────────────────────────────────────────────────────
async function callBackend(action, transcript, question) {
  const body = question
    ? { action, question, videoTitle: currentTitle, isGuest: true }
    : { action, transcript: transcript.slice(0, 12000), videoTitle: currentTitle, isGuest: true };

  const response = await fetch(`${API_BASE}/ai/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error ${response.status}`);
  }
  return response;
}

// ─── Streaming Output ───────────────────────────────────────────────────────
async function streamResult(response, labelText) {
  const area = $("resultArea");
  const label = $("resultLabel");
  const content = $("resultContent");
  const copyBtn = $("copyBtn");
  const badge = $("sourceBadge");

  area.classList.remove("hidden");
  badge.classList.remove("hidden");
  badge.className = `source-badge ${transcriptSource}`;
  badge.textContent = transcriptSource === 'transcript' ? '📝 Transcript' : '❌ No source';
  label.textContent = labelText;
  content.innerHTML = '<span class="cursor"></span>';
  copyBtn.classList.add("hidden");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          content.innerHTML = formatMarkdown(fullText) + '<span class="cursor"></span>';
          area.scrollTop = area.scrollHeight;
        }
      } catch (_) {}
    }
  }

  content.innerHTML = formatMarkdown(fullText);
  copyBtn.classList.remove("hidden");
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(fullText).then(() => {
      copyBtn.textContent = "✓ Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => { copyBtn.textContent = "⎘ Copy"; copyBtn.classList.remove("copied"); }, 1800);
    });
  };

  return fullText;
}

function showLoading(msg) {
  const area = $("resultArea");
  const content = $("resultContent");
  area.classList.remove("hidden");
  $("sourceBadge").classList.add("hidden");
  $("copyBtn").classList.add("hidden");
  content.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><span>${msg}</span></div>`;
}

function showError(msg) {
  const area = $("resultArea");
  const content = $("resultContent");
  area.classList.remove("hidden");
  $("sourceBadge").classList.add("hidden");
  $("resultLabel").textContent = "Error";
  content.innerHTML = `<div class="error-msg">⚠ ${escHtml(msg)}</div>`;
  $("copyBtn").classList.remove("hidden");
  $("copyBtn").onclick = () => navigator.clipboard.writeText(msg);
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatMarkdown(text) {
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/^### (.+)$/gm, '<div class="section-title">$1</div>');
  text = text.replace(/^## (.+)$/gm, '<div class="section-title">$1</div>');
  text = text.replace(/^[-•*] (.+)$/gm, '<div class="bullet-item">$1</div>');
  text = text.replace(/^\d+\. (.+)$/gm, '<div class="bullet-item">$1</div>');
  text = text.replace(/\n\n/g, '</p><p style="margin-top:8px">');
  text = text.replace(/\n/g, "<br/>");
  return text;
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function runAction(type, labelText, userTemplate) {
  if (!isYouTubeVideo) return;
  disableButtons(true);
  currentTranscript = null;
  transcriptSource = 'transcript';
  try {
    const transcript = await ensureTranscript();
    const userMessage = userTemplate.replace("{{title}}", currentTitle).replace("{{transcript}}", transcript);
    const response = await callBackend(type, transcript, null);
    await streamResult(response, labelText);
  } catch (e) {
    showError(e.message);
  } finally {
    disableButtons(false);
  }
}

$("summarizeBtn").addEventListener("click", async () => {
  await runAction(
    "summarize", "✦ Summary",
    `Video: "{{title}}"\n\nTranscript:\n{{transcript}}\n\nProvide:\n**What This Video Is About**\n2-3 sentence overview.\n\n**Key Points**\n4-5 most important things.\n\n**Who Should Watch**\nWho benefits most.\n\n**Tone & Style**\nBrief note on the presenter's approach.`
  );
});

$("keyPointsBtn").addEventListener("click", async () => {
  await runAction(
    "key_points", "◈ Key Points",
    `Video: "{{title}}"\n\nTranscript:\n{{transcript}}\n\nList the 7-10 most important key points, facts, or takeaways. Format as bullet points with **bold** for key terms. Be specific.`
  );
});

$("topicsBtn").addEventListener("click", async () => {
  await runAction(
    "topics", "◎ Topics & Structure",
    `Video: "{{title}}"\n\nTranscript:\n{{transcript}}\n\nAnalyze and provide:\n**Main Topics Covered**\n**Timeline Structure**\n**Key Concepts & Terms**\n**Sentiment & Bias**`
  );
});

// ─── Ask ────────────────────────────────────────────────────────────────────────
$("askBtn").addEventListener("click", handleAsk);
$("questionInput").addEventListener("keydown", (e) => { if (e.key === "Enter") handleAsk(); });

async function handleAsk() {
  const question = $("questionInput").value.trim();
  if (!question || !isYouTubeVideo) return;
  disableButtons(true);
  currentTranscript = null;
  transcriptSource = 'transcript';
  $("resultLabel").textContent = `❓ ${question.slice(0, 40)}${question.length > 40 ? "…" : ""}`;
  try {
    const transcript = await ensureTranscript();
    const response = await callBackend("ask", transcript, question);
    await streamResult(response, `❓ ${question.slice(0, 40)}${question.length > 40 ? "…" : ""}`);
    $("questionInput").value = "";
  } catch (e) {
    showError(e.message);
  } finally {
    disableButtons(false);
  }
}

function disableButtons(state) {
  [$("summarizeBtn"), $("keyPointsBtn"), $("topicsBtn"), $("askBtn")].forEach(
    (btn) => (btn.disabled = state)
  );
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();