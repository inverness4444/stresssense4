import { redirect } from "next/navigation";
import { env } from "@/config/env";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  if (!env.isDev) {
    redirect("/signin");
  }
  return <LoginClient />;
}
