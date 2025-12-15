import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AppIndex() {
  const user = await getCurrentUser();
  if (user?.role === "EMPLOYEE") {
    redirect("/app/my/home");
  }
  redirect("/app/overview");
}
