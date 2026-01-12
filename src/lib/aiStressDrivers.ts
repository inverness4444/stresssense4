import type { DateRange } from "@/lib/aiStressInsights";

export type StressDriver = {
  id: string;
  label: string;
  description: string;
  score: number;
  delta: number;
};

export function getStressDrivers(context: {
  workspaceId?: string;
  userId?: string;
  dateRange: DateRange;
}): StressDriver[] {
  // TODO: заменить моки на реальные AI-инсайты на основе ответов опросов.
  // Пока возвращаем пустой массив, чтобы блок заполнялся только AI-данными.
  return [];
}
