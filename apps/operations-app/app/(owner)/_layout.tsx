import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../../stores/auth.store';

export default function OwnerLayout() {
  const { ready, profile, error } = useAuth();
  if (!ready) return <ActivityIndicator />;
  if (!profile) return <Redirect href="/(auth)/login" />;
  if (profile.role !== 'OWNER') return <Redirect href="/(staff)/dashboard" />;
  if (error) return <View><Text>{error}</Text></View>;
  return <Stack screenOptions={{ headerShown: false }} />;
}
