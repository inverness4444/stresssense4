import type { Tag } from "@/lib/orgData";
type PlaybookCategory = { id: string; name: string; nameEn?: string; nameRu?: string; description?: string; descriptionEn?: string; descriptionRu?: string };
type Playbook = {
  id: string;
  categoryId: string;
  title: string;
  titleEn?: string;
  titleRu?: string;
  summary: string;
  summaryEn?: string;
  summaryRu?: string;
  steps: { label: string; detail?: string }[];
  recommendedForLevels: ("Watch" | "UnderPressure" | "AtRisk")[];
  recommendedTags: Tag[];
};

export const playbookCategories: PlaybookCategory[] = [
  { id: "pbcat-workload", name: "Нагрузка и дедлайны", nameEn: "Workload and deadlines", nameRu: "Нагрузка и дедлайны", description: "Как разгрузить команду и сфокусироваться", descriptionEn: "How to reduce load and focus the team", descriptionRu: "Как разгрузить команду и сфокусироваться" },
  { id: "pbcat-communication", name: "Коммуникация и ясность", nameEn: "Communication and clarity", nameRu: "Коммуникация и ясность", description: "Про прозрачность целей и ожиданий", descriptionEn: "About clear goals and expectations", descriptionRu: "Про прозрачность целей и ожиданий" },
  { id: "pbcat-rituals", name: "Ритуалы и процессы", nameEn: "Rituals and processes", nameRu: "Ритуалы и процессы", description: "Фокус-блоки, ретро и договорённости", descriptionEn: "Focus blocks, retros, and agreements", descriptionRu: "Фокус-блоки, ретро и договорённости" },
];

