import {
  type TeamStatus,
  type EmployeeStatus,
  type InsightTag,
  teamStatusMeta,
  getTeamStatus,
  getTeamActionsByStatus,
  employeeStatusMeta,
  getEmployeeStatus,
} from "@/lib/statusLogic";

export type { TeamStatus, EmployeeStatus, InsightTag };
export { teamStatusMeta, getTeamStatus, getTeamActionsByStatus, employeeStatusMeta, getEmployeeStatus };

export const employeeQuestions: Record<
  EmployeeStatus,
  { id: string; question: string; options: { label: string; tag: InsightTag }[] }
> = {
  stable: {
    id: "emp-stable",
    question: "Что больше всего помогает держать баланс сейчас?",
    options: [
      { label: "Понятные приоритеты", tag: "clarity" },
      { label: "Поддержка команды", tag: "recognition" },
      { label: "Привычки и режим", tag: "growth" },
      { label: "Адекватные дедлайны", tag: "workload" },
      { label: "Другое", tag: "personal" },
    ],
  },
  tired: {
    id: "emp-tired",
    question: "Что сильнее всего добавляет напряжения на этой неделе?",
    options: [
      { label: "Слишком много задач", tag: "workload" },
      { label: "Непонятные приоритеты", tag: "clarity" },
      { label: "Много митингов", tag: "meetings" },
      { label: "Личные обстоятельства", tag: "personal" },
      { label: "Другое", tag: "personal" },
    ],
  },
  burnoutRisk: {
    id: "emp-risk",
    question: "Что сейчас даёт больше всего стресса?",
    options: [
      { label: "Объём и сроки работы", tag: "workload" },
      { label: "Коммуникация и ожидания", tag: "clarity" },
      { label: "Личные обстоятельства", tag: "personal" },
      { label: "Не чувствую смысла в задачах", tag: "personal" },
      { label: "Другое", tag: "personal" },
    ],
  },
};

export const managerQuestions: Record<
  TeamStatus,
  { id: string; question: string; options?: { label: string; tag: InsightTag }[]; open?: boolean }
> = {
  calm: {
    id: "mgr-calm",
    question: "Где вы видите главный шанс усилить команду в ближайший месяц?",
    options: [
      { label: "Улучшить приоритизацию", tag: "clarity" },
      { label: "Добавить больше feedback/признания", tag: "recognition" },
      { label: "Дать больше фокуса без митингов", tag: "meetings" },
      { label: "Поддержать развитие", tag: "growth" },
      { label: "Другое", tag: "personal" },
    ],
  },
  watch: {
    id: "mgr-watch",
    question: "Где вы видите главный шанс усилить команду в ближайший месяц?",
    options: [
      { label: "Улучшить приоритизацию", tag: "clarity" },
      { label: "Больше признания", tag: "recognition" },
      { label: "Фокус без митингов", tag: "meetings" },
      { label: "Развитие/обучение", tag: "growth" },
      { label: "Другое", tag: "personal" },
    ],
  },
  underPressure: {
    id: "mgr-pressure",
    question: "Что вы уже пробовали делать, чтобы снизить нагрузку?",
    options: [
      { label: "Пересобирал(а) спринты/приоритеты", tag: "clarity" },
      { label: "Срезал(а) задачи/объём", tag: "workload" },
      { label: "Переносил(а) дедлайны", tag: "workload" },
      { label: "Обсуждал(а) с командой", tag: "recognition" },
      { label: "Пока ничего", tag: "personal" },
    ],
  },
  atRisk: {
    id: "mgr-risk",
    question: "Если бы нужно было сделать одно решение на этой неделе для команды, что бы вы выбрали?",
    open: true,
  },
};

export const tagAddons: Record<InsightTag, string> = {
  workload: "Попробуйте на следующем 1:1 принести список задач и вместе выбрать 3 самых важных.",
  clarity: "Согласуйте приоритеты и зафиксируйте их в одном месте, чтобы команда видела фокус.",
  meetings: "Добавьте фокус-слоты без митингов 2–3 раза в неделю, чтобы снять часть стресса.",
  recognition: "Дайте явное признание и похвалу — это быстро поднимает вовлечённость.",
  growth: "Выберите один курс или практику на неделю — это даёт чувство прогресса и опоры.",
  personal: "Помните, можно снижать планку. Выберите одну маленькую привычку для восстановления и договоритесь о поддержке.",
};
