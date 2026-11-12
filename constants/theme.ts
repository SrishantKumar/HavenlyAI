export const COLORS = {
  light: {
    background: '#F9FAFB', // Very subtle cool grey/white
    surface: '#FFFFFF', // Pure white surface
    surfaceSubtle: '#F3F4F6', // Elevated soft surface
    secondary: '#F3F4F6', // Soft grey for secondary elements
    primary: '#6366F1', // Vibrant indigo
    primaryLight: '#E0E7FF',
    accent: '#8B5CF6', // Purple accent
    cyanAccent: '#0EA5E9', // Sky blue accent
    text: '#111827', // Crisp dark text
    textMuted: '#6B7280', // Refined muted text
    border: '#E5E7EB', // Subtle borders
    borderSubtle: '#F3F4F6',
    shadow: 'rgba(99, 102, 241, 0.08)',
    orbGlow: 'rgba(139, 92, 246, 0.15)',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    streak: '#F59E0B',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    xpGold: '#EAB308',
  },
  dark: {
    background: '#09090B', // OLED-like deep black
    surface: '#18181B', // Zinc dark surface
    surfaceSubtle: '#27272A', // Elevated zinc surface
    secondary: '#27272A', // Lighter zinc for secondary
    primary: '#818CF8', // Luminous indigo
    primaryLight: '#312E81', // Deep indigo container
    accent: '#A78BFA', // Luminous purple
    cyanAccent: '#38BDF8', // Luminous sky blue
    text: '#FAFAFA', // High contrast white
    textMuted: '#A1A1AA', // Zinc muted text
    border: '#27272A',
    borderSubtle: '#1F1F23',
    shadow: 'rgba(0, 0, 0, 0.4)',
    orbGlow: 'rgba(167, 139, 250, 0.25)',
    success: '#34D399',
    successLight: 'rgba(52, 211, 153, 0.15)',
    warning: '#FBBF24',
    warningLight: 'rgba(251, 191, 36, 0.15)',
    streak: '#FBBF24',
    error: '#F87171',
    errorLight: 'rgba(248, 113, 113, 0.15)',
    xpGold: '#FACC15',
  },
};

export const TYPOGRAPHY = {
  hero: {
    fontSize: 34,
    fontWeight: '800' as const,
    lineHeight: 42,
    letterSpacing: -0.5,
    fontFamily: 'System', 
  },
  h1: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.3,
    fontFamily: 'System',
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 30,
    letterSpacing: -0.2,
    fontFamily: 'System',
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: -0.1,
    fontFamily: 'System',
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
    fontFamily: 'System',
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
    fontFamily: 'System',
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  captionSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
};

export const LAYOUT = {
  borderRadius: {
    xs: 6,
    small: 10,
    medium: 16,
    large: 24,
    xLarge: 32,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  minTapTarget: 44,
};

export const GLOWS = {
  subtle: {
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  accent: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  gold: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
};
