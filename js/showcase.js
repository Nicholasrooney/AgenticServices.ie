/* Showcase picker: a searchable "Demos" dropdown in the nav (all pages). */
(function () {
  var SITES = window.AGENTIC_SHOWCASE || [];
  function init() {
    var inner = document.querySelector('.nav__inner');
    if (!inner || document.querySelector('.sc')) return;
    var wrap = document.createElement('div');
    wrap.className = 'sc';
    wrap.innerHTML =
      '<button class="sc__btn" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' +
        '<span>Demos</span><span class="sc__n">' + SITES.length + '</span></button>' +
      '<div class="sc__panel" hidden>' +
        '<input class="sc__search" type="search" placeholder="Search demo sites…" aria-label="Search demo sites">' +
        '<ul class="sc__list" role="list"></ul>' +
        '<a class="sc__all" href="/showcase/" data-barba-prevent>See all demos →</a>' +
      '</div>';
    var cta = inner.querySelector('.nav__cta');
    inner.insertBefore(wrap, cta || inner.querySelector('.nav__hamburger'));

    var btn = wrap.querySelector('.sc__btn'), panel = wrap.querySelector('.sc__panel'),
        q = wrap.querySelector('.sc__search'), list = wrap.querySelector('.sc__list');

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function render() {
      var t = q.value.trim().toLowerCase();
      var hits = SITES.filter(function (s) { return !t || (s.name + ' ' + s.type + ' ' + s.place + ' ' + s.tags).toLowerCase().indexOf(t) > -1; });
      list.innerHTML = hits.length ? hits.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" data-barba-prevent><strong>' + esc(s.name) + '</strong><span>' + esc(s.type) + ' · ' + esc(s.place) + '</span></a></li>';
      }).join('') : '<li class="sc__none">No demos match “' + esc(q.value) + '”</li>';
    }
    function open(v) {
      panel.hidden = !v; btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) { render(); setTimeout(function () { q.focus(); }, 30); }
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(panel.hidden); });
    q.addEventListener('input', render);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var a = list.querySelector('a'); if (a) location.href = a.getAttribute('href'); }
      if (e.key === 'Escape') { open(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) open(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
