'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const frame=$('liveFrame'),badge=$('videoStatus'),date=$('videoDate'),title=$('videoTitle');
  const lamp=$('verifiedLiveLamp'),sound=$('liveSoundButton'),link=$('liveWatchLink');
  if(!frame||!badge||!date)return;
  const slot=frame.closest('.video'),panel=badge.closest('.video-status-panel');
  const copy={
    pa:{live:'● ਇਸ ਵੇਲੇ ਲਾਈਵ',upcoming:'ਆਉਣ ਵਾਲਾ ਲਾਈਵ',go:'YouTube ’ਤੇ ਵੇਖੋ',sound:'🔊 ਆਵਾਜ਼ ਚਾਲੂ ਕਰੋ',on:'ਆਵਾਜ਼ ਚਾਲੂ ਹੈ',scheduled:'ਤੈਅ ਸਮਾਂ',started:'ਲਾਈਵ ਸ਼ੁਰੂ ਹੋਈ',liveLamp:'🔴 ਲਾਈਵ ਚੱਲ ਰਿਹਾ ਹੈ'},
    hi:{live:'● अभी लाइव',upcoming:'आगामी लाइव',go:'YouTube पर देखें',sound:'🔊 आवाज़ चालू करें',on:'आवाज़ चालू है',scheduled:'निर्धारित समय',started:'लाइव शुरू हुआ',liveLamp:'🔴 लाइव चल रहा है'},
    en:{live:'● Currently live',upcoming:'Upcoming livestream',go:'Watch on YouTube',sound:'🔊 Enable sound',on:'Sound on',scheduled:'Scheduled for',started:'Live started',liveLamp:'🔴 LIVE AVAILABLE'}
  };
  const language=()=>$('lang')?.value||'pa';
  const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{11}$/.test(x);
  let data=null,active='',visible=false,autoplayStarted=false,soundEnabled=false,yt=null,ytReady=false;
  const selection=()=>{
    const age=Date.now()-Date.parse(data?.checkedAt);
    if(data?.status!=='ok'||!Number.isFinite(age)||age< -60000||age>=20*60*1000)return null;
    if(valid(data.live?.videoId))return {type:'live',stream:data.live};
    if(valid(data.upcoming?.videoId))return {type:'upcoming',stream:data.upcoming};
    return null;
  };
  function draw(){
    const choice=selection(),l=copy[language()]||copy.pa;
    slot.hidden=panel.hidden=!choice;
    if(!choice){
      if(active)frame.removeAttribute('src');
      active='';soundEnabled=false;autoplayStarted=false;
      return;
    }
    const {type,stream}=choice,isLive=type==='live',id=stream.videoId;
    const key=type+':'+id;
    if(key!==active){soundEnabled=false;autoplayStarted=false}
    badge.textContent=l[type];
    badge.dataset.kind=type;
    if(lamp){lamp.hidden=!isLive;lamp.textContent=isLive?l.liveLamp:''}
    if(title)title.textContent=stream.title||'Akaal Ji Sahai TV';
    const stamp=Date.parse(stream.date);
    date.textContent=Number.isFinite(stamp)?(isLive?l.started:l.scheduled)+': '+new Intl.DateTimeFormat(language()==='pa'?'pa-IN':language()==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(stamp):'';
    if(sound){sound.hidden=!isLive;sound.textContent=soundEnabled?'🔊 '+l.on:l.sound}
    if(link){link.href='https://www.youtube.com/watch?v='+id;link.textContent=l.go}
    if(key===active){
      if(isLive&&visible&&!autoplayStarted&&ytReady&&yt){
        try{yt.mute();yt.playVideo();autoplayStarted=true}catch(_){}
      }
      return;
    }
    active=key;
    frame.classList.remove('hidden');
    const autoplay=isLive&&visible;
    if(autoplay)autoplayStarted=true;
    const params=new URLSearchParams({rel:'0',playsinline:'1',enablejsapi:'1',origin:location.origin,autoplay:autoplay?'1':'0',mute:autoplay?'1':'0'});
    frame.src='https://www.youtube.com/embed/'+id+'?'+params.toString();
    if(window.YT?.Player&&!yt)preparePlayer();
  }
  const statusSources=[
    'https://raw.githubusercontent.com/gamesplanet13/Gamesplanet_in/refs/heads/main/poh-samagam/youtube-status.json',
    './youtube-status.json'
  ];
  async function readStatus(url, revision){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6500);
    try{
      const response=await fetch(url+'?t='+revision,{cache:'no-store',signal:controller.signal});
      if(!response.ok)return null;
      const value=await response.json();
      return Number.isFinite(Date.parse(value?.checkedAt))?value:null;
    }finally{clearTimeout(timeout)}
  }
  let syncing=false;
  async function sync(){
    if(syncing)return;
    syncing=true;
    try{
      const revision=Math.floor(Date.now()/60000);
      const results=await Promise.allSettled(statusSources.map(url=>readStatus(url,revision)));
      const items=[data,...results.flatMap(result=>result.status==='fulfilled'&&result.value?[result.value]:[])].filter(Boolean);
      items.sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt));
      data=items[0]||null;
    }finally{syncing=false;draw()}
  }
  // YouTube only permits muted autoplay without user gesture on many phones.
  // The button lets the user unmute the existing stream without reloading it.
  if(sound)sound.addEventListener('click',()=>{
    try{
      if(ytReady&&yt){yt.unMute();yt.setVolume(100);yt.playVideo();soundEnabled=true;draw()}
      else{sound.textContent=language()==='pa'?'ਵੀਡੀਓ ਉੱਤੇ ਟੈਪ ਕਰਕੇ ਆਵਾਜ਼ ਚਾਲੂ ਕਰੋ':'Tap video to turn on sound'}
    }catch(_){sound.textContent='Tap video to turn on sound'}
  });
  function preparePlayer(){
    if(!window.YT?.Player||!selection()||yt)return;
    try{yt=new YT.Player('liveFrame',{events:{onReady:()=>{ytReady=true}}})}
    catch(error){console.warn('YouTube player API unavailable',error)}
  }
  window.onYouTubeIframeAPIReady=preparePlayer;
  if(window.YT?.Player)preparePlayer();
  else{const js=document.createElement('script');js.src='https://www.youtube.com/iframe_api';js.async=true;document.head.append(js)}
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(items=>{if(items.some(x=>x.isIntersecting)){visible=true;observer.disconnect();draw()}},{threshold:0.15});
    observer.observe(frame.closest('.video')||frame);
  }else visible=true;
  $('lang')?.addEventListener('change',draw);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  draw();sync();
  setInterval(()=>{if(!document.hidden)sync()},60000);
})();
