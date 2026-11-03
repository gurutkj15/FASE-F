// ============================================================
// TJKT FASE F — APP.JS  |  SMK Negeri 1 Kuantan Mudik
// ============================================================
'use strict';

// ── STATE ──────────────────────────────────────────────────
let currentPage = '';
let quizState   = {};
let progress    = JSON.parse(localStorage.getItem('tjkt_progress') || '{}');

// ── SPLASH ────────────────────────────────────────────────
function startApp() {
    document.getElementById('splash').style.opacity = '0';
    document.getElementById('splash').style.transition = 'opacity .5s ease';
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
        showPage('home');
    }, 500);
}

// ── NAVIGATION ────────────────────────────────────────────
const pages = {
    home, intro, topologi, kebutuhan, peralatan, ip,
    vlan, routing, nat, kabel, nirkabel, fiber,
    keamanan, firewall, kriptografi, linux, server,
    progress: progressPage
};

function showPage(id) {
    currentPage = id;
    const el = document.getElementById('content');
    el.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    closeSidebar();
    updateBottomNav(id);

    // Scroll to top
    el.parentElement.scrollTo ? el.parentElement.scrollTo(0, 0) : window.scrollTo(0, 0);

    setTimeout(() => {
        if (pages[id]) {
            el.innerHTML = pages[id]();
            initComponents();
            updateSidebarActive(id);
        } else {
            el.innerHTML = card('<h2>Halaman tidak ditemukan.</h2>');
        }
    }, 80);
}

function showAssessment(topic) {
    currentPage = 'quiz_' + topic;
    closeSidebar();
    window.scrollTo(0, 0);
    const allQ = assessments[topic];
    if (!allQ) return;
    quizState = {
        topic,
        questions: shuffle([...allQ]).slice(0, 20),
        current: 0, score: 0, answers: [],
        startTime: Date.now()
    };
    renderQuestion();
}

function updateBottomNav(id) {
    ['home','materi','progress','menu'].forEach(k => document.getElementById('bn-'+k)?.classList.remove('active'));
    const map = { home:'home', intro:'materi', progress:'progress' };
    if (map[id]) document.getElementById('bn-'+map[id])?.classList.add('active');
}

