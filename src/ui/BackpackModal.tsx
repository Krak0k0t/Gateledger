import { useState } from 'react';
import {
  BAG_COLS,
  BELT_SAFE_SLOTS,
  computeBeltPerks,
  computeEffectiveItemValue,
  computePackSetBonuses,
  isSlotLocked,
  type BagRelicItem,
} from '../systems/backpack';
import { t, type LanguageCode } from '../i18n/translations';
import { useCardTilt3D } from './TiltCard';

interface BackpackModalProps {
  lang: LanguageCode;
  bag: (BagRelicItem | null)[];
  inDungeon: boolean;
  evacuateCost: number;
  gold: number;
  tiltEnabled?: boolean;
  onSwap: (idxA: number, idxB: number) => void;
  onEvacuate: () => void;
  onClose: () => void;
}

const CURSE_COLORS: Record<string, string> = {
  none: '#233D63',
  gilded: '#F4B942',
  vault: '#2EC4B6',
  pyre: '#E63946',
  lock: '#A855F7',
  cleanse: '#38BDF8',
  void: '#7C3AED',
};

function BagSlotCard({
  idx,
  item,
  locked,
  isBelt,
  selected,
  effVal,
  tiltEnabled,
  onClick,
}: {
  idx: number;
  item: BagRelicItem | null;
  locked: boolean;
  isBelt: boolean;
  selected: boolean;
  effVal: number;
  tiltEnabled: boolean;
  onClick: () => void;
}) {
  const { cardStyle, glareStyle, onMouseMove, onMouseLeave } = useCardTilt3D(
    tiltEnabled && !locked && Boolean(item),
  );
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={cardStyle}
      className={`relative overflow-hidden aspect-square rounded-lg border p-1.5 flex flex-col items-center justify-between text-center transition-all ${
        locked
          ? 'bg-[#A855F7]/20 border-[#A855F7] cursor-not-allowed opacity-70'
          : selected
            ? 'bg-[#F4B942]/28 border-[#F4B942] shadow-[0_0_16px_rgba(244,185,66,0.4)] -translate-y-0.5 cursor-pointer'
            : isBelt
              ? 'bg-[#1D284C]/85 border-[#F4B942]/65 hover:border-[#F4B942] cursor-pointer'
              : 'glass-subcard hover:border-[#38E8D8]/70 cursor-pointer'
      }`}
    >
      {glareStyle && (
        <span className="pointer-events-none absolute inset-0 rounded-lg" style={glareStyle} />
      )}
      <span className="self-start text-[9px] font-bold text-[#9EB4DA]">
        {isBelt ? `B${idx + 1}` : idx + 1}
      </span>

      {item ? (
        <>
          <div
            className="w-6 h-6 rounded border border-[#FFF4DC]/65 shadow-[0_0_10px_rgba(255,244,220,0.2)]"
            style={{ backgroundColor: item.color }}
          />
          <div className="w-full">
            <div className="text-[10px] font-bold text-[#FFF4DC] truncate">{item.name}</div>
            <div className="flex items-center justify-center gap-1 flex-wrap">
              <span className="tabular-nums text-[10px] font-bold text-[#F4B942]">{effVal}g</span>
              {item.pristine && (
                <span className="text-[9px] font-bold text-[#08121E] bg-[#F4B942] px-1 rounded">
                  2×
                </span>
              )}
              {item.bountySealed && (
                <span className="text-[9px] font-bold text-[#08121E] bg-[#38E8D8] px-1 rounded">
                  3×
                </span>
              )}
              {item.fused && (
                <span className="text-[9px] font-bold text-[#FFF4DC] bg-[#7C3AED] px-1 rounded">
                  ✦
                </span>
              )}
            </div>
          </div>
          {item.curse !== 'none' && (
            <span
              className="absolute top-1 right-1 px-1 rounded text-[8px] font-bold uppercase text-white"
              style={{ backgroundColor: CURSE_COLORS[item.curse] ?? '#233D63' }}
            >
              {item.curse}
            </span>
          )}
        </>
      ) : (
        <span className="text-[10px] text-[#9EB4DA]/45 font-semibold my-auto">
          {locked ? 'LOCKED' : '—'}
        </span>
      )}
    </button>
  );
}

