#!/usr/bin/env bash
# =====================================================================
# scripts/check-stale-refs.sh
#
# ANTI-REGRESSION GUARD — fails CI if any RETIRED identifier reappears
# anywhere in code/scripts/workflows. Born from two real incidents:
#
#   1) 2026-08-27 red dispatch: run-step.mts still exempted legacy v1
#      step name "step1-pick" although v1 was gone for days.
#   2) Owner-reported pattern: edits "vanish" because retired Vercel-AI
#      routes kept running PARALLEL to their replacements, making fixes
#      look like they reverted.
#
# RULE (AGENTS.md §8): retiring anything = git rm in the SAME session
# plus a clean run of this script. Comments/docs under docs/, AGENTS.md,
# PROGRESS.md may narrate history — code may not reference it.
#
# Usage:  bash scripts/check-stale-refs.sh          # human output
#         bash scripts/check-stale-refs.sh --ci     # same, CI-framed
# Exit:   0 = clean · 1 = stale references found
# =====================================================================
set -uo pipefail

CI_MODE=0; [ "${1:-}" = "--ci" ] && CI_MODE=1

cd "$(dirname "$0")/.." || exit 1

PATTERN='(/api/cron/generate-blog-post|/api/ai/pick-topic|/api/ai/research-topic|/api/ai/generate-article|/api/ai/generate-image|/api/ai/regenerate-meal|/api/ai/blog-tool|/api/ai/swap[^a-z-]|AIGenerateModal|step1-pick|step1_outline|step2-write|step4-review|step5-publish|IMAGE_MODESTY_SUFFIX[^_])'

SCOPES="src scripts .github"

[ "$CI_MODE" -eq 1 ] && echo "::group::stale-ref scan (retired identifiers)"
HITS=$(grep -rnE "$PATTERN" $SCOPES \
        --include='*.ts' --include='*.tsx' --include='*.mts' \
        --include='*.yml' --include='*.yaml' --include='*.sh' \
        --include='*.json' \
        --exclude='check-stale-refs.sh' 2>/dev/null | grep -vE '^\S+:[0-9]+: *(\*|//|#)' || true)
[ "$CI_MODE" -eq 1 ] && echo "::endgroup::"

if [ -n "$HITS" ]; then
  [ "$CI_MODE" -eq 1 ] && echo "::error::stale identifiers detected — retiring requires git rm + grep-clean in the SAME session (AGENTS.md §8 anti-regression law)"
  echo "❌ STALE REFERENCES FOUND (retired identifiers must not appear outside comments):"
  echo "$HITS"
  exit 1
fi

echo "✓ no stale references (guard: retired routes/components/v1 step names)"
exit 0
