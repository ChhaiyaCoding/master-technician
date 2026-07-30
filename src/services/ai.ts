/**
 * AI service abstraction layer.
 *
 * The whole app talks to AI ONLY through the `AiProvider` interface below.
 * Today we ship `PlaceholderAiProvider`, which returns deterministic dummy
 * results derived from the DTC knowledge base and simple heuristics.
 *
 * To connect real AI later:
 *   1. Implement `AiProvider` in a new file (e.g. claudeAiProvider.ts) that
 *      calls the Claude API (server-side proxy recommended — never ship an
 *      API key in the client).
 *   2. Swap the export at the bottom of this file (or wire it via env).
 * No screen/component needs to change: they all import `ai` from here.
 */
import type {
  DiagnosisResult,
  DtcCode,
  PossibleCause,
  SymptomInput,
  Vehicle,
} from "@/types";
import { DTC_BY_CODE } from "@/data/dtc";
import { SYSTEM_BY_ID } from "@/data/systems";
import { uid } from "@/services/store";

export interface DiagnoseRequest {
  vehicle: Vehicle;
  input: SymptomInput;
}

export interface PhotoAnalysis {
  observations: string[];
  possibleCauses: PossibleCause[];
  nextSteps: string[];
}

export interface ExpertReply {
  text: string;
  followUps: string[];
}

/** The single contract every AI backend must satisfy. */
export interface AiProvider {
  diagnose(req: DiagnoseRequest): Promise<DiagnosisResult>;
  analyzePhotos(notes: string[]): Promise<PhotoAnalysis>;
  askExpert(
    conversation: { role: "tech" | "expert"; text: string }[],
    vehicle: Vehicle | null,
  ): Promise<ExpertReply>;
}

/** Simulated network latency so loading states are exercised. */
function delay<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function likelihoodFromConfidence(c: number): PossibleCause["likelihood"] {
  if (c >= 70) return "high";
  if (c >= 45) return "medium";
  return "low";
}

/**
 * Placeholder provider — no real model. It composes believable diagnostic
 * output from: any matched DTC codes, the selected system, and keywords in
 * the free-text symptom. Deterministic enough to demo the full workflow.
 */
export class PlaceholderAiProvider implements AiProvider {
  async diagnose({ vehicle, input }: DiagnoseRequest): Promise<DiagnosisResult> {
    const matchedDtc: DtcCode[] = input.dtcCodes
      .map((c) => DTC_BY_CODE[c.toUpperCase()])
      .filter(Boolean);

    const causes = this.buildCauses(input, matchedDtc);
    const inspectionSteps = this.buildInspection(matchedDtc);
    const toolsNeeded = this.buildTools(input.system, matchedDtc);
    const safetyNotes = this.buildSafety(input, matchedDtc);

    const system = input.system ? SYSTEM_BY_ID[input.system] : null;
    const recommendedRepair = matchedDtc.length
      ? `ផ្តើមពីមូលហេតុទំនងបំផុត (${causes[0]?.title ?? "?"}) — បញ្ជាក់ដោយការវាស់ មុនប្ដូរគ្រឿង។ បន្ទាប់មកលុបកូដ ${matchedDtc
          .map((d) => d.code)
          .join(", ")} ហើយសាកល្បងបើកបរឡើងវិញ។`
      : `ដោយផ្អែកលើរោគសញ្ញា${system ? ` នៃប្រព័ន្ធ ${system.en}` : ""} — ធ្វើតាមជំហានត្រួតពិនិត្យ រកមូលហេតុឲ្យច្បាស់ មុនធ្វើការជួសជុល។`;

    const result: DiagnosisResult = {
      id: uid("dx"),
      createdAt: Date.now(),
      vehicle,
      system: input.system ?? "engine",
      symptomText: input.symptomText,
      dtcCodes: input.dtcCodes,
      possibleCauses: causes,
      inspectionSteps,
      toolsNeeded,
      recommendedRepair,
      safetyNotes,
    };
    return delay(result, 1100);
  }

