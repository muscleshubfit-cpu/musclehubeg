"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Plus, TrendingDown, TrendingUp, Camera, Trash2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import { listProgress, addProgress, listPhotos, uploadPhoto, deletePhoto } from "@/lib/data";
import { toast } from "sonner";

// Lazy-load the chart component so recharts (~600KB) is only fetched
// when the Progress page is opened — not on every dashboard load.
const WeightChart = dynamic(
  () => import("@/components/WeightChart").then((m) => m.WeightChart),
  { ssr: false, loading: () => null },
);

export function ProgressView() {
 const { t, lang } = useI18n();
 const isAr = lang === "ar";
 const { profile } = useAuth();
 const [entries, setEntries] = useState<any[]>([]);
 const [photos, setPhotos] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [open, setOpen] = useState(false);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState<Record<string, string>>({});

 // Photo upload
 const [photoOpen, setPhotoOpen] = useState(false);
 const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
 const [photoNote, setPhotoNote] = useState("");
 const [photoFile, setPhotoFile] = useState<File | null>(null);
 const [uploadingPhoto, setUploadingPhoto] = useState(false);

 const load = async () => {
 if (!profile) return;
 setLoading(true);
 try {
 const [p, ph] = await Promise.all([
 listProgress(profile.id),
 listPhotos(profile.id),
 ]);
 setEntries(p);
 setPhotos(ph);
 } catch (e: any) {
 console.error("[ProgressView] load failed:", e?.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 load();
 }, [profile]);

 const submit = async () => {
 if (!profile) return;
 setSaving(true);
 try {
 const entry: any = { client_id: profile.id };
 // M46 fix: allow back-dating entries (default = today, max = today)
 if (form.entry_date) entry.created_at = form.entry_date;
 for (const k of ["weight", "waist", "chest", "hips", "arm", "neck", "energy", "adherence"]) {
 if (form[k]) {
 const num = Number(form[k]);
 // M45 fix: validate ranges to prevent NaN + impossible values
 if (isNaN(num)) {
 toast.error(`${k}: invalid number`);
 setSaving(false);
 return;
 }
 if (k === "weight" && (num < 20 || num > 400)) {
 toast.error(isAr ? "الوزن يجب أن يكون بين 20 و 400 كجم" : "Weight must be between 20 and 400 kg");
 setSaving(false);
 return;
 }
 if (k === "energy" && (num < 1 || num > 10)) {
 toast.error(isAr ? "الطاقة يجب أن تكون بين 1 و 10" : "Energy must be between 1 and 10");
 setSaving(false);
 return;
 }
 entry[k] = num;
 }
 }
 if (form.notes) entry.notes = form.notes;
 await addProgress(entry);
 await load();
 setForm({});
 setOpen(false);
 toast.success(t("prog.entrySaved"));
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setSaving(false);
 }
 };

 const uploadNewPhoto = async () => {
 if (!profile || !photoFile) return;
 setUploadingPhoto(true);
 try {
 await uploadPhoto(profile.id, photoFile, photoDate, photoNote);
 await load();
 setPhotoFile(null);
 setPhotoNote("");
 setPhotoOpen(false);
 toast.success(t("prog.photoUploaded"));
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setUploadingPhoto(false);
 }
 };

 const removePhoto = async (id: string, filePath?: string) => {
 if (!confirm(t("common.delete") + "?")) return;
 try {
 await deletePhoto(id, filePath);
 await load();
 toast.success(t("common.delete"));
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 }
 };

 const chartData = entries
 .filter((e) => e.weight != null)
 .map((e) => ({
 date: new Date(e.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
 weight: e.weight,
 }));

 const latest = entries[entries.length - 1];
 const first = entries[0];
 const change = latest?.weight && first?.weight ? Number(latest.weight) - Number(first.weight) : null;

 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 const fields = [
 { key: "weight", label: t("prog.weight") },
 { key: "waist", label: t("prog.waist") },
 { key: "chest", label: t("prog.chest") },
 { key: "hips", label: t("prog.hips") },
 { key: "arm", label: t("prog.arm") },
 { key: "neck", label: t("prog.neck") },
 { key: "energy", label: t("prog.energy") },
 { key: "adherence", label: t("prog.adherence") },
 ];

 return (
 <div className="space-y-8">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("prog.title")}</h1>
 <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("prog.subtitle")}</p>
 </div>
 <div className="flex gap-3">
 <button
 onClick={() => setPhotoOpen(true)}
 className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-90"
 >
 <span className="hidden sm:inline">{t("prog.uploadPhoto")}</span>
 <span className="sm:hidden">📷</span>
 </button>
 <button
 onClick={() => setOpen(true)}
 className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
 >
 {t("prog.addEntry")}
 </button>
 </div>
 </div>

 {/* Chart */}
 <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-semibold tracking-tight">{t("prog.weightChart")}</h2>
 {change !== null && change !== 0 && (
 <span className={`text-sm font-normal ${change < 0 ? "text-[#0071e3]" : "text-[#6e6e73]"}`}>
 {change < 0 ? "↓" : "↑"} {Math.abs(change).toFixed(1)} {t("common.kg")}
 </span>
 )}
 </div>
 <div className="mt-6 h-64">
 {chartData.length > 1 ? (
 <WeightChart data={chartData} />
 ) : chartData.length === 1 ? (
 // M50 fix: single entry — show a message instead of a broken chart sliver
 <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
 <p className="text-sm font-normal text-[#6e6e73]">
 {isAr ? "عندك قياس واحد. أضف قياس تاني لرؤية التوجه." : "You have one entry. Add another to see your trend."}
 </p>
 <p className="text-2xl font-semibold text-[#0071e3]">{chartData[0].weight} {t("common.kg")}</p>
 </div>
 ) : (
 <div className="flex h-full items-center justify-center text-sm font-normal text-[#6e6e73]">
 {t("prog.noEntries")}
 </div>
 )}
 </div>
 </div>

 {/* History */}
 <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
 <h2 className="text-xl font-semibold tracking-tight">{t("prog.history")}</h2>
 {entries.length === 0 ? (
 <p className="mt-4 text-sm font-normal text-[#6e6e73]">{t("prog.noEntries")}</p>
 ) : (
 <div className="mt-6 max-h-96 overflow-y-auto">
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-[#f5f5f7]">
 <tr className="border-b border-[#d2d2d7]">
 <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{t("common.date")}</th>
 <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{t("prog.weight")}</th>
 <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{t("prog.waist")}</th>
 <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{t("prog.energy")}</th>
 <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{t("common.notes")}</th>
 </tr>
 </thead>
 <tbody>
 {[...entries].reverse().map((e) => (
 <tr key={e.id} className="border-b border-[#d2d2d7]/60">
 <td className="p-3 font-normal">{new Date(e.created_at).toLocaleDateString()}</td>
 <td className="p-3 font-normal">{e.weight ?? "—"}</td>
 <td className="p-3 font-normal">{e.waist ?? "—"}</td>
 <td className="p-3 font-normal">{e.energy ?? "—"}</td>
 <td className="p-3 max-w-32 truncate font-normal text-[#6e6e73]">{e.notes || "—"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Photos Gallery */}
 <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
 <h2 className="text-xl font-semibold tracking-tight">{t("prog.photos")}</h2>
 {photos.length === 0 ? (
 <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#d2d2d7] py-12 text-center">
 <p className="text-sm font-normal text-[#6e6e73]">{t("prog.noPhotos")}</p>
 <button
 onClick={() => setPhotoOpen(true)}
 className="rounded-full bg-[#0071e3] px-5 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
 >
 {t("prog.uploadPhoto")}
 </button>
 </div>
 ) : (
 <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
 {photos.map((p) => (
 <div key={p.id} className="group relative aspect-square w-full overflow-hidden rounded-xl border border-border">
 <Image src={p.url} alt={p.note ?? "progress"} fill className="object-cover" />
 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
 <span className="text-xs text-white">
 {p.taken_on ? new Date(p.taken_on).toLocaleDateString() : ""}
 </span>
 {p.note && <p className="line-clamp-1 text-[10px] text-white/80">{p.note}</p>}
 </div>
 <button
 onClick={() => removePhoto(p.id, p.file_path)}
 className="absolute end-1 top-1 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
 aria-label={t("common.delete")}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Add Entry Dialog */}
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{t("prog.newEntry")}</DialogTitle>
 </DialogHeader>
 <div className="grid gap-3 sm:grid-cols-2">
 {/* M46 fix: date picker for back-dating entries */}
 <div className="sm:col-span-2">
 <Label htmlFor="entry_date">{isAr ? "التاريخ" : "Date"}</Label>
 <Input
 id="entry_date"
 type="date"
 value={form.entry_date ?? new Date().toISOString().slice(0, 10)}
 max={new Date().toISOString().slice(0, 10)}
 onChange={(e) => setForm((p) => ({ ...p, entry_date: e.target.value }))}
 className="mt-1.5"
 />
 </div>
 {fields.map((f) => (
 <div key={f.key}>
 <Label htmlFor={f.key}>{f.label}</Label>
 <Input
 id={f.key}
 type="number"
 value={form[f.key] ?? ""}
 onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
 className="mt-1.5"
 />
 </div>
 ))}
 <div className="sm:col-span-2">
 <Label htmlFor="notes">{t("prog.notes")}</Label>
 <Textarea
 id="notes"
 value={form.notes ?? ""}
 onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
 className="mt-1.5"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
 <Button onClick={submit} disabled={saving}>
 {saving ? t("common.saving") : t("common.save")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Upload Photo Dialog */}
 <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t("prog.uploadPhoto")}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label htmlFor="pdate">{t("common.date")}</Label>
 <Input id="pdate" type="date" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} className="mt-1.5" />
 </div>
 <div>
 <Label htmlFor="pfile">{t("common.file")}</Label>
 <Input
 id="pfile"
 type="file"
 accept="image/*"
 onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
 className="mt-1.5"
 />
 </div>
 <div>
 <Label htmlFor="pnote">{t("prog.photoNote")}</Label>
 <Input id="pnote" value={photoNote} onChange={(e) => setPhotoNote(e.target.value)} className="mt-1.5" />
 </div>
 </div>
 <DialogFooter>
 <Button variant="secondary" onClick={() => setPhotoOpen(false)}>{t("common.cancel")}</Button>
 <Button onClick={uploadNewPhoto} disabled={uploadingPhoto || !photoFile} className="gap-2">
 {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
 {uploadingPhoto ? t("common.uploading") : t("common.upload")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
