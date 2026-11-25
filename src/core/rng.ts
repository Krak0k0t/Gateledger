export function parseSeed(search = ''): number {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  if (!raw) return 1337;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 1337;
  return parsed >>> 0;
}

export function getDailySeed(date = new Date()): { seed: number; label: string } {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const label = `${y}-${m}-${d}`;
  const raw = Number.parseInt(`${y}${m}${d}`, 10);
  return { seed: (raw ^ 0x5a17b3) >>> 0, label };
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
