import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../stores/auth.store';
import { StaffIcon, type StaffIconName } from './staff-icons';

type DrawerRoute = '/(staff)/dashboard' | '/(staff)/tables' | '/(staff)/reservations' | '/(staff)/queue' | '/(staff)/profile';
type DrawerIcon = 'dashboard' | 'tables' | 'reservations' | 'queue' | 'profile' | 'settings' | 'logout';

const drawerColors = {
  surface: '#FCFCFA',
  card: '#FFFFFF',
  text: '#17211D',
  muted: '#7E8782',
  border: '#E5E2DA',
  brand: '#E3AD18',
  brandDark: '#173E35',
  active: '#E7F0EC',
  danger: '#E4585D',
  dangerSoft: '#FFF0F0',
  overlay: 'rgba(17,28,24,0.66)',
  shadow: '#203129',
} as const;

const StaffDrawerContext = createContext({ openDrawer: () => {} });

export function useStaffDrawer() {
  return useContext(StaffDrawerContext);
}

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—';
}

function CloseIcon() {
  return <StaffIcon color={drawerColors.muted} name="close" size={22} />;
}

function DrawerIconView({ kind, color }: { kind: DrawerIcon; color: string }) {
  const names: Record<DrawerIcon, StaffIconName> = {
    dashboard: 'grid-outline',
    tables: 'restaurant-outline',
    reservations: 'calendar-outline',
    queue: 'filter-outline',
    profile: 'person-outline',
    settings: 'settings-outline',
    logout: 'log-out-outline',
  };
  return <StaffIcon color={color} name={names[kind]} size={22} />;
}

