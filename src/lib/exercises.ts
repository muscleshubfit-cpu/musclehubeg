/**
 * Exercise Library — database of exercises with full metadata.
 *
 * Each exercise has:
 *   - slug (URL-friendly ID)
 *   - name (Arabic + English)
 *   - category (chest, back, shoulders, legs, biceps, triceps, core, cardio)
 *   - equipment (barbell, dumbbell, bodyweight, cable, machine, kettlebell, none)
 *   - level (beginner, intermediate, advanced)
 *   - primary muscles + secondary muscles
 *   - instructions (step-by-step, bilingual)
 *   - tips (common mistakes to avoid)
 *   - image URL (from wger.de via exercise-images.ts)
 */

export type ExerciseCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "legs"
  | "biceps"
  | "triceps"
  | "core"
  | "cardio";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "bodyweight"
  | "cable"
  | "machine"
  | "kettlebell"
  | "band"
  | "none";

export type Level = "beginner" | "intermediate" | "advanced";

export type Exercise = {
  slug: string;
  nameAr: string;
  nameEn: string;
  category: ExerciseCategory;
  equipment: Equipment;
  level: Level;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructionsAr: string[];
  instructionsEn: string[];
  tipsAr: string[];
  tipsEn: string[];
  imageKey: string; // key into WGER_IMAGES in exercise-images.ts
};

export const EQUIPMENT_LABELS: Record<Equipment, { ar: string; en: string }> = {
  barbell: { ar: "بار", en: "Barbell" },
  dumbbell: { ar: "دمبل", en: "Dumbbell" },
  bodyweight: { ar: "وزن الجسم", en: "Bodyweight" },
  cable: { ar: "كابل", en: "Cable" },
  machine: { ar: "ماكينة", en: "Machine" },
  kettlebell: { ar: "كيتل بيل", en: "Kettlebell" },
  band: { ar: "مطاط", en: "Resistance Band" },
  none: { ar: "بدون معدات", en: "No Equipment" },
};

export const LEVEL_LABELS: Record<Level, { ar: string; en: string; color: string }> = {
  beginner: { ar: "مبتدئ", en: "Beginner", color: "#34c759" },
  intermediate: { ar: "متوسط", en: "Intermediate", color: "#ff9500" },
  advanced: { ar: "متقدم", en: "Advanced", color: "#ff3b30" },
};

export const CATEGORY_LABELS: Record<ExerciseCategory, { ar: string; en: string; emoji: string }> = {
  chest: { ar: "صدر", en: "Chest", emoji: "💪" },
  back: { ar: "ظهر", en: "Back", emoji: "🔙" },
  shoulders: { ar: "أكتاف", en: "Shoulders", emoji: "🏆" },
  legs: { ar: "أرجل", en: "Legs", emoji: "🦵" },
  biceps: { ar: "بايسبس", en: "Biceps", emoji: "💪" },
  triceps: { ar: "ترايسبس", en: "Triceps", emoji: "💪" },
  core: { ar: "بطن/كور", en: "Core", emoji: "🎯" },
  cardio: { ar: "كارديو", en: "Cardio", emoji: "❤️" },
};

