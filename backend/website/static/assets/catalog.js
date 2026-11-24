/* Wilken Poelker – product lists (filters, sorting) and product pages
   (variants, pictures, live price and stock from the app server). The pages
   are complete without this script; it only adds the interaction. */
(function () {
  'use strict';
  var d = document;
  var WP = window.WP || {};
  var API = WP.api || String(d.documentElement.getAttribute('data-api') || 'https://api.wilkenpoelker.de').replace(/\/+$/, '');
  var esc = WP.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = WP.money || function (v) { return Number(v).toFixed(2).replace('.', ',') + ' €'; };
  var EN = !!WP.en;
  function T(de, en) { return EN ? en : de; }
  function $(sel, ctx) { return (ctx || d).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '');
  }
  function tight(s) { return norm(s).replace(/[^a-z0-9]+/g, ''); }

  /* ── Old links of the previous website: /produkte/#kategorie=… ── */
  var legacy = $('#legacy-categories');
  if (legacy && /^#kategorie=/.test(location.hash)) {
    try {
      var map = JSON.parse(legacy.textContent);
      var want = decodeURIComponent(location.hash.slice('#kategorie='.length).replace(/\+/g, ' '));
      var hit = Object.keys(map).filter(function (k) { return k === want || tight(k) === tight(want); })[0];
      if (hit) location.replace(map[hit]);
    } catch (e) { /* stay on the overview */ }
  }

  /* ── Product lists with filters ───────────────────────── */
  var DRIVE = EN ? { akku: 'Battery', benzin: 'Petrol', elektro: 'Electric', diesel: 'Diesel', manuell: 'No motor' }
    : { akku: 'Akku', benzin: 'Benzin', elektro: 'Elektro', diesel: 'Diesel', manuell: 'Ohne Motor' };
  var FACETS = [['main', 'kategorie'], ['cat', 'geraet'], ['drive', 'antrieb'], ['sys', 'system'], ['brand', 'marke']];

  $$('[data-shop]').forEach(function (shop) {
    var grid = $('[data-grid]', shop);
    var cards = $$('.pcard', grid).map(function (el, i) {
      var ds = el.dataset;
      return {
        el: el, i: i, q: ' ' + norm(ds.q).replace(/[^a-z0-9]+/g, ' '), t: tight(ds.q), title: ds.title || '',
        main: ds.main, cat: ds.cat, drive: ds.drive, sys: ds.sys, brand: ds.brand,
        price: ds.price === '' ? null : Number(ds.price), avail: ds.avail === '1', offer: ds.offer === '1',
      };
    });
    var qInput = $('[data-f-q]', shop);
    var minInput = $('[data-f-min]', shop);
    var maxInput = $('[data-f-max]', shop);
    var sortSel = $('[data-sort]', shop);
    var countEl = $('[data-count]', shop);
    var empty = $('[data-empty]', shop);
    var toggle = $('#ftoggle', shop);
    var panel = $('#filters', shop);
    var toggleText = toggle ? toggle.lastChild.textContent : 'Filter';
    var showBtn = $('[data-f-show]', shop);
    var asSheet = window.matchMedia ? window.matchMedia('(max-width: 900px)') : { matches: false };
    var state = { q: '', flags: { avail: false, offer: false }, sel: {}, min: null, max: null, sort: 'relevance' };
    FACETS.forEach(function (f) { state.sel[f[0]] = []; });

    // Chips of the facets with at least two different values in this list
    var facetEls = {};
    FACETS.forEach(function (f) {
      var key = f[0];
      var box = $('[data-facet="' + key + '"]', shop);
      if (!box) return;
      var counts = {};
      cards.forEach(function (c) { if (c[key]) counts[c[key]] = (counts[c[key]] || 0) + 1; });
      var values = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b, T('de', 'en')); });
      if (values.length < 2) { box.hidden = true; return; }
      $('.fchips', box).innerHTML = values.map(function (v) {
        var label = key === 'drive' ? (DRIVE[v] || v) : (key === 'sys' ? v + T('-System', ' system') : v);
        return '<button type="button" class="fchip" data-v="' + esc(v) + '" aria-pressed="false">' + esc(label) + ' <small></small></button>';
      }).join('');
      facetEls[key] = box;
    });

    function matches(c, skip) {
      if (state.flags.avail && !c.avail) return false;
      if (state.flags.offer && !c.offer) return false;
      if (state.min != null && (c.price == null || c.price < state.min)) return false;
      if (state.max != null && (c.price == null || c.price > state.max)) return false;
      for (var k = 0; k < FACETS.length; k += 1) {
        var key = FACETS[k][0];
        if (key !== skip && state.sel[key].length && state.sel[key].indexOf(c[key]) < 0) return false;
      }
      if (state.q) {
        var tokens = norm(state.q).split(/[^a-z0-9]+/).filter(Boolean);
        var whole = tight(state.q);
        var all = tokens.every(function (tok) { return c.q.indexOf(tok) >= 0; });
        if (!all && c.t.indexOf(whole) < 0) return false;
      }
      return true;
    }

    function plural(n) { return EN ? n.toLocaleString('en-GB') + (n === 1 ? ' product' : ' products') : n.toLocaleString('de-DE') + (n === 1 ? ' Produkt' : ' Produkte'); }

    function apply(push) {
      var shown = cards.filter(function (c) { return matches(c); });
      var order = shown.slice();
      if (state.sort === 'price_asc' || state.sort === 'price_desc') {
        var dir = state.sort === 'price_asc' ? 1 : -1;
        order.sort(function (a, b) {
          if (a.price == null) return b.price == null ? a.i - b.i : 1;
          if (b.price == null) return -1;
          return (a.price - b.price) * dir || a.i - b.i;
        });
      } else if (state.sort === 'name') order.sort(function (a, b) { return a.title.localeCompare(b.title, 'de'); });
      else order.sort(function (a, b) { return a.i - b.i; });
      var set = new Set(shown);
      cards.forEach(function (c) { c.el.hidden = !set.has(c); });
      var frag = d.createDocumentFragment();
      order.forEach(function (c) { frag.appendChild(c.el); });
      cards.forEach(function (c) { if (!set.has(c)) frag.appendChild(c.el); });
      grid.appendChild(frag);
      if (countEl) countEl.textContent = plural(shown.length);
      if (showBtn) showBtn.textContent = shown.length ? T(plural(shown.length) + ' anzeigen', 'Show ' + plural(shown.length)) : T('Keine Treffer', 'No results');
      if (empty) empty.hidden = shown.length > 0;
      // Numbers on the chips: what each choice would show with the other filters
      Object.keys(facetEls).forEach(function (key) {
        var counts = {};
        cards.forEach(function (c) { if (c[key] && matches(c, key)) counts[c[key]] = (counts[c[key]] || 0) + 1; });
        $$('.fchip', facetEls[key]).forEach(function (b) {
          var v = b.getAttribute('data-v');
          var on = state.sel[key].indexOf(v) >= 0;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.querySelector('small').textContent = counts[v] || 0;
          b.disabled = !on && !counts[v];
        });
      });
      $$('[data-flag]', shop).forEach(function (b) {
        var on = !!state.flags[b.getAttribute('data-flag')];
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var active = (state.q ? 1 : 0) + (state.flags.avail ? 1 : 0) + (state.flags.offer ? 1 : 0) + (state.min != null ? 1 : 0) + (state.max != null ? 1 : 0)
        + FACETS.reduce(function (n, f) { return n + state.sel[f[0]].length; }, 0);
      if (toggle) toggle.lastChild.textContent = active ? toggleText + ' (' + active + ')' : toggleText;
      if (push !== false) writeUrl();
    }

    // Filters in the address, so a filtered list can be shared and "back" works
    function writeUrl() {
      var p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      FACETS.forEach(function (f) { state.sel[f[0]].forEach(function (v) { p.append(f[1], v); }); });
      if (state.flags.avail) p.set('verfuegbar', '1');
      if (state.flags.offer) p.set('angebot', '1');
      if (state.min != null) p.set('von', state.min);
      if (state.max != null) p.set('bis', state.max);
      if (state.sort !== 'relevance') p.set('sortierung', state.sort);
      var qs = p.toString();
      history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
    function readUrl() {
      var p = new URLSearchParams(location.search);
      state.q = (p.get('q') || '').trim();
      FACETS.forEach(function (f) { state.sel[f[0]] = p.getAll(f[1]).filter(function (v) { return cards.some(function (c) { return c[f[0]] === v; }); }); });
      state.flags.avail = p.get('verfuegbar') === '1';
      state.flags.offer = p.get('angebot') === '1';
      var num = function (v) { return v === null || v === '' || isNaN(Number(v)) ? null : Number(v); };
      state.min = num(p.get('von'));
      state.max = num(p.get('bis'));
      var s = p.get('sortierung');
      state.sort = ['price_asc', 'price_desc', 'name'].indexOf(s) >= 0 ? s : 'relevance';
      if (qInput) qInput.value = state.q;
      if (minInput) minInput.value = state.min == null ? '' : state.min;
      if (maxInput) maxInput.value = state.max == null ? '' : state.max;
      if (sortSel) sortSel.value = state.sort;
    }

    shop.addEventListener('click', function (e) {
      var chip = e.target.closest('.fchip[data-v]');
      if (chip) {
        var key = chip.closest('[data-facet]').getAttribute('data-facet');
        var v = chip.getAttribute('data-v');
        var list = state.sel[key];
        var at = list.indexOf(v);
        if (at >= 0) list.splice(at, 1); else list.push(v);
        apply();
        return;
      }
      if (e.target.closest('[data-f-close]')) { setOpen(false); return; }
      var flag = e.target.closest('[data-flag]');
      if (flag) { var f = flag.getAttribute('data-flag'); state.flags[f] = !state.flags[f]; apply(); return; }
      if (e.target.closest('[data-f-reset]')) {
        state.q = ''; state.min = null; state.max = null; state.flags.avail = false; state.flags.offer = false;
        FACETS.forEach(function (fc) { state.sel[fc[0]] = []; });
        if (qInput) qInput.value = '';
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
        apply();
      }
    });
    var t;
    if (qInput) qInput.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = qInput.value.trim(); apply(); }, 120); });
    var priceInput = function () {
      var v1 = minInput && minInput.value !== '' ? Number(minInput.value) : null;
      var v2 = maxInput && maxInput.value !== '' ? Number(maxInput.value) : null;
      state.min = v1 != null && !isNaN(v1) ? v1 : null;
      state.max = v2 != null && !isNaN(v2) ? v2 : null;
      clearTimeout(t); t = setTimeout(apply, 250);
    };
    if (minInput) minInput.addEventListener('input', priceInput);
    if (maxInput) maxInput.addEventListener('input', priceInput);
    if (sortSel) sortSel.addEventListener('change', function () { state.sort = sortSel.value; apply(); });
    // On small screens the panel is a full-screen sheet: page scrolling is
    // paused while it is open, Escape and "Produkte anzeigen" close it
    function setOpen(open) {
      if (!panel) return;
      var was = panel.classList.contains('open');
      panel.classList.toggle('open', open);
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      var sheet = open && asSheet.matches;
      d.documentElement.style.overflow = sheet ? 'hidden' : '';
      if (sheet) { var c = $('[data-f-close]', panel); if (c) c.focus(); } else if (was && toggle && asSheet.matches) toggle.focus();
    }
    if (toggle && panel) {
      toggle.addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
      panel.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false); });
      if (asSheet.addEventListener) asSheet.addEventListener('change', function () { if (!asSheet.matches) d.documentElement.style.overflow = ''; });
    }
    readUrl();
    apply(false);
  });

  /* ── Product page ─────────────────────────────────────── */
  var pdataEl = $('#pdata');
  if (!pdataEl) return;
  var P;
  try { P = JSON.parse(pdataEl.textContent); } catch (e) { return; }
  var vs = P.variants || [];
  var cur = P.start || 0;
  var priceBox = $('[data-price]');
  var availEl = $('[data-avail]');
  var artText = $('[data-artnr-text]');
  var artInputs = $$('[data-artnr]');
  var specsBox = $('[data-variant-specs]');
  var vButtons = $$('[data-variant]');
  var vSelect = $('[data-variant-select]');
  var mainImg = $('#pmain');
  var thumbs = $$('[data-gal-thumbs] button');

  function priceHtml(v) {
    if (v.price == null) return '<span class="price">' + T('Preis auf Anfrage', 'Price on request') + '</span>';
    // The saving always says what it refers to: the manufacturer's UVP
    var save = v.isOffer && v.uvp && v.uvp > v.price ? Math.floor(((v.uvp - v.price) / v.uvp) * 100) : 0;
    return '<span class="price' + (v.isOffer ? ' offer' : '') + '">' + esc(money(v.price)) + '</span>'
      + (save ? ' <span class="uvp">' + T('UVP ', 'RRP ') + esc(money(v.uvp)) + '</span><span class="save"><span>' + T(save + '&nbsp;% unter UVP', save + '% below RRP') + '</span></span>' : '');
  }
  function specsHtml(v) {
    // Rows: [label, value, mark]; mark 1 = label German, 2 = value German
    var de = function (on) { return on ? ' lang="de"' : ''; };
    var rows = (v.specs || []).map(function (r) { var m = r[2] || 0; return '<dt' + de(m & 1) + '>' + esc(r[0]) + '</dt><dd' + de(m & 2) + '>' + esc(r[1]) + '</dd>'; }).join('');
    // Notes: [text, translated]; untranslated ones stay German (lang="de")
    var notes = (v.notes || []).map(function (n) {
      var t = Array.isArray(n) ? n : [n, true];
      return '<li' + (t[1] ? '' : ' lang="de"') + '>' + esc(t[0]) + '</li>';
    }).join('');
    return '<h2>' + T('Ausstattung', 'Features') + '</h2>' + (rows ? '<dl>' + rows + '</dl>' : '') + (notes ? '<ul>' + notes + '</ul>' : '');
  }
  function showImage(btn) {
    if (!mainImg || !btn) return;
    mainImg.src = btn.getAttribute('data-big');
    mainImg.width = +btn.getAttribute('data-w');
    mainImg.height = +btn.getAttribute('data-h');
    thumbs.forEach(function (b) { b.classList.toggle('on', b === btn); });
  }
  // Pictures per look (frame shape, colour): only those of the chosen variant
  function filterThumbs(look) {
    if (!thumbs.length) return;
    var any = thumbs.some(function (b) { return b.getAttribute('data-look'); });
    if (!any) return;
    var fits = function (b) { var l = b.getAttribute('data-look'); return !l || !look || l === look; };
    thumbs.forEach(function (b) { b.hidden = !fits(b); });
    var current = thumbs.filter(function (b) { return b.classList.contains('on'); })[0];
    if (!current || current.hidden) showImage(thumbs.filter(function (b) { return !b.hidden && b.getAttribute('data-look') === look; })[0] || thumbs.filter(function (b) { return !b.hidden; })[0]);
  }
  function render() {
    var v = vs[cur];
    if (!v) return;
    if (priceBox) priceBox.innerHTML = priceHtml(v);
    if (availEl) {
      availEl.textContent = v.available ? T('Bei uns im Laden verfügbar', 'Available in our shop') : T('Derzeit nicht vorrätig, wir bestellen gern für Sie', 'Currently out of stock, we will be happy to order it for you');
      availEl.classList.toggle('yes', !!v.available);
    }
    if (artText) artText.textContent = v.artNr ? T('Art.-Nr. ', 'Item no. ') + v.artNr : '';
    artInputs.forEach(function (i) { i.value = v.artNr || ''; });
    if (specsBox) {
      var has = (v.specs || []).length || (v.notes || []).length;
      specsBox.hidden = !has;
      if (has) specsBox.innerHTML = specsHtml(v);
    }
    vButtons.forEach(function (b) {
      var i = +b.getAttribute('data-variant');
      b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
      var x = vs[i];
      var small = b.querySelector('small');
      if (small && x && x.price != null) small.textContent = money(x.price) + (x.available ? '' : T(', nicht vorrätig', ', out of stock'));
    });
    if (vSelect) vSelect.value = String(cur);
    filterThumbs(v.look);
  }
  function choose(i, fromUser) {
    if (!vs[i]) return;
    cur = i;
    render();
    if (fromUser && vs.length > 1) {
      var p = new URLSearchParams(location.search);
      p.set('v', vs[i].artNr);
      history.replaceState(history.state, '', location.pathname + '?' + p.toString() + location.hash);
    }
  }
  vButtons.forEach(function (b) { b.addEventListener('click', function () { choose(+b.getAttribute('data-variant'), true); }); });
  if (vSelect) vSelect.addEventListener('change', function () { choose(+vSelect.value, true); });
  var fromUrl = new URLSearchParams(location.search).get('v');
  if (fromUrl) {
    var at = vs.findIndex(function (v) { return v.artNr === fromUrl; });
    if (at >= 0) cur = at;
  }
  if (vs.length) render();

  thumbs.forEach(function (b) { b.addEventListener('click', function () { showImage(b); }); });
  var galMain = $('[data-gal-main]');
  if (galMain && WP.lightbox) {
    var openLb = function () {
      var visible = thumbs.filter(function (b) { return !b.hidden; });
      var list = visible.length
        ? visible.map(function (b) { return { src: b.getAttribute('data-big'), w: +b.getAttribute('data-w'), h: +b.getAttribute('data-h') }; })
        : [{ src: mainImg.src, w: mainImg.width, h: mainImg.height }];
      var i = Math.max(0, visible.findIndex(function (b) { return b.classList.contains('on'); }));
      WP.lightbox(list, i, galMain);
    };
    galMain.addEventListener('click', openLb);
    galMain.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(); } });
  }

  // Live price and stock: the page is built at night, the app server knows
  // today's numbers (same source as the app)
  var url = API + '/api/shop/products/' + encodeURIComponent(P.slug);
  (WP.getJSON ? WP.getJSON(url) : fetch(url).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (j) { return j.data; }))
    .then(function (data) {
      var live = data && data.product;
      if (!live || !Array.isArray(live.variants)) return;
      var byArt = {};
      live.variants.forEach(function (v) { byArt[v.artNr] = v; });
      var changed = false;
      vs.forEach(function (v) {
        var n = byArt[v.artNr];
        if (!n) { if (v.available) { v.available = false; changed = true; } return; }
        ['price', 'uvp', 'isOffer', 'available'].forEach(function (k) { if (n[k] !== undefined && n[k] !== v[k]) { v[k] = n[k]; changed = true; } });
      });
      if (changed) render();
    })
    .catch(function () { /* the built page stays as it is */ });
}());
