/**
 * Modern diesel codes — Technical Content Audit v1, Phase 2.
 *
 * The audit found the knowledge base was weakest exactly where this app is
 * used most. Cambodian workshops run on diesel pickups — Hilux, Ranger, D-Max,
 * Triton, Navara — and imports from 2015 on carry a DPF. Yet coverage was
 * DPF 1/12, SCR 0/7, glow plugs 3/8, and the two codes a turbo actually sets
 * when it stops making boost, P0299 and P0234, were missing entirely: there
 * were 26 codes for the wiring *around* the turbo and none for the turbo
 * failing.
 *
 * Kept in its own module rather than appended to dtcExtended.ts because these
 * were written by hand against the systems they describe, not generated from a
 * template — the thin, repetitive entries the audit criticised (P2-1, P2-2) all
 * came from generation.
 *
 * Safety notes follow the rule the audit established: they are the FIRST
 * inspection step, so they are read before the work rather than after. Two
 * hazards recur here — common rail at 1,500-2,500 bar, and DPF regeneration
 * driving exhaust past 600 °C.
 */
import type { DtcCode } from "@/types";

const RAIL_WARNING =
  "⚠️ Common Rail មានសម្ពាធ 1,500–2,500 bar — បិទម៉ាស៊ីន រង់ចាំសម្ពាធធ្លាក់ មុនបើក joint។ " +
  "កុំយកដៃទៅជិតកន្លែងលេចខណៈម៉ាស៊ីនដើរ — ដីសែលអាចទម្លុះស្បែកចូលសាច់";

const DPF_HEAT_WARNING =
  "⚠️ ពេល DPF Regeneration ដំណើរការ ឧស្ម័នចេញក្តៅលើស 600°C — កុំចត់លើស្មៅស្ងួត ឬសម្ភារឆេះ " +
  "កុំចូលក្រោមរថយន្ត និងកុំប៉ះ Exhaust រហូតដល់ត្រជាក់";

const PICKUP = "ជាទូទៅជួបលើ pickup ដីសែល (Toyota Hilux/Fortuner, Ford Ranger, Isuzu D-Max, Mitsubishi Triton, Nissan Navara)";
const DPF_ERA = "ជួបលើដីសែលនាំចូលចាប់ពីឆ្នាំ ២០១៥ ឡើងទៅ ដែលមាន DPF";

