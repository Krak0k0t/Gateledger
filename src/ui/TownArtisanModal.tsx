import { useState } from 'react';
import type { BagRelicItem } from '../systems/backpack';
import type { WeaponDef } from '../systems/dungeonSim';
import { TRANSMUTE_COST } from '../systems/economy';
import { EXPEDITION_SUPPLIES, type SupplyId } from '../systems/expedition';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';

export interface UpgradeDef {
  id: string;
  maxLevel: number;
  costs: number[];
  effect: string;
}

interface TownArtisanModalProps {
  lang: LanguageCode;
  mode: 'forge' | 'alchemy';
  gold: number;
  weapons: WeaponDef[];
  unlockedWeapons: string[];
  equippedWeaponId: string;
  weaponTiers?: Record<string, number>;
  upgrades: UpgradeDef[];
  upgradeLevels: Record<string, number>;
  stash?: BagRelicItem[];
  debtPaid: number;
  debtTarget: number;
  week: number;
  discountMult?: number;
  ownedSupplies?: SupplyId[];
  onUnlockOrEquipWeapon: (weaponId: string) => void;
  onTemperWeapon?: (weaponId: string) => void;
  onPurifyRelic?: (stashIdx: number) => void;
  onTransmuteRelics?: (idxA: number, idxB: number) => void;
  onBuySupply?: (supplyId: SupplyId) => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onPayDebt: (amount: number) => void;
  onClose: () => void;
}

