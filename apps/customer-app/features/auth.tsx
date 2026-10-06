import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Field, Screen, Label } from '@dineflow/shared';
import { useAuth } from '../stores/auth.store';
import { supabase } from '../lib/supabase';

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
export function ForgotPasswordScreen(){const [email,setEmail]=useState('');const [busy,setBusy]=useState(false);const router=useRouter();return <Screen title="Reset password" subtitle="Enter your account email. We will send you a reset link."><Field label="Email" value={email} autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail}/><Button title="Send reset link" busy={busy} onPress={async()=>{setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:'dineflow-customer://reset-password'});setBusy(false);if(error)Alert.alert('Could not send link',error.message);else{Alert.alert('Check your email','Open the reset link on this device.');router.push('/reset-password');}}}/><Label muted>Recovery uses email throughout this flow.</Label></Screen>}
export function ResetPasswordScreen(){
  const router=useRouter();
  const profile=useAuth(state=>state.profile);
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const updatePassword=async()=>{
    setError('');
    if(password.length<6){
      setError('Password must be at least 6 characters.');
      return;
    }
    if(password!==confirmPassword){
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const {error:updateError}=await supabase.auth.updateUser({password});
    setBusy(false);
    if(updateError){
      setError(updateError.message);
      return;
    }

    Alert.alert('Password updated','Your password has been updated successfully.',[
      {text:'Done',onPress:()=>router.canGoBack()?router.back():router.replace('/home')},
    ]);
  };

  const goBack=()=>router.canGoBack()?router.back():router.replace('/profile');
  return <SafeAreaView style={passwordStyles.screen}>
    <View style={passwordStyles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={passwordStyles.backButton}>
        <Text style={passwordStyles.backIcon}>‹</Text>
      </Pressable>
      <Text style={passwordStyles.headerTitle}>Update Password</Text>
      <View style={passwordStyles.headerSpacer}/>
    </View>
    <View style={passwordStyles.content}>
      <View style={passwordStyles.titleRow}>
        <View style={passwordStyles.lockIcon}>
          <Ionicons name="lock-closed-outline" size={27} color="#262626" />
        </View>
        <View style={passwordStyles.titleText}>
          <Text style={passwordStyles.title}>Update Password</Text>
          <Text style={passwordStyles.subtitle}>
            Keep your DineFlow account secure{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
          </Text>
        </View>
      </View>
      <View style={passwordStyles.card}>
        <Text style={passwordStyles.cardHint}>Choose a new password with at least 6 characters.</Text>
        <Text style={passwordStyles.label}>New password</Text>
        <TextInput
          accessibilityLabel="New password"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPassword}
          placeholder="Enter new password"
          placeholderTextColor="#929292"
          secureTextEntry
          style={passwordStyles.input}
          value={password}
        />
        <Text style={passwordStyles.label}>Confirm new password</Text>
        <TextInput
          accessibilityLabel="Confirm new password"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          placeholderTextColor="#929292"
          secureTextEntry
          style={passwordStyles.input}
          value={confirmPassword}
        />
        {error ? <Text accessibilityLiveRegion="polite" style={passwordStyles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={()=>void updatePassword()}
          style={[passwordStyles.saveButton,busy && passwordStyles.busy]}
        >
          {busy ? <ActivityIndicator color="#262626"/> : <Text style={passwordStyles.saveText}>Update Password</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={goBack} style={passwordStyles.cancelButton}>
          <Text style={passwordStyles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
      <Text style={passwordStyles.footerNote}>You can update your password again anytime from Account Settings.</Text>
    </View>
  </SafeAreaView>
}

const passwordStyles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#FFFFFF'},
  header:{height:58,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#E9E9E9'},
  backButton:{width:34,height:34,borderRadius:17,backgroundColor:'#F1F1F1',alignItems:'center',justifyContent:'center'},
  backIcon:{color:'#262626',fontSize:30,lineHeight:30,marginTop:-3},
  headerTitle:{fontFamily:'Inter_700Bold',color:'#151515',fontSize:16,fontWeight:'700'},
  headerSpacer:{width:34},
  content:{paddingHorizontal:24,paddingTop:30},
  titleRow:{flexDirection:'row',alignItems:'center',marginBottom:24},
  lockIcon:{width:52,height:52,borderRadius:16,backgroundColor:'#F8E7A8',alignItems:'center',justifyContent:'center'},
  titleText:{flex:1,marginLeft:14},
  title:{fontFamily:'Inter_800ExtraBold',color:'#111111',fontSize:23,fontWeight:'800'},
  subtitle:{fontFamily:'Inter_400Regular',color:'#777777',fontSize:14,lineHeight:20,marginTop:4},
  card:{borderWidth:1,borderColor:'#E9E9E9',borderRadius:18,padding:18,backgroundColor:'#FFFFFF'},
  cardHint:{fontFamily:'Inter_400Regular',color:'#555555',fontSize:14,lineHeight:20,marginBottom:20},
  label:{fontFamily:'Inter_700Bold',color:'#242424',fontSize:14,fontWeight:'700',marginBottom:8},
  input:{fontFamily:'Inter_400Regular',height:52,borderWidth:1,borderColor:'#D1D1D1',borderRadius:10,paddingHorizontal:14,color:'#161616',fontSize:16,marginBottom:17},
  error:{fontFamily:'Inter_400Regular',color:'#B42318',fontSize:13,lineHeight:18,marginTop:-5,marginBottom:10},
  saveButton:{height:50,borderRadius:25,backgroundColor:'#EDB813',alignItems:'center',justifyContent:'center',marginTop:2},
  busy:{opacity:0.75},
  saveText:{fontFamily:'Inter_800ExtraBold',color:'#262626',fontSize:15,fontWeight:'800'},
  cancelButton:{height:48,alignItems:'center',justifyContent:'center',marginTop:4},
  cancelText:{fontFamily:'Inter_700Bold',color:'#555555',fontSize:15,fontWeight:'700'},
  footerNote:{fontFamily:'Inter_400Regular',color:'#777777',fontSize:13,lineHeight:18,textAlign:'center',marginTop:20,paddingHorizontal:12},
});
