/**
 * EVO chat link persistence — pure helpers (no React / no Supabase deps).
 *
 * OWNER FIX (2026-08-27): `chat_messages` has NO links column, so assistant
 * links (platform pages, blog articles, memberships) were dropped on insert
 * and a reopened conversation showed the answer WITHOUT its links.
 *
 * Links now travel INSIDE the persisted body as markdown bullets:
 *
 *   "<answer text>\n- [label 1](/url-1)\n- [label 2](/url-2)"
 *
 * and are parsed back out on load, so restored history renders exactly
 * like the live chat (answer text + link chips below it).
 */

export type PersistedLink = { label: string; url: string };

/** Append links to the persisted body as markdown bullets. */
export function buildPersistBody(content: string, links?: PersistedLink[]): string {
  if (!links || links.length === 0) return content;
  return `${content}\n${links.map((l) => `- [${l.label}](${l.url})`).join("\n")}`;
}

const LINK_BULLET_RE = /^\s*-\s*\[([^\]]+)\]\(([^()\s]+)\)\s*$/;

/** Strip trailing markdown bullet links from a persisted body and
 * reconstruct the links array (exact inverse of buildPersistBody). */
export function parsePersistedBody(body: string): { content: string; links: PersistedLink[] } {
  const lines = (body || "").split("\n");
  const links: PersistedLink[] = [];
  let end = lines.length;
  while (end > 0) {
    const m = lines[end - 1].match(LINK_BULLET_RE);
    if (!m) break;
    links.unshift({ label: m[1], url: m[2] });
    end -= 1;
  }
  if (links.length === 0) return { content: body, links: [] };
  return { content: lines.slice(0, end).join("\n").replace(/\n+$/, ""), links };
}
