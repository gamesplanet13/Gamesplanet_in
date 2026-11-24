'use strict';
/* Fixed accessibility-minded announcements. Rotating Gurmukhi -> Hindi -> English, then shuffled cycles. */
(()=>{
 const $=id=>document.getElementById(id);
 const top=$('noticeTop'),bottom=$('noticeBottom');
 if(!top||!bottom)return;
 const localeDate={pa:'pa-IN',hi:'hi-IN',en:'en-IN'};
 let programs=[...(window.POH_INITIAL_PROGRAMS||[])],announcement={pa:'',hi:'',en:''};
 let order=['pa','hi','en'],idx=0,phase=0;
 const pick=(p,key,lang)=>p[key+lang[0].toUpperCase()+lang.slice(1)]||p[key+'Pa']||'';
 function nextProgram(){
  const now=new Date();
  return programs.filter(e=>new Date(e.date+'T23:59:59')>=now)
   .sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')))[0];
 }
 const prefix={pa:'ਅਗਲਾ ਸਮਾਗਮ',hi:'अगला समागम',en:'Next Samagam'};
 const date=(p,lang)=>new Date(p.date+'T12:00').toLocaleDateString(localeDate[lang],{day:'numeric',month:'long',year:'numeric'});
 const upcoming=(lang)=>{
  const p=nextProgram();if(!p)return {pa:'ਸਮਾਗਮਾਂ ਲਈ ਜੁੜੇ ਰਹੋ',hi:'समागम की जानकारी के लिए जुड़े रहें',en:'Stay connected for upcoming samagams'}[lang];
  return prefix[lang]+' · '+date(p,lang)+' · '+pick(p,'title',lang)+(p.timeNote?' · '+p.timeNote:'');
 };
 function shuffle(){
  for(let i=order.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  if(order[0]===order[order.length-1])order.reverse();
 }
 function tick(){
  const lang=order[idx],a=announcement[lang]||announcement.pa||announcement.hi||announcement.en;
  top.textContent=a && phase%2===0?a:upcoming(lang);
  bottom.textContent=upcoming(lang);
  top.lang=lang;bottom.lang=lang;
  top.classList.remove('notice-transition');bottom.classList.remove('notice-transition');
  void top.offsetWidth;top.classList.add('notice-transition');bottom.classList.add('notice-transition');
  phase++;idx++;
  if(idx>=order.length){idx=0;shuffle()}
 }
 window.addEventListener('poh:schedule',e=>{if(Array.isArray(e.detail))programs=e.detail;tick()});
 window.addEventListener('poh:settings',e=>{const s=e.detail||{};announcement={pa:s.announcementPa||'',hi:s.announcementHi||'',en:s.announcementEn||''};tick()});
 tick();setInterval(tick,5200);
})();
