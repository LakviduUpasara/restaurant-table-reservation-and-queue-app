import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS } from '../../../constants/theme';
import { createStaff } from '../../../services/staff.service';
import { useAuth } from '../../../stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import type { ImagePickerAsset } from 'expo-image-picker';
import { OwnerPhotoPicker } from '../../../components/common/OwnerPhotoPicker';
import { uploadStaffPhoto } from '../../../services/staff.service';

const roles = ['Waiter', 'Cashier', 'Kitchen', 'Host', 'Manager'];

export default function AddUser() {
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Waiter');

  const save = async () => {
    if (!restaurantId) return Alert.alert('Restaurant unavailable', 'Your account is not assigned to a restaurant.');
    if (!name.trim() || !password || !phone.trim()) return Alert.alert('Missing details', 'Please complete all required fields.');
    if (password.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');
    if (password !== confirmPassword) return Alert.alert('Passwords do not match', 'Please confirm the same password.');
    if (!email.trim()) return Alert.alert('Missing email', 'Enter the staff account email.');
    setBusy(true);
    try {
      const photo_path = photo ? await uploadStaffPhoto(restaurantId, photo) : undefined;
      const result = await createStaff({ restaurant_id: restaurantId, full_name: name.trim(), phone: phone.trim(), job_role: role, password, email: email.trim(), photo_path });
      await client.invalidateQueries({ queryKey: ['owner-staff'] });
      setPassword(''); setConfirmPassword('');
      Alert.alert('User added', `${name.trim()} was assigned ${result.profile.staff_id} and can sign in using ${email.trim()}.`, [{ text: 'Done', onPress: () => router.replace('/(owner)/staff') }]);
    } catch (error) { Alert.alert('Could not add user', error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  return (
    <OwnerLayout active="more" title="Add User" showBack onBack={() => router.back()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.intro}><Text style={styles.title}>Create staff account</Text><Text style={styles.subtitle}>Set up access details for a restaurant employee.</Text></View>
        <FigmaInput label="User name" value={name} onChangeText={setName} placeholder="Enter user name" />
        <OwnerPhotoPicker asset={photo} onChange={setPhoto} disabled={busy} />
        <FigmaInput label="Staff ID" value="Generated on save (ST001, ST002...)" editable={false} />
        <FigmaInput label="Account email" value={email} onChangeText={setEmail} placeholder="name@example.com" autoCapitalize="none" keyboardType="email-address" />
        <FigmaInput label="Password" value={password} onChangeText={setPassword} placeholder="Create password" password />
        <FigmaInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" password />
        <FigmaInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="07X XXX XXXX" keyboardType="phone-pad" />
        <SelectField label="Role" value={role} onChange={setRole} options={roles} />
        <View style={styles.security}><Text style={styles.securityTitle}>Account security</Text><Text style={styles.securityText}>The staff member will use these credentials to access the Operations app.</Text></View>
        <ActionButton title="Add to Users" busy={busy} onPress={save} style={{ marginTop: 6 }} />
        <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </ScrollView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 6, paddingBottom: 26 },
  intro: { marginBottom: 17 },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 10.5, color: COLORS.textSoft, marginTop: 4, lineHeight: 15 },
  security: { backgroundColor: COLORS.primarySoft, borderRadius: 14, padding: 12, marginTop: 2, marginBottom: 10 },
  securityTitle: { fontSize: 10.5, fontWeight: '900', color: COLORS.text },
  securityText: { fontSize: 9.5, color: '#766900', lineHeight: 15, marginTop: 3 },
});
