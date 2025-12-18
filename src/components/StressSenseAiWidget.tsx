"use client";

import { useEffect, useMemo, useState } from "react";
import { InsightTag } from "@/lib/statusLogic";
import { EngagementTrendCard, TrendPoint } from "@/components/EngagementTrendCard";
import { t, type Locale } from "@/lib/i18n";

type Mode = "landing" | "employee" | "manager";
type Variant = "inline" | "floating";
type TabKey = "home" | "messages" | "help";
type MessageKind = "text" | "report" | "bullets";
type Message = { id: string; role: "ai" | "user"; text: string; kind?: MessageKind; bullets?: string[]; reportData?: { stress: number; engagement: number; insights?: string[] } };

type EmployeeMetrics = {
  stress?: number;
  wellbeing?: number;
  mood?: number;
  habitsCompletion?: number;
  tags?: InsightTag[];
};

type ManagerFacts = {
  teams: Array<{ id: string; name: string; level: string; stress?: number; participation?: number; tags?: string[]; nudges?: number }>;
  topNudges: Array<{ title: string; teamId: string; status: string }>;
};

type FlowQuestion = { id: string; text: string; options: Array<{ label: string; value: string; tag?: InsightTag }> };
type FlowConfig = {
  id: string;
  title: string;
  questions: FlowQuestion[];
  onComplete: (answers: Record<string, string>, tags: InsightTag[]) => Message[];
};

const landingReportInsights = (locale: Locale) =>
  locale === "ru"
    ? ["Стресс растёт из-за дедлайнов", "У вовлечённых команд индекс стресса ниже", "Командам важно видеть прозрачные приоритеты"]
    : [t(locale, "widgetLandingInsight1"), t(locale, "widgetLandingInsight2"), t(locale, "widgetLandingInsight3")];

const landingHelpCategories = (locale: Locale) => [
  {
    title: t(locale, "widgetLandingHelpTitle1"),
    articles: [
      { title: t(locale, "widgetLandingHelpArticle11"), summary: t(locale, "widgetLandingHelpArticle12") },
      { title: t(locale, "widgetLandingHelpArticle13"), summary: t(locale, "widgetLandingHelpArticle14") },
    ],
  },
  {
    title: t(locale, "widgetLandingHelpTitle2"),
    articles: [
      { title: t(locale, "widgetLandingHelpArticle21"), summary: t(locale, "widgetLandingHelpArticle22") },
      { title: t(locale, "widgetLandingHelpArticle23"), summary: t(locale, "widgetLandingHelpArticle24") },
    ],
  },
  {
    title: t(locale, "widgetLandingHelpTitle3"),
    articles: [
      { title: t(locale, "widgetLandingHelpArticle31"), summary: t(locale, "widgetLandingHelpArticle32") },
      { title: t(locale, "widgetLandingHelpArticle33"), summary: t(locale, "widgetLandingHelpArticle34") },
    ],
  },
  {
    title: t(locale, "widgetLandingHelpTitle4"),
    articles: [
      { title: t(locale, "widgetLandingHelpArticle41"), summary: t(locale, "widgetLandingHelpArticle42") },
    ],
  },
];

const keywordAnswers = (locale: Locale): { keywords: string[]; text: string }[] => [
  { keywords: ["index", "индекс", "stress"], text: t(locale, "widgetKeywordIndex") },
  { keywords: ["hr", "роль"], text: t(locale, "widgetKeywordHr") },
  { keywords: ["manager", "менедж"], text: t(locale, "widgetKeywordManager") },
  { keywords: ["survey", "опрос"], text: t(locale, "widgetKeywordSurvey") },
  { keywords: ["privacy", "данные"], text: t(locale, "widgetKeywordPrivacy") },
];

function topTag(tags: InsightTag[] = []): InsightTag | undefined {
  if (!tags.length) return undefined;
  const counts: Record<string, number> = {};
  tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as InsightTag;
}

const employeeHelpCategories = (locale: Locale) => [
  {
    title: locale === "ru" ? "Что видит менеджер, а что вижу я" : "What managers see vs. what I see",
    articles: [
      { title: locale === "ru" ? "Прозрачность" : "Transparency", summary: locale === "ru" ? "Менеджер видит только агрегаты по команде. Индивидуальные ответы остаются приватными." : "Managers see only team aggregates. Individual answers stay private." },
    ],
  },
  {
    title: locale === "ru" ? "Как часто будут опросы" : "How often are surveys",
    articles: [{ title: locale === "ru" ? "Pulse-частота" : "Pulse frequency", summary: locale === "ru" ? "Обычно раз в 2 недели короткий pulse. Это нужно, чтобы вовремя заметить перегруз." : "Typically a short pulse every 2 weeks — to catch overload early." }],
  },
  {
    title: locale === "ru" ? "Как AI использует мои ответы" : "How AI uses my answers",
    articles: [
      { title: locale === "ru" ? "Только работа" : "Work only", summary: locale === "ru" ? "AI использует ответы, чтобы подсказать про приоритеты и фокус. Никаких медицинских рекомендаций." : "AI uses answers to suggest priorities and focus. No medical advice." },
    ],
  },
];

function toneClasses(tone: "blue" | "green" | "amber" | "red" | "slate" = "blue") {
  const map: Record<typeof tone, string> = {
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-rose-50 text-rose-800 ring-rose-200",
    slate: "bg-slate-100 text-slate-800 ring-slate-200",
  };
  return map[tone];
}

