/**
 * Client-side PNG export for saved tool results.
 *
 * Draws a formatted "result card" onto a canvas and downloads it as a PNG.
 * No external libraries — uses the native Canvas 2D API.
 *
 * The card design is consistent across all 4 tools:
 *   - Dark header bar with MuscleHub logo + tool name
 *   - Big primary number (the headline metric)
 *   - Secondary metrics in a 2-column grid
 *   - Footer with date + brand
 */

type ExportArgs = {
  toolSlug: string;
  title: string;
  resultData: Record<string, any>;
  isAr: boolean;
};

const W = 1080;
const H = 1350;

const COLORS = {
  bg: "#ffffff",
  cardBg: "#f5f5f7",
  darkBg: "#1d1d1f",
  primary: "#0071e3",
  text: "#1d1d1f",
  subtext: "#6e6e73",
  border: "#d2d2d7",
  white: "#ffffff",
};

const TOOL_META: Record<
  string,
  {
    nameAr: string;
    nameEn: string;
    /** Returns: { headline: string, sublabel: string, rows: [string, string][] } */
    format: (data: any, isAr: boolean) => {
      headline: string;
      sublabel: string;
      rows: Array<[string, string]>;
    };
  }
> = {
  "calorie-calculator": {
    nameAr: "حاسبة السعرات الحرارية",
    nameEn: "Calorie Calculator",
    format: (d, isAr) => ({
      headline: `${d.target}`,
      sublabel: isAr ? "سعرة حرارية / يوم" : "calories / day",
      rows: [
        [isAr ? "BMR" : "BMR", `${d.bmr}`],
        [isAr ? "TDEE" : "TDEE", `${d.tdee}`],
        [isAr ? "بروتين" : "Protein", `${d.protein}g`],
        [isAr ? "كارب" : "Carbs", `${d.carbs}g`],
        [isAr ? "دهون" : "Fat", `${d.fat}g`],
      ],
    }),
  },
  "bmi-calculator": {
    nameAr: "حاسبة BMI",
    nameEn: "BMI Calculator",
    format: (d, isAr) => ({
      headline: `${d.bmi}`,
      sublabel: isAr ? `(${d.category})` : `(${d.category})`,
      rows: [
        [isAr ? "الفئة" : "Category", d.category],
        [isAr ? "الوزن المثالي" : "Ideal weight", `${d.idealWeightMin}–${d.idealWeightMax} kg`],
        [isAr ? "الجنس" : "Gender", d.gender || "—"],
      ],
    }),
  },
  "macro-calculator": {
    nameAr: "حاسبة الماكروز",
    nameEn: "Macro Calculator",
    format: (d, isAr) => ({
      headline: `${d.calories || d.target || "—"}`,
      sublabel: isAr ? "سعرة حرارية / يوم" : "calories / day",
      rows: [
        [isAr ? "بروتين" : "Protein", `${d.protein}g`],
        [isAr ? "كارب" : "Carbs", `${d.carbs}g`],
        [isAr ? "دهون" : "Fat", `${d.fat}g`],
      ],
    }),
  },
  "body-fat-calculator": {
    nameAr: "حاسبة الدهون",
    nameEn: "Body Fat Calculator",
    format: (d, isAr) => ({
      headline: `${d.bodyFat || d.bf || "—"}`,
      sublabel: isAr ? "% دهون" : "% body fat",
      rows: [
        [isAr ? "الفئة" : "Category", d.category || "—"],
        [isAr ? "كتلة الدهون" : "Fat mass", `${d.fatMass || "—"} kg`],
        [isAr ? "الكتلة الصافية" : "Lean mass", `${d.leanMass || "—"} kg`],
        [isAr ? "الطريقة" : "Method", d.method || "—"],
      ],
    }),
  },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function exportResultPng({
  toolSlug,
  title,
  resultData,
  isAr,
}: ExportArgs): Promise<void> {
  const meta = TOOL_META[toolSlug];
  if (!meta) throw new Error("Unknown tool slug: " + toolSlug);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");

  // Set text direction (Arabic = RTL)
  ctx.direction = isAr ? "rtl" : "ltr";
  ctx.textAlign = isAr ? "right" : "left";

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // === Header (dark band) ===
  ctx.fillStyle = COLORS.darkBg;
  drawRoundedRect(ctx, 60, 60, W - 120, 180, 32);
  ctx.fill();

  // Logo
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 56px -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("MuscleHub", 100, 130);

  // Tool name
  ctx.fillStyle = "#a1a1a6";
  ctx.font = "400 28px -apple-system, 'SF Pro Display', sans-serif";
  ctx.fillText(isAr ? meta.nameAr : meta.nameEn, 100, 180);

  // Date (right side)
  ctx.textAlign = "right";
  ctx.fillStyle = "#a1a1a6";
  ctx.font = "400 22px -apple-system, sans-serif";
  const dateStr = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  ctx.fillText(dateStr, W - 100, 130);

  // === Big headline metric (centered) ===
  const formatted = meta.format(resultData, isAr);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.primary;
  ctx.font = "bold 200px -apple-system, 'SF Pro Display', sans-serif";
  ctx.fillText(formatted.headline, W / 2, 480);

  // Sub-label
  ctx.fillStyle = COLORS.subtext;
  ctx.font = "400 36px -apple-system, sans-serif";
  ctx.fillText(formatted.sublabel, W / 2, 540);

  // === Title row (small, above the headline area) ===
  if (title) {
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 28px -apple-system, sans-serif";
    const titleLines = wrapText(ctx, title, W - 200);
    let y = 320;
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y);
      y += 36;
    }
  }

  // === Stats grid ===
  const rows = formatted.rows;
  const rowH = 130;
  const startY = 680;
  const padding = 60;
  const cardW = W - 2 * padding;

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    const y = startY + i * (rowH + 20);

    // Card background
    ctx.fillStyle = COLORS.cardBg;
    drawRoundedRect(ctx, padding, y, cardW, rowH, 24);
    ctx.fill();

    // Label (left)
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.subtext;
    ctx.font = "400 32px -apple-system, sans-serif";
    ctx.fillText(label, padding + 40, y + rowH / 2 + 12);

    // Value (right)
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 40px -apple-system, sans-serif";
    ctx.fillText(value, padding + cardW - 40, y + rowH / 2 + 14);
  }

  // === Footer ===
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.subtext;
  ctx.font = "400 24px -apple-system, sans-serif";
  ctx.fillText(
    isAr
      ? "تم الإنشاء بواسطة MuscleHub — musclehub.com"
      : "Generated by MuscleHub — musclehub.com",
    W / 2,
    H - 80,
  );

  // Convert to PNG and trigger download
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    );
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${toolSlug}-result-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
