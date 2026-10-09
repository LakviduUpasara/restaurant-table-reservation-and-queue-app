import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'outline' | 'danger' | 'soft';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
};

export function ActionButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  style,
  icon,
}: Props) {
  const isDisabled = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'soft'
              ? COLORS.text
              : COLORS.white
          }
        />
      ) : (
        icon
      )}

      {!busy && (
        <Text style={[styles.text, styles[`${variant}Text`]]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },

  primary: {
    backgroundColor: COLORS.primary,
  },

  dark: {
    backgroundColor: COLORS.black,
  },

  outline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  danger: {
    backgroundColor: COLORS.red,
  },

  soft: {
    backgroundColor: COLORS.primarySoft,
  },

  text: {
    fontSize: 13,
    fontWeight: '800',
  },

  primaryText: {
    color: COLORS.text,
  },

  darkText: {
    color: COLORS.white,
  },

  outlineText: {
    color: COLORS.text,
  },

  dangerText: {
    color: COLORS.white,
  },

  softText: {
    color: COLORS.text,
  },

  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },

  disabled: {
    opacity: 0.55,
  },
});