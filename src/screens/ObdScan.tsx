/**
 * OBD-II scan screen.
 *
 * Connects to a BLE adapter, pulls the codes off the car, and hands them
 * straight to AI Diagnose — which is the whole point. A generic scanner shows
 * "P0301 Cylinder 1 Misfire" and stops; this app already holds 699 codes with
 * Khmer causes, an inspection order and the mistakes to avoid, so the scan's
 * job is only to get the codes in without typing.
 *
 * Live readings are shown but not yet fed to the diagnostic engine. Wiring
 * them in as Measured evidence is the obvious next step and deliberately not
 * taken here: the engine is frozen, and that change deserves its own pass.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { Button, Card, EmptyState, SectionTitle, SeverityBadge, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { DTC_BY_CODE } from "@/data/dtc";
import {
  BleObdTransport,
  MockObdTransport,
  ObdClient,
  isWebBluetoothAvailable,
  type ObdTransport,
} from "@/services/obd";
import { LIVE_PIDS, formatReading, type PidReading } from "@/services/obdProtocol";

type Phase = "idle" | "connecting" | "connected" | "scanning";

const LIVE_PID_IDS = LIVE_PIDS.map((p) => p.pid);
const LIVE_POLL_MS = 1500;

export default function ObdScan() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transportLabel, setTransportLabel] = useState("");
  const [stored, setStored] = useState<string[] | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [readings, setReadings] = useState<PidReading[]>([]);
  const [liveOn, setLiveOn] = useState(false);

  const clientRef = useRef<ObdClient | null>(null);
  const transportRef = useRef<ObdTransport | null>(null);

  const bleSupported = isWebBluetoothAvailable();

  // Always drop the connection when leaving — a BLE link left open keeps the
  // adapter busy and the next connect attempt fails for no visible reason.
  useEffect(() => {
    return () => {
      transportRef.current?.disconnect().catch(() => {});
    };
  }, []);

  // Live polling. One request at a time: an ELM327 answers a single command,
  // so this waits for a full sweep before scheduling the next.
  useEffect(() => {
    if (!liveOn || phase !== "connected") return;
    let cancelled = false;
    let timer: number;

    async function sweep() {
      if (cancelled || !clientRef.current) return;
      try {
        const next = await clientRef.current.readLiveData(LIVE_PID_IDS);
        if (!cancelled && next.length) setReadings(next);
      } catch {
        /* a dropped sweep is not worth interrupting the mechanic over */
      }
      if (!cancelled) timer = window.setTimeout(sweep, LIVE_POLL_MS);
    }
    sweep();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [liveOn, phase]);

  async function connect(useMock: boolean) {
    setError(null);
    setPhase("connecting");
    const transport = useMock ? new MockObdTransport() : new BleObdTransport();
    try {
      await transport.connect();
      transportRef.current = transport;
      clientRef.current = new ObdClient(transport);
      setTransportLabel(transport.label);
      setPhase("connected");
      await scan(new ObdClient(transport));
    } catch (e) {
      // A cancelled device picker is a choice, not a failure.
      const msg = e instanceof Error ? e.message : String(e);
      setError(/cancel|user gesture|chooser/i.test(msg) ? null : msg);
      setPhase("idle");
    }
  }

  async function scan(client = clientRef.current) {
    if (!client) return;
    setPhase("scanning");
    setError(null);
    try {
      const result = await client.readDtcs();
      setStored(result.storedDtcs);
      setPending(result.pendingDtcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhase("connected");
    }
  }

  async function disconnect() {
    setLiveOn(false);
    await transportRef.current?.disconnect().catch(() => {});
    transportRef.current = null;
    clientRef.current = null;
    setPhase("idle");
    setStored(null);
    setPending([]);
    setReadings([]);
  }

  /** Hand the scanned codes to AI Diagnose, which does the actual thinking. */
  function diagnose(codes: string[]) {
    navigate("/diagnose/new", { state: { prefillDtc: codes.join(" ") } });
  }

  const busy = phase === "connecting" || phase === "scanning";
  const allCodes = [...(stored ?? []), ...pending];

  return (
    <>
      <TopBar title="ស្កេនរថយន្ត (OBD-II)" back />
      <Page>
        {phase === "idle" && (
          <>
            {!bleSupported && (
              <Card className="mb-3 border-warning/40 bg-warning/8">
                <div className="flex gap-2.5">
                  <Icon.Alert size={20} className="mt-0.5 shrink-0 text-warning" />
                  <div className="text-sm leading-relaxed">
                    <p className="font-semibold">Browser នេះភ្ជាប់ Bluetooth មិនបានទេ</p>
                    <p className="mt-1 text-muted">
                      ត្រូវប្រើ <span className="font-semibold">Chrome លើ Android</span>។ iPhone និង
                      iPad មិនគាំទ្រ Web Bluetooth ទាល់តែសោះ។ អ្នកនៅតែអាចសាកល្បងរបៀបដំណើរការ
                      ដោយប្រើ Mock ខាងក្រោម។
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="mb-3">
              <SectionTitle icon={<Icon.Scan size={18} className="text-primary" />}>
                ភ្ជាប់ adapter
              </SectionTitle>
              <p className="mb-3 text-sm leading-relaxed text-muted">
                ដោត adapter ចូល port OBD-II ក្រោមកង់ចង្កូត បើកកូនសោទៅទីតាំង ON
                រួចចុចប៊ូតុងខាងក្រោម។
              </p>
              <Button full disabled={!bleSupported || busy} onClick={() => connect(false)}>
                <Icon.Scan size={20} /> ភ្ជាប់ Bluetooth
              </Button>
              <button
                onClick={() => connect(true)}
                disabled={busy}
                className="btn mt-2 min-h-[48px] w-full rounded-xl border border-border text-sm font-semibold text-muted active:bg-surface-2"
              >
                សាកល្បងដោយគ្មាន adapter (Mock)
              </button>
            </Card>

            <Card className="border-border/60">
              <SectionTitle>Adapter ដែលដំណើរការ</SectionTitle>
              <p className="text-sm leading-relaxed text-muted">
                ត្រូវជា <span className="font-semibold text-text">BLE (Bluetooth 4.0+)</span> ។
                Adapter ថោកភាគច្រើនជា Bluetooth Classic ដែលភ្ជាប់មិនចេញ ហើយ WiFi ក៏មិនបានដែរ។
              </p>
              <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm leading-relaxed">
                💡 ល្បិចទិញ៖ បើកញ្ចប់សរសេរថា <span className="font-semibold">«works with iPhone»</span>{" "}
                នោះវាជា BLE ប្រាកដ — ព្រោះ iOS ក៏មិនអនុញ្ញាត Bluetooth Classic ដែរ។
              </p>
            </Card>
          </>
        )}

        {phase !== "idle" && (
          <>
            <Card className="mb-3 border-success/30 bg-success/5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Icon.Check size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">ភ្ជាប់រួច</p>
                  <p className="truncate text-xs text-muted">{transportLabel}</p>
                </div>
                <button
                  onClick={disconnect}
                  className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted active:bg-surface-2"
                >
                  ផ្ដាច់
                </button>
              </div>
            </Card>

            {busy && (
              <p className="mb-3 text-center text-sm text-muted">
                {phase === "connecting" ? "កំពុងភ្ជាប់..." : "កំពុងអានកូដពីរថយន្ត..."}
              </p>
            )}

            {stored !== null && !busy && (
              <div className="mb-3">
                {allCodes.length === 0 ? (
                  <EmptyState
                    icon={<Icon.Check size={40} />}
                    title="មិនមានកូដកំហុសទេ"
                    hint="ECU មិនរក្សាទុកកូដណាមួយឡើយ។ បើមានរោគសញ្ញា សូមប្រើ AI វិនិច្ឆ័យបញ្ហាដោយពិពណ៌នា។"
                  />
                ) : (
                  <>
                    <SectionTitle>រកឃើញ {allCodes.length} កូដ</SectionTitle>
                    <div className="space-y-2.5">
                      {stored.map((code) => (
                        <CodeCard key={code} code={code} onOpen={() => navigate(`/dtc?code=${code}`)} />
                      ))}
                      {pending.map((code) => (
                        <CodeCard
                          key={code}
                          code={code}
                          pending
                          onOpen={() => navigate(`/dtc?code=${code}`)}
                        />
                      ))}
                    </div>
                    <Button full className="mt-3" onClick={() => diagnose(allCodes)}>
                      <Icon.Wrench size={20} /> វិនិច្ឆ័យកូដទាំងនេះ
                    </Button>
                  </>
                )}
                <button
                  onClick={() => scan()}
                  className="btn mt-2 min-h-[48px] w-full rounded-xl border border-border text-sm font-semibold text-primary active:bg-surface-2"
                >
                  អានម្ដងទៀត
                </button>
              </div>
            )}

            <Card className="mb-3">
              <button
                onClick={() => setLiveOn((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block font-bold">Live Data</span>
                  <span className="block text-xs text-muted">
                    តម្លៃពិតពី ECU ខណៈម៉ាស៊ីនដើរ
                  </span>
                </span>
                <span
                  className={cx(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                    liveOn ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
                  )}
                >
                  {liveOn ? "កំពុងអាន" : "បើក"}
                </span>
              </button>

              {liveOn && readings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {readings.map((r) => (
                    <div key={r.pid} className="rounded-xl bg-surface-2 px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
                        <span className="shrink-0 font-bold tabular-nums">{formatReading(r)}</span>
                      </div>
                      {r.hintKm && <p className="mt-0.5 text-xs text-muted">{r.hintKm}</p>}
                    </div>
                  ))}
                </div>
              )}
              {liveOn && readings.length === 0 && (
                <p className="mt-3 text-sm text-muted">កំពុងអាន...</p>
              )}
            </Card>

            {/* Clearing is kept last, plain, and behind a confirm on purpose:
                the app's own DTC content repeatedly warns that erasing before
                the repair throws away the evidence needed to find the fault. */}
            {stored !== null && allCodes.length > 0 && (
              <Card className="border-danger/25">
                <SectionTitle icon={<Icon.Alert size={18} className="text-danger" />}>
                  លុបកូដ
                </SectionTitle>
                <p className="mb-3 text-sm leading-relaxed text-muted">
                  លុបកូដ<span className="font-semibold text-text">មុនជួសជុល</span>
                  បំផ្លាញភស្តុតាង — freeze frame និងទិន្នន័យរាប់ជំហានបាត់អស់ ហើយកូដនឹងឡើងវិញ។
                  លុបតែក្រោយពេលជួសជុលរួច ដើម្បីផ្ទៀងផ្ទាត់ថាបញ្ហាដាច់មែន។
                </p>
                <button
                  onClick={async () => {
                    if (!confirm("លុបកូដទាំងអស់ចេញពី ECU មែនទេ? ភស្តុតាងនឹងបាត់។")) return;
                    try {
                      await clientRef.current?.clearDtcs();
                      await scan();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                  className="btn min-h-[48px] w-full rounded-xl border border-danger/40 text-sm font-semibold text-danger active:bg-danger/10"
                >
                  លុបកូដចេញពី ECU
                </button>
              </Card>
            )}
          </>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-danger/30 bg-danger/8 p-3 text-sm text-danger">
            {error}
          </p>
        )}
      </Page>
    </>
  );
}

function CodeCard({
  code,
  pending,
  onOpen,
}: {
  code: string;
  pending?: boolean;
  onOpen: () => void;
}) {
  const d = DTC_BY_CODE[code];
  return (
    <Card onClick={onOpen}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-primary">{code}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {pending && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
              មិនទាន់ច្បាស់
            </span>
          )}
          {d && <SeverityBadge severity={d.severity} />}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        {d ? d.titleKm : "កូដនេះមិនមានក្នុងទិន្នន័យ — ប្រហែលជាកូដឯកជនរបស់ម៉ាករថយន្ត"}
      </p>
    </Card>
  );
}
