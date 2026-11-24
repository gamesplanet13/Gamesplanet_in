/* Safar-e-Shahadat notification display helper.
   Background push delivery requires a configured push server/subscription;
   foreground reminders are scheduled by the open website. */
'use strict';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  if(!event.data)return;
  let payload={};
  try{payload=event.data.json()}catch(_){payload={body:event.data.text()}}
  const title=String(payload.title||'Safar-e-Shahadat 2026');
  event.waitUntil(self.registration.showNotification(title,{
    body:String(payload.body||'Samagam update'),
    tag:String(payload.tag||'poh-update'),
    data:{url:'./'},
    icon:undefined
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const pages=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const page of pages){if(page.url.includes('/poh-samagam/')){await page.focus();return}}
    if(self.clients.openWindow)await self.clients.openWindow('./');
  })());
});
