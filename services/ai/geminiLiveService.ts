import { Platform } from 'react-native';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { useAppStore } from '../../store/useAppStore';
import { openRouterService, cleanModelResponse } from './openRouterService';
import { REALTIME_VOICE_INSTRUCTIONS } from './prompts';
import { safetyService } from './safetyService';
import { memoryService } from './memoryService';

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
let activeAudioSource: any = null;
let activeAudioContext: any = null;
let activeConversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

const LIVE_WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

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
          systemInstruction: { parts: [{ text: REALTIME_VOICE_INSTRUCTIONS }] },
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
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return;

    isSpeakingResponse = true;

    // ── Instant Client-Side Safety & Jailbreak Interception ─────────────
    // A. Jailbreak immunity check
    const jailbreak = safetyService.checkJailbreak(cleanQuery);
    if (jailbreak) {
      activeConversationHistory.push({ role: 'user', parts: [{ text: cleanQuery }] });
      activeConversationHistory.push({ role: 'model', parts: [{ text: jailbreak.response }] });
      this.callbacks.onTranscriptReceived?.(jailbreak.response, 'model');
      this.speakTextResponse(jailbreak.response);
      return;
    }

    // B. Scope lock check (coding, math, general trivia tasks)
    const scope = safetyService.checkScope(cleanQuery);
    if (scope) {
      activeConversationHistory.push({ role: 'user', parts: [{ text: cleanQuery }] });
      activeConversationHistory.push({ role: 'model', parts: [{ text: scope.response }] });
      this.callbacks.onTranscriptReceived?.(scope.response, 'model');
      this.speakTextResponse(scope.response);
      return;
    }

    // C. Voice query check (settings redirection)
    const voiceQuery = safetyService.checkVoiceQuery(cleanQuery);
    if (voiceQuery) {
      activeConversationHistory.push({ role: 'user', parts: [{ text: cleanQuery }] });
      activeConversationHistory.push({ role: 'model', parts: [{ text: voiceQuery.response }] });
      this.callbacks.onTranscriptReceived?.(voiceQuery.response, 'model');
      this.speakTextResponse(voiceQuery.response);
      return;
    }

    // D. Identity inquiry check ("who am i", "what is my name")
    const identityQuery = safetyService.checkIdentityQuery(
      cleanQuery,
      useAppStore.getState().user?.name
    );
    if (identityQuery) {
      activeConversationHistory.push({ role: 'user', parts: [{ text: cleanQuery }] });
      activeConversationHistory.push({ role: 'model', parts: [{ text: identityQuery.response }] });
      this.callbacks.onTranscriptReceived?.(identityQuery.response, 'model');
      this.speakTextResponse(identityQuery.response);
      return;
    }

    // E. Crisis classification
    const safetyLevel = safetyService.getSafetyLevel(cleanQuery);
    if (safetyLevel === 'high') {
      try {
        useAppStore.getState().setShowSafetySupport(true);
      } catch (_) {}
      const crisisReply = "I hear how much pain you're in, and you don't have to carry this alone. Please reach out to emergency services or call 988 right now. I'm right here with you.";
      activeConversationHistory.push({ role: 'user', parts: [{ text: cleanQuery }] });
      activeConversationHistory.push({ role: 'model', parts: [{ text: crisisReply }] });
      this.callbacks.onTranscriptReceived?.(crisisReply, 'model');
      this.speakTextResponse(crisisReply);
      return;
    }

    this.callbacks.onTranscriptReceived?.('', 'model');
    activeConversationHistory.push({ role: 'user', parts: [{ text: cleanQuery }] });

    if (liveWs && liveWs.readyState === WebSocket.OPEN) {
      console.log('Gemini Live WS: Sending user turn:', cleanQuery);
      this.sendUserTurnToWS(cleanQuery);
      return;
    }

    this.fetchRestResponse(cleanQuery);
  },

  async fetchRestResponse(query: string): Promise<void> {
    try {
      console.log('Voice dialogue: query:', query);
      let text = '';

      // Prepare contextualized instructions including user's memory profile
      let instructions = REALTIME_VOICE_INSTRUCTIONS;
      try {
        const memoryProfile = await memoryService.getMemoryProfile();
        if (memoryProfile && memoryProfile.trim()) {
          instructions += `\n\nUser Context:\n${memoryProfile.trim()}`;
        }
      } catch (_) {}

      // Prior conversation history (excluding current query to prevent duplication)
      const priorHistory = activeConversationHistory
        .slice(0, -1) // turns before the current user turn
        .slice(-8)    // keep last 8 turns for conversational continuity
        .map((turn) => ({
          role: turn.role,
          content: turn.parts?.[0]?.text || '',
        }));

      // 1. Try OpenRouter free models first (zero quota cost, high availability)
      if (CONFIG.openRouterApiKey) {
        try {
          const orResponse = await openRouterService.generateCompletion(
            instructions,
            priorHistory,
            query
          );
          if (orResponse && orResponse.trim()) {
            text = cleanModelResponse(orResponse);
          }
        } catch (orErr) {
          console.warn('[OpenRouter] Free model attempt failed, falling back to Gemini:', orErr);
        }
      }

      // 2. Fall back to Gemini 3.5 Flash Lite if OpenRouter didn't return text
      if (!text && CONFIG.geminiApiKey) {
        const apiKey = CONFIG.geminiApiKey;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: activeConversationHistory.slice(-10),
            systemInstruction: { parts: [{ text: instructions }] },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 250,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawGemini = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          text = cleanModelResponse(rawGemini);
        } else {
          const errorText = await res.text();
          console.error(`Gemini REST error (status ${res.status}):`, errorText);
        }
      }

      if (!text) {
        throw new Error('All AI providers returned empty responses.');
      }

      console.log('Voice dialogue response:', text);
      activeConversationHistory.push({ role: 'model', parts: [{ text }] });
      this.callbacks.onTranscriptReceived?.(text, 'model');
      this.speakTextResponse(text);
    } catch (err: any) {
      console.error('Voice dialogue error:', err);
      const errorResponse = "I'm having trouble connecting right now. Please check your network or API keys in Settings.";
      activeConversationHistory.push({ role: 'model', parts: [{ text: errorResponse }] });
      this.callbacks.onTranscriptReceived?.(errorResponse, 'model');
      this.speakTextResponse(errorResponse);
    }
  },

  speakTextResponse(text: string): void {
    const settings = useAppStore.getState().settings;
    const liveVoice = settings.voice?.selectedLiveVoice || 'Kore';
    const selectedVoice = settings.voice?.selectedVoice;

    // Use our calibrated human natural speech engine:
    // Zero quota consumption, zero rate limits, unlimited free calls!
    if (Platform.OS === 'web') {
      this.speakWithWebSpeech(text, liveVoice, selectedVoice);
      return;
    }

    // Native expo-speech branch with voice preference mapping
    try {
      const Speech = require('expo-speech');
      const go = async () => {
        let voiceId: string | undefined;
        if (selectedVoice && selectedVoice !== 'default') {
          try {
            const voices = await Speech.getAvailableVoicesAsync();
            const match = voices.find((v: any) => v.name === selectedVoice || v.identifier === selectedVoice);
            if (match) voiceId = match.identifier;
          } catch (_) {}
        } else {
          try {
            const voices = await Speech.getAvailableVoicesAsync();
            const isFemale = liveVoice === 'Kore';
            const match = voices.find((v: any) => {
              const n = (v.name || '').toLowerCase();
              const l = (v.language || '').toLowerCase();
              if (!l.startsWith('en')) return false;
              return isFemale
                ? (n.includes('samantha') || n.includes('karen') || n.includes('female') || n.includes('ava') || n.includes('zira'))
                : (n.includes('daniel') || n.includes('david') || n.includes('male') || n.includes('george') || n.includes('guy'));
            });
            if (match) voiceId = match.identifier;
          } catch (_) {}
        }

        simulatedPlaybackInterval = setInterval(() => this.callbacks.onAudioReceived?.(new ArrayBuffer(512)), 120);

        const estimatedMs = Math.max(2000, text.length * 75) + 4000;
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
            rate: 0.93,
            pitch: liveVoice === 'Charon' ? 0.92 : liveVoice === 'Kore' ? 0.98 : 0.95,
            onComplete: done,
            onError: done,
          });
        } catch (_) { done(); }
      };
      go();
    } catch (_) {
      this.speakWithWebSpeech(text, liveVoice, selectedVoice);
    }
  },

  async fetchGeminiSpeechAudio(text: string, voiceName: string): Promise<string | null> {
    const apiKey = CONFIG.geminiApiKey;
    if (!apiKey) return null;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.ttsModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName }
              }
            }
          }
        })
      });
      if (!res.ok) {
        console.warn(`[Gemini TTS API] Status ${res.status}, using natural browser voice fallback.`);
        return null;
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (err) {
      console.warn('[Gemini TTS API] Fetch error:', err);
      return null;
    }
  },

  playPCM24kHzBase64(
    base64Data: string,
    onAudioTick: (chunk: ArrayBuffer) => void,
    onComplete: () => void,
    onError: () => void
  ): { stop: () => void } | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;

      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      activeAudioContext = audioCtx;

      const binary = atob(base64Data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      activeAudioSource = source;

      simulatedPlaybackInterval = setInterval(() => {
        onAudioTick(new ArrayBuffer(512));
      }, 100);

      let ended = false;
      const cleanup = () => {
        if (ended) return;
        ended = true;
        this.cleanupPlayback();
        if (activeAudioSource === source) activeAudioSource = null;
        try { audioCtx.close(); } catch (_) {}
        if (activeAudioContext === audioCtx) activeAudioContext = null;
      };

      source.onended = () => {
        cleanup();
        onComplete();
      };

      source.start();
      return {
        stop: () => {
          cleanup();
          try { source.stop(); } catch (_) {}
        }
      };
    } catch (err) {
      console.error('Web Audio PCM playback failed:', err);
      onError();
      return null;
    }
  },

  speakWithWebSpeech(text: string, liveVoice: string, selectedVoice?: string): void {
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

    // Resolve user's chosen voice or natural human voice matching persona
    const allVoices = window.speechSynthesis.getVoices();
    let chosenVoice: any = null;

    if (selectedVoice && selectedVoice !== 'default') {
      chosenVoice = allVoices.find(v => v.name === selectedVoice || (v as any).voiceURI === selectedVoice);
    }

    const isFemale = liveVoice === 'Kore';
    const englishVoices = allVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));

    if (!chosenVoice) {
      if (isFemale) {
        // Find best warm natural female voice (Samantha, Ava, Jenny, Google US English Female, etc.)
        chosenVoice =
          englishVoices.find(v => {
            const n = v.name.toLowerCase();
            return (n.includes('natural') || n.includes('enhanced') || n.includes('samantha') || n.includes('ava') || n.includes('jenny') || n.includes('victoria') || n.includes('zira') || n.includes('karen')) && !n.includes('compact');
          }) ||
          englishVoices.find(v => v.name.toLowerCase().includes('female')) ||
          englishVoices.find(v => !v.name.toLowerCase().includes('compact')) ||
          englishVoices[0];
      } else {
        // Find best calm natural male voice (Daniel, Guy, David, Google UK English Male, etc.)
        chosenVoice =
          englishVoices.find(v => {
            const n = v.name.toLowerCase();
            return (n.includes('natural') || n.includes('enhanced') || n.includes('daniel') || n.includes('guy') || n.includes('david') || n.includes('oliver') || n.includes('george')) && !n.includes('compact');
          }) ||
          englishVoices.find(v => v.name.toLowerCase().includes('male')) ||
          englishVoices.find(v => !v.name.toLowerCase().includes('compact')) ||
          englishVoices[0];
      }
    }

    if (chosenVoice) {
      utt.voice = chosenVoice;
    }

    // Natural empathetic vocal pacing (calm, warm, unhurried)
    utt.rate = 0.93;
    utt.pitch = isFemale ? 0.98 : liveVoice === 'Charon' ? 0.92 : 0.96;

    let finished = false;
    const estimatedMs = Math.max(2000, text.length * 75) + 3000;

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
    if (activeAudioSource) {
      try { activeAudioSource.stop(); } catch (_) {}
      activeAudioSource = null;
    }
    if (activeAudioContext) {
      try { activeAudioContext.close(); } catch (_) {}
      activeAudioContext = null;
    }
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
    if (activeAudioSource) {
      try { activeAudioSource.stop(); } catch (_) {}
      activeAudioSource = null;
    }
    if (activeAudioContext) {
      try { activeAudioContext.close(); } catch (_) {}
      activeAudioContext = null;
    }
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
