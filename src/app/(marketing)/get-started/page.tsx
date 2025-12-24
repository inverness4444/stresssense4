import { getLocale } from "@/lib/i18n-server";
import GetStartedClient from "./GetStartedClient";

export default async function GetStartedPage() {
  const locale = await getLocale();
  return <GetStartedClient locale={locale} />;
}
