// ============================================================
// anim.js — MODERN WEB MOTION ENGINE (v60)
// GSAP 3 + ScrollTrigger + Motion (Spring Physics) + Lenis
// SMK Negeri 1 Kuantan Mudik — TJKT Studio Fase F
// ------------------------------------------------------------
// Arsitektur Progressive Enhancement (tanpa build tool):
//   * Seluruh pustaka diimpor dinamis (ES module) dari CDN
//   * Gagal jaringan / offline -> fallback otomatis ke CSS bawaan
//   * Menghormati prefers-reduced-motion secara penuh
//
// Pembagian peran yang tegas (tanpa saling berebut properti):
//   1. Lenis          -> pengguliran halus + scroll lock modal +
//                        sinkronisasi progress baca & TOC spy
//   2. GSAP + ST      -> koreografi splash, transisi halaman,
//                        ScrollTrigger.batch reveal, parallax gambar,
//                        count-up statistik, SVG score ring, magnetic CTA
//   3. Motion         -> micro-interaction pegas (tombol, tab, nav,
//                        Command Palette, lightbox, progres, tema, toast)
// ============================================================
'use strict';

const CDN = {
    gsap: 'https://cdn.jsdelivr.net/npm/gsap@3.12.7/+esm',
    scrollTrigger: 'https://cdn.jsdelivr.net/npm/gsap@3.12.7/ScrollTrigger.js/+esm',
    motion: 'https://cdn.jsdelivr.net/npm/motion@11.18.2/+esm',
    lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm'
};

const state = {
    gsap: null,
    ScrollTrigger: null,
    animate: null,
    stagger: null,
    Lenis: null,
    lenis: null,
    pageCtx: null,
    splashCtx: null,
    reduced: false,
    wired: false,
    scrollLocked: false,
    spyHeadings: []
};

// API jembatan untuk app.js
const api = {
    gsap: false,
    scrollTrigger: false,
    motion: false,
    lenis: false,
    status: 'loading',
    countUp: null,
    exitSplash: null,
    animateCmdkOpen: null,
    animateCmdkList: null,
    animateLightboxOpen: null,
    animateThemeToggle: null,
    animateToast: null,
    scrollTo: null,
    setScrollLock: null,
    refresh: null
};
window.__tjktMotion = api;

async function imp(url) {
    try { return await import(url); } catch (e) { return null; }
}

// ── UTIL: sinkronisasi scroll bar GPU, topbar, to-top, & TOC spy ──
let _spyRaf = 0;
function syncScrollUI(scrollY) {
    const y = typeof scrollY === 'number' ? scrollY : (window.scrollY || 0);
    const topbar = document.querySelector('.topbar');
    if (topbar) topbar.classList.toggle('scrolled', y > 12);

    const toTop = document.getElementById('to-top');
    if (toTop) toTop.classList.toggle('show', y > 420);

    const bar = document.getElementById('read-bar');
    if (bar) {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const ratio = Math.min(1, Math.max(0, y / max));
        bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
        bar.classList.toggle('show', y > 40 && max > 80);
    }

    if (state.spyHeadings.length && !_spyRaf) {
        _spyRaf = requestAnimationFrame(() => {
            _spyRaf = 0;
            updateTocSpy();
        });
    }
}

function collectTocHeadings() {
    const toc = document.querySelector('#content .toc-card');
    if (!toc) { state.spyHeadings = []; return; }
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    state.spyHeadings = links
        .map(a => {
            const id = a.getAttribute('href').slice(1);
            const target = id ? document.getElementById(id) : null;
            return target ? { a, target } : null;
        })
        .filter(Boolean);
    updateTocSpy();
}

function updateTocSpy() {
    if (!state.spyHeadings.length) return;
    const offset = 128;
    let active = state.spyHeadings[0];
    for (let i = 0; i < state.spyHeadings.length; i++) {
        const rect = state.spyHeadings[i].target.getBoundingClientRect();
        if (rect.top <= offset) active = state.spyHeadings[i];
        else break;
    }
    state.spyHeadings.forEach(item => {
        item.a.classList.toggle('toc-active', item === active);
    });
}

