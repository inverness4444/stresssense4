import { getTeamStatus, type InsightTag, type TeamStatus } from "@/lib/statusLogic";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
};

export type Team = {
  id: string;
  orgId: string;
  name: string;
  stressIndex: number;
  engagementScore: number;
  participation: number;
  memberCount: number;
  lastPulseAt?: Date | null;
  status: TeamStatus;
  topTags: InsightTag[];
  trend?: { label: string; value: number }[];
};

export type Member = {
  id: string;
  orgId: string;
  teamId: string;
  name: string;
  role: "HR" | "Manager" | "Employee";
  email: string;
  avatarUrl?: string | null;
  lastSeenAt?: Date | null;
  wellbeing?: number;
  engagementScore?: number;
  tags?: InsightTag[];
};

export type SurveyRun = {
  id: string;
  orgId: string;
  teamId?: string | null;
  templateId: string;
  title: string;
  launchedBy: string;
  launchedAt: Date;
  completedCount: number;
  targetCount: number;
  avgStressIndex?: number;
  avgEngagementScore?: number;
  tags: InsightTag[];
};

// In-memory seed data for demo org
let orgs: Organization[] = [
  { id: "org-1", name: "Nova Bank", slug: "nova-bank", createdAt: new Date("2023-01-10") },
];

let teams: Team[] = [
  {
    id: "team-1",
    orgId: "org-1",
    name: "Продукт",
    stressIndex: 4.2,
    engagementScore: 7.8,
    participation: 82,
    memberCount: 8,
    lastPulseAt: new Date(),
    status: "calm",
    topTags: ["clarity", "recognition"],
    trend: [
      { label: "Mar", value: 7.4 },
      { label: "Apr", value: 7.8 },
      { label: "May", value: 8.0 },
      { label: "Jun", value: 7.9 },
      { label: "Jul", value: 8.1 },
    ],
  },
  {
    id: "team-2",
    orgId: "org-1",
    name: "Маркетинг",
    stressIndex: 6.8,
    engagementScore: 6.1,
    participation: 71,
    memberCount: 6,
    lastPulseAt: new Date(),
    status: "underPressure",
    topTags: ["workload", "meetings"],
    trend: [
      { label: "Mar", value: 6.5 },
      { label: "Apr", value: 6.4 },
      { label: "May", value: 6.2 },
      { label: "Jun", value: 6.0 },
      { label: "Jul", value: 6.1 },
    ],
  },
  {
    id: "team-3",
    orgId: "org-1",
    name: "Продажи",
    stressIndex: 7.5,
    engagementScore: 5.1,
    participation: 65,
    memberCount: 7,
    lastPulseAt: new Date(),
    status: "atRisk",
    topTags: ["workload", "clarity"],
    trend: [
      { label: "Mar", value: 5.4 },
      { label: "Apr", value: 5.6 },
      { label: "May", value: 5.2 },
      { label: "Jun", value: 5.0 },
      { label: "Jul", value: 5.1 },
    ],
  },
];

let members: Member[] = [
  { id: "m-hr-1", orgId: "org-1", teamId: "team-1", name: "Екатерина HR", role: "HR", email: "hr@nova.bank" },
  { id: "m-mgr-1", orgId: "org-1", teamId: "team-1", name: "Алексей Менеджер", role: "Manager", email: "alex@nova.bank" },
  { id: "m-emp-1", orgId: "org-1", teamId: "team-1", name: "Даша Продукт", role: "Employee", email: "daria@nova.bank", wellbeing: 7.5, engagementScore: 7.8 },
  { id: "m-emp-2", orgId: "org-1", teamId: "team-1", name: "Игорь Аналитик", role: "Employee", email: "igor@nova.bank", wellbeing: 7.1, engagementScore: 7.0 },
  { id: "m-mgr-2", orgId: "org-1", teamId: "team-2", name: "Марина Head of Marketing", role: "Manager", email: "marina@nova.bank" },
  { id: "m-emp-3", orgId: "org-1", teamId: "team-2", name: "Кирилл SMM", role: "Employee", email: "kirill@nova.bank", wellbeing: 5.4, engagementScore: 6.0 },
  { id: "m-emp-4", orgId: "org-1", teamId: "team-2", name: "Ольга Performance", role: "Employee", email: "olga@nova.bank", wellbeing: 6.1, engagementScore: 6.3 },
  { id: "m-mgr-3", orgId: "org-1", teamId: "team-3", name: "Дмитрий Sales Lead", role: "Manager", email: "dmitry@nova.bank" },
  { id: "m-emp-5", orgId: "org-1", teamId: "team-3", name: "Антон AE", role: "Employee", email: "anton@nova.bank", wellbeing: 4.8, engagementScore: 5.0 },
  { id: "m-emp-6", orgId: "org-1", teamId: "team-3", name: "Света SDR", role: "Employee", email: "sveta@nova.bank", wellbeing: 5.2, engagementScore: 5.2 },
];

