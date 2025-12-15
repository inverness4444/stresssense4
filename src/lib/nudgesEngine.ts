import { nudgeTemplates } from "@/data/nudges";
import type { NudgeTemplateConfig } from "@/data/nudges";

export type StressLevel = "Calm" | "Watch" | "UnderPressure" | "AtRisk";

type TeamLike = { id: string; organizationId?: string; orgId?: string };
type NudgeSource = "rule" | "ai" | "manual";
type Tag = string;

export type TeamMetrics = {
  stressIndex: number;
  engagementScore?: number;
  participation: number; // percent (0-100) or fraction (0-1)
  trend?: number;
};

function pickTemplates(level: StressLevel, tags: Tag[]): NudgeTemplateConfig[] {
  const overlap = (a: Tag[], b: Tag[]) => a.some((t) => b.includes(t));
  return nudgeTemplates.filter((t) => t.triggerLevel === level && (!tags.length || overlap(t.triggerTags, tags)));
}

export function getStressLevelFromMetrics(stressIndex: number): StressLevel {
  if (stressIndex < 3) return "Calm";
  if (stressIndex < 6) return "Watch";
  if (stressIndex < 8) return "UnderPressure";
  return "AtRisk";
}

function buildNudgeInstance(template: NudgeTemplateConfig, team: TeamLike, tags: Tag[], source: NudgeSource = "rule"): any {
  const now = new Date();
  return {
    id: `nudge-${now.getTime()}-${Math.random().toString(16).slice(2, 6)}`,
    orgId: (team as any).organizationId ?? (team as any).orgId,
    teamId: team.id,
    memberId: null,
    templateId: template.id,
    status: "todo",
    createdAt: now,
    dueAt: null,
    resolvedAt: null,
    source,
    notes: undefined,
    tags: Array.from(new Set([...(template.triggerTags ?? []), ...(tags ?? [])])),
  };
}

export function generateTeamNudges(team: TeamLike, metrics: TeamMetrics, tags: Tag[] = []): any[] {
  const participationRate = metrics.participation > 1 ? metrics.participation / 100 : metrics.participation;
  const level = getStressLevelFromMetrics(metrics.stressIndex);
  const result: any[] = [];

  if (level === "Calm") {
    const supportive = pickTemplates("Calm", tags);
    supportive.slice(0, 1).forEach((t) => result.push(buildNudgeInstance(t, team, tags)));
    return result;
  }

  if (level === "Watch") {
    const candidates = pickTemplates("Watch", tags).slice(0, 3);
    candidates.forEach((t) => result.push(buildNudgeInstance(t, team, tags)));
  }

  if (level === "UnderPressure" || level === "AtRisk") {
    const strongTags: Tag[] = Array.from(new Set([...(tags ?? []), "workload", "meetings", "clarity"] as Tag[]));
    const candidates = pickTemplates(level, strongTags);
    candidates
      .concat(pickTemplates("UnderPressure", strongTags))
      .slice(0, 5)
      .forEach((t) => result.push(buildNudgeInstance(t, team, strongTags)));
    // ensure at least one conversation/retro style nudge
    const hasConversation = result.some((n) => {
      const tpl = nudgeTemplates.find((t) => t.id === n.templateId);
      return tpl?.title.toLowerCase().includes("ретро") || tpl?.title.toLowerCase().includes("разговор");
    });
    if (!hasConversation) {
      const convo = nudgeTemplates.find((t) => t.slug === "open-conversation");
      if (convo) result.push(buildNudgeInstance(convo, team, strongTags));
    }
  }

  if (participationRate < 0.7) {
    const participationTemplate = nudgeTemplates.find((t) => t.slug === "boost-participation");
    if (participationTemplate) result.push(buildNudgeInstance(participationTemplate, team, [...tags, "participation"] as Tag[]));
  }

  return result.slice(0, level === "Watch" ? 3 : 5);
}
