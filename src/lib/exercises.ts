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

  // ==================== ADDITIONAL CHEST ====================
  {
    slug: "incline-dumbbell-press",
    nameAr: "بنش مائل بالدمبل",
    nameEn: "Incline Dumbbell Press",
    category: "chest",
    equipment: "dumbbell",
    level: "intermediate",
    primaryMuscles: ["الصدر العلوي", "Upper Chest"],
    secondaryMuscles: ["الترايسبس", "الكتف الأمامي"],
    instructionsAr: [
      "اضبط البنش على زاوية 30-45 درجة.",
      "امسك الدمبل فوق الصدر العلوي، اليدان متباعدتان بعرض الكتفين.",
      "أنزل الدمبل ببطء حتى مستوى الصدر.",
      "ادفع الدمبل لأعلى حتى تقترب الأوزان من بعضها.",
    ],
    instructionsEn: [
      "Set the bench to a 30-45 degree angle.",
      "Hold dumbbells over upper chest, shoulder-width apart.",
      "Lower the dumbbells slowly to chest level.",
      "Press the dumbbells up until weights nearly touch.",
    ],
    tipsAr: [
      "لا تنزل بالأوزان أسفل الصدر العلوي.",
      "حافظ على ثبات الظهر في البنش.",
    ],
    tipsEn: [
      "Don't lower weights below upper chest.",
      "Keep your back flat on the bench.",
    ],
    imageKey: "bench press",
  },
  {
    slug: "dumbbell-fly",
    nameAr: "رفرفة بالدمبل",
    nameEn: "Dumbbell Fly",
    category: "chest",
    equipment: "dumbbell",
    level: "intermediate",
    primaryMuscles: ["الصدر", "Chest"],
    secondaryMuscles: ["الكتف الأمامي"],
    instructionsAr: [
      "استلقِ على البنش المسطح مع دمبل في كل يد فوق الصدر.",
      "ثني المرفقين قليلاً وثبت الزاوية طوال الحركة.",
      "افتح الذراعين للجانبين حتى تشعر بتمدد الصدر.",
      "أغلق الذراعين للعودة للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Lie on a flat bench with a dumbbell in each hand over chest.",
      "Bend elbows slightly and keep the angle fixed throughout.",
      "Open arms to the sides until you feel a chest stretch.",
      "Close arms to return to starting position.",
    ],
    tipsAr: [
      "لا تنزل بأوزان ثقيلة — الحركة معزولة.",
      "ركز على التمدد، مش الدفع.",
    ],
    tipsEn: [
      "Don't use heavy weights — it's an isolation movement.",
      "Focus on the stretch, not pressing.",
    ],
    imageKey: "dips",
  },
  {
    slug: "cable-crossover",
    nameAr: "كروسبوفر بالكابل",
    nameEn: "Cable Crossover",
    category: "chest",
    equipment: "cable",
    level: "intermediate",
    primaryMuscles: ["الصدر السفلي", "Lower Chest"],
    secondaryMuscles: ["الكتف الأمامي"],
    instructionsAr: [
      "قف بين آلة الكابل، امسك المقابض العلوية.",
      "الميل للأمام قليلاً، الركبتان مثنيتان.",
      "اسحب المقابض للأسفل وللداخل حتى تلتقي أمامك.",
      "أعد المقابض ببطء مع تمديد الصدر.",
    ],
    instructionsEn: [
      "Stand between cable machine, grip upper handles.",
      "Lean forward slightly, knees bent.",
      "Pull handles down and inward until they meet in front of you.",
      "Return handles slowly with chest stretched.",
    ],
    tipsAr: [
      "ركز على شد الصدر في النهاية.",
      "لا تستخدم الوزن كله من الأذرع.",
    ],
    tipsEn: [
      "Focus on squeezing chest at the bottom.",
      "Don't use all weight from arms.",
    ],
    imageKey: "dips",
  },

  // ==================== ADDITIONAL BACK ====================
  {
    slug: "deadlift",
    nameAr: "ديدليفت",
    nameEn: "Deadlift",
    category: "back",
    equipment: "barbell",
    level: "advanced",
    primaryMuscles: ["الظهر السفلي", "الفخذ الخلفي", "الألياف"],
    secondaryMuscles: ["الظهر العلوي", "الساعد"],
    instructionsAr: [
      "قف مع البار فوق منتصف القدم، القدمين بعرض الورك.",
      "انحنِ من الورك والركبة، امسك البار بقبضة بعرض الكتف.",
      "حافظ على استقامة الظهر، الصدر مرفوع.",
      "ادفع الأرض، قف مستقيماً مع البار، شد الألياف في الأعلى.",
    ],
    instructionsEn: [
      "Stand with bar over mid-foot, feet hip-width.",
      "Hinge at hips and knees, grip bar shoulder-width.",
      "Keep back straight, chest up.",
      "Push the floor away, stand straight with bar, squeeze glutes at top.",
    ],
    tipsAr: [
      "البار قريب من الجسم طوال الحركة.",
      "لا تدور الظهر — حافظ على استقامته.",
      "ابدأ بوزن خفيف لاتقان الحركة.",
    ],
    tipsEn: [
      "Bar stays close to body throughout.",
      "Don't round your back — keep it straight.",
      "Start light to master form.",
    ],
    imageKey: "sumo deadlift",
  },
  {
    slug: "lat-pulldown",
    nameAr: "سحب أمامي (لات بالداون)",
    nameEn: "Lat Pulldown",
    category: "back",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["الظهر العريض", "Lats"],
    secondaryMuscles: ["البايسبس", "الكتف الخلفي"],
    instructionsAr: [
      "اجلس على الماكينة، ثبّت فخذيك تحت الوسادة.",
      "امسك البار بقبضة أعرض من الكتفين.",
      "اسحب البار نحو صدرك العلوي، شد لوحي الكتف للأسفل.",
      "أعد البار ببطء للأعلى مع تمديد كامل.",
    ],
    instructionsEn: [
      "Sit on machine, secure thighs under pad.",
      "Grip bar wider than shoulder-width.",
      "Pull bar toward upper chest, squeezing shoulder blades down.",
      "Return bar slowly upward with full extension.",
    ],
    tipsAr: [
      "لا تتمايل للخلف — حركة كاملة وثابتة.",
      "ركز على شد الظهر، مش الذراعين.",
    ],
    tipsEn: [
      "Don't lean back — controlled full movement.",
      "Focus on pulling with back, not arms.",
    ],
    imageKey: "seated cable row",
  },
  {
    slug: "barbell-row",
    nameAr: "تجديف بالبار",
    nameEn: "Barbell Row",
    category: "back",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الظهر", "ألياف الظهر العريض"],
    secondaryMuscles: ["البايسبس", "الكتف الخلفي"],
    instructionsAr: [
      "قف معتدلاً، امسك البار بقبضة بعرض الكتف.",
      "انحنِ من الورك حتى يصبح الجذع موازياً للأرض.",
      "حافظ على استقامة الظهر، اسحب البار نحو السرة.",
      "أعد البار ببطء للأسفل.",
    ],
    instructionsEn: [
      "Stand tall, grip bar shoulder-width.",
      "Hinge at hips until torso is parallel to floor.",
      "Keep back straight, pull bar toward navel.",
      "Lower bar slowly back down.",
    ],
    tipsAr: [
      "لا تدور الظهر — استقامة كاملة.",
      "ركز على شد لوحي الكتف معاً.",
    ],
    tipsEn: [
      "Don't round back — keep it straight.",
      "Focus on squeezing shoulder blades together.",
    ],
    imageKey: "seated cable row",
  },
  {
    slug: "t-bar-row",
    nameAr: "تجديف تي-بار",
    nameEn: "T-Bar Row",
    category: "back",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الظهر", "ألياف الظهر"],
    secondaryMuscles: ["البايسبس", "الكتف الخلفي"],
    instructionsAr: [
      "قف فوق الـ T-bar، امسك المقابض.",
      "انحنِ من الورك، استقامة الظهر، الصدر مرفوع.",
      "اسحب البار نحو صدرك، شد لوحي الكتف.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand over T-bar, grip handles.",
      "Hinge at hips, back straight, chest up.",
      "Pull bar toward chest, squeezing shoulder blades.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تستخدم وزن ثقيل يسبب دوران الظهر.",
      "حافظ على استقامة الرقبة.",
    ],
    tipsEn: [
      "Don't use weight that causes back rounding.",
      "Keep neck neutral.",
    ],
    imageKey: "seated cable row",
  },
  {
    slug: "face-pull",
    nameAr: "فيس بول",
    nameEn: "Face Pull",
    category: "back",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["الكتف الخلفي", "الظهر العلوي"],
    secondaryMuscles: ["المائلين"],
    instructionsAr: [
      "اضبط الكابل على مستوى الوجه، امسك الحبل بقبضة عكسية.",
      "اسحب الحبل نحو وجهك، افتح الأذرع للجانبين.",
      "شد الكتف الخلفي في النهاية.",
      "أعد ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Set cable at face level, grip rope with reverse grip.",
      "Pull rope toward face, opening arms to sides.",
      "Squeeze rear delts at the end.",
      "Return slowly to starting position.",
    ],
    tipsAr: [
      "استخدم وزن خفيف — الحركة معزولة.",
      "لا تسحب بالذراعين، استخدم الكتف الخلفي.",
    ],
    tipsEn: [
      "Use light weight — it's an isolation movement.",
      "Don't pull with arms, use rear delts.",
    ],
    imageKey: "seated cable row",
  },

  // ==================== ADDITIONAL SHOULDERS ====================
  {
    slug: "overhead-press",
    nameAr: "أوفرهيد بريس (بالبار)",
    nameEn: "Overhead Press (Barbell)",
    category: "shoulders",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الكتف", "Shoulders"],
    secondaryMuscles: ["الترايسبس", "الكور"],
    instructionsAr: [
      "قف معتدلاً، امسك البار بقبضة بعرض الكتف عند مستوى الترقوة.",
      "ادفع البار لأعلى حتى استقامة الذراعين.",
      "حافظ على شد الكور، لا تقوس الظهر.",
      "أنزل البار ببطء للترقوة.",
    ],
    instructionsEn: [
      "Stand tall, grip bar shoulder-width at collarbone level.",
      "Press bar overhead until arms are straight.",
      "Keep core engaged, don't arch back.",
      "Lower bar slowly to collarbone.",
    ],
    tipsAr: [
      "لا تقفل الركبتين — استقامة الجسم.",
      "اضغط البار للأعلى، مش للأمام.",
    ],
    tipsEn: [
      "Don't lock knees — body straight.",
      "Press bar straight up, not forward.",
    ],
    imageKey: "arnold press",
  },
  {
    slug: "lateral-raise",
    nameAr: "رفرفة جانبية",
    nameEn: "Lateral Raise",
    category: "shoulders",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["الكتف الجانبي", "Side Delt"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف معتدلاً، دمبل في كل يد بجانب الجسم.",
      "ارفع الدمبل للجانبين حتى مستوى الكتف.",
      "ثبت قليلاً في الأعلى.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, dumbbell in each hand at sides.",
      "Raise dumbbells to sides until shoulder level.",
      "Pause briefly at top.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تستخدم وزن ثقيل — الحركة معزولة.",
      "لا ترفع أعلى من الكتف.",
    ],
    tipsEn: [
      "Don't use heavy weight — isolation movement.",
      "Don't raise above shoulder level.",
    ],
    imageKey: "arnold press",
  },
  {
    slug: "front-raise",
    nameAr: "رفرفة أمامية",
    nameEn: "Front Raise",
    category: "shoulders",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["الكتف الأمامي", "Front Delt"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف معتدلاً، دمبل في كل يد أمام الفخذين.",
      "ارفع الدمبل للأمام حتى مستوى الكتف.",
      "ثبت قليلاً في الأعلى.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, dumbbell in each hand in front of thighs.",
      "Raise dumbbells forward until shoulder level.",
      "Pause briefly at top.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تتمايل — حركة ثابتة.",
      "لا تستخدم وزن ثقيل.",
    ],
    tipsEn: [
      "Don't swing — controlled movement.",
      "Don't use heavy weight.",
    ],
    imageKey: "arnold press",
  },
  {
    slug: "dumbbell-shoulder-press",
    nameAr: "شولدر بريس بالدمبل",
    nameEn: "Dumbbell Shoulder Press",
    category: "shoulders",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["الكتف", "Shoulders"],
    secondaryMuscles: ["الترايسبس"],
    instructionsAr: [
      "اجلس على بنش بظهر مستقيم، دمبل عند مستوى الأذن.",
      "الأكف مواجهة للأمام، المرفقين بزاوية 90 درجة.",
      "ادفع الدمبل لأعلى حتى استقامة الذراعين.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Sit on bench with back straight, dumbbells at ear level.",
      "Palms face forward, elbows at 90 degrees.",
      "Press dumbbells up until arms are straight.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تقفل الركبتين في الأعلى.",
      "حافظ على استقامة الظهر في البنش.",
    ],
    tipsEn: [
      "Don't lock elbows at top.",
      "Keep back flat on bench.",
    ],
    imageKey: "arnold press",
  },

  // ==================== ADDITIONAL LEGS ====================
  {
    slug: "romanian-deadlift",
    nameAr: "ديدليفت روماني",
    nameEn: "Romanian Deadlift (RDL)",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الفخذ الخلفي", "Hamstrings"],
    secondaryMuscles: ["الألياف", "الظهر السفلي"],
    instructionsAr: [
      "قف معتدلاً، امسك البار بقبضة بعرض الكتف.",
      "ثني الركبتين قليلاً، ابقها ثابتة طوال الحركة.",
      "انحنِ من الورك، أنزل البار على الفخذين.",
      "عند الشعور بتمدد الفخذ الخلفي، ارجع للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, grip bar shoulder-width.",
      "Bend knees slightly, keep them fixed throughout.",
      "Hinge at hips, lower bar along thighs.",
      "When you feel hamstring stretch, return to start.",
    ],
    tipsAr: [
      "البار قريب من الفخذين طوال الحركة.",
      "لا تدور الظهر — استقامة.",
    ],
    tipsEn: [
      "Bar stays close to thighs throughout.",
      "Don't round back — keep it straight.",
    ],
    imageKey: "good morning",
  },
  {
    slug: "goblet-squat",
    nameAr: "جوبليت سكوات",
    nameEn: "Goblet Squat",
    category: "legs",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الألياف", "الكور"],
    instructionsAr: [
      "قف معتدلاً، امسك دمبل عمودياً أمام صدرك بكلتا اليدين.",
      "القدمين بعرض الكتفين، الأصابع مواجهة للأمام.",
      "انزل ببطء حتى يوازي الفخذ الأرض.",
      "ادفع من الكعب للعودة للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, hold dumbbell vertically in front of chest with both hands.",
      "Feet shoulder-width, toes forward.",
      "Lower slowly until thighs parallel to floor.",
      "Push through heels to return to start.",
    ],
    tipsAr: [
      "حافظ على استقامة الظهر.",
      "الركبتان في اتجاه الأصابع.",
    ],
    tipsEn: [
      "Keep back straight.",
      "Knees track over toes.",
    ],
    imageKey: "squat",
  },
  {
    slug: "bulgarian-split-squat",
    nameAr: "سكوات بلغاري مقسم",
    nameEn: "Bulgarian Split Squat",
    category: "legs",
    equipment: "dumbbell",
    level: "intermediate",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الألياف", "الفخذ الخلفي"],
    instructionsAr: [
      "قف مع ظهرك لبنش، ضع قدمك الخلفية على البنش.",
      "امسك دمبل في كل يد بجانب جسمك.",
      "انزل ببطء حتى تقترب الركبة الخلفية من الأرض.",
      "ادفع من القدم الأمامية للعودة.",
    ],
    instructionsEn: [
      "Stand with back to bench, place rear foot on bench.",
      "Hold dumbbell in each hand at sides.",
      "Lower slowly until rear knee nearly touches floor.",
      "Push through front foot to return.",
    ],
    tipsAr: [
      "الركبة الأمامية لا تتجاوز أصابع القدم.",
      "حافظ على استقامة الجذع.",
    ],
    tipsEn: [
      "Front knee doesn't go past toes.",
      "Keep torso upright.",
    ],
    imageKey: "lunges",
  },
  {
    slug: "calf-raise",
    nameAr: "كاف ريز",
    nameEn: "Calf Raise",
    category: "legs",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["السمانة", "Calves"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف معتدلاً، القدمين بعرض الكتف.",
      "ارفع كعبيك لأعلى بقدر المستطاع.",
      "ثبت في الأعلى لمدة ثانية.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, feet shoulder-width.",
      "Raise your heels up as high as possible.",
      "Hold at top for one second.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "الحركة كاملة — نزل للأسفل بقدر الإمكان.",
      "لا تتمايل — ثابت.",
    ],
    tipsEn: [
      "Full range — go down as far as possible.",
      "Don't bounce — controlled.",
    ],
    imageKey: "squat",
  },
  {
    slug: "leg-press-45",
    nameAr: "ليج بريس 45 درجة",
    nameEn: "45° Leg Press",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الفخذ الخلفي", "الألياف"],
    instructionsAr: [
      "اجلس على الماكينة بزاوية 45 درجة، القدمين على المنصة.",
      "القدمين بعرض الكتف، الأصابع مواجهة للأمام.",
      "حرر القفل، أنزل المنصة ببطء.",
      "ادفع المنصة لأعلى دون قفل الركبتين.",
    ],
    instructionsEn: [
      "Sit on machine at 45 degrees, feet on platform.",
      "Feet shoulder-width, toes forward.",
      "Release safety, lower platform slowly.",
      "Push platform up without locking knees.",
    ],
    tipsAr: [
      "لا تقفل الركبتين في الأعلى.",
      "القدمين عالياً = تركيز على الألياف.",
    ],
    tipsEn: [
      "Don't lock knees at top.",
      "Feet high = glutes focus.",
    ],
    imageKey: "leg press",
  },
  {
    slug: "sumo-squat",
    nameAr: "سكوات سومو",
    nameEn: "Sumo Squat",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الفخذ الداخلي", "الألياف"],
    secondaryMuscles: ["الفخذ الأمامي"],
    instructionsAr: [
      "قف بقدمين عريضتين، الأصابع مواجهة للخارج.",
      "امسك البار على أعلى الظهر.",
      "انزل ببطء مع دفع الركبتين للخارج.",
      "ادفع من الكعب للعودة.",
    ],
    instructionsEn: [
      "Stand with feet wide, toes pointed outward.",
      "Hold bar on upper back.",
      "Lower slowly, pushing knees outward.",
      "Push through heels to return.",
    ],
    tipsAr: [
      "الركبتان في اتجاه الأصابع.",
      "حافظ على استقامة الظهر.",
    ],
    tipsEn: [
      "Knees track over toes.",
      "Keep back straight.",
    ],
    imageKey: "sumo deadlift",
  },

  // ==================== ADDITIONAL BICEPS ====================
  {
    slug: "barbell-curl",
    nameAr: "بايسبس بالبار",
    nameEn: "Barbell Curl",
    category: "biceps",
    equipment: "barbell",
    level: "beginner",
    primaryMuscles: ["البايسبس", "Biceps"],
    secondaryMuscles: ["الساعد"],
    instructionsAr: [
      "قف معتدلاً، امسك البار بقبضة بعرض الكتف، الأكف للأمام.",
      "ثبت المرفقين بجانب الجسم.",
      "اثنِ المرفق لرفع البار نحو الصدر.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, grip bar shoulder-width, palms forward.",
      "Keep elbows fixed at sides.",
      "Bend elbows to lift bar toward chest.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تتمايل بالجسم — حركة معزولة.",
      "لا ترفع المرفقين.",
    ],
    tipsEn: [
      "Don't swing body — isolated movement.",
      "Don't lift elbows.",
    ],
    imageKey: "dumbbell curl",
  },
  {
    slug: "hammer-curl",
    nameAr: "هامر كيرل",
    nameEn: "Hammer Curl",
    category: "biceps",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["البايسبس", "الساعد"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف معتدلاً، دمبل في كل يد، الأكف مواجهة للجسم.",
      "اثنِ المرفق لرفع الدمبل، الأكف ثابتة (بدون تدوير).",
      "اشد البايسبس في الأعلى.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Stand tall, dumbbell in each hand, palms facing body.",
      "Bend elbows to lift dumbbells, palms stay fixed (no rotation).",
      "Squeeze biceps at top.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "لا تحرك المرفقين — ثابتين.",
      "حافظ على استقامة المعصم.",
    ],
    tipsEn: [
      "Don't move elbows — keep them fixed.",
      "Keep wrists straight.",
    ],
    imageKey: "dumbbell curl",
  },
  {
    slug: "preacher-curl",
    nameAr: "بريشر كيرل",
    nameEn: "Preacher Curl",
    category: "biceps",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["البايسبس", "Biceps"],
    secondaryMuscles: [],
    instructionsAr: [
      "اجلس على ماكينة البريشر، ضع ذراعيك على الوسادة.",
      "امسك البار بقبضة بعرض الكتف، الأكف للأمام.",
      "اثنِ المرفق لرفع البار ببطء.",
      "أنزل ببطء مع تمديد كامل.",
    ],
    instructionsEn: [
      "Sit on preacher machine, place arms on pad.",
      "Grip bar shoulder-width, palms forward.",
      "Bend elbows to lift bar slowly.",
      "Lower slowly with full extension.",
    ],
    tipsAr: [
      "لا ترد — نزل ببطء.",
      "حافظ على ثبات الذراعين على الوسادة.",
    ],
    tipsEn: [
      "Don't bounce — lower slowly.",
      "Keep arms fixed on pad.",
    ],
    imageKey: "dumbbell curl",
  },
  {
    slug: "concentration-curl",
    nameAr: "كيرل تركيز",
    nameEn: "Concentration Curl",
    category: "biceps",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["البايسبس", "Biceps"],
    secondaryMuscles: [],
    instructionsAr: [
      "اجلس على بنش، افتح ساقيك، ضع ظهر ذراعك على فخذك الداخلي.",
      "امسك الدمبل بالكف المواجهة للأمام.",
      "اثنِ المرفق لرفع الدمبل نحو كتفك.",
      "أنزل ببطء مع تمديد كامل.",
    ],
    instructionsEn: [
      "Sit on bench, spread legs, place back of arm on inner thigh.",
      "Hold dumbbell with palm facing forward.",
      "Bend elbow to lift dumbbell toward shoulder.",
      "Lower slowly with full extension.",
    ],
    tipsAr: [
      "حافظ على ثبات الذراع العليا.",
      "اشد البايسبس في الأعلى.",
    ],
    tipsEn: [
      "Keep upper arm fixed.",
      "Squeeze biceps at top.",
    ],
    imageKey: "dumbbell curl",
  },

  // ==================== ADDITIONAL TRICEPS ====================
  {
    slug: "skull-crushers",
    nameAr: "سكل كرشرز",
    nameEn: "Skull Crushers",
    category: "triceps",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الترايسبس", "Triceps"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على بنش مسطح، امسك البار (EZ) بقبضة ضيقة فوق صدرك.",
      "اثنِ المرفقين ببطء، أنزل البار نحو جبهتك.",
      "حافظ على ثبات الذراعين العلويتين عموديتين.",
      "ادفع البار لأعلى لاستقامة الذراعين.",
    ],
    instructionsEn: [
      "Lie on flat bench, hold EZ bar with narrow grip over chest.",
      "Bend elbows slowly, lower bar toward forehead.",
      "Keep upper arms fixed and vertical.",
      "Press bar up to straighten arms.",
    ],
    tipsAr: [
      "لا تحرك الذراعين العلويتين.",
      "استخدم وزن متوسط لتفادي إجهاد المرفق.",
    ],
    tipsEn: [
      "Don't move upper arms.",
      "Use moderate weight to avoid elbow strain.",
    ],
    imageKey: "triceps pushdown",
  },
  {
    slug: "overhead-triceps-extension",
    nameAr: "تمديد ترايسبس فوق الرأس",
    nameEn: "Overhead Triceps Extension",
    category: "triceps",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["الترايسبس", "Triceps"],
    secondaryMuscles: [],
    instructionsAr: [
      "اجلس أو قف، امسك دمبل بكلتا اليدين فوق رأسك.",
      "الذراعين مستقيمتين، الأكف مواجهة للأعلى.",
      "اثنِ المرفقين ببطء، أنزل الدمبل خلف رأسك.",
      "ادفع الدمبل لأعلى لاستقامة الذراعين.",
    ],
    instructionsEn: [
      "Sit or stand, hold dumbbell with both hands overhead.",
      "Arms straight, palms facing up.",
      "Bend elbows slowly, lower dumbbell behind head.",
      "Press dumbbell up to straighten arms.",
    ],
    tipsAr: [
      "حافظ على قرب الذراعين من الأذنين.",
      "لا تflare المرفقين.",
    ],
    tipsEn: [
      "Keep arms close to ears.",
      "Don't flare elbows.",
    ],
    imageKey: "triceps pushdown",
  },
  {
    slug: "close-grip-bench-press",
    nameAr: "بنش بريس قبضة ضيقة",
    nameEn: "Close-Grip Bench Press",
    category: "triceps",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الترايسبس", "Triceps"],
    secondaryMuscles: ["الصدر", "الكتف الأمامي"],
    instructionsAr: [
      "استلقِ على البنش، امسك البار بقبضة ضيقة (بعرض الكتف).",
      "أنزل البار ببطء نحو أسفل الصدر.",
      "حافظ على قرب المرفقين من الجسم.",
      "ادفع البار لأعلى لاستقامة الذراعين.",
    ],
    instructionsEn: [
      "Lie on bench, grip bar narrow (shoulder-width).",
      "Lower bar slowly toward lower chest.",
      "Keep elbows close to body.",
      "Press bar up to straighten arms.",
    ],
    tipsAr: [
      "القبضة ضيقة لكن مش جداً — تسبب ألم في المعصم.",
      "حافظ على ثبات الكتفين.",
    ],
    tipsEn: [
      "Grip narrow but not too much — causes wrist pain.",
      "Keep shoulders retracted.",
    ],
    imageKey: "bench press",
  },

  // ==================== ADDITIONAL CORE ====================
  {
    slug: "leg-raises",
    nameAr: "رفع الأرجل",
    nameEn: "Leg Raises",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["البطن السفلي", "Lower Abs"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على ظهرك، اليدان تحت المؤخرة.",
      "الرجلان مستقيمتان، ارفعهما لأعلى حتى زاوية 90 درجة.",
      "اشد البطن في الأعلى.",
      "أنزل ببطء دون لمس الأرض.",
    ],
    instructionsEn: [
      "Lie on back, hands under glutes.",
      "Legs straight, raise them up to 90 degrees.",
      "Squeeze abs at top.",
      "Lower slowly without touching floor.",
    ],
    tipsAr: [
      "لا تقوس الظهر — اضغط أسفل الظهر للأرض.",
      "لا تستخدم القوة الدافعة.",
    ],
    tipsEn: [
      "Don't arch back — press lower back to floor.",
      "Don't use momentum.",
    ],
    imageKey: "flutter kicks",
  },
  {
    slug: "bicycle-crunches",
    nameAr: "كرنجز دراجة",
    nameEn: "Bicycle Crunches",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["المائلين", "Obliques"],
    secondaryMuscles: ["البطن"],
    instructionsAr: [
      "استلقِ على ظهرك، ارفع رجليك، اليدان خلف الرأس.",
      "الف رجلك اليمنى مع تقريب الكوع الأيسر لها.",
      "بدّل الرجل والكوع بسرعة كأنك تركب دراجة.",
      "حافظ على استقامة الظهر الأوسط.",
    ],
    instructionsEn: [
      "Lie on back, lift legs, hands behind head.",
      "Twist right leg toward left elbow.",
      "Alternate leg and elbow quickly like riding a bike.",
      "Keep mid-back flat.",
    ],
    tipsAr: [
      "لا تشد الرقبة — الحركة من البطن.",
      "سرعة مع تحكم.",
    ],
    tipsEn: [
      "Don't pull neck — movement from abs.",
      "Speed with control.",
    ],
    imageKey: "russian twist",
  },
  {
    slug: "hanging-leg-raise",
    nameAr: "رفع الأرجل معلق",
    nameEn: "Hanging Leg Raise",
    category: "core",
    equipment: "bodyweight",
    level: "advanced",
    primaryMuscles: ["البطن السفلي", "Lower Abs"],
    secondaryMuscles: ["الساعد"],
    instructionsAr: [
      "تعلّق من البار بقبضة بعرض الكتف.",
      "حافظ على استقامة الجسم، ارفع رجليك للأمام.",
      "ارفع حتى تصبح مستوية مع الأرض أو أعلى.",
      "أنزل ببطء دون تأرجح.",
    ],
    instructionsEn: [
      "Hang from bar with shoulder-width grip.",
      "Keep body straight, raise legs forward.",
      "Raise until parallel to floor or higher.",
      "Lower slowly without swinging.",
    ],
    tipsAr: [
      "لا تتأرجح — حركة ثابتة.",
      "ركز على شد البطن، مش الورك.",
    ],
    tipsEn: [
      "Don't swing — controlled movement.",
      "Focus on abs, not hips.",
    ],
    imageKey: "toes to bar",
  },
  {
    slug: "reverse-crunch",
    nameAr: "كرنش عكسي",
    nameEn: "Reverse Crunch",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["البطن السفلي", "Lower Abs"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على ظهرك، اثنِ ركبتيك بزاوية 90 درجة.",
      "اليدان بجانب الجسم أو خلف الرأس.",
      "ارفع الورك والحوض لأعلى نحو صدرك.",
      "أنزل ببطء للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Lie on back, bend knees at 90 degrees.",
      "Hands at sides or behind head.",
      "Lift hips and pelvis up toward chest.",
      "Lower slowly to starting position.",
    ],
    tipsAr: [
      "الحركة من الورك، مش من الرجلين.",
      "لا تستخدم القوة الدافعة.",
    ],
    tipsEn: [
      "Movement from hips, not legs.",
      "Don't use momentum.",
    ],
    imageKey: "reverse crunch",
  },
  {
    slug: "side-plank",
    nameAr: "بلانك جانبي",
    nameEn: "Side Plank",
    category: "core",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["المائلين", "Obliques"],
    secondaryMuscles: ["الكور"],
    instructionsAr: [
      "استلقِ على جنب، استند على ساعدك السفلي.",
      "ارفع وركك عن الأرض، الجسم مستقيم.",
      "حافظ على الوضع، الكور مشدود.",
      "بدّل الجانبين.",
    ],
    instructionsEn: [
      "Lie on side, rest on lower forearm.",
      "Lift hips off floor, body in straight line.",
      "Hold position, core engaged.",
      "Switch sides.",
    ],
    tipsAr: [
      "لا تدع الورك يهبط.",
      "حافظ على استقامة الجسم.",
    ],
    tipsEn: [
      "Don't let hips sag.",
      "Keep body in straight line.",
    ],
    imageKey: "side plank",
  },

  // ==================== ADDITIONAL CARDIO ====================
  {
    slug: "high-knees",
    nameAr: "ركبة عالية",
    nameEn: "High Knees",
    category: "cardio",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["كامل الجسم", "Full Body"],
    secondaryMuscles: ["الأرجل", "الكور"],
    instructionsAr: [
      "قف معتدلاً، اليدان على جانبك.",
      "ارفع ركبتك اليمنى لأعلى نحو صدرك.",
      "بدّل بسرعة للركبة اليسرى.",
      "حافظ على الوتيرة العالية.",
    ],
    instructionsEn: [
      "Stand tall, hands at sides.",
      "Raise right knee up toward chest.",
      "Quickly switch to left knee.",
      "Maintain high pace.",
    ],
    tipsAr: [
      "ارفع الركبتن لأعلى قدر المستطاع.",
      "حافظ على استقامة الجذع.",
    ],
    tipsEn: [
      "Raise knees as high as possible.",
      "Keep torso upright.",
    ],
    imageKey: "high knees",
  },
  {
    slug: "squat-jumps",
    nameAr: "قفز سكوات",
    nameEn: "Squat Jumps",
    category: "cardio",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الألياف", "الكور"],
    instructionsAr: [
      "قف معتدلاً، القدمين بعرض الكتف.",
      "انزل في وضع سكوات حتى يوازي الفخذ الأرض.",
      "اقفز لأعلى بقوة، استقامة الجسم.",
      "اهبط بنعومة في وضع سكوات.",
    ],
    instructionsEn: [
      "Stand tall, feet shoulder-width.",
      "Lower into squat until thighs parallel to floor.",
      "Jump up explosively, body straight.",
      "Land softly into squat position.",
    ],
    tipsAr: [
      "الهبوط ناعم — لا تضرب الأرض.",
      "حافظ على استقامة الظهر.",
    ],
    tipsEn: [
      "Land soft — don't slam floor.",
      "Keep back straight.",
    ],
    imageKey: "squat",
  },
  {
    slug: "box-jumps",
    nameAr: "قفز على صندوق",
    nameEn: "Box Jumps",
    category: "cardio",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["الفخذ الأمامي", "Quads"],
    secondaryMuscles: ["الألياف", "الكور"],
    instructionsAr: [
      "قف أمام صندوق بلاستيك أو خشبي بارتفاع مناسب.",
      "انزل قليلاً في وضع سكوات.",
      "اقفز على الصندوق بقوة، الهبوط بكلتا القدمين.",
      "انزل للأسفل ببطء.",
    ],
    instructionsEn: [
      "Stand in front of a box at appropriate height.",
      "Lower slightly into squat.",
      "Jump onto box explosively, landing on both feet.",
      "Step down slowly.",
    ],
    tipsAr: [
      "ابدأ بصندوق منخفض.",
      "الهبوط ناعم على الصندوق.",
    ],
    tipsEn: [
      "Start with low box.",
      "Land soft on box.",
    ],
    imageKey: "squat",
  },
  {
    slug: "jump-rope",
    nameAr: "حبل القفز",
    nameEn: "Jump Rope",
    category: "cardio",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["كامل الجسم", "Full Body"],
    secondaryMuscles: ["السمانة", "الكور"],
    instructionsAr: [
      "قف معتدلاً، امسك الحبل بكلتا اليدين.",
      "أدر الحبل من فوق رأسك.",
      "اقفز قفزات صغيرة عند مرور الحبل تحت قدميك.",
      "حافظ على الوتيرة.",
    ],
    instructionsEn: [
      "Stand tall, hold rope in both hands.",
      "Swing rope over your head.",
      "Jump small jumps as rope passes under feet.",
      "Maintain rhythm.",
    ],
    tipsAr: [
      "اقفز على أطراف القدم.",
      "الركبتان لينتان قليلاً.",
    ],
    tipsEn: [
      "Jump on balls of feet.",
      "Knees slightly soft.",
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
