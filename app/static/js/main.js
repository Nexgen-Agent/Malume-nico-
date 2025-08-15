/* ===========================
   Malume Nico Frontend Engine
   - Preloader (rewarding load)
   - Press Glow (gold ripple)
   - Smooth Scroll + Active Links
   - Reveal-on-Scroll (staggered)
   - Parallax polish
   - Lazy image decode
   - Reduced-motion aware
   - Micro-optimizations
=========================== */

// ---------- Helpers ----------
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const raf = (fn) => requestAnimationFrame(fn);

// Reduced motion preference
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Passive listeners where possible
const passive = { passive: true };

// ---------- Preloader (rewarding loading) ----------
(function preloader(){
  const el = $('#preloader');
  if(!el) return;

  const progressEl = $('#preProgress');
  let progress = 0;

  // Simulate + real signals: fonts, images decode, onload
  const tasks = [];

  // Document loaded
  tasks.push(new Promise(res => {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once:true });
  }));

  // Decode hero SVG/logo (already preloaded) + any images
  $$('img').forEach(img=>{
    tasks.push(img.decode().catch(()=>{}));
  });

  // Tiny minimum time so it feels premium (but short)
  tasks.push(new Promise(res=>setTimeout(res, 500)));

  // Progress animation
  const updateProgress = () => {
    progress = clamp(progress + Math.random()*16, 0, 95);
    progressEl.style.width = progress.toFixed(0) + '%';
    if(progress < 95) setTimeout(updateProgress, 120);
  };
  updateProgress();

  Promise.allSettled(tasks).then(()=>{
    // Finish bar then fade out container
    progress = 100;
    progressEl.style.width = '100%';
    setTimeout(()=>{
      el.classList.add('hide');
    }, 250);
  });
})();

// ---------- Smooth scroll + active link highlight ----------
(function smoothScroll(){
  // Smooth scroll for in-page anchors
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const href = a.getAttribute('href');
      if(!href || href === '#') return;
      const target = document.querySelector(href);
      if(!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block:'start' });
    }, false);
  });

  // Active link based on scroll position
  const sections = ['#home','#about','#highlights','#venue','#contact']
    .map(id => ({ id, el: $(id) }))
    .filter(x => !!x.el);

  const navLinks = new Map();
  $$('.nav-links a').forEach(a => navLinks.set(a.getAttribute('href'), a));

  const setActive = () => {
    const y = window.scrollY + 120;
    let current = '#home';
    for(const s of sections){
      if (s.el.offsetTop <= y) current = s.id;
    }
    navLinks.forEach((a, href)=>{
      if(href === current) a.style.opacity = '1';
      else a.style.opacity = '0.8';
    });
  };

  window.addEventListener('scroll', setActive, passive);
  window.addEventListener('load', setActive, { once:true });
})();

// ---------- Golden press glow (ripple + halo) ----------
(function pressGlow(){
  const addRipple = (btn, x, y) => {
    const r = document.createElement('span');
    r.className = 'gold-ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.1;
    r.style.width = r.style.height = size + 'px';
    r.style.left = (x - rect.left) + 'px';
    r.style.top  = (y - rect.top) + 'px';
    btn.appendChild(r);
    r.addEventListener('animationend', ()=> r.remove());
  };

  const handle = (e)=>{
    const btn = e.currentTarget;
    btn.classList.remove('glow-press'); // restart animation
    void btn.offsetWidth;               // reflow to restart
    btn.classList.add('glow-press');

    const x = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const y = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    addRipple(btn, x, y);
  };

  $$('[data-press-glow], .btn').forEach(btn=>{
    btn.addEventListener('click', handle);
    btn.addEventListener('touchstart', handle, passive);
  });
})();

// ---------- Reveal-on-scroll (staggered, variants) ----------
(function revealOnScroll(){
  const items = $$('.reveal');
  if(!items.length) return;

  // If reduced motion, just show all
  if (prefersReduced) {
    items.forEach(el => el.classList.add('show'));
    return;
  }

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const el = entry.target;
        const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        setTimeout(()=> el.classList.add('show'), delay);
        io.unobserve(el);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  items.forEach(el => io.observe(el));
})();

// ---------- Parallax polish (sheen speed + hero plate drift) ----------
(function parallax(){
  if (prefersReduced) return;
  const sheen = $('.gold-sheen');
  const plate = $('.hero-plate');
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    raf(()=>{
      const y = window.scrollY || 0;
      if (sheen) sheen.style.transform = `rotate(${y * 0.03}deg)`;
      if (plate){
        const t = Math.sin((y*0.002)) * 8;
        plate.style.transform = `translateY(${t}px)`;
      }
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, passive);
})();

// ---------- Lazy decode images (consistency + perceived speed) ----------
(function lazyDecode(){
  $$('img[loading="lazy"]').forEach(img=>{
    img.decode().catch(()=>{});
  });
})();

// ---------- Minor UX niceties ----------
(function focusRing(){
  // Only show outline when keyboard navigating
  function add() { document.documentElement.classList.add('kb'); }
  function remove() { document.documentElement.classList.remove('kb'); }
  window.addEventListener('keydown', e=>{ if(e.key === 'Tab') add(); }, { once:true });
  window.addEventListener('mousedown', remove);
})();

// ---------- Guard: fix anchor jumps offset by sticky header ----------
(function anchorOffset(){
  const hash = () => {
    if(!location.hash) return;
    const el = $(location.hash);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 68;
    window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
  };
  window.addEventListener('load', hash, { once:true });
})();
