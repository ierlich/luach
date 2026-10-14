function from64u(s){return new Uint8Array(Buffer.from(s,'base64url'))}
async function openSession(value){const [a,b]=String(value||'').split('.');if(!a||!b)throw Error('bad session');const keyBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.env.GOOGLE_CLIENT_SECRET));const key=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['decrypt']);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64u(a)},key,from64u(b));return new TextDecoder().decode(pt)}
function nextDay(s){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const origin=req.headers.origin;const host=req.headers.host;
 if(!origin||!host||new URL(origin).host!==host||!/^https:\/\//.test(origin))return res.status(403).json({error:'Invalid origin'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'JSON required'});
 const m=(req.headers.cookie||'').match(/(?:^|; )google_session=([^;]+)/);
 if(!m)return res.status(401).json({error:'Connect Google Calendar first'});
 let refresh;try{refresh=await openSession(m[1])}catch{return res.status(401).json({error:'Session expired'})}
 const {title,date,allDay,start,end,description,timeZone}=req.body||{};
 if(typeof title!=='string'||!title.trim()||title.length>200||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return res.status(400).json({error:'Invalid title or date'});
 if(typeof description!=='string'||description.length>5000||typeof timeZone!=='string'||timeZone.length>100)return res.status(400).json({error:'Invalid details'});
 try{new Intl.DateTimeFormat('en',{timeZone})}catch{return res.status(400).json({error:'Invalid time zone'})}
 if(!allDay&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start))return res.status(400).json({error:'Invalid event hours'});
 const event={summary:title.trim(),description};
 if(allDay){event.start={date};event.end={date:nextDay(date)}}else{event.start={dateTime:date+'T'+start+':00',timeZone};event.end={dateTime:date+'T'+end+':00',timeZone}}
 const tokenBody=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,refresh_token:refresh,grant_type:'refresh_token'});
 try{const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:tokenBody});const tok=await tr.json();if(!tr.ok)return res.status(401).json({error:'Google authorization expired'});
 const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{method:'POST',headers:{Authorization:'Bearer '+tok.access_token,'content-type':'application/json'},body:JSON.stringify(event)});const data=await r.json();if(!r.ok)return res.status(r.status===403?403:502).json({error:r.status===403?'Google write permission required':'Google could not save the event'});return res.status(201).json({id:data.id,htmlLink:data.htmlLink})}catch{return res.status(502).json({error:'Google Calendar temporarily unavailable'})}
}
