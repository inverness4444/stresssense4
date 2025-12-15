"use client";

import { useMemo, useState } from "react";
import { InsightTag } from "@/lib/statusLogic";
import { EngagementTrendCard, TrendPoint } from "@/components/EngagementTrendCard";

type Mode = "landing" | "employee";
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

type FlowQuestion = { id: string; text: string; options: Array<{ label: string; value: string; tag?: InsightTag }> };
type FlowConfig = {
  id: string;
  title: string;
  questions: FlowQuestion[];
  onComplete: (answers: Record<string, string>, tags: InsightTag[]) => Message[];
};

const landingReportInsights = ["Стресс растёт из-за дедлайнов", "У вовлечённых команд индекс стресса ниже", "Командам важно видеть прозрачные приоритеты"];

const landingHelpCategories = [
  {
    title: "Как работает индекс стресса",
    articles: [
      { title: "Какие сигналы мы собираем", summary: "Индекс строится на pulse-опросах, AI-сигналах и динамике участия. Всегда агрегировано." },
      { title: "Как часто мерить стресс", summary: "Рекомендуем короткий pulse раз в 2 недели или перед важными спринтами." },
    ],
  },
  {
    title: "Роль HR и менеджеров",
    articles: [
      { title: "Что видит HR", summary: "HR видит агрегаты по командам, зоны риска и рекомендации без персональных данных." },
      { title: "Что видит менеджер", summary: "Менеджер видит только свою команду, действия и подсказки по снижению стресса." },
    ],
  },
  {
    title: "Коммуникация для сотрудников",
    articles: [
      { title: "Как объяснять опросы", summary: "Просто: мы измеряем рабочий стресс, чтобы убрать перегруз и сделать фокус." },
      { title: "Прозрачность и приватность", summary: "Ответы анонимны, выводятся только в агрегатах, без слежки за личной жизнью." },
    ],
  },
  {
    title: "Настройка частоты опросов",
    articles: [
      { title: "Когда запускать pulse", summary: "Перед релизами, крупными изменениями и раз в 2 недели — короткие 5–7 вопросов." },
    ],
  },
];

const keywordAnswers: { keywords: string[]; text: string }[] = [
  { keywords: ["index", "индекс", "stress"], text: "Индекс стресса — 0–10, собирается из pulse-опросов и пассивных сигналов. Показываем только агрегаты по командам." },
  { keywords: ["hr", "роль"], text: "HR видит весь workspace в агрегате: стресс, вовлечённость, зоны риска и рекомендации. Менеджер — только свою команду." },
  { keywords: ["manager", "менедж"], text: "Менеджеры получают кокпит: метрики команды, action center, AI-подсказки и онбординг/цели в одном месте." },
  { keywords: ["survey", "опрос"], text: "В StressSense есть готовые pulse-шаблоны 5–7 вопросов. Запуск за 5 минут, результаты — только агрегаты." },
  { keywords: ["privacy", "данные"], text: "Без слежки и медицинских советов: только рабочий стресс, анонимные агрегаты, опция регионов хранения, экспорт без PII." },
];

const employeeHelpCategories = [
  {
    title: "Что видит менеджер, а что вижу я",
    articles: [
      { title: "Прозрачность", summary: "Менеджер видит только агрегаты по команде. Индивидуальные ответы остаются приватными." },
    ],
  },
  {
    title: "Как часто будут опросы",
    articles: [{ title: "Pulse-частота", summary: "Обычно раз в 2 недели короткий pulse. Это нужно, чтобы вовремя заметить перегруз." }],
  },
  {
    title: "Как AI использует мои ответы",
    articles: [
      { title: "Только работа", summary: "AI использует ответы, чтобы подсказать про приоритеты и фокус. Никаких медицинских рекомендаций." },
    ],
  },
];

function topTag(tags: InsightTag[] = []): InsightTag | undefined {
  if (!tags.length) return undefined;
  const counts: Record<string, number> = {};
  tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as InsightTag;
}

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

