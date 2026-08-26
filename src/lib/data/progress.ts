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

/* -------------------------------------------------------------------------- */
/* Generic data access (works with Supabase OR local store) */
/* -------------------------------------------------------------------------- */

export async function listProgress(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("progress_entries")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: true });
 return data ?? [];
 }
 return read<any[]>(LS_PROGRESS, []).filter((p) => p.client_id === clientId);
}

export async function addProgress(entry: any) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.from("progress_entries").insert(entry).select().single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PROGRESS, []);
 const newRow = { ...entry, id: uid(), created_at: new Date().toISOString() };
 all.push(newRow);
 write(LS_PROGRESS, all);
 return newRow;
}

// ---------------------------------------------------------------------------
// Progress Photos
// ---------------------------------------------------------------------------

export async function listPhotos(userId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("progress_photos")
 .select("*")
 .eq("user_id", userId)
 .order("taken_on", { ascending: false });
 if (!data) return [];
 // Generate signed URLs for each photo
 const withUrls = await Promise.all(
 data.map(async (p: any) => {
 const { data: signed } = await supabase!.storage
 .from("progress-photos")
 .createSignedUrl(p.file_path, 3600);
 return { ...p, url: signed?.signedUrl ?? "" };
 }),
 );
 return withUrls;
 }
 return read<any[]>(LS_PREFIX + "photos", []).filter((p) => p.user_id === userId);
}

export async function uploadPhoto(userId: string, file: File, date: string, note: string) {
 // M7 fix: validate file type + size before uploading
 validateUploadFile(file, ["image/jpeg", "image/png", "image/webp"], 5 * 1024 * 1024);
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `${userId}/${Date.now()}.${ext}`;
 const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file);
 if (upErr) throw new Error(upErr.message);
 const { data, error } = await supabase
 .from("progress_photos")
 .insert({ user_id: userId, file_path: path, taken_on: date, note: note || null })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 // Local fallback
 const all = read<any[]>(LS_PREFIX + "photos", []);
 const row = { id: uid(), user_id: userId, file_path: "", taken_on: date, note, created_at: new Date().toISOString(), url: URL.createObjectURL(file) };
 all.push(row);
 write(LS_PREFIX + "photos", all);
 return row;
}

export async function deletePhoto(id: string, filePath?: string) {
 if (isSupabaseConfigured && supabase) {
 if (filePath) await supabase.storage.from("progress-photos").remove([filePath]);
 await supabase.from("progress_photos").delete().eq("id", id);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "photos", []);
 write(LS_PREFIX + "photos", all.filter((p) => p.id !== id));
}
