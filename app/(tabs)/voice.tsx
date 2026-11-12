import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneOff, Mic, Sparkles, Volume2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { useQuestStore } from '../../store/useQuestStore';
import { api } from '../../services/api';
import Header from '../../components/ui/Header';
import HavenlyOrb from '../../components/havenly/HavenlyOrb';
import VoiceRecorder from '../../components/voice/VoiceRecorder';
import AudioPlayer from '../../components/voice/AudioPlayer';
import Waveform from '../../components/ui/Waveform';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { edgeTtsService } from '../../services/audio/edgeTtsService';
import { playbackService } from '../../services/audio/playbackService';
import { OrbState } from '../../types';

const IconPhoneOff = PhoneOff as any;
const IconMic = Mic as any;
const IconSparkles = Sparkles as any;
const IconVolume2 = Volume2 as any;

export default function VoiceNoteScreen() {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const orbLevel = useQuestStore((state) => state.level);
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(false);
  const [orbVisualState, setOrbVisualState] = useState<OrbState>('idle');
  const [transcription, setTranscription] = useState('');
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [aiTextResponse, setAiTextResponse] = useState<string | null>(null);

  const handleRecordingComplete = async (uri: string, durationSec: number, transcript?: string) => {
    setLoading(true);
    setOrbVisualState('thinking');
    setTranscription(transcript || '');
    setAiTextResponse(null);
    setAiAudioUrl(null);

    try {
      const messages = await api.uploadAudio(uri, 'e0c8d154-1b1d-4eb4-bc6c-17865bc44a80', transcript);
      const userMsg = messages[0];
      const assistantMsg = messages[1];

      if (transcript) {
        setTranscription(transcript);
      } else if (userMsg && userMsg.content && userMsg.content !== 'Voice message sent to HavenlyAI') {
        setTranscription(userMsg.content);
      }
      setAiTextResponse(assistantMsg.content);

      // Playback response with Edge TTS or fallback
      try {
        setOrbVisualState('speaking');
        const speechUri = await edgeTtsService.generateAndDownloadSpeech(assistantMsg.content);
        if (speechUri) {
          setAiAudioUrl(speechUri);
          await playbackService.playHavenResponse(speechUri);
        } else {
          setAiAudioUrl(assistantMsg.audioUrl || null);
        }
      } catch (ttsErr) {
        console.warn('Edge TTS playback issue:', ttsErr);
      } finally {
        setTimeout(() => setOrbVisualState('idle'), 2500);
      }
    } catch (e) {
      console.warn('Voice reflection error:', e);
      setOrbVisualState('error');
      setTranscription("We couldn't analyze the audio right now. Please try again.");
      setTimeout(() => setOrbVisualState('idle'), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSpeaking = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    playbackService.stopPlayback();
    setOrbVisualState('idle');
  };

  // State label & color
  const getStateInfo = () => {
    if (loading || orbVisualState === 'thinking') {
      return { label: 'Thinking...', color: colors.accent };
    }
    if (orbVisualState === 'speaking') {
      return { label: 'Speaking...', color: colors.primary };
    }
    if (orbVisualState === 'listening') {
      return { label: 'Listening to your voice...', color: colors.success };
    }
    return { label: 'Ready to listen', color: colors.textMuted };
  };

  const stateInfo = getStateInfo();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Voice Sanctuary" rightAction="safety" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Speak with Haven</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Say what is on your mind freely. No judgment, only calm presence.
          </Text>
        </View>

        {/* Larger Mascot Orb */}
        <View style={styles.orbContainer}>
          <HavenlyOrb
            size={180}
            state={orbVisualState}
            level={orbLevel}
          />

          {/* Active State Badge */}
          <View
            style={[
              styles.statePill,
              {
                backgroundColor: isDark ? 'rgba(39, 39, 42, 0.8)' : '#F3F4F6',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: stateInfo.color }]} />
            <Text style={[styles.stateLabel, { color: colors.text }]}>
              {stateInfo.label}
            </Text>
          </View>
        </View>

        {/* Active Audio Waveform indicator when speaking */}
        {orbVisualState === 'speaking' && (
          <View style={styles.waveformRow}>
            <Waveform isPlaying={true} color={colors.primary} barCount={24} height={36} />
          </View>
        )}

        {/* Central Voice Recorder */}
        <View style={styles.recorderContainer}>
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={() => setOrbVisualState('idle')}
          />
        </View>

        {/* Big Stop Speaking Hang-Up Button when Haven is speaking */}
        {orbVisualState === 'speaking' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleStopSpeaking}
            style={[styles.hangUpBtn, { backgroundColor: colors.error }]}
            accessibilityRole="button"
            accessibilityLabel="Stop audio response"
          >
            <IconPhoneOff color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.hangUpBtnText}>Pause Response</Text>
          </TouchableOpacity>
        )}

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              Listening deeply to your reflection...
            </Text>
          </View>
        )}

        {/* Spoken Reflection Transcript */}
        {transcription && transcription !== "We couldn't analyze the audio right now. Please try again." ? (
          <Card style={styles.transcriptCard} variant="subtle">
            <Text style={[styles.cardHeaderLabel, { color: colors.textMuted }]}>
              What you shared:
            </Text>
            <Text style={[styles.transcriptBody, { color: colors.text }]}>
              "{transcription}"
            </Text>
          </Card>
        ) : null}

        {/* Haven AI Response Card */}
        {aiTextResponse && (
          <Card style={styles.responseCard} variant="elevated">
            <View style={styles.responseHeaderRow}>
              <IconSparkles color={colors.primary} size={15} style={{ marginRight: 6 }} />
              <Text style={[styles.responseHeader, { color: colors.primary }]}>Haven</Text>
            </View>
            <Text style={[styles.responseText, { color: colors.text }]}>
              {aiTextResponse}
            </Text>

            {aiAudioUrl && (
              <View style={styles.playerWrapper}>
                <AudioPlayer
                  audioUrl={aiAudioUrl}
                  durationSec={Math.max(4, Math.round((aiTextResponse?.length || 60) * 0.08))}
                />
              </View>
            )}
          </Card>
        )}
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
    paddingTop: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.xl,
  },
  introContainer: {
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.sm,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtext: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: LAYOUT.borderRadius.full,
    borderWidth: 1,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stateLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  waveformRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  recorderContainer: {
    marginVertical: LAYOUT.spacing.md,
  },
  hangUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: LAYOUT.borderRadius.full,
    marginVertical: 12,
    minHeight: 44,
  },
  hangUpBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: LAYOUT.spacing.lg,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  transcriptCard: {
    padding: LAYOUT.spacing.md,
    marginVertical: LAYOUT.spacing.sm,
  },
  cardHeaderLabel: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  transcriptBody: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  responseCard: {
    padding: LAYOUT.spacing.md,
    marginVertical: LAYOUT.spacing.sm,
  },
  responseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  responseHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '700',
  },
  responseText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: LAYOUT.spacing.md,
  },
  playerWrapper: {
    marginTop: LAYOUT.spacing.xs,
  },
});
