/**
 * TopBar — OcnoDetect wordmark matching ocno/src/components layout.
 * 
 * Contains:
 * - "Ocno" + "Detect" (primary colour) wordmark + HeartPulse activity icon
 * - Dark/light mode toggle button (sun/moon icon rotation animation)
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import Icon from '../components/Icon';

export function TopBar() {
  const { colors, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;

  const animateToggle = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 0, duration: 125, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: isDark ? -90 : 90, duration: 125, useNativeDriver: true }),
      ]),
    ]).start(() => {
      toggle();
      iconRotate.setValue(isDark ? 90 : -90);
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 1, duration: 125, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0, duration: 125, useNativeDriver: true }),
      ]).start();
    });
  };

  const spin = iconRotate.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ['-90deg', '0deg', '90deg'],
  });

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface + 'CC',
        borderBottomColor: colors.border,
        paddingTop: Math.max(insets.top, 0),
      },
    ]}>
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brand}>
          <Icon name="heart-pulse" size={22} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.wordmark, { color: colors.foreground }]}>
            Ocno<Text style={{ color: colors.primary }}>Detect</Text>
          </Text>
        </View>

        {/* Theme toggle */}
        <TouchableOpacity
          onPress={animateToggle}
          style={styles.themeBtn}
          accessibilityLabel="Toggle theme"
        >
          <Animated.View style={{ opacity: iconOpacity, transform: [{ rotate: spin }] }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={20} color={colors.foreground} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  inner: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  themeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginRight: -8,
  },
});
