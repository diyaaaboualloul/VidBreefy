// VidBreefy Chrome Extension - Popup Script

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

let currentFormat = 'short';
let currentResult = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserInfo();
  await getCurrentTabUrl();
  setupEventListeners();
});

async function loadUserInfo() {
  const response = await chrome.runtime.sendMessage({ type: 'checkAuth' });
  const userSection = document.getElementById('user-section');
  
  if (response.isLoggedIn && response.user) {
    userSection.innerHTML = `
      <div class="user-info">
        <span class="user-email">${response.user.email}</span>
        ${response.user.tier === 'pro' ? '<span class="pro-badge">PRO</span>' : ''}
      </div>
    `;
  } else {
    // Check daily count for guests
    const daily = await chrome.runtime.sendMessage({ type: 'getDailyCount' });
    userSection.innerHTML = `
      <div class="guest-info">
        <span>${daily.remaining} free summaries left today</span>
        <a href="http://142.132.189.59:3000/register" target="_blank" class="btn btn-secondary btn-sm">Sign Up</a>
      </div>
    `;
  }
}

async function getCurrentTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url && YOUTUBE_REGEX.test(tab.url)) {
      document.getElementById('url-input').value = tab.url;
    }
  } catch (e) {
    console.log('Could not get current tab URL');
  }
}

function setupEventListeners() {
  // Format toggle
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFormat = btn.dataset.format;
    });
  });
  
  // Summarize button
  document.getElementById('summarize-btn').addEventListener('click', handleSummarize);
}

async function handleSummarize() {
  const urlInput = document.getElementById('url-input');
  const urlError = document.getElementById('url-error');
  const btn = document.getElementById('summarize-btn');
  
  const url = urlInput.value.trim();
  
  if (!YOUTUBE_REGEX.test(url)) {
    urlError.textContent = 'Please enter a valid YouTube URL';
    return;
  }
  
  urlError.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Summarizing...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'summarize',
      data: { url, format: currentFormat }
    });
    
    if (response.success) {
      currentResult = response.data;
      showResult(response.data, url);
      
      // Increment daily count for guests
      await chrome.runtime.sendMessage({ type: 'incrementDaily' });
      await loadUserInfo();
    } else {
      urlError.textContent = response.error || 'Failed to summarize';
    }
  } catch (error) {
    urlError.textContent = error.message || 'An error occurred';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Summarize Video';
  }
}

function showResult(data, url) {
  const resultSection = document.getElementById('result-section');
  
  const videoId = extractVideoId(url);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : '';
  const sourceLabel = data.transcript_source === 'transcript' ? '📝 Transcript' : data.transcript_source === 'metadata' ? '📋 Description' : '❌ No source';
  const sourceClass = data.transcript_source === 'transcript' ? 'source-transcript' : data.transcript_source === 'metadata' ? 'source-metadata' : 'source-none';
  
  resultSection.innerHTML = `
    <div class="result">
      <div class="result-header">
        ${thumbnail ? `<img src="${thumbnail}" class="result-thumb" alt="Video">` : ''}
        <div class="result-info">
          <h4>${data.video_title || 'YouTube Video'}</h4>
          <div class="meta">
            <span>${currentFormat.toUpperCase()}</span>
            • <span>${new Date().toLocaleDateString()}</span>
            • <span class="source-badge ${sourceClass}">${sourceLabel}</span>
          </div>
        </div>
      </div>
      <div class="result-text">${data.summary}</div>
      <div class="result-actions">
        <button class="btn btn-secondary btn-sm" onclick="copySummary()">Copy</button>
        ${data.share_hash ? `<button class="btn btn-secondary btn-sm" onclick="shareSummary()">Share</button>` : ''}
      </div>
    </div>
  `;
}

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"[&\]]+)/);
  return match ? match[1] : null;
}

// Global functions for buttons
window.copySummary = async function() {
  if (currentResult?.summary) {
    await navigator.clipboard.writeText(currentResult.summary);
    alert('Copied!');
  }
};

window.shareSummary = async function() {
  if (currentResult?.shareHash) {
    const shareUrl = `http://142.132.189.59:3000/summary/${currentResult.shareHash}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Share link copied!');
  }
};