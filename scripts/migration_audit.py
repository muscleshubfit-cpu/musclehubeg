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
"""
import re, os, json
from pathlib import Path

REPO = Path("/home/z/my-project/repo")
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
