import { Redirect } from 'expo-router';
import { State, Screen } from '@dineflow/shared';
import { useAuth } from '../stores/auth.store';
export default function Index(){const {ready,profile,error,refresh}=useAuth();if(!ready)return <Screen><State loading/></Screen>;if(error)return <Screen title="Connection problem"><State error={error} onRetry={()=>void refresh()}/></Screen>;return <Redirect href={profile?.role==='OWNER'? '/(owner)/dashboard' : profile?.role==='STAFF'? '/(staff)/dashboard' : '/login'}/>}
