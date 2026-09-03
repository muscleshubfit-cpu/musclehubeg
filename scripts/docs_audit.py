#!/usr/bin/env python3
"""Knowledge operating system gate — Phase 107 (owner-approved study).

Owner problem: «ملفات التوثيق دايما بتسبب مشاكل» + «كل وكيل/محادثة جديدة
= لبس وتضارب» + شغل ضاع بسبب مسح مساحة العمل. The approved study diagnosed
the root causes (every fact written in 4-5 places, memory outside GitHub,
no single entry point, the law file itself carrying a duplicated §3.6)
and this gate enforces the cure as code, on every push/PR.

Checks (any failure = exit 1, ::error:: annotations in --ci):
  A. STATE.md exists, ≤ 100 lines, contains the required sections
     (المرحلة الحالية · المفتوح الآن · بانتظار موافقة المالك ·
      ممنوعات نشطة · خريطة مصادر الحقيقة · ملخص جودة المرحلة).
  B. STATE.md «آخر كوميت متحقق منه» is a real commit that is an
     ancestor-or-equal of HEAD (the state never points forward).
  C. STATE.md phase parseable + the Phase 115 frozen status files
     exist: archive/PROGRESS.md + archive/QA_CHECKLIST.md (owner
     «الأمر الخامس»: STATE.md is the single living status file —
     PROGRESS/QA were merged into it and frozen verbatim).
  D. Number-free docs: README.md + DEVELOPER_GUIDE.md carry ZERO
     variable counts (the AGENTS.md §3.8 single-source law). Numbers
     live in the code / INDEX.md only. This check was SENSITIVITY-PROVEN
     against the pre-Phase-107 docs (13 hits) before they were stripped.
  E. AGENTS.md: no duplicate section numbers (### N.N / ## N.) — born
     from the real duplicated §3.6 (lines 134 + 191).
  F. Merged status law (Phase 115, owner «الأمر الخامس»): PROGRESS.md /
     QA_CHECKLIST.md must NOT exist at the root (merged into STATE.md
     and frozen in archive/ — resurrection is gated); STATE.md keeps
     its archive/ pointer; the append-only archives must exist.
  G. STATE.md discoverability: README.md links it (the entry-point doc
     must be reachable from the front door).

Usage:  python3 scripts/docs_audit.py            # human report
        python3 scripts/docs_audit.py --ci       # GitHub Actions
Exit:   0 = knowledge system consistent · 1 = violations (list printed)
"""
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(os.environ.get(
    "REPO_ROOT", Path(__file__).resolve().parent.parent))

CI = "--ci" in sys.argv

failures: list[tuple[str, str]] = []


def fail(check: str, msg: str) -> None:
    failures.append((check, msg))
    if CI:
        print(f"::error::docs_audit [{check}] {msg}")


def read(rel: str) -> str:
    p = REPO / rel
    if not p.exists():
        fail("file-exists", f"{rel} MISSING — the knowledge system "
                            f"requires it (AGENTS.md §3.6/§3.8)")
        return ""
    return p.read_text(errors="replace")


# ------------------------------------------------------------------ A
state = read("STATE.md")
if state:
    lines = state.splitlines()
    if len(lines) > 100:
        fail("A/state-size",
             f"STATE.md is {len(lines)} lines — the law caps it at 100 "
             f"(it must stay a 30-second read); compress or archive")
    for marker in ("## المرحلة الحالية", "## المفتوح الآن",
                   "## بانتظار موافقة المالك", "## ممنوعات نشطة",
                   "## خريطة مصادر الحقيقة", "## ملخص جودة المرحلة"):
        if marker not in state:
            fail("A/state-sections", f"STATE.md lost required section "
                                     f"«{marker}»")

# ------------------------------------------------------------------ B
m = re.search(r"آخر كوميت متحقق منه:\*\*\s*([0-9a-f]{7,40})", state)
if state and not m:
    fail("B/state-commit",
         "STATE.md «آخر كوميت متحقق منه» missing/unparseable — "
         "format: «- **آخر كوميت متحقق منه:** <sha> (...)»")
