import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import StressSurveyPageClient from "./ui/StressSurveyPageClient";

export default async function StressSurveyPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!["EMPLOYEE", "MANAGER", "HR", "ADMIN"].includes((user.role ?? "").toUpperCase())) notFound();
  const locale = await getLocale();

  return <StressSurveyPageClient userName={user.name ?? ""} locale={locale} />;
}
