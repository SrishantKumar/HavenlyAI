import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';

const IconChevronDown = ChevronDown as any;
const IconChevronUp = ChevronUp as any;
import { useAppStore } from '../../store/useAppStore';
import HavenlyOrb from '../havenly/HavenlyOrb';
import LiveConnectionState from './LiveConnectionState';
import LiveVoiceControls from './LiveVoiceControls';

interface LiveVoiceRoomProps {
  onEndSession: () => void;
  transcript: { text: string; role: 'user' | 'model' }[];
}

export const LiveVoiceRoom: React.FC<LiveVoiceRoomProps> = ({
  onEndSession,
  transcript,
}) => {
  const { voiceSessionState, isMuted, setIsMuted } = useAppStore();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [showTranscript, setShowTranscript] = useState(true);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const latestTranscript = transcript.length > 0 ? transcript[transcript.length - 1].text : undefined;

  return (
    <View style={styles.container}>
      {/* Central Sanctuary Display */}
      <View style={styles.sanctuaryArea}>
        <HavenlyOrb size={150} />
        <LiveConnectionState state={voiceSessionState} subtext={latestTranscript} />
      </View>

      {/* Collapsible Transcript Section */}
      <View style={[styles.transcriptContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowTranscript(!showTranscript)}
          style={styles.transcriptHeader}
        >
          <Text style={[styles.transcriptTitle, { color: colors.text }]}>
            Live Transcript (Optional)
          </Text>
          {showTranscript ? (
            <IconChevronDown color={colors.text} size={20} />
          ) : (
            <IconChevronUp color={colors.text} size={20} />
          )}
        </TouchableOpacity>

        {showTranscript && (
          <ScrollView
            style={[styles.scrollArea, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {transcript.length === 0 ? (
              <Text style={[styles.emptyTranscriptText, { color: colors.textMuted }]}>
                Speak to start the conversation transcript...
              </Text>
            ) : (
              transcript.map((item, idx) => (
                <View key={idx} style={styles.transcriptLine}>
                  <Text
                    style={[
                      styles.roleText,
                      { color: item.role === 'user' ? colors.primary : colors.cyanAccent },
                    ]}
                  >
                    {item.role === 'user' ? 'You: ' : 'HavenlyAI: '}
                  </Text>
                  <Text style={[styles.lineText, { color: colors.text }]}>
                    {item.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Control Actions Panel */}
      <LiveVoiceControls
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onEndSession={onEndSession}
        disabled={voiceSessionState === 'idle' || voiceSessionState === 'requesting'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sanctuaryArea: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  transcriptContainer: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 180,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  transcriptTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollArea: {
    height: 120,
    width: '100%',
  },
  scrollContent: {
    padding: LAYOUT.spacing.md,
  },
  emptyTranscriptText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: LAYOUT.spacing.sm,
  },
  transcriptLine: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  roleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 80,
  },
  lineText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
export default LiveVoiceRoom;
