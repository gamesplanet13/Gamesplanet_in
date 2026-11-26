'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const subscribe=$('pohSubscribe'),like=$('pohLike'),follow=$('pohFollow'),status=$('pohFollowStatus'),localCount=$('pohLocalLike');
 if(!like||!follow||!status||!localCount)return;
 const canRemind='Notification' in window&&'serviceWorker' in navigator;
 const getLang=()=> $('lang')?.value||'pa';
 const translations={
  pa:{like:'ਪਸੰਦ',liked:'ਪਸੰਦ ਕੀਤਾ',yourLike:'ਮੇਰੀ ਲਾਈਕ',subscribe:'▶ YouTube ਸਬਸਕ੍ਰਾਈਬ',follow:'🔔 ਸਮਾਗਮ ਦੀ ਯਾਦ-ਦਿਹਾਨੀ',following:'🔔 ਨੋਟੀਫਿਕੇਸ਼ਨ ਆਨ',permit:'ਨੋਟੀਫਿਕੇਸ਼ਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ',unsupported:'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਨੋਟੀਫਿਕੇਸ਼ਨ ਉਪਲਬਧ ਨਹੀਂ',denied:'ਨੋਟੀਫਿਕੇਸ਼ਨ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ',ready:'ਨੋਟੀਫਿਕੇਸ਼ਨ ਆਨ ਹਨ (ਪੇਜ ਖੁੱਲ੍ਹਾ ਹੋਣ ਵੇਲੇ ਯਾਦ-ਦਿਹਾਨੀ)',error:'ਨੋਟੀਫਿਕੇਸ਼ਨ ਸੈੱਟ ਨਹੀਂ ਹੋ ਸਕੇ',reminder:'ਸਮਾਗਮ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲਾ ਹੈ'},
  hi:{like:'लाइक',liked:'लाइक किया',yourLike:'मेरी लाइक',subscribe:'▶ YouTube सब्सक्राइब',follow:'🔔 समागम रिमाइंडर',following:'🔔 नोटिफिकेशन ऑन',permit:'नोटिफिकेशन की अनुमति दें',unsupported:'इस ब्राउज़र में नोटिफिकेशन उपलब्ध नहीं',denied:'नोटिफिकेशन की अनुमति नहीं मिली',ready:'नोटिफिकेशन ऑन (पेज खुला होने पर रिमाइंडर)',error:'नोटिफिकेशन सेट नहीं हुए',reminder:'समागम शुरू होने वाला है'},
  en:{like:'Like',liked:'Liked',yourLike:'My Like',subscribe:'▶ Subscribe on YouTube',follow:'🔔 Samagam reminders',following:'🔔 Notifications On',permit:'Allow notifications',unsupported:'Browser notifications unavailable',denied:'Notification permission denied',ready:'Notifications on (reminders while page is open)',error:'Could not enable notifications',reminder:'Samagam begins soon'}
 };
 const t=k=>(translations[getLang()]||translations.pa)[k];
 let programs=window.POH_INITIAL_PROGRAMS||[];
 const liked=()=>localStorage.getItem('poh-samagam-liked')==='1';
 const following=()=>localStorage.getItem('poh-samagam-follow')==='1';
 function display(){
  like.setAttribute('aria-pressed',String(liked()));
  like.textContent='👍 '+t(liked()?'liked':'like');
  localCount.textContent=t('yourLike')+': '+(liked()?'1':'0');
  if(subscribe)subscribe.textContent=t('subscribe');
  follow.hidden=!canRemind;
  follow.textContent=following()?t('following'):t('follow');
  follow.setAttribute('aria-pressed',String(following()));
 }
 like.addEventListener('click',()=>{
  localStorage.setItem('poh-samagam-liked',liked()?'0':'1');
  display();
 });
 follow.addEventListener('click',async()=>{
  if(!('Notification' in window)||!('serviceWorker' in navigator)){status.textContent=t('unsupported');return}
  try{
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   if(permission!=='granted'){status.textContent=t('denied');return}
   await navigator.serviceWorker.register('./notifications-sw.js',{scope:'./'});
   localStorage.setItem('poh-samagam-follow','1');
   status.textContent=t('ready');
   display();
   await reminders();
  }catch(err){status.textContent=t('error');console.warn('Samagam notifications not available:',err)}
 });
 async function reminders(){
  if(!following()||!('Notification' in window)||Notification.permission!=='granted')return;
  const now=Date.now();
  const upcoming=programs.filter(p=>p?.date&&/^\d\d:\d\d$/.test(p.time||'')).map(p=>({...p,start:Date.parse(p.date+'T'+p.time+':00+05:30')})).filter(p=>Number.isFinite(p.start)&&p.start-now>=0&&p.start-now<=30*60*1000).sort((a,b)=>a.start-b.start);
  if(!upcoming.length)return;
  const e=upcoming[0],key=e.id||e.date+e.titlePa;
  if(localStorage.getItem('poh-samagam-last-reminder')===key)return;
  try{
   const reg=await navigator.serviceWorker.ready;
   await reg.showNotification(t('reminder'),{body:e['title'+getLang()[0].toUpperCase()+getLang().slice(1)]||e.titlePa||e.titleEn||'',tag:'poh-reminder-'+e.date,data:{url:'./#programs'}});
   localStorage.setItem('poh-samagam-last-reminder',key);
  }catch(err){console.warn('Reminder failed:',err)}
 }
 $('lang')?.addEventListener('change',display);
 window.addEventListener('poh:schedule',event=>{if(Array.isArray(event.detail)){programs=event.detail;reminders()}});
 display();reminders();setInterval(reminders,60000);
})();