  private buildCauses(
    input: SymptomInput,
    matchedDtc: DtcCode[],
  ): PossibleCause[] {
    const causes: PossibleCause[] = [];

    // 1) Causes anchored to matched DTC codes get the highest confidence.
    matchedDtc.forEach((dtc, di) => {
      dtc.possibleCauses.forEach((c, ci) => {
        const confidence = Math.max(30, 88 - di * 10 - ci * 8);
        causes.push({
          title: c,
          confidence,
          likelihood: likelihoodFromConfidence(confidence),
          reasoning: `ភ្ជាប់នឹងកូដ ${dtc.code} (${dtc.titleKm})`,
        });
      });
    });

    // 2) Keyword heuristics from the free-text symptom.
    const text = input.symptomText.toLowerCase();
    const kw: { match: string[]; title: string; conf: number; why: string }[] = [
      {
        match: ["ញ័រ", "misfire", "រញ្ជួយ"],
        title: "Ignition system (coil/plug) ខ្សោយ",
        conf: 62,
        why: "រោគសញ្ញាញ័រ ជាទូទៅមកពី misfire",
      },
      {
        match: ["ផ្សែងខ្មៅ", "black smoke", "lean", "rich"],
        title: "ល្បាយប្រេង/ខ្យល់មិនត្រូវ (fuel trim)",
        conf: 55,
        why: "ផ្សែងខ្មៅបង្ហាញល្បាយ rich ឬ បញ្ហា injection",
      },
      {
        match: ["ក្តៅ", "overheat", "ក្តៅពេក"],
        title: "ប្រព័ន្ធ cooling (thermostat/pump/fan)",
        conf: 58,
        why: "រោគសញ្ញាក្តៅ ទាក់ទង cooling",
      },
      {
        match: ["ហ្វ្រាំង", "brake", "abs"],
        title: "Wheel speed sensor ឬ ABS actuator",
        conf: 50,
        why: "រោគសញ្ញាហ្វ្រាំង/ABS",
      },
      {
        match: ["មិនត្រជាក់", "ac", "ត្រជាក់"],
        title: "A/C: ខ្វះ refrigerant ឬ compressor ខ្សោយ",
        conf: 52,
        why: "រោគសញ្ញាម៉ាស៊ីនត្រជាក់",
      },
      {
        match: ["រអិល", "slip", "លេខ", "shift"],
        title: "Transmission slip / solenoid / ATF",
        conf: 54,
        why: "រោគសញ្ញាប្រអប់លេខ",
      },
    ];
    kw.forEach((k) => {
      if (k.match.some((m) => text.includes(m.toLowerCase()))) {
        causes.push({
          title: k.title,
          confidence: k.conf,
          likelihood: likelihoodFromConfidence(k.conf),
          reasoning: k.why,
        });
      }
    });

    // 3) Fallback so the list is never empty.
    if (causes.length === 0) {
      causes.push(
        {
          title: "ត្រួតពិនិត្យ wiring / connector / ground ពាក់ព័ន្ធ",
          confidence: 40,
          likelihood: "low",
          reasoning: "ព័ត៌មានមិនគ្រប់ — ចាប់ផ្តើមពី basic electrical",
        },
        {
          title: "ស្កេនរក DTC បន្ថែម ដើម្បីតម្រង់ទិស",
          confidence: 35,
          likelihood: "low",
          reasoning: "គ្មាន DTC — ត្រូវការទិន្នន័យបន្ថែម",
        },
      );
    }

    // De-dup by title, keep highest confidence, sort desc, cap at 6.
    const byTitle = new Map<string, PossibleCause>();
    for (const c of causes) {
      const prev = byTitle.get(c.title);
      if (!prev || c.confidence > prev.confidence) byTitle.set(c.title, c);
    }
    return [...byTitle.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6);
  }

