import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Archive, MessageSquare, Mic, Phone, ChevronRight, Flame, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { useQuestStore } from '../../store/useQuestStore';
import { useRouter } from 'expo-router';

const IconSearch = Search as any;
const IconArchive = Archive as any;
const IconMessageSquare = MessageSquare as any;
const IconMic = Mic as any;
const IconPhone = Phone as any;
const IconChevronRight = ChevronRight as any;
const IconFlame = Flame as any;
const IconSparkles = Sparkles as any;
const IconCheckCircle2 = CheckCircle2 as any;

import { chatService } from '../../services/chat/chatService';
import { formatFriendlyDate } from '../../utils/formatters';
import Header from '../../components/ui/Header';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

type HistoryTab = 'all' | 'quests' | 'text' | 'voice';

export default function HistoryScreen() {
  const router = useRouter();
  const { theme, conversations, setConversations, archiveConversation } = useAppStore();
  const { streak, longestStreak, completedQuestIds, history: questHistory } = useQuestStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Archival modal state
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const list = await chatService.getConversations();
      setConversations(list);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const triggerArchive = (id: string) => {
    setSelectedConvId(id);
    setArchiveModalVisible(true);
  };

  const handleConfirmArchive = async () => {
    if (!selectedConvId) return;
    try {
      await archiveConversation(selectedConvId);
      await loadHistory();
    } catch (e) {
      console.warn(e);
    } finally {
      setArchiveModalVisible(false);
      setSelectedConvId(null);
    }
  };

  // 7-day Streak Calendar calculation
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const isToday = i === 6;
    // Mark active if within the current streak days
    const daysAgo = 6 - i;
    const isActive = streak > 0 && daysAgo < streak;
    return {
      dayInitial: dayNames[d.getDay()][0],
      dayNum: d.getDate(),
      isToday,
      isActive,
    };
  });

  // Weekly mood arc mock data (calmness index across week)
  const moodArcData = [
    { day: 'M', score: 65 },
    { day: 'T', score: 72 },
    { day: 'W', score: 58 },
    { day: 'T', score: 80 },
    { day: 'F', score: 85 },
    { day: 'S', score: 90 },
    { day: 'S', score: 88 },
  ];

  // Filter history
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessageText && c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'text') return c.type === 'text' && matchesSearch;
    if (activeTab === 'voice') return c.type === 'voice' && matchesSearch;
    return matchesSearch;
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Journey & Reflections" rightAction="safety" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Gamification Summary Cards */}
        <View style={styles.metricsRow}>
          {/* Quests Completed Count Card */}
          <Card style={styles.metricCard} variant="elevated">
            <View style={styles.metricHeader}>
              <IconSparkles color={colors.primary} size={16} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Quests Done</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {completedQuestIds.length}
            </Text>
            <Text style={[styles.metricSubtext, { color: colors.success }]}>
              {questHistory.length > 0 ? `${questHistory.length} total sessions` : 'Begin today'}
            </Text>
          </Card>

          {/* Current & Longest Streak */}
          <Card style={styles.metricCard} variant="elevated">
            <View style={styles.metricHeader}>
              <IconFlame color={colors.streak} size={16} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Current Streak</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.streak }]}>
              {streak} <Text style={{ fontSize: 14, fontWeight: '500' }}>days</Text>
            </Text>
            <Text style={[styles.metricSubtext, { color: colors.textMuted }]}>
              Best: {longestStreak} days
            </Text>
          </Card>
        </View>

        {/* 7-Day Streak Calendar */}
        <Card style={styles.calendarCard} variant="subtle">
          <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Presence</Text>
          <View style={styles.calendarRow}>
            {weekDays.map((item, idx) => (
              <View key={idx} style={styles.dayCol}>
                <Text style={[styles.dayInitial, { color: item.isToday ? colors.primary : colors.textMuted }]}>
                  {item.dayInitial}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      backgroundColor: item.isActive
                        ? colors.streak
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                      borderColor: item.isToday ? colors.primary : 'transparent',
                      borderWidth: item.isToday ? 2 : 0,
                    },
                  ]}
                >
                  {item.isActive ? (
                    <IconCheckCircle2 color="#FFFFFF" size={14} />
                  ) : (
                    <Text
                      style={[
                        styles.dayNumText,
                        { color: item.isToday ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {item.dayNum}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Weekly Mood Arc Chart */}
        <Card style={styles.moodArcCard} variant="elevated">
          <View style={styles.moodArcHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Calmness Arc</Text>
            <Badge label="Past 7 Days" variant="primary" />
          </View>
          <View style={styles.chartContainer}>
            {moodArcData.map((point, index) => {
              const heightPercent = point.score;
              return (
                <View key={index} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor:
                            index === 6
                              ? colors.primary
                              : isDark
                              ? 'rgba(129, 140, 248, 0.4)'
                              : 'rgba(99, 102, 241, 0.3)',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]}>{point.day}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Tab Filters */}
        <View style={styles.tabFiltersRow}>
          {(['all', 'quests', 'text', 'voice'] as HistoryTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.surface
                      : '#F3F4F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isSelected ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  {tab === 'all'
                    ? 'All'
                    : tab === 'quests'
                    ? 'Quests'
                    : tab === 'text'
                    ? 'Chats'
                    : 'Voice'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quest History View */}
        {activeTab === 'quests' && (
          <View style={styles.listSection}>
            {questHistory.length === 0 ? (
              <EmptyState
                title="No completed quests yet"
                message="Complete your first grounding quest to see your mindful journey here."
              />
            ) : (
              questHistory.map((item) => (
                <Card key={item.id} style={styles.historyCard} variant="subtle">
                  <View style={styles.questHistoryRow}>
                    <View style={styles.questHistLeft}>
                      <Text style={[styles.questHistTitle, { color: colors.text }]}>
                        {item.questTitle}
                      </Text>
                      <Text style={[styles.questHistDate, { color: colors.textMuted }]}>
                        {formatFriendlyDate(item.completedAt)} · {item.answers.length} observations
                      </Text>
                      {item.answers.slice(0, 3).map((ans, i) => (
                        <Text key={i} style={[styles.ansSnippet, { color: colors.textMuted }]} numberOfLines={1}>
                          • {ans}
                        </Text>
                      ))}
                    </View>
                    <Badge label={`+${item.xpEarned} XP`} variant="gold" />
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Chat / Voice Conversations List */}
        {activeTab !== 'quests' && (
          <View style={styles.listSection}>
            {/* Search Input */}
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <IconSearch color={colors.textMuted} size={18} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search reflections..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredConversations.length === 0 ? (
              <EmptyState
                title="No reflections found"
                message="Your spoken reflections and conversations will appear here."
              />
            ) : (
              filteredConversations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(item.type === 'text' ? `/chat/${item.id}` : '/(tabs)/voice')
                  }
                  style={[
                    styles.conversationCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      shadowColor: colors.shadow,
                    },
                  ]}
                >
                  <View style={styles.convLeft}>
                    <View style={styles.convTypeIcon}>
                      {item.type === 'voice' ? (
                        <IconMic color={colors.primary} size={18} />
                      ) : (
                        <IconMessageSquare color={colors.primary} size={18} />
                      )}
                    </View>
                    <View style={styles.convDetails}>
                      <Text style={[styles.convTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.convDate, { color: colors.textMuted }]}>
                        {formatFriendlyDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => triggerArchive(item.id)}
                    style={styles.archiveBtn}
                    accessibilityLabel="Archive reflection"
                  >
                    <IconArchive color={colors.textMuted} size={18} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal for Archiving */}
      <ConfirmationModal
        visible={archiveModalVisible}
        title="Archive Reflection?"
        message="This reflection will be hidden from your active list. Havenly will still quietly retain the therapeutic context for emotional continuity."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.xl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: LAYOUT.spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: LAYOUT.spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  metricSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
  calendarCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayInitial: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moodArcCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  moodArcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 90,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 65,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: LAYOUT.spacing.md,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: LAYOUT.borderRadius.full,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listSection: {
    marginBottom: LAYOUT.spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    marginBottom: LAYOUT.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  historyCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: 8,
  },
  questHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  questHistLeft: {
    flex: 1,
    marginRight: 8,
  },
  questHistTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  questHistDate: {
    fontSize: 11,
    marginBottom: 6,
  },
  ansSnippet: {
    fontSize: 12,
    lineHeight: 16,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  convLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  convTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  convDetails: {
    flex: 1,
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  convDate: {
    fontSize: 11,
    marginTop: 2,
  },
  archiveBtn: {
    padding: 8,
  },
});
