import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { Card, SearchBar, StatusPill } from '../../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../../constants/theme';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../stores/auth.store';
import { getStaff, StaffProfile } from '../../../services/staff.service';

export default function UserManagement() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const list = useQuery({ queryKey: ['owner-staff', restaurantId], enabled: !!restaurantId, queryFn: () => getStaff(restaurantId!) });
  const items: StaffProfile[] = list.data ?? [];
  useFocusEffect(useCallback(() => { if (restaurantId) void list.refetch(); }, [restaurantId, list.refetch]));
  const filtered = useMemo(() => items.filter(u => `${u.full_name} ${u.staff_id ?? u.id} ${u.phone} ${u.job_role}`.toLowerCase().includes(query.toLowerCase())), [items, query]);


  return (
    <OwnerLayout active="more" title="User Management">
      <FlatList
        refreshing={list.isFetching}
        onRefresh={() => void list.refetch()}
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
            {list.error ? <Text style={{ color: COLORS.red }} onPress={() => void list.refetch()}>{list.error.message} - Tap to retry</Text> : null}
            <Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'staff member' : 'staff members'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <Pressable onPress={() => router.push(`/(owner)/staff/${item.id}`)} style={styles.userMain}>
              <View style={styles.avatar}>{item.photo_url ? <Image key={item.photo_url} source={{ uri: item.photo_url }} style={{ width: 42, height: 42, borderRadius: 14 }} /> : <Text style={styles.avatarText}>{item.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text>}</View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.full_name}</Text>
                <Text style={styles.userMeta}>ID {item.staff_id ?? item.id} · {item.phone}</Text>
                <StatusPill label={item.job_role ?? item.role} tone="yellow" />
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8B8B86" />
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
  userMain: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 0 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  userInfo: { flex: 1 },
  userName: { fontSize: 12.5, fontWeight: '900', color: COLORS.text },
  userMeta: { fontSize: 9.5, color: COLORS.muted, marginTop: 2, marginBottom: 6 },
  deleteButton: { position: 'absolute', right: 12, top: 13, width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', fontSize: 11, color: COLORS.muted, padding: 25 },
});
