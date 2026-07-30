import type { VehicleSystem } from "@/types";

/** The 12 diagnosable vehicle systems (Khmer label + English technical term). */
export const SYSTEMS: VehicleSystem[] = [
  { id: "engine", km: "ម៉ាស៊ីន", en: "Engine", icon: "⚙️" },
  { id: "abs", km: "ABS ហ្វ្រាំង", en: "ABS", icon: "🛑" },
  { id: "airbag", km: "ថង់ខ្យល់", en: "Airbag / SRS", icon: "💨" },
  { id: "hybrid", km: "កូនកាត់", en: "Hybrid", icon: "🔋" },
  { id: "ev", km: "រថយន្តអគ្គិសនី", en: "EV", icon: "⚡" },
  { id: "transmission", km: "ប្រអប់លេខ", en: "Transmission", icon: "🔧" },
  { id: "ac", km: "ម៉ាស៊ីនត្រជាក់", en: "A/C", icon: "❄️" },
  { id: "electrical", km: "អគ្គិសនី", en: "Electrical", icon: "🔌" },
  { id: "suspension", km: "ប្រព័ន្ធរង្វិល", en: "Suspension", icon: "🛞" },
  { id: "brake", km: "ហ្វ្រាំង", en: "Brake", icon: "🅿️" },
  { id: "steering", km: "កង់ចង្កូត", en: "Steering", icon: "🎯" },
  { id: "body", km: "តួ / Body", en: "Body", icon: "🚗" },
];

export const SYSTEM_BY_ID = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s]),
) as Record<string, VehicleSystem>;
