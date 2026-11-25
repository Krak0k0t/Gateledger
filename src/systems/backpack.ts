export type RelicEra = 'astral' | 'hearth' | 'abyss' | 'forge';
export type SlotCurseType = 'none' | 'pyre' | 'vault' | 'gilded' | 'lock' | 'cleanse' | 'void';

export interface RelicTemplate {
  id: string;
  era: RelicEra;
  baseValue: number;
  rarity: number;
  color: string;
  curse: SlotCurseType;
}

export interface BagRelicItem {
  uid: string;
  templateId: string;
  name: string;
  era: RelicEra;
  baseValue: number;
  rarity: number;
  color: string;
  curse: SlotCurseType;
  pristine: boolean; // true if won via Appraisal Strike (H03) -> 2x baseValue
  bountySealed?: boolean; // true if claimed via Guild Bounty Appraisal -> 3x baseValue
  fused?: boolean; // true if forged via adjacent Elemental Fusion
}

export const BAG_COLS = 5;
export const BAG_ROWS = 4;
export const BAG_SIZE = BAG_COLS * BAG_ROWS;
export const BELT_SAFE_SLOTS = 3; // Slots 0..2 survive defeat

export function formatRelicName(templateId: string): string {
  return templateId
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export function createRelicInstance(
  template: RelicTemplate,
  uid: string,
  pristine = false,
  bountySealed = false,
): BagRelicItem {
  return {
    uid,
    templateId: template.id,
    name: formatRelicName(template.id),
    era: template.era,
    baseValue: template.baseValue,
    rarity: template.rarity,
    color: template.color,
    curse: template.curse,
    pristine,
    bountySealed,
    fused: false,
  };
}

export function createEmptyBag(): (BagRelicItem | null)[] {
  return Array.from({ length: BAG_SIZE }, () => null);
}

export function getNeighborIndices(index: number): number[] {
  const r = Math.floor(index / BAG_COLS);
  const c = index % BAG_COLS;
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * BAG_COLS + c);
  if (r < BAG_ROWS - 1) out.push((r + 1) * BAG_COLS + c);
  if (c > 0) out.push(r * BAG_COLS + (c - 1));
  if (c < BAG_COLS - 1) out.push(r * BAG_COLS + (c + 1));
  return out;
}

export function isSlotLocked(grid: (BagRelicItem | null)[], index: number): boolean {
  const neighbors = getNeighborIndices(index);
  for (const nIdx of neighbors) {
    const neighbor = grid[nIdx];
    if (neighbor && neighbor.curse === 'lock') {
      // Check if neighbor itself is cleansed by an adjacent cleanse item
      const nNeighbors = getNeighborIndices(nIdx);
      const cleansed = nNeighbors.some((nn) => grid[nn]?.curse === 'cleanse');
      if (!cleansed) return true;
    }
  }
  return false;
}

export function addItemToBag(
  grid: (BagRelicItem | null)[],
  item: BagRelicItem,
): boolean {
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] && !isSlotLocked(grid, i)) {
      grid[i] = item;
      return true;
    }
  }
  return false;
}

export function swapBagSlots(
  grid: (BagRelicItem | null)[],
  idxA: number,
  idxB: number,
): boolean {
  if (idxA < 0 || idxB < 0 || idxA >= BAG_SIZE || idxB >= BAG_SIZE || idxA === idxB) {
    return false;
  }
  if (isSlotLocked(grid, idxA) || isSlotLocked(grid, idxB)) {
    return false;
  }
  const tmp = grid[idxA];
  grid[idxA] = grid[idxB];
  grid[idxB] = tmp;
  return true;
}

export function computeEffectiveItemValue(
  grid: (BagRelicItem | null)[],
  index: number,
): number {
  const item = grid[index];
  if (!item) return 0;
  let val = item.baseValue * (item.pristine ? 2 : 1) * (item.bountySealed ? 3 : 1);
  const neighbors = getNeighborIndices(index);

  const hasGildedNeighbor = neighbors.some((nIdx) => grid[nIdx]?.curse === 'gilded');
  if (hasGildedNeighbor) {
    val *= 2;
  }

  const hasCompassNeighbor = neighbors.some((nIdx) => grid[nIdx]?.templateId === 'royal_compass');
  if (hasCompassNeighbor) {
    val *= 1.25;
  }

  if (item.curse === 'void') {
    const emptyNeighbors = neighbors.filter((nIdx) => grid[nIdx] === null).length;
    val *= 1 + emptyNeighbors * 0.25;
  }

  return Math.round(val);
}

