// Agentic Services — main.js

document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
});

/* ========== PRELOADER — Counter Animation ========== */
var preloaderAnimationDone = false;
var windowLoaded = false;

function initPreloader() {
  const preloader = document.querySelector('.preloader');
  if (!preloader) { onReady(); return; }

  const counter = preloader.querySelector('.preloader__counter');

  // Init Vanta as soon as window loads (independent of animation)
  window.addEventListener('load', () => {
    windowLoaded = true;
    initVanta();
    // If animation already finished while waiting for load, dismiss now
    if (preloaderAnimationDone) dismissPreloader(preloader);
  });

  // Start the counter animation immediately — don't wait for window.load
  if (counter) runCounterAnimation(preloader, counter);
  else dismissPreloader(preloader);
}

function runCounterAnimation(preloader, counter) {
  var cursor = preloader.querySelector('.preloader__cursor');
  var typed = preloader.querySelector('.preloader__typed');

  // Show the full first word straight away — the counter animation
  // handles "Services", no typing jump beforehand.
  if (typed) typed.textContent = 'Agentic';

  // 2 cursor blinks (1s) + 0.5s hold with cursor visible, then start counting
  if (cursor) {
    setTimeout(function() {
      cursor.style.animation = 'none';
      cursor.style.opacity = '1';
    }, 1000);
  }
  setTimeout(function() {
    counter.textContent = '1';
    if (cursor) cursor.remove();

    // Phase A: 1→10 over 733ms (snappy, deliberate)
    // Phase B1: 10→~500k over 500ms (building)
    // Phase B2: ~500k→1,000,000 over 250ms (burst — saves 250ms)
    // Compound lingers 550ms (300 + 250 saved)
    var phaseA = 733;
    var phaseB1 = 500;
    var phaseB2 = 250;
    var start = performance.now();
    var lastDisplay = -1;

    function tick(now) {
      var elapsed = now - start;
      var value;

      if (elapsed < phaseA) {
        var p = elapsed / phaseA;
        value = Math.max(1, Math.floor(1 + 9 * Math.pow(p, 2.5)));
      } else if (elapsed < phaseA + phaseB1) {
        // First half of explosive phase: 10 → ~500,000
        var p = (elapsed - phaseA) / phaseB1;
        value = Math.floor(10 + 499990 * Math.pow(p, 5));
      } else if (elapsed < phaseA + phaseB1 + phaseB2) {
        // Second half: ~500,000 → 1,000,000 (much faster)
        var p = (elapsed - phaseA - phaseB1) / phaseB2;
        value = Math.floor(500000 + 500000 * Math.pow(p, 3));
      } else {
        counter.textContent = 'Services';
        preloaderAnimationDone = true;
        // Linger on "Services" — saved time added here
        setTimeout(function() {
          if (windowLoaded) {
            dismissPreloader(preloader);
          } else {
            window.addEventListener('load', function() {
              dismissPreloader(preloader);
            });
          }
        }, 550);
        return;
      }

      if (value !== lastDisplay) {
        counter.textContent = value.toLocaleString();
        lastDisplay = value;
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, 1500);
}

function dismissPreloader(preloader) {
  preloader.classList.add('is-done');
  preloader.addEventListener('transitionend', function() {
    preloader.remove();
  }, { once: true });
  setTimeout(function() { if (document.contains(preloader)) preloader.remove(); }, 600);
  onReady();
}

var __appStarted = false;
function onReady() {
  if (__appStarted) return;
  __appStarted = true;
  initApp();
}

function initApp() {
  initLenis();
  initGSAP();
  // Vanta already initialized in preloader phase — skip if already running
  if (!window.__vantaEffect) initVanta();
  initBarba();
  initMobileMenu();
  initStickyCta();
  initCountUp();
  initProjectPanels();
  initDynamicYear();
  initScrollToTop();
  initLogoOSpin();
  initCtaAscii();

  // Safety net: force hero elements visible if GSAP animations stall
  setTimeout(() => {
    document.querySelectorAll('.hero__title, .hero__title .word, .hero .eyebrow, .hero__sub, .hero__actions, .page-hero .eyebrow, .page-hero__title, .page-hero__sub').forEach(el => {
      if (getComputedStyle(el).opacity === '0') {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
  }, 1500);
}

/* ========== LENIS SMOOTH SCROLL ========== */
function initLenis() {
  if (typeof Lenis === 'undefined') return;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
  });

  window.__lenis = lenis;

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
}

/* ========== GSAP SCROLL ANIMATIONS ========== */
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Hero word-by-word reveal (home page only)
  const heroTitle = document.querySelector('.hero__title');
  if (heroTitle) {
    // Preserve .hero-paid span during word split
    var text = heroTitle.textContent;
    var words = text.split(/\s+/).filter(Boolean);
    heroTitle.innerHTML = words.map(function(w) {
      if (/^paid/.test(w)) {
        return '<span class="word" style="display:inline-block"><span class="hero-paid">' + w + '</span></span>';
      }
      return '<span class="word" style="display:inline-block">' + w + '</span>';
    }).join(' ');

    gsap.to('.hero .eyebrow', {
      opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0,
    });

    gsap.to('.hero__title .word', {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out', delay: 0.15,
    });

    gsap.to('.hero__sub, .hero__actions', {
      opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.6,
    });

    // "paid" / "seen" rotating scramble
    var paidEl = document.querySelector('.hero-paid');
    if (paidEl) {
      var symbols = ['€','£','$','¥'];
      var words = ['paid', 'seen'];
      var scrambleSpeed = 60;

      // Rolling wave transition: each letter scrambles then locks to new word,
      // with the lock trailing 2 positions behind the scramble start
      function transitionWord(fromWord, toWord, onComplete) {
        var stepDelay = 200;
        var lockOffset = 2;
        var positions = 4;
        var scrambling = [false, false, false, false];
        var locked = [false, false, false, false];
        var state = fromWord.split('');

        for (var p = 0; p < positions; p++) {
          (function(pos) {
            setTimeout(function() { scrambling[pos] = true; }, pos * stepDelay);
            setTimeout(function() {
              scrambling[pos] = false;
              locked[pos] = true;
              state[pos] = toWord[pos];
            }, (pos + lockOffset) * stepDelay);
          })(p);
        }

        var toGreen = (toWord === 'seen');
        var fromGreen = (fromWord === 'seen');

        var renderInterval = setInterval(function() {
          var allDone = locked[0] && locked[1] && locked[2] && locked[3];
          if (allDone) {
            clearInterval(renderInterval);
            if (toGreen) {
              paidEl.innerHTML = '<span style="color:var(--primary)">' + toWord + '.</span>';
            } else {
              paidEl.textContent = toWord + '.';
            }
            // Update width lock to fit new word
            if (wordSpan) {
              wordSpan.style.width = 'auto';
              wordSpan.style.width = wordSpan.getBoundingClientRect().width + 'px';
            }
            if (onComplete) onComplete();
            return;
          }
          var display = '';
          for (var i = 0; i < positions; i++) {
            var ch;
            if (locked[i]) {
              ch = toWord[i];
              if (toGreen) ch = '<span style="color:var(--primary)">' + ch + '</span>';
            } else if (scrambling[i]) {
              ch = symbols[Math.floor(Math.random() * symbols.length)];
            } else {
              // Still showing old letter — keep green if from "seen"
              ch = state[i];
              if (fromGreen) ch = '<span style="color:var(--primary)">' + ch + '</span>';
            }
            display += ch;
          }
          paidEl.innerHTML = display;
        }, scrambleSpeed);
      }

      // Lock width on parent .word span to prevent layout shift during scramble
      var wordSpan = paidEl.closest('.word');
      if (wordSpan) {
        var w = wordSpan.getBoundingClientRect().width;
        wordSpan.style.width = w + 'px';
        wordSpan.style.overflow = 'hidden';
      }

      // Start rotation after hero reveals
      startRotation();

      function startRotation() {
        var currentIndex = 0; // currently showing words[0] = "paid"
        function scheduleNext() {
          // 5-6s on "paid", 3-4s on "seen"
          var delay = currentIndex === 0
            ? 5000 + Math.random() * 1000
            : 3000 + Math.random() * 1000;
          setTimeout(function() {
            var from = words[currentIndex];
            var nextIndex = (currentIndex + 1) % words.length;
            var to = words[nextIndex];
            transitionWord(from, to, function() {
              currentIndex = nextIndex;
              scheduleNext();
            });
          }, delay);
        }
        scheduleNext();
      }
    }
  }

  // Page hero fade-in (non-home pages: services, work, contact)
  const pageHero = document.querySelector('.page-hero');
  if (pageHero) {
    gsap.to('.page-hero .eyebrow, .page-hero__title, .page-hero__sub', {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.1,
    });
  }

  // Scroll-animated heading underlines (homepage only, skip chart heading)
  if (document.querySelector('[data-barba-namespace="home"]')) {
    document.querySelectorAll('.section-title').forEach(function(title) {
      if (title.classList.contains('section-title--chart')) return; // handled separately

      title.classList.add('section-title--animated');

      ScrollTrigger.create({
        trigger: title,
        start: 'top 85%',
        end: 'top 60%',
        scrub: 0.3,
        onUpdate: function(self) {
          title.style.setProperty('--ul-scale', self.progress);
        },
      });
    });

    // Mini bar chart animation with echo delay effect
    var allCharts = document.querySelectorAll('.mini-chart');
    if (allCharts.length) {
      var vH = 52;
      var targets = [8, 14, 26, 48];
      var echoDelays = [0, 0.12, 0.22, 0.31, 0.39, 0.46, 0.52, 0.57];

      ScrollTrigger.create({
        trigger: allCharts[0],
        start: 'top 50%',
        end: 'top 15%',
        scrub: 0.3,
        onUpdate: function(self) {
          var p = self.progress;
          allCharts.forEach(function(chart, ci) {
            var delay = echoDelays[ci] || 0;
            var dp = Math.max(0, (p - delay) / (1 - delay));
            var ep = dp < 1 ? 1 - Math.pow(1 - dp, 3) : 1;
            var bars = chart.querySelectorAll('.mini-chart__bar');
            bars.forEach(function(bar, i) {
              var stagger = i * 0.12;
              var bp = Math.max(0, Math.min(1, (ep - stagger) / (1 - stagger)));
              var h = targets[i] * bp;
              bar.setAttribute('height', h);
              bar.setAttribute('y', vH - h);
            });
          });
        },
      });
    }

    // Bento card SVG draw-in animation
    document.querySelectorAll('.bento-grid .card').forEach(function(card, i) {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 85%',
        once: true,
        onEnter: function() {
          setTimeout(function() {
            card.classList.add('is-drawn');
          }, i * 120); // stagger across cards
        },
      });
    });

    // Services title shoots in from the left of the screen on scroll.
    // (Replaces the old number count-up on .compound-counter — the word
    // in the heading now just renders as-is.)
    // fromTo, not from: the generic section-entrance tween below also
    // targets this element and sets its opacity to 0, and a bare from()
    // would capture that 0 as its destination — leaving the heading
    // permanently invisible. Explicit end values make it order-proof.
    var svcTitle = document.querySelector('.services-overview .section-title');
    if (svcTitle) {
      gsap.fromTo(svcTitle,
        { x: function() { return -(window.innerWidth * 0.9); }, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: svcTitle, start: 'top 85%', once: true },
        }
      );
    }

    // Fade-out every section as it scrolls off the top — one cohesive
    // rule: fading begins when a section's bottom edge passes 45% of
    // the viewport and it is fully white (invisible) by 22%.
    var fadeSelectors = '.hero, .logo-marquee, .founder, .services-overview, ' +
      '.stats-strip, .featured-work, .pricing-section, .cta-banner';
    document.querySelectorAll(fadeSelectors).forEach(function(section) {
      ScrollTrigger.create({
        trigger: section,
        start: 'bottom 45%',
        end: 'bottom 22%',
        scrub: 0.15,
        onUpdate: function(self) {
          section.style.opacity = 1 - self.progress;
        },
        onLeaveBack: function() {
          section.style.opacity = 1;
        },
      });
    });
  }

  // Section entrance animations
  const sections = document.querySelectorAll(
    '.founder, .services-overview, .stats-strip, .featured-work, .cta-banner, .service-detail, .contact-section, .portfolio-section'
  );

  sections.forEach(section => {
    let children = Array.from(section.querySelectorAll('.container > *, .founder__inner > *, .service-detail__inner > *, .contact-grid > *, .cta-banner__inner > *'));
    // The services heading has its own fly-in above, which parks it at
    // opacity 0 until its trigger fires. A gsap.from() here would read
    // that 0 as the heading's natural value and animate 0 -> 0, leaving
    // it permanently invisible — so hand that element to the fly-in only.
    if (section.classList.contains('services-overview')) {
      children = children.filter(el => !el.classList.contains('section-title'));
    }
    if (children.length === 0) return;

    if (section.classList.contains('cta-banner')) {
      // CTA is near page bottom — use onEnter callback to guarantee it fires
      gsap.set(children, { opacity: 0, y: 40 });
      ScrollTrigger.create({
        trigger: section,
        start: 'top 98%',
        once: true,
        onEnter: () => {
          gsap.to(children, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' });
        },
      });
    } else {
      gsap.from(children, {
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
      });
    }
  });

  // Tooth glint — fires once when founder section is visible
  const glint = document.querySelector('.tooth-glint');
  if (glint) {
    ScrollTrigger.create({
      trigger: '.founder',
      start: 'top 60%',
      once: true,
      onEnter: () => {
        setTimeout(() => glint.classList.add('is-active'), 1500);
      },
    });
  }

  // Card stagger animations (bento + project grids)
  document.querySelectorAll('.bento-grid, .project-grid').forEach(group => {
    const cards = group.children;
    gsap.from(cards, {
      scrollTrigger: {
        trigger: group,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      opacity: 0,
      y: 30,
      scale: 0.97,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
    });
  });


  // Mobile only: single bento card glow — closest to viewport center
  if (window.innerWidth < 768) {
    var bentoCards = Array.from(document.querySelectorAll('.bento-grid .card'));
    var currentGlow = null;

    function updateGlow() {
      var centerY = window.innerHeight / 2;
      var closest = null;
      var closestDist = Infinity;

      bentoCards.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.top + rect.height / 2;
        var dist = Math.abs(cardCenter - centerY);
        if (dist < closestDist && rect.bottom > 0 && rect.top < window.innerHeight) {
          closest = card;
          closestDist = dist;
        }
      });

      var shouldGlow = closest && closestDist < window.innerHeight * 0.35 ? closest : null;
      if (shouldGlow !== currentGlow) {
        if (currentGlow) currentGlow.classList.remove('is-glowing');
        if (shouldGlow) shouldGlow.classList.add('is-glowing');
        currentGlow = shouldGlow;
      }
    }

    window.addEventListener('scroll', updateGlow, { passive: true });
    if (window.__lenis) window.__lenis.on('scroll', updateGlow);
  }
}

