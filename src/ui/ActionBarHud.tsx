import { memo, useState } from 'react';
import type { VirtualAction } from '../core/input';
import { formatKeybindLabel, type KeybindAction, type KeybindMap } from '../core/settings';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';
import { HERO_ABILITIES, type AbilityDef, type AbilityId } from '../systems/abilities';
import type { LiveHudState } from '../view/gateScene';

interface ActionBarHudProps {
  lang: LanguageCode;
  hud: LiveHudState;
  keybinds: KeybindMap;
  onTriggerAction: (action: VirtualAction) => void;
}

function AbilityIconSvg({ id, color }: { id: AbilityId; color: string }) {
  switch (id) {
    case 'whirlwind':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 0 1 8.5 6" />
          <path d="M21 12a9 9 0 0 1-6 8.5" />
          <path d="M12 21a9 9 0 0 1-8.5-6" />
          <path d="M3 12a9 9 0 0 1 6-8.5" />
          <circle cx="12" cy="12" r="2.5" fill={color} />
        </svg>
      );
    case 'leap_slam':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16c2-6 4-10 6-10s4 4 6 10" />
          <path d="M12 6v10" />
          <path d="M4 19h16" />
          <path d="M7 21h10" />
        </svg>
      );
    case 'blade_volley':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17L19 5" />
          <path d="M4 11l9-7" />
          <path d="M11 20l9-8" />
          <path d="M15 5h4v4" />
        </svg>
      );
    case 'ignis_cone':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c2.5 3 5 5.6 5 9a5 5 0 1 1-10 0c0-2.2 1.2-4.2 2.4-5.7.2 1.6 1.2 2.7 2.2 2.7.5-2.1.4-4-.4-6z" />
          <path d="M10 15a2 2 0 0 0 4 0c0-1-.8-1.8-2-2.8-1.2 1-2 1.8-2 2.8z" fill={color} />
        </svg>
      );
    case 'aegis_ward':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 3v5.5c0 4.5-3 8.1-7 9.5-4-1.4-7-5-7-9.5V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'frost_nova':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
          <circle cx="12" cy="12" r="2.2" fill={color} />
        </svg>
      );
  }
}

