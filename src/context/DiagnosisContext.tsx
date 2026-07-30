import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DiagnosisResult, SymptomInput, Vehicle } from "@/types";

/**
 * Holds the in-progress diagnosis session (vehicle → symptoms → result)
 * so it survives navigation between the workflow screens.
 */
interface DiagnosisCtx {
  vehicle: Vehicle;
  input: SymptomInput;
  result: DiagnosisResult | null;
  setVehicle: (v: Partial<Vehicle>) => void;
  setInput: (patch: Partial<SymptomInput>) => void;
  setResult: (r: DiagnosisResult | null) => void;
  reset: () => void;
}

const emptyVehicle: Vehicle = {
  brand: "",
  model: "",
  year: null,
  engine: "",
  transmission: "",
  mileageKm: null,
};

const emptyInput: SymptomInput = {
  system: null,
  symptomText: "",
  dtcCodes: [],
  photos: [],
  scanReport: "",
};

const Ctx = createContext<DiagnosisCtx | null>(null);

export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const [vehicle, setVehicleState] = useState<Vehicle>(emptyVehicle);
  const [input, setInputState] = useState<SymptomInput>(emptyInput);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const setVehicle = useCallback((v: Partial<Vehicle>) => {
    setVehicleState((prev) => ({ ...prev, ...v }));
  }, []);

  const setInput = useCallback((patch: Partial<SymptomInput>) => {
    setInputState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setVehicleState(emptyVehicle);
    setInputState(emptyInput);
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({ vehicle, input, result, setVehicle, setInput, setResult, reset }),
    [vehicle, input, result, setVehicle, setInput, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDiagnosis(): DiagnosisCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDiagnosis must be used within DiagnosisProvider");
  return ctx;
}
