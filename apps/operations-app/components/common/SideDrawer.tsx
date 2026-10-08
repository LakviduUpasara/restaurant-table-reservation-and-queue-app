import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { owner } from '../../utils/mockData';

type Props = { visible: boolean; onClose: () => void };

type Item = { label: string; icon: keyof typeof Ionicons.glyphMap; route?: string };

const menuItems: Item[] = [
  { label: 'Dashboard', icon: 'grid-outline', route: '/(owner)/dashboard' },
  { label: 'Reservations', icon: 'calendar-outline', route: '/(owner)/reservations' },
  { label: 'Table Status', icon: 'grid', route: '/(owner)/tables' },
  { label: 'Virtual Queue', icon: 'filter-outline', route: '/(owner)/queue' },
  { label: 'User Management', icon: 'people-outline', route: '/(owner)/staff' },
  { label: 'Product Management', icon: 'fast-food-outline', route: '/(owner)/products' },
  { label: 'Booking & Availability', icon: 'time-outline', route: '/(owner)/settings/booking-settings' },
  { label: 'Generate Report', icon: 'document-text-outline', route: '/(owner)/reports' },
  { label: 'Profile', icon: 'person-outline', route: '/(owner)/profile' },
  { label: 'Settings', icon: 'settings-outline', route: '/(owner)/settings/restaurant' },
];

export function SideDrawer({ visible, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>Dine</Text>
            <Pressable style={styles.close} onPress={onClose}>
              <Ionicons name="close" size={17} color="#838383" />
            </Pressable>
          </View>

          <View style={styles.userCard}>
            <Image source={require('../../assets/images/owner-avatar.png')} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{owner.dashboardName}</Text>
              <Text style={styles.role}>{owner.role}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {menuItems.map(item => (
              <Pressable
                key={item.label}
                style={[styles.menuItem, ((item.route && pathname === item.route) || (item.label === 'Dashboard' && pathname.endsWith('/dashboard'))) && styles.activeItem]}
                onPress={() => {
                  onClose();
                  if (item.route) router.push(item.route as any);
                }}
              >
                <Ionicons name={item.icon} size={19} color={((item.route && pathname === item.route) || (item.label === 'Dashboard' && pathname.endsWith('/dashboard'))) ? COLORS.primary : '#68707A'} />
                <Text style={[styles.menuText, (((item.route && pathname === item.route) || (item.label === 'Dashboard' && pathname.endsWith('/dashboard'))) && styles.activeText)]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={styles.logout}
            onPress={() => {
              onClose();
              router.replace('/(auth)/login');
            }}
          >
            <Ionicons name="log-out-outline" size={19} color="#DF5858" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.22)' },
  drawer: { width: '82%', backgroundColor: '#FFFFFF', paddingTop: 18, paddingHorizontal: 15, paddingBottom: 12, borderTopRightRadius: 26, borderBottomRightRadius: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, marginBottom: 17 },
  brandDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, marginRight: 7 },
  brand: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },
  close: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F4' },
  userCard: { borderWidth: 1, borderColor: '#E7E7E7', borderRadius: RADIUS.lg, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  role: { fontSize: 10, color: '#7B7B7B', marginTop: 2 },
  menuItem: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  activeItem: { backgroundColor: '#FFFBEF' },
  menuText: { marginLeft: 12, fontSize: 12.5, color: COLORS.text },
  activeText: { color: COLORS.primary, fontWeight: '700' },
  logout: { borderTopWidth: 1, borderTopColor: '#ECECEC', paddingTop: 16, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, marginTop: 8 },
  logoutText: { marginLeft: 12, fontSize: 12.5, color: '#D95454', fontWeight: '700' },
});
