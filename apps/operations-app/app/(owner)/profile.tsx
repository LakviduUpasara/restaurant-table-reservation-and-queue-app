import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { ActionButton } from '../../components/common/ActionButton';
import { Card, Divider } from '../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../constants/theme';
import { useAuth } from '../../stores/auth.store';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';

export default function OwnerProfile() {
  const router = useRouter();
  const profile = useAuth(state => state.profile);
  const account = useQuery({ queryKey: ['owner-account', profile?.id], queryFn: async () => { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data.user; } });
  return (
    <OwnerLayout active="more" title="Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.photoWrap}><Image source={require('../../assets/images/owner-avatar.png')} style={styles.photo} /><View style={styles.onlineDot} /></View>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.role}>{profile?.role}</Text>
          <View style={styles.badge}><Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primaryDark} /><Text style={styles.badgeText}>Owner account</Text></View>
        </View>

        <Card>
          <InfoRow icon="call-outline" label="Phone" value={profile?.phone ?? 'Not provided'} />
          <Divider />
          <InfoRow icon="mail-outline" label="Email" value={account.data?.email ?? 'Not available'} />
        </Card>

        <Text style={styles.sectionTitle}>Account & privacy</Text>
        <Card>
          <SettingRow icon="lock-closed-outline" title="Privacy" subtitle="Manage the data you share with DineFlow" onPress={() => Alert.alert('Privacy', 'Privacy controls will be connected to the backend later.')} />
          <Divider />
          <SettingRow icon="shield-checkmark-outline" title="Security" subtitle="Keep your account protected with password and verification settings" onPress={() => Alert.alert('Security', 'Security settings will be connected to the backend later.')} />
        </Card>

        <ActionButton title="Sign Out" variant="outline" icon={<Ionicons name="log-out-outline" size={18} color={COLORS.red} />} onPress={() => Alert.alert('Sign out', 'Do you want to sign out?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: async () => { try { await useAuth.getState().signOut(); router.replace('/(auth)/login'); } catch (error) { Alert.alert('Sign out failed', error instanceof Error ? error.message : String(error)); } } }])} style={styles.signOut} />
        <Text style={styles.version}>DineFlow Operations · Owner</Text>
      </ScrollView>
    </OwnerLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.infoRow}><View style={styles.infoIcon}><Ionicons name={icon} size={16} color={COLORS.text} /></View><View style={{ flex: 1 }}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

function SettingRow({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable style={styles.settingRow} onPress={onPress}><View style={styles.settingIcon}><Ionicons name={icon} size={17} color={COLORS.text} /></View><View style={styles.settingText}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingSub}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={17} color="#8F8F8A" /></Pressable>;
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 7, paddingBottom: 25 },
  hero: { alignItems: 'center', paddingVertical: 11, marginBottom: 11 },
  photoWrap: { position: 'relative', marginBottom: 11 },
  photo: { width: 94, height: 94, borderRadius: 47 },
  onlineDot: { position: 'absolute', right: 2, bottom: 2, width: 15, height: 15, borderRadius: 8, backgroundColor: COLORS.green, borderWidth: 3, borderColor: COLORS.background },
  name: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  role: { fontSize: 10.5, color: COLORS.textSoft, marginTop: 3 },
  badge: { marginTop: 8, backgroundColor: COLORS.primarySoft, minHeight: 26, borderRadius: 13, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { fontSize: 9.5, fontWeight: '800', color: '#766100' },
  infoRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F2F2EF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  infoLabel: { fontSize: 9.5, color: COLORS.muted },
  infoValue: { fontSize: 11.5, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '900', marginTop: 7, marginBottom: 9, color: COLORS.text },
  settingRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  settingText: { flex: 1, paddingRight: 7 },
  settingTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  settingSub: { fontSize: 9.5, color: COLORS.muted, lineHeight: 14, marginTop: 2 },
  signOut: { marginTop: 14, borderColor: '#DADAD6' },
  version: { textAlign: 'center', fontSize: 8.5, color: '#A2A29D', marginTop: 15 },
});
