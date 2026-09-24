import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, LogOut, ChevronRight, Mic, HeartHandshake, Eye, ShieldCheck, User } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

const IconSettings = Settings as any;
const IconLogOut = LogOut as any;
const IconChevronRight = ChevronRight as any;
const IconMic = Mic as any;
const IconHeartHandshake = HeartHandshake as any;
const IconEye = Eye as any;
const IconShieldCheck = ShieldCheck as any;
const IconUser = User as any;
import { authService } from '../../services/auth/authService';
import { maskPhoneNumber } from '../../utils/formatters';
import Header from '../../components/ui/Header';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, user, resetAllData } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const handleLogout = async () => {
    try {
      await authService.logout();
      resetAllData();
      router.replace('/(auth)/welcome');
    } catch (e) {
      console.warn(e);
    }
  };

  const menuItems = [
    {
      icon: <IconSettings color={colors.primary} size={20} />,
      label: 'General Preferences',
      route: '/settings?section=appearance',
    },
    {
      icon: <IconMic color={colors.primary} size={20} />,
      label: 'Voice Preferences',
      route: '/settings?section=voice',
    },
    {
      icon: <IconEye color={colors.primary} size={20} />,
      label: 'Privacy & Data Control',
      route: '/settings?section=privacy',
    },
    {
      icon: <IconShieldCheck color={colors.primary} size={20} />,
      label: 'Safety & Disclaimer',
      route: '/settings?section=safety',
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Your Haven" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: colors.secondary }]}>
            <IconUser color={colors.primary} size={36} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Sarah'}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email || 'sarah@havenly.ai'}</Text>
          <Text style={[styles.phone, { color: colors.textMuted }]}>
            {maskPhoneNumber(user?.phoneNumber || '')}
          </Text>
        </View>

        {/* Menu list */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuLeft}>
                {item.icon}
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <IconChevronRight color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Log out CTA */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: colors.border }]}
        >
          <IconLogOut color={colors.error} size={20} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.01)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: LAYOUT.spacing.lg,
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  name: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  email: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    marginTop: 2,
  },
  phone: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    marginTop: 2,
  },
  menuContainer: {
    marginBottom: LAYOUT.spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: LAYOUT.spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadius.medium,
    paddingVertical: 14,
    width: '100%',
  },
  logoutText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
  },
});
