import type { TranslationKey } from '../i18n/translations';

export type AbilityId =
  | 'whirlwind'
  | 'leap_slam'
  | 'blade_volley'
  | 'ignis_cone'
  | 'aegis_ward'
  | 'frost_nova';

export type AbilityCategory = 'physical' | 'magic';

export type AbilityActionKey =
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'ability5'
  | 'ability6';

export interface AbilityDef {
  id: AbilityId;
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  actionKey: AbilityActionKey;
  category: AbilityCategory;
  cooldown: number;
  manaCost: number;
  accent: string;
  glowRgba: string;
  nameKey: TranslationKey;
  descKey: TranslationKey;
}

export const HERO_ABILITIES: AbilityDef[] = [
  {
    id: 'whirlwind',
    slot: 1,
    actionKey: 'ability1',
    category: 'physical',
    cooldown: 4.5,
    manaCost: 0,
    accent: '#F4B942',
    glowRgba: 'rgba(244, 185, 66, 0.45)',
    nameKey: 'ability_whirlwind_name',
    descKey: 'ability_whirlwind_desc',
  },
  {
    id: 'leap_slam',
    slot: 2,
    actionKey: 'ability2',
    category: 'physical',
    cooldown: 6.0,
    manaCost: 10,
    accent: '#FF8A4C',
    glowRgba: 'rgba(255, 138, 76, 0.45)',
    nameKey: 'ability_leap_slam_name',
    descKey: 'ability_leap_slam_desc',
  },
  {
    id: 'blade_volley',
    slot: 3,
    actionKey: 'ability3',
    category: 'physical',
    cooldown: 4.0,
    manaCost: 15,
    accent: '#38E8D8',
    glowRgba: 'rgba(56, 232, 216, 0.45)',
    nameKey: 'ability_blade_volley_name',
    descKey: 'ability_blade_volley_desc',
  },
  {
    id: 'ignis_cone',
    slot: 4,
    actionKey: 'ability4',
    category: 'magic',
    cooldown: 5.0,
    manaCost: 25,
    accent: '#FF5E3A',
    glowRgba: 'rgba(255, 94, 58, 0.5)',
    nameKey: 'ability_ignis_cone_name',
    descKey: 'ability_ignis_cone_desc',
  },
  {
    id: 'aegis_ward',
    slot: 5,
    actionKey: 'ability5',
    category: 'magic',
    cooldown: 8.0,
    manaCost: 30,
    accent: '#FACC15',
    glowRgba: 'rgba(250, 204, 21, 0.48)',
    nameKey: 'ability_aegis_ward_name',
    descKey: 'ability_aegis_ward_desc',
  },
  {
    id: 'frost_nova',
    slot: 6,
    actionKey: 'ability6',
    category: 'magic',
    cooldown: 7.5,
    manaCost: 35,
    accent: '#60A5FA',
    glowRgba: 'rgba(96, 165, 250, 0.5)',
    nameKey: 'ability_frost_nova_name',
    descKey: 'ability_frost_nova_desc',
  },
];

export const ABILITY_ORDER: AbilityId[] = HERO_ABILITIES.map((a) => a.id);

export const ABILITY_MAP: Record<AbilityId, AbilityDef> = {
  whirlwind: HERO_ABILITIES[0],
  leap_slam: HERO_ABILITIES[1],
  blade_volley: HERO_ABILITIES[2],
  ignis_cone: HERO_ABILITIES[3],
  aegis_ward: HERO_ABILITIES[4],
  frost_nova: HERO_ABILITIES[5],
};

export function createInitialAbilityCooldowns(): Record<AbilityId, number> {
  return {
    whirlwind: 0,
    leap_slam: 0,
    blade_volley: 0,
    ignis_cone: 0,
    aegis_ward: 0,
    frost_nova: 0,
  };
}

export function getAbilityByActionKey(actionKey: AbilityActionKey): AbilityDef {
  return HERO_ABILITIES.find((a) => a.actionKey === actionKey) ?? HERO_ABILITIES[0];
}