export const ActionBarHud = memo(function ActionBarHud({
  lang,
  hud,
  keybinds,
  onTriggerAction,
}: ActionBarHudProps) {
  const [bouncedId, setBouncedId] = useState<string | null>(null);
  const inDungeon = hud.zone === 'dungeon';
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const manaPct = Math.max(0, Math.min(100, (hud.mana / Math.max(1, hud.maxMana)) * 100));

  const pulseSlot = (id: string) => {
    setBouncedId(id);
    window.setTimeout(() => {
      setBouncedId((cur) => (cur === id ? null : cur));
    }, 150);
  };

  const renderCoreSlot = ({
    testId,
    action,
    bindKey,
    label,
    hint,
    accent,
    active,
    badge,
    svg,
  }: {
    testId: string;
    action: VirtualAction;
    bindKey: KeybindAction;
    label: string;
    hint: string;
    accent: string;
    active?: boolean;
    badge?: string;
    svg: React.ReactNode;
  }) => (
    <button
      key={testId}
      type="button"
      data-ui-interactive="true"
      data-testid={testId}
      aria-label={`${label} (${formatKeybindLabel(keybinds[bindKey])})`}
      title={`${label} [${formatKeybindLabel(keybinds[bindKey])}] — ${hint}`}
      onClick={(e) => {
        e.currentTarget.blur();
        onTriggerAction(action);
      }}
      className="group relative flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#0A1022] border transition-transform active:scale-95 cursor-pointer"
      style={{
        borderColor: active ? '#F4B942' : `${accent}66`,
        boxShadow: active ? `0 0 12px ${accent}55` : 'inset 0 1px 0 rgba(255,244,220,0.08)',
      }}
    >
      <span className="pointer-events-none">{svg}</span>
      <span
        data-testid={`badge-${bindKey}`}
        className="pointer-events-none absolute -top-1.5 -left-1 px-1 py-px rounded bg-[#050814] border border-[#9EB4DA]/45 text-[9px] font-bold leading-none text-[#FFF4DC] tabular-nums"
      >
        {formatKeybindLabel(keybinds[bindKey])}
      </span>
      {badge && (
        <span
          className="pointer-events-none absolute -bottom-1 -right-1 px-1 py-px rounded bg-[#050814] border text-[9px] font-bold leading-none tabular-nums"
          style={{ borderColor: `${accent}88`, color: accent }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  const renderAbilitySlot = (ab: AbilityDef) => {
    const cd = hud.abilityCooldowns[ab.id] ?? 0;
    const ratio = hud.abilityCdRatios[ab.id] ?? 0;
    const noMana = hud.mana < ab.manaCost;
    const onCd = cd > 0.05;
    const vAction = ab.actionKey as VirtualAction;
    const keyLabel = formatKeybindLabel(keybinds[ab.actionKey]);
    const abName = t(lang, ab.nameKey as TranslationKey);
    const abDesc = t(lang, ab.descKey as TranslationKey);
    const kindLabel = t(lang, ab.category === 'magic' ? 'hud_ability_magic' : 'hud_ability_phys');

    return (
      <div key={ab.id} className="relative group">
        {/* Hover Tooltip */}
        <div className="pointer-events-none hidden group-hover:flex flex-col gap-0.5 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-2.5 py-2 rounded-lg bg-[#070B18]/98 border border-[#F4B942]/45 shadow-[0_8px_22px_rgba(4,7,18,0.9)] z-40">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold" style={{ color: ab.accent }}>
              {abName}
            </span>
            <span className="text-[9px] font-bold px-1 py-px rounded bg-[#141E3A] text-[#9EB4DA]">
              {kindLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold tabular-nums">
            <span className="text-[#60A5FA]">
              {ab.manaCost > 0 ? `${ab.manaCost} MP` : '0 MP'}
            </span>
            <span className="text-[#9EB4DA]">CD {ab.cooldown.toFixed(1)}s</span>
          </div>
          <p className="text-[10px] text-[#DCE6F7] leading-snug">{abDesc}</p>
        </div>

        <button
          type="button"
          data-ui-interactive="true"
          data-testid={`slot-ability-${ab.id}`}
          aria-label={`${abName} (${keyLabel})`}
          onClick={(e) => {
            e.currentTarget.blur();
            pulseSlot(ab.id);
            onTriggerAction(vAction);
          }}
          className={`relative overflow-hidden flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg border transition-transform duration-150 active:scale-90 cursor-pointer ${
            bouncedId === ab.id ? 'scale-90' : 'scale-100'
          } ${noMana && inDungeon ? 'bg-[#11152A] opacity-65' : 'bg-[#0B1226]'}`}
          style={{
            borderColor: onCd ? '#364469' : ab.category === 'magic' ? '#38E8D899' : '#F4B94299',
            boxShadow:
              !onCd && !noMana
                ? `inset 0 0 12px ${ab.accent}22, 0 2px 10px rgba(4,7,18,0.65)`
                : 'none',
          }}
        >
          <AbilityIconSvg id={ab.id} color={onCd ? '#64748B' : ab.accent} />

          {/* Clockwise radial sector cooldown sweep */}
          {onCd && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `conic-gradient(rgba(4,7,18,0.84) ${Math.round(ratio * 360)}deg, transparent ${Math.round(ratio * 360)}deg)`,
              }}
            />
          )}

          {/* Cooldown timer */}
          {onCd && (
            <span
              data-testid={`cd-ability-${ab.id}`}
              className="pointer-events-none relative z-10 text-xs font-bold text-[#FFF4DC] tabular-nums drop-shadow-[0_1px_2px_#000]"
            >
              {cd.toFixed(1)}
            </span>
          )}

          {/* Keybind Badge */}
          <span
            data-testid={`badge-${ab.actionKey}`}
            className="pointer-events-none absolute top-0.5 left-0.5 px-1 py-px rounded bg-[#040712]/90 border border-[#9EB4DA]/40 text-[9px] font-bold leading-none text-[#FFF4DC] tabular-nums"
          >
            {keyLabel}
          </span>

          {/* Mana Cost Badge */}
          {ab.manaCost > 0 && (
            <span
              className={`pointer-events-none absolute bottom-0.5 right-0.5 px-1 py-px rounded bg-[#040712]/90 text-[9px] font-bold leading-none tabular-nums ${
                noMana && inDungeon ? 'text-[#FF4D6D]' : 'text-[#60A5FA]'
              }`}
            >
              {ab.manaCost}
            </span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div
      data-testid="action-bar-hud"
      className="pointer-events-none flex flex-col items-center gap-1.5 max-w-[calc(100vw-0.75rem)] select-none"
    >
      {/* Vitality + Mana + Dodge Pips Status Header */}
      <div className="pointer-events-none flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 px-2.5 sm:px-3 py-1 rounded-lg bg-[#070C1B]/92 border border-[#F4B942]/35 shadow-[0_6px_18px_rgba(4,7,18,0.8)]">
        {/* Vitality */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#FF6B81]">HP</span>
          <div className="w-16 sm:w-28 h-2 rounded-sm bg-[#040712] border border-[#FF4D6D]/50 overflow-hidden">
            <div
              className="h-full transition-[width] duration-100"
              style={{
                width: `${hpPct}%`,
                background: 'linear-gradient(90deg, #BE123C, #FB7185)',
              }}
            />
          </div>
          <span data-testid="actionbar-hp" className="text-[11px] font-bold text-[#FFF4DC] tabular-nums">
            {hud.hp}/{hud.maxHp}
          </span>
        </div>

        {/* Mana / Focus */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#60A5FA]">{t(lang, 'hud_mana')}</span>
          <div className="w-16 sm:w-28 h-2 rounded-sm bg-[#040712] border border-[#3B82F6]/55 overflow-hidden">
            <div
              className="h-full transition-[width] duration-100"
              style={{
                width: `${manaPct}%`,
                background: 'linear-gradient(90deg, #1D4ED8, #38E8D8)',
              }}
            />
          </div>
          <span data-testid="actionbar-mana" className="text-[11px] font-bold text-[#93C5FD] tabular-nums">
            {hud.mana}/{hud.maxMana}
          </span>
        </div>

        {/* Dodge Charges */}
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-[10px] font-bold text-[#38E8D8]">{t(lang, 'hud_dodge')}</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: hud.maxDodgeCharges }).map((_, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rotate-45 rounded-[2px] border ${
                  idx < hud.dodgeCharges
                    ? 'bg-[#38E8D8] border-[#FFF4DC]'
                    : 'bg-[#0B1224] border-[#38E8D8]/35'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Active Defensive Buffs & Combat Combo Streak */}
        {hud.comboStreak >= 2 && (
          <span
            data-testid="actionbar-combo-badge"
            className="px-1.5 py-0.5 rounded bg-[#3A2104] border border-[#F4B942] text-[10px] font-bold text-[#F4B942] tabular-nums shadow-[0_0_10px_rgba(244,185,66,0.35)]"
          >
            ★ ×{hud.comboStreak} {t(lang, 'hud_combo_hits')} (+{Math.min(15, hud.comboStreak)}%)
          </span>
        )}
        {hud.aegisShieldHits > 0 && (
          <span
            data-testid="actionbar-aegis-badge"
            className="px-1.5 py-0.5 rounded bg-[#422006] border border-[#F4B942] text-[10px] font-bold text-[#F4B942] tabular-nums"
          >
            ◈ {t(lang, 'hud_aegis_active')} ×{hud.aegisShieldHits}
          </span>
        )}
        {hud.blocking && (
          <span
            data-testid="actionbar-blocking-badge"
            className="px-1.5 py-0.5 rounded bg-[#0F2A3F] border border-[#38E8D8] text-[10px] font-bold text-[#38E8D8]"
          >
            🛡 {t(lang, 'hud_block')}
          </span>
        )}
      </div>

      {/* Main Hotbar Row: Martial Verbs | 6 Warcraft/Witcher Abilities | Potion */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-[#070B19]/94 border border-[#F4B942]/45 shadow-[0_12px_28px_rgba(4,7,18,0.88)]">
        {/* Core Combat Verbs */}
        <div className="flex items-center gap-1.5">
          {renderCoreSlot({
            testId: 'slot-verb-attack',
            action: 'attack',
            bindKey: 'attack',
            label: t(lang, 'hud_attack'),
            hint: '3-hit combo + Mana on hit',
            accent: '#FF9E44',
            svg: (
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="#FF9E44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6" />
                <path d="M16 16l4 4" />
                <path d="M19 21l2-2" />
              </svg>
            ),
          })}
          {renderCoreSlot({
            testId: 'slot-verb-block',
            action: 'block',
            bindKey: 'block',
            label: t(lang, 'hud_parry'),
            hint: 'Hold to block, time to parry (+20 MP)',
            accent: '#38E8D8',
            active: hud.blocking || hud.aegisShieldHits > 0,
            svg: (
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="#38E8D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z" />
              </svg>
            ),
          })}
          {renderCoreSlot({
            testId: 'slot-verb-dodge',
            action: 'dodge',
            bindKey: 'dodge',
            label: t(lang, 'hud_dodge'),
            hint: 'Fast roll with i-frames',
            accent: '#38E8D8',
            badge: `${hud.dodgeCharges}`,
            svg: (
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="#38E8D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17h7l4-5-3-4H7" />
                <path d="M3 12h5" />
                <path d="M14 17l5-5" />
              </svg>
            ),
          })}
          {renderCoreSlot({
            testId: 'slot-verb-jump',
            action: 'jump',
            bindKey: 'jump',
            label: t(lang, 'hud_jump'),
            hint: 'Leap & aerial slam with Attack',
            accent: '#F4B942',
            badge: hud.maxJumpCharges > 1 ? `${hud.jumpCharges}` : undefined,
            svg: (
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="#F4B942" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 18V5" />
                <path d="M7 10l5-5 5 5" />
                <path d="M5 20h14" />
              </svg>
            ),
          })}
        </div>

        <div className="hidden sm:block h-8 w-px bg-[#F4B942]/30 mx-0.5" />

        {/* 6 Physical & Magic Abilities (1-6) */}
        <div className="flex items-center gap-1.5">
          {HERO_ABILITIES.map((ab) => renderAbilitySlot(ab))}
        </div>

        <div className="hidden sm:block h-8 w-px bg-[#F4B942]/30 mx-0.5" />

        {/* Healing Flask */}
        <button
          type="button"
          data-ui-interactive="true"
          data-testid="slot-verb-heal"
          aria-label={`${t(lang, 'hud_potion')} (${formatKeybindLabel(keybinds.heal)})`}
          title={`${t(lang, 'hud_potion')} [${formatKeybindLabel(keybinds.heal)}]`}
          onClick={(e) => {
            e.currentTarget.blur();
            onTriggerAction('heal');
          }}
          className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg border transition-transform active:scale-95 cursor-pointer ${
            hud.potions > 0
              ? 'bg-[#280D18] border-[#FF4D6D]/75'
              : 'bg-[#0A1022] border-[#364469] opacity-50'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="#FF6B81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3h4" />
            <path d="M10 3v3l-4.5 7.5A3 3 0 0 0 8.1 18h7.8a3 3 0 0 0 2.6-4.5L14 6V3" />
          </svg>
          <span
            data-testid="badge-heal"
            className="pointer-events-none absolute -top-1.5 -left-1 px-1 py-px rounded bg-[#050814] border border-[#9EB4DA]/45 text-[9px] font-bold leading-none text-[#FFF4DC] tabular-nums"
          >
            {formatKeybindLabel(keybinds.heal)}
          </span>
          <span className="pointer-events-none absolute -bottom-1 -right-1 px-1 py-px rounded bg-[#050814] border border-[#FF4D6D]/80 text-[9px] font-bold leading-none text-[#FF6B81] tabular-nums">
            ×{hud.potions}
          </span>
        </button>
      </div>
    </div>
  );
});
