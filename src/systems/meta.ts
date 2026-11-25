import type { RelicEra } from '../systems/backpack';
import type { PactId } from './charter';
import type { FamiliarId } from './expedition';

export type ArchetypeId = 'merchant' | 'acrobat' | 'smith';

export interface ArchetypeDef {
  id: ArchetypeId;
  title: string;
  perk: string;
  startGold: number;
  patienceBonus: number;
  fairBonusMult: number;
  maxJumpCharges: number;
  jumpCooldownMult: number;
  specialDmgMult: number;
  specialCooldownMult: number;
  accent: string;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  merchant: {
    id: 'merchant',
    title: 'Guild Broker',
    perk: '+15% Fair Price · +1 Patience · 220g Start',
    startGold: 220,
    patienceBonus: 1,
    fairBonusMult: 1.15,
    maxJumpCharges: 1,
    jumpCooldownMult: 1.0,
    specialDmgMult: 1.0,
    specialCooldownMult: 1.0,
    accent: '#F4B942',
  },
  acrobat: {
    id: 'acrobat',
    title: 'Vault Strider',
    perk: '2 Jump/Vault Charges · -30% Dash Cooldown',
    startGold: 180,
    patienceBonus: 0,
    fairBonusMult: 1.0,
    maxJumpCharges: 2,
    jumpCooldownMult: 0.7,
    specialDmgMult: 1.0,
    specialCooldownMult: 1.0,
    accent: '#38E8D8',
  },
  smith: {
    id: 'smith',
    title: 'Forge Apprentice',
    perk: '+35% Special [Q] Dmg · -25% [Q] Cooldown',
    startGold: 180,
    patienceBonus: 0,
    fairBonusMult: 1.0,
    maxJumpCharges: 1,
    jumpCooldownMult: 1.0,
    specialDmgMult: 1.35,
    specialCooldownMult: 0.75,
    accent: '#FF9E44',
  },
};

export interface CodexLoreEntry {
  relicId: string;
  era: RelicEra;
  lore: string;
}

export const CODEX_LORE: Record<string, string> = {
  whisper_seal: 'A resonant wax-and-silver seal once pressed onto midnight Gate manifests.',
  cobalt_shard: 'Sliver of ancient sky-glass dropped when the First Archway fractured.',
  brass_astrolabe: 'Gilded brass rings that bend trade valuations around neighboring wares.',
  star_prism: 'Refracts astral light; refuses to vanish even if its bearer falls below.',
  amber_chalice: 'Still warm with hearth-wine brewed before the Guild Charter.',
  guild_signet: 'Heavy signet worn by debt arbiters who tally the Gate’s weekly tribute.',
  terracotta_idol: 'Smolders with sacrificial ember; consumes weaker curios unless purified.',
  ivory_quill: 'Feather of a twilight owl; strokes away curses inked on nearby relics.',
  royal_compass: 'Points toward wealth, cleansing adjacent curses and lifting values by 25%.',
  runed_fang: 'Jawbone etched with binding glyphs that lock surrounding satchel cells.',
  void_shard: 'Feeds on emptiness—worth more the fewer relics crowd its borders.',
  obsidian_crown: 'Forged from Gate monolith stone; fierce flame hides inside its rim.',
  moon_mirror: 'Reflects twin luster across adjoining satchel slots.',
  sun_core: 'Miniature star-forge heart sealed inside brass filigree.',
  ember_ingot: 'Quenched in Bram’s first anvil trough; favored by Guild armorers.',
  warden_crest: 'Insignia of the Gatekeeper; calms every curse within arm’s reach.',
};

export interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_sale', icon: '🪙', title: 'First Ledger Entry', desc: 'Complete your first shop counter sale.' },
  { id: 'streak_3', icon: '🔥', title: 'Silver Tongue', desc: 'Reach a 3× haggle deal streak.' },
  { id: 'radiant_fusion', icon: '✦', title: 'Radiant Alchemist', desc: 'Fuse adjacent identical relics into a Radiant Relic.' },
  { id: 'belt_trinity', icon: '⚡', title: 'Runic Beltmaster', desc: 'Activate 3 Safe Belt runes (B1–B3) at once.' },
  { id: 'mimic_busted', icon: '👁', title: 'Mimic Hunter', desc: 'Expose and stun a Mimic chest with [Q] Special.' },
  { id: 'auction_champ', icon: '🔨', title: 'High Bid Hammer', desc: 'Sell a relic in a Live Collector Auction.' },
  { id: 'vip_broker', icon: '👑', title: 'Guild Patron', desc: 'Fulfill a 2.2× VIP Collector Commission.' },
  { id: 'secret_vault', icon: '🗝', title: 'Key of Shadows', desc: 'Open a Night Gate Secret Vault chest.' },
  { id: 'codex_half', icon: '📖', title: 'Archivist Apprentice', desc: 'Catalog 8+ unique Gate relics in the Codex.' },
  { id: 'debt_cleared', icon: '🏛', title: 'Gate Unsealed', desc: 'Clear Week 3 debt and unseal the Ancient Gate.' },
  { id: 'endless_5', icon: '♾', title: 'Endless Sovereign', desc: 'Reach Endless Week 5 or higher.' },
  { id: 'gatekeeper_win', icon: '⚔', title: 'Iron Ledger', desc: 'Clear Week 3 on Gatekeeper difficulty.' },
  { id: 'charter_first', icon: '📜', title: 'Charter Signatory', desc: 'Unlock your first permanent Guild Charter talent.' },
  { id: 'pact_3', icon: '🔥', title: 'Trial by Fire', desc: 'Begin an expedition with 3+ Gate Pacts active.' },
  { id: 'boss_slayer', icon: '☠', title: 'Warden Breaker', desc: 'Defeat any Weekly Gate Boss.' },
  { id: 'weapon_master', icon: '⚒', title: 'Master Bladesmith', desc: 'Temper any weapon to Tier III at Bram’s Forge.' },
  { id: 'all_weapons', icon: '⚔', title: 'Grand Arsenal', desc: 'Unlock all 4 weapons at Bram’s Forge.' },
  { id: 'heat_5_win', icon: '🔥', title: 'Ashen Sovereign', desc: 'Clear Week 4 with Heat 5/5 Gate Pacts active.' },
  { id: 'endless_8', icon: '🌌', title: 'Abyssal Ascension', desc: 'Reach Endless Ascension Week 8 or higher.' },
  { id: 'elite_slayer', icon: '👑', title: 'Champion Breaker', desc: 'Slay 5 Elite Champions inside the Gate.' },
  { id: 'shrine_devotee', icon: '⛩', title: 'Shrine Supplicant', desc: 'Seal 3 Ancient Shrine offerings.' },
  { id: 'contract_legend', icon: '📜', title: 'Guild Exemplar', desc: 'Complete 10 Guild Contracts across campaigns.' },
  { id: 'rift_conqueror', icon: '🜂', title: 'Rift Delver', desc: 'Conquer and extract from the Forgotten Rift.' },
  { id: 'supply_master', icon: '🧭', title: 'Quartermaster', desc: 'Enter an expedition with 2+ Alchemy Supplies active.' },
  { id: 'familiar_bonded', icon: '🐾', title: 'Spirit Bonded', desc: 'Unlock and summon your first Guild Familiar.' },
  { id: 'rift_tier_3', icon: '☄', title: 'Rift Sovereign', desc: 'Conquer the Forgotten Rift 3 or more times.' },
];

export interface DailyHistoryEntry {
  date: string;
  gold: number;
  week: number;
}

