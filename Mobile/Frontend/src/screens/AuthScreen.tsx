/**
 * AuthScreen — pixel-perfect port of ocno/src/components/Auth.tsx
 *
 * Login / Signup toggled with animated name field (AnimatePresence → Animated height).
 * Icons: HeartPulse logo, Mail, Lock, User, ArrowRight, Stethoscope, Home.
 * Spinner on submit. Calls loginUser/registerUser and hydrates session states.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  StyleProp,
  TextStyle,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import Icon from '../components/Icon';
import { useAppStore } from '../store/AppContext';
import { loginUser, registerUser } from '../services/scanwiseApi';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export function AuthScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { setAuthToken, setIsAuthenticated, setUserProfile } = useAppStore();

  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [institution, setInstitution] = useState('');

  // Inline Validation Error States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [specialtyError, setSpecialtyError] = useState('');
  const [institutionError, setInstitutionError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Animated height for the name field (only shown on Sign Up)
  const nameFieldHeight = useRef(new Animated.Value(0)).current;
  const nameFieldOpacity = useRef(new Animated.Value(0)).current;

  // Background entrance
  const bgOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bgOpacity, { toValue: 0.05, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    // Clear all errors when toggling between sign in and sign up
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setSpecialtyError('');
    setInstitutionError('');
    setGeneralError('');

    if (!isLogin) {
      // Expand (fits 3 fields of 52px + gaps)
      Animated.parallel([
        Animated.timing(nameFieldHeight, { toValue: 190, duration: 260, useNativeDriver: false }),
        Animated.timing(nameFieldOpacity, { toValue: 1, duration: 260, useNativeDriver: false }),
      ]).start();
    } else {
      // Collapse
      Animated.parallel([
        Animated.timing(nameFieldHeight, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(nameFieldOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [isLogin]);

  async function handleSubmit() {
    const trimmedEmail = email.trim();

    // Reset all errors
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setSpecialtyError('');
    setInstitutionError('');
    setGeneralError('');

    let hasError = false;

    if (!trimmedEmail) {
      setEmailError('Clinical email is required.');
      hasError = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid clinical email (e.g. surgeon@hospital.com).');
        hasError = true;
      }
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasError = true;
    }

    if (!isLogin) {
      if (!name.trim()) {
        setNameError('Full name is required.');
        hasError = true;
      }
      if (!specialty.trim()) {
        setSpecialtyError('Medical specialty is required.');
        hasError = true;
      }
      if (!institution.trim()) {
        setInstitutionError('Clinical institution is required.');
        hasError = true;
      }
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        console.log(`[Auth] Triggering login query for: ${trimmedEmail}`);
        const data = await loginUser(trimmedEmail, password);
        setAuthToken(data.token);
        setUserProfile(data.userProfile);
        setIsAuthenticated(true);
      } else {
        console.log(`[Auth] Triggering registration query for: ${trimmedEmail}`);
        const data = await registerUser({
          name: name.trim(),
          email: trimmedEmail,
          password,
          specialty: specialty.trim(),
          institution: institution.trim(),
        });
        setAuthToken(data.token);
        setUserProfile(data.userProfile);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.warn('[Auth] Error during submit:', err);
      setGeneralError(err.message || 'An error occurred during submission.');
    } finally {
      setIsLoading(false);
    }
  }

  const inputStyle: StyleProp<TextStyle> = [
    styles.input,
    {
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.foreground,
    },
  ];

  const ICON_COLOR = colors.textMuted;

  if (showForgotPassword) {
    return <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
    >
      {/* Background Orbs layer positioned statically to never interfere with Keyboard or layouts */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          style={[
            styles.radialGlowTopRight,
            { backgroundColor: colors.primary, opacity: bgOpacity },
          ]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.radialGlowBottomLeft,
            { backgroundColor: colors.primary, opacity: bgOpacity },
          ]}
          pointerEvents="none"
        />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[
          styles.root,
          {
            backgroundColor: 'transparent',
            paddingTop: Math.max(insets.top + 24, 48),
            paddingBottom: Math.max(insets.bottom + 24, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.card}>
          {/* Logo icon */}
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary + '1A' }]}>
              <Icon name="heart-pulse" size={32} color={colors.primary} strokeWidth={2.5} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isLogin
                ? 'Enter your clinical credentials to access your dashboard.'
                : 'Register to start using OcnoDetect.'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* General Error Banner */}
            {generalError ? (
              <View style={[styles.generalErrorCard, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '35' }]}>
                <Icon name="info" size={16} color={colors.destructive} />
                <Text style={[styles.generalErrorText, { color: colors.destructive }]}>{generalError}</Text>
              </View>
            ) : null}

            {/* Animated inputs (Sign Up only) */}
            <Animated.View
              style={{
                height: nameFieldHeight,
                opacity: nameFieldOpacity,
                overflow: 'hidden',
                gap: 16,
              }}
            >
              {/* Name */}
              <View style={{ gap: 4 }}>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Icon name="user" size={20} color={ICON_COLOR} />
                  </View>
                  <TextInput
                    style={[inputStyle, nameError ? { borderColor: colors.destructive } : null]}
                    placeholder="Full Name (e.g. Dr. Ramesh)"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      setNameError('');
                      setGeneralError('');
                    }}
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              </View>

              {/* Specialty */}
              <View style={{ gap: 4 }}>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Icon name="stethoscope" size={20} color={ICON_COLOR} />
                  </View>
                  <TextInput
                    style={[inputStyle, specialtyError ? { borderColor: colors.destructive } : null]}
                    placeholder="Specialty (e.g. Head & Neck Surgeon)"
                    placeholderTextColor={colors.textMuted}
                    value={specialty}
                    onChangeText={(val) => {
                      setSpecialty(val);
                      setSpecialtyError('');
                      setGeneralError('');
                    }}
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {specialtyError ? <Text style={styles.errorText}>{specialtyError}</Text> : null}
              </View>

              {/* Institution */}
              <View style={{ gap: 4 }}>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Icon name="home" size={20} color={ICON_COLOR} />
                  </View>
                  <TextInput
                    style={[inputStyle, institutionError ? { borderColor: colors.destructive } : null]}
                    placeholder="Institution (e.g. Apollo Hospitals)"
                    placeholderTextColor={colors.textMuted}
                    value={institution}
                    onChangeText={(val) => {
                      setInstitution(val);
                      setInstitutionError('');
                      setGeneralError('');
                    }}
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {institutionError ? <Text style={styles.errorText}>{institutionError}</Text> : null}
              </View>
            </Animated.View>

            {/* Email */}
            <View style={{ gap: 4 }}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Icon name="mail" size={20} color={ICON_COLOR} />
                </View>
                <TextInput
                  style={[inputStyle, emailError ? { borderColor: colors.destructive } : null]}
                  placeholder="Clinical Email Address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setEmailError('');
                    setGeneralError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password */}
            <View style={{ gap: 4 }}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Icon name="lock" size={20} color={ICON_COLOR} />
                </View>
                <TextInput
                  style={[inputStyle, passwordError ? { borderColor: colors.destructive } : null]}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setPasswordError('');
                    setGeneralError('');
                  }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 },
              ]}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                  </Text>
                  <Icon name="arrow-right" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} activeOpacity={0.7}>
              <Text style={[styles.switchText, { color: colors.primary }]}>
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ marginTop: 4 }}
                onPress={() => setShowForgotPassword(true)}
              >
                <Text style={[styles.forgotText, { color: colors.textMuted }]}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  card: {
    width: '100%',
    maxWidth: 360,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 8,
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
  submitBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 4,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  generalErrorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  generalErrorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
});
