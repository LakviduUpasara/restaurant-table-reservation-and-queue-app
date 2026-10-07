import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { SelectField } from '../../../components/common/SelectField';
import { COLORS, RADIUS } from '../../../constants/theme';
import { productCategories, products } from '../../../utils/mockData';

export default function AddProduct() {
  const router = useRouter();
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState('Main Course'); const [price, setPrice] = useState('');
  const [image, setImage] = useState<any>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo permission needed', 'Allow photo access to choose a product image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) setImage({ uri: result.assets[0].uri });
  };

  const save = () => {
    const numericPrice = Number(price);
    if (!name.trim() || !description.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) return Alert.alert('Complete the form', 'Add a product name, description and valid price.');
    products.unshift({ id: `P-${Date.now()}`, name: name.trim(), description: description.trim(), category, price: numericPrice, image: image ?? require('../../../assets/images/product-chicken.png') });
    Alert.alert('Product added', `${name.trim()} is now in the menu.`, [{ text: 'Done', onPress: () => router.replace('/(owner)/products') }]);
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

          <Text style={styles.label}>Product image</Text>
          <Pressable onPress={pickImage} style={({ pressed }) => [styles.imageBox, pressed && { opacity: 0.92 }]}>
            {image ? <Image source={image} style={styles.preview} resizeMode="cover" /> : <><View style={styles.placeholderIcon}><Ionicons name="image-outline" size={27} color={COLORS.primaryDark} /></View><Text style={styles.imageTitle}>Add a food image</Text><Text style={styles.imageSub}>Use a clear 4:3 photo for the best result</Text></>}
            <View style={styles.uploadBadge}><Ionicons name="cloud-upload-outline" size={18} color={COLORS.text} /></View>
          </Pressable>
          <ActionButton title="Save Product" onPress={save} style={{ marginTop: 14 }} />
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
