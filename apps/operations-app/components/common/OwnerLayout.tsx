import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { Platform } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { OwnerBottomNav } from './OwnerBottomNav';
import { SideDrawer } from './SideDrawer';

type Props = {
  children: ReactNode;
  active: 'dashboard' | 'tables' | 'reservations' | 'queue' | 'more';
  title?: string;
  showMenu?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  scroll?: boolean;
};

export function OwnerLayout({ children, active, title, showMenu = true, showBack = false, onBack, right }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
        <View style={styles.content}>
          {title ? (
            <View style={styles.header}>
              <Pressable style={styles.headerButton} onPress={showBack ? onBack : () => setDrawerOpen(true)}>
                <Ionicons name={showBack ? 'chevron-back' : 'menu-outline'} size={24} color={COLORS.text} />
              </Pressable>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.right}>{right}</View>
            </View>
          ) : showMenu ? (
            <Pressable style={styles.menuOnly} onPress={() => setDrawerOpen(true)}>
              <Ionicons name="menu-outline" size={24} color={COLORS.text} />
            </Pressable>
          ) : null}
          {children}
        </View>
        <OwnerBottomNav active={active} onMore={() => setDrawerOpen(true)} />
        <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  root: { flex: 1 },
  webRoot: { width: 375, maxWidth: '100%', alignSelf: 'center' },
  content: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 18 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 34, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', color: COLORS.text, flex: 1 },
  right: { width: 58, alignItems: 'flex-end' },
  menuOnly: { width: 36, height: 48, justifyContent: 'center' },
});
