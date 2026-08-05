import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { Button, Field, StickyBar, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { caseStore, uid } from "@/services/store";
import { SYSTEMS } from "@/data/systems";
import type { DiagnosisResult, RepairCase } from "@/types";

function blankCase(): RepairCase {
  return {
    id: uid("case"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    vehicle: {
      brand: "",
      model: "",
      year: null,
      engine: "",
      transmission: "",
      mileageKm: null,
    },
    system: "engine",
    symptomText: "",
    dtcCodes: [],
    rootCause: "",
    repairPerformed: "",
    partsReplaced: [],
    technicianNote: "",
    photos: [],
    tags: [],
  };
}

function fromDiagnosis(dx: DiagnosisResult): RepairCase {
  return {
    ...blankCase(),
    createdAt: Date.now(),
    vehicle: dx.vehicle,
    system: dx.system,
    symptomText: dx.symptomText,
    dtcCodes: dx.dtcCodes,
    // Seed root cause with the top-ranked cause as a starting point.
    rootCause: dx.possibleCauses[0]?.title ?? "",
    tags: dx.dtcCodes.map((c) => c.toLowerCase()),
  };
}

export default function CaseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [draft, setDraft] = useState<RepairCase>(() => {
    if (id) {
      const existing = caseStore.get(id);
      if (existing) return existing;
    }
    const dx = (location.state as { fromDiagnosis?: DiagnosisResult })
      ?.fromDiagnosis;
    if (dx) return fromDiagnosis(dx);
    return blankCase();
  });

  const [partDraft, setPartDraft] = useState("");
  const [dtcDraft, setDtcDraft] = useState("");
  const isEdit = !!id;

  function set<K extends keyof RepairCase>(key: K, value: RepairCase[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function setVehicle(patch: Partial<RepairCase["vehicle"]>) {
    setDraft((d) => ({ ...d, vehicle: { ...d.vehicle, ...patch } }));
  }

  function save() {
    caseStore.save(draft);
    navigate(`/cases/${draft.id}`, { replace: true });
  }

  // P2-5 — this gate always existed, but nothing on screen said so: required
  // fields were unmarked and the disabled Save button gave no reason. Name what
  // is missing instead of leaving the mechanic to guess which of 11 fields it is.
  const needsBrand = draft.vehicle.brand.trim().length === 0;
  const needsProblem =
    draft.symptomText.trim().length === 0 && draft.rootCause.trim().length === 0;
  const canSave = !needsBrand && !needsProblem;
  const missingHint = needsBrand
    ? "ត្រូវបំពេញ៖ ម៉ាករថយន្ត"
    : "ត្រូវបំពេញ៖ ពិពណ៌នាបញ្ហា ឬ មូលហេតុ";

  return (
    <>
      <TopBar title={isEdit ? t.common.edit : t.cases.newCase} back />
      <Page>
        {/* Vehicle */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t.vehicle.brand} *`}>
            <input
              className="input"
              value={draft.vehicle.brand}
              onChange={(e) => setVehicle({ brand: e.target.value })}
            />
          </Field>
          <Field label={t.vehicle.model}>
            <input
              className="input"
              value={draft.vehicle.model}
              onChange={(e) => setVehicle({ model: e.target.value })}
            />
          </Field>
          <Field label={t.vehicle.year}>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={draft.vehicle.year ?? ""}
              onChange={(e) =>
                setVehicle({ year: e.target.value ? Number(e.target.value) : null })
              }
            />
          </Field>
          <Field label={t.vehicle.mileage}>
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={draft.vehicle.mileageKm ?? ""}
              onChange={(e) =>
                setVehicle({
                  mileageKm: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={t.vehicle.engine}>
            <input
              className="input"
              value={draft.vehicle.engine}
              onChange={(e) => setVehicle({ engine: e.target.value })}
            />
          </Field>
        </div>

        {/* System */}
        <div className="mt-4">
          <Field label={t.symptom.system}>
            <div className="grid grid-cols-3 gap-2">
              {SYSTEMS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => set("system", s.id)}
                  className={cx(
                    "flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-1 py-2.5 transition-active active:scale-95",
                    draft.system === s.id && "border-primary bg-primary/12",
                  )}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[10px] font-semibold">{s.en}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* DTC codes */}
        <div className="mt-4">
          <Field label={t.symptom.dtc}>
            <div className="flex gap-2">
              <input
                className="input flex-1 uppercase"
                placeholder={t.symptom.dtcPh}
                value={dtcDraft}
                onChange={(e) => setDtcDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dtcDraft.trim()) {
                    const code = dtcDraft.trim().toUpperCase();
                    if (!draft.dtcCodes.includes(code))
                      set("dtcCodes", [...draft.dtcCodes, code]);
                    setDtcDraft("");
                  }
                }}
              />
            </div>
            {draft.dtcCodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.dtcCodes.map((c) => (
                  <span
                    key={c}
                    className="chip font-semibold text-primary"
                  >
                    {c}
                    <button
                      onClick={() =>
                        set(
                          "dtcCodes",
                          draft.dtcCodes.filter((x) => x !== c),
                        )
                      }
                    >
                      <Icon.Close size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>

        {/* Text fields. No star on either of the next two: the rule is "at
            least one of them", which a star per field would misstate. */}
        <p className="mb-1 mt-2 text-xs text-muted">
          * បំពេញយ៉ាងហោចណាស់មួយក្នុងចំណោមពីរខាងក្រោម
        </p>
        <TextArea
          label={t.symptom.describe}
          value={draft.symptomText}
          onChange={(v) => set("symptomText", v)}
        />
        <TextArea
          label={t.cases.rootCause}
          value={draft.rootCause}
          onChange={(v) => set("rootCause", v)}
        />
        <TextArea
          label={t.cases.repair}
          value={draft.repairPerformed}
          onChange={(v) => set("repairPerformed", v)}
        />

        {/* Parts */}
        <div className="mt-4">
          <Field label={t.cases.parts}>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="ឧ. Ignition coil x1"
                value={partDraft}
                onChange={(e) => setPartDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && partDraft.trim()) {
                    set("partsReplaced", [...draft.partsReplaced, partDraft.trim()]);
                    setPartDraft("");
                  }
                }}
              />
              <Button
                variant="surface"
                className="px-4"
                onClick={() => {
                  if (partDraft.trim()) {
                    set("partsReplaced", [...draft.partsReplaced, partDraft.trim()]);
                    setPartDraft("");
                  }
                }}
              >
                <Icon.Plus size={20} />
              </Button>
            </div>
            {draft.partsReplaced.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.partsReplaced.map((p, i) => (
                  <span key={i} className="chip">
                    {p}
                    <button
                      onClick={() =>
                        set(
                          "partsReplaced",
                          draft.partsReplaced.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <Icon.Close size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>

        <TextArea
          label={t.cases.note}
          value={draft.technicianNote}
          onChange={(v) => set("technicianNote", v)}
        />
      </Page>

      <StickyBar>
        <Button full disabled={!canSave} onClick={save}>
          <Icon.Check size={20} />
          {t.common.save}
        </Button>
        {!canSave && (
          <p className="mt-1.5 text-center text-xs text-muted">{missingHint}</p>
        )}
      </StickyBar>
    </>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <Field label={label}>
        <textarea
          className="input min-h-[90px] resize-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    </div>
  );
}
