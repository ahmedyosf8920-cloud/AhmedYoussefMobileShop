const CACHE='ays-central-v27i';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // Network-first: always get the latest version, fall back to cache only when offline.
  e.respondWith(fetch(e.request).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}
    return res;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus' in c){c.postMessage({go:'prayer'});return c.focus()}}return clients.openWindow('./index.html#prayer')}))});

/* ===== إشعارات الصلاة في الخلفية (Periodic Background Sync — حيث يدعمها المتصفح) ===== */
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('ays_prsw',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function kv(m,k,v){return idb().then(db=>new Promise((res,rej)=>{const st=db.transaction('k',m==='get'?'readonly':'readwrite').objectStore('k'),q=m==='get'?st.get(k):st.put(v,k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}))}
async function fireDue(){
  const list=(await kv('get','sched'))||[],fired=(await kv('get','fired'))||{},now=Date.now();let ch=false;
  for(const e of list){
    if(now>=e.t&&now-e.t<20*60000&&!fired[e.k]&&e.tx){
      fired[e.k]=now;ch=true;
      await self.registration.showNotification(e.tx[0],{body:e.tx[1],icon:'icon-192.png',badge:'icon-192.png',tag:e.k,dir:'rtl',lang:'ar',data:{go:'prayer'}});
    }
  }
  Object.keys(fired).forEach(k=>{if(now-fired[k]>3*864e5){delete fired[k];ch=true}});
  if(ch)await kv('put','fired',fired);
}
self.addEventListener('periodicsync',e=>{if(e.tag==='ays-prayer')e.waitUntil(fireDue())});
self.addEventListener('sync',e=>{if(e.tag==='ays-prayer')e.waitUntil(fireDue())});
