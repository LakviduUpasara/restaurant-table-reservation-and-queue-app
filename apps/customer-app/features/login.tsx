import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  return <AuthScreen signup={false} />;
}

export function SignupScreen() {
  return <AuthScreen signup />;
}

function AuthScreen({ signup: initialSignup }: { signup: boolean }) {
  const [signup, setSignup] = useState(initialSignup);
  const router = useRouter();
  const signIn = useAuth(s => s.signIn);
  const signUp = useAuth(s => s.signUp);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [nameError, setNameError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState<{email: string; needsEmailConfirmation: boolean} | null>(null);
  const transition = useRef(new Animated.Value(1)).current;
  const scrollView = useRef<ScrollView>(null);
  const switching = useRef(false);
  const reduceMotionEnabled = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    switching.current = false;
    const showForm = (reduceMotion: boolean) => {
      if (!active) return;
      reduceMotionEnabled.current = reduceMotion;
      if (switching.current) return;
      transition.stopAnimation();
      if (reduceMotion) { transition.setValue(1); return; }
      transition.setValue(0);
      Animated.timing(transition, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(showForm).catch(() => showForm(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', showForm);
    return () => {
      active = false;
      subscription.remove();
      transition.stopAnimation();
      transition.setValue(1);
    };
  }, [transition, signup]));

  function switchTab(nextSignup: boolean) {
    if (nextSignup === signup || switching.current || busy) return;
    switching.current = true;
    Keyboard.dismiss();
    const changeForm = () => {
      setError('');
      setPasswordError('');
      setEmailError('');
      setNeedsConfirmation(false);
      setNameError('');
      setConfirmError('');
      setPassword('');
      setConfirm('');
      setVisible(false);
      setConfirmVisible(false);
      scrollView.current?.scrollTo({ y: 0, animated: false });
      setSignup(nextSignup);
    };
    if (reduceMotionEnabled.current) { changeForm(); return; }
    transition.stopAnimation();
    Animated.timing(transition, {
      toValue: 0,
      duration: 120,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) changeForm();
      else { switching.current = false; transition.setValue(1); }
    });
  }

  async function submit() {
    if (busy) return;
    setEmailError('');
    setNeedsConfirmation(false);
    setError('');
    setPasswordError('');
    setNameError('');
    setConfirmError('');
    if (signup && name.trim().length < 2) { setNameError('Enter your full name'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (!password) { setPasswordError('Enter your password'); return; }
    if (signup && password.length < 6) { setPasswordError('Use at least 6 characters'); return; }
    if (signup && !confirm) { setConfirmError('Re-enter your password to confirm it'); return; }
    if (signup && password !== confirm) { setConfirmError('Passwords do not match'); return; }
    setBusy(true);
    try {
      if (signup) {
        const registeredEmail = email.trim();
        const result = await signUp(registeredEmail, password, name.trim());
        if (!result.needsEmailConfirmation) {
          router.replace('/home');
          return;
        }
        Keyboard.dismiss();
        setEmail(registeredEmail);
        setSuccess({email: registeredEmail, needsEmailConfirmation: true});
        setPassword('');
        setConfirm('');
        setSignup(false);
        scrollView.current?.scrollTo({ y: 0, animated: false });
      } else {
        await signIn(email.trim(), password);
        router.replace('/home');
      }
    }
    catch (e) {
      const message = e instanceof Error ? e.message : `Unable to ${signup ? 'create account' : 'sign in'}. Please try again.`;
      const code = e && typeof e === 'object' && 'code' in e ? e.code : undefined;
      if (code === 'weak_password' || (signup && /password (?:should|must|is too|requires)/i.test(message))) {
        setPasswordError(message);
      } else if (code === 'email_address_invalid' || code === 'validation_failed' || /already (?:exists|registered)/i.test(message)) {
        setEmailError(message);
      } else if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
        setNeedsConfirmation(true);
        setError('Your account exists, but the email is not confirmed yet. Check your inbox or resend the confirmation email.');
      } else if (code === 'over_email_send_rate_limit') {
        setError('Too many confirmation emails requested. Please wait before trying again, and check your inbox and spam folder.');
      } else if (!signup && (code === 'invalid_credentials' || /invalid login credentials/i.test(message))) {
        setError('Incorrect email or password, or email is not confirmed yet in Supabase.');
      } else {
        setError(message);
      }
    } finally { setBusy(false); }
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || resending) {
      setEmailError('Enter the email address used to create your account');
      return;
    }
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: { emailRedirectTo: 'dineflow-customer://login' },
      });
      if (resendError) throw resendError;
      Alert.alert('Confirmation email sent', `Check ${normalizedEmail} and its spam folder, then return here to log in.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the confirmation email.');
    } finally {
      setResending(false);
    }
  }

  async function socialLogin(provider: 'apple' | 'google') {
    if (busy) return;
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        const redirectTo = `${window.location.origin}/login`;
        const { data, error: authError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: false },
        });
        if (authError) throw authError;
        return;
      }

      const redirectUrl = ExpoLinking.createURL('/login', { scheme: 'dineflow-customer' });
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (authError) throw authError;
      if (!data?.url) throw new Error('Could not initiate Google authentication');

      const authSessionResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
        showInRecents: true,
      });

      const returnedUrl = authSessionResult.type === 'success' ? authSessionResult.url : null;
      if (returnedUrl) {
        const params = new URLSearchParams(returnedUrl.split('#')[1] ?? returnedUrl.split('?')[1] ?? '');
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const code = params.get('code');

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessionError) throw sessionError;
          await useAuth.getState().refresh();
          router.replace('/home');
        } else if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (codeError) throw codeError;
          await useAuth.getState().refresh();
          router.replace('/home');
        }
      }
    } catch (e) {
      Alert.alert('Unable to sign in', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <SafeAreaView style={styles.screen}>
    <Modal visible={success !== null} transparent animationType={reduceMotionEnabled.current ? 'none' : 'fade'} onRequestClose={() => setSuccess(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.successCard} accessibilityViewIsModal>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={32} color="#262727" /></View>
          <Text accessibilityRole="header" style={styles.successTitle}>Account created!</Text>
          <Text style={styles.successMessage}>{success?.needsEmailConfirmation
            ? 'One more step: confirm your email using the link sent to'
            : 'Your account is ready. You can now log in with'}</Text>
          <Text style={styles.successEmail}>{success?.email}</Text>
          <Text style={styles.successMessage}>{success?.needsEmailConfirmation
            ? 'Check your inbox and spam folder. After confirming, return here and log in with your password.'
            : 'Use the password you just created to get started.'}</Text>
          <Pressable accessibilityRole="button" style={[styles.continue, styles.successButton]} onPress={() => setSuccess(null)}>
            <Text style={styles.continueText}>Go to Log in</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <Stack.Screen options={{ animation: 'none' }} />
    <StatusBar style="light" />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.welcome}>
          <Image source={require('../assets/images/logo.png')} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 12 }} />
          <Text accessibilityRole="header" style={styles.welcomeTitle}>Welcome to <Text style={styles.yellow}>DineFlow</Text></Text>
          <Text style={styles.welcomeSubtitle}>Your next great meal starts here.</Text>
        </View>
        <View style={styles.tabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: !signup }} style={[styles.tab, !signup && styles.activeTab]} onPress={() => switchTab(false)}><Text style={[styles.tabText, !signup && styles.yellow]}>Log in</Text></Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: signup }} style={[styles.tab, signup && styles.activeTab]} onPress={() => switchTab(true)}><Text style={[styles.tabText, signup && styles.yellow]}>Sign up</Text></Pressable>
        </View>
        <Animated.View style={[styles.form, {
          opacity: transition,
          transform: [{ translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [signup ? 12 : -12, 0] }) }],
        }]}>
          {signup && <View style={styles.nameField}>
            <Text style={styles.label}>Full name</Text>
            <TextInput accessibilityLabel="Full name" style={[styles.input, !!nameError && styles.invalid]} placeholder="Your full name" placeholderTextColor="#AAA6A8" value={name} onChangeText={value => { setName(value); setNameError(''); }} autoCapitalize="words" autoComplete="name" textContentType="name" selectionColor="#E5B80B" />
            {!!nameError && <Text accessibilityLiveRegion="polite" style={styles.error}>{nameError}</Text>}
          </View>}
          <Text style={styles.label}>Your Email</Text>
          <TextInput accessibilityLabel="Your Email" style={[styles.input, !!emailError && styles.invalid]} placeholder="you@example.com" placeholderTextColor="#AAA6A8" value={email} onChangeText={value => { setEmail(value); setEmailError(''); setError(''); setNeedsConfirmation(false); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" selectionColor="#E5B80B" />
          {!!emailError && <Text accessibilityLiveRegion="polite" style={styles.error}>{emailError}</Text>}
          <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
          <View style={[styles.passwordBox, !!passwordError && styles.invalid]}>
            <TextInput accessibilityLabel="Password" style={styles.passwordInput} placeholder={signup ? 'Create a password' : 'Enter your password'} placeholderTextColor="#CBC7CA" value={password} onChangeText={value => { setPassword(value); setPasswordError(''); setError(''); setConfirmError(''); }} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete={signup ? 'new-password' : 'current-password'} textContentType={signup ? 'newPassword' : 'password'} selectionColor="#E5B80B" returnKeyType={signup ? 'next' : 'go'} onSubmitEditing={signup ? undefined : submit} />
            <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={styles.eyeButton}>
              <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#CBC7CA" />
            </Pressable>
          </View>
          {!!passwordError && <Text accessibilityLiveRegion="polite" style={styles.error}>{passwordError}</Text>}
          {signup && !passwordError && <Text style={styles.passwordHint}>At least 6 characters. Your account may require a stronger password.</Text>}
          {signup && <>
            <Text style={[styles.label, styles.passwordLabel]}>Confirm password</Text>
            <View style={[styles.passwordBox, !!confirmError && styles.invalid]}>
              <TextInput accessibilityLabel="Confirm password" style={styles.passwordInput} placeholder="Re-enter the same password" placeholderTextColor="#CBC7CA" value={confirm} onChangeText={value => { setConfirm(value); setConfirmError(''); }} secureTextEntry={!confirmVisible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" selectionColor="#E5B80B" returnKeyType="go" onSubmitEditing={submit} />
              <Pressable accessibilityRole="button" accessibilityLabel={confirmVisible ? 'Hide confirm password' : 'Show confirm password'} onPress={() => setConfirmVisible(!confirmVisible)} style={styles.eyeButton}>
                <Ionicons name={confirmVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#CBC7CA" />
              </Pressable>
            </View>
            {!!confirmError && <Text accessibilityLiveRegion="polite" style={styles.error}>{confirmError}</Text>}
          </>}
          <View style={styles.helpRow}>
            <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
            {!signup && <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/forgot-password')}><Text style={styles.link}>Forgot password?</Text></Pressable>}
          </View>
          {!signup && needsConfirmation && <Pressable accessibilityRole="button" disabled={resending} onPress={resendConfirmation} style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}>
            {resending ? <ActivityIndicator color="#EABB00" /> : <Text style={styles.resendText}>Resend confirmation email</Text>}
          </Pressable>}
          <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={({ pressed }) => [styles.continue, (pressed || busy) && styles.pressed]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.continueText}>Continue</Text>}
          </Pressable>
          <View style={styles.divider}><View style={styles.rule} /><Text style={styles.or}>Or</Text><View style={styles.rule} /></View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => socialLogin('apple')} style={({ pressed }) => [styles.social, pressed && styles.pressed]}><Image source={require('../assets/apple.png')} style={styles.apple} /><Text style={styles.socialText}>Continue with Apple</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => socialLogin('google')} style={({ pressed }) => [styles.social, styles.googleButton, pressed && styles.pressed]}><Image source={require('../assets/google.png')} style={styles.google} /><Text style={styles.socialText}>Continue with Google</Text></Pressable>
          <View style={styles.footer}><Text style={styles.footerText}>{signup ? 'Already have an account? ' : 'Don’t have an account? '}</Text><Pressable accessibilityRole="link" hitSlop={8} onPress={() => switchTab(!signup)}><Text style={styles.link}>{signup ? 'Log in' : 'Sign up'}</Text></Pressable></View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 24, backgroundColor: '#303131', borderWidth: 1, borderColor: '#625622', alignItems: 'center' },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5B80B', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successCheck: { color: '#262727', fontSize: 36, fontWeight: '700' },
  successTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  successMessage: { color: '#DEDADD', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  successEmail: { color: '#EABB00', fontSize: 15, fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  successButton: { width: '100%', marginTop: 24, minHeight: 46 },
  screen: { flex: 1, backgroundColor: '#262727' },
  content: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', justifyContent: 'flex-start', paddingHorizontal: 18, paddingTop: 32, paddingBottom: 32 },
  welcome: { alignItems: 'center', paddingHorizontal: 8, paddingTop: 16, marginBottom: 32 },
  welcomeTitle: { color: '#FFFFFF', fontSize: 26, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  welcomeSubtitle: { color: '#CBC7CA', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  tabs: { flexDirection: 'row', marginHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#EABB00' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  yellow: { color: '#EABB00' },
  form: { marginTop: 28 },
  nameField: { marginBottom: 11 },
  label: { color: '#FFFFFF', fontSize: 12, marginBottom: 5 },
  input: { height: 41, borderWidth: 1.4, borderColor: '#D3D2D2', borderRadius: 10, paddingHorizontal: 14, color: '#DEDADD', fontSize: 12 },
  passwordLabel: { marginTop: 11 },
  passwordHint: { color: '#CBC7CA', fontSize: 11, lineHeight: 16, marginTop: 5 },
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
  resendButton: { minHeight: 39, borderWidth: 1, borderColor: '#EABB00', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 10, paddingHorizontal: 12 },
  resendText: { color: '#EABB00', fontSize: 12, fontWeight: '700' },
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
