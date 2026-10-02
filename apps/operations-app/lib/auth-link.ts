import * as Linking from 'expo-linking';
import { supabase } from './supabase';
async function consume(url:string){if(!url.includes('reset-password'))return;const params=new URLSearchParams(url.split('#')[1]??url.split('?')[1]??'');const access_token=params.get('access_token');const refresh_token=params.get('refresh_token');const code=params.get('code');if(access_token&&refresh_token)await supabase.auth.setSession({access_token,refresh_token});else if(code)await supabase.auth.exchangeCodeForSession(code)}
export function listenForAuthLinks(){void Linking.getInitialURL().then(url=>{if(url)void consume(url)});const subscription=Linking.addEventListener('url',event=>{void consume(event.url)});return()=>subscription.remove()}