// ── GSAP: count-up angka statistik ─────────────────────────
function makeCountUp() {
    return function countUpGsap(el) {
        const raw = el.getAttribute('data-count');
        const target = parseFloat(raw);
        if (isNaN(target)) return false;
        const suffix = (el.textContent.match(/[^\d.,\s]+$/) || [''])[0];
        const isFloat = String(raw).includes('.');
        const fmt = v => isFloat ? v.toFixed(1) : Math.round(v).toLocaleString('id-ID');
        const o = { v: 0 };
        state.gsap.to(o, {
            v: target,
            duration: 1.0,
            ease: 'power3.out',
            onUpdate() { el.textContent = fmt(o.v) + suffix; },
            onComplete() {
                el.textContent = fmt(target) + suffix;
                el.classList.add('counted');
            }
        });
        return true;
    };
}

// ── GSAP: koreografi Splash Screen + Magnetic CTA + Parallax Orbs ──
function initSplashChoreography() {
    const splash = document.getElementById('splash');
    if (!splash || splash.style.display === 'none' || !state.gsap) return;
    if (state.splashCtx) { try { state.splashCtx.revert(); } catch (e) {} }

    state.splashCtx = state.gsap.context(() => {
        const els = state.gsap.utils.toArray(
            '.splash-minimal .splash-logo-lg, .splash-minimal .splash-header-pill, .splash-minimal h1, .splash-minimal .splash-sub, .splash-minimal .btn-splash-enter, .splash-minimal .splash-quick-links, .splash-minimal .splash-meta-line'
        );
        if (els.length) {
            state.gsap.fromTo(els,
                { opacity: 0, y: 20, scale: 0.97 },
                {
                    opacity: 1, y: 0, scale: 1,
                    duration: 0.62,
                    ease: 'power3.out',
                    stagger: 0.065,
                    clearProps: 'opacity,transform'
                }
            );
        }

        // Pointer parallax halus untuk orb & magnetic pull tombol utama (desktop pointer fine)
        const isFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (!isFine) return;

        const orb1 = splash.querySelector('.splash-orb-1');
        const orb2 = splash.querySelector('.splash-orb-2');
        const q1x = orb1 ? state.gsap.quickTo(orb1, 'x', { duration: 0.9, ease: 'power3.out' }) : null;
        const q1y = orb1 ? state.gsap.quickTo(orb1, 'y', { duration: 0.9, ease: 'power3.out' }) : null;
        const q2x = orb2 ? state.gsap.quickTo(orb2, 'x', { duration: 1.1, ease: 'power3.out' }) : null;
        const q2y = orb2 ? state.gsap.quickTo(orb2, 'y', { duration: 1.1, ease: 'power3.out' }) : null;

        splash.addEventListener('pointermove', (e) => {
            if (splash.style.display === 'none') return;
            const nx = (e.clientX / window.innerWidth - 0.5) * 2;
            const ny = (e.clientY / window.innerHeight - 0.5) * 2;
            if (q1x) q1x(nx * 24);
            if (q1y) q1y(ny * 20);
            if (q2x) q2x(-nx * 28);
            if (q2y) q2y(-ny * 22);
        }, { passive: true });

        const cta = splash.querySelector('.btn-splash-enter');
        if (cta) {
            const qx = state.gsap.quickTo(cta, 'x', { duration: 0.35, ease: 'power3.out' });
            const qy = state.gsap.quickTo(cta, 'y', { duration: 0.35, ease: 'power3.out' });
            cta.addEventListener('pointermove', (e) => {
                const r = cta.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
                const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
                qx(Math.max(-10, Math.min(10, dx)));
                qy(Math.max(-6, Math.min(6, dy)));
            }, { passive: true });
            cta.addEventListener('pointerleave', () => { qx(0); qy(0); }, { passive: true });
        }
    }, splash);
}

function makeExitSplash() {
    return function exitSplashGsap(splashEl, onComplete) {
        if (!state.gsap || !splashEl) return false;
        const content = splashEl.querySelector('.splash-content');
        const tl = state.gsap.timeline({
            onComplete: () => {
                splashEl.style.display = 'none';
                splashEl.style.opacity = '';
                splashEl.style.transform = '';
                if (content) { content.style.opacity = ''; content.style.transform = ''; }
                if (typeof onComplete === 'function') onComplete();
            }
        });
        if (content) {
            tl.to(content, { y: -18, scale: 0.96, opacity: 0, duration: 0.26, ease: 'power2.in' }, 0);
        }
        tl.to(splashEl, { opacity: 0, duration: 0.32, ease: 'power2.out' }, 0.06);
        return true;
    };
}

