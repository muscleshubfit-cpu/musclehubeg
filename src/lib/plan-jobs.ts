/**
 * Plan-job registry + recovery — PURE module (no React, no fetch).
 *
 * OWNER DIRECTIVE (2026-08-28, T-4PILLAR-COMPLETE): coach plan generation
 * (plan_nutrition / plan_workout) runs on the GitHub Actions queue, so the
 * result lands ~10 minutes after the click. The old CoachClientView flow
 * used a blocking poll that DIED when the coach closed the tab — the job
 * still completed on the worker, but its result was stranded in `ai_jobs`
 * and NO plan draft was ever created. The client-side swap watcher solved
 * this exact problem for meal/exercise swaps (localStorage registry,
 * survives reloads); this module gives coach plan jobs the same guarantee
 * plus a recovery path for jobs whose registry entry was already lost.
 *
 * Three stores, all namespaced under the site-wide `mhe:` prefix:
 *   1. PENDING  — jobs enqueued and not yet materialized. Watchers re-attach
 *                 to these on every CoachClientView mount.
 *   2. SAVED    — job ids already turned into `plans` rows, so the recovery
 *                 card never double-saves.
 *   3. (derived) — the /api/ai/jobs?limit list itself (NOT stored here).
 *
 * Everything here is deterministic and side-effect-free apart from the two
 * explicit localStorage accessors, so the whole law is unit-testable.
 */

export type PlanJobKind = "workout" | "nutrition";

export type PendingPlanJob = {
  id: string;
  /** plans.client_id the resulting draft belongs to. */
  clientId: string;
  kind: PlanJobKind;
  /** When the job was enqueued (epoch ms) — drives TTL + UI timers. */
  createdAt: number;
  /**
   * Regeneration flow: delete this plan (only if STILL a draft) once the
   * replacement draft is saved, so a failed generation never destroys the
   * existing plan.
   */
  replacePlanId?: string;
};

const PREFIX = "mhe:";
export const PENDING_PLAN_JOBS_KEY = `${PREFIX}pending-plan-jobs`;
export const SAVED_PLAN_JOB_IDS_KEY = `${PREFIX}saved-plan-jobs`;

/** Entries older than this are pruned on read (worker TTL is ~3 attempts). */
export const PLAN_JOB_TTL_MS = 24 * 60 * 60_000;
/** Registry caps — protect localStorage from unbounded growth. */
export const PENDING_PLAN_JOBS_CAP = 40;
export const SAVED_PLAN_JOB_IDS_CAP = 100;
/**
 * Jobs younger than this are considered "a watcher may still be live" —
 * the recovery card hides them to avoid racing an attached watcher.
 */
export const RECOVERY_GRACE_MS = 5 * 60_000;

/* ────────────────────────── pending registry ────────────────────────── */

export function readPendingPlanJobs(now: number = Date.now()): PendingPlanJob[] {
  try {
    const raw = localStorage.getItem(PENDING_PLAN_JOBS_KEY);
    const list = raw ? (JSON.parse(raw) as PendingPlanJob[]) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.clientId === "string" &&
        (e.kind === "workout" || e.kind === "nutrition") &&
        typeof e.createdAt === "number" &&
        now - e.createdAt < PLAN_JOB_TTL_MS,
    );
  } catch {
    return [];
  }
}

export function writePendingPlanJobs(list: PendingPlanJob[]): void {
  try {
    localStorage.setItem(PENDING_PLAN_JOBS_KEY, JSON.stringify(list.slice(-PENDING_PLAN_JOBS_CAP)));
  } catch {
    /* storage full/blocked — watching still works in-session */
  }
}

export function addPendingPlanJob(entry: PendingPlanJob): void {
  writePendingPlanJobs([...readPendingPlanJobs(), entry]);
}

export function removePendingPlanJob(id: string): void {
  writePendingPlanJobs(readPendingPlanJobs().filter((e) => e.id !== id));
}

/* ─────────────────────────── saved-id store ─────────────────────────── */

export function readSavedPlanJobIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_PLAN_JOB_IDS_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function addSavedPlanJobId(id: string): void {
  const set = new Set(readSavedPlanJobIds());
  set.add(id);
  try {
    // Newest last; drop oldest beyond the cap.
    localStorage.setItem(
      SAVED_PLAN_JOB_IDS_KEY,
      JSON.stringify([...set].slice(-SAVED_PLAN_JOB_IDS_CAP)),
    );
  } catch {
    /* storage full/blocked — dedupe degrades gracefully */
  }
}

/* ───────────────────────── recovery selection ───────────────────────── */

export type RecoverableJobInput = {
  id: string;
  job_type: string;
  status: string;
  created_at?: string;
  /** ai_jobs.payload — only clientId is read for recovery selection. */
  payload?: { clientId?: string | null } | null;
};

export const PLAN_JOB_TYPES: readonly string[] = ["plan_nutrition", "plan_workout"];

export function planJobTypeToKind(jobType: string): PlanJobKind | null {
  if (jobType === "plan_workout") return "workout";
  if (jobType === "plan_nutrition") return "nutrition";
  return null;
}

/**
 * Pure core of the recovery card: from the coach's own recent ai_jobs rows,
 * pick plan jobs that (a) finished, (b) were never saved as drafts,
 * (c) still carry the clientId needed to materialize them, and
 * (d) are older than the live-watcher grace window.
 * `pendingIds` comes from the registry read at the call site.
 */
export function selectRecoverablePlanJobs(
  jobs: RecoverableJobInput[],
  savedIds: ReadonlySet<string>,
  pendingIds: ReadonlySet<string>,
  now: number = Date.now(),
): RecoverableJobInput[] {
  return jobs.filter((j) => {
    if (!PLAN_JOB_TYPES.includes(j.job_type)) return false;
    if (j.status !== "done") return false;
    if (savedIds.has(j.id) || pendingIds.has(j.id)) return false;
    const clientId = j.payload?.clientId;
    if (typeof clientId !== "string" || !clientId) return false;
    const created = j.created_at ? Date.parse(j.created_at) : NaN;
    if (!Number.isFinite(created)) return false;
    return now - created >= RECOVERY_GRACE_MS;
  });
}
