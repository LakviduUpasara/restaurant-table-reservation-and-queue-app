import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS } from '../../../constants/theme';
import { productCategories, products } from '../../../utils/mockData';

export default function EditProduct() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const product = useMemo(() => products.find(p => p.id === productId), [productId]);
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Main Course');
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : '');
  const [image, setImage] = useState<any>(product?.image);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to change the product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setImage({ uri: result.assets[0].uri });
  };

  const save = () => {
    if (!product) return;
    const numericPrice = Number(price);
    if (!name.trim() || !description.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert('Missing details', 'Please enter the product name, description and a valid price.');
      return;
    }
    product.name = name.trim();
    product.description = description.trim();
    product.category = category;
    product.price = numericPrice;
    product.image = image;
    Alert.alert('Saved', 'Product details were updated.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  if (!product) {
    return (
      <OwnerLayout active="more" title="Edit Product" showBack onBack={() => router.back()}>
        <View style={styles.empty}><Text style={styles.emptyTitle}>Product not found</Text><ActionButton title="Back" onPress={() => router.back()} /></View>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout active="more" title="Edit Product" showBack onBack={() => router.back()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <FigmaInput label="Product Name" value={name} onChangeText={setName} placeholder="Product Name" />
        <SelectField label="Category" value={category} onChange={setCategory} options={productCategories} />
        <FigmaInput label="Description" value={description} onChangeText={setDescription} placeholder="Description" multiline style={styles.textArea} />
        <FigmaInput label="Price" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />

        <Text style={styles.imageLabel}>Image</Text>
        <View style={styles.imageBox}>
          <Image source={image} style={styles.preview} resizeMode="cover" />
          <View style={styles.imageControls}>
            <Pressable onPress={pickImage} style={styles.changeButton}><Text style={styles.changeText}>Change</Text></Pressable>
            <Pressable onPress={pickImage} style={styles.uploadButton}><Ionicons name="cloud-upload-outline" size={24} color={COLORS.text} /></Pressable>
          </View>
        </View>

        <ActionButton title="Save" onPress={save} style={{ marginTop: 10 }} />
        <ActionButton title="Cancel" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </ScrollView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 7, paddingBottom: 25 },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 10 },
  imageLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, color: COLORS.text },
  imageBox: { height: 145, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  preview: { width: '100%', height: '100%' },
  imageControls: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeButton: { backgroundColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 13 },
  changeText: { fontSize: 10, fontWeight: '800' },
  uploadButton: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
});
