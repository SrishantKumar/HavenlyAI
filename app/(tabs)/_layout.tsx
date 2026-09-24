import React from 'react';
import { Tabs } from 'expo-router';
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
