import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '../../components/common/ActionButton';
import { FigmaInput } from '../../components/common/FigmaInput';
import { COLORS, RADIUS } from '../../constants/theme';
import { useAuth } from '../../stores/auth.store';

export default function LoginScreen() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!staffId.trim() || !password) return Alert.alert('Missing details', 'Please enter your account email and password.');
    setBusy(true);
    try {
      await useAuth.getState().signIn(staffId.trim(), password);
      const profile = useAuth.getState().profile;
      if (!profile || !['OWNER', 'STAFF'].includes(profile.role)) {
        await useAuth.getState().signOut();
        throw new Error('An Owner or Staff account is required.');
      }
      router.replace(profile.role === 'OWNER' ? '/(owner)/dashboard' : '/(staff)/dashboard');
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.canvas}>
            <View style={styles.brandWrap}>
              <Image source={require('../../assets/images/dineflow-logo.png')} style={styles.logo} resizeMode="contain" />
              <View style={styles.brandHint}><View style={styles.brandDot} /><Text style={styles.brandHintText}>Operations portal</Text></View>
            </View>

            <View style={styles.heading}><Text style={styles.title}>Owner Login</Text><Text style={styles.subtitle}>Manage your restaurant from one simple workspace.</Text></View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Welcome back</Text>
              <Text style={styles.formSub}>Sign in to continue to your Owner dashboard.</Text>
              <View style={{ marginTop: 18 }}>
                <FigmaInput label="Account email" value={staffId} onChangeText={setStaffId} placeholder="Enter account email" icon="person-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
                <FigmaInput label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" icon="lock-closed-outline" password />
              </View>

              <View style={styles.optionsRow}>
                <Pressable onPress={() => setRemember(value => !value)} style={styles.remember} hitSlop={5}>
                  <View style={[styles.check, remember && styles.checkActive]}>{remember ? <Ionicons name="checkmark" size={12} color={COLORS.text} /> : null}</View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={5}><Text style={styles.forgot}>Forgot password?</Text></Pressable>
              </View>

              <ActionButton title="Login" variant="dark" busy={busy} onPress={handleLogin} icon={<Ionicons name="arrow-forward" size={17} color={COLORS.white} />} />
            </View>

            <View style={styles.footer}><Ionicons name="shield-checkmark-outline" size={14} color="#85857F" /><Text style={styles.footerText}>Owner access · DineFlow Operations</Text></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { flexGrow: 1, paddingVertical: 24, alignItems: 'center' },
  canvas: { width: 390, maxWidth: '100%', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 24 },
  brandWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 245, height: 132 },
  brandHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.pill, minHeight: 25, paddingHorizontal: 9, gap: 5, marginTop: -2 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primaryDark },
  brandHintText: { fontSize: 8.5, color: '#776400', fontWeight: '800' },
  heading: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 11.5, lineHeight: 17, color: COLORS.textSoft, marginTop: 4 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: '#E8E8E4', padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  formTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  formSub: { fontSize: 9.5, lineHeight: 14, color: COLORS.muted, marginTop: 3 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  check: { width: 18, height: 18, borderRadius: 6, backgroundColor: '#F1F1EE', borderWidth: 1, borderColor: '#D9D9D5', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rememberText: { fontSize: 9.5, color: COLORS.textSoft },
  forgot: { fontSize: 9.5, color: COLORS.text, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 18 },
  footerText: { fontSize: 8.5, color: '#8A8A84' },
});
