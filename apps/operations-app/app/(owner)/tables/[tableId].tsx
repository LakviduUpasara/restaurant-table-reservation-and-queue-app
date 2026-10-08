import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { StatusPill, Card, Row, Divider } from '../../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../../constants/theme';

const options = ['Available', 'Occupied', 'Reserved', 'Cleaning'];
const info: Record<string, { seats: number; customer: string; phone: string; reservation: string }> = {
  T1: { seats: 4, customer: 'No current guest', phone: '—', reservation: 'No reservation' },
  T2: { seats: 4, customer: 'Nimal Perera', phone: '071 234 5678', reservation: '7:30 PM' },
  T3: { seats: 6, customer: 'Samantha Dias', phone: '077 456 2381', reservation: '1:30 PM' },
  T7: { seats: 4, customer: 'Priya Silva', phone: '071 987 6543', reservation: '12:00 PM' },
};

export default function TableDetail() { const { tableId } = useLocalSearchParams<{ tableId: string }>(); const router = useRouter(); const table = info[tableId ?? ''] ?? info.T1; const [status, setStatus] = useState(tableId === 'T2' ? 'Occupied' : tableId === 'T3' ? 'Reserved' : 'Available');
  return <OwnerLayout active="tables" title={`Table ${tableId ?? ''}`} showBack onBack={() => router.back()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}><View style={styles.hero}><View style={styles.tableCircle}><Ionicons name="grid-outline" size={29} color={COLORS.text}/></View><View style={{flex:1,marginLeft:12}}><Text style={styles.title}>Table {tableId}</Text><Text style={styles.sub}>{table.seats} seats · Main floor</Text></View><StatusPill label={status} tone={status==='Available'?'green':status==='Occupied'?'red':status==='Reserved'?'yellow':'gray'} /></View><Card><Row label="Current customer" value={table.customer} icon="person-outline"/><Divider/><Row label="Phone" value={table.phone} icon="call-outline"/><Divider/><Row label="Reservation" value={table.reservation} icon="calendar-outline"/></Card><Text style={styles.section}>Update table status</Text><Card>{options.map(option => <Pressable key={option} onPress={()=>setStatus(option)} style={[styles.statusOption,status===option&&styles.selected]}><View style={styles.optionLeft}><View style={[styles.dot,{backgroundColor:option==='Available'?COLORS.green:option==='Occupied'?COLORS.red:option==='Reserved'?COLORS.orange:'#666'}]}/><Text style={styles.optionText}>{option}</Text></View>{status===option?<Ionicons name="checkmark-circle" size={19} color={COLORS.primaryDark}/>:null}</Pressable>)}</Card><ActionButton title="Save table status" onPress={()=>Alert.alert('Saved',`Table ${tableId} is now ${status.toLowerCase()}.`,[{text:'Done'}])} style={{marginTop:2}}/><ActionButton title="Cancel" variant="outline" onPress={()=>router.back()} style={{marginTop:10}}/></ScrollView></OwnerLayout>; }
const styles=StyleSheet.create({scroll:{paddingTop:6,paddingBottom:24},hero:{flexDirection:'row',alignItems:'center',marginBottom:13},tableCircle:{width:56,height:56,borderRadius:19,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},title:{fontSize:22,fontWeight:'900',color:COLORS.text},sub:{fontSize:9.5,color:COLORS.muted,marginTop:3},section:{fontSize:16,fontWeight:'900',color:COLORS.text,marginTop:3,marginBottom:8},statusOption:{minHeight:48,borderRadius:12,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4},selected:{backgroundColor:COLORS.primarySoft},optionLeft:{flexDirection:'row',alignItems:'center'},dot:{width:9,height:9,borderRadius:5,marginRight:9},optionText:{fontSize:11.5,fontWeight:'800',color:COLORS.text}});
