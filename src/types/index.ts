/**
 * Master Technician — core domain model.
 *
 * These types define the "database structure" for the app. Today the data
 * lives in localStorage (see services/store.ts) and static dummy files
 * (see data/*). The same shapes are intended to map 1:1 onto a real backend
 * (e.g. Postgres tables / a REST or GraphQL API) later without UI changes.
 */

/** Vehicle systems a technician can diagnose against. */
export type SystemId =
  | "engine"
  | "abs"
  | "airbag"
  | "hybrid"
  | "ev"
  | "transmission"
  | "ac"
  | "electrical"
  | "suspension"
  | "brake"
  | "steering"
  | "body";

export interface VehicleSystem {
  id: SystemId;
  /** Khmer label shown in UI. */
  km: string;
  /** English technical term. */
  en: string;
  /** Emoji / icon key for quick visual scanning. */
  icon: string;
}

export type TransmissionType = "AT" | "MT" | "CVT" | "DCT" | "EV";

/** A vehicle under diagnosis. Free-text fields allow unknown/older models. */
export interface Vehicle {
  brand: string;
  model: string;
  year: number | null;
  engine: string;
  transmission: TransmissionType | "";
  mileageKm: number | null;
}

/** A single Diagnostic Trouble Code entry (dummy DB today). */
export interface DtcCode {
  code: string; // e.g. "P0301"
  titleEn: string;
  titleKm: string;
  systems: SystemId[];
  descriptionKm: string;
  possibleCauses: string[];
  inspectionFlow: string[];
  commonMistakes: string[];
  severity: Severity;
}

export type Severity = "low" | "medium" | "high" | "critical";
export type Likelihood = "high" | "medium" | "low";

/** One ranked cause in a diagnosis result. */
export interface PossibleCause {
  title: string;
  likelihood: Likelihood;
  /** 0–100 confidence, used for the ranking bar. */
  confidence: number;
  reasoning: string;
}

/** Structured output of a diagnosis (from placeholder AI today). */
export interface DiagnosisResult {
  id: string;
  createdAt: number;
  vehicle: Vehicle;
  system: SystemId;
  symptomText: string;
  dtcCodes: string[];
  possibleCauses: PossibleCause[];
  inspectionSteps: string[];
  toolsNeeded: string[];
  recommendedRepair: string;
  safetyNotes: string[];
}

/** The evolving input a technician builds up before requesting diagnosis. */
export interface SymptomInput {
  system: SystemId | null;
  symptomText: string;
  dtcCodes: string[];
  photos: PhotoRef[];
  scanReport: string;
}

export interface PhotoRef {
  id: string;
  /** data: URL or object URL for the (dummy) photo. */
  dataUrl: string;
  note: string;
}

/** A saved real-world repair case (persisted in localStorage). */
export interface RepairCase {
  id: string;
  createdAt: number;
  updatedAt: number;
  vehicle: Vehicle;
  system: SystemId;
  symptomText: string;
  dtcCodes: string[];
  rootCause: string;
  repairPerformed: string;
  partsReplaced: string[];
  technicianNote: string;
  photos: PhotoRef[];
  /** Free tags for search. */
  tags: string[];
}

/** Ask Expert conversation. */
export interface ChatMessage {
  id: string;
  role: "tech" | "expert";
  text: string;
  createdAt: number;
  /** Optional structured follow-up questions the expert is asking. */
  followUps?: string[];
}

export interface ExpertThread {
  id: string;
  createdAt: number;
  title: string;
  vehicle: Vehicle | null;
  messages: ChatMessage[];
}

export type ThemeMode = "light" | "dark" | "system";
