import type { GraphicsQuality } from '../core/settings';
import { t, type LanguageCode } from '../i18n/translations';

interface GraphicsQualitySwitchProps {
  lang: LanguageCode;
  value: GraphicsQuality;
  onChange: (next: GraphicsQuality) => void;
  testIdPrefix?: string;
  compact?: boolean;
}

export function GraphicsQualitySwitch({
  lang,
  value,
  onChange,
  testIdPrefix = 'btn-gfx',
  compact = false,
}: GraphicsQualitySwitchProps) {
  const options: { id: GraphicsQuality; label: string }[] = [
    { id: 'ultra', label: t(lang, 'settings_gfx_ultra') },
    { id: 'high', label: t(lang, 'settings_gfx_high') },
    { id: 'medium', label: t(lang, 'settings_gfx_med') },
    { id: 'low', label: t(lang, 'settings_gfx_eco') },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {options.map((q) => {
        const active = value === q.id;
        return (
          <button
            key={q.id}
            type="button"
            data-testid={`${testIdPrefix}-${q.id}`}
            aria-pressed={active}
            onClick={() => onChange(q.id)}
            className={`cursor-pointer rounded-lg border font-bold transition-all ${
              compact ? 'py-1 px-1 text-[10px]' : 'py-1.5 px-1.5 text-[11px]'
            } ${
              active
                ? q.id === 'ultra'
                  ? 'glass-gold-btn border-[#FFE7A3]'
                  : 'glass-teal-btn border-[#A3FFF6]'
                : 'glass-subcard text-[#9EB4DA] hover:border-[#38E8D8]/60'
            }`}
          >
            {q.label}
          </button>
        );
      })}
    </div>
  );
}
