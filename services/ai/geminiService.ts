import { Platform } from 'react-native';
import { AIResponse, Message } from '../../types';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { SUPPORTIVE_RESPONSES } from '../../constants/mockData';
import { safetyService } from './safetyService';
import { SYSTEM_PROMPT, SENTIMENT_ANALYSIS_PROMPT } from './prompts';
import { memoryService } from './memoryService';
import { openRouterService, cleanModelResponse } from './openRouterService';

export const geminiService = {
  async sendTextMessage(
    text: string,
    conversationId: string,
    history: Message[]
  ): Promise<AIResponse> {
    const trimmedText = (text || '').trim();

    // ── Instant Client-Side Deterministic Guardrails ─────────────────────
    // 1. Jailbreak immunity check
    const jailbreak = safetyService.checkJailbreak(trimmedText);
    if (jailbreak) {
      return {
        text: jailbreak.response,
        safetyFlagged: false,
        safetyLevel: 'none',
      };
    }

    // 2. Scope lock check (coding, technical, math, recipes, trivia)
    const scope = safetyService.checkScope(trimmedText);
    if (scope) {
      return {
        text: scope.response,
        safetyFlagged: false,
        safetyLevel: 'none',
      };
    }

    // 3. Voice inquiry check
    const voiceQuery = safetyService.checkVoiceQuery(trimmedText);
    if (voiceQuery) {
      return {
        text: voiceQuery.response,
        safetyFlagged: false,
        safetyLevel: 'none',
      };
    }

    // 4. Identity & Name inquiry check ("who am i", "what is my name")
    const userName = await memoryService.getUserName();
    const identityQuery = safetyService.checkIdentityQuery(trimmedText, userName);
    if (identityQuery) {
      return {
        text: identityQuery.response,
        safetyFlagged: false,
        safetyLevel: 'none',
      };
    }

    const safetyLevel = safetyService.getSafetyLevel(trimmedText);
    const memoryProfile = await memoryService.getMemoryProfile();
    const contextualPrompt = memoryProfile ? `${SYSTEM_PROMPT}\n\nUser Context:\n${memoryProfile}` : SYSTEM_PROMPT;

    // If Demo Mode is enabled, simulate network call and emotional responses
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency

      // If crisis text is detected, return direct safety response
      if (safetyLevel === 'high') {
        return {
          text: "It sounds like you may be going through something really serious. You don't have to carry this alone, and getting human support right now is important. Please connect with emergency resources or someone you trust. I am here to support you, but I cannot replace professional care.",
          safetyFlagged: true,
          safetyLevel: 'high',
        };
      }

      // Generate a supportive mock response based on text keywords
      let responseText = SUPPORTIVE_RESPONSES[Math.floor(Math.random() * SUPPORTIVE_RESPONSES.length)];
      const lower = text.toLowerCase();
      if (lower.includes('stress') || lower.includes('work') || lower.includes('busy')) {
        responseText = "Work and constant pressure can be extremely draining. It's okay to feel overwhelmed by it. What's one small thing you can step away from right now, even just for five minutes?";
      } else if (lower.includes('lonely') || lower.includes('alone')) {
        responseText = "Feeling lonely is a heavy sensation, but please know you don't have to carry it all by yourself. I'm here to listen, and your thoughts have a safe place to land here.";
      } else if (lower.includes('anxious') || lower.includes('scared') || lower.includes('worry')) {
        responseText = "Anxiety can feel so physical and loud. Let's take a slow breath together. If you want, tell me what specific worry is taking up the most space in your mind right now.";
      } else if (lower.includes('sad') || lower.includes('cry')) {
        responseText = "It's completely okay to feel sad and let those feelings exist. You don't need to put on a brave face here. What feels like it hurts the most right now?";
      }

      return {
        text: responseText,
        safetyFlagged: safetyLevel !== 'none',
        safetyLevel,
      };
    }

    // 1. Try OpenRouter free models first (preserves Gemini quota, 0 cost)
    if (CONFIG.openRouterApiKey) {
      try {
        const orReply = await openRouterService.generateCompletion(
          contextualPrompt,
          history.map((m) => ({ role: m.role as any, content: m.content })),
          text
        );
        if (orReply && orReply.trim()) {
          return {
            text: orReply.trim(),
            safetyFlagged: safetyLevel !== 'none',
            safetyLevel,
          };
        }
      } catch (orErr) {
        console.warn('[OpenRouter] Free completion error, falling back to Gemini:', orErr);
      }
    }

    // 2. Real Gemini API implementation
    try {
      if (CONFIG.geminiApiKey) {
        // Direct integration with Google AI Studio
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              ...history.filter(msg => msg.role !== 'system').map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
              })),
              {
                role: 'user',
                parts: [{ text }]
              }
            ],
            systemInstruction: {
              parts: [{ text: contextualPrompt }]
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const responseText = cleanModelResponse(rawText);
          return {
            text: responseText || "I'm right here with you. What's on your mind?",
            safetyFlagged: safetyLevel !== 'none',
            safetyLevel,
          };
        } else {
          const errorMsg = await response.text();
          console.error(`Direct Gemini API Error (Status ${response.status}):`, errorMsg);
          throw new Error(`Direct Gemini API returned Status ${response.status}: ${errorMsg}`);
        }
      }

      const response = await fetch(`${CONFIG.apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          conversationId,
          history: history.map(msg => ({ role: msg.role, content: msg.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return {
        text: data.text,
        audioUrl: data.audioUrl,
        safetyFlagged: data.safetyFlagged || safetyLevel !== 'none',
        safetyLevel: data.safetyLevel || safetyLevel,
      };
    } catch (error) {
      console.error('Gemini Service text message error:', error);
      throw error;
    }
  },

  async analyzeAudio(
    audioUri: string,
    conversationId: string,
    userTranscript?: string
  ): Promise<AIResponse> {
    const memoryProfile = await memoryService.getMemoryProfile();
    const contextualPrompt = memoryProfile ? `${SYSTEM_PROMPT}\n\nUser Context:\n${memoryProfile}` : SYSTEM_PROMPT;
    const cleanTranscript = (userTranscript || '').trim();

    // ponytail: Multimodal Gemini audio direct analysis first with OpenRouter speech transcript fallback ensures zero canned response loops.
    // 1. If in Demo Mode, provide a contextual empathetic response
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      let reply = "Thank you for sharing that reflection with me. Saying things out loud can bring relief. I'm right here with you.";
      if (cleanTranscript) {
        const lower = cleanTranscript.toLowerCase();
        if (lower.includes('stress') || lower.includes('overwhelm') || lower.includes('work') || lower.includes('busy')) {
          reply = "I hear how exhausting and overwhelming things feel right now. It's completely valid to feel drained. What's one small thing you can let go of for just this moment?";
        } else if (lower.includes('sad') || lower.includes('cry') || lower.includes('hurt') || lower.includes('heartbreak')) {
          reply = "I'm listening, and I hear how much pain you're sitting with. You don't have to hold it all inside. I'm here beside you.";
        } else if (lower.includes('anxious') || lower.includes('scared') || lower.includes('worry') || lower.includes('panic')) {
          reply = "Your anxiety is real, but you are safe right now in this space. Let's take one steady breath together. What feels heaviest on your mind?";
        } else if (lower.includes('lonely') || lower.includes('alone')) {
          reply = "Feeling alone can feel like an ache that's hard to name. I want you to know you are heard and you matter. What would feel comforting right now?";
        } else {
          reply = `I heard you share: "${cleanTranscript}". Thank you for trusting me with that. How are you feeling in your body right now as you speak this?`;
        }
      }
      return {
        text: reply,
        audioUrl: `speech://${encodeURIComponent(reply)}`,
        safetyFlagged: false,
        safetyLevel: 'none',
      };
    }

    // 2. Multimodal Gemini Audio Analysis
    if (CONFIG.geminiApiKey && audioUri && audioUri !== 'mock-voice-note.m4a') {
      try {
        let base64Data = '';
        let mimeType = 'audio/webm';

        if (audioUri.startsWith('data:')) {
          const parts = audioUri.split(';base64,');
          if (parts.length === 2) {
            mimeType = parts[0].replace('data:', '') || 'audio/webm';
            base64Data = parts[1];
          }
        } else if (audioUri.startsWith('file://') || audioUri.startsWith('/') || audioUri.includes('/Containers/')) {
          try {
            const FileSystem = require('expo-file-system');
            base64Data = await FileSystem.readAsStringAsync(audioUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            mimeType = audioUri.endsWith('.m4a') ? 'audio/x-m4a' : (audioUri.endsWith('.wav') ? 'audio/wav' : 'audio/mp4');
          } catch (_) {
            const res = await fetch(audioUri);
            const blob = await res.blob();
            mimeType = blob.type || 'audio/mp4';
            base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(((reader.result as string) || '').split(',')[1] || '');
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } else if (audioUri.startsWith('http') || audioUri.startsWith('blob:')) {
          const res = await fetch(audioUri);
          const blob = await res.blob();
          mimeType = blob.type || 'audio/webm';
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(((reader.result as string) || '').split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        // Clean mimeType to standard without codecs parameter
        mimeType = mimeType.split(';')[0].trim() || 'audio/webm';

        if (base64Data) {
          const promptInstruction = cleanTranscript
            ? `The user shared this voice reflection with spoken words: "${cleanTranscript}". Please listen to the tone, emotion, and pace in their audio, and provide a warm, empathetic, spoken voice response. Keep it conversational, comforting, and direct. Do not include any emojis (such as 💜) because text-to-speech engines pronounce them out loud.`
            : `Please listen carefully to the user's voice reflection. Note the tone, emotion, and content of what they shared, and provide an empathetic, warm, conversational response directly to them. Do not include any emojis (such as 💜) because text-to-speech engines pronounce them out loud.`;

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: promptInstruction,
                  },
                ],
              }],
              systemInstruction: {
                parts: [{ text: contextualPrompt }],
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const responseText = cleanModelResponse(rawText);
            if (responseText && responseText.trim()) {
              return {
                text: responseText.trim(),
                audioUrl: `speech://${encodeURIComponent(responseText.trim())}`,
                safetyFlagged: false,
                safetyLevel: 'none',
              };
            }
          } else {
            const errBody = await response.text();
            console.warn(`Direct Gemini audio analysis returned Status ${response.status}:`, errBody);
          }
        }
      } catch (geminiAudioErr) {
        console.warn('Gemini audio analysis failed, attempting transcript fallback:', geminiAudioErr);
      }
    }

    // 3. Fallback: If transcript is present, use OpenRouter or Gemini text generation
    if (cleanTranscript) {
      if (CONFIG.openRouterApiKey) {
        try {
          const orReply = await openRouterService.generateCompletion(
            contextualPrompt,
            [],
            `[User voice reflection]: "${cleanTranscript}". Please respond with warmth, compassion, and active listening. Do not include any emojis because text-to-speech engines pronounce them out loud.`
          );
          if (orReply && orReply.trim()) {
            const cleaned = cleanModelResponse(orReply.trim());
            return {
              text: cleaned,
              audioUrl: `speech://${encodeURIComponent(cleaned)}`,
              safetyFlagged: false,
              safetyLevel: 'none',
            };
          }
        } catch (orErr) {
          console.warn('[OpenRouter] Voice transcript fallback error:', orErr);
        }
      }

      if (CONFIG.geminiApiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
          const textRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `The user spoke this reflection: "${cleanTranscript}". Please respond warmly and supportively without using any emojis.` }] }],
              systemInstruction: { parts: [{ text: contextualPrompt }] },
            }),
          });
          if (textRes.ok) {
            const data = await textRes.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = cleanModelResponse(rawText);
            if (cleaned) {
              return {
                text: cleaned,
                audioUrl: `speech://${encodeURIComponent(cleaned)}`,
                safetyFlagged: false,
                safetyLevel: 'none',
              };
            }
          }
        } catch (_) {}
      }
    }

    // 4. Fallback if backend server exists
    try {
      if (CONFIG.apiUrl && !CONFIG.apiUrl.includes('havenly.ai')) {
        const formData = new FormData();
        // @ts-ignore
        formData.append('audio', {
          uri: audioUri,
          name: 'voice_message.webm',
          type: 'audio/webm',
        });
        formData.append('conversationId', conversationId);

        const response = await fetch(`${CONFIG.apiUrl}/audio/analyze`, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            text: data.text,
            audioUrl: data.audioUrl || `speech://${encodeURIComponent(data.text)}`,
            safetyFlagged: data.safetyFlagged,
            safetyLevel: data.safetyLevel || 'none',
          };
        }
      }
    } catch (_) {}

    // 5. Final graceful supportive response
    const fallbackReply = cleanTranscript
      ? `I heard what you shared about "${cleanTranscript.slice(0, 50)}...". Thank you for saying it out loud. Take a slow breath, I'm right here with you.`
      : "I received your voice note. Saying what's on your mind can sometimes make things feel a little lighter. I'm right here whenever you want to share more.";

    return {
      text: fallbackReply,
      audioUrl: `speech://${encodeURIComponent(fallbackReply)}`,
      safetyFlagged: false,
      safetyLevel: 'none',
    };
  },

  async generateVoiceResponse(text: string): Promise<AIResponse> {
    if (CONFIG.isDemoMode || CONFIG.geminiApiKey) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        text,
        audioUrl: '',
      };
    }

    try {
      const response = await fetch(`${CONFIG.apiUrl}/audio/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS failed');
      }

      const data = await response.json();
      return {
        text,
        audioUrl: data.audioUrl,
      };
    } catch (error) {
      console.error('Gemini Service TTS error:', error);
      throw error;
    }
  },

  // ── Sentiment / emotion analysis from text ─────────────────────────────────
  async analyzeSentiment(text: string): Promise<SentimentResult | null> {
    if (!text.trim() || !CONFIG.geminiApiKey) return null;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: SENTIMENT_ANALYSIS_PROMPT + text }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Strip any accidental markdown code fences
      const clean = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
      return JSON.parse(clean) as SentimentResult;
    } catch (e) {
      console.warn('Sentiment analysis failed:', e);
      return null;
    }
  },
};

export interface SentimentResult {
  primaryEmotion: 'happy' | 'sad' | 'anxious' | 'angry' | 'stressed' | 'overwhelmed' | 'lonely' | 'hopeful' | 'neutral' | 'confused' | 'grateful' | 'fearful' | 'frustrated';
  intensity: 'low' | 'medium' | 'high';
  valence: 'positive' | 'negative' | 'neutral';
  secondaryEmotions: string[];
  needsSupport: boolean;
  summary: string;
}
