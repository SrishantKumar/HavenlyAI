import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { EmotionType } from '../../types';

interface EmotionSelectorProps {
  selectedEmotion: EmotionType | null;
  onSelectEmotion: (emotion: EmotionType) => void;
}

const EMOTIONS: { type: EmotionType; label: string; emoji: string; color: string }[] = [
  { type: 'okay', label: "I'm okay", emoji: '😌', color: '#10B981' },
  { type: 'low', label: 'A little low', emoji: '☁️', color: '#60A5FA' },
  { type: 'stressed', label: 'Stressed', emoji: '🌪️', color: '#FBBF24' },
  { type: 'overwhelmed', label: 'Overwhelmed', emoji: '🌊', color: '#F87171' },
  { type: 'lonely', label: 'Lonely', emoji: '🕯️', color: '#C084FC' },
  { type: 'talk', label: 'Need to talk', emoji: '💬', color: '#06B6D4' },
];

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  selectedEmotion,
  onSelectEmotion,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>How are you feeling right now?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {EMOTIONS.map((item) => {
          const isSelected = selectedEmotion === item.type;
          return (
            <TouchableOpacity
              key={item.type}
              activeOpacity={0.7}
              onPress={() => onSelectEmotion(item.type)}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected 
                    ? (isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.08)')
                    : colors.surface,
                  borderColor: isSelected 
                    ? colors.primary 
                    : colors.border,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text 
                style={[
                  styles.label, 
                  { 
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400'
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: LAYOUT.spacing.sm,
  },
  title: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.xs,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.borderRadius.xLarge,
    borderWidth: 1,
    marginHorizontal: 4,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
  },
});
export default EmotionSelector;
