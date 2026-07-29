import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { useTheme, typography } from '../theme';
import Icon from './Icon';
import type { CaseContext } from '../store/types';

interface SavedCasesModalProps {
  visible: boolean;
  onClose: () => void;
  savedCases: CaseContext[];
  onLoadCase: (caseItem: CaseContext) => void;
  onDeleteCase: (patientId: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SavedCasesModal({
  visible,
  onClose,
  savedCases,
  onLoadCase,
  onDeleteCase,
}: SavedCasesModalProps) {
  const { colors, isDark } = useTheme();
  
  // Backing animation for standard Modal transitions
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 12,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop overlay */}
        <Animated.View 
          style={[
            styles.backdrop, 
            { 
              opacity: fadeAnim,
              backgroundColor: isDark ? 'rgba(5, 10, 18, 0.82)' : 'rgba(15, 23, 42, 0.45)' 
            }
          ]}
        >
          <Pressable style={styles.flex1} onPress={onClose} />
        </Animated.View>

        {/* Modal content container */}
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header indicator */}
          <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Saved Cases
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.infoHighlight }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {savedCases.length}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.subtle }]}
              activeOpacity={0.8}
            >
              <Icon name="x" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {savedCases.length === 0 ? (
              <View style={[styles.emptyContainer, { borderColor: colors.border, backgroundColor: colors.subtle }]}>
                <Icon name="folder" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No saved case summaries found. Save an AI clinical summary from the Scan tab.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {savedCases.map((c) => (
                  <View
                    key={c.patientId}
                    style={[
                      styles.caseCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.caseHeader}>
                      <View style={styles.caseIdRow}>
                        <Icon name="file-text" size={14} color={colors.primary} />
                        <Text style={[styles.caseId, { color: colors.foreground }]}>
                          {c.patientId}
                        </Text>
                      </View>
                      <Text style={[styles.caseDate, { color: colors.textMuted }]}>
                        {c.date || 'Saved Record'}
                      </Text>
                    </View>

                    <View style={styles.caseBody}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Site:</Text>
                        <Text style={[styles.detailVal, { color: colors.foreground }]}>
                          {c.site}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Staging:</Text>
                        <View style={[styles.tag, { backgroundColor: colors.infoHighlight }]}>
                          <Text style={[styles.tagText, { color: colors.primary }]}>
                            {c.tnm}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={() => onDeleteCase(c.patientId)}
                        style={[styles.deleteBtn, {
                          borderColor: colors.destructive + '40',
                          backgroundColor: colors.destructive + '10',
                        }]}
                        activeOpacity={0.8}
                      >
                        <Icon name="trash-2" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onLoadCase(c)}
                        style={[styles.loadBtn, { backgroundColor: colors.primary }]}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.loadBtnText, { color: colors.primaryForeground }]}>
                          Load Case Summary
                        </Text>
                        <Icon name="arrow-right" size={14} color={colors.primaryForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  flex1: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.75,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingTop: 8,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    gap: 12,
    paddingTop: 4,
  },
  caseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caseIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caseId: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.fontMono,
  },
  caseDate: {
    fontSize: 11,
  },
  caseBody: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    width: 60,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  loadBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
