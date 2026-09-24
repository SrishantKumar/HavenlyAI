import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

const IconPlay = Play as any;
const IconPause = Pause as any;
const IconRotateCcw = RotateCcw as any;
import { audioService } from '../../services/audio/audioService';
import { formatDuration } from '../../utils/formatters';
import Waveform from '../ui/Waveform';

interface AudioPlayerProps {
  audioUrl: string;
  durationSec: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  durationSec,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(durationSec * 1000);
  const [speed, setSpeed] = useState(1.0);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioService.pausePlayback();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        await audioService.play(audioUrl, (status) => {
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
      console.warn('Failed to toggle play state', e);
      setIsPlaying(false);
    }
  };

  const handleReplay = async () => {
    try {
      await audioService.seekPlayback(0);
      if (!isPlaying) {
        handlePlayPause();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleSpeed = async () => {
    let nextSpeed = 1.0;
    if (speed === 1.0) nextSpeed = 1.25;
    else if (speed === 1.25) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2.0;

    setSpeed(nextSpeed);
    try {
      await audioService.setPlaybackSpeed(nextSpeed);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    return () => {
      audioService.stopPlayback();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>Voice Response</Text>
        <TouchableOpacity onPress={toggleSpeed} style={[styles.speedBtn, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.speedText, { color: colors.primary }]}>{speed}x</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.playerRow}>
        <TouchableOpacity 
          onPress={handlePlayPause}
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? <IconPause color="#FFFFFF" size={20} /> : <IconPlay color="#FFFFFF" size={20} fill="#FFFFFF" />}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleReplay}
          style={[styles.controlBtn, { backgroundColor: colors.secondary }]}
          accessibilityLabel="Replay audio"
        >
          <IconRotateCcw color={colors.primary} size={16} />
        </TouchableOpacity>

        <View style={styles.waveformWrapper}>
          <Waveform isPlaying={isPlaying} barCount={20} height={32} color={colors.primary} />
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatDuration(positionMs / 1000)}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatDuration(durationMs / 1000)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    width: '100%',
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.spacing.sm,
  },
  title: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '600',
  },
  speedBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: LAYOUT.borderRadius.small,
  },
  speedText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.spacing.sm,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.spacing.md,
  },
  waveformWrapper: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
});
export default AudioPlayer;
