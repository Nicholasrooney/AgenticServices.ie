/* Cookieboy — cart, collection slots and checkout */
(() => {
  const CFG = window.COOKIEBOY;
  const DATA = window.COOKIEBOY_PRODUCTS;
  const PRODUCTS = DATA.products;
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const $ = s => document.querySelector(s);
  const euro = c => '€' + (c / 100).toFixed(2);
  const KEY = 'cookieboy-bag';

  /* ---------- storage (best-effort) ---------- */
  let bag = {};
  try { bag = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { bag = {}; }
  for (const id of Object.keys(bag)) if (!byId[id] || !(bag[id] > 0)) delete bag[id];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) {} };

  const count = () => Object.values(bag).reduce((a, b) => a + b, 0);
  const total = () => Object.entries(bag).reduce((a, [id, q]) => a + byId[id].price * q, 0);

  /* ---------- product grid ---------- */
  const grid = $('#productGrid');
  let filter = 'all';

  function cardFoot(p) {
    const q = bag[p.id] || 0;
    if (!q) return `<button class="add-btn" data-add="${p.id}">Add +</button>`;
    return `<div class="stepper" aria-label="Quantity of ${p.name}">
      <button data-dec="${p.id}" aria-label="Remove one">−</button>
      <output>${q}</output>
      <button data-inc="${p.id}" aria-label="Add one">+</button></div>`;
  }

  function renderGrid() {
    const list = PRODUCTS.filter(p => p.category === 'cookie').filter(p =>
      filter === 'all' ||
      (filter === 'vegan' && p.tags.includes('vegan')) ||
      (filter === 'nut-free' && !p.tags.includes('nuts')));
    grid.innerHTML = list.map(p => `
      <article class="card">
        <div class="card-img"><img src="${p.image}" alt="${p.name} cookie" loading="lazy"></div>
        <div class="card-body">
          <h3 class="card-title">${p.name}</h3>
          <p class="card-desc">${p.desc}</p>
          <div class="card-tags">${p.tags.map(t => `<span class="tag tag-${t}">${t === 'nuts' ? 'contains nuts' : t}</span>`).join('')}</div>
          <div class="card-foot"><span class="price">${euro(p.price)}</span><span data-foot="${p.id}">${cardFoot(p)}</span></div>
        </div>
      </article>`).join('') || '<p>No cookies match that filter today.</p>';
  }

  function renderDrinks() {
    const el = $('#drinkList'); if (!el) return;
    el.innerHTML = PRODUCTS.filter(p => p.category === 'drink').map(p => `
      <li class="drink"><span class="drink-name">${p.name}</span><span class="drink-price">${euro(p.price)}</span><span data-foot="${p.id}">${cardFoot(p)}</span></li>`).join('');
  }

  document.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
    function renderDrinks() {
    const el = $('#drinkList'); if (!el) return;
    el.innerHTML = PRODUCTS.filter(p => p.category === 'drink').map(p => `
      <li class="drink"><span class="drink-name">${p.name}</span><span class="drink-price">${euro(p.price)}</span><span data-foot="${p.id}">${cardFoot(p)}</span></li>`).join('');
  }

  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-on', c === ch));
    filter = ch.dataset.filter;
    renderGrid();
  }));

  /* ---------- bag changes ---------- */
  function change(id, delta) {
    const q = Math.max(0, Math.min(CFG.MAX_PER_ITEM, (bag[id] || 0) + delta));
    if (q) bag[id] = q; else delete bag[id];
    save();
    update();
    if (delta > 0) toast(`${byId[id].name} added`);
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-add],[data-inc],[data-dec]');
    if (!t) return;
    const id = t.dataset.add || t.dataset.inc || t.dataset.dec;
    change(id, t.dataset.dec ? -1 : 1);
  });

  function update() {
    const n = count();
    const bc = $('#bagCount');
    if (bc.textContent !== String(n)) { bc.textContent = n; bc.classList.remove('bump'); void bc.offsetWidth; bc.classList.add('bump'); }
    document.querySelectorAll('[data-foot]').forEach(el => { el.innerHTML = cardFoot(byId[el.dataset.foot]); });
    renderBag();
  }

  function renderBag() {
    const entries = Object.entries(bag);
    $('#bagEmpty').hidden = entries.length > 0;
    $('#checkoutForm').hidden = entries.length === 0;
    $('#drawerFoot').hidden = entries.length === 0;
    $('#bagList').innerHTML = entries.map(([id, q]) => {
      const p = byId[id];
      return `<li class="bag-item">
        <img src="${p.image || 'images/latte-and-boxes.webp'}" alt="">
        <div><div class="bag-item-name">${p.name}</div><div class="bag-item-price">${euro(p.price)} × ${q} = ${euro(p.price * q)}</div></div>
        <div class="stepper"><button data-dec="${id}" aria-label="Remove one">−</button><output>${q}</output><button data-inc="${id}" aria-label="Add one">+</button></div>
      </li>`;
    }).join('');
    $('#bagTotal').textContent = euro(total());
  }

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  function openBag() { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false; buildDays(); }
  function closeBag() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); scrim.hidden = true; }
  $('#bagBtn').addEventListener('click', openBag);
  $('#closeBag').addEventListener('click', closeBag);
  scrim.addEventListener('click', closeBag);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBag(); });
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeBag(); });

  /* ---------- collection slots ---------- */
  const toMin = hm => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const fmt = m => { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); const ap = h >= 12 ? 'pm' : 'am'; return `${((h + 11) % 12) + 1}:${mm}${ap}`; };
  const dayName = (d, i) => i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' });

  function slotsFor(date, isToday) {
    const h = CFG.HOURS[date.getDay()];
    if (!h) return [];
    const open = toMin(h[0]), last = toMin(h[1]) - CFG.LAST_ORDER_MINUTES;
    let start = open + CFG.PREP_MINUTES;
    if (isToday) {
      const now = new Date();
      const earliest = now.getHours() * 60 + now.getMinutes() + CFG.PREP_MINUTES;
      start = Math.max(start, Math.ceil(earliest / CFG.SLOT_MINUTES) * CFG.SLOT_MINUTES);
    }
    const out = [];
    for (let m = start; m <= last; m += CFG.SLOT_MINUTES) out.push(m);
    return out;
  }

  const daySel = $('#pickupDay'), timeSel = $('#pickupTime');
  let days = [];
  function buildDays() {
    days = [];
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (let i = 0; i <= CFG.DAYS_AHEAD; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      const s = slotsFor(d, i === 0);
      if (s.length) days.push({ d, i, s });
    }
    const keep = daySel.value;
    daySel.innerHTML = days.map((x, k) => `<option value="${k}">${dayName(x.d, x.i)}</option>`).join('');
    if (keep && daySel.querySelector(`option[value="${keep}"]`)) daySel.value = keep;
    buildTimes();
  }
  function buildTimes() {
    const x = days[daySel.value];
    if (!x) { timeSel.innerHTML = '<option value="">No slots</option>'; return; }
    const keep = timeSel.value;
    timeSel.innerHTML = x.s.map((m, k) => `<option value="${m}">${k === 0 && x.i === 0 ? 'ASAP · ' : ''}${fmt(m)}</option>`).join('');
    if (keep && timeSel.querySelector(`option[value="${keep}"]`)) timeSel.value = keep;
    $('#slotHint').textContent = `Collect at the counter, 20 Stephen Street Lower. Ready from ${fmt(x.s[0])}.`;
  }
  daySel.addEventListener('change', buildTimes);

  function pickupLabel() {
    const x = days[daySel.value];
    return `${dayName(x.d, x.i)} at ${fmt(Number(timeSel.value))}`;
  }
  function pickupISO() {
    const x = days[daySel.value]; const d = new Date(x.d);
    d.setMinutes(Number(timeSel.value));
    return d.toISOString();
  }

  /* ---------- checkout ---------- */
  const form = $('#checkoutForm'), err = $('#formError'), payBtn = $('#payBtn');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const name = $('#custName').value.trim(), phone = $('#custPhone').value.trim(), email = $('#custEmail').value.trim();
    if (!count()) return;
    if (!days.length || !timeSel.value) { err.textContent = 'Sorry, there are no collection slots left. Please try a later day.'; return; }
    if (name.length < 2) { err.textContent = 'Please add your name.'; $('#custName').focus(); return; }
    if (phone.replace(/\D/g, '').length < 7) { err.textContent = 'Please add a mobile number so we can reach you.'; $('#custPhone').focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Please add a valid email for your receipt.'; $('#custEmail').focus(); return; }

    const order = {
      items: Object.entries(bag).map(([id, qty]) => ({ id, qty })),
      pickup: pickupISO(), pickupLabel: pickupLabel(),
      name, phone, email, note: $('#custNote').value.trim()
    };

    payBtn.disabled = true; payBtn.textContent = 'Processing…';
    try {
      if (CFG.PAYMENTS_MODE === 'stripe') {
        const r = await fetch(CFG.CHECKOUT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) { window.location.href = j.url; return; }
        throw new Error(j.error || 'Payment could not be started.');
      }
      await new Promise(r => setTimeout(r, 900)); // demo: simulate the card step
      confirmOrder(order, true);
    } catch (ex) {
      err.textContent = ex.message + ' Please try again.';
    } finally {
      payBtn.disabled = false; payBtn.textContent = 'Pay & collect';
    }
  });

  function confirmOrder(order, demo) {
    const no = 'CB-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    $('#confirmNo').textContent = no;
    $('#confirmWhen').textContent = `Collect ${order.pickupLabel} at 20 Stephen Street Lower. We'll text ${order.phone} if anything changes.`;
    $('#confirmItems').innerHTML = order.items.map(i => `<li>${i.qty} × ${byId[i.id].name}</li>`).join('') + `<li><strong>Total ${euro(total())}</strong></li>`;
    $('#demoFlag').hidden = !demo;
    bag = {}; save(); update(); closeBag();
    $('#confirmModal').hidden = false;
    $('#confirmClose').focus();
  }
  $('#confirmClose').addEventListener('click', () => { $('#confirmModal').hidden = true; });

  /* ---------- open now + today's hours ---------- */
  (function openNow() {
    const now = new Date(), d = now.getDay(), h = CFG.HOURS[d];
    document.querySelectorAll('.hours tr').forEach(tr => { if (tr.dataset.days.split(',').map(Number).includes(d)) tr.classList.add('today'); });
    const el = $('#openNow'); if (!el) return;
    const m = now.getHours() * 60 + now.getMinutes();
    const open = h && m >= toMin(h[0]) && m < toMin(h[1]);
    el.classList.toggle('closed', !open);
    el.innerHTML = open ? `<span class="dot"></span>Open now · until ${fmt(toMin(h[1]))}` : `<span class="dot"></span>Closed now · order ahead for later`;
  })();

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1600); }

  renderGrid();
  renderDrinks();
  update();
})();
