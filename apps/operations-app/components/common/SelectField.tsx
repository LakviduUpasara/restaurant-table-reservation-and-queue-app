import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function SelectField({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={styles.value}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map(option => (
              <Pressable
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={[styles.option, option === value && styles.selectedOption]}
              >
                <Text style={[styles.optionText, option === value && styles.selectedText]}>{option}</Text>
                {option === value ? <Ionicons name="checkmark" size={18} color={COLORS.text} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, color: COLORS.text },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  value: { fontSize: 13, color: COLORS.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', padding: 28 },
  modalCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8, color: COLORS.text },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10 },
  selectedOption: { backgroundColor: COLORS.primarySoft },
  optionText: { fontSize: 14, color: COLORS.text },
  selectedText: { fontWeight: '700' },
});
