import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { CONFIG } from '../../constants/config';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const HARDCODED_EDGE_VOICE = 'en-US-JennyNeural';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const SEC_MS_GEC_VERSION = '1-130.0.2849.68';
const EDGE_TTS_WSS_URL =
  `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

function sha256Hex(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result.toUpperCase();
}

function generateSecMsGec(): string {
  const WIN_EPOCH = 11644473600;
  let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH;
  ticks -= ticks % 300;
  const ticks100ns = BigInt(ticks) * BigInt(10000000);
  return sha256Hex(`${ticks100ns.toString()}${TRUSTED_CLIENT_TOKEN}`);
}

function generateHexId(): string {
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Pure TypeScript helper to convert an ArrayBuffer to a base64 string
 * without external dependencies or Node Buffer references.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let base64 = '';
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    base64 += B64_CHARS[b0 >> 2];
    base64 += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return base64;
}

function synthesizeViaWebSocket(text: string, voice: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const connectionId = generateHexId();
    const requestId = generateHexId();
    const secMsGec = generateSecMsGec();
    const ws = new WebSocket(
      `${EDGE_TTS_WSS_URL}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`
    );
    ws.binaryType = 'arraybuffer';

    const chunks: Uint8Array[] = [];
    let settled = false;

    const finish = (result: Uint8Array | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        ws.close();
      } catch (_) {}
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      console.warn('[EdgeTTS] WebSocket synthesis timed out after 12s.');
      finish(null);
    }, 12000);

    ws.onopen = () => {
      const timestamp = new Date().toISOString();
      const configMsg =
        `X-Timestamp:${timestamp}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(configMsg);

      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'>` +
        `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escapeXml(text)}</prosody>` +
        `</voice></speak>`;

      const ssmlMsg =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;
      ws.send(ssmlMsg);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) {
          if (chunks.length === 0) {
            finish(null);
            return;
          }
          const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          finish(merged);
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        if (event.data.byteLength < 2) return;
        const headerLen = view.getUint16(0, false);
        const headerEnd = 2 + headerLen;
        if (headerEnd > event.data.byteLength) return;

        const headerBytes = new Uint8Array(event.data, 2, headerLen);
        let headerStr = '';
        for (let i = 0; i < headerBytes.length; i++) {
          headerStr += String.fromCharCode(headerBytes[i]);
        }

        if (headerStr.includes('Path:audio') && event.data.byteLength > headerEnd) {
          chunks.push(new Uint8Array(event.data, headerEnd));
        }
      }
    };

    ws.onerror = (err) => {
      console.warn('[EdgeTTS] WebSocket error:', err);
      finish(null);
    };

    ws.onclose = () => {
      if (!settled) {
        finish(null);
      }
    };
  });
}

export const edgeTtsService = {
  /**
   * Synthesizes natural neural speech via Microsoft Edge TTS (en-US-JennyNeural),
   * saves/creates a playable URI, and returns it.
   */
  async generateAndDownloadSpeech(
    text: string,
    voice?: string
  ): Promise<string | null> {
    const activeVoice = voice || HARDCODED_EDGE_VOICE;

    // Strip emojis so TTS synthesis remains clinical and calming
    const cleanText = text
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return null;
    }

    // Try custom Vercel TTS URL only if explicitly overridden via env
    const customTtsUrl = process.env.EXPO_PUBLIC_VERCEL_TTS_URL?.trim();
    if (customTtsUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(customTtsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg, audio/mp3, application/json, */*',
          },
          body: JSON.stringify({ text: cleanText, voice: activeVoice }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
          }
          const arrayBuffer = await response.arrayBuffer();
          const base64Data = arrayBufferToBase64(arrayBuffer);
          const localUri = `${FileSystem.cacheDirectory || ''}temp_speech.mp3`;
          await FileSystem.writeAsStringAsync(localUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return localUri;
        }
      } catch (_) {
        // Fall through to direct Edge TTS WebSocket
      }
    }

    console.log(`[EdgeTTS] Synthesizing neural speech (${activeVoice}): "${cleanText.slice(0, 40)}..."`);
    const audioBytes = await synthesizeViaWebSocket(cleanText, activeVoice);
    if (!audioBytes) {
      return null;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([audioBytes.buffer as ArrayBuffer], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    }

    const base64Data = arrayBufferToBase64(audioBytes.buffer as ArrayBuffer);
    const localUri = `${FileSystem.cacheDirectory || ''}temp_speech.mp3`;
    await FileSystem.writeAsStringAsync(localUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`[EdgeTTS] Cached neural speech to: ${localUri}`);
    return localUri;
  },
};
