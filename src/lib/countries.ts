/**
 * Country dial codes with flag emojis for the WhatsApp input field.
 * Sorted by priority: Egypt, Saudi, UAE, Kuwait first (top audience),
 * then alphabetical by name.
 */

export type Country = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dialCode: string; // e.g. "+20"
  flag: string; // emoji
};

export const COUNTRIES: Country[] = [
  { code: "EG", name: "مصر / Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "SA", name: "السعودية / Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات / UAE", dialCode: "+971", flag: "🇦🇪" },
  { code: "KW", name: "الكويت / Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "QA", name: "قطر / Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "BH", name: "البحرين / Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "عمان / Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "JO", name: "الأردن / Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "LB", name: "لبنان / Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { code: "IQ", name: "العراق / Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "LY", name: "ليبيا / Libya", dialCode: "+218", flag: "🇱🇾" },
  { code: "DZ", name: "الجزائر / Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "MA", name: "المغرب / Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "TN", name: "تونس / Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "SD", name: "السودان / Sudan", dialCode: "+249", flag: "🇸🇩" },
  { code: "YE", name: "اليمن / Yemen", dialCode: "+967", flag: "🇾🇪" },
  { code: "PS", name: "فلسطين / Palestine", dialCode: "+970", flag: "🇵🇸" },
  { code: "SY", name: "سوريا / Syria", dialCode: "+963", flag: "🇸🇾" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Germany / Deutschland", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "TR", name: "Turkey / Türkiye", dialCode: "+90", flag: "🇹🇷" },
  { code: "IN", name: "India / الهند", dialCode: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan / باكستان", dialCode: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh / بنغلاديش", dialCode: "+880", flag: "🇧🇩" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Egypt

/**
 * Combine a country dial code with a local number into a single E.164-like string.
 * Strips leading zeros from the local number (Egyptians often write 0100... but
 * the international form is +20 100...).
 */
export function formatWhatsappNumber(dialCode: string, localNumber: string): string {
  const cleaned = localNumber.replace(/[^0-9]/g, "").replace(/^0+/, "");
  return `${dialCode}${cleaned}`;
}

/**
 * Build a wa.me link for a given full number (with country code, no +, no spaces).
 */
export function waMeLink(fullNumber: string, message?: string): string {
  const digits = fullNumber.replace(/[^0-9]/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
