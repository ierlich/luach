const H='https://www.hebcal.com',GOOGLE_CLIENT_ID='739551110627-ftda0amfofrrvah9kcjk6nsorh305bfj.apps.googleusercontent.com';let view=new Date();view.setDate(1);let selectedDate=null,googleAccessToken=null,googleTokenClient=null,googleAutoTried=false;let loc=JSON.parse(localStorage.getItem('luachLoc')||'null')||{name:'Vienna, Austria',lat:48.2082,lon:16.3738,tz:'Europe/Vienna'};let jewish=[],gEvents=[];let settings=JSON.parse(localStorage.getItem('luachSettings')||'null')||{shmaMethod:'gra',tfillaMethod:'gra',alotMethod:'hebcal',tzeitMethod:'7083'};
const $=s=>document.querySelector(s), pad=n=>String(n).padStart(2,'0'), iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`, fmtTime=s=>s?new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:loc.tz}).format(new Date(s)):'—';
// Fixed 72-minute MGA day: dawn = sunrise - 72m, nightfall = sunset + 72m.
function mga72Times(t){
 const rise=Date.parse(t.sunrise),set=Date.parse(t.sunset);
 if(!Number.isFinite(rise)||!Number.isFinite(set))return null;
 const dawn=rise-72*60000,night=set+72*60000,hour=(night-dawn)/12;
 return {alot:new Date(dawn).toISOString(),shma:new Date(dawn+3*hour).toISOString(),tfilla:new Date(dawn+4*hour).toISOString(),plag:new Date(dawn+10.75*hour).toISOString()};
}
async function j(url){let r=await fetch(url);if(!r.ok)throw Error(r.status);return r.json()}
const monthCache=new Map(),monthPending=new Map();let loadSequence=0,weekendTimeSequence=0;
async function loadWeekendTime(d,date){const el=$('#todayShabbatTime'),seq=++weekendTimeSequence,day=d.getDay();el.hidden=true;el.textContent='';if(day!==5&&day!==6)return;try{const z=await j(`${H}/zmanim?cfg=json&date=${date}&latitude=${loc.lat}&longitude=${loc.lon}&tzid=${encodeURIComponent(loc.tz)}`);if(seq!==weekendTimeSequence)return;const t=z.times||{},sunset=Date.parse(t.sunset);let value=day===5?(Number.isFinite(sunset)?new Date(sunset-15*60000).toISOString():null):t.tzeit85deg;if(!value||!Number.isFinite(Date.parse(value)))return;el.textContent=(day===5?'הדלקת נרות: ':'מוצאי שבת (8.5°): ')+fmtTime(value);el.hidden=false}catch(e){console.warn('Weekend time unavailable',e)}}
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
function hebYearFull(n){const year=Number(n);return year>=1000?hebYear(Math.floor(year/1000))+hebYear(year%1000):hebYear(year)}
const hebNums=['','א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ז׳','ח׳','ט׳','י׳','י״א','י״ב','י״ג','י״ד','ט״ו','ט״ז','י״ז','י״ח','י״ט','כ׳','כ״א','כ״ב','כ״ג','כ״ד','כ״ה','כ״ו','כ״ז','כ״ח','כ״ט','ל׳'];function hebFor(date){let d=new Date(date+'T12:00:00');try{let p=new Intl.DateTimeFormat('en-u-ca-hebrew',{day:'numeric'}).formatToParts(d),day=parseInt(p.find(x=>x.type==='day')?.value,10),month=new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{month:'long'}).format(d).replace(/^ב/,'');return ((hebNums[day]||day)+' '+month).trim()}catch{return ''}}
function monthHeading(){let y=view.getFullYear(),m=view.getMonth(),mid=new Date(y,m,15),greg=new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(mid),parts=new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{month:'long',year:'numeric'}).formatToParts(mid),hm=parts.find(p=>p.type==='month')?.value||'',hy=parts.find(p=>p.type==='year')?.value||'';return `${greg} · ${hm} ${hebYear(hy)}`}function buildMonthGrid(monthDate,items,events,chosen){let y=monthDate.getFullYear(),m=monthDate.getMonth();let first=new Date(y,m,1),last=new Date(y,m+1,0),offset=first.getDay(),cells=[];for(let i=-offset;i<42-offset;i++){let d=new Date(y,m,1+i),date=iso(d),ev=items.filter(x=>x.date===date),h=hebFor(date),holiday=ev.find(e=>['holiday','roshchodesh','fast'].includes(e.category));let parasha=d.getDay()===6?ev.find(e=>e.category==='parashat'):null,parashaName=parasha?(parasha.hebrew||parasha.title||'').replace(/^פרשת\s+/,'').replace(/^Parashat\s+/i,''):'';let cls='day'+(d.getMonth()!=m?' out':'')+(date===iso(new Date())?' today':'')+(chosen===date?' selected-date':'');let ges=events.filter(e=>(e.start?.date||e.start?.dateTime||'').startsWith(date)),dayOnly=(h||'').split(' ')[0];cells.push(`<div class="${cls}" data-date="${date}"><div class="gdate">${d.getDate()}</div><div class="hdate">${dayOnly}</div>${holiday?`<div class="holiday">${holiday.hebrew||holiday.title}</div>`:''}${parashaName?`<div class="holiday">${parashaName}</div>`:''}${ges.slice(0,2).map(e=>`<div class="googleEvent">${e.summary||'(ללא כותרת)'}</div>`).join('')}${ges.length>2?`<div class="moreEvents">+${ges.length-2}</div>`:''}</div>`)}return cells.join('')}
function render(){$('#calendarTitle').textContent=monthHeading();$('#grid').innerHTML=buildMonthGrid(view,jewish,gEvents,selectedDate);document.querySelectorAll('#grid .day').forEach(el=>el.onclick=()=>{const date=el.dataset.date;if(selectedDate===date){openDay(date).catch(console.error);return}selectedDate=date;render();loadToday()})}
async function loadToday(){let d=selectedDate?new Date(selectedDate+'T12:00:00'):new Date(),date=iso(d);loadWeekendTime(d,date);let sat=new Date(d);sat.setDate(d.getDate()+((6-d.getDay()+7)%7));let satDate=iso(sat);try{let [conv,dafCal,weekCal]=await Promise.all([j(`${H}/converter?cfg=json&g2h=1&date=${date}`),j(`${H}/hebcal?v=1&cfg=json&start=${date}&end=${date}&F=on&lg=he`),j(`${H}/hebcal?v=1&cfg=json&start=${date}&end=${satDate}&s=on&maj=on&lg=he`)]);$('#todayHeb').textContent=conv.hebrew;$('#todayGreg').textContent=new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);let daf=dafCal.items?.find(x=>x.category==='dafyomi'||/Daf Yomi/i.test(x.title||'')),parasha=weekCal.items?.find(x=>x.category==='parashat');$('#todayLearning').textContent=daf?`דף היומי: ${daf.hebrew||daf.title}`:'דף היומי: —';$('#todayParasha').textContent=parasha?`פרשת השבוע: ${(parasha.hebrew||parasha.title).replace(/^פרשת\\s+/,'').replace(/^Parashat\\s+/i,'')}`:'פרשת השבוע: —'}catch(e){$('#todayLearning').textContent='דף היומי: לא זמין';$('#todayParasha').textContent='פרשת השבוע: לא זמינה'}}
async function openDay(date){let d=new Date(date+'T12:00:00');let [conv,z,cal]=await Promise.all([j(`${H}/converter?cfg=json&g2h=1&date=${date}`),j(`${H}/zmanim?cfg=json&date=${date}&latitude=${loc.lat}&longitude=${loc.lon}&tzid=${encodeURIComponent(loc.tz)}`),j(`${H}/hebcal?v=1&cfg=json&start=${date}&end=${date}&maj=on&min=on&mod=on&nx=on&mf=on&ss=on&s=on&D=on&d=on&o=on&lg=he`)]);let t=z.times,daf=cal.items?.find(x=>x.category==='dafyomi'),events=cal.items?.filter(x=>x.category!=='dafyomi')||[],ge=gEvents.filter(e=>(e.start?.date||e.start?.dateTime||'').startsWith(date));let rows=[],m72=mga72Times(t);if(settings.alotMethod==='hebcal'||settings.alotMethod==='both')rows.push(['עלות השחר',t.alotHaShachar]);if(settings.alotMethod==='dawn'||settings.alotMethod==='both')rows.push(['דמדומי בוקר',t.dawn]);if((settings.alotMethod==='mga72'||settings.alotMethod==='all')&&m72)rows.push(['עלות השחר — 72 דקות לפני הנץ',m72.alot]);if(settings.alotMethod==='all'){rows.push(['עלות השחר — 16.1°',t.alotHaShachar],['דמדומי בוקר',t.dawn])}rows.push(['משיכיר',t.misheyakir],['זריחה',t.sunrise]);if(settings.shmaMethod==='gra'||settings.shmaMethod==='both')rows.push(['סוף זמן ק״ש גר״א',t.sofZmanShma]);if(settings.shmaMethod==='mga'||settings.shmaMethod==='both')rows.push(['סוף זמן ק״ש מג״א',t.sofZmanShmaMGA]);if((settings.shmaMethod==='mga72'||settings.shmaMethod==='all')&&m72)rows.push(['סוף זמן ק״ש מג״א — 72 דקות',m72.shma]);if(settings.shmaMethod==='all')rows.push(['סוף זמן ק״ש גר״א',t.sofZmanShma],['סוף זמן ק״ש מג״א (Hebcal)',t.sofZmanShmaMGA]);if(settings.tfillaMethod==='gra'||settings.tfillaMethod==='both')rows.push(['סוף זמן תפילה גר״א',t.sofZmanTfilla]);if(settings.tfillaMethod==='mga'||settings.tfillaMethod==='both')rows.push(['סוף זמן תפילה מג״א',t.sofZmanTfillaMGA]);if((settings.tfillaMethod==='mga72'||settings.tfillaMethod==='all')&&m72)rows.push(['סוף זמן תפילה מג״א — 72 דקות',m72.tfilla]);if(settings.tfillaMethod==='all')rows.push(['סוף זמן תפילה גר״א',t.sofZmanTfilla],['סוף זמן תפילה מג״א (Hebcal)',t.sofZmanTfillaMGA]);rows.push(['חצות',t.chatzot],['מנחה גדולה',t.minchaGedola],['מנחה קטנה',t.minchaKetana],['פלג המנחה',t.plagHaMincha],...(settings.plagMethod==='mga72'||settings.plagMethod==='both'?m72?[['פלג המנחה מג״א — 72 דקות',m72.plag]]:[]:[]),['שקיעה',t.sunset]);const tzeitChoices=[['7083','צאת הכוכבים — 7.083°',t.tzeit7083deg],['dusk','צאת הכוכבים — 6° (דמדומי ערב)',t.dusk],['85','צאת הכוכבים — 8.5°',t.tzeit85deg],...[33,42,50,72].map(min=>[String(min),'צאת הכוכבים — '+min+' דקות אחרי השקיעה'+(min===72?' (רבנו תם)':''),Number.isFinite(Date.parse(t.sunset))?new Date(Date.parse(t.sunset)+min*60000).toISOString():null])];for(const [key,label,value] of tzeitChoices){if(settings.tzeitMethod===key||settings.tzeitMethod==='all'||settings.tzeitMethod==='both'&&(key==='7083'||key==='dusk'))rows.push([label,value])}if(d.getDay()===5&&Number.isFinite(Date.parse(t.sunset)))rows.push(['הדלקת נרות — 15 דקות לפני השקיעה',new Date(Date.parse(t.sunset)-15*60000).toISOString()]);if(d.getDay()===6&&t.tzeit85deg)rows.push(['מוצאי שבת — 8.5°',t.tzeit85deg]);$('#dayContent').innerHTML=`<h2>${conv.hebrew}</h2><div>${new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}</div>${daf?`<h3>📖 דף היומי</h3><p>${daf.hebrew||daf.title}</p>`:''}${events.length?`<h3>✡️ בלוח</h3>${events.map(e=>`<p>${e.hebrew||e.title}</p>`).join('')}`:''}${ge.length?`<h3>🗓️ Google Calendar</h3>${ge.map(e=>`<p>${e.summary||'(ללא כותרת)'}</p>`).join('')}`:''}<h3>☀️ זמני היום · ${loc.name}</h3><div class="zmanim">${rows.map(([n,v])=>{const key=n.startsWith('עלות השחר')||n==='דמדומי בוקר'?'alotMethod':n.startsWith('סוף זמן ק״ש')?'shmaMethod':n.startsWith('סוף זמן תפילה')?'tfillaMethod':n.startsWith('פלג המנחה')?'plagMethod':n.startsWith('צאת הכוכבים')?'tzeitMethod':null;return `<div class="z"${key?` data-zman-setting="${key}" role="button" tabindex="0" title="לחץ לבחירת שיטת חישוב"`:''}><span>${n}${key?' ⚙':''}</span><strong>${fmtTime(v)}</strong></div>`}).join('')}</div>`;const dayDialog=$('#dayDialog');$('#dayContent').querySelectorAll('[data-zman-setting]').forEach(row=>{const choose=()=>{const key=row.dataset.zmanSetting,source=$('#'+key);const select=source.cloneNode(true);select.removeAttribute('id');select.value=settings[key]||(key==='plagMethod'?'gra':'');select.setAttribute('aria-label','בחר שיטת חישוב');row.replaceChildren(select);select.onchange=()=>{settings[key]=select.value;localStorage.setItem('luachSettings',JSON.stringify(settings));openDay(date).catch(console.error)};select.focus()};row.addEventListener('click',e=>{if(e.target.tagName!=='SELECT'&&e.target.tagName!=='OPTION')choose()});row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})});if(!dayDialog.open)dayDialog.showModal()}
$('#prev').onclick=()=>{view.setMonth(view.getMonth()-1);selectedInView();load()};$('#next').onclick=()=>{view.setMonth(view.getMonth()+1);selectedInView();load()};$('#todayBtn').onclick=()=>{selectedDate=iso(new Date());view=new Date();view.setDate(1);load()};$('#locationBtn').onclick=()=>{$('#menuDialog').close();$('#locationDialog').showModal()};
function openSettings(){['shmaMethod','tfillaMethod','alotMethod','tzeitMethod','plagMethod'].forEach(k=>$('#'+k).value=settings[k]|| (k==='plagMethod'?'gra':'gra'));$('#settingsDialog').showModal()}$('#menuBtn').onclick=()=>$('#menuDialog').showModal();$('#menuSettingsBtn').onclick=()=>{$('#menuDialog').close();openSettings()};$('#saveSettings').onclick=()=>{settings={shmaMethod:$('#shmaMethod').value,tfillaMethod:$('#tfillaMethod').value,alotMethod:$('#alotMethod').value,tzeitMethod:$('#tzeitMethod').value,plagMethod:$('#plagMethod').value};localStorage.setItem('luachSettings',JSON.stringify(settings));$('#settingsDialog').close()};
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
function initGoTo(){let n=new Date(),hy=Number(new Intl.DateTimeFormat('en-u-ca-hebrew',{year:'numeric'}).formatToParts(n).find(p=>p.type==='year')?.value)||5787;fillSelect($('#gDay'),Array.from({length:31},(_,i)=>i+1),n.getDate());fillSelect($('#gMonth'),gMonths.map((x,i)=>[i+1,x]),n.getMonth()+1);fillSelect($('#gYear'),Array.from({length:201},(_,i)=>n.getFullYear()-100+i),n.getFullYear());fillSelect($('#hDay'),Array.from({length:30},(_,i)=>i+1),1);fillSelect($('#hMonth'),hMonths,'Tishrei');fillSelect($('#hYear'),Array.from({length:201},(_,i)=>{const year=hy-100+i;return [year,hebYearFull(year)]}),hy)}
$('#goToBtn').onclick=()=>{$('#menuDialog').close();initGoTo();$('#goToDialog').showModal()};$('#goCalendar').onchange=()=>{let heb=$('#goCalendar').value==='heb';$('#gregFields').hidden=heb;$('#hebFields').hidden=!heb};
$('#goSubmit').onclick=async()=>{let d;$('#goStatus').textContent='טוען…';try{if($('#goCalendar').value==='greg'){d=new Date(+$('#gYear').value,+$('#gMonth').value-1,+$('#gDay').value);if(d.getDate()!=+$('#gDay').value)throw Error('invalid')}else{let q=`${H}/converter?cfg=json&h2g=1&hy=${$('#hYear').value}&hm=${encodeURIComponent($('#hMonth').value)}&hd=${$('#hDay').value}`,x=await j(q);d=new Date(x.gy,x.gm-1,x.gd)}selectedDate=iso(d);view=new Date(d.getFullYear(),d.getMonth(),1);$('#goToDialog').close();await load();setTimeout(()=>{let el=document.querySelector(`.day[data-date="${iso(d)}"]`);if(el){el.classList.add('gotoFlash');el.scrollIntoView({block:'center',behavior:'smooth'})}},80)}catch{$('#goStatus').textContent='לא ניתן לעבור לתאריך הזה. בדוק את הבחירה.'}};
// Experimental swipe: a single controlled pair of sheets, never overlapping generations.
let touchStart=null,swiping=false,animating=false,activeSwipe=null,swipeFrame=0;
const calendar=$('.calendar'),swipeViewport=$('.calendarSwipeViewport');
function setSwipeOffset(g,offset){
 g.offset=offset;
 const incoming=offset-g.sign*g.distance;
 calendar.style.transform=g.horizontal?'translate3d('+offset+'px,0,0)':'translate3d(0,'+offset+'px,0)';
 g.next.style.transform=g.horizontal?'translate3d('+incoming+'px,0,0)':'translate3d(0,'+incoming+'px,0)'
}
function cleanSwipe(g){
 cancelAnimationFrame(swipeFrame);
 g.next.remove();
 calendar.classList.remove('swipe-sheet','outgoing-sheet');
 calendar.style.transform='';
 calendar.style.transition='';
 swipeViewport.style.height='';
}
function createSwipeSheet(horizontal,sign){
 // Defensive cleanup prevents old preview sheets from ever accumulating.
 swipeViewport.querySelectorAll('.incoming-sheet').forEach(el=>el.remove());
 const delta=horizontal?sign:-sign;
 const target=new Date(view.getFullYear()+(horizontal?delta:0),view.getMonth()+(horizontal?0:delta),1);
 const distance=horizontal?swipeViewport.clientWidth:calendar.offsetHeight;
 if(distance<1)return null;
 const next=calendar.cloneNode(true);
 next.removeAttribute('id');
 next.className='calendar swipe-sheet incoming-sheet';
 const grid=next.querySelector('.grid');grid.removeAttribute('id');
 grid.innerHTML=buildMonthGrid(target,readMonth(target.getFullYear(),target.getMonth()+1)||[],[],null);
 swipeViewport.style.height=calendar.offsetHeight+'px';
 calendar.classList.add('swipe-sheet','outgoing-sheet');
 swipeViewport.appendChild(next);
 const g={target,horizontal,sign,distance,next,offset:0};
 setSwipeOffset(g,0);
 fetchMonth(target.getFullYear(),target.getMonth()+1).then(items=>{
  if(g.next.isConnected)grid.innerHTML=buildMonthGrid(target,items,[],null)
 }).catch(()=>{});
 return g
}
function finishSwipe(){
 const g=activeSwipe;
 touchStart=null;activeSwipe=null;
 if(!g)return;
 animating=true;
 // A started swipe ALWAYS completes in its chosen direction, including touchcancel.
 const from=g.offset,to=g.sign*g.distance;
 const duration=Math.max(150,Math.min(320,Math.abs(to-from)/g.distance*300));
 const started=performance.now();
 let completed=false;
 const complete=()=>{
  if(completed)return;
  completed=true;
  clearTimeout(g.finishTimer);
  cancelAnimationFrame(swipeFrame);
  view=g.target;
  selectedInView();
  cleanSwipe(g);
  load().catch(console.error);
  animating=false;
  setTimeout(()=>{swiping=false},120);
 };
 // If requestAnimationFrame is throttled or interrupted, the final state is
 // still committed and both temporary sheets are removed.
 g.finishTimer=setTimeout(complete,duration+160);
 const tick=now=>{
  if(completed)return;
  const t=Math.min(1,(now-started)/duration),ease=1-Math.pow(1-t,3);
  setSwipeOffset(g,from+(to-from)*ease);
  if(t<1){swipeFrame=requestAnimationFrame(tick);return}
  complete();
 };
 swipeFrame=requestAnimationFrame(tick)
}
swipeViewport.addEventListener('touchstart',e=>{
 if(e.touches.length!==1||animating)return;
 const t=e.touches[0];
 touchStart={x:t.clientX,y:t.clientY};
 swiping=false;activeSwipe=null
},{passive:true});
swipeViewport.addEventListener('touchmove',e=>{
 if(!touchStart||e.touches.length!==1||animating)return;
 const t=e.touches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;
 if(!activeSwipe&&Math.hypot(dx,dy)>12){
  const horizontal=Math.abs(dx)>Math.abs(dy),sign=(horizontal?dx:dy)>0?1:-1;
  activeSwipe=createSwipeSheet(horizontal,sign);
  swiping=!!activeSwipe
 }
 if(activeSwipe){
  e.preventDefault();
  const raw=activeSwipe.horizontal?dx:dy;
  setSwipeOffset(activeSwipe,activeSwipe.sign*Math.min(activeSwipe.distance,Math.max(0,raw*activeSwipe.sign)))
 }
},{passive:false});
// Capture release even if the finger ends outside the viewport or Android
// retargets the touch after the incoming calendar sheet is inserted.
window.addEventListener('touchend',e=>{
 if(touchStart&&e.touches.length===0)finishSwipe()
},{capture:true,passive:true});
window.addEventListener('touchcancel',e=>{
 if(touchStart&&e.touches.length===0)finishSwipe()
},{capture:true,passive:true});
window.addEventListener('blur',()=>{if(activeSwipe)finishSwipe()});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&activeSwipe)finishSwipe()
});
swipeViewport.addEventListener('click',e=>{if(swiping||animating){e.preventDefault();e.stopPropagation()}},true);

selectedDate=iso(new Date());if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');load().catch(console.error);restoreGoogle();
