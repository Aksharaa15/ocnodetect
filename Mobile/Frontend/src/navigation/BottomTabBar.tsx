/**
 * BottomTabBar — pixel-perfect match of BottomNav.tsx from the web.
 *
 * 5 tabs: Dashboard | Scan (primary, larger icon) | Chat | Clinical | Profile
 * Active indicator: animated dot below the active tab icon.
 * Active color: primary. Inactive: textSecondary.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import type { TabKey } from '../store/types';
import Icon from '../components/Icon';

const tabs: {
  key: TabKey;
  label: string;
  iconName: string;
  primary?: boolean;
}[] = [
  { key: 'home', label: 'Home', iconName: 'home' },
  { key: 'scan', label: 'Scan', iconName: 'scan-line', primary: true },
  { key: 'chat', label: 'Chat', iconName: 'message-circle' },
  { key: 'ref', label: 'Clinical', iconName: 'book-open' },
  { key: 'profile', label: 'Profile', iconName: 'user-circle' },
];

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

export function BottomTabBar({ active, onChange }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface + 'C8', // ~78% opacity like the web
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 8),
      },
    ]}>
      {tabs.map(({ key, label, iconName, primary }) => {
        const isActive = active === key;
        return (
          <TabItem
            key={key}
            tabKey={key}
            label={label}
            iconName={iconName}
            primary={primary}
            isActive={isActive}
            onPress={() => onChange(key)}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  tabKey, label, iconName, primary, isActive, onPress,
}: {
  tabKey: TabKey;
  label: string;
  iconName: string;
  primary?: boolean;
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const dotOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(dotOpacity, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Icon
        name={iconName}
        size={primary ? 28 : 24}
        color={isActive ? colors.primary : colors.textSecondary}
        strokeWidth={isActive ? 2.25 : 1.75}
      />
      <Text style={[styles.tabLabel, {
        color: isActive ? colors.primary : colors.textSecondary,
      }]}>
        {label}
      </Text>
      <Animated.View style={[styles.dot, {
        backgroundColor: colors.primary,
        opacity: dotOpacity,
      }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    height: 68,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
