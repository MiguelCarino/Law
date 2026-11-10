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
  var UPDATED = '';            // data/index.json "updated": the fallback checked date
  var SHOWN = 0;               // entries the current panel rendered, for "N shown"

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

  /* A load error names the file in an alert above the panels; the panels
     themselves stay empty rather than pretending there is nothing to show. */
  function fail(file) {
    var el = document.getElementById('loadErr');
    el.innerHTML = esc(TT('Could not load')) + ' <code>' + esc(file) + '</code>. ' +
      esc(TT('Serve this folder over http:// or check that the data/ directory is intact.')) +
      ' <code>python3 -m http.server</code>';
    el.hidden = false;
    document.getElementById('chips').hidden = true;
  }

  /* One country per file, fetched in parallel. A file that 404s or fails to
     parse is SKIPPED rather than fatal — a half-added country should cost you
     that country, not the whole site. Only a missing index.json, or every
     country failing at once, is treated as a broken deployment. */
  function load() {
    return fetch('data/index.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('data/index.json'); return r.json(); })
      .then(function (idx) {
        UPDATED = idx.updated || '';
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
        if (!COUNTRIES.length) throw new Error('data/countries/*.json');
        COUNTRIES.forEach(function (c) { BY_CODE[c.code] = c; });
        render();
        readHash();
      })
      .catch(function (e) {
        fail(e && /^data\//.test(e.message) ? e.message : 'data/index.json');
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

  function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }

  /* "Source: domain ↗ · checked YYYY-MM" (carino-ui.css .src-line). The date is
     the record's own `updated`, falling back to the index's. */
  function srcLine(url, c) {
    var when = (c && c.updated) || UPDATED;
    return '<div class="src-line"><span>' + TT('Source:') + '</span><a href="' + esc(url) +
      '" target="_blank" rel="noopener noreferrer">' + esc(domain(url)) + ' ↗</a>' +
      (when ? '<span class="src-date">' + TT('checked') + ' ' + esc(when) + '</span>' : '') + '</div>';
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
    h += srcLine(s.url, c);
    h += '</div>';
    return h;
  }

  /* a lookup recipe names its source in prose; the link is its source line */
  function recipeFoot(c, f) {
    var h = f.source ? '<div class="r-facts">' + esc(f.source) + '</div>' : '';
    return h + (f.url ? srcLine(f.url, c) : '');
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

  function chip(facet, val, on, label) {
    return '<button type="button" class="fchip' + (on ? ' active' : '') + '" aria-pressed="' + (on ? 'true' : 'false') +
      '" data-chip="' + facet + '" data-val="' + esc(val) + '">' + label + '</button>';
  }

  /* carino-ui.css .fchips: facets, then Clear once any chip is on, then the
     count of what the panel shows. */
  function renderChips() {
    var host = document.getElementById('chips');
    var f = FILTER[PANEL] || (FILTER[PANEL] = {});
    var h = '';

    if (PANEL === 'all') {
      h += '<span class="fchip-lbl">' + TT('kind') + '</span>';
      kinds().forEach(function (k) { h += chip('kind', k, f.kind === k, TT(KIND_LABEL[k] || k)); });
      h += '<span class="fchip-sep"></span>';
      h += chip('official', '1', !!f.official, TT('official only'));
    } else {
      h += '<span class="fchip-lbl">' + TT('region') + '</span>';
      regions().forEach(function (r) { h += chip('region', r, f.region === r, TT(r)); });
      if (PANEL === 'atlas') {
        h += '<span class="fchip-sep"></span><span class="fchip-lbl">' + TT('tradition') + '</span>';
        /* read off the data: hand-listing three traditions silently made the
           socialist-civil and religious-mixed countries unfilterable */
        traditions().forEach(function (t) { h += chip('tradition', t, f.tradition === t, TT(TRADITION_LABEL[t] || t)); });
      }
    }
    if (anyOn()) {
      h += '<span class="fchip-sep"></span><button type="button" class="fchip clear" data-clear="1">' + TT('Clear') + '</button>';
    }
    h += '<span class="fchips-count">' + SHOWN + ' ' + TT('shown') + '</span>';
    host.innerHTML = h;
  }

  function anyOn() {
    var f = FILTER[PANEL] || {};
    return Object.keys(f).some(function (k) { return f[k]; });
  }

  function emptyMsg() {
    SHOWN = 0;
    return '<div class="empty">' + TT('Nothing matches these filters.') +
      '<button type="button" class="fchip clear" data-clear="1">' + TT('Clear filters') + '</button></div>';
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
    if (!list.length) { el.innerHTML = emptyMsg(); return; }
    SHOWN = list.length;

    var nSrc = 0;
    COUNTRIES.forEach(function (c) { nSrc += allSources(c).length; });

    var h = summaryStrip([[COUNTRIES.length, 'countries'], [nSrc, 'sources']]);
    h += '<div class="cgrid">';
    list.forEach(function (c) {
      var g = c.gazette || {};
      /* carino-ui.css .card.entry. The whole card opens the record (the body
         listener below skips its source link); the name is the keyboard target. */
      h += '<article class="card entry" data-open="' + esc(c.code) + '">';
      h += '<div class="cc-top"><span class="cc-flag">' + esc(c.flag || '') + '</span>';
      h += '<span class="cc-names"><button type="button" class="e-open e-title" data-open="' + esc(c.code) + '">' +
           esc(c.name) + '</button>';
      /* Canada's native name IS "Canada" — printing it twice reads as a bug */
      var nn = (c.nativeName && c.nativeName !== c.name) ? c.nativeName : '';
      h += '<span class="e-sub">' + esc(nn) + '</span></span>';
      h += '<span class="cc-iso">' + esc(c.iso) + '</span></div>';
      h += '<p class="e-desc">' + esc(c.traditionNote || c.summary || '') + '</p>';
      if (g.name) {
        h += '<div class="cc-gaz">' + TT('gazette') + ' <b>' + esc(g.native || g.name) + '</b></div>';
      }
      h += '<div class="e-badges"><span class="badge b-kind ct-cat-' + ({ civil: 'purple', common: 'teal', mixed: 'amber', 'religious-mixed': 'pink', 'socialist-civil': 'grey' }[c.tradition] || 'grey') + '">' +
           TT(TRADITION_LABEL[c.tradition] || c.tradition || '') + '</span>';
      h += '<span class="badge b-unofficial">' + allSources(c).length + ' ' + TT('sources') + '</span></div>';
      if (g.url) h += srcLine(g.url, c);
      h += '</article>';
    });
    h += '</div>';
    el.innerHTML = h;
  }

  function renderOneEach(panelId, pick) {
    var el = document.getElementById(panelId);
    var rows = [];
    COUNTRIES.forEach(function (c) {
      if (!passRegion(c)) return;
      var s = pick(c);
      if (!s) return;
      rows.push({ c: c, s: s });
    });
    if (!rows.length) { el.innerHTML = emptyMsg(); return; }
    SHOWN = rows.length;

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
    if (!items.length) { el.innerHTML = emptyMsg(); return; }
    SHOWN = items.length;

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
      h += recipeFoot(it.c, it.f) + '</div>';
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
    if (!items.length) { el.innerHTML = emptyMsg(); return; }
    SHOWN = items.length;

    var off = items.filter(function (i) { return i.s.official; }).length;
    var h = summaryStrip([[items.length, 'sources'], [off, 'official'], [items.length - off, 'unofficial']]);
    h += '<div class="rows">';
    items.forEach(function (i) { h += sourceRow(i.c, i.s, { country: true, terse: true }); });
    h += '</div>';
    el.innerHTML = h;
  }

  /* ---- country record ----------------------------------------------------- */

  var OPEN_CODE = null;   // country whose record is in the dialog, for language re-renders

  function openCountry(code, keepScroll) {
    var c = BY_CODE[code];
    if (!c) return;
    OPEN_CODE = code;
    document.getElementById('dtFlag').textContent = c.flag || '';
    document.getElementById('dtName').textContent = c.name;
    document.getElementById('dtNative').textContent =
      [c.nativeName, TT(TRADITION_LABEL[c.tradition] || c.tradition || ''), (c.languages || []).join(', ')]
        .filter(Boolean).join(' · ');
    var when = c.updated || UPDATED;
    document.getElementById('dtChecked').textContent = when ? TT('checked') + ' ' + when : '';

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
             '<div class="rc-steps">' + esc(f.steps) + '</div>' + recipeFoot(c, f) + '</div>';
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
      h += '<div class="alert warn caveat"><b>' + TT('What is not authoritative') + '</b>' + esc(c.caveats) + '</div>';
    }

    var body = document.getElementById('dtBody');
    var top = body.scrollTop;
    body.innerHTML = h;
    body.scrollTop = keepScroll ? top : 0;
    var dlg = document.getElementById('detail');
    if (!dlg.open) dlg.showModal();
    document.body.classList.add('detail-open');
    if (location.hash.indexOf('c=' + code) < 0) history.replaceState(null, '', '#c=' + code);
    // a preview over the record shows that record: another country (hash, Back) rebuilds it
    if (RP.code && RP.code !== code && document.getElementById('rpDialog').open) rpRefresh();
  }

  /* ---- print preview -------------------------------------------------------
     Print on a record does not print the page: it opens the preview, whose
     frame holds the very document that prints (recordSheetHtml) laid out at
     the paper's printable width on a white sheet, with a dashed line where
     each page should end. The frame's own Print prints that document; the ✕
     drops it. The page's @media print sheet still serves Ctrl+P. */

  var MM = 96 / 25.4;                       // CSS px per millimetre
  var SHEET_MARGIN_MM = 15;
  /* The source-kind badge as plain rgba: index.html draws it with
     color-mix(), which the PDF's html2canvas cannot read ("unsupported color
     function"), so Download PDF failed on every record. The sheet loads
     carino-ui.css without a theme, so --info there is always #38bdf8 and
     these are the same colours. */
  var SHEET_FLAT_COLOURS = '.b-kind{border-color:rgba(56,189,248,.35);background:rgba(56,189,248,.07);}';
  var PAPER = {                             // printable box = paper minus the @page margins
    a4:     { css: 'A4',     w: 210,   h: 297 },
    letter: { css: 'letter', w: 215.9, h: 279.4 }
  };
  var RP = { code: null, paper: null, back: null, seq: 0, title: '', format: null, busy: false };

  /* Carta/Letter where it is the office paper, A4 everywhere else; a choice
     made in the dialog is remembered on this device only. */
  function defaultPaper() {
    try { var p = localStorage.getItem('law-paper'); if (PAPER[p]) return p; } catch (e) {}
    var lang = (navigator.language || '').toUpperCase();
    var region = lang.split('-')[1] || '';
    return /^(US|CA|MX|PH|CO|VE|CL|CR|GT|PA|DO|PR|SV|NI|HN)$/.test(region) ? 'letter' : 'a4';
  }
  function paperBox(p) {
    var d = PAPER[p] || PAPER.a4;
    return { w: (d.w - 2 * SHEET_MARGIN_MM) * MM, h: (d.h - 2 * SHEET_MARGIN_MM) * MM,
             m: SHEET_MARGIN_MM * MM, css: d.css };
  }

  /* What the record sheet adds to the print look: the paper and its margins,
     and on screen a white sheet over grey. In the preview the sheet is the
     paper's printable width with a dashed line where each page should end;
     in a saved HTML file (forFile) it is at most that wide, so the file reads
     on a phone too. Pure: tests/sheet.test.mjs loads it on its own. */
  function rpSheetCss(box, marginMm, forFile) {
    var w = box.w.toFixed(1) + 'px', m = box.m.toFixed(1) + 'px';
    return '@page{size:' + box.css + ';margin:' + marginMm + 'mm;}' +
      'body{margin:0;min-height:0;}' +
      '@media screen{html{background:#d6d8dc;}' +
        (forFile
          ? 'body{box-sizing:content-box;max-width:' + w + ';padding:' + m + ';' +
            'margin:16px auto 24px;box-shadow:0 1px 6px rgba(0,0,0,.28);}' +
            '@media (max-width:' + Math.ceil(box.w + 2 * box.m + 32) + 'px){body{padding:16px;margin:0;box-shadow:none;}' +
              /* long addresses in the how-to text would push a phone sideways */
              '.law-sheet{overflow-wrap:anywhere;}}}'
          : 'body{box-sizing:content-box;width:' + w + ';padding:' + m + ';' +
            'margin:16px auto 24px;position:relative;box-shadow:0 1px 6px rgba(0,0,0,.28);}' +
            '.rp-break{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed #9aa0a8;pointer-events:none;}' +
            '.rp-break span{position:absolute;left:8px;top:3px;font:10px \'IBM Plex Mono\',monospace;color:#6b7280;}}' +
            '@media print{.rp-break{display:none !important;}}');
  }

  /* The record sheet: the record as the dialog shows it (head + body, without
     its buttons), Law's own stylesheet, and the light print look applied on
     every medium, so the preview and the paper are one document. forFile:
     the same document for Download, without the preview's page-end lines. */
  function recordSheetHtml(code, paper, forFile) {
    var c = BY_CODE[code];
    var head = document.querySelector('#detail .modal-head').cloneNode(true);
    head.querySelectorAll('button').forEach(function (b) { b.remove(); });
    head.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    var body = document.getElementById('dtBody').innerHTML;
    var lawCss = (document.getElementById('lawStyle') || {}).textContent || '';
    var abs = function (u) { return esc(new URL(u, document.baseURI).href); };
    var box = paperBox(paper);
    var lang = (window.CarinoLang && window.CarinoLang.current) || document.documentElement.lang || 'en';
    RP.title = 'Carino Law — ' + c.name;
    /* the print look is the page's own #lawPrint (index.html), applied here on
       every medium; only the paper size and the on-screen sheet are added */
    var printCss = (document.getElementById('lawPrint') || {}).textContent || '';
    var sheet = printCss + SHEET_FLAT_COLOURS + rpSheetCss(box, SHEET_MARGIN_MM, forFile);
    return '<!DOCTYPE html><html lang="' + esc(lang) + '"><head><meta charset="UTF-8">' +
      '<title>' + esc(RP.title) + '</title>' +
      '<link rel="stylesheet" href="' + abs('fonts/carino-fonts.css') + '">' +
      '<link rel="stylesheet" href="' + abs('carino-ui.css') + '">' +
      '<style>' + lawCss + '</style><style>' + sheet + '</style></head>' +
      '<body><div id="detail" class="modal law-sheet"><div class="modal-head">' + head.innerHTML + '</div>' +
      '<div class="modal-body">' + body + '</div></div></body></html>';
  }

  /* Where the pages should end: every printable-height step, pulled up to the
     top of a source row, recipe or caveat it would cut (they are break-inside:
     avoid). The print dialog paginates for itself, so this is an estimate. */
  function sheetBreaks(d, box) {
    var r = d.body.getBoundingClientRect();
    var top0 = r.top + box.m, total = r.height - 2 * box.m;
    var blocks = Array.prototype.map.call(d.querySelectorAll('.row,.recipe,.alert'), function (el) {
      var b = el.getBoundingClientRect();
      return [b.top - top0, b.bottom - top0];
    });
    var cuts = [], at = 0;
    while (at + box.h < total - 1 && cuts.length < 200) {
      var cut = at + box.h;
      blocks.forEach(function (b) {
        if (b[0] > at && b[0] < cut && b[1] > cut && b[1] - b[0] <= box.h) cut = Math.min(cut, b[0]);
      });
      cuts.push(cut);
      at = cut;
    }
    return cuts;
  }

  function rpPageSize(css) {
    var st = document.getElementById('rpPageSize');
    if (!css) { if (st) st.remove(); return; }
    if (!st) {
      st = document.createElement('style');
      st.id = 'rpPageSize';
      st.media = 'print';
      document.head.appendChild(st);
    }
    st.textContent = '@page{size:' + css + ';}';
  }

  function rpStatus(s) { document.getElementById('rpStatus').textContent = s || ''; }

  /* ---- the file: PDF or HTML (carino-pdf.js) ------------------------------
     Download saves the record sheet the preview shows, as the File switch
     says: a PDF drawn from it on the paper chosen here, or the sheet as one
     standalone HTML page. Its stylesheets are written into it first, so the
     PDF is drawn with them loaded and the HTML opens offline. */
  function rpPdf() { return window.CarinoPdf || null; }
  function rpFormat() { return RP.format ? RP.format.get() : 'pdf'; }
  function rpEnsureSwitch() {
    if (RP.format || !rpPdf()) return;
    RP.format = rpPdf().formatSwitch({ onChange: rpShowName });
    var name = document.getElementById('rpName');
    name.parentNode.insertBefore(RP.format.el, name);
  }
  function rpShowName() {
    var lib = rpPdf();
    var el = document.getElementById('rpName');
    el.textContent = RP.title && RP.code ? (lib ? lib.fileName(RP.title, rpFormat()) : RP.title) : '';
    el.title = el.textContent;
    var dl = document.getElementById('rpDownload');
    dl.textContent = lib ? lib.label(rpFormat()) : TT('Download PDF');
    dl.hidden = !lib;
  }
  function rpReady(ready) {
    document.getElementById('rpPrint').disabled = !ready;
    document.getElementById('rpDownload').disabled = !ready || RP.busy;
  }
  function downloadFromPreview() {
    var lib = rpPdf();
    if (!lib || RP.busy || !RP.code || !BY_CODE[RP.code]) return;
    var seq = RP.seq, format = rpFormat(), title = RP.title;
    var d = PAPER[RP.paper] || PAPER.a4;
    var html = recordSheetHtml(RP.code, RP.paper, true);
    var status = document.getElementById('rpStatus').textContent;
    RP.busy = true;
    rpReady(true);
    if (format === 'pdf') rpStatus(TT('Creating the PDF…'));
    var made = lib.htmlFile(html).then(function (file) {
      return lib.download({
        html: file, name: title, format: format, title: title,
        page: { w: d.w, h: d.h, margin: [SHEET_MARGIN_MM, SHEET_MARGIN_MM, SHEET_MARGIN_MM, SHEET_MARGIN_MM] },
        producer: 'Carino Law · law.carino.systems'
      });
    });
    return made.catch(function (e) { return { ok: false, error: String(e) }; }).then(function (r) {
      RP.busy = false;
      if (seq !== RP.seq) return;           // closed or rebuilt meanwhile
      rpReady(true);
      if (r.ok) rpStatus(status);
      else rpStatus(TT(format === 'pdf' ? 'Could not create the PDF.' : 'Could not create the HTML file.'));
    });
  }

  function rpPaperChips() {
    document.querySelectorAll('#rpDialog [data-paper]').forEach(function (b) {
      b.checked = b.dataset.paper === RP.paper;
    });
  }

  /* A stage narrower than a sheet shows the sheet scaled down, as it will
     print, rather than the record reflowed to a phone's width. Only the frame
     element is scaled; the document it prints is untouched. */
  function rpFit() {
    var frame = document.getElementById('rpFrame'), stage = document.getElementById('rpStage');
    frame.style.width = ''; frame.style.height = ''; frame.style.transform = ''; frame.style.transformOrigin = '';
    var page = paperBox(RP.paper).w + 2 * paperBox(RP.paper).m + 32;   // the sheet and the grey around it
    var w = stage.clientWidth;
    if (!w || w >= page) return;
    var k = w / page;
    frame.style.width = Math.ceil(page) + 'px';
    frame.style.height = Math.round(stage.clientHeight / k) + 'px';
    frame.style.transform = 'scale(' + k + ')';
    frame.style.transformOrigin = '0 0';
  }

  function rpRefresh() {
    if (!RP.code) return;
    RP.code = OPEN_CODE;                    // the sheet is the record the dialog holds now
    if (!RP.code || !BY_CODE[RP.code]) { document.getElementById('rpDialog').close(); return; }
    var seq = ++RP.seq;
    var frame = document.getElementById('rpFrame');
    rpReady(false);
    rpStatus('');
    rpPaperChips();
    frame.title = TT('Print preview');
    var html = recordSheetHtml(RP.code, RP.paper);
    rpEnsureSwitch();
    if (RP.format) RP.format.relabel();
    rpShowName();
    rpPageSize(paperBox(RP.paper).css);
    /* the frame takes its final width before the sheet lays out: measured at
       the stage's phone width, Law's max-width rules would apply inside it and
       the page lines would not match the sheet shown and printed */
    rpFit();
    var shown = false;
    var after = function (late) {
      if (shown || seq !== RP.seq) return;
      var d = frame.contentDocument;
      /* the fallback timer measures only a sheet that has loaded; otherwise
         the load event still to come does it */
      if (late && !(d && d.readyState === 'complete' && d.querySelector('.law-sheet'))) return;
      shown = true;
      frame.onload = null;
      /* Esc in the sheet (focus moves there on a click or after printing)
         never reaches the dialog; close it from here */
      d.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        document.getElementById('rpDialog').close();
      });
      var measure = function () {
        if (seq !== RP.seq) return;
        var pages = 0;
        try {
          var box = paperBox(RP.paper);
          var cuts = sheetBreaks(d, box);
          pages = cuts.length + 1;
          cuts.forEach(function (y, i) {
            var line = d.createElement('div');
            line.className = 'rp-break';
            line.style.top = (box.m + y).toFixed(1) + 'px';
            var tag = d.createElement('span');
            tag.textContent = TT('Page {n}').replace('{n}', i + 2);
            line.appendChild(tag);
            d.body.appendChild(line);
          });
        } catch (e) { console.warn('Print preview: could not measure the pages.', e); }
        rpFit();
        rpStatus(pages ? '≈ ' + (pages === 1 ? TT('1 page') : TT('{n} pages').replace('{n}', pages)) : '');
        rpReady(true);
      };
      if (d && d.fonts && d.fonts.ready) d.fonts.ready.then(measure, measure);
      else measure();
    };
    frame.onload = function () { after(false); };
    setTimeout(function () { after(true); }, 5000);   // a frame that never says it loaded
    frame.srcdoc = html;
  }

  function openPrintPreview() {
    if (!OPEN_CODE) return;
    var dlg = document.getElementById('rpDialog');
    RP.code = OPEN_CODE;
    RP.paper = RP.paper || defaultPaper();
    RP.back = document.activeElement;
    if (!dlg.open) dlg.showModal();
    document.getElementById('rpClose').focus();
    rpRefresh();
  }

  /* Close (the ✕, Esc, the scrim) drops the preview; nothing is kept. */
  function dropPrintPreview() {
    RP.seq++;
    RP.code = null;
    var frame = document.getElementById('rpFrame');
    frame.onload = null;
    frame.removeAttribute('srcdoc');
    rpFit();
    document.getElementById('rpName').textContent = '';
    rpStatus('');
    rpReady(false);
    rpPageSize(null);
    var back = RP.back;
    RP.back = null;
    try { if (back && back.isConnected) back.focus(); } catch (e) {}
  }

  function printFromPreview() {
    var frame = document.getElementById('rpFrame');
    if (!RP.code || !frame.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    document.getElementById('rpPrint').focus();   // so Esc and Tab work on the dialog again
  }

  function wirePrintPreview() {
    var dlg = document.getElementById('rpDialog');
    document.getElementById('dtPrint').addEventListener('click', openPrintPreview);
    document.getElementById('rpClose').addEventListener('click', function () { dlg.close(); });
    document.getElementById('rpPrint').addEventListener('click', printFromPreview);
    document.getElementById('rpDownload').addEventListener('click', downloadFromPreview);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();     // the scrim around the box
    });
    dlg.addEventListener('change', function (e) {
      var p = e.target.closest('[data-paper]');
      if (!p || !p.checked || p.dataset.paper === RP.paper) return;
      RP.paper = p.dataset.paper;
      try { localStorage.setItem('law-paper', RP.paper); } catch (err) {}
      rpRefresh();
    });
    dlg.addEventListener('close', dropPrintPreview);
    window.addEventListener('resize', function () { if (dlg.open) rpFit(); });
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

  /* hero stats and the footer line read the data, so they follow the language */
  function renderMeta() {
    var nSrc = 0;
    COUNTRIES.forEach(function (c) { nSrc += allSources(c).length; });
    document.getElementById('heroStats').textContent = COUNTRIES.length + ' ' + TT('countries') + ' · ' +
      nSrc + ' ' + TT('sources') + (UPDATED ? ' · ' + TT('reviewed') + ' ' + UPDATED : '');
    document.getElementById('footLine').textContent =
      TT('Runs entirely in your browser. Every entry links to its source; checked {date}.').replace('{date}', UPDATED);
  }

  function render() {
    if (!COUNTRIES.length) return;
    renderMeta();
    if (PANEL === 'atlas') renderAtlas();
    else if (PANEL === 'gazette') {
      renderOneEach('p-gazette', function (c) { return c.gazette; });
    } else if (PANEL === 'charter') {
      renderOneEach('p-charter', function (c) { return c.constitution; });
    } else if (PANEL === 'find') renderFind();
    else renderAll();
    renderChips();   // after the panel, so the count is the one just drawn
    // an open country record is redrawn too, so a language switch reaches all of it
    if (OPEN_CODE && document.getElementById('detail').open) openCountry(OPEN_CODE, true);
    // and so is a print preview over it, which shows that record
    if (RP.code && document.getElementById('rpDialog').open) rpRefresh();
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
      var b = e.target.closest('.fchip');
      if (!b || b.dataset.clear) return;
      var f = FILTER[PANEL] || (FILTER[PANEL] = {});
      var k = b.dataset.chip, v = b.dataset.val;
      f[k] = (f[k] === v) ? null : v;   // chips are radio-per-facet, click again to clear
      render();
    });

    /* one delegated listener on the whole page: cards and the country code in a
       source row both open the record, and both are re-created on every render */
    document.body.addEventListener('click', function (e) {
      var c = e.target.closest('[data-clear]');
      if (c) { FILTER[PANEL] = {}; render(); return; }
      if (e.target.closest('a')) return;   // a card's source link opens the source, not the record
      var b = e.target.closest('[data-open]');
      if (b) openCountry(b.dataset.open);
    });
    wirePrintPreview();

    var dlg = document.getElementById('detail');
    document.getElementById('dtClose').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      OPEN_CODE = null;
      document.body.classList.remove('detail-open');
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
