'use strict';
/* Read-only live verse widget using both public Sangat View connections. */
(()=>{
 const url='https://sangat-view-live.gamesplanet.chatgpt.site/live';
 const verse=document.getElementById('panktiVerse'),arth=document.getElementById('panktiArth'),box=document.getElementById('panktiBox');
 if(!verse||!arth||!box)return;
 const locale=()=>document.getElementById('lang')?.value||'pa';
 let feedContent=null,feedRevision,etag='',online=false,job=null,busy=false;
 let peer=null,channel=null,peerContent;
 function connectPublic(){
  if(document.hidden||!peer?.open||peer.disconnected||channel)return;
  try{
   const connection=peer.connect('gurbani-sangat-public-v1',{reliable:true,metadata:{type:'sangat-view-read-only'}});
   channel=connection;
   const drop=()=>{
    if(channel!==connection)return;
    channel=null;
    peerContent=undefined;
    paint();
   };
   connection.on('open',()=>{if(channel===connection)connection.send({type:'sangat-join'})});
   connection.on('close',drop);
   connection.on('error',()=>{drop();connection.close()});
   connection.on('data',packet=>{
    if(channel!==connection||packet?.type!=='sangat-live'||!Number.isFinite(packet.revision))return;
    const next=packet.content;
    if(next!==null&&(!Array.isArray(next?.bookLines)||next.bookLines.length>400||
      next.bookLines.some(line=>typeof line!=='string'||line.length>500)))return;
    peerContent=next;
    if(!next||next.mode==='waheguru'||(!next.bookLines.length&&!next.verse))feedContent=null;
    paint();
   });
   setTimeout(()=>{if(channel===connection&&!connection.open){drop();connection.close()}},12000);
  }catch(_){}
 }
 function paint(){
  const lang=locale();
  const content=peerContent!==undefined?peerContent:(online?feedContent:null);
  const lines=Array.isArray(content?.bookLines)?content.bookLines:[];
  const index=Math.max(0,Math.min(lines.length-1,Number(content?.activeIndex)||0));
  const original=lines[index]||content?.verse;
  const hasShabad=content?.mode!=='waheguru'&&typeof original==='string'&&!!original.trim();
  const row=Array.isArray(content?.lineData)?content.lineData[index]:null;
  const scriptKey=lang==='pa'?'gurmukhi':lang==='hi'?'hindi':'english';
  const meaningKey=lang==='pa'?'punjabi':lang==='hi'?'hindi':'english';
  const line=hasShabad?(row?.scripts?.[scriptKey]||content.scripts?.[scriptKey]||(lang==='pa'?original:'')):'';
  const meaning=hasShabad?(row?.meanings?.[meaningKey]||content.meanings?.[meaningKey]||''):'';
  verse.textContent=line;
  verse.hidden=!line;
  arth.textContent=meaning;
  arth.hidden=!meaning;
  box.hidden=!line&&!meaning;
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
     if(data.revision===undefined||data.revision!==feedRevision){
      feedRevision=data.revision;
      feedContent=data.content;
     }
     online=true;
    }else{online=false;etag='';}
   }else{online=false}
  }catch(_){online=false}
  finally{busy=false;paint();if(!document.hidden)job=setTimeout(poll,2600)}
 }
 document.getElementById('lang')?.addEventListener('change',paint);
 if(window.GurbaniPeer&&typeof window.Peer==='function'){
  window.GurbaniPeer.start({
   id:()=> 'gurbani-sangat-view-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),byte=>byte.toString(16).padStart(2,'0')).join(''),
   onPeer:next=>{if(peer!==next){const previous=channel;channel=null;peerContent=undefined;previous?.close();peer=next;paint()}},
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
