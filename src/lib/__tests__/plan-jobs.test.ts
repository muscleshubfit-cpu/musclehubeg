import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readPendingPlanJobs,
  writePendingPlanJobs,
  addPendingPlanJob,
  removePendingPlanJob,
  readSavedPlanJobIds,
  addSavedPlanJobId,
  selectRecoverablePlanJobs,
  planJobTypeToKind,
  PENDING_PLAN_JOBS_KEY,
  SAVED_PLAN_JOB_IDS_KEY,
  PLAN_JOB_TTL_MS,
  RECOVERY_GRACE_MS,
  PendingPlanJob,
} from "@/lib/plan-jobs";

/**
 * T-4PILLAR-COMPLETE — coach plan-job registry + recovery law.
 * Guards the localStorage contracts that keep queued plan_nutrition /
 * plan_workout jobs from being stranded when the coach closes the tab:
 * TTL pruning, caps, saved-id dedupe, and the recoverable-job filter.
 */

const entry = (over: Partial<PendingPlanJob> = {}): PendingPlanJob => ({
  id: "job-1",
  clientId: "client-1",
  kind: "workout",
  createdAt: Date.now(),
  ...over,
});

describe("plan-jobs registry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips pending entries through write/read", () => {
    writePendingPlanJobs([entry(), entry({ id: "job-2", kind: "nutrition" })]);
    const list = readPendingPlanJobs();
    expect(list).toHaveLength(2);
    expect(list.map((e) => e.id)).toEqual(["job-1", "job-2"]);
  });

  it("prunes entries older than the TTL on read", () => {
    const stale = entry({ id: "stale", createdAt: Date.now() - PLAN_JOB_TTL_MS - 1000 });
    const fresh = entry({ id: "fresh" });
    writePendingPlanJobs([stale, fresh]);
    expect(readPendingPlanJobs().map((e) => e.id)).toEqual(["fresh"]);
  });

  it("drops malformed entries instead of throwing", () => {
    localStorage.setItem(
      PENDING_PLAN_JOBS_KEY,
      JSON.stringify([null, { id: "x" }, entry(), "junk"]),
    );
    expect(readPendingPlanJobs().map((e) => e.id)).toEqual(["job-1"]);
  });

  it("appends via addPendingPlanJob and removes by id", () => {
    addPendingPlanJob(entry());
    addPendingPlanJob(entry({ id: "job-2" }));
    expect(readPendingPlanJobs()).toHaveLength(2);
    removePendingPlanJob("job-1");
    expect(readPendingPlanJobs().map((e) => e.id)).toEqual(["job-2"]);
    expect(readPendingPlanJobs()).toHaveLength(1);
  });

  it("survives corrupted storage (returns empty, never throws)", () => {
    localStorage.setItem(PENDING_PLAN_JOBS_KEY, "{not json");
    expect(readPendingPlanJobs()).toEqual([]);
    localStorage.setItem(SAVED_PLAN_JOB_IDS_KEY, "{not json");
    expect(readSavedPlanJobIds()).toEqual([]);
  });
});

describe("saved plan-job ids", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("dedupes ids", () => {
    addSavedPlanJobId("a");
    addSavedPlanJobId("a");
    addSavedPlanJobId("b");
    expect(readSavedPlanJobIds().sort()).toEqual(["a", "b"]);
  });

  it("caps the store at 100 ids keeping the newest", () => {
    for (let i = 0; i < 120; i++) addSavedPlanJobId(`job-${i}`);
    const ids = readSavedPlanJobIds();
    expect(ids).toHaveLength(100);
    expect(ids[0]).toBe("job-20"); // oldest evicted
    expect(ids[ids.length - 1]).toBe("job-119");
  });
});

describe("selectRecoverablePlanJobs", () => {
  const now = Date.now();
  const old = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  const base = {
    id: "j1",
    job_type: "plan_workout",
    status: "done",
    created_at: old(30),
    payload: { clientId: "c1" },
  };

  it("keeps finished unsaved plan jobs past the grace window", () => {
    const picked = selectRecoverablePlanJobs([base], new Set(), new Set(), now);
    expect(picked).toHaveLength(1);
    expect(picked[0].id).toBe("j1");
  });

  it("filters non-plan job types", () => {
    expect(
      selectRecoverablePlanJobs([{ ...base, job_type: "meal_regenerate" }], new Set(), new Set(), now),
    ).toHaveLength(0);
  });

  it("filters jobs that are not done", () => {
    expect(selectRecoverablePlanJobs([{ ...base, status: "queued" }], new Set(), new Set(), now)).toHaveLength(0);
    expect(selectRecoverablePlanJobs([{ ...base, status: "failed" }], new Set(), new Set(), now)).toHaveLength(0);
  });

  it("filters saved and pending (live-watcher) jobs", () => {
    expect(selectRecoverablePlanJobs([base], new Set(["j1"]), new Set(), now)).toHaveLength(0);
    expect(selectRecoverablePlanJobs([base], new Set(), new Set(["j1"]), now)).toHaveLength(0);
  });

  it("filters jobs without a usable payload.clientId", () => {
    expect(selectRecoverablePlanJobs([{ ...base, payload: {} }], new Set(), new Set(), now)).toHaveLength(0);
    expect(selectRecoverablePlanJobs([{ ...base, payload: undefined }], new Set(), new Set(), now)).toHaveLength(0);
  });

  it("hides jobs inside the grace window (watcher may still be live)", () => {
    const young = { ...base, created_at: old(1) };
    expect(selectRecoverablePlanJobs([young], new Set(), new Set(), now)).toHaveLength(0);
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(RECOVERY_GRACE_MS).toBe(5 * 60_000);
    vi.restoreAllMocks();
  });

  it("filters rows with missing/invalid created_at", () => {
    expect(selectRecoverablePlanJobs([{ ...base, created_at: undefined }], new Set(), new Set(), now)).toHaveLength(0);
    expect(selectRecoverablePlanJobs([{ ...base, created_at: "not-a-date" }], new Set(), new Set(), now)).toHaveLength(0);
  });
});

describe("planJobTypeToKind", () => {
  it("maps plan types to plan kinds and rejects everything else", () => {
    expect(planJobTypeToKind("plan_workout")).toBe("workout");
    expect(planJobTypeToKind("plan_nutrition")).toBe("nutrition");
    expect(planJobTypeToKind("social_post")).toBeNull();
    expect(planJobTypeToKind("garbage")).toBeNull();
  });
});
