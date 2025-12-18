import type { Locale } from "@/lib/i18n";

export type AiContextType = "workspace_overview" | "manager_view" | "employee_home" | "survey_report" | "team_overview" | "demo";

export type AiContextData = {
  role?: string;
  locale?: Locale;
  stress?: number;
  engagement?: number;
  atRiskTeams?: number;
  lastSurvey?: string;
  teamName?: string;
};

type AiResponse = { text: string; suggested?: string[] };

function t(locale: Locale, en: string, ru: string) {
  return locale === "ru" ? ru : en;
}

export async function mockAiRespond(prompt: string, context: AiContextType, data: AiContextData = {}): Promise<AiResponse> {
  const locale: Locale = data.locale ?? "en";
  const stress = data.stress ?? 7.1;
  const engagement = data.engagement ?? 7.4;
  const atRiskTeams = data.atRiskTeams ?? 2;

  const baselineText = t(
    locale,
    "Here’s a quick take based on your workspace. I stay focused on work stress and engagement only.",
    "Короткий разбор по рабочему стрессу и вовлечённости. Только про работу, без медицины."
  );

  const templates: Record<AiContextType, AiResponse> = {
    workspace_overview: {
      text: `${baselineText} Stress: ${stress.toFixed(1)}/10, engagement: ${engagement.toFixed(1)}/10, at-risk teams: ${atRiskTeams}.`,
      suggested: [
        t(locale, "Pick 3 outcomes for this month and align with managers.", "Согласуйте 3 ключевых результата месяца с менеджерами."),
        t(locale, "Batch surveys to one cadence and publish expectations.", "Сведите опросы к единому ритму и заранее объявите ожидания."),
        t(locale, "Ask managers of at-risk teams to run 1:1s on workload.", "Попросите менеджеров команд в риске провести 1:1 про нагрузку."),
      ],
    },
    manager_view: {
      text: t(
        locale,
        "Focus your team this week: clarify priorities and unblock workload.",
        "Сфокусируйте команду на этой неделе: проясните приоритеты и снимите перегруз."
      ),
      suggested: [
        t(locale, "Set 3 outcomes for the sprint and confirm ownership.", "Задайте 3 результата спринта и подтвердите владельцев."),
        t(locale, "Group meetings and protect one focus block daily.", "Соберите митинги в блок и оставьте один фокус-блок в день."),
        t(locale, "Recognize a recent win to lift engagement.", "Отметьте недавнюю победу, чтобы поднять вовлечённость."),
      ],
    },
    employee_home: {
      text: t(
        locale,
        "Tell me what’s adding stress, and I’ll suggest small steps to discuss with your manager.",
        "Расскажите, что добавляет стресса, — подскажу маленькие шаги для разговора с менеджером."
      ),
      suggested: [
        t(locale, "Ask for a no-meeting focus block to clear top tasks.", "Попросите фокус-блок без митингов для ключевых задач."),
        t(locale, "Share 3 priorities with your manager to reset expectations.", "Поделитесь 3 приоритетами с менеджером, чтобы выровнять ожидания."),
        t(locale, "Defer low-priority tasks for 1–2 недели.", "Отложите низкие приоритеты на 1–2 недели."),
      ],
    },
    survey_report: {
      text: t(
        locale,
        "Survey insights: stress trending up due to deadlines; engagement steady. Here are actions to steady the curve.",
        "Инсайты опроса: стресс растёт из-за дедлайнов, вовлечённость стабильна. Вот шаги, чтобы стабилизировать ситуацию."
      ),
      suggested: [
        t(locale, "Clarify scope for the next release and trim low-value work.", "Уточните объём следующего релиза и уберите низкоприоритетные задачи."),
        t(locale, "Schedule 1:1s with overloaded roles this week.", "Назначьте 1:1 с перегруженными ролями на этой неделе."),
        t(locale, "Send a short recap of priorities to the team.", "Отправьте команде краткий recap приоритетов."),
      ],
    },
    team_overview: {
      text: t(
        locale,
        "Team overview loaded. Ask about stress, participation, or what to fix first.",
        "Обзор команды загружен. Спросите про стресс, участие или что исправить в первую очередь."
      ),
      suggested: [
        t(locale, "Run a quick check-in on workload with the team lead.", "Проведите короткий чек-ин по нагрузке с тимлидом."),
        t(locale, "Protect one no-meeting morning for deep work.", "Выделите одно утро без митингов для фокуса."),
        t(locale, "Acknowledge recent wins in the next standup.", "Отметьте недавние победы на ближайшем стендапе."),
      ],
    },
    demo: {
      text: t(
        locale,
        "This is a demo of StressSense AI. Ask about stress trends, teams in risk, or how to talk to your manager.",
        "Это демо StressSense AI. Спросите про тренды стресса, команды в риске или как обсудить нагрузку с менеджером."
      ),
      suggested: [
        t(locale, "Show me teams at risk and what to do first.", "Покажи команды в риске и что сделать в первую очередь."),
        t(locale, "How to explain stress surveys to the team?", "Как объяснить команде опросы по стрессу?"),
        t(locale, "Suggest actions if deadlines are slipping.", "Предложи шаги, если сроки срываются."),
      ],
    },
  };

  const base = templates[context] ?? templates.demo;
  return {
    text: `${base.text}\n\n${prompt ? t(locale, "You asked: ", "Ваш вопрос: ") + prompt : ""}`.trim(),
    suggested: base.suggested,
  };
}
