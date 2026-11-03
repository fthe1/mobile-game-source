/* Cache the complete bundled content, including every recording, before going offline. */
const PREFIX = 'qalam-offline-' + self.registration.scope + '-';
const BUILD = '75014ba1ffe897ad';
const cacheName = PREFIX + BUILD;
async function currentCache() {
    const response = await fetch(new URL('asset-manifest.json', self.registration.scope), {cache:'no-store'});
    if (!response.ok) throw new Error('Offline manifest unavailable');
    const manifest = await response.json();
    if (manifest.version !== BUILD) throw new Error('Offline resource version mismatch');
    return {name:cacheName, assets:manifest.assets};
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const manifest = await currentCache();
    const cache = await caches.open(manifest.name);
    // Bound concurrent requests on lower-memory phones.
    for (let i=0; i<manifest.assets.length; i+=16) {
      await cache.addAll(manifest.assets.slice(i,i+16).map(file => new URL(file,self.registration.scope).href));
    }
    await cache.add(new URL('asset-manifest.json',self.registration.scope));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names=await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name!==cacheName).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
async function ranged(request, response) {
  const range=request.headers.get('Range');
  if (!range) return response;
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response(null,{status:416});
  const bytes=await response.arrayBuffer(), size=bytes.byteLength;
  const start=match[1] ? Number(match[1]) : Math.max(0,size-Number(match[2]));
  const end=match[1] ? (match[2] ? Math.min(size-1,Number(match[2])) : size-1) : size-1;
  if (start>=size || start>end) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
  const headers=new Headers(response.headers);
  headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
  headers.set('Content-Length',String(end-start+1));
  headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if (request.method!=='GET' || url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache=await caches.open(cacheName);
    const navigation=request.mode==='navigate';
    const root=new URL(self.registration.scope);
    const key=navigation && url.pathname===root.pathname ? new URL('index.html',root).href : request.url;
    const cached=await cache.match(key);
    if (cached) return ranged(request,cached);
    try { return await fetch(request); }
    catch (error) { return new Response('Resource unavailable offline',{status:504,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
  })());
});
