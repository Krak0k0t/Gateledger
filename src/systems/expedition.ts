export type DungeonMode = 'gate' | 'rift';

export const RIFT_ENTRY_COST = 50;

export type DayEventId =
  | 'appraiser_fair'
  | 'forge_festival'
  | 'rift_surge'
  | 'merchant_boom';

export interface DayEventDef {
  id: DayEventId;
  icon: string;
  accent: string;
  nameKey: string;
  descKey: string;
}

export interface DayEventModifiers {
  shopFairMult: number;
  shopPatienceBonus: number;
  shopComboBonus: number;
  forgeDiscountMult: number;
  goldDropMult: number;
  marauderTimeMult: number;
  extraChest: boolean;
  bonusElite: boolean;
}

export const DAY_EVENTS: DayEventDef[] = [
  {
    id: 'appraiser_fair',
    icon: '⚖',
    accent: '#38E8D8',
    nameKey: 'event_appraiser_fair_name',
    descKey: 'event_appraiser_fair_desc',
  },
  {
    id: 'forge_festival',
    icon: '⚒',
    accent: '#FF9E44',
    nameKey: 'event_forge_festival_name',
    descKey: 'event_forge_festival_desc',
  },
  {
    id: 'rift_surge',
    icon: '🜂',
    accent: '#F43F5E',
    nameKey: 'event_rift_surge_name',
    descKey: 'event_rift_surge_desc',
  },
  {
    id: 'merchant_boom',
    icon: '🪙',
    accent: '#F4B942',
    nameKey: 'event_merchant_boom_name',
    descKey: 'event_merchant_boom_desc',
  },
];

export function rollDayEvent(seed: number): DayEventDef {
  const idx = Math.abs(Math.floor(seed)) % DAY_EVENTS.length;
  return DAY_EVENTS[idx];
}

export function getDayEventModifiers(id: DayEventId): DayEventModifiers {
  switch (id) {
    case 'appraiser_fair':
      return {
        shopFairMult: 1.25,
        shopPatienceBonus: 1,
        shopComboBonus: 0,
        forgeDiscountMult: 1,
        goldDropMult: 1,
        marauderTimeMult: 1,
        extraChest: false,
        bonusElite: false,
      };
    case 'forge_festival':
      return {
        shopFairMult: 1,
        shopPatienceBonus: 0,
        shopComboBonus: 0,
        forgeDiscountMult: 0.75,
        goldDropMult: 1,
        marauderTimeMult: 1,
        extraChest: false,
        bonusElite: false,
      };
    case 'rift_surge':
      return {
        shopFairMult: 1,
        shopPatienceBonus: 0,
        shopComboBonus: 0,
        forgeDiscountMult: 1,
        goldDropMult: 1,
        marauderTimeMult: 0.85,
        extraChest: true,
        bonusElite: true,
      };
    case 'merchant_boom':
      return {
        shopFairMult: 1,
        shopPatienceBonus: 0,
        shopComboBonus: 0.1,
        forgeDiscountMult: 1,
        goldDropMult: 1.2,
        marauderTimeMult: 1,
        extraChest: false,
        bonusElite: false,
      };
  }
}

export type SupplyId = 'cartographer_compass' | 'whetstone_oil' | 'insurance_seal';

export interface SupplyDef {
  id: SupplyId;
  icon: string;
  cost: number;
  accent: string;
  nameKey: string;
  descKey: string;
}

export const EXPEDITION_SUPPLIES: SupplyDef[] = [
  {
    id: 'cartographer_compass',
    icon: '🧭',
    cost: 55,
    accent: '#38E8D8',
    nameKey: 'sup_cartographer_compass_name',
    descKey: 'sup_cartographer_compass_desc',
  },
  {
    id: 'whetstone_oil',
    icon: '⚔',
    cost: 65,
    accent: '#FF9E44',
    nameKey: 'sup_whetstone_oil_name',
    descKey: 'sup_whetstone_oil_desc',
  },
  {
    id: 'insurance_seal',
    icon: '🛡',
    cost: 75,
    accent: '#F4B942',
    nameKey: 'sup_insurance_seal_name',
    descKey: 'sup_insurance_seal_desc',
  },
];

export interface SupplyBonuses {
  revealMap: boolean;
  dmgMult: number;
  critBonus: number;
  extraSavedSlots: number;
}