export function TownArtisanModal({
  lang,
  mode,
  gold,
  weapons,
  unlockedWeapons,
  equippedWeaponId,
  weaponTiers = {},
  upgrades,
  upgradeLevels,
  stash = [],
  debtPaid,
  debtTarget,
  week,
  discountMult = 1,
  ownedSupplies = [],
  onUnlockOrEquipWeapon,
  onTemperWeapon,
  onPurifyRelic,
  onTransmuteRelics,
  onBuySupply,
  onBuyUpgrade,
  onPayDebt,
  onClose,
}: TownArtisanModalProps) {
  const [transmuteSelection, setTransmuteSelection] = useState<number[]>([]);
  const remainingDebt = Math.max(0, debtTarget - debtPaid);
  const cursedStash = stash
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.curse === 'pyre' || x.item.curse === 'lock');

  const validSel = transmuteSelection.filter((i) => i >= 0 && i < stash.length);
  const toggleTransmuteIdx = (idx: number) => {
    setTransmuteSelection((prev) => {
      const clean = prev.filter((i) => i >= 0 && i < stash.length);
      if (clean.includes(idx)) return clean.filter((i) => i !== idx);
      if (clean.length >= 2) return [clean[1], idx];
      return [...clean, idx];
    });
  };

  return (
    <div
      data-ui-interactive="true"
      role="dialog"
      aria-modal="true"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/88 p-4"
    >
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#F4B942]/30 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-ledger text-2xl font-bold text-[#FFF4DC]">
                {t(lang, mode === 'forge' ? 'forge_title' : 'alchemy_title')}
              </h2>
              {mode === 'forge' && discountMult < 1 && (
                <span className="px-2 py-0.5 rounded bg-[#3B1626] border border-[#FF9E44]/70 text-[10px] font-bold text-[#FF9E44]">
                  ⚒ -{Math.round((1 - discountMult) * 100)}%
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-[#F4B942]">
              {t(lang, 'hud_gold')}: <span className="tabular-nums">{gold}g</span> ·{' '}
              {t(lang, 'guild_debt_label', { w: week })}
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

        {mode === 'forge' ? (
          <div className="flex flex-col gap-2.5">
            {weapons.map((w) => {
              const unlocked = unlockedWeapons.includes(w.id);
              const equipped = equippedWeaponId === w.id;
              const tier = weaponTiers[w.id] ?? 1;
              const rawTemperCost = tier === 1 ? 140 : tier === 2 ? 280 : 0;
              const temperCost = Math.round(rawTemperCost * discountMult);
              const craftCost = Math.round(w.unlockCost * discountMult);
              return (
                <div
                  key={w.id}
                  className="glass-subcard flex flex-wrap items-center justify-between gap-2.5 rounded-lg p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#FFF4DC]">
                        {t(lang, w.nameKey as TranslationKey)}
                      </span>
                      {unlocked && (
                        <span className="px-1.5 py-0.5 rounded bg-[#0A1024] border border-[#38E8D8]/45 text-[10px] font-bold text-[#38E8D8]">
                          T{tier}/3 (+{(tier - 1) * 20}%)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9EB4DA]">
                      {t(lang, w.descKey as TranslationKey)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {unlocked && onTemperWeapon && (
                      <button
                        type="button"
                        data-testid={`btn-temper-${w.id}`}
                        disabled={tier >= 3 || gold < temperCost}
                        onClick={() => onTemperWeapon(w.id)}
                        className="glass-gold-btn cursor-pointer disabled:opacity-45 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                      >
                        {tier >= 3
                          ? t(lang, 'charter_maxed')
                          : `${t(lang, 'forge_temper_btn')} (${temperCost}g)`}
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid={`btn-weapon-${w.id}`}
                      disabled={!unlocked && gold < craftCost}
                      onClick={() => onUnlockOrEquipWeapon(w.id)}
                      className={`cursor-pointer disabled:opacity-45 shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${
                        equipped
                          ? 'glass-teal-btn'
                          : unlocked
                            ? 'glass-gold-btn'
                            : 'glass-btn'
                      }`}
                    >
                      {equipped
                        ? t(lang, 'forge_equipped')
                        : unlocked
                          ? t(lang, 'forge_equip')
                          : t(lang, 'forge_craft', { g: craftCost })}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="glass-subcard rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-[#FFF4DC]">
                  {t(lang, 'guild_debt_label', { w: week })}:{' '}
                  <span className="tabular-nums text-[#FF9E44]">
                    {debtPaid} / {debtTarget}g
                  </span>
                </span>
                <button
                  type="button"
                  disabled={remainingDebt <= 0 || gold <= 0}
                  onClick={() => onPayDebt(Math.min(gold, remainingDebt))}
                  className="glass-gold-btn cursor-pointer disabled:opacity-45 px-4 py-1.5 rounded-lg font-bold text-xs"
                >
                  {t(lang, 'shop_pay_debt', { g: Math.min(gold, remainingDebt) })}
                </button>
              </div>
              <div className="h-2.5 w-full rounded bg-[#0A1022] border border-[#38E8D8]/35 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#23B7AB] to-[#38E8D8] transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((debtPaid / Math.max(1, debtTarget)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {onBuySupply && (
              <div
                data-testid="alchemy-supplies-section"
                className="glass-subcard rounded-lg p-3 flex flex-col gap-2 border border-[#F4B942]/35"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F4B942]">
                    🧭 {t(lang, 'supplies_title')}
                  </span>
                  <span className="tabular-nums text-[11px] font-bold text-[#38E8D8]">
                    {ownedSupplies.length}/{EXPEDITION_SUPPLIES.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {EXPEDITION_SUPPLIES.map((sup) => {
                    const owned = ownedSupplies.includes(sup.id);
                    return (
                      <div
                        key={sup.id}
                        className={`rounded-lg border p-2.5 flex flex-col justify-between gap-2 ${
                          owned
                            ? 'bg-[#13293D] border-[#38E8D8]/75'
                            : 'bg-[#090F22]/75 border-[#9EB4DA]/20'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: sup.accent }}>
                            <span>{sup.icon}</span>
                            <span className="truncate">
                              {t(lang, sup.nameKey as TranslationKey)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9EB4DA] leading-snug mt-1">
                            {t(lang, sup.descKey as TranslationKey)}
                          </p>
                        </div>
                        <button
                          type="button"
                          data-testid={`btn-buy-supply-${sup.id}`}
                          disabled={owned || gold < sup.cost}
                          onClick={() => onBuySupply(sup.id)}
                          className={`cursor-pointer disabled:opacity-55 w-full py-1 rounded-lg text-[11px] font-bold ${
                            owned ? 'glass-teal-btn' : 'glass-gold-btn'
                          }`}
                        >
                          {owned ? `✓ ${t(lang, 'sup_ready')}` : t(lang, 'sup_buy', { g: sup.cost })}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {onPurifyRelic && (
              <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#38E8D8]">
                    ✦ {t(lang, 'alchemy_purify_title')}
                  </span>
                  <span className="text-[11px] font-bold text-[#F4B942]">95g</span>
                </div>
                {cursedStash.length === 0 ? (
                  <p className="text-[11px] text-[#9EB4DA]">{t(lang, 'alchemy_purify_empty')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cursedStash.map(({ item, idx }) => (
                      <button
                        key={item.uid}
                        type="button"
                        data-testid={`btn-purify-${idx}`}
                        disabled={gold < 95}
                        onClick={() => onPurifyRelic(idx)}
                        className="glass-teal-btn cursor-pointer disabled:opacity-45 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                      >
                        {item.name} ({item.curse}) → 2×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {onTransmuteRelics && (
              <div className="glass-subcard rounded-lg p-3 flex flex-col gap-2 border border-[#A855F7]/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#C084FC]">
                      ⚗ {t(lang, 'alchemy_transmute_title')}
                    </span>
                    <p className="text-[11px] text-[#9EB4DA]">
                      {t(lang, 'alchemy_transmute_hint')}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-transmute-relics"
                    disabled={validSel.length !== 2 || gold < TRANSMUTE_COST}
                    onClick={() => {
                      if (validSel.length !== 2) return;
                      onTransmuteRelics(validSel[0], validSel[1]);
                      setTransmuteSelection([]);
                    }}
                    className="glass-gold-btn cursor-pointer disabled:opacity-45 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                  >
                    {t(lang, 'alchemy_transmute_btn', { g: TRANSMUTE_COST })} ({validSel.length}/2)
                  </button>
                </div>
                {stash.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {stash.slice(0, 12).map((item, idx) => {
                      const picked = validSel.includes(idx);
                      return (
                        <button
                          key={item.uid}
                          type="button"
                          data-testid={`transmute-slot-${idx}`}
                          onClick={() => toggleTransmuteIdx(idx)}
                          className={`cursor-pointer px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            picked
                              ? 'bg-[#5B21B6] border-[#F4B942] text-[#FFF4DC]'
                              : 'glass-btn text-[#D9E2F5] hover:border-[#C084FC]'
                          }`}
                        >
                          {item.name} ★{item.rarity} ({item.baseValue}g)
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Breakthrough Upgrades */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {upgrades.map((u) => {
            const lvl = upgradeLevels[u.id] ?? 0;
            const maxed = lvl >= u.maxLevel;
            const nextCost = maxed ? 0 : Math.round(u.costs[lvl] * discountMult);
            return (
              <div
                key={u.id}
                className="glass-subcard rounded-lg p-3 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold uppercase text-[#38E8D8]">
                    {u.id.replace('_', ' ')} (Lv {lvl}/{u.maxLevel})
                  </div>
                  <div className="text-[11px] font-semibold text-[#FFF4DC] mt-0.5">{u.effect}</div>
                </div>
                <button
                  type="button"
                  disabled={maxed || gold < nextCost}
                  onClick={() => onBuyUpgrade(u.id)}
                  className="glass-gold-btn cursor-pointer disabled:opacity-45 w-full py-1.5 rounded-lg text-xs font-bold"
                >
                  {maxed ? t(lang, 'charter_maxed') : t(lang, 'upgrade_btn', { g: nextCost })}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



