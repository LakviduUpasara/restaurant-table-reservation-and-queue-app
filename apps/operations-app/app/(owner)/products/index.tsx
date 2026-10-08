import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { SearchBar, StatusPill } from '../../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../../constants/theme';
import { productCategories, products } from '../../../utils/mockData';

export default function ProductManagement() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [items, setItems] = useState([...products]);
  const filtered = useMemo(() => items.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || p.category === category)), [items, query, category]);

  const remove = (id: string) => {
    const product = items.find(i => i.id === id);
    Alert.alert('Delete product', `Remove ${product?.name ?? 'this product'} from the menu?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== id)) },
    ]);
  };

  return (
    <OwnerLayout active="more" title="Product Management">
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.headingRow}>
              <View style={{ flex: 1 }}><Text style={styles.kicker}>MENU</Text><Text style={styles.title}>Your products</Text><Text style={styles.subtitle}>Keep dishes, categories and prices up to date.</Text></View>
              <Pressable onPress={() => router.push('/(owner)/products/add')} style={styles.add}><Ionicons name="add" size={18} color={COLORS.text} /><Text style={styles.addText}>Add</Text></Pressable>
            </View>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search product or category" />
            <FlatList data={['All', ...productCategories]} horizontal keyExtractor={x => x} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} renderItem={({ item }) => (
              <Pressable onPress={() => setCategory(item)} style={[styles.chip, item === category && styles.chipActive]}><Text style={[styles.chipText, item === category && styles.chipTextActive]}>{item}</Text></Pressable>
            )} />
            <Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(owner)/products/${item.id}`)} style={({ pressed }) => [styles.productCard, pressed && { transform: [{ scale: 0.99 }] }]}>
            <Image source={item.image} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.meta}><StatusPill label={item.category} tone="yellow" /><Text style={styles.price}>$ {item.price.toFixed(2)}</Text></View>
            </View>
            <Pressable onPress={(event) => { event.stopPropagation(); remove(item.id); }} hitSlop={8} style={styles.delete}><Ionicons name="trash-outline" size={16} color={COLORS.red} /></Pressable>
            <Ionicons name="chevron-forward" size={18} color="#90908B" />
          </Pressable>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No matching products</Text><Text style={styles.emptyText}>Try another search or category.</Text></View>}
      />
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 5, paddingBottom: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  kicker: { fontSize: 8.5, fontWeight: '900', color: COLORS.muted, letterSpacing: 1.1, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 10.5, color: COLORS.textSoft, marginTop: 3, lineHeight: 15 },
  add: { minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontSize: 10.5, fontWeight: '900' },
  chips: { gap: 7, paddingBottom: 9 },
  chip: { minHeight: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E4E4E1', justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  chipText: { fontSize: 9.5, color: '#6E6E69', fontWeight: '700' },
  chipTextActive: { color: COLORS.white },
  resultCount: { fontSize: 9.5, color: COLORS.muted, marginBottom: 8 },
  productCard: { minHeight: 78, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ECECE8', borderRadius: RADIUS.md, padding: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  image: { width: 77, height: 61, borderRadius: 12, backgroundColor: '#F2F2EF' },
  info: { flex: 1, marginLeft: 11, paddingRight: 6 },
  name: { fontSize: 12.5, fontWeight: '900', color: COLORS.text },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 7 },
  price: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  delete: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  empty: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  emptyText: { fontSize: 10, color: COLORS.muted, marginTop: 4 },
});
