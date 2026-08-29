import type { VehicleSystem } from "@/types";

/** The 21 diagnosable vehicle systems (Khmer label + English technical term). */
export const SYSTEMS: VehicleSystem[] = [
  { id: "engine", km: "ម៉ាស៊ីន", en: "Engine", icon: "⚙️" },
  { id: "fuel", km: "ប្រព័ន្ធប្រេង", en: "Fuel", icon: "⛽" },
  { id: "ignition", km: "ប្រព័ន្ធដុតឆេះ", en: "Ignition", icon: "🔥" },
  { id: "starting", km: "ចាប់ផ្ដើមម៉ាស៊ីន", en: "Starting", icon: "🔑" },
  { id: "charging", km: "សាកថ្ម", en: "Charging", icon: "🪫" },
  { id: "abs", km: "ABS ហ្វ្រាំង", en: "ABS", icon: "🛑" },
  { id: "airbag", km: "ថង់ខ្យល់", en: "Airbag / SRS", icon: "💨" },
  { id: "hybrid", km: "កូនកាត់", en: "Hybrid", icon: "🔋" },
  { id: "ev", km: "រថយន្តអគ្គិសនី", en: "EV", icon: "⚡" },
  { id: "transmission", km: "ប្រអប់លេខ", en: "Transmission", icon: "🔧" },
  { id: "cooling", km: "ប្រព័ន្ធត្រជាក់ម៉ាស៊ីន", en: "Cooling", icon: "🌡️" },
  { id: "airIntake", km: "ខ្យល់ចូល", en: "Air Intake", icon: "🌬️" },
  { id: "exhaust", km: "ផ្សែងចេញ", en: "Exhaust", icon: "🌫️" },
  { id: "ac", km: "ម៉ាស៊ីនត្រជាក់", en: "A/C", icon: "❄️" },
  { id: "electrical", km: "អគ្គិសនី", en: "Electrical", icon: "🔌" },
  { id: "canBus", km: "ការទំនាក់ទំនង CAN", en: "CAN Communication", icon: "🔗" },
  { id: "suspension", km: "ប្រព័ន្ធរង្វិល", en: "Suspension", icon: "🛞" },
  { id: "brake", km: "ហ្វ្រាំង", en: "Brake", icon: "🅿️" },
  { id: "steering", km: "កង់ចង្កូត", en: "Steering", icon: "🎯" },
  { id: "body", km: "តួ / Body", en: "Body", icon: "🚗" },
  { id: "adas", km: "ជំនួយបើកបរ", en: "ADAS", icon: "📡" },
];

export const SYSTEM_BY_ID = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s]),
) as Record<string, VehicleSystem>;