export interface CampaignRecords {
  bestGold: number;
  bestStreak: number;
  fastestClearSec: number | null;
  dailyClears: string[];
  discoveredRelicIds: string[];
  totalSales: number;
  unlockedAchievementIds: string[];
  dailyHistory: DailyHistoryEntry[];
  gateShards: number;
  talentLevels: Record<string, number>;
  activePacts: PactId[];
  enemyKills: Record<string, number>;
  contractsCompleted: number;
  highestHeatCleared: number;
  highestEndlessWeek: number;
  totalRuns: number;
  totalVictories: number;
  eliteKills: number;
  shrineOfferings: number;
  riftClears: number;
  unlockedFamiliars: FamiliarId[];
  equippedFamiliar: FamiliarId;
}

const STORAGE_KEY = 'gateledger_records_v1';

export function createDefaultRecords(): CampaignRecords {
  return {
    bestGold: 180,
    bestStreak: 0,
    fastestClearSec: null,
    dailyClears: [],
    discoveredRelicIds: ['whisper_seal', 'cobalt_shard'],
    totalSales: 0,
    unlockedAchievementIds: [],
    dailyHistory: [],
    gateShards: 0,
    talentLevels: {},
    activePacts: [],
    enemyKills: {},
    contractsCompleted: 0,
    highestHeatCleared: 0,
    highestEndlessWeek: 0,
    totalRuns: 0,
    totalVictories: 0,
    eliteKills: 0,
    shrineOfferings: 0,
    riftClears: 0,
    unlockedFamiliars: [],
    equippedFamiliar: 'none',
  };
}

const VALID_FAMILIAR_IDS = new Set<string>(['ember_wisp', 'aether_owl', 'gilded_scarab']);

const VALID_PACT_IDS = new Set<string>([
  'pact_frenzy',
  'pact_armored',
  'pact_hurry',
  'pact_deflation',
  'pact_cursed',
]);

export function normalizeRecords(parsed: Partial<CampaignRecords> | null | undefined): CampaignRecords {
  const def = createDefaultRecords();
  if (!parsed || typeof parsed !== 'object') return def;
  const dedupeStrings = (arr: unknown, fallback: string[]) =>
    Array.isArray(arr)
      ? Array.from(new Set(arr.filter((x): x is string => typeof x === 'string' && x.length > 0)))
      : fallback;
  const sanitizeNumMap = (obj: unknown): Record<string, number> => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        out[k] = Math.round(v);
      }
    }
    return out;
  };
  const dailyHistory: DailyHistoryEntry[] = Array.isArray(parsed.dailyHistory)
    ? parsed.dailyHistory
        .filter(
          (e): e is DailyHistoryEntry =>
            Boolean(e) &&
            typeof e.date === 'string' &&
            typeof e.gold === 'number' &&
            typeof e.week === 'number',
        )
        .slice(0, 20)
    : [];
  const activePacts = Array.isArray(parsed.activePacts)
    ? Array.from(
        new Set(
          parsed.activePacts.filter((x): x is PactId => typeof x === 'string' && VALID_PACT_IDS.has(x)),
        ),
      )
    : [];
  return {
    bestGold: typeof parsed.bestGold === 'number' && parsed.bestGold >= 0 ? Math.round(parsed.bestGold) : def.bestGold,
    bestStreak:
      typeof parsed.bestStreak === 'number' && parsed.bestStreak >= 0 ? Math.round(parsed.bestStreak) : def.bestStreak,
    fastestClearSec:
      typeof parsed.fastestClearSec === 'number' && parsed.fastestClearSec > 0
        ? Math.round(parsed.fastestClearSec)
        : null,
    dailyClears: dedupeStrings(parsed.dailyClears, []),
    discoveredRelicIds: dedupeStrings(parsed.discoveredRelicIds, def.discoveredRelicIds),
    totalSales: typeof parsed.totalSales === 'number' && parsed.totalSales >= 0 ? Math.round(parsed.totalSales) : 0,
    unlockedAchievementIds: dedupeStrings(parsed.unlockedAchievementIds, []),
    dailyHistory,
    gateShards: typeof parsed.gateShards === 'number' && parsed.gateShards >= 0 ? Math.round(parsed.gateShards) : 0,
    talentLevels: sanitizeNumMap(parsed.talentLevels),
    activePacts,
    enemyKills: sanitizeNumMap(parsed.enemyKills),
    contractsCompleted:
      typeof parsed.contractsCompleted === 'number' && parsed.contractsCompleted >= 0
        ? Math.round(parsed.contractsCompleted)
        : 0,
    highestHeatCleared:
      typeof parsed.highestHeatCleared === 'number' && parsed.highestHeatCleared >= 0
        ? Math.min(5, Math.round(parsed.highestHeatCleared))
        : 0,
    highestEndlessWeek:
      typeof parsed.highestEndlessWeek === 'number' && parsed.highestEndlessWeek >= 0
        ? Math.round(parsed.highestEndlessWeek)
        : 0,
    totalRuns:
      typeof parsed.totalRuns === 'number' && parsed.totalRuns >= 0
        ? Math.round(parsed.totalRuns)
        : 0,
    totalVictories:
      typeof parsed.totalVictories === 'number' && parsed.totalVictories >= 0
        ? Math.round(parsed.totalVictories)
        : 0,
    eliteKills:
      typeof parsed.eliteKills === 'number' && parsed.eliteKills >= 0
        ? Math.round(parsed.eliteKills)
        : 0,
    shrineOfferings:
      typeof parsed.shrineOfferings === 'number' && parsed.shrineOfferings >= 0
        ? Math.round(parsed.shrineOfferings)
        : 0,
    riftClears:
      typeof parsed.riftClears === 'number' && parsed.riftClears >= 0
        ? Math.round(parsed.riftClears)
        : 0,
    unlockedFamiliars: Array.isArray(parsed.unlockedFamiliars)
      ? Array.from(
          new Set(
            parsed.unlockedFamiliars.filter(
              (x): x is FamiliarId => typeof x === 'string' && VALID_FAMILIAR_IDS.has(x),
            ),
          ),
        )
      : [],
    equippedFamiliar:
      typeof parsed.equippedFamiliar === 'string' && VALID_FAMILIAR_IDS.has(parsed.equippedFamiliar)
        ? (parsed.equippedFamiliar as FamiliarId)
        : 'none',
  };
}

