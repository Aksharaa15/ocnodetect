/**
 * ScanScreen — pixel-perfect match of Scan.tsx from the web.
 * 
 * Three phases:
 * 1. idle — upload zone + file type toggle + patient ID input
 * 2. processing — pulsing ring + step list with done/active/pending states
 * 3. done — SummaryCard with all clinical fields + action buttons
 */
import React, { useEffect, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  Animated, Easing,
} from 'react-native';
import { useTheme, typography } from '../theme';
import { PageShell } from '../components/PageShell';
import type { CaseContext, TabKey } from '../store/types';
import Icon from '../components/Icon';
import { useAppStore } from '../store/AppContext';
import { analyzeImaging } from '../services/scanwiseApi';

type Phase = 'idle' | 'processing' | 'done';

const cleanErrorMessage = (err: any): string => {
  if (!err) return 'OcnoDetect AI is busy or the server is unreachable at the moment. Please try again after some time.';
  
  const rawMsg = err.message || '';
  
  // 1. Detect Groq/Model TPM/RPM token limits or 413 "Request too large" errors
  if (
    rawMsg.includes('rate_limit_exceeded') ||
    rawMsg.includes('Limit 12000') ||
    rawMsg.includes('tokens per minute') ||
    rawMsg.includes('TPM') ||
    rawMsg.includes('413') ||
    rawMsg.includes('Request too large') ||
    rawMsg.includes('message size')
  ) {
    return 'The clinical document or scan data is too large for the AI model to process in a single request. Please reduce the size or length of your input and try again.';
  }

  // 2. Head and neck oncology validation check
  if (
    rawMsg.includes('head and neck oncology') ||
    rawMsg.includes('proper clinical document') ||
    rawMsg.includes('medical scan related')
  ) {
    return 'Please upload a proper clinical document or medical scan related to head and neck oncology.';
  }

  // 3. Fallback to generic message if the error looks like technical/server/JSON code
  if (rawMsg.startsWith('{') || rawMsg.includes('Internal server error') || rawMsg.includes('HTTP ') || rawMsg.includes('Error: 500')) {
    return 'The AI server encountered an issue processing your request. Please try again in a few moments.';
  }

  return rawMsg;
};

const steps = [
  'File received',
  'Parsing imaging data',
  'Extracting clinical findings',
  'Generating structured summary',
  'Complete',
];

interface Props {
  onNavigate: (t: TabKey) => void;
  onLoadCase: (c: CaseContext | null) => void;
  activeCase: CaseContext | null;
}

