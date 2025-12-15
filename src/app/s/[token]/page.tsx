import { redirect } from "next/navigation";
import { submitSurveyResponse } from "./actions";
import { prisma } from "@/lib/prisma";

type Props = { params: { token: string }; searchParams?: { thanks?: string } };

export default async function PublicSurveyPage({ params, searchParams }: Props) {
  const invite = await prisma.surveyInviteToken.findUnique({
    where: { token: params.token },
    include: {
      survey: {
        include: {
          questions: { orderBy: { order: "asc" } },
          organization: {
            include: { settings: true },
          },
        },
      },
    },
  });

  if (searchParams?.thanks === "1") {
    return (
      <Notice message="Thanks for sharing. Your responses are anonymous and will be used in aggregate to improve how your team works." />
    );
  }

  if (!invite) return <Notice message="This survey link is invalid." />;

  const now = new Date();
  if (invite.usedAt) return <Notice message="You already completed this survey. Thank you!" />;
  if (invite.survey.status !== "ACTIVE") return <Notice message="This survey is not active." />;
  if (invite.survey.startsAt && now < invite.survey.startsAt)
    return <Notice message="This survey hasn't started yet." />;
  if (invite.survey.endsAt && now > invite.survey.endsAt) return <Notice message="This survey is closed." />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-sm font-semibold text-white shadow-md">
            💜
          </span>
          <div>
            <p className="text-base font-semibold text-slate-900">StressSense</p>
            <p className="text-xs font-medium text-slate-500">Stress pulse</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{invite.survey.name}</h1>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Anonymous by design
          </span>
        </div>
        <p className="text-sm text-slate-600">
          This quick check-in helps your company understand stress levels. Answers are anonymous and aggregated.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          <p className="text-sm font-semibold text-slate-900">How your answers are used</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>• Individual answers are never shown to managers; only aggregated results are shared.</li>
            <li>
              • Teams need at least {invite.survey.minResponsesForBreakdown ?? invite.survey.organization.settings?.minResponsesForBreakdown ?? 4} responses before any breakdowns are visible.
            </li>
            <li>• Your answers are stored securely and only used to understand stress trends.</li>
          </ul>
        </div>

        <SurveyForm questions={invite.survey.questions.map((q) => ({ ...q }))} token={params.token} />
      </div>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-800">{message}</p>
      </div>
    </div>
  );
}

function SurveyForm({
  questions,
  token,
}: {
  questions: { id: string; text: string; type: string; scaleMin: number | null; scaleMax: number | null }[];
  token: string;
}) {
  return (
    <form
      action={async (formData) => {
        "use server";
        const answers = questions.map((q) => {
          if (q.type === "SCALE") {
            const value = Number(formData.get(`q-${q.id}`) ?? 0);
            return { questionId: q.id, type: q.type, scaleValue: value };
          }
          return { questionId: q.id, type: q.type, textValue: (formData.get(`q-${q.id}`) as string) || "" };
        });

        const result = await submitSurveyResponse(token, answers);
        if (!result?.error) {
          redirect(`/s/${token}?thanks=1`);
        }
      }}
      className="mt-6 space-y-4"
    >
      {questions.map((q) =>
        q.type === "SCALE" ? (
          <div key={q.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">{q.text}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 }).map((_, idx) => {
                const value = (q.scaleMin ?? 1) + idx;
                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/40"
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={value}
                      required
                      className="text-primary focus:ring-primary/40"
                    />
                    {value}
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div key={q.id} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{q.text}</p>
            <textarea
              name={`q-${q.id}`}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Share any context you feel comfortable adding"
            />
          </div>
        )
      )}
      <button
        type="submit"
        className="w-full rounded-full bg-gradient-to-r from-primary to-primary-strong px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg"
      >
        Submit
      </button>
    </form>
  );
}
