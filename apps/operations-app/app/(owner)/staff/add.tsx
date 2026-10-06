import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS } from '../../../constants/theme';
import { staffUsers } from '../../../utils/mockData';

export default function AddUser() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Waiter');

  const add = () => {
    if (!name || !staffId || !password || !confirmPassword || !phone) {
      Alert.alert('Missing details', 'Please complete all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }
    staffUsers.unshift({ id: staffId, name, phone, role, password });
    Alert.alert('User added', `${name} has been added to the staff list.`, [{ text: 'OK', onPress: () => router.replace('/(owner)/staff') }]);
  };

  return (
    <OwnerLayout active="more" title="Add User" showBack onBack={() => router.back()}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <FigmaInput label="User name" value={name} onChangeText={setName} placeholder="Enter user name" />
          <FigmaInput label="Staff ID" value={staffId} onChangeText={setStaffId} placeholder="Staff ID" autoCapitalize="characters" />
          <FigmaInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" password />
          <FigmaInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" password />
          <FigmaInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="07X XXX XXXX" keyboardType="phone-pad" />
          <SelectField label="Role" value={role} onChange={setRole} options={['Waiter', 'Cashier', 'Kitchen', 'Manager']} />
          <ActionButton title="Add to User" onPress={add} style={{ marginTop: 4 }} />
          <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 8, paddingBottom: 24 },
});
