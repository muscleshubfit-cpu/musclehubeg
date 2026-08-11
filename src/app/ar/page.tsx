import { redirect } from "next/navigation";

/**
 * Arabic home page — redirects to the main homepage.
 * The homepage is language-agnostic (it uses the client-side i18n provider
 * to detect the user's language preference). So /ar just redirects to /
 * with the Arabic language already set via the i18n context.
 */
export default function Page() {
  redirect("/");
}
