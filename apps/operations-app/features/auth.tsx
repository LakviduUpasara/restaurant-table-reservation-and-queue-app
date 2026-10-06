import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Screen } from '@dineflow/shared';
import { useAuth } from '../stores/auth.store';
import { supabase } from '../lib/supabase';
import { StaffIcon } from './staff-icons';

const loginColors = {
  background: '#F4F4F4',
  text: '#111111',
  secondaryText: '#3F3F46',
  placeholder: '#A1A1AA',
  icon: '#52525B',
  border: '#B8B8B8',
  focusedBorder: '#6B3A17',
  button: '#2D2D2D',
  white: '#FFFFFF',
} as const;

function UserIcon() {
  return <StaffIcon color={loginColors.icon} name="person-outline" size={22} />;
}

function LockIcon() {
  return <StaffIcon color={loginColors.icon} name="lock-closed-outline" size={22} />;
}

export function Login() {
  const router = useRouter();
  const signIn = useAuth((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState<'staffId' | 'password' | null>(null);

  async function handleLogin() {
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      const role = useAuth.getState().profile?.role;

      if (role === 'OWNER') router.replace('/(owner)/dashboard');
      else if (role === 'STAFF') router.replace('/(staff)/dashboard');
      else {
        await useAuth.getState().signOut();
        Alert.alert('Access denied', 'This app requires a staff or owner account.');
      }
    } catch (error) {
      Alert.alert('Sign in failed', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={loginStyles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={loginStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={loginStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            accessibilityLabel="DineFlow, Good food. Smoother plans."
            resizeMode="contain"
            source={require('../assets/dineflow-logo.png')}
            style={loginStyles.logo}
          />

          <View style={loginStyles.loginSection}>
            <View style={loginStyles.headingBlock}>
              <Text style={loginStyles.title}>Staff Login</Text>
              <Text style={loginStyles.subtitle}>Access your staff account</Text>
            </View>

            <View style={loginStyles.form}>
              <View
                style={[
                  loginStyles.inputShell,
                  focusedField === 'staffId' && loginStyles.inputShellFocused,
                ]}
              >
                <UserIcon />
                <TextInput
                  accessibilityLabel="Staff ID"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!busy}
                  keyboardType="email-address"
                  onBlur={() => setFocusedField(null)}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('staffId')}
                  placeholder="Staff ID"
                  placeholderTextColor={loginColors.placeholder}
                  returnKeyType="next"
                  style={loginStyles.input}
                  textContentType="username"
                  value={email}
                />
              </View>

              <View
                style={[
                  loginStyles.inputShell,
                  focusedField === 'password' && loginStyles.inputShellFocused,
                ]}
              >
                <LockIcon />
                <TextInput
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!busy}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onSubmitEditing={() => void handleLogin()}
                  placeholder="Password"
                  placeholderTextColor={loginColors.placeholder}
                  returnKeyType="done"
                  secureTextEntry
                  style={loginStyles.input}
                  textContentType="password"
                  value={password}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Login"
                disabled={busy}
                onPress={() => void handleLogin()}
                style={({ pressed }) => [
                  loginStyles.loginButton,
                  pressed && !busy && loginStyles.loginButtonPressed,
                  busy && loginStyles.loginButtonDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={loginColors.white} />
                ) : (
                  <Text style={loginStyles.loginButtonText}>Login</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  return (
    <Screen title="Reset password" subtitle="We will email a reset link for your staff account.">
      <Field
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        title="Send reset link"
        onPress={async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'dineflow-operations://reset-password',
          });
          if (error) Alert.alert('Could not send link', error.message);
          else {
            Alert.alert('Check your email');
            router.push('/reset-password');
          }
        }}
      />
    </Screen>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  return (
    <Screen title="Set new password">
      <Field label="New password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button
        title="Save password"
        onPress={async () => {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) Alert.alert('Could not reset password', error.message);
          else router.replace('/login');
        }}
      />
    </Screen>
  );
}

const loginStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: loginColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 85,
    paddingBottom: 48,
  },
  logo: {
    width: '100%',
    maxWidth: 315,
    aspectRatio: 315 / 230,
  },
  loginSection: {
    width: '100%',
    maxWidth: 337,
    marginTop: 81,
  },
  headingBlock: {
    alignItems: 'center',
  },
  title: {
    color: loginColors.text,
    fontSize: 40,
    fontWeight: '400',
    letterSpacing: -1,
    lineHeight: 48,
    textAlign: 'center',
  },
  subtitle: {
    color: loginColors.secondaryText,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 26,
    textAlign: 'center',
  },
  form: {
    gap: 20,
    marginTop: 44,
  },
  inputShell: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: loginColors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputShellFocused: {
    borderColor: loginColors.focusedBorder,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: loginColors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  userIcon: {
    width: 18,
    height: 21,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  userIconHead: {
    position: 'absolute',
    top: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: loginColors.icon,
  },
  userIconBody: {
    width: 18,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: loginColors.icon,
  },
  lockIcon: {
    width: 18,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lockShackle: {
    position: 'absolute',
    top: 0,
    width: 11,
    height: 11,
    borderColor: loginColors.icon,
    borderRadius: 7,
    borderWidth: 2,
  },
  lockBody: {
    width: 16,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: loginColors.icon,
  },
  lockKeyhole: {
    width: 3,
    height: 5,
    borderRadius: 2,
    backgroundColor: loginColors.background,
  },
  loginButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: loginColors.button,
    paddingHorizontal: 16,
  },
  loginButtonPressed: {
    opacity: 0.86,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: loginColors.white,
    fontSize: 16,
    fontWeight: '400',
  },
});