// ── GSAP: transisi masuk halaman + ScrollTrigger.batch + Score Ring ──
function animatePageIn() {
    if (!state.gsap) return;
    const root = document.getElementById('content');
    if (!root) return;

    if (state.pageCtx) {
        try { state.pageCtx.revert(); } catch (e) {}
        state.pageCtx = null;
    }

    // Beri tahu CSS bahwa GSAP mengambil alih entrance & scroll reveal di #content
    document.documentElement.classList.add('js-gsap');

    state.pageCtx = state.gsap.context(() => {
        const vh = window.innerHeight || 900;
        const topKids = state.gsap.utils.toArray('#content > *');

        // Pisahkan elemen di atas lipatan (above the fold) vs di bawah lipatan
        const immediate = [];
        const deferred = [];
        topKids.forEach((el, idx) => {
            const r = el.getBoundingClientRect();
            if (idx < 4 || r.top < vh * 0.96) immediate.push(el);
            else deferred.push(el);
        });

        if (immediate.length) {
            state.gsap.fromTo(immediate,
                { opacity: 0, y: 18 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.48,
                    ease: 'power3.out',
                    stagger: { each: 0.048, amount: 0.24 },
                    clearProps: 'opacity,transform',
                    overwrite: true
                }
            );
        }

        // ScrollTrigger.batch untuk elemen di bawah lipatan (halus bersama Lenis)
        if (state.ScrollTrigger) {
            const batchTargets = [
                ...deferred,
                ...state.gsap.utils.toArray(
                    '#content .module-card, #content .dev-gloss-card, #content .fo-fig, #content .assess-card, #content .enrich-visual-card, #content .review-item'
                ).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.top >= vh * 0.94 && !deferred.includes(el);
                })
            ];

            if (batchTargets.length) {
                state.gsap.set(batchTargets, { opacity: 0, y: 20 });
                state.ScrollTrigger.batch(batchTargets, {
                    start: 'top 92%',
                    once: true,
                    onEnter: batch => {
                        state.gsap.to(batch, {
                            opacity: 1,
                            y: 0,
                            duration: 0.5,
                            ease: 'power3.out',
                            stagger: 0.045,
                            clearProps: 'opacity,transform',
                            overwrite: true
                        });
                    }
                });
            }

            // Parallax halus pada gambar showcase & diagram besar
            state.gsap.utils.toArray(
                '#content .img-showcase img, #content .fo-shot img, #content .img-row figure img, #content .enrich-visual-card img'
            ).forEach(img => {
                const r = img.getBoundingClientRect();
                if (r.height < 150 || r.width < 220) return;
                state.gsap.fromTo(img,
                    { yPercent: -1.8, scale: 1.03 },
                    {
                        yPercent: 1.8,
                        scale: 1.03,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: img.parentElement || img,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 0.45
                        }
                    }
                );
            });
        } else if (deferred.length) {
            state.gsap.fromTo(deferred,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.04, clearProps: 'opacity,transform' }
            );
        }

        // Animasi SVG Score Ring pada halaman hasil asesmen
        const ring = root.querySelector('.score-ring-fg');
        if (ring) {
            const dash = parseFloat(ring.getAttribute('stroke-dasharray')) || 377;
            const targetOffset = parseFloat(ring.getAttribute('stroke-dashoffset')) || 0;
            state.gsap.fromTo(ring,
                { strokeDashoffset: dash },
                { strokeDashoffset: targetOffset, duration: 1.15, ease: 'power3.out', delay: 0.12 }
            );
            const numEl = root.querySelector('.score-ring-num');
            if (numEl) {
                const targetNum = parseInt(numEl.textContent, 10);
                if (!isNaN(targetNum)) {
                    const o = { v: 0 };
                    state.gsap.to(o, {
                        v: targetNum,
                        duration: 1.05,
                        ease: 'power3.out',
                        delay: 0.12,
                        onUpdate() { numEl.textContent = Math.round(o.v); }
                    });
                }
            }
        }
    }, root);
}

// ── Motion: util spring aman (bersihkan inline style saat selesai) ──
function spring(el, frames, opts) {
    if (!state.animate || !el) return;
    try {
        const ctrl = state.animate(el, frames, opts);
        const clear = () => {
            try {
                if (el.style) {
                    el.style.opacity = '';
                    el.style.transform = '';
                }
            } catch (e) {}
        };
        if (ctrl && typeof ctrl.then === 'function') ctrl.then(clear, clear);
        else setTimeout(clear, 900);
    } catch (e) {}
}

