import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS, RADIUS } from '../../../constants/theme';
import { productCategories, createProduct, uploadProductImage } from '../../../services/product.service';
import { useAuth } from '../../../stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';

export default function AddProduct() {
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState('Main Course'); const [price, setPrice] = useState('');
  const [image, setImage] = useState<any>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo permission needed', 'Allow photo access to choose a product image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) { setAsset(result.assets[0]); setImage({ uri: result.assets[0].uri }); }
  };

  const save = async () => {
    if (!restaurantId) return Alert.alert('Restaurant unavailable', 'Your account is not assigned to a restaurant.');
    const numericPrice = Number(price);
    if (!name.trim() || !description.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return Alert.alert('Complete the form', 'Add a product name, description and valid price.');
    setBusy(true);
    try {
      const image_url = asset ? await uploadProductImage(restaurantId, asset) : null;
      const body = { name: name.trim(), description: description.trim(), category, price_cents: Math.round(numericPrice * 100), image_url, available };
      await createProduct({ ...body, restaurant_id: restaurantId });
      await client.invalidateQueries({ queryKey: ['owner-products'] });

      Alert.alert('Product added', 'Your menu item has been saved.', [{ text: 'Done', onPress: () => router.replace('/(owner)/products') }]);
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  return (
    <OwnerLayout active="more" title="Add Product" showBack onBack={() => router.back()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}><Text style={styles.title}>Create a menu item</Text><Text style={styles.subtitle}>Add clear details so customers and staff know exactly what to expect.</Text></View>
          <FigmaInput label="Product Name" value={name} onChangeText={setName} placeholder="e.g. Chicken Alfredo" />
          <SelectField label="Category" value={category} onChange={setCategory} options={productCategories} />
          <FigmaInput label="Description" value={description} onChangeText={setDescription} placeholder="Describe the dish" multiline style={styles.textArea} />
          <FigmaInput label="Price" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><Text style={styles.label}>Available on menu</Text><Switch value={available} onValueChange={setAvailable} trackColor={{ false: '#D9D9D5', true: COLORS.primary }} /></View>
          <Text style={styles.label}>Product image</Text>
          <Pressable onPress={pickImage} style={({ pressed }) => [styles.imageBox, pressed && { opacity: 0.92 }]}>
            {image ? <Image source={image} style={styles.preview} resizeMode="cover" /> : <><View style={styles.placeholderIcon}><Ionicons name="image-outline" size={27} color={COLORS.primaryDark} /></View><Text style={styles.imageTitle}>Add a food image</Text><Text style={styles.imageSub}>Use a clear 4:3 photo for the best result</Text></>}
            <View style={styles.uploadBadge}><Ionicons name="cloud-upload-outline" size={18} color={COLORS.text} /></View>
          </Pressable>
          <ActionButton title="Save Product" busy={busy} onPress={save} style={{ marginTop: 14 }} />
          <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 6, paddingBottom: 28 },
  intro: { marginBottom: 17 },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 10.5, color: COLORS.textSoft, marginTop: 4, lineHeight: 15 },
  textArea: { minHeight: 116, textAlignVertical: 'top', paddingTop: 12 },
  label: { fontSize: 11.5, fontWeight: '700', color: COLORS.text, marginBottom: 7 },
  imageBox: { minHeight: 174, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#DADAD6', borderStyle: 'dashed', backgroundColor: '#FBFBF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  preview: { width: '100%', height: '100%', minHeight: 174 },
  placeholderIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  imageTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  imageSub: { fontSize: 9.5, color: COLORS.muted, marginTop: 4 },
  uploadBadge: { position: 'absolute', right: 10, bottom: 10, width: 36, height: 36, borderRadius: 11, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E2DE', alignItems: 'center', justifyContent: 'center' },
});
