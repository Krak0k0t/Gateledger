import {
  createRelicInstance,
  type BagRelicItem,
  type RelicEra,
  type RelicTemplate,
} from './backpack';

export type CustomerArchetype = 'townsfolk' | 'scholar' | 'noble' | 'adventurer';
export type CustomerTrait = 'era_collector' | 'appraiser' | 'impatient' | 'generous';

export interface CustomerOfferState {
  id: string;
  name: string;
  archetype: CustomerArchetype;
  trait: CustomerTrait;
  itemIndex: number;
  item: BagRelicItem;
  fairPrice: number;
  maxWillingPrice: number;
  patience: number;
  maxPatience: number;
  mood: 'curious' | 'happy' | 'tense' | 'angry' | 'sold';
  resonanceTriggered: boolean;
}

export interface CollateralPawnState {
  active: boolean;
  redeemed: boolean;
  advanceGold: number;
  redeemCost: number;
  heirloomName: string;
  era: RelicEra;
}

export interface LivePawnContract {
  item: BagRelicItem;
  buffActive: boolean;
}

export interface VipOrder {
  era: RelicEra;
  requireFused: boolean;
  multiplier: number;
  collectorName: string;
  fulfilled: boolean;
}

export interface LiveAuctionState {
  item: BagRelicItem;
  currentBid: number;
  bidderName: string;
  round: number;
  maxRounds: number;
  walked: boolean;
  settledGold: number;
}

export interface ShopSessionState {
  pedestals: (BagRelicItem | null)[];
  activeCustomer: CustomerOfferState | null;
  dealStreak: number;
  dailyRevenue: number;
  customersServed: number;
  pawn: CollateralPawnState;
  auctionTrendWon: boolean;
  trendingEra: RelicEra;
  bountyEra: RelicEra;
  vipOrder: VipOrder;
  nightGuestAvailable: boolean;
  nightGuestUsed: boolean;
  nightGuestKeyGranted: boolean;
  fairBonusMult: number;
  streakComboBonus: number;
}

const ARCHETYPES: {
  type: CustomerArchetype;
  names: string[];
  priceTolerance: number;
  basePatience: number;
}[] = [
  { type: 'townsfolk', names: ['Mira', 'Tomas', 'Bryn'], priceTolerance: 1.18, basePatience: 3 },
  { type: 'scholar', names: ['Vesper', 'Aldous', 'Lyra'], priceTolerance: 1.32, basePatience: 3 },
  { type: 'noble', names: ['Lady Seraphina', 'Lord Corvus'], priceTolerance: 1.55, basePatience: 2 },
  { type: 'adventurer', names: ['Kael', 'Ronan', 'Sera'], priceTolerance: 1.25, basePatience: 4 },
];

export function hasTwinResonance(pedestals: (BagRelicItem | null)[], index: number): boolean {
  const item = pedestals[index];
  if (!item) return false;
  const left = index > 0 ? pedestals[index - 1] : null;
  const right = index < pedestals.length - 1 ? pedestals[index + 1] : null;
  return (left !== null && left.era === item.era) || (right !== null && right.era === item.era);
}

export function calculatePedestalFairPrice(
  pedestals: (BagRelicItem | null)[],
  index: number,
  trendingEra: RelicEra,
  auctionTrendWon: boolean,
  fairBonusMult = 1,
): { fairPrice: number; resonance: boolean } {
  const item = pedestals[index];
  if (!item) return { fairPrice: 0, resonance: false };
  const resonance = hasTwinResonance(pedestals, index);
  let mult = fairBonusMult;
  if (resonance) mult += 0.35; // H02 Twin-Display Resonance
  if (item.era === trendingEra) {
    mult += auctionTrendWon ? 0.5 : 0.2;
  }
  return {
    fairPrice: Math.round(item.baseValue * mult),
    resonance,
  };
}

