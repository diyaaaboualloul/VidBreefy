// Transcript Extraction Service
// Chain: youtube-transcript-api -> YouTube Data API v3 -> yt-dlp

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Fetch transcript using youtube-transcript-api
async function fetchWithYoutubeTranscriptApi(videoId) {
  console.log(`[Transcript] Trying youtube-transcript-api for ${videoId}...`);
  
  try {
    const { execSync } = require('child_process');
    const result = execSync(`python3 -c "
from youtube_transcript_api import YouTubeTranscriptApi
transcript = YouTubeTranscriptApi.get_transcript('${videoId}', languages=['en'])
text = ' '.join([t['text'] for t in transcript])
print(text)
"`, { timeout: 30000 });
    
    const transcript = result.toString().trim();
    if (transcript) {
      console.log(`[Transcript] Success from youtube-transcript-api, ${transcript.length} chars`);
      return transcript;
    }
  } catch (error) {
    console.log(`[Transcript] youtube-transcript-api failed: ${error.message}`);
  }
  
  return null;
}

// Fetch video metadata using YouTube Data API v3
async function fetchWithYouTubeDataAPI(videoId, apiKey) {
  if (!apiKey) {
    console.log('[Transcript] No YouTube Data API key configured');
    return null;
  }
  
  console.log(`[Transcript] Trying YouTube Data API v3 for ${videoId}...`);
  
  return new Promise((resolve) => {
    const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.items && json.items.length > 0) {
            // We can get caption URL from the API response
            console.log(`[Transcript] YouTube Data API returned ${json.items.length} captions`);
          }
        } catch (e) {
          console.log(`[Transcript] YouTube Data API parse error: ${e.message}`);
        }
        resolve(null);
      });
    }).on('error', (err) => {
      console.log(`[Transcript] YouTube Data API error: ${err.message}`);
      resolve(null);
    });
  });
}

// Fetch transcript using yt-dlp
async function fetchWithYtDlp(videoId) {
  console.log(`[Transcript] Trying yt-dlp for ${videoId}...`);
  
  try {
    const result = execSync(`yt-dlp --skip-download --write-auto-sub --sub-lang en --output - "https://www.youtube.com/watch?v=${videoId}" 2>&1 || true`, { 
      timeout: 60000,
      encoding: 'utf8'
    });
    
    // Try to extract the subtitle file
    const files = result.match(/\[download\] Saving "[^"]+"/g);
    if (files && files.length > 0) {
      const filename = files[0].match(/\[download\] Saving "([^"]+)"/)[1];
      // Read the file content
      try {
        const { readFileSync } = require('fs');
        const content = readFileSync(filename, 'utf8');
        // Parse VTT format
        const lines = content.split('\n');
        let transcript = '';
        for (const line of lines) {
          if (line.includes('-->') || line.startsWith('WEBVTT')) continue;
          if (/^\d+$/.test(line.trim())) continue;
          transcript += line.trim() + ' ';
        }
        if (transcript.trim()) {
          console.log(`[Transcript] Success from yt-dlp, ${transcript.trim().length} chars`);
          return transcript.trim();
        }
      } catch (e) {
        // File read failed
      }
    }
    
    console.log(`[Transcript] yt-dlp output: ${result.substring(0, 200)}`);
  } catch (error) {
    console.log(`[Transcript] yt-dlp failed: ${error.message}`);
  }
  
  return null;
}

// Main function to extract transcript
async function extractTranscript(videoUrlOrId) {
  console.log(`[Transcript] Starting extraction for: ${videoUrlOrId}`);
  
  const videoId = extractVideoId(videoUrlOrId) || videoUrlOrId;
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL or video ID');
  }
  
  console.log(`[Transcript] Extracted video ID: ${videoId}`);
  
  // Method 1: youtube-transcript-api (preferred for speed)
  let transcript = await fetchWithYoutubeTranscriptApi(videoId);
  if (transcript) return transcript;
  
  // Method 2: YouTube Data API v3
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (apiKey) {
    await fetchWithYouTubeDataAPI(videoId, apiKey);
  }
  
  // Method 3: yt-dlp (most reliable but slower)
  transcript = await fetchWithYtDlp(videoId);
  if (transcript) return transcript;
  
  // If all methods fail, throw error
  throw new Error('Could not extract transcript. Video may not have captions or be unavailable.');
}

module.exports = { extractTranscript, extractVideoId };