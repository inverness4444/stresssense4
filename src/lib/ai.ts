import { env } from "@/config/env";

export type AISummaryRequest = {
  prompt: string;
  maxTokens?: number;
};

export type AISummaryResponse = {
  text: string;
};

export type AIChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AIChatRequest = {
  messages: AIChatMessage[];
  maxTokens?: number;
};

export type AIChatResponse = { text: string };

export interface AIClient {
  summarize(req: AISummaryRequest): Promise<AISummaryResponse>;
  chat(req: AIChatRequest): Promise<AIChatResponse>;
}

function createNoopClient(): AIClient {
  return {
    async summarize(req) {
      return {
        text:
          "AI summaries are disabled in this environment. Placeholder summary based on prompt length " +
          req.prompt.length,
      };
    },
    async chat(req) {
      const last = req.messages.findLast((m) => m.role === "user");
      return {
        text: `AI assistant is disabled in this environment. You asked: "${last?.content ?? "N/A"}"`,
      };
    },
  };
}

async function callOpenAIChat(messages: AIChatMessage[], model: string, maxTokens?: number) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens ?? 512,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${body}`);
  }
  const json = (await res.json()) as any;
  const text = json?.choices?.[0]?.message?.content ?? "";
  return text;
}

function createOpenAIClient(): AIClient {
  const summaryModel = env.AI_MODEL_SUMMARY ?? env.AI_MODEL_ASSISTANT ?? "gpt-4o-mini";
  const chatModel = env.AI_MODEL_ASSISTANT ?? env.AI_MODEL_SUMMARY ?? "gpt-4o-mini";
  return {
    async summarize(req) {
      const text = await callOpenAIChat([{ role: "user", content: req.prompt }], summaryModel, req.maxTokens ?? 700);
      return { text };
    },
    async chat(req) {
      const text = await callOpenAIChat(req.messages, chatModel, req.maxTokens ?? 600);
      return { text };
    },
  };
}

export function getAIClient(): AIClient {
  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    return createOpenAIClient();
  }
  return createNoopClient();
}
