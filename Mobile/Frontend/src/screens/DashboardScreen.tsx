/**
 * DashboardScreen — pixel-perfect match of Dashboard.tsx from the web.
 * 
 * Sections (in order):
 * 1. Header — "Good morning, Dr. Ramesh" + date badge
 * 2. Stats grid — 2×2 cards with colored left accent bar
 * 3. Recent cases — list with chevron, patient ID, site+TNM badges
 * 4. Case insight — highlighted banner with "Open case →"
 * 5. Case distribution — animated progress bars
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useTheme, typography } from '../theme';
import { PageShell } from '../components/PageShell';
import { SectionTitle } from '../components/SectionTitle';
import type { TabKey } from '../store/types';
import { getDashboard } from '../services/scanwiseApi';
import { useAppStore } from '../store/AppContext';
import Icon from '../components/Icon';

const stats = [
  { label: 'Cases Reviewed', value: '0', iconName: 'stethoscope', lib: 'feather' },
  { label: 'Total Patients', value: '0', iconName: 'user-circle', lib: 'feather' },
  { label: 'Chat Sessions', value: '0', iconName: 'message-circle', lib: 'feather' },
  { label: 'Avg. Processing', value: '0s', iconName: 'timer', lib: 'feather' },
];


interface Props {
  onNavigate: (t: TabKey) => void;
}

export function DashboardScreen({ onNavigate }: Props) {
  const { colors } = useTheme();
  const { userProfile, activeCase, savedCases, setActiveCase } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [insightData, setInsightData] = useState<any>(null);
  const [distData, setDistData] = useState<any[]>([]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDashboard();
      setStatsData(data.stats);
      setRecentCases(data.recent);
      setInsightData(data.insight);
      setDistData(data.distribution);
    } catch (err) {
      console.warn('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeCase]); // Refresh when a new scan is loaded!

  // Map backend stats dynamically over client stats to preserve icons & metadata
  const mergedStats = stats.map((s) => {
    const backendVal = statsData.find((b) => b.label === s.label);
    return {
      ...s,
      value: backendVal ? backendVal.value : (s.label === 'Avg. Processing' ? '0s' : '0'),
    };
  });

  // Extract greeting name (e.g. Dr. Ramesh Krishnamurthy -> Ramesh)
  const displayName = userProfile.name.startsWith('Dr. ') 
    ? userProfile.name.substring(4).split(' ')[0] 
    : userProfile.name.split(' ')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  };
  const greetingText = getGreeting();

  return (
    <PageShell>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {greetingText}, Dr. {displayName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {recentCases.length} cases analyzed in database
          </Text>
        </View>
        <View style={[styles.dateBadge, {
          backgroundColor: colors.subtle,
          borderColor: colors.border,
        }]}>
          <Text style={[styles.dateBadgeText, { color: colors.textSecondary }]}>
            {today}
          </Text>
        </View>
      </View>

      {/* Stats 2×2 grid */}
      <View style={styles.statsGrid}>
        {mergedStats.map((s, i) => (
          <StatCard key={s.label} stat={s} delay={i * 40} />
        ))}
      </View>

      {/* Recent Saved Cases — Interactive List */}
      <SectionTitle title="Recent Saved Cases" />
      <View style={[styles.caseList, {
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }]}>
        {savedCases.length === 0 ? (
          <View style={styles.emptyCasesContainer}>
            <Text style={[styles.emptyCasesText, { color: colors.textMuted }]}>
              No saved cases. Go to Scan and save cases to records!
            </Text>
          </View>
        ) : (
          savedCases.slice().reverse().slice(0, 3).map((c, idx) => (
            <CaseRow
              key={`${c.patientId}-${idx}`}
              caseItem={{
                id: c.patientId,
                site: c.site,
                tnm: c.tnm,
                date: c.date || 'Saved recently',
              }}
              isLast={idx === Math.min(savedCases.length, 3) - 1}
              onPress={() => {
                setActiveCase(c);
                onNavigate('scan');
              }}
            />
          ))
        )}
      </View>

      {/* Case insight banner */}
      {recentCases.length > 0 && insightData && (
        <CaseInsightBanner insight={insightData} onNavigate={onNavigate} />
      )}

      {/* Case distribution */}
      <SectionTitle title="Case distribution — last 30 days" />
      <DistributionCard distribution={distData} />
    </PageShell>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function parseValue(valStr: string): { type: 'number' | 'time'; target: number } {
  const timeRegex = /^(?:(\d+)m\s*)?(\d+)s$/;
  const match = valStr.trim().match(timeRegex);
  if (match) {
    const mins = match[1] ? parseInt(match[1], 10) : 0;
    const secs = parseInt(match[2], 10);
    return { type: 'time', target: mins * 60 + secs };
  }
  const num = parseInt(valStr.replace(/[^\d]/g, ''), 10);
  if (!isNaN(num)) {
    return { type: 'number', target: num };
  }
  return { type: 'number', target: 0 };
}

