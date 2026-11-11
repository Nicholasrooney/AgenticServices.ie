/* Richmond: OpenTable-style booking, menus, gift vouchers */
(() => {
  const C = window.RICHMOND, B = C.booking;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const mins = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const nice = t => { const m = mins(t), h = Math.floor(m / 60), ap = h >= 12 ? 'pm' : 'am'; return ((h + 11) % 12 + 1) + ':' + pad(m % 60) + ap; };
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const euro = n => '€' + n.toFixed(2);

  /* ========== BOOKING (mirrors the octoberchinese.ie widget) ========== */
  const guests = $('#otGuests'), date = $('#otDate'), pref = $('#otPref');
  const chips = $('#otChips'), all = $('#otAll'), none = $('#otNone'), more = $('#otMore');
  const left = $('#otLeft'), leftN = $('#otLeftN'), details = $('#otDetails'), label = $('#otLabel');
  let slots = {};

  for (let g = 1; g <= B.maxGuests; g++) guests.add(new Option(g + (g === 1 ? ' person' : ' people'), g, false, g === 2));
  guests.add(new Option('More than ' + B.maxGuests, 'big'));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < B.daysAhead; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const open = (B.services[d.getDay()] || []).length > 0;
    const txt = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
    date.add(new Option(txt + (open ? '' : ' · closed'), ymd(d)));
  }
  // Start on the first day we're open
  function firstOpen() { for (const o of date.options) { const d = new Date(o.value + 'T00:00'); if ((B.services[d.getDay()] || []).length) { date.value = o.value; break; } } }
  firstOpen();

  function buildPref() {
    const d = new Date(date.value + 'T00:00'), sv = B.services[d.getDay()] || [];
    const keep = pref.value;
    pref.innerHTML = '';
    sv.forEach(s => { for (let m = mins(s.from); m <= mins(s.to); m += 30) pref.add(new Option(nice(hhmm(m)), hhmm(m))); });
    if (!sv.length) pref.add(new Option('Closed this day', ''));
    if (keep && [...pref.options].some(o => o.value === keep)) pref.value = keep;
    else { const p = [...pref.options].find(o => o.value === '19:00') || pref.options[Math.min(2, pref.options.length - 1)]; if (p) pref.value = p.value; }
  }

  // Demo availability: a stable pseudo-random pattern per date/time/party size.
  // The real build swaps this for slots.php (see README).
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  function availability() {
    const d = new Date(date.value + 'T00:00'), sv = B.services[d.getDay()] || [];
    const out = {}, g = +guests.value || 2, now = new Date();
    const cutoff = now.getHours() * 60 + now.getMinutes() + B.leadMinutes;
    const isToday = ymd(now) === date.value;
    sv.forEach(s => {
      for (let m = mins(s.from); m <= mins(s.to); m += B.slotMinutes) {
        if (isToday && m < cutoff) continue;
        const peak = (m >= 19 * 60 && m <= 20 * 60 + 15) ? .28 : 0;
        const weekend = (d.getDay() === 5 || d.getDay() === 6) ? .12 : 0;
        const big = g >= 5 ? .2 : g >= 3 ? .07 : 0;
        out[hhmm(m)] = hash(date.value + m + g) > .3 + peak + weekend + big;
      }
    });
    return out;
  }

  const chip = (t, free, checked) => `<label class="ot-chip${free ? '' : ' is-full'}"><input type="radio" name="time" value="${t}"${checked ? ' checked' : ''}${free ? '' : ' disabled'}><span>${nice(t)}</span></label>`;
  const chosen = () => { const c = document.querySelector('input[name="time"]:checked'); return c ? c.value : ''; };

  function render(keep) {
    const current = keep ? chosen() : '';
    if (guests.value === 'big') {
      chips.innerHTML = ''; all.hidden = true; more.hidden = true; left.hidden = true; label.hidden = true;
      none.hidden = false; none.innerHTML = `For groups of more than ${B.maxGuests}, please ring us on <a href="${C.tel}">${C.phone}</a> or email <a href="mailto:${C.email}">${C.email}</a>.`;
      return;
    }
    label.hidden = false;
    const free = Object.keys(slots).filter(t => slots[t]);
    const p = mins(pref.value || '19:00');
    const near = free.slice().sort((a, b) => Math.abs(mins(a) - p) - Math.abs(mins(b) - p) || (a < b ? -1 : 1)).slice(0, 5).sort();
    if (current && !near.includes(current) && slots[current]) { near.push(current); near.sort(); }
    chips.innerHTML = near.map(t => chip(t, true, t === current)).join('');
    all.innerHTML = Object.keys(slots).map(t => chip(t, slots[t], false)).join('');
    all.hidden = true;
    const d = new Date(date.value + 'T00:00'), closed = !(B.services[d.getDay()] || []).length;
    none.hidden = free.length > 0;
    none.innerHTML = closed
      ? `We're closed on ${d.toLocaleDateString('en-IE', { weekday: 'long' })}s. Try Wednesday to Sunday, or ask about Tasting Tuesdays on <a href="${C.tel}">${C.phone}</a>.`
      : `No tables left that day for ${guests.value}. Try another date, or ring us on <a href="${C.tel}">${C.phone}</a> for cancellations.`;
    more.hidden = free.length <= near.length;
    more.textContent = 'View full availability';
    left.hidden = !(free.length > 0 && free.length <= 6);
    leftN.textContent = free.length;
    label.textContent = free.length ? 'Select a time' : '';
  }

  function refresh() { slots = availability(); showStep(1); render(false); }

  function showStep(n) {
    const open = n === 2 && chosen();
    details.classList.toggle('is-open', !!open);
    if (open) {
      const t = chosen(), early = mins(t) < mins(B.earlyEveningUntil) && mins(t) >= mins('17:00');
      $('#otSummary').innerHTML = `<strong>${esc(date.options[date.selectedIndex].text)}</strong> · <strong>${nice(t)}</strong> · ${esc(guests.options[guests.selectedIndex].text)}${early ? ' · <span style="color:var(--red)">Early Evening menu</span>' : ''}`;
    }
  }

  $('#ot').addEventListener('change', e => {
    if (e.target === date) { buildPref(); refresh(); }
    else if (e.target === guests) refresh();
    else if (e.target === pref) { showStep(1); render(false); }
    else if (e.target.name === 'time') {
      render(true); showStep(2);
      if (window.innerWidth < 900) details.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else $('#fFirst').focus({ preventScroll: true });
    }
  });
  more.addEventListener('click', () => { all.hidden = !all.hidden; more.textContent = all.hidden ? 'View full availability' : 'Show fewer times'; });
  $('#otChange').addEventListener('click', () => { showStep(1); $('#otTimes').scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  $('#ot').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#otErr'); err.textContent = '';
    const v = id => $(id).value.trim();
    if (!chosen()) { err.textContent = 'Please pick a time.'; return; }
    if (!v('#fFirst') || !v('#fLast')) { err.textContent = 'Please add your name.'; $('#fFirst').focus(); return; }
    if (v('#fPhone').replace(/\D/g, '').length < 7) { err.textContent = 'Please add a mobile number.'; $('#fPhone').focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(v('#fEmail'))) { err.textContent = 'Please add a valid email.'; $('#fEmail').focus(); return; }
    const btn = $('#otSubmit'); btn.disabled = true; btn.textContent = 'Confirming…';
    await new Promise(r => setTimeout(r, 700));
    btn.disabled = false; btn.textContent = 'Confirm reservation';
    const ref = 'R' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const seat = document.querySelector('input[name="seat"]:checked').value;
    const when = new Date(date.value + 'T' + chosen());
    dialog('See you soon, ' + esc(v('#fFirst')) + '!', `
      <span class="dlg-ref">Booking ${ref}</span>
      <div class="dlg-lines">
        <div><span>Date</span><span>${when.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
        <div><span>Time</span><span>${nice(chosen())}</span></div>
        <div><span>Party</span><span>${esc(guests.options[guests.selectedIndex].text)}</span></div>
        <div><span>Seating</span><span>${esc(seat)}</span></div>
        ${v('#fOcc') ? `<div><span>Occasion</span><span>${esc(v('#fOcc'))}</span></div>` : ''}
        ${v('#fVoucher') ? `<div><span>Voucher</span><span>${esc(v('#fVoucher').toUpperCase())}</span></div>` : ''}
      </div>
      <p>A confirmation is on its way to ${esc(v('#fEmail'))}.</p>`,
      [['Add to calendar', () => ics(when, guests.value, ref)], ['Done', null]]);
    $('#ot').reset(); firstOpen(); buildPref(); refresh();
  });

  function ics(start, g, ref) {
    const end = new Date(start.getTime() + 2 * 3600e3);
    const f = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Richmond//Booking//EN', 'BEGIN:VEVENT', 'UID:' + ref + '@richmond', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(start), 'DTEND:' + f(end),
      'SUMMARY:Dinner at Richmond (' + g + ')', 'LOCATION:43 Richmond St South\\, Portobello\\, Dublin 2', 'DESCRIPTION:Booking ' + ref + '. Call 01 478 8783 to change.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'richmond-booking.ics'; a.click();
  }

  buildPref(); refresh();

  /* ========== MENUS ========== */
  const photos = { dinner: ['beef-fillet', 'Aged beef with green beans and padrón peppers'], early: ['duck-breast', 'Seared duck breast with chard'], lunch: ['fish-main', 'Crisp-skinned fish with chard'], tasting: ['tartlet-starter', 'Tasting-menu course'] };
  function showMenu(key) {
    const m = C.menus[key];
    let h = `<h3>${esc(m.title)}</h3><p class="menu-note">${esc(m.note)}</p>`;
    h += m.sections.map(([name, items]) => `<div class="menu-sec"><h4>${esc(name)}</h4>${items.map(([d, p]) => `<div class="dish"><span>${esc(d)}</span><span>${p ? '€' + esc(p) : ''}</span></div>`).join('')}</div>`).join('');
    if (key === 'tasting') h += `<p style="margin-top:20px">The menu is announced closer to the night. Places are limited, so call <a href="${C.tel}">${C.phone}</a> or email <a href="mailto:${C.email}">${C.email}</a> to reserve.</p>`;
    h += `<div class="menu-cta"><a href="#book" class="btn btn-red btn-sm">Book a table</a><a href="#vouchers" class="btn btn-line-dark btn-sm">Gift this experience</a></div>`;
    $('#menuCard').innerHTML = h;
    const img = $('#menuPhoto'); img.style.opacity = 0;
    setTimeout(() => { img.src = 'images/' + photos[key][0] + '.webp'; img.alt = photos[key][1]; img.style.opacity = 1; }, 150);
    document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.menu === key; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showMenu(t.dataset.menu)));
  showMenu('dinner');

  /* ========== VOUCHERS ========== */
  const V = C.vouchers;
  $('#vAmounts').innerHTML = V.amounts.map(a => `<label class="v-amt"><input type="radio" name="vamt" value="${a}"${a === 50 ? ' checked' : ''}><span>€${a}</span></label>`).join('');
  $('#vExps').innerHTML = V.experiences.map((x, i) => `<label class="v-exp"><input type="radio" name="vexp" value="${x.id}"${i === 0 ? ' checked' : ''}><span><b>${esc(x.name)}</b><em>€${x.price}</em><i>${esc(x.desc)}</i></span></label>`).join('');
  for (let q = 1; q <= V.maxQty; q++) $('#vQty').add(new Option(q, q));
  const dt = $('#vDate'); dt.min = ymd(new Date()); dt.value = ymd(new Date());

  const vtype = () => document.querySelector('input[name="vtype"]:checked').value;
  function vUnit() {
    if (vtype() === 'experience') { const id = document.querySelector('input[name="vexp"]:checked').value; const x = V.experiences.find(e => e.id === id); return { value: x.price, what: x.name, id: x.id }; }
    const c = parseFloat($('#vCustom').value);
    if ($('#vCustom').value !== '') return { value: c, what: 'To spend on food & drink', custom: true };
    const r = document.querySelector('input[name="vamt"]:checked');
    return { value: r ? +r.value : NaN, what: 'To spend on food & drink' };
  }
  function vUpdate() {
    const exp = vtype() === 'experience';
    $('#vAmountBox').hidden = exp; $('#vExpBox').hidden = !exp;
    const u = vUnit(), q = +$('#vQty').value, ok = !isNaN(u.value) && u.value >= V.min && u.value <= V.max;
    $('#vTotal').textContent = ok ? euro(u.value * q) : '–';
    $('#pcVal').textContent = ok ? '€' + (u.value % 1 ? u.value.toFixed(2) : u.value) : '€–';
    $('#pcWhat').textContent = u.what + (q > 1 ? ` · ×${q}` : '');
    const msg = $('#vMsg').value.trim();
    $('#pcMsg').textContent = '“' + (msg || 'Enjoy a night at Richmond.') + '”';
    $('#pcTo').textContent = 'For: ' + ($('#vTo').value.trim() || 'someone special');
    $('#pcFrom').textContent = 'From: ' + ($('#vFrom').value.trim() || 'you');
    document.querySelectorAll('.them-only').forEach(el => { el.hidden = $('#vSendTo').value !== 'them'; });
    $('#vPay').textContent = 'Buy voucher' + (q > 1 ? 's' : '') + (ok ? ' · ' + euro(u.value * q) : '');
  }
  $('#vForm').addEventListener('input', e => { if (e.target.name === 'vamt') $('#vCustom').value = ''; vUpdate(); });
  $('#vForm').addEventListener('change', vUpdate);
  $('#vCustom').addEventListener('focus', () => document.querySelectorAll('input[name="vamt"]').forEach(r => { r.checked = false; }));

  $('#vForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#vErr'); err.textContent = '';
    const u = vUnit(), q = +$('#vQty').value, them = $('#vSendTo').value === 'them';
    if (isNaN(u.value) || u.value < V.min || u.value > V.max) { err.textContent = `Please choose an amount between €${V.min} and €${V.max}.`; return; }
    if (!$('#vFrom').value.trim()) { err.textContent = 'Please add your name.'; $('#vFrom').focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test($('#vEmail').value.trim())) { err.textContent = 'Please add your email for the receipt.'; $('#vEmail').focus(); return; }
    if (them && !/^\S+@\S+\.\S+$/.test($('#vToEmail').value.trim())) { err.textContent = "Please add the recipient's email."; $('#vToEmail').focus(); return; }
    const order = { type: vtype(), amount: u.value, experience: u.id || null, qty: q, from: $('#vFrom').value.trim(), email: $('#vEmail').value.trim(),
      to: $('#vTo').value.trim(), toEmail: them ? $('#vToEmail').value.trim() : '', sendOn: them ? $('#vDate').value : '', message: $('#vMsg').value.trim() };
    const btn = $('#vPay'); btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (C.PAYMENTS_MODE === 'stripe') {
        const r = await fetch(C.CHECKOUT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) { location.href = j.url; return; }
        throw new Error(j.error || 'Payment could not be started.');
      }
      await new Promise(r => setTimeout(r, 900));
      const codes = Array.from({ length: q }, () => 'RICH-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 4).toUpperCase());
      dialog('Voucher' + (q > 1 ? 's' : '') + ' on the way!', `
        <div class="dlg-lines">
          <div><span>Voucher</span><span>${esc(u.what)}</span></div>
          <div><span>Value</span><span>${euro(u.value)}${q > 1 ? ' × ' + q : ''}</span></div>
          <div><span>Total paid</span><span>${euro(u.value * q)}</span></div>
          <div><span>Sent to</span><span>${esc(them ? order.toEmail + (order.sendOn ? ' on ' + new Date(order.sendOn + 'T00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : '') : order.email)}</span></div>
        </div>
        <p>Code${q > 1 ? 's' : ''}: ${codes.map(c => `<span class="dlg-ref">${c}</span>`).join(' ')}</p>
        <p style="font-size:14px;color:var(--muted)">No expiry. Use the code when booking online, or show it at the table.</p>`,
        [['Print voucher', () => printVoucher(order, u, codes)], ['Done', null]]);
      $('#vForm').reset(); dt.value = ymd(new Date()); vUpdate();
    } catch (ex) { err.textContent = ex.message + ' Please try again.'; }
    finally { btn.disabled = false; vUpdate(); }
  });

  function printVoucher(o, u, codes) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!doctype html><title>Richmond gift voucher</title><style>
      body{font-family:Georgia,serif;margin:0;padding:40px;background:#f5f1ea}
      .v{max-width:640px;margin:0 auto 30px;padding:40px;border-radius:18px;background:linear-gradient(145deg,#2a2e33,#15171a);color:#fff;page-break-inside:avoid}
      .n{font-family:Arial,sans-serif;font-weight:700;color:#ff4436;font-size:22px}.val{font-size:64px;margin:30px 0 4px}.m{font-style:italic;color:#f0e6d6;font-size:20px}
      .f{font-family:Arial,sans-serif;font-size:13px;color:#aeb2b7;margin-top:24px;display:flex;justify-content:space-between}.c{font-family:monospace;letter-spacing:.12em;color:#d9b26f;font-size:16px;margin-top:10px}
      p.s{font-family:Arial,sans-serif;font-size:12px;color:#555;text-align:center}</style>
      ${codes.map(c => `<div class="v"><div class="n">43 Richmond</div><div class="val">€${u.value}</div><div>${esc(u.what)}</div>
      <div class="m">“${esc(o.message || 'Enjoy a night at Richmond.')}”</div><div class="f"><span>For: ${esc(o.to || 'someone special')}</span><span>From: ${esc(o.from)}</span></div><div class="c">${c}</div></div>`).join('')}
      <p class="s">43 Richmond St South, Portobello, Dublin 2 · 01 478 8783 · No expiry · DEMO VOUCHER, NOT VALID</p>
      <script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  }
  vUpdate();

  /* ========== DIALOG ========== */
  function dialog(title, body, actions) {
    $('#dlgTitle').innerHTML = title; $('#dlgBody').innerHTML = body;
    const box = $('#dlgActions'); box.innerHTML = '';
    actions.forEach(([txt, fn], i) => {
      const b = document.createElement('button'); b.className = 'btn ' + (i === actions.length - 1 ? 'btn-red' : 'btn-line-dark'); b.textContent = txt;
      b.onclick = () => { if (fn) fn(); else $('#dlg').hidden = true; }; box.appendChild(b);
    });
    $('#dlg').hidden = false; box.lastChild.focus();
  }
  $('#dlg').addEventListener('click', e => { if (e.target.id === 'dlg') $('#dlg').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#dlg').hidden = true; });

  if (new URLSearchParams(location.search).get('voucher') === 'thanks') {
    dialog('Thank you!', '<p>Your payment went through. The voucher and receipt are on their way by email.</p>', [['Done', null]]);
    $('.dlg-demo').hidden = true;
  }

  /* ========== bits ========== */
  const track = document.querySelector('.gal-track');
  if (track) track.innerHTML += track.innerHTML;
  document.querySelectorAll('.hours tr').forEach(tr => { if (tr.dataset.d.split(',').map(Number).includes(new Date().getDay())) tr.classList.add('today'); });
  const mob = $('#mobBook'), bookSec = $('#book');
  if (mob && 'IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(x => mob.classList.toggle('hide', x.isIntersecting)), { threshold: .15 }).observe(bookSec);
})();
