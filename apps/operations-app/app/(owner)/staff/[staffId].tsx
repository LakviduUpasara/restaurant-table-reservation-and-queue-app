import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS } from '../../../constants/theme';
import { staffUsers } from '../../../utils/mockData';

export default function EditUser() {
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const router = useRouter();
  const user = useMemo(() => staffUsers.find(u => u.id === staffId), [staffId]);
  const [name, setName] = useState(user?.name ?? '');
  const [id, setId] = useState(user?.id ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [role, setRole] = useState(user?.role ?? 'Waiter');

  const save = () => {
    if (!user) return;
    if (!name || !id || !phone) {
      Alert.alert('Missing details', 'Please complete all required fields.');
      return;
    }
    if ((password || confirmPassword) && password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }
    user.name = name;
    user.id = id;
    user.phone = phone;
    user.role = role;
    if (password) user.password = password;
    Alert.alert('Saved', 'User details were updated.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const resetPassword = () => {
    setPassword('');
    setConfirmPassword('');
    Alert.alert('Password reset', 'Enter a new password in the password fields, then tap Save.');
  };

  if (!user) {
    return (
      <OwnerLayout active="more" title="Edit User" showBack onBack={() => router.back()}>
        <View style={styles.empty}><Text style={styles.emptyTitle}>User not found</Text><ActionButton title="Back" onPress={() => router.back()} /></View>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout active="more" title="Edit User" showBack onBack={() => router.back()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <FigmaInput label="User name" value={name} onChangeText={setName} placeholder="User name" />
        <FigmaInput label="Staff ID" value={id} onChangeText={setId} placeholder="Staff ID" autoCapitalize="characters" />
        <FigmaInput label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" password />
        <FigmaInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" password />
        <ActionButton title="Reset Password" variant="outline" onPress={resetPassword} style={{ marginBottom: 12 }} />
        <FigmaInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="07X XXX XXXX" keyboardType="phone-pad" />
        <SelectField label="Role" value={role} onChange={setRole} options={['Waiter', 'Cashier', 'Kitchen', 'Manager']} />
        <ActionButton title="Save" onPress={save} style={{ marginTop: 3 }} />
        <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </ScrollView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8, paddingBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
});
