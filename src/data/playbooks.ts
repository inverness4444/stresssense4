import type { Tag } from "@/lib/orgData";
type PlaybookCategory = { id: string; name: string; description?: string };
type Playbook = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  steps: { label: string; detail?: string }[];
  recommendedForLevels: ("Watch" | "UnderPressure" | "AtRisk")[];
  recommendedTags: Tag[];
};

export const playbookCategories: PlaybookCategory[] = [
  { id: "pbcat-workload", name: "Нагрузка и дедлайны", description: "Как разгрузить команду и сфокусироваться" },
  { id: "pbcat-communication", name: "Коммуникация и ясность", description: "Про прозрачность целей и ожиданий" },
  { id: "pbcat-rituals", name: "Ритуалы и процессы", description: "Фокус-блоки, ретро и договорённости" },
];

export const playbooks: Playbook[] = [
  {
    id: "pb-meeting-audit",
    categoryId: "pbcat-rituals",
    title: "Ревизия митингов за 45 минут",
    summary: "Уберите лишние встречи и освободите фокусное время команде.",
    steps: [
      { label: "Соберите список всех повторяющихся митингов" },
      { label: "Определите цель и ожидаемый результат для каждой встречи" },
      { label: "Отмените или сократите встречи без чёткой цели" },
      { label: "Введи правило: повестка и решение в конце каждого митинга", detail: "Закрепите в календарных инвайтах" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure"],
    recommendedTags: ["meetings", "workload"] as Tag[],
  },
  {
    id: "pb-1on1-overload",
    categoryId: "pbcat-workload",
    title: "1:1 с перегруженными коллегами",
    summary: "Выявите, что блокирует людей, и уберите лишние задачи.",
    steps: [
      { label: "Отберите 3–4 человека с наибольшей нагрузкой" },
      { label: "Спросите, что мешает и какие дедлайны горят" },
      { label: "Перенесите второстепенные задачи или распределите их" },
      { label: "Зафиксируйте решение и проверьте через неделю" },
    ],
    recommendedForLevels: ["UnderPressure", "AtRisk"],
    recommendedTags: ["workload", "clarity"] as Tag[],
  },
  {
    id: "pb-retro-load",
    categoryId: "pbcat-rituals",
    title: "Ретро по нагрузке и ожиданиям",
    summary: "Командный разговор о том, что перегружает, и какие решения примем.",
    steps: [
      { label: "Соберите анонимные сигналы: что перегружает, что помогает" },
      { label: "Сгруппируйте топ-3 причин стресса" },
      { label: "Определите 2–3 решения и ответственных" },
      { label: "Назначьте дату проверки результатов" },
    ],
    recommendedForLevels: ["AtRisk"],
    recommendedTags: ["communication", "workload", "clarity"] as Tag[],
  },
  {
    id: "pb-priorities-sync",
    categoryId: "pbcat-communication",
    title: "Синх по приоритетам спринта",
    summary: "Зафиксируйте главные цели недели и кого можно снять с неважных задач.",
    steps: [
      { label: "Определите 3 ключевых результата недели" },
      { label: "Согласуйте критерии готовности и дедлайны" },
      { label: "Покажите, что переносим/ставим на паузу" },
      { label: "Отправьте короткий recap в Slack/почту" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure"],
    recommendedTags: ["clarity", "communication"] as Tag[],
  },
  {
    id: "pb-focus-day",
    categoryId: "pbcat-rituals",
    title: "Фокус-день без митингов",
    summary: "Одно утро или день без встреч для ключевых задач команды.",
    steps: [
      { label: "Выберите день и предупредите стейкхолдеров" },
      { label: "Забронируйте календари всей команды" },
      { label: "Определите, что каждая роль сделает в этот слот" },
      { label: "Соберите фидбэк и решите, повторять ли раз в неделю" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure"],
    recommendedTags: ["meetings", "focus"] as Tag[],
  },
  {
    id: "pb-participation",
    categoryId: "pbcat-communication",
    title: "Увеличить участие в опросах",
    summary: "Объясните команде пользу pulse-опросов и как мы используем ответы.",
    steps: [
      { label: "Отправьте короткое сообщение с целью опроса" },
      { label: "Покажите примеры решений, принятых по ответам" },
      { label: "Запланируйте 5 минут на общем митинге для напоминания" },
    ],
    recommendedForLevels: ["Watch", "UnderPressure", "AtRisk"],
    recommendedTags: ["participation", "communication"] as Tag[],
  },
];
