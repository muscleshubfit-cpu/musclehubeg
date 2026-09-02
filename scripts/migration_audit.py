#!/usr/bin/env python3
"""Migration files ↔ generated types.ts parity audit (MuscleHub EG).

Checks:
  1. Tables defined in migrations but MISSING from types.ts
  2. Tables present in types.ts with NO migration definition (phantom)
  3. Columns in migrations missing from types.ts (per table)
  4. Columns in types.ts with NO migration anywhere (phantom columns — the
     bug class caught in Phases 94/95)
  5. RLS coverage: tables without "enable row level security" anywhere
  6. Functions defined in migrations vs Function block of types.ts

Phase 106 (owner: «عايز حل ثابت انها متحصلش تانى»): adds a --ci mode for
.github/workflows/docs-parity-gate.yml — exit 1 on any NEW finding that is
not part of the documented accepted baseline below; report mode unchanged.
"""
import re, os, json, sys
from pathlib import Path

# Portable: works in CI checkouts and local workspaces alike (was a
# hardcoded sandbox path that would break the GitHub Actions runner).
REPO = Path(os.environ.get(
    "REPO_ROOT", Path(__file__).resolve().parent.parent))
MIG = REPO / "supabase/migrations"
TYPES = REPO / "src/lib/supabase/types.ts"

CONSTRAINT_STARTERS = (
    "primary", "unique", "check", "foreign", "constraint", "exclude",
)

# ---------------------------------------------------------------- migrations
mig_tables = {}      # table -> set(columns)
mig_order = {}       # table -> first file defining it
rls_tables = set()
functions = set()
enums = {}
files = sorted(f for f in MIG.iterdir() if f.suffix == ".sql")

def norm(table):
    t = table.strip().strip('"')
    if "." in t:
        t = t.split(".", 1)[1]
    return t.strip('"').lower()

for f in files:
    sql = f.read_text(errors="replace")
    lines = sql.splitlines()
    depth = 0            # paren depth for create-table bodies
    cur_table = None
    in_dollar = False
    for raw in lines:
        line = raw.strip()
        if line.count("$$") % 2 == 1:
            in_dollar = not in_dollar
        if in_dollar:
            continue
        # RLS
        m = re.match(r"(?i)alter\s+table\s+(?:public\.)?([\w.\"']+)\s+enable\s+row\s+level", line)
        if m:
            rls_tables.add(norm(m.group(1)))
        # functions
        m = re.match(r"(?i)create\s+or\s+replace\s+function\s+([\w.\"']+)", line)
        if m:
            functions.add(norm(m.group(1)))
        m = re.match(r"(?i)create\s+function\s+([\w.\"']+)", line)
        if m:
            functions.add(norm(m.group(1)))
        # enums
        m = re.match(r"(?i)create\s+type\s+([\w.\"']+)\s+as\s+enum", line)
        if m:
            enums[norm(m.group(1))] = f.name
        # create table
        m = re.match(r"(?i)create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.\"']+)\s*\(", line)
        if m:
            cur_table = norm(m.group(1))
            mig_tables.setdefault(cur_table, set())
            mig_order.setdefault(cur_table, f.name)
            depth = 1
            continue
        if cur_table is not None:
            depth += raw.count("(") - raw.count(")")
            if depth <= 0:
                cur_table = None
                continue
            if not line or line.startswith("--"):
                continue
            body = re.sub(r"--.*$", "", line).strip().rstrip(",")
            m2 = re.match(r"^(?!\b(?:primary|unique|check|foreign|constraint|exclude)\b)([\w\"']+)\s+[a-zA-Z]", body, re.I)
            if m2:
                col = m2.group(1).strip('"').lower()
                if col.lower() not in CONSTRAINT_STARTERS:
                    mig_tables[cur_table].add(col)
        # alter add column
        m = re.match(
            r"(?i)alter\s+table\s+(?:only\s+)?(?:public\.)?([\w.\"']+)\s+"
            r"add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?([\w\"']+)",
            line)
        if m:
            t, col = norm(m.group(1)), m.group(2).strip('"').lower()
            if col.lower() not in CONSTRAINT_STARTERS:
                mig_tables.setdefault(t, set()).add(col)
                mig_order.setdefault(t, f.name)
        # alter drop column (Phase 105): a later migration may legitimately
        # remove a column an earlier one created (e.g. 0069 dropping the
        # phantom mirror columns 0063 declared) — the effective migration
        # shape is what remains, so retire it from the expected set
        m = re.match(
            r"(?i)alter\s+table\s+(?:only\s+)?(?:public\.)?([\w.\"']+)\s+"
            r"drop\s+(?:column\s+)?(?:if\s+exists\s+)?([\w\"']+)",
            line)
        if m:
            t, col = norm(m.group(1)), m.group(2).strip('"').lower()
            if t in mig_tables:
                mig_tables[t].discard(col)
        # alter rename column (Phase 106): 0012/0038 renamed
        # price_egp → price_usd — the FINAL name is what types.ts and
        # live production carry; without this the parser keeps reporting
        # the dead name as "missing" and the live name as "phantom"
        m = re.match(
            r"(?i)alter\s+table\s+(?:only\s+)?(?:public\.)?([\w.\"']+)\s+"
            r"rename\s+(?:column\s+)?([\w\"']+)\s+to\s+([\w\"']+)",
            line)
        if m:
            t = norm(m.group(1))
            old = m.group(2).strip('"').lower()
            new = m.group(3).strip('"').lower()
            if t in mig_tables:
                mig_tables[t].discard(old)
                mig_tables[t].add(new)