export function ScanScreen({ onNavigate, onLoadCase, activeCase }: Props) {
  const { colors } = useTheme();
  const { showAlert } = useAppStore();
  const [phase, setPhase] = useState<Phase>(activeCase ? 'done' : 'idle');
  const [step, setStep] = useState(0);
  const [fileType, setFileType] = useState<'ct' | 'pdf'>('ct');
  const [patientId, setPatientId] = useState(activeCase?.patientId ?? '');
  // CT mode: multiple images; PDF mode: single PDF file
  const [selectedFiles, setSelectedFiles] = useState<{
    uri: string;
    name: string;
    type: string;
    size: number;
  }[]>([]);

  useEffect(() => {
    if (activeCase) {
      setPhase('done');
      setPatientId(activeCase.patientId);
    }
  }, [activeCase]);

  useEffect(() => {
    if (phase !== 'processing') return;
    if (step >= steps.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [phase, step]);

  useEffect(() => {
    if (phase !== 'processing') return;

    let isMounted = true;

    const triggerAnalysis = async () => {
      try {
        let result;
        if (selectedFiles.length > 0) {
          // Use first file as primary (backend accepts one file at a time)
          const primary = selectedFiles[0];
          result = await analyzeImaging({
            uri: primary.uri,
            name: primary.name,
            type: primary.type,
            patientId: patientId || `PT-2024-${Math.floor(1000 + Math.random() * 9000)}`,
          });
        } else {
          result = await analyzeImaging({
            patientId: patientId || `PT-2024-${Math.floor(1000 + Math.random() * 9000)}`,
            text: `A pathology report for a head/neck cancer patient. Primary scan/report file type is ${fileType.toUpperCase()}. Please synthesize a dynamic head and neck cancer clinical case with structured patient details for this clinician review decision support tool.`,
          });
        }

        if (isMounted) {
          setStep(steps.length - 1);
          setTimeout(() => {
            if (isMounted) {
              onLoadCase({
                patientId: result.patientId,
                site: result.site,
                tnm: result.tnm,
                confidence: result.confidence,
                findings: result.findings,
                differentials: result.differentials,
                surgicalConsiderations: result.surgicalConsiderations,
                protocol: result.protocol,
                prognosticFactors: result.prognosticFactors,
                multidisciplinaryRecommendations: result.multidisciplinaryRecommendations,
                date: result.date,
              });
              setPhase('done');
            }
          }, 600);
        }
      } catch (err: any) {
        console.warn('Failed to parse imaging:', err);
        if (isMounted) {
          const errMsg = cleanErrorMessage(err);
          showAlert(
            'OcnoDetect AI Status',
            errMsg,
            [{ text: 'OK' }]
          );
          setPhase('idle');
          setStep(0);
        }
      }
    };

    triggerAnalysis();

    return () => {
      isMounted = false;
    };
  }, [phase]);

  const handlePickDocument = async () => {
    try {
      if (fileType === 'ct') {
        // CT mode — image picker only, multiple images allowed
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showAlert('Permission Required', 'Please allow access to your photo library to select CT scan images.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 1,
          selectionLimit: 5,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          setSelectedFiles(res.assets.map((a: ImagePicker.ImagePickerAsset) => ({
            uri: a.uri,
            name: a.fileName || `ct_scan_${Date.now()}.jpg`,
            type: a.mimeType || 'image/jpeg',
            size: a.fileSize || 0,
          })));
        }
      } else {
        // PDF mode — document picker, single PDF only
        const res = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          multiple: false,
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          const file = res.assets[0];
          setSelectedFiles([{
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/pdf',
            size: file.size || 0,
          }]);
        }
      }
    } catch (err) {
      console.warn('[ScanScreen] File picker failed:', err);
    }
  };

  const startProcessing = () => {
    setStep(0);
    setPhase('processing');
  };

  // Clear files when pill switches so stale CT images don't appear in PDF mode
  const handleSetFileType = (t: 'ct' | 'pdf') => {
    setFileType(t);
    setSelectedFiles([]);
  };

  return (
    <PageShell>
      <Text style={[styles.title, { color: colors.foreground }]}>Scan analysis</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Upload imaging or pathology to generate a structured clinical summary.
      </Text>

      {phase === 'idle' && (
        <IdlePhase
          fileType={fileType}
          patientId={patientId}
          selectedFiles={selectedFiles}
          onSetFileType={handleSetFileType}
          onSetPatientId={setPatientId}
          onPick={handlePickDocument}
          onStart={startProcessing}
        />
      )}
      {phase === 'processing' && <ProcessingPhase step={step} />}
      {phase === 'done' && (
        <DonePhase
          activeCase={activeCase}
          onAsk={() => onNavigate('chat')}
          onReset={() => {
            onLoadCase(null);
            setPatientId('');
            setPhase('idle');
            setStep(0);
            setSelectedFiles([]);
          }}
        />
      )}
    </PageShell>
  );
}

// ─── Idle Phase ───────────────────────────────────────────────────────────────

function IdlePhase({
  fileType, patientId, selectedFiles, onSetFileType, onSetPatientId, onPick, onStart,
}: {
  fileType: 'ct' | 'pdf';
  patientId: string;
  selectedFiles: { name: string; size: number }[];
  onSetFileType: (t: 'ct' | 'pdf') => void;
  onSetPatientId: (v: string) => void;
  onPick: () => void;
  onStart: () => void;
}) {
  const { colors } = useTheme();
  const hasFiles = selectedFiles.length > 0;

  // Dynamic upload zone copy based on mode and selection
  const uploadTitle = hasFiles
    ? fileType === 'ct'
      ? `${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''} selected`
      : selectedFiles[0].name
    : fileType === 'ct'
    ? 'Select CT scan images'
    : 'Upload pathology report PDF';

  const uploadHint = hasFiles
    ? fileType === 'ct'
      ? `Tap to change selection · ${selectedFiles.length} CT image${selectedFiles.length > 1 ? 's' : ''}`
      : `${(selectedFiles[0].size / 1024).toFixed(1)} KB · Tap to change file`
    : fileType === 'ct'
    ? 'Images only accepted · Select multiple'
    : 'PDF reports only · 1 file maximum';

  return (
    <View>
      {/* Upload zone */}
      <TouchableOpacity
        onPress={onPick}
        style={[styles.uploadZone, {
          borderColor: hasFiles ? colors.primary : colors.border,
          backgroundColor: colors.surface,
        }]}
        activeOpacity={0.8}
      >
        <Icon
          name={hasFiles ? 'check-circle-2' : fileType === 'ct' ? 'images' : 'file-text'}
          size={40}
          color={hasFiles ? colors.success : colors.primary}
        />
        <Text style={[styles.uploadTitle, { color: colors.foreground, marginTop: 12 }]}>
          {uploadTitle}
        </Text>
        <Text style={[styles.uploadHint, { color: colors.textMuted }]}>
          {uploadHint}
        </Text>
      </TouchableOpacity>

      {/* File type toggle pills */}
      <View style={styles.toggleRow}>
        {(['ct', 'pdf'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => onSetFileType(t)}
            style={[styles.toggleBtn, {
              backgroundColor: fileType === t ? colors.primary : colors.surface,
              borderColor: fileType === t ? colors.primary : colors.border,
            }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, {
              color: fileType === t ? colors.primaryForeground : colors.textSecondary,
            }]}>
              {t === 'ct' ? 'CT / DICOM' : 'Pathology PDF'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Patient ID input */}
      <TextInput
        value={patientId}
        onChangeText={onSetPatientId}
        placeholder="Patient ID (optional, for records)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.foreground,
        }]}
      />

      {/* Dynamic CTA Button */}
      <TouchableOpacity
        onPress={onStart}
        style={[styles.actionBtn, {
          backgroundColor: colors.primary,
        }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
          {hasFiles ? 'Analyze Selected File' : 'Run Simulated Analysis'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Processing Phase ─────────────────────────────────────────────────────────

function ProcessingPhase({ step }: { step: number }) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={[styles.processingCard, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    }]}>
      {/* Pulse ring + icon */}
      <View style={styles.pulseContainer}>
        <Animated.View style={[
          styles.pulseRing,
          {
            borderColor: colors.primary,
            transform: [{ scale: pulseAnim }],
            opacity: pulseOpacity,
          },
        ]} />
        <View style={[styles.iconCircle, { backgroundColor: colors.infoHighlight }]}>
          <Icon name="file-scan" size={24} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.processingText, { color: colors.textSecondary }]}>
        Analyzing — typically 60–90 seconds
      </Text>

      {/* Step list */}
      <View style={styles.stepList}>
        {steps.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'pending';
          return (
            <StepRow key={s} label={s} state={state} index={i} />
          );
        })}
      </View>
    </View>
  );
}

