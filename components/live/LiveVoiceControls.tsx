import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Mic, MicOff, X } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

const IconMic = Mic as any;
const IconMicOff = MicOff as any;
const IconX = X as any;

interface LiveVoiceControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndSession: () => void;
  disabled?: boolean;
}

export const LiveVoiceControls: React.FC<LiveVoiceControlsProps> = ({
  isMuted,
  onToggleMute,
  onEndSession,
  disabled = false,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={styles.container}>
      {/* Mute/Unmute microphone */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleMute}
        disabled={disabled}
        style={[
          styles.controlBtn,
          { 
            backgroundColor: isMuted ? colors.error : colors.secondary,
            opacity: disabled ? 0.5 : 1
          }
        ]}
        accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isMuted }}
      >
        {isMuted ? (
          <IconMicOff color="#FFFFFF" size={24} />
        ) : (
          <IconMic color={colors.primary} size={24} />
        )}
      </TouchableOpacity>

      {/* End conversation */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onEndSession}
        style={[styles.endBtn, { backgroundColor: colors.error }]}
        accessibilityLabel="End voice conversation"
        accessibilityRole="button"
      >
        <IconX color="#FFFFFF" size={28} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: LAYOUT.spacing.lg,
    width: '100%',
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: LAYOUT.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: LAYOUT.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
export default LiveVoiceControls;
