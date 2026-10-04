import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';

export function LoginScreen() {
  const router = useRouter();
  const signIn = useAuth(s => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  async function submit() {
    if (busy) return;
    setEmailError('');
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (!password) { setError('Enter your password'); return; }
    setBusy(true);
    try { await signIn(email.trim(), password); router.replace('/home'); }
    catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to sign in. Please try again.';
      setError(/invalid login credentials/i.test(message) ? 'Wrong password' : message);
    } finally { setBusy(false); }
  }

  async function socialLogin(provider: 'apple' | 'google') {
    if (busy) return;
    setBusy(true);
    try {
      const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/login` : 'dineflow-customer://login';
      const { data, error: authError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
      if (authError) throw authError;
      if (data.url) await Linking.openURL(data.url);
    } catch (e) { Alert.alert('Unable to sign in', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.screen}>
    <StatusBar style="light" />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }} style={[styles.tab, styles.activeTab]}><Text style={[styles.tabText, styles.yellow]}>Log in</Text></Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: false }} style={styles.tab} onPress={() => router.push('/signup')}><Text style={styles.tabText}>Sign up</Text></Pressable>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Your Email</Text>
          <TextInput accessibilityLabel="Your Email" style={[styles.input, !!emailError && styles.invalid]} placeholder="you@example.com" placeholderTextColor="#AAA6A8" value={email} onChangeText={value => { setEmail(value); setEmailError(''); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" selectionColor="#E5B80B" />
          {!!emailError && <Text accessibilityLiveRegion="polite" style={styles.error}>{emailError}</Text>}
          <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
          <View style={[styles.passwordBox, !!error && styles.invalid]}>
            <TextInput accessibilityLabel="Password" style={styles.passwordInput} placeholder="•••••••••••" placeholderTextColor="#CBC7CA" value={password} onChangeText={value => { setPassword(value); setError(''); }} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" selectionColor="#E5B80B" returnKeyType="go" onSubmitEditing={submit} />
            <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={styles.eyeButton}>
              <View style={styles.eye}><View style={styles.pupil} /></View>{!visible && <View style={styles.eyeSlash} />}
            </Pressable>
          </View>
          <View style={styles.helpRow}>
            <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/forgot-password')}><Text style={styles.link}>Forgot password?</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={({ pressed }) => [styles.continue, (pressed || busy) && styles.pressed]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.continueText}>Continue</Text>}
          </Pressable>
          <View style={styles.divider}><View style={styles.rule} /><Text style={styles.or}>Or</Text><View style={styles.rule} /></View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => socialLogin('apple')} style={({ pressed }) => [styles.social, pressed && styles.pressed]}><Image source={require('../assets/apple.png')} style={styles.apple} /><Text style={styles.socialText}>Login with Apple</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => socialLogin('google')} style={({ pressed }) => [styles.social, styles.googleButton, pressed && styles.pressed]}><Image source={require('../assets/google.png')} style={styles.google} /><Text style={styles.socialText}>Login with Google</Text></Pressable>
          <View style={styles.footer}><Text style={styles.footerText}>Don’t have an account? </Text><Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/signup')}><Text style={styles.link}>Sign up</Text></Pressable></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#262727' },
  content: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 25, paddingBottom: 40 },
  tabs: { flexDirection: 'row', marginHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#EABB00' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  yellow: { color: '#EABB00' },
  form: { marginTop: 44 },
  label: { color: '#FFFFFF', fontSize: 12, marginBottom: 5 },
  input: { height: 41, borderWidth: 1.4, borderColor: '#D3D2D2', borderRadius: 10, paddingHorizontal: 14, color: '#DEDADD', fontSize: 12 },
  passwordLabel: { marginTop: 11 },
  passwordBox: { height: 41, borderWidth: 1.4, borderColor: '#D3D2D2', borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  invalid: { borderColor: '#FF505B' },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 14, color: '#DEDADD', fontSize: 12 },
  eyeButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  eye: { width: 14, height: 9, borderWidth: 1, borderColor: '#D3D2D2', borderRadius: 7, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-20deg' }] },
  pupil: { width: 5, height: 5, borderWidth: 1, borderColor: '#D3D2D2', borderRadius: 3 },
  eyeSlash: { position: 'absolute', width: 17, height: 1, backgroundColor: '#D3D2D2', transform: [{ rotate: '-45deg' }] },
  helpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginTop: 8, minHeight: 27 },
  error: { flexShrink: 1, color: '#E0DDDF', fontSize: 12, lineHeight: 16 },
  link: { color: '#EABB00', fontSize: 12, fontWeight: '500', lineHeight: 16 },
  continue: { height: 39, borderRadius: 8, backgroundColor: '#E5B80B', alignItems: 'center', justifyContent: 'center', marginHorizontal: 1 },
  continueText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  pressed: { opacity: 0.65 },
  divider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 23, marginBottom: 23 },
  rule: { height: 1, backgroundColor: '#D3D2D2', width: '26%' },
  or: { color: '#FFFFFF', fontSize: 12, lineHeight: 16 },
  social: { height: 41, borderWidth: 1.4, borderColor: '#D3D2D2', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  socialText: { color: '#E0DDDF', fontSize: 12 },
  apple: { width: 17, height: 19 },
  google: { width: 20, height: 20 },
  googleButton: { marginTop: 10 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 23 },
  footerText: { color: '#E0DDDF', fontSize: 12, lineHeight: 16 },
});
