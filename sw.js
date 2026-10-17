// 서비스 워커: 홈 화면 앱 설치 조건 + 오프라인 플레이.
// 항상 네트워크를 먼저 쓰고(배포 즉시 새 버전), 연결이 없을 때만 저장해 둔 사본을 쓴다.
const CACHE = 'witch-whiskers';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
