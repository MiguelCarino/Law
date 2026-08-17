#!/usr/bin/env python3
"""Schema + vocabulary check over data/countries/*.json.

The site renders these files straight into the DOM with no defaulting and no
repair, so a missing key is a blank card and a stray "kind" is a chip that
filters to nothing. This catches both before anyone sees them.

    python3 tools/validate.py            # check every country in data/index.json
    python3 tools/validate.py mx fr      # check two

Exit 0 clean, 1 if anything failed. Warnings do not fail the run — they are
thinness, not breakage.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

TOP_KEYS = ['code', 'iso', 'name', 'nativeName', 'flag', 'region', 'tradition',
            'traditionNote', 'languages', 'summary', 'hierarchy', 'gazette',
            'constitution', 'sources', 'findLaw', 'subnational', 'caveats', 'updated']

SRC_KEYS = ['id', 'name', 'native', 'en', 'url', 'kind', 'official', 'authority',
            'langs', 'access', 'coverage', 'desc', 'howto', 'formats', 'api', 'note']

KINDS = {'gazette', 'constitution', 'consolidated', 'legislature', 'courts', 'caselaw',
         'codes', 'treaties', 'regulations', 'subnational', 'translation', 'research'}
ACCESS = {'free', 'free-registration', 'partial-paywall', 'paywall'}
TRADITIONS = {'civil', 'common', 'mixed', 'socialist-civil', 'religious-mixed'}
REGIONS = {'North America', 'Latin America', 'Europe', 'Middle East', 'East Asia', 'Oceania'}

# app.js maps these to labels; anything outside them renders as the raw slug.
LABELLED = {'kind': KINDS, 'access': ACCESS}


def check_source(where, s, errs, warns, seen_ids):
    if not isinstance(s, dict):
        errs.append('%s is not an object' % where)
        return
    for k in SRC_KEYS:
        if k not in s:
            errs.append('%s missing key "%s"' % (where, k))
    for k in s:
        if k not in SRC_KEYS:
            warns.append('%s has extra key "%s"' % (where, k))

    if s.get('kind') not in KINDS:
        errs.append('%s kind=%r not in the vocabulary' % (where, s.get('kind')))
    if s.get('access') not in ACCESS:
        errs.append('%s access=%r not in the vocabulary' % (where, s.get('access')))
    if not isinstance(s.get('official'), bool):
        errs.append('%s official must be true/false, got %r' % (where, s.get('official')))

    url = s.get('url') or ''
    if not url.startswith('http'):
        errs.append('%s url is not an http(s) URL: %r' % (where, url))
    api = s.get('api')
    if api and not str(api).startswith('http'):
        errs.append('%s api is not a URL: %r' % (where, api))

    for k in ('name', 'desc', 'howto', 'authority', 'coverage'):
        if not (s.get(k) or '').strip():
            warns.append('%s "%s" is empty' % (where, k))

    for k in ('langs', 'formats'):
        if not isinstance(s.get(k), list) or not s.get(k):
            warns.append('%s "%s" should be a non-empty list' % (where, k))

    sid = s.get('id')
    if sid in seen_ids:
        errs.append('%s duplicate id "%s"' % (where, sid))
    seen_ids.add(sid)


def check_country(code, errs, warns):
    path = os.path.join(DATA, 'countries', code + '.json')
    if not os.path.exists(path):
        errs.append('%s: file missing (%s)' % (code, path))
        return 0
    try:
        with open(path, encoding='utf-8') as fh:
            c = json.load(fh)
    except (ValueError, UnicodeDecodeError) as e:
        errs.append('%s: not valid JSON — %s' % (code, e))
        return 0

    for k in TOP_KEYS:
        if k not in c:
            errs.append('%s: missing top-level key "%s"' % (code, k))
    for k in c:
        if k not in TOP_KEYS:
            warns.append('%s: extra top-level key "%s"' % (code, k))

    if c.get('code') != code:
        errs.append('%s: "code" is %r but the file is %s.json' % (code, c.get('code'), code))
    if not isinstance(c.get('iso'), str) or len(c.get('iso') or '') != 2:
        errs.append('%s: iso should be 2 letters, got %r' % (code, c.get('iso')))
    if c.get('iso', '').lower() != code:
        warns.append('%s: iso %r does not match the filename' % (code, c.get('iso')))
    if c.get('region') not in REGIONS:
        errs.append('%s: region=%r not in the vocabulary' % (code, c.get('region')))
    if c.get('tradition') not in TRADITIONS:
        errs.append('%s: tradition=%r not in the vocabulary' % (code, c.get('tradition')))
    if not c.get('flag'):
        warns.append('%s: no flag emoji' % code)

    seen_ids = set()
    n = 0
    for key in ('gazette', 'constitution'):
        s = c.get(key)
        if s is None:
            warns.append('%s: no %s — is that really true of this country?' % (code, key))
        else:
            check_source('%s.%s' % (code, key), s, errs, warns, seen_ids)
            n += 1

    srcs = c.get('sources')
    if not isinstance(srcs, list):
        errs.append('%s: sources is not a list' % code)
        srcs = []
    for i, s in enumerate(srcs):
        check_source('%s.sources[%d]' % (code, i), s, errs, warns, seen_ids)
    n += len(srcs)
    if n < 8:
        warns.append('%s: only %d sources — thin' % (code, n))

    fl = c.get('findLaw')
    if not isinstance(fl, list):
        errs.append('%s: findLaw is not a list' % code)
        fl = []
    for i, f in enumerate(fl):
        for k in ('task', 'steps', 'url', 'source'):
            if not (f.get(k) or '').strip():
                errs.append('%s.findLaw[%d] "%s" is empty' % (code, i, k))
    if len(fl) < 4:
        warns.append('%s: only %d findLaw entries — the point of the site is these' % (code, len(fl)))

    for k in ('summary', 'subnational', 'caveats', 'traditionNote'):
        if not (c.get(k) or '').strip():
            errs.append('%s: "%s" is empty' % (code, k))
    if not c.get('hierarchy'):
        errs.append('%s: "hierarchy" is empty' % code)

    print('  %-3s %-18s %2d sources  %d lookups' % (c.get('iso', '??'), c.get('name', '?')[:18], n, len(fl)))
    return n


def main():
    with open(os.path.join(DATA, 'index.json'), encoding='utf-8') as fh:
        codes = json.load(fh)['countries']
    if len(sys.argv) > 1:
        codes = sys.argv[1:]

    errs, warns = [], []
    print('checking %d countries' % len(codes))
    total = sum(check_country(code, errs, warns) for code in codes)

    print('\n%d sources across %d countries' % (total, len(codes)))
    if warns:
        print('\n%d warning(s):' % len(warns))
        for w in warns:
            print('  ! ' + w)
    if errs:
        print('\n%d ERROR(s):' % len(errs))
        for e in errs:
            print('  x ' + e)
        return 1
    print('\nschema OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
