import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getQuestById, getTodaysQuest } from '../../constants/quests';
import QuestSession from '../../components/quest/QuestSession';
import { COLORS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from '../../components/ui/Button';

export default function QuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppStore((s) => s.theme);
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const quest = (id ? getQuestById(id) : null) || getTodaysQuest();

  if (!quest) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.fallbackTitle, { color: colors.text }]}>Quest not found</Text>
        <Button
          title="Return to Sanctuary"
          onPress={() => router.replace('/(tabs)')}
          variant="primary"
          size="medium"
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  return <QuestSession quest={quest} onExit={() => router.back()} />;
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});

