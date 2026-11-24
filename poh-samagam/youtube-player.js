'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const frame=$('liveFrame'),badge=$('videoStatus'),date=$('videoDate'),title=$('videoTitle');
  const lamp=$('verifiedLiveLamp'),sound=$('liveSoundButton'),unavailable=$('videoUnavailable'),fallback=$('videoFallback'),fallbackMsg=$('videoFallbackMessage');
  if(!frame||!badge||!date)return;
  const channel='https://www.youtube.com/@akaaljisahaitv1313/streams';
  const copy={
    pa:{live:'● ਇਸ ਵੇਲੇ ਲਾਈਵ',recorded:'▶ ਪਿਛਲੀ ਲਾਈਵ ਰਿਕਾਰਡਿੰਗ',manual:'▶ ਚੁਣੀ ਵੀਡੀਓ',waiting:'YouTube Live ਦੀ ਜਾਂਚ ਉਪਲਬਧ ਨਹੀਂ',go:'▶ YouTube ’ਤੇ ਲਾਈਵ / ਰਿਕਾਰਡਿੰਗ ਵੇਖੋ',sound:'🔊 ਆਵਾਜ਼ ਚਾਲੂ ਕਰੋ',date:'ਲਾਈਵ ਹੋਈ ਸੀ',started:'ਲਾਈਵ ਸ਼ੁਰੂ ਹੋਈ',liveLamp:'🔴 ਲਾਈਵ ਚੱਲ ਰਿਹਾ ਹੈ'},
    hi:{live:'● अभी लाइव',recorded:'▶ पिछली लाइव रिकॉर्डिंग',manual:'▶ चुनी हुई वीडियो',waiting:'YouTube Live की जाँच उपलब्ध नहीं',go:'▶ YouTube पर लाइव / रिकॉर्डिंग देखें',sound:'🔊 आवाज़ चालू करें',date:'लाइव हुआ था',started:'लाइव शुरू हुआ',liveLamp:'🔴 लाइव चल रहा है'},
    en:{live:'● Currently LIVE',recorded:'▶ Last completed livestream',manual:'▶ Selected video',waiting:'YouTube Live status unavailable',go:'▶ Open livestreams on YouTube',sound:'🔊 Enable sound',date:'Streamed on',started:'Live started',liveLamp:'🔴 LIVE AVAILABLE'}
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
    return {type:'unavailable'};
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
    const key=choice.type==='unavailable'?'empty':choice.type+':'+choice.id;
    // Never touch an already playing video during a 60-second status poll,
    // language change, scroll, or sound change. Only real video ID changes.
    if(key===active){
      if(choice.type==='live'&&visible&&!autoplayStarted&&ytReady&&yt){
        try{yt.mute();yt.playVideo();autoplayStarted=true}catch(_){}
      }
      return;
    }
    active=key;soundEnabled=false;
    if(fallback){fallback.classList.toggle('hidden',choice.type!=='unavailable');if(fallbackMsg&&choice.type==='unavailable')fallbackMsg.textContent=language()==='pa'?'ਇਸ ਵੇਲੇ Live ਜਾਂ ਪਿਛਲੀ Live recording ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੋ ਸਕੀ':language()==='hi'?'अभी लाइव या पिछली लाइव रिकॉर्डिंग की पुष्टि नहीं हुई':'Live or last livestream could not be confirmed'}
    // Keep the VIDEO SLOT visible. Without a verified live or archived video
    // ID do not embed a broken channel-level /live_stream endpoint.
    // Use the single in-window fallback, never a duplicate action below it.
    if(choice.type==='unavailable'){
      frame.classList.add('hidden');
      frame.removeAttribute('src');
      return;
    }
    frame.classList.remove('hidden');
    const autoplay=choice.type==='live'&&visible;
    if(autoplay)autoplayStarted=true;
    const params=new URLSearchParams({rel:'0',playsinline:'1',enablejsapi:'1',origin:location.origin,autoplay:autoplay?'1':'0',mute:autoplay?'1':'0'});
    frame.src='https://www.youtube.com/embed/'+choice.id+'?'+params.toString();
    if(window.YT?.Player&&!yt)preparePlayer();
  }
  async function sync(){
    try{
      const response=await fetch('./youtube-status.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('Could not load status');
      const next=await response.json();
      if(next&&typeof next==='object')data=next;
    }catch(_){if(data)data={...data,status:'unavailable',live:null}}
    draw();
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
    if(!window.YT?.Player||selection().type==='unavailable'||yt)return;
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
