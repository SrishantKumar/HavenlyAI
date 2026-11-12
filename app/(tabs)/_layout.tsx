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
import { useQuestStore, getLocalDateString } from '../../store/useQuestStore';
import { View } from 'react-native';

export default function TabsLayout() {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const lastQuestDate = useQuestStore((state) => state.lastQuestDate);
  const colors = isDark ? COLORS.dark : COLORS.light;
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const tabHeight = isWeb ? 84 : Math.max(76, 64 + insets.bottom);
  const tabPaddingBottom = isWeb ? 16 : Math.max(insets.bottom, 10);

  const todayStr = getLocalDateString();
  const isQuestPending = lastQuestDate !== todayStr;

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
          elevation: 10,
        },
        tabBarItemStyle: {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 2,
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
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <IconHome color={color} size={22} />
              {isQuestPending && (
                <View
                  style={{
                    position: 'absolute',
                    top: -1,
                    right: -2,
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => <IconMessageCircle color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarLabel: 'Voice',
          tabBarIcon: ({ color, size }) => <IconMic color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => <IconHistory color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <IconUser color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
