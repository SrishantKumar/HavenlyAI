import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { ShieldAlert, Phone, ExternalLink, X } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { CRISIS_HOTLINES } from '../../constants/mockData';
import Button from '../ui/Button';

const IconShieldAlert = ShieldAlert as any;
const IconPhone = Phone as any;
const IconExternalLink = ExternalLink as any;
const IconX = X as any;

export const SafetySupportCard: React.FC = () => {
  const { theme, showSafetySupport, setShowSafetySupport } = useAppStore();
  const isDark = theme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [showResourcesList, setShowResourcesList] = useState(false);

  if (!showSafetySupport) return null;

  const handleCallCrisis = (num: string) => {
    // Standard phone link schema
    const formatted = num.replace(/\s+/g, '');
    if (formatted.includes('HOME')) {
      Linking.openURL('sms:741741&body=HOME');
    } else {
      Linking.openURL(`tel:${formatted}`);
    }
  };

  return (
    <Modal
      transparent
      visible={showSafetySupport}
      animationType="fade"
      onRequestClose={() => setShowSafetySupport(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        
        <View style={[styles.content, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => setShowSafetySupport(false)}
            accessibilityLabel="Close safety card"
          >
            <IconX color={colors.text} size={20} />
          </TouchableOpacity>

          <View style={[styles.alertHeader, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
            <IconShieldAlert color={colors.error} size={28} />
            <Text style={[styles.headerText, { color: colors.error }]}>You're not alone</Text>
          </View>

          {!showResourcesList ? (
            <View style={styles.cardBody}>
              <Text style={[styles.bodyText, { color: colors.text }]}>
                It sounds like you may be going through something really serious.
              </Text>
              <Text style={[styles.bodySubtext, { color: colors.textMuted }]}>
                HavenlyAI can listen and help you reflect, but it is not an emergency service or a replacement for professional care. Getting human support right now is important.
              </Text>

              <Button
                title="Find Immediate Support"
                onPress={() => setShowResourcesList(true)}
                variant="danger"
                size="large"
                style={styles.actionBtn}
              />

              <Button
                title="Contact Someone I Trust"
                onPress={() => Linking.openURL('tel:')} // Opens dialer directly
                variant="secondary"
                size="medium"
                style={styles.actionBtn}
              />

              <Button
                title="Continue Talking to HavenlyAI"
                onPress={() => setShowSafetySupport(false)}
                variant="text"
                size="medium"
                style={styles.textBtn}
              />
            </View>
          ) : (
            <View style={styles.listBody}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Crisis Resources</Text>
              <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {CRISIS_HOTLINES.map((hotline, idx) => (
                  <View key={idx} style={[styles.resourceCard, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.resourceName, { color: colors.text }]}>{hotline.name}</Text>
                    <Text style={[styles.resourceDesc, { color: colors.textMuted }]}>{hotline.description}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.callLink, { backgroundColor: colors.secondary }]}
                      onPress={() => handleCallCrisis(hotline.number)}
                    >
                      <IconPhone color={colors.primary} size={14} style={{ marginRight: 6 }} />
                      <Text style={[styles.callLinkText, { color: colors.primary }]}>{hotline.number}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <Button
                title="Back"
                onPress={() => setShowResourcesList(false)}
                variant="secondary"
                size="medium"
                style={styles.backBtn}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.6)',
  },
  content: {
    width: '100%',
    maxWidth: 360,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    padding: LAYOUT.spacing.lg,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: LAYOUT.spacing.md,
    right: LAYOUT.spacing.md,
    padding: 4,
    zIndex: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.borderRadius.medium,
    marginBottom: LAYOUT.spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  headerText: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    marginLeft: 8,
  },
  cardBody: {
    alignItems: 'center',
    width: '100%',
  },
  bodyText: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
    lineHeight: 22,
  },
  bodySubtext: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.lg,
    lineHeight: 20,
  },
  actionBtn: {
    marginBottom: LAYOUT.spacing.sm,
    width: '100%',
  },
  textBtn: {
    marginTop: LAYOUT.spacing.xs,
    width: '100%',
  },
  listBody: {
    width: '100%',
    maxHeight: 400,
  },
  listTitle: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    marginBottom: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  scrollArea: {
    width: '100%',
    marginBottom: LAYOUT.spacing.md,
  },
  resourceCard: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resourceName: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  resourceDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  callLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.small,
  },
  callLinkText: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  backBtn: {
    width: '100%',
  },
});
export default SafetySupportCard;
