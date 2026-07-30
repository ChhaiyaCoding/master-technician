import type { DtcCode } from "@/types";

/**
 * Dummy DTC knowledge base. A real deployment would back this with a proper
 * DTC database / API; the shape here matches DtcCode so the swap is invisible
 * to the UI. Codes chosen to cover P (powertrain), C (chassis), B (body),
 * U (network) prefixes across several systems.
 */
export const DTC_CODES: DtcCode[] = [
  {
    code: "P0300",
    titleEn: "Random / Multiple Cylinder Misfire Detected",
    titleKm: "ស៊ីឡាំងជាច្រើនបាញ់ភ្លើងខុសចង្វាក់ (Misfire)",
    systems: ["engine"],
    severity: "high",
    descriptionKm:
      "ECU រកឃើញការបាញ់ភ្លើងខុសចង្វាក់លើស៊ីឡាំងច្រើន។ អាចធ្វើឲ្យម៉ាស៊ីនញ័រ ខ្សោយកម្លាំង និងខូច catalytic converter។",
    possibleCauses: [
      "Spark plug ចាស់ ឬ gap ខុស",
      "Ignition coil ខ្សោយ ឬ ខូច",
      "ខ្យល់លេចចូល (vacuum leak)",
      "សម្ពាធប្រេងអាំងស៊ុងទាប / fuel pump ខ្សោយ",
      "Injector ស្ទះ ឬ លេច",
      "Compression ទាប (valve / piston ring)",
    ],
    inspectionFlow: [
      "អាន freeze frame — កត់ RPM, load, coolant temp ពេលកើត fault",
      "ពិនិត្យ misfire counter ក្នុង live data រកស៊ីឡាំងណាខ្លាំង",
      "ពិនិត្យ spark plug និង coil (swap test រវាងស៊ីឡាំង)",
      "ត្រួត fuel pressure និង injector balance",
      "វាស់ compression / leak-down បើនៅតែ misfire",
    ],
    commonMistakes: [
      "ប្ដូរ plug/coil ទាំងអស់ដោយមិនធ្វើ swap test",
      "មិនពិនិត្យ vacuum leak មុនប្ដូរគ្រឿង",
      "មិនអាន freeze frame — បាត់ព័ត៌មានពេលកើតបញ្ហា",
    ],
  },
  {
    code: "P0301",
    titleEn: "Cylinder 1 Misfire Detected",
    titleKm: "ស៊ីឡាំងទី ១ បាញ់ភ្លើងខុសចង្វាក់",
    systems: ["engine"],
    severity: "high",
    descriptionKm:
      "ការបាញ់ភ្លើងខុសចង្វាក់ជាក់លាក់លើស៊ីឡាំងទី ១។ ផ្តោតការត្រួតពិនិត្យលើស៊ីឡាំងនោះ។",
    possibleCauses: [
      "Spark plug ស៊ីឡាំង ១ ខូច",
      "Ignition coil ស៊ីឡាំង ១ ខូច",
      "Injector ស៊ីឡាំង ១ ស្ទះ/លេច",
      "Compression ស៊ីឡាំង ១ ទាប",
      "ខ្សែ coil / connector រលុង",
    ],
    inspectionFlow: [
      "Swap coil ស៊ីឡាំង ១ ទៅ ២ — មើល misfire ផ្លាស់ទីតាមទេ",
      "Swap plug ដូចគ្នា",
      "ពិនិត្យ injector (resistance / activation)",
      "វាស់ compression ស៊ីឡាំង ១",
    ],
    commonMistakes: [
      "មិន swap test — ចំណាយលើគ្រឿងខុស",
      "មិនពិនិត្យ connector coil",
    ],
  },
  {
    code: "P0171",
    titleEn: "System Too Lean (Bank 1)",
    titleKm: "ល្បាយស្តើងពេក (Lean) Bank 1",
    systems: ["engine"],
    severity: "medium",
    descriptionKm:
      "ECU បន្ថែមប្រេងច្រើន (fuel trim ខ្ពស់) ព្រោះ sensor រកឃើញខ្យល់ច្រើនជាងប្រេង។ ភាគច្រើនមកពី vacuum leak ឬ MAF ស្មោក។",
    possibleCauses: [
      "Vacuum / intake leak",
      "MAF sensor ស្មោក ឬ ខុស",
      "Fuel pressure ទាប (pump/filter/regulator)",
      "Injector ស្ទះ",
      "Exhaust leak មុន O2 sensor",
    ],
    inspectionFlow: [
      "អាន short/long term fuel trim (STFT/LTFT)",
      "Smoke test intake រក vacuum leak",
      "សម្អាត / ពិនិត្យ MAF sensor",
      "វាស់ fuel pressure",
    ],
    commonMistakes: [
      "ប្ដូរ O2 sensor មុនរក leak",
      "មិនធ្វើ smoke test",
    ],
  },
  {
    code: "P0420",
    titleEn: "Catalyst System Efficiency Below Threshold (Bank 1)",
    titleKm: "ប្រសិទ្ធភាព Catalytic Converter ទាប Bank 1",
    systems: ["engine"],
    severity: "medium",
    descriptionKm:
      "O2 sensor ខាងក្រោយ catalyst ចាប់សញ្ញាដូចខាងមុខ — បង្ហាញថា catalyst មិនច្បាស់លាស់ ឬ មាន exhaust leak / sensor ខូច។",
    possibleCauses: [
      "Catalytic converter ចាស់ / ខូច",
      "O2 / A/F sensor ខូច",
      "Exhaust leak",
      "Misfire ឬ oil burning បណ្ដាលឲ្យ cat ខូច",
    ],
    inspectionFlow: [
      "ប្រៀបធៀប waveform O2 មុន និង ក្រោយ cat",
      "ពិនិត្យ exhaust leak",
      "ដោះស្រាយ misfire/oil consumption ជាមុន",
    ],
    commonMistakes: [
      "ប្ដូរ cat ថ្មីទាំងដែលមាន misfire — cat ថ្មីនឹងខូចវិញ",
    ],
  },
  {
    code: "P0128",
    titleEn: "Coolant Thermostat Below Regulating Temperature",
    titleKm: "Thermostat បើកលឿនពេក / ម៉ាស៊ីនមិនក្តៅគ្រប់",
    systems: ["engine"],
    severity: "low",
    descriptionKm:
      "សីតុណ្ហភាព coolant មិនឡើងដល់កម្រិតក្នុងរយៈពេលកំណត់។ ភាគច្រើន thermostat ជាប់បើក។",
    possibleCauses: [
      "Thermostat ជាប់បើក",
      "Coolant temp sensor ខុស",
      "កម្រិត coolant ទាប",
    ],
    inspectionFlow: [
      "តាមដាន coolant temp ក្នុង live data",
      "ពិនិត្យការបើក/បិទ thermostat",
    ],
    commonMistakes: ["ប្ដូរ sensor ដោយមិនពិនិត្យ thermostat"],
  },
  {
    code: "P0700",
    titleEn: "Transmission Control System Malfunction",
    titleKm: "ប្រព័ន្ធគ្រប់គ្រងប្រអប់លេខមានបញ្ហា",
    systems: ["transmission"],
    severity: "high",
    descriptionKm:
      "កូដទូទៅ — TCM ជូនដំណឹងថាមាន fault។ ត្រូវអាន sub-code ក្នុង TCM ដើម្បីដឹងច្បាស់។",
    possibleCauses: [
      "Solenoid ក្នុងប្រអប់លេខ",
      "Transmission fluid ចាស់ / កម្រិតទាប",
      "Speed sensor",
      "ខ្សែ wiring / connector TCM",
    ],
    inspectionFlow: [
      "អាន TCM sub-codes (មិនមែនត្រឹម P0700)",
      "ពិនិត្យ ATF កម្រិត និង គុណភាព",
      "ត្រួត live data — gear ratio, slip",
    ],
    commonMistakes: [
      "ព្យាយាមជួសជុលត្រឹម P0700 ដោយមិនអាន sub-code",
    ],
  },
  {
    code: "C1201",
    titleEn: "Engine Control System Malfunction (ABS/VSC)",
    titleKm: "ABS/VSC ភ្ជាប់ជាមួយ fault ម៉ាស៊ីន",
    systems: ["abs", "brake"],
    severity: "medium",
    descriptionKm:
      "ABS/VSC ECU រកឃើញ fault ដែលទាក់ទងនឹងម៉ាស៊ីន (engine DTC មាន)។ ដោះស្រាយ engine DTC ជាមុន។",
    possibleCauses: [
      "មាន engine DTC ផ្សេង (ដោះស្រាយមុន)",
      "Wheel speed sensor",
      "ABS actuator / pump",
    ],
    inspectionFlow: [
      "អាន engine DTC ជាមុន — ជួសជុលវាមុន",
      "លុបកូដ រួចសាកល្បងម្តងទៀត",
      "ពិនិត្យ wheel speed sensor waveform",
    ],
    commonMistakes: ["ផ្តោត ABS ដោយមិនដោះស្រាយ engine DTC ដែលជាដើមហេតុ"],
  },
  {
    code: "C1241",
    titleEn: "Low Battery Positive Voltage (ABS)",
    titleKm: "តង់ស្យុងទាបចូល ABS",
    systems: ["abs", "electrical"],
    severity: "medium",
    descriptionKm:
      "ABS ECU ទទួលតង់ស្យុងទាបពេក។ ភាគច្រើនមកពី battery/charging ខ្សោយ ឬ ground អន់។",
    possibleCauses: [
      "Battery ខ្សោយ",
      "Alternator / charging ខ្សោយ",
      "Ground point ច្រេះ / រលុង",
      "ខ្សែ power ទៅ ABS រលុង",
    ],
    inspectionFlow: [
      "វាស់ battery voltage និង charging (13.5–14.7V)",
      "ពិនិត្យ ground point ABS",
      "Voltage drop test ខ្សែ power",
    ],
    commonMistakes: ["ប្ដូរ ABS module ដោយបញ្ហាពិតជា charging"],
  },
  {
    code: "B1318",
    titleEn: "Battery Voltage Low (Body Control)",
    titleKm: "តង់ស្យុងទាប (Body Control Module)",
    systems: ["body", "electrical"],
    severity: "low",
    descriptionKm:
      "BCM ចាប់តង់ស្យុងទាប។ ជាញឹកញាប់កើតពេល cranking ខ្សោយ ឬ battery ចាស់។",
    possibleCauses: ["Battery ចាស់", "Charging ខ្សោយ", "Parasitic draw"],
    inspectionFlow: [
      "Load test battery",
      "វាស់ parasitic draw (<50mA ធម្មតា)",
      "ពិនិត្យ charging",
    ],
    commonMistakes: ["មិន load test battery"],
  },
  {
    code: "U0100",
    titleEn: "Lost Communication With ECM/PCM",
    titleKm: "បាត់ការទំនាក់ទំនងជាមួយ ECM/PCM (CAN bus)",
    systems: ["electrical", "engine"],
    severity: "high",
    descriptionKm:
      "Module ផ្សេងបាត់ការទំនាក់ទំនងជាមួយ ECM តាម CAN bus។ អាចមកពី wiring, power/ground ECM ឬ module ខូច។",
    possibleCauses: [
      "CAN bus wiring ដាច់ / short",
      "Power ឬ ground ECM បាត់",
      "ECM ខូច",
      "Connector ច្រេះ",
    ],
    inspectionFlow: [
      "ពិនិត្យ power និង ground ECM",
      "វាស់ CAN High/Low resistance (~60Ω)",
      "ស្កេនរក module ណាដែល offline",
    ],
    commonMistakes: [
      "ប្ដូរ ECM មុនពិនិត្យ power/ground/wiring",
    ],
  },
  {
    code: "P0A80",
    titleEn: "Replace Hybrid/EV Battery Pack",
    titleKm: "ត្រូវផ្លាស់ថ្ម Hybrid/EV (Pack degraded)",
    systems: ["hybrid", "ev"],
    severity: "critical",
    descriptionKm:
      "HV battery ECU រកឃើញ block មិនស្មើគ្នា (weak cell)។ ⚠️ ប្រព័ន្ធតង់ស្យុងខ្ពស់ — ត្រូវ isolate មុនធ្វើការ។",
    possibleCauses: [
      "Weak cell / block ក្នុង HV battery",
      "Cooling fan HV battery ស្ទះ",
      "Battery ECU / sensor",
    ],
    inspectionFlow: [
      "⚠️ ISOLATE HV — ដក service plug ស្លៀក glove class 0",
      "អាន block voltages — រក block ខ្សោយ",
      "ពិនិត្យ cooling fan / filter HV battery",
    ],
    commonMistakes: [
      "ធ្វើការលើ HV ដោយមិន isolate — គ្រោះថ្នាក់ដល់អាយុជីវិត",
      "ប្ដូរ pack ទាំងមូលទាំង block តែមួយខ្សោយ",
    ],
  },
  {
    code: "B0100",
    titleEn: "Airbag / SRS — Electronic Front Sensor Malfunction",
    titleKm: "SRS — Sensor ថង់ខ្យល់ខាងមុខមានបញ្ហា",
    systems: ["airbag"],
    severity: "critical",
    descriptionKm:
      "⚠️ ប្រព័ន្ធ SRS — ការធ្វើការខុសអាចធ្វើឲ្យ airbag បាញ់ ឬ មិនបាញ់ពេលគ្រោះថ្នាក់។ ដក battery រង់ចាំ discharge មុនធ្វើការ។",
    possibleCauses: [
      "Front impact sensor ខូច",
      "Connector / wiring SRS",
      "Clock spring (បើពាក់ព័ន្ធ steering)",
    ],
    inspectionFlow: [
      "⚠️ ដក battery រង់ចាំ ≥ 3 នាទី មុនធ្វើការ SRS",
      "ពិនិត្យ connector sensor (yellow SRS)",
      "អាន SRS DTC ដោយ scan tool ត្រឹមត្រូវ",
    ],
    commonMistakes: [
      "ធ្វើការ SRS ដោយមិនដក battery — ហានិភ័យ airbag បាញ់",
      "ប្រើ multimeter ផ្ទាល់លើ squib circuit",
    ],
  },
];

export const DTC_BY_CODE = Object.fromEntries(
  DTC_CODES.map((d) => [d.code.toUpperCase(), d]),
) as Record<string, DtcCode>;

/** Popular codes surfaced on the empty DTC search screen. */
export const POPULAR_DTC = ["P0300", "P0171", "P0420", "P0700", "U0100", "P0A80"];
