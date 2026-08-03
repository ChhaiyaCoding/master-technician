/**
 * Symptom → likely-cause knowledge base (Milestone 10 — Instant AI Diagnose).
 *
 * The DTC knowledge base (dtc.ts) only helps when a scan tool produced a
 * code. Most real-world complaints in a Cambodian workshop start as plain
 * language, often with NO code at all (old vehicles, no scan tool handy).
 * This file is the "no DTC required" half of the instant analysis — a
 * curated set of common symptom → cause patterns, grounded in real
 * automotive diagnostic practice, covering all 12 systems.
 *
 * Keyword matching is intentionally simple (substring, case-insensitive,
 * Khmer + English keywords) — no network call, no cost, works fully offline.
 * Expand this list over time as new common patterns are seen in the shop.
 */
import type { SystemId } from "@/types";

export interface SymptomPattern {
  id: string;
  /** Keywords (Khmer and/or English) — any match on the complaint text triggers this pattern. */
  match: string[];
  title: string;
  systemId: SystemId;
  /** Base confidence 0–100, before any DTC-agreement boost. */
  conf: number;
  /** Short reasoning shown to the mechanic — why this pattern fits. */
  why: string;
};

export const SYMPTOM_PATTERNS: SymptomPattern[] = [
  /* ---------------------------- Engine ---------------------------- */
  {
    id: "engine_misfire",
    match: ["ញ័រ", "misfire", "រញ្ជួយ", "ខូច ស៊ីឡាំង"],
    title: "Ignition coil / Spark plug ខ្សោយ",
    systemId: "engine",
    conf: 60,
    why: "រោគសញ្ញាញ័រពេលដើរ ជាទូទៅបណ្ដាលមកពី misfire នៅស៊ីឡាំងណាមួយ។",
  },
  {
    id: "engine_stall_idle",
    match: ["ស្តុប", "stall", "ដាច់ ពេលទំនេរ", "ស្លាប់ ម៉ាស៊ីន"],
    title: "Idle Air Control / Vacuum leak",
    systemId: "engine",
    conf: 55,
    why: "ស្តុបពេលទំនេរ ច្រើនទាក់ទង idle control ឬខ្យល់លេចចូលលើសកម្រិត។",
  },
  {
    id: "engine_hard_cold_start",
    match: ["ចាប់ផ្ដើមពិបាក", "hard start", "ត្រជាក់មិនចាប់"],
    title: "Battery ចាស់ ឬ Starter ខ្សោយ",
    systemId: "engine",
    conf: 52,
    why: "ចាប់ផ្ដើមពិបាកពេលត្រជាក់ ជាទូទៅទាក់ទង Battery ឬ Starter ខ្សោយកម្លាំង។",
  },
  {
    id: "engine_no_crank",
    match: ["គ្មាន សំឡេង", "no crank", "ស្ងាត់ មិន ចាប់", "click ម្ដង"],
    title: "Battery/Starter/Ground connection",
    systemId: "engine",
    conf: 65,
    why: "Crank គ្មានសំឡេងទាល់តែសោះ ភាគច្រើនជាបញ្ហា power/ground មិនមែន fuel/spark ទេ។",
  },
  {
    id: "engine_crank_no_start",
    match: ["crank", "មិន ដើរ", "no start"],
    title: "Fuel delivery ឬ Ignition spark ខ្វះ",
    systemId: "engine",
    conf: 52,
    why: "Crank បាន តែមិនដើរ — ត្រូវផ្ទៀងផ្ទាត់ថាមាន spark និង fuel ដល់ស៊ីឡាំងទេ។",
  },
  {
    id: "engine_black_smoke",
    match: ["ផ្សែងខ្មៅ", "black smoke"],
    title: "ល្បាយប្រេង Rich / Injector leak",
    systemId: "engine",
    conf: 55,
    why: "ផ្សែងខ្មៅបង្ហាញថាល្បាយប្រេង-ខ្យល់ rich ពេក ឬ injector leak ច្រើនប្រេង។",
  },
  {
    id: "engine_white_smoke",
    match: ["ផ្សែងស", "white smoke"],
    title: "Coolant leak ចូល ស៊ីឡាំង (Head gasket)",
    systemId: "engine",
    conf: 50,
    why: "ផ្សែងសក្រាស់ ជាទូទៅជា coolant ចូលក្នុងបន្ទប់ដុត — ត្រូវពិនិត្យ head gasket។",
  },
  {
    id: "engine_blue_smoke",
    match: ["ផ្សែងខៀវ", "blue smoke", "ស៊ីប្រេង"],
    title: "Piston ring / Valve seal ចាស់ (ស៊ីប្រេង)",
    systemId: "engine",
    conf: 48,
    why: "ផ្សែងខៀវ/ស៊ីប្រេងច្រើន បង្ហាញ oil burning ពី piston ring ឬ valve seal ចាស់។",
  },
  {
    id: "engine_power_loss",
    match: ["ខ្សោយកម្លាំង", "power loss", "អត់ ខ្លាំង", "ឡើងភ្នំ"],
    title: "Fuel Filter ស្ទះ ឬ Turbo boost ខ្សោយ",
    systemId: "engine",
    conf: 48,
    why: "ខ្សោយកម្លាំងពេលផ្ទុកធ្ងន់ ជាទូទៅទាក់ទង supply ខ្វះ ឬ boost មិនគ្រប់។",
  },
  {
    id: "engine_knock",
    match: ["គោះ", "knock", "គ្រហឹម"],
    title: "Rod bearing ចាស់ / Knock ពី octane ទាប",
    systemId: "engine",
    conf: 45,
    why: "សំឡេងគោះក្នុងម៉ាស៊ីន អាចជា bearing ចាស់ ឬ knock ពីប្រេងគុណភាពទាប។",
  },
  {
    id: "engine_overheat",
    match: ["ក្ដៅ", "overheat", "ក្ដៅពេក", "សំពាធទឹក"],
    title: "Cooling system (Thermostat/Radiator/Water pump/Fan)",
    systemId: "engine",
    conf: 58,
    why: "រោគសញ្ញាក្ដៅលើសកម្រិត ភ្ជាប់ដោយផ្ទាល់នឹងប្រព័ន្ធ cooling។",
  },
  {
    id: "engine_check_engine_only",
    match: ["check engine", "ភ្លើង ភ្លឺ", "ភ្លើងក្រហម ម៉ាស៊ីន"],
    title: "Oxygen sensor ឬ Gas cap រលុង",
    systemId: "engine",
    conf: 38,
    why: "Check Engine ភ្លឺ ដោយគ្មានរោគសញ្ញាផ្សេង ជាញឹកញាប់មកពីមូលហេតុតូចៗទាំងនេះ។",
  },

  /* ------------------------- Transmission ------------------------- */
  {
    id: "trans_slip",
    match: ["រអិល", "slip", "rpm ឡើង", "លេខ រអិល"],
    title: "Clutch pack ចាស់ ឬ ATF ខ្សោយកម្រិត",
    systemId: "transmission",
    conf: 55,
    why: "RPM ឡើងលឿនជាងល្បឿនរថយន្ត បង្ហាញថា clutch pack ក្នុងប្រអប់លេខ រអិល។",
  },
  {
    id: "trans_harsh_shift",
    match: ["ប្តូរលេខ រឹង", "harsh shift", "ញ័រ ពេល ប្តូរលេខ"],
    title: "Shift solenoid ឬ ATF ខូច",
    systemId: "transmission",
    conf: 50,
    why: "ប្ដូរលេខរឹង/មានការញ័រ ជាទូទៅទាក់ទង solenoid ឬគុណភាព ATF។",
  },
  {
    id: "trans_no_engage",
    match: ["មិន ចូល លេខ", "no engage", "D មិន ដើរ", "R មិន ថយ"],
    title: "Transmission linkage ឬ Valve body",
    systemId: "transmission",
    conf: 45,
    why: "លេខមិនចូល ជាទូទៅជាបញ្ហា linkage ខាងក្រៅ ឬ valve body ខាងក្នុង។",
  },
  {
    id: "trans_whine",
    match: ["whine", "សំឡេង រែក ប្រអប់លេខ"],
    title: "Transmission bearing ចាស់",
    systemId: "transmission",
    conf: 40,
    why: "សំឡេង whine ពេលបើកបរ ជាទូទៅមកពី bearing ក្នុងប្រអប់លេខចាស់។",
  },
  {
    id: "trans_clutch",
    match: ["clutch", "កៅស៊ូ ជ្រាប", "clutch ទន់"],
    title: "Clutch disc ចាស់ ឬ Hydraulic leak",
    systemId: "transmission",
    conf: 48,
    why: "Clutch pedal ទន់ ឬ slip ភាគច្រើនជា clutch disc ចាស់ ឬការលេច hydraulic។",
  },

  /* --------------------------- Brake / ABS --------------------------- */
  {
    id: "brake_squeal",
    match: ["ស្រែក", "squeal", "ស្រែក ហ្វ្រាំង"],
    title: "Brake pad ស្មិចអស់ (wear indicator)",
    systemId: "brake",
    conf: 62,
    why: "សំឡេងស្រែកពេលហ្វ្រាំង ភាគច្រើនជា wear indicator ប្រាប់ថា pad ជិតអស់។",
  },
  {
    id: "brake_pulsation",
    match: ["រំញ័រ ហ្វ្រាំង", "pulsation", "រថយន្ត ញ័រ ពេល ហ្វ្រាំង"],
    title: "Brake rotor ក្ដច់រាង (Warped)",
    systemId: "brake",
    conf: 55,
    why: "រំញ័រពេលហ្វ្រាំង ជាទូទៅជា rotor ក្ដច់រាងពីកម្ដៅខ្ពស់ម្ដងហើយម្ដងទៀត។",
  },
  {
    id: "brake_soft_pedal",
    match: ["pedal ទន់", "soft brake", "ចុច ជ្រៅ"],
    title: "Air ក្នុង Brake line ឬ Master cylinder leak",
    systemId: "brake",
    conf: 50,
    why: "Pedal ទន់ជ្រៅ ជាទូទៅមកពី air ក្នុងប្រព័ន្ធ ឬការលេចនៃ master cylinder។",
  },
  {
    id: "abs_light",
    match: ["abs ភ្លឺ", "abs light", "ភ្លើង abs"],
    title: "Wheel speed sensor ខូច ឬ ABS module",
    systemId: "abs",
    conf: 55,
    why: "ភ្លើង ABS ភ្លឺ ភាគច្រើនចាប់ផ្ដើមពី wheel speed sensor មិនផ្ញើសញ្ញា។",
  },
  {
    id: "brake_pull",
    match: ["ទាញ ម្ខាង", "pulls", "បត់ ខាង ពេល ហ្វ្រាំង"],
    title: "Caliper ជាប់ ឬ Brake line ស្ទះ",
    systemId: "brake",
    conf: 46,
    why: "រថយន្តទាញម្ខាងពេលហ្វ្រាំង បង្ហាញកម្លាំងហ្វ្រាំងមិនស្មើគ្នារវាងកង់។",
  },

  /* ------------------------------- A/C ------------------------------- */
  {
    id: "ac_not_cold",
    match: ["មិន ត្រជាក់", "not cold", "គ្មាន ត្រជាក់"],
    title: "ខ្វះ Refrigerant (leak) ឬ Compressor ខូច",
    systemId: "ac",
    conf: 58,
    why: "មិនត្រជាក់ទាល់តែសោះ ភាគច្រើនជា refrigerant ខ្វះ ឬ compressor មិនធ្វើការ។",
  },
  {
    id: "ac_weak",
    match: ["ត្រជាក់ ខ្សោយ", "weak flow", "ខ្យល់ ចេញ តិច"],
    title: "Cabin filter ស្ទះ ឬ Blower motor ខ្សោយ",
    systemId: "ac",
    conf: 45,
    why: "ខ្យល់ត្រជាក់ចេញតិច ជាទូទៅជា filter ស្ទះ ឬ blower motor ចាស់។",
  },
  {
    id: "ac_cycling",
    match: ["ត្រជាក់ ម្ដងស្កប់ម្ដង", "cycling", "ត្រជាក់ ដាច់ រំដោះ"],
    title: "Refrigerant ខ្វះ ឬ Pressure switch",
    systemId: "ac",
    conf: 48,
    why: "ត្រជាក់ដាច់ៗ ដកតែម្ដងស្កប់ម្ដងសញ្ញាថា refrigerant ទាប ឬ pressure switch មិនប្រក្រតី។",
  },
  {
    id: "ac_smell",
    match: ["ក្លិន", "smell", "ស្អុយ ម៉ាស៊ីនត្រជាក់"],
    title: "Evaporator ស្អុយ (mold)",
    systemId: "ac",
    conf: 42,
    why: "ក្លិនអាក្រក់ចេញពី vent ភាគច្រើនជា mold លើ evaporator។",
  },

  /* ---------------------------- Electrical ---------------------------- */
  {
    id: "elec_battery_drain",
    match: ["ថ្ម រលាយ", "battery drain", "ថ្ម អស់ លឿន"],
    title: "Parasitic draw ឬ Alternator មិនសាកថ្ម",
    systemId: "electrical",
    conf: 52,
    why: "ថ្មរលាយលឿន ភាគច្រើនជា draw លាក់កំបាំង ឬ alternator មិនសាកថ្មគ្រប់គ្រាន់។",
  },
  {
    id: "elec_charge_light",
    match: ["សាកថ្ម ភ្លឺ", "charge light", "battery light"],
    title: "Alternator belt ដាច់/រលុង ឬ Alternator ខូច",
    systemId: "electrical",
    conf: 60,
    why: "ភ្លើងសញ្ញាសាកថ្មភ្លឺពេលដើរ ស្ទើរតែជានិច្ចជាបញ្ហា alternator/belt ។",
  },
  {
    id: "elec_dim_lights",
    match: ["ភ្លើង ស្រពិចស្រពិល", "dim lights"],
    title: "Ground connection ខ្សោយ",
    systemId: "electrical",
    conf: 45,
    why: "ភ្លើងស្រពិចស្រពិល ជាទូទៅជា ground connection ចាស់ ឬច្រេះ។",
  },
  {
    id: "elec_fuse",
    match: ["fuse ដាច់", "fuse ខូច ដដែលៗ"],
    title: "Short circuit ក្នុងសៀគ្វី",
    systemId: "electrical",
    conf: 48,
    why: "Fuse ដាច់ដដែលៗ ជានិច្ចជាសញ្ញា short circuit ត្រូវរកនៅកន្លែងណា។",
  },

  /* ------------------------ Suspension / Steering ------------------------ */
  {
    id: "susp_vibration",
    match: ["រំញ័រ", "vibration", "ញ័រ ល្បឿន ខ្ពស់"],
    title: "កង់មិន Balance ឬ Tire ខូច",
    systemId: "suspension",
    conf: 50,
    why: "រំញ័រពេលបើកបរល្បឿនខ្ពស់ ភាគច្រើនជា wheel balance ឬ tire មិនស្មើ។",
  },
  {
    id: "susp_clunk",
    match: ["clunk", "សំឡេង គោក", "កន្លង ជាន់ ធ្លាក់"],
    title: "Ball joint ឬ Sway bar link ចាស់",
    systemId: "suspension",
    conf: 48,
    why: "សំឡេង clunk ពេលកន្លងកន្លែងធ្លាក់ ភ្ជាប់នឹង suspension linkage ចាស់។",
  },
  {
    id: "steer_heavy",
    match: ["ចង្កូត ធ្ងន់", "heavy steering"],
    title: "Power steering fluid ខ្វះ ឬ Pump ខូច",
    systemId: "steering",
    conf: 46,
    why: "ចង្កូតធ្ងន់ ភាគច្រើនជា power steering fluid ខ្វះ ឬ pump ចាស់។",
  },
  {
    id: "steer_pull_straight",
    match: ["ទាញ ម្ខាង ត្រង់", "pulls while driving"],
    title: "Wheel alignment ខុស",
    systemId: "steering",
    conf: 44,
    why: "រថយន្តទាញម្ខាងពេលបើកត្រង់ ជាទូទៅជា alignment ខុសពីស្តង់ដារ។",
  },
  {
    id: "steer_whine_turn",
    match: ["whine ពេល បត់", "សំឡេង ពេល បត់ ចង្កូត"],
    title: "Power steering pump ខូច",
    systemId: "steering",
    conf: 42,
    why: "សំឡេង whine ពេលបត់ចង្កូត ភ្ជាប់ដោយផ្ទាល់នឹង power steering pump។",
  },

  /* --------------------------- Hybrid / EV --------------------------- */
  {
    id: "hybrid_battery_warning",
    match: ["hybrid battery", "កូនកាត់ ភ្លើង ព្រមាន", "hv battery"],
    title: "HV Battery block ខ្សោយ",
    systemId: "hybrid",
    conf: 48,
    why: "ភ្លើងព្រមាន hybrid battery ភាគច្រើនចាប់ផ្ដើមពី block មួយក្នុងចំណោមច្រើន ខ្សោយ។",
  },
  {
    id: "ev_range_drop",
    match: ["range ថយចុះ", "ថ្ម រថយន្តអគ្គិសនី ថយ"],
    title: "HV Battery degradation ឬ Cell imbalance",
    systemId: "ev",
    conf: 45,
    why: "Range ថយចុះខ្លាំងជាងធម្មតា ភ្ជាប់នឹង battery degradation ឬ cell imbalance។",
  },
];
