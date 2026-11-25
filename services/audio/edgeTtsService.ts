import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DEFAULT_KOKORO_VOICE = 'af_heart';

let webTtsPromise: Promise<any> | null = null;

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

async function getWebKokoroTts(): Promise<any> {
  if (!webTtsPromise) {
    webTtsPromise = (async () => {
      const { KokoroTTS } = await import('kokoro-js');
      console.log('[KokoroTTS] Loading Kokoro-82M-v1.0-ONNX in browser...');
      return KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
      });
    })();
  }
  return webTtsPromise;
}

function getNativeTtsUrl(): string {
  const custom = process.env.EXPO_PUBLIC_VERCEL_TTS_URL?.trim();
  if (custom) return custom;
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/api/tts'
    : 'http://localhost:3001/api/tts';
}

export const edgeTtsService = {
  /**
   * Synthesizes natural neural speech via Kokoro-82M (af_heart):
   * - Web: runs 100% in-browser via kokoro-js (WebAssembly/WebGPU)
   * - Android / iOS: calls the local Kokoro TTS server (or EXPO_PUBLIC_VERCEL_TTS_URL)
   */
  async generateAndDownloadSpeech(
    text: string,
    voice?: string
  ): Promise<string | null> {
    const activeVoice = voice && voice !== 'en-US-JennyNeural' ? voice : DEFAULT_KOKORO_VOICE;

    const cleanText = text
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return null;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const tts = await getWebKokoroTts();
        const audio = await tts.generate(cleanText, { voice: activeVoice });
        const blob = audio.toBlob();
        return URL.createObjectURL(blob);
      } catch (err) {
        console.warn('[KokoroTTS] Web synthesis failed:', err);
        return null;
      }
    }

    const ttsUrl = getNativeTtsUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/wav, audio/mpeg, */*',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: activeVoice,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[KokoroTTS] Server returned ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const localUri = `${FileSystem.cacheDirectory || ''}temp_speech.wav`;

      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return localUri;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('[KokoroTTS] Failed to fetch speech audio:', err?.message || err);
      return null;
    }
  },
};
