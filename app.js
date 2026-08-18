/* ============================================================
   Carino Law — app.js
   ------------------------------------------------------------
   Renders data/countries/*.json into five views of the same set:

     atlas    one card per country          → opens the full record
     gazette  the publication of record     → one row per country
     charter  the constitution              → one row per country
     find     task-oriented recipes         → "how do I look up X"
     all      every source, flat            → filter by kind / access

   There is no search field: the set is twenty-eight countries and a few
   hundred sources, small enough that region / tradition / kind chips reach any of it
   in one click, and a filter that shows what it is filtering by beats a text
   box that shows nothing.

   The data files ARE the document. They stay English and a fork edits
   them directly; only the interface chrome is translated (i18n.js).
   Nothing here is generated or cached — the JSON is the source of truth
   and this file only ever reads it.
   ============================================================ */
(function () {
  'use strict';

  /* i18n: TT() is a no-op until i18n.js has installed window.t, which is why
     every render path goes through it rather than reading the dictionary. */
  function TT(s) { return (typeof window.t === 'function') ? window.t(s) : s; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var COUNTRIES = [];          // loaded records, in index order
  var BY_CODE = {};
  var PANEL = 'atlas';
  var FILTER = {};             // per-panel chip selection: {atlas:{region:'Europe'}, …}

  /* ---- vocabulary -------------------------------------------------------- */

  var KIND_LABEL = {
    gazette: 'Gazette of record', constitution: 'Constitution', consolidated: 'Consolidated law',
    legislature: 'Legislature', courts: 'Courts', caselaw: 'Case law', codes: 'Codes',
    treaties: 'Treaties', regulations: 'Regulations', subnational: 'Subnational',
    translation: 'Translation', research: 'Research',
  };
  var ACCESS_LABEL = {
    free: 'Free', 'free-registration': 'Registration', 'partial-paywall': 'Part paywalled', paywall: 'Paywalled',
  };
  var ACCESS_CLASS = {
    free: 'b-free', 'free-registration': 'b-reg', 'partial-paywall': 'b-part', paywall: 'b-pay',
  };
  var TRADITION_LABEL = {
    civil: 'Civil law', common: 'Common law', mixed: 'Mixed', 'socialist-civil': 'Socialist civil',
    'religious-mixed': 'Religious / mixed',
  };

  /* ---- loading ----------------------------------------------------------- */

  function fail(msg) {
    document.querySelectorAll('.panel').forEach(function (p) {
      p.innerHTML = '<div class="empty">' + msg + '</div>';
    });
  }

  /* One country per file, fetched in parallel. A file that 404s or fails to
     parse is SKIPPED rather than fatal — a half-added country should cost you
     that country, not the whole site. Only a missing index.json, or every
     country failing at once, is treated as a broken deployment. */
  function load() {
    return fetch('data/index.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('index'); return r.json(); })
      .then(function (idx) {
        return Promise.all((idx.countries || []).map(function (code) {
          return fetch('data/countries/' + code + '.json', { cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error(code); return r.json(); })
            .catch(function (e) {
              if (window.console) console.warn('law: skipped ' + code + ' — ' + e.message);
              return null;
            });
        }));
      })
      .then(function (list) {
        COUNTRIES = list.filter(Boolean);
        if (!COUNTRIES.length) throw new Error('empty');
        COUNTRIES.forEach(function (c) { BY_CODE[c.code] = c; });
        render();
        readHash();
      })
      .catch(function () {
        fail(TT('A data file failed to load. Serve this folder over http:// or check that the data/ directory is intact.') +
             ' <code>python3 -m http.server</code>');
      });
  }

  /* gazette and constitution live outside sources[] because every country has
     exactly one of each and the two dedicated views need them by name. */
  function allSources(c) {
    var out = [];
    if (c.gazette) out.push(c.gazette);
    if (c.constitution) out.push(c.constitution);
    return out.concat(c.sources || []);
  }

  /* ---- shared fragments --------------------------------------------------- */

  function badgeOfficial(s) {
    return s.official
      ? '<span class="badge b-official">' + TT('Official') + '</span>'
      : '<span class="badge b-unofficial">' + TT('Unofficial') + '</span>';
  }

  function badgeAccess(s) {
    var k = ACCESS_CLASS[s.access] || 'b-unofficial';
    return '<span class="badge ' + k + '">' + TT(ACCESS_LABEL[s.access] || s.access || '') + '</span>';
  }

  function badgeKind(s) {
    return '<span class="badge b-kind">' + TT(KIND_LABEL[s.kind] || s.kind || '') + '</span>';
  }

  function sourceRow(c, s, opts) {
    opts = opts || {};
    var h = '<div class="row">';
    h += '<div class="r-head">';
    if (opts.country) {
      h += '<button class="r-cc" data-open="' + esc(c.code) + '" title="' + esc(c.name) + '">' +
           esc(c.flag || '') + ' ' + esc(c.iso) + '</button>';
    }
    h += '<span class="r-name"><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
         esc(s.native || s.name) + '</a></span>';
    if (s.en) h += '<span class="r-en">' + esc(s.en) + '</span>';
    h += '</div>';

    h += '<div class="r-meta">' + badgeOfficial(s) + badgeKind(s) + badgeAccess(s);
    if (s.langs && s.langs.length) {
      h += '<span class="badge b-lang">' + esc(s.langs.join(' / ')) + '</span>';
    }
    if (s.api) {
      h += '<a href="' + esc(s.api) + '" target="_blank" rel="noopener noreferrer">' +
           TT('bulk / API') + '</a>';
    }
    h += '</div>';

    /* Authority and coverage are prose, not chips. They go in ONE text node so
       they wrap as a sentence — as separate flex items the separator between
       them ends up orphaned at the start of a wrapped line. */
    var fmt = (s.formats && s.formats.length) ? s.formats.join(', ') : '';
    var facts = [s.authority, s.coverage, fmt].filter(Boolean).join('  ·  ');
    if (facts) h += '<div class="r-facts">' + esc(facts) + '</div>';

    if (s.desc) h += '<div class="r-desc">' + esc(s.desc) + '</div>';
    if (s.howto && !opts.terse) {
      h += '<div class="r-howto"><b>' + TT('How to look something up') + '</b>' + esc(s.howto) + '</div>';
    }
    if (s.note) h += '<div class="r-meta"><span>⚠ ' + esc(s.note) + '</span></div>';
    h += '<div class="r-url"><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
         esc(s.url) + '</a></div>';
    h += '</div>';
    return h;
  }

  function summaryStrip(cells) {
    return '<div class="summary">' + cells.map(function (c) {
      return '<span class="sm-c"><b>' + c[0] + '</b> <span class="sm-k">' + TT(c[1]) + '</span></span>';
    }).join('') + '</div>';
  }

  /* ---- chips -------------------------------------------------------------- */

  function regions() {
    var seen = [], out = [];
    COUNTRIES.forEach(function (c) {
      if (c.region && seen.indexOf(c.region) < 0) { seen.push(c.region); out.push(c.region); }
    });
    return out;
  }

  function traditions() {
    var seen = [], out = [];
    COUNTRIES.forEach(function (c) {
      if (c.tradition && seen.indexOf(c.tradition) < 0) { seen.push(c.tradition); out.push(c.tradition); }
    });
    return out;
  }

  function kinds() {
    var seen = {};
    COUNTRIES.forEach(function (c) {
      allSources(c).forEach(function (s) { if (s.kind) seen[s.kind] = 1; });
    });
    return Object.keys(seen).sort();
  }

  function renderChips() {
    var host = document.getElementById('chips');
    var f = FILTER[PANEL] || (FILTER[PANEL] = {});
    var h = '';

    if (PANEL === 'all') {
      h += '<span class="chip-lbl">' + TT('kind') + '</span>';
      kinds().forEach(function (k) {
        h += '<button class="chip' + (f.kind === k ? ' active' : '') + '" data-chip="kind" data-val="' +
             esc(k) + '">' + TT(KIND_LABEL[k] || k) + '</button>';
      });
      h += '<span class="chip-sep"></span>';
      h += '<button class="chip' + (f.official ? ' active' : '') + '" data-chip="official" data-val="1">' +
           TT('official only') + '</button>';
    } else {
      h += '<span class="chip-lbl">' + TT('region') + '</span>';
      regions().forEach(function (r) {
        h += '<button class="chip' + (f.region === r ? ' active' : '') + '" data-chip="region" data-val="' +
             esc(r) + '">' + TT(r) + '</button>';
      });
      if (PANEL === 'atlas') {
        h += '<span class="chip-lbl">' + TT('tradition') + '</span>';
        /* read off the data: hand-listing three traditions silently made the
           socialist-civil and religious-mixed countries unfilterable */
        traditions().forEach(function (t) {
          h += '<button class="chip' + (f.tradition === t ? ' active' : '') + '" data-chip="tradition" data-val="' +
               esc(t) + '">' + TT(TRADITION_LABEL[t] || t) + '</button>';
        });
      }
    }
    host.innerHTML = h;
  }

  function passRegion(c) {
    var f = FILTER[PANEL] || {};
    if (f.region && c.region !== f.region) return false;
    if (f.tradition && c.tradition !== f.tradition) return false;
    return true;
  }

  /* ---- panels ------------------------------------------------------------- */

  function renderAtlas() {
    var list = COUNTRIES.filter(passRegion);
    var el = document.getElementById('p-atlas');
    if (!list.length) { el.innerHTML = '<div class="empty">' + TT('Nothing matches.') + '</div>'; return; }

    var nSrc = 0;
    COUNTRIES.forEach(function (c) { nSrc += allSources(c).length; });

    var h = summaryStrip([[COUNTRIES.length, 'countries'], [nSrc, 'sources'],
                          [list.length, 'shown']]);
    h += '<div class="cgrid">';
    list.forEach(function (c) {
      var g = c.gazette || {};
      h += '<button class="ccard" data-open="' + esc(c.code) + '">';
      h += '<div class="cc-top"><span class="cc-flag">' + esc(c.flag || '') + '</span>';
      h += '<span class="cc-names"><span class="cc-name">' + esc(c.name) + '</span>';
      /* Canada's native name IS "Canada" — printing it twice reads as a bug */
      var nn = (c.nativeName && c.nativeName !== c.name) ? c.nativeName : '';
      h += '<span class="cc-native">' + esc(nn) + '</span></span>';
      h += '<span class="cc-iso">' + esc(c.iso) + '</span></div>';
      h += '<div class="cc-line">' + esc(c.traditionNote || c.summary || '') + '</div>';
      if (g.name) {
        h += '<div class="cc-gaz">' + TT('gazette') + ' <b>' + esc(g.native || g.name) + '</b></div>';
      }
      h += '<div class="cc-foot"><span class="badge b-kind">' +
           TT(TRADITION_LABEL[c.tradition] || c.tradition || '') + '</span>';
      h += '<span class="badge b-unofficial">' + allSources(c).length + ' ' + TT('sources') + '</span>';
      h += '</div></button>';
    });
    h += '</div>';
    el.innerHTML = h;
  }

  function renderOneEach(panelId, pick, emptyMsg) {
    var el = document.getElementById(panelId);
    var rows = [];
    COUNTRIES.forEach(function (c) {
      if (!passRegion(c)) return;
      var s = pick(c);
      if (!s) return;
      rows.push({ c: c, s: s });
    });
    if (!rows.length) { el.innerHTML = '<div class="empty">' + emptyMsg + '</div>'; return; }

    var free = rows.filter(function (r) { return r.s.access === 'free'; }).length;
    var h = summaryStrip([[rows.length, 'countries'], [free, 'free to read']]);
    h += '<div class="rows">';
    rows.forEach(function (r) { h += sourceRow(r.c, r.s, { country: true }); });
    h += '</div>';
    el.innerHTML = h;
  }

  function renderFind() {
    var el = document.getElementById('p-find');
    var items = [];
    COUNTRIES.forEach(function (c) {
      if (!passRegion(c)) return;
      (c.findLaw || []).forEach(function (f) { items.push({ c: c, f: f }); });
    });
    if (!items.length) { el.innerHTML = '<div class="empty">' + TT('Nothing matches.') + '</div>'; return; }

    var h = summaryStrip([[items.length, 'lookups']]);
    h += '<div class="rows">';
    var lastCode = null;
    items.forEach(function (it) {
      if (it.c.code !== lastCode) {
        lastCode = it.c.code;
        h += '<div class="kindgrp">' + esc(it.c.flag || '') + ' ' + esc(it.c.name) + '</div>';
      }
      h += '<div class="recipe">';
      h += '<div class="rc-task">' + esc(it.f.task) + '</div>';
      h += '<div class="rc-steps">' + esc(it.f.steps) + '</div>';
      h += '<div class="rc-foot">';
      if (it.f.source) h += '<span>' + esc(it.f.source) + '</span>';
      if (it.f.url) {
        h += '<a href="' + esc(it.f.url) + '" target="_blank" rel="noopener noreferrer">' +
             esc(it.f.url) + '</a>';
      }
      h += '</div></div>';
    });
    h += '</div>';
    el.innerHTML = h;
  }

  function renderAll() {
    var el = document.getElementById('p-all');
    var f = FILTER.all || {};
    var items = [];
    COUNTRIES.forEach(function (c) {
      allSources(c).forEach(function (s) {
        if (f.kind && s.kind !== f.kind) return;
        if (f.official && !s.official) return;
        items.push({ c: c, s: s });
      });
    });
    if (!items.length) { el.innerHTML = '<div class="empty">' + TT('Nothing matches.') + '</div>'; return; }

    var off = items.filter(function (i) { return i.s.official; }).length;
    var h = summaryStrip([[items.length, 'sources'], [off, 'official'], [items.length - off, 'unofficial']]);
    h += '<div class="rows">';
    items.forEach(function (i) { h += sourceRow(i.c, i.s, { country: true, terse: true }); });
    h += '</div>';
    el.innerHTML = h;
  }

  /* ---- country record ----------------------------------------------------- */

  function openCountry(code) {
    var c = BY_CODE[code];
    if (!c) return;
    document.getElementById('dtFlag').textContent = c.flag || '';
    document.getElementById('dtName').textContent = c.name;
    document.getElementById('dtNative').textContent =
      [c.nativeName, TRADITION_LABEL[c.tradition] || c.tradition, (c.languages || []).join(', ')]
        .filter(Boolean).join(' · ');

    var h = '';

    h += '<div class="sec"><div class="sec-h">' + TT('How law is made and published') + '</div>' +
         '<p class="sec-p">' + esc(c.summary) + '</p></div>';

    if (c.hierarchy && c.hierarchy.length) {
      h += '<div class="sec"><div class="sec-h">' + TT('Hierarchy of norms') + '</div><div class="ladder">';
      c.hierarchy.forEach(function (n, i) {
        /* the bar shortens as authority descends — the ladder IS the fact */
        var w = Math.max(10, 92 - i * (72 / Math.max(1, c.hierarchy.length - 1)));
        h += '<div class="rung"><span class="n">' + (i + 1) + '</span>' +
             '<span class="bar" style="width:' + w.toFixed(0) + 'px"></span>' +
             '<span>' + esc(n) + '</span></div>';
      });
      h += '</div></div>';
    }

    if (c.gazette) {
      h += '<div class="sec"><div class="sec-h">' + TT('Gazette of record') + '</div><div class="rows">' +
           sourceRow(c, c.gazette, {}) + '</div></div>';
    }
    if (c.constitution) {
      h += '<div class="sec"><div class="sec-h">' + TT('Constitution') + '</div><div class="rows">' +
           sourceRow(c, c.constitution, {}) + '</div></div>';
    }

    if (c.findLaw && c.findLaw.length) {
      h += '<div class="sec"><div class="sec-h">' + TT('Looking something up') + '</div><div class="rows">';
      c.findLaw.forEach(function (f) {
        h += '<div class="recipe"><div class="rc-task">' + esc(f.task) + '</div>' +
             '<div class="rc-steps">' + esc(f.steps) + '</div><div class="rc-foot">';
        if (f.source) h += '<span>' + esc(f.source) + '</span>';
        if (f.url) {
          h += '<a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.url) + '</a>';
        }
        h += '</div></div>';
      });
      h += '</div></div>';
    }

    /* the rest of the sources, grouped by kind so the list reads as a shelf
       rather than as an undifferentiated pile of links */
    var rest = c.sources || [];
    if (rest.length) {
      var order = ['consolidated', 'codes', 'legislature', 'courts', 'caselaw', 'regulations',
                   'treaties', 'subnational', 'translation', 'gazette', 'constitution', 'research'];
      var groups = {};
      rest.forEach(function (s) { (groups[s.kind] || (groups[s.kind] = [])).push(s); });
      var keys = Object.keys(groups).sort(function (a, b) {
        var ia = order.indexOf(a), ib = order.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      h += '<div class="sec"><div class="sec-h">' + TT('Everything else') + '</div>';
      keys.forEach(function (k) {
        h += '<div class="kindgrp">' + TT(KIND_LABEL[k] || k) + '</div><div class="rows">';
        groups[k].forEach(function (s) { h += sourceRow(c, s, {}); });
        h += '</div>';
      });
      h += '</div>';
    }

    if (c.subnational) {
      h += '<div class="sec"><div class="sec-h">' + TT('State, province and local law') + '</div>' +
           '<p class="sec-p">' + esc(c.subnational) + '</p></div>';
    }
    if (c.caveats) {
      h += '<div class="caveat"><b>' + TT('What is not authoritative') + '</b>' + esc(c.caveats) + '</div>';
    }

    document.getElementById('dtBody').innerHTML = h;
    document.getElementById('dtBody').scrollTop = 0;
    var dlg = document.getElementById('detail');
    if (!dlg.open) dlg.showModal();
    if (location.hash.indexOf('c=' + code) < 0) history.replaceState(null, '', '#c=' + code);
  }

  /* ---- routing ------------------------------------------------------------ */

  var PANELS = ['atlas', 'gazette', 'charter', 'find', 'all'];

  function setPanel(name) {
    if (PANELS.indexOf(name) < 0) name = 'atlas';
    PANEL = name;
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.dataset.panel === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'p-' + name);
    });
    render();
    /* the panels share one scroll position now that the page itself scrolls;
       land at the top of the new one rather than halfway down the old list */
    if (window.scrollY > 0) window.scrollTo(0, 0);
  }

  function readHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    if (h.indexOf('c=') === 0) { openCountry(h.slice(2)); return; }
    if (PANELS.indexOf(h) >= 0) setPanel(h);
    else if (BY_CODE[h]) openCountry(h);
  }

  /* ---- render ------------------------------------------------------------- */

  function render() {
    if (!COUNTRIES.length) return;
    renderChips();
    if (PANEL === 'atlas') renderAtlas();
    else if (PANEL === 'gazette') {
      renderOneEach('p-gazette', function (c) { return c.gazette; },
                    TT('No gazette matches.'));
    } else if (PANEL === 'charter') {
      renderOneEach('p-charter', function (c) { return c.constitution; },
                    TT('No constitution matches.'));
    } else if (PANEL === 'find') renderFind();
    else renderAll();
  }

  /* ---- wiring ------------------------------------------------------------- */

  function boot() {
    document.getElementById('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.tab');
      if (!b) return;
      setPanel(b.dataset.panel);
      history.replaceState(null, '', '#' + b.dataset.panel);
    });

    document.getElementById('chips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      var f = FILTER[PANEL] || (FILTER[PANEL] = {});
      var k = b.dataset.chip, v = b.dataset.val;
      f[k] = (f[k] === v) ? null : v;   // chips are radio-per-facet, click again to clear
      render();
    });

    /* one delegated listener on the whole page: cards and the country code in a
       source row both open the record, and both are re-created on every render */
    document.body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-open]');
      if (b) openCountry(b.dataset.open);
    });

    var dlg = document.getElementById('detail');
    document.getElementById('dtClose').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      if (location.hash.indexOf('#c=') === 0) history.replaceState(null, '', '#' + PANEL);
    });

    window.addEventListener('hashchange', readHash);
    load();
  }

  /* i18n.js re-renders through this on every fleet language switch. */
  window.LAW = { render: render };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
