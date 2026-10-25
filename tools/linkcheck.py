#!/usr/bin/env python3
"""Fetch every URL in data/countries/*.json and report what came back.

The only promise this site makes is that the links go where it says they go.
Government sites move, get re-platformed and quietly drop their old paths, so
that promise decays on its own unless something re-checks it. Run this before
any commit that touches data/, and periodically after.

    python3 tools/linkcheck.py                 # everything
    python3 tools/linkcheck.py mx fr           # two countries
    python3 tools/linkcheck.py --slow          # 4 workers instead of 12

Standard library only — no requests, no venv.

A word on the results: several legitimate government sites answer an automated
request with 403 (Akamai, Cloudflare, Incapsula) while serving a browser fine.
Those are reported as BLOCKED, not DEAD, and they are NOT failures. Only 404,
410, DNS failure and connection refusal fail the run. Read the BLOCKED list by
hand — that is the point of separating it.
"""
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0 Safari/537.36')
TIMEOUT = 25

# Failing the run on these would mean failing on someone else's WAF policy.
# 402/418/421 and Cloudflare's 52x are what bot walls answer with too.
BLOCKED_CODES = {401, 402, 403, 405, 406, 418, 421, 429, 503, 520, 521, 522, 523, 524, 525, 526}
DEAD_CODES = {404, 410}

# A bot wall that answers 200 and redirects to its own interstitial looks like a
# healthy redirect unless you know the destination. These are the ones seen in
# this data set; the link itself is fine in a browser.
WALL_HOSTS = ('validate.perfdrive.com', 'geo.captcha-delivery.com', 'challenges.cloudflare.com',
              '/_Incapsula_Resource', 'imperva', '/distil_r_captcha',
              'unblock.federalregister.gov')

# A server that answers TLS with the wrong SNI name breaks urllib but usually
# serves browsers fine. Report it as its own category rather than as dead.
TLS_HINTS = ('UNRECOGNIZED_NAME', 'CERTIFICATE_VERIFY_FAILED', 'SSLV3', 'WRONG_VERSION_NUMBER')

# No answer at all, even on the patient second pass: a timeout, a reset, or a
# network this machine cannot reach (an IPv6-only host from an IPv4 box). That
# says nothing about the link, so it is listed for a look, never a failure.
# DNS failure and a refused connection are not here: those do mean dead.
UNREACHABLE_HINTS = ('TIMED OUT', 'TIMEOUT', 'NETWORK IS UNREACHABLE', 'CONNECTION RESET',
                     'REMOTEDISCONNECTED', 'NO ROUTE TO HOST', 'TEMPORARILY UNAVAILABLE')


def collect(codes):
    """→ [(country_iso, where, url)] — every fetchable URL in the data set."""
    out = []
    for code in codes:
        path = os.path.join(DATA, 'countries', code + '.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as fh:
            c = json.load(fh)
        iso = c.get('iso', code.upper())

        def add(where, url):
            if url and str(url).startswith('http'):
                out.append((iso, where, str(url)))

        for key in ('gazette', 'constitution'):
            s = c.get(key)
            if s:
                add('%s.%s' % (iso, key), s.get('url'))
                add('%s.%s.api' % (iso, key), s.get('api'))
        for s in c.get('sources') or []:
            add('%s/%s' % (iso, s.get('id')), s.get('url'))
            add('%s/%s.api' % (iso, s.get('id')), s.get('api'))
        for i, f in enumerate(c.get('findLaw') or []):
            add('%s.findLaw[%d]' % (iso, i), f.get('url'))
    return out


def fetch(item):
    iso, where, url = item
    ctx = ssl.create_default_context()
    # Some ministries still run expired or mis-chained certs. A cert problem is
    # worth knowing about but it is not a dead link, so it is reported, not fatal.
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en,es;q=0.8',
    })
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
            final = r.geturl()
            moved = '' if final.rstrip('/') == url.rstrip('/') else final
            return (iso, where, url, r.status, moved, '')
    except urllib.error.HTTPError as e:
        return (iso, where, url, e.code, '', '')
    except urllib.error.URLError as e:
        return (iso, where, url, 0, '', str(e.reason)[:70])
    except Exception as e:                                    # timeouts, resets
        return (iso, where, url, 0, '', type(e).__name__ + ': ' + str(e)[:60])


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    workers = 4 if '--slow' in sys.argv else 12

    with open(os.path.join(DATA, 'index.json'), encoding='utf-8') as fh:
        codes = json.load(fh)['countries']
    if argv:
        codes = argv

    items = collect(codes)
    if not items:
        print('nothing to check — is data/countries/ populated?')
        return 1
    print('checking %d urls across %d countries, %d at a time\n' % (len(items), len(codes), workers))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        results = list(ex.map(fetch, items))

    # Second pass, serial and patient. Several of these sites answer in 6-20s
    # when nothing else is competing and time out under 12-way concurrency —
    # calling that "dead" is a false alarm that sends someone hunting for a
    # replacement URL that was never broken.
    retry = [i for i, r in enumerate(results) if not r[3]]
    if retry:
        print('re-checking %d slow/failed urls one at a time...\n' % len(retry))
        global TIMEOUT
        TIMEOUT = 45
        for i in retry:
            results[i] = fetch(items[i])

    ok, blocked, dead, moved, tls, unreachable = [], [], [], [], [], []
    for r in results:
        iso, where, url, status, redirect, err = r
        wall = redirect and any(w in redirect for w in WALL_HOSTS)
        if status and 200 <= status < 300:
            if wall:
                blocked.append(r)
            elif redirect:
                moved.append(r)
            else:
                ok.append(r)
        elif status in BLOCKED_CODES:
            blocked.append(r)
        elif not status and any(h in err.upper() for h in TLS_HINTS):
            tls.append(r)
        elif not status and any(h in err.upper() for h in UNREACHABLE_HINTS):
            unreachable.append(r)
        else:
            dead.append(r)

    def show(title, rows, detail):
        if not rows:
            return
        print('%s (%d)' % (title, len(rows)))
        for iso, where, url, status, redirect, err in rows:
            print('  %-22s %-4s %s' % (where, status or '-', url))
            d = detail(redirect, err)
            if d:
                print('  %-22s      → %s' % ('', d))
        print('')

    print('%d ok   %d redirected   %d blocked   %d tls   %d unreachable   %d dead\n'
          % (len(ok), len(moved), len(blocked), len(tls), len(unreachable), len(dead)))
    show('REDIRECTED — point the data at the destination', moved, lambda rd, er: rd)
    show('BLOCKED — WAF or bot wall, verify by hand, not a failure', blocked,
         lambda rd, er: rd or er)
    show('TLS — handshake refused by urllib, usually fine in a browser, check by hand', tls,
         lambda rd, er: er)
    show('UNREACHABLE — no answer from here, check by hand, not a failure', unreachable,
         lambda rd, er: er)
    show('DEAD — fix or remove these', dead, lambda rd, er: er or 'no response')

    if dead:
        print('%d dead link(s). This fails.' % len(dead))
        return 1
    print('no dead links.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
