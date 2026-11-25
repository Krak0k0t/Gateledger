export interface GameMetrics {
  completed: boolean;
  events: string[];
  distanceMoved: number;
  dodgeCount: number;
  seed: number;
  state: string;
  playerX: number;
  playerZ: number;
  fps: number;
}

declare global {
  interface Window {
    __metrics?: GameMetrics;
    __GAME__?: { ready: boolean };
  }
}

export function initMetrics(seed: number): GameMetrics {
  const metrics: GameMetrics = {
    completed: false,
    events: [],
    distanceMoved: 0,
    dodgeCount: 0,
    seed,
    state: 'title',
    playerX: 0,
    playerZ: 0,
    fps: 0,
  };
  if (typeof window !== 'undefined') {
    window.__metrics = metrics;
    window.__GAME__ = { ready: false };
  }
  return metrics;
}

export function pushMetricEvent(metrics: GameMetrics, eventName: string): void {
  if (metrics.events.length >= 64) {
    metrics.events.shift();
  }
  metrics.events.push(eventName);
}

export function markGameReady(): void {
  if (typeof window !== 'undefined') {
    window.__GAME__ = { ready: true };
  }
}
