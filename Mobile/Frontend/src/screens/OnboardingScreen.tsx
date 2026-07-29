/**
 * OnboardingScreen — pixel-perfect port of ocno/src/components/Onboarding.tsx
 *
 * 3 slides: Clinical Precision · AI-Powered Insights · Evidence-Based
 * Logo: HeartPulse icon + "Ocno" + "Detect" (primary colour)
 * Animated ambient blobs, cross-fade slide transition, dot indicators,
 * Continue / Get Started / Skip Intro buttons.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import Icon from '../components/Icon';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'precision',
    title: 'Clinical Precision',
    description:
      'On-demand decision support tailored for head and neck oncology.',
    iconName: 'activity',       // lucide Activity — same as ocno slide 1
    colorKey: 'primary',
    bgAlpha: '1A',
  },
  {
    id: 'ai',
    title: 'AI-Powered Insights',
    description:
      'Instant analysis of CT scans and pathology reports with deep clinical context.',
    iconName: 'brain',          // lucide Brain — same as ocno slide 2
    colorKey: 'accentSecondary',
    bgAlpha: '1A',
  },
  {
    id: 'trust',
    title: 'Evidence-Based',
    description:
      'Real-time synchronization with NCCN protocols and peer-reviewed literature.',
    iconName: 'shield-check',   // lucide ShieldCheck — same as ocno slide 3
    colorKey: 'warning',
    bgAlpha: '1A',
  },
] as const;

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  // Slide content fade+scale animation
  const slideOpacity = useRef(new Animated.Value(1)).current;
  const slideScale = useRef(new Animated.Value(1)).current;

  // Ambient blob pulse animations
  const blobScale1 = useRef(new Animated.Value(1)).current;
  const blobOpacity1 = useRef(new Animated.Value(0.5)).current;
  const blobScale2 = useRef(new Animated.Value(1)).current;
  const blobOpacity2 = useRef(new Animated.Value(0.5)).current;

  // Logo entrance animation
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(logoTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Blob 1 pulse (8s loop)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blobScale1, { toValue: 1.2, duration: 4000, useNativeDriver: true }),
          Animated.timing(blobOpacity1, { toValue: 0.8, duration: 4000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(blobScale1, { toValue: 1, duration: 4000, useNativeDriver: true }),
          Animated.timing(blobOpacity1, { toValue: 0.5, duration: 4000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Blob 2 pulse (10s loop, offset)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blobScale2, { toValue: 1.5, duration: 5000, useNativeDriver: true }),
          Animated.timing(blobOpacity2, { toValue: 0.7, duration: 5000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(blobScale2, { toValue: 1, duration: 5000, useNativeDriver: true }),
          Animated.timing(blobOpacity2, { toValue: 0.5, duration: 5000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  function goTo(nextStep: number) {
    // exit
    Animated.parallel([
      Animated.timing(slideOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      // enter
      slideScale.setValue(1.05);
      Animated.parallel([
        Animated.timing(slideOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideScale, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }

  function handleNext() {
    if (step < SLIDES.length - 1) {
      goTo(step + 1);
    } else {
      onComplete();
    }
  }

  const slide = SLIDES[step];
  const iconColor =
    slide.colorKey === 'primary'
      ? colors.primary
      : slide.colorKey === 'accentSecondary'
      ? colors.accentSecondary
      : colors.warning;

  const iconBg = iconColor + '1A'; // ~10% opacity

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {/* Ambient blob — top right */}
      <Animated.View
        style={[
          styles.blob1,
          {
            backgroundColor: colors.primary + '0D', // 5%
            opacity: blobOpacity1,
            transform: [{ scale: blobScale1 }],
          },
        ]}
      />
      {/* Ambient blob — bottom left */}
      <Animated.View
        style={[
          styles.blob2,
          {
            backgroundColor: colors.accentSecondary + '0D',
            opacity: blobOpacity2,
            transform: [{ scale: blobScale2 }],
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoRow,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          },
        ]}
      >
        <Icon name="heart-pulse" size={32} color={colors.primary} strokeWidth={2.5} />
        <Text style={[styles.logoText, { color: colors.foreground }]}>
          Ocno<Text style={{ color: colors.primary }}>Detect</Text>
        </Text>
      </Animated.View>

      {/* Slide content */}
      <View style={styles.slideArea}>
        <Animated.View
          style={[
            styles.slideContent,
            { opacity: slideOpacity, transform: [{ scale: slideScale }] },
          ]}
        >
          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Icon name={slide.iconName} size={64} color={iconColor} strokeWidth={1.5} />
          </View>

          <Text style={[styles.slideTitle, { color: colors.foreground }]}>
            {slide.title}
          </Text>
          <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>
            {slide.description}
          </Text>
        </Animated.View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === step
                  ? { width: 24, backgroundColor: colors.primary }
                  : { width: 6, backgroundColor: colors.border },
              ]}
            />
          ))}
        </View>

        {/* Continue / Get Started button */}
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.88}
        >
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
            {step === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
          {step !== SLIDES.length - 1 && (
            <Icon name="chevron-right" size={20} color={colors.primaryForeground} strokeWidth={2.5} />
          )}
        </TouchableOpacity>

        {/* Skip Intro */}
        {step < SLIDES.length - 1 && (
          <TouchableOpacity onPress={onComplete} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip Intro</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const BLOB_SIZE = W * 1.1;

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', overflow: 'hidden' },

  // Blobs
  blob1: {
    position: 'absolute',
    top: -(BLOB_SIZE / 2),
    right: -(BLOB_SIZE / 2),
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
  },
  blob2: {
    position: 'absolute',
    bottom: -(BLOB_SIZE / 2),
    left: -(BLOB_SIZE / 2),
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    zIndex: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },

  // Slide
  slideArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
    zIndex: 10,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  slideDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 280,
  },

  // Controls
  controls: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 40,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    marginTop: 16,
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
