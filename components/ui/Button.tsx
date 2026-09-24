import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  Platform 
} from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const themeMode = useAppStore((state) => state.theme);
  const isDark = themeMode === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: LAYOUT.borderRadius.full, // pill shaped buttons feel more modern
      opacity: disabled || loading ? 0.6 : 1,
      borderWidth: 1,
      borderColor: 'transparent',
      ...Platform.select({
        web: {
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          userSelect: 'none',
        } as any,
      }),
    };

    // Variant mapping
    if (variant === 'primary') {
      baseStyle.backgroundColor = colors.primary;
      // Add subtle glow and inner border simulation for premium feel
      baseStyle.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)';
      baseStyle.shadowColor = colors.primary;
      baseStyle.shadowOffset = { width: 0, height: 4 };
      baseStyle.shadowOpacity = 0.4;
      baseStyle.shadowRadius = 12;
      baseStyle.elevation = 6;
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = colors.secondary;
      baseStyle.borderColor = colors.border;
    } else if (variant === 'text') {
      baseStyle.backgroundColor = 'transparent';
    } else if (variant === 'danger') {
      baseStyle.backgroundColor = colors.error;
    }

    // Size padding mapping
    if (size === 'small') {
      baseStyle.paddingVertical = 8;
      baseStyle.paddingHorizontal = 18;
    } else if (size === 'medium') {
      baseStyle.paddingVertical = 14;
      baseStyle.paddingHorizontal = 28;
    } else if (size === 'large') {
      baseStyle.paddingVertical = 18;
      baseStyle.paddingHorizontal = 36;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseText: TextStyle = {
      ...TYPOGRAPHY.body,
      fontWeight: '600',
    };

    if (variant === 'primary' || variant === 'danger') {
      baseText.color = '#FFFFFF';
    } else if (variant === 'secondary') {
      baseText.color = colors.text;
    } else if (variant === 'text') {
      baseText.color = colors.primary;
    }

    if (size === 'small') {
      baseText.fontSize = 14;
    }

    return baseText;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, getButtonStyles(), style]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary} 
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'stretch',
  },
});
export default Button;
