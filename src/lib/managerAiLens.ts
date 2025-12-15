export async function generateManagerAiLens(params: { orgId: string; teamId: string }) {
  return {
    summary: "Team is stable; engagement is improving while stress needs monitoring.",
    risks: ["Workload", "Participation dip"],
    strengths: ["Recognition", "Manager support"],
    suggestedActions: ["Run short pulse next week", "Appreciation shoutout", "1:1s with overloaded folks"],
  };
}