# ---------------------------------------------------------------- types.ts
ts = TYPES.read_text()
ts_tables = {}
start = ts.find("Tables: {")
end = ts.find("Views: {")
table_section = ts[start:end] if start != -1 and end != -1 else ts
row_section_pat = re.compile(
    r"^\s{6}([\w]+):\s*\{(.*?)^\s{6}\}", re.M | re.S)
for m in row_section_pat.finditer(table_section):
    tname = m.group(1)
    body = m.group(2)
    r = re.search(r"Row:\s*\{(.*?)\n\s{8}\}", body, re.S)
    if not r:
        continue
    cols = set()
    for cm in re.finditer(r"^\s{10}([\w]+):", r.group(1), re.M):
        cols.add(cm.group(1))
    ts_tables[tname] = cols

# ---------------------------------------------------------------- report
print("=" * 64)
print(f"migration files scanned : {len(files)}")
print(f"tables in migrations    : {len(mig_tables)}")
print(f"tables in types.ts      : {len(ts_tables)}")
print(f"functions in migrations : {len(functions)}")
print(f"enums in migrations     : {len(enums)}")
print("=" * 64)

missing_in_types = sorted(set(mig_tables) - set(ts_tables))
phantom_tables = sorted(set(ts_tables) - set(mig_tables))

print("\n[1] tables in migrations MISSING from types.ts:")
print("   ", missing_in_types or "NONE ✓")

print("\n[2] PHANTOM tables in types.ts (no migration):")
print("   ", phantom_tables or "NONE ✓")

print("\n[3] columns in migrations MISSING from types.ts:")
found = False
for t in sorted(set(mig_tables) & set(ts_tables)):
    a = mig_tables[t] - ts_tables[t]
    if a:
        found = True
        print(f"    {t}: {sorted(a)}")
if not found:
    print("    NONE ✓")

print("\n[4] PHANTOM columns in types.ts (no migration defines them):")
found = False
for t in sorted(set(mig_tables) & set(ts_tables)):
    b = ts_tables[t] - mig_tables[t]
    if b:
        found = True
        print(f"    {t}: {sorted(b)}")
if not found:
    print("    NONE ✓")

no_rls = sorted(t for t in mig_tables if t not in rls_tables)
print("\n[5] tables WITHOUT 'enable row level security' in any migration:")
for t in no_rls:
    print(f"    {t}  (first defined: {mig_order.get(t)})")
if not no_rls:
    print("    NONE ✓")

print("\n[6] functions found in migrations:")
print("   ", sorted(functions) or "none")
print("\n[7] enums:", {k: v for k, v in enums.items()} or "none")

