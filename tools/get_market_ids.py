#!/usr/bin/env python3
import sys, json, re, urllib.request
from urllib.parse import urlparse

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127 Safari/537.36"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "ignore")

def from_api(slug):
    try:
        j = json.loads(fetch(f"https://polymarket.com/api/event/slug/{slug}"))
        markets = (j.get("markets") or j.get("event", {}).get("markets") or [])
        title = j.get("title") or j.get("event", {}).get("title") or slug
        return title, [m.get("id") for m in markets if m.get("id")]
    except Exception:
        return None, []

def from_html(url, slug):
    html = fetch(url)
    # Try to grab the block for this slug, then extract market ids
    ids = set()
    # Prefer the dehydrated state that contains this slug
    block = None
    m = re.search(rf'\"/api/event/slug\",\"{re.escape(slug)}\".*?\"state\"\s*:\s*\{{(.*?)\}}\s*,\s*\"queryKey\"',
                  html, re.DOTALL)
    if m:
        block = "{%s}" % m.group(1)
    else:
        block = html  # fallback: scan whole page

    for mm in re.finditer(r'"markets"\s*:\s*\[(.*?)\]', block, re.DOTALL):
        for idm in re.finditer(r'"id"\s*:\s*"(\d+)"', mm.group(1)):
            ids.add(idm.group(1))

    title = None
    tm = re.search(r'"title"\s*:\s*"([^"]+?)"\s*,', block)
    if tm: title = tm.group(1)
    return title or slug, sorted(ids)

def slug_from(u):
    p = urlparse(u)
    return p.path.rstrip("/").split("/")[-1]

if len(sys.argv) < 2:
    print("usage: get_market_ids.py <polymarket event url or slug> ..."); sys.exit(1)

for u in sys.argv[1:]:
    slug = slug_from(u) if u.startswith("http") else u
    url  = f"https://polymarket.com/event/{slug}"
    title, ids = from_api(slug)
    if not ids:
        title, ids = from_html(url, slug)
    print(f"\n{title}  ({slug})")
    if ids:
        for i in ids: print(f"  marketId: {i}")
    else:
        print("  <no market ids found>")