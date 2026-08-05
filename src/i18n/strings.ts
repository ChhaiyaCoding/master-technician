/**
 * Khmer-first string catalog. English technical terms are kept inline where
 * they are the professional norm (DTC, ABS, OBD, scan tool, etc.).
 *
 * Centralised so a full i18n library can be dropped in later if English UI
 * is ever needed. For now the app renders Khmer directly.
 */
export const t = {
  appName: "Master Technician",
  appTagline: "ជំនួយការវិនិច្ឆ័យសម្រាប់ជាងអាជីព",

  nav: {
    home: "ទំព័រដើម",
    dtc: "DTC",
    cases: "ករណី",
    expert: "អ្នកជំនាញ",
    sessions: "សម័យ",
    settings: "ការកំណត់",
  },

  home: {
    greeting: "សួស្តី ជាង",
    subtitle: "តើថ្ងៃនេះមានបញ្ហាអ្វី?",
    diagnose: "AI វិនិច្ឆ័យបញ្ហា",
    diagnoseSub: "AI Diagnose Problem",
    dtc: "ស្វែងរកកូដ DTC",
    dtcSub: "Search DTC Code",
    cases: "បណ្ណាល័យករណីជួសជុល",
    casesSub: "Repair Case Library",
    photo: "វិនិច្ឆ័យតាមរូបភាព",
    photoSub: "Photo Diagnosis",
    expert: "សួរអ្នកជំនាញ",
    expertSub: "Ask Expert",
    recentCases: "ករណីថ្មីៗ",
    noRecent: "មិនទាន់មានករណីរក្សាទុក",
  },

  vehicle: {
    title: "ជ្រើសរើសរថយន្ត",
    brand: "ម៉ាក (Brand)",
    model: "ម៉ូដែល (Model)",
    year: "ឆ្នាំ (Year)",
    engine: "ម៉ាស៊ីន (Engine)",
    transmission: "ប្រអប់លេខ (Transmission)",
    mileage: "ចម្ងាយប្រើ (Mileage km)",
    brandPh: "ជ្រើស ឬ វាយម៉ាក",
    modelPh: "ឧ. Vios, CR-V, Ranger",
    enginePh: "ឧ. 2NR-FE, 1.5L Turbo",
    mileagePh: "ឧ. 120000",
    continue: "បន្ត",
    selectTransmission: "ជ្រើសប្រអប់លេខ",
  },

  symptom: {
    title: "បញ្ចូលរោគសញ្ញា",
    system: "ជ្រើសប្រព័ន្ធ (System)",
    describe: "ពិពណ៌នាបញ្ហា",
    describePh:
      "ឧ. ម៉ាស៊ីនញ័រពេលទំនេរ ភ្លើង Check Engine ភ្លឺ ចេញផ្សែងខ្មៅ...",
    dtc: "បន្ថែមកូដ DTC",
    dtcPh: "ឧ. P0301",
    addDtc: "បន្ថែម",
    photo: "បន្ថែមរូបភាព",
    scan: "របាយការណ៍ Scan Tool",
    scanPh: "បិទភ្ជាប់ទិន្នន័យ live data / freeze frame ពី scan tool...",
    analyze: "វិនិច្ឆ័យឥឡូវ",
    addPhoto: "ថតរូប / ជ្រើសរូប",
    selectSystemFirst: "សូមជ្រើសប្រព័ន្ធជាមុនសិន",
  },

  result: {
    title: "លទ្ធផលវិនិច្ឆ័យ",
    analyzing: "កំពុងវិភាគ...",
    possibleCauses: "មូលហេតុដែលអាចកើតមាន",
    rankedBy: "តម្រៀបតាមលទ្ធភាព",
    inspectionSteps: "ជំហានត្រួតពិនិត្យ",
    toolsNeeded: "ឧបករណ៍ត្រូវការ",
    recommendedRepair: "ការជួសជុលដែលណែនាំ",
    safetyNotes: "ចំណាំសុវត្ថិភាព",
    saveCase: "រក្សាទុកជាករណីជួសជុល",
    saved: "បានរក្សាទុក ✓",
    high: "ខ្ពស់",
    medium: "មធ្យម",
    low: "ទាប",
    disclaimer:
      "លទ្ធផលនេះជាការណែនាំបឋម។ សូមផ្ទៀងផ្ទាត់ជាមួយការវាស់ជាក់ស្តែងជានិច្ច។",
  },

  dtc: {
    title: "ស្វែងរកកូដ DTC",
    placeholder: "វាយកូដ ឧ. P0300, C1201, B1318, U0100",
    meaning: "អត្ថន័យ",
    commonOn: "ជាទូទៅជួបលើ",
    relatedSystems: "ប្រព័ន្ធពាក់ព័ន្ធ",
    possibleCauses: "មូលហេតុដែលអាចកើតមាន",
    inspectionFlow: "លំដាប់ត្រួតពិនិត្យ",
    commonMistakes: "កំហុសញឹកញាប់",
    notFound: "រកមិនឃើញកូដនេះក្នុងទិន្នន័យ",
    notFoundHint: "ព្យាយាមកូដ OBD-II ស្តង់ដារ ឬ សួរអ្នកជំនាញ",
    useInDiagnosis: "ប្រើក្នុងការវិនិច្ឆ័យ",
    severity: "កម្រិត",
    popular: "កូដពេញនិយម",
  },

  cases: {
    title: "បណ្ណាល័យករណីជួសជុល",
    search: "ស្វែងរក ម៉ាក ម៉ូដែល DTC រោគសញ្ញា...",
    empty: "មិនទាន់មានករណី — រក្សាទុកករណីដំបូងរបស់អ្នក",
    similar: "ករណីស្រដៀងគ្នា",
    rootCause: "មូលហេតុ",
    repair: "ការជួសជុល",
    parts: "គ្រឿងបន្លាស់",
    note: "កំណត់ចំណាំ",
    newCase: "ករណីថ្មី",
    delete: "លុប",
    confirmDelete: "លុបករណីនេះមែនទេ?",
    resultsCount: (n: number) => ` រកឃើញ ${n} ករណី`,
  },

  expert: {
    title: "សួរអ្នកជំនាញ",
    placeholder: "សរសេរសំណួរ ឬ ពិពណ៌នាបញ្ហា...",
    send: "ផ្ញើ",
    thinking: "អ្នកជំនាញកំពុងគិត...",
    intro:
      "ខ្ញុំជាជំនួយការវិនិច្ឆ័យ។ ប្រាប់ខ្ញុំពីរថយន្ត និងរោគសញ្ញា ខ្ញុំនឹងសួរបន្ថែម ដើម្បីរកមូលហេតុ។",
    followUp: "សំណួរបន្ថែម",
    quickStart: "ចាប់ផ្តើមរហ័ស",
  },

  photo: {
    title: "វិនិច្ឆ័យតាមរូបភាព",
    intro: "ថតរូបផ្នែកខូច ភ្លើងព្រមាន ឬ live data ដើម្បីវិភាគ",
    add: "បន្ថែមរូបភាព",
    analyze: "វិភាគរូបភាព",
    result: "លទ្ធផលវិភាគរូបភាព",
    empty: "សូមបន្ថែមរូបភាពជាមុនសិន",
    notePh: "កំណត់ចំណាំសម្រាប់រូបភាពនេះ...",
  },

  settings: {
    title: "ការកំណត់",
    theme: "រូបរាង",
    light: "ភ្លឺ",
    dark: "ងងឹត",
    system: "តាមប្រព័ន្ធ",
    about: "អំពី",
    aboutText:
      "Master Technician — កម្មវិធីជំនួយវិនិច្ឆ័យសម្រាប់ជាងម៉ាស៊ីនរថយន្តអាជីព។ ការវិភាគដំណើរការ offline 100% លើទិន្នន័យ DTC ដែលរក្សាទុកក្នុងទូរស័ព្ទ។",
    dataMgmt: "ទិន្នន័យ",
    clearCases: "សម្អាតករណីទាំងអស់",
    version: "កំណែ 0.1.0",
  },

  common: {
    back: "ត្រឡប់",
    cancel: "បោះបង់",
    save: "រក្សាទុក",
    edit: "កែ",
    delete: "លុប",
    done: "រួចរាល់",
    optional: "(ស្រេចចិត្ត)",
    required: "ត្រូវការ",
    none: "គ្មាន",
    km: "គ.ម",
  },
};

export type Strings = typeof t;
