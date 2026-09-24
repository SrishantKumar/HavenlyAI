import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  Animated, 
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Mic, Trash2, Pause, Play, Square } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { audioService } from '../../services/audio/audioService';
import { formatDuration } from '../../utils/formatters';
import Waveform from '../ui/Waveform';
import PermissionPrompt from '../ui/PermissionPrompt';

const IconSend = Send as any;
const IconMic = Mic as any;
const IconTrash2 = Trash2 as any;
const IconPause = Pause as any;
const IconPlay = Play as any;

interface ChatComposerProps {
  onSendText: (text: string) => void;
  onSendVoice: (uri: string, durationSec: number) => void;
  isSending?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendText,
  onSendVoice,
  isSending = false,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;
  const insets = useSafeAreaInsets();

  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const timerRef = useRef<any>(null);

  // Send Text Message
  const handleSend = () => {
    if (!text.trim() || isSending) return;
    onSendText(text.trim());
    setText('');
    Keyboard.dismiss();
  };

  // Toggle Microphone / Start recording
  const handleMicPress = async () => {
    // Check permission status
    const micStatus = useAppStore.getState().microphonePermission;
    if (micStatus !== 'granted') {
      const granted = await audioService.requestMicrophonePermission();
      if (granted) {
        useAppStore.getState().setMicrophonePermission('granted');
      } else {
        setShowPermissionPrompt(true);
        return;
      }
    }

    try {
      await audioService.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start duration counter
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.warn('Failed to start recording', e);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        await audioService.resumeRecording();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      } else {
        await audioService.pauseRecording();
        setIsPaused(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch (e) {
      console.warn('Pause/Resume audio failed', e);
    }
  };

  const handleCancel = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await audioService.stopRecording(); // Discards and stops
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
    } catch (e) {
      console.warn('Cancel recording error', e);
    }
  };

  const handleSendVoice = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      const { uri, durationMs } = await audioService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      
      if (uri) {
        onSendVoice(uri, Math.floor(durationMs / 1000));
      }
      setDuration(0);
    } catch (e) {
      console.warn('Send voice error', e);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (isRecording) {
    return (
      <View style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : LAYOUT.spacing.sm
        }
      ]}>
        <View style={styles.recordingRow}>
          <TouchableOpacity 
            onPress={handleCancel}
            style={[styles.actionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            accessibilityLabel="Discard voice message"
          >
            <IconTrash2 color={colors.error} size={20} />
          </TouchableOpacity>

          <View style={styles.waveformWrapper}>
            <Text style={[styles.recordingStateText, { color: colors.textMuted }]}>
              {isPaused ? 'Paused' : 'Listening...'}
            </Text>
            <Waveform isPlaying={!isPaused} height={20} barCount={10} color={colors.primary} />
            <Text style={[styles.timerText, { color: colors.text }]}>{formatDuration(duration)}</Text>
          </View>

          <TouchableOpacity 
            onPress={handlePauseResume}
            style={[styles.actionIconBtn, { backgroundColor: colors.secondary }]}
            accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
          >
            {isPaused ? <IconPlay color={colors.primary} size={18} fill={colors.primary} /> : <IconPause color={colors.primary} size={18} />}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSendVoice}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Send voice message"
          >
            <IconSend color="#FFFFFF" size={18} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom > 0 ? insets.bottom : LAYOUT.spacing.sm
      }
    ]}>
      <PermissionPrompt
        visible={showPermissionPrompt}
        onAllow={async () => {
          setShowPermissionPrompt(false);
          const granted = await audioService.requestMicrophonePermission();
          if (granted) {
            useAppStore.getState().setMicrophonePermission('granted');
            handleMicPress();
          }
        }}
        onCancel={() => setShowPermissionPrompt(false)}
      />

      <View style={styles.inputRow}>
        <TextInput
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!isSending}
        />

        {text.trim().length > 0 ? (
          <TouchableOpacity 
            onPress={handleSend}
            disabled={isSending}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Send text message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <IconSend color="#FFFFFF" size={18} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={handleMicPress}
            disabled={isSending}
            style={[styles.micBtn, { backgroundColor: colors.secondary }]}
            accessibilityLabel="Record voice message"
          >
            <IconMic color={colors.primary} size={20} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    paddingBottom: 24, // Account for bottom safe area spacing
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: LAYOUT.borderRadius.large,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginRight: LAYOUT.spacing.sm,
    maxHeight: 100,
    ...TYPOGRAPHY.body,
    fontSize: 15,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.spacing.sm,
  },
  waveformWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.sm,
  },
  recordingStateText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '600',
    width: 70,
  },
  timerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
});
export default ChatComposer;
