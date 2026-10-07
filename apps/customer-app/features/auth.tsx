import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Field, Screen, Label } from '@dineflow/shared';
import { supabase } from '../lib/supabase';

export { LoginScreen, SignupScreen } from './login';

export function ForgotPasswordScreen(){const [email,setEmail]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();return <Screen title="Reset password" subtitle="Enter your account email. We will send you a reset link."><Field label="Email" value={email} autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail}/><Button title="Send reset link" busy={busy} onPress={async()=>{setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:'dineflow-customer://reset-password'});setBusy(false);if(error)Alert.alert('Could not send link',error.message);else{Alert.alert('Check your email','Open the reset link on this device.');router.push('/reset-password');}}}/><Label muted>Recovery uses email throughout this flow.</Label></Screen>}
export function ResetPasswordScreen(){const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();return <Screen title="Set new password" subtitle="Return from the email link, then choose a new password."><Field label="New password" secureTextEntry value={password} onChangeText={setPassword}/><Button title="Save password" busy={busy} onPress={async()=>{setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error)Alert.alert('Could not reset password',error.message);else{Alert.alert('Password updated');router.replace('/login');}}}/></Screen>}