  private buildInspection(matchedDtc: DtcCode[]): string[] {
    const steps: string[] = [
      "អាន DTC ទាំងអស់ និង freeze frame ដោយ scan tool",
    ];
    matchedDtc.forEach((d) => {
      d.inspectionFlow.forEach((s) => steps.push(`[${d.code}] ${s}`));
    });
    if (matchedDtc.length === 0) {
      steps.push(
        "ពិនិត្យ live data ពាក់ព័ន្ធ (RPM, temp, fuel trim, voltage)",
        "ពិនិត្យ visual: ខ្សែ រលុង លេច ច្រេះ ខូច",
        "ធ្វើតេស្តជាក់ស្តែងតាមប្រព័ន្ធ (compression, pressure, scope)",
      );
    }
    steps.push("បញ្ជាក់មូលហេតុដោយការវាស់ មុនប្ដូរគ្រឿង");
    return steps;
  }

  private buildTools(
    system: SymptomInput["system"],
    matchedDtc: DtcCode[],
  ): string[] {
    const base = new Set<string>([
      "OBD-II scan tool",
      "Digital multimeter (DMM)",
    ]);
    const bySystem: Record<string, string[]> = {
      engine: ["Compression tester", "Smoke machine", "Fuel pressure gauge", "Oscilloscope"],
      transmission: ["ATF level tool", "Scan tool ជាមួយ bi-directional", "Pressure gauge"],
      abs: ["Scan tool ABS bleed", "Scope សម្រាប់ wheel speed sensor"],
      brake: ["Brake bleeder", "Feeler/dial gauge"],
      ac: ["Manifold gauge set", "Refrigerant recovery machine", "Leak detector"],
      electrical: ["Test light", "Power probe", "Wiring diagram"],
      hybrid: ["Insulated gloves class 0", "Insulation resistance tester (megohm)", "CAT III meter"],
      ev: ["Insulated gloves class 0", "Megohm tester", "HV lockout/tagout kit"],
      airbag: ["SRS-capable scan tool", "Squib load tool (មិនប្រើ DMM ផ្ទាល់)"],
      suspension: ["Alignment gauge", "Ball joint separator"],
      steering: ["Alignment gauge", "Scan tool សម្រាប់ EPS"],
      body: ["Wiring diagram", "Test light"],
    };
    if (system && bySystem[system]) bySystem[system].forEach((x) => base.add(x));
    // Any critical DTC (HV/SRS) forces safety tooling.
    if (matchedDtc.some((d) => d.severity === "critical")) {
      base.add("Insulated gloves class 0");
    }
    return [...base];
  }

  private buildSafety(input: SymptomInput, matchedDtc: DtcCode[]): string[] {
    const notes: string[] = [];
    const sys = input.system;
    if (sys === "hybrid" || sys === "ev" || matchedDtc.some((d) => d.systems.includes("hybrid") || d.systems.includes("ev"))) {
      notes.push(
        "⚠️ ប្រព័ន្ធតង់ស្យុងខ្ពស់ (HV) — ISOLATE មុនធ្វើការ ដក service plug ស្លៀក glove class 0។",
      );
    }
    if (sys === "airbag" || matchedDtc.some((d) => d.systems.includes("airbag"))) {
      notes.push(
        "⚠️ SRS/Airbag — ដក battery រង់ចាំ discharge ≥ 3 នាទី។ កុំវាស់ squib ដោយ DMM ផ្ទាល់។",
      );
    }
    if (sys === "brake" || sys === "abs") {
      notes.push("សាកល្បង brake នៅកន្លែងសុវត្ថិភាព បន្ទាប់ពីជួសជុល។");
    }
    notes.push(
      "លទ្ធផលនេះជា placeholder AI — សូមផ្ទៀងផ្ទាត់ជាមួយទិន្នន័យ manufacturer និងការវាស់ជាក់ស្តែង។",
    );
    return notes;
  }

