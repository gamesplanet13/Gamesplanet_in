'use strict';
/* Always-visible fixed next program plus continuously moving remaining dates.
   Real scrollLeft animation avoids a several-minute CSS marquee appearing stationary. */
(()=>{
  const byId=id=>document.getElementById(id);
  const banners=[
    {main:byId('noticeTop'),track:byId('noticeTopTrack')},
    {main:byId('noticeBottom'),track:byId('noticeBottomTrack')}
  ];
  if(banners.some(b=>!b.main||!b.track))return;
  let programs=Array.isArray(window.POH_INITIAL_PROGRAMS)?window.POH_INITIAL_PROGRAMS:[];
  let announcements={pa:'',hi:'',en:''},langIndex=0,groupWidth=0;
  let previous=0,lastDay='',lastSignature='';
  const languages=['pa','hi','en'];
  const labels={pa:'ਅਗਲਾ ਸਮਾਗਮ',hi:'अगला समागम',en:'Next Samagam'};
  const none={pa:'ਅਗਲਾ ਸਮਾਗਮ ਜਲਦੀ',hi:'अगला समागम जल्द',en:'Next Samagam soon'};
  const fmt={pa:'pa-IN',hi:'hi-IN',en:'en-IN'};
  function today(){return new Date(Date.now()+330*60000).toISOString().slice(0,10)}
  function sorted(){
    const day=today();
    return programs.filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.date>=day)
      .sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
  }
  function label(p,lang){
    const name=p['title'+lang[0].toUpperCase()+lang.slice(1)]||p.titlePa||p.titleEn||'';
    const d=new Date(p.date+'T12:00:00').toLocaleDateString(fmt[lang],{day:'numeric',month:'short',year:'numeric'});
    return d+' · '+name+(p.timeNote?' · '+p.timeNote:'');
  }
  function next(){
    const p=sorted()[0],lang=languages[langIndex++%3];
    for(const b of banners){
      b.main.lang=lang;
      const announcement=announcements[lang];
      b.main.textContent=(announcement&&b===banners[0]?announcement+'  •  ':'')+(p?labels[lang]+' · '+label(p,lang):none[lang]);
      b.main.title=b.main.textContent;
    }
  }
  function makeTrack(b,rows){
    const track=b.track,windowEl=track.parentElement;
    track.replaceChildren();
    const group=document.createElement('div');
    group.className='ticker-group';
    if(!rows.length){
      const msg=document.createElement('span');msg.className='ticker-entry';msg.textContent=none.pa+'  ·  '+none.hi+'  ·  '+none.en;
      group.append(msg);
    }else{
      for(const p of rows){
        for(const lang of languages){
          const span=document.createElement('span');span.className='ticker-entry';span.lang=lang;
          span.textContent=label(p,lang);group.append(span);
        }
      }
    }
    track.append(group,group.cloneNode(true));
    windowEl.scrollLeft=0;
    // Keep a visible first entry even before the next animation frame.
    return group;
  }
  function redraw(force=false){
    const day=today(),rows=sorted().slice(1);
    const signature=rows.map(x=>x.id||x.date+':'+x.titlePa).join('|');
    if(!force&&lastDay===day&&signature===lastSignature)return;
    lastDay=day;lastSignature=signature;
    const groups=banners.map(b=>makeTrack(b,rows));
    groupWidth=groups[0].getBoundingClientRect().width||groups[0].scrollWidth||0;
    next();
  }
  function frame(now){
    const dt=previous?Math.min(70,now-previous):0;previous=now;
    if(!document.hidden&&groupWidth>0){
      for(const b of banners){
        const scroller=b.track.parentElement;
        const firstWidth=b.track.firstElementChild?.getBoundingClientRect().width||groupWidth;
        scroller.scrollLeft+=dt*0.09;
        if(scroller.scrollLeft>=firstWidth)scroller.scrollLeft-=firstWidth;
      }
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('poh:schedule',e=>{if(Array.isArray(e.detail)){programs=e.detail;redraw(true)}});
  window.addEventListener('poh:settings',e=>{const v=e.detail||{};announcements={pa:v.announcementPa||'',hi:v.announcementHi||'',en:v.announcementEn||''};next()});
  window.addEventListener('resize',()=>{groupWidth=banners[0].track.firstElementChild?.getBoundingClientRect().width||0});
  redraw(true);
  setInterval(next,7000);
  setInterval(()=>redraw(),60000);
  requestAnimationFrame(frame);
})();
