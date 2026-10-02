import { admin } from '../../config/supabase.js';
const sendUrl='https://exp.host/--/api/v2/push/send';
const receiptUrl='https://exp.host/--/api/v2/push/getReceipts';
export async function sendPush(userId:string,title:string,body:string){
  const {data:tokens,error}=await admin.from('push_tokens').select('token').eq('user_id',userId);
  if(error)throw error;
  for(const row of tokens??[]){
    const response=await fetch(sendUrl,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({to:row.token,title,body,sound:'default'})});
    if(!response.ok)throw new Error(`Expo Push Service returned ${response.status}`);
    const json=await response.json() as {data?:{status:string;id?:string;details?:{error?:string}}};
    if(json.data?.details?.error==='DeviceNotRegistered')await admin.from('push_tokens').delete().eq('token',row.token);
    if(json.data?.id)await admin.from('push_tickets').insert({id:json.data.id,token:row.token});
  }
}
export async function checkPushReceipts(){
  const {data,error}=await admin.from('push_tickets').select('id,token').eq('status','PENDING').limit(100);
  if(error)throw error;
  if(!data?.length)return 0;
  const response=await fetch(receiptUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:data.map(t=>t.id)})});
  if(!response.ok)throw new Error(`Expo receipt check returned ${response.status}`);
  const json=await response.json() as {data?:Record<string,{status:string;details?:{error?:string}}>};
  for(const row of data){const receipt=json.data?.[row.id];if(!receipt)continue;await admin.from('push_tickets').update({status:receipt.status,checked_at:new Date().toISOString()}).eq('id',row.id);if(receipt.details?.error==='DeviceNotRegistered')await admin.from('push_tokens').delete().eq('token',row.token)}
  return data.length;
}