export const EXERCISES: Exercise[] = [
  // ==================== CHEST ====================
  {
    slug: "bench-press",
    nameAr: "بنش بريس",
    nameEn: "Bench Press",
    category: "chest",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الصدر", "Chest"],
    secondaryMuscles: ["الترايسبس", "الكتف الأمامي"],
    instructionsAr: [
      "استلقِ على البنش بحيث عينك تحت البار مباشرة.",
      "امسك البار بقبضة أعرض قليلاً من الكتفين.",
      "أنزل البار ببطء حتى الصدر (عند مستوى الحلمة).",
      "ادفع البار لأعلى حتى استقامة الذراعين، مع الزفير.",
    ],
    instructionsEn: [
      "Lie on the bench with your eyes directly under the bar.",
      "Grip the bar slightly wider than shoulder-width.",
      "Lower the bar slowly to your chest (nipple level).",
      "Press the bar up until arms are fully extended, exhaling.",
    ],
    tipsAr: [
      "حافظ على ثبات الكتفين للخلف ولأسفل طوال الحركة.",
      "لا ترد البار على صدرك — حافظ على تحكم كامل.",
      "القدمين مثبتتان على الأرض، لا ترفع المؤخرة عن البنش.",
    ],
    tipsEn: [
      "Keep shoulders retracted and down throughout the movement.",
      "Don't bounce the bar off your chest — maintain control.",
      "Feet planted on the floor, don't lift your glutes off the bench.",
    ],
    imageKey: "bench press",
  },
  {
    slug: "push-up",
    nameAr: "ضغط أرضي (بوش أب)",
    nameEn: "Push-up",
    category: "chest",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["الصدر", "Chest"],
    secondaryMuscles: ["الترايسبس", "الكتف الأمامي", "الكور"],
    instructionsAr: [
      "ابدأ في وضع البلانك العالي، يديك أعرض قليلاً من الكتفين.",
      "حافظ على استقامة الجسم من الرأس للكعب.",
      "أنزل جسمك ببطء حتى يقترب صدرك من الأرض.",
      "ادفع جسمك لأعلى حتى استقامة الذراعين.",
    ],
    instructionsEn: [
      "Start in a high plank position, hands slightly wider than shoulders.",
      "Keep your body in a straight line from head to heels.",
      "Lower your body slowly until your chest nearly touches the floor.",
      "Push back up until your arms are straight.",
    ],
    tipsAr: [
      "لا تدع الورك يهبط — الكور مشدود طوال الحركة.",
      "المرفقين بزاوية 45 درجة، ليس متسعين تماماً.",
      "للمبتدئين: ابدأ على الركبتين لو كان صعب.",
    ],
    tipsEn: [
      "Don't let your hips sag — keep your core engaged.",
      "Elbows at 45 degrees, not flared wide.",
      "Beginners: start on knees if too difficult.",
    ],
    imageKey: "push-up",
  },
  {
    slug: "dips",
    nameAr: "ديبس",
    nameEn: "Dips",
    category: "chest",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["الصدر السفلي", "الترايسبس"],
    secondaryMuscles: ["الكتف الأمامي"],
    instructionsAr: [
      "امسك المتوازي وارفع جسمك للأعلى مع استقامة الذراعين.",
      "الميل للأمام قليلاً لاستهداف الصدر.",
      "أنزل جسمك ببطء حتى تشعر بتمدد الصدر.",
      "ادفع جسمك لأعلى للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Grip the parallel bars and lift your body up with straight arms.",
      "Lean forward slightly to target the chest.",
      "Lower your body slowly until you feel a stretch in your chest.",
      "Push back up to the starting position.",
    ],
    tipsAr: [
      "لا تنزل أكثر من اللازم — يسبب إجهاد للكتف.",
      "حافظ على استقامة الظهر، لا تدوره.",
    ],
    tipsEn: [
      "Don't go too deep — causes shoulder strain.",
      "Keep your back straight, don't round it.",
    ],
    imageKey: "dips",
  },

  // ==================== BACK ====================
  {
    slug: "pull-up",
    nameAr: "عقلة",
    nameEn: "Pull-up",
    category: "back",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["الظهر العريض", "Lats"],
    secondaryMuscles: ["البايسبس", "الكتف الخلفي"],
    instructionsAr: [
      "امسك البار بقبضة أعرض من الكتفين (كف اليد للأمام).",
      "ابدأ من وضع التعليق الكامل مع استقامة الذراعين.",
      "اسحب جسمك لأعلى حتى تتجاوز ذقنك البار.",
      "أنزل جسمك ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Grip the bar wider than shoulder-width (palms forward).",
      "Start from a dead hang with arms fully extended.",
      "Pull your body up until your chin clears the bar.",
      "Lower your body slowly back to the starting position.",
    ],
    tipsAr: [
      "لا تتأرجح — حركة كاملة وثابتة.",
      "ركز على شد لوحي الكتف للخلف ولأسفل.",
      "للمبتدئين: استخدم المطاط المساعد أو آلة العقلة.",
    ],
    tipsEn: [
      "Don't swing — controlled, full range of motion.",
      "Focus on pulling shoulder blades down and back.",
      "Beginners: use resistance bands or assisted pull-up machine.",
    ],
    imageKey: "pull-up",
  },
  {
    slug: "seated-cable-row",
    nameAr: "تجديف بالكابل",
    nameEn: "Seated Cable Row",
    category: "back",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["الظهر", "ألياف الظهر العريض"],
    secondaryMuscles: ["البايسبس", "الكتف الخلفي"],
    instructionsAr: [
      "اجلس على المقعد مع ثني الركبتين قليلاً.",
      "امسك المقبض، الظهر مستقيم، الصدر مرفوع.",
      "اسحب المقبض نحو بطنك، شد لوحي الكتف معاً.",
      "أعد الكابل ببطء للوضع الابتدائي مع تمديد كامل.",
    ],
    instructionsEn: [
      "Sit on the seat with knees slightly bent.",
      "Grab the handle, back straight, chest up.",
      "Pull the handle toward your abdomen, squeezing shoulder blades.",
      "Return the cable slowly to the starting position with full extension.",
    ],
    tipsAr: [
      "لا تتمايل للخلف — حافظ على استقامة الظهر.",
      "ركز على شد لوحي الكتف، مش الذراعين بس.",
    ],
    tipsEn: [
      "Don't lean back — keep your back straight.",
      "Focus on squeezing shoulder blades, not just arms.",
    ],
    imageKey: "seated cable row",
  },
  {
    slug: "hyperextensions",
    nameAr: "هايبر إكستنشن",
    nameEn: "Hyperextensions",
    category: "back",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["الظهر السفلي", "Lower Back"],
    secondaryMuscles: ["الألياف", "الكور"],
    instructionsAr: [
      "استلقِ على جهاز الهايبر مع تثبيت القدمين.",
      "ابدأ بجسمك مستقيم، النصف العلوي منحنى للأسفل.",
      "ارفع النصف العلوي ببطء حتى يصبح مستقيماً.",
      "أنزل للوضع الابتدائي ببطء.",
    ],
    instructionsEn: [
      "Position yourself on the hyperextension bench with feet secured.",
      "Start with your body straight, upper body bent down.",
      "Slowly raise your upper body until it's in a straight line.",
      "Lower back to starting position slowly.",
    ],
    tipsAr: [
      "لا ترفع أكثر من اللازم — يسبب إجهاد للظهر.",
      "حافظ على استقامة الرقبة، لا ترفع رأسك.",
    ],
    tipsEn: [
      "Don't overextend — causes back strain.",
      "Keep your neck neutral, don't crane your head.",
    ],
    imageKey: "hyperextensions",
  },

  // ==================== SHOULDERS ====================
  {
    slug: "arnold-press",
    nameAr: "أرنولد بريس",
    nameEn: "Arnold Press",
    category: "shoulders",
    equipment: "dumbbell",
    level: "intermediate",
    primaryMuscles: ["الكتف", "Shoulders"],
    secondaryMuscles: ["الترايسبس"],
    instructionsAr: [
      "اجلس مع استقامة الظهر، امسك الدمبل بأكف اليد مواجهة لك.",
      "ابدأ بالدمبل عند مستوى الصدر، المرفقين للأسفل.",
      "ادفع الدمبل لأعلى مع تدوير الأكف للأمام تدريجياً.",
      "في الأعلى، الأكف مواجهة للأمام، الذراعين مستقيمين.",
    ],
    instructionsEn: [
      "Sit with back straight, hold dumbbells with palms facing you.",
      "Start with dumbbells at chest level, elbows down.",
      "Press dumbbells up while gradually rotating palms forward.",
      "At the top, palms face forward, arms fully extended.",
    ],
    tipsAr: [
      "الحركة دائرية كاملة — التدوير جزء أساسي.",
      "لا تستخدم وزن ثقيل جداً في البداية.",
    ],
    tipsEn: [
      "Full rotational movement — the rotation is essential.",
      "Don't use too heavy weight initially.",
    ],
    imageKey: "arnold press",
  },

  // ==================== LEGS ====================
  {
    slug: "barbell-squat",
    nameAr: "سكوات بالبار",
    nameEn: "Barbell Squat",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الفخذ الخلفي", "الألياف", "الكور"],
    instructionsAr: [
      "ضع البار على أعلى الظهر (فوق لوحي الكتف)، ليس على الرقبة.",
      "القدمين بعرض الكتفين، الأصابع مواجهة للأمام أو مائلة قليلاً.",
      "انزل ببطء كأنك تجلس على كرسي، حتى يوازي الفخذ الأرض.",
      "ادفع للأعلى من الكعب، مع استقامة الجسم.",
    ],
    instructionsEn: [
      "Place the bar on your upper back (on shoulder blades), not on neck.",
      "Feet shoulder-width, toes forward or slightly out.",
      "Lower slowly as if sitting in a chair, until thighs parallel to floor.",
      "Push up through your heels, keeping your body straight.",
    ],
    tipsAr: [
      "الركبتان في اتجاه الأصابع — لا تدعها تنحرف للداخل.",
      "حافظ على استقامة الظهر، لا تدوره للأمام.",
      "انزل للأسفل، لا للأمام.",
    ],
    tipsEn: [
      "Knees track over toes — don't let them cave inward.",
      "Keep your back straight, don't round forward.",
      "Go down, not forward.",
    ],
    imageKey: "squat",
  },
  {
    slug: "leg-press",
    nameAr: "ليج بريس",
    nameEn: "Leg Press",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الفخذ الخلفي", "الألياف"],
    instructionsAr: [
      "اجلس على الماكينة، الظهر مثبت، القدمين على المنصة بعرض الكتفين.",
      "حرر القفل وأنزل المنصة ببطء نحوك.",
      "أنزل حتى زاوية 90 درجة في الركبة.",
      "ادفع المنصة لأعلى لاستقامة الأرجل (دون قفل الركبة).",
    ],
    instructionsEn: [
      "Sit on the machine, back supported, feet on platform shoulder-width.",
      "Release the safety and lower the platform toward you slowly.",
      "Lower until knees reach 90 degrees.",
      "Push the platform up until legs are straight (without locking knees).",
    ],
    tipsAr: [
      "لا تقفل الركبتين في الأعلى — يسبب إجهاد.",
      "القدمين عالياً = تركيز على الألياف، واطياً = تركيز على الفخذ.",
    ],
    tipsEn: [
      "Don't lock knees at the top — causes strain.",
      "Feet high = glutes focus, feet low = quads focus.",
    ],
    imageKey: "leg press",
  },
  {
    slug: "leg-extension",
    nameAr: "ليج إكستنشن",
    nameEn: "Leg Extension",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: [],
    instructionsAr: [
      "اجلس على الماكينة، القدمين تحت الوسادة.",
      "ارفع الوسادة لأعلى بدفع الساق، حتى استقامة الركبة.",
      "اشد العضلة في الأعلى لمدة ثانية.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Sit on the machine, feet under the pad.",
      "Lift the pad by extending your legs until knees are straight.",
      "Squeeze the muscle at the top for one second.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تستخدم وزن ثقيل — الحركة معزولة.",
      "لا ترد الساق بسرعة — نزل ببطء.",
    ],
    tipsEn: [
      "Don't use heavy weight — it's an isolation movement.",
      "Don't bounce back — lower slowly.",
    ],
    imageKey: "leg extension",
  },
  {
    slug: "leg-curl",
    nameAr: "ليج كيرل",
    nameEn: "Leg Curl",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["الفخذ الخلفي", "Hamstrings"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على الماكينة، الوسادة فوق الكعب.",
      "اثنِ الساق لرفع الوسادة نحو المؤخرة.",
      "اشد الفخذ الخلفي في الأعلى.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Lie on the machine, pad above your heels.",
      "Bend your knees to lift the pad toward your glutes.",
      "Squeeze your hamstrings at the top.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا ترفع الورك — حافظ على استقرار الجسم.",
      "الحركة كاملة وثابتة، بلا اندفاع.",
    ],
    tipsEn: [
      "Don't lift your hips — keep your body stable.",
      "Full controlled movement, no momentum.",
    ],
    imageKey: "leg curl",
  },
  {
    slug: "lunges",
    nameAr: "لانجز",
    nameEn: "Lunges",
    category: "legs",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الفخذ الخلفي", "الألياف"],
    instructionsAr: [
      "قف معتدلاً، القدمين بعرض الورك.",
      "اخطُ خطوة كبيرة للأمام، وأنزل جسمك حتى زاوية 90 درجة في الركبتين.",
      "الركبة الخلفية تقترب من الأرض دون لمسها.",
      "ادفع بقدمك الأمامية للعودة للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, feet hip-width apart.",
      "Take a big step forward, lowering until both knees are at 90 degrees.",
      "Back knee close to floor without touching.",
      "Push through your front foot to return to starting position.",
    ],
    tipsAr: [
      "الركبة الأمامية لا تتجاوز أصابع القدم.",
      "حافظ على استقامة الجذع، الكور مشدود.",
    ],
    tipsEn: [
      "Front knee doesn't go past toes.",
      "Keep torso upright, core engaged.",
    ],
    imageKey: "lunges",
  },
  {
    slug: "hip-thrust",
    nameAr: "هيب ثرست",
    nameEn: "Hip Thrust",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الألياف", "Glutes"],
    secondaryMuscles: ["الفخذ الخلفي"],
    instructionsAr: [
      "اجلس على الأرض، أعلى الظهر على بنش ثابت.",
      "ضع البار على الورك، القدمين مسطحتين على الأرض.",
      "ادفع الورك لأعلى حتى يصبح الجسم مستقيماً.",
      "اشد الألياف في الأعلى، ثم أنزل ببطء.",
    ],
    instructionsEn: [
      "Sit on the floor, upper back against a flat bench.",
      "Place bar on your hips, feet flat on the floor.",
      "Drive your hips up until your body is in a straight line.",
      "Squeeze glutes at the top, then lower slowly.",
    ],
    tipsAr: [
      "لا تقوس الظهر في الأعلى — استخدم الألياف.",
      "الذقن للصدر لتفادي إجهاد الرقبة.",
    ],
    tipsEn: [
      "Don't arch your back at the top — use glutes.",
      "Tuck chin to chest to avoid neck strain.",
    ],
    imageKey: "hip thrust",
  },

  // ==================== BICEPS ====================
  {
    slug: "dumbbell-curl",
    nameAr: "بايسبس بالدمبل",
    nameEn: "Dumbbell Curl",
    category: "biceps",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["البايسبس", "Biceps"],
    secondaryMuscles: ["الساعد"],
    instructionsAr: [
      "قف معتدلاً، امسك الدمبل في كل يد، الأكف مواجهة للجسم.",
      "اثنِ المرفق لرفع الدمبل مع تدوير الكف للأعلى.",
      "اشد البايسبس في الأعلى.",
      "أنزل ببطء مع تدوير الكف للداخل مرة أخرى.",
    ],
    instructionsEn: [
      "Stand tall, hold a dumbbell in each hand, palms facing body.",
      "Bend elbow to lift dumbbell while rotating palm upward.",
      "Squeeze biceps at the top.",
      "Lower slowly while rotating palm back inward.",
    ],
    tipsAr: [
      "لا تتمايل بالجسم — حركة معزولة.",
      "المرفق ثابت بجانب الجسم، لا ترفعه.",
    ],
    tipsEn: [
      "Don't swing your body — isolated movement.",
      "Keep elbows fixed at your sides, don't lift them.",
    ],
    imageKey: "dumbbell curl",
  },

  // ==================== TRICEPS ====================
  {
    slug: "triceps-pushdown",
    nameAr: "ترايسبس بوش داون",
    nameEn: "Triceps Pushdown",
    category: "triceps",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["الترايسبس", "Triceps"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف أمام آلة الكابل، امسك البار العلوي.",
      "المرفقين ثابتين بجانب الجسم، الأكف مواجهة للأسفل.",
      "ادفع البار للأسفل حتى استقامة الذراعين.",
      "اشد الترايسبس في الأسفل، ثم أعد ببطء.",
    ],
    instructionsEn: [
      "Stand in front of cable machine, grip the upper bar.",
      "Elbows fixed at your sides, palms facing down.",
      "Push the bar down until arms are fully extended.",
      "Squeeze triceps at the bottom, return slowly.",
    ],
    tipsAr: [
      "لا تستخدم الوزن كله من الكتف — الحركة من المرفق.",
      "لا ترد — نزل ببطء.",
    ],
    tipsEn: [
      "Don't use shoulders — movement is from elbow.",
      "Don't bounce — lower slowly.",
    ],
    imageKey: "triceps pushdown",
  },

  // ==================== CORE ====================
  {
    slug: "plank",
    nameAr: "بلانك",
    nameEn: "Plank",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["الكور", "Core"],
    secondaryMuscles: ["الكتف", "الألياف"],
    instructionsAr: [
      "ابدأ في وضع البلانك السفلي، الساعدان على الأرض.",
      "الجسم مستقيم من الرأس للكعب.",
      "اشد الكور والألياف، حافظ على الوضع.",
      "تنفس بثبات، لا تحبس النفس.",
    ],
    instructionsEn: [
      "Start in a forearm plank position, forearms on the floor.",
      "Body in a straight line from head to heels.",
      "Engage core and glutes, hold the position.",
      "Breathe steadily, don't hold your breath.",
    ],
    tipsAr: [
      "لا تدع الورك يهبط أو يرتفع.",
      "التركيز على شد الكور، ليس الوقت.",
    ],
    tipsEn: [
      "Don't let hips sag or rise.",
      "Focus on core engagement, not time.",
    ],
    imageKey: "plank",
  },
  {
    slug: "crunches",
    nameAr: "كرنش",
    nameEn: "Crunches",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["البطن العلوي", "Upper Abs"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على ظهرك، الركبتان مثنيتان، اليدان خلف الرأس.",
      "ارفع الكتفين عن الأرض بشد البطن.",
      "اشد البطن في الأعلى لمدة ثانية.",
      "أنزل ببطء دون لمس الأرض بالكامل.",
    ],
    instructionsEn: [
      "Lie on your back, knees bent, hands behind head.",
      "Lift shoulders off the floor by contracting abs.",
      "Squeeze abs at the top for one second.",
      "Lower slowly without fully touching the floor.",
    ],
    tipsAr: [
      "لا تشد الرقبة بيديك — الحركة من البطن.",
      "لا ترفع الظهر كله — الكتفين فقط.",
    ],
    tipsEn: [
      "Don't pull your neck with hands — movement from abs.",
      "Don't lift entire back — just shoulders.",
    ],
    imageKey: "crunches",
  },
  {
    slug: "russian-twist",
    nameAr: "تويست روسي",
    nameEn: "Russian Twist",
    category: "core",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["المائلين", "Obliques"],
    secondaryMuscles: ["البطن"],
    instructionsAr: [
      "اجلس على الأرض، الركبتين مثنيتان، القدمين مرفوعتين قليلاً.",
      "أمِل الجذع للخلف قليلاً، الكور مشدود.",
      "لُف الجذع يميناً ويساراً بالتناوب.",
      "أمسك وزن (طبق أو دمبل) لزيادة الصعوبة.",
    ],
    instructionsEn: [
      "Sit on the floor, knees bent, feet slightly lifted.",
      "Lean back slightly, core engaged.",
      "Twist torso side to side alternately.",
      "Hold a weight (plate or dumbbell) to increase difficulty.",
    ],
    tipsAr: [
      "الحركة من الجذع، ليس من الأذرع.",
      "حافظ على استقامة الظهر.",
    ],
    tipsEn: [
      "Movement from torso, not arms.",
      "Keep your back straight.",
    ],
    imageKey: "russian twist",
  },
  {
    slug: "mountain-climbers",
    nameAr: "تسلق الجبل",
    nameEn: "Mountain Climbers",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["الكور", "Core"],
    secondaryMuscles: ["الكتف", "الفخذ"],
    instructionsAr: [
      "ابدأ في وضع البلانك العالي، يديك تحت الكتفين.",
      "اسحب ركبة واحدة نحو صدرك بسرعة.",
      "أعد الساق وكرر بالأخرى، كأنك تجري.",
      "حافظ على استقرار الورك والأكتاف.",
    ],
    instructionsEn: [
      "Start in a high plank, hands under shoulders.",
      "Drive one knee toward your chest quickly.",
      "Return leg and repeat with the other, as if running.",
      "Keep hips and shoulders stable.",
    ],
    tipsAr: [
      "لا ترتفع الورك — حافظ على استقامة الجسم.",
      "السرعة مع التحكم، ليس على حساب الشكل.",
    ],
    tipsEn: [
      "Don't let hips rise — keep body straight.",
      "Speed with control, not at the expense of form.",
    ],
    imageKey: "mountain climbers",
  },

  // ==================== CARDIO ====================
  {
    slug: "burpees",
    nameAr: "بربي",
    nameEn: "Burpees",
    category: "cardio",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["كامل الجسم", "Full Body"],
    secondaryMuscles: ["الصدر", "الأرجل", "الكور"],
    instructionsAr: [
      "قف معتدلاً، ثم انزل للقرفصاء.",
      "ضع يديك على الأرض واقفز بقدميك للخلف لوضع البلانك.",
      "أدِّ بوش أب واحد.",
      "اقفز بقدميك للأمام، ثم اقفز للأعلى معتدلاً.",
    ],
    instructionsEn: [
      "Stand tall, then lower into a squat.",
      "Place hands on floor and jump feet back to plank.",
      "Do one push-up.",
      "Jump feet forward, then jump up explosively to standing.",
    ],
    tipsAr: [
      "حافظ على وتيرة ثابتة — ليست سباق.",
      "لو صعب، شيل بوش أب أو القفزة.",
    ],
    tipsEn: [
      "Maintain steady pace — not a sprint.",
      "If too hard, skip the push-up or the jump.",
    ],
    imageKey: "burpees",
  },
  {
    slug: "jumping-jacks",
    nameAr: "جمبينج جاكس",
    nameEn: "Jumping Jacks",
    category: "cardio",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["كامل الجسم", "Full Body"],
    secondaryMuscles: ["الأكتاف", "الأرجل"],
    instructionsAr: [
      "قف معتدلاً، اليدان بجانب الجسم.",
      "اقفز مع فتح القدمين ورفع الذراعين فوق الرأس.",
      "اقفز مرة أخرى للعودة للوضع الابتدائي.",
      "حافظ على الوتيرة.",
    ],
    instructionsEn: [
      "Stand tall, hands at your sides.",
      "Jump while spreading feet and raising arms overhead.",
      "Jump again to return to starting position.",
      "Maintain rhythm.",
    ],
    tipsAr: [
      "حافظ على ليونة الركبتين.",
      "تنفس بثبات.",
    ],
    tipsEn: [
      "Keep knees soft.",
      "Breathe steadily.",
    ],
    imageKey: "jumping jacks",
  },
];

// ==================== Helpers ====================

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return EXERCISES.find((e) => e.slug === slug);
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => e.category === category);
}

export function filterExercises(params: {
  category?: ExerciseCategory | "all";
  equipment?: Equipment | "all";
  level?: Level | "all";
  search?: string;
}): Exercise[] {
  let result = EXERCISES;
  if (params.category && params.category !== "all") {
    result = result.filter((e) => e.category === params.category);
  }
  if (params.equipment && params.equipment !== "all") {
    result = result.filter((e) => e.equipment === params.equipment);
  }
  if (params.level && params.level !== "all") {
    result = result.filter((e) => e.level === params.level);
  }
  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.nameAr.toLowerCase().includes(q) ||
        e.nameEn.toLowerCase().includes(q) ||
        e.primaryMuscles.some((m) => m.toLowerCase().includes(q)),
    );
  }
  return result;
}

export function getRelatedExercises(exercise: Exercise, limit = 3): Exercise[] {
  return EXERCISES.filter(
    (e) => e.category === exercise.category && e.slug !== exercise.slug,
  ).slice(0, limit);
}
