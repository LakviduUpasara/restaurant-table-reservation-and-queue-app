import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { ActionButton } from './ActionButton';

export function OwnerDeleteButton({ title, message, disabled, onDelete }: { title: string; message: string; disabled?: boolean; onDelete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    setBusy(true); setError(null);
    try { await onDelete(); setOpen(false); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <>
    <ActionButton title={title} variant="danger" disabled={disabled} onPress={() => { setError(null); setOpen(true); }} style={{ marginTop: 16 }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <View style={styles.overlay}><View style={styles.sheet}>
        <Text style={styles.title}>{title}?</Text><Text style={styles.message}>{message}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ActionButton title={title} variant="danger" busy={busy} onPress={() => void remove()} />
        <ActionButton title="Cancel" variant="outline" disabled={busy} onPress={() => setOpen(false)} style={{ marginTop: 10 }} />
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 390, alignSelf: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18 },
  title: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  message: { fontSize: 12, lineHeight: 18, color: COLORS.textSoft, marginVertical: 14 },
  error: { fontSize: 12, color: COLORS.red, marginBottom: 12 },
});