export function BackpackModal({
  lang,
  bag,
  inDungeon,
  evacuateCost,
  gold,
  tiltEnabled = false,
  onSwap,
  onEvacuate,
  onClose,
}: BackpackModalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSlotClick = (idx: number) => {
    if (isSlotLocked(bag, idx)) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      onSwap(selectedIdx, idx);
      setSelectedIdx(null);
    }
  };

  return (
    <div
      data-ui-interactive="true"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'bag_title')}
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/88 p-4"
    >
      <div className="glass-panel w-full max-w-xl rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#F4B942]/30 pb-2.5">
          <div>
            <h2 className="font-ledger text-2xl font-bold text-[#FFF4DC]">
              {t(lang, 'bag_title')}
            </h2>
            <p className="text-[11px] font-semibold text-[#38E8D8]">
              Slots 1–3 = Safe Belt · Tap/Click two slots to rearrange
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-btn cursor-pointer px-3 py-1 rounded-lg font-bold text-sm"
          >
            {t(lang, 'close')}
          </button>
        </div>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${BAG_COLS}, minmax(0, 1fr))` }}
        >
          {bag.map((item, idx) => (
            <BagSlotCard
              key={idx}
              idx={idx}
              item={item}
              locked={isSlotLocked(bag, idx)}
              isBelt={idx < BELT_SAFE_SLOTS}
              selected={selectedIdx === idx}
              effVal={computeEffectiveItemValue(bag, idx)}
              tiltEnabled={tiltEnabled}
              onClick={() => handleSlotClick(idx)}
            />
          ))}
        </div>

        <div className="glass-subcard rounded-lg p-2.5 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#F4B942]">
            {t(lang, 'belt_runes_label')}
          </div>
          {(() => {
            const perks = computeBeltPerks(bag);
            const pills: string[] = [];
            if (perks.speedMult > 1) pills.push(t(lang, 'belt_perk_astral'));
            if (perks.floorHeal > 0) pills.push(t(lang, 'belt_perk_hearth'));
            if (perks.abyssPoison) pills.push(t(lang, 'belt_perk_abyss'));
            if (perks.dmgMult > 1) pills.push(t(lang, 'belt_perk_forge'));
            if (pills.length === 0) {
              return <p className="text-[11px] font-semibold text-[#9EB4DA]">{t(lang, 'belt_empty')}</p>;
            }
            return (
              <div className="flex flex-wrap gap-1.5">
                {pills.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded bg-[#1A2547] border border-[#38E8D8]/50 text-[10px] font-bold text-[#38E8D8]"
                  >
                    ✦ {label}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {(() => {
          const eraSets = computePackSetBonuses(bag);
          if (eraSets.length === 0) return null;
          return (
            <div
              data-testid="bag-era-sets"
              className="glass-subcard rounded-lg p-2.5 flex flex-wrap items-center gap-2 border border-[#F4B942]/50"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F4B942]">
                ✦ {t(lang, 'pack_set_label')}:
              </span>
              {eraSets.map((era) => (
                <span
                  key={era}
                  className="px-2 py-0.5 rounded bg-[#231942] border border-[#F4B942]/60 text-[10px] font-bold uppercase text-[#F4B942]"
                >
                  {era} +15%
                </span>
              ))}
            </div>
          );
        })()}

        <p className="text-[11px] font-semibold text-[#9EB4DA] leading-snug">
          {t(lang, 'bag_curses_legend')}
        </p>
        <p className="text-[11px] font-semibold text-[#38E8D8] leading-snug">
          ✦ Elemental Fusion: Adjacent identical relics fuse into a 1.45× Radiant Relic on safe extraction! · Void: +25% per empty neighbor.
        </p>

        {inDungeon && (
          <div className="flex items-center justify-between pt-2 border-t border-[#F4B942]/20">
            <span className="text-xs font-bold text-[#FFF4DC]">
              {t(lang, 'hud_evacuate')} ({evacuateCost}g)
            </span>
            <button
              type="button"
              disabled={gold < evacuateCost}
              onClick={onEvacuate}
              className="glass-teal-btn cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold text-sm"
            >
              {t(lang, 'hud_evacuate')} (-{evacuateCost}g)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
