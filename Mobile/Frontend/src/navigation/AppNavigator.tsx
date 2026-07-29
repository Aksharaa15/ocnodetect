import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Modal, Text, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/AppContext';
import { useTheme } from '../theme';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ClinicalRefScreen } from '../screens/ClinicalRefScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { getProfile, updateProfile, setApiToken } from '../services/scanwiseApi';
import Icon from '../components/Icon';

export function AppNavigator() {
  const {
    tab,
    setTab,
    activeCase,
    setActiveCase,
    userProfile,
    setUserProfile,
    isOnboarded,
    setIsOnboarded,
    isAuthenticated,
    setIsAuthenticated,
    setAuthToken,
    alertConfig,
    hideAlert,
    showAlert,
    clearUserSession,
    hydrated,
  } = useAppStore();
  const { colors } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      // 2. Sync profile details dynamically from backend upon successful auth
      getProfile()
        .then((data) => {
          if (data && data.userProfile) {
            setUserProfile(data.userProfile);
          }
        })
        .catch((err) => {
          console.warn('[AppNavigator] Failed to sync profile with backend:', err);
          // If the profile sync fails with a 401 (invalid/expired), cleanly log the user out
          if (err.message && err.message.includes('401')) {
            console.warn('[AppNavigator] Invalid credentials token detected. Logging out.');
            clearUserSession();
          }
        });
    }
  }, [isAuthenticated]);

  // ── Hydration wait ──
  if (!hydrated) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
        <View style={styles.loadingLogoRow}>
          <Icon name="heart-pulse" size={48} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.loadingLogoText, { color: colors.foreground }]}>
            Ocno<Text style={{ color: colors.primary }}>Detect</Text>
          </Text>
        </View>
      </View>
    );
  }

  // ── Onboarding gate ──
  if (!isOnboarded) {
    return (
      <OnboardingScreen onComplete={() => setIsOnboarded(true)} />
    );
  }

  // ── Auth gate ──
  if (!isAuthenticated) {
    return (
      <AuthScreen />
    );
  }

  // ── Main app ──
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar />
      <View style={styles.body}>
        <ScreenTransition screenKey={tab}>
          {tab === 'home' && (
            <DashboardScreen onNavigate={setTab} />
          )}
          {tab === 'scan' && (
            <ScanScreen
              onNavigate={setTab}
              onLoadCase={setActiveCase}
              activeCase={activeCase}
            />
          )}
          {tab === 'chat' && (
            <ChatScreen
              activeCase={activeCase}
              onClearCase={() => setActiveCase(null)}
              onNavigate={setTab}
            />
          )}
          {tab === 'ref' && (
            <ClinicalRefScreen activeCase={activeCase} onNavigate={setTab} />
          )}
          {tab === 'profile' && <ProfileScreen />}
        </ScreenTransition>
      </View>
      <BottomTabBar active={tab} onChange={setTab} />

      {/* Global custom themed alert overlay matching app branding */}
      <CustomAlertModal visible={!!alertConfig} config={alertConfig} onClose={hideAlert} />
    </View>
  );
}

/**
 * CustomAlertModal — fully themed alert box replacing native system dialogs
 */
function CustomAlertModal({
  visible,
  config,
  onClose,
}: {
  visible: boolean;
  config: any;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();

  if (!config) return null;

  const buttons = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: 'OK', onPress: () => {} }];

  const isVerticalLayout = buttons.length >= 3;
  const backdropBg = isDark ? 'rgba(5, 10, 18, 0.82)' : 'rgba(15, 23, 42, 0.45)';

  let alertIcon = 'info';
  let alertIconColor = colors.primary;

  const lowerTitle = (config.title || '').toLowerCase();

  if (lowerTitle.includes('success') || lowerTitle.includes('saved') || lowerTitle.includes('complete')) {
    alertIcon = 'check-circle';
    alertIconColor = colors.success;
  } else if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('busy') || lowerTitle.includes('unreachable') || lowerTitle.includes('unavailable')) {
    alertIcon = 'info';
    alertIconColor = colors.destructive;
  } else if (lowerTitle.includes('delete') || lowerTitle.includes('remove') || lowerTitle.includes('log out') || lowerTitle.includes('logout')) {
    alertIcon = 'trash-2';
    alertIconColor = colors.destructive;
  } else if (lowerTitle.includes('confirm')) {
    alertIcon = 'info';
    alertIconColor = colors.primary;
  } else {
    alertIcon = 'heart-pulse';
    alertIconColor = colors.primary;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.alertBackdrop, { backgroundColor: backdropBg }]}>
        <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.alertIconBadge, { backgroundColor: alertIconColor + '15' }]}>
            <Icon name={alertIcon} size={24} color={alertIconColor} strokeWidth={2.5} />
          </View>
          <Text style={[styles.alertTitle, { color: colors.foreground }]}>{config.title}</Text>
          <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{config.message}</Text>
          
          <View style={isVerticalLayout ? styles.alertButtonsCol : [styles.alertButtonsRow, { borderTopColor: colors.border }]}>
            {buttons.map((btn: any, index: number) => {
              const handlePress = () => {
                onClose();
                if (btn.onPress) {
                  btn.onPress();
                }
              };

              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              let btnTextColor = colors.primary;
              if (isDestructive) btnTextColor = colors.destructive;
              else if (isCancel) btnTextColor = colors.textSecondary;

              const isLast = index === buttons.length - 1;

              return (
                <TouchableOpacity
                  key={`${btn.text}-${index}`}
                  onPress={handlePress}
                  style={
                    isVerticalLayout
                      ? [
                          styles.alertBtnVertical,
                          {
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                          }
                        ]
                      : [
                          styles.alertBtn,
                          {
                            borderRightWidth: !isLast && buttons.length > 1 ? 1 : 0,
                            borderRightColor: colors.border,
                          }
                        ]
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.alertBtnText,
                    {
                      color: btnTextColor,
                      fontWeight: isDestructive || !isCancel ? '700' : '500',
                    }
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * ScreenTransition — animated wrapper that fades + slides when the key changes.
 * Mirrors framer-motion's AnimatePresence mode="wait".
 */
function ScreenTransition({ screenKey, children }: { screenKey: string; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const prevKey = useRef(screenKey);

  useEffect(() => {
    if (prevKey.current === screenKey) return;
    prevKey.current = screenKey;

    // exit → reset → enter
    opacity.setValue(0);
    translateY.setValue(5);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [screenKey]);

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  alertBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 290,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  alertIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 13.5,
    textAlign: 'center',
    paddingHorizontal: 18,
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderTopWidth: 1,
    height: 46,
  },
  alertButtonsCol: {
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  alertBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  alertBtnVertical: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  alertBtnText: {
    fontSize: 14,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingLogoText: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
});