export function createShopSession(
  stash: BagRelicItem[],
  pedestalCount: number,
  trendingEra: RelicEra,
  rand: () => number,
  options?: {
    initialStreak?: number;
    fairBonusMult?: number;
    bountyEra?: RelicEra;
    streakComboBonus?: number;
  },
): { session: ShopSessionState; remainingStash: BagRelicItem[] } {
  const pedestals: (BagRelicItem | null)[] = Array.from({ length: pedestalCount }, () => null);
  const remaining = [...stash];
  for (let i = 0; i < pedestalCount && remaining.length > 0; i++) {
    pedestals[i] = remaining.shift() ?? null;
  }

  const eras: RelicEra[] = ['astral', 'hearth', 'abyss', 'forge'];
  const bountyEra = options?.bountyEra ?? eras[Math.floor(rand() * eras.length)];
  const vipEra = eras[Math.floor(rand() * eras.length)];
  const vipNames = ['Grand Archivist', 'Duchess Aurelia', 'High Artificer'];
  const vipOrder: VipOrder = {
    era: vipEra,
    requireFused: rand() < 0.35,
    multiplier: 2.2,
    collectorName: vipNames[Math.floor(rand() * vipNames.length)],
    fulfilled: false,
  };
  const pawnActive = rand() < 0.75;
  return {
    session: {
      pedestals,
      activeCustomer: null,
      dealStreak: options?.initialStreak ?? 0,
      dailyRevenue: 0,
      customersServed: 0,
      pawn: {
        active: pawnActive,
        redeemed: false,
        advanceGold: 95,
        redeemCost: 135,
        heirloomName: 'Sunken Sun-Pendant',
        era: trendingEra,
      },
      auctionTrendWon: false,
      trendingEra,
      bountyEra,
      vipOrder,
      nightGuestAvailable: true,
      nightGuestUsed: false,
      nightGuestKeyGranted: false,
      fairBonusMult: options?.fairBonusMult ?? 1,
      streakComboBonus: options?.streakComboBonus ?? 0,
    },
    remainingStash: remaining,
  };
}

export function spawnNextCustomer(
  session: ShopSessionState,
  patienceBonus: number,
  rand: () => number,
): CustomerOfferState | null {
  const filledIndices: number[] = [];
  for (let i = 0; i < session.pedestals.length; i++) {
    if (session.pedestals[i]) filledIndices.push(i);
  }
  if (filledIndices.length === 0) {
    session.activeCustomer = null;
    session.nightGuestAvailable = true;
    return null;
  }

  const pickIdx = filledIndices[Math.floor(rand() * filledIndices.length)];
  const item = session.pedestals[pickIdx]!;
  // High deal streak (3+) draws wealthy Nobles more frequently
  const pool =
    session.dealStreak >= 3 && rand() < 0.55
      ? ARCHETYPES.filter((a) => a.type === 'noble' || a.type === 'scholar')
      : ARCHETYPES;
  const arch = pool[Math.floor(rand() * pool.length)];
  const name = arch.names[Math.floor(rand() * arch.names.length)];
  const { fairPrice: rawFairPrice, resonance } = calculatePedestalFairPrice(
    session.pedestals,
    pickIdx,
    session.trendingEra,
    session.auctionTrendWon,
    session.fairBonusMult,
  );

  const traits: CustomerTrait[] = ['era_collector', 'appraiser', 'impatient', 'generous'];
  const trait = traits[Math.floor(rand() * traits.length)];
  const eraPreferred = item.era === session.trendingEra || item.era === session.bountyEra;
  const craftValued = item.pristine || Boolean(item.fused);

  let traitPriceMult = 1.0;
  if (trait === 'era_collector' && eraPreferred) traitPriceMult = 1.22;
  else if (trait === 'appraiser' && craftValued) traitPriceMult = 1.25;
  const fairPrice = Math.round(rawFairPrice * traitPriceMult);

  // Streak gives small natural prestige tolerance boost; impatient pays more if fast
  const streakMult = 1 + Math.min(0.25, session.dealStreak * 0.04);
  const toleranceTraitMult = trait === 'impatient' ? 1.2 : 1.0;
  const maxWilling = Math.round(fairPrice * arch.priceTolerance * streakMult * toleranceTraitMult);
  const patienceDelta = trait === 'generous' ? 1 : trait === 'impatient' ? -1 : 0;
  const maxPatience = Math.max(1, arch.basePatience + patienceBonus + patienceDelta);

  const customer: CustomerOfferState = {
    id: `cust_${session.customersServed + 1}`,
    name,
    archetype: arch.type,
    trait,
    itemIndex: pickIdx,
    item,
    fairPrice,
    maxWillingPrice: maxWilling,
    patience: maxPatience,
    maxPatience,
    mood: 'curious',
    resonanceTriggered: resonance,
  };
  session.activeCustomer = customer;
  return customer;
}

export interface HaggleResolution {
  outcome: 'sold' | 'counter' | 'walked';
  goldEarned: number;
  comboBonus: number;
}

export function submitHaggleOffer(
  session: ShopSessionState,
  askedPrice: number,
): HaggleResolution {
  const customer = session.activeCustomer;
  if (!customer) {
    return { outcome: 'walked', goldEarned: 0, comboBonus: 0 };
  }

  if (askedPrice <= customer.maxWillingPrice) {
    const generousBonus = customer.trait === 'generous' ? 0.1 : 0;
    const comboMult =
      1 + Math.min(0.35, session.dealStreak * 0.05) + generousBonus + (session.streakComboBonus || 0);
    const totalEarned = Math.round(askedPrice * comboMult);
    const comboBonus = totalEarned - askedPrice;
    session.dealStreak += 1;
    session.dailyRevenue += totalEarned;
    session.customersServed += 1;
    session.pedestals[customer.itemIndex] = null;
    customer.mood = 'sold';
    session.activeCustomer = null;
    return { outcome: 'sold', goldEarned: totalEarned, comboBonus };
  }

  customer.patience -= 1;
  if (customer.patience <= 0) {
    customer.mood = 'angry';
    session.dealStreak = 0;
    session.customersServed += 1;
    session.activeCustomer = null;
    return { outcome: 'walked', goldEarned: 0, comboBonus: 0 };
  }

  customer.mood = customer.patience === 1 ? 'tense' : 'happy';
  return { outcome: 'counter', goldEarned: 0, comboBonus: 0 };
}

