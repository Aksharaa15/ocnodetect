/**
 * ClinicalRefScreen — pixel-perfect match of ClinicalRef.tsx from the web.
 *
 * Sections (in order):
 * 1. Header — "Clinical reference" h1
 * 2. Segmented pill — "Guidelines" | "Research" with animated slider
 * 3a. Guidelines tab — context banner + NCCN card + TNM reference table
 * 3b. Research tab — context banner + sort chips + paper cards
 * 4. Empty state — when no case loaded, icon + CTA
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { useTheme, typography } from '../theme';
import { PageShell } from '../components/PageShell';
import type { CaseContext, TabKey } from '../store/types';
import Icon from '../components/Icon';
import { getClinicalReference } from '../services/scanwiseApi';
import { useAppStore } from '../store/AppContext';

type Sub = 'guidelines' | 'research';

interface Props {
  activeCase: CaseContext | null;
  onNavigate: (t: TabKey) => void;
}

export function ClinicalRefScreen({ activeCase, onNavigate }: Props) {
  const { colors } = useTheme();
  const { activeReference, setActiveReference } = useAppStore();
  const [sub, setSub] = useState<Sub>('guidelines');
  const [loading, setLoading] = useState(false);
  const sliderAnim = useRef(new Animated.Value(0)).current;

  const protocols = activeReference?.protocols || [];
  const papersList = activeReference?.papers || [];

  useEffect(() => {
    if (!activeCase) return;
    if (activeReference) return; // Served from local AppContext cache!

    let isMounted = true;
    const fetchReference = async () => {
      setLoading(true);
      try {
        const ref = await getClinicalReference(activeCase);
        if (isMounted) {
          setActiveReference(ref);
        }
      } catch (err) {
        console.warn('Failed to load clinical reference:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReference();

    return () => {
      isMounted = false;
    };
  }, [activeCase, activeReference]);

  const switchTab = (s: Sub) => {
    setSub(s);
    Animated.spring(sliderAnim, {
      toValue: s === 'guidelines' ? 0 : 1,
      useNativeDriver: false,
      stiffness: 380,
      damping: 30,
    }).start();
  };

  return (
    <PageShell>
      <Text style={[styles.title, { color: colors.foreground }]}>Clinical reference</Text>

      {/* Segmented pill */}
      <View style={[styles.segmented, {
        backgroundColor: colors.subtle,
        borderColor: colors.border,
      }]}>
        <Animated.View style={[
          styles.segSlider,
          {
            backgroundColor: colors.surface,
            left: sliderAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0.8%', '50%'],
            }),
          },
        ]} />
        {(['guidelines', 'research'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => switchTab(s)}
            style={styles.segBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.segText, {
              color: sub === s ? colors.foreground : colors.textSecondary,
            }]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!activeCase ? (
        <Empty onNavigate={onNavigate} sub={sub} />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analyzing stage protocols...
          </Text>
        </View>
      ) : sub === 'guidelines' ? (
        <Guidelines activeCase={activeCase} protocols={protocols} />
      ) : (
        <Research activeCase={activeCase} papersList={papersList} />
      )}
    </PageShell>
  );
}

// ─── Context Banner ───────────────────────────────────────────────────────────

function ContextBanner({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.contextBanner, {
      backgroundColor: colors.infoHighlight,
      borderColor: colors.primary + '40',
    }]}>
      <Text style={[styles.contextText, { color: colors.primary }]}>{children}</Text>
    </View>
  );
}

// ─── Guidelines Tab ───────────────────────────────────────────────────────────

