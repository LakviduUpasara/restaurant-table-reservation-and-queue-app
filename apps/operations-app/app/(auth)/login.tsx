import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '../../components/common/ActionButton';
import { FigmaInput } from '../../components/common/FigmaInput';
import { COLORS } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"><View style={styles.mobileCanvas}>
          <Image source={require('../../assets/images/dineflow-logo.png')} style={styles.logo} resizeMode="contain" />

          <View style={styles.heading}>
            <Text style={styles.title}>Owner Login</Text>
            <Text style={styles.subtitle}>Access your staff account</Text>
          </View>

          <View style={styles.form}>
            <FigmaInput
              value={staffId}
              onChangeText={setStaffId}
              placeholder="Staff ID"
              icon="person"
              autoCapitalize="characters"
            />
            <FigmaInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              icon="lock-closed"
              password
            />
            <ActionButton
              title="Login"
              variant="dark"
              onPress={() => router.replace('/(owner)/dashboard')}
              style={{ marginTop: 2 }}
            />
            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingTop: 30, paddingBottom: 35, backgroundColor: COLORS.background },
  mobileCanvas: { width: 375, maxWidth: '100%', alignSelf: 'center', flexGrow: 1, paddingHorizontal: 39, paddingTop: 45, paddingBottom: 35 },
  logo: { width: '100%', height: 190, marginBottom: 62 },
  heading: { alignItems: 'flex-start', marginLeft: 37, marginBottom: 30 },
  title: { fontSize: 29, fontWeight: '400', color: '#111111' },
  subtitle: { fontSize: 14, color: '#2A2A2A', marginTop: 2 },
  form: { width: '100%' },
  forgot: { alignSelf: 'center', padding: 14 },
  forgotText: { fontSize: 11, color: '#6A6A6A' },
});