// ── Motion: bilah progres dengan pegas ─────────────────────
function animateProgress() {
    if (!state.animate) return;
    const bars = document.querySelectorAll(
        '#content .prog-fill, #content .learn-progress > span, #content .qprogress-fill, #content .pc-prog-fill'
    );
    bars.forEach((el, i) => {
        const w = el.style && el.style.width;
        if (!w || w === '0%') return;
        try {
            state.animate(el, { width: ['0%', w] }, {
                type: 'spring',
                stiffness: 115,
                damping: 20,
                delay: Math.min(i * 0.055, 0.35)
            });
        } catch (e) {}
    });
}

// ── Motion: Command Palette, Lightbox, Tema & Toast ────────
function wireMotionHelpers() {
    api.animateCmdkOpen = function (dialogEl) {
        if (!state.animate || !dialogEl) return;
        spring(dialogEl, { opacity: [0, 1], y: [-12, 0], scale: [0.96, 1] }, {
            type: 'spring', stiffness: 440, damping: 28
        });
    };

    api.animateCmdkList = function (listEl) {
        if (!state.animate || !listEl) return;
        const items = [...listEl.querySelectorAll('.cmdk-item')].slice(0, 10);
        items.forEach((el, i) => {
            spring(el, { opacity: [0, 1], y: [6, 0] }, {
                duration: 0.22,
                delay: Math.min(i * 0.022, 0.2),
                easing: [0.22, 1, 0.36, 1]
            });
        });
    };

    api.animateLightboxOpen = function (dialogEl) {
        if (!state.animate || !dialogEl) return;
        spring(dialogEl, { opacity: [0, 1], scale: [0.92, 1], y: [14, 0] }, {
            type: 'spring', stiffness: 390, damping: 26
        });
    };

    api.animateThemeToggle = function (btnEl) {
        if (!state.animate || !btnEl) return;
        const ic = btnEl.querySelector('i');
        if (ic) {
            spring(ic, { rotate: [-90, 0], scale: [0.55, 1] }, {
                type: 'spring', stiffness: 460, damping: 18
            });
        }
    };

    api.animateToast = function (toastEl) {
        if (!state.animate || !toastEl) return;
        try {
            state.animate(toastEl, { y: [14, 0], scale: [0.94, 1] }, {
                type: 'spring', stiffness: 460, damping: 24
            });
        } catch (e) {}
    };
}

