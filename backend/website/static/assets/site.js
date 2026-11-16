/* Wilken Poelker – one small script for every page of the website.
   Without JavaScript every page still works: the opening hours, products and
   contact details are in the HTML; this script adds the live status, search,
   reviews, forms, the map and the menus. No cookies, no tracking. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var API = String(root.getAttribute('data-api') || 'https://api.wilkenpoelker.de').replace(/\/+$/, '');
  var PHONE = '04952 5304';
  var PHONE_HREF = 'tel:+4949525304';
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || d).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  // Browser storage only for what the visitor chose; may be blocked
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v, sessionOnly) { try { (sessionOnly ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* blocked */ } },
    del: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) { /* blocked */ } },
  };
  var money = (function () {
    var f = window.Intl ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }) : null;
    return function (v) { return v == null || v === '' ? '' : (f ? f.format(Number(v)) : Number(v).toFixed(2).replace('.', ',') + ' €'); };
  }());

  // Small JSON cache for the session: the live data changes rarely, and a
  // visitor clicking through ten pages needs only one request.
  function getJSON(url, ttlSeconds) {
    var key = 'wp-c:' + url;
    if (ttlSeconds) {
      try {
        var hit = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (hit && Date.now() - hit.t < ttlSeconds * 1000) return Promise.resolve(hit.v);
      } catch (e) { /* no cache */ }
    }
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      var v = j && Object.prototype.hasOwnProperty.call(j, 'data') ? j.data : j;
      if (ttlSeconds) { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* full */ } }
      return v;
    });
  }

  /* ── Theme (light / dark) ─────────────────────────────── */
  var systemDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : systemDark.matches;
  }
  function syncThemeColor() {
    var forced = root.getAttribute('data-theme');
    $$('meta[name="theme-color"]').forEach(function (m) {
      if (!m.hasAttribute('data-media')) m.setAttribute('data-media', m.getAttribute('media') || '');
      if (forced) { m.removeAttribute('media'); m.setAttribute('content', forced === 'dark' ? '#0a1a0a' : '#d5edcf'); } else {
        m.setAttribute('media', m.getAttribute('data-media'));
        m.setAttribute('content', /dark/.test(m.getAttribute('data-media')) ? '#0a1a0a' : '#d5edcf');
      }
    });
  }
  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      var apply = function () {
        // Same as the system setting: follow the system again from now on
        if ((next === 'dark') === systemDark.matches) { root.removeAttribute('data-theme'); store.del('wp-theme'); } else {
          root.setAttribute('data-theme', next); store.set('wp-theme', next);
        }
        syncThemeColor();
      };
      if (d.startViewTransition && !reduceMotion) d.startViewTransition(apply); else apply();
    });
  });
  syncThemeColor();

  /* ── Header ───────────────────────────────────────────── */
  var top = $('.top');
  if (top) {
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  $$('.mega').forEach(function (m) {
    var btn = $('button', m);
    var openedAt = 0;
    var timer;
    function set(open) {
      if (open && !m.hasAttribute('data-open')) openedAt = Date.now();
      m.toggleAttribute('data-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () {
      // Opened a moment ago by the mouse: a click keeps it open
      if (m.hasAttribute('data-open') && Date.now() - openedAt < 450) return;
      set(!m.hasAttribute('data-open'));
    });
    if (window.matchMedia && matchMedia('(hover: hover)').matches) {
      m.addEventListener('mouseenter', function () { clearTimeout(timer); timer = setTimeout(function () { set(true); }, 70); });
      m.addEventListener('mouseleave', function () { clearTimeout(timer); timer = setTimeout(function () { set(false); }, 220); });
    }
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) set(false); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
    d.addEventListener('click', function (e) { if (!m.contains(e.target)) set(false); });
  });

  /* ── Sheets (menu, search) ────────────────────────────── */
  var openSheet = null;
  var lastFocus = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';
  function lockScroll(on) { root.style.overflow = on ? 'hidden' : ''; }
  function showSheet(id, opener) {
    var s = d.getElementById(id);
    if (!s) return;
    hideSheet(true);
    lastFocus = opener || d.activeElement;
    s.setAttribute('data-open', '');
    openSheet = s;
    lockScroll(true);
    if (id === 'search-sheet') search.prepare();
    setTimeout(function () {
      var f = id === 'search-sheet' ? $('#search-input') : $('.sheet-body a[aria-current], .sheet-body a', s);
      if (f) f.focus({ preventScroll: true });
    }, 40);
  }
  function hideSheet(silent) {
    if (!openSheet) return;
    openSheet.removeAttribute('data-open');
    openSheet = null;
    lockScroll(false);
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  d.addEventListener('click', function (e) {
    var opener = e.target.closest('button[data-open], a[data-open]');
    if (opener && opener.getAttribute('data-open')) { e.preventDefault(); showSheet(opener.getAttribute('data-open'), opener); return; }
    if (openSheet && (e.target === openSheet || e.target.closest('[data-close]'))) hideSheet();
    // A link inside a sheet to the same page (anchor): close the sheet
    if (openSheet && e.target.closest('a[href^="#"], a[href*="#"]') && openSheet.contains(e.target)) hideSheet(true);
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openSheet) { hideSheet(); return; }
    if (e.key === 'Tab' && openSheet) {
      var f = $$(FOCUSABLE, openSheet).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
    // "/" opens the product search (as on many shop websites)
    if (e.key === '/' && !openSheet && !/^(INPUT|TEXTAREA|SELECT)$/.test((d.activeElement || {}).tagName || '') && !(d.activeElement || {}).isContentEditable) {
      if ($('#search-sheet')) { e.preventDefault(); showSheet('search-sheet'); }
    }
  });

  /* ── Product search (all pages) ───────────────────────── */
  var search = (function () {
    var input = $('#search-input');
    var box = $('#search-results');
    var hint = $('#search-hint');
    var hintDefault = hint ? hint.innerHTML : '';
    var items = null;
    var loading = null;
    var sel = -1;
    function norm(s) {
      return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .normalize('NFKD').replace(/[̀-ͯ]/g, '');
    }
    function tight(s) { return norm(s).replace(/[^a-z0-9]+/g, ''); }
    function prepare() {
      if (!input) return null;
      if (!loading) {
        loading = fetch('/produkte/suche.json').then(function (r) { return r.json(); }).then(function (j) {
          items = j.items.map(function (it) {
            var text = it[1] + ' ' + it[2] + ' ' + it[3];
            return { slug: it[0], title: it[1], brand: it[2], device: it[3], price: it[4], avail: !!it[5], img: it[6], multi: !!it[7], hay: ' ' + norm(text).replace(/[^a-z0-9]+/g, ' '), t: tight(text), tt: tight(it[1]) };
          });
          run();
        }).catch(function () { loading = null; });
      }
      return loading;
    }
    function score(it, q, tokens) {
      var s = 0;
      for (var i = 0; i < tokens.length; i += 1) {
        var tok = tokens[i];
        if (it.hay.indexOf(' ' + tok) >= 0) s += 10;
        else if (it.hay.indexOf(tok) >= 0) s += 4;
        else if (it.t.indexOf(tight(tok)) >= 0) s += 3;
        else return -1;
      }
      if (it.tt.indexOf(tight(q)) === 0) s += 25;
      else if (it.t.indexOf(tight(q)) >= 0) s += 8;
      if (it.avail) s += 4;
      return s - it.title.length / 200;
    }
    function render(list, total, q) {
      sel = -1;
      box.innerHTML = list.map(function (it) {
        var pic = it.img ? '<img src="' + esc(it.img) + '" alt="" width="56" height="56" loading="lazy">' : '<span class="noimg"></span>';
        var meta = [it.brand, it.device].filter(Boolean).join(', ');
        var price = it.price != null ? '<span class="pr">' + (it.multi ? 'ab ' : '') + esc(money(it.price)) + '</span>' : '';
        return '<a href="/produkte/p/' + encodeURIComponent(it.slug) + '.html" role="option">' + pic + '<span><b>' + esc(it.title) + '</b><small>' + esc(meta) + (it.avail ? '' : ' (derzeit nicht vorrätig)') + '</small></span>' + price + '</a>';
      }).join('');
      if (!hint) return;
      if (!q) { hint.innerHTML = hintDefault; return; }
      var all = '/produkte/alle.html?q=' + encodeURIComponent(q);
      hint.innerHTML = total
        ? (total > list.length ? '<a href="' + all + '">Alle ' + total + ' Treffer ansehen</a>' : (total === 1 ? '1 Treffer.' : total + ' Treffer.')) + ' Oder stöbern Sie in einer Kategorie:'
        : 'Keine Treffer für „' + esc(q) + '“. Vieles bestellen wir für Sie: <a href="' + PHONE_HREF + '">' + PHONE + '</a>. Oder stöbern Sie in einer Kategorie:';
    }
    function run() {
      if (!input || !box) return;
      var q = input.value.trim();
      if (!q) { render([], 0, ''); return; }
      if (!items) { prepare(); return; }
      var tokens = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
      if (!tokens.length) { render([], 0, q); return; }
      var hits = [];
      items.forEach(function (it) { var s = score(it, q, tokens); if (s >= 0) hits.push([s, it]); });
      hits.sort(function (a, b) { return b[0] - a[0]; });
      render(hits.slice(0, 8).map(function (h) { return h[1]; }), hits.length, q);
    }
    function move(step) {
      var links = $$('a', box);
      if (!links.length) return;
      sel = (sel + step + links.length) % links.length;
      links.forEach(function (a, i) { a.classList.toggle('on', i === sel); a.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
      links[sel].scrollIntoView({ block: 'nearest' });
    }
    if (input) {
      var t;
      input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 60); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } else if (e.key === 'Enter') {
          e.preventDefault();
          var links = $$('a', box);
          var q = input.value.trim();
          if (links.length) location.href = links[Math.max(sel, 0)].href;
          else if (q) location.href = '/produkte/alle.html?q=' + encodeURIComponent(q);
        }
      });
    }
    return { prepare: prepare };
  }());

  /* ── Opening hours: live status ───────────────────────── */
  var hoursData = null;
  try { hoursData = JSON.parse(($('#hours-data') || {}).textContent || 'null'); } catch (e) { hoursData = null; }
  var DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function berlin(date) {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date || new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var y = +parts.year; var m = +parts.month; var day = +parts.day;
    return { y: y, m: m, d: day, min: (+parts.hour % 24) * 60 + +parts.minute, iso: parts.year + '-' + parts.month + '-' + parts.day, dow: new Date(Date.UTC(y, m - 1, day)).getUTCDay() };
  }
  function addDays(now, n) {
    var t = new Date(Date.UTC(now.y, now.m - 1, now.d + n));
    return { iso: t.toISOString().slice(0, 10), dow: t.getUTCDay(), m: t.getUTCMonth() + 1 };
  }
  var toMin = function (s) { var p = String(s).split(':'); return +p[0] * 60 + +(p[1] || 0); };
  var hhmm = function (s) { var p = String(s).split(':'); return String(+p[0]) + (p[1] && p[1] !== '00' ? ':' + p[1] : ''); };
  // Periods of a day: closed days first, then the season's week (winter = November to January)
  var todayOverride = null; // today's hours as the app server knows them (holidays)
  function periodsOn(day) {
    if (!hoursData) return null;
    if (todayOverride && todayOverride.iso === day.iso) return todayOverride;
    var special = (hoursData.closed || []).filter(function (c) { return c.date === day.iso; })[0];
    if (special) return { periods: special.c ? [] : special.p, name: special.name };
    var season = day.m >= 11 || day.m === 1 ? 'winter' : 'standard';
    var week = hoursData[season] && hoursData[season].length ? hoursData[season] : (hoursData.standard && hoursData.standard.length ? hoursData.standard : hoursData.winter);
    var entry = (week || []).filter(function (x) { return x.d === day.dow; })[0];
    return { periods: !entry || entry.c ? [] : entry.p, name: null };
  }
  function nextOpening(now, fromMin) {
    for (var i = 0; i < 21; i += 1) {
      var day = i ? addDays(now, i) : { iso: now.iso, dow: now.dow, m: now.m };
      var info = periodsOn(day);
      if (!info) return null;
      for (var k = 0; k < info.periods.length; k += 1) {
        if (i > 0 || toMin(info.periods[k][0]) > fromMin) return { inDays: i, dow: day.dow, time: info.periods[k][0] };
      }
    }
    return null;
  }
  function closedText(next) {
    if (!next) return 'Derzeit geschlossen';
    var when = next.inDays === 0 ? 'um' : (next.inDays === 1 ? 'morgen um' : DAYS[next.dow] + ' um');
    return 'Geschlossen, öffnet ' + when + ' ' + hhmm(next.time) + ' Uhr';
  }
  function setStatus(open, text) {
    $$('[data-status]').forEach(function (el) {
      el.setAttribute('data-state', open ? 'open' : 'closed');
      var t = $('[data-status-text]', el);
      if (t) t.textContent = text;
    });
  }
  function todayLine(periods, name) {
    if (!periods || !periods.length) return 'Heute geschlossen' + (name ? ' (' + name + ')' : '');
    return 'Heute ' + periods.map(function (p) { return hhmm(p[0]) + '–' + hhmm(p[1]); }).join(' und ') + ' Uhr';
  }
  function setToday(periods, name) {
    $$('[data-today-hours]').forEach(function (el) { el.textContent = todayLine(periods, name); });
  }
  function computeStatus() {
    if (!hoursData) return;
    var now = berlin();
    var today = periodsOn(now);
    var current = (today.periods || []).filter(function (p) { return toMin(p[0]) <= now.min && now.min < toMin(p[1]); })[0];
    if (current) setStatus(true, 'Geöffnet bis ' + hhmm(current[1]) + ' Uhr');
    else setStatus(false, closedText(nextOpening(now, now.min)));
    setToday(today.periods, today.name);
    $$('tr[data-dow]').forEach(function (tr) { tr.classList.toggle('today', +tr.getAttribute('data-dow') === now.dow); });
  }
  function renderClosedDays(days) {
    var today = berlin().iso;
    var list = (days || []).filter(function (c) { return c.date >= today; }).slice(0, 8);
    $$('[data-closed-days]').forEach(function (box) {
      var ul = $('ul', box);
      if (!ul) return;
      ul.innerHTML = list.map(function (c) {
        var date = new Date(c.date + 'T12:00:00Z').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
        var hours = c.isClosed || !(c.specialHours || []).length ? 'geschlossen'
          : c.specialHours.map(function (p) { return hhmm(p.open) + '–' + hhmm(p.close); }).join(', ') + ' Uhr';
        return '<li><span>' + esc(c.name || 'Geschlossen') + ', ' + esc(date) + '</span><span>' + esc(hours) + '</span></li>';
      }).join('');
      box.hidden = !list.length;
    });
  }
  if (hoursData) {
    // Past days of the built page are dropped right away
    renderClosedDays((hoursData.closed || []).map(function (c) { return { date: c.date, name: c.name, isClosed: c.c, specialHours: (c.p || []).map(function (p) { return { open: p[0], close: p[1] }; }) }; }));
    computeStatus();
    setInterval(computeStatus, 60000);
    // Fresh data from the app server (the same as in the app)
    getJSON(API + '/api/settings/closed-days', 600).then(function (data) {
      if (!data || !Array.isArray(data.days)) return;
      hoursData.closed = data.days.map(function (c) { return { date: c.date, name: c.name, c: !!c.isClosed, p: (c.specialHours || []).map(function (p) { return [p.open, p.close]; }) }; });
      renderClosedDays(data.days);
      computeStatus();
    }).catch(function () { /* the built data stays */ });
    getJSON(API + '/api/settings/opening-hours/status', 120).then(function (s) {
      if (!s || typeof s.isOpen !== 'boolean') return;
      var now = berlin();
      if (s.isOpen && s.currentPeriod) setStatus(true, 'Geöffnet bis ' + hhmm(s.currentPeriod.close) + ' Uhr');
      else if (!s.isOpen) {
        var n = s.nextOpen;
        var inDays = null;
        if (n && n.date) {
          for (var i = 0; i < 21; i += 1) if (addDays(now, i).iso === n.date) { inDays = i; break; }
        }
        setStatus(false, n && inDays != null ? closedText({ inDays: inDays, dow: addDays(now, inDays).dow, time: n.time }) : closedText(nextOpening(now, now.min)));
      }
      var th = s.todayHours;
      if (th) {
        // From now on the minute-by-minute update uses the server's view of today
        todayOverride = { iso: now.iso, periods: th.isClosed ? [] : (th.periods || []).map(function (p) { return [p.open, p.close]; }), name: th.holidayName || null };
        setToday(todayOverride.periods, todayOverride.name);
      }
    }).catch(function () { /* computed status stays */ });
  }

  /* ── Reveal (faces wall) ──────────────────────────────── */
  if ('IntersectionObserver' in window) {
    root.classList.add('rv');
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); revealer.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(function (el) { revealer.observe(el); });
  }

  /* ── Lightbox (photos and product pictures) ───────────── */
  var lb = { el: $('#lightbox'), list: [], i: 0, opener: null };
  function lbShow() {
    var img = $('img', lb.el);
    var it = lb.list[lb.i];
    img.src = it.src;
    if (it.w) { img.width = it.w; img.height = it.h; } else { img.removeAttribute('width'); img.removeAttribute('height'); }
    var many = lb.list.length > 1;
    $('[data-lb-prev]', lb.el).hidden = !many;
    $('[data-lb-next]', lb.el).hidden = !many;
  }
  function lbClose() {
    if (!lb.el || !lb.el.hasAttribute('data-open')) return;
    lb.el.removeAttribute('data-open');
    lockScroll(false);
    if (lb.opener && lb.opener.focus) lb.opener.focus({ preventScroll: true });
  }
  function lbStep(n) { lb.i = (lb.i + n + lb.list.length) % lb.list.length; lbShow(); }
  function lightbox(list, index, opener) {
    if (!lb.el || !list.length) return;
    lb.list = list; lb.i = index || 0; lb.opener = opener || null;
    lbShow();
    lb.el.setAttribute('data-open', '');
    lockScroll(true);
    $('[data-lb-close]', lb.el).focus({ preventScroll: true });
  }
  if (lb.el) {
    $('[data-lb-close]', lb.el).addEventListener('click', lbClose);
    $('[data-lb-prev]', lb.el).addEventListener('click', function () { lbStep(-1); });
    $('[data-lb-next]', lb.el).addEventListener('click', function () { lbStep(1); });
    lb.el.addEventListener('click', function (e) { if (e.target === lb.el) lbClose(); });
    d.addEventListener('keydown', function (e) {
      if (!lb.el.hasAttribute('data-open')) return;
      if (e.key === 'Escape') lbClose();
      else if (e.key === 'ArrowLeft' && lb.list.length > 1) lbStep(-1);
      else if (e.key === 'ArrowRight' && lb.list.length > 1) lbStep(1);
      else if (e.key === 'Tab') { e.preventDefault(); $('[data-lb-close]', lb.el).focus(); }
    });
    var x0 = null;
    lb.el.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    lb.el.addEventListener('pointerup', function (e) {
      if (x0 == null || lb.list.length < 2) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
    });
  }
  $$('[data-gallery]').forEach(function (g) {
    var btns = $$('[data-zoom]', g);
    var list = btns.map(function (b) { return { src: b.getAttribute('data-zoom') }; });
    btns.forEach(function (b, i) { b.addEventListener('click', function () { lightbox(list, i, b); }); });
  });

  /* ── Dialogs (product inquiry) ────────────────────────── */
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dialog]');
    if (b) {
      var dlg = d.getElementById(b.getAttribute('data-dialog'));
      if (dlg && dlg.showModal && !dlg.open) {
        dlg.showModal();
        lockScroll(true);
        var first = $('input:not([type=hidden]), textarea', dlg);
        if (first) setTimeout(function () { first.focus(); }, 60);
      }
      return;
    }
    var c = e.target.closest('[data-dialog-close]');
    if (c && c.closest('dialog')) { c.closest('dialog').close(); return; }
    // Click on the dark area around the dialog
    if (e.target.tagName === 'DIALOG' && e.target.open) e.target.close();
  });
  $$('dialog').forEach(function (dlg) { dlg.addEventListener('close', function () { lockScroll(false); }); });

  /* ── Inquiry forms → PC program "Anfragen" ────────────── */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\d][\d\s()/+-]{5,30}$/;
  var FIELD_NAMES = { name: 'name', email: 'email', phone: 'phone', message: 'message' };
  $$('form[data-inquiry]').forEach(function (form) {
    var emailInput = $('[data-email-field] input', form);
    var optional = $('[data-email-optional]', form);
    var msgLabel = $('[data-msg-label]', form);
    var msgDefault = msgLabel ? msgLabel.textContent : '';
    var msgBox = $('[data-form-msg]', form);
    var submit = $('button[type=submit]', form);
    var submitHtml = submit ? submit.innerHTML : '';
    function topic() {
      var r = $('input[name=topic]:checked', form) || $('input[name=topic][type=hidden]', form);
      return r ? r.value : 'produkt';
    }
    function sync() {
      var callback = topic() === 'rueckruf';
      if (emailInput) emailInput.required = !callback;
      if (optional) optional.hidden = !callback;
      if (msgLabel) msgLabel.textContent = callback ? 'Wann passt es Ihnen, und worum geht es?' : msgDefault;
    }
    var wanted = new URLSearchParams(location.search).get('thema');
    if (wanted) {
      var r = $$('input[name=topic][type=radio]', form).filter(function (x) { return x.value === wanted; })[0];
      if (r) r.checked = true;
    }
    form.addEventListener('change', function (e) { if (e.target.name === 'topic') sync(); });
    sync();

    function fieldOf(name) { var el = form.elements[name]; return el && el.closest ? el.closest('.field') : null; }
    function clearErrors() {
      $$('.field.err', form).forEach(function (f) { f.classList.remove('err'); });
      $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
      if (msgBox) { msgBox.hidden = true; msgBox.textContent = ''; }
    }
    function showErrors(list, text) {
      list.forEach(function (name) {
        var f = fieldOf(name);
        if (f) f.classList.add('err');
        if (form.elements[name]) form.elements[name].setAttribute('aria-invalid', 'true');
      });
      if (msgBox) { msgBox.textContent = text; msgBox.hidden = false; }
      var first = list.length && form.elements[list[0]];
      if (first && first.focus) first.focus();
    }
    function done() {
      var callback = topic() === 'rueckruf';
      var ok = d.createElement('div');
      ok.className = 'form-ok';
      ok.setAttribute('role', 'status');
      ok.setAttribute('tabindex', '-1');
      ok.innerHTML = '<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="25"/><path d="M17 29l7 7 15-16"/></svg>'
        + '<h3>Vielen Dank, Ihre Nachricht ist angekommen.</h3>'
        + '<p>' + (callback ? 'Wir rufen Sie so bald wie möglich zurück.' : 'Wir melden uns so bald wie möglich bei Ihnen.') + ' Wenn es eilt, erreichen Sie uns unter <a href="' + PHONE_HREF + '">' + PHONE + '</a>.</p>';
      form.replaceWith(ok);
      ok.focus({ preventScroll: true });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      var bad = [];
      if ((data.name || '').length < 2) bad.push('name');
      if (!PHONE_RE.test(data.phone || '')) bad.push('phone');
      if (emailInput && (emailInput.required || data.email) && !EMAIL_RE.test(data.email || '')) bad.push('email');
      if (bad.length) {
        var text = bad.length > 1 ? 'Bitte prüfen Sie die markierten Felder.'
          : { name: 'Bitte geben Sie Ihren Namen an.', phone: 'Bitte geben Sie eine Telefonnummer an, unter der wir Sie erreichen.', email: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' }[bad[0]];
        showErrors(bad, text);
        return;
      }
      data.topic = topic();
      data.pageUrl = location.pathname;
      if (submit) { submit.disabled = true; submit.textContent = 'Wird gesendet …'; }
      fetch(API + '/api/shop/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            if (res.ok) { done(); return; }
            var err = (j && j.error) || {};
            var fields = (err.details || []).map(function (x) { return FIELD_NAMES[x.field]; }).filter(Boolean);
            var text = err.details && err.details[0] ? err.details[0].message : (err.message && res.status === 429 ? err.message : 'Ihre Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es noch einmal oder rufen Sie uns an: ' + PHONE + '.');
            showErrors(fields, /[.!?]$/.test(text) ? text : text + '.');
          });
        })
        .catch(function () { showErrors([], 'Ihre Nachricht konnte nicht gesendet werden. Bitte prüfen Sie Ihre Internetverbindung oder rufen Sie uns an: ' + PHONE + '.'); })
        .then(function () { if (submit && submit.isConnected) { submit.disabled = false; submit.innerHTML = submitHtml; } });
    });
  });

  /* ── Google reviews (loaded when the section comes into view) ── */
  $$('[data-reviews]').forEach(function (sec) {
    var top = $('[data-reviews-top]', sec);
    var list = $('[data-reviews-list]', sec);
    var note = $('[data-reviews-note]', sec);
    var write = $('[data-reviews-write]', sec);
    var GM = '<span class="gmaps" translate="no">Google Maps</span>';
    function stars(r) { var v = Math.max(0, Math.min(5, Number(r) || 0)); return '<span class="stars" style="--p:' + (v / 5 * 100).toFixed(1) + '%" role="img" aria-label="' + String(v).replace('.', ',') + ' von 5 Sternen"></span>'; }
    function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
    function fallback(links) {
      var url = (links && (links.reviewsUri || links.mapsUri)) || (write ? write.href : '#');
      top.innerHTML = '<p style="margin:0">Lesen Sie, was unsere Kundinnen und Kunden über uns schreiben, direkt bei ' + GM + '.</p>'
        + '<a class="btn btn-quiet btn-sm" href="' + esc(url) + '" target="_blank" rel="noopener">Bewertungen bei Google ansehen</a>';
      list.hidden = true;
      if (note) note.textContent = '';
    }
    function show(r) {
      if (r && write && r.writeAReviewUri) write.href = r.writeAReviewUri;
      if (!r || !r.available || !(r.reviews || []).length) { fallback(r); return; }
      var rating = Number(r.rating || 0);
      top.innerHTML = '<div class="score"><b>' + rating.toFixed(1).replace('.', ',') + '</b><div>' + stars(rating) + '<br><small>' + Number(r.count || 0).toLocaleString('de-DE') + ' Bewertungen auf ' + GM + '</small></div></div>'
        + (r.reviewsUri ? '<a class="btn btn-quiet btn-sm" href="' + esc(r.reviewsUri) + '" target="_blank" rel="noopener">Alle Bewertungen ansehen</a>' : '');
      list.innerHTML = r.reviews.map(function (v) {
        var a = v.author || {};
        var photo = a.photo ? '<img src="' + esc(/^https?:/.test(a.photo) ? a.photo : API + a.photo) + '" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer" data-ini="' + esc(initials(a.name)) + '">' : '<span class="av" aria-hidden="true">' + esc(initials(a.name)) + '</span>';
        var name = a.uri ? '<a href="' + esc(a.uri) + '" target="_blank" rel="noopener nofollow">' + esc(a.name) + '</a>' : esc(a.name);
        return '<article class="review"><div class="review-head">' + photo + '<span><b>' + name + '</b><small>' + esc(v.relativeTime || '') + '</small></span></div>'
          + stars(v.rating) + '<p>' + esc(v.text || '') + '</p>'
          + (v.googleMapsUri ? '<span class="src"><a href="' + esc(v.googleMapsUri) + '" target="_blank" rel="noopener nofollow">Bewertung auf ' + GM + ' ansehen</a></span>' : '<span class="src">' + GM + '</span>')
          + '</article>';
      }).join('');
      $$('img[data-ini]', list).forEach(function (img) {
        img.addEventListener('error', function () { var s = d.createElement('span'); s.className = 'av'; s.setAttribute('aria-hidden', 'true'); s.textContent = img.getAttribute('data-ini'); img.replaceWith(s); });
      });
      if (note) note.textContent = 'Bis zu fünf Bewertungen, unverändert von Google übernommen und von Google nach Relevanz sortiert. Wir prüfen nicht, ob die Verfasser bei uns eingekauft haben.';
    }
    var started = false;
    function load() {
      if (started) return;
      started = true;
      // Not cached: Google's terms forbid storing reviews
      fetch(API + '/api/website/reviews', { headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
        .then(function (j) { show(j.data || j); })
        .catch(function () { fallback(null); });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '300px 0px' });
      io.observe(sec);
    } else load();
  });

  /* ── Google Maps: two clicks, nothing loads before ────── */
  var maps = $$('[data-map]');
  function loadMaps() {
    maps.forEach(function (m) {
      if (m.querySelector('iframe')) return;
      var f = d.createElement('iframe');
      f.src = m.getAttribute('data-embed');
      f.title = 'Karte: Wilken Poelker, Langholter Straße 43, 26842 Ostrhauderfehn';
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.setAttribute('allowfullscreen', '');
      m.innerHTML = '';
      m.appendChild(f);
    });
  }
  if (maps.length) {
    if (store.get('wp-map') === '1') loadMaps();
    maps.forEach(function (m) {
      var btn = $('[data-map-load]', m);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var remember = $('[data-map-remember]', m);
        store.set('wp-map', '1', !(remember && remember.checked));
        loadMaps();
      });
    });
  }

  /* ── App: screens of the phone ────────────────────────── */
  $$('[data-app]').forEach(function (app) {
    var btns = $$('[data-screen-btn]', app);
    var shots = $$('[data-screen]', app);
    var i = 0;
    var timer = null;
    var touched = false;
    var paused = false;
    function show(j) {
      i = j;
      var key = btns[j].getAttribute('data-screen-btn');
      btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === j ? 'true' : 'false'); });
      shots.forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-screen') === key); });
    }
    btns.forEach(function (b, j) { b.addEventListener('click', function () { touched = true; stop(); show(j); }); });
    function stop() { clearInterval(timer); timer = null; }
    function start() { if (!timer && !touched && !reduceMotion) timer = setInterval(function () { if (!paused) show((i + 1) % btns.length); }, 4800); }
    app.addEventListener('mouseenter', function () { paused = true; });
    app.addEventListener('mouseleave', function () { paused = false; });
    app.addEventListener('focusin', function () { paused = true; });
    app.addEventListener('focusout', function () { paused = false; });
    if ('IntersectionObserver' in window && btns.length > 1) {
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) start(); else stop(); }, { threshold: 0.35 }).observe(app);
    }
  });

  /* ── Bike catalogue (BIDEX), only after consent ───────── */
  var gate = $('#bike-gate');
  if (gate) {
    var KEY = 'wp_bidex_consent';
    var revoke = $('#bike-revoke');
    var loaded = false;
    var loadBikes = function () {
      if (loaded) return;
      loaded = true;
      gate.hidden = true;
      revoke.hidden = false;
      var s = d.createElement('script');
      s.src = 'https://2.local.bidex.bike/Scripts/catalog.min.js';
      s.onload = function () { if (window.BidexCatalog) window.BidexCatalog({ IDShop: 12639, target: '#BidexCatalog', InitialBidexGroup: '12' }); };
      s.onerror = function () {
        loaded = false;
        gate.hidden = false;
        revoke.hidden = true;
        var p = $('.bike-error', gate) || gate.appendChild(Object.assign(d.createElement('p'), { className: 'form-msg bike-error' }));
        p.textContent = 'Der Fahrradkatalog ist gerade nicht erreichbar. Bitte versuchen Sie es später noch einmal oder rufen Sie uns an: ' + PHONE + '.';
        s.remove();
      };
      d.body.appendChild(s);
    };
    $('#bike-load').addEventListener('click', function () {
      store.set(KEY, '1', true);
      if ($('#bike-remember').checked) store.set(KEY, '1');
      loadBikes();
    });
    $('#bike-revoke-link').addEventListener('click', function (e) {
      e.preventDefault();
      store.del(KEY);
      try { sessionStorage.removeItem('preloadImage'); localStorage.removeItem('IndexURL'); } catch (err) { /* blocked */ }
      location.href = location.pathname; // reload without the catalogue
    });
    if (store.get(KEY) === '1') loadBikes();
  }

  window.WP = { api: API, lightbox: lightbox, getJSON: getJSON, money: money, esc: esc, store: store };
}());
