/* Wilken Poelker – Merkzettel: the bookmarked products, grouped by device,
   side by side with their data, and one inquiry for the whole list.
   The list lives only in this browser (site.js, WP.merk); the product data
   comes from /produkte/vergleich/<device>.json (written by build.js). */
(function () {
  'use strict';
  var d = document;
  var WP = window.WP || {};
  var root = d.querySelector('[data-merk-page]');
  if (!root || !WP.merk) return;
  var esc = WP.esc;
  var money = WP.money;
  var ask = d.querySelector('[data-merk-ask]');
  var form = ask ? ask.querySelector('form[data-inquiry]') : null;
  var files = {};
  var state = { diff: {}, open: {}, all: {}, undo: null, items: [] };

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function icon(name) { return '<svg class="ic" aria-hidden="true"><use href="/assets/icons.svg#' + name + '"/></svg>'; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function key(k) { return String(k).toLowerCase().replace(/[^a-z0-9äöüß]+/g, ''); }
  function productUrl(slug) { return '/produkte/p/' + encodeURIComponent(slug) + '.html'; }

  function load(g) {
    if (!files[g]) {
      files[g] = fetch('/produkte/vergleich/' + encodeURIComponent(g) + '.json', { headers: { Accept: 'application/json' } })
        .then(function (r) {
          // No such group any more (device renamed): empty, its products move on
          if (r.status === 404) return { name: '', items: [] };
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .catch(function () { delete files[g]; return null; });
    }
    return files[g];
  }
  var index = null; // slug -> device of the search index (for products that moved)
  function deviceIndex() {
    if (!index) {
      index = fetch('/produkte/suche.json').then(function (r) { return r.json(); }).then(function (j) {
        var m = {};
        (j.items || []).forEach(function (it) { if (it[8]) m[it[0]] = it[8]; });
        return m;
      }).catch(function () { index = null; return {}; });
    }
    return index;
  }

  // The list with the data of every product; products that are gone are
  // removed, products in another device group now get the new group
  function resolve() {
    var list = WP.merk.read();
    var groups = [];
    list.forEach(function (x) { if (groups.indexOf(x.g) < 0) groups.push(x.g); });
    return Promise.all(groups.map(load)).then(function (datas) {
      var byG = {};
      groups.forEach(function (g, i) { byG[g] = datas[i]; });
      var find = function (x) { var f = byG[x.g]; return f && f.items.filter(function (it) { return it.s === x.s; })[0]; };
      var missing = list.filter(function (x) { return !find(x); });
      if (!missing.length) return { list: list, byG: byG };
      // A group file that could not be loaded (offline): keep the list as it is
      if (groups.some(function (g) { return byG[g] === null; })) return { list: list, byG: byG, failed: true };
      return deviceIndex().then(function (m) {
        var next = [];
        list.forEach(function (x) {
          if (find(x)) next.push(x);
          else if (m[x.s] && m[x.s] !== x.g) next.push({ s: x.s, g: m[x.s] });
        });
        var newGroups = [];
        next.forEach(function (x) { if (!byG.hasOwnProperty(x.g) && newGroups.indexOf(x.g) < 0) newGroups.push(x.g); });
        return Promise.all(newGroups.map(load)).then(function (more) {
          newGroups.forEach(function (g, i) { byG[g] = more[i]; });
          next = next.filter(function (x) { return find(x); });
          if (next.length !== list.length || next.some(function (x, i) { return x.g !== list[i].g; })) WP.merk.write(next);
          return { list: next, byG: byG, dropped: list.length - next.length };
        });
      });
    });
  }

  function priceHtml(it) {
    if (it.p == null) return '<span class="price">Preis auf Anfrage</span>';
    return '<span class="price' + (it.u ? ' offer' : '') + '">' + (it.m ? 'ab ' : '') + esc(money(it.p)) + '</span>'
      + (it.u ? ' <span class="uvp">UVP ' + esc(money(it.u)) + '</span>' : '');
  }

  function groupHtml(g, file, items) {
    var n = items.length;
    var rows = [];
    var at = {};
    items.forEach(function (it) {
      (it.r || []).forEach(function (r) {
        var k = key(r[0]);
        if (!(k in at)) { at[k] = rows.length; rows.push({ label: r[0], vals: [] }); }
      });
    });
    items.forEach(function (it, col) {
      (it.r || []).forEach(function (r) { rows[at[key(r[0])]].vals[col] = r[1]; });
    });
    // Rows that all products have first (those are the ones to compare)
    rows.forEach(function (row, i) { row.i = i; row.n = row.vals.filter(function (v) { return v != null; }).length; });
    rows.sort(function (a, b) { return b.n - a.n || a.i - b.i; });
    // Data that only one of several products has (long manufacturer data
    // sheets) is folded away until the visitor wants to see everything
    var solo = n > 1 ? rows.filter(function (row) { return row.n < 2; }).length : 0;
    if (solo && solo === rows.length) solo = 0;
    var all = !!state.all[g];
    var body = rows.map(function (row) {
      var vals = items.map(function (it, col) { return row.vals[col]; });
      var same = n > 1 && vals.every(function (v) { return v != null && key(v) === key(vals[0]); });
      var cls = [same ? 'same' : '', solo && row.n < 2 ? 'solo' : ''].filter(Boolean).join(' ');
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><th scope="row">' + esc(row.label) + '</th>'
        + vals.map(function (v) { return v == null ? '<td class="none">–</td>' : '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
    }).join('');
    var head = items.map(function (it) {
      var pic = it.i ? '<img src="' + esc(it.i) + '" alt="" width="160" height="160" loading="lazy">' : '<span class="noimg">Bild folgt</span>';
      return '<th scope="col"><div class="cmp-p">'
        + '<a class="cmp-img" href="' + productUrl(it.s) + '" tabindex="-1" aria-hidden="true">' + pic + '</a>'
        + (it.b ? '<span class="pbrand">' + esc(it.b) + '</span>' : '')
        + '<a class="cmp-name" href="' + productUrl(it.s) + '">' + esc(it.t) + '</a>'
        + '<span class="pprice">' + priceHtml(it) + '</span>'
        + '<span class="avail' + (it.a ? ' yes' : '') + '">' + (it.a ? 'Im Laden verfügbar' : 'Derzeit nicht vorrätig') + '</span>'
        + '<button type="button" class="btn btn-ghost btn-sm cmp-rm" data-merk-rm="' + esc(it.s) + '" aria-label="' + esc(it.t) + ' vom Merkzettel entfernen">' + icon('close') + 'Entfernen</button>'
        + '</div></th>';
    }).join('');
    var mine = items.map(function (it) { return it.s; });
    var others = file.items.filter(function (it) { return mine.indexOf(it.s) < 0; })
      .sort(function (a, b) { return b.a - a.a || a.t.localeCompare(b.t, 'de'); });
    var diffable = n > 1 && rows.length > 1;
    var diffOn = diffable && !!state.diff[g];
    return '<section class="merk-group" data-g="' + esc(g) + '" aria-labelledby="mg-' + esc(g) + '">'
      + '<div class="merk-head"><h2 id="mg-' + esc(g) + '">' + esc(file.name) + ' <small>' + plural(n, 'Produkt', 'Produkte') + '</small></h2>'
      + (diffable ? '<label class="cmp-diff"><input type="checkbox" data-diff' + (diffOn ? ' checked' : '') + '> Nur Unterschiede zeigen</label>' : '')
      + '</div>'
      + '<div class="cmp-scroll" tabindex="0" role="region" aria-label="Vergleich ' + esc(file.name) + '"><table class="cmp' + (diffOn ? ' only-diff' : '') + (solo && !all ? ' fold' : '') + '">'
      + '<thead><tr><td class="cmp-corner"></td>' + head + '</tr></thead>'
      + '<tbody>' + (body || '<tr><th scope="row">Daten</th>' + items.map(function () { return '<td class="none">Keine Angaben</td>'; }).join('') + '</tr>') + '</tbody>'
      + '</table></div>'
      + (solo ? '<button type="button" class="btn btn-ghost btn-sm cmp-all" data-all aria-expanded="' + all + '">' + icon(all ? 'chevron-down' : 'chevron-right') + (all ? 'Nur gemeinsame Angaben zeigen' : 'Alle Angaben zeigen (' + solo + ' weitere)') + '</button>' : '')
      + (n === 1 && others.length ? '<p class="merk-tip">Merken Sie ein weiteres Gerät dieser Art, um beide nebeneinander zu vergleichen.</p>' : '')
      + (others.length ? '<details class="merk-more"' + (state.open[g] || (n === 1) ? ' open' : '') + '><summary>Weitere ' + esc(file.name) + ' zum Vergleich hinzufügen <small>(' + others.length + ')</small></summary><ul>'
        + others.map(function (it) {
          return '<li><button type="button" data-merk-add="' + esc(it.s) + '">' + icon('bookmark') + '<span>' + esc(it.t) + (it.a ? '' : ' <em>nicht vorrätig</em>') + '</span><small>' + (it.p == null ? '' : (it.m ? 'ab ' : '') + esc(money(it.p))) + '</small></button></li>';
        }).join('') + '</ul></details>' : '')
      + '</section>';
  }

  function render(res) {
    var list = res.list;
    state.items = [];
    if (ask) ask.hidden = !list.length;
    var undo = state.undo ? '<p class="merk-undo" role="status">Merkzettel geleert. <button type="button" class="btn btn-ghost btn-sm" data-merk-undo>Rückgängig</button></p>' : '';
    if (!list.length) {
      root.innerHTML = undo + '<div class="empty merk-empty"><p><b>Ihr Merkzettel ist noch leer.</b></p>'
        + '<p>Auf jeder Produktseite legen Sie ein Gerät mit „Merken und vergleichen“ hierher. Geräte derselben Art sehen Sie dann nebeneinander mit allen Daten.</p>'
        + '<div class="btns"><a class="btn" href="/produkte/">' + icon('grid') + 'Produkte ansehen</a><a class="btn btn-quiet" href="/angebote.html">' + icon('tag') + 'Angebote</a></div></div>';
      return;
    }
    var groups = [];
    list.forEach(function (x) { if (groups.indexOf(x.g) < 0) groups.push(x.g); });
    var html = groups.map(function (g) {
      var file = res.byG[g];
      if (!file) return '';
      var items = list.filter(function (x) { return x.g === g; }).map(function (x) {
        return file.items.filter(function (it) { return it.s === x.s; })[0];
      }).filter(Boolean);
      state.items = state.items.concat(items);
      return items.length ? groupHtml(g, file, items) : '';
    }).join('');
    var n = state.items.length;
    var note = res.failed ? '<p class="merk-tip">Einige Daten konnten gerade nicht geladen werden. Bitte versuchen Sie es gleich noch einmal.</p>'
      : (res.dropped ? '<p class="merk-tip">' + (res.dropped === 1 ? 'Ein Produkt gibt es nicht mehr in unserem Sortiment, es wurde entfernt.' : res.dropped + ' Produkte gibt es nicht mehr in unserem Sortiment, sie wurden entfernt.') + '</p>' : '');
    root.innerHTML = '<div class="merk-bar"><p><b>' + plural(n, 'Produkt', 'Produkte') + '</b>' + (groups.length > 1 ? ' aus ' + groups.length + ' Gerätearten' : '') + '</p>'
      + '<div class="btns"><a class="btn btn-sm" href="#anfrage">' + icon('mail') + 'Anfrage zu allen senden</a>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-merk-clear>Merkzettel leeren</button></div></div>'
      + undo + note + html;
  }

  function refresh() {
    var run = resolve().then(render).catch(function () {
      root.innerHTML = '<div class="empty"><p><b>Der Merkzettel konnte nicht geladen werden.</b></p><p>Bitte laden Sie die Seite neu.</p></div>';
    });
    return run;
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-merk-rm')) {
      var slug = b.getAttribute('data-merk-rm');
      var group = b.closest('[data-g]');
      WP.merk.write(WP.merk.read().filter(function (x) { return x.s !== slug; }));
      state.undo = null;
      refresh().then(function () {
        // Keep the keyboard focus in the same group if it is still there
        var same = group && root.querySelector('[data-g="' + group.getAttribute('data-g') + '"] .cmp-rm');
        var next = same || root.querySelector('.cmp-rm, .merk-empty a');
        if (next) next.focus({ preventScroll: !!same });
      });
    } else if (b.hasAttribute('data-merk-add')) {
      var g = b.closest('[data-g]').getAttribute('data-g');
      var list = WP.merk.read();
      if (list.length >= WP.merk.max) list.shift();
      list.push({ s: b.getAttribute('data-merk-add'), g: g });
      WP.merk.write(list);
      state.open[g] = true;
      state.undo = null;
      refresh();
    } else if (b.hasAttribute('data-all')) {
      var ga = b.closest('[data-g]').getAttribute('data-g');
      state.all[ga] = !state.all[ga];
      refresh().then(function () { var nb = root.querySelector('[data-g="' + ga + '"] [data-all]'); if (nb) nb.focus({ preventScroll: true }); });
    } else if (b.hasAttribute('data-merk-clear')) {
      state.undo = WP.merk.read();
      WP.merk.write([]);
      refresh().then(function () { var u = root.querySelector('[data-merk-undo]'); if (u) u.focus(); });
    } else if (b.hasAttribute('data-merk-undo')) {
      WP.merk.write(state.undo || []);
      state.undo = null;
      refresh();
    }
  });
  root.addEventListener('change', function (e) {
    if (!e.target.matches('[data-diff]')) return;
    var sec = e.target.closest('[data-g]');
    state.diff[sec.getAttribute('data-g')] = e.target.checked;
    var t = sec.querySelector('.cmp');
    if (t) t.classList.toggle('only-diff', e.target.checked);
  });
  root.addEventListener('toggle', function (e) {
    if (e.target.matches && e.target.matches('details.merk-more')) state.open[e.target.closest('[data-g]').getAttribute('data-g')] = e.target.open;
  }, true);
  window.addEventListener('storage', function (e) { if (e.key === 'wp-merk' || e.key === null) refresh(); });

  // The inquiry carries the list (allgemein -> Verkauf, who sees every department)
  if (form) {
    form.wpExtra = function (data) {
      var items = state.items;
      data.productTitle = 'Merkzettel (' + plural(items.length, 'Produkt', 'Produkte') + ')';
      var lines = items.map(function (it) {
        return '- ' + it.t + (it.p != null ? ', ' + (it.m ? 'ab ' : '') + money(it.p) : '') + (it.a ? '' : ', derzeit nicht vorrätig') + ' (' + location.origin + productUrl(it.s) + ')';
      });
      var text = (data.message ? data.message + '\n\n' : '') + 'Merkzettel:\n' + lines.join('\n');
      data.message = text.length > 2000 ? text.slice(0, 1997) + '…' : text;
    };
  }

  refresh();
}());
