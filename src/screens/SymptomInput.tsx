import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { StepDots, StickyBar } from "@/screens/VehicleSelect";
import { Button, Field, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { SYSTEMS } from "@/data/systems";
import { useDiagnosis } from "@/context/DiagnosisContext";
import { ai } from "@/services/ai";
import { readFileAsDataUrl } from "@/utils/file";
import { uid } from "@/services/store";
import type { PhotoRef } from "@/types";

export default function SymptomInput() {
  const navigate = useNavigate();
  const { vehicle, input, setInput, setResult } = useDiagnosis();
  const [dtcDraft, setDtcDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addDtc() {
    const code = dtcDraft.trim().toUpperCase();
    if (!code) return;
    if (!input.dtcCodes.includes(code)) {
      setInput({ dtcCodes: [...input.dtcCodes, code] });
    }
    setDtcDraft("");
  }

  function removeDtc(code: string) {
    setInput({ dtcCodes: input.dtcCodes.filter((c) => c !== code) });
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const photos: PhotoRef[] = [];
    for (const f of files) {
      const dataUrl = await readFileAsDataUrl(f);
      photos.push({ id: uid("ph"), dataUrl, note: "" });
    }
    setInput({ photos: [...input.photos, ...photos] });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function analyze() {
    if (!input.system) return;
    setBusy(true);
    try {
      const result = await ai.diagnose({ vehicle, input });
      setResult(result);
      navigate("/diagnose/result");
    } finally {
      setBusy(false);
    }
  }

  const canAnalyze =
    !!input.system &&
    (input.symptomText.trim().length > 0 || input.dtcCodes.length > 0);

  return (
    <>
      <TopBar
        title={t.symptom.title}
        back
        right={
          <span className="truncate text-xs text-muted">
            {vehicle.brand} {vehicle.model}
          </span>
        }
      />
      <Page>
        <StepDots step={2} total={3} />

        {/* System picker */}
        <Field label={t.symptom.system}>
          <div className="grid grid-cols-3 gap-2">
            {SYSTEMS.map((s) => (
              <button
                key={s.id}
                onClick={() => setInput({ system: s.id })}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-1 py-3 text-center transition-active active:scale-95",
                  input.system === s.id &&
                    "border-primary bg-primary/12 ring-2 ring-primary/30",
                )}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-[11px] font-semibold leading-tight">
                  {s.en}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {/* Describe */}
        <div className="mt-4">
          <Field label={t.symptom.describe}>
            <textarea
              className="input min-h-[110px] resize-none"
              placeholder={t.symptom.describePh}
              value={input.symptomText}
              onChange={(e) => setInput({ symptomText: e.target.value })}
            />
          </Field>
        </div>

        {/* DTC codes */}
        <div className="mt-4">
          <Field label={t.symptom.dtc} hint={t.common.optional}>
            <div className="flex gap-2">
              <input
                className="input flex-1 uppercase"
                placeholder={t.symptom.dtcPh}
                value={dtcDraft}
                onChange={(e) => setDtcDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDtc()}
              />
              <Button variant="surface" className="px-4" onClick={addDtc}>
                <Icon.Plus size={20} />
              </Button>
            </div>
            {input.dtcCodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {input.dtcCodes.map((c) => (
                  <span
                    key={c}
                    className="chip border-primary/40 bg-primary/12 font-semibold text-primary"
                  >
                    {c}
                    <button onClick={() => removeDtc(c)} aria-label="remove">
                      <Icon.Close size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>

        {/* Photos */}
        <div className="mt-4">
          <Field label={t.symptom.photo} hint={t.common.optional}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPickPhoto}
            />
            <div className="flex flex-wrap gap-2">
              {input.photos.map((p) => (
                <div key={p.id} className="relative">
                  <img
                    src={p.dataUrl}
                    alt=""
                    className="h-20 w-20 rounded-xl border border-border object-cover"
                  />
                  <button
                    onClick={() =>
                      setInput({
                        photos: input.photos.filter((x) => x.id !== p.id),
                      })
                    }
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white"
                    aria-label="remove"
                  >
                    <Icon.Close size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted transition-active active:scale-95"
              >
                <Icon.Camera size={22} />
                <span className="text-[10px]">{t.symptom.addPhoto}</span>
              </button>
            </div>
          </Field>
        </div>

        {/* Scan report */}
        <div className="mt-4">
          <Field label={t.symptom.scan} hint={t.common.optional}>
            <textarea
              className="input min-h-[80px] resize-none font-mono text-sm"
              placeholder={t.symptom.scanPh}
              value={input.scanReport}
              onChange={(e) => setInput({ scanReport: e.target.value })}
            />
          </Field>
        </div>

        {!input.system && (
          <p className="mt-4 flex items-center gap-2 text-sm text-warning">
            <Icon.Alert size={18} />
            {t.symptom.selectSystemFirst}
          </p>
        )}
      </Page>

      <StickyBar>
        <Button full disabled={!canAnalyze || busy} onClick={analyze}>
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/30 border-t-primary-fg" />
              {t.result.analyzing}
            </>
          ) : (
            <>
              <Icon.Wrench size={20} />
              {t.symptom.analyze}
            </>
          )}
        </Button>
      </StickyBar>
    </>
  );
}
