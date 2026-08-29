/**
 * The one place in this app that calls a real LLM.
 *
 * Every other "AI" screen (AiDiagnose, DTC reasoning, Similar Cases matching
 * itself) is the Rule Engine + authored content — deterministic, offline,
 * free. This file is different and deliberately small: it only generates the
 * plain-language explanation of *why* a matched case is similar, using the
 * mechanic's own Anthropic API key.
 *
 * There is no backend (static GitHub Pages hosting — see docs/mvp-scope.md),
 * so there is no way to hold a shared key safely. The key lives only in this
 * browser's localStorage, calls go straight from the browser to Anthropic,
 * and the mechanic is billed on their own account. `dangerouslyAllowBrowser`
 * is intentional here, not a shortcut — the whole point of this design is
 * that the key never leaves the mechanic's own device.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { RepairCase } from "@/types";

const KEY_STORAGE = "mt.anthropicKey.v1";

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Best-effort — a failed write just means the key isn't remembered.
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

function summarizeCase(c: RepairCase): string {
  return (
    `${c.vehicle.brand} ${c.vehicle.model} ${c.vehicle.year ?? ""} — ` +
    `System: ${c.system}, DTC: ${c.dtcCodes.join(", ") || "none"}, ` +
    `Symptom: ${c.symptomText}, Root cause: ${c.rootCause}, Repair: ${c.repairPerformed}`
  );
}

/**
 * A short, plain-language reason `candidate` is similar to `current` — real
 * AI judgment, not the Rule Engine's keyword/DTC score (that score still
 * decides WHICH cases are shown at all; this only explains one of them).
 * Throws on any failure (no key, network, API error) — callers fall back to
 * the existing rule-based case row with no explanation line, unchanged.
 */
export async function explainSimilarity(
  current: RepairCase,
  candidate: RepairCase,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("no API key configured");

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    system:
      "អ្នកគឺជាជាងម៉ាស៊ីនរថយន្តជំនាញ។ ពន្យល់ជាភាសាខ្មែរខ្លីៗ (មួយឬពីរប្រយោគ) ថាហេតុអ្វី " +
      "ករណីជួសជុលពីមុនមួយនេះទាក់ទងនឹងករណីបច្ចុប្បន្ន — ផ្ដោតលើហេតុផលបច្ចេកទេស " +
      "មិនមែនគ្រាន់តែថាមាន DTC ឬ system ដូចគ្នាទេ។ កុំបញ្ជាក់អ្វីដែលអ្នកមិនប្រាកដ។",
    messages: [
      {
        role: "user",
        content:
          `ករណីបច្ចុប្បន្ន៖ ${summarizeCase(current)}\n\n` +
          `ករណីពីមុន៖ ${summarizeCase(candidate)}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text.trim()) {
    throw new Error("empty AI response");
  }
  return block.text.trim();
}
