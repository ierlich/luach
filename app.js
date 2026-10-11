const H='https://www.hebcal.com',GOOGLE_CLIENT_ID='739551110627-ftda0amfofrrvah9kcjk6nsorh305bfj.apps.googleusercontent.com';let view=new Date();view.setDate(1);let selectedDate=null,googleAccessToken=null,googleTokenClient=null,googleAutoTried=false;let loc=JSON.parse(localStorage.getItem('luachLoc')||'null')||{name:'Vienna, Austria',lat:48.2082,lon:16.3738,tz:'Europe/Vienna'};let jewish=[],gEvents=[];let settings=JSON.parse(localStorage.getItem('luachSettings')||'null')||{shmaMethod:'gra',tfillaMethod:'gra',alotMethod:'hebcal',tzeitMethod:'7083'};
const $=s=>document.querySelector(s), pad=n=>String(n).padStart(2,'0'), iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, fmtTime=s=>s?new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:loc.tz}).format(new Date(s)):'—';
async function j(url){let r=await fetch(url);if(!r.ok)throw Error(r.status);return r.json()}
const monthCache=new Map(),monthPending=new Map();let loadSequence=0;
function monthKey(y,m){return y+'-'+pad(m)}
function monthUrl(y,m){return H+'/hebcal?v=1&cfg=json&start='+iso(new Date(y,m-1,1))+'&end='+iso(new Date(y,m,0))+'&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&s=on&D=on&d=on&o=on&lg=he'}
function readMonth(y,m){const key=monthKey(y,m);if(monthCache.has(key))return monthCache.get(key);try{const raw=localStorage.getItem('luach-month-'+key);if(raw){const data=JSON.parse(raw);monthCache.set(key,data);return data}}catch{}return null}
async function fetchMonth(y,m){const key=monthKey(y,m),existing=readMonth(y,m);if(existing)return existing;if(monthPending.has(key))return monthPending.get(key);const pending=j(monthUrl(y,m)).then(data=>{const items=data.items||[];monthCache.set(key,items);try{localStorage.setItem('luach-month-'+key,JSON.stringify(items))}catch{}return items}).finally(()=>monthPending.delete(key));monthPending.set(key,pending);return pending}
function prefetchMonths(){const y=view.getFullYear(),m=view.getMonth();const order=[];for(let distance=1;distance<=12;distance++){for(const delta of [distance,-distance]){const d=new Date(y,m+delta,1);order.push([d.getFullYear(),d.getMonth()+1])}}let i=0;const worker=async()=>{while(i<order.length){const [year,month]=order[i++];try{await fetchMonth(year,month)}catch{}}};Promise.all([worker(),worker()]).catch(()=>{})}
let prefetchStarted=false;
async function load(){const seq=++loadSequence;$('#locationName').textContent=loc.name.split(',')[0];const y=view.getFullYear(),m=view.getMonth()+1,start=new Date(y,m-1,1),end=new Date(y,m,0);jewish=readMonth(y,m)||[];gEvents=[];render();loadToday();if(!prefetchStarted){prefetchStarted=true;setTimeout(prefetchMonths,500)}try{const items=await fetchMonth(y,m);if(seq===loadSequence){jewish=items;render()}}catch(e){console.warn('Calendar month unavailable',e)}if(googleAccessToken){await loadGoogleEvents(start,end);if(seq===loadSequence)render()}}
function selectedInView(){const anchor=selectedDate?new Date(selectedDate+'T12:00:00'):new Date();const day=Math.min(anchor.getDate(),new Date(view.getFullYear(),view.getMonth()+1,0).getDate());selectedDate=iso(new Date(view.getFullYear(),view.getMonth(),day));}
function evFor(date){return jewish.filter(x=>x.date===date)}
function hebYear(n){const ones=['','א','ב','ג','ד','ה','ו','ז','ח','ט'],tens=['','','כ','ל','מ','נ','ס','ע','פ','צ'],hundreds=['','ק','ר','ש','ת'];let x=Number(n)%1000,out='';while(x>=400){out+='ת';x-=400}if(x>=100){out+=hundreds[Math.floor(x/100)];x%=100}if(x===15)out+='טו';else if(x===16)out+='טז';else{if(x>=10){out+=tens[Math.floor(x/10)];x%=10}out+=ones[x]||''}return out.length>1?out.slice(0,-1)+'״'+out.slice(-1):out+'׳'}
const hebNums=['','א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ז׳','ח׳','ט׳','י׳','י״א','י״ב','י״ג','י״ד','ט״ו','ט״ז','י״ז','י״ח','י״ט','כ׳','כ״א','כ״ב','כ״ג','כ״ד','כ״ה','כ״ו','כ״ז','כ״ח','כ״ט','ל׳'];function hebFor(date){let d=new Date(date+'T12:00:00');try{let p=new Intl.DateTimeFormat('en-u-ca-hebrew',{day:'numeric'}).formatToParts(d),day=parseInt(p.find(x=>x.type==='day')?.value,10),month=new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{month:'long'}).format(d).replace(/^ב/,'');return ((hebNums[day]||day)+' '+month).trim()}catch{return ''}}
function monthHeading(){let y=view.getFullYear(),m=view.getMonth(),mid=new Date(y,m,15),greg=new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(mid),parts=new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{month:'long',year:'numeric'}).formatToParts(mid),hm=parts.find(p=>p.type==='month')?.value||'',hy=parts.find(p=>p.type==='year')?.value||'';return `${greg} · ${hm} ${hebYear(hy)}`}function buildMonthGrid(monthDate,items,events,chosen){let y=monthDate.getFullYear(),m=monthDate.getMonth();let first=new Date(y,m,1),last=new Date(y,m+1,0),offset=first.getDay(),cells=[];for(let i=-offset;i<42-offset;i++){let d=new Date(y,m,1+i),date=iso(d),ev=items.filter(x=>x.date===date),h=hebFor(date),holiday=ev.find(e=>['holiday','roshchodesh','fast'].includes(e.category));let cls='day'+(d.getMonth()!=m?' out':'')+(date===iso(new Date())?' today':'')+(chosen===date?' selected-date':'');let ges=events.filter(e=>(e.start?.date||e.start?.dateTime||'').startsWith(date)),dayOnly=(h||'').split(' ')[0];cells.push(`<div class="${cls}" data-date="${date}"><div class="gdate">${d.getDate()}</div><div class="hdate">${dayOnly}</div>${holiday?`<div class="holiday">${holiday.hebrew||holiday.title}</div>`:''}${ges.slice(0,2).map(e=>`<div class="googleEvent">${e.summary||'(ללא כותרת)'}</div>`).join('')}${ges.length>2?`<div class="moreEvents">+${ges.length-2}</div>`:''}</div>`)}return cells.join('')}
function render(){$('#calendarTitle').textContent=monthHeading();$('#grid').innerHTML=buildMonthGrid(view,jewish,gEvents,selectedDate);document.querySelectorAll('#grid .day').forEach(el=>el.onclick=()=>{selectedDate=el.dataset.date;render();loadToday();openDay(el.dataset.date)})}
async function loadToday(){let d=selectedDate?new Date(selectedDate+'T12:00:00'):new Date(),date=iso(d),sat=new Date(d);sat.setDate(d.getDate()+((6-d.getDay()+7)%7));let satDate=iso(sat);try{let [conv,dafCal,weekCal]=await Promise.all([j(`${H}/converter?cfg=json&g2h=1&date=${date}`),j(`${H}/hebcal?v=1&cfg=json&start=${date}&end=${date}&F=on&lg=he`),j(`${H}/hebcal?v=1&cfg=json&start=${date}&end=${satDate}&s=on&maj=on&lg=he`)]);$('#todayHeb').textContent=conv.hebrew;$('#todayGreg').textContent=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);let daf=dafCal.items?.find(x=>x.category==='dafyomi'||/Daf Yomi/i.test(x.title||'')),parasha=weekCal.items?.find(x=>x.category==='parashat');$('#todayLearning').textContent=daf?`דף היומי: ${daf.hebrew||daf.title}`:'דף היומי: —';$('#todayParasha').textContent=parasha?`פרשת השבוע: ${(parasha.hebrew||parasha.title).replace(/^פרשת\\s+/,'').replace(/^Parashat\\s+/i,'')}`:'פרשת השבוע: —'}catch(e){$('#todayLearning').textContent='דף היומי: לא זמין';$('#todayParasha').textContent='פרשת השבוע: לא זמינה'}}
async function openDay(date){let d=new Date(date+'T12:00:00');let [conv,z,cal]=await Promise.all([j(`${H}/converter?cfg=json&g2h=1&date=${date}`),j(`${H}/zmanim?cfg=json&date=${date}&latitude=${loc.lat}&longitude=${loc.lon}&tzid=${encodeURIComponent(loc.tz)}`),j(`${H}/hebcal?v=1&cfg=json&start=${date}&end=${date}&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&s=on&D=on&d=on&o=on&lg=he`)]);let t=z.times,daf=cal.items?.find(x=>x.category==='dafyomi'),events=cal.items?.filter(x=>x.category!=='dafyomi')||[],ge=gEvents.filter(e=>(e.start?.date||e.start?.dateTime||'').startsWith(date));let rows=[];if(settings.alotMethod==='hebcal'||settings.alotMethod==='both')rows.push(['עלות השחר',t.alotHaShachar]);if(settings.alotMethod==='dawn'||settings.alotMethod==='both')rows.push(['דמדומי בוקר',t.dawn]);rows.push(['משיכיר',t.misheyakir],['זריחה',t.sunrise]);if(settings.shmaMethod==='gra'||settings.shmaMethod==='both')rows.push(['סוף זמן ק״ש גר״א',t.sofZmanShma]);if(settings.shmaMethod==='mga'||settings.shmaMethod==='both')rows.push(['סוף זמן ק״ש מג״א',t.sofZmanShmaMGA]);if(settings.tfillaMethod==='gra'||settings.tfillaMethod==='both')rows.push(['סוף זמן תפילה גר״א',t.sofZmanTfilla]);if(settings.tfillaMethod==='mga'||settings.tfillaMethod==='both')rows.push(['סוף זמן תפילה מג״א',t.sofZmanTfillaMGA]);rows.push(['חצות',t.chatzot],['מנחה גדולה',t.minchaGedola],['מנחה קטנה',t.minchaKetana],['פלג המנחה',t.plagHaMincha],['שקיעה',t.sunset]);if(settings.tzeitMethod==='7083'||settings.tzeitMethod==='both')rows.push(['צאת הכוכבים 7.083°',t.tzeit7083deg]);if(settings.tzeitMethod==='dusk'||settings.tzeitMethod==='both')rows.push(['דמדומי ערב',t.dusk]);$('#dayContent').innerHTML=`<h2>${conv.hebrew}</h2><div>${new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}</div>${daf?`<h3>📖 דף היומי</h3><p>${daf.hebrew||daf.title}</p>`:''}${events.length?`<h3>✡️ בלוח</h3>${events.map(e=>`<p>${e.hebrew||e.title}</p>`).join('')}`:''}${ge.length?`<h3>🗓️ Google Calendar</h3>${ge.map(e=>`<p>${e.summary||'(ללא כותרת)'}</p>`).join('')}`:''}<h3>☀️ זמני היום · ${loc.name}</h3><div class="zmanim">${rows.map(([n,v])=>`<div class="z"><span>${n}</span><strong>${fmtTime(v)}</strong></div>`).join('')}</div>`;$('#dayDialog').showModal()}
$('#prev').onclick=()=>{view.setMonth(view.getMonth()-1);selectedInView();load()};$('#next').onclick=()=>{view.setMonth(view.getMonth()+1);selectedInView();load()};$('#todayBtn').onclick=()=>{selectedDate=iso(new Date());view=new Date();view.setDate(1);load()};$('#locationBtn').onclick=()=>{$('#menuDialog').close();$('#locationDialog').showModal()};
function openSettings(){['shmaMethod','tfillaMethod','alotMethod','tzeitMethod'].forEach(k=>$('#'+k).value=settings[k]);$('#settingsDialog').showModal()}$('#menuBtn').onclick=()=>$('#menuDialog').showModal();$('#menuSettingsBtn').onclick=()=>{$('#menuDialog').close();openSettings()};$('#saveSettings').onclick=()=>{settings={shmaMethod:$('#shmaMethod').value,tfillaMethod:$('#tfillaMethod').value,alotMethod:$('#alotMethod').value,tzeitMethod:$('#tzeitMethod').value};localStorage.setItem('luachSettings',JSON.stringify(settings));$('#settingsDialog').close()};
$('#locationForm').onsubmit=async e=>{e.preventDefault();let q=$('#cityInput').value.trim();$('#locationResults').textContent='מחפש…';try{let data=await j(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=he&format=json`);let rs=data.results||[];$('#locationResults').innerHTML=rs.map((r,i)=>`<button class="primary loc" data-i="${i}">${r.name}${r.admin1?', '+r.admin1:''}, ${r.country}</button>`).join('')||'לא נמצאו תוצאות';document.querySelectorAll('.loc').forEach(b=>b.onclick=()=>{let r=rs[+b.dataset.i];loc={name:`${r.name}, ${r.country}`,lat:r.latitude,lon:r.longitude,tz:r.timezone};localStorage.setItem('luachLoc',JSON.stringify(loc));$('#locationDialog').close();load()})}catch{$('#locationResults').textContent='שגיאה בחיפוש'}};

async function resolveGpsCity(latitude,longitude){
 const params='latitude='+encodeURIComponent(latitude)+'&longitude='+encodeURIComponent(longitude);
 try{
  const response=await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?'+params+'&localityLanguage=he');
  if(response.ok){const data=await response.json();const city=data.city||data.locality||data.localityInfo?.administrative?.find(p=>['city','town','municipality'].includes((p.adminLevel||'').toLowerCase()))?.name;if(city)return {name:city,tz: data.timezone||null}}
 }catch(e){console.warn('Primary reverse geocoding unavailable',e)}
 try{
  const response=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+encodeURIComponent(latitude)+'&lon='+encodeURIComponent(longitude)+'&zoom=10&addressdetails=1&accept-language=he');
  if(response.ok){const data=await response.json(),a=data.address||{};const city=a.city||a.town||a.village||a.municipality||a.county;if(city)return {name:city,tz:null}}
 }catch(e){console.warn('Fallback reverse geocoding unavailable',e)}
 return null
}
$('#useCurrentLocation').onclick=()=>{
 const status=$('#geoStatus'),button=$('#useCurrentLocation');
 if(!navigator.geolocation){status.textContent='המכשיר אינו תומך בזיהוי מיקום.';return}
 status.textContent='מזהה את המיקום שלך…';button.disabled=true;
 navigator.geolocation.getCurrentPosition(async pos=>{
  const {latitude,longitude}=pos.coords;
  status.textContent='מאתר את שם העיר…';
  const city=await resolveGpsCity(latitude,longitude);
  if(!city){button.disabled=false;status.textContent='המיקום זוהה, אך לא ניתן לזהות את שם העיר. נסה שוב או בחר עיר בחיפוש.';return}
  loc={name:city.name,lat:latitude,lon:longitude,tz:city.tz||Intl.DateTimeFormat().resolvedOptions().timeZone||loc.tz};
  localStorage.setItem('luachLoc',JSON.stringify(loc));
  button.disabled=false;status.textContent='נבחרה העיר: '+city.name;
  $('#locationName').textContent=city.name;
  $('#locationDialog').close();load().catch(console.error)
 },err=>{
  button.disabled=false;
  status.textContent=err.code===1?'לא ניתנה הרשאת מיקום. אפשר לאשר אותה בהגדרות האתר.':err.code===3?'זיהוי המיקום נמשך יותר מדי זמן. נסה שוב.':'לא ניתן לזהות את המיקום כרגע. נסה שוב.'
 },{enableHighAccuracy:false,timeout:15000,maximumAge:300000})
};

const GOOGLE_BACKEND=location.hostname.endsWith('vercel.app')?'':'https://luach-six.vercel.app';
function updateGoogleUI(connected){$('#googleConnectBtn').hidden=connected;$('#googleDisconnectBtn').hidden=!connected;$('#googleStatus').textContent=connected?'מחובר. אירועי Google מוצגים בלוח.':'לא מחובר';$('#googleBtn').textContent=connected?'🗓️ Google Calendar ✓':'🗓️ Google Calendar'}
async function loadGoogleEvents(start,end){try{let from=new Date(start),to=new Date(end);to.setDate(to.getDate()+1);let r=await fetch(GOOGLE_BACKEND+'/api/google/events?start='+encodeURIComponent(from.toISOString())+'&end='+encodeURIComponent(to.toISOString()),{credentials:'include'});if(r.status===401){googleAccessToken=null;gEvents=[];updateGoogleUI(false);return}if(!r.ok)throw Error(r.status);let data=await r.json();gEvents=data.items||[];googleAccessToken='server';updateGoogleUI(true)}catch(e){gEvents=[];$('#googleStatus').textContent='לא הצלחתי לטעון את אירועי Google Calendar.'}}
$('#googleBtn').onclick=()=>{$('#menuDialog').close();$('#googleDialog').showModal()};
$('#googleConnectBtn').onclick=()=>{location.href=GOOGLE_BACKEND+'/api/google/auth'};
$('#googleDisconnectBtn').onclick=async()=>{await fetch(GOOGLE_BACKEND+'/api/google/logout',{credentials:'include'}).catch(()=>{});googleAccessToken=null;gEvents=[];updateGoogleUI(false);render()};
async function restoreGoogle(){let y=view.getFullYear(),m=view.getMonth(),start=new Date(y,m,1),end=new Date(y,m+1,0);await loadGoogleEvents(start,end);if(googleAccessToken)render()}
const gMonths=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],hMonths=[['Nisan','ניסן'],['Iyyar','אייר'],['Sivan','סיון'],['Tamuz','תמוז'],['Av','אב'],['Elul','אלול'],['Tishrei','תשרי'],['Cheshvan','חשוון'],['Kislev','כסלו'],['Tevet','טבת'],['Shvat','שבט'],['Adar','אדר'],['Adar I','אדר א׳'],['Adar II','אדר ב׳']];
function fillSelect(el,items,selected){el.innerHTML=items.map(x=>{let v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return `<option value="${v}"${String(v)===String(selected)?' selected':''}>${l}</option>`}).join('')}
function initGoTo(){let n=new Date(),hy=Number(new Intl.DateTimeFormat('en-u-ca-hebrew',{year:'numeric'}).formatToParts(n).find(p=>p.type==='year')?.value)||5787;fillSelect($('#gDay'),Array.from({length:31},(_,i)=>i+1),n.getDate());fillSelect($('#gMonth'),gMonths.map((x,i)=>[i+1,x]),n.getMonth()+1);fillSelect($('#gYear'),Array.from({length:201},(_,i)=>n.getFullYear()-100+i),n.getFullYear());fillSelect($('#hDay'),Array.from({length:30},(_,i)=>i+1),1);fillSelect($('#hMonth'),hMonths,'Tishrei');fillSelect($('#hYear'),Array.from({length:201},(_,i)=>hy-100+i),hy)}
$('#goToBtn').onclick=()=>{$('#menuDialog').close();initGoTo();$('#goToDialog').showModal()};$('#goCalendar').onchange=()=>{let heb=$('#goCalendar').value==='heb';$('#gregFields').hidden=heb;$('#hebFields').hidden=!heb};
$('#goSubmit').onclick=async()=>{let d;$('#goStatus').textContent='טוען…';try{if($('#goCalendar').value==='greg'){d=new Date(+$('#gYear').value,+$('#gMonth').value-1,+$('#gDay').value);if(d.getDate()!=+$('#gDay').value)throw Error('invalid')}else{let q=`${H}/converter?cfg=json&h2g=1&hy=${$('#hYear').value}&hm=${encodeURIComponent($('#hMonth').value)}&hd=${$('#hDay').value}`,x=await j(q);d=new Date(x.gy,x.gm-1,x.gd)}selectedDate=iso(d);view=new Date(d.getFullYear(),d.getMonth(),1);$('#goToDialog').close();await load();setTimeout(()=>{let el=document.querySelector(`.day[data-date="${iso(d)}"]`);if(el){el.classList.add('gotoFlash');el.scrollIntoView({block:'center',behavior:'smooth'})}},80)}catch{$('#goStatus').textContent='לא ניתן לעבור לתאריך הזה. בדוק את הבחירה.'}};
// Experimental two-sheet swipe: both independent calendar grids move together.
let touchStart=null,swiping=false,animating=false,activeSwipe=null;
const calendar=$('.calendar'),swipeViewport=$('.calendarSwipeViewport');
function createSwipeSheet(horizontal,delta,sign){
 const target=new Date(view.getFullYear()+(horizontal?delta:0),view.getMonth()+(horizontal?0:delta),1);
 const width=swipeViewport.clientWidth,height=calendar.offsetHeight;
 const distance=horizontal?width:height;
 const next=calendar.cloneNode(true);
 next.removeAttribute('id');next.className='calendar swipe-sheet incoming-sheet';
 const grid=next.querySelector('.grid');grid.removeAttribute('id');
 grid.innerHTML=buildMonthGrid(target,readMonth(target.getFullYear(),target.getMonth()+1)||[],[],null);
 swipeViewport.style.height=height+'px';
 calendar.classList.add('swipe-sheet','outgoing-sheet');
 swipeViewport.appendChild(next);
 const gesture={target,horizontal,sign,distance,next,offset:0};
 setSwipeOffset(gesture,0);
 return gesture
}
function setSwipeOffset(gesture,offset){
 const {horizontal,sign,distance,next}=gesture;
 gesture.offset=offset;
 const incoming=offset-sign*distance;
 calendar.style.transform=horizontal?'translate3d('+offset+'px,0,0)':'translate3d(0,'+offset+'px,0)';
 next.style.transform=horizontal?'translate3d('+incoming+'px,0,0)':'translate3d(0,'+incoming+'px,0)'
}
function cleanSwipe(gesture){
 gesture.next.remove();
 calendar.classList.remove('swipe-sheet','outgoing-sheet');
 calendar.style.transform='';calendar.style.transition='';
 swipeViewport.style.height=''
}
calendar.addEventListener('touchstart',e=>{
 if(e.touches.length!==1||animating)return;
 const t=e.touches[0];touchStart={x:t.clientX,y:t.clientY};swiping=false;activeSwipe=null
},{passive:true});
calendar.addEventListener('touchmove',e=>{
 if(!touchStart||e.touches.length!==1||animating)return;
 const t=e.touches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;
 if(!activeSwipe&&Math.hypot(dx,dy)>12){
  const horizontal=Math.abs(dx)>Math.abs(dy),sign=(horizontal?dx:dy)>0?1:-1;
  const delta=horizontal?sign:-sign;
  activeSwipe=createSwipeSheet(horizontal,delta,sign);
  swiping=true
 }
 if(activeSwipe){
  e.preventDefault();
  const raw=activeSwipe.horizontal?dx:dy;
  setSwipeOffset(activeSwipe,activeSwipe.sign*Math.min(activeSwipe.distance,Math.max(0,raw*activeSwipe.sign)))
 }
},{passive:false});
function endSwipe(e,cancelled=false){
 if(!touchStart)return;
 const gesture=activeSwipe;touchStart=null;activeSwipe=null;
 if(!gesture)return;
 const accepted=!cancelled&&Math.abs(gesture.offset)>=Math.min(gesture.distance*.24,110);
 animating=true;
 calendar.style.transition='transform 200ms ease-out';
 gesture.next.style.transition='transform 200ms ease-out';
 requestAnimationFrame(()=>setSwipeOffset(gesture,accepted?gesture.sign*gesture.distance:0));
 setTimeout(()=>{
  if(accepted){
   // Commit the target only after the incoming sheet has covered the viewport.
   view=gesture.target;selectedInView();
   // Keep the incoming sheet visible while the main grid updates.
   calendar.style.visibility='hidden';
   cleanSwipe(gesture);
   load().catch(console.error);
   calendar.style.visibility='';
  }else cleanSwipe(gesture);
  animating=false;
  setTimeout(()=>{swiping=false},80)
 },220)
}
calendar.addEventListener('touchend',e=>endSwipe(e),{passive:true});
calendar.addEventListener('touchcancel',e=>endSwipe(e,true),{passive:true});
calendar.addEventListener('click',e=>{if(swiping||animating){e.preventDefault();e.stopPropagation()}},true);

selectedDate=iso(new Date());if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');load().catch(console.error);restoreGoogle();
