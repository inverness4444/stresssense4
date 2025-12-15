import { redirect } from "next/navigation";
import { getKioskSession } from "@/lib/kiosk";
import KioskClient from "./ui";

export default async function KioskPage({ params }: { params: { id: string } }) {
  const session = await getKioskSession(params.id);
  if (!session) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-lg text-slate-700">Kiosk not found.</div>;
  }
  if (!session.isActive) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-lg text-slate-700">This kiosk is disabled.</div>;
  }
  const survey = session.survey;
  return <KioskClient session={session} survey={survey} />;
}
