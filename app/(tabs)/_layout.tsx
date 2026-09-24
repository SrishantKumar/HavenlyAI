import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, MessageCircle, Mic, History, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const IconHome = Home as any;
const IconMessageCircle = MessageCircle as any;
const IconMic = Mic as any;
const IconHistory = History as any;
const IconUser = User as any;

import { COLORS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

export default function TabsLayout() {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const tabHeight = isWeb ? 72 : 62 + insets.bottom;
  const tabPaddingBottom = isWeb ? 12 : Math.max(insets.bottom, 6);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: tabPaddingBottom,
          elevation: 8,
        },
        tabBarItemStyle: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 2,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sanctuary',
          tabBarIcon: ({ color, size }) => <IconHome color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Text',
          tabBarIcon: ({ color, size }) => <IconMessageCircle color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size }) => <IconMic color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <IconHistory color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <IconUser color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
