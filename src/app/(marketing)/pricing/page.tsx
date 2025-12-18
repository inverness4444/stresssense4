import { redirect } from "next/navigation";

export default function PricingPage() {
  // Страницу отключаем, ведём на лендинг
  redirect("/");
}
