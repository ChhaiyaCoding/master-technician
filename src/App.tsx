import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppStatus } from "@/components/AppStatus";
import { BottomNav, Page } from "@/components/Layout";
import { LoadingDots } from "@/components/ui";
import Home from "@/screens/Home";

/**
 * Route-level code splitting (Milestone 12).
 *
 * Home stays eagerly imported — it's the landing screen, and lazy-loading it
 * would add a round trip before the mechanic sees anything. Every other screen
 * is lazy, which matters most for the DTC knowledge base: dtc.ts +
 * dtcExtended.ts are ~570 KB of source that only DtcSearch / AiDiagnose /
 * ai.ts / the diagnosis modules touch. Splitting keeps that out of the initial
 * download so the app opens fast in a workshop with a weak connection.
 */
const DtcSearch = lazy(() => import("@/screens/DtcSearch"));
const CaseLibrary = lazy(() => import("@/screens/CaseLibrary"));
const CaseDetail = lazy(() => import("@/screens/CaseDetail"));
const CaseForm = lazy(() => import("@/screens/CaseForm"));
const AskExpert = lazy(() => import("@/screens/AskExpert"));
const PhotoDiagnosis = lazy(() => import("@/screens/PhotoDiagnosis"));
const Settings = lazy(() => import("@/screens/Settings"));
const DiagnosticSessionScreen = lazy(() => import("@/screens/DiagnosticSessionScreen"));
const AiDiagnose = lazy(() => import("@/screens/AiDiagnose"));
const SessionList = lazy(() => import("@/screens/SessionList"));

/** Shown for the brief moment a lazy screen's chunk is downloading. */
function ScreenFallback() {
  return (
    <Page>
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingDots label="កំពុងបើក..." />
      </div>
    </Page>
  );
}

export default function App() {
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      <AppStatus />
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* The pre-Milestone-10 wizard (/diagnose/vehicle → /diagnose/symptom
              → /diagnose/result) was removed in UX Audit v1 / P2-2. Nothing had
              linked into it since AiDiagnose took over, but it still compiled
              and shipped. `path="*"` sends any old bookmark to Home. */}

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
      </Suspense>

      <BottomNav />
    </div>
  );
}