let surveyRuns: SurveyRun[] = [
  {
    id: "sr-1",
    orgId: "org-1",
    teamId: "team-1",
    templateId: "stress_engagement",
    title: "Stress & Engagement pulse",
    launchedBy: "m-hr-1",
    launchedAt: new Date(),
    completedCount: 7,
    targetCount: 8,
    avgStressIndex: 4.1,
    avgEngagementScore: 7.7,
    tags: ["recognition"],
  },
];

export function getOrganizations(): Organization[] {
  return orgs;
}

export function getOrganizationBySlug(slug: string): Organization | undefined {
  return orgs.find((o) => o.slug === slug);
}

export function createDemoOrganization(name: string, ownerEmail?: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "") || `org-${Date.now()}`;
  const org: Organization = { id: `org-${Date.now()}`, name, slug, createdAt: new Date() };
  orgs = [org, ...orgs];

  const team: Team = {
    id: `team-${Date.now()}`,
    orgId: org.id,
    name: "Пилотная команда",
    stressIndex: 5.5,
    engagementScore: 7.0,
    participation: 0,
    memberCount: 8,
    lastPulseAt: null,
    status: "watchZone",
    topTags: [],
    trend: [
      { label: "Apr", value: 6.8 },
      { label: "May", value: 6.9 },
      { label: "Jun", value: 7.0 },
    ],
  };
  teams = [team, ...teams];

  const owner: Member = {
    id: `m-owner-${Date.now()}`,
    orgId: org.id,
    teamId: team.id,
    name: "Новый менеджер",
    role: "Manager",
    email: ownerEmail ?? "manager@demo.local",
    lastSeenAt: new Date(),
    wellbeing: 7.2,
    engagementScore: 7.1,
  };
  members = [owner, ...members];
  return { org, team, owner };
}

export function getTeamsByOrg(orgId: string): Team[] {
  return teams.filter((t) => t.orgId === orgId);
}

export function getTeamById(id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

export function getMembersByTeam(teamId: string): Member[] {
  return members.filter((m) => m.teamId === teamId);
}

export function getSurveyRunsByOrg(orgId: string): SurveyRun[] {
  return surveyRuns.filter((s) => s.orgId === orgId);
}

export function createSurveyRun(input: Omit<SurveyRun, "id" | "launchedAt" | "completedCount" | "avgStressIndex" | "avgEngagementScore" | "tags"> & { tags?: InsightTag[] }) {
  const run: SurveyRun = {
    ...input,
    id: `sr-${Date.now()}`,
    launchedAt: new Date(),
    completedCount: 0,
    avgStressIndex: undefined,
    avgEngagementScore: undefined,
    tags: input.tags ?? [],
  };
  surveyRuns = [run, ...surveyRuns];
  return run;
}

export function updateTeamMetricsFromSurvey(teamId: string, metrics: { stressIndex: number; engagementScore: number; participation: number }, tags: InsightTag[] = []) {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return;
  team.stressIndex = metrics.stressIndex;
  team.engagementScore = metrics.engagementScore;
  team.participation = metrics.participation;
  team.status = getTeamStatus(metrics.stressIndex, metrics.engagementScore, metrics.participation);
  team.topTags = tags.length ? tags : team.topTags;
  team.lastPulseAt = new Date();
  team.trend = [...(team.trend ?? []), { label: new Date().toLocaleDateString("ru-RU", { month: "short" }), value: metrics.engagementScore }].slice(-8);
}

export function updateSurveyRunAggregates(runId: string, metrics: { stressIndex: number; engagementScore: number; tags?: InsightTag[] }) {
  const run = surveyRuns.find((r) => r.id === runId);
  if (!run) return;
  run.completedCount = Math.min(run.targetCount, run.completedCount + 1);
  run.avgStressIndex = metrics.stressIndex;
  run.avgEngagementScore = metrics.engagementScore;
  run.tags = metrics.tags ?? run.tags;
}

export function updateMemberFromPulse(memberId: string, metrics: { wellbeing?: number; engagementScore?: number; tags?: InsightTag[] }) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return;
  if (metrics.wellbeing !== undefined) member.wellbeing = metrics.wellbeing;
  if (metrics.engagementScore !== undefined) member.engagementScore = metrics.engagementScore;
  member.tags = metrics.tags ?? member.tags;
}
