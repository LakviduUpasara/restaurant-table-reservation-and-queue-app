import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={styles.field}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.value}>
          {value || 'Select an option'}
        </Text>

        <Ionicons
          name="chevron-down"
          size={17}
          color="#707070"
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>
              Select {label}
            </Text>

            {options.map(option => (
              <Pressable
                key={option}
                style={[
                  styles.option,
                  option === value && styles.selected,
                ]}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    option === value && styles.selectedText,
                  ]}
                >
                  {option}
                </Text>

                {option === value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.primaryDark}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 13,
  },

  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 7,
  },

  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D7D7D4',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  value: {
    fontSize: 13,
    color: COLORS.text,
  },

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },

  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    backgroundColor: '#D9D9D9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },

  option: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selected: {
    backgroundColor: COLORS.primarySoft,
  },

  optionText: {
    fontSize: 13,
    color: COLORS.text,
  },

  selectedText: {
    fontWeight: '800',
  },
});