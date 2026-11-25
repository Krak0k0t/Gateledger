import { SUPPORTED_LANGUAGES, t, type LanguageCode } from '../i18n/translations';

interface LanguageModalProps {
  lang: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  onClose: () => void;
}

export function LanguageModal({ lang, onSelect, onClose }: LanguageModalProps) {
  return (
    <div
      data-ui-interactive="true"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'language_label')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/88 p-4"
    >
      <div className="glass-panel w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-[#F4B942]/30 pb-3 mb-4">
          <div>
            <h2 className="font-ledger text-2xl sm:text-3xl font-bold text-[#FFF4DC] drop-shadow-[0_2px_6px_rgba(244,185,66,0.3)]">
              {t(lang, 'language_label')}
            </h2>
            <p className="text-xs font-semibold text-[#38E8D8]">
              16 Languages · RTL & Fantasy Scripts Supported
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-btn cursor-pointer px-3.5 py-1.5 rounded-lg text-sm font-bold"
          >
            {t(lang, 'close')}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 overflow-y-auto pr-1">
          {SUPPORTED_LANGUAGES.map((item) => {
            const active = item.code === lang;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  onSelect(item.code);
                  onClose();
                }}
                className={`cursor-pointer text-left px-3 py-2.5 rounded-lg border transition-all ${
                  active
                    ? 'bg-gradient-to-br from-[#F4B942]/28 to-[#FF9E44]/16 border-[#F4B942] shadow-[0_0_16px_rgba(244,185,66,0.35)]'
                    : 'glass-subcard hover:border-[#38E8D8]/60 hover:bg-[#1A264A]/85'
                }`}
              >
                <div className="font-bold text-sm text-[#FFF4DC] truncate">
                  {item.nativeName}
                </div>
                <div className="text-[11px] font-semibold text-[#9EB4DA]">
                  {item.englishName}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
