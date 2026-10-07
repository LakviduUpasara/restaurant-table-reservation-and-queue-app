import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirmPassword,setShowConfirmPassword]=useState(false);
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
  const hasLength=password.length>=6;
  const hasUppercase=/[A-Z]/.test(password);
  const hasNumber=/\d/.test(password);
  const passwordsMatch=password.length>0&&password===confirmPassword;
  const strength=[hasLength,hasUppercase,hasNumber,passwordsMatch].filter(Boolean).length;
  const passwordField=(value:string,onChangeText:(text:string)=>void,placeholder:string,visible:boolean,setVisible:(value:boolean)=>void,label:string)=>(
    <View style={passwordStyles.inputWrap}>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#929292"
        secureTextEntry={!visible}
        style={passwordStyles.input}
        value={value}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`${visible?'Hide':'Show'} ${label}`} onPress={()=>setVisible(!visible)} style={passwordStyles.eyeButton}>
        <Ionicons name={visible?'eye-outline':'eye-off-outline'} size={23} color="#3E3E3E" />
      </Pressable>
    </View>
  );

  return <SafeAreaView style={passwordStyles.screen}>
    <View style={passwordStyles.header}>
      <View style={passwordStyles.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={passwordStyles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111111" />
        </Pressable>
        <View style={passwordStyles.brandBlock}>
          <Text style={passwordStyles.brand}>Dine<Text style={passwordStyles.brandAccent}>Flow</Text></Text>
        </View>
        <View style={passwordStyles.headerSpacer} />
      </View>
      <Text style={passwordStyles.welcome}>Welcome <Text style={passwordStyles.welcomeName}>{profile?.full_name?.split(' ')[0] ?? 'there'}</Text></Text>
    </View>
    <ScrollView
      style={passwordStyles.content}
      contentContainerStyle={passwordStyles.contentInner}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={passwordStyles.title}>Update Password</Text>
      <Text style={passwordStyles.subtitle}>Create a strong password you have not used before.</Text>
      <View style={passwordStyles.card}>
        <Text style={passwordStyles.label}>New password</Text>
        {passwordField(password,setPassword,'Enter new password',showPassword,setShowPassword,'New password')}
        <Text style={passwordStyles.label}>Confirm new password</Text>
        {passwordField(confirmPassword,setConfirmPassword,'Re-enter new password',showConfirmPassword,setShowConfirmPassword,'Confirm new password')}
        <View style={passwordStyles.strengthBars}>
          {[0,1,2,3].map(index=><View key={index} style={[passwordStyles.strengthBar,index<strength&&passwordStyles.strengthBarActive]} />)}
        </View>
        <Text style={passwordStyles.strengthTitle}>{strength>=3?'Strong password':'Password strength'}</Text>
        <PasswordRule valid={hasLength} text="At least 6 characters" />
        <PasswordRule valid={hasUppercase} text="One uppercase letter" />
        <PasswordRule valid={hasNumber} text="One number" />
        <PasswordRule valid={passwordsMatch} text="New and confirm passwords match" />
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
    </ScrollView>
  </SafeAreaView>
}

function PasswordRule({ valid, text }: { valid: boolean; text: string }) {
  return <View style={passwordStyles.rule}><View style={[passwordStyles.ruleIcon, !valid&&passwordStyles.ruleIconInactive]}><Ionicons name={valid?'checkmark':'ellipse-outline'} size={16} color="#FFFFFF" /></View><Text style={passwordStyles.ruleText}>{text}</Text></View>;
}

const passwordStyles=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#262626'},
  header:{height:112,paddingHorizontal:22,paddingTop:5,backgroundColor:'#262626'},
  headerRow:{height:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  backButton:{width:34,height:34,borderRadius:17,backgroundColor:'#F1F1F1',alignItems:'center',justifyContent:'center'},
  brandBlock:{flex:1,marginLeft:0,alignItems:'center'},
  brand:{fontFamily:'Inter_800ExtraBold',color:'#FFFFFF',fontSize:23,fontStyle:'italic'},
  brandAccent:{color:'#EDB813'},
  welcome:{fontFamily:'Inter_400Regular',color:'#FFFFFF',fontSize:15,lineHeight:20,fontWeight:'700',textAlign:'center',marginTop:5},
  welcomeName:{fontFamily:'Inter_700Bold'},
  headerSpacer:{width:34},
  content:{flex:1,backgroundColor:'#FFFFFF',borderTopLeftRadius:48,borderTopRightRadius:48},
  contentInner:{paddingHorizontal:25,paddingTop:30,paddingBottom:28},
  title:{fontFamily:'Inter_800ExtraBold',color:'#111111',fontSize:28,lineHeight:36,fontWeight:'800'},
  subtitle:{fontFamily:'Inter_400Regular',color:'#777777',fontSize:16,lineHeight:23,marginTop:4},
  card:{paddingTop:30,backgroundColor:'#FFFFFF'},
  cardHint:{fontFamily:'Inter_400Regular',color:'#555555',fontSize:14,lineHeight:20,marginBottom:20},
  label:{fontFamily:'Inter_700Bold',color:'#242424',fontSize:16,lineHeight:22,fontWeight:'700',marginBottom:8},
  inputWrap:{height:56,marginBottom:17,position:'relative'},
  input:{fontFamily:'Inter_400Regular',height:56,borderWidth:1,borderColor:'#E6E6E6',backgroundColor:'#F5F5F5',borderRadius:14,paddingHorizontal:16,paddingRight:52,color:'#161616',fontSize:16},
  eyeButton:{position:'absolute',right:0,top:0,width:52,height:56,alignItems:'center',justifyContent:'center'},
  strengthBars:{flexDirection:'row',gap:7,marginTop:4},
  strengthBar:{flex:1,height:8,borderRadius:4,backgroundColor:'#E1E1E1'},
  strengthBarActive:{backgroundColor:'#EDB813'},
  strengthTitle:{fontFamily:'Inter_700Bold',color:'#C18E00',fontSize:16,lineHeight:22,marginTop:14,marginBottom:12},
  rule:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  ruleIcon:{width:24,height:24,borderRadius:12,backgroundColor:'#EDB813',alignItems:'center',justifyContent:'center'},
  ruleIconInactive:{backgroundColor:'#BDBDBD'},
  ruleText:{fontFamily:'Inter_400Regular',color:'#363636',fontSize:14,lineHeight:20,flex:1},
  error:{fontFamily:'Inter_400Regular',color:'#B42318',fontSize:14,lineHeight:20,marginTop:2,marginBottom:10},
  saveButton:{height:56,borderRadius:28,backgroundColor:'#EDB813',alignItems:'center',justifyContent:'center',marginTop:8},
  busy:{opacity:0.75},
  saveText:{fontFamily:'Inter_800ExtraBold',color:'#262626',fontSize:16,fontWeight:'800'},
  cancelButton:{height:56,borderRadius:28,borderWidth:2,borderColor:'#262626',alignItems:'center',justifyContent:'center',marginTop:12},
  cancelText:{fontFamily:'Inter_700Bold',color:'#262626',fontSize:16,fontWeight:'700'},
  footerNote:{fontFamily:'Inter_400Regular',color:'#777777',fontSize:14,lineHeight:20,textAlign:'center',marginTop:14,paddingHorizontal:12},
});
