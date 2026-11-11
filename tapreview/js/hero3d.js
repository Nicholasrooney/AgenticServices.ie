/* ============================================================
   TapReview hero — live 3D product stand (progressive enhancement).

   The static product-hero.png renders first and REMAINS the
   fallback: this module only fades the 3D canvas in over it once
   the scene is fully built. It self-disables for reduced-motion
   users, missing WebGL, or any load/render failure — in every
   such case the page keeps the image, untouched.

   REVERT: delete this file + the "HERO 3D" block at the bottom of
   tapreview/index.html + the .hero3d CSS rules; the hero is then
   exactly the static image again.
   ============================================================ */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const container = document.querySelector('.hero__photo');
if (
  container &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  window.WebGLRenderingContext
) {
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}

function schedule() {
  // Stay out of the way of LCP; the image is already painted.
  setTimeout(() => { try { init(); } catch (e) { /* keep the image */ } }, 350);
}

/* ---------- Face artwork (faithful redraw of product-hero.png) ---------- */

const TX_W = 1080, TX_H = 1620;

const G_PATHS = [
  ['#4285F4', 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z'],
  ['#34A853', 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z'],
  ['#FBBC05', 'M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z'],
  ['#EA4335', 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z'],
];

function drawG(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  for (const [color, d] of G_PATHS) {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(b) * r * 0.475, cy + Math.sin(b) * r * 0.475);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawQr(ctx, x, y, size, text) {
  const qr = qrcode(0, 'H');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = size / n;
  ctx.fillStyle = '#111';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect(x + c * m, y + r * m, m + 0.4, m + 0.4);
}

function drawBrackets(ctx, x, y, size, pad, len, lw) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  const x0 = x - pad, y0 = y - pad, x1 = x + size + pad, y1 = y + size + pad, L = len;
  ctx.beginPath(); ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, y1 - L); ctx.lineTo(x0, y1); ctx.lineTo(x0 + L, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 - L, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - L); ctx.stroke();
  ctx.restore();
}

function drawTapPhone(ctx, cx, cy, s) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.translate(cx, cy);
  ctx.rotate(0.28);
  const w = s * 0.52, h = s * 0.95;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, s * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = '600 ' + (s * 0.2) + 'px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NFC', 0, s * 0.08);
  ctx.rotate(-0.28);
  for (const r of [0.62, 0.82, 1.02]) {
    ctx.beginPath();
    ctx.arc(-w * 0.62, -h * 0.42, s * r * 0.42, Math.PI * 0.75, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScanPhone(ctx, cx, cy, s) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const w = s * 0.52, h = s * 0.95;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, s * 0.1);
  ctx.stroke();
  const q = s * 0.3, qx = cx - q / 2, qy = cy - q / 2;
  ctx.lineWidth = s * 0.055;
  ctx.strokeRect(qx, qy, q * 0.42, q * 0.42);
  ctx.strokeRect(qx + q * 0.58, qy, q * 0.42, q * 0.42);
  ctx.strokeRect(qx, qy + q * 0.58, q * 0.42, q * 0.42);
  ctx.fillStyle = '#111';
  ctx.fillRect(qx + q * 0.62, qy + q * 0.62, q * 0.34, q * 0.34);
  ctx.restore();
}

function makeFaceTexture() {
  const c = document.createElement('canvas');
  c.width = TX_W; c.height = TX_H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TX_W, TX_H);

  ctx.fillStyle = '#111';
  ctx.font = '600 74px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("We'd love your feedback", TX_W / 2, 168);

  drawG(ctx, TX_W / 2, 400, 320);

  for (let i = 0; i < 5; i++) drawStar(ctx, TX_W / 2 + (i - 2) * 128, 660, 52, '#F5B60D');

  const qrSize = 400, qrX = (TX_W - qrSize) / 2, qrY = 790;
  drawQr(ctx, qrX, qrY, qrSize, 'https://agenticservices.ie');
  drawBrackets(ctx, qrX, qrY, qrSize, 46, 70, 9);

  const rowY = 1388;
  ctx.fillStyle = '#111';
  ctx.font = '500 62px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Tap', 208, rowY + 22);
  drawTapPhone(ctx, 388, rowY, 130);
  ctx.fillText('or', TX_W / 2 + 22, rowY + 22);
  drawScanPhone(ctx, 690, rowY, 130);
  ctx.fillText('Scan', 872, rowY + 22);

  const stripeW = TX_W * 0.82, stripeH = 20, sx = (TX_W - stripeW) / 2, sy = 1518;
  const cols = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, stripeW, stripeH, stripeH / 2);
  ctx.clip();
  cols.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(sx + (stripeW / 4) * i, sy, stripeW / 4 + 1, stripeH);
  });
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeBackTexture() {
  const c = document.createElement('canvas');
  c.width = TX_W; c.height = TX_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TX_W, TX_H);
  ctx.textAlign = 'center';
  ctx.font = '600 92px Outfit, sans-serif';
  ctx.fillStyle = '#e2e5e9';
  ctx.fillText('TapReview', TX_W / 2, TX_H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- Scene ---------- */

async function init() {
  await document.fonts.load("600 74px Poppins");
  await document.fonts.load("500 62px Poppins");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // Supersample: the hero canvas is small, so rendering at up to 3x and
  // letting the browser downscale is cheap and removes edge aliasing.
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio, 1) * 2, 3));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 60);
  camera.position.set(0, 2.5, 9.8);
  camera.lookAt(0, 1.7, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.06).texture;

  const stand = new THREE.Group();
  scene.add(stand);

  const acrylic = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.18,
  });

  const W = 2.7, FACE_H = 4.05, T = 0.085, LEAN = -0.2, FOOT_LEN = 1.55, BEND_R = 0.12;

  const facePivot = new THREE.Group();
  facePivot.position.y = BEND_R;
  facePivot.rotation.x = LEAN;
  stand.add(facePivot);

  const facePlate = new THREE.Mesh(new RoundedBoxGeometry(W, FACE_H, T, 5, 0.05), acrylic);
  facePlate.position.y = FACE_H / 2;
  facePivot.add(facePlate);

  // Matte print so the artwork stays legible head-on; body keeps the gloss
  const faceGeo = new THREE.PlaneGeometry(W * 0.985, FACE_H * 0.985);
  const frontArt = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({
    map: makeFaceTexture(),
    roughness: 0.55,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.5,
  }));
  frontArt.position.z = T / 2 + 0.0022;
  facePlate.add(frontArt);

  const backArt = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({
    map: makeBackTexture(),
    roughness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.5,
  }));
  backArt.position.z = -(T / 2 + 0.0022);
  backArt.rotation.y = Math.PI;
  facePlate.add(backArt);

  const foot = new THREE.Mesh(new RoundedBoxGeometry(W, T, FOOT_LEN, 5, 0.05), acrylic);
  foot.position.set(0, T / 2, -(FOOT_LEN / 2) - 0.02);
  stand.add(foot);

  const bend = new THREE.Mesh(new THREE.CylinderGeometry(BEND_R, BEND_R, W - 0.06, 24, 1, false), acrylic);
  bend.rotation.z = Math.PI / 2;
  bend.position.set(0, BEND_R, 0);
  stand.add(bend);

  // Steep top-left key: highlight sits off the face at rest
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(-4.5, 7, 1.5);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // Sonar rings: flat on the tabletop, radiating out from under the
  // stand. Two quick pulses, then a 3s rest. Scene-fixed so they stay
  // level while the stand tilts above them.
  const ripples = [];
  let thump = 0; // tiny dip of the stand as each burst fires

  function spawnRing() {
    if (document.hidden) return;
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 72),
      new THREE.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.012, -0.25);
    m.scale.setScalar(0.3);
    m.userData.age = 0;
    scene.add(m);
    ripples.push(m);
  }
  function spawnBurst() {
    thump = 1;
    spawnRing();
    setTimeout(spawnRing, 280);
  }
  setTimeout(spawnBurst, 1200);
  setInterval(spawnBurst, 3300);

  /* ---- Interaction ---- */
  let targetRX = 0, targetRY = 0, spinY = 0, targetSpinY = 0;
  let dragging = false, lastX = 0;

  window.addEventListener('pointermove', (e) => {
    if (dragging) {
      targetSpinY += (e.clientX - lastX) * 0.011;
      lastX = e.clientX;
    } else {
      const r = container.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      targetRY = THREE.MathUtils.clamp((e.clientX - cx) / innerWidth, -0.5, 0.5) * 0.9;
      targetRX = THREE.MathUtils.clamp((e.clientY - cy) / innerHeight, -0.5, 0.5) * 0.3;
    }
  }, { passive: true });

  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    renderer.domElement.setPointerCapture(e.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    targetSpinY = Math.round(targetSpinY / Math.PI) * Math.PI;
    renderer.domElement.style.cursor = 'grab';
  });
  renderer.domElement.addEventListener('dblclick', () => { targetSpinY += Math.PI; });

  window.addEventListener('deviceorientation', (e) => {
    if (e.beta === null) return;
    targetRX = THREE.MathUtils.clamp((e.beta - 45) / 160, -0.25, 0.25);
    targetRY = THREE.MathUtils.clamp(e.gamma / 70, -0.7, 0.7);
  });

  const ro = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(container);

  /* ---- Loop ---- */
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const sway = Math.sin(t * 0.6) * 0.03;

    spinY += (targetSpinY - spinY) * 0.09;
    stand.rotation.x += (targetRX - stand.rotation.x) * 0.08;
    stand.rotation.y += (targetRY + spinY + sway - stand.rotation.y) * 0.08;

    // Burst "thump": the stand dips a hair as it emits, then settles
    thump *= 0.9;
    stand.position.y = -0.022 * thump;

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.userData.age += 0.016;
      const a = r.userData.age;
      r.scale.setScalar(0.3 + a * 1.5);                    // out to ~2.7 world units
      r.material.opacity = Math.max(0, 0.5 * (1 - a / 1.6)); // slow dissolve
      if (r.material.opacity <= 0) {
        scene.remove(r);
        r.geometry.dispose();
        r.material.dispose();
        ripples.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
  }

  // First frame synchronously, then reveal and run
  renderer.render(scene, camera);
  renderer.domElement.style.cursor = 'grab';
  container.classList.add('is-3d');
  window.__hero3d = true;
  tick();
}