/**
 * Night Gate Guest specialty deal: buys a cursed/abyssal relic from stash at 1.75x base value
 * OR grants a Secret Vault Key for the next dungeon expedition.
 */
export function resolveNightGuestCursedBuyout(
  stash: BagRelicItem[],
): { remainingStash: BagRelicItem[]; goldEarned: number; soldItem: BagRelicItem | null } {
  const idx = stash.findIndex(
    (item) => item.curse !== 'none' || item.era === 'abyss',
  );
  if (idx === -1) {
    return { remainingStash: stash, goldEarned: 0, soldItem: null };
  }
  const soldItem = stash[idx];
  const goldEarned = Math.round(soldItem.baseValue * 1.75);
  return {
    remainingStash: stash.filter((_, i) => i !== idx),
    goldEarned,
    soldItem,
  };
}

export function fulfillVipOrder(
  stash: BagRelicItem[],
  vipOrder: VipOrder,
): { remainingStash: BagRelicItem[]; goldEarned: number; soldItem: BagRelicItem | null } {
  if (vipOrder.fulfilled) {
    return { remainingStash: stash, goldEarned: 0, soldItem: null };
  }
  const idx = stash.findIndex((item) =>
    vipOrder.requireFused ? Boolean(item.fused) : item.era === vipOrder.era && item.rarity >= 2,
  );
  if (idx === -1) {
    return { remainingStash: stash, goldEarned: 0, soldItem: null };
  }
  const soldItem = stash[idx];
  const goldEarned = Math.round(soldItem.baseValue * vipOrder.multiplier);
  vipOrder.fulfilled = true;
  return {
    remainingStash: stash.filter((_, i) => i !== idx),
    goldEarned,
    soldItem,
  };
}

const AUCTION_BIDDERS = ['Lord Corvus', 'Arch-Alchemist Lyra', 'Lady Seraphina'];

export function createLiveAuction(item: BagRelicItem): LiveAuctionState {
  return {
    item,
    currentBid: Math.round(item.baseValue * 1.15),
    bidderName: AUCTION_BIDDERS[0],
    round: 1,
    maxRounds: 3,
    walked: false,
    settledGold: 0,
  };
}

export function raiseLiveAuctionHype(
  auction: LiveAuctionState,
  rand: () => number,
): LiveAuctionState {
  if (auction.walked || auction.settledGold > 0) return auction;
  // Risk scales gently per round: 15% on R1, 30% on R2, 48% on R3
  const walkChance = 0.12 + (auction.round - 1) * 0.16;
  if (rand() < walkChance) {
    return { ...auction, walked: true };
  }
  const nextBid = Math.round(auction.currentBid * (1.22 + rand() * 0.14));
  const nextRound = auction.round + 1;
  return {
    ...auction,
    currentBid: nextBid,
    bidderName: AUCTION_BIDDERS[nextRound % AUCTION_BIDDERS.length],
    round: Math.min(auction.maxRounds, nextRound),
  };
}

export const TRANSMUTE_COST = 120;

export function transmuteRelics(
  stash: BagRelicItem[],
  idxA: number,
  idxB: number,
  relicPool: RelicTemplate[],
  rand: () => number,
  uid = `trans_${Date.now()}`,
): { nextStash: BagRelicItem[]; result: BagRelicItem } | null {
  if (
    idxA < 0 ||
    idxB < 0 ||
    idxA === idxB ||
    idxA >= stash.length ||
    idxB >= stash.length ||
    relicPool.length === 0
  ) {
    return null;
  }
  const itemA = stash[idxA];
  const itemB = stash[idxB];
  const targetRarity = Math.min(3, Math.max(itemA.rarity, itemB.rarity) + 1);
  const tierPool = relicPool.filter((r) => r.rarity >= targetRarity);
  const candidates = tierPool.length > 0 ? tierPool : relicPool;
  const tpl = candidates[Math.floor(rand() * candidates.length)] ?? candidates[0];
  const pristine = (itemA.pristine && itemB.pristine) || rand() < 0.35;
  const result = createRelicInstance(tpl, uid, pristine, false);
  const nextStash = stash.filter((_, idx) => idx !== idxA && idx !== idxB);
  nextStash.unshift(result);
  return { nextStash, result };
}
