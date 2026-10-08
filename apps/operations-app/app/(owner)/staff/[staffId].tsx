import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS } from '../../../constants/theme';
import { staffUsers } from '../../../utils/mockData';

const roles = ['Waiter', 'Cashier', 'Kitchen', 'Host', 'Manager'];

export default function EditUser() {
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const router = useRouter();
  const user = useMemo(() => staffUsers.find(item => item.id === staffId), [staffId]);
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [role, setRole] = useState(user?.role ?? 'Waiter');

  if (!user) {
    return <OwnerLayout active="more" title="Edit User" showBack onBack={() => router.back()}><View style={styles.notFound}><Ionicons name="person-remove-outline" size={35} color={COLORS.muted} /><Text style={styles.notFoundTitle}>User not found</Text><ActionButton title="Back to Users" onPress={() => router.replace('/(owner)/staff')} style={{ marginTop: 13 }} /></View></OwnerLayout>;
  }

  const save = () => {
    if (!name.trim() || !phone.trim()) return Alert.alert('Missing details', 'Name and phone number are required.');
    if ((password || confirmPassword) && password !== confirmPassword) return Alert.alert('Passwords do not match', 'Please confirm the new password.');
    if (password && password.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');
    user.name = name.trim(); user.phone = phone.trim(); user.role = role;
    Alert.alert('Changes saved', 'Staff details were updated successfully.', [{ text: 'Done', onPress: () => router.back() }]);
  };

  return (
    <OwnerLayout active="more" title="Edit User" showBack onBack={() => router.back()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.profileMini}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text></View><View><Text style={styles.miniName}>{user.name}</Text><Text style={styles.miniId}>Staff ID · {user.id}</Text></View></View>
        <FigmaInput label="User name" value={name} onChangeText={setName} placeholder="User name" />
        <View style={styles.lockedField}><Ionicons name="lock-closed-outline" size={15} color="#8D8D88" /><Text style={styles.lockedText}>{user.id}</Text><Text style={styles.lockedNote}>Staff ID</Text></View>
        <FigmaInput label="New password" value={password} onChangeText={setPassword} placeholder="Leave blank to keep current" password />
        <FigmaInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" password />
        <FigmaInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="07X XXX XXXX" keyboardType="phone-pad" />
        <SelectField label="Role" value={role} onChange={setRole} options={roles} />
        <ActionButton title="Save Changes" onPress={save} style={{ marginTop: 5 }} />
        <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
        <ActionButton title="Reset Password" variant="soft" onPress={() => Alert.alert('Reset password', `A reset action for ${user.name} will be connected to the backend later.`)} style={{ marginTop: 10 }} />
      </ScrollView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 6, paddingBottom: 26 },
  profileMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: '#ECECE8', padding: 12, marginBottom: 16 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  miniName: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  miniId: { fontSize: 9.5, color: COLORS.muted, marginTop: 2 },
  lockedField: { minHeight: 48, backgroundColor: '#EFEFEC', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0DC', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 14 },
  lockedText: { fontSize: 13, color: COLORS.textSoft, marginLeft: 9 },
  lockedNote: { marginLeft: 'auto', fontSize: 9, color: COLORS.muted },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  notFoundTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text, marginTop: 10 },
});
