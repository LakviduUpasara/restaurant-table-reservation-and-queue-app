import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

export function Login() {
  const router = useRouter();

  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!staffId.trim() || !password.trim()) {
      Alert.alert(
        'Missing details',
        'Please enter Staff ID and password.'
      );
      return;
    }

    setBusy(true);

    try {
      // TEMPORARY FRONTEND-ONLY LOGIN
      // Real Supabase authentication will be restored later.

      await new Promise(resolve => setTimeout(resolve, 300));

      router.replace('/(owner)/dashboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Owner Login</Text>
      <Text style={styles.subtitle}>
        Access your restaurant management account
      </Text>

      <Text style={styles.label}>Staff ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Staff ID"
        value={staffId}
        onChangeText={setStaffId}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={[styles.loginButton, busy && styles.disabled]}
        onPress={handleLogin}
        disabled={busy}
      >
        <Text style={styles.loginText}>
          {busy ? 'Logging in...' : 'Login'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert(
            'Coming soon',
            'Password reset will be connected during backend integration.'
          )
        }
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>
    </View>
  );
}

export function ForgotPassword() {
  return null;
}

export function ResetPassword() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#E2B318',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  loginText: {
    fontSize: 16,
    fontWeight: '700',
  },
  forgotText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
  },
});