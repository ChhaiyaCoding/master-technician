import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { Button, Field, cx } from "@/components/ui";
import { t } from "@/i18n/strings";
import { BRANDS, TRANSMISSIONS, YEARS } from "@/data/vehicles";
import { useDiagnosis } from "@/context/DiagnosisContext";
import type { TransmissionType } from "@/types";

export default function VehicleSelect() {
  const navigate = useNavigate();
  const { vehicle, setVehicle } = useDiagnosis();
  const [brandQuery, setBrandQuery] = useState(vehicle.brand);

  const brandData = BRANDS.find(
    (b) => b.name.toLowerCase() === vehicle.brand.toLowerCase(),
  );
  const brandMatches = BRANDS.filter((b) =>
    b.name.toLowerCase().includes(brandQuery.toLowerCase()),
  );

  const canContinue = vehicle.brand.trim().length > 0;

  return (
    <>
      <TopBar title={t.vehicle.title} back />
      <Page>
        {/* Step indicator */}
        <StepDots step={1} total={3} />

        <div className="space-y-4">
          {/* Brand — search + quick chips */}
          <Field label={t.vehicle.brand}>
            <input
              className="input"
              placeholder={t.vehicle.brandPh}
              value={brandQuery}
              onChange={(e) => {
                setBrandQuery(e.target.value);
                setVehicle({ brand: e.target.value, model: "" });
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {(brandQuery ? brandMatches : BRANDS).slice(0, 8).map((b) => (
                <button
                  key={b.name}
                  onClick={() => {
                    setVehicle({ brand: b.name, model: "" });
                    setBrandQuery(b.name);
                  }}
                  className={cx(
                    "chip transition-active active:scale-95",
                    vehicle.brand === b.name &&
                      "border-primary bg-primary/12 text-primary",
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </Field>

          {/* Model */}
          <Field label={t.vehicle.model}>
            <input
              className="input"
              placeholder={t.vehicle.modelPh}
              value={vehicle.model}
              onChange={(e) => setVehicle({ model: e.target.value })}
            />
            {brandData && (
              <div className="mt-2 flex flex-wrap gap-2">
                {brandData.models.map((m) => (
                  <button
                    key={m}
                    onClick={() => setVehicle({ model: m })}
                    className={cx(
                      "chip transition-active active:scale-95",
                      vehicle.model === m &&
                        "border-primary bg-primary/12 text-primary",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Year + Mileage side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.vehicle.year}>
              <select
                className="input appearance-none"
                value={vehicle.year ?? ""}
                onChange={(e) =>
                  setVehicle({ year: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">—</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.vehicle.mileage}>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                placeholder={t.vehicle.mileagePh}
                value={vehicle.mileageKm ?? ""}
                onChange={(e) =>
                  setVehicle({
                    mileageKm: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
          </div>

          {/* Engine */}
          <Field label={t.vehicle.engine} hint={t.common.optional}>
            <input
              className="input"
              placeholder={t.vehicle.enginePh}
              value={vehicle.engine}
              onChange={(e) => setVehicle({ engine: e.target.value })}
            />
            {brandData && (
              <div className="mt-2 flex flex-wrap gap-2">
                {brandData.engines.map((eng) => (
                  <button
                    key={eng}
                    onClick={() => setVehicle({ engine: eng })}
                    className={cx(
                      "chip transition-active active:scale-95",
                      vehicle.engine === eng &&
                        "border-primary bg-primary/12 text-primary",
                    )}
                  >
                    {eng}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Transmission */}
          <Field label={t.vehicle.transmission} hint={t.common.optional}>
            <div className="grid grid-cols-3 gap-2">
              {TRANSMISSIONS.map((tr) => (
                <button
                  key={tr.value}
                  onClick={() =>
                    setVehicle({
                      transmission:
                        vehicle.transmission === tr.value
                          ? ""
                          : (tr.value as TransmissionType),
                    })
                  }
                  className={cx(
                    "rounded-xl border border-border bg-surface px-2 py-3 text-sm font-semibold transition-active active:scale-95",
                    vehicle.transmission === tr.value &&
                      "border-primary bg-primary/12 text-primary",
                  )}
                >
                  {tr.value}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Page>

      {/* Sticky continue bar */}
      <StickyBar>
        <Button
          full
          disabled={!canContinue}
          onClick={() => navigate("/diagnose/symptom")}
        >
          {t.vehicle.continue}
        </Button>
      </StickyBar>
    </>
  );
}

export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-5 flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cx(
            "h-1.5 flex-1 rounded-full",
            i < step ? "bg-primary" : "bg-surface-2",
          )}
        />
      ))}
    </div>
  );
}

export function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto max-w-md px-4 py-3">{children}</div>
    </div>
  );
}
