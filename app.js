// ============================================================
// TJKT FASE F — APP.JS | CLAY EDITION | SMK Negeri 1 Kuantan Mudik
// ============================================================
'use strict';

// ── SAFE STORAGE HELPERS ────────────────────────────────────
function safeGetJSON(key, fallback = {}) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : fallback;
    } catch (e) {
        return fallback;
    }
}
function safeSetJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

// ── STATE ──────────────────────────────────────────────────
let currentPage  = '';
let currentTrack = 'tkj'; // 'tkj' | 'fo'
let quizState    = {};
let progress     = safeGetJSON('tjkt_progress', {});

// ── ROUTER: hash + riwayat (back/forward) ──────────────────
// Setiap halaman punya alamat sendiri (#/topologi, #/fo-tp/tp21, ...)
// sehingga tombol Back browser bekerja dan tautan bisa dibagikan.
let _routeSilent = false;
let _lastRoute = '';
const _scrollMemo = {};

function pushRoute(route) {
    if (_routeSilent) return;
    const cur = location.hash || '#/home';
    if (cur === route) return;
    _scrollMemo[cur] = window.scrollY;
    try { history.pushState({ route }, '', route); }
    catch (e) { location.hash = route; }
}
function parseRoute(hash) {
    const h = (hash || '').replace(/^#\/?/, '').trim();
    if (!h) return null;
    const [a, b] = h.split('/');
    if (a === 'enrich' && b) return { kind: 'enrich', id: b };
    if (a === 'fo-enrich' && b) return { kind: 'foEnrich', id: b };
    if (a === 'fo-tp' && b) return { kind: 'page', id: 'fo-' + b };
    if (a === 'quiz' && b) return { kind: 'quiz', id: b };
    return { kind: 'page', id: a };
}
function renderRoute(r, restoreY) {
    if (!r) return;
    _lastRoute = location.hash;
    _routeSilent = true;
    try {
        if (r.kind === 'page') showPage(r.id, { fromRoute: true });
        else if (r.kind === 'enrich') showEnrichment(r.id, { fromRoute: true });
        else if (r.kind === 'foEnrich') showFoEnrichment(r.id, { fromRoute: true });
        else if (r.kind === 'foTp') showPage('fo-' + r.id, { fromRoute: true });
        else if (r.kind === 'quiz') showAssessment(r.id, { fromRoute: true });
    } finally {
        setTimeout(() => { _routeSilent = false; }, 0);
    }
    setTimeout(() => window.scrollTo(0, restoreY || 0), 200);
}
window.addEventListener('popstate', () => {
    const key = location.hash || '#/home';
    renderRoute(parseRoute(location.hash), _scrollMemo[key] || 0);
});
window.addEventListener('hashchange', () => {
    if (_routeSilent) return;
    if (location.hash === _lastRoute) return;
    renderRoute(parseRoute(location.hash), 0);
});

// ── SPLASH ────────────────────────────────────────────────
let _splashHideTimer = null;
function startApp(target, skipRender = false) {
    clearTimeout(_splashHideTimer);
    const dest = target && pages[target] ? target : 'home';
    currentTrack = (dest === 'fiberOptik' || dest === 'fo-pengayaan' || dest.startsWith('fo-')) ? 'fo' : 'tkj';
    try { syncTrackUI(currentTrack); } catch (e) { console.error(e); }

    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
    if (!skipRender) {
        try { showPage(dest); } catch (e) { console.error(e); }
    }
    if (splash) {
        splash.style.pointerEvents = 'none';
        splash.style.transition = 'opacity .28s ease';
        splash.style.opacity = '0';
        _splashHideTimer = setTimeout(() => {
            splash.style.display = 'none';
        }, 290);
    }
}
window.startApp = startApp;
if (typeof window !== 'undefined' && window.__pendingSplashTarget) {
    const _pending = window.__pendingSplashTarget;
    window.__pendingSplashTarget = null;
    setTimeout(() => startApp(_pending), 0);
}

// ============================================================
// KEMBALI KE AWAL — 30 menit tanpa aktivitas ATAU lewat tombol Portal Awal
// ============================================================
const IDLE_LIMIT = 30 * 60 * 1000;   // 30 menit
let idleTimer = null;

function restartToBeginning() {
    clearTimeout(idleTimer);
    clearTimeout(_splashHideTimer);
    closeSidebar();
    closeSearch();
    // tampilkan lagi layar pembuka (splash)
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    if (splash) {
        splash.style.transition = 'opacity .28s ease';
        splash.style.display = 'flex';
        splash.style.pointerEvents = 'auto';
        splash.style.opacity = '1';
    }
    if (app) app.classList.add('hidden');
    window.scrollTo(0, 0);
    idleTimer = setTimeout(restartToBeginning, IDLE_LIMIT);
}
window.restartToBeginning = restartToBeginning;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(restartToBeginning, IDLE_LIMIT);
}

['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove', 'click']
    .forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));

// Jendela di-minimize / tab berpindah -> reset idle timer tanpa merestart paksa
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resetIdleTimer();
});
resetIdleTimer();

// ============================================================
// TOMBOL KEMBALI KE ATAS
// ============================================================
function initTopButton() {
    if (document.getElementById('to-top')) return;
    const b = document.createElement('button');
    b.id = 'to-top';
    b.type = 'button';
    b.className = 'to-top';
    b.setAttribute('aria-label', 'Kembali ke atas');
    b.title = 'Kembali ke atas';
    b.innerHTML = '<i class="fas fa-arrow-up"></i><span>Atas</span>';
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(b);
    window.addEventListener('scroll', () => {
        b.classList.toggle('show', window.scrollY > 420);
    }, { passive: true });
}
initTopButton();

// ── NAVIGATION ────────────────────────────────────────────
const pages = {
    home, tkj: tkjPage, intro, glosarium, glosariumPerangkat, topologi, kebutuhan, peralatan, ip,
    vlan, routing, nat, kabel, nirkabel, fiber, fiberOptik: fiberOptikPage,
    keamanan, firewall, kriptografi, linux, server,
    progress: progressPage,
    pengayaan: pengayaanPage,
    'fo-pengayaan': foPengayaanPage
};

const lessonEnrichment = {
  "topologi": "\n<h2>1. Memahami Topologi dan Arsitektur Jaringan (Elemen 1)</h2>\n<p>Topologi adalah cara perangkat disusun dan dihubungkan, baik secara fisik maupun logis. Topologi fisik menjelaskan tata letak pengkabelan dan lokasi perangkat, sedangkan topologi logis menjelaskan bagaimana frame Ethernet (Layer 2) atau paket IP (Layer 3) mengalir melintasi jaringan. Arsitektur jaringan mencakup model layanan (Client-Server vs Peer-to-Peer), hierarki <i>Three-Tier</i> (Core, Distribution, Access) atau <i>Spine-Leaf</i> pada data center modern, segmentasi VLAN, redundansi jalur (Spanning Tree Protocol IEEE 802.1D / RSTP 802.1w &amp; EtherChannel/LACP IEEE 802.3ad), serta manajemen terpusat.</p>\n<h3>Memilih Topologi Berdasarkan Kebutuhan Industri</h3>\n<table><thead><tr><th>Topologi</th><th>Karakteristik Teknis</th><th>Penerapan &amp; Mitigasi Risiko</th></tr></thead><tbody>\n<tr><td><b>Star</b></td><td>Setiap endpoint terhubung point-to-point ke switch akses pusat</td><td>Standar utama LAN modern (IEEE 802.3); isolasi gangguan mudah. Titik kritis pada switch pusat dimitigasi dengan dual-power/stacking.</td></tr>\n<tr><td><b>Extended Star / Tree</b></td><td>Hierarki switch Access → Distribution → Core</td><td>Standar gedung bertingkat, kampus, dan SMK; wajib mengaktifkan RSTP (802.1w) dan LACP pada uplink redundan untuk mencegah switching loop.</td></tr>\n<tr><td><b>Mesh (Full / Partial)</b></td><td>Banyak jalur redundan antar-router/node (\(N(N-1)/2\) link untuk full mesh)</td><td>Digunakan pada WAN backbone ISP, OSPF/BGP core, dan Wireless Mesh; failover otomatis ketika satu link putus.</td></tr>\n<tr><td><b>Bus &amp; Ring</b></td><td>Media bersama (coaxial 10BASE2) atau cincin token/FDDI/SDH</td><td>Penting secara historis pada Ethernet klasik, namun di industri fiber modern konsep Ring hidup kembali sebagai <b>Metro Ethernet Ring (ITU-T G.8032 ERPS)</b> dengan failover &lt;50 ms.</td></tr>\n<tr><td><b>Hybrid / Spine-Leaf</b></td><td>Kombinasi beberapa topologi atau arsitektur 2-tier <i>Clos network</i></td><td>Standar jaringan enterprise, rumah sakit, dan data center cloud modern dengan latensi antar-server seragam (east-west traffic).</td></tr></tbody></table>\n<h3>Arsitektur Client-Server, Peer-to-Peer, dan Three-Tier</h3>\n<p>Pada <b>Client-Server</b>, server menyediakan layanan terpusat (Active Directory/LDAP, DNS, DHCP, Web, File/Samba, Database) sehingga kebijakan keamanan (AAA), autentikasi, dan backup 3-2-1 dapat dikelola dari satu titik. Pada <b>Peer-to-Peer (P2P)</b>, setiap host bertindak sebagai client sekaligus server tanpa kontrol terpusat (hanya cocok untuk workgroup kecil &lt;10 PC). Pada jaringan kampus/enterprise, Cisco dan standar industri merekomendasikan <b>Hierarchical Three-Tier Model</b>: <i>Access Layer</i> (koneksi port user, PoE, 802.1X, PortFast/BPDU Guard), <i>Distribution Layer</i> (terminasi VLAN/SVI, ACL policy, QoS, FHRP/HSRP/VRRP), dan <i>Core Layer</i> (switching/routing backbone berkecepatan tinggi 10G/40G/100G tanpa pemrosesan ACL yang membebani latensi).</p>\n<h3>Studi Kasus: Merancang Jaringan Laboratorium TJKT Standar Industri</h3>\n<p>Sebuah laboratorium TJKT memiliki 32 PC siswa, 1 PC instruktur, 1 server lokal (proxmox/virtualisasi), 1 printer jaringan, dan 2 Access Point Wi-Fi 6. Rancangan standar industri menggunakan topologi <b>Extended Star</b>: dua Managed Gigabit Switch 24-Port (dengan 2 port uplink SFP+ 10G LACP ke switch distribusi/router gateway), pemisahan VLAN Guru (VLAN 10), VLAN Siswa (VLAN 20), VLAN Server Lab (VLAN 30), dan VLAN Manajemen (VLAN 99), disertai proteksi loop RSTP serta dokumentasi <i>As-Built Drawing</i>.</p>\n<h3>Langkah Kerja Perencanaan Jaringan</h3>\n<ol><li>Identifikasi kebutuhan pengguna, jumlah concurrent user, aplikasi, lokasi, dan target SLA.</li><li>Gambar denah fisik (<i>floor plan</i>) dan diagram logis (L2/L3); beri label port, jalur kabel, VLAN, dan subnet.</li><li>Tentukan kapasitas backplane switch, throughput routing (Mpps), PoE budget (IEEE 802.3af/at/bt), dan kecepatan uplink.</li><li>Rencanakan skema alamat IPv4/IPv6 (VLSM), gateway, DHCP, DNS, serta matriks akses firewall antar-VLAN.</li><li>Hitung bill of materials (BoM): panjang kabel UTP/FO + slack 15%, patch panel, rack 19 inci, UPS online/line-interactive, dan grounding.</li><li>Uji rancangan dengan simulator (Cisco Packet Tracer / GNS3 / EVE-NG) atau pilot test, lalu sahkan dokumentasi.</li></ol>\n<div class=\"lesson-note\"><b>Catatan Praktisi:</b> Jangan memilih switch hanya dari jumlah port RJ-45. Periksa <i>switching capacity</i> (Gbps), <i>forwarding rate</i> (Mpps), dukungan IEEE 802.1Q VLAN, RSTP, LACP, SNMP/NetFlow monitoring, dan total <i>PoE power budget</i> (Watt).</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://kurikulum.kemdikbud.go.id/\" target=\"_blank\" rel=\"noopener\">Kepmendikbudristek No. 032/H/KR/2024 — Capaian Pembelajaran SMK/MAK Fase F Teknik Jaringan Komputer dan Telekomunikasi (Elemen 1–5)</a></li><li><a href=\"https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Campus/campover.html\" target=\"_blank\" rel=\"noopener\">Cisco Validated Design — Campus Network for High Availability (Three-Tier Core, Distribution, Access Architecture)</a></li><li><a href=\"https://standards.ieee.org/ieee/802.1Q/6844/\" target=\"_blank\" rel=\"noopener\">IEEE 802.1Q &amp; IEEE 802.1w (RSTP) — Standard for Local and Metropolitan Area Networks: Bridges and Bridged Networks</a></li></ul>\n",

  "kebutuhan": "\n<h2>2. Analisis Kebutuhan Teknis Pengguna Jaringan (Elemen 1)</h2>\n<p>Analisis kebutuhan teknis (<i>Technical Requirements Analysis</i>) adalah proses rekayasa untuk menerjemahkan kebutuhan operasional organisasi ke dalam spesifikasi parameter jaringan yang terukur, dapat diuji (<i>verifiable</i>), dan sesuai anggaran (RAB). Seorang network engineer tidak boleh membeli perangkat atau menarik kabel sebelum memetakan profil pengguna, jenis trafik aplikasi (VoIP, video conference, ERP, CBT ujian), jam puncak (<i>peak hour</i>), serta target Service Level Agreement (SLA).</p>\n<h3>Enam Dimensi Kebutuhan Teknis Jaringan</h3>\n<ul><li><b>Pengguna (User Profile):</b> jumlah total akun, <i>concurrent users</i> (pengguna aktif bersamaan), rasio perangkat per user (BYOD), mobilitas, dan tingkat hak akses.</li><li><b>Bisnis &amp; Operasional:</b> jam operasional kritis, prioritas aplikasi (<i>mission-critical</i> vs <i>best-effort</i>), anggaran investasi (CAPEX) &amp; operasional (OPEX), serta biaya kerugian akibat downtime.</li><li><b>Perangkat Keras (Hardware):</b> spesifikasi PC/endpoint, server, switch (managed/PoE), router, access point, modul SFP/SFP+, rack server, dan kapasitas UPS (VA/Watt &amp; runtime menit).</li><li><b>Perangkat Lunak (Software):</b> sistem operasi server/client, lisensi, hypervisor virtualisasi, NMS monitoring (Zabbix, PRTG, LibreNMS), dan kompatibilitas protokol.</li><li><b>Konektivitas &amp; Parameter QoS (ITU-T G.114):</b> bandwidth internet (CIR vs MIR, rasio 1:1 dedicated vs broadband 1:4/1:8), throughput LAN, <b>latensi satu arah &lt; 150 ms</b> (LAN lokal &lt; 5 ms), <b>jitter &lt; 30 ms</b> untuk VoIP/video, <b>packet loss &lt; 1%</b>, dan target ketersediaan (SLA 99,5% s.d. 99,99%).</li><li><b>Keamanan &amp; Skalabilitas:</b> segmentasi VLAN, kontrol akses 802.1X/WPA3, firewall NGFW, pencatatan log (syslog), backup otomatis, dan cadangan ekspansi kapasitas 30–50% untuk 3–5 tahun ke depan.</li></ul>\n<h3>Rumus Estimasi Bandwidth &amp; Kapasitas</h3>\n<p>Dalam praktik industri, kebutuhan bandwidth total dihitung dengan memperhitungkan <i>Concurrency Ratio</i> (persentase user yang aktif mengunduh pada detik yang sama, biasanya 20%–50%) dan <i>Overhead</i> protokol TCP/IP (~10–15%):</p>\n<pre><code>Bandwidth Total = (Jumlah User × Concurrency Ratio × Bandwidth Rata-rata Aplikasi) × 1,25 (Safety Margin)</code></pre>\n<h3>Contoh Matriks Konversi Keluhan Pengguna ke Spesifikasi Teknis</h3>\n<table><thead><tr><th>Kebutuhan / Keluhan Pengguna</th><th>Spesifikasi Teknis &amp; Parameter Uji (Acceptance Criteria)</th></tr></thead><tbody><tr><td>Video pembelajaran &amp; Zoom sering patah-patah saat jam pelajaran</td><td>Ukur throughput pada jam sibuk; terapkan QoS/Traffic Shaping; jamin latensi &lt; 50 ms, jitter &lt; 20 ms, packet loss &lt; 0,5% (standar ITU-T G.114).</td></tr><tr><td>Sinyal Wi-Fi hilang di pojok ruang kelas &amp; koneksi lambat saat 35 siswa login</td><td>Lakukan <i>Wireless Site Survey</i>; targetkan sinyal <b>RSSI ≥ −65 dBm</b> dan <b>SNR ≥ 25 dB</b> di seluruh sudut ruang; gunakan AP Dual-Band Wi-Fi 6 (MU-MIMO/OFDMA).</td></tr><tr><td>Server nilai &amp; administrasi TU tidak boleh diakses dari Wi-Fi siswa</td><td>Segmentasi ke VLAN berbeda (IEEE 802.1Q), terapkan Extended ACL / Firewall Policy (deny VLAN Siswa → Server TU), dan uji penetrasi akses.</td></tr><tr><td>Jaringan harus tetap hidup saat listrik PLN padam mendadak selama ujian</td><td>Sediakan UPS pada rack core/router/switch PoE dengan kapasitas beban minimal 15–30 menit + proteksi surge arrester dan grounding &lt; 5 Ohm.</td></tr></tbody></table>\n<div class=\"lesson-note\"><b>Kriteria Penerimaan (User Acceptance Test / UAT):</b> Dokumen analisis kebutuhan wajib ditutup dengan checklist UAT yang ditandatangani bersama: uji DHCP lease, uji throughput (<code>iperf3</code>), uji ping/latency/jitter, uji isolasi VLAN, dan uji failover.</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://www.itu.int/rec/T-REC-G.114\" target=\"_blank\" rel=\"noopener\">ITU-T Recommendation G.114 — One-way transmission time (Standar Internasional Latensi &lt;150 ms &amp; QoS)</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc2544\" target=\"_blank\" rel=\"noopener\">IETF RFC 2544 — Benchmarking Methodology for Network Interconnect Devices (Throughput, Latency, Frame Loss)</a></li><li><a href=\"https://skkni.kemnaker.go.id/\" target=\"_blank\" rel=\"noopener\">SKKNI Bidang Jaringan Komputer (Kepmenaker No. 321 Tahun 2016) — Unit Kompetensi Mengumpulkan Kebutuhan Teknis Pengguna (J.611000.001.01)</a></li></ul>\n",

  "peralatan": "\n<h2>3. Inventarisasi dan Pemilihan Perangkat Jaringan (Elemen 1)</h2>\n<p>Pemilihan dan inventarisasi perangkat jaringan (<i>Network Asset Management</i>) menuntut pemahaman mendalam tentang pemetaan <b>Model OSI 7 Layer</b>, spesifikasi elektrikal/optik, serta kemampuan pemrosesan paket perangkat. Dokumen inventaris industri mencatat Hostname, Model/Part Number, Serial Number, MAC Address, IP Management, Lokasi Rack (U-position), Versi OS/Firmware, Status Garansi, serta Jadwal Backup Konfigurasi.</p>\n<h3>Pemetaan Perangkat pada Model OSI &amp; Parameter Kunci</h3>\n<table><thead><tr><th>Perangkat</th><th>Layer OSI</th><th>Fungsi Teknis &amp; Parameter Spesifikasi Utama</th></tr></thead><tbody>\n<tr><td><b>Hub / Repeater</b></td><td>Layer 1 (Physical)</td><td>Meregenerasi dan menyebarkan bit listrik ke seluruh port (1 <i>collision domain</i> &amp; 1 <i>broadcast domain</i>, half-duplex). Sudah digantikan oleh switch.</td></tr>\n<tr><td><b>Switch (L2 / L3)</b></td><td>Layer 2 / Layer 3</td><td>Meneruskan frame secara <i>full-duplex</i> berdasarkan <b>MAC Address Table (CAM)</b>; setiap port adalah 1 collision domain terpisah. Switch Managed mendukung IEEE 802.1Q VLAN, STP/RSTP, LACP, Port Mirroring (SPAN), 802.1X, dan SVI (L3 routing).</td></tr>\n<tr><td><b>Router</b></td><td>Layer 3 (Network)</td><td>Memisahkan <i>broadcast domain</i> dan meneruskan paket antar-subnet berdasarkan <b>Routing Table (FIB)</b> dengan prinsip <i>Longest Prefix Match</i>. Mendukung NAT, DHCP, VPN, QoS, dan protokol OSPF/BGP.</td></tr>\n<tr><td><b>Access Point (AP)</b></td><td>Layer 1–2 (WLAN)</td><td>Menjembatani frame nirkabel IEEE 802.11 ke Ethernet IEEE 802.3. AP Enterprise mendukung Multi-SSID dengan VLAN Tagging, PoE input, Roaming (802.11k/v/r), dan manajemen terpusat (Controller/Cloud).</td></tr>\n<tr><td><b>Firewall / NGFW</b></td><td>Layer 3–7</td><td>Menginspeksi state sesi (Stateful), memfilter trafik dengan ACL, Deep Packet Inspection (DPI), IPS, Application Control, dan SSL/TLS Inspection.</td></tr>\n<tr><td><b>Modem / ONT / ONU</b></td><td>Layer 1–2 (atau L3 HGU)</td><td>Mengonversi sinyal optik GPON/XGS-PON (1490 nm Rx / 1310 nm Tx) atau RF/DSL dari jaringan akses ISP menjadi antarmuka Ethernet RJ-45 di sisi pelanggan.</td></tr>\n<tr><td><b>NIC &amp; Transceiver SFP</b></td><td>Layer 1–2</td><td>Kartu antarmuka jaringan (RJ-45 / Wi-Fi / SFP+) yang memiliki alamat fisik <b>MAC Address 48-bit</b> (24-bit OUI vendor + 24-bit unik NIC). Modul SFP (1G), SFP+ (10G), dan QSFP28 (100G) memungkinkan pemilihan media fiber SMF/MMF secara modular.</td></tr></tbody></table>\n<h3>Standar Power over Ethernet (PoE) — IEEE 802.3</h3>\n<p>Switch PoE menyuplai daya listrik DC bersama data melalui kabel UTP Cat5e/Cat6 ke Access Point, IP Camera (CCTV), dan VoIP Phone tanpa adaptor listrik terpisah:</p>\n<ul><li><b>IEEE 802.3af (PoE / Type 1):</b> Daya maks. <b>15,4 W</b> per port dari switch (12,95 W di perangkat PD) pada tegangan 44–57 V DC.</li><li><b>IEEE 802.3at (PoE+ / Type 2):</b> Daya maks. <b>30 W</b> per port (25,5 W di perangkat PD) — standar untuk Access Point Wi-Fi 6 dan kamera PTZ.</li><li><b>IEEE 802.3bt (PoE++ / 4PPoE Type 3 &amp; 4):</b> Daya maks. <b>60 W</b> (Type 3) hingga <b>90–100 W</b> (Type 4) menggunakan keempat pasang kawat untuk AP Wi-Fi 7 dan thin-client.</li><li><b>Passive PoE (24V / 48V):</b> Menyuplai tegangan DC terus-menerus tanpa negosiasi resistansi IEEE 802.3 (umum pada CPE radio MikroTik/Ubiquiti) — <i>jangan ditancapkan ke perangkat non-PoE tanpa memeriksa voltase!</i></li></ul>\n<div class=\"lesson-note\"><b>Praktik Terbaik Inventarisasi:</b> Selalu hitung total <i>PoE Power Budget</i> switch (misal switch 24 port PoE+ dengan total budget 195 W hanya sanggup menyalakan ~12 perangkat @15W secara bersamaan, bukan 24 port penuh @30W!).</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://standards.ieee.org/ieee/802.3/10422/\" target=\"_blank\" rel=\"noopener\">IEEE 802.3-2022 — IEEE Standard for Ethernet (1000BASE-T, 10GBASE-T, SFP+, &amp; PoE 802.3af/at/bt)</a></li><li><a href=\"https://www.iso.org/standard/20269.html\" target=\"_blank\" rel=\"noopener\">ISO/IEC 7498-1 — Information technology — Open Systems Interconnection (OSI) Basic Reference Model</a></li></ul>\n",

  "ip": "\n<h2>4. Pengalamatan IPv4, IPv6, CIDR, VLSM, dan Subnetting (Elemen 1)</h2>\n<p>Pengalamatan IP (<i>Internet Protocol Addressing</i>) merupakan fondasi komunikasi Layer 3. Alamat <b>IPv4 (IETF RFC 791)</b> sepanjang 32-bit dibagi menjadi 4 oktet desimal (0–255), sedangkan <b>IPv6 (IETF RFC 8200)</b> sepanjang 128-bit ditulis dalam 8 blok heksadesimal 16-bit yang dipisahkan titik dua (misal <code>2001:db8:85a3::8a2e:370:7334/64</code>). Setiap alamat IP terbagi atas porsi <b>Network Prefix</b> dan <b>Host Identifier</b> yang dibatasi oleh <i>Subnet Mask</i> atau panjang prefix <b>CIDR (RFC 4632)</b>.</p>\n<h3>Klasifikasi Alamat IPv4 Khusus &amp; Privat (Standar IETF RFC)</h3>\n<table><thead><tr><th>Kategori Alamat</th><th>Rentang Blok CIDR</th><th>Standar RFC</th><th>Fungsi &amp; Aturan Routing</th></tr></thead><tbody>\n<tr><td><b>IP Private Kelas A</b></td><td><code>10.0.0.0/8</code> (10.0.0.0 – 10.255.255.255)</td><td>RFC 1918</td><td>Jaringan lokal enterprise/ISP internal (16.777.214 host); wajib di-NAT ke internet.</td></tr>\n<tr><td><b>IP Private Kelas B</b></td><td><code>172.16.0.0/12</code> (172.16.0.0 – 172.31.255.255)</td><td>RFC 1918</td><td>Jaringan kampus/gedung menengah (1.048.574 host); tidak dirutekan di internet publik.</td></tr>\n<tr><td><b>IP Private Kelas C</b></td><td><code>192.168.0.0/16</code> (192.168.0.0 – 192.168.255.255)</td><td>RFC 1918</td><td>Jaringan LAN sekolah, kantor SOHO, dan rumah (65.534 host; 256 subnet /24).</td></tr>\n<tr><td><b>Carrier-Grade NAT (CGNAT)</b></td><td><code>100.64.0.0/10</code> (100.64.0.0 – 100.127.255.255)</td><td>RFC 6598</td><td>Shared Address Space antara CPE/ONT pelanggan dan core NAT ISP (tidak bentrok dengan RFC 1918 LAN).</td></tr>\n<tr><td><b>Loopback</b></td><td><code>127.0.0.0/8</code> (umum: <code>127.0.0.1</code>)</td><td>RFC 1122</td><td>Pengujian tumpukan TCP/IP lokal (localhost) tanpa melewati kartu jaringan fisik.</td></tr>\n<tr><td><b>Link-Local (APIPA)</b></td><td><code>169.254.0.0/16</code></td><td>RFC 3927</td><td>Ditetapkan otomatis oleh OS saat client gagal mendapatkan respons dari DHCP server.</td></tr>\n<tr><td><b>Point-to-Point Link</b></td><td>Prefix <code>/30</code> (2 host) atau <code>/31</code> (2 host tanpa broadcast)</td><td>RFC 3021</td><td>Penghematan alamat IP untuk link antar-router point-to-point.</td></tr></tbody></table>\n<h3>Rumus Cepat Subnetting &amp; Tabel Referensi CIDR (/24 s.d. /30)</h3>\n<ul><li><b>Bit Host (\(m\))</b> = \(32 - \\text{Prefix}\). <b>Total Alamat per Blok</b> = \(2^m\). <b>Host Usable</b> = \(2^m - 2\) (dikurangi 1 Network ID &amp; 1 Broadcast Address).</li><li><b>Block Size (Kelipatan Subnet)</b> = \(256 - \\text{Nilai Oktet Terakhir Subnet Mask}\).</li><li><b>Broadcast Address</b> = \(\\text{Network Address Berikutnya} - 1\).</li></ul>\n<table><thead><tr><th>Prefix</th><th>Subnet Mask</th><th>Block Size</th><th>Total IP</th><th>Host Usable</th><th>Jumlah Subnet dari /24</th></tr></thead><tbody>\n<tr><td><code>/24</code></td><td>255.255.255.0</td><td>256</td><td>256</td><td><b>254</b></td><td>1</td></tr>\n<tr><td><code>/25</code></td><td>255.255.255.128</td><td>128</td><td>128</td><td><b>126</b></td><td>2 (.0, .128)</td></tr>\n<tr><td><code>/26</code></td><td>255.255.255.192</td><td>64</td><td>64</td><td><b>62</b></td><td>4 (.0, .64, .128, .192)</td></tr>\n<tr><td><code>/27</code></td><td>255.255.255.224</td><td>32</td><td>32</td><td><b>30</b></td><td>8 (.0, .32, .64, ..., .224)</td></tr>\n<tr><td><code>/28</code></td><td>255.255.255.240</td><td>16</td><td>16</td><td><b>14</b></td><td>16 (.0, .16, .32, ..., .240)</td></tr>\n<tr><td><code>/29</code></td><td>255.255.255.248</td><td>8</td><td>8</td><td><b>6</b></td><td>32</td></tr>\n<tr><td><code>/30</code></td><td>255.255.255.252</td><td>4</td><td>4</td><td><b>2</b></td><td>64 (Link WAN antar-router)</td></tr></tbody></table>\n<h3>Metode VLSM (Variable Length Subnet Mask) Anti-Overlap</h3>\n<p>Untuk mengalokasikan satu blok induk (misal <code>192.168.10.0/24</code>) ke beberapa divisi dengan ukuran berbeda: <b>(1) Urutkan kebutuhan host dari TERBESAR ke TERKECIL</b>, (2) Pilih prefix terkecil yang jumlah <i>host usable</i>-nya \(\\ge\) kebutuhan, (3) Tempatkan subnet secara berurutan pada batas kelipatan <i>block size</i>-nya. Contoh: Lantai 1 (100 host) → <code>192.168.10.0/25</code> (usable .1–.126, broadcast .127); Lantai 2 (50 host) → <code>192.168.10.128/26</code> (usable .129–.190, broadcast .191); Lantai 3 (25 host) → <code>192.168.10.192/27</code> (usable .193–.222, broadcast .223); Link Router WAN (2 host) → <code>192.168.10.224/30</code> (usable .225–.226, broadcast .227).</p>\n<div class=\"lesson-note\"><b>Pengantar IPv6:</b> Pada IPv6, prefix standar untuk sebuah subnet LAN adalah <code>/64</code>. Setiap interface otomatis memiliki alamat <i>Link-Local</i> <code>fe80::/10</code>, alamat <i>Global Unicast</i> <code>2000::/3</code> (untuk internet), atau <i>Unique Local Address (ULA)</i> <code>fc00::/7</code> (setara IP private). IPv6 menghapus broadcast dan menggantinya dengan <i>Multicast</i> (<code>ff00::/8</code>) serta <i>Neighbor Discovery Protocol (NDP)</i>.</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://datatracker.ietf.org/doc/html/rfc1918\" target=\"_blank\" rel=\"noopener\">IETF RFC 1918 — Address Allocation for Private Internets (10/8, 172.16/12, 192.168/16)</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc4632\" target=\"_blank\" rel=\"noopener\">IETF RFC 4632 — Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc8200\" target=\"_blank\" rel=\"noopener\">IETF RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification</a></li></ul>\n",

  "kabel": "\n<h2>5. Media Transmisi Kabel dan Instalasi Terstruktur (Elemen 2)</h2>\n<p>Pengkabelan terstruktur (<i>Structured Cabling System</i>) diatur oleh standar internasional <b>ANSI/TIA-568.2-D</b> dan <b>ISO/IEC 11801</b>. Sebuah saluran permanen (<i>channel link</i>) kabel tembaga Twisted Pair dibatasi maksimal <b>100 meter</b>, yang terdiri atas <b>90 meter Horizontal Permanent Link</b> (kabel solid di dalam dinding/tray dari Patch Panel ke Wall Outlet/Keystone) ditambah maksimal <b>10 meter Patch Cord</b> (kabel stranded fleksibel di sisi perangkat dan rack).</p>\n<h3>Konstruksi Twisted Pair (ISO/IEC 11801) &amp; Kategori</h3>\n<ul><li><b>U/UTP (Unshielded Twisted Pair):</b> 4 pasang kawat tembaga berpilin tanpa pelindung foil; mengandalkan variasi rapat pilinan (<i>twist rate</i>) untuk membatalkan medan magnet <i>crosstalk</i> (NEXT/FEXT).</li><li><b>F/UTP (Foiled Twisted Pair / FTP):</b> Memiliki selubung aluminium foil (<i>overall foil shield</i>) dan kawat <i>drain wire</i> di sekeliling 4 pasang kawat untuk menahan EMI sedang.</li><li><b>S/FTP (Screened Foiled Twisted Pair / STP):</b> Setiap pasang kawat dibungkus foil sendiri-sendiri ditambah anyaman kawat tembaga (<i>braided shield</i>) keseluruhan (standar Cat 7 dan Cat 8); wajib di-grounding pada patch panel.</li></ul>\n<h3>Standar Pinout T568A vs T568B &amp; Fungsi Sinyal (100BASE-TX vs 1000BASE-T &amp; PoE)</h3>\n<table><thead><tr><th>Pin RJ-45</th><th>Warna T568B</th><th>Warna T568A</th><th>Fast Ethernet (100BASE-TX)</th><th>Gigabit / 10G (1000BASE-T+)</th><th>IEEE 802.3af/at PoE</th></tr></thead><tbody>\n<tr><td><b>Pin 1</b></td><td>Putih-Oranye</td><td>Putih-Hijau</td><td>Transmit (TX+)</td><td>Bidirectional Pair A (BI_DA+)</td><td>PoE Mode A (+)</td></tr>\n<tr><td><b>Pin 2</b></td><td>Oranye</td><td>Hijau</td><td>Transmit (TX−)</td><td>Bidirectional Pair A (BI_DA−)</td><td>PoE Mode A (+)</td></tr>\n<tr><td><b>Pin 3</b></td><td>Putih-Hijau</td><td>Putih-Oranye</td><td>Receive (RX+)</td><td>Bidirectional Pair B (BI_DB+)</td><td>PoE Mode A (−)</td></tr>\n<tr><td><b>Pin 4</b></td><td>Biru</td><td>Biru</td><td>Tidak dipakai data</td><td>Bidirectional Pair C (BI_DC+)</td><td>PoE Mode B (+)</td></tr>\n<tr><td><b>Pin 5</b></td><td>Putih-Biru</td><td>Putih-Biru</td><td>Tidak dipakai data</td><td>Bidirectional Pair C (BI_DC−)</td><td>PoE Mode B (+)</td></tr>\n<tr><td><b>Pin 6</b></td><td>Hijau</td><td>Oranye</td><td>Receive (RX−)</td><td>Bidirectional Pair B (BI_DB−)</td><td>PoE Mode A (−)</td></tr>\n<tr><td><b>Pin 7</b></td><td>Putih-Cokelat</td><td>Putih-Cokelat</td><td>Tidak dipakai data</td><td>Bidirectional Pair D (BI_DD+)</td><td>PoE Mode B (−)</td></tr>\n<tr><td><b>Pin 8</b></td><td>Cokelat</td><td>Cokelat</td><td>Tidak dipakai data</td><td>Bidirectional Pair D (BI_DD−)</td><td>PoE Mode B (−)</td></tr></tbody></table>\n<div class=\"lesson-note\"><b>Koreksi Mitos Lapangan:</b> Pada jaringan modern <b>Gigabit Ethernet (1000BASE-T), 2.5G, 5G, dan 10GBASE-T</b>, <b>KEEMPAT pasang kawat (Pin 1–8) aktif mengirim dan menerima data secara bersamaan (full-duplex PAM-5)</b>! Jika satu saja kawat pada pin 4, 5, 7, atau 8 putus/gagal crimp, link Gigabit otomatis turun derajat (<i>downgrade</i>) menjadi 100 Mbps atau putus bila memakai PoE Mode B.</div>\n<h3>Parameter Sertifikasi Pengujian Kabel (Fluke Cable Qualifier / Certifier)</h3>\n<ul><li><b>Wiremap:</b> Memastikan kontinuitas pin 1–8 bebas dari <i>Open</i> (putus), <i>Short</i> (korslet), <i>Reversed Pair</i> (terbalik polaritas), <i>Crossed Pair</i>, dan <i>Split Pair</i> (salah pasangan pilinan yang memicu crosstalk parah meski LED LAN tester tampak menyala 1–8!).</li><li><b>Insertion Loss &amp; Length:</b> Redaman sinyal sepanjang kabel dan verifikasi panjang fisik ≤ 100 m via TDR (<i>Time Domain Reflectometry</i>).</li><li><b>NEXT &amp; FEXT (Near/Far-End Crosstalk):</b> Kebocoran sinyal elektromagnetik antar-pasangan kawat; untuk lulus sertifikasi Cat6/Cat6A, batas kupasan pilinan (<i>untwist</i>) di dekat pin RJ-45/Keystone <b>tidak boleh melebihi 13 mm (0,5 inci)</b>.</li></ul>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://tiaonline.org/what-we-do/standards/\" target=\"_blank\" rel=\"noopener\">ANSI/TIA-568.2-D — Balanced Twisted-Pair Telecommunications Cabling and Components Standard</a></li><li><a href=\"https://standards.ieee.org/ieee/802.3/10422/\" target=\"_blank\" rel=\"noopener\">IEEE 802.3ab (1000BASE-T) &amp; IEEE 802.3an (10GBASE-T) Ethernet Over Twisted Pair Specifications</a></li></ul>\n",

  "nirkabel": "\n<h2>6. Jaringan Nirkabel (WLAN IEEE 802.11) dan Perencanaan RF (Elemen 2)</h2>\n<p>Jaringan nirkabel (Wireless LAN) bekerja pada lapisan Physical (PHY) dan Data Link (MAC) menurut standar <b>IEEE 802.11</b> dengan mekanisme akses media <b>CSMA/CA (Carrier Sense Multiple Access with Collision Avoidance)</b>. Karena gelombang radio menggunakan ruang udara bersama (<i>half-duplex shared medium</i>), perencanaan frekuensi, lebar kanal, daya pancar (EIRP), dan site survey menentukan stabilitas jaringan.</p>\n<h3>Evolusi Standar IEEE 802.11 (Wi-Fi Alliance)</h3>\n<table><thead><tr><th>Generasi</th><th>Standar IEEE</th><th>Pita Frekuensi</th><th>Teknologi Modulasi &amp; MIMO</th><th>Kecepatan Teoretis Maks</th></tr></thead><tbody>\n<tr><td><b>Wi-Fi 4</b></td><td>802.11n (2009)</td><td>2,4 GHz &amp; 5 GHz</td><td>OFDM, 64-QAM, MIMO 4×4, kanal 20/40 MHz</td><td>600 Mbps</td></tr>\n<tr><td><b>Wi-Fi 5</b></td><td>802.11ac (2013)</td><td>5 GHz</td><td>OFDM, 256-QAM, Downlink MU-MIMO, kanal s.d. 80/160 MHz</td><td>3,5 – 6,9 Gbps</td></tr>\n<tr><td><b>Wi-Fi 6 / 6E</b></td><td>802.11ax (2019/2021)</td><td>2,4 / 5 / 6 GHz (6E)</td><td><b>OFDMA</b> (UL/DL), 1024-QAM, 8×8 MU-MIMO, BSS Coloring, TWT</td><td>9,6 Gbps</td></tr>\n<tr><td><b>Wi-Fi 7</b></td><td>802.11be (2024)</td><td>2,4 / 5 / 6 GHz</td><td>4096-QAM, kanal 320 MHz, <b>Multi-Link Operation (MLO)</b>, 16×16 MU-MIMO</td><td>46 Gbps</td></tr></tbody></table>\n<h3>Perencanaan Kanal, RSSI, SNR, dan Zona Fresnel Outdoor</h3>\n<ul><li><b>Kanal Non-Overlapping 2,4 GHz:</b> Lebar tiap kanal 22 MHz dengan jarak pusat 5 MHz, sehingga hanya <b>Kanal 1 (2412 MHz), Kanal 6 (2437 MHz), dan Kanal 11 (2462 MHz)</b> yang bebas tumpang-tindih. Menggunakan kanal 2, 3, 4, 8, atau 9 justru menimbulkan <i>Adjacent-Channel Interference (ACI)</i> yang jauh lebih merusak daripada <i>Co-Channel Interference (CCI)</i>!</li><li><b>Pita 5 GHz &amp;Lebar Kanal:</b> Memiliki &gt;20 kanal 20 MHz non-overlap (UNII-1 Kanal 36–48, UNII-2 DFS Kanal 52–144, UNII-3 Kanal 149–165). Untuk lingkungan sekolah/kantor padat AP, gunakan lebar kanal <b>20 MHz atau 40 MHz</b> agar kanal tidak cepat habis.</li><li><b>Target Site Survey (RSSI &amp; SNR):</b> Kekuatan sinyal terima (<b>RSSI</b>) diukur dalam skala negatif dBm: <b>−30 s.d. −65 dBm = Sangat Baik</b> (standar wajib untuk VoIP, video conference, dan CBT ujian); −67 s.d. −70 dBm = Cukup untuk browsing; di bawah −75 dBm = Buruk/rawan putus. <b>SNR (Signal-to-Noise Ratio)</b> = \(\\text{RSSI} - \\text{Noise Floor}\); wajib <b>≥ 25 dB</b> (contoh: RSSI −65 dBm dengan noise floor −92 dBm menghasilkan SNR = 27 dB).</li><li><b>Link Outdoor PtP/PtMP &amp; Zona Fresnel:</b> Untuk menembak sinyal antar-gedung/desa menggunakan radio directional (MIMO Dish/Sectoral), selain <i>Line of Sight (LOS)</i> visual, minimal <b>60% radius Zona Fresnel pertama</b> harus bebas dari halangan pucuk pohon/atap gedung: \(r_1 = 17,32 \\times \\sqrt{d_{\\text{km}} / (4 \\times f_{\\text{GHz}})}\).</li></ul>\n<h3>Standar Keamanan WLAN Modern</h3>\n<p>Hindari WEP (RC4) dan WPA-TKIP karena dapat ditembus dalam hitungan menit. Gunakan minimal <b>WPA2-AES (CCMP-128)</b> atau <b>WPA3-Personal (SAE — Simultaneous Authentication of Equals)</b> yang tahan terhadap serangan <i>offline dictionary crack</i> dan <i>KRACK</i>, ditambah <b>Protected Management Frames (IEEE 802.11w / PMF)</b> untuk mencegah serangan <i>Wi-Fi Deauthentication</i>. Untuk jaringan institusi/kampus, gunakan <b>WPA2/WPA3-Enterprise (IEEE 802.1X / EAP-TLS / PEAP)</b> dengan server RADIUS (FreeRADIUS).</p>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://standards.ieee.org/ieee/802.11/7028/\" target=\"_blank\" rel=\"noopener\">IEEE 802.11ax / 802.11be — Wireless LAN Medium Access Control (MAC) and Physical Layer (PHY) Specifications</a></li><li><a href=\"https://www.wi-fi.org/discover-wi-fi/security\" target=\"_blank\" rel=\"noopener\">Wi-Fi Alliance — WPA3 Security &amp; Wi-Fi CERTIFIED 6/7 Technical Overview</a></li></ul>\n",

  "fiber": "\n<h2>7. Teknologi Fiber Optic Standar Industri (FOA, ITU-T &amp; TIA-568) (Elemen 2)</h2>\n<p>Sistem komunikasi serat optik memandu pulsa cahaya melalui inti kaca silika (<i>core</i>) yang dikelilingi <i>cladding</i> berindeks bias lebih rendah berdasarkan prinsip hukum Snellius — <b>Total Internal Reflection (TIR)</b>. Lapisan <i>coating</i> akrilat 250 µm, penguat tarik (Aramid Kevlar/FRP), dan jaket luar LSZH/HDPE menjaga serat bebas kelembapan dan tegangan mekanis.</p>\n<h3>Klasifikasi Serat Standar ITU-T &amp; TIA-568.3-D</h3>\n<table><thead><tr><th>Standar Serat</th><th>Core/Cladding</th><th>Atenuasi Maks</th><th>Radius Aman</th><th>Aplikasi Industri</th></tr></thead><tbody>\n<tr><td><b>ITU-T G.652.D (OS2)</b></td><td>9 / 125 µm</td><td>≤0,40 @1310 · ≤0,30 @1550 nm (tipikal 0,35/0,22)</td><td>30 mm</td><td>Feeder &amp; backbone jarak jauh (Low Water Peak)</td></tr>\n<tr><td><b>ITU-T G.657.A1 / A2</b></td><td>9 / 125 µm</td><td>Kompatibel penuh G.652.D</td><td>10 mm / 7,5 mm</td><td>Kabel Drop Core FTTH ke rumah pelanggan</td></tr>\n<tr><td><b>ITU-T G.657.B3</b></td><td>9 / 125 µm</td><td>Ultra Bend-Insensitive</td><td>5 mm</td><td>Kabel indoor IKR belokan kusen tajam</td></tr>\n<tr><td><b>OM3 / OM4 / OM5 (MMF)</b></td><td>50 / 125 µm</td><td>≤3,0 @850 · ≤1,5 @1300 nm (TIA-568.3-D)</td><td>30 mm</td><td>Switch 10G–400G data center hingga 550 m (VCSEL)</td></tr>\n</tbody></table>\n<h3>Kode Warna 12 Serat (ANSI/TIA-598-C)</h3>\n<p>Urutan 12 warna wajib: <b>1. Biru (BL)</b>, <b>2. Orange (OR)</b>, <b>3. Hijau (GN)</b>, <b>4. Cokelat (BN)</b>, <b>5. Abu-abu (SL)</b>, <b>6. Putih (WH)</b>, <b>7. Merah (RD)</b>, <b>8. Hitam (BK)</b>, <b>9. Kuning (YE)</b>, <b>10. Ungu (VI)</b>, <b>11. Pink (RS)</b>, <b>12. Toska (AQ)</b>. Pada kabel 24+ core, pola warna ini diulang dengan warna <i>loose tube</i> mengikuti urutan yang sama.</p>\n<h3>Polishing Konektor (UPC vs APC) &amp; Standar IEC 61300-3-35</h3>\n<ul><li><b>UPC (Bodi Biru, 0° kubah):</b> Return Loss ≥ 50 dB — digunakan pada switch Ethernet dan patch ODF umum.</li><li><b>APC (Bodi Hijau, sudut miring 8°):</b> Pantulan cahaya dibuang ke cladding sehingga Return Loss ≥ 60 dB — wajib untuk port OLT/ODP GPON/XGS-PON &amp; RF Video. <b>DILARANG keras menyambungkan Biru (UPC) ke Hijau (APC)!</b></li><li><b>IEC 61300-3-35:</b> Mewajibkan inspeksi visual mikroskop sebelum kawin konektor (Zone A inti 0–25 µm wajib nol debu/goresan) dengan alur <i>Inspect → Clean (IPA 99,9% + One-Click / Lint-free wipe) → Inspect → Mate</i>.</li></ul>\n<h3>Arsitektur FTTH ODN &amp; Link Power Budget GPON (ITU-T G.984)</h3>\n<p>Alur pasif ODN: <b>OLT (STO) → ODF → Feeder G.652.D → ODC (Splitter 1:4 ≈ 7,2 dB) → Distribusi → ODP (Splitter 1:8 ≈ 10,5 dB) → Drop Cable G.657 → Roset → ONT</b>. Standar ITU-T G.984 mendefinisikan batas atenuasi maksimum <b>Class B+ = 28 dB</b> (minimum 13 dB) dan <b>Class C+ = 32 dB</b> (minimum 17 dB). Daya terima (Rx) optimal ONT dijaga pada <b>−8 dBm s/d −24 dBm</b>; di atas −8 dBm memicu saturasi (butuh attenuator).</p>\n<h3>Pengujian Tier-1 (OLTS/OPM) vs Tier-2 (OTDR) — Aturan FOA &amp; TIA-568</h3>\n<p><b>Tier-1 (OLTS / OLS + OPM):</b> Wajib hukumnya untuk sertifikasi total Insertion Loss link end-to-end dengan kalibrasi titik nol (<i>Zeroing</i>). Batas rencana TIA-568.3-D: konektor ≤ 0,75 dB (praktik ≤ 0,25 dB), splice ≤ 0,30 dB (standar Telkom ≤ 0,10 dB; tipikal fusion ≤ 0,05 dB). <b>Tier-2 (OTDR):</b> Menguji jarak event, loss sambungan, macrobend (uji beda atenuasi 1310 vs 1550 nm), dan titik putus dari satu ujung menggunakan <b>Launch Cable (500–1000 m)</b> untuk melewati Dead Zone (EDZ/ADZ). <i>Catatan penting: OTDR tidak boleh menggantikan pengukuran OPM/OLTS.</i></p>\n<div class=\"lesson-note\"><b>Keselamatan Laser (IEC 60825-2 / ANSI Z136.2) &amp; K3LH:</b> Panjang gelombang 1310/1490/1550 nm bersifat tak kasat mata. Port transceiver standar tergolong <b>Hazard Level 1M</b> (berbahaya bila dilihat lewat mikroskop optik tanpa filter IR) sedangkan jalur penguat EDFA/DWDM mencapai <b>Class 3B</b>. Wajib kenakan kacamata safety ANSI Z87.1 dan buang serpihan serat kaca 125 µm ke wadah tertutup berlabel (tidak terdeteksi X-Ray medis).</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://www.thefoa.org/tech/ref/\" target=\"_blank\" rel=\"noopener\">The Fiber Optic Association (FOA) — Online Reference Guide (Safety, Installation, Testing &amp; OTDR)</a></li><li><a href=\"https://www.itu.int/rec/T-REC-G.652\" target=\"_blank\" rel=\"noopener\">ITU-T G.652 — Characteristics of a single-mode optical fibre cable</a></li><li><a href=\"https://www.itu.int/rec/T-REC-G.657\" target=\"_blank\" rel=\"noopener\">ITU-T G.657 — Bend-loss insensitive single-mode optical fibre</a></li><li><a href=\"https://www.itu.int/rec/T-REC-G.984.2\" target=\"_blank\" rel=\"noopener\">ITU-T G.984.2 — Gigabit-capable Passive Optical Networks (GPON) Class B+/C+ Power Budget</a></li></ul>\n",

  "keamanan": "\n<h2>8. Dasar Keamanan Jaringan &amp; Pertahanan Berlapis (Elemen 3)</h2>\n<p>Keamanan jaringan modern berpedoman pada kerangka kerja <b>ISO/IEC 27001</b>, <b>NIST Cybersecurity Framework (CSF 2.0: Govern, Identify, Protect, Detect, Respond, Recover)</b>, dan prinsip <b>Zero Trust Architecture (NIST SP 800-207: &quot;Never Trust, Always Verify&quot;)</b>. Seluruh kontrol keamanan bertujuan menegakkan tiga pilar <b>CIA Triad</b> (<i>Confidentiality, Integrity, Availability</i>) ditambah <i>Non-Repudiation</i> (anti-penyangkalan melalui tanda tangan digital dan audit log).</p>\n<h3>Taksonomi Serangan Jaringan &amp; Mitigasi Teknis Layer 2–7</h3>\n<table><thead><tr><th>Lapisan / Jenis Serangan</th><th>Mekanisme Eksploitasi</th><th>Kontrol Mitigasi Standar Industri</th></tr></thead><tbody>\n<tr><td><b>L2: ARP Spoofing / Poisoning (MITM)</b></td><td>Penyerang mengirim paket ARP Reply palsu untuk membelokkan trafik LAN ke MAC address-nya</td><td>Aktifkan <b>DHCP Snooping</b> + <b>Dynamic ARP Inspection (DAI)</b> dan <b>Port Security</b> pada Managed Switch.</td></tr>\n<tr><td><b>L2: DHCP Starvation &amp; Rogue DHCP</b></td><td>Membanjiri DHCP Request dengan MAC acak hingga pool habis, lalu menyodorkan gateway palsu</td><td>Aktifkan <b>DHCP Snooping</b> (tentukan port <i>Trusted</i> hanya ke arah uplink DHCP server resmi, port klien <i>Untrusted</i>).</td></tr>\n<tr><td><b>L2: VLAN Hopping (Switch Spoofing / Double Tag)</b></td><td>Mengirim frame DTP untuk membuka trunk atau menyisipkan double-tag 802.1Q pada Native VLAN 1</td><td>Matikan DTP (<code>switchport nonegotiate</code>), set eksplisit <code>switchport mode access</code>, dan pindahkan <b>Native VLAN</b> ke ID khusus tak terpakai (mis. VLAN 999).</td></tr>\n<tr><td><b>L3/L4: DDoS (SYN Flood, UDP Amplification)</b></td><td>Membanjiri tabel state TCP half-open atau bandwidth link WAN dari ribuan botnet</td><td>Aktifkan <b>TCP SYN Cookies</b>, Rate Limiting, BGP Blackhole / Flowspec, uRPF (Unicast Reverse Path Forwarding), dan Cloud Scrubbing (Cloudflare/Akamai).</td></tr>\n<tr><td><b>L7: SQL Injection, XSS, CSRF (OWASP Top 10)</b></td><td>Menyisipkan query SQL/script berbahaya lewat input aplikasi web yang tidak divalidasi</td><td>Gunakan <b>Prepared Statements (Parameterized Queries)</b>, Content Security Policy (CSP), CSRF Token, dan pasang <b>WAF (Web Application Firewall)</b>.</td></tr>\n<tr><td><b>Social Engineering &amp; Ransomware</b></td><td>Phishing kredensial atau pembajakan sesi RDP/SMB untuk mengenkripsi server</td><td>Wajibkan <b>MFA (Multi-Factor Authentication)</b>, email filter <b>SPF + DKIM + DMARC</b>, EDR, dan <b>Backup 3-2-1</b> (3 salinan, 2 media berbeda, 1 offsite/immutable).</td></tr></tbody></table>\n<h3>Perbedaan Penempatan IDS vs IPS pada Arsitektur Jaringan</h3>\n<ul><li><b>IDS (Intrusion Detection System — Mode Pasif / Out-of-Band):</b> Terhubung ke port <b>SPAN (Port Mirroring)</b> atau <b>Network TAP</b>. Menerima salinan trafik untuk dianalisis (Snort / Suricata / Zeek) dan mengirimkan <i>Alert</i> ke SIEM (Wazuh / Splunk / Elastic) tanpa memperlambat atau memutus aliran paket utama.</li><li><b>IPS (Intrusion Prevention System — Mode Inline):</b> Dipasang langsung di jalur paket (<i>inline</i> di belakang/menyatu dengan NGFW). Mampu langsung melakukan <b>Drop / Reject</b> paket serangan berbahaya secara real-time sebelum mencapai server target.</li></ul>\n<h3>Siklus Respons Insiden (NIST SP 800-61)</h3>\n<p>Empat tahap penanganan insiden siber: <b>1. Preparation</b> (siapkan SOP, kontak, backup, logging NTP tersinkronisasi), <b>2. Detection &amp; Analysis</b> (identifikasi indikator kompromi/IoC di SIEM dan log tanpa mematikan paksa RAM jika butuh forensik), <b>3. Containment, Eradication &amp; Recovery</b> (isolasi VLAN/kabel host terinfeksi, hapus malware/backdoor, patch celah, restore dari backup bersih), <b>4. Post-Incident Activity</b> (evaluasi <i>lessons learned</i>).</p>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://csrc.nist.gov/pubs/sp/800/61/r2/final\" target=\"_blank\" rel=\"noopener\">NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Guide</a></li><li><a href=\"https://csrc.nist.gov/pubs/sp/800/94/final\" target=\"_blank\" rel=\"noopener\">NIST SP 800-94 — Guide to Intrusion Detection and Prevention Systems (IDPS)</a></li><li><a href=\"https://owasp.org/www-project-top-ten/\" target=\"_blank\" rel=\"noopener\">OWASP Top 10 — Standard Awareness Document for Web Application Security Risks</a></li></ul>\n",

  "firewall": "\n<h2>9. Firewall, ACL, DMZ, dan Kebijakan Akses Jaringan (Elemen 3)</h2>\n<p>Firewall adalah perangkat atau sistem perangkat lunak yang menegakkan kebijakan kontrol akses jaringan (<i>Network Access Control Policy</i>) di antara zona dengan tingkat kepercayaan berbeda: <b>Inside (LAN Terpercaya)</b>, <b>Outside (WAN/Internet Tidak Terpercaya)</b>, dan <b>DMZ (Demilitarized Zone / Semi-Terpercaya untuk Server Publik)</b>. Evaluasi aturan selalu dilakukan secara <b>Top-Down (baris demi baris dari atas ke bawah)</b> dengan prinsip <b>First-Match Wins</b> dan ditutup oleh <b>Implicit Deny All</b>.</p>\n<h3>Perbandingan Konfigurasi Firewall Lintas Platform (Cisco IOS, MikroTik RouterOS, &amp; Linux UFW)</h3>\n<h4>1. Cisco IOS Extended Named ACL</h4>\n<pre><code>! Blokir akses VLAN Siswa (192.168.20.0/24) ke Server TU (192.168.10.10), izinkan ke DNS &amp; HTTP/HTTPS\nip access-list extended POLICY_VLAN_SISWA\n permit udp 192.168.20.0 0.0.0.255 any eq 53\n permit tcp 192.168.20.0 0.0.0.255 any eq 80\n permit tcp 192.168.20.0 0.0.0.255 any eq 443\n deny   ip  192.168.20.0 0.0.0.255 192.168.10.0 0.0.0.255 log\n permit ip  192.168.20.0 0.0.0.255 any\n!\ninterface GigabitEthernet0/0.20\n ip access-group POLICY_VLAN_SISWA in</code></pre>\n<h4>2. MikroTik RouterOS Stateful Firewall Filter (Chain Input &amp; Forward)</h4>\n<p>Pada MikroTik RouterOS (berbasis Linux Netfilter), terdapat 3 chain utama: <b><code>input</code></b> (trafik yang ditujukan ke router itu sendiri), <b><code>forward</code></b> (trafik yang melintasi router, misal LAN ke Internet atau antar-VLAN), dan <b><code>output</code></b> (trafik yang berasal dari router):</p>\n<pre><code>/ip firewall filter\n# 1. Izinkan sesi yang sudah terbentuk (Stateful Inspection - FastTrack/Established/Related)\nadd chain=input connection-state=established,related action=accept comment=\"Allow Established Input\"\nadd chain=input connection-state=invalid action=drop\n# 2. Izinkan akses WinBox/SSH hanya dari subnet Admin (192.168.99.0/24)\nadd chain=input src-address=192.168.99.0/24 protocol=tcp dst-port=22,8291 action=accept\nadd chain=input in-interface=ether1-WAN action=drop comment=\"Drop all unsolicited WAN to Router\"\n\n# 3. Chain Forward: Isolasi VLAN Siswa dari VLAN Guru/TU\nadd chain=forward connection-state=established,related action=accept\nadd chain=forward src-address=192.168.20.0/24 dst-address=192.168.10.0/24 action=drop comment=\"Isolasi Siswa ke Guru\"</code></pre>\n<h4>3. Linux Server Host Firewall (UFW / nftables)</h4>\n<pre><code>sudo ufw default deny incoming\nsudo ufw default allow outgoing\nsudo ufw allow from 192.168.99.0/24 to any port 22 proto tcp comment 'SSH Admin Only'\nsudo ufw allow 80/tcp\nsudo ufw allow 443/tcp\nsudo ufw enable\nsudo ufw status numbered</code></pre>\n<div class=\"lesson-note\"><b>Aturan Emas Penempatan ACL Cisco:</b> Tempatkan <b>Extended ACL sedekat mungkin dengan SUMBER (inbound)</b> agar paket yang ditolak langsung dibuang sebelum memakan bandwidth backbone; tempatkan <b>Standard ACL sedekat mungkin dengan TUJUAN</b> karena Standard ACL hanya memeriksa IP sumber (bila dipasang dekat sumber akan memblokir trafik ke seluruh tujuan lain).</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://csrc.nist.gov/pubs/sp/800/41/r1/final\" target=\"_blank\" rel=\"noopener\">NIST SP 800-41 Rev. 1 — Guidelines on Firewalls and Firewall Policy</a></li><li><a href=\"https://help.mikrotik.com/docs/spaces/ROS/pages/48660574/Filter\" target=\"_blank\" rel=\"noopener\">MikroTik RouterOS Official Documentation — Packet Flow &amp; Firewall Filter Chains</a></li></ul>\n",

  "kriptografi": "\n<h2>10. Kriptografi Modern, PKI, dan Protokol Komunikasi Aman (Elemen 3)</h2>\n<p>Kriptografi modern melindungi data saat dikirim di jaringan (<i>Data in Transit</i>) maupun saat disimpan di media penyimpanan (<i>Data at Rest</i>). Berdasarkan prinsip <b>Kerckhoffs's Principle</b> (dan <i>Shannon's Maxim</i>), keamanan sebuah sistem kriptografi tidak boleh bergantung pada kerahasiaan algoritmanya, melainkan <b>100% bergantung pada kerahasiaan dan panjang kuncinya (Key Management)</b>.</p>\n<h3>Tiga Pilar Algoritma Kriptografi &amp; Standar NIST FIPS</h3>\n<table><thead><tr><th>Kategori</th><th>Cara Kerja Kunci</th><th>Algoritma Standar Modern</th><th>Algoritma Usang (Dilarang)</th><th>Fungsi Utama</th></tr></thead><tbody>\n<tr><td><b>1. Enkripsi Simetris</b></td><td>1 kunci rahasia yang sama (<i>Shared Secret Key</i>) untuk Enkripsi &amp; Dekripsi</td><td><b>AES-128 / AES-256</b> (GCM/CBC, FIPS 197), <b>ChaCha20-Poly1305</b> (RFC 8439)</td><td>DES (56-bit), 3DES, RC4 (WEP)</td><td>Enkripsi payload data berkecepatan tinggi (TLS session, IPsec VPN, Wi-Fi WPA2/WPA3, Disk BitLocker/LUKS).</td></tr>\n<tr><td><b>2. Kriptografi Asimetris (Kunci Publik)</b></td><td>Sepasang kunci matematis: <b>Public Key</b> (disebarkan) &amp; <b>Private Key</b> (dirahasiakan)</td><td><b>RSA-2048 / RSA-4096</b>, <b>ECC / ECDHE / ECDSA</b> (Curve25519 / P-256), <b>Ed25519</b></td><td>RSA-512 / RSA-1024, DSA-1024</td><td>Pertukaran kunci aman (Key Exchange), autentikasi sertifikat X.509, dan Tanda Tangan Digital.</td></tr>\n<tr><td><b>3. Fungsi Hash Kriptografis</b></td><td>Satu arah (<i>One-Way</i>, tanpa kunci, tak dapat didekripsi balik) → menghasilkan <i>digest</i> ukuran tetap</td><td><b>SHA-256 / SHA-384 / SHA-512</b> (FIPS 180-4), <b>SHA-3</b> (FIPS 202), <b>Argon2id / bcrypt</b> (password)</td><td>MD5 (128-bit), SHA-1 (160-bit) — rentan <i>collision</i></td><td>Verifikasi integritas file/ISO, HMAC paket, dan penyimpanan hash password + <i>Salt</i> di database.</td></tr></tbody></table>\n<h3>Bagaimana Tanda Tangan Digital (Digital Signature) &amp; TLS 1.3 Bekerja?</h3>\n<ul><li><b>Alur Tanda Tangan Digital (Menjamin Integritas, Autentisitas &amp; Non-Repudiation):</b> (1) Pengirim menghitung hash pesan dengan <b>SHA-256</b>, (2) Pengirim menandatangani (mengenkripsi) nilai hash tersebut menggunakan <b>PRIVATE KEY PENGIRIM sendiri</b>, (3) Penerima mendekripsi tanda tangan menggunakan <b>PUBLIC KEY PENGIRIM</b> dan membandingkannya dengan hash SHA-256 pesan yang diterima. Jika identik, terbukti pesan asli dari pengirim dan tidak berubah satu bit pun!</li><li><b>Alur Hybrid Encryption pada HTTPS / TLS 1.3 (IETF RFC 8446):</b> Browser dan Web Server menggunakan kriptografi asimetris (<b>ECDHE</b> untuk <i>Perfect Forward Secrecy</i> + sertifikat <b>X.509 CA</b> untuk verifikasi identitas server) saat jabat tangan awal guna menyepakati kunci sesi sementara, lalu beralih ke enkripsi simetris <b>AES-256-GCM</b> atau <b>ChaCha20-Poly1305</b> agar transfer data halaman web berlangsung sangat cepat.</li></ul>\n<div class=\"lesson-note\"><b>Perbedaan Penting:</b> <b>Encoding</b> (ASCII, Base64, URL encoding) hanya mengubah format tampilan data tanpa kunci dan bisa langsung dibaca siapa saja; <b>Hashing</b> (SHA-256) bersifat satu arah untuk cek keutuhan data; <b>Enkripsi</b> (AES/RSA) bersifat dua arah menggunakan kunci rahasia untuk menjaga kerahasiaan.</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://csrc.nist.gov/pubs/fips/197/final\" target=\"_blank\" rel=\"noopener\">NIST FIPS 197 — Advanced Encryption Standard (AES) Specification</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc8446\" target=\"_blank\" rel=\"noopener\">IETF RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc5280\" target=\"_blank\" rel=\"noopener\">IETF RFC 5280 — Internet X.509 Public Key Infrastructure Certificate and CRL Profile</a></li></ul>\n",

  "vlan": "\n<h2>11. VLAN (IEEE 802.1Q), Trunking, dan Inter-VLAN Routing (Elemen 4)</h2>\n<p><b>VLAN (Virtual Local Area Network)</b> mempartisi satu switch fisik Layer 2 menjadi beberapa <b>Broadcast Domain logis</b> yang terisolasi penuh. Berdasarkan standar <b>IEEE 802.1Q</b>, switch menyisipkan <b>Tag berukuran 4-byte (32-bit)</b> ke dalam header frame Ethernet ketika frame melewati <i>Trunk Port</i>. Tag 802.1Q terdiri atas: <b>TPID</b> (16-bit, bernilai tetap <code>0x8100</code>), <b>PCP</b> (3-bit Class of Service/QoS 802.1p), <b>DEI</b> (1-bit Drop Eligible), dan <b>VID (VLAN ID 12-bit)</b> yang menyediakan rentang VLAN <b>1 s.d. 4094</b> (0 dan 4095 dicadangkan; VLAN 1–1005 adalah <i>Normal Range</i>, 1006–4094 adalah <i>Extended Range</i>).</p>\n<h3>Perbandingan Konfigurasi VLAN &amp; Inter-VLAN Routing (Cisco IOS vs MikroTik RouterOS)</h3>\n<h4>1. Cisco IOS: Switch L2 (Access &amp; Trunk) + Router-on-a-Stick (802.1Q Sub-interface)</h4>\n<pre><code>! === PADA MANAGED SWITCH CISCO ===\nvlan 10\n name GURU\nvlan 20\n name SISWA\nvlan 99\n name MANAGEMENT_NATIVE\n!\ninterface range FastEthernet0/1 - 10\n switchport mode access\n switchport access vlan 10\n spanning-tree portfast\n!\ninterface GigabitEthernet0/1\n description TRUNK_KE_ROUTER\n switchport mode trunk\n switchport nonegotiate\n switchport trunk native vlan 99\n switchport trunk allowed vlan 10,20,99\n\n! === PADA ROUTER CISCO (ROUTER-ON-A-STICK) ===\ninterface GigabitEthernet0/0\n no ip address\n no shutdown\n!\ninterface GigabitEthernet0/0.10\n encapsulation dot1Q 10\n ip address 192.168.10.1 255.255.255.0\n!\ninterface GigabitEthernet0/0.20\n encapsulation dot1Q 20\n ip address 192.168.20.1 255.255.255.0</code></pre>\n<h4>2. MikroTik RouterOS v7: Bridge VLAN Filtering</h4>\n<pre><code>/interface bridge\nadd name=br-lan vlan-filtering=no\n/interface bridge port\nadd bridge=br-lan interface=ether2 pvid=10 comment=\"Access Port VLAN 10 Guru\"\nadd bridge=br-lan interface=ether3 pvid=20 comment=\"Access Port VLAN 20 Siswa\"\nadd bridge=br-lan interface=ether1 comment=\"Trunk Port ke Switch\"\n/interface bridge vlan\nadd bridge=br-lan tagged=br-lan,ether1 untagged=ether2 vlan-ids=10\nadd bridge=br-lan tagged=br-lan,ether1 untagged=ether3 vlan-ids=20\n/interface vlan\nadd interface=br-lan name=vlan10-guru vlan-id=10\nadd interface=br-lan name=vlan20-siswa vlan-id=20\n/ip address\nadd address=192.168.10.1/24 interface=vlan10-guru\nadd address=192.168.20.1/24 interface=vlan20-siswa\n# Aktifkan VLAN Filtering di akhir agar tidak terkunci\n/interface bridge set br-lan vlan-filtering=yes</code></pre>\n<div class=\"lesson-note\"><b>Router-on-a-Stick (RoaS) vs Layer 3 Switch (SVI):</b> Pada RoaS, trafik antar-VLAN harus bolak-balik melewati satu kabel trunk menuju router eksternal sehingga berpotensi menjadi bottleneck. Pada jaringan kampus/enterprise, inter-VLAN routing dilakukan langsung di ASIC hardware <b>Layer 3 Switch</b> menggunakan <b>SVI (<code>interface Vlan10</code> + perintah <code>ip routing</code>)</b> dengan kecepatan <i>wire-speed</i> jutaan paket per detik.</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://standards.ieee.org/ieee/802.1Q/6844/\" target=\"_blank\" rel=\"noopener\">IEEE Std 802.1Q — Bridges and Bridged Networks (VLAN Tagging Standard)</a></li><li><a href=\"https://help.mikrotik.com/docs/spaces/ROS/pages/28606465/Bridge+VLAN+Table\" target=\"_blank\" rel=\"noopener\">MikroTik RouterOS Documentation — Bridge VLAN Table &amp; Hardware Offloading</a></li></ul>\n",

  "routing": "\n<h2>12. Routing Statis dan Dinamis (RIPv2, OSPFv2/v3, BGP-4) (Elemen 4)</h2>\n<p>Routing adalah proses pengambilan keputusan di Layer 3 untuk meneruskan paket IP dari jaringan sumber menuju jaringan tujuan melintasi satu atau lebih router (<i>hop</i>). Ketika sebuah router menerima paket IP, mesin forwarding (FIB / Cisco Express Forwarding) memilih rute berdasarkan <b>3 aturan hierarkis yang tidak boleh tertukar</b>:</p>\n<ol><li><b>Longest Prefix Match (Paling Spesifik Menang Mutlak):</b> Rute dengan prefix terpanjang (misal <code>192.168.10.0/26</code>) SELALU menang melawan rute yang kurang spesifik (<code>192.168.10.0/24</code> atau default route <code>0.0.0.0/0</code>), terlepas dari protokol atau nilai Administrative Distance-nya!</li><li><b>Administrative Distance (AD Terkecil):</b> Jika seorang router mempelajari <b>prefix yang persis sama</b> (misal sama-sama <code>192.168.10.0/24</code>) dari dua sumber protokol berbeda, router hanya memasukkan sumber dengan AD terkecil ke tabel routing (Connected = 0, Static = 1, eBGP = 20, EIGRP = 90, OSPF = 110, IS-IS = 115, RIP = 120).</li><li><b>Metric Terkecil (di dalam satu protokol yang sama):</b> Jika prefix dan sumber protokolnya sama (misal dua jalur OSPF menuju <code>192.168.10.0/24</code>), router memilih jalur dengan <i>Metric</i> terkecil (Cost OSPF = \(\\text{Reference Bandwidth} / \\text{Interface Bandwidth}\), default \(10^8 / \\text{BW bps}\)). Jika metric kedua jalur sama persis, router melakukan <b>ECMP (Equal-Cost Multi-Path Load Balancing)</b>.</li></ol>\n<h3>Perbandingan Konfigurasi Routing Statis &amp; OSPF (Cisco IOS vs MikroTik RouterOS)</h3>\n<table><thead><tr><th>Skenario</th><th>Perintah Cisco IOS</th><th>Perintah MikroTik RouterOS v7</th></tr></thead><tbody>\n<tr><td><b>Static Route ke LAN Seberang</b></td><td><code>ip route 192.168.2.0 255.255.255.0 10.0.0.2</code></td><td><code>/ip route add dst-address=192.168.2.0/24 gateway=10.0.0.2</code></td></tr>\n<tr><td><b>Default Route (ke ISP)</b></td><td><code>ip route 0.0.0.0 0.0.0.0 203.0.113.1</code></td><td><code>/ip route add dst-address=0.0.0.0/0 gateway=203.0.113.1</code></td></tr>\n<tr><td><b>Floating Static (Backup Failover)</b></td><td><code>ip route 0.0.0.0 0.0.0.0 198.51.100.1 200</code></td><td><code>/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1 distance=200</code></td></tr>\n<tr><td><b>OSPFv2 Single-Area (Area 0)</b></td><td><code>router ospf 1</code><br><code> router-id 1.1.1.1</code><br><code> network 192.168.1.0 0.0.0.255 area 0</code><br><code> network 10.0.0.0 0.0.0.3 area 0</code></td><td><code>/routing ospf instance add name=ospf1 router-id=1.1.1.1</code><br><code>/routing ospf area add name=backbone area-id=0.0.0.0 instance=ospf1</code><br><code>/routing ospf interface-template add area=backbone networks=192.168.1.0/24,10.0.0.0/30</code></td></tr></tbody></table>\n<h3>Syarat Terbentuknya Neighbor Adjacency OSPF (FULL State)</h3>\n<p>Dua router OSPF tidak akan bertukar LSA (Link-State Advertisement) hingga menjadi tetangga (<i>Full Adjacency</i>). Jika status macet atau tidak muncul di <code>show ip ospf neighbor</code>, periksa 6 syarat wajib yang harus cocok di kedua ujung: (1) <b>Area ID</b> sama, (2) <b>Hello &amp; Dead Interval</b> sama (default broadcast 10s / 40s), (3) <b>Subnet &amp; Subnet Mask</b> sama, (4) <b>Autentikasi/Password</b> cocok, (5) <b>Area Stub Flag</b> sama, (6) <b>MTU Interface</b> sama dan <b>Router-ID</b> harus unik (tidak boleh kembar).</p>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://datatracker.ietf.org/doc/html/rfc2328\" target=\"_blank\" rel=\"noopener\">IETF RFC 2328 — OSPF Version 2 Standard Specification</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc4271\" target=\"_blank\" rel=\"noopener\">IETF RFC 4271 — A Border Gateway Protocol 4 (BGP-4)</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc1812\" target=\"_blank\" rel=\"noopener\">IETF RFC 1812 — Requirements for IP Version 4 Routers</a></li></ul>\n",

  "nat": "\n<h2>13. NAT, PAT (Masquerade), Port Forwarding, dan Internet Gateway (Elemen 4)</h2>\n<p><b>NAT (Network Address Translation — IETF RFC 3022)</b> memungkinkan ratusan perangkat di jaringan lokal yang menggunakan alamat <b>IP Private (RFC 1918)</b> mengakses internet publik melalui satu atau beberapa alamat <b>IP Public</b> pada router gateway. Selain menghemat alamat IPv4 global, NAT menyembunyikan topologi internal LAN dari jaringan luar (<i>topology hiding</i>), meskipun fungsi pemfilteran keamanan tetap harus ditegakkan oleh Stateful Firewall.</p>\n<h3>Empat Terminologi Alamat NAT (Standar Cisco CCNA)</h3>\n<ul><li><b>Inside Local:</b> Alamat IP private asli milik host di dalam LAN sebelum diterjemahkan (misal <code>192.168.1.10</code>).</li><li><b>Inside Global:</b> Alamat IP public sah milik router gateway yang mewakili host internal di mata internet (misal <code>203.0.113.5</code>).</li><li><b>Outside Global:</b> Alamat IP public asli milik server tujuan di internet (misal <code>8.8.8.8</code>).</li><li><b>Outside Local:</b> Alamat IP host luar sebagaimana terlihat dari jaringan dalam (umumnya sama dengan Outside Global).</li></ul>\n<h3>Konfigurasi SRCNAT (Masquerade) &amp; DSTNAT (Port Forwarding) di MikroTik &amp; Cisco</h3>\n<h4>1. MikroTik RouterOS (SRCNAT Masquerade vs Src-Nat + DSTNAT Port Forwarding)</h4>\n<pre><code>/ip firewall nat\n# A. Outbound Internet Sharing (PAT / Masquerade untuk IP WAN Dinamis DHCP/PPPoE)\nadd chain=srcnat out-interface=ether1-WAN action=masquerade comment=\"PAT LAN ke Internet\"\n\n# (Tips Industri: Jika IP Public WAN bersifat STATIS, gunakan action=src-nat to-addresses=203.0.113.5\n#  karena lebih hemat CPU router dibanding masquerade saat link flap!)\n\n# B. Inbound Port Forwarding (DSTNAT): Buka akses Web Server lokal 192.168.1.100:80 dari Internet port 8080\nadd chain=dstnat in-interface=ether1-WAN protocol=tcp dst-port=8080 \\\n    action=dst-nat to-addresses=192.168.1.100 to-ports=80 comment=\"Port Forward Web Server\"</code></pre>\n<h4>2. Cisco IOS (PAT Overload &amp; Static Port Forwarding)</h4>\n<pre><code>interface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0\n ip nat inside\n!\ninterface GigabitEthernet0/1\n ip address 203.0.113.5 255.255.255.252\n ip nat outside\n!\n! PAT Overload untuk seluruh LAN\naccess-list 1 permit 192.168.1.0 0.0.0.255\nip nat inside source list 1 interface GigabitEthernet0/1 overload\n!\n! Static Port Forwarding TCP 8080 publik ke 192.168.1.100 port 80\nip nat inside source static tcp 192.168.1.100 80 203.0.113.5 8080 extendable</code></pre>\n<div class=\"lesson-note\"><b>Mengenal CGNAT (Carrier-Grade NAT — RFC 6598):</b> Banyak ISP FTTH rumahan memberikan IP WAN pada rentang <code>100.64.0.0/10</code> (atau IP private <code>10.x.x.x</code>) di port WAN ONT pelanggan karena kelangkaan IPv4. Jika router Anda berada di belakang CGNAT ISP, <i>Port Forwarding (DSTNAT)</i> dari internet publik tidak akan bisa ditembus secara langsung kecuali Anda berlangganan IP Public Static atau menggunakan tunnel (Cloudflare Tunnel / WireGuard VPS / Tailscale).</div>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://datatracker.ietf.org/doc/html/rfc3022\" target=\"_blank\" rel=\"noopener\">IETF RFC 3022 — Traditional IP Network Address Translator (Traditional NAT &amp; NAPT/PAT)</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc6598\" target=\"_blank\" rel=\"noopener\">IETF RFC 6598 — IANA-Reserved IPv4 Prefix for Shared Address Space (Carrier-Grade NAT 100.64.0.0/10)</a></li></ul>\n",

  "linux": "\n<h2>14. Sistem Operasi Jaringan dan Administrasi Linux Server (Elemen 5)</h2>\n<p>Sebagian besar infrastruktur internet, cloud, container, dan router modern berjalan di atas kernel <b>Linux</b> (Debian, Ubuntu Server LTS, Rocky/AlmaLinux RHEL, hingga MikroTik RouterOS dan Juniper Junos yang berbasis UNIX/BSD/Linux). Administrator sistem jaringan wajib menguasai struktur direktori <b>Filesystem Hierarchy Standard (FHS 3.0)</b>, manajemen hak akses (POSIX Permissions &amp; sudo), konfigurasi jaringan (<code>iproute2</code> &amp; Netplan), manajemen daemon (<code>systemd</code>), serta audit log (<code>journalctl</code>).</p>\n<h3>Peta Direktori Kritis Linux (FHS) bagi Network &amp; System Engineer</h3>\n<table><thead><tr><th>Direktori</th><th>Fungsi Administrasi &amp; Contoh File Penting</th></tr></thead><tbody>\n<tr><td><code>/etc</code></td><td>Pusat seluruh file konfigurasi sistem &amp; layanan: <code>/etc/netplan/</code>, <code>/etc/network/interfaces</code>, <code>/etc/resolv.conf</code>, <code>/etc/hosts</code>, <code>/etc/ssh/sshd_config</code>, <code>/etc/bind/</code>, <code>/etc/apache2/</code>, <code>/etc/passwd</code>, <code>/etc/sudoers</code>.</td></tr>\n<tr><td><code>/var</code></td><td>Data variabel/dinamis: <code>/var/log/</code> (syslog, auth.log, apache2/error.log), <code>/var/www/html/</code> (dokumen web), <code>/var/lib/dhcp/dhcpd.leases</code> (database lease DHCP), <code>/var/cache/bind/</code>.</td></tr>\n<tr><td><code>/usr</code> &amp; <code>/bin</code>, <code>/sbin</code></td><td>Program biner aplikasi user (<code>/usr/bin</code>) dan utilitas administrasi sistem/jaringan (<code>/usr/sbin/ip</code>, <code>iptables</code>, <code>sshd</code>).</td></tr>\n<tr><td><code>/home</code> &amp; <code>/root</code></td><td>Direktori kerja akun user biasa (<code>/home/admin</code>) dan superuser root (<code>/root</code>).</td></tr>\n<tr><td><code>/proc</code> &amp; <code>/sys</code></td><td>Virtual filesystem kernel di RAM; misal mengaktifkan IP Forwarding Linux Router dengan <code>net.ipv4.ip_forward = 1</code> di <code>/etc/sysctl.conf</code> (memodifikasi <code>/proc/sys/net/ipv4/ip_forward</code>).</td></tr></tbody></table>\n<h3>Perhitungan Oktal Permission File Linux (<code>chmod</code> &amp; <code>chown</code>)</h3>\n<p>Setiap file memiliki 3 kelompok akses: <b>Owner (u)</b>, <b>Group (g)</b>, dan <b>Others (o)</b>. Tiap kelompok dihitung dari penjumlahan bit: <b>Read (r) = 4</b>, <b>Write (w) = 2</b>, <b>Execute (x) = 1</b>:</p>\n<ul><li><code>chmod 755 script.sh</code> → <code>rwxr-xr-x</code> (Owner bebas baca/tulis/eksekusi = 7; Group &amp; Others hanya baca/eksekusi = 5). Standar direktori web dan script eksekusi.</li><li><code>chmod 644 index.html</code> → <code>rw-r--r--</code> (Owner baca/tulis = 6; Group &amp; Others hanya baca = 4). Standar file konfigurasi dan halaman web statis.</li><li><code>chmod 600 ~/.ssh/id_ed25519</code> → <code>rw-------</code> (Hanya Owner yang boleh membaca/menulis; Group &amp; Others = 0). <b>Wajib untuk file Private Key SSH</b> (SSH akan menolak kunci privat jika permission-nya terlalu terbuka!).</li></ul>\n<h3>Hardening Dasar Server Linux Produksi (CIS Benchmark)</h3>\n<ol><li>Gunakan akun administrator non-root dengan <code>sudo</code>; matikan login root langsung via SSH (<code>PermitRootLogin no</code> di <code>/etc/ssh/sshd_config</code>).</li><li>Gunakan autentikasi <b>SSH Key-Based (Ed25519 / RSA-4096)</b> dan nonaktifkan login password teks biasa (<code>PasswordAuthentication no</code>) setelah kunci publik terpasang di <code>~/.ssh/authorized_keys</code>.</li><li>Aktifkan firewall host (<code>ufw</code> atau <code>nftables</code>) dan pasang <b>Fail2Ban</b> untuk memblokir otomatis IP yang melakukan brute-force SSH.</li><li>Pastikan sinkronisasi waktu NTP aktif (<code>timedatectl status</code>) dan pembaruan keamanan otomatis (<code>unattended-upgrades</code>) berjalan terjadwal.</li></ol>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://refspecs.linuxfoundation.org/fhs.shtml\" target=\"_blank\" rel=\"noopener\">The Linux Foundation — Filesystem Hierarchy Standard (FHS 3.0) Specification</a></li><li><a href=\"https://ubuntu.com/server/docs\" target=\"_blank\" rel=\"noopener\">Canonical Ubuntu Server Official Documentation (Netplan, systemd, OpenSSH &amp; Security)</a></li><li><a href=\"https://www.debian.org/doc/manuals/debian-handbook/\" target=\"_blank\" rel=\"noopener\">The Debian Administrator's Handbook — Network Infrastructure &amp; System Services</a></li></ul>\n",

  "server": "\n<h2>15. Konfigurasi dan Troubleshooting Layanan Server Jaringan (Elemen 5)</h2>\n<p>Pada Elemen 5 Administrasi Sistem Jaringan, seorang administrator mengintegrasikan layanan-layanan inti infrastruktur di atas server Linux (Debian/Ubuntu Server) agar seluruh client di jaringan dapat memperoleh alamat IP otomatis, menerjemahkan nama domain, mengakses aplikasi web terenkripsi, berbagi berkas lintas OS, dan menjaga sinkronisasi waktu.</p>\n<h3>Ringkasan Protokol, Port Transport, Daemon &amp; File Konfigurasi Inti</h3>\n<table><thead><tr><th>Layanan</th><th>Standar RFC &amp; Port</th><th>Paket Daemon Linux</th><th>File Konfigurasi &amp; Alat Uji (Verifikasi)</th></tr></thead><tbody>\n<tr><td><b>DHCP Server</b></td><td>RFC 2131<br>UDP 67 (Server) / 68 (Client)</td><td><code>isc-dhcp-server</code> / <code>kea-dhcp4-server</code></td><td><code>/etc/dhcp/dhcpd.conf</code>, lease di <code>/var/lib/dhcp/dhcpd.leases</code>.<br>Uji: proses <b>DORA</b> (Discover, Offer, Request, Ack), <code>ipconfig /renew</code>, <code>dhclient -v</code>.</td></tr>\n<tr><td><b>DNS Server</b></td><td>RFC 1035<br>UDP &amp; TCP 53</td><td><code>bind9</code></td><td><code>/etc/bind/named.conf.local</code>, <code>named.conf.options</code>, file zona Forward (A, AAAA, CNAME, MX, NS, SOA) &amp; Reverse (PTR <code>in-addr.arpa</code>).<br>Uji: <code>named-checkconf</code>, <code>named-checkzone</code>, <code>dig</code>, <code>nslookup</code>.</td></tr>\n<tr><td><b>Web Server</b></td><td>RFC 9110 / 8446<br>TCP 80 (HTTP) / 443 (HTTPS)</td><td><code>apache2</code> / <code>nginx</code></td><td><code>/etc/apache2/sites-available/*.conf</code>, DocumentRoot <code>/var/www/</code>.<br>Uji: <code>apache2ctl configtest</code>, <code>a2ensite</code>, <code>curl -I http://domain</code>.</td></tr>\n<tr><td><b>File Server</b></td><td>SMB/CIFS (TCP 445)<br>FTP/FTPS (TCP 20, 21)<br>SFTP (TCP 22)</td><td><code>samba</code> (<code>smbd</code>)<br><code>vsftpd</code><br><code>openssh-server</code></td><td>Samba: <code>/etc/samba/smb.conf</code> (uji: <code>testparm</code>, <code>smbclient</code>).<br>FTP: <code>/etc/vsftpd.conf</code> (wajib <code>anonymous_enable=NO</code> &amp; <code>chroot_local_user=YES</code>).</td></tr>\n<tr><td><b>NTP Server</b></td><td>RFC 5905<br>UDP 123</td><td><code>chrony</code> / <code>ntp</code> / <code>systemd-timesyncd</code></td><td><code>/etc/chrony/chrony.conf</code> atau <code>/etc/ntp.conf</code> (pool <code>0.id.pool.ntp.org</code>).<br>Uji: <code>chronyc sources</code>, <code>ntpq -p</code>, <code>timedatectl status</code>.</td></tr>\n<tr><td><b>Remote SSH</b></td><td>RFC 4251<br>TCP 22</td><td><code>openssh-server</code> (<code>sshd</code>)</td><td><code>/etc/ssh/sshd_config</code>, kunci di <code>~/.ssh/authorized_keys</code>.<br>Uji: <code>sshd -t</code>, <code>ssh -v user@ip-server</code>.</td></tr></tbody></table>\n<h3>Metodologi Troubleshooting Layanan Server Secara Sistematis</h3>\n<p>Ketika seorang client melaporkan tidak dapat mengakses layanan server (misal <code>www.sekolah.sch.id</code> gagal dibuka), lakukan isolasi masalah dari bawah ke atas:</p>\n<ol><li><b>Cek Konektivitas L1–L3:</b> Pastikan server dan client memiliki IP yang benar (<code>ip addr</code>) dan dapat saling ping atau melewati router antar-VLAN (<code>ping 192.168.1.10</code>, <code>traceroute</code>).</li><li><b>Cek Status Daemon di Server:</b> Jalankan <code>systemctl status bind9 apache2</code>. Jika <i>failed</i>, baca baris error konfigurasi dengan <code>journalctl -xeu bind9</code> dan jalankan validator sintaks (<code>named-checkconf</code> atau <code>apache2ctl configtest</code>).</li><li><b>Cek Listening Socket &amp; Port:</b> Jalankan <code>sudo ss -tulpn | grep -E ':53|:80|:443'</code> untuk memastikan daemon benar-benar mendengarkan pada IP interface jaringan (bukan hanya <code>127.0.0.1</code>!).</li><li><b>Cek Firewall Host &amp; Jaringan:</b> Periksa <code>sudo ufw status</code> atau ACL router/switch di tengah jalur.</li><li><b>Cek Resolusi DNS dari Client:</b> Jalankan <code>nslookup www.sekolah.sch.id 192.168.1.10</code>. Jika akses via IP berhasil (<code>http://192.168.1.20</code>) tetapi via nama domain gagal, maka masalah 100% berada pada konfigurasi DNS client (<code>/etc/resolv.conf</code> atau DHCP option <code>domain-name-servers</code>) atau file zona BIND9 (lupa menaikkan <i>Serial Number</i> SOA sebelum <code>systemctl reload bind9</code>).</li></ol>\n<h3>Sumber &amp; Referensi Standar Industri</h3>\n<ul><li><a href=\"https://datatracker.ietf.org/doc/html/rfc2131\" target=\"_blank\" rel=\"noopener\">IETF RFC 2131 — Dynamic Host Configuration Protocol (DHCP DORA Specification)</a></li><li><a href=\"https://datatracker.ietf.org/doc/html/rfc1035\" target=\"_blank\" rel=\"noopener\">IETF RFC 1035 — Domain Names - Implementation and Specification (DNS Zone &amp; Resource Records)</a></li><li><a href=\"https://bind9.readthedocs.io/\" target=\"_blank\" rel=\"noopener\">ISC BIND 9 Official Administrator Reference Manual</a></li><li><a href=\"https://httpd.apache.org/docs/2.4/\" target=\"_blank\" rel=\"noopener\">Apache HTTP Server Version 2.4 Official Documentation (Virtual Hosts &amp; SSL/TLS)</a></li></ul>\n"
};


// Judul tampilan tiap materi — selaras urutan 5 Elemen Kepmendikbudristek No. 032/H/KR/2024 (E1 → E2 → E3 → E4 → E5)
const lessonTitles = {
    topologi: 'Topologi Jaringan', kebutuhan: 'Kebutuhan Teknis Jaringan', peralatan: 'Peralatan Jaringan',
    ip: 'IP Address, CIDR &amp; VLSM', kabel: 'Instalasi Jaringan Kabel', nirkabel: 'Jaringan Nirkabel WiFi',
    fiber: 'Fiber Optic', keamanan: 'Keamanan Jaringan', firewall: 'Firewall &amp; ACL',
    kriptografi: 'Kriptografi', vlan: 'VLAN (Virtual LAN)', routing: 'Routing Statis &amp; Dinamis',
    nat: 'NAT &amp; Internet Gateway', linux: 'Sistem Operasi Jaringan Linux', server: 'Konfigurasi Server'
};

// CTA + alat baca di akhir halaman materi — pengayaan dibuka sebagai tampilan terpisah
// mode 'lesson' (di halaman materi): tandai selesai, cetak, buka pengayaan
// mode 'enrich' (di view pengayaan): ukuran huruf, tandai selesai, cetak
function lessonTools(id, mode = 'lesson') {
    if (!lessonEnrichment[id]) return '';
    const done = safeGetJSON('tjkt_lesson_done');
    const isDone = !!done[id];
    const fontBtns = mode === 'enrich'
        ? `<button class="clay-btn" onclick="changeLessonFont(-1)" aria-label="Perkecil teks">A−</button>
           <button class="clay-btn" onclick="changeLessonFont(1)" aria-label="Perbesar teks">A+</button>` : '';
    const openBtn = mode === 'lesson'
        ? `<button class="clay-btn" onclick="showEnrichment('${id}')"><i class="fas fa-book-reader"></i> Materi Pengayaan</button>` : '';
    const hint = mode === 'enrich'
        ? 'Simpan progres dan atur kenyamanan membaca'
        : 'Simpan progres belajar atau buka materi pengayaan topik ini';
    return `<div class="lesson-toolbar clay-card" aria-label="Alat baca materi">
      <div class="lesson-toolbar-main"><span class="lesson-toolbar-label"><i class="fas fa-book-reader"></i> Mode Belajar</span><span class="lesson-toolbar-hint">${hint}</span></div>
      <div class="lesson-toolbar-actions">
        ${fontBtns}
        <button class="clay-btn ${isDone?'is-done':''}" onclick="toggleLessonDone('${id}',this)"><i class="fas fa-check-circle"></i> ${isDone?'Sudah dipelajari':'Tandai selesai'}</button>
        <button class="clay-btn" onclick="printLesson()"><i class="fas fa-print"></i> Cetak</button>
        ${assessments[id] ? `<button class="clay-btn" onclick="showAssessment('${id}')"><i class="fas fa-tasks"></i> Asesmen</button>` : ''}
        ${openBtn}
      </div>
    </div>`;
}

// Visual pendamping untuk setiap halaman Materi Pengayaan (15 Topik)
const ENRICH_VISUALS = {
    topologi: [
        ['assets/topologi-tree-hybrid.svg', 'Arsitektur Topologi Tree (Extended Star) & Hybrid Kampus/Enterprise'],
        ['assets/ppt/topologi-star.png', 'Topologi Star — Standar LAN Modern Terpusat pada Switch'],
        ['assets/ppt/topologi-mesh.png', 'Topologi Full Mesh — Redundansi Jalur Antar-Node Core']
    ],
    kebutuhan: [
        ['assets/analisis-kebutuhan.svg', 'Alur Analisis Kebutuhan Teknis: Identifikasi → Survei → Prioritas → SLA'],
        ['assets/peta-jaringan-scope.svg', 'Skala Cakupan Jaringan PAN, LAN, MAN, dan WAN']
    ],
    peralatan: [
        ['assets/devices/router.jpg', 'Router Layer 3 — Penentuan Rute Antar-Jaringan & Gateway'],
        ['assets/devices/switch.jpg', 'Switch Layer 2/3 — Forwarding Frame MAC, VLAN & PoE'],
        ['assets/server-client-services.svg', 'Arsitektur Layanan Perangkat Client-Server']
    ],
    ip: [
        ['assets/subnetting-flow.svg', 'Alur Perhitungan Subnetting CIDR, Block Size & VLSM'],
        ['assets/ppt/ipv4-struktur.png', 'Struktur Pengalamatan IPv4 32-Bit (4 Oktet)']
    ],
    kabel: [
        ['assets/ppt/kabel-t568-gigabit-poe.svg', 'Standar Pinout ANSI/TIA-568.2-D (T568A/B), Gigabit 4-Pair & PoE'],
        ['assets/kabel-utp-pairing.svg', 'Pasangan Kawat Pilin (Twisted Pair) & Reduksi Crosstalk'],
        ['assets/ppt/kabel-utp-ftp-stp.jpeg', 'Konstruksi Pelindung Kabel U/UTP, F/UTP (FTP), dan S/FTP (STP)']
    ],
    nirkabel: [
        ['assets/ppt/wifi-ptp-ptmp-fresnel.svg', 'Arsitektur Outdoor PtP Backhaul, Zona Fresnel, PtMP & Link Budget'],
        ['assets/wifi-channel.svg', 'Perencanaan Kanal Non-Overlapping 2,4 GHz (Kanal 1, 6, 11)']
    ],
    fiber: [
        ['assets/fo/fig-fiber-tir-cutaway.svg', 'Prinsip Total Internal Reflection (TIR) & Struktur Serat Optik'],
        ['assets/fo/fig-ftth-branching-map.svg', 'Arsitektur End-to-End FTTH GPON (OLT → ODF → ODC → ODP → ONT)'],
        ['assets/fo/fig-otdr-trace-pro.svg', 'Analisis Kurva Trace OTDR & Sertifikasi Redaman Optik']
    ],
    keamanan: [
        ['assets/ppt/sec-ids-ips-edr-arch.svg', 'Arsitektur NGFW, DMZ, Inline IPS vs Passive SPAN IDS, SIEM & EDR'],
        ['assets/defense-in-depth.svg', 'Lapisan Pertahanan Berlapis (Defense-in-Depth)']
    ],
    firewall: [
        ['assets/firewall-dmz.svg', 'Kebijakan Isolasi Zona Firewall: Inside (LAN), Outside (WAN) & DMZ'],
        ['assets/ppt/perangkat-firewall-diagram.png', 'Pemfilteran Lalu Lintas Paket dengan Access Control List (ACL)']
    ],
    kriptografi: [
        ['assets/crypto-compare.svg', 'Perbandingan Enkripsi Simetris (AES), Asimetris (RSA/ECC), & Hash (SHA-256)'],
        ['assets/packet-journey.svg', 'Perlindungan Data pada Lapisan Transport (TLS) & Network (IPsec)']
    ],
    vlan: [
        ['assets/vlan-trunk.svg', 'Segmentasi IEEE 802.1Q VLAN Tagging, Access Port & Trunk Port'],
        ['assets/ppt/vlan-diagram.png', 'Pemisahan Broadcast Domain Antar-Departemen pada Switch']
    ],
    routing: [
        ['assets/ppt/routing-l3-engine.svg', 'Alur Keputusan Layer 3 Routing Engine (Longest Prefix Match, AD & Metric)'],
        ['assets/routing-decision.svg', 'Pemilihan Jalur Terbaik Berdasarkan Tabel Routing'],
        ['assets/ppt/routing-ospf.png', 'Topologi Hierarkis OSPF Multi-Area (Area 0 Backbone)']
    ],
    nat: [
        ['assets/ppt/nat-mikrotik-topology.svg', 'Arsitektur Gateway SRCNAT Masquerade (PAT) & DSTNAT Port Forwarding'],
        ['assets/nat-pat-flow.svg', 'Proses Translasi Tabel IP Private ke IP Public via Port Transport']
    ],
    linux: [
        ['assets/linux-filetree.svg', 'Struktur Direktori Filesystem Hierarchy Standard (FHS) & CLI Linux'],
        ['assets/ppt/os-debian.jpg', 'Sistem Operasi Debian / Ubuntu Server LTS'],
        ['assets/ppt/os-routeros.png', 'Network Operating System (MikroTik RouterOS)']
    ],
    server: [
        ['assets/dhcp-dns-flow.svg', 'Alur Protokol DHCP (DORA) & Resolusi Hierarki DNS Server'],
        ['assets/ppt/app-apache.jpg', 'Layanan Web Server HTTP/HTTPS (Apache Virtual Host)'],
        ['assets/ppt/app-samba.png', 'Layanan File Sharing Lintas Platform (Samba SMB/CIFS)']
    ]
};

function renderEnrichVisualStrip(id) {
    const list = ENRICH_VISUALS[id];
    if (!list || !list.length) return '';
    return `<div class="enrich-visual-box">
        <div class="enrich-visual-title"><i class="fas fa-images"></i> Ilustrasi &amp; Diagram Visual Pendamping Materi</div>
        <div class="enrich-visual-grid">
            ${list.map(([src, cap]) => `<figure class="enrich-visual-card"><img src="${src}" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`).join('')}
        </div>
    </div>`;
}

// Tampilan terpisah untuk materi pengayaan (agar halaman materi tidak terlalu panjang)
function showEnrichment(id, opts) {
    if (!(opts && opts.fromRoute)) pushRoute('#/enrich/' + id);
    const title = lessonTitles[id] || '';
    currentTrack = 'tkj';
    currentPage = 'enrich_' + id;
    try { localStorage.setItem('tjkt_last_page', 'enrich_' + id); } catch (e) {}
    const el = document.getElementById('content');
    el.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    closeSidebar();
    updateBottomNav('enrich_' + id);
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    setTimeout(() => {
        if (!lessonEnrichment[id]) {
            el.innerHTML = card('<h2>Materi pengayaan tidak ditemukan.</h2>');
            return;
        }
        el.innerHTML = `
          <div class="lesson-toolbar clay-card" aria-label="Navigasi pengayaan">
            <div class="lesson-toolbar-main"><span class="lesson-toolbar-label"><i class="fas fa-book-reader"></i> Materi Pengayaan</span><span class="lesson-toolbar-hint">${title}</span></div>
            <div class="lesson-toolbar-actions">
              <button class="clay-btn" onclick="showPage('${id}')"><i class="fas fa-arrow-left"></i> Kembali ke Materi</button>
              ${assessments[id] ? `<button class="clay-btn" onclick="showAssessment('${id}')"><i class="fas fa-tasks"></i> Asesmen</button>` : ''}
            </div>
          </div>
          <article class="lesson-enrichment clay-card" data-font-size="16">
            <div class="lesson-enrichment-heading"><span class="lesson-kicker">MATERI PENGAYAAN • BUKU AJAR TJKT</span><h1>${title} — Pendalaman Konsep dan Praktik</h1><p>Pelajari konsep, diagram visual, contoh penerapan, prosedur kerja, dan referensi standar industri berikut secara bertahap.</p></div>
            ${renderEnrichVisualStrip(id)}
            <div class="lesson-enrichment-body">${lessonEnrichment[id]}</div>
          </article>
          ${lessonTools(id, 'enrich')}`;
        prepContent(el);
        initComponents();
        updateSidebarActive('enrich_' + id);
        decorateContent('enrich_' + id);
    }, 80);
}

// Halaman hub "Materi Pengayaan" — daftar 15 topik, tiap kartu membuka view pengayaan
function pengayaanPage() {
    const done = safeGetJSON('tjkt_lesson_done');
    const ids = Object.keys(lessonEnrichment);
    const doneCount = ids.filter(k => done[k]).length;
    const emoj = ['📘','🔬','🛠️','🔢','🔀','🧭','🌐','🔌','📶','💡','🔐','🧱','🔑','🐧','🗄️'];
    return `
    <div class="card">
        ${sectionHead('fa-book-reader','Materi Pengayaan (15 Topik)','sh-purple')}
        <p style="color:var(--slate-500);font-size:.86rem;margin:4px 0 16px">Pendalaman konsep dan studi kasus tiap topik Konsentrasi TKJ.</p>
        <div class="assess-grid">
            ${ids.map((k, i) => `
            <div class="assess-card" onclick="showEnrichment('${k}')">
                <div class="assess-card-icon">${emoj[i] || '📘'}</div>
                <div class="assess-card-text"><strong>${lessonTitles[k] || k}</strong><span>${done[k] ? '✅ Selesai' : 'Buka pengayaan →'}</span></div>
            </div>`).join('')}
        </div>
        <p style="font-size:.78rem;color:var(--slate-500);margin-top:14px">${doneCount}/${ids.length} topik ditandai selesai</p>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-ghost" onclick="showPage('tkj')"><i class="fas fa-arrow-left"></i> Peta Materi TKJ</button>
            <button class="btn-primary" onclick="showPage('topologi')"><i class="fas fa-play"></i> Mulai Topik 1</button>
        </div>
    </div>`;
}

function toggleLessonDone(id, btn) {
    const done = safeGetJSON('tjkt_lesson_done');
    done[id] = !done[id];
    safeSetJSON('tjkt_lesson_done', done);
    btn.classList.toggle('is-done', done[id]);
    btn.innerHTML = `<i class="fas fa-check-circle"></i> ${done[id]?'Sudah dipelajari':'Tandai selesai'}`;
    toast(done[id] ? 'Progres belajar tersimpan.' : 'Status materi diperbarui.');
}
function changeLessonFont(delta) {
    const root = document.querySelector('.lesson-enrichment');
    if (!root) return;
    const current = Number(root.dataset.fontSize || 16);
    const next = Math.max(14, Math.min(21, current + delta));
    root.dataset.fontSize = next;
    root.style.setProperty('--lesson-font-size', next + 'px');
}
function printLesson() { window.print(); }


function showPage(id, opts) {
    const canonicalRoute = id.startsWith('fo-tp') ? '#/fo-tp/' + id.slice(3) : '#/' + id;
    if (!(opts && opts.fromRoute)) pushRoute(canonicalRoute);
    currentPage = id;
    try { localStorage.setItem('tjkt_last_page', id); } catch (e) {}
    const el = document.getElementById('content');
    el.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    closeSidebar();
    updateBottomNav(id);

    // Scroll ke atas (window adalah scroller utama)
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;

    setTimeout(() => {
        if (pages[id]) {
            const tools = id.startsWith('fo-tp') ? '' : lessonTools(id);
            el.innerHTML = pages[id]() + tools;
            prepContent(el);
            initComponents();
            updateSidebarActive(id);
            decorateContent(id);
        } else {
            el.innerHTML = card('<h2>Halaman tidak ditemukan.</h2>');
        }
    }, 80);
}

// ============================================================
// PERSIAPAN KONTEN HALAMAN
// - Gambar pada imagebox dimuat segera (tanpa menunggu scroll)
// - Semua tabel telanjang dibungkus .table-wrap agar bisa
//   digulir horizontal di layar sempit (tidak pernah memotong)
// ============================================================
function prepContent(root) {
    root.querySelectorAll('.img-grid img,.img-row img,.img-showcase img,figure.illo img,.dev-grid img').forEach(img => {
        if (img.loading === 'lazy') img.loading = 'eager';
        if (!img.complete && img.getAttribute('src')) img.src = img.src;
    });
    root.querySelectorAll('table').forEach(t => {
        const p = t.parentElement;
        if (!p || p.classList.contains('table-wrap')) return;
        const w = document.createElement('div');
        w.className = 'table-wrap';
        p.insertBefore(w, t);
        w.appendChild(t);
    });
}

function showAssessment(topic, opts) {
    if (!(opts && opts.fromRoute)) pushRoute('#/quiz/' + topic);
    const originTrack = topic.startsWith('fo_') ? 'fo' : (topic === 'fiber' ? currentTrack : 'tkj');
    const lessonPage = topic.startsWith('fo_') ? ('fo-' + topic.slice(3)) : (pages[topic] ? topic : (originTrack === 'fo' ? 'fiberOptik' : 'home'));
    currentTrack = originTrack;
    currentPage = 'quiz_' + topic;
    closeSidebar();
    updateBottomNav('quiz_' + topic);
    updateSidebarActive('quiz_' + topic);
    window.scrollTo(0, 0);
    const allQ = assessments[topic];
    if (!allQ) return;
    const singles = shuffle(allQ.filter(q => q.type !== 'multi')).slice(0, 15);
    const multis  = shuffle(allQ.filter(q => q.type === 'multi')).slice(0, 5);
    quizState = {
        topic, originTrack, lessonPage,
        questions: shuffle([...singles, ...multis]),
        current: 0, score: 0, answers: [],
        multiSel: [], multiAnswered: false,
        startTime: Date.now()
    };
    renderQuestion();
}

const TRACK_UI = {
    tkj: { home: 'home', materi: 'tkj', materiLabel: 'Materi', topikLabel: 'Topik', short: 'TJKT Studio', name: 'Konsentrasi TKJ' },
    fo:  { home: 'home', materi: 'fiberOptik', materiLabel: 'Modul FO', topikLabel: '7 TP', short: 'TJKT Studio', name: 'Fiber Optik' }
};

function trackOfPage(id) {
    if (!id) return currentTrack;
    if (id === 'fiberOptik' || id === 'fo-pengayaan') return 'fo';
    if (id.startsWith('fo-') || id.startsWith('fo_enrich_') || id.startsWith('quiz_fo_')) return 'fo';
    if (id === 'tkj') return 'tkj';
    if (id === 'home' || id === 'progress' || id === 'glosarium' || id === 'glosariumPerangkat' || id === 'fiber' || id === 'quiz_fiber') return currentTrack;
    return 'tkj';
}

function enterTrack(track) {
    currentTrack = track;
    syncTrackUI(track);
    showPage(track === 'fo' ? 'fiberOptik' : 'tkj');
    if (typeof window !== 'undefined' && window.innerWidth < 860) {
        setTimeout(() => {
            const sb = document.getElementById('sidebar');
            const ov = document.getElementById('overlay');
            if (sb && !sb.classList.contains('open')) sb.classList.add('open');
            if (ov && !ov.classList.contains('active')) ov.classList.add('active');
        }, 90);
    }
}

function syncTrackUI(track) {
    const cfg = TRACK_UI[track] || TRACK_UI.tkj;
    if (currentTrack !== track) currentTrack = track;

    // Panel sidebar mengikuti jalur aktif
    const tkjNav = document.getElementById('snav-track-tkj');
    const foNav = document.getElementById('snav-track-fo');
    if (track === 'fo') {
        if (tkjNav) tkjNav.classList.add('hidden');
        if (foNav) foNav.classList.remove('hidden');
    } else {
        if (foNav) foNav.classList.add('hidden');
        if (tkjNav) tkjNav.classList.remove('hidden');
    }
    const brandText = document.querySelector('.sidebar-brand .sb-text');
    const brandIcon = document.querySelector('.sidebar-brand .sb-icon');
    if (brandText) brandText.innerHTML = track === 'fo' ? '<strong>TJKT Studio</strong><span>Fiber Optik · Fase F</span>' : '<strong>TJKT Studio</strong><span>Konsentrasi · Fase F</span>';
    if (brandIcon) brandIcon.innerHTML = track === 'fo' ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-network-wired"></i>';

    const brand = document.querySelector('.topbar-brand');
    if (brand) brand.innerHTML = `<span class="tb-logo">${cfg.short}</span><span class="tb-fase">${track === 'fo' ? 'Fiber Optik' : 'Fase F'}</span>`;
    document.querySelectorAll('.snav-tab').forEach(b => {
        const on = b.dataset.track === track;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.getElementById('track-btn')?.setAttribute('title', `Sedang di ${cfg.name} - layar utama`);
}

function updateBottomNav(id) {
    const track = trackOfPage(id);
    const cfg = TRACK_UI[track];
    const keys = ['home', 'materi', 'menu', 'progress'];
    keys.forEach(k => document.getElementById('bn-' + k)?.classList.remove('active'));

    const set = (k, onclick, icon, label, title) => {
        const b = document.getElementById('bn-' + k);
        if (!b) return;
        b.setAttribute('onclick', onclick);
        b.title = title;
        const i = b.querySelector('i'), s = b.querySelector('span');
        if (i) i.className = 'fas ' + icon;
        if (s) s.textContent = label;
    };
    set('home', `showPage('${cfg.home}')`, 'fa-home', 'Beranda', cfg.name);
    set('materi', `showPage('${cfg.materi}')`, 'fa-book-open', cfg.materiLabel, track === 'fo' ? 'Mulai TP 1.1 K3LH' : 'Mulai membaca materi');
    set('menu', 'toggleSidebar()', 'fa-list', cfg.topikLabel, track === 'fo' ? 'Daftar 7 Tujuan Pembelajaran' : 'Daftar 15 topik materi');
    set('progress', "showPage('progress')", 'fa-chart-bar', 'Progress', 'Progres dan nilai saya');

    let active = '';
    if (id === 'progress') active = 'progress';
    else if (id === 'home') active = 'home';
    else if (id === 'tkj' || id === 'fiberOptik' || id === 'intro' || E_GROUP[id] || id === 'glosarium' || id === 'glosariumPerangkat' || id.startsWith('fo-') || id === 'pengayaan' || id === 'fo-pengayaan' || id.startsWith('enrich_') || id.startsWith('fo_enrich_') || id === 'fiber' || id.startsWith('quiz_')) active = 'materi';
    if (active) document.getElementById('bn-' + active)?.classList.add('active');
    syncTrackUI(track);
}


// ============================================================
// TRACK SWITCHING (KONSENTRASI TKJ vs MODUL FIBER OPTIK)
// ============================================================
function switchTrack(track, shouldCloseDrawer = false) {
    currentTrack = track;
    syncTrackUI(track);
    if (shouldCloseDrawer) closeSidebar();

    if (track === 'fo') {
        const isAlreadyFo = (currentPage === 'fiberOptik' || currentPage === 'fo-pengayaan' || currentPage === 'fiber' || currentPage === 'quiz_fiber' || currentPage.startsWith('fo-') || currentPage.startsWith('fo_enrich_') || currentPage.startsWith('quiz_fo_'));
        if (!isAlreadyFo) {
            showPage('fiberOptik');
        } else if (currentPage === 'fiber' || currentPage === 'progress' || currentPage === 'glosarium' || currentPage === 'glosariumPerangkat') {
            showPage(currentPage, { fromRoute: true });
        }
    } else {
        const isAlreadyTkj = (currentPage === 'tkj' || currentPage === 'intro' || currentPage === 'pengayaan' || E_GROUP[currentPage] || currentPage.startsWith('enrich_') || (currentPage.startsWith('quiz_') && !currentPage.startsWith('quiz_fo_')));
        if (!isAlreadyTkj) {
            showPage('tkj');
        } else if (currentPage === 'fiber' || currentPage === 'progress' || currentPage === 'glosarium' || currentPage === 'glosariumPerangkat') {
            showPage(currentPage, { fromRoute: true });
        }
    }
}

function updateSidebarActive(id) {
    // Sinkronkan panel track sidebar aktif (halaman bersama tetap pertahankan track aktif)
    const isFoContext = (id === 'fiberOptik' || id === 'fo-pengayaan' || (id && (id.startsWith('fo-') || id.startsWith('fo_enrich_') || id.startsWith('quiz_fo_'))));
    const isShared = (id === 'home' || id === 'fiber' || id === 'quiz_fiber' || id === 'glosarium' || id === 'glosariumPerangkat' || id === 'progress');
    const targetTrack = isFoContext ? 'fo' : (isShared ? currentTrack : 'tkj');

    if (targetTrack !== currentTrack) {
        currentTrack = targetTrack;
    }
    syncTrackUI(currentTrack);

    const currentTrackContainer = document.getElementById(currentTrack === 'fo' ? 'snav-track-fo' : 'snav-track-tkj');
    if (!currentTrackContainer || !currentTrackContainer.querySelectorAll) return;

    currentTrackContainer.querySelectorAll('.snav-item').forEach(el => el.classList.remove('active'));

    // Cari item aktif di dalam container track saat ini
    let items = [];
    if (id && id.startsWith('quiz_')) {
        const topic = id.slice(5);
        items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="showAssessment('${topic}')"]`);
    } else if (id && id.startsWith('enrich_')) {
        const topic = id.slice(7);
        items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="showEnrichment('${topic}')"]`);
        if (!items.length) items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="'pengayaan'"]`);
    } else if (id && id.startsWith('fo_enrich_')) {
        const tp = id.slice(10);
        items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="showFoEnrichment('${tp}')"]`);
        if (!items.length) items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="'fo-pengayaan'"]`);
    } else {
        items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="'${id}'"]`);
        if (!items.length && isFoContext) {
            items = currentTrackContainer.querySelectorAll(`.snav-item[onclick*="'fiberOptik'"]`);
        }
    }

    items.forEach(el => el.classList.add('active'));
    if (items.length) {
        const sec = items[0].closest('.snav-section');
        if (sec) {
            currentTrackContainer.querySelectorAll('.snav-section').forEach(s => s.classList.remove('open'));
            sec.classList.add('open');
        }
    }
}

// ── SIDEBAR DROPDOWN ──────────────────────────────────────
function toggleSnavSection(label) {
    const sec = label.closest('.snav-section');
    if (sec) sec.classList.toggle('open');
}

// ── SIDEBAR ───────────────────────────────────────────────
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
}
document.getElementById('menu-btn')?.addEventListener('click', toggleSidebar);
document.getElementById('close-sidebar')?.addEventListener('click', closeSidebar);

// ============================================================
// DEKORASI HALAMAN — breadcrumb, daftar isi, pager, progres baca
// ============================================================
const TKJ_ORDER = ['topologi','kebutuhan','peralatan','ip','kabel','nirkabel','fiber','keamanan','firewall','kriptografi','vlan','routing','nat','linux','server'];
const E_GROUP = {
    topologi:'E1', kebutuhan:'E1', peralatan:'E1', ip:'E1',
    kabel:'E2', nirkabel:'E2', fiber:'E2',
    keamanan:'E3', firewall:'E3', kriptografi:'E3',
    vlan:'E4', routing:'E4', nat:'E4',
    linux:'E5', server:'E5'
};

function pageMeta(id) {
    if (!id) return null;
    if (id.startsWith('fo_enrich_')) {
        const tp = id.slice(10);
        const t = FO_TP.find(x => x.id === tp);
        return t ? { track:'fo', crumb:[[ 'Fiber Optik', "showPage('fiberOptik')" ], [ t.code, `showPage('fo-${tp}')` ], [ 'Pengayaan', '' ]], title:'Pengayaan ' + t.code, toc:true } : null;
    }
    if (id.startsWith('enrich_')) {
        const k = id.slice(7);
        return { track:'tkj', crumb:[[ 'Konsentrasi TKJ', "showPage('tkj')" ], [ 'Materi Pengayaan', "showPage('pengayaan')" ], [ lessonTitles[k] || k, '' ]], title:lessonTitles[k] || k, toc:true };
    }
    if (id.startsWith('fo-tp')) {
        const t = FO_TP.find(x => 'fo-' + x.id === id);
        if (t) return { track:'fo', crumb:[[ 'Fiber Optik', "showPage('fiberOptik')" ], [ t.code, '' ]], title:t.code + ' — ' + t.title, lesson:true, order:['fiber', ...FO_TP.map(x => 'fo-' + x.id)], id, toc:true };
    }
    if (id === 'fiber' && currentTrack === 'fo') {
        return { track:'fo', crumb:[[ 'Fiber Optik', "showPage('fiberOptik')" ], [ 'Teori Dasar FO', '' ]], title:'Teori Dasar Fiber Optik', lesson:true, order:['fiber', ...FO_TP.map(x => 'fo-' + x.id)], id:'fiber', toc:true };
    }
    if (E_GROUP[id]) return { track:'tkj', crumb:[[ 'Konsentrasi TKJ', "showPage('tkj')" ], [ E_GROUP[id], "showPage('intro')" ], [ lessonTitles[id] || id, '' ]], title:lessonTitles[id] || id, lesson:true, order:TKJ_ORDER, id, toc:true };
    if (id === 'tkj') return { track:'tkj', crumb:[[ 'Beranda', "showPage('home')" ], [ 'Konsentrasi TKJ', '' ]], title:'Peta Materi Konsentrasi TKJ' };
    if (id === 'pengayaan') return { track:'tkj', crumb:[[ 'Konsentrasi TKJ', "showPage('tkj')" ], [ 'Materi Pengayaan', '' ]], title:'Materi Pengayaan' };
    if (id === 'fo-pengayaan') return { track:'fo', crumb:[[ 'Fiber Optik', "showPage('fiberOptik')" ], [ 'Materi Pengayaan', '' ]], title:'Materi Pengayaan FO' };
    if (id === 'intro') return { track:'tkj', crumb:[[ 'Konsentrasi TKJ', "showPage('tkj')" ], [ 'Capaian Pembelajaran', '' ]], title:'Capaian Pembelajaran', toc:true };
    if (id === 'fiberOptik') return { track:'fo', crumb:[[ 'Beranda', "showPage('home')" ], [ 'Fiber Optik', '' ]], title:'Peta Materi Fiber Optik' };
    if (id === 'glosarium') return { track:currentTrack, crumb:[[ 'Beranda', "showPage('home')" ], [ 'Glosarium Istilah', '' ]], title:'Glosarium Istilah', toc:true };
    if (id === 'glosariumPerangkat') return { track:currentTrack, crumb:[[ 'Beranda', "showPage('home')" ], [ 'Glosarium Perangkat', '' ]], title:'Glosarium Perangkat', toc:true };
    if (id === 'progress') return { track:currentTrack, crumb:[[ 'Beranda', "showPage('home')" ], [ 'Progress', '' ]], title:'Progress Belajar', toc:true };
    return null;
}

function decorateContent(id) {
    const root = document.getElementById('content');
    if (!root) return;
    const meta = pageMeta(id);
    if (!meta) { updateReadBar(); return; }

    // 1) Breadcrumb
    if (meta.crumb && meta.crumb.length && !root.querySelector('.crumb-bar')) {
        const parts = meta.crumb.map(([label, act], i) => {
            const last = i === meta.crumb.length - 1;
            if (last || !act) return `<span class="crumb-cur" aria-current="page">${label}</span>`;
            return `<button type="button" class="crumb-link" onclick="${act}">${label}</button><i class="fas fa-chevron-right crumb-sep"></i>`;
        }).join('');
        root.insertAdjacentHTML('afterbegin', `<nav class="crumb-bar" aria-label="Breadcrumb">${parts}</nav>`);
    }

    // 2) Daftar isi otomatis (dari sub-judul h3)
    if (meta.toc && !root.querySelector('.toc-card')) {
        const heads = [...root.querySelectorAll('h2, h3')].filter(h => h.textContent.trim().length > 1);
        if (heads.length >= 3) {
            const items = heads.map((h, i) => {
                if (!h.id) h.id = 'sec-' + id + '-' + i;
                const txt = h.textContent.trim();
                return `<li><a href="#${h.id}" onclick="event.preventDefault();document.getElementById('${h.id}').scrollIntoView({behavior:'smooth',block:'start'});">${txt}</a></li>`;
            }).join('');
            const html = `<details class="toc-card"><summary><i class="fas fa-list-ul"></i> Daftar Isi <span>${heads.length} bagian</span></summary><ol>${items}</ol></details>`;
            const anchor = root.querySelector('.card');
            if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
            else root.insertAdjacentHTML('afterbegin', html);
        }
    }

    // 3) Simulasi Visual & Lab Praktik Interaktif (100% In-App, bekerja Offline & Online tanpa YouTube)
    const simKey = id.startsWith('enrich_') ? id.slice(7) : (id.startsWith('fo_enrich_') ? ('fo-' + id.slice(10)) : id);
    if (LESSON_SIMULATIONS[simKey] && !root.querySelector('.sim-lab-card')) {
        const simHtml = renderLessonSimulation(simKey);
        const lastCard = [...root.querySelectorAll('.card, .lesson-enrichment')].pop();
        if (lastCard) lastCard.insertAdjacentHTML('afterend', simHtml);
        else root.insertAdjacentHTML('beforeend', simHtml);
    }

    // 4) Pager prev/next antar materi
    if (meta.lesson && !root.querySelector('.lesson-pager, .fo-pager')) {
        const arr = meta.order, i = arr.indexOf(id);
        const prev = arr[i - 1], next = arr[i + 1];
        const nm = x => x === 'fiber' ? 'Teori Dasar FO' : x.startsWith('fo-') ? ((FO_TP.find(t => 'fo-' + t.id === x) || {}).code || 'TP') : (lessonTitles[x] || x);
        const btn = (x, dir) => x
            ? `<button type="button" class="btn-ghost" onclick="showPage('${x}')">${dir === 'prev' ? '<i class="fas fa-arrow-left"></i> ' + nm(x) : nm(x) + ' <i class="fas fa-arrow-right"></i>'}</button>`
            : '<span></span>';
        const hub = meta.track === 'fo' ? 'fiberOptik' : 'tkj';
        const hubLabel = meta.track === 'fo' ? 'Semua TP FO' : 'Peta Materi TKJ';
        root.insertAdjacentHTML('beforeend',
            `<nav class="fo-pager lesson-pager" aria-label="Navigasi materi">${btn(prev, 'prev')}<button type="button" class="btn-ghost" onclick="showPage('${hub}')"><i class="fas fa-th"></i> ${hubLabel}</button>${btn(next, 'next')}</nav>`);
    }

    updateReadBar();
}

// Bar progres baca tipis di atas layar
function initReadBar() {
    if (document.getElementById('read-bar')) return;
    const b = document.createElement('div');
    b.id = 'read-bar';
    b.className = 'read-bar';
    b.setAttribute('aria-hidden', 'true');
    document.body.appendChild(b);
    window.addEventListener('scroll', updateReadBar, { passive: true });
    window.addEventListener('resize', updateReadBar);
}
function updateReadBar() {
    const b = document.getElementById('read-bar');
    const y = window.scrollY || 0;
    document.querySelector('.topbar')?.classList.toggle('scrolled', y > 12);
    if (!b) return;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    b.style.width = h > 60 ? Math.min(100, (y / h) * 100) + '%' : '0%';
    b.classList.toggle('show', y > 60);
}
initReadBar();

// Kartu "Lanjutkan belajar" (halaman terakhir yang dibuka)
function resumeCard() {
    let last = '';
    try { last = localStorage.getItem('tjkt_last_page') || ''; } catch (e) {}
    if (!last || last === 'home' || last === 'intro') return '';
    const isFo = last === 'fiberOptik' || last.startsWith('fo-') || last.startsWith('fo_enrich_');
    let name = 'Materi', act = '';
    if (last.startsWith('fo_enrich_')) {
        const tp = last.slice(10);
        const t = FO_TP.find(x => x.id === tp);
        name = t ? `Pengayaan ${t.code} — ${t.title}` : 'Pengayaan Fiber Optik';
        act = `showFoEnrichment('${tp}')`;
    } else if (last.startsWith('enrich_')) {
        const k = last.slice(7);
        name = 'Pengayaan: ' + (lessonTitles[k] || k);
        act = `showEnrichment('${k}')`;
    } else if (last.startsWith('fo-')) {
        const t = FO_TP.find(x => 'fo-' + x.id === last);
        name = t ? `${t.code} - ${t.title}` : 'Fiber Optik';
        act = `foOpen('${last.slice(3)}')`;
    } else if (isFo) { name = 'Beranda Fiber Optik'; act = "showPage('fiberOptik')"; }
    else if (pages[last]) { name = lessonTitles[last] || last; act = `showPage('${last}')`; }
    if (!act) return '';
    return `<button type="button" class="resume-card" onclick="${act}">
        <span class="resume-ic"><i class="fas fa-play-circle"></i></span>
        <span class="resume-txt"><small>Lanjutkan belajar</small><strong>${name}</strong></span>
        <i class="fas fa-arrow-right resume-go"></i></button>`;
}

// Peta/alur belajar per jalur
function learningPath(track) {
    const doneTkj = safeGetJSON('tjkt_lesson_done');
    const doneFo = safeGetJSON('tjkt_fo_done');
    const rows = track === 'fo'
        ? FO_TP.map((t, i) => ({ n:t.code, title:t.title, act:`foOpen('${t.id}')`, done:!!doneFo[t.id] || progress['fo_' + t.id] !== undefined }))
        : TKJ_ORDER.map(k => ({ n:E_GROUP[k], title:lessonTitles[k] || k, act:`showPage('${k}')`, done:!!doneTkj[k] || progress[k] !== undefined }));
    const doneCount = rows.filter(r => r.done).length;
    return `<div class="card learn-path-card">
        ${sectionHead('fa-route', track === 'fo' ? 'Alur Belajar 7 TP' : 'Alur Belajar 15 Topik', track === 'fo' ? 'sh-amber' : 'sh-blue')}
        <p class="fo-hint">Ikuti urutan ini agar materi saling menyambung. Tanda centang berarti sudah kamu tandai selesai atau asesmennya sudah dikerjakan.</p>
        <div class="learn-progress"><span style="width:${Math.round(doneCount / rows.length * 100)}%"></span></div>
        <p class="learn-progress-label">${doneCount} dari ${rows.length} langkah selesai</p>
        <ol class="learn-path">
            ${rows.map((r, i) => `<li class="${r.done ? 'done' : ''}">
                <button type="button" onclick="${r.act}">
                    <span class="lp-num">${r.done ? '<i class="fas fa-check"></i>' : i + 1}</span>
                    <span class="lp-title"><small>${r.n}</small>${r.title}</span>
                    <i class="fas fa-chevron-right lp-go"></i>
                </button></li>`).join('')}
        </ol>
    </div>`;
}

// ── SEARCH ────────────────────────────────────────────────
const searchIndex = [
    { label:'Beranda', page:'home', icon:'fa-home', group:'Halaman' },
    { label:'Capaian Pembelajaran', page:'intro', icon:'fa-graduation-cap', group:'Halaman' },
    { label:'Glosarium Istilah Jaringan', page:'glosarium', icon:'fa-book-open', group:'Halaman' },
    { label:'Glosarium Perangkat (Katalog Visual TKJ & FO)', page:'glosariumPerangkat', icon:'fa-server', group:'Halaman' },
    { label:'Materi Pengayaan (Pendalaman)', page:'pengayaan', icon:'fa-book-reader', group:'Materi Pengayaan' },
    { label:'Materi Pengayaan Fiber Optik', page:'fo-pengayaan', icon:'fa-book-reader', group:'Pengayaan Fiber Optik' },
    { label:'Beranda Fiber Optik — 7 TP Fase F', page:'fiberOptik', icon:'fa-bolt', group:'Fiber Optik' },
    { label:'Progress Belajar Saya', page:'progress', icon:'fa-chart-bar', group:'Halaman' },
    { label:'Topologi Jaringan', page:'topologi', icon:'fa-sitemap', group:'Materi TKJ' },
    { label:'Kebutuhan Teknis Jaringan', page:'kebutuhan', icon:'fa-clipboard-list', group:'Materi TKJ' },
    { label:'Peralatan Jaringan', page:'peralatan', icon:'fa-tools', group:'Materi TKJ' },
    { label:'IP Address, CIDR, VLSM, Subnetting', page:'ip', icon:'fa-hashtag', group:'Materi TKJ' },
    { label:'VLAN (Virtual LAN)', page:'vlan', icon:'fa-layer-group', group:'Materi TKJ' },
    { label:'Routing Statis dan Dinamis', page:'routing', icon:'fa-route', group:'Materi TKJ' },
    { label:'NAT dan Internet Gateway', page:'nat', icon:'fa-exchange-alt', group:'Materi TKJ' },
    { label:'Instalasi Jaringan Kabel', page:'kabel', icon:'fa-ethernet', group:'Materi TKJ' },
    { label:'Jaringan Nirkabel WiFi', page:'nirkabel', icon:'fa-wifi', group:'Materi TKJ' },
    { label:'Fiber Optic (Teori)', page:'fiber', icon:'fa-wave-square', group:'Fiber Optik' },
    { label:'Keamanan Jaringan', page:'keamanan', icon:'fa-shield-alt', group:'Materi TKJ' },
    { label:'Firewall dan ACL', page:'firewall', icon:'fa-fire-alt', group:'Materi TKJ' },
    { label:'Kriptografi', page:'kriptografi', icon:'fa-key', group:'Materi TKJ' },
    { label:'Sistem Operasi Jaringan Linux', page:'linux', icon:'fa-linux', group:'Materi TKJ' },
    { label:'Konfigurasi Server', page:'server', icon:'fa-server', group:'Materi TKJ' },
    { label:'Asesmen Topologi', assess:'topologi', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Kebutuhan Teknis', assess:'kebutuhan', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Peralatan', assess:'peralatan', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen IP & Subnetting', assess:'ip', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Jaringan Kabel', assess:'kabel', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Nirkabel', assess:'nirkabel', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen VLAN', assess:'vlan', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Routing', assess:'routing', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen NAT', assess:'nat', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Keamanan', assess:'keamanan', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Firewall', assess:'firewall', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Kriptografi', assess:'kriptografi', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Linux', assess:'linux', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Server', assess:'server', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen Fiber Optic (Teori)', assess:'fiber', icon:'fa-tasks', group:'Asesmen TKJ' },
    { label:'Asesmen TP 1.1 K3LH & APD', assess:'fo_tp11', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
    { label:'Asesmen TP 1.2 Instalasi & Penarikan', assess:'fo_tp12', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
    { label:'Asesmen TP 1.3 Konektor & Terminasi', assess:'fo_tp13', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
    { label:'Asesmen TP 2.1 Fusion Splicing', assess:'fo_tp21', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
    { label:'Asesmen TP 2.2 OPM & Redaman', assess:'fo_tp22', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
    { label:'Asesmen TP 2.3 OTDR & Trace', assess:'fo_tp23', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
    { label:'Asesmen TP 2.4 Laporan & Dokumentasi', assess:'fo_tp24', icon:'fa-tasks', group:'Asesmen Fiber Optik' },
];

let _searchCache = null;
function buildSearchIndex() {
    const out = searchIndex.slice();
    FO_TP.forEach(t => out.push({ label:`${t.code} — ${t.title}`, foTp:t.id, icon:t.icon, group:'Fiber Optik' }));
    Object.keys(lessonEnrichment).forEach(k => out.push({ label:`Pengayaan: ${lessonTitles[k] || k}`, enrich:k, icon:'fa-book-reader', group:'Materi Pengayaan' }));
    Object.keys(FO_ENRICHMENT).forEach(k => out.push({ label:`Pengayaan ${foLessonTitles[k] || k}`, foEnrich:k, icon:'fa-bolt', group:'Pengayaan Fiber Optik' }));
    glosariumData.forEach(([g, term]) => out.push({ label:term, page:'glosarium', icon:'fa-book-open', group:'Glosarium ' + g, term }));
    glosariumPerangkatData.forEach(d => out.push({ label:d.name, page:'glosariumPerangkat', icon:'fa-server', group:'Glosarium Perangkat · ' + d.cat }));
    return out;
}

function openQuickSearch() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('overlay');
    if (window.innerWidth < 860 && sb && !sb.classList.contains('open')) {
        sb.classList.add('open');
        if (ov) ov.classList.add('active');
    }
    const inp = document.getElementById('search-input');
    if (inp) {
        setTimeout(() => { inp.focus(); inp.select(); }, 80);
    }
}

function closeSearch() {
    const res = document.getElementById('search-results');
    const inp = document.getElementById('search-input');
    if (res) { res.classList.add('hidden'); res.innerHTML = ''; }
    if (inp) inp.value = '';
}
function runSearch(el) {
    const d = el.dataset;
    if (d.page) showPage(d.page);
    else if (d.fotp) foOpen(d.fotp);
    else if (d.enrich) showEnrichment(d.enrich);
    else if (d.foenrich) showFoEnrichment(d.foenrich);
    else if (d.assess) showAssessment(d.assess);
    closeSearch();
}
function searchMateri(val) {
    const res = document.getElementById('search-results');
    if (!res) return;
    const q = (val || '').trim().toLowerCase();
    if (!q) { res.classList.add('hidden'); res.innerHTML = ''; return; }
    if (!_searchCache) _searchCache = buildSearchIndex();
    const matches = _searchCache.filter(x => x.label.toLowerCase().includes(q) || (x.term && x.term.toLowerCase().includes(q)));
    const head = `<div class="sr-head"><span><i class="fas fa-search"></i> ${matches.length} hasil ditemukan</span><button type="button" class="sr-close" onclick="closeSearch()"><i class="fas fa-times"></i> Tutup</button></div>`;
    if (!matches.length) {
        res.innerHTML = head + '<div class="sr-empty"><i class="fas fa-search"></i> Tidak ditemukan. Coba kata kunci lain.</div>';
        res.classList.remove('hidden'); return;
    }
    const groups = {};
    matches.forEach(m => { (groups[m.group || 'Halaman'] = groups[m.group || 'Halaman'] || []).push(m); });
    let html = head;
    for (const [g, items] of Object.entries(groups)) {
        html += `<div class="sr-group-title">${g}</div>`;
        html += items.slice(0, 5).map(m => {
            const attrs = m.page ? `data-page="${m.page}"` : m.foTp ? `data-fotp="${m.foTp}"` : m.enrich ? `data-enrich="${m.enrich}"` : m.foEnrich ? `data-foenrich="${m.foEnrich}"` : `data-assess="${m.assess}"`;
            return `<div class="sr-item" role="option" tabindex="0" ${attrs}><i class="fas ${m.icon}"></i><span>${m.label}</span><i class="fas fa-arrow-right sr-go"></i></div>`;
        }).join('');
    }
    res.innerHTML = html;
    res.querySelectorAll('.sr-item').forEach(el => {
        el.addEventListener('click', () => runSearch(el));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runSearch(el); } });
    });
    res.classList.remove('hidden');
}
document.addEventListener('click', (e) => {
    const res = document.getElementById('search-results');
    if (!res || res.classList.contains('hidden')) return;
    if (e.target.closest('#search-results, .sidebar-search, #search-top-btn')) return;
    closeSearch();
});
function searchKey(e) {
    const res = document.getElementById('search-results');
    if (e.key === 'Escape') { closeSearch(); document.getElementById('search-input')?.blur(); }
    else if (e.key === 'Enter') { const first = res?.querySelector('.sr-item'); if (first) runSearch(first); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); res?.querySelector('.sr-item')?.focus(); }
}

// ── COMPONENT INIT ────────────────────────────────────────
// 🎬 CLAY MOTION: reveal on scroll, stagger, count-up, ripple
let _revealObs = null;
function initMotion() {
    const root = document.getElementById('content');
    if (!root) return;

    // 1) Stagger: nomor urut untuk animasi masuk berurutan
    const staggerSel = '#content > .crumb-bar,#content > .toc-card,#content > .card,#content > .hero-card,#content > .hero-banner,#content > .topic-banner,' +
        '#content > .portal-hero,#content > .portal-grid,#content > .util-grid,#content > .feat-card,#content > .quick-grid,#content > figure.illo,#content > .dense-box,#content > .callout,' +
        '#content > .section-head,#content > .quiz-hero,#content > .q-card,#content > .quiz-nav,#content > .acc-item,' +
        '#content > .tab-group,#content > .dev-grid,#content > .assess-grid,#content > .step-item,#content > .lesson-enrichment,#content > .sim-lab-card,#content > .learn-path-card';
    root.querySelectorAll(staggerSel).forEach((el, i) => {
        if (!el.style.getPropertyValue('--stagger')) el.style.setProperty('--stagger', Math.min(i, 12));
    });

    // 2) Reveal on scroll untuk elemen dalam kartu & grid perangkat
    if (_revealObs && typeof _revealObs.disconnect === 'function') _revealObs.disconnect();
    const canObs = typeof IntersectionObserver === 'function';
    if (canObs) {
        _revealObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) { e.target.classList.add('in'); _revealObs.unobserve(e.target); }
            });
        }, { threshold: 0.02, rootMargin: '0px 0px -2% 0px' });
    } else {
        _revealObs = null;
    }

    const revealTargets = [];
    root.querySelectorAll('.dense-box,.callout,figure.illo,.tab-group,.acc-item,.dev-grid,.table-wrap,.code-block,' +
        '.step-item,.tag-row,.lesson-enrichment,.topo-explorer,.tebak-wrap,.flash-deck,.ppt-gallery,.assess-grid,' +
        '.portal-card,.util-card,.module-card,.dev-gloss-card,.fo-fig,.sim-lab-card')
        .forEach((el, i) => {
            if (el.closest('.reveal')) return;
            el.classList.add('reveal');
            el.style.setProperty('--rd', (i % 5) * 45 + 'ms');
            const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
            const inView = !canObs || (rect && rect.top < (window.innerHeight || 900) * 1.12);
            if (inView) {
                revealTargets.push(el);
            } else if (_revealObs) {
                _revealObs.observe(el);
            }
        });

    if (revealTargets.length) {
        const flushInView = () => revealTargets.forEach(el => el.classList.add('in'));
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flushInView);
        else flushInView();
    }

    // 3) Count-up untuk angka statistik
    root.querySelectorAll('[data-count]').forEach(el => countUp(el));

    // 4) Ripple sekali pakai untuk semua tombol & kartu aksi
    root.querySelectorAll('button,.btn,.snav-item,.bnav-btn,.topbar-btn,.quick-card,.assess-card,.util-card,.portal-card,.module-card,.dg-chip,.hero-pill,.crumb-link').forEach(bindRipple);
}

// Count-up angka (dari 0 ke nilai)
function countUp(el) {
    const raw = el.getAttribute('data-count');
    const target = parseFloat(raw);
    if (isNaN(target)) return;
    const suffix = (el.textContent.match(/[^\d.,\s]+$/) || [''])[0];
    const dur = 900, t0 = performance.now();
    const isFloat = String(raw).includes('.');
    function step(t) {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = (isFloat ? v.toFixed(1) : Math.round(v).toLocaleString('id-ID')) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else { el.textContent = (isFloat ? target.toFixed(1) : Math.round(target).toLocaleString('id-ID')) + suffix; el.classList.add('counted'); }
    }
    requestAnimationFrame(step);
}

// Ripple saat klik
function bindRipple(el) {
    if (el._ripple) return;
    el._ripple = true;
    el.addEventListener('pointerdown', (ev) => {
        const rect = el.getBoundingClientRect();
        const d = Math.max(rect.width, rect.height);
        const dot = document.createElement('span');
        dot.className = 'ripple-dot';
        dot.style.width = dot.style.height = d + 'px';
        dot.style.left = (ev.clientX - rect.left - d / 2) + 'px';
        dot.style.top = (ev.clientY - rect.top - d / 2) + 'px';
        el.appendChild(dot);
        setTimeout(() => dot.remove(), 640);
    });
}

function initComponents() {
    // TABS
    document.querySelectorAll('.tab-list').forEach(list => {
        list.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.closest('.tab-group');
                group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                group.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const pane = document.getElementById(btn.dataset.tab);
                if (pane) pane.classList.add('active');
            });
        });
    });
    // ACCORDION
    document.querySelectorAll('.acc-header').forEach(h => {
        h.addEventListener('click', () => {
            const isOpen = h.classList.contains('open');
            const accordion = h.closest('.accordion');
            if (accordion) {
                accordion.querySelectorAll('.acc-header').forEach(x => { x.classList.remove('open'); x.nextElementSibling?.classList.remove('open'); });
            }
            if (!isOpen) { h.classList.add('open'); h.nextElementSibling?.classList.add('open'); }
        });
    });
    // FLIP CARDS
    document.querySelectorAll('.flip-card').forEach(c => {
        c.addEventListener('click', () => c.classList.toggle('flipped'));
    });
    // LIGHTBOX & MOTION
    initLightbox();
    initMotion();
}

// 🔍 GLASSMORPHISM IMAGE LIGHTBOX VIEWER
function openLightbox(src, title, caption, badges = '') {
    if (!src || typeof document === 'undefined' || !document.body) return;
    let lb = document.getElementById('tjkt-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'tjkt-lightbox';
        lb.className = 'tjkt-lightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.innerHTML = `<div class="tjkt-lb-dialog">
            <div class="tjkt-lb-top">
                <div class="tjkt-lb-meta"><span class="tjkt-lb-title" id="tjkt-lb-title"></span><span id="tjkt-lb-badges"></span></div>
                <button type="button" class="tjkt-lb-close" id="tjkt-lb-close" aria-label="Tutup pratinjau"><i class="fas fa-times"></i></button>
            </div>
            <div class="tjkt-lb-stage"><img id="tjkt-lb-img" src="" alt=""></div>
            <div class="tjkt-lb-caption" id="tjkt-lb-caption"></div>
        </div>`;
        document.body.appendChild(lb);
        lb.addEventListener('click', (e) => {
            if (e.target === lb || e.target.closest('#tjkt-lb-close')) closeLightbox();
        });
    }
    const img = document.getElementById('tjkt-lb-img');
    const ttl = document.getElementById('tjkt-lb-title');
    const bdg = document.getElementById('tjkt-lb-badges');
    const cap = document.getElementById('tjkt-lb-caption');
    if (img) { img.src = src; img.alt = title || 'Pratinjau gambar'; }
    if (ttl) ttl.textContent = title || 'Pratinjau Gambar';
    if (bdg) bdg.innerHTML = badges;
    if (cap) {
        cap.textContent = caption || '';
        cap.style.display = caption ? '' : 'none';
    }
    lb.classList.add('open');
}

function closeLightbox() {
    const lb = document.getElementById('tjkt-lightbox');
    if (lb) lb.classList.remove('open');
}

function initLightbox() {
    if (window._tjktLightboxBound) return;
    window._tjktLightboxBound = true;
    const root = document.getElementById('content');
    if (!root) return;
    root.addEventListener('click', (e) => {
        const img = e.target.closest('.dgc-img-wrap img, figure.illo img, .img-showcase img, .fo-shot img, .ppt-illo img, .sim-visual-frame img');
        if (!img) return;
        const cardEl = img.closest('.dev-gloss-card');
        let title = img.alt || 'Pratinjau Visual';
        let caption = '';
        let badges = '';
        if (cardEl) {
            title = cardEl.querySelector('.dgc-title')?.textContent?.trim() || title;
            caption = cardEl.querySelector('.dgc-desc')?.textContent?.trim() || '';
            const cat = cardEl.querySelector('.dgc-cat')?.textContent?.trim() || '';
            const layer = cardEl.querySelector('.dgc-layer')?.textContent?.trim() || '';
            badges = [cat ? `<span class="dgc-cat">${cat}</span>` : '', layer ? `<span class="dgc-layer">${layer}</span>` : ''].join(' ');
        } else {
            const fig = img.closest('figure, .fo-fig, .img-showcase, .ppt-illo');
            caption = fig?.querySelector('figcaption, .fo-cap, .cap')?.textContent?.trim() || '';
        }
        openLightbox(img.currentSrc || img.src, title, caption, badges);
    });
}

// ── HELPER: Build UI pieces ────────────────────────────────
function card(html, cls='') { return `<div class="card ${cls}">${html}</div>`; }
function sectionHead(icon, label, color='sh-blue') {
    return `<div class="section-head"><div class="sh-icon ${color}"><i class="fas ${icon}"></i></div>${label}</div>`;
}
function callout(type, icon, title, body) {
    return `<div class="callout ${type}"><div class="callout-icon"><i class="fas ${icon}"></i></div><div class="callout-body"><strong>${title}</strong><p>${body}</p></div></div>`;
}
function codeBlock(lang, code) {
    const escaped = code.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<div class="code-block"><div class="code-header"><div class="code-dots"><span></span><span></span><span></span></div><span class="code-lang">${lang}</span></div><div class="code-body">${escaped}</div></div>`;
}
function tbl(headers, rows) {
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function tag(text, color='blue') { return `<span class="tag ${color}">${text}</span>`; }
function tags(...items) { return `<div class="tag-row">${items.join('')}</div>`; }
function featCard(emoji, title, desc, onclick='') { return `<div class="feat-card" ${onclick?`onclick="${onclick}"`:''}><div class="fc-icon">${emoji}</div><h4>${title}</h4><p>${desc}</p></div>`; }
function stepItem(n, title, desc) { return `<li class="step-item"><div class="step-num">${n}</div><div class="step-body"><strong>${title}</strong><p>${desc}</p></div></li>`; }

// ── HELPER: Ilustrasi dari folder assets/ ──────────────────
function illo(file, caption = '', alt = '') {
    return `<figure class="illo"><img src="assets/${file}" alt="${alt || caption || file}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>`;
}

// ── HELPER: Materi padat (inti + istilah + tips ujian) ─────
function dense(title, points, terms = [], tips = []) {
    return `<div class="dense-box">
        <div class="dense-head"><i class="fas fa-brain"></i>${title}</div>
        <ul class="dense-list">${points.map(p => `<li>${p}</li>`).join('')}</ul>
        ${terms.length ? `<div class="dense-terms">${terms.map(([k, v]) => `<span class="dense-term"><strong>${k}</strong>${v}</span>`).join('')}</div>` : ''}
        ${tips.length ? `<div class="dense-tips">${tips.map(t => `<div class="dense-tip"><i class="fas fa-star"></i>${t}</div>`).join('')}</div>` : ''}
    </div>`;
}

// ── HELPER: Galeri gambar dari slide PPT (assets/ppt/) ─────
function pptIllo(file, caption = '', alt = '') {
    return `<figure class="illo"><img src="assets/ppt/${file}" alt="${alt || caption || file}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>`;
}
function pptGallery(items) {
    return `<div class="dev-grid">${items.map(([f, n, d]) => `
        <figure class="dev-card ppt-card">
            <img src="${f.includes('/') ? 'assets/' + f : 'assets/ppt/' + f}" alt="${n}" loading="lazy" decoding="async">
            <figcaption><strong>${n}</strong><span>${d || ''}</span></figcaption>
        </figure>`).join('')}</div>`;
}

// ── KOMPONEN INTERAKTIF: Penjelajah Topologi ───────────────
const topoData = {
    bus: {
        n: 'Bus', img: 'topologi-bus.png',
        d: 'Semua perangkat terhubung ke satu kabel backbone tunggal. Data mengalir dua arah dan didengar semua node.',
        plus: ['Murah & mudah dipasang', 'Tidak butuh perangkat pusat'],
        minus: ['Satu kabel putus = seluruh jaringan mati', 'Bottleneck saat ramai (collision)', 'Tidak skalabel']
    },
    star: {
        n: 'Star', img: 'topologi-star.png',
        d: 'Semua perangkat terhubung ke satu perangkat pusat (switch/hub). Data melewati perangkat pusat.',
        plus: ['Fault isolation baik — satu rusak tidak ganggu lain', 'Mudah dikelola & dikembangkan', 'Paling umum di LAN'],
        minus: ['Bergantung pada switch pusat', 'Butuh lebih banyak kabel']
    },
    ring: {
        n: 'Ring', img: 'topologi-ring.jpg',
        d: 'Perangkat terhubung membentuk cincin tertutup; data mengalir satu arah dari node ke node berikutnya.',
        plus: ['Performa stabil saat trafik merata', 'Tidak butuh perangkat pusat'],
        minus: ['Satu titik putus dapat melumpuhkan cincin', 'Sulit dirawat & ditambah node']
    },
    mesh: {
        n: 'Mesh', img: 'topologi-mesh.png',
        d: 'Setiap perangkat terhubung ke beberapa (atau semua) perangkat lain sehingga tersedia banyak jalur alternatif.',
        plus: ['Sangat andal — banyak jalur redundan', 'Tidak ada single point of failure'],
        minus: ['Mahal (banyak kabel/port)', 'Kompleks dipasang & dirawat']
    },
    tree: {
        n: 'Tree', img: 'topologi-tree.png',
        d: 'Struktur hierarki berlapis: perangkat level atas menghubungkan beberapa segmen di bawahnya.',
        plus: ['Skalabel untuk jaringan besar', 'Mudah dikelola per cabang'],
        minus: ['Ketergantungan pada level atas', 'Tidak seandal mesh']
    }
};
function topoExplorer() {
    const first = 'bus';
    return `<div class="topo-explorer">
        <div class="topo-tabs">
            ${Object.entries(topoData).map(([k, v]) => `<button class="topo-tab${k === first ? ' active' : ''}" onclick="setTopo('${k}')">${v.n}</button>`).join('')}
        </div>
        <div id="topo-stage" class="topo-stage">
            ${topoStage(first)}
        </div>
    </div>`;
}
function topoStage(k) {
    const t = topoData[k];
    return `<img class="topo-img" src="assets/ppt/${t.img}" alt="Diagram topologi ${t.n}" loading="lazy">
        <div class="topo-info">
            <h4>Topologi ${t.n}</h4>
            <p>${t.d}</p>
            <div class="topo-cols">
                <div class="topo-good"><strong><i class="fas fa-check-circle"></i> Kelebihan</strong><ul>${t.plus.map(x => `<li>${x}</li>`).join('')}</ul></div>
                <div class="topo-bad"><strong><i class="fas fa-times-circle"></i> Kekurangan</strong><ul>${t.minus.map(x => `<li>${x}</li>`).join('')}</ul></div>
            </div>
        </div>`;
}
function setTopo(k) {
    document.querySelectorAll('.topo-tab').forEach(b => b.classList.toggle('active', b.textContent.trim() === topoData[k].n));
    const stage = document.getElementById('topo-stage');
    if (stage) { stage.innerHTML = topoStage(k); stage.classList.remove('fade-in'); void stage.offsetWidth; stage.classList.add('fade-in'); }
}

// ── KOMPONEN INTERAKTIF: Tebak Perangkat ───────────────────
const tebakData = [
    { img: 'perangkat-router-mikrotik.jpg', ans: 'Router', opts: ['Router', 'Switch', 'Hub', 'Access Point'] },
    { img: 'perangkat-switch-dlink.jpg', ans: 'Switch', opts: ['Router', 'Switch', 'Modem', 'Firewall'] },
    { img: 'perangkat-router-tplink.jpg', ans: 'Router', opts: ['Switch', 'Access Point', 'Router', 'Repeater'] },
    { img: 'perangkat-nic-kartu.jpg', ans: 'NIC', opts: ['NIC', 'RAM', 'CPU', 'Power Supply'] },
    { img: 'kabel-t568.jpeg', ans: 'Kabel UTP', opts: ['Kabel Coaxial', 'Kabel UTP', 'Fiber Optic', 'Kabel Listrik'] },
    { img: 'kabel-koaksial-jenis.jpeg', ans: 'Kabel Coaxial', opts: ['Kabel UTP', 'Kabel Coaxial', 'Fiber Optic', 'Kabel Telepon'] },
    { img: 'perangkat-switch-stack.png', ans: 'Switch', opts: ['Server', 'Switch', 'Router', 'Hub'] },
    { img: 'perangkat-router-juniper.png', ans: 'Router', opts: ['Switch', 'Firewall', 'Router', 'Server'] }
];
let tebakState = { order: [], idx: 0, score: 0, answered: false, chosen: -1 };
function tebakPerangkat() {
    tebakState = { order: shuffle([...tebakData]).slice(0, 6), idx: 0, score: 0, answered: false, chosen: -1 };
    return `<div class="tebak-wrap" id="tebak-wrap">${tebakRender()}</div>`;
}
function tebakRender() {
    const s = tebakState;
    if (s.idx >= s.order.length) {
        const pct = Math.round((s.score / s.order.length) * 100);
        return `<div class="tebak-done">
            <div class="tebak-score">${s.score} / ${s.order.length}</div>
            <p>${pct === 100 ? 'Sempurna! Kamu hafal semua perangkat 🏆' : pct >= 60 ? 'Bagus! Terus latih pengenalan perangkat 👍' : 'Belajar lagi yuk — kenali bentuk fisik perangkat 📚'}</p>
            <button class="btn-primary" onclick="document.getElementById('tebak-wrap').innerHTML=''+tebakPerangkat()"><i class="fas fa-redo"></i> Main Lagi</button>
        </div>`;
    }
    const q = s.order[s.idx];
    return `<div class="tebak-head"><span>Soal ${s.idx + 1} / ${s.order.length}</span><span class="tebak-num">✅ ${s.score}</span></div>
        <img class="tebak-img" src="assets/ppt/${q.img}" alt="Tebak perangkat">
        <p class="tebak-q">Perangkat pada gambar adalah...</p>
        <div class="tebak-opts">
            ${q.opts.map((o, i) => {
                let cls = '';
                if (s.answered) {
                    if (o === q.ans) cls = ' correct';
                    else if (i === s.chosen) cls = ' wrong';
                }
                return `<button class="tebak-opt${cls}" onclick="tebakAnswer(${i})" ${s.answered ? 'disabled' : ''}>${o}</button>`;
            }).join('')}
        </div>
        ${s.answered ? `<button class="btn-primary" style="margin-top:12px" onclick="tebakNext()">${s.idx + 1 < s.order.length ? 'Lanjut' : 'Lihat Skor'} <i class="fas fa-arrow-right"></i></button>` : ''}`;
}
function tebakAnswer(i) {
    const s = tebakState;
    if (s.answered) return;
    const q = s.order[s.idx];
    s.answered = true; s.chosen = i;
    if (q.opts[i] === q.ans) s.score++;
    document.getElementById('tebak-wrap').innerHTML = tebakRender();
}
function tebakNext() {
    tebakState.idx++; tebakState.answered = false; tebakState.chosen = -1;
    document.getElementById('tebak-wrap').innerHTML = tebakRender();
}

// ── KOMPONEN INTERAKTIF: Flashcard Glosarium ───────────────
let flashState = { deck: [], idx: 0, flipped: false };
function flashcardDeck() {
    flashState = { deck: shuffle([...glosariumData]).slice(0, 12), idx: 0, flipped: false };
    return `<div id="flash-wrap">${flashRender()}</div>`;
}
function flashRender() {
    const s = flashState;
    if (s.idx >= s.deck.length) {
        return `<div class="flash-done"><i class="fas fa-trophy"></i><p>Selesai! Kamu sudah meninjau ${s.deck.length} istilah.</p>
            <button class="btn-primary" onclick="document.getElementById('flash-wrap').innerHTML=flashcardDeck()">Ulangi</button></div>`;
    }
    const [g, term, def] = s.deck[s.idx];
    return `<div class="flash-top"><span>Kartu ${s.idx + 1} / ${s.deck.length}</span><span class="flash-cat">${g}</span></div>
        <div class="flash-card ${s.flipped ? 'flipped' : ''}" onclick="flashFlip()" role="button" tabindex="0" aria-label="Kartu istilah ${term} — ketuk untuk melihat arti" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();flashFlip()}">
            <div class="flash-inner">
                <div class="flash-face flash-front"><span class="flash-term">${term}</span><small>Ketuk untuk melihat arti</small></div>
                <div class="flash-face flash-back"><span class="flash-def">${def}</span></div>
            </div>
        </div>
        <div class="flash-actions">
            <button class="btn-ghost" onclick="flashPrev()" ${s.idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-left"></i> Sebelumnya</button>
            <button class="btn-primary" onclick="flashNext()">${s.idx + 1 < s.deck.length ? 'Berikutnya' : 'Selesai'} <i class="fas fa-arrow-right"></i></button>
        </div>`;
}
function flashFlip() {
    flashState.flipped = !flashState.flipped;
    const el = document.querySelector('.flash-card'); if (el) el.classList.toggle('flipped', flashState.flipped);
}
function flashNext() { flashState.idx++; flashState.flipped = false; document.getElementById('flash-wrap').innerHTML = flashRender(); }
function flashPrev() { if (flashState.idx > 0) { flashState.idx--; flashState.flipped = false; document.getElementById('flash-wrap').innerHTML = flashRender(); } }


let toastTimer;
function toast(msg, ms = 2600) {
    let el = document.getElementById('app-toast');
    if (!el) { el = document.createElement('div'); el.id = 'app-toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ── TEMA TERANG / GELAP (clay) ─────────────────────────────
function applyTheme(t, persist = false) {
    document.documentElement.setAttribute('data-theme', t);
    if (persist) { try { localStorage.setItem('tjkt_theme', t); } catch (e) {} }
    const ic = document.querySelector('#theme-btn i');
    if (ic) ic.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0e1628' : '#2563eb');
}
function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
    toast(next === 'dark' ? 'Mode gelap aktif 🌙' : 'Mode terang aktif ☀️');
}

// ── PASANG APLIKASI (PWA install) ──────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-btn')?.classList.remove('hidden');
});
async function installApp() {
    if (!deferredPrompt) { toast('Buka menu browser → "Tambahkan ke layar utama"'); return; }
    deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    toast(res.outcome === 'accepted' ? 'Aplikasi berhasil dipasang! 🎉' : 'Pemasangan dibatalkan');
    deferredPrompt = null;
    document.getElementById('install-btn')?.classList.add('hidden');
}
window.addEventListener('appinstalled', () => {
    toast('Aplikasi terpasang di perangkatmu 🎉');
    document.getElementById('install-btn')?.classList.add('hidden');
});

// ── SIMULASI VISUAL & LAB PRAKTIK INTERAKTIF IN-APP (PENGGANTI VIDEO EKSTERNAL) ────
const LESSON_SIMULATIONS = {
    intro: {
        title: 'Simulasi Alur Enkapsulasi Paket Data (Model OSI 7 Layer & TCP/IP)',
        mode: 'Packet Tracer Inspector',
        steps: [
            {
                badge: 'Tahap 1 · Application–Transport (L7–L4)',
                title: 'Pembentukan Request HTTP/HTTPS & Segmen TCP',
                img: 'assets/packet-journey.svg',
                desc: 'Browser klien membentuk permintaan HTTPS (Layer 7), mengenkripsi payload melalui TLS (Layer 6), membuka sesi komunikasi (Layer 5), lalu memecah data menjadi Segmen TCP dengan Source Port Ephemeral (misal 51422) dan Destination Port 443.',
                term: '[OSI L7-L4 ENCAPSULATION]\nApp Protocol : HTTPS (GET /index.html HTTP/2)\nTransport    : TCP Segment | SrcPort: 51422 -> DstPort: 443\nFlags        : [SYN, ACK] Seq=1 Ack=1 Win=65535\nPDU Status   : DATA -> SEGMENT (Siap diteruskan ke Layer 3)'
            },
            {
                badge: 'Tahap 2 · Network Layer (L3)',
                title: 'Penambahan Header IPv4 & Penentuan Next-Hop Gateway',
                img: 'assets/peta-jaringan-scope.svg',
                desc: 'Layer 3 membungkus Segmen TCP menjadi Paket IP dengan menyematkan Source IP (192.168.10.25) dan Destination IP server. Karena tujuan berada di jaringan berbeda, host mengarahkan paket ke Default Gateway.',
                term: '[OSI L3 IP PACKET HEADER]\nSrc IP       : 192.168.10.25/24 (Host LAN)\nDst IP       : 203.0.113.80     (Web Server)\nTTL          : 64 | Protocol: 0x06 (TCP)\nRoute Lookup : Destination luar subnet -> Next-Hop 192.168.10.1'
            },
            {
                badge: 'Tahap 3 · Data Link & Physical (L2–L1)',
                title: 'Framing Ethernet 802.3 & Transmisi Bit ke Media Fisik',
                img: 'assets/server-client-services.svg',
                desc: 'NIC membungkus Paket IP menjadi Frame Ethernet dengan Source MAC milik PC dan Destination MAC milik interface Router Gateway (hasil resolusi ARP), ditambah FCS/CRC-32 di bagian ekor, lalu dikirim sebagai sinyal listrik/cahaya di Layer 1.',
                term: '[OSI L2-L1 ETHERNET II FRAME]\nSrc MAC      : 00:1A:2B:3C:4D:5E (NIC Client)\nDst MAC      : C4:AD:34:11:22:33 (Router Gateway ether2)\nEtherType    : 0x0800 (IPv4) | Trailer: FCS CRC-32 [VALID]\nPhysical L1  : 1000BASE-T / 1000BASE-LX Bitstream -> TRANSMITTED'
            }
        ]
    },
    topologi: {
        title: 'Simulasi Desain & Isolasi Gangguan Topologi Jaringan',
        mode: 'Network Topology Simulator',
        steps: [
            {
                badge: 'Tahap 1 · Access Layer (Star)',
                title: 'Topologi Star pada Ruang Laboratorium / Divisi',
                img: 'assets/ppt/topologi-star.png',
                desc: 'Seluruh PC klien dihubungkan secara point-to-point ke Access Switch pusat. Jika satu kabel drop ke PC-04 terputus, hanya PC-04 yang offline sementara seluruh host lain tetap beroperasi normal (fault isolation tinggi).',
                term: 'SW-ACCESS-LAB1# show interfaces status\nPort      Name        Status       Vlan  Duplex  Speed   Type\nGi0/1     PC-01       connected    10    a-full  a-1000  10/100/1000BaseTX\nGi0/2     PC-02       connected    10    a-full  a-1000  10/100/1000BaseTX\nGi0/4     PC-04       notconnect   10    auto    auto    [LINK DOWN - ISOLATED]'
            },
            {
                badge: 'Tahap 2 · Distribution Layer (Extended Star / Tree)',
                title: 'Agregasi Antar-Lantai dengan Topologi Tree Hierarkis',
                img: 'assets/topologi-tree-hybrid.svg',
                desc: 'Beberapa Access Switch dari tiap lantai dihubungkan melalui uplink Gigabit/SFP menuju Distribution Switch menggunakan arsitektur hierarkis 3-Tier (Core, Distribution, Access) agar mudah diskalakan.',
                term: 'SW-DIST-CORE# show spanning-tree summary\nSwitch is in rapid-pvst mode (IEEE 802.1w RSTP)\nRoot Bridge for: VLAN0010, VLAN0020, VLAN0099\nUplink Trunks  : Gi0/23 (SW-LAB1 UP), Gi0/24 (SW-LAB2 UP)'
            },
            {
                badge: 'Tahap 3 · Core Redundancy (Partial/Full Mesh)',
                title: 'Redundansi Jalur Core dengan Topologi Mesh',
                img: 'assets/ppt/topologi-mesh.png',
                desc: 'Antar-router inti dan switch distribusi dipasangi jalur ganda (redundant link) berbentuk Mesh dengan jumlah link n(n-1)/2 sehingga ketiadaan satu link backbone langsung dialihkan otomatis tanpa downtime.',
                term: '[CORE HIGH-AVAILABILITY STATUS]\nNodes (n)      : 4 Core Routers -> Full Mesh Links = 4(3)/2 = 6 Links\nPrimary Path   : R1 <-> R2 (10G SFP+ Active, Cost=1)\nFailover Test  : Link R1-R2 Cut -> Traffic rerouted via R1-R3-R2 in <50ms'
            }
        ]
    },
    kebutuhan: {
        title: 'Simulasi Perencanaan Kapasitas Bandwidth & Skala Jaringan',
        mode: 'Network Capacity Planner',
        steps: [
            {
                badge: 'Tahap 1 · Audit Kebutuhan Pengguna',
                title: 'Inventarisasi Jumlah Host & Profil Aplikasi',
                img: 'assets/analisis-kebutuhan.svg',
                desc: 'Langkah pertama analisis kebutuhan teknis adalah menghitung jumlah perangkat aktif (PC Lab, Laptop Guru, Smartphone Siswa, CCTV IP, Server) beserta kebutuhan throughput per aplikasi.',
                term: '[SITE SURVEY & USER AUDIT - SMKN 1]\n- Lab TJKT (40 PC Praktik)   : 40 x 2 Mbps  =  80 Mbps\n- R. Guru & TU (30 Perangkat): 30 x 3 Mbps  =  90 Mbps\n- Hotspot Siswa (150 User)   : 150 x 1 Mbps = 150 Mbps (Concurrency 40%)\n- Margin Pertumbuhan (+30%)  : Rekomendasi Uplink ISP >= 300 Mbps Dedicated'
            },
            {
                badge: 'Tahap 2 · Pemilihan Spesifikasi Hardware',
                title: 'Menentukan Spesifikasi Router, Switch PoE & Access Point',
                img: 'assets/peta-jaringan-scope.svg',
                desc: 'Berdasarkan beban >200 klien aktif bersamaan dan kebutuhan VLAN/Firewall, dipilih Router berprosesor multi-core dengan throughput PPS memadai, Managed Switch Gigabit + PoE+ (802.3at), dan Access Point Dual-Band MU-MIMO.',
                term: '[BILL OF MATERIALS (BoM) REKOMENDASI]\n1. Core Router  : MikroTik CCR2004 / RB5009 (Throughput > 3 Gbps, SFP+ 10G)\n2. Dist Switch  : Managed L2/L3 24-Port GbE + 4x SFP+ + PoE Budget 370W\n3. Access Point : Ceiling Dual-Band Wi-Fi 6 (802.11ax) 1 AP per 35-45 User'
            },
            {
                badge: 'Tahap 3 · Penetapan SLA & QoS',
                title: 'Manajemen Bandwidth (QoS Queue) & Target Ketersediaan',
                img: 'assets/server-client-services.svg',
                desc: 'Agar trafik ujian CBT dan administrasi sekolah tidak terganggu oleh unduhan besar di hotspot, diterapkan pembagian prioritas trafik (QoS) dengan jaminan CIR (Committed Information Rate).',
                term: '/queue simple\nadd name="1-CBT-dan-Server" target=192.168.10.0/24 limit-at=100M/100M max-limit=250M/250M priority=1/1\nadd name="2-Guru-Staf"      target=192.168.20.0/24 limit-at=80M/80M   max-limit=150M/150M priority=3/3\nadd name="3-Hotspot-Siswa"  target=192.168.50.0/23 limit-at=50M/50M   max-limit=120M/120M priority=8/8'
            }
        ]
    },
    peralatan: {
        title: 'Simulasi Cara Kerja Switch (L2) vs Router (L3) & Access Point',
        mode: 'Hardware Packet Inspector',
        steps: [
            {
                badge: 'Tahap 1 · Layer 2 Switching',
                title: 'Pembelajaran Tabel CAM (MAC Address Table) pada Switch',
                img: 'assets/devices/switch.jpg',
                desc: 'Saat PC mengirim frame ke Switch, ASIC Switch mencatat Source MAC dan port masuknya ke dalam MAC Address Table. Frame berikutnya yang ditujukan ke MAC tersebut langsung diteruskan secara unicast ke port tujuan tanpa membanjiri port lain.',
                term: 'SW-CORE# show mac address-table dynamic\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n  10    001a.2b3c.4d01    DYNAMIC     Gi0/1  (PC-Lab-01)\n  10    001a.2b3c.4d02    DYNAMIC     Gi0/2  (PC-Lab-02)\n  10    c4ad.3411.2233    DYNAMIC     Gi0/24 (Uplink Router)'
            },
            {
                badge: 'Tahap 2 · Layer 3 Routing',
                title: 'Keputusan Forwarding Antar-Subnet pada Router',
                img: 'assets/devices/router.jpg',
                desc: 'Router memisahkan Broadcast Domain. Ketika paket datang menuju subnet lain, Router melepas header Ethernet L2 lama, memeriksa Routing Table L3, mengurangi TTL sebanyak 1, dan membungkus ulang paket dengan MAC Address next-hop baru.',
                term: '[admin@R-GATEWAY] > /ip route print detail\nFlags: D - dynamic, A - active, C - connected, S - static\n 0 A S  dst-address=0.0.0.0/0       gateway=203.0.113.1   distance=1\n 1 ADC  dst-address=192.168.10.0/24 gateway=ether2-LAN1   pref-src=192.168.10.1\n 2 ADC  dst-address=192.168.20.0/24 gateway=ether3-LAN2   pref-src=192.168.20.1'
            },
            {
                badge: 'Tahap 3 · Wireless Bridging',
                title: 'Integrasi Access Point ke Jaringan Kabel via PoE',
                img: 'assets/server-client-services.svg',
                desc: 'Access Point Enterprise menerima daya listrik dan data sekaligus lewat satu kabel UTP melalui teknologi Power over Ethernet (IEEE 802.3af/at), lalu menjembatani frame 802.11 Wi-Fi ke VLAN Ethernet yang sesuai.',
                term: 'SW-POE# show power inline Gi0/10\nInterface  Admin  Oper       Power(W)  Device              Class\n---------  -----  ---------  --------  ------------------  -----\nGi0/10     auto   on         12.4      UniFi-U6-Pro-AP     4 (802.3at PoE+)'
            }
        ]
    },
    ip: {
        title: 'Simulasi Perhitungan Subnetting CIDR & Alokasi Blok VLSM',
        mode: 'IPv4 CIDR & VLSM Engine',
        steps: [
            {
                badge: 'Tahap 1 · Dekomposisi Biner 32-Bit',
                title: 'Membedah Prefix /26 (255.255.255.192)',
                img: 'assets/ppt/ipv4-struktur.png',
                desc: 'Prefix /26 berarti 26 bit bernilai 1 untuk porsi Network (8+8+8+2) dan sisa 6 bit bernilai 0 untuk porsi Host (32 - 26 = 6). Dua bit network pada oktet ke-4 menghasilkan nilai 128 + 64 = 192.',
                term: 'IP Input     : 192.168.10.25 / 26\nBinary Mask  : 11111111.11111111.11111111.11000000\nDecimal Mask : 255.255.255.192\nNetwork Bits : 26 bit | Host Bits (h) : 6 bit'
            },
            {
                badge: 'Tahap 2 · Block Size & Rentang Host',
                title: 'Menghitung Jumlah Subnet, Usable Host & Broadcast',
                img: 'assets/subnetting-flow.svg',
                desc: 'Dengan sisa 6 bit host: kapasitas alamat total per blok adalah 2^6 = 64 alamat (Block Size = 256 - 192 = 64), sedangkan jumlah host yang dapat dipasang ke perangkat adalah 2^6 - 2 = 62 host.',
                term: 'Block Size   : 256 - 192 = 64 (Kelipatan blok: .0, .64, .128, .192)\nNetwork ID   : 192.168.10.0/26   (Alamat pertama blok)\nFirst Host   : 192.168.10.1      (Biasa dipakai untuk Gateway)\nLast Host    : 192.168.10.62\nBroadcast ID : 192.168.10.63     (Alamat sebelum blok .64 berikutnya)'
            },
            {
                badge: 'Tahap 3 · Optimasi VLSM',
                title: 'Mengurutkan Alokasi VLSM dari Kebutuhan Terbesar ke Terkecil',
                img: 'assets/subnetting-flow.svg',
                desc: 'Pada VLSM, blok alamat selalu dialokasikan mulai dari divisi dengan jumlah host terbesar terlebih dahulu agar tidak terjadi tumpang-tindih (overlapping prefix), diakhiri link point-to-point antar-router dengan /30.',
                term: '[ALOKASI VLSM DARI INDUK 192.168.10.0/24]\n1. Lab Siswa (50 Host)  -> /26 (62 host) : 192.168.10.0/26   (.1 - .62,   BC .63)\n2. R. Guru   (25 Host)  -> /27 (30 host) : 192.168.10.64/27  (.65 - .94,  BC .95)\n3. Server    (10 Host)  -> /28 (14 host) : 192.168.10.96/28  (.97 - .110, BC .111)\n4. Link WAN  (2 Router) -> /30 (2 host)  : 192.168.10.112/30 (.113 - .114,BC .115)'
            }
        ]
    },
    kabel: {
        title: 'Simulasi Terminasi Kabel UTP T568B & Sertifikasi Gigabit/PoE',
        mode: 'ANSI/TIA-568.2-D Cable Tester',
        steps: [
            {
                badge: 'Tahap 1 · Konstruksi & Kategori Kabel',
                title: 'Memilih Kategori Kabel & Pelindung EMI (U/UTP vs F/UTP)',
                img: 'assets/ppt/kabel-utp-ftp-stp.jpeg',
                desc: 'Gunakan minimal Cat6 (250 MHz) untuk instalasi baru Gigabit/10G jarak pendek. Pilinan tiap pasang kawat (twisted pair) dengan kerapatan berbeda berfungsi saling meniadakan medan elektromagnetik penyebab NEXT/FEXT crosstalk.',
                term: '[SPESIFIKASI KABEL TEMBAGA TIA-568.2-D]\nKategori     : Cat6 U/UTP Pure Bare Copper 23 AWG\nPanjang Maks : 90m Permanent Link + 10m Patch Cord = 100 Meter\nSeparasi     : Jauhkan >= 15-30 cm dari kabel listrik AC tegangan tinggi'
            },
            {
                badge: 'Tahap 2 · Susunan Pinout T568B',
                title: 'Pengupasan Jaket, Penataan 8 Urutan Warna & Crimping RJ-45',
                img: 'assets/ppt/kabel-t568-gigabit-poe.svg',
                desc: 'Kupas jaket luar ±1,5 cm tanpa melukai isolasi kawat, urutkan rata sesuai standar T568B (Putih-Oranye, Oranye, Putih-Hijau, Biru, Putih-Biru, Hijau, Putih-Cokelat, Cokelat), potong rata ±1,2 cm, dan masukkan hingga jaket terjepit strain-relief RJ-45.',
                term: '[URUTAN PIN RJ-45 STANDAR T568B (KIRI KE KANAN, KLIP DI BAWAH)]\nPin 1: Putih-Oranye (Tx+/BI_DA+) | Pin 5: Putih-Biru    (BI_DC-)\nPin 2: Oranye       (Tx-/BI_DA-) | Pin 6: Hijau         (Rx-/BI_DB-)\nPin 3: Putih-Hijau  (Rx+/BI_DB+) | Pin 7: Putih-Cokelat (BI_DD+)\nPin 4: Biru         (BI_DC+)     | Pin 8: Cokelat       (BI_DD-)'
            },
            {
                badge: 'Tahap 3 · Pengujian Wiremap & PoE',
                title: 'Verifikasi Kontinuitas 8 Pin pada LAN Cable Certifier',
                img: 'assets/kabel-utp-pairing.svg',
                desc: 'Gigabit Ethernet (1000BASE-T) dan PoE menggunakan KEEMPAT pasang kawat ( seluruh 8 pin) secara simultan dua arah. Jika satu pin saja putus (misal pin 7 atau 8), kecepatan langsung jatuh ke 100 Mbps (Fast Ethernet) dan PoE gagal bekerja.',
                term: '[CABLE VERIFIER RESULT - T568B STRAIGHT-THROUGH]\nMain Unit   : 1 - 2 - 3 - 4 - 5 - 6 - 7 - 8\nRemote Unit : 1 - 2 - 3 - 4 - 5 - 6 - 7 - 8\nWiremap     : PASS (No Open, No Short, No Split Pair)\nLink Speed  : 1000BASE-T Full-Duplex + IEEE 802.3at PoE+ Ready'
            }
        ]
    },
    nirkabel: {
        title: 'Simulasi Site Survey, Kanal Non-Overlapping & Link Budget Wi-Fi',
        mode: 'RF Wireless Analyzer',
        steps: [
            {
                badge: 'Tahap 1 · Perencanaan Kanal RF',
                title: 'Penataan Kanal 2.4 GHz (1, 6, 11) & 5 GHz (UNII Band)',
                img: 'assets/wifi-channel.svg',
                desc: 'Pada pita 2.4 GHz, hanya kanal 1, 6, dan 11 (lebar 20 MHz) yang tidak saling tumpang-tindih. Untuk roaming antar-ruangan yang mulus, pasang beberapa Access Point dengan SSID & keamanan identik namun kanal berbeda secara berselang-seling.',
                term: '[MULTI-AP ROAMING CHANNEL PLAN]\nAP-Lantai1-Timur : SSID="SMKN1-WIFI" | Band=2.4GHz Ch 1 (2412 MHz) | 5GHz Ch 36\nAP-Lantai1-Tengah: SSID="SMKN1-WIFI" | Band=2.4GHz Ch 6 (2437 MHz) | 5GHz Ch 44\nAP-Lantai1-Barat : SSID="SMKN1-WIFI" | Band=2.4GHz Ch 11(2462 MHz) | 5GHz Ch 149'
            },
            {
                badge: 'Tahap 2 · Link Outdoor & Zona Fresnel',
                title: 'Perhitungan Clearance Zona Fresnel & Link Budget PtP',
                img: 'assets/ppt/wifi-ptp-ptmp-fresnel.svg',
                desc: 'Untuk link wireless outdoor Point-to-Point antar-gedung, garis pandang (Line of Sight) saja tidak cukup: minimal 60% radius Zona Fresnel pertama harus bebas dari halangan pohon atau atap bangunan agar sinyal tidak teredam difraksi.',
                term: '[OUTDOOR PtP 5.8 GHz LINK BUDGET]\nTx Power (20 dBm) + Antena Tx (23 dBi) - Cable Loss (1 dB) = EIRP 42 dBm\nFree Space Path Loss (2 km @ 5.8 GHz)                      = -113.7 dB\nRx Signal = 42 - 113.7 + Antena Rx (23 dBi) - Loss (1 dB)  = -49.7 dBm [EXCELLENT]'
            },
            {
                badge: 'Tahap 3 · Hardening Keamanan WLAN',
                title: 'Konfigurasi WPA2-AES / WPA3-SAE & Evaluasi RSSI/SNR',
                img: 'assets/ppt/wifi-ptp-ptmp-fresnel.svg',
                desc: 'Nonaktifkan protokol usang WEP dan WPA-TKIP serta WPS. Gunakan enkripsi WPA2-PSK (AES-CCMP) atau WPA3-SAE, dan pastikan di area kerja klien sinyal terima (RSSI) berada di atas -65 dBm dengan SNR >= 25 dB.',
                term: '/interface wifi security\nadd name=sec-sekolah authentication-types=wpa2-psk,wpa3-psk encryption=ccmp \\\n    passphrase="Smkn1KuantanMudik#2026" wps=disable\n[SITE SURVEY VERIFICATION]\nMeasured RSSI: -54 dBm | Noise Floor: -92 dBm -> SNR = 38 dB (Target >= 25 dB PASS)'
            }
        ]
    },
    fiber: {
        title: 'Simulasi Transmisi Cahaya Serat Optik & Arsitektur FTTH GPON',
        mode: 'Optical Network Simulator',
        steps: [
            {
                badge: 'Tahap 1 · Prinsip Fisika Optik',
                title: 'Total Internal Reflection (TIR) pada Core & Cladding',
                img: 'assets/fo/fig-fiber-tir-cutaway.svg',
                desc: 'Sinar laser merambat di dalam Core silika (n1 ≈ 1,48) yang diselubungi Cladding (n2 ≈ 1,46). Karena n1 > n2 dan sudut datang sinar melebihi sudut kritis, cahaya dipantulkan 100% secara zig-zag lurus di sepanjang serat.',
                term: '[PARAMETER SERAT OPTIK ITU-T G.652.D / G.657.A2]\nCore / Cladding : 9 um / 125 um (Single-Mode Fiber)\nCoating Primer  : 250 um Akrilat\nAtenuasi Maks   : <= 0.35 dB/km @ 1310 nm | <= 0.22 dB/km @ 1550 nm'
            },
            {
                badge: 'Tahap 2 · Topologi ODN FTTH',
                title: 'Alur Distribusi OLT -> ODF -> ODC -> ODP -> ONT',
                img: 'assets/fo/fig-ftth-branching-map.svg',
                desc: 'Pada jaringan GPON (ITU-T G.984), sinyal optik dari port PON OLT dibagi secara pasif menggunakan PLC Splitter (misal 1:4 di ODC dan 1:8 di ODP, total rasio 1:32) hingga sampai ke modem ONT di rumah pelanggan.',
                term: '[GPON WAVELENGTH MULTIPLEXING (WDM)]\nDownstream (OLT -> ONT) : Lambda 1490 nm (2.488 Gbps Broadcast Encrypted)\nUpstream   (ONT -> OLT) : Lambda 1310 nm (1.244 Gbps TDMA Burst)\nRF Video Overlay        : Lambda 1550 nm'
            },
            {
                badge: 'Tahap 3 · Link Power Budget',
                title: 'Kalkulasi Daya Terima (Rx Power) di Sisi Pelanggan',
                img: 'assets/fo/fig-otdr-trace-pro.svg',
                desc: 'Daya pancar SFP+ OLT Class B+ (+3 dBm) dikurangi redaman kabel, konektor, fusion splice, dan splitter 1:32 (~16,5 dB) harus menghasilkan daya terima di ONT dalam rentang aman -8 dBm s/d -24 dBm.',
                term: '[KALKULASI LINK POWER BUDGET FTTH 5 KM]\nTx Power OLT SFP B+          : +3.00 dBm\nLoss Kabel (5 km x 0.35 dB)  : -1.75 dB\nLoss 4 Konektor + 6 Splice   : -2.60 dB\nLoss Splitter 1:4 + 1:8      : -16.80 dB\nEstimasi Rx Power di ONT     : -18.15 dBm -> STATUS: NORMAL (-8 s/d -24 dBm)'
            }
        ]
    },
    'fo-tp11': {
        title: 'Simulasi Prosedur K3LH, APD & Penanganan Limbah Serat Optik',
        mode: 'K3LH Safety Compliance Check',
        steps: [
            {
                badge: 'Tahap 1 · Pemeriksaan APD Wajib',
                title: 'Mengenakan Kacamata Safety ANSI Z87.1 & APD Lapangan',
                img: 'assets/fo/fig-tp11-k3lh-apd.jpg',
                desc: 'Sebelum mengupas atau memotong serat optik, teknisi wajib memakai kacamata pelindung bersertifikat ANSI Z87.1 untuk mencegah pecahan serat silika 125 µm melesat ke mata, ditambah helm safety, sarung tangan, dan sepatu kerja.',
                term: '[CHECKLIST APD PRAKTIKUM & LAPANGAN FO]\n[OK] Kacamata Safety ANSI Z87.1 (Pelindung samping rapat)\n[OK] Alas Kerja Hitam (Black Mat) untuk kontras visual serat kaca\n[OK] Sarung Tangan Nitrile/Kevlar & Helm Proyek (ANSI Z89.1)'
            },
            {
                badge: 'Tahap 2 · Keselamatan Sinar Laser',
                title: 'Protokol IEC 60825-2: Larangan Melihat Ujung Konektor Aktif',
                img: 'assets/fo/fig-tp11-laser-safety.svg',
                desc: 'Sinar laser komunikasi fiber optik (1310 nm, 1490 nm, 1550 nm) berada di spektrum Inframerah Dekat yang TIDAK TERLIHAT mata manusia namun difokuskan lensa mata langsung membakar retina tanpa memicu refleks berkedip.',
                term: '[PERINGATAN LASER IEC 60825-2]\nLambda Operasi : 1310 / 1490 / 1550 nm (Invisible Near-Infrared)\nTindakan Wajib : 1. Pastikan port OLT/OLS OFF sebelum inspeksi\n                 2. Gunakan Video Fiber Microscope (bukan mikroskop optik langsung)\n                 3. Pasang kembali Dust Cap pada setiap ferrule yang terbuka'
            },
            {
                badge: 'Tahap 3 · Manajemen Limbah Kaca',
                title: 'Pembuangan Potongan Serat ke Fiber Trash Bin Berlabel',
                img: 'assets/fo/fig-030-toolkit.jpg',
                desc: 'Potongan ujung serat dari cleaver bersifat sangat tajam, transparan, dan tidak bisa terurai di dalam jaringan tubuh. Kumpulkan seluruh potongan pada selotip atau wadah tertutup khusus (Fiber Scrap Container) dan dilarang makan/minum di meja splicing.',
                term: '[PROTOKOL PEMBERSIHAN MEJA KERJA]\n1. Tampung potongan langsung di Fiber Collector Box pada Cleaver\n2. Angkat serpihan halus di meja dengan lakban/selotip perekat\n3. Tutup rapat botol IPA 99.9% (Flammable) jauh dari busur Fusion Splicer'
            }
        ]
    },
    'fo-tp12': {
        title: 'Simulasi Penarikan Kabel Optik, Kode Warna TIA-598-C & Bending Radius',
        mode: 'OSP/ISP Cable Installation Lab',
        steps: [
            {
                badge: 'Tahap 1 · Identifikasi Kode Warna',
                title: 'Membaca Urutan 12 Warna Tube & Core (ANSI/TIA-598-C)',
                img: 'assets/fo/fig-tia598-colors.svg',
                desc: 'Saat mengupas kabel multi-core (misal 24 atau 48 core), teknisi mengidentifikasi nomor tube dan nomor serat berdasarkan urutan baku 12 warna TIA-598-C agar tidak terjadi salah sambung (cross-core) antar-titik distribusi.',
                term: '[STANDAR 12 WARNA ANSI/TIA-598-C]\n01. Biru (Blue)     05. Abu-abu (Slate)   09. Kuning (Yellow)\n02. Oranye (Orange) 06. Putih (White)     10. Ungu (Violet)\n03. Hijau (Green)   07. Merah (Red)       11. Pink (Rose)\n04. Cokelat (Brown) 08. Hitam (Black)     12. Toska (Aqua)'
            },
            {
                badge: 'Tahap 2 · Kontrol Tegangan Tarik',
                title: 'Menarik Kabel melalui Strength Member & Menjaga Bending Radius',
                img: 'assets/fo/fig-struktur-kabel-fo.svg',
                desc: 'Gaya tarik kabel wajib ditumpukan pada komponen penguat (FRP Central Strength Member, Aramid Yarn/Kevlar, atau kawat Messenger), bukan pada jaket atau serat kaca, serta menjaga radius lengkungan minimal 20x diameter kabel saat ditarik.',
                term: '[PARAMETER PENARIKAN KABEL OPTIK]\nMax Pulling Tension (Instalasi) : <= 2700 N (Duct/Aerial Backbone) | <= 80 N (Drop)\nMin Bend Radius (Saat Ditarik)  : >= 20 x Diameter Luar Kabel (Dynamic)\nMin Bend Radius (Setelah Pasang): >= 10 x Diameter Luar Kabel (Static)'
            },
            {
                badge: 'Tahap 3 · Penambatan & Figure-8 Slack',
                title: 'Pemasangan Helical Dead-End Grip, Suspension & Kabel Cadangan',
                img: 'assets/fo/fig-032-stainless-bend.jpg',
                desc: 'Pada tiang tumpu digunakan Suspension Clamp, sedangkan pada tiang awal/akhir/belokan tajam digunakan Dead-End Grip (atau S-Clamp untuk drop core). Sisakan slack kabel 15–20 meter yang digulung rapi untuk cadangan maintenance.',
                term: '[CHECKLIST INSTALASI TIANG & SLACK]\n- Tiang Lurus       : Suspension Clamp + Stainless Steel Band\n- Tiang Sudut/Akhir : Preformed Helical Dead-End Grip + Thimble Clevis\n- Cadangan Kabel    : Slack 15-20m di dekat ODC/ODP/Joint Closure'
            }
        ]
    },
    'fo-tp13': {
        title: 'Simulasi Terminasi Konektor SC/UPC vs SC/APC & Pembersihan IEC 61300-3-35',
        mode: 'Connector Termination & Inspection Lab',
        steps: [
            {
                badge: 'Tahap 1 · Identifikasi Polishing Ferrule',
                title: 'Aturan Mutlak: Biru (UPC 0°) vs Hijau (APC 8°)',
                img: 'assets/fo/fig-upc-vs-apc.svg',
                desc: 'Konektor SC/UPC (Biru) memiliki ujung ferrule datar (0°, Return Loss >= 50 dB), sedangkan SC/APC (Hijau) dipotong miring 8° (Return Loss >= 60 dB untuk jaringan pasif ODP/RF). Konektor Biru dan Hijau DILARANG dipasangkan di satu adapter.',
                term: '[KOMPATIBILITAS MATING ADAPTER OPTIK]\nSC/UPC (Biru, 0 deg)  <--> SC/UPC (Biru, 0 deg)  : VALID (Loss <= 0.3 dB)\nSC/APC (Hijau, 8 deg) <--> SC/APC (Hijau, 8 deg) : VALID (Loss <= 0.3 dB)\nSC/UPC (Biru, 0 deg)  <--> SC/APC (Hijau, 8 deg) : DILARANG! (Celah udara +4 dB & Ferrule Rusak)'
            },
            {
                badge: 'Tahap 2 · Perakitan Fast Connector',
                title: 'Stripping Drop Core, Cleaving Presisi & Penguncian Cam',
                img: 'assets/fo/fig-031-fast-connector.jpg',
                desc: 'Kupas jaket kabel drop dengan Drop Cable Stripper sepanjang ~5 cm, kupas coating 250 µm dengan CFS-2 sesuai mal pengukur, bersihkan dengan tisu lint-free + IPA 99,9%, potong di cleaver (panjang bare fiber tepat sesuai stopper), lalu dorong ke dalam Fast Connector hingga membentuk micro-bow nhẹ dan kunci tuasnya.',
                term: '[VERIFIKASI PERAKITAN FAST CONNECTOR SC]\nPanjang Kupas Jaket   : 50 mm | Panjang Bare Fiber (125 um) : 10.0 mm (Sesuai Jig)\nSudut Potong Cleaver  : 0.4 deg (Target < 0.5 deg)\nUji Tembak VFL 650 nm : TIDAK ADA pendaran merah bocor di jendela bodi konektor [PASS]'
            },
            {
                badge: 'Tahap 3 · Inspeksi Mikroskop',
                title: 'Metode Wet-to-Dry Cleaning & One-Click Cleaner (IEC 61300-3-35)',
                img: 'assets/fo/fig-031-cleaning-pro.jpg',
                desc: 'Lebih dari 80% gangguan jaringan optik disebabkan debu/minyak jari pada ujung ferrule 125 µm. Bersihkan dengan One-Click Cleaner atau usap satu arah dari basah (IPA 99,9%) ke kering di atas Kimwipes, lalu verifikasi Zone A Core bersih sempurna.',
                term: '[INSPEKSI MIKROSKOP IEC 61300-3-35 (SMF)]\nZone A (Core 0-25 um)       : 0 Goresan, 0 Partikel Debu -> [PASS]\nZone B (Cladding 25-120 um) : Bersih sempurna            -> [PASS]\nInsertion Loss Konektor     : 0.22 dB (Standar Industri <= 0.30 dB)'
            }
        ]
    },
    'fo-tp21': {
        title: 'Simulasi Penyambungan Serat Optik dengan Core-Alignment Fusion Splicer',
        mode: 'Fujikura / Sumitomo Splicer OSD',
        steps: [
            {
                badge: 'Tahap 1 · Persiapan Sleeve & Cleaving',
                title: 'Memasukkan Protection Sleeve, Stripping, Cleaning & Cleaving 90°',
                img: 'assets/fo/fig-cleaver-striper-sop.svg',
                desc: 'Langkah pertama yang wajib diingat sebelum mengupas serat adalah memasukkan Heat-Shrink Protection Sleeve (60 mm) ke salah satu serat! Selanjutnya kupas coating 3–4 cm, bersihkan dengan IPA 99,9% hingga berbunyi "squeak", dan potong satu kali gerakan di Precision Cleaver.',
                term: '[PRE-SPLICE CHECKLIST]\n1. Protection Sleeve 60mm : SUDAH DIMASUKKAN ke serat kiri\n2. Stripping & IPA Clean  : Cladding 125 um bersih dari residu akrilat\n3. Precision Cleaving     : L_Cleave = 12 mm | Cleave Angle = 0.3 deg (Target < 0.5 deg)'
            },
            {
                badge: 'Tahap 2 · Penyelarasan & Peleburan Busur',
                title: 'Core Alignment PAS (X/Y Axis) & Electric Arc ~1800 °C',
                img: 'assets/fo/fig-fusion-splicer-diagram.svg',
                desc: 'Letakkan kedua ujung serat pada V-Groove tepat di antara ujung V-Groove dan elektroda tanpa menyentuh dinding. Saat kap ditutup, kamera PAS menyelaraskan inti X dan Y secara mikroskopis, melakukan pre-arc cleaning, lalu melebur kedua kaca pada suhu ~1800 °C.',
                term: '[FUSION SPLICER OSD TELEMETRY - MODE: SM G.652 AUTO]\nLeft Angle : 0.3 deg | Right Angle : 0.4 deg | Cleave Offset : 0.1 um\nArc Power  : Standard (Arc Calibration OK)   | Arc Time      : 1800 ms\nESTIMATED SPLICE LOSS : 0.02 dB (Ambang Lulus <= 0.10 dB) -> [SPLICE OK]'
            },
            {
                badge: 'Tahap 3 · Pemanasan & Penataan Tray',
                title: 'Tube Heater Oven & Coiling di dalam Splice Tray (R >= 30 mm)',
                img: 'assets/fo/fig-059-splicer-posisi.jpg',
                desc: 'Geser protection sleeve tepat menutupi titik sambungan (batang stainless steel menghadap bawah), panaskan di Tube Heater (~18–25 detik), dinginkan di cooling tray, lalu gulung serat membentuk elips lembut dengan radius >= 30 mm di dalam kaset Splice Tray.',
                term: '[POST-SPLICE QUALITY CONTROL]\nTensile Proof Test : 1.96 N (200 gf) -> LULUS (Sambungan kokoh)\nHeater Cycle       : 20 sec @ 160 C  -> Bebas gelembung udara\nTray Coiling       : Radius gulungan 35 mm (Standar >= 30 mm, bebas macrobend)'
            }
        ]
    },
    'fo-tp22': {
        title: 'Simulasi Kalibrasi Referensi 0 dB & Pengukuran Redaman OLTS (OLS + OPM)',
        mode: 'Tier-1 Optical Loss Test Set (OLTS)',
        steps: [
            {
                badge: 'Tahap 1 · Kalibrasi 0 dB Reference',
                title: 'One-Jumper Reference Method antara OLS dan OPM',
                img: 'assets/fo/fig-030-toolkit.jpg',
                desc: 'Untuk mengukur Insertion Loss (dB) secara akurat, nyalakan OLS dan OPM pada panjang gelombang yang sama (misal 1310 nm), hubungkan keduanya dengan patch cord referensi uji, pastikan bacaan dBm stabil, lalu tekan tombol REF (Zeroing 0,00 dB).',
                term: '[TIER-1 OLTS REFERENCE CALIBRATION]\nOLS Wavelength : 1310 nm CW (Continuous Wave) | Output: -5.20 dBm\nOPM Wavelength : 1310 nm (Matched!)           | Read  : -5.20 dBm\nAction: Tekan [REF / ZERO] -> Layar OPM menampilkan: 0.00 dB (Referensi Tersimpan)'
            },
            {
                badge: 'Tahap 2 · Pengukuran Insertion Loss',
                title: 'Mengukur Redaman End-to-End Saluran Kabel Terpasang',
                img: 'assets/fo/fig-031-cleaning-pro.jpg',
                desc: 'Lepaskan ujung patch cord referensi dari sisi OPM (JANGAN dilepas dari port OLS agar kondisi peluncuran stabil!), tambahkan receive test cord, lalu sisipkan link kabel fiber yang diuji di antaranya pada panjang gelombang 1310 nm dan 1550 nm.',
                term: '[HASIL UKUR TIER-1 INSERTION LOSS (LINK 4.0 KM)]\n@ 1310 nm :Rx = -7.85 dBm | Total Loss = 2.65 dB (Batas Budget <= 2.90 dB) [PASS]\n@ 1550 nm :Rx = -7.30 dBm | Total Loss = 2.10 dB (Batas Budget <= 2.38 dB) [PASS]\nCatatan   : Loss 1550 nm tidak lebih besar dari 1310 nm -> Bebas Macrobending!'
            },
            {
                badge: 'Tahap 3 · Uji Daya Terima ONT',
                title: 'Verifikasi Daya Terima Aktif (dBm) pada Port ODP & Roset Pelanggan',
                img: 'assets/fo/fig-ftth-branching-map.svg',
                desc: 'Saat mengukur jaringan FTTH GPON yang sudah aktif dari OLT, atur OPM pada mode dBm di panjang gelombang downstream 1490 nm. Daya terima di sisi pelanggan wajib berada di antara -8 dBm hingga -24 dBm.',
                term: '[LIVE GPON DOWNSTREAM POWER MEASUREMENT]\nOPM Mode       : Absolute Power (dBm) @ Lambda 1490 nm\nHasil Ukur ODP : -17.40 dBm\nHasil Ukur ONT : -18.10 dBm (Drop Cable 120m + 2 Konektor)\nEvaluasi SLA   : LULUS (Rentang Normal ONT GPON: -8.00 s/d -24.00 dBm)'
            }
        ]
    },
    'fo-tp23': {
        title: 'Simulasi Pengujian OTDR, Launch Cable & Interpretasi Kurva Trace',
        mode: 'Tier-2 EXFO / Yokogawa OTDR Analyzer',
        steps: [
            {
                badge: 'Tahap 1 · Pemasangan Launch Cable',
                title: 'Mengatasi Event Dead Zone (EDZ) dengan Launch & Receive Box',
                img: 'assets/fo/fig-033-odf.jpg',
                desc: 'Pantulan Fresnel yang kuat di konektor depan OTDR membutakan detektor sesaat (Dead Zone). Pasang Launch Cable (500–1000 m) sebelum titik awal link dan Receive Cable di ujung akhir link agar konektor pertama maupun terakhir dapat diukur redamannya.',
                term: '[OTDR ACQUISITION SETUP]\nWavelength  : 1310 nm & 1550 nm (Dual-Lambda Test)\nPulse Width : 30 ns (Resolusi tinggi jarak menengah) | Averaging Time: 30 detik\nIOR (n)     : 1.4682 @ 1550 nm | Launch Fiber: 500 m | Receive Fiber: 500 m'
            },
            {
                badge: 'Tahap 2 · Identifikasi Event Kurva',
                title: 'Membedakan Reflective Event vs Non-Reflective Event',
                img: 'assets/fo/fig-otdr-trace-pro.svg',
                desc: 'Pada grafik OTDR (sumbu Y = Daya dB, sumbu X = Jarak km): garis miring halus adalah redaman normal kabel, lonjakan paku ke atas (Spike) adalah Reflective Event (Konektor/Mechanical Splice/Patah), sedangkan turunan tangga tanpa paku adalah Non-Reflective Event (Fusion Splice atau Macrobending).',
                term: '[OTDR EVENT TABLE - FILE: ODC01_ODP05_CORE01.SOR]\nNo.  Jarak (km)   Tipe Event               Loss (dB)   Reflectance (dB)  Status\n1    0.500 km     Launch Connector (SC)    0.24 dB     -52.4 dB          PASS\n2    1.850 km     Fusion Splice (Non-Refl) 0.04 dB     ---               PASS\n3    3.120 km     Anomali Drop (Non-Refl)  1.45 dB     ---               [WARN!]'
            },
            {
                badge: 'Tahap 3 · Diagnosis Macrobending',
                title: 'Perbandingan Kurva 1310 nm vs 1550 nm untuk Deteksi Tekukan',
                img: 'assets/fo/fig-otdr-trace-pro.svg',
                desc: 'Untuk memastikan apakah penurunan di km 3,120 adalah sambungan buruk atau kabel tertekuk (macrobending), bandingkan nilai loss pada 1310 nm dan 1550 nm. Karena loss di 1550 nm melonjak jauh lebih tinggi dari 1310 nm, terbukti terjadi Macrobending di closure km 3,120!',
                term: '[DIAGNOSIS MULTI-WAVELENGTH @ EVENT #3 (3.120 KM)]\nLoss @ 1310 nm : 0.18 dB\nLoss @ 1550 nm : 1.45 dB (Loss 1550 >> Loss 1310!)\nKesimpulan     : TERDETEKSI MACRO-BENDING di Joint Closure Tiang T-31\nSolusi         : Perbaiki radius gulungan serat di Splice Tray menjadi >= 30 mm'
            }
        ]
    },
    'fo-tp24': {
        title: 'Simulasi Penyusunan As-Built Drawing, Pelabelan & Dokumen BAUT/BAST',
        mode: 'Project Closeout & Acceptance System',
        steps: [
            {
                badge: 'Tahap 1 · Standar Labeling Kabel',
                title: 'Pemasangan Cable Tag Tahan Cuaca (Origin – Destination – Core)',
                img: 'assets/fo/fig-ftth-branching-map.svg',
                desc: 'Setiap ujung kabel di ODF, ODC, Joint Closure, dan ODP wajib dipasangi label permanen tahan air/UV yang memuat titik asal, titik tujuan, kapasitas core, tipe kabel, dan tahun instalasi untuk memudahkan tim pemeliharaan (NOC).',
                term: '[FORMAT STANDAR CABLE LABELING INDUSTRI]\nKode Label : ODC-KMD-01 / ODP-KMD-05 / DS-24C-G652D / TUBE-01 / 2026\nPort ODP   : PORT-01: PLG-102481 (Rx: -17.8 dBm) | PORT-02: PLG-102482 (Rx: -18.1 dBm)'
            },
            {
                badge: 'Tahap 2 · Rekapitulasi Uji Terima',
                title: 'Kompilasi Tabel Redaman OPM & Lampiran File .SOR OTDR',
                img: 'assets/fo/fig-otdr-trace-pro.svg',
                desc: 'Seluruh hasil pengukuran redaman tiap core (OPM Two-Way Loss & OTDR Event Table) direkapitulasi ke dalam formulir Acceptance Test Procedure (ATP). Jika ada core dengan splice loss > 0,10 dB, wajib dilakukan re-splicing sebelum diajukan.',
                term: '[REKAPITULASI ACCEPTANCE TEST PROCEDURE (ATP) - 12 CORE]\nCore 01 (Biru)   : Splice=0.03 dB | Total Loss=2.14 dB | Rx ONT=-17.8 dBm [PASS]\nCore 02 (Oranye) : Splice=0.04 dB | Total Loss=2.18 dB | Rx ONT=-18.0 dBm [PASS]\n...\nCore 12 (Toska)  : Splice=0.02 dB | Total Loss=2.11 dB | Rx ONT=-17.6 dBm [PASS]'
            },
            {
                badge: 'Tahap 3 · Pengesahan BAUT & BAST',
                title: 'Penandatanganan Berita Acara Uji Terima & As-Built Drawing',
                img: 'assets/fo/fig-033-odc.jpg',
                desc: 'Dokumen akhir proyek (Project Closeout Report) disahkan melalui tanda tangan Berita Acara Uji Terima (BAUT) dan Berita Acara Serah Terima (BAST) antara pelaksana teknisi dan pengawas/pemilik pekerjaan, dilengkapi peta As-Built Drawing dan cadangan arsip digital 3-2-1.',
                term: '[KELENGKAPAN BERKAS SERAH TERIMA (BAST)]\n1. Lembar Pengesahan BAUT & BAST Bertanda Tangan Resmi\n2. Peta Jalur Aktual (As-Built Drawing) & Koordinat GPS Tiang/ODP\n3. Tabel Core Allocation Matrix + Berkas Asli .SOR & PDF OTDR\n4. Dokumentasi Foto Geotagging (Before - Process - After)'
            }
        ]
    },
    keamanan: {
        title: 'Simulasi Pertahanan Berlapis (Defense-in-Depth), IDS/IPS & Mitigasi Serangan',
        mode: 'SOC Cyber Defense Console',
        steps: [
            {
                badge: 'Tahap 1 · Deteksi Serangan L2/L3',
                title: 'Mendeteksi ARP Spoofing (MITM) & Rogue DHCP di LAN',
                img: 'assets/ppt/sec-ids-ips-edr-arch.svg',
                desc: 'Penyerang di jaringan lokal mencoba memalsukan paket balasan ARP (ARP Poisoning) agar trafik klien berbelok melewati laptop penyerang. Switch Managed mencegahnya menggunakan fitur DHCP Snooping dan Dynamic ARP Inspection (DAI).',
                term: 'SW-ACCESS# configure terminal\nSW-ACCESS(config)# ip dhcp snooping\nSW-ACCESS(config)# ip dhcp snooping vlan 10,20\nSW-ACCESS(config)# ip arp inspection vlan 10,20\n%SW_DAI-4-DHCP_SNOOPING_DENY: 1 Invalid ARP packet on Gi0/8, mac 00:50:56:c0:00:08 [DROPPED]'
            },
            {
                badge: 'Tahap 2 · Inspeksi Inline IPS',
                title: 'Perbedaan Passive IDS (SPAN Port) vs Inline IPS',
                img: 'assets/ppt/sec-ids-ips-edr-arch.svg',
                desc: 'IDS dipasang secara pasif pada port Mirror/SPAN hanya untuk mengirim peringatan (alert) ke SIEM, sedangkan IPS berada langsung di jalur trafik (inline) untuk memutus (drop) paket eksploitasi berbahaya secara real-time sebelum menyentuh server.',
                term: '[SURICATA INLINE IPS ALERT & DROP LOG]\n[**] [1:2024081:3] ET EXPLOIT SQL Injection Attempt (UNION SELECT) [**]\nSrcIP: 198.51.100.44:53211 -> DstIP: 172.16.10.20:443 (DMZ Web Server)\nAction Taken : [DROP PACKET] + Auto-Blacklist SrcIP for 3600s'
            },
            {
                badge: 'Tahap 3 · Hardening CIA Triad',
                title: 'Menerapkan Confidentiality, Integrity & Availability',
                img: 'assets/defense-in-depth.svg',
                desc: 'Keamanan menyeluruh berdiri di atas 3 pilar CIA Triad: Confidentiality (Enkripsi TLS/VPN & RBAC/MFA), Integrity (Verifikasi Hash SHA-256 & Digital Signature), dan Availability (Redundansi Link, UPS, Backup 3-2-1, dan Anti-DDoS Rate Limiting).',
                term: '[AUDIT KEPATUHAN KEAMANAN JARINGAN]\n- Confidentiality : HTTPS TLS 1.3 + SSH Key Ed25519 + WPA3-SAE   [ACTIVE]\n- Integrity       : SHA-256 Checksum & HMAC Packet Signing        [ACTIVE]\n- Availability    : Dual-WAN Failover + Daily Offsite Backup      [ACTIVE]'
            }
        ]
    },
    firewall: {
        title: 'Simulasi Konfigurasi Stateful Firewall, Chain RouterOS & Zona DMZ',
        mode: 'Stateful Firewall Rule Engine',
        steps: [
            {
                badge: 'Tahap 1 · Pemilihan Chain Firewall',
                title: 'Membedakan Chain INPUT, FORWARD, dan OUTPUT',
                img: 'assets/firewall-dmz.svg',
                desc: 'Pada MikroTik RouterOS / Linux netfilter: chain INPUT memfilter paket yang ditujukan langsung ke IP Router itu sendiri (WinBox, SSH, DNS Router); chain FORWARD memfilter paket yang melintas melewati router (LAN ke Internet atau LAN ke DMZ); chain OUTPUT berasal dari router keluar.',
                term: '[ALUR TRAFIK PACKET FLOW FIREWALL]\nPaket ke IP Router (SSH/WinBox/WebFig) -> Diproses di Chain: INPUT\nPaket Klien LAN menuju Internet/Server -> Diproses di Chain: FORWARD\nAturan Evaluasi ACL                    -> Top-Down (Baris atas ke bawah, First-Match!)'
            },
            {
                badge: 'Tahap 2 · Stateful Connection Tracking',
                title: 'Mengizinkan Established/Related & Membuang Paket Invalid',
                img: 'assets/ppt/perangkat-firewall-diagram.png',
                desc: 'Praktik terbaik industri selalu meletakkan aturan Stateful Inspection di baris paling atas: paket balasan yang sah (connection-state=established,related) langsung diizinkan (accept/fasttrack), sedangkan paket rusak (invalid) langsung dibuang (drop).',
                term: '/ip firewall filter\nadd chain=input   connection-state=established,related action=accept comment="1. Allow Est/Rel Input"\nadd chain=input   connection-state=invalid             action=drop   comment="2. Drop Invalid Input"\nadd chain=input   in-interface=ether1-WAN              action=drop   comment="3. Block All Inbound WAN to Router"'
            },
            {
                badge: 'Tahap 3 · Isolasi Antar-VLAN & DMZ',
                title: 'Membatasi Akses Siswa ke Jaringan Guru & Mengamankan DMZ',
                img: 'assets/firewall-dmz.svg',
                desc: 'Pada chain FORWARD, kita dapat mengizinkan subnet Siswa mengakses Internet dan Web Server DMZ (TCP 443), namun memblokir akses dari subnet Siswa ke subnet Guru/Keuangan.',
                term: '/ip firewall filter\nadd chain=forward connection-state=established,related action=fasttrack-connection\nadd chain=forward src-address=192.168.20.0/24 dst-address=172.16.10.20 protocol=tcp dst-port=443 action=accept comment="Siswa ke Web DMZ"\nadd chain=forward src-address=192.168.20.0/24 dst-address=192.168.10.0/24 action=drop comment="Blokir Siswa ke VLAN Guru"'
            }
        ]
    },
    kriptografi: {
        title: 'Simulasi Hybrid Encryption TLS 1.3, Hashing SHA-256 & Tanda Tangan Digital',
        mode: 'Cryptography & PKI Inspector',
        steps: [
            {
                badge: 'Tahap 1 · Pertukaran Kunci & Sertifikat',
                title: 'Kriptografi Asimetris (ECDHE / RSA) & Verifikasi X.509 CA',
                img: 'assets/crypto-compare.svg',
                desc: 'Saat browser membuka situs HTTPS, terjadi jabat tangan TLS 1.3: server mengirimkan sertifikat digital X.509 yang diverifikasi oleh Certificate Authority (CA), lalu klien dan server menyepakati kunci sesi rahasia menggunakan algoritma asimetris ECDHE (Perfect Forward Secrecy).',
                term: '[TLS 1.3 HANDSHAKE INSPECTOR - RFC 8446]\n1. ClientHello + KeyShare (X25519 Ephemeral Public Key)\n2. ServerHello + KeyShare + Certificate X.509 (Signed by Trusted CA)\n3. Certificate Verify : Digital Signature ECDSA-SHA256 -> [AUTHENTICATED]'
            },
            {
                badge: 'Tahap 2 · Enkripsi Payload Cepat',
                title: 'Enkripsi Simetris AES-256-GCM / ChaCha20-Poly1305',
                img: 'assets/crypto-compare.svg',
                desc: 'Setelah kunci sesi disepakati, seluruh transfer data halaman web dienkripsi menggunakan kriptografi simetris (AES-256-GCM atau ChaCha20-Poly1305) karena ratusan kali lebih cepat daripada mengenkripsi data besar dengan kunci asimetris.',
                term: '[ACTIVE SYMMETRIC SESSION CIPHER]\nCipher Suite : TLS_AES_256_GCM_SHA384\nPlaintext    : "POST /login user=admin&pass=Rahasia123"\nCiphertext   : 8f 4a 2c 91 e0 7b 3d 55 19 a4 c8 62 ... [AEAD Auth Tag OK]'
            },
            {
                badge: 'Tahap 3 · Integritas & Non-Repudiation',
                title: 'Cara Kerja Fungsi Hash SHA-256 & Digital Signature',
                img: 'assets/packet-journey.svg',
                desc: 'Untuk membuat Tanda Tangan Digital (Digital Signature): pengirim menghitung hash dokumen dengan SHA-256, lalu mengenkripsi hash tersebut menggunakan PRIVATE KEY PENGIRIM. Penerima memverifikasinya menggunakan PUBLIC KEY PENGIRIM.',
                term: '$ sha256sum firmware-routeros-7.15.npk\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n[DIGITAL SIGNATURE VERIFICATION]\nDecrypted Signature Hash (via Sender Public Key) == Local SHA-256 Hash\nResult: INTEGRITY & AUTHENTICITY VERIFIED (Dokumen Asli & Belum Diubah)'
            }
        ]
    },
    vlan: {
        title: 'Simulasi Segmentasi Switch IEEE 802.1Q, Trunking & Inter-VLAN Routing',
        mode: 'L2/L3 VLAN Switch Simulator',
        steps: [
            {
                badge: 'Tahap 1 · Pembuatan VLAN & Access Port',
                title: 'Memisahkan Broadcast Domain pada Port Access (Untagged)',
                img: 'assets/ppt/vlan-diagram.png',
                desc: 'Port Access menghubungkan switch ke perangkat akhir (PC, Printer) yang tidak mengenal tag VLAN. Switch menandai frame yang masuk dari port tersebut dengan PVID (misal VLAN 10 Guru atau VLAN 20 Siswa) dan melepas tag saat keluar ke PC.',
                term: 'SW-L2(config)# vlan 10\nSW-L2(config-vlan)# name GURU\nSW-L2(config)# vlan 20\nSW-L2(config-vlan)# name SISWA\nSW-L2(config)# interface range fa0/1 - 10\nSW-L2(config-if-range)# switchport mode access\nSW-L2(config-if-range)# switchport access vlan 10'
            },
            {
                badge: 'Tahap 2 · IEEE 802.1Q Trunk Port',
                title: 'Menyisipkan Tag 4-Byte (VID 12-Bit) pada Jalur Uplink Trunk',
                img: 'assets/vlan-trunk.svg',
                desc: 'Agar satu kabel uplink antara Switch dan Router (atau antar-Switch) dapat membawa trafik banyak VLAN sekaligus, port diatur sebagai Trunk Port. Switch menyisipkan header IEEE 802.1Q seukuran 4 byte (TPID 0x8100 + VLAN ID 1..4094).',
                term: 'SW-L2(config)# interface GigabitEthernet0/1\nSW-L2(config-if)# description TRUNK_TO_ROUTER\nSW-L2(config-if)# switchport mode trunk\nSW-L2(config-if)# switchport trunk allowed vlan 10,20,99\n[802.1Q TAG HEADER]: [TPID: 0x8100 | PCP: 0 | DEI: 0 | VID: 10 (0x00A)]'
            },
            {
                badge: 'Tahap 3 · Inter-VLAN Routing',
                title: 'Menghubungkan Antar-VLAN dengan Sub-Interface (Router-on-a-Stick)',
                img: 'assets/vlan-trunk.svg',
                desc: 'Secara bawaan VLAN 10 dan VLAN 20 terisolasi total di Layer 2. Untuk mengizinkan komunikasi terkontrol di Layer 3, dibuat virtual sub-interface (atau VLAN interface di MikroTik / SVI di Switch L3) sebagai Default Gateway masing-masing VLAN.',
                term: '/interface vlan\nadd interface=ether2-trunk name=vlan10-guru  vlan-id=10\nadd interface=ether2-trunk name=vlan20-siswa vlan-id=20\n/ip address\nadd address=192.168.10.1/24 interface=vlan10-guru\nadd address=192.168.20.1/24 interface=vlan20-siswa'
            }
        ]
    },
    routing: {
        title: 'Simulasi Keputusan Routing Layer 3, Static Route & OSPF Adjacency',
        mode: 'L3 Routing & OSPF Engine',
        steps: [
            {
                badge: 'Tahap 1 · Aturan Pemilihan Rute',
                title: 'Hierarki Mutlak: 1. Longest Prefix Match → 2. AD → 3. Metric',
                img: 'assets/ppt/routing-l3-engine.svg',
                desc: 'Saat memilih jalur untuk paket tujuan 192.168.10.25, router SELALU memilih prefix paling spesifik (/26 menang mutlak atas /24). Jika prefix-nya sama persis, barulah dibandingkan Administrative Distance terkecil (Static=1 menang atas OSPF=110, RIP=120).',
                term: '[SIMULASI KEPUTUSAN TABEL ROUTING UNTUK DST: 192.168.10.25]\nKandidat A : 192.168.10.0/24 via Static (AD=1)\nKandidat B : 192.168.10.0/26 via OSPF   (AD=110, Cost=10)\nKEPUTUSAN  : PILIH KANDIDAT B! (/26 lebih spesifik daripada /24 - Longest Prefix Match)'
            },
            {
                badge: 'Tahap 2 · Konfigurasi Static Route',
                title: 'Membangun Rute Dua Arah (Forward & Return Path)',
                img: 'assets/routing-decision.svg',
                desc: 'Pada Static Routing, administrator wajib mendaftarkan subnet tujuan beserta IP Next-Hop di KEDUA arah router (Router A harus tahu jalan ke LAN B, dan Router B wajib tahu jalan balik ke LAN A).',
                term: '# Pada Router-A (Menuju LAN-B 192.168.20.0/24 lewat 10.0.0.2):\n/ip route add dst-address=192.168.20.0/24 gateway=10.0.0.2 distance=1\n\n# Pada Router-B (Jalur Balik menuju LAN-A 192.168.10.0/24 lewat 10.0.0.1):\n/ip route add dst-address=192.168.10.0/24 gateway=10.0.0.1 distance=1'
            },
            {
                badge: 'Tahap 3 · Dynamic Routing OSPF',
                title: 'Pertukaran LSA & Pembentukan OSPF Full Adjacency (Area 0)',
                img: 'assets/ppt/routing-ospf.png',
                desc: 'Protokol Link-State OSPF bertukar paket Hello (setiap 10 detik) dan menyinkronkan database topologi (LSDB) untuk menghitung jalur terpendek dengan algoritma Dijkstra (Cost = Reference BW / Interface BW).',
                term: '/routing ospf instance add name=ospf-v2 router-id=1.1.1.1\n/routing ospf area add name=backbone area-id=0.0.0.0 instance=ospf-v2\n/routing ospf interface-template add area=backbone networks=192.168.10.0/24,10.0.0.0/30\n[OSPF NEIGHBOR STATUS]: Neighbor 2.2.2.2 (10.0.0.2) -> State: FULL (Adjacency Established)'
            }
        ]
    },
    nat: {
        title: 'Simulasi Translasi Paket SRCNAT (Masquerade) & DSTNAT (Port Forwarding)',
        mode: 'NAT & Gateway Packet Translator',
        steps: [
            {
                badge: 'Tahap 1 · Outbound PAT / Masquerade',
                title: 'Mengubah Ratusan IP Private LAN menjadi Satu IP Public WAN',
                img: 'assets/ppt/nat-mikrotik-topology.svg',
                desc: 'Ketika PC klien (Inside Local: 192.168.10.25) mengakses server internet (8.8.8.8), rule SRCNAT Masquerade pada router mengganti Source IP paket menjadi IP Public WAN router (Inside Global: 203.0.113.5) dan mencatat nomor port TCP/UDP di tabel NAT.',
                term: '/ip firewall nat\nadd chain=srcnat out-interface=ether1-WAN action=masquerade comment="PAT LAN ke Internet"\n\n[NAT TRANSLATION TABLE - OUTBOUND]\nBefore SRCNAT : Src 192.168.10.25:52410 -> Dst 8.8.8.8:443\nAfter  SRCNAT : Src 203.0.113.5:61001   -> Dst 8.8.8.8:443 (Recorded in Conntrack)'
            },
            {
                badge: 'Tahap 2 · Inbound Port Forwarding',
                title: 'Mengarahkan Trafik Publik ke Server Lokal dengan DSTNAT',
                img: 'assets/nat-pat-flow.svg',
                desc: 'Agar Web Server lokal (192.168.10.100 port 80) di dalam LAN dapat diakses dari internet melalui IP Public router (203.0.113.5 port 8080), dikonfigurasi rule DSTNAT (Destination NAT) yang membelokkan Destination IP & Port saat paket masuk dari WAN.',
                term: '/ip firewall nat\nadd chain=dstnat in-interface=ether1-WAN protocol=tcp dst-port=8080 \\\n    action=dst-nat to-addresses=192.168.10.100 to-ports=80 comment="Forward Web Server"\n\n[NAT TRANSLATION TABLE - INBOUND]\nBefore DSTNAT : Src 114.122.10.5:49112 -> Dst 203.0.113.5:8080\nAfter  DSTNAT : Src 114.122.10.5:49112 -> Dst 192.168.10.100:80'
            },
            {
                badge: 'Tahap 3 · Verifikasi Gateway & CGNAT',
                title: 'Memeriksa IP Public WAN vs IP CGNAT ISP (100.64.0.0/10)',
                img: 'assets/ppt/nat-mikrotik-topology.svg',
                desc: 'Sebelum melakukan Port Forwarding, periksa apakah IP pada interface WAN router adalah IP Public murni atau IP CGNAT ISP (100.64.0.0/10 atau 10.x.x.x). Jika berada di balik CGNAT, Port Forwarding membutuhkan IP Public Static atau Tunneling.',
                term: '[admin@R-GATEWAY] > /ip address print where interface=ether1-WAN\nADDRESS            NETWORK         INTERFACE\n203.0.113.5/30     203.0.113.4     ether1-WAN\nStatus: Pure Public IPv4 Detected -> Inbound Port Forwarding (DSTNAT) ACTIVE'
            }
        ]
    },
    linux: {
        title: 'Simulasi Administrasi Server Linux Debian/Ubuntu (CLI, Jaringan & Permission)',
        mode: 'Debian / Ubuntu Server LTS Bash',
        steps: [
            {
                badge: 'Tahap 1 · Konfigurasi Interface IP',
                title: 'Mengatur IP Address Statis & Gateway di Linux Server',
                img: 'assets/ppt/os-debian.jpg',
                desc: 'Pada Debian/Ubuntu Server, pengaturan jaringan tersimpan di dalam direktori konfigurasi /etc (/etc/network/interfaces atau /etc/netplan/). Administrator memverifikasi status link dan tabel rute menggunakan utilitas iproute2 (ip addr dan ip route).',
                term: 'root@debian-srv:~# ip -br addr show eth0\neth0             UP             192.168.10.10/24 fe80::20c:29ff:fe8a:1122/64\nroot@debian-srv:~# ip route show\ndefault via 192.168.10.1 dev eth0 proto static\n192.168.10.0/24 dev eth0 proto kernel scope link src 192.168.10.10'
            },
            {
                badge: 'Tahap 2 · Hak Akses File (POSIX)',
                title: 'Perhitungan Oktal chmod (755, 644, 600) & Kepemilikan chown',
                img: 'assets/linux-filetree.svg',
                desc: 'Setiap berkas Linux diatur oleh 3 kelompok izin (Owner, Group, Others) dengan nilai bit Read(4) + Write(2) + Execute(1). Direktori web diberi izin 755, file halaman web 644, dan kunci privat SSH wajib 600.',
                term: 'root@debian-srv:~# chown -R www-data:www-data /var/www/smkn1\nroot@debian-srv:~# chmod 755 /var/www/smkn1 && chmod 644 /var/www/smkn1/index.html\nroot@debian-srv:~# chmod 600 ~/.ssh/id_ed25519\nroot@debian-srv:~# ls -la /var/www/smkn1/index.html\n-rw-r--r-- 1 www-data www-data 4096 Nov 21 08:30 /var/www/smkn1/index.html'
            },
            {
                badge: 'Tahap 3 · Hardening SSH & Systemd',
                title: 'Menonaktifkan Login Root SSH & Memeriksa Layanan Daemon',
                img: 'assets/ppt/os-routeros.png',
                desc: 'Untuk mengamankan server produksi, matikan login root langsung pada /etc/ssh/sshd_config (PermitRootLogin no), gunakan autentikasi SSH Key, dan pantau kesehatan daemon melalui systemctl serta journalctl.',
                term: 'root@debian-srv:~# grep -E "^(Port|PermitRootLogin|PasswordAuth)" /etc/ssh/sshd_config\nPort 22\nPermitRootLogin no\nPasswordAuthentication no\nroot@debian-srv:~# sshd -t && systemctl reload ssh && systemctl is-active ssh\nactive'
            }
        ]
    },
    server: {
        title: 'Simulasi Integrasi Layanan Server: DHCP (DORA), DNS (BIND9) & Web (Apache)',
        mode: 'Linux Infrastructure Services Lab',
        steps: [
            {
                badge: 'Tahap 1 · Siklus DHCP DORA',
                title: 'Alokasi IP Otomatis (UDP 67/68) dengan isc-dhcp-server',
                img: 'assets/dhcp-dns-flow.svg',
                desc: 'Saat klien baru menyala, terjadi 4 tahap DORA: (1) Client mengirim broadcast DHCP Discover, (2) Server menawarkan IP melalui DHCP Offer, (3) Client meminta IP tersebut via DHCP Request, dan (4) Server mengesahkan penyewaan via DHCP Acknowledge.',
                term: '# /etc/dhcp/dhcpd.conf\nsubnet 192.168.10.0 netmask 255.255.255.0 {\n  range 192.168.10.50 192.168.10.150;\n  option routers 192.168.10.1;\n  option domain-name-servers 192.168.10.10;\n  default-lease-time 86400;\n}\n[DHCPD LOG]: DHCPACK on 192.168.10.51 to 00:1a:2b:3c:4d:01 via eth0'
            },
            {
                badge: 'Tahap 2 · Resolusi DNS BIND9',
                title: 'Konfigurasi Forward Zone (A, CNAME, MX) & Reverse Zone (PTR)',
                img: 'assets/dhcp-dns-flow.svg',
                desc: 'DNS Server BIND9 (Port 53 UDP/TCP) menerjemahkan nama domain sekolah menjadi alamat IP (Forward Zone) dan sebaliknya (Reverse Zone in-addr.arpa). Selalu validasi sintaks zona dengan named-checkzone sebelum me-reload daemon.',
                term: 'root@debian-srv:~# named-checkzone smkn1kuantanmudik.sch.id /etc/bind/db.smkn1\nzone smkn1kuantanmudik.sch.id/IN: loaded serial 2026112101\nOK\nroot@debian-srv:~# dig +short www.smkn1kuantanmudik.sch.id @192.168.10.10\n192.168.10.10'
            },
            {
                badge: 'Tahap 3 · VirtualHost Web Server',
                title: 'Menjalankan Layanan HTTP/HTTPS pada Apache2 / Nginx',
                img: 'assets/ppt/app-apache.jpg',
                desc: 'Setelah DNS mengarah ke IP server, Web Server melayani halaman aplikasi melalui VirtualHost pada port TCP 80 (HTTP) dan TCP 443 (HTTPS TLS). Gunakan ss -tulpn dan curl -I untuk memverifikasi respons header HTTP 200 OK.',
                term: 'root@debian-srv:~# apache2ctl configtest\nSyntax OK\nroot@debian-srv:~# ss -tulpn | grep -E ":53|:80|:443"\ntcp   LISTEN 0 511  0.0.0.0:80   0.0.0.0:*  users:(("apache2",pid=1420))\ntcp   LISTEN 0 511  0.0.0.0:443  0.0.0.0:*  users:(("apache2",pid=1420))\nroot@debian-srv:~# curl -I https://www.smkn1kuantanmudik.sch.id\nHTTP/2 200 OK'
            }
        ]
    }
};

const _simTimers = {};

function renderLessonSimulation(topicKey) {
    const sim = LESSON_SIMULATIONS[topicKey];
    if (!sim || !sim.steps || !sim.steps.length) return '';
    const uid = 'sim-lab-' + topicKey.replace(/[^a-z0-9]/gi, '_');
    const s0 = sim.steps[0];
    return `
    <section class="card sim-lab-card" id="${uid}" data-topic="${topicKey}" data-step="0" aria-label="Simulasi Visual & Lab Praktik Interaktif">
        <div class="sim-lab-head">
            <div class="sim-lab-title-wrap">
                <span class="sim-lab-badge"><i class="fas fa-bolt"></i> SIMULASI VISUAL &amp; LAB INTERAKTIF · 100% IN-APP</span>
                <h3>${sim.title}</h3>
            </div>
            <div class="sim-lab-controls">
                <button type="button" class="sim-play-btn" id="${uid}-play" onclick="toggleSimAutoPlay('${uid}', '${topicKey}')">
                    <i class="fas fa-play"></i><span>Putar Otomatis</span>
                </button>
            </div>
        </div>

        <div class="sim-step-tabs" role="tablist">
            ${sim.steps.map((s, i) => `
                <button type="button" class="sim-step-tab ${i === 0 ? 'active' : ''}" onclick="setSimStep('${uid}', '${topicKey}', ${i}, true)">
                    <span class="sim-step-num">${i + 1}</span>
                    <span class="sim-step-lbl">${s.title}</span>
                </button>
            `).join('')}
        </div>

        <div class="sim-progress-track"><div class="sim-progress-bar" id="${uid}-bar" style="width:${Math.round(100 / sim.steps.length)}%"></div></div>

        <div class="sim-stage-grid" id="${uid}-stage">
            ${renderSimStageInner(uid, topicKey, 0)}
        </div>

        <div class="sim-footer-nav">
            <button type="button" class="btn-ghost sim-prev-btn" id="${uid}-prev" onclick="stepSimDelta('${uid}', '${topicKey}', -1)">
                <i class="fas fa-arrow-left"></i><span>Tahap Sebelumnya</span>
            </button>
            <span class="sim-step-counter" id="${uid}-counter">Tahap 1 dari ${sim.steps.length} · ${s0.badge}</span>
            <button type="button" class="btn-primary sim-next-btn" id="${uid}-next" onclick="stepSimDelta('${uid}', '${topicKey}', 1)">
                <span>Tahap Berikutnya</span><i class="fas fa-arrow-right"></i>
            </button>
        </div>
    </section>`;
}

function renderSimStageInner(uid, topicKey, idx) {
    const sim = LESSON_SIMULATIONS[topicKey];
    if (!sim || !sim.steps[idx]) return '';
    const s = sim.steps[idx];
    const escapedTerm = s.term.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
        <div class="sim-visual-pane">
            <div class="sim-visual-frame">
                <span class="sim-stage-pill">${s.badge}</span>
                <img src="${s.img}" alt="${s.title}" loading="lazy">
            </div>
            <div class="sim-explain-box">
                <h4><i class="fas fa-check-circle"></i> ${s.title}</h4>
                <p>${s.desc}</p>
            </div>
        </div>
        <div class="sim-term-pane">
            <div class="sim-term-head">
                <div class="code-dots"><span></span><span></span><span></span></div>
                <span class="sim-term-mode"><i class="fas fa-terminal"></i> ${sim.mode}</span>
                <button type="button" class="sim-copy-btn" onclick="copySimTerm('${uid}')" title="Salin konfigurasi / hasil ukur">
                    <i class="far fa-copy"></i><span>Salin</span>
                </button>
            </div>
            <pre class="sim-term-body" id="${uid}-term">${escapedTerm}</pre>
        </div>`;
}

function setSimStep(uid, topicKey, idx, stopAuto = false) {
    const sim = LESSON_SIMULATIONS[topicKey];
    if (!sim || !sim.steps.length) return;
    if (stopAuto && _simTimers[uid]) {
        clearInterval(_simTimers[uid]);
        delete _simTimers[uid];
        const playBtn = document.getElementById(uid + '-play');
        if (playBtn) {
            playBtn.classList.remove('playing');
            playBtn.innerHTML = '<i class="fas fa-play"></i><span>Putar Otomatis</span>';
        }
    }
    const total = sim.steps.length;
    const safeIdx = ((idx % total) + total) % total;
    const box = document.getElementById(uid);
    if (!box) return;
    box.dataset.step = String(safeIdx);
    box.querySelectorAll('.sim-step-tab').forEach((b, i) => b.classList.toggle('active', i === safeIdx));
    const stage = document.getElementById(uid + '-stage');
    if (stage) stage.innerHTML = renderSimStageInner(uid, topicKey, safeIdx);
    const bar = document.getElementById(uid + '-bar');
    if (bar) bar.style.width = Math.round(((safeIdx + 1) / total) * 100) + '%';
    const counter = document.getElementById(uid + '-counter');
    if (counter) counter.textContent = `Tahap ${safeIdx + 1} dari ${total} · ${sim.steps[safeIdx].badge}`;
}

function stepSimDelta(uid, topicKey, delta) {
    const box = document.getElementById(uid);
    const cur = box ? Number(box.dataset.step || 0) : 0;
    setSimStep(uid, topicKey, cur + delta, true);
}

function toggleSimAutoPlay(uid, topicKey) {
    const playBtn = document.getElementById(uid + '-play');
    if (_simTimers[uid]) {
        clearInterval(_simTimers[uid]);
        delete _simTimers[uid];
        if (playBtn) {
            playBtn.classList.remove('playing');
            playBtn.innerHTML = '<i class="fas fa-play"></i><span>Putar Otomatis</span>';
        }
        return;
    }
    if (playBtn) {
        playBtn.classList.add('playing');
        playBtn.innerHTML = '<i class="fas fa-pause"></i><span>Jeda Simulasi</span>';
    }
    _simTimers[uid] = setInterval(() => {
        const box = document.getElementById(uid);
        if (!box) {
            clearInterval(_simTimers[uid]);
            delete _simTimers[uid];
            return;
        }
        const cur = Number(box.dataset.step || 0);
        setSimStep(uid, topicKey, cur + 1, false);
    }, 4500);
}

function copySimTerm(uid) {
    const pre = document.getElementById(uid + '-term');
    if (!pre) return;
    const txt = pre.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => toast('Output simulasi berhasil disalin 📋'));
    } else {
        toast('Output simulasi siap disalin 📋');
    }
}

function updateNetStatus() {
    const isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
    const pill = document.getElementById('offline-pill');
    if (pill) pill.classList.toggle('hidden', !isOffline);
    if (document.body && document.body.classList) {
        document.body.classList.toggle('is-offline', isOffline);
    }
}
window.addEventListener('online', () => { updateNetStatus(); toast('Koneksi kembali online 🌐'); });
window.addEventListener('offline', () => { updateNetStatus(); toast('Mode Offline — seluruh materi, simulasi & kuis tetap aktif 📚'); });


// ============================================================
// HOME PAGE
// ============================================================
function home() {
    const doneTkj = safeGetJSON('tjkt_lesson_done');
    const tkjDone = TKJ_ORDER.filter(k => !!doneTkj[k] || progress[k] !== undefined).length;
    const tkjPct = Math.round((tkjDone / TKJ_ORDER.length) * 100);
    const foDone = safeGetJSON('tjkt_fo_done');
    const foDoneCount = FO_TP.filter(t => !!foDone[t.id] || progress['fo_' + t.id] !== undefined).length;
    const foPct = Math.round((foDoneCount / FO_TP.length) * 100);
    const totalTopics = TKJ_ORDER.length + FO_TP.length;
    const totalQ = Object.values(assessments).reduce((s, arr) => s + arr.length, 0);

    return `
    <div class="portal-hero">
        <div class="portal-hero-left">
            <span class="portal-kicker"><i class="fas fa-layer-group"></i> TJKT STUDIO · SMKN 1 KUANTAN MUDIK</span>
            <h1>Pilih Mata Pelajaran</h1>
            <p>Akses materi Fase F, simulasi interaktif, dan glosarium perangkat.</p>
        </div>
        <div class="portal-stats-mini">
            <div class="psm-item"><strong>2</strong><span>Mapel</span></div>
            <div class="psm-item"><strong>${totalTopics}</strong><span>Topik</span></div>
            <div class="psm-item"><strong>${totalQ}</strong><span>Soal</span></div>
        </div>
    </div>

    ${resumeCard()}

    <div class="portal-grid">
        <div class="portal-card" onclick="enterTrack('tkj')">
            <div class="pc-head">
                <div class="pc-icon pc-icon-img"><img src="assets/icons/ui/network.svg" alt="" class="ui-svg-icon" width="26" height="26"></div>
                <span class="pc-badge">MAPEL INTI · 5 ELEMEN</span>
            </div>
            <h2>Konsentrasi Program Keahlian</h2>
            <div class="pc-meta">
                <span><i class="fas fa-book"></i> ${TKJ_ORDER.length} Topik (E1–E5)</span>
                <span><i class="fas fa-check-circle"></i> ${tkjDone}/${TKJ_ORDER.length} (${tkjPct}%)</span>
            </div>
            <div class="pc-menus">
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('tkj')"><i class="fas fa-th-large"></i> Peta E1–E5</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('intro')"><i class="fas fa-graduation-cap"></i> Capaian</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('pengayaan')"><i class="fas fa-book-reader"></i> Pengayaan</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('glosariumPerangkat')"><i class="fas fa-server"></i> Perangkat</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('glosarium')"><i class="fas fa-book-open"></i> Istilah</button>
            </div>
            <button type="button" class="pc-cta" onclick="event.stopPropagation();enterTrack('tkj')">
                <span>Buka Konsentrasi TKJ</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>

        <div class="portal-card pc-fo" onclick="enterTrack('fo')">
            <div class="pc-head">
                <div class="pc-icon pc-icon-img"><img src="assets/icons/ui/fiber.svg" alt="" class="ui-svg-icon" width="26" height="26"></div>
                <span class="pc-badge">MAPEL PILIHAN · ${FO_TP.length} TP</span>
            </div>
            <h2>Mata Pelajaran Pilihan: Fiber Optik</h2>
            <div class="pc-meta">
                <span><i class="fas fa-tools"></i> ${FO_TP.length} TP Praktik + Teori</span>
                <span><i class="fas fa-check-circle"></i> ${foDoneCount}/${FO_TP.length} (${foPct}%)</span>
            </div>
            <div class="pc-menus">
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('fiberOptik')"><i class="fas fa-bolt"></i> Beranda FO</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('fiber')"><i class="fas fa-wave-square"></i> Teori Dasar</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('fo-tp11')"><i class="fas fa-hard-hat"></i> TP 1.1–2.4</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showPage('glosariumPerangkat')"><i class="fas fa-toolbox"></i> Perangkat</button>
                <button type="button" class="pc-menu-chip" onclick="event.stopPropagation();showAssessment('fiber')"><i class="fas fa-tasks"></i> Kuis FO</button>
            </div>
            <button type="button" class="pc-cta" onclick="event.stopPropagation();enterTrack('fo')">
                <span>Buka Modul Fiber Optik</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    </div>

    <div class="util-grid">
        <button type="button" class="util-card" onclick="showPage('glosariumPerangkat')">
            <span class="util-card-ic util-ic-img"><img src="assets/icons/ui/server.svg" alt="" class="ui-svg-icon" width="22" height="22"></span>
            <div><strong>Glosarium Perangkat</strong><small>${glosariumPerangkatData.length} perangkat bergambar</small></div>
        </button>
        <button type="button" class="util-card" onclick="showPage('glosarium')">
            <span class="util-card-ic util-ic-img"><img src="assets/icons/ui/books.svg" alt="" class="ui-svg-icon" width="22" height="22"></span>
            <div><strong>Glosarium Istilah</strong><small>${glosariumData.length} istilah teknis</small></div>
        </button>
        <button type="button" class="util-card" onclick="showPage('ip')">
            <span class="util-card-ic util-ic-img"><img src="assets/icons/ui/lab.svg" alt="" class="ui-svg-icon" width="22" height="22"></span>
            <div><strong>Kalkulator Subnet</strong><small>IPv4, CIDR &amp; VLSM</small></div>
        </button>
        <button type="button" class="util-card" onclick="showPage('progress')">
            <span class="util-card-ic util-ic-img"><img src="assets/icons/ui/chart.svg" alt="" class="ui-svg-icon" width="22" height="22"></span>
            <div><strong>Progress Belajar</strong><small>Rekap skor &amp; KKM 75</small></div>
        </button>
    </div>`;
}

function tkjPage() {
    const doneTkj = safeGetJSON('tjkt_lesson_done');
    const elements = [
        {
            code: 'E1', cls: 'e1', name: 'Perencanaan & Pengalamatan Jaringan',
            topics: [
                ['🗺️','Topologi Jaringan','topologi','Fisik, logis & arsitektur'],
                ['📋','Kebutuhan Teknis','kebutuhan','Survei & spesifikasi SLA'],
                ['🔧','Peralatan Jaringan','peralatan','Router, switch, AP & NIC'],
                ['🔢','IP, CIDR & VLSM','ip','Subnetting & kalkulator IP']
            ]
        },
        {
            code: 'E2', cls: 'e2', name: 'Teknologi Jaringan Kabel & Nirkabel',
            topics: [
                ['🔌','Jaringan Kabel','kabel','ANSI/TIA-568, UTP Cat6/6A & T568A/B'],
                ['📡','Nirkabel / WiFi','nirkabel','IEEE 802.11ax/be, kanal, Fresnel & WPA3'],
                ['💡','Fiber Optic (Teori)','fiber','ITU-T G.652/G.657, GPON, OPM & OTDR']
            ]
        },
        {
            code: 'E3', cls: 'e3', name: 'Keamanan Jaringan',
            topics: [
                ['🔒','Keamanan Jaringan','keamanan','CIA Triad, NIST CSF, DAI & IDS/IPS'],
                ['🛡️','Firewall & ACL','firewall','Stateful, DMZ, Cisco ACL & MikroTik Filter'],
                ['🗝️','Kriptografi','kriptografi','AES-256, RSA/ECC, SHA-256 & TLS 1.3/PKI']
            ]
        },
        {
            code: 'E4', cls: 'e4', name: 'Pemasangan & Konfigurasi Perangkat Jaringan',
            topics: [
                ['🧩','VLAN','vlan','IEEE 802.1Q, trunk, SVI & inter-VLAN'],
                ['🛣️','Routing','routing','LPM, Static, RIPv2, OSPFv2 & BGP-4'],
                ['🔄','NAT & Gateway','nat','RFC 3022 Static/Dynamic NAT, PAT & CGNAT']
            ]
        },
        {
            code: 'E5', cls: 'e5', name: 'Administrasi Sistem Jaringan',
            topics: [
                ['🐧','Sistem Operasi Linux','linux','FHS, CLI, Netplan, chmod & systemd'],
                ['🖥️','Konfigurasi Server','server','DHCP, DNS BIND9, Apache2, FTP & NTP']
            ]
        }
    ];
    const doneCount = TKJ_ORDER.filter(k => !!doneTkj[k] || progress[k] !== undefined).length;
    const pct = Math.round((doneCount / TKJ_ORDER.length) * 100);
    const tkjTotalQ = TKJ_ORDER.reduce((s, k) => s + ((assessments[k] || []).length), 0);

    return `
    <div class="hero-card">
        <div class="hero-tag"><i class="fas fa-network-wired"></i> KONSENTRASI KEAHLIAN TKJ</div>
        <h1>Peta Materi <span>TJKT Fase F</span></h1>
        <p>${elements.length} Elemen · ${TKJ_ORDER.length} Topik · Pengayaan &amp; Kuis (KKM 75)</p>
        <div class="hero-pills">
            <button type="button" class="hero-pill" onclick="showPage('intro')"><i class="fas fa-graduation-cap"></i> Capaian</button>
            <button type="button" class="hero-pill" onclick="showPage('pengayaan')"><i class="fas fa-book-reader"></i> Pengayaan (${TKJ_ORDER.length})</button>
            <button type="button" class="hero-pill" onclick="showPage('ip')"><i class="fas fa-calculator"></i> Kalkulator IP</button>
            <button type="button" class="hero-pill" onclick="showPage('home')"><i class="fas fa-th-large"></i> Beranda</button>
        </div>
        <div class="hero-stats">
            <div class="hstat"><span class="hstat-num" data-count="${elements.length}">0</span><span class="hstat-lbl">Elemen</span></div>
            <div class="hstat"><span class="hstat-num" data-count="${TKJ_ORDER.length}">0</span><span class="hstat-lbl">Topik</span></div>
            <div class="hstat"><span class="hstat-num" data-count="${tkjTotalQ}">0</span><span class="hstat-lbl">Soal</span></div>
        </div>
    </div>

    <div class="card">
        <div class="home-section-head">
            <div>
                <div class="home-section-title">Kurikulum 5 Elemen (E1–E5)</div>
            </div>
            <span class="tag blue">${doneCount}/${TKJ_ORDER.length} selesai (${pct}%)</span>
        </div>
        <div class="learn-progress" style="margin-bottom:20px"><span style="width:${pct}%"></span></div>

        ${elements.map(el => {
            const elDone = el.topics.filter(([,,p]) => !!doneTkj[p] || progress[p] !== undefined).length;
            return `
            <div class="el-group">
                <div class="el-group-head">
                    <span class="snav-badge ${el.cls}">${el.code}</span>
                    <strong>${el.name}</strong>
                    <span class="el-group-count">${elDone}/${el.topics.length} selesai</span>
                </div>
                <div class="module-grid">
                    ${el.topics.map(([em,t,p,desc])=>{
                        const isDone = !!doneTkj[p];
                        const sc = progress[p];
                        return `
                    <div class="module-card" data-el="${el.code}" onclick="showPage('${p}')">
                        <div class="mc-top">
                            <div class="mc-emoji">${em}</div>
                            <span class="mc-badge el-${el.cls}">${el.code}</span>
                        </div>
                        <div class="mc-title">${t}</div>
                        <div class="mc-sub">${desc}</div>
                        ${sc !== undefined ? `<div class="mc-status ${sc>=75?'ok':'warn'}"><i class="fas fa-check-circle"></i> Kuis: ${sc}%</div>` : isDone ? `<div class="mc-status ok"><i class="fas fa-check"></i> Selesai dibaca</div>` : ''}
                        <div class="mc-actions">
                            <button type="button" class="mc-act-btn" onclick="event.stopPropagation();showPage('${p}')"><i class="fas fa-book"></i> Materi</button>
                            <button type="button" class="mc-act-btn quiz" onclick="event.stopPropagation();showAssessment('${p}')"><i class="fas fa-tasks"></i> Kuis</button>
                        </div>
                    </div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('')}
    </div>

    <div class="card">
        <div class="home-section-head">
            <div class="home-section-title">Lab Interaktif</div>
        </div>
        <div class="quick-grid">
            <button class="quick-card" onclick="showPage('topologi')">
                <img class="qci-img" src="assets/ppt/ikon-tower.png" alt="" loading="lazy">
                <div class="qc-body"><strong>Penjelajah Topologi</strong><small>Simulasi Bus, Star, Ring &amp; Mesh</small></div>
            </button>
            <button class="quick-card" onclick="showPage('ip')">
                <img class="qci-img" src="assets/ppt/ikon-cloud-server.png" alt="" loading="lazy">
                <div class="qc-body"><strong>Kalkulator Subnetting</strong><small>CIDR, VLSM &amp; IPv4</small></div>
            </button>
            <button class="quick-card" onclick="showPage('peralatan')">
                <img class="qci-img" src="assets/ppt/ikon-teknisi.png" alt="" loading="lazy">
                <div class="qc-body"><strong>Tebak Perangkat</strong><small>Identifikasi perangkat fisik</small></div>
            </button>
            <button class="quick-card" onclick="showPage('glosarium')">
                <img class="qci-img" src="assets/ppt/ikon-badge.png" alt="" loading="lazy">
                <div class="qc-body"><strong>Flashcard Glosarium</strong><small>130+ istilah jaringan</small></div>
            </button>
        </div>
    </div>

    ${progress && Object.keys(progress).length ? `
    <div class="card card-sm">
        <div class="home-section-head" style="margin-bottom:10px">
            <div class="home-section-title" style="margin-bottom:0">Progress Asesmen Terakhir</div>
            <button class="btn-ghost" onclick="showPage('progress')"><i class="fas fa-chart-bar"></i> Rekap Lengkap</button>
        </div>
        ${Object.entries(progress).slice(0,4).map(([k,v])=>{
            const nm={
                topologi:'Topologi',kebutuhan:'Kebutuhan',peralatan:'Peralatan',ip:'IP & Subnetting',
                kabel:'Kabel',nirkabel:'Nirkabel',fiber:'Fiber Optic',
                keamanan:'Keamanan',firewall:'Firewall',kriptografi:'Kriptografi',
                vlan:'VLAN',routing:'Routing',nat:'NAT Gateway',
                linux:'Linux OS',server:'Server',
                fo_tp11:'FO: K3LH',fo_tp12:'FO: Instalasi',fo_tp13:'FO: Konektor',
                fo_tp21:'FO: Splicing',fo_tp22:'FO: OPM',fo_tp23:'FO: OTDR',fo_tp24:'FO: Laporan'
            };
            const c = v>=75?'var(--green-500)':v>=60?'var(--orange-500)':'var(--red-500)';
            const tc = v>=75?'var(--green-600)':v>=60?'var(--orange-600)':'var(--red-600)';
            return `<div class="prog-item" style="margin-bottom:10px"><div class="prog-row"><span class="prog-name">${nm[k]||k}</span><span class="prog-score" style="color:${tc}">${v}%</span></div><div class="prog-bar"><div class="prog-fill" style="width:${v}%;background:${c}"></div></div></div>`;
        }).join('')}
    </div>` : ''}`;
}

// ============================================================
// INTRO PAGE
// ============================================================
function intro() {
    return `
    <div class="card">
        ${sectionHead('fa-graduation-cap','Capaian Pembelajaran – Fase F (Kurikulum Nasional)')}
        ${callout('info','fa-info-circle','Struktur Kurikulum Nasional & Standar Industri','Berdasarkan <strong>Kepmendikbudristek No. 032/H/KR/2024 (CP SMK/MAK Fase F TJKT)</strong> &amp; <strong>SKKNI Jaringan Komputer (Kepmenaker No. 321/2016)</strong>:<br><strong>Konsentrasi Program Keahlian TKJ:</strong> 5 Elemen (15 topik · 310 soal).<br><strong>Mapel Pilihan Fiber Optik:</strong> 7 TP praktik industri (160 soal). Total: <strong>470 soal</strong> (Target lulus: <strong>KKM 75</strong>).')}

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0">
            <button class="btn-primary" onclick="showPage('topologi')"><i class="fas fa-play"></i> Mulai Topik 1: Topologi</button>
            <button class="btn-ghost" onclick="showPage('tkj')"><i class="fas fa-th-large"></i> Peta Materi TKJ</button>
        </div>

        ${illo('peta-jaringan-scope.svg','Peta cakupan jaringan: PAN → LAN → MAN → WAN hingga Internet','Peta scope jaringan dari PAN hingga Internet')}
        ${illo('packet-journey.svg','Proses Enkapsulasi & Dekapsulasi PDU pada Model OSI (7 Layer): Application Data → L4 Segment (TCP/UDP) → L3 Packet (IP) → L2 Frame (Ethernet MAC) → L1 Bits','Ilustrasi perjalanan paket data dan enkapsulasi model OSI')}

        <h3 class="sub-head">5 Elemen Capaian Pembelajaran Fase F (Kelas XI &amp; XII)</h3>
        <ul class="step-list">
            ${stepItem('E1','Perencanaan dan Pengalamatan Jaringan','Merencanakan topologi & arsitektur jaringan, mengumpulkan kebutuhan teknis pengguna (SLA/QoS), menginventarisasi perangkat aktif/pasif, serta merancang pengalamatan IPv4/IPv6, CIDR, VLSM, dan subnetting (RFC 1918/4632).')}
            ${stepItem('E2','Teknologi Jaringan Kabel dan Nirkabel','Menginstalasi pengkabelan terstruktur UTP/STP (ANSI/TIA-568.2-D T568A/B), jaringan serat optik (ITU-T G.652/G.657, GPON FTTH, fusion splicing, OPM & OTDR), serta merancang dan mengamankan WLAN IEEE 802.11ax/be (Wi-Fi 6/7).')}
            ${stepItem('E3','Keamanan Jaringan','Menerapkan kebijakan keamanan berlapis (Defense-in-Depth & CIA Triad), mitigasi serangan L2–L7, konfigurasi Stateful Firewall, DMZ & ACL (Cisco IOS, MikroTik Filter, Linux UFW), IDS/IPS, autentikasi 802.1X/RADIUS, serta kriptografi modern (AES-256, RSA/ECC, SHA-256, TLS 1.3/PKI).')}
            ${stepItem('E4','Pemasangan dan Konfigurasi Perangkat Jaringan','Mengonfigurasi segmentasi VLAN & trunking IEEE 802.1Q, Inter-VLAN Routing (Router-on-a-Stick & L3 Switch SVI), routing statis dan dinamis (RIPv2, OSPFv2, BGP-4), serta NAT/PAT (Masquerade), Port Forwarding (DSTNAT), dan Internet Gateway.')}
            ${stepItem('E5','Administrasi Sistem Jaringan','Menginstalasi dan mengadministrasi sistem operasi jaringan Linux Server (FHS, POSIX permission, Netplan, systemd, journalctl) serta mengonfigurasi layanan server produksi: DHCP, DNS (BIND9), Web (Apache2/HTTPS), File/FTP (Samba/vsftpd), NTP, dan Remote SSH.')}
        </ul>

        <h3 class="sub-head">Peta Elemen &amp; Tujuan Pembelajaran</h3>
        <div class="accordion">
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e1" style="margin-right:4px">E1</span> Perencanaan &amp; Pengalamatan Jaringan</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Merencanakan topologi jaringan (Bus, Star, Ring, Mesh, Tree, Hybrid)</li><li>Mengidentifikasi dan mendokumentasikan kebutuhan teknis pengguna</li><li>Menginventarisasi peralatan jaringan sesuai teknologi yang digunakan</li><li>Melakukan pengalamatan IP (IPv4 &amp; IPv6), membuat skema CIDR dan VLSM</li><li>Menghitung subnetting dan menentukan network/broadcast/host range tiap subnet</li></ul>
                </div>
            </div>
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e2" style="margin-right:4px">E2</span> Jaringan Kabel &amp; Nirkabel</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Instalasi dan pengujian kabel UTP Cat5e/Cat6 (straight &amp; crossover), standar T568A/B</li><li>Memahami kabel coaxial dan fiber optic (single mode, multi mode)</li><li>Konfigurasi access point WiFi: SSID, channel, security (WPA2/WPA3)</li><li>Memahami standar WiFi IEEE 802.11 a/b/g/n/ac/ax</li><li>Troubleshooting jaringan kabel dan nirkabel</li></ul>
                </div>
            </div>
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e3" style="margin-right:4px">E3</span> Keamanan Jaringan</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Memahami CIA Triad dan jenis-jenis ancaman jaringan</li><li>Mengkonfigurasi Standard ACL dan Extended ACL di Cisco</li><li>Memahami firewall generasi (packet filter, stateful, NGFW)</li><li>Kriptografi simetris (AES), asimetris (RSA), dan hash (SHA)</li><li>IDS/IPS, VPN, autentikasi 802.1X dan RADIUS</li></ul>
                </div>
            </div>
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e4" style="margin-right:4px">E4</span> Konfigurasi Perangkat Jaringan</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Mengkonfigurasi VLAN (access port, trunk port, native VLAN, inter-VLAN routing)</li><li>Mengkonfigurasi routing statis, RIP v2, OSPF single area</li><li>Mengkonfigurasi NAT Static, Dynamic, PAT/Overload</li><li>Mengkonfigurasi Internet Gateway dan default route</li></ul>
                </div>
            </div>
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e5" style="margin-right:4px">E5</span> Sistem Operasi &amp; Server</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Instalasi Ubuntu Server dan perintah dasar Linux CLI</li><li>Konfigurasi IP statis dengan Netplan</li><li>Konfigurasi DHCP Server (isc-dhcp-server), DNS (BIND9), Web (Apache2), FTP (vsftpd), NTP</li><li>Manajemen layanan dengan systemctl dan monitoring dengan journalctl/htop</li></ul>
                </div>
            </div>
        </div>
        ${callout('tip','fa-lightbulb','Cara Belajar Efektif','Baca materi → lihat ilustrasi → coba latihan konfigurasi → kerjakan asesmen 20 soal. Targetkan skor ≥75 sebelum lanjut ke elemen berikutnya.')}

        ${dense('Istilah Dasar yang Wajib Dikuasai',[
            '<strong>Jaringan (network)</strong> = kumpuan perangkat yang saling terhubung untuk berbagi data, sumber daya, dan layanan.',
            '<strong>Protokol</strong> = aturan main komunikasi. TCP/IP adalah protokol dasar internet (HTTP, DNS, SSH, FTP semuanya berjalan di atasnya).',
            '<strong>Bandwidth</strong> = kapasitas maksimum data per detik (bps). <strong>Latency</strong> = waktu tunda dari kirim ke terima (ms). Keduanya sering tertukar — bandwidth besar ≠ selalu cepat jika latency tinggi.',
            '<strong>ISP</strong> = penyedia layanan internet. <strong>Modem/ONT</strong> = perangkat penghubung jaringan rumah ke ISP.'
        ],[
            ['LAN','Jaringan lokal (gedung/sekolah)'],
            ['WAN','Jaringan luas (antar kota/negara)'],
            ['TCP/IP','Protokol dasar komunikasi internet'],
            ['Bandwidth','Kapasitas data per detik'],
            ['Latency','Waktu tunda paket (ms)'],
            ['ISP','Penyedia layanan internet']
        ],[
            'Hafal 5 istilah di atas dulu — hampir semua soal Fase F memakai kosakata ini.',
            'Bingung beda bandwidth vs latency? Bandwidth = lebar jalan raya, latency = waktu tempuh satu mobil.'
        ])}
    </div>`;
}


// ============================================================
// E1 — TOPOLOGI JARINGAN
// ============================================================
function topologi() {
    return `
    <div class="card">
        ${sectionHead('fa-sitemap','Topologi & Arsitektur Jaringan','sh-blue')}
        ${callout('info','fa-lightbulb','Mengapa Topologi Penting?','Topologi jaringan menentukan bagaimana perangkat saling terhubung — mempengaruhi performa, biaya, skalabilitas, dan kemudahan troubleshooting. Memilih topologi yang salah bisa berarti membangun ulang jaringan dari nol.')}
        <div class="img-row">
            <figure><img src="assets/ppt/topologi-bus.png" alt="Topologi Bus — semua host terhubung ke satu kabel backbone coaxial" loading="lazy"><figcaption>Topologi Bus (Backbone Tunggal)</figcaption></figure>
            <figure><img src="assets/ppt/topologi-star.png" alt="Topologi Star — semua host terhubung terpusat ke switch" loading="lazy"><figcaption>Topologi Star (Terpusat di Switch)</figcaption></figure>
            <figure><img src="assets/ppt/topologi-ring.jpg" alt="Topologi Ring — setiap node terhubung melingkar tertutup" loading="lazy"><figcaption>Topologi Ring (Cincin Tertutup)</figcaption></figure>
            <figure><img src="assets/ppt/topologi-tree.png" alt="Topologi Tree — hierarki switch akses yang terhubung ke jalur backbone" loading="lazy"><figcaption>Topologi Tree (Hierarki Extended Star)</figcaption></figure>
        </div>

        <h3 class="sub-head">Definisi</h3>
        <p><strong>Topologi Fisik</strong> adalah tata letak perangkat dan media transmisi secara nyata (kabel, posisi perangkat). <strong>Topologi Logis</strong> adalah bagaimana data sebenarnya mengalir dalam jaringan, terlepas dari susunan fisiknya.</p>
        <p><strong>Arsitektur Jaringan</strong> adalah rancangan menyeluruh yang meliputi topologi, protokol komunikasi, perangkat keras, perangkat lunak, dan standar yang digunakan.</p>

        <h3 class="sub-head">Ilustrasi Topologi Jaringan</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 780 260" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <marker id="ar" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><circle cx="3" cy="3" r="2" fill="#94a3b8"/></marker>
                </defs>
                <!-- BUS -->
                <text x="78" y="18" fill="#1e40af" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Bus</text>
                <rect x="10" y="100" width="136" height="6" rx="3" fill="#3b82f6"/>
                <circle cx="34" cy="70" r="13" fill="#2563eb"/>
                <text x="34" y="74" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC1</text>
                <line x1="34" y1="83" x2="34" y2="100" stroke="#94a3b8" stroke-width="1.5"/>
                <circle cx="78" cy="70" r="13" fill="#2563eb"/>
                <text x="78" y="74" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC2</text>
                <line x1="78" y1="83" x2="78" y2="100" stroke="#94a3b8" stroke-width="1.5"/>
                <circle cx="122" cy="70" r="13" fill="#2563eb"/>
                <text x="122" y="74" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC3</text>
                <line x1="122" y1="83" x2="122" y2="100" stroke="#94a3b8" stroke-width="1.5"/>
                <text x="78" y="130" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Backbone tunggal</text>
                <!-- STAR -->
                <text x="258" y="18" fill="#1e40af" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Star</text>
                <rect x="243" y="93" width="30" height="20" rx="5" fill="#f97316"/>
                <text x="258" y="107" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">SW</text>
                <circle cx="210" cy="55" r="13" fill="#2563eb"/><line x1="220" y1="65" x2="246" y2="96" stroke="#94a3b8" stroke-width="1.5"/>
                <circle cx="258" cy="45" r="13" fill="#2563eb"/><line x1="258" y1="58" x2="258" y2="93" stroke="#94a3b8" stroke-width="1.5"/>
                <circle cx="306" cy="55" r="13" fill="#2563eb"/><line x1="296" y1="65" x2="270" y2="96" stroke="#94a3b8" stroke-width="1.5"/>
                <circle cx="210" cy="145" r="13" fill="#2563eb"/><line x1="220" y1="135" x2="246" y2="115" stroke="#94a3b8" stroke-width="1.5"/>
                <circle cx="306" cy="145" r="13" fill="#2563eb"/><line x1="296" y1="135" x2="270" y2="115" stroke="#94a3b8" stroke-width="1.5"/>
                <text x="258" y="175" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Switch sebagai pusat</text>
                <!-- RING -->
                <text x="450" y="18" fill="#1e40af" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Ring</text>
                <circle cx="450" cy="100" r="55" fill="none" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,3"/>
                <circle cx="450" cy="45" r="13" fill="#2563eb"/>
                <circle cx="500" cy="72" r="13" fill="#2563eb"/>
                <circle cx="500" cy="128" r="13" fill="#2563eb"/>
                <circle cx="450" cy="155" r="13" fill="#2563eb"/>
                <circle cx="400" cy="128" r="13" fill="#2563eb"/>
                <circle cx="400" cy="72" r="13" fill="#2563eb"/>
                <polyline points="450,58 497,79 497,121 450,142 403,121 403,79 450,58" fill="none" stroke="#3b82f6" stroke-width="2"/>
                <text x="450" y="185" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Data satu arah</text>
                <!-- MESH -->
                <text x="638" y="18" fill="#1e40af" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Mesh</text>
                <circle cx="598" cy="60" r="13" fill="#2563eb"/>
                <circle cx="678" cy="60" r="13" fill="#2563eb"/>
                <circle cx="598" cy="140" r="13" fill="#2563eb"/>
                <circle cx="678" cy="140" r="13" fill="#2563eb"/>
                <circle cx="638" cy="100" r="13" fill="#9333ea"/>
                <line x1="611" y1="60" x2="625" y2="100" stroke="#3b82f6" stroke-width="1.5"/>
                <line x1="665" y1="60" x2="651" y2="100" stroke="#3b82f6" stroke-width="1.5"/>
                <line x1="611" y1="140" x2="625" y2="110" stroke="#3b82f6" stroke-width="1.5"/>
                <line x1="665" y1="140" x2="651" y2="110" stroke="#3b82f6" stroke-width="1.5"/>
                <line x1="611" y1="60" x2="665" y2="60" stroke="#94a3b8" stroke-width="1"/>
                <line x1="611" y1="140" x2="665" y2="140" stroke="#94a3b8" stroke-width="1"/>
                <line x1="598" y1="73" x2="598" y2="127" stroke="#94a3b8" stroke-width="1"/>
                <line x1="678" y1="73" x2="678" y2="127" stroke="#94a3b8" stroke-width="1"/>
                <line x1="609" y1="71" x2="667" y2="129" stroke="#e2e8f0" stroke-width="1"/>
                <line x1="667" y1="71" x2="609" y2="129" stroke="#e2e8f0" stroke-width="1"/>
                <text x="638" y="175" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Fully redundant</text>
                <!-- Labels bottom -->
                <text x="390" y="230" fill="#334155" font-size="10" font-weight="600" text-anchor="middle" font-family="Inter,sans-serif">SW = Switch (pusat)   ■ = PC/Host   ● = Router/Node</text>
            </svg>
        </div>
        <p class="illus-caption">Perbandingan 4 topologi utama: Bus, Star, Ring, dan Full Mesh</p>

        <h3 class="sub-head">🧭 Penjelajah Topologi Interaktif</h3>
        <p>Ketuk setiap topologi untuk melihat diagram asli dan membandingkan kelebihan/kekurangannya.</p>
        ${topoExplorer()}

        <h3 class="sub-head">Jenis Topologi Jaringan</h3>
        <div class="feat-grid">
            ${featCard('🚌','Topologi Bus','Semua node terhubung ke satu kabel backbone. Data mengalir dua arah. Murah, tapi jika kabel putus seluruh jaringan mati.')}
            ${featCard('⭐','Topologi Star','Semua node terhubung ke switch/hub pusat. Paling umum di LAN. Fault isolation baik — satu putus tidak ganggu lain.')}
            ${featCard('💍','Topologi Ring','Node membentuk cincin tertutup. Data satu arah. Redundan namun sulit maintenance jika satu titik putus.')}
            ${featCard('🕸️','Topologi Mesh','Setiap node terhubung ke semua node lain. Sangat redundan, digunakan di WAN backbone dan internet.')}
            ${featCard('🌳','Topologi Tree','Hierarki seperti pohon (gabungan Star + Bus). Skalabel, umum di jaringan enterprise dan kampus.')}
            ${featCard('🔀','Topologi Hybrid','Kombinasi 2+ topologi. Fleksibel dan skalabel untuk kebutuhan jaringan kompleks.')}
        </div>

        <h3 class="sub-head">Perbandingan Topologi</h3>
        ${tbl(['Topologi','Kelebihan','Kekurangan','Penggunaan'],[
            ['Bus','Murah, mudah pasang','Bottleneck; seluruh JBN mati jika kabel putus','Jaringan temp./kecil'],
            ['Star','Fault isolation, mudah kelola','Bergantung switch pusat','LAN kantor, sekolah'],
            ['Ring','Performa stabil','Satu titik putus → semua terganggu','Token Ring, FDDI'],
            ['Mesh','Sangat redundan','Biaya tinggi, kompleks','Backbone WAN, Internet'],
            ['Tree','Skalabel, hierarkis','Bergantung backbone','Enterprise, kampus'],
            ['Hybrid','Fleksibel, optimal','Kompleks, mahal','Data center, ISP'],
        ])}

        <h3 class="sub-head">Arsitektur Jaringan</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="arch-cs">Client-Server</button>
                <button class="tab-btn" data-tab="arch-p2p">Peer-to-Peer</button>
                <button class="tab-btn" data-tab="arch-3t">Three-Tier</button>
                <button class="tab-btn" data-tab="arch-sd">Software-Defined</button>
            </div>
            <div id="arch-cs" class="tab-pane active">
                <p>Model paling umum di enterprise. <strong>Server</strong> menyediakan layanan terpusat (file, email, web, database) dan banyak <strong>client</strong> mengaksesnya.</p>
                ${tags(tag('✅ Terpusat & mudah dikelola','green'),tag('✅ Keamanan lebih baik','green'),tag('❌ Biaya server tinggi','red'),tag('❌ Single point of failure','red'))}
            </div>
            <div id="arch-p2p" class="tab-pane">
                <p>Setiap node berperan sebagai client sekaligus server. Tidak ada server khusus — berbagi langsung antar perangkat.</p>
                ${tags(tag('✅ Murah, tidak perlu server','green'),tag('❌ Keamanan lemah','red'),tag('❌ Tidak skalabel','red'))}
                <p><em>Contoh:</em> Jaringan rumahan, BitTorrent, game LAN</p>
            </div>
            <div id="arch-3t" class="tab-pane">
                <div class="illus-wrap">
                    <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="max-height:180px">
                        <rect x="150" y="10" width="200" height="40" rx="8" fill="#1e40af"/><text x="250" y="35" fill="white" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Core Layer (Backbone)</text>
                        <rect x="100" y="80" width="300" height="40" rx="8" fill="#2563eb"/><text x="250" y="105" fill="white" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Distribution Layer (Routing/Policy)</text>
                        <rect x="50" y="150" width="400" height="40" rx="8" fill="#3b82f6"/><text x="250" y="175" fill="white" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Access Layer (Koneksi End-Device)</text>
                        <line x1="250" y1="50" x2="250" y2="80" stroke="#94a3b8" stroke-width="2"/>
                        <line x1="250" y1="120" x2="250" y2="150" stroke="#94a3b8" stroke-width="2"/>
                    </svg>
                </div>
                <p><strong>Core:</strong> Routing cepat antar distribution. <strong>Distribution:</strong> Policy, inter-VLAN routing, summarization. <strong>Access:</strong> Koneksi langsung ke PC, IP phone, AP.</p>
            </div>
            <div id="arch-sd" class="tab-pane">
                <p><strong>SDN (Software-Defined Networking)</strong> memisahkan <em>control plane</em> (logika routing) dari <em>data plane</em> (forwarding). Controller terpusat mengatur semua perangkat melalui API.</p>
                ${tags(tag('✅ Otomasi penuh','green'),tag('✅ Mudah diprogram','green'),tag('✅ Cocok untuk cloud','green'),tag('❌ Perlu keahlian khusus','amber'))}
                <p><em>Contoh:</em> OpenFlow, Cisco ACI, VMware NSX</p>
            </div>
        </div>

        <h3 class="sub-head">Langkah Merencanakan Topologi</h3>
        <ul class="step-list">
            ${stepItem(1,'Identifikasi Kebutuhan','Tujuan jaringan, jumlah user, jenis perangkat, aplikasi yang digunakan, anggaran yang tersedia.')}
            ${stepItem(2,'Pilih Topologi yang Tepat','Sesuaikan dengan skala, anggaran, kebutuhan redundansi, dan kemudahan management.')}
            ${stepItem(3,'Pilih Perangkat Jaringan','Router, switch (managed/unmanaged), access point, dan media transmisi yang sesuai.')}
            ${stepItem(4,'Rancang Skema Pengalamatan IP','Buat IP plan: subnet, VLAN, gateway untuk setiap segmen jaringan.')}
            ${stepItem(5,'Buat Dokumentasi Lengkap','Network diagram, IP table, daftar perangkat, konfigurasi baseline — semua terdokumentasi.')}
        </ul>
        ${callout('success','fa-check-circle','Tips Profesional','Gunakan alat seperti draw.io, Cisco Packet Tracer, atau GNS3 untuk membuat diagram dan simulasi topologi sebelum implementasi nyata.')}

        ${illo('topologi-tree-hybrid.svg','Topologi Tree (hierarki) dan Hybrid (gabungan) — populer di jaringan sekolah & kampus','Ilustrasi topologi tree dan hybrid jaringan')}

        ${dense('Inti Topologi — Poin Ujian',[
            '<strong>Topologi fisik</strong> = tata letak nyata kabel & perangkat. <strong>Topologi logis</strong> = cara data mengalir. Soal sering meminta perbedaan keduanya.',
            'Bus: murah tapi satu putus → mati total. Star: paling umum, mudah isolasi gangguan. Ring: stabil tapi sulit direparasi. Mesh: sangat redundan tapi mahal.',
            'Tree = gabungan Star + Bus (hierarkis). Hybrid = kombinasi 2+ topologi, fleksibel untuk jaringan kompleks.',
            'Arsitektur <strong>Three-Tier</strong>: Core (backbone cepat) → Distribution (kebijakan/policy) → Access (koneksi PC/AP).',
            'Perencanaan wajib berurutan: kebutuhan → pilih topologi → pilih perangkat → skema IP → dokumentasi.'
        ],[
            ['Fault isolation','Kemampuan menemukan titik gangguan dengan cepat'],
            ['Redundansi','Jalur cadangan agar jaringan tetap jalan saat ada putus'],
            ['Backbone','Kabel utama penghubung antar segmen jaringan'],
            ['SDN','Software-Defined Networking — kontrol terpusat via software']
        ],[
            'Soal favorit: "topologi mana yang tetap berfungsi bila satu kabel putus?" → jawabannya Star (dan Mesh).',
            'Skala penggunaan: Bus/Star untuk LAN kecil, Tree/Hybrid untuk kampus & enterprise, Mesh untuk WAN backbone.'
        ])}
        <button class="btn-primary" onclick="showAssessment('topologi')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Topologi (20 Soal)</button>
    </div>`;
}


// ============================================================
// E1 — KEBUTUHAN TEKNIS
// ============================================================
function kebutuhan() {
    return `<div class="card">
        ${sectionHead('fa-clipboard-list','Kebutuhan Teknis Pengguna Jaringan','sh-blue')}
        <p>Sebelum merancang jaringan, seorang <em>network engineer</em> wajib mengumpulkan dan menganalisis <strong>kebutuhan teknis</strong> pengguna secara menyeluruh. Langkah ini menentukan apakah jaringan yang dibangun tepat sasaran, memenuhi SLA/QoS, dan sesuai anggaran.</p>
        ${pptGallery([
            ['ikon-teknisi.png','Survei & Wawancara Teknis','Menggali kebutuhan pengguna, lokasi dead-zone, dan jumlah perangkat di lapangan'],
            ['ikon-cloud-server.png','Kapasitas Bandwidth & Server','Menentukan throughput LAN/WAN, beban concurrent user, serta layanan aplikasi'],
            ['ikon-keamanan.png','Target SLA & Keamanan','Menetapkan standar uptime 99,5%+, latensi <150 ms (ITU-T G.114), dan segmentasi VLAN'],
        ])}

        <h3 class="sub-head">Kategori Kebutuhan Teknis</h3>
        <div class="flip-grid">
            <div class="flip-card"><div class="flip-inner"><div class="flip-front"><i class="fas fa-desktop"></i><span>Hardware</span></div><div class="flip-back"><p>Jenis & jumlah: PC, server, printer, router, switch, AP, kabel</p></div></div></div>
            <div class="flip-card"><div class="flip-inner"><div class="flip-front"><i class="fas fa-laptop-code"></i><span>Software</span></div><div class="flip-back"><p>Sistem operasi, aplikasi, driver, lisensi yang dibutuhkan</p></div></div></div>
            <div class="flip-card"><div class="flip-inner"><div class="flip-front"><i class="fas fa-globe"></i><span>Konektivitas</span></div><div class="flip-back"><p>Internet speed, LAN speed, jumlah concurrent user</p></div></div></div>
            <div class="flip-card"><div class="flip-inner"><div class="flip-front"><i class="fas fa-shield-alt"></i><span>Keamanan</span></div><div class="flip-back"><p>Firewall, VPN, autentikasi, enkripsi, level akses per user</p></div></div></div>
            <div class="flip-card"><div class="flip-inner"><div class="flip-front"><i class="fas fa-tachometer-alt"></i><span>Performa</span></div><div class="flip-back"><p>Bandwidth, latency, throughput, uptime SLA yang diharapkan</p></div></div></div>
            <div class="flip-card"><div class="flip-inner"><div class="flip-front"><i class="fas fa-expand-arrows-alt"></i><span>Skalabilitas</span></div><div class="flip-back"><p>Rencana pertumbuhan: tambah user/perangkat 2-5 tahun ke depan</p></div></div></div>
        </div>
        <p class="flip-hint"><i class="fas fa-hand-pointer"></i> Klik kartu untuk melihat detail</p>

        <h3 class="sub-head">Teknik Pengumpulan Kebutuhan</h3>
        <div class="accordion">
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left"><i class="fas fa-comments" style="color:#3b82f6;margin-right:8px"></i>Wawancara (Interview)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Tanya-jawab langsung dengan pengguna, manajer, atau staf IT. Teknik paling efektif untuk menggali kebutuhan yang tidak terungkap dalam survei tulisan.</p>
            <p><strong>Contoh pertanyaan:</strong></p><ul><li>Aplikasi apa yang paling sering digunakan?</li><li>Berapa banyak file yang ditransfer setiap hari?</li><li>Apakah sering mengalami koneksi lambat? Kapan biasanya?</li><li>Apakah ada data sensitif yang perlu dienkripsi?</li></ul></div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left"><i class="fas fa-poll" style="color:#f97316;margin-right:8px"></i>Kuesioner / Survei</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Form pertanyaan disebarkan ke banyak pengguna sekaligus. Efisien untuk data kuantitatif dari banyak responden.</p>${tags(tag('✅ Efisien untuk banyak responden','green'),tag('❌ Jawaban kurang mendalam','amber'))}</div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left"><i class="fas fa-eye" style="color:#22c55e;margin-right:8px"></i>Observasi Langsung</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Mengamati cara pengguna bekerja dan menggunakan jaringan saat ini. Sangat berguna untuk menemukan bottleneck yang mungkin tidak disadari pengguna sendiri.</p></div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left"><i class="fas fa-chart-bar" style="color:#a855f7;margin-right:8px"></i>Analisis Log & Monitoring</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Menganalisis log traffic jaringan, laporan error, dan data monitoring untuk memahami pola penggunaan nyata.</p><p><strong>Tools:</strong> Wireshark, PRTG Network Monitor, Nagios, Zabbix, Grafana</p></div></div>
        </div>

        <h3 class="sub-head">Template Dokumentasi Kebutuhan</h3>
        ${tbl(['Kategori','Spesifikasi','Prioritas','Keterangan'],[
            ['Perangkat Keras','20 PC, 2 Printer, 1 Router, 2 Switch L2, 1 AP','🔴 Tinggi','Pengadaan segera'],
            ['Perangkat Lunak','Windows 11, MS Office, Antivirus','🟡 Sedang','Update berkala'],
            ['Konektivitas','Internet 100 Mbps (dedicated), LAN 1 Gbps','🔴 Tinggi','SLA 99.5% uptime'],
            ['Keamanan','Firewall, VPN, 802.1X auth','🔴 Tinggi','Mandatory compliance'],
            ['Performa','Latency &lt;5ms, uptime 99.9%','🟡 Sedang','Tergantung ISP'],
            ['Skalabilitas','Siap +50 user, +2 AP dalam 3 tahun','🟢 Rendah','Perencanaan jangka panjang'],
        ])}
        ${callout('warning','fa-exclamation-triangle','Perhatian!','Jangan langsung membangun jaringan tanpa analisis kebutuhan yang matang. Kesalahan di tahap ini berdampak besar: jaringan tidak sesuai kebutuhan, pemborosan anggaran, dan sulit dikembangkan.')}

        <h3 class="sub-head">Studi Kasus: Lab Komputer 30 PC</h3>
        <p>Contoh penerapan analisis kebutuhan untuk <strong>laboratorium komputer 30 PC</strong> di sekolah:</p>
        ${tbl(['Aspek','Kebutuhan','Prioritas','Alasan'],[
            ['Konektivitas','Internet 50 Mbps, LAN 1 Gbps','🔴 Tinggi','30 PC + 1 server untuk browsing & praktikum'],
            ['Perangkat','1 Router, 2 Switch L2, 1 AP','🔴 Tinggi','Segmentasi lab dan ruang guru'],
            ['Pengalamatan','192.168.10.0/24 (server IP static)','🔴 Tinggi','Mudah dikelola, dipantau, dan dipetakan'],
            ['Keamanan','Firewall + VLAN + filter MAC','🟡 Sedang','Batasi akses siswa ke situs tertentu'],
            ['Performa','Uptime 99%, latency &lt;5 ms','🟡 Sedang','Praktikum tidak boleh terganggu'],
            ['Skalabilitas','Siap +10 PC dan +1 AP','🟢 Rendah','Rencana penambahan kelas tahun depan'],
        ])}
        <p><strong>Tips:</strong> mulai dari kebutuhan <em>konektivitas &amp; keamanan</em> (prioritas tinggi), baru performa dan skalabilitas. Tabel ini juga menjadi dasar RAB pengadaan perangkat.</p>

        ${illo('analisis-kebutuhan.svg','Alur analisis kebutuhan: identifikasi → pengumpulan → analisis prioritas → dokumentasi','Ilustrasi alur analisis kebutuhan teknis jaringan')}

        ${dense('Analisis Kebutuhan — Inti Materi',[
            'Enam kategori kebutuhan: <strong>hardware, software, konektivitas, keamanan, performa, skalabilitas</strong>. Semua wajib terisi sebelum rancang bangun.',
            'Empat teknik pengumpulan: <strong>wawancara</strong> (paling mendalam), <strong>kuesioner</strong> (banyak responden), <strong>observasi langsung</strong>, <strong>analisis log/monitoring</strong> (Wireshark, Zabbix).',
            'Dokumentasikan dalam tabel: kategori → spesifikasi → prioritas (🔴/🟡/🟢) → keterangan. Tabel ini jadi acuan pengadaan perangkat.',
            'Patokan performa wajar (ITU-T G.114): latency satu arah &lt;150 ms (&lt;5 ms dalam LAN), jitter &lt;30 ms, packet loss &lt;1%, uptime SLA 99,5%–99,9%.',
            'Skalabilitas = rencana pertumbuhan 2–5 tahun ke depan (tambahan user, AP, lantai gedung).'
        ],[
            ['SLA','Janji layanan dari penyedia — mis. uptime 99,5%'],
            ['Throughput','Volume data sukses per detik yang benar-benar terkirim'],
            ['Concurrent user','Jumlah pengguna aktif bersamaan'],
            ['Bottleneck','Titik paling lambat yang menahan kinerja seluruh jaringan']
        ],[
            'Interview wajib tanya 3 hal: aplikasi apa yang dipakai, berapa banyak transfer data, kapan jam sibuk.',
            'Soal biasanya minta menyusun tabel prioritas — ingat: keamanan & konektivitas = prioritas tinggi.'
        ])}
        <button class="btn-primary" onclick="showAssessment('kebutuhan')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Kebutuhan Teknis (20 Soal)</button>
    </div>`;
}

// ============================================================
// E1 — PERALATAN JARINGAN
// ============================================================
function peralatan() {
    return `<div class="card">
        ${sectionHead('fa-tools','Peralatan Jaringan & Teknologinya','sh-blue')}
        <p>Memahami fungsi setiap perangkat jaringan adalah fondasi penting sebelum merancang dan membangun jaringan. Setiap perangkat beroperasi di layer OSI yang berbeda dan memiliki peran spesifik.</p>

        <h3 class="sub-head">Model OSI &amp; Pemetaan Layer Perangkat</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 760 236" xmlns="http://www.w3.org/2000/svg">
                <rect width="760" height="236" rx="14" fill="#f8fafc"/>
                <text x="115" y="22" fill="#1e3a8a" font-size="11.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">7 LAYER MODEL OSI</text>
                <text x="485" y="22" fill="#1e3a8a" font-size="11.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">PERANGKAT JARINGAN &amp; UNIT DATA (PDU)</text>
                ${[
                    ['7 · Application','#1e3a8a','white','Data','Server (Web, DNS, DHCP, Mail) & Aplikasi','#0f766e'],
                    ['6 · Presentation','#1e40af','white','Data','SSL/TLS Encryption & Format Data','#0d9488'],
                    ['5 · Session','#1d4ed8','white','Data','Manajemen Sesi & Soket Aplikasi','#0284c7'],
                    ['4 · Transport','#2563eb','white','Segment','Firewall (L3–L7 Stateful/NGFW) & Load Balancer','#ef4444'],
                    ['3 · Network','#3b82f6','white','Packet (IP)','Router & Layer 3 Switch (Tabel Routing / IP)','#f97316'],
                    ['2 · Data Link','#60a5fa','#0f172a','Frame (MAC)','Switch L2, Access Point Wi-Fi & NIC (MAC Address)','#16a34a'],
                    ['1 · Physical','#93c5fd','#0f172a','Bits (0 & 1)','Hub, Repeater, Modem/ONT, Transceiver SFP & Kabel','#64748b']
                ].map(([l,c,tc,pdu,dev,dc],i)=>{
                    const y = 32 + i*28;
                    return `
                    <rect x="18" y="${y}" width="190" height="24" rx="6" fill="${c}"/>
                    <text x="113" y="${y+16}" fill="${tc}" font-size="10.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Layer ${l}</text>
                    <line x1="208" y1="${y+12}" x2="238" y2="${y+12}" stroke="${dc}" stroke-width="2" stroke-dasharray="3,2"/>
                    <rect x="238" y="${y}" width="102" height="24" rx="6" fill="#e2e8f0"/>
                    <text x="289" y="${y+16}" fill="#1e293b" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Fira Code,monospace">${pdu}</text>
                    <line x1="340" y1="${y+12}" x2="365" y2="${y+12}" stroke="${dc}" stroke-width="2"/>
                    <rect x="365" y="${y}" width="376" height="24" rx="6" fill="${dc}"/>
                    <text x="553" y="${y+16}" fill="white" font-size="10.2" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">${dev}</text>`;
                }).join('')}
            </svg>
        </div>
        <p class="illus-caption">Perangkat jaringan beroperasi pada layer OSI yang berbeda-beda</p>

        <h3 class="sub-head">Kenali Wujud Nyata Perangkat</h3>
        <p>Berikut foto perangkat jaringan asli yang biasa dijumpai di lapangan — pelajari bentuk fisiknya agar mudah mengenali saat inventarisasi.</p>
        <div class="dev-grid">
            ${[
                ['router.jpg','Router','Layer 3 — teruskan paket antar jaringan berdasar IP (contoh: ASUS, MikroTik, Cisco)'],
                ['switch.jpg','Switch','Layer 2 — teruskan frame berdasar MAC (contoh: D-Link DES-1008A, Cisco C2960)'],
                ['accesspoint.jpg','Access Point','Membuat jaringan WiFi dan menjembatani ke LAN kabel'],
                ['firewall.png','Firewall','Memfilter trafik berdasar aturan keamanan (L3–L7)'],
                ['server.jpg','Server','Menyediakan layanan: DHCP, DNS, Web, File, Mail'],
                ['hub.jpg','Hub','Layer 1 — membagi sinyal ke semua port (sudah usang)'],
                ['modem.jpg','Modem','Modulator-Demodulator — mengubah sinyal digital ↔ analog menuju ISP'],
                ['nic.jpg','NIC','Network Interface Card — kartu jaringan, sumber alamat MAC'],
                ['utp.jpg','Kabel UTP','Media tembaga berpasangan + konektor RJ-45 untuk LAN'],
                ['fiber.jpg','Fiber Optic','Media transmisi pulsa cahaya — bandwidth sangat tinggi'],
                ['coax.jpg','Kabel Koaksial','Inti tembaga berlapis — CCTV, TV kabel, jaringan lama'],
            ].map(([f,n,d]) => `
            <figure class="dev-card">
                <img src="assets/devices/${f}" alt="${n}" loading="lazy" decoding="async">
                <figcaption><strong>${n}</strong><span>${d}</span></figcaption>
            </figure>`).join('')}
        </div>

        <h3 class="sub-head">Galeri Perangkat dari Materi</h3>
        <p>Foto perangkat asli dari slide pembelajaran — pelajari bentuk fisik router enterprise, managed switch, access point, dan kartu jaringan berbagai vendor.</p>
        ${pptGallery([
            ['perangkat-router-mikrotik.jpg','Cisco ISR Enterprise Router','Keluarga router Cisco Integrated Services (ISR) untuk cabang & WAN enterprise'],
            ['perangkat-router-juniper.png','Juniper SSR130 Router','Session Smart Router kelas enterprise & SD-WAN dengan port RJ-45 + SFP'],
            ['perangkat-switch-hp.jpg','MikroTik hAP lite (RB941-2nD)','RouterBOARD SOHO 4-port Fast Ethernet + Wi-Fi 2,4 GHz dengan RouterOS'],
            ['perangkat-router-tplink.jpg','NETGEAR Wireless Router','Router Wi-Fi dual-antenna untuk jaringan rumah & SOHO'],
            ['perangkat-router-linksys.jpg','Linksys WAP54G Access Point','Perangkat Wireless-G Access Point klasik untuk menjembatani Wi-Fi ke LAN'],
            ['perangkat-switch-cisco.jpg','Cisco SG110-24HP PoE Switch','Switch 24-Port Gigabit dengan PoE + 2 slot SFP combo untuk uplink fiber'],
            ['perangkat-router-mikrotik2.jpg','Modular Switch Chassis (48-Port RJ-45)','Modular enterprise switch 48-port RJ-45 kepadatan tinggi untuk core/distribution jaringan'],
            ['perangkat-switch-dlink.jpg','TP-Link TL-SF1024D Switch','Switch Unmanaged 24-Port 10/100 Mbps rackmount untuk distribusi LAN'],
            ['perangkat-switch-stack.png','Cisco Managed Switch Stack','Tumpukan switch PoE managed untuk akses kampus berkapasitas tinggi'],
            ['perangkat-nic-kartu.jpg','Intel Gigabit CT PCIe NIC','Kartu antarmuka jaringan PCI-Express 1000BASE-T berkecepatan Gigabit untuk PC & server'],
            ['perangkat-nic-bnc.png','NIC Combo Legacy (BNC + RJ-45)','Kartu Ethernet klasik dengan port Coaxial BNC (10BASE2) dan UTP RJ-45 (10BASE-T)'],
        ])}

        <h3 class="sub-head">🎮 Mini Game: Tebak Perangkat</h3>
        <p>Perhatikan fotonya, lalu pilih nama perangkat yang tepat. Skor akan muncul di akhir.</p>
        ${tebakPerangkat()}

        <h3 class="sub-head">Perangkat Aktif Jaringan</h3>
        <div class="tab-group">            <div class="tab-list">
                <button class="tab-btn active" data-tab="p-router">Router</button>
                <button class="tab-btn" data-tab="p-switch">Switch</button>
                <button class="tab-btn" data-tab="p-ap">Access Point</button>
                <button class="tab-btn" data-tab="p-firewall">Firewall</button>
                <button class="tab-btn" data-tab="p-server">Server</button>
            </div>
            <div id="p-router" class="tab-pane active">
                <img class="dev-inline" src="assets/devices/router.jpg" alt="Foto router jaringan" loading="lazy">
                <p><strong>Router</strong> beroperasi di Layer 3 (Network). Tugasnya meneruskan paket berdasarkan <strong>IP address</strong> antar jaringan berbeda. Router juga bisa berfungsi sebagai DHCP server, NAT gateway, dan firewall dasar.</p>
                ${tbl(['Merek','Seri Populer','Penggunaan'],[
                    ['Cisco','ISR 4000, ASR 1000','Enterprise, ISP'],
                    ['MikroTik','RB750, CCR Series','SMB, ISP lokal'],
                    ['Ubiquiti','EdgeRouter','Kantor, SMB'],
                    ['Huawei','AR Series','Enterprise'],
                ])}
            </div>
            <div id="p-switch" class="tab-pane">
                <img class="dev-inline" src="assets/devices/switch.jpg" alt="Foto switch jaringan" loading="lazy">
                <p><strong>Switch</strong> beroperasi di Layer 2 (Data Link). Meneruskan frame berdasarkan <strong>MAC address</strong>. Membangun MAC address table secara dinamis.</p>
                ${tbl(['Tipe Switch','Fitur','Contoh'],[
                    ['Unmanaged','Plug-and-play, tidak bisa konfigurasi, tidak ada VLAN','TP-Link TL-SG108'],
                    ['Managed L2','VLAN, STP, LACP, QoS, port mirroring','Cisco C2960, MikroTik CRS'],
                    ['Layer 3 Switch','Semua L2 + inter-VLAN routing (tanpa router terpisah)','Cisco C3850, C9300'],
                    ['PoE Switch','Suplai daya listrik ke AP/IP Camera via kabel ethernet','Cisco SG350-28P'],
                ])}
            </div>
            <div id="p-ap" class="tab-pane">
                <img class="dev-inline" src="assets/devices/accesspoint.jpg" alt="Foto access point WiFi" loading="lazy">
                <p><strong>Access Point (AP)</strong> membuat jaringan WiFi (WLAN) dan menjembatani perangkat nirkabel ke jaringan kabel.</p>
                <p><strong>Mode operasi AP:</strong></p>
                <ul><li><strong>Access Point:</strong> Membuat hotspot WiFi baru dari koneksi LAN kabel</li><li><strong>Repeater/Extender:</strong> Memperkuat dan memperluas jangkauan WiFi yang sudah ada</li><li><strong>Bridge:</strong> Menghubungkan dua lokasi melalui WiFi point-to-point</li><li><strong>Client/Station:</strong> AP menghubungkan perangkat wired ke jaringan WiFi</li></ul>
            </div>
            <div id="p-firewall" class="tab-pane">
                <img class="dev-inline" src="assets/devices/firewall.png" alt="Foto perangkat firewall" loading="lazy">
                <p><strong>Firewall</strong> memfilter traffic berdasarkan aturan keamanan. Dapat beroperasi dari Layer 3 hingga Layer 7.</p>
                ${tbl(['Tipe','Layer','Kemampuan'],[
                    ['Packet Filter','L3-4','Filter IP/port sederhana'],
                    ['Stateful','L3-4','Melacak state koneksi TCP/UDP'],
                    ['Application Layer','L7','Memahami konten aplikasi (HTTP/DNS/dll)'],
                    ['NGFW','L3-7','App control, IPS, SSL inspection, user-identity'],
                ])}
            </div>
            <div id="p-server" class="tab-pane">
                <img class="dev-inline" src="assets/devices/server.jpg" alt="Foto server jaringan" loading="lazy">
                <p><strong>Server</strong> menyediakan layanan kepada client di jaringan. Bisa berupa hardware khusus atau virtualisasi (VM).</p>
                <ul><li><strong>DHCP Server:</strong> Memberikan IP otomatis ke client</li><li><strong>DNS Server:</strong> Menerjemahkan nama domain ke IP</li><li><strong>Web Server:</strong> Menyajikan halaman website (Apache, Nginx)</li><li><strong>File Server:</strong> Berbagi file di jaringan (Samba, NFS)</li><li><strong>Mail Server:</strong> Layanan email (Postfix, Exchange)</li><li><strong>Proxy Server:</strong> Cache dan filter akses internet</li></ul>
            </div>
        </div>

        <h3 class="sub-head">Media Transmisi (Kabel)</h3>
        <div class="dev-grid dev-grid-3">
            ${[
                ['utp.jpg','Kabel UTP (RJ-45)','Tempered twisted pair — murah, mudah pasang, maks 100 m'],
                ['fiber.jpg','Fiber Optic','Pulsa cahaya — bandwidth ratusan Gbps, jarak 100+ km'],
                ['coax.jpg','Kabel Koaksial','Inti tembaga berlapis — tahan interferensi, untuk CCTV'],
            ].map(([f,n,d]) => `
            <figure class="dev-card">
                <img src="assets/devices/${f}" alt="${n}" loading="lazy" decoding="async">
                <figcaption><strong>${n}</strong><span>${d}</span></figcaption>
            </figure>`).join('')}
        </div>
        ${tbl(['Jenis','Bandwidth Maks','Jarak Maks','Biaya','Penggunaan'],[
            ['UTP Cat5e','1 Gbps','100 m','Murah','LAN standar'],
            ['UTP Cat6','10 Gbps','55 m (10G)','Sedang','LAN performa tinggi'],
            ['UTP Cat6A','10 Gbps','100 m','Sedang','Data center, server room'],
            ['Fiber Optic SM','100 Gbps+','100 km+','Mahal','Backbone ISP, antar gedung'],
            ['Fiber Optic MM','10 Gbps','550 m','Mahal','Data center dalam gedung'],
            ['Coaxial RG-6','1 Gbps','500 m','Sedang','CCTV, TV kabel'],
        ])}

        <h3 class="sub-head">Cara Inventarisasi Peralatan</h3>
        <ul class="step-list">
            ${stepItem(1,'Identifikasi Fisik','Catat semua perangkat: router, switch, AP, server, kabel, konektor')}
            ${stepItem(2,'Catat Spesifikasi Teknis','Merek, model, nomor seri, jumlah port, kapasitas, versi firmware')}
            ${stepItem(3,'Dokumentasikan Kondisi','Status: berfungsi normal / perlu perbaikan / usang / perlu upgrade')}
            ${stepItem(4,'Buat Network Diagram','Gambar topologi dengan posisi, IP address, dan koneksi setiap perangkat')}
        </ul>

        ${illo('server-client-services.svg','Model client–server: client meminta layanan, server menyediakan DNS, DHCP, Web, dan FTP','Ilustrasi model client server dan layanan jaringan')}

        ${dense('Peralatan & Layer OSI — Wajib Hafal',[
            'Pemetaan perangkat ke layer: <strong>Hub = L1</strong>, <strong>Switch = L2</strong> (pakai MAC), <strong>Router = L3</strong> (pakai IP), <strong>Firewall = L3–L7</strong>, <strong>Server = L7</strong>.',
            'Switch membangun <em>MAC address table</em> secara dinamis; router membangun <em>routing table</em> dari koneksi, statis, atau protokol dinamis.',
            'Standar PoE (Power over Ethernet): <strong>IEEE 802.3af (PoE 15,4W)</strong>, <strong>802.3at (PoE+ 30W)</strong>, dan <strong>802.3bt (PoE++ 60–90W)</strong>.',
            'Media transmisi: UTP Cat5e/Cat6 maksimal <strong>100 m</strong>, fiber SM hingga <strong>100+ km</strong> (via modul transceiver SFP 1G / SFP+ 10G), coaxial RG-6 untuk CCTV/TV kabel.',
            'Mode operasi AP: Access Point (hotspot baru), Repeater (perluas sinyal), Bridge (titik-ke-titik), Client (perangkat wired → WiFi).',
            'Inventarisasi = identifikasi fisik → spesifikasi → kondisi → network diagram. Tanpa ini, troubleshooting jadi tebakan-tebakan.'
        ],[
            ['MAC address','Alamat fisik 48-bit unik setiap NIC'],
            ['NIC','Network Interface Card — kartu jaringan'],
            ['PoE','Suplai daya listrik lewat kabel ethernet (untuk AP/IP camera)'],
            ['Managed switch','Switch yang bisa dikonfigurasi: VLAN, STP, QoS']
        ],[
            'Soal favorit: "switch di layer berapa?" → L2 (Data Link), router → L3 (Network).',
            'Layer 3 switch = switch + router hemat: dipakai untuk inter-VLAN routing di jaringan besar.'
        ])}
        <button class="btn-primary" onclick="showAssessment('peralatan')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Peralatan Jaringan (20 Soal)</button>
    </div>`;
}


// ============================================================
// E1 — IP ADDRESS, CIDR, VLSM
// ============================================================
function ip() {
    return `<div class="card">
        ${sectionHead('fa-hashtag','IP Address, CIDR, VLSM & Subnetting','sh-blue')}
        ${callout('info','fa-info-circle','Mengapa IP Address Penting?','IP address adalah identitas unik setiap perangkat di jaringan berbasis TCP/IP. Tanpa IP yang benar, perangkat tidak bisa berkomunikasi — seperti rumah tanpa alamat, paket kiriman tidak akan sampai.')}

        <h3 class="sub-head">Struktur IPv4</h3>
        ${pptIllo('ipv4-struktur.png', 'IPv4 = 32 bit, ditulis dalam 4 oktet desimal (dotted decimal notation)')}
        <div class="illus-wrap">
            <svg viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg">
                <text x="350" y="22" fill="#1e40af" font-size="13" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Struktur Alamat IPv4 — 32 bit (4 oktet)</text>
                ${[['192','11000000','#1e40af'],['168','10101000','#1d4ed8'],['1','00000001','#2563eb'],['100','01100100','#3b82f6']].map(([d,b,c],i)=>`
                <rect x="${20+i*165}" y="38" width="155" height="70" rx="10" fill="${c}"/>
                <text x="${97+i*165}" y="68" fill="white" font-size="22" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">${d}</text>
                <text x="${97+i*165}" y="90" fill="rgba(255,255,255,.7)" font-size="10" text-anchor="middle" font-family="monospace">${b}</text>
                <text x="${97+i*165}" y="118" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="Inter,sans-serif">Oktet ${i+1}</text>
                ${i<3?`<text x="${178+i*165}" y="78" fill="#334155" font-size="20" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">.</text>`:''}`).join('')}
                <text x="350" y="142" fill="#64748b" font-size="11" text-anchor="middle" font-family="Inter,sans-serif">Nilai tiap oktet: 0–255 (desimal) | 00000000–11111111 (biner)</text>
            </svg>
        </div>

        <h3 class="sub-head">Kelas IP Address</h3>
        ${pptIllo('ipv4-biner.png', 'Konversi biner → desimal: setiap bit bernilai 2 pangkat posisinya (128, 64, 32, 16, 8, 4, 2, 1)')}
        ${tbl(['Kelas','Range','Subnet Default','Maks Host','Penggunaan'],[
            ['A','1.0.0.0 – 126.255.255.255','255.0.0.0 (/8)','16.777.214','ISP besar, perusahaan raksasa'],
            ['B','128.0.0.0 – 191.255.255.255','255.255.0.0 (/16)','65.534','Universitas, perusahaan besar'],
            ['C','192.0.0.0 – 223.255.255.255','255.255.255.0 (/24)','254','Kantor kecil, SOHO'],
            ['D','224.0.0.0 – 239.255.255.255','—','—','Multicast'],
            ['E','240.0.0.0 – 255.255.255.255','—','—','Riset (reserved)'],
        ])}

        <h3 class="sub-head">IP Private vs IP Public</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="ip-priv">IP Private</button>
                <button class="tab-btn" data-tab="ip-pub">IP Public</button>
                <button class="tab-btn" data-tab="ip-spec">IP Khusus</button>
                <button class="tab-btn" data-tab="ip-v6">IPv6</button>
            </div>
            <div id="ip-priv" class="tab-pane active">
                ${callout('info','fa-lock','IP Private','Hanya dikenali di jaringan lokal. Tidak bisa diakses langsung dari internet. Gratis digunakan siapa saja — tidak perlu mendaftar ke IANA.')}
                ${tbl(['Kelas','Range IP Private','Jumlah Host'],[
                    ['A','10.0.0.0 – 10.255.255.255','16.777.214'],
                    ['B','172.16.0.0 – 172.31.255.255','1.048.574'],
                    ['C','192.168.0.0 – 192.168.255.255','65.534'],
                ])}
            </div>
            <div id="ip-pub" class="tab-pane">
                ${callout('success','fa-globe','IP Public','Unik di seluruh internet, dikelola oleh IANA dan dialokasikan melalui RIR (APNIC untuk Asia Pasifik). Harus disewa dari ISP.')}
                <p>Semua IP address <em>selain</em> IP private, loopback (127.x.x.x), dan reserved adalah IP public.</p>
                <p><em>Contoh IP publik Indonesia:</em> 103.15.5.1 (Telkom), 180.241.xxx.xxx (Indihome)</p>
            </div>
            <div id="ip-spec" class="tab-pane">
                ${pptIllo('ip-khusus.png', 'Daftar alamat IP khusus yang sudah ditetapkan secara internasional dan tidak boleh dipakai untuk host biasa')}
                ${tbl(['Penggunaan','IP / Range','Keterangan'],[
                    ['Loopback','127.0.0.0/8','Test jaringan local (localhost = 127.0.0.1)'],
                    ['Link-Local / APIPA','169.254.0.0/16','Otomatis jika DHCP gagal (Windows)'],
                    ['Network Address','Host bit semua 0','Identitas subnet (mis. 192.168.1.0)'],
                    ['Broadcast terbatas','255.255.255.255/32','Broadcast ke semua di segmen lokal'],
                    ['Multicast','224.0.0.0/4','Komunikasi one-to-many'],
                    ['Documentation','192.0.2.0/24, 198.51.100.0/24','Hanya untuk dokumentasi/contoh'],
                ])}
            </div>
            <div id="ip-v6" class="tab-pane">
                ${callout('tip','fa-info-circle','IPv6 — Generasi Berikutnya','IPv4 hanya punya ~4.3 miliar alamat, habis tahun 2011. IPv6 menggunakan 128 bit (16 byte) — menyediakan 340 undecillion (3.4 × 10³⁸) alamat unik!')}
                <p><strong>Format IPv6:</strong> 8 kelompok 4 digit hex, dipisah tanda titik dua.<br>Contoh: <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code></p>
                ${tbl(['Fitur','IPv4','IPv6'],[
                    ['Panjang','32 bit','128 bit'],
                    ['Notasi','Desimal (192.168.1.1)','Heksadesimal (2001:db8::1)'],
                    ['Konfigurasi','Manual/DHCP','Auto (SLAAC) atau DHCPv6'],
                    ['NAT','Diperlukan','Tidak diperlukan (cukup alamat)'],
                    ['Header','20-60 byte (variable)','40 byte (fixed)'],
                ])}
            </div>
        </div>

        <h3 class="sub-head">CIDR — Classless Inter-Domain Routing</h3>
        <p>CIDR menggantikan sistem kelas (classful) dengan <strong>prefix length yang fleksibel</strong>, ditulis <code>IP/prefix</code> (contoh: <code>192.168.1.0/26</code>). Angka setelah garis miring (<code>/26</code>) menunjukkan <strong>berapa banyak bit bernilai <code>1</code> (Network)</strong> dari total 32 bit alamat IPv4.</p>
        <div class="illus-wrap">
            <svg viewBox="0 0 780 280" xmlns="http://www.w3.org/2000/svg">
                <rect width="780" height="280" rx="16" fill="#0f172a"/>
                <text x="390" y="28" fill="#f8fafc" font-size="15" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Bedah Visual CIDR: 192.168.1.0 / 26 → Subnet Mask 255.255.255.192</text>
                <text x="390" y="47" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="Inter,sans-serif">Total 32 Bit IPv4 = 26 Bit Network (Biru &amp; Ungu = angka 1) + 6 Bit Host (Hijau = angka 0)</text>

                <!-- Oktet 1 (Bit 1-8) -->
                <rect x="18" y="62" width="172" height="86" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
                <text x="104" y="80" fill="#93c5fd" font-size="10.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">OKTET 1 (Bit 1–8) = 255</text>
                ${[...Array(8)].map((_,i)=>`
                <rect x="${25+i*20}" y="89" width="17" height="26" rx="4" fill="#2563eb"/>
                <text x="${33.5+i*20}" y="106" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Fira Code,monospace">1</text>`).join('')}
                <text x="104" y="135" fill="#60a5fa" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">8 Bit Network Dasar</text>

                <!-- Oktet 2 (Bit 9-16) -->
                <rect x="198" y="62" width="172" height="86" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
                <text x="284" y="80" fill="#93c5fd" font-size="10.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">OKTET 2 (Bit 9–16) = 255</text>
                ${[...Array(8)].map((_,i)=>`
                <rect x="${205+i*20}" y="89" width="17" height="26" rx="4" fill="#2563eb"/>
                <text x="${213.5+i*20}" y="106" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Fira Code,monospace">1</text>`).join('')}
                <text x="284" y="135" fill="#60a5fa" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">8 Bit Network Dasar</text>

                <!-- Oktet 3 (Bit 17-24) -->
                <rect x="378" y="62" width="172" height="86" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
                <text x="464" y="80" fill="#93c5fd" font-size="10.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">OKTET 3 (Bit 17–24) = 255</text>
                ${[...Array(8)].map((_,i)=>`
                <rect x="${385+i*20}" y="89" width="17" height="26" rx="4" fill="#2563eb"/>
                <text x="${393.5+i*20}" y="106" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Fira Code,monospace">1</text>`).join('')}
                <text x="464" y="135" fill="#60a5fa" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">8 Bit Network Dasar (/24)</text>

                <!-- Oktet 4 (Bit 25-32: 2 Subnet + 6 Host) -->
                <rect x="558" y="62" width="204" height="86" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
                <text x="660" y="80" fill="#fde68a" font-size="10.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">OKTET 4 (Bit 25–32) = 192</text>
                ${[128,64,32,16,8,4,2,1].map((w,i)=>{
                    const isSub = i < 2;
                    const x = 566 + i*24;
                    return `
                    <rect x="${x}" y="89" width="21" height="26" rx="4" fill="${isSub?'#7c3aed':'#16a34a'}" stroke="${isSub?'#c4b5fd':'#86efac'}" stroke-width="1"/>
                    <text x="${x+10.5}" y="106" fill="#ffffff" font-size="11" font-weight="800" text-anchor="middle" font-family="Fira Code,monospace">${isSub?'1':'0'}</text>
                    <text x="${x+10.5}" y="126" fill="${isSub?'#ddd6fe':'#86efac'}" font-size="8" font-weight="700" text-anchor="middle" font-family="Fira Code,monospace">${w}</text>`;
                }).join('')}
                <text x="590" y="141" fill="#c4b5fd" font-size="8.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">128+64=192</text>
                <text x="684" y="141" fill="#4ade80" font-size="8.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">6 Bit Host (0)</text>

                <!-- Clear Non-Overlapping Brackets Row (y = 160..192) -->
                <rect x="18" y="158" width="588" height="28" rx="7" fill="#1e3a8a" stroke="#3b82f6"/>
                <text x="312" y="176" fill="#e0f2fe" font-size="10.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">← 26 BIT NETWORK (/26) = 24 Bit Dasar + 2 Bit Pinjaman Subnet (n = 2) →</text>

                <rect x="612" y="158" width="150" height="28" rx="7" fill="#064e3b" stroke="#22c55e"/>
                <text x="687" y="176" fill="#bbf7d0" font-size="10.5" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">← 6 BIT HOST (m = 6) →</text>

                <!-- 3 Step Calculation Summary Cards at Bottom (y = 198..266) -->
                <rect x="18" y="198" width="238" height="68" rx="10" fill="#1e293b" stroke="#38bdf8"/>
                <text x="137" y="218" fill="#38bdf8" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">1. Nilai Subnet Mask (/26)</text>
                <text x="137" y="236" fill="#f8fafc" font-size="10.5" font-family="Fira Code,monospace" text-anchor="middle">128 + 64 = 192</text>
                <text x="137" y="253" fill="#94a3b8" font-size="9.5" text-anchor="middle">Mask: 255.255.255.192</text>

                <rect x="271" y="198" width="238" height="68" rx="10" fill="#1e293b" stroke="#a855f7"/>
                <text x="390" y="218" fill="#c084fc" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">2. Jumlah Subnet &amp; Lompatan Blok</text>
                <text x="390" y="236" fill="#f8fafc" font-size="10.5" font-family="Fira Code,monospace" text-anchor="middle">2² = 4 Subnet | 256−192 = 64</text>
                <text x="390" y="253" fill="#94a3b8" font-size="9.5" text-anchor="middle">Blok: .0, .64, .128, .192</text>

                <rect x="524" y="198" width="238" height="68" rx="10" fill="#1e293b" stroke="#22c55e"/>
                <text x="643" y="218" fill="#4ade80" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">3. Host Usable per Subnet</text>
                <text x="643" y="236" fill="#f8fafc" font-size="10.5" font-family="Fira Code,monospace" text-anchor="middle">2⁶ − 2 = 64 − 2 = 62 Host</text>
                <text x="643" y="253" fill="#94a3b8" font-size="9.5" text-anchor="middle">(-2 untuk Network &amp; Broadcast)</text>
            </svg>
        </div>
        ${tbl(['Notasi CIDR','Subnet Mask','Total Alamat','Host yang Bisa Digunakan'],[
            ['/24','255.255.255.0','256','254'],
            ['/25','255.255.255.128','128','126'],
            ['/26','255.255.255.192','64','62'],
            ['/27','255.255.255.224','32','30'],
            ['/28','255.255.255.240','16','14'],
            ['/29','255.255.255.248','8','6'],
            ['/30','255.255.255.252','4','2 (point-to-point)'],
            ['/32','255.255.255.255','1','0 (host route)'],
        ])}

        <h3 class="sub-head">Cara Menghitung Subnetting</h3>
        ${callout('success','fa-calculator','Rumus Subnetting','<strong>Jumlah Subnet</strong> = 2ⁿ (n = bit host yang dipinjam)<br><strong>Jumlah Host/subnet</strong> = 2ᵐ − 2 (m = bit host tersisa)<br><strong>Block Size</strong> = 256 − nilai oktet terakhir subnet mask')}
        <p><strong>Contoh: Network 192.168.1.0/26</strong></p>
        <ul><li>Subnet mask /26 = 255.255.255.<strong>192</strong> → biner oktet ke-4: <code>11</code>000000</li><li>Bit dipinjam (n) = 2 → Jumlah subnet = 2² = <strong>4 subnet</strong></li><li>Bit host (m) = 6 → Host per subnet = 2⁶ − 2 = <strong>62 host</strong></li><li>Block size = 256 − 192 = <strong>64</strong> → subnet: 0, 64, 128, 192</li></ul>
        ${tbl(['Subnet','Network Address','Host Pertama','Host Terakhir','Broadcast'],[
            ['1','192.168.1.0/26','192.168.1.1','192.168.1.62','192.168.1.63'],
            ['2','192.168.1.64/26','192.168.1.65','192.168.1.126','192.168.1.127'],
            ['3','192.168.1.128/26','192.168.1.129','192.168.1.190','192.168.1.191'],
            ['4','192.168.1.192/26','192.168.1.193','192.168.1.254','192.168.1.255'],
        ])}
        ${pptIllo('ipv4-contoh.png', 'Contoh pembongkaran IP 172.16.254.1 ke bentuk biner 32 bit')}

        <h3 class="sub-head">VLSM — Variable Length Subnet Mask</h3>
        <p>VLSM memungkinkan setiap subnet menggunakan mask yang berbeda sesuai kebutuhan host-nya, sehingga alokasi IP menjadi sangat efisien.</p>
        ${callout('tip','fa-lightbulb','Prinsip VLSM','Urutkan kebutuhan host dari TERBESAR ke TERKECIL. Alokasikan subnet terbesar dahulu, lalu sisihkan ruang tersisa untuk subnet lebih kecil. Ini mencegah tumpang tindih alamat.')}
        <p><strong>Contoh VLSM dari jaringan 192.168.10.0/24:</strong></p>
        ${tbl(['Segmen','Kebutuhan Host','Subnet & Prefix','Rentang Host Usable','Kapasitas Usable'],[
            ['Lantai 1','100 host','192.168.10.0/25','192.168.10.1 – .126 (BC: .127)','126 host tersedia'],
            ['Lantai 2','50 host','192.168.10.128/26','192.168.10.129 – .190 (BC: .191)','62 host tersedia'],
            ['Lantai 3','25 host','192.168.10.192/27','192.168.10.193 – .222 (BC: .223)','30 host tersedia'],
            ['Link WAN','2 host','192.168.10.224/30','192.168.10.225 – .226 (BC: .227)','2 host tersedia'],
        ])}

        <h3 class="sub-head">Kalkulator Subnetting Interaktif</h3>
        <div class="calc-wrap">
            <div class="calc-form">
                <div class="calc-field"><label>IP Address</label><input type="text" id="calc-ip" value="192.168.1.0" placeholder="Contoh: 192.168.1.0"></div>
                <div class="calc-field"><label>Prefix Length</label>
                    <select id="calc-pfx">
                        ${[[8,'/8 (255.0.0.0 – Kelas A)'],[16,'/16 (255.255.0.0 – Kelas B)'],[24,'/24 (255.255.255.0)'],[25,'/25 (255.255.255.128)'],[26,'/26 (255.255.255.192)'],[27,'/27 (255.255.255.224)'],[28,'/28 (255.255.255.240)'],[29,'/29 (255.255.255.248)'],[30,'/30 (255.255.255.252)']].map(([n,lbl])=>`<option value="${n}" ${n===26?'selected':''}>${lbl}</option>`).join('')}
                    </select>
                </div>
                <button class="calc-btn" onclick="calcSubnet()"><i class="fas fa-calculator"></i> Hitung Sekarang</button>
            </div>
            <div class="calc-result" id="calc-result"></div>
        </div>

        ${illo('subnetting-flow.svg','Alur subnetting: tentukan prefix → hitung block size → bagi subnet → tentukan range host tiap subnet','Ilustrasi alur perhitungan subnetting IP')}

        ${dense('Subnetting — Rumus & Trik Ujian',[
            '<strong>Jumlah subnet</strong> = 2ⁿ (n = bit yang dipinjam dari host). <strong>Host per subnet</strong> = 2ᵐ − 2 (m = bit host tersisa; dikurangi 2 untuk network &amp; broadcast).',
            '<strong>Block size</strong> = 256 − oktet terakhir subnet mask. Block size menentukan lompatan antar subnet (mis. /26 → 256−192 = 64 → 0, 64, 128, 192).',
            'Range host selalu <em>network + 1</em> sampai <em>broadcast − 1</em>. Nilai tengah (network &amp; broadcast) tidak boleh dipakai host.',
            'VLSM: urutkan kebutuhan host dari <strong>terbesar ke terkecil</strong>, alokasikan dulu agar tidak ada ruang IP terbuang.',
            'IP private (RFC 1918): Kelas A <code>10.0.0.0/8</code>, Kelas B <code>172.16.0.0/12</code> (172.16–31.x.x), Kelas C <code>192.168.0.0/16</code> — bebas dipakai di LAN.'
        ],[
            ['CIDR','Classless Inter-Domain Routing — penulisan IP/prefix, mis. 192.168.1.0/26'],
            ['VLSM','Subnet mask panjang-berbeda per segmen agar hemat alamat'],
            ['Subnet mask','Menandai bagian network vs host dari sebuah IP'],
            ['APIPA','169.254.0.0/16 — IP otomatis saat DHCP gagal'],
            ['Loopback','127.0.0.0/8 untuk test jaringan lokal (localhost)']
        ],[
            'Trik cepat /24→/25→/26→/27→/28→/29→/30: host-nya 254→126→62→30→14→6→2 — hafal deret ini.',
            '/30 hanya menyisakan 2 host — pas dipakai untuk link point-to-point antar router.',
            'Soal: "berapa broadcast dari 192.168.1.128/26?" → 128 + 64 − 1 = 192.168.1.191. Broadcast = network + block − 1.'
        ])}
        <button class="btn-primary" onclick="showAssessment('ip')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen IP & Subnetting (20 Soal)</button>
    </div>`;
}

function calcSubnet() {
    const ipStr = document.getElementById('calc-ip').value.trim();
    const prefix = parseInt(document.getElementById('calc-pfx').value);
    const parts = ipStr.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p<0 || p>255)) {
        alert('Format IP tidak valid! Contoh: 192.168.1.0'); return;
    }
    const hBits = 32 - prefix;
    const total = Math.pow(2, hBits);
    const usable = total - 2;
    const smBits = ~(total - 1) >>> 0;
    const sm = [(smBits>>>24)&255,(smBits>>>16)&255,(smBits>>>8)&255,smBits&255];
    const ipNum = (parts[0]<<24|parts[1]<<16|parts[2]<<8|parts[3])>>>0;
    const net = (ipNum & smBits)>>>0;
    const bc = (net | (total-1))>>>0;
    const toIP = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
    const wc = [255-sm[0],255-sm[1],255-sm[2],255-sm[3]].join('.');
    const el = document.getElementById('calc-result');
    el.className = 'calc-result show';
    el.innerHTML = [
        ['Network Address', `${toIP(net)}/${prefix}`],
        ['Subnet Mask', sm.join('.')],
        ['Wildcard Mask', wc],
        ['Host Pertama (usable)', toIP(net+1)],
        ['Host Terakhir (usable)', toIP(bc-1)],
        ['Broadcast Address', toIP(bc)],
        ['Jumlah Host (usable)', `${usable > 0 ? usable.toLocaleString() : 0} host`],
        ['Total Alamat IP', total.toLocaleString()],
    ].map(([l,v])=>`<div class="calc-row"><span class="cr-label">${l}</span><span class="cr-value">${v}</span></div>`).join('');
}


// ============================================================
// E4 — VLAN
// ============================================================
function vlan() {
    return `<div class="card">
        ${sectionHead('fa-layer-group','VLAN – Virtual Local Area Network','sh-purple')}
        ${callout('tip','fa-lightbulb','Analogi VLAN','Bayangkan sebuah gedung sekolah besar. Guru, siswa, dan staf TU berada di gedung yang sama, tapi tidak bisa masuk ke ruangan satu sama lain tanpa izin. VLAN bekerja seperti ini — satu switch fisik, beberapa "ruangan" virtual yang terisolasi.')}

        <h3 class="sub-head">Pengertian VLAN</h3>
        <p>VLAN (Virtual LAN) adalah teknologi yang memungkinkan pembuatan jaringan logis yang <strong>terpisah</strong> pada infrastruktur fisik yang sama. Perangkat di VLAN berbeda tidak dapat berkomunikasi langsung meski terhubung ke switch yang sama, kecuali melalui routing.</p>

        <h3 class="sub-head">Ilustrasi VLAN</h3>
        ${pptIllo('vlan-diagram.png', 'VLAN memisahkan satu switch fisik menjadi beberapa jaringan logis (Engineering, Marketing, Accounting)')}
        <div class="illus-wrap">
            <svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg">
                <!-- Switch -->
                <rect x="245" y="115" width="210" height="45" rx="10" fill="#1e293b"/>
                <text x="350" y="135" fill="white" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Managed Switch</text>
                <text x="350" y="152" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">VLAN 10 | VLAN 20 | VLAN 30</text>
                <!-- VLAN 10 -->
                <rect x="20" y="20" width="140" height="34" rx="8" fill="#1e40af"/>
                <text x="90" y="42" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">VLAN 10 — Guru</text>
                ${[50,110,170].map((x,i)=>`<circle cx="${x}" cy="90" r="14" fill="#3b82f6"/><text x="${x}" y="94" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC${i+1}</text><line x1="${x}" y1="104" x2="${245+(i*20)}" y2="130" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="5,3"/>`).join('')}
                <!-- VLAN 20 -->
                <rect x="280" y="20" width="140" height="34" rx="8" fill="#15803d"/>
                <text x="350" y="42" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">VLAN 20 — Siswa</text>
                <circle cx="310" cy="90" r="14" fill="#22c55e"/><text x="310" y="94" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC4</text>
                <circle cx="390" cy="90" r="14" fill="#22c55e"/><text x="390" y="94" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC5</text>
                <line x1="310" y1="104" x2="330" y2="115" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="5,3"/>
                <line x1="390" y1="104" x2="370" y2="115" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="5,3"/>
                <!-- VLAN 30 -->
                <rect x="540" y="20" width="140" height="34" rx="8" fill="#7e22ce"/>
                <text x="610" y="42" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">VLAN 30 — TU</text>
                <circle cx="560" cy="90" r="14" fill="#a855f7"/><text x="560" y="94" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC6</text>
                <circle cx="640" cy="90" r="14" fill="#a855f7"/><text x="640" y="94" fill="white" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PC7</text>
                <line x1="560" y1="104" x2="430" y2="130" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="5,3"/>
                <line x1="640" y1="104" x2="450" y2="115" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="5,3"/>
                <!-- Router -->
                <circle cx="350" cy="210" r="22" fill="#f97316"/>
                <text x="350" y="214" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">R1</text>
                <line x1="350" y1="188" x2="350" y2="160" stroke="#f97316" stroke-width="2"/>
                <text x="350" y="248" fill="#64748b" font-size="10" font-weight="600" text-anchor="middle" font-family="Inter,sans-serif">Router/L3 Switch diperlukan untuk inter-VLAN routing</text>
            </svg>
        </div>
        <p class="illus-caption">3 VLAN pada 1 switch fisik — terisolasi, butuh router untuk saling berkomunikasi</p>
        <div class="img-row">
            <figure><img src="assets/ppt/perangkat-switch-cisco.jpg" alt="Managed switch Cisco untuk VLAN" loading="lazy"><figcaption>Cisco SG110-24HP Gigabit PoE Switch</figcaption></figure>
            <figure><img src="assets/ppt/perangkat-switch-stack.png" alt="Tumpukan switch enterprise" loading="lazy"><figcaption>Cisco Managed Switch Stack Enterprise</figcaption></figure>
            <figure><img src="assets/ppt/perangkat-router-mikrotik2.jpg" alt="Modular Enterprise Switch Chassis 48-Port" loading="lazy"><figcaption>Modular Switch Chassis 48-Port Gigabit/Fast Ethernet</figcaption></figure>
        </div>

        <h3 class="sub-head">Konsep Dasar VLAN</h3>
        <div class="accordion">
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🏷️ VLAN ID &amp; Tagging (IEEE 802.1Q)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>IEEE 802.1Q menambahkan <strong>tag 4 byte</strong> ke frame Ethernet untuk mengidentifikasi VLAN. Tag berisi: TPID (0x8100), PCP (prioritas 3 bit), DEI (1 bit), dan VLAN ID (12 bit → range 1–4094).</p>
            ${tags(tag('Tagged Frame','blue'),tag('Untagged Frame','gray'),tag('Native VLAN','amber'))}</div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🔌 Access Port vs Trunk Port</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                ${tbl(['Tipe Port','Membawa VLAN','Tag?','Terhubung ke'],[
                    ['Access Port','1 VLAN saja','Tidak (untagged)','End-device (PC, printer, IP Phone)'],
                    ['Trunk Port','Banyak VLAN sekaligus','Ya (tagged 802.1Q)','Switch lain, router sub-interface'],
                ])}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🔀 Inter-VLAN Routing</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Perangkat antar VLAN tidak bisa berkomunikasi langsung. Dibutuhkan:</p>
            <ul><li><strong>Router-on-a-Stick:</strong> Satu interface fisik router dengan banyak sub-interface (satu per VLAN) via trunk link</li><li><strong>Layer 3 Switch (SVI):</strong> Switch dengan kemampuan routing built-in — lebih efisien untuk jaringan besar</li></ul></div></div>
        </div>

        <h3 class="sub-head">Manfaat VLAN</h3>
        ${tags(tag('🔒 Segmentasi Keamanan','red'),tag('📉 Kurangi Broadcast Domain','blue'),tag('🏢 Isolasi Departemen','purple'),tag('⚡ Performa Meningkat','green'),tag('🔧 Manajemen Mudah','teal'))}

        <h3 class="sub-head">Konfigurasi VLAN di Cisco IOS</h3>
        ${pptIllo('vlan-perintah.png', 'Ringkasan perintah VLAN, trunk, dan inter-VLAN routing pada Cisco IOS')}
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="vl-create">Buat VLAN</button>
                <button class="tab-btn" data-tab="vl-access">Access Port</button>
                <button class="tab-btn" data-tab="vl-trunk">Trunk Port</button>
                <button class="tab-btn" data-tab="vl-roas">Router-on-a-Stick</button>
                <button class="tab-btn" data-tab="vl-verify">Verifikasi</button>
            </div>
            <div id="vl-create" class="tab-pane active">${codeBlock('IOS','Switch# configure terminal\nSwitch(config)# vlan 10\nSwitch(config-vlan)# name Guru\nSwitch(config-vlan)# exit\nSwitch(config)# vlan 20\nSwitch(config-vlan)# name Siswa\nSwitch(config-vlan)# exit\nSwitch(config)# vlan 30\nSwitch(config-vlan)# name TU\nSwitch(config-vlan)# exit')}</div>
            <div id="vl-access" class="tab-pane">${codeBlock('IOS','Switch(config)# interface FastEthernet0/1\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10\nSwitch(config-if)# exit\n! Port Fa0/1 masuk VLAN 10 (Guru)\n\nSwitch(config)# interface range FastEthernet0/5 - 8\nSwitch(config-if-range)# switchport mode access\nSwitch(config-if-range)# switchport access vlan 20')}</div>
            <div id="vl-trunk" class="tab-pane">${codeBlock('IOS','Switch(config)# interface GigabitEthernet0/1\nSwitch(config-if)# switchport mode trunk\nSwitch(config-if)# switchport trunk allowed vlan 10,20,30\nSwitch(config-if)# switchport trunk native vlan 99\n! Native VLAN diubah dari 1 ke 99 (keamanan!)')}</div>
            <div id="vl-roas" class="tab-pane">${codeBlock('IOS','Router(config)# interface GigabitEthernet0/0.10\nRouter(config-subif)# encapsulation dot1Q 10\nRouter(config-subif)# ip address 192.168.10.1 255.255.255.0\n!\nRouter(config)# interface GigabitEthernet0/0.20\nRouter(config-subif)# encapsulation dot1Q 20\nRouter(config-subif)# ip address 192.168.20.1 255.255.255.0\n!\nRouter(config)# interface GigabitEthernet0/0\nRouter(config-if)# no shutdown')}</div>
            <div id="vl-verify" class="tab-pane">${codeBlock('IOS','! Lihat daftar VLAN dan port-nya\nSwitch# show vlan brief\n\n! Lihat status trunk port\nSwitch# show interfaces trunk\n\n! Lihat detail interface\nSwitch# show interfaces FastEthernet0/1 switchport')}</div>
        </div>
        ${callout('warning','fa-exclamation-triangle','Security Best Practice','Selalu ubah Native VLAN dari VLAN 1 ke VLAN yang tidak digunakan (mis. 99). VLAN 1 adalah default yang sering menjadi target serangan VLAN Hopping.')}

        ${illo('vlan-trunk.svg','Trunk port membawa banyak VLAN ber-tag 802.1Q antar switch; access port hanya membawa satu VLAN','Ilustrasi trunk port dan tagging VLAN 802.1Q')}

        ${dense('VLAN — Poin Wajib Hafal',[
            'IEEE <strong>802.1Q</strong> menambah tag <strong>4 byte</strong> ke frame. VLAN ID = 12 bit → rentang <strong>1–4094</strong> (VLAN 1 default, 4095 reserved).',
            '<strong>Access port</strong>: 1 VLAN, frame tanpa tag (untagged), terhubung ke PC/printer. <strong>Trunk port</strong>: banyak VLAN, frame ber-tag, terhubung switch↔switch atau router sub-interface.',
            'Komunikasi antar VLAN <strong>butuh routing</strong>: Router-on-a-Stick (sub-interface per VLAN) atau Layer 3 Switch (SVI).',
            'Native VLAN tidak di-tag — pindahkan dari VLAN 1 ke VLAN kosong (mis. 99) untuk mencegah serangan VLAN Hopping.',
            'Verifikasi di switch: <code>show vlan brief</code>, <code>show interfaces trunk</code>.'
        ],[
            ['Tagging','Menandai frame dengan VLAN ID memakai 802.1Q'],
            ['Trunk','Port penghubung antar switch yang membawa banyak VLAN'],
            ['SVI','Switch Virtual Interface — IP address per VLAN di L3 switch'],
            ['Inter-VLAN routing','Routing antar VLAN (router-on-a-stick / L3 switch)'],
            ['Broadcast domain','Segmen broadcast — dipotong oleh router/VLAN']
        ],[
            'Urutan konsol yang sering ditanya: buat VLAN → mode access → masukkan port → verifikasi show vlan brief.',
            'Trunk wajib diizinkan VLAN-nya: switchport trunk allowed vlan 10,20,30 — kalau lupa, VLAN baru tidak akan lewat.'
        ])}
        <button class="btn-primary" onclick="showAssessment('vlan')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen VLAN (20 Soal)</button>
    </div>`;
}


// ============================================================
// E4 — ROUTING
// ============================================================
function routing() {
    return `<div class="card">
        ${sectionHead('fa-route','Routing Statis & Dinamis','sh-purple')}
        ${callout('tip','fa-lightbulb','Prinsip Layer 3 Packet Forwarding','Router bekerja pada Layer 3 (Network). Setiap paket IP yang masuk diperiksa alamat IP tujuannya, dicocokkan terhadap <strong>Routing Table (FIB)</strong> menggunakan aturan <strong>Longest Prefix Match</strong> (prefix paling spesifik menang mutlak), kemudian diteruskan ke <em>Next-Hop</em> dengan membungkus ulang header MAC Layer 2 dan mengurangi nilai TTL sebesar 1.')}
        ${pptIllo('routing-l3-engine.svg', 'Alur keputusan forwarding paket IP pada router (RFC 1812): pemeriksaan FCS Layer 2 → cek TTL & Destination IP → Lookup Tabel Routing (Longest Prefix Match, Administrative Distance, Metric) → Rewrite MAC Next-Hop atau Drop (ICMP Destination Unreachable)', 'Diagram alur mesin routing paket IP Layer 3')}

        <h3 class="sub-head">Cara Kerja Routing</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
                <!-- Network A -->
                <rect x="10" y="70" width="120" height="60" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/>
                <text x="70" y="96" fill="#1e40af" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Network A</text>
                <text x="70" y="114" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">192.168.1.0/24</text>
                <!-- Router 1 -->
                <circle cx="225" cy="100" r="28" fill="#1e40af"/>
                <text x="225" y="104" fill="white" font-size="13" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">R1</text>
                <text x="225" y="145" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">192.168.1.1 / 10.0.0.1</text>
                <!-- WAN Link -->
                <line x1="253" y1="100" x2="447" y2="100" stroke="#f97316" stroke-width="2.5" stroke-dasharray="8,4"/>
                <rect x="310" y="80" width="80" height="26" rx="6" fill="#fff7ed" stroke="#f97316" stroke-width="1.5"/>
                <text x="350" y="97" fill="#c2410c" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">WAN / Internet</text>
                <!-- Router 2 -->
                <circle cx="475" cy="100" r="28" fill="#1e40af"/>
                <text x="475" y="104" fill="white" font-size="13" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">R2</text>
                <text x="475" y="145" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">10.0.0.2 / 10.0.1.1</text>
                <!-- Network B -->
                <rect x="570" y="70" width="120" height="60" rx="8" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
                <text x="630" y="96" fill="#15803d" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Network B</text>
                <text x="630" y="114" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">10.0.1.0/24</text>
                <!-- Lines -->
                <line x1="130" y1="100" x2="197" y2="100" stroke="#3b82f6" stroke-width="2"/>
                <line x1="503" y1="100" x2="570" y2="100" stroke="#22c55e" stroke-width="2"/>
                <!-- Packet -->
                <rect x="150" y="68" width="50" height="24" rx="5" fill="#fbbf24"/>
                <text x="175" y="84" fill="#1a1a1a" font-size="9" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PAKET</text>
                <text x="350" y="175" fill="#475569" font-size="10" font-weight="600" text-anchor="middle" font-family="Inter,sans-serif">Routing Table R1: Rute ke 10.0.1.0/24 via 10.0.0.2 (next-hop R2)</text>
            </svg>
        </div>

        <h3 class="sub-head">Tabel Routing</h3>
        ${tbl(['Tanda','Sumber Rute','Keterangan'],[
            ['C','Connected','Terhubung langsung ke interface router'],
            ['L','Local','IP interface router sendiri (/32)'],
            ['S','Static','Dikonfigurasi manual oleh admin'],
            ['R','RIP','Dipelajari via protokol RIP'],
            ['O','OSPF','Dipelajari via protokol OSPF'],
            ['D','EIGRP','Dipelajari via protokol EIGRP'],
            ['B','BGP','Dipelajari via protokol BGP'],
        ])}

        <h3 class="sub-head">Routing Statis</h3>
        <p>Rute dikonfigurasi <strong>manual</strong> oleh admin. Tidak berubah otomatis saat topologi berubah.</p>
        ${tags(tag('✅ Kontrol penuh','green'),tag('✅ Tidak ada overhead protokol','green'),tag('✅ Aman, tidak ada routing update','green'),tag('❌ Tidak skalabel','red'),tag('❌ Tidak ada failover otomatis','red'))}
        ${codeBlock('Cisco IOS','! Syntax: ip route [network] [mask] [next-hop|interface] [AD]\nRouter(config)# ip route 10.0.1.0 255.255.255.0 10.0.0.2\n\n! Default route (kirim semua ke internet)\nRouter(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1\n\n! Floating static route (backup, AD lebih tinggi)\nRouter(config)# ip route 10.0.1.0 255.255.255.0 10.0.0.2 200')}

        <h3 class="sub-head">Routing Dinamis</h3>
        <p>Router secara <strong>otomatis bertukar informasi rute</strong> dengan router lain menggunakan protokol routing. Otomatis failover saat ada link yang putus.</p>
        ${pptIllo('routing-protokol.png', 'Pohon protokol routing: Interior Gateway Protocol (RIP, OSPF, IS-IS) vs Exterior Gateway Protocol (BGP)')}
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="rt-rip">RIP</button>
                <button class="tab-btn" data-tab="rt-ospf">OSPF</button>
                <button class="tab-btn" data-tab="rt-bgp">BGP</button>
                <button class="tab-btn" data-tab="rt-compare">Perbandingan</button>
            </div>
            <div id="rt-rip" class="tab-pane active">
                ${pptIllo('routing-rip.png', 'RIP bekerja dengan bertukar informasi jarak (hop count) ke tetangga secara berkala')}
                <p><strong>RIP (Routing Information Protocol)</strong> — Distance Vector. Metrik: hop count (maks 15). Mudah dikonfigurasi, cocok untuk jaringan kecil.</p>
                ${codeBlock('Cisco IOS','Router(config)# router rip\nRouter(config-router)# version 2\nRouter(config-router)# network 192.168.1.0\nRouter(config-router)# network 10.0.0.0\nRouter(config-router)# no auto-summary\nRouter(config-router)# passive-interface GigabitEthernet0/0')}
            </div>
            <div id="rt-ospf" class="tab-pane">
                ${pptIllo('routing-ospf.png', 'Topologi OSPF Multi-Area: Area 0 (Backbone) menghubungkan Area 1 dan Area 2 melalui ABR (Area Border Router) dengan algoritma Dijkstra SPF')}
                <p><strong>OSPF (Open Shortest Path First — RFC 2328)</strong> — Link State. Algoritma Dijkstra (SPF). Metrik: <strong>cost</strong> (berdasarkan bandwidth link: Reference BW 100 Mbps / Interface BW). Skalabel, konvergensi cepat, hierarkis dengan Area 0 (Backbone).</p>
                ${codeBlock('Cisco IOS & MikroTik RouterOS','! === CISCO IOS (OSPFv2 Area 0) ===\nRouter(config)# router ospf 1\nRouter(config-router)# router-id 1.1.1.1\nRouter(config-router)# network 192.168.1.0 0.0.0.255 area 0\nRouter(config-router)# network 10.0.0.0 0.0.0.3 area 0\nRouter(config-router)# passive-interface GigabitEthernet0/0\nRouter# show ip ospf neighbor\n\n# === MIKROTIK ROUTEROS v7 ===\n/routing ospf instance add name=ospf-utama router-id=1.1.1.1\n/routing ospf area add name=backbone area-id=0.0.0.0 instance=ospf-utama\n/routing ospf interface-template add area=backbone networks=192.168.1.0/24,10.0.0.0/30')}
            </div>
            <div id="rt-bgp" class="tab-pane">
                ${pptIllo('routing-bgp.jpg', 'BGP antar Autonomous System: eBGP (AD 20) menghubungkan AS berbeda (antar-ISP), sedangkan iBGP (AD 200) bertukar rute di dalam satu AS')}
                <p><strong>BGP (Border Gateway Protocol — RFC 4271)</strong> — Path Vector (TCP port 179). Menghubungkan Autonomous System (AS / ASN) di internet global. Memilih jalur berdasarkan atribut kebijakan (Weight, Local Preference, AS-Path Length, MED).</p>
                ${codeBlock('Cisco IOS','! eBGP antara AS 65001 dan AS 65002\nRouter(config)# router bgp 65001\nRouter(config-router)# bgp router-id 1.1.1.1\nRouter(config-router)# neighbor 203.0.113.2 remote-as 65002\nRouter(config-router)# network 198.51.100.0 mask 255.255.255.0')}
            </div>
            <div id="rt-compare" class="tab-pane">
                ${pptIllo('routing-dv-ls.gif', 'Perbedaan cara kerja Distance Vector vs Link State dalam membangun tabel routing')}
                ${tbl(['Protokol','Tipe','Algoritma','Metrik','AD','Skala'],[
                    ['RIP v2','Distance Vector','Bellman-Ford','Hop count','120','Kecil (≤15 hop)'],
                    ['OSPF','Link State','Dijkstra (SPF)','Cost (bw)','110','Besar'],
                    ['EIGRP','Advanced DV','DUAL','BW+Delay','90/170','Besar (Cisco)'],
                    ['BGP','Path Vector','Best-path selection','AS-path','20/200','Internet'],
                ])}
            </div>
        </div>
        ${callout('success','fa-check-circle','Tips Praktis','Gunakan <code>show ip route</code> untuk melihat routing table. Tanda "C" = connected, "S" = static, "R" = RIP, "O" = OSPF. Administrative Distance (AD) lebih rendah = lebih dipercaya.')}

        ${illo('routing-decision.svg','Keputusan router: cocokkan IP tujuan dengan routing table, pilih rute paling spesifik (longest prefix match)','Ilustrasi keputusan routing table router')}

        ${dense('Routing — Inti Materi & Rumus Ujian',[
            'Routing table dibaca dari <strong>most specific match</strong>: 10.0.0.0/8 lebih dipilih daripada 0.0.0.0/8 untuk tujuan 10.5.5.5.',
            '<strong>Administrative Distance (AD)</strong> = tingkat kepercayaan: Connected 0 → Static 1 → EIGRP 90 → OSPF 110 → RIP 120. Makin kecil, makin diprioritaskan.',
            '<strong>RIP</strong>: distance vector, metrik hop, maks 15 hop, update tiap 30 detik — cocok untuk jaringan kecil. <strong>OSPF</strong>: link state, algoritma Dijkstra, metrik cost (bandwidth), konvergensi cepat — cocok jaringan besar.',
            '<strong>BGP</strong>: path vector, menghubungkan antar Autonomous System (AS) — protokol tulang punggung internet.',
            'Rute statis: <code>ip route [network] [mask] [next-hop]</code>. Default route: <code>ip route 0.0.0.0 0.0.0.0 [gateway]</code>. Floating static route (backup) diberi AD lebih besar.',
            'Kata kunci soal: "koneksi antar VLAN" → L3 switch/router; "jaringan kecil, mudah" → RIP; "enterprise, cepat" → OSPF.'
        ],[
            ['AD','Administrative Distance — nilai kepercayaan sumber rute'],
            ['Next-hop','IP router tujuan berikutnya untuk meneruskan paket'],
            ['Metrik','Nilai kualitas rute: hop count (RIP), cost (OSPF)'],
            ['Konvergensi','Waktu hingga semua router sepakat dengan topologi baru'],
            ['Area 0','Backbone area OSPF (wajib ada dalam satu proses OSPF)']
        ],[
            'Hafal AD: connected 0, static 1, EIGRP 90, OSPF 110, RIP 120 — sering muncul sebagai pilihan ganda.',
            'OSPF butuh router-id unik & area 0. Kalau dua router OSPF tidak jadi tetangga, cek: interface passive, password/auth mismatch, atau network wildcard salah.'
        ])}
        <button class="btn-primary" onclick="showAssessment('routing')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Routing (20 Soal)</button>
    </div>`;
}

// ============================================================
// E4 — NAT & GATEWAY
// ============================================================
function nat() {
    return `<div class="card">
        ${sectionHead('fa-exchange-alt','NAT & Internet Gateway','sh-purple')}
        ${callout('tip','fa-lightbulb','Analogi NAT','Bayangkan kantor dengan 100 karyawan, tapi hanya punya 1 nomor telepon resmi ke luar. Setiap karyawan bisa menelepon keluar menggunakan nomor itu — tapi pihak luar hanya melihat satu nomor. Itulah NAT!')}

        <h3 class="sub-head">Apa itu NAT?</h3>
        <p><strong>NAT (Network Address Translation)</strong> menerjemahkan alamat IP pada header paket data. Biasanya digunakan untuk mengubah <strong>IP private ↔ IP public</strong> saat perangkat LAN mengakses internet.</p>

        <h3 class="sub-head">Jenis-Jenis NAT</h3>
        <div class="accordion">
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🔵 Static NAT — Satu-ke-Satu</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Satu IP private dipetakan <strong>permanen</strong> ke satu IP public. Digunakan untuk server internal yang harus bisa diakses dari internet.</p><p><em>Contoh:</em> 192.168.1.10 (web server internal) ↔ 203.0.113.10 (IP public tetap)</p>
            ${codeBlock('Cisco IOS','Router(config)# ip nat inside source static 192.168.1.10 203.0.113.10')}</div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🟢 Dynamic NAT — Pool Alamat</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>IP private secara dinamis dipetakan ke salah satu IP dari <strong>pool</strong> IP public. Cocok jika ada beberapa IP public tersedia.</p></div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🟡 PAT / NAT Overload — Paling Umum</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Banyak IP private → <strong>satu IP public</strong> menggunakan port number berbeda untuk membedakan sesi. Ini yang digunakan di rumah dan kantor kebanyakan.</p>
            <p><em>Contoh:</em> 192.168.1.2:1025 ↔ 203.0.113.1:50001 | 192.168.1.3:1026 ↔ 203.0.113.1:50002</p>
            ${codeBlock('Cisco IOS','! Tandai interface LAN sebagai inside\nRouter(config)# interface GigabitEthernet0/0\nRouter(config-if)# ip nat inside\n\n! Tandai interface WAN sebagai outside\nRouter(config)# interface GigabitEthernet0/1\nRouter(config-if)# ip nat outside\n\n! ACL untuk jaringan LAN\nRouter(config)# access-list 1 permit 192.168.1.0 0.0.0.255\n\n! Aktifkan PAT\nRouter(config)# ip nat inside source list 1 interface GigabitEthernet0/1 overload\n\n! Verifikasi\nRouter# show ip nat translations\nRouter# show ip nat statistics')}</div></div>
        </div>

        <h3 class="sub-head">Cara Kerja PAT &amp; Port Forwarding (Step by Step)</h3>
        ${pptIllo('nat-mikrotik-topology.svg', 'Arsitektur Gateway NAT/PAT (RFC 3022): translasi IP Private LAN (192.168.1.0/24) ke IP Public WAN (203.0.113.5) dengan SRCNAT Masquerade (outbound) dan DSTNAT Port Forwarding (inbound ke server lokal)', 'Diagram arsitektur NAT PAT Masquerade dan Port Forwarding')}
        <ul class="step-list">
            ${stepItem(1,'PC Kirim Request (Inside Local)','PC 192.168.1.10 port 54321 mengirim paket HTTPS ke server publik 8.8.8.8 port 443')}
            ${stepItem(2,'Router Cek Routing & Conntrack NAT','Router mendeteksi paket keluar via interface WAN → perlu ditranslasi dengan SRCNAT/PAT')}
            ${stepItem(3,'Translasi Source IP:Port (Inside Global)','Router mengganti source menjadi 203.0.113.5:61001 dan mencatat sesi di tabel NAT translation')}
            ${stepItem(4,'Kirim ke Internet (Outside Global)','Server publik menerima request dari 203.0.113.5:61001 (topologi internal LAN tetap tersembunyi)')}
            ${stepItem(5,'Response Balik & Dekapsulasi NAT','Server membalas ke 203.0.113.5:61001 → Router mencocokkan port 61001 di tabel NAT → kembalikan tujuan ke 192.168.1.10:54321')}
        </ul>

        <h3 class="sub-head">Internet Gateway &amp; Konfigurasi MikroTik / Cisco</h3>
        ${codeBlock('MikroTik RouterOS — SRCNAT Masquerade & DSTNAT Port Forwarding','# 1. Outbound PAT (Masquerade) agar seluruh klien LAN bisa internetan\n/ip firewall nat add chain=srcnat out-interface=ether1-WAN action=masquerade comment="PAT LAN ke Internet"\n\n# 2. Inbound Port Forwarding (DSTNAT) dari IP Publik port 8080 ke Web Server lokal 192.168.1.100:80\n/ip firewall nat add chain=dstnat in-interface=ether1-WAN protocol=tcp dst-port=8080 \\\n    action=dst-nat to-addresses=192.168.1.100 to-ports=80 comment="Forward Web Server"')}
        <p><strong>Default Gateway</strong> adalah alamat IP interface lokal router yang menjadi "pintu keluar" dari sebuah subnet LAN. Setiap host wajib memiliki konfigurasi default gateway yang berada pada subnet yang sama agar dapat berkomunikasi lintas jaringan.</p>
        ${tbl(['Fungsi Gateway','Deskripsi'],[
            ['Routing','Meneruskan paket dari LAN ke internet dan sebaliknya'],
            ['NAT','Menerjemahkan IP private ↔ IP public'],
            ['DHCP Server','Memberikan IP otomatis ke perangkat di LAN'],
            ['DNS Forwarder','Meneruskan query DNS ke server DNS ISP'],
            ['Firewall','Memfilter traffic berbahaya masuk/keluar jaringan'],
        ])}
        ${callout('success','fa-check-circle','Aturan Default Gateway','IP default gateway biasanya adalah IP pertama atau terakhir dari subnet. Contoh: Jaringan 192.168.1.0/24 → gateway = 192.168.1.1. Jika gateway salah, PC tidak bisa akses internet meski bisa ping ke PC lain di LAN yang sama.')}

        ${illo('nat-pat-flow.svg','PAT: banyak IP private di LAN diterjemahkan ke satu IP public dengan port number yang berbeda','Ilustrasi alur NAT dan PAT jaringan')}

        ${dense('NAT/PAT — Inti Materi',[
            '<strong>Static NAT</strong>: 1 private ↔ 1 public permanen (untuk server yang harus terlihat dari internet). <strong>Dynamic NAT</strong>: private ↔ pool public (antre bila pool habis). <strong>PAT/Overload</strong>: banyak private ↔ 1 public via port number — paling umum dipakai.',
            'Dua perintah wajib menandai interface: <code>ip nat inside</code> (interface LAN) dan <code>ip nat outside</code> (interface WAN).',
            'PAT bekerja dengan menyimpan mapping <code>IP:port</code> di tabel NAT, sehingga response bisa dikembalikan ke PC asal yang tepat.',
            'Default gateway = "pintu keluar" LAN. Tanpa gateway yang benar, PC bisa ping lokal tapi tidak bisa buka internet.',
            'Fungsi gateway: routing, NAT, DHCP server, DNS forwarder, dan firewall dasar — biasanya semua di satu router.'
        ],[
            ['NAT','Network Address Translation — menerjemahkan IP private ↔ public'],
            ['PAT','Port Address Translation (NAT overload) — bedakan sesi lewat port'],
            ['Default gateway','IP router yang menampung keluar-masuknya trafik LAN'],
            ['Translation table','Tabel simpan mapping IP:port di router NAT'],
            ['Inside/Outside','Istilah interface: dalam (LAN) vs luar (WAN)']
        ],[
            'Urutan konfigurasi PAT: tandai inside/outside → buat ACL LAN → ip nat inside source list 1 interface Gi0/1 overload.',
            'Verifikasi: <code>show ip nat translations</code> dan <code>show ip nat statistics</code> — sering diminta pada soal praktik.',
            'Kalau internet mati tapi LAN jalan: cek dulu apakah NAT-nya kelewat / ACL-nya salah, bukan kabel.'
        ])}
        <button class="btn-primary" onclick="showAssessment('nat')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen NAT & Internet Gateway (20 Soal)</button>
    </div>`;
}


// ============================================================
// E2 — KABEL
// ============================================================
function kabel() {
    return `<div class="card">
        ${sectionHead('fa-ethernet','Instalasi Jaringan Kabel','sh-teal')}
        <p>Jaringan kabel menggunakan media fisik sebagai jalur transmisi data. Meski nirkabel semakin populer, jaringan kabel tetap unggul dalam hal <strong>kecepatan, stabilitas, keamanan, dan latensi rendah</strong>.</p>

        <h3 class="sub-head">Jenis Kabel Jaringan</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="kb-utp">UTP/FTP/STP</button>
                <button class="tab-btn" data-tab="kb-coax">Coaxial</button>
                <button class="tab-btn" data-tab="kb-fo">Fiber Optic</button>
            </div>
            <div id="kb-utp" class="tab-pane active">
                ${pptIllo('kabel-utp-ftp-stp.jpeg', 'Perbandingan konstruksi kabel Twisted Pair: UTP (tanpa pelindung foil), FTP (F/UTP dengan selubung foil), dan STP (S/FTP dengan pelindung per pasang & braid mesh)')}
                <div class="illus-wrap">
                    <svg viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg">
                        <text x="350" y="20" fill="#0f766e" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Penampang Kabel UTP — 4 Pasang Kawat Tembaga Terpilin</text>
                        <!-- Cable body -->
                        <ellipse cx="350" cy="90" rx="280" ry="35" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2"/>
                        <!-- 4 pairs -->
                        ${[['#ef4444','#fca5a5'],['#22c55e','#86efac'],['#3b82f6','#93c5fd'],['#a16207','#d97706']].map(([c1,c2],i)=>{
                            const x = 100 + i*120;
                            return `<circle cx="${x}" cy="82" r="10" fill="${c1}"/><circle cx="${x+16}" cy="98" r="10" fill="${c2}" stroke="white" stroke-width="1.5"/>`;
                        }).join('')}
                        <text x="350" y="145" fill="#64748b" font-size="10" text-anchor="middle" font-family="Inter,sans-serif">4 pasang kawat (8 kabel total) — setiap pasang dipilin untuk mengurangi interferensi</text>
                    </svg>
                </div>
                ${tbl(['Tipe (ISO/IEC 11801)','Perisai','EMI Protection','Fleksibilitas','Harga','Aplikasi'],[
                    ['U/UTP (UTP)','Tidak ada','Rendah','Sangat fleksibel','Murah','LAN rumah, sekolah, kantor'],
                    ['F/UTP (FTP/ScTP)','Foil keseluruhan + drain wire','Sedang','Fleksibel','Sedang','Lingkungan interferensi sedang'],
                    ['S/FTP (STP)','Foil per pasang + braid overall','Tinggi','Kaku (wajib grounding)','Mahal','Industri, pabrik, data center 10G/40G'],
                ])}
                <p><strong>Kategori Twisted Pair Standar ANSI/TIA-568.2-D &amp; ISO/IEC 11801:</strong></p>
                ${tbl(['Kategori','Frekuensi','Kecepatan Maks','Jarak Maks','Penggunaan Standar Industri'],[
                    ['Cat 5e','100 MHz','1 Gbps (1000BASE-T) / 2.5G','100 m','Standar minimum LAN Gigabit & PoE'],
                    ['Cat 6','250 MHz','1 Gbps (100 m) / 10 Gbps (55 m)','100 m (1G) · 55 m (10G)','Standar pengkabelan gedung & sekolah baru'],
                    ['Cat 6A','500 MHz','10 Gbps (10GBASE-T)','100 m penuh','Backbone horizontal, AP Wi-Fi 6/7 & PoE++ 90W'],
                    ['Cat 7 (Class F)','600 MHz','10 Gbps (S/FTP)','100 m','Lingkungan industri ber-EMI tinggi'],
                    ['Cat 8','2000 MHz','25 Gbps / 40 Gbps','30 m','Data center Top-of-Rack (Switch-to-Server)'],
                ])}
            </div>
            <div id="kb-coax" class="tab-pane">
                ${pptGallery([
                    ['kabel-koaksial-struktur.jpg','Struktur Coaxial','Inti tembaga, dielektrik, mesh, jaket'],
                    ['kabel-koaksial-lapisan.jpeg','Lapisan Pelindung','Susunan lapisan dari dalam ke luar'],
                    ['kabel-koaksial-jenis.jpeg','Jenis Kabel Coaxial','RG-6, RG-11, RG-58'],
                    ['kabel-koaksial-konektor.jpeg','Jenis Konektor Coaxial','SMA, N, TNC, SMC, BNC, SMB, hingga UHF — beserta batas frekuensinya'],
                    ['kabel-koaksial-tools.jpeg','Alat Coaxial','Crimping & stripping coaxial'],
                    ['kabel-koaksial-layers.png','Anatomi Coaxial','Label lengkap komponen kabel'],
                ])}
                <div class="illus-wrap">
                    <svg viewBox="0 0 720 170" xmlns="http://www.w3.org/2000/svg">
                        <rect width="720" height="170" rx="12" fill="#f8fafc"/>
                        <text x="360" y="24" fill="#0f766e" font-size="13" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Anatomi Penampang Kabel Coaxial (RG-6 / RG-58)</text>
                        <!-- Step-cut Coaxial Layers -->
                        <rect x="28" y="48" width="180" height="74" rx="8" fill="#1e293b"/>
                        <rect x="200" y="57" width="120" height="56" rx="5" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
                        <rect x="315" y="65" width="110" height="40" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>
                        <rect x="420" y="80" width="95" height="10" rx="3" fill="#d97706"/>
                        <!-- Labels on Right with Leader Lines -->
                        <line x1="118" y1="122" x2="118" y2="148" stroke="#1e293b" stroke-width="1.5"/>
                        <text x="118" y="160" fill="#1e293b" font-size="10" font-weight="700" text-anchor="middle">1. Outer Jacket (PVC/PE)</text>
                        <line x1="260" y1="113" x2="260" y2="148" stroke="#475569" stroke-width="1.5"/>
                        <text x="260" y="160" fill="#334155" font-size="10" font-weight="700" text-anchor="middle">2. Braided Shield + Foil</text>
                        <line x1="370" y1="105" x2="415" y2="148" stroke="#0284c7" stroke-width="1.5"/>
                        <text x="425" y="160" fill="#0369a1" font-size="10" font-weight="700" text-anchor="middle">3. Dielectric Insulator</text>
                        <line x1="515" y1="85" x2="545" y2="85" stroke="#d97706" stroke-width="2"/>
                        <rect x="548" y="64" width="152" height="42" rx="8" fill="#fef3c7" stroke="#f59e0b"/>
                        <text x="624" y="82" fill="#92400e" font-size="10.5" font-weight="800" text-anchor="middle">4. Center Conductor</text>
                        <text x="624" y="97" fill="#b45309" font-size="9.5" text-anchor="middle">Inti Tembaga (Sinyal RF/Data)</text>
                    </svg>
                </div>
                ${tbl(['Tipe','Impedansi','Penggunaan Utama'],[
                    ['RG-6','75 Ω','TV kabel, internet, satellite dish'],
                    ['RG-11','75 Ω','Jarak jauh, backbone CCTV'],
                    ['RG-58','50 Ω','10Base2 Ethernet (sudah usang)'],
                ])}
            </div>
            <div id="kb-fo" class="tab-pane">
                <figure class="img-showcase"><img src="assets/devices/fiber.jpg" alt="Kabel Fiber Optic OS2 dan OM4 dengan konektor SC/APC dan SC/UPC" loading="lazy"><figcaption>Kabel Fiber Optic — Single Mode kuning (SC/APC hijau &amp; SC/UPC biru), Multimode OM4 aqua (LC), dan serat bare glass 125 µm</figcaption></figure>
                <p>Fiber Optic menggunakan <strong>pulsa cahaya</strong> (TIR) sebagai media transmisi. Kecepatan tinggi, jarak ratusan km, kebal EMI. Pelajari lebih lanjut di materi <a href="#" onclick="showPage('fiber');return false">Fiber Optic →</a></p>
            </div>
        </div>

        <h3 class="sub-head">Standar Pengkabelan T568A &amp; T568B (ANSI/TIA-568.2-D)</h3>
        ${pptIllo('kabel-t568-gigabit-poe.svg', 'Diagram standar pinout RJ-45 (T568A vs T568B), fungsi setiap pin pada Fast Ethernet (100BASE-TX: Pin 1-2 TX, 3-6 RX) vs Gigabit Ethernet (1000BASE-T: keempat pasang Pin 1-8 aktif full-duplex) serta penyaluran daya IEEE 802.3af/at/bt PoE', 'Diagram standar pinout T568A T568B Gigabit Ethernet dan PoE')}
        ${pptGallery([
            ['kabel-t568.jpeg','Skema Pinout T568A, T568B & Crossover','Urutan 8 konduktor pada plug RJ-45 (8P8C) beserta persilangan pasangan TX/RX'],
            ['devices/utp.jpg','Kabel UTP 4-Pair & Konektor RJ-45','4 pasang kawat tembaga berpilin (Oranye, Hijau, Biru, Cokelat) untuk terminasi RJ-45'],
        ])}
        <div class="illus-wrap">
            <svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
                <text x="180" y="22" fill="#1e40af" font-size="13" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">T568B (Paling Umum)</text>
                <text x="530" y="22" fill="#15803d" font-size="13" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">T568A</text>
                <!-- T568B RJ45 -->
                <rect x="30" y="35" width="295" height="150" rx="12" fill="white" stroke="#e2e8f0" stroke-width="2"/>
                ${[['#FF7F00','W-OR'],['#FF6600','OR'],['#90EE90','W-GR'],['#0000CD','BL'],['#ADD8E6','W-BL'],['#008000','GR'],['#D2B48C','W-BR'],['#8B4513','BR']].map(([c,n],i)=>`
                <rect x="${50+i*30}" y="60" width="24" height="90" rx="4" fill="${c}" stroke="rgba(0,0,0,.15)" stroke-width="1"/>
                <text x="${62+i*30}" y="175" fill="#475569" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">${i+1}</text>
                <text x="${62+i*30}" y="55" fill="${c}" font-size="8" text-anchor="middle" font-family="monospace">${n}</text>`).join('')}
                <!-- T568A RJ45 -->
                <rect x="385" y="35" width="295" height="150" rx="12" fill="white" stroke="#e2e8f0" stroke-width="2"/>
                ${[['#90EE90','W-GR'],['#008000','GR'],['#FF7F00','W-OR'],['#0000CD','BL'],['#ADD8E6','W-BL'],['#FF6600','OR'],['#D2B48C','W-BR'],['#8B4513','BR']].map(([c,n],i)=>`
                <rect x="${405+i*30}" y="60" width="24" height="90" rx="4" fill="${c}" stroke="rgba(0,0,0,.15)" stroke-width="1"/>
                <text x="${417+i*30}" y="175" fill="#475569" font-size="8" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">${i+1}</text>
                <text x="${417+i*30}" y="55" fill="${c}" font-size="8" text-anchor="middle" font-family="monospace">${n}</text>`).join('')}
                <text x="350" y="205" fill="#64748b" font-size="10" text-anchor="middle" font-family="Inter,sans-serif">Perbedaan: posisi pasang Orange dan Green ditukar</text>
            </svg>
        </div>
        ${tbl(['Tipe Kabel','Ujung A','Ujung B','Menghubungkan'],[
            ['Straight-through','T568B','T568B','Perangkat BERBEDA: PC–Switch, Switch–Router'],
            ['Crossover','T568B','T568A','Perangkat SAMA: PC–PC, Switch–Switch'],
            ['Rollover/Console','T568B','Mirror (T568B terbalik)','PC ke port Console router/switch'],
        ])}

        <h3 class="sub-head">Langkah Instalasi Kabel UTP</h3>
        <ul class="step-list">
            ${stepItem(1,'Potong Kabel','Ukur panjang yang dibutuhkan, tambahkan 10–15 cm ekstra sebagai cadangan')}
            ${stepItem(2,'Kupas Jaket Luar ±3 cm','Gunakan cable stripper — hati-hati jangan sampai mengiris isolasi kabel dalam')}
            ${stepItem(3,'Pisahkan & Urutkan 8 Kabel','Untuk T568B: W-OR, OR, W-GR, BL, W-BL, GR, W-BR, BR (ingat urutan ini!)')}
            ${stepItem(4,'Ratakan & Potong Ujung','Ratakan 8 kabel sejajar, potong rata sekitar 1.5 cm dari jaket')}
            ${stepItem(5,'Masukkan ke Konektor RJ-45','Pastikan semua 8 kabel masuk penuh hingga ujung konektor terlihat')}
            ${stepItem(6,'Crimping','Tekan kuat dengan crimping tool hingga terdengar "klik"')}
            ${stepItem(7,'Test dengan Cable Tester','LED 1–8 menyala berurutan = Straight OK. Pola 1-2-3-6 = Crossover OK')}
        </ul>
        <h3 class="sub-head">Langkah Instalasi Kabel Koaksial</h3>
        <ul class="step-list">
            ${stepItem(1,'Potong & Ukur Kabel','Ukur panjang jalur, sisakan cadangan 1–2 m untuk penyesuaian di lapangan')}
            ${stepItem(2,'Kupas Jaket Luar','Gunakan coaxial stripper — kupas jaket ±2 cm tanpa merusak mesh pelindung')}
            ${stepItem(3,'Ratakan Mesh & Inti','Lipat mesh ke belakang, rapikan inti tembaga — jangan sampai terputus atau tertekuk')}
            ${stepItem(4,'Pasang Konektor BNC/TNC','Masukkan inti ke dalam konektor sampai menempel pada dielektrik bagian dalam')}
            ${stepItem(5,'Crimp / Kunci Konektor','Tekan dengan crimping coaxial hingga konektor terkunci kuat dan tidak mudah lepas')}
            ${stepItem(6,'Uji Sinyal','Gunakan cable tester atau signal meter — pastikan tidak ada sinyal bocor (attenuation tinggi)')}
        </ul>
        ${pptIllo('kabel-koaksial-konektor.jpeg','Ragam konektor kabel coaxial — SMA, N, TNC, SMC, BNC, SMB, Mini-UHF, dan UHF beserta batas frekuensi masing-masing (BNC dipakai pada jaringan LAN koaksial)')}

        <h3 class="sub-head">Langkah Instalasi Kabel Fiber Optic</h3>
        <ul class="step-list">
            ${stepItem(1,'Rencanakan Jalur &amp; Ukur Panjang','Tentukan rute fiber, ukur panjang, hindari tikungan tajam (jaga radius tekuk minimum ≥20× diameter kabel saat ditarik)')}
            ${stepItem(2,'Tarik Kabel Fiber','Tarik perlahan dengan pull tape / winch — gunakan swivel anti-twist &amp; jangan melebihi Max Tensile Strength')}
            ${stepItem(3,'Strip &amp; Bersihkan Coating','Gunakan Miller stripper 3 lubang, bersihkan bare fiber dengan alkohol IPA 99,9% dan tisu lint-free')}
            ${stepItem(4,'Cleaving Presisi','Potong serat lurus 90° (&lt;0,5°) dengan precision cleaver — buang serpihan ke wadah khusus')}
            ${stepItem(5,'Splicing (Fusion / Mechanical)','Sambungkan dua serat dengan fusion splicer hingga loss minimal (tipikal ≤0,05 dB, maks Telkom ≤0,10 dB)')}
            ${stepItem(6,'Pasang Connector / Terminasi','Pasang konektor SC/LC/APC sesuai kode warna (jangan campur UPC biru &amp; APC hijau), batas TIA-568 ≤0,75 dB (praktik ≤0,25 dB)')}
            ${stepItem(7,'Uji Tier-1 (OLTS/OPM) &amp; Tier-2 (OTDR)','Sertifikasi redaman end-to-end dengan OLS+OPM, lalu petakan lokasi sambungan &amp; jarak memakai OTDR')}
        </ul>
        <figure class="img-showcase"><img src="assets/fo/fig-fusion-splicer-diagram.svg" alt="Diagram kerja Fusion Splicer dan SOP 6 Tahap" loading="lazy"><figcaption>Diagram Prinsip Fusion Splicing (PAS) dan SOP 6 tahap — menghasilkan sambungan permanen berredaman rendah</figcaption></figure>

        <h3 class="sub-head">Alat Instalasi Kabel</h3>
        ${pptIllo('kabel-tools.jpeg', 'Peralatan instalasi kabel: crimping tool, cable stripper, cable tester, dan konektor RJ-45')}
        <div class="feat-grid">
            ${featCard('🔧','Crimping Tool','Menekan konektor RJ-45 ke kabel UTP. Ada yang manual dan ratchet (lebih presisi).')}
            ${featCard('✂️','Cable Stripper','Mengupas jaket luar kabel tanpa merusak kabel dalam.')}
            ${featCard('🔍','Cable Tester','Menguji urutan kabel dan memastikan tidak ada kabel yang putus atau salah posisi.')}
            ${featCard('🔌','Konektor RJ-45','Konektor 8-pin untuk ujung kabel UTP. Pastikan cocok dengan kategori kabel (Cat5e/Cat6).')}
            ${featCard('📏','Cable Punch-down Tool','Memasang kabel ke keystone jack pada patch panel atau wall plate.')}
            ${featCard('🔦','Toner & Probe','Melacak jalur kabel di dalam tembok atau plafon.')}
        </div>

        ${illo('kabel-utp-pairing.svg','4 pasang kabel UTP yang dipilin — pengurangan interferensi crosstalk, plus warna T568A & T568B','Ilustrasi pasangan kabel UTP dan standar warna T568')}

        ${dense('Pengkabelan — Hafal Ini Sebelum Praktik',[
            'Urutan warna <strong>T568B</strong>: W-OR, OR, W-GR, BL, W-BL, GR, W-BR, BR. T568A = posisi pasang Orange &amp; Green ditukar.',
            '<strong>Straight-through</strong> (T568B–T568B) → perangkat <em>berbeda</em>: PC–Switch, Switch–Router. <strong>Crossover</strong> (T568B–T568A) → perangkat <em>sama</em>: PC–PC, Switch–Switch. (Catatan: fitur Auto-MDIX sudah mengatasi hal ini otomatis di perangkat modern.)',
            'Maksimal panjang UTP = <strong>100 m</strong> (termasuk patch cord). Lebih dari itu, pakai switch repeater atau fiber.',
            'Setiap pasang kabel <strong>dipilin (twisted)</strong> untuk membatalkan interferensi crosstalk — jangan dilepas pilinannya terlalu panjang saat crimping.',
            'Urutan praktik: ukur → kupas jaket 3 cm → urutkan warna → ratakan &amp; potong 1,5 cm → masuk RJ-45 penuh → crimp sampai klik → tes LED 1–8.'
        ],[
            ['RJ-45','Konektor 8-pin untuk kabel UTP'],
            ['Crimping','Menekan konektor agar pin menancap pada kawat'],
            ['Crosstalk','Interferensi antar pasang kabel dalam satu kabel'],
            ['T568A/B','Standar urutan warna kabel UTP'],
            ['Crossover','Kabel berbeda ujung untuk menghubungkan perangkat sejenis']
        ],[
            'Cable tester LED berurutan 1→8 = straight OK. Pola 1-2-3-6 menyala = crossover.',
            'Jangan lupa: uji kabel DULU selesai dipasang — kabel 90% masalah LAN berasal dari ujung kabel yang salah crimp.'
        ])}
        <button class="btn-primary" onclick="showAssessment('kabel')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Jaringan Kabel (20 Soal)</button>
    </div>`;
}


// ============================================================
// E2 — NIRKABEL
// ============================================================
function nirkabel() {
    return `<div class="card">
        ${sectionHead('fa-wifi','Instalasi Jaringan Nirkabel (WiFi)','sh-teal')}
        ${callout('info','fa-info-circle','Prinsip Dasar','Jaringan nirkabel menggunakan gelombang radio untuk mentransmisikan data. Data digital dimodulasi menjadi sinyal radio, dipancarkan oleh antena, dan ditangkap oleh penerima yang mengkonversi kembali menjadi data digital.')}

        <h3 class="sub-head">Spektrum Gelombang Radio</h3>
        ${pptIllo('wifi-spektrum.png', 'Spektrum gelombang elektromagnetik — dari sinar gamma, sinar-X, ultraviolet, dan inframerah hingga gelombang radio; pita radio inilah yang dipakai WiFi, beserta rantai siaran radio AM/FM')}
        ${pptIllo('wifi-standar.png', 'Pita frekuensi gelombang radio VLF sampai EHF: gelombang maritime, siaran AM, siaran TV, hingga satelit dan radio dua arah')}

        <h3 class="sub-head">Standar WiFi IEEE 802.11</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
                <!-- Timeline -->
                <line x1="30" y1="100" x2="670" y2="100" stroke="#e2e8f0" stroke-width="3"/>
                ${[
                    ['802.11b','1999','2.4G','11M','#94a3b8',80],
                    ['802.11g','2003','2.4G','54M','#64748b',180],
                    ['WiFi 4\n802.11n','2009','2.4/5G','600M','#3b82f6',280],
                    ['WiFi 5\n802.11ac','2013','5 GHz','3.5G','#2563eb',390],
                    ['WiFi 6\n802.11ax','2019','2.4/5G','9.6G','#1d4ed8',500],
                    ['WiFi 7\n802.11be','2024','2.4/5/6G','46G','#1e40af',620],
                ].map(([n,y,f,s,c,x])=>`
                <circle cx="${x}" cy="100" r="8" fill="${c}"/>
                <text x="${x}" y="82" fill="${c}" font-size="9" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">${n.replace('\n',' ')}</text>
                <text x="${x}" y="68" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="Inter,sans-serif">${y}</text>
                <text x="${x}" y="122" fill="#475569" font-size="9" font-weight="600" text-anchor="middle" font-family="Inter,sans-serif">${f}</text>
                <text x="${x}" y="138" fill="${c}" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">${s}bps</text>`).join('')}
                <text x="350" y="175" fill="#64748b" font-size="10" text-anchor="middle" font-family="Inter,sans-serif">Evolusi standar WiFi dari 1999 hingga 2024</text>
            </svg>
        </div>

        <h3 class="sub-head">Perbandingan Frekuensi WiFi</h3>
        ${pptIllo('wifi-multipath.png', 'Multipath propagation — sinyal WiFi memantul ke dinding/benda sehingga tiba di penerima melalui beberapa jalur sekaligus')}
        <div class="illus-wrap">
            <svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
                <!-- 2.4 GHz -->
                <circle cx="120" cy="100" r="80" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,3"/>
                <circle cx="120" cy="100" r="60" fill="none" stroke="#3b82f6" stroke-width="1.5"/>
                <circle cx="120" cy="100" r="40" fill="none" stroke="#3b82f6" stroke-width="1"/>
                <rect x="105" y="90" width="30" height="20" rx="5" fill="#1e40af"/>
                <text x="120" y="103" fill="white" font-size="9" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">AP</text>
                <text x="120" y="30" fill="#1e40af" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">2.4 GHz</text>
                <text x="120" y="185" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Jangkauan jauh, tembus dinding</text>
                <!-- 5 GHz -->
                <circle cx="370" cy="100" r="60" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="6,3"/>
                <circle cx="370" cy="100" r="45" fill="none" stroke="#f97316" stroke-width="1.5"/>
                <circle cx="370" cy="100" r="28" fill="none" stroke="#f97316" stroke-width="1"/>
                <rect x="355" y="90" width="30" height="20" rx="5" fill="#c2410c"/>
                <text x="370" y="103" fill="white" font-size="9" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">AP</text>
                <text x="370" y="30" fill="#c2410c" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">5 GHz</text>
                <text x="370" y="185" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Kecepatan lebih tinggi, jangkauan sedang</text>
                <!-- 6 GHz -->
                <circle cx="600" cy="100" r="40" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="6,3"/>
                <circle cx="600" cy="100" r="28" fill="none" stroke="#22c55e" stroke-width="1.5"/>
                <rect x="585" y="90" width="30" height="20" rx="5" fill="#15803d"/>
                <text x="600" y="103" fill="white" font-size="9" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">AP</text>
                <text x="600" y="30" fill="#15803d" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">6 GHz</text>
                <text x="600" y="185" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Sangat cepat, jangkauan terpendek</text>
            </svg>
        </div>

        ${tbl(['Parameter','2.4 GHz','5 GHz','6 GHz (Baru)'],[
            ['Jangkauan','Jauh (~50m indoor)','Sedang (~30m indoor)','Pendek (~15m indoor)'],
            ['Kecepatan','Lambat','Cepat','Sangat cepat'],
            ['Tembus Dinding','Baik','Sedang','Kurang'],
            ['Interferensi','Tinggi (microwave, Bluetooth)','Rendah','Sangat rendah'],
            ['Channel non-overlap','3 channel (1,6,11)','23 channel (20MHz)','59 channel (20MHz)'],
            ['Standar WiFi','WiFi 4/5/6','WiFi 5/6','WiFi 6E/7'],
        ])}

        <h3 class="sub-head">Arsitektur Outdoor (PtP/PtMP), Zona Fresnel &amp; Konfigurasi AP</h3>
        ${pptIllo('wifi-ptp-ptmp-fresnel.svg', 'Arsitektur jaringan nirkabel outdoor: Link Backhaul Point-to-Point (PtP) dengan syarat clearance ≥60% Zona Fresnel, distribusi Point-to-Multi-Point (PtMP Sectoral ke CPE), serta standar parameter site survey (EIRP, RSSI ≥ −65 dBm, SNR ≥ 25 dB)', 'Diagram arsitektur nirkabel PtP PtMP Zona Fresnel dan Link Budget')}
        ${tbl(['Parameter','Penjelasan','Rekomendasi'],[
            ['SSID','Nama jaringan WiFi yang terlihat','Jangan gunakan nama default router'],
            ['Password','Kata sandi autentikasi','Minimal 12 karakter, kombinasi huruf+angka+simbol'],
            ['Security Protocol','Metode enkripsi WiFi','Gunakan WPA3 atau WPA2-AES minimal'],
            ['Channel','Frekuensi sub-band yang digunakan','Gunakan channel yang berbeda dari AP tetangga'],
            ['Channel Width','Lebar bandwidth (20/40/80/160 MHz)','80 MHz untuk 5GHz, 20 MHz untuk 2.4GHz padat'],
            ['Transmit Power','Kekuatan pancaran sinyal','Sesuaikan dengan luas ruangan'],
        ])}

        <h3 class="sub-head">Protokol Keamanan WiFi</h3>
        ${tbl(['Protokol','Enkripsi','Status','Keterangan'],[
            ['Open (No Auth)','Tidak ada','❌ Tidak Aman','Jangan gunakan untuk data sensitif'],
            ['WEP','RC4 64/128-bit','❌ Sudah Diretas','Dapat diretas dalam menit — jangan digunakan'],
            ['WPA','TKIP','⚠️ Lemah','Sudah usang, hindari'],
            ['WPA2-Personal','AES-CCMP','✅ Aman','Standar minimum yang diterima'],
            ['WPA2-Enterprise','AES-CCMP + RADIUS','✅ Sangat Aman','Untuk kantor, autentikasi per user'],
            ['WPA3-Personal','SAE (AES-256)','✅ Terkuat','Terbaru, direkomendasikan'],
        ])}

        ${callout('warning','fa-exclamation-triangle','Roaming & Mesh WiFi','Untuk area luas (sekolah, hotel), gunakan beberapa AP dengan SSID yang SAMA dan channel BERBEDA. Perangkat akan otomatis berpindah ke AP terdekat (roaming). Alternatif modern: Mesh WiFi System (Ubiquiti UniFi, TP-Link Deco, Google Nest).')}

        ${illo('wifi-channel.svg','Channel WiFi 2.4 GHz: hanya channel 1, 6, dan 11 yang tidak saling tumpang tindih','Ilustrasi pemilihan channel WiFi 2.4 GHz')}

        <h3 class="sub-head">WiFi vs Seluler (4G/5G)</h3>
        ${pptIllo('wifi-4g.png', 'WiFi portabel — perangkat lokal (printer, ponsel, laptop) terhubung ke 4G router bervisia eksternal, lalu tersambung ke internet melalui jaringan seluler 4G/5G', 'Diagram WiFi portable: perangkat lokal → 4G Router + antena eksternal → jaringan seluler 4G → internet')}

        ${dense('WiFi — Poin Kunci',[
            '2.4 GHz: jangkauan jauh &amp; tembus dinding, tapi lambat dan padat (microwave, Bluetooth, Bluetooth mouse ikut mengganggu). 5/6 GHz: cepat, jangkauan lebih pendek.',
            'Di 2.4 GHz hanya ada <strong>3 channel yang tidak tumpang tindih: 1, 6, 11</strong>. Pilih yang paling sepi dari AP tetangga.',
            'Standar: WiFi 4 (802.11n) → WiFi 5 (ac) → WiFi 6 (ax) → WiFi 7 (be). Semakin baru: lebih cepat, lebih banyak perangkat serentak (OFDMA, MU-MIMO).',
            'Keamanan WiFi: <strong>WEP ❌ (durasih menit) → WPA ❌ → WPA2-AES ✅ → WPA3 SAE ✅+</strong>. Jangan pernah pakai WEP/WPA-TKIP lagi.',
            'Untuk sekolah: beberapa AP, <strong>SSID sama, channel berbeda</strong> → roaming mulus. Atau pakai Mesh WiFi yang otomatis mengatur.',
            'WPA2-Enterprise (802.1X + RADIUS) = autentikasi per user, jauh lebih aman dari WPA2-PSK bersama.'
        ],[
            ['SSID','Nama jaringan WiFi yang terlihat oleh perangkat'],
            ['Channel','Sub-frekuensi dalam band 2.4/5/6 GHz'],
            ['Channel width','Lebar bandwidth kanal: 20/40/80/160 MHz'],
            ['Roaming','Perpindahan otomatis ke AP terkuat terdekat'],
            ['WPA3-SAE','Enkripsi WiFi terbaru dengan anti brute-force']
        ],[
            'Soal pilihan: "WiFi lambat &amp; sering putus di 2.4 GHz?" → ganti channel (1/6/11) atau pindah ke 5 GHz.',
            'SSID jangan pakai nama default router (mis. "TP-Link_XXXX") — ganti + aktifkan WPA3/WPA2-AES + password minimal 12 karakter.'
        ])}
        <button class="btn-primary" onclick="showAssessment('nirkabel')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Jaringan Nirkabel (20 Soal)</button>
    </div>`;
}

// ============================================================
// E2 — FIBER OPTIC
// ============================================================
// ============================================================
// HALAMAN FIBER OPTIK — BERANDA TERSENDIRI + 7 TUJUAN PEMBELAJARAN
// Beranda tersendiri, disusun per elemen/TP seperti beranda Fase F.
// Gambar di-crop PER GAMBAR (assets/fo/fig-*.jpg) dan dijelaskan
// satu per satu — bukan strip per halaman.
// ============================================================


// ============================================================
// MATERI PENGAYAAN FIBER OPTIK (7 TUJUAN PEMBELAJARAN)
// ============================================================
const FO_ENRICHMENT = {
    "tp11": "\n<h2>1. K3LH Standar Industri Fiber Optik (IEC 60825-2, ANSI Z136.2 &amp; FOA)</h2>\n<p>Pekerjaan instalasi dan pemeliharaan jaringan serat optik memiliki karakteristik risiko unik yang berbeda dari kabel tembaga. Dua bahaya paling kritis adalah <b>serpihan serat kaca mikro 125 µm (fiber shards)</b> dan <b>radiasi laser inframerah tak kasat mata (invisible infrared radiation)</b>. Standar <b>IEC 60825-2</b> dan <b>ANSI Z136.2</b> mengatur keselamatan komunikasi optik secara ketat.</p>\n\n<h3>Alat Pelindung Diri (APD) Wajib Teknisi FO</h3>\n<table>\n<thead><tr><th>Nama APD</th><th>Standar / Spesifikasi</th><th>Fungsi Perlindungan Spesifik</th></tr></thead>\n<tbody>\n<tr><td><b>Kacamata Safety (Goggles)</b></td><td>ANSI Z87.1 / EN 166 (Side-shield)</td><td>Melindungi mata dari lontaran serpihan serat kaca 125 µm saat mengupas (stripping) &amp; memotong (cleaving).</td></tr>\n<tr><td><b>Rompi Reflektif (Hi-Vis)</b></td><td>ANSI/ISEA 107 Class 2 / EN ISO 20471</td><td>Memberi visibilitas tinggi saat bekerja di pinggir jalan raya atau dekat area tiang utilitas.</td></tr>\n<tr><td><b>Helm Keselamatan (Hard Hat)</b></td><td>SNI ISO 3873 / ANSI Z89.1 Type 1 Class E</td><td>Melindungi kepala dari kejatuhan perkakas dan bahaya sentuh induksi listrik di tiang bersama.</td></tr>\n<tr><td><b>Sepatu Safety (Steel/Composite Toe)</b></td><td>EN ISO 20345 S1P / ASTM F2413</td><td>Pelindung jari dan sol anti-tusuk paku saat bekerja di parit galian, handhole, dan manhole.</td></tr>\n<tr><td><b>Sarung Tangan Nitril &amp; Cut-Resistant</b></td><td>EN 388 Level 4 Cut Resistance</td><td>Mencegah serat kaca menancap ke pori kulit dan melindungi tangan dari pita baja tajam (steel tape armor).</td></tr>\n<tr><td><b>Full Body Harness</b></td><td>EN 361 dengan Double Lanyard &amp; Absorber</td><td>Wajib dipakai saat bekerja di ketinggian tiang &gt; 1.8 meter; wajib dicantolkan pada angkur kuat.</td></tr>\n</tbody>\n</table>\n\n<h3>Klasifikasi Bahaya Radiasi Laser Optik (IEC 60825-2)</h3>\n<p>Gelombang transmisi <b>1310 nm, 1490 nm, dan 1550 nm</b> berada di luar cahaya tampak (380–750 nm). Saat mata terpapar radiasi IR, pupil <b>tidak memicu refleks berkedip</b>, sedangkan lensa mata tetap memfokuskan energi laser ke retina (menyebabkan luka bakar permanen tanpa rasa sakit awal):</p>\n<table>\n<thead><tr><th>Kelas Bahaya</th><th>Kondisi di Jaringan FO</th><th>Protokol Pengamanan Wajib</th></tr></thead>\n<tbody>\n<tr><td><b>Class / Hazard Level 1</b></td><td>Sistem tertutup rapat &amp; konektor terpasang di adapter.</td><td>Aman selama selubung serat dan konektor tertutup rapat.</td></tr>\n<tr><td><b>Class / Hazard Level 1M</b></td><td>Port transceiver SFP/OLT &amp; ujung konektor terbuka bila dilihat lewat alat pembesar.</td><td>Aman mata telanjang, namun <b>BERBAHAYA jika dilihat memakai mikroskop / lup optik tanpa filter IR</b>!</td></tr>\n<tr><td><b>Class / Hazard Level 3B</b></td><td>Jalur penguat optik jarak jauh (<b>EDFA</b>, <b>Raman</b>, <b>DWDM</b> berdaya tinggi).</td><td>Luka retina seketika! Gunakan OPM untuk verifikasi jalur mati, kacamata filter IR, dan kontrol LSO.</td></tr>\n</tbody>\n</table>\n<div class=\"lesson-note\"><b>SOP Mutlak FOA:</b> Anggap setiap ujung serat atau port modul OLT/SFP selalu aktif. Verifikasi ketiadaan sinyal memakai Optical Power Meter (OPM) atau gunakan mikroskop video (digital inspection probe) daripada lup optik langsung. Sistem modern dilengkapi fitur pengaman otomatis <b>ALS (Automatic Laser Shutdown)</b> saat kabel terputus.</div>\n\n<h3>Prosedur Penanganan Limbah Serpihan Kaca (Fiber Shards)</h3>\n<ul>\n<li>Sediakan wadah tertutup berlabel (<i>Fiber Scrap Trash Can</i>) di dekat cleaver. Potongan kaca 125 µm <b>tidak tampak pada foto rontgen sinar-X medis biasa</b>!</li>\n<li>Bekerja di atas alas kerja gelap (<i>dark splicing mat</i>) dan pungut serpihan memakai lakban perekat yang dibalik.</li>\n<li><b>DILARANG KERAS</b> makan, minum, merokok, meniup serpihan, atau menyeka meja kerja memakai telapak tangan.</li>\n<li>Cuci tangan dengan sabun setelah terminasi sebelum menyentuh wajah atau makanan.</li>\n</ul>\n\n<h3>Keselamatan Ruang Terbatas (Manhole &amp; Confined Space)</h3>\n<ol>\n<li>Pasang rambu kerja jalan dan <i>traffic cone</i> minimal 15–25 meter sebelum lubang manhole.</li>\n<li>Buka tutup manhole dan aliri udara selama ≥15 menit sebelum pengukuran.</li>\n<li>Uji atmosfer dengan <b>Multi-Gas Detector 4 sensor</b>: O₂ ≥ 19.5%, CO &lt; 25 ppm, H₂S &lt; 10 ppm, CH₄ &lt; 10% LEL.</li>\n<li>Aktifkan <i>Confined Space Blower Fan</i> terus-menerus selama teknisi di bawah tanah, serta terapkan <b>Buddy System</b> (1 bekerja, 1 siaga di atas memegang tali penyelamat).</li>\n</ol>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/safety/\" target=\"_blank\" rel=\"noopener\">FOA Guide to Fiber Optic Safety</a> · IEC 60825-2 Optical Fiber Communication Safety.</p>\n",
    "tp12": "\n<h2>2. Standar Kabel ITU-T, Kode Warna TIA-598-C &amp; Teknik Penarikan</h2>\n<p>Pemilihan spesifikasi serat dan mekanik penarikan wajib mematuhi standar <b>ITU-T G.652/G.657</b>, kode warna <b>ANSI/TIA-598-C</b>, serta batas tarik &amp; lengkungan agar inti kaca tidak mengalami <i>micro-fracture</i> maupun lonjakan redaman.</p>\n\n<h3>Klasifikasi Serat Optik Standar ITU-T</h3>\n<table>\n<thead><tr><th>Standar ITU-T</th><th>Core / Cladding</th><th>Atenuasi Maksimum</th><th>Radius Tekuk Aman</th><th>Penerapan Industri</th></tr></thead>\n<tbody>\n<tr><td><b>ITU-T G.652.D (OS2)</b></td><td>9 / 125 µm SMF</td><td>≤0.40 @1310 · ≤0.30 @1550 nm (tipikal 0.35 / 0.22 dB/km)</td><td><b>30 mm</b></td><td>Kabel Feeder, Distribusi, dan Backbone (Low Water Peak 1383 nm).</td></tr>\n<tr><td><b>ITU-T G.657.A1</b></td><td>9 / 125 µm BIF</td><td>≤0.40 @1310 · ≤0.30 @1550 nm (kompatibel penuh G.652.D)</td><td><b>10 mm</b> (loss ≤0.5 dB @1550)</td><td>Drop Cable FTTx dari ODP ke dinding rumah pelanggan.</td></tr>\n<tr><td><b>ITU-T G.657.A2 / B3</b></td><td>9 / 125 µm Ultra-BIF</td><td>Sangat tahan micro/macrobending</td><td><b>7.5 mm (A2) / 5 mm (B3)</b></td><td>Instalasi kabel indoor IKR sudut kusen dan belokan rapat.</td></tr>\n<tr><td><b>ITU-T G.655</b></td><td>8–10 / 125 µm NZDSF</td><td>Mengurangi distorsi non-linier Four-Wave Mixing (FWM)</td><td>30 mm</td><td>Backbone DWDM jarak super jauh &amp; kabel laut (SKKL).</td></tr>\n<tr><td><b>ITU-T G.651.1 (OM3/4/5)</b></td><td>50 / 125 µm MMF</td><td>≤3.0 dB/km @850 nm · ≤1.5 dB/km @1300 nm (TIA-568.3-D)</td><td>30 mm</td><td>Switch 10G–400G di Data Center jarak hingga 550 m (VCSEL 850 nm).</td></tr>\n</tbody>\n</table>\n\n<h3>Kode Warna 12 Serat Optik Standar ANSI/TIA-598-C &amp; Telkom</h3>\n<p>Urutan 12 warna wajib berlaku konsisten bagi setiap helai core maupun pengurutan tabung (<i>loose tube</i>):</p>\n<table>\n<thead><tr><th>No</th><th>Warna Serat</th><th>Kode TIA-598</th><th>No</th><th>Warna Serat</th><th>Kode TIA-598</th></tr></thead>\n<tbody>\n<tr><td>1</td><td><b>Biru (Blue)</b></td><td>BL</td><td>7</td><td><b>Merah (Red)</b></td><td>RD</td></tr>\n<tr><td>2</td><td><b>Orange (Orange)</b></td><td>OR</td><td>8</td><td><b>Hitam (Black)</b></td><td>BK</td></tr>\n<tr><td>3</td><td><b>Hijau (Green)</b></td><td>GN</td><td>9</td><td><b>Kuning (Yellow)</b></td><td>YE</td></tr>\n<tr><td>4</td><td><b>Cokelat (Brown)</b></td><td>BN</td><td>10</td><td><b>Ungu (Violet)</b></td><td>VI</td></tr>\n<tr><td>5</td><td><b>Abu-abu (Slate)</b></td><td>SL</td><td>11</td><td><b>Pink / Merah Muda (Rose)</b></td><td>RS</td></tr>\n<tr><td>6</td><td><b>Putih (White)</b></td><td>WH</td><td>12</td><td><b>Toska (Aqua)</b></td><td>AQ</td></tr>\n</tbody>\n</table>\n<div class=\"lesson-note\"><b>Aturan Multi-Tube:</b> Pada kabel 24 core (2 tube): <b>Tube 1 (Biru)</b> = Core 1–12; <b>Tube 2 (Orange)</b> = Core 13–24. Jika kabel berkapasitas &gt; 144 core, pola ke-12 tube diulang dengan cincin/garis hitam penanda (binder/stripe).</div>\n\n<h3>Prosedur Penarikan Aerial, Duct &amp; Drop Cable</h3>\n<ul>\n<li><b>Batas Radius Tekuk Kabel (Cable Bend Radius):</b> Saat kabel ditarik bermuatan beban (<i>Dynamic/Under Tension</i>) wajib minimal <b>20× diameter luar kabel (OD)</b>; saat terpasang permanen diam (<i>Static</i>) minimal <b>10× OD</b>.</li>\n<li><b>Kabel Udara (Aerial — Figure-8 / ADSS):</b> Jarak antar-tiang (<i>span</i>) 40–50 meter. Gunakan <b>Tension Clamp (Anchoring)</b> pada tiang awal/akhir/sudut &gt; 30°, <b>Suspension Clamp / J-Hook</b> pada lintasan lurus, serta ikatkan bracket ke tiang memakai <b>Stainless Steel Band &amp; Stopping Buckle</b> (bukan benda penahan tekukan kabel). Beri andongan (<i>sag</i>) 1–2% terhadap panjang span.</li>\n<li><b>Kabel Tanah (Duct / Subduct HDPE):</b> Gunakan subduct HDPE, pelumas kabel, <b>Swivel</b> anti-puntir pada mata penarik, serta pantau tarikan dengan dynamometer agar tidak melewati <i>Max Tensile Strength</i> pabrikan (umumnya 1500–2700 N).</li>\n<li><b>Drop Core / Drop Cable (G.657):</b> Gunakan kabel pipih bow-type/Fig-8 (2× FRP strength member + messenger wire) dan S-clamp/strain clamp agar penekanan clamp menumpu ke kawat messenger, bukan menjepit inti kaca.</li>\n</ul>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/install/install.html\" target=\"_blank\" rel=\"noopener\">FOA Installation Guide</a> · <a href=\"https://www.itu.int/rec/T-REC-G.657\" target=\"_blank\" rel=\"noopener\">ITU-T G.657</a> · ANSI/TIA-598-C Color Coding.</p>\n",
    "tp13": "\n<h2>3. Konektor Optik, Polishing UPC vs APC &amp; Kebersihan IEC 61300-3-35</h2>\n<p>Mayoritas gangguan redaman tinggi (high insertion loss) dan putus sinyal berawal dari kontaminasi ujung ferrule. Laporan industri menunjukkan <b>lebih dari 85% kegagalan jaringan optik disebabkan konektor kotor atau tergores</b> yang melanggar standar kebersihan <b>IEC 61300-3-35</b>.</p>\n\n<h3>Klasifikasi Konektor Industri &amp; Standar TIA-568.3-D</h3>\n<table>\n<thead><tr><th>Konektor</th><th>Diameter Ferrule</th><th>Mekanisme Kunci</th><th>Penerapan Industri</th></tr></thead>\n<tbody>\n<tr><td><b>SC (Subscriber Connector)</b></td><td>2.5 mm zirkonia</td><td>Push-Pull persegi</td><td>Standar port OLT, ODC, ODP, Roset &amp; ONT FTTH.</td></tr>\n<tr><td><b>LC (Lucent Connector)</b></td><td>1.25 mm zirkonia (SFF)</td><td>Klip kait RJ-style</td><td>Kepadatan tinggi pada port modul SFP / SFP+ / QSFP.</td></tr>\n<tr><td><b>FC (Ferrule Connector)</b></td><td>2.5 mm logam zirkonia</td><td>Ulir sekrup tahan getar</td><td>Instrumen ukur presisi (OTDR, OPM, OLS) &amp; jalur backbone telco.</td></tr>\n<tr><td><b>E2000 (LSH)</b></td><td>1.25 mm zirkonia</td><td>Push-Pull + katup shutter pegas</td><td>Laser daya tinggi (EDFA/DWDM); katup otomatis menutup ferrule dari debu &amp; paparan sinar laser.</td></tr>\n<tr><td><b>MPO / MTP</b></td><td>Ferrule MT polimer</td><td>Push-Pull multi-fiber (12/24 core)</td><td>Transmisi paralel 40G / 100G / 400G Data Center.</td></tr>\n</tbody>\n</table>\n<p><b>Batas Rugi TIA-568.3-D:</b> Anggaran desain standar mengizinkan maks <b>0.75 dB</b> per pasangan konektor (mated pair), sementara praktik lapangan telkom/industri umumnya menargetkan <b>≤ 0.25–0.30 dB</b>. Untuk kabel Single-Mode di luar gedung, praktik FOA merekomendasikan menyambung <b>pigtail pabrikan (splice-on)</b> dengan fusion splicer dibanding fast connector demi redaman &amp; return loss terbaik.</p>\n\n<h3>Perbedaan Polishing UPC vs APC 8°</h3>\n<ul>\n<li><b>UPC (Ultra Physical Contact — Bodi BIRU):</b> Ujung ferrule dipoles cembung simetris (0°). Menghasilkan <b>Return Loss ≥ 50 dB</b>. Cocok untuk Ethernet data center dan switch LAN optik.</li>\n<li><b>APC (Angled Physical Contact — Bodi HIJAU):</b> Ujung ferrule dipoles dengan sudut miring presisi <b>8 derajat (8°)</b>. Pantulan cahaya Fresnel dibuang ke dinding cladding sehingga menghasilkan <b>Return Loss ≥ 60 dB</b>. Wajib pada jalur <b>GPON/XGS-PON</b>, TV kabel RF overlay, dan port OTDR presisi tinggi.</li>\n</ul>\n<div class=\"lesson-note\"><b>Larangan Mutlak:</b> Jangan mencolokkan konektor BIRU (UPC) ke konektor/adapter HIJAU (APC)! Cembung 0° menabrak bidang miring 8°, menghancurkan ujung inti kaca secara permanen dan menimbulkan redaman &gt; 5 dB.</div>\n\n<h3>Prosedur Inspeksi &amp; Pembersihan IEC 61300-3-35</h3>\n<p>Standar <b>IEC 61300-3-35</b> membagi penampang ferrule atas 4 zona: <b>Zone A Core (0–25 µm SMF: WAJIB NOL debu &amp; NOL goresan)</b>, Zone B Cladding, Zone C Adhesive, dan Zone D Contact.</p>\n<ol>\n<li><b>Inspect:</b> Periksa ujung konektor dengan <i>Fiber Inspection Probe (mikroskop video digital)</i> sebelum menyambung.</li>\n<li><b>Clean (Kering dahulu):</b> Gunakan <b>One-Click Cleaner Pen</b> (untuk konektor di dalam adapter) atau <b>Cassette Cleaner Dry Tape</b>. Jika noda membandel (minyak jari), usap menggunakan <b>Alkohol Isopropil Anhidrat (IPA) kemurnian ≥ 99%</b> di atas <b>Tisu Lint-Free Optik</b>, lalu akhiri dengan usap kering.</li>\n<li><b>DILARANG keras:</b> Memakai alkohol antiseptik 70% (mengandung air &amp; parfum), tisu dapur/wajah biasa (berdebu serat selulosa), meniup port memakai mulut (lembap &amp; minyak), atau memakai minyak/kerosin pembersih mesin.</li>\n<li><b>Inspect → Mate:</b> Periksa ulang via mikroskop hingga lulus IEC 61300-3-35, barulah sambungkan ke adapter dan tutup kembali port menganggur dengan <i>dust cap</i>.</li>\n</ol>\n\n<h3>Rasio Rugi Splitter Pasif PLC (Planar Lightwave Circuit)</h3>\n<table>\n<thead><tr><th>Rasio Splitter</th><th>Loss Teoritis (10 log₁₀ N)</th><th>Batas Maks Riil (Standar Industri/Telkom)</th><th>Lokasi Penempatan</th></tr></thead>\n<tbody>\n<tr><td>1 : 2</td><td>3.01 dB</td><td>≤ 3.6 dB</td><td>Percabangan trunk / link proteksi</td></tr>\n<tr><td>1 : 4</td><td>6.02 dB</td><td>≤ 7.3 dB</td><td>ODC Primer (2-stage splitting)</td></tr>\n<tr><td>1 : 8</td><td>9.03 dB</td><td>≤ 10.5 dB</td><td>ODP Tiang 8 port pelanggan</td></tr>\n<tr><td>1 : 16</td><td>12.04 dB</td><td>≤ 13.8 dB</td><td>ODP Cluster padat 16 pelanggan</td></tr>\n<tr><td>1 : 32</td><td>15.05 dB</td><td>≤ 17.5 dB</td><td>Single-stage splitting langsung di ODC</td></tr>\n</tbody>\n</table>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/termination/\" target=\"_blank\" rel=\"noopener\">FOA Termination &amp; Connector Cleaning Guide</a> · IEC 61300-3-35 · ANSI/TIA-568.3-D.</p>\n",
    "tp21": "\n<h2>4. Fusion Splicing Core-Alignment &amp; Quality Control Industri</h2>\n<p>Fusion splicing meleburkan dua permukaan kaca silika presisi tinggi dengan busur listrik elektroda (~1600°C–2000°C). Menurut standar desain <b>ANSI/TIA-568.3-D</b> batas maksimal splice adalah <b>0.30 dB</b>, sementara proyek FTTH/backbone (standar Telkom &amp; FOA) mewajibkan batas maksimal <b>≤ 0.10 dB</b> dengan pencapaian tipikal lapangan <b>0.01–0.05 dB</b>.</p>\n\n<h3>Teknologi Penyelarasan &amp; Komponen Fusion Splicer</h3>\n<ul>\n<li><b>Core Alignment (PAS — Profile Alignment System):</b> Kamera dual-axis (X &amp; Y) membaca profil indeks bias <i>core</i> secara optik lalu menggerakkan motor mikro sub-mikron (&lt; 0.1 µm). Lebih akurat daripada <i>Cladding Alignment</i> V-groove pasif karena mengkompensasi ketidakpusatan inti antar-pabrikan.</li>\n<li><b>Pre-Fusion Cleaning Arc:</b> Busur api ringan sebelum dorongan leburan untuk membakar mikro-partikel debu terakhir di permukaan cleave.</li>\n<li><b>Elektroda Tungsten:</b> Menghasilkan busur plasma ~5000–8000 V. Wajib dibersihkan/diganti setiap <b>3.000–5.000 kali arc</b> dan dikalibrasi ulang (<i>Arc Calibration</i>) saat pindah ketinggian atau kelembapan udara berubah drastis.</li>\n<li><b>Uji Tarik Otomatis (Proof/Tension Test):</b> Motor mesin menarik serat pasca-lebur dengan gaya ~200 gram (~2 N) untuk mengeliminasi sambungan rapuh.</li>\n</ul>\n\n<h3>SOP 6 Tahap Wajib Fusion Splicing</h3>\n<ol>\n<li><b>Masukkan Protection Sleeve Dulu:</b> Masukkan heat-shrink sleeve (60 mm / 40 mm) sebelum pengupasan. Jangan tertukar!</li>\n<li><b>Strip dengan Miller 3-Hole Stripper:</b> Gunakan lubang berurutan (1. Jaket → 2. Buffer 900 µm → 3. Coating 250 µm) dengan sudut miring 30°–45°. Kupas satu tarikan halus ±3–4 cm.</li>\n<li><b>Clean dengan IPA 99.9% &amp; Tisu Lint-Free:</b> Lipat tisu basah IPA, jepit serat dan tarik satu arah hingga berdecit bersih (<i>squeak test</i>). Pastikan bebas gel dan lemak.</li>\n<li><b>Cleave Siku 90° (&lt; 0.5°):</b> Letakkan pada skala 10–16 mm di precision cleaver. Pastikan serpihan kaca otomatis masuk kotak sampah cleaver. <b>DILARANG menyentuh atau mengelap ulang ujung kaca sesudah cleave!</b></li>\n<li><b>Fusion Arc &amp; Inspeksi Visual:</b> Letakkan tepat di V-groove keramik zirkonia di antara elektroda. Tutup wind protector; pastikan sudut cleave &lt; 1.0°, estimasi loss ≤ 0.05 dB, tidak ada gelembung (bubble), penebalan (fat joint), atau leher tipis (thin waist).</li>\n<li><b>Heater Oven &amp; Splice Tray:</b> Posisikan sambungan tepat di tengah tabung sleeve, panaskan 180°C–220°C hingga bunyi alarm, dinginkan pada cooling tray ±20 detik, lalu tata melingkar di splice tray dengan radius ≥ 30 mm.</li>\n</ol>\n\n<h3>Tabel Troubleshooting Splicing</h3>\n<table>\n<thead><tr><th>Anomali di Layar</th><th>Akar Masalah</th><th>Solusi Korektif Teknisi</th></tr></thead>\n<tbody>\n<tr><td><b>Cleave Angle Error (&gt; 1.5°)</b></td><td>Mata pisau tumpul / bantalan karet cleaver kotor / serat miring</td><td>Bersihkan karet pad cleaver pakai IPA 99%; putar posisi nomor mata pisau tungsten.</td></tr>\n<tr><td><b>Core Offset / Axis Error</b></td><td>Debu atau serpihan kaca menempel pada dasar V-groove</td><td>Usap alur V-groove dan lensa kamera dengan cotton bud beralkohol IPA 99%.</td></tr>\n<tr><td><b>Gelembung Udara (Bubble)</b></td><td>Alkohol belum menguap kering saat di-arc atau ujung menyentuh jari</td><td>Potong ulang, strip, bersihkan IPA, tunggu 2 detik hingga kering lalu cleave &amp; splice ulang.</td></tr>\n<tr><td><b>Estimasi Loss &gt; 0.10 dB</b></td><td>Cleavage cacat (lip/chip) atau jenis serat berbeda (G.652 ↔ MMF)</td><td>Ulangi dari langkah Strip–Clean–Cleave; cek jenis core kabel (9 µm vs 50 µm).</td></tr>\n</tbody>\n</table>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/splicing/\" target=\"_blank\" rel=\"noopener\">FOA Guide to Splicing Optical Fiber</a> · ANSI/TIA-568.3-D.</p>\n",
    "tp22": "\n<h2>5. Pengujian Tier-1 (OLTS/OPM), Kalibrasi Zeroing &amp; Power Budget GPON</h2>\n<p>Standar <b>FOA</b>, <b>ANSI/TIA-568.3-D</b>, dan <b>ISO/IEC 14763-3</b> menetapkan pengujian <b>Tier-1 Insertion Loss</b> memakai pasangan <b>Optical Light Source (OLS) &amp; Optical Power Meter (OPM)</b> sebagai tes kelayakan utama yang tidak boleh digantikan oleh OTDR.</p>\n\n<h3>Perbedaan Alat: OLS Terkalibrasi vs VFL (Jangan Tertukar!)</h3>\n<ul>\n<li><b>Optical Light Source (OLS):</b> Sumber cahaya laser/LED stabil (CW atau modulasi 270Hz/1kHz/2kHz) pada panjang gelombang transmisi nyata (<b>1310 / 1490 / 1550 nm</b> SMF atau 850 / 1300 nm MMF). Digunakan berpasangan dengan OPM untuk mengukur redaman (dB).</li>\n<li><b>Visual Fault Locator (VFL):</b> Laser cahaya merah kasat mata (<b>650 nm</b>) berdaya 1–30 mW untuk melacak kontinuitas fisik dan mendeteksi patahan atau kebocoran macrobend jarak dekat (&lt; 5 km). <i>VFL TIDAK dapat digunakan sebagai OLS untuk mengukur insertion loss pada OPM!</i></li>\n</ul>\n\n<h3>Konversi dBm vs dB &amp; Kalibrasi Zeroing (TIA/EIA-526-7A 1-Jumper)</h3>\n<ul>\n<li><b>dBm (Daya Absolut):</b> <code>P<sub>dBm</sub> = 10 · log₁₀(P<sub>mW</sub> / 1 mW)</code>. Acuan: 1 mW = 0 dBm; 2 mW ≈ +3 dBm; 0.5 mW ≈ −3 dBm; 0.1 mW = −10 dBm; 0.01 mW = −20 dBm; 0.001 mW = −30 dBm.</li>\n<li><b>dB (Redaman Relatif):</b> <code>L<sub>dB</sub> = P<sub>in (dBm)</sub> − P<sub>out (dBm)</sub> = 10 · log₁₀(P<sub>in (mW)</sub> / P<sub>out (mW)</sub>)</code>.</li>\n<li><b>Prosedur Zeroing (Referensi Nol):</b> (1) Panaskan OLS &amp; OPM 5 menit, samakan panjang gelombang (mis. 1310 nm). (2) Hubungkan langsung memakai <i>Reference Patchcord</i> yang teruji bersih. (3) Tekan dan tahan <b>REF / ZERO</b> di OPM hingga terbaca <b>0.00 dB</b>. (4) Lepas satu sisi reference cord di OPM saja (jangan lepas di sisi OLS!) lalu sambungkan ke jalur uji untuk membaca total link insertion loss langsung dalam dB.</li>\n</ul>\n\n<h3>Anggaran Daya Optik GPON (Standar ITU-T G.984.2 Class B+ &amp; C+)</h3>\n<table>\n<thead><tr><th>Parameter GPON ODN</th><th>Class B+ (Umum FTTH)</th><th>Class C+ (Jarak Jauh / Rasio 1:64)</th></tr></thead>\n<tbody>\n<tr><td><b>Daya Pancar OLT (Downstream 1490 nm)</b></td><td>+1.5 s/d +5.0 dBm</td><td>+3.0 s/d +7.0 dBm</td></tr>\n<tr><td><b>Sensitivitas Minimum ONU/ONT</b></td><td>−27 s/d −28 dBm</td><td>−30 dBm</td></tr>\n<tr><td><b>Batas Rugi Minimum Path Loss</b></td><td><b>13 dB</b> (cegah overload!)</td><td><b>17 dB</b></td></tr>\n<tr><td><b>Batas Rugi Maksimum Path Loss</b></td><td><b>28 dB</b></td><td><b>32 dB</b></td></tr>\n<tr><td><b>Rentang Terima Prima (SLA Telkom)</b></td><td colspan=\"2\"><b>−13 dBm s/d −24 dBm</b> (rentang aman ONT umumnya −8 s/d −24 dBm)</td></tr>\n</tbody>\n</table>\n<div class=\"lesson-note\"><b>Bahaya Overpower (Saturasi Receiver):</b> Jika jarak pelanggan sangat dekat dengan OLT tanpa splitter besar (daya terima melebihi −8 dBm), fotodioda ONT akan saturasi atau rusak! Gunakan <b>Fixed Optical Attenuator</b> (mis. 5 dB / 10 dB) atau gunakan pembagi splitter yang sesuai agar rugi minimum 13 dB (Class B+) terpenuhi.</div>\n\n<h3>Studi Kasus Perhitungan GPON Link Budget</h3>\n<p>Link OLT–ONT berjarak <b>8 km</b> pada λ = 1490 nm (α = 0.25 dB/km), melewati 4 fusion splice (0.10 dB), 4 pasang konektor SC/APC (0.25 dB), Splitter ODC 1:4 (7.2 dB), Splitter ODP 1:8 (10.5 dB), dan margin perbaikan 2.0 dB:<br>\n<b>Total Atenuasi α:</b> (8 × 0.25) + (4 × 0.10) + (4 × 0.25) + 7.20 + 10.50 + 2.00 = <b>23.10 dB</b>.<br>\nDengan OLT Class C+ Tx = +4.0 dBm, maka <b>Rx Power terukur = +4.0 − 23.10 = −19.10 dBm</b> (berada pada rentang prima −13 s/d −24 dBm → <b>PASS</b>).</p>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/testing/loss/\" target=\"_blank\" rel=\"noopener\">FOA Insertion Loss Testing (OLTS/OPM)</a> · <a href=\"https://www.itu.int/rec/T-REC-G.984.2\" target=\"_blank\" rel=\"noopener\">ITU-T G.984.2 GPON</a>.</p>\n",
    "tp23": "\n<h2>6. Karakterisasi Jalur Tier-2 dengan OTDR (FOA Standard FOA-4)</h2>\n<p>OTDR (<i>Optical Time Domain Reflectometer</i>) mengirimkan pulsa cahaya koheren berulang dan menganalisis hamburan balik untuk memetakan lokasi, jarak, dan besarnya setiap event di sepanjang kabel dari satu ujung (<i>single-ended testing</i>).</p>\n\n<h3>Aturan Emas FOA &amp; TIA-568 untuk Pengujian OTDR</h3>\n<ul>\n<li><b>OTDR adalah Uji Tier-2 (Pelengkap):</b> OTDR TIDAK boleh menggantikan uji sertifikasi OLTS/OPM (Tier-1), melainkan melengkapinya untuk mensertifikasi titik splice individual, memverifikasi panjang kabel riil, menemukan lokasi patahan (fiber cut), dan menyimpan kurva patokan awal (<i>baseline trace</i>).</li>\n<li><b>Wajib Memakai Launch Cable &amp; Receive Cable (Pulse Suppressor):</b> Pantulan Fresnel konektor awal membuat penerima OTDR jenuh sesaat (Dead Zone). Sambungkan <b>Launch Cable (500–1000 m)</b> sebelum konektor pertama jaringan agar konektor ODF awal terbaca, dan pasangkan <b>Receive Cable</b> di ujung jauh untuk mengukur konektor terakhir link.</li>\n</ul>\n\n<h3>Dua Jenis Zona Buta (Dead Zone) &amp; Parameter Setup</h3>\n<ul>\n<li><b>Event Dead Zone (EDZ):</b> Jarak minimum pasca-pantulan konektor untuk masih bisa membedakan dua konektor/event reflektif berdekatan (tipikal 0.8–1.5 meter). Dipengaruhi oleh pemilihan <b>Pulse Width</b> terpendek.</li>\n<li><b>Attenuation Dead Zone (ADZ):</b> Jarak minimum pasca-pantulan hingga detektor pulih stabil dalam batas ±0.5 dB untuk mengukur nilai rugi splice non-reflektif secara akurat (tipikal 3–5 meter).</li>\n</ul>\n<table>\n<thead><tr><th>Parameter OTDR</th><th>Panduan Standar Pengaturan Industri</th></tr></thead>\n<tbody>\n<tr><td><b>Wavelength (λ)</b></td><td>Uji dua panjang gelombang pada Single Mode: <b>1310 nm &amp; 1550 nm</b> (atau 1625/1650 nm terfilter untuk troubleshooting jaringan FTTH aktif tanpa memutus trafik 1490/1310 nm).</td></tr>\n<tr><td><b>Index of Refraction (IOR)</b></td><td>Ambil persis dari datasheet kabel (G.652D tipikal <b>1.4677 @1310 nm · 1.4682 @1550 nm</b>). Rumus jarak: <code>d = (c · t) / (2 · IOR)</code>.</td></tr>\n<tr><td><b>Distance Range</b></td><td>Setel <b>1.5× hingga 2× panjang kabel total</b> (termasuk panjang Launch Cable) agar noise floor akhir terlihat jelas.</td></tr>\n<tr><td><b>Pulse Width</b></td><td><b>5–20 ns</b> untuk resolusi tinggi kabel pendek (&lt; 2 km / IKR); <b>100 ns – 10 µs</b> untuk menembus redaman tinggi splitter FTTH atau link backbone &gt; 20 km.</td></tr>\n<tr><td><b>Averaging Time</b></td><td><b>15–30 detik</b> cek cepat; <b>90–180 detik</b> untuk sertifikasi BAUT/BAST agar kurva bebas noise.</td></tr>\n</tbody>\n</table>\n\n<h3>Analisis Event &amp; Fenomena 'Gainer' Bi-Directional</h3>\n<table>\n<thead><tr><th>Bentuk Kurva Trace OTDR</th><th>Identifikasi Event</th><th>Makna Teknis &amp; Validasi</th></tr></thead>\n<tbody>\n<tr><td><b>Lonjakan Spike Runcing + Turun</b></td><td>Event Reflektif (Pantulan Fresnel)</td><td>Konektor (SC/LC/FC), fast connector mekanik, atau adapter longgar/kotor. Pantulan tipikal UPC ≤ −45 dB, APC ≤ −65 dB.</td></tr>\n<tr><td><b>Tangga Turun Halus (Tanpa Spike)</b></td><td>Event Non-Reflektif</td><td>Sambungan Fusion Splice (target ≤ 0.10 dB) atau tekukan kabel tajam.</td></tr>\n<tr><td><b>Drop Normal di 1310 nm, Lonjak Besar di 1550 nm</b></td><td>Macro-Bending (Tekukan Kabel)</td><td>Cahaya 1550 nm lebih sensitif bocor saat kabel terjepit/tertekuk tajam di tray. Longgarkan lengkungan di atas radius aman!</td></tr>\n<tr><td><b>Tangga Naik ke Atas (+dB)</b></td><td><i>Gainer Event</i> (Ilusi Backscatter)</td><td>Dua serat berbeda koefisien hamburan disambung (mis. G.657 ke G.652). <b>Wajib uji 2 arah (A→B dan B→A) lalu ambil nilai rata-ratanya!</b></td></tr>\n<tr><td><b>Spike Tinggi → Jatuh ke Noise Floor</b></td><td>End of Fiber / Fiber Cut</td><td>Akhir kabel atau patahan serat total; catat jarak kilometer presisi &amp; petakan ke As-Built Drawing.</td></tr>\n</tbody>\n</table>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/testing/OTDR/\" target=\"_blank\" rel=\"noopener\">FOA Guide to OTDR Testing (Standard FOA-4)</a> · Telcordia SR-4731 (.SOR File Format).</p>\n",
    "tp24": "\n<h2>7. Acceptance Test Procedure (ATP), BAUT, BAST &amp; As-Built Closeout</h2>\n<p>Infrastruktur serat optik industri (seperti standar FTTH Telkom / kontraktor telekomunikasi) belum boleh dioperasikan secara komersial sebelum melewati <b>ATP (Acceptance Test Procedure)</b> dan disahkan lewat <b>BAUT (Berita Acara Uji Terima)</b> serta <b>BAST (Berita Acara Serah Terima)</b>.</p>\n\n<h3>6 Komponen Wajib Closeout Package (Laporan Serah Terima)</h3>\n<ol>\n<li><b>Lembar Pengesahan BAUT &amp; BAST:</b> Memuat nomor kontrak kerja, tanggal commissioning test, nama pengawas lapangan &amp; pemilik aset, daftar lulus/tidak lulus seluruh core, serta tanda tangan sah dan stempel para pihak.</li>\n<li><b>As-Built Drawing (Gambar Terlaksana Akurat):</b> Denah final lintasan kabel yang benar-benar terpasang (sering berbeda dengan rencana awal!), lengkap dengan koordinat GPS tiang/manhole, posisi Joint Closure (JC), ODC, ODP, serta panjang riil tiap segmen.</li>\n<li><b>Core Assignment &amp; Management Table:</b> Matriks pemetaan Tube &amp; Warna TIA-598 ke port ODF/ODC/ODP beserta statusnya (<i>Active, Reserved, Spare/Idle, Faulty</i>). Mencegah teknisi gangguan memotong jalur pelanggan aktif di masa depan.</li>\n<li><b>Test Result Sheet Tier-1 (OLTS/OPM):</b> Tabel pengujian dua arah (atau downstream/upstream pada PON) menampilkan daya Tx, Rx, Insertion Loss total terukur pada 1310 &amp; 1550 nm, anggaran batas desain, dan status <b>PASS / FAIL</b>.</li>\n<li><b>Baseline Traces Tier-2 (OTDR Bi-Directional):</b> Berkas data mentah standar <b>Telcordia SR-4731 (.SOR)</b> bersama laporan PDF trace OTDR yang memverifikasi loss tiap splice ≤ 0.10 dB, jarak segmen, dan catatan inspeksi kebersihan ujung konektor <b>IEC 61300-3-35</b>.</li>\n<li><b>Foto Dokumentasi Geotagged (Timestamp + GPS):</b> Foto sebelum–selama–sesudah instalasi mencakup kerapian di dalam rak ODF/ODC, tata kaset <i>splice tray</i> dalam Joint Closure kedap air, pelabelan kabel tahan cuaca, dan grounding pengaman petir ODC/rack.</li>\n</ol>\n\n<h3>Standar Pelabelan Permanen Kabel Industri</h3>\n<div class=\"lesson-note\">\n<b>Label Feeder / Distribusi:</b> <code>[ORIGIN] / [DEST] / [KAPASITAS] / [SERAT] / [TAHUN]</code> → Contoh: <code>ODC-KMD-01 / ODP-KT-05 / 24C / G.652D / 2026</code><br>\n<b>Label Drop Pelanggan:</b> <code>[ID_ODP] / [PORT] / [LOKASI_PELANGGAN]</code> → Contoh: <code>ODP-KT-05 / PORT-03 / LAB-TKJ-01</code>\n</div>\n\n<h3>Matriks Tindakan Re-Work Jika Hasil Uji Gagal</h3>\n<table>\n<thead><tr><th>Temuan Anomali ATP</th><th>Ambang Lulus Industri</th><th>Prosedur Perbaikan Wajib (Re-Work)</th></tr></thead>\n<tbody>\n<tr><td><b>Splice loss &gt; 0.10 dB pada OTDR</b></td><td>Telkom ≤ 0.10 dB (TIA-568 ≤ 0.30 dB)</td><td>Buka splice tray, potong titik splice gagal, strip–clean IPA 99%–cleave ulang, lalu re-splice hingga ≤ 0.05 dB.</td></tr>\n<tr><td><b>ONT Rx &lt; −24 dBm (atau OPM fail)</b></td><td>−13 s/d −24 dBm (aman maks −27 dBm)</td><td>Inspeksi dengan mikroskop IEC 61300-3-35, bersihkan ferrule memakai One-Click Cleaner, periksa radius tekukan drop core.</td></tr>\n<tr><td><b>Spike pantulan tinggi di konektor (RL buruk)</b></td><td>UPC ≥ 50 dB · APC ≥ 60 dB</td><td>Cek kecocokan warna (jangan tertukar Biru UPC–Hijau APC), ganti adapter atau terminasi ulang konektor rusak.</td></tr>\n<tr><td><b>Selisih besar 1550 nm vs 1310 nm</b></td><td>Selisih wajar &lt; 0.05 dB di titik splice</td><td>Indikasi macrobend di kaset splice atau terjepit klem — urai ulang gulungan serat (R ≥ 30 mm) di tray.</td></tr>\n</tbody>\n</table>\n<p><b>Referensi Resmi:</b> <a href=\"https://www.thefoa.org/tech/ref/testing/testing.html\" target=\"_blank\" rel=\"noopener\">FOA Standards for Testing &amp; Documentation</a> · Bellcore/Telcordia SR-4731 .SOR Standard.</p>\n"
};

const foLessonTitles = {
    tp11: 'TP 1.1 K3LH & APD Fiber Optik',
    tp12: 'TP 1.2 Instalasi & Penarikan Kabel FO',
    tp13: 'TP 1.3 Konektor & Terminasi Presisi',
    tp21: 'TP 2.1 Fusion Splicing & Rekayasa Sambungan',
    tp22: 'TP 2.2 Pengukuran Daya OPM & Loss Budget',
    tp23: 'TP 2.3 Analisis OTDR & Deteksi Fiber Cut',
    tp24: 'TP 2.4 Berita Acara & Dokumentasi Instalasi'
};

function foLessonTools(tpId, mode = 'lesson') {
    if (!FO_ENRICHMENT[tpId]) return '';
    const done = safeGetJSON('tjkt_fo_done');
    const isDone = !!done[tpId];
    const fontBtns = mode === 'enrich'
        ? `<button class="clay-btn" onclick="changeLessonFont(-1)" aria-label="Perkecil teks">A−</button>
           <button class="clay-btn" onclick="changeLessonFont(1)" aria-label="Perbesar teks">A+</button>` : '';
    const openBtn = mode === 'lesson'
        ? `<button class="clay-btn" onclick="showFoEnrichment('${tpId}')"><i class="fas fa-book-reader"></i> Materi Pengayaan</button>` : '';
    const hint = mode === 'enrich'
        ? 'Simpan progres dan atur kenyamanan membaca'
        : 'Simpan progres belajar atau buka materi pengayaan TP ini';
    return `<div class="lesson-toolbar clay-card" aria-label="Alat baca materi fiber optik">
      <div class="lesson-toolbar-main"><span class="lesson-toolbar-label"><i class="fas fa-bolt"></i> Mode Belajar FO</span><span class="lesson-toolbar-hint">${hint}</span></div>
      <div class="lesson-toolbar-actions">
        ${fontBtns}
        <button class="clay-btn ${isDone?'is-done':''}" onclick="toggleFoLessonDone('${tpId}',this)"><i class="fas fa-check-circle"></i> ${isDone?'Sudah dipelajari':'Tandai selesai'}</button>
        <button class="clay-btn" onclick="printLesson()"><i class="fas fa-print"></i> Cetak</button>
        <button class="clay-btn" onclick="showAssessment('fo_${tpId}')"><i class="fas fa-tasks"></i> Asesmen TP</button>
        ${openBtn}
      </div>
    </div>`;
}

function toggleFoLessonDone(tpId, btn) {
    const done = safeGetJSON('tjkt_fo_done');
    done[tpId] = !done[tpId];
    safeSetJSON('tjkt_fo_done', done);
    if (btn) {
        btn.classList.toggle('is-done', done[tpId]);
        btn.innerHTML = `<i class="fas fa-check-circle"></i> ${done[tpId] ? 'Sudah dipelajari' : 'Tandai selesai'}`;
    }
    toast(done[tpId] ? 'Progres belajar FO tersimpan.' : 'Status materi diperbarui.');
}

function showFoEnrichment(tpId, opts) {
    if (!(opts && opts.fromRoute)) pushRoute('#/fo-enrich/' + tpId);
    const title = foLessonTitles[tpId] || '';
    currentTrack = 'fo';
    currentPage = 'fo_enrich_' + tpId;
    try { localStorage.setItem('tjkt_last_page', 'fo_enrich_' + tpId); } catch (e) {}
    const el = document.getElementById('content');
    el.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    closeSidebar();
    updateBottomNav('fo_enrich_' + tpId);
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    setTimeout(() => {
        if (!FO_ENRICHMENT[tpId]) {
            el.innerHTML = card('<h2>Materi pengayaan tidak ditemukan.</h2>');
            return;
        }
        el.innerHTML = `
          <div class="lesson-toolbar clay-card" aria-label="Navigasi pengayaan">
            <div class="lesson-toolbar-main"><span class="lesson-toolbar-label"><i class="fas fa-book-reader"></i> Materi Pengayaan Fiber Optik</span><span class="lesson-toolbar-hint">${title}</span></div>
            <div class="lesson-toolbar-actions">
              <button class="clay-btn" onclick="showPage('fo-${tpId}')"><i class="fas fa-arrow-left"></i> Kembali ke Materi TP</button>
              <button class="clay-btn" onclick="showAssessment('fo_${tpId}')"><i class="fas fa-tasks"></i> Asesmen TP</button>
            </div>
          </div>
          <article class="lesson-enrichment clay-card" data-font-size="16">
            <div class="lesson-enrichment-heading"><span class="lesson-kicker">PENGAYAAN PRAKTIK • FIBER OPTIK FASE F</span><h1>${title} — Standar &amp; SOP</h1><p>Ringkasan standar ITU-T, keselamatan kerja, diagram teknis, rumus, dan studi kasus.</p></div>
            ${(() => {
                const tpObj = FO_TP.find(x => x.id === tpId);
                if (!tpObj || !tpObj.figs || !tpObj.figs.length) return '';
                return `<div class="enrich-visual-box">
                    <div class="enrich-visual-title"><i class="fas fa-images"></i> Galeri Figur Teknis &amp; Diagram Standar (${tpObj.code})</div>
                    <div class="enrich-visual-grid">
                        ${tpObj.figs.slice(0, 4).map(fg => {
                            const fn = fg.f.includes('.') ? fg.f : fg.f + '.jpg';
                            return `<figure class="enrich-visual-card"><img src="assets/fo/${fn}" alt="${fg.a || fg.t}" loading="lazy"><figcaption>${fg.t}</figcaption></figure>`;
                        }).join('')}
                    </div>
                </div>`;
            })()}
            <div class="lesson-enrichment-body">${FO_ENRICHMENT[tpId]}</div>
          </article>
          ${foLessonTools(tpId, 'enrich')}`;
        prepContent(el);
        initComponents();
        updateSidebarActive('fo_enrich_' + tpId);
        decorateContent('fo_enrich_' + tpId);
    }, 80);
}

function foPengayaanPage() {
    const done = safeGetJSON('tjkt_fo_done');
    const ids = Object.keys(FO_ENRICHMENT);
    const doneCount = ids.filter(k => done[k]).length;
    const emoj = ['🦺','🛠️','🔌','🔥','📟','📈','📋'];
    return `
    <div class="card">
        ${sectionHead('fa-book-reader','Materi Pengayaan Fiber Optik','sh-amber')}
        <p style="color:var(--slate-500);font-size:.86rem;margin:6px 0 16px">Pendalaman konsep teknis, standar ITU-T, SOP alat, rumus redaman, dan studi kasus untuk 7 TP.</p>
        <div class="assess-grid">
            ${ids.map((k, i) => `
            <div class="assess-card" onclick="showFoEnrichment('${k}')">
                <div class="assess-card-icon">${emoj[i] || '🔆'}</div>
                <div class="assess-card-text"><strong>${foLessonTitles[k] || k}</strong><span>${done[k] ? '✅ Sudah dipelajari' : 'Standar &amp; SOP Praktik → Buka'}</span></div>
            </div>`).join('')}
        </div>
        <p style="font-size:.78rem;color:var(--slate-500);margin-top:14px">${doneCount}/${ids.length} topik pengayaan FO ditandai selesai</p>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-ghost" onclick="showPage('fiberOptik')"><i class="fas fa-arrow-left"></i> Beranda Fiber Optik</button>
            <button class="btn-primary" onclick="showAssessment('fiber')"><i class="fas fa-play"></i> Asesmen Komprehensif FO</button>
        </div>
    </div>`;
}

// ---- Gambar dasar yang tampil di beranda Fiber Optik ----
const FO_DASAR = [
    {
        f: 'fig-fiber-tir-cutaway.svg',
        t: 'Prinsip Total Internal Reflection (TIR)',
        a: 'Diagram hukum Snellius pemantulan cahaya zig-zag pada inti serat optik',
        d: 'Cahaya memantul sempurna di batas core (n₁ ≈ 1,468) dan cladding (n₂ ≈ 1,452). Tekukan tajam melampaui radius aman menyebabkan cahaya bocor (macrobend).'
    },
    {
        f: 'fig-014-mode-perambatan',
        t: 'Mode Perambatan: Multimode vs Single-Mode',
        a: 'Perbandingan mode perambatan cahaya fiber optic',
        d: 'Multimode (50/62,5 µm) membawa banyak mode cahaya untuk jarak pendek (≤ 550 m), sedangkan Single Mode (9 µm) membawa 1 mode untuk jarak jauh (1310/1490/1550 nm).'
    }
];

// ---- Data 7 Tujuan Pembelajaran (TP) ----
// Setiap figur diaudit secara industri (tanpa foto salah/watermark/typo) & dijelaskan terstruktur
const FO_TP = [
    {
        id: 'tp11', code: 'TP 1.1', emoji: '🦺', icon: 'fa-hard-hat', color: 'sh-red',
        title: 'K3LH, APD &amp; Kerja Tim',
        intro: callout('danger', 'fa-exclamation-triangle', 'APD Wajib Standar Industri (IEC 60825-2 &amp; FOA)', 'Kenakan APD lengkap: <strong>Kacamata Safety (ANSI Z87.1), Helm (SNI/ANSI Z89.1), Sepatu Safety (Steel Toe), Sarung Tangan Nitril/Cut-Resistant, dan Rompi Reflektif Hi-Vis</strong>. Pekerjaan tiang &gt; 1,8 m wajib memakai <strong>Full Body Harness (EN 361)</strong>.'),
        body: `
                <ul class="step-list">
                    ${stepItem('1', 'Buat JSA / RAMPU Sebelum Kerja', 'Job Safety Analysis disusun bersama tim sebelum bekerja — mencatat bahaya laser IR, serpihan kaca, listrik tiang, ruang terbatas manhole, serta mitigasi.')}
                    ${stepItem('2', 'Terapkan Buddy System (Minimal 2 Teknisi)', 'Dilarang bekerja sendirian di dalam manhole (uji gas O₂ ≥19,5%, CO &lt;25 ppm, H₂S &lt;10 ppm, blower aktif), gardu ODC, atau tiang tinggi.')}
                    ${stepItem('3', 'Proteksi Radiasi Laser (IEC 60825-2)', 'Sinar 1310/1490/1550 nm tak kasat mata. Transceiver standar masuk Hazard Level 1M (berbahaya bila dilihat lewat mikroskop/lup tanpa filter IR), sedangkan jalur EDFA/DWDM mencapai Class 3B.')}
                    ${stepItem('4', 'Isolasi Serpihan Kaca 125 µm', 'Potongan bare fiber dikumpulkan memakai lakban di atas alas gelap dan dibuang ke wadah tertutup berlabel (tidak terlihat di sinar-X medis!). Cuci tangan dengan sabun seusai kerja.')}
                </ul>
                ${callout('warning', 'fa-eye', 'Verifikasi Aktif dengan OPM Sebelum Inspeksi', 'Anggap setiap ujung serat atau port modul OLT selalu aktif. Verifikasi daya menggunakan Optical Power Meter (OPM) terlebih dahulu atau periksa dengan mikroskop video digital — jangan pernah melihat langsung dengan mata telanjang.')}`,
        figs: [
            {
                f: 'fig-tp11-k3lh-apd.jpg',
                t: 'Penerapan K3LH Teknisi Fiber Optik di Lapangan (APD Lengkap &amp; Wadah Serpihan)',
                a: 'Teknisi fiber optik mengenakan kacamata safety, helm, rompi hi-vis, sarung tangan di dekat kabinet ODC dengan wadah limbah serat dan traffic cone',
                d: 'Menunjukkan standar kerja aman di lapangan: penggunaan kacamata ANSI Z87.1 pelindung lontaran kaca, helm keselamatan, rompi reflektif Hi-Vis, sarung tangan kerja, barikade kerucut lalu lintas (traffic cone), alas splicing gelap, serta wadah khusus pembuangan serpihan kaca tertutup (Fiber Scrap Can).'
            },
            {
                f: 'fig-tp11-laser-safety.svg',
                t: 'Bahaya Laser Inframerah (IEC 60825-2) &amp; Protokol Limbah Kaca / Manhole',
                a: 'Diagram klasifikasi bahaya radiasi laser IEC 60825-2, spektrum tampak vs IR, wadah serpihan serat kaca, dan cek gas manhole',
                d: 'Memvisualisasikan perbedaan cahaya tampak (VFL 650 nm memicu kedip mata) dibanding gelombang telekomunikasi IR (1310/1490/1550 nm) yang memfokuskan panas langsung ke retina tanpa refleks kedip, sekaligus standar gas aman ruang terbatas.'
            }
        ]
    },
    {
        id: 'tp12', code: 'TP 1.2', emoji: '🛠️', icon: 'fa-cable-car', color: 'sh-orange',
        title: 'Instalasi, Penarikan &amp; Perapian',
        intro: callout('info', 'fa-cable-car', 'Penarikan Aman Mengikuti Standar ITU-T &amp; TIA-598-C', 'Sebelum penarikan, identifikasi tipe serat (G.652.D feeder vs G.657.A1/A2 drop core), urutan kode warna 12 serat TIA-598-C, batas gaya tarik (<i>Max Tensile Strength</i>), dan radius tekuk aman (20× OD saat ditarik / 10× OD saat diam).'),
        body: `
                <ul class="step-list">
                    ${stepItem('1', 'Survei Rute &amp; Siapkan Tool Kit FO', 'Survei jarak span tiang (40–50 m) atau rute subduct HDPE, siapkan mesin winch berdina-meter, cable roller, swivel anti-twist, serta FO Tool Kit lengkap.')}
                    ${stepItem('2', 'Penarikan Feeder &amp; Distribusi (G.652.D)', 'Tarik kabel feeder ADSS/duct memakai pull-tape dan pelumas duct; jaga radius belokan dinamis minimal 20× diameter luar kabel dan pantau batas tarikan pabrik (1500–2700 N).')}
                    ${stepItem('3', 'Suspensi, Anchoring &amp; Andongan Udara', 'Gantung kabel pada tiang utilitas dan kawat messenger memakai Tension Clamp (tiang awal/akhir/belokan &gt;30°) dan Suspension Clamp (tiang lurus); sisakan andongan (sag) 1–2%.')}
                    ${stepItem('4', 'Penarikan Kabel Drop Core (G.657.A1/A2)', 'Tarik kabel drop Fig-8 / bow-type dari ODP menuju dinding rumah dengan S-clamp; jepit bagian messenger agar inti serat tahan-tekuk (R min 10 mm) tidak tertekan.')}
                    ${stepItem('5', 'Perapian, Slack &amp; Pelabelan Standar', 'Gulung cadangan kabel (slack) pada bracket loop berdiameter aman, ikat memakai cable ties tahan UV dan pita tahan cuaca, serta tempel tag identitas di kedua ujung.')}
                </ul>
                ${dense('Standar Spesifikasi Kabel &amp; Kode Warna', [
                    '<strong>Kode Warna 12 Core (TIA-598-C):</strong> 1. Biru, 2. Orange, 3. Hijau, 4. Cokelat, 5. Abu-abu, 6. Putih, 7. Merah, 8. Hitam, 9. Kuning, 10. Ungu, 11. Pink, 12. Toska.',
                    '<strong>ITU-T G.652.D:</strong> Serat feeder/distribusi standar (radius aman 30 mm, atenuasi ≤ 0,35 dB/km @1310 nm · ≤ 0,22 dB/km @1550 nm).',
                    '<strong>ITU-T G.657.A1/A2/B3:</strong> Serat bend-insensitive kompatibel penuh dengan G.652.D; radius aman ketat hingga 10 mm / 7,5 mm / 5 mm untuk drop &amp; indoor IKR.',
                    'Gunakan <strong>Joint Closure kedap air</strong> untuk penyambungan luar ruang serta subduct <strong>HDPE</strong> untuk melindungi kabel galian dari himpitan &amp; gigitan hewan pengerat.'
                ], [
                    ['Indoor (LSZH)', 'Jaket Low Smoke Zero Halogen — tidak melepas gas beracun saat terbakar di gedung'],
                    ['Outdoor / Duct', 'Jaket HDPE tebal tahan air/kelembapan, dilengkapi water-blocking gel &amp; subduct'],
                    ['Aerial (ADSS/Fig-8)', 'Kabel mandiri dengan kawat messenger/FRP untuk rentang tiang 40–50 meter']
                ], [
                    'Radius tekuk melebihi batas memicu macrobending &amp; menaikkan loss tajam terutama di 1550 nm.'
                ])}
                ${callout('warning', 'fa-ruler-horizontal', 'Radius Tekuk &amp; Batas Tarikan', 'Menarik tanpa swivel anti-puntir atau menekuk melebihi batas minimum merusak mikro-struktur kaca. Kerusakan sering baru terdeteksi pada uji OTDR 1550 nm.')}`,
        figs: [
            {
                f: 'fig-struktur-kabel-fo.svg',
                t: 'Anatomi 5 Lapisan Kabel Serat Optik &amp; Klasifikasi ITU-T G.652D / G.657',
                a: 'Diagram 5 lapisan serat optik core cladding coating strength member jacket',
                d: 'Dari dalam ke luar: Core (9 µm SMF / 50 µm MMF) tempat cahaya dipandu, Cladding (125 µm) pemantul cahaya TIR, Coating Akrilat (250 µm) pelindung goresan, Strength Member (Kevlar/FRP) penahan gaya tarik, serta Outer Jacket (PE/LSZH) pelindung cuaca.'
            },
            {
                f: 'fig-tia598-colors.svg',
                t: 'Standar Kode Warna 12 Serat Optik ANSI/TIA-598-C &amp; Telkom ("BOHCA PUMHK PT")',
                a: 'Tabel visual urutan 12 warna standar serat optik TIA-598-C',
                d: 'Kode warna 1 s/d 12 wajib dikuasai teknisi agar penulisan pada Core Assignment &amp; penyambungan di Joint Closure antara sisi ODF, ODC, dan ODP tidak pernah tertukar.'
            },
            {
                f: 'fig-017-loose-tube-fiber-count',
                t: 'Konfigurasi Loose Tube: 2 / 4 / 6 / 12 Serat per Tabung Longgar',
                a: 'Penampang loose tube 2 4 6 12 fiber per tube',
                d: 'Serat berwarna dikelompokkan dalam tabung longgar berisi Thixotropic Gel pelindung air. Ruang gerak bebas di dalam tabung membuat serat tetap bebas regangan saat suhu lingkungan berubah.'
            },
            {
                f: 'fig-017-penampang-loose-tube',
                t: 'Penampang Multi-Tube Kabel Feeder/Distribusi (Central Strength Member &amp; Armor)',
                a: 'Penampang kabel optik jenis loose tube',
                d: 'Di sekeliling batang penguat pusat (FRP Central Strength Member), tabung-tabung berwarna disusun melingkar lalu dibungkus lapisan water-blocking, pita pelindung logam/dielektrik, serta jaket HDPE hitam tahan UV.'
            },
            {
                f: 'fig-drop-cable-g657.svg',
                t: 'Kabel Drop Core FTTH Figure-8 (ITU-T G.657.A1 / A2)',
                a: 'Penampang kabel drop core FTTH G.657 Figure-8 lengkap',
                d: 'Penampang pipih (bow-type) berisi 1–2 core (Biru &amp; Orange) yang diapit dua penguat FRP dielektrik dan kawat messenger baja penggantung. Radius tekuk aman hingga 10 mm sehingga mudah ditata menyusuri dinding tanpa memicu macrobend.'
            },
            {
                f: 'fig-030-toolkit.jpg',
                t: 'Fiber Optic Tool Kit Standar Teknisi (Stripper, Kevlar Scissors, Cleaver, VFL, OPM, IPA &amp; Wipes)',
                a: 'Tas perkakas teknisi fiber optik berisi Miller stripper, gunting Kevlar, drop slitter, cleaver, VFL, OPM, IPA, dan wadah serpihan',
                d: 'Perangkat wajib teknisi FO: Miller 3-hole stripper, gunting khusus pemotong benang aramid/Kevlar, slitter kabel drop, precision cleaver, pena VFL 650 nm, OPM, botol dispenser IPA 99%, tisu lint-free, serta kotak limbah serpihan kaca.'
            },
            {
                f: 'fig-030-genset',
                t: 'Genset — Catu Daya Listrik Lapangan',
                a: 'Genset untuk catu daya pekerjaan fiber optic di lapangan',
                d: 'Menyuplai daya AC/charger bagi mesin fusion splicer, OTDR, blower manhole, dan lampu kerja pada lokasi proyek baru yang belum terjangkau listrik PLN.'
            },
            {
                f: 'fig-032-ancoring',
                t: 'Tension Clamp &amp; Klem Messenger Kabel Udara (Dead-End)',
                a: 'Kabel optik udara ditahan dead-end clamp dan klem baja pada kawat messenger',
                d: 'Dipasang di tiang awal, tiang ujung, dan tiang belokan tajam (&gt; 30°) untuk mencengkeram kawat messenger/ADSS agar beban tarik bentangan aman.'
            },
            {
                f: 'fig-032-suspension',
                t: 'Suspension Hardware — Penyangga Kabel Udara pada Tiang Distribusi',
                a: 'Tiang distribusi kabel optik udara lengkap dengan bracket suspensi, gulungan slack, dan closure',
                d: 'Menopang kabel udara pada lintasan tiang secara rapi tanpa menjepit serat kaca di dalamnya, menjaga andongan dan estetika rute.'
            },
            {
                f: 'fig-032-stainless-bend.jpg',
                t: 'Hardware Tiang Aerial: Stainless Steel Band, Stopping Buckle, Suspension Hook &amp; Drop S-Clamp',
                a: 'Pita stainless strapping band, stopping buckle, bracket kait suspensi tiang, dan drop cable tension wedge clamp',
                d: 'Pita baja tahan karat (Stainless Steel Band) &amp; gesper penguncinya (Stopping Buckle) digunakan untuk mengikat bracket suspensi, anchoring, dan kotak ODP pada tiang beton/besi — bukan untuk penahan lengkungan kabel.'
            },
            {
                f: 'fig-032-joint-closure',
                t: 'Joint Closure (Inline &amp; Dome) — Kotak Sambung Kedap Air IP68',
                a: 'Joint closure kotak sambung kedap air fiber optic',
                d: 'Wadah pelindung titik percabangan dan penyambungan kabel feeder/distribusi di tiang maupun manhole. Dilengkapi seal karet kedap air dan kaset splice tray untuk menata gulungan cadangan serat (R ≥ 30 mm).'
            },
            {
                f: 'fig-032-hdpe',
                t: 'Pipa Subduct HDPE (32/40 mm) — Pelindung Jalur Duct Bawah Tanah',
                a: 'Pipa subduct HDPE pelindung kabel duct fiber optic',
                d: 'Pipa High-Density Polyethylene berdinding tebal di dalam galian/duct beton. Memudahkan penarikan atau penggantian kabel jarak jauh menggunakan pelumas kabel dan mencegah kerusakan fisik akibat tekanan tanah.'
            }
        ]
    },
    {
        id: 'tp13', code: 'TP 1.3', emoji: '🔌', icon: 'fa-plug', color: 'sh-blue',
        title: 'Konektor Optik SC / LC / FC, UPC vs APC &amp; Kebersihan IEC 61300-3-35',
        intro: callout('info', 'fa-crosshairs', '85%+ Gangguan Link Berasal dari Konektor Kotor!', 'Patuhi standar inspeksi ferrule <b>IEC 61300-3-35</b> (Inspect → Clean → Inspect → Mate) menggunakan alkohol IPA 99,9% anhidrat + tisu lint-free / One-Click Cleaner. <b>Jangan pernah mencampur konektor BIRU (UPC 0°) dengan HIJAU (APC 8°)!</b>'),
        body: `
                ${tbl(['Konektor', 'Ferrule &amp; Kunci', 'Return Loss / Spec', 'Penerapan Utama'], [
                    ['SC (UPC / APC)', '2,5 mm · Push-Pull persegi', 'UPC ≥50 dB · APC 8° ≥60 dB', 'Port OLT GPON, ODC, ODP, Roset &amp; ONT rumah'],
                    ['LC (UPC / APC)', '1,25 mm SFF · Klip RJ', 'Toleransi pasang TIA-568 ≤0,75 dB', 'Modul SFP / SFP+ / QSFP switch &amp; data center'],
                    ['FC', '2,5 mm logam · Ulir sekrup', 'Anti getar presisi tinggi', 'Port alat ukur OTDR, OPM, OLS &amp; jalur telco'],
                    ['E2000 (LSH)', '1,25 mm · Katup shutter pegas', 'Proteksi laser &amp; debu otomatis', 'Perangkat optik daya tinggi (EDFA / DWDM)'],
                    ['MPO / MTP', 'Ferrule MT 12/24 core sekaligus', 'Multi-fiber paralel', 'Backbone 40G / 100G / 400G Data Center'],
                ])}
                <h3 class="sub-head">SOP Terminasi Fast Connector &amp; Pembersihan IEC 61300-3-35</h3>
                <ul class="step-list">
                    ${stepItem('1', 'Inspeksi &amp; Kupas Sesuai Gauge', 'Masukkan boot ulir lebih dulu, kupas jaket drop core ±50 mm lalu strip coating 250 µm tepat pada penggaris gauge fast connector.')}
                    ${stepItem('2', 'Bersihkan dengan IPA 99,9% &amp; Lint-Free', 'Usap bare fiber memakai tisu lint-free optik basah alkohol IPA 99,9% satu kali tarikan hingga bersih sempurna (jangan pernah memakai alkohol antiseptik 70%, tisu dapur, atau minyak!).')}
                    ${stepItem('3', 'Cleave Presisi 10–12 mm', 'Potong siku 90° (&lt;0,5°) memakai precision cleaver; buang sisa potongan ke wadah tertutup.')}
                    ${stepItem('4', 'Masukkan, Kunci &amp; Uji VFL + OPM', 'Dorong serat hingga sedikit melengkung di dalam gel indeks, kunci latch, pasang dust cap, lalu uji memakai VFL (tidak berpijar merah di leher konektor) serta ukur OPM sesuai batas ≤0,3 dB (TIA-568 maks 0,75 dB).')}
                </ul>`,
        figs: [
            {
                f: 'fig-upc-vs-apc.svg',
                t: 'Ferrule UPC (Biru 0°) vs APC (Hijau 8°) &amp; Zona IEC 61300-3-35',
                a: 'Diagram perbandingan konektor UPC biru datar 0 derajat vs APC hijau miring 8 derajat serta zona inspeksi IEC 61300-3-35',
                d: 'Polesan miring 8° APC memberi Return Loss ≥ 60 dB (standar OLT/ODP). Konektor biru (UPC) dan hijau (APC) tidak boleh dipasangkan karena merusak ferrule.'
            },
            {
                f: 'fig-031-cleaning-pro.jpg',
                t: 'Alat Pembersih Optik: IPA 99,9%, Lint-Free Wipes &amp; One-Click Pen',
                a: 'Botol pompa Isopropil Alkohol 99 persen, tisu optik bebas serat lint-free, pena pembersih one-click 2.5 mm, dan dry cassette cleaner beserta konektor SC/APC hijau &amp; SC/UPC biru',
                d: 'Bersihkan konektor dengan One-Click / Cassette Cleaner atau IPA ≥ 99% + tisu lint-free optik. Jangan memakai tisu biasa atau alkohol 70%.'
            },
            {
                f: 'fig-031-pigtail',
                t: 'Pigtail &amp; Manajemen Kaset Splice di dalam ODF',
                a: 'Kumpulan pigtail serat optik oranye tersusun rapi di dalam tray dan panel adapter ODF',
                d: 'Ujung polos pigtail pabrikan disambung fusion splice di kaset tray lalu dihubungkan ke panel adapter ODF untuk Return Loss optimal.'
            },
            {
                f: 'fig-031-patchcord',
                t: 'Patchcord — Kabel Jumper Dua Ujung',
                a: 'Patchcord fiber optic kedua ujung ber-konektor',
                d: 'Kabel jumper siap pakai untuk menghubungkan port ODF ke SFP switch/router atau roset pelanggan ke ONT.'
            },
            {
                f: 'fig-031-fast-connector',
                t: 'Konektor SC/APC (Hijau) — Polesan Sudut 8° Standar FTTH',
                a: 'Kabel fiber optic berkonektor hijau SC/APC 8 derajat',
                d: 'Housing hijau menandakan polesan sudut 8° (APC) dengan Return Loss ≥ 60 dB. Wajib diuji dengan VFL dan OPM sesudah terminasi ODP/roset.'
            },
            {
                f: 'fig-031-adapter',
                t: 'Ragam Konektor Optik (ST Bayonet vs SC Push-Pull)',
                a: 'Perbandingan konektor optik ST logam berulir bayonet (kiri) dan SC persegi push-pull (kanan)',
                d: 'Setiap konektor menggunakan ferrule keramik zirkonia 2,5 mm (SC/ST/FC) dan dipasangkan ke adapter coupler. Selalu pasang dust cap jika kosong.'
            },
            {
                f: 'fig-031-splitter',
                t: 'Passive Optical Splitter PLC (Planar Lightwave Circuit)',
                a: 'Splitter pasif optik fiber optic',
                d: 'Membagi 1 input optik tanpa listrik. Insertion loss tipikal: 1:2 (≤3,6 dB), 1:4 (≤7,3 dB), 1:8 (≤10,5 dB), 1:16 (≤13,8 dB), 1:32 (≤17,5 dB).'
            },
            {
                f: 'fig-031-protection-sleeve',
                t: 'Protection Sleeve — Selongsong Penguat Sambungan',
                a: 'Protection sleeve pelindung sambungan fiber optic',
                d: 'Selongsong panas berisi batang baja pelindung hasil fusion splicing. Wajib dimasukkan ke serat SEBELUM proses strip dan cleave.'
            },
            {
                f: 'fig-033-odf',
                t: 'ODF — Optical Distribution Frame (Sentral / STO)',
                a: 'ODF optical distribution frame di ruang sentral',
                d: 'Rak terminasi ruang sentral yang menghubungkan kabel feeder ke pigtail pabrikan dan patchcord menuju OLT/Switch.'
            },
            {
                f: 'fig-033-odc',
                t: 'ODC — Optical Distribution Cabinet (Outdoor Primer)',
                a: 'ODC optical distribution cabinet luar ruang',
                d: 'Kabinet tahan cuaca di pinggir jalan untuk mencabangkan kabel feeder ke distribusi (umumnya memakai splitter 1:4 &amp; SC/APC).'
            },
            {
                f: 'fig-033-otb',
                t: 'OTB — Optical Terminal Box (Rak / Dinding)',
                a: 'OTB optical terminal box rak server',
                d: 'Kotak terminal rak 19 inci atau dinding yang menampung splice tray dan panel adapter antar-gedung.'
            },
            {
                f: 'fig-033-odp',
                t: 'ODP — Optical Distribution Point (Tiang Cluster)',
                a: 'ODP optical distribution point pelanggan',
                d: 'Kotak distribusi di tiang/cluster berisi splitter sekunder (1:8 atau 1:16) yang membagi jalur ke drop cable rumah pelanggan.'
            },
            {
                f: 'fig-033-roset',
                t: 'Roset Optik — Optical Wall Outlet Pelanggan',
                a: 'Roset wall outlet fiber optic indoor',
                d: 'Kotak terminasi akhir di dinding rumah untuk melindungi drop cable G.657 serta menyediakan port menuju ONT.'
            }
        ]
    },
    {
        id: 'tp21', code: 'TP 2.1', emoji: '🔥', icon: 'fa-fire', color: 'sh-orange',
        title: 'Fusion Splicing Core-Alignment (Redaman Minimal)',
        intro: callout('success', 'fa-fire', 'Target Industri Fusion Splice: Tipikal ≤ 0,05 dB · Maks Telkom ≤ 0,10 dB', 'Meski standar TIA-568.3-D menetapkan batas maksimal splice <b>0,30 dB</b>, operator FTTH/telkom menuntut hasil leburan fusion <b>≤ 0,10 dB</b> (tipikal mesin PAS modern 0,01–0,04 dB). Kuncinya: Clean sebelum Cleave, dilarang menyentuh ujung sesudah Cleave!'),
        body: `
                <ul class="step-list">
                    ${stepItem('1', 'Masukkan Protection Sleeve Terlebih Dahulu', 'Selipkan sleeve 40/60 mm ke salah satu serat sebelum dikupas. Bila lupa, sambungan terpaksa dipotong ulang.')}
                    ${stepItem('2', 'Strip 3 Tahap &amp; Clean IPA 99,9%', 'Kupas coating 250 µm dengan Miller stripper 3 lubang bersudut ±30–45° sepanjang 3–4 cm, lalu usap satu arah memakai tisu lint-free beralkohol IPA 99,9% hingga kering berdecit.')}
                    ${stepItem('3', 'Precision Cleaving 90° (&lt; 0,5°)', 'Potong pada skala 10–16 mm memakai cleaver agar serpihan otomatis masuk kotak limbah. DILARANG mengelap atau menyentuh ujung serat pasca-cleave!')}
                    ${stepItem('4', 'Pemasangan di V-Groove &amp; Penyelarasan PAS', 'Letakkan ujung serat di alur V-groove keramik zirkonia tepat di antara dua elektroda tungsten (jangan melewati tengah elektroda); kamera X/Y sistem PAS menyelaraskan inti secara otomatis.')}
                    ${stepItem('5', 'Fusion Arc, Tension Test &amp; Heater Oven', 'Pre-cleaning arc membersihkan mikro-debu, busur listrik ~1800°C meleburkan serat, motor melakukan uji tarik 200 g, lalu geser sleeve ke tengah dan susutkan pada heater oven 180–220°C sebelum ditata di splice tray (R ≥ 30 mm).')}
                </ul>
                ${callout('warning', 'fa-exclamation-triangle', 'Kapan Wajib Di-Splice Ulang (Re-Work) &amp; Kalibrasi?', 'Potong &amp; splice ulang bila estimasi loss &gt; 0,10 dB, terlihat gelembung udara (bubble), fat/thin joint, atau cleave angle &gt; 1,0°. Jalankan <b>Arc Calibration</b> saat berpindah suhu/ketinggian dan ganti elektroda tiap 3.000–5.000 arc.')}`,
        figs: [
            {
                f: 'fig-fusion-splicer-diagram.svg',
                t: 'Cara Kerja Fusion Splicer PAS &amp; SOP 6 Langkah',
                a: 'Diagram komponen V-groove, elektroda tungsten, kamera PAS X/Y, heater oven dan alur 6 langkah splicing',
                d: 'Dua kamera X/Y menyejajarkan inti &lt; 0,1 µm lalu busur plasma 1800°C melebur kedua kaca menjadi sambungan rendah redaman.'
            },
            {
                f: 'fig-cleaver-striper-sop.svg',
                t: '3 Lubang Miller Stripper &amp; Sudut Cleaver 90°',
                a: 'Diagram 3 lubang Miller stripper untuk jaket, buffer 900 um, dan coating 250 um beserta perbandingan cleave baik 90 derajat vs miring',
                d: 'H1 mengupas jaket (1,6–3 mm), H2 buffer 900 µm, dan H3 coating 250 µm menjadi kaca 125 µm. Lubang salah menggores cladding.'
            },
            {
                f: 'fig-059-splicer-posisi',
                t: 'Pemasangan Serat pada Sheath Clamp &amp; V-Groove',
                a: 'Foto posisi tangan meletakkan serat optik ke V-groove mesin fusion splicer',
                d: 'Pegang hanya bagian coating berwarna dan dudukkan ujung kaca rapi di V-groove tanpa menyentuh permukaan lain.'
            },
            {
                f: 'fig-060-cleaver-parts',
                t: 'Anatomi Precision Fiber Cleaver',
                a: 'Bagian bagian precision fiber cleaver',
                d: 'Memiliki base bermagnet, skala 10–16 mm, bilah tungsten 16–24 posisi, dan wadah serpihan kaca otomatis.'
            },
            {
                f: 'fig-060-cleaver-use',
                t: 'Langkah Pemotongan Menggunakan Precision Cleaver',
                a: 'Teknik menempatkan serat pada alas cleaver untuk pemotongan 90 derajat',
                d: 'Tumpu jaket serat di skala potong, tutup penjepit, lalu dorong kereta pisau satu kali gerakan mantap.'
            },
            {
                f: 'fig-060-striper-use',
                t: 'Teknik Mengupas dengan Miller Stripper',
                a: 'Posisi tangan menarik stripper untuk mengupas pelindung kabel optik',
                d: 'Condongkan stripper 30°–45° dan tarik halus ke arah ujung agar bilah tidak menyayat cladding silika.'
            },
            {
                f: 'fig-030-splicer',
                t: 'Pengoperasian Fusion Splicer di Lapangan',
                a: 'Teknisi mengenakan helm keselamatan mengoperasikan fusion splicer di lokasi lapangan',
                d: 'Gunakan alas bersih bebas angin dan jauhkan dari uap gas mudah terbakar (busur listrik bertegangan tinggi).'
            },
            {
                f: 'fig-030-striper',
                t: 'Miller 3-Hole Fiber Optic Stripper',
                a: 'Alat pengupas serat optik Miller 3 lubang gagang kuning',
                d: 'Bersihkan rahang stripper secara berkala memakai IPA/kuas agar sisa akrilat tidak menggores bare fiber.'
            }
        ]
    },
    {
        id: 'tp22', code: 'TP 2.2', emoji: '📟', icon: 'fa-tachometer-alt', color: 'sh-green',
        title: 'Pengujian Tier-1 (OLTS / OPM), Kalibrasi Zeroing &amp; Power Budget',
        intro: callout('info', 'fa-tachometer-alt', 'Uji Tier-1 Wajib Sebelum Serah Terima (FOA &amp; TIA-568.3-D)', 'Kombinasi <b>OLS + OPM</b> (atau <b>OLTS</b>) mengukur total <i>Insertion Loss</i> end-to-end dengan akurat. Lakukan <b>Kalibrasi Zeroing (REF = 0,00 dB)</b> sebelum mengukur jaringan, dan jangan pernah menggantikan OLS terkalibrasi dengan VFL merah 650 nm!'),
        body: `
                <h3 class="sub-head">Kalibrasi Zeroing (Metode 1-Jumper TIA/EIA-526-7A)</h3>
                <ul class="step-list">
                    ${stepItem('1', 'Samakan Panjang Gelombang OLS &amp; OPM', 'Nyalakan OLS &amp; OPM ±5 menit; atur keduanya pada λ sama persis: 1310 / 1550 nm (Single Mode) atau 850 / 1300 nm (Multimode).')}
                    ${stepItem('2', 'Hubungkan Reference Patchcord Bersih', 'Pasang golden reference cord yang telah dibersihkan IPA 99% / One-Click langsung dari port OLS ke port OPM.')}
                    ${stepItem('3', 'Tekan &amp; Tahan ZERO / REF = 0,00 dB', 'Tahan tombol REF/ZERO pada OPM sampai layar membaca 0,00 dB — redaman jumper referensi sekarang dikompensasikan nol.')}
                    ${stepItem('4', 'Uji Jalur &amp; Bandingkan Power Budget', 'Lepas jumper HANYA dari port OPM (jangan lepas dari OLS!) lalu hubungkan ke kabel/ODN yang diuji dan verifikasi hasilnya terhadap anggaran ITU-T G.984.')}
                </ul>
                ${tbl(['Parameter / Rumus', 'Rumus / Nilai Standar', 'Keterangan Teknis Industri'], [
                    ['dBm (Absolut)', 'P(dBm) = 10 · log₁₀(P(mW) / 1 mW)', '1 mW = 0 dBm · 0,1 mW = −10 dBm · 0,01 mW = −20 dBm'],
                    ['Loss dB (via dBm)', 'L(dB) = Pin(dBm) − Pout(dBm)', 'Contoh: +4 dBm − (−19,1 dBm) = 23,1 dB total loss'],
                    ['Loss dB (via mW)', 'L(dB) = 10 · log₁₀(Pin(mW) / Pout(mW))', 'Selalu pakai daya linear mW pada bentuk rasio logaritmik'],
                    ['GPON Class B+ / C+', 'Maks Path Loss: 28 dB (B+) · 32 dB (C+)', 'Min path loss: 13 dB (B+) / 17 dB (C+); Rx ONT aman −8 s/d −24 dBm'],
                ])}
                ${callout('warning', 'fa-sync-alt', 'Waspada Receiver Overload pada Jarak Dekat', 'Jika daya terima ONT lebih kuat dari <b>−8 dBm</b> (rugi jalur kurang dari 13 dB), fotodioda ONT akan saturasi! Pasang <i>Fixed Optical Attenuator</i> atau gunakan splitter sesuai desain.')}`,
        figs: [
            {
                f: 'fig-030-opm-ols.jpg',
                t: 'Set Uji Tier-1: OPM, OLS &amp; Kontras Pena VFL',
                a: 'Instrumen Optical Power Meter OPM-815 dan Optical Light Source OLS-815 terhubung kabel kuning, serta pena merah VFL di sebelah kanan',
                d: 'OPM + OLS mengukur daya dBm &amp; Insertion Loss secara presisi (1310/1550 nm); pena VFL 650 nm hanya untuk pelacakan visual serat putus.'
            },
            {
                f: 'fig-opm-zeroing-budget.svg',
                t: 'Zeroing 1-Jumper (TIA-526-7A) &amp; Power Budget GPON C+',
                a: 'Diagram kalibrasi titik nol OPM OLS dan perhitungan waterfall anggaran daya OLT hingga ONT',
                d: 'Setel acuan REF = 0,00 dB memakai Golden Cord sebelum menguji link OLT → ODC 1:4 → ODP 1:8 → ONT (target aman −8 s/d −24 dBm).'
            },
            {
                f: 'fig-084-opm-pair',
                t: 'Optical Power Meter (OPM) &amp; Tombol ZERO / Panjang Gelombang (λ)',
                a: 'Unit genggam Optical Power Meter VTC830 dengan tombol power, ZERO, dB, dan selektor panjang gelombang lambda',
                d: 'Pastikan konektor bersih, pilih panjang gelombang λ yang sama dengan OLS, lalu tahan tombol ZERO sebelum membaca redaman jalur (dB).'
            },
            {
                f: 'fig-085-loss-formula',
                t: 'Rumus Pengukuran Loss Optik (dBm &amp; mW)',
                a: 'Rumus perhitungan redaman optik L dB dari Pin dan Pout',
                d: 'Pakai selisih langsung untuk dBm (L = Pin − Pout), dan gunakan 10·log₁₀(Pin/Pout) jika daya masih bersatuan miliwatt (mW).'
            },
            {
                f: 'fig-066-micro-bending',
                t: 'Atenuasi akibat Microbending &amp; Kebocoran Sudut Kritis',
                a: 'Diagram cahaya bocor keluar core akibat tekanan microbending',
                d: 'Ikatan cable ties terlalu kencang atau tekukan tajam menggeser pantulan foton melewati sudut kritis sehingga cahaya bocor keluar core.'
            },
            {
                f: 'fig-066-core-variation',
                t: 'Atenuasi akibat Ketidakcocokan Core / MFD',
                a: 'Diagram kehilangan cahaya akibat variasi diameter core saat penyambungan',
                d: 'Perbedaan diameter inti atau profil MFD antar-serat memicu redaman sambungan tinggi dan efek Gainer pada grafik OTDR.'
            }
        ]
    },
    {
        id: 'tp23', code: 'TP 2.3', emoji: '📈', icon: 'fa-chart-line', color: 'sh-purple',
        title: 'OTDR: Analisis Trace, Dead Zone, Launch Cable &amp; Bi-Directional Test',
        intro: callout('info', 'fa-chart-line', 'Uji Tier-2 Karakterisasi Jalur (Standar FOA-4)', 'OTDR bertindak seperti radar optik dari satu ujung untuk mendeteksi event, jarak splice, macrobend, dan lokasi kabel putus. Wajib memakai <b>Launch Cable 500–1000 m</b> agar konektor awal tidak tertelan <i>Dead Zone</i>!'),
        body: `
                ${tbl(['Parameter Setup', 'Nilai Standar Industri', 'Fungsi &amp; Pengaturan'], [
                    ['Wavelength (λ)', '1310 nm &amp; 1550 nm (1625 nm live)', '1550 nm jauh lebih peka mendeteksi tekukan kabel (macrobend) dibanding 1310 nm'],
                    ['IOR (Indeks Bias)', 'G.652D ≈ 1,4677 (@1310) · 1,4682 (@1550)', 'Akurasi rumus jarak d = (c·t)/(2·IOR); wajib salin dari datasheet kabel'],
                    ['Distance Range', '1,5× hingga 2× panjang kabel total', 'Memastikan ujung akhir kabel &amp; garis noise floor terlihat lega di layar'],
                    ['Pulse Width', '5–20 ns (dekat) · 100 ns–10 µs (jauh)', 'Pulsa pendek memberi resolusi tinggi (EDZ kecil); pulsa lebar menembus splitter &amp; jarak jauh'],
                    ['Launch Cable', 'Gulungan serat 500–1000 meter', 'Memindahkan Event Dead Zone (EDZ) &amp; Attenuation Dead Zone (ADZ) agar konektor pertama terukur akurat'],
                ])}
                <h3 class="sub-head">Langkah Diagnosis &amp; Koreksi Bi-Directional</h3>
                <ul class="step-list">
                    ${stepItem('1', 'Bersihkan Port &amp; Pasang Launch Cable 500 m', 'Inspeksi port OTDR memakai mikroskop/One-Click, sambungkan Launch Cable sebelum ODF agar konektor pertama jaringan tampil utuh.')}
                    ${stepItem('2', 'Bedakan Event Reflektif vs Non-Reflektif', 'Konektor / fast connector / ujung patahan memicu lonjakan tajam (Fresnel reflection); fusion splice normal berupa tangga turun halus ≤ 0,10 dB.')}
                    ${stepItem('3', 'Cek Uji Ganda 1310 nm vs 1550 nm', 'Bila suatu titik menunjuk drop 0,15 dB di 1310 nm tetapi melonjak menjadi &gt;1,0 dB di 1550 nm, dipastikan terjadi macro-bending di tiang/tray.')}
                    ${stepItem('4', 'Lakukan Uji Dua Arah (Bi-Directional) &amp; Ekspor .SOR', 'Jika muncul event tangga naik (+dB / Gainer), ukur balik dari ujung lawan (A→B dan B→A) lalu ambil rata-ratanya; simpan berkas standar Telcordia .SOR.')}
                </ul>
                ${callout('danger', 'fa-cut', 'Deteksi Fiber Cut &amp; Restorasi Cepat', 'Pada kabel putus total, trace menunjukkan puncak refleksi tinggi (atau jatuh mulus bila ujung gelap) lalu langsung anjlok ke noise floor. Cocokkan angka kilometer layar OTDR dengan peta As-Built Drawing sebelum mengirim tim gali/panjat.')}`,
        figs: [
            {
                f: 'fig-030-otdr.jpg',
                t: 'Unit OTDR dengan Launch Cable Box 500 m &amp; Cleaver',
                a: 'Instrumen handheld OTDR menampilkan trace optik terhubung kabel patchcord kuning ke kotak biru Launch Cable 500 meter',
                d: 'Hubungkan OTDR ke Launch Cable 500 m terlebih dahulu agar konektor awal tidak tertutupi zona buta awal (Dead Zone).'
            },
            {
                f: 'fig-otdr-trace-pro.svg',
                t: 'Anatomi Kurva Trace OTDR (1310 vs 1550 nm)',
                a: 'Grafik lengkap pembacaan event kurva trace OTDR beserta dead zone dan perbandingan panjang gelombang 1310 vs 1550 nm',
                d: 'Menampilkan Launch Cable, spike refleksi konektor, tangga fusion splice, drop tajam macrobend di 1550 nm, dan lokasi putus (Noise Floor).'
            }
        ]
    },
    {
        id: 'tp24', code: 'TP 2.4', emoji: '📋', icon: 'fa-clipboard-check', color: 'sh-green',
        title: 'Acceptance Test (ATP), As-Built Drawing, BAUT &amp; BAST',
        intro: callout('success', 'fa-file-signature', 'Closeout Package &amp; BAUT/BAST sebagai Syarat Operasional Resmi', 'Jaringan belum dinyatakan selesai hingga lolos <b>ATP (Acceptance Test Procedure)</b> dan disahkan melalui <b>BAUT (Berita Acara Uji Terima)</b> serta <b>BAST (Berita Acara Serah Terima)</b> lengkap dengan <i>As-Built Drawing</i>, data OPM, file OTDR <code>.SOR</code>, dan foto geotagged.'),
        body: `
                ${dense('Checklist Dokumen Closeout Industri', [
                    '<strong>BAUT &amp; BAST Resmi:</strong> Identitas tim &amp; kontrak, status PASS/FAIL tiap core, tanda tangan serta stempel sah pengawas, pelaksana, dan pemilik aset.',
                    '<strong>As-Built Drawing berkoordinat GPS:</strong> Peta jalur aktual terpasang (bukan sketsa rencana awal!), koordinat tiang/manhole, lokasi Joint Closure, ODC, dan ODP beserta panjang riil.',
                    '<strong>Core Assignment Table:</strong> Matriks warna tube &amp; core TIA-598 ke port ODF/ODC/ODP beserta status (<i>Active, Reserved, Spare, Faulty</i>).',
                    '<strong>Data Ukur Tier-1 (OPM/OLTS) &amp; Tier-2 (.SOR OTDR):</strong> Tx/Rx/Insertion Loss pada 1310 &amp; 1550 nm (lulus batas GPON −13 s/d −24 dBm), kurva bi-directional OTDR .SOR (SR-4731), serta bukti lulus inspeksi konektor IEC 61300-3-35.',
                    '<strong>Re-Work sebelum Tanda Tangan:</strong> Splice &gt; 0,10 dB atau Rx &lt; −24 dBm wajib dipotong &amp; diperbaiki ulang — dilarang memanipulasi hasil ukur laporan.'
                ], [], [
                    'Backup arsip laporan &amp; berkas .SOR ganda (lokal + cloud) agar mempercepat restorasi MTTR bila terjadi gangguan.'
                ])}
                ${tbl(['Bagian Dokumen Closeout', 'Standar Isi Wajib Industri'], [
                    ['BAUT &amp; BAST', 'Pengesahan hasil uji kelaikan (commissioning) dan serah terima masa garansi'],
                    ['As-Built Drawing', 'Rute riil kabel, koordinat tiang/manhole, posisi JC/ODC/ODP, panjang aktual segmen'],
                    ['Core Assignment Sheet', 'Peta Tube TIA-598, nomor core, arah rute, status port (Active/Idle/Fault)'],
                    ['Hasil Uji OLTS &amp; OTDR', 'Rekap OPM dBm/dB, grafik trace PDF + raw data .SOR bi-directional (1310 &amp; 1550 nm)'],
                    ['Foto Geotagged &amp; Label', 'Watermark koordinat+waktu rak ODF/ODC, splice tray, grounding, &amp; stiker tag kabel tahan UV'],
                ])}`,
        figs: [
            {
                f: 'fig-ftth-branching-map.svg',
                t: 'Peta As-Built FTTH ODN &amp; Format Tagging BAUT/BAST',
                a: 'Diagram arsitektur end-to-end FTTH ODN mulai OLT hingga ONT pelanggan beserta standar pelabelan kabel dan kriteria BAUT/BAST',
                d: 'Alur lengkap STO (OLT/ODF) → Joint Closure → ODC (1:4) → ODP (1:8) → Drop G.657 → Roset → ONT (−8 s/d −24 dBm) beserta standar label &amp; uji terima.'
            }
        ]
    }
];

// ---- Helper: satu gambar + satu penjelasan (mendukung .jpg dan .svg) ----
function foFig(fig, n, total) {
    const file = fig.f.includes('.') ? fig.f : fig.f + '.jpg';
    return `<div class="fo-fig">
        <figure class="fo-shot">
            <img src="assets/fo/${file}" alt="${fig.a || fig.t}" loading="lazy" decoding="async">
            <figcaption>Gambar ${n}${total ? ' dari ' + total : ''} · ${fig.t}</figcaption>
        </figure>
        <p class="fo-note">${fig.d}</p>
    </div>`;
}

// ---- Beranda Fiber Optik (tersendiri, susun per elemen/TP) ----
function fiberOptikPage() {
    const totalFig = FO_DASAR.length + FO_TP.reduce((s, t) => s + t.figs.length, 0);
    const foDone = safeGetJSON('tjkt_fo_done');
    const foDoneCount = FO_TP.filter(t => !!foDone[t.id] || progress['fo_' + t.id] !== undefined).length;
    const pct = Math.round((foDoneCount / FO_TP.length) * 100);
    const foTotalQ = FO_TP.reduce((s, t) => s + ((assessments['fo_' + t.id] || []).length), 0) + ((assessments.fiber || []).length);
    return `
    <div class="hero-card hero-card-fo">
        <div class="hero-tag"><i class="fas fa-bolt"></i> MAPEL PILIHAN · FIBER OPTIK</div>
        <h1>Teknologi &amp; Praktik <span>Fiber Optik</span></h1>
        <p>${FO_TP.length} TP praktik, ${totalFig} figur teknis &amp; standar ITU-T.</p>
        <div class="hero-pills">
            <button type="button" class="hero-pill" onclick="showPage('fiber')"><i class="fas fa-wave-square"></i> Teori Dasar FO</button>
            <button type="button" class="hero-pill" onclick="showPage('fo-tp11')"><i class="fas fa-hard-hat"></i> Mulai TP 1.1</button>
            <button type="button" class="hero-pill" onclick="showPage('fo-pengayaan')"><i class="fas fa-book-reader"></i> Pengayaan FO</button>
            <button type="button" class="hero-pill" onclick="showPage('home')"><i class="fas fa-th-large"></i> Beranda</button>
        </div>
        <div class="hero-stats">
            <div class="hstat"><span class="hstat-num" data-count="${FO_TP.length}">0</span><span class="hstat-lbl">Tujuan TP</span></div>
            <div class="hstat"><span class="hstat-num" data-count="${totalFig}">0</span><span class="hstat-lbl">Figur Teknis</span></div>
            <div class="hstat"><span class="hstat-num" data-count="${foTotalQ}">0</span><span class="hstat-lbl">Soal</span></div>
        </div>
    </div>

    <div class="card">
        <div class="home-section-head">
            <div>
                <div class="home-section-title">Peta 7 Tujuan Pembelajaran (TP 1.1–TP 2.4)</div>
            </div>
            <span class="tag amber">${foDoneCount}/${FO_TP.length} selesai (${pct}%)</span>
        </div>
        <div class="learn-progress" style="margin-bottom:18px"><span style="width:${pct}%"></span></div>
        <div class="module-grid">
            ${FO_TP.map(t => {
                const isDone = !!foDone[t.id];
                const sc = progress['fo_' + t.id];
                return `
            <div class="module-card" data-el="FO" onclick="showPage('fo-${t.id}')">
                <div class="mc-top">
                    <div class="mc-emoji">${t.emoji}</div>
                    <span class="mc-badge el-fo">${t.figs.length} figur</span>
                </div>
                <div class="mc-title">${t.code} — ${t.title}</div>
                <div class="mc-sub">${t.figs.length} figur · kuis 20 soal</div>
                ${sc !== undefined ? `<div class="mc-status ${sc>=75?'ok':'warn'}"><i class="fas fa-check-circle"></i> Kuis: ${sc}%</div>` : isDone ? `<div class="mc-status ok"><i class="fas fa-check"></i> Selesai dibaca</div>` : ''}
                <div class="mc-actions">
                    <button type="button" class="mc-act-btn" onclick="event.stopPropagation();showPage('fo-${t.id}')"><i class="fas fa-book"></i> Materi</button>
                    <button type="button" class="mc-act-btn quiz" onclick="event.stopPropagation();showAssessment('fo_${t.id}')"><i class="fas fa-tasks"></i> Kuis</button>
                </div>
            </div>`;
            }).join('')}
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-ghost" onclick="showPage('fiber')"><i class="fas fa-wave-square"></i> Teori Dasar FO</button>
            <button class="btn-ghost" onclick="showPage('fo-pengayaan')"><i class="fas fa-book-reader"></i> Pengayaan FO</button>
            <button class="btn-primary" onclick="showAssessment('fiber')"><i class="fas fa-trophy"></i> Asesmen Komprehensif</button>
        </div>
    </div>

    <div class="card">
        ${sectionHead('fa-lightbulb', 'Dasar Transmisi Cahaya', 'sh-teal')}
        ${FO_DASAR.map((f, i) => foFig(f, i + 1, FO_DASAR.length)).join('')}
    </div>`;
}

// ---- Tampilan detail satu TP: gambar dijelaskan satu per satu ----
function foDetail(tpId) {
    const t = FO_TP.find(x => x.id === tpId) || FO_TP[0];
    return `
    <div class="fo-top">
        <span class="fo-chip"><i class="fas ${t.icon}"></i> ${t.code} · ${t.figs.length} figur gambar teknis</span>
        <button class="btn-ghost" onclick="showPage('fiberOptik')"><i class="fas fa-th"></i> Semua TP</button>
    </div>

    <div class="card">
        ${sectionHead(t.icon, `${t.code} — ${t.title}`, t.color)}
        ${t.intro}
        ${t.body}
    </div>

    <div class="card">
        ${sectionHead('fa-image', `Gambar &amp; Penjelasan (${t.figs.length})`, 'sh-purple')}
        ${t.figs.map((f, idx) => foFig(f, idx + 1, t.figs.length)).join('')}
    </div>

    ${foLessonTools(t.id, 'lesson')}`;
}

// ---- Alias kompatibilitas tautan lama -> alihkan ke showPage kanonik ----
function foOpen(tpId, opts) {
    showPage('fo-' + tpId, opts);
}

// ---- Registrasi halaman detail TP pada peta halaman ----
FO_TP.forEach(t => { pages['fo-' + t.id] = () => foDetail(t.id); });

function fiber() {
    return `<div class="card">
        ${sectionHead('fa-wave-square','Fiber Optic (Standar Industri ITU-T &amp; FOA)','sh-teal')}
        ${callout('success','fa-bolt','Cahaya di Dalam Serat Silika (~204.000 km/detik)','Fiber optic mengirimkan data digital dalam bentuk <strong>pulsa cahaya</strong> (850–1625 nm) melalui inti kaca silika murni berdasarkan prinsip hukum Snellius: <strong>Total Internal Reflection (TIR)</strong>.')}
        <figure class="img-showcase"><img src="assets/devices/fiber.jpg" alt="Kabel Fiber Optic OS2 Single Mode dan OM4 Multimode beserta konektor SC APC hijau dan SC UPC biru" loading="lazy"><figcaption>Kabel Fiber Optic — Single Mode OS2 kuning (SC/APC hijau 8° &amp; SC/UPC biru), Multimode OM4 aqua (LC), serta serat kaca telanjang 125 µm</figcaption></figure>

        <h3 class="sub-head">Struktur Kabel Fiber Optic &amp; Prinsip Total Internal Reflection</h3>
        <figure class="img-showcase"><img src="assets/fo/fig-fiber-tir-cutaway.svg" alt="Diagram pemantulan total internal cahaya zig-zag dalam serat optik" loading="lazy"><figcaption>Hukum Snellius (TIR): sinar merambat lurus dan memantul zig-zag pada batas Core (n₁ ≈ 1,468) — Cladding (n₂ ≈ 1,452)</figcaption></figure>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 210" xmlns="http://www.w3.org/2000/svg">
                <rect width="700" height="210" fill="#0f172a" rx="10"/>
                <!-- Concentric Cross-Section -->
                <circle cx="170" cy="105" r="82" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
                <circle cx="170" cy="105" r="64" fill="#d97706"/>
                <circle cx="170" cy="105" r="46" fill="#2563eb"/>
                <circle cx="170" cy="105" r="28" fill="#cbd5e1"/>
                <circle cx="170" cy="105" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
                <!-- Labels -->
                <line x1="176" y1="98" x2="290" y2="38" stroke="#38bdf8" stroke-width="1"/>
                <text x="295" y="42" fill="#e0f2fe" font-size="10.5" font-weight="700" font-family="Inter,sans-serif">Core: 9 µm (SMF) / 50 µm (MMF)</text>
                <line x1="194" y1="100" x2="290" y2="70" stroke="#94a3b8" stroke-width="1"/>
                <text x="295" y="74" fill="#e2e8f0" font-size="10.5" font-family="Inter,sans-serif">Cladding: 125 µm (indeks n₂ &lt; n₁)</text>
                <line x1="210" y1="115" x2="290" y2="104" stroke="#60a5fa" stroke-width="1"/>
                <text x="295" y="108" fill="#bfdbfe" font-size="10.5" font-family="Inter,sans-serif">Coating Akrilat: 250 µm</text>
                <line x1="226" y1="136" x2="290" y2="138" stroke="#fbbf24" stroke-width="1"/>
                <text x="295" y="142" fill="#fde68a" font-size="10.5" font-family="Inter,sans-serif">Strength Member (Aramid Kevlar / FRP)</text>
                <line x1="242" y1="158" x2="290" y2="174" stroke="#94a3b8" stroke-width="1"/>
                <text x="295" y="178" fill="#cbd5e1" font-size="10.5" font-family="Inter,sans-serif">Outer Jacket (LSZH / HDPE)</text>
                <!-- Accurate Straight-Line Zigzag TIR Ray Box -->
                <rect x="498" y="42" width="176" height="82" rx="6" fill="#1e293b" stroke="#475569"/>
                <line x1="506" y1="62" x2="666" y2="62" stroke="#94a3b8" stroke-width="1.5"/>
                <line x1="506" y1="104" x2="666" y2="104" stroke="#94a3b8" stroke-width="1.5"/>
                <polyline points="508,83 534,62 568,104 602,62 636,104 662,80" fill="none" stroke="#facc15" stroke-width="2.5"/>
                <text x="586" y="144" fill="#38bdf8" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Total Internal Reflection</text>
                <text x="586" y="160" fill="#cbd5e1" font-size="9.2" text-anchor="middle" font-family="Inter,sans-serif">Sinar memantul lurus (zig-zag),</text>
                <text x="586" y="174" fill="#94a3b8" font-size="9.2" text-anchor="middle" font-family="Inter,sans-serif">bukan gelombang lengkung</text>
            </svg>
        </div>

        <h3 class="sub-head">Single Mode vs Multi Mode &amp; Klasifikasi ITU-T / TIA-568.3-D</h3>
        ${tbl(['Parameter','Single Mode (SMF G.652.D / G.657)','Multi Mode (MMF OM3 / OM4 / OM5)'],[
            ['Diameter Core / Cladding','~9 µm / 125 µm (G.652D feeder · G.657 drop)','50 µm (OM3–OM5) atau 62,5 µm (OM1) / 125 µm'],
            ['Sumber Cahaya &amp; λ','Laser diode (1310 / 1490 / 1550 nm)','LED / VCSEL (850 / 1300 nm)'],
            ['Atenuasi Standar','≤0,35 dB/km @1310 · ≤0,22 dB/km @1550 nm','≤3,0 dB/km @850 · ≤1,5 dB/km @1300 nm (TIA-568.3-D)'],
            ['Radius Tekuk Aman','G.652D: 30 mm · G.657A1: 10 mm · G.657B3: 5 mm','Umumnya minimal 30 mm statis'],
            ['Jarak &amp; Bandwidth','100+ km · Tbps+ (bebas modal dispersion)','Hingga 550 m (OM3/OM4) · 10–400 Gbps'],
            ['Warna Jaket Standar','Kuning (atau Hitam outdoor/drop G.657)','Orange (OM1/2), Aqua (OM3/4), Lime Green (OM5)'],
            ['Penggunaan Utama','Backbone ISP, MAN/WAN, FTTH ODN','Koneksi rak server di dalam Data Center / kampus'],
        ])}

        <h3 class="sub-head">Konektor Optik, Polishing UPC vs APC 8° &amp; Kebersihan IEC 61300-3-35</h3>
        <div class="feat-grid">
            ${featCard('🔵','SC/UPC &amp; SC/APC','Push-pull 2,5 mm. Bodi BIRU (UPC 0°, Return Loss ≥50 dB) vs HIJAU (APC 8°, RL ≥60 dB untuk OLT/ODP). Dilarang mencampur Biru &amp; Hijau!')}
            ${featCard('🔷','LC Connector','Lucent Connector (1,25 mm SFF). Menggandakan kerapatan port pada modul SFP / SFP+ / QSFP Data Center.')}
            ${featCard('🔩','FC Connector','Ferrule Connector logam berulir (screw-on). Tahan getar presisi tinggi pada alat ukur OTDR &amp; OPM.')}
            ${featCard('🛡️','E2000 (LSH)','Dilengkapi katup pegas (shutter door) otomatis untuk melindungi mata dari laser &amp; ferrule dari debu.')}
            ${featCard('🟢','MPO / MTP','Konektor multi-fiber 12 atau 24 core sekaligus untuk backbone 40G / 100G / 400G paralel Data Center.')}
            ${featCard('🔬','IEC 61300-3-35','Inspeksi mikroskop Zone A Core (0 cacat/debu) + bersihkan pakai IPA 99,9%, tisu lint-free &amp; One-Click Cleaner.')}
        </div>
        <figure class="img-showcase"><img src="assets/fo/fig-tia598-colors.svg" alt="Standar Kode Warna 12 Serat Optik TIA-598-C" loading="lazy"><figcaption>Standar Kode Warna 12 Serat ANSI/TIA-598-C: 1 Biru, 2 Orange, 3 Hijau, 4 Cokelat, 5 Abu, 6 Putih, 7 Merah, 8 Hitam, 9 Kuning, 10 Ungu, 11 Pink, 12 Toska</figcaption></figure>

        <h3 class="sub-head">Peralatan Instalasi &amp; Pengujian Standar Industri</h3>
        ${tbl(['Alat','Fungsi Utama','Spesifikasi / Ambang Industri'],[
            ['Fusion Splicer (PAS)','Menyambung inti kaca permanen via busur listrik ~1800°C','Tipikal 0,02–0,05 dB (Maks Telkom ≤0,10 dB; TIA-568 ≤0,30 dB)'],
            ['Mechanical / Fast Connector','Menyambung atau terminasi lapangan tanpa splicer','Lebih cepat, atenuasi tipikal ~0,3–0,5 dB'],
            ['Precision Fiber Cleaver','Memotong bare fiber tegak lurus presisi 90° (&lt;0,5°)','Pemotongan miring menyebabkan gagal splice / pantulan tinggi'],
            ['OLTS (OLS + OPM) — Tier-1','Uji WAJIB Insertion Loss end-to-end dengan Zeroing','OLS 1310/1550 nm terkalibrasi + OPM; batas Rx ONT −8 s/d −24 dBm'],
            ['OTDR — Tier-2 Diagnostik','Memetakan jarak, event splice/bend, &amp; letak kabel putus','Wajib Launch Cable 500–1000 m lewati Dead Zone; simpan .SOR'],
            ['Visual Fault Locator (VFL)','Laser merah tampak 650 nm untuk deteksi patah/macrobend','Bukan pengganti OLS; jarak pelacakan &lt; 5 km'],
        ])}

        <h3 class="sub-head">Fiber vs Tembaga</h3>
        ${tbl(['Aspek','Fiber Optic','Kabel Tembaga (UTP/Koaksial)'],[
            ['Bandwidth &amp; Jarak','Tbps+ hingga 100+ km','Gbps (maks 100 m per segmen Ethernet UTP)'],
            ['Imunitas EMI &amp; Keamanan','Kebal total interferensi &amp; sulit disadap','Rentan EMI / crosstalk &amp; induksi listrik'],
            ['Instalasi &amp; Daya Listrik','Butuh Splicer/Cleaver/OPM; tidak bawa daya PoE','Mudah terminasi RJ-45; mendukung PoE'],
        ])}
        ${illo('fiber-sm-mm.svg','Perbandingan fiber Single Mode (core ~9 µm, laser) vs Multi Mode (core 50/62,5 µm, VCSEL/LED)','Ilustrasi perbandingan fiber optic single mode dan multi mode')}

        ${dense('Fiber Optic — Poin Wajib Standar Industri',[
            '<strong>Single Mode (G.652.D / G.657)</strong>: core ±9 µm, laser 1310/1490/1550 nm, jaket kuning, jarak 100+ km. <strong>Multi Mode (OM3/OM4)</strong>: core 50 µm, VCSEL 850 nm, jaket aqua, maks 550 m.',
            '<strong>Kode Warna 12 Core (TIA-598-C)</strong>: Biru, Orange, Hijau, Cokelat, Abu, Putih, Merah, Hitam, Kuning, Ungu, Pink, Toska.',
            '<strong>UPC (Biru, 0°, RL ≥50 dB) vs APC (Hijau, 8°, RL ≥60 dB)</strong> — dilarang keras menyambungkan biru ke hijau!',
            '<strong>Tier-1 (OLS+OPM)</strong> wajib untuk sertifikasi loss end-to-end (GPON Class B+ ≤28 dB, C+ ≤32 dB); <strong>Tier-2 (OTDR)</strong> menganalisis jarak &amp; jenis event memakai <em>Launch Cable</em>.',
            '<strong>Keselamatan (IEC 60825-2)</strong>: sinar IR tak terlihat (Class 1M/3B), kenakan kacamata ANSI Z87.1, dan buang serpihan 125 µm ke wadah tertutup berlabel.'
        ],[
            ['OTDR','Radar optik Tier-2 berbasis Rayleigh Backscatter &amp; Fresnel Reflection'],
            ['OLS vs VFL','OLS = laser uji 1310/1550 nm pasangan OPM; VFL = laser merah 650 nm cari patah'],
            ['Launch Cable','Kabel dummy 500–1000 m untuk melewati Dead Zone (EDZ/ADZ) OTDR'],
            ['IEC 61300-3-35','Standar kebersihan ferrule (Zone A nol debu; pakai IPA 99,9% &amp; One-Click)'],
            ['GPON Rx Safe','Daya terima aman di ONT: −8 dBm s/d −24 dBm']
        ],[
            'Referensi Resmi: The Fiber Optic Association (<a href="https://www.thefoa.org/tech/ref/" target="_blank" rel="noopener">thefoa.org/tech/ref</a>), ITU-T G.652/G.657/G.984, ANSI/TIA-568.3-D &amp; TIA-598-C.'
        ])}
        <button class="btn-primary" onclick="showAssessment('fiber')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Fiber Optic (25 Soal)</button>
        ${currentTrack === 'fo' ? `
        <div class="choice-card cc-teal" style="margin-top:16px;cursor:pointer" onclick="showPage('fo-tp11')">
            <span class="cc-icon"><i class="fas fa-hard-hat"></i></span>
            <span class="cc-kicker">LANGKAH BERIKUTNYA · PRAKTIK</span>
            <strong>Lanjut ke TP 1.1: K3LH &amp; APD Fiber Optik</strong>
            <small>Standar IEC 60825-2 laser safety, limbah serpihan kaca 125 µm &amp; protokol ruang terbatas manhole.</small>
            <span class="cc-go"><i class="fas fa-arrow-right"></i></span>
        </div>` : `
        <div class="choice-card cc-teal" style="margin-top:16px;cursor:pointer" onclick="switchTrack('fo', true)">
            <span class="cc-icon"><i class="fas fa-bolt"></i></span>
            <span class="cc-kicker">MAPEL PILIHAN · PRAKTIK INDUSTRI</span>
            <strong>Lanjutkan ke Mapel Pilihan: Fiber Optik</strong>
            <small>7 TP Praktik Industri: K3LH, penarikan G.652/G.657, APC/UPC &amp; IEC 61300-3-35, fusion splicing, OLTS/OPM, OTDR &amp; BAUT/BAST.</small>
            <span class="cc-go"><i class="fas fa-arrow-right"></i></span>
        </div>`}
    </div>`;
}


// ============================================================
// E3 — KEAMANAN JARINGAN
// ============================================================
function keamanan() {
    return `<div class="card">
        ${sectionHead('fa-shield-alt','Keamanan Jaringan','sh-red')}
        ${callout('danger','fa-exclamation-triangle','Ancaman Nyata!','Setiap hari ada jutaan serangan siber di seluruh dunia. Biaya akibat kejahatan siber diperkirakan mencapai $10,5 triliun per tahun pada 2025. Keamanan jaringan bukan pilihan — ini keharusan.')}

        ${pptIllo('ikon-keamanan.png', 'Keamanan jaringan melindungi data dan perangkat dari akses tidak sah')}

        <h3 class="sub-head">CIA Triad — Fondasi Keamanan Informasi</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 250" xmlns="http://www.w3.org/2000/svg">
                <polygon points="350,58 190,192 510,192" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="2.5"/>
                <circle cx="350" cy="58" r="46" fill="#dbeafe" stroke="#2563eb" stroke-width="2.5"/>
                <circle cx="190" cy="192" r="46" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5"/>
                <circle cx="510" cy="192" r="46" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>
                <text x="350" y="50" fill="#1e40af" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Confidentiality</text>
                <text x="350" y="65" fill="#2563eb" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Kerahasiaan</text>
                <text x="350" y="79" fill="#475569" font-size="8.2" text-anchor="middle" font-family="Inter,sans-serif">Enkripsi &amp; Kontrol Akses</text>
                <text x="190" y="184" fill="#15803d" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Integrity</text>
                <text x="190" y="199" fill="#16a34a" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Integritas</text>
                <text x="190" y="213" fill="#475569" font-size="8.2" text-anchor="middle" font-family="Inter,sans-serif">Hash &amp; Digital Signature</text>
                <text x="510" y="184" fill="#991b1b" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Availability</text>
                <text x="510" y="199" fill="#dc2626" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Ketersediaan</text>
                <text x="510" y="213" fill="#475569" font-size="8.2" text-anchor="middle" font-family="Inter,sans-serif">Redundansi, UPS &amp; Anti-DDoS</text>
                <text x="350" y="142" fill="#1e293b" font-size="14" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">CIA TRIAD</text>
                <text x="350" y="158" fill="#64748b" font-size="9.5" font-weight="600" text-anchor="middle" font-family="Inter,sans-serif">3 Pilar Keamanan (ISO 27001)</text>
            </svg>
        </div>

        <h3 class="sub-head">Jenis Ancaman Jaringan</h3>
        <div class="accordion">
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🦠 Malware</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">${tbl(['Jenis','Cara Menyebar','Dampak'],[
                ['Virus','Menyisipkan diri ke file, menyebar saat file dijalankan','Merusak/mengubah file'],
                ['Worm','Mandiri via jaringan, tidak butuh file induk','Konsumsi bandwidth, DDoS'],
                ['Trojan','Menyamar sebagai software berguna','Backdoor, curi data'],
                ['Ransomware','Email phishing, RDP lemah','Enkripsi data, tebusan'],
                ['Spyware','Bundled software, drive-by download','Curi kredensial, data pribadi'],
                ['Rootkit','Exploit OS/driver','Kontrol penuh, sembunyikan diri'],
            ])}</div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🌊 DoS & DDoS</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p><strong>DoS:</strong> Banjiri target dengan traffic dari satu sumber. <strong>DDoS:</strong> Sama, tapi dari ribuan sumber (botnet) sekaligus.</p>
            <p><strong>Mitigasi:</strong> Rate limiting, traffic scrubbing (Cloudflare, Akamai), blackhole routing, anycast diffusion</p></div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🎣 Phishing & Social Engineering</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Memanipulasi manusia (bukan sistem) agar memberikan akses atau informasi sensitif.</p>
            <p><strong>Tipe:</strong> Spear Phishing (target spesifik), Whaling (eksekutif), Vishing (via telepon), Smishing (via SMS)</p>
            <p><strong>Mitigasi:</strong> Pelatihan awareness, email filtering (SPF/DKIM/DMARC), MFA</p></div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🕵️ Man-in-the-Middle (MITM)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body"><p>Penyerang menyisipkan diri di antara dua pihak yang berkomunikasi — menyadap dan memodifikasi data.</p>
            <p><strong>Teknik:</strong> ARP Poisoning, SSL Stripping, Rogue Access Point, DNS Spoofing</p>
            <p><strong>Mitigasi:</strong> HTTPS/TLS, HSTS, VPN, sertifikat digital, DAI (Dynamic ARP Inspection)</p></div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">💉 Web Application Attacks</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">${tbl(['Serangan','Teknik','Mitigasi'],[
                ['SQL Injection','Input SQL berbahaya ke form','Prepared statements, WAF, input validation'],
                ['XSS','Script berbahaya di halaman web','Output encoding, CSP header'],
                ['CSRF','Request palsu atas nama user','CSRF token, SameSite cookie'],
                ['Path Traversal','../../../etc/passwd di URL','Input sanitization, chroot'],
            ])}</div></div>
        </div>

        <h3 class="sub-head">Sistem Keamanan Jaringan (NGFW, IDS vs IPS, SIEM &amp; EDR)</h3>
        ${pptIllo('sec-ids-ips-edr-arch.svg', 'Arsitektur sistem keamanan jaringan enterprise: Perimeter NGFW, Zona DMZ, IPS Mode Inline (memblokir paket berbahaya secara langsung), IDS Mode Pasif via port SPAN/TAP (mengirim alert ke SIEM/SOC), serta perlindungan Endpoint Antivirus/EDR', 'Diagram arsitektur keamanan jaringan NGFW IDS IPS SIEM dan EDR')}
        ${pptGallery([
            ['perangkat-firewall-diagram.png','Perimeter Firewall','Menyaring lalu lintas antara WAN, DMZ, dan LAN'],
            ['perangkat-antivirus.png','Endpoint Security (AV/EDR)','Melindungi host & perangkat pengguna dari infeksi malware'],
        ])}
        ${tbl(['Sistem','Fungsi','Contoh Produk/Tool'],[
            ['Firewall','Filter traffic berdasarkan aturan','Cisco ASA, pfSense, iptables, Windows Defender Firewall'],
            ['IDS (Intrusion Detection)','Deteksi ancaman, kirim alert','Snort, Suricata (mode IDS)'],
            ['IPS (Intrusion Prevention)','Deteksi DAN blokir ancaman otomatis','Cisco Firepower, Palo Alto NGFW'],
            ['VPN','Koneksi terenkripsi via jaringan publik','OpenVPN, WireGuard, Cisco AnyConnect'],
            ['Antivirus/EDR','Deteksi & hapus malware di endpoint','CrowdStrike, Carbon Black, Windows Defender'],
            ['SIEM','Analisis log keamanan terpusat','Splunk, IBM QRadar, Wazuh (open-source)'],
            ['WAF','Proteksi aplikasi web','ModSecurity, Cloudflare WAF, F5 ASM'],
        ])}

        <h3 class="sub-head">Autentikasi Jaringan</h3>
        ${tbl(['Metode','Cara Kerja','Penggunaan'],[
            ['802.1X','Autentikasi port-based sebelum akses jaringan. Menggunakan EAP via RADIUS','Kantor enterprise, WiFi perusahaan'],
            ['RADIUS','Server AAA terpusat: autentikasi user/password, otorisasi hak akses, akuntansi aktivitas','802.1X, VPN, dial-up'],
            ['LDAP/AD','Direktori terpusat untuk manajemen identitas (user, grup, kebijakan)','Domain Windows, SSO'],
            ['MFA/2FA','Gabungan 2 faktor: tahu (password) + punya (OTP/token) + biometrik','Semua akun penting'],
        ])}
        ${callout('tip','fa-lightbulb','Defense in Depth','Jangan bergantung pada satu lapisan keamanan. Terapkan banyak layer: firewall perimeter → IPS → VLAN segmentation → host firewall → enkripsi data → autentikasi kuat → monitoring SIEM.')}

        ${illo('defense-in-depth.svg','Defense in Depth: lapisan keamanan berlapis dari perimeter hingga data','Ilustrasi pertahanan berlapis defense in depth')}

        ${dense('Keamanan Jaringan — Inti Materi',[
            '<strong>CIA Triad</strong>: Confidentiality (hanya yang berwenang tahu), Integrity (data tidak diubah), Availability (selalu bisa diakses). Semua definisi keamanan berakar dari 3 kata ini.',
            '<strong>IDS vs IPS</strong>: IDS hanya mendeteksi &amp; memberi peringatan; IPS mendeteksi <em>sekaligus memblokir</em> otomatis.',
            'Malware: virus (butuh file induk), worm (self-propagating via jaringan), trojan (menyamar aplikasi berguna), ransomware (enkripsi + tebusan), rootkit (sembunyikan diri di level OS).',
            'MITM: penyerang menyisipkan diri di tengah komunikasi — mitigasi HTTPS/TLS, VPN, HSTS, DAI.',
            'Autentikasi: <strong>802.1X</strong> (port-based, EAP) + <strong>RADIUS</strong> (server AAA terpusat) + <strong>MFA</strong> (gabungan password + OTP/biometrik).',
            'Email anti-phishing: <strong>SPF, DKIM, DMARC</strong>. Web: WAF untuk SQLi/XSS/CSRF.'
        ],[
            ['CIA Triad','Confidentiality, Integrity, Availability'],
            ['AAA','Authentication, Authorization, Accounting'],
            ['SIEM','Pusat analisis log keamanan terpusat (Wazuh, Splunk)'],
            ['Ransomware','Malware pengunci data minta tebusan'],
            ['Social engineering','Menipu manusia, bukan sistem (phishing)']
        ],[
            'Mnemonik serangan web: SQLi = curi data lewat form; XSS = sisipkan script; CSRF = pinjam identitas user.',
            'Backup 3-2-1 = 3 salinan, 2 media berbeda, 1 offsite — penyelamat terakhir saat ransomware menyerang.',
            'Kata kunci soal: "perangkat deteksi yang ikut memblokir" → IPS; "server pusat user" → RADIUS/LDAP.'
        ])}
        <button class="btn-primary" onclick="showAssessment('keamanan')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Keamanan (20 Soal)</button>
    </div>`;
}

// ============================================================
// E3 — FIREWALL
// ============================================================
function firewall() {
    return `<div class="card">
        ${sectionHead('fa-fire-alt','Firewall & ACL','sh-red')}
        <p>Firewall memantau dan mengontrol traffic jaringan berdasarkan <strong>aturan keamanan (rules/ACL)</strong>. Bertindak sebagai "penjaga gerbang" antara jaringan terpercaya dan tidak terpercaya.</p>

        <h3 class="sub-head">Cara Kerja di Topologi</h3>
        ${pptIllo('perangkat-firewall-diagram.png', 'Posisi firewall pada jaringan — menyaring semua lalu lintas antara LAN, DMZ, dan internet')}

        <h3 class="sub-head">Generasi Firewall</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="fw-pf">Packet Filter</button>
                <button class="tab-btn" data-tab="fw-si">Stateful</button>
                <button class="tab-btn" data-tab="fw-al">App Layer</button>
                <button class="tab-btn" data-tab="fw-ng">NGFW</button>
            </div>
            <div id="fw-pf" class="tab-pane active">
                <p><strong>Packet Filtering (Generasi 1)</strong> — Memeriksa setiap paket secara individual berdasarkan IP, port, dan protokol. Tidak mengenal konteks sesi.</p>
                ${tags(tag('✅ Cepat & efisien','green'),tag('✅ Overhead rendah','green'),tag('❌ Mudah di-spoof','red'),tag('❌ Tidak kenal state koneksi','red'))}
            </div>
            <div id="fw-si" class="tab-pane">
                <p><strong>Stateful Inspection (Generasi 2)</strong> — Melacak <em>state koneksi</em> (TCP handshake, established, closed). Paket hanya diizinkan jika sesuai konteks sesi yang valid.</p>
                ${tags(tag('✅ Lebih aman dari packet filter','green'),tag('✅ Tahu konteks koneksi','green'),tag('❌ Tidak mengerti konten aplikasi','amber'))}
            </div>
            <div id="fw-al" class="tab-pane">
                <p><strong>Application Layer Firewall / Proxy (Generasi 3)</strong> — Memfilter pada Layer 7. Memahami protokol aplikasi (HTTP, FTP, SMTP). Bisa blokir URL, filter konten, scan malware.</p>
                ${tags(tag('✅ Inspeksi konten','green'),tag('✅ Bisa blokir per URL/kata kunci','green'),tag('❌ Latensi lebih tinggi','amber'),tag('❌ Lebih kompleks','amber'))}
            </div>
            <div id="fw-ng" class="tab-pane">
                <p><strong>Next-Generation Firewall (NGFW)</strong> — Kombinasi semua generasi + fitur advanced: Application Control, User Identity, SSL/TLS Inspection, Threat Intelligence, IPS terintegrasi.</p>
                ${tags(tag('✅ Visibilitas aplikasi penuh','green'),tag('✅ IPS & anti-malware built-in','green'),tag('✅ User-based policy','green'),tag('❌ Mahal','red'))}
                <p><em>Contoh:</em> Palo Alto PA-Series, Cisco Firepower, Fortinet FortiGate, Check Point</p>
            </div>
        </div>

        ${tbl(['Generasi','Tipe','Inspeksi','Kecepatan','Keamanan'],[
            ['Gen 1','Packet Filter','Header paket (IP/port)','Sangat cepat','Rendah'],
            ['Gen 2','Stateful Inspection','Header + state sesi','Cepat','Sedang'],
            ['Gen 3','Application Layer / Proxy','Konten aplikasi (Layer 7)','Sedang','Tinggi'],
            ['Gen 4','NGFW','Konten + user + IPS + threat intel','Sedang','Sangat tinggi'],
        ])}

        <h3 class="sub-head">Access Control List (ACL) di Cisco</h3>
        ${callout('info','fa-info-circle','Cara Kerja ACL','ACL diperiksa secara berurutan (top-down). Paket dicocokkan dengan aturan PERTAMA yang sesuai. Jika tidak ada yang cocok = DENY (implicit deny all di akhir).')}
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="acl-std">Standard ACL</button>
                <button class="tab-btn" data-tab="acl-ext">Extended ACL</button>
                <button class="tab-btn" data-tab="acl-named">Named ACL</button>
            </div>
            <div id="acl-std" class="tab-pane active">
                <p><strong>Standard ACL</strong> — Hanya memeriksa IP sumber. Penomoran 1–99 dan 1300–1999. Ditempatkan <em>sedekat mungkin dengan tujuan</em>.</p>
                ${codeBlock('Cisco IOS','! Izinkan jaringan 192.168.1.0/24\nRouter(config)# access-list 10 permit 192.168.1.0 0.0.0.255\nRouter(config)# access-list 10 deny any\n! (implicit deny any sudah ada, tapi good practice untuk eksplisit)\n\n! Terapkan ke interface (outbound ke tujuan)\nRouter(config)# interface GigabitEthernet0/1\nRouter(config-if)# ip access-group 10 out')}
            </div>
            <div id="acl-ext" class="tab-pane">
                <p><strong>Extended ACL</strong> — Memeriksa IP sumber, IP tujuan, port, dan protokol. Penomoran 100–199. Ditempatkan <em>sedekat mungkin dengan sumber</em>.</p>
                ${codeBlock('Cisco IOS','! Izinkan HTTP/HTTPS dari LAN ke internet\nRouter(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80\nRouter(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 443\n! Izinkan DNS\nRouter(config)# access-list 100 permit udp 192.168.1.0 0.0.0.255 any eq 53\n! Blokir semua lainnya\nRouter(config)# access-list 100 deny ip any any log\n\n! Terapkan ke interface LAN (inbound dari sumber)\nRouter(config)# interface GigabitEthernet0/0\nRouter(config-if)# ip access-group 100 in')}
            </div>
            <div id="acl-named" class="tab-pane">
                <p><strong>Named ACL</strong> — Menggunakan nama deskriptif, lebih mudah dikelola. Bisa menghapus entry individu tanpa menghapus seluruh ACL.</p>
                ${codeBlock('Cisco IOS','Router(config)# ip access-list extended BLOKIR_SOSMED\nRouter(config-ext-nacl)# deny tcp any host 31.13.82.36 eq 443\nRouter(config-ext-nacl)# deny tcp any host 31.13.90.36 eq 443\nRouter(config-ext-nacl)# permit ip any any\n\n! Verifikasi ACL\nRouter# show access-lists\nRouter# show ip interface GigabitEthernet0/0')}
            </div>
        </div>
        ${callout('tip','fa-lightbulb','Aturan Penempatan ACL','Standard ACL → tempatkan dekat TUJUAN. Extended ACL → tempatkan dekat SUMBER. Ini agar traffic yang tidak diizinkan diblokir sedini mungkin dan tidak membuang bandwidth.')}

        ${illo('firewall-dmz.svg','Firewall memisahkan jaringan internal, DMZ (server publik), dan internet','Ilustrasi firewall dan zona DMZ')}

        ${dense('Firewall & ACL — Poin Ujian',[
            'Generasi firewall: <strong>1 Packet Filter</strong> (cepat, tanpa state) → <strong>2 Stateful</strong> (lacak sesi TCP/UDP) → <strong>3 App Layer/Proxy</strong> (baca konten L7) → <strong>4 NGFW</strong> (app control + IPS + SSL inspection + identitas user).',
            'ACL bersifat <strong>top-down</strong>: paket dicocokkan ke aturan pertama yang cocok, lalu berhenti. Tidak ada yang cocok = <strong>implicit deny all</strong> (ditolak diam-diam di akhir).',
            '<strong>Standard ACL</strong> (1–99, 1300–1999): hanya cek IP sumber → pasang sedekat mungkin <em>tujuan</em>. <strong>Extended ACL</strong> (100–199): cek sumber + tujuan + protokol + port → pasang sedekat mungkin <em>sumber</em>. <strong>Named ACL</strong>: bisa diedit per baris tanpa hapus seluruh aturan.',
            'Wildcard mask kebalikan subnet mask: <code>0.0.0.255</code> = "host dalam /24 yang sama" (untuk ACL), sedangkan subnet mask <code>255.255.255.0</code> untuk interface.',
            'Selalu pakai <code>log</code> pada akhir aturan agar trafik yang diblokir terekam untuk audit.'
        ],[
            ['ACL','Access Control List — daftar aturan filter trafik'],
            ['Implicit deny','Penolakan otomatis untuk trafik yang tidak cocok aturan'],
            ['Stateful','Melacak status koneksi yang sedang berlangsung'],
            ['NGFW','Next-Generation Firewall — semua fitur + IPS'],
            ['Wildcard mask','0.0.0.255 — cocokkan blok IP tertentu di ACL']
        ],[
            'Soal penempatan: standard dekat tujuan, extended dekat sumber — ini aturan emas, hafalkan.',
            'Urutan aturan penting: taruh aturan yang spesifik di ATAS, aturan catch-all (deny any) di bawah.'
        ])}
        <button class="btn-primary" onclick="showAssessment('firewall')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Firewall & ACL (20 Soal)</button>
    </div>`;
}

// ============================================================
// E3 — KRIPTOGRAFI
// ============================================================
function kriptografi() {
    return `<div class="card">
        ${sectionHead('fa-key','Kriptografi','sh-red')}
        <p>Kriptografi adalah ilmu menyembunyikan informasi agar tidak dapat dibaca pihak yang tidak berwenang. Dari Yunani: <em>kryptos</em> (tersembunyi) + <em>graphein</em> (menulis). Fondasi semua komunikasi aman di internet.</p>

        <h3 class="sub-head">Konsep Dasar</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg">
                <!-- Plaintext -->
                <rect x="20" y="55" width="110" height="40" rx="8" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
                <text x="75" y="73" fill="#15803d" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">PLAINTEXT</text>
                <text x="75" y="88" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">"Hello World"</text>
                <!-- Encrypt -->
                <line x1="130" y1="75" x2="185" y2="75" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah)"/>
                <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3b82f6"/></marker><marker id="ah2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3b82f6"/></marker></defs>
                <rect x="185" y="50" width="100" height="50" rx="8" fill="#1e40af"/>
                <text x="235" y="72" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">ENKRIPSI</text>
                <text x="235" y="87" fill="#bfdbfe" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Algoritma + Key</text>
                <!-- Arrow -->
                <line x1="285" y1="75" x2="340" y2="75" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah2)"/>
                <!-- Ciphertext -->
                <rect x="340" y="55" width="120" height="40" rx="8" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/>
                <text x="400" y="73" fill="#991b1b" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">CIPHERTEXT</text>
                <text x="400" y="88" fill="#64748b" font-size="9" text-anchor="middle" font-family="monospace">"X7#mK9@p"</text>
                <!-- Key -->
                <text x="235" y="35" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">🔑 KEY</text>
                <line x1="235" y1="40" x2="235" y2="50" stroke="#f59e0b" stroke-width="1.5"/>
                <!-- Decrypt -->
                <defs><marker id="ah3" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#22c55e"/></marker></defs>
                <line x1="460" y1="75" x2="510" y2="75" stroke="#22c55e" stroke-width="2" marker-end="url(#ah3)"/>
                <rect x="510" y="50" width="90" height="50" rx="8" fill="#15803d"/>
                <text x="555" y="72" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">DEKRIPSI</text>
                <text x="555" y="87" fill="#bbf7d0" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Pakai Key</text>
                <text x="350" y="135" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Enkripsi: plaintext → ciphertext | Dekripsi: ciphertext → plaintext</text>
            </svg>
        </div>

        <h3 class="sub-head">Jenis Kriptografi</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="kr-sym">Simetris</button>
                <button class="tab-btn" data-tab="kr-asym">Asimetris</button>
                <button class="tab-btn" data-tab="kr-hash">Hash Function</button>
                <button class="tab-btn" data-tab="kr-app">Penerapan</button>
            </div>
            <div id="kr-sym" class="tab-pane active">
                <p><strong>Enkripsi Simetris</strong> — Satu kunci yang sama untuk enkripsi dan dekripsi. Sangat cepat, cocok untuk enkripsi data dalam jumlah besar. Tantangan: distribusi kunci yang aman.</p>
                ${tbl(['Algoritma','Key Size','Kecepatan','Status'],[
                    ['AES-128','128-bit','Sangat cepat',tag('✅ Standar industri','green')],
                    ['AES-256','256-bit','Cepat',tag('✅ Sangat aman','green')],
                    ['ChaCha20','256-bit','Sangat cepat',tag('✅ TLS 1.3, mobile','green')],
                    ['3DES','168-bit','Lambat',tag('⚠️ Akan deprecated','amber')],
                    ['DES','56-bit','Cepat (tapi lemah)',tag('❌ Sudah diretas','red')],
                ])}
            </div>
            <div id="kr-asym" class="tab-pane">
                <p><strong>Enkripsi Asimetris (Public Key)</strong> — Dua kunci: <strong>Public Key</strong> (dibagikan ke semua, untuk enkripsi) dan <strong>Private Key</strong> (dirahasiakan, untuk dekripsi). Memecahkan masalah distribusi kunci.</p>
                ${tbl(['Algoritma','Key Size','Penggunaan Utama'],[
                    ['RSA','2048/4096-bit','SSL/TLS handshake, digital signature, email encryption'],
                    ['ECDSA/ECDH','256-bit (setara RSA-3072)','TLS 1.3, Bitcoin, lebih efisien dari RSA'],
                    ['Diffie-Hellman','Variable','Key exchange protocol — tidak bisa enkripsi langsung'],
                    ['DSA','1024-3072 bit','Digital Signature Algorithm'],
                ])}
            </div>
            <div id="kr-hash" class="tab-pane">
                <p><strong>Hash Function</strong> — Mengubah data berukuran berapa pun menjadi nilai hash tetap. Proses <em>satu arah</em> — tidak bisa dikembalikan. Digunakan untuk verifikasi integritas, penyimpanan password.</p>
                <p><strong>Sifat hash yang baik:</strong> Deterministic (input sama → output sama), Fast computation, Avalanche effect (perubahan kecil → hash sangat berbeda), Collision resistant</p>
                ${tbl(['Algoritma','Output Size','Status'],[
                    ['MD5','128-bit',tag('❌ Tidak aman — jangan gunakan','red')],
                    ['SHA-1','160-bit',tag('❌ Sudah broken','red')],
                    ['SHA-256','256-bit',tag('✅ Standar modern','green')],
                    ['SHA-3 (Keccak)','224-512-bit',tag('✅ Terbaru & aman','green')],
                    ['bcrypt/Argon2','Variable',tag('✅ Untuk password hashing','green')],
                ])}
            </div>
            <div id="kr-app" class="tab-pane">
                ${tbl(['Protokol','Kriptografi yang Digunakan','Fungsi di Jaringan'],[
                    ['HTTPS/TLS 1.3','ECDH key exchange, AES-256-GCM, SHA-256','Enkripsi web browser ↔ server'],
                    ['SSH','RSA/ECDSA, AES, SHA-2','Remote access aman ke server Linux'],
                    ['IPsec VPN','IKE, AES, SHA-256, DH groups','Tunnel VPN terenkripsi'],
                    ['WPA3','SAE (AES-256-GCMP)','Enkripsi WiFi'],
                    ['PGP/GPG','RSA + AES + SHA','Enkripsi email end-to-end'],
                    ['TLS Certificate (X.509)','RSA/ECDSA public key','Autentikasi identitas server'],
                ])}
            </div>
        </div>
        ${callout('info','fa-info-circle','PKI (Public Key Infrastructure)','PKI adalah sistem pengelolaan kunci publik dan sertifikat digital. Komponen: Certificate Authority (CA) yang mengeluarkan sertifikat, Digital Certificate (X.509) yang membuktikan kepemilikan kunci, dan Certificate Revocation List (CRL) untuk sertifikat yang dibatalkan.')}

        ${illo('crypto-compare.svg','Perbandingan kriptografi simetris (1 kunci), asimetris (public/private), dan hash (one-way)','Ilustrasi perbandingan kriptografi simetris asimetris dan hash')}

        ${dense('Kriptografi — Inti Materi',[
            '<strong>Simetris</strong> (AES-256, ChaCha20): satu kunci untuk enkripsi &amp; dekripsi — cepat, cocok untuk data besar; masalahnya distribusi kunci.',
            '<strong>Asimetris</strong> (RSA, ECDSA): public key untuk enkripsi, private key untuk dekripsi — memecahkan distribusi kunci; dipakai untuk key exchange &amp; digital signature.',
            '<strong>Hash</strong> (SHA-256, SHA-3, bcrypt): satu arah, output tetap, avalanche effect — untuk integritas &amp; penyimpanan password. MD5 &amp; SHA-1 sudah rusak, jangan dipakai.',
            'TLS 1.3 memakai <strong>ECDH</strong> untuk bertukar kunci + <strong>AES-256-GCM</strong> untuk enkripsi data + <strong>SHA-256</strong> untuk integritas.',
            'Digital signature = hash pesan dienkripsi (ditandatangani) dengan <strong>private key pengirim</strong> dan diverifikasi dengan <strong>public key pengirim</strong>; membuktikan keaslian (autentisitas), integritas, &amp; anti-penyangkalan (non-repudiation).',
            'Hash sifatnya: deterministic (input sama → output sama), satu arah (tidak bisa dibalik), collision-resistant.'
        ],[
            ['Plaintext','Data asli sebelum dienkripsi'],
            ['Ciphertext','Hasil enkripsi yang tidak terbaca'],
            ['PKI','Sistem manajemen kunci publik &amp; sertifikat (CA, X.509, CRL)'],
            ['Digital signature','Tanda tangan digital untuk bukti asal &amp; integritas'],
            ['Key exchange','Protokol bertukar kunci secara aman (Diffie-Hellman/ECDH)']
        ],[
            'Hafal ini: DES 56-bit ❌, 3DES ⏳, AES-128/256 ✅, MD5 ❌, SHA-1 ❌, SHA-256 ✅ — sering jadi pilihan ganda.',
            'Trik membedakan: "enkripsi data besar" → simetris; "bertukar kunci / tanda tangan" → asimetris; "verifikasi integritas / password" → hash.'
        ])}
        <button class="btn-primary" onclick="showAssessment('kriptografi')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Kriptografi (20 Soal)</button>
    </div>`;
}


// ============================================================
// E5 — LINUX & SERVER
// ============================================================

function linux() {
    return `<div class="card">
      ${sectionHead('fa-linux','Sistem Operasi Jaringan','sh-orange')}
      ${callout('info','fa-terminal','Mengapa Linux untuk Server?','Linux banyak digunakan pada server karena fleksibel, dapat dikelola melalui terminal, mendukung layanan jaringan, dan menyediakan sistem permission serta logging yang kuat.')}
      <h3 class="sub-head">Peran Sistem Operasi Jaringan</h3>
      <p>Sistem operasi jaringan mengelola sumber daya perangkat, interface jaringan, akun, proses, penyimpanan, keamanan, dan layanan yang digunakan oleh client. Administrator perlu memahami proses boot, service, package, permission, alamat IP, routing, dan log.</p>
      <h3 class="sub-head">Distribusi Server &amp; Sistem Operasi Perangkat Jaringan (NOS)</h3>
      <p>Debian dan Ubuntu Server LTS banyak digunakan untuk menyelenggarakan layanan jaringan (DNS, DHCP, Web, File, Database), sedangkan <strong>Cisco IOS</strong>, <strong>MikroTik RouterOS</strong>, dan <strong>Juniper Junos</strong> merupakan sistem operasi khusus perangkat jaringan (<em>Network Operating System / NOS</em>) yang berjalan pada router dan managed switch.</p>
      ${pptGallery([
        ['os-debian.jpg','Debian & Ubuntu Server','Distribusi Linux open-source standar industri untuk server jaringan — stabil, aman, dan menggunakan apt (.deb).'],
        ['os-routeros.png','MikroTik RouterOS','Sistem operasi jaringan berbasis kernel Linux untuk router & switch RouterBOARD / CHR.'],
        ['os-cisco-ios.jpg','Cisco IOS / IOS-XE','Internetwork Operating System berbasis CLI untuk router ISR/ASR dan switch Catalyst Cisco.'],
        ['os-junos.jpg','Juniper Junos OS','Sistem operasi jaringan modular berbasis FreeBSD untuk router dan switch enterprise Juniper.'],
        ['app-os.jpg','Ekosistem OS & Layanan','Sistem operasi mengelola sumber daya kernel, jaringan TCP/IP, dan daemon layanan.']
      ])}
      <h3 class="sub-head">Perintah Linux Esensial</h3>
      <div class="tab-group">
        <div class="tab-list">
          <button class="tab-btn active" data-tab="lnx-sistem">Sistem &amp; Jaringan</button>
          <button class="tab-btn" data-tab="lnx-service">Service</button>
          <button class="tab-btn" data-tab="lnx-file">File &amp; Disk</button>
          <button class="tab-btn" data-tab="lnx-log">Log &amp; Proses</button>
        </div>
        <div id="lnx-sistem" class="tab-pane active">
          <pre><code>hostnamectl            # nama host
ip addr                # lihat alamat IP
ip route               # tabel routing
ping 8.8.8.8           # uji konektivitas
ss -tulpn              # port yang terbuka</code></pre>
        </div>
        <div id="lnx-service" class="tab-pane">
          <pre><code>systemctl status ssh   # status layanan
systemctl start ssh
systemctl enable ssh   # jalan saat boot
systemctl restart nginx</code></pre>
        </div>
        <div id="lnx-file" class="tab-pane">
          <pre><code>df -h                  # ruang disk
free -h                # penggunaan RAM
ls -la                 # daftar file
cp /etc/ssh/sshd_config /backup/</code></pre>
        </div>
        <div id="lnx-log" class="tab-pane">
          <pre><code>journalctl -u ssh      # log layanan
tail -f /var/log/syslog
top                    # proses aktif
htop                   # versi interaktif</code></pre>
        </div>
      </div>
      <h3 class="sub-head">Distribusi Linux untuk Jaringan</h3>
      ${tbl(['Distribusi','Package Manager','Kegunaan Utama','Catatan'],[
        ['Ubuntu Server','apt (deb)','Web, DNS, DHCP, file server','Paling umum, dokumentasi melimpah'],
        ['Debian','apt (deb)','Server stabil & hemat daya','Sangat stabil, cocok untuk produksi'],
        ['CentOS / Rocky / Alma','yum/dnf (rpm)','Enterprise & server korporat','RHEL-compatible, dukungan jangka panjang'],
        ['Alpine Linux','apk','Container & router ringan','Sangat ringan, keamanan baik'],
      ])}
      <h3 class="sub-head">Struktur Filesystem &amp; Permission</h3>
      ${tbl(['Direktori','Fungsi'],[
        ['/etc','Konfigurasi sistem & layanan'],
        ['/var','Data berubah: log (/var/log), cache, mailbox'],
        ['/home','Home directory setiap user'],
        ['/usr','Program & library aplikasi'],
        ['/srv','Data layanan (web, FTP)'],
        ['/tmp','File sementara (dibersihkan saat boot)'],
      ])}
      <p><strong>Permission file (rwx):</strong> angka 7 = rwx (4+2+1: baca/tulis/eksekusi), 5 = r-x (4+0+1), 4 = r--, 0 = ---. Contoh <code>chmod 750 file</code> = owner rwx, group r-x, other ---. Ubah pemilik dengan <code>chown user:group file</code>.</p>
      ${illo('linux-filetree.svg','Struktur Filesystem Hierarchy Standard (FHS) Linux (/etc, /var/log, /home, /usr/bin) & contoh perintah administrasi di terminal server','Ilustrasi pohon direktori FHS Linux dan terminal')}
      <h3 class="sub-head">Konfigurasi Jaringan di Linux</h3>
      <pre><code># Netplan (Ubuntu 18.04+) — /etc/netplan/01-config.yaml
network:
  ethernets:
    eth0:
      addresses: [192.168.1.10/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
  version: 2

sudo netplan apply        # terapkan konfigurasi
ip addr show              # verifikasi alamat IP
ip route show             # verifikasi gateway/routing</code></pre>
      <h3 class="sub-head">Manajemen service</h3>
      <p>Service adalah program yang berjalan di latar belakang. Gunakan systemctl untuk memeriksa, memulai, menghentikan, atau mengaktifkan service saat boot. Jika service gagal, baca journal, periksa konfigurasi, port, permission, dependensi, dan ruang disk sebelum melakukan restart berulang.</p>
      <h3 class="sub-head">Keamanan dasar</h3>
      <ul><li>Gunakan akun non-root untuk aktivitas harian dan sudo untuk tugas administratif.</li><li>Aktifkan pembaruan keamanan dan hapus layanan yang tidak diperlukan.</li><li>Batasi SSH dari jaringan administrator dan gunakan autentikasi kuat.</li><li>Atur permission file berdasarkan prinsip least privilege.</li><li>Aktifkan firewall host dan pantau log.</li><li>Backup konfigurasi serta data penting dan uji proses restore.</li></ul>
      <h3 class="sub-head">Praktik laboratorium</h3>
      <p>Instal Linux Server pada mesin virtual, atur hostname dan IP statis, buat akun administrator non-root, aktifkan SSH, lalu uji dari komputer client. Kumpulkan bukti perintah ip addr, ip route, systemctl status, ss -tulpn, dan hasil ping.</p>
      ${dense('Sistem Operasi Jaringan Linux — Inti Materi',[
          'Hierarki direktori FHS: <strong><code>/etc</code></strong> = semua file konfigurasi; <strong><code>/var/log</code></strong> = catatan log sistem &amp; layanan; <strong><code>/var/www</code></strong> = dokumen web; <strong><code>/home</code></strong> = direktori user.',
          'Perhitungan <strong>chmod oktal</strong>: Read (r) = <strong>4</strong>, Write (w) = <strong>2</strong>, Execute (x) = <strong>1</strong>. <code>chmod 755</code> = <code>rwxr-xr-x</code>, <code>chmod 644</code> = <code>rw-r--r--</code>, <code>chmod 600</code> = <code>rw-------</code> (wajib untuk private key SSH).',
          'Konfigurasi IP statis Ubuntu Server menggunakan <strong>Netplan</strong> (<code>/etc/netplan/*.yaml</code>) → terapkan dengan <code>sudo netplan apply</code> dan verifikasi lewat <code>ip addr</code> &amp; <code>ip route</code>.',
          'Manajemen daemon dengan <strong>systemd</strong>: <code>systemctl status/start/restart/enable &lt;service&gt;</code>; audit log error layanan dengan <code>journalctl -xeu &lt;service&gt;</code>.',
          'Hardening dasar: gunakan akun non-root + <code>sudo</code>, matikan <code>PermitRootLogin</code> pada SSH, gunakan autentikasi SSH key, dan aktifkan firewall host (<code>ufw</code>).'
      ],[
          ['FHS','Filesystem Hierarchy Standard — struktur baku direktori Linux'],
          ['chmod / chown','Perintah mengubah izin akses (rwx) dan kepemilikan file'],
          ['Netplan','Utilitas konfigurasi jaringan berbasis YAML di Ubuntu Server'],
          ['systemd','Manajer sistem &amp; layanan (daemon) utama di Linux modern'],
          ['sudo','Menjalankan perintah administratif dengan hak superuser secara terkontrol']
      ],[
          'Soal ujian klasik: "di mana letak seluruh file konfigurasi layanan Linux?" → jawabannya <code>/etc</code>.',
          'Berapa nilai oktal untuk <code>rwxr-x---</code>? Owner 4+2+1=7, Group 4+0+1=5, Others 0 → <strong>750</strong>.'
      ])}
      <button class="btn-primary" onclick="showAssessment('linux')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Sistem Operasi Jaringan Linux (20 Soal)</button>
    </div>`;
}

function server() {
    return `<div class="card">
        ${sectionHead('fa-server','Konfigurasi Server Jaringan','sh-orange')}
        <p>Server jaringan menyediakan layanan terpusat kepada client (DHCP, DNS, Web HTTP/HTTPS, File Sharing, FTP, Mail, dan NTP). Konfigurasi yang terstandar memastikan layanan berjalan stabil, aman, dan mudah dipulihkan.</p>

        <h3 class="sub-head">Platform OS Server &amp; Aplikasi Layanan Jaringan</h3>
        ${pptGallery([
            ['os-debian.jpg','Debian / Ubuntu Server','Platform Linux Server utama untuk layanan BIND9, Apache2, Nginx, DHCP, dan Samba'],
            ['os-windows-server.jpg','Microsoft Windows Server','Platform server enterprise untuk Active Directory Domain Services (AD DS), DNS, & IIS'],
            ['app-apache.jpg','Apache HTTP Server','Web server open-source populer untuk menyajikan situs HTTP/HTTPS & Virtual Host'],
            ['app-samba.png','Samba (SMB/CIFS)','Server berbagi file dan printer lintas platform antara Linux Server dan klien Windows'],
            ['app-exchange.jpg','Mail Server Enterprise','Layanan pertukaran surat elektronik (SMTP, IMAP, POP3) organisasi'],
            ['app-browser.jpg','Client Web Browser','Pengujian akses aplikasi web HTTP/HTTPS (port 80/443) dari sisi perangkat klien'],
        ])}

        <div class="accordion">
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🌐 DHCP Server (isc-dhcp-server / kea-dhcp4)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>DHCP otomatis mendistribusikan: IP address, subnet mask, default gateway, DNS server, dan lease time ke client menggunakan siklus 4 tahap <strong>DORA (Discover → Offer → Request → Acknowledge)</strong>.</p>
                <figure class="img-showcase"><img src="assets/dhcp-dns-flow.svg" alt="Diagram alur DHCP DORA dan resolusi DNS" loading="lazy"><figcaption>Siklus 4 Tahap DHCP (Discover, Offer, Request, Acknowledge) dan Alur Query DNS Server</figcaption></figure>
                ${codeBlock('bash','# Install\nsudo apt install isc-dhcp-server -y\n\n# Konfigurasi interface di /etc/default/isc-dhcp-server\nINTERFACESv4="ens33"\n\n# Konfigurasi /etc/dhcp/dhcpd.conf\ndefault-lease-time 600;\nmax-lease-time 7200;\n\nsubnet 192.168.1.0 netmask 255.255.255.0 {\n  range 192.168.1.100 192.168.1.200;\n  option routers 192.168.1.1;\n  option domain-name-servers 8.8.8.8, 8.8.4.4;\n  option broadcast-address 192.168.1.255;\n}\n\n# Restart dan aktifkan\nsudo systemctl restart isc-dhcp-server\nsudo systemctl enable isc-dhcp-server\n\n# Cek lease yang diberikan\ncat /var/lib/dhcp/dhcpd.leases')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">📖 DNS Server (BIND9)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>DNS menerjemahkan nama domain ke IP address (Forward Zone: A/AAAA/CNAME/MX) dan sebaliknya (Reverse Zone: PTR). BIND9 adalah implementasi DNS server standar industri di Linux.</p>
                <figure class="img-showcase"><img src="assets/server-client-services.svg" alt="Model Layanan Server DNS, DHCP, Web dan File terhadap Client" loading="lazy"><figcaption>Arsitektur Layanan Terpusat DNS, DHCP, Web, dan File Server pada Jaringan Lokal</figcaption></figure>
                ${codeBlock('bash','# Install\nsudo apt install bind9 bind9utils -y\n\n# Tambah zone di /etc/bind/named.conf.local\nzone "sekolah.sch.id" {\n    type master;\n    file "/etc/bind/db.sekolah";\n};\n\n# Buat file zone /etc/bind/db.sekolah\n$TTL 604800\n@    IN SOA ns1.sekolah.sch.id. admin.sekolah.sch.id. (\n              2024010101 ; Serial\n              604800     ; Refresh\n              86400      ; Retry\n              2419200    ; Expire\n              604800 )   ; Minimum TTL\n\n@    IN NS   ns1.sekolah.sch.id.\nns1  IN A    192.168.1.10\nwww  IN A    192.168.1.20\nmail IN A    192.168.1.30\n\n# Test\nsudo named-checkzone sekolah.sch.id /etc/bind/db.sekolah\nnslookup www.sekolah.sch.id 192.168.1.10')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🌍 Web Server (Apache2)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>Apache HTTP Server (<code>apache2</code>) menyajikan halaman web HTTP (port 80) dan HTTPS (port 443) ke browser client serta mendukung banyak domain dalam satu server menggunakan <strong>Virtual Host</strong>.</p>
                <figure class="img-showcase"><img src="assets/ppt/app-apache.jpg" alt="Apache HTTP Web Server" loading="lazy"><figcaption>Apache HTTP Server — web server open-source modular yang mendukung Virtual Host, SSL/TLS, dan .htaccess</figcaption></figure>                ${codeBlock('bash','# Install\nsudo apt install apache2 -y\nsudo systemctl enable apache2\n\n# Lokasi file website default\n/var/www/html/index.html\n\n# Buat Virtual Host untuk domain sendiri\nsudo nano /etc/apache2/sites-available/sekolah.conf\n\n# Isi Virtual Host:\n<VirtualHost *:80>\n    ServerName www.sekolah.sch.id\n    ServerAlias sekolah.sch.id\n    DocumentRoot /var/www/sekolah\n    ErrorLog ${APACHE_LOG_DIR}/sekolah_error.log\n    CustomLog ${APACHE_LOG_DIR}/sekolah_access.log combined\n</VirtualHost>\n\n# Aktifkan dan test\nsudo a2ensite sekolah.conf\nsudo apache2ctl configtest\nsudo systemctl reload apache2')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">📁 File &amp; FTP Server (Samba &amp; vsftpd)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <figure class="img-showcase"><img src="assets/ppt/app-samba.png" alt="Samba File Sharing Server" loading="lazy"><figcaption>Samba (SMB/CIFS) &amp; vsftpd — layanan berbagi berkas terpusat lintas Linux dan Windows</figcaption></figure>
                ${codeBlock('bash','# Install\nsudo apt install vsftpd -y\n\n# Konfigurasi /etc/vsftpd.conf\nanonymous_enable=NO        # Nonaktifkan akses anonim\nlocal_enable=YES           # Izinkan user lokal login\nwrite_enable=YES           # Izinkan upload\nchroot_local_user=YES      # Batasi user ke home dir\nallow_writeable_chroot=YES\npassive_enable=YES\npasv_min_port=10000\npasv_max_port=10100\n\n# Restart\nsudo systemctl restart vsftpd\n\n# Test dari client (gunakan FileZilla atau terminal)\nftp 192.168.1.10')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">⏰ NTP Server (chrony / ntp)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>NTP (UDP port 123) menyinkronkan waktu seluruh router, switch, dan server di jaringan. Sinkronisasi waktu yang presisi wajib untuk korelasi log SIEM, validasi sertifikat TLS, dan Kerberos/AD.</p>
                <figure class="img-showcase"><img src="assets/devices/server.jpg" alt="Rack Server Produksi untuk Layanan NTP, DNS dan Directory" loading="lazy"><figcaption>Server Infrastruktur — menyediakan sinkronisasi waktu NTP Stratum, DNS, dan otentikasi terpusat</figcaption></figure>
                ${codeBlock('bash','# Install\nsudo apt install ntp -y\n\n# Konfigurasi /etc/ntp.conf\n# Gunakan server NTP Indonesia\nserver 0.id.pool.ntp.org iburst\nserver 1.id.pool.ntp.org iburst\nserver 2.id.pool.ntp.org iburst\n\n# Izinkan client dari jaringan lokal\nrestrict 192.168.1.0 mask 255.255.255.0 nomodify notrap\n\n# Restart dan cek status\nsudo systemctl restart ntp\nntpq -p\ntimedatectl status')}
            </div></div>
        </div>

        <h3 class="sub-head">Troubleshooting Server</h3>
        ${tbl(['Masalah','Diagnosa','Solusi'],[
            ['Service tidak jalan','<code>systemctl status nama_service</code>','Cek log error, perbaiki konfigurasi'],
            ['Port tidak terbuka','<code>ss -tulpn | grep PORT</code>','Cek firewall/ufw, pastikan service aktif'],
            ['DNS tidak resolve','<code>nslookup domain.com</code>','Cek /etc/resolv.conf, restart bind9'],
            ['Tidak bisa ping gateway','<code>ip route show</code>','Periksa konfigurasi IP dan default gateway'],
            ['Disk penuh','<code>df -h && du -sh /var/log/*</code>','Hapus log lama: <code>journalctl --vacuum-time=7d</code>'],
            ['Memory habis','<code>free -h && top</code>','Kill proses berat, tambah swap'],
        ])}
        ${callout('tip','fa-terminal','Selalu Cek Log!','Log sistem ada di <code>/var/log/</code>. Gunakan <code>journalctl -u apache2 -f</code> untuk memonitor log layanan secara real-time saat troubleshooting.')}

        ${illo('dhcp-dns-flow.svg','Alur DHCP (Discover → Offer → Request → Acknowledge) dan DNS (client → resolver → authoritative server)','Ilustrasi alur kerja DHCP dan DNS server')}

        ${dense('Layanan Server — Inti Materi',[
            '<strong>DHCP DORA</strong>: Discover (client broadcast) → Offer (server tawarkan IP) → Request (client terima) → Acknowledge (server kunci). Lease disimpan di <code>/var/lib/dhcp/dhcpd.leases</code>.',
            '<strong>DNS</strong>: menerjemahkan nama domain → IP. Zone file berisi record <strong>A</strong> (domain→IPv4), <strong>AAAA</strong> (→IPv6), <strong>NS</strong> (nameserver), <strong>MX</strong> (mail), <strong>SOA</strong> (otoritas zona).',
            '<strong>Apache</strong>: satu server bisa melayani banyak domain lewat <em>virtual host</em>; aktifkan dengan <code>a2ensite</code> lalu <code>reload</code> (tanpa downtime).',
            '<strong>vsftpd</strong>: matikan akses anonim (<code>anonymous_enable=NO</code>), aktifkan chroot agar user terkunci di home directory.',
            '<strong>NTP</strong>: sinkronisasi waktu wajib untuk log, sertifikat digital, dan autentikasi — pakai <code>0.id.pool.ntp.org</code>.',
            'Troubleshoot urut: <code>systemctl status</code> → <code>journalctl -u</code> → <code>ss -tulpn</code> → cek firewall (ufw) → cek konfigurasi.'
        ],[
            ['DORA','4 langkah proses DHCP: Discover, Offer, Request, Acknowledge'],
            ['Zone file','File data DNS berisi record A, NS, SOA, MX'],
            ['Virtual Host','Satu web server melayani banyak domain berbeda'],
            ['Lease time','Durasi IP "dipinjam" client dari DHCP server'],
            ['Bind9','Implementasi DNS server paling populer di Linux']
        ],[
            'Soal praktik hampir selalu: "buat DNS domain sekolah.sch.id" → zone di named.conf.local + file db.sekolah + named-checkzone.',
            'DNS tidak resolve? Cek <code>/etc/resolv.conf</code> menunjuk ke IP server DNS kamu sendiri, bukan hanya 8.8.8.8.'
        ])}
        <button class="btn-primary" onclick="showAssessment('server')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Konfigurasi Server (20 Soal)</button>
    </div>`;
}

// ============================================================
// GLOSARIUM — semua istilah jaringan
// ============================================================
const glosariumData = [
    // ── Umum & Dasar ──
    ['Umum','LAN','Local Area Network — jaringan lokal dalam satu gedung/sekolah (jangkauan <1 km).'],
    ['Umum','MAN','Metropolitan Area Network — jaringan dalam satu kota.'],
    ['Umum','WAN','Wide Area Network — jaringan luas antar kota/negara (contoh: internet).'],
    ['Umum','PAN','Personal Area Network — jaringan pribadi jarak sangat dekat (Bluetooth).'],
    ['Umum','TCP/IP','Protokol dasar komunikasi internet: TCP untuk transmisi andal, IP untuk pengalamatan.'],
    ['Umum','OSI','Model referensi 7 lapis: Physical, Data Link, Network, Transport, Session, Presentation, Application.'],
    ['Umum','Bandwidth','Kapasitas maksimum transfer data per detik (bps/Gbps).'],
    ['Umum','Latency','Waktu tunda paket dari sumber ke tujuan (ms).'],
    ['Umum','Throughput','Volume data yang benar-benar berhasil dikirim per detik.'],
    ['Umum','ISP','Internet Service Provider — penyedia layanan internet (Telkom, Indihome, dll).'],
    ['Umum','Packet','Satuan data yang dipekatkan untuk dikirim melalui jaringan (header + payload).'],
    ['Umum','Frame','Paket data di layer Data Link (layer 2) dengan header MAC.'],
    ['Umum','Protocol','Aturan main komunikasi agar perangkat berbeda vendor bisa saling bicara.'],
    ['Umum','Client','Perangkat yang meminta layanan (PC, laptop, HP).'],
    ['Umum','Server','Perangkat yang menyediakan layanan (web, DNS, DHCP, file).'],
    ['Umum','Client-Server','Arsitektur dengan server pusat — layanan terkelola dan aman.'],
    ['Umum','Peer-to-Peer','Arsitektur tanpa server khusus — setiap node berperan ganda.'],
    ['Umum','Encapsulation','Proses menambahkan header (L3→L2→L1) saat data turun ke media transmisi.'],
    ['Umum','Duplex','Mode komunikasi: half-duplex (satu arah bergantian) vs full-dulex (dua arah bersamaan).'],

    // ── Topologi & Perencanaan ──
    ['Topologi','Topologi Fisik','Tata letak nyata perangkat dan kabel di lapangan.'],
    ['Topologi','Topologi Logis','Cara data mengalir dalam jaringan, terlepas dari susunan fisik.'],
    ['Topologi','Backbone','Kabel/jalur utama penghubung antar segmen jaringan.'],
    ['Topologi','Fault isolation','Kemampuan menemukan titik gangguan dengan cepat.'],
    ['Topologi','Redundansi','Jalur cadangan agar jaringan tetap jalan saat ada kabel putus.'],
    ['Topologi','SDN','Software-Defined Networking — kontrol jaringan terpusat lewat software.'],
    ['Topologi','Tree','Topologi hierarkis gabungan Star + Bus, umum di kampus/enterprise.'],
    ['Topologi','Hybrid','Kombinasi 2+ topologi untuk kebutuhan jaringan kompleks.'],
    ['Perencanaan','SLA','Service Level Agreement — janji layanan penyedia (mis. uptime 99,5%).'],
    ['Perencanaan','Bottleneck','Titik paling lambat yang menahan kinerja seluruh jaringan.'],
    ['Perencanaan','Concurrent user','Jumlah pengguna aktif bersamaan yang harus dilayani.'],
    ['Perencanaan','Skalabilitas','Kemudahan menambah kapasitas tanpa redesain total.'],

    // ── Peralatan ──
    ['Peralatan','Router','Perangkat layer 3 — meneruskan paket antar jaringan berdasar IP address.'],
    ['Peralatan','Switch','Perangkat layer 2 — meneruskan frame berdasar MAC address.'],
    ['Peralatan','Hub','Perangkat layer 1 — membagi sinyal ke semua port (sudah usang, broadcast).'],
    ['Peralatan','Access Point','Perangkat yang membuat jaringan WiFi dan menjembatani ke LAN kabel.'],
    ['Peralatan','Firewall','Perangkat/aplikasi penyaring trafik berdasarkan aturan keamanan.'],
    ['Peralatan','Modem','Modulator-Demodulator — mengubah sinyal digital ↔ analog ke ISP.'],
    ['Peralatan','NIC','Network Interface Card — kartu jaringan, sumber alamat MAC.'],
    ['Peralatan','MAC address','Alamat fisik 48-bit (hex) yang unik di setiap kartu jaringan.'],
    ['Peralatan','PoE','Power over Ethernet — suplai daya lewat kabel ethernet (untuk AP/IP camera).'],
    ['Peralatan','Managed switch','Switch yang bisa dikonfigurasi: VLAN, STP, QoS, port mirroring.'],
    ['Peralatan','Layer 3 Switch','Switch + kemampuan routing (inter-VLAN) dalam satu perangkat.'],
    ['Peralatan','Repeater','Penguat sinyal — memperpanjang jarak tanpa mengubah data.'],
    ['Peralatan','Bridge','Penghubung dua segmen LAN sama jenis (layer 2).'],
    ['Peralatan','Gateway','Perangkat pintu keluar yang menghubungkan jaringan berbeda.'],
    ['Peralatan','UPS','Uninterruptible Power Supply — cadangan listrik agar perangkat tidak mati mendadak.'],

    // ── IP & Subnetting ──
    ['IP','IPv4','Alamat 32-bit (4 oktet, 0–255) — contoh 192.168.1.1.'],
    ['IP','IPv6','Alamat 128-bit heksadesimal — 340 undecillion alamat unik.'],
    ['IP','CIDR','Classless Inter-Domain Routing — penulisan IP/prefix, mis. 192.168.1.0/26.'],
    ['IP','VLSM','Variable Length Subnet Mask — subnet mask berbeda per segmen agar hemat alamat.'],
    ['IP','Subnet mask','Menandai bagian network vs host dari sebuah IP address.'],
    ['IP','Subnetting','Memecah satu jaringan besar menjadi beberapa jaringan kecil.'],
    ['IP','APIPA','169.254.0.0/16 — IP otomatis saat DHCP gagal (Automatic Private IP).'],
    ['IP','Loopback','127.0.0.0/8 — test jaringan lokal (localhost = 127.0.0.1).'],
    ['IP','IP Private','Alamat internal yang tidak bisa diakses langsung dari internet: 10.x, 172.16–31.x, 192.168.x.'],
    ['IP','IP Public','Alamat unik global yang dikelola IANA/RIR dan harus disewa dari ISP.'],
    ['IP','Broadcast address','Alamat tujuan paket broadcast — selalu alamat terakhir dari subnet.'],
    ['IP','Network address','Identitas subnet — semua bit host bernilai 0 (mis. 192.168.1.0).'],
    ['IP','Wildcard mask','Kebalikan subnet mask (0.0.0.255) — dipakai pada ACL router.'],
    ['IP','Default route','Rute tujuan 0.0.0.0/0 — "kirim semua yang tidak dikenal ke gateway ini".'],
    ['IP','SLAAC','Stateless Address Autoconfiguration — IPv6 membuat alamat otomatis.'],

    // ── VLAN & Konfigurasi ──
    ['VLAN','VLAN','Virtual LAN — segmen logis terisolasi pada switch fisik yang sama.'],
    ['VLAN','802.1Q','Standar tagging VLAN — menambah 4 byte tag ke frame Ethernet.'],
    ['VLAN','Tagging','Menandai frame dengan VLAN ID agar bisa dibedakan di trunk.'],
    ['VLAN','Trunk','Port penghubung antar switch yang membawa banyak VLAN ber-tag.'],
    ['VLAN','Access port','Port yang hanya membawa 1 VLAN (untagged) — untuk PC/printer.'],
    ['VLAN','Native VLAN','VLAN yang frame-nya tidak di-tag di sebuah trunk (default VLAN 1).'],
    ['VLAN','SVI','Switch Virtual Interface — IP address per VLAN di Layer 3 switch.'],
    ['VLAN','Inter-VLAN routing','Routing antar VLAN — butuh router atau L3 switch.'],
    ['VLAN','Router-on-a-Stick','Satu interface router dengan banyak sub-interface (satu per VLAN).'],
    ['VLAN','Broadcast domain','Segmen broadcast — dipotong oleh router dan dipisah tiap VLAN.'],

    // ── Routing ──
    ['Routing','Routing table','Tabel berisi rute tujuan + next-hop yang dipakai router.'],
    ['Routing','AD','Administrative Distance — nilai kepercayaan sumber rute (makin kecil makin dipercaya).'],
    ['Routing','Next-hop','IP router tujuan berikutnya untuk meneruskan paket.'],
    ['Routing','Metrik','Nilai kualitas rute: hop count (RIP), cost (OSPF), bandwidth+delay (EIGRP).'],
    ['Routing','Konvergensi','Waktu hingga semua router sepakat dengan topologi baru.'],
    ['Routing','RIP','Routing Information Protocol — distance vector, maks 15 hop, cocok jaringan kecil.'],
    ['Routing','OSPF','Open Shortest Path First — link state, algoritma Dijkstra, area 0 backbone.'],
    ['Routing','BGP','Border Gateway Protocol — path vector antar AS, protokol tulang punggung internet.'],
    ['Routing','EIGRP','Advanced distance vector milik Cisco — metrik bandwidth + delay.'],
    ['Routing','Area 0','Backbone area OSPF — wajib ada dalam satu proses OSPF.'],
    ['Routing','Floating static route','Rute statis cadangan dengan AD lebih tinggi (failover otomatis).'],

    // ── NAT & Gateway ──
    ['NAT','NAT','Network Address Translation — menerjemahkan IP private ↔ IP public.'],
    ['NAT','PAT','Port Address Translation (NAT overload) — banyak IP private → 1 IP public via port.'],
    ['NAT','Default gateway','IP router sebagai pintu keluar trafik LAN ke jaringan lain/internet.'],
    ['NAT','Translation table','Tabel penyimpan mapping IP:port di router NAT.'],
    ['NAT','Inside/Outside','Penanda interface: dalam (LAN) vs luar (WAN) pada konfigurasi NAT.'],

    // ── Kabel & Media ──
    ['Kabel','UTP','Unshielded Twisted Pair — kabel tembaga berpasangan tanpa perisai (LAN standar).'],
    ['Kabel','STP','Shielded Twisted Pair — kabel UTP berperisai untuk lingkungan interferensi tinggi.'],
    ['Kabel','Coaxial','Kabel inti tembaga berlapis (75 Ω) untuk TV kabel/CCTV.'],
    ['Kabel','RJ-45','Konektor 8-pin untuk kabel UTP.'],
    ['Kabel','Crimping','Menekan konektor RJ-45 agar pin menancap pada kawat.'],
    ['Kabel','Crosstalk','Interferensi sinyal antar pasang kabel dalam satu kabel.'],
    ['Kabel','T568A/B','Standar urutan warna kabel UTP — T568B paling umum dipakai.'],
    ['Kabel','Straight-through','Kabel berdujung sama (T568B–T568B) untuk perangkat BERBEDA.'],
    ['Kabel','Crossover','Kabel berdujung beda (T568B–T568A) untuk perangkat SAMA.'],
    ['Kabel','Cat5e/Cat6','Kategori UTP: Cat5e 1 Gbps, Cat6 10 Gbps (55 m).'],
    ['Kabel','Fiber optic','Media transmisi pulsa cahaya — bandwidth sangat tinggi, kebal EMI.'],
    ['Kabel','EMI','Electromagnetic Interference — gangguan sinyal elektromagnetik.'],

    // ── Nirkabel ──
    ['Nirkabel','SSID','Nama jaringan WiFi yang terlihat oleh perangkat.'],
    ['Nirkabel','Channel','Sub-frekuensi dalam band 2.4/5/6 GHz (non-overlap 2.4GHz: 1, 6, 11).'],
    ['Nirkabel','Channel width','Lebar bandwidth kanal: 20/40/80/160 MHz.'],
    ['Nirkabel','Roaming','Perpindahan otomatis perangkat ke AP terkuat/terdekat.'],
    ['Nirkabel','WEP','Enkripsi WiFi lama (RC4) — sudah bisa diretas dalam menit, jangan dipakai.'],
    ['Nirkabel','WPA2','Enkripsi WiFi AES-CCMP — standar minimum yang diterima.'],
    ['Nirkabel','WPA3','Enkripsi WiFi terbaru dengan SAE (AES-256) — anti brute-force.'],
    ['Nirkabel','Mesh WiFi','Sistem beberapa AP saling terhubung nirkabel — tanpa kabel antar AP.'],
    ['Nirkabel','802.11','Standar IEEE untuk jaringan nirkabel (a/b/g/n/ac/ax/be).'],
    ['Nirkabel','MU-MIMO','Multi User MIMO — AP melayani banyak perangkat sekaligus.'],

    // ── Fiber Optic ──
    ['Fiber','Single Mode (SMF)','Fiber core ~9 µm, laser, jarak 100+ km — untuk backbone jarak jauh.'],
    ['Fiber','Multi Mode (MMF)','Fiber core 50/62,5 µm, LED/VCSEL, maks 550 m — untuk data center.'],
    ['Fiber','OTDR','Optical Time Domain Reflectometer — mengukur loss & lokasi gangguan serat dari satu ujung.'],
    ['Fiber','Splicing','Menyambung 2 serat: fusion (busur listrik) atau mekanis.'],
    ['Fiber','Attenuation','Pelemahan sinyal cahaya (dB per km).'],
    ['Fiber','Modal dispersion','Pelebaran pulsa cahaya karena beda mode (khas MMF).'],
    ['Fiber','VFL','Visual Fault Locator — laser merah untuk melihat titik patah/makro-bend.'],
    ['Fiber','Total Internal Reflection','Prinsip pantulan cahaya total di dalam core fiber.'],
    ['Fiber','SC/LC/FC/ST','Jenis konektor fiber: push-pull, kecil, ulir, bayonet.'],
    ['Fiber','OPM','Optical Power Meter — mengukur daya optik (dBm) yang diterima.'],
    ['Fiber','OLS','Optical Light Source — sumber cahaya uji; dipasang berpasangan dengan OPM.'],
    ['Fiber','dBm','Satuan daya optik absolut terhadap 1 mW; 0 dBm = 1 mW.'],
    ['Fiber','dB','Satuan rasio/redaman relatif antara daya masuk dan daya keluar.'],
    ['Fiber','Insertion Loss','Redaman yang ditimbulkan satu komponen (konektor, splice, splitter).'],
    ['Fiber','Return Loss','Perbandingan daya pantul terhadap daya masuk; makin besar makin baik (UPC ≥50 dB).'],
    ['Fiber','Loss Budget','Total redaman yang diizinkan pada satu link agar daya terima masih di atas sensitivitas Rx.'],
    ['Fiber','Fusion Splicer','Alat penyambung serat dengan busur listrik; loss tipikal 0,02–0,05 dB (maks Telkom ≤0,10 dB; TIA-568 ≤0,30 dB).'],
    ['Fiber','Cleaver','Alat pemotong ujung serat presisi siku 90° (&lt;0,5°) sebelum splicing atau fast connector.'],
    ['Fiber','Miller Stripper','Tang pengupas 3 lubang (jaket, buffer 900 µm, coating 250 µm) tanpa menggores cladding 125 µm.'],
    ['Fiber','Pigtail','Serat pendek berkonektor satu ujung untuk terminasi fusion splice di ODF/ODC.'],
    ['Fiber','Patchcord','Kabel fiber siap pakai dengan konektor di kedua ujung (jumper).'],
    ['Fiber','ODF','Optical Distribution Frame — rak terminasi & manajemen serat di sisi pusat STO.'],
    ['Fiber','ODC','Optical Distribution Cabinet — kabinet distribusi luar gedung (biasanya splitter 1:4).'],
    ['Fiber','ODP','Optical Distribution Point — titik distribusi dekat pelanggan (splitter 1:8 / 1:16).'],
    ['Fiber','OLT','Optical Line Terminal — perangkat aktif pusat PON di sisi penyedia layanan.'],
    ['Fiber','ONT/ONU','Optical Network Terminal — perangkat aktif pelanggan mengubah optik ke Ethernet/WiFi (Rx aman −8 s/d −24 dBm).'],
    ['Fiber','Splitter PLC','Pembagi daya optik pasif (1:2 ≈3,5 dB, 1:4 ≈7,2 dB, 1:8 ≈10,5 dB, 1:16 ≈13,8 dB).'],
    ['Fiber','APC/UPC/PC','Polishing ferrule: APC (hijau, 8°, RL ≥60 dB) vs UPC (biru, 0°, RL ≥50 dB). Jangan dicampur!'],
    ['Fiber','E2000 (LSH)','Konektor optik dengan katup pegas otomatis (shutter) pelindung debu dan paparan laser.'],
    ['Fiber','Ferrule','Tabung keramik zirkonia presisi (2,5 mm SC/FC atau 1,25 mm LC) pemegang inti serat.'],
    ['Fiber','Macrobend / Microbend','Lekukan besar/kecil melebihi batas radius aman menyebabkan kebocoran cahaya (melonjak di 1550 nm).'],
    ['Fiber','Wavelength (λ)','Jendela operasi cahaya: 850/1300 nm (MMF); 1310/1490/1550/1625 nm (SMF/GPON).'],
    ['Fiber','Dispersion','Pelebaran pulsa akibat beda mode (MMF) atau beda kecepatan spektrum warna (kromatik).'],
    ['Fiber','FTTx &amp; GPON','Arsitektur FTTH/FTTB/FTTC; GPON ITU-T G.984 Class B+ maks 28 dB, Class C+ maks 32 dB.'],
    ['Fiber','Protection Sleeve','Selongsong bakar berisi batang baja pelindung titik sambungan fusion di dalam splice tray.'],
    ['Fiber','V-Groove &amp; PAS','Alur V keramik &amp; kamera dual-axis Core-Alignment pada fusion splicer.'],
    ['Fiber','Launch Cable','Gulungan serat dummy 500–1000 m untuk melewati Dead Zone awal OTDR.'],
    ['Fiber','Dead Zone (EDZ/ADZ)','Zona buta OTDR pasca-refleksi kuat (Event Dead Zone &amp; Attenuation Dead Zone).'],
    ['Fiber','Gainer Event','Tangga naik palsu (+dB) di OTDR akibat beda backscatter — wajib koreksi uji 2 arah.'],
    ['Fiber','TIA-598-C','Standar kode warna 12 serat (Biru, Orange, Hijau, Cokelat, Abu, Putih, Merah, Hitam, Kuning, Ungu, Pink, Toska).'],
    ['Fiber','IEC 61300-3-35','Standar inspeksi &amp; kebersihan ferrule konektor (Zone A Core wajib nol cacat/debu).'],
    ['Fiber','IEC 60825-2','Standar keselamatan radiasi laser komunikasi optik (Class 1M mikroskop, Class 3B EDFA/DWDM).'],
    ['Fiber','ITU-T G.652D / G.657','G.652.D SMF standar feeder (R 30 mm) vs G.657 Bend-Insensitive drop cable (R 5–10 mm).'],
    ['Fiber','As-Built &amp; BAUT/BAST','Peta jalur terlaksana + Berita Acara Uji Terima (dengan data OPM &amp; .SOR) dan Serah Terima.'],
    ['Fiber','K3LH &amp; JSA','Keselamatan kerja (ANSI Z87.1, wadah serpihan 125 µm, Multi-Gas manhole) &amp; Job Safety Analysis.'],

    // ── Keamanan ──
    ['Keamanan','CIA Triad','Confidentiality, Integrity, Availability — 3 pilar keamanan informasi.'],
    ['Keamanan','AAA','Authentication, Authorization, Accounting — kerangka autentikasi.'],
    ['Keamanan','IDS','Intrusion Detection System — mendeteksi & memberi peringatan ancaman.'],
    ['Keamanan','IPS','Intrusion Prevention System — mendeteksi DAN memblokir ancaman otomatis.'],
    ['Keamanan','VPN','Virtual Private Network — koneksi terenkripsi via jaringan publik.'],
    ['Keamanan','Malware','Perangkat lunak berbahaya: virus, worm, trojan, ransomware, spyware.'],
    ['Keamanan','Ransomware','Malware yang mengunci data dan meminta tebusan.'],
    ['Keamanan','Phishing','Penipuan memancing korban menyerahkan data lewat pesan palsu.'],
    ['Keamanan','Social engineering','Menipu manusia (bukan sistem) untuk mendapat akses.'],
    ['Keamanan','MITM','Man-in-the-Middle — penyerang menyisipkan diri di tengah komunikasi.'],
    ['Keamanan','DDoS','Distributed DoS — banjiri target trafik dari ribuan sumber (botnet).'],
    ['Keamanan','WAF','Web Application Firewall — proteksi khusus aplikasi web.'],

    // ── Firewall & ACL ──
    ['Firewall','ACL','Access Control List — daftar aturan filter trafik (top-down, implicit deny).'],
    ['Firewall','Implicit deny','Penolakan otomatis untuk trafik yang tidak cocok aturan mana pun.'],
    ['Firewall','Stateful','Firewall yang melacak status koneksi yang sedang berlangsung.'],
    ['Firewall','NGFW','Next-Generation Firewall — packet filter + IPS + app control + SSL inspection.'],
    ['Firewall','Packet filter','Firewall generasi 1 — cek IP/port per paket tanpa konteks sesi.'],
    ['Firewall','DMZ','Demilitarized Zone — jaringan terbuka untuk server publik (web/mail).'],

    // ── Kriptografi ──
    ['Kriptografi','Plaintext','Data asli sebelum dienkripsi.'],
    ['Kriptografi','Ciphertext','Hasil enkripsi yang tidak terbaca tanpa kunci.'],
    ['Kriptografi','Enkripsi','Proses mengubah plaintext menjadi ciphertext.'],
    ['Kriptografi','Simetris','Kriptografi 1 kunci untuk enkripsi & dekripsi (AES, ChaCha20).'],
    ['Kriptografi','Asimetris','Kriptografi 2 kunci: public (enkripsi) & private (dekripsi) — RSA, ECDSA.'],
    ['Kriptografi','Hash function','Fungsi satu arah data → nilai tetap (SHA-256, bcrypt) untuk integritas.'],
    ['Kriptografi','PKI','Public Key Infrastructure — sistem sertifikat digital (CA, X.509, CRL).'],
    ['Kriptografi','Digital signature','Tanda tangan digital — bukti asal & integritas pesan.'],
    ['Kriptografi','Key exchange','Protokol bertukar kunci aman (Diffie-Hellman/ECDH).'],
    ['Kriptografi','CA','Certificate Authority — penerbit sertifikat digital tepercaya.'],

    // ── Linux & Server ──
    ['Linux','root','User superuser dengan hak penuh — berhati-hatilah memakainya.'],
    ['Linux','daemon','Proses layanan latar belakang (apache2, bind9, ssh).'],
    ['Linux','chmod','Perintah mengatur izin file berbasis rwx (baca/tulis/jalankan).'],
    ['Linux','package manager','Pengelola paket software: apt (Debian/Ubuntu), dnf (RHEL).'],
    ['Linux','systemctl','Perintah mengelola layanan systemd (start/stop/restart/enable).'],
    ['Linux','Netplan','Alat konfigurasi jaringan Ubuntu berbasis file YAML.'],
    ['Server','DHCP','Dynamic Host Configuration Protocol — memberi IP otomatis ke client.'],
    ['Server','DORA','4 langkah DHCP: Discover → Offer → Request → Acknowledge.'],
    ['Server','DNS','Domain Name System — menerjemahkan nama domain ke IP address.'],
    ['Server','Zone file','File data DNS berisi record A, NS, SOA, MX.'],
    ['Server','BIND9','Implementasi DNS server paling populer di Linux.'],
    ['Server','Lease time','Durasi IP dipinjam client dari DHCP server.'],
    ['Server','Virtual Host','Satu web server melayani banyak domain berbeda.'],
    ['Server','FTP','File Transfer Protocol — transfer file (vsftpd di Linux).'],
    ['Server','NTP','Network Time Protocol — sinkronisasi waktu jaringan.'],
    ['Server','HTTP/HTTPS','Protokol halaman web — HTTPS = HTTP + enkripsi TLS.'],
    ['Server','SSH','Secure Shell — akses terminal aman ke server dari jarak jauh.'],
];

// ============================================================
// GLOSARIUM PERANGKAT KERAS JARINGAN & FIBER OPTIK (BERGAMBAR)
// ============================================================
const glosariumPerangkatData = [
    // ── 1. Router & Switch ──
    {
        cat: 'Router & Switch', layer: 'Layer 3 · Network',
        name: 'Router Enterprise (Cisco ISR / ASR)',
        img: 'assets/ppt/perangkat-router-mikrotik.jpg',
        desc: 'Router modular kelas enterprise yang menghubungkan jaringan LAN ke WAN/Internet, memilih jalur terbaik lewat Tabel Routing (Longest Prefix Match), serta menjalankan NAT, VPN, dan ACL.',
        ports: 'GigabitEthernet RJ-45, SFP Fiber, Modul WIC/EHWIC & Console',
        use: 'Core/Edge Router Kampus, Cabang Enterprise & WAN ISP'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 3 · Network',
        name: 'Juniper Session Smart Router (SSR130)',
        img: 'assets/ppt/perangkat-router-juniper.png',
        desc: 'Router enterprise modern dengan port Gigabit RJ-45 dan slot transceiver SFP fiber untuk konektivitas WAN multi-link, SD-WAN, BGP/OSPF, dan keamanan sesi.',
        ports: '6× GbE RJ-45, 2× SFP Fiber 1G/10G, Console & USB',
        use: 'Branch SD-WAN, Edge Routing & Redundansi Link WAN'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 3 · Network',
        name: 'MikroTik RouterBOARD (hAP lite / RB Series)',
        img: 'assets/ppt/perangkat-switch-hp.jpg',
        desc: 'Router kompak berbasis MikroTik RouterOS untuk konfigurasi routing statis/OSPF, Bridge VLAN Filtering, Firewall Filter, NAT Masquerade, Simple Queue, dan Hotspot.',
        ports: '4× Fast/Gigabit Ethernet RJ-45 + Radio Wi-Fi 2,4 GHz',
        use: 'Praktikum Lab TJKT, Gateway SOHO, RT/RW Net & Branch Office'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 3 · Network',
        name: 'Wireless Router Dual-Band SOHO',
        img: 'assets/devices/router.jpg',
        desc: 'Perangkat gabungan Router Gateway (NAT/DHCP), Switch 4-port LAN, dan Access Point Wi-Fi untuk membagi koneksi internet dari ONT ISP ke pengguna rumah atau ruang kelas.',
        ports: '1× Port WAN (Biru) + 4× Port LAN RJ-45 + Antena MIMO',
        use: 'Gateway Internet Rumah, Ruang Kelas, dan Kantor Kecil (SOHO)'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 2/3 · Data Link & Network',
        name: 'Modular Enterprise Switch Chassis (48-Port Linecard)',
        img: 'assets/ppt/perangkat-router-mikrotik2.jpg',
        desc: 'Blade switch modular berdensitas tinggi di ruang server/wiring closet untuk agregasi ratusan host, mendukung VLAN IEEE 802.1Q, RSTP, LACP, dan manajemen terpusat.',
        ports: '48× Port RJ-45 per Linecard + Backplane Switching Kecepatan Tinggi',
        use: 'Distribution/Access Switch Gedung Kampus & Data Center'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 2 · Data Link',
        name: 'Managed PoE Gigabit Switch (Cisco SG110-24HP)',
        img: 'assets/ppt/perangkat-switch-cisco.jpg',
        desc: 'Switch 24-port Gigabit berbasis MAC Address Table yang mendukung IEEE 802.1Q VLAN, Spanning Tree, serta menyuplai daya PoE (802.3af/at) ke Access Point & CCTV IP.',
        ports: '24× GbE PoE RJ-45 + 2× Combo SFP Fiber Uplink',
        use: 'Access Switch Laboratorium, Lantai Gedung & Jaringan Kampus'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 2 · Data Link',
        name: 'Switch Stack Enterprise (Multi-Unit Stacking)',
        img: 'assets/ppt/perangkat-switch-stack.png',
        desc: 'Beberapa unit switch managed yang digabungkan via kabel stacking berkecepatan tinggi agar bekerja sebagai satu switch logis tunggal dengan redundansi penuh.',
        ports: '48× GbE PoE+ per unit + Port StackWise / SFP+ Uplink',
        use: 'Wiring Closet Kampus Besar dengan Ratusan Endpoint'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 2 · Data Link',
        name: 'Unmanaged Switch 24-Port (TP-Link TL-SF1024D)',
        img: 'assets/ppt/perangkat-switch-dlink.jpg',
        desc: 'Switch Layer 2 plug-and-play tanpa konfigurasi CLI/web. Tetap memisahkan collision domain per port secara full-duplex melalui tabel MAC otomatis.',
        ports: '24× RJ-45 Ethernet Auto-Negotiation & Auto-MDI/MDIX',
        use: 'Ekspansi Port LAN Sederhana pada Satu Subnet Tunggal'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 2 · Data Link',
        name: 'Desktop Switch 8-Port',
        img: 'assets/devices/switch.jpg',
        desc: 'Switch kompak 8 port RJ-45 untuk menghubungkan PC, printer jaringan, dan perangkat kerja lokal dalam satu segmen LAN.',
        ports: '8× Port RJ-45 Ethernet + Indikator LED Link/Act',
        use: 'Meja Kerja, Lab Kecil, atau Ruang Guru'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 1 · Physical',
        name: 'Ethernet Hub (Legacy Layer 1 Concentrator)',
        img: 'assets/devices/hub.jpg',
        desc: 'Perangkat Layer 1 klasik yang menyalin bit sinyal ke semua port sekaligus tanpa memeriksa MAC address (1 collision domain bersama, memiliki indikator lampu COL).',
        ports: '5× Port RJ-45 Half-Duplex + LED PWR / COL / LNK',
        use: 'Pembelajaran Konsep Collision Domain & Evolusi Switch'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 1 · Optical Transceiver',
        name: 'Modul Transceiver SFP / SFP+ (1G & 10G)',
        img: 'assets/devices/sfp-transceiver.jpg',
        desc: 'Modul hot-swappable (Small Form-Factor Pluggable) yang dipasang ke slot SFP switch/router/OLT untuk memilih media optik Multimode (850 nm SX) atau Single-Mode (1310/1550 nm LX/BiDi).',
        ports: 'Duplex LC Fiber (1,25 mm) ↔ Cage SFP/SFP+ 1G/10G',
        use: 'Uplink Fiber Antar-Switch Lantai, Antar-Gedung & Port OLT'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 1 · Media Conversion',
        name: 'Fiber Optic Media Converter (UTP RJ-45 ↔ Fiber)',
        img: 'assets/devices/media-converter.jpg',
        desc: 'Mengubah sinyal listrik tembaga Ethernet (RJ-45, batas 100 m) menjadi sinyal cahaya optik fiber (SC/SFP) guna menembus jarak ratusan meter hingga puluhan kilometer.',
        ports: '1× Port Fiber Optik SC/SFP + 1× Port RJ-45 100/1000BASE-T',
        use: 'Menghubungkan Switch/PC Biasa ke Backbone Fiber Antar-Gedung'
    },
    {
        cat: 'Router & Switch', layer: 'Layer 1 · Power Delivery',
        name: 'PoE Injector IEEE 802.3af/at (Midspan Power)',
        img: 'assets/devices/poe-injector.jpg',
        desc: 'Menyuntikkan tegangan DC (48 V standar 802.3af/at atau 24 V pasif) ke kabel UTP bersama data ketika switch utama belum mendukung PoE (Data In → Data & Power Out).',
        ports: '1× RJ-45 Data In + 1× RJ-45 Data &amp; Power Out + AC Power',
        use: 'Menyuplai Daya Access Point Plafon, Radio PtP Outdoor & CCTV IP'
    },

    // ── 2. Wireless & Akses ──
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · WLAN',
        name: 'Enterprise Ceiling Access Point (Wi-Fi 6 / 802.11ax)',
        img: 'assets/devices/accesspoint.jpg',
        desc: 'Menjembatani klien nirkabel ke LAN kabel dengan OFDMA, MU-MIMO, Multi-SSID VLAN Tagging (Guru/Siswa/Tamu), Roaming mulus (802.11k/v/r), dan catu daya PoE.',
        ports: '1×/2× Port Ethernet RJ-45 (1G/2,5G PoE+ IEEE 802.3at In)',
        use: 'Plafon Ruang Kelas, Aula, Perpustakaan & Kantor Enterprise'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · WLAN',
        name: 'Dedicated Wireless Access Point (Linksys WAP)',
        img: 'assets/ppt/perangkat-router-linksys.jpg',
        desc: 'Access Point standalone yang mendukung mode Access Point, Wireless Repeater/Extender, Point-to-Point Bridge, maupun Wireless Client.',
        ports: 'Port Ethernet RJ-45 + 2× Antena Omnidirectional Eksternal',
        use: 'Perluasan Cakupan WLAN Indoor & Praktik Mode Operasi AP'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 3 · WLAN Router',
        name: 'NETGEAR Dual-Antenna Wi-Fi Router',
        img: 'assets/ppt/perangkat-router-tplink.jpg',
        desc: 'Router nirkabel pemancar SSID berenkripsi WPA2/WPA3-AES sekaligus menjalankan fungsi NAT gateway dan DHCP server bagi perangkat klien.',
        ports: '1× WAN RJ-45 + 4× LAN RJ-45 + 2× Antena High-Gain',
        use: 'Akses Nirkabel Rumah & Kantor Kecil'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · WAN Access',
        name: 'Modem / ONT (Optical Network Terminal)',
        img: 'assets/devices/modem.jpg',
        desc: 'Perangkat pelanggan jaringan FTTH yang mengubah sinyal optik GPON (1490 nm downstream / 1310 nm upstream) menjadi port Ethernet RJ-45 dan Wi-Fi.',
        ports: '1× Port Optik SC/APC (atau SC/UPC), 4× GbE RJ-45, POTS/FXS',
        use: 'Titik Akhir Pelanggan FTTH IndiHome / Biznet / ISP Fiber'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · Outdoor RF PtP',
        name: 'Radio Backhaul Dish Outdoor PtP (AirFiber / PowerBeam)',
        img: 'assets/devices/radio-ptp-outdoor.jpg',
        desc: 'Antena parabola terarah (high-gain directional dish 5 GHz/6 GHz) untuk tautan Point-to-Point antar-gedung/tower jarak kilometer dengan syarat Line-of-Sight & clearance ≥ 60% Zona Fresnel.',
        ports: 'Port Gigabit RJ-45 Terproteksi Cuaca (PoE 24V/48V)',
        use: 'Backhaul WISP Antar-Tower, Link Antar-Kampus & Daerah Terpencil'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · Outdoor CPE PtMP',
        name: 'Wireless CPE Sectoral Outdoor (Ubiquiti NanoStation AC)',
        img: 'assets/devices/radio-cpe-nanostation.jpg',
        desc: 'Radio outdoor kompak tahan cuaca (panel terintegrasi 45°–60°) sebagai klien (Station) pada jaringan Point-to-Multipoint (PtMP) maupun bridge pendek antar-gedung.',
        ports: 'Port Gigabit RJ-45 PoE + Tombol Reset Terlindungi Tutup Cuaca',
        use: 'Penerima Sinyal Tower WISP, CCTV Jembatan/Gerbang & Link Gedung'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · NIC',
        name: 'Gigabit Ethernet PCIe NIC (Intel Gigabit CT)',
        img: 'assets/ppt/perangkat-nic-kartu.jpg',
        desc: 'Kartu antarmuka jaringan PCI-Express pada PC/Server yang mengubah data bus sistem menjadi frame Ethernet dengan alamat fisik MAC Address 48-bit unik.',
        ports: 'Slot PCIe x1 → 1× Port RJ-45 10/100/1000BASE-T + LED Link',
        use: 'Upgrade Interface PC Workstation Lab & Server Linux'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · NIC',
        name: 'Gigabit Server NIC (PCIe Ethernet)',
        img: 'assets/devices/nic.jpg',
        desc: 'Kartu jaringan Ethernet dedikasi untuk PC dan server yang mendukung VLAN tagging IEEE 802.1Q, Wake-on-LAN, dan Checksum Offloading.',
        ports: 'PCI-Express → Port RJ-45 10/100/1000BASE-T',
        use: 'Komputer Klien & Server Router/Firewall (pfSense/Ubuntu)'
    },
    {
        cat: 'Wireless & Akses', layer: 'Layer 1–2 · Legacy NIC',
        name: 'Combo NIC Klasik (BNC Coaxial 10BASE2 + RJ-45)',
        img: 'assets/ppt/perangkat-nic-bnc.png',
        desc: 'Kartu Ethernet era transisi yang memadukan port ulir BNC untuk kabel Coaxial RG-58 (Topologi Bus 10BASE2) dan port RJ-45 untuk kabel UTP (Topologi Star).',
        ports: '1× BNC Female (50 Ω) + 1× RJ-45 (8P8C) + LED ACT/LNK',
        use: 'Sejarah Evolusi Ethernet dari Topologi Bus Coaxial ke Star UTP'
    },

    // ── 3. Server & Keamanan ──
    {
        cat: 'Server & Keamanan', layer: 'Layer 3–7 · Security',
        name: 'Hardware Firewall / Next-Gen Firewall (NGFW)',
        img: 'assets/devices/firewall.png',
        desc: 'Perangkat keamanan perimeter yang menyaring paket antara WAN, LAN, dan DMZ memakai Stateful Inspection, ACL, IPS Inline, Application Control, dan VPN.',
        ports: 'Port WAN, LAN, DMZ (RJ-45 & SFP), Console, HA Sync Port',
        use: 'Gerbang Keamanan Utama (Perimeter Security) Sekolah & Perusahaan'
    },
    {
        cat: 'Server & Keamanan', layer: 'Layer 3–7 · IPS / VPN Appliance',
        name: 'Security Appliance IDS/IPS & VPN (Cisco ASA Series)',
        img: 'assets/devices/ips-appliance.jpg',
        desc: 'Perangkat keamanan jaringan rackmount yang menjalankan inspeksi paket stateful, mitigasi intrusi (IPS), segmentasi zona DMZ, dan terminasi VPN IPsec/SSL jarak jauh.',
        ports: 'Port Ethernet DMZ/Inside/Outside, Slot Flash, Console RJ-45 & USB',
        use: 'Kontrol Akses Zona Server (DMZ), IPS Inline & VPN Site-to-Site'
    },
    {
        cat: 'Server & Keamanan', layer: 'Layer 7 · Application & OS',
        name: 'Rackmount Enterprise Server (Linux / Windows Server)',
        img: 'assets/devices/server.jpg',
        desc: 'Komputer andal (prosesor Xeon/EPYC, RAM ECC, penyimpanan RAID, Dual PSU) penyedia layanan 24/7 seperti DNS BIND9, DHCP, Web Apache/Nginx, File Samba, dan Virtualisasi.',
        ports: '2×/4× GbE / 10G SFP+ NIC + Port Manajemen Out-of-Band (iLO/iDRAC)',
        use: 'Data Center, Ruang Server Sekolah (CBT Ujian, SIAKAD, LMS)'
    },
    {
        cat: 'Server & Keamanan', layer: 'Layer 1 · Physical Rack',
        name: 'Rack Server & Jaringan Standar 19-Inci',
        img: 'assets/devices/network-rack.jpg',
        desc: 'Rangka baja berstandar lebar 19 inci dengan satuan tinggi Unit (1U = 4,45 cm) untuk menata switch, patch panel, OTB fiber, router, server rackmount, PDU listrik, dan sirkulasi udara.',
        ports: 'Mounting Rail 19" + Patch Cable Tray + Power Distribution Unit (PDU)',
        use: 'Pusat Perkabelan Gedung (Wiring Closet / MDF / IDF) & Ruang Server'
    },
    {
        cat: 'Server & Keamanan', layer: 'Layer 1 · Power Backup',
        name: 'UPS (Uninterruptible Power Supply — Proteksi Daya)',
        img: 'assets/devices/ups-server.jpg',
        desc: 'Catu daya baterai cadangan berfitur AVR dan proteksi lonjakan arus (surge protection) agar router, switch core, dan server tidak mati mendadak saat listrik PLN padam.',
        ports: 'Outlet Backup AC + Port Perlindungan Surge RJ-45 + USB/RS-232 Monitoring',
        use: 'Penjaga Kontinuitas Ruang Server & Perangkat Kritis Ujian (SLA)'
    },

    // ── 4. Kabel & Konektor ──
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Physical Copper',
        name: 'Kabel UTP (Unshielded Twisted Pair) & Konektor RJ-45',
        img: 'assets/devices/utp.jpg',
        desc: 'Media transmisi 4 pasang (8 helai) kawat tembaga berpilin berujung konektor RJ-45 (8P8C) sesuai pinout T568B atau T568A (maksimal channel 100 meter).',
        ports: 'Konektor RJ-45 (8 Pin) — Cat5e (1G), Cat6 (10G 55m), Cat6A (10G 100m)',
        use: 'Pengkabelan Horizontal LAN dari Switch/Patch Panel ke PC & AP'
    },
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Physical Copper Shielded',
        name: 'Kabel S/FTP (Shielded/Foiled Twisted Pair)',
        img: 'assets/ppt/kabel-utp-ftp-stp.jpeg',
        desc: 'Kabel tembaga berpelindung interferensi EMI tinggi: setiap pasangan kawat dibungkus aluminium foil lalu dilapisi anyaman jaring kawat (braided shield) keseluruhan plus RJ-45 berpelindung.',
        ports: 'RJ-45 Metal Shielded + Drain Wire Grounding (Standar Cat6A/Cat7)',
        use: 'Lingkungan EMI Tinggi (Pabrik, Dekat Kabel Listrik, Data Center)'
    },
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Structured Cabling',
        name: 'Patch Panel 24-Port RJ-45 & Manajemen Kabel',
        img: 'assets/devices/patch-panel.jpg',
        desc: 'Panel terminasi tetap pada rack 19 inci yang menampung ujung kabel horizontal solid (90 m) di belakangnya (IDC) dan menyediakan port RJ-45 rapi di depan untuk dihubungkan ke switch via patchcord.',
        ports: '24/48× Port RJ-45 Depan + Terminal Blok IDC T568A/B Belakang',
        use: 'Terminasi Pengkabelan Terstruktur ANSI/TIA-568 di Wiring Closet'
    },
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Physical Coaxial',
        name: 'Kabel Koaksial (RG-6 / RG-58) & Konektor BNC/F-Type',
        img: 'assets/devices/coax.jpg',
        desc: 'Kabel tembaga berinti tunggal yang dilapisi isolator dielektrik, anyaman pelindung logam (braided shield), dan jaket PVC. Tahan gangguan frekuensi radio.',
        ports: 'Konektor BNC (LAN 10BASE2 50 Ω / CCTV) & F-Type (TV Kabel/DOCSIS 75 Ω)',
        use: 'Kamera CCTV Analog/HD-TVI, Antena RF, dan Modem TV Kabel'
    },
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Copper Tools',
        name: 'Crimping Tool, LAN Tester & Konektor RJ-45',
        img: 'assets/ppt/kabel-tools.jpeg',
        desc: 'Perlengkapan instalasi dasar kabel UTP: tang crimping pengunci pin RJ-45, gulungan UTP, konektor modular RJ-45, serta LAN Tester penguji urutan nyala LED pin 1–8.',
        ports: 'Slot Crimp 8P8C (RJ-45) & 6P6C (RJ-11) + Master/Remote Tester',
        use: 'Pembuatan & Uji Konektivitas Kabel Patch Cord Straight/Crossover'
    },
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Termination Tool',
        name: 'Impact Punch-Down Tool (Mata Pisau Krone & IDC 110)',
        img: 'assets/devices/punch-down-tool.jpg',
        desc: 'Alat tekan berpegas (impact) untuk menekan tiap urat kawat UTP ke celah IDC belakang Patch Panel atau Wall Keystone Jack sekaligus memotong sisa ujung kabel dengan bersih.',
        ports: 'Mata Pisau Ganda Bolak-Balik Tipe 110 / Krone + Pengatur Gaya LO/HI',
        use: 'Terminasi Kabel Horizontal di Belakang Patch Panel & Stopkontak RJ-45'
    },
    {
        cat: 'Kabel & Konektor', layer: 'Layer 1 · Cable Certifier',
        name: 'Network Cable Certifier & Analyzer (Uji NEXT / TDR)',
        img: 'assets/devices/cable-certifier.jpg',
        desc: 'Instrumen sertifikasi instalasi kabel tembaga & optik (pengukuran panjang TDR, crosstalk NEXT/FEXT, return loss, hingga status Pass/Fail standar Cat5e/Cat6/Cat6A).',
        ports: 'Unit Utama + Dual Remote dengan Modul RJ-45 & Fiber SmartProbe',
        use: 'Sertifikasi Kelaikan Jaringan LAN Kampus & Enterprise (ANSI/TIA-568)'
    },

    // ── 5. Perangkat FTTH (ODN) ──
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1–2 · Central Office OLT',
        name: 'OLT (Optical Line Terminal GPON / XGS-PON)',
        img: 'assets/devices/olt-gpon.jpg',
        desc: 'Perangkat aktif inti penyedia layanan FTTH di ruang sentral/kabinet yang memancarkan sinyal optik hilir (1490 nm), mengelola autentikasi ONT pelanggan, dan membagi trafik via uplink 10G/40G.',
        ports: 'Kartu Line Port SFP GPON (hingga 1:64/1:128 per port) + Uplink 10G SFP+',
        use: 'Sentral ISP (STO) & Pusat Layanan Jaringan Akses FTTH GPON'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Optical Media',
        name: 'Kabel Fiber Optik Single-Mode (OS2) & Multimode (OM4)',
        img: 'assets/devices/fiber.jpg',
        desc: 'Serat kaca silika murni (core 9/125 µm Single-Mode kuning/hitam; 50/125 µm Multimode aqua) yang memandu pulsa laser bebas interferensi elektromagnetik.',
        ports: 'SC/APC (Hijau 8°), SC/UPC (Biru 0°), LC Duplex (1,25 mm), FC',
        use: 'Backbone Antar-Kota, Jaringan FTTH GPON, dan Interkoneksi Data Center'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Optical Cable',
        name: 'Kabel Feeder Loose Tube Multi-Core (G.652.D)',
        img: 'assets/fo/fig-017-penampang-loose-tube.jpg',
        desc: 'Kabel serat optik berkapasitas besar (12 s.d. 144+ core) dengan tabung berwarna standar TIA-598 tersusun melingkar di sekitar batang penguat pusat (Central Strength Member) & armor.',
        ports: 'Terminasi Fusion Splicing di dalam ODF, Joint Closure, dan ODC',
        use: 'Jalur Backbone/Feeder Utama dari STO (OLT) menuju Kabinet ODC'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Optical Drop Cable',
        name: 'Anatomi Kabel Drop Core FTTH (ITU-T G.657)',
        img: 'assets/devices/drop-cable-ftth.jpg',
        desc: 'Struktur lapisan kabel optik pelanggan (lihat perbandingan mistar): jaket luar hitam HDPE tahan UV, serat penguat tarik Aramid (Kevlar kuning) / FRP, tight buffer putih, dan coating biru pelindung kaca 125 µm.',
        ports: 'Terminasi SC/APC Fast Connector atau Fusion Pigtail di ODP ke Roset',
        use: 'Tarikan Akhir (Last-Mile) dari Tiang ODP menuju Rumah Pelanggan'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Central Office',
        name: 'ODF (Optical Distribution Frame — Sentral / STO)',
        img: 'assets/fo/fig-033-odf.jpg',
        desc: 'Rak terminasi berkapasitas besar di ruang sentral (STO/NOC) tempat menyambung kabel feeder luar dengan pigtail, dilengkapi splice tray tersusun rapi dan peta Core Assignment.',
        ports: 'Panel Adapter SC/APC atau LC/UPC + Manajemen Tray & Kabel Kuning/Hijau',
        use: 'Ruang Server Pusat, NOC, dan Sentral Telepon Otomat (STO)'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Rackmount OTB',
        name: 'OTB (Optical Terminal Box) Rackmount 19-Inci SC/APC',
        img: 'assets/fo/fig-033-otb.jpg',
        desc: 'Kotak terminasi rackmount 19 inci berpanel adapter SC/APC hijau (atau SC/UPC) di dalam lemari distribusi/rak gedung yang menampung sambungan pigtail ke kabel patchcord alat ukur/switch.',
        ports: '24/48/96× Port Adapter SC/APC + Kaset Splice Tray Internal',
        use: 'Rak Server Gedung, Kampus & Kabinet Distribusi Optik FTTH'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Outdoor Protection',
        name: 'Joint Closure (Dome & Inline Optical Splice Closure)',
        img: 'assets/fo/fig-032-joint-closure.jpg',
        desc: 'Tabung pelindung kedap air dan debu (IP68) untuk mengamankan titik sambungan fusion splicing antar-segmen kabel feeder di tiang udara maupun manhole bawah tanah.',
        ports: 'Port Masuk/Keluar Kabel Feeder + Seal Karet & Splice Tray Berlapis',
        use: 'Penyambungan & Percabangan Kabel Backbone di Tiang / Manhole'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · FTTx Distribution',
        name: 'ODC (Optical Distribution Cabinet — Outdoor)',
        img: 'assets/fo/fig-033-odc.jpg',
        desc: 'Kabinet distribusi luar ruang tahan cuaca (dihubungkan ke jaringan sub-duct oranye bawah tanah) tempat pertemuan kabel feeder dari STO dengan kabel distribusi melalui splitter primer (1:4).',
        ports: 'Panel Adapter SC/APC, Splitter PLC 1:4, Jalur Duct Masuk & Grounding',
        use: 'Tepi Jalan Kawasan / Perumahan sebagai Pusat Distribusi Wilayah'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · FTTx Access',
        name: 'ODP (Optical Distribution Point — Tiang Cluster)',
        img: 'assets/fo/fig-033-odp.jpg',
        desc: 'Kotak distribusi terpasang pada tiang aerial bersama klem tegangan (tension clamp) dan gulungan cadangan kabel (slack) untuk mencabangkan jalur drop cable ke rumah pelanggan lewat splitter sekunder (1:8 / 1:16).',
        ports: '1× Input Distribusi + 8/16× Port Output SC/APC menuju Drop Cable',
        use: 'Tiang Distribusi di Depan Deretan Rumah Pelanggan FTTH'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Passive Component',
        name: 'PLC Optical Splitter / Coupler APC (Pembagi Pasif)',
        img: 'assets/fo/fig-031-splitter.jpg',
        desc: 'Komponen optik pasif yang membagi sinyal cahaya optik ke banyak cabang tanpa catu daya listrik (redaman 1:2 ≈ 3,5 dB; 1:4 ≈ 7,2 dB; 1:8 ≈ 10,5 dB; 1:16 ≈ 13,8 dB).',
        ports: 'Konektor Berujung Hijau APC 8° (RL ≥ 60 dB) atau Bare Fiber ke Splice',
        use: 'Jantung Percabangan Jaringan PON di dalam ODC dan ODP'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Customer Premise',
        name: 'Roset Optik (Optical Wall Outlet FTTH Indoor)',
        img: 'assets/fo/fig-033-roset.jpg',
        desc: 'Kotak terminasi dinding di dalam rumah pelanggan lengkap dengan dudukan gulungan cadangan serat (slack) dan port adapter SC/APC hijau yang menghubungkan drop cable luar ke patchcord ONT.',
        ports: '1–2× Slot Adapter SC/APC Hijau + Manajemen Slack Internal',
        use: 'Dinding Ruang Tamu / Ruang Kerja Pelanggan FTTH'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Optical Connector',
        name: 'Konektor Optik LC (1,25 mm) vs SC (2,5 mm)',
        img: 'assets/devices/fiber-connectors.jpg',
        desc: 'Perbandingan fisik dua konektor terpopuler: LC Duplex ramping berdiameter ferrule 1,25 mm untuk modul SFP (kiri), dan SC Duplex berdiameter ferrule 2,5 mm untuk ODF/ODP/ONT (kanan). Hijau = APC (8°); Biru = UPC (0°).',
        ports: 'Ferrule Keramik Zirkonia 1,25 mm (LC) & 2,5 mm (SC)',
        use: 'Interkoneksi Modul SFP, ODF, ODC, ODP, Roset & ONT'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · High-Density Connector',
        name: 'Konektor Parallel Multi-Fiber MPO / MTP (Data Center)',
        img: 'assets/devices/fiber-mpo-dc.jpg',
        desc: 'Konektor kepadatan tinggi berferrule MT persegi yang menampung 12 hingga 24 inti serat kaca sekaligus dalam satu plug untuk transmisi paralel 40G / 100G / 400G.',
        ports: 'Ferrule MT 12/24 Core + Dual Guide Pin Presisi & Warna Jaket Aqua/Magenta',
        use: 'Backbone Kecepatan Tinggi 40G/100G/400G di Data Center'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Aerial Hardware',
        name: 'Aksesori Tiang Udara (Tension Clamp, Suspension & Stainless Band)',
        img: 'assets/fo/fig-032-stainless-bend.jpg',
        desc: 'Perangkat keras pengikat kabel udara pada tiang beton/besi: Tension/Anchoring Clamp penahan tarik ujung/sudut, kait suspensi, S-clamp drop cable, serta pita baja Stainless Steel Band + Stopping Buckle.',
        ports: 'Diikat dengan Alat Tarik Banding Tool Tahan Karat Cuaca Luar',
        use: 'Konstruksi Jalur Kabel Fiber Optik Udara (Aerial Deployment)'
    },
    {
        cat: 'Perangkat FTTH (ODN)', layer: 'Layer 1 · Underground Duct',
        name: 'Pipa Pelindung HDPE Sub-Duct (Tanam Bawah Tanah)',
        img: 'assets/fo/fig-032-hdpe.jpg',
        desc: 'Gulungan pipa polietilena berdensitas tinggi (HDPE) tahan tekanan tanah, korosi, dan air untuk jalur kabel optik bawah tanah antar-manhole/handhole serta penarikan kabel tiup (air-blown fiber).',
        ports: 'Diameter Umum 32/28 mm atau 40/33 mm Kode Warna Operator',
        use: 'Instalasi Kabel Backbone Bawah Tanah & Kawasan Ducting'
    },

    // ── 6. Alat Kerja & Ukur FO ──
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Terminasi · Fusion Splicing',
        name: 'Fusion Splicer (Core-Alignment PAS)',
        img: 'assets/fo/fig-030-splicer.jpg',
        desc: 'Mesin penyambung dua ujung serat kaca secara permanen menggunakan kamera mikroskop ganda (Core-Alignment PAS) dan peleburan busur listrik (~1800°C), dilengkapi oven pemanas Protection Sleeve.',
        ports: 'Elektroda Busur Listrik, V-Groove Keramik & Heater Oven 60 mm',
        use: 'Penyambungan Core Serat dengan Redaman Sangat Rendah (≤ 0,05 dB)'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Terminasi · Splice Tray Protection',
        name: 'Splice Tray & Protection Sleeve (Kaset Pelindung Sambungan)',
        img: 'assets/fo/fig-031-protection-sleeve.jpg',
        desc: 'Meja kerja penyambungan (splicer + cleaver + botol IPA) bersama kaset splice tray berlapis untuk menata selongsong bakar Protection Sleeve pada gulungan cadangan aman (radius ≥ 30 mm).',
        ports: 'Slot Organizer Protection Sleeve 40/60 mm + Alur Fiber Radius Aman',
        use: 'Penataan & Perlindungan Mekanis Hasil Fusion Splicing di ODF / Closure'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Persiapan Serat · Cleaving',
        name: 'High-Precision Fiber Cleaver (Pemotong 90°)',
        img: 'assets/fo/fig-060-cleaver-parts.jpg',
        desc: 'Alat pemotong serat kaca telanjang (125 µm) bermata pisau tungsten-carbide putar untuk menghasilkan ujung serat rata cermin bersudut 90° (toleransi < 0,5°).',
        ports: 'Rel Penjepit Coating 250/900 µm, Pisau 16/24 Posisi & Bak Sampah Serat',
        use: 'Tahap Wajib Sebelum Fusion Splicing atau Pemasangan Fast Connector'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Persiapan Serat · Stripping',
        name: 'Tang Pengupas Serat (3-Hole Miller Stripper & Drop Stripper)',
        img: 'assets/fo/fig-030-striper.jpg',
        desc: 'Tang pengupas presisi: Miller Stripper 3 lubang untuk jaket luar, buffer 900 µm, dan coating akrilat 250 µm menjadi cladding kaca 125 µm tanpa menggores serat.',
        ports: '3 Lubang Kalibrasi Presisi Bebas Goresan pada Kaca 125 µm',
        use: 'Pengupasan Lapisan Pelindung Serat Sebelum Dibersihkan & Di-cleave'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Kebersihan · IEC 61300-3-35',
        name: 'Fiber Cleaning Kit (One-Click Cleaner, IPA 99,9% & Lint-Free Wipe)',
        img: 'assets/fo/fig-031-cleaning-pro.jpg',
        desc: 'Perlengkapan kebersihan optik: alkohol Isopropil murni (IPA ≥ 99%), tisu Kimwipes bebas serat lint-free, Cletop cassette, dan pena One-Click Cleaner (2,5 mm & 1,25 mm).',
        ports: 'One-Click 2,5 mm (SC/FC/ST) & 1,25 mm (LC) — Standar IEC 61300-3-35',
        use: 'Mencegah 85%+ Gangguan Redaman Tinggi & Kerusakan Ujung Ferrule'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Inspeksi · IEC 61300-3-35',
        name: 'Mikroskop Inspeksi Ferrule Optik 400× (Fiber Microscope)',
        img: 'assets/devices/fiber-microscope.jpg',
        desc: 'Mikroskop pembesaran optik 200×/400× dengan filter pengaman inframerah untuk memeriksa kebersihan permukaan ujung ferrule (bebas debu, minyak, goresan di Zona A inti 0–25 µm).',
        ports: 'Tip Adapter Universal 2,5 mm (SC/FC/ST) & 1,25 mm (LC) + Lensa IR Filter',
        use: 'Tahap Inspect Pertama & Kedua SOP "Inspect → Clean → Inspect → Mate"'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Alat Lacak Visual · 650 nm',
        name: 'Visual Fault Locator (VFL — Laser Merah Terlihat 650 nm)',
        img: 'assets/devices/vfl-laser.jpg',
        desc: 'Pemancar laser merah kasat mata 650 nm untuk mendeteksi serat putus, macrobending tajam, kebocoran di leher fast connector, serta melacak identitas core di ODF/ODP secara visual.',
        ports: 'Port Universal 2,5 mm (Adapter ke 1,25 mm LC) · Mode Continuous / Blink',
        use: 'Tracing Core Cepat & Identifikasi Titik Putus Jarak Dekat (< 5–10 km)'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Alat Ukur Tier-1 (OLTS)',
        name: 'OPM (Optical Power Meter), OLS (Light Source) & VFL',
        img: 'assets/fo/fig-030-opm-ols.jpg',
        desc: 'Pasangan alat ukur sertifikasi Tier-1: OLS memancarkan laser referensi stabil (1310/1550 nm), sedangkan OPM membaca daya terima absolut (dBm) dan total Insertion Loss (dB) setelah Zeroing.',
        ports: 'Sensor InGaAs Kalibrasi 850/1300/1310/1490/1550/1625 nm + Tombol ZERO',
        use: 'Pengujian Daya Terima ONT (−8 s/d −24 dBm) & Loss Budget End-to-End'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Alat Ukur Tier-2 (Reflektometri)',
        name: 'OTDR (Optical Time Domain Reflectometer) & Launch Cable',
        img: 'assets/fo/fig-030-otdr.jpg',
        desc: 'Instrumen diagnostik Tier-2 berbasis pulsa pantulan balik (Rayleigh & Fresnel) untuk memetakan panjang kabel, loss tiap sambungan, macrobend 1550 nm, dan lokasi Fiber Cut dari satu ujung.',
        ports: 'Port Optik OTDR + Launch Cable Box 500–1000 m (Melewati Dead Zone)',
        use: 'Sertifikasi Kurva Trace (.SOR) & Pelacakan Titik Putus Kabel Jarak Jauh'
    },
    {
        cat: 'Alat Kerja & Ukur FO', layer: 'Toolkit & K3LH Lapangan',
        name: 'Complete Fiber Optic Toolkit & APD Keselamatan (K3LH)',
        img: 'assets/fo/fig-030-toolkit.jpg',
        desc: 'Koper kerja teknisi fiber optik berisi OPM, VFL, Miller Stripper, Drop Stripper, Kevlar Scissors, Cleaver, botol alkohol IPA, kacamata safety ANSI Z87.1, dan wadah limbah serpihan kaca.',
        ports: 'Lengkap dengan Kacamata Safety ANSI Z87.1 & Wadah Serpihan Tertutup',
        use: 'Perlengkapan Standar Tim Instalasi, Maintenance & Restorasi FO'
    }
];

function glosariumModeTabs(activeMode) {
    return `
    <div class="glos-mode-tabs" role="tablist" aria-label="Pilih jenis glosarium">
        <button type="button" class="glos-mode-tab ${activeMode==='istilah'?'active':''}" onclick="showPage('glosarium')">
            <i class="fas fa-book-open"></i>
            <span>Glosarium Istilah</span>
            <span class="gmt-badge">${glosariumData.length} Istilah</span>
        </button>
        <button type="button" class="glos-mode-tab ${activeMode==='perangkat'?'active':''}" onclick="showPage('glosariumPerangkat')">
            <i class="fas fa-server"></i>
            <span>Glosarium Perangkat (Bergambar)</span>
            <span class="gmt-badge">${glosariumPerangkatData.length} Perangkat</span>
        </button>
    </div>`;
}

function glosarium() {
    const groups = {};
    glosariumData.forEach(([g, t, d]) => { (groups[g] = groups[g] || []).push([t, d]); });
    const groupNames = Object.keys(groups);
    return `
    <div class="card">
        ${sectionHead('fa-book-open','Glosarium Istilah & Perangkat Jaringan','sh-blue')}
        ${glosariumModeTabs('istilah')}
        ${callout('info','fa-info-circle','Kamus Istilah TJKT & Fiber Optik','Daftar istilah teknis TKJ &amp; Fiber Optik (A–Z). Buka tab <strong>Glosarium Perangkat</strong> untuk foto &amp; spesifikasi perangkat.')}

        <h3 class="sub-head">🃏 Flashcard Interaktif</h3>
        <p>Ketuk kartu untuk membalik dan melihat arti istilah. Cocok untuk hafalan cepat sebelum ujian.</p>
        <div class="topo-explorer">
            ${flashcardDeck()}
        </div>

        <div class="glos-search">
            <i class="fas fa-search"></i>
            <input type="text" id="glos-input" placeholder="Cari istilah... (mis. VLAN, subnet, firewall, OTDR, GPON)" oninput="filterGlosarium(this.value)">
            <span class="glos-count" id="glos-count">${glosariumData.length} istilah</span>
        </div>

        <div id="glos-body">
        ${groupNames.map(g => `
            <div class="glos-group" data-group="${g}">
                <h3 class="sub-head glos-group-head"><span class="glos-dot"></span>${g}</h3>
                <div class="glos-list">
                    ${groups[g].map(([t, d]) => `
                    <div class="glos-item" data-term="${(t + ' ' + d).toLowerCase()}">
                        <div class="glos-term">${t}</div>
                        <div class="glos-def">${d}</div>
                    </div>`).join('')}
                </div>
            </div>`).join('')}
        </div>

        <div id="glos-empty" class="glos-empty hidden"><i class="fas fa-search-minus"></i> Istilah tidak ditemukan. Coba kata kunci lain.</div>

        <button class="btn-primary" onclick="showPage(currentTrack==='fo'?'fiberOptik':'home')" style="margin-top:20px;width:100%"><i class="fas fa-home"></i> Kembali ke Beranda</button>
    </div>`;
}

let _activeDevCat = 'Semua';

function glosariumPerangkat() {
    _activeDevCat = 'Semua';
    const cats = ['Semua', ...new Set(glosariumPerangkatData.map(d => d.cat))];
    const catCounts = {};
    cats.forEach(c => {
        catCounts[c] = c === 'Semua' ? glosariumPerangkatData.length : glosariumPerangkatData.filter(d => d.cat === c).length;
    });
    return `
    <div class="card">
        ${sectionHead('fa-server','Glosarium Perangkat Jaringan & Fiber Optik','sh-blue')}
        ${glosariumModeTabs('perangkat')}
        ${callout('info','fa-camera','Katalog Visual Perangkat Industri','Foto fisik, layer OSI, port, dan fungsi perangkat TKJ &amp; Fiber Optik. Ketuk gambar untuk memperbesar.')}

        <div class="glos-search">
            <i class="fas fa-search"></i>
            <input type="text" id="dev-glos-input" placeholder="Cari perangkat, merek, port, atau layer... (mis. Router, SFP, PoE, ODP, OTDR, Splicer)" oninput="filterGlosariumPerangkat()">
            <span class="glos-count" id="dev-glos-count">${glosariumPerangkatData.length} perangkat</span>
        </div>

        <div class="dev-gloss-filters" id="dev-gloss-filters">
            ${cats.map(c => `
                <button type="button" class="dg-chip ${c==='Semua'?'active':''}" data-cat="${c}" onclick="setDevGlosCat('${c}')">
                    ${c} <span>${catCounts[c]}</span>
                </button>
            `).join('')}
        </div>

        <div class="dev-gloss-grid" id="dev-gloss-grid">
            ${glosariumPerangkatData.map(d => `
                <article class="dev-gloss-card" data-cat="${d.cat}" data-search="${(d.name + ' ' + d.cat + ' ' + d.layer + ' ' + d.desc + ' ' + d.ports + ' ' + d.use).toLowerCase()}">
                    <div class="dgc-img-wrap">
                        <div class="dgc-badges">
                            <span class="dgc-cat">${d.cat}</span>
                            <span class="dgc-layer">${d.layer}</span>
                        </div>
                        <img src="${d.img}" alt="${d.name}" loading="lazy" decoding="async">
                    </div>
                    <div class="dgc-body">
                        <div class="dgc-title">${d.name}</div>
                        <p class="dgc-desc">${d.desc}</p>
                        <div class="dgc-specs">
                            <div><i class="fas fa-plug"></i><span><strong>Port/Spek:</strong> ${d.ports}</span></div>
                            <div><i class="fas fa-map-marker-alt"></i><span><strong>Penerapan:</strong> ${d.use}</span></div>
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>

        <div id="dev-glos-empty" class="glos-empty hidden"><i class="fas fa-search-minus"></i> Perangkat tidak ditemukan. Coba kata kunci atau kategori lain.</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px">
            <button class="btn-ghost" onclick="showPage('peralatan')" style="flex:1"><i class="fas fa-gamepad"></i> Mini Game: Tebak Perangkat</button>
            <button class="btn-primary" onclick="showPage(currentTrack==='fo'?'fiberOptik':'home')" style="flex:1"><i class="fas fa-home"></i> Kembali ke Beranda</button>
        </div>
    </div>`;
}

function setDevGlosCat(cat) {
    _activeDevCat = cat;
    document.querySelectorAll('#dev-gloss-filters .dg-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    filterGlosariumPerangkat();
}

function filterGlosariumPerangkat() {
    const inp = document.getElementById('dev-glos-input');
    const q = (inp ? inp.value : '').trim().toLowerCase();
    const cards = document.querySelectorAll('#dev-gloss-grid .dev-gloss-card');
    let visible = 0;
    cards.forEach(card => {
        const matchCat = (_activeDevCat === 'Semua' || card.dataset.cat === _activeDevCat);
        const matchQ = (!q || card.dataset.search.includes(q));
        const show = matchCat && matchQ;
        card.classList.toggle('hidden', !show);
        if (show) visible++;
    });
    const cnt = document.getElementById('dev-glos-count');
    if (cnt) cnt.textContent = visible + ' perangkat';
    const emp = document.getElementById('dev-glos-empty');
    if (emp) emp.classList.toggle('hidden', visible > 0);
}

function filterGlosarium(val) {
    const q = (val || '').trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('.glos-item').forEach(el => {
        const hit = !q || el.dataset.term.includes(q);
        el.classList.toggle('hidden', !hit);
        if (hit) visible++;
    });
    document.querySelectorAll('.glos-group').forEach(g => {
        const any = [...g.querySelectorAll('.glos-item')].some(i => !i.classList.contains('hidden'));
        g.classList.toggle('hidden', !any);
    });
    const cnt = document.getElementById('glos-count');
    if (cnt) cnt.textContent = q ? visible + ' dari ' + glosariumData.length + ' istilah' : glosariumData.length + ' istilah';
    document.getElementById('glos-empty')?.classList.toggle('hidden', visible > 0);
}

// ============================================================
// PROGRESS PAGE
// ============================================================
function progressPage() {
    const topics = [
        {k:'topologi',n:'Topologi Jaringan',e:'E1'},
        {k:'kebutuhan',n:'Kebutuhan Teknis',e:'E1'},
        {k:'peralatan',n:'Peralatan Jaringan',e:'E1'},
        {k:'ip',n:'IP Address, CIDR & VLSM',e:'E1'},
        {k:'kabel',n:'Jaringan Kabel',e:'E2'},
        {k:'nirkabel',n:'Jaringan Nirkabel WiFi',e:'E2'},
        {k:'fiber',n:'Fiber Optic',e:'E2'},
        {k:'keamanan',n:'Keamanan Jaringan',e:'E3'},
        {k:'firewall',n:'Firewall & ACL',e:'E3'},
        {k:'kriptografi',n:'Kriptografi',e:'E3'},
        {k:'vlan',n:'VLAN (Virtual LAN)',e:'E4'},
        {k:'routing',n:'Routing Statis & Dinamis',e:'E4'},
        {k:'nat',n:'NAT & Internet Gateway',e:'E4'},
        {k:'linux',n:'Sistem Operasi Linux',e:'E5'},
        {k:'server',n:'Konfigurasi Layanan Server',e:'E5'}
    ];
    const done = topics.filter(t => progress[t.k] !== undefined);
    const avg = done.length ? Math.round(done.reduce((s,t)=>s+progress[t.k],0)/done.length) : 0;
    const ringColor = avg>=75?'#22c55e':avg>=60?'#f97316':'#ef4444';
    const circumference = 2*Math.PI*60;
    const offset = circumference - (avg/100)*circumference;
    const tkjCard = `
    <div class="card">
        ${sectionHead('fa-chart-line','Progress Belajar Konsentrasi TKJ','sh-green')}
        <div style="text-align:center;margin:20px 0">
            <div class="score-ring-wrap" style="margin-bottom:16px">
                <svg class="score-ring-svg" width="140" height="140" viewBox="0 0 140 140">
                    <circle class="score-ring-bg" cx="70" cy="70" r="60"/>
                    <circle class="score-ring-fg" cx="70" cy="70" r="60" stroke="${ringColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
                </svg>
                <div class="score-ring-text"><span class="score-ring-num" style="color:${ringColor}">${avg || '—'}</span><span class="score-ring-pct">${avg ? 'rata-rata' : 'Belum ada'}</span></div>
            </div>
            <p style="color:var(--slate-500)">${done.length}/15 asesmen Konsentrasi TKJ dikerjakan</p>
            <p style="font-weight:700;color:${ringColor}">${avg>=75?'🎉 KKM 75 Tercapai!':avg>0?'📚 Terus belajar, target KKM 75':''}</p>
        </div>
        ${topics.map(t=>{
            const s=progress[t.k];
            const c=s>=75?'var(--green-500)':s>=60?'var(--orange-500)':s>0?'var(--red-500)':'transparent';
            const tc=s>=75?'var(--green-600)':s>=60?'var(--orange-600)':s>0?'var(--red-600)':'var(--text-4)';
            return `<div class="prog-item"><div class="prog-row"><span class="prog-name"><span class="mc-badge" style="font-size:0.65rem;margin-right:6px">${t.e}</span>${t.n}</span><span class="prog-score" style="color:${tc}">${s!==undefined?s+'%':'—'}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${s||0}%;background:${c}"></div></div>${s!==undefined?`<div style="font-size:0.75rem;color:var(--slate-400);margin-top:4px">${s>=75?'✅ Lulus KKM':s>=60?'⚠️ Perlu ditingkatkan':'❌ Perlu belajar ulang'}</div>`:''}</div>`;
        }).join('')}
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
            <button class="btn-primary" onclick="showPage('home')"><i class="fas fa-home"></i> Beranda TKJ</button>
            <button class="btn-ghost" onclick="if(confirm('Reset semua progress asesmen?')){localStorage.removeItem('tjkt_progress');progress={};showPage('progress');}"><i class="fas fa-redo"></i> Reset Progress</button>
        </div>
    </div>`;
    return currentTrack === 'fo' ? `${foProgressCard()}${tkjCard}` : `${tkjCard}${foProgressCard()}`;
}

// Kartu progres jalur Fiber Optik (7 asesmen TP + komprehensif)
function foProgressCard() {
    const done = safeGetJSON('tjkt_fo_done');
    const rows = FO_TP.map(t => ({ k:'fo_' + t.id, n:`${t.code} — ${t.title}`, done:!!done[t.id] }));
    const scores = rows.map(r => progress[r.k]).filter(s => s !== undefined);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const comp = progress['fiber'];
    return `
    <div class="card" style="margin-top:16px">
        ${sectionHead('fa-bolt', 'Progress Jalur Fiber Optik', 'sh-amber')}
        <p style="color:var(--text-2);font-size:.88rem;margin:6px 0 14px">${scores.length ? `Rata-rata ${avg}% dari ${scores.length} asesmen TP.` : 'Belum ada asesmen TP yang dikerjakan.'} ${Object.values(done).filter(Boolean).length}/7 modul ditandai selesai.</p>
        ${rows.map(r => {
            const s = progress[r.k];
            const c = s >= 75 ? 'var(--green-500)' : s >= 60 ? 'var(--orange-500)' : s > 0 ? 'var(--red-500)' : 'transparent';
            const tc = s >= 75 ? 'var(--green-600)' : s >= 60 ? 'var(--orange-600)' : s > 0 ? 'var(--red-600)' : 'var(--text-4)';
            return `<div class="prog-item"><div class="prog-row"><span class="prog-name"><span class="mc-badge" style="font-size:0.65rem;margin-right:6px">FO</span>${r.n}</span><span class="prog-score" style="color:${tc}">${s !== undefined ? s + '%' : '—'}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${s || 0}%;background:${c}"></div></div>${r.done ? '<div style="font-size:0.75rem;color:var(--green-600);margin-top:4px">✅ Modul ditandai selesai</div>' : ''}</div>`;
        }).join('')}
        <div class="prog-item"><div class="prog-row"><span class="prog-name"><span class="mc-badge" style="font-size:0.65rem;margin-right:6px">FO</span>Asesmen Komprehensif</span><span class="prog-score" style="color:${comp !== undefined ? 'var(--text-2)' : 'var(--text-4)'}">${comp !== undefined ? comp + '%' : '—'}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${comp || 0}%;background:var(--brand)"></div></div></div>
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
            <button class="btn-primary" onclick="showPage('fiberOptik')"><i class="fas fa-bolt"></i> Beranda Fiber Optik</button>
            <button class="btn-ghost" onclick="showAssessment('fiber')"><i class="fas fa-tasks"></i> Asesmen Komprehensif</button>
        </div>
    </div>`;
}


// ============================================================
// ASSESSMENT DATA (20 soal per topik)
// ============================================================
const assessments = {
    topologi:[
        {q:"Topologi yang menggunakan switch/hub sebagai perangkat pusat adalah...",opts:["Bus","Star","Ring","Mesh"],ans:1,exp:"Topologi Star: semua perangkat terhubung langsung ke switch/hub di tengah. Fault isolation baik."},
        {q:"Jika satu kabel pada topologi Bus putus, akibatnya...",opts:["Hanya perangkat itu yang mati","Seluruh jaringan lumpuh","Hanya perangkat di sebelahnya","Tidak ada pengaruh"],ans:1,exp:"Bus menggunakan kabel backbone tunggal. Satu titik putus = seluruh jaringan tidak bisa berkomunikasi."},
        {q:"Topologi yang paling tahan terhadap kegagalan karena setiap node terhubung ke semua node lain adalah...",opts:["Star","Tree","Mesh","Bus"],ans:2,exp:"Full Mesh: setiap perangkat terhubung ke semua perangkat lain = banyak jalur redundan."},
        {q:"Topologi Ring mengirimkan data secara...",opts:["Dua arah bersamaan","Satu arah (unidirectional)","Broadcast ke semua","Acak sesuai kebutuhan"],ans:1,exp:"Data pada Ring mengalir searah (unidirectional) melalui cincin tertutup dari satu node ke node berikutnya."},
        {q:"Arsitektur Three-Tier terdiri dari layer...",opts:["Core, Distribution, Access","Physical, Logical, Virtual","LAN, MAN, WAN","Router, Switch, Hub"],ans:0,exp:"Three-Tier: Core (backbone cepat), Distribution (routing/policy antar VLAN), Access (koneksi end-device)."},
        {q:"Topologi Hybrid menggabungkan...",opts:["Hanya Star dan Bus","Dua atau lebih topologi berbeda","Hanya topologi nirkabel","Ring dan Mesh saja"],ans:1,exp:"Hybrid adalah kombinasi 2 atau lebih topologi, memberikan fleksibilitas dan skalabilitas."},
        {q:"Kelemahan utama topologi Star adalah...",opts:["Harga kabel mahal","Bergantung pada perangkat pusat (switch/hub)","Data hanya satu arah","Tidak mendukung banyak user"],ans:1,exp:"Jika switch/hub pusat rusak, semua perangkat yang terhubung ke sana akan offline sekaligus."},
        {q:"Topologi yang cocok untuk jaringan enterprise besar dengan struktur hierarkis adalah...",opts:["Bus","Ring","Mesh","Tree/Hybrid"],ans:3,exp:"Tree atau Hybrid cocok untuk enterprise besar karena skalabel, modular, dan mudah di-troubleshoot per segmen."},
        {q:"Berapa jumlah link minimum untuk full mesh dengan 4 node?",opts:["4","6","8","12"],ans:1,exp:"Full mesh: n(n-1)/2 = 4×3/2 = 6 link. Setiap node terhubung ke semua node lainnya."},
        {q:"Standar IEEE untuk jaringan LAN Ethernet kabel adalah...",opts:["IEEE 802.3","IEEE 802.11","IEEE 802.1Q","IEEE 802.1X"],ans:0,exp:"802.3 = Ethernet (LAN kabel). 802.11 = WiFi. 802.1Q = VLAN tagging. 802.1X = autentikasi port."},
        {q:"Perangkat yang bertugas menghubungkan dua jaringan berbeda (LAN ke internet) adalah...",opts:["Switch","Hub","Router","Access Point"],ans:2,exp:"Router beroperasi di Layer 3 dan tugasnya meneruskan paket antar jaringan berbeda berdasarkan IP address."},
        {q:"Dalam arsitektur client-server, yang menyediakan layanan adalah...",opts:["Client","Router","Server","Switch"],ans:2,exp:"Dalam model client-server, server menyediakan layanan (file, web, email) dan client yang mengaksesnya."},
        {q:"Topologi Bus tidak cocok untuk jaringan besar karena...",opts:["Terlalu mahal","Satu backbone untuk semua = bottleneck dan tidak skalabel","Data terlalu lambat","Tidak mendukung TCP/IP"],ans:1,exp:"Bus menggunakan satu kabel bersama — semakin banyak device, semakin besar tabrakan data (collision)."},
        {q:"Logical topology berbeda dari physical topology dalam hal...",opts:["Harga perangkat","Cara data mengalir vs tata letak fisik kabel","Kecepatan jaringan","Jumlah perangkat"],ans:1,exp:"Physical = susunan fisik kabel/perangkat. Logical = alur data sebenarnya (bisa berbeda dari fisik)."},
        {q:"Perangkat layer 2 yang meneruskan frame berdasarkan MAC address adalah...",opts:["Router","Hub","Switch","Modem"],ans:2,exp:"Switch beroperasi di Layer 2 (Data Link), menggunakan MAC address table untuk meneruskan frame ke port yang tepat."},
        {q:"Jaringan yang mencakup area seluruh kota disebut...",opts:["LAN","WAN","MAN","PAN"],ans:2,exp:"MAN (Metropolitan Area Network) = kota. LAN = lokal (gedung/rumah). WAN = antar kota/negara. PAN = personal."},
        {q:"Dokumentasi yang harus dibuat setelah merancang topologi mencakup...",opts:["Harga perangkat saja","Jadwal penggunaan jaringan","Diagram topologi, IP address, nama perangkat, jenis kabel","Daftar user jaringan"],ans:2,exp:"Dokumentasi lengkap: network diagram, IP table, inventaris perangkat, konfigurasi baseline."},
        {q:"Kelebihan utama topologi Star dibanding Bus adalah...",opts:["Lebih murah","Fault isolation — kerusakan satu tidak ganggu lain","Tidak butuh switch","Data lebih cepat"],ans:1,exp:"Di Star, jika satu kabel/perangkat rusak, hanya itu yang offline. Tidak mempengaruhi perangkat lain."},
        {q:"Model peer-to-peer berbeda dari client-server karena...",opts:["P2P lebih cepat","P2P: semua node peran sama, tidak ada server khusus","P2P lebih aman","P2P hanya untuk internet"],ans:1,exp:"P2P: setiap node bisa jadi client sekaligus server. Tidak butuh server terpusat."},
        {q:"Langkah pertama dalam merencanakan jaringan adalah...",opts:["Membeli perangkat","Konfigurasi switch","Identifikasi kebutuhan pengguna","Instalasi kabel"],ans:2,exp:"Tahap pertama selalu analisis kebutuhan: tujuan jaringan, jumlah user, aplikasi, anggaran, keamanan."},
        {type:"multi",q:"Manakah pernyataan yang BENAR tentang topologi Star?",opts:["Semua perangkat terhubung ke switch/hub pusat","Jika switch pusat rusak, seluruh jaringan bisa lumpuh","Fault isolation lebih baik dibanding topologi Bus","Tidak membutuhkan kabel sama sekali","Biaya kabel paling murah di antara semua topologi"],ans:[0,1,2],exp:"Star berpusat pada switch/hub: fault isolation baik, tetapi perangkat pusat menjadi titik lemah. Star justru butuh lebih banyak kabel dan bukan yang termurah."},
        {type:"multi",q:"Manakah yang merupakan kelebihan topologi Mesh?",opts:["Tersedia banyak jalur alternatif (redundan)","Tidak ada single point of failure","Biaya pemasangan sangat murah","Tidak membutuhkan port tambahan","Membutuhkan banyak kabel dan port"],ans:[0,1,4],exp:"Mesh unggul karena redundansi dan tidak ada single point of failure, tetapi konsekuensinya butuh banyak kabel/port sehingga mahal dan kompleks."},
        {type:"multi",q:"Ciri-ciri topologi Bus adalah...",opts:["Menggunakan satu kabel backbone bersama","Data dapat didengar oleh semua node di backbone","Satu kabel putus dapat melumpuhkan seluruh jaringan","Setiap node memiliki kabel sendiri menuju perangkat pusat","Rentan terhadap collision saat trafik padat"],ans:[0,1,2,4],exp:"Bus memakai backbone tunggal, bersifat broadcast, rentan collision, dan satu titik putus melumpuhkan jaringan. Opsi 'kabel sendiri ke pusat' adalah ciri Star."},
        {type:"multi",q:"Perangkat berikut yang bekerja pada Layer 2 (Data Link) adalah...",opts:["Switch","Bridge","NIC (Network Interface Card)","Router","Hub"],ans:[0,1,2],exp:"Switch, bridge, dan NIC bekerja di Layer 2 menggunakan MAC address. Router bekerja di Layer 3, sedangkan hub bekerja di Layer 1 (physical)."},
        {type:"multi",q:"Model arsitektur Three-Tier terdiri dari layer...",opts:["Core Layer","Distribution Layer","Access Layer","Physical Layer","Session Layer"],ans:[0,1,2],exp:"Three-Tier: Core (backbone cepat), Distribution (routing & policy), Access (koneksi end-device). Physical dan Session bukan bagian model ini."},
    ],
    ip:[
        {q:"IPv4 terdiri dari berapa bit?",opts:["16 bit","32 bit","48 bit","128 bit"],ans:1,exp:"IPv4 = 32 bit dibagi menjadi 4 oktet (8 bit masing-masing), dinotasikan dalam desimal dipisah titik."},
        {q:"IP address 192.168.1.1 termasuk kelas...",opts:["A","B","C","D"],ans:2,exp:"Kelas C: 192.0.0.0 – 223.255.255.255. 192.168.1.1 ada di range ini."},
        {q:"Alamat 127.0.0.1 digunakan untuk...",opts:["Default gateway","Broadcast","Loopback/localhost","Multicast"],ans:2,exp:"127.0.0.1 = loopback address (localhost). Digunakan untuk test jaringan pada perangkat sendiri tanpa keluar jaringan."},
        {q:"Subnet mask 255.255.255.0 dalam notasi CIDR adalah...",opts:["/8","/16","/24","/32"],ans:2,exp:"255.255.255.0 = 24 bit bernilai 1 berturutan, sehingga CIDR-nya /24."},
        {q:"Berapa host yang bisa digunakan dalam subnet /26?",opts:["30","62","126","254"],ans:1,exp:"/26 → bit host = 32-26=6. Host usable = 2^6 - 2 = 64 - 2 = 62 host."},
        {q:"Manakah yang termasuk IP private kelas B?",opts:["10.0.0.1","172.20.5.1","192.168.1.1","203.0.113.1"],ans:1,exp:"IP private kelas B: 172.16.0.0 – 172.31.255.255. 172.20.5.1 berada dalam range ini."},
        {q:"Broadcast address untuk subnet 192.168.10.0/24 adalah...",opts:["192.168.10.0","192.168.10.1","192.168.10.254","192.168.10.255"],ans:3,exp:"Broadcast = alamat terakhir subnet. Untuk /24: semua bit host = 1 → 192.168.10.255."},
        {q:"CIDR singkatan dari...",opts:["Classful Internet Domain Routing","Classless Inter-Domain Routing","Classified IP Domain Routing","Circuit Internet Domain Routing"],ans:1,exp:"CIDR = Classless Inter-Domain Routing — pengalamatan IP fleksibel tanpa batasan kelas A/B/C."},
        {q:"Berapa total host untuk jaringan 10.0.0.0/8?",opts:["254","65.534","16.777.214","4.294.967.294"],ans:2,exp:"/8 → host bits = 24. Total host usable = 2^24 - 2 = 16.777.214."},
        {q:"VLSM berbeda dari subnetting biasa karena...",opts:["Menggunakan IPv6","Menggunakan subnet mask berbeda-beda untuk tiap subnet","Tidak menggunakan mask","Hanya untuk kelas A"],ans:1,exp:"VLSM (Variable Length Subnet Mask): setiap subnet bisa pakai prefix berbeda sesuai kebutuhan host."},
        {q:"Alamat 169.254.x.x otomatis ditetapkan ketika...",opts:["IP statis dikonfigurasi","DHCP server tidak ditemukan (APIPA)","Koneksi internet aktif","VPN terhubung"],ans:1,exp:"APIPA: Windows otomatis assigns 169.254.0.0/16 jika DHCP server tidak merespons."},
        {q:"Default route dalam routing table ditulis sebagai...",opts:["192.168.0.0/0","0.0.0.0/0","255.255.255.255/32","10.0.0.0/8"],ans:1,exp:"0.0.0.0/0 adalah default route — mencocokkan semua tujuan yang tidak ada rute spesifiknya."},
        {q:"Untuk subnet 192.168.1.0/27, berapa jumlah subnet dari /24?",opts:["2","4","8","16"],ans:2,exp:"Dari /24 ke /27: ada 3 bit tambahan dipinjam. 2^3 = 8 subnet."},
        {q:"Kelas A pada sistem classful menggunakan berapa oktet untuk Network ID?",opts:["1 oktet","2 oktet","3 oktet","4 oktet"],ans:0,exp:"Kelas A: 1 oktet pertama = Network ID, 3 oktet terakhir = Host ID. Default mask /8."},
        {q:"Wildcard mask untuk /24 adalah...",opts:["255.255.255.0","0.0.0.255","0.255.255.255","255.0.0.0"],ans:1,exp:"Wildcard = kebalikan subnet mask. /24 = 255.255.255.0 → wildcard = 0.0.0.255."},
        {q:"Block size untuk prefix /27 adalah...",opts:["16","32","64","128"],ans:1,exp:"Block size = 2^(32-prefix) = 2^5 = 32. Setiap subnet /27 berisi 32 alamat."},
        {q:"Kelas IP yang digunakan untuk multicast adalah...",opts:["A","B","C","D"],ans:3,exp:"Kelas D (224.0.0.0 – 239.255.255.255) digunakan untuk komunikasi multicast (one-to-many)."},
        {q:"Host pertama pada jaringan 172.16.0.0/16 adalah...",opts:["172.16.0.0","172.16.0.1","172.16.255.254","172.17.0.0"],ans:1,exp:"Host pertama = Network address + 1 = 172.16.0.0 + 1 = 172.16.0.1."},
        {q:"Dalam VLSM, alokasi subnet dimulai dari...",opts:["Terkecil ke terbesar","Terbesar ke terkecil","Acak","Berurutan alfabet"],ans:1,exp:"VLSM: alokasikan subnet TERBESAR dahulu untuk mencegah tumpang tindih dan pemborosan space."},
        {q:"Subnet /30 berisi berapa total alamat IP?",opts:["2","4","6","8"],ans:1,exp:"/30 → bit host = 2. Total = 2^2 = 4 alamat (network, 2 host, broadcast). Ideal untuk link WAN point-to-point."},
        {type:"multi",q:"Manakah yang termasuk range IP private (RFC 1918)?",opts:["10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","8.8.8.0/24","169.254.0.0/16"],ans:[0,1,2],exp:"IP private: 10.0.0.0/8, 172.16.0.0/12, dan 192.168.0.0/16. 8.8.8.0/24 adalah IP public (Google DNS), 169.254.0.0/16 adalah APIPA."},
        {type:"multi",q:"Manakah alamat IP yang memiliki fungsi khusus?",opts:["127.0.0.1 — loopback/localhost","255.255.255.255 — broadcast terbatas","169.254.x.x — APIPA saat DHCP gagal","192.168.1.1 — IP public","224.0.0.0 — multicast"],ans:[0,1,2,4],exp:"127.0.0.1 loopback, 255.255.255.255 broadcast terbatas, 169.254 APIPA, dan 224.0.0.0 kelas D multicast. 192.168.1.1 adalah IP private, bukan public."},
        {type:"multi",q:"Untuk subnet 192.168.1.0/26, pernyataan yang benar adalah...",opts:["Jumlah host usable per subnet = 62","Subnet mask-nya 255.255.255.192","Block size = 64","Dari /24 terbentuk 4 subnet","Jumlah host usable per subnet = 128"],ans:[0,1,2,3],exp:"/26 meminjam 2 bit dari /24: 4 subnet, block size 64, mask 255.255.255.192, host usable 2^6−2 = 62."},
        {type:"multi",q:"Pasangan prefix CIDR dan subnet mask berikut yang BENAR adalah...",opts:["/24 = 255.255.255.0","/16 = 255.255.0.0","/26 = 255.255.255.192","/30 = 255.255.255.252","/8 = 255.255.0.0"],ans:[0,1,2,3],exp:"/8 = 255.0.0.0, bukan 255.255.0.0. Pasangan /24, /16, /26, dan /30 pada opsi A–D benar."},
        {type:"multi",q:"Prinsip VLSM yang benar adalah...",opts:["Setiap subnet boleh memakai mask berbeda","Alokasi dimulai dari kebutuhan host terbesar","Menghemat alamat IP yang tidak terpakai","Hanya dapat digunakan pada IPv6","Semua subnet wajib memakai mask yang sama"],ans:[0,1,2],exp:"VLSM memakai mask berbeda per subnet, dialokasikan dari kebutuhan terbesar ke terkecil, dan bertujuan menghemat alamat. VLSM justru umum di IPv4."},
    ],
    vlan:[
        {q:"VLAN adalah singkatan dari...",opts:["Virtual LAN","Virtual Local Area Network","Variable LAN","Virtual Link Access Network"],ans:1,exp:"VLAN = Virtual Local Area Network. Segmentasi jaringan logis pada infrastruktur fisik yang sama."},
        {q:"Standar IEEE untuk VLAN tagging pada frame Ethernet adalah...",opts:["IEEE 802.3","IEEE 802.11","IEEE 802.1Q","IEEE 802.1X"],ans:2,exp:"IEEE 802.1Q mendefinisikan standar VLAN tagging — menambahkan tag 4 byte ke frame Ethernet."},
        {q:"Access port adalah port yang...",opts:["Membawa banyak VLAN","Membawa traffic satu VLAN saja tanpa tag","Terhubung ke switch lain","Untuk manajemen switch"],ans:1,exp:"Access port: membawa satu VLAN, frame tidak di-tag. Terhubung langsung ke end-device."},
        {q:"Trunk port digunakan untuk...",opts:["Menghubungkan PC ke switch","Membawa traffic dari banyak VLAN sekaligus (tagged)","Koneksi internet","Hanya VLAN manajemen"],ans:1,exp:"Trunk port membawa multiple VLAN via frame yang di-tag dengan 802.1Q. Umumnya antar switch atau switch-router."},
        {q:"Range VLAN ID yang valid pada 802.1Q adalah...",opts:["0-255","1-1024","1-4094","0-65535"],ans:2,exp:"802.1Q menggunakan 12-bit VLAN ID → range valid 1–4094. VLAN 1 = default, 1002-1005 = reserved."},
        {q:"Perintah Cisco untuk membuat VLAN dengan ID 10 adalah...",opts:["vlan create 10","vlan 10","create vlan 10","set vlan 10"],ans:1,exp:"Di Cisco IOS, masuk global config lalu ketik 'vlan 10' untuk masuk ke mode konfigurasi VLAN."},
        {q:"Native VLAN pada trunk port adalah...",opts:["VLAN yang diblokir","VLAN yang frame-nya tidak di-tag (untagged) di trunk link","VLAN untuk manajemen saja","Selalu VLAN 10"],ans:1,exp:"Native VLAN = VLAN yang frame-nya dikirim tanpa tag 802.1Q di trunk link. Default = VLAN 1."},
        {q:"Untuk komunikasi antar VLAN yang berbeda dibutuhkan...",opts:["Switch unmanaged","Router atau Layer 3 Switch","Kabel crossover","DHCP server"],ans:1,exp:"VLAN berbeda = broadcast domain berbeda. Komunikasi antar VLAN butuh routing (router atau L3 switch)."},
        {q:"Manfaat utama VLAN dalam konteks keamanan adalah...",opts:["Mempercepat internet","Mengisolasi broadcast domain dan segmentasi lalu lintas","Mengurangi biaya kabel","Meningkatkan kecepatan WiFi"],ans:1,exp:"VLAN mengisolasi traffic — jika VLAN 10 (Guru) tidak bisa akses VLAN 20 (Siswa), keamanan meningkat."},
        {q:"'switchport mode access' berfungsi untuk...",opts:["Menjadikan port sebagai trunk","Menjadikan port access (satu VLAN, untagged)","Menghapus konfigurasi VLAN","Mengaktifkan STP"],ans:1,exp:"switchport mode access = port hanya membawa satu VLAN dalam mode access, frame tidak di-tag."},
        {q:"Perintah untuk melihat daftar VLAN di Cisco Switch...",opts:["show vlan brief","display vlan","get vlan list","view vlan all"],ans:0,exp:"'show vlan brief' menampilkan semua VLAN yang ada beserta port yang tergabung dalam masing-masing VLAN."},
        {q:"SVI (Switch Virtual Interface) digunakan untuk...",opts:["Backup koneksi","IP manajemen switch atau gateway untuk inter-VLAN routing di L3 switch","Load balancing","DHCP relay"],ans:1,exp:"SVI adalah interface logis VLAN yang diberi IP address. Digunakan untuk manajemen switch atau inter-VLAN routing."},
        {q:"Switch yang mendukung VLAN dan konfigurasi disebut...",opts:["Unmanaged switch","Passive switch","Managed switch","Layer 1 switch"],ans:2,exp:"Managed switch bisa dikonfigurasi: VLAN, STP, QoS, port mirroring, LACP, dll. Unmanaged = plug-and-play saja."},
        {q:"Tag 802.1Q yang ditambahkan ke frame Ethernet berukuran...",opts:["1 byte","2 byte","4 byte","8 byte"],ans:2,exp:"Tag 802.1Q = 4 byte: 2 byte TPID (0x8100) + 3 bit PCP + 1 bit DEI + 12 bit VLAN ID."},
        {q:"Serangan VLAN Hopping memungkinkan penyerang...",opts:["Mempercepat jaringan","Mengakses VLAN lain yang tidak diizinkan","Menambah user baru","Backup konfigurasi switch"],ans:1,exp:"VLAN Hopping: eksploitasi konfigurasi DTP/native VLAN yang lemah untuk lompat ke VLAN yang tidak seharusnya bisa diakses."},
        {q:"Cara mencegah VLAN Hopping adalah...",opts:["Tidak menggunakan VLAN","Ubah Native VLAN dari 1 ke VLAN tidak terpakai, matikan DTP","Matikan semua trunk port","Gunakan hub saja"],ans:1,exp:"Ubah Native VLAN, matikan DTP (switchport nonegotiate), dan matikan port yang tidak digunakan."},
        {q:"Layer 3 Switch dapat routing antar VLAN tanpa router terpisah karena...",opts:["Lebih banyak port","Mendukung IP routing di hardware (ASIC)","Harganya lebih mahal","Menggunakan fiber optic"],ans:1,exp:"L3 Switch memiliki kemampuan routing di ASIC hardware, jauh lebih cepat dari Router-on-a-Stick."},
        {q:"Router-on-a-Stick menggunakan...",opts:["Beberapa interface fisik","Sub-interface pada satu interface fisik via trunk","VLAN Management saja","Dua router terpisah"],ans:1,exp:"Router-on-a-Stick: satu port fisik dibagi banyak sub-interface (satu per VLAN) via encapsulation dot1Q."},
        {q:"Konfigurasi 'switchport trunk allowed vlan 10,20,30' berarti...",opts:["Semua VLAN diizinkan","Hanya VLAN 10, 20, 30 yang diizinkan lewat trunk","VLAN 10, 20, 30 diblokir","Port menjadi access port"],ans:1,exp:"Membatasi VLAN yang boleh melewati trunk port hanya 10, 20, dan 30. VLAN lain tidak akan diteruskan."},
        {q:"Apa yang terjadi jika dua perangkat di VLAN berbeda mencoba berkomunikasi langsung?",opts:["Komunikasi normal","Komunikasi tidak bisa terjadi tanpa router/L3 switch","Sangat lambat","Hanya satu arah"],ans:1,exp:"VLAN berbeda = broadcast domain berbeda. Layer 2 tidak bisa meneruskan traffic antar VLAN tanpa routing."},
        {type:"multi",q:"Manfaat penggunaan VLAN adalah...",opts:["Membagi broadcast domain","Meningkatkan keamanan antar departemen","Memudahkan perubahan tanpa mengubah kabel fisik","Menambah kapasitas bandwidth kabel","Menghilangkan kebutuhan switch"],ans:[0,1,2],exp:"VLAN memecah broadcast domain, memisahkan departemen secara logis, dan fleksibel. VLAN tidak menambah bandwidth fisik maupun menghilangkan switch."},
        {type:"multi",q:"Pernyataan yang benar tentang trunk port adalah...",opts:["Membawa lalu lintas banyak VLAN","Menggunakan tagging IEEE 802.1Q","Native VLAN dikirim tanpa tag","Hanya boleh membawa satu VLAN","Wajib dipasang pada port menuju end device"],ans:[0,1,2],exp:"Trunk membawa banyak VLAN dengan tag 802.1Q; native VLAN tidak diberi tag. Port ke end device umumnya access port, bukan trunk."},
        {type:"multi",q:"Metode inter-VLAN routing yang umum adalah...",opts:["Router-on-a-stick (sub-interface)","SVI pada Layer 3 switch","Satu access port per VLAN di router","Menggabungkan semua VLAN menjadi satu","Menggunakan hub di antara VLAN"],ans:[0,1,2],exp:"Inter-VLAN routing dapat memakai router-on-a-stick, SVI di L3 switch, atau satu interface fisik router per VLAN. Menggabungkan VLAN justru menghapus segmentasi."},
        {type:"multi",q:"Ciri access port pada switch Cisco adalah...",opts:["Termasuk dalam satu VLAN","Biasanya dihubungkan ke PC/printer","Frame dikirim tanpa tag VLAN","Membawa semua VLAN","Digunakan untuk uplink antar switch"],ans:[0,1,2],exp:"Access port milik satu VLAN, menuju end device, dan frame keluar tanpa tag. Uplink antar switch umumnya trunk."},
        {type:"multi",q:"Perintah Cisco IOS yang berkaitan dengan konfigurasi VLAN adalah...",opts:["vlan 10","name GURU","switchport access vlan 10","ip route 0.0.0.0 0.0.0.0","router ospf 1"],ans:[0,1,2],exp:"vlan 10, name GURU, dan switchport access vlan 10 membentuk konfigurasi VLAN. Dua opsi terakhir adalah konfigurasi routing."},
    ],
    routing:[
        {q:"Routing adalah proses...",opts:["Membuat kabel jaringan","Memilih jalur terbaik untuk meneruskan paket antar jaringan","Mengkonfigurasi VLAN","Menghubungkan WiFi"],ans:1,exp:"Routing = keputusan jalur terbaik yang dibuat router untuk meneruskan paket dari satu jaringan ke jaringan lain."},
        {q:"Tanda 'C' dalam routing table Cisco berarti...",opts:["CIDR route","Connected (langsung terhubung)","Custom route","Cached route"],ans:1,exp:"C = Connected. Rute yang langsung terhubung ke interface router tanpa perlu konfigurasi apapun."},
        {q:"Syntax konfigurasi routing statis Cisco yang benar adalah...",opts:["route add 10.0.0.0 mask 255.0.0.0 10.1.1.1","ip route 10.0.0.0 255.0.0.0 10.1.1.1","static route 10.0.0.0/8","add route 10.0.0.0"],ans:1,exp:"Syntax Cisco: ip route [network_tujuan] [subnet_mask] [next-hop_IP atau interface_keluar]"},
        {q:"Default route dikonfigurasi dengan...",opts:["ip route default","ip route 0.0.0.0 0.0.0.0 [gateway]","ip default-route [gateway]","route 0.0.0.0"],ans:1,exp:"ip route 0.0.0.0 0.0.0.0 [gateway] = default route. Semua traffic yang tidak ada rute spesifiknya dikirim ke gateway ini."},
        {q:"Protokol routing yang menggunakan hop count sebagai metrik (maks 15) adalah...",opts:["OSPF","BGP","RIP","EIGRP"],ans:2,exp:"RIP menggunakan hop count sebagai metrik. Maksimum 15 hop — lebih dari itu dianggap unreachable (16 = tak terhingga)."},
        {q:"OSPF menggunakan algoritma... untuk jalur terpendek.",opts:["Bellman-Ford","Dijkstra (SPF)","Floyd-Warshall","Prim"],ans:1,exp:"OSPF = Open Shortest Path First, menggunakan algoritma Dijkstra (SPF) untuk menghitung rute optimal."},
        {q:"Perbedaan routing statis vs dinamis...",opts:["Statis lebih cepat proses paket","Dinamis otomatis update tabel routing saat topologi berubah","Statis lebih aman","Dinamis tidak butuh konfigurasi apapun"],ans:1,exp:"Dinamis: protokol routing bertukar info antar router, tabel routing diupdate otomatis. Statis: manual oleh admin."},
        {q:"Protokol routing antar Autonomous System di internet adalah...",opts:["RIP","OSPF","EIGRP","BGP"],ans:3,exp:"BGP (Border Gateway Protocol) = satu-satunya EGP yang digunakan di internet untuk routing antar AS."},
        {q:"Metrik yang digunakan OSPF adalah...",opts:["Hop count","Cost (berdasarkan bandwidth)","Delay saja","Jarak fisik"],ans:1,exp:"OSPF cost = 10^8 / bandwidth (bps). Link 100 Mbps = cost 1, 10 Mbps = cost 10. Link bandwidth tinggi = cost rendah."},
        {q:"RIPv2 berbeda dari RIPv1 dalam hal...",opts:["Metrik berbeda","Mendukung VLSM/CIDR dan autentikasi MD5","Kecepatan konvergensi sama","Tidak ada perbedaan"],ans:1,exp:"RIPv2 menambahkan: VLSM/CIDR support (classless), autentikasi, multicast update (224.0.0.9 vs broadcast)."},
        {q:"EIGRP dikembangkan oleh...",opts:["Juniper","HP","Cisco (proprietary)","IETF (open standard)"],ans:2,exp:"EIGRP = Enhanced Interior Gateway Routing Protocol, dikembangkan Cisco. Tersedia versi terbuka sejak 2013."},
        {q:"Tipe routing protokol yang membangun peta topologi lengkap adalah...",opts:["Distance Vector","Path Vector","Link State","Hybrid"],ans:2,exp:"Link State (OSPF, IS-IS) membangun LSDB (Link State Database) = peta topologi lengkap seluruh area."},
        {q:"Administrative Distance (AD) routing statis di Cisco adalah...",opts:["0","1","110","120"],ans:1,exp:"AD: Connected=0, Static=1, OSPF=110, RIP=120. AD lebih rendah = sumber routing lebih dipercaya."},
        {q:"Perintah untuk melihat routing table di Cisco...",opts:["show ip tables","display routing","show ip route","get routes"],ans:2,exp:"'show ip route' menampilkan isi routing table lengkap dengan sumber rute dan metrik."},
        {q:"Routing loop dicegah dengan...",opts:["Menambah lebih banyak router","Split horizon, route poisoning, hold-down timer","Kabel lebih cepat","Lebih banyak VLAN"],ans:1,exp:"Mekanisme anti-loop pada Distance Vector: split horizon (tidak kirim info balik arah datang), route poisoning, hold-down timer."},
        {q:"OSPF area 0 disebut...",opts:["Default area","Backbone area","Stub area","NSSA area"],ans:1,exp:"OSPF Area 0 = backbone area. Semua area OSPF lain HARUS terhubung ke Area 0 (langsung atau via virtual link)."},
        {q:"Protokol yang termasuk IGP (Interior Gateway Protocol) adalah...",opts:["BGP saja","RIP, OSPF, EIGRP","BGP dan OSPF","Hanya BGP dan RIP"],ans:1,exp:"IGP = routing dalam satu AS: RIP, OSPF, EIGRP, IS-IS. EGP = antar AS: BGP."},
        {q:"Floating static route menggunakan AD yang lebih tinggi agar...",opts:["Lebih cepat","Hanya digunakan sebagai backup jika rute utama gagal","Lebih aman","Lebih mudah dikonfigurasi"],ans:1,exp:"Floating static route: AD lebih tinggi dari rute utama. Hanya masuk routing table jika rute utama hilang."},
        {q:"Perintah untuk mengaktifkan OSPF dan mendaftarkan network di Cisco...",opts:["ospf enable network","router ospf 1 + network x.x.x.x x.x.x.x area 0","enable ospf","ip ospf enable"],ans:1,exp:"'router ospf [process-id]' lalu 'network [IP] [wildcard] area [area-id]' untuk mendaftarkan network ke OSPF."},
        {q:"Konvergensi routing berarti...",opts:["Semua router kecepatan sama","Semua router memiliki tabel routing yang konsisten dan up-to-date","Semua router terhubung internet","Jumlah router sama"],ans:1,exp:"Konvergensi = kondisi di mana semua router punya informasi routing yang sama dan konsisten setelah perubahan topologi."},
        {type:"multi",q:"Ciri-ciri routing statis adalah...",opts:["Rute dikonfigurasi manual oleh admin","Tidak ada pertukaran informasi rute antar router","Cocok untuk jaringan kecil dan sederhana","Otomatis failover saat link putus","Wajib menggunakan protokol OSPF"],ans:[0,1,2],exp:"Routing statis dikonfigurasi manual, tanpa pertukaran rute, dan cocok untuk jaringan kecil. Failover otomatis adalah keunggulan routing dinamis."},
        {type:"multi",q:"Pernyataan yang benar tentang OSPF adalah...",opts:["Termasuk protokol Link State","Menggunakan algoritma Dijkstra (SPF)","Metriknya cost berdasarkan bandwidth","Termasuk Distance Vector","Maksimal 15 hop"],ans:[0,1,2],exp:"OSPF adalah Link State dengan algoritma Dijkstra dan metrik cost. Batas 15 hop adalah karakteristik RIP (Distance Vector)."},
        {type:"multi",q:"Pernyataan yang benar tentang RIP adalah...",opts:["Termasuk protokol Distance Vector","Metriknya hop count","Maksimal 15 hop","Termasuk Link State","Menggunakan algoritma Dijkstra"],ans:[0,1,2],exp:"RIP adalah Distance Vector dengan metrik hop count dan batas 15 hop. Link State + Dijkstra adalah OSPF."},
        {type:"multi",q:"Informasi yang umumnya ada dalam tabel routing adalah...",opts:["Network destination (tujuan)","Next hop (router berikutnya)","Metric dan interface keluar","Warna jaket kabel","Nomor seri perangkat"],ans:[0,1,2],exp:"Tabel routing memuat tujuan, next hop, metrik, dan interface keluar. Warna kabel dan nomor seri tidak termasuk."},
        {type:"multi",q:"Pernyataan yang benar tentang BGP adalah...",opts:["Termasuk Path Vector","Menghubungkan antar Autonomous System (AS)","Digunakan sebagai protokol routing internet","IGP untuk jaringan LAN kecil","Metrik utamanya hop count"],ans:[0,1,2],exp:"BGP adalah Path Vector yang menghubungkan antar AS dan menjadi tulang punggung routing internet. Bukan IGP LAN dan bukan berbasis hop count."},
    ],
    keamanan:[
        {q:"CIA Triad dalam keamanan jaringan terdiri dari...",opts:["Computer, Internet, Access","Confidentiality, Integrity, Availability","Control, Identity, Authentication","Cipher, Integrity, Algorithm"],ans:1,exp:"CIA: Confidentiality (kerahasiaan), Integrity (integritas/keutuhan data), Availability (ketersediaan layanan)."},
        {q:"Malware yang menyebar mandiri melalui jaringan tanpa file induk adalah...",opts:["Virus","Worm","Trojan","Rootkit"],ans:1,exp:"Worm dapat mereplikasi dan menyebar sendiri melalui jaringan — tidak butuh file host atau tindakan pengguna."},
        {q:"DDoS berbeda dari DoS karena...",opts:["DDoS lebih lambat","DDoS menggunakan banyak sumber (botnet) secara bersamaan","DDoS hanya serang lokal","DDoS memakai enkripsi"],ans:1,exp:"DDoS (Distributed): menggunakan ribuan komputer terkompromis (botnet) untuk melancarkan serangan bersamaan."},
        {q:"Phishing menargetkan...",opts:["Kelemahan hardware jaringan","Manusia melalui penipuan (email/website palsu)","Protokol routing","Enkripsi jaringan"],ans:1,exp:"Phishing = social engineering: manipulasi pengguna via email/website palsu untuk mencuri kredensial atau data."},
        {q:"Man-in-the-Middle attack memungkinkan penyerang...",opts:["Mematikan server","Menyadap dan memodifikasi komunikasi antara dua pihak","Mempercepat jaringan","Menambah user baru"],ans:1,exp:"MITM: penyerang posisikan diri di antara dua pihak berkomunikasi — bisa intercept, baca, dan modifikasi data."},
        {q:"Ransomware adalah malware yang...",opts:["Mencuri data diam-diam","Mengenkripsi data dan meminta tebusan untuk kuncinya","Memperlambat komputer","Menampilkan iklan"],ans:1,exp:"Ransomware: enkripsi semua file korban, penyerang minta tebusan (biasanya cryptocurrency) untuk kunci dekripsi."},
        {q:"Perbedaan IDS dan IPS adalah...",opts:["Keduanya sama persis","IDS hanya deteksi & alert, IPS deteksi DAN blokir otomatis","IPS lebih lambat","IDS lebih mahal"],ans:1,exp:"IDS = Intrusion Detection System (pasif, hanya alert). IPS = Intrusion Prevention System (aktif, auto-blokir)."},
        {q:"AAA dalam keamanan jaringan singkatan dari...",opts:["Authentication, Authorization, Accounting","Access, Authority, Audit","Account, Authentication, Action","Authorization, Access, Audit"],ans:0,exp:"AAA: Authentication (siapa kamu?), Authorization (apa yang boleh kamu lakukan?), Accounting (apa yang sudah kamu lakukan?)."},
        {q:"IEEE 802.1X adalah standar untuk...",opts:["VLAN tagging","Port-based Network Access Control — autentikasi sebelum akses jaringan","WiFi encryption","Routing protokol"],ans:1,exp:"802.1X: perangkat harus autentikasi (via EAP dan RADIUS) sebelum diizinkan akses jaringan melalui switch port atau WiFi."},
        {q:"VPN (Virtual Private Network) digunakan untuk...",opts:["Mempercepat internet","Membuat koneksi terenkripsi (tunnel) aman melalui jaringan publik","Mengganti IP address saja","Bypass firewall saja"],ans:1,exp:"VPN membuat tunnel terenkripsi untuk koneksi aman antar jaringan atau remote access ke LAN perusahaan melalui internet."},
        {q:"SQL Injection menyerang...",opts:["Jaringan WiFi","Aplikasi web dengan database SQL tanpa validasi input yang benar","Protokol TCP/IP","Enkripsi SSL"],ans:1,exp:"SQL Injection: memasukkan perintah SQL berbahaya ke form input untuk memanipulasi/membaca database backend."},
        {q:"NGFW (Next-Generation Firewall) berbeda dari firewall biasa karena...",opts:["Lebih murah","Bisa identifikasi aplikasi (Layer 7), user-identity, IPS terintegrasi, SSL inspection","Hanya packet filter","Lebih lambat"],ans:1,exp:"NGFW menggabungkan stateful + application awareness + IPS + SSL inspection + threat intelligence."},
        {q:"Two-Factor Authentication (2FA) menggabungkan...",opts:["Dua password","Something you KNOW + something you HAVE/ARE","Dua username","Password dan IP address"],ans:1,exp:"2FA: faktor 1 = something you know (password), faktor 2 = something you have (OTP/token) atau biometrik."},
        {q:"RADIUS server digunakan untuk...",opts:["Mengatur VLAN","Autentikasi terpusat (AAA) untuk akses jaringan","Routing paket","Konfigurasi DHCP"],ans:1,exp:"RADIUS (Remote Authentication Dial-In User Service): AAA terpusat untuk 802.1X, VPN, WiFi enterprise."},
        {q:"ARP Poisoning digunakan untuk serangan...",opts:["DNS Spoofing","MITM via meracuni cache ARP dengan entri palsu","IP Spoofing","Port Scanning"],ans:1,exp:"ARP Poisoning: kirim ARP reply palsu agar host mengasosiasikan IP gateway dengan MAC penyerang → semua traffic melewati penyerang."},
        {q:"Prinsip Least Privilege berarti...",opts:["Semua user punya akses admin","User hanya diberikan hak akses minimum yang diperlukan tugasnya","Password sesimple mungkin","Firewall tidak diperlukan"],ans:1,exp:"Least Privilege: minimkan hak akses — jika akun dikompromis, dampaknya terbatas. Ini prinsip keamanan fundamental."},
        {q:"Honeypot dalam keamanan jaringan adalah...",opts:["Perangkat percepat jaringan","Sistem umpan yang sengaja dibuat untuk menarik dan mempelajari penyerang","Firewall generasi baru","Metode enkripsi data"],ans:1,exp:"Honeypot = jebakan: sistem yang tampak sebagai target bernilai, digunakan untuk memancing dan mempelajari teknik penyerang."},
        {q:"Zero-day vulnerability adalah...",opts:["Kerentanan yang sudah ada patch-nya","Kerentanan yang belum diketahui vendor dan belum ada patch resmi","Serangan pada hari pertama","Virus baru"],ans:1,exp:"Zero-day: kerentanan yang ditemukan sebelum vendor tahu — belum ada patch. Sangat berbahaya dan berharga di pasar gelap."},
        {q:"Defense in Depth berarti...",opts:["Gunakan satu firewall yang sangat kuat","Terapkan banyak lapisan keamanan berlapis","Pertahanan hanya di perimeter","Enkripsi semua data"],ans:1,exp:"Defense in Depth: banyak lapisan keamanan — jika satu gagal, yang lain masih melindungi. Tidak ada single point of failure."},
        {q:"Protokol email yang digunakan untuk autentikasi domain dan cegah email spoofing adalah...",opts:["SMTP dan POP3","SPF, DKIM, dan DMARC","FTP dan SSH","HTTP dan HTTPS"],ans:1,exp:"SPF (Sender Policy Framework), DKIM (DomainKeys), dan DMARC adalah standar autentikasi email untuk mencegah spoofing dan phishing."},
        {type:"multi",q:"Tiga pilar CIA Triad dalam keamanan informasi adalah...",opts:["Confidentiality","Integrity","Availability","Authentication","Authorization"],ans:[0,1,2],exp:"CIA Triad = Confidentiality, Integrity, Availability. Authentication dan Authorization adalah konsep akses, bukan bagian inti triad."},
        {type:"multi",q:"Pernyataan yang benar tentang IDS dan IPS adalah...",opts:["IDS mendeteksi lalu memberi peringatan","IPS mendeteksi sekaligus memblokir","Snort dan Suricata dapat berjalan sebagai IDS/IPS","IDS menggantikan fungsi firewall sepenuhnya","IPS hanya mencatat log tanpa tindakan"],ans:[0,1,2],exp:"IDS = deteksi + alert, IPS = deteksi + blokir. Snort/Suricata mendukung keduanya. IPS bukan sekadar log dan tidak menggantikan firewall."},
        {type:"multi",q:"Pernyataan yang benar tentang malware adalah...",opts:["Virus membutuhkan file induk untuk menyebar","Worm dapat menyebar sendiri melalui jaringan","Trojan menyamar sebagai software berguna","Ransomware mengenkripsi data dan meminta tebusan","Rootkit hanya menampilkan iklan"],ans:[0,1,2,3],exp:"Virus butuh file induk, worm self-propagating, trojan menyamar, ransomware mengenkripsi data. Rootkit menyembunyikan akses penyerang di level sistem, bukan hanya iklan."},
        {type:"multi",q:"Mitigasi yang tepat terhadap serangan Man-in-the-Middle adalah...",opts:["Menggunakan HTTPS/TLS","Menggunakan VPN","Mengaktifkan Dynamic ARP Inspection (DAI)","Mematikan semua password","Menggunakan WEP"],ans:[0,1,2],exp:"HTTPS/TLS, VPN, dan DAI mencegah/mendeteksi MITM. Mematikan password dan WEP justru melemahkan keamanan."},
        {type:"multi",q:"Komponen autentikasi jaringan yang umum digunakan adalah...",opts:["802.1X","RADIUS","MFA/2FA","SSID","DNS"],ans:[0,1,2],exp:"802.1X (port-based), RADIUS (server AAA), dan MFA adalah komponen autentikasi. SSID adalah nama WiFi, DNS menerjemahkan nama domain."},
    ],
    fiber:[
        {q:"Fiber optic mentransmisikan data dalam bentuk...",opts:["Gelombang radio","Sinyal listrik DC","Pulsa cahaya","Gelombang mikro"],ans:2,exp:"Fiber optic menggunakan pulsa cahaya (photon) yang dipancarkan oleh laser atau LED melalui serat kaca/plastik."},
        {q:"Komponen inti fiber optic tempat cahaya merambat disebut...",opts:["Cladding","Buffer","Core","Jacket"],ans:2,exp:"Core = bagian inti serat optik dengan indeks bias tinggi. Tempat cahaya merambat via Total Internal Reflection."},
        {q:"Prinsip fisika yang memungkinkan cahaya merambat dalam fiber adalah...",opts:["Refraksi total","Total Internal Reflection (TIR)","Difraksi cahaya","Absorpsi cahaya"],ans:1,exp:"TIR: cahaya dipantulkan sempurna kembali ke core (tidak bocor ke cladding) ketika sudut datang melebihi sudut kritis."},
        {q:"Diameter core Single Mode Fiber (SMF) adalah sekitar...",opts:["50 µm","62.5 µm","9 µm","125 µm"],ans:2,exp:"SMF core = ~9 µm (sangat kecil), hanya bisa mentransmisikan satu mode cahaya → dispersion minimal, jarak sangat jauh."},
        {q:"Multi Mode Fiber (MMF) umumnya digunakan untuk...",opts:["Backbone antar kota (100+ km)","Data center dan kampus (hingga 550 m)","Kabel bawah laut","Koneksi satelit"],ans:1,exp:"MMF cocok untuk jarak pendek-menengah: dalam gedung, data center, antar gedung kampus. SMF untuk jarak jauh."},
        {q:"Konektor fiber optic yang paling umum di Indonesia dan berbentuk persegi adalah...",opts:["LC","FC","SC","ST"],ans:2,exp:"SC (Subscriber Connector): push-pull, berbentuk persegi, ferrule 2.5mm, paling umum di Indonesia untuk SMF & MMF."},
        {q:"OTDR digunakan untuk...",opts:["Mengkonversi sinyal optik ke listrik","Mengukur loss, jarak, dan lokasi gangguan pada kabel fiber","Menyambung fiber","Memotong fiber dengan presisi"],ans:1,exp:"OTDR (Optical Time Domain Reflectometer): mengirim pulsa cahaya, analisis pantulan untuk ukur loss dan lokasi gangguan."},
        {q:"Warna jaket kabel Single Mode Fiber standar adalah...",opts:["Orange","Aqua/biru muda","Kuning","Hijau"],ans:2,exp:"SMF = jaket kuning. MMF OM1/OM2 = oranye. MMF OM3/OM4 = aqua/tosca. OM5 = lime green."},
        {q:"Fusion splicer bekerja dengan cara...",opts:["Menggunakan lem optik khusus","Memanaskan dua ujung fiber dengan busur listrik hingga menyatu","Menggunakan sleeve mekanis","Menekan dua ujung fiber"],ans:1,exp:"Fusion splicer: electric arc (busur listrik) memanaskan dan menyatukan dua ujung serat optik dengan loss sangat rendah (tipikal 0,02–0,05 dB; batas Telkom ≤0,10 dB)."},
        {q:"Kelebihan utama fiber optic dibanding kabel tembaga UTP adalah...",opts:["Lebih murah dan mudah dipasang","Bandwidth lebih tinggi, jarak lebih jauh, kebal interferensi elektromagnetik","Lebih berat dan kuat","Mendukung PoE"],ans:1,exp:"Fiber: Tbps bandwidth, 100+ km jarak, kebal EMI. Tapi lebih mahal dan instalasi lebih kompleks dari UTP."},
        {q:"Sumber cahaya pada Single Mode Fiber adalah...",opts:["LED biasa","Laser (semiconductor laser)","Lampu pijar","Neon"],ans:1,exp:"SMF menggunakan laser untuk presisi tinggi dan transmisi jarak jauh. MMF menggunakan LED atau VCSEL (Vertical Cavity Surface Emitting Laser)."},
        {q:"Konektor fiber optic LC lebih disukai di data center modern karena...",opts:["Lebih murah dari SC","Ukuran lebih kecil — kepadatan port lebih tinggi di panel","Lebih kuat dari SC","Lebih mudah dipasang"],ans:1,exp:"LC (Lucent Connector): ferrule 1.25mm vs SC 2.5mm — dua kali lebih kecil, memungkinkan kepadatan port dua kali lebih tinggi."},
        {q:"Atenuasi sinyal pada fiber optic diukur dalam satuan...",opts:["Volt/km","dB/km (decibel per kilometer)","MHz","Watt/m"],ans:1,exp:"Atenuasi = pelemahan sinyal. Diukur dalam dB/km. Semakin kecil = semakin sedikit loss = semakin jauh bisa transmisi."},
        {q:"Cladding pada fiber optic berfungsi untuk...",opts:["Memberi kekuatan tarik","Melindungi dari kelembaban","Memantulkan cahaya kembali ke core via TIR","Memberikan warna identifikasi"],ans:2,exp:"Cladding: indeks bias lebih rendah dari core → menyebabkan Total Internal Reflection → cahaya terpantul kembali ke core."},
        {q:"Mechanical splicing berbeda dari fusion splicing karena...",opts:["Mechanical menggunakan panas","Mechanical menggunakan sleeve mekanis, lebih cepat tapi loss lebih tinggi","Tidak ada perbedaan","Mechanical lebih akurat"],ans:1,exp:"Mechanical splice menggunakan klip/sleeve untuk menahan dua ujung fiber. Lebih cepat dan murah, tapi loss lebih tinggi (~0.5 dB)."},
        {q:"OM3 dan OM4 berbeda dari OM1/OM2 karena...",opts:["Warnanya putih","Laser-optimized (VCSEL), bandwidth lebih tinggi, warna aqua","Lebih tua dan lebih lambat","Diameter lebih kecil"],ans:1,exp:"OM3/OM4: laser-optimized (VCSEL), bandwidth jauh lebih tinggi, jaket aqua. Mendukung 10/40/100GbE jarak lebih jauh."},
        {q:"Fiber optic tidak terpengaruh EMI karena...",opts:["Terbuat dari logam anti-EMI","Menggunakan cahaya bukan sinyal listrik untuk transmisi","Dilapisi perisai khusus","Memiliki grounding"],ans:1,exp:"Cahaya (foton) tidak terpengaruh oleh medan elektromagnetik. Fiber juga aman dari penyadapan (tidak memancarkan EMI)."},
        {q:"Strength member pada kabel fiber optic terbuat dari...",opts:["Aluminium","Tembaga","Kevlar/aramid fiber","Baja"],ans:2,exp:"Strength member terbuat dari Kevlar (aramid) — serat sintetis sangat kuat — melindungi serat optik dari tarikan berlebihan."},
        {q:"Alat untuk memotong ujung fiber optic dengan presisi sempurna adalah...",opts:["Gunting biasa","Fiber cleaver (pemotong presisi)","Tang potong","Cutter box"],ans:1,exp:"Fiber cleaver memotong serat optik secara tegak lurus sempurna. Pemotongan yang tidak rata akan menyebabkan splice loss tinggi."},
        {q:"Metode penyambungan fiber optic yang menghasilkan loss paling rendah adalah...",opts:["Mechanical splice","Connector biasa","Fusion splice (fusion splicer)","Soldering"],ans:2,exp:"Fusion splice: dua serat dilebur jadi satu dengan busur listrik. Loss sangat rendah (tipikal 0,02–0,05 dB; batas Telkom ≤0,10 dB) vs mechanical splice (~0.5 dB)."},
        {type:"multi",q:"Kelebihan fiber optic dibanding kabel tembaga adalah...",opts:["Bandwidth sangat besar","Mampu menjangkau jarak sangat jauh","Kebal terhadap interferensi elektromagnetik (EMI)","Harga kabel lebih murah","Mendukung Power over Ethernet (PoE)"],ans:[0,1,2],exp:"Fiber unggul pada bandwidth, jarak, dan imunitas EMI. Fiber justru lebih mahal dan tidak mendukung PoE."},
        {type:"multi",q:"Pernyataan yang benar tentang Single Mode Fiber (SMF) adalah...",opts:["Diameter core sekitar 9 µm","Menggunakan sumber cahaya laser","Warna jaket standar kuning","Dapat mencapai jarak 100+ km","Diameter core 50/62,5 µm"],ans:[0,1,2,3],exp:"SMF: core ±9 µm, laser, jaket kuning, jarak 100+ km. Core 50/62,5 µm adalah Multi Mode Fiber."},
        {type:"multi",q:"Alat yang digunakan dalam instalasi fiber optic adalah...",opts:["Fusion splicer","Fiber cleaver","OTDR","Crimping tool RJ-45","Cable tester UTP"],ans:[0,1,2],exp:"Fusion splicer, cleaver, dan OTDR adalah alat khas fiber. Crimping RJ-45 dan cable tester UTP digunakan untuk kabel tembaga."},
        {type:"multi",q:"Pernyataan yang benar tentang Multi Mode Fiber (MMF) adalah...",opts:["Diameter core 50 µm atau 62,5 µm","Sumber cahaya LED atau VCSEL","Warna jaket orange atau aqua","Umumnya digunakan hingga 550 m","Menggunakan laser untuk jarak 100+ km"],ans:[0,1,2,3],exp:"MMF: core besar, LED/VCSEL, jaket orange/aqua, jarak hingga 550 m. Laser jarak 100+ km adalah karakteristik SMF."},
        {type:"multi",q:"Konektor yang digunakan pada kabel fiber optic adalah...",opts:["SC","LC","FC","RJ-45","BNC"],ans:[0,1,2],exp:"SC, LC, dan FC adalah konektor fiber optic. RJ-45 untuk UTP dan BNC untuk coaxial."},
    ],
    kebutuhan: [
        {q:"Tujuan utama dari tahapan analisis kebutuhan teknis sebelum membangun jaringan adalah...",opts:["Menentukan estimasi total anggaran tanpa survei","Menerjemahkan kebutuhan kegiatan pengguna menjadi spesifikasi teknis yang teruji","Langsung membeli perangkat jaringan terbaru di pasar","Membuat kabel jaringan dalam jumlah sebanyak mungkin"],ans:1,exp:"Analisis kebutuhan bertujuan menerjemahkan kebutuhan operasional pengguna ke dalam spesifikasi teknis (bandwidth, kapasitas, perangkat, redundansi) yang terukur dan dapat diuji."},
        {q:"Seorang teknisi mengumpulkan data trafik jam sibuk dan tingkat utilisasi bandwidth. Teknik pengumpulan data ini disebut...",opts:["Wawancara pengguna","Penyebaran kuesioner","Analisis log dan monitoring","Observasi visual eksternal"],ans:2,exp:"Analisis log dan monitoring menggunakan perangkat lunak (SNMP, PRTG, MRTG) untuk melihat riwayat beban dan pola trafik nyata secara objektif."},
        {q:"Variasi keterlambatan kedatangan paket data yang sangat mempengaruhi kualitas panggilan VoIP dan video call disebut...",opts:["Bandwidth","Throughput","Jitter","Attenuation"],ans:2,exp:"Jitter adalah variasi selisih waktu keterlambatan antar paket (latency variation). Nilai jitter tinggi menyebabkan suara patah-patah pada komunikasi real-time."},
        {q:"Spesifikasi yang tepat untuk kebutuhan 'Data guru dan nilai siswa tidak boleh diakses oleh siswa dari laptop lab' adalah...",opts:["Menambah kecepatan internet menjadi 100 Mbps","Memasang access point tambahan di ruang tata usaha","Menerapkan segmentasi VLAN berbeda dan Access Control List (ACL)","Mengganti seluruh kabel jaringan dengan kabel serat optik"],ans:2,exp:"Isolasi data antardepartemen diselesaikan pada Layer 2/3 menggunakan segmentasi VLAN dan filtering ACL/firewall antar-subnet."},
        {q:"Kriteria penerimaan (Acceptance Criteria) dalam dokumen rancangan jaringan berfungsi sebagai...",opts:["Daftar harga perangkat dari berbagai toko","Tolok ukur pengujian untuk memastikan jaringan berfungsi sesuai kesepakatan","Biodata seluruh teknisi yang memasang instalasi","Surat penawaran harga penyedia layanan internet"],ans:1,exp:"Acceptance criteria adalah parameter pengujian yang disepakati untuk membuktikan jaringan sudah siap diserahterimakan dan memenuhi syarat operasional."},
        {q:"Jika sebuah sekolah memiliki 30 PC lab dengan rencana penambahan 15 PC di tahun berikutnya, prinsip perancangan yang diterapkan adalah...",opts:["Skalabilitas (Scalability)","Kerahasiaan (Confidentiality)","Redundansi (Redundancy)","Portabilitas (Portability)"],ans:0,exp:"Skalabilitas adalah kemampuan jaringan untuk dapat dikembangkan kapasitasnya (port switch, IP pool, bandwidth) tanpa mengubah desain secara menyeluruh."},
        {q:"Throughput berbeda dengan bandwidth karena throughput merupakan...",opts:["Lebar pita maksimal secara teoritis","Kecepatan transfer data riil yang terukur pada saat transmisi","Jumlah total kabel yang terhubung ke switch","Frekuensi gelombang radio yang dipancarkan antena"],ans:1,exp:"Bandwidth adalah kapasitas maksimal teoritis, sedangkan throughput adalah kecepatan data aktual yang berhasil dikirimkan setelah dikurangi overhead dan latensi."},
        {q:"Ukuran keandalan yang menunjukkan rata-rata durasi waktu perbaikan saat terjadi kerusakan jaringan disebut...",opts:["MTBF (Mean Time Between Failures)","MTTR (Mean Time to Repair)","SLA (Service Level Agreement)","QoS (Quality of Service)"],ans:1,exp:"MTTR (Mean Time to Repair) mengukur rata-rata waktu yang dibutuhkan tim teknis untuk memulihkan layanan dari kondisi down hingga normal kembali."},
        {q:"Dalam analisis kebutuhan jaringan, perangkat UPS (Uninterruptible Power Supply) dimasukkan ke dalam kategori...",opts:["Kebutuhan perangkat lunak","Kebutuhan infrastruktur pendukung & daya kelistrikan","Kebutuhan protokol routing Layer 3","Kebutuhan alamat IP publik"],ans:1,exp:"UPS termasuk kebutuhan infrastruktur fisik dan daya untuk mencegah downtime perangkat aktif akibat pemadaman listrik tiba-tiba."},
        {q:"Jika pengguna mengeluhkan 'video conference sering putus di ruang rapat', investigasi teknis pertama yang tepat dilakukan adalah...",opts:["Membeli router baru tanpa melakukan uji","Mengukur level sinyal RSSI, interferensi kanal, dan throughput di lokasi ruang rapat","Memformat ulang seluruh laptop peserta rapat","Mengganti seluruh kartu identitas jaringan pengguna"],ans:1,exp:"Site survey pengukuran RSSI dan kepadatan kanal frekuensi Wi-Fi di lokasi spesifik adalah langkah diagnosis ilmiah pertama."},
        {q:"Batasan toleransi packet loss yang direkomendasikan standar ITU-T untuk komunikasi suara interaktif (VoIP) adalah...",opts:["Di bawah 1%","Maksimal 25%","Boleh mencapai 50%","Tidak ada batas toleransi"],ans:0,exp:"Standar QoS untuk layanan suara (VoIP) menetapkan packet loss harus di bawah 1% agar suara tetap terdengar utuh tanpa clipping."},
        {q:"Dokumen yang memuat kesepakatan tingkat jaminan ketersediaan layanan antara ISP dan pelanggan disebut...",opts:["SOP (Standard Operating Procedure)","SLA (Service Level Agreement)","TOR (Terms of Reference)","RAB (Rencana Anggaran Biaya)"],ans:1,exp:"SLA (Service Level Agreement) adalah kontrak resmi yang memuat persentase uptime jaminan (misal 99.5%), kompensasi, dan batas respon gangguan."},
        {q:"Mengapa teknisi tidak boleh hanya menggunakan metode wawancara kepada satu pihak dalam menganalisis kebutuhan?",opts:["Karena wawancara memerlukan biaya paling mahal","Karena persepsi satu pihak seringkali subjektif dan belum tentu menggambarkan beban teknis sebenarnya","Karena wawancara dilarang dalam standar ISO jaringan","Karena wawancara hanya berlaku untuk jaringan nirkabel"],ans:1,exp:"Kebutuhan pengguna perlu diverifikasi silang dengan observasi fisik dan log monitoring agar perancangan tidak bias asumsi pribadi."},
        {q:"Metrik QoS yang mengukur waktu tempuh paket dari pengirim hingga tiba di penerima disebut...",opts:["Latency (Delay)","Jitter","Bandwidth","Overhead"],ans:0,exp:"Latensi (delay) adalah durasi waktu yang dibutuhkan paket data untuk merambat dari sumber ke tujuan (one-way atau round-trip time/RTT)."},
        {q:"Studi kelayakan teknis yang memeriksa apakah jalur kabel lama dapat mendukung kecepatan 1 Gbps disebut...",opts:["Penilaian kompatibilitas dan sertifikasi kabel eksisting","Konfigurasi routing statis","Pembuatan topologi logis baru","Pemasangan firewall hardware"],ans:0,exp:"Pemeriksaan kategori dan kondisi kabel eksisting (misal Cat5 vs Cat5e/6) penting untuk memastikan dukungan kecepatan gigabit tanpa harus penarikan ulang jika masih layak."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai parameter Quality of Service (QoS) dalam analisis kebutuhan jaringan adalah...",opts:["Latensi yang semakin rendah menunjukkan respons jaringan yang semakin cepat","Jitter yang tinggi sangat mengganggu streaming audio/video real-time","Packet loss 0% adalah kondisi ideal transmisi data","Bandwidth dan throughput selalu memiliki nilai angka yang sama persis","Throughput dipengaruhi oleh protokol overhead dan tabrakan paket"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Pilihan D salah karena throughput aktual hampir selalu lebih kecil dibanding kapasitas bandwidth teoritis."},
        {type:"multi",q:"Komponen yang WAJIB dimuat dalam Dokumen Analisis Kebutuhan Jaringan (Network Requirements Document) adalah...",opts:["Ruang lingkup proyek dan batasan anggaran","Daftar pengguna dan pola jam operasional puncak","Spesifikasi target kinerja (ketersediaan, bandwidth, latensi)","Kunci password pribadi milik seluruh staf sekolah","Kriteria penerimaan (Acceptance Criteria)"],ans:[0,1,2,4],exp:"Dokumen kebutuhan memuat ruang lingkup, profil pengguna, target performa, dan kriteria pengujian. Password pribadi pengguna tidak boleh dimasukkan ke dalam dokumen teknis."},
        {type:"multi",q:"Teknik pengumpulan data yang objektif dan berbasis fakta numerik dalam perancangan jaringan meliputi...",opts:["Pengambilan sampel grafik utilisasi traffic dari router MRTG/PRTG","Inspeksi log error interface switch manageable","Asumsi pribadi tanpa pengujian alat","Pengukuran level kuat sinyal Wi-Fi menggunakan Wi-Fi Analyzer","Pencatatan statistik packet loss menggunakan ICMP probe berkala"],ans:[0,1,3,4],exp:"Data berbasis fakta diperoleh dari log monitoring, statistik interface, software analyzer, dan pengujian probe jaringan."},
        {type:"multi",q:"Kebutuhan non-fungsional pada arsitektur jaringan komputer meliputi...",opts:["Ketersediaan layanan (Availability minimal 99%)","Keamanan dan perlindungan data sensitif","Kemudahan pemeliharaan (Maintainability)","Skalabilitas ekspansi di masa mendatang","Merek baju seragam yang dikenakan teknisi instalasi"],ans:[0,1,2,3],exp:"Kebutuhan non-fungsional mencakup aspek keandalan, keamanan, pemeliharaan, dan skalabilitas sistem."},
        {type:"multi",q:"Faktor lingkungan fisik yang harus diidentifikasi saat menganalisis kebutuhan ruang server adalah...",opts:["Suhu ruangan dan sistem pendingin udara (AC presisi)","Kapasitas daya listrik dan cadangan baterai UPS","Proteksi kebakaran dan sistem grounding kelistrikan","Warna wallpaper dinding ruang tunggu","Kontrol akses pintu masuk fisik (biometrik/kartu RFID)"],ans:[0,1,2,4],exp:"Kebutuhan fisik ruang server meliputi suhu, pasokan daya cadangan, sistem pemadam api/grounding, serta keamanan fisik pintu akses."},
    ],
    peralatan: [
        {q:"Perangkat jaringan Layer 2 yang meneruskan frame berdasarkan MAC address table adalah...",opts:["Router","Managed Switch","Hub","Repeater"],ans:1,exp:"Switch beroperasi pada OSI Layer 2 (Data Link), membaca frame header dan mencatat port asal MAC address ke dalam tabel CAM/MAC untuk meneruskan frame ke port tujuan."},
        {q:"Perangkat yang berfungsi menyalurkan daya listrik bersamaan dengan data melalui kabel UTP ke perangkat Access Point atau IP Camera disebut...",opts:["Switch PoE (Power over Ethernet)","Modem ADSL","Media Converter Optik","Load Balancer"],ans:0,exp:"Switch PoE (standar IEEE 802.3af/at/bt) mampu mengalirkan arus listrik DC bersama data melalui kabel UTP, menghemat kabel adaptor."},
        {q:"Perangkat pasif di rak server tempat terminasi kabel jaringan permanen sebelum dihubungkan dengan patch cord ke switch adalah...",opts:["Patch Panel","Transceiver SFP","Cable Tester","KVM Switch"],ans:0,exp:"Patch panel adalah panel pasif berisi modul jack RJ-45/keystone tempat terminasi kabel link horisontal agar rapi dan tidak merusak port switch secara langsung."},
        {q:"Modul transceiver modular yang dipasang pada port switch untuk menghubungkan kabel serat optik disebut...",opts:["RJ-11 Connector","Modul SFP / SFP+","BNC Adapter","Dongle USB Wi-Fi"],ans:1,exp:"SFP (Small Form-factor Pluggable) dan SFP+ (10G) adalah modul transceiver hot-pluggable untuk media optik atau tembaga berkecepatan tinggi."},
        {q:"Perbedaan utama antara switch terkelola (Managed Switch) dan unmanaged switch adalah...",opts:["Managed switch tidak memerlukan arus listrik","Managed switch mendukung konfigurasi VLAN, STP, QoS, dan pemantauan trafik","Unmanaged switch memiliki kecepatan transfer sepuluh kali lebih tinggi","Unmanaged switch memiliki sistem operasi berbasis Linux GUI"],ans:1,exp:"Managed switch memiliki antarmuka konfigurasi (CLI/Web) untuk mengatur VLAN, Spanning Tree Protocol, link aggregation, dan SNMP monitoring."},
        {q:"Port khusus pada router atau switch yang digunakan untuk konfigurasi lokal awal menggunakan kabel rollover atau serial tanpa memerlukan alamat IP adalah...",opts:["Port AUX","Port Console","Port FastEthernet 0/1","Port SFP Uplink"],ans:1,exp:"Port console digunakan untuk akses manajemen out-of-band melalui terminal serial saat perangkat belum memiliki konfigurasi jaringan IP."},
        {q:"Kapasitas pemrosesan total internal switch yang menunjukkan volume data yang dapat dialihkan antarport secara simultan tanpa blocking disebut...",opts:["Switching Capacity (Backplane Bandwidth)","MAC Table Size","PoE Budget","Latency Buffer"],ans:0,exp:"Switching capacity (backplane bandwidth dalam Gbps) mengukur kapasitas throughput bus internal switch saat seluruh port bekerja maksimal."},
        {q:"Perangkat pasif yang digunakan untuk merapikan, menata, dan mengelompokkan kabel di dalam lemari rak server disebut...",opts:["Cable Management / Wire Duct","Router Core","Access Point Outdoor","Splitter Optik"],ans:0,exp:"Cable management (horizontal/vertical organizer) berfungsi mengalirkan dan menutup jalur kabel patch cord agar rapi dan sirkulasi udara rak terjaga."},
        {q:"Fungsi utama Network Interface Card (NIC) pada komputer client adalah...",opts:["Mengubah sinyal digital komputer menjadi sinyal yang sesuai dengan media transmisi jaringan","Menghitung rumus subnetting secara otomatis","Menyaring serangan malware sebelum masuk harddisk","Menyimpan file backup konfigurasi router"],ans:0,exp:"NIC mengonversi data paralel bus komputer menjadi aliran bit serial pada media kabel atau gelombang radio, serta memiliki alamat fisik (MAC address)."},
        {q:"Perangkat modem ONT (Optical Network Terminal) pada jaringan FTTH berfungsi untuk...",opts:["Mengubah sinyal cahaya serat optik menjadi antarmuka listrik Ethernet/Wi-Fi di sisi pelanggan","Menyambung serat kaca dengan busur api listrik","Mengukur redaman kabel tembaga","Membuat kabel UTP straight"],ans:0,exp:"ONT/ONU berada di premis pelanggan untuk mengubah modulasi optik dari jaringan PON penyedia menjadi sinyal LAN Ethernet, telepon, atau Wi-Fi."},
        {q:"Dalam inventarisasi perangkat, data nomor seri (Serial Number) dan MAC Address dicatat karena...",opts:["Merupakan identitas unik perangkat keras untuk pelacakan aset dan klaim garansi","Merupakan kata sandi bawaan pabrik","Menentukan kapasitas bandwidth switch secara langsung","Dibutuhkan untuk memotong kabel UTP"],ans:0,exp:"Nomor seri dan MAC address bersifat unik global per unit perangkat keras, penting untuk manajemen aset, audit, dan klaim garansi."},
        {q:"Perangkat yang digunakan untuk menghubungkan satu monitor, keyboard, dan mouse ke beberapa server fisik sekaligus di rak server adalah...",opts:["KVM Switch","PoE Injector","Hub Passive","Transceiver BiDi"],ans:0,exp:"KVM (Keyboard, Video, Mouse) switch memungkinkan administrator mengontrol banyak server fisik hanya dengan satu set perangkat input/layar."},
        {q:"Satuan unit ukuran standar tinggi vertikal pada rak server (Server Rack) adalah...",opts:["Inch (in)","Rack Unit (U = 1.75 inch)","Centimeter (cm)","Module Unit (MU)"],ans:1,exp:"1 Rack Unit (1U) setara dengan 1.75 inci (44.45 mm), menjadi patokan standar dimensi tinggi casing switch, server rackmount, dan patch panel."},
        {q:"Jika sebuah switch 24 port PoE memiliki spesifikasi PoE Budget 180W, artinya...",opts:["Switch tersebut membutuhkan daya listrik 1800W dari PLN","Total daya gabungan yang dapat disuplai ke seluruh perangkat PoE terhubung tidak boleh melebihi 180W","Setiap port switch pasti mengeluarkan daya 180W","Switch hanya dapat dinyalakan selama 180 menit"],ans:1,exp:"PoE budget adalah batas daya kumulatif maksimal yang dapat didistribusikan power supply switch ke seluruh perangkat AP/IP cam yang tersambung."},
        {q:"Alat tangan profesional yang digunakan untuk menancapkan sekaligus memotong kawat tembaga kabel UTP pada modul keystone jack atau patch panel adalah...",opts:["Tang Crimping RJ-45","Punch Down Tool (Impact Tool)","Wire Stripper putar","Obeng tespen listrik"],ans:1,exp:"Punch down tool (impact tool) menekan kabel ke bilah IDC (Insulation Displacement Connector) keystone jack sekaligus memotong sisa ujung kawat tembaga secara presisi."},
        {type:"multi",q:"Kelompok perangkat jaringan yang tergolong sebagai PERANGKAT AKTIF adalah...",opts:["Router Layer 3","Managed Switch","Kabel UTP Cat6","Access Point Wi-Fi","Patch Panel 24 Port"],ans:[0,1,3],exp:"Perangkat aktif membutuhkan catu daya listrik dan memproses sinyal logika paket data (Router, Switch, AP). Kabel dan patch panel adalah perangkat pasif."},
        {type:"multi",q:"Fitur yang umumnya dimiliki oleh SWITCH TERKELOLA (Managed Switch) kelas enterprise meliputi...",opts:["Dukungan segmentasi VLAN (IEEE 802.1Q)","Protokol pencegahan loop Spanning Tree Protocol (STP/RSTP)","Link Aggregation (LACP) untuk menggabungkan bandwidth uplink","Pemantauan statistik port menggunakan protokol SNMP","Pemotongan otomatis kabel yang korsleting"],ans:[0,1,2,3],exp:"Managed switch mendukung VLAN, pencegahan loop STP, link aggregation LACP, dan monitoring SNMP. Pilihan E tidak masuk akal."},
        {type:"multi",q:"Komponen yang WAJIB dicatat dalam tabel inventaris perangkat jaringan laboratorium adalah...",opts:["Hostname dan lokasi fisik penempatan rak","Merek, tipe model, dan nomor seri perangkat","Versi firmware/OS dan alamat IP manajemen","Password root yang dicetak besar di kertas stiker publik","Masa garansi dan tanggal pemeliharaan terakhir"],ans:[0,1,2,4],exp:"Inventarisasi mencakup identitas, model, versi sistem operasi, IP manajemen, dan garansi. Password tidak boleh dicatat terbuka di stiker publik demi keamanan."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai teknologi PoE (Power over Ethernet) adalah...",opts:["Standar 802.3af menyediakan daya hingga 15.4 Watt per port","Standar 802.3at (PoE+) menyediakan daya hingga 30 Watt per port","PoE memungkinkan kabel UTP mentransmisikan data dan daya listrik secara bersamaan","Semua jenis kabel UTP otomatis merusak perangkat jika dicolok ke switch PoE","Mengurangi kebutuhan stopkontak listrik terpisah di plafon tempat AP dipasang"],ans:[0,1,2,4],exp:"PoE standar memiliki mekanisme negosiasi voltase aman sehingga tidak merusak perangkat non-PoE, dan sangat memudahkan penempatan AP di plafon."},
        {type:"multi",q:"Hal penting yang harus diperhatikan saat memilih router untuk gateway internet sekolah adalah...",opts:["Throughput routing dan kapasitas NAT handling (concurrency session)","Ketersediaan interface Gigabit Ethernet atau port SFP","Fitur firewall, bandwidth management (Queue/QoS), dan VPN","Warna lampu LED indikator harus berkedip warna-warni","Stabilitas sistem operasi dan ketersediaan pembaruan patch firmware"],ans:[0,1,2,4],exp:"Router gateway dipilih berdasarkan kapasitas throughput nyata, jumlah sesi koneksi NAT, interface fisik, fitur QoS/firewall, dan dukungan firmware resmi."},
    ],
    kabel: [
        {q:"Standar urutan warna pin kabel UTP menurut T568B dari pin 1 sampai pin 8 adalah...",opts:["Putih-Hijau, Hijau, Putih-Orange, Biru, Putih-Biru, Orange, Putih-Cokelat, Cokelat","Putih-Orange, Orange, Putih-Hijau, Biru, Putih-Biru, Hijau, Putih-Cokelat, Cokelat","Putih-Orange, Hijau, Putih-Biru, Orange, Biru, Putih-Cokelat, Cokelat, Putih-Hijau","Orange, Putih-Orange, Hijau, Putih-Hijau, Biru, Putih-Biru, Cokelat, Putih-Cokelat"],ans:1,exp:"Standar T568B: 1. Putih-Orange, 2. Orange, 3. Putih-Hijau, 4. Biru, 5. Putih-Biru, 6. Hijau, 7. Putih-Cokelat, 8. Cokelat."},
        {q:"Batas panjang maksimal link kabel horizontal UTP (Channel Link) dari patch panel ke perangkat komputer menurut standar TIA/EIA adalah...",opts:["50 meter","100 meter (90m kabel permanen + 10m patch cord)","185 meter","500 meter"],ans:1,exp:"Standar ANSI/TIA-568 menetapkan batas channel link tembaga Ethernet adalah 100 meter (90 meter solid horizontal cable + maksimal 10 meter stranded patch cords)."},
        {q:"Jenis kabel twisted pair yang memiliki pelindung aluminium foil pembungkus pada setiap pasang kawat tembaga untuk menolak interferensi elektromagnetik disebut...",opts:["UTP (Unshielded Twisted Pair)","FTP / STP (Shielded Twisted Pair)","Kabel Koaksial RG-59","Kabel Fiber Optic Drop Core"],ans:1,exp:"STP/FTP dilengkapi pelindung logam foil (shielding) untuk melindungi transmisi sinyal dari interferensi elektromagnetik (EMI) eksternal."},
        {q:"Kabel Straight-Through digunakan untuk menghubungkan dua perangkat berikut...",opts:["Komputer ke Komputer secara langsung tanpa switch","Switch ke Switch tanpa port Auto-MDIX","Komputer ke Port Switch atau Router ke Port Switch","Router ke Router secara back-to-back serial"],ans:2,exp:"Kabel straight-through menghubungkan perangkat yang beroperasi di layer berbeda (misal PC Layer 3 / End-host ke Switch Layer 2)."},
        {q:"Kabel Crossover memiliki susunan pin pada kedua ujungnya yaitu...",opts:["Ujung A = T568B dan Ujung B = T568B","Ujung A = T568A dan Ujung B = T568B","Ujung A = T568A dan Ujung B = T568A","Ujung A dan Ujung B dibalik total pin 1 ke pin 8"],ans:1,exp:"Kabel crossover mengawinkan standar T568A di satu ujung dan T568B di ujung lainnya, menyilangkan pasangan pin kirim (Tx) dan terima (Rx)."},
        {q:"Kategori kabel twisted pair yang dirancang khusus untuk mendukung frekuensi hingga 250 MHz dan throughput Gigabit Ethernet adalah...",opts:["Cat 3","Cat 5 biasa","Cat 6","Kabel Telepon RJ-11"],ans:2,exp:"Cat6 memiliki pembatas fisik plastik di tengah (spline) dan mendukung bandwidth frekuensi hingga 250 MHz untuk transmisi 1 Gbps hingga 10 Gbps jarak pendek."},
        {q:"Jika pada pengujian kabel tester lampu indikator menyala dengan urutan: 1-1, 2-2, 3-6, 4-4, 5-5, 6-3, 7-7, 8-8, jenis kesalahan terminasi tersebut adalah...",opts:["Kabel straight sempurna","Crossed pair (pin 3 dan 6 tertukar susunan)","Short circuit pada pin 1","Open circuit pada pin 8"],ans:1,exp:"Pasangan pin 3 dan 6 yang bertukar menunjukkan adanya persilangan kawat (crossed/reversed pair) pada pasangan kawat hijau dan orange."},
        {q:"Konektor modular 8-pin yang standar digunakan pada ujung kabel jaringan UTP LAN Ethernet adalah...",opts:["RJ-11","RJ-45 (8P8C)","BNC","SC Connector"],ans:1,exp:"Konektor RJ-45 (standar fisik 8P8C: 8 Position 8 Contact) adalah konektor universal kabel Ethernet twisted pair."},
        {q:"Kabel koaksial jenis thinnet (10BASE2) menggunakan konektor bertipe...",opts:["BNC (Bayonet Neill–Concelman)","RJ-45","LC Simplex","DB-9 Serial"],ans:0,exp:"Kabel koaksial thinnet RG-58 pada topologi bus menggunakan konektor BNC beserta T-connector dan terminator 50 ohm."},
        {q:"Fitur pada switch modern yang otomatis mendeteksi dan menyesuaikan pasangan pin kabel straight atau cross tanpa perlu mengganti kabel fisik disebut...",opts:["Auto-MDIX (Medium Dependent Interface Crossover)","PoE Auto-Detect","Full-Duplex Negotiation","Spanning Tree Auto-Pruning"],ans:0,exp:"Auto-MDIX memungkinkan port switch mendeteksi polaritas pin Tx/Rx kabel dan membalik konfigurasi secara elektronik bila menggunakan kabel straight maupun cross."},
        {q:"Mengapa pilinan kawat (twist) pada setiap pasang kabel UTP tidak boleh diurai terlalu panjang saat melakukan crimping ke konektor RJ-45?",opts:["Agar kabel terlihat lebih pendek","Untuk mencegah timbulnya crosstalk (gangguan induksi elektromagnetik antarpasangan)","Agar konektor RJ-45 mudah dilepas kembali","Agar kawat tembaga tidak patah saat ditarik"],ans:1,exp:"Pilinan kawat berfungsi meniadakan interferensi elektromagnetik dan crosstalk. Mengurai pilinan melebihi 1.2 cm menurunkan kualitas sinyal secara drastis."},
        {q:"Alat ukur profesional yang mampu menguji kualitas transmisi kabel, redaman sinyal (attenuation), return loss, dan menerbitkan laporan sertifikasi adalah...",opts:["Cable Certifier / Cable Analyzer (misal Fluke DTX/DSX)","Tang Crimping manual","LAN Tester lampu LED sederhana","Gunting kabel serbaguna"],ans:0,exp:"Cable certifier/analyzer profesional menguji frekuensi tinggi, NEXT, FEXT, return loss, dan memastikan kepatuhan standar ISO/TIA."},
        {q:"Jari-jari tekukan kabel (minimum bend radius) yang aman saat instalasi kabel UTP horizontal umumnya minimal sebesar...",opts:["1 kali diameter kabel","4 kali diameter luar kabel","Ditekuk tajam 90 derajat hingga pipih","Tidak ada batas kelengkungan"],ans:1,exp:"Standar instalasi menetapkan radius tekukan kabel tembaga UTP minimal 4 kali diameter kabel untuk mencegah kerusakan fisik struktur pilinan konduktor."},
        {q:"Pada standar 100BASE-TX (Fast Ethernet 100 Mbps), pin pada konektor RJ-45 yang benar-benar aktif digunakan untuk mengirim dan menerima data adalah...",opts:["Pin 1, 2, 3, dan 6","Pin 4, 5, 7, dan 8","Seluruh 8 pin bersamaan","Hanya pin 1 dan pin 2"],ans:0,exp:"Fast Ethernet 100BASE-TX hanya menggunakan dua pasang kawat (pin 1 & 2 untuk Tx, pin 3 & 6 untuk Rx). Gigabit Ethernet (1000BASE-T) barulah memanfaatkan seluruh 8 pin."},
        {q:"Kabel backbone vertikal yang menghubungkan rak server antarlantai dalam suatu gedung bertingkat disebut kabel...",opts:["Horizontal Cabling","Backbone (Riser) Cabling","Work Area Patch Cord","Console Cable"],ans:1,exp:"Backbone/riser cabling menghubungkan MDF (Main Distribution Frame) ke IDF (Intermediate Distribution Frame) antarlantai atau antargedung."},
        {type:"multi",q:"Alat-alat yang WAJIB disiapkan saat melakukan terminasi kabel UTP dengan konektor RJ-45 adalah...",opts:["Kabel stripper / pengupas kulit kabel","Tang crimping RJ-45","Konektor RJ-45 Cat5e/Cat6","Cable LAN Tester","Mesin Fusion Splicer serat optik"],ans:[0,1,2,3],exp:"Terminasi kabel UTP memerlukan stripper, tang crimping, konektor RJ-45, dan LAN tester. Fusion splicer hanya untuk serat optik."},
        {type:"multi",q:"Urutan warna yang terdapat pada standar kabel T568A meliputi...",opts:["Pin 1 adalah Putih-Hijau","Pin 2 adalah Hijau","Pin 3 adalah Putih-Orange","Pin 6 adalah Orange","Pin 1 adalah Putih-Orange"],ans:[0,1,2,3],exp:"Pada T568A: 1=Putih-Hijau, 2=Hijau, 3=Putih-Orange, 6=Orange. Pasangan kawat biru (4,5) dan cokelat (7,8) posisinya sama dengan T568B."},
        {type:"multi",q:"Praktik instalasi kabel terstruktur yang BENAR sesuai standar keselamatan kerja adalah...",opts:["Memberi label identitas (tagging) pada kedua ujung kabel dan port patch panel","Menjaga jarak pisah jalur kabel UTP dari kabel listrik tegangan tinggi PLN","Menarik kabel dengan kekuatan tarikan sekuat tenaga hingga meregang","Memasang pelindung pipa conduit atau cable tray pada lintasan plafon/dinding","Menggunakan keystone jack dan patch panel untuk kabel horizontal instalasi tetap"],ans:[0,1,3,4],exp:"Standar instalasi kabel: labeling rapi, menjaga jarak dari kabel listrik (EMI), menggunakan tray/conduit, dan menghindari tarikan berlebih yang merusak tembaga."},
        {type:"multi",q:"Kelebihan kabel UTP dibanding kabel serat optik (Fiber Optic) dalam implementasi LAN ruangan adalah...",opts:["Biaya kabel dan perangkat switch relatif lebih terjangkau","Proses terminasi konektor lebih mudah dan cepat tanpa alat pelebur khusus","Lebih fleksibel dan tahan tekukan ringan di area meja kerja pengguna","Sepenuhnya kebal terhadap sambaran petir dan interferensi medan magnet tinggi","Mendukung penghantaran daya listrik PoE langsung ke end-device"],ans:[0,1,2,4],exp:"UTP unggul dalam biaya, kemudahan instalasi, kelenturan, dan fitur PoE. Namun UTP tidak kebal EMI seperti fiber optic."},
        {type:"multi",q:"Jenis pengujian yang dapat dilakukan oleh alat Cable Tester dan Verifier jaringan meliputi...",opts:["Pemeriksaan kontinuitas wire map (kebenaran sambungan pin)","Deteksi kawat putus di tengah jalur (Open circuit)","Deteksi kawat yang bersentuhan korslet (Short circuit)","Deteksi pasangan pin yang terbalik susunannya (Reversed / Split pair)","Mengetahui isi riwayat browsing internet pengguna"],ans:[0,1,2,3],exp:"Tester menguji kontinuitas fisik kabel: wire map, open, short, dan reversed pair. Tester kabel tidak membaca isi payload trafik data aplikasi."},
    ],
    nirkabel: [
        {q:"Standar Wi-Fi yang bekerja pada frekuensi 5 GHz saja dan mendukung kecepatan teoritis hingga ratusan Mbps (Wi-Fi 5) adalah...",opts:["IEEE 802.11b","IEEE 802.11g","IEEE 802.11n","IEEE 802.11ac"],ans:3,exp:"IEEE 802.11ac (Wi-Fi 5) beroperasi eksklusif di frekuensi 5 GHz dengan modulasi hingga 256-QAM dan kanal 80/160 MHz."},
        {q:"Pada pita frekuensi 2.4 GHz, tiga kanal yang TIDAK saling tumpang tindih (non-overlapping channels) adalah kanal...",opts:["Kanal 1, 2, dan 3","Kanal 1, 6, dan 11","Kanal 2, 4, dan 8","Kanal 6, 9, dan 12"],ans:1,exp:"Di pita 2.4 GHz standar 20 MHz, hanya kanal 1, 6, dan 11 yang memiliki jarak 25 MHz sehingga tidak menimbulkan co-channel interference."},
        {q:"Kelebihan frekuensi 2.4 GHz dibandingkan frekuensi 5 GHz pada jaringan Wi-Fi adalah...",opts:["Kecepatan throughput transfer jauh lebih tinggi","Memiliki pilihan kanal non-overlapping lebih banyak","Jangkauan sinyal lebih jauh dan kemampuan menembus dinding penghalang lebih baik","Bebas dari gangguan perangkat microwave dan Bluetooth"],ans:2,exp:"Gelombang 2.4 GHz memiliki panjang gelombang lebih besar sehingga redamannya lebih rendah saat menembus material padat (dinding) dibanding 5 GHz."},
        {q:"Nilai indikator kekuatan sinyal yang diterima (RSSI) yang dikategorikan SANGAT BAIK untuk koneksi Wi-Fi stabil adalah...",opts:["-30 dBm hingga -60 dBm","-85 dBm hingga -95 dBm","-110 dBm","+50 dBm"],ans:0,exp:"Nilai RSSI dinyatakan dalam minus dBm. Rentang -30 dBm hingga -60 dBm menunjukkan sinyal sangat kuat dan jernih. Nilai di bawah -75 dBm mulai rentan putus."},
        {q:"Protokol keamanan Wi-Fi modern yang menggunakan enkripsi Simultaneous Authentication of Equals (SAE) untuk mencegah serangan kamus offline adalah...",opts:["WEP (Wired Equivalent Privacy)","WPA-TKIP","WPA2-PSK","WPA3-Personal (SAE)"],ans:3,exp:"WPA3 menggunakan protokol Dragonfly / SAE (Simultaneous Authentication of Equals) yang kebal terhadap serangan brute-force dictionary capture."},
        {q:"Fitur pada Access Point yang membatasi agar perangkat client nirkabel tidak dapat saling berkomunikasi secara langsung satu sama lain dalam satu SSID disebut...",opts:["SSID Broadcast","Client Isolation (AP Isolation)","WPS (Wi-Fi Protected Setup)","WMM (Wi-Fi Multimedia)"],ans:1,exp:"Client Isolation mengisolasi lalu lintas antarperangkat nirkabel pada Layer 2, sangat penting diterapkan pada hotspot publik/tamu untuk mencegah sniffing antarclient."},
        {q:"Jenis antena yang memancarkan sinyal gelombang radio secara merata ke segala arah (360 derajat) secara horizontal adalah...",opts:["Antena Grid","Antena Yagi","Antena Omnidirectional","Antena Parabolik Dish"],ans:2,exp:"Antena omnidirectional memancarkan cakupan 360 derajat melingkar, ideal untuk access point indoor di tengah ruangan."},
        {q:"Proses berpindahnya koneksi perangkat client dari satu Access Point ke Access Point lain secara mulus saat bergerak tanpa putus koneksi disebut...",opts:["Roaming","Bridging","Tethering","Cloning"],ans:0,exp:"Roaming (misal standar 802.11k/v/r) memungkinkan client beralih ke AP yang sinyalnya lebih kuat saat berpindah lokasi tanpa memutus sesi koneksi."},
        {q:"Topologi jaringan nirkabel di mana seluruh perangkat client terhubung ke satu perangkat terpusat Access Point disebut mode...",opts:["Ad-Hoc (Peer-to-Peer)","Infrastructure (BSS / ESS)","Mesh Outdoor saja","Point-to-Point Bridge"],ans:1,exp:"Mode infrastruktur (Basic Service Set / Extended Service Set) menempatkan Access Point sebagai koordinator pusat seluruh komunikasi client Wi-Fi."},
        {q:"Teknologi pada Wi-Fi yang memanfaatkan beberapa antena pemancar dan penerima secara simultan untuk meningkatkan throughput data disebut...",opts:["MIMO (Multiple Input Multiple Output)","CSMA/CD","FHSS","WEP 64-bit"],ans:0,exp:"MIMO mengirim dan menerima beberapa aliran data spasial (spatial streams) secara paralel melalui multipath antenna."},
        {q:"Metode survei lokasi Wi-Fi dengan cara berkeliling membawa laptop/ponsel untuk mengukur kuat sinyal nyata di tiap sudut ruangan disebut...",opts:["Predictive Survey","Active / Passive Walk-through Site Survey","Survei Telepon","Analisis Kabel Tembaga"],ans:1,exp:"Active/passive walk-through site survey memetakan sinyal riil di denah lokasi untuk menemukan titik mati (dead-zones) dan sumber interferensi."},
        {q:"Mengapa fitur WPS (Wi-Fi Protected Setup) PIN method sangat disarankan untuk dinonaktifkan pada router Wi-Fi?",opts:["Karena menghabiskan kuota internet","Karena memiliki celah keamanan fatal yang mudah dibobol melalui serangan brute-force PIN (Reaver attack)","Karena membuat router cepat panas","Karena membatasi jumlah client hanya 2 perangkat"],ans:1,exp:"Celah pada WPS PIN memungkinkan penyerang menebak 8 digit PIN dalam hitungan jam untuk mengekstrak passphrase WPA/WPA2 tanpa izin."},
        {q:"Penyebab utama fenomena 'sinyal bar Wi-Fi penuh tetapi internet lambat atau sering RTO' di ruangan ramai adalah...",opts:["Tingginya airtime utilization dan tabrakan frekuensi kanal (Co-Channel Interference / High Density)","Kabel daya adaptor AP kepanjangan","Antena router terlalu runcing","Lampu indikator AP berwarna biru"],ans:0,exp:"Kepadatan pengguna tinggi berbagi media udara (airtime sharing) yang sama dan tabrakan kanal menyebabkan contention delay tinggi meski sinyal fisik tampak penuh."},
        {q:"Standar Wi-Fi 6 beroperasi di bawah standar resmi IEEE yaitu...",opts:["IEEE 802.11a","IEEE 802.11ax","IEEE 802.11ac","IEEE 802.3u"],ans:1,exp:"IEEE 802.11ax adalah standar resmi untuk Wi-Fi 6, menghadirkan efisiensi OFDMA, 1024-QAM, Target Wake Time, dan BSS Coloring."},
        {q:"Pengaturan lebar pita kanal (Channel Width) yang paling direkomendasikan pada frekuensi 2.4 GHz di lingkungan padat adalah...",opts:["20 MHz","40 MHz","80 MHz","160 MHz"],ans:0,exp:"Di pita 2.4 GHz, penggunaan kanal 40 MHz memakan hampir seluruh spektrum dan menimbulkan interferensi parah. Lebar kanal 20 MHz jauh lebih stabil di lingkungan padat."},
        {type:"multi",q:"Keunggulan pita frekuensi 5 GHz dibandingkan 2.4 GHz pada instalasi Wi-Fi adalah...",opts:["Menyediakan lebih banyak kanal frekuensi independen yang tidak saling tumpang tindih","Mendukung lebar kanal 40 MHz, 80 MHz, hingga 160 MHz untuk throughput tinggi","Relatif lebih bersih dari interferensi microwave dan perangkat rumah tangga Bluetooth","Mampu menembus beberapa lapis dinding beton tebal lebih baik daripada 2.4 GHz","Mengurangi kepadatan antrean trafik di lingkungan banyak pengguna"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Pilihan D salah karena gelombang 5 GHz mengalami atenuasi dinding lebih besar daripada 2.4 GHz."},
        {type:"multi",q:"Langkah-langkah pengamanan yang TEPAT untuk jaringan Wi-Fi sekolah adalah...",opts:["Menggunakan enkripsi WPA2-Enterprise dengan autentikasi RADIUS atau WPA3","Membuat SSID terpisah untuk Guru, Siswa, dan Tamu yang dipetakan ke VLAN berbeda","Mengaktifkan Client Isolation pada SSID Tamu","Mengganti kredensial login admin default router/AP dengan password kuat","Menggunakan enkripsi WEP 64-bit karena paling cepat dikonfigurasi"],ans:[0,1,2,3],exp:"WPA2/3, pemisahan VLAN per SSID, client isolation, dan penggantian password admin default adalah praktik standar. WEP sangat rentan dan sudah usang."},
        {type:"multi",q:"Bahan bangunan dan objek fisik yang menyebabkan redaman (attenuation) sinyal Wi-Fi paling tinggi adalah...",opts:["Dinding beton bertulang dan lift logam","Kaca cermin tebal dengan lapisan perak","Lemari arsip pelat besi/baja","Udara kosong bersih di koridor terbuka","Dinding partisi triplek tipis"],ans:[0,1,2],exp:"Beton bertulang, cermin kaca, dan logam/baja adalah material pemantul dan penyerap sinyal radio paling pekat. Udara bebas dan partisi kayu ringan hanya menyerap sedikit sinyal."},
        {type:"multi",q:"Fitur unggulan yang diperkenalkan pada standar Wi-Fi 6 (802.11ax) meliputi...",opts:["OFDMA (Orthogonal Frequency Division Multiple Access) untuk transmisi simultan multi-user","Modulasi tinggi 1024-QAM untuk peningkatan kapasitas throughput","Target Wake Time (TWT) untuk menghemat daya baterai perangkat IoT/smartphone","BSS Coloring untuk membedakan sinyal jaringan tetangga pada kanal yang sama","Menghilangkan kebutuhan kabel LAN pada instalasi access point"],ans:[0,1,2,3],exp:"Wi-Fi 6 memperkenalkan OFDMA, 1024-QAM, TWT, dan BSS coloring. AP Wi-Fi 6 tetap membutuhkan kabel LAN (PoE) sebagai koneksi uplink ke switch."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai jenis antena nirkabel adalah...",opts:["Antena Directional memfokuskan pancaran sinyal ke satu arah tertentu untuk jarak jauh","Antena Omnidirectional cocok untuk melayani client yang menyebar di sekitar AP indoor","Antena Grid atau Parabolik sangat ideal untuk link koneksi Point-to-Point (PtP) antargedung","Gain antena dinyatakan dalam satuan dBi","Semua jenis antena dapat memperkuat sinyal tanpa batas tanpa memerlukan daya pemancar"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D benar. Antena adalah elemen pasif yang memfokuskan pola radiasi (bukan menciptakan energi tanpa batas)."},
    ],
    firewall: [
        {q:"Prinsip dasar keamanan penyusunan aturan firewall yang menutup seluruh lalu lintas terlebih dahulu kecuali yang diizinkan secara eksplisit disebut...",opts:["Default Permit","Default Deny (Implicit Deny)","Port Forwarding","Open Relay"],ans:1,exp:"Prinsip Default Deny memastikan semua paket masuk/keluar ditolak secara default, hanya trafik yang diizinkan oleh rule spesifik yang dapat lewat."},
        {q:"Perbedaan mendasar antara Standard ACL dan Extended ACL pada router Cisco adalah...",opts:["Standard ACL hanya memeriksa alamat IP sumber (Source IP), sedangkan Extended ACL memeriksa Source IP, Destination IP, Protokol, dan Port","Standard ACL beroperasi di Layer 7 sedangkan Extended ACL di Layer 1","Standard ACL hanya untuk IPv6","Extended ACL tidak dapat memblokir paket ICMP ping"],ans:0,exp:"Standard ACL (rentang 1-99) hanya memfilter berdasarkan source IP. Extended ACL (rentang 100-199) memfilter berdasarkan source IP, dest IP, protokol (TCP/UDP/ICMP), dan port tujuan."},
        {q:"Firewall yang memiliki kemampuan melacak keadaan sesi koneksi (TCP handshake SYN, ACK, ESTABLISHED) dan hanya melewatkan paket balasan yang sah disebut...",opts:["Stateless Packet Filter","Stateful Inspection Firewall","Circuit Level Hub","Unmanaged Firewall"],ans:1,exp:"Stateful firewall memelihara state table koneksi aktif. Paket balasan dari internet otomatis diizinkan jika cocok dengan sesi koneksi keluar yang diinisiasi client internal."},
        {q:"Zona jaringan terisolasi yang diperuntukkan bagi server publik (seperti Web Server atau Mail Server) agar jika diretas tidak langsung menyebar ke LAN internal disebut...",opts:["LAN Trust Zone","DMZ (Demilitarized Zone)","Loopback Zone","Broadcast Domain"],ans:1,exp:"DMZ (Demilitarized Zone) adalah subnet penengah yang memisahkan server publik dari jaringan LAN internal yang sensitif."},
        {q:"Pada konfigurasi firewall Linux iptables atau MikroTik, tindakan 'DROP' berbeda dengan 'REJECT' karena DROP...",opts:["Mengirim pesan balasan ICMP Port Unreachable ke pengirim","Membuang paket secara senyap tanpa mengirim respons pemberitahuan ke pengirim","Mengizinkan paket melewati firewall","Menyimpan paket ke dalam flashdisk"],ans:1,exp:"DROP membuang paket tanpa memberi tahu pengirim (stealth). REJECT membuang paket sambil membalas dengan pesan ICMP unreachable / TCP RST."},
        {q:"Urutan evaluasi aturan (rules) pada sistem firewall umumnya diproses secara...",opts:["Acak sesuai kecepatan respon","Berurutan dari atas ke bawah (Top-to-Bottom, First Match Wins)","Dari bawah ke atas","Hanya aturan dengan nomor genap yang diproses"],ans:1,exp:"Firewall mengevaluasi baris aturan dari atas ke bawah. Saat paket pertama kali cocok dengan satu rule, aksi langsung dieksekusi dan aturan di bawahnya diabaikan."},
        {q:"Perintah Cisco ACL untuk mengizinkan seluruh trafik web HTTP (port 80) dari subnet 192.168.1.0/24 menuju server 10.0.0.5 adalah...",opts:["access-list 101 permit tcp 192.168.1.0 0.0.0.255 host 10.0.0.5 eq 80","access-list 10 permit ip any any","access-list 101 deny udp 192.168.1.0 0.0.0.255 any eq 80","access-list 101 permit 80 from 192.168.1.0 to 10.0.0.5"],ans:0,exp:"Extended ACL menggunakan protokol tcp, wildcard mask 0.0.0.255 untuk /24, kata kunci host untuk satu target IP, dan operator eq 80 (HTTP)."},
        {q:"Wildcard mask untuk subnet mask 255.255.255.224 (/27) yang digunakan pada konfigurasi Cisco ACL adalah...",opts:["0.0.0.31","0.0.0.255","0.0.0.63","255.255.255.0"],ans:0,exp:"Wildcard mask dihitung dari 255.255.255.255 dikurangi 255.255.255.224 = 0.0.0.31."},
        {q:"Fitur keamanan jaringan yang memeriksa isi payload paket hingga Layer Aplikasi untuk mendeteksi tanda tangan serangan malware dan eksploitasi disebut...",opts:["IDS/IPS (Intrusion Detection/Prevention System)","DHCP Snooping","Spanning Tree PortFast","Static Routing"],ans:0,exp:"IDS/IPS melakukan inspeksi mendalam (Deep Packet Inspection) terhadap signature payload data untuk mendeteksi dan memblokir serangan secara real-time."},
        {q:"Penempatan Standard ACL yang paling optimal menurut best-practice jaringan Cisco adalah...",opts:["Sedekat mungkin dengan tujuan (Destination)","Sedekat mungkin dengan sumber (Source)","Di core router internet","Di komputer client pengirim"],ans:0,exp:"Standard ACL hanya memeriksa alamat sumber. Jika diletakkan dekat sumber, ia dapat memblokir lalu lintas ke tujuan lain yang sah. Oleh karena itu diletakkan dekat tujuan."},
        {q:"Penempatan Extended ACL yang paling optimal menurut best-practice jaringan Cisco adalah...",opts:["Sedekat mungkin dengan sumber (Source)","Sedekat mungkin dengan tujuan (Destination)","Hanya di port switch access","Di server DNS"],ans:0,exp:"Extended ACL memiliki spesifikasi sumber dan tujuan lengkap, sehingga sebaiknya diletakkan sedekat mungkin dengan sumber untuk menyaring paket sebelum membebani bandwidth jaringan."},
        {q:"Pada MikroTik RouterOS, rantai firewall (chain) yang menangani lalu lintas data yang melewati router dari satu antarmuka menuju antarmuka lain adalah...",opts:["Chain INPUT","Chain FORWARD","Chain OUTPUT","Chain PREROUTING"],ans:1,exp:"Chain FORWARD memproses trafik yang transit/melewati router. Chain INPUT memproses paket yang ditujukan langsung ke router itu sendiri."},
        {q:"Serangan siber di mana penyerang membanjiri server dengan jutaan permintaan paket SYN palsu tanpa menyelesaikan 3-way handshake disebut...",opts:["SYN Flood Attack (DoS/DDoS)","Man-in-the-Middle Attack","SQL Injection","Phishing"],ans:0,exp:"SYN Flood mengeksploitasi antrean koneksi TCP dengan mengirimkan SYN tanpa membalas ACK, menghabiskan memori buffer server (Denial of Service)."},
        {q:"Aturan firewall yang dibuat untuk mengizinkan hanya administrator dari IP 192.168.99.10 mengakses remote SSH ke router adalah pada chain...",opts:["Chain INPUT dengan source IP 192.168.99.10, protocol TCP, port 22, action ACCEPT","Chain FORWARD dengan destination port 80 action DROP","Chain OUTPUT dengan action MASQUERADE","Chain PREROUTING dengan redirect to port 53"],ans:0,exp:"Akses remote SSH ke perangkat router diproses pada chain INPUT router dengan mencocokkan IP sumber admin dan port SSH (22)."},
        {q:"Next-Generation Firewall (NGFW) berbeda dari firewall generasi pertama karena NGFW mampu...",opts:["Mengidentifikasi aplikasi nyata (seperti YouTube, BitTorrent) terlepas dari nomor port yang digunakan","Menggantikan fungsi kabel serat optik","Bekerja tanpa memerlukan catu daya listrik","Menambah kecepatan internet secara gaib"],ans:0,exp:"NGFW memiliki kemampuan Application Awareness dan Deep Packet Inspection (DPI) sehingga dapat mengenali aplikasi walau disamarkan melalui port HTTPS 443."},
        {type:"multi",q:"Fungsi-fungsi utama yang dijalankan oleh sebuah FIREWALL jaringan adalah...",opts:["Mengisolasi dan menyaring paket berdasarkan alamat IP, port, dan protokol","Mencegah akses ilegal dari jaringan internet publik ke jaringan privat","Mencatat rekaman log aktivitas koneksi mencurigakan","Menerapkan inspeksi status koneksi stateful inspection","Memperbaiki kabel UTP yang putus secara otomatis"],ans:[0,1,2,3],exp:"Firewall menyaring lalu lintas, mencegah akses ilegal, mencatat log audit, dan melacak state sesi. Firewall tidak dapat memperbaiki kerusakan fisik kabel."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai zona DMZ (Demilitarized Zone) adalah...",opts:["DMZ digunakan untuk menempatkan server yang dapat diakses publik seperti Web Server","Jika server di DMZ diretas, firewall tetap membatasi akses dari DMZ ke LAN internal","LAN internal tidak boleh memiliki akses bebas tanpa aturan dari zona DMZ","Zona DMZ tidak memerlukan firewall sama sekali","DMZ meningkatkan lapisan pertahanan jaringan (Defense in Depth)"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Zona DMZ justru dipagari ketat oleh firewall antarzona."},
        {type:"multi",q:"Penyebab aturan firewall atau ACL tidak bekerja sesuai harapan (troubleshooting) meliputi...",opts:["Urutan penempatan rule yang salah (terkena rule permit/deny yang lebih umum di atasnya)","Salah menentukan arah interface (inbound vs outbound)","Salah menghitung nilai wildcard mask pada router Cisco","Lupa mengizinkan paket balasan (established/related connections)","Merek komputer client berbeda warna dengan switch"],ans:[0,1,2,3],exp:"Kesalahan umum ACL meliputi salah urutan (top-to-bottom), arah interface, kalkulasi wildcard mask, dan tidak mengizinkan paket return traffic."},
        {type:"multi",q:"Rantai firewall bawaan pada tabel filter iptables Linux terdiri dari...",opts:["INPUT (paket yang ditujukan untuk proses lokal server)","OUTPUT (paket yang di-generate dari proses lokal server ke luar)","FORWARD (paket yang melintas melalui router ke tujuan lain)","RESTART (paket yang merestart komputer)","DOWNLOAD (paket unduhan game)"],ans:[0,1,2],exp:"Filter table standar Linux iptables terdiri dari 3 chain utama: INPUT, FORWARD, dan OUTPUT."},
        {type:"multi",q:"Tindakan mitigasi pada firewall untuk meredam serangan DoS/DDoS pada server meliputi...",opts:["Menerapkan rate limiting terhadap paket koneksi baru per detik","Mengaktifkan fitur TCP SYN Cookie pada sistem operasi","Memblokir alamat IP penyerang yang terdeteksi melakukan flooding secara dinamis","Membatasi jumlah koneksi serentak (connection limit) per alamat IP client","Mematikan router sekolah selamanya"],ans:[0,1,2,3],exp:"Mitigasi DoS meliputi rate-limiting, SYN cookie, blacklist IP dinamis, dan connection limiting. Pilihan E tidak realistis."},
    ],
    kriptografi: [
        {q:"Tiga pilar utama keamanan informasi yang dikenal sebagai CIA Triad adalah...",opts:["Confidentiality, Integrity, Availability","Cisco, Intel, Apple","Cable, Interface, Access","Client, Internet, Application"],ans:0,exp:"CIA Triad adalah fondasi keamanan: Confidentiality (kerahasiaan), Integrity (keutuhan data), dan Availability (ketersediaan layanan)."},
        {q:"Algoritma kriptografi yang menggunakan SATU KUNCI YANG SAMA untuk proses enkripsi dan dekripsi adalah...",opts:["Kriptografi Kunci Simetris (Symmetric Key)","Kriptografi Kunci Asimetris (Public Key)","Fungsi Hash Satu Arah","Tanda Tangan Digital"],ans:0,exp:"Enkripsi simetris menggunakan secret key yang sama untuk mengunci dan membuka pesan. Contoh: AES, DES, ChaCha20."},
        {q:"Standar enkripsi simetris modern yang paling banyak digunakan di dunia saat ini dengan panjang kunci 128, 192, atau 256 bit adalah...",opts:["AES (Advanced Encryption Standard)","Caesar Cipher","MD5","Base64"],ans:0,exp:"AES (Advanced Encryption Standard / Rijndael) adalah standar enkripsi simetris global berkecepatan tinggi dan memiliki tingkat keamanan militer."},
        {q:"Dalam kriptografi asimetris (seperti RSA), kunci yang digunakan oleh penerima untuk mendekripsi pesan yang dikirimkan kepadanya adalah...",opts:["Public Key milik pengirim","Private Key milik penerima sendiri","Public Key milik penerima","Session Key publik bersama"],ans:1,exp:"Pesan dienkripsi menggunakan Public Key penerima, dan HANYA bisa didekripsi oleh Private Key rahasia milik penerima."},
        {q:"Sifat utama dari fungsi hash kriptografis (seperti SHA-256) adalah...",opts:["Pesan yang sudah di-hash dapat didekripsi kembali menjadi teks asli dengan kunci privat","Bersifat satu arah (irreversible), menghasilkan digest berukuran tetap, dan tahan terhadap collision","Menghasilkan teks acak yang panjangnya selalu berubah-ubah sesuai suasana hati","Dapat digandakan dengan mudah tanpa batas"],ans:1,exp:"Fungsi hash bersifat satu arah (tidak bisa didekripsi kembali) dan menghasilkan output panjang tetap (SHA-256 = 256 bit/64 hex) untuk verifikasi integritas."},
        {q:"Protokol keamanan yang digunakan untuk mengenkripsi komunikasi web antara browser client dan web server (HTTPS) pada port 443 adalah...",opts:["TLS (Transport Layer Security) / SSL","Telnet","SNMP v1","FTP unencrypted"],ans:0,exp:"TLS (Transport Layer Security, penerus SSL) mengenkripsi lalu lintas HTTP menjadi HTTPS port 443 menggunakan kombinasi asimetris dan simetris."},
        {q:"Mengapa encoding seperti Base64 BUKAN merupakan teknik enkripsi?",opts:["Karena Base64 hanya berjalan di sistem operasi Linux","Karena Base64 tidak menggunakan kunci rahasia dan siapapun dapat mengembalikannya ke teks asli","Karena Base64 membutuhkan memori RAM terlalu besar","Karena Base64 sudah dilarang oleh pemerintah"],ans:1,exp:"Encoding mengubah format representasi data tanpa kunci rahasia. Siapa pun dapat melakukan decode Base64 secara instan tanpa perlu password/kunci."},
        {q:"Fungsi dari Tanda Tangan Digital (Digital Signature) pada dokumen elektronik adalah...",opts:["Membuat ukuran file menjadi sepuluh kali lebih kecil","Membuktikan keaslian identitas pengirim (Authenticity) dan memastikan data tidak diubah (Integrity / Non-repudiation)","Menghapus seluruh virus di komputer","Mengubah teks menjadi format PDF"],ans:1,exp:"Digital signature menggabungkan hash dokumen dan enkripsi private key pengirim untuk menjamin keaslian pengirim dan keutuhan data (non-repudiation)."},
        {q:"Lembaga terpercaya pihak ketiga yang menerbitkan dan menandatangani sertifikat digital SSL/TLS disebut...",opts:["ISP (Internet Service Provider)","CA (Certificate Authority)","DNS Server","DHCP Server"],ans:1,exp:"CA (Certificate Authority, misal Let's Encrypt, DigiCert) adalah entitas terverifikasi yang memvalidasi domain dan menerbitkan sertifikat digital TLS X.509."},
        {q:"Algoritma pertukaran kunci yang memungkinkan dua pihak menyepakati kunci rahasia bersama melalui saluran publik yang tidak aman tanpa mengirim kunci itu sendiri adalah...",opts:["Diffie-Hellman Key Exchange","Caesar Substitution","MD5 Checksum","ASCII Converter"],ans:0,exp:"Diffie-Hellman memungkinkan dua pihak menghitung shared secret key bersama melalui matematika modulus bilangan prima di kanal terbuka."},
        {q:"Protokol remote terminal yang aman dan menggantikan protokol Telnet yang tidak terenkripsi adalah...",opts:["SSH (Secure Shell) pada port 22","FTP pada port 21","TFTP pada port 69","HTTP pada port 80"],ans:0,exp:"SSH (Secure Shell, port 22) mengenkripsi seluruh sesi terminal, kredensial, dan transfer data, menggantikan Telnet yang mengirim teks polos."},
        {q:"Kelemahan algoritma hash MD5 dan SHA-1 yang menyebabkan keduanya tidak direkomendasikan lagi untuk sertifikat keamanan adalah...",opts:["Ukuran hash terlalu panjang","Telah ditemukan celah tabrakan hash (Collision Vulnerability) di mana dua file berbeda dapat menghasilkan nilai hash yang sama","Tidak dapat dijalankan pada komputer 64-bit","Membutuhkan kabel internet khusus"],ans:1,exp:"MD5 dan SHA-1 rentan terhadap collision attack (dua input berbeda menghasilkan hash identik), sehingga wajib diganti dengan keluarga SHA-2 (SHA-256) atau SHA-3."},
        {q:"Dalam arsitektur VPN (Virtual Private Network), protokol Layer 3 yang banyak digunakan untuk mengenkripsi dan mengautentikasi seluruh paket IP adalah...",opts:["IPsec (IP Security)","Telnet","SNMP v2","RIP v1"],ans:0,exp:"IPsec menyediakan enkripsi, integritas, dan autentikasi paket pada Layer Jaringan (Layer 3) melalui protokol AH dan ESP."},
        {q:"Teknik menyembunyikan pesan rahasia di dalam media pembawa lain (seperti menyisipkan teks rahasia ke dalam bit warna gambar foto) disebut...",opts:["Steganografi","Subnetting","Multiplexing","Phishing"],ans:0,exp:"Steganografi bertujuan menyembunyikan keberadaan pesan di dalam berkas lain, berbeda dari kriptografi yang mengubah pesan menjadi teks tersandi."},
        {q:"Peran Public Key Infrastructure (PKI) dalam keamanan internet modern adalah...",opts:["Mengatur pembagian bandwidth internet sekolah","Menyediakan kerangka kerja pengelolaan kunci, sertifikat digital, dan verifikasi kepercayaan identitas","Menghitung rute tercepat antarkota","Mempercepat download video YouTube"],ans:1,exp:"PKI mencakup kebijakan, perangkat lunak, dan CA yang mengelola siklus pembuatan, distribusi, pencabutan, dan verifikasi sertifikat kunci publik."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai perbedaan Kriptografi Simetris dan Asimetris adalah...",opts:["Enkripsi simetris menggunakan 1 kunci yang sama untuk enkripsi dan dekripsi","Enkripsi asimetris menggunakan sepasang kunci: Public Key dan Private Key","Komputasi enkripsi simetris jauh lebih cepat dan efisien untuk data dalam jumlah besar","Public key harus dirahasiakan rapat-rapat dan tidak boleh diberikan kepada siapa pun","Kombinasi keduanya (Hybrid Encryption) digunakan dalam jabat tangan protokol HTTPS/TLS"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Pilihan D salah karena Public Key justru bebas dibagikan ke publik; yang wajib dijaga kerahasiaannya adalah Private Key."},
        {type:"multi",q:"Kegunaan praktis dari fungsi HASH dalam administrasi sistem dan jaringan adalah...",opts:["Menyimpan password pengguna dalam bentuk hash satu arah di database server","Memverifikasi keutuhan dan keaslian file ISO yang diunduh dari internet menggunakan checksum","Dasar pembentukan tanda tangan digital (Digital Signature)","Mengembalikan password yang terlupa menjadi teks asli secara instan","Memeriksa apakah ada perubahan integritas data pada transaksi blockchain"],ans:[0,1,2,4],exp:"Hash digunakan untuk penyimpanan password aman, checksum file ISO, digital signature, dan blockchain. Hash tidak dapat didekripsi kembali ke teks asli."},
        {type:"multi",q:"Protokol-protokol jaringan yang TIDAK AMAN karena mengirimkan data dan password dalam bentuk teks polos (plaintext) adalah...",opts:["Telnet (port 23)","FTP biasa (port 21)","HTTP biasa (port 80)","SSH (port 22)","HTTPS (port 443)"],ans:[0,1,2],exp:"Telnet, FTP, dan HTTP mengirim data tanpa enkripsi (plaintext) sehingga mudah disadap dengan packet sniffer. SSH dan HTTPS menggunakan enkripsi kuat."},
        {type:"multi",q:"Faktor-faktor yang menentukan kekuatan keamanan sebuah sistem kriptografi meliputi...",opts:["Panjang kunci (key length, misal AES-256 bit atau RSA-4096 bit)","Kerahasiaan penyimpanan private key atau secret key","Kekuatan algoritma yang telah teruji secara publik oleh komunitas kriptografi internasional","Bagusnya desain stiker casing komputer","Penerapan implementasi protokol dan perlindungan terhadap side-channel attack"],ans:[0,1,2,4],exp:"Keamanan kriptografi ditentukan oleh panjang bit kunci, kerahasiaan private key, kematangan matematis algoritma, dan implementasi software yang bebas bug."},
        {type:"multi",q:"Ancaman keamanan jaringan yang dapat dicegah atau diminimalisir dengan penerapan kriptografi adalah...",opts:["Eavesdropping / Packet Sniffing (penyadapan lalu lintas data)","Man-in-the-Middle (MitM) data tampering","Pemalsuan identitas server melalui sertifikat TLS palsu","Tikus yang menggigit kabel UTP hingga putus di plafon","Replay Attack menggunakan nonce dan timestamp pada sesi terenkripsi"],ans:[0,1,2,4],exp:"Kriptografi melindungi dari penyadapan, manipulasi data MitM, impersonation server, dan replay attack. Kerusakan fisik kabel akibat hewan pengerat adalah ranah keamanan fisik."},
    ],
    nat: [
        {q:"Fungsi utama Network Address Translation (NAT) pada router gateway adalah...",opts:["Menerjemahkan alamat IP privat jaringan lokal menjadi satu atau beberapa alamat IP publik untuk mengakses internet","Mengganti kabel tembaga dengan kabel optik secara otomatis","Menghapus seluruh virus di komputer client","Mempercepat putaran kipas pendingin router"],ans:0,exp:"NAT menerjemahkan alamat IP privat (RFC 1918) yang tidak dapat dirutekan di internet menjadi alamat IP publik resmi."},
        {q:"Jenis NAT yang memetakan banyak alamat IP privat ke HANYA SATU alamat IP publik menggunakan pembeda nomor port transport disebut...",opts:["Static NAT","PAT (Port Address Translation) / NAT Overload / Masquerade","Dynamic NAT tanpa port","One-to-One NAT"],ans:1,exp:"PAT (Port Address Translation atau NAT Overload) memanfaatkan port Layer 4 (TCP/UDP) sehingga ratusan perangkat lokal dapat berbagi 1 IP publik."},
        {q:"Rentang alamat IP Privat menurut RFC 1918 untuk Kelas C yang umum digunakan pada jaringan LAN sekolah adalah...",opts:["10.0.0.0 – 10.255.255.255 (/8)","172.16.0.0 – 172.31.255.255 (/12)","192.168.0.0 – 192.168.255.255 (/16)","169.254.0.0 – 169.254.255.255 (/16)"],ans:2,exp:"192.168.0.0/16 adalah blok IP privat Kelas C. 10.0.0.0/8 adalah Kelas A, dan 172.16.0.0/12 adalah Kelas B."},
        {q:"Fitur Destination NAT (DNAT) atau Port Forwarding digunakan untuk...",opts:["Mengizinkan seluruh pengguna LAN mengakses Google","Meneruskan permintaan koneksi dari internet pada port tertentu menuju ke server privat di dalam jaringan LAN","Menyembunyikan SSID Access Point","Menguji kecepatan kabel UTP"],ans:1,exp:"Port Forwarding (DNAT) mengarahkan paket masuk dari IP publik pada port tertentu (misal port 80/443) ke IP lokal server internal (misal 192.168.1.100)."},
        {q:"Perintah MikroTik RouterOS untuk mengaktifkan masquerade pada antarmuka WAN internet adalah...",opts:["/ip firewall nat add chain=srcnat out-interface=WAN action=masquerade","/ip route add gateway=WAN action=nat","/ip dhcp-server add interface=WAN disabled=no","/ip address add address=192.168.1.1/24 interface=WAN"],ans:0,exp:"Aturan NAT masquerade di MikroTik menggunakan chain srcnat dengan parameter out-interface yang mengarah ke ISP dan action masquerade."},
        {q:"Tabel pada router yang mencatat pemetaan IP privat asal, port asal, IP publik, dan port translasi disebut...",opts:["NAT Translation Table / Connection Tracking Table","MAC Address Table","ARP Table","DNS Cache Table"],ans:0,exp:"NAT translation table mencatat pemetaan setiap koneksi aktif agar saat paket balasan datang dari internet, router tahu harus mengembalikannya ke PC lokal yang mana."},
        {q:"Komputer client di LAN memperoleh IP 192.168.1.50/24. Parameter yang WAJIB diisi agar komputer tersebut dapat mengakses internet melewati router adalah...",opts:["Default Gateway yang mengarah ke alamat IP router lokal (misal 192.168.1.1) dan DNS Server","Alamat MAC Address switch","Nama SSID Access Point tetangga","Nomor telepon administrator"],ans:0,exp:"Default Gateway memberitahu komputer ke mana paket harus dikirim jika tujuannya berada di luar subnet lokal, dan DNS menerjemahkan nama domain."},
        {q:"Kelemahan atau dampak samping dari penggunaan NAT pada jaringan komunikasi adalah...",opts:["Komputer client tidak bisa lagi menyala","Mematahkan prinsip komunikasi murni end-to-end IP dan mempersulit protokol peer-to-peer tanpa teknik traversal (seperti STUN/TURN)","Mengurangi kecepatan kipas processor","Menghapus tabel routing secara berkala"],ans:1,exp:"NAT menyembunyikan IP asli di balik IP publik, mengganggu konektivitas peer-to-peer langsung (seperti VoIP, gaming, WebRTC) sehingga membutuhkan protokol traversal."},
        {q:"Rute default (Default Route) pada tabel routing yang mengarahkan seluruh trafik yang tidak diketahui tujuannya ke router ISP ditulis sebagai...",opts:["0.0.0.0/0","127.0.0.1/32","255.255.255.255/32","192.168.0.0/24"],ans:0,exp:"0.0.0.0/0 (quad-zero route) adalah default route / gateway of last resort yang menangkap semua paket tanpa spesifikasi rute spesifik."},
        {q:"Static NAT umumnya diterapkan pada skenario...",opts:["Pemetaan 1-ke-1 tetap antara satu server web internal dengan satu alamat IP publik khusus","Laboratorium komputer dengan 100 PC yang berbagi 1 modem","Hotspot kafe gratis","Koneksi Bluetooth antar ponsel"],ans:0,exp:"Static NAT memetakan satu IP lokal ke satu IP publik secara permanen 1-to-1, lazim digunakan untuk server korporat yang membutuhkan IP publik statis."},
        {q:"Jika client LAN dapat melakukan ping ke alamat IP gateway 192.168.1.1 dan ping ke 8.8.8.8 berhasil, tetapi gagal membuka halaman web 'google.com', letak gangguannya adalah...",opts:["Kabel LAN putus","Konfigurasi DNS Server pada client belum terisi atau gagal meresolusi domain","Router mati total","Kartu NIC komputer rusak terbakar"],ans:1,exp:"Jika ping IP angka sukses tetapi membuka domain nama gagal, masalahnya ada pada resolusi nama domain oleh DNS Server."},
        {q:"Perangkat yang menggabungkan fungsi modem, router, switch 4-port, dan Wi-Fi access point dalam satu kotak fisik di rumah pelanggan internet biasa disebut...",opts:["Broadband Residential Gateway / Wireless Router","KVM Switch","ODC Optik","Patch Panel"],ans:0,exp:"Wireless broadband gateway rumah memadukan fungsi modem/ONT, router Layer 3, NAT gateway, switch Ethernet, dan Access Point Wi-Fi."},
        {q:"Aksi 'masquerade' pada MikroTik otomatis mengambil alamat IP sumber publik dari...",opts:["Alamat IP yang sedang aktif terpasang pada interface keluar (out-interface)","Alamat IP acak dari internet","Alamat MAC Address kartu jaringan","Alamat 127.0.0.1"],ans:0,exp:"Masquerade adalah varian khusus SNAT yang secara otomatis mendeteksi dan memakai IP aktif pada antarmuka keluar, sangat cocok untuk IP WAN dinamis (PPPoE/DHCP Client)."},
        {q:"Batas maksimal jumlah port TCP atau UDP yang tersedia pada satu alamat IP dalam arsitektur translasi PAT adalah...",opts:["256 port","1.024 port","65.535 port","Tak terhingga"],ans:2,exp:"Header transport Layer 4 menggunakan 16-bit port number, sehingga rentang port adalah 0 sampai 65.535."},
        {q:"Urutan penanganan paket yang keluar menuju internet pada router gateway adalah...",opts:["Pemeriksaan Routing Table -> Evaluasi Firewall Filter -> Translasi Source NAT -> Transmisi fisik keluar","Translasi NAT -> Routing -> Matikan router","Kirim dulu -> baru diperiksa IP tujuannya","Hapus IP asal -> buang paket"],ans:0,exp:"Paket keluar dievaluasi rutenya (routing), dicek aturan firewall filter (permit/deny), ditranslasi alamat sumbernya (Source NAT), lalu dikirim ke interface WAN."},
        {type:"multi",q:"Manfaat utama implementasi NAT pada jaringan komputer modern adalah...",opts:["Menghemat penggunaan alamat IPv4 publik yang jumlahnya sangat terbatas","Menyembunyikan skema pengalamatan IP internal jaringan privat dari dunia luar","Memberikan fleksibilitas perubahan provider internet tanpa perlu mengubah IP client internal","Menjamin koneksi internet otomatis gratis tanpa perlu membayar ISP","Mendukung ribuan perangkat lokal mengakses internet melalui satu alamat IP publik"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Pilihan D salah karena NAT tidak menggratiskan tagihan ISP."},
        {type:"multi",q:"Blok alamat IP privat yang TIDAK DAPAT dirutekan secara langsung di internet publik menurut standar RFC 1918 adalah...",opts:["10.0.0.0/8 (Kelas A Privat)","172.16.0.0/12 (Kelas B Privat: 172.16.0.0 s/d 172.31.255.255)","192.168.0.0/16 (Kelas C Privat: 192.168.0.0 s/d 192.168.255.255)","8.8.8.8 (Google Public DNS)","1.1.1.1 (Cloudflare Public DNS)"],ans:[0,1,2],exp:"RFC 1918 menetapkan 10.0.0.0/8, 172.16.0.0/12, dan 192.168.0.0/16 sebagai blok IP privat. 8.8.8.8 dan 1.1.1.1 adalah IP publik global."},
        {type:"multi",q:"Parameter konfigurasi jaringan yang WAJIB dibagikan ke client LAN agar dapat menggunakan internet gateway secara normal meliputi...",opts:["Alamat IP unik dalam subnet lokal","Subnet Mask / Prefix yang sesuai","Default Gateway (IP interface router lokal)","DNS Server untuk menerjemahkan nama domain web","Password router mikrotik administrator"],ans:[0,1,2,3],exp:"Klien membutuhkan IP, Subnet Mask, Default Gateway, dan DNS Server. Password admin router tidak boleh diberikan kepada client."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai Port Forwarding (Destination NAT) adalah...",opts:["Memungkinkan pengguna di internet mengakses server lokal yang berada di belakang NAT","Paket yang datang pada IP publik dan port spesifik diteruskan ke IP privat dan port target","Hanya satu layanan yang dapat menggunakan port publik yang sama pada waktu bersamaan","Port Forwarding mengubah IP sumber paket pengirim","Sangat berguna untuk hosting Web Server lokal atau CCTV DVR internal"],ans:[0,1,2,4],exp:"Port forwarding (DNAT) mengubah IP tujuan paket masuk agar dapat menjangkau server/CCTV lokal di balik IP publik. DNAT tidak mengubah IP sumber."},
        {type:"multi",q:"Langkah-langkah diagnosis sistematis saat seluruh client di lab tidak dapat mengakses internet adalah...",opts:["Uji ping ke IP default gateway router (misal ping 192.168.1.1)","Periksa apakah antarmuka WAN router memperoleh IP publik dan status link ISP aktif","Uji ping dari terminal router ke alamat IP internet (misal ping 8.8.8.8)","Periksa apakah aturan NAT masquerade aktif dan menghitung paket counter","Beli laptop baru untuk seluruh siswa"],ans:[0,1,2,3],exp:"Urutan troubleshooting: uji koneksi lokal ke gateway, cek status interface WAN router, uji koneksi router ke internet, dan verifikasi rule NAT."},
    ],
    linux: [
        {q:"Perintah modern pada sistem operasi Linux untuk melihat konfigurasi antarmuka dan alamat IP (menggantikan perintah usang ifconfig) adalah...",opts:["ip addr (atau ip a)","show interface","ipconfig /all","get network"],ans:0,exp:"'ip addr' (paket iproute2) adalah standar modern Linux untuk menampilkan dan mengonfigurasi alamat IP antarmuka jaringan."},
        {q:"Direktori pada struktur file sistem Linux (FHS) yang berisi seluruh berkas konfigurasi sistem dan layanan jaringan adalah...",opts:["/etc","/home","/var","/tmp"],ans:0,exp:"Direktori /etc adalah lokasi standar seluruh konfigurasi sistem, jaringan, dan service di Linux (misal /etc/network, /etc/netplan, /etc/ssh)."},
        {q:"Perintah untuk memeriksa port yang sedang terbuka dan mendengarkan (listening) koneksi jaringan pada server Linux adalah...",opts:["ss -tulpn","cat /etc/passwd","chmod 777","reboot -f"],ans:0,exp:"'ss -tulpn' (socket statistics) menampilkan port TCP/UDP yang sedang listening beserta nama proses dan nomor PID service."},
        {q:"Perintah systemd untuk menyalakan sekaligus memastikan layanan Apache web server otomatis aktif saat komputer dinyalakan kembali (booting) adalah...",opts:["sudo systemctl enable --now apache2","sudo service apache2 kill","sudo run apache2 boot","init 0 apache2"],ans:0,exp:"'systemctl enable --now <service>' mengaktifkan service saat booting (enable) sekaligus langsung menyalakannya saat itu juga (--now)."},
        {q:"Arti dari nilai hak akses permission 'chmod 755 file.sh' pada sistem Linux adalah...",opts:["Owner: Read, Write, Execute (7); Group: Read, Execute (5); Others: Read, Execute (5)","Semua pengguna memiliki hak Read, Write, dan Execute","Hanya root yang dapat membuka file tersebut","File tersebut dikunci dan tidak dapat dijalankan"],ans:0,exp:"Angka 7 = rwx (4+2+1). Angka 5 = r-x (4+0+1). Jadi owner memiliki izin penuh 7, sedangkan group dan others hanya read & execute (5)."},
        {q:"Perintah package manager pada distribusi Debian / Ubuntu untuk memperbarui daftar repositori paket perangkat lunak adalah...",opts:["sudo apt update","sudo apt install all","dnf clean all","pacman -Syu"],ans:0,exp:"'apt update' mengunduh dan memperbarui daftar indeks paket perangkat lunak terbaru dari server repositori resmi."},
        {q:"Perintah untuk melihat log aktivitas real-time dari layanan SSH server pada Linux systemd adalah...",opts:["journalctl -u ssh -f","cat /dev/null","tail /boot/vmlinuz","echo ssh.log"],ans:0,exp:"'journalctl -u ssh -f' membaca log sistem terpusat untuk unit service ssh, dengan opsi '-f' (follow) untuk memantau log secara real-time."},
        {q:"File konfigurasi DNS resolver client pada Linux yang memuat alamat IP name server adalah...",opts:["/etc/resolv.conf","/etc/hosts.deny","/etc/hostname","/etc/fstab"],ans:0,exp:"/etc/resolv.conf menentukan alamat IP server DNS (nameserver) yang digunakan Linux untuk menerjemahkan nama domain."},
        {q:"Utilitas modern konfigurasi jaringan berbasis YAML yang digunakan secara default pada Ubuntu Server 18.04/20.04/22.04 adalah...",opts:["Netplan","Wicd","Windows Network Wizard","Network Dial-Up"],ans:0,exp:"Netplan adalah abstraksi konfigurasi jaringan berbasis file deklaratif YAML di direktori /etc/netplan/ pada Ubuntu modern."},
        {q:"Perintah untuk mengganti kepemilikan pengguna dan grup pada direktori '/var/www/html' menjadi milik user 'www-data' adalah...",opts:["sudo chown -R www-data:www-data /var/www/html","sudo chmod 777 /var/www/html","sudo touch www-data /var/www/html","sudo usermod -aG root /var/www/html"],ans:0,exp:"'chown -R user:group target' mengubah owner dan group kepemilikan file/folder secara rekursif (-R)."},
        {q:"Perintah untuk melihat penggunaan kapasitas ruang penyimpanan partisi harddisk dalam format yang mudah dibaca manusia (GB/MB) adalah...",opts:["df -h","free -m","ls -la","uname -r"],ans:0,exp:"'df -h' (disk free, human-readable) menampilkan penggunaan partisi filesystem dalam satuan Mega/Giga Byte."},
        {q:"Perintah untuk melihat pemakaian memori RAM yang sedang digunakan dan yang masih bebas adalah...",opts:["free -h","uptime","ps aux","fdisk -l"],ans:0,exp:"'free -h' (human-readable) merinci pemakaian memori RAM dan Swap (total, used, free, shared, buff/cache, available)."},
        {q:"Perintah Linux untuk melakukan pengujian penelusuran rute hop jaringan (mengirim paket dengan TTL bertahap) adalah...",opts:["traceroute (atau tracepath)","route print","grep hop","systemctl status"],ans:0,exp:"'traceroute' mengirim paket dengan nilai TTL (Time-To-Live) bertahap dari 1 ke atas untuk memetakan setiap hop router yang dilewati paket."},
        {q:"Aplikasi firewall bawaan yang mudah digunakan pada distribusi Ubuntu Server untuk membuka port 22 SSH adalah...",opts:["sudo ufw allow 22/tcp (atau ufw allow ssh)","sudo iptables -F","sudo systemctl stop network","sudo rm -rf /etc/firewall"],ans:0,exp:"UFW (Uncomplicated Firewall) adalah frontend iptables di Ubuntu. Perintah 'ufw allow 22/tcp' membuka akses masuk untuk SSH."},
        {q:"Alasan mengapa administrator TIDAK disarankan menjalankan seluruh aktivitas harian menggunakan akun user 'root' secara langsung adalah...",opts:["Akun root tidak memiliki hak akses internet","Kesalahan perintah satu baris oleh akun root dapat merusak atau menghapus seluruh sistem tanpa konfirmasi proteksi","Akun root membuat komputer berjalan lambat","Sistem Linux melarang akun root login selamanya"],ans:1,exp:"Prinsip keamananLeast Privilege mengharuskan admin memakai akun biasa dan hanya mengeskalasi hak menggunakan 'sudo' bila diperlukan, untuk mencegah malapetaka ketidaksengajaan."},
        {type:"multi",q:"Perintah-perintah dasar Linux yang digunakan untuk administrasi dan analisis jaringan adalah...",opts:["ip addr show (melihat alamat IP antarmuka)","ip route (melihat tabel routing kernel)","ss -tulpn (melihat socket dan port listening)","ping -c 4 8.8.8.8 (menguji konektivitas ICMP)","format C: /q (memformat disk Windows)"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D adalah perintah jaringan standar Linux. Pilihan E adalah perintah DOS/Windows lama."},
        {type:"multi",q:"Tindakan pengamanan (Hardening) yang TEPAT dilakukan pada server SSH Linux (/etc/ssh/sshd_config) adalah...",opts:["Mengubah port default SSH dari port 22 ke port khusus non-standar","Menonaktifkan login langsung akun root ('PermitRootLogin no')","Menggunakan autentikasi berbasis Public/Private Key dan mematikan password biasa","Membuka seluruh hak akses tanpa password ('PermitEmptyPasswords yes')","Membatasi akses SSH hanya dari IP subnet manajemen administrator"],ans:[0,1,2,4],exp:"Hardening SSH meliputi non-root login, port kustom, key-based authentication, dan IP filtering. Password kosong (Pilihan D) sangat berbahaya."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai hak akses file (file permissions) pada Linux adalah...",opts:["Read (r) bernilai angka 4","Write (w) bernilai angka 2","Execute (x) bernilai angka 1","Nilai 777 memberikan hak penuh kepada siapa saja dan sebaiknya dihindari untuk file publik","Nilai 000 artinya file dapat diunduh tanpa batas kuota"],ans:[0,1,2,3],exp:"Permission r=4, w=2, x=1. Angka 777 (rwxrwxrwx) sangat riskan terhadap manipulasi pihak tak berwenang."},
        {type:"multi",q:"Layanan-layanan (services) server jaringan yang umum dijalankan di atas sistem operasi Linux meliputi...",opts:["Web Server Apache2 atau Nginx","DNS Server BIND9","DHCP Server isc-dhcp-server atau kea","File Sharing Samba (SMB) dan SSH Daemon","Aplikasi Adobe Photoshop versi Windows 98"],ans:[0,1,2,3],exp:"Linux adalah platform utama untuk web server (Apache/Nginx), DNS (BIND9), DHCP, dan file sharing (Samba/NFS/SSH)."},
        {type:"multi",q:"Langkah-langkah yang BENAR saat melakukan troubleshooting layanan service yang gagal menyala (failed) di Linux adalah...",opts:["Mengecek status error service dengan perintah 'systemctl status <nama_service>'","Membaca rincian baris log kegagalan melalui perintah 'journalctl -u <nama_service> -xe'","Memeriksa kebenaran sintaks berkas konfigurasi sebelum menjalankan ulang","Memastikan tidak ada service lain yang berebut menggunakan nomor port yang sama","Menghapus seluruh folder /etc dan /boot"],ans:[0,1,2,3],exp:"Troubleshooting service di Linux meliputi systemctl status, journalctl error logs, validasi file config, dan cek konflik port. Menghapus /etc dan /boot akan merusak OS."},
    ],
    server: [
        {q:"Empat tahapan proses negosiasi alokasi alamat IP secara otomatis antara DHCP Client dan DHCP Server (DORA) secara berurutan adalah...",opts:["Discover -> Offer -> Request -> Acknowledge","Download -> Open -> Read -> Apply","Demand -> Order -> Receive -> Accept","Disconnect -> Offline -> Reconnect -> Active"],ans:0,exp:"Proses DORA: 1. DHCP Discover (broadcast pencarian server), 2. DHCP Offer (penawaran IP), 3. DHCP Request (permintaan IP terpilih), 4. DHCP Acknowledge (konfirmasi persetujuan alokasi)."},
        {q:"Fungsi utama dari DNS (Domain Name System) Server pada infrastruktur jaringan adalah...",opts:["Menerjemahkan nama domain (seperti smkn1km.sch.id) menjadi alamat IP angka (seperti 103.20.15.5) dan sebaliknya","Membagi beban arus listrik ke stopkontak","Mengirim email secara otomatis tanpa internet","Mempercepat unduhan file video"],ans:0,exp:"DNS bertindak seperti buku telepon internet, memetakan Fully Qualified Domain Name (FQDN) ke alamat IP (dan sebaliknya lewat reverse lookup)."},
        {q:"Tipe DNS Record yang digunakan untuk memetakan nama domain ke alamat IPv4 adalah...",opts:["Record A (Address Record)","Record AAAA","Record MX (Mail Exchange)","Record CNAME (Canonical Name)"],ans:0,exp:"Record 'A' memetakan nama domain ke alamat IPv4 (32-bit). Record 'AAAA' untuk IPv6, 'MX' untuk mail server, dan 'CNAME' untuk nama alias."},
        {q:"Tipe DNS Record yang berfungsi sebagai nama alias (tautan alternatif) menuju ke nama domain utama yang sudah memiliki Record A adalah...",opts:["CNAME (Canonical Name)","PTR (Pointer Record)","TXT Record","SOA Record"],ans:0,exp:"CNAME (Canonical Name) membuat alias nama lain (misal www.sekolah.sch.id diarahkan sebagai alias ke sekolah.sch.id)."},
        {q:"Layanan server yang digunakan untuk berbagi file dan folder secara terpusat agar dapat diakses oleh komputer client berbasis Windows dan Linux di jaringan LAN adalah...",opts:["Samba Server (SMB/CIFS)","DHCP Relay Agent","NTP Client","SNMP Trap"],ans:0,exp:"Samba mengimplementasikan protokol SMB/CIFS di Linux sehingga komputer Windows dapat mengakses folder sharing, printer, dan autentikasi secara seamless."},
        {q:"Port standar yang digunakan oleh layanan Web Server HTTP (tanpa enkripsi) dan HTTPS (terenkripsi TLS) secara berurutan adalah...",opts:["Port 80 dan Port 443","Port 21 dan Port 22","Port 53 dan Port 67","Port 25 dan Port 110"],ans:0,exp:"HTTP standar beroperasi pada port 80 TCP, sedangkan HTTPS terenkripsi beroperasi pada port 443 TCP."},
        {q:"Fitur pada DHCP Server yang mengunci agar satu alamat IP tertentu SELALU diberikan ke perangkat komputer/printer yang sama berdasarkan MAC Address-nya disebut...",opts:["DHCP Lease Time","DHCP Reservation (Static Leases / IP Binding)","DHCP Relay","DHCP Snooping"],ans:1,exp:"DHCP Reservation (static lease) mengaitkan MAC Address perangkat dengan IP tetap sehingga perangkat selalu memperoleh IP yang sama dari DHCP."},
        {q:"Durasi waktu pinjaman alamat IP yang diberikan oleh DHCP Server kepada client sebelum client wajib memperbarui masa sewa disebut...",opts:["Lease Time","Round Trip Time (RTT)","Time To Live (TTL)","Aging Time"],ans:0,exp:"Lease Time menentukan berapa lama client berhak memakai IP tersebut sebelum harus mengirim request renewal (perpanjangan sewa)."},
        {q:"Fitur pada Web Server (seperti Apache atau Nginx) yang memungkinkan satu unit server fisik melayani banyak nama website berbeda sekaligus disebut...",opts:["Virtual Host (Server Blocks)","Reverse Proxy","Load Balancing","Web Socket"],ans:0,exp:"Virtual Host (Apache) atau Server Block (Nginx) memungkinkan satu server dan satu alamat IP melayani banyak website berbeda berdasarkan header Host HTTP."},
        {q:"Protokol jaringan yang bertugas menyinkronkan waktu jam sistem pada seluruh server dan router dengan server waktu atomik dunia adalah...",opts:["NTP (Network Time Protocol) port 123","FTP port 21","SMTP port 25","DNS port 53"],ans:0,exp:"NTP (Network Time Protocol, UDP port 123) memastikan jam seluruh perangkat jaringan sinkron, krusial untuk validitas log forensik dan sertifikat SSL/TLS."},
        {q:"Perintah pada sistem operasi client untuk menguji resolusi DNS dan mengetahui alamat IP dari suatu nama domain adalah...",opts:["nslookup (atau dig)","ipconfig /release","tracert 127.0.0.1","netstat -a"],ans:0,exp:"'nslookup' dan 'dig' adalah tool query diagnostik DNS untuk memeriksa respon DNS record, nameserver pengelola, dan waktu respon resolusi."},
        {q:"Strategi pencadangan data 'Aturan 3-2-1' (3-2-1 Backup Rule) yang direkomendasikan untuk keamanan server adalah...",opts:["Memiliki minimal 3 salinan data, disimpan pada 2 jenis media berbeda, dan 1 salinan disimpan di lokasi terpisah (off-site/cloud)","Mencadangkan data 3 kali sehari setiap 2 jam selama 1 minggu","Memerlukan 3 administrator, 2 password, dan 1 kunci gembok","Membeli 3 harddisk dari toko yang sama"],ans:0,exp:"Aturan 3-2-1: 3 salinan data (1 primer + 2 backup), 2 media penyimpanan berbeda (misal disk & tape/NAS), dan 1 cadangan disimpan di luar gedung (off-site/cloud)."},
        {q:"Protokol email yang digunakan oleh server pengirim untuk mentransfer dan meneruskan surat elektronik ke server tujuan adalah...",opts:["SMTP (Simple Mail Transfer Protocol) port 25/587","POP3 port 110","IMAP port 143","SNMP port 161"],ans:0,exp:"SMTP bertugas mengirim dan meneruskan email antarserver (mail relay). POP3 dan IMAP digunakan client untuk mengunduh/membaca email dari mailbox."},
        {q:"Mengapa sebuah server jaringan (seperti Web Server, DNS Server, atau Database Server) WAJIB diberikan alamat IP Statis dan bukan IP dinamis acak?",opts:["Karena IP statis membuat website menjadi gratis","Agar alamat IP server tetap konstan dan selalu dapat dijangkau oleh client tanpa berubah-ubah setiap restart","Karena IP dinamis merusak kabel server","Agar server tidak memerlukan password login"],ans:1,exp:"Server harus memiliki alamat IP tetap (statis) agar client, DNS record, dan firewall rule yang mengarah ke server tidak terputus saat lease berakhir."},
        {q:"Tipe DNS Record PTR (Pointer Record) digunakan untuk keperluan...",opts:["Reverse DNS Lookup (menerjemahkan alamat IP kembali menjadi nama domain)","Mengirim email promosi","Mempercepat loading CSS website","Menyimpan file musik di server"],ans:0,exp:"Record PTR disimpan dalam zona reverse lookup (in-addr.arpa) untuk memetakan alamat IP angka kembali ke FQDN domain pemiliknya."},
        {type:"multi",q:"Parameter konfigurasi yang dapat dibagikan secara otomatis oleh DHCP Server kepada client adalah...",opts:["Alamat IP client dan Subnet Mask","Alamat Default Gateway (router)","Alamat IP DNS Server primer dan sekunder","Domain Name Search suffix dan NTP Server","Password akun media sosial pengguna"],ans:[0,1,2,3],exp:"DHCP options (RFC 2132) membagikan IP, mask, gateway, DNS, domain suffix, dan NTP. Data pribadi password pengguna tidak termasuk."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai perbedaan protokol penarikan email POP3 dan IMAP adalah...",opts:["POP3 umumnya mengunduh email ke perangkat lokal dan menghapusnya dari server","IMAP menyinkronkan status email (read, unread, folder) langsung di server secara dua arah","IMAP sangat cocok digunakan jika pengguna mengakses satu akun email dari banyak perangkat (ponsel dan laptop)","POP3 tidak membutuhkan koneksi internet sama sekali untuk mengirim email","IMAP memungkinkan sinkronisasi folder email antargadget secara konsisten"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. POP3 mengunduh lokal, sedangkan IMAP menyinkronkan status di server untuk akses multi-device."},
        {type:"multi",q:"Tipe-tipe DNS Record standar yang umum dikonfigurasi pada DNS Server meliputi...",opts:["Record A (pemetaan domain ke alamat IPv4)","Record AAAA (pemetaan domain ke alamat IPv6)","Record MX (menunjuk server pengelola email)","Record CNAME (nama alias menuju record kanonikal)","Record CPU (mengukur kecepatan processor server)"],ans:[0,1,2,3],exp:"DNS record standar meliputi A, AAAA, MX, CNAME, PTR, TXT, NS, dan SOA. Tidak ada record bernama Record CPU."},
        {type:"multi",q:"Layanan aplikasi web server open-source yang sangat populer dan banyak digunakan di lingkungan industri adalah...",opts:["Apache HTTP Server","Nginx (Engine-X)","Lighttpd / Caddy","Microsoft Word 2010","Winamp Media Player"],ans:[0,1,2],exp:"Apache, Nginx, dan Caddy/Lighttpd adalah software web server terkemuka. Word dan Winamp adalah aplikasi desktop pengguna."},
        {type:"multi",q:"Praktik pemeliharaan dan pengamanan server (Server Maintenance & Hardening) yang WAJIB dijalankan administrator meliputi...",opts:["Menutup seluruh port layanan yang tidak digunakan pada firewall server","Melakukan pembaruan patch keamanan sistem operasi secara berkala","Menjadwalkan backup rutin data database dan file konfigurasi","Memasang monitoring resource server (CPU, RAM, Storage, Traffic) dan alert peringatan","Membagikan username dan password root ke grup WhatsApp umum"],ans:[0,1,2,3],exp:"Prinsip pemeliharaan server: penutupan port tak terpakai, patch rutin, backup berkala, dan monitoring proaktif. Membagikan password root ke grup publik melanggar keamanan mendasar."},
    ],
    fo_tp11: [
        {q:"Alat Pelindung Diri (APD) yang PALING KRUSIAL digunakan saat memotong dan mengupas serat optik untuk mencegah serpihan kaca masuk ke mata adalah...",opts:["Kacamata pelindung (Safety Glasses / Goggles)","Masker gas respirator","Ear muff peredam suara","Sarung tangan kain tebal"],ans:0,exp:"Kacamata safety transparan wajib dikenakan untuk melindungi mata dari lontaran serpihan serat kaca mikro (125 mikron) yang tidak terlihat saat proses cleaving."},
        {q:"Mengapa teknisi DILARANG KERAS melihat langsung ke ujung konektor atau serat optik aktif tanpa alat pelindung?",opts:["Karena debu pada konektor dapat beterbangan ke wajah","Karena sinar laser inframerah (1310/1490/1550 nm) tidak terlihat mata tetapi dapat membakar retina secara permanen","Karena kaca ferrule dapat memantulkan bayangan wajah","Karena dapat merusak konektor koneksi router"],ans:1,exp:"Panjang gelombang telekomunikasi (1310/1550 nm) berada di luar spektrum kasat mata, sehingga pupil mata tidak berkedip saat laser berdaya merusak sel retina."},
        {q:"Cara pembuangan serpihan potongan serat optik (fiber shards) yang BENAR sesuai standar K3LH adalah...",opts:["Ditiup hingga jatuh ke lantai ruangan","Dibuang ke tong sampah kertas terbuka","Dimasukkan ke dalam wadah khusus tertutup bertanda bahaya (Fiber Scrap Trash Can)","Disapu menggunakan sapu ijuk rumah biasa"],ans:2,exp:"Serpihan kaca serat optik sangat tajam, transparan, dan tidak dapat dideteksi oleh sinar-X medis jika tertusuk ke dalam kulit atau tertelan. Wajib dikumpulkan di wadah tertutup."},
        {q:"Dokumen keselamatan kerja yang wajib diisi dan ditinjau bersama seluruh anggota tim sebelum memulai pekerjaan berisiko tinggi disebut...",opts:["JSA (Job Safety Analysis) / RAMPU","Invoice tagihan alat","Daftar hadir siswa sekolah","Nota pembelian kabel"],ans:0,exp:"JSA (Job Safety Analysis) merinci setiap tahapan pekerjaan, potensi bahaya (ketinggian, sengatan listrik, serpihan kaca), dan langkah mitigasi yang disepakati tim."},
        {q:"Sebelum teknisi memasuki lubang manhole bawah tanah (confined space) untuk menarik kabel FO, tindakan K3LH pertama yang WAJIB dilakukan adalah...",opts:["Langsung melompat ke dasar manhole","Menguji keberadaan gas beracun (CO, H2S, Methane) dengan gas detector dan menyalakan blower ventilasi","Menyiram dasar manhole dengan air keran","Mematikan lampu penerangan"],ans:1,exp:"Ruang terbatas (confined space/manhole) rawan akumulasi gas beracun mematikan dan defisiensi oksigen. Gas detector dan blower sirkulasi wajib diaktifkan sebelum personel masuk."},
        {q:"Prinsip 'Buddy System' dalam pekerjaan instalasi dan terminasi fiber optik di lapangan berarti...",opts:["Teknisi bekerja berpasangan minimal dua orang di mana satu bekerja dan satu mengawasi keselamatan","Bekerja sendirian agar pekerjaan cepat selesai","Mengajak teman mengobrol sambil merokok di ruang server","Meminjamkan alat kerja ke orang lain tanpa dicatat"],ans:0,exp:"Buddy system mewajibkan teknisi bekerja minimal berpasangan untuk memastikan adanya pertolongan pertama dan pengawasan keselamatan saat terjadi insiden."},
        {q:"Cairan pembersih yang standar dan aman digunakan untuk membersihkan kotoran minyak/gel pada serat kaca sebelum splicing adalah...",opts:["Alkohol Isopropil (IPA) kemurnian minimal 99%","Air sabun deterjen cair","Minyak tanah","Spiritus bakar"],ans:0,exp:"Alkohol isopropil (IPA) 99% menguap cepat tanpa meninggalkan residu air atau minyak yang dapat meningkatkan redaman sambungan."},
        {q:"Perlengkapan keselamatan yang wajib digunakan saat melakukan pekerjaan penarikan kabel fiber optik di atas tiang utilitas jalan raya adalah...",opts:["Full body harness dengan lanyard pengait ganda dan tali pemosisian kerja","Sabuk pinggang celana biasa","Tali tambang jemuran","Rompi kain tanpa pengait"],ans:0,exp:"Pekerjaan ketinggian di atas 1.8 meter wajib menggunakan Full Body Harness standar industri (EN 361) yang dikaitkan ke titik angkur yang kuat."},
        {q:"Tindakan yang DILARANG saat berada di meja kerja penyambungan (splicing) fiber optik adalah...",opts:["Makan, minum, merokok, dan mengusap mata dengan tangan telanjang","Menyalakan lampu kerja penerangan","Mencatat data redaman di buku laporan","Menggunakan kacamata pelindung"],ans:0,exp:"Makan, minum, atau mengusap mata di meja splicing sangat berisiko menyebabkan serpihan serat kaca tertelan atau menusuk mata melalui jari tangan."},
        {q:"Alat bantu Visual Fault Locator (VFL) memancarkan sinar laser berwarna merah kasat mata dengan panjang gelombang...",opts:["650 nm","1310 nm","1550 nm","850 nm"],ans:0,exp:"VFL menggunakan laser merah tampak pada spektrum kasat mata (~650 nm) dengan daya 1–30 mW untuk melacak kontinuitas dan kebocoran fisik serat."},
        {q:"Jika jari teknisi tertusuk serpihan serat optik mikro di lapangan, tindakan pertolongan pertama yang benar adalah...",opts:["Jangan menekan atau memijat area luka, cabut perlahan dengan pinset di bawah pencahayaan terang dan cuci dengan air mengalir","Membiarkannya hingga bernanah sendiri","Memukul jari dengan palu besi","Mengikat jari dengan karet gelang kencang"],ans:0,exp:"Serpihan kaca mudah pecah menjadi serbuk halus jika dipijat. Harus dicabut hati-hati dengan pinset presisi lalu dibersihkan."},
        {q:"Warna rompi keselamatan (Safety Vest) berstandar tinggi yang digunakan teknisi di tepi jalan raya berfungsi untuk...",opts:["Menyerap suhu panas matahari","Memberikan visibilitas tinggi (High-Visibility) dengan pita reflektif agar terlihat oleh pengemudi kendaraan","Menolak gigitan serangga","Menghangatkan tubuh saat hujan"],ans:1,exp:"Rompi hi-vis dengan pita retro-reflektif memantulkan cahaya lampu kendaraan sehingga teknisi aman dari bahaya tertabrak di jalur lalu lintas."},
        {q:"Bahaya utama yang dapat ditimbulkan oleh mesin fusion splicer jika digunakan di dekat kebocoran gas alam yang mudah terbakar adalah...",opts:["Percikan busur listrik elektroda (electric arc discharge) dapat memicu ledakan gas","Layar LCD splicer bisa buram","Baterai splicer cepat habis","Kabel charger korsleting"],ans:0,exp:"Fusion splicer menghasilkan loncatan bunga api listrik tegangan tinggi untuk meleburkan kaca, sehingga tidak boleh dinyalakan di atmosfer yang mengandung gas mudah terbakar."},
        {q:"Tanda rambu peringatan keselamatan berbentuk segitiga kuning dengan gambar matahari memancar di ruang ODF mengindikasikan bahaya...",opts:["Bahaya radiasi sinar laser tak kasat mata (Laser Radiation Hazard)","Bahaya lantai licin berair","Bahaya tegangan tinggi PLN","Bahaya kebisingan suara mesin"],ans:0,exp:"Rambu segitiga kuning dengan simbol pancaran sinar adalah peringatan bahaya radiasi laser optik kelas tinggi (Class 3B / Class 4)."},
        {q:"Mengapa teknisi diwajibkan menggunakan sarung tangan pelindung saat menarik kabel optik baja (armored cable)?",opts:["Agar tangan tidak kotor terkena lumpur saja","Melindungi telapak tangan dari goresan pita baja pelindung (steel tape armor) yang sangat tajam dan gesekan tarikan kabel","Memperlambat gerakan penarikan kabel","Menahan getaran suara kendaraan"],ans:1,exp:"Armored cable memiliki lapisan pita baja bergerigi yang sangat tajam saat jaket luarnya terkupas, berpotensi merobek kulit telapak tangan tanpa sarung tangan safety."},
        {type:"multi",q:"Alat Pelindung Diri (APD) WAJIB yang harus digunakan teknisi saat melakukan instalasi jaringan fiber optik di lapangan adalah...",opts:["Kacamata safety pelindung mata dari serpihan kaca","Helm pelindung kepala (Hard Hat) bersertifikat","Sepatu keselamatan dengan pelindung jari (Steel Toe Safety Shoes)","Rompi keselamatan dengan pita reflektif (High-Visibility Vest)","Sandal jepit santai"],ans:[0,1,2,3],exp:"Kacamata, helm, sepatu safety, dan rompi reflektif adalah APD wajib lapangan. Sandal jepit sangat dilarang."},
        {type:"multi",q:"Tindakan keselamatan kerja yang BENAR terkait penanganan serpihan serat kaca (fiber shards) adalah...",opts:["Menyediakan wadah penampung limbah serat bertutup di dekat cleaver","Menggunakan lakban perekat untuk mengangkat serpihan kaca yang jatuh di meja kerja","Mencuci tangan dengan sabun dan air mengalir setelah selesai proses terminasi","Menyeka sisa potongan serat optik menggunakan telapak tangan langsung","Memeriksa pakaian kerja sebelum pulang agar tidak membawa serpihan kaca ke rumah"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E adalah prosedur K3LH standar. Menyeka meja dengan telapak tangan telanjang sangat berbahaya karena serpihan dapat menancap ke pori-pori kulit."},
        {type:"multi",q:"Potensi bahaya keselamatan kerja yang sering dihadapi teknisi fiber optik di lingkungan kerja luar ruang (outdoor) meliputi...",opts:["Tersengat aliran listrik akibat kabel induksi atau kontak dengan kabel PLN di tiang bersama","Jatuh dari ketinggian saat bekerja di atas tangga atau tiang","Tertabrak kendaraan bermotor saat bekerja di tepi jalan raya tanpa barikade rambu kerucut (traffic cone)","Tertimbun longsoran tanah saat bekerja di dalam lubang galian duct bawah tanah","Kelebihan kuota download internet"],ans:[0,1,2,3],exp:"Bahaya outdoor meliputi tegangan listrik tiang, jatuh dari ketinggian, bahaya lalu lintas kendaraan, dan runtuhan parit manhole."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai bahaya radiasi laser pada sistem komunikasi serat optik adalah...",opts:["Cahaya laser 1310 nm dan 1550 nm tidak kasat mata oleh mata manusia normal","Kornea dan lensa mata memfokuskan cahaya laser langsung ke titik sensitif retina","Daya laser dari port OLT aktif dapat merusak sel fotoreseptor penglihatan","Semua sinar laser optik dapat dilihat dengan mata telanjang jika ruangan gelap gulita","Inspeksi konektor aktif wajib menggunakan fiber microscope khusus yang memiliki filter penahan sinar infra merah"],ans:[0,1,2,4],exp:"Cahaya laser telekomunikasi berada di spektrum inframerah (tak kasat mata). Mikroskop inspeksi konektor wajib dilengkapi filter optik pelindung IR."},
        {type:"multi",q:"Langkah-langkah tanggap darurat yang harus dilakukan jika terjadi kecelakaan kerja di lokasi penarikan kabel FO adalah...",opts:["Hentikan segera seluruh aktivitas pekerjaan dan amankan area insiden","Berikan pertolongan pertama pada kecelakaan (P3K) sesuai jenis luka","Hubungi nomor darurat medis atau rumah sakit terdekat jika korban membutuhkan penanganan lanjut","Laporkan kejadian kepada pimpinan tim K3 dan dokumentasikan kronologi insiden","Sembunyikan korban agar proyek tidak terkena denda penalti"],ans:[0,1,2,3],exp:"Tanggap darurat: hentikan pekerjaan, berikan P3K, panggil bantuan medis, dan laporkan insiden. Menyembunyikan insiden adalah pelanggaran hukum K3."},
    ],
    fo_tp12: [
        {q:"Urutan lapisan anatomi serat optik dari bagian terdalam ke bagian terluar adalah...",opts:["Core -> Cladding -> Coating -> Strength Member -> Outer Jacket","Cladding -> Core -> Coating -> Jacket","Outer Jacket -> Strength Member -> Core -> Cladding","Core -> Coating -> Cladding -> Jacket"],ans:0,exp:"Susunan anatomi serat optik dari dalam ke luar: Core (inti pemandu cahaya) -> Cladding (pemantul) -> Coating (pelindung akrilat) -> Strength Member (Kevlar/FRP) -> Outer Jacket."},
        {q:"Diameter standar Core dan Cladding pada kabel Single Mode Fiber (SMF) telekomunikasi adalah...",opts:["9 µm (Core) dan 125 µm (Cladding)","50 µm (Core) dan 125 µm (Cladding)","62.5 µm (Core) dan 250 µm (Cladding)","9 µm (Core) dan 900 µm (Cladding)"],ans:0,exp:"Standar Single Mode Fiber (ITU-T G.652): diameter inti core 9 µm dan diameter cladding 125 µm (notasi 9/125 µm)."},
        {q:"Standar serat optik yang dirancang khusus tahan terhadap tekukan ekstrem (Bend Insensitive) untuk jalur indoor rumah pelanggan FTTx adalah...",opts:["ITU-T G.657 (G.657.A / G.657.B)","ITU-T G.652.D","ITU-T G.651.1 (Multimode)","ITU-T G.655 (NZDSF)"],ans:0,exp:"ITU-T G.657 adalah standar serat bend-insensitive yang mampu ditekuk hingga radius 7.5 mm s/d 5 mm tanpa lonjakan redaman, sangat ideal untuk kabel drop FTTx."},
        {q:"Kabel serat optik jenis 'Loose Tube' diisi dengan gel hidrofobik thixotropic di dalam tabungnya yang berfungsi untuk...",opts:["Mencegah masuknya rembesan air/kelembapan dan memberikan ruang gerak saat kabel memuai/menyusut","Melumasi kabel agar mudah ditarik","Membuat kabel menjadi penghantar listrik","Menambah bobot kabel agar tidak terbang tertiup angin"],ans:0,exp:"Water-blocking gel pada loose tube menolak air dan memungkinkan serat mengapung bebas tanpa tegangan saat kabel memuai/menyusut akibat suhu ekstrem."},
        {q:"Urutan warna standar ke-12 serat optik dalam satu tube menurut kode warna TIA/EIA-598 dan standar Telkom dari nomor 1 sampai 6 adalah...",opts:["Biru, Orange, Hijau, Cokelat, Abu-abu, Putih","Merah, Hitam, Kuning, Ungu, Pink, Toska","Putih, Cokelat, Hijau, Orange, Biru, Abu-abu","Hitam, Putih, Merah, Kuning, Hijau, Biru"],ans:0,exp:"Kode warna 1–6: 1=Biru, 2=Orange, 3=Hijau, 4=Cokelat, 5=Abu-abu, 6=Putih. Urutan 7–12: 7=Merah, 8=Hitam, 9=Kuning, 10=Ungu, 11=Pink, 12=Toska."},
        {q:"Batas radius tekuk minimum (Minimum Bend Radius) yang aman saat melakukan PENARIKAN (instalasi dinamis) kabel FO umumnya sebesar...",opts:["Minimal 20 kali diameter luar kabel","Minimal 2 kali diameter kabel","Boleh ditekuk tajam 90 derajat","Tidak ada batasan kelengkungan"],ans:0,exp:"Standar instalasi menetapkan radius tekukan dinamis saat penarikan minimal 20x diameter kabel, dan 10-15x diameter kabel saat posisi statis terpasang."},
        {q:"Aksesoris tiang yang berfungsi menahan beban tarikan mati di tiang awal, tiang akhir, dan tiang belokan tajam adalah...",opts:["Tension Clamp (Dead-End Clamp / Wedge Clamp)","Suspension Clamp","Pipa Conduit PVC","Patchcord LC"],ans:0,exp:"Tension clamp (wedge clamp/anchor clamp) mencengkeram kawat penggantung kabel untuk menahan beban regangan horizontal di titik belokan atau tiang akhir."},
        {q:"Aksesoris tiang yang berfungsi menopang kabel udara lurus di tiang tengah tanpa mencengkeram mati kabel disebut...",opts:["Suspension Clamp","Anchoring Clamp","Optical Attenuator","Pigtail SC"],ans:0,exp:"Suspension clamp menopang kabel udara pada tiang-tiang lintasan lurus (tangent poles) agar kabel tetap menggantung dengan kelenturan aman."},
        {q:"Fenomena kelengkungan mikro pada serat optik akibat tekanan mekanis klem yang terlalu kencang atau permukaan kasar yang menyebabkan sinyal cahaya bocor disebut...",opts:["Microbending Loss","Macrobending Loss","Total Internal Reflection","Chromatic Dispersion"],ans:0,exp:"Microbending adalah lekukan mikroskopis pada sumbu inti serat akibat tekanan lateral yang menyebabkan sudut datang cahaya melanggar sudut kritis pemantulan total."},
        {q:"Alat pemandu rol yang dipasang di sudut belokan parit atau tiang saat penarikan kabel agar kulit kabel tidak tergores gesekan beton/tanah disebut...",opts:["Cable Roller (Rol Kabel)","Fusion Splicer","Optical Power Meter","Crimping Tool"],ans:0,exp:"Cable roller (corner roller / trench roller) berputar bebas mengurangi gaya gesek dan menjaga kelengkungan aman kabel saat ditarik mesin winch."},
        {q:"Bahan jaket kabel yang sangat disarankan untuk instalasi di dalam gedung bertingkat karena tidak mengeluarkan gas asam beracun saat terbakar api adalah...",opts:["LSZH (Low Smoke Zero Halogen)","PVC konvensional","Polyethylene (PE)","Karet ban bekas"],ans:0,exp:"Kabel LSZH menghasilkan asap minimal dan tidak melepaskan gas halogen beracun (seperti klorin/bromin) saat terpapar kebakaran gedung."},
        {q:"Kabel serat optik udara (Aerial Cable) jenis Figure-8 memiliki ciri khas fisik yaitu...",opts:["Memiliki kawat baja penggantung eksternal (messenger wire) yang menyatu dalam cetakan jaket berbentuk angka 8","Memiliki 8 inti serat yang berbentuk bulat","Hanya dapat ditarik sejauh 8 meter","Memiliki 8 lapis jaket pelindung"],ans:0,exp:"Kabel Figure-8 memiliki messenger wire logam atau FRP terintegrasi di atas tabung optik membentuk penampang seperti angka 8."},
        {q:"Jarak andongan (sag) yang sengaja dibuat melengkung longgar (sekitar 1-2% dari jarak span tiang) pada bentangan kabel udara bertujuan untuk...",opts:["Mengantisipasi penyusutan kabel akibat penurunan suhu udara malam hari dan hembusan angin agar tiang tidak patah","Membuat kabel terlihat lebih indah dipandang","Tempat bertengger burung liar","Menambah kapasitas bandwidth kabel"],ans:0,exp:"Andongan (sag) memberikan ruang toleransi ekspansi/kontraksi termal kabel akibat perubahan cuaca panas-dingin dan beban tiupan angin kencang."},
        {q:"Kabel fleksibel 1-2 core berpenampang pipih yang ditarik dari kotak ODP di tiang menuju ke rumah pelanggan (roset) disebut kabel...",opts:["Drop Cable (Drop Core)","Feeder Cable 96 Core","Submarine Cable bawah laut","Kabel Koaksial RG-6"],ans:0,exp:"Drop cable (drop core) 1-2 core adalah kabel last-mile FTTx berdiameter kecil dan fleksibel yang menghubungkan ODP ke roset pelanggan."},
        {q:"Pipa plastik tebal berbahan Polyethylene yang ditanam di bawah tanah sebagai saluran pelindung kabel fiber optik disebut...",opts:["Pipa HDPE (High-Density Polyethylene) / Subduct","Pipa paralon air PVC tipis","Selang air taman","Talang seng galvanis"],ans:0,exp:"Pipa subduct HDPE memiliki ketahanan tekan tinggi, tahan korosi tanah, dan permukaan dalam berulir/berpelumas untuk penarikan kabel duct jarak jauh."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai struktur dan karakteristik kabel Single Mode Fiber (SMF) adalah...",opts:["Diameter inti core sangat kecil berkisar antara 8 hingga 10 mikron (standar 9 µm)","Cahaya merambat lurus sejajar sumbu serat dengan dispersi modal mendekati nol","Sangat cocok untuk transmisi data jarak jauh (MAN, WAN, dan backbone antar-kota)","Diameter inti core sebesar 50 hingga 62.5 mikron","Menggunakan panjang gelombang kerja utama 1310 nm dan 1550 nm"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Pilihan D adalah ciri khas Multimode Fiber (MMF)."},
        {type:"multi",q:"Warna-warna serat optik yang termasuk dalam urutan 6 serat pertama (Nomor 1 sampai 6) menurut standar TIA/EIA-598 adalah...",opts:["Serat nomor 1 berwarna Biru","Serat nomor 2 berwarna Orange","Serat nomor 3 berwarna Hijau","Serat nomor 4 berwarna Cokelat","Serat nomor 5 berwarna Merah"],ans:[0,1,2,3],exp:"Urutan: 1=Biru, 2=Orange, 3=Hijau, 4=Cokelat, 5=Abu-abu, 6=Putih. Serat Merah adalah nomor 7."},
        {type:"multi",q:"Peralatan mekanik dan perkakas yang digunakan dalam pekerjaan penarikan kabel fiber optik tanah (Duct) meliputi...",opts:["Kabel Winch (mesin penarik kabel dengan pengukur tegangan tarik)","Fish tape / duct rodder (kawat pemancing serat kaca)","Cable pulling lubricant (gel pelumas penarikan)","Swivel (konektor putar anti-puntir antara tali penarik dan kabel)","Tang crimping kabel UTP RJ-45"],ans:[0,1,2,3],exp:"Instalasi duct menggunakan winch, duct rodder, pulling lubricant, dan swivel anti-twist. Tang crimping RJ-45 tidak digunakan dalam penarikan kabel duct."},
        {type:"multi",q:"Kerusakan yang dapat terjadi jika kabel fiber optik ditarik melebihi batas kekuatan tarik (Max Tensile Strength) adalah...",opts:["Serat kaca silika di dalam inti meregang dan mengalami micro-fracture (retak mikro)","Redaman sinyal optik melonjak drastis saat diukur","Serat putus total di dalam jaket kabel tanpa terlihat robek dari luar (internal break)","Jaket luar kabel mengecil dan kehilangan elastisitas","Warna jaket kabel berubah menjadi ungu secara spontan"],ans:[0,1,2,3],exp:"Tarikan berlebih menyebabkan retak mikro, lonjakan atenuasi, deformasi jaket, dan serat putus di dalam. Warna jaket tidak berubah warna spontan."},
        {type:"multi",q:"Aksesoris pelindung dan penataan jalur kabel serat optik di tiang dan rak meliputi...",opts:["Joint Closure (kotak sambung kedap air di udara/manhole)","Slack storage / bracket sisa kabel (tempat menggulung cadangan kabel)","Pole strap / stainless steel band (plat baja pengikat klem ke tiang)","Kabel ties tahan panas matahari (UV-resistant cable ties)","Lem kertas anak sekolah"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D adalah aksesoris standar outdoor tiang. Lem kertas biasa tidak tahan cuaca dan tidak standar."},
    ],
    fo_tp13: [
        {q:"Tipe konektor serat optik yang memiliki bodi persegi plastik dengan mekanisme penguncian dorong-tarik (Push-Pull) dan ferrule 2.5 mm adalah...",opts:["Konektor SC (Subscriber Connector)","Konektor LC (Lucent Connector)","Konektor FC (Ferrule Connector)","Konektor ST (Straight Tip)"],ans:0,exp:"Konektor SC berbentuk kotak persegi dengan mekanisme push-pull dan ferrule keramik 2.5 mm, merupakan standar umum perangkat GPON dan ODP."},
        {q:"Konektor LC (Lucent Connector) sangat populer dan banyak digunakan pada modul transreceiver SFP/SFP+ switch modern karena...",opts:["Bentuknya ringkas (Small Form Factor) dengan ferrule 1.25 mm sehingga menghemat ruang port kepadatan tinggi","Menggunakan bahan logam besi terberat","Dapat dipasang tanpa memotong kabel","Harganya gratis dari pabrik"],ans:0,exp:"Konektor LC berukuran setengah dari SC (ferrule 1.25 mm), memungkinkan kepadatan port ganda (high density) pada modul switch SFP."},
        {q:"Tipe konektor FC (Ferrule Connector) menggunakan mekanisme penguncian berbentuk...",opts:["Ulir sekrup putar logam (Screw-on threaded metal)","Dorong tarik plastik tanpa ulir","Pengait bayonet putar setengah lingkaran","Jepitan magnet"],ans:0,exp:"Konektor FC berbodi logam dengan mekanisme ulir sekrup (screw-on), sangat presisi dan tahan getaran mekanis, lazim pada alat ukur OTDR dan ODF transmisi."},
        {q:"Perbedaan mendasar antara polishing ferrule tipe UPC (warna biru) dan APC (warna hijau) adalah...",opts:["Ujung ferrule APC dipoles miring dengan sudut 8 derajat untuk meminimalkan pantulan balik (Optical Return Loss)","UPC hanya untuk kabel tembaga","APC menghantarkan arus listrik AC","Konektor UPC tahan terhadap api 1000 derajat"],ans:0,exp:"APC (Angled Physical Contact) memiliki sudut kemiringan 8° sehingga cahaya pantul dibuang ke cladding, menghasilkan Return Loss sangat tinggi (≥ 60 dB). Bodi konektor APC diberi warna hijau standar."},
        {q:"Apa akibat jika konektor UPC (warna biru) dipaksakan dicolokkan langsung ke adapter dengan konektor APC (warna hijau)?",opts:["Permukaan ferrule akan bertabrakan tidak rata, merusak ujung serat kaca secara permanen, dan menimbulkan redaman sangat tinggi","Sinyal otomatis bertambah cepat","Konektor berubah warna menjadi kuning","Tidak ada pengaruh apa pun karena ukuran sama"],ans:0,exp:"Permukaan datar cembung UPC akan bergesekan keras dengan bidang miring 8° APC, menyebabkan goresan permanen pada core serat dan rugi daya masif."},
        {q:"Seutas kabel serat optik pendek yang memiliki konektor di KEDUA ujungnya disebut...",opts:["Patchcord","Pigtail","Drop wire polos","Cleaver"],ans:0,exp:"Patchcord adalah kabel jumper serat optik dengan konektor terpasang di kedua ujungnya (misal SC-SC, SC-LC, LC-LC)."},
        {q:"Seutas serat optik pendek yang HANYA memiliki konektor di SATU ujungnya, sedangkan ujung lainnya berupa serat polos untuk di-splice ke kabel utama disebut...",opts:["Pigtail","Patchcord duplex","Adapter coupler","Fast connector"],ans:0,exp:"Pigtail hanya berkonektor di satu sisi, digunakan di dalam baki ODF/OTB untuk terminasi sambungan lebur (splice-on) kabel feeder/distribusi."},
        {q:"Optical Splitter pasif bertipe PLC 1:8 memiliki nilai redaman sisipan teoritis (Insertion Loss) sekitar...",opts:["± 10.5 dB","± 0.2 dB","± 3.5 dB","± 25.0 dB"],ans:0,exp:"Splitter membagi daya secara logaritmik: 1:2 ≈ 3.5 dB, 1:4 ≈ 7.2 dB, 1:8 ≈ 10.5 dB, 1:16 ≈ 13.8 dB, 1:32 ≈ 17.5 dB."},
        {q:"Konektor lapangan yang dapat dipasang langsung pada kabel drop core tanpa memerlukan mesin pelebur busur listrik disebut...",opts:["Fast Connector (Field Assembly Connector / Mechanical Connector)","Konektor RJ-45","Splicer sleeve","Fusion core"],ans:0,exp:"Fast connector memanfaatkan gel indeks optik (index matching gel) di dalam bodinya untuk menyatukan serat lapangan dengan serat prafabrikasi pabrik secara mekanik."},
        {q:"Kotak terminasi dan distribusi berkapasitas besar yang ditempatkan di Central Office (STO) sebagai titik temu kabel feeder luar dan perangkat OLT adalah...",opts:["ODF (Optical Distribution Frame)","ODP tiang","Roset dinding","Media converter"],ans:0,exp:"ODF (Optical Distribution Frame) berbentuk rak besar di ruang transmisi STO/NOC tempat terminasi ribuan core kabel feeder."},
        {q:"Kotak distribusi luar ruang yang membagi kabel feeder utama menjadi beberapa kabel distribusi menuju ODP di jalan-jalan disebut...",opts:["ODC (Optical Distribution Cabinet)","Roset indoor","ONT modem","SFP Transceiver"],ans:0,exp:"ODC adalah kabinet pelat logam tahan cuaca di pinggir jalan yang menampung splitter pasif primer dan mendistribusikan jalur ke berbagai ODP."},
        {q:"Titik terminasi optik berupa kotak putih kecil yang dipasang di dinding dalam rumah pelanggan dekat perangkat modem ONT disebut...",opts:["Roset Optik (Optical Wall Outlet)","ODC tiang","ODF rack","Joint Closure"],ans:0,exp:"Roset optik (wall outlet) adalah titik akhir instalasi kabel drop di dalam rumah tempat koneksi patchcord menuju ke ONT pelanggan."},
        {q:"Tisu khusus yang wajib digunakan untuk membersihkan konektor dan serat optik karena tidak meninggalkan serat debu mikro disebut...",opts:["Tisu Lint-Free (bebas serat, misal Kimwipes)","Tisu dapur berminyak","Tisu basah wangi bayi","Koran bekas"],ans:0,exp:"Tisu lint-free tidak rontok saat diusapkan, mencegah residu debu mikroskopis menempel pada permukaan ferrule keramik konektor."},
        {q:"Alat pembersih mekanis otomatis berbentuk pena tekan (One-Click Cleaner) digunakan untuk...",opts:["Membersihkan permukaan ferrule konektor yang berada di dalam adapter tanpa perlu melepas konektor","Memotong kabel optik","Mengukur daya transmisi","Menyambung serat optik dengan lem"],ans:0,exp:"One-click optical pen cleaner menggunakan pita kain pembersih berputar yang membersihkan ujung ferrule di dalam adapter port dengan satu kali dorongan klik."},
        {q:"Tutup pelindung plastik kecil (Dust Cap) yang terpasang pada port adapter dan konektor baru berfungsi untuk...",opts:["Mencegah partikel debu, minyak, dan goresan mengotori permukaan ferrule optik saat tidak terhubung kabel","Menghambat aliran cahaya agar hemat listrik","Menambah nilai estetika warna-warni","Mengunci konektor agar tidak bisa dicabut"],ans:0,exp:"Dust cap wajib selalu terpasang pada port adapter dan konektor yang tidak terpakai; satu partikel debu berukuran 2 mikron dapat menghalangi core 9 mikron dan merusak transmisi."},
        {type:"multi",q:"Tipe-tipe konektor serat optik yang banyak digunakan di industri telekomunikasi dan jaringan komputer adalah...",opts:["Konektor SC (Subscriber Connector) push-pull persegi","Konektor LC (Lucent Connector) small form factor","Konektor FC (Ferrule Connector) ulir presisi","Konektor ST (Straight Tip) bayonet coupling","Konektor RCA audio video analog"],ans:[0,1,2,3],exp:"SC, LC, FC, dan ST adalah standar konektor fiber optic. RCA adalah konektor analog kabel tembaga audio/video."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai perbedaan polishing UPC dan APC pada ferrule konektor adalah...",opts:["Konektor UPC memiliki warna standar biru pada bodi dan boot-nya","Konektor APC memiliki warna standar hijau pada bodi dan boot-nya","Konektor APC memiliki nilai redaman pantulan balik (Return Loss) yang jauh lebih baik (≥ 60 dB)","Konektor UPC dan APC memiliki sudut kemiringan ferrule yang identik sama persis","APC sangat direkomendasikan untuk layanan RF Video Overlay dan transmisi FTTx sensitif"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E benar. Pilihan D salah karena UPC berbidang datar cembung sedangkan APC dipoles miring 8 derajat."},
        {type:"multi",q:"Langkah-langkah yang BENAR dalam prosedur terminasi konektor Fast Connector (tipe manual/mekanik) adalah...",opts:["Mengupas jaket luar drop cable dan lapisan coating serat sepanjang ukuran penuntun (guide gauge)","Membersihkan serat polos menggunakan tisu lint-free yang dibasahi alkohol IPA 99%","Memotong serat menggunakan precision fiber cleaver dengan panjang potong presisi","Menyelipkan serat ke dalam bodi fast connector hingga melengkung sedikit (fiber bend) lalu mengunci latch","Membakar serat optik menggunakan korek api gas sebelum dipasang"],ans:[0,1,2,3],exp:"Tahapan fast connector: kupas ukuran presisi, bersihkan alkohol IPA 99%, potong dengan cleaver, masukkan hingga serat sedikit melengkung di dalam gel, lalu kunci. Membakar dengan korek api merusak serat."},
        {type:"multi",q:"Komponen-komponen pasif yang dijumpai di sepanjang arsitektur jaringan FTTH (Fiber to the Home) meliputi...",opts:["Optical Distribution Frame (ODF) di Central Office","Optical Distribution Cabinet (ODC) di titik distribusi utama","Passive Optical Splitter (pembagi sinyal 1:4, 1:8, 1:16)","Optical Distribution Point (ODP) di tiang lingkungan pelanggan","Optical Network Terminal (ONT) di rumah pelanggan"],ans:[0,1,2,3],exp:"ODF, ODC, Splitter, dan ODP adalah perangkat pasif jaringan (tanpa listrik). ONT adalah perangkat aktif yang membutuhkan catu daya listrik AC/DC."},
        {type:"multi",q:"Praktik terbaik (Best Practice) dalam pemeliharaan kebersihan konektor dan adapter fiber optik adalah...",opts:["Selalu memasang penutup debu (dust cap) saat konektor tidak terhubung","Memeriksa kebersihan permukaan ferrule dengan fiber microscope (video inspection scope)","Membersihkan konektor setiap kali sebelum dicolokkan ke adapter port perangkat","Meniup konektor dengan napas mulut untuk menghilangkan debu","Menggunakan alat pembersih lint-free khusus optik (optical cassette cleaner / one-click pen)"],ans:[0,1,2,4],exp:"Pilihan A, B, C, dan E adalah prosedur pemeliharaan standar industri. Meniup dengan napas mulut justru mencemari ferrule dengan uap air liur dan minyak."},
    ],
    fo_tp21: [
        {q:"Tujuan utama penggunaan mesin Fusion Splicer dalam penyambungan dua serat optik adalah...",opts:["Menyambung dua ujung serat kaca secara permanen menggunakan busur listrik sehingga menghasilkan redaman serendah mungkin","Membungkus kabel dengan solasiban","Mengukur panjang gelombang cahaya laser","Memotong jaket luar kabel PVC"],ans:0,exp:"Fusion splicer meleburkan ujung kedua serat kaca pada suhu ~2000°C menggunakan lecutan busur listrik elektroda, menghasilkan kontinuitas optik permanen dengan loss minimal (≤ 0.05 dB)."},
        {q:"Alat pengupas khusus serat optik yang memiliki tiga lubang presisi dengan fungsi berbeda disebut...",opts:["Fiber Stripper (Miller Stripper / Pengupas 3 Lubang)","Crimping Tool RJ-45","Punch Down Tool","Gergaji besi"],ans:0,exp:"Miller stripper 3-hole mengupas jaket luar 2-3 mm (lubang 1), buffer 900 µm (lubang 2), dan coating akrilat 250 µm menjadi bare fiber 125 µm (lubang 3) tanpa menggores kaca."},
        {q:"Alat pemotong presisi tinggi yang digunakan untuk mematahkan serat kaca menghasilkan permukaan bidang siku 90 derajat sempurna sebelum splicing disebut...",opts:["Precision Fiber Cleaver","Gunting kertas","Pisau cutter bangunan","Tang potong tembaga"],ans:0,exp:"Cleaver menggunakan mata pisau tungsten/diamond berputar presisi untuk membuat goresan mikro lalu mematahkan serat dengan sudut cleave tegak lurus sempurna (< 0.5°)."},
        {q:"Selongsong pelindung sambungan yang berisi batang penguat baja kaku dan plastik menyusut panas (Heat Shrinkable Sleeve) disebut...",opts:["Protection Sleeve (Splice Protector Sleeve)","Pigtail","Fast connector","Adapter SC"],ans:0,exp:"Protection sleeve dimasukkan ke serat sebelum pengupasan, lalu dipanaskan di oven splicer setelah leburan untuk menopang sambungan kaca agar tidak patah."},
        {q:"Kapan waktu yang TEPAT untuk memasukkan protection sleeve ke dalam serat optik?",opts:["SEBELUM serat dikupas dan dipotong dengan cleaver","Setelah kedua serat selesai dilebur dengan mesin splicer","Setelah kabel dirapikan di rak ODF","Kapan saja boleh bebas"],ans:0,exp:"Protection sleeve WAJIB diselipkan ke salah satu serat SEBELUM serat dikupas atau di-cleave. Jika lupa, sambungan harus dipotong dan diulang dari awal."},
        {q:"Mengapa ujung serat optik yang SUDAH DIPOTONG oleh cleaver TIDAK BOLEH lagi dibersihkan atau diusap dengan alkohol/tisu?",opts:["Karena usapan tisu akan meninggalkan partikel debu dan minyak pada bidang potong presisi yang baru dibuat","Karena serat akan langsung meleleh","Karena alkohol dapat membuat serat patah","Karena cleaver sudah otomatis mencuci serat"],ans:0,exp:"Prosedur wajib: Strip -> Clean dengan alkohol IPA -> Cleave -> Langsung pasang ke splicer. Mengusap serat pasca-cleave merusak bidang potong mikroskopis."},
        {q:"Teknologi penyelarasan serat pada fusion splicer modern kelas atas yang menggunakan mikroskop kamera ganda (sumbu X dan Y) untuk menyelaraskan inti serat secara riil disebut...",opts:["Core Alignment (Profile Alignment System - PAS)","Cladding Alignment V-Groove tetap","Manual Alignment mata telanjang","Mechanical Twist Alignment"],ans:0,exp:"Core Alignment (PAS) mendeteksi profil indeks bias inti kaca pada sumbu X dan Y menggunakan motor mikro independen, menjamin loss terendah meski diameter cladding tidak simetris."},
        {q:"Standar ambang batas redaman maksimal untuk satu titik sambungan fusion splicing menurut standar Telkom dan industri telekomunikasi adalah...",opts:["Maksimal ≤ 0.10 dB (rata-rata teknisi andal mencapai ≤ 0.02 - 0.05 dB)","Maksimal 3.0 dB","Boleh mencapai 10.0 dB","Tidak ada batas toleransi"],ans:0,exp:"Standar Telkom menetapkan loss hasil penyambungan fusion maksimal 0.10 dB per splice (biasanya target < 0.03 dB). Jika di atas 0.10 dB, sambungan wajib diulang."},
        {q:"Penyebab utama munculnya gelembung udara (bubble) pada titik leburan sambungan serat di layar monitor splicer adalah...",opts:["Serat kotor tertempel debu/minyak atau cairan alkohol pembersih belum kering sempurna saat busur api listrik menyala","Baterai splicer terlalu penuh","Kabel terlalu panjang","Lampu ruangan terlalu redup"],ans:0,exp:"Sisa alkohol yang belum menguap atau kotoran organik yang terbakar busur elektroda menghasilkan gas yang terperangkap menjadi gelembung rongga udara di dalam kaca."},
        {q:"Uji otomatis yang dilakukan oleh fusion splicer tepat setelah busur listrik selesai meleburkan serat dengan cara menarik serat berdaya 200 gram disebut...",opts:["Tension Test (Uji Tarik Mekanis)","Optical Power Test","Cleave Angle Test","Battery Test"],ans:0,exp:"Tension test (gaya tarik ~200 gram) dilakukan motor splicer untuk membuktikan sambungan kaca memiliki kekuatan mekanis yang kokoh sebelum dikeluarkan."},
        {q:"Baki plastik di dalam joint closure atau ODF yang digunakan untuk menata lingkaran gulungan sisa serat dan menjepit protection sleeve sambungan secara rapi disebut...",opts:["Splice Tray (Kaset Sambung)","Cable Duct","Splitter box","Power Supply"],ans:0,exp:"Splice tray menampung sambungan dan menyediakan alur jalur melingkar dengan radius aman agar serat tidak tertekuk tajam."},
        {q:"Tindakan kalibrasi yang wajib dilakukan pada mesin fusion splicer saat berpindah lokasi kerja ke area dengan perbedaan suhu, tekanan udara, atau kelembapan drastis adalah...",opts:["Arc Calibration (Kalibrasi Busur Listrik)","Format memory","Ganti layar monitor","Ganti colokan listrik"],ans:0,exp:"Arc Calibration menguji intensitas dan durasi loncatan api elektroda di kondisi atmosfer lingkungan setempat agar suhu leleh kaca tepat sempurna."},
        {q:"Bagian pada fusion splicer berupa alur presisi berbentuk huruf 'V' berbahan keramik tempat meletakkan serat optik disebut...",opts:["V-Groove","Heater Oven","LCD Monitor","Electrode Cap"],ans:0,exp:"V-Groove adalah lekukan keramik presisi berbentuk V yang menahan kelurusan posisi bare fiber 125 mikron."},
        {q:"Pembersihan rutin alur V-groove dan lensa kamera mikroskop pada mesin fusion splicer dilakukan menggunakan...",opts:["Cotton bud (kapas pentol) yang dibasahi alkohol IPA 99%","Kuas kawat besi","Jarum jahit yang tajam","Air keran wastafel"],ans:0,exp:"Cotton bud bersih yang dibasahi sedikit alkohol IPA 99% digunakan menyeka lembut partikel debu dari V-groove dan lensa tanpa menggores permukaan."},
        {q:"Komponen pemanas pada bodi splicer yang digunakan untuk menyusutkan selongsong protection sleeve setelah proses penyambungan disebut...",opts:["Heater Oven (Tube Heater)","Cooling Tray","Electrode Arc","Wind Protector"],ans:0,exp:"Heater oven memanaskan protection sleeve pada suhu ~180°C s/d 220°C selama 15–30 detik hingga selongsong menyusut rapat melindungi sambungan."},
        {type:"multi",q:"Peralatan dan bahan yang WAJIB tersedia di meja kerja penyambungan (splicing) serat optik adalah...",opts:["Mesin Fusion Splicer dengan baterai terisi penuh","Fiber Cleaver presisi tinggi","Fiber Stripper 3 lubang","Protection Sleeve dan alkohol Isopropil 99% serta tisu lint-free","Gergaji mesin potong kayu"],ans:[0,1,2,3],exp:"Splicer, cleaver, stripper, protection sleeve, alkohol IPA 99%, dan tisu lint-free adalah perangkat inti splicing. Gergaji mesin kayu tidak digunakan."},
        {type:"multi",q:"Urutan Standar Operasional Prosedur (SOP) pelaksanaan Fusion Splicing yang BENAR adalah...",opts:["1. Masukkan protection sleeve ke salah satu helai serat","2. Kupas jaket dan coating serat menggunakan stripper sepanjang 3-4 cm","3. Bersihkan serat polos dengan tisu lint-free beralkohol IPA 99%","4. Potong serat menggunakan cleaver presisi 90 derajat","5. Letakkan serat pada V-groove splicer, tutup cover, dan tekan tombol SPLICE"],ans:[0,1,2,3,4],exp:"Seluruh tahapan dari langkah 1 sampai 5 adalah urutan SOP baku penyambungan fusion splicing yang wajib diikuti teknisi secara disiplin."},
        {type:"multi",q:"Penyebab terjadinya kegagalan splicing atau estimasi redaman sambungan terdeteksi BURUK (> 0.1 dB) oleh mesin adalah...",opts:["Sudut potong serat (cleave angle) miring melebihi 1 derajat","Ujung serat kotor terkena debu atau minyak jari tangan","Alur V-groove splicer kotor sehingga posisi serat tidak lurus","Elektroda aus atau intensitas busur listrik belum dikalibrasi (arc calibration)","Warna bodi luar mesin splicer berwarna kuning"],ans:[0,1,2,3],exp:"Cleave miring, kotoran debu, V-groove kotor, dan elektroda aus adalah penyebab utama kegagalan splice. Warna bodi mesin tidak mempengaruhi teknis optik."},
        {type:"multi",q:"Tindakan pemeliharaan preventif yang BENAR untuk mesin Fusion Splicer meliputi...",opts:["Membersihkan V-groove secara berkala dengan cotton bud beralkohol IPA","Melakukan Arc Calibration saat mengganti jenis kabel atau berpindah lokasi iklim","Membersihkan lensa cermin mikroskop kamera dari partikel debu","Mengganti elektroda tungsten secara berkala setelah mencapai batas hitungan pemakaian (3000-5000 arc)","Mencuci mesin splicer dengan air deterjen mengalir"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D adalah pemeliharaan preventif resmi. Menyiram splicer dengan air akan menyebabkan korsleting fatal komponen elektronik internal."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai penataan sambungan pada Splice Tray (Kaset Sambung) adalah...",opts:["Protection sleeve dijepitkan kuat pada slot penjepit karet/plastik di tray","Sisa serat digulung melingkar dengan radius tekukan aman (minimal 30 mm)","Serat tidak boleh bersilangan acak atau terjepit penutup baki kaset","Setiap kaset diberi label nomor core dan arah tujuan kabel","Serat ditekuk patah 90 derajat agar muat banyak di dalam kaset"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D benar. Menekuk serat patah 90 derajat akan langsung mematahkan inti kaca dan memutus koneksi."},
    ],
    fo_tp22: [
        {q:"Instrumen optik yang berfungsi mengukur daya radiasi cahaya yang keluar dari ujung serat dalam satuan dBm atau milliwatt adalah...",opts:["Optical Power Meter (OPM)","Optical Light Source (OLS)","Visual Fault Locator (VFL)","Fusion Splicer"],ans:0,exp:"OPM (Optical Power Meter) adalah alat ukur daya optik absolut (dBm) yang mengukur intensitas cahaya yang diterima detektor fotodioda."},
        {q:"Instrumen yang menghasilkan cahaya laser stabil pada panjang gelombang tertentu (1310/1550 nm) sebagai sumber pengujian transmisi kabel disebut...",opts:["Optical Light Source (OLS)","Optical Power Meter (OPM)","Cleaver","LAN Tester"],ans:0,exp:"OLS (Optical Light Source) menghasilkan sumber daya cahaya konstan (CW) yang dipasangkan bersama OPM untuk mengukur insertion loss."},
        {q:"Nilai daya optik sebesar 1 milliwatt (1 mW) jika dikonversikan ke dalam satuan logaritmik decibel-milliwatt (dBm) bernilai...",opts:["0 dBm","+10 dBm","-10 dBm","1 dBm"],ans:0,exp:"Rumus: $P_{\\text{dBm}} = 10 \\cdot \\log_{10}(P_{\\text{mW}} / 1\\text{ mW})$. Untuk 1 mW: $10 \\cdot \\log_{10}(1) = 0\\text{ dBm}$."},
        {q:"Jika daya sumber masuk sebesar +3 dBm dan daya yang terukur di ujung penerima sebesar -18 dBm, maka total redaman kabel (Insertion Loss) adalah...",opts:["21 dB","-15 dB","-21 dB","15 dB"],ans:0,exp:"Loss (dB) = Pin (dBm) − Pout (dBm) = (+3 dBm) − (-18 dBm) = 3 + 18 = 21 dB."},
        {q:"Proses kalibrasi titik nol (Loopback Reference / Zeroing) pada OPM sebelum menguji kabel jaringan bertujuan untuk...",opts:["Mengeliminasi redaman patchcord referensi sehingga hasil ukur murni mencerminkan redaman kabel jaringan yang diuji","Menghapus memori kartu SD","Mengisi baterai OPM secara otomatis","Membuat kabel menjadi dingin"],ans:0,exp:"Kalibrasi referensi nol (Zeroing / REF) mencatat daya keluaran sumber melalui jumper referensi, sehingga loss jumper referensi tidak ikut terhitung dalam pengukuran kabel uji."},
        {q:"Redaman spesifik kabel Single Mode Fiber standar (G.652) pada panjang gelombang 1310 nm dan 1550 nm rata-rata sebesar...",opts:["± 0.35 dB/km pada 1310 nm dan ± 0.22 dB/km pada 1550 nm","± 3.5 dB/km pada 1310 nm dan ± 5.0 dB/km pada 1550 nm","10 dB/km pada seluruh panjang gelombang","0 dB/km tanpa redaman"],ans:0,exp:"Panjang gelombang 1550 nm memiliki atenuasi Rayleigh lebih rendah (~0.22 dB/km) dibanding 1310 nm (~0.35 dB/km), menjadikannya ideal untuk jarak jauh."},
        {q:"Rentang daya terima sinyal optik (Rx Power) yang IDEAL dan direkomendasikan pada modem ONT pelanggan GPON agar internet stabil adalah...",opts:["-8 dBm hingga -24 dBm","+10 dBm hingga +30 dBm","-35 dBm hingga -50 dBm","0 dBm tepat"],ans:0,exp:"Standar GPON ITU-T G.984: daya terima optimal ONT antara -8 dBm s/d -24 dBm. Jika daya lebih rendah dari -27/-28 dBm, modem akan mengalami Loss of Signal (LOS)."},
        {q:"Apa yang terjadi jika daya optik yang masuk ke penerima ONT terlalu kuat (melebihi batas Overload Power, misal > -5 dBm)?",opts:["Fotodioda penerima akan mengalami saturasi/kebutaan sinyal optik (optical saturation) dan dapat merusak komponen optik penerima","Internet menjadi seratus kali lebih kencang","Kabel otomatis terbakar api","Layar komputer client menjadi biru"],ans:0,exp:"Sinyal terlalu kuat membanjiri fotodioda (receiver overload), mendistorsi bentuk pulsa bit data, dan dapat membakar modul penerima fotodioda."},
        {q:"Sebuah link FO sepanjang 10 km (loss fiber 0.35 dB/km), memiliki 2 titik sambungan fusion (0.1 dB/titik), dan 2 pasang konektor (0.25 dB/pair). Total loss teoritis link tersebut adalah...",opts:["4.2 dB","3.5 dB","10.0 dB","0.7 dB"],ans:0,exp:"Loss fiber = 10 × 0.35 = 3.5 dB. Loss splice = 2 × 0.1 = 0.2 dB. Loss konektor = 2 × 0.25 = 0.5 dB. Total = 3.5 + 0.2 + 0.5 = 4.2 dB."},
        {q:"Perbedaan antara satuan dB (decibel) dan dBm (decibel-milliwatt) adalah...",opts:["dB menyatakan selisih atau rasio relatif antara dua daya, sedangkan dBm menyatakan nilai daya absolut berpatokan 1 mW","dB untuk kabel tembaga, dBm untuk serat optik","dB untuk mengukur tegangan listrik, dBm untuk mengukur arus listrik","Keduanya memiliki arti yang sama persis tanpa perbedaan"],ans:0,exp:"dB adalah unit relatif perbandingan logaritmik (gain/loss). dBm adalah unit absolut daya fisik dengan referensi daya 1 milliwatt."},
        {q:"Alat pengurang daya optik pasif yang sengaja dipasang pada link jarak pendek untuk mencegah saturasi receiver penerima disebut...",opts:["Optical Attenuator","Optical Amplifier (EDFA)","Optical Isolator","Optical Circulator"],ans:0,exp:"Optical Attenuator (tersedia nilai 1 dB, 3 dB, 5 dB, 10 dB) sengaja meredam sinyal agar daya terima masuk ke dalam rentang kerja dinamis receiver."},
        {q:"Kombinasi alat ukur OLS dan OPM yang dipaketkan bersama dalam satu set pengujian sertifikasi kabel sering disebut...",opts:["OLTS (Optical Loss Test Set)","OTDR analyzer","Cable certifier UTP","Spectrum analyzer"],ans:0,exp:"OLTS (Optical Loss Test Set) adalah set instrumen resmi pengujian insertion loss Tier-1 kabel optik menurut standar TIA/ISO."},
        {q:"Panjang gelombang uji standar yang digunakan OPM untuk mengukur jaringan optik Single Mode telekomunikasi adalah...",opts:["1310 nm dan 1550 nm (serta 1490 nm untuk GPON)","850 nm dan 1300 nm","650 nm saja","2.4 GHz dan 5 GHz"],ans:0,exp:"Single mode diuji pada jendela transmisi 1310 nm (downstream data) dan 1490/1550 nm (upstream/video). 850/1300 nm digunakan untuk multimode."},
        {q:"Jika hasil pengukuran daya keluar pada OPM terbaca '-45.00 dBm' atau 'LO' pada link yang seharusnya aktif, kemungkinan kerusakannya adalah...",opts:["Serat optik putus total (fiber cut) atau konektor terlepas/sangat kotor","Sinyal internet terlalu kencang","Kabel terlalu pendek","Baterai laptop client habis"],ans:0,exp:"Nilai -45 dBm atau indikasi 'LO' (Low) menunjukkan tidak ada daya cahaya yang terdeteksi, menandakan putus fisik atau koneksi terlepas."},
        {q:"Parameter Margin Desain (Safety Margin) yang ditambahkan dalam kalkulasi Link Power Budget (biasanya 2 s/d 3 dB) bertujuan untuk...",opts:["Mengantisipasi penuaan komponen optik (aging) dan cadangan redaman perbaikan sambungan baru di masa depan","Mempercepat waktu pengiriman paket data","Menghemat pembayaran kuota bulanan","Mengurangi ukuran fisik kabel"],ans:0,exp:"Safety margin (2-3 dB) dicadangkan agar link tetap beroperasi normal ketika komponen laser menua atau jika kabel putus dan harus disambung ulang di masa depan."},
        {type:"multi",q:"Komponen-komponen yang MENYUMBANGKAN nilai redaman dalam perhitungan Link Loss Budget serat optik adalah...",opts:["Redaman intrinsik panjang kabel serat optik (dB/km × panjang km)","Redaman sambungan fusion splice dan sambungan mekanik","Redaman pasangan konektor di titik adapter (ODF, ODP, Roset)","Redaman pemisahan daya optik oleh splitter pasif (PLC Splitter)","Warna jaket kabel yang berwarna kuning"],ans:[0,1,2,3],exp:"Loss total dihitung dari akumulasi panjang serat, splice, konektor, dan splitter. Warna jaket kabel tidak menyumbang redaman."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai satuan decibel-milliwatt (dBm) adalah...",opts:["Daya 1 mW setara dengan 0 dBm","Daya 2 mW setara dengan sekitar +3 dBm (kenaikan daya 2 kali lipat)","Daya 0.5 mW setara dengan sekitar -3 dBm (penurunan daya separuh)","Nilai dBm bernilai minus (-) menunjukkan daya cahaya kurang dari 1 milliwatt","Nilai minus (-) pada dBm berarti daya listrik bertegangan negatif"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D benar. Nilai minus pada dBm bukan tegangan listrik negatif, melainkan daya cahaya fraksional di bawah 1 milliwatt."},
        {type:"multi",q:"Langkah-langkah yang BENAR dalam melakukan pengukuran insertion loss menggunakan OLS dan OPM adalah...",opts:["Membersihkan seluruh konektor dan adapter jumper referensi sebelum dicolokkan","Menyetel panjang gelombang (wavelength) pada OLS dan OPM pada angka yang sama persis (misal sama-sama 1310 nm)","Melakukan proses zeroing (referensi) menggunakan golden cord sebelum mengukur kabel jaringan","Mencatat nilai daya yang stabil pada layar OPM ke dalam formulir uji","Meniup lubang sensor OPM dengan hembusan napas mulut"],ans:[0,1,2,3],exp:"Prosedur: bersihkan konektor, samakan panjang gelombang, lakukan zeroing, dan catat nilai stabil. Meniup sensor OPM sangat dilarang."},
        {type:"multi",q:"Faktor-faktor yang dapat menyebabkan hasil pembacaan OPM meleset atau tidak akurat di lapangan meliputi...",opts:["Konektor kotor tertempel debu atau minyak jari","Panjang gelombang pada OPM tidak cocok dengan panjang gelombang yang dipancarkan OLS","Baterai instrumen OPM atau OLS sudah sangat lemah (low battery)","Konektor adapter ferrule tidak terpasang rapat (kendor)","Cuaca di luar gedung sedang cerah berawan"],ans:[0,1,2,3],exp:"Konektor kotor, beda setting wavelength, baterai drop, dan koneksi kendor menyebabkan galat ukur. Cuaca normal tidak mempengaruhi transmisi tertutup serat."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai pembagian daya optik oleh splitter PLC adalah...",opts:["Splitter 1:2 membagi daya cahaya menjadi dua cabang dengan loss sekitar 3.0 s/d 3.5 dB","Splitter 1:4 memiliki redaman tipikal sekitar 7.0 s/d 7.2 dB","Splitter 1:8 memiliki redaman tipikal sekitar 10.2 s/d 10.5 dB","Semakin banyak cabang splitter, semakin kecil daya cahaya yang diterima di masing-masing port keluaran","Splitter pasif dapat memperkuat sinyal cahaya tanpa memerlukan daya listrik"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D benar. Pilihan E salah karena splitter adalah komponen pasif murni yang membagi daya, bukan memperkuat (amplifier)."},
    ],
    fo_tp23: [
        {q:"Fungsi utama dari alat Optical Time Domain Reflectometer (OTDR) dalam pengujian jaringan serat optik adalah...",opts:["Mengukur jarak total kabel, mengevaluasi atenuasi serat, mengidentifikasi lokasi sambungan/konektor, dan menentukan titik putus secara presisi dari satu ujung","Menyambung kabel dengan busur listrik","Membuat kabel UTP straight","Mengukur bandwidth internet YouTube"],ans:0,exp:"OTDR memancarkan pulsa cahaya dan menganalisis pantulan balik untuk memetakan seluruh event fisik sepanjang kabel (jarak, loss splice, konektor, titik putus) hanya dari satu ujung."},
        {q:"Dua prinsip fisika utama yang digunakan oleh OTDR untuk mendeteksi event pada serat optik adalah...",opts:["Rayleigh Backscattering dan Fresnel Reflection","Hukum Ohm dan Hukum Kirchoff","Gelombang Elektromagnetik Radio dan Induksi Medan Magnet","Efek Doppler dan Teori Relativitas"],ans:0,exp:"Rayleigh Backscattering mengukur atenuasi sepanjang serat melalui hamburan balik mikroskopis kaca, sedangkan Fresnel Reflection mengukur pantulan tajam pada konektor/ujung serat."},
        {q:"Pada grafik trace OTDR, event sambungan lebur (Fusion Splice) normal ditandai dengan bentuk kurva berupa...",opts:["Penurunan tangga non-reflektif (Non-reflective drop / tangga turun tanpa puncak spike)","Puncak spike lancip yang sangat tinggi","Garis lurus mendatar tanpa penurunan","Grafik melingkar berputar"],ans:0,exp:"Fusion splice adalah event non-reflektif: cahaya hilang sedikit tanpa ada pantulan kaca-udara, sehingga terlihat sebagai anak tangga turun kecil tanpa spike."},
        {q:"Pada grafik trace OTDR, pasangan konektor mekanis (Connector Pair) ditandai dengan bentuk kurva berupa...",opts:["Puncak reflektif runcing (Fresnel Reflection spike) yang diikuti penurunan tangga redaman","Garis gelombang sinus berulang","Kurva berbentuk lingkaran","Tidak tampak sama sekali pada grafik"],ans:0,exp:"Pertemuan konektor menghasilkan pantulan Fresnel (celah kaca-udara kecil) yang memicu spike refleksi tajam ke atas sebelum garis turun."},
        {q:"Area buta (Dead Zone) pada awal pengukuran OTDR di mana instrumen tidak dapat mendeteksi event akibat saturasi pantulan konektor pertama diatasi dengan menggunakan...",opts:["Launch Cable (Kabel Peluncur / Dummy Fiber gulungan 500m - 1000m)","Penguat daya listrik amplifier","Konektor RJ-45","Mengganti kabel dengan kawat tembaga"],ans:0,exp:"Launch Cable (serat kompensasi 500-1000m) menggeser konektor pertama yang diuji keluar dari area blind/dead zone instrumen OTDR."},
        {q:"Pengaturan Lebar Pulsa (Pulse Width) yang KECIL (misal 5 ns atau 10 ns) pada OTDR memberikan keuntungan...",opts:["Resolusi jarak sangat tinggi dan dead zone sempit sehingga mampu membedakan event-event yang berjarak berdekatan","Jangkauan pengukuran menembus jarak ratusan kilometer","Menghemat baterai hingga 1 bulan","Menaikkan daya laser menjadi sangat panas"],ans:0,exp:"Lebar pulsa pendek menghasilkan resolusi spasial tinggi (dead zone sempit), ideal untuk mendeteksi event jarak dekat dalam gedung/lokasi ODC-ODP."},
        {q:"Sebaliknya, pengaturan Lebar Pulsa (Pulse Width) yang BESAR (misal 1 µs atau 10 µs) pada OTDR digunakan untuk...",opts:["Menjangkau link kabel yang sangat panjang dan menembus redaman besar pada optical splitter","Melihat ujung konektor mikro","Mengukur kabel patchcord 1 meter","Mempercepat waktu booting alat"],ans:0,exp:"Pulsa lebar membawa energi foton lebih besar sehingga mampu menembus atenuasi kabel jarak jauh dan redaman besar splitter PLC 1:16/1:32."},
        {q:"Parameter Indeks Bias (Index of Refraction - IOR) pada OTDR harus disetel tepat sesuai spesifikasi kabel (misal 1.4677) karena IOR menentukan...",opts:["Keakuratan perhitungan jarak fisik lokasi event pada kabel","Warna grafik pada monitor","Kekuatan baterai OTDR","Bahasa menu antarmuka"],ans:0,exp:"Jarak dihitung dari waktu tempuh cahaya: $d = (c \\times t) / (2 \\times n)$. Galat pada indeks bias $n$ akan membuat pembacaan jarak kilometer meleset."},
        {q:"Fenomena 'Gainer' pada trace OTDR di mana titik sambungan tampak seolah-olah menaikkan daya (tangga naik) disebabkan oleh...",opts:["Perbedaan koefisien hamburan balik (backscatter coefficient) atau ukuran mode field diameter dua serat yang disambung","Ada baterai tambahan di titik sambungan","Serat optik menyerap energi matahari","Kabel optik korsleting"],ans:0,exp:"Gainer adalah ilusi optik saat menyambung serat dengan koefisien hamburan lebih tinggi ke serat yang lebih rendah. Wajib dikoreksi dengan pengukuran dua arah (bi-directional OTDR)."},
        {q:"Cara membedakan event tekukan kabel (Macro-bending) dari event sambungan rusak pada grafik OTDR adalah...",opts:["Menguji link pada dua panjang gelombang berbeda (1310 nm dan 1550 nm); macro-bending akan menunjukkan lonjakan redaman yang jauh lebih besar pada 1550 nm","Melihat warna grafik layar","Mendengarkan suara bip speaker OTDR","Mengetuk kabel dengan obeng"],ans:0,exp:"Panjang gelombang 1550 nm memiliki medan mode lebih longgar sehingga jauh lebih sensitif terhadap kebocoran tekukan (bending) dibanding 1310 nm."},
        {q:"Ujung kabel putus total (Fiber Cut) pada layar OTDR ditandai dengan...",opts:["Lonjakan pantulan refleksi Fresnel yang tinggi diikuti jatuhnya grafik seketika ke garis dasar derau (noise floor)","Grafik garis lurus naik ke atas tanpa henti","Layar OTDR mati mendadak","Garis grafik membentuk lingkaran spiral"],ans:0,exp:"Ujung patahan kaca ke udara memicu refleksi Fresnel tinggi, lalu sinyal habis dan grafik jatuh ke level noise floor dasar."},
        {q:"Jarak antara awal refleksi konektor hingga titik di mana OTDR dapat mengukur redaman event berikutnya secara normal disebut...",opts:["Attenuation Dead Zone (ADZ)","Event Dead Zone (EDZ)","Backscatter Range","Dynamic Range"],ans:0,exp:"Attenuation Dead Zone (ADZ) adalah jarak pemulihan detektor dari saturasi hingga dapat mengukur nilai atenuasi serat kembali dalam batas toleransi ±0.5 dB."},
        {q:"Rentang Dinamis (Dynamic Range) pada spesifikasi OTDR (dinyatakan dalam satuan dB, misal 35 dB atau 42 dB) menunjukkan...",opts:["Kemampuan daya maksimum instrumen dalam menembus total redaman serat optik dari level awal hingga batas noise floor","Batas volume suara alarm","Kapasitas harddisk penyimpanan file","Ketahanan jatuh fisik alat ke lantai"],ans:0,exp:"Dynamic Range menentukan panjang maksimum kabel dan jumlah splitter yang dapat dianalisis instrumen OTDR sebelum sinyal tertutup noise."},
        {q:"Format berkas standar internasional yang digunakan untuk menyimpan data mentah hasil pengujian trace OTDR adalah...",opts:["Format .SOR (Bellcore/Telcordia SR-4731 standard)","Format .MP3","Format .DOCX","Format .EXE"],ans:0,exp:"Format .SOR (Standard Optical Report) adalah standar industri resmi Telcordia untuk menyimpan data kurva trace, marker, dan metadata uji OTDR."},
        {q:"Berapa jarak lokasi kabel putus jika pada layar OTDR terbaca penanda marker event drop terjadi pada posisi kilometer 3.450 km?",opts:["3.450 meter (3.45 km) dari titik koneksi OTDR","345 meter","34.5 kilometer","Tepat di depan mata teknisi"],ans:0,exp:"Skala pembacaan jarak OTDR bersifat linier dari titik nol koneksi port instrumen. 3.450 km setara dengan 3.450 meter."},
        {type:"multi",q:"Informasi dan parameter fisik yang DAPAT DIANALISIS dari grafik jejak (trace) OTDR meliputi...",opts:["Jarak total panjang kabel serat optik secara akurat","Lokasi dan nilai redaman titik sambungan lebur (fusion splice loss)","Lokasi titik konektor dan nilai pantulan baliknya (optical return loss)","Lokasi tepat kabel putus (fiber cut) atau tekukan kabel (macro-bending)","Isi percakapan telepon dan pesan WhatsApp pengguna"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D adalah parameter fisik yang diukur OTDR. OTDR tidak membaca isi konten data digital aplikasi."},
        {type:"multi",q:"Parameter-parameter utama yang WAJIB disetel (diatur) oleh teknisi sebelum memulai pengukuran OTDR adalah...",opts:["Panjang Gelombang (Wavelength, misal 1310 nm / 1550 nm)","Lebar Pulsa (Pulse Width, misal 10 ns s/d 10 µs)","Rentang Jarak Pengukuran (Distance Range)","Waktu Rata-Rata Akumulasi Derau (Averaging Time)","Indeks Bias Serat (Index of Refraction - IOR)"],ans:[0,1,2,3,4],exp:"Seluruh parameter (panjang gelombang, lebar pulsa, distance range, averaging time, dan IOR) wajib disesuaikan dengan karakteristik fisik kabel yang diuji."},
        {type:"multi",q:"Pernyataan yang BENAR mengenai Dead Zone pada instrumen OTDR adalah...",opts:["Dead Zone terjadi akibat saturasi fotodioda penerima oleh pantulan refleksi Fresnel yang kuat","Event Dead Zone (EDZ) adalah jarak minimum untuk membedakan dua event yang berdekatan","Attenuation Dead Zone (ADZ) adalah jarak minimum untuk dapat mengukur redaman atenuasi secara akurat kembali","Dead Zone dapat dieliminasi dari link yang diuji dengan memasang Launch Cable (kabel peluncur)","Dead Zone dapat dihilangkan dengan mengoleskan minyak goreng pada layar monitor"],ans:[0,1,2,3],exp:"Pilihan A, B, C, dan D adalah konsep ilmiah dead zone dan solusinya (Launch Cable). Pilihan E tidak masuk akal."},
        {type:"multi",q:"Kelebihan utama pengujian menggunakan OTDR dibandingkan dengan pengujian OPM/OLS biasa adalah...",opts:["Pengukuran dapat dilakukan hanya dari satu ujung kabel saja (Single-ended test)","Mampu memetakan secara visual lokasi dan jenis masing-masing gangguan di sepanjang kabel","Mengetahui jarak pasti titik gangguan dalam satuan meter/kilometer","Dapat membedakan antara rugi sambungan (splice) dan rugi tekukan (bending)","OTDR dapat menyambung kabel yang putus secara otomatis tanpa teknisi"],ans:[0,1,2,3],exp:"OTDR unggul dalam single-ended access, pemetaan grafis per event, penentuan jarak meter presisi, dan deteksi bending. OTDR adalah alat ukur, bukan alat penyambung otomatis."},
        {type:"multi",q:"Langkah-langkah yang BENAR dalam melacak dan memulihkan kabel fiber optik yang putus di lapangan menggunakan OTDR adalah...",opts:["Lakukan penembakan OTDR dari ODF/ODP terdekat untuk mendapatkan angka jarak titik putus","Konversikan jarak kabel OTDR ke peta rute rill (As-Built Drawing) untuk menemukan titik fisik di tiang/manhole","Kirimkan tim lapangan ke titik koordinat estimasi untuk memeriksa kerusakan fisik kabel","Lakukan penarikan kabel pengganti dan penyambungan ulang (splicing) menggunakan joint closure","Lakukan pengujian verifikasi ulang dengan OTDR dan OPM untuk memastikan link normal kembali"],ans:[0,1,2,3,4],exp:"Seluruh langkah 1 sampai 5 adalah prosedur standar pemulihan gangguan kabel putus (Restoration SOP) di industri telekomunikasi."},
    ],
    fo_tp24: [
        {q:"Tujuan utama penyusunan dokumen laporan resmi hasil pengujian dan Berita Acara Uji Terima (BAUT) instalasi fiber optik adalah...",opts:["Sebagai bukti otentik serah terima pekerjaan, dasar klaim garansi, dan rujukan pemeliharaan jaringan di masa depan","Hanya untuk memenuhi syarat formalitas tanpa dibaca","Membuat kabel bekerja lebih cepat","Menghabiskan kertas kantor"],ans:0,exp:"Dokumentasi resmi adalah bukti sah serah terima pekerjaan sesuai spesifikasi kontrak teknis (SLA) dan menjadi rujukan utama saat terjadi gangguan di masa depan."},
        {q:"Gambar rancangan teknis yang memperlihatkan kondisi nyata jalur kabel, posisi tiang, manhole, ODC, dan ODP yang SELESAI DIBANGUN di lapangan disebut...",opts:["As-Built Drawing","Brosur iklan promosi","Sketsa awal coret-coretan","Diagram blok abstrak"],ans:0,exp:"As-Built Drawing mencerminkan kondisi riil pasca-instalasi, memuat koordinat GPS tiang, jalur duct, panjang kabel aktual, dan posisi closure sambungan."},
        {q:"Dokumen yang memuat pemetaan warna tube, nomor core, arah rute, dan status penggunaan tiap helai serat di dalam ODF/ODC disebut...",opts:["Tabel Manajemen Core (Core Assignment Table)","Daftar menu kantin","Struk pembayaran listrik","Kartu garansi laptop"],ans:0,exp:"Tabel Alokasi/Manajemen Core mencatat status tiap core (Active, Idle, Damaged, Reserved) serta warna tube/core untuk mencegah salah potong saat perbaikan."},
        {q:"Data kuantitatif yang WAJIB dicantumkan pada Lembar Uji Redaman OPM dalam laporan serah terima jaringan FO adalah...",opts:["Daya pancar Tx (dBm), daya terima Rx (dBm), total redaman terukur (dB), dan status kelulusan KKM/SLA","Merk mobil pengangkut kabel","Warna seragam teknisi","Harga kopi teknisi di warung"],ans:0,exp:"Lembar uji OPM harus memuat nilai daya masuk, daya terima, total insertion loss, batas margin toleransi kontrak, dan kesimpulan LULUS/GAGAL."},
        {q:"Lampiran grafik hasil pengujian OTDR yang disertakan dalam laporan wajib menampilkan informasi...",opts:["Kurva trace, parameter setting (panjang gelombang, pulse width, IOR), tabel event loss, dan jarak total ruas kabel","Foto selfie teknisi","Rincian pulsa kuota HP","Diagram kelistrikan stopkontak"],ans:0,exp:"Lampiran trace OTDR memuat kurva grafik pantulan, parameter setup uji, daftar event marker sambungan/konektor, dan panjang fisik serat terukur."},
        {q:"Standar penamaan kode ruas jalur (Cable Labeling) pada kabel optik yang baik harus memuat informasi...",opts:["Titik asal, titik tujuan, kapasitas core, dan tanggal pemasangan (misal: ODC-KMD-01 / ODP-05 / 24C / 2026)","Hanya nama panggilan teknisi","Nomor plat motor teknisi","Kata-kata mutiara motivasi"],ans:0,exp:"Labeling terstruktur memuat identitas titik pangkal (origin), titik ujung (destination), jumlah core kabel, dan tahun instalasi untuk kemudahan identifikasi."},
        {q:"Berita Acara Serah Terima (BAST) pekerjaan instalasi jaringan fiber optik dinyatakan sah apabila...",opts:["Ditandatangani bersama oleh perwakilan pelaksana teknisi/kontraktor, pengawas proyek, dan pihak pemilik aset/sekolah","Ditandatangani oleh satu orang teknisi saja","Hanya dikirim melalui pesan chat tanpa tanda tangan","Disimpan tanpa persetujuan siapa pun"],ans:0,exp:"BAST adalah dokumen hukum formal yang memerlukan tanda tangan dan stempel resmi para pihak yang berkepentingan setelah seluruh uji teknis dinyatakan lulus."},
        {q:"Jika dalam pengujian verifikasi akhir ditemukan satu core memiliki redaman melebihi batas standar (misal loss splice 0.45 dB), tindakan yang tepat adalah...",opts:["Melakukan pekerjaan perbaikan ulang (re-work) dengan memotong dan menyambung kembali splice hingga memenuhi standar ≤ 0.1 dB sebelum serah terima","Mengubah angka hasil ukur di laporan secara palsu","Menyembunyikan core tersebut dan berpura-pura tidak tahu","Membiarkannya rusak selamanya"],ans:0,exp:"Prinsip integritas profesional: titik sambungan yang melanggar standar SLA wajib diperbaiki ulang (re-splicing) hingga memenuhi kriteria penerimaan."},
        {q:"Dokumentasi visual foto lapangan yang dilampirkan dalam laporan serah terima instalasi FO sebaiknya dilengkapi dengan...",opts:["Label keterangan lokasi, penanda waktu (timestamp), dan koordinat geografis (geotagging)","Efek filter animasi kartun","Stiker lucu media sosial","Teks yang menutupi perangkat"],ans:0,exp:"Foto geotagged dengan timestamp memberikan bukti valid bahwa dokumentasi diambil langsung di lokasi fisik aset jaringan bersangkutan."},
        {q:"Pada diagram topologi FTTx, urutan percabangan kabel dari hulu ke hilir yang benar adalah...",opts:["OLT -> Kabel Feeder -> ODC -> Kabel Distribusi -> ODP -> Drop Cable -> Roset -> ONT","ONT -> ODP -> ODC -> OLT","Roset -> ODC -> OLT -> ODP","Drop Cable -> OLT -> ODC"],ans:0,exp:"Alur downstream FTTx: OLT (Central Office) -> Feeder -> ODC (Splitter primer) -> Distribusi -> ODP (Splitter sekunder) -> Drop Cable -> Roset -> ONT pelanggan."},
        {q:"Penyimpanan arsip digital (softcopy) berkas laporan instalasi dan trace OTDR sebaiknya menerapkan aturan...",opts:["Cadangan ganda (Backup redundan) di penyimpanan lokal dan cloud server yang terorganisir rapi","Hanya disimpan di satu flashdisk tanpa salinan","Dihapus setelah 1 minggu","Disimpan di folder temporary komputer"],ans:0,exp:"Arsip laporan teknis dan file .SOR OTDR wajib disimpan dengan cadangan ganda (backup aturan 3-2-1) agar dapat diakses kapan pun terjadi gangguan jaringan."},
        {q:"Bagian 'Catatan Kendala dan Rekomendasi' pada laporan penarikan kabel berguna untuk...",opts:["Memberikan informasi kepada tim pemeliharaan berikutnya mengenai titik-titik rawan (misal area rawan galian proyek lain atau tiang rapuh)","Menjelek-jelekkan rekan kerja","Menulis daftar belanja pribadi","Mencatat jadwal liburan sekolah"],ans:0,exp:"Catatan teknisi mendokumentasikan anomali lapangan, potensi ancaman eksternal, dan saran peningkatan kapasitas untuk tim operasional berikutnya."},
        {q:"Pengujian akhir yang dilakukan bersama antara tim kontraktor dan tim pengawas klien sebelum penerbitan sertifikat kelaikan jaringan disebut...",opts:["ATP (Acceptance Test Procedure)","Uji coba game online","Latihan baris berbaris","Rapat anggaran tahunan"],ans:0,exp:"ATP (Acceptance Test Procedure) adalah rangkaian pengujian resmi terjadwal untuk memverifikasi kesesuaian instalasi terhadap seluruh klausul kontrak teknis."},
        {q:"Manfaat utama label identitas pada kabel drop di tiang ODP bagi teknisi gangguan (troubleshooter) adalah...",opts:["Mempercepat identifikasi port dan jalur kabel milik pelanggan tertentu tanpa harus meraba atau mencabut kabel pelanggan lain","Mengetahui harga kabel per meter","Membuat tiang lebih berwarna","Mencegah burung bertengger"],ans:0,exp:"Label drop cord dengan nomor ID pelanggan mencegah teknisi salah cabut (salah potong) port pelanggan lain yang sedang aktif saat perbaikan gangguan."},
        {q:"Format Berita Acara yang dibuat ketika terjadi kerusakan insidental kabel putus akibat bencana atau terkena alat berat proyek adalah...",opts:["Berita Acara Kerusakan & Pemulihan Gangguan (Trouble Ticket & Restoration Report)","Surat pesanan barang baru","Daftar inventaris aset tetap","Surat izin mengemudi"],ans:0,exp:"Restoration Report merinci waktu gangguan, estimasi titik putus OTDR, penyebab insiden, tindakan perbaikan, dan hasil ukur pasca-pemulihan."},
        {type:"multi",q:"Komponen-komponen UTAMA yang WAJIB dimuat dalam Dokumen Laporan Akhir Instalasi Fiber Optik (Project Closeout Report) meliputi...",opts:["Halaman Pengesahan Berita Acara Uji Terima (BAUT/BAST) bertanda tangan","Gambar denah jalur aktual (As-Built Drawing) beserta koordinat tiang/ODC/ODP","Tabel Manajemen Alokasi Core kabel","Rekapitulasi lembar uji daya OPM dan lampiran grafik trace OTDR (.SOR/PDF)","Foto dokumentasi fisik sebelum dan sesudah pekerjaan selesai"],ans:[0,1,2,3,4],exp:"Seluruh poin di atas adalah komponen wajib berkas laporan serah terima instalasi infrastruktur fiber optik profesional."},
        {type:"multi",q:"Standar informasi yang WAJIB dicantumkan pada label penanda kabel serat optik (Cable Tag) adalah...",opts:["Identitas titik pangkal dan titik ujung kabel (Origin - Destination)","Kapasitas jumlah core kabel (misal 24 Core / 48 Core)","Tipe kabel (misal Single Mode G.652D Aerial)","Tahun atau tanggal pemasangan kabel","Nama pacar teknisi instalasi"],ans:[0,1,2,3],exp:"Label kabel memuat asal-tujuan, kapasitas core, tipe kabel, dan waktu pemasangan. Informasi pribadi dilarang dimasukkan."},
        {type:"multi",q:"Peran penting dokumentasi As-Built Drawing bagi tim Network Operations Center (NOC) dan pemeliharaan adalah...",opts:["Mempercepat penemuan lokasi fisik titik gangguan saat kabel putus di lapangan","Mencegah tertabraknya jalur kabel optik oleh proyek galian pipa atau jalan raya pihak ketiga","Sebagai acuan pemetaan saat penambahan kapasitas core atau ekspansi pelanggan baru","Mengurangi durasi waktu perbaikan gangguan (MTTR - Mean Time to Repair)","Membuat printer kantor cepat rusak"],ans:[0,1,2,3],exp:"As-built drawing memandu pencarian gangguan, mencegah kerusakan dari proyek eksternal, mempermudah ekspansi, dan menurunkan MTTR secara drastis."},
        {type:"multi",q:"Kriteria penerimaan (Acceptance Criteria) yang harus dipenuhi dalam uji terima jaringan FTTH meliputi...",opts:["Seluruh sambungan fusion splice memiliki redaman rata-rata ≤ 0.10 dB","Daya terima optik (Rx Power) di sisi pelanggan berada dalam rentang aman -8 s/d -24 dBm","Tidak ada cacat macro-bending atau serat terjepit di dalam kaset splice tray","Penataan kabel di dalam ODC dan ODP tertata rapi sesuai standar manajemen kabel","Semua lampu rumah warga harus dimatikan saat pengujian berlangsung"],ans:[0,1,2,3],exp:"Kriteria penerimaan teknis: loss splice ≤ 0.1 dB, daya terima normal -8 s/d -24 dBm, bebas bending, dan penataan fisik rapi. Mematikan lampu rumah warga tidak berhubungan."},
        {type:"multi",q:"Sikap kerja profesional dan integritas yang harus dijunjung tinggi oleh seorang teknisi telekomunikasi dalam pelaporan data adalah...",opts:["Mencatat data hasil pengukuran apa adanya secara jujur dan akurat sesuai pembacaan instrumen","Tidak memalsukan angka redaman atau memanipulasi grafik trace OTDR","Segera melaporkan kendala teknis dan mengambil tindakan perbaikan jika menemukan anomali","Menjaga kerahasiaan diagram jaringan dan data pelanggan dari pihak yang tidak berhak","Menjual data titik lokasi ODC ke pihak luar tanpa izin"],ans:[0,1,2,3],exp:"Integritas teknisi: jujur mencatat hasil ukur, tidak memalsukan data, proaktif memperbaiki anomali, dan menjaga kerahasiaan data jaringan. Menjual data aset adalah tindakan ilegal."},
    ]
};

// ── Normalisasi bank soal ──────────────────────────────────
// Soal pilihan ganda tunggal dilengkapi opsi ke-5 (A–E) dengan
// pengecoh meta yang secara logis tidak mungkin benar.
const META_DISTRACTORS = [
    'Tidak ada pernyataan di atas yang benar',
    'Semua pernyataan di atas benar',
    'Tidak dapat ditentukan dari informasi tersebut'
];
Object.keys(assessments).forEach((topic, ti) => {
    assessments[topic].forEach((q, qi) => {
        if (q.type === 'multi') {
            if (!Array.isArray(q.ans)) q.ans = [q.ans];
            return;
        }
        if (q.opts.length < 5) {
            const phrase = META_DISTRACTORS[(qi + ti) % META_DISTRACTORS.length];
            const pos = (qi * 3 + ti) % 5;
            q.opts.splice(pos, 0, phrase);
            if (q.ans >= pos) q.ans += 1;
        }
    });
});


// ============================================================
// QUIZ ENGINE
// ============================================================
function renderQuestion() {
    const el = document.getElementById('content');
    const q = quizState.questions[quizState.current];
    const n = quizState.questions.length;
    const pct = Math.round((quizState.current / n) * 100);
    const labels = {
        topologi:'Topologi Jaringan',
        kebutuhan:'Kebutuhan Teknis',
        peralatan:'Peralatan Jaringan',
        ip:'IP & Subnetting',
        kabel:'Jaringan Kabel',
        nirkabel:'Jaringan Nirkabel',
        fiber:'Fiber Optic (Teori)',
        keamanan:'Keamanan Jaringan',
        firewall:'Firewall & ACL',
        kriptografi:'Kriptografi',
        vlan:'VLAN',
        routing:'Routing',
        nat:'NAT & Gateway',
        linux:'Sistem Operasi Linux',
        server:'Konfigurasi Server',
        fo_tp11:'TP 1.1 K3LH & APD',
        fo_tp12:'TP 1.2 Instalasi & Penarikan',
        fo_tp13:'TP 1.3 Konektor & Terminasi',
        fo_tp21:'TP 2.1 Fusion Splicing',
        fo_tp22:'TP 2.2 OPM & Redaman',
        fo_tp23:'TP 2.3 OTDR & Trace',
        fo_tp24:'TP 2.4 Laporan & Dokumentasi'
    };
    const isMulti = q.type === 'multi';
    quizState.multiSel = [];
    quizState.multiAnswered = false;

    el.innerHTML = `
    <div class="quiz-hero">
        <div class="quiz-hero-top">
            <div><h2>Asesmen: ${labels[quizState.topic]||quizState.topic}</h2><p>${isMulti ? 'Pilih SEMUA jawaban yang benar (bisa lebih dari satu)' : 'Pilih satu jawaban yang paling tepat'}</p></div>
            <div class="quiz-count">${quizState.current+1} / ${n}</div>
        </div>
        <div class="qprogress-label"><span>Progres</span><span>${pct}%</span></div>
        <div class="qprogress-bar"><div class="qprogress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="q-card">
        <div class="q-num">Soal ${quizState.current+1}${isMulti ? ' <span class="q-type-badge">Pilihan Ganda Kompleks</span>' : ''}</div>
        <div class="q-text">${q.q}</div>
        <div class="q-options" id="opts">
            ${q.opts.map((opt,i)=>`
            <button class="q-opt${isMulti ? ' q-multi' : ''}" id="opt-${i}" onclick="${isMulti ? `toggleMulti(${i})` : `selectAnswer(${i})`}">
                <span class="q-opt-letter">${'ABCDE'[i]}</span>
                <span>${opt}</span>
            </button>`).join('')}
        </div>
        ${isMulti ? `<button class="btn-primary q-check" id="btn-check" onclick="checkMulti()" disabled><i class="fas fa-check-double"></i> Periksa Jawaban</button>` : ''}
        <div class="q-exp" id="q-exp"><strong>Penjelasan:</strong> ${q.exp}</div>
    </div>
    <div class="quiz-nav">
        <button class="btn-ghost" onclick="if(confirm('Yakin keluar? Progress asesmen ini belum selesai.')){showPage('${quizState.lessonPage || (quizState.originTrack==='fo'?'fiberOptik':'home')}')}"><i class="fas fa-times"></i> Keluar</button>
        <span style="color:var(--slate-500);font-size:0.85rem">✅ ${quizState.score} benar</span>
        <button class="btn-primary" id="btn-next" onclick="nextQuestion()" style="display:none"><i class="fas fa-arrow-right"></i> ${quizState.current+1 < n ? 'Lanjut' : 'Lihat Hasil'}</button>
    </div>`;
    window.scrollTo(0,0);
}

function selectAnswer(idx) {
    const q = quizState.questions[quizState.current];
    const correct = idx === q.ans;
    if (correct) quizState.score++;
    quizState.answers.push({idx, correct});

    document.querySelectorAll('.q-opt').forEach((btn,i) => {
        btn.disabled = true;
        if (i === q.ans) btn.classList.add('correct');
        else if (i === idx && !correct) btn.classList.add('wrong');
    });
    document.getElementById('q-exp').classList.add('show');
    document.getElementById('btn-next').style.display = 'inline-flex';
}

function toggleMulti(idx) {
    if (quizState.multiAnswered) return;
    const q = quizState.questions[quizState.current];
    if (!q || q.type !== 'multi') return;
    const pos = quizState.multiSel.indexOf(idx);
    if (pos === -1) quizState.multiSel.push(idx);
    else quizState.multiSel.splice(pos, 1);
    document.getElementById('opt-' + idx).classList.toggle('sel', pos === -1);
    const check = document.getElementById('btn-check');
    if (check) check.disabled = quizState.multiSel.length === 0;
}

function checkMulti() {
    if (quizState.multiAnswered) return;
    const q = quizState.questions[quizState.current];
    if (!q || q.type !== 'multi' || !quizState.multiSel.length) return;
    const sel = [...quizState.multiSel].sort((a,b)=>a-b);
    const key = [...q.ans].sort((a,b)=>a-b);
    const correct = sel.length === key.length && sel.every((v,i) => v === key[i]);
    if (correct) quizState.score++;
    quizState.multiAnswered = true;
    quizState.answers.push({sel, correct});

    document.querySelectorAll('.q-opt').forEach((btn,i) => {
        btn.disabled = true;
        btn.classList.remove('sel');
        if (key.includes(i)) btn.classList.add('correct');
        else if (sel.includes(i)) btn.classList.add('wrong');
    });
    const check = document.getElementById('btn-check');
    if (check) check.style.display = 'none';
    document.getElementById('q-exp').classList.add('show');
    document.getElementById('btn-next').style.display = 'inline-flex';
}

function nextQuestion() {
    quizState.current++;
    if (quizState.current < quizState.questions.length) {
        renderQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    const elapsed = Math.round((Date.now() - quizState.startTime) / 1000);
    const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
    const n = quizState.questions.length;
    const correct = quizState.score;
    const wrong = n - correct;
    const pct = Math.round((correct / n) * 100);
    const labels = {
        topologi:'Topologi Jaringan',
        kebutuhan:'Kebutuhan Teknis',
        peralatan:'Peralatan Jaringan',
        ip:'IP & Subnetting',
        kabel:'Jaringan Kabel',
        nirkabel:'Jaringan Nirkabel',
        fiber:'Fiber Optic (Teori)',
        keamanan:'Keamanan Jaringan',
        firewall:'Firewall & ACL',
        kriptografi:'Kriptografi',
        vlan:'VLAN',
        routing:'Routing',
        nat:'NAT & Gateway',
        linux:'Sistem Operasi Linux',
        server:'Konfigurasi Server',
        fo_tp11:'TP 1.1 K3LH & APD',
        fo_tp12:'TP 1.2 Instalasi & Penarikan',
        fo_tp13:'TP 1.3 Konektor & Terminasi',
        fo_tp21:'TP 2.1 Fusion Splicing',
        fo_tp22:'TP 2.2 OPM & Redaman',
        fo_tp23:'TP 2.3 OTDR & Trace',
        fo_tp24:'TP 2.4 Laporan & Dokumentasi'
    };

    // Save progress
    progress[quizState.topic] = pct;
    safeSetJSON('tjkt_progress', progress);

    let grade, color, msg;
    if (pct >= 90) { grade='A'; color='#22c55e'; msg='Luar biasa! Kamu sangat menguasai materi ini! 🏆'; }
    else if (pct >= 75) { grade='B'; color='#3b82f6'; msg='Bagus! Kamu sudah lulus KKM (75)! 👍'; }
    else if (pct >= 60) { grade='C'; color='#f97316'; msg='Lumayan. Pelajari ulang materi yang salah! 📚'; }
    else { grade='D'; color='#ef4444'; msg='Perlu belajar lebih giat lagi. Jangan menyerah! 💪'; }

    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (pct / 100) * circumference;

    document.getElementById('content').innerHTML = `
    <div class="score-wrap">
        <div class="score-ring-wrap">
            <svg class="score-ring-svg" width="140" height="140" viewBox="0 0 140 140">
                <circle class="score-ring-bg" cx="70" cy="70" r="60"/>
                <circle class="score-ring-fg" cx="70" cy="70" r="60" stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
            </svg>
            <div class="score-ring-text">
                <span class="score-ring-num" style="color:${color}">${pct}</span>
                <span class="score-ring-pct">%</span>
            </div>
        </div>
        <div class="score-grade" style="color:${color}">Nilai ${grade}</div>
        <div class="score-msg">${msg}</div>
        <p style="color:var(--slate-500);font-size:0.85rem;margin-bottom:4px">Asesmen: <strong>${labels[quizState.topic]}</strong></p>
        <div class="score-stats">
            <div class="score-stat c"><div class="sn">${correct}</div><div class="sl">Benar</div></div>
            <div class="score-stat w"><div class="sn">${wrong}</div><div class="sl">Salah</div></div>
            <div class="score-stat t"><div class="sn">${mins}:${String(secs).padStart(2,'0')}</div><div class="sl">Waktu</div></div>
        </div>
        <div class="score-actions">
            <button class="btn-primary" onclick="showAssessment('${quizState.topic}')"><i class="fas fa-redo"></i> Ulangi</button>
            ${quizState.lessonPage ? `<button class="btn-outline" onclick="showPage('${quizState.lessonPage}')"><i class="fas fa-book-open"></i> Pelajari Materi</button>` : ''}
            <button class="btn-ghost" onclick="showPage('${quizState.originTrack === 'fo' ? 'fiberOptik' : 'tkj'}')"><i class="fas fa-th-large"></i> Peta Materi</button>
            <button class="btn-ghost" onclick="showPage('home')"><i class="fas fa-home"></i> Beranda</button>
            <button class="btn-ghost" onclick="showPage('progress')"><i class="fas fa-chart-bar"></i> Progress</button>
        </div>
        <div class="review-list">
            <div style="font-size:0.9rem;font-weight:700;color:var(--slate-700);margin-bottom:12px">📋 Detail Jawaban:</div>
            ${quizState.questions.map((q,i)=>{
                const a = quizState.answers[i];
                const ok = a?.correct;
                const isMulti = q.type === 'multi';
                const userAns = a ? (isMulti ? a.sel.map(j => q.opts[j]).join(', ') : (q.opts[a.idx] ?? '—')) : '—';
                const keyAns = isMulti ? q.ans.map(j => q.opts[j]).join(', ') : q.opts[q.ans];
                return `<div class="review-item ${ok?'ok':'err'}">
                    <div class="review-item-q">${ok?'✅':'❌'} Soal ${i+1}${isMulti?' <span class="q-type-badge">PG Kompleks</span>':''}: ${q.q}</div>
                    ${!ok?`<div class="review-item-a"><span style="color:var(--red-600)">Jawaban kamu: <strong>${userAns}</strong></span><br><span style="color:var(--green-600)">Jawaban benar: <strong>${keyAns}</strong></span></div>`:''}
                    <div class="review-item-exp">${q.exp}</div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
    window.scrollTo(0,0);
}

// ── UTILS ─────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length-1; i > 0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
}

// ── SERVICE WORKER ────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                if (reg && typeof reg.update === 'function') reg.update().catch(() => {});
            })
            .catch(() => {});
    });
}

// ── INIT: tema, tombol instalasi, koneksi, deep-link ──────
applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
updateNetStatus();
document.getElementById('install-btn')?.addEventListener('click', installApp);

// Dukung tautan langsung: index.html?page=intro atau #/topologi atau #/fo-tp/tp11
window.addEventListener('load', () => {
    const qp = new URLSearchParams(location.search).get('page');
    const r = parseRoute(location.hash) || (qp ? { kind: 'page', id: qp } : null);
    if (!r) return;
    _routeSilent = true;
    startApp('home', true);
    renderRoute(r, 0);
});

// Esc menutup lightbox / sidebar / hasil pencarian
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLightbox(); closeSidebar(); closeSearch(); }
});
