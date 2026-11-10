// Record sheet tests: node --test tests/sheet.test.mjs
// app.js is one browser IIFE; the pure rpSheetCss() is cut out of it and run
// on its own. The preview's sheet and the saved HTML file share the paper and
// the margins; only the preview draws page-end lines and a fixed-width sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = src.indexOf('  function rpSheetCss(');
const end = src.indexOf('\n  }\n', start) + 4;
assert.ok(start > 0 && end > start, 'rpSheetCss is in app.js');
const rpSheetCss = new Function(src.slice(start, end) + '\nreturn rpSheetCss;')();

const MM = 96 / 25.4;
const box = (w, css) => ({ w: (w - 30) * MM, h: 0, m: 15 * MM, css });

test('preview and file carry the same paper size and margins', () => {
  for (const [w, css] of [[210, 'A4'], [215.9, 'letter']]) {
    for (const file of [false, true]) {
      const out = rpSheetCss(box(w, css), 15, file);
      assert.ok(out.startsWith('@page{size:' + css + ';margin:15mm;}'), out);
    }
  }
});

test('only the preview has page-end lines and a fixed sheet width', () => {
  const pv = rpSheetCss(box(210, 'A4'), 15, false);
  const file = rpSheetCss(box(210, 'A4'), 15, true);
  assert.match(pv, /\.rp-break\{/);
  assert.match(pv, /body\{box-sizing:content-box;width:/);
  assert.doesNotMatch(file, /rp-break/);
  assert.doesNotMatch(file, /[;{]width:/);
  assert.match(file, /max-width:/);
});

test('every on-screen rule sits in @media screen, so print and the PDF see none of it', () => {
  for (const file of [false, true]) {
    const out = rpSheetCss(box(210, 'A4'), 15, file);
    const i = out.indexOf('@media screen{');
    assert.ok(i > 0);
    // what comes before the screen block: the paper, and the plain body reset
    assert.equal(out.slice(0, i), '@page{size:A4;margin:15mm;}body{margin:0;min-height:0;}');
    const rest = out.slice(i);
    let depth = 0, close = -1;
    for (let k = 0; k < rest.length; k++) {
      if (rest[k] === '{') depth++;
      else if (rest[k] === '}' && --depth === 0) { close = k; break; }
    }
    const after = rest.slice(close + 1);
    assert.ok(after === '' || after === '@media print{.rp-break{display:none !important;}}', after);
  }
});