function DrawerItem({
  active,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: DrawerIcon;
  label: string;
  onPress: () => void;
}) {
  const color = active ? drawerColors.brandDark : drawerColors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.drawerItem, active && styles.drawerItemActive, pressed && styles.pressed]}
    >
      {active ? <View style={styles.activeIndicator} /> : null}
      <View style={[styles.drawerIconBox, active && styles.drawerIconBoxActive]}><DrawerIconView color={color} kind={icon} /></View>
      <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StaffDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const segments = useSegments();
  const profile = useAuth((state) => state.profile);
  const signOut = useAuth((state) => state.signOut);
  const translateX = useRef(new Animated.Value(-350)).current;
  const route = segments[1] ?? 'dashboard';
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Profile name unavailable';
  const roleLabel = profile?.role === 'OWNER' ? 'Owner' : profile?.role === 'STAFF' ? 'Staff' : 'Role unavailable';

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -350,
      duration: visible ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [translateX, visible]);

  function navigate(path: DrawerRoute) {
    onClose();
    setTimeout(() => router.replace(path as never), 0);
  }

  function confirmSignOut() {
    Alert.alert('Log out?', 'You will need to sign in again to access staff tools.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await signOut();
          router.replace('/login' as never);
        },
      },
    ]);
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close staff menu" onPress={onClose} style={styles.backdrop} />
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <SafeAreaView edges={['top', 'bottom']} style={styles.drawerSafeArea}>
            <View style={styles.drawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}><Text style={styles.brandInitial}>D</Text></View>
                <Text style={styles.brandText}>Dine</Text>
              </View>
              <Pressable accessibilityLabel="Close staff menu" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <CloseIcon />
              </Pressable>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.full_name)}</Text></View>
              <View style={styles.profileCopy}>
                <Text numberOfLines={1} style={styles.profileName}>{firstName}</Text>
                <Text style={styles.profileRole}>{roleLabel}</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.navigation}>
              <DrawerItem active={route === 'dashboard'} icon="dashboard" label="Dashboard" onPress={() => navigate('/(staff)/dashboard')} />
              <DrawerItem active={route === 'tables'} icon="tables" label="Table Status" onPress={() => navigate('/(staff)/tables')} />
              <DrawerItem active={route === 'reservations'} icon="reservations" label="Reservations" onPress={() => navigate('/(staff)/reservations')} />
              <DrawerItem active={route === 'queue'} icon="queue" label="Virtual Queue" onPress={() => navigate('/(staff)/queue')} />
              <DrawerItem active={route === 'profile'} icon="profile" label="Profile" onPress={() => navigate('/(staff)/profile')} />
              <DrawerItem
                icon="settings"
                label="Settings"
                onPress={() => Alert.alert('Settings', 'Staff settings are managed by the restaurant owner.')}
              />
            </View>

            <View style={styles.logoutArea}>
              <View style={styles.divider} />
              <Pressable accessibilityRole="button" onPress={confirmSignOut} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
                <DrawerIconView color={drawerColors.danger} kind="logout" />
                <Text style={styles.logoutText}>Log Out</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function StaffDrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <StaffDrawerContext.Provider value={{ openDrawer: () => setVisible(true) }}>
      {children}
      <StaffDrawer onClose={() => setVisible(false)} visible={visible} />
    </StaffDrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, flexDirection: 'row' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: drawerColors.overlay },
  drawer: { width: 344, maxWidth: '88%', height: '100%', borderTopRightRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden', backgroundColor: drawerColors.surface, shadowColor: '#000000', shadowOffset: { width: 12, height: 0 }, shadowOpacity: 0.24, shadowRadius: 26, elevation: 24 },
  drawerSafeArea: { flex: 1, backgroundColor: drawerColors.surface, paddingHorizontal: 20 },
  drawerHeader: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: drawerColors.brand, shadowColor: drawerColors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  brandInitial: { color: drawerColors.text, fontSize: 18, fontWeight: '900' },
  brandText: { marginLeft: 11, color: drawerColors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: drawerColors.border, backgroundColor: drawerColors.card },
  closeIcon: { width: 15, height: 15 },
  closeLine: { position: 'absolute', top: 6.5, left: 2, width: 11, height: 1.7, backgroundColor: drawerColors.muted },
  closeLineOne: { transform: [{ rotate: '45deg' }] },
  closeLineTwo: { transform: [{ rotate: '-45deg' }] },
  profileCard: { minHeight: 96, flexDirection: 'row', alignItems: 'center', marginTop: 2, borderRadius: 22, borderWidth: 1, borderColor: drawerColors.border, paddingHorizontal: 16, backgroundColor: drawerColors.card, shadowColor: drawerColors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 },
  avatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, borderWidth: 3, borderColor: '#F2C79E', backgroundColor: '#633719' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  profileCopy: { flex: 1, marginLeft: 14 },
  profileName: { color: drawerColors.text, fontSize: 18, fontWeight: '800' },
  profileRole: { marginTop: 4, color: drawerColors.muted, fontSize: 13, fontWeight: '500' },
  divider: { height: 1, marginTop: 24, backgroundColor: drawerColors.border },
  navigation: { marginTop: 19, gap: 5 },
  drawerItem: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderRadius: 17, paddingHorizontal: 10, overflow: 'hidden' },
  drawerItemActive: { backgroundColor: drawerColors.active },
  activeIndicator: { position: 'absolute', left: 0, width: 4, height: 24, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: drawerColors.brand },
  drawerIconBox: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  drawerIconBoxActive: { backgroundColor: drawerColors.card },
  drawerItemText: { marginLeft: 12, color: drawerColors.text, fontSize: 15, fontWeight: '600' },
  drawerItemTextActive: { color: drawerColors.brandDark, fontWeight: '800' },
  gridIcon: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gridSquare: { width: 7, height: 7, borderRadius: 1, borderWidth: 2 },
  tableIcon: { width: 18, height: 18, borderRadius: 2, borderWidth: 2 },
  iconLine: { position: 'absolute' },
  tableVertical: { top: 0, bottom: 0, left: 7, width: 1.5 },
  tableHorizontalOne: { top: 5, left: 0, right: 0, height: 1.5 },
  tableHorizontalTwo: { top: 11, left: 0, right: 0, height: 1.5 },
  calendarIcon: { width: 18, height: 17, borderRadius: 2, borderWidth: 2, marginTop: 1 },
  calendarTop: { position: 'absolute', top: 4, left: 0, right: 0, height: 2 },
  calendarRings: { position: 'absolute', top: -4, left: 3, right: 3, flexDirection: 'row', justifyContent: 'space-between' },
  ring: { width: 2, height: 6, borderRadius: 1 },
  queueIcon: { width: 20, height: 17, alignItems: 'center', justifyContent: 'space-between' },
  queueLine: { height: 2, borderRadius: 1 },
  profileIcon: { width: 19, height: 20 },
  profileHead: { position: 'absolute', top: 0, left: 6, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  profileBody: { position: 'absolute', left: 2, bottom: 0, width: 16, height: 10, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 2, borderBottomWidth: 0 },
  settingsIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 3 },
  settingsCenter: { width: 5, height: 5, borderRadius: 3, borderWidth: 1.5 },
  logoutArea: { marginTop: 'auto', paddingBottom: 4 },
  logoutButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6, borderRadius: 17, backgroundColor: drawerColors.dangerSoft, paddingHorizontal: 17 },
  logoutText: { marginLeft: 16, color: drawerColors.danger, fontSize: 15, fontWeight: '800' },
  logoutIcon: { width: 20, height: 20 },
  logoutDoor: { position: 'absolute', top: 2, left: 0, width: 10, height: 16, borderLeftWidth: 2, borderTopWidth: 2, borderBottomWidth: 2 },
  logoutArrow: { position: 'absolute', top: 6, right: 0, width: 7, height: 7, borderTopWidth: 2, borderRightWidth: 2, transform: [{ rotate: '45deg' }] },
  logoutShaft: { position: 'absolute', top: 9, left: 7, width: 11, height: 2 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
});
