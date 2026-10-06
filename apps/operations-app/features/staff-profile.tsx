import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';
import { useStaffDrawer } from './staff-drawer';

const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  field: '#FAFAFA',
  text: '#111111',
  muted: '#6C6C6C',
  avatar: '#613719',
} as const;

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'DF';
}

function MenuIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.menuIcon}>
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </View>
  );
}

function AccountField({ label }: { label: string }) {
  return (
    <View style={styles.accountField}>
      <Text numberOfLines={1} style={styles.accountFieldText}>{label}</Text>
    </View>
  );
}

function SettingsRow({ title, description, onPress }: { title: string; description: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      <Text style={styles.settingsTitle}>{title}</Text>
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

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Staff member';
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
  headerWidth: { width: '100%', maxWidth: 430, minHeight: 104, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  compactWidth: { paddingHorizontal: 20 },
  menuButton: { width: 32, height: 40, justifyContent: 'center' },
  menuIcon: { width: 24, gap: 4 },
  menuLine: { width: 24, height: 2, backgroundColor: colors.text },
  profilePanel: { flex: 1, borderTopLeftRadius: 68, borderTopRightRadius: 68, overflow: 'hidden', backgroundColor: colors.surface },
  scrollContent: { alignItems: 'center', paddingTop: 24, paddingBottom: 34 },
  contentWidth: { width: '100%', maxWidth: 430, paddingHorizontal: 54 },
  avatar: { width: 130, height: 130, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 65, backgroundColor: colors.avatar, borderWidth: 4, borderColor: '#E8D5C5' },
  avatarText: { color: colors.surface, fontSize: 40, fontWeight: '700', letterSpacing: 1 },
  accountFields: { gap: 21, marginTop: 10 },
  accountField: { minHeight: 43, justifyContent: 'center', borderRadius: 9, backgroundColor: colors.field, paddingHorizontal: 24 },
  accountFieldText: { color: colors.text, fontSize: 20, lineHeight: 26 },
  settingsSection: { gap: 4, marginTop: 24 },
  settingsRow: { minHeight: 63, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 1, paddingVertical: 8 },
  settingsTitle: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  settingsDescription: { marginTop: 7, color: colors.text, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.62 },
});
