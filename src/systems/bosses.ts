export type BossId =
  | 'whisper_warden'
  | 'sunstone_colossus'
  | 'obsidian_archon'
  | 'astral_overlord';

export type BossPattern = 'nova' | 'slam' | 'summon' | 'charge';

export interface BossArchetypeDef {
  id: BossId;
  weekIndex: number;
  nameKey: string;
  titleKey: string;
  pattern: BossPattern;
  bodyColor: string;
  accentColor: string;
  emissiveColor: string;
  baseHp: number;
  speed: number;
  attackRange: number;
  windupDuration: number;
  damage: number;
}

export const WEEKLY_BOSSES: BossArchetypeDef[] = [
  {
    id: 'whisper_warden',
    weekIndex: 1,
    nameKey: 'boss_whisper_name',
    titleKey: 'boss_whisper_title',
    pattern: 'nova',
    bodyColor: '#19355C',
    accentColor: '#38E8D8',
    emissiveColor: '#0E7490',
    baseHp: 240,
    speed: 2.75,
    attackRange: 3.1,
    windupDuration: 0.68,
    damage: 2,
  },
  {
    id: 'sunstone_colossus',
    weekIndex: 2,
    nameKey: 'boss_hearth_name',
    titleKey: 'boss_hearth_title',
    pattern: 'slam',
    bodyColor: '#8A3016',
    accentColor: '#F4B942',
    emissiveColor: '#C2410C',
    baseHp: 295,
    speed: 2.35,
    attackRange: 3.35,
    windupDuration: 0.76,
    damage: 2,
  },
  {
    id: 'obsidian_archon',
    weekIndex: 3,
    nameKey: 'boss_abyss_name',
    titleKey: 'boss_abyss_title',
    pattern: 'summon',
    bodyColor: '#2E1065',
    accentColor: '#C084FC',
    emissiveColor: '#6D28D9',
    baseHp: 335,
    speed: 2.55,
    attackRange: 5.8,
    windupDuration: 0.66,
    damage: 2,
  },
  {
    id: 'astral_overlord',
    weekIndex: 4,
    nameKey: 'boss_forge_name',
    titleKey: 'boss_forge_title',
    pattern: 'charge',
    bodyColor: '#450A0A',
    accentColor: '#FF5E3A',
    emissiveColor: '#B91C1C',
    baseHp: 390,
    speed: 3.15,
    attackRange: 3.25,
    windupDuration: 0.6,
    damage: 2,
  },
];

export function getBossForWeek(week: number): BossArchetypeDef {
  const idx = ((Math.max(1, week) - 1) % WEEKLY_BOSSES.length);
  return WEEKLY_BOSSES[idx];
}