export const DTC_CODES_DIESEL: DtcCode[] = [
  /* ------------------------- Turbo — the real faults ------------------------ */
  {
    code: "P0299",
    titleEn: "Turbocharger/Supercharger Underboost Condition",
    titleKm: "Turbo មិនផ្ដល់សម្ពាធគ្រប់តាមការរំពឹង",
    systems: ["engine", "airIntake"],
    severity: "high",
    commonOn: PICKUP,
    descriptionKm:
      "ECU ប្រៀបធៀប Desired Boost នឹង Actual Boost ហើយឃើញថាទាបជាងច្រើនហួសកម្រិត។ នេះជាកូដដែលឡានដីសែលឡើងញឹកញាប់បំផុតពេលអស់កម្លាំង។ ភាគច្រើនមិនមែន Turbo ខូចទេ — ជាការលេចខ្យល់ ឬ VGT Vane ជាប់កាបូន។",
    possibleCauses: [
      "Intercooler Pipe រលុង/ប្រេះ ឬ Clamp ធូរ (មូលហេតុញឹកញាប់បំផុត)",
      "VGT Vane ជាប់កាបូន បើកមិនចេញ",
      "Wastegate ជាប់បើក ឬ Actuator ខ្សោយ",
      "Boost Control Solenoid ឬបំពង់ Vacuum ដាច់",
      "DPF ស្ទះ ធ្វើឲ្យ Backpressure ខ្ពស់",
      "Turbo ពិតជាអស់ (Shaft ធូរ, Blade ខូច)",
    ],
    inspectionFlow: [
      "អាន Desired Boost ធៀបនឹង Actual Boost ក្នុង Live Data — កត់ចន្លោះខុសគ្នា",
      "ធ្វើ Boost Leak Test — ដាក់សម្ពាធចូល Intake រកកន្លែងលេច មុនធ្វើអ្វីផ្សេង",
      "ពិនិត្យ Intercooler Pipe និង Clamp ទាំងអស់ដោយដៃ",
      "ពិនិត្យ VGT/Wastegate Actuator ថាផ្លាស់ទីពេញជួរដោយ Scan Tool",
      "ពិនិត្យ Backpressure DPF បើមាន",
      "ចុងក្រោយ ទើបពិនិត្យ Shaft Play របស់ Turbo",
    ],
    commonMistakes: [
      "ប្ដូរ Turbo ថ្លៃដោយមិនធ្វើ Boost Leak Test ជាមុន — P0299 ភាគច្រើនជាការលេច ឬ Vane ជាប់",
      "មិនពិនិត្យ DPF ស្ទះ ដែលធ្វើឲ្យ Turbo ផ្ដល់សម្ពាធមិនចេញ",
    ],
  },
  {
    code: "P0234",
    titleEn: "Turbocharger/Supercharger Overboost Condition",
    titleKm: "Turbo ផ្ដល់សម្ពាធខ្ពស់ហួសកម្រិត",
    systems: ["engine", "airIntake"],
    severity: "high",
    commonOn: "ជួបលើម៉ាស៊ីន Turbo ទាំង Diesel និង Gasoline",
    descriptionKm:
      "សម្ពាធ Boost ខ្ពស់ជាងអ្វីដែល ECU បញ្ជា។ គ្រោះថ្នាក់ជាង Underboost ព្រោះអាចធ្វើឲ្យ Piston, Gasket ឬ Turbo ខ្លួនឯងខូច។ ECU ជាទូទៅកាត់កម្លាំង (Limp Mode) ដើម្បីការពារ។",
    possibleCauses: [
      "Wastegate ជាប់បិទ ឬ VGT Vane ជាប់ក្នុងទីតាំងបិទ",
      "បំពង់ Vacuum ទៅ Wastegate Actuator ដាច់/ស្ទះ",
      "Boost Control Solenoid ជាប់",
      "MAP Sensor អានខុស",
    ],
    inspectionFlow: [
      "អាន Actual Boost ក្នុង Live Data — បញ្ជាក់ថាខ្ពស់ពិត មិនមែន Sensor អានខុស",
      "ពិនិត្យបំពង់ Vacuum ទៅ Actuator រកការដាច់ ឬស្ទះ",
      "សាក Activation Boost Control Solenoid ដោយ Scan Tool",
      "ពិនិត្យថា Wastegate/VGT ផ្លាស់ទីដោយសេរី មិនជាប់កាបូន",
    ],
    commonMistakes: [
      "បន្តបើកបរដោយមិនដោះស្រាយ — Overboost អាចធ្វើឲ្យម៉ាស៊ីនខូចធ្ងន់",
      "ប្ដូរ Turbo ដោយមិនពិនិត្យបំពង់ Vacuum ដែលដាច់",
    ],
  },
  {
    code: "P2262",
    titleEn: "Turbo Boost Pressure Not Detected - Mechanical",
    titleKm: "Turbo មិនផ្ដល់សម្ពាធ — ECU ចាត់ទុកជាបញ្ហាមេកានិក",
    systems: ["engine", "airIntake"],
    severity: "high",
    commonOn: PICKUP,
    descriptionKm:
      "ECU សន្និដ្ឋានថាការខ្វះសម្ពាធមកពីមេកានិក មិនមែនអគ្គិសនី។ ជាទូទៅ VGT Vane ជាប់កាបូនរឹង ឬ Turbo អស់។",
    possibleCauses: [
      "VGT Vane ជាប់កាបូនរឹង",
      "Actuator Linkage ធូរ/ដាច់",
      "Turbo អស់ (Bearing/Shaft)",
      "ការលេចខ្យល់ធំក្នុង Intake",
    ],
    inspectionFlow: [
      "សាកបញ្ជា Actuator ដោយ Scan Tool ហើយមើលថាវាផ្លាស់ទីពេញជួរឬអត់",
      "ធ្វើ Boost Leak Test មុនសន្និដ្ឋានថា Turbo ខូច",
      "ពិនិត្យកាបូននៅ VGT Mechanism",
      "ពិនិត្យ Shaft Play",
    ],
    commonMistakes: ["ប្ដូរ Turbo ខណៈគ្រាន់តែសម្អាតកាបូននៅ Vane ក៏គ្រប់គ្រាន់"],
  },

  /* ------------------------------ Glow plugs ------------------------------ */
  {
    code: "P0670",
    titleEn: "Glow Plug Module Control Circuit",
    titleKm: "សៀគ្វី Glow Plug Module មានបញ្ហា",
    systems: ["engine", "electrical"],
    severity: "medium",
    commonOn: "ជួបលើម៉ាស៊ីនដីសែលទាំងអស់ ជាពិសេសពេលអាកាសធាតុត្រជាក់",
    descriptionKm:
      "ECU មិនអាចទំនាក់ទំនង ឬបញ្ជា Glow Plug Module បានត្រឹមត្រូវ។ លទ្ធផល៖ ចាប់ផ្ដើមពិបាកពេលម៉ាស៊ីនត្រជាក់ និងចេញផ្សែងស។",
    possibleCauses: [
      "Glow Plug Module (Relay) ខូច",
      "Power/Ground ទៅ Module បាត់",
      "Fuse ដាច់",
      "ខ្សែពី ECU ទៅ Module ដាច់",
    ],
    inspectionFlow: [
      "ពិនិត្យ Fuse និង Power/Ground នៅ Module",
      "អាន Live Data — មើលថា ECU ស្នើ Glow Plug ដំណើរការឬអត់",
      "វាស់វ៉ុលចេញពី Module ទៅ Glow Plug ពេលចាប់ផ្ដើម",
    ],
    commonMistakes: ["ប្ដូរ Glow Plug ទាំងអស់ខណៈបញ្ហាពិតនៅ Module"],
  },
  ...([1, 2, 3, 4] as const).map<DtcCode>((cyl) => ({
    code: `P067${cyl}`,
    titleEn: `Glow Plug Circuit Cylinder ${cyl}`,
    titleKm: `សៀគ្វី Glow Plug ស៊ីឡាំងទី ${["១", "២", "៣", "៤"][cyl - 1]} មានបញ្ហា`,
    systems: ["engine"],
    severity: "medium",
    commonOn: "ជួបលើម៉ាស៊ីនដីសែលទាំងអស់",
    descriptionKm: `Glow Plug ស៊ីឡាំងទី ${["១", "២", "៣", "៤"][cyl - 1]} ដាច់សៀគ្វី ឬ Resistance ខុសពីធម្មតា។ ស៊ីឡាំងតែមួយក៏អាចធ្វើឲ្យចាប់ផ្ដើមពិបាក និងញ័រពេលត្រជាក់។`,
    possibleCauses: [
      "Glow Plug ដាច់ខាងក្នុង",
      "ខ្សែ/Connector នៅក្បាល Glow Plug រលុងដោយកំដៅ",
      "Glow Plug Module ចេញវ៉ុលមិនស្មើ",
    ],
    inspectionFlow: [
      `វាស់ Resistance Glow Plug ស៊ីឡាំង ${cyl} (ធម្មតា 0.5–2 Ω) ធៀបនឹងស៊ីឡាំងផ្សេង`,
      "ពិនិត្យ Connector រកដានកំដៅ និងការរលុង",
      "វាស់វ៉ុលមកដល់ Glow Plug ពេលចាប់ផ្ដើម",
    ],
    commonMistakes: [
      "ប្ដូរ Glow Plug ទាំង ៤ ដោយមិនវាស់ថាមួយណាដាច់",
      "ដកកម្លាំង Glow Plug ដែលជាប់ច្រេះ — វាបាក់ក្នុងក្បាលស៊ីឡាំង ហើយត្រូវដោះក្បាលចេញ។ ត្រូវដាក់ថ្នាំរលុង និងកម្ដៅជាមុន",
    ],
  })),

  /* --------------------------------- DPF --------------------------------- */
  {
    code: "P2003",
    titleEn: "Diesel Particulate Filter Efficiency Below Threshold Bank 2",
    titleKm: "ប្រសិទ្ធភាព DPF ទាប Bank 2",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: "ជួបលើម៉ាស៊ីនដីសែលរាង V ដែលមាន DPF ពីរ",
    descriptionKm: "ដូច P2002 ប៉ុន្តែនៅ Bank 2។ DPF មិនចាប់ Soot បានតាមការរំពឹង។",
    possibleCauses: ["DPF ខូច/ប្រេះខាងក្នុង", "Differential Pressure Sensor អានខុស", "បំពង់ Sensor ស្ទះ"],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "អាន Differential Pressure និង Soot Load ក្នុង Live Data",
      "ពិនិត្យបំពង់ទៅ Pressure Sensor រកការស្ទះ ឬដាច់",
    ],
    commonMistakes: ["ប្ដូរ DPF ថ្លៃខណៈបញ្ហានៅត្រឹមបំពង់ Sensor ស្ទះ"],
  },
  {
    code: "P2463",
    titleEn: "Diesel Particulate Filter Restriction - Soot Accumulation",
    titleKm: "DPF ស្ទះដោយ Soot (សំណល់ខ្មៅ)",
    systems: ["engine", "exhaust"],
    severity: "high",
    commonOn: DPF_ERA,
    descriptionKm:
      "Soot កកកុញក្នុង DPF លើសកម្រិត។ Soot អាចដុតចោលបានតាម Regeneration — ខុសពី Ash ដែលដុតមិនចេញ។ ជាទូទៅមូលហេតុពិតគឺ Regeneration មិនដែលបញ្ចប់ ព្រោះបើកបរផ្លូវខ្លីៗ ឬមានកំហុសផ្សេងរារាំង។",
    possibleCauses: [
      "បើកបរផ្លូវខ្លីៗ — Regeneration មិនដែលបញ្ចប់",
      "អ្នកបើកបរបិទម៉ាស៊ីនកណ្ដាល Regeneration",
      "EGR ជាប់បើក ធ្វើឲ្យ Soot កើនលឿន",
      "Injector លេច/បាញ់មិនល្អ បង្កើត Soot ច្រើន",
      "Differential Pressure Sensor អានខុស",
    ],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "អាន Soot Load (%) និង Distance Since Last Regeneration",
      "រកមូលហេតុពិតជាមុន — EGR, Injector, Boost Leak — មុនធ្វើ Forced Regeneration",
      "ធ្វើ Forced Regeneration តាមនីតិវិធីរបស់ម៉ាក",
      "បើ Soot មិនចុះ ពិនិត្យ Differential Pressure Sensor និងបំពង់",
    ],
    commonMistakes: [
      "ធ្វើ Forced Regeneration ដដែលៗដោយមិនរកមូលហេតុ — វានឹងស្ទះឡើងវិញ",
      "កាត់/ដក DPF ចេញ — ខុសច្បាប់ ហើយមិនដោះស្រាយមូលហេតុ",
    ],
  },
  {
    code: "P242F",
    titleEn: "Diesel Particulate Filter Restriction - Ash Accumulation",
    titleKm: "DPF ស្ទះដោយ Ash (ផេះ)",
    systems: ["engine", "exhaust"],
    severity: "high",
    commonOn: DPF_ERA,
    descriptionKm:
      "Ash កកកុញលើសកម្រិត។ ចំណុចសំខាន់៖ Ash ដុតចោល**មិនចេញ**ទេ ខុសពី Soot។ វាមកពីធាតុបន្ថែមក្នុងប្រេងម៉ាស៊ីន និងការសឹករបស់ម៉ាស៊ីន។ ដំណោះស្រាយគឺសម្អាតដោយម៉ាស៊ីនឯកទេស ឬប្ដូរ។",
    possibleCauses: [
      "អាយុប្រើប្រាស់ធម្មតា (ជាទូទៅ 150,000–250,000 គ.ម)",
      "ប្រើប្រេងម៉ាស៊ីនខុសប្រភេទ (មិនមែន Low-SAPS)",
      "ម៉ាស៊ីនស៊ីប្រេង (Valve Seal, Piston Ring)",
    ],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "អាន Ash Load ក្នុង Live Data — ញែកឲ្យច្បាស់ពី Soot Load",
      "ពិនិត្យថាម៉ាស៊ីនស៊ីប្រេងឬអត់",
      "សម្អាត DPF ដោយម៉ាស៊ីនឯកទេស ឬប្ដូរ",
    ],
    commonMistakes: [
      "ធ្វើ Forced Regeneration ដើម្បីដោះ Ash — Ash ដុតមិនចេញទេ ខាតពេលទទេ",
      "ប្ដូរ DPF ដោយមិនដោះស្រាយម៉ាស៊ីនស៊ីប្រេង — DPF ថ្មីនឹងស្ទះម្ដងទៀត",
    ],
  },
  {
    code: "P2452",
    titleEn: "Diesel Particulate Filter Pressure Sensor A Circuit",
    titleKm: "សៀគ្វី DPF Differential Pressure Sensor មានបញ្ហា",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm: "ECU មិនទទួលសញ្ញាត្រឹមត្រូវពី Sensor ដែលវាស់សម្ពាធពីមុខនិងក្រោយ DPF។ បើគ្មានសញ្ញានេះ ECU មិនដឹងថា DPF ស្ទះប៉ុនណា។",
    possibleCauses: ["Sensor ខូច", "បំពង់ទៅ Sensor ស្ទះដោយ Soot ឬប្រេះ", "Wiring/Connector"],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "ដកបំពង់ទាំងពីរចេញ ពិនិត្យការស្ទះ និងការប្រេះ",
      "វាស់វ៉ុលសញ្ញា Sensor ធៀបនឹងតម្លៃស្តង់ដារពេលម៉ាស៊ីនទំនេរ",
      "ពិនិត្យ Wiring និង Connector",
    ],
    commonMistakes: ["ប្ដូរ Sensor ខណៈបំពង់តូចនោះទេដែលស្ទះ"],
  },
  {
    code: "P2453",
    titleEn: "Diesel Particulate Filter Pressure Sensor A Circuit Range/Performance",
    titleKm: "DPF Pressure Sensor អានតម្លៃមិនសមហេតុផល",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm: "តម្លៃពី Sensor នៅក្នុងជួរអគ្គិសនីធម្មតា តែមិនសមហេតុផលនឹងស្ថានភាពម៉ាស៊ីន។ ជាទូទៅបំពង់ស្ទះ ឬដោតច្រឡំម្ខាង។",
    possibleCauses: ["បំពង់ស្ទះ/ដោតច្រឡំម្ខាងគ្នា", "Sensor ចាស់អានលំអៀង", "DPF ស្ទះខ្លាំងពិត"],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "ពិនិត្យថាបំពង់មុខ និងក្រោយដោតត្រូវទីតាំង",
      "ធៀបតម្លៃពេលទំនេរ — គួរជិតសូន្យបើ DPF ស្អាត",
      "សម្អាតបំពង់ រួចអានម្ដងទៀត",
    ],
    commonMistakes: ["មិនពិនិត្យថាបំពង់ពីរដោតច្រឡំគ្នា"],
  },
  {
    code: "P2454",
    titleEn: "Diesel Particulate Filter Pressure Sensor A Circuit Low",
    titleKm: "សញ្ញា DPF Pressure Sensor ទាបខុសធម្មតា",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm: "វ៉ុលសញ្ញាទាបជាងជួរធម្មតា — ជាទូទៅខ្សែ Short to Ground ឬ Sensor ខូច។",
    possibleCauses: ["ខ្សែភ្លើង Short to Ground", "Sensor ខូច", "Connector ច្រេះ"],
    inspectionFlow: [
      "វាស់វ៉ុល Reference 5V នៅ Connector",
      "ដក Sensor ចេញ — មើលថាកូដប្ដូរទៅ High ទេ (ញែក Sensor ចេញពី Wiring)",
      "ពិនិត្យ Wiring រក Short to Ground",
    ],
    commonMistakes: ["មិនពិនិត្យ Wiring មុនប្ដូរ Sensor"],
  },
  {
    code: "P2455",
    titleEn: "Diesel Particulate Filter Pressure Sensor A Circuit High",
    titleKm: "សញ្ញា DPF Pressure Sensor ខ្ពស់ខុសធម្មតា",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm: "វ៉ុលសញ្ញាខ្ពស់ជាងជួរធម្មតា — ជាទូទៅខ្សែដាច់ ឬ Short to Power។",
    possibleCauses: ["ខ្សែសញ្ញាដាច់", "Short to Power", "Sensor ខូច", "Ground បាត់"],
    inspectionFlow: [
      "វាស់វ៉ុលសញ្ញានៅ Connector",
      "ពិនិត្យ Ground របស់ Sensor",
      "ពិនិត្យ Wiring រកការដាច់",
    ],
    commonMistakes: ["មិនពិនិត្យ Ground ដែលបាត់"],
  },
  {
    code: "P2458",
    titleEn: "Diesel Particulate Filter Regeneration Duration",
    titleKm: "DPF Regeneration ចំណាយពេលយូរហួសកម្រិត",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm:
      "Regeneration ចាប់ផ្ដើមបាន តែមិនបញ្ចប់ក្នុងរយៈពេលកំណត់។ ជាទូទៅសីតុណ្ហភាពឡើងមិនដល់ ឬអ្នកបើកបរបញ្ឈប់មុនចប់។",
    possibleCauses: [
      "បើកបរផ្លូវខ្លី — បិទម៉ាស៊ីនមុន Regeneration ចប់",
      "សីតុណ្ហភាព Exhaust ឡើងមិនដល់ (EGT Sensor ឬ Injector)",
      "DPF ស្ទះខ្លាំងពេក",
      "កម្រិតប្រេងឥន្ធនៈទាបពេក — ECU មិនអនុញ្ញាត Regeneration",
    ],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "អានប្រវត្តិ Regeneration និង Soot Load",
      "ពិនិត្យ EGT Sensor ថាអានត្រឹមត្រូវ",
      "ណែនាំអតិថិជនឲ្យបើកបរផ្លូវវែងទៀងទាត់",
    ],
    commonMistakes: ["មិនប្រាប់អតិថិជនពីរបៀបបើកបរដែលធ្វើឲ្យ Regeneration ចប់"],
  },
  {
    code: "P2459",
    titleEn: "Diesel Particulate Filter Regeneration Frequency",
    titleKm: "DPF Regeneration កើតញឹកញាប់ហួសកម្រិត",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm:
      "Regeneration កើតញឹកញាប់ពេក — សញ្ញាថាម៉ាស៊ីនបង្កើត Soot ច្រើនហួសធម្មតា។ កូដនេះជាការព្រមានពីមូលហេតុផ្សេង មិនមែនបញ្ហារបស់ DPF ខ្លួនឯង។",
    possibleCauses: [
      "Injector លេច ឬបាញ់មិនល្អ",
      "EGR ជាប់បើក",
      "Boost Leak — ខ្យល់មិនគ្រប់ធៀបនឹងប្រេង",
      "Air Filter ស្ទះ",
      "ប្រេងម៉ាស៊ីនចូល Combustion (ម៉ាស៊ីនស៊ីប្រេង)",
    ],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "អានចន្លោះចម្ងាយរវាង Regeneration នីមួយៗ",
      "ធ្វើ Injector Return-Volume Test",
      "ពិនិត្យ EGR និង Boost Leak",
      "ពិនិត្យ Air Filter",
    ],
    commonMistakes: ["ផ្ដោតលើ DPF ខណៈកូដនេះចង្អុលទៅមូលហេតុនៅម៉ាស៊ីន"],
  },
  {
    code: "P244A",
    titleEn: "Diesel Particulate Filter Differential Pressure Too Low",
    titleKm: "សម្ពាធខុសគ្នាឆ្លងកាត់ DPF ទាបហួសកម្រិត",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: DPF_ERA,
    descriptionKm:
      "សម្ពាធមុខនិងក្រោយ DPF ខុសគ្នាតិចពេក។ ជាទូទៅមានន័យថា DPF ត្រូវបានដក/កាត់ចេញ ឬបំពង់ Sensor ដាច់។",
    possibleCauses: ["DPF ត្រូវបានដកចេញ/កាត់ខាងក្នុង", "បំពង់ Sensor ដាច់/លេច", "Sensor ខូច"],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "ពិនិត្យរូបវន្តថា DPF នៅដដែលឬអត់",
      "ពិនិត្យបំពង់ទាំងពីររកការដាច់/លេច",
      "ធៀបតម្លៃ Sensor នឹងស្តង់ដារ",
    ],
    commonMistakes: ["មិនដឹងថាម្ចាស់ចាស់បានដក DPF ចេញរួច"],
  },
  {
    code: "P244B",
    titleEn: "Diesel Particulate Filter Differential Pressure Too High",
    titleKm: "សម្ពាធខុសគ្នាឆ្លងកាត់ DPF ខ្ពស់ហួសកម្រិត",
    systems: ["engine", "exhaust"],
    severity: "high",
    commonOn: DPF_ERA,
    descriptionKm:
      "សម្ពាធមុខ DPF ខ្ពស់ជាងក្រោយច្រើនពេក — DPF ស្ទះខ្លាំង។ ធ្វើឲ្យ Backpressure ខ្ពស់ អស់កម្លាំង និងអាចធ្វើឲ្យ Turbo ខូច។",
    possibleCauses: ["DPF ស្ទះដោយ Soot ឬ Ash", "បំពង់ Sensor ដោតច្រឡំម្ខាង", "Sensor អានខុស"],
    inspectionFlow: [
      DPF_HEAT_WARNING,
      "អាន Soot Load និង Ash Load ដើម្បីញែកមូលហេតុ",
      "ពិនិត្យបំពង់ថាដោតត្រូវទីតាំង",
      "បើ Soot ខ្ពស់ — ធ្វើ Forced Regeneration ក្រោយរកមូលហេតុរួច",
      "បើ Ash ខ្ពស់ — សម្អាតដោយម៉ាស៊ីន ឬប្ដូរ",
    ],
    commonMistakes: ["ធ្វើ Forced Regeneration ខណៈជា Ash — ដុតមិនចេញទេ"],
  },

  /* ---------------------------- VGT actuator ---------------------------- */
  ...(
    [
      ["P2563", "Turbocharger Boost Control Position Sensor Circuit Range/Performance", "អានទីតាំង VGT Actuator មិនសមហេតុផល", "Vane ជាប់កាបូន ធ្វើឲ្យទីតាំងពិតមិនត្រូវនឹងការបញ្ជា"],
      ["P2564", "Turbocharger Boost Control Position Sensor Circuit Low", "សញ្ញាទីតាំង VGT Actuator ទាបខុសធម្មតា", "ខ្សែភ្លើង Short to Ground ឬ Sensor ខាងក្នុង Actuator ខូច"],
      ["P2565", "Turbocharger Boost Control Position Sensor Circuit High", "សញ្ញាទីតាំង VGT Actuator ខ្ពស់ខុសធម្មតា", "ខ្សែសញ្ញាដាច់ ឬ Short to Power"],
    ] as const
  ).map<DtcCode>(([code, titleEn, titleKm, mainCause]) => ({
    code,
    titleEn,
    titleKm,
    systems: ["engine"],
    severity: "medium",
    commonOn: PICKUP,
    descriptionKm: `VGT Actuator មាន Position Sensor ខាងក្នុង ដែលប្រាប់ ECU ថា Vane នៅទីតាំងណា។ ${mainCause}។`,
    possibleCauses: [
      mainCause,
      "Connector នៅ Actuator ច្រេះ/រលុងដោយកំដៅ",
      "Actuator ខូចខាងក្នុង",
    ],
    inspectionFlow: [
      "បញ្ជា Actuator ដោយ Scan Tool ហើយមើល Position Feedback ថាតាមឬអត់",
      "ពិនិត្យ Connector នៅ Actuator រកដានកំដៅ",
      "ពិនិត្យកាបូននៅ VGT Vane — ជាមូលហេតុញឹកញាប់បំផុត",
      "វាស់ Wiring ពី ECU ទៅ Actuator",
    ],
    commonMistakes: [
      "ប្ដូរ Actuator ថ្លៃខណៈគ្រាន់តែសម្អាតកាបូននៅ Vane ក៏គ្រប់គ្រាន់",
    ],
  })),

  /* ------------------------------ SCR / AdBlue ------------------------------ */
  {
    code: "P20EE",
    titleEn: "SCR NOx Catalyst Efficiency Below Threshold Bank 1",
    titleKm: "ប្រសិទ្ធភាព SCR Catalyst ទាបជាងកម្រិត",
    systems: ["engine", "exhaust"],
    severity: "medium",
    commonOn: "ជួបលើដីសែលទំនើបដែលប្រើ AdBlue (DEF)",
    descriptionKm:
      "SCR មិនកាត់បន្ថយ NOx បានតាមការរំពឹង។ ជាទូទៅមកពីគុណភាព AdBlue ឬការចាក់ AdBlue មិនគ្រប់ មិនមែន Catalyst ខូចទេ។",
    possibleCauses: [
      "AdBlue គុណភាពទាប ឬលាយទឹក",
      "Reductant Injector ស្ទះដោយគ្រីស្តាល់",
      "NOx Sensor អានខុស",
      "Dosing Pump ខ្សោយ",
      "SCR Catalyst ចាស់/ខូច",
    ],
    inspectionFlow: [
      "ពិនិត្យគុណភាព AdBlue ដោយ Refractometer (គួរ 32.5% Urea)",
      "អានតម្លៃ NOx Sensor មុខ និងក្រោយ SCR ធៀបគ្នា",
      "ពិនិត្យ Reductant Injector រកគ្រីស្តាល់ស",
      "ពិនិត្យ Dosing Pump Pressure",
    ],
    commonMistakes: [
      "បំពេញ AdBlue ដោយទឹក ឬវត្ថុរាវខុសប្រភេទ — បំផ្លាញប្រព័ន្ធទាំងមូល",
      "ប្ដូរ SCR Catalyst ថ្លៃដោយមិនពិនិត្យគុណភាព AdBlue ជាមុន",
    ],
  },
  {
    code: "P204F",
    titleEn: "Reductant System Performance Bank 1",
    titleKm: "ប្រព័ន្ធ AdBlue ដំណើរការមិនគ្រប់",
    systems: ["engine"],
    severity: "medium",
    commonOn: "ជួបលើដីសែលទំនើបដែលប្រើ AdBlue (DEF)",
    descriptionKm: "ECU រកឃើញថាការចាក់ AdBlue មិនដំណើរការតាមការរំពឹង។ បើមិនដោះស្រាយ ឡានអាចចូល Limp Mode ឬចាប់ផ្ដើមមិនចេញ។",
    possibleCauses: [
      "Reductant Injector ស្ទះដោយគ្រីស្តាល់",
      "Dosing Pump ខ្សោយ/ខូច",
      "បំពង់ AdBlue ស្ទះ ឬកក",
      "Level Sensor ក្នុងធុងអានខុស",
    ],
    inspectionFlow: [
      "ពិនិត្យកម្រិត និងគុណភាព AdBlue ជាមុនសិន",
      "អាន Dosing Pressure ក្នុង Live Data",
      "ដក Reductant Injector ចេញ ពិនិត្យគ្រីស្តាល់ស",
      "ពិនិត្យបំពង់ និង Heater របស់បំពង់",
    ],
    commonMistakes: ["សម្អាតគ្រីស្តាល់ចេញដោយមិនរកមូលហេតុថាហេតុអ្វីវាកកើត"],
  },
  {
    code: "P2048",
    titleEn: "Reductant Injector Circuit Low Bank 1",
    titleKm: "សៀគ្វី Reductant Injector មានវ៉ុលទាប",
    systems: ["engine", "fuel"],
    severity: "medium",
    commonOn: "ជួបលើដីសែលទំនើបដែលប្រើ AdBlue (DEF)",
    descriptionKm: "វ៉ុលក្នុងសៀគ្វី Reductant Injector ទាបជាងធម្មតា — ជាទូទៅខ្សែ Short to Ground ឬ Injector ខូច។",
    possibleCauses: ["ខ្សែភ្លើង Short to Ground", "Reductant Injector ខូច", "Connector ច្រេះដោយ AdBlue លេច"],
    inspectionFlow: [
      "វាស់ Resistance របស់ Reductant Injector ធៀបនឹងស្តង់ដារ",
      "ពិនិត្យ Connector រកគ្រីស្តាល់ស និងការច្រេះ",
      "វាស់ Wiring រក Short to Ground",
    ],
    commonMistakes: ["មិនពិនិត្យ Connector ដែលច្រេះដោយ AdBlue លេច"],
  },
  {
    code: "P2049",
    titleEn: "Reductant Injector Circuit High Bank 1",
    titleKm: "សៀគ្វី Reductant Injector មានវ៉ុលខ្ពស់",
    systems: ["engine", "fuel"],
    severity: "medium",
    commonOn: "ជួបលើដីសែលទំនើបដែលប្រើ AdBlue (DEF)",
    descriptionKm: "វ៉ុលក្នុងសៀគ្វី Reductant Injector ខ្ពស់ជាងធម្មតា — ជាទូទៅខ្សែដាច់ ឬ Short to Power។",
    possibleCauses: ["ខ្សែសញ្ញាដាច់", "Short to Power", "Reductant Injector ដាច់ខាងក្នុង"],
    inspectionFlow: [
      "វាស់ Resistance របស់ Injector — ដាច់ឬអត់",
      "ពិនិត្យ Wiring រកការដាច់",
      "ពិនិត្យ Ground",
    ],
    commonMistakes: ["ប្ដូរ Injector ដោយមិនវាស់ Wiring ជាមុន"],
  },
  {
    code: "P2201",
    titleEn: "NOx Sensor Circuit Range/Performance Bank 1",
    titleKm: "NOx Sensor អានតម្លៃមិនសមហេតុផល",
    systems: ["engine"],
    severity: "medium",
    commonOn: "ជួបលើដីសែលទំនើបដែលមាន SCR",
    descriptionKm: "តម្លៃ NOx Sensor នៅក្នុងជួរអគ្គិសនីធម្មតា តែមិនសមហេតុផលនឹងស្ថានភាពម៉ាស៊ីន។ NOx Sensor ជាគ្រឿងថ្លៃ ដូច្នេះត្រូវបញ្ជាក់ឲ្យច្បាស់មុនប្ដូរ។",
    possibleCauses: ["NOx Sensor ចាស់/ស្មោក", "Exhaust Leak មុន Sensor", "SCR មិនដំណើរការ", "Wiring"],
    inspectionFlow: [
      "ធៀបតម្លៃ NOx Sensor មុខ និងក្រោយ SCR",
      "ពិនិត្យ Exhaust Leak មុន Sensor",
      "ពិនិត្យប្រព័ន្ធ AdBlue មុនសន្និដ្ឋានថា Sensor ខូច",
    ],
    commonMistakes: ["ប្ដូរ NOx Sensor ថ្លៃខណៈបញ្ហាពិតនៅប្រព័ន្ធ AdBlue"],
  },
  {
    code: "P2202",
    titleEn: "NOx Sensor Circuit Low Bank 1",
    titleKm: "សញ្ញា NOx Sensor ទាបខុសធម្មតា",
    systems: ["engine"],
    severity: "medium",
    commonOn: "ជួបលើដីសែលទំនើបដែលមាន SCR",
    descriptionKm: "វ៉ុលសញ្ញាពី NOx Sensor ទាបជាងជួរធម្មតា។",
    possibleCauses: ["ខ្សែភ្លើង Short to Ground", "NOx Sensor ខូច", "Connector រលុង"],
    inspectionFlow: [
      "វាស់វ៉ុលសញ្ញានៅ Connector",
      "ពិនិត្យ Wiring រក Short to Ground",
      "រង្កោលខ្សែពេលមើល Live Data រក Intermittent",
    ],
    commonMistakes: ["មិនពិនិត្យ Wiring មុនប្ដូរ Sensor ថ្លៃ"],
  },
  {
    code: "P2BAC",
    titleEn: "NOx Exceedance - Deviation of SCR System",
    titleKm: "NOx លើសកម្រិតច្បាប់ — ប្រព័ន្ធ SCR មានបញ្ហា",
    systems: ["engine"],
    severity: "high",
    commonOn: "ជួបលើដីសែលទំនើបដែលប្រើ AdBlue (DEF)",
    descriptionKm:
      "ECU សន្និដ្ឋានថា NOx ចេញលើសកម្រិតច្បាប់ដោយសារប្រព័ន្ធ SCR ខូច។ ឡានជាច្រើននឹងចាប់ផ្ដើមរាប់ថយក្រោយ រួចកំណត់ល្បឿន ឬមិនឲ្យចាប់ផ្ដើមឡើងវិញ។",
    possibleCauses: [
      "AdBlue អស់ ឬគុណភាពទាប",
      "Reductant Injector ស្ទះ",
      "NOx Sensor ខូច",
      "SCR Catalyst ខូច",
    ],
    inspectionFlow: [
      "ពិនិត្យកម្រិត និងគុណភាព AdBlue ជាមុនសិន",
      "អានចំនួនដងចាប់ផ្ដើមដែលនៅសល់ (Inducement Countdown)",
      "ពិនិត្យ Reductant Injector និង NOx Sensor",
      "ដោះស្រាយឲ្យរួច រួចលុបកូដតាមនីតិវិធីរបស់ម៉ាក",
    ],
    commonMistakes: [
      "រំលងកូដនេះ — ឡាននឹងមិនចាប់ផ្ដើមក្រោយពេលរាប់ថយក្រោយអស់",
    ],
  },

  /* ------------------- Direct injection pressure control ------------------- */
  {
    code: "P228C",
    titleEn: "Fuel Pressure Regulator 1 Exceeded Control Limits - Pressure Too Low",
    titleKm: "Fuel Pressure Regulator មិនអាចរក្សាសម្ពាធ — ទាបហួសកម្រិត",
    systems: ["engine", "fuel"],
    severity: "high",
    commonOn: PICKUP,
    descriptionKm:
      "ECU បញ្ជា Regulator/SCV ឲ្យបង្កើនសម្ពាធ តែសម្ពាធពិតនៅតែទាប។ ខុសពី P0087 ត្រង់ថាកូដនេះបញ្ជាក់ថាការបញ្ជាបានឈានដល់ដែនកំណត់រួចហើយ។",
    possibleCauses: [
      "High Pressure Pump សឹក",
      "Fuel Filter ស្ទះ ឬ Low Pressure Side ខ្សោយ",
      "Injector Return leak ច្រើន",
      "SCV/Regulator ខូច",
    ],
    inspectionFlow: [
      RAIL_WARNING,
      "អាន Desired Rail Pressure ធៀបនឹង Actual Rail Pressure",
      "ធ្វើ Return-Volume Test លើ Injector នីមួយៗ",
      "ពិនិត្យ Fuel Filter និង Low Pressure Side",
      "ពិនិត្យ Activation SCV",
    ],
    commonMistakes: ["ប្ដូរ High Pressure Pump ថ្លៃដោយមិនធ្វើ Return-Volume Test ជាមុន"],
  },
  {
    code: "P228D",
    titleEn: "Fuel Pressure Regulator 1 Exceeded Control Limits - Pressure Too High",
    titleKm: "Fuel Pressure Regulator មិនអាចរក្សាសម្ពាធ — ខ្ពស់ហួសកម្រិត",
    systems: ["engine", "fuel"],
    severity: "high",
    commonOn: PICKUP,
    descriptionKm:
      "សម្ពាធ Rail ខ្ពស់ជាងគោលដៅ ទោះ ECU ព្យាយាមបន្ថយ។ គ្រោះថ្នាក់ដល់ Injector និង Pump។",
    possibleCauses: ["SCV/Regulator ជាប់បិទ", "Return Line ស្ទះ", "Wiring SCV Short", "Rail Pressure Sensor អានខុស"],
    inspectionFlow: [
      RAIL_WARNING,
      "អាន Desired ធៀបនឹង Actual Rail Pressure",
      "ពិនិត្យ Return Line រកការស្ទះ",
      "វាស់ Resistance និង Wiring របស់ SCV",
    ],
    commonMistakes: ["មិនពិនិត្យ Return Line ស្ទះ ស្មានតែ Regulator ខូច"],
  },
];
