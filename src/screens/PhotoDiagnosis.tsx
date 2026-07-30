import { useRef, useState } from "react";
import { Page, TopBar } from "@/components/Layout";
import { StickyBar } from "@/screens/VehicleSelect";
import {
  Button,
  Card,
  ConfidenceBar,
  EmptyState,
  LikelihoodBadge,
  SectionTitle,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { ai, type PhotoAnalysis } from "@/services/ai";
import { readFileAsDataUrl } from "@/utils/file";
import { uid } from "@/services/store";
import type { PhotoRef } from "@/types";

export default function PhotoDiagnosis() {
  const [photos, setPhotos] = useState<PhotoRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added: PhotoRef[] = [];
    for (const f of files) {
      added.push({ id: uid("ph"), dataUrl: await readFileAsDataUrl(f), note: "" });
    }
    setPhotos((p) => [...p, ...added]);
    setAnalysis(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function analyze() {
    setBusy(true);
    try {
      const res = await ai.analyzePhotos(photos.map((p) => p.note));
      setAnalysis(res);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title={t.photo.title} back />
      <Page>
        <p className="mb-4 text-sm text-muted">{t.photo.intro}</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onPick}
        />

        {photos.length === 0 ? (
          <button onClick={() => fileRef.current?.click()} className="w-full">
            <EmptyState
              icon={<Icon.Camera size={44} />}
              title={t.photo.add}
              hint={t.photo.intro}
            />
          </button>
        ) : (
          <div className="space-y-3">
            {photos.map((p) => (
              <Card key={p.id} className="space-y-2.5">
                <div className="flex gap-3">
                  <img
                    src={p.dataUrl}
                    alt=""
                    className="h-24 w-24 shrink-0 rounded-xl border border-border object-cover"
                  />
                  <textarea
                    className="input min-h-[96px] flex-1 resize-none text-sm"
                    placeholder={t.photo.notePh}
                    value={p.note}
                    onChange={(e) =>
                      setPhotos((prev) =>
                        prev.map((x) =>
                          x.id === p.id ? { ...x, note: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  onClick={() => {
                    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                    setAnalysis(null);
                  }}
                  className="flex items-center gap-1 text-sm font-semibold text-danger"
                >
                  <Icon.Trash size={16} /> {t.common.delete}
                </button>
              </Card>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="btn btn-lg w-full border border-dashed border-border text-muted"
            >
              <Icon.Plus size={20} /> {t.photo.add}
            </button>
          </div>
        )}

        {/* Analysis result */}
        {analysis && (
          <div className="mt-6 animate-fade-up">
            <SectionTitle
              icon={<Icon.Camera size={18} className="text-primary" />}
            >
              {t.photo.result}
            </SectionTitle>
            <Card className="mb-4">
              <ul className="space-y-2">
                {analysis.observations.map((o, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {o}
                  </li>
                ))}
              </ul>
            </Card>

            <SectionTitle>{t.result.possibleCauses}</SectionTitle>
            <div className="space-y-2.5">
              {analysis.possibleCauses.map((c, i) => (
                <Card key={i}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold">{c.title}</p>
                    <LikelihoodBadge likelihood={c.likelihood} />
                  </div>
                  <ConfidenceBar value={c.confidence} likelihood={c.likelihood} />
                </Card>
              ))}
            </div>

            <SectionTitle>
              <span className="mt-4 block">{t.result.inspectionSteps}</span>
            </SectionTitle>
            <Card>
              <ol className="space-y-3">
                {analysis.nextSteps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-sm">{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </Page>

      {photos.length > 0 && (
        <StickyBar>
          <Button full disabled={busy} onClick={analyze}>
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/30 border-t-primary-fg" />
                {t.result.analyzing}
              </>
            ) : (
              <>
                <Icon.Scan size={20} /> {t.photo.analyze}
              </>
            )}
          </Button>
        </StickyBar>
      )}
    </>
  );
}
