/**
 * PageShell — animated page wrapper, mirrors framer-motion PageShell from the web.
 * Uses React Native Animated for fade + slide-in transition.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

interface PageShellProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function PageShell({ children, scrollable = true }: PageShellProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const content = (
    <Animated.View style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );

  if (!scrollable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  wrapper: {
    flex: 1,
  },
});
