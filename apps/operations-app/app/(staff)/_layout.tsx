import { Redirect, Stack } from 'expo-router';
import { Screen, State } from '@dineflow/shared';
import { useAuth } from '../../stores/auth.store';
export default function StaffLayout(){const {ready,profile,error,refresh}=useAuth();if(!ready)return <Screen><State loading/></Screen>;if(error)return <Screen title="Connection problem"><State error={error} onRetry={()=>void refresh()}/></Screen>;if(!profile||!['STAFF','OWNER'].includes(profile.role))return <Redirect href="/login"/>;return <Stack screenOptions={{headerShown:false}}/>}
