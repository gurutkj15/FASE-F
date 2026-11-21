/* ============================================================
   TJKT FASE F — SERVICE WORKER (offline-first untuk pelajar)
   Strategi:
   - Aplikasi inti (HTML/CSS/JS/manifest/icon)  -> precache saat install
   - Aset lokal (SVG ilustrasi, gambar)         -> cache-first (cepat & offline)
   - Navigasi halaman                          -> network-first, fallback cache
   - Resource CDN (font/icon)                  -> stale-while-revalidate
   ============================================================ */
const VERSION = 'v53-hd-device-photos';
const CACHE_APP = `tjkt-app-${VERSION}`;
const CACHE_ASSET = `tjkt-assets-${VERSION}`;
const CACHE_CDN = `tjkt-cdn-${VERSION}`;

const APP_SHELL = [
    './',
    './index.html',
    './style.css?v=53',
    './app.js?v=53',
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

// Foto perangkat asli (dari sumber internet beresolusi tinggi) — disimpan lokal di assets/devices/
const PERANGKAT = [
    'router.jpg', 'switch.jpg', 'accesspoint.jpg', 'firewall.png', 'server.jpg',
    'hub.jpg', 'modem.jpg', 'nic.jpg', 'utp.jpg', 'fiber.jpg', 'coax.jpg',
    'olt-gpon.jpg', 'sfp-transceiver.jpg', 'media-converter.jpg', 'patch-panel.jpg',
    'punch-down-tool.jpg', 'cable-certifier.jpg', 'poe-injector.jpg', 'ups-server.jpg',
    'network-rack.jpg', 'radio-ptp-outdoor.jpg', 'radio-cpe-nanostation.jpg',
    'ips-appliance.jpg', 'drop-cable-ftth.jpg', 'fiber-connectors.jpg',
    'fiber-microscope.jpg', 'vfl-laser.jpg', 'fiber-mpo-dc.jpg'
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
    'kabel-t568-gigabit-poe.svg',
    'logo-sekolah.png', 'nat-diagram.png', 'nat-mikrotik-topology.svg',
    'os-cisco-ios.jpg', 'os-debian.jpg', 'os-junos.jpg', 'os-routeros.png', 'os-windows-server.jpg',
    'perangkat-antivirus.png', 'perangkat-firewall-diagram.png', 'perangkat-ids.jpg', 'sec-ids-ips-edr-arch.svg',
    'perangkat-nic-bnc.png', 'perangkat-nic-kartu.jpg', 'perangkat-router-juniper.png',
    'perangkat-router-linksys.jpg', 'perangkat-router-mikrotik.jpg', 'perangkat-router-mikrotik2.jpg',
    'perangkat-router-tplink.jpg', 'perangkat-switch-cisco.jpg', 'perangkat-switch-dlink.jpg',
    'perangkat-switch-hp.jpg', 'perangkat-switch-stack.png',
    'routing-bgp.jpg', 'routing-dv-ls.gif', 'routing-flow.jpg', 'routing-l3-engine.svg', 'routing-ospf.png',
    'routing-protokol.png', 'routing-rip.png',
    'topologi-bus.png', 'topologi-mesh.png', 'topologi-ring.jpg', 'topologi-star.png', 'topologi-tree.png',
    'vlan-diagram.png', 'vlan-perintah.png',
    'wifi-4g.png', 'wifi-komponen.jpg', 'wifi-multipath.png', 'wifi-ptp-ptmp-fresnel.svg', 'wifi-spektrum.png', 'wifi-standar.png'
].map(f => `./assets/ppt/${f}`);

// Materi Fiber Optik (7 TP) — crop PER GAMBAR (bukan per halaman) dari slide
// Presentasi FO Guru TKJ. Setiap figur dijelaskan satu per satu di halaman TP.
const FOOPTIK = [
    'fig-tp11-k3lh-apd.jpg', 'fig-tp11-laser-safety.svg',
    'fig-fiber-tir-cutaway.svg', 'fig-014-mode-perambatan.jpg',
    'fig-struktur-kabel-fo.svg', 'fig-tia598-colors.svg', 'fig-drop-cable-g657.svg',
    'fig-017-loose-tube-fiber-count.jpg', 'fig-017-penampang-loose-tube.jpg',
    'fig-030-toolkit.jpg', 'fig-030-genset.jpg',
    'fig-032-ancoring.jpg', 'fig-032-hdpe.jpg', 'fig-032-joint-closure.jpg',
    'fig-032-stainless-bend.jpg', 'fig-032-suspension.jpg',
    'fig-upc-vs-apc.svg', 'fig-031-cleaning-pro.jpg',
    'fig-031-adapter.jpg', 'fig-031-fast-connector.jpg', 'fig-031-patchcord.jpg',
    'fig-031-pigtail.jpg', 'fig-031-protection-sleeve.jpg', 'fig-031-splitter.jpg',
    'fig-033-odc.jpg', 'fig-033-odf.jpg', 'fig-033-odp.jpg', 'fig-033-otb.jpg', 'fig-033-roset.jpg',
    'fig-fusion-splicer-diagram.svg', 'fig-cleaver-striper-sop.svg',
    'fig-059-splicer-posisi.jpg', 'fig-060-cleaver-parts.jpg', 'fig-060-cleaver-use.jpg',
    'fig-060-striper-use.jpg', 'fig-030-splicer.jpg', 'fig-030-striper.jpg',
    'fig-030-opm-ols.jpg', 'fig-opm-zeroing-budget.svg',
    'fig-084-opm-pair.jpg', 'fig-085-loss-formula.jpg',
    'fig-066-core-variation.jpg', 'fig-066-micro-bending.jpg',
    'fig-030-otdr.jpg', 'fig-otdr-trace-pro.svg',
    'fig-ftth-branching-map.svg'
].map(f => `./assets/fo/${f}`);

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_APP)
            .then(cache => Promise.allSettled(APP_SHELL.map(u => cache.add(u))))
            .then(() => caches.open(CACHE_ASSET))
            .then(cache => Promise.allSettled(ILUSTRASI.concat(PERANGKAT, PPT, FOOPTIK).map(u => cache.add(u))))
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
    /\.(svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|css|js|json)$/i.test(url.pathname);

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

    // 2) Aset lokal -> CSS/JS/JSON pakai network-first agar pembaruan kode langsung aktif;
    // gambar tetap cache-first agar hemat kuota dan cepat
    if (url.origin === self.location.origin) {
        if (isStatic(url)) {
            const isCode = /\.(css|js|json)$/i.test(url.pathname);
            if (isCode) {
                event.respondWith(
                    fetch(req)
                        .then(res => {
                            if (res && res.ok) {
                                const copy = res.clone();
                                caches.open(CACHE_APP).then(c => c.put(req, copy));
                            }
                            return res;
                        })
                        .catch(() => caches.match(req, { ignoreSearch: true }))
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