function ReportMiniCard({ locale }: { locale: Locale }) {
  const data: TrendPoint[] = [
    { label: "W1", value: 6.4 },
    { label: "W2", value: 6.7 },
    { label: "W3", value: 7.1 },
    { label: "W4", value: 7.4 },
  ];
  const trendLabel = locale === "ru" ? "последние 4 недели" : "last 4 weeks";
  return (
    <div className="mt-3 rounded-2xl bg-white/80 p-3 shadow-inner ring-1 ring-slate-200">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{locale === "ru" ? "Индекс стресса" : "Stress index"}</span>
        <span className="text-emerald-600">7.0 / 10</span>
      </div>
      <div className="mt-3">
        <EngagementTrendCard scope="team" title={locale === "ru" ? "Мини-отчёт" : "Mini survey report"} score={7} delta={0.4} trendLabel={trendLabel} participation={76} data={data} locale={locale} />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-slate-700">
        {(locale === "ru"
          ? landingReportInsights
          : [
              t(locale, "widgetLandingInsight1"),
              t(locale, "widgetLandingInsight2"),
              t(locale, "widgetLandingInsight3"),
            ]
        ).map((ins) => (
          <li key={ins} className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            {ins}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StressSenseAiWidget({
  mode = "landing",
  employeeMetrics,
  variant = "inline",
  onClose,
  locale = "en",
}: {
  mode?: Mode;
  employeeMetrics?: EmployeeMetrics;
  variant?: Variant;
  onClose?: () => void;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("home");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    mode === "landing"
      ? { id: "hi", role: "ai", text: t(locale, "widgetHiLanding") }
      : mode === "manager"
        ? { id: "hi-mgr", role: "ai", text: t(locale, "widgetHiManager") }
        : {
            id: "hi-emp",
            role: "ai",
            text: t(locale, "widgetHiEmployee"),
          },
  ]);

  const [currentFlow, setCurrentFlow] = useState<FlowConfig | null>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [flowAnswers, setFlowAnswers] = useState<Record<string, string>>({});
  const [flowTags, setFlowTags] = useState<InsightTag[]>([]);
  const [managerFacts, setManagerFacts] = useState<ManagerFacts | null>(null);

  const employeeState = useMemo(() => {
    const stress = employeeMetrics?.stress ?? employeeMetrics?.wellbeing ?? 6.2;
    const wellbeing = employeeMetrics?.wellbeing ?? 7.0;
    const mood = employeeMetrics?.mood ?? 4;
    const habits = employeeMetrics?.habitsCompletion ?? 60;
    const tags = employeeMetrics?.tags ?? [];
    const stressZone = stress < 3 ? (locale === "ru" ? "низкий" : "low") : stress < 7 ? (locale === "ru" ? "средний" : "moderate") : locale === "ru" ? "высокий" : "high";
    const mainTag = topTag(tags);
    const moodText = mood >= 4 ? (locale === "ru" ? "спокойный" : "calm") : mood === 3 ? (locale === "ru" ? "нейтральный" : "neutral") : locale === "ru" ? "напряжённый" : "tense";
    return {
      stress,
      wellbeing,
      mood,
      habits,
      tags,
      summary:
        locale === "ru"
          ? `Сейчас: ${stressZone} стресс (${stress.toFixed(1)}/10). Настроение ${moodText}. ${mainTag ? `Главный триггер: ${tagLabel(mainTag)}.` : ""}`
          : `Now: ${stressZone === "низкий" ? "low" : stressZone === "средний" ? "moderate" : "high"} stress (${stress.toFixed(1)}/10). Mood ${moodText}. ${
              mainTag ? `Top trigger: ${tagLabel(mainTag)}.` : ""
            }`,
      mainTag,
    };
  }, [employeeMetrics]);

  useEffect(() => {
    if (mode !== "manager") return;
    const load = async () => {
      try {
        const res = await fetch("/app/api/nudges/manager");
        const json = await res.json();
        if (res.ok) {
          const teams =
            json.teams?.map((t: any) => {
              const teamNudges = (json.nudges ?? []).filter((n: any) => n.teamId === t.id && n.status === "todo");
              const levels = teamNudges.map((n: any) => n.level ?? n.template?.triggerLevel);
              const level = levels.includes("AtRisk") ? "AtRisk" : levels.includes("UnderPressure") ? "UnderPressure" : "Watch";
              return {
                id: t.id,
                name: t.name,
                level,
                stress: level === "AtRisk" ? 8 : level === "UnderPressure" ? 7 : 5,
                participation: 0.7,
                tags: [],
                nudges: teamNudges.length,
              };
            }) ?? [];
          setManagerFacts({
            teams,
            topNudges: (json.nudges ?? []).slice(0, 3).map((n: any) => ({
              title: n.template?.title ?? n.title,
              teamId: n.teamId,
              status: n.status,
            })),
          });
        }
      } catch (e) {
        setManagerFacts(null);
      }
    };
    void load();
  }, [mode]);

  const landingFlows: FlowConfig[] = [
    {
      id: "simulate",
      title: t(locale, "widgetLandingHelpTitle1"),
      questions: [
        {
          id: "size",
          text: locale === "ru" ? "Какой размер команды?" : "What’s your team size?",
          options: [{ label: locale === "ru" ? "До 10" : "Up to 10", value: "small" }, { label: locale === "ru" ? "10-30" : "10-30", value: "mid" }, { label: locale === "ru" ? "30+" : "30+", value: "large" }],
        },
        {
          id: "deadlines",
          text: locale === "ru" ? "Как часто горят дедлайны?" : "How often do deadlines slip?",
          options: [{ label: locale === "ru" ? "Редко" : "Rarely", value: "rare" }, { label: locale === "ru" ? "Иногда" : "Sometimes", value: "sometimes" }, { label: locale === "ru" ? "Часто" : "Often", value: "often", tag: "workload" }],
        },
        {
          id: "meetings",
          text: locale === "ru" ? "Сколько митингов в день?" : "How many meetings per day?",
          options: [{ label: "1-2", value: "few" }, { label: "3-4", value: "mid" }, { label: "5+", value: "many", tag: "meetings" }],
        },
        {
          id: "overtime",
          text: locale === "ru" ? "Бывает ли переработка?" : "Is there overtime?",
          options: [{ label: locale === "ru" ? "Нет" : "No", value: "no" }, { label: locale === "ru" ? "Иногда" : "Sometimes", value: "sometimes", tag: "workload" }, { label: locale === "ru" ? "Часто" : "Often", value: "often", tag: "workload" }],
        },
      ],
      onComplete: (answers, tags) => {
        const stress = tags.includes("workload") || tags.includes("meetings") ? 7.2 : 5.6;
        const eng = tags.includes("workload") ? 6.5 : 7.6;
        return [
          {
            id: "simulate-result",
            role: "ai",
            kind: "text",
            text:
              locale === "ru"
                ? `По ответам это похоже на сценарий: ${stress >= 7 ? "умеренно высокий стресс" : "умеренный стресс"} с риском из-за ${
                    tags.includes("meetings") ? "митингов" : "дедлайнов"
                  }. В StressSense вы бы увидели индекс стресса ≈ ${stress.toFixed(1)}/10, вовлечённость около ${eng.toFixed(1)}/10.`
                : `Based on your answers, this looks like ${stress >= 7 ? "moderately high stress" : "moderate stress"} with risk from ${
                    tags.includes("meetings") ? "meetings" : "deadlines"
                  }. In StressSense you’d see stress index ≈ ${stress.toFixed(1)}/10 and engagement around ${eng.toFixed(1)}/10.`,
          },
          {
            id: "simulate-actions",
            role: "ai",
            kind: "bullets",
            text: "",
            bullets: [
              tags.includes("meetings")
                ? locale === "ru"
                  ? "Сократить количество митингов и добавить фокус-блоки"
                  : "Cut meeting load and add focus blocks"
                : locale === "ru"
                  ? "Пересмотреть приоритеты и объем спринта"
                  : "Revisit priorities and sprint scope",
              locale === "ru" ? "Запустить короткий pulse-опрос о нагрузке" : "Launch a short pulse on workload",
              locale === "ru" ? "Показать менеджерам action center с подсказками" : "Show managers the action center with tips",
            ],
          },
        ];
      },
    },
    {
      id: "plan",
      title: locale === "ru" ? "Подобрать план" : "Pick a plan",
      questions: [
        {
          id: "headcount",
          text: locale === "ru" ? "Сколько человек в компании?" : "How many people are in the company?",
          options: [
            { label: locale === "ru" ? "До 50" : "Up to 50", value: "50" },
            { label: locale === "ru" ? "50-200" : "50-200", value: "200" },
            { label: locale === "ru" ? "200+" : "200+", value: "500" },
          ],
        },
        {
          id: "modules",
          text: locale === "ru" ? "Что нужно?" : "What do you need?",
          options: [
            { label: locale === "ru" ? "Опросы стресса" : "Stress surveys", value: "pulse" },
            { label: locale === "ru" ? "Опросы + отчёты менеджерам" : "Surveys + manager reports", value: "cockpit" },
            { label: locale === "ru" ? "Все модули + AI" : "All modules + AI", value: "full" },
          ],
        },
      ],
      onComplete: (answers) => {
        const headcount = answers.headcount;
        const modules = answers.modules;
        let plan = "Starter";
        let price = locale === "ru" ? "99$/мес" : "$99/mo";
        if (headcount === "200" || modules === "cockpit") {
          plan = "Growth";
          price = locale === "ru" ? "299$/мес" : "$299/mo";
        }
        if (headcount === "500" || modules === "full") {
          plan = "Scale";
          price = locale === "ru" ? "899$/мес" : "$899/mo";
        }
        return [
          {
            id: "plan-res",
            role: "ai",
            text:
              locale === "ru"
                ? `Рекомендованный план: ${plan}. Он включает нужные модули и подходит на ваш размер. Примерная цена — ${price}. Можно показать, как это будет выглядеть на ваших данных.`
                : `Recommended plan: ${plan}. It includes the needed modules and fits your size. Approx price — ${price}. We can show how it looks on your data.`,
          },
        ];
      },
    },
  ];

  const employeeQuickActions = [
    {
      id: "relief",
      label: locale === "ru" ? "Что сделать прямо сейчас?" : "What to do right now?",
      response: [
        locale === "ru" ? "Сделайте 5-минутный перерыв без экрана." : "Take a 5-minute break off screen.",
        locale === "ru" ? "Запишите 3 главные задачи и выберите одну на ближайшие 30 минут." : "List 3 key tasks and pick one for the next 30 minutes.",
        locale === "ru" ? "Выключите уведомления на 45 минут, чтобы завершить главное." : "Turn off notifications for 45 minutes to finish the main thing.",
      ],
    },
    {
      id: "manager",
      label: locale === "ru" ? "Как обсудить стресс с менеджером?" : "How to discuss stress with your manager?",
      response: [
        locale === "ru"
          ? "«Я замечаю, что дедлайны часто сдвигаются, и это добавляет стресса. Давайте выберем 3 приоритета на неделю.»"
          : "“Deadlines keep shifting and it adds stress. Can we pick 3 priorities for the week?”",
        locale === "ru" ? "Предложение: сократить часть митингов или сделать один фокус-день без встреч." : "Suggest cutting some meetings or having one focus day without calls.",
      ],
    },
    {
      id: "not-on-time",
      label: locale === "ru" ? "Что делать, если не успеваю?" : "What if I’m not keeping up?",
      response: [
        employeeState.mainTag === "workload"
          ? locale === "ru"
            ? "Принесите на 1:1 список задач и вместе выберите, что можно снять или перенести."
            : "Bring a task list to your 1:1 and pick what to drop or move."
          : locale === "ru"
            ? "Согласуйте чёткие ожидания: что является успехом недели и что можно отложить."
            : "Align clear expectations: what success is this week and what can be postponed.",
        locale === "ru" ? "Выделите один 90-минутный фокус-блок сегодня без митингов." : "Block a 90‑minute no‑meeting focus slot today.",
      ],
    },
    {
      id: "resilience",
      label: locale === "ru" ? "Хочу прокачать устойчивость" : "I want to build resilience",
      response: [
        locale === "ru" ? "Попробуйте привычку: 10-мин прогулка или нет почты после 20:00." : "Try a habit: 10‑minute walk or no email after 8pm.",
        locale === "ru" ? "Выберите одну привычку и отметьте её сегодня — это даёт ощущение контроля." : "Pick one habit and do it today — it gives a sense of control.",
      ],
    },
  ];

  const currentFlowConfig = currentFlow;

  const handleQuickAction = (id: string) => {
    if (mode === "manager") {
      if (id === "focus-week") {
        const actions =
          managerFacts?.topNudges?.map((n) => `• ${n.title}`) ??
          (locale === "ru"
            ? ["• Провести ревизию митингов", "• Назначить 1:1 с перегруженными", "• Уточнить приоритеты спринта"]
            : ["• Run a meeting audit", "• Schedule 1:1s with overloaded people", "• Clarify sprint priorities"]);
        pushMessage({
          id: "mgr-focus",
          role: "ai",
          kind: "bullets",
          text: "",
          bullets: [...actions, "Открыть в Action center → /app/actions"],
        });
        return;
      }
      if (id === "risk-teams") {
        const risky = managerFacts?.teams?.filter((t) => t.level === "UnderPressure" || t.level === "AtRisk") ?? [];
        const bullets =
          risky.length === 0
            ? [locale === "ru" ? "Нет At risk команд сейчас. Следите за participation и нагрузкой." : "No at-risk teams now. Track participation and workload."]
            : risky.map((t) =>
                locale === "ru"
                  ? `Команда ${t.name}: уровень ${t.level}, nudges: ${t.nudges ?? 0}`
                  : `Team ${t.name}: level ${t.level}, nudges: ${t.nudges ?? 0}`
              );
        pushMessage({ id: "mgr-risks", role: "ai", kind: "bullets", text: "", bullets });
        return;
      }
      if (id === "explain-pulse") {
        pushMessage({
          id: "mgr-explain",
          role: "ai",
          text:
            locale === "ru"
              ? "Пример сообщения: «Мы измеряем рабочий стресс, чтобы вовремя убирать перегруз и делать приоритеты прозрачнее. Опрос анонимный, смотрим только агрегаты по команде. По результатам дадим конкретные действия в Action center.»"
              : "Sample message: “We measure work stress to spot overload early and make priorities clearer. The survey is anonymous; we only show team aggregates. Results feed into specific actions in Action center.”",
        });
        return;
      }
    }
    if (id === "report") {
      pushMessage({
        id: "report-preview",
        role: "ai",
        kind: "report",
        text: locale === "ru" ? "Вот как выглядит отчёт по стрессу в StressSense" : "Here’s how a StressSense stress report looks",
        reportData: {
          stress: 7,
          engagement: 8.3,
          insights:
            locale === "ru"
              ? landingReportInsights
              : [t(locale, "widgetLandingInsight1"), t(locale, "widgetLandingInsight2"), t(locale, "widgetLandingInsight3")],
        },
      });
      return;
    }
    if (id === "privacy") {
      pushMessage({
        id: "privacy",
        role: "ai",
        text: "StressSense работает только с рабочим стрессом. Нет индивидуального трекинга, только агрегаты. PII минимально, есть регионы хранения и экспорт без персональных данных.",
      });
      return;
    }
    const flow = landingFlows.find((f) => f.id === id || f.id === "simulate" && id === "simulate") || landingFlows.find((f) => f.id === id);
    if (flow) {
      setCurrentFlow(flow);
      setFlowStep(0);
      setFlowAnswers({});
      setFlowTags([]);
      pushMessage({ id: `${flow.id}-intro`, role: "ai", text: flow.questions[0].text });
      return;
    }
  };

  const handleFlowOption = (option: { label: string; value: string; tag?: InsightTag }) => {
    if (!currentFlowConfig) return;
    const currentQuestion = currentFlowConfig.questions[flowStep];
    const nextAnswers = { ...flowAnswers, [currentQuestion.id]: option.value };
    const newTags = option.tag ? [...flowTags, option.tag] : flowTags;
    setFlowAnswers(nextAnswers);
    setFlowTags(newTags);
    pushMessage({ id: `${currentQuestion.id}-user`, role: "user", text: option.label });
    const nextStep = flowStep + 1;
    if (nextStep < currentFlowConfig.questions.length) {
      setFlowStep(nextStep);
      const nextQ = currentFlowConfig.questions[nextStep];
      pushMessage({ id: `${currentFlowConfig.id}-q-${nextStep}`, role: "ai", text: nextQ.text });
    } else {
      const completed = currentFlowConfig.onComplete(nextAnswers, newTags);
      completed.forEach((m) => pushMessage({ ...m, id: m.id || crypto.randomUUID() }));
      setCurrentFlow(null);
      setFlowStep(0);
      setFlowAnswers({});
      setFlowTags([]);
    }
  };

  const pushMessage = (message: Message) => {
    setMessages((prev) => [...prev, { ...message, id: message.id || crypto.randomUUID() }]);
    setTab("messages");
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    const answer =
      keywordAnswers(locale).find((k) => k.keywords.some((kw) => input.toLowerCase().includes(kw)))?.text ||
      (mode === "employee"
        ? locale === "ru"
          ? "Это похоже на вопрос про рабочий стресс. Я помогу с фокусом, привычками и разговором с менеджером, но не даю медицинских советов."
          : "Sounds like a work-stress question. I’ll help with focus, habits, and talking to your manager—no medical advice."
        : mode === "manager"
          ? locale === "ru"
            ? "Сфокусируйтесь на командах с высоким стрессом и низким participation. Откройте Action center, чтобы закрыть nudges."
            : "Focus on teams with high stress and low participation. Open Action center to close nudges."
          : locale === "ru"
            ? "StressSense измеряет стресс и вовлечённость, даёт AI-подсказки и работает только с агрегированными данными."
            : "StressSense measures stress and engagement, gives AI tips, and works only with aggregated data.");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: answer }]);
    setInput("");
    setTab("messages");
  };

  const quickActionsLanding = [
    { id: "report", label: locale === "ru" ? "Показать отчёт по стрессу" : "Show stress report" },
    { id: "simulate", label: locale === "ru" ? "Смоделировать стресс в команде" : "Simulate team stress" },
    { id: "privacy", label: locale === "ru" ? "Как мы работаем с данными" : "How we handle data" },
    { id: "plan", label: locale === "ru" ? "Подобрать план и цену" : "Pick a plan and price" },
  ];

  const managerQuickActions = [
    { id: "focus-week", label: locale === "ru" ? "На чём сфокусироваться на этой неделе?" : "What should I focus on this week?" },
    { id: "risk-teams", label: locale === "ru" ? "Какие команды в риске?" : "Which teams are at risk?" },
    { id: "explain-pulse", label: locale === "ru" ? "Как объяснить команде, зачем мы измеряем стресс?" : "How to explain why we measure stress?" },
  ];

  const employeeQuestionsList = ["Почему у меня высокий стресс?", "Что делать, если дедлайны горят?", "Как не думать о работе вечером?"];

  const employeeStatusTone: Record<string, "green" | "amber" | "red"> = {
    low: "green",
    medium: "amber",
    high: "red",
  };

  const stateTone = employeeState.stress < 3 ? "green" : employeeState.stress < 7 ? "amber" : "red";

  const renderMessages = () => (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              msg.role === "ai" ? "bg-white text-slate-800 ring-1 ring-slate-200" : "bg-primary text-white"
            }`}
          >
            {msg.kind === "report" ? (
              <div className="space-y-2 text-left">
                <p className="text-xs font-semibold text-primary/90">{locale === "ru" ? "Мини-отчёт" : "Mini report"}</p>
                <ReportMiniCard locale={locale} />
              </div>
            ) : msg.kind === "bullets" ? (
              <ul className="space-y-1 text-left">
                {msg.bullets?.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              msg.text
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderHomeLanding = () => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/70 p-4 text-sm shadow-sm ring-1 ring-slate-200">
        <p className="text-base font-semibold text-slate-900">
          {locale === "ru" ? "Привет! Я StressSense AI" : "Hi there 👋 I’m StressSense AI"}
        </p>
        <p className="text-slate-600">
          {locale === "ru" ? "Помогу показать, как мы измеряем и снижаем стресс команд." : "I’ll show how we measure and reduce team stress."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickActionsLanding.map((qa) => (
          <button
            key={qa.id}
            onClick={() => handleQuickAction(qa.id)}
            className="rounded-2xl bg-slate-50 p-4 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {qa.label}
          </button>
        ))}
      </div>
      {currentFlowConfig && (
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">{currentFlowConfig.questions[flowStep]?.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {currentFlowConfig.questions[flowStep]?.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFlowOption(opt)}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-primary/10 hover:text-primary"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderHomeEmployee = () => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-white to-emerald-50 p-4 shadow-sm ring-1 ring-primary/10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Сегодняшнее состояние</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses(stateTone === "green" ? "green" : stateTone === "amber" ? "amber" : "red")}`}>
            {employeeState.stress < 3 ? "Низкий стресс" : employeeState.stress < 7 ? "Умеренный стресс" : "Высокий стресс"}
          </span>
        </div>
        <p className="mt-2 text-slate-700">{employeeState.summary}</p>
        <button
          onClick={() => startEmployeeCheckin()}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/20 transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          Обновить состояние
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {employeeQuickActions.map((qa) => (
          <button
            key={qa.id}
            onClick={() => pushMessage({ id: qa.id, role: "ai", kind: "bullets", text: "", bullets: qa.response })}
            className="rounded-2xl bg-white p-4 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {qa.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Примеры вопросов</p>
        <div className="flex flex-wrap gap-2">
          {employeeQuestionsList.map((q) => (
            <button
              key={q}
              onClick={() => {
                setInput(q);
                handleSend();
              }}
              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-primary/10 hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHomeManager = () => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-white to-indigo-50 p-4 shadow-sm ring-1 ring-primary/10">
        <p className="text-sm font-semibold text-slate-900">Фокус для менеджера</p>
        <p className="text-slate-700">
          Получите верхние nudges и команды в риске. Никаких медицинских советов — только действия по организации работы.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {managerQuickActions.map((qa) => (
          <button
            key={qa.id}
            onClick={() => handleQuickAction(qa.id)}
            className="rounded-2xl bg-white p-4 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {qa.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Топ действий</p>
        <div className="space-y-2">
          {(managerFacts?.topNudges ?? []).map((n) => (
            <div key={n.title} className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
              <p className="font-semibold text-slate-900">{n.title}</p>
              <p className="text-xs text-primary">Открыть в Action center → /app/actions</p>
            </div>
          ))}
          {(managerFacts?.topNudges ?? []).length === 0 && <p className="text-sm text-slate-600">Нет активных nudges — запустите pulse.</p>}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Команды в риске</p>
        <div className="space-y-2">
          {(managerFacts?.teams ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
              <div>
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-600">
                  Stress {t.stress ?? 0}/10 · participation {(t.participation ?? 0) * 100}%
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                {t.nudges ?? 0} nudges
              </span>
            </div>
          ))}
          {(managerFacts?.teams ?? []).length === 0 && <p className="text-sm text-slate-600">Нет данных. Проведите pulse-опрос.</p>}
        </div>
      </div>
    </div>
  );

  const startEmployeeCheckin = () => {
    pushMessage({
      id: "checkin-ask-1",
      role: "ai",
      text: locale === "ru" ? "Как ты себя чувствуешь сегодня по шкале 1–5?" : "How do you feel today on a scale of 1–5?",
    });
    pushMessage({
      id: "checkin-ask-2",
      role: "ai",
      text:
        locale === "ru"
          ? "Что сильнее всего давит сегодня? Выбери вариант: дедлайны, митинги, ясность задач, личное."
          : "What pressures you most today? Pick one: deadlines, meetings, task clarity, personal.",
    });
  };

  const renderHelp = () => (
    <div className="space-y-3">
      {(mode === "landing" ? landingHelpCategories(locale) : employeeHelpCategories(locale)).map((cat) => (
        <details key={cat.title} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">{cat.title}</summary>
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            {cat.articles.map((a) => (
              <div key={a.title} className="rounded-xl bg-slate-50 p-2">
                <p className="font-semibold text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-600">{a.summary}</p>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );

  const renderPanel = (showClose = false) => (
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
      <div className="bg-gradient-to-r from-primary to-indigo-600 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">StressSense AI (beta)</p>
            <p className="text-xs text-white/80">
              {locale === "ru"
                ? "Только про рабочий стресс и вовлечённость. Без медицинских рекомендаций."
                : "Work stress and engagement only. No medical advice."}
            </p>
          </div>
          {showClose && (
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
              {locale === "ru" ? "Закрыть" : "Close"}
            </button>
          )}
        </div>
        {mode === "employee" && (
          <p className="mt-2 text-xs text-white/80">
            {employeeState.summary || "Отслеживаем только рабочие сигналы. Индивидуальные ответы не видны менеджеру."}
          </p>
        )}
        {mode === "manager" && (
          <p className="mt-2 text-xs text-white/80">
            {managerFacts ? "Я вижу команды и nudges. Давай решим, что сделать на этой неделе." : "Подтяну команды и действия из Action center."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
        <div className="flex items-center gap-2">
          {(["home", "messages", "help"] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-2 text-sm transition ${
                tab === t ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t === "home" ? "Home" : t === "messages" ? "Messages" : "Help"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto bg-slate-50 px-4 py-4">
        {tab === "home" && (mode === "landing" ? renderHomeLanding() : mode === "manager" ? renderHomeManager() : renderHomeEmployee())}
        {tab === "messages" && <div className="space-y-3">{renderMessages()}</div>}
        {tab === "help" && renderHelp()}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "landing" ? "Спросите: как StressSense измеряет стресс?" : "Спросите: как снизить стресс в работе?"}
            className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none"
          />
          <button onClick={handleSend} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:translate-y-[-1px]">
            Send
          </button>
        </div>
      </div>
    </div>
  );

  if (variant === "floating") {
    return (
      <>
        <button
          onClick={() => setOpen((v) => !v)}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-2xl transition hover:scale-105"
          aria-label="StressSense AI"
        >
          AI
        </button>
        <div
          className={`fixed bottom-24 right-5 z-40 w-full max-w-md transform transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          {renderPanel(true)}
        </div>
      </>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">StressSense AI</p>
            <p className="text-sm text-slate-600">Подсказки про рабочий стресс и nudges без плавающего окна.</p>
          </div>
          <button
            onClick={() => {
              setOpen((v) => !v);
              if (open && onClose) onClose();
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {open ? "Свернуть" : "Показать"}
          </button>
        </div>
      {open && <div className="p-2">{renderPanel(false)}</div>}
    </div>
  );

}

function tagLabel(tag: InsightTag) {
  switch (tag) {
    case "workload":
      return "нагрузка";
    case "meetings":
      return "митинги";
    case "clarity":
      return "ясность задач";
    case "recognition":
      return "признание";
    case "growth":
      return "рост";
    case "personal":
      return "личное";
    default:
      return "стресс";
  }
}