function updateSidebarActive(id) {
    document.querySelectorAll('.snav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll(`.snav-item[onclick="showPage('${id}')"]`).forEach(el => el.classList.add('active'));
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
document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
document.getElementById('close-sidebar').addEventListener('click', closeSidebar);

// ── SEARCH ────────────────────────────────────────────────
const searchIndex = [
    { label:'Beranda', page:'home', icon:'fa-home' },
    { label:'Capaian Pembelajaran', page:'intro', icon:'fa-graduation-cap' },
    { label:'Topologi Jaringan', page:'topologi', icon:'fa-sitemap' },
    { label:'Kebutuhan Teknis Jaringan', page:'kebutuhan', icon:'fa-clipboard-list' },
    { label:'Peralatan Jaringan', page:'peralatan', icon:'fa-tools' },
    { label:'IP Address, CIDR, VLSM, Subnetting', page:'ip', icon:'fa-hashtag' },
    { label:'VLAN (Virtual LAN)', page:'vlan', icon:'fa-layer-group' },
    { label:'Routing Statis dan Dinamis', page:'routing', icon:'fa-route' },
    { label:'NAT dan Internet Gateway', page:'nat', icon:'fa-exchange-alt' },
    { label:'Instalasi Jaringan Kabel', page:'kabel', icon:'fa-ethernet' },
    { label:'Jaringan Nirkabel WiFi', page:'nirkabel', icon:'fa-wifi' },
    { label:'Fiber Optic', page:'fiber', icon:'fa-wave-square' },
    { label:'Keamanan Jaringan', page:'keamanan', icon:'fa-shield-alt' },
    { label:'Firewall dan ACL', page:'firewall', icon:'fa-fire-alt' },
    { label:'Kriptografi', page:'kriptografi', icon:'fa-key' },
    { label:'Sistem Operasi Jaringan Linux', page:'linux', icon:'fa-linux' },
    { label:'Konfigurasi Server', page:'server', icon:'fa-server' },
    { label:'Asesmen Topologi', assess:'topologi', icon:'fa-tasks' },
    { label:'Asesmen IP & Subnetting', assess:'ip', icon:'fa-tasks' },
    { label:'Asesmen VLAN', assess:'vlan', icon:'fa-tasks' },
    { label:'Asesmen Routing', assess:'routing', icon:'fa-tasks' },
    { label:'Asesmen Keamanan', assess:'keamanan', icon:'fa-tasks' },
    { label:'Asesmen Fiber Optic', assess:'fiber', icon:'fa-tasks' },
];
function searchMateri(val) {
    const res = document.getElementById('search-results');
    if (!val.trim()) { res.classList.add('hidden'); return; }
    const q = val.toLowerCase();
    const matches = searchIndex.filter(x => x.label.toLowerCase().includes(q));
    if (!matches.length) {
        res.innerHTML = '<div class="sr-empty"><i class="fas fa-search"></i> Tidak ditemukan</div>';
        res.classList.remove('hidden'); return;
    }
    res.innerHTML = matches.slice(0,6).map(m => `
        <div class="sr-item" onclick="${m.page ? `showPage('${m.page}')` : `showAssessment('${m.assess}')`};document.getElementById('search-results').classList.add('hidden');document.getElementById('search-input').value=''">
            <i class="fas ${m.icon}"></i><span>${m.label}</span>
        </div>`).join('');
    res.classList.remove('hidden');
}

// ── COMPONENT INIT ────────────────────────────────────────
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


// ============================================================
// HOME PAGE
// ============================================================
function home() {
    const mods = [
        ['🗺️','Topologi Jaringan','E1','topologi'],['📋','Kebutuhan Teknis','E1','kebutuhan'],
        ['🔧','Peralatan Jaringan','E1','peralatan'],['🔢','IP, CIDR & VLSM','E1','ip'],
        ['🧩','VLAN','E2','vlan'],['🛣️','Routing','E2','routing'],
        ['🔄','NAT & Gateway','E2','nat'],['🔌','Jaringan Kabel','E3','kabel'],
        ['📡','Nirkabel/WiFi','E3','nirkabel'],['💡','Fiber Optic','E3','fiber'],
        ['🔒','Keamanan Jaringan','E4','keamanan'],['🛡️','Firewall & ACL','E4','firewall'],
        ['🗝️','Kriptografi','E4','kriptografi'],['🖥️','Server Jaringan','E5','server'],
    ];
    const assArr = [['topologi','Topologi Jaringan','🗺️'],['ip','IP & Subnetting','🔢'],['vlan','VLAN','🧩'],['routing','Routing','🛣️'],['keamanan','Keamanan','🔒'],['fiber','Fiber Optic','💡']];
    return `
    <div class="hero-card">
        <div class="hero-tag">Buku Ajar Digital</div>
        <h1>TJKT <span>Fase F</span></h1>
        <p>Teknik Jaringan Komputer &amp; Telekomunikasi — Kelas XI &amp; XII SMK</p>
        <div class="hero-stats">
            <div class="hstat"><span class="hstat-num">5</span><span class="hstat-lbl">Elemen</span></div>
            <div class="hstat"><span class="hstat-num">14</span><span class="hstat-lbl">Topik</span></div>
            <div class="hstat"><span class="hstat-num">120+</span><span class="hstat-lbl">Soal</span></div>
        </div>
    </div>

    <div class="card">
        <div class="home-section-title">Modul Pembelajaran</div>
        <div class="module-grid">
            ${mods.map(([em,t,e,p])=>`
            <div class="module-card" onclick="showPage('${p}')">
                <div class="mc-emoji">${em}</div>
                <div class="mc-title">${t}</div>
                <div class="mc-sub">${e}</div>
                <span class="mc-badge">${e}</span>
            </div>`).join('')}
        </div>
    </div>

    <div class="card">
        <div class="home-section-title">Asesmen per Elemen</div>
        <div class="assess-grid">
            ${assArr.map(([k,n,ic])=>`
            <div class="assess-card" onclick="showAssessment('${k}')">
                <div class="assess-card-icon">${ic}</div>
                <div class="assess-card-text"><strong>${n}</strong><span>20 Soal → Mulai</span></div>
            </div>`).join('')}
        </div>
    </div>

    ${progress && Object.keys(progress).length ? `
    <div class="card card-sm">
        <div class="home-section-title">Progress Terakhir</div>
        ${Object.entries(progress).slice(0,3).map(([k,v])=>{
            const nm={topologi:'Topologi',ip:'IP & Subnetting',vlan:'VLAN',routing:'Routing',keamanan:'Keamanan',fiber:'Fiber Optic'};
            const c = v>=75?'var(--green-500)':v>=60?'var(--orange-500)':'var(--red-500)';
            return `<div class="prog-item" style="margin-bottom:10px"><div class="prog-row"><span class="prog-name">${nm[k]||k}</span><span class="prog-score" style="color:${c}">${v}%</span></div><div class="prog-bar"><div class="prog-fill" style="width:${v}%;background:${c}"></div></div></div>`;
        }).join('')}
        <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="showPage('progress')"><i class="fas fa-chart-bar"></i> Lihat Semua Progress</button>
    </div>` : ''}`;
}

// ============================================================
// INTRO PAGE
// ============================================================
function intro() {
    return `
    <div class="card">
        ${sectionHead('fa-graduation-cap','Capaian Pembelajaran – Fase F')}
        ${callout('info','fa-info-circle','Tentang Buku Ajar','Media pembelajaran TJKT Fase F disusun untuk siswa SMK Negeri 1 Kuantan Mudik. Pelajari setiap elemen secara berurutan, lalu uji pemahaman dengan asesmen 20 soal per topik. Target nilai minimum: 75 (KKM).')}

        <h3 class="sub-head">Capaian Pembelajaran Fase F (Kelas XI &amp; XII)</h3>
        <ul class="step-list">
            ${stepItem('E1','Perencanaan & Pengalamatan Jaringan','Merencanakan topologi, mengumpulkan kebutuhan teknis, menginventarisasi peralatan, dan melakukan pengalamatan IP (IPv4/IPv6), CIDR, VLSM, serta subnetting.')}
            ${stepItem('E2','Konfigurasi Perangkat Jaringan','Mengkonfigurasi VLAN pada managed switch, routing statis dan dinamis (RIP, OSPF), NAT/PAT, dan Internet Gateway.')}
            ${stepItem('E3','Instalasi Jaringan Kabel & Nirkabel','Instalasi kabel UTP (straight/crossover), fiber optic, konfigurasi access point WiFi (802.11), serta troubleshooting jaringan.')}
            ${stepItem('E4','Keamanan Jaringan','Menerapkan firewall (ACL), autentikasi (802.1X, RADIUS), IDS/IPS, enkripsi, dan kriptografi untuk melindungi jaringan.')}
            ${stepItem('E5','Sistem Operasi & Server','Instalasi Linux server, konfigurasi DHCP, DNS, Web (Apache/Nginx), FTP, NTP, dan monitoring server.')}
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
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e2" style="margin-right:4px">E2</span> Konfigurasi Perangkat Jaringan</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Mengkonfigurasi VLAN (access port, trunk port, native VLAN, inter-VLAN routing)</li><li>Mengkonfigurasi routing statis, RIP v2, OSPF single area</li><li>Mengkonfigurasi NAT Static, Dynamic, PAT/Overload</li><li>Mengkonfigurasi Internet Gateway dan default route</li></ul>
                </div>
            </div>
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e3" style="margin-right:4px">E3</span> Jaringan Kabel &amp; Nirkabel</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Instalasi dan pengujian kabel UTP Cat5e/Cat6 (straight &amp; crossover), standar T568A/B</li><li>Memahami kabel coaxial dan fiber optic (single mode, multi mode)</li><li>Konfigurasi access point WiFi: SSID, channel, security (WPA2/WPA3)</li><li>Memahami standar WiFi IEEE 802.11 a/b/g/n/ac/ax</li><li>Troubleshooting jaringan kabel dan nirkabel</li></ul>
                </div>
            </div>
            <div class="acc-item">
                <div class="acc-header"><div class="acc-header-left"><span class="snav-badge e4" style="margin-right:4px">E4</span> Keamanan Jaringan</div><i class="fas fa-chevron-down acc-chevron"></i></div>
                <div class="acc-body">
                    <ul><li>Memahami CIA Triad dan jenis-jenis ancaman jaringan</li><li>Mengkonfigurasi Standard ACL dan Extended ACL di Cisco</li><li>Memahami firewall generasi (packet filter, stateful, NGFW)</li><li>Kriptografi simetris (AES), asimetris (RSA), dan hash (SHA)</li><li>IDS/IPS, VPN, autentikasi 802.1X dan RADIUS</li></ul>
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
        <button class="btn-primary" onclick="showAssessment('topologi')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Topologi (20 Soal)</button>
    </div>`;
}


// ============================================================
// E1 — KEBUTUHAN TEKNIS
// ============================================================
function kebutuhan() {
    return `<div class="card">
        ${sectionHead('fa-clipboard-list','Kebutuhan Teknis Pengguna Jaringan','sh-blue')}
        <p>Sebelum merancang jaringan, seorang <em>network engineer</em> wajib mengumpulkan dan menganalisis <strong>kebutuhan teknis</strong> pengguna secara menyeluruh. Langkah ini menentukan apakah jaringan yang dibangun tepat sasaran atau tidak.</p>

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
    </div>`;
}

// ============================================================
// E1 — PERALATAN JARINGAN
// ============================================================
function peralatan() {
    return `<div class="card">
        ${sectionHead('fa-tools','Peralatan Jaringan & Teknologinya','sh-blue')}
        <p>Memahami fungsi setiap perangkat jaringan adalah fondasi penting sebelum merancang dan membangun jaringan. Setiap perangkat beroperasi di layer OSI yang berbeda dan memiliki peran spesifik.</p>

        <h3 class="sub-head">Model OSI & Layer Perangkat</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 180" xmlns="http://www.w3.org/2000/svg">
                ${[['7 Application','#1e40af'],['6 Presentation','#1d4ed8'],['5 Session','#2563eb'],['4 Transport','#3b82f6'],['3 Network','#60a5fa'],['2 Data Link','#93c5fd'],['1 Physical','#bfdbfe']].map(([l,c],i)=>`
                <rect x="20" y="${10+i*22}" width="180" height="20" rx="4" fill="${c}"/>
                <text x="110" y="${25+i*22}" fill="${i<4?'white':'#1e3a8a'}" font-size="10" font-weight="600" text-anchor="middle" font-family="Inter,sans-serif">Layer ${l}</text>`).join('')}
                <text x="250" y="170" fill="#64748b" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Perangkat</text>
                <!-- Router = L3 -->
                <rect x="230" y="88" width="90" height="20" rx="4" fill="#f97316"/><text x="275" y="102" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Router (L3)</text>
                <line x1="230" y1="98" x2="200" y2="98" stroke="#f97316" stroke-width="1.5"/>
                <!-- Switch = L2 -->
                <rect x="230" y="110" width="90" height="20" rx="4" fill="#22c55e"/><text x="275" y="124" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Switch (L2)</text>
                <line x1="230" y1="120" x2="200" y2="120" stroke="#22c55e" stroke-width="1.5"/>
                <!-- Hub = L1 -->
                <rect x="230" y="132" width="90" height="20" rx="4" fill="#94a3b8"/><text x="275" y="146" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Hub (L1)</text>
                <line x1="230" y1="142" x2="200" y2="142" stroke="#94a3b8" stroke-width="1.5"/>
                <!-- Firewall -->
                <rect x="360" y="55" width="100" height="20" rx="4" fill="#ef4444"/><text x="410" y="69" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Firewall (L3-7)</text>
                <!-- AP -->
                <rect x="360" y="110" width="100" height="20" rx="4" fill="#8b5cf6"/><text x="410" y="124" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Access Point</text>
                <!-- Server -->
                <rect x="500" y="10" width="100" height="20" rx="4" fill="#0f766e"/><text x="550" y="24" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Server (L7)</text>
                <!-- NIC -->
                <rect x="500" y="132" width="100" height="20" rx="4" fill="#64748b"/><text x="550" y="146" fill="white" font-size="10" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">NIC (L1-2)</text>
            </svg>
        </div>
        <p class="illus-caption">Perangkat jaringan beroperasi pada layer OSI yang berbeda-beda</p>

        <h3 class="sub-head">Perangkat Aktif Jaringan</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="p-router">Router</button>
                <button class="tab-btn" data-tab="p-switch">Switch</button>
                <button class="tab-btn" data-tab="p-ap">Access Point</button>
                <button class="tab-btn" data-tab="p-firewall">Firewall</button>
                <button class="tab-btn" data-tab="p-server">Server</button>
            </div>
            <div id="p-router" class="tab-pane active">
                <p><strong>Router</strong> beroperasi di Layer 3 (Network). Tugasnya meneruskan paket berdasarkan <strong>IP address</strong> antar jaringan berbeda. Router juga bisa berfungsi sebagai DHCP server, NAT gateway, dan firewall dasar.</p>
                ${tbl(['Merek','Seri Populer','Penggunaan'],[
                    ['Cisco','ISR 4000, ASR 1000','Enterprise, ISP'],
                    ['MikroTik','RB750, CCR Series','SMB, ISP lokal'],
                    ['Ubiquiti','EdgeRouter','Kantor, SMB'],
                    ['Huawei','AR Series','Enterprise'],
                ])}
            </div>
            <div id="p-switch" class="tab-pane">
                <p><strong>Switch</strong> beroperasi di Layer 2 (Data Link). Meneruskan frame berdasarkan <strong>MAC address</strong>. Membangun MAC address table secara dinamis.</p>
                ${tbl(['Tipe Switch','Fitur','Contoh'],[
                    ['Unmanaged','Plug-and-play, tidak bisa konfigurasi, tidak ada VLAN','TP-Link TL-SG108'],
                    ['Managed L2','VLAN, STP, LACP, QoS, port mirroring','Cisco C2960, MikroTik CRS'],
                    ['Layer 3 Switch','Semua L2 + inter-VLAN routing (tanpa router terpisah)','Cisco C3850, C9300'],
                    ['PoE Switch','Suplai daya listrik ke AP/IP Camera via kabel ethernet','Cisco SG350-28P'],
                ])}
            </div>
            <div id="p-ap" class="tab-pane">
                <p><strong>Access Point (AP)</strong> membuat jaringan WiFi (WLAN) dan menjembatani perangkat nirkabel ke jaringan kabel.</p>
                <p><strong>Mode operasi AP:</strong></p>
                <ul><li><strong>Access Point:</strong> Membuat hotspot WiFi baru dari koneksi LAN kabel</li><li><strong>Repeater/Extender:</strong> Memperkuat dan memperluas jangkauan WiFi yang sudah ada</li><li><strong>Bridge:</strong> Menghubungkan dua lokasi melalui WiFi point-to-point</li><li><strong>Client/Station:</strong> AP menghubungkan perangkat wired ke jaringan WiFi</li></ul>
            </div>
            <div id="p-firewall" class="tab-pane">
                <p><strong>Firewall</strong> memfilter traffic berdasarkan aturan keamanan. Dapat beroperasi dari Layer 3 hingga Layer 7.</p>
                ${tbl(['Tipe','Layer','Kemampuan'],[
                    ['Packet Filter','L3-4','Filter IP/port sederhana'],
                    ['Stateful','L3-4','Melacak state koneksi TCP/UDP'],
                    ['Application Layer','L7','Memahami konten aplikasi (HTTP/DNS/dll)'],
                    ['NGFW','L3-7','App control, IPS, SSL inspection, user-identity'],
                ])}
            </div>
            <div id="p-server" class="tab-pane">
                <p><strong>Server</strong> menyediakan layanan kepada client di jaringan. Bisa berupa hardware khusus atau virtualisasi (VM).</p>
                <ul><li><strong>DHCP Server:</strong> Memberikan IP otomatis ke client</li><li><strong>DNS Server:</strong> Menerjemahkan nama domain ke IP</li><li><strong>Web Server:</strong> Menyajikan halaman website (Apache, Nginx)</li><li><strong>File Server:</strong> Berbagi file di jaringan (Samba, NFS)</li><li><strong>Mail Server:</strong> Layanan email (Postfix, Exchange)</li><li><strong>Proxy Server:</strong> Cache dan filter akses internet</li></ul>
            </div>
        </div>

        <h3 class="sub-head">Media Transmisi (Kabel)</h3>
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
        <p>CIDR menggantikan sistem kelas (classful) dengan <strong>prefix length yang fleksibel</strong>, ditulis <code>IP/prefix</code>. Efisiensi alokasi alamat meningkat drastis.</p>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 120" xmlns="http://www.w3.org/2000/svg">
                <text x="350" y="20" fill="#1e40af" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">192.168.1.0 / 26 — Subnet Mask Visualization</text>
                ${[...Array(32)].map((_,i)=>{
                    const isNet = i < 26;
                    const fill = isNet ? '#2563eb' : '#22c55e';
                    const col = i % 8;
                    const row = Math.floor(i / 8);
                    return `<rect x="${20+col*80}" y="${35+row*32}" width="72" height="25" rx="4" fill="${fill}" opacity="${isNet?1:0.8}"/>
                    <text x="${56+col*80}" y="${53+row*32}" fill="white" font-size="11" font-weight="700" text-anchor="middle" font-family="monospace">1</text>`;
                }).join('')}
                <text x="10" y="95" fill="#2563eb" font-size="10" font-weight="700" font-family="Inter,sans-serif">← Network bits (26) →</text>
                <text x="500" y="95" fill="#22c55e" font-size="10" font-weight="700" font-family="Inter,sans-serif">← Host bits (6) →</text>
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

        <h3 class="sub-head">VLSM — Variable Length Subnet Mask</h3>
        <p>VLSM memungkinkan setiap subnet menggunakan mask yang berbeda sesuai kebutuhan host-nya, sehingga alokasi IP menjadi sangat efisien.</p>
        ${callout('tip','fa-lightbulb','Prinsip VLSM','Urutkan kebutuhan host dari TERBESAR ke TERKECIL. Alokasikan subnet terbesar dahulu, lalu sisihkan ruang tersisa untuk subnet lebih kecil. Ini mencegah tumpang tindih alamat.')}
        <p><strong>Contoh VLSM dari jaringan 192.168.10.0/24:</strong></p>
        ${tbl(['Segmen','Kebutuhan Host','Subnet','Range','Prefix'],[
            ['Lantai 1','100 host','192.168.10.0/25','192.168.10.1 – .126','62 host tersedia'],
            ['Lantai 2','50 host','192.168.10.128/26','192.168.10.129 – .190','62 host tersedia'],
            ['Lantai 3','25 host','192.168.10.192/27','192.168.10.193 – .222','30 host tersedia'],
            ['Link WAN','2 host','192.168.10.224/30','192.168.10.225 – .226','2 host tersedia'],
        ])}

        <h3 class="sub-head">Kalkulator Subnetting Interaktif</h3>
        <div class="calc-wrap">
            <div class="calc-form">
                <div class="calc-field"><label>IP Address</label><input type="text" id="calc-ip" value="192.168.1.0" placeholder="Contoh: 192.168.1.0"></div>
                <div class="calc-field"><label>Prefix Length</label>
                    <select id="calc-pfx">
                        ${[8,16,24,25,26,27,28,29,30].map(n=>`<option value="${n}" ${n===26?'selected':''}>${n === 8?'/8 – Kelas A':n===16?'/16 – Kelas B':'/'+n+' ('+[0,0,0,0,128,192,224,240,248,252][n-22]+')'}</option>`).join('')}
                    </select>
                </div>
                <button class="calc-btn" onclick="calcSubnet()"><i class="fas fa-calculator"></i> Hitung Sekarang</button>
            </div>
            <div class="calc-result" id="calc-result"></div>
        </div>
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
// E2 — VLAN
// ============================================================
function vlan() {
    return `<div class="card">
        ${sectionHead('fa-layer-group','VLAN – Virtual Local Area Network','sh-purple')}
        ${callout('tip','fa-lightbulb','Analogi VLAN','Bayangkan sebuah gedung sekolah besar. Guru, siswa, dan staf TU berada di gedung yang sama, tapi tidak bisa masuk ke ruangan satu sama lain tanpa izin. VLAN bekerja seperti ini — satu switch fisik, beberapa "ruangan" virtual yang terisolasi.')}

        <h3 class="sub-head">Pengertian VLAN</h3>
        <p>VLAN (Virtual LAN) adalah teknologi yang memungkinkan pembuatan jaringan logis yang <strong>terpisah</strong> pada infrastruktur fisik yang sama. Perangkat di VLAN berbeda tidak dapat berkomunikasi langsung meski terhubung ke switch yang sama, kecuali melalui routing.</p>

        <h3 class="sub-head">Ilustrasi VLAN</h3>
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
        <button class="btn-primary" onclick="showAssessment('vlan')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen VLAN (20 Soal)</button>
    </div>`;
}


// ============================================================
// E2 — ROUTING
// ============================================================
function routing() {
    return `<div class="card">
        ${sectionHead('fa-route','Routing Statis & Dinamis','sh-purple')}
        ${callout('tip','fa-lightbulb','Analogi Routing','Router seperti petugas pos di persimpangan jalan. Setiap paket data yang datang dibaca alamat tujuannya, kemudian diteruskan ke jalur yang paling efisien menuju tujuan tersebut.')}

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
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="rt-rip">RIP</button>
                <button class="tab-btn" data-tab="rt-ospf">OSPF</button>
                <button class="tab-btn" data-tab="rt-bgp">BGP</button>
                <button class="tab-btn" data-tab="rt-compare">Perbandingan</button>
            </div>
            <div id="rt-rip" class="tab-pane active">
                <p><strong>RIP (Routing Information Protocol)</strong> — Distance Vector. Metrik: hop count (maks 15). Mudah dikonfigurasi, cocok untuk jaringan kecil.</p>
                ${codeBlock('Cisco IOS','Router(config)# router rip\nRouter(config-router)# version 2\nRouter(config-router)# network 192.168.1.0\nRouter(config-router)# network 10.0.0.0\nRouter(config-router)# no auto-summary\nRouter(config-router)# passive-interface GigabitEthernet0/0')}
            </div>
            <div id="rt-ospf" class="tab-pane">
                <p><strong>OSPF (Open Shortest Path First)</strong> — Link State. Algoritma Dijkstra (SPF). Metrik: cost (berdasarkan bandwidth). Skalabel, konvergensi cepat, tidak ada batasan hop.</p>
                ${codeBlock('Cisco IOS','Router(config)# router ospf 1\nRouter(config-router)# router-id 1.1.1.1\nRouter(config-router)# network 192.168.1.0 0.0.0.255 area 0\nRouter(config-router)# network 10.0.0.0 0.0.0.3 area 0\nRouter(config-router)# passive-interface GigabitEthernet0/0\n\n! Verifikasi\nRouter# show ip ospf neighbor\nRouter# show ip ospf database')}
            </div>
            <div id="rt-bgp" class="tab-pane">
                <p><strong>BGP (Border Gateway Protocol)</strong> — Path Vector. Menghubungkan Autonomous System (AS) di internet. Satu-satunya EGP yang digunakan di internet modern.</p>
                ${codeBlock('Cisco IOS','! eBGP antara AS 65001 dan AS 65002\nRouter(config)# router bgp 65001\nRouter(config-router)# bgp router-id 1.1.1.1\nRouter(config-router)# neighbor 203.0.113.2 remote-as 65002\nRouter(config-router)# network 198.51.100.0 mask 255.255.255.0')}
            </div>
            <div id="rt-compare" class="tab-pane">
                ${tbl(['Protokol','Tipe','Algoritma','Metrik','AD','Skala'],[
                    ['RIP v2','Distance Vector','Bellman-Ford','Hop count','120','Kecil (≤15 hop)'],
                    ['OSPF','Link State','Dijkstra (SPF)','Cost (bw)','110','Besar'],
                    ['EIGRP','Advanced DV','DUAL','BW+Delay','90/170','Besar (Cisco)'],
                    ['BGP','Path Vector','Best-path selection','AS-path','20/200','Internet'],
                ])}
            </div>
        </div>
        ${callout('success','fa-check-circle','Tips Praktis','Gunakan <code>show ip route</code> untuk melihat routing table. Tanda "C" = connected, "S" = static, "R" = RIP, "O" = OSPF. Administrative Distance (AD) lebih rendah = lebih dipercaya.')}
        <button class="btn-primary" onclick="showAssessment('routing')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Routing (20 Soal)</button>
    </div>`;
}

// ============================================================
// E2 — NAT & GATEWAY
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

        <h3 class="sub-head">Cara Kerja PAT (Step by Step)</h3>
        <ul class="step-list">
            ${stepItem(1,'PC Kirim Request','PC 192.168.1.5 port 1234 mengirim HTTP request ke web server 8.8.8.8 port 80')}
            ${stepItem(2,'Router Terima Paket','Router cek: source IP 192.168.1.5 = IP private → perlu di-NAT')}
            ${stepItem(3,'Translasi Source IP','Router ganti source menjadi 203.0.113.1:50001, simpan mapping di tabel NAT')}
            ${stepItem(4,'Kirim ke Internet','Web server menerima request dari 203.0.113.1:50001 (tidak tahu IP asli PC)')}
            ${stepItem(5,'Response Kembali','Web server balas ke 203.0.113.1:50001 → Router lihat tabel NAT → teruskan ke 192.168.1.5:1234')}
        </ul>

        <h3 class="sub-head">Internet Gateway</h3>
        <p><strong>Default Gateway</strong> adalah IP router yang menjadi "pintu keluar" dari jaringan lokal. Setiap perangkat di LAN harus dikonfigurasi gateway agar bisa mencapai jaringan lain/internet.</p>
        ${tbl(['Fungsi Gateway','Deskripsi'],[
            ['Routing','Meneruskan paket dari LAN ke internet dan sebaliknya'],
            ['NAT','Menerjemahkan IP private ↔ IP public'],
            ['DHCP Server','Memberikan IP otomatis ke perangkat di LAN'],
            ['DNS Forwarder','Meneruskan query DNS ke server DNS ISP'],
            ['Firewall','Memfilter traffic berbahaya masuk/keluar jaringan'],
        ])}
        ${callout('success','fa-check-circle','Aturan Default Gateway','IP default gateway biasanya adalah IP pertama atau terakhir dari subnet. Contoh: Jaringan 192.168.1.0/24 → gateway = 192.168.1.1. Jika gateway salah, PC tidak bisa akses internet meski bisa ping ke PC lain di LAN yang sama.')}
    </div>`;
}


// ============================================================
// E3 — KABEL
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
                ${tbl(['Tipe','Perisai','EMI Protection','Fleksibilitas','Harga','Aplikasi'],[
                    ['UTP','Tidak ada','Rendah','Sangat fleksibel','Murah','LAN rumah, sekolah, kantor'],
                    ['FTP/ScTP','Foil keseluruhan','Sedang','Fleksibel','Sedang','Lingkungan interferensi sedang'],
                    ['STP','Per pasang + overall','Tinggi','Kaku','Mahal','Industri, pabrik, radio'],
                ])}
                <p><strong>Kategori UTP yang Umum Digunakan:</strong></p>
                ${tbl(['Kategori','Bandwidth','Jarak Maks','Penggunaan'],[
                    ['Cat5e','1 Gbps','100 m','Standar minimum saat ini, LAN umum'],
                    ['Cat6','10 Gbps (55m) / 1Gbps (100m)','100 m','Pilihan umum baru'],
                    ['Cat6A','10 Gbps','100 m','Data center, server room'],
                    ['Cat7','10 Gbps','100 m','High-end enterprise'],
                    ['Cat8','25/40 Gbps','30 m','Data center jarak pendek'],
                ])}
            </div>
            <div id="kb-coax" class="tab-pane">
                <div class="illus-wrap">
                    <svg viewBox="0 0 600 150" xmlns="http://www.w3.org/2000/svg">
                        <text x="300" y="20" fill="#0f766e" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Penampang Kabel Coaxial</text>
                        <rect x="30" y="40" width="540" height="70" rx="8" fill="#6b7280"/>
                        <rect x="30" y="52" width="540" height="46" rx="6" fill="#d1d5db"/>
                        <rect x="30" y="60" width="540" height="30" rx="4" fill="#1e40af"/>
                        <rect x="30" y="68" width="540" height="14" rx="3" fill="#e5e7eb"/>
                        <rect x="30" y="72" width="540" height="6" rx="2" fill="#f59e0b"/>
                        <text x="580" y="78" fill="#374151" font-size="9" font-family="Inter,sans-serif">→ Inti tembaga</text>
                        <text x="580" y="92" fill="#374151" font-size="9" font-family="Inter,sans-serif">→ Insulator dielektrik</text>
                        <text x="580" y="106" fill="#374151" font-size="9" font-family="Inter,sans-serif">→ Pelindung mesh</text>
                        <text x="580" y="120" fill="#374151" font-size="9" font-family="Inter,sans-serif">→ Jaket luar</text>
                    </svg>
                </div>
                ${tbl(['Tipe','Impedansi','Penggunaan Utama'],[
                    ['RG-6','75 Ω','TV kabel, internet, satellite dish'],
                    ['RG-11','75 Ω','Jarak jauh, backbone CCTV'],
                    ['RG-58','50 Ω','10Base2 Ethernet (sudah usang)'],
                ])}
            </div>
            <div id="kb-fo" class="tab-pane">
                <p>Fiber Optic menggunakan <strong>pulsa cahaya</strong> sebagai media transmisi. Kecepatan sangat tinggi, jarak sangat jauh, kebal EMI. Pelajari lebih lanjut di materi <a href="#" onclick="showPage('fiber');return false">Fiber Optic →</a></p>
            </div>
        </div>

        <h3 class="sub-head">Standar Pengkabelan T568A & T568B</h3>
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

        <h3 class="sub-head">Alat Instalasi Kabel</h3>
        <div class="feat-grid">
            ${featCard('🔧','Crimping Tool','Menekan konektor RJ-45 ke kabel UTP. Ada yang manual dan ratchet (lebih presisi).')}
            ${featCard('✂️','Cable Stripper','Mengupas jaket luar kabel tanpa merusak kabel dalam.')}
            ${featCard('🔍','Cable Tester','Menguji urutan kabel dan memastikan tidak ada kabel yang putus atau salah posisi.')}
            ${featCard('🔌','Konektor RJ-45','Konektor 8-pin untuk ujung kabel UTP. Pastikan cocok dengan kategori kabel (Cat5e/Cat6).')}
            ${featCard('📏','Cable Punch-down Tool','Memasang kabel ke keystone jack pada patch panel atau wall plate.')}
            ${featCard('🔦','Toner & Probe','Melacak jalur kabel di dalam tembok atau plafon.')}
        </div>
    </div>`;
}


// ============================================================
// E3 — NIRKABEL
// ============================================================
function nirkabel() {
    return `<div class="card">
        ${sectionHead('fa-wifi','Instalasi Jaringan Nirkabel (WiFi)','sh-teal')}
        ${callout('info','fa-info-circle','Prinsip Dasar','Jaringan nirkabel menggunakan gelombang radio untuk mentransmisikan data. Data digital dimodulasi menjadi sinyal radio, dipancarkan oleh antena, dan ditangkap oleh penerima yang mengkonversi kembali menjadi data digital.')}

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

        <h3 class="sub-head">Konfigurasi Access Point</h3>
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
    </div>`;
}

// ============================================================
// E3 — FIBER OPTIC
// ============================================================
function fiber() {
    return `<div class="card">
        ${sectionHead('fa-wave-square','Fiber Optic','sh-teal')}
        ${callout('success','fa-bolt','Kecepatan Cahaya!','Fiber optic mentransmisikan data menggunakan <strong>pulsa cahaya</strong> yang merambat melalui serat kaca atau plastik ultra-tipis. Kecepatan mendekati 200.000 km/detik dalam serat optik!')}

        <h3 class="sub-head">Struktur Kabel Fiber Optic</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
                <!-- Dark background for contrast -->
                <rect width="700" height="200" fill="#0f172a" rx="10"/>
                <!-- Cable cross-section -->
                <circle cx="200" cy="100" r="85" fill="#334155" stroke="#475569" stroke-width="1.5"/>
                <circle cx="200" cy="100" r="65" fill="#475569"/>
                <circle cx="200" cy="100" r="48" fill="#64748b"/>
                <circle cx="200" cy="100" r="32" fill="#94a3b8"/>
                <circle cx="200" cy="100" r="14" fill="white" opacity=".95"/>
                <!-- Light ray animation -->
                <circle cx="200" cy="100" r="8" fill="#38bdf8" opacity=".9"/>
                <circle cx="200" cy="100" r="4" fill="white"/>
                <!-- Labels with lines -->
                <line x1="208" y1="92" x2="330" y2="50" stroke="#94a3b8" stroke-width="1"/>
                <text x="335" y="48" fill="#e2e8f0" font-size="10" font-weight="600" font-family="Inter,sans-serif">Core (Inti — 9µm SMF)</text>
                <line x1="218" y1="100" x2="335" y2="80" stroke="#94a3b8" stroke-width="1"/>
                <text x="340" y="78" fill="#cbd5e1" font-size="10" font-family="Inter,sans-serif">Cladding (Pelapisan reflektif)</text>
                <line x1="230" y1="112" x2="335" y2="112" stroke="#94a3b8" stroke-width="1"/>
                <text x="340" y="116" fill="#94a3b8" font-size="10" font-family="Inter,sans-serif">Buffer / Protective Coating</text>
                <line x1="245" y1="128" x2="335" y2="145" stroke="#94a3b8" stroke-width="1"/>
                <text x="340" y="149" fill="#64748b" font-size="10" font-family="Inter,sans-serif">Strength Member (Kevlar)</text>
                <line x1="275" y1="145" x2="335" y2="175" stroke="#94a3b8" stroke-width="1"/>
                <text x="340" y="179" fill="#475569" font-size="10" font-family="Inter,sans-serif">Outer Jacket</text>
                <!-- Total Internal Reflection -->
                <path d="M 450 90 Q 470 75 490 90 Q 510 105 530 90 Q 550 75 570 90 Q 590 105 610 90" stroke="#38bdf8" fill="none" stroke-width="3"/>
                <text x="530" y="130" fill="#38bdf8" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Total Internal Reflection</text>
                <text x="530" y="148" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Cahaya terpantul sempurna di dalam core</text>
                <text x="530" y="162" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">karena perbedaan indeks bias core vs cladding</text>
            </svg>
        </div>

        <h3 class="sub-head">Single Mode vs Multi Mode</h3>
        ${tbl(['Parameter','Single Mode (SMF)','Multi Mode (MMF)'],[
            ['Diameter Core','~9 µm (sangat kecil)','50 µm atau 62.5 µm'],
            ['Sumber Cahaya','Laser (presisi tinggi)','LED atau VCSEL'],
            ['Jarak Transmisi','Hingga 100+ km','Hingga 550 m (OM3/OM4)'],
            ['Bandwidth','Sangat tinggi (Tbps+)','Tinggi (10–100 Gbps)'],
            ['Dispersi','Minimal (1 mode)','Modal dispersion ada'],
            ['Harga','Lebih mahal','Lebih terjangkau'],
            ['Warna Jaket','Kuning','Orange (OM1/2), Aqua (OM3/4)'],
            ['Penggunaan','Backbone ISP, antar kota/gedung','Data center, dalam kampus'],
        ])}

        <h3 class="sub-head">Konektor Fiber Optic</h3>
        <div class="feat-grid">
            ${featCard('🔵','SC Connector','Subscriber Connector. Push-pull, persegi, paling umum di Indonesia. Digunakan untuk SMF & MMF.')}
            ${featCard('🔷','LC Connector','Lucent Connector. Lebih kecil dari SC (1.25mm ferrule), populer di data center karena kepadatan port tinggi.')}
            ${featCard('🟤','FC Connector','Ferrule Connector. Dikunci dengan ulir — sangat stabil. Digunakan untuk pengukuran presisi dan telekomunikasi.')}
            ${featCard('🟠','ST Connector','Straight Tip. Dikunci dengan bayonet (putar). Populer di jaringan kampus dan militer.')}
            ${featCard('🟢','MTP/MPO','Multi-fiber connector untuk 8, 12, atau 24 serat sekaligus. Digunakan di data center hyperscale.')}
            ${featCard('⬜','E2000/LC-APC','LC dengan Physical Contact angled polish — loss sangat rendah, digunakan untuk link jarak jauh.')}
        </div>

        <h3 class="sub-head">Peralatan Instalasi Fiber Optic</h3>
        ${tbl(['Alat','Fungsi','Keterangan'],[
            ['Fusion Splicer','Menyambung dua serat dengan busur listrik','Loss sangat rendah (<0.02 dB), paling akurat'],
            ['Mechanical Splicing','Menyambung dengan sleeve mekanis','Cepat dan murah, loss lebih tinggi (~0.5 dB)'],
            ['Fiber Cleaver','Memotong ujung serat tegak lurus','Harus rata sempurna sebelum splicing'],
            ['OTDR','Mengukur loss dan lokasi gangguan','Seperti radar untuk fiber — sangat penting'],
            ['Optical Power Meter','Mengukur kekuatan sinyal cahaya','Digunakan bersama light source'],
            ['Visual Fault Locator','Laser merah untuk melihat titik patah','Berguna untuk trace jalur dan cari macrobend'],
        ])}

        <h3 class="sub-head">Fiber vs Tembaga</h3>
        ${tbl(['Aspek','Fiber Optic','Kabel Tembaga'],[
            ['Bandwidth','Tbps+','Gbps'],
            ['Jarak','100+ km','100 m'],
            ['EMI Immunity','Kebal total','Rentan'],
            ['Keamanan','Sangat sulit disadap','Bisa disadap via klem'],
            ['Berat','Lebih ringan','Lebih berat'],
            ['Instalasi','Kompleks, butuh keahlian khusus','Mudah, bisa dilakukan sendiri'],
            ['Harga Kabel','Mahal','Murah'],
            ['Power over Cable','Tidak bisa','PoE tersedia'],
        ])}
        <button class="btn-primary" onclick="showAssessment('fiber')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Fiber Optic (20 Soal)</button>
    </div>`;
}


// ============================================================
// E4 — KEAMANAN JARINGAN
// ============================================================
function keamanan() {
    return `<div class="card">
        ${sectionHead('fa-shield-alt','Keamanan Jaringan','sh-red')}
        ${callout('danger','fa-exclamation-triangle','Ancaman Nyata!','Setiap hari ada jutaan serangan siber di seluruh dunia. Biaya akibat kejahatan siber diperkirakan mencapai $10,5 triliun per tahun pada 2025. Keamanan jaringan bukan pilihan — ini keharusan.')}

        <h3 class="sub-head">CIA Triad — Fondasi Keamanan</h3>
        <div class="illus-wrap">
            <svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
                <polygon points="350,20 200,170 500,170" fill="none" stroke="#3b82f6" stroke-width="2"/>
                <circle cx="350" cy="20" r="40" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
                <circle cx="200" cy="170" r="40" fill="#dcfce7" stroke="#22c55e" stroke-width="2"/>
                <circle cx="500" cy="170" r="40" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
                <text x="350" y="25" fill="#1e40af" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Confidentiality</text>
                <text x="350" y="40" fill="#3b82f6" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Kerahasiaan</text>
                <text x="350" y="52" fill="#64748b" font-size="8" text-anchor="middle" font-family="Inter,sans-serif">Data hanya untuk</text>
                <text x="350" y="63" fill="#64748b" font-size="8" text-anchor="middle" font-family="Inter,sans-serif">yang berwenang</text>
                <text x="200" y="165" fill="#15803d" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Integrity</text>
                <text x="200" y="180" fill="#22c55e" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Integritas</text>
                <text x="200" y="192" fill="#64748b" font-size="8" text-anchor="middle" font-family="Inter,sans-serif">Data tidak diubah</text>
                <text x="500" y="165" fill="#991b1b" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter,sans-serif">Availability</text>
                <text x="500" y="180" fill="#ef4444" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Ketersediaan</text>
                <text x="500" y="192" fill="#64748b" font-size="8" text-anchor="middle" font-family="Inter,sans-serif">Selalu bisa diakses</text>
                <text x="350" y="110" fill="#475569" font-size="12" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">CIA</text>
                <text x="350" y="125" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter,sans-serif">Triad</text>
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

        <h3 class="sub-head">Sistem Keamanan Jaringan</h3>
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
        <button class="btn-primary" onclick="showAssessment('keamanan')" style="margin-top:20px;width:100%"><i class="fas fa-tasks"></i> Kerjakan Asesmen Keamanan (20 Soal)</button>
    </div>`;
}

// ============================================================
// E4 — FIREWALL
// ============================================================
function firewall() {
    return `<div class="card">
        ${sectionHead('fa-fire-alt','Firewall & ACL','sh-red')}
        <p>Firewall memantau dan mengontrol traffic jaringan berdasarkan <strong>aturan keamanan (rules/ACL)</strong>. Bertindak sebagai "penjaga gerbang" antara jaringan terpercaya dan tidak terpercaya.</p>

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
    </div>`;
}

// ============================================================
// E4 — KRIPTOGRAFI
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
    </div>`;
}


// ============================================================
// E5 — LINUX & SERVER
// ============================================================
function linux() {
    return `<div class="card">
        ${sectionHead('fa-linux','Sistem Operasi Jaringan (Linux)','sh-orange')}
        <p>Linux adalah sistem operasi open-source berbasis Unix yang mendominasi dunia server. Lebih dari 96% server web dunia dan hampir semua superkomputer menggunakan Linux.</p>

        ${tags(tag('🆓 Gratis & Open Source','green'),tag('🔒 Sangat Aman','blue'),tag('⚡ Stabil & Performa Tinggi','teal'),tag('🔧 Kustomisasi Penuh','purple'),tag('📦 Package Manager','amber'))}

        <h3 class="sub-head">Distribusi Linux untuk Server</h3>
        ${tbl(['Distro','Basis','Kelebihan','Penggunaan'],[
            ['Ubuntu Server','Debian','Komunitas besar, LTS 5 tahun, banyak tutorial','SMB, VPS, cloud'],
            ['Debian','Independent','Sangat stabil, minimal dependency','Production server konservatif'],
            ['Rocky Linux','RHEL','Kompatibel Red Hat, gratis, enterprise-grade','Enterprise, pengganti CentOS'],
            ['AlmaLinux','RHEL','Kompatibel Red Hat, community-driven','Enterprise, cloud'],
            ['Fedora Server','Red Hat','Teknologi terbaru, preview RHEL','Dev server, testing'],
        ])}

        <h3 class="sub-head">Perintah Linux Esensial</h3>
        <div class="tab-group">
            <div class="tab-list">
                <button class="tab-btn active" data-tab="lx-nav">Navigasi</button>
                <button class="tab-btn" data-tab="lx-file">File & Dir</button>
                <button class="tab-btn" data-tab="lx-net">Jaringan</button>
                <button class="tab-btn" data-tab="lx-svc">Layanan</button>
                <button class="tab-btn" data-tab="lx-usr">User</button>
            </div>
            <div id="lx-nav" class="tab-pane active">${codeBlock('bash','# Tampilkan direktori saat ini\npwd\n\n# List isi direktori (detail)\nls -lah\n\n# Pindah ke direktori\ncd /etc/network\n\n# Kembali ke home\ncd ~\n\n# Lihat isi file\ncat /etc/hosts\n\n# Tampil halaman per halaman\nless /var/log/syslog')}</div>
            <div id="lx-file" class="tab-pane">${codeBlock('bash','# Buat direktori\nmkdir -p /var/www/html/sekolah\n\n# Salin file\ncp source.conf /etc/dest.conf\n\n# Pindahkan / rename\nmv oldname.conf newname.conf\n\n# Hapus file\nrm -f file.txt\n\n# Hapus direktori (hati-hati!)\nrm -rf /path/to/dir\n\n# Edit file teks\nnano /etc/hosts\n\n# Cari file\nfind / -name "*.conf" 2>/dev/null\n\n# Ubah permission\nchmod 755 script.sh\nchown www-data:www-data /var/www/html')}</div>
            <div id="lx-net" class="tab-pane">${codeBlock('bash','# Lihat konfigurasi IP\nip addr show\nip addr show eth0\n\n# Lihat routing table\nip route show\n\n# Tambah route sementara\nip route add 10.0.0.0/8 via 192.168.1.1\n\n# Test koneksi\nping -c 4 8.8.8.8\n\n# Trace route\ntraceroute google.com\n\n# DNS lookup\nnslookup google.com\ndig google.com\n\n# Lihat port yang terbuka\nss -tulpn\nnetstat -tulpn\n\n# Capture traffic\ntcpdump -i eth0 port 80')}</div>
            <div id="lx-svc" class="tab-pane">${codeBlock('bash','# Status layanan\nsystemctl status apache2\n\n# Start / Stop / Restart\nsystemctl start apache2\nsystemctl stop apache2\nsystemctl restart apache2\nsystemctl reload apache2  # tanpa downtime\n\n# Aktifkan/nonaktifkan auto-start\nsystemctl enable apache2\nsystemctl disable apache2\n\n# Lihat semua layanan aktif\nsystemctl list-units --type=service --state=running\n\n# Lihat log layanan\njournalctl -u apache2 -f\njournalctl -u apache2 --since "1 hour ago"\n\n# Monitor real-time\nhtop\ntop')}</div>
            <div id="lx-usr" class="tab-pane">${codeBlock('bash','# Tambah user baru\nadduser namauser\n\n# Tambah ke grup sudo (admin)\nusermod -aG sudo namauser\n\n# Ganti password\npasswd namauser\n\n# Hapus user\ndeluser --remove-home namauser\n\n# Login sebagai user lain\nsu - namauser\n\n# Jalankan perintah sebagai root\nsudo apt update\n\n# Lihat daftar user\ncat /etc/passwd\n\n# Lihat grup user\ngroups namauser')}</div>
        </div>

        <h3 class="sub-head">Konfigurasi IP Statis (Ubuntu Netplan)</h3>
        ${codeBlock('YAML','# File: /etc/netplan/00-installer-config.yaml\nnetwork:\n  version: 2\n  ethernets:\n    ens33:\n      dhcp4: false\n      addresses:\n        - 192.168.1.10/24\n      gateway4: 192.168.1.1\n      nameservers:\n        addresses: [8.8.8.8, 1.1.1.1]\n\n# Terapkan konfigurasi\n$ sudo netplan apply\n\n# Verifikasi\n$ ip addr show ens33')}
    </div>`;
}

function server() {
    return `<div class="card">
        ${sectionHead('fa-server','Konfigurasi Server Jaringan','sh-orange')}
        <p>Server jaringan menyediakan layanan kepada client. Konfigurasi yang tepat memastikan layanan berjalan stabil, aman, dan efisien.</p>

        <div class="accordion">
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🌐 DHCP Server (isc-dhcp-server)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>DHCP otomatis memberikan: IP address, subnet mask, default gateway, DNS server, dan lease time ke client.</p>
                ${codeBlock('bash','# Install\nsudo apt install isc-dhcp-server -y\n\n# Konfigurasi interface di /etc/default/isc-dhcp-server\nINTERFACESv4="ens33"\n\n# Konfigurasi /etc/dhcp/dhcpd.conf\ndefault-lease-time 600;\nmax-lease-time 7200;\n\nsubnet 192.168.1.0 netmask 255.255.255.0 {\n  range 192.168.1.100 192.168.1.200;\n  option routers 192.168.1.1;\n  option domain-name-servers 8.8.8.8, 8.8.4.4;\n  option broadcast-address 192.168.1.255;\n}\n\n# Restart dan aktifkan\nsudo systemctl restart isc-dhcp-server\nsudo systemctl enable isc-dhcp-server\n\n# Cek lease yang diberikan\ncat /var/lib/dhcp/dhcpd.leases')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">📖 DNS Server (BIND9)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>DNS menerjemahkan nama domain ke IP address. BIND9 adalah implementasi DNS server paling populer di Linux.</p>
                ${codeBlock('bash','# Install\nsudo apt install bind9 bind9utils -y\n\n# Tambah zone di /etc/bind/named.conf.local\nzone "sekolah.sch.id" {\n    type master;\n    file "/etc/bind/db.sekolah";\n};\n\n# Buat file zone /etc/bind/db.sekolah\n$TTL 604800\n@    IN SOA ns1.sekolah.sch.id. admin.sekolah.sch.id. (\n              2024010101 ; Serial\n              604800     ; Refresh\n              86400      ; Retry\n              2419200    ; Expire\n              604800 )   ; Minimum TTL\n\n@    IN NS   ns1.sekolah.sch.id.\nns1  IN A    192.168.1.10\nwww  IN A    192.168.1.20\nmail IN A    192.168.1.30\n\n# Test\nsudo named-checkzone sekolah.sch.id /etc/bind/db.sekolah\nnslookup www.sekolah.sch.id 192.168.1.10')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">🌍 Web Server (Apache2)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>Apache adalah web server paling populer di dunia. Menyajikan halaman web ke browser client.</p>
                ${codeBlock('bash','# Install\nsudo apt install apache2 -y\nsudo systemctl enable apache2\n\n# Lokasi file website default\n/var/www/html/index.html\n\n# Buat Virtual Host untuk domain sendiri\nsudo nano /etc/apache2/sites-available/sekolah.conf\n\n# Isi Virtual Host:\n<VirtualHost *:80>\n    ServerName www.sekolah.sch.id\n    ServerAlias sekolah.sch.id\n    DocumentRoot /var/www/sekolah\n    ErrorLog ${APACHE_LOG_DIR}/sekolah_error.log\n    CustomLog ${APACHE_LOG_DIR}/sekolah_access.log combined\n</VirtualHost>\n\n# Aktifkan dan test\nsudo a2ensite sekolah.conf\nsudo apache2ctl configtest\nsudo systemctl reload apache2')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">📁 FTP Server (vsftpd)</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                ${codeBlock('bash','# Install\nsudo apt install vsftpd -y\n\n# Konfigurasi /etc/vsftpd.conf\nanonymous_enable=NO        # Nonaktifkan akses anonim\nlocal_enable=YES           # Izinkan user lokal login\nwrite_enable=YES           # Izinkan upload\nchroot_local_user=YES      # Batasi user ke home dir\nallow_writeable_chroot=YES\npassive_enable=YES\npasv_min_port=10000\npasv_max_port=10100\n\n# Restart\nsudo systemctl restart vsftpd\n\n# Test dari client (gunakan FileZilla atau terminal)\nftp 192.168.1.10')}
            </div></div>
            <div class="acc-item"><div class="acc-header"><div class="acc-header-left">⏰ NTP Server</div><i class="fas fa-chevron-down acc-chevron"></i></div>
            <div class="acc-body">
                <p>NTP menyinkronkan waktu semua perangkat di jaringan. Penting untuk log, sertifikat digital, dan sistem autentikasi.</p>
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
    </div>`;
}

// ============================================================
// PROGRESS PAGE
// ============================================================
function progressPage() {
    const topics = [
        {k:'topologi',n:'Topologi Jaringan'},{k:'ip',n:'IP & Subnetting'},
        {k:'vlan',n:'VLAN'},{k:'routing',n:'Routing'},
        {k:'keamanan',n:'Keamanan Jaringan'},{k:'fiber',n:'Fiber Optic'},
    ];
    const done = topics.filter(t => progress[t.k] !== undefined);
    const avg = done.length ? Math.round(done.reduce((s,t)=>s+progress[t.k],0)/done.length) : 0;
    const ringColor = avg>=75?'#22c55e':avg>=60?'#f97316':'#ef4444';
    const circumference = 2*Math.PI*60;
    const offset = circumference - (avg/100)*circumference;
    return `
    <div class="card">
        ${sectionHead('fa-chart-line','Progress Belajar Saya','sh-green')}
        <div style="text-align:center;margin:20px 0">
            <div class="score-ring-wrap" style="margin-bottom:16px">
                <svg class="score-ring-svg" width="140" height="140" viewBox="0 0 140 140">
                    <circle class="score-ring-bg" cx="70" cy="70" r="60"/>
                    <circle class="score-ring-fg" cx="70" cy="70" r="60" stroke="${ringColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
                </svg>
                <div class="score-ring-text"><span class="score-ring-num" style="color:${ringColor}">${avg || '—'}</span><span class="score-ring-pct">${avg ? 'rata-rata' : 'Belum ada'}</span></div>
            </div>
            <p style="color:var(--slate-500)">${done.length}/6 asesmen dikerjakan</p>
            <p style="font-weight:700;color:${ringColor}">${avg>=75?'🎉 KKM Tercapai!':avg>0?'📚 Terus belajar, target 75':''}</p>
        </div>
        ${topics.map(t=>{
            const s=progress[t.k];
            const c=s>=75?'#22c55e':s>=60?'#f97316':s>0?'#ef4444':'#e2e8f0';
            return `<div class="prog-item"><div class="prog-row"><span class="prog-name">${t.n}</span><span class="prog-score" style="color:${c}">${s!==undefined?s+'%':'—'}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${s||0}%;background:${c}"></div></div>${s!==undefined?`<div style="font-size:0.75rem;color:var(--slate-400);margin-top:4px">${s>=75?'✅ Lulus':s>=60?'⚠️ Perlu ditingkatkan':'❌ Perlu belajar ulang'}</div>`:''}</div>`;
        }).join('')}
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
            <button class="btn-primary" onclick="showPage('home')"><i class="fas fa-home"></i> Beranda</button>
            <button class="btn-ghost" onclick="if(confirm('Reset semua progress?')){localStorage.removeItem('tjkt_progress');progress={};showPage('progress');}"><i class="fas fa-redo"></i> Reset Progress</button>
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
        {q:"Fusion splicer bekerja dengan cara...",opts:["Menggunakan lem optik khusus","Memanaskan dua ujung fiber dengan busur listrik hingga menyatu","Menggunakan sleeve mekanis","Menekan dua ujung fiber"],ans:1,exp:"Fusion splicer: electric arc (busur listrik) memanaskan dan menyatukan dua ujung serat optik. Loss sangat rendah (<0.02 dB)."},
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
        {q:"Metode penyambungan fiber optic yang menghasilkan loss paling rendah adalah...",opts:["Mechanical splice","Connector biasa","Fusion splice (fusion splicer)","Soldering"],ans:2,exp:"Fusion splice: dua serat dilebur jadi satu dengan busur listrik. Loss sangat rendah (<0.02 dB) vs mechanical splice (~0.5 dB)."},
    ],
};