/* ========== VANTA.JS HERO BACKGROUND ========== */
function initVanta() {
  if (typeof IRELAND_NET === 'undefined') return;
  const el = document.getElementById('vanta-bg');
  if (!el) return;

  if (window.__vantaEffect) {
    window.__vantaEffect.destroy();
  }

  // On phones the copy is pinned to the BOTTOM of the hero (see the
  // max-width:700px block in agentic.css) and the island rides up into
  // the top half just under the navbar, so the two never overlap and the
  // net can run vivid. Positive offsetY is up; world y points up.
  var narrow = window.matchMedia('(max-width: 700px)');
  function islandOffsetY() { return narrow.matches ? 0.18 : -0.04; }
  // 25% smaller on phones so the net sits comfortably above the copy
  function islandScale() { return narrow.matches ? 0.75 : 1; }
  // Phones stack copy under the net, so the island wants to be dead
  // centre; only the desktop side-by-side layout pushes it right.
  function islandOffsetX() { return narrow.matches ? 0 : 0.24; }

  window.__vantaEffect = IRELAND_NET({
    el: el,
    color: 0x16a34a,
    backgroundColor: 0xffffff,
    // Slightly smaller than the default 85 and nudged down (negative =
    // down; world y is up) so the island's north coast clears the navbar.
    islandSize: 78,
    // passed as functions: re-resolved whenever the effect rebuilds on
    // resize, so rotating a phone lands the island in the right place
    offsetX: islandOffsetX,
    offsetY: islandOffsetY,
    sizeScale: islandScale,
    // half speed — the dots/lines drift rather than shimmer
    motion: 0.5,
    depth: 2.5,
    tiltDeg: 0,
    lineGrey: 1,
    lineAlpha: 2,
    showDots: true,
  });
}

