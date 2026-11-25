import http from 'node:http';
import { KokoroTTS } from 'kokoro-js';

const PORT = Number(process.env.PORT || 3001);
const DEFAULT_VOICE = 'af_heart';

console.log('[KokoroTTS] Loading Kokoro-82M-v1.0-ONNX (q8)...');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
  dtype: 'q8',
});
console.log('[KokoroTTS] Model ready!');

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/tts') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const text = (body.text || '').trim();
    const voice = body.voice || DEFAULT_VOICE;

    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing text' }));
      return;
    }

    const audio = await tts.generate(text, { voice });
    const wavBuffer = Buffer.from(audio.toWav());
    res.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Content-Length': wavBuffer.length,
    });
    res.end(wavBuffer);
  } catch (err) {
    console.error('[KokoroTTS] Synthesis error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Synthesis failed' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[KokoroTTS] Listening on http://0.0.0.0:${PORT}/api/tts`);
});
