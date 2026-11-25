import { useState } from 'react';
import {
  computeCharterBonuses,
  computePactModifiers,
  GATE_PACTS,
  getNextTalentCost,
  GUILD_TALENTS,
  type GuildTalentId,
  type PactId,
} from '../systems/charter';
import {
  FAMILIARS,
  type FamiliarId,
} from '../systems/expedition';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';
import { useCardTilt3D } from './TiltCard';

interface CharterModalProps {
  lang: LanguageCode;
  gateShards: number;
  playerGold: number;
  talentLevels: Record<string, number>;
  activePacts: PactId[];
  unlockedFamiliars: FamiliarId[];
  equippedFamiliar: FamiliarId;
  tiltEnabled: boolean;
  onUpgradeTalent: (id: GuildTalentId) => void;
  onTogglePact: (id: PactId) => void;
  onUnlockFamiliar: (id: Exclude<FamiliarId, 'none'>, payWith: 'shards' | 'gold') => void;
  onEquipFamiliar: (id: FamiliarId) => void;
  onClose: () => void;
}

type CharterTab = 'talents' | 'pacts' | 'familiars';

function TalentCard({
  lang,
  id,
  icon,
  accent,
  nameKey,
  descKey,
  level,
  maxLevel,
  cost,
  gateShards,
  tiltEnabled,
  onUpgrade,
}: {
  lang: LanguageCode;
  id: GuildTalentId;
  icon: string;
  accent: string;
  nameKey: string;
  descKey: string;
  level: number;
  maxLevel: number;
  cost: number | null;
  gateShards: number;
  tiltEnabled: boolean;
  onUpgrade: () => void;
}) {
  const { cardStyle, glareStyle, onMouseMove, onMouseLeave } = useCardTilt3D(tiltEnabled);
  const maxed = cost === null;
  const canAfford = cost !== null && gateShards >= cost;

  return (
    <div
      data-testid={`talent-card-${id}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={cardStyle}
      className="glass-subcard relative overflow-hidden rounded-xl p-3.5 flex flex-col justify-between gap-2.5 border border-[#F4B942]/30"
    >
      {glareStyle && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-xl" style={glareStyle} />
      )}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base border shrink-0"
            style={{ backgroundColor: '#0C1429', borderColor: accent, color: accent }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <div className="font-bold text-xs sm:text-sm text-[#FFF4DC] leading-tight">
              {t(lang, nameKey as TranslationKey)}
            </div>
            <div className="text-[10px] font-bold text-[#38E8D8]">
              Lv {level}/{maxLevel}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {Array.from({ length: maxLevel }).map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-sm border"
              style={{
                backgroundColor: i < level ? accent : '#0A1024',
                borderColor: i < level ? accent : '#4B5B84',
              }}
            />
          ))}
        </div>
      </div>

      <p className="relative z-10 text-[11px] font-semibold text-[#9EB4DA] leading-snug">
        {t(lang, descKey as TranslationKey)}
      </p>

      <button
        type="button"
        data-testid={`btn-upgrade-talent-${id}`}
        disabled={maxed || !canAfford}
        onClick={onUpgrade}
        className={`relative z-10 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
          maxed ? 'glass-teal-btn' : canAfford ? 'glass-gold-btn' : 'glass-btn'
        }`}
      >
        {maxed ? t(lang, 'charter_maxed') : `${t(lang, 'charter_upgrade')} (${cost} ◆)`}
      </button>
    </div>
  );
}

export function CharterModal({
  lang,
  gateShards,
  playerGold,
  talentLevels,
  activePacts,
  unlockedFamiliars,
  equippedFamiliar,
  tiltEnabled,
  onUpgradeTalent,
  onTogglePact,
  onUnlockFamiliar,
  onEquipFamiliar,
  onClose,
}: CharterModalProps) {
  const [tab, setTab] = useState<CharterTab>('talents');
  const bonuses = computeCharterBonuses(talentLevels);
  const pactMods = computePactModifiers(activePacts);
  const activeSet = new Set(activePacts);
  const unlockedFamSet = new Set<FamiliarId>(unlockedFamiliars);

  return (
    <div
      data-ui-interactive="true"
      data-testid="charter-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'charter_title')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/88 p-3 sm:p-5"
    >
      <div className="glass-panel w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#F4B942]/30 pb-3">
          <div>
            <h2 className="font-ledger text-2xl sm:text-3xl font-bold text-[#FFF4DC]">
              📜 {t(lang, 'charter_title')}
            </h2>
            <p className="text-xs font-bold text-[#38E8D8] mt-0.5">
              ◆ {t(lang, 'shards_label')}:{' '}
              <span data-testid="charter-shards-count" className="tabular-nums text-[#F4B942]">
                {gateShards}
              </span>{' '}
              · ★ {t(lang, 'pact_heat_label')}:{' '}
              <span className="tabular-nums text-[#FF9E44]">
                {pactMods.heatLevel} (+{Math.round((pactMods.shardMult - 1) * 100)}% ◆)
              </span>
            </p>
          </div>
          <button
            type="button"
            data-testid="btn-close-charter"
            onClick={onClose}
            className="glass-btn cursor-pointer px-3.5 py-1.5 rounded-lg font-bold text-sm"
          >
            {t(lang, 'close')}
          </button>
        </div>

        {/* Summary Strip */}
        <div className="glass-subcard rounded-lg px-3.5 py-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#D9E2F5]">
          <span className="text-[#FF4D6D]">+{bonuses.bonusHp} HP</span>
          <span className="text-[#F4B942]">+{bonuses.bonusGold}g</span>
          <span className="text-[#38E8D8]">🎲 {bonuses.boonRerolls}</span>
          <span className="text-[#F4B942]">
            +{Math.round((bonuses.fairPriceMult - 1) * 100)}% {t(lang, 'hud_gold')}
          </span>
          <span className="text-[#FF9E44]">
            +{bonuses.bonusPotions} 🧪 · +{Math.round((bonuses.bonusDmgMult - 1) * 100)}% DMG
          </span>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="tab-charter-talents"
            onClick={() => setTab('talents')}
            className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'talents' ? 'glass-gold-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            📜 {t(lang, 'charter_tab_talents')}
          </button>
          <button
            type="button"
            data-testid="tab-charter-pacts"
            onClick={() => setTab('pacts')}
            className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'pacts' ? 'glass-teal-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            🔥 {t(lang, 'charter_tab_pacts')} ({pactMods.heatLevel}/5)
          </button>
          <button
            type="button"
            data-testid="tab-charter-familiars"
            onClick={() => setTab('familiars')}
            className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'familiars' ? 'glass-gold-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            🐾 {t(lang, 'charter_tab_familiars')} ({unlockedFamiliars.length}/3)
          </button>
        </div>

        {tab === 'talents' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {GUILD_TALENTS.map((tl) => {
              const lvl = talentLevels[tl.id] ?? 0;
              const cost = getNextTalentCost(tl.id, lvl);
              return (
                <TalentCard
                  key={tl.id}
                  lang={lang}
                  id={tl.id}
                  icon={tl.icon}
                  accent={tl.accent}
                  nameKey={tl.nameKey}
                  descKey={tl.descKey}
                  level={lvl}
                  maxLevel={tl.maxLevel}
                  cost={cost}
                  gateShards={gateShards}
                  tiltEnabled={tiltEnabled}
                  onUpgrade={() => onUpgradeTalent(tl.id)}
                />
              );
            })}
          </div>
        ) : tab === 'pacts' ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold text-[#9EB4DA]">
              {t(lang, 'pacts_intro')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GATE_PACTS.map((pact) => {
                const active = activeSet.has(pact.id);
                return (
                  <button
                    key={pact.id}
                    type="button"
                    data-testid={`pact-toggle-${pact.id}`}
                    aria-pressed={active}
                    onClick={() => onTogglePact(pact.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 flex items-start justify-between gap-3 text-left transition-all ${
                      active
                        ? 'bg-[#2B152B] border-[#FF5E3A] shadow-[0_0_16px_rgba(255,94,58,0.28)]'
                        : 'glass-subcard hover:border-[#38E8D8]/60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base border shrink-0"
                        style={{
                          backgroundColor: '#0C1429',
                          borderColor: active ? pact.accent : '#4B5B84',
                          color: pact.accent,
                        }}
                      >
                        {pact.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#FFF4DC]">
                          {t(lang, pact.nameKey as TranslationKey)}
                        </div>
                        <p className="text-[11px] font-semibold text-[#9EB4DA] leading-snug mt-0.5">
                          {t(lang, pact.descKey as TranslationKey)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#0A1024] border border-[#F4B942]/45 text-[10px] font-bold text-[#F4B942]">
                        +{pact.shardBonusPct}% ◆
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          active ? 'text-[#FF5E3A]' : 'text-[#9EB4DA]/65'
                        }`}
                      >
                        {active ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div data-testid="charter-familiars-panel" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FAMILIARS.map((fam) => {
              const unlocked = unlockedFamSet.has(fam.id);
              const isEquipped = equippedFamiliar === fam.id;
              const canBuyShards = gateShards >= fam.shardCost;
              const canBuyGold = playerGold >= fam.goldCost;
              return (
                <div
                  key={fam.id}
                  data-testid={`familiar-card-${fam.id}`}
                  className={`glass-subcard rounded-xl p-3.5 flex flex-col justify-between gap-2.5 border ${
                    isEquipped ? 'border-[#38E8D8] bg-[#102636]/75' : 'border-[#F4B942]/30'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border shrink-0"
                        style={{
                          backgroundColor: '#0C1429',
                          borderColor: fam.accent,
                          color: fam.accent,
                        }}
                      >
                        {fam.icon}
                      </span>
                      <div className="font-bold text-sm text-[#FFF4DC] leading-tight">
                        {t(lang, fam.nameKey as TranslationKey)}
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-[#9EB4DA] leading-snug">
                      {t(lang, fam.descKey as TranslationKey)}
                    </p>
                  </div>
                  {unlocked ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        data-testid={`btn-equip-familiar-${fam.id}`}
                        onClick={() => onEquipFamiliar(isEquipped ? 'none' : fam.id)}
                        className={`cursor-pointer w-full py-1.5 px-3 rounded-lg text-xs font-bold ${
                          isEquipped ? 'glass-teal-btn' : 'glass-gold-btn'
                        }`}
                      >
                        {isEquipped ? t(lang, 'fam_active') : t(lang, 'fam_equip')}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        data-testid={`btn-unlock-familiar-shards-${fam.id}`}
                        disabled={!canBuyShards}
                        onClick={() => onUnlockFamiliar(fam.id, 'shards')}
                        className="cursor-pointer py-1.5 px-2 rounded-lg text-[11px] font-bold glass-teal-btn disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t(lang, 'fam_unlock_shards', { s: fam.shardCost })}
                      </button>
                      <button
                        type="button"
                        data-testid={`btn-unlock-familiar-gold-${fam.id}`}
                        disabled={!canBuyGold}
                        onClick={() => onUnlockFamiliar(fam.id, 'gold')}
                        className="cursor-pointer py-1.5 px-2 rounded-lg text-[11px] font-bold glass-gold-btn disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t(lang, 'fam_unlock_gold', { g: fam.goldCost })}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
