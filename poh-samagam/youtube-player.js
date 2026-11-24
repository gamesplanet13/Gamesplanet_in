'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const player=$('liveFrame'),badge=$('videoStatus'),date=$('videoDate'),title=$('videoTitle');
 if(!player||!badge||!date)return;
 const lang=()=> $('lang')?.value||'en';
 const tr={
 en:{live:'● Currently Live',recorded:'▶ Recorded Live Video',date:'Previously streamed',no:'Video status unavailable',waiting:'Checking the channel…',manual:'Video selected by administrator'},
 pa:{live:'● ਇਸ ਵੇਲੇ ਲਾਈਵ',recorded:'▶ ਪਿਛਲੀ ਲਾਈਵ ਰਿਕਾਰਡਿੰਗ',date:'ਲਾਈਵ ਹੋਈ ਸੀ',no:'ਵੀਡੀਓ ਦੀ ਜਾਣਕਾਰੀ ਉਪਲਬਧ ਨਹੀਂ',waiting:'ਚੈਨਲ ਦੀ ਜਾਂਚ ਜਾਰੀ ਹੈ…',manual:'ਪ੍ਰਬੰਧਕ ਵੱਲੋਂ ਚੁਣੀ ਵੀਡੀਓ'},
 hi:{live:'● अभी लाइव',recorded:'▶ पिछली लाइव रिकॉर्डिंग',date:'लाइव हुई थी',no:'वीडियो की जानकारी उपलब्ध नहीं',waiting:'चैनल की जाँच जारी है…',manual:'प्रबंधक द्वारा चुनी गई वीडियो'}
 };
 let data=null,manual='',shown='';
 const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{11}$/.test(id);
 const getId=x=>{
  if(valid(x))return x;
  try{
   const u=new URL(x);
   if(!['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))return '';
   const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/\/(?:live|embed)\/([\w-]{11})/)?.[1];
   return valid(id)?id:'';
  }catch(_){return ''}
 };
 function draw(){
  const L=lang(),w=tr[L]||tr.en;
  const isLive=data?.status==='ok'&&valid(data?.live?.videoId);
  const entry=isLive?data.live:(valid(data?.recorded?.videoId)?data.recorded:null);
  const custom=getId(manual);
  const id=entry?.videoId||custom;
  // Don't assert LIVE unless stream metadata verifies it.
  const kind=isLive?'live':entry?'recorded':custom?'manual':'unavailable';
  badge.textContent=kind==='live'?w.live:kind==='recorded'?w.recorded:kind==='manual'?w.manual:w.no;
  badge.dataset.kind=kind;
  let time=entry?.date||'';
  if(time){
    let parsed=new Date(time);
    date.textContent=Number.isNaN(parsed.getTime())?'':w.date+': '+new Intl.DateTimeFormat(L==='pa'?'pa-IN':L==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(parsed);
  }else date.textContent='';
  if(title)title.textContent=entry?.title||'Akaal Ji Sahai TV';
  if(id&&id!==shown){player.src='https://www.youtube-nocookie.com/embed/'+id+'?rel=0';shown=id}
  if(!id&&shown){player.removeAttribute('src');shown=''}
  $('videoUnavailable')?.classList.toggle('hidden',!!id);
 }
 async function sync(){
  try{
   let r=await fetch('./youtube-status.json?cache='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('status unavailable');
   let res=await r.json();
   if(res&&typeof res==='object')data=res;
  }catch(_){/* Keep any last known verified recording, never label a stale video live. */if(data)data={...data,live:null,status:'unavailable'}}
  draw();
 }
 window.addEventListener('poh:settings',e=>{manual=e.detail?.live||'';draw()});
 $('lang')?.addEventListener('change',draw);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 draw();sync();setInterval(()=>{if(!document.hidden)sync()},60000);
})();
