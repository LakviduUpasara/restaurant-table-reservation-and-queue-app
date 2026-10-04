import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from './supabase';
async function consume(url:string){
  const recovery=url.includes('reset-password');
  if(!recovery&&!url.includes('login'))return;
  const params=new URLSearchParams(url.split('#')[1]??url.split('?')[1]??'');
  const access_token=params.get('access_token');
  const refresh_token=params.get('refresh_token');
  const code=params.get('code');
  const result=access_token&&refresh_token
    ? await supabase.auth.setSession({access_token,refresh_token})
    : code ? await supabase.auth.exchangeCodeForSession(code) : null;
  if(result&&!result.error&&!recovery)router.replace('/home');
}
export function listenForAuthLinks(){void Linking.getInitialURL().then(url=>{if(url)void consume(url)});const subscription=Linking.addEventListener('url',event=>{void consume(event.url)});return()=>subscription.remove()}
