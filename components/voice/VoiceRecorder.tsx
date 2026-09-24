import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Mic, Pause, Play, Trash2, Send } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { audioService } from '../../services/audio/audioService';
import { formatDuration } from '../../utils/formatters';

const IconMic = Mic as any;
const IconPause = Pause as any;
const IconPlay = Play as any;
const IconTrash2 = Trash2 as any;
const IconSend = Send as any;

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, durationSec: number, transcript?: string) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const timerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start breathing animation for the mic button
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isRecording && !isPaused) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      Animated.spring(pulseAnim, {
        toValue: 1.0,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (anim) anim.stop();
    };
  }, [isRecording, isPaused]);

  const handleStart = async () => {
    try {
      await audioService.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePause = async () => {
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
      console.warn(e);
    }
  };

  const handleStopAndSend = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const { uri, durationMs, transcript } = await audioService.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      
      if (uri) {
        onRecordingComplete(uri, Math.max(1, Math.floor(durationMs / 1000)), transcript);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDiscard = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await audioService.stopRecording(); // Unloads & discards
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      onCancel();
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {!isRecording ? 'Record a Voice Note' : isPaused ? 'Recording Paused' : 'Listening to you...'}
      </Text>
      
      <Text style={[styles.duration, { color: colors.primary }]}>
        {formatDuration(duration)}
      </Text>

      <View style={styles.controlsRow}>
        {isRecording ? (
          <>
            <TouchableOpacity 
              onPress={handleDiscard}
              style={[styles.smallBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              accessibilityLabel="Discard recording"
            >
              <IconTrash2 color={colors.error} size={20} />
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={handlePause}
                style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
              >
                {isPaused ? <IconPlay color="#FFFFFF" size={26} fill="#FFFFFF" /> : <IconPause color="#FFFFFF" size={26} />}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity 
              onPress={handleStopAndSend}
              style={[styles.smallBtn, { backgroundColor: colors.primaryLight }]}
              accessibilityLabel="Send voice note"
            >
              <IconSend color={colors.primary} size={20} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={handleStart}
            style={[styles.mainBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Start voice recording"
          >
            <IconMic color="#FFFFFF" size={28} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
    marginBottom: LAYOUT.spacing.sm,
  },
  duration: {
    ...TYPOGRAPHY.hero,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: LAYOUT.spacing.lg,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mainBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: LAYOUT.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  smallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
export default VoiceRecorder;
