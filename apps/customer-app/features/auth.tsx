import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Screen, Label } from '@dineflow/shared';
import { useAuth } from '../stores/auth.store';

const loginSchema=z.object({email:z.email(),password:z.string().min(6)});
const signupSchema=loginSchema.extend({name:z.string().trim().min(2),confirm:z.string().min(6)}).refine(v=>v.password===v.confirm,{path:['confirm'],message:'Passwords do not match'});
type Login=z.infer<typeof loginSchema>; type Signup=z.infer<typeof signupSchema>;
export function LoginScreen(){const router=useRouter();const signIn=useAuth(s=>s.signIn);const [busy,setBusy]=useState(false);const {control,handleSubmit,formState:{errors}}=useForm<Login>({resolver:zodResolver(loginSchema),defaultValues:{email:'',password:''}});
  const submit=handleSubmit(async v=>{setBusy(true);try{await signIn(v.email,v.password);router.replace('/home');}catch(e){Alert.alert('Sign in failed',String((e as Error).message));}finally{setBusy(false);}});
  return <Screen title="Welcome back" subtitle="Sign in to book a table and follow your place in the queue."><Controller control={control} name="email" render={({field})=><Field label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message}/>}/><Controller control={control} name="password" render={({field})=><Field label="Password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message}/>}/><Button title="Log in" onPress={submit} busy={busy}/><Button title="Create account" kind="secondary" onPress={()=>router.push('/signup')}/><Button title="Forgot password?" kind="ghost" onPress={()=>router.push('/forgot-password')}/></Screen>;
}
export function SignupScreen(){const router=useRouter();const signUp=useAuth(s=>s.signUp);const [busy,setBusy]=useState(false);const {control,handleSubmit,formState:{errors}}=useForm<Signup>({resolver:zodResolver(signupSchema),defaultValues:{name:'',email:'',password:'',confirm:''}});
  const submit=handleSubmit(async v=>{setBusy(true);try{await signUp(v.email,v.password,v.name);Alert.alert('Account created','Confirm your email if requested, then sign in.');router.replace('/login');}catch(e){Alert.alert('Sign up failed',String((e as Error).message));}finally{setBusy(false);}});
  return <Screen title="Create your account" subtitle="A few details and you are ready to dine."><Controller control={control} name="name" render={({field})=><Field label="Full name" value={field.value} onChangeText={field.onChange} error={errors.name?.message}/>}/><Controller control={control} name="email" render={({field})=><Field label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message}/>}/><Controller control={control} name="password" render={({field})=><Field label="Password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message}/>}/><Controller control={control} name="confirm" render={({field})=><Field label="Confirm password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirm?.message}/>}/><Button title="Sign up" onPress={submit} busy={busy}/><Button title="Already have an account? Log in" kind="ghost" onPress={()=>router.replace('/login')}/></Screen>;
}
export { ForgotPasswordScreen, ResetPasswordScreen } from './auth-recovery';
