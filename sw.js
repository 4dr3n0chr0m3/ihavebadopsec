importScripts('/uv/uv.bundle.js');
importScripts('/uv.config.js'); // FIXED: Removed the extra /uv/ from this path
importScripts('/uv/uv.sw.js');

const sw = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
    event.respondWith(sw.fetch(event));
});
