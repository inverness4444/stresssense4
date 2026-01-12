import { prisma } from "./prisma";

const DEFAULT_TEMPLATE_NAME = "Stress Pulse v1";

const defaultQuestions = [
  {
    order: 1,
    text: "Overall, how stressed do you feel about work right now?",
    type: "SCALE" as const,
    scaleMin: 1,
    scaleMax: 5,
    helpText: "1 = Not stressed at all, 5 = Extremely stressed",
    dimension: "workload" as const,
    driverTag: "workload_deadlines",
    driverKey: "workload_deadlines",
    polarity: "NEGATIVE" as const,
  },
  {
    order: 2,
    text: "I feel I can disconnect from work after hours.",
    type: "SCALE" as const,
    scaleMin: 1,
    scaleMax: 5,
    helpText: "1 = Strongly disagree, 5 = Strongly agree",
    dimension: "stress" as const,
    driverTag: "recovery_energy",
    driverKey: "recovery_energy",
    polarity: "POSITIVE" as const,
  },
  {
    order: 3,
    text: "My current workload feels sustainable.",
    type: "SCALE" as const,
    scaleMin: 1,
    scaleMax: 5,
    dimension: "workload" as const,
    driverTag: "workload_deadlines",
    driverKey: "workload_deadlines",
    polarity: "POSITIVE" as const,
  },
  {
    order: 4,
    text: "I have the support I need from my manager and team.",
    type: "SCALE" as const,
    scaleMin: 1,
    scaleMax: 5,
    dimension: "recognition" as const,
    driverTag: "manager_support",
    driverKey: "manager_support",
    polarity: "POSITIVE" as const,
  },
  {
    order: 5,
    text: "How clear are priorities for your team this week?",
    type: "SCALE" as const,
    scaleMin: 1,
    scaleMax: 5,
    helpText: "1 = Not clear, 5 = Very clear",
    dimension: "clarity" as const,
    driverTag: "clarity_priorities",
    driverKey: "clarity_priorities",
    polarity: "POSITIVE" as const,
  },
  {
    order: 6,
    text: "Anything else you want to share about how work feels lately?",
    type: "TEXT" as const,
    dimension: "other" as const,
    driverTag: "unknown",
    driverKey: "unknown",
    polarity: "NEGATIVE" as const,
  },
  {
    order: 7,
    text: "If stress is rising, what is the biggest contributor?",
    type: "TEXT" as const,
    dimension: "other" as const,
    driverTag: "unknown",
    driverKey: "unknown",
    polarity: "NEGATIVE" as const,
  },
];

export async function ensureDefaultSurveyTemplate() {
  const existing = await prisma.surveyTemplate.findFirst({ include: { questions: true } });
  if (existing) return existing;

  const template = await prisma.surveyTemplate.create({
    data: {
      name: DEFAULT_TEMPLATE_NAME,
      title: DEFAULT_TEMPLATE_NAME,
      description: "Lightweight stress pulse to capture early signals.",
      questions: {
        create: defaultQuestions,
      },
    },
    include: { questions: true },
  });

  return template;
}