function formatValue(type: 'number' | 'time', currentVal: number): string {
  if (type === 'time') {
    const mins = Math.floor(currentVal / 60);
    const secs = currentVal % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }
  return String(currentVal);
}

function StatCard({ stat, delay }: { stat: typeof stats[0]; delay: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  const [displayValue, setDisplayValue] = useState(() => {
    const { type } = parseValue(stat.value);
    return type === 'time' ? '0s' : '0';
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const { type, target } = parseValue(stat.value);
    if (target === 0) {
      setDisplayValue(type === 'time' ? '0s' : '0');
      return;
    }

    const duration = 1200; // smooth 1.2s count up
    const startTime = Date.now();
    let animationFrameId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Quadratic ease-out curve
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(easeProgress * target);
      
      setDisplayValue(formatValue(type, current));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    const timerId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timerId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [stat.value, delay]);

  return (
    <Animated.View style={[
      styles.statCard,
      { backgroundColor: colors.surface, borderColor: colors.border, opacity, transform: [{ translateY }] },
    ]}>
      {/* Left accent bar */}
      <View style={[styles.statAccentBar, { backgroundColor: colors.primary }]} />
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
          <Icon name={stat.iconName} size={14} color={colors.textMuted} />
        </View>
        <Text style={[styles.statValue, { color: colors.primary }]}>{displayValue}</Text>
      </View>
    </Animated.View>
  );
}

function CaseRow({
  caseItem,
  isLast,
  onPress,
}: {
  caseItem: { id: string; site: string; tnm: string; date: string };
  isLast: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.caseRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.caseRowContent}>
        <View style={styles.caseIdRow}>
          <Text style={[styles.caseId, { color: colors.foreground }]}>{caseItem.id}</Text>
          <Text style={[styles.caseDate, { color: colors.textMuted }]}>{caseItem.date}</Text>
        </View>
        <View style={styles.caseBadges}>
          <Badge>{caseItem.site}</Badge>
          <Badge tone="accent">{caseItem.tnm}</Badge>
        </View>
      </View>
      <Icon name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function Badge({ children, tone = 'default' }: { children: string; tone?: 'default' | 'accent' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, {
      backgroundColor: tone === 'accent' ? colors.infoHighlight : colors.subtle,
      borderColor: colors.border,
    }]}>
      <Text style={[styles.badgeText, {
        color: tone === 'accent' ? colors.primary : colors.textSecondary,
      }]}>
        {children}
      </Text>
    </View>
  );
}

function CaseInsightBanner({
  insight,
  onNavigate,
}: {
  insight: { patientId: string; text: string };
  onNavigate: (t: TabKey) => void;
}) {
  const { colors } = useTheme();
  const textBody = insight.text.replace(insight.patientId, '').trim();

  return (
    <View style={[styles.insightBanner, {
      backgroundColor: colors.infoHighlight,
      borderColor: colors.primary + '40',
      marginBottom: 24,
    }]}>
      <View style={styles.insightHeader}>
        <Icon name="sparkles" size={14} color={colors.primary} />
        <Text style={[styles.insightLabel, { color: colors.primary }]}>CASE INSIGHT</Text>
      </View>
      <Text style={[styles.insightText, { color: colors.foreground }]}>
        <Text style={styles.insightMono}>{insight.patientId}</Text>
        {' '}{textBody}
      </Text>
      <TouchableOpacity onPress={() => onNavigate('scan')} style={styles.insightCta}>
        <Text style={[styles.insightCtaText, { color: colors.primary }]}>Open case </Text>
        <Icon name="chevron-right" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function DistributionCard({ distribution }: { distribution: Array<{ label: string; pct: number }> }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.distributionCard, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    }]}>
      {distribution.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
            No distribution data. Staged cases will appear here.
          </Text>
        </View>
      ) : (
        <View>
          {/* The vertical bars container */}
          <View style={styles.chartContainer}>
            {distribution.map((d: { label: string; pct: number }, i: number) => (
              <DistributionBar key={d.label} label={d.label} pct={d.pct} index={i} />
            ))}
          </View>
          
          {/* X-axis line */}
          <View style={[styles.xAxis, { backgroundColor: colors.border }]} />

          {/* Color-coded Legend */}
          <View style={styles.legendContainer}>
            {distribution.map((d, i) => {
              const getBarColor = (idx: number) => {
                if (isDark) {
                  const darkPalette = [
                    '#2E9ACC', // Neon Blue
                    '#1ABDA0', // Bright Teal
                    '#2EC480', // Vibrant Green
                    '#E09030', // Sunny Orange
                    '#E06060', // Coral Red
                  ];
                  return darkPalette[idx % darkPalette.length];
                } else {
                  const lightPalette = [
                    '#64B5F6', // Pastel Blue
                    '#4DB6AC', // Pastel Teal
                    '#81C784', // Pastel Green
                    '#FFB74D', // Pastel Orange
                    '#E57373', // Pastel Coral Red
                  ];
                  return lightPalette[idx % lightPalette.length];
                }
              };
              const barColor = getBarColor(i);
              return (
                <View key={d.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: barColor }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    {d.label} ({d.pct}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
      <View style={[styles.distFooter, { borderTopColor: colors.border, marginTop: 12 }]}>
        <Icon name="activity" size={12} color={colors.textMuted} />
        <Text style={[styles.distFooterText, { color: colors.textMuted }]}>
          {distribution.length === 0 ? ' No active metrics' : ' Trending stable'}
        </Text>
      </View>
    </View>
  );
}

function DistributionBar({ label, pct, index }: { label: string; pct: number; index: number }) {
  const { colors, isDark } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const CHART_HEIGHT = 170;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 600,
      delay: 80 + index * 50,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const getBarColor = (idx: number) => {
    if (isDark) {
      const darkPalette = [
        '#2E9ACC',
        '#1ABDA0',
        '#2EC480',
        '#E09030',
        '#E06060',
      ];
      return darkPalette[idx % darkPalette.length];
    } else {
      const lightPalette = [
        '#64B5F6',
        '#4DB6AC',
        '#81C784',
        '#FFB74D',
        '#E57373',
      ];
      return lightPalette[idx % lightPalette.length];
    }
  };

  const barColor = getBarColor(index);
  const abbr = label.length > 8 ? label.substring(0, 3).toUpperCase() : label.toUpperCase();

  return (
    <View style={styles.barCol}>
      {/* Percentage label — always fully visible, bold dark text */}
      <Text
        style={[
          styles.barValueText,
          {
            color: isDark ? '#FFFFFF' : '#1A1A2E',
          },
        ]}
      >
        {pct}%
      </Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.verticalBar,
            {
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, CHART_HEIGHT],
              }),
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.barAbbr, { color: colors.textSecondary }]} numberOfLines={1}>
        {abbr}
      </Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  dateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  statAccentBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  statContent: {
    flex: 1,
    paddingLeft: 6,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  caseList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  caseRowContent: {
    flex: 1,
  },
  caseIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caseId: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: typography.fontMono,
  },
  caseDate: {
    fontSize: 11,
  },
  caseBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  insightBanner: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
  },
  insightMono: {
    fontFamily: typography.fontMono,
    fontWeight: '500',
  },
  insightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  insightCtaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  distributionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 220,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 20,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValueText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: typography.fontMono,
    letterSpacing: -0.3,
  },
  barTrack: {
    height: 170,
    width: 36,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  verticalBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barAbbr: {
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  xAxis: {
    height: 1,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  distFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  distFooterText: {
    fontSize: 11,
  },
  emptyCasesContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCasesText: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});