elif m:
    sha = m.group(1)
    try:
        subprocess.run(
            ["git", "cat-file", "-e", f"{sha}^{{commit}}"],
            cwd=REPO, check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", sha, "HEAD"],
            cwd=REPO, check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        shallow = (REPO / ".git/shallow").exists()
        hint = (" (shallow checkout detected — the gate needs full "
                "history: use actions/checkout fetch-depth: 0)"
                if shallow else
                " (update STATE.md to a verified commit)")
        fail("B/state-commit",
             f"STATE.md commit {sha} is not an ancestor-or-equal of HEAD "
             f"— the recorded state must never point forward{hint}")

# ------------------------------------------------------------------ C
def phase_num(text: str, pattern: str) -> int | None:
    mm = re.search(pattern, text)
    if not mm:
        return None
    return int(re.match(r"\d+", mm.group(1)).group(0))


state_phase = (phase_num(state, r"المرحلة:\*\*\s*(\d+[a-z]?)")
               if state else None)
if state and state_phase is None:
    fail("C/phase-equality",
         "STATE.md «**المرحلة:**» missing/unparseable")

# Phase 115 merged law: the frozen status files must exist in archive/
# (owner «الأمر الخامس» — STATE.md is the single living status file).
for rel in ("archive/PROGRESS.md", "archive/QA_CHECKLIST.md"):
    if not (REPO / rel).exists():
        fail("C/frozen-archive",
             f"{rel} MISSING — the Phase 115 merged law requires the "
             f"frozen status files in archive/ (owner «الأمر الخامس»)")

# ------------------------------------------------------------------ D
FORBIDDEN: list[tuple[str, str]] = [
    (r"\d+\s+SQL\s+files?", "SQL file count"),
    (r"\d+\s*ملف(?:ات)?\s*SQL", "SQL file count (Arabic)"),
    (r"\d+\s*ميجريشن", "migration count (Arabic)"),
    (r"\d+\s+page\.tsx", "page count"),
    (r"\d+\s+API\s+endpoints?", "API endpoint count"),
    (r"\d+\s+endpoints?", "endpoint count"),
    (r"Total:\s*\d+", "Total: N line"),
    (r"\d+\s+route\.tsx?", "route file count"),
    (r"\(\d+\s+views?\)", "view count"),
    (r"\d+\s+views?\b", "view count (loose)"),
    (r"\d+\s+components?\b", "component count"),
    (r"0001\s*(?:→|…|\.\.\.)\s*\d", "registry range 0001→NNNN"),
]
for rel in ("README.md", "DEVELOPER_GUIDE.md"):
    text = read(rel)
    for ln_no, ln in enumerate(text.splitlines(), 1):
        for pat, label in FORBIDDEN:
            if re.search(pat, ln):
                fail("D/number-free-docs",
                     f"{rel}:{ln_no} contains a variable count ({label}, "
                     f"pattern /{pat}/) — AGENTS.md §3.8 single-source "
                     f"law: numbers live in the code or INDEX.md only; "
                     f"line: {ln.strip()[:110]!r}")

# ------------------------------------------------------------------ E
agents = read("AGENTS.md")
if agents:
    seen: dict[tuple[str, str], int] = {}
    for ln_no, ln in enumerate(agents.splitlines(), 1):
        for h, pat in (("h2", r"^## (\d+)\."),
                       ("h3", r"^### (\d+\.\d+)")):
            mm = re.match(pat, ln)
            if mm:
                key = (h, mm.group(1))
                if key in seen:
                    fail("E/agents-duplicates",
                         f"AGENTS.md:{ln_no} DUPLICATE section number "
                         f"§{mm.group(1)} (first at line {seen[key]}) — "
                         f"the duplicated §3.6 incident must stay "
                         f"impossible")
                seen[key] = ln_no

# ------------------------------------------------------------------ F
# Phase 115 merged law: no status files at the root, ever again.
for rel in ("PROGRESS.md", "QA_CHECKLIST.md"):
    if (REPO / rel).exists():
        fail("F/no-root-status",
             f"{rel} must NOT exist at the root — merged into STATE.md "
             f"and frozen in archive/ at Phase 115 (owner «الأمر الخامس»); "
             f"resurrection is gated")
if state and "archive/" not in state:
    fail("F/state-archive-pointer",
         "STATE.md lost its archive/ pointer (history lives there)")
for rel in ("archive/PROGRESS_ARCHIVE.md", "archive/QA_CHECKLIST_ARCHIVE.md"):
    if not (REPO / rel).exists():
        fail("F/archive-exists", f"{rel} MISSING — the archive law "
                                 f"requires it")

# ------------------------------------------------------------------ G
readme = read("README.md")
if readme and "STATE.md" not in readme:
    fail("G/state-discoverable",
         "README.md does not link STATE.md — the entry-point doc must "
         "be reachable from the front door")

# ------------------------------------------------------------------ report
print("=" * 64)
print(f"knowledge gate : STATE phase={state_phase} · STATE lines="
      f"{len(state.splitlines()) if state else '∅'} · merged law: "
      f"root PROGRESS/QA absent, frozen copies in archive/")
print("=" * 64)

if failures:
    print(f"\n{len(failures)} knowledge-system violation(s):")
    for check, msg in failures:
        print(f"\n❌ [{check}] {msg}")
    print("\nThe docs rot class is gated now — fix, don't bypass "
          "(AGENTS.md §3.6/§3.8).")
    sys.exit(1)

print("\n✓ knowledge operating system consistent (STATE · merged single-"
      "source law · number-free docs · AGENTS structure · frozen archive "
      "· discoverability)")
sys.exit(0)
