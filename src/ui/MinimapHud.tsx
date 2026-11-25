import { memo } from 'react';
import type { MinimapRoomHud } from '../view/gateScene';
import { t, type LanguageCode } from '../i18n/translations';

interface MinimapHudProps {
  lang: LanguageCode;
  rooms: MinimapRoomHud[];
  floor: number;
}

export const MinimapHud = memo(function MinimapHud({ lang, rooms, floor }: MinimapHudProps) {
  if (rooms.length === 0) return null;

  const coordMap = new Map<string, MinimapRoomHud>();
  for (const r of rooms) {
    coordMap.set(`${r.gx},${r.gy}`, r);
  }

  // Reveal visited rooms + rooms adjacent to any visited room
  const isRevealed = (r: MinimapRoomHud): boolean => {
    if (r.visited || r.isCurrent) return true;
    const neighbors = [
      coordMap.get(`${r.gx},${r.gy - 1}`),
      coordMap.get(`${r.gx},${r.gy + 1}`),
      coordMap.get(`${r.gx + 1},${r.gy}`),
      coordMap.get(`${r.gx - 1},${r.gy}`),
    ];
    return neighbors.some((n) => n?.visited);
  };

  const revealed = rooms.filter(isRevealed);
  const boundsSource = revealed.length > 0 ? revealed : rooms;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const r of boundsSource) {
    if (r.gx < minX) minX = r.gx;
    if (r.gx > maxX) maxX = r.gx;
    if (r.gy < minY) minY = r.gy;
    if (r.gy > maxY) maxY = r.gy;
  }

  const cols = Math.max(1, maxX - minX + 1);
  const rows = Math.max(1, maxY - minY + 1);
  const cell = 20;
  const pad = 6;
  const w = cols * cell + pad * 2;
  const h = rows * cell + pad * 2;

  return (
    <div
      data-testid="hud-minimap"
      className="glass-panel pointer-events-none rounded-xl px-2 py-1.5 flex flex-col items-center gap-1 self-end"
    >
      <div className="w-full flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-[#9EB4DA]">
        <span className="text-[#38E8D8]">{t(lang, 'minimap_title')}</span>
        <span className="tabular-nums text-[#F4B942]">F{floor}</span>
      </div>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block max-w-[140px] max-h-[120px]"
        aria-label={t(lang, 'minimap_title')}
      >
        {/* Connectors */}
        {rooms.map((r) => {
          if (!isRevealed(r)) return null;
          const cx = pad + (r.gx - minX + 0.5) * cell;
          const cy = pad + (r.gy - minY + 0.5) * cell;
          return r.doors.map((dir) => {
            const dx = dir === 'E' ? 1 : dir === 'W' ? -1 : 0;
            const dy = dir === 'S' ? 1 : dir === 'N' ? -1 : 0;
            const nb = coordMap.get(`${r.gx + dx},${r.gy + dy}`);
            if (!nb || !isRevealed(nb)) return null;
            if (dx < 0 || dy < 0) return null; // draw each edge once
            const nx = pad + (nb.gx - minX + 0.5) * cell;
            const ny = pad + (nb.gy - minY + 0.5) * cell;
            return (
              <line
                key={`${r.id}_${dir}`}
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={r.visited && nb.visited ? '#38E8D8' : '#4B5B84'}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            );
          });
        })}

        {/* Room nodes */}
        {rooms.map((r) => {
          if (!isRevealed(r)) return null;
          const x = pad + (r.gx - minX) * cell + 3;
          const y = pad + (r.gy - minY) * cell + 3;
          const size = cell - 6;
          const fill = r.isCurrent
            ? '#38E8D8'
            : r.cleared
              ? '#1E3A5F'
              : r.visited
                ? '#2B1F47'
                : '#111830';
          const stroke = r.isCurrent
            ? '#FFF4DC'
            : r.type === 'boss'
              ? '#FF3B5C'
              : r.type === 'treasure'
                ? '#F4B942'
                : r.type === 'shrine'
                  ? '#C084FC'
                  : r.cleared
                    ? '#38E8D8'
                    : '#5B6C94';

          const marker =
            r.type === 'boss'
              ? '☠'
              : r.type === 'treasure'
                ? '◆'
                : r.type === 'shrine'
                  ? '✦'
                  : '';

          return (
            <g key={r.id}>
              <rect
                x={x}
                y={y}
                width={size}
                height={size}
                rx={4}
                fill={fill}
                stroke={stroke}
                strokeWidth={r.isCurrent ? 2 : 1.5}
              />
              {marker && (
                <text
                  x={x + size / 2}
                  y={y + size / 2 + 3.5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={r.isCurrent ? '#08121E' : stroke}
                >
                  {marker}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
});
