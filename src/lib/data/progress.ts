"use client";

import {
 supabase,
 isSupabaseConfigured,
 validateUploadFile,
 read,
 write,
 uid,
 LS_PROGRESS,
 LS_PREFIX,
} from "./helpers";
import { compressImageFile } from "@/lib/image-compress";
import type { Database, ProgressEntry, ProgressPhoto } from "@/lib/supabase/types";

/** Input shape for addProgress (progress_entries Insert — client_id required). */
export type ProgressEntryInsert = Database["public"]["Tables"]["progress_entries"]["Insert"];

/* -------------------------------------------------------------------------- */
/* Generic data access (works with Supabase OR local store) */
/* -------------------------------------------------------------------------- */

export async function listProgress(clientId: string): Promise<ProgressEntry[]> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("progress_entries")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: true });
 return data ?? [];
 }
 return read<ProgressEntry[]>(LS_PROGRESS, []).filter((p) => p.client_id === clientId);
}

export async function addProgress(entry: ProgressEntryInsert): Promise<ProgressEntry> {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.from("progress_entries").insert(entry).select().single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<ProgressEntry[]>(LS_PROGRESS, []);
 // Explicit Row build: Insert fields are optional, Row requires every column.
 const newRow: ProgressEntry = {
 id: uid(),
 client_id: entry.client_id,
 weight: entry.weight ?? null,
 waist: entry.waist ?? null,
 chest: entry.chest ?? null,
 hips: entry.hips ?? null,
 arm: entry.arm ?? null,
 neck: entry.neck ?? null,
 energy: entry.energy ?? null,
 adherence: entry.adherence ?? null,
 notes: entry.notes ?? null,
 created_at: entry.created_at ?? new Date().toISOString(),
 };
 all.push(newRow);
 write(LS_PROGRESS, all);
 return newRow;
}

// ---------------------------------------------------------------------------
// Progress Photos
// ---------------------------------------------------------------------------

export async function listPhotos(userId: string): Promise<Array<ProgressPhoto & { url: string }>> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("progress_photos")
 .select("*")
 .eq("user_id", userId)
 .order("taken_at", { ascending: false });
 if (!data) return [];
 // Generate signed URLs for each photo (photo_url stores the STORAGE
 // PATH — Phase 105 renamed from the phantom file_path mirror column)
 const withUrls = await Promise.all(
 data.map(async (p) => {
 const { data: signed } = await supabase!.storage
 .from("progress-photos")
 .createSignedUrl(p.photo_url, 3600);
 return { ...p, url: signed?.signedUrl ?? "" };
 }),
 );
 return withUrls;
 }
 return read<ProgressPhoto[]>(LS_PREFIX + "photos", [])
 .filter((p) => p.user_id === userId)
 .map((p) => ({ ...p, url: "" }));
}

export async function uploadPhoto(userId: string, file: File, date: string) {
 // M7 fix: validate file type + size before uploading
 validateUploadFile(file, ["image/jpeg", "image/png", "image/webp"], 5 * 1024 * 1024);
 // Phase 98: compress ON-DEVICE before upload — phone photos arrive at
 // 3-8MB and are stored forever; a ~1600px WebP (~200-400KB) renders
 // identically on every screen. The helper NEVER throws and returns the
 // original file whenever compression is impossible or not smaller.
 file = await compressImageFile(file, { maxDim: 1600, quality: 0.82 });
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `${userId}/${Date.now()}.${ext}`;
 const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file);
 if (upErr) throw new Error(upErr.message);
 // Phase 105: live columns are photo_url (storage path) + taken_at —
 // the old file_path/taken_on/note insert was the mirror fiction and
 // failed silently on production (42703-class drift, Phase 99-run)
 const { data, error } = await supabase
 .from("progress_photos")
 .insert({ user_id: userId, photo_url: path, taken_at: date })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 // Local fallback
 const all = read<ProgressPhoto[]>(LS_PREFIX + "photos", []);
 const row: ProgressPhoto & { url: string } = { id: uid(), user_id: userId, photo_url: "", taken_at: date, created_at: new Date().toISOString(), url: URL.createObjectURL(file) };
 all.push(row);
 write(LS_PREFIX + "photos", all);
 return row;
}

export async function deletePhoto(id: string, storagePath?: string) {
 if (isSupabaseConfigured && supabase) {
 if (storagePath) await supabase.storage.from("progress-photos").remove([storagePath]);
 await supabase.from("progress_photos").delete().eq("id", id);
 return;
 }
 const all = read<ProgressPhoto[]>(LS_PREFIX + "photos", []);
 write(LS_PREFIX + "photos", all.filter((p) => p.id !== id));
}
