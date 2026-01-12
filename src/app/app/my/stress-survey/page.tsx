import { notFound } from "next/navigation";
import { getDailySurveyPageData } from "./actions";
import StressSurveyPageClient from "./ui/StressSurveyPageClient";
import { SelfStressSurveyProvider } from "@/components/app/SelfStressSurveyProvider";

export default async function StressSurveyPage() {
  const data = await getDailySurveyPageData();
  if (!data) notFound();

  return (
    <SelfStressSurveyProvider locale={data.locale} userId={data.userId} userEmail={data.userEmail}>
      <StressSurveyPageClient
        userName={data.userName}
        locale={data.locale}
        todaySurvey={data.todaySurvey}
        todayCompletedAt={data.todayCompletedAt}
        todayScore={data.todayScore}
        canStart={data.canStart}
        aiLocked={data.aiLocked}
        history={data.history}
      />
    </SelfStressSurveyProvider>
  );
}
