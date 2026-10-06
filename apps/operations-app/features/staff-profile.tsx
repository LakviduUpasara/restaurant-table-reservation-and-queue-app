import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';
import { useStaffDrawer } from './staff-drawer';
import { StaffIcon } from './staff-icons';

const colors = {
  background: '#F5F3EE',
  surface: '#FCFCFA',
  card: '#FFFFFF',
  field: '#F8F7F3',
  text: '#17211D',
  muted: '#7E8782',
  avatar: '#613719',
  accent: '#E3AD18',
  accentSoft: '#FFF0BC',
  active: '#173E35',
  border: '#E5E2DA',
  shadow: '#203129',
} as const;

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—';
}

function MenuIcon() {
  return <StaffIcon color={colors.text} name="menu-outline" size={25} />;
}

function AccountField({ label }: { label: string }) {
  return (
    <View style={styles.accountField}>
      <Text numberOfLines={1} style={styles.accountFieldText}>{label}</Text>
    </View>
  );
}

function ChevronIcon() {
  return <StaffIcon color={colors.active} name="chevron-forward" size={18} />;
}

function SettingsRow({ title, description, onPress }: { title: string; description: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <View style={styles.settingsTitleRow}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <View style={styles.chevronBox}><ChevronIcon /></View>
      </View>
      <Text style={styles.settingsDescription}>{description}</Text>
    </Pressable>
  );
}

export function StaffProfile() {
  const profile = useAuth((state) => state.profile);
  const { openDrawer } = useStaffDrawer();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? 'Email not available');
    });
    return () => { active = false; };
  }, []);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Profile name unavailable';
  const phone = profile?.phone?.trim() || 'Phone number not added';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={[styles.headerWidth, width < 400 && styles.compactWidth]}>
          <Pressable
            accessibilityLabel="Open staff menu"
            accessibilityRole="button"
            hitSlop={12}
            onPress={openDrawer}
            style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
          >
            <MenuIcon />
          </Pressable>
        </View>

        <View style={styles.profilePanel}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.contentWidth, width < 400 && styles.compactWidth]}>
              <View accessibilityLabel={`${profile?.full_name || firstName} profile picture`} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(profile?.full_name)}</Text>
              </View>

              <View style={styles.accountFields}>
                <AccountField label={firstName} />
                <AccountField label={phone} />
                <AccountField label={email || 'Loading email…'} />
              </View>

              <View style={styles.settingsSection}>
                <SettingsRow
                  description="Manage the data you share with us"
                  onPress={() => Alert.alert(
                    'Privacy',
                    'DineFlow uses your staff profile details to identify your account and provide restaurant operations access.',
                  )}
                  title="Privacy"
                />
                <SettingsRow
                  description="Control your account security with 2-step verification"
                  onPress={() => Alert.alert(
                    'Security',
                    'Two-step verification is managed through your authenticated account provider. Contact your restaurant owner if you need access help.',
                  )}
                  title="Security"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, backgroundColor: colors.background },
  headerWidth: { width: '100%', maxWidth: 460, minHeight: 88, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  compactWidth: { paddingHorizontal: 16 },
  menuButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  menuIcon: { width: 20, gap: 5 },
  menuLine: { width: 20, height: 2, borderRadius: 2, backgroundColor: colors.text },
  profilePanel: { flex: 1, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden', backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 4 },
  scrollContent: { alignItems: 'center', paddingTop: 28, paddingBottom: 40 },
  contentWidth: { width: '100%', maxWidth: 460, paddingHorizontal: 24 },
  avatar: { width: 118, height: 118, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 59, backgroundColor: colors.avatar, borderWidth: 5, borderColor: '#F2C79E', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 5 },
  avatarText: { color: colors.card, fontSize: 38, fontWeight: '800', letterSpacing: 1 },
  accountFields: { gap: 12, marginTop: 24 },
  accountField: { minHeight: 58, justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 18, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  accountFieldText: { color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  settingsSection: { gap: 12, marginTop: 24 },
  settingsRow: { minHeight: 84, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 18, paddingVertical: 14, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  settingsTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsTitle: { color: colors.text, fontSize: 16, fontWeight: '800', lineHeight: 21 },
  settingsDescription: { marginTop: 5, marginRight: 40, color: colors.muted, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  chevronBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.field },
  chevronIcon: { width: 8, height: 8, marginRight: 3, borderTopWidth: 1.8, borderRightWidth: 1.8, borderColor: colors.active, transform: [{ rotate: '45deg' }] },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
