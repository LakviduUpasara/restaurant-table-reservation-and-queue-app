import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '../../components/common/ActionButton';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { generateOwnerReport, OwnerReport, ReportPeriod } from '../../services/report.service';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const displayDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const dateForDaysAgo = (daysAgo: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return formatDate(date);
};

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function OwnerReports() {
  const router = useRouter();
  const today = dateForDaysAgo(0);
  const [preset, setPreset] = useState<'Today' | '7 Days' | '30 Days' | 'Custom'>('7 Days');
  const [startDate, setStartDate] = useState(dateForDaysAgo(6));
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<OwnerReport | null>(null);

  const calculatedPeriod = useMemo<ReportPeriod>(() => {
    if (preset === 'Today') return { start: today, end: today, label: 'Today' };
    if (preset === '7 Days') return { start: dateForDaysAgo(6), end: today, label: 'Last 7 Days' };
    if (preset === '30 Days') return { start: dateForDaysAgo(29), end: today, label: 'Last 30 Days' };
    return { start: startDate.trim(), end: endDate.trim(), label: 'Custom Range' };
  }, [preset, today, startDate, endDate]);

  const generate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(calculatedPeriod.start) || !/^\d{4}-\d{2}-\d{2}$/.test(calculatedPeriod.end)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for the custom date range.');
      return;
    }
    if (calculatedPeriod.start > calculatedPeriod.end) {
      Alert.alert('Invalid range', 'Start date must be before or equal to the end date.');
      return;
    }
    setReport(generateOwnerReport(calculatedPeriod));
  };

  const buildHtml = (data: OwnerReport) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @page { margin: 28px; }
  body { font-family: Helvetica, Arial, sans-serif; color: #161616; padding: 0; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 22px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  .muted { color: #777; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
  .value { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
  .label { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 7px 4px; border-bottom: 1px solid #eee; }
  td:last-child { text-align: right; font-weight: bold; }
  .footer { margin-top: 24px; font-size: 10px; color: #888; }
</style>
</head>
<body>
  <h1>DineFlow — Owner Report</h1>
  <div class="muted">Period: ${escapeHtml(displayDate(data.period.start))} – ${escapeHtml(displayDate(data.period.end))}</div>

  <h2>Overview</h2>
  <div class="grid">
    <div class="card"><div class="value">${data.reservations.total}</div><div class="label">Reservations</div></div>
    <div class="card"><div class="value">${data.walkIns.total}</div><div class="label">Walk-in Customers</div></div>
    <div class="card"><div class="value">${data.queue.total}</div><div class="label">Queue Entries</div></div>
    <div class="card"><div class="value">${data.tables.averageUtilization}%</div><div class="label">Average Table Utilization</div></div>
  </div>

  <h2>Reservations</h2>
  <table>
    <tr><td>Total reservations</td><td>${data.reservations.total}</td></tr>
    <tr><td>Confirmed</td><td>${data.reservations.confirmed}</td></tr>
    <tr><td>Completed</td><td>${data.reservations.completed}</td></tr>
    <tr><td>Cancelled</td><td>${data.reservations.cancelled}</td></tr>
    <tr><td>No-show</td><td>${data.reservations.noShow}</td></tr>
    <tr><td>Total reserved guests</td><td>${data.reservations.guests}</td></tr>
    <tr><td>Average guests / reservation</td><td>${data.reservations.averageGuests}</td></tr>
  </table>

  <h2>Walk-in Customers</h2>
  <table>
    <tr><td>Total walk-ins</td><td>${data.walkIns.total}</td></tr>
    <tr><td>Served</td><td>${data.walkIns.served}</td></tr>
    <tr><td>Waiting</td><td>${data.walkIns.waiting}</td></tr>
    <tr><td>No-show</td><td>${data.walkIns.noShow}</td></tr>
    <tr><td>Total walk-in guests</td><td>${data.walkIns.guests}</td></tr>
    <tr><td>Average guests / walk-in</td><td>${data.walkIns.averageGuests}</td></tr>
  </table>

  <h2>Virtual Queue</h2>
  <table>
    <tr><td>Total queue entries</td><td>${data.queue.total}</td></tr>
    <tr><td>Served</td><td>${data.queue.served}</td></tr>
    <tr><td>Currently waiting</td><td>${data.queue.waiting}</td></tr>
    <tr><td>No-show</td><td>${data.queue.noShow}</td></tr>
    <tr><td>Average wait time</td><td>${data.queue.averageWaitMinutes} min</td></tr>
    <tr><td>Longest wait recorded</td><td>${data.queue.longestWaitMinutes} min</td></tr>
  </table>

  <h2>Table Operations</h2>
  <table>
    <tr><td>Average occupied tables</td><td>${data.tables.averageOccupied}</td></tr>
    <tr><td>Average utilization</td><td>${data.tables.averageUtilization}%</td></tr>
  </table>

  <div class="footer">Generated from DineFlow Owner Report.</div>
</body>
</html>`;

  const printReport = async () => {
    if (!report) {
      Alert.alert('Generate the report first', 'Select a duration and tap Generate Report.');
      return;
    }
    try {
      await Print.printAsync({ html: buildHtml(report), orientation: Print.Orientation.portrait });
    } catch (error) {
      console.error(error);
      Alert.alert('Print failed', 'The report could not be opened for printing.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Generate Report</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Select Time Duration</Text>
          <View style={styles.presetRow}>
            {(['Today', '7 Days', '30 Days', 'Custom'] as const).map(item => (
              <Pressable
                key={item}
                onPress={() => setPreset(item)}
                style={[styles.preset, preset === item && styles.presetActive]}
              >
                <Text style={[styles.presetText, preset === item && styles.presetTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          {preset === 'Custom' ? (
            <View style={styles.customCard}>
              <Text style={styles.inputLabel}>Start date</Text>
              <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#A2A2A2" style={styles.dateInput} />
              <Text style={styles.inputLabel}>End date</Text>
              <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#A2A2A2" style={styles.dateInput} />
            </View>
          ) : null}

          <View style={styles.periodCard}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.periodLabel}>{calculatedPeriod.label}</Text>
              <Text style={styles.periodValue}>{displayDate(calculatedPeriod.start)} – {displayDate(calculatedPeriod.end)}</Text>
            </View>
          </View>

          <ActionButton title="Generate Report" onPress={generate} style={{ marginTop: 14 }} />

          {report ? (
            <View style={styles.reportWrap}>
              <View style={styles.reportHeaderRow}>
                <View>
                  <Text style={styles.reportTitle}>Report Summary</Text>
                  <Text style={styles.reportSubtitle}>{displayDate(report.period.start)} – {displayDate(report.period.end)}</Text>
                </View>
                <Pressable onPress={printReport} style={styles.printButton}>
                  <Ionicons name="print-outline" size={18} color={COLORS.text} />
                  <Text style={styles.printText}>Print</Text>
                </Pressable>
              </View>

              <View style={styles.summaryGrid}>
                <SummaryCard value={report.reservations.total} label="Reservations" />
                <SummaryCard value={report.walkIns.total} label="Walk-ins" />
                <SummaryCard value={report.queue.total} label="Queue Entries" />
                <SummaryCard value={`${report.tables.averageUtilization}%`} label="Table Utilization" />
              </View>

              <ReportSection title="Reservations">
                <ReportRow label="Confirmed" value={report.reservations.confirmed} />
                <ReportRow label="Completed" value={report.reservations.completed} />
                <ReportRow label="Cancelled" value={report.reservations.cancelled} />
                <ReportRow label="No-show" value={report.reservations.noShow} />
                <ReportRow label="Total guests" value={report.reservations.guests} />
                <ReportRow label="Avg. guests / reservation" value={report.reservations.averageGuests} />
              </ReportSection>

              <ReportSection title="Walk-in Customers">
                <ReportRow label="Served" value={report.walkIns.served} />
                <ReportRow label="Waiting" value={report.walkIns.waiting} />
                <ReportRow label="No-show" value={report.walkIns.noShow} />
                <ReportRow label="Total guests" value={report.walkIns.guests} />
                <ReportRow label="Avg. guests / walk-in" value={report.walkIns.averageGuests} />
              </ReportSection>

              <ReportSection title="Virtual Queue">
                <ReportRow label="Served" value={report.queue.served} />
                <ReportRow label="Waiting" value={report.queue.waiting} />
                <ReportRow label="No-show" value={report.queue.noShow} />
                <ReportRow label="Average wait" value={`${report.queue.averageWaitMinutes} min`} />
                <ReportRow label="Longest wait" value={`${report.queue.longestWaitMinutes} min`} />
              </ReportSection>

              <ReportSection title="Table Operations">
                <ReportRow label="Average occupied tables" value={report.tables.averageOccupied} />
                <ReportRow label="Average utilization" value={`${report.tables.averageUtilization}%`} />
              </ReportSection>

              <ActionButton title="Print Full Report" onPress={printReport} style={{ marginTop: 6, marginBottom: 10 }} />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={35} color="#B0B0B0" />
              <Text style={styles.emptyTitle}>Your report will appear here</Text>
              <Text style={styles.emptyText}>Choose a duration and generate a report to see reservation, walk-in, queue and table insights.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.reportSection}>
      <Text style={styles.reportSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ReportRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.reportRow}>
      <Text style={styles.reportRowLabel}>{label}</Text>
      <Text style={styles.reportRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  root: { flex: 1 },
  header: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 34, height: 34, justifyContent: 'center' },
  title: { flex: 1, fontSize: 21, fontWeight: '800', color: COLORS.text },
  scroll: { paddingHorizontal: 18, paddingBottom: 30 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 5, marginBottom: 10 },
  presetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  preset: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E2E2', alignItems: 'center', justifyContent: 'center' },
  presetActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  presetText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  presetTextActive: { color: '#FFFFFF' },
  customCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: SPACING.md, marginTop: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text, marginBottom: 5, marginTop: 2 },
  dateInput: { height: 43, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: '#F7F7F7', paddingHorizontal: 12, fontSize: 12, color: COLORS.text, marginBottom: 9 },
  periodCard: { marginTop: 12, backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md, padding: 13, flexDirection: 'row', alignItems: 'center' },
  periodLabel: { fontSize: 10, color: '#7C6A00', fontWeight: '700' },
  periodValue: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  reportWrap: { marginTop: 18 },
  reportHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reportTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  reportSubtitle: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  printButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 19, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  printText: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  summaryCard: { width: '48.2%', minHeight: 78, backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 12, justifyContent: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 10, color: COLORS.muted, marginTop: 3 },
  reportSection: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 13, marginTop: 12 },
  reportSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 5 },
  reportRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDEDED' },
  reportRowLabel: { fontSize: 11, color: '#666666' },
  reportRowValue: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  emptyCard: { marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 10 },
  emptyText: { fontSize: 10.5, lineHeight: 16, color: COLORS.muted, textAlign: 'center', marginTop: 6 },
});
