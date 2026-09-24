import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import Header from '../../components/ui/Header';
import VoiceRecorder from '../../components/voice/VoiceRecorder';
import AudioPlayer from '../../components/voice/AudioPlayer';
import GlassCard from '../../components/ui/GlassCard';

export default function VoiceNoteScreen() {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [aiTextResponse, setAiTextResponse] = useState<string | null>(null);

  const handleRecordingComplete = async (uri: string, durationSec: number, transcript?: string) => {
    setLoading(true);
    setTranscription(transcript || '');
    setAiTextResponse(null);
    setAiAudioUrl(null);
    
    try {
      // Trigger Audio upload and transcription analysis
      const messages = await api.uploadAudio(uri, 'e0c8d154-1b1d-4eb4-bc6c-17865bc44a80', transcript);
      
      const userMsg = messages[0];
      const assistantMsg = messages[1];

      if (transcript) {
        setTranscription(transcript);
      } else if (userMsg && userMsg.content && userMsg.content !== 'Voice message sent to HavenlyAI') {
        setTranscription(userMsg.content);
      }
      setAiTextResponse(assistantMsg.content);
      // Playable audio URL
      setAiAudioUrl(assistantMsg.audioUrl || null);
    } catch (e) {
      console.warn('Failed to process voice reflection', e);
      setTranscription("We couldn't analyze the audio right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Voice Reflections" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Talk it out</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Sometimes saying it out loud makes things feel a little lighter.
          </Text>
        </View>

        {/* Central Voice Recorder */}
        <View style={styles.recorderContainer}>
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={() => {}}
          />
        </View>

        {/* Response States */}
        {loading && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              Listening to your reflection...
            </Text>
          </View>
        )}

        {/* User Spoken Reflection */}
        {transcription && transcription !== "We couldn't analyze the audio right now. Please try again." ? (
          <View style={styles.transcriptContainer}>
            <GlassCard style={styles.transcriptCard}>
              <Text style={[styles.transcriptHeader, { color: colors.textMuted }]}>What You Shared</Text>
              <Text style={[styles.transcriptBody, { color: colors.text }]}>"{transcription}"</Text>
            </GlassCard>
          </View>
        ) : null}

        {aiTextResponse && (
          <View style={styles.responseContainer}>
            <GlassCard style={styles.responseCard}>
              <Text style={[styles.responseHeader, { color: colors.primary }]}>HavenlyAI Response</Text>
              <Text style={[styles.responseText, { color: colors.text }]}>{aiTextResponse}</Text>
              
              {aiAudioUrl && (
                <View style={styles.playerWrapper}>
                  <AudioPlayer 
                    audioUrl={aiAudioUrl} 
                    durationSec={Math.max(4, Math.round((aiTextResponse?.length || 60) * 0.08))} 
                  />
                </View>
              )}
            </GlassCard>
          </View>
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
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.xl,
  },
  introContainer: {
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.md,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtext: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  recorderContainer: {
    marginVertical: LAYOUT.spacing.md,
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
  responseContainer: {
    marginVertical: LAYOUT.spacing.md,
  },
  responseCard: {
    padding: LAYOUT.spacing.md,
  },
  responseHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: LAYOUT.spacing.sm,
  },
  responseText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: LAYOUT.spacing.md,
  },
  transcriptContainer: {
    marginVertical: LAYOUT.spacing.sm,
  },
  transcriptCard: {
    padding: LAYOUT.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
  },
  transcriptHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  transcriptBody: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  playerWrapper: {
    marginTop: LAYOUT.spacing.sm,
  },
});