// ── Motion: micro-interaction tombol / tab / kartu / akordeon ──
function initMicro() {
    if (state.wired) return;
    state.wired = true;

    // 1) Klik spring feedback
    document.addEventListener('click', (e) => {
        if (!state.animate || !e.target || !e.target.closest) return;

        // Navigasi bawah (mobile): ikon & label memantul pegas
        const bn = e.target.closest('.bottom-nav .bnav-btn');
        if (bn) {
            spring(bn.querySelector('span'), { y: [-5, 0], opacity: [0.4, 1] },
                { type: 'spring', stiffness: 440, damping: 16 });
            spring(bn.querySelector('i'), { scale: [0.7, 1] },
                { type: 'spring', stiffness: 520, damping: 14 });
            return;
        }

        // Track switcher (topbar & sidebar)
        const tab = e.target.closest('.snav-tab');
        if (tab) {
            spring(tab, { scale: [0.95, 1] }, { type: 'spring', stiffness: 520, damping: 22 });
            spring(tab.querySelector('i'), { scale: [0.6, 1], rotate: [-14, 0] },
                { type: 'spring', stiffness: 540, damping: 14 });
            return;
        }

        // Tab konten dalam halaman
        const contentTab = e.target.closest('.tab-btn');
        if (contentTab) {
            spring(contentTab, { scale: [0.94, 1] }, { type: 'spring', stiffness: 520, damping: 22 });
            const pane = contentTab.dataset.tab && document.getElementById(contentTab.dataset.tab);
            if (pane) {
                spring(pane, { opacity: [0, 1], y: [8, 0] }, { duration: 0.28, easing: [0.22, 1, 0.36, 1] });
            }
            return;
        }

        // Akordeon & Section Sidebar
        const accHead = e.target.closest('.acc-header');
        if (accHead) {
            const body = accHead.nextElementSibling;
            if (body && body.classList.contains('open')) {
                spring(body, { opacity: [0, 1], y: [-6, 0] }, { duration: 0.26, easing: [0.22, 1, 0.36, 1] });
            }
            setTimeout(() => { if (state.lenis) state.lenis.resize(); }, 280);
            return;
        }

        // Tombol salin kode
        const copyBtn = e.target.closest('.code-copy-btn');
        if (copyBtn) {
            spring(copyBtn, { scale: [0.88, 1] }, { type: 'spring', stiffness: 540, damping: 16 });
            return;
        }

        // Chip filter / menu chip
        const chip = e.target.closest('.dg-chip, .pc-menu-chip, .glos-mode-tab');
        if (chip) {
            spring(chip, { scale: [0.93, 1] }, { type: 'spring', stiffness: 540, damping: 18 });
            return;
        }

        // Kartu aksi: animasikan ikon bagian dalam
        const card = e.target.closest(
            '.assess-card, .portal-card, .util-card, .module-card, .quick-card, .choice-card, .resume-card'
        );
        if (card) {
            const icon = card.querySelector(
                '.assess-card-icon, .pc-icon, .util-card-ic, .mc-emoji, .cc-icon, .resume-ic, .fc-icon, i'
            );
            spring(icon, { scale: [0.76, 1], rotate: [-8, 0] },
                { type: 'spring', stiffness: 540, damping: 15 });
        }
    }, { passive: true });

    // 2) Pointer spotlight glow (--mx / --my) pada Bento & Module cards (desktop only)
    const isFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (isFine) {
        let spotRaf = 0;
        let lastEvt = null;
        document.addEventListener('pointermove', (e) => {
            lastEvt = e;
            if (spotRaf) return;
            spotRaf = requestAnimationFrame(() => {
                spotRaf = 0;
                const ev = lastEvt;
                if (!ev || !ev.target || !ev.target.closest) return;
                const card = ev.target.closest(
                    '.portal-card, .module-card, .util-card, .assess-card, .quick-card, .hero-card'
                );
                if (!card) return;
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', (ev.clientX - r.left).toFixed(1) + 'px');
                card.style.setProperty('--my', (ev.clientY - r.top).toFixed(1) + 'px');
            });
        }, { passive: true });
    }
}

// ── Motion: isi sidebar & search menyusul halus ────────────
function initSidebarObserver() {
    const sb = document.getElementById('sidebar');
    if (!sb || typeof MutationObserver === 'undefined') return;
    new MutationObserver(() => {
        const isOpen = sb.classList.contains('open');
        if (window.innerWidth < 860) setScrollLock(isOpen);
        if (!state.animate || !isOpen) return;
        const items = [...sb.querySelectorAll('.snav-item, .snav-tab, .sidebar-search, .snav-section-label')]
            .filter(el => el.offsetParent !== null).slice(0, 20);
        items.forEach((el, i) => spring(el, { x: [-12, 0], opacity: [0, 1] }, {
            duration: 0.28,
            delay: Math.min(i * 0.02, 0.32),
            easing: [0.22, 1, 0.36, 1]
        }));
    }).observe(sb, { attributes: true, attributeFilter: ['class'] });
}

