import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { VoiceSessionState } from '../../types';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface LiveConnectionStateProps {
  state: VoiceSessionState;
  subtext?: string;
}

export const LiveConnectionState: React.FC<LiveConnectionStateProps> = ({ state, subtext }) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const getStateText = (): string => {
    switch (state) {
      case 'idle':
        return 'Ready to talk';
      case 'requesting':
        return 'Creating your private sanctuary...';
      case 'connecting':
        return 'Connecting to HavenlyAI...';
      case 'connected':
        return "I'm listening.";
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Understanding...';
      case 'speaking':
        return 'HavenlyAI is speaking';
      case 'interrupted':
        return 'Listening...';
      case 'reconnecting':
        return 'Trying to reconnect...';
      case 'ended':
        return 'Conversation ended';
      case 'error':
        return "We couldn't keep the conversation connected.";
      default:
        return '';
    }
  };

  const getSubtext = (): string => {
    if (subtext) {
      return subtext;
    }
    if (state === 'connected' || state === 'listening' || state === 'interrupted') {
      return '"Take your time."';
    }
    if (state === 'thinking') {
      return 'Processing your thoughts...';
    }
    if (state === 'reconnecting') {
      // Reassuring copy
      return 'Hang tight, we are finding our path back.';
    }
    return '';
  };

  const showLoading = state === 'requesting' || state === 'connecting' || state === 'reconnecting';

  return (
    <View style={styles.container}>
      {showLoading && (
        <ActivityIndicator 
          size="small" 
          color={colors.primary} 
          style={styles.spinner} 
        />
      )}
      <Text style={[styles.mainText, { color: colors.text }]}>{getStateText()}</Text>
      {getSubtext() !== '' && (
        <Text style={[styles.subText, { color: colors.textMuted }]} numberOfLines={2}>{getSubtext()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.md,
    height: 60,
  },
  spinner: {
    marginBottom: LAYOUT.spacing.xs,
  },
  mainText: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
});
export default LiveConnectionState;
