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

  async analyzeAudio(audioUri: string, conversationId: string): Promise<AIResponse> {
    const memoryProfile = await memoryService.getMemoryProfile();
    const contextualPrompt = memoryProfile ? `${SYSTEM_PROMPT}\n\nUser Context:\n${memoryProfile}` : SYSTEM_PROMPT;

    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        text: "I've listened to your voice note. It sounds like you're carrying a lot of tension right now, and saying it out loud can sometimes make it feel a little lighter. I'm right here if you want to keep sharing.",
        safetyFlagged: false,
        safetyLevel: 'none',
      };
    }

    if (CONFIG.geminiApiKey) {
      if (audioUri === 'mock-voice-note.m4a' || (!audioUri.startsWith('http') && !audioUri.startsWith('file') && !audioUri.startsWith('/'))) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
          text: "I've listened to your voice reflection. It sounds like you're carrying a lot of tension right now, and saying it out loud can sometimes make it feel a little lighter. I'm right here if you want to keep sharing.",
          audioUrl: `speech://${encodeURIComponent("I've listened to your voice reflection. It sounds like you're carrying a lot of tension right now, and saying it out loud can sometimes make it feel a little lighter. I'm right here if you want to keep sharing.")}`,
          safetyFlagged: false,
          safetyLevel: 'none',
        };
      }

      try {
        let base64Data = '';
        if (audioUri.startsWith('data:')) {
          base64Data = audioUri.split(',')[1];
        } else if (audioUri.startsWith('file://') || audioUri.startsWith('/') || audioUri.includes('/Containers/')) {
          try {
            const FileSystem = require('expo-file-system');
            const decodedUri = decodeURIComponent(audioUri);
            let targetUri = decodedUri;
            if (targetUri.startsWith('/') && !targetUri.startsWith('file://')) {
              targetUri = 'file://' + targetUri;
            }
            if (Platform.OS === 'ios') {
              targetUri = targetUri.replace('file:///private/var/', 'file:///var/');
            }
            
            try {
              base64Data = await FileSystem.readAsStringAsync(targetUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch (innerFsErr) {
              console.warn('Primary file read failed, attempting symlink/fetch fallback...', innerFsErr);
              let altUri = targetUri.includes('file:///var/') 
                ? targetUri.replace('file:///var/', 'file:///private/var/')
                : targetUri.replace('file:///private/var/', 'file:///var/');
              
              try {
                base64Data = await FileSystem.readAsStringAsync(altUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              } catch (altFsErr) {
                console.warn('Alternative file read failed, trying blob fetch...', altFsErr);
                const response = await fetch(audioUri);
                const blob = await response.blob();
                base64Data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.split(',')[1]);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
            }
          } catch (fsError) {
            console.error('FileSystem read error in geminiService:', fsError);
            throw fsError;
          }
        } else {
          const response = await fetch(audioUri);
          const blob = await response.blob();
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: audioUri.endsWith('.m4a') ? 'audio/x-m4a' : 'audio/mp3',
                    data: base64Data
                  }
                },
                {
                  text: "Please transcribe the audio if possible and provide an empathetic, supportive, safety-aware response to what the user said. Keep it conversational."
                }
              ]
            }],
            systemInstruction: {
              parts: [{ text: contextualPrompt }]
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return {
            text: responseText,
            audioUrl: '',
            safetyFlagged: false,
            safetyLevel: 'none',
          };
        } else {
          const errBody = await response.text();
          console.warn(`Direct Gemini audio analysis returned Status ${response.status}:`, errBody);
          throw new Error(`Direct Gemini audio analysis returned Status ${response.status}: ${errBody}`);
        }
      } catch (e) {
        console.warn('Direct Gemini audio analysis exception, returning speech-transcription error response:', e);
        return {
          text: "I've received your voice note, but I had trouble processing the audio directly. I'm here to listen if you want to write it out or try again.",
          audioUrl: '',
          safetyFlagged: false,
          safetyLevel: 'none',
        };
      }
    }

    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('audio', {
        uri: audioUri,
        name: 'voice_message.m4a',
        type: 'audio/m4a',
      });
      formData.append('conversationId', conversationId);

      const response = await fetch(`${CONFIG.apiUrl}/audio/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Audio upload failed');
      }

      const data = await response.json();
      return {
        text: data.text,
        audioUrl: data.audioUrl,
        safetyFlagged: data.safetyFlagged,
        safetyLevel: data.safetyLevel || 'none',
      };
    } catch (error) {
      console.error('Gemini Service audio analysis error:', error);
      throw error;
    }
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
