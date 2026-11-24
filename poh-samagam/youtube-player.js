'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const player=$('liveFrame'),badge=$('videoStatus'),date=$('videoDate'),title=$('videoTitle');
 if(!player||!badge||!date)return;
 const lang=()=> $('lang')?.value||'en';
 const tr={
 en:{live:'● Currently Live',recorded:'▶ Recorded Live Video',date:'Streamed on',started:'Live started on',no:'Video status unavailable',waiting:'Checking the channel…',manual:'Video selected by administrator',latest:'▶ Latest Livestream Replay (from YouTube Streams)'},
 pa:{live:'● ਇਸ ਵੇਲੇ ਲਾਈਵ',recorded:'▶ ਪਿਛਲੀ ਲਾਈਵ ਰਿਕਾਰਡਿੰਗ',date:'ਲਾਈਵ ਹੋਈ ਸੀ',started:'ਲਾਈਵ ਸ਼ੁਰੂ ਹੋਈ',no:'ਵੀਡੀਓ ਦੀ ਜਾਣਕਾਰੀ ਉਪਲਬਧ ਨਹੀਂ',waiting:'ਚੈਨਲ ਦੀ ਜਾਂਚ ਜਾਰੀ ਹੈ…',manual:'ਪ੍ਰਬੰਧਕ ਵੱਲੋਂ ਚੁਣੀ ਵੀਡੀਓ',latest:'▶ ਪਿਛਲੀ ਲਾਈਵ ਦੀ ਰਿਕਾਰਡਿੰਗ (YouTube Streams)'},
 hi:{live:'● अभी लाइव',recorded:'▶ पिछली लाइव रिकॉर्डिंग',date:'लाइव हुई थी',started:'लाइव शुरू हुआ',no:'वीडियो की जानकारी उपलब्ध नहीं',waiting:'चैनल की जाँच जारी है…',manual:'प्रबंधक द्वारा चुनी गई वीडियो',latest:'▶ पिछली लाइव रिकॉर्डिंग (YouTube Streams)'}
 };
 let data=null,manual='',shown='',frameVisible=false,liveAutostarted=false,fallbackPlayback=false;
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
  const checked=Date.parse(data?.checkedAt||'');
  const fresh=Number.isFinite(checked)&&Date.now()-checked>=0&&Date.now()-checked<20*60*1000;
  const verifiedLive=fresh&&data?.status==='ok'&&valid(data?.live?.videoId);
  const isLive=verifiedLive||fallbackPlayback;
  const entry=verifiedLive?data.live:(fallbackPlayback?null:valid(data?.recorded?.videoId)?data.recorded:null);
  const custom=getId(manual);
  const id=entry?.videoId||(fallbackPlayback?'':custom);
  // Don't assert LIVE unless stream metadata verifies it.
  const kind=isLive?'live':entry?'recorded':custom?'manual':'latest';
  badge.textContent=kind==='live'?w.live:kind==='recorded'?w.recorded:kind==='manual'?w.manual:w.latest;
  badge.dataset.kind=kind;
  badge.setAttribute('aria-live','polite');
  const liveLamp=$('verifiedLiveLamp');
  if(liveLamp){liveLamp.hidden=!isLive;liveLamp.textContent=isLive?({pa:'🔴 ਲਾਈਵ ਚੱਲ ਰਿਹਾ ਹੈ',hi:'🔴 लाइव चल रहा है',en:'🔴 LIVE AVAILABLE'})[L]:''}
  let time=entry?.date||'';
  if(time){
    let parsed=new Date(time);
    date.textContent=Number.isNaN(parsed.getTime())?'':(kind==='live'?w.started:w.date)+': '+new Intl.DateTimeFormat(L==='pa'?'pa-IN':L==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(parsed);
  }else date.textContent='';
  if(title)title.textContent=entry?.title||'Akaal Ji Sahai TV';
  if(!verifiedLive)liveAutostarted=false;
  if(verifiedLive&&frameVisible)liveAutostarted=true;
  if(id){const shouldAuto=verifiedLive&&liveAutostarted;const key=kind+':'+id+':'+(shouldAuto?'auto':'manual');if(key!==shown){player.src='https://www.youtube-nocookie.com/embed/'+id+'?rel=0&playsinline=1'+(shouldAuto?'&autoplay=1&mute=1':'&autoplay=0');shown=key}}
  if(!id){
    const key='probe:'+(frameVisible?'auto':'manual');
    if(shown!==key && !fallbackPlayback){
      player.src='https://www.youtube-nocookie.com/embed/live_stream?channel=UCDxFgFt0_TKCKZxnf7KSmNA&playsinline=1&enablejsapi=1&origin='+encodeURIComponent(location.origin)+(frameVisible?'&autoplay=1&mute=1':'&autoplay=0');
      shown=key;
    }
  }
  $('videoUnavailable')?.classList.add('hidden');
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
 // The channel /live_stream URL selects an active livestream only. When status
 // metadata is unavailable, use YouTube's official player event to light LIVE.
 const previousReady=window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady=()=>{
   if(typeof previousReady==='function')previousReady();
   if(!window.YT||!YT.Player)return;
   try{new YT.Player('liveFrame',{events:{
     onStateChange:ev=>{
       if(!shown.startsWith('probe:'))return;
       if(ev.data===YT.PlayerState.PLAYING){if(!fallbackPlayback){fallbackPlayback=true;draw()}}
       else if(ev.data===YT.PlayerState.ENDED){fallbackPlayback=false;sync()}
     }
   }})}catch(e){console.warn('Live playback status unavailable',e)}
 };
 if(!window.YT?.Player){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.append(script)}
 else window.onYouTubeIframeAPIReady();

 window.addEventListener('poh:settings',e=>{manual=e.detail?.live||'';draw()});
 $('lang')?.addEventListener('change',draw);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(items=>{frameVisible=items.some(x=>x.intersectionRatio>=0.5);if(frameVisible)draw()},{threshold:[0,0.5,1]});observer.observe(player.closest('.video')||player)}
 else frameVisible=true;
 draw();sync();setInterval(()=>{if(!document.hidden)sync()},60000);
})();
