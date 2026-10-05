import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
        redirectTo: 'dineflow-customer://reset-password',
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

  const continueWithPhone = () => {
    if (phone.trim().length < 7) {
      Alert.alert('Enter a valid phone number', 'Please check the phone number and try again.');
      return;
    }
    Alert.alert(
      'Phone recovery is unavailable',
      'Password recovery is currently set up with email. Continue with your account email instead.',
      [{ text: 'Continue with email', onPress: () => router.replace('/forgot-password') }],
    );
  };

  return (
    <RecoveryScreen footer={<RecoveryButton title="Confirm" onPress={continueWithPhone} />}>
      <RecoveryHeading
        title="Enter your phone number"
        description="Enter the phone number associated with your account."
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

export function CheckEmailScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const codeInput = useRef<TextInput>(null);

  const verifyCode = () => {
    Alert.alert(
      'Use your reset link',
      'This app sends a password reset link by email. Open that link to continue; email-code verification is not enabled.',
    );
  };

  const resend = async () => {
    if (!recoveryEmailSchema.safeParse(email).success) {
      Alert.alert('Email unavailable', 'Go back and enter your email address again.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'dineflow-customer://reset-password',
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
          <RecoveryButton title="Verify Code" onPress={verifyCode} busy={busy} />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={resend}
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>
              Haven’t got the email yet? <Text style={styles.resendLink}>Resend email</Text>
            </Text>
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
      <Pressable
        accessibilityLabel="Enter the 5-digit email verification code"
        accessibilityRole="button"
        onPress={() => codeInput.current?.focus()}
        style={styles.codeFields}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <View key={index} style={styles.codeCell}>
            <Text style={styles.codeDigit}>{token[index] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={codeInput}
          accessibilityLabel="Verification code"
          autoComplete="one-time-code"
          keyboardType="number-pad"
          maxLength={5}
          onChangeText={value => setToken(value.replace(/\D/g, '').slice(0, 5))}
          style={styles.hiddenCodeInput}
          value={token}
        />
      </Pressable>
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
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      Alert.alert('Password updated', 'You can now sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      Alert.alert('Could not reset password', String((error as Error).message));
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
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  description: { color: '#C3C3C6', fontSize: 15, lineHeight: 22, marginTop: 12 },
  field: { marginTop: 2 },
  confirmField: { marginTop: 14 },
  fieldLabel: { color: '#E0E0E3', fontSize: 14, marginBottom: 7 },
  input: {
    height: 50,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 11,
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
  alternateMethodText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  codeFields: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 1,
  },
  codeCell: {
    width: 44,
    height: 48,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: { color: colors.text, fontSize: 22, fontWeight: '600' },
  hiddenCodeInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
  },
  footer: { marginTop: 18, gap: 10 },
  actionButton: {
    height: 50,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: { opacity: 0.72 },
  actionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resendButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resendText: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  resendLink: { color: '#E5E5E7', textDecorationLine: 'underline' },
  pressed: { opacity: 0.82 },
});
