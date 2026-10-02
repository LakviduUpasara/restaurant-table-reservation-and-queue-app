import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../stores/auth.store';
import { api } from '../lib/api';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export function usePushRegistration(){const userId=useAuth(s=>s.profile?.id);const setPushToken=useAuth(s=>s.setPushToken);const router=useRouter();useEffect(()=>{if(!userId)return;const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;if(!projectId)return;
  let active=true;
  void (async()=>{try{if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'DineFlow',importance:Notifications.AndroidImportance.MAX});const current=await Notifications.getPermissionsAsync();const permission=current.status==='granted'?current:await Notifications.requestPermissionsAsync();if(permission.status!=='granted')return;const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;if(active){await api('/push-tokens',{method:'POST',body:{token}});setPushToken(token)}}catch(e){console.warn('Push registration unavailable',e)}})();
  const received=Notifications.addNotificationReceivedListener(()=>{});const pressed=Notifications.addNotificationResponseReceivedListener(response=>{if(response.notification.request.content.title==='Your table is ready')router.push('/queue/table-ready');else router.push('/notifications')});
  return()=>{active=false;received.remove();pressed.remove()};
},[userId,router,setPushToken]);}
