import { Platform } from 'react-native';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { useAppStore } from '../../store/useAppStore';

export interface GeminiLiveCallbacks {
  onAudioReceived?: (pcm24kHzChunk: ArrayBuffer) => void;
  onTranscriptReceived?: (text: string, role: 'user' | 'model') => void;
  onInterrupted?: () => void;
  onStateChanged?: (state: 'connecting' | 'connected' | 'error' | 'disconnected') => void;
}

// ─── Session singletons ───────────────────────────────────────────────────────
let liveWs: WebSocket | null = null;
let speechSessionActive = false;
let isSpeakingResponse = false;
let vadTimeout: any = null;
let simulatedPlaybackInterval: any = null;
let simulatedRecognitionTimeout: any = null;
let recognitionInstance: any = null;
let activeUtterance: any = null;
let speechWatchdogTimeout: any = null;
let activeConversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

const LIVE_WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const LIVE_SYSTEM_PROMPT =
  'You are HavenlyAI, a warm, supportive, and concise companion in a live voice call. ' +
  'Respond in 1-2 short, natural sentences. Be empathetic and present. Never use markdown.';

const simulatedUserPrompts = [
  "Hi, I've been feeling pretty stressed out today.",
  "Yeah, it feels like I have so much to do and not enough time.",
  "I'm applying to dozens of jobs but getting no responses, it's exhausting.",
  "Thanks, just talking about it makes it feel a bit lighter.",
  "I think I'll try to take a short break now.",
];
let simulatedPromptIndex = 0;

