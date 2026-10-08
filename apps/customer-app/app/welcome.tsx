import { useRouter } from 'expo-router';
import { Button, Card, Heading, Label, Screen } from '@dineflow/shared';
export default function Welcome(){const router=useRouter();return <Screen title="DineFlow" subtitle="Your table, right on time."><Card><Heading>Reserve with confidence</Heading><Label muted>Find availability before you travel and know when your table is ready.</Label></Card><Button title="Get started" onPress={()=>router.push('/onboarding')}/><Button title="I already have an account" kind="secondary" onPress={()=>router.push('/login')}/></Screen>}
