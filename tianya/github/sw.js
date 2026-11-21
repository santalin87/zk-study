/* 天娅学习站 Service Worker（2026-11-10）：视频离线缓存 + 站点外壳离线可用
   视频只缓存用户在页面上手动点的课（页面用 Cache API 写入 ty-videos-v1），这里负责命中时回放（含分段 Range 合成）。
   外壳（首页与数据 js）网络优先、断网回退缓存，保证离线能打开站点看已缓存的课。 */
var VCACHE = 'ty-videos-v1';
var SCACHE = 'ty-shell-v1';

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function rangeResponse(hit, req) {
  var range = req.headers.get('range');
  if (!range) return hit;
  var m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return hit;
  return hit.blob().then(function (blob) {
    var total = blob.size;
    var start, end;
    if (m[1] === '') { var suf = parseInt(m[2], 10); start = Math.max(0, total - suf); end = total - 1; }
    else { start = parseInt(m[1], 10); end = m[2] === '' ? total - 1 : Math.min(parseInt(m[2], 10), total - 1); }
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + total } });
    var part = blob.slice(start, end + 1);
    return new Response(part, {
      status: 206,
      headers: {
        'content-type': 'video/mp4',
        'content-range': 'bytes ' + start + '-' + end + '/' + total,
        'content-length': String(end - start + 1),
        'accept-ranges': 'bytes'
      }
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/video/') === 0) {
    e.respondWith(caches.open(VCACHE).then(function (c) {
      return c.match(url.pathname).then(function (hit) {
        if (hit) return url.pathname.slice(-4) === '.mp4' ? rangeResponse(hit, req) : hit;
        return fetch(req);
      });
    }));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html' || /\.js$/.test(url.pathname)) {
    var key = (url.pathname === '/' ? '/index.html' : url.pathname);
    e.respondWith(caches.open(SCACHE).then(function (c) {
      return fetch(req).then(function (r) {
        if (r && r.ok) c.put(key, r.clone());
        return r;
      }).catch(function () {
        return c.match(key).then(function (hit) {
          if (hit) return hit;
          throw new Error('offline and not cached');
        });
      });
    }));
  }
});
