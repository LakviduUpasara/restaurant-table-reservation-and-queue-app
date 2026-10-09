import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS, RADIUS } from '../../../constants/theme';
import { productCategories, getProduct, updateProduct, uploadProductImage, removeProduct } from '../../../services/product.service';
import { OwnerDeleteButton } from '../../../components/common/OwnerDeleteButton';
import { useAuth } from '../../../stores/auth.store';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function EditProduct() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const productQuery = useQuery({ queryKey: ['owner-product', productId], enabled: !!productId, queryFn: () => getProduct(productId) });
  const product = productQuery.data;
  const [name, setName] = useState(product?.name ?? ''); const [description, setDescription] = useState(product?.description ?? ''); const [category, setCategory] = useState(product?.category ?? 'Main Course'); const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2) : ''); const [image, setImage] = useState<any>(product?.image_url ? { uri: product.image_url } : null);

  useEffect(() => { if (product) { setName(product.name); setDescription(product.description ?? ''); setCategory(product.category); setPrice((product.price_cents / 100).toFixed(2)); setImage(product.image_url ? { uri: product.image_url } : null); setAvailable(product.available); setAsset(null); } }, [product]);
  if (productQuery.isLoading) return <OwnerLayout active="more" title="Edit Product" showBack onBack={() => router.back()}><Text>Loading product...</Text></OwnerLayout>;
  if (productQuery.error) return <OwnerLayout active="more" title="Edit Product" showBack onBack={() => router.back()}><Text onPress={() => void productQuery.refetch()}>{productQuery.error.message} - Tap to retry</Text></OwnerLayout>;
  if (!product) return <OwnerLayout active="more" title="Edit Product" showBack onBack={() => router.back()}><View style={styles.notFound}><Ionicons name="fast-food-outline" size={34} color={COLORS.muted} /><Text style={styles.notFoundTitle}>Product not found</Text><ActionButton title="Back to Products" onPress={() => router.replace('/(owner)/products')} style={{ marginTop: 13 }} /></View></OwnerLayout>;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo permission needed', 'Allow photo access to change the image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) { setAsset(result.assets[0]); setImage({ uri: result.assets[0].uri }); }
  };

  const save = async () => {
    if (!restaurantId) return Alert.alert('Restaurant unavailable', 'Your account is not assigned to a restaurant.');
    const numericPrice = Number(price);
    if (!name.trim() || !description.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return Alert.alert('Complete the form', 'Add a product name, description and valid price.');
    setBusy(true);
    try {
      const image_url = asset ? await uploadProductImage(restaurantId, asset) : product.image_url;
      const body = { name: name.trim(), description: description.trim(), category, price_cents: Math.round(numericPrice * 100), image_url, available };
      await updateProduct(product.id, body);
      await client.invalidateQueries({ queryKey: ['owner-products'] });
      await client.invalidateQueries({ queryKey: ['owner-product', productId] });
      Alert.alert('Product updated', 'Your menu item has been saved.', [{ text: 'Done', onPress: () => router.back() }]);
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  return (
    <OwnerLayout active="more" title="Edit Product" showBack onBack={() => router.back()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.introRow}><View><Text style={styles.kicker}>MENU ITEM</Text><Text style={styles.title}>Edit product</Text></View><View style={styles.priceBadge}><Text style={styles.priceBadgeText}>$ {Number(price || 0).toFixed(2)}</Text></View></View>
          <FigmaInput label="Product Name" value={name} onChangeText={setName} placeholder="Product Name" />
          <SelectField label="Category" value={category} onChange={setCategory} options={productCategories} />
          <FigmaInput label="Description" value={description} onChangeText={setDescription} placeholder="Description" multiline style={styles.textArea} />
          <FigmaInput label="Price" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><Text style={styles.label}>Available on menu</Text><Switch value={available} onValueChange={setAvailable} trackColor={{ false: '#D9D9D5', true: COLORS.primary }} /></View>
          <Text style={styles.label}>Product image</Text>
          <View style={styles.imageWrap}><Image source={image} style={styles.preview} resizeMode="cover" /><Pressable onPress={pickImage} style={styles.changeButton}><Ionicons name="camera-outline" size={15} color={COLORS.text} /><Text style={styles.changeText}>Change image</Text></Pressable></View>
          <ActionButton title="Save Changes" busy={busy} onPress={save} style={{ marginTop: 14 }} />
          <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
          <OwnerDeleteButton title="Delete Product" message={`Remove ${product.name} from the available menu?`} disabled={busy} onDelete={async () => { await removeProduct(product.id); await client.invalidateQueries({ queryKey: ['owner-products'] }); await client.invalidateQueries({ queryKey: ['owner-product', productId] }); router.replace('/(owner)/products'); }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 6, paddingBottom: 28 },
  introRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  kicker: { fontSize: 8.5, color: COLORS.muted, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text },
  priceBadge: { backgroundColor: COLORS.primarySoft, borderRadius: 14, paddingHorizontal: 10, minHeight: 34, justifyContent: 'center' },
  priceBadgeText: { fontSize: 12, fontWeight: '900' },
  textArea: { minHeight: 116, textAlignVertical: 'top', paddingTop: 12 },
  label: { fontSize: 11.5, fontWeight: '700', color: COLORS.text, marginBottom: 7 },
  imageWrap: { height: 182, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0DC', backgroundColor: '#F5F5F1', position: 'relative' },
  preview: { width: '100%', height: '100%' },
  changeButton: { position: 'absolute', right: 10, bottom: 10, minHeight: 36, paddingHorizontal: 11, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 5 },
  changeText: { fontSize: 9.5, fontWeight: '900' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  notFoundTitle: { fontSize: 17, fontWeight: '900', marginTop: 10, color: COLORS.text },
});
