import { Route, Routes } from "react-router-dom";
import { BottomNav } from "@/components/Layout";
import Home from "@/screens/Home";
import VehicleSelect from "@/screens/VehicleSelect";
import SymptomInput from "@/screens/SymptomInput";
import DiagnosisResult from "@/screens/DiagnosisResult";
import DtcSearch from "@/screens/DtcSearch";
import CaseLibrary from "@/screens/CaseLibrary";
import CaseDetail from "@/screens/CaseDetail";
import CaseForm from "@/screens/CaseForm";
import AskExpert from "@/screens/AskExpert";
import PhotoDiagnosis from "@/screens/PhotoDiagnosis";
import Settings from "@/screens/Settings";
import DiagnosticSessionScreen from "@/screens/DiagnosticSessionScreen";
import AiDiagnose from "@/screens/AiDiagnose";
import SessionList from "@/screens/SessionList";

export default function App() {
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Diagnosis workflow */}
        <Route path="/diagnose/vehicle" element={<VehicleSelect />} />
        <Route path="/diagnose/symptom" element={<SymptomInput />} />
        <Route path="/diagnose/result" element={<DiagnosisResult />} />

        {/* DTC */}
        <Route path="/dtc" element={<DtcSearch />} />

        {/* Cases */}
        <Route path="/cases" element={<CaseLibrary />} />
        <Route path="/cases/new" element={<CaseForm />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/cases/:id/edit" element={<CaseForm />} />

        {/* Tools */}
        <Route path="/photo" element={<PhotoDiagnosis />} />
        <Route path="/expert" element={<AskExpert />} />
        <Route path="/settings" element={<Settings />} />

        {/* Milestone 10 — AI Diagnose (instant answer, DTC optional) */}
        <Route path="/diagnose/new" element={<AiDiagnose />} />

        {/* Milestone 9 — all sessions / resume previous work */}
        <Route path="/sessions" element={<SessionList />} />

        {/* Milestone 6 — interactive prototype connecting the diagnostic engines */}
        <Route path="/diagnostic-session" element={<DiagnosticSessionScreen />} />

        <Route path="*" element={<Home />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
