import type { BossId } from './bosses';
import type { EnemyKind } from './dungeonSim';

export type GuildTalentId =
  | 'vital_seal'
  | 'coin_pouch'
  | 'boon_attunement'
  | 'merchant_repute'
  | 'satchel_graft';

export interface GuildTalentDef {
  id: GuildTalentId;
  icon: string;
  accent: string;
  maxLevel: number;
  costs: number[];
  nameKey: string;
  descKey: string;
}

export const GUILD_TALENTS: GuildTalentDef[] = [
  {
    id: 'vital_seal',
    icon: '♥',
    accent: '#FF4D6D',
    maxLevel: 3,
    costs: [3, 6, 10],
    nameKey: 'talent_vital_name',
    descKey: 'talent_vital_desc',
  },
  {
    id: 'coin_pouch',
    icon: '🪙',
    accent: '#F4B942',
    maxLevel: 3,
    costs: [2, 5, 8],
    nameKey: 'talent_coin_name',
    descKey: 'talent_coin_desc',
  },
  {
    id: 'boon_attunement',
    icon: '🎲',
    accent: '#38E8D8',
    maxLevel: 2,
    costs: [3, 7],
    nameKey: 'talent_boon_name',
    descKey: 'talent_boon_desc',
  },
  {
    id: 'merchant_repute',
    icon: '⚖',
    accent: '#F4B942',
    maxLevel: 3,
    costs: [3, 6, 9],
    nameKey: 'talent_repute_name',
    descKey: 'talent_repute_desc',
  },
  {
    id: 'satchel_graft',
    icon: '⚔',
    accent: '#FF9E44',
    maxLevel: 2,
    costs: [4, 8],
    nameKey: 'talent_satchel_name',
    descKey: 'talent_satchel_desc',
  },
];

export interface CharterBonuses {
  bonusHp: number;
  bonusGold: number;
  boonRerolls: number;
  fairPriceMult: number;
  bonusPotions: number;
  bonusDmgMult: number;
}

export function computeCharterBonuses(talentLevels: Record<string, number>): CharterBonuses {
  const vital = Math.max(0, Math.min(3, talentLevels.vital_seal ?? 0));
  const coin = Math.max(0, Math.min(3, talentLevels.coin_pouch ?? 0));
  const boon = Math.max(0, Math.min(2, talentLevels.boon_attunement ?? 0));
  const repute = Math.max(0, Math.min(3, talentLevels.merchant_repute ?? 0));
  const satchel = Math.max(0, Math.min(2, talentLevels.satchel_graft ?? 0));

  return {
    bonusHp: vital,
    bonusGold: coin * 40,
    boonRerolls: boon,
    fairPriceMult: 1 + repute * 0.08,
    bonusPotions: satchel >= 1 ? 1 : 0,
    bonusDmgMult: satchel >= 2 ? 1.12 : 1.0,
  };
}

export function getNextTalentCost(id: GuildTalentId, currentLevel: number): number | null {
  const def = GUILD_TALENTS.find((t) => t.id === id);
  if (!def || currentLevel >= def.maxLevel || currentLevel < 0) return null;
  return def.costs[currentLevel] ?? null;
}

export type PactId =
  | 'pact_frenzy'
  | 'pact_armored'
  | 'pact_hurry'
  | 'pact_deflation'
  | 'pact_cursed';

export interface GatePactDef {
  id: PactId;
  icon: string;
  accent: string;
  heat: number;
  shardBonusPct: number;
  nameKey: string;
  descKey: string;
}

export const GATE_PACTS: GatePactDef[] = [
  {
    id: 'pact_frenzy',
    icon: '⚡',
    accent: '#FF5E3A',
    heat: 1,
    shardBonusPct: 25,
    nameKey: 'pact_frenzy_name',
    descKey: 'pact_frenzy_desc',
  },
  {
    id: 'pact_armored',
    icon: '🛡',
    accent: '#F4B942',
    heat: 1,
    shardBonusPct: 25,
    nameKey: 'pact_armored_name',
    descKey: 'pact_armored_desc',
  },
  {
    id: 'pact_hurry',
    icon: '⏳',
    accent: '#C084FC',
    heat: 1,
    shardBonusPct: 25,
    nameKey: 'pact_hurry_name',
    descKey: 'pact_hurry_desc',
  },
  {
    id: 'pact_deflation',
    icon: '⚖',
    accent: '#FF4D6D',
    heat: 1,
    shardBonusPct: 25,
    nameKey: 'pact_deflation_name',
    descKey: 'pact_deflation_desc',
  },
  {
    id: 'pact_cursed',
    icon: '☠',
    accent: '#38E8D8',
    heat: 1,
    shardBonusPct: 30,
    nameKey: 'pact_cursed_name',
    descKey: 'pact_cursed_desc',
  },
];

export interface PactModifiers {
  heatLevel: number;
  shardMult: number;
  enemyHpMult: number;
  enemySpeedMult: number;
  marauderTimeMult: number;
  debtMult: number;
  bonusRarity: boolean;
}

