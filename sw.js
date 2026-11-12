/* ============================================================
   TJKT FASE F — SERVICE WORKER (offline-first untuk pelajar)
   Strategi:
   - Aplikasi inti (HTML/CSS/JS/manifest/icon)  -> precache saat install
   - Aset lokal (SVG ilustrasi, gambar)         -> cache-first (cepat & offline)
   - Navigasi halaman                          -> network-first, fallback cache
   - Resource CDN (font/icon)                  -> stale-while-revalidate
   ============================================================ */
const VERSION = 'v24-final2';
const CACHE_APP = `tjkt-app-${VERSION}`;
const CACHE_ASSET = `tjkt-assets-${VERSION}`;
const CACHE_CDN = `tjkt-cdn-${VERSION}`;

const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/icons/favicon.ico',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/maskable-512.png',
    './assets/icons/apple-touch-icon.png'
];

// Ilustrasi pembelajaran (SVG kecil) — di-precache agar tersedia offline penuh
const ILUSTRASI = [
    'peta-jaringan-scope.svg', 'packet-journey.svg', 'topologi-tree-hybrid.svg',
    'analisis-kebutuhan.svg', 'server-client-services.svg', 'subnetting-flow.svg',
    'vlan-trunk.svg', 'routing-decision.svg', 'nat-pat-flow.svg', 'kabel-utp-pairing.svg',
    'wifi-channel.svg', 'fiber-sm-mm.svg', 'defense-in-depth.svg', 'firewall-dmz.svg',
    'crypto-compare.svg', 'linux-filetree.svg', 'dhcp-dns-flow.svg'
].map(f => `./assets/${f}`);

// Foto perangkat asli (dari internet) — disimpan lokal di assets/devices/
const PERANGKAT = [
    'router.jpg', 'switch.jpg', 'accesspoint.jpg', 'firewall.png', 'server.jpg',
    'hub.jpg', 'modem.jpg', 'nic.jpg', 'utp.jpg', 'fiber.jpg', 'coax.jpg'
].map(f => `./assets/devices/${f}`);

// Ilustrasi & foto dari slide materi (assets/ppt/) — di-precache agar offline
const PPT = [
    'app-apache.jpg', 'app-browser.jpg', 'app-exchange.jpg', 'app-os.jpg', 'app-samba.png',
    'fiber-cahaya.jpeg', 'gateway-diagram.png', 'hero-jaringan.png',
    'ikon-badge.png', 'ikon-cloud-server.png', 'ikon-keamanan.png', 'ikon-rumah.png',
    'ikon-teknisi.png', 'ikon-tower.png', 'ip-khusus.png',
    'ipv4-biner.png', 'ipv4-contoh.png', 'ipv4-struktur.png',
    'kabel-kategori-utp.png', 'kabel-koaksial-jenis.jpeg', 'kabel-koaksial-konektor.jpeg',
    'kabel-koaksial-lapisan.jpeg', 'kabel-koaksial-layers.png', 'kabel-koaksial-struktur.jpg',
    'kabel-koaksial-tools.jpeg', 'kabel-t568.jpeg', 'kabel-t568-tabel.png',
    'kabel-tools.jpeg', 'kabel-utp-ftp-stp.jpeg', 'kabel-utp-potong.jpg', 'kabel-utp-stp-ftp.jpg',
    'logo-sekolah.png', 'nat-diagram.png',
    'os-cisco-ios.jpg', 'os-debian.jpg', 'os-junos.jpg', 'os-routeros.png', 'os-windows-server.jpg',
    'perangkat-antivirus.png', 'perangkat-firewall-diagram.png', 'perangkat-ids.jpg',
    'perangkat-nic-bnc.png', 'perangkat-nic-kartu.jpg', 'perangkat-router-juniper.png',
    'perangkat-router-linksys.jpg', 'perangkat-router-mikrotik.jpg', 'perangkat-router-mikrotik2.jpg',
    'perangkat-router-tplink.jpg', 'perangkat-switch-cisco.jpg', 'perangkat-switch-dlink.jpg',
    'perangkat-switch-hp.jpg', 'perangkat-switch-stack.png',
    'routing-bgp.jpg', 'routing-dv-ls.gif', 'routing-flow.jpg', 'routing-ospf.png',
    'routing-protokol.png', 'routing-rip.png',
    'topologi-bus.png', 'topologi-mesh.png', 'topologi-ring.jpg', 'topologi-star.png', 'topologi-tree.png',
    'vlan-diagram.png', 'vlan-perintah.png',
    'wifi-4g.png', 'wifi-komponen.jpg', 'wifi-multipath.png', 'wifi-spektrum.png', 'wifi-standar.png'
].map(f => `./assets/ppt/${f}`);

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_APP)
            .then(cache => Promise.allSettled(APP_SHELL.map(u => cache.add(u))))
            .then(() => caches.open(CACHE_ASSET))
            .then(cache => Promise.allSettled(ILUSTRASI.concat(PERANGKAT, PPT).map(u => cache.add(u))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    const keep = [CACHE_APP, CACHE_ASSET, CACHE_CDN];
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

const isStatic = url =>
    /\.(svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|css|js)$/i.test(url.pathname);

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // 1) Navigasi halaman -> network-first, fallback ke cache (bisa offline)
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE_APP).then(c => c.put('./index.html', copy));
                    return res;
                })
                .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
        );
        return;
    }

    // 2) Aset lokal -> gambar cache-first; CSS/JS stale-while-revalidate (update menyusul)
    if (url.origin === self.location.origin) {
        if (isStatic(url)) {
            const isCode = /\.(css|js)$/i.test(url.pathname);
            if (isCode) {
                event.respondWith(
                    caches.open(CACHE_APP).then(cache =>
                        cache.match(req).then(hit => {
                            const network = fetch(req).then(res => {
                                if (res && res.ok) cache.put(req, res.clone());
                                return res;
                            }).catch(() => hit);
                            return hit || network;
                        })
                    )
                );
                return;
            }
            event.respondWith(
                caches.match(req).then(hit => hit || fetch(req).then(res => {
                    const copy = res.clone();
                    caches.open(url.pathname.includes('/icons/') || url.pathname.includes('/assets/') ? CACHE_ASSET : CACHE_APP)
                        .then(c => c.put(req, copy));
                    return res;
                }))
            );
            return;
        }
        return;
    }

    // 3) CDN (font, font-awesome) -> stale-while-revalidate, gagal pun tetap ada di cache
    if (url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('flaticon.com')) {
        event.respondWith(
            caches.open(CACHE_CDN).then(cache =>
                cache.match(req).then(hit => {
                    const network = fetch(req).then(res => {
                        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
                        return res;
                    }).catch(() => hit);
                    return hit || network;
                })
            )
        );
    }
});
