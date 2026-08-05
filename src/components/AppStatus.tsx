/**
 * Connection and update status — UX Audit v1 / P2-9.
 *
 * Two things the app knew but never said:
 *
 * 1. It works offline. In a workshop with a weak connection that is the single
 *    most reassuring fact about it, and the mechanic had no way to learn it
 *    except by losing signal and being pleasantly surprised.
 *
 * 2. A new version had shipped. The service worker used to update silently
 *    (registerType "autoUpdate"), which also meant it could take over and
 *    reload the page mid-diagnosis. Now the update waits and asks — the
 *    mechanic decides when to interrupt their own work.
 */
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Icon } from "@/components/Icon";

function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function AppStatus() {
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // The update prompt wins the slot: it is actionable, the offline note is not.
  if (needRefresh) {
    return (
      <div className="pt-safe fixed inset-x-0 top-0 z-40 bg-primary text-primary-fg">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2">
          <span className="min-w-0 flex-1 text-sm font-semibold">
            មានកំណែថ្មី
          </span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 rounded-lg bg-white/25 px-3 py-1.5 text-sm font-bold active:bg-white/35"
          >
            ធ្វើបច្ចុប្បន្នភាព
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="បិទ"
            className="shrink-0 px-1 active:opacity-70"
          >
            <Icon.Close size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="pt-safe fixed inset-x-0 top-0 z-40 bg-warning/90 text-black">
        <div className="mx-auto max-w-md px-4 py-1.5 text-center text-xs font-semibold">
          គ្មានអ៊ីនធឺណិត — App នៅដំណើរការធម្មតា
        </div>
      </div>
    );
  }

  return null;
}
