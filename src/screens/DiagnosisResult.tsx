import { Navigate, useNavigate } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { StickyBar } from "@/screens/VehicleSelect";
import {
  Button,
  Card,
  ConfidenceBar,
  LikelihoodBadge,
  SectionTitle,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { useDiagnosis } from "@/context/DiagnosisContext";
import { SYSTEM_BY_ID } from "@/data/systems";
import { formatKm } from "@/utils/format";

export default function DiagnosisResult() {
  const navigate = useNavigate();
  const { result, vehicle } = useDiagnosis();

  // Guard: no result (e.g. page refresh) → back to start.
  if (!result) return <Navigate to="/diagnose/vehicle" replace />;

  const sys = SYSTEM_BY_ID[result.system];

  function saveAsCase() {
    // Prefill the case form from this diagnosis and jump to it.
    navigate("/cases/new", { state: { fromDiagnosis: result } });
  }

  return (
    <>
      <TopBar title={t.result.title} back />
      <Page>
        {/* Vehicle summary */}
        <Card className="mb-4 flex items-center gap-3 bg-surface-2">
          <span className="text-2xl">{sys?.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {vehicle.brand} {vehicle.model} {vehicle.year ?? ""}
            </p>
            <p className="truncate text-sm text-muted">
              {sys?.en} · {vehicle.engine || "—"} · {formatKm(vehicle.mileageKm)}
            </p>
          </div>
        </Card>

        {result.dtcCodes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {result.dtcCodes.map((c) => (
              <span
                key={c}
                className="chip border-primary/40 bg-primary/12 font-semibold text-primary"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Possible causes ranked */}
        <SectionTitle icon={<Icon.Wrench size={18} className="text-primary" />}>
          {t.result.possibleCauses}
        </SectionTitle>
        <p className="mb-2 text-xs text-muted">{t.result.rankedBy}</p>
        <div className="space-y-2.5">
          {result.possibleCauses.map((c, i) => (
            <Card key={i}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
                    {i + 1}
                  </span>
                  <p className="font-semibold leading-snug">{c.title}</p>
                </div>
                <LikelihoodBadge likelihood={c.likelihood} />
              </div>
              <ConfidenceBar value={c.confidence} likelihood={c.likelihood} />
              <p className="mt-2 text-sm text-muted">{c.reasoning}</p>
            </Card>
          ))}
        </div>

        {/* Inspection steps */}
        <div className="mt-6">
          <SectionTitle icon={<Icon.Scan size={18} className="text-accent" />}>
            {t.result.inspectionSteps}
          </SectionTitle>
          <Card>
            <ol className="space-y-3">
              {result.inspectionSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-snug">{s}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Tools needed */}
        <div className="mt-6">
          <SectionTitle icon={<Icon.Settings size={18} className="text-muted" />}>
            {t.result.toolsNeeded}
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {result.toolsNeeded.map((tool) => (
              <span key={tool} className="chip">
                {tool}
              </span>
            ))}
          </div>
        </div>

        {/* Recommended repair */}
        <div className="mt-6">
          <SectionTitle icon={<Icon.Check size={18} className="text-success" />}>
            {t.result.recommendedRepair}
          </SectionTitle>
          <Card className="border-success/30 bg-success/5">
            <p className="text-sm leading-relaxed">{result.recommendedRepair}</p>
          </Card>
        </div>

        {/* Safety notes */}
        <div className="mt-6">
          <SectionTitle icon={<Icon.Alert size={18} className="text-danger" />}>
            {t.result.safetyNotes}
          </SectionTitle>
          <div className="space-y-2">
            {result.safetyNotes.map((n, i) => (
              <div
                key={i}
                className="flex gap-2.5 rounded-xl border border-warning/30 bg-warning/8 p-3"
              >
                <Icon.Alert size={18} className="mt-0.5 shrink-0 text-warning" />
                <p className="text-sm leading-snug">{n}</p>
              </div>
            ))}
          </div>
        </div>
      </Page>

      <StickyBar>
        <Button full onClick={saveAsCase}>
          <Icon.Book size={20} />
          {t.result.saveCase}
        </Button>
      </StickyBar>
    </>
  );
}