/* ========== BARBA.JS PAGE TRANSITIONS ========== */
function initBarba() {
  if (typeof barba === 'undefined') return;

  // Create progress bar if it doesn't exist
  if (!document.querySelector('.barba-progress')) {
    const progressBar = document.createElement('div');
    progressBar.className = 'barba-progress';
    progressBar.innerHTML = '<div class="barba-progress__bar"></div>';
    document.body.appendChild(progressBar);
  }

  barba.init({
    preventRunning: true,
    transitions: [{
      name: 'fade',
      leave(data) {
        const bar = document.querySelector('.barba-progress__bar');
        if (bar && typeof gsap !== 'undefined') {
          gsap.to(bar, { scaleX: 1, duration: 0.3, ease: 'power2.out' });
        }
        return new Promise(resolve => {
          if (typeof gsap !== 'undefined') {
            gsap.to(data.current.container, {
              opacity: 0,
              duration: 0.3,
              ease: 'power2.inOut',
              onComplete: resolve,
            });
          } else {
            resolve();
          }
        });
      },
      enter(data) {
        const bar = document.querySelector('.barba-progress__bar');

        // Reset scroll
        window.scrollTo(0, 0);
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });

        return new Promise(resolve => {
          if (typeof gsap !== 'undefined') {
            gsap.from(data.next.container, {
              opacity: 0,
              duration: 0.3,
              ease: 'power2.inOut',
              onComplete: () => {
                if (bar) gsap.to(bar, { scaleX: 0, duration: 0.2, ease: 'power2.in' });
                resolve();
              },
            });
          } else {
            resolve();
          }
        });
      },
      after() {
        // Kill old ScrollTriggers and re-init everything
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.getAll().forEach(t => t.kill());
        }
        initGSAP();
        initVanta();
        initCountUp();
        initProjectPanels();
        initStickyCta();
        initDynamicYear();
        initScrollToTop();
        updateActiveNav();
      }
    }]
  });
}

function updateActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    link.classList.remove('nav__link--active');
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('nav__link--active');
    }
  });
}

/* ========== MOBILE MENU ========== */
function initMobileMenu() {
  const hamburger = document.querySelector('.nav__hamburger');
  const menu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu__overlay');
  const closeBtn = document.querySelector('.mobile-menu__close');
  if (!hamburger || !menu) return;

  function openMenu() {
    menu.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    // Stagger link animation
    const links = menu.querySelectorAll('.mobile-menu__link');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(links,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.1 }
      );
    }
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  // Close menu when clicking a link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

/* ========== STICKY MOBILE CTA ========== */
function initStickyCta() {
  const stickyCta = document.querySelector('.sticky-cta');
  const hero = document.querySelector('.hero, .page-hero');
  if (!stickyCta || !hero) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        stickyCta.classList.add('is-visible');
      } else {
        stickyCta.classList.remove('is-visible');
      }
    });
  }, { threshold: 0 });

  observer.observe(hero);
}

/* ========== COUNT-UP ANIMATION ========== */
function initCountUp() {
  const counters = document.querySelectorAll('.stat__number[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el, target) {
  const duration = 1500;
  const fadeOut = 600;
  const start = performance.now();
  const stat = el.closest('.stat');
  const numEl = el;
  const suffixEl = stat ? stat.querySelector('.stat__suffix') : null;

  function setGlow(intensity) {
    var shadow = intensity > 0
      ? '0 0 ' + (12 * intensity) + 'px var(--primary), 0 0 ' + (24 * intensity) + 'px rgba(34,197,94,' + (0.3 * intensity) + ')'
      : 'none';
    numEl.style.textShadow = shadow;
    if (suffixEl) suffixEl.style.textShadow = shadow;
  }

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    // Glow ramps up with progress
    setGlow(progress);
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Fade glow back to 0
      var fadeStart = performance.now();
      function fadeGlow(now) {
        var fp = Math.min((now - fadeStart) / fadeOut, 1);
        setGlow(1 - fp);
        if (fp < 1) requestAnimationFrame(fadeGlow);
      }
      requestAnimationFrame(fadeGlow);
    }
  }

  requestAnimationFrame(update);
}

