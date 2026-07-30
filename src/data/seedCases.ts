import type { RepairCase } from "@/types";

/**
 * Seed repair cases loaded on first run so the Case Library isn't empty.
 * After first load they live in localStorage and the tech owns them.
 */
export const SEED_CASES: RepairCase[] = [
  {
    id: "seed-1",
    createdAt: Date.parse("2026-05-12"),
    updatedAt: Date.parse("2026-05-12"),
    vehicle: {
      brand: "Toyota",
      model: "Vios",
      year: 2018,
      engine: "2NR-FE 1.5L",
      transmission: "CVT",
      mileageKm: 96000,
    },
    system: "engine",
    symptomText:
      "ម៉ាស៊ីនញ័រពេលទំនេរ ភ្លើង Check Engine ភ្លឺ ខ្សោយកម្លាំងពេលឡើងចម្រៀង។",
    dtcCodes: ["P0301"],
    rootCause: "Ignition coil ស៊ីឡាំង ១ ខ្សោយ (បញ្ជាក់ដោយ swap test)។",
    repairPerformed: "ប្ដូរ ignition coil ស៊ីឡាំង ១ និង spark plug ទាំង ៤។",
    partsReplaced: ["Ignition coil x1", "Spark plug x4 (Iridium)"],
    technicianNote:
      "Swap coil 1→2 misfire ផ្លាស់ទៅ 2 ភ្លាម បញ្ជាក់ coil ខូច។ កុំភ្លេចអាន freeze frame មុន។",
    photos: [],
    tags: ["misfire", "coil", "vios"],
  },
  {
    id: "seed-2",
    createdAt: Date.parse("2026-06-02"),
    updatedAt: Date.parse("2026-06-02"),
    vehicle: {
      brand: "Ford",
      model: "Ranger",
      year: 2019,
      engine: "2.0L Bi-Turbo",
      transmission: "AT",
      mileageKm: 145000,
    },
    system: "engine",
    symptomText: "ចេញផ្សែងខ្មៅ ខ្សោយកម្លាំង ភ្លើង engine ភ្លឺ។",
    dtcCodes: ["P0171"],
    rootCause: "Intake boot ប្រេះ បណ្ដាល vacuum leak → lean។",
    repairPerformed: "ប្ដូរ intake boot សម្អាត MAF sensor។",
    partsReplaced: ["Intake boot", "MAF cleaner"],
    technicianNote:
      "Smoke test ឃើញ leak ភ្លាម។ LTFT +18% ត្រឡប់ធម្មតាក្រោយជួសជុល។",
    photos: [],
    tags: ["lean", "vacuum leak", "ranger"],
  },
  {
    id: "seed-3",
    createdAt: Date.parse("2026-06-20"),
    updatedAt: Date.parse("2026-06-20"),
    vehicle: {
      brand: "Toyota",
      model: "Prius",
      year: 2015,
      engine: "2ZR-FXE 1.8L",
      transmission: "EV",
      mileageKm: 210000,
    },
    system: "hybrid",
    symptomText: "ភ្លើងត្រីកោណក្រហមភ្លឺ សម្ថភាពថយ ម៉ាស៊ីនដើរញឹក។",
    dtcCodes: ["P0A80"],
    rootCause: "Block ខ្សោយ ២ ក្នុង HV battery (block voltage ខុសគ្នាច្រើន)។",
    repairPerformed:
      "ISOLATE HV ដក service plug → ប្ដូរ module ខ្សោយ → balance → សម្អាត cooling fan។",
    partsReplaced: ["HV battery module x2", "Cooling fan filter"],
    technicianNote:
      "⚠️ ស្លៀក glove class 0 ជានិច្ច។ សម្អាត cooling fan ជៀសវាងខូចម្តងទៀត។",
    photos: [],
    tags: ["hybrid", "hv battery", "prius", "P0A80"],
  },
];
