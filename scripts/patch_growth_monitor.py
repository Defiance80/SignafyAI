"""
Patch an API key into a n8n workflow Code node.

Usage:
    N8N_API_KEY=<key> OPENAI_API_KEY=<key> python patch_growth_monitor.py
    N8N_API_KEY=<key> OPENAI_API_KEY=<key> WF_ID=<id> python patch_growth_monitor.py
"""
import json, os, urllib.request, sys

import os

N8N_BASE = os.environ.get("N8N_BASE_URL", "https://n8n.srv1104500.hstgr.cloud")
N8N_KEY  = os.environ["N8N_API_KEY"]   # required — set in environment
OPENAI   = os.environ["OPENAI_API_KEY"] # required — set in environment
WF_ID    = os.environ.get("WF_ID", "HwlDQS7vTotrNXKI")

HEADERS = {
    "X-N8N-API-KEY": N8N_KEY,
    "Content-Type":  "application/json",
    "Accept":        "application/json",
}

# Fetch raw workflow JSON
req = urllib.request.Request(f"{N8N_BASE}/api/v1/workflows/{WF_ID}", headers=HEADERS)
with urllib.request.urlopen(req) as r:
    raw = r.read().decode("utf-8")

print(f"Fetched {len(raw)} bytes", file=sys.stderr)

# Replace all placeholder patterns (string-level, before JSON parse)
PATTERNS = [
    "{{ $env.OPENAI_API_KEY }}",
    "process.env.OPENAI_API_KEY",
    "process.env['OPENAI_API_KEY']",
    'process.env["OPENAI_API_KEY"]',
    "not-configured",
]
before = sum(raw.count(p) for p in PATTERNS)
for p in PATTERNS:
    raw = raw.replace(p, OPENAI)
after = sum(raw.count(p) for p in PATTERNS)
print(f"Replaced {before - after} occurrence(s)", file=sys.stderr)

wf = json.loads(raw)

# Build minimal PUT body
body = json.dumps({
    "name":        wf["name"],
    "nodes":       wf["nodes"],
    "connections": wf["connections"],
    "settings":    wf.get("settings", {}),
    "staticData":  None,
}, ensure_ascii=False).encode("utf-8")

# PUT back
put_req = urllib.request.Request(
    f"{N8N_BASE}/api/v1/workflows/{WF_ID}",
    data=body, headers=HEADERS, method="PUT"
)
try:
    with urllib.request.urlopen(put_req) as r:
        resp = json.loads(r.read().decode("utf-8"))
        print(f"OK: id={resp['id']}  active={resp['active']}")
except urllib.error.HTTPError as e:
    err = e.read().decode("utf-8")
    print(f"FAILED {e.code}: {err}")
