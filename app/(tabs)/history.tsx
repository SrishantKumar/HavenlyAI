import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Trash2, MessageSquare, Mic, Phone, ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { useRouter } from 'expo-router';

const IconSearch = Search as any;
const IconTrash2 = Trash2 as any;
const IconMessageSquare = MessageSquare as any;
const IconMic = Mic as any;
const IconPhone = Phone as any;
const IconChevronRight = ChevronRight as any;
import { chatService } from '../../services/chat/chatService';
import { formatFriendlyDate } from '../../utils/formatters';
import Header from '../../components/ui/Header';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import EmptyState from '../../components/ui/EmptyState';

type HistoryTab = 'all' | 'text' | 'voice' | 'live';

export default function HistoryScreen() {
  const router = useRouter();
  const { theme, conversations, setConversations } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Deletion modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
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

  const triggerDelete = (id: string) => {
    setSelectedConvId(id);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedConvId) return;
    try {
      await chatService.deleteConversation(selectedConvId);
      // Refresh local list
      await loadHistory();
    } catch (e) {
      console.warn(e);
    } finally {
      setDeleteModalVisible(false);
      setSelectedConvId(null);
    }
  };

  // Filter history based on active tab and search query
  const filteredHistory = conversations.filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTabStyle = (tab: HistoryTab) => {
    const isSelected = activeTab === tab;
    return [
      styles.tabBtn,
      {
        backgroundColor: isSelected ? colors.primary : colors.secondary,
        borderColor: isSelected ? colors.primary : colors.border,
      },
    ];
  };

  const getTabTextStyle = (tab: HistoryTab) => {
    const isSelected = activeTab === tab;
    return [
      styles.tabBtnText,
      {
        color: isSelected ? '#FFFFFF' : colors.text,
        fontWeight: isSelected ? ('700' as const) : ('500' as const),
      },
    ] as any;
  };

  const renderIcon = (type: string) => {
    if (type === 'text') return <IconMessageSquare color={colors.primary} size={18} />;
    if (type === 'voice') return <IconMic color={colors.primary} size={18} />;
    return <IconPhone color={colors.primary} size={18} />; // Live voice
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Your History" />

      {/* Confirmation Deletion Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete this reflection?"
        message="Once deleted, this conversation cannot be restored. Your thoughts here will be deleted forever."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSearch color={colors.textMuted} size={18} style={styles.searchIcon} />
          <TextInput
            placeholder="Search reflections..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {/* Tab Filters */}
        <View style={styles.tabRow}>
          <TouchableOpacity onPress={() => setActiveTab('all')} style={getTabStyle('all')}>
            <Text style={getTabTextStyle('all')}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('text')} style={getTabStyle('text')}>
            <Text style={getTabTextStyle('text')}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('voice')} style={getTabStyle('voice')}>
            <Text style={getTabTextStyle('voice')}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('live')} style={getTabStyle('live')}>
            <Text style={getTabTextStyle('live')}>Live</Text>
          </TouchableOpacity>
        </View>

        {/* List of Reflections */}
        {filteredHistory.length === 0 ? (
          <EmptyState
            title="No reflections found."
            message="We couldn't find any saved reflections matching your filters."
          />
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadHistory}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => router.push(`/chat/${item.id}`)}
                  style={styles.cardInteract}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                    {renderIcon(item.type)}
                  </View>
                  
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                      {formatFriendlyDate(item.createdAt)} · {item.type === 'live' ? 'Live Session' : item.type}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Deletion Trigger */}
                <TouchableOpacity
                  onPress={() => triggerDelete(item.id)}
                  style={styles.deleteBtn}
                  accessibilityLabel="Delete reflection"
                >
                  <IconTrash2 color={colors.textMuted} size={18} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.lg,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadius.medium,
    paddingHorizontal: 12,
    height: 48,
    marginVertical: LAYOUT.spacing.md,
  },
  searchIcon: {
    marginRight: LAYOUT.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...TYPOGRAPHY.body,
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    marginRight: 6,
  },
  tabBtnText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    marginBottom: LAYOUT.spacing.sm,
    shadowColor: 'rgba(0,0,0,0.01)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 1,
  },
  cardInteract: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.spacing.md,
  },
  cardContent: {
    flex: 1,
    marginRight: LAYOUT.spacing.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
});