# ---------------------------------------------------------------- CI gate
# Phase 106 — owner: «عايز حل ثابت انها متحصلش تانى خصوصاً ان ملفات
# التوثيق دايما بتسبب مشاكل». The findings below are the DOCUMENTED,
# ACCEPTED boundaries as of Phase 106 (INDEX.md §3 boundary notes + the
# static-parser blind spots: columns created inside DO $$/dynamic-SQL
# blocks are invisible to a line-oriented regex audit). Anything NOT in
# these sets is NEW DRIFT and fails the gate (exit 1).
#
# Baseline hygiene: if an accepted item later RESOLVES (drift fixed), the
# gate stays green and prints a "resolved — prune baseline" hint; prune
# the line in the same commit that fixed it. Accepted sets are EXACT
# (per-table), so any brand-new phantom column on an accepted table is
# still caught.
ACCEPTED_MISSING_TABLES = {
    # INDEX.md §3: audit_log has no live FK data path; gh_sync_probe is a
    # probe table created and dropped during the GitHub-sync trials (0056)
    "audit_log", "gh_sync_probe",
}
ACCEPTED_MISSING_COLS = {
    # INDEX.md §3-family boundary: added in 0014, lives in production,
    # not surfaced in the generated mirror (no app code selects it)
    "blog_posts": {"source"},
    # price_egp → price_usd renames (0012 subscription_requests ·
    # 0038 coach_ads) are parser-blind: 0012 splits the statement across
    # two lines and 0038 renames inside a DO $$ block — the dead egp name
    # therefore still appears "missing"; §3 documents both as resolved
    "coach_ads": {"price_egp"},
    "subscription_requests": {"price_egp"},
}
ACCEPTED_PHANTOM_COLS = {
    # Columns visible in types.ts but created via DO-block/dynamic SQL or
    # manual-application-era migrations the static parser cannot see
    "admin_notifications": {"target_coach_id"},
    "blog_generation_queue": {"focus_keyword_ar", "language", "topic_ar"},
    "coach_pages": {"bio_en", "certificates", "headline_en", "review_note",
                    "review_status", "reviewed_at", "specialties_en"},
    "plans": {"approved_at", "is_current", "status"},
    "profiles": {"coach_kind", "is_test_account", "referral_code"},
    "referral_earnings": {"affiliate_commission_id", "available_at",
                          "transaction_type"},
    "referrals": {"last_seen"},
    "subscriptions": {"cancel_requested_at", "subscription_type"},
    # the USD side of the parser-blind renames documented above — the
    # final live name types.ts correctly carries
    "coach_ads": {"price_usd"},
    "subscription_requests": {"price_usd"},
}

missing_tables = set(mig_tables) - set(ts_tables)
new_missing_tables = missing_tables - ACCEPTED_MISSING_TABLES
resolved = sorted(ACCEPTED_MISSING_TABLES - missing_tables)

new_missing_cols, new_phantom_cols = {}, {}
for t in sorted(set(mig_tables) & set(ts_tables)):
    miss = mig_tables[t] - ts_tables[t]
    acc_m = ACCEPTED_MISSING_COLS.get(t, set())
    if miss - acc_m:
        new_missing_cols[t] = sorted(miss - acc_m)
    resolved += [f"missing:{t}:{c}" for c in sorted(acc_m - miss)]
    ph = ts_tables[t] - mig_tables[t]
    acc_p = ACCEPTED_PHANTOM_COLS.get(t, set())
    if ph - acc_p:
        new_phantom_cols[t] = sorted(ph - acc_p)
    resolved += [f"phantom:{t}:{c}" for c in sorted(acc_p - ph)]

print("\n" + "=" * 64)
print("[8] CI GATE — new drift vs accepted baseline (Phase 106)")
gate_ok = not (new_missing_tables or new_missing_cols or new_phantom_cols)
if new_missing_tables:
    print(f"    NEW missing tables : {sorted(new_missing_tables)}")
if new_missing_cols:
    print(f"    NEW missing columns: {new_missing_cols}")
if new_phantom_cols:
    print(f"    NEW phantom columns: {new_phantom_cols}")
if gate_ok:
    print("    PASS ✓ — zero new drift (accepted baseline documented above)")
if resolved:
    print(f"    baseline items RESOLVED — prune their baseline lines: "
          f"{resolved}")
print("=" * 64)

if "--ci" in sys.argv:
    if not gate_ok:
        for t in sorted(new_missing_tables):
            print(f"::error::migration_audit: table '{t}' exists in "
                  f"migrations but is MISSING from types.ts")
        for t, cols in new_missing_cols.items():
            print(f"::error::migration_audit: columns {cols} of '{t}' "
                  f"exist in migrations but are MISSING from types.ts")
        for t, cols in new_phantom_cols.items():
            print(f"::error::migration_audit: PHANTOM columns {cols} of "
                  f"'{t}' exist in types.ts but in NO migration "
                  f"(the 42703 incident class — see Phase 99-run)")
        sys.exit(1)
    sys.exit(0)
