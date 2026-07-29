/**
 * ChatScreen — pixel-perfect match of Chat.tsx from the web with case-anchored history.
 * 
 * Sections (in order):
 * 1. Active case context banner (dismissable)
 * 2. Header actions (New Chat, Chat History)
 * 3. Messages area — user bubbles right, AI bubbles left with OcnoDetect AI label
 * 4. Typing indicator (3-dot bounce)
 * 5. Suggestion chips (shown when no messages + active case)
 * 6. Empty state (when no case loaded + no active session)
 * 7. Sticky chat input bar at bottom (above tab bar)
 * 8. Chat History Slide-up Modal Overlay
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Animated, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme, typography } from '../theme';
import { PageShell } from '../components/PageShell';
import type { CaseContext, TabKey, ChatMessage, ChatSession } from '../store/types';
import Icon from '../components/Icon';
import { askAI } from '../services/scanwiseApi';
import { useAppStore } from '../store/AppContext';

const suggestions = [
  'What is the NCCN-recommended nodal dissection for T3N2b BOT?',
  'What are typical free flap options for this resection?',
  'Is concurrent chemoradiation indicated here?',
  'Summarise surgical risks for this stage',
];

interface Props {
  activeCase: CaseContext | null;
  onClearCase: () => void;
  onNavigate: (t: TabKey) => void;
}

function parseMarkdownToReactNodes(text: string) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <Text key={index} style={{ fontWeight: '700' }}>
          {boldText}
        </Text>
      );
    }
    return part;
  });
}

export function ChatScreen({ activeCase, onClearCase, onNavigate }: Props) {
  const { colors } = useTheme();
  const {
    chatSessions,
    setChatSessions,
    activeSessionId,
    setActiveSessionId,
    setActiveCase,
    showAlert,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const activeSession = chatSessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    if (!activeSession) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { role: 'user', text, t: now };

    // Append user message immediately & update title if it was default
    setChatSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSession.id) {
          const isDefaultTitle = s.title.startsWith('Case Query:');
          const newTitle = isDefaultTitle
            ? text.split(' ').slice(0, 4).join(' ') + (text.split(' ').length > 4 ? '...' : '')
            : s.title;
          return {
            ...s,
            title: newTitle,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      })
    );
    setInput('');
    setTyping(true);
    Keyboard.dismiss();

    try {
      const caseCtx = activeSession.caseContext;
      // Get conversation history associated with this session context
      const apiHistory = activeSession.messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const reply = await askAI(text, caseCtx, apiHistory);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMsg: ChatMessage = { role: 'ai', t: replyTime, text: reply };

      setChatSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...s.messages, aiMsg],
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      console.warn('Chat API failed:', err);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: ChatMessage = {
        role: 'ai',
        t: replyTime,
        text: `Connection issue: ${err.message || 'Unable to connect to dynamic server. Please check that your backend server is running.'}`,
      };
      setChatSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...s.messages, errorMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setTyping(false);
    }
  };

  const handleNewChat = () => {
    if (!activeCase) return;
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      patientId: activeCase.patientId,
      title: `Case Query: ${activeCase.patientId}`,
      messages: [],
      caseContext: activeCase,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
    setChatSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSessionId);
  };

  const handleDeleteSession = (sessionId: string, sessionTitle: string) => {
    showAlert(
      'Delete Conversation',
      `Are you sure you want to delete "${sessionTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setChatSessions((prev) => {
              const updated = prev.filter((s) => s.id !== sessionId);
              if (activeSessionId === sessionId) {
                if (updated.length > 0) {
                  const nextSession = updated.find((s) => s.patientId === activeCase?.patientId) || updated[updated.length - 1];
                  setActiveSessionId(nextSession ? nextSession.id : null);
                } else {
                  setActiveSessionId(null);
                }
              }
              return updated;
            });
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <PageShell scrollable={false}>
        <View style={{ flex: 1 }}>
          {/* Active case banner */}
          {activeCase && (
            <CaseBanner activeCase={activeCase} onClear={onClearCase} />
          )}

          {/* Action Header Row */}
          <View style={[styles.chatHeaderActions, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.chatHeaderTitle, { color: colors.foreground }]}>Clinical Chat</Text>
            <View style={styles.chatHeaderButtons}>
              {activeCase && (
                <TouchableOpacity
                  onPress={handleNewChat}
                  style={[styles.headerActionBtn, { backgroundColor: colors.subtle }]}
                  activeOpacity={0.7}
                >
                  <Icon name="plus" size={12} color={colors.primary} />
                  <Text style={[styles.headerActionBtnText, { color: colors.primary }]}>New Chat</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setHistoryVisible(true)}
                style={[styles.headerActionBtn, { backgroundColor: colors.subtle }]}
                activeOpacity={0.7}
              >
                <Icon name="clock" size={12} color={colors.primary} />
                <Text style={[styles.headerActionBtnText, { color: colors.primary }]}>History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messageArea}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && !activeCase && (
              <EmptyState
                icon="maximize"
                title="Load a case or select a chat from History"
                ctaLabel="Go to Scan"
                onCta={() => onNavigate('scan')}
              />
            )}

            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}

            {typing && <TypingIndicator />}
          </ScrollView>

          {/* Suggestion chips */}
          {messages.length === 0 && activeCase && (
            <View style={styles.suggestions}>
              {suggestions.map((s, i) => (
                <SuggestionChip key={s} text={s} delay={i * 50} onPress={() => send(s)} />
              ))}
            </View>
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask about this case..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              }]}
              returnKeyType="send"
              multiline={false}
              editable={!!activeSession}
            />
            <TouchableOpacity
              onPress={() => send(input)}
              style={[styles.sendBtn, { backgroundColor: activeSession ? colors.primary : colors.subtle }]}
              activeOpacity={0.95}
              disabled={!activeSession}
            >
              <Icon name="arrow-up" size={18} color={activeSession ? colors.primaryForeground : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </PageShell>

      {/* History Slide-up Modal Overlay */}
      {historyVisible && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1000 }]}>
          <View style={[styles.historyModalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Chat History</Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {(() => {
                const activeHistorySessions = chatSessions.filter((s) => s.messages.length > 0);
                if (activeHistorySessions.length === 0) {
                  return (
                    <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                      No past conversations found.
                    </Text>
                  );
                }
                return [...activeHistorySessions].reverse().map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <View key={session.id} style={styles.historyRowContainer}>
                      <TouchableOpacity
                        style={[
                          styles.historyItem,
                          {
                            flex: 1,
                            backgroundColor: isActive ? colors.infoHighlight : colors.surface,
                            borderColor: isActive ? colors.primary + '80' : colors.border,
                          }
                        ]}
                        onPress={() => {
                          setActiveSessionId(session.id);
                          setActiveCase(session.caseContext);
                          setHistoryVisible(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.historyItemHeader}>
                          <Text style={[styles.historyItemPatient, { color: colors.textMuted }]}>
                            {session.patientId}
                          </Text>
                          <Text style={[styles.historyItemDate, { color: colors.textMuted }]}>
                            {session.date}
                          </Text>
                        </View>
                        <Text style={[styles.historyItemTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {session.title}
                        </Text>
                        <Text style={[styles.historyItemMsgs, { color: colors.primary }]}>
                          {session.messages.length} messages · {session.caseContext.site} ({session.caseContext.tnm})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSession(session.id, session.title)}
                        style={[styles.historyDeleteBtn, {
                          borderColor: colors.destructive + '40',
                          backgroundColor: colors.destructive + '10',
                        }]}
                        activeOpacity={0.8}
                      >
                        <Icon name="trash-2" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CaseBanner({ activeCase, onClear }: { activeCase: CaseContext; onClear: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.caseBanner, {
      backgroundColor: colors.infoHighlight,
      borderColor: colors.primary + '40',
    }]}>
      <Icon name="file-text" size={14} color={colors.primary} />
      <Text style={[styles.caseBannerText, { color: colors.primary }]} numberOfLines={1}>
        <Text style={{ fontWeight: '700' }}>Active case:</Text>
        {' '}{activeCase.patientId} · {activeCase.site} · {activeCase.tnm}
      </Text>
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="x" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function MessageBubble({ message: m }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        { justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={{ maxWidth: '82%' }}>
        {m.role === 'ai' && (
          <View style={styles.aiLabel}>
            <Icon name="sparkles" size={10} color={colors.primary} />
            <Text style={[styles.aiLabelText, { color: colors.primary }]}>OcnoDetect AI</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          {
            backgroundColor: m.role === 'user' ? colors.primary : colors.surface,
            borderWidth: m.role === 'user' ? 0 : 1,
            borderColor: colors.border,
            borderBottomRightRadius: m.role === 'user' ? 6 : 16,
            borderBottomLeftRadius: m.role === 'ai' ? 6 : 16,
          },
        ]}>
          <Text style={[styles.bubbleText, {
            color: m.role === 'user' ? colors.primaryForeground : colors.foreground,
          }]}>
            {parseMarkdownToReactNodes(m.text)}
          </Text>
        </View>
        <Text style={[styles.timestamp, {
          color: colors.textMuted,
          textAlign: m.role === 'user' ? 'right' : 'left',
        }]}>
          {m.t}
        </Text>
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  const { colors } = useTheme();
  const d0 = useRef(new Animated.Value(0.3)).current;
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const dots = [d0, d1, d2];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 600, delay: i * 150, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.messageRow}>
      <View style={[styles.typingBubble, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { backgroundColor: colors.textMuted, opacity: d }]}
          />
        ))}
      </View>
    </View>
  );
}

function SuggestionChip({
  text, delay, onPress,
}: { text: string; delay: number; onPress: () => void }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.suggestion, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptyState({ icon, title, ctaLabel, onCta }: {
  icon: string; title: string; ctaLabel?: string; onCta?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { borderColor: colors.border }]}>
        <Icon name={icon} size={22} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{title}</Text>
      {ctaLabel && (
        <TouchableOpacity
          onPress={onCta}
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.emptyCtaText, { color: colors.primaryForeground }]}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  caseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  caseBannerText: {
    fontSize: 12,
    flex: 1,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    gap: 12,
    paddingBottom: 8,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  aiLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'justify',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  suggestions: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12.5,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 0,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13.5,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 12,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  historyModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    gap: 12,
  },
  emptyHistoryText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  historyItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyItemPatient: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontMono,
  },
  historyItemDate: {
    fontSize: 11,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemMsgs: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  historyRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
