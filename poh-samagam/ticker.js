'use strict';
/* Reliable CSS-transform marquee; the next program remains still, all later dates scroll. */
(function(){
 const $=id=>document.getElementById(id);
 const rails=[{main:$('noticeTop'),track:$('noticeTopTrack')},{main:$('noticeBottom'),track:$('noticeBottomTrack')}];
 if(rails.some(x=>!x.main||!x.track))return;
 let programs=window.POH_INITIAL_PROGRAMS||[],notices={},step=0,lastKey='';
 const langs=['pa','hi','en'], names={pa:'ਅਗਲਾ ਸਮਾਗਮ',hi:'अगला समागम',en:'Next Samagam'};
 const empty={pa:'ਅਗਲੇ ਸਮਾਗਮ ਦੀ ਜਾਣਕਾਰੀ ਜਲਦੀ',hi:'अगले समागम की जानकारी जल्द',en:'Next program to be announced'};
 const locales={pa:'pa-IN',hi:'hi-IN',en:'en-IN'};
 function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 function all(){const t=today();return programs.filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.date>=t).sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));}
 function describe(p,l){
  const date=new Date(p.date+'T12:00:00').toLocaleDateString(locales[l],{day:'numeric',month:'short',year:'numeric'});
  const title=p['title'+l[0].toUpperCase()+l.slice(1)]||p.titlePa||p.titleEn||'';
  return date+' · '+title;
 }
 function updateMain(){
  const p=all()[0],lang=langs[step++%3];
  for(const rail of rails){
   const note=rail===rails[0]?notices[lang]:'';
   rail.main.textContent=(note?note+' · ':'')+(p?names[lang]+' · '+describe(p,lang):empty[lang]);
   rail.main.title=rail.main.textContent;
   rail.main.lang=lang;
  }
 }
 function updateTracks(force){
  const next=all().slice(1);
  const signature=next.map(p=>p.id||p.date+':'+p.titlePa).join('|');
  if(!force&&lastKey===signature)return;
  lastKey=signature;
  for(const rail of rails){
   const outer=rail.track;
   outer.replaceChildren();
   const group=document.createElement('div');
   group.className='ticker-group';
   if(next.length){
    for(const p of next)for(const lang of langs){
     const item=document.createElement('span');
     item.className='ticker-entry';item.lang=lang;
     item.textContent=describe(p,lang);
     group.append(item);
    }
   }else{
    const item=document.createElement('span');item.className='ticker-entry';item.textContent=empty.pa+' · '+empty.hi+' · '+empty.en;group.append(item);
   }
   outer.append(group,group.cloneNode(true));
   // Animation starts immediately; duplicate groups provide a seamless wrap.
   const width=group.getBoundingClientRect().width||group.scrollWidth;
   outer.style.setProperty('--scroll-seconds',Math.max(12,Math.round(width/105))+'s');
   outer.classList.remove('ticker-running');
   void outer.offsetWidth;
   outer.classList.add('ticker-running');
  }
 }
 function refresh(force=false){updateTracks(force);updateMain()}
 window.addEventListener('poh:schedule',e=>{if(Array.isArray(e.detail)){programs=e.detail;refresh(true)}});
 window.addEventListener('poh:settings',e=>{const s=e.detail||{};notices={pa:s.announcementPa||'',hi:s.announcementHi||'',en:s.announcementEn||''};updateMain()});
 refresh(true);setInterval(updateMain,7000);setInterval(()=>refresh(),60000);
})();
