import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { ActionButton } from './ActionButton';

type Props = { asset: ImagePicker.ImagePickerAsset | null; onChange: (asset: ImagePicker.ImagePickerAsset | null) => void; disabled?: boolean };

export function OwnerPhotoPicker({ asset, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const choose = async (source: 'camera' | 'gallery') => {
    setOpen(false);
    try {
      const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Photo permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo library'} access to select a photo.`);
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) onChange(result.assets[0]);
    } catch (error) { Alert.alert('Could not select photo', error instanceof Error ? error.message : String(error)); }
  };
  return <View style={styles.wrap}>
    <Text style={styles.label}>User photo (optional)</Text>
    <Pressable disabled={disabled} onPress={() => setOpen(true)} style={styles.preview}>
      {asset ? <Image source={{ uri: asset.uri }} style={styles.image} /> : <Ionicons name="person-outline" size={35} color={COLORS.primaryDark} />}
      <Text style={styles.hint}>{asset ? 'Change photo' : 'Choose a photo'}</Text>
    </Pressable>
    {asset ? <Pressable disabled={disabled} onPress={() => onChange(null)}><Text style={styles.remove}>Remove photo</Text></Pressable> : null}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.sheet}>
        <Text style={styles.heading}>Choose user photo</Text>
        <ActionButton title="Take photo" onPress={() => void choose('camera')} icon={<Ionicons name="camera-outline" size={18} color={COLORS.text} />} />
        <ActionButton title="Choose from gallery" variant="outline" onPress={() => void choose('gallery')} style={{ marginTop: 10 }} icon={<Ionicons name="images-outline" size={18} color={COLORS.text} />} />
        <ActionButton title="Cancel" variant="soft" onPress={() => setOpen(false)} style={{ marginTop: 10 }} />
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 }, label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  preview: { backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md, padding: 14, alignItems: 'center' },
  image: { width: 84, height: 84, borderRadius: 42 }, hint: { fontSize: 11, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  remove: { color: COLORS.red, fontSize: 10, textAlign: 'center', marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18, maxWidth: 390, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 16 },
});