/**
 * Turns every item currently in the bag into Pristine 2x (Altar blessing).
 */
export function gildAllBagItems(grid: (BagRelicItem | null)[]): number {
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    const item = grid[i];
    if (item && !item.pristine) {
      grid[i] = { ...item, pristine: true };
      count += 1;
    }
  }
  return count;
}

export function computePackSetBonuses(grid: (BagRelicItem | null)[]): RelicEra[] {
  const counts: Record<RelicEra, number> = {
    astral: 0,
    hearth: 0,
    abyss: 0,
    forge: 0,
  };
  for (let i = 0; i < grid.length; i++) {
    const it = grid[i];
    if (it) counts[it.era] = (counts[it.era] ?? 0) + 1;
  }
  const order: RelicEra[] = ['astral', 'hearth', 'abyss', 'forge'];
  return order.filter((era) => counts[era] >= 3);
}

export interface ExtractionResult {
  savedItems: BagRelicItem[];
  burnedNames: string[];
  cleansedCount: number;
  fusedNames: string[];
  eraSets: RelicEra[];
}

/**
 * Resolves all slot curses + adjacent Elemental Fusion + 3-of-a-kind Era Sets upon extracting or falling in the ruins.
 * - cleanse / royal_compass: purifies adjacent cursed items before pyre triggers (+compass aura)
 * - pyre: destroys an adjacent weaker non-vault item
 * - vault: survives defeat alongside belt slots 0..2
 * - gilded: doubles effective value of orthogonal neighbors
 * - void: +25% value per empty orthogonal neighbor slot
 * - adjacent identical relics (when escaping safely): fuse into a Radiant Relic (1.45x combined value)
 * - 3+ relics of the same Era surviving extraction: +15% Era Resonance Set value bonus
 */