function ReportMiniCard() {
  const data: TrendPoint[] = [
    { label: "W1", value: 6.4 },
    { label: "W2", value: 6.7 },
    { label: "W3", value: 7.1 },
    { label: "W4", value: 7.4 },
  ];
  return (
    <div className="mt-3 rounded-2xl bg-white/80 p-3 shadow-inner ring-1 ring-slate-200">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>Stress index</span>
        <span className="text-emerald-600">7.0 / 10</span>
      </div>
      <div className="mt-3">
        <EngagementTrendCard scope="team" title="Mini survey report" score={7} delta={0.4} trendLabel="последние 4 недели" participation={76} data={data} />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-slate-700">
        {landingReportInsights.map((ins) => (
          <li key={ins} className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            {ins}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StressSenseAiWidget({ mode = "landing", employeeMetrics }: { mode?: Mode; employeeMetrics?: EmployeeMetrics }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("home");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    mode === "landing"
      ? { id: "hi", role: "ai", text: "Привет! Я StressSense AI. Спроси про отчёты по стрессу, опросы или цены." }
      : {
          id: "hi-emp",
          role: "ai",
          text:
            "Привет, я твой StressSense коуч. Помогу разобраться со стрессом на работе, приоритетами и разговором с менеджером.",
        },
  ]);

  const [currentFlow, setCurrentFlow] = useState<FlowConfig | null>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [flowAnswers, setFlowAnswers] = useState<Record<string, string>>({});
  const [flowTags, setFlowTags] = useState<InsightTag[]>([]);

  const employeeState = useMemo(() => {
    const stress = employeeMetrics?.stress ?? employeeMetrics?.wellbeing ?? 6.2;
    const wellbeing = employeeMetrics?.wellbeing ?? 7.0;
    const mood = employeeMetrics?.mood ?? 4;
    const habits = employeeMetrics?.habitsCompletion ?? 60;
    const tags = employeeMetrics?.tags ?? [];
    const stressZone = stress < 3 ? "низкий" : stress < 7 ? "средний" : "высокий";
    const mainTag = topTag(tags);
    const moodText = mood >= 4 ? "спокойный" : mood === 3 ? "нейтральный" : "напряжённый";
    return {
      stress,
      wellbeing,
      mood,
      habits,
      tags,
      summary: `Сейчас: ${stressZone} стресс (${stress.toFixed(1)}/10). Настроение ${moodText}. ${
        mainTag ? `Главный триггер: ${tagLabel(mainTag)}.` : ""
      }`,
      mainTag,
    };
  }, [employeeMetrics]);

  const landingFlows: FlowConfig[] = [
    {
      id: "simulate",
      title: "Смоделировать стресс в команде",
      questions: [
        { id: "size", text: "Какой размер команды?", options: [{ label: "До 10", value: "small" }, { label: "10-30", value: "mid" }, { label: "30+", value: "large" }] },
        { id: "deadlines", text: "Как часто горят дедлайны?", options: [{ label: "Редко", value: "rare" }, { label: "Иногда", value: "sometimes" }, { label: "Часто", value: "often", tag: "workload" }] },
        { id: "meetings", text: "Сколько митингов в день?", options: [{ label: "1-2", value: "few" }, { label: "3-4", value: "mid" }, { label: "5+", value: "many", tag: "meetings" }] },
        { id: "overtime", text: "Бывает ли переработка?", options: [{ label: "Нет", value: "no" }, { label: "Иногда", value: "sometimes", tag: "workload" }, { label: "Часто", value: "often", tag: "workload" }] },
      ],
      onComplete: (answers, tags) => {
        const stress = tags.includes("workload") || tags.includes("meetings") ? 7.2 : 5.6;
        const eng = tags.includes("workload") ? 6.5 : 7.6;
        return [
          {
            id: "simulate-result",
            role: "ai",
            kind: "text",
            text: `По ответам это похоже на сценарий: ${stress >= 7 ? "умеренно высокий стресс" : "умеренный стресс"} с риском из-за ${
              tags.includes("meetings") ? "митингов" : "дедлайнов"
            }. В StressSense вы бы увидели индекс стресса ≈ ${stress.toFixed(1)}/10, вовлечённость около ${eng.toFixed(1)}/10.`,
          },
          {
            id: "simulate-actions",
            role: "ai",
            kind: "bullets",
            bullets: [
              tags.includes("meetings") ? "Сократить количество митингов и добавить фокус-блоки" : "Пересмотреть приоритеты и объем спринта",
              "Запустить короткий pulse-опрос о нагрузке",
              "Показать менеджерам action center с подсказками",
            ],
          },
        ];
      },
    },
    {
      id: "plan",
      title: "Подобрать план",
      questions: [
        { id: "headcount", text: "Сколько человек в компании?", options: [{ label: "До 50", value: "50" }, { label: "50-200", value: "200" }, { label: "200+", value: "500" }] },
        { id: "modules", text: "Что нужно?", options: [{ label: "Опросы стресса", value: "pulse" }, { label: "Опросы + отчёты менеджерам", value: "cockpit" }, { label: "Все модули + AI", value: "full" }] },
      ],
      onComplete: (answers) => {
        const headcount = answers.headcount;
        const modules = answers.modules;
        let plan = "Starter";
        let price = "99$/мес";
        if (headcount === "200" || modules === "cockpit") {
          plan = "Growth";
          price = "299$/мес";
        }
        if (headcount === "500" || modules === "full") {
          plan = "Scale";
          price = "899$/мес";
        }
        return [
          {
            id: "plan-res",
            role: "ai",
            text: `Рекомендованный план: ${plan}. Он включает нужные модули и подходит на ваш размер. Примерная цена — ${price}. Можно показать, как это будет выглядеть на ваших данных.`,
          },
        ];
      },
    },
  ];

  const employeeQuickActions = [
    {
      id: "relief",
      label: "Что сделать прямо сейчас?",
      response: [
        "Сделайте 5-минутный перерыв без экрана.",
        "Запишите 3 главные задачи и выберите одну на ближайшие 30 минут.",
        "Выключите уведомления на 45 минут, чтобы завершить главное.",
      ],
    },
    {
      id: "manager",
      label: "Как обсудить стресс с менеджером?",
      response: [
        "«Я замечаю, что дедлайны часто сдвигаются, и это добавляет стресса. Давайте выберем 3 приоритета на неделю.»",
        "Предложение: сократить часть митингов или сделать один фокус-день без встреч.",
      ],
    },
    {
      id: "not-on-time",
      label: "Что делать, если не успеваю?",
      response: [
        employeeState.mainTag === "workload"
          ? "Принесите на 1:1 список задач и вместе выберите, что можно снять или перенести."
          : "Согласуйте чёткие ожидания: что является успехом недели и что можно отложить.",
        "Выделите один 90-минутный фокус-блок сегодня без митингов.",
      ],
    },
    {
      id: "resilience",
      label: "Хочу прокачать устойчивость",
      response: ["Попробуйте привычку: 10-мин прогулка или нет почты после 20:00.", "Выберите одну привычку и отметьте её сегодня — это даёт ощущение контроля."],
    },
  ];

  const currentFlowConfig = currentFlow;

  const handleQuickAction = (id: string) => {
    if (id === "report") {
      pushMessage({ id: "report-preview", role: "ai", kind: "report", text: "Вот как выглядит отчёт по стрессу в StressSense", reportData: { stress: 7, engagement: 8.3, insights: landingReportInsights } });
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
      keywordAnswers.find((k) => k.keywords.some((kw) => input.toLowerCase().includes(kw)))?.text ||
      (mode === "employee"
        ? "Это похоже на вопрос про рабочий стресс. Я помогу с фокусом, привычками и разговором с менеджером, но не даю медицинских советов."
        : "StressSense измеряет стресс и вовлечённость, даёт AI-подсказки и работает только с агрегированными данными.");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: answer }]);
    setInput("");
    setTab("messages");
  };

  const quickActionsLanding = [
    { id: "report", label: "Показать отчёт по стрессу" },
    { id: "simulate", label: "Смоделировать стресс в команде" },
    { id: "privacy", label: "Как мы работаем с данными" },
    { id: "plan", label: "Подобрать план и цену" },
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
                <p className="text-xs font-semibold text-primary/90">Мини-отчёт</p>
                <ReportMiniCard />
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
        <p className="text-base font-semibold text-slate-900">Hi there 👋 Я StressSense AI</p>
        <p className="text-slate-600">Помогу показать, как мы измеряем и снижаем стресс команд.</p>
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
            onClick={() => pushMessage({ id: qa.id, role: "ai", kind: "bullets", bullets: qa.response })}
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

  const startEmployeeCheckin = () => {
    pushMessage({ id: "checkin-ask-1", role: "ai", text: "Как ты себя чувствуешь сегодня по шкале 1–5?" });
    pushMessage({
      id: "checkin-ask-2",
      role: "ai",
      text: "Что сильнее всего давит сегодня? Выбери вариант: дедлайны, митинги, ясность задач, личное.",
    });
  };

  const renderHelp = () => (
    <div className="space-y-3">
      {(mode === "landing" ? landingHelpCategories : employeeHelpCategories).map((cat) => (
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
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="bg-gradient-to-r from-primary to-indigo-600 px-4 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">StressSense AI (beta)</p>
                <p className="text-xs text-white/80">
                  Только про рабочий стресс и вовлечённость. Без медицинских рекомендаций.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
                Закрыть
              </button>
            </div>
            {mode === "employee" && (
              <p className="mt-2 text-xs text-white/80">
                {employeeState.summary || "Отслеживаем только рабочие сигналы. Индивидуальные ответы не видны менеджеру."}
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
            {tab === "home" && (mode === "landing" ? renderHomeLanding() : renderHomeEmployee())}
            {tab === "messages" && <div className="space-y-3">{renderMessages()}</div>}
            {tab === "help" && renderHelp()}
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "landing"
                    ? "Спросите: как StressSense измеряет стресс?"
                    : "Спросите: как снизить стресс в работе?"
                }
                className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleSend}
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:translate-y-[-1px]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
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
