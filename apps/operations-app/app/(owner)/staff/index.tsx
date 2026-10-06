import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { COLORS, RADIUS } from '../../../constants/theme';
import { staffUsers } from '../../../utils/mockData';

export default function UserManagement() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([...staffUsers]);

  const filtered = useMemo(() => items.filter(u => `${u.name} ${u.phone} ${u.id}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const remove = (id: string) => {
    const user = items.find(i => i.id === id);
    Alert.alert('Delete user', `Remove ${user?.name ?? 'this user'}?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  return (
    <OwnerLayout active="more" title="User Management">
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#B1B1B1" />
          <TextInput value={query} onChangeText={setQuery} placeholder="search name, phone or Staff ID" placeholderTextColor="#A8A8A8" style={styles.searchInput} />
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/(owner)/staff/add')}>
          <Ionicons name="add" size={18} color={COLORS.text} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 18 }}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <Pressable style={styles.userInfo} onPress={() => router.push(`/(owner)/staff/${item.id}`)}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userMeta}>{item.id} · {item.role}</Text>
            </Pressable>
            <Pressable onPress={() => remove(item.id)} hitSlop={8} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={18} color="#2A2A2A" />
            </Pressable>
            <Pressable onPress={() => router.push(`/(owner)/staff/${item.id}`)} hitSlop={8} style={styles.iconButton}>
              <Ionicons name="chevron-forward" size={19} color="#555" />
            </Pressable>
          </View>
        )}
      />
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  searchBox: { flex: 1, height: 38, backgroundColor: '#FFFFFF', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  searchInput: { flex: 1, fontSize: 10, color: COLORS.text, marginLeft: 7 },
  addButton: { height: 38, minWidth: 66, backgroundColor: COLORS.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  addText: { fontSize: 12, fontWeight: '800', marginLeft: 3 },
  userRow: { backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 48, marginBottom: 7, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  userInfo: { flex: 1, paddingVertical: 8 },
  userName: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  userMeta: { fontSize: 8.5, color: '#777', marginTop: 3 },
  iconButton: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
});
