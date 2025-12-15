import { prisma } from "@/lib/prisma";
import { addJob } from "@/lib/queue";

type Node = { id: string; type: string; params?: any };
type Edge = { from: string; to: string; condition?: any };

export async function executeWorkflow(workflowId: string, input: any) {
  const workflow = await prisma.automationWorkflow.findUnique({ where: { id: workflowId } });
  if (!workflow || !workflow.isActive) return;
  const definition = (workflow.definition as any) ?? {};
  const nodes: Node[] = definition.nodes ?? [];
  const edges: Edge[] = definition.edges ?? [];
  let current: Node | null = nodes.find((n) => n.type === "start") ?? nodes[0] ?? null;
  const logs: any[] = [];
  while (current) {
    logs.push({ node: current.id, type: current.type, ts: new Date() });
    await runNode(current, input);
    const nextEdge = edges.find((e) => e.from === current!.id && evaluateCondition(e.condition, input));
    const nextNode = nextEdge ? nodes.find((n) => n.id === nextEdge.to) : null;
    current = nextNode ?? null;
  }
  await prisma.automationRun.create({
    data: {
      workflowId: workflow.id,
      organizationId: workflow.organizationId,
      status: "succeeded",
      input,
      logs,
    },
  });
}

async function runNode(node: Node, input: any) {
  switch (node.type) {
    case "action_email":
      await addJob("sendEmails", { items: [{ ...node.params, ...input }] });
      break;
    case "action_slack":
      await addJob("sendSlack", { ...node.params, ...input });
      break;
    case "create_action_item":
      await prisma.actionItem.create({
        data: {
          organizationId: input.organizationId,
          surveyId: input.surveyId,
          teamId: input.teamId,
          assigneeId: node.params?.assigneeId ?? input.assigneeId,
          title: node.params?.title ?? "Follow-up",
          description: node.params?.description ?? "",
          createdById: input.userId,
        },
      });
      break;
    case "create_nudge":
      await addJob("sendNudge", { ...node.params, ...input });
      break;
    default:
      break;
  }
}

function evaluateCondition(condition: any, input: any) {
  if (!condition) return true;
  if (condition.type === "threshold") {
    const val = input[condition.field];
    if (condition.op === ">") return val > condition.value;
    if (condition.op === "<") return val < condition.value;
  }
  return true;
}
