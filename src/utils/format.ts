/** Small formatting helpers (Khmer-friendly relative time, numbers). */

export function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ឥឡូវ";
  if (min < 60) return `${min} នាទី`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ម៉ោង`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ថ្ងៃ`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} ខែ`;
  return `${Math.floor(mon / 12)} ឆ្នាំ`;
}

export function formatKm(km: number | null): string {
  if (km == null) return "—";
  return km.toLocaleString("en-US") + " km";
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
