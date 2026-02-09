// IT Inventory - Service Worker
// Ciclo 4: PWA Implementation
// Estrategia: Network First con fallback a Cache

const CACHE_NAME = 'it-inventory-v1.0.0';
const API_CACHE_NAME = 'it-inventory-api-v1.0.0';

// Assets estáticos a cachear en install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/static/css/main.css',
    '/static/js/main.js',
    '/manifest.json',
    '/logo192.png',
    '/logo512.png'
];

// URLs de API que se pueden cachear
const CACHEABLE_API_ROUTES = [
    '/analytics/',
    '/devices/',
    '/employees/',
    '/alerts/'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Installed successfully');
                // Activar inmediatamente sin esperar
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar cachés viejos
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name !== CACHE_NAME && name !== API_CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[Service Worker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated successfully');
                // Tomar control de todas las páginas inmediatamente
                return self.clients.claim();
            })
    );
});

// ============================================
// FETCH EVENT - Estrategia de Caché
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo interceptar requests del mismo origen
    if (url.origin !== location.origin) {
        return;
    }

    // Estrategia para API requests
    if (url.pathname.startsWith('/api/') || url.port === '8000') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Estrategia para assets estáticos
    event.respondWith(cacheFirstStrategy(request));
});

// ============================================
// ESTRATEGIA: Network First (para API)
// ============================================
async function networkFirstStrategy(request) {
    try {
        // Intentar obtener de la red primero
        const networkResponse = await fetch(request);

        // Si es exitoso, cachear la respuesta
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Si falla la red, intentar obtener del caché
        console.log('[Service Worker] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return cachedResponse;
        }

        // Si no hay caché, retornar respuesta offline
        return new Response(
            JSON.stringify({
                error: 'Offline',
                message: 'No hay conexión a internet y no hay datos en caché'
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// ============================================
// ESTRATEGIA: Cache First (para assets)
// ============================================
async function cacheFirstStrategy(request) {
    // Intentar obtener del caché primero
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        console.log('[Service Worker] Serving from cache:', request.url);
        return cachedResponse;
    }

    // Si no está en caché, obtener de la red
    try {
        const networkResponse = await fetch(request);

        // Cachear la respuesta para futuras requests
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);

        // Retornar página offline si existe
        return caches.match('/offline.html') || new Response('Offline');
    }
}

// ============================================
// BACKGROUND SYNC (futuro)
// ============================================
// Para sincronizar datos cuando vuelva la conexión
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // TODO: Implementar sincronización de datos pendientes
    console.log('[Service Worker] Syncing data...');
}

// ============================================
// PUSH NOTIFICATIONS (futuro)
// ============================================
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        tag: 'notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification('IT Inventory', options)
    );
});

// ============================================
// MESSAGE EVENT
// ============================================
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                );
            })
        );
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Verificar si una URL es cacheable
function isCacheable(url) {
    return CACHEABLE_API_ROUTES.some((route) => url.includes(route));
}

// Limpiar caché viejo
async function cleanOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(
        (name) => name !== CACHE_NAME && name !== API_CACHE_NAME
    );

    return Promise.all(oldCaches.map((name) => caches.delete(name)));
}

console.log('[Service Worker] Loaded successfully');