  async analyzePhotos(notes: string[]): Promise<PhotoAnalysis> {
    const meaningful = notes.filter((n) => n.trim().length > 0);
    const analysis: PhotoAnalysis = {
      observations: [
        "រូបភាពត្រូវបានទទួល (placeholder — មិនទាន់មាន vision AI ពិត)។",
        meaningful.length
          ? `កំណត់ចំណាំពីជាង: ${meaningful.join("; ")}`
          : "គ្មានកំណត់ចំណាំបន្ថែម — បន្ថែម note ជួយវិភាគបានល្អជាង។",
      ],
      possibleCauses: [
        {
          title: "ពិនិត្យ component ក្នុងរូបរកស្នាមខូច/លេច/ច្រេះ",
          confidence: 50,
          likelihood: "medium",
          reasoning: "ការវិភាគរូបភាពបឋម",
        },
        {
          title: "ប្រៀបធៀបនឹងគ្រឿងធម្មតា (reference)",
          confidence: 40,
          likelihood: "low",
          reasoning: "ត្រូវការបរិបទបន្ថែម",
        },
      ],
      nextSteps: [
        "ថតបន្ថែមមុំផ្សេង និង close-up",
        "ភ្ជាប់ជាមួយ DTC ឬ live data បើមាន",
        "បញ្ជាក់ដោយការវាស់ជាក់ស្តែង",
      ],
    };
    return delay(analysis, 1200);
  }

  async askExpert(
    conversation: { role: "tech" | "expert"; text: string }[],
    vehicle: Vehicle | null,
  ): Promise<ExpertReply> {
    const last = [...conversation].reverse().find((m) => m.role === "tech");
    const text = (last?.text ?? "").toLowerCase();

    // Ask for missing context first — good diagnostic discipline.
    const missing: string[] = [];
    if (!vehicle || !vehicle.brand) missing.push("ម៉ាក/ម៉ូដែល/ឆ្នាំរថយន្ត");
    if (!/[pbcu]\d{3,4}/i.test(text) && !text.includes("dtc"))
      missing.push("តើមាន DTC កូដអ្វីទេ?");
    if (!/(km|គ.ម|mileage|ចម្ងាយ)/i.test(text))
      missing.push("ចម្ងាយប្រើ (mileage)");

    const followUps: string[] = [];
    if (missing.length) {
      followUps.push(...missing.slice(0, 3));
    }
    followUps.push(
      "រោគសញ្ញាកើតពេលណា? (ត្រជាក់/ក្តៅ, ទំនេរ/បើកបរ, គ្រប់ពេល?)",
      "តើ Check Engine / warning light ភ្លឺទេ?",
    );

    let reply: string;
    if (conversation.filter((m) => m.role === "tech").length <= 1) {
      reply =
        "ខ្ញុំយល់ហើយ។ ដើម្បីរួមតូចមូលហេតុ ខ្ញុំត្រូវការព័ត៌មានបន្ថែមខ្លះ។ សូមឆ្លើយសំណួរខាងក្រោម បន្ទាប់មកខ្ញុំនឹងណែនាំជំហានត្រួតពិនិត្យ។";
    } else if (text.includes("ញ័រ") || text.includes("misfire")) {
      reply =
        "រោគសញ្ញាញ័រ ភាគច្រើនជា misfire។ ចាប់ផ្តើមដោយអាន misfire counter ក្នុង live data ដើម្បីដឹងស៊ីឡាំងណា រួច swap coil/plug ដើម្បីបញ្ជាក់ មុននឹងចំណាយលើគ្រឿង។";
    } else if (text.includes("ក្តៅ") || text.includes("overheat")) {
      reply =
        "សម្រាប់បញ្ហាក្តៅ ពិនិត្យកម្រិត coolant ការដើររបស់ fan ការបើក thermostat និងអវត្តមាន air pocket។ តាមដាន coolant temp ក្នុង live data ពេលសាកល្បង។";
    } else {
      reply =
        "អរគុណសម្រាប់ព័ត៌មាន។ ខ្ញុំណែនាំឲ្យធ្វើតាមលំដាប់៖ អាន DTC + freeze frame → ពិនិត្យ live data ពាក់ព័ន្ធ → visual inspection → តេស្តជាក់ស្តែង។ បញ្ជាក់មូលហេតុមុនប្ដូរគ្រឿង។";
    }
    reply +=
      "\n\n(ចម្លើយ placeholder — real AI នឹងភ្ជាប់ពេលក្រោយ)";

    return delay({ text: reply, followUps: followUps.slice(0, 4) }, 900);
  }
}

/**
 * The app-wide AI instance. Swap this line to change backend:
 *   export const ai: AiProvider = new ClaudeAiProvider(config);
 */
export const ai: AiProvider = new PlaceholderAiProvider();