export function computeSupplyBonuses(owned: SupplyId[]): SupplyBonuses {
  const set = new Set<SupplyId>(owned);
  return {
    revealMap: set.has('cartographer_compass'),
    dmgMult: set.has('whetstone_oil') ? 1.15 : 1.0,
    critBonus: set.has('whetstone_oil') ? 0.22 : 0,
    extraSavedSlots: set.has('insurance_seal') ? 2 : 0,
  };
}

export type FamiliarId = 'none' | 'ember_wisp' | 'aether_owl' | 'gilded_scarab';

export interface FamiliarDef {
  id: Exclude<FamiliarId, 'none'>;
  icon: string;
  accent: string;
  shardCost: number;
  goldCost: number;
  nameKey: string;
  descKey: string;
}

export const FAMILIARS: FamiliarDef[] = [
  {
    id: 'ember_wisp',
    icon: '🔥',
    accent: '#FF5E3A',
    shardCost: 2,
    goldCost: 160,
    nameKey: 'fam_ember_wisp_name',
    descKey: 'fam_ember_wisp_desc',
  },
  {
    id: 'aether_owl',
    icon: '🦉',
    accent: '#38E8D8',
    shardCost: 3,
    goldCost: 200,
    nameKey: 'fam_aether_owl_name',
    descKey: 'fam_aether_owl_desc',
  },
  {
    id: 'gilded_scarab',
    icon: '🪲',
    accent: '#F4B942',
    shardCost: 4,
    goldCost: 240,
    nameKey: 'fam_gilded_scarab_name',
    descKey: 'fam_gilded_scarab_desc',
  },
];

export interface FamiliarBonuses {
  id: FamiliarId;
  emberBoltInterval: number;
  emberBoltBaseDmg: number;
  specialDmgMult: number;
  pickupMagnetBonus: number;
  frostPulseInterval: number;
  boonRerollBonus: number;
  shopPatienceBonus: number;
  goldDropMult: number;
  shopFairMult: number;
  scarabChestGold: number;
}

export function computeFamiliarBonuses(id: FamiliarId): FamiliarBonuses {
  switch (id) {
    case 'ember_wisp':
      return {
        id,
        emberBoltInterval: 2.6,
        emberBoltBaseDmg: 10,
        specialDmgMult: 1.12,
        pickupMagnetBonus: 0,
        frostPulseInterval: 0,
        boonRerollBonus: 0,
        shopPatienceBonus: 0,
        goldDropMult: 1.0,
        shopFairMult: 1.0,
        scarabChestGold: 0,
      };
    case 'aether_owl':
      return {
        id,
        emberBoltInterval: 0,
        emberBoltBaseDmg: 0,
        specialDmgMult: 1.0,
        pickupMagnetBonus: 1.6,
        frostPulseInterval: 3.8,
        boonRerollBonus: 1,
        shopPatienceBonus: 1,
        goldDropMult: 1.0,
        shopFairMult: 1.0,
        scarabChestGold: 0,
      };
    case 'gilded_scarab':
      return {
        id,
        emberBoltInterval: 0,
        emberBoltBaseDmg: 0,
        specialDmgMult: 1.0,
        pickupMagnetBonus: 0.6,
        frostPulseInterval: 0,
        boonRerollBonus: 0,
        shopPatienceBonus: 0,
        goldDropMult: 1.25,
        shopFairMult: 1.12,
        scarabChestGold: 15,
      };
    case 'none':
    default:
      return {
        id: 'none',
        emberBoltInterval: 0,
        emberBoltBaseDmg: 0,
        specialDmgMult: 1.0,
        pickupMagnetBonus: 0,
        frostPulseInterval: 0,
        boonRerollBonus: 0,
        shopPatienceBonus: 0,
        goldDropMult: 1.0,
        shopFairMult: 1.0,
        scarabChestGold: 0,
      };
  }
}

export interface RiftScaling {
  tier: number;
  enemyHpMult: number;
  enemySpeedMult: number;
  bonusShards: number;
  pristineBonus: number;
}

export function computeRiftScaling(riftClears: number): RiftScaling {
  const clears = Math.max(0, Math.floor(riftClears));
  const tier = clears + 1;
  return {
    tier,
    enemyHpMult: 1 + (tier - 1) * 0.14,
    enemySpeedMult: 1 + Math.min(0.45, (tier - 1) * 0.05),
    bonusShards: Math.floor((tier - 1) / 2),
    pristineBonus: Math.min(0.3, (tier - 1) * 0.06),
  };
}

