import { useState } from 'react';
import type { RelicTemplate } from '../systems/backpack';
import { formatRelicName } from '../systems/backpack';
import { BESTIARY_ENTRIES } from '../systems/charter';
import { ACHIEVEMENTS, CODEX_LORE, type CampaignRecords } from '../systems/meta';
import { t, type LanguageCode, type TranslationKey } from '../i18n/translations';

interface CodexModalProps {
  lang: LanguageCode;
  relics: RelicTemplate[];
  records: CampaignRecords;
  onClose: () => void;
}

type CodexTab = 'relics' | 'bestiary' | 'trophies' | 'daily';

const ERA_BADGES: Record<string, string> = {
  astral: '#38E8D8',
  hearth: '#F4B942',
  abyss: '#A855F7',
  forge: '#FF9E44',
};

export function CodexModal({ lang, relics, records, onClose }: CodexModalProps) {
  const [tab, setTab] = useState<CodexTab>('relics');
  const discoveredSet = new Set(records.discoveredRelicIds);
  const unlockedSet = new Set(records.unlockedAchievementIds);
  const discoveredCount = relics.filter((r) => discoveredSet.has(r.id)).length;

  return (
    <div
      data-ui-interactive="true"
      data-testid="codex-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'codex_title')}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040712]/88 p-3 sm:p-5"
    >
      <div className="glass-panel w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#F4B942]/30 pb-3">
          <div>
            <h2 className="font-ledger text-2xl sm:text-3xl font-bold text-[#FFF4DC]">
              {t(lang, 'codex_title')}
            </h2>
            <p className="text-xs font-bold text-[#38E8D8]">
              {t(lang, 'codex_discovered', { c: discoveredCount, total: relics.length })} ·{' '}
              {t(lang, 'codex_sales')}: {records.totalSales} · 🏆{' '}
              {unlockedSet.size}/{ACHIEVEMENTS.length}
            </p>
          </div>
          <button
            type="button"
            data-testid="btn-close-codex"
            onClick={onClose}
            className="glass-btn cursor-pointer px-3.5 py-1.5 rounded-lg font-bold text-sm"
          >
            {t(lang, 'close')}
          </button>
        </div>

        {/* Campaign Lifetime Records & Career Chronicle */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="glass-subcard rounded-lg p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
              {t(lang, 'codex_best_gold')}
            </div>
            <div className="tabular-nums font-ledger text-xl font-bold text-[#F4B942]">
              {records.bestGold}g
            </div>
          </div>
          <div className="glass-subcard rounded-lg p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
              {t(lang, 'codex_best_streak')}
            </div>
            <div className="tabular-nums font-ledger text-xl font-bold text-[#38E8D8]">
              {records.bestStreak}×
            </div>
          </div>
          <div className="glass-subcard rounded-lg p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
              {t(lang, 'codex_fastest')}
            </div>
            <div className="tabular-nums font-ledger text-xl font-bold text-[#FF9E44]">
              {records.fastestClearSec !== null ? `${records.fastestClearSec}s` : '—'}
            </div>
          </div>
          <div className="glass-subcard rounded-lg p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#9EB4DA]">
              {t(lang, 'codex_daily_clears')}
            </div>
            <div className="tabular-nums font-ledger text-xl font-bold text-[#FFF4DC]">
              {records.dailyClears.length}
            </div>
          </div>
        </div>

        {/* Career Chronicle & Heat 1-5 Completion Seals */}
        <div
          data-testid="codex-chronicle"
          className="glass-subcard rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 border border-[#38E8D8]/30"
        >
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span>
              <span className="text-[#9EB4DA]">{t(lang, 'chronicle_runs')}: </span>
              <strong className="tabular-nums text-[#FFF4DC]">{records.totalRuns}</strong>
            </span>
            <span>
              <span className="text-[#9EB4DA]">{t(lang, 'chronicle_victories')}: </span>
              <strong className="tabular-nums text-[#38E8D8]">{records.totalVictories}</strong>
            </span>
            <span>
              <span className="text-[#9EB4DA]">{t(lang, 'chronicle_max_week')}: </span>
              <strong className="tabular-nums text-[#C084FC]">
                {records.highestEndlessWeek > 0 ? `W${records.highestEndlessWeek}` : '—'}
              </strong>
            </span>
            <span>
              <span className="text-[#9EB4DA]">{t(lang, 'chronicle_elites')}: </span>
              <strong className="tabular-nums text-[#F4B942]">{records.eliteKills}</strong>
            </span>
            <span>
              <span className="text-[#9EB4DA]">{t(lang, 'chronicle_contracts')}: </span>
              <strong className="tabular-nums text-[#FF9E44]">{records.contractsCompleted}</strong>
            </span>
            <span>
              <span className="text-[#9EB4DA]">{t(lang, 'chronicle_rifts')}: </span>
              <strong className="tabular-nums text-[#F43F5E]">{records.riftClears}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-[#FF9E44] mr-1">
              {t(lang, 'heat_seals_label')}:
            </span>
            {[1, 2, 3, 4, 5].map((lvl) => {
              const cleared = records.highestHeatCleared >= lvl;
              return (
                <span
                  key={lvl}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold border ${
                    cleared
                      ? 'bg-[#3B1626] border-[#FF5E3A] text-[#F4B942] shadow-[0_0_8px_rgba(255,94,58,0.45)]'
                      : 'bg-[#090F22]/75 border-[#9EB4DA]/20 text-[#9EB4DA]/45'
                  }`}
                >
                  {cleared ? `🔥` : lvl}
                </span>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="tab-codex-relics"
            onClick={() => setTab('relics')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'relics' ? 'glass-gold-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            📜 {t(lang, 'codex_tab_relics')} ({discoveredCount}/{relics.length})
          </button>
          <button
            type="button"
            data-testid="tab-codex-bestiary"
            onClick={() => setTab('bestiary')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'bestiary' ? 'glass-teal-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            💀 {t(lang, 'codex_tab_bestiary')} (
            {BESTIARY_ENTRIES.filter((b) => (records.enemyKills[b.id] ?? 0) > 0).length}/
            {BESTIARY_ENTRIES.length})
          </button>
          <button
            type="button"
            data-testid="tab-codex-trophies"
            onClick={() => setTab('trophies')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'trophies' ? 'glass-teal-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            🏆 {t(lang, 'codex_tab_trophies')} ({unlockedSet.size}/{ACHIEVEMENTS.length})
          </button>
          <button
            type="button"
            data-testid="tab-codex-daily"
            onClick={() => setTab('daily')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border ${
              tab === 'daily' ? 'glass-gold-btn' : 'glass-btn text-[#9EB4DA]'
            }`}
          >
            📅 {t(lang, 'codex_tab_daily')} ({records.dailyHistory.length})
          </button>
        </div>

        {/* Tab 1: Relic Lore Grid */}
        {tab === 'relics' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {relics.map((relic) => {
              const known = discoveredSet.has(relic.id);
              const eraColor = ERA_BADGES[relic.era] ?? '#9EB4DA';
              return (
                <div
                  key={relic.id}
                  className={`rounded-lg border p-3 flex flex-col gap-1.5 ${
                    known ? 'glass-subcard' : 'bg-[#090F22]/75 border-[#9EB4DA]/18 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-4 h-4 rounded border border-[#FFF4DC]/70 shrink-0"
                        style={{ backgroundColor: known ? relic.color : '#1E293B' }}
                      />
                      <span className="font-bold text-xs text-[#FFF4DC] truncate">
                        {known ? formatRelicName(relic.id) : '??? Relic'}
                      </span>
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#090F22]/85 border"
                      style={{ color: eraColor, borderColor: `${eraColor}55` }}
                    >
                      {relic.era}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="tabular-nums text-[#F4B942]">
                      {known ? `${relic.baseValue}g` : '??g'}
                    </span>
                    {known && relic.curse !== 'none' && (
                      <span className="uppercase px-1.5 rounded bg-[#1A2547] text-[#38E8D8]">
                        {relic.curse}
                      </span>
                    )}
                    <span className="text-[#9EB4DA] ml-auto">★{relic.rarity}</span>
                  </div>

                  <p className="text-[11px] text-[#9EB4DA] leading-snug">
                    {known
                      ? CODEX_LORE[relic.id] ?? 'Ancient artifact cataloged in the Gateledger.'
                      : 'Extract or uncover this relic in the Gate ruins to log its history.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 1b: Bestiary */}
        {tab === 'bestiary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BESTIARY_ENTRIES.map((entry) => {
              const kills = records.enemyKills[entry.id] ?? 0;
              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border p-3 flex flex-col gap-1.5 ${
                    kills > 0 ? 'glass-subcard' : 'bg-[#090F22]/75 border-[#9EB4DA]/18 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-[#FFF4DC]/70 shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="font-bold text-xs text-[#FFF4DC] truncate">
                        {t(lang, entry.nameKey as TranslationKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {entry.isBoss && (
                        <span className="px-1.5 py-0.5 rounded bg-[#BD1F36] text-white text-[9px] font-bold">
                          BOSS
                        </span>
                      )}
                      <span className="tabular-nums text-[11px] font-bold text-[#F4B942]">
                        {t(lang, 'bestiary_slain', { c: kills })}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9EB4DA] leading-snug">
                    {t(lang, entry.tacticKey as TranslationKey)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: 12 Guild Achievements */}
        {tab === 'trophies' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = unlockedSet.has(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`rounded-lg border p-3 flex items-center gap-3 ${
                    unlocked
                      ? 'glass-subcard border-[#F4B942]/55'
                      : 'bg-[#090F22]/70 border-[#9EB4DA]/15 opacity-55'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border ${
                      unlocked
                        ? 'bg-[#F4B942]/18 border-[#F4B942]/70'
                        : 'bg-[#0E162E] border-[#9EB4DA]/20'
                    }`}
                  >
                    {unlocked ? ach.icon : '🔒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#FFF4DC]">{ach.title}</div>
                    <div className="text-[11px] text-[#9EB4DA] leading-snug">{ach.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Daily Seed History */}
        {tab === 'daily' && (
          <div className="flex flex-col gap-2">
            {records.dailyHistory.length === 0 ? (
              <div className="glass-subcard rounded-lg p-4 text-center text-xs text-[#9EB4DA]">
                —
              </div>
            ) : (
              records.dailyHistory.map((entry) => (
                <div
                  key={entry.date}
                  className="glass-subcard rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#38E8D8]">📅 {entry.date}</span>
                  <span className="text-[#9EB4DA]">W{entry.week}</span>
                  <span className="tabular-nums font-bold text-[#F4B942]">{entry.gold}g</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