/* ========== PROJECT PANELS (Work page) ========== */
function initProjectPanels() {
  const cards = document.querySelectorAll('.project-card[data-project]');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const projectId = card.dataset.project;
      const panel = document.getElementById(projectId + '-panel');
      if (!panel) return;

      // Close any other open panel
      document.querySelectorAll('.project-panel.is-open').forEach(p => {
        if (p !== panel) p.classList.remove('is-open');
      });

      // Toggle this panel
      panel.classList.toggle('is-open');

      // Scroll into view if opening
      if (panel.classList.contains('is-open')) {
        setTimeout(() => {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });
  });

  // Close buttons inside panels
  document.querySelectorAll('.project-panel__close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.closest('.project-panel').classList.remove('is-open');
    });
  });
}

/* ========== DYNAMIC YEAR ========== */
function initDynamicYear() {
  document.querySelectorAll('.js-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

/* ========== SCROLL TO TOP ========== */
function initScrollToTop() {
  // Don't create duplicate buttons
  if (document.querySelector('.scroll-top')) return;

  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 16V4M4 10l6-6 6 6"/></svg>';
  document.body.appendChild(btn);

  const hero = document.querySelector('.hero, .page-hero');
  if (hero) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        btn.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0 });
    observer.observe(hero);
  }

  btn.addEventListener('click', () => {
    if (window.__lenis) {
      window.__lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

/* ========== LOGO 'O' DIGIT SPIN ========== */
function initLogoOSpin() {
  var logo = document.querySelector('.nav__logo span');
  if (!logo) return;

  // Wrap the two 'o's in Compound with spans
  logo.innerHTML = logo.textContent.replace(/o/g, function(match, offset) {
    return '<span class="logo-o" data-o="true">o</span>';
  });

  var oSpans = logo.querySelectorAll('.logo-o');
  if (oSpans.length < 2) return;

  // Lock each 'o' span to its exact measured width so digits never shift surrounding letters
  oSpans.forEach(function(span) {
    var w = span.getBoundingClientRect().width;
    span.style.width = w + 'px';
  });

  function spinO(el) {
    var digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var i = 0;
    var speed = 60;

    el.classList.add('is-digit');
    var interval = setInterval(function() {
      el.textContent = digits[i];
      i++;
      if (i >= digits.length) {
        clearInterval(interval);
        setTimeout(function() {
          el.textContent = 'o';
          el.classList.remove('is-digit');
        }, 80);
      }
    }, speed);
  }

  var isFirstCycle = true;

  function triggerCycle() {
    // Always spin first 'o'
    spinO(oSpans[0]);

    // First cycle: always both. After: 33% both, 66% only first.
    var spinBoth = isFirstCycle || Math.random() < 0.33;
    if (spinBoth) {
      var secondDelay = 100 + Math.random() * 900;
      setTimeout(function() {
        spinO(oSpans[1]);
      }, secondDelay);
    }

    isFirstCycle = false;

    // Schedule next cycle: 10-20s from now
    var nextCycle = 10000 + Math.random() * 10000;
    setTimeout(triggerCycle, nextCycle);
  }

  // Start first cycle after a short delay
  setTimeout(triggerCycle, 2000);
}

/* ========== CTA ASCII ENERGY FIELD ========== */
function initCtaAscii() {
  var canvas = document.querySelector('.cta-ascii');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var section = canvas.closest('.cta-banner');

  var chars = ['$','€','£','%','↑','+','×','·','▲','⬆','∞'];
  var cols, rows, fontSize = 14;
  var particles = [];
  var animId;
  var startTime = 0;

  function resize() {
    var rect = section.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    cols = Math.floor(canvas.width / fontSize);
    rows = Math.floor(canvas.height / fontSize);
  }

  function spawnParticle() {
    particles.push({
      x: Math.random() * cols | 0,
      y: rows + Math.random() * 4,
      speed: 0.2 + Math.random() * 0.5,
      char: chars[Math.random() * chars.length | 0]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px monospace';
    ctx.textAlign = 'center';

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      // Constant speed from the first frame — the field hits as a moment
      // rather than ramping up (was a 3s ease from 0.5x to 8x).
      var speedMult = 5.33;
      p.y -= p.speed * 0.12 * speedMult;
      var yPct = 1 - (p.y / rows);

      var fade;
      if (yPct < 0.05) {
        fade = yPct / 0.05;
      } else if (yPct < 0.4) {
        fade = 1;
      } else if (yPct < 0.93) {
        fade = 1 - ((yPct - 0.4) / 0.53);
      } else {
        fade = 0;
      }

      if (p.y < 0 || fade <= 0) {
        particles.splice(i, 1);
        continue;
      }

      var r, g, b;
      if (yPct < 0.7) {
        var t = yPct / 0.7;
        r = Math.floor(10 + 24 * t);
        g = Math.floor(80 + 117 * t);
        b = Math.floor(20 + 74 * t);
      } else {
        var t = Math.min(1, (yPct - 0.7) / 0.23);
        r = Math.floor(34 + 186 * t);
        g = Math.floor(197 + 58 * t);
        b = Math.floor(94 + 136 * t);
      }

      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillText(p.char, p.x * fontSize + fontSize / 2, p.y * fontSize);

      if (Math.random() < 0.04) {
        p.char = chars[Math.random() * chars.length | 0];
      }
    }

    ctx.globalAlpha = 1;

    var spawnRate = Math.min(cols * 1.5, 50);
    for (var s = 0; s < spawnRate; s++) {
      if (Math.random() < 0.8) spawnParticle();
    }

    animId = requestAnimationFrame(draw);
  }

  var observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) {
      resize();
      if (!animId) { startTime = performance.now(); draw(); }
    } else {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    }
  }, { threshold: 0.1 });

  observer.observe(section);
  window.addEventListener('resize', resize);
}
