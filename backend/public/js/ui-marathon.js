/**
 * UI Marathon — scroll reveals, header motion, hero parallax, micro-interactions
 */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Scroll reveal via IntersectionObserver ── */
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (prefersReducedMotion) {
      els.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    els.forEach((el) => observer.observe(el));
  }

  /* ── Header shrink on scroll ── */
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('header-scrolled', window.scrollY > 48);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Active nav link on scroll ── */
  function initNavSpy() {
    const links = document.querySelectorAll('#siteHeader .nav-links a[href^="#"]');
    if (!links.length) return;

    const sections = [];
    links.forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (section) sections.push({ link, section });
    });

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          sections.forEach(({ link, section }) => {
            link.classList.toggle('nav-active', section === entry.target);
          });
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(({ section }) => observer.observe(section));
  }

  /* ── Hero blob parallax ── */
  function initHeroParallax() {
    if (prefersReducedMotion) return;

    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    let raf = 0;
    hero.addEventListener(
      'mousemove',
      (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const rect = hero.getBoundingClientRect();
          const mx = (e.clientX - rect.left) / rect.width - 0.5;
          const my = (e.clientY - rect.top) / rect.height - 0.5;
          hero.style.setProperty('--mx', mx.toFixed(3));
          hero.style.setProperty('--my', my.toFixed(3));
          raf = 0;
        });
      },
      { passive: true }
    );

    hero.addEventListener(
      'mouseleave',
      () => {
        hero.style.setProperty('--mx', '0');
        hero.style.setProperty('--my', '0');
      },
      { passive: true }
    );
  }

  /* ── Boot ── */
  function init() {
    initScrollReveal();
    initHeaderScroll();
    initNavSpy();
    initHeroParallax();
    refreshIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
