'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const frame=$('liveFrame'),badge=$('videoStatus'),date=$('videoDate'),title=$('videoTitle');
  const lamp=$('verifiedLiveLamp'),sound=$('liveSoundButton'),unavailable=$('videoUnavailable'),fallback=$('videoFallback'),fallbackMsg=$('videoFallbackMessage');
  if(!frame||!badge||!date)return;
  const channel='https://www.youtube.com/@akaaljisahaitv1313/streams';
  const copy={
    pa:{live:'● ਇਸ ਵੇਲੇ ਲਾਈਵ',recorded:'▶ ਪਿਛਲੀ ਲਾਈਵ ਰਿਕਾਰਡਿੰਗ',manual:'▶ ਚੁਣੀ ਵੀਡੀਓ',waiting:'▶ ਹਾਲੀਆ Live ਸਮਾਗਮਾਂ ਦੀ ਰਿਕਾਰਡਿੰਗ',go:'▶ YouTube ’ਤੇ ਲਾਈਵ / ਰਿਕਾਰਡਿੰਗ ਵੇਖੋ',sound:'🔊 ਆਵਾਜ਼ ਚਾਲੂ ਕਰੋ',date:'ਲਾਈਵ ਹੋਈ ਸੀ',started:'ਲਾਈਵ ਸ਼ੁਰੂ ਹੋਈ',liveLamp:'🔴 ਲਾਈਵ ਚੱਲ ਰਿਹਾ ਹੈ'},
    hi:{live:'● अभी लाइव',recorded:'▶ पिछली लाइव रिकॉर्डिंग',manual:'▶ चुनी हुई वीडियो',waiting:'▶ हाल के Live समागमों की रिकॉर्डिंग',go:'▶ YouTube पर लाइव / रिकॉर्डिंग देखें',sound:'🔊 आवाज़ चालू करें',date:'लाइव हुआ था',started:'लाइव शुरू हुआ',liveLamp:'🔴 लाइव चल रहा है'},
    en:{live:'● Currently LIVE',recorded:'▶ Last completed livestream',manual:'▶ Selected video',waiting:'▶ Recent livestream recordings',go:'▶ Open livestreams on YouTube',sound:'🔊 Enable sound',date:'Streamed on',started:'Live started',liveLamp:'🔴 LIVE AVAILABLE'}
  };
  const language=()=>$('lang')?.value||'pa';
  const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{11}$/.test(x);
  const parseId=value=>{
    if(valid(value))return value;
    try{const url=new URL(value);if(!['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(url.hostname))return '';
      const id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.match(/\/(?:embed|live)\/([A-Za-z0-9_-]{11})/)?.[1];
      return valid(id)?id:'';
    }catch(_){return ''}
  };
  let data=null,manual='',active='',visible=false,autoplayStarted=false,soundEnabled=false,yt=null,ytReady=false;
  const verified=()=>{const checked=Date.parse(data?.checkedAt||'');
    return data?.status==='ok'&&Number.isFinite(checked)&&checked<=Date.now()&&Date.now()-checked<20*60*1000&&valid(data?.live?.videoId);
  };
  const selection=()=>{
    if(verified())return {type:'live',data:data.live,id:data.live.videoId};
    if(valid(data?.recorded?.videoId))return {type:'recorded',data:data.recorded,id:data.recorded.videoId};
    const id=parseId(manual);
    if(id)return {type:'manual',id};
    return {type:'archive'};
  };
  function draw(){
    const choice=selection(),l=copy[language()]||copy.pa;
    const textLabel=l[choice.type]||l.waiting;
    badge.textContent=textLabel;
    badge.dataset.kind=choice.type;
    if(lamp){lamp.hidden=choice.type!=='live';lamp.textContent=choice.type==='live'?l.liveLamp:''}
    if(title)title.textContent=choice.data?.title||'Akaal Ji Sahai TV';
    const stamp=choice.data?.date?new Date(choice.data.date):null;
    date.textContent=stamp&&!Number.isNaN(stamp.getTime())?(choice.type==='live'?l.started:l.date)+': '+new Intl.DateTimeFormat(language()==='pa'?'pa-IN':language()==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(stamp):'';
    if(sound){sound.hidden=choice.type!=='live';sound.textContent=soundEnabled?'🔊 '+(language()==='pa'?'ਆਵਾਜ਼ ਚਾਲੂ ਹੈ':language()==='hi'?'आवाज़ चालू है':'Sound on'):l.sound}
    if(unavailable){unavailable.classList.add('hidden');unavailable.replaceChildren()}
    const key=choice.type==='archive'?'archive':choice.type+':'+choice.id;
    // Never touch an already playing video during a 60-second status poll,
    // language change, scroll, or sound change. Only real video ID changes.
    if(key===active||choice.type==='recorded'&&active==='live:'+choice.id){
      active=key;
      if(choice.type==='live'&&visible&&!autoplayStarted&&ytReady&&yt){
        try{yt.mute();yt.playVideo();autoplayStarted=true}catch(_){}
      }
      return;
    }
    active=key;soundEnabled=false;autoplayStarted=false;
    if(fallback)fallback.classList.add('hidden');
    // YouTube's UULV... auto-playlist is the channel's livestreams-only archive.
    // It plays the most recently indexed stream in the same video window,
    // not an ordinary video upload. No autoplay for past recordings.
    frame.classList.remove('hidden');
    if(choice.type==='archive'){
      const url='https://www.youtube.com/embed/videoseries?list=UULVDxFgFt0_TKCKZxnf7KSmNA&autoplay=0&playsinline=1&rel=0';
      if(frame.src!==url)frame.src=url;
      return;
    }
    const autoplay=choice.type==='live'&&visible;
    if(autoplay)autoplayStarted=true;
    const params=new URLSearchParams({rel:'0',playsinline:'1',enablejsapi:'1',origin:location.origin,autoplay:autoplay?'1':'0',mute:autoplay?'1':'0'});
    frame.src='https://www.youtube.com/embed/'+choice.id+'?'+params.toString();
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
      const next=items[0];
      if(next){
        const clips=items.map(source=>source.recorded).filter(clip=>valid(clip?.videoId));
        const when=clip=>Date.parse(clip.endedAt||clip.date)||0;
        clips.sort((a,b)=>when(b)-when(a));
        data={...next,recorded:valid(next.recorded?.videoId)&&!when(next.recorded)?next.recorded:clips[0]||null};
      }
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
    if(!window.YT?.Player||selection().type==='archive'||yt)return;
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
  window.addEventListener('poh:settings',e=>{manual=e.detail?.live||'';draw()});
  $('lang')?.addEventListener('change',draw);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  draw();sync();
  setInterval(()=>{if(!document.hidden)sync()},60000);
})();