export function computePactModifiers(activePacts: PactId[]): PactModifiers {
  const set = new Set(activePacts);
  let heatLevel = 0;
  let pctBonus = 0;
  for (const p of GATE_PACTS) {
    if (set.has(p.id)) {
      heatLevel += p.heat;
      pctBonus += p.shardBonusPct;
    }
  }
  return {
    heatLevel,
    shardMult: 1 + pctBonus / 100,
    enemyHpMult: set.has('pact_armored') ? 1.25 : 1.0,
    enemySpeedMult: set.has('pact_frenzy') ? 1.2 : 1.0,
    marauderTimeMult: set.has('pact_hurry') ? 0.75 : 1.0,
    debtMult: set.has('pact_deflation') ? 1.2 : 1.0,
    bonusRarity: set.has('pact_cursed'),
  };
}

export type ContractKind = 'slay_enemies' | 'smash_props' | 'appraisal_hits' | 'shop_sales';

export interface RunContract {
  id: string;
  kind: ContractKind;
  nameKey: string;
  target: number;
  progress: number;
  rewardGold: number;
  rewardShards: number;
  completed: boolean;
}

const CONTRACT_TEMPLATES: Omit<RunContract, 'id' | 'progress' | 'completed'>[] = [
  {
    kind: 'slay_enemies',
    nameKey: 'contract_slay',
    target: 8,
    rewardGold: 90,
    rewardShards: 2,
  },
  {
    kind: 'smash_props',
    nameKey: 'contract_props',
    target: 6,
    rewardGold: 75,
    rewardShards: 1,
  },
  {
    kind: 'appraisal_hits',
    nameKey: 'contract_appraisal',
    target: 2,
    rewardGold: 110,
    rewardShards: 2,
  },
  {
    kind: 'shop_sales',
    nameKey: 'contract_sales',
    target: 3,
    rewardGold: 85,
    rewardShards: 2,
  },
];

export function createRunContract(seed: number, stepIndex: number): RunContract {
  const idx = Math.abs(seed + stepIndex) % CONTRACT_TEMPLATES.length;
  const tpl = CONTRACT_TEMPLATES[idx];
  return {
    ...tpl,
    id: `ctr_${stepIndex}_${tpl.kind}`,
    progress: 0,
    completed: false,
  };
}

export function advanceContractProgress(
  contract: RunContract,
  kind: ContractKind,
  amount = 1,
): { updated: RunContract; justCompleted: boolean } {
  if (contract.completed || contract.kind !== kind || amount <= 0) {
    return { updated: contract, justCompleted: false };
  }
  const nextProgress = Math.min(contract.target, contract.progress + amount);
  const done = nextProgress >= contract.target;
  return {
    updated: {
      ...contract,
      progress: nextProgress,
      completed: done,
    },
    justCompleted: done,
  };
}

export interface BestiaryEntry {
  id: EnemyKind | BossId;
  isBoss: boolean;
  nameKey: string;
  tacticKey: string;
  color: string;
}

export const BESTIARY_ENTRIES: BestiaryEntry[] = [
  {
    id: 'slime',
    isBoss: false,
    nameKey: 'bestiary_slime_name',
    tacticKey: 'bestiary_slime_tip',
    color: '#38E8D8',
  },
  {
    id: 'sentinel',
    isBoss: false,
    nameKey: 'bestiary_sentinel_name',
    tacticKey: 'bestiary_sentinel_tip',
    color: '#F4B942',
  },
  {
    id: 'caster',
    isBoss: false,
    nameKey: 'bestiary_caster_name',
    tacticKey: 'bestiary_caster_tip',
    color: '#C084FC',
  },
  {
    id: 'marauder',
    isBoss: false,
    nameKey: 'bestiary_marauder_name',
    tacticKey: 'bestiary_marauder_tip',
    color: '#FF3B5C',
  },
  {
    id: 'whisper_warden',
    isBoss: true,
    nameKey: 'boss_whisper_name',
    tacticKey: 'bestiary_boss_whisper_tip',
    color: '#38E8D8',
  },
  {
    id: 'sunstone_colossus',
    isBoss: true,
    nameKey: 'boss_hearth_name',
    tacticKey: 'bestiary_boss_hearth_tip',
    color: '#F4B942',
  },
  {
    id: 'obsidian_archon',
    isBoss: true,
    nameKey: 'boss_abyss_name',
    tacticKey: 'bestiary_boss_abyss_tip',
    color: '#C084FC',
  },
  {
    id: 'astral_overlord',
    isBoss: true,
    nameKey: 'boss_forge_name',
    tacticKey: 'bestiary_boss_forge_tip',
    color: '#FF5E3A',
  },
];

export function scaleShardsByPact(baseShards: number, shardMult: number): number {
  return Math.max(1, Math.round(baseShards * shardMult));
}
