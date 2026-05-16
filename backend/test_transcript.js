const TranscriptClient = require('youtube-transcript-api');

console.log('Starting...');
const client = new TranscriptClient();
let settled = false;
let startTime = Date.now();

client.ready
  .then(async () => {
    console.log('Client ready after', Date.now() - startTime, 'ms');
    try {
      const result = await client.getTranscript('dQw4w9WgXcQ', { timeout: 20000 });
      console.log('SUCCESS! Title:', result.title);
      console.log('Languages:', result.languages);
      console.log('Tracks:', result.tracks?.length);
    } catch (e) {
      console.log('getTranscript error:', e.message);
    }
    settled = true;
  })
  .catch(e => {
    console.log('Ready rejected:', e.message);
    settled = true;
  });

setTimeout(() => {
  if (!settled) {
    console.log('Still waiting after 60s...');
  }
}, 60000);