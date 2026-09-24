import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Play, Pause, Volume2 } from 'lucide-react-native';
import { Message } from '../../types';

const IconPlay = Play as any;
const IconPause = Pause as any;
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { formatFriendlyDate, formatDuration } from '../../utils/formatters';
import { audioService } from '../../services/audio/audioService';
import Waveform from '../ui/Waveform';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isVoice = message.messageType === 'voice';

  // Audio playing states
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((message.duration || 0) * 1000);

  const handlePlayPause = async () => {
    if (!message.audioUrl) return;

    try {
      if (isPlaying) {
        await audioService.pausePlayback();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        await audioService.play(message.audioUrl, (status) => {
          if (status.isLoaded) {
            setPositionMs(status.positionMillis);
            if (status.durationMillis) {
              setDurationMs(status.durationMillis);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPositionMs(0);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Audio playback error', e);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      // Auto-stop audio if component unmounts
      if (isPlaying) {
        audioService.stopPlayback();
      }
    };
  }, [isPlaying]);

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={[styles.systemText, { color: colors.textMuted }]}>
          {message.content}
        </Text>
      </View>
    );
  }

  return (
    <View 
      style={[
        styles.bubbleWrapper, 
        isUser ? styles.userWrapper : styles.assistantWrapper
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser 
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 }
        ]}
      >
        {isVoice ? (
          <View style={styles.voiceContainer}>
            <TouchableOpacity 
              onPress={handlePlayPause}
              style={[
                styles.playBtn, 
                { backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : colors.secondary }
              ]}
              accessibilityLabel={isPlaying ? 'Pause audio message' : 'Play audio message'}
            >
              {isPlaying ? (
                <IconPause color={isUser ? '#FFFFFF' : colors.primary} size={16} />
              ) : (
                <IconPlay color={isUser ? '#FFFFFF' : colors.primary} size={16} fill={isUser ? '#FFFFFF' : colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.waveformContainer}>
              <Waveform 
                isPlaying={isPlaying} 
                color={isUser ? '#FFFFFF' : colors.primary}
                barCount={12}
                height={26}
              />
              <Text 
                style={[
                  styles.durationText, 
                  { color: isUser ? 'rgba(255,255,255,0.8)' : colors.textMuted }
                ]}
              >
                {formatDuration(isPlaying ? positionMs / 1000 : durationMs / 1000)}
              </Text>
            </View>
          </View>
        ) : (
          <Text 
            style={[
              styles.text, 
              { color: isUser ? '#FFFFFF' : colors.text }
            ]}
          >
            {message.content}
          </Text>
        )}
      </View>
      <Text style={[styles.timeText, { color: colors.textMuted }]}>
        {formatFriendlyDate(message.timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleWrapper: {
    marginVertical: LAYOUT.spacing.sm,
    maxWidth: '82%',
  },
  userWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: LAYOUT.borderRadius.medium,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: 'rgba(0,0,0,0.01)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 1,
  },
  text: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 22,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
  },
  systemContainer: {
    alignSelf: 'center',
    marginVertical: LAYOUT.spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.small,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  systemText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    textAlign: 'center',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 170,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.spacing.sm,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginLeft: 6,
  },
});
export default ChatBubble;