function StepRow({ label, state, index }: { label: string; state: 'done' | 'active' | 'pending'; index: number }) {
  const { colors } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (state === 'active') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [state]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.stepRow,
        { opacity: state === 'pending' ? 0.4 : 1 },
      ]}
    >
      {state === 'done' ? (
        <Icon name="check-circle-2" size={16} color={colors.success} />
      ) : state === 'active' ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Icon name="loader-2" size={16} color={colors.primary} />
        </Animated.View>
      ) : (
        <View style={[styles.stepDot, { borderColor: colors.border }]} />
      )}
      <Text style={[styles.stepLabel, {
        color: state === 'pending' ? colors.textMuted : colors.foreground,
      }]}>
        {label}
        {state === 'active' && (
          <Animated.Text style={{ opacity: dotAnim }}> …</Animated.Text>
        )}
      </Text>
    </Animated.View>
  );
}

// ─── Done Phase ───────────────────────────────────────────────────────────────

function DonePhase({
  activeCase, onAsk, onReset,
}: {
  activeCase: CaseContext | null;
  onAsk: () => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <SummaryCard activeCase={activeCase} onAsk={onAsk} />
      <TouchableOpacity
        onPress={onReset}
        style={[styles.resetBtn, { borderColor: colors.border }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.resetText, { color: colors.textSecondary }]}>
          Upload another scan
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SummaryCard({ activeCase, onAsk }: { activeCase: CaseContext | null; onAsk: () => void }) {
  const { colors } = useTheme();
  const { savedCases, setSavedCases, showAlert } = useAppStore();

  if (!activeCase) return null;

  const isSaved = savedCases.some((c) => c.patientId === activeCase.patientId);

  const handleSave = () => {
    if (isSaved) {
      showAlert('Info', 'This case is already saved.');
      return;
    }
    setSavedCases([...savedCases, activeCase]);
    showAlert('Success', 'Case saved to record successfully.');
  };

  // Parse TNM staging dynamically (e.g. T3, N2b, M0)
  const tnmMatch = activeCase.tnm.match(/(T[0-4a-dXx])(N[0-3a-cXx]+)(M[0-1Xx])/i);
  const tnm = [
    { k: 'T', v: tnmMatch ? tnmMatch[1] : 'T3' },
    { k: 'N', v: tnmMatch ? tnmMatch[2] : 'N2b' },
    { k: 'M', v: tnmMatch ? tnmMatch[3] : 'M0' },
  ];

  const findings = activeCase.findings || [
    'Primary lesion 3.4 × 2.8 cm, midline crossing',
    'Bilateral level II–III nodal involvement (largest 4.2 cm)',
    'No evidence of mandibular invasion',
    'Clear margins anticipated on resection',
  ];
  const differentials = activeCase.differentials || [
    { diagnosis: 'SCC base of tongue', probability: 'Primary' }
  ];
  const considerations = activeCase.surgicalConsiderations || [
    'Tracheostomy likely required',
    'Bilateral neck dissection'
  ];
  const prognosticFactors = activeCase.prognosticFactors || [
    'p16/HPV positive molecular status associated with favorable response parameters.',
    '30 pack-year smoking history with associated intermediate risk signature.',
    'AJCC stage IVA risk cohort classification based on clinically positive nodes.'
  ];
  const multidisciplinaryRecs = activeCase.multidisciplinaryRecommendations || [
    'Systemic Therapy: Standard concurrent chemotherapy with Cisplatin (100 mg/m² IV every 21 days for 3 cycles).',
    'Radiation target: Adjuvant external beam radiotherapy to postoperative bed (60-66 Gy) and bilateral neck (50-54 Gy) using IMRT.',
    'Rehabilitation support: Swallowing assessment and dental prophylaxis pre-therapy.'
  ];
  const protocol = activeCase.protocol || 'NCCN Stage sub-protocol';
  const confidenceVal = activeCase.confidence ? `${Math.round(activeCase.confidence * 100)}%` : '94%';

  return (
    <View style={[styles.summaryCard, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    }]}>
      {/* Header */}
      <View style={[styles.summaryHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.summaryTitleRow}>
          <View style={styles.summaryTitleLeft}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
              AI Clinical Summary
            </Text>
            <View style={[styles.aiBadge, { backgroundColor: colors.infoHighlight }]}>
              <Icon name="sparkles" size={10} color={colors.primary} />
              <Text style={[styles.aiBadgeText, { color: colors.primary }]}> AI</Text>
            </View>
          </View>
          <Text style={[styles.patientIdSmall, { color: colors.textMuted }]}>
            {activeCase.patientId}
          </Text>
        </View>
        <Text style={[styles.summaryDisclaimer, { color: colors.textMuted }]}>
          AI-generated summary. Final clinical responsibility remains with the surgeon.
        </Text>
      </View>

      {/* Body fields */}
      <View style={styles.summaryBody}>
        <Field label="PRIMARY SITE">
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldValue, { color: colors.foreground }]}>{activeCase.site}</Text>
            <View style={[styles.confidenceBadge, {
              backgroundColor: colors.success + '15',
              borderColor: colors.success + '30',
            }]}>
              <Icon name="shield-check" size={12} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={[styles.confidenceText, { color: colors.success }]}>{confidenceVal} confidence</Text>
            </View>
          </View>
        </Field>

        <Field label="KEY FINDINGS">
          {findings.map((f, i) => (
            <View key={`${f}-${i}`} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.accentSecondary }]} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </Field>

        <Field label="TNM STAGING">
          <View style={styles.tnmRow}>
            {tnm.map((b, i) => (
              <TnmBadge key={b.k} value={b.v} delay={100 + i * 100} />
            ))}
          </View>
        </Field>

        <Field label="DIFFERENTIALS">
          {differentials.map((x, i) => (
            <View key={`${x.diagnosis}-${i}`} style={styles.diffRow}>
              <Text style={[styles.diffText, { color: colors.foreground }]}>{x.diagnosis}</Text>
              <Text style={[styles.diffProb, { color: colors.textMuted }]}>{x.probability}</Text>
            </View>
          ))}
        </Field>

        <Field label="SURGICAL CONSIDERATIONS">
          {considerations.map((f, i) => (
            <View key={`${f}-${i}`} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.accentSecondary }]} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </Field>

        <Field label="PROGNOSTIC FACTORS">
          {prognosticFactors.map((f, i) => (
            <View key={`${f}-${i}`} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.accentSecondary }]} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </Field>

        <Field label="MULTIDISCIPLINARY RECOMMENDATIONS">
          {multidisciplinaryRecs.map((f, i) => (
            <View key={`${f}-${i}`} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.accentSecondary }]} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </Field>

        <Field label="RECOMMENDED PROTOCOL">
          <View style={[styles.protocolBox, {
            backgroundColor: colors.infoHighlight,
            borderColor: colors.primary + '40',
          }]}>
            <Text style={[styles.protocolText, { color: colors.primary }]}>
              {protocol}
            </Text>
          </View>
        </Field>
      </View>

      {/* Action buttons */}
      <View style={styles.summaryActions}>
        <TouchableOpacity
          onPress={onAsk}
          style={[styles.askBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.97}
        >
          <Text style={[styles.askBtnText, { color: colors.primaryForeground }]}>
            Ask AI about this case →
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, {
            borderColor: isSaved ? colors.success : colors.border,
            backgroundColor: isSaved ? colors.success + '15' : 'transparent',
          }]}
          activeOpacity={0.97}
        >
          <Icon name={isSaved ? "check" : "save"} size={14} color={isSaved ? colors.success : colors.textSecondary} />
          <Text style={[styles.saveBtnText, { color: isSaved ? colors.success : colors.textSecondary }]}>
            {isSaved ? ' Saved' : ' Save to record'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TnmBadge({ value, delay }: { value: string; delay: number }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, stiffness: 320, damping: 18 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.tnmBadge,
      { backgroundColor: colors.infoHighlight, borderColor: colors.primary + '50', transform: [{ scale }], opacity },
    ]}>
      <Text style={[styles.tnmText, { color: colors.primary }]}>{value}</Text>
    </Animated.View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 19,
  },
  uploadZone: {
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadHint: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  input: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginTop: 16,
  },
  processingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    height: 80,
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepLabel: {
    fontSize: 13,
    flex: 1,
  },
  resetBtn: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  patientIdSmall: {
    fontSize: 11,
    fontFamily: typography.fontMono,
  },
  summaryDisclaimer: {
    fontSize: 11,
    marginTop: 8,
  },
  summaryBody: {
    padding: 16,
    gap: 16,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.fontMono,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
    textAlign: 'justify',
  },
  tnmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tnmBadge: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  tnmText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fontMono,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  diffText: {
    fontSize: 13,
  },
  diffProb: {
    fontSize: 11,
  },
  protocolBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  protocolText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'justify',
  },
  summaryActions: {
    padding: 16,
    paddingTop: 0,
    flexDirection: 'row',
    gap: 8,
  },
  askBtn: {
    flex: 1.25,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
