export type BoonId =
  | 'storm_combo'
  | 'ember_vault'
  | 'vampire_ledger'
  | 'frost_sigil'
  | 'echo_blade'
  | 'hunter_focus'
  | 'gilded_greed'
  | 'aegis_vitality'
  | 'titan_swing'
  | 'twin_fang'
  | 'wardens_parry'
  | 'merchant_windfall';

export type BoonTheme = 'astral' | 'forge' | 'merchant';

export interface BoonDef {
  id: BoonId;
  theme: BoonTheme;
  icon: string;
  accent: string;
  nameKey: string;
  descKey: string;
}

export type BoonSynergyId =
  | 'tempest_shatter'
  | 'magma_cleave'
  | 'blood_tithe'
  | 'phantom_tempo'
  | 'executioner_edge'
  | 'midas_bastion';

export interface BoonSynergyDef {
  id: BoonSynergyId;
  pair: [BoonId, BoonId];
  icon: string;
  accent: string;
  nameKey: string;
  descKey: string;
}

export const BOON_SYNERGIES: BoonSynergyDef[] = [
  {
    id: 'tempest_shatter',
    pair: ['storm_combo', 'frost_sigil'],
    icon: '⚡❄',
    accent: '#38E8D8',
    nameKey: 'syn_tempest_name',
    descKey: 'syn_tempest_desc',
  },
  {
    id: 'magma_cleave',
    pair: ['ember_vault', 'titan_swing'],
    icon: '🔥🔨',
    accent: '#FF7B42',
    nameKey: 'syn_magma_name',
    descKey: 'syn_magma_desc',
  },
  {
    id: 'blood_tithe',
    pair: ['vampire_ledger', 'gilded_greed'],
    icon: '🩸🪙',
    accent: '#FF4D6D',
    nameKey: 'syn_blood_name',
    descKey: 'syn_blood_desc',
  },
  {
    id: 'phantom_tempo',
    pair: ['echo_blade', 'hunter_focus'],
    icon: '◈⚔',
    accent: '#C084FC',
    nameKey: 'syn_phantom_name',
    descKey: 'syn_phantom_desc',
  },
  {
    id: 'executioner_edge',
    pair: ['twin_fang', 'hunter_focus'],
    icon: '🗡⚔',
    accent: '#F4B942',
    nameKey: 'syn_executioner_name',
    descKey: 'syn_executioner_desc',
  },
  {
    id: 'midas_bastion',
    pair: ['merchant_windfall', 'aegis_vitality'],
    icon: '👑🛡',
    accent: '#38E8D8',
    nameKey: 'syn_midas_name',
    descKey: 'syn_midas_desc',
  },
];

export interface BoonEffects {
  stormCombo: boolean;
  emberVault: boolean;
  vampireLedger: boolean;
  frostSigil: boolean;
  echoBlade: boolean;
  specialDmgMult: number;
  specialCdMult: number;
  primaryDmgMult: number;
  rangeMult: number;
  gildedGreed: boolean;
  activeSynergies: BoonSynergyDef[];
  chainTargets: number;
  chainDmgMult: number;
  emberBlastMult: number;
  emberRadiusBonus: number;
  vampireEveryNKills: number;
  killGoldBonus: number;
  echoDmgRatio: number;
  critChanceBonus: number;
  critDmgMult: number;
  wardensParry: boolean;
  windfallPropGold: number;
  windfallHealEveryN: number;
  eliteBossDmgMult: number;
  fullHpDmgMult: number;
  goldDropMult: number;
}

export const BOON_CATALOG: BoonDef[] = [
  {
    id: 'storm_combo',
    theme: 'astral',
    icon: '⚡',
    accent: '#38E8D8',
    nameKey: 'boon_storm_name',
    descKey: 'boon_storm_desc',
  },
  {
    id: 'ember_vault',
    theme: 'forge',
    icon: '🔥',
    accent: '#FF7B42',
    nameKey: 'boon_ember_name',
    descKey: 'boon_ember_desc',
  },
  {
    id: 'vampire_ledger',
    theme: 'merchant',
    icon: '🩸',
    accent: '#FF4D6D',
    nameKey: 'boon_vampire_name',
    descKey: 'boon_vampire_desc',
  },
  {
    id: 'frost_sigil',
    theme: 'astral',
    icon: '❄',
    accent: '#7DD3FC',
    nameKey: 'boon_frost_name',
    descKey: 'boon_frost_desc',
  },
  {
    id: 'echo_blade',
    theme: 'astral',
    icon: '◈',
    accent: '#C084FC',
    nameKey: 'boon_echo_name',
    descKey: 'boon_echo_desc',
  },
  {
    id: 'hunter_focus',
    theme: 'forge',
    icon: '⚔',
    accent: '#F4B942',
    nameKey: 'boon_focus_name',
    descKey: 'boon_focus_desc',
  },
  {
    id: 'gilded_greed',
    theme: 'merchant',
    icon: '🪙',
    accent: '#F4B942',
    nameKey: 'boon_greed_name',
    descKey: 'boon_greed_desc',
  },
  {
    id: 'aegis_vitality',
    theme: 'merchant',
    icon: '🛡',
    accent: '#38E8D8',
    nameKey: 'boon_aegis_name',
    descKey: 'boon_aegis_desc',
  },
  {
    id: 'titan_swing',
    theme: 'forge',
    icon: '🔨',
    accent: '#FF9E44',
    nameKey: 'boon_titan_name',
    descKey: 'boon_titan_desc',
  },
  {
    id: 'twin_fang',
    theme: 'forge',
    icon: '🗡',
    accent: '#F4B942',
    nameKey: 'boon_fang_name',
    descKey: 'boon_fang_desc',
  },
  {
    id: 'wardens_parry',
    theme: 'astral',
    icon: '💠',
    accent: '#38E8D8',
    nameKey: 'boon_parry_name',
    descKey: 'boon_parry_desc',
  },
  {
    id: 'merchant_windfall',
    theme: 'merchant',
    icon: '🏺',
    accent: '#F4B942',
    nameKey: 'boon_windfall_name',
    descKey: 'boon_windfall_desc',
  },
];

