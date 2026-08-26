#!/usr/bin/env bash
# =====================================================================
# scripts/blog-runner/run-step.sh
#
# Retry wrapper around run-step.mts for GitHub Actions:
#   • up to MAX_ATTEMPTS tries per pipeline step
#   • linear backoff: 120s after attempt 1, 240s after attempt 2
#     (matches the previous curl-based workflow policy)
#   • captures queueId from step1 JSON into $GITHUB_ENV so later
#     steps receive it automatically
#
# Usage:  bash scripts/blog-runner/run-step.sh <step-name> [max-attempts]
# Env:    QUEUE_ID (optional input from previous steps)
#         GITHUB_ENV (provided by Actions runtime)
# Exit:   0 on success, 1 if all attempts failed
# =====================================================================
set -uo pipefail

STEP="${1:?usage: run-step.sh <step-name> [max-attempts]}"
MAX_ATTEMPTS="${2:-3}"

ARGS=(--step "$STEP")
if [ -n "${QUEUE_ID:-}" ]; then
  ARGS+=(--queueId "$QUEUE_ID")
fi

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "--- [$STEP] attempt $attempt / $MAX_ATTEMPTS ---"

  set +e
  npx --no-install tsx scripts/blog-runner/run-step.mts "${ARGS[@]}" 2>&1 | tee /tmp/"$STEP".out
  CODE=${PIPESTATUS[0]}
  set -u

  if [ "$CODE" -eq 0 ]; then
    # Capture queueId once (step1 only — uuid v4 quoted string).
    QID="$(grep -o '"queueId":"[^"]*"' /tmp/"$STEP".out | head -1 | cut -d'"' -f4)"
    if [ -n "$QID" ] && [ -n "${GITHUB_ENV:-}" ]; then
      echo "QUEUE_ID=$QID" >> "$GITHUB_ENV"
      echo "[$STEP] captured QUEUE_ID=$QID"
    fi
    echo "✓ $STEP succeeded"
    exit 0
  fi

  echo "↻ [$STEP] attempt $attempt failed (exit $CODE)"
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    WAIT=$((120 * attempt))
    echo "   retrying in ${WAIT}s ..."
    sleep "$WAIT"
  fi
  attempt=$((attempt + 1))
done

echo "❌ [$STEP] failed after $MAX_ATTEMPTS attempts"
exit 1
