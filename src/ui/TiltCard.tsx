import { useState, type CSSProperties, type MouseEvent } from 'react';

interface TiltState {
  rx: number;
  ry: number;
  gx: number;
  gy: number;
  active: boolean;
}

const IDLE_TILT: TiltState = { rx: 0, ry: 0, gx: 50, gy: 50, active: false };

export function useCardTilt3D(enabled: boolean) {
  const [tilt, setTilt] = useState<TiltState>(IDLE_TILT);

  if (!enabled) {
    return {
      cardStyle: undefined as CSSProperties | undefined,
      glareStyle: undefined as CSSProperties | undefined,
      onMouseMove: undefined as ((e: MouseEvent<HTMLElement>) => void) | undefined,
      onMouseLeave: undefined as (() => void) | undefined,
    };
  }

  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return;
    const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
    const rx = Number((-ny * 9).toFixed(1));
    const ry = Number((nx * 9).toFixed(1));
    const gx = Math.round(((nx + 1) * 0.5) * 100);
    const gy = Math.round(((ny + 1) * 0.5) * 100);
    setTilt((prev) =>
      prev.active && prev.rx === rx && prev.ry === ry && prev.gx === gx && prev.gy === gy
        ? prev
        : { rx, ry, gx, gy, active: true },
    );
  };

  const onMouseLeave = () => {
    setTilt((prev) => (prev.active ? IDLE_TILT : prev));
  };

  const cardStyle: CSSProperties = {
    transform: tilt.active
      ? `perspective(680px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(1.025, 1.025, 1.025)`
      : 'perspective(680px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transformStyle: 'preserve-3d',
    transition: tilt.active ? 'transform 70ms ease-out' : 'transform 220ms ease-out',
  };

  const glareStyle: CSSProperties | undefined = tilt.active
    ? {
        background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255, 244, 220, 0.24) 0%, rgba(56, 232, 216, 0.09) 38%, rgba(0, 0, 0, 0) 72%)`,
      }
    : undefined;

  return { cardStyle, glareStyle, onMouseMove, onMouseLeave };
}
