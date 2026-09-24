import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, MessageSquare, ChevronRight, Trash2 } from 'lucide-react-native';
const IconPlus = Plus as any;
const IconMessageSquare = MessageSquare as any;
const IconChevronRight = ChevronRight as any;
const IconTrash2 = Trash2 as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { chatService } from '../../services/chat/chatService';
import { formatFriendlyDate } from '../../utils/formatters';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

export default function ChatListScreen() {
  const router = useRouter();
  const { theme, conversations, setConversations } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const loadConversations = async () => {
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
    loadConversations();
  }, []);

  const handleCreateNew = async () => {
    try {
      const conv = await chatService.createConversation('New reflection', 'text');
      await loadConversations();
      router.push(`/chat/${conv.id}`);
    } catch (e) {
      console.warn(e);
    }
  };

  const textConversations = conversations.filter(c => c.type === 'text');

  const triggerDelete = (id: string) => {
    setSelectedConvId(id);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedConvId) return;
    try {
      await chatService.deleteConversation(selectedConvId);
      await loadConversations();
    } catch (e) {
      console.warn(e);
    } finally {
      setDeleteModalVisible(false);
      setSelectedConvId(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Text Reflections" />

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

      {textConversations.length === 0 ? (
        <EmptyState
          title="No reflections yet."
          message="Writing down your thoughts can help make them feel clearer. Start a new text reflection whenever you're ready."
          buttonTitle="Start a Reflection"
          onPress={handleCreateNew}
        />
      ) : (
        <View style={styles.container}>
          <FlatList
            data={textConversations}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadConversations}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/chat/${item.id}`)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                  <IconMessageSquare color={colors.primary} size={20} />
                </View>
                
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardTime, { color: colors.textMuted }]}>
                      {formatFriendlyDate(item.createdAt).split(' at ')[0]}
                    </Text>
                  </View>
                  <Text style={[styles.cardPreview, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.lastMessageText || 'No messages yet'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => triggerDelete(item.id)}
                  style={styles.deleteBtn}
                  accessibilityLabel="Delete reflection"
                >
                  <IconTrash2 color={colors.textMuted} size={18} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />

          {/* Floating Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCreateNew}
            style={[styles.fab, { backgroundColor: colors.primary }]}
            accessibilityLabel="Create new conversation"
          >
            <IconPlus color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    padding: LAYOUT.spacing.lg,
    paddingBottom: 80,
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.spacing.md,
  },
  cardContent: {
    flex: 1,
    marginRight: LAYOUT.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: LAYOUT.spacing.sm,
  },
  cardTime: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
  },
  cardPreview: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteBtn: {
    padding: 8,
  },
});
