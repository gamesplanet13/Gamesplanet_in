'use strict';
/* Top and bottom: non-scrolling NEXT program + continuously scrolling later programs. */
(()=>{
  const $=id=>document.getElementById(id);
  const rails=[
    {main:$('noticeTop'),track:$('noticeTopTrack')},
    {main:$('noticeBottom'),track:$('noticeBottomTrack')}
  ];
  if(rails.some(r=>!r.main||!r.track))return;
  let programs=Array.isArray(window.POH_INITIAL_PROGRAMS)?[...window.POH_INITIAL_PROGRAMS]:[];
  let announcement={pa:'',hi:'',en:''};
  const languages=['pa','hi','en'];
  const labels={pa:'ਅਗਲਾ ਸਮਾਗਮ',hi:'अगला समागम',en:'Next Samagam'};
  const empty={pa:'ਅਗਲੇ ਸਮਾਗਮ ਦੀ ਜਾਣਕਾਰੀ ਜਲਦੀ',hi:'अगले समागम की जानकारी जल्द',en:'Next Samagam to be announced'};
  const later={pa:'ਆਉਣ ਵਾਲੇ ਸਮਾਗਮ',hi:'आगामी समागम',en:'Upcoming programs'};
  const locale={pa:'pa-IN',hi:'hi-IN',en:'en-IN'};
  let offset=0;
  const title=(p,lang)=>p['title'+lang[0].toUpperCase()+lang.slice(1)]||p.titlePa||p.titleEn||'';
  const day=(p,lang)=>new Date(p.date+'T12:00:00').toLocaleDateString(locale[lang],{day:'numeric',month:'short',year:'numeric'});
  function scheduled(){
    const now=new Date();
    const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0');
    const today=y+'-'+m+'-'+d;
    return [...programs].filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.date>=today)
     .sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
  }
  function text(p,lang){return day(p,lang)+' · '+title(p,lang)+(p.timeNote?' · '+p.timeNote:'')}
  function mainTick(){
    const arr=scheduled(),p=arr[0],lang=languages[offset%3];
    for(const rail of rails){
      rail.main.lang=lang;
      rail.main.textContent=p?labels[lang]+' · '+text(p,lang):empty[lang];
    }
    offset++;
  }
  function upcomingTrack(){
    const list=scheduled().slice(1);
    for(const rail of rails){
      const track=rail.track;
      track.replaceChildren();
      if(!list.length){
        const msg=document.createElement('span');msg.className='ticker-entry';msg.textContent=empty.en;track.append(msg);
        track.classList.add('no-scroll');continue;
      }
      track.classList.remove('no-scroll');
      const group=document.createElement('div');group.className='ticker-group';
      for(const p of list){
        for(const lang of languages){
          const el=document.createElement('span');el.className='ticker-entry';el.lang=lang;
          el.textContent=text(p,lang);
          group.append(el);
        }
      }
      track.append(group,group.cloneNode(true));
      // Speed relative to content width, including every remaining program.
      requestAnimationFrame(()=>{const width=group.scrollWidth;track.style.setProperty('--ticker-duration',Math.max(45,Math.round(width/65))+'s')});
    }
  }
  function refresh(){mainTick();upcomingTrack()}
  window.addEventListener('poh:schedule',e=>{if(Array.isArray(e.detail)){programs=e.detail;refresh()}});
  window.addEventListener('poh:settings',e=>{const x=e.detail||{};announcement={pa:x.announcementPa||'',hi:x.announcementHi||'',en:x.announcementEn||''};});
  refresh();
  setInterval(mainTick,7000);
  // On the next calendar day, update which program is current.
  setInterval(refresh,60000);
})();
