import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const recoveryEmailSchema = z.email();
const recoveryRedirectTo = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? new URL('/reset-password', window.location.href).toString()
    : 'dineflow-customer://reset-password';

function RecoveryScreen({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.content}>{children}</View>
        <View style={styles.footer}>{footer}</View>
      </View>
    </SafeAreaView>
  );
}

function RecoveryHeading({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

function RecoveryField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'email-address' | 'default' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !passwordVisible}
          style={[styles.input, secureTextEntry && styles.passwordInput]}
          value={value}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible(visible => !visible)}
            style={styles.passwordVisibility}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RecoveryButton({
  title,
  onPress,
  busy = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        (disabled || busy) && styles.actionButtonDisabled,
        pressed && !disabled && !busy && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={styles.actionText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (!recoveryEmailSchema.safeParse(normalizedEmail).success) {
      Alert.alert('Enter a valid email', 'Please check your email address and try again.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: recoveryRedirectTo(),
      });
      if (error) throw error;

      router.push({ pathname: '/check-email', params: { email: normalizedEmail } });
    } catch (error) {
      Alert.alert('Could not send reset link', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecoveryScreen
      footer={<RecoveryButton title="Reset Password" onPress={submit} busy={busy} />}
    >
      <RecoveryHeading
        title="Forgot password"
        description="Please enter your email to reset the password"
      />
      <RecoveryField
        label="Your Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="name@example.com"
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/phone-recovery')}
        style={styles.alternateMethod}
      >
        <Text style={styles.alternateMethodText}>Use phone number instead</Text>
      </Pressable>
    </RecoveryScreen>
  );
}

export function PhoneRecoveryScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const continueWithPhone = async () => {
    const normalizedPhone = phone.trim().replace(/[()\s-]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
      Alert.alert('Enter a valid phone number', 'Use the international format, including your country code, such as +94712345678.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false, channel: 'sms' },
      });
      if (error) throw error;
      router.push({ pathname: '/phone-recovery-verify', params: { phone: normalizedPhone } });
    } catch (error) {
      Alert.alert('Could not send verification code', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecoveryScreen footer={<RecoveryButton title="Send Code" onPress={() => void continueWithPhone()} busy={busy} />}>
      <RecoveryHeading
        title="Enter your phone number"
        description="Enter the phone number linked to your account, including its country code. We’ll send you a verification code by SMS."
      />
      <RecoveryField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        placeholder="+1 555 000 0000"
      />
    </RecoveryScreen>
  );
}

export function VerifyPhoneRecoveryScreen() {
  const router = useRouter();
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof phoneParam === 'string' ? phoneParam : '';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Enter the verification code', 'Enter the 6-digit code sent to your phone.');
      return;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Alert.alert('Phone number unavailable', 'Go back and enter your phone number again.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
      if (error) throw error;
      if (!data.session) throw new Error('Verification succeeded, but no recovery session was created. Request a new code.');
      router.replace('/reset-password');
    } catch (error) {
      Alert.alert('Could not verify code', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Alert.alert('Phone number unavailable', 'Go back and enter your phone number again.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false, channel: 'sms' },
      });
      if (error) throw error;
      setCode('');
      Alert.alert('Code sent', 'A new verification code has been sent to your phone.');
    } catch (error) {
      Alert.alert('Could not resend code', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecoveryScreen
      footer={
        <>
          <RecoveryButton title="Verify Code" onPress={() => void verifyCode()} busy={busy} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void resendCode()}
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>
              Didn’t receive a code? <Text style={styles.resendLink}>Resend SMS</Text>
            </Text>
          </Pressable>
        </>
      }
    >
      <RecoveryHeading
        title="Verify your phone"
        description={phone ? `Enter the 6-digit code sent to ${phone}.` : 'Enter the 6-digit code sent to your phone.'}
      />
      <RecoveryField
        label="Verification code"
        value={code}
        onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="phone-pad"
        placeholder="6-digit code"
      />
    </RecoveryScreen>
  );
}

export function CheckEmailScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    if (!recoveryEmailSchema.safeParse(email).success) {
      Alert.alert('Email unavailable', 'Go back and enter your email address again.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: recoveryRedirectTo(),
      });
      if (error) throw error;
      Alert.alert('Reset link sent', 'Check your email for the password reset link.');
    } catch (error) {
      Alert.alert('Could not resend link', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecoveryScreen
      footer={
        <>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={resend}
            style={styles.resendButton}
          >
            {busy
              ? <ActivityIndicator color={colors.accent} />
              : (
                <Text style={styles.resendText}>
                  Haven’t got the email yet? <Text style={styles.resendLink}>Resend email</Text>
                </Text>
              )}
          </Pressable>
        </>
      }
    >
      <RecoveryHeading
        title="Check your email"
        description={
          email
            ? `We sent a password reset link to ${email}. Open the link in that email to continue.`
            : 'Open the password reset link we sent to your email to continue.'
        }
      />
    </RecoveryScreen>
  );
}

export function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const savePassword = async () => {
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }

    setBusy(true);
    let passwordUpdated = false;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      passwordUpdated = true;

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      Alert.alert('Password updated', 'You can now sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      Alert.alert(
        passwordUpdated ? 'Password updated' : 'Could not reset password',
        passwordUpdated
          ? `Your password was changed, but automatic sign-out failed. Please sign out manually. ${String((error as Error).message)}`
          : String((error as Error).message),
      );
      if (passwordUpdated) router.replace('/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecoveryScreen
      footer={<RecoveryButton title="Update Password" onPress={savePassword} busy={busy} />}
    >
      <RecoveryHeading
        title="Set a new password"
        description="Create a new password. Make sure it is different from your previous one."
      />
      <RecoveryField
        label="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="At least 6 characters"
      />
      <View style={styles.confirmField}>
        <RecoveryField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Enter your new password again"
        />
      </View>
    </RecoveryScreen>
  );
}

const colors = {
  background: '#252525',
  text: '#F7F7F8',
  muted: '#A6A6AA',
  border: '#646469',
  secondary: '#3A3A3C',
  accent: '#EDB813',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { marginTop: 19 },
  heading: { marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', color: colors.text, fontSize: 22, fontWeight: '700' },
  description: { fontFamily: 'Inter_400Regular', color: '#C3C3C6', fontSize: 15, lineHeight: 22, marginTop: 12 },
  field: { marginTop: 2 },
  confirmField: { marginTop: 14 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', color: '#E0E0E3', fontSize: 14, marginBottom: 7 },
  input: {
    height: 50,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.background,
  },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 38 },
  passwordVisibility: {
    position: 'absolute',
    right: 10,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternateMethod: { alignSelf: 'flex-end', minHeight: 44, paddingVertical: 10, justifyContent: 'center' },
  alternateMethodText: { fontFamily: 'Inter_600SemiBold', color: colors.accent, fontSize: 14, fontWeight: '600' },
  footer: { marginTop: 18, gap: 10 },
  actionButton: {
    height: 50,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: { opacity: 0.72 },
  actionText: { fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resendButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resendText: { fontFamily: 'Inter_400Regular', color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  resendLink: { fontFamily: 'Inter_500Medium', color: '#E5E5E7', textDecorationLine: 'underline' },
  pressed: { opacity: 0.82 },
});
