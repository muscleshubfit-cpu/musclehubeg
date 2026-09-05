#!/usr/bin/env node
/**
 * DB restore — replay a db-backup.mjs snapshot into a Supabase project.
 *
 * Default is DRY-RUN (reports what it would do, writes nothing).
 * Pass --apply to actually upsert rows.
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     node scripts/db-restore.mjs <snapshotDir> [--apply]
 *
 * How it restores: every table file is POSTed as an UPSERT
 * (`Prefer: resolution=merge-duplicates`, `on_conflict=id`) — existing
 * rows are updated, missing rows are inserted, nothing is deleted.
 * Two passes run (FK dependencies often resolve on retry); anything
 * still failing is reported at the end.
 *
 * auth_users.json is informational only: passwords are not exported,
 * so users must use "forgot password" after a full-project restore;
 * their profiles rows come back with the profiles table.
 *
 * ⚠️ Restoring writes to whatever SUPABASE_URL points at. Point it at
 * a STAGING project first. Deleting data is never performed — to drop
 * conflicting rows, do it manually in the Supabase dashboard.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const [dir, applyFlag] = process.argv.slice(2);

if (!url || !key || !dir) {
  console.error("db-restore: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and <snapshotDir> are required");
  console.error("usage: node scripts/db-restore.mjs <snapshotDir> [--apply]");
  process.exit(2);
}
const APPLY = applyFlag === "--apply";

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "content-type": "application/json",
};

async function upsert(table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  const tableFiles = (await readdir(join(dir, "tables"))).filter((f) => f.endsWith(".json")).sort();
  console.log(`db-restore: snapshot ${manifest.generatedAt} · ${tableFiles.length} tables · target ${url}`);
  console.log(APPLY ? "MODE: APPLY (upserting rows)" : "MODE: DRY-RUN (no writes — pass --apply to restore)");

  const failed = new Map();
  for (let pass = 1; pass <= 2; pass++) {
    if (APPLY && pass === 2 && failed.size === 0) break;
    if (pass === 2) console.log(`db-restore: retrying ${failed.size} failed table(s)…`);
    for (const file of tableFiles) {
      const table = file.replace(/\.json$/, "");
      const rows = JSON.parse(await readFile(join(dir, "tables", file), "utf8"));
      if (rows.length === 0) continue;
      if (!APPLY) {
        console.log(`  DRY  ${table}: would upsert ${rows.length} rows`);
        continue;
      }
      if (pass === 1) process.stdout.write(`  …    ${table}: ${rows.length} rows `);
      try {
        await upsert(table, rows);
        failed.delete(table);
        if (pass > 1 || failed.size === 0) console.log("✓");
      } catch (e) {
        failed.set(table, e.message);
        console.log(`✗ (${e.message.slice(0, 80)})`);
      }
    }
  }

  const authPath = join(dir, "auth_users.json");
  try {
    const users = JSON.parse(await readFile(authPath, "utf8"));
    console.log(`  INFO auth_users: ${users.length} users in snapshot (passwords not exportable — they must use "forgot password")`);
  } catch {
    /* snapshot without auth export */
  }

  if (failed.size > 0) {
    console.error(`db-restore: ${failed.size} table(s) FAILED:`);
    for (const [t, e] of failed) console.error(`  ✗ ${t}: ${e}`);
    process.exit(1);
  }
  console.log(APPLY ? "db-restore: done — all tables upserted" : "db-restore: dry-run complete");
}

main().catch((e) => {
  console.error(`db-restore FATAL: ${e.message}`);
  process.exit(1);
});
