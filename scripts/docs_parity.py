#!/usr/bin/env python3
"""Docs parity gate — README/DEVELOPER_GUIDE/INDEX claims vs filesystem truth.

Born from Phase 104 (README frozen at Phase 81 while the product had moved
to 103b) and Phase 106 (owner: «عايز حل ثابت انها متحصلش تانى خصوصاً ان
ملفات التوثيق دايما بتسبب مشاكل»).

Every count claimed in the docs is re-derived from the filesystem on every
push (see .github/workflows/docs-parity-gate.yml). If a claim is stale —
or the claim sentence was edited away entirely — this gate FAILS, so docs
can no longer drift silently.

Gated claims (every occurrence must match the filesystem):
  README.md           **N SQL files** · N page.tsx · N API endpoints ·
                      (N views) · N components) · 0001→NNNN
  DEVELOPER_GUIDE.md  N endpoints
  INDEX.md            «خريطة الترقيم 0001 → NNNN» heading == newest NNNN
                      filename in supabase/migrations/

Deliberately NOT gated: per-filename listing inside INDEX.md — §1 of that
file documents the range-notation families BY DESIGN (Phase 106 verified:
52 of the 81 SQL files are covered by range rows, not exact names).

Usage:  python3 scripts/docs_parity.py            # human report
        python3 scripts/docs_parity.py --ci       # GitHub Actions annotations
Exit:   0 = all claims match · 1 = any stale/missing claim
"""
import os
import re
import sys
from pathlib import Path

REPO = Path(os.environ.get(
    "REPO_ROOT", Path(__file__).resolve().parent.parent))

CI = "--ci" in sys.argv

# ---------------------------------------------------------------- truth
pages = len(list((REPO / "src/app").rglob("page.tsx")))
api_ts = list((REPO / "src/app/api").rglob("route.ts"))
api_tsx = list((REPO / "src/app/api").rglob("route.tsx"))
endpoints = len(api_ts) + len(api_tsx)
sql_files = sorted((REPO / "supabase/migrations").glob("*.sql"))
sql_count = len(sql_files)
views = len(list((REPO / "src/components/views").glob("*.tsx")))
ui = len(list((REPO / "src/components/ui").glob("*.tsx")))

max_nnnn = "0000"
for f in sql_files:
    m = re.match(r"^(\d{4})_", f.name) or re.search(r"_(\d{4})_", f.name)
    if m and m.group(1) > max_nnnn:
        max_nnnn = m.group(1)

# ------------------------------------------------------------ claim specs
# (file, label, regex, expected, hint, line_scope)
# line_scope: a claim is only read from lines ALSO matching this regex —
# it keeps TRUE HISTORICAL statements ("Phase 82 verified 67 endpoints",
# audit-log row "الترقيم كامل 0001→0062") out of the gate while locking
# the canonical current-state lines.
CLAIMS = [
    ("README.md", "SQL files count", r"(\d+)\s+SQL files", sql_count,
     "update every 'N SQL files' mention in README.md", None),
    ("README.md", "page.tsx count", r"(\d+)\s+page\.tsx", pages,
     "update the app/ tree comment in README.md", None),
    ("README.md", "API endpoints count", r"(\d+)\s+API endpoints", endpoints,
     "update the api/ tree comment in README.md", None),
    ("README.md", "views count", r"\((\d+)\s+views\)", views,
     "update the views/ tree comment in README.md", None),
    ("README.md", "ui components count", r"(\d+)\s+components\)", ui,
     "update the UI row of the tech table in README.md", None),
    ("README.md", "migration registry range", r"0001\s*→\s*(\d{4})",
     int(max_nnnn),
     "update '0001→NNNN' registry mentions in README.md", None),
    ("DEVELOPER_GUIDE.md", "API endpoints total", r"(\d+)\s+endpoints",
     endpoints, "update the 'Total: N endpoints' line in DEVELOPER_GUIDE §8",
     r"Total:"),
    ("supabase/migrations/INDEX.md", "registry heading range",
     r"0001\s*→\s*(\d{4})", int(max_nnnn),
     "update the «خريطة الترقيم 0001 → NNNN» heading in INDEX.md",
     r"خريطة الترقيم"),
]

failures = []

for rel, label, pattern, expected, hint, line_scope in CLAIMS:
    path = REPO / rel
    if not path.exists():
        failures.append((rel, label, "FILE MISSING",
                         f"{rel} does not exist"))
        continue
    text = path.read_text(errors="replace")
    hits = []
    for line_no, ln in enumerate(text.splitlines(), 1):
        if line_scope and not re.search(line_scope, ln):
            continue
        for h in re.finditer(pattern, ln):
            hits.append((line_no, h.group(1)))
    if not hits:
        failures.append((rel, label, "CLAIM SENTENCE MISSING",
                         f"pattern /{pattern}/ not found — the claim was "
                         f"edited away or renamed; re-add it (expected "
                         f"value: {expected}). Hint: {hint}"))
        continue
    for line_no, got in hits:
        if int(got) != expected:
            failures.append((rel, label, f"line {line_no}: says {got}",
                             f"filesystem truth = {expected} · hint: {hint}"))

# ---------------------------------------------------------------- report
print("=" * 64)
print(f"filesystem truth : pages={pages} · endpoints={endpoints} "
      f"(route.ts {len(api_ts)} + route.tsx {len(api_tsx)}) · sql={sql_count} "
      f"· views={views} · ui={ui} · newest NNNN={max_nnnn}")
print("=" * 64)

if failures:
    for rel, label, got, fix in failures:
        print(f"\n❌ {rel} — {label}")
        print(f"   found:    {got}")
        print(f"   required: {fix}")
        if CI:
            print(f"::error::docs parity: {rel} {label} — {got} | {fix}")
    print(f"\n{len(failures)} stale/missing doc claim(s) — "
          f"docs drifted from the filesystem (the Phase-104 incident class)")
    sys.exit(1)

print("\n✓ all documented counts match the filesystem "
      "(README · DEVELOPER_GUIDE · INDEX.md)")
sys.exit(0)