// ============================================================
// QUIZ ENGINE
// ============================================================
function renderQuestion() {
    const el = document.getElementById('content');
    const q = quizState.questions[quizState.current];
    const n = quizState.questions.length;
    const pct = Math.round((quizState.current / n) * 100);
    const labels = {topologi:'Topologi Jaringan',ip:'IP & Subnetting',vlan:'VLAN',routing:'Routing',keamanan:'Keamanan Jaringan',fiber:'Fiber Optic'};

    el.innerHTML = `
    <div class="quiz-hero">
        <div class="quiz-hero-top">
            <div><h2>Asesmen: ${labels[quizState.topic]||quizState.topic}</h2><p>Pilih satu jawaban yang paling tepat</p></div>
            <div class="quiz-count">${quizState.current+1} / ${n}</div>
        </div>
        <div class="qprogress-label"><span>Progres</span><span>${pct}%</span></div>
        <div class="qprogress-bar"><div class="qprogress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="q-card">
        <div class="q-num">Soal ${quizState.current+1}</div>
        <div class="q-text">${q.q}</div>
        <div class="q-options" id="opts">
            ${q.opts.map((opt,i)=>`
            <button class="q-opt" id="opt-${i}" onclick="selectAnswer(${i})">
                <span class="q-opt-letter">${'ABCD'[i]}</span>
                <span>${opt}</span>
            </button>`).join('')}
        </div>
        <div class="q-exp" id="q-exp"><strong>Penjelasan:</strong> ${q.exp}</div>
    </div>
    <div class="quiz-nav">
        <button class="btn-ghost" onclick="if(confirm('Yakin keluar? Progress asesmen akan hilang.')){showPage('home')}"><i class="fas fa-times"></i> Keluar</button>
        <span style="color:var(--slate-400);font-size:0.85rem">✅ ${quizState.score} benar</span>
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
    const labels = {topologi:'Topologi Jaringan',ip:'IP & Subnetting',vlan:'VLAN',routing:'Routing',keamanan:'Keamanan Jaringan',fiber:'Fiber Optic'};

    // Save progress
    progress[quizState.topic] = pct;
    localStorage.setItem('tjkt_progress', JSON.stringify(progress));

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
        <p style="color:var(--slate-400);font-size:0.85rem;margin-bottom:4px">Asesmen: <strong>${labels[quizState.topic]}</strong></p>
        <div class="score-stats">
            <div class="score-stat c"><div class="sn">${correct}</div><div class="sl">Benar</div></div>
            <div class="score-stat w"><div class="sn">${wrong}</div><div class="sl">Salah</div></div>
            <div class="score-stat t"><div class="sn">${mins}:${String(secs).padStart(2,'0')}</div><div class="sl">Waktu</div></div>
        </div>
        <div class="score-actions">
            <button class="btn-primary" onclick="showAssessment('${quizState.topic}')"><i class="fas fa-redo"></i> Ulangi</button>
            <button class="btn-outline" onclick="showPage('home')"><i class="fas fa-home"></i> Beranda</button>
            <button class="btn-ghost" onclick="showPage('progress')"><i class="fas fa-chart-bar"></i> Progress</button>
        </div>
        <div class="review-list">
            <div style="font-size:0.9rem;font-weight:700;color:var(--slate-700);margin-bottom:12px">📋 Detail Jawaban:</div>
            ${quizState.questions.map((q,i)=>{
                const a = quizState.answers[i];
                const ok = a?.correct;
                return `<div class="review-item ${ok?'ok':'err'}">
                    <div class="review-item-q">${ok?'✅':'❌'} Soal ${i+1}: ${q.q}</div>
                    ${!ok?`<div class="review-item-a"><span style="color:var(--red-600)">Jawaban kamu: <strong>${q.opts[a?.idx??-1]||'—'}</strong></span><br><span style="color:var(--green-600)">Jawaban benar: <strong>${q.opts[q.ans]}</strong></span></div>`:''}
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
            .then(() => console.log('✅ SW Registered'))
            .catch(err => console.log('SW Error:', err));
    });
}
