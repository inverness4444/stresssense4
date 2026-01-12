export type DateRange = {
  start: Date;
  end: Date;
  locale?: "ru" | "en";
};

const DEFAULT_PROS_RU = [
  "Поддержка менеджера — можно открыто говорить о нагрузке и получать помощь.",
  "Ясные приоритеты — понятно, какие 1–2 задачи самые важные прямо сейчас.",
  "Адекватные сроки — дедлайны ощущаются реалистичными, без постоянных авралов.",
  "Фокусное время без митингов — в календаре есть защищённые слоты для глубокой работы.",
  "Гибкий график и удалёнка — можно подстраивать рабочий день под личную жизнь.",
  "Прозрачная коммуникация — руководство объясняет, что происходит и зачем.",
  "Справедливая загрузка — нет ощущения, что одни тянут за всех.",
  "Признание и обратная связь — регулярно слышно «спасибо» и понятно, что работа важна.",
  "Внятные роли и ожидания — каждый понимает свою зону ответственности.",
  "Здоровые границы по времени — работа не лезет в ночи и выходные без крайней необходимости.",
];

const DEFAULT_CONS_RU = [
  "Чрезмерная нагрузка — задач больше, чем реально можно сделать.",
  "Нереалистичные сроки — постоянные дедлайны «на вчера» и режим пожара.",
  "Слишком много митингов — календарь забит встречами, негде работать в тишине.",
  "Непонятные приоритеты — всё срочно и важно, сложно выбирать, что делать первым.",
  "Недостаток поддержки менеджера — страшно поднимать тему стресса и нагрузки.",
  "Частые изменения без объяснений — новые инициативы и отмена старых без контекста.",
  "Размытые роли — неясно, кто за что отвечает, задачи «зависают» между людьми.",
  "Напряжённая атмосфера — конфликты, недоверие и пассивная агрессия в команде.",
  "Нет контроля над временем — постоянные прерывания и «срочные» запросы.",
  "Страх ошибок — любая ошибка воспринимается как катастрофа, люди боятся экспериментировать.",
];

const DEFAULT_PROS_EN = [
  "Manager support — you can openly discuss workload and get help.",
  "Clear priorities — it’s obvious which 1–2 tasks matter most right now.",
  "Realistic timelines — deadlines feel achievable without constant fire drills.",
  "Focus time without meetings — the calendar has protected deep-work slots.",
  "Flexible schedule and remote work — you can align work with personal life.",
  "Transparent communication — leadership explains what’s happening and why.",
  "Fair workload — it doesn’t feel like some people carry everything.",
  "Recognition and feedback — you regularly hear “thank you” and see why the work matters.",
  "Clear roles and expectations — everyone knows their area of responsibility.",
  "Healthy time boundaries — work doesn’t spill into nights or weekends without real need.",
];

const DEFAULT_CONS_EN = [
  "Excessive workload — more tasks than can realistically be done.",
  "Unrealistic deadlines — constant “yesterday” deadlines and fire-fighting mode.",
  "Too many meetings — the calendar is packed, leaving no quiet work time.",
  "Unclear priorities — everything is urgent and important, hard to choose what comes first.",
  "Lack of manager support — it feels unsafe to raise stress and workload topics.",
  "Frequent changes without context — initiatives change with little explanation.",
  "Blurred roles — ownership is unclear and tasks get stuck between people.",
  "Tense atmosphere — conflict, distrust, and passive aggression in the team.",
  "No control over time — constant interruptions and “urgent” requests.",
  "Fear of mistakes — any error feels catastrophic, people avoid experiments.",
];

export const DEFAULT_STRESS_INSIGHTS_RU = { pros: DEFAULT_PROS_RU, cons: DEFAULT_CONS_RU };
export const DEFAULT_STRESS_INSIGHTS_EN = { pros: DEFAULT_PROS_EN, cons: DEFAULT_CONS_EN };
export const DEFAULT_STRESS_INSIGHTS = DEFAULT_STRESS_INSIGHTS_RU;

export function getAiStressInsightsForWorkspace(_workspaceId: string, dateRange: DateRange): { pros: string[]; cons: string[] } {
  // TODO: replace with real AI insights based on survey answers.
  const isRu = dateRange.locale !== "en";
  return isRu ? DEFAULT_STRESS_INSIGHTS_RU : DEFAULT_STRESS_INSIGHTS_EN;
}
