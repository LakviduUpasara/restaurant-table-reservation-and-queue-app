import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { ActionButton } from '../../components/common/ActionButton';
import { COLORS, RADIUS } from '../../constants/theme';
import { generateOwnerReport, OwnerReport, ReportPeriod } from '../../services/report.service';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (value: string) => { const d = new Date(`${value}T00:00:00`); return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); };
const periodForPreset = (preset: 'Today' | '7 Days' | '30 Days'): ReportPeriod => { const end = new Date(); const start = new Date(); if (preset === '7 Days') start.setDate(start.getDate() - 6); if (preset === '30 Days') start.setDate(start.getDate() - 29); return { start: formatDate(start), end: formatDate(end), label: preset }; };

export default function OwnerReports() {
  const router = useRouter();
  const [preset, setPreset] = useState<'Today' | '7 Days' | '30 Days' | 'Custom'>('Today');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [report, setReport] = useState<OwnerReport | null>(null);
  const period = useMemo<ReportPeriod>(() => preset === 'Custom' ? { start: startDate, end: endDate, label: 'Custom range' } : periodForPreset(preset), [preset, startDate, endDate]);

  const generate = () => {
    if (period.start > period.end) return Alert.alert('Invalid dates', 'Start date must be before the end date.');
    setReport(generateOwnerReport(period));
  };

  const printReport = async () => {
    if (!report) return;
    const html = `<html><body style="font-family:Arial;padding:28px"><h1>DineFlow Owner Report</h1><p>${displayDate(report.period.start)} – ${displayDate(report.period.end)}</p><h2>Overview</h2><p>Reservations: ${report.reservations.total} · Walk-ins: ${report.walkIns.total} · Queue entries: ${report.queue.total} · Table utilization: ${report.tables.averageUtilization}%</p><h2>Reservations</h2><p>Confirmed: ${report.reservations.confirmed}<br/>Completed: ${report.reservations.completed}<br/>Cancelled: ${report.reservations.cancelled}<br/>No-show: ${report.reservations.noShow}<br/>Guests: ${report.reservations.guests}</p><h2>Walk-ins</h2><p>Served: ${report.walkIns.served}<br/>Waiting: ${report.walkIns.waiting}<br/>No-show: ${report.walkIns.noShow}<br/>Guests: ${report.walkIns.guests}</p><h2>Virtual Queue</h2><p>Served: ${report.queue.served}<br/>Waiting: ${report.queue.waiting}<br/>No-show: ${report.queue.noShow}<br/>Average wait: ${report.queue.averageWaitMinutes} min<br/>Longest wait: ${report.queue.longestWaitMinutes} min</p><h2>Tables</h2><p>Average occupied: ${report.tables.averageOccupied}<br/>Average utilization: ${report.tables.averageUtilization}%</p></body></html>`;
    try { await Print.printAsync({ html }); } catch { Alert.alert('Print failed', 'The report could not be opened for printing.'); }
  };

  return (
    <OwnerLayout active="more" title="Generate Report" showBack onBack={() => router.back()} right={<Pressable onPress={printReport} disabled={!report} style={[styles.headerPrint, !report && { opacity: 0.35 }]}><Ionicons name="print-outline" size={17} color={COLORS.text} /></Pressable>}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}><Text style={styles.kicker}>OWNER INSIGHTS</Text><Text style={styles.heroTitle}>Build a restaurant report</Text><Text style={styles.heroSub}>Review reservations, walk-ins, queue performance and table usage for a selected period.</Text></View>
        <Text style={styles.sectionTitle}>Time duration</Text>
        <View style={styles.presets}>{(['Today', '7 Days', '30 Days', 'Custom'] as const).map(item => <Pressable key={item} onPress={() => setPreset(item)} style={[styles.preset, preset === item && styles.presetActive]}><Text style={[styles.presetText, preset === item && styles.presetTextActive]}>{item}</Text></Pressable>)}</View>

        {preset === 'Custom' ? <View style={styles.customCard}><Text style={styles.inputLabel}>Start date</Text><TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#A2A2A2" style={styles.dateInput} /><Text style={styles.inputLabel}>End date</Text><TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#A2A2A2" style={styles.dateInput} /></View> : null}
        <View style={styles.periodCard}><View style={styles.periodIcon}><Ionicons name="calendar-outline" size={18} color={COLORS.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.periodLabel}>{period.label}</Text><Text style={styles.periodValue}>{displayDate(period.start)} – {displayDate(period.end)}</Text></View><Ionicons name="checkmark-circle" size={19} color={COLORS.green} /></View>
        <ActionButton title="Generate Report" onPress={generate} icon={<Ionicons name="sparkles-outline" size={17} color={COLORS.text} />} style={{ marginTop: 13 }} />

        {report ? <ReportView report={report} printReport={printReport} /> : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={25} color={COLORS.primaryDark} /></View><Text style={styles.emptyTitle}>Ready when you are</Text><Text style={styles.emptyText}>Choose a duration and generate a clean Owner report you can print.</Text></View>}
      </ScrollView>
    </OwnerLayout>
  );
}

