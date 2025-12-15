export type TeamStatus = "calm" | "watch" | "underPressure" | "atRisk";
export type EmployeeStatus = "stable" | "tired" | "burnoutRisk";
export type InsightTag = "workload" | "clarity" | "meetings" | "recognition" | "growth" | "personal";

export const teamStatusMeta: Record<TeamStatus, { label: string; tone: string; summary: string; ai: string; badge: string }> = {
  calm: {
    label: "Здоровый уровень",
    tone: "emerald",
    badge: "Calm",
    summary: "Стресс и риски в норме, команда работает устойчиво",
    ai: "Стресс и риски в норме, команда работает в устойчивом ритме. Важно поддерживать прозрачность и признание, чтобы удержать этот уровень.",
  },
  watch: {
    label: "Зона внимания",
    tone: "amber",
    badge: "Watch zone",
    summary: "Есть признаки напряжения, стоит уточнить ожидания",
    ai: "Появляются признаки напряжения. Стоит уточнить ожидания, проверить нагрузку и провести короткий pulse-опрос.",
  },
  underPressure: {
    label: "Под нагрузкой",
    tone: "orange",
    badge: "Under pressure",
    summary: "Стресс растёт, нужно менять приоритеты",
    ai: "Стресс заметно растёт. Пересмотрите приоритеты, обсудите дедлайны и дайте команде пространство для восстановления.",
  },
  atRisk: {
    label: "Высокий риск",
    tone: "red",
    badge: "At risk",
    summary: "Команда в зоне риска, нужен отдельный разговор",
    ai: "Команда в зоне высокого риска. Нужен отдельный разговор о нагрузке, перераспределение задач и поддержка менеджера и HR.",
  },
};

export function getTeamStatus(stressIndex: number, engagement: number, participation: number): TeamStatus {
  if (stressIndex >= 8 || (stressIndex >= 7 && engagement <= 4.4)) return "atRisk";
  if (stressIndex >= 6 && stressIndex <= 7.9 && (engagement <= 6.4 || participation < 60)) return "underPressure";
  if (stressIndex >= 3.5 || engagement < 6.5 || participation < 60) return "watch";
  if (stressIndex <= 3.4 && engagement >= 6.5 && participation >= 60) return "calm";
  return "watch";
}

export function getTeamActionsByStatus(status: TeamStatus) {
  switch (status) {
    case "calm":
      return [
        { id: "recog", title: "Запустить recognition", desc: "Поблагодарить команду за стабильный спринт", type: "nudge" },
        { id: "growth", title: "Планы развития", desc: "Обсудить рост и обучение на 1:1", type: "nudge" },
      ];
    case "watch":
      return [
        { id: "pulse", title: "Pulse-опрос", desc: "Короткий опрос о нагрузке", type: "nudge" },
        { id: "expect", title: "Синхронизация", desc: "Уточнить ожидания и приоритеты", type: "nudge" },
      ];
    case "underPressure":
      return [
        { id: "trim", title: "Срезать задачи", desc: "Уменьшить объём спринта", type: "nudge" },
        { id: "1on1", title: "1:1 c перегруженными", desc: "Проверить благополучие ключевых людей", type: "nudge" },
        { id: "focus", title: "Час без митингов", desc: "Добавить фокус-слот для всей команды", type: "nudge" },
      ];
    case "atRisk":
      return [
        { id: "scope", title: "Пересмотреть scope", desc: "Обсудить дедлайны с бизнесом", type: "nudge" },
        { id: "hr", title: "Поддержка HR", desc: "Подключить HR к ситуации", type: "nudge" },
      ];
    default:
      return [];
  }
}

export const employeeStatusMeta: Record<EmployeeStatus, { label: string; tone: string; ai: string }> = {
  stable: {
    label: "Ок",
    tone: "emerald",
    ai: "Баланс держится, вы хорошо сочетаете работу и восстановление. Главное — продолжать поддерживать привычки.",
  },
  tired: {
    label: "Устал",
    tone: "amber",
    ai: "Уровень энергии просел. Попробуйте добавить короткие перерывы, сфокусироваться на 1–2 приоритетах и договориться о реалистичных ожиданиях.",
  },
  burnoutRisk: {
    label: "Риск выгорания",
    tone: "red",
    ai: "Сигналы говорят о высоком напряжении. Стоит обсудить нагрузку с менеджером, сделать паузы и выбрать одну маленькую привычку для восстановления.",
  },
};

export function getEmployeeStatus(wellbeing: number, mood: number, habitsCompletion: number): EmployeeStatus {
  if (wellbeing < 4 || (mood <= 2 && habitsCompletion < 50)) return "burnoutRisk";
  if (wellbeing >= 7 && mood >= 4 && habitsCompletion >= 50) return "stable";
  return "tired";
}
