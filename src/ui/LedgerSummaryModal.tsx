import type { RelicEra } from '../systems/backpack';
import { t, type LanguageCode } from '../i18n/translations';

export interface LedgerSummaryData {
  title: string;
  goldDelta: number;
  relicsExtracted: number;
  fusedNames: string[];
  eraSets?: RelicEra[];
  beltTags: string[];
  debtPaid: number;
  debtTarget: number;
}

interface LedgerSummaryModalProps {
  lang: LanguageCode;
  data: LedgerSummaryData;
  onContinue: () => void;
}

export function LedgerSummaryModal({ lang, data, onContinue }: LedgerSummaryModalProps) {
  const debtRatio = Math.min(100, Math.round((data.debtPaid / Math.max(1, data.debtTarget)) * 100));

  return (
    <div
      data-ui-interactive="true"
      data-testid="ledger-summary-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'ledger_title')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/88 p-4"
    >
      <div className="glass-panel w-full max-w-md rounded-xl p-5 sm:p-6 flex flex-col gap-4 border border-[#F4B942]/55">
        <div className="border-b border-[#F4B942]/30 pb-2.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#38E8D8]">
            {t(lang, 'ledger_title')}
          </div>
          <h2 className="font-ledger text-2xl font-bold text-[#FFF4DC] mt-0.5">{data.title}</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="glass-subcard rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
              {t(lang, 'ledger_gold_delta')}
            </div>
            <div
              className={`tabular-nums font-ledger text-xl font-bold ${
                data.goldDelta >= 0 ? 'text-[#F4B942]' : 'text-[#FF9E44]'
              }`}
            >
              {data.goldDelta >= 0 ? `+${data.goldDelta}g` : `${data.goldDelta}g`}
            </div>
          </div>

          <div className="glass-subcard rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
              {t(lang, 'ledger_relics_extracted')}
            </div>
            <div className="tabular-nums font-ledger text-xl font-bold text-[#38E8D8]">
              {data.relicsExtracted}
            </div>
          </div>
        </div>

        {data.fusedNames.length > 0 && (
          <div className="glass-subcard rounded-lg p-3 border border-[#A855F7]/50">
            <div className="text-[10px] font-bold uppercase text-[#C084FC]">
              ✦ {t(lang, 'ledger_fused')}
            </div>
            <div className="text-xs font-bold text-[#FFF4DC] mt-0.5">
              {data.fusedNames.join(' · ')}
            </div>
          </div>
        )}

        {data.eraSets && data.eraSets.length > 0 && (
          <div className="glass-subcard rounded-lg p-3 border border-[#F4B942]/50">
            <div className="text-[10px] font-bold uppercase text-[#F4B942]">
              ✦ {t(lang, 'ledger_sets')}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.eraSets.map((era) => (
                <span
                  key={era}
                  className="px-2 py-0.5 rounded bg-[#231942] border border-[#F4B942]/60 text-[10px] font-bold uppercase text-[#F4B942]"
                >
                  {era} +15%
                </span>
              ))}
            </div>
          </div>
        )}

        {data.beltTags.length > 0 && (
          <div className="glass-subcard rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase text-[#38E8D8]">
              {t(lang, 'belt_runes_label')}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.beltTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-[#1A2547] border border-[#38E8D8]/45 text-[10px] font-bold text-[#FFF4DC]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="glass-subcard rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#9EB4DA]">{t(lang, 'ledger_debt_progress')}</span>
            <span className="tabular-nums text-[#F4B942]">
              {data.debtPaid} / {data.debtTarget}g ({debtRatio}%)
            </span>
          </div>
          <div className="h-2 w-full rounded bg-[#090F22] border border-[#F4B942]/35 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F4B942] to-[#38E8D8] transition-all"
              style={{ width: `${debtRatio}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          data-testid="btn-ledger-continue"
          onClick={onContinue}
          className="glass-gold-btn cursor-pointer w-full py-2.5 px-4 rounded-xl font-bold text-sm"
        >
          {t(lang, 'ledger_continue')}
        </button>
      </div>
    </div>
  );
}