export function loadCampaignRecords(): CampaignRecords {
  if (typeof localStorage === 'undefined') return createDefaultRecords();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultRecords();
    return normalizeRecords(JSON.parse(raw) as Partial<CampaignRecords>);
  } catch {
    return createDefaultRecords();
  }
}

export function saveCampaignRecords(records: CampaignRecords): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeRecords(records)));
  } catch {
    // Ignore quota / privacy mode storage errors
  }
}

export function grantAchievements(
  records: CampaignRecords,
  ids: string[],
): { updated: CampaignRecords; newlyUnlocked: AchievementDef[] } {
  const existing = new Set(records.unlockedAchievementIds);
  const newlyUnlocked: AchievementDef[] = [];
  for (const id of ids) {
    if (existing.has(id)) continue;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) {
      existing.add(id);
      newlyUnlocked.push(def);
    }
  }
  if (newlyUnlocked.length === 0) {
    return { updated: records, newlyUnlocked: [] };
  }
  return {
    updated: {
      ...records,
      unlockedAchievementIds: Array.from(existing),
    },
    newlyUnlocked,
  };
}

export function exportSavePayload(records: CampaignRecords): string {
  const json = JSON.stringify(normalizeRecords(records));
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return `GL1:${b64}`;
}

export function importSavePayload(raw: string): CampaignRecords | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    let json = trimmed;
    if (trimmed.startsWith('GL1:')) {
      const b64 = trimmed.slice(4);
      const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      json = new TextDecoder().decode(bytes);
    }
    const parsed = JSON.parse(json) as Partial<CampaignRecords>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (typeof parsed.bestGold !== 'number' && !Array.isArray(parsed.discoveredRelicIds))
    ) {
      return null;
    }
    return normalizeRecords(parsed);
  } catch {
    return null;
  }
}
