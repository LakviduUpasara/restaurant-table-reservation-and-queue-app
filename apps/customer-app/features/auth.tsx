import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Screen, Label } from '@dineflow/shared';
import { useAuth } from '../stores/auth.store';
import { supabase } from '../lib/supabase';

const loginSchema=z.object({email:z.email(),password:z.string().min(6)});
const signupSchema=loginSchema.extend({name:z.string().trim().min(2),confirm:z.string().min(6)}).refine(v=>v.password===v.confirm,{path:['confirm'],message:'Passwords do not match'});
type Signup=z.infer<typeof signupSchema>;
export { LoginScreen } from './login';
export function SignupScreen(){const router=useRouter();const signUp=useAuth(s=>s.signUp);const [busy,setBusy]=useState(false);const {control,handleSubmit,formState:{errors}}=useForm<Signup>({resolver:zodResolver(signupSchema),defaultValues:{name:'',email:'',password:'',confirm:''}});
  const submit=handleSubmit(async v=>{setBusy(true);try{await signUp(v.email,v.password,v.name);Alert.alert('Account created','Confirm your email if requested, then sign in.');router.replace('/login');}catch(e){Alert.alert('Sign up failed',String((e as Error).message));}finally{setBusy(false);}});
  return <Screen title="Create your account" subtitle="A few details and you are ready to dine."><Controller control={control} name="name" render={({field})=><Field label="Full name" value={field.value} onChangeText={field.onChange} error={errors.name?.message}/>}/><Controller control={control} name="email" render={({field})=><Field label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message}/>}/><Controller control={control} name="password" render={({field})=><Field label="Password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message}/>}/><Controller control={control} name="confirm" render={({field})=><Field label="Confirm password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirm?.message}/>}/><Button title="Sign up" onPress={submit} busy={busy}/><Button title="Already have an account? Log in" kind="ghost" onPress={()=>router.replace('/login')}/></Screen>;
}
export function ForgotPasswordScreen(){const [email,setEmail]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();return <Screen title="Reset password" subtitle="Enter your account email. We will send you a reset link."><Field label="Email" value={email} autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail}/><Button title="Send reset link" busy={busy} onPress={async()=>{setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:'dineflow-customer://reset-password'});setBusy(false);if(error)Alert.alert('Could not send link',error.message);else{Alert.alert('Check your email','Open the reset link on this device.');router.push('/reset-password');}}}/><Label muted>Recovery uses email throughout this flow.</Label></Screen>}
export function ResetPasswordScreen(){const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();return <Screen title="Set new password" subtitle="Return from the email link, then choose a new password."><Field label="New password" secureTextEntry value={password} onChangeText={setPassword}/><Button title="Save password" busy={busy} onPress={async()=>{setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error)Alert.alert('Could not reset password',error.message);else{Alert.alert('Password updated');router.replace('/login');}}}/></Screen>}
