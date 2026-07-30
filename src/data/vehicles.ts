import type { TransmissionType } from "@/types";

/**
 * Reference data for vehicle selection. Curated toward the Cambodian market
 * (Toyota, Lexus, Honda, Ford, Hyundai, Kia are common). Free-text entry is
 * always allowed, so this list only needs to cover the frequent picks.
 */
export interface BrandData {
  name: string;
  models: string[];
  /** Common engine codes / displacements for quick pick. */
  engines: string[];
}

export const BRANDS: BrandData[] = [
  {
    name: "Toyota",
    models: [
      "Vios",
      "Corolla",
      "Camry",
      "Hilux",
      "Fortuner",
      "Land Cruiser",
      "Prius",
      "RAV4",
      "Highlander",
      "Alphard",
    ],
    engines: ["2NR-FE 1.5L", "1NZ-FE 1.5L", "2AR-FE 2.5L", "1GD-FTV 2.8D", "2GR-FE 3.5L"],
  },
  {
    name: "Lexus",
    models: ["RX", "NX", "ES", "LX", "GX", "IS", "UX"],
    engines: ["2GR-FKS 3.5L", "8AR-FTS 2.0T", "A25A-FKS 2.5L", "3UR-FE 5.7L"],
  },
  {
    name: "Honda",
    models: ["Civic", "Accord", "CR-V", "City", "HR-V", "Jazz", "Odyssey", "Pilot"],
    engines: ["R18A 1.8L", "K24 2.4L", "L15B 1.5T", "Earth Dreams 1.5T"],
  },
  {
    name: "Ford",
    models: ["Ranger", "Everest", "Raptor", "Territory", "Escape", "EcoSport"],
    engines: ["2.0L Bi-Turbo", "3.2L Duratorq", "2.3L EcoBoost", "1.5L EcoBoost"],
  },
  {
    name: "Hyundai",
    models: ["Accent", "Elantra", "Tucson", "Santa Fe", "Kona", "Sonata", "Starex"],
    engines: ["Gamma 1.6L", "Nu 2.0L", "Smartstream 1.6T", "R 2.2 CRDi"],
  },
  {
    name: "Kia",
    models: ["Rio", "Cerato", "Sportage", "Sorento", "Seltos", "Carnival"],
    engines: ["Gamma 1.6L", "Nu 2.0L", "Smartstream 1.6T"],
  },
  {
    name: "Nissan",
    models: ["Almera", "Navara", "X-Trail", "Terra", "Sunny", "Teana"],
    engines: ["HR15DE 1.5L", "YD25 2.5D", "MR20DE 2.0L", "QR25DE 2.5L"],
  },
  {
    name: "Mitsubishi",
    models: ["Triton", "Pajero Sport", "Xpander", "Outlander", "Attrage"],
    engines: ["4N15 2.4D", "4A91 1.5L", "4B11 2.0L"],
  },
  {
    name: "Mazda",
    models: ["Mazda2", "Mazda3", "CX-5", "CX-8", "BT-50"],
    engines: ["Skyactiv-G 2.0L", "Skyactiv-G 2.5L", "Skyactiv-D 2.2L"],
  },
  {
    name: "Mercedes-Benz",
    models: ["C-Class", "E-Class", "GLC", "GLE", "S-Class"],
    engines: ["M264 2.0T", "M254 2.0T", "OM654 2.0D", "M256 3.0L"],
  },
  {
    name: "BMW",
    models: ["3 Series", "5 Series", "X3", "X5", "7 Series"],
    engines: ["B48 2.0T", "B58 3.0T", "B47 2.0D"],
  },
  {
    name: "Tesla",
    models: ["Model 3", "Model Y", "Model S", "Model X"],
    engines: ["Single Motor RWD", "Dual Motor AWD", "Plaid Tri-Motor"],
  },
];

export const TRANSMISSIONS: { value: TransmissionType; label: string }[] = [
  { value: "AT", label: "Automatic (AT)" },
  { value: "MT", label: "Manual (MT)" },
  { value: "CVT", label: "CVT" },
  { value: "DCT", label: "Dual-Clutch (DCT)" },
  { value: "EV", label: "EV / Reduction Gear" },
];

/** Year picker range: current year back to 1995. */
export const YEARS: number[] = Array.from(
  { length: new Date().getFullYear() - 1994 },
  (_, i) => new Date().getFullYear() - i,
);
