import { create } from 'zustand';
import type { Profile } from '@dineflow/shared';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useCart } from './cart.store';
type AuthState = { ready:boolean; profile:Profile|null; error:string|null; pushToken:string|null; setPushToken:(token:string)=>void; refresh:()=>Promise<void>; signIn:(email:string,password:string)=>Promise<void>; signUp:(email:string,password:string,name:string)=>Promise<void>; signOut:()=>Promise<void> };
export const useAuth = create<AuthState>((set,get)=>({
  ready:false,profile:null,error:null,pushToken:null,setPushToken:pushToken=>set({pushToken}),
  refresh:async()=>{ const {data}=await supabase.auth.getSession(); if (!data.session) {useCart.getState().setOwner(null);set({profile:null,error:null,ready:true});return;} try {const profile=await api<Profile>('/me');useCart.getState().setOwner(profile.id);set({profile,error:null,ready:true});} catch(e) {set({profile:null,error:String((e as Error).message),ready:true});} },
  signIn:async(email,password)=>{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;await get().refresh();if(get().error)throw new Error(get().error!);},
  signUp:async(email,password,name)=>{const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;await get().refresh();},
  signOut:async()=>{if(get().pushToken)await api('/push-tokens',{method:'DELETE',body:{token:get().pushToken}}).catch(error=>console.warn('Could not remove push token',error));const {error}=await supabase.auth.signOut();if(error)throw error;useCart.getState().setOwner(null);set({profile:null,pushToken:null,error:null,ready:true});}
}));
