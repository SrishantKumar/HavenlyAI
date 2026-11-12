import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium';
  variant?: 'default' | 'accent' | 'success';
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  onPress,
  style,
  textStyle,
  size = 'medium',
  variant = 'default',
}) => {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const isSmall = size === 'small';

  const getBackgroundColor = () => {
    if (selected) {
      if (variant === 'accent') return colors.accent;
      if (variant === 'success') return colors.success;
      return colors.primary;
    }
    return isDark ? 'rgba(39, 39, 42, 0.7)' : '#F3F4F6';
  };

  const getBorderColor = () => {
    if (selected) return 'transparent';
    return colors.border;
  };

  const getTextColor = () => {
    if (selected) return '#FFFFFF';
    return colors.text;
  };

  const content = (
    <View style={styles.innerRow}>
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          {
            fontSize: isSmall ? 12 : 14,
            color: getTextColor(),
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[
          styles.chip,
          {
            paddingVertical: isSmall ? 6 : 9,
            paddingHorizontal: isSmall ? 10 : 14,
            borderRadius: LAYOUT.borderRadius.full,
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
          },
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.chip,
        {
          paddingVertical: isSmall ? 6 : 9,
          paddingHorizontal: isSmall ? 10 : 14,
          borderRadius: LAYOUT.borderRadius.full,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        style,
      ]}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: 6,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
});

export default Chip;

