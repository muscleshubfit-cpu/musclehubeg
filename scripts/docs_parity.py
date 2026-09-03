#!/usr/bin/env python3
"""Migration registry parity gate — INDEX.md heading vs filesystem truth.

Born from Phase 104 (README frozen at Phase 81 while the product had moved
to 103b) and Phase 106 (owner: «عايز حل ثابت انها متحصلش تانى خصوصاً ان
ملفات التوثيق دايما بتسبب مشاكل»).

Scope EVOLVED in Phase 107 (owner-approved knowledge operating system):
README/DEVELOPER_GUIDE were stripped of ALL variable counts under the
AGENTS.md §3.8 single-source law, so guarding their claims here became
moot — their number-freedom is now enforced by scripts/docs_audit.py
(the docs-parity-gate.yml workflow runs BOTH). What remains here is the
one registry claim DESIGNED to live in a doc: the INDEX.md numbering
heading, re-derived from the filesystem on every push.

Gated claims:
  INDEX.md  «خريطة الترقيم 0001 → NNNN» heading == newest NNNN filename
            in supabase/migrations/

Usage:  python3 scripts/docs_parity.py            # human report
        python3 scripts/docs_parity.py --ci       # GitHub Actions annotations
Exit:   0 = registry heading matches · 1 = stale/missing
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
# line_scope: a claim is only read from lines ALSO matching this regex.
# Phase 107: README/GUIDE claims REMOVED — those docs are now number-FREE
# (AGENTS.md §3.8 single-source law, enforced by scripts/docs_audit.py).
# Only the INDEX.md registry heading remains — the single documented home
# of the numbering range BY DESIGN (MIGRATION INDEX LAW).
CLAIMS = [
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

print("\n✓ migration registry heading matches the filesystem "
      "(INDEX.md — the single documented home of the range; "
      "README/GUIDE are number-free per docs_audit.py)")
sys.exit(0)
