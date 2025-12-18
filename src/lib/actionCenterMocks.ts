export type ActionStatus = "todo" | "in_progress" | "done";
export type ActionPriority = "High" | "Medium" | "Low";
export type RiskLevel = "Watch" | "UnderPressure" | "AtRisk";

export type ActionItem = {
  id: string;
  title: string;
  description: string;
  teamId: string;
  teamName: string;
  status: ActionStatus;
  driver: string;
  sourceSurveyDate: string;
  tags: string[];
  dueInDays: number;
  priority: ActionPriority;
  riskLevel: RiskLevel;
  owner: { name: string; role: string; initials: string };
  format: "1:1" | "Ретро" | "Воркшоп" | "Изменение процесса";
  impact: "Высокий" | "Средний" | "Низкий";
  effort: "Низкие" | "Средние" | "Высокие";
  metricTarget: string;
  metricBefore?: number;
  metricAfter?: number;
  metricPeriodWeeks?: number;
};

export type NudgeItem = {
  id: string;
  title: string;
  bullets: string[];
  applicableTeams: string;
  tags: string[];
};

export type CompletedAction = {
  id: string;
  title: string;
  teamName: string;
  period: string;
  driver: string;
  delta: number;
  from: number;
  to: number;
  finishedAt: string;
};

export const initialActions: ActionItem[] = [
  {
    id: "a1",
    title: "Перераспределить задачи в Product",
    description: "Сдвиньте низкий приоритет, чтобы снизить нагрузку на ключевых людей.",
    teamId: "product",
    teamName: "Product",
    status: "todo",
    driver: "Нагрузка и дедлайны",
    sourceSurveyDate: "12.12.2025",
    tags: ["workload", "clarity"],
    dueInDays: -1,
    priority: "High",
    riskLevel: "AtRisk",
    owner: { name: "Анна Лебедева", role: "Менеджер", initials: "АЛ" },
    format: "Изменение процесса",
    impact: "Высокий",
    effort: "Средние",
    metricTarget: "Stress index (workload) в Product",
    metricBefore: 7.4,
    metricAfter: 7.1,
    metricPeriodWeeks: 4,
  },
  {
    id: "a2",
    title: "Собрать встречи в один блок",
    description: "Сократите разрозненные митинги, оставьте 2 фокус-блока без встреч.",
    teamId: "engineering",
    teamName: "Engineering",
    status: "in_progress",
    driver: "Meetings",
    sourceSurveyDate: "11.12.2025",
    tags: ["meetings", "focus"],
    dueInDays: 2,
    priority: "Medium",
    riskLevel: "UnderPressure",
    owner: { name: "Дмитрий Орлов", role: "Менеджер", initials: "ДО" },
    format: "Воркшоп",
    impact: "Средний",
    effort: "Низкие",
    metricTarget: "Stress index (meetings) в Engineering",
    metricBefore: 6.9,
    metricAfter: 6.5,
    metricPeriodWeeks: 3,
  },
  {
    id: "a3",
    title: "Уточнить приоритеты спринта",
    description: "Сформулировать 3 результата на неделю и донести команде.",
    teamId: "marketing",
    teamName: "Marketing",
    status: "todo",
    driver: "Ясность задач",
    sourceSurveyDate: "10.12.2025",
    tags: ["clarity", "alignment"],
    dueInDays: 4,
    priority: "High",
    riskLevel: "Watch",
    owner: { name: "Мария Соколова", role: "HR BP", initials: "МС" },
    format: "Ретро",
    impact: "Высокий",
    effort: "Низкие",
    metricTarget: "Stress index (clarity) в Marketing",
    metricBefore: 6.5,
    metricAfter: 6.0,
    metricPeriodWeeks: 4,
  },
  {
    id: "a4",
    title: "Поддержка перегруженных",
    description: "Проверить нагрузку в Product Core и предложить перераспределение.",
    teamId: "product",
    teamName: "Product",
    status: "done",
    driver: "Manager support",
    sourceSurveyDate: "01.12.2025",
    tags: ["support", "workload"],
    dueInDays: 0,
    priority: "Medium",
    riskLevel: "AtRisk",
    owner: { name: "Иван Ким", role: "Менеджер", initials: "ИК" },
    format: "1:1",
    impact: "Средний",
    effort: "Средние",
    metricTarget: "Stress index (support) в Product Core",
    metricBefore: 7.0,
    metricAfter: 6.6,
    metricPeriodWeeks: 3,
  },
];

export const initialNudges: NudgeItem[] = [
  {
    id: "n1",
    title: "Снизить шум митингов",
    bullets: ["Соберите встречи в один блок утром", "Оставьте два фокус-блока без встреч", "В конце митинга фиксируйте итоги и ответственных"],
    applicableTeams: "Engineering, Product",
    tags: ["meetings", "focus"],
  },
  {
    id: "n2",
    title: "Уточнить 3 приоритета недели",
    bullets: ["Определите 3 результата недели", "Донесите их в еженедельной рассылке", "Снимите лишние задачи ниже топ-3"],
    applicableTeams: "Marketing, Product",
    tags: ["clarity", "alignment"],
  },
  {
    id: "n3",
    title: "Усилить поддержку менеджера",
    bullets: ["Проведите 1:1 с перегруженными", "Согласуйте замену или помощь на сложных задачах", "Еженедельно собирайте обратную связь по нагрузке"],
    applicableTeams: "Product Core",
    tags: ["manager_support", "workload"],
  },
];

export const completedMocks: CompletedAction[] = [
  { id: "c1", title: "Снизили частоту митингов", teamName: "Engineering", period: "Последние 4 недели", driver: "meetings", delta: -1.2, from: 7.5, to: 6.3, finishedAt: "2025-12-10" },
  { id: "c2", title: "Уточнили приоритеты спринта", teamName: "Marketing", period: "Последние 3 недели", driver: "clarity", delta: -0.8, from: 6.9, to: 6.1, finishedAt: "2025-12-05" },
  { id: "c3", title: "Перераспределили задачи", teamName: "Product", period: "Последние 2 недели", driver: "workload", delta: -0.6, from: 7.2, to: 6.6, finishedAt: "2025-11-28" },
];
