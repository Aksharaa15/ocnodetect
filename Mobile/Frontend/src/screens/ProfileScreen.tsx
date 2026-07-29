/**
 * ProfileScreen — pixel-perfect match of Profile.tsx from the web.
 *
 * Sections (in order):
 * 1. Avatar (initials) + name + specialty + institution
 * 2. "Edit profile" pill button
 * 3. Stats carousel (horizontal scroll) — 3 stat chips
 * 4. Account section list — rows with icon, label, hint, chevron
 * 5. Danger zone — "Clear all case data" with DELETE confirmation flow
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useTheme, typography } from '../theme';
import { PageShell } from '../components/PageShell';
import { SectionTitle } from '../components/SectionTitle';
import Icon from '../components/Icon';
import { useAppStore } from '../store/AppContext';
import { getProfile, updateProfile, clearAllCases, setApiToken } from '../services/scanwiseApi';
import { SavedCasesModal } from '../components/SavedCasesModal';
import { MDTScheduleModal } from '../components/MDTScheduleModal';
import type { MDTSchedule } from '../components/MDTScheduleModal';


function getInitials(name: string) {
  const cleanName = name.startsWith('Dr. ') ? name.substring(4) : name;
  const parts = cleanName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const { userProfile, setUserProfile, activeCase, setActiveCase, savedCases, setSavedCases, setTab, setChatSessions, setIsAuthenticated, setAuthToken, showAlert, clearUserSession } = useAppStore();
  const [statsData, setStatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editInstitution, setEditInstitution] = useState('');

  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  const [showSavedCasesList, setShowSavedCasesList] = useState(false);

  // MDT Schedule state
  const [showMDTModal, setShowMDTModal] = useState(false);
  const [mdtSchedule, setMdtSchedule] = useState<MDTSchedule>({
    date: (() => { const d = new Date(); d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7)); return d; })(),
    hour: 7,
    minute: '30',
    ampm: 'AM',
  });
  const [mdtLabel, setMdtLabel] = useState('Thu, 7:30 AM');


  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setUserProfile(data.userProfile);
      setStatsData(data.stats);
    } catch (err) {
      console.warn('[ProfileScreen] Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [activeCase, savedCases.length]);

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editSpecialty.trim() || !editInstitution.trim()) {
      showAlert('Error', 'All fields are required.');
      return;
    }
    setSaving(true);
    try {
      const updated = {
        name: editName.trim(),
        specialty: editSpecialty.trim(),
        institution: editInstitution.trim(),
      };
      await updateProfile(updated);
      setUserProfile(updated);
      setIsEditing(false);
      await fetchProfileData();
    } catch (err) {
      console.warn('[ProfileScreen] Failed to update profile:', err);
      showAlert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCases = async () => {
    try {
      await clearAllCases();
      setActiveCase(null);
      setSavedCases([]); // Wipe all client-side saved cases in sync
      setChatSessions([]); // Wipe all client-side chat sessions in sync
      setConfirm(false);
      setTyped('');
      await fetchProfileData();
      showAlert('Success', 'All case registry data cleared successfully.');
    } catch (err) {
      console.warn('[ProfileScreen] Failed to clear cases:', err);
      showAlert('Error', 'Failed to clear cases.');
    }
  };

  const displayStats = statsData.length > 0 ? statsData : [
    { l: 'Total cases', v: '0' },
    { l: 'Avg TNM stage', v: 'N/A' },
    { l: 'Common site', v: 'N/A' },
  ];

  const displayRows = [
    { iconName: 'folder', label: 'My Saved Cases', hint: `${savedCases.length} saved` },
    { iconName: 'calendar', label: 'MDT Schedule', hint: mdtLabel },
    { iconName: 'home', label: 'Institution', hint: userProfile.institution || 'N/A' },
    { iconName: 'log-out', label: 'Log Out', hint: 'Exit session' },
  ];


  const avatarInitials = getInitials(userProfile.name);

  return (
    <PageShell>
      {/* Avatar + name */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, {
          backgroundColor: colors.primary,
        }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {avatarInitials}
          </Text>
        </View>

        {!isEditing ? (
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {userProfile.name}
            </Text>
            <Text style={[styles.specialty, { color: colors.textSecondary }]}>
              {userProfile.specialty}
            </Text>
            <Text style={[styles.institution, { color: colors.textMuted }]}>
              {userProfile.institution}
            </Text>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Dr. Ramesh Krishnamurthy"
              placeholderTextColor={colors.textMuted}
              style={[styles.editInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.subtle }]}
            />
            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Specialty</Text>
            <TextInput
              value={editSpecialty}
              onChangeText={setEditSpecialty}
              placeholder="e.g. Head & Neck Oncology Surgeon"
              placeholderTextColor={colors.textMuted}
              style={[styles.editInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.subtle }]}
            />
            <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Institution</Text>
            <TextInput
              value={editInstitution}
              onChangeText={setEditInstitution}
              placeholder="e.g. Apollo Hospitals, Chennai"
              placeholderTextColor={colors.textMuted}
              style={[styles.editInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.subtle }]}
            />
          </View>
        )}
      </View>

      {/* Edit profile buttons */}
      {!isEditing ? (
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => {
            setEditName(userProfile.name);
            setEditSpecialty(userProfile.specialty);
            setEditInstitution(userProfile.institution);
            setIsEditing(true);
          }}
        >
          <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Edit profile</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.editActionsRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => setIsEditing(false)}
            disabled={saving}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Stats horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        {displayStats.map((s) => (
          <View key={s.l} style={[styles.statChip, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.l}</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.v}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.spacer} />
      <SectionTitle title="Account" />

      {/* Account rows */}
      <View style={[styles.accountList, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        {displayRows.map((r, idx) => (
          <TouchableOpacity
            key={r.label}
            onPress={() => {
              if (r.label === 'My Saved Cases') {
                setShowSavedCasesList(true);
              } else if (r.label === 'MDT Schedule') {
                setShowMDTModal(true);
              } else if (r.label === 'Log Out') {
                showAlert(
                  'Confirm Log Out',
                  'Are you sure you want to log out of OcnoDetect?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log Out',
                      style: 'destructive',
                      onPress: () => {
                        clearUserSession();
                      },
                    },
                  ]
                );
              }
            }}
            style={[
              styles.accountRow,
              { borderBottomWidth: idx < displayRows.length - 1 ? 1 : 0, borderBottomColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.accountIcon, { backgroundColor: colors.infoHighlight }]}>
              <Icon name={r.iconName} size={16} color={colors.primary} />
            </View>
            <View style={styles.accountRowContent}>
              <Text style={[styles.accountRowLabel, { color: colors.foreground }]}>{r.label}</Text>
              {r.hint && (
                <Text style={[styles.accountRowHint, { color: colors.textMuted }]}>{r.hint}</Text>
              )}
            </View>
            <Icon name="chevron-right" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Saved Cases Modal component instead of inline lists */}
      <SavedCasesModal
        visible={showSavedCasesList}
        onClose={() => setShowSavedCasesList(false)}
        savedCases={savedCases}
        onLoadCase={(c) => {
          setActiveCase(c);
          setShowSavedCasesList(false);
          setTab('scan');
        }}
        onDeleteCase={(patientId) => {
          showAlert(
            'Delete Case',
            `Are you sure you want to delete patient record ${patientId}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  setSavedCases(savedCases.filter((c) => c.patientId !== patientId));
                },
              },
            ]
          );
        }}
      />

      {/* MDT Schedule Calendar Modal */}
      <MDTScheduleModal
        visible={showMDTModal}
        initialSchedule={mdtSchedule}
        onClose={() => setShowMDTModal(false)}
        onConfirm={(schedule, label) => {
          setMdtSchedule(schedule);
          setMdtLabel(label);
          setShowMDTModal(false);
        }}
      />

      {/* Danger zone */}
      <View style={[styles.dangerZone, { borderTopColor: colors.border }]}>
        <Text style={[styles.dangerLabel, { color: colors.danger }]}>DANGER ZONE</Text>

        {!confirm ? (
          <TouchableOpacity
            onPress={() => setConfirm(true)}
            style={[styles.dangerBtn, {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }]}
            activeOpacity={0.8}
          >
            <Icon name="trash-2" size={16} color={colors.danger} />
            <Text style={[styles.dangerBtnText, { color: colors.danger }]}>
              Clear all case data
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.dangerConfirm, {
            borderColor: colors.danger,
            backgroundColor: colors.surface,
          }]}>
            <Text style={[styles.dangerConfirmText, { color: colors.textSecondary }]}>
              Type{' '}
              <Text style={{ fontFamily: typography.fontMono, fontWeight: '700', color: colors.danger }}>
                DELETE
              </Text>
              {' '}to confirm.
            </Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              style={[styles.dangerInput, {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
                fontFamily: typography.fontMono,
              }]}
              autoCapitalize="characters"
            />
            <View style={styles.dangerActions}>
              <TouchableOpacity
                onPress={() => { setConfirm(false); setTyped(''); }}
                style={[styles.dangerCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.dangerCancelText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={typed !== 'DELETE'}
                onPress={handleClearCases}
                style={[styles.dangerConfirmBtn, {
                  backgroundColor: colors.danger,
                  opacity: typed !== 'DELETE' ? 0.4 : 1,
                }]}
              >
                <Text style={styles.dangerConfirmBtnText}>Confirm delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Footer copyright */}
      <View style={styles.footerContainer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          OcnoDetect © 2026. All rights reserved.
        </Text>
        <Text style={[styles.footerSubText, { color: colors.textMuted }]}>
          v1.0.0 · AI Clinical Support
        </Text>
      </View>
    </PageShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  specialty: {
    fontSize: 13,
    marginTop: 2,
  },
  institution: {
    fontSize: 12,
    marginTop: 2,
  },
  editBtn: {
    alignSelf: 'flex-start',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsScroll: {
    marginTop: 20,
    marginHorizontal: -16,
  },
  statsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statChip: {
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexShrink: 0,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  spacer: { height: 20 },
  accountList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accountRowContent: {
    flex: 1,
  },
  accountRowLabel: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  accountRowHint: {
    fontSize: 11.5,
    marginTop: 1,
  },
  dangerZone: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  dangerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerBtnText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  dangerConfirm: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerConfirmText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  dangerInput: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    marginTop: 8,
    fontFamily: typography.fontMono,
  },
  dangerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dangerCancelBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerCancelText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  dangerConfirmBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerConfirmBtnText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  editLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  editInput: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13.5,
    fontWeight: '500',
    marginBottom: 8,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  cancelBtn: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  savedCasesContainer: {
    marginTop: 10,
    marginBottom: 20,
    gap: 12,
  },
  savedCasesTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  noCasesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCasesText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  savedCasesList: {
    gap: 10,
  },
  savedCaseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  savedCaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedCaseId: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontMono,
  },
  savedCaseDate: {
    fontSize: 11,
  },
  savedCaseBody: {
    marginTop: 2,
  },
  savedCaseInfo: {
    fontSize: 13,
  },
  viewCaseBtn: {
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  viewCaseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerContainer: {
    marginTop: 32,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
