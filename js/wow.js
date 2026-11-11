/* ============================================================
   Agentic Services — WOW PASS (Tier 1). EXPERIMENTAL LAYER.

   Adds: SplitText line-mask reveals (portfolio heading, founder
   names, CTA banner), ScrambleText decode on eyebrows, parallax +
   clip reveals in the folio mosaic, velocity-reactive marquees,
   magnetic CTAs and a cursor-follow dot.

   REVERT: delete this file + css/wow.css + the marked block at the
   bottom of index.html. main.js is untouched and does not know this
   layer exists — removal restores the previous behaviour exactly.
   ============================================================ */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  var finePointer = window.matchMedia('(pointer: fine)').matches;

  // Phone tuning. The marquee choreography is built for a wide screen:
  // at 1.55x a 375px-wide strip shows barely two logos and chops them
  // mid-word, and holding the next section white while a strip that
  // only covers ~28% of a phone screen "peaks" just leaves the viewport
  // empty. Narrow screens get a gentler swell and an earlier handover.
  // Read .matches live at use time rather than caching it — a cached
  // copy goes stale if the breakpoint is crossed without a change event
  // firing, which would leave phone tuning applied on desktop.
  var narrowMQ = window.matchMedia('(max-width: 700px)');
  function narrow() { return narrowMQ.matches; }

  function init() {
    try { splitTitles(); } catch (e) {}
    try { scrambleEyebrows(); } catch (e) {}
    try { folioMotion(); } catch (e) {}
    try { velocityMarquee(); } catch (e) {}
    try { marqueeFocus(); } catch (e) {}
    try { revealAfterMarquee(); } catch (e) {}
    if (finePointer) {
      try { magneticButtons(); } catch (e) {}
    }
  }

  /* ---- 1) SplitText line-mask reveals ----
     Skips the hero (has its own word system + paid/seen scramble) and
     the two headings that contain live inner widgets (grow-counter,
     mini charts). */
  function splitTitles() {
    if (typeof SplitText === 'undefined') return;
    gsap.registerPlugin(SplitText);

    var targets = [];
    var folioTitle = document.querySelector('.featured-work .section-title:not(.section-title--chart)');
    if (folioTitle) targets.push(folioTitle);
    document.querySelectorAll('.founder__name, .cta-banner__inner h2').forEach(function (el) {
      targets.push(el);
    });

    targets.forEach(function (el) {
      var split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'wow-line' });
      gsap.from(split.lines, {
        yPercent: 115,
        duration: 0.85,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
  }

  /* ---- 2) ScrambleText decode on eyebrows ---- */
  function scrambleEyebrows() {
    if (typeof ScrambleTextPlugin === 'undefined') return;
    gsap.registerPlugin(ScrambleTextPlugin);

    document.querySelectorAll('.eyebrow').forEach(function (el) {
      var original = el.textContent;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(el, {
            duration: 0.9,
            scrambleText: { text: original, chars: 'upperCase', speed: 0.9 },
          });
        },
      });
    });
  }

  /* ---- 3) Folio mosaic: clip reveals + scroll parallax ----
     Screenshots get wrapped in a JS-created .wow-par so the parallax
     transform never fights the CSS hover zoom on the <img>. */
  function folioMotion() {
    var tiles = gsap.utils.toArray('.folio__tile');
    if (!tiles.length) return;

    // Staggered clip reveal as tiles enter
    gsap.set(tiles, { clipPath: 'inset(12% round 12px)', autoAlpha: 0, y: 22 });
    ScrollTrigger.batch(tiles, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          clipPath: 'inset(0% round 12px)',
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'clipPath',
        });
      },
    });

    // Parallax pan inside image tiles
    document.querySelectorAll('a.folio__tile > img').forEach(function (img) {
      var wrap = document.createElement('div');
      wrap.className = 'wow-par';
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);

      gsap.set(img, { scale: 1.16 });
      gsap.fromTo(wrap, { yPercent: -5 }, {
        yPercent: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap.closest('.folio__tile'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  }

  /* ---- 4) Velocity-reactive marquees ----
     Scroll speed accelerates the existing CSS marquee animation and
     skews the viewport slightly; both ease back to rest. */
  function velocityMarquee() {
    var tracks = Array.prototype.slice.call(document.querySelectorAll('[data-marquee-track]'));
    if (!tracks.length) return;

    var viewports = tracks.map(function (t) { return t.closest('.logo-marquee__viewport'); });
    var skewSetters = viewports.map(function (v) {
      return v ? gsap.quickTo(v, 'skewX', { duration: 0.4, ease: 'power2.out' }) : null;
    });

    var lastY = window.scrollY;
    var lastT = performance.now();
    var vel = 0; // px/s, smoothed

    gsap.ticker.add(function () {
      var now = performance.now();
      var dt = Math.max(now - lastT, 1) / 1000;
      var raw = (window.scrollY - lastY) / dt;
      lastY = window.scrollY;
      lastT = now;
      vel += (raw - vel) * 0.15; // low-pass

      // The tracks crawl (~49px/s base), so the boost needs to be
      // aggressive to read: up to 7x at a hard scroll flick.
      var boost = Math.min(Math.abs(vel) / 300, 6);
      var skew = gsap.utils.clamp(-6, 6, vel / 350);

      tracks.forEach(function (t) {
        var anims = t.getAnimations ? t.getAnimations() : [];
        for (var i = 0; i < anims.length; i++) anims[i].playbackRate = 1 + boost;
      });
      skewSetters.forEach(function (set) { if (set) set(skew); });
    });
  }

  /* ---- 5b) Marquee focus: strips swell to "featured" size as they
     approach the viewport centre and then HOLD that size for the rest
     of the scroll-past (the fade-to-white in main.js handles their
     exit). Smoothstep ramp over the first half of the journey; scrub
     keeps it reversible. Scales go on the children (not the section)
     so the CSS view() entrance animation on .logo-marquee never fights
     the transform, and gsap composes the scale with the velocity skew
     already on the viewport. */
  function marqueeFocus() {
    document.querySelectorAll('.logo-marquee').forEach(function (section) {
      // A strip may stack several rows. Scale the wrapper, not each
      // row, so the gaps between rows grow too and the rows can't
      // collide as the block swells.
      var viewport = section.querySelector('.logo-marquee__rows') ||
        section.querySelector('.logo-marquee__viewport');
      if (!viewport) return;
      var head = section.querySelector('.logo-marquee__head');

      // The label leads the strip out: it fades to white as it climbs
      // the upper part of the screen, well before the section-level
      // fade in main.js takes the logos, so the top of the viewport is
      // already clearing while the next section reveals below.
      if (head) {
        ScrollTrigger.create({
          trigger: head,
          start: 'top 30%',
          end: 'top 8%',
          scrub: 0.3,
          onUpdate: function (self) {
            gsap.set(head, { opacity: 1 - self.progress });
          },
        });
      }

      // Resting geometry, used to keep the heading a matching distance
      // from the first row as the block swells. Layout reads, so they
      // are unaffected by the transforms applied during scroll; cached
      // here and refreshed whenever ScrollTrigger re-measures.
      var rows = section.querySelector('.logo-marquee__rows');
      var geo = {};
      function measure() {
        if (!rows || !head) return;
        geo.rowGap = parseFloat(getComputedStyle(rows).rowGap) || 0;
        geo.rowsH = rows.offsetHeight;
        geo.headGap = parseFloat(getComputedStyle(head).marginBottom) || 0;
        geo.headH = head.offsetHeight;
      }
      measure();

      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.4,
        onRefresh: measure,
        onUpdate: function (self) {
          // 0 → 1 by the halfway point, i.e. exactly when the strip is
          // vertically centred in the viewport; held at full size after.
          // Quintic curve: the strip stays near its resting size for
          // most of the approach, then expands hard into the centred
          // moment. Raise the exponent for an even later, sharper swell.
          var t = Math.min(1, self.progress / 0.5);
          var ramp = Math.pow(t, 5);
          // downward parallax: the strip drifts with the scroll so it
          // hangs around the centre of the screen for longer
          var sm = narrow();
          var drift = self.progress * window.innerHeight * (sm ? 0.05 : 0.13);
          var scale = 1 + (sm ? 0.14 : 0.55) * ramp;
          var headScale = 1 + (sm ? 0.3 : 1) * ramp;

          // Both blocks scale about their own centres, so the strip's
          // top edge rises and the heading's baseline drops — eating the
          // gap between them. Lift the heading by exactly the shortfall
          // so its distance to row 1 matches the gap between rows.
          var lift = 0;
          if (rows && head) {
            var wanted = geo.rowGap * scale;
            var actual = geo.headGap
              - (scale - 1) * geo.rowsH / 2
              - (headScale - 1) * geo.headH / 2;
            lift = Math.max(0, wanted - actual);
          }

          gsap.set(viewport, { scale: scale, y: drift });
          // the label grows to ~2x, peaking with the strip
          if (head) gsap.set(head, { scale: headScale, y: drift - lift });
        },
      });
    });
  }

  /* ---- 5c) Hold whatever follows a marquee white until that strip is
     well past its centred "featured" moment, so the carousel owns the
     screen alone while it peaks. The reveal runs from 58% to 80% of the
     strip's journey — comfortably after the halfway line, and complete
     before the strip's own fade-to-white (which runs from roughly 76%
     onward) finishes taking it off screen.

     Opacity goes on the inner container, not the section, so it simply
     multiplies with the section-level scroll-off fade in main.js
     instead of the two fighting over the same property. */
  function revealAfterMarquee() {
    document.querySelectorAll('.logo-marquee').forEach(function (strip) {
      var next = strip.nextElementSibling;
      var inner = next && next.querySelector(':scope > .container');
      if (!inner) return;

      gsap.set(inner, { opacity: 0 });

      ScrollTrigger.create({
        trigger: strip,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.3,
        onUpdate: function (self) {
          // Phones hand over much earlier: a short strip can't fill the
          // screen on its own, so waiting until 58% leaves a blank gap.
          var start = narrow() ? 0.3 : 0.58;
          var end = narrow() ? 0.62 : 0.8;
          var t = (self.progress - start) / (end - start);
          t = Math.max(0, Math.min(1, t));
          gsap.set(inner, { opacity: t * t * (3 - 2 * t) });
        },
      });
    });
  }

  /* ---- 5) Magnetic CTAs ---- */
  function magneticButtons() {
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' });

      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