export const geminiLiveService = {
  callbacks: {} as GeminiLiveCallbacks,

  setCallbacks(callbacks: GeminiLiveCallbacks) {
    this.callbacks = callbacks;
  },

  async connect(_wsUrl: string, _token: string): Promise<void> {
    speechSessionActive = true;
    activeConversationHistory = [];
    isSpeakingResponse = false;

    this.callbacks.onStateChanged?.('connecting');
    await new Promise(resolve => setTimeout(resolve, 400));
    this.callbacks.onStateChanged?.('connected');
    console.log('Gemini Live: Connection initialized.');

    // ponytail: Live API models only output AUDIO (not TEXT) — can't decode PCM on RN without
    // native libs. STT+REST+TTS pipeline works reliably and produces real AI responses.
    this.startSpeechRecognitionLoop();
  },

  connectLiveWebSocket(): void {
    const url = `${LIVE_WS_BASE}?key=${CONFIG.geminiApiKey}`;
    try {
      liveWs = new WebSocket(url);
    } catch (err) {
      console.error('Gemini Live WS: Failed to open:', err);
      this.startSpeechRecognitionLoop();
      return;
    }

    liveWs.onopen = () => {
      console.log('Gemini Live WS: Connected. Sending setup...');
      liveWs!.send(JSON.stringify({
        setup: {
          model: `models/${AI_CONFIG.liveModel}`,
          generationConfig: { responseModalities: ['TEXT'] },
          systemInstruction: { parts: [{ text: LIVE_SYSTEM_PROMPT }] },
        },
      }));
    };

    liveWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.setupComplete) {
          console.log('Gemini Live WS: Setup complete, starting mic.');
          this.startSpeechRecognitionLoop();
          return;
        }
        const parts = msg.serverContent?.modelTurn?.parts;
        if (parts?.length) {
          const text = parts.filter((p: any) => p.text).map((p: any) => p.text as string).join('');
          if (text.trim()) {
            console.log('Gemini Live WS: AI reply:', text);
            activeConversationHistory.push({ role: 'model', parts: [{ text }] });
            this.callbacks.onTranscriptReceived?.(text, 'model');
            this.speakTextResponse(text);
          }
        }
      } catch (_) {}
    };

    liveWs.onerror = (err) => console.error('Gemini Live WS error:', err);

    liveWs.onclose = (event) => {
      console.log('Gemini Live WS closed:', event.code, event.reason);
      liveWs = null;

      // Permanent errors (model not found, policy violation, server error) — don't reconnect
      const permanentCodes = [1008, 1003, 1011];
      if (permanentCodes.includes(event.code)) {
        console.warn('Gemini Live WS: Permanent error, falling back to STT+REST mode.');
        if (speechSessionActive) this.startSpeechRecognitionLoop();
        return;
      }

      // Transient close — reconnect after brief pause
      if (speechSessionActive) {
        setTimeout(() => { if (speechSessionActive) this.connectLiveWebSocket(); }, 2000);
      }
    };
  },

  sendUserTurnToWS(text: string): void {
    if (!liveWs || liveWs.readyState !== WebSocket.OPEN) return;
    liveWs.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  },

  startSpeechRecognitionLoop(): void {
    if (!speechSessionActive || isSpeakingResponse) return;

    if (Platform.OS !== 'web') {
      this.startNativeRecognition();
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      console.warn('Web SpeechRecognition unavailable. Using simulated voice.');
      this.startSimulatedRecognitionLoop();
      return;
    }

    try {
      if (recognitionInstance) {
        try {
          if (typeof recognitionInstance.abort === 'function') recognitionInstance.abort();
          else if (typeof recognitionInstance.stop === 'function') recognitionInstance.stop();
        } catch (_) {}
        recognitionInstance = null;
      }

      const rec = new SpeechRecognition();
      recognitionInstance = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      let finalTranscript = '';

      rec.onresult = (event: any) => {
        if (isSpeakingResponse) return;
        let interim = '', hasFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            hasFinal = true;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const display = finalTranscript + interim;
        if (display.trim()) {
          this.callbacks.onTranscriptReceived?.(display, 'user');
          if (vadTimeout) clearTimeout(vadTimeout);
          vadTimeout = setTimeout(() => {
            if (display.trim() && !isSpeakingResponse) {
              finalTranscript = '';
              try { rec.stop(); } catch (_) {}
              this.processUserSpeech(display.trim());
            }
          }, hasFinal ? 1200 : 2500);
        }
      };

      rec.onerror = (err: any) => {
        if (err.error !== 'not-allowed' && err.error !== 'aborted') {
          console.warn('Web SpeechRecognition error:', err.error);
          this.restartRecognition();
        }
      };

      rec.onend = () => {
        if (speechSessionActive && !isSpeakingResponse) {
          this.restartRecognition();
        }
      };

      rec.start();
    } catch (e) {
      console.error('Web SpeechRecognition start failed:', e);
    }
  },

  startNativeRecognition(): void {
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');

      ExpoSpeechRecognitionModule.requestPermissionsAsync().then(({ granted }: any) => {
        if (!granted) {
          console.warn('Mic permission denied. Using simulated voice.');
          this.startSimulatedRecognitionLoop();
          return;
        }

        console.log('Native SpeechRecognition engine starting...');
        const subs: any[] = [];
        const cleanup = () => { subs.forEach(s => { try { s.remove(); } catch (_) {} }); subs.length = 0; };

        subs.push(ExpoSpeechRecognitionModule.addListener('end', () => {
          console.log('Native SpeechRecognition cycle ended.');
          cleanup();
          if (speechSessionActive) this.restartRecognition();
        }));

        subs.push(ExpoSpeechRecognitionModule.addListener('error', (err: any) => {
          if (err.error === 'no-speech') { cleanup(); if (speechSessionActive) this.restartRecognition(); return; }
          console.error('Native SpeechRecognition error:', err);
          cleanup();
          if (speechSessionActive) this.restartRecognition();
        }));

        subs.push(ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
          if (isSpeakingResponse || !event.results?.length) return;
          const displayText = event.results.map((r: any) => r.transcript).join(' ');
          const hasFinal = event.results.some((r: any) => r.isFinal);
          if (displayText.trim()) {
            this.callbacks.onTranscriptReceived?.(displayText, 'user');
            if (vadTimeout) clearTimeout(vadTimeout);
            vadTimeout = setTimeout(() => {
              if (displayText.trim() && !isSpeakingResponse) {
                try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
                cleanup();
                this.processUserSpeech(displayText.trim());
              }
            }, hasFinal ? 1200 : 2500);
          }
        }));

        try {
          ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
            requiresOnDeviceRecognition: false, // ponytail: on-device mode monopolizes AVAudioSession on iOS
          });
          console.log('Native SpeechRecognition started successfully.');
          recognitionInstance = {
            stop: () => { try { ExpoSpeechRecognitionModule.stop(); } catch (_) {} cleanup(); }
          };
        } catch (startErr) {
          console.error('Failed to start native recognition:', startErr);
          cleanup();
          this.startSimulatedRecognitionLoop();
        }
      }).catch((err: any) => {
        console.error('Permission request failed:', err);
        this.startSimulatedRecognitionLoop();
      });
    } catch (err) {
      console.warn('expo-speech-recognition unavailable:', err);
      this.startSimulatedRecognitionLoop();
    }
  },

  processUserSpeech(query: string): void {
    if (!speechSessionActive) return;
    isSpeakingResponse = true;
    this.callbacks.onTranscriptReceived?.('', 'model');
    activeConversationHistory.push({ role: 'user', parts: [{ text: query }] });

    if (liveWs && liveWs.readyState === WebSocket.OPEN) {
      console.log('Gemini Live WS: Sending user turn:', query);
      this.sendUserTurnToWS(query);
      return;
    }

    this.fetchRestResponse(query);
  },

  async fetchRestResponse(query: string): Promise<void> {
    try {
      console.log('Gemini Live (REST): query:', query);
      const apiKey = CONFIG.geminiApiKey;
      if (!apiKey) {
        throw new Error('AUTH_MISSING: Gemini API key is missing.');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: activeConversationHistory.slice(-10),
          systemInstruction: { parts: [{ text: LIVE_SYSTEM_PROMPT }] },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Gemini Live REST error (status ${res.status}):`, errorText);
        if (res.status === 401 || res.status === 403) {
          throw new Error('AUTH_INVALID: Invalid Gemini API key.');
        }
        throw new Error(`API_ERROR: HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new Error('EMPTY_RESPONSE: No candidate content returned from Gemini.');
      }

      console.log('Gemini Live (REST) response:', text);
      activeConversationHistory.push({ role: 'model', parts: [{ text }] });
      this.callbacks.onTranscriptReceived?.(text, 'model');
      this.speakTextResponse(text);
    } catch (err: any) {
      console.error('Gemini Live (REST) fetch error:', err);
      let errorResponse = "I'm having trouble connecting to Gemini AI right now. Please check your connection.";
      if (err?.message?.includes('AUTH_')) {
        errorResponse = "Gemini API key authorization failed. Please check your API key in Settings.";
      }
      activeConversationHistory.push({ role: 'model', parts: [{ text: errorResponse }] });
      this.callbacks.onTranscriptReceived?.(errorResponse, 'model');
      this.speakTextResponse(errorResponse);
    }
  },

  speakTextResponse(text: string): void {
    if (Platform.OS !== 'web') {
      try {
        const Speech = require('expo-speech');
        const go = async () => {
          let voiceId: string | undefined;
          const voiceName = useAppStore.getState().settings.voice.selectedVoice;
          if (voiceName && voiceName !== 'default') {
            try {
              const voices = await Speech.getAvailableVoicesAsync();
              const match = voices.find((v: any) => v.name === voiceName);
              if (match) voiceId = match.identifier;
            } catch (_) {}
          }

          simulatedPlaybackInterval = setInterval(() => this.callbacks.onAudioReceived?.(new ArrayBuffer(512)), 120);

          // Safety watchdog: if onComplete never fires (iOS audio session conflict),
          // force-reset after estimated speech duration + 4s so conversation continues
          const estimatedMs = Math.max(2000, text.length * 70) + 4000;
          const watchdog = setTimeout(() => {
            if (isSpeakingResponse) {
              console.warn('Speech watchdog fired — onComplete never received. Restarting mic.');
              this.cleanupPlayback();
              isSpeakingResponse = false;
              this.callbacks.onStateChanged?.('connected');
              this.restartRecognition();
            }
          }, estimatedMs);

          const done = () => {
            clearTimeout(watchdog);
            this.cleanupPlayback();
            isSpeakingResponse = false;
            this.callbacks.onStateChanged?.('connected');
            setTimeout(() => this.restartRecognition(), 400);
          };

          try {
            Speech.speak(text, {
              voice: voiceId,
              onComplete: done,
              onError: done,
            });
          } catch (_) { done(); }
        };
        go(); return;
      } catch (_) {}
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      simulatedPlaybackInterval = setInterval(() => this.callbacks.onAudioReceived?.(new ArrayBuffer(512)), 100);
      setTimeout(() => {
        this.cleanupPlayback();
        isSpeakingResponse = false;
        this.callbacks.onStateChanged?.('connected');
        this.restartRecognition();
      }, Math.max(1500, text.length * 60));
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    const utt = new SpeechSynthesisUtterance(text);
    activeUtterance = utt;
    utt.rate = 1.0;
    utt.pitch = 1.05;

    let finished = false;
    const estimatedMs = Math.max(2000, text.length * 70) + 3000;

    const done = () => {
      if (finished) return;
      finished = true;
      if (speechWatchdogTimeout) {
        clearTimeout(speechWatchdogTimeout);
        speechWatchdogTimeout = null;
      }
      activeUtterance = null;
      this.cleanupPlayback();
      isSpeakingResponse = false;
      this.callbacks.onStateChanged?.('connected');
      setTimeout(() => this.restartRecognition(), 300);
    };

    speechWatchdogTimeout = setTimeout(() => {
      if (isSpeakingResponse) {
        console.warn('Web speech watchdog fired — onend never received. Restarting mic.');
        done();
      }
    }, estimatedMs);

    utt.onstart = () => {
      simulatedPlaybackInterval = setInterval(() => this.callbacks.onAudioReceived?.(new ArrayBuffer(512)), 100);
    };
    utt.onend = () => done();
    utt.onerror = (e) => {
      console.warn('Web SpeechSynthesis error:', e);
      done();
    };

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utt);
    } catch (e) {
      console.error('window.speechSynthesis.speak failed:', e);
      done();
    }
  },

  restartRecognition(): void {
    if (!speechSessionActive || isSpeakingResponse) return;
    if (recognitionInstance) {
      try {
        if (typeof recognitionInstance.abort === 'function') recognitionInstance.abort();
        else if (typeof recognitionInstance.stop === 'function') recognitionInstance.stop();
      } catch (_) {}
      recognitionInstance = null;
    }
    setTimeout(() => {
      if (speechSessionActive && !isSpeakingResponse) {
        this.startSpeechRecognitionLoop();
      }
    }, 250);
  },

  startSimulatedRecognitionLoop(): void {
    if (recognitionInstance) return;
    recognitionInstance = {
      stop: () => { if (simulatedRecognitionTimeout) { clearTimeout(simulatedRecognitionTimeout); simulatedRecognitionTimeout = null; } }
    };
    console.log('Simulated SpeechRecognition engine active. Listening...');
    simulatedRecognitionTimeout = setTimeout(() => {
      if (isSpeakingResponse || !speechSessionActive) return;
      const prompt = simulatedUserPrompts[simulatedPromptIndex % simulatedUserPrompts.length];
      simulatedPromptIndex++;
      this.callbacks.onTranscriptReceived?.(prompt, 'user');
      setTimeout(() => { if (!isSpeakingResponse && speechSessionActive) this.processUserSpeech(prompt); }, 1500);
    }, 5000);
  },

  cleanupPlayback(): void {
    if (simulatedPlaybackInterval) { clearInterval(simulatedPlaybackInterval); simulatedPlaybackInterval = null; }
  },

  disconnect(): void {
    speechSessionActive = false;
    isSpeakingResponse = false;
    if (speechWatchdogTimeout) { clearTimeout(speechWatchdogTimeout); speechWatchdogTimeout = null; }
    if (recognitionInstance) {
      try {
        if (typeof recognitionInstance.abort === 'function') recognitionInstance.abort();
        else if (typeof recognitionInstance.stop === 'function') recognitionInstance.stop();
      } catch (_) {}
      recognitionInstance = null;
    }
    if (simulatedRecognitionTimeout) { clearTimeout(simulatedRecognitionTimeout); simulatedRecognitionTimeout = null; }
    if (vadTimeout) { clearTimeout(vadTimeout); vadTimeout = null; }
    this.cleanupPlayback();
    if (liveWs) { try { liveWs.close(); } catch (_) {} liveWs = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    activeUtterance = null;
    this.callbacks.onStateChanged?.('disconnected');
    console.log('Gemini Live: Session ended.');
  },

  sendAudio(_: ArrayBuffer): void {},
  sendText(text: string): void { if (text.trim()) this.processUserSpeech(text.trim()); },
  interrupt(): void {
    if (speechWatchdogTimeout) { clearTimeout(speechWatchdogTimeout); speechWatchdogTimeout = null; }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    activeUtterance = null;
    this.cleanupPlayback();
    isSpeakingResponse = false;
    this.restartRecognition();
  },
  cleanupAudio(): void { this.cleanupPlayback(); },
  downsampleBuffer(_b: Float32Array, _i: number, _o: number): ArrayBuffer { return new ArrayBuffer(0); },
  playPCM24kHz(_: ArrayBuffer): void {},
};
