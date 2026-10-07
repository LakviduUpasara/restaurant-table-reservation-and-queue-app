import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
};

export function ActionButton({ title, onPress, variant = 'primary', style, disabled }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, variant === 'outline' ? styles.outlineText : null]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: COLORS.primary },
  dark: { backgroundColor: COLORS.black },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.black },
  danger: { backgroundColor: COLORS.red },
  text: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  outlineText: { color: COLORS.text },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
