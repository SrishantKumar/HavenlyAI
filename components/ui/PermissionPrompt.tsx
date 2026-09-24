import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Mic, Lock } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from './Button';

const IconMic = Mic as any;
const IconLock = Lock as any;

interface PermissionPromptProps {
  visible: boolean;
  onAllow: () => void;
  onCancel: () => void;
}

export const PermissionPrompt = ({
  visible,
  onAllow,
  onCancel,
}: PermissionPromptProps) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(11, 15, 25, 0.4)' }]} />
        <View 
          style={[
            styles.content, 
            { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
            <IconMic color={colors.primary} size={36} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Let HavenlyAI Listen</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            To let you talk to HavenlyAI using your voice and participate in live reflections, we need access to your microphone.
          </Text>

          <View style={styles.privacyIndicator}>
            <IconLock color={colors.textMuted} size={14} style={styles.lockIcon} />
            <Text style={[styles.privacyText, { color: colors.textMuted }]}>
              Your voice messages are processed securely.
            </Text>
          </View>

          <Button
            title="Allow Microphone"
            onPress={onAllow}
            variant="primary"
            size="large"
            style={styles.actionBtn}
          />

          <Button
            title="Not Now"
            onPress={onCancel}
            variant="text"
            size="medium"
            style={styles.cancelBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    borderTopLeftRadius: LAYOUT.borderRadius.xLarge,
    borderTopRightRadius: LAYOUT.borderRadius.xLarge,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: LAYOUT.spacing.lg,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: LAYOUT.spacing.xs,
    textAlign: 'center',
  },
  description: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  privacyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.lg,
  },
  lockIcon: {
    marginRight: 6,
  },
  privacyText: {
    ...TYPOGRAPHY.caption,
  },
  actionBtn: {
    width: '100%',
    marginBottom: LAYOUT.spacing.xs,
  },
  cancelBtn: {
    width: '100%',
  },
});
export default PermissionPrompt;
