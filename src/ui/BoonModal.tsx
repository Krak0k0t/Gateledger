import { useEffect } from 'react';
import { getPotentialSynergiesForChoice, type BoonDef, type BoonId } from '../systems/boons';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';
import { useCardTilt3D } from './TiltCard';

interface BoonModalProps {
  lang: LanguageCode;
  choices: BoonDef[];
  ownedBoons?: BoonId[];
  tiltEnabled: boolean;
  rerollsLeft?: number;
  onReroll?: () => void;
  onSelect: (boon: BoonDef) => void;
}

interface BoonCardProps {
  lang: LanguageCode;
  boon: BoonDef;
  ownedBoons: BoonId[];
  index: number;
  tiltEnabled: boolean;
  onSelect: () => void;
}

function BoonCard({ lang, boon, ownedBoons, index, tiltEnabled, onSelect }: BoonCardProps) {
  const { cardStyle, glareStyle, onMouseMove, onMouseLeave } = useCardTilt3D(tiltEnabled);
  const potentialSynergies = getPotentialSynergiesForChoice(boon.id, ownedBoons);
  return (
    <button
      type="button"
      data-testid={`boon-card-${boon.id}`}
      onClick={onSelect}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={cardStyle}
      className={`glass-subcard relative overflow-hidden cursor-pointer flex flex-col justify-between gap-3 p-4 rounded-xl border text-left transition-all shadow-[0_6px_22px_rgba(4,7,18,0.6)] ${
        potentialSynergies.length > 0
          ? 'border-[#F4B942]/80 hover:border-[#FFF4DC]'
          : 'border-[#38E8D8]/40 hover:border-[#F4B942]'
      }`}
    >
      {glareStyle && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={glareStyle}
        />
      )}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border"
          style={{
            backgroundColor: '#0C1429',
            borderColor: boon.accent,
            color: boon.accent,
          }}
        >
          {boon.icon}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#0A1024] border border-[#F4B942]/45 text-[10px] font-bold text-[#F4B942]">
          [{index + 1}]
        </span>
      </div>
      <div className="relative z-10 flex flex-col gap-1">
        <div className="font-ledger text-base sm:text-lg font-bold leading-snug" style={{ color: boon.accent }}>
          {t(lang, boon.nameKey as TranslationKey)}
        </div>
        <p className="text-xs font-semibold text-[#D9E2F5] leading-relaxed">
          {t(lang, boon.descKey as TranslationKey)}
        </p>
        {potentialSynergies.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {potentialSynergies.map((syn) => (
              <div
                key={syn.id}
                data-testid={`boon-synergy-hint-${syn.id}`}
                className="px-2 py-1 rounded bg-[#231942] border border-[#F4B942]/65 text-[10px] font-bold text-[#F4B942]"
              >
                ✦ {t(lang, 'synergy_label')}: {syn.icon} {t(lang, syn.nameKey as TranslationKey)}
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function BoonModal({
  lang,
  choices,
  ownedBoons = [],
  tiltEnabled,
  rerollsLeft = 0,
  onReroll,
  onSelect,
}: BoonModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && choices[0]) {
        e.preventDefault();
        onSelect(choices[0]);
      } else if (e.key === '2' && choices[1]) {
        e.preventDefault();
        onSelect(choices[1]);
      } else if (e.key === '3' && choices[2]) {
        e.preventDefault();
        onSelect(choices[2]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [choices, onSelect]);

  return (
    <div
      data-ui-interactive="true"
      data-testid="boon-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'boon_modal_title')}
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/84 p-4"
    >
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="border-b border-[#38E8D8]/35 pb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-ledger text-2xl sm:text-3xl font-bold text-[#FFF4DC]">
              ✦ {t(lang, 'boon_modal_title')}
            </h2>
            <p className="text-xs font-bold text-[#38E8D8] mt-0.5">
              {t(lang, 'boon_modal_sub')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {rerollsLeft > 0 && onReroll && (
              <button
                type="button"
                data-testid="btn-boon-reroll"
                onClick={onReroll}
                className="glass-teal-btn cursor-pointer px-3 py-1.5 rounded-lg font-bold text-xs"
              >
                🎲 {t(lang, 'boon_reroll')} ({rerollsLeft})
              </button>
            )}
            <span className="hidden sm:inline text-[11px] font-bold text-[#F4B942]">
              {t(lang, 'boon_choose_hint')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {choices.map((boon, idx) => (
            <BoonCard
              key={boon.id}
              lang={lang}
              boon={boon}
              ownedBoons={ownedBoons}
              index={idx}
              tiltEnabled={tiltEnabled}
              onSelect={() => onSelect(boon)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
