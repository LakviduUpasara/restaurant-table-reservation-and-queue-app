import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from './OwnerLayout';
import { COLORS } from '../../constants/theme';

type Props = { title: string; active: 'dashboard' | 'tables' | 'reservations' | 'queue' | 'more' };

export function OwnerPlaceholder({ title, active }: Props) {
  return (
    <OwnerLayout active={active} title={title}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>This Owner screen is kept as a navigation placeholder for now. Your team can replace it with the final Figma implementation.</Text>
      </View>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
  title: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  text: { textAlign: 'center', fontSize: 12, color: COLORS.muted, lineHeight: 18 },
});
