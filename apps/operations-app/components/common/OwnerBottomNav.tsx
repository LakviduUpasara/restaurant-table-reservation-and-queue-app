import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';

type Tab = 'dashboard' | 'tables' | 'reservations' | 'queue' | 'more';

type Props = { active: Tab; onMore?: () => void };

const items: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'tables', label: 'Tables', icon: 'grid' },
  { key: 'reservations', label: 'Reservations', icon: 'calendar-outline' },
  { key: 'queue', label: 'Queue', icon: 'filter-outline' },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' },
];

export function OwnerBottomNav({ active, onMore }: Props) {
  const router = useRouter();

  const navigate = (key: Tab) => {
    if (key === 'more') {
      onMore?.();
      return;
    }
    if (key === 'dashboard') router.push('/(owner)/dashboard');
    if (key === 'tables') router.push('/(owner)/tables');
    if (key === 'reservations') router.push('/(owner)/reservations');
    if (key === 'queue') router.push('/(owner)/queue');
  };

  return (
    <View style={styles.bar}>
      {items.map(item => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} onPress={() => navigate(item.key)} style={styles.item}>
            <Ionicons name={item.icon} size={19} color={isActive ? COLORS.primary : '#A8A8A8'} />
            <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 4,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 9, color: '#A3A3A3' },
  activeLabel: { color: COLORS.primary, fontWeight: '700' },
});