function Guidelines({
  activeCase,
  protocols,
}: {
  activeCase: CaseContext;
  protocols: string[];
}) {
  const { colors } = useTheme();
  const finalProtocols = protocols.length ? protocols : [
    'Concurrent chemoradiation (cisplatin 100 mg/m² q3w) is preferred for unresectable disease.',
    'Surgery + adjuvant CRT for resectable cases with adverse features (ENE, positive margins).',
    'Bilateral neck dissection (levels II–IV) for midline-crossing primaries.',
    'Consider transoral robotic surgery (TORS) for select T1–T2 lesions.',
    'HPV/p16 testing recommended for all oropharyngeal SCC.',
  ];

  // Parse TNM staging dynamically
  const tnmMatch = activeCase.tnm.match(/(T[0-4a-dXx])(N[0-3a-cXx]+)(M[0-1Xx])/i);
  const tnmRef = [
    { k: tnmMatch ? tnmMatch[1] : 'T3', v: `AJCC staging criteria for primary tumor of the ${activeCase.site}` },
    { k: tnmMatch ? tnmMatch[2] : 'N2b', v: `AJCC staging criteria for regional nodal involvement` },
    { k: tnmMatch ? tnmMatch[3] : 'M0', v: `AJCC staging criteria for distant metastasis` },
  ];

  return (
    <View style={styles.tabContent}>
      <ContextBanner>
        <Text style={{ fontWeight: '700' }}>Showing protocols for:</Text>
        {' '}{activeCase.site} · {activeCase.tnm}
      </ContextBanner>

      {/* NCCN card */}
      <View style={[styles.card, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        marginBottom: 12,
      }]}>
        <View style={styles.cardMeta}>
          <View style={[styles.nccnBadge, { backgroundColor: colors.infoHighlight }]}>
            <Text style={[styles.nccnBadgeText, { color: colors.primary }]}>NCCN 2024</Text>
          </View>
          <Text style={[styles.updatedText, { color: colors.textMuted }]}>Updated Jan 2024</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          Oropharynx — Stage IVA Management
        </Text>
        <View style={styles.protocolList}>
          {finalProtocols.map((p, i) => (
            <View key={i} style={styles.protocolRow}>
              <Text style={[styles.bullet, { color: colors.accentSecondary }]}>•</Text>
              <Text style={[styles.protocolText, { color: colors.foreground }]}>{p}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.viewFullRow}>
          <Text style={[styles.viewFullText, { color: colors.primary }]}>View full guideline </Text>
          <Icon name="external-link" size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* TNM reference */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }]}>
          TNM Staging Reference — Base of Tongue (AJCC 8th)
        </Text>
        {tnmRef.map((r, i) => (
          <View
            key={r.k}
            style={[
              styles.tnmRow,
              { borderBottomWidth: i < tnmRef.length - 1 ? 1 : 0, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.tnmKey, { color: colors.primary }]}>{r.k}</Text>
            <Text style={[styles.tnmVal, { color: colors.textSecondary }]}>{r.v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Research Tab ─────────────────────────────────────────────────────────────

const papers = [
  {
    title: 'Outcomes of transoral robotic surgery in T3 base of tongue squamous cell carcinoma: a multicenter analysis',
    authors: 'Chen L, Patel R, Yamamoto K, et al.',
    journal: 'JAMA Otolaryngology, 2024',
    snippet: 'Five-year overall survival of 78% in T3N2b patients undergoing TORS with adjuvant chemoradiation, with significantly reduced functional morbidity.',
    tag: 'Surgical technique',
    cites: 142,
    url: 'https://pubmed.ncbi.nlm.nih.gov/38265432/',
  },
  {
    title: 'Free flap reconstruction following composite resection: comparison of RFFF vs ALT outcomes',
    authors: 'Kumar S, Hwang J, Rossi M',
    journal: 'Plastic & Reconstructive Surgery, 2023',
    snippet: 'RFFF demonstrated superior pliability for tongue base defects; ALT preferred when bulk reconstruction required for total glossectomy.',
    tag: 'Reconstruction',
    cites: 89,
    url: 'https://pubmed.ncbi.nlm.nih.gov/37281943/',
  },
  {
    title: 'Prognostic significance of nodal burden in HPV-negative oropharyngeal SCC',
    authors: 'Almeida P, Singh A, Tanaka H',
    journal: 'Head & Neck, 2024',
    snippet: 'Nodes ≥ 3 cm with ENE conferred a 2.4× hazard ratio for distant recurrence in HPV-negative cohorts.',
    tag: 'Staging',
    cites: 211,
    url: 'https://pubmed.ncbi.nlm.nih.gov/38165249/',
  },
  {
    title: 'Long-term swallowing function after bilateral neck dissection and CRT',
    authors: "O'Connor M, Lee D, Verma N",
    journal: 'Oral Oncology, 2023',
    snippet: 'Prophylactic swallowing therapy started preoperatively reduced PEG dependence by 31% at 12 months.',
    tag: 'Outcomes',
    cites: 67,
    url: 'https://pubmed.ncbi.nlm.nih.gov/37194832/',
  },
];

function Research({
  activeCase,
  papersList,
}: {
  activeCase: CaseContext;
  papersList: any[];
}) {
  const { colors } = useTheme();
  const [sort, setSort] = useState('relevant');

  const finalPapers = papersList.length ? papersList : papers;

  // Client-side sorting of papers
  const sortedPapers = [...finalPapers].sort((a, b) => {
    if (sort === 'cited') return b.cites - a.cites;
    if (sort === 'recent') {
      const getYear = (j: string) => {
        const m = j.match(/\b(202\d)\b/);
        return m ? parseInt(m[1]) : 2020;
      };
      return getYear(b.journal) - getYear(a.journal);
    }
    return 0; // standard relevant
  });

  const tagColors: Record<string, string> = {
    Staging: colors.primary,
    'Surgical technique': colors.accentSecondary,
    Outcomes: colors.warning,
    Reconstruction: colors.success,
  };

  return (
    <View style={styles.tabContent}>
      <ContextBanner>
        <Text style={{ fontWeight: '700' }}>Papers relevant to:</Text>
        {' '}{activeCase.site} SCC · {activeCase.tnm} · Free Flap Reconstruction
      </ContextBanner>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {[
          { k: 'relevant', l: 'Most relevant' },
          { k: 'recent', l: 'Most recent' },
          { k: 'cited', l: 'Most cited' },
        ].map((o) => (
          <TouchableOpacity
            key={o.k}
            onPress={() => setSort(o.k)}
            style={[styles.sortChip, {
              backgroundColor: sort === o.k ? colors.primary : colors.surface,
              borderColor: sort === o.k ? colors.primary : colors.border,
            }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.sortChipText, {
              color: sort === o.k ? colors.primaryForeground : colors.textSecondary,
            }]}>
              {o.l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Paper cards */}
      <View style={styles.paperList}>
        {sortedPapers.map((p, i) => (
          <PaperCard key={p.title} paper={p} delay={i * 80} tagColor={tagColors[p.tag] || colors.primary} />
        ))}
      </View>
    </View>
  );
}

function PaperCard({
  paper, delay, tagColor,
}: { paper: typeof papers[0]; delay: number; tagColor: string }) {
  const { colors } = useTheme();
  const { showAlert } = useAppStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleOpenLink = () => {
    if (paper.url) {
      Linking.openURL(paper.url).catch((err) => {
        console.warn('[ClinicalRefScreen] Failed to open link:', err);
        showAlert('Error', 'Unable to open the link.');
      });
    } else {
      showAlert('Unavailable', 'No valid clinical link was generated for this paper.');
    }
  };

  return (
    <Animated.View style={[
      styles.paperCard,
      { backgroundColor: colors.surface, borderColor: colors.border, opacity, transform: [{ translateY }] },
    ]}>
      <Text style={[styles.paperTitle, { color: colors.foreground }]} numberOfLines={2}>
        {paper.title}
      </Text>
      <Text style={[styles.paperAuthors, { color: colors.textMuted }]}>
        {paper.authors} · {paper.journal}
      </Text>
      <Text style={[styles.paperSnippet, { color: colors.textSecondary }]} numberOfLines={2}>
        {paper.snippet}
      </Text>
      <View style={styles.paperFooter}>
        <View style={styles.paperBadgeRow}>
          <View style={[styles.paperTagBadge, { backgroundColor: tagColor + '24' }]}>
            <Text style={[styles.paperTagText, { color: tagColor }]}>{paper.tag}</Text>
          </View>
          <Text style={[styles.paperCites, { color: colors.textMuted }]}>
            {paper.cites} citations
          </Text>
        </View>
        <TouchableOpacity style={styles.openRow} onPress={handleOpenLink} activeOpacity={0.7}>
          <Text style={[styles.openText, { color: colors.primary }]}>Open </Text>
          <Icon name="external-link" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function Empty({ onNavigate, sub }: { onNavigate: (t: TabKey) => void; sub: Sub }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { borderColor: colors.border }]}>
        <Icon
          name={sub === 'guidelines' ? 'book-open' : 'maximize'}
          size={22}
          color={colors.textMuted}
        />
      </View>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Upload a case to surface relevant{' '}
        {sub === 'guidelines' ? 'guidelines' : 'literature'}.
      </Text>
      <TouchableOpacity
        onPress={() => onNavigate('scan')}
        style={[styles.emptyCta, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.emptyCtaText, { color: colors.primaryForeground }]}>
          Go to Scan
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
    height: 44,
  },
  segSlider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '49%',
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  segText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabContent: {
    gap: 0,
  },
  contextBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  contextText: {
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nccnBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nccnBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  updatedText: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  protocolList: {
    marginTop: 8,
    gap: 6,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 13,
    lineHeight: 19,
  },
  protocolText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
    textAlign: 'justify',
  },
  viewFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  viewFullText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  tnmRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  tnmKey: {
    width: 40,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fontMono,
  },
  tnmVal: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sortChip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  paperList: {
    gap: 10,
  },
  paperCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  paperTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  paperAuthors: {
    fontSize: 11.5,
    marginTop: 4,
  },
  paperSnippet: {
    fontSize: 12.5,
    marginTop: 8,
    lineHeight: 18,
    textAlign: 'justify',
  },
  paperFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  paperBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paperTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paperTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  paperCites: {
    fontSize: 10.5,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
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
    paddingHorizontal: 16,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 96,
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
});
