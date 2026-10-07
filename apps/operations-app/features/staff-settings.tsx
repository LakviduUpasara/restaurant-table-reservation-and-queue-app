import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Restaurant } from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';
import { useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';
import { StaffIcon, type StaffIconName } from './staff-icons';

const colors = {
  background: '#F5F3EE',
  surface: '#FFFFFF',
  text: '#17211D',
  muted: '#7E8782',
  border: '#E5E2DA',
  active: '#173E35',
  activeSoft: '#E2EEE9',
  gold: '#E3AD18',
  goldSoft: '#FFF3CF',
  danger: '#D95359',
  dangerSoft: '#FFF0F0',
  shadow: '#203129',
} as const;

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—';
}

function SettingsRow({
  destructive,
  description,
  disabled,
  icon,
  loading,
  onPress,
  title,
}: {
  destructive?: boolean;
  description: string;
  disabled?: boolean;
  icon: StaffIconName;
  loading?: boolean;
  onPress: () => void;
  title: string;
}) {
  const accent = destructive ? colors.danger : colors.active;
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, (disabled || loading) && styles.disabled, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, destructive && styles.iconBoxDanger]}>
        {loading ? <ActivityIndicator color={accent} size="small" /> : <StaffIcon color={accent} name={icon} size={22} />}
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDanger]}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <StaffIcon color={destructive ? colors.danger : colors.muted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function StaffSettings() {
  const router = useRouter();
  const client = useQueryClient();
  const { openDrawer } = useStaffDrawer();
  const profile = useAuth((state) => state.profile);
  const refreshProfile = useAuth((state) => state.refresh);
  const signOut = useAuth((state) => state.signOut);
  const restaurantId = useRestaurant();
  const [email, setEmail] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const restaurant = useQuery({
    queryKey: ['restaurant', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Restaurant>(`/restaurants/${restaurantId}`),
  });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? '');
    });
    return () => { active = false; };
  }, []);

  const role = profile?.role === 'OWNER' ? 'Owner' : profile?.role === 'STAFF' ? 'Staff' : 'Role unavailable';
  const restaurantName = restaurant.data?.name ?? (restaurant.isLoading ? 'Loading restaurant…' : 'Restaurant unavailable');

  async function refreshData() {
    setRefreshing(true);
    try {
      await refreshProfile();
      await client.invalidateQueries({ refetchType: 'active' });
      Alert.alert('Data refreshed', 'Your staff account and active restaurant data are up to date.');
    } catch (error) {
      Alert.alert('Could not refresh data', String((error as Error).message));
    } finally {
      setRefreshing(false);
    }
  }

  async function sendPasswordReset() {
    if (!email || sendingReset) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'dineflow-operations://reset-password',
      });
      if (error) throw error;
      Alert.alert('Check your email', `A password reset link was sent to ${email}.`);
    } catch (error) {
      Alert.alert('Could not send reset link', String((error as Error).message));
    } finally {
      setSendingReset(false);
    }
  }

  function confirmPasswordReset() {
    if (!email) {
      Alert.alert('Email unavailable', 'Your authenticated account email could not be loaded.');
      return;
    }
    Alert.alert('Reset password?', `Send a password reset link to ${email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Link', onPress: () => void sendPasswordReset() },
    ]);
  }

  function confirmSignOut() {
    Alert.alert('Log out?', 'You will need to sign in again to access staff tools.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login' as never);
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWidth}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Open staff menu"
              accessibilityRole="button"
              hitSlop={12}
              onPress={openDrawer}
              style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
            >
              <StaffIcon color={colors.text} name="menu-outline" size={25} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Account & app</Text>
              <Text style={styles.title}>Settings</Text>
            </View>
          </View>

          <View style={styles.accountCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.full_name)}</Text></View>
            <View style={styles.accountCopy}>
              <Text numberOfLines={1} style={styles.accountName}>{profile?.full_name || 'Profile name unavailable'}</Text>
              <Text numberOfLines={1} style={styles.accountMeta}>{role} · {restaurantName}</Text>
              <Text numberOfLines={1} style={styles.accountEmail}>{email || 'Loading account email…'}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.sectionCard}>
            <SettingsRow description="View your staff contact and account information" icon="person-outline" onPress={() => router.push('/(staff)/profile' as never)} title="Profile information" />
            <View style={styles.divider} />
            <SettingsRow description="Send a secure reset link to your account email" disabled={!email} icon="lock-closed-outline" loading={sendingReset} onPress={confirmPasswordReset} title="Reset password" />
          </View>

          <Text style={styles.sectionLabel}>Data</Text>
          <View style={styles.sectionCard}>
            <SettingsRow description="Reload your profile, tables, reservations, and queue" icon="refresh-outline" loading={refreshing} onPress={() => void refreshData()} title="Refresh live data" />
          </View>

          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.sectionCard}>
            <SettingsRow destructive description="Sign out of this device securely" icon="log-out-outline" onPress={confirmSignOut} title="Log out" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { alignItems: 'center', paddingBottom: 36 },
  contentWidth: { width: '100%', maxWidth: 460, paddingHorizontal: 20 },
  header: { minHeight: 88, flexDirection: 'row', alignItems: 'center' },
  menuButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  headerCopy: { marginLeft: 15 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { marginTop: 2, color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  accountCard: { minHeight: 116, flexDirection: 'row', alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 15, elevation: 2 },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 3, borderColor: '#F2C79E', backgroundColor: '#633719' },
  avatarText: { color: colors.surface, fontSize: 19, fontWeight: '900' },
  accountCopy: { flex: 1, marginLeft: 15 },
  accountName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  accountMeta: { marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: '600' },
  accountEmail: { marginTop: 6, color: colors.active, fontSize: 12, fontWeight: '700' },
  sectionLabel: { marginTop: 26, marginBottom: 10, marginLeft: 4, color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  sectionCard: { overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 },
  settingsRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.activeSoft },
  iconBoxDanger: { backgroundColor: colors.dangerSoft },
  rowCopy: { flex: 1, marginHorizontal: 13 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  rowTitleDanger: { color: colors.danger },
  rowDescription: { marginTop: 4, color: colors.muted, fontSize: 11, fontWeight: '500', lineHeight: 16 },
  divider: { height: 1, marginLeft: 73, backgroundColor: colors.border },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
