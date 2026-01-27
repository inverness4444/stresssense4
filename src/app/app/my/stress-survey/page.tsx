import { notFound } from "next/navigation";
import { getDailySurveyPageData } from "./actions";
import StressSurveyPageClient from "./ui/StressSurveyPageClient";

export default async function StressSurveyPage() {
  const data = await getDailySurveyPageData();
  if (!data) notFound();

  return (
    <StressSurveyPageClient
      userName={data.userName}
      userId={data.userId}
      userEmail={data.userEmail}
      locale={data.locale}
      todaySurvey={data.todaySurvey}
      todayCompletedAt={data.todayCompletedAt}
      todayScore={data.todayScore}
      canStart={data.canStart}
      aiLocked={data.aiLocked}
      history={data.history}
    />
  );
}
