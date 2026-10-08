import { admin } from '../../config/supabase.js';
const sendUrl='https://exp.host/--/api/v2/push/send';
const receiptUrl='https://exp.host/--/api/v2/push/getReceipts';
const receiptRetryMs=15*60*1000;

type PushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

async function removePushToken(token:string) {
  const {error}=await admin.from('push_tokens').delete().eq('token',token);
  if(error)throw error;
}

export async function sendPush(userId:string,title:string,body:string){
  const {data:tokens,error}=await admin.from('push_tokens').select('token').eq('user_id',userId);
  if(error)throw error;
  const failures:string[]=[];
  for(const [index,row] of (tokens??[]).entries()){
    try {
      const response=await fetch(sendUrl,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({to:row.token,title,body,sound:'default'})});
      if(!response.ok)throw new Error(`Expo Push Service returned ${response.status}`);
      const json=await response.json() as {data?:PushTicket};
      const ticket=json.data;
      if(!ticket)throw new Error('Expo Push Service returned no ticket');
      if(ticket.status==='error'){
        if(ticket.details?.error==='DeviceNotRegistered')await removePushToken(row.token);
        throw new Error(ticket.message??ticket.details?.error??'Expo rejected the push notification');
      }
      if(ticket.id){
        const {error:ticketError}=await admin.from('push_tickets').insert({id:ticket.id,token:row.token});
        if(ticketError)throw ticketError;
      }
    } catch(error) {
      failures.push(`Device ${index+1}: ${String((error as Error).message)}`);
    }
  }
  if(failures.length)throw new Error(`Push delivery failed for ${failures.length} device(s): ${failures.join('; ')}`);
}

export async function checkPushReceipts(){
  const retryBefore=new Date(Date.now()-receiptRetryMs).toISOString();
  const {data,error}=await admin.from('push_tickets')
    .select('id,token')
    .eq('status','PENDING')
    .or(`checked_at.is.null,checked_at.lt.${retryBefore}`)
    .order('checked_at',{ascending:true,nullsFirst:true})
    .limit(100);
  if(error)throw error;
  if(!data?.length)return 0;
  const response=await fetch(receiptUrl,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({ids:data.map(t=>t.id)})});
  if(!response.ok)throw new Error(`Expo receipt check returned ${response.status}`);
  const json=await response.json() as {data?:Record<string,{status:string;details?:{error?:string}}>};
  for(const row of data){
    const receipt=json.data?.[row.id];
    if(!receipt){
      const {error:updateError}=await admin.from('push_tickets')
        .update({checked_at:new Date().toISOString()})
        .eq('id',row.id)
        .eq('status','PENDING');
      if(updateError)throw updateError;
      continue;
    }
    const {error:updateError}=await admin.from('push_tickets')
      .update({status:receipt.status,checked_at:new Date().toISOString()})
      .eq('id',row.id);
    if(updateError)throw updateError;
    if(receipt.details?.error==='DeviceNotRegistered')await removePushToken(row.token);
  }
  return data.length;
}
