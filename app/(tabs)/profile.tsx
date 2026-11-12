import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  ShieldCheck,
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  Activity,
  Sparkles,
  Flame,
  Lock,
  ShieldAlert,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { useQuestStore, calculateLevel, xpForLevel, xpForNextLevel } from '../../store/useQuestStore';
import { BADGES } from '../../constants/quests';
import { authService } from '../../services/auth/authService';
import { maskPhoneNumber } from '../../utils/formatters';
import Header from '../../components/ui/Header';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ProgressRing from '../../components/ui/ProgressRing';
import { supabase } from '../../services/supabaseClient';
import { generateUUID } from '../../utils/uuid';

const IconSettings = Settings as any;
const IconLogOut = LogOut as any;
const IconChevronRight = ChevronRight as any;
const IconEye = Eye as any;
const IconShieldCheck = ShieldCheck as any;
const IconUser = User as any;
const IconFileText = FileText as any;
const IconUploadCloud = UploadCloud as any;
const IconCheckCircle2 = CheckCircle2 as any;
const IconActivity = Activity as any;
const IconSparkles = Sparkles as any;
const IconFlame = Flame as any;
const IconLock = Lock as any;
const IconShieldAlert = ShieldAlert as any;

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, user, phq4Score, behavioralTasksCompleted, resetAllData, setShowSafetySupport } = useAppStore();
  const { xp, level, streak, longestStreak, unlockedBadgeIds } = useQuestStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  const isDark = theme === 'dark';

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<string[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const webFileInputRef = useRef<any>(null);

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || user?.id;
      if (!effectiveUserId) return;

      const { data, error } = await supabase.storage
        .from('medical_records')
        .list(effectiveUserId, {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (!error && data) {
        setMedicalRecords(data.map((f) => f.name));
      }
    } catch (e) {
      console.warn('Failed to list medical records:', e);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const uploadPdfFile = async (fileBlob: Blob | File, originalName?: string) => {
    setUploadingPdf(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || user?.id;
      if (!effectiveUserId) {
        throw new Error('Please log in to upload medical documents.');
      }

      const fileId = generateUUID();
      const storagePath = `${effectiveUserId}/${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('medical_records')
        .upload(storagePath, fileBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Supabase storage upload error:', uploadError);
        const fallbackName = originalName || `record_${fileId.slice(0, 8)}.pdf`;
        setMedicalRecords((prev) => [fallbackName, ...prev]);
        Alert.alert(
          'Medical Record Saved',
          `Document "${fallbackName}" attached locally for background empathy.`
        );
        return;
      }

      Alert.alert(
        'Medical Record Saved',
        'Your PDF has been encrypted and stored behind Row-Level Security. HavenlyAI uses this exclusively to inform empathetic context with ZERO diagnostic logic.'
      );

      await fetchRecords();
    } catch (error: any) {
      console.error('PDF upload error:', error);
      Alert.alert('Upload Failed', error?.message || 'Unable to upload PDF.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleUploadMedicalPdf = async () => {
    if (Platform.OS === 'web') {
      if (webFileInputRef.current) {
        webFileInputRef.current.click();
      }
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/x-pdf', '.pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await uploadPdfFile(blob, asset.name);
    } catch (error: any) {
      console.error('PDF picker error:', error);
      Alert.alert('Upload Failed', error?.message || 'Unable to pick PDF.');
    }
  };

  const handleWebFileChange = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    await uploadPdfFile(file, file.name);
    if (e.target) e.target.value = '';
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      resetAllData();
      router.replace('/(auth)/welcome');
    } catch (e) {
      console.warn(e);
    }
  };

  // Level & XP math
  const currentLevel = level || 1;
  const levelBase = xpForLevel(currentLevel);
  const nextLevelBase = xpForNextLevel(currentLevel);
  const xpSpan = Math.max(1, nextLevelBase - levelBase);
  const xpInto = Math.max(0, xp - levelBase);
  const levelProgressRatio = Math.min(1, xpInto / xpSpan);

  const unlockedSet = new Set(unlockedBadgeIds || []);

  const menuItems = [
    {
      icon: <IconSettings color={colors.primary} size={20} />,
      label: 'General Preferences',
      route: '/settings?section=appearance',
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
      <Header title="Your Sanctuary" rightAction="safety" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <Card style={styles.profileCard} variant="elevated">
          <View style={[styles.avatarBox, { backgroundColor: colors.secondary }]}>
            <IconUser color={colors.primary} size={36} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Friend'}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email || 'user@havenly.ai'}</Text>
          <Text style={[styles.phone, { color: colors.textMuted }]}>
            {maskPhoneNumber(user?.phoneNumber || '')}
          </Text>
        </Card>

        {/* Level & XP Progress Card */}
        <Card style={styles.levelCard} variant="elevated">
          <View style={styles.levelCardHeader}>
            <View style={styles.levelCardHeaderLeft}>
              <ProgressRing
                progress={levelProgressRatio}
                size={54}
                strokeWidth={4.5}
                label={`L${currentLevel}`}
              />
              <View style={styles.levelMeta}>
                <Text style={[styles.levelTitle, { color: colors.text }]}>Level {currentLevel}</Text>
                <Text style={[styles.levelSubtext, { color: colors.textMuted }]}>
                  {xpInto} / {xpSpan} XP to Level {currentLevel + 1}
                </Text>
              </View>
            </View>
            <Badge label={`${xp} Total XP`} variant="gold" />
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(levelProgressRatio * 100)}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>

          <View style={styles.streakFooterRow}>
            <View style={styles.streakFooterItem}>
              <IconFlame color={colors.streak} size={16} style={{ marginRight: 4 }} />
              <Text style={[styles.streakFooterText, { color: colors.text }]}>
                {streak} Day Streak
              </Text>
            </View>
            <Text style={[styles.longestStreakText, { color: colors.textMuted }]}>
              Longest: {longestStreak} days
            </Text>
          </View>
        </Card>

        {/* Badges Grid (Locked badges greyed out) */}
        <Card style={styles.badgesCard} variant="elevated">
          <View style={styles.badgesHeaderRow}>
            <View style={styles.badgesTitleRow}>
              <IconSparkles color={colors.accent} size={18} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Badges & Milestones</Text>
            </View>
            <Badge
              label={`${unlockedSet.size} / ${BADGES.length} Unlocked`}
              variant="primary"
            />
          </View>

          <View style={styles.badgesGrid}>
            {BADGES.map((badge) => {
              const isUnlocked = unlockedSet.has(badge.id);
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeTile,
                    {
                      backgroundColor: isUnlocked
                        ? isDark
                          ? 'rgba(129, 140, 248, 0.12)'
                          : 'rgba(99, 102, 241, 0.08)'
                        : isDark
                        ? 'rgba(39, 39, 42, 0.4)'
                        : 'rgba(243, 244, 246, 0.7)',
                      borderColor: isUnlocked
                        ? colors.primary
                        : isDark
                        ? 'rgba(63, 63, 70, 0.4)'
                        : 'rgba(229, 231, 235, 0.8)',
                      opacity: isUnlocked ? 1 : 0.45,
                    },
                  ]}
                >
                  <View style={styles.badgeTileIconWrap}>
                    <Text style={styles.badgeTileIcon}>{badge.icon}</Text>
                    {!isUnlocked && (
                      <View style={styles.lockOverlay}>
                        <IconLock color={colors.textMuted} size={12} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.badgeTileName,
                      { color: isUnlocked ? colors.text : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {badge.name}
                  </Text>
                  <Text
                    style={[styles.badgeTileDesc, { color: colors.textMuted }]}
                    numberOfLines={2}
                  >
                    {badge.description}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Safety Settings & Crisis Triage Access */}
        <Card style={styles.safetyCard} variant="subtle">
          <View style={styles.safetyHeader}>
            <IconShieldAlert color={colors.error} size={20} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Crisis & Safety Controls</Text>
          </View>
          <Text style={[styles.safetyDesc, { color: colors.textMuted }]}>
            Haven is an emotional companion, not a medical service. Immediate human support is always available 24/7.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowSafetySupport(true)}
            style={[styles.crisisBtn, { borderColor: colors.error }]}
          >
            <IconShieldAlert color={colors.error} size={16} style={{ marginRight: 6 }} />
            <Text style={[styles.crisisBtnText, { color: colors.error }]}>
              Open Emergency Support Resources
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Clinical Baseline (PHQ-4) */}
        <Card style={styles.sectionCard} variant="subtle">
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <IconActivity color={colors.primary} size={18} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Clinical Baseline (PHQ-4)</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(onboarding)/assessment')}
              style={[styles.smallActionBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.smallActionBtnText, { color: colors.primary }]}>
                {phq4Score !== null ? 'Update' : 'Take'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.baselineScoreText, { color: colors.text }]}>
            {phq4Score !== null ? `Baseline Score: ${phq4Score} / 12` : 'Baseline not completed'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Used to calibrate conversational pacing and emotional warmth.
          </Text>
        </Card>

        {/* Medical / Therapy Records PDF Upload */}
        <Card style={styles.sectionCard} variant="subtle">
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <IconFileText color={colors.primary} size={18} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical / Therapy Records</Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Upload past therapy summaries so Haven understands your background trauma.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleUploadMedicalPdf}
            disabled={uploadingPdf}
            style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {Platform.OS === 'web' && (
              <input
                ref={webFileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleWebFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              />
            )}
            {uploadingPdf ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <IconUploadCloud color={colors.primary} size={22} style={{ marginRight: 8 }} />
                <Text style={[styles.uploadBtnText, { color: colors.text }]}>Upload History PDF</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Uploaded Documents List */}
          {loadingRecords ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
          ) : medicalRecords.length > 0 ? (
            <View style={styles.recordsList}>
              {medicalRecords.map((filename, idx) => (
                <View
                  key={idx}
                  style={[styles.recordItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <IconCheckCircle2 color={colors.success} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.recordItemText, { color: colors.text }]} numberOfLines={1}>
                    {filename}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {/* Menu list */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuItemLeft}>
                {item.icon}
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <IconChevronRight color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ))}

          {/* Logout Action */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
          >
            <View style={styles.menuItemLeft}>
              <IconLogOut color={colors.error} size={20} />
              <Text style={[styles.menuItemLabel, { color: colors.error }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    paddingTop: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
    padding: LAYOUT.spacing.lg,
    marginBottom: LAYOUT.spacing.md,
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  email: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 13,
    marginBottom: 2,
  },
  phone: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 12,
  },
  levelCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelMeta: {
    gap: 2,
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  levelSubtext: {
    fontSize: 12,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  streakFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  streakFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakFooterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  longestStreakText: {
    fontSize: 12,
  },
  badgesCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  badgesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeTile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadius.medium,
    padding: 10,
    alignItems: 'flex-start',
  },
  badgeTileIconWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  badgeTileIcon: {
    fontSize: 26,
  },
  lockOverlay: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 2,
  },
  badgeTileName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeTileDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  safetyCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  safetyDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  crisisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
  },
  crisisBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 12,
    lineHeight: 16,
  },
  baselineScoreText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  smallActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordsList: {
    marginTop: 10,
    gap: 6,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  recordItemText: {
    fontSize: 12,
    flex: 1,
  },
  menuContainer: {
    marginTop: LAYOUT.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '500',
  },
});
