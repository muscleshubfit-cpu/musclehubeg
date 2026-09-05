#!/usr/bin/env node
/**
 * DB backup — full JSON snapshot of the public schema + auth users.
 *
 * Why this exists: the Supabase FREE plan ships NO scheduled backups
 * (verified live 2026-09-05: backups=[]). This script is the free
 * replacement: it dumps every public table via PostgREST (service-role
 * key) plus auth users via the admin API, deterministically ordered so
 * day-to-day git diffs contain ONLY real data changes.
 *
 * Output layout (target dir, default ./backups):
 *   <dir>/manifest.json          — row counts, sizes, failures, source
 *   <dir>/tables/<table>.json    — one file per public table (pretty)
 *   <dir>/auth_users.json        — auth.users export (admin API)
 *
 * PII WARNING: dumps contain emails/names/phones. They may ONLY be
 * pushed to the PRIVATE repo muscleshubfit-cpu/musclehubeg-backups —
 * never to the public code repo (see .github/workflows/db-backup.yml).
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/db-backup.mjs [targetDir]
 *
 * Pagination: PostgREST max-rows is 1000 per request → limit/offset
 * loop until a short page. Ordering: `order=id` first (stable diffs),
 * falling back to created_at, then unordered.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PAGE = 1000;

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const outDir = process.argv[2] || "backups";

if (!url || !key) {
  console.error("db-backup: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(2);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

async function rest(path, extraHeaders = {}) {
  const res = await fetch(`${url}${path}`, {
    headers: { ...headers, ...extraHeaders },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res;
}

/** Discover public tables from the OpenAPI definitions. */
async function discoverTables() {
  const res = await rest("/rest/v1/");
  const spec = await res.json();
  const defs = spec?.definitions || {};
  return Object.keys(defs).sort();
}

/** Fetch one table with pagination. Returns {rows, orderBy}. */
async function fetchTable(table) {
  const attempts = [`&order=id`, `&order=created_at`, ``];
  let lastErr = null;
  for (const orderParam of attempts) {
    try {
      const rows = [];
      for (let offset = 0; ; offset += PAGE) {
        const res = await rest(`/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}${orderParam}`);
        const page = await res.json();
        if (!Array.isArray(page)) throw new Error("non-array page");
        rows.push(...page);
        if (page.length < PAGE) break;
      }
      return { rows, orderBy: orderParam ? orderParam.replace("&order=", "") : "none" };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** auth.users via admin API (paginated). */
async function fetchAuthUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const res = await rest(`/auth/v1/admin/users?per_page=${PAGE}&page=${page}`);
    const data = await res.json();
    const batch = Array.isArray(data?.users) ? data.users : [];
    users.push(...batch);
    if (!data?.next_page || batch.length < 1) break;
    page = data.next_page;
  }
  return users;
}

function stableStringify(value) {
  // 2-space pretty print + trailing newline → clean line-level git diffs.
  return JSON.stringify(value, null, 2) + "\n";
}

async function main() {
  const t0 = Date.now();
  const tables = await discoverTables();
  console.log(`db-backup: ${tables.length} tables discovered`);

  const tablesDir = join(outDir, "tables");
  await mkdir(tablesDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: url,
    schema: "public",
    trigger: process.env.DB_BACKUP_TRIGGER || "manual",
    tables: {},
    totals: { tables: tables.length, rows: 0, bytes: 0, failed: 0 },
  };

  for (const table of tables) {
    try {
      const { rows, orderBy } = await fetchTable(table);
      const json = stableStringify(rows);
      await writeFile(join(tablesDir, `${table}.json`), json, "utf8");
      manifest.tables[table] = { rows: rows.length, bytes: Buffer.byteLength(json), orderBy, ok: true };
      manifest.totals.rows += rows.length;
      manifest.totals.bytes += Buffer.byteLength(json);
    } catch (e) {
      manifest.tables[table] = { ok: false, error: String(e.message).slice(0, 300) };
      manifest.totals.failed += 1;
      console.warn(`WARN ${table}: ${e.message}`);
    }
  }

  // auth users (best effort)
  try {
    const users = await fetchAuthUsers();
    const json = stableStringify(users);
    await writeFile(join(outDir, "auth_users.json"), json, "utf8");
    manifest.authUsers = { rows: users.length, bytes: Buffer.byteLength(json), ok: true };
  } catch (e) {
    manifest.authUsers = { ok: false, error: String(e.message).slice(0, 300) };
    console.warn(`WARN auth_users: ${e.message}`);
  }

  await writeFile(join(outDir, "manifest.json"), stableStringify(manifest), "utf8");

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `db-backup: ${manifest.totals.tables - manifest.totals.failed}/${manifest.totals.tables} tables · ` +
      `${manifest.totals.rows} rows · ${(manifest.totals.bytes / 1024).toFixed(0)} KB · ` +
      `auth_users=${manifest.authUsers.rows ?? "FAIL"} · ${secs}s → ${outDir}`,
  );
  if (manifest.totals.failed > 0) {
    console.log(`::warning::${manifest.totals.failed} table(s) failed — see manifest.json`);
  }
}

main().catch((e) => {
  console.error(`db-backup FATAL: ${e.message}`);
  process.exit(1);
});
