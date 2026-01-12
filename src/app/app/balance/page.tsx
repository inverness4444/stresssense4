import { redirect } from "next/navigation";

export default async function BalancePage() {
  redirect("/app/settings/billing");
}
