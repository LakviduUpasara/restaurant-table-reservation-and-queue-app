import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { Card, SearchBar, StatusPill } from '../../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../../constants/theme';
import { staffUsers } from '../../../utils/mockData';

export default function UserManagement() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([...staffUsers]);
  const filtered = useMemo(() => items.filter(u => `${u.name} ${u.id} ${u.phone} ${u.role}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const remove = (id: string) => {
    const user = items.find(item => item.id === id);
    Alert.alert('Remove staff user', `Remove ${user?.name ?? 'this staff member'} from the restaurant?`, [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setItems(prev => prev.filter(item => item.id !== id)) },
    ]);
  };

  return (
    <OwnerLayout active="more" title="User Management">
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>TEAM</Text>
                <Text style={styles.title}>Manage your staff</Text>
                <Text style={styles.subtitle}>Add, edit and remove restaurant users.</Text>
              </View>
              <Pressable onPress={() => router.push('/(owner)/staff/add')} style={styles.addButton}>
                <Ionicons name="add" size={18} color={COLORS.text} />
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </View>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search name, phone or Staff ID" />
            <Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'staff member' : 'staff members'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <Pressable onPress={() => router.push(`/(owner)/staff/${item.id}`)} style={styles.userMain}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text></View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userMeta}>ID {item.id} · {item.phone}</Text>
                <StatusPill label={item.role} tone="yellow" />
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8B8B86" />
            </Pressable>
            <Pressable onPress={() => remove(item.id)} hitSlop={8} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={17} color={COLORS.red} />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No staff members match your search.</Text>}
        contentContainerStyle={styles.list}
      />
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 6, paddingBottom: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  kicker: { fontSize: 8.5, fontWeight: '900', color: COLORS.muted, letterSpacing: 1.1, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 10.5, color: COLORS.textSoft, marginTop: 3, lineHeight: 15 },
  addButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontSize: 10.5, fontWeight: '900', color: COLORS.text },
  resultCount: { fontSize: 9.5, color: COLORS.muted, marginBottom: 9, marginLeft: 2 },
  userCard: { padding: 11, position: 'relative' },
  userMain: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 28 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  userInfo: { flex: 1 },
  userName: { fontSize: 12.5, fontWeight: '900', color: COLORS.text },
  userMeta: { fontSize: 9.5, color: COLORS.muted, marginTop: 2, marginBottom: 6 },
  deleteButton: { position: 'absolute', right: 12, top: 13, width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', fontSize: 11, color: COLORS.muted, padding: 25 },
});
