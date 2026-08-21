/**
 * Exercises Library — comprehensive exercise directory with bilingual instructions,
 * target muscles, difficulty levels, equipment requirements, and image references.
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
  imageKey: string;
};

export const CATEGORY_LABELS: Record<
  ExerciseCategory,
  { ar: string; en: string; emoji: string }
> = {
  chest: { ar: "صدر", en: "Chest", emoji: "💪" },
  back: { ar: "ظهر", en: "Back", emoji: "🔙" },
  shoulders: { ar: "أكتاف", en: "Shoulders", emoji: "🏆" },
  legs: { ar: "أرجل", en: "Legs", emoji: "🦵" },
  biceps: { ar: "بايسبس", en: "Biceps", emoji: "💪" },
  triceps: { ar: "ترايسبس", en: "Triceps", emoji: "💪" },
  core: { ar: "كور وبطن", en: "Core", emoji: "🎯" },
  cardio: { ar: "كارديو", en: "Cardio", emoji: "❤️" },
};

export const EQUIPMENT_LABELS: Record<Equipment, { ar: string; en: string }> = {
  barbell: { ar: "بار (Barbell)", en: "Barbell" },
  dumbbell: { ar: "دمبل (Dumbbell)", en: "Dumbbell" },
  bodyweight: { ar: "وزن الجسم", en: "Bodyweight" },
  cable: { ar: "كابل (Cable)", en: "Cable" },
  machine: { ar: "جهاز (Machine)", en: "Machine" },
  kettlebell: { ar: "كيتل بيل", en: "Kettlebell" },
  none: { ar: "بدون معدات", en: "None" },
};

export const LEVEL_LABELS: Record<
  Level,
  { ar: string; en: string; color: string }
> = {
  beginner: { ar: "مبتدئ", en: "Beginner", color: "#34c759" },
  intermediate: { ar: "متوسط", en: "Intermediate", color: "#ff9500" },
  advanced: { ar: "متقدم", en: "Advanced", color: "#ff3b30" },
};

export const EXERCISES: Exercise[] = [
  // ==================== CHEST ====================
  {
    slug: "bench-press",
    nameAr: "بنش بريس بالبار",
    nameEn: "Barbell Bench Press",
    category: "chest",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["صدر أوسط", "عضلات الصدر الكبرى"],
    secondaryMuscles: ["ترايسبس", "كتف أمامي"],
    instructionsAr: [
      "استلقِ على البنش مع تثبيت القدمين بإحكام على الأرض.",
      "أمسك البار بقبضة أوسع قليلاً من عرض الكتفين واسحب لوحي الكتف للخلف والأسفل.",
      "أنزل البار بتحكم إلى منتصف الصدر مع الحفاظ على زاوية الكوع حوالي 45-75 درجة.",
      "ادفع البار لأعلى بقوة مع الزفير حتى تستقيم الذراعين دون قفل المفاصل تماماً.",
    ],
    instructionsEn: [
      "Lie back on a flat bench with your feet firmly planted on the floor.",
      "Grip the barbell slightly wider than shoulder-width and retract your shoulder blades.",
      "Lower the bar under control to your mid-chest, keeping elbows at roughly a 45-75 degree angle.",
      "Press the bar back up forcefully while exhaling until your arms are extended without locking out.",
    ],
    tipsAr: [
      "لا تدع البار يرتد من على صدرك.",
      "حافظ على تقوس خفيف وطبيعي في أسفل الظهر مع ثبات المؤخرة على المقعد.",
    ],
    tipsEn: [
      "Do not bounce the bar off your chest.",
      "Maintain a slight natural arch in your lower back with glutes on the bench.",
    ],
    imageKey: "Barbell_Bench_Press_-_Medium_Grip/0.jpg,Barbell_Bench_Press_-_Medium_Grip/1.jpg",
  },
  {
    slug: "push-up",
    nameAr: "ضغط أرضي",
    nameEn: "Push-up",
    category: "chest",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["صدر"],
    secondaryMuscles: ["ترايسبس", "كتف أمامي", "كور"],
    instructionsAr: [
      "ابدأ في وضع البلانك المرتفع مع وضع اليدين تحت الكتفين مباشرة أو أوسع قليلاً.",
      "حافظ على استقامة الجسم بالكامل من الرأس حتى الكعبين.",
      "أنزل صدرك نحو الأرض حتى يقترب من لمسها مع ثني الكوعين بزاوية 45 درجة.",
      "ادفع الأرض بعيداً للعودة لنقطة البداية.",
    ],
    instructionsEn: [
      "Start in a high plank position with hands directly under or slightly wider than shoulders.",
      "Keep your body in a straight line from head to heels.",
      "Lower your chest toward the ground until it nearly touches, bending elbows at 45 degrees.",
      "Push the floor away to return to the starting position.",
    ],
    tipsAr: [
      "لا تدع حوضك يهبط لأسفل أثناء الحركة.",
      "للمبتدئين يمكن أداء التمرين على الركبتين.",
    ],
    tipsEn: [
      "Do not let your hips sag during the movement.",
      "Beginners can perform the exercise on their knees.",
    ],
    imageKey: "Pushups/0.jpg,Pushups/1.jpg",
  },
  {
    slug: "incline-bench-press",
    nameAr: "بنش مائل بالبار (علوي)",
    nameEn: "Incline Barbell Bench Press",
    category: "chest",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["صدر علوي"],
    secondaryMuscles: ["كتف أمامي", "ترايسبس"],
    instructionsAr: [
      "اضبط المقعد بزاوية ميل بين 30 إلى 45 درجة.",
      "أمسك البار بقبضة أوسع من عرض الكتفين.",
      "أنزل البار بتحكم إلى الجزء العلوي من الصدر (تحت الترقوة مباشرة).",
      "ادفع البار لأعلى وللخلف قليلاً حتى تستقيم الذراعين.",
    ],
    instructionsEn: [
      "Set an adjustable bench to an incline between 30 and 45 degrees.",
      "Grip the bar slightly wider than shoulder-width.",
      "Lower the bar controlled to your upper chest (just below the collarbone).",
      "Press the bar up and slightly back until arms are extended.",
    ],
    tipsAr: [
      "تجنب الزوايا الحادة جداً (فوق 45 درجة) حتى لا يتحول التركيز للأكتاف.",
    ],
    tipsEn: [
      "Avoid steep angles above 45 degrees to keep the focus on the upper chest rather than front delts.",
    ],
    imageKey: "Barbell_Incline_Bench_Press/0.jpg,Barbell_Incline_Bench_Press/1.jpg",
  },
  {
    slug: "dips",
    nameAr: "ديبس (متوازي)",
    nameEn: "Chest Dips",
    category: "chest",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["صدر سفلي", "ترايسبس"],
    secondaryMuscles: ["كتف أمامي"],
    instructionsAr: [
      "ارفع جسمك على جهازي المتوازي مع ميل الجذع للأمام قليلاً لاستهداف الصدر.",
      "اثنِ كوعيك للنزول حتى يصبح كوعك بزاوية 90 درجة.",
      "ادفع جسمك لأعلى حتى تعود للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Suspend yourself on parallel dip bars, leaning your torso slightly forward to target chest.",
      "Bend your elbows to lower your body until elbows reach roughly 90 degrees.",
      "Press upward through your palms to return to the top position.",
    ],
    tipsAr: [
      "الميل للأمام يركز على الصدر، الاستقامة التامة تركز على الترايسبس.",
    ],
    tipsEn: [
      "Leaning forward emphasizes chest; upright posture shifts tension to triceps.",
    ],
    imageKey: "Dips_-_Chest_Version/0.jpg,Dips_-_Chest_Version/1.jpg",
  },
  {
    slug: "cable-crossover",
    nameAr: "تجميع كابل للصدر",
    nameEn: "Cable Crossover",
    category: "chest",
    equipment: "cable",
    level: "intermediate",
    primaryMuscles: ["عضلات الصدر الكبرى"],
    secondaryMuscles: ["كتف أمامي"],
    instructionsAr: [
      "اضبط بكرات الكابل على مستوى مرتفع أو متوسط.",
      "أمسك المقابض وتقدم بخطوة للأمام مع ثني بسيط في المرفقين.",
      "اجمع المقبضين أمام صدرك بحركة نصف دائرية مع عصر عضلات الصدر.",
      "عد ببطء وتحكم لنقطة البداية مع الإحساس بالإطالة.",
    ],
    instructionsEn: [
      "Set pulleys at upper or middle height.",
      "Grasp handles and take a step forward with a slight bend in your elbows.",
      "Bring hands together in front of your chest in a hugging motion, squeezing pecs.",
      "Slowly return to the start position feeling a stretch across the chest.",
    ],
    tipsAr: ["حافظ على ثبات زاوية الكوع طوال الحركة."],
    tipsEn: ["Maintain a constant slight elbow bend throughout the movement."],
    imageKey: "Cable_Crossover/0.jpg,Cable_Crossover/1.jpg",
  },

  // ==================== BACK ====================
  {
    slug: "pull-up",
    nameAr: "عقلة (سحب علوي)",
    nameEn: "Pull-up",
    category: "back",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["عضلات الظهر العريضة (Lats)"],
    secondaryMuscles: ["بايسبس", "أعلى الظهر", "عضلات القبضة"],
    instructionsAr: [
      "أمسك عقلة التمرين بقبضة واسعة والراحتان متجهتان للأمام.",
      "اسحب جسمك لأعلى بسحب الكوعين لأسفل نحو جانبيك حتى يتجاوز ذقنك البار.",
      "أنزل جسمك ببطء وتحكم كامل حتى تستقيم ذراعيك.",
    ],
    instructionsEn: [
      "Grip the pull-up bar with an overhand grip wider than shoulder width.",
      "Pull your body up by driving your elbows down and back until your chin clears the bar.",
      "Lower yourself under full control until arms are fully extended.",
    ],
    tipsAr: ["تجنب الأرجحة واستخدم قوة الظهر وليس الذراعين فقط."],
    tipsEn: ["Avoid swinging and focus on engaging your lats rather than just your arms."],
    imageKey: "Pullups/0.jpg,Pullups/1.jpg",
  },
  {
    slug: "lat-pulldown",
    nameAr: "سحب عالي بالكيبل (Lat Pulldown)",
    nameEn: "Lat Pulldown",
    category: "back",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["عضلات الظهر العريضة (Lats)"],
    secondaryMuscles: ["بايسبس", "أعلى الظهر"],
    instructionsAr: [
      "اجلس على جهاز السحب مع تثبيت وسادات الفخذين جيداً.",
      "أمسك البار بقبضة واسعة ومِل بجذعك للخلف قليلاً (10-15 درجة).",
      "اسحب البار لأسفل باتجاه أعلى الصدر مع عصر عضلات الظهر.",
      "أعد البار ببطء للأعلى مع الشعور بالإطالة الكاملة.",
    ],
    instructionsEn: [
      "Sit on the pulldown machine and adjust knee pads securely.",
      "Grasp the bar with a wide grip and lean slightly back (10-15 degrees).",
      "Pull the bar down towards your upper chest, squeezing your shoulder blades together.",
      "Slowly return the bar to the starting position feeling a full stretch in your lats.",
    ],
    tipsAr: ["لا تسحب البار خلف الرقبة لتجنب إصابات الكتف."],
    tipsEn: ["Do not pull behind the neck to protect the cervical spine and shoulders."],
    imageKey: "Wide-Grip_Lat_Pulldown/0.jpg,Wide-Grip_Lat_Pulldown/1.jpg",
  },
  {
    slug: "seated-cable-row",
    nameAr: "تجديف كابل أرضي (Seated Cable Row)",
    nameEn: "Seated Cable Row",
    category: "back",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["منتصف الظهر", "عضلات المجنص"],
    secondaryMuscles: ["بايسبس", "كتف خلفي"],
    instructionsAr: [
      "اجلس على الجهاز مع وضع القدمين على المساند وثني الركبتين قليلاً.",
      "أمسك المقبض واستقم بظهرك مع إرجاع الكتفين للخلف.",
      "اسحب المقبض باتجاه أسفل البطن مع ضم لوحي الكتف معاً.",
      "أعد الذراعين للأمام ببطء دون انحناء الظهر.",
    ],
    instructionsEn: [
      "Sit on the platform with feet braced and knees slightly bent.",
      "Grasp the handle, sit tall, and retract your shoulder blades.",
      "Pull the handle towards your lower abdomen while driving elbows back.",
      "Extend arms forward slowly under control without rounding your spine.",
    ],
    tipsAr: ["حافظ على ثبات الجذع وتجنب التأرجح المفرط للأمام والخلف."],
    tipsEn: ["Keep your torso steady and avoid excessive swinging back and forth."],
    imageKey: "Seated_Cable_Rows/0.jpg,Seated_Cable_Rows/1.jpg",
  },
  {
    slug: "bent-over-row",
    nameAr: "تجديف بالبار منحنياً (Barbell Row)",
    nameEn: "Bent Over Barbell Row",
    category: "back",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["عضلات الظهر بالكامل", "الترابيس"],
    secondaryMuscles: ["بايسبس", "أسفل الظهر", "هامسترينج"],
    instructionsAr: [
      "قف حاملاً البار واحنِ مفصل الورك للخلف مع ظهر مستقيم بزاوية 45 درجة.",
      "اسحب البار باتجاه السرة مع توجيه الكوعين لأعلى.",
      "اعصر عضلات الظهر في القمة ثم أنزل البار بتحكم.",
    ],
    instructionsEn: [
      "Stand holding the barbell, hinge at your hips keeping a neutral spine at a 45-degree angle.",
      "Pull the barbell up toward your lower ribcage/belly button by driving elbows up.",
      "Squeeze your back muscles at the peak, then lower the bar under control.",
    ],
    tipsAr: ["حافظ على استقامة الظهر التامة طوال التمرين لحماية الفقرات."],
    tipsEn: ["Keep a neutral spine throughout to protect your lower back."],
    imageKey: "Bent_Over_Barbell_Row/0.jpg,Bent_Over_Barbell_Row/1.jpg",
  },
  {
    slug: "hyperextensions",
    nameAr: "هايبر إكستنشن (تقوية أسفل الظهر)",
    nameEn: "Hyperextensions (Back Extensions)",
    category: "back",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["أسفل الظهر (عضلات الفقار)"],
    secondaryMuscles: ["ألوية (Glutes)", "عضلات الفخذ الخلفية (Hamstrings)"],
    instructionsAr: [
      "اضبط الجهاز بحيث تكون الوسادة تحت عظام الحوض مباشرة.",
      "انحنِ للأمام من مفصل الورك حتى تشعر بإطالة مريحة.",
      "ارفع جذعك لأعلى حتى يستقيم مع ساقيك دون المبالغة في التقوس الخلفي.",
    ],
    instructionsEn: [
      "Position yourself in the machine with the upper pad just below your hip crease.",
      "Bend forward at the hips until you feel a gentle stretch.",
      "Raise your torso until your body forms a straight line, avoiding excessive hyperextension.",
    ],
    tipsAr: ["تحكم في الصعود والنزول وتجنب الحركات المفاجئة السريعة."],
    tipsEn: ["Control both the descent and ascent; avoid jerky, fast motions."],
    imageKey: "Hyperextensions_Back_Extensions/0.jpg,Hyperextensions_Back_Extensions/1.jpg",
  },

  // ==================== SHOULDERS ====================
  {
    slug: "arnold-press",
    nameAr: "أرنولد بريس للكتف بالدمبل",
    nameEn: "Arnold Dumbbell Press",
    category: "shoulders",
    equipment: "dumbbell",
    level: "intermediate",
    primaryMuscles: ["كتف أمامي", "كتف جانبي"],
    secondaryMuscles: ["ترايسبس", "ترابيس علوية"],
    instructionsAr: [
      "اجلس على مقعد ذو مسند ظهر مستقيم ممسكاً بالدمبل أمام صدرك والراحتان في اتجاهك.",
      "ادفع الدمبل لأعلى مع تدوير المعصمين للخارج أثناء الصعود.",
      "في أعلى الحركة تكون الذراعان ممدودتين والراحتان متجهتين للأمام.",
      "أنزل الدمبل مع عكس الدوران للعودة للوضع الابتدائي.",
    ],
    instructionsEn: [
      "Sit on an upright bench holding dumbbells at chest height, palms facing you.",
      "Press the weights overhead while rotating your wrists outward.",
      "At the top, arms are extended overhead with palms facing forward.",
      "Lower the dumbbells while rotating wrists back to the starting position.",
    ],
    tipsAr: ["قم بالحركة بسلاسة وتحكم وتجنب قفل المرفقين بشدة في القمة."],
    tipsEn: ["Perform the rotation smoothly and avoid harsh elbow lockout at the top."],
    imageKey: "Arnold_Dumbbell_Press/0.jpg,Arnold_Dumbbell_Press/1.jpg",
  },
  {
    slug: "overhead-press",
    nameAr: "أوفرهيد بريس بالبار (Military Press)",
    nameEn: "Barbell Overhead Press",
    category: "shoulders",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["كتف أمامي", "كتف جانبي"],
    secondaryMuscles: ["ترايسبس", "كور", "ترابيس"],
    instructionsAr: [
      "قف مع مباعدة القدمين بعرض الكتفين وأمسك البار عند عظام الترقوة.",
      "شد عضلات البطن والمؤخرة ثم ادفع البار عمودياً لأعلى رأسك.",
      "عندما يتجاوز البار رأسك، ادفع رأسك للأمام قليلاً لتثبيت الوزن فوق مركز الثقل.",
      "أنزل البار ببطء للترقوة.",
    ],
    instructionsEn: [
      "Stand with feet shoulder-width apart, holding barbell at collarbone level.",
      "Engage your core and glutes, then press the bar vertically overhead.",
      "As the bar clears your forehead, move your head slightly forward to lock out over midfoot.",
      "Lower the barbell under control back to the collarbone.",
    ],
    tipsAr: ["لا تثنِ ظهرك للخلف بشكل مفرط أثناء الدفع."],
    tipsEn: ["Do not excessively arch your lower back when pressing."],
    imageKey: "Standing_Military_Press/0.jpg,Standing_Military_Press/1.jpg",
  },
  {
    slug: "lateral-raise",
    nameAr: "رفرفة جانبية بالدمبل",
    nameEn: "Dumbbell Lateral Raise",
    category: "shoulders",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["كتف جانبي"],
    secondaryMuscles: ["ترابيس علوية"],
    instructionsAr: [
      "قف مع مسك الدمبل بجانبيك مع ثني بسيط جداً في المرفقين.",
      "ارفع الذراعين للجانبين حتى يصبحا موازيين للأرض مع توجيه الإبهام لأسفل قليلاً.",
      "اثبت للحظة في القمة ثم أنزل الدمبل ببطء وتحكم.",
    ],
    instructionsEn: [
      "Stand holding dumbbells at your sides with a slight bend in elbows.",
      "Raise arms out to the sides until parallel to the floor, leading with elbows.",
      "Pause briefly at the top and lower the weights slowly under control.",
    ],
    tipsAr: ["لا تستخدم الدفع بالأرجل أو التأرجح؛ استعمل أوزاناً مناسبة."],
    tipsEn: ["Avoid body swinging or momentum; choose moderate manageable weight."],
    imageKey: "Side_Lateral_Raise/0.jpg,Side_Lateral_Raise/1.jpg",
  },
  {
    slug: "face-pull",
    nameAr: "فيس بول بالكابل (Face Pull)",
    nameEn: "Cable Face Pull",
    category: "shoulders",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["كتف خلفي", "عضلات أعلى الظهر والروتاتور"],
    secondaryMuscles: ["ترابيس وسطى وسفلية"],
    instructionsAr: [
      "ثبت حبل الكابل على مستوى أعلى الصدر أو الجبهة.",
      "أمسك الحبل بقبضة محايدة وارجع خطوة للخلف.",
      "اسحب الحبل باتجاه جبهتك وأذنيك مع توجيه الكوعين لأعلى وتدوير الكتفين للخارج.",
      "اعصر الكتف الخلفي ثم عد بنعومة للبداية.",
    ],
    instructionsEn: [
      "Attach a rope to a cable pulley at upper-chest or forehead height.",
      "Grasp rope ends with a neutral grip and step back to create tension.",
      "Pull towards your forehead/eyes while driving elbows back and externally rotating shoulders.",
      "Squeeze your rear delts and upper back, then return smoothly.",
    ],
    tipsAr: ["تمرين أساسي وممتاز لصحة مفصل الكتف وتعديل وضعية القوام."],
    tipsEn: ["Essential exercise for shoulder joint health and posture correction."],
    imageKey: "Face_Pull/0.jpg,Face_Pull/1.jpg",
  },

  // ==================== LEGS ====================
  {
    slug: "barbell-squat",
    nameAr: "سكوات بالبار (قرفصاء)",
    nameEn: "Barbell Back Squat",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["عضلات الفخذ الأمامية (Quadriceps)", "عضلات المؤخرة (Glutes)"],
    secondaryMuscles: ["فخذ خلفي", "عضلات الكور وأسفل الظهر"],
    instructionsAr: [
      "ضع البار على عضلات الترابيس بأمان وقف مع مباعدة القدمين بعرض الكتفين مع توجيه الأصابع للخارج قليلاً.",
      "خذ نفساً عميقاً واثنِ الركبتين والوركين كأنك تجلس على كرسي حتى يتوازى الفخذان مع الأرض.",
      "حافظ على صدر مرتفع وركبتين متتبعتين لاتجاه أصابع القدم.",
      "ادفع بالأرض من خلال منتصف القدم للوقوف بقوة.",
    ],
    instructionsEn: [
      "Place the barbell across your upper traps. Stand with feet shoulder-width apart, toes slightly flared.",
      "Take a deep breath and descend by hinging hips and bending knees until thighs are parallel to floor.",
      "Keep chest up, spine neutral, and knees tracking in line with toes.",
      "Drive forcefully through mid-foot to return to the starting standing position.",
    ],
    tipsAr: ["لا تدع الركبتين تنضمان للداخل أثناء الصعود."],
    tipsEn: ["Do not allow your knees to cave inward during the ascent."],
    imageKey: "Barbell_Squat/0.jpg,Barbell_Squat/1.jpg",
  },
  {
    slug: "leg-press",
    nameAr: "ليج بريس (جهاز دفع الأرجل)",
    nameEn: "Leg Press",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["عضلات الفخذ الأمامية (Quads)", "المؤخرة"],
    secondaryMuscles: ["عضلات الفخذ الخلفية"],
    instructionsAr: [
      "اجلس في الجهاز مع تثبيت ظهرك ومؤخرتك بإحكام على المقعد.",
      "ضع قدميك على المنصة بعرض الكتفين.",
      "أنزل المنصة بثني الركبتين حتى زاوية 90 درجة دون رفع أسفل الظهر عن المسند.",
      "ادفع المنصة بقوة للأمام دون قفل الركبتين بشكل حاد في القمة.",
    ],
    instructionsEn: [
      "Sit securely in the leg press machine with back and hips firmly supported.",
      "Place feet on the sled platform roughly shoulder-width apart.",
      "Lower the sled smoothly until your knees reach roughly 90 degrees without lower back lifting.",
      "Press the sled back up forcefully through your heels without locking knees.",
    ],
    tipsAr: ["لا تقفل ركبتيك بالكامل في نهاية الدفعة لتجنب الضغط على المفصل."],
    tipsEn: ["Never fully lock out your knees at the top of the press."],
    imageKey: "Leg_Press/0.jpg,Leg_Press/1.jpg",
  },
  {
    slug: "lunges",
    nameAr: "لانجز (طعن)",
    nameEn: "Walking / Static Lunges",
    category: "legs",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["فخذ أمامي", "ألوية"],
    secondaryMuscles: ["فخذ خلفي", "سمانة", "كور"],
    instructionsAr: [
      "قف مستقيماً وتقدم بخطوة واسعة للأمام بساق واحدة.",
      "أنزل جسمك حتى تنثني الركبة الأمامية بزاوية 90 درجة وتقترب الركبة الخلفية من الأرض.",
      "ادفع بالساق الأمامية للعودة لوضع البداية وكرر بالساق الأخرى.",
    ],
    instructionsEn: [
      "Stand tall and take a large step forward with one leg.",
      "Lower hips until front knee bends to 90 degrees and back knee nears the ground.",
      "Drive through the front foot heel to return to starting position and switch legs.",
    ],
    tipsAr: ["حافظ على استقامة الجذع ولا تدع الركبة الأمامية تندفع كثيراً بعد الأصابع."],
    tipsEn: ["Keep your torso upright and prevent front knee from traveling excessively past toes."],
    imageKey: "Dumbbell_Lunges/0.jpg,Dumbbell_Lunges/1.jpg",
  },
  {
    slug: "romanian-deadlift",
    nameAr: "ديدليفت روماني (RDL)",
    nameEn: "Romanian Deadlift",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["عضلات الفخذ الخلفية (Hamstrings)", "عضلات المؤخرة (Glutes)"],
    secondaryMuscles: ["أسفل الظهر", "عضلات القبضة"],
    instructionsAr: [
      "قف حاملاً البار عند الفخذين مع ثني طفيف جداً في الركبتين وثباته طوال التمرين.",
      "ادفع مؤخرتك للخلف وانحنِ بالجذع للأمام مع بقاء البار ملامساً للساقين.",
      "انزل حتى تشعر بإطالة قوية في العضلات الخلفية للفخذ.",
      "ادفع الورك للأمام واعتصر المؤخرة للعودة للوقوف.",
    ],
    instructionsEn: [
      "Stand holding the barbell at hip height with a slight fixed bend in your knees.",
      "Hinge at your hips pushing your glutes backward while keeping the bar close to your shins.",
      "Lower until you feel a deep stretch in your hamstrings.",
      "Drive hips forward and squeeze glutes to return to standing position.",
    ],
    tipsAr: ["الحركة تتم من مفصل الورك وليس بثني الركبتين."],
    tipsEn: ["Movement is a hip-hinge, not a squatting motion."],
    imageKey: "Romanian_Deadlift/0.jpg,Romanian_Deadlift/1.jpg",
  },
  {
    slug: "hip-thrust",
    nameAr: "هيب ثرست بالبار (Hip Thrust)",
    nameEn: "Barbell Hip Thrust",
    category: "legs",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["عضلات المؤخرة (Glutes)"],
    secondaryMuscles: ["فخذ خلفي", "فخذ أمامي"],
    instructionsAr: [
      "اجلس على الأرض مستنداً بأعلى ظهرك على حافة بنش مع وضع بار مريح فوق الحوض.",
      "ثبت القدمين على الأرض بعرض الكتفين مع ثني الركبتين.",
      "ادفع الوركين للأعلى عبر الكعبين حتى يستقيم جسمك من الركبتين حتى الكتفين.",
      "اعصر عضلات المؤخرة بقوة في القمة لثانية ثم انزل بتحكم.",
    ],
    instructionsEn: [
      "Sit on the floor with your upper back resting against a flat bench and a padded barbell over hips.",
      "Plant feet shoulder-width on the floor with knees bent at 90 degrees at lockout.",
      "Drive through your heels to extend hips upward until torso and thighs form a straight line.",
      "Squeeze glutes hard at the top for a second, then lower under control.",
    ],
    tipsAr: ["أبقِ الذقن متجهاً للأمام نحو الصدر لحماية أسفل الظهر."],
    tipsEn: ["Keep chin tucked forward toward chest to maintain pelvic alignment."],
    imageKey: "Barbell_Glute_Bridge/0.jpg,Barbell_Glute_Bridge/1.jpg",
  },
  {
    slug: "leg-extension",
    nameAr: "ليج إكستنشن (فرد فخذ أمامي)",
    nameEn: "Leg Extensions",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["عضلات الفخذ الأمامية (Quadriceps)"],
    secondaryMuscles: [],
    instructionsAr: [
      "اجلس على الجهاز مع وضع وسادة الساقين فوق الكاحلين مباشرة.",
      "افرد ساقيك للأمام وللأعلى حتى تستقيما تماماً مع عصر العضلة الرباعية.",
      "أنزل الوزن ببطء وتحكم لنقطة البداية.",
    ],
    instructionsEn: [
      "Sit in the machine with the pad resting just above your ankles.",
      "Extend your legs upward until straight, squeezing the quadriceps.",
      "Lower the weight back down slowly and under control.",
    ],
    tipsAr: ["تحكم في النزول ولا تدع الأوزان تسقط بسرعة."],
    tipsEn: ["Control the negative phase; do not let weights slam down."],
    imageKey: "Leg_Extensions/0.jpg,Leg_Extensions/1.jpg",
  },
  {
    slug: "leg-curl",
    nameAr: "ليج كيرل (ثني فخذ خلفي)",
    nameEn: "Lying / Seated Leg Curl",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["عضلات الفخذ الخلفية (Hamstrings)"],
    secondaryMuscles: ["سمانة"],
    instructionsAr: [
      "استلقِ أو اجلس على الجهاز وضع وسادة الساق خلف الكعبين.",
      "اثنِ ساقيك بسحب الكعبين باتجاه المؤخرة.",
      "اثبت للحظة في أقصى انقباض ثم أعد الساقين ببطء.",
    ],
    instructionsEn: [
      "Position yourself on the leg curl machine with roller pad against lower calves.",
      "Curl your legs upward/inward toward your glutes.",
      "Hold peak contraction for a moment, then return slowly to starting position.",
    ],
    tipsAr: ["حافظ على ثبات الحوض على المقعد دون رفعه."],
    tipsEn: ["Keep hips planted on the bench throughout the curl."],
    imageKey: "Lying_Leg_Curls/0.jpg,Lying_Leg_Curls/1.jpg",
  },
  {
    slug: "calf-raise",
    nameAr: "رفع السمانة (Calf Raise)",
    nameEn: "Standing Calf Raises",
    category: "legs",
    equipment: "machine",
    level: "beginner",
    primaryMuscles: ["عضلات السمانة (Gastrocnemius / Soleus)"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف بمقدمة القدمين على حافة درج أو منصة مرتفعة.",
      "ارفع جسمك لأعلى قدر الإمكان بالضغط على أصابع القدمين.",
      "أنزل الكعبين لأسفل للحصول على أقصى إطالة ممكنة للسمانة.",
    ],
    instructionsEn: [
      "Stand with the balls of your feet on the edge of a raised platform or step.",
      "Raise your heels as high as possible, contracting your calves at the top.",
      "Lower your heels below the platform level for a full stretch.",
    ],
    tipsAr: ["توقف لثانية كاملة في أسفل الإطالة لمنع ارتداد وتر أكيليس."],
    tipsEn: ["Pause for a full second at the bottom stretch to eliminate Achilles tendon bounce."],
    imageKey: "Standing_Calf_Raises/0.jpg,Standing_Calf_Raises/1.jpg",
  },

  // ==================== BICEPS ====================
  {
    slug: "dumbbell-curl",
    nameAr: "تبادل بايسبس بالدمبل",
    nameEn: "Dumbbell Bicep Curl",
    category: "biceps",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["عضلة البايسبس"],
    secondaryMuscles: ["عضلات الساعد"],
    instructionsAr: [
      "قف مستقيماً ممسكاً بدمبل في كل يد بجانب الفخذين.",
      "اثنِ كوعك وارفع الدمبل مع تدوير المعصم للأعلى وللخارج.",
      "اعصر البايسبس في القمة ثم أنزل الدمبل ببطء وتحكم.",
    ],
    instructionsEn: [
      "Stand tall holding a pair of dumbbells at arms' length by your sides.",
      "Curl weights up while supinating your wrists (turning palms facing upward).",
      "Squeeze biceps at the top, then lower slowly back to the starting point.",
    ],
    tipsAr: ["ثبت كوعيك بجانب جذعك وتجنب أرجحة الظهر."],
    tipsEn: ["Keep elbows pinned to your sides and avoid using lower-back swing."],
    imageKey: "Dumbbell_Bicep_Curl/0.jpg,Dumbbell_Bicep_Curl/1.jpg",
  },
  {
    slug: "hammer-curl",
    nameAr: "هامر كيرل (مطرقة بالدمبل)",
    nameEn: "Dumbbell Hammer Curl",
    category: "biceps",
    equipment: "dumbbell",
    level: "beginner",
    primaryMuscles: ["البراكياليس (Brachialis)", "البايسبس"],
    secondaryMuscles: ["الساعد (Brachioradialis)"],
    instructionsAr: [
      "أمسك بالدمبل مع توجيه راحتي اليدين لبعضهما (قبضة محايدة).",
      "ارفع الدمبل للأعلى مع الحفاظ على القبضة المحايدة طوال التمرين.",
      "أنزل الوزن ببطء وتحكم للبداية.",
    ],
    instructionsEn: [
      "Hold dumbbells with palms facing each other (neutral grip).",
      "Curl weights upward while maintaining the neutral hand position.",
      "Lower slowly back down under full muscular control.",
    ],
    tipsAr: ["تمرين ممتاز لزيادة سمك الذراع وقوة الساعد."],
    tipsEn: ["Great exercise for arm thickness and forearm grip strength."],
    imageKey: "Hammer_Curls/0.jpg,Hammer_Curls/1.jpg",
  },

  // ==================== TRICEPS ====================
  {
    slug: "triceps-pushdown",
    nameAr: "ترايسبس بوش داون بالكيبل",
    nameEn: "Cable Triceps Pushdown",
    category: "triceps",
    equipment: "cable",
    level: "beginner",
    primaryMuscles: ["عضلة الترايسبس (الرؤوس الثلاثة)"],
    secondaryMuscles: [],
    instructionsAr: [
      "قف أمام جهاز الكابل وأمسك الحبل أو البار المثبت في الأعلى.",
      "ثبت كوعيك بجانبيك وادفع الوزن لأسفل حتى تستقيم الذراعين تماماً.",
      "اعصر الترايسبس في الأسفل ثم أعد الذراعين للأعلى حتى زاوية 90 درجة.",
    ],
    instructionsEn: [
      "Stand facing high pulley cable holding rope or straight bar.",
      "Tuck elbows by ribs and press downward until arms are fully extended.",
      "Squeeze triceps at bottom, then return under control to 90 degrees bend.",
    ],
    tipsAr: ["لا تترك الكوعين يرتفعان أو يتحركان للأمام أثناء التمرين."],
    tipsEn: ["Do not let elbows flare forward or travel up away from your torso."],
    imageKey: "Triceps_Pushdown/0.jpg,Triceps_Pushdown/1.jpg",
  },
  {
    slug: "skull-crushers",
    nameAr: "سكل كراشرز (ترايسبس بار EZ مستلقياً)",
    nameEn: "EZ-Bar Skull Crushers (Lying Triceps Extension)",
    category: "triceps",
    equipment: "barbell",
    level: "intermediate",
    primaryMuscles: ["الرأس الطويل للترايسبس"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على بنش مستوي ممسكاً ببار متعرج (EZ) فوق صدرك وذراعاك ممدودتان.",
      "اثنِ كوعيك لإنزال البار ببطء باتجاه جبهتك أو خلف رأسك قليلاً.",
      "ادفع البار لأعلى بقوة الترايسبس حتى تستقيم الذراعان.",
    ],
    instructionsEn: [
      "Lie on flat bench holding EZ bar above chest with arms extended.",
      "Bend at elbows to lower bar controlled toward your forehead or just past your head.",
      "Extend elbows to press the bar back up to the starting position.",
    ],
    tipsAr: ["حافظ على ثبات عظام العضد وركز الحركة حول مفصل المرفق فقط."],
    tipsEn: ["Keep upper arms fixed in place and move only through the elbow joint."],
    imageKey: "Lying_Triceps_Extension/0.jpg,Lying_Triceps_Extension/1.jpg",
  },

  // ==================== CORE ====================
  {
    slug: "plank",
    nameAr: "بلانك (ثبات)",
    nameEn: "Forearm Plank",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["عضلة البطن المستقيمة", "عضلات الكور العميقة"],
    secondaryMuscles: ["أكتاف", "مؤخرة", "فخذ أمامي"],
    instructionsAr: [
      "استند على الساعدين وأصابع القدمين مع جعل الجسم في خط مستقيم كامل.",
      "شد عضلات البطن والمؤخرة بقوة مع التنفس المنتظم.",
      "اثبت في هذا الوضع طوال المدة المحددة دون ترك الحوض يسقط أو يرتفع.",
    ],
    instructionsEn: [
      "Rest on forearms and toes with your entire body forming a straight rigid line.",
      "Engage your core, glutes, and quads while breathing steadily.",
      "Hold the position for prescribed duration without letting hips sag or pike.",
    ],
    tipsAr: ["تأكد أن الكوعين تحت الكتفين مباشرة."],
    tipsEn: ["Ensure elbows are placed directly underneath your shoulders."],
    imageKey: "Plank/0.jpg,Plank/1.jpg",
  },
  {
    slug: "crunches",
    nameAr: "كرانش للبطن",
    nameEn: "Abdominal Crunches",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["عضلات البطن العلوية"],
    secondaryMuscles: [],
    instructionsAr: [
      "استلقِ على ظهرك مع ثني الركبتين ووضع القدمين على الأرض.",
      "ضع يديك خلف رأسك بخفة أو اعبرهما فوق صدرك.",
      "ارفع كتفيك وأعلى ظهرك عن الأرض باتجاه الركبتين مع عصر عضلات البطن.",
      "أنزل ببطء دون أن يلامس رأسك الأرض تماماً.",
    ],
    instructionsEn: [
      "Lie on back with knees bent and feet flat on floor.",
      "Place fingers lightly behind head or cross arms across chest.",
      "Contract abs to lift shoulder blades off the floor, curling slightly upward.",
      "Lower slowly back down without letting head rest completely.",
    ],
    tipsAr: ["لا تسحب رقبتك بيديك؛ الرفع يتم بعضلات البطن فقط."],
    tipsEn: ["Do not yank your neck with hands; initiate and drive movement purely with abs."],
    imageKey: "Crunches/0.jpg,Crunches/1.jpg",
  },
  {
    slug: "russian-twist",
    nameAr: "تويست روسي (Russian Twist)",
    nameEn: "Russian Twist",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["عضلات البطن المائلة (Obliques)"],
    secondaryMuscles: ["عضلات البطن المستقيمة"],
    instructionsAr: [
      "اجلس على الأرض مع ثني الركبتين ورفع القدمين قليلاً عن الأرض وميل الجذع للخلف 45 درجة.",
      "لف جذعك من جانب إلى آخر مع لمس الأرض على كل جانب باليدين أو بوزن خفيف.",
    ],
    instructionsEn: [
      "Sit on floor with knees bent, feet slightly elevated, leaning torso back at 45 degrees.",
      "Rotate torso from side to side, touching hands/weight to floor on each flank.",
    ],
    tipsAr: ["التدوير يجب أن ينبع من الجذع والقفص الصدري وليس الذراعين فقط."],
    tipsEn: ["Rotation should originate from your ribcage and core, not just arm swinging."],
    imageKey: "Russian_Twist/0.jpg,Russian_Twist/1.jpg",
  },
  {
    slug: "mountain-climbers",
    nameAr: "تسلق الجبل (Mountain Climbers)",
    nameEn: "Mountain Climbers",
    category: "core",
    equipment: "bodyweight",
    level: "beginner",
    primaryMuscles: ["عضلات الكور", "عضلة البطن المستقيمة"],
    secondaryMuscles: ["أكتاف", "كارديو"],
    instructionsAr: [
      "ابدأ في وضع البلانك المرتفع على الكفين.",
      "اسحب ركبة واحدة بسرعة للأمام باتجاه الصدر ثم أرجعها واسحب الأخرى بالتناوب.",
      "حافظ على إيقاع سريع وثبات الحوض.",
    ],
    instructionsEn: [
      "Start in a high plank on your hands.",
      "Drive one knee forward toward your chest, quickly switch legs in a running motion.",
      "Maintain a fast rhythmic pace while keeping hips level.",
    ],
    tipsAr: ["حافظ على ثبات الكتفين فوق المعصمين."],
    tipsEn: ["Keep shoulders stacked directly over wrists."],
    imageKey: "Mountain_Climbers/0.jpg,Mountain_Climbers/1.jpg",
  },

  // ==================== CARDIO ====================
  {
    slug: "burpees",
    nameAr: "بيربيز (Burpees)",
    nameEn: "Burpees",
    category: "cardio",
    equipment: "bodyweight",
    level: "intermediate",
    primaryMuscles: ["كامل الجسم", "كارديو"],
    secondaryMuscles: ["صدر", "فخذ أمامي", "أكتاف", "كور"],
    instructionsAr: [
      "من وضع الوقوف، انزل في وضع القرفصاء وضع يديك على الأرض.",
      "اقفز بقدميك للخلف لتصبح في وضع البلانك واعمل ضغطة واحدة.",
      "اقفز بقدميك للأمام للعودة للقرفصاء ثم اقفز للأعلى بقوة في الهواء مع رفع اليدين.",
    ],
    instructionsEn: [
      "From standing, drop into a squat and place hands on floor.",
      "Kick feet back into a plank and perform a push-up.",
      "Jump feet back toward hands, then leap forcefully straight up with arms overhead.",
    ],
    tipsAr: ["حافظ على وتيرة منتظمة وتنفس عميق طوال المجموعة."],
    tipsEn: ["Pace yourself with steady breathing throughout the set."],
    imageKey: "Burpee/0.jpg,Burpee/1.jpg",
  },
  {
    slug: "jumping-jacks",
    nameAr: "جمبينج جاكس (Jumping Jacks)",
    nameEn: "Jumping Jacks",
    category: "cardio",
    equipment: "none",
    level: "beginner",
    primaryMuscles: ["كارديو", "سمانة"],
    secondaryMuscles: ["أكتاف", "فخذ"],
    instructionsAr: [
      "قف مستقيماً مع ضم القدمين والذراعين بجانبك.",
      "اقفز مباعداً بين قدميك مع رفع الذراعين للأعلى فوق رأسك.",
      "اقفز مرة أخرى للعودة لنقطة البداية وكرر بإيقاع سريع.",
    ],
    instructionsEn: [
      "Stand upright with feet together and arms at your sides.",
      "Jump feet out wide while swinging arms up overhead.",
      "Jump back to the starting stance and repeat rhythmically.",
    ],
    tipsAr: ["اهبط بنعومة على مقدمة القدمين لتقليل الحمل على المفاصل."],
    tipsEn: ["Land softly on the balls of your feet to minimize joint impact."],
    imageKey: "Jumping_Jacks/0.jpg,Jumping_Jacks/1.jpg",
  },
  {
    slug: "high-knees",
    nameAr: "الجري في المكان مع رفع الركبتين (High Knees)",
    nameEn: "High Knees",
    category: "cardio",
    equipment: "none",
    level: "beginner",
    primaryMuscles: ["كارديو", "فخذ أمامي"],
    secondaryMuscles: ["كور", "سمانة"],
    instructionsAr: [
      "قف مستقيماً وابدأ في الجري في المكان مع رفع الركبتين إلى مستوى الخصر أو أعلى.",
      "حرك ذراعيك بالتناوب مع الساقين وحافظ على إيقاع ديناميكي سريع.",
    ],
    instructionsEn: [
      "Stand tall and run in place, driving knees up to waist height or above.",
      "Pump arms synchronously with legs at an energetic, brisk tempo.",
    ],
    tipsAr: ["ابقَ على أطراف أصابع القدمين مع استقامة الجذع."],
    tipsEn: ["Stay light on your toes and keep an upright spine."],
    imageKey: "High_Knees/0.jpg,High_Knees/1.jpg",
  },
];

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return EXERCISES.find((e) => e.slug === slug);
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
        e.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
        e.secondaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q),
    );
  }

  return result;
}

export function getRelatedExercises(exercise: Exercise, limit = 3): Exercise[] {
  return EXERCISES.filter(
    (e) =>
      e.slug !== exercise.slug &&
      (e.category === exercise.category || e.equipment === exercise.equipment),
  ).slice(0, limit);
}