export function resolveBagExtraction(
  grid: (BagRelicItem | null)[],
  escapedSafely: boolean,
  extraSavedSlots = 0,
): ExtractionResult {
  const working = grid.map((item) => (item ? { ...item } : null));
  let cleansedCount = 0;

  // 1. Cleanse adjacent curses first
  for (let i = 0; i < working.length; i++) {
    const item = working[i];
    if (item && item.curse === 'cleanse') {
      for (const nIdx of getNeighborIndices(i)) {
        const neighbor = working[nIdx];
        if (neighbor && (neighbor.curse === 'pyre' || neighbor.curse === 'lock')) {
          neighbor.curse = 'none';
          cleansedCount += 1;
        }
      }
    }
  }

  // 2. Pyre destroys weakest non-vault neighbor if unpurified
  const burnedIndices = new Set<number>();
  for (let i = 0; i < working.length; i++) {
    const item = working[i];
    if (item && item.curse === 'pyre' && !burnedIndices.has(i)) {
      let weakestIdx = -1;
      let weakestVal = Infinity;
      for (const nIdx of getNeighborIndices(i)) {
        const neighbor = working[nIdx];
        if (neighbor && !burnedIndices.has(nIdx) && neighbor.curse !== 'vault') {
          if (neighbor.baseValue < weakestVal) {
            weakestVal = neighbor.baseValue;
            weakestIdx = nIdx;
          }
        }
      }
      if (weakestIdx !== -1) {
        burnedIndices.add(weakestIdx);
      }
    }
  }

  const burnedNames: string[] = [];
  for (const bIdx of burnedIndices) {
    const burned = working[bIdx];
    if (burned) burnedNames.push(burned.name);
    working[bIdx] = null;
  }

  // 3. Adjacent Elemental Fusion when escaping safely
  const fusedNames: string[] = [];
  if (escapedSafely) {
    const consumedByFusion = new Set<number>();
    for (let i = 0; i < working.length; i++) {
      if (consumedByFusion.has(i)) continue;
      const itemA = working[i];
      if (!itemA || itemA.fused) continue;
      for (const nIdx of getNeighborIndices(i)) {
        if (nIdx <= i || consumedByFusion.has(nIdx)) continue;
        const itemB = working[nIdx];
        if (itemB && !itemB.fused && itemB.templateId === itemA.templateId) {
          const valA = computeEffectiveItemValue(working, i);
          const valB = computeEffectiveItemValue(working, nIdx);
          const combinedValue = Math.round((valA + valB) * 1.45);
          const radiantName = `Radiant ${formatRelicName(itemA.templateId)}`;
          working[i] = {
            ...itemA,
            name: radiantName,
            baseValue: combinedValue,
            rarity: Math.min(4, itemA.rarity + 1),
            pristine: false,
            bountySealed: Boolean(itemA.bountySealed || itemB.bountySealed),
            fused: true,
          };
          working[nIdx] = null;
          consumedByFusion.add(i);
          consumedByFusion.add(nIdx);
          fusedNames.push(radiantName);
          break;
        }
      }
    }
  }

  // 4. Collect surviving items and check 3-of-a-kind Era Set bonuses (+15% extraction value)
  const insuredIndices = new Set<number>();
  if (!escapedSafely && extraSavedSlots > 0) {
    const atRisk: { idx: number; effVal: number }[] = [];
    for (let i = 0; i < working.length; i++) {
      const item = working[i];
      if (!item) continue;
      if (i >= BELT_SAFE_SLOTS && item.curse !== 'vault') {
        atRisk.push({ idx: i, effVal: computeEffectiveItemValue(working, i) });
      }
    }
    atRisk.sort((a, b) => b.effVal - a.effVal);
    for (let k = 0; k < Math.min(extraSavedSlots, atRisk.length); k++) {
      insuredIndices.add(atRisk[k].idx);
    }
  }

  const survivingItems: { item: BagRelicItem; effectiveValue: number }[] = [];
  for (let i = 0; i < working.length; i++) {
    const item = working[i];
    if (!item) continue;
    const survivesDefeat =
      i < BELT_SAFE_SLOTS || item.curse === 'vault' || insuredIndices.has(i);
    if (!escapedSafely && !survivesDefeat) continue;

    const effectiveValue = item.fused ? item.baseValue : computeEffectiveItemValue(working, i);
    survivingItems.push({ item, effectiveValue });
  }

  const eraSets = computePackSetBonuses(survivingItems.map((s) => s.item));
  const eraSetLookup = new Set<RelicEra>(eraSets);

  const savedItems: BagRelicItem[] = survivingItems.map(({ item, effectiveValue }) => ({
    ...item,
    baseValue: eraSetLookup.has(item.era) ? Math.round(effectiveValue * 1.15) : effectiveValue,
    pristine: false, // baked into effective baseValue for shop shelf clarity
    curse: item.curse === 'pyre' || item.curse === 'lock' ? 'none' : item.curse,
  }));

  return { savedItems, burnedNames, cleansedCount, fusedNames, eraSets };
}

export interface BeltPerks {
  speedMult: number;
  specialCdMult: number;
  floorHeal: number;
  abyssPoison: boolean;
  dmgMult: number;
  activeTags: string[];
}

/**
 * Inspects Safe Belt slots 0..2 (B1..B3) and grants active dungeon perks by relic era:
 * - astral -> +12% Move Speed & -12% [Q] Cooldown
 * - hearth -> +1 HP healed when descending to a deeper floor
 * - abyss  -> Melee strikes inflict Abyssal Shadow Poison (DoT)
 * - forge  -> +20% Attack Damage
 */
export function computeBeltPerks(grid: (BagRelicItem | null)[]): BeltPerks {
  let astral = 0;
  let hearth = 0;
  let abyss = 0;
  let forge = 0;
  for (let i = 0; i < BELT_SAFE_SLOTS; i++) {
    const it = grid[i];
    if (!it) continue;
    if (it.era === 'astral') astral += 1;
    else if (it.era === 'hearth') hearth += 1;
    else if (it.era === 'abyss') abyss += 1;
    else if (it.era === 'forge') forge += 1;
  }
  const activeTags: string[] = [];
  if (astral > 0) activeTags.push('Astral: +Spd/-CD');
  if (hearth > 0) activeTags.push('Hearth: +HP/Floor');
  if (abyss > 0) activeTags.push('Abyss: Poison');
  if (forge > 0) activeTags.push('Forge: +20% Dmg');
  return {
    speedMult: astral > 0 ? 1.12 + Math.min(0.08, (astral - 1) * 0.04) : 1.0,
    specialCdMult: astral > 0 ? 0.88 : 1.0,
    floorHeal: hearth > 0 ? 1 : 0,
    abyssPoison: abyss > 0,
    dmgMult: forge > 0 ? 1.2 : 1.0,
    activeTags,
  };
}

