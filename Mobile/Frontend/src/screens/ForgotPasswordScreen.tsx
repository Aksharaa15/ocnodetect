/**
 * ForgotPasswordScreen — 3-step OTP-based password reset flow.
 *
 * Step 1: Enter email → backend sends OTP
 * Step 2: Enter 6-digit OTP
 * Step 3: Set new password → backend resets & returns success
 *
 * Design mirrors AuthScreen exactly (card, orbs, input style, colors).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import Icon from '../components/Icon';
import { forgotPassword, verifyOtp, resetPassword } from '../services/scanwiseApi';

type Step = 'email' | 'otp' | 'newPassword' | 'success';

interface Props {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Background entrance
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0.05, duration: 600, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate in when step changes
  useEffect(() => {
    cardOpacity.setValue(0);
    cardTranslateY.setValue(12);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // ── Step handlers ──────────────────────────────────────────────────────────

  async function handleSendOtp() {
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Clinical email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(trimmedEmail);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(email.trim(), otp.trim());
      setStep('newPassword');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    setError('');
    if (!newPassword) {
      setError('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step metadata ──────────────────────────────────────────────────────────

  const stepMeta: Record<Step, { icon: string; title: string; subtitle: string }> = {
    email: {
      icon: 'mail',
      title: 'Forgot Password',
      subtitle: "Enter your clinical email and we'll send a one-time code.",
    },
    otp: {
      icon: 'shield',
      title: 'Enter OTP',
      subtitle: `A 6-digit code was sent to ${email}. Check your inbox.`,
    },
    newPassword: {
      icon: 'lock',
      title: 'New Password',
      subtitle: 'Choose a strong new password for your account.',
    },
    success: {
      icon: 'check-circle',
      title: 'Password Reset!',
      subtitle: 'Your password has been updated. You can now sign in.',
    },
  };

  const meta = stepMeta[step];
  const ICON_COLOR = colors.textMuted;
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding">
      {/* Background orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          style={[styles.radialGlowTopRight, { backgroundColor: colors.primary, opacity: bgOpacity }]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.radialGlowBottomLeft, { backgroundColor: colors.primary, opacity: bgOpacity }]}
          pointerEvents="none"
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.root,
          {
            paddingTop: Math.max(insets.top + 24, 48),
            paddingBottom: Math.max(insets.bottom + 24, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button — hidden on success since the button below handles it */}
        {step !== 'success' && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={20} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Back to Sign In</Text>
          </TouchableOpacity>
        )}

        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoBox,
                {
                  backgroundColor:
                    step === 'success' ? colors.success + '1A' : colors.primary + '1A',
                },
              ]}
            >
              <Icon
                name={meta.icon}
                size={32}
                color={step === 'success' ? colors.success : colors.primary}
                strokeWidth={2.5}
              />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{meta.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{meta.subtitle}</Text>
          </View>

          {/* Step progress dots */}
          {step !== 'success' && (
            <View style={styles.progressRow}>
              {(['email', 'otp', 'newPassword'] as Step[]).map((s) => {
                const stepOrder: Step[] = ['email', 'otp', 'newPassword'];
                const currentIdx = stepOrder.indexOf(step);
                const sIdx = stepOrder.indexOf(s);
                const isActive = s === step;
                const isDone = sIdx < currentIdx;
                return (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : isDone
                          ? colors.primary + '60'
                          : colors.border,
                        width: isActive ? 20 : 8,
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Error banner */}
          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '35' },
              ]}
            >
              <Icon name="info" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Icon name="mail" size={20} color={ICON_COLOR} />
                </View>
                <TextInput
                  style={inputStyle}
                  placeholder="Clinical Email Address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
              </View>
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={isLoading}
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Send OTP</Text>
                    <Icon name="send" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <View style={styles.form}>
              <TextInput
                style={[
                  styles.otpInput,
                  { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground },
                ]}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textMuted}
                value={otp}
                onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
              />
              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={isLoading}
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Verify OTP</Text>
                    <Icon name="arrow-right" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendOtp} activeOpacity={0.7} style={{ alignItems: 'center' }}>
                <Text style={[styles.resendText, { color: colors.primary }]}>Didn't receive it? Resend OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'newPassword' && (
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Icon name="lock" size={20} color={ICON_COLOR} />
                </View>
                <TextInput
                  style={inputStyle}
                  placeholder="New Password"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setError(''); }}
                  secureTextEntry
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Icon name="shield-check" size={20} color={ICON_COLOR} />
                </View>
                <TextInput
                  style={inputStyle}
                  placeholder="Confirm New Password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
              </View>
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading}
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Reset Password</Text>
                    <Icon name="check" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 4: Success ── */}
          {step === 'success' && (
            <View style={styles.form}>
              <TouchableOpacity
                onPress={onBack}
                style={[styles.submitBtn, { backgroundColor: colors.success }]}
                activeOpacity={0.88}
              >
                <Text style={[styles.submitText, { color: '#fff' }]}>Back to Sign In</Text>
                <Icon name="log-in" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { width: W } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  radialGlowTopRight: {
    position: 'absolute',
    top: -W * 0.6,
    right: -W * 0.6,
    width: W * 1.2,
    height: W * 1.2,
    borderRadius: W * 0.6,
  },
  radialGlowBottomLeft: {
    position: 'absolute',
    bottom: -W * 0.4,
    left: -W * 0.4,
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 360,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    height: 52,
    paddingLeft: 44,
    paddingRight: 16,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '400',
  },
  otpInput: {
    height: 72,
    borderWidth: 1,
    borderRadius: 16,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 12,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
