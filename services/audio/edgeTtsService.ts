import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { CONFIG } from '../../constants/config';
import { useAppStore } from '../../store/useAppStore';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

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

export const edgeTtsService = {
  /**
   * Sends text to the Vercel Edge TTS serverless function, downloads the resulting
   * audio buffer to the local cache directory, and returns the local file URI.
   *
   * @param text The conversational reply to speak.
   * @param voice Optional voice identifier (defaults to calming "en-US-AriaNeural").
   * @returns Local file URI (e.g. file:///.../temp_speech.mp3) or null on failure.
   */
  async generateAndDownloadSpeech(
    text: string,
    voice?: string
  ): Promise<string | null> {
    const ttsUrl = CONFIG.vercelTtsUrl;
    if (!ttsUrl) {
      console.warn('[EdgeTTS] EXPO_PUBLIC_VERCEL_TTS_URL is not configured.');
      return null;
    }

    const storeVoice = useAppStore.getState().settings.voice?.selectedVoice;
    // Resolve female voice from store or default to AriaNeural
    const activeVoice =
      voice && voice !== 'default'
        ? voice
        : storeVoice && storeVoice.includes('Neural')
        ? storeVoice
        : 'en-US-AriaNeural';

    // Strip emojis so TTS synthesis remains clinical and calming
    const cleanText = text
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return null;
    }

    // 10-12s timeout to gracefully abort before Vercel serverless functions time out
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      console.log(`[EdgeTTS] Requesting neural speech (${activeVoice}): "${cleanText.slice(0, 40)}..."`);
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg, audio/mp3, application/json, */*',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: activeVoice,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[EdgeTTS] Vercel TTS API returned status ${response.status}: ${response.statusText}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || '';

      // Handle JSON response containing base64 audio payload or audio URL
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.audio) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            return `data:audio/mp3;base64,${json.audio}`;
          }
          const cacheDir = FileSystem.cacheDirectory || '';
          const localUri = `${cacheDir}temp_speech.mp3`;
          await FileSystem.writeAsStringAsync(localUri, json.audio, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return localUri;
        }
        if (json.audioUrl) {
          return json.audioUrl;
        }
      }

      // Handle binary audio buffer (audio/mpeg / audio/mp3 / application/octet-stream)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }

      // Mobile native filesystem storage
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const cacheDir = FileSystem.cacheDirectory || '';
      const localUri = `${cacheDir}temp_speech.mp3`;

      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`[EdgeTTS] Successfully cached neural speech to: ${localUri}`);
      return localUri;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn('[EdgeTTS] Speech generation timed out after 12s.');
      } else {
        console.warn('[EdgeTTS] Failed to fetch or download speech audio:', err);
      }
      return null;
    }
  },
};
