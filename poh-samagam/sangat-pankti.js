'use strict';
/* Read-only live verse widget using both public Sangat View connections. */
(()=>{
 const url='https://sangat-view-live.gamesplanet.chatgpt.site/live';
 const verse=document.getElementById('panktiVerse'),arth=document.getElementById('panktiArth'),state=document.getElementById('panktiState'),box=document.getElementById('panktiBox');
 if(!verse||!arth||!state||!box)return;
 const locale=()=>document.getElementById('lang')?.value||'en';
 const word={en:{waiting:'Waiting for live Gurbani selection…',online:'● Sangat View Live',offline:'Waiting for Sangat View connection',nom:'Meaning not available in selected language'},pa:{waiting:'ਲਾਈਵ ਗੁਰਬਾਣੀ ਦੀ ਪੰਕਤੀ ਦੀ ਉਡੀਕ…',online:'● ਸੰਗਤ ਵਿਊ ਲਾਈਵ',offline:'ਸੰਗਤ ਵਿਊ ਨਾਲ ਸੰਪਰਕ ਦੀ ਉਡੀਕ',nom:'ਚੁਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ'},hi:{waiting:'लाइव गुरबाणी पंक्ति की प्रतीक्षा…',online:'● संगत व्यू लाइव',offline:'संगत व्यू से जुड़ने की प्रतीक्षा',nom:'चुनी गई भाषा में अर्थ उपलब्ध नहीं'}};
 let content=null,etag='',online=false,job=null,busy=false,previousRevision,lastPeerAt=0,acceptedFeed=false,latestFeed=null;
 let peer=null,channel=null;
 const peerFresh=()=>lastPeerAt>0&&Date.now()-lastPeerAt<45000;
 function connectPublic(){
  if(document.hidden||!peer?.open||peer.disconnected||channel)return;
  try{
   const connection=peer.connect('gurbani-sangat-public-v1',{reliable:true,metadata:{type:'sangat-view-read-only'}});
   channel=connection;
   const drop=()=>{if(channel===connection)channel=null};
   connection.on('open',()=>{if(channel===connection)connection.send({type:'sangat-join'})});
   connection.on('close',drop);
   connection.on('error',()=>{drop();connection.close()});
   connection.on('data',packet=>{
    if(channel!==connection||packet?.type!=='sangat-live'||!Number.isFinite(packet.revision))return;
    const next=packet.content;
    if(next!==null&&(!Array.isArray(next?.bookLines)||next.bookLines.length>400||
      next.bookLines.some(line=>typeof line!=='string'||line.length>500)))return;
    lastPeerAt=Date.now();
    content=next;
    paint();
   });
   setTimeout(()=>{if(channel===connection&&!connection.open){drop();connection.close()}},12000);
  }catch(_){}
 }
 function paint(){
  const lang=locale(),t=word[lang]||word.en;
  const arr=Array.isArray(content?.bookLines)?content.bookLines:[];
  const ix=Math.max(0,Math.min(arr.length-1,Number(content?.activeIndex)||0));
  const row=(Array.isArray(content?.lineData)?content.lineData[ix]:null)||{};
  const scripts=row.scripts||{},meanings=row.meanings||{};
  const key=lang==='pa'?'gurmukhi':lang==='hi'?'hindi':'english';
  const meaningKey=lang==='pa'?'punjabi':lang==='hi'?'hindi':'english';
  const line=scripts[key]||content?.scripts?.[key]||scripts.gurmukhi||arr[ix]||content?.verse;
  const meaning=meanings[meaningKey]||content?.meanings?.[meaningKey]||
    meanings.punjabi||content?.meanings?.punjabi||
    meanings.hindi||content?.meanings?.hindi||meanings.english||content?.meanings?.english;
  const blessing=content?.mode==='waheguru';
  if(blessing){verse.textContent=lang==='pa'?'ਵਾਹਿਗੁਰੂ':lang==='hi'?'वाहेगुरु':'Waheguru';arth.textContent='';}
  else{verse.textContent=line||t.waiting;arth.textContent=meaning||'';}
  const connected=(online||peerFresh())&&!!content;
  state.textContent=connected?t.online:t.offline;
  state.dataset.connected=String(connected);
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
     if(!acceptedFeed||data.revision!==previousRevision){
      acceptedFeed=true;
      latestFeed=data.content;
      previousRevision=data.revision;
     }
     online=true;
    }
   }else{online=false}
  }catch(_){online=false}
  finally{if(!peerFresh()&&acceptedFeed&&(latestFeed||!lastPeerAt))content=latestFeed;busy=false;paint();if(!document.hidden)job=setTimeout(poll,2600)}
 }
 document.getElementById('lang')?.addEventListener('change',paint);
 if(window.GurbaniPeer&&typeof window.Peer==='function'){
  window.GurbaniPeer.start({
   id:()=> 'gurbani-sangat-view-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),byte=>byte.toString(16).padStart(2,'0')).join(''),
   onPeer:next=>{if(peer!==next){const previous=channel;channel=null;previous?.close();peer=next}},
   onOpen:connectPublic,
   onConnection:incoming=>incoming.close(),
   onCollision:()=>{},
   onTargetUnavailable:()=>{},
   onStatus:()=>{}
  });
  setInterval(connectPublic,5000);
 }
 document.addEventListener('visibilitychange',()=>{clearTimeout(job);if(!document.hidden){connectPublic();poll()}});
 window.addEventListener('online',()=>{clearTimeout(job);connectPublic();poll()});
 paint();poll();
})();
