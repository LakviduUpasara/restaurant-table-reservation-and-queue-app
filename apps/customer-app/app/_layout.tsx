import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../stores/auth.store';
import { supabase } from '../lib/supabase';
import { usePushRegistration } from '../features/push';
import { listenForAuthLinks } from '../lib/auth-link';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:10000}}});
export default function RootLayout(){
  const refresh=useAuth(s=>s.refresh);
  const [fontsLoaded]=useFonts({Inter_400Regular,Inter_500Medium,Inter_600SemiBold,Inter_700Bold,Inter_800ExtraBold});
  usePushRegistration();
  useEffect(()=>{void refresh();const stopLinks=listenForAuthLinks();const {data}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>{void refresh();void queryClient.invalidateQueries()},0)});return()=>{data.subscription.unsubscribe();stopLinks()};},[refresh]);
  if(!fontsLoaded)return null;
  return <QueryClientProvider client={queryClient}><Stack screenOptions={{headerShown:false}}/></QueryClientProvider>
}
