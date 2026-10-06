import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { COLORS, RADIUS } from '../../../constants/theme';
import { products } from '../../../utils/mockData';

export default function ProductManagement() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([...products]);

  const filtered = useMemo(() => items.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const remove = (id: string) => {
    const product = items.find(i => i.id === id);
    Alert.alert('Delete product', `Remove ${product?.name ?? 'this product'}?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  return (
    <OwnerLayout active="more" title="Product Management">
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#B1B1B1" />
          <TextInput value={query} onChangeText={setQuery} placeholder="search name, phone or Staff ID" placeholderTextColor="#A8A8A8" style={styles.searchInput} />
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/(owner)/products/add')}>
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
          <View style={styles.row}>
            <Image source={item.image} style={styles.foodImage} />
            <Pressable style={styles.info} onPress={() => router.push(`/(owner)/products/${item.id}`)}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.price}>$ {item.price.toFixed(2)}</Text>
            </Pressable>
            <Pressable onPress={() => remove(item.id)} hitSlop={8} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={18} color="#2A2A2A" />
            </Pressable>
            <Pressable onPress={() => router.push(`/(owner)/products/${item.id}`)} hitSlop={8} style={styles.iconButton}>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </Pressable>
          </View>
        )}
      />
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchBox: { flex: 1, height: 38, backgroundColor: '#FFFFFF', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  searchInput: { flex: 1, fontSize: 10, color: COLORS.text, marginLeft: 7 },
  addButton: { height: 38, minWidth: 66, backgroundColor: COLORS.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  addText: { fontSize: 12, fontWeight: '800', marginLeft: 3 },
  row: { height: 70, backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, marginBottom: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  foodImage: { width: 118, height: 70, resizeMode: 'cover' },
  info: { flex: 1, paddingHorizontal: 9 },
  name: { fontSize: 12, color: COLORS.text },
  price: { fontSize: 15, color: COLORS.text, fontWeight: '800', marginTop: 1 },
  iconButton: { width: 32, alignItems: 'center', justifyContent: 'center' },
});
