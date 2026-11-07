import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings,
  LogOut,
  ChevronRight,
  Mic,
  Eye,
  ShieldCheck,
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  Activity,
  Sparkles,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { authService } from '../../services/auth/authService';
import { maskPhoneNumber } from '../../utils/formatters';
import Header from '../../components/ui/Header';
import { supabase } from '../../services/supabaseClient';
import { generateUUID } from '../../utils/uuid';

const IconSettings = Settings as any;
const IconLogOut = LogOut as any;
const IconChevronRight = ChevronRight as any;
const IconMic = Mic as any;
const IconEye = Eye as any;
const IconShieldCheck = ShieldCheck as any;
const IconUser = User as any;
const IconFileText = FileText as any;
const IconUploadCloud = UploadCloud as any;
const IconCheckCircle2 = CheckCircle2 as any;
const IconActivity = Activity as any;
const IconSparkles = Sparkles as any;

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, user, phq4Score, behavioralTasksCompleted, resetAllData } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<string[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase.storage
        .from('medical_records')
        .list(authUser.id, {
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

  const handleUploadMedicalPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadingPdf(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Please log in to upload medical documents.');
      }

      // Convert URI to Blob for Supabase storage upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileId = generateUUID();
      const storagePath = `${authUser.id}/${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('medical_records')
        .upload(storagePath, blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      resetAllData();
      router.replace('/(auth)/welcome');
    } catch (e) {
      console.warn(e);
    }
  };

  const getOrbThemeLabel = () => {
    if (behavioralTasksCompleted >= 6) return 'Deep Ocean (Ultra-Slow Breathing)';
    if (behavioralTasksCompleted >= 3) return 'Aurora (Teal Gentle Rhythm)';
    return 'Default (Violet Calm)';
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
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Friend'}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email || 'user@havenly.ai'}</Text>
          <Text style={[styles.phone, { color: colors.textMuted }]}>
            {maskPhoneNumber(user?.phoneNumber || '')}
          </Text>
        </View>

        {/* Clinical Baseline & Somatic Rewards Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <IconActivity color={colors.primary} size={20} />
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
            {phq4Score !== null ? `Baseline Score: ${phq4Score} / 12` : 'Baseline not yet completed'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {phq4Score !== null && phq4Score > 8
              ? 'Distress level: High. Haven prioritizes somatic breathing grounding exercises.'
              : 'Used solely to tune conversational pacing and emotional warmth.'}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <IconSparkles color={colors.accent} size={20} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Somatic Rewards</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgePillText, { color: colors.primary }]}>
                {behavioralTasksCompleted} Completed
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Active Orb Theme: {getOrbThemeLabel()}
          </Text>
        </View>

        {/* Phase 2: Medical History PDF Upload (Contextual, Non-Diagnostic) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <IconFileText color={colors.primary} size={20} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical / Therapy Records</Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Upload past psychological records or therapy summaries so Haven understands your background trauma.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleUploadMedicalPdf}
            disabled={uploadingPdf}
            style={[
              styles.uploadBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {uploadingPdf ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <IconUploadCloud color={colors.primary} size={24} style={{ marginRight: 8 }} />
                <Text style={[styles.uploadBtnText, { color: colors.text }]}>
                  Upload History PDF
                </Text>
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

          <View style={[styles.guardrailBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconShieldCheck color={colors.cyanAccent} size={16} style={{ marginRight: 6 }} />
            <Text style={[styles.guardrailText, { color: colors.textMuted }]}>
              Non-Diagnostic Directive: Stored behind private Supabase RLS. Haven NEVER diagnoses conditions from PDFs.
            </Text>
          </View>
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
  sectionCard: {
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  baselineScoreText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: LAYOUT.borderRadius.small,
    borderWidth: 1,
  },
  recordItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  guardrailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
    marginTop: 12,
  },
  guardrailText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  menuContainer: {
    marginBottom: LAYOUT.spacing.xl,
    marginTop: LAYOUT.spacing.xs,
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
