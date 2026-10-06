import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';

export function Screen({ title, subtitle, children, footer }: { title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
    {title && <Text style={styles.title}>{title}</Text>}{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}{children}
  </ScrollView>{footer && <View style={styles.footer}>{footer}</View>}</SafeAreaView>;
}
export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return onPress ? <Pressable onPress={onPress} style={styles.card}>{children}</Pressable> : <View style={styles.card}>{children}</View>;
}
export function Label({ children, muted = false }: { children: ReactNode; muted?: boolean }) { return <Text style={[styles.label,muted && styles.muted]}>{children}</Text>; }
export function Heading({ children }: { children: ReactNode }) { return <Text style={styles.heading}>{children}</Text>; }
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props}/>{error && <Text style={styles.error}>{error}</Text>}</View>;
}
export function Button({ title, onPress, kind = 'primary', disabled = false, busy = false }: { title: string; onPress: () => void; kind?: 'primary'|'secondary'|'danger'|'ghost'; disabled?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || busy} onPress={onPress} style={[styles.button,kind==='secondary' && styles.buttonSecondary,kind==='danger' && styles.buttonDanger,kind==='ghost' && styles.buttonGhost,(disabled||busy) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.background}/> : <Text style={[styles.buttonText,kind!=='primary' && styles.buttonTextLight]}>{title}</Text>}</Pressable>;
}
export function StatusBadge({ status }: { status: string }) {
  const color = status==='AVAILABLE'||status==='CONFIRMED'||status==='SEATED' ? colors.success : status==='CANCELLED'||status==='NO_SHOW'||status==='UNAVAILABLE' ? colors.error : status==='WAITING'||status==='RESERVED' ? colors.warning : colors.info;
  return <View style={[styles.badge,{borderColor:color}]}><Text style={[styles.badgeText,{color}]}>{status.replaceAll('_',' ')}</Text></View>;
}
export function State({ loading, error, empty, onRetry }: { loading?: boolean; error?: string; empty?: string; onRetry?: () => void }) {
  if (loading) return <ActivityIndicator style={styles.state} color={colors.primary}/>;
  return <View style={styles.state}><Text style={styles.muted}>{error || empty || ''}</Text>{error && onRetry && <Button title="Retry" kind="secondary" onPress={onRetry}/>}</View>;
}
export function Freshness({ at, offline }: { at?: string; offline?: boolean }) { return <Text style={styles.freshness}>{offline?'Offline — showing last data':at?`Updated ${new Date(at).toLocaleTimeString()}`:'Waiting for update'}</Text>; }
export const money = (cents: number) => `LKR ${(cents/100).toFixed(2)}`;

const styles=StyleSheet.create({ root:{flex:1,backgroundColor:colors.background},screen:{padding:spacing.xxl,paddingBottom:spacing.xxxl,gap:spacing.lg},footer:{padding:spacing.lg,backgroundColor:colors.background,borderTopWidth:1,borderColor:colors.border},title:{fontFamily:typography.family.bold,fontSize:typography.headingLarge,fontWeight:'700',color:colors.white,marginTop:spacing.lg},subtitle:{fontFamily:typography.family.regular,fontSize:typography.body,color:colors.textSecondary,lineHeight:23},heading:{fontFamily:typography.family.bold,fontSize:typography.headingSmall,fontWeight:'700',color:colors.white},label:{fontFamily:typography.family.regular,fontSize:typography.body,color:colors.white},muted:{fontFamily:typography.family.regular,color:colors.textMuted,fontSize:typography.bodySmall},card:{backgroundColor:colors.surface,borderRadius:radius.lg,padding:spacing.xl,gap:spacing.md,borderWidth:1,borderColor:colors.border},field:{gap:spacing.sm},fieldLabel:{fontFamily:typography.family.semibold,fontSize:typography.bodySmall,color:colors.textSecondary,fontWeight:'600'},input:{fontFamily:typography.family.regular,backgroundColor:colors.input,color:colors.white,borderRadius:radius.md,paddingHorizontal:spacing.lg,minHeight:54,borderWidth:1,borderColor:colors.border,fontSize:typography.body},error:{fontFamily:typography.family.regular,color:colors.error,fontSize:typography.caption},button:{minHeight:52,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.primary,paddingHorizontal:spacing.lg},buttonSecondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.primary},buttonDanger:{backgroundColor:colors.error},buttonGhost:{backgroundColor:'transparent'},buttonText:{fontFamily:typography.family.bold,fontSize:typography.body,fontWeight:'700',color:colors.background},buttonTextLight:{fontFamily:typography.family.bold,color:colors.white},disabled:{opacity:.5},badge:{alignSelf:'flex-start',borderWidth:1,borderRadius:radius.full,paddingHorizontal:spacing.md,paddingVertical:spacing.xs},badgeText:{fontFamily:typography.family.bold,fontSize:typography.caption,fontWeight:'700'},state:{padding:spacing.xxl,alignItems:'center',gap:spacing.lg},freshness:{fontFamily:typography.family.regular,color:colors.textMuted,fontSize:typography.caption} });
