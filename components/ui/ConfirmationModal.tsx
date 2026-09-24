import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from './Button';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View 
          style={[
            styles.content, 
            { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              size="medium"
              style={styles.flexBtn}
            />
            <View style={styles.spacer} />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={isDestructive ? 'danger' : 'primary'}
              size="medium"
              style={styles.flexBtn}
            />
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    width: '100%',
    maxWidth: 340,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    padding: LAYOUT.spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.lg,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  flexBtn: {
    flex: 1,
  },
  spacer: {
    width: LAYOUT.spacing.sm,
  },
});
export default ConfirmationModal;
