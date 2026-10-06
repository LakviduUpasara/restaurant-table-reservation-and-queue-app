import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useRestaurant } from './common';

const colors = {
  background: '#F5F3EE',
  surface: '#FFFFFF',
  text: '#17211D',
  secondary: '#7E8782',
  border: '#DEDCD4',
  control: '#E9E8E3',
  active: '#E3AD18',
  overlay: 'rgba(20,30,26,0.48)',
  error: '#C62828',
  shadow: '#203129',
} as const;

const waitOptions = [5, 10, 15, 20, 30, 45, 60];

function waitLabel(minutes: number) {
  if (minutes <= 5) return 'About 5 minutes';
  if (minutes >= 60) return '60+ minutes';
  return `${minutes} – ${minutes + 5} minutes`;
}

function BackIcon() {
  return <View accessibilityElementsHidden style={styles.backIcon} />;
}

function ChevronDown() {
  return <View accessibilityElementsHidden style={styles.chevronDown} />;
}

export function StaffWalkIn() {
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useRestaurant();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState(4);
  const [waitMinutes, setWaitMinutes] = useState(15);
  const [specialRequest, setSpecialRequest] = useState('');
  const [waitPickerOpen, setWaitPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const nameError = submitted && !trimmedName ? 'Customer name is required.' : null;
  const canSubmit = !!restaurantId && !!trimmedName && !busy;

  async function addToQueue() {
    setSubmitted(true);
    if (!restaurantId || !trimmedName || busy) return;

    setBusy(true);
    try {
      await api('/queue', {
        method: 'POST',
        body: {
          restaurant_id: restaurantId,
          customer_name: trimmedName,
          phone: phone.trim() || undefined,
          party_size: guests,
          estimated_wait_minutes: waitMinutes,
          special_request: specialRequest.trim() || undefined,
        },
      });
      await client.invalidateQueries({ queryKey: ['queue', restaurantId] });
      router.replace('/(staff)/queue' as never);
    } catch (error) {
      Alert.alert('Could not add walk-in', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWidth, width < 400 && styles.contentWidthCompact]}>
            <View style={styles.header}>
              <Pressable
                accessibilityLabel="Back to virtual queue"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <BackIcon />
              </Pressable>
              <Text style={styles.title}>Add Walk-in Customer</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Customer name</Text>
                <TextInput
                  accessibilityLabel="Customer name"
                  autoCapitalize="words"
                  maxLength={100}
                  onChangeText={setName}
                  placeholder="Enter customer name"
                  placeholderTextColor={colors.secondary}
                  returnKeyType="next"
                  style={[styles.input, nameError && styles.inputError]}
                  value={name}
                />
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  accessibilityLabel="Phone number"
                  keyboardType="phone-pad"
                  maxLength={30}
                  onChangeText={setPhone}
                  placeholder="07X XXX XXXX"
                  placeholderTextColor={colors.secondary}
                  style={styles.input}
                  value={phone}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Number of Guests</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityLabel="Decrease number of guests"
                    accessibilityRole="button"
                    disabled={guests <= 1}
                    onPress={() => setGuests((current) => Math.max(1, current - 1))}
                    style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed, guests <= 1 && styles.disabled]}
                  >
                    <View style={styles.minusIcon} />
                  </Pressable>
                  <Text accessibilityLabel={`${guests} guests`} style={styles.guestCount}>{guests}</Text>
                  <Pressable
                    accessibilityLabel="Increase number of guests"
                    accessibilityRole="button"
                    disabled={guests >= 20}
                    onPress={() => setGuests((current) => Math.min(20, current + 1))}
                    style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed, guests >= 20 && styles.disabled]}
                  >
                    <View style={styles.plusHorizontal} />
                    <View style={styles.plusVertical} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Estimated Wait Time</Text>
                <Pressable
                  accessibilityLabel={`Estimated wait time, ${waitLabel(waitMinutes)}`}
                  accessibilityRole="button"
                  onPress={() => setWaitPickerOpen(true)}
                  style={({ pressed }) => [styles.select, pressed && styles.pressed]}
                >
                  <Text style={styles.selectText}>{waitLabel(waitMinutes)}</Text>
                  <ChevronDown />
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Special Requests (Optional)</Text>
                <TextInput
                  accessibilityLabel="Special requests"
                  maxLength={500}
                  multiline
                  onChangeText={setSpecialRequest}
                  placeholder="e.g. window seat, high chair"
                  placeholderTextColor={colors.secondary}
                  style={[styles.input, styles.requestInput]}
                  textAlignVertical="top"
                  value={specialRequest}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                onPress={() => void addToQueue()}
                style={({ pressed }) => [styles.submitButton, (!canSubmit || pressed) && styles.pressed]}
              >
                {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.submitText}>Add to Queue</Text>}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setWaitPickerOpen(false)}
        transparent
        visible={waitPickerOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close wait time selector" onPress={() => setWaitPickerOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Estimated Wait Time</Text>
            {waitOptions.map((minutes) => {
              const selected = minutes === waitMinutes;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={minutes}
                  onPress={() => { setWaitMinutes(minutes); setWaitPickerOpen(false); }}
                  style={({ pressed }) => [styles.waitOption, selected && styles.waitOptionSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.waitOptionText, selected && styles.waitOptionTextSelected]}>{waitLabel(minutes)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, backgroundColor: colors.background },
  scrollContent: { alignItems: 'center', paddingBottom: 36 },
  contentWidth: { width: '100%', maxWidth: 460, paddingHorizontal: 20 },
  contentWidthCompact: { paddingHorizontal: 16 },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backIcon: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.text, transform: [{ rotate: '45deg' }] },
  title: { flex: 1, marginLeft: 14, color: colors.text, fontSize: 25, fontWeight: '800', lineHeight: 31, letterSpacing: -0.5 },
  form: { marginTop: 26 },
  fieldGroup: { marginBottom: 20 },
  label: { marginLeft: 2, marginBottom: 9, color: colors.text, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 54, borderRadius: 17, borderWidth: 1.5, borderColor: colors.border, color: colors.text, fontSize: 14, fontWeight: '500', paddingHorizontal: 16, backgroundColor: colors.surface },
  inputError: { borderColor: colors.error },
  errorText: { marginTop: 5, marginLeft: 3, color: colors.error, fontSize: 12 },
  stepper: { height: 54, flexDirection: 'row', alignItems: 'center', borderRadius: 17, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface },
  stepperButton: { width: 58, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control },
  guestCount: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  minusIcon: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.secondary },
  plusHorizontal: { position: 'absolute', width: 22, height: 3, borderRadius: 2, backgroundColor: colors.secondary },
  plusVertical: { position: 'absolute', width: 3, height: 22, borderRadius: 2, backgroundColor: colors.secondary },
  select: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 17, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, backgroundColor: colors.surface },
  selectText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  chevronDown: { width: 11, height: 11, marginRight: 1, marginBottom: 5, borderRightWidth: 1.3, borderBottomWidth: 1.3, borderColor: colors.secondary, transform: [{ rotate: '45deg' }] },
  requestInput: { minHeight: 158, paddingTop: 16, paddingHorizontal: 16 },
  submitButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 17, backgroundColor: colors.active, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 4 },
  submitText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 24, backgroundColor: colors.surface, padding: 20, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  modalTitle: { marginBottom: 12, color: colors.text, fontSize: 21, fontWeight: '800' },
  waitOption: { minHeight: 48, justifyContent: 'center', borderRadius: 14, paddingHorizontal: 14 },
  waitOptionSelected: { backgroundColor: colors.active },
  waitOptionText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  waitOptionTextSelected: { fontWeight: '800' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.65 },
});
