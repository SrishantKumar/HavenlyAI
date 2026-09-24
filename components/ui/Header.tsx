import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Moon, Sun, ShieldAlert } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

const IconArrowLeft = ArrowLeft as any;
const IconMoon = Moon as any;
const IconSun = Sun as any;
const IconShieldAlert = ShieldAlert as any;

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  rightAction?: 'theme' | 'safety' | 'none';
  onRightPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  rightAction = 'theme',
  onRightPress,
}) => {
  const router = useRouter();
  const { theme, setTheme, setShowSafetySupport } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSafetyPress = () => {
    setShowSafetySupport(true);
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <IconArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      <View style={styles.rightContainer}>
        {rightAction === 'theme' && (
          <TouchableOpacity
            onPress={handleThemeToggle}
            style={styles.iconButton}
            accessibilityLabel="Toggle theme"
            accessibilityRole="button"
          >
            {theme === 'dark' ? (
              <IconSun color={colors.primary} size={22} />
            ) : (
              <IconMoon color={colors.primary} size={22} />
            )}
          </TouchableOpacity>
        )}
        {rightAction === 'safety' && (
          <TouchableOpacity
            onPress={onRightPress || handleSafetyPress}
            style={styles.iconButton}
            accessibilityLabel="Emergency support resources"
            accessibilityRole="button"
          >
            <IconShieldAlert color={colors.error} size={22} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: LAYOUT.spacing.sm,
    padding: 4,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: LAYOUT.borderRadius.small,
  },
});
export default Header;
