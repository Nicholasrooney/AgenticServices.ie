/* IRELAND_NET — Vanta.NET-style 3D network background where the point/line
 * structure traces the island of Ireland, with ambient points trailing off.
 *
 * Drop-in shaped replacement for the site's VANTA.NET hero background:
 *   window.__vantaEffect = IRELAND_NET({ el: '#vanta-bg', color: 0x16a34a, backgroundColor: 0xffffff });
 * Returns an object with .destroy() like a vanta effect.
 *
 * Requires: three.js (tested against r134, same build the site loads) and
 * IRELAND_OUTLINE (js/ireland-outline.js — normalized coastal ring, y up).
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    el: null,
    mouseControls: true,
    touchControls: true,
    color: 0x16a34a,          // dot green (site primary)
    backgroundColor: 0xffffff,
    lineGrey: 1,              // 0 = full green lines, 1 = fully grey lines
    lineAlpha: 1.4,           // global line-visibility multiplier (alphas clamp at 1)
    islandSize: 85,           // world-units height of Ireland (viewport height ~93)
    sizeScale: 1,             // applied AFTER the narrow-viewport clamp, so it
                              // still shrinks the island once the clamp binds
                              // (may be a function, re-read on every rebuild)
    motion: 1,                // speed multiplier for the per-point bob that
                              // drives the dots and the lines following them
    offsetX: 0.03,            // island centre offset, fraction of visible width
    offsetY: 0.1,             // fraction of visible height
    coastPoints: 216,
    innerPoints: 30,
    ambientPoints: 250,
    shellDepth: 9,            // extruded coastline echo behind the front ring (0 = off)
    shellAlpha: 0.14,
    washComp: 0.55,           // deepen west-side coast colour to counter the hero's white wash
    maxDistance: 7.5,         // proximity-link reach, world units
    maxLinksPerPoint: 5,
    coastJitter: 1,           // xy jitter of coast points (world units)
    depth: 0.9,               // multiplier on all z-depth jitter
    tiltDeg: -30,             // resting pitch of the whole structure
    sway: 1.5,                // idle motion + parallax strength
    moat: 6,                  // ambient-free halo outside the coastline
    seed: 7,
    showDots: true,
    debugOutline: false
  };

  /* ---------- small utils ---------- */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    return { r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 };
  }

  function mix(a, b, t) { return a + (b - a) * t; }

  // Numeric options may be supplied as functions so callers can vary them
  // by breakpoint; they are re-read on every world rebuild.
  function resolveOpt(v) { return (typeof v === 'function') ? v() : v; }

  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function makeDotTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* ---------- effect ---------- */

  function IrelandNet(userOptions) {
    this.options = Object.assign({}, DEFAULTS, userOptions || {});
    var el = this.options.el;
    this.el = typeof el === 'string' ? document.querySelector(el) : el;
    if (!this.el) throw new Error('IRELAND_NET: el not found');
    if (typeof THREE === 'undefined') throw new Error('IRELAND_NET: three.js missing');
    if (typeof IRELAND_OUTLINE === 'undefined') throw new Error('IRELAND_NET: outline data missing');

    this._time = 0;
    this._mouse = { x: 0.5, y: 0.5 };   // normalized viewport coords
    this._rot = { x: 0, y: 0 };         // eased parallax
    this._destroyed = false;

    this._initRenderer();
    this._buildWorld();
    this._bindEvents();

    var self = this;
    this._raf = requestAnimationFrame(function loop(ts) {
      if (self._destroyed) return;
      self._frame(ts);
      self._raf = requestAnimationFrame(loop);
    });
  }

  IrelandNet.prototype._initRenderer = function () {
    var w = Math.max(this.el.clientWidth, 10), h = Math.max(this.el.clientHeight, 10);
    this._lastW = w; this._lastH = h;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, w / h, 1, 400);
    this.camera.position.set(0, 0, 100);

    // visible extents of the z=0 plane, used to place the island + ambient field
    this._visH = 2 * 100 * Math.tan(THREE.MathUtils.degToRad(25));
    this._visW = this._visH * (w / h);
  };

  IrelandNet.prototype._buildWorld = function () {
    var o = this.options;
    var rng = mulberry32(o.seed);
    // clamp for narrow (mobile) viewports: island must fit the visible width,
    // and the offset must not push it off the right edge
    // The clamp keeps the island inside narrow viewports; sizeScale is
    // applied after it so a requested shrink still takes effect even when
    // the clamp is the binding constraint (which it is on phones).
    var scale = (typeof o.sizeScale === 'function') ? o.sizeScale() : o.sizeScale;
    var S = Math.min(o.islandSize, this._visW * 0.95) * (scale || 1);
    // offsetX may also be a function, so a caller can centre the island on
    // one breakpoint and push it aside on another. Note the clamp below is
    // a ceiling, not a target: shrinking the island loosens it, so a fixed
    // offsetX drifts outward as the island gets smaller.
    var offX = (typeof o.offsetX === 'function') ? o.offsetX() : o.offsetX;
    var gx = Math.min(offX * this._visW, Math.max(0, this._visW / 2 - S * 0.376 - 4));

    // ---- density normaliser -------------------------------------------
    // Point counts and link reaches are expressed in world units, so when
    // the clamp or sizeScale shrinks the island they pack into a smaller
    // shape and the net reads as a dark, cluttered scribble instead of a
    // delicate web. k rescales everything that is intrinsically tied to
    // the island so the *apparent* density stays constant at any size.
    // k === 1 whenever the island renders at its requested size, so the
    // desktop composition is untouched.
    var k = S / o.islandSize;
    // The island is a true scaled replica: point COUNTS are dimensionless
    // and stay fixed, while every world-unit LENGTH below scales by k. Dot
    // and line widths already scale with S via sizeAttenuation, so the
    // small island is the desktop one shrunk — identical shape fidelity,
    // just smaller. (Thinning the counts instead loses the coastal
    // intricacy that makes the outline read as Ireland.)
    var coastTarget = Math.max(24, Math.round(resolveOpt(o.coastPoints)));
    var innerTarget0 = Math.max(4, Math.round(resolveOpt(o.innerPoints)));
    var jitter = o.coastJitter * k;
    var shellD = o.shellDepth * k;
    var reachBase = o.maxDistance * k;
    var moatR = o.moat * k;

    // coastline ring scaled to world units
    var ring = IRELAND_OUTLINE.map(function (p) { return [p[0] * S, p[1] * S]; });

    // offsetY may be a function so callers can vary it by breakpoint;
    // it re-resolves on every rebuild, which syncSize() triggers on any
    // resize. That's more reliable than a matchMedia change listener.
    var offY = (typeof o.offsetY === 'function') ? o.offsetY() : o.offsetY;

    this.group = new THREE.Group();
    this.group.position.set(gx, offY * this._visH, 0);
    this.group.rotation.x = THREE.MathUtils.degToRad(o.tiltDeg);
    this.scene.add(this.group);

    // The island sits right of the camera axis, and with a symmetric
    // frustum that off-axis placement reads as "turned to face right".
    // Counter-yaw by the off-axis angle so it faces the viewer head-on
    // when the mouse is centred.
    this._baseYaw = -Math.atan2(gx, this.camera.position.z);

    /* --- points --- */
    // type: 0 coast, 1 inner, 2 ambient
    var pts = [];

    // coast: even resample of the ring, gentle jitter, low-frequency z relief
    var n = coastTarget;
    for (var i = 0; i < n; i++) {
      var idx = (i * ring.length / n) | 0;
      var p = ring[idx];
      var relief = Math.sin(i / n * Math.PI * 6 + o.seed) * 0.8 + Math.sin(i / n * Math.PI * 14 + o.seed * 2) * 0.5;
      pts.push({
        type: 0,
        x: p[0] + (rng() - 0.5) * 2 * jitter,
        y: p[1] + (rng() - 0.5) * 2 * jitter,
        z: (relief + (rng() - 0.5) * 1.2) * o.depth,
        amp: 0.35, phase: rng() * Math.PI * 2, freq: 0.25 + rng() * 0.3
      });
    }
    var coastN = pts.length;

    // inner: rejection-sample inside the polygon, kept off the coastline
    var innerTarget = innerTarget0, guard = 0;
    var minCoastD = S * 0.055;
    while (innerTarget > 0 && guard++ < innerTarget * 60) {
      var ix = (rng() - 0.5) * S * 0.78, iy = (rng() - 0.5) * S * 1.02;
      if (!pointInPoly(ix, iy, ring)) continue;
      var ok = true, k;
      for (k = 0; k < ring.length; k += 6) {
        var dxr = ring[k][0] - ix, dyr = ring[k][1] - iy;
        if (dxr * dxr + dyr * dyr < minCoastD * minCoastD) { ok = false; break; }
      }
      if (!ok) continue;
      // spacing between inner points
      for (k = coastN; k < pts.length; k++) {
        var dxp = pts[k].x - ix, dyp = pts[k].y - iy;
        if (dxp * dxp + dyp * dyp < (S * 0.07) * (S * 0.07)) { ok = false; break; }
      }
      if (!ok) continue;
      pts.push({
        type: 1, x: ix, y: iy, z: (rng() - 0.5) * 5 * o.depth,
        amp: 0.8, phase: rng() * Math.PI * 2, freq: 0.25 + rng() * 0.35
      });
      innerTarget--;
    }

    // ambient: fill the whole hero, thinning with distance, with a clean moat
    // around the coastline so the island's silhouette stays legible.
    var gx = this.group.position.x, gyy = this.group.position.y;
    var ax0 = -gx - this._visW * 0.55, ax1 = -gx + this._visW * 0.55;
    var ay0 = -gyy - this._visH * 0.58, ay1 = -gyy + this._visH * 0.58;
    // Ambient fills the viewport rather than the island, so it scales with
    // the visible width (visible height is fixed by the camera FOV) — not
    // with k. Otherwise a narrow phone viewport gets the desktop count
    // crammed into a third of the area.
    var ambientTarget = Math.max(30, Math.round(
      resolveOpt(o.ambientPoints) * Math.min(1, this._visW / 147.7)
    )); guard = 0;
    while (ambientTarget > 0 && guard++ < ambientTarget * 40) {
      var mx = mix(ax0, ax1, rng()), my = mix(ay0, ay1, rng());
      if (pointInPoly(mx, my, ring)) continue;
      var dMin = Infinity;
      for (var q = 0; q < ring.length; q += 4) {
        var ddx = ring[q][0] - mx, ddy = ring[q][1] - my;
        var dd = ddx * ddx + ddy * ddy;
        if (dd < dMin) dMin = dd;
      }
      dMin = Math.sqrt(dMin);
      if (dMin < moatR) continue;
      // fade: points farther from the island are fainter (trail off)
      var fade = Math.max(0.3, Math.min(1, 1 - (dMin - moatR) / (S * 0.85)));
      pts.push({
        type: 2, x: mx, y: my, z: (rng() - 0.5) * 16 * o.depth,
        fade: fade, amp: 1.4, phase: rng() * Math.PI * 2, freq: 0.2 + rng() * 0.3
      });
      ambientTarget--;
    }

    this._pts = pts;
    this._coastN = coastN;

    /* --- edges --- */
    var edges = [];
    // coast backbone: consecutive ring points — this is what draws Ireland.
    // Backbone lines run greener/stronger than the ambient mesh.
    for (i = 0; i < coastN; i++) {
      edges.push({ a: i, b: (i + 1) % coastN, alpha: 1.0, grey: o.lineGrey * 0.5 });
      if (i % 2 === 0) edges.push({ a: i, b: (i + 2) % coastN, alpha: 0.22 });
    }

    // extruded shell: faint echo of the coastline at depth + sparse struts,
    // so the island reads as a 3D wireframe structure, not a flat map
    if (o.shellDepth > 0 && o.shellAlpha > 0) {
      var shellStart = pts.length;
      for (i = 0; i < coastN; i++) {
        var fp = pts[i];
        pts.push({
          type: 3, x: fp.x, y: fp.y, z: fp.z - shellD,
          amp: fp.amp * 0.7, phase: fp.phase, freq: fp.freq
        });
      }
      for (i = 0; i < coastN; i++) {
        edges.push({ a: shellStart + i, b: shellStart + (i + 1) % coastN, alpha: o.shellAlpha });
        if (i % 5 === 0) edges.push({ a: i, b: shellStart + i, alpha: o.shellAlpha * 0.7 });
      }
    }
    // proximity links, capped per point so no hairballs form
    var linkCount = new Array(pts.length).fill(0);
    for (i = 0; i < coastN; i++) linkCount[i] = 2; // backbone uses some budget
    var cand = [];
    for (i = 0; i < pts.length; i++) {
      if (pts[i].type === 3) continue; // shell is backbone/struts only
      for (var j = i + 1; j < pts.length; j++) {
        if (pts[j].type === 3) continue;
        if (pts[i].type === 0 && pts[j].type === 0) {
          var span = Math.abs(i - j);
          if (Math.min(span, coastN - span) <= 2) continue; // backbone already
        }
        // Ambient pairs get a longer reach so the trailing-off field still
        // meshes. Ambient keeps the UNSCALED reach: its density already
        // tracks the viewport, so shrinking the reach too would leave the
        // background field disconnected. Only island-internal links use the
        // k-scaled reach.
        var reach = (pts[i].type === 2 && pts[j].type === 2) ? o.maxDistance * 2.2
          : (pts[i].type === 2 || pts[j].type === 2) ? o.maxDistance * 1.5
            : reachBase;
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < reach) cand.push({ a: i, b: j, d: d, r: reach });
      }
    }
    cand.sort(function (u, v) { return u.d / u.r - v.d / v.r; });
    for (i = 0; i < cand.length; i++) {
      var c = cand[i];
      if (linkCount[c.a] >= o.maxLinksPerPoint || linkCount[c.b] >= o.maxLinksPerPoint) continue;
      var ta = this._pts[c.a].type, tb = this._pts[c.b].type;
      var w = (ta === 2 || tb === 2) ? 0.42 : 0.55;
      var alpha = w * (1 - c.d / c.r);
      // geometric mean, not product — the product crushed far-field links to
      // near-invisibility while their dots stayed visible
      var fade = Math.sqrt((this._pts[c.a].fade || 1) * (this._pts[c.b].fade || 1));
      alpha *= fade;
      if (alpha < 0.03) continue;
      edges.push({ a: c.a, b: c.b, alpha: alpha });
      linkCount[c.a]++; linkCount[c.b]++;
    }
    this._edges = edges;

    /* --- geometry: lines --- */
    var green = hexToRgb(o.color);
    var grey = { r: 0.42, g: 0.47, b: 0.45 };
    var lr = mix(green.r, grey.r, o.lineGrey), lg = mix(green.g, grey.g, o.lineGrey), lb = mix(green.b, grey.b, o.lineGrey);

    // westness: 0 at the island's east edge → 1 at its west edge, used to
    // counter the hero's left-anchored white wash with deeper colour
    var ringXs = ring.map(function (p) { return p[0]; });
    var xW = Math.min.apply(null, ringXs), xE = Math.max.apply(null, ringXs);
    var deep = { r: 0x06 / 255, g: 0x5f / 255, b: 0x26 / 255 };
    function westness(x) { return Math.max(0, Math.min(1, (xE - x) / (xE - xW))); }

    var lPos = new Float32Array(edges.length * 2 * 3);
    var lCol = new Float32Array(edges.length * 2 * 4);
    for (i = 0; i < edges.length; i++) {
      var aFade = Math.min(1, edges[i].alpha * o.lineAlpha);
      var eg = (edges[i].grey !== undefined) ? edges[i].grey : o.lineGrey;
      var er = mix(green.r, grey.r, eg), egc = mix(green.g, grey.g, eg), eb = mix(green.b, grey.b, eg);
      var ea = edges[i].a, ebi = edges[i].b;
      if (pts[ea].type === 0 && pts[ebi].type === 0) {
        var wn = o.washComp * westness((pts[ea].x + pts[ebi].x) / 2);
        er = mix(er, deep.r, wn); egc = mix(egc, deep.g, wn); eb = mix(eb, deep.b, wn);
      }
      for (var v = 0; v < 2; v++) {
        lCol[(i * 2 + v) * 4 + 0] = er;
        lCol[(i * 2 + v) * 4 + 1] = egc;
        lCol[(i * 2 + v) * 4 + 2] = eb;
        lCol[(i * 2 + v) * 4 + 3] = aFade;
      }
    }
    var lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage));
    lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 4));
    var lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
    this.lines = new THREE.LineSegments(lGeo, lMat);
    this.group.add(this.lines);

    /* --- geometry: dots (island + ambient at different sizes) --- */
    this._dotGroups = [];
    if (o.showDots) {
      var tex = makeDotTexture();
      var mk = function (indices, size, self) {
        if (!indices.length) return;
        var pPos = new Float32Array(indices.length * 3);
        var pCol = new Float32Array(indices.length * 4);
        for (var t = 0; t < indices.length; t++) {
          var pt = self._pts[indices[t]];
          var dr = green.r, dg = green.g, db = green.b;
          if (pt.type !== 2) {
            var wnd = o.washComp * 0.8 * westness(pt.x);
            dr = mix(dr, deep.r, wnd); dg = mix(dg, deep.g, wnd); db = mix(db, deep.b, wnd);
          }
          pCol[t * 4 + 0] = dr; pCol[t * 4 + 1] = dg; pCol[t * 4 + 2] = db;
          pCol[t * 4 + 3] = (pt.type === 2 ? 0.75 * pt.fade : 1.0);
        }
        var pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
        pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 4));
        var pMat = new THREE.PointsMaterial({
          size: size, sizeAttenuation: true, map: tex,
          vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.05
        });
        var cloud = new THREE.Points(pGeo, pMat);
        self.group.add(cloud);
        self._dotGroups.push({ cloud: cloud, indices: indices });
      };
      var islandIdx = [], ambientIdx = [];
      for (i = 0; i < pts.length; i++) {
        if (pts[i].type === 3) continue; // shell has no dots
        (pts[i].type === 2 ? ambientIdx : islandIdx).push(i);
      }
      mk(islandIdx, S * 0.03, this);
      mk(ambientIdx, S * 0.026, this);
    }

    /* --- debug outline --- */
    if (o.debugOutline) {
      var dPos = new Float32Array(ring.length * 3);
      for (i = 0; i < ring.length; i++) {
        dPos[i * 3] = ring[i][0]; dPos[i * 3 + 1] = ring[i][1]; dPos[i * 3 + 2] = 0;
      }
      var dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      this.group.add(new THREE.LineLoop(dGeo, new THREE.LineBasicMaterial({ color: 0xff2255 })));
    }
  };

  IrelandNet.prototype._frame = function (ts) {
    if (!this._t0) this._t0 = ts;
    var t = (ts - this._t0) / 1000;
    var o = this.options;

    // per-point bob around rest positions. tm scales time, not amplitude,
    // so the dots travel the same distance — just slower.
    var tm = t * (o.motion != null ? o.motion : 1);
    var pts = this._pts;
    var live = this._live || (this._live = new Float32Array(pts.length * 3));
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var s = Math.sin(tm * p.freq * Math.PI * 2 + p.phase) * p.amp;
      var c = Math.cos(tm * p.freq * 1.7 * Math.PI + p.phase * 1.3) * p.amp * 0.6;
      live[i * 3 + 0] = p.x + c;
      live[i * 3 + 1] = p.y + s * 0.5;
      live[i * 3 + 2] = p.z + s;
    }

    // lines follow points
    var lPos = this.lines.geometry.attributes.position;
    var edges = this._edges;
    for (i = 0; i < edges.length; i++) {
      var a = edges[i].a, b = edges[i].b;
      lPos.array[i * 6 + 0] = live[a * 3]; lPos.array[i * 6 + 1] = live[a * 3 + 1]; lPos.array[i * 6 + 2] = live[a * 3 + 2];
      lPos.array[i * 6 + 3] = live[b * 3]; lPos.array[i * 6 + 4] = live[b * 3 + 1]; lPos.array[i * 6 + 5] = live[b * 3 + 2];
    }
    lPos.needsUpdate = true;

    for (var g = 0; g < this._dotGroups.length; g++) {
      var dg = this._dotGroups[g];
      var arr = dg.cloud.geometry.attributes.position;
      for (i = 0; i < dg.indices.length; i++) {
        var idx = dg.indices[i];
        arr.array[i * 3] = live[idx * 3]; arr.array[i * 3 + 1] = live[idx * 3 + 1]; arr.array[i * 3 + 2] = live[idx * 3 + 2];
      }
      arr.needsUpdate = true;
    }

    // idle sway + eased mouse parallax
    var sway = o.sway;
    var targetY = ((this._mouse.x - 0.5) * 0.42 + Math.sin(t * 0.10) * 0.05) * sway;
    var targetX = ((this._mouse.y - 0.5) * 0.26 + Math.cos(t * 0.13) * 0.035) * sway;
    this._rot.y += (targetY - this._rot.y) * 0.045;
    this._rot.x += (targetX - this._rot.x) * 0.045;
    this.group.rotation.y = (this._baseYaw || 0) + this._rot.y;
    this.group.rotation.x = THREE.MathUtils.degToRad(o.tiltDeg) + this._rot.x;

    this.renderer.render(this.scene, this.camera);
  };

  IrelandNet.prototype._bindEvents = function () {
    var self = this;
    this._onMouse = function (e) {
      self._mouse.x = e.clientX / window.innerWidth;
      self._mouse.y = e.clientY / window.innerHeight;
    };
    this._onTouch = function (e) {
      if (e.touches && e.touches.length) {
        self._mouse.x = e.touches[0].clientX / window.innerWidth;
        self._mouse.y = e.touches[0].clientY / window.innerHeight;
      }
    };
    this._onResize = function () {
      clearTimeout(self._rt);
      self._rt = setTimeout(function () { self.syncSize(); }, 200);
    };
    if (this.options.mouseControls) window.addEventListener('mousemove', this._onMouse, { passive: true });
    if (this.options.touchControls) window.addEventListener('touchmove', this._onTouch, { passive: true });
    window.addEventListener('resize', this._onResize);

    // Watch the host element itself, not just the window. The element can
    // change size without a window resize event (mobile URL bar, layout
    // shifts, devtools viewport changes), and a missed resize leaves the
    // island built for the wrong breakpoint.
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(this.el);
    }
  };

  // resize renderer/camera to the host element and rebuild the world if the
  // size actually changed; safe to call any time (capture helpers use it to
  // bypass throttled resize timers in occluded panes)
  IrelandNet.prototype.syncSize = function () {
    var w = Math.max(this.el.clientWidth, 10), h = Math.max(this.el.clientHeight, 10);
    if (w === this._lastW && h === this._lastH) return;
    this._lastW = w; this._lastH = h;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._visH = 2 * 100 * Math.tan(THREE.MathUtils.degToRad(25));
    this._visW = this._visH * (w / h);
    this._teardownWorld();
    this._buildWorld();
  };

  IrelandNet.prototype._teardownWorld = function () {
    if (!this.group) return;
    var self = this;
    this.group.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    this.scene.remove(this.group);
    this.group = null;
    this._live = null;
    this._dotGroups = [];
  };

  IrelandNet.prototype.setOptions = function (patch) {
    Object.assign(this.options, patch || {});
    this._teardownWorld();
    this._buildWorld();
  };

  IrelandNet.prototype.destroy = function () {
    this._destroyed = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('mousemove', this._onMouse);
    window.removeEventListener('touchmove', this._onTouch);
    window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    this._teardownWorld();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  };

  global.IRELAND_NET = function (options) { return new IrelandNet(options); };

})(typeof window !== 'undefined' ? window : this);
