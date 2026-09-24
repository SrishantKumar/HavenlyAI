import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sun, Moon, Volume2, Shield, Info, AlertTriangle, Play, Square, Check, Volume1, Key } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { storage } from '../../utils/storage';

const IconSun = Sun as any;
const IconMoon = Moon as any;
const IconVolume2 = Volume2 as any;
const IconShield = Shield as any;
const IconAlertTriangle = AlertTriangle as any;
const IconInfo = Info as any;
const IconPlay = Play as any;
const IconSquare = Square as any;
const IconCheck = Check as any;
const IconVolume1 = Volume1 as any;
const IconKey = Key as any;
import Header from '../../components/ui/Header';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const GEMINI_LIVE_VOICES = [
  { id: 'Puck', name: 'Puck', description: 'Conversational, friendly male tone', gender: 'male' },
  { id: 'Charon', name: 'Charon', description: 'Empathetic, calm deep male tone', gender: 'male' },
  { id: 'Kore', name: 'Kore', description: 'Warm, compassionate female tone', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Energetic, active male tone', gender: 'male' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { theme, setTheme, settings, updateSettings, resetAllData } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const [clearDataModalVisible, setClearDataModalVisible] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState('');
  const [openRouterKeyStatus, setOpenRouterKeyStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [openRouterKeyMessage, setOpenRouterKeyMessage] = useState('');
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  // Load available SpeechSynthesis voices
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        const Speech = require('expo-speech');
        Speech.getAvailableVoicesAsync().then((list: any[]) => {
          const englishList = list.filter(v => v.language.toLowerCase().startsWith('en'));
          const mappedVoices = englishList.map(v => ({
            name: v.name,
            lang: v.language,
            identifier: v.identifier,
          }));
          setVoices(mappedVoices);
        });
      } catch (e) {
        console.warn('Failed to load expo-speech native voices', e);
      }
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const list = window.speechSynthesis.getVoices();
        const englishList = list.filter(v => v.lang.toLowerCase().startsWith('en'));
        setVoices(englishList);
      };
      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  useEffect(() => {
    const key = CONFIG.geminiApiKey;
    if (key) {
      setApiKeyInput(key);
    }
    const orKey = CONFIG.openRouterApiKey;
    if (orKey) {
      setOpenRouterKeyInput(orKey);
    }
  }, []);

  const handleSaveOpenRouterKey = async () => {
    setOpenRouterKeyStatus('testing');
    setOpenRouterKeyMessage('');
    const trimmed = openRouterKeyInput.trim();
    if (!trimmed) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('havenly_openrouter_api_key');
        }
        await storage.deleteSecureItem('havenly_openrouter_api_key');
      } catch (_) {}
      setOpenRouterKeyStatus('idle');
      setOpenRouterKeyMessage('OpenRouter key cleared.');
      return;
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmed}`,
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('havenly_openrouter_api_key', trimmed);
        }
        await storage.setSecureItem('havenly_openrouter_api_key', trimmed);
        setOpenRouterKeyStatus('success');
        setOpenRouterKeyMessage('OpenRouter free models connected successfully!');
      } else {
        setOpenRouterKeyStatus('error');
        setOpenRouterKeyMessage(`Verification failed (Status ${res.status}). Verify your key.`);
      }
    } catch (err: any) {
      setOpenRouterKeyStatus('error');
      setOpenRouterKeyMessage(err?.message || 'Network error connecting to OpenRouter.');
    }
  };

  const handleSaveApiKey = async () => {
    setApiKeyStatus('testing');
    setApiKeyMessage('');
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('havenly_gemini_api_key');
        }
        await storage.deleteSecureItem('havenly_gemini_api_key');
      } catch (_) {}
      setApiKeyStatus('idle');
      setApiKeyMessage('Custom key cleared.');
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${trimmed}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        }),
      });

      if (res.ok) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('havenly_gemini_api_key', trimmed);
        }
        await storage.setSecureItem('havenly_gemini_api_key', trimmed);
        setApiKeyStatus('success');
        setApiKeyMessage('Gemini AI connected successfully!');
      } else {
        const errorText = await res.text();
        console.warn('API test failed:', errorText);
        setApiKeyStatus('error');
        setApiKeyMessage(`Verification failed (Status ${res.status}). Verify your key.`);
      }
    } catch (err: any) {
      setApiKeyStatus('error');
      setApiKeyMessage(err?.message || 'Network error connecting to Gemini.');
    }
  };

  const handleToggleTheme = (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode);
  };

  const handleToggleAutoplay = (val: boolean) => {
    updateSettings({
      voice: {
        ...settings.voice,
        autoplay: val,
      },
    });
  };

  const handleSelectVoice = (voiceName: string) => {
    updateSettings({
      voice: {
        ...settings.voice,
        selectedVoice: voiceName,
      },
    });
  };

  const handleSelectLiveVoice = (liveVoiceName: string) => {
    updateSettings({
      voice: {
        ...settings.voice,
        selectedLiveVoice: liveVoiceName,
      },
    });
  };

  const playVoicePreview = (voice: any) => {
    if (Platform.OS !== 'web') {
      try {
        const Speech = require('expo-speech');
        if (isPlayingPreview === voice.name) {
          Speech.stop();
          setIsPlayingPreview(null);
          return;
        }

        Speech.stop();
        setIsPlayingPreview(voice.name);
        Speech.speak("Hello, this is a preview of my voice for your Havenly companion. How do I sound?", {
          voice: voice.identifier,
          onComplete: () => setIsPlayingPreview(null),
          onError: () => setIsPlayingPreview(null),
        });
        return;
      } catch (e) {
        console.warn('Failed preview playback with expo-speech', e);
      }
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    if (isPlayingPreview === voice.name) {
      window.speechSynthesis.cancel();
      setIsPlayingPreview(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello, this is a preview of my voice for your Havenly companion. How do I sound?");
    utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = voice.name.toLowerCase().includes('david') || voice.name.toLowerCase().includes('google uk english male') ? 1.0 : 1.1;

    utterance.onstart = () => setIsPlayingPreview(voice.name);
    utterance.onend = () => setIsPlayingPreview(null);
    utterance.onerror = () => setIsPlayingPreview(null);

    window.speechSynthesis.speak(utterance);
  };

  const playLiveVoicePreview = async (voiceId: string, gender: string) => {
    const previewKey = `live_${voiceId}`;
    if (isPlayingPreview === previewKey) {
      if (typeof window !== 'undefined' && (window as any).__havenlyPreviewSource) {
        try { (window as any).__havenlyPreviewSource.stop(); } catch (_) {}
        (window as any).__havenlyPreviewSource = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingPreview(null);
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        const Speech = require('expo-speech');
        Speech.stop();
        setIsPlayingPreview(previewKey);
        Speech.speak(`Hello! I am ${voiceId}. I will be your companion for live voice sessions.`, {
          rate: 0.93,
          pitch: gender === 'female' ? 0.98 : 0.94,
          onComplete: () => setIsPlayingPreview(null),
          onError: () => setIsPlayingPreview(null),
        });
        return;
      } catch (e) {
        console.warn('Failed preview playback with expo-speech', e);
      }
    }

    if (typeof window === 'undefined') return;

    // 1. Try Gemini studio neural voice preview if API key is present
    if (CONFIG.geminiApiKey) {
      try {
        setIsPlayingPreview(previewKey);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.ttsModel}:generateContent?key=${CONFIG.geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Hello! I am ${voiceId}. I will be your companion for live voice sessions.` }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceId }
                }
              }
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const pcmBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (pcmBase64) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass({ sampleRate: 24000 });
              const binary = atob(pcmBase64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
              const float32 = new Float32Array(int16.length);
              for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

              const buffer = audioCtx.createBuffer(1, float32.length, 24000);
              buffer.getChannelData(0).set(float32);

              const source = audioCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(audioCtx.destination);
              (window as any).__havenlyPreviewSource = source;

              source.onended = () => {
                try { audioCtx.close(); } catch (_) {}
                setIsPlayingPreview(null);
              };

              source.start();
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Gemini audio preview error, falling back:', err);
      }
    }

    // 2. High-fidelity natural browser speech synthesis fallback
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setIsPlayingPreview(previewKey);

    const utterance = new SpeechSynthesisUtterance(`Hello! I am ${voiceId}. I will be your companion for live voice sessions.`);
    const localVoices = window.speechSynthesis.getVoices();
    const englishVoices = localVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));

    let localMatch = null;
    if (gender === 'female') {
      localMatch = englishVoices.find(v => {
        const n = v.name.toLowerCase();
        return (n.includes('natural') || n.includes('enhanced') || n.includes('samantha') || n.includes('ava') || n.includes('jenny') || n.includes('victoria') || n.includes('female')) && !n.includes('compact');
      }) || englishVoices.find(v => v.name.toLowerCase().includes('female')) || englishVoices[0];
    } else {
      localMatch = englishVoices.find(v => {
        const n = v.name.toLowerCase();
        return (n.includes('natural') || n.includes('enhanced') || n.includes('daniel') || n.includes('guy') || n.includes('david') || n.includes('male')) && !n.includes('compact');
      }) || englishVoices.find(v => v.name.toLowerCase().includes('male')) || englishVoices[0];
    }

    if (localMatch) utterance.voice = localMatch;
    utterance.rate = 0.93;
    utterance.pitch = gender === 'female' ? 0.98 : 0.94;

    utterance.onend = () => setIsPlayingPreview(null);
    utterance.onerror = () => setIsPlayingPreview(null);

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleHistory = (val: boolean) => {
    updateSettings({
      privacy: {
        ...settings.privacy,
        historyEnabled: val,
      },
    });
  };

  const handleConfirmClearData = () => {
    resetAllData();
    setClearDataModalVisible(false);
    router.replace('/(auth)/welcome');
  };

  const pageTitle = 
    section === 'appearance' ? 'General Preferences' :
    section === 'voice' ? 'Voice Preferences' :
    section === 'privacy' ? 'Privacy & Data Control' :
    section === 'safety' ? 'Safety & Disclaimer' :
    'Settings';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title={pageTitle} showBackButton />

      <ConfirmationModal
        visible={clearDataModalVisible}
        title="Clear all reflections?"
        message="This action will delete all conversations, settings preferences, and log you out. This action cannot be undone."
        confirmLabel="Clear & Log Out"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleConfirmClearData}
        onCancel={() => setClearDataModalVisible(false)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Theme Settings */}
        {(!section || section === 'appearance') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Appearance</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.text }]}>Sanctuary Theme</Text>
              <View style={styles.themeRow}>
                <TouchableOpacity
                  onPress={() => handleToggleTheme('light')}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: theme === 'light' ? colors.primaryLight : 'transparent',
                      borderColor: theme === 'light' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <IconSun color={theme === 'light' ? colors.primary : colors.textMuted} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.themePillText, { color: theme === 'light' ? colors.primary : colors.text }]}>Light</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleToggleTheme('dark')}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: theme === 'dark' ? colors.primaryLight : 'transparent',
                      borderColor: theme === 'dark' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <IconMoon color={theme === 'dark' ? colors.primary : colors.textMuted} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.themePillText, { color: theme === 'dark' ? colors.primary : colors.text }]}>Dark</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Voice Preferences */}
        {(!section || section === 'voice') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Voice Preferences</Text>
            
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
              <View style={styles.switchRow}>
                <View style={styles.rowInfo}>
                  <IconVolume2 color={colors.text} size={20} style={{ marginRight: 8 }} />
                  <Text style={[styles.label, { color: colors.text }]}>Auto-play voice responses</Text>
                </View>
                <Switch
                  value={settings.voice.autoplay}
                  onValueChange={handleToggleAutoplay}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.voice.autoplay ? colors.primary : '#F4F3F4'}
                />
              </View>
            </View>

            {/* In-app Voice Chat Synthesis Selection */}
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Voice Chat Speaker (TTS)</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
              {/* Auto Voice Option */}
              <TouchableOpacity 
                onPress={() => handleSelectVoice('default')}
                style={[
                  styles.voiceRow,
                  settings.voice.selectedVoice === 'default' && { backgroundColor: colors.secondary }
                ]}
              >
                <View style={styles.voiceInfo}>
                  <IconVolume1 color={colors.primary} size={18} style={{ marginRight: 8 }} />
                  <View>
                    <Text style={[styles.voiceName, { color: colors.text }]}>System Default Voice</Text>
                    <Text style={[styles.voiceMeta, { color: colors.textMuted }]}>Auto-selected warm female register</Text>
                  </View>
                </View>
                {settings.voice.selectedVoice === 'default' && <IconCheck color={colors.primary} size={18} />}
              </TouchableOpacity>

              {/* Loaded Browser Voices */}
              {voices.map((voice, idx) => {
                const isSelected = settings.voice.selectedVoice === voice.name;
                const isPlaying = isPlayingPreview === voice.name;
                const voiceKey = voice.identifier || voice.voiceURI || `${voice.name}_${idx}`;

                return (
                  <View 
                    key={voiceKey} 
                    style={[
                      styles.voiceRow, 
                      isSelected && { backgroundColor: colors.secondary }
                    ]}
                  >
                    <TouchableOpacity 
                      onPress={() => handleSelectVoice(voice.name)}
                      style={styles.voiceClickArea}
                    >
                      <IconVolume1 color={colors.primary} size={18} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.voiceName, { color: colors.text }]} numberOfLines={1}>
                          {voice.name.replace('Microsoft', '').replace('Google', '').trim()}
                        </Text>
                        <Text style={[styles.voiceMeta, { color: colors.textMuted }]}>
                          {voice.lang}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.voiceActions}>
                      <TouchableOpacity 
                        onPress={() => playVoicePreview(voice)}
                        style={[styles.playButton, { backgroundColor: colors.primary }]}
                        accessibilityLabel="Preview voice"
                      >
                        {isPlaying ? <IconSquare color="#FFFFFF" size={10} fill="#FFFFFF" /> : <IconPlay color="#FFFFFF" size={10} fill="#FFFFFF" />}
                      </TouchableOpacity>
                      {isSelected && <IconCheck color={colors.primary} size={18} style={{ marginLeft: 8 }} />}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Gemini Live Voice Selection */}
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Live Call Voice (Gemini Live)</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {GEMINI_LIVE_VOICES.map((voice) => {
                const currentLiveVoice = settings.voice.selectedLiveVoice || 'Puck';
                const isSelected = currentLiveVoice === voice.id;
                const isPlaying = isPlayingPreview === `live_${voice.id}`;

                return (
                  <View 
                    key={voice.id} 
                    style={[
                      styles.voiceRow, 
                      isSelected && { backgroundColor: colors.secondary }
                    ]}
                  >
                    <TouchableOpacity 
                      onPress={() => handleSelectLiveVoice(voice.id)}
                      style={styles.voiceClickArea}
                    >
                      <IconVolume1 color={colors.primary} size={18} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.voiceName, { color: colors.text }]}>{voice.name}</Text>
                        <Text style={[styles.voiceMeta, { color: colors.textMuted }]}>{voice.description}</Text>
                      </View>
                    </TouchableOpacity>

                  <View style={styles.voiceActions}>
                    <TouchableOpacity 
                      onPress={() => playLiveVoicePreview(voice.id, voice.gender)}
                      style={[styles.playButton, { backgroundColor: colors.primary }]}
                      accessibilityLabel="Preview voice"
                    >
                      {isPlaying ? <IconSquare color="#FFFFFF" size={10} fill="#FFFFFF" /> : <IconPlay color="#FFFFFF" size={10} fill="#FFFFFF" />}
                    </TouchableOpacity>
                    {isSelected && <IconCheck color={colors.primary} size={18} style={{ marginLeft: 8 }} />}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

        {/* AI Providers Settings */}
        {(!section || section === 'appearance') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>AI Providers (Free Tier & Backup)</Text>

            {/* OpenRouter Free Models Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <IconKey color={colors.primary} size={18} style={{ marginRight: 8 }} />
                <Text style={[styles.label, { color: colors.text, flex: 1 }]}>OpenRouter API Key (20+ Free Models)</Text>
                <TouchableOpacity onPress={() => setShowOpenRouterKey(!showOpenRouterKey)}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    {showOpenRouterKey ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.infoText, { color: colors.textMuted, marginBottom: 10 }]}>
                Routes dialogue through free models (Gemma, Qwen, Llama, Nemotron) with high availability and no quota burn.
              </Text>
              <TextInput
                value={openRouterKeyInput}
                onChangeText={(val) => {
                  setOpenRouterKeyInput(val);
                  setOpenRouterKeyStatus('idle');
                  setOpenRouterKeyMessage('');
                }}
                secureTextEntry={!showOpenRouterKey}
                placeholder="Paste your OpenRouter API key (sk-or-v1-...)"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.apiKeyInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: openRouterKeyStatus === 'error' ? colors.error : openRouterKeyStatus === 'success' ? colors.success : colors.border,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity
                  onPress={handleSaveOpenRouterKey}
                  disabled={openRouterKeyStatus === 'testing'}
                  style={[styles.saveKeyBtn, { backgroundColor: colors.primary }]}
                >
                  {openRouterKeyStatus === 'testing' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Verify & Save</Text>
                  )}
                </TouchableOpacity>
                {openRouterKeyStatus === 'success' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconCheck color={colors.success} size={16} style={{ marginRight: 4 }} />
                    <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>Connected</Text>
                  </View>
                )}
              </View>
              {openRouterKeyMessage ? (
                <Text
                  style={{
                    color: openRouterKeyStatus === 'error' ? colors.error : colors.textMuted,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {openRouterKeyMessage}
                </Text>
              ) : null}
            </View>

            {/* Google Gemini AI Engine Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <IconKey color={colors.primary} size={18} style={{ marginRight: 8 }} />
                <Text style={[styles.label, { color: colors.text, flex: 1 }]}>Google Gemini API Key (500 RPD)</Text>
                <TouchableOpacity onPress={() => setShowKey(!showKey)}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    {showKey ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.infoText, { color: colors.textMuted, marginBottom: 10 }]}>
                Gemini 3.5 Flash Lite text engine. Key is saved locally on your device.
              </Text>
              <TextInput
                value={apiKeyInput}
                onChangeText={(val) => {
                  setApiKeyInput(val);
                  setApiKeyStatus('idle');
                  setApiKeyMessage('');
                }}
                secureTextEntry={!showKey}
                placeholder="Paste your Gemini API key (AIza... or AQ...)"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.apiKeyInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: apiKeyStatus === 'error' ? colors.error : apiKeyStatus === 'success' ? colors.success : colors.border,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity
                  onPress={handleSaveApiKey}
                  disabled={apiKeyStatus === 'testing'}
                  style={[styles.saveKeyBtn, { backgroundColor: colors.primary }]}
                >
                  {apiKeyStatus === 'testing' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Verify & Save</Text>
                  )}
                </TouchableOpacity>
                {apiKeyStatus === 'success' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconCheck color={colors.success} size={16} style={{ marginRight: 4 }} />
                    <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>Connected</Text>
                  </View>
                )}
              </View>
              {apiKeyMessage ? (
                <Text
                  style={{
                    color: apiKeyStatus === 'error' ? colors.error : colors.textMuted,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {apiKeyMessage}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Privacy Settings */}
        {(!section || section === 'privacy') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Privacy Control</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.switchRow}>
                <View style={styles.rowInfo}>
                  <IconShield color={colors.text} size={20} style={{ marginRight: 8 }} />
                  <Text style={[styles.label, { color: colors.text }]}>Save conversation history</Text>
                </View>
                <Switch
                  value={settings.privacy.historyEnabled}
                  onValueChange={handleToggleHistory}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.privacy.historyEnabled ? colors.primary : '#F4F3F4'}
                />
              </View>

              <TouchableOpacity 
                onPress={() => setClearDataModalVisible(true)}
                style={styles.destructiveBtn}
              >
                <Text style={[styles.destructiveText, { color: colors.error }]}>
                  Clear all data & Reset
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Disclaimer / Safety Info */}
        {(!section || section === 'safety') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Safety & Disclaimer</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.infoBlock}>
                <IconAlertTriangle color={colors.error} size={18} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  HavenlyAI is an emotional-support companion, NOT a replacement for a licensed therapist, doctor, emergency services, or human crisis hotline.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Version info */}
        <View style={styles.aboutContainer}>
          <IconInfo color={colors.textMuted} size={16} style={{ marginRight: 6 }} />
          <Text style={[styles.aboutText, { color: colors.textMuted }]}>
            HavenlyAI v1.0.0 · Your sanctuary is private.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.xl,
  },
  section: {
    marginBottom: LAYOUT.spacing.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.xs,
  },
  subSectionTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
    marginTop: LAYOUT.spacing.md,
    marginBottom: 6,
    paddingHorizontal: LAYOUT.spacing.xs,
  },
  card: {
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    padding: LAYOUT.spacing.md,
    shadowColor: 'rgba(0,0,0,0.01)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: LAYOUT.spacing.sm,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    marginRight: LAYOUT.spacing.sm,
  },
  themePillText: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    borderRadius: LAYOUT.borderRadius.small,
  },
  voiceClickArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceName: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
  },
  voiceMeta: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: 1,
  },
  voiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtn: {
    marginTop: LAYOUT.spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  destructiveText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '700',
  },
  infoBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: LAYOUT.spacing.sm,
    marginTop: 2,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  aboutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: LAYOUT.spacing.md,
  },
  aboutText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  apiKeyInput: {
    borderRadius: LAYOUT.borderRadius.small,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  saveKeyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: LAYOUT.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
});
