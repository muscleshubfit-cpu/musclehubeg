/**
 * notification-templates.ts
 *
 * Shared notification templates used by both CoachView (broadcast)
 * and CoachClientView (per-client). Single source of truth —
 * eliminates duplication and ID drift between the two views.
 */

export interface NotificationTemplate {
  id: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  link: string;
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: "questionnaire",
    icon: "📋",
    titleAr: "تذكير بملء الاستبيان",
    titleEn: "Questionnaire reminder",
    bodyAr:
      "يرجى ملء استبيان التغذية واللياقة البدنية حتى نتمكن من تجهيز برنامجك المخصص.",
    bodyEn:
      "Please fill out the nutrition and fitness questionnaire so we can prepare your personalized program.",
    link: "/questionnaires",
  },
  {
    id: "plan_updated",
    icon: "✅",
    titleAr: "تم تحديث خطتك",
    titleEn: "Your plan has been updated",
    bodyAr:
      "تم تحديث خطتك التدريبية/الغذائية. تفضل بمراجعتها من قسم الخطط.",
    bodyEn:
      "Your workout/nutrition plan has been updated. Check it in the Plans section.",
    link: "/plans",
  },
  {
    id: "followup",
    icon: "📅",
    titleAr: "موعد المتابعة",
    titleEn: "Follow-up reminder",
    bodyAr:
      "حان موعد متابعتك الدورية. يرجى تحديث بيانات التقدم ورفع الصور الحديثة.",
    bodyEn:
      "It's time for your follow-up. Please update your progress data and upload recent photos.",
    link: "/progress",
  },
  {
    id: "workout",
    icon: "💪",
    titleAr: "تذكير بالتمارين",
    titleEn: "Workout reminder",
    bodyAr: "لا تنسَ تمارينك اليوم! الالتزام بالبرنامج هو مفتاح النتائج.",
    bodyEn:
      "Don't forget your workout today! Consistency is key to results.",
    link: "/plans",
  },
  {
    id: "nutrition",
    icon: "🥗",
    titleAr: "تذكير بالتغذية",
    titleEn: "Nutrition reminder",
    bodyAr:
      "تذكر متابعة نظامك الغذائي وتسجيل وجباتك في متتبع الوجبات.",
    bodyEn:
      "Remember to follow your nutrition plan and log your meals in the meal planner.",
    link: "/meal-planner",
  },
  {
    id: "payment_reminder",
    icon: "💳",
    titleAr: "تذكير بالتجديد",
    titleEn: "Renewal reminder",
    bodyAr:
      "اشتراكك على وشك الانتهاء. تجدد الآن للحفاظ على وصولك لكل الميزات.",
    bodyEn:
      "Your subscription is ending soon. Renew now to keep access to all features.",
    link: "/memberships",
  },
];

/** Links available for notification routing */
export const NOTIFICATION_LINKS = [
  { value: "/dashboard", labelAr: "لوحة التحكم", labelEn: "Dashboard" },
  { value: "/plans", labelAr: "الخطط", labelEn: "Plans" },
  { value: "/questionnaires", labelAr: "الاستبيانات", labelEn: "Questionnaires" },
  { value: "/progress", labelAr: "التقدم", labelEn: "Progress" },
  { value: "/meal-planner", labelAr: "مخطط الوجبات", labelEn: "Meal Planner" },
  { value: "/memberships", labelAr: "العضويات", labelEn: "Memberships" },
  { value: "/support", labelAr: "الدعم", labelEn: "Support" },
];
