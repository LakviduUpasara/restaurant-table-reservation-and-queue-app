import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type Order, money } from '@dineflow/shared';
import { api } from '../lib/api';
import { profilePhotoImage } from '../lib/account-image-assets';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';

const palette = {
  dark: '#262626',
  yellow: '#EDB813',
  ink: '#111111',
  muted: '#777777',
  pale: '#F7F7F7',
  line: '#E9E9E9',
};

function SettingsHeader({ welcomeName }: { welcomeName: string }) {
  const router = useRouter();
  return (
    <View style={styles.darkHeader}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={22} color={palette.dark} />
        </Pressable>
        <Text style={styles.brand}>Dine<Text style={styles.brandAccent}>Flow</Text></Text>
        <View style={styles.headerSpacer} />
      </View>
      <Text numberOfLines={1} style={styles.welcome}>Welcome {welcomeName || 'there'}</Text>
    </View>
  );
}

function ProfileAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  return (
    <View style={styles.avatar}>
      {profilePhotoImage ? (
        <Image source={profilePhotoImage} resizeMode="cover" style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarInitials}>{initials || <Ionicons name="person" size={34} color="#FFFFFF" />}</Text>
      )}
    </View>
  );
}

function SettingsAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={palette.dark} />
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </Pressable>
  );
}