function ReportView({ report, printReport }: { report: OwnerReport; printReport: () => void }) {
  return <View style={styles.reportWrap}><View style={styles.reportHeader}><View><Text style={styles.reportTitle}>Report summary</Text><Text style={styles.reportSub}>{displayDate(report.period.start)} – {displayDate(report.period.end)}</Text></View><Pressable onPress={printReport} style={styles.smallPrint}><Ionicons name="print-outline" size={16} color={COLORS.text} /><Text style={styles.smallPrintText}>Print</Text></Pressable></View>
    <View style={styles.summaryGrid}><Metric value={report.reservations.total} label="Reservations" icon="calendar-outline" tint={COLORS.red} /><Metric value={report.walkIns.total} label="Walk-ins" icon="walk-outline" tint={COLORS.orange} /><Metric value={report.queue.total} label="Queue entries" icon="people-outline" tint={COLORS.purple} /><Metric value={`${report.tables.averageUtilization}%`} label="Table usage" icon="grid-outline" tint={COLORS.green} /></View>
    <Section title="Reservations" icon="calendar-outline" rows={[['Confirmed', String(report.reservations.confirmed)], ['Completed', String(report.reservations.completed)], ['Cancelled', String(report.reservations.cancelled)], ['No-show', String(report.reservations.noShow)], ['Total guests', String(report.reservations.guests)], ['Avg. guests / reservation', String(report.reservations.averageGuests)]]} />
    <Section title="Walk-in customers" icon="walk-outline" rows={[['Served', String(report.walkIns.served)], ['Waiting', String(report.walkIns.waiting)], ['No-show', String(report.walkIns.noShow)], ['Total guests', String(report.walkIns.guests)], ['Avg. guests / walk-in', String(report.walkIns.averageGuests)]]} />
    <Section title="Virtual queue" icon="people-outline" rows={[ ['Served', String(report.queue.served)], ['Waiting', String(report.queue.waiting)], ['No-show', String(report.queue.noShow)], ['Average wait', `${report.queue.averageWaitMinutes} min`], ['Longest wait', `${report.queue.longestWaitMinutes} min`],
  ]}
/>
    <ActionButton title="Print Full Report" onPress={printReport} icon={<Ionicons name="print-outline" size={17} color={COLORS.white} />} style={{ marginTop: 5, marginBottom: Platform.OS === 'web' ? 4 : 10 }} />
  </View>;
}

function Metric({ value, label, icon, tint }: { value: string | number; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: tint + '18' }]}><Ionicons name={icon} size={17} color={tint} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Section({ title, icon, rows }: { title: string; icon: keyof typeof Ionicons.glyphMap; rows: string[][] }) { return <View style={styles.section}><View style={styles.sectionHead}><View style={styles.sectionIcon}><Ionicons name={icon} size={16} color={COLORS.text} /></View><Text style={styles.sectionHeadTitle}>{title}</Text></View>{rows.map(([label, value], index) => <View key={label} style={[styles.row, index === rows.length - 1 && { borderBottomWidth: 0 }]}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>)}</View>; }

const styles = StyleSheet.create({
  scroll: { paddingTop: 5, paddingBottom: 28 },
  headerPrint: { width: 32, height: 32, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  hero: { marginBottom: 15 },
  kicker: { fontSize: 8.5, color: COLORS.muted, fontWeight: '900', letterSpacing: 1.1, marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  heroSub: { fontSize: 10.5, color: COLORS.textSoft, lineHeight: 15, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text, marginBottom: 9 },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  preset: { flex: 1, minHeight: 39, borderRadius: 19, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E3E3DF', alignItems: 'center', justifyContent: 'center' },
  presetActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  presetText: { fontSize: 10.5, fontWeight: '800', color: COLORS.textSoft },
  presetTextActive: { color: COLORS.white },
  customCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 13, marginTop: 11, borderWidth: 1, borderColor: '#ECECE8' },
  inputLabel: { fontSize: 10, fontWeight: '800', color: COLORS.text, marginBottom: 5 },
  dateInput: { minHeight: 42, borderWidth: 1, borderColor: '#DADAD6', borderRadius: 10, backgroundColor: '#FAFAF8', paddingHorizontal: 12, fontSize: 12, color: COLORS.text, marginBottom: 9 },
  periodCard: { marginTop: 11, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md, padding: 12, flexDirection: 'row', alignItems: 'center' },
  periodIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  periodLabel: { fontSize: 9.5, color: '#7E6900', fontWeight: '800' },
  periodValue: { fontSize: 12, fontWeight: '900', color: COLORS.text, marginTop: 2 },
  empty: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ECECE8', borderRadius: RADIUS.lg, padding: 27, alignItems: 'center', marginTop: 14 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  emptyText: { fontSize: 10, color: COLORS.muted, lineHeight: 15, textAlign: 'center', marginTop: 4 },
  reportWrap: { marginTop: 17 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reportTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  reportSub: { fontSize: 9.5, color: COLORS.muted, marginTop: 2 },
  smallPrint: { height: 35, paddingHorizontal: 11, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallPrintText: { fontSize: 9.5, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metric: { width: '48.2%', minHeight: 86, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ECECE8', borderRadius: RADIUS.md, padding: 11, marginBottom: 9 },
  metricIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  metricLabel: { fontSize: 9.5, color: COLORS.muted, marginTop: 2 },
  section: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ECECE8', borderRadius: RADIUS.md, padding: 13, marginTop: 9 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  sectionIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sectionHeadTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  row: { minHeight: 34, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ECECE8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 10.5, color: COLORS.textSoft },
  rowValue: { fontSize: 11, fontWeight: '900', color: COLORS.text },
});
