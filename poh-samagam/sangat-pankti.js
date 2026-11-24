'use strict';
/* Read-only live verse widget; same public /live feed used by Sangat View. */
(()=>{
 const url='https://sangat-view-live.gamesplanet.chatgpt.site/live';
 const verse=document.getElementById('panktiVerse'),arth=document.getElementById('panktiArth'),state=document.getElementById('panktiState'),box=document.getElementById('panktiBox');
 if(!verse||!arth||!state)return;
 const locale=()=>document.getElementById('lang')?.value||'en';
 const word={en:{waiting:'Waiting for live Gurbani selection…',online:'● Sangat View Live',offline:'Waiting for Sangat View connection',nom:'Meaning not available in selected language'},pa:{waiting:'ਲਾਈਵ ਗੁਰਬਾਣੀ ਦੀ ਪੰਕਤੀ ਦੀ ਉਡੀਕ…',online:'● ਸੰਗਤ ਵਿਊ ਲਾਈਵ',offline:'ਸੰਗਤ ਵਿਊ ਨਾਲ ਸੰਪਰਕ ਦੀ ਉਡੀਕ',nom:'ਚੁਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ'},hi:{waiting:'लाइव गुरबाणी पंक्ति की प्रतीक्षा…',online:'● संगत व्यू लाइव',offline:'संगत व्यू से जुड़ने की प्रतीक्षा',nom:'चुनी गई भाषा में अर्थ उपलब्ध नहीं'}};
 let content=null,etag='',online=false,job=null,busy=false,previousRevision;
 function paint(){
  const lang=locale(),t=word[lang]||word.en;
  const arr=Array.isArray(content?.bookLines)?content.bookLines:[];
  const ix=Math.max(0,Math.min(arr.length-1,Number(content?.activeIndex)||0));
  const row=(Array.isArray(content?.lineData)?content.lineData[ix]:null)||{};
  const scripts=row.scripts||{},meanings=row.meanings||{};
  const key=lang==='pa'?'gurmukhi':lang==='hi'?'hindi':'english';
  const meaningKey=lang==='pa'?'punjabi':lang==='hi'?'hindi':'english';
  const line=scripts[key]||(ix===(Number(content?.activeIndex)||0)?content?.scripts?.[key]:'')||(lang==='pa'?arr[ix]||content?.verse:'');
  const meaning=meanings[meaningKey]||(ix===(Number(content?.activeIndex)||0)?content?.meanings?.[meaningKey]:'');
  const blessing=content?.mode==='waheguru';
  if(blessing){verse.textContent=lang==='pa'?'ਵਾਹਿਗੁਰੂ':lang==='hi'?'वाहेगुरु':'Waheguru';arth.textContent='';}
  else{verse.textContent=line||t.waiting;arth.textContent=meaning||'';}
  state.textContent=online&&content?t.online:t.offline;
  state.dataset.connected=String(online&&!!content);
  arth.hidden=!meaning||blessing;
  box.dataset.language=lang;
 }
 async function poll(){
  if(document.hidden||busy)return;
  busy=true;
  try{
   const headers=etag?{'If-None-Match':etag}:{};
   const response=await fetch(url,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
   if(response.status===304){online=true}
   else if(response.ok){
    const data=await response.json();
    etag=response.headers.get('etag')||'';
    if(data&&Object.prototype.hasOwnProperty.call(data,'content')){
     if(data.revision!==previousRevision){content=data.content;previousRevision=data.revision}
     online=true;
    }
   }else{online=false}
  }catch(_){online=false}
  finally{busy=false;paint();if(!document.hidden)job=setTimeout(poll,2600)}
 }
 document.getElementById('lang')?.addEventListener('change',paint);
 document.addEventListener('visibilitychange',()=>{clearTimeout(job);if(!document.hidden)poll()});
 window.addEventListener('online',()=>{clearTimeout(job);poll()});
 paint();poll();
})();
