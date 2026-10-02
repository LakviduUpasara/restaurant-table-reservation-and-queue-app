import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Card, Heading, Label, Screen } from '@dineflow/shared';
const slides=[['Find a table','Check live availability before leaving home.'],['Skip the line','Join a virtual queue and follow your position.'],['Dine on time','Get a clear alert when your table is ready.']];
export default function Onboarding(){const [step,setStep]=useState(0);const router=useRouter();return <Screen title="Welcome to DineFlow" subtitle={`${step+1} of ${slides.length}`}><Card><Heading>{slides[step][0]}</Heading><Label>{slides[step][1]}</Label></Card><Button title={step<slides.length-1?'Next':'Create account'} onPress={()=>step<slides.length-1?setStep(step+1):router.replace('/signup')}/><Button title="Skip" kind="ghost" onPress={()=>router.replace('/login')}/></Screen>}
