import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  password?: boolean;
};

export function FigmaInput({ label, icon, password, style, ...props }: Props) {
  const [secure, setSecure] = useState(Boolean(password));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <Ionicons name={icon} size={17} color={COLORS.text} style={styles.leftIcon} /> : null}
        <TextInput
          {...props}
          secureTextEntry={password ? secure : props.secureTextEntry}
          placeholderTextColor="#AAAAAA"
          style={[styles.input, icon ? styles.inputWithIcon : null, style]}
        />
        {password ? (
          <Pressable onPress={() => setSecure(v => !v)} hitSlop={10} style={styles.eye}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputWrap: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F7F7F7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: { marginLeft: 12 },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 13, color: COLORS.text },
  inputWithIcon: { paddingLeft: 8 },
  eye: { paddingHorizontal: 12 },
});
