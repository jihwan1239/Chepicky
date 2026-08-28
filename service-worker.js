const CACHE_NAME = 'chepicky-v6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/apple-touch-icon-120.png',
  './icons/apple-touch-icon-152.png',
  './icons/apple-touch-icon-167.png',
  './brand/logo-white.png',
  './brand/logo-cherry.png',
  './brand/logo-dark.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 카드 혜택 API는 절대 캐시하지 않는다.
  // 관리자가 카드를 수정했는데 앱이 옛날 목록을 계속 보여주면 안 되기 때문.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // index.html은 항상 최신을 먼저 시도한다(네트워크 우선).
  // 그래야 앱을 새로 배포했을 때 홈 화면 아이콘으로 열어도 바로 반영된다.
  if (request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 나머지 정적 파일은 캐시 우선.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => new Response('', { status: 503, statusText: 'Offline' })))
  );
});
