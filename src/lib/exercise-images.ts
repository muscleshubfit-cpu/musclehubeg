/**
 * Exercise Image Library — provides reliable, exercise-specific INSTRUCTIONAL
 * diagrams showing HOW to perform each exercise (body position + movement
 * arrows + equipment).
 *
 * Wikimedia Commons URLs are unreliable (often return 400, require specific
 * User-Agent headers, or have wrong hash paths). External image CDNs add
 * latency and can break. Instead, we use a curated mapping of exercise
 * name → instructional SVG diagram.
 *
 * Each SVG shows:
 *   - Body position (start position of the exercise)
 *   - Movement direction (curved arrows showing the path of motion)
 *   - Equipment (barbell, dumbbell, band, bodyweight)
 *   - Exercise name in Arabic + category label
 *   - Muscle group icon
 *
 * The SVGs are inline data URLs — no network request needed, they always
 * render, and they match the MuscleHub dark premium theme.
 *
 * Usage:
 *   import { getExerciseImage } from "@/lib/exercise-images";
 *   const img = getExerciseImage("بنش بريس"); // → data:image/svg+xml,...
 */

// Helper to build an instructional SVG with a stick figure + movement arrows
function buildInstructionalSVG(opts: {
  name: string;
  category: string;
  categoryAr: string;
  emoji: string;
  // Body position SVG path (stick figure in start position)
  body: string;
  // Movement arrows SVG path
  arrows?: string;
  // Equipment indicator
  equipment?: "barbell" | "dumbbell" | "band" | "bodyweight" | "kettlebell" | "machine";
  // Movement description (short instruction)
  instruction: string;
}): string {
  const equipmentIcons: Record<string, string> = {
    barbell: `<rect x='85' y='95' width='30' height='4' fill='#ffd700' rx='1'/><rect x='80' y='93' width='6' height='8' fill='#ffd700' rx='1'/><rect x='114' y='93' width='6' height='8' fill='#ffd700' rx='1'/>`,
    dumbbell: `<rect x='90' y='95' width='20' height='4' fill='#ffd700' rx='1'/><rect x='86' y='92' width='5' height='10' fill='#ffd700' rx='1'/><rect x='109' y='92' width='5' height='10' fill='#ffd700' rx='1'/>`,
    band: `<path d='M85 97 Q100 90 115 97' stroke='#ffd700' stroke-width='2' fill='none'/>`,
    bodyweight: ``,
    kettlebell: `<circle cx='100' cy='98' r='8' fill='#ffd700'/><rect x='96' y='88' width='8' height='5' fill='#ffd700' rx='2'/>`,
    machine: `<rect x='82' y='92' width='36' height='10' fill='#ffd700' rx='2' opacity='0.6'/>`,
  };

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'>
    <rect width='200' height='140' fill='#0a0a0f'/>
    <rect x='0' y='0' width='200' height='3' fill='#00d4ff'/>
    <!-- Category badge -->
    <rect x='8' y='10' width='${opts.categoryAr.length * 7 + 24}' height='18' fill='#00d4ff20' stroke='#00d4ff60' stroke-width='1' rx='4'/>
    <text x='20' y='22' font-size='10' font-weight='bold' fill='#00d4ff' font-family='sans-serif'>${opts.emoji} ${opts.categoryAr}</text>
    <!-- Body diagram area -->
    <g transform='translate(0, 10)'>
      ${opts.body}
      ${opts.arrows || ""}
      ${equipmentIcons[opts.equipment || "bodyweight"] || ""}
    </g>
    <!-- Movement arrows label -->
    ${opts.arrows ? `<text x='170' y='80' font-size='8' fill='#ffd700' text-anchor='end' font-family='sans-serif'>↻ حركة</text>` : ""}
    <!-- Exercise name -->
    <text x='100' y='128' font-size='11' font-weight='bold' text-anchor='middle' fill='#ffffff' font-family='sans-serif'>${opts.name}</text>
    <!-- Instruction -->
    <text x='100' y='138' font-size='7' text-anchor='middle' fill='#888' font-family='sans-serif'>${opts.instruction}</text>
  </svg>`;
}

// Build all exercise-specific instructional SVGs
const SVGs: Record<string, string> = {
  // ===== CHEST =====
  bench_press: buildInstructionalSVG({
    name: "بنش بريس", category: "chest", categoryAr: "صدر", emoji: "🏋️",
    equipment: "barbell",
    instruction: "استلقِ على البنش، أنزل البار للصدر وادفعه لأعلى",
    body: `<rect x='40' y='75' width='120' height='6' fill='#333' rx='2'/><circle cx='100' cy='60' r='8' fill='#00d4ff'/><rect x='92' y='68' width='16' height='12' fill='#00d4ff'/><rect x='85' y='78' width='30' height='4' fill='#00d4ff'/>`,
    arrows: `<path d='M100 88 L100 55' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#arrowUp)'/><defs><marker id='arrowUp' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  incline_press: buildInstructionalSVG({
    name: "بنش مائل", category: "chest", categoryAr: "صدر", emoji: "🏋️",
    equipment: "dumbbell",
    instruction: "بنش مائل 30°، اضغط الدمبل لأعلى بزاوية",
    body: `<rect x='45' y='70' width='110' height='6' fill='#333' rx='2' transform='rotate(-15 100 73)'/><circle cx='115' cy='55' r='8' fill='#00d4ff'/><rect x='107' y='62' width='16' height='12' fill='#00d4ff'/>`,
    arrows: `<path d='M115 75 L120 50' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#ai1)'/><defs><marker id='ai1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  pushup: buildInstructionalSVG({
    name: "ضغط أرضي", category: "chest", categoryAr: "صدر", emoji: "🤸",
    equipment: "bodyweight",
    instruction: "يدان بعرض الكتف، انزل بالصدر للأرض ثم ادفع",
    body: `<rect x='30' y='90' width='140' height='3' fill='#333'/><circle cx='60' cy='80' r='6' fill='#00d4ff'/><rect x='60' y='86' width='40' height='4' fill='#00d4ff' transform='rotate(-20 60 88)'/><rect x='55' y='78' width='6' height='14' fill='#00d4ff'/>`,
    arrows: `<path d='M70 75 L70 88' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#ap1)'/><defs><marker id='ap1' markerWidth='6' markerHeight='6' refX='3' refY='6' orient='auto'><path d='M0 0 L3 6 L6 0' fill='#ffd700'/></marker></defs>`,
  }),
  dips: buildInstructionalSVG({
    name: "ديبس", category: "chest", categoryAr: "صدر", emoji: "🤸",
    equipment: "bodyweight",
    instruction: "على المتوازي، انزل بالجسم ثم ادفع لأعلى",
    body: `<rect x='50' y='70' width='6' height='30' fill='#333'/><rect x='144' y='70' width='6' height='30' fill='#333'/><circle cx='100' cy='60' r='7' fill='#00d4ff'/><rect x='93' y='67' width='14' height='15' fill='#00d4ff'/><rect x='70' y='75' width='25' height='4' fill='#00d4ff' transform='rotate(-15 70 77)'/><rect x='105' y='75' width='25' height='4' fill='#00d4ff' transform='rotate(15 130 77)'/>`,
    arrows: `<path d='M100 85 L100 68' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#ad1)'/><defs><marker id='ad1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  chest_fly: buildInstructionalSVG({
    name: "رفرفة صدر", category: "chest", categoryAr: "صدر", emoji: "🤸",
    equipment: "dumbbell",
    instruction: "افتح الذراعين للجانبين ثم اجمعهما لأعلى",
    body: `<rect x='40' y='75' width='120' height='6' fill='#333' rx='2'/><circle cx='100' cy='60' r='7' fill='#00d4ff'/><rect x='93' y='67' width='14' height='12' fill='#00d4ff'/>`,
    arrows: `<path d='M70 75 Q60 65 70 55' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#acf1)'/><path d='M130 75 Q140 65 130 55' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#acf2)'/><defs><marker id='acf1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker><marker id='acf2' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),

  // ===== BACK =====
  deadlift: buildInstructionalSVG({
    name: "ديدليفت", category: "back", categoryAr: "ظهر", emoji: "🚣",
    equipment: "barbell",
    instruction: "ظهر مستقيم، ارفع البار بدفع الورك للأمام",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='100' cy='50' r='7' fill='#00d4ff'/><rect x='96' y='57' width='8' height='35' fill='#00d4ff'/><rect x='90' y='90' width='20' height='8' fill='#00d4ff'/><rect x='85' y='88' width='30' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M100 95 L100 60' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#adl1)'/><defs><marker id='adl1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  barbell_row: buildInstructionalSVG({
    name: "تجديف بالبار", category: "back", categoryAr: "ظهر", emoji: "🚣",
    equipment: "barbell",
    instruction: "انحنِ 45°، اسحب البار للسرة",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='70' cy='60' r='7' fill='#00d4ff'/><rect x='70' y='67' width='40' height='5' fill='#00d4ff' transform='rotate(-25 70 70)'/><rect x='65' y='85' width='30' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M80 85 L70 70' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#abr1)'/><defs><marker id='abr1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),
  dumbbell_row: buildInstructionalSVG({
    name: "تجديف بالدمبل", category: "back", categoryAr: "ظهر", emoji: "🚣",
    equipment: "dumbbell",
    instruction: "يد ورجل على البنش، اسحب الدمبل للجنب",
    body: `<rect x='30' y='80' width='100' height='6' fill='#333' rx='2'/><circle cx='90' cy='60' r='6' fill='#00d4ff'/><rect x='88' y='66' width='8' height='18' fill='#00d4ff' transform='rotate(-15 90 75)'/><rect x='105' y='78' width='15' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M115 78 L105 68' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#adr1)'/><defs><marker id='adr1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),
  pullup: buildInstructionalSVG({
    name: "عقلة", category: "back", categoryAr: "ظهر", emoji: "🚣",
    equipment: "bodyweight",
    instruction: "امسك البار، اسحب جسمك لأعلى حتى الذقن",
    body: `<rect x='50' y='30' width='100' height='4' fill='#333' rx='2'/><rect x='55' y='30' width='6' height='10' fill='#ffd700' rx='1'/><rect x='139' y='30' width='6' height='10' fill='#ffd700' rx='1'/><circle cx='100' cy='60' r='7' fill='#00d4ff'/><rect x='93' y='67' width='14' height='25' fill='#00d4ff'/>`,
    arrows: `<path d='M100 95 L100 70' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#apu1)'/><defs><marker id='apu1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  pulldown: buildInstructionalSVG({
    name: "سحب أمامي", category: "back", categoryAr: "ظهر", emoji: "🚣",
    equipment: "machine",
    instruction: "اسحب البار للصدر، الكتف للخلف",
    body: `<rect x='50' y='35' width='100' height='4' fill='#333' rx='2'/><circle cx='100' cy='65' r='7' fill='#00d4ff'/><rect x='93' y='72' width='14' height='18' fill='#00d4ff'/><rect x='85' y='50' width='30' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M100 50 L100 70' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url('#apd1')'/><defs><marker id='apd1' markerWidth='6' markerHeight='6' refX='3' refY='6' orient='auto'><path d='M0 0 L3 6 L6 0' fill='#ffd700'/></marker></defs>`,
  }),
  face_pull: buildInstructionalSVG({
    name: "فيس بول", category: "back", categoryAr: "ظهر", emoji: "🚣",
    equipment: "band",
    instruction: "اسحب الباند للوجه، افتح الكوعين",
    body: `<circle cx='100' cy='55' r='7' fill='#00d4ff'/><rect x='93' y='62' width='14' height='20' fill='#00d4ff'/><path d='M60 55 Q100 45 140 55' stroke='#ffd700' stroke-width='2' fill='none'/>`,
    arrows: `<path d='M140 55 L110 50' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#afp1)'/><path d='M60 55 L90 50' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#afp2)'/><defs><marker id='afp1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker><marker id='afp2' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),

  // ===== SHOULDERS =====
  shoulder_press: buildInstructionalSVG({
    name: "ضغط كتف", category: "shoulders", categoryAr: "أكتاف", emoji: "💪",
    equipment: "dumbbell",
    instruction: "ابدأ بمحاذاة الأذن، اضغط لأعلى فوق الرأس",
    body: `<circle cx='100' cy='50' r='7' fill='#00d4ff'/><rect x='93' y='57' width='14' height='15' fill='#00d4ff'/><rect x='80' y='60' width='10' height='4' fill='#00d4ff' transform='rotate(20 80 62)'/><rect x='110' y='60' width='10' height='4' fill='#00d4ff' transform='rotate(-20 120 62)'/>`,
    arrows: `<path d='M100 70 L100 40' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#asp1)'/><defs><marker id='asp1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  lateral_raise: buildInstructionalSVG({
    name: "رفرفة جانبية", category: "shoulders", categoryAr: "أكتاف", emoji: "💪",
    equipment: "dumbbell",
    instruction: "ارفع الذراعين للجانبين حتى مستوى الكتف",
    body: `<circle cx='100' cy='55' r='7' fill='#00d4ff'/><rect x='93' y='62' width='14' height='20' fill='#00d4ff'/>`,
    arrows: `<path d='M93 75 L60 60' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#alr1)'/><path d='M107 75 L140 60' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#alr2)'/><defs><marker id='alr1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker><marker id='alr2' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),

  // ===== LEGS =====
  squat: buildInstructionalSVG({
    name: "سكوات", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "barbell",
    instruction: "نزل للورك Parallel، الحفاظ على ظهر مستقيم",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='100' cy='45' r='7' fill='#00d4ff'/><rect x='93' y='52' width='14' height='25' fill='#00d4ff'/><rect x='85' y='77' width='30' height='18' fill='#00d4ff' rx='3'/><rect x='80' y='43' width='40' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M100 90 L100 70' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#asq1)'/><defs><marker id='asq1' markerWidth='6' markerHeight='6' refX='3' refY='6' orient='auto'><path d='M0 0 L3 6 L6 0' fill='#ffd700'/></marker></defs>`,
  }),
  leg_press: buildInstructionalSVG({
    name: "ليج بريس", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "machine",
    instruction: "ادفع المنصة للخلف، لا تقفل الركبة بالكامل",
    body: `<rect x='40' y='70' width='120' height='8' fill='#333' rx='2'/><circle cx='100' cy='50' r='6' fill='#00d4ff'/><rect x='93' y='56' width='14' height='10' fill='#00d4ff'/><rect x='80' y='65' width='40' height='5' fill='#00d4ff'/>`,
    arrows: `<path d='M100 85 L100 65' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#alp1)'/><defs><marker id='alp1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  lunge: buildInstructionalSVG({
    name: "لانجز", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "dumbbell",
    instruction: "خطوة كبيرة للأمام، الركبة خلف القدم",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='80' cy='50' r='6' fill='#00d4ff'/><rect x='74' y='56' width='12' height='20' fill='#00d4ff'/><rect x='65' y='75' width='20' height='18' fill='#00d4ff' rx='2' transform='rotate(15 75 80)'/><rect x='95' y='78' width='12' height='15' fill='#00d4ff' rx='2'/>`,
    arrows: `<path d='M85 90 L70 75' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#alu1)'/><defs><marker id='alu1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),
  leg_curl: buildInstructionalSVG({
    name: "ليج كيرل", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "machine",
    instruction: "اثني الركبة، اسحب الوزن للخلف",
    body: `<rect x='30' y='80' width='120' height='6' fill='#333' rx='2'/><circle cx='60' cy='55' r='6' fill='#00d4ff'/><rect x='55' y='61' width='10' height='18' fill='#00d4ff'/><rect x='60' y='78' width='35' height='5' fill='#00d4ff' transform='rotate(-30 70 80)'/>`,
    arrows: `<path d='M95 75 Q80 65 70 70' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#alc1)'/><defs><marker id='alc1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),
  rdl: buildInstructionalSVG({
    name: "رومانيان ديدليفت", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "barbell",
    instruction: "ظهر مستقيم، انزل بالورك للخلف",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='100' cy='50' r='6' fill='#00d4ff'/><rect x='95' y='56' width='10' height='30' fill='#00d4ff'/><rect x='90' y='85' width='20' height='8' fill='#00d4ff'/><rect x='85' y='83' width='30' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M100 85 L115 90' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#ardl1)'/><defs><marker id='ardl1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),
  hip_thrust: buildInstructionalSVG({
    name: "هيب ثرست", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "barbell",
    instruction: "ارفع الورك لأعلى، اكتم الحركة في الأعلى",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><rect x='40' y='80' width='30' height='15' fill='#333' rx='2'/><circle cx='100' cy='55' r='6' fill='#00d4ff'/><rect x='95' y='61' width='10' height='25' fill='#00d4ff' transform='rotate(15 100 75)'/><rect x='85' y='78' width='30' height='4' fill='#ffd700' rx='1'/>`,
    arrows: `<path d='M100 80 L100 60' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#aht1)'/><defs><marker id='aht1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),
  calf_raise: buildInstructionalSVG({
    name: "كاف ريز", category: "legs", categoryAr: "أرجل", emoji: "🦵",
    equipment: "dumbbell",
    instruction: "قف على أطراف القدم، ارفع لأعلى",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='100' cy='50' r='6' fill='#00d4ff'/><rect x='95' y='56' width='10' height='30' fill='#00d4ff'/><rect x='92' y='85' width='16' height='8' fill='#00d4ff'/>`,
    arrows: `<path d='M100 95 L100 80' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#acr1)'/><defs><marker id='acr1' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),

  // ===== ARMS =====
  bicep_curl: buildInstructionalSVG({
    name: "بايسبس كيرل", category: "biceps", categoryAr: "بايسبس", emoji: "💪",
    equipment: "dumbbell",
    instruction: "ثبّت الكوع، اسحب الدمبل للكتف",
    body: `<circle cx='100' cy='50' r='6' fill='#00d4ff'/><rect x='93' y='56' width='10' height='10' fill='#00d4ff'/><rect x='90' y='66' width='16' height='20' fill='#00d4ff' rx='3' transform='rotate(-30 95 76)'/>`,
    arrows: `<path d='M85 80 L100 60' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#abc1)'/><defs><marker id='abc1' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'><path d='M0 0 L6 3 L0 6' fill='#ffd700'/></marker></defs>`,
  }),
  tricep_pushdown: buildInstructionalSVG({
    name: "ترايسبس بوش داون", category: "triceps", categoryAr: "ترايسبس", emoji: "💪",
    equipment: "machine",
    instruction: "ثبّت المرفقين، ادفع البار للأسفل",
    body: `<circle cx='100' cy='45' r='6' fill='#00d4ff'/><rect x='93' y='51' width='14' height='15' fill='#00d4ff'/><rect x='90' y='66' width='20' height='5' fill='#00d4ff' transform='rotate(90 100 68)'/>`,
    arrows: `<path d='M100 75 L100 95' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#atp1)'/><defs><marker id='atp1' markerWidth='6' markerHeight='6' refX='3' refY='6' orient='auto'><path d='M0 0 L3 6 L6 0' fill='#ffd700'/></marker></defs>`,
  }),

  // ===== CORE =====
  plank: buildInstructionalSVG({
    name: "بلانك", category: "core", categoryAr: "كور", emoji: "🎯",
    equipment: "bodyweight",
    instruction: "جسم مستقيم من الرأس للكعب، شد البطن",
    body: `<rect x='30' y='90' width='140' height='3' fill='#333'/><circle cx='55' cy='78' r='5' fill='#00d4ff'/><rect x='55' y='82' width='80' height='5' fill='#00d4ff' rx='2'/><rect x='130' y='82' width='15' height='8' fill='#00d4ff' rx='2' transform='rotate(20 135 85)'/>`,
    arrows: `<text x='100' y='72' font-size='8' fill='#ffd700' text-anchor='middle' font-family='sans-serif'>⏱ استمر 30-60 ثانية</text>`,
  }),
  crunch: buildInstructionalSVG({
    name: "كرنش", category: "core", categoryAr: "كور", emoji: "🎯",
    equipment: "bodyweight",
    instruction: "ارفع الكتفين عن الأرض، انقباض البطن",
    body: `<rect x='30' y='90' width='140' height='3' fill='#333'/><circle cx='90' cy='75' r='6' fill='#00d4ff'/><rect x='75' y='80' width='50' height='8' fill='#00d4ff' rx='3' transform='rotate(-10 90 85)'/>`,
    arrows: `<path d='M90 80 L90 65' stroke='#ffd700' stroke-width='2' fill='none' marker-end='url(#acr2)'/><defs><marker id='acr2' markerWidth='6' markerHeight='6' refX='3' refY='0' orient='auto'><path d='M0 6 L3 0 L6 6' fill='#ffd700'/></marker></defs>`,
  }),

  // ===== CARDIO =====
  running: buildInstructionalSVG({
    name: "جري", category: "cardio", categoryAr: "كارديو", emoji: "🏃",
    equipment: "bodyweight",
    instruction: "حافظ على إيقاع ثابت، تنفس بانتظام",
    body: `<rect x='30' y='95' width='140' height='3' fill='#333'/><circle cx='100' cy='50' r='6' fill='#00d4ff'/><rect x='95' y='56' width='8' height='25' fill='#00d400'/><rect x='90' y='80' width='10' height='15' fill='#00d4ff' rx='2' transform='rotate(20 95 85)'/><rect x='103' y='80' width='10' height='15' fill='#00d4ff' rx='2' transform='rotate(-20 110 85)'/>`,
    arrows: `<text x='150' y='60' font-size='10' fill='#ffd700' font-family='sans-serif'>→</text>`,
  }),
};

// Default SVG for unknown exercises (generic dumbbell)
const DEFAULT_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'>
  <rect width='200' height='140' fill='#0a0a0f'/>
  <rect x='0' y='0' width='200' height='3' fill='#00d4ff'/>
  <text x='100' y='70' font-size='48' text-anchor='middle'>🏋️</text>
  <text x='100' y='105' font-size='11' font-weight='bold' text-anchor='middle' fill='#ffffff' font-family='sans-serif'>تمرين</text>
  <text x='100' y='120' font-size='8' text-anchor='middle' fill='#888' font-family='sans-serif'>أدِ التمرين بتقنية صحيحة</text>
</svg>`;

// Rest day SVG
const REST_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'>
  <rect width='200' height='140' fill='#0a0a0f'/>
  <rect x='0' y='0' width='200' height='3' fill='#ffd700'/>
  <text x='100' y='70' font-size='48' text-anchor='middle'>🛌</text>
  <text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>يوم راحة</text>
  <text x='100' y='120' font-size='8' text-anchor='middle' fill='#888' font-family='sans-serif'>استشفِ وارتاح</text>
</svg>`;

// Convert SVG to data URL
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Pre-compute data URLs
const SVG_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(SVGs).map(([k, v]) => [k, svgToDataUrl(v)]),
);
const DEFAULT_URL = svgToDataUrl(DEFAULT_SVG);
const REST_URL = svgToDataUrl(REST_SVG);

// Keyword map — maps exercise name keywords (Arabic + English) to SVG keys.
const KEYWORD_MAP: Array<{ keywords: string[]; svgKey: string }> = [
  // Bench press family
  { keywords: ["bench press", "بنش بريس", "بنش بالبار"], svgKey: "bench_press" },
  { keywords: ["incline", "مائل"], svgKey: "incline_press" },
  { keywords: ["db press", "ضغط دمبل", "دمبل مستوي"], svgKey: "incline_press" },
  { keywords: ["pushup", "push up", "push-up", "ضغط أرضي", "ضغط ارضي"], svgKey: "pushup" },
  { keywords: ["dip", "ديبس"], svgKey: "dips" },
  { keywords: ["fly", "رفرفة صدر", "رفر"], svgKey: "chest_fly" },
  // Back
  { keywords: ["deadlift", "ديدليفت"], svgKey: "deadlift" },
  { keywords: ["row", "تجديف"], svgKey: "barbell_row" },
  { keywords: ["dumbbell row", "تجديف بالدمبل", "دمبل تجديف"], svgKey: "dumbbell_row" },
  { keywords: ["pullup", "pull up", "pull-up", "عقلة"], svgKey: "pullup" },
  { keywords: ["pulldown", "سحب أمامي", "سحب امامي", "لات"], svgKey: "pulldown" },
  { keywords: ["face pull", "فيس بول"], svgKey: "face_pull" },
  // Shoulders
  { keywords: ["shoulder press", "ضغط كتف", "military", "ohp", "ضغط بالبار"], svgKey: "shoulder_press" },
  { keywords: ["lateral", "رفرفة جانبية", "جانبية"], svgKey: "lateral_raise" },
  // Legs
  { keywords: ["squat", "سكوات"], svgKey: "squat" },
  { keywords: ["leg press", "ليج بريس"], svgKey: "leg_press" },
  { keywords: ["lunge", "لانجز", "لانج"], svgKey: "lunge" },
  { keywords: ["leg curl", "ليج كيرل", "هامسترنج"], svgKey: "leg_curl" },
  { keywords: ["rdl", "روماني", "رومانيان"], svgKey: "rdl" },
  { keywords: ["hip thrust", "هيب ثرست"], svgKey: "hip_thrust" },
  { keywords: ["calf", "كاف ريز", "كاف"], svgKey: "calf_raise" },
  // Arms
  { keywords: ["bicep", "بايسبس", "curl", "كيرل"], svgKey: "bicep_curl" },
  { keywords: ["tricep", "ترايسبس", "pushdown", "بوش داون"], svgKey: "tricep_pushdown" },
  // Core
  { keywords: ["plank", "بلانك"], svgKey: "plank" },
  { keywords: ["crunch", "كرنش", "بطن", "abs"], svgKey: "crunch" },
  // Cardio
  { keywords: ["run", "جري", "cardio", "كارديو"], svgKey: "running" },
];

/**
 * Look up the best instructional image for an exercise by name.
 */
export function getExerciseImage(exerciseName: string): string {
  if (!exerciseName) return DEFAULT_URL;
  const q = exerciseName.toLowerCase().trim();

  for (const { keywords, svgKey } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        return SVG_URLS[svgKey] || DEFAULT_URL;
      }
    }
  }

  return DEFAULT_URL;
}

export function getRestDayImage(): string {
  return REST_URL;
}

export function isBrokenImage(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("upload.wikimedia.org") ||
    url.includes("wikipedia/commons") ||
    url.includes("images.unsplash.com/photo-1597452610875")
  );
}

export function resolveExerciseImage(existingUrl: string | undefined, exerciseName: string): string {
  if (existingUrl && !isBrokenImage(existingUrl)) {
    return existingUrl;
  }
  return getExerciseImage(exerciseName);
}

export const EXERCISE_CATEGORIES = [
  { id: "chest", label: "صدر", label_en: "Chest", icon: "🏋️" },
  { id: "back", label: "ظهر", label_en: "Back", icon: "🚣" },
  { id: "shoulders", label: "أكتاف", label_en: "Shoulders", icon: "💪" },
  { id: "legs", label: "أرجل", label_en: "Legs", icon: "🦵" },
  { id: "biceps", label: "بايسبس", label_en: "Biceps", icon: "💪" },
  { id: "triceps", label: "ترايسبس", label_en: "Triceps", icon: "💪" },
  { id: "core", label: "بطن/كور", label_en: "Core", icon: "🎯" },
  { id: "cardio", label: "كارديو", label_en: "Cardio", icon: "🏃" },
];