export const playbooks: Playbook[] = [
  {
    id: "pb-meeting-audit",
    categoryId: "pbcat-rituals",
    title: "Ревизия митингов за 45 минут",
    titleEn: "45-minute meeting audit",
    titleRu: "Ревизия митингов за 45 минут",
    summary: "Уберите лишние встречи и освободите фокусное время команде.",
    summaryEn: "Cut unnecessary meetings and free focus time for the team.",
    summaryRu: "Уберите лишние встречи и освободите фокусное время команде.",
    steps: [
      { label: "Соберите список всех повторяющихся митингов", detail: "Gather all recurring meetings" },
      { label: "Определите цель и ожидаемый результат для каждой встречи", detail: "Define goal and expected outcome" },
      { label: "Отмените или сократите встречи без чёткой цели", detail: "Cancel/shorten meetings without a clear goal" },
      { label: "Введи правило: повестка и решение в конце каждого митинга", detail: "Agenda and decisions in calendar invites" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure"],
    recommendedTags: ["meetings", "workload"] as Tag[],
  },
  {
    id: "pb-1on1-overload",
    categoryId: "pbcat-workload",
    title: "1:1 с перегруженными коллегами",
    titleEn: "1:1s with overloaded teammates",
    titleRu: "1:1 с перегруженными коллегами",
    summary: "Выявите, что блокирует людей, и уберите лишние задачи.",
    summaryEn: "Find what blocks people and remove extra tasks.",
    summaryRu: "Выявите, что блокирует людей, и уберите лишние задачи.",
    steps: [
      { label: "Отберите 3–4 человека с наибольшей нагрузкой", detail: "Pick 3–4 most overloaded people" },
      { label: "Спросите, что мешает и какие дедлайны горят", detail: "Ask blockers and burning deadlines" },
      { label: "Перенесите второстепенные задачи или распределите их", detail: "Move or reassign lower-priority tasks" },
      { label: "Зафиксируйте решение и проверьте через неделю", detail: "Capture decisions and check in a week" },
    ],
    recommendedForLevels: ["UnderPressure", "AtRisk"],
    recommendedTags: ["workload", "clarity"] as Tag[],
  },
  {
    id: "pb-retro-load",
    categoryId: "pbcat-rituals",
    title: "Ретро по нагрузке и ожиданиям",
    titleEn: "Retro on workload and expectations",
    titleRu: "Ретро по нагрузке и ожиданиям",
    summary: "Командный разговор о том, что перегружает, и какие решения примем.",
    summaryEn: "Team discussion on overload and decisions to make.",
    summaryRu: "Командный разговор о том, что перегружает, и какие решения примем.",
    steps: [
      { label: "Соберите анонимные сигналы: что перегружает, что помогает", detail: "Collect anonymous signals on stressors/helpers" },
      { label: "Сгруппируйте топ-3 причин стресса", detail: "Group the top 3 stress reasons" },
      { label: "Определите 2–3 решения и ответственных", detail: "Set 2–3 solutions and owners" },
      { label: "Назначьте дату проверки результатов", detail: "Schedule a follow-up date" },
    ],
    recommendedForLevels: ["AtRisk"],
    recommendedTags: ["communication", "workload", "clarity"] as Tag[],
  },
  {
    id: "pb-priorities-sync",
    categoryId: "pbcat-communication",
    title: "Синх по приоритетам спринта",
    titleEn: "Sprint priorities sync",
    titleRu: "Синх по приоритетам спринта",
    summary: "Зафиксируйте главные цели недели и кого можно снять с неважных задач.",
    summaryEn: "Lock main weekly goals and free people from low-priority work.",
    summaryRu: "Зафиксируйте главные цели недели и кого можно снять с неважных задач.",
    steps: [
      { label: "Определите 3 ключевых результата недели", detail: "Pick 3 key outcomes for the week" },
      { label: "Согласуйте критерии готовности и дедлайны", detail: "Align definition of done and deadlines" },
      { label: "Покажите, что переносим/ставим на паузу", detail: "Show what we postpone or pause" },
      { label: "Отправьте короткий recap в Slack/почту", detail: "Send a short recap in Slack/email" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure"],
    recommendedTags: ["clarity", "communication"] as Tag[],
  },
  {
    id: "pb-focus-day",
    categoryId: "pbcat-rituals",
    title: "Фокус-день без митингов",
    titleEn: "Focus day without meetings",
    titleRu: "Фокус-день без митингов",
    summary: "Одно утро или день без встреч для ключевых задач команды.",
    summaryEn: "One morning or day without meetings for key team tasks.",
    summaryRu: "Одно утро или день без встреч для ключевых задач команды.",
    steps: [
      { label: "Выберите день и предупредите стейкхолдеров", detail: "Pick a day and notify stakeholders" },
      { label: "Забронируйте календари всей команды", detail: "Block calendars for the whole team" },
      { label: "Определите, что каждая роль сделает в этот слот", detail: "Define what each role will deliver in that slot" },
      { label: "Соберите фидбэк и решите, повторять ли раз в неделю", detail: "Gather feedback and decide whether to repeat weekly" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure"],
    recommendedTags: ["meetings", "focus"] as Tag[],
  },
  {
    id: "pb-participation",
    categoryId: "pbcat-communication",
    title: "Увеличить участие в опросах",
    titleEn: "Increase survey participation",
    titleRu: "Увеличить участие в опросах",
    summary: "Объясните команде пользу pulse-опросов и как мы используем ответы.",
    summaryEn: "Explain the value of pulse surveys and how you use answers.",
    summaryRu: "Объясните команде пользу pulse-опросов и как мы используем ответы.",
    steps: [
      { label: "Отправьте короткое сообщение с целью опроса", detail: "Send a short note on why the survey matters" },
      { label: "Покажите примеры решений, принятых по ответам", detail: "Show examples of decisions made from answers" },
      { label: "Запланируйте 5 минут на общем митинге для напоминания", detail: "Reserve 5 minutes in an all-hands to remind people" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure", "AtRisk"],
    recommendedTags: ["participation", "communication"] as Tag[],
  },
];
