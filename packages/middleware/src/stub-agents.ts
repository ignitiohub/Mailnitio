import type { AgentMeta, AgentResult, Agents, ClassifierDecision, ContextDecision } from "./contracts";

/**
 * D2 stand-in for the LLM agents. Pack samples carry the decision a real model would make
 * (`job.precomputed`); emails typed into the simulator are classified by keyword signals from the
 * tenant config. Runs are labelled provider "simulated" so they are never mistaken for real AI.
 * D3 replaces this with the LLM gateway; nothing else in the pipeline changes.
 */

const PROMPT_VERSION = "d2-simulated";

function meta(text: string, agent: "classifier" | "context"): AgentMeta {
  // Token and cost estimates use a small-model price table so dashboards show realistic magnitudes.
  const inputTokens = 650 + Math.ceil(text.length / 4);
  const outputTokens = agent === "classifier" ? 110 : 160;
  return {
    model: agent === "classifier" ? "classifier-small (simulated)" : "context-mid (simulated)",
    provider: "simulated",
    promptVersion: PROMPT_VERSION,
    latencyMs: agent === "classifier" ? 820 : 1340,
    inputTokens,
    outputTokens,
    costUsd: Math.round((inputTokens * 0.8 + outputTokens * 4) * 1e-6 * 1_000_000) / 1_000_000,
  };
}

export class StubAgents implements Agents {
  async classify(input: Parameters<Agents["classify"]>[0]): Promise<AgentResult<ClassifierDecision>> {
    const text = `${input.subject}\n${input.maskedBody}`;
    const m = meta(text, "classifier");
    if (input.job.precomputed?.aiFails) {
      return { ok: false, output: null, error: "Invalid JSON after one repair attempt", meta: m };
    }
    const pre = input.job.precomputed?.classifier;
    if (pre) return { ok: true, output: pre, meta: m };

    // Keyword fallback for hand-written simulator emails.
    const lower = text.toLowerCase();
    let best: { key: string; score: number; priority: ClassifierDecision["priority"]; label: string } | null =
      null;
    for (const category of input.config.categories) {
      if (category.exclude.some((s) => lower.includes(s.toLowerCase()))) continue;
      const score = category.include.filter((s) => lower.includes(s.toLowerCase())).length;
      if (score > 0 && (!best || score > best.score)) {
        best = { key: category.key, score, priority: category.defaultPriority, label: category.label };
      }
    }
    const fallback = input.config.categories.find((c) => c.key === input.mailbox.defaultCategory);
    const category = best?.key ?? fallback?.key ?? input.config.defaultCategory;
    const confidence = best ? Math.min(0.97, 0.78 + best.score * 0.08) : 0.52;
    return {
      ok: true,
      output: {
        category,
        confidence,
        priority: best?.priority ?? fallback?.defaultPriority ?? "medium",
        summary: input.subject.replace(/^(re|fw|fwd):\s*/i, "").slice(0, 140),
        reason: best
          ? `Mentions ${best.label.toLowerCase()} signals`
          : "No strong signals; closest to the mailbox default",
        escalation: { flag: false, reason: null },
      },
      meta: m,
    };
  }

  async context(input: Parameters<Agents["context"]>[0]): Promise<AgentResult<ContextDecision>> {
    const m = meta(`${input.subject}\n${input.maskedBody}\n${input.rollingSummary ?? ""}`, "context");
    const pre = input.job.precomputed?.context;
    if (pre) return { ok: true, output: pre, meta: m };

    const lower = input.maskedBody.toLowerCase();
    const closure = input.config.threading.closurePhrases.some((p) => lower.includes(p.toLowerCase()));
    return {
      ok: true,
      output: {
        decision: "same_case",
        replyType: closure ? "closure" : "continuation",
        confidence: 0.82,
        reason: closure ? "Customer confirms the request is resolved" : "Reply about the same request",
        updatedSummary: `${input.candidate.summary ?? input.candidate.subject}; customer replied`,
        newIssueSummary: null,
      },
      meta: m,
    };
  }
}