export function AccountSettings() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const client = useQueryClient();
  const orders = useQuery({ queryKey: ['orders'], queryFn: () => api<Order[]>('/orders') });

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        Alert.alert('Could not load account email', error.message);
        return;
      }
      if (active) setEmail(data.user?.email ?? '');
    });
    return () => { active = false; };
  }, []);

  const onSignOut = async () => {
    setSignOutError('');
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      setSignOutError(String((error as Error).message));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <SettingsHeader welcomeName={profile?.full_name?.trim() ?? ''} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsPanel}>
          <Text style={styles.pageTitle}>Account Settings</Text>
          <ProfileAvatar name={profile?.full_name ?? ''} />

          <View style={styles.contactDetails}>
            <Text numberOfLines={1} style={styles.readOnlyField}>{profile?.full_name || 'Your name'}</Text>
            <Text numberOfLines={1} style={styles.readOnlyField}>{profile?.phone || 'Add your phone number'}</Text>
            <Text numberOfLines={1} style={styles.readOnlyField}>{email || 'Email not available'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <Text style={styles.sectionDescription}>Manage the personal details on your account.</Text>
            <SettingsAction
              icon="person-outline"
              title="Update User Profile"
              subtitle="Change your name and profile details"
              onPress={() => router.push('/update-profile')}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <Text style={styles.sectionDescription}>Control access to your account.</Text>
            <SettingsAction
              icon="lock-closed-outline"
              title="Reset / Update Password"
              subtitle="Choose a new password for your account"
              onPress={() => router.push('/reset-password')}
            />
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/notifications')} style={styles.notificationsButton}>
            <Ionicons name="notifications-outline" size={19} color={palette.dark} />
            <Text style={styles.notificationsText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={() => void onSignOut()}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed, signingOut && styles.signOutBusy]}
          >
            <View style={styles.signOutIcon}>
              {signingOut
                ? <ActivityIndicator size="small" color="#202544" />
                : <Ionicons name="log-out-outline" size={21} color="#202544" />}
            </View>
            <Text style={styles.signOutText}>{signingOut ? 'Signing Out…' : 'Sign Out'}</Text>
          </Pressable>
          {signOutError ? <Text style={styles.signOutError}>{signOutError}</Text> : null}

          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>Pre-orders</Text>
            {orders.isLoading ? (
              <ActivityIndicator color={palette.yellow} />
            ) : orders.error ? (
              <Pressable onPress={() => void orders.refetch()}>
                <Text style={styles.sectionDescription}>Could not load orders. Tap to retry.</Text>
              </Pressable>
            ) : orders.data?.length ? (
              orders.data.map(order => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.actionTextBlock}>
                    <Text style={styles.actionTitle}>{order.status}</Text>
                    <Text style={styles.actionSubtitle}>
                      {new Date(order.created_at).toLocaleDateString()} · {order.order_items.length} items
                    </Text>
                  </View>
                  <Text style={styles.orderPrice}>{money(order.total_cents)}</Text>
                  {order.status === 'PLACED' && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cancel pre-order"
                      onPress={() => Alert.alert('Cancel pre-order?', undefined, [
                        { text: 'Keep order', style: 'cancel' },
                        {
                          text: 'Cancel order',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await api(`/orders/${order.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } });
                              await client.invalidateQueries({ queryKey: ['orders'] });
                            } catch (error) {
                              Alert.alert('Could not cancel order', String((error as Error).message));
                            }
                          },
                        },
                      ])}
                      style={styles.cancelOrder}
                    >
                      <Text style={styles.cancelOrderText}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.sectionDescription}>No pre-orders yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountForm({
  title,
  description,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secondaryField,
  onSave,
  busy,
}: {
  title: string;
  description: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  secondaryField?: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad';
  };
  onSave: () => void;
  busy: boolean;
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.formScreen}>
      <View style={styles.formHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color={palette.dark} />
        </Pressable>
        <Text style={styles.formHeaderTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.formContent}>
        <Text style={styles.formTitle}>{title}</Text>
        <Text style={styles.formDescription}>{description}</Text>
        <Text style={styles.formLabel}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="sentences"
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#929292"
          style={styles.formInput}
          value={value}
        />
        {secondaryField && (
          <>
            <Text style={styles.formLabel}>{secondaryField.label}</Text>
            <TextInput
              accessibilityLabel={secondaryField.label}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={secondaryField.keyboardType}
              onChangeText={secondaryField.onChangeText}
              placeholder={secondaryField.placeholder}
              placeholderTextColor="#929292"
              style={styles.formInput}
              value={secondaryField.value}
            />
          </>
        )}
        <Pressable accessibilityRole="button" disabled={busy} onPress={onSave} style={[styles.saveButton, busy && styles.saveButtonBusy]}>
          {busy ? <ActivityIndicator color={palette.dark} /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function EnterPhoneNumber() {
  const { profile, refresh } = useAuth();
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);

  const savePhone = async () => {
    if (phone.trim().length < 7) {
      Alert.alert('Enter a valid phone number', 'Please enter at least 7 digits.');
      return;
    }
    setBusy(true);
    try {
      await api('/me', { method: 'PATCH', body: { phone: phone.trim() } });
      await refresh();
      Alert.alert('Phone number saved', 'Your account phone number has been updated.');
    } catch (error) {
      Alert.alert('Could not save phone number', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountForm
      title="Enter Phone Number"
      description="Add the phone number you want to use with your DineFlow account."
      label="Phone number"
      value={phone}
      onChangeText={setPhone}
      placeholder="+94 71 234 5678"
      keyboardType="phone-pad"
      onSave={() => void savePhone()}
      busy={busy}
    />
  );
}

export function UpdateUserProfile() {
  const { profile, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);

  const saveProfile = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Enter your name', 'Your name must have at least 2 characters.');
      return;
    }
    const normalizedPhone = phone.trim();
    if (normalizedPhone && normalizedPhone.replace(/\D/g, '').length < 7) {
      Alert.alert('Enter a valid phone number', 'Please enter at least 7 digits or leave the phone number empty.');
      return;
    }
    setBusy(true);
    try {
      await api('/me', { method: 'PATCH', body: { full_name: name.trim(), phone: normalizedPhone || null } });
      await refresh();
      Alert.alert('Profile updated', 'Your name and phone number have been saved.');
    } catch (error) {
      Alert.alert('Could not update profile', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountForm
      title="Update User Profile"
      description="Update the name and phone number on your account."
      label="Full name"
      value={name}
      onChangeText={setName}
      placeholder="Your full name"
      secondaryField={{
        label: 'Phone number',
        value: phone,
        onChangeText: setPhone,
        placeholder: '+94 71 234 5678',
        keyboardType: 'phone-pad',
      }}
      onSave={() => void saveProfile()}
      busy={busy}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.dark },
  darkHeader: { height: 112, backgroundColor: palette.dark, paddingHorizontal: 22, paddingTop: 5 },
  headerRow: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F1F1', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 23, fontWeight: '800', fontStyle: 'italic' },
  brandAccent: { color: palette.yellow },
  headerSpacer: { width: 34 },
  welcome: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  scrollContent: { flexGrow: 1 },
  settingsPanel: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    paddingHorizontal: 25,
    paddingTop: 24,
    paddingBottom: 34,
    alignItems: 'center',
  },
  pageTitle: { fontFamily: 'Inter_800ExtraBold', color: '#000000', fontSize: 25, fontWeight: '800', marginBottom: 23 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#B4A18A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
  contactDetails: { width: '100%', gap: 12, marginTop: 18, marginBottom: 23 },
  readOnlyField: { fontFamily: 'Inter_400Regular', height: 41, borderRadius: 9, backgroundColor: palette.pale, color: '#171717', paddingHorizontal: 16, paddingVertical: 11, fontSize: 15 },
  section: { width: '100%', marginBottom: 19 },
  sectionTitle: { fontFamily: 'Inter_800ExtraBold', width: '100%', color: '#111111', fontSize: 16, fontWeight: '800', marginBottom: 5 },
  sectionDescription: { fontFamily: 'Inter_400Regular', width: '100%', color: '#3A3A3A', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  actionRow: { width: '100%', flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 1, borderColor: palette.line, gap: 11 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' },
  actionTextBlock: { flex: 1 },
  actionTitle: { fontFamily: 'Inter_700Bold', color: '#141414', fontSize: 16, fontWeight: '700' },
  actionSubtitle: { fontFamily: 'Inter_400Regular', color: '#777777', fontSize: 13, lineHeight: 18, marginTop: 3 },
  notificationsButton: { width: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderColor: palette.line },
  notificationsText: { fontFamily: 'Inter_700Bold', flex: 1, color: '#141414', fontSize: 14, fontWeight: '700' },
  signOutButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  signOutBusy: { opacity: 0.7 },
  signOutIcon: { width: 40, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#D2D2D8', alignItems: 'center', justifyContent: 'center' },
  signOutText: { fontFamily: 'Inter_800ExtraBold', color: '#111111', fontSize: 14, fontWeight: '800' },
  signOutError: { fontFamily: 'Inter_400Regular', color: '#B42318', fontSize: 13, lineHeight: 18, marginTop: 12 },
  ordersSection: { width: '100%', marginTop: 27, paddingTop: 19, borderTopWidth: 1, borderColor: palette.line, gap: 9 },
  orderRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.line },
  orderPrice: { fontFamily: 'Inter_700Bold', color: '#151515', fontSize: 14, fontWeight: '700' },
  cancelOrder: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7, backgroundColor: '#FFF0F0', justifyContent: 'center' },
  cancelOrderText: { fontFamily: 'Inter_700Bold', color: '#A94343', fontSize: 13, fontWeight: '700' },
  formScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  formHeader: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: palette.line },
  formHeaderTitle: { fontFamily: 'Inter_700Bold', color: '#151515', fontSize: 16, fontWeight: '700' },
  formContent: { paddingHorizontal: 24, paddingTop: 35 },
  formTitle: { fontFamily: 'Inter_800ExtraBold', color: '#111111', fontSize: 23, fontWeight: '800' },
  formDescription: { fontFamily: 'Inter_400Regular', color: '#666666', fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 28 },
  formLabel: { fontFamily: 'Inter_700Bold', color: '#292929', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  formInput: { fontFamily: 'Inter_400Regular', height: 52, borderWidth: 1, borderColor: '#D1D1D1', borderRadius: 10, paddingHorizontal: 14, color: '#161616', fontSize: 16 },
  saveButton: { height: 50, borderRadius: 25, marginTop: 22, backgroundColor: palette.yellow, alignItems: 'center', justifyContent: 'center' },
  saveButtonBusy: { opacity: 0.75 },
  saveButtonText: { fontFamily: 'Inter_800ExtraBold', color: palette.dark, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