function initSearchObserver() {
    const res = document.getElementById('search-results');
    if (!res || typeof MutationObserver === 'undefined') return;
    new MutationObserver(() => {
        if (!state.animate || res.classList.contains('hidden')) return;
        const items = [...res.querySelectorAll('.sr-item')].slice(0, 8);
        items.forEach((el, i) => spring(el, { opacity: [0, 1], y: [6, 0] }, {
            duration: 0.26,
            delay: i * 0.024,
            easing: [0.22, 1, 0.36, 1]
        }));
    }).observe(res, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

// ── Lenis: smooth scroll + GSAP ticker + scroll lock ───────
function setScrollLock(locked) {
    state.scrollLocked = !!locked;
    if (state.lenis) {
        try {
            if (locked) state.lenis.stop();
            else state.lenis.start();
        } catch (e) {}
    }
    document.documentElement.classList.toggle('modal-open', !!locked);
}
api.setScrollLock = setScrollLock;

function initLenis() {
    const Ctor = state.Lenis;
    if (!Ctor) return;
    try {
        const lenis = new Ctor({
            duration: 1.05,
            easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            syncTouch: false,
            wheelMultiplier: 1.0,
            touchMultiplier: 1.5
        });
        state.lenis = lenis;
        window.__lenis = lenis;
        document.documentElement.classList.add('has-lenis');

        if (state.gsap) {
            state.gsap.ticker.add(t => lenis.raf(t * 1000));
            state.gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }

        lenis.on('scroll', (ev) => {
            if (state.ScrollTrigger) state.ScrollTrigger.update();
            syncScrollUI(ev && typeof ev.scroll === 'number' ? ev.scroll : window.scrollY);
        });

        api.scrollTo = (target, opts = {}) => {
            try {
                lenis.scrollTo(target, {
                    offset: typeof opts.offset === 'number' ? opts.offset : 0,
                    duration: opts.immediate ? 0 : (opts.duration || 1.0),
                    immediate: !!opts.immediate,
                    force: true
                });
                return true;
            } catch (e) { return false; }
        };

        // Jika splash sedang terbuka, hentikan scroll latar sementara
        const splash = document.getElementById('splash');
        if (splash && splash.style.display !== 'none' && getComputedStyle(splash).display !== 'none') {
            lenis.stop();
        }
    } catch (e) {
        state.lenis = null;
        window.__lenis = null;
        document.documentElement.classList.remove('has-lenis');
    }
}

function refreshLayout() {
    if (state.lenis) { try { state.lenis.resize(); } catch (e) {} }
    if (state.ScrollTrigger) { try { state.ScrollTrigger.refresh(); } catch (e) {} }
    syncScrollUI(window.scrollY || 0);
}
api.refresh = refreshLayout;

// ── BOOT ───────────────────────────────────────────────────
async function boot() {
    // Fallback scroll sync saat Lenis tidak aktif / reduced motion
    window.addEventListener('scroll', () => {
        if (!state.lenis) syncScrollUI(window.scrollY || 0);
    }, { passive: true });
    window.addEventListener('resize', () => syncScrollUI(window.scrollY || 0), { passive: true });

    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq && mq.matches) {
        state.reduced = true;
        api.status = 'reduced-motion';
        document.addEventListener('tjkt:page', () => {
            collectTocHeadings();
            syncScrollUI(0);
        });
        return;
    }

    const [g, st, m, l] = await Promise.all([
        imp(CDN.gsap),
        imp(CDN.scrollTrigger),
        imp(CDN.motion),
        imp(CDN.lenis)
    ]);

    state.gsap = (g && (g.gsap || g.default)) || null;
    state.ScrollTrigger = (st && (st.ScrollTrigger || st.default)) || null;
    if (state.gsap && state.ScrollTrigger) {
        try { state.gsap.registerPlugin(state.ScrollTrigger); } catch (e) {}
    } else {
        state.ScrollTrigger = null;
    }

    api.gsap = !!state.gsap;
    api.scrollTrigger = !!state.ScrollTrigger;
    if (api.gsap) {
        api.countUp = makeCountUp();
        api.exitSplash = makeExitSplash();
    }

    state.animate = (m && (m.animate || (m.default && m.default.animate))) || null;
    state.stagger = (m && m.stagger) || null;
    api.motion = !!state.animate;
    if (api.motion) wireMotionHelpers();

    state.Lenis = (l && (l.default || l.Lenis)) || null;
    api.lenis = !!state.Lenis;

    const parts = [
        api.gsap && 'gsap',
        api.scrollTrigger && 'scrolltrigger',
        api.motion && 'motion',
        api.lenis && 'lenis'
    ].filter(Boolean);
    api.status = parts.length ? parts.join('+') : 'cdn-gagal (fallback css)';

    if (state.Lenis) initLenis();
    if (api.gsap) initSplashChoreography();
    if (api.gsap || api.motion) {
        initMicro();
        initSidebarObserver();
        initSearchObserver();
    }

    // Event dari app.js
    document.addEventListener('tjkt:page', () => {
        if (state.lenis && !state.scrollLocked) {
            try { state.lenis.start(); } catch (e) {}
        }
        animatePageIn();
        animateProgress();
        collectTocHeadings();
        setTimeout(refreshLayout, 120);
    });

    document.addEventListener('tjkt:lock-scroll', (e) => {
        setScrollLock(Boolean(e && e.detail && e.detail.locked));
    });

    document.addEventListener('tjkt:splash-show', () => {
        if (state.lenis) { try { state.lenis.stop(); } catch (e) {} }
        setTimeout(initSplashChoreography, 40);
    });

    window.addEventListener('load', () => {
        setTimeout(refreshLayout, 180);
    });
}

boot();
