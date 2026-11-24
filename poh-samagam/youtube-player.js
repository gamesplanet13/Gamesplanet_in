'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const badge=$('videoStatus'),date=$('videoDate'),title=$('videoTitle'),sound=$('liveSoundButton');
 if(!$('liveFrame')||!badge||!date)return;
 const tr={
  pa:{live:'● ਇਸ ਵੇਲੇ ਲਾਈਵ',recorded:'▶ ਪਿਛਲੀ ਲਾਈਵ ਰਿਕਾਰਡਿੰਗ',waiting:'▶ ਚੈਨਲ ਲਾਈਵ ਦੀ ਜਾਂਚ',date:'ਲਾਈਵ ਹੋਈ ਸੀ',started:'ਲਾਈਵ ਸ਼ੁਰੂ ਹੋਈ',sound:'🔊 ਆਵਾਜ਼ ਚਾਲੂ ਕਰੋ',playing:'🔊 ਆਵਾਜ਼ ਚਾਲੂ ਹੈ'},
  hi:{live:'● अभी लाइव',recorded:'▶ पिछली लाइव रिकॉर्डिंग',waiting:'▶ चैनल लाइव की जाँच',date:'लाइव हुआ था',started:'लाइव शुरू हुआ',sound:'🔊 आवाज़ चालू करें',playing:'🔊 आवाज़ चालू है'},
  en:{live:'● Currently LIVE',recorded:'▶ Previous livestream recording',waiting:'▶ Checking channel livestream',date:'Streamed on',started:'Live started',sound:'🔊 Turn sound on',playing:'🔊 Sound on'}
 };
 const channel='UCDxFgFt0_TKCKZxnf7KSmNA',playlist='UULVDxFgFt0_TKCKZxnf7KSmNA';
 let status=null,manual='',activeKey='',livePlaying=false,playerApi=null,apiReady=false,initialVisibility=false,audioEnabled=false,apiInitializing=false;
 const lang=()=> $('lang')?.value||'pa';
 const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{11}$/.test(id);
 const videoId=x=>{
  if(valid(x))return x;
  try{const u=new URL(x);if(!['www.youtube.com','youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))return '';
   const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/\/(?:live|embed)\/([\w-]{11})/)?.[1];return valid(id)?id:''}
  catch(_){return ''}
 };
 function verified(){
  const at=Date.parse(status?.checkedAt||'');
  return status?.status==='ok'&&Number.isFinite(at)&&at<=Date.now()&&Date.now()-at<20*60*1000&&valid(status?.live?.videoId);
 }
 function selected(){
  if(verified())return {key:'live:'+status.live.videoId,kind:'live',entry:status.live,videoId:status.live.videoId};
  // A YouTube PLAYING event on the channel's live-only embed verifies current playback.
  if(livePlaying && activeKey==='channel-live')return {key:'channel-live',kind:'live',entry:null};
  if(valid(status?.recorded?.videoId))return {key:'replay:'+status.recorded.videoId,kind:'recorded',entry:status.recorded,videoId:status.recorded.videoId};
  const id=videoId(manual);
  if(id)return {key:'manual:'+id,kind:'manual',videoId:id};
  return {key:'channel-live',kind:'waiting'};
 }
 function updateLabels(choice){
  const L=lang(),w=tr[L]||tr.pa;
  badge.textContent=choice.kind==='live'?w.live:choice.kind==='recorded'?w.recorded:w.waiting;
  badge.dataset.kind=choice.kind;
  const lamp=$('verifiedLiveLamp');
  if(lamp){lamp.hidden=choice.kind!=='live';lamp.textContent=choice.kind==='live'?({pa:'🔴 ਲਾਈਵ ਚੱਲ ਰਿਹਾ ਹੈ',hi:'🔴 लाइव चल रहा है',en:'🔴 LIVE AVAILABLE'})[L]:''}
  if(title)title.textContent=choice.entry?.title||'Akaal Ji Sahai TV';
  const time=choice.entry?.date,when=time?new Date(time):null;
  date.textContent=when&&!Number.isNaN(when.getTime())?(choice.kind==='live'?w.started:w.date)+': '+new Intl.DateTimeFormat(L==='pa'?'pa-IN':L==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(when):'';
  if(sound){sound.hidden=choice.kind!=='live';sound.textContent=audioEnabled?w.playing:w.sound}
 }
 function setVideo(choice){
  // Never replace a playing iframe because of scrolling, a language switch,
  // a 60-second metadata refresh or a probe timeout. Replace only for a
  // genuinely different video identity (live -> recorded or vice versa).
  if(choice.key===activeKey)return;
  activeKey=choice.key;
  livePlaying=false;audioEnabled=false;
  const iframe=playerApi?.getIframe?.()||$('liveFrame');
  const common='&rel=0&playsinline=1&enablejsapi=1&origin='+encodeURIComponent(location.origin);
  let url;
  if(choice.kind==='live'&&choice.videoId){
   url='https://www.youtube.com/embed/'+choice.videoId+'?autoplay=1&mute=1'+common;
  }else if(choice.kind==='recorded'||choice.kind==='manual'){
   url='https://www.youtube.com/embed/'+choice.videoId+'?autoplay=0'+common;
  }else{
   url='https://www.youtube.com/embed/live_stream?channel='+channel+'&autoplay=1&mute=1'+common;
  }
  // The YouTube API owns its iframe after initialization; safely cue a new
  // source by loading the new embed URL only when the video really changes.
  if(iframe && iframe.src!==url)iframe.src=url;
 }
 function render(){
  const choice=selected();
  // If a live-only probe is playing, don't switch back to a stale or missing
  // metadata result. The active stream should play uninterrupted.
  const choiceToUse=livePlaying&&activeKey==='channel-live'&&!verified()?{key:'channel-live',kind:'live'}:choice;
  setVideo(choiceToUse);
  updateLabels(choiceToUse);
 }
 async function sync(){
  try{
   const response=await fetch('./youtube-status.json?cache='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Status unavailable');
   const result=await response.json();
   if(result&&typeof result==='object')status=result;
  }catch(_){if(status)status={...status,live:null,status:'unavailable'}}
  render();
 }
 function initializeApi(){
  if(apiInitializing||!window.YT?.Player)return;
  apiInitializing=true;
  try{
   playerApi=new YT.Player('liveFrame',{events:{
    onReady:()=>{apiReady=true;if(initialVisibility){try{playerApi.mute();playerApi.playVideo()}catch(_){}}},
    onStateChange:event=>{
     if(event.data===YT.PlayerState.PLAYING){
      if(activeKey==='channel-live'){livePlaying=true;updateLabels({key:activeKey,kind:'live'});}
     }else if(event.data===YT.PlayerState.ENDED&&activeKey==='channel-live'){
      livePlaying=false;
      // Wait for the next verified status rather than auto-switching or
      // forcibly restarting a finished livestream mid-playback.
      sync();
     }
    },
    onError:()=>{if(activeKey==='channel-live')livePlaying=false}
   }});
  }catch(e){apiInitializing=false;console.warn('YouTube controls not ready',e)}
 }
 const prior=window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady=()=>{if(typeof prior==='function')prior();initializeApi()};
 if(window.YT?.Player)initializeApi();
 else{const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.append(script)}
 if(sound)sound.addEventListener('click',()=>{
  // Unmuting autoplay without a gesture is blocked by mobile browsers.
  // This button provides the real user gesture needed to enable audio.
  try{
   if(!playerApi||!apiReady)throw Error('YouTube player not ready');
   playerApi.unMute();playerApi.setVolume(100);playerApi.playVideo();
   audioEnabled=true;updateLabels({kind:'live'});
  }catch(e){sound.textContent='▶ Tap the video to enable sound'}
 });
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(items=>{
    if(items.some(x=>x.isIntersecting)){
     initialVisibility=true;observer.disconnect();
     if(apiReady && activeKey.startsWith('live:')||apiReady&&activeKey==='channel-live'){try{playerApi.mute();playerApi.playVideo()}catch(_){}}
    }
  },{threshold:0.15});
  observer.observe($('liveFrame').closest('.video')||$('liveFrame'));
 }else initialVisibility=true;
 window.addEventListener('poh:settings',e=>{manual=e.detail?.live||'';render()});
 $('lang')?.addEventListener('change',render);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
 render();sync();setInterval(()=>{if(!document.hidden)sync()},60000);
})();
