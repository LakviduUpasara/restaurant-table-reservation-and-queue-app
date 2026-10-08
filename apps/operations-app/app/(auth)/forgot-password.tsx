import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '../../components/common/ActionButton';
import { FigmaInput } from '../../components/common/FigmaInput';
import { COLORS } from '../../constants/theme';

export default function ForgotPassword() {
  const router = useRouter(); const [email, setEmail] = useState('');
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><Text style={styles.title}>Forgot password?</Text><Text style={styles.sub}>Enter the email linked to your Owner account. Password reset will be connected during backend integration.</Text><FigmaInput label="Email" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" /><ActionButton title="Send reset link" onPress={() => email.trim() ? Alert.alert('Coming soon', 'The reset email will be enabled with Supabase authentication.') : Alert.alert('Enter email', 'Please enter your email address.')} /><ActionButton title="Back to Login" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: COLORS.background }, page: { flexGrow: 1, width: 390, maxWidth: '100%', alignSelf: 'center', padding: 22, justifyContent: 'center' }, title: { fontSize: 27, fontWeight: '900', color: COLORS.text }, sub: { fontSize: 11, lineHeight: 16, color: COLORS.textSoft, marginTop: 5, marginBottom: 18 } });
