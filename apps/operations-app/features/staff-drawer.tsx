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

type DrawerRoute = '/(staff)/dashboard' | '/(staff)/tables' | '/(staff)/reservations' | '/(staff)/queue' | '/(staff)/profile';
type DrawerIcon = 'dashboard' | 'tables' | 'reservations' | 'queue' | 'profile' | 'settings' | 'logout';

const drawerColors = {
  surface: '#FBFBFD',
  text: '#303136',
  muted: '#747B88',
  border: '#E0E3E8',
  brand: '#D79D00',
  danger: '#FF3F46',
  overlay: 'rgba(0,0,0,0.72)',
} as const;

const StaffDrawerContext = createContext({ openDrawer: () => {} });

export function useStaffDrawer() {
  return useContext(StaffDrawerContext);
}

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'DF';
}

function CloseIcon() {
  return (
    <View accessibilityElementsHidden style={styles.closeIcon}>
      <View style={[styles.closeLine, styles.closeLineOne]} />
      <View style={[styles.closeLine, styles.closeLineTwo]} />
    </View>
  );
}

function DrawerIconView({ kind, color }: { kind: DrawerIcon; color: string }) {
  if (kind === 'dashboard') {
    return <View style={styles.gridIcon}>{[0, 1, 2, 3].map((item) => <View key={item} style={[styles.gridSquare, { borderColor: color }]} />)}</View>;
  }
  if (kind === 'tables') {
    return (
      <View style={[styles.tableIcon, { borderColor: color }]}>
        <View style={[styles.iconLine, styles.tableVertical, { backgroundColor: color }]} />
        <View style={[styles.iconLine, styles.tableHorizontalOne, { backgroundColor: color }]} />
        <View style={[styles.iconLine, styles.tableHorizontalTwo, { backgroundColor: color }]} />
      </View>
    );
  }
  if (kind === 'reservations') {
    return (
      <View style={[styles.calendarIcon, { borderColor: color }]}>
        <View style={[styles.calendarTop, { backgroundColor: color }]} />
        <View style={styles.calendarRings}><View style={[styles.ring, { backgroundColor: color }]} /><View style={[styles.ring, { backgroundColor: color }]} /></View>
      </View>
    );
  }
  if (kind === 'queue') {
    return <View style={styles.queueIcon}><View style={[styles.queueLine, { width: 20, backgroundColor: color }]} /><View style={[styles.queueLine, { width: 13, backgroundColor: color }]} /><View style={[styles.queueLine, { width: 6, backgroundColor: color }]} /></View>;
  }
  if (kind === 'profile') {
    return (
      <View style={styles.profileIcon}>
        <View style={[styles.profileHead, { borderColor: color }]} />
        <View style={[styles.profileBody, { borderColor: color }]} />
      </View>
    );
  }
  if (kind === 'settings') {
    return (
      <View style={[styles.settingsIcon, { borderColor: color }]}>
        <View style={[styles.settingsCenter, { borderColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.logoutIcon}>
      <View style={[styles.logoutDoor, { borderColor: color }]} />
      <View style={[styles.logoutArrow, { borderColor: color }]} />
      <View style={[styles.logoutShaft, { backgroundColor: color }]} />
    </View>
  );
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
  const color = active ? drawerColors.brand : drawerColors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.drawerItem, active && styles.drawerItemActive, pressed && styles.pressed]}
    >
      <View style={styles.drawerIconBox}><DrawerIconView color={color} kind={icon} /></View>
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
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Team member';

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
                <View style={styles.brandMark} />
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
                <Text style={styles.profileRole}>Staff · Waiter</Text>
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
  drawer: { width: 330, maxWidth: '86%', height: '100%', borderTopRightRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', backgroundColor: drawerColors.surface },
  drawerSafeArea: { flex: 1, backgroundColor: drawerColors.surface, paddingHorizontal: 16 },
  drawerHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 28, height: 28, borderRadius: 14, backgroundColor: drawerColors.brand },
  brandText: { marginLeft: 8, color: drawerColors.text, fontSize: 20, fontWeight: '700' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, borderWidth: 1, borderColor: drawerColors.border, backgroundColor: drawerColors.surface },
  closeIcon: { width: 15, height: 15 },
  closeLine: { position: 'absolute', top: 6.5, left: 2, width: 11, height: 1.7, backgroundColor: drawerColors.muted },
  closeLineOne: { transform: [{ rotate: '45deg' }] },
  closeLineTwo: { transform: [{ rotate: '-45deg' }] },
  profileCard: { minHeight: 80, flexDirection: 'row', alignItems: 'center', marginTop: 1, borderRadius: 17, borderWidth: 1, borderColor: drawerColors.border, paddingHorizontal: 16, backgroundColor: drawerColors.surface },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#633719' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  profileCopy: { flex: 1, marginLeft: 15 },
  profileName: { color: drawerColors.text, fontSize: 18, fontWeight: '700' },
  profileRole: { marginTop: 3, color: drawerColors.muted, fontSize: 14 },
  divider: { height: 1, marginTop: 23, backgroundColor: drawerColors.border },
  navigation: { marginTop: 20, gap: 2 },
  drawerItem: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 11, paddingHorizontal: 16 },
  drawerItemActive: { backgroundColor: '#FFF8E1' },
  drawerIconBox: { width: 24, alignItems: 'center' },
  drawerItemText: { marginLeft: 16, color: drawerColors.text, fontSize: 16, fontWeight: '500' },
  drawerItemTextActive: { color: drawerColors.brand, fontWeight: '700' },
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
  logoutArea: { marginTop: 'auto' },
  logoutButton: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17 },
  logoutText: { marginLeft: 18, color: drawerColors.danger, fontSize: 16, fontWeight: '500' },
  logoutIcon: { width: 20, height: 20 },
  logoutDoor: { position: 'absolute', top: 2, left: 0, width: 10, height: 16, borderLeftWidth: 2, borderTopWidth: 2, borderBottomWidth: 2 },
  logoutArrow: { position: 'absolute', top: 6, right: 0, width: 7, height: 7, borderTopWidth: 2, borderRightWidth: 2, transform: [{ rotate: '45deg' }] },
  logoutShaft: { position: 'absolute', top: 9, left: 7, width: 11, height: 2 },
  pressed: { opacity: 0.62 },
});