export function getBoonDef(id: BoonId): BoonDef {
  return BOON_CATALOG.find((b) => b.id === id) ?? BOON_CATALOG[0];
}

export function computeActiveSynergies(ownedIds: BoonId[]): BoonSynergyDef[] {
  const set = new Set(ownedIds);
  return BOON_SYNERGIES.filter((s) => set.has(s.pair[0]) && set.has(s.pair[1]));
}

export function getPotentialSynergiesForChoice(
  choiceId: BoonId,
  ownedIds: BoonId[],
): BoonSynergyDef[] {
  const set = new Set(ownedIds);
  if (set.has(choiceId)) return [];
  return BOON_SYNERGIES.filter(
    (s) =>
      (s.pair[0] === choiceId && set.has(s.pair[1])) ||
      (s.pair[1] === choiceId && set.has(s.pair[0])),
  );
}

export function rollBoonChoices(
  ownedIds: BoonId[],
  rand: () => number,
  count = 3,
): BoonDef[] {
  const ownedSet = new Set(ownedIds);
  const unowned = BOON_CATALOG.filter((b) => !ownedSet.has(b.id));
  const pool = unowned.length >= count ? [...unowned] : [...BOON_CATALOG];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function computeBoonEffects(ownedIds: BoonId[]): BoonEffects {
  const set = new Set(ownedIds);
  const activeSynergies = computeActiveSynergies(ownedIds);
  const synSet = new Set(activeSynergies.map((s) => s.id));
  const baseSpecCd = set.has('hunter_focus') ? 0.75 : 1.0;
  const hasFang = set.has('twin_fang');
  const hasWindfall = set.has('merchant_windfall');

  return {
    stormCombo: set.has('storm_combo'),
    emberVault: set.has('ember_vault'),
    vampireLedger: set.has('vampire_ledger'),
    frostSigil: set.has('frost_sigil'),
    echoBlade: set.has('echo_blade'),
    specialDmgMult: set.has('hunter_focus') ? 1.25 : 1.0,
    specialCdMult: synSet.has('phantom_tempo') ? baseSpecCd * 0.85 : baseSpecCd,
    primaryDmgMult: set.has('titan_swing') ? 1.22 : 1.0,
    rangeMult: set.has('titan_swing') ? 1.22 : 1.0,
    gildedGreed: set.has('gilded_greed'),
    activeSynergies,
    chainTargets: synSet.has('tempest_shatter') ? 4 : 2,
    chainDmgMult: synSet.has('tempest_shatter') ? 1.4 : 1.0,
    emberBlastMult: synSet.has('magma_cleave') ? 1.65 : 1.0,
    emberRadiusBonus: synSet.has('magma_cleave') ? 0.85 : 0,
    vampireEveryNKills: synSet.has('blood_tithe') ? 2 : 3,
    killGoldBonus: synSet.has('blood_tithe') ? 5 : 0,
    echoDmgRatio: synSet.has('phantom_tempo') ? 0.9 : 0.6,
    critChanceBonus: (hasFang ? 0.14 : 0) + (synSet.has('executioner_edge') ? 0.14 : 0),
    critDmgMult: hasFang ? 2.0 : 1.65,
    wardensParry: set.has('wardens_parry'),
    windfallPropGold: hasWindfall ? 4 : 0,
    windfallHealEveryN: hasWindfall ? 6 : 0,
    eliteBossDmgMult: synSet.has('executioner_edge') ? 1.3 : 1.0,
    fullHpDmgMult: synSet.has('midas_bastion') ? 1.25 : 1.0,
    goldDropMult: synSet.has('midas_bastion') ? 1.25 : 1.0,
  };
}
