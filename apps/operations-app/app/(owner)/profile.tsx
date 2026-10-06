import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { ActionButton } from '../../components/common/ActionButton';
import { COLORS } from '../../constants/theme';
import { owner } from '../../utils/mockData';

export default function OwnerProfile() {
  const router = useRouter();
  return (
    <OwnerLayout active="more">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.profileCard}>
          <Image source={require('../../assets/images/owner-avatar.png')} style={styles.photo} />
          <View style={styles.field}>{owner.fullName}</View>
          <View style={styles.field}>{owner.phone}</View>
          <View style={styles.field}>{owner.email}</View>

          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.sectionSub}>Manage the data you share with us</Text>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.sectionSub}>Control your account security with 2-step verification</Text>

          <ActionButton title="Sign Out" variant="outline" onPress={() => Alert.alert('Sign out', 'Do you want to sign out?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: () => router.replace('/(auth)/login') }])} style={styles.signOut} />
        </View>
      </ScrollView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 26, paddingBottom: 20 },
  profileCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 48, borderTopRightRadius: 48, minHeight: 590, paddingTop: 28, paddingHorizontal: 34 },
  photo: { width: 98, height: 98, borderRadius: 49, alignSelf: 'center', marginBottom: 20 },
  field: { height: 40, backgroundColor: '#FAFAFA', borderRadius: 3, alignItems: 'center', justifyContent: 'center', fontSize: 12, marginBottom: 11, color: COLORS.text },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 18, color: COLORS.text },
  sectionSub: { fontSize: 10, color: COLORS.text, marginTop: 5, lineHeight: 14 },
  signOut: { marginTop: 24, borderColor: '#1C1C1C', flexDirection: 'row' },
});
