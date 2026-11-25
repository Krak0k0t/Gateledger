import type { ShrineChoiceId } from '../systems/dungeonSim';
import { t, type LanguageCode } from '../i18n/translations';

interface ShrineModalProps {
  lang: LanguageCode;
  playerHp: number;
  playerMaxHp: number;
  onChoose: (choice: ShrineChoiceId) => void;
  onClose: () => void;
}

export function ShrineModal({
  lang,
  playerHp,
  playerMaxHp,
  onChoose,
  onClose,
}: ShrineModalProps) {
  const canBloodPact = playerHp > 1;
  const canGild = playerMaxHp > 1;

  return (
    <div
      data-ui-interactive="true"
      data-testid="shrine-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'shrine_title')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/88 p-4"
    >
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-5 sm:p-6 flex flex-col gap-4 border border-[#F4B942]/45">
        <div className="flex items-start justify-between gap-3 border-b border-[#F4B942]/30 pb-3">
          <div>
            <h2 className="font-ledger text-2xl sm:text-3xl font-bold text-[#F4B942]">
              ⛩ {t(lang, 'shrine_title')}
            </h2>
            <p className="text-xs font-semibold text-[#9EB4DA] mt-1">
              {t(lang, 'shrine_subtitle')} · HP {playerHp}/{playerMaxHp}
            </p>
          </div>
          <button
            type="button"
            data-testid="btn-close-shrine"
            onClick={onClose}
            className="glass-btn cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
          >
            {t(lang, 'close')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            data-testid="btn-shrine-gild"
            disabled={!canGild}
            onClick={() => onChoose('gild')}
            className="glass-subcard cursor-pointer disabled:opacity-45 hover:border-[#F4B942] rounded-xl p-4 text-left flex flex-col gap-2 border border-[#F4B942]/50 transition-colors"
          >
            <div className="text-2xl">✦</div>
            <div className="font-ledger text-base font-bold text-[#F4B942]">
              {t(lang, 'shrine_gild_title')}
            </div>
            <p className="text-xs text-[#9EB4DA] leading-snug">{t(lang, 'shrine_gild_desc')}</p>
          </button>

          <button
            type="button"
            data-testid="btn-shrine-blood"
            disabled={!canBloodPact}
            onClick={() => onChoose('blood')}
            className="glass-subcard cursor-pointer disabled:opacity-45 hover:border-[#FF4D6D] rounded-xl p-4 text-left flex flex-col gap-2 border border-[#FF4D6D]/50 transition-colors"
          >
            <div className="text-2xl">🩸</div>
            <div className="font-ledger text-base font-bold text-[#FF4D6D]">
              {t(lang, 'shrine_blood_title')}
            </div>
            <p className="text-xs text-[#9EB4DA] leading-snug">{t(lang, 'shrine_blood_desc')}</p>
          </button>

          <button
            type="button"
            data-testid="btn-shrine-mend"
            onClick={() => onChoose('mend')}
            className="glass-subcard cursor-pointer hover:border-[#38E8D8] rounded-xl p-4 text-left flex flex-col gap-2 border border-[#38E8D8]/50 transition-colors"
          >
            <div className="text-2xl">💠</div>
            <div className="font-ledger text-base font-bold text-[#38E8D8]">
              {t(lang, 'shrine_mend_title')}
            </div>
            <p className="text-xs text-[#9EB4DA] leading-snug">{t(lang, 'shrine_mend_desc')}</p>
          </button>
        </div>
      </div>
    </div>
  );
}
