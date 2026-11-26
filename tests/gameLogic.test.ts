import assert from 'node:assert/strict';
import test from 'node:test';
import rawContent from '../src/data/gameContent.json' with { type: 'json' };
import { isRtlLanguage, SUPPORTED_LANGUAGES, t, type LanguageCode } from '../src/i18n/translations';
import {
  addItemToBag,
  computeBeltPerks,
  computeEffectiveItemValue,
  computePackSetBonuses,
  createEmptyBag,
  createRelicInstance,
  gildAllBagItems,
  isSlotLocked,
  resolveBagExtraction,
  swapBagSlots,
  type RelicTemplate,
} from '../src/systems/backpack';
import {
  applyBoonToSim,
  applyShrineChoice,
  computeCameraRelativeMove,
  createCourtyardSim,
  cycleTargetEnemyId,
  DOOR_POSITIONS,
  enterDungeonFloor,
  getEndlessScale,
  getRoomGroundY,
  initializeRoomEnemyAggro,
  stepWorldSim,
  transitionDungeonRoom,
  type DifficultyPreset,
  type SimEvents,
  type WeaponDef,
} from '../src/systems/dungeonSim';
import {
  BOON_CATALOG,
  BOON_SYNERGIES,
  computeActiveSynergies,
  computeBoonEffects,
  getPotentialSynergiesForChoice,
  rollBoonChoices,
} from '../src/systems/boons';
import { getBossForWeek, WEEKLY_BOSSES } from '../src/systems/bosses';
import {
  calculatePedestalFairPrice,
  createLiveAuction,
  createShopSession,
  fulfillVipOrder,
  hasTwinResonance,
  raiseLiveAuctionHype,
  resolveNightGuestCursedBuyout,
  spawnNextCustomer,
  submitHaggleOffer,
  TRANSMUTE_COST,
  transmuteRelics,
  type VipOrder,
} from '../src/systems/economy';
import { getDailySeed } from '../src/core/rng';
import { createInputHub } from '../src/core/input';
import {
  computeSubduedMusicGain,
  getNextCarouselIndex,
  SOUNDTRACK_TRACKS,
} from '../src/core/music';
import { isMobileDevice } from '../src/hooks/useDeviceType';
import {
  createDefaultSettings,
  DEFAULT_KEYBINDS,
  formatKeybindLabel,
  getGraphicsLevel,
  getGraphicsProfile,
  GraphicsLevel,
  KEYBIND_ACTIONS,
  normalizeKeybinds,
  normalizeSettings,
  rebindKeyAction,
} from '../src/core/settings';
import { HERO_ABILITIES } from '../src/systems/abilities';
import {
  ACHIEVEMENTS,
  createDefaultRecords,
  exportSavePayload,
  grantAchievements,
  importSavePayload,
  normalizeRecords,
} from '../src/systems/meta';
import {
  advanceContractProgress,
  BESTIARY_ENTRIES,
  computeCharterBonuses,
  computePactModifiers,
  createRunContract,
  GATE_PACTS,
  getNextTalentCost,
  GUILD_TALENTS,
  scaleShardsByPact,
} from '../src/systems/charter';
import {
  computeFamiliarBonuses,
  computeRiftScaling,
  computeSupplyBonuses,
  DAY_EVENTS,
  EXPEDITION_SUPPLIES,
  FAMILIARS,
  getDayEventModifiers,
  RIFT_ENTRY_COST,
  rollDayEvent,
} from '../src/systems/expedition';

const RELICS = rawContent.relics as RelicTemplate[];
const WEAPONS = rawContent.weapons as WeaponDef[];
const STANDARD_DIFF = rawContent.difficulties.standard as DifficultyPreset;

function makeRand(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

test('i18n: all 16 required languages exist with RTL & variable interpolation', () => {
  const expected: LanguageCode[] = [
    'en',
    'fr',
    'de',
    'es',
    'pt',
    'zh',
    'ar',
    'uk',
    'ru',
    'ja',
    'pl',
    'it',
    'vi',
    'fa',
    'elv',
    'orc',
  ];
  assert.equal(SUPPORTED_LANGUAGES.length, 16);
  for (const code of expected) {
    assert.ok(
      SUPPORTED_LANGUAGES.some((l) => l.code === code),
      `Missing language ${code}`,
    );
    const title = t(code, 'enter_courtyard');
    assert.ok(title.length > 0, `Empty translation for ${code}`);
  }
  assert.equal(isRtlLanguage('ar'), true);
  assert.equal(isRtlLanguage('fa'), true);
  assert.equal(isRtlLanguage('en'), false);
  assert.equal(t('en', 'hud_week_day', { w: 2, d: 3 }), 'Week 2 · Day 3');

  const stage23Keys = [
    'charter_title',
    'talent_vital_name',
    'pact_frenzy_name',
    'contract_slay',
    'codex_tab_bestiary',
    'boon_reroll',
    'forge_temper_btn',
    'alchemy_purify_title',
    'bestiary_slime_name',
  ] as const;
  for (const code of expected) {
    for (const k of stage23Keys) {
      assert.ok(t(code, k).length > 0, `Empty translation ${k} for ${code}`);
    }
    assert.ok(t(code, 'bestiary_slain', { c: 7 }).includes('7'), `Missing {c} in bestiary_slain for ${code}`);
  }
});

test('backpack: gilded doubles neighbor, cleanse purifies pyre/lock, defeat saves belt + vault', () => {
  const bag = createEmptyBag();
  const baseTpl = RELICS.find((r) => r.id === 'whisper_seal')!;
  const gildedTpl = RELICS.find((r) => r.id === 'brass_astrolabe')!;
  const pyreTpl = RELICS.find((r) => r.id === 'terracotta_idol')!;
  const cleanseTpl = RELICS.find((r) => r.id === 'ivory_quill')!;
  const vaultTpl = RELICS.find((r) => r.id === 'star_prism')!;
  const lockTpl = RELICS.find((r) => r.id === 'runed_fang')!;

  // Slot 0 (belt): normal whisper_seal; Slot 1 (belt): gilded -> doubles Slot 0!
  bag[0] = createRelicInstance(baseTpl, 'r0', false);
  bag[1] = createRelicInstance(gildedTpl, 'r1', false);
  assert.equal(computeEffectiveItemValue(bag, 0), baseTpl.baseValue * 2);

  // Slot 6: lock locks Slot 7 unless cleansed
  bag[6] = createRelicInstance(lockTpl, 'r6', false);
  assert.equal(isSlotLocked(bag, 7), true);
  // Put cleanse next to lock (Slot 5) -> unlocks Slot 7!
  bag[5] = createRelicInstance(cleanseTpl, 'r5', false);
  assert.equal(isSlotLocked(bag, 7), false);

  // Slot 13: unpurified pyre burns weakest non-vault neighbor (Slot 14), ignores Slot 12 (vault)
  bag[13] = createRelicInstance(pyreTpl, 'r13', false);
  bag[14] = createRelicInstance(baseTpl, 'r14', false);
  bag[12] = createRelicInstance(vaultTpl, 'r12', false);

  // Defeat extraction keeps belt (0, 1) and vault (12), loses Slot 5,6 and burns Slot 14
  const defeatExtract = resolveBagExtraction(bag, false);
  assert.equal(defeatExtract.burnedNames.length, 1);
  const savedUids = defeatExtract.savedItems.map((i) => i.uid);
  assert.ok(savedUids.includes('r0'));
  assert.ok(savedUids.includes('r1'));
  assert.ok(savedUids.includes('r12'));
  assert.ok(!savedUids.includes('r14'));
  assert.ok(!savedUids.includes('r6'));

  // Test swap & addItemToBag
  const bag2 = createEmptyBag();
  assert.equal(addItemToBag(bag2, createRelicInstance(baseTpl, 'a', false)), true);
  assert.equal(swapBagSlots(bag2, 0, 3), true);
  assert.equal(bag2[0], null);
  assert.equal(bag2[3]?.uid, 'a');
});

test('backpack: void_shard empty-neighbor scaling, royal_compass aura, gildAllBagItems & Elemental Fusion', () => {
  const bag = createEmptyBag();
  const voidTpl = RELICS.find((r) => r.id === 'void_shard')!;
  const compassTpl = RELICS.find((r) => r.id === 'royal_compass')!;
  const baseTpl = RELICS.find((r) => r.id === 'whisper_seal')!;

  // Center slot 6 has 4 orthogonal neighbors (all empty) -> 1 + 4*0.25 = 2.0x
  bag[6] = createRelicInstance(voidTpl, 'v1', false);
  assert.equal(computeEffectiveItemValue(bag, 6), Math.round(voidTpl.baseValue * 2));

  // Royal Compass in slot 10 (+25% neighbor aura) boosts slot 11
  bag[10] = createRelicInstance(compassTpl, 'c1', false);
  bag[11] = createRelicInstance(baseTpl, 'w1', false);
  assert.equal(computeEffectiveItemValue(bag, 11), Math.round(baseTpl.baseValue * 1.25));

  // Gild all items via Altar
  const gildedCount = gildAllBagItems(bag);
  assert.equal(gildedCount, 3);
  assert.equal(bag[11]?.pristine, true);

  // Adjacent identical relics fuse safely into a 1.45x Radiant relic
  const fuseBag = createEmptyBag();
  fuseBag[0] = createRelicInstance(baseTpl, 'f1', false);
  fuseBag[1] = createRelicInstance(baseTpl, 'f2', false);
  const extracted = resolveBagExtraction(fuseBag, true);
  assert.equal(extracted.fusedNames.length, 1);
  assert.equal(extracted.fusedNames[0], 'Radiant Whisper Seal');
  assert.equal(extracted.savedItems.length, 1);
  assert.equal(extracted.savedItems[0].fused, true);
  assert.equal(extracted.savedItems[0].baseValue, Math.round(baseTpl.baseValue * 2 * 1.45));
});

test('economy: H02 Twin-Display Resonance (+35%), haggle streak/walk & Night Guest cursed buyout', () => {
  const rand = makeRand(99);
  const stash = [
    createRelicInstance(RELICS[0], 's1', false), // astral
    createRelicInstance(RELICS[1], 's2', false), // astral
  ];
  const { session } = createShopSession(stash, 3, 'hearth', rand);
  assert.equal(hasTwinResonance(session.pedestals, 0), true);
  assert.equal(hasTwinResonance(session.pedestals, 1), true);

  const info = calculatePedestalFairPrice(session.pedestals, 0, 'hearth', false);
  assert.equal(info.resonance, true);
  assert.equal(info.fairPrice, Math.round(stash[0].baseValue * 1.35));

  const customer = spawnNextCustomer(session, 0, rand);
  assert.ok(customer !== null);

  // Fair price should always sell cleanly
  const soldRes = submitHaggleOffer(session, customer.fairPrice);
  assert.equal(soldRes.outcome, 'sold');
  assert.ok(soldRes.goldEarned >= customer.fairPrice);
  assert.equal(session.dealStreak, 1);

  // Outrageous ask depletes patience until customer walks away
  const c2 = spawnNextCustomer(session, 0, rand)!;
  let lastOutcome = 'counter';
  for (let i = 0; i < c2.maxPatience + 1; i++) {
    const res = submitHaggleOffer(session, c2.fairPrice * 10);
    lastOutcome = res.outcome;
    if (res.outcome === 'walked') break;
  }
  assert.equal(lastOutcome, 'walked');
  assert.equal(session.dealStreak, 0);

  // Night Guest buys cursed/abyssal relic at 1.75x
  const voidTpl = RELICS.find((r) => r.id === 'void_shard')!;
  const buyout = resolveNightGuestCursedBuyout([createRelicInstance(voidTpl, 'vs', false)]);
  assert.equal(buyout.soldItem?.templateId, 'void_shard');
  assert.equal(buyout.goldEarned, Math.round(voidTpl.baseValue * 1.75));
  assert.equal(buyout.remainingStash.length, 0);
});

test('rng: getDailySeed produces deterministic UTC daily seed and label', () => {
  const d1 = getDailySeed(new Date('2026-11-15T01:00:00Z'));
  const d2 = getDailySeed(new Date('2026-11-15T23:59:59Z'));
  assert.equal(d1.label, '2026-11-15');
  assert.equal(d1.seed, d2.seed);
});

test('dungeonSim: jump vertical arc, Appraisal 3x Bounty, Deflect + Chain Lightning, Rune Traps & Floor 2 Altar', () => {
  const rand = makeRand(7);
  const courtyard = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand, {
    bountyEra: 'astral',
    secretKeyGranted: true,
    maxJumpCharges: 2,
  });

  // Secret Vault Chest spawns when secretKeyGranted is true
  assert.ok(sim.chests.some((c) => c.isSecret));
  assert.equal(sim.runeTraps.length, 2);

  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };

  // Trigger jump
  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: -1,
      aimDirX: null,
      aimDirZ: null,
      attackPressed: false,
      jumpPressed: true,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.jumped, true);
  assert.ok(sim.player.y > 0);
  assert.ok(sim.player.invulnTimer > 0.25);
  assert.equal(sim.player.jumpCharges, 1);

  // Deflect an incoming enemy projectile + trigger Chain Lightning on adjacent enemies!
  const target = sim.enemies[0];
  const partner = sim.enemies[1];
  target.state = 'chase';
  target.hp = 120;
  partner.state = 'chase';
  partner.hp = 120;
  partner.x = target.x + 1.5;
  partner.z = target.z;
  sim.player.x = target.x;
  sim.player.z = target.z + 1.1;
  sim.player.facing = Math.PI;
  sim.player.attackCooldown = 0;
  sim.projectiles.push({
    id: 'p_test',
    x: sim.player.x,
    y: 0.9,
    z: sim.player.z - 0.5,
    vx: 0,
    vz: 6,
    radius: 0.28,
    damage: 1,
    life: 2,
    color: '#A855F7',
  });

  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: true,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.deflected, true);
  assert.ok(out.hitPopups?.some((hp) => hp.text.includes('DEFLECT')));
  assert.ok((out.lightningArcs?.length ?? 0) >= 1);

  // Rune Trap Plate stuns enemies stepping onto it
  const trap = sim.runeTraps[0];
  sim.hitstopTimer = 0;
  target.x = trap.x;
  target.z = trap.z;
  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: null,
      aimDirZ: null,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.ok(out.trapTriggered !== null);
  assert.equal(target.state, 'stunned');

  // Position player next to a windup enemy and land Special -> guarantees H03 Appraisal Strike & 3x Bounty Seal!
  target.state = 'windup';
  target.stateTimer = 0.5;
  target.hp = 10;
  sim.player.x = target.x;
  sim.player.z = target.z + 1.1;
  sim.player.facing = Math.PI;
  sim.player.specialCooldown = 0;

  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: true,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.specialUsed, true);
  assert.equal(out.appraisalTriggered, true);
  assert.equal(out.enemyKilled, true);
  const lastPickup = sim.pickups[sim.pickups.length - 1];
  assert.equal(lastPickup.item.pristine, true);
  assert.equal(lastPickup.item.bountySealed, true);
  assert.equal(lastPickup.item.era, 'astral');

  // Floor 2 Ancient Shrine -> [E] opens 3-choice shrine & 'gild' sacrifices -1 Max HP
  const floor2 = enterDungeonFloor(sim, 2, 1, STANDARD_DIFF, RELICS, rand);
  assert.ok(floor2.altar !== null);
  const beforeMaxHp = floor2.player.maxHp;
  floor2.player.x = floor2.altar!.x;
  floor2.player.z = floor2.altar!.z + 0.5;
  stepWorldSim(
    floor2,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: null,
      aimDirZ: null,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: true,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.interactTarget, 'altar');
  const shrineRes = applyShrineChoice(floor2, 'gild');
  assert.equal(shrineRes.gilded, true);
  assert.equal(floor2.player.maxHp, beforeMaxHp - 1);
});

test('backpack: computeBeltPerks activates era perks only in Safe Belt slots 0..2', () => {
  const bag = createEmptyBag();
  const astralTpl = RELICS.find((r) => r.era === 'astral')!;
  const hearthTpl = RELICS.find((r) => r.era === 'hearth')!;
  const abyssTpl = RELICS.find((r) => r.era === 'abyss')!;
  const forgeTpl = RELICS.find((r) => r.era === 'forge')!;

  // Placing forge in non-belt slot 5 must NOT activate belt perks
  bag[5] = createRelicInstance(forgeTpl, 'nb1', false);
  const emptyBelt = computeBeltPerks(bag);
  assert.equal(emptyBelt.activeTags.length, 0);
  assert.equal(emptyBelt.dmgMult, 1);

  bag[0] = createRelicInstance(astralTpl, 'b0', false);
  bag[1] = createRelicInstance(hearthTpl, 'b1', false);
  bag[2] = createRelicInstance(abyssTpl, 'b2', false);
  const perks = computeBeltPerks(bag);
  assert.equal(perks.activeTags.length, 3);
  assert.ok(perks.speedMult > 1.1);
  assert.ok(perks.specialCdMult < 0.9);
  assert.equal(perks.floorHeal, 1);
  assert.equal(perks.abyssPoison, true);

  // Swap slot 2 to forge -> dmgMult boosts +20%
  bag[2] = createRelicInstance(forgeTpl, 'b2f', false);
  const forgePerks = computeBeltPerks(bag);
  assert.ok(forgePerks.dmgMult >= 1.19);
});

test('economy: fulfillVipOrder (2.2x payout) & createLiveAuction / raiseLiveAuctionHype', () => {
  const rareAstralTpl = RELICS.find((r) => r.era === 'astral' && r.rarity >= 2)!;
  const commonTpl = RELICS.find((r) => r.rarity === 1)!;
  const stash = [
    createRelicInstance(commonTpl, 'c1', false),
    createRelicInstance(rareAstralTpl, 'ra1', false),
  ];

  const order: VipOrder = {
    collectorName: 'Archivist Vel',
    era: 'astral',
    requireFused: false,
    multiplier: 2.2,
    fulfilled: false,
  };
  const vipRes = fulfillVipOrder(stash, order);
  assert.equal(vipRes.soldItem?.uid, 'ra1');
  assert.equal(vipRes.goldEarned, Math.round(rareAstralTpl.baseValue * 2.2));
  assert.equal(order.fulfilled, true);
  assert.equal(vipRes.remainingStash.length, 1);

  // Fused-only order ignores non-fused relics, buys fused relic cleanly
  const fusedItem = { ...createRelicInstance(commonTpl, 'f1', false), fused: true };
  const fusedOrder: VipOrder = {
    collectorName: 'Master Talis',
    era: 'forge',
    requireFused: true,
    multiplier: 2.2,
    fulfilled: false,
  };
  const fusedRes = fulfillVipOrder([stash[0], fusedItem], fusedOrder);
  assert.equal(fusedRes.soldItem?.uid, 'f1');

  // Live 3-Bidder Collector Auction
  let auction = createLiveAuction(rareAstralTpl ? createRelicInstance(rareAstralTpl, 'auc1', false) : stash[0]);
  assert.equal(auction.round, 1);
  assert.ok(auction.currentBid > rareAstralTpl.baseValue);
  // Deterministic PRNG returning 0.9 avoids walk chance so hype succeeds cleanly
  const highRand = () => 0.9;
  auction = raiseLiveAuctionHype(auction, highRand);
  assert.equal(auction.walked, false);
  assert.equal(auction.round, 2);
  assert.ok(auction.currentBid > Math.round(rareAstralTpl.baseValue * 1.15));
  // PRNG returning 0.0 triggers buyer walk
  const walkAuction = raiseLiveAuctionHype(auction, () => 0.0);
  assert.equal(walkAuction.walked, true);
});

test('dungeonSim: destructibles, Mimic chest [E]/[Q], Floor Anomalies (mirror_echo, low_gravity, blood_moon), and 3rd-hit finisher', () => {
  const rand = makeRand(19);
  const courtyard = createCourtyardSim(5, 2, rand);

  // Check mirror_echo anomaly + destructibles + 3rd-hit finisher
  const simEcho = enterDungeonFloor(courtyard, 2, 1, STANDARD_DIFF, RELICS, rand, {
    anomalyOverride: 'mirror_echo',
    beltFloorHeal: 1,
  });
  assert.equal(simEcho.floorAnomaly, 'mirror_echo');
  assert.equal(simEcho.destructibles.length, 4);

  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };
  const idleInput = {
    moveX: 0,
    moveZ: 0,
    aimDirX: null,
    aimDirZ: null,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };

  // Urn yields coinsEarned & Crystal yields crystalCharged (-1.2s specialCooldown)
  const urn = simEcho.destructibles.find((d) => d.kind === 'urn')!;
  const crystal = simEcho.destructibles.find((d) => d.kind === 'crystal')!;
  simEcho.player.x = urn.x;
  simEcho.player.z = urn.z + 1.0;
  simEcho.player.facing = Math.PI;
  simEcho.player.attackCooldown = 0;
  stepWorldSim(
    simEcho,
    { ...idleInput, aimDirX: 0, aimDirZ: -1, attackPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(urn.broken, true);
  assert.ok((out.coinsEarned ?? 0) >= 8);

  simEcho.player.specialCooldown = 2.0;
  simEcho.player.attackCooldown = 0;
  simEcho.player.x = crystal.x;
  simEcho.player.z = crystal.z + 1.0;
  stepWorldSim(
    simEcho,
    { ...idleInput, aimDirX: 0, aimDirZ: -1, attackPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(crystal.broken, true);
  assert.equal(out.crystalCharged, true);
  assert.ok(simEcho.player.specialCooldown < 0.9);

  // 3rd-hit finisherCombo when comboStep === 2
  const e0 = simEcho.enemies[0];
  e0.hp = 200;
  simEcho.player.x = e0.x;
  simEcho.player.z = e0.z + 1.1;
  simEcho.player.comboStep = 2;
  simEcho.player.comboResetTimer = 0.5;
  simEcho.player.attackCooldown = 0;
  stepWorldSim(
    simEcho,
    { ...idleInput, aimDirX: 0, aimDirZ: -1, attackPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.swungCombo, 2);
  assert.equal(out.finisherCombo, true);

  // Mirror Echo fires delayed echoTriggered ~0.38s after Special [Q]
  simEcho.hitstopTimer = 0;
  simEcho.player.specialCooldown = 0;
  stepWorldSim(
    simEcho,
    { ...idleInput, aimDirX: 0, aimDirZ: -1, specialPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.specialUsed, true);
  let sawEcho = false;
  for (let step = 0; step < 30; step++) {
    stepWorldSim(simEcho, idleInput, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, out);
    if (out.echoTriggered) {
      sawEcho = true;
      break;
    }
  }
  assert.equal(sawEcho, true);

  // Mimic Chest on clean Floor 2: [Q] reveals & stuns (2.8s + isMimicGuard), [E] awakens Mimic in windup
  const simMimic = enterDungeonFloor(courtyard, 2, 1, STANDARD_DIFF, RELICS, rand);
  const mimicChest = simMimic.chests[0];
  mimicChest.opened = false;
  mimicChest.isMimic = true;
  mimicChest.mimicRevealed = false;
  simMimic.player.x = mimicChest.x;
  simMimic.player.z = mimicChest.z + 0.7;
  simMimic.player.specialCooldown = 0;
  stepWorldSim(
    simMimic,
    { ...idleInput, aimDirX: 0, aimDirZ: -1, specialPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.mimicStunned, true);
  assert.equal(mimicChest.opened, true);
  const stunnedMimic = simMimic.enemies.find((e) => e.isMimicGuard);
  assert.ok(stunnedMimic !== undefined);
  assert.equal(stunnedMimic?.state, 'stunned');
  assert.ok((stunnedMimic?.stateTimer ?? 0) > 2.5);

  // [E] on unrevealed Mimic awakens it in windup
  simMimic.hitstopTimer = 0;
  const mimicChest2 = { id: 'chest_mimic_e', x: 8.5, z: 8.5, opened: false, isMimic: true, mimicRevealed: false };
  simMimic.chests.push(mimicChest2);
  simMimic.player.x = mimicChest2.x;
  simMimic.player.z = mimicChest2.z + 0.6;
  stepWorldSim(
    simMimic,
    { ...idleInput, interactPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.mimicAwakened, true);
  assert.equal(mimicChest2.opened, true);

  // Low-gravity jump arc produces higher jump velocity than standard
  const simLowGrav = enterDungeonFloor(courtyard, 2, 1, STANDARD_DIFF, RELICS, rand, {
    anomalyOverride: 'low_gravity',
  });
  const simBlood = enterDungeonFloor(courtyard, 2, 1, STANDARD_DIFF, RELICS, rand, {
    anomalyOverride: 'blood_moon',
  });
  assert.equal(simLowGrav.floorAnomaly, 'low_gravity');
  assert.equal(simBlood.floorAnomaly, 'blood_moon');
  stepWorldSim(
    simLowGrav,
    { ...idleInput, jumpPressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.ok(simLowGrav.player.vy > 7.0);
});

test('i18n: all 16 languages include complete translations for newly added features', () => {
  const keys = [
    'arch_label',
    'codex_title',
    'belt_runes_label',
    'ledger_title',
    'vip_order_title',
    'live_auction_title',
    'hud_hide',
    'settings_title',
    'settings_gfx_ultra',
    'settings_gfx_high',
    'settings_gfx_med',
    'settings_gfx_eco',
    'save_export',
    'codex_tab_trophies',
    'trophy_unlocked',
    'guide_day1',
    'gamepad_ready',
    'touch_hit',
    'touch_spec',
    'touch_heal',
    'touch_jump',
    'touch_use',
    'touch_bag',
    'boon_modal_title',
    'boon_storm_name',
    'boss_whisper_name',
    'boss_hearth_name',
    'boss_abyss_name',
    'boss_forge_name',
    'boss_phase_2',
    'minimap_title',
    'room_cleared',
    'interact_door_n',
    'interact_descend',
  ] as const;

  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const val = t(code, key);
      assert.ok(val && val.trim().length > 0, `Missing translation for ${code}.${key}`);
    }
  }
  assert.notEqual(t('ru', 'touch_jump'), t('en', 'touch_jump'));
  assert.notEqual(t('ru', 'touch_bag'), t('en', 'touch_bag'));
  assert.notEqual(t('ru', 'boon_modal_title'), t('en', 'boon_modal_title'));
});

test('settings: normalizeSettings handles 4-tier quality, legacy eco->low migration, and getGraphicsProfile capabilities', () => {
  const def = createDefaultSettings();
  assert.equal(def.graphicsQuality, 'ultra');
  assert.deepEqual(normalizeSettings(undefined), def);

  const clamped = normalizeSettings({
    musicVolume: 2.5,
    sfxVolume: -0.4,
    graphicsQuality: 'invalid' as unknown as 'high',
    showDay1Guide: 'nope' as unknown as boolean,
  });
  assert.equal(clamped.musicVolume, 1);
  assert.equal(clamped.sfxVolume, 0);
  assert.equal(clamped.graphicsQuality, 'ultra');
  assert.equal(clamped.showDay1Guide, def.showDay1Guide);

  const migrated = normalizeSettings({
    musicVolume: 0.35,
    sfxVolume: 0.6,
    graphicsQuality: 'eco' as unknown as 'low',
    showDay1Guide: false,
  });
  assert.deepEqual(migrated, {
    musicVolume: 0.35,
    sfxVolume: 0.6,
    graphicsQuality: 'low',
    showDay1Guide: false,
    keybinds: DEFAULT_KEYBINDS,
  });

  for (const tier of ['ultra', 'high', 'medium', 'low'] as const) {
    assert.equal(normalizeSettings({ graphicsQuality: tier }).graphicsQuality, tier);
  }

  assert.equal(getGraphicsLevel('ultra'), GraphicsLevel.Ultra);
  assert.equal(getGraphicsLevel('high'), GraphicsLevel.High);
  assert.equal(getGraphicsLevel('medium'), GraphicsLevel.Medium);
  assert.equal(getGraphicsLevel('low'), GraphicsLevel.Low);

  const ultra = getGraphicsProfile('ultra');
  assert.equal(ultra.bloomEnabled, true);
  assert.equal(ultra.cardTilt3d, true);
  assert.equal(ultra.shadowsEnabled, true);
  assert.equal(ultra.particlesEnabled, true);
  assert.equal(ultra.particleScale, 1);
  assert.equal(ultra.aimArc, true);
  assert.equal(ultra.screenShake, true);

  const high = getGraphicsProfile('high');
  assert.equal(high.bloomEnabled, true);
  assert.equal(high.cardTilt3d, false);
  assert.equal(high.shadowsEnabled, true);
  assert.equal(high.particlesEnabled, true);
  assert.ok(high.particleScale < 1 && high.particleScale > 0);
  assert.equal(high.aimArc, true);
  assert.equal(high.screenShake, true);

  const medium = getGraphicsProfile('medium');
  assert.equal(medium.bloomEnabled, false);
  assert.equal(medium.cardTilt3d, false);
  assert.equal(medium.shadowsEnabled, false);
  assert.equal(medium.particlesEnabled, false);
  assert.equal(medium.aimArc, false);
  assert.equal(medium.screenShake, false);
  assert.equal(medium.uiAnimations, true);

  const low = getGraphicsProfile('low');
  assert.equal(low.bloomEnabled, false);
  assert.equal(low.cardTilt3d, false);
  assert.equal(low.shadowsEnabled, false);
  assert.equal(low.particlesEnabled, false);
  assert.equal(low.aimArc, false);
  assert.equal(low.screenShake, false);
  assert.equal(low.uiAnimations, false);
  assert.equal(low.complexGradients, false);
  assert.equal(low.dprCap, 1);
});

test('meta: exportSavePayload & importSavePayload roundtrip GL1 strings and reject malformed input', () => {
  const rec = createDefaultRecords();
  rec.bestGold = 940;
  rec.bestStreak = 4;
  rec.totalSales = 17;
  rec.unlockedAchievementIds = ['first_sale', 'streak_3'];
  rec.dailyHistory = [{ date: '2026-11-15', gold: 940, week: 2 }];

  const code = exportSavePayload(rec);
  assert.ok(code.startsWith('GL1:'));

  const imported = importSavePayload(code);
  assert.ok(imported !== null);
  assert.equal(imported?.bestGold, 940);
  assert.equal(imported?.bestStreak, 4);
  assert.equal(imported?.totalSales, 17);
  assert.deepEqual(imported?.unlockedAchievementIds, ['first_sale', 'streak_3']);
  assert.deepEqual(imported?.dailyHistory, [{ date: '2026-11-15', gold: 940, week: 2 }]);

  assert.equal(importSavePayload(''), null);
  assert.equal(importSavePayload('   '), null);
  assert.equal(importSavePayload('GL1:!!!invalid-base64!!!'), null);
  assert.equal(importSavePayload('{"unrelated":true}'), null);
});

test('meta: grantAchievements deduplicates existing trophies and preserves prior fields', () => {
  const base = createDefaultRecords();
  const r1 = grantAchievements(base, ['first_sale', 'streak_3', 'first_sale', 'nonexistent_id']);
  assert.equal(r1.newlyUnlocked.length, 2);
  assert.deepEqual(r1.updated.unlockedAchievementIds, ['first_sale', 'streak_3']);
  assert.equal(r1.updated.bestGold, base.bestGold);

  const r2 = grantAchievements(r1.updated, ['streak_3']);
  assert.equal(r2.newlyUnlocked.length, 0);
  assert.equal(r2.updated, r1.updated);
});

test('dungeonSim: procedural multi-room floors (5/6/7 rooms), locked->unlocked doors, and backtrack state persistence', () => {
  const rand = makeRand(123);
  const courtyard = createCourtyardSim(5, 2, rand);

  for (const [floorNum, expectedCount] of [
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const) {
    const simFloor = enterDungeonFloor(courtyard, floorNum, 1, STANDARD_DIFF, RELICS, rand);
    assert.ok(simFloor.floorMap !== null);
    const rooms = Object.values(simFloor.floorMap!.rooms);
    assert.equal(rooms.length, expectedCount);
    assert.ok(rooms.some((r) => r.type === 'start'));
    assert.ok(rooms.some((r) => r.type === 'boss'));
    assert.ok(rooms.some((r) => r.type === 'treasure'));
    assert.ok(rooms.some((r) => r.type === 'shrine'));
    const startRoom = simFloor.floorMap!.rooms[simFloor.currentRoomId];
    assert.equal(startRoom.type, 'start');
    assert.ok(startRoom.doors.length >= 1);
  }

  // Test room clearing -> boonOffered -> door transition -> backtrack persistence
  const sim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand);
  const startId = sim.currentRoomId;
  const startRoom = sim.floorMap!.rooms[startId];
  const exitDir = startRoom.doors[0];
  const nextId = startRoom.neighbors[exitDir]!;

  // Blocked while enemies remain
  assert.equal(transitionDungeonRoom(sim, exitDir), false);

  // Eliminate start room enemies via stepWorldSim so roomCleared + boonOffered fire
  for (const e of sim.enemies) {
    e.hp = 1;
    e.x = sim.player.x;
    e.z = sim.player.z - 0.8;
  }
  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };
  sim.player.specialCooldown = 0;
  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: true,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.roomCleared, true);
  assert.equal(out.boonOffered, true);
  assert.equal(startRoom.cleared, true);

  // Open chest in start room, then transition through door
  sim.hitstopTimer = 0;
  sim.chests[0].opened = true;
  sim.doorTransitionCooldown = 0;
  const doorPos = DOOR_POSITIONS[exitDir];
  sim.player.x = doorPos.x;
  sim.player.z = doorPos.z;
  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: null,
      aimDirZ: null,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: true,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.roomTransition, exitDir);
  assert.equal(sim.currentRoomId, nextId);
  assert.equal(sim.floorMap!.rooms[nextId].visited, true);

  // Backtrack via opposite door and verify opened chest persists
  const oppDir = (Object.entries(sim.floorMap!.rooms[nextId].neighbors).find(([, v]) => v === startId)?.[0]) as
    | 'N'
    | 'S'
    | 'E'
    | 'W';
  sim.floorMap!.rooms[nextId].cleared = true;
  assert.equal(transitionDungeonRoom(sim, oppDir), true);
  assert.equal(sim.currentRoomId, startId);
  assert.equal(sim.chests[0].opened, true);
});

test('bosses: 4 distinct Weekly Bosses and Phase II transition at <= 50% HP', () => {
  assert.equal(WEEKLY_BOSSES.length, 4);
  assert.equal(getBossForWeek(1).pattern, 'nova');
  assert.equal(getBossForWeek(2).pattern, 'slam');
  assert.equal(getBossForWeek(3).pattern, 'summon');
  assert.equal(getBossForWeek(4).pattern, 'charge');
  assert.equal(getBossForWeek(5).id, getBossForWeek(1).id);

  // Spawn Week 3 Obsidian Archon ('summon') in Boss Room and drop HP <= 50%
  const rand = makeRand(303);
  const courtyard = createCourtyardSim(6, 2, rand);
  const sim = enterDungeonFloor(courtyard, 3, 3, STANDARD_DIFF, RELICS, rand);
  const bossRoom = sim.floorMap!.rooms[sim.floorMap!.bossRoomId];
  sim.floorMap!.rooms[sim.currentRoomId].cleared = true;
  sim.currentRoomId = bossRoom.id;
  sim.floorMap!.currentRoomId = bossRoom.id;
  sim.enemies = bossRoom.enemies;

  const boss = sim.enemies.find((e) => e.kind === 'boss')!;
  assert.equal(boss.bossId, 'obsidian_archon');
  assert.equal(boss.bossPattern, 'summon');
  assert.equal(boss.bossPhase, 1);

  // Drop boss below 50% HP -> Phase II triggers & summon spawns
  boss.hp = Math.floor(boss.maxHp * 0.45);
  const enemiesBefore = sim.enemies.length;
  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };
  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: null,
      aimDirZ: null,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.bossPhase2, true);
  assert.equal(boss.bossPhase, 2);
  assert.ok(sim.enemies.length >= enemiesBefore);
});

test('boons: rollBoonChoices deduplicates, computeBoonEffects + runtime emberVault, frostSigil, stormCombo & vampireLedger', () => {
  assert.equal(BOON_CATALOG.length, 12);
  const rand = makeRand(88);
  const choices = rollBoonChoices(['storm_combo', 'ember_vault', 'frost_sigil'], rand, 3);
  assert.equal(choices.length, 3);
  assert.ok(choices.every((c) => c.id !== 'storm_combo' && c.id !== 'ember_vault' && c.id !== 'frost_sigil'));

  const fx = computeBoonEffects(['hunter_focus', 'titan_swing']);
  assert.ok(fx.specialDmgMult > 1.2);
  assert.ok(fx.specialCdMult < 0.8);
  assert.ok(fx.primaryDmgMult > 1.2);

  const courtyard = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand);
  const beforeMaxHp = sim.player.maxHp;
  const beforeMaxPots = sim.player.maxPotions;
  applyBoonToSim(sim, 'aegis_vitality');
  assert.equal(sim.player.maxHp, beforeMaxHp + 1);
  assert.equal(sim.player.maxPotions, beforeMaxPots + 1);

  applyBoonToSim(sim, 'ember_vault');
  applyBoonToSim(sim, 'frost_sigil');
  applyBoonToSim(sim, 'storm_combo');
  applyBoonToSim(sim, 'vampire_ledger');

  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };
  const idle = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };

  // Ember Vault damages nearby enemies on Jump
  const e0 = sim.enemies[0];
  e0.hp = 120;
  sim.player.x = e0.x;
  sim.player.z = e0.z + 1.0;
  stepWorldSim(sim, { ...idle, jumpPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, out);
  assert.equal(out.emberVaultBlast, true);
  assert.ok(e0.hp < 120);

  // Storm Combo fires lightningArcs & Frost Sigil applies slowTimer on 3rd-hit finisher
  sim.hitstopTimer = 0;
  sim.player.jumpTimer = 0;
  const e1 = sim.enemies[1];
  e0.hp = 200;
  e1.hp = 200;
  e1.x = e0.x + 1.5;
  e1.z = e0.z;
  sim.player.x = e0.x;
  sim.player.z = e0.z + 1.0;
  sim.player.comboStep = 2;
  sim.player.comboResetTimer = 0.5;
  sim.player.attackCooldown = 0;
  stepWorldSim(sim, { ...idle, attackPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, out);
  assert.ok((e0.slowTimer ?? 0) > 1.5);
  assert.ok((out.lightningArcs?.length ?? 0) >= 1);

  // Vampire Ledger restores +1 HP on 3rd kill
  sim.hitstopTimer = 0;
  sim.player.hp = sim.player.maxHp - 2;
  sim.boonKillCounter = 2;
  e0.hp = 1;
  sim.player.attackCooldown = 0;
  stepWorldSim(sim, { ...idle, attackPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, out);
  assert.equal(out.enemyKilled, true);
  assert.equal(out.healed, true);
  assert.equal(sim.player.hp, sim.player.maxHp - 1);
});

test('charter, pacts & contracts: talent bonuses, 5-pact scaling, contract progression & bestiary', () => {
  assert.equal(GUILD_TALENTS.length, 5);
  assert.equal(GATE_PACTS.length, 5);
  assert.equal(BESTIARY_ENTRIES.length, 8);

  const emptyBonuses = computeCharterBonuses({});
  assert.equal(emptyBonuses.bonusHp, 0);
  assert.equal(emptyBonuses.bonusGold, 0);
  assert.equal(emptyBonuses.boonRerolls, 0);
  assert.equal(emptyBonuses.fairPriceMult, 1);
  assert.equal(emptyBonuses.bonusPotions, 0);
  assert.equal(emptyBonuses.bonusDmgMult, 1);

  const maxedBonuses = computeCharterBonuses({
    vital_seal: 99,
    coin_pouch: 3,
    boon_attunement: 2,
    merchant_repute: 3,
    satchel_graft: 2,
  });
  assert.equal(maxedBonuses.bonusHp, 3);
  assert.equal(maxedBonuses.bonusGold, 120);
  assert.equal(maxedBonuses.boonRerolls, 2);
  assert.ok(Math.abs(maxedBonuses.fairPriceMult - 1.24) < 1e-6);
  assert.equal(maxedBonuses.bonusPotions, 1);
  assert.equal(maxedBonuses.bonusDmgMult, 1.12);

  assert.equal(getNextTalentCost('vital_seal', 0), 3);
  assert.equal(getNextTalentCost('vital_seal', 2), 10);
  assert.equal(getNextTalentCost('vital_seal', 3), null);

  const allPacts = computePactModifiers([
    'pact_frenzy',
    'pact_armored',
    'pact_hurry',
    'pact_deflation',
    'pact_cursed',
  ]);
  assert.equal(allPacts.heatLevel, 5);
  assert.ok(Math.abs(allPacts.shardMult - 2.3) < 1e-6);
  assert.equal(allPacts.enemyHpMult, 1.25);
  assert.equal(allPacts.enemySpeedMult, 1.2);
  assert.equal(allPacts.marauderTimeMult, 0.75);
  assert.equal(allPacts.debtMult, 1.2);
  assert.equal(allPacts.bonusRarity, true);
  assert.equal(scaleShardsByPact(3, allPacts.shardMult), 7);

  let contract = createRunContract(1, 0);
  assert.equal(contract.kind, 'smash_props');
  const ignore = advanceContractProgress(contract, 'slay_enemies', 5);
  assert.equal(ignore.justCompleted, false);
  assert.equal(ignore.updated.progress, 0);

  const partial = advanceContractProgress(contract, 'smash_props', 4);
  assert.equal(partial.justCompleted, false);
  assert.equal(partial.updated.progress, 4);
  contract = partial.updated;

  const done = advanceContractProgress(contract, 'smash_props', 5);
  assert.equal(done.justCompleted, true);
  assert.equal(done.updated.progress, contract.target);
  assert.equal(done.updated.completed, true);

  const afterDone = advanceContractProgress(done.updated, 'smash_props', 1);
  assert.equal(afterDone.justCompleted, false);
});

test('meta: normalizeRecords back-compat + Stage 2-3 persistence & achievements', () => {
  const legacy = normalizeRecords({
    bestGold: 450,
    discoveredRelicIds: ['whisper_seal'],
  });
  assert.equal(legacy.bestGold, 450);
  assert.equal(legacy.gateShards, 0);
  assert.deepEqual(legacy.activePacts, []);
  assert.deepEqual(legacy.talentLevels, {});
  assert.deepEqual(legacy.enemyKills, {});
  assert.equal(legacy.contractsCompleted, 0);

  const dirty = normalizeRecords({
    gateShards: 12,
    activePacts: ['pact_frenzy', 'invalid_pact' as never, 'pact_frenzy'],
    talentLevels: { vital_seal: 2, bad: -5 },
    enemyKills: { slime: 14, whisper_warden: 1 },
    contractsCompleted: 3,
  });
  assert.equal(dirty.gateShards, 12);
  assert.deepEqual(dirty.activePacts, ['pact_frenzy']);
  assert.equal(dirty.talentLevels.vital_seal, 2);
  assert.equal(dirty.talentLevels.bad, undefined);
  assert.equal(dirty.enemyKills.slime, 14);
  assert.equal(dirty.contractsCompleted, 3);

  const payload = exportSavePayload(dirty);
  const restored = importSavePayload(payload);
  assert.ok(restored !== null);
  assert.equal(restored!.gateShards, 12);
  assert.deepEqual(restored!.activePacts, ['pact_frenzy']);
  assert.equal(restored!.enemyKills.whisper_warden, 1);

  const ach = grantAchievements(createDefaultRecords(), [
    'charter_first',
    'pact_3',
    'boss_slayer',
    'weapon_master',
  ]);
  assert.equal(ach.newlyUnlocked.length, 4);
});

test('dungeonSim: Pact scaling, weapon tempering DMG, killedEnemyTypes, killedBossId & propsSmashed', () => {
  const rand = makeRand(77);
  const courtyard = createCourtyardSim(5, 2, rand);
  const baseSim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand);
  const pactSim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand, {
    pactEnemyHpMult: 1.25,
    pactEnemySpeedMult: 1.2,
    pactMarauderMult: 0.75,
    weaponDmgMult: 1.4,
    charterDmgMult: 1.12,
  });

  assert.ok(pactSim.marauderTimer < baseSim.marauderTimer);
  assert.ok(pactSim.enemies[0].maxHp > baseSim.enemies[0].maxHp);
  assert.ok(pactSim.enemies[0].speed > baseSim.enemies[0].speed);

  // Move to boss room, break a destructible prop, and slay boss to test event reporting
  const bossRoom = pactSim.floorMap!.rooms[pactSim.floorMap!.bossRoomId];
  pactSim.currentRoomId = bossRoom.id;
  pactSim.floorMap!.currentRoomId = bossRoom.id;
  pactSim.enemies = bossRoom.enemies;
  pactSim.destructibles = bossRoom.destructibles;

  const boss = pactSim.enemies.find((e) => e.kind === 'boss')!;
  boss.hp = 1;
  boss.x = pactSim.player.x;
  boss.z = pactSim.player.z - 0.8;
  if (pactSim.destructibles[0]) {
    pactSim.destructibles[0].broken = false;
    pactSim.destructibles[0].x = pactSim.player.x;
    pactSim.destructibles[0].z = pactSim.player.z - 0.8;
  }

  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };
  pactSim.player.attackCooldown = 0;
  stepWorldSim(
    pactSim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: true,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.enemyKilled, true);
  assert.ok(out.killedEnemyTypes?.includes('boss'));
  assert.equal(out.killedBossId, boss.bossId);
  if (pactSim.destructibles.length > 0) {
    assert.ok((out.propsSmashed ?? 0) >= 1);
  }
});

test('stage3-4: 4th weapon twinblades, Duo Boon Synergies & runtime Blood Tithe / Magma Cleave / Tempest Shatter', () => {
  assert.equal(WEAPONS.length, 4);
  const twin = WEAPONS.find((w) => w.id === 'twinblades')!;
  assert.ok(twin !== undefined);
  assert.equal(twin.unlockCost, 340);
  assert.ok(twin.cooldown <= 0.25);

  assert.equal(BOON_SYNERGIES.length, 6);
  const potential = getPotentialSynergiesForChoice('frost_sigil', ['storm_combo']);
  assert.equal(potential.length, 1);
  assert.equal(potential[0].id, 'tempest_shatter');

  const active = computeActiveSynergies(['storm_combo', 'frost_sigil', 'vampire_ledger', 'gilded_greed']);
  assert.equal(active.length, 2);

  const fx = computeBoonEffects(['storm_combo', 'frost_sigil', 'ember_vault', 'titan_swing', 'vampire_ledger', 'gilded_greed', 'echo_blade', 'hunter_focus']);
  assert.equal(fx.activeSynergies.length, 4);
  assert.equal(fx.chainTargets, 4);
  assert.equal(fx.emberBlastMult, 1.65);
  assert.equal(fx.vampireEveryNKills, 2);
  assert.equal(fx.killGoldBonus, 5);
  assert.equal(fx.echoDmgRatio, 0.9);

  // Runtime Blood Tithe: +5g on kill and heals every 2nd kill
  const rand = makeRand(515);
  const courtyard = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand);
  applyBoonToSim(sim, 'vampire_ledger');
  applyBoonToSim(sim, 'gilded_greed');
  sim.player.hp = sim.player.maxHp - 2;
  sim.boonKillCounter = 1; // Next kill = #2
  const e0 = sim.enemies[0];
  e0.hp = 1;
  sim.player.x = e0.x;
  sim.player.z = e0.z + 0.8;
  sim.player.attackCooldown = 0;
  const out: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
  };
  stepWorldSim(
    sim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: true,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    twin,
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    out,
  );
  assert.equal(out.enemyKilled, true);
  assert.equal(out.healed, true);
  assert.ok((out.coinsEarned ?? 0) >= 5);
});

test('stage3-4: Pack Era Sets (+15% extraction) & Alchemy Relic Transmutation', () => {
  const bag = createEmptyBag();
  const astral1 = RELICS.find((r) => r.id === 'whisper_seal')!;
  const astral2 = RELICS.find((r) => r.id === 'cobalt_shard')!;
  const astral3 = RELICS.find((r) => r.id === 'star_prism')!;
  // Place non-adjacent so Fusion does not merge them; forms 3-piece Astral Set!
  bag[0] = createRelicInstance(astral1, 'a1', false);
  bag[2] = createRelicInstance(astral2, 'a2', false);
  bag[4] = createRelicInstance(astral3, 'a3', false);

  const sets = computePackSetBonuses(bag);
  assert.deepEqual(sets, ['astral']);

  const extracted = resolveBagExtraction(bag, true);
  assert.deepEqual(extracted.eraSets, ['astral']);
  const firstSaved = extracted.savedItems.find((i) => i.uid === 'a1')!;
  assert.equal(firstSaved.baseValue, Math.round(astral1.baseValue * 1.15));

  // Alchemy Transmutation: 2 common relics -> 1 rarity >= 2 relic
  assert.equal(TRANSMUTE_COST, 120);
  const stash = [
    createRelicInstance(astral1, 't1', false),
    createRelicInstance(astral2, 't2', false),
    createRelicInstance(astral3, 't3', false),
  ];
  const transRes = transmuteRelics(stash, 0, 1, RELICS, makeRand(9), 'tx_1');
  assert.ok(transRes !== null);
  assert.equal(transRes!.nextStash.length, 2);
  assert.ok(transRes!.result.rarity >= 2);
  assert.equal(transmuteRelics(stash, 1, 1, RELICS, makeRand(9)), null);
});

test('stage4: Endless Ascension scaling, Career Chronicle persistence, trophies & 16-language Stage 4 keys', () => {
  assert.equal(getEndlessScale(4), 1);
  assert.ok(getEndlessScale(6) > 1.2);

  const rand = makeRand(404);
  const courtyard = createCourtyardSim(5, 2, rand);
  const w1 = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, makeRand(404));
  const w7 = enterDungeonFloor(courtyard, 1, 7, STANDARD_DIFF, RELICS, makeRand(404));
  assert.ok(w7.enemies[0].maxHp > w1.enemies[0].maxHp);
  assert.ok(w7.enemies[0].speed > w1.enemies[0].speed);

  const rec = normalizeRecords({
    highestHeatCleared: 5,
    highestEndlessWeek: 8,
    totalRuns: 12,
    totalVictories: 4,
  });
  assert.equal(rec.highestHeatCleared, 5);
  assert.equal(rec.highestEndlessWeek, 8);
  assert.equal(rec.totalRuns, 12);
  assert.equal(rec.totalVictories, 4);

  const ach = grantAchievements(rec, ['all_weapons', 'heat_5_win', 'endless_8']);
  assert.equal(ach.newlyUnlocked.length, 3);

  const stage4Keys = [
    'wpn_twinblades',
    'synergy_label',
    'syn_tempest_name',
    'pack_set_label',
    'alchemy_transmute_title',
    'forge_equip',
    'chronicle_runs',
    'heat_seals_label',
    'build_summary_title',
  ] as const;
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const k of stage4Keys) {
      assert.ok(t(code, k).length > 0, `Empty translation ${k} for ${code}`);
    }
    assert.ok(t(code, 'alchemy_transmute_btn', { g: 120 }).includes('120'), `Missing {g} in ${code}`);
    assert.ok(t(code, 'ascension_badge', { p: 24 }).includes('24'), `Missing {p} in ${code}`);
  }
});

test('stage5: Elite Champions (volatile/swift/bulwark), Crits, 3 new Boons, 2 Synergies & 3-choice Shrine', () => {
  assert.equal(BOON_CATALOG.length, 12);
  assert.equal(BOON_SYNERGIES.length, 6);

  const fx = computeBoonEffects([
    'twin_fang',
    'hunter_focus',
    'wardens_parry',
    'merchant_windfall',
    'aegis_vitality',
  ]);
  assert.equal(fx.activeSynergies.length, 2);
  assert.ok(fx.critChanceBonus >= 0.27);
  assert.equal(fx.critDmgMult, 2.0);
  assert.equal(fx.wardensParry, true);
  assert.equal(fx.windfallPropGold, 4);
  assert.equal(fx.windfallHealEveryN, 6);
  assert.equal(fx.eliteBossDmgMult, 1.3);
  assert.equal(fx.fullHpDmgMult, 1.25);
  assert.equal(fx.goldDropMult, 1.25);

  const rand = makeRand(909);
  const courtyard = createCourtyardSim(5, 2, rand);
  const floor2 = enterDungeonFloor(courtyard, 2, 1, STANDARD_DIFF, RELICS, rand);
  const allEnemies = floor2.floorMap
    ? Object.values(floor2.floorMap.rooms).flatMap((r) => r.enemies)
    : floor2.enemies;
  const elites = allEnemies.filter((e) => e.isElite);
  assert.ok(elites.length >= 1, 'Expected at least 1 Elite Champion on Floor 2');
  assert.ok(
    elites.every((e) => e.eliteAffix === 'volatile' || e.eliteAffix === 'swift' || e.eliteAffix === 'bulwark'),
  );

  // Test Warden's Parry + Guaranteed Crit kill on Elite Volatile champion
  applyBoonToSim(floor2, 'twin_fang');
  applyBoonToSim(floor2, 'wardens_parry');
  const elite = floor2.enemies[0];
  elite.isElite = true;
  elite.eliteAffix = 'volatile';
  elite.state = 'windup';
  elite.stateTimer = 0.25;
  elite.hp = 1;
  floor2.player.x = elite.x;
  floor2.player.z = elite.z + 0.8;
  floor2.player.attackCooldown = 0;
  floor2.player.specialCooldown = 2.0;

  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    killedEliteCount: 0,
    volatileBlast: null,
    parryTriggered: false,
    lightningArcs: [],
    hitPopups: [],
  };
  stepWorldSim(
    floor2,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: true,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    () => 0.01,
    1 / 60,
    ev,
  );
  assert.equal(ev.enemyKilled, true);
  assert.equal(ev.killedEliteCount, 1);
  assert.equal(ev.parryTriggered, true);
  assert.ok(floor2.player.specialCooldown < 1.3);
  assert.ok(ev.volatileBlast !== null);
  assert.ok((ev.coinsEarned ?? 0) >= 16);

  // Test 3-choice Shrine Blood Pact & Mend
  floor2.altar = { x: floor2.player.x, z: floor2.player.z, used: false };
  floor2.player.hp = 4;
  const bloodRes = applyShrineChoice(floor2, 'blood');
  assert.equal(bloodRes.goldGained, 65);
  assert.equal(floor2.player.hp, 3);
  assert.ok(floor2.shrineDmgMult >= 1.19);
  assert.ok(floor2.shrineCritBonus >= 0.11);

  floor2.altar.used = false;
  floor2.player.potions = 0;
  const mendRes = applyShrineChoice(floor2, 'mend');
  assert.equal(mendRes.healed, true);
  assert.equal(floor2.player.hp, 5);
  assert.equal(floor2.player.potions, 1);
});

test('stage6: Customer Traits, 26 Trophies, Chronicle eliteKills/shrineOfferings & 16-language Stage 5-6 keys', () => {
  assert.equal(ACHIEVEMENTS.length, 26);

  const stash = [createRelicInstance(RELICS[0], 'st1', true)];
  const { session } = createShopSession(stash, 4, 'astral', makeRand(7), { bountyEra: 'astral' });
  // Force 'generous' trait roll (~0.85 -> index 3) and test combo bonus
  const cust = spawnNextCustomer(session, 0, () => 0.85);
  assert.ok(cust !== null);
  assert.equal(cust!.trait, 'generous');
  const fair = cust!.fairPrice;
  const sale = submitHaggleOffer(session, fair);
  assert.equal(sale.outcome, 'sold');
  assert.ok(sale.comboBonus >= Math.round(fair * 0.1) - 1);

  const rec = normalizeRecords({
    eliteKills: 7,
    shrineOfferings: 4,
    contractsCompleted: 12,
  });
  assert.equal(rec.eliteKills, 7);
  assert.equal(rec.shrineOfferings, 4);
  assert.equal(rec.contractsCompleted, 12);

  const ach = grantAchievements(rec, ['elite_slayer', 'shrine_devotee', 'contract_legend']);
  assert.equal(ach.newlyUnlocked.length, 3);

  const stage56Keys = [
    'boon_fang_name',
    'boon_parry_name',
    'boon_windfall_name',
    'syn_executioner_name',
    'syn_midas_name',
    'shrine_title',
    'shrine_gild_title',
    'shrine_blood_title',
    'shrine_mend_title',
    'trait_era_collector',
    'trait_appraiser',
    'trait_impatient',
    'trait_generous',
    'shop_stock_empty',
    'chronicle_elites',
    'chronicle_contracts',
  ] as const;
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const k of stage56Keys) {
      assert.ok(t(code, k).length > 0, `Empty Stage 5-6 translation ${k} for ${code}`);
    }
  }
});

test('stage7-8: Guild Day Events, Alchemy Supplies, Insurance Seal & Merchant Boom', () => {
  assert.equal(RIFT_ENTRY_COST, 50);
  assert.equal(DAY_EVENTS.length, 4);
  assert.equal(EXPEDITION_SUPPLIES.length, 3);

  const rolled = [0, 1, 2, 3].map((s) => rollDayEvent(s).id);
  assert.deepEqual(rolled, ['appraiser_fair', 'forge_festival', 'rift_surge', 'merchant_boom']);

  const fair = getDayEventModifiers('appraiser_fair');
  assert.equal(fair.shopFairMult, 1.25);
  assert.equal(fair.shopPatienceBonus, 1);

  const forge = getDayEventModifiers('forge_festival');
  assert.equal(forge.forgeDiscountMult, 0.75);

  const surge = getDayEventModifiers('rift_surge');
  assert.equal(surge.extraChest, true);
  assert.equal(surge.bonusElite, true);
  assert.equal(surge.marauderTimeMult, 0.85);

  const boom = getDayEventModifiers('merchant_boom');
  assert.equal(boom.goldDropMult, 1.2);
  assert.equal(boom.shopComboBonus, 0.1);

  const supAll = computeSupplyBonuses(['cartographer_compass', 'whetstone_oil', 'insurance_seal']);
  assert.equal(supAll.revealMap, true);
  assert.equal(supAll.dmgMult, 1.15);
  assert.equal(supAll.critBonus, 0.22);
  assert.equal(supAll.extraSavedSlots, 2);

  // Insurance Seal preserves +2 highest-value non-belt slots on defeat
  const bag = createEmptyBag();
  const cheap = { ...createRelicInstance(RELICS[0], 'c0', false), curse: 'none' as const, baseValue: 10 };
  const high1 = { ...createRelicInstance(RELICS[1], 'h1', false), curse: 'none' as const, baseValue: 90 };
  const high2 = { ...createRelicInstance(RELICS[2], 'h2', false), curse: 'none' as const, baseValue: 75 };
  const low = { ...createRelicInstance(RELICS[3], 'l1', false), curse: 'none' as const, baseValue: 25 };
  bag[0] = cheap; // Safe Belt
  bag[4] = low;
  bag[5] = high1;
  bag[6] = high2;

  const defeatDefault = resolveBagExtraction(bag, false, 0);
  assert.equal(defeatDefault.savedItems.map((i) => i.uid).join(','), 'c0');

  const defeatInsured = resolveBagExtraction(bag, false, 2);
  const savedUids = new Set(defeatInsured.savedItems.map((i) => i.uid));
  assert.equal(savedUids.size, 3);
  assert.ok(savedUids.has('c0'));
  assert.ok(savedUids.has('h1'));
  assert.ok(savedUids.has('h2'));
  assert.ok(!savedUids.has('l1'));

  // Merchant Boom +10% streakComboBonus on 2x+ deal streak
  const stash = [
    createRelicInstance(RELICS[0], 'm1', false),
    createRelicInstance(RELICS[1], 'm2', false),
  ];
  const { session } = createShopSession(stash, 3, 'astral', makeRand(12), {
    streakComboBonus: boom.shopComboBonus,
  });
  const c1 = spawnNextCustomer(session, 0, () => 0.1);
  assert.ok(c1 !== null);
  submitHaggleOffer(session, c1!.fairPrice);
  const c2 = spawnNextCustomer(session, 1, () => 0.1);
  assert.ok(c2 !== null);
  const sale2 = submitHaggleOffer(session, c2!.fairPrice);
  assert.equal(sale2.outcome, 'sold');
  assert.ok(sale2.comboBonus >= Math.round(c2!.fairPrice * 0.1) - 1);
});

test('stage7-8: Forgotten Rift dungeon mode, revealMap, Courtyard Rift Spot & 16-language keys', () => {
  const rand = makeRand(777);
  const courtyard = createCourtyardSim(5, 2, rand, {
    revealMap: true,
    extraChest: true,
    bonusElite: true,
    goldDropMult: 1.2,
    supplyDmgMult: 1.15,
    supplyCritBonus: 0.22,
  });

  // Walk to SW Forgotten Rift obelisk trigger (-3.8, 4.4)
  courtyard.player.x = -3.8;
  courtyard.player.z = 4.4;
  const cyEv: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };
  stepWorldSim(
    courtyard,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: 1,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    cyEv,
  );
  assert.equal(courtyard.nearbyInteract, 'rift');

  const riftSim = enterDungeonFloor(courtyard, 1, 1, STANDARD_DIFF, RELICS, rand, undefined, 'rift');
  assert.equal(riftSim.dungeonMode, 'rift');
  assert.ok(riftSim.floorMap !== null);
  assert.equal(riftSim.floorMap!.roomOrder.length, 4);
  const types = riftSim.floorMap!.roomOrder.map((id) => riftSim.floorMap!.rooms[id].type);
  assert.deepEqual(types, ['start', 'combat', 'treasure', 'boss']);
  assert.ok(Object.values(riftSim.floorMap!.rooms).every((r) => r.visited === true));
  // Start room has 2 base + 1 extraChest from Rift Surge = 3 (or 4 if secretKey)
  assert.ok(riftSim.chests.length >= 3);
  // 0.78x marauder timer in Forgotten Rift
  assert.equal(riftSim.marauderTimer, Math.max(25, Math.round(STANDARD_DIFF.marauderTime * 0.78)));

  // Records & GL1 export roundtrip with riftClears
  const baseRec = createDefaultRecords();
  baseRec.riftClears = 3;
  const ach = grantAchievements(baseRec, ['rift_conqueror', 'supply_master']);
  assert.equal(ach.newlyUnlocked.length, 2);
  const raw = exportSavePayload(ach.updated);
  const parsed = importSavePayload(raw);
  assert.ok(parsed !== null);
  assert.equal(parsed!.riftClears, 3);
  assert.ok(parsed!.unlockedAchievementIds.includes('rift_conqueror'));
  assert.ok(parsed!.unlockedAchievementIds.includes('supply_master'));

  const stage78Keys = [
    'interact_rift',
    'rift_banner',
    'rift_need_gold',
    'day_event_label',
    'event_appraiser_fair_name',
    'event_appraiser_fair_desc',
    'event_forge_festival_name',
    'event_forge_festival_desc',
    'event_rift_surge_name',
    'event_rift_surge_desc',
    'event_merchant_boom_name',
    'event_merchant_boom_desc',
    'supplies_title',
    'sup_cartographer_compass_name',
    'sup_cartographer_compass_desc',
    'sup_whetstone_oil_name',
    'sup_whetstone_oil_desc',
    'sup_insurance_seal_name',
    'sup_insurance_seal_desc',
    'sup_ready',
    'sup_buy',
    'chronicle_rifts',
  ] as const;
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const k of stage78Keys) {
      assert.ok(t(code, k).length > 0, `Empty Stage 7-8 translation ${k} for ${code}`);
    }
  }
});

test('stage9: Guild Familiars, Rift Tier Ascension, runtime Ember Wisp & 16-language Stage 9 keys', () => {
  assert.equal(FAMILIARS.length, 3);
  const wisp = computeFamiliarBonuses('ember_wisp');
  assert.equal(wisp.emberBoltInterval, 2.6);
  assert.equal(wisp.specialDmgMult, 1.12);

  const owl = computeFamiliarBonuses('aether_owl');
  assert.equal(owl.pickupMagnetBonus, 1.6);
  assert.equal(owl.boonRerollBonus, 1);
  assert.equal(owl.shopPatienceBonus, 1);

  const scarab = computeFamiliarBonuses('gilded_scarab');
  assert.equal(scarab.goldDropMult, 1.25);
  assert.equal(scarab.shopFairMult, 1.12);
  assert.equal(scarab.scarabChestGold, 15);

  const t1 = computeRiftScaling(0);
  assert.equal(t1.tier, 1);
  assert.equal(t1.bonusShards, 0);
  const t5 = computeRiftScaling(4);
  assert.equal(t5.tier, 5);
  assert.equal(t5.bonusShards, 2);
  assert.ok(t5.enemyHpMult > 1.5);
  assert.ok(t5.pristineBonus >= 0.24);

  // Runtime Ember Wisp zaps nearby enemy & Aether Owl pulls distant relic
  const rand = makeRand(909);
  const cy = createCourtyardSim(5, 2, rand, { familiarId: 'ember_wisp', riftTier: 3 });
  const riftSim = enterDungeonFloor(cy, 1, 1, STANDARD_DIFF, RELICS, rand, undefined, 'rift');
  riftSim.familiarCooldown = 0;
  const foe = riftSim.enemies[0];
  const beforeHp = foe.hp;
  riftSim.player.x = foe.x;
  riftSim.player.z = foe.z + 2.0;

  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    lightningArcs: [],
    hitPopups: [],
    familiarBlast: null,
  };
  stepWorldSim(
    riftSim,
    {
      moveX: 0,
      moveZ: 0,
      aimDirX: 0,
      aimDirZ: -1,
      attackPressed: false,
      jumpPressed: false,
      specialPressed: false,
      interactPressed: false,
      healPressed: false,
    },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    ev,
  );
  assert.ok(ev.familiarBlast !== null && ev.familiarBlast !== undefined);
  assert.equal(ev.familiarBlast!.kind, 'ember');
  assert.ok(foe.hp < beforeHp);

  // Records roundtrip with unlockedFamiliars + equippedFamiliar + Stage 9 trophies
  const rec = createDefaultRecords();
  rec.unlockedFamiliars = ['ember_wisp', 'aether_owl'];
  rec.equippedFamiliar = 'aether_owl';
  const ach = grantAchievements(rec, ['familiar_bonded', 'rift_tier_3']);
  assert.equal(ach.newlyUnlocked.length, 2);
  const gl = exportSavePayload(ach.updated);
  const parsed = importSavePayload(gl);
  assert.ok(parsed !== null);
  assert.equal(parsed!.equippedFamiliar, 'aether_owl');
  assert.deepEqual(parsed!.unlockedFamiliars, ['ember_wisp', 'aether_owl']);

  const stage9Keys = [
    'charter_tab_familiars',
    'fam_unlock_shards',
    'fam_unlock_gold',
    'fam_equip',
    'fam_active',
    'fam_unequip',
    'fam_ember_wisp_name',
    'fam_ember_wisp_desc',
    'fam_aether_owl_name',
    'fam_aether_owl_desc',
    'fam_gilded_scarab_name',
    'fam_gilded_scarab_desc',
    'hud_familiar_badge',
  ] as const;
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const k of stage9Keys) {
      assert.ok(t(code, k).length > 0, `Empty Stage 9 translation ${k} for ${code}`);
    }
  }
});

test('combat arts: hold-to-charge releases Crescent Wave, aerial vault plunge triggers slamLanded', () => {
  const rand = makeRand(919);
  const base = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(base, 1, 1, STANDARD_DIFF, RELICS, rand);
  assert.ok(sim.enemies.length > 0);

  const foe = sim.enemies[0];
  foe.x = sim.player.x;
  foe.z = sim.player.z - 2.0;
  const startHp = foe.hp;

  const idle = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    attackHeld: false,
    attackReleased: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  // Hold LMB across 0.4s -> chargeReady becomes true
  let sawReady = false;
  for (let i = 0; i < 28; i++) {
    stepWorldSim(sim, { ...idle, attackHeld: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
    if (ev.chargeBecameReady) sawReady = true;
  }
  assert.equal(sawReady, true);
  assert.equal(sim.player.chargeReady, true);

  // Release LMB -> chargedStrike + Sword launches slashWave + hits foe
  stepWorldSim(sim, { ...idle, attackReleased: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.chargedStrike, true);
  assert.equal(ev.waveLaunched, true);
  assert.ok(sim.slashWaves.length >= 1);
  assert.ok(foe.hp < startHp);

  // Jump then press attack mid-air -> Meteor Plunge Slam lands with stun & slamLanded
  sim.hitstopTimer = 0;
  sim.player.attackCooldown = 0;
  stepWorldSim(sim, { ...idle, jumpPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  for (let i = 0; i < 6; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  assert.ok(sim.player.y > 0.25);
  stepWorldSim(sim, { ...idle, attackPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(sim.player.slamPending, true);

  let landed = false;
  for (let i = 0; i < 40; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
    if (ev.slamLanded) {
      landed = true;
      break;
    }
  }
  assert.equal(landed, true);
});

test('tactical combat: enlarged chambers, dodge roll, shield block & timed parry', () => {
  const rand = makeRand(2026);
  const base = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(base, 1, 1, STANDARD_DIFF, RELICS, rand);

  // 1. Enlarged room geometry (41x41)
  assert.equal(sim.arenaHalfExtent, 20.5);
  assert.equal(DOOR_POSITIONS.N.z, -19.3);
  assert.equal(DOOR_POSITIONS.S.z, 19.3);

  const idle = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    attackHeld: false,
    attackReleased: false,
    jumpPressed: false,
    dodgePressed: false,
    blockHeld: false,
    blockPressed: false,
    specialPressed: false,
    abilityTriggered: null,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  // 2. Dodge Roll: consumes 1 charge, grants i-frames and fast horizontal burst
  const startCharges = sim.player.dodgeCharges;
  const startX = sim.player.x;
  stepWorldSim(
    sim,
    { ...idle, moveX: 1, moveZ: 0, dodgePressed: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    ev,
  );
  assert.equal(ev.dodged, true);
  assert.equal(sim.player.dodgeCharges, startCharges - 1);
  assert.ok(sim.player.invulnTimer >= 0.3);
  assert.ok(sim.player.x > startX + 0.15);

  // Clear dodge & invuln before testing parry and block
  sim.player.dodgeTimer = 0;
  sim.player.invulnTimer = 0;
  sim.player.mana = 40;
  const foe = sim.enemies[0];
  foe.x = sim.player.x;
  foe.z = sim.player.z - 1.4;
  foe.state = 'attack';
  foe.stateTimer = 0.15;
  foe.dealtHitThisSwing = false;

  // 3. Timed Parry: blockPressed + blockHeld against frontal attacker -> stun + +20 MP + Chain Lightning
  stepWorldSim(
    sim,
    { ...idle, aimDirX: 0, aimDirZ: -1, blockPressed: true, blockHeld: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    ev,
  );
  assert.equal(ev.parried, true);
  assert.equal(foe.state, 'stunned');
  assert.ok(sim.player.mana >= 60);
  assert.equal(sim.player.chainLightningReady, true);
  assert.equal(ev.playerHurt, false);

  // 4. Sustained Block (after parry window expires) -> blocks frontal damage without hurting HP
  sim.hitstopTimer = 0;
  sim.player.invulnTimer = 0;
  sim.player.parryWindowTimer = 0;
  const hpBeforeBlock = sim.player.hp;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 1.3;
  foe.vx = 0;
  foe.vz = 0;
  foe.state = 'attack';
  foe.stateTimer = 0.15;
  foe.dealtHitThisSwing = false;
  stepWorldSim(
    sim,
    { ...idle, aimDirX: 0, aimDirZ: -1, blockPressed: false, blockHeld: true },
    WEAPONS[0],
    1,
    STANDARD_DIFF,
    RELICS,
    rand,
    1 / 60,
    ev,
  );
  assert.equal(ev.blocked, true);
  assert.equal(sim.player.hp, hpBeforeBlock);
  assert.equal(ev.playerHurt, false);
});

test('abilities & mana: all 8 Warcraft/Witcher abilities trigger distinct effects and mana regens', () => {
  const rand = makeRand(3031);
  const base = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(base, 1, 1, STANDARD_DIFF, RELICS, rand);
  assert.equal(HERO_ABILITIES.length, 8);
  for (const ab of HERO_ABILITIES) {
    assert.notEqual(t('en', ab.nameKey), ab.nameKey);
    assert.notEqual(t('en', ab.descKey), ab.descKey);
    assert.notEqual(t('ru', ab.nameKey), ab.nameKey);
    assert.notEqual(t('ru', ab.descKey), ab.descKey);
  }

  const idle = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  // Position enemy in front of player
  const foe = sim.enemies[0];
  foe.hp = 400;
  foe.maxHp = 400;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 2.2;

  // 1) Whirlwind (0 mana)
  stepWorldSim(sim, { ...idle, abilityTriggered: 'whirlwind' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'whirlwind');
  assert.equal(ev.specialUsed, true);
  assert.ok(sim.player.abilityCooldowns.whirlwind > 0);
  assert.ok(foe.hp < 400);

  // 2) Blade Volley (3 waves, 15 mana)
  sim.hitstopTimer = 0;
  sim.slashWaves.length = 0;
  sim.player.mana = 100;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'blade_volley' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'blade_volley');
  assert.equal(ev.waveLaunched, true);
  assert.equal(sim.slashWaves.length, 3);
  assert.ok(sim.player.mana < 100);

  // 3) Ignis Cone (cone damage + burnTimer DoT)
  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 3.2;
  const hpPreIgnis = foe.hp;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'ignis_cone' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'ignis_cone');
  assert.ok(ev.ignisCone !== null && ev.ignisCone !== undefined);
  assert.equal(ev.ignisCone!.angleDeg, 72);
  assert.ok(foe.hp < hpPreIgnis);
  assert.ok((foe.burnTimer ?? 0) > 2.0);
  // Advance 0.6s so Burn DoT ticks
  sim.hitstopTimer = 0;
  const hpPostIgnis = foe.hp;
  for (let i = 0; i < 36; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  assert.ok(foe.hp < hpPostIgnis);

  // 4) Aegis Ward (2 hit barrier + absorbs incoming hit with shockwave)
  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  sim.player.invulnTimer = 0;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'aegis_ward' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'aegis_ward');
  assert.equal(sim.player.aegisShieldHits, 2);
  sim.hitstopTimer = 0;
  sim.player.invulnTimer = 0;
  const hpBeforeAegisHit = sim.player.hp;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 1.3;
  foe.vx = 0;
  foe.vz = 0;
  foe.state = 'attack';
  foe.stateTimer = 0.12;
  foe.dealtHitThisSwing = false;
  stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.aegisBurst, true);
  assert.equal(sim.player.aegisShieldHits, 1);
  assert.equal(sim.player.hp, hpBeforeAegisHit);

  // 5) Frost Nova (AoE chill + stun)
  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 2.6;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'frost_nova' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'frost_nova');
  assert.ok(ev.frostNova !== null && ev.frostNova !== undefined);
  assert.ok((foe.slowTimer ?? 0) > 3.0);
  assert.equal(foe.state, 'stunned');

  // 6) Leap Slam -> launches upward with slamPending, lands with slamLanded
  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  sim.player.y = 0;
  sim.player.vy = 0;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'leap_slam' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'leap_slam');
  assert.equal(sim.player.slamPending, true);
  let slamDone = false;
  for (let i = 0; i < 60; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
    if (ev.slamLanded) {
      slamDone = true;
      break;
    }
  }
  assert.equal(slamDone, true);

  // Mana regenerates passively over time
  sim.player.mana = 20;
  for (let i = 0; i < 60; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  assert.ok(sim.player.mana > 25);
});

test('keybinds: rebinding keyboard and mouse buttons swaps conflicts and persists cleanly', () => {
  assert.equal(KEYBIND_ACTIONS.length, 19);
  assert.equal(DEFAULT_KEYBINDS.ability7, 'Digit7');
  assert.equal(DEFAULT_KEYBINDS.ability8, 'Digit8');
  // Swap Mouse2 from block -> dodge; block should receive ShiftLeft
  const swapped = rebindKeyAction(DEFAULT_KEYBINDS, 'dodge', 'Mouse2');
  assert.equal(swapped.dodge, 'Mouse2');
  assert.equal(swapped.block, DEFAULT_KEYBINDS.dodge);

  // Rebind ability4 to KeyF cleanly
  const withF = rebindKeyAction(swapped, 'ability4', 'KeyF');
  assert.equal(withF.ability4, 'KeyF');
  assert.equal(formatKeybindLabel('KeyF'), 'F');
  assert.equal(formatKeybindLabel('Mouse2'), 'RMB');

  // Invalid codes like Escape are rejected
  const unchanged = rebindKeyAction(withF, 'ability1', 'Escape');
  assert.equal(unchanged.ability1, DEFAULT_KEYBINDS.ability1);

  // normalizeSettings preserves custom keybinds & rejects invalid entries
  const normalized = normalizeSettings({
    keybinds: { ...withF, attack: 'Escape' } as typeof DEFAULT_KEYBINDS,
  });
  assert.equal(normalized.keybinds.ability4, 'KeyF');
  assert.equal(normalized.keybinds.attack, DEFAULT_KEYBINDS.attack);
});

test('non-aggro rule: enemies beyond 1/4 room distance from entry start idle and wake on proximity or hit', () => {
  const rand = makeRand(4411);
  const base = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(base, 1, 1, STANDARD_DIFF, RELICS, rand);

  // Place one close enemy (<= 10.25m from entry) and one distant enemy (> 10.25m from entry)
  sim.player.x = sim.roomEntryX;
  sim.player.z = sim.roomEntryZ;
  const closeEnemy = sim.enemies[0];
  closeEnemy.x = sim.roomEntryX;
  closeEnemy.z = sim.roomEntryZ - 4.0;
  const farEnemy = sim.enemies[1] ?? {
    ...closeEnemy,
    id: 'far_test_enemy',
    x: 0,
    z: -10.5,
  };
  if (!sim.enemies[1]) sim.enemies.push(farEnemy);
  farEnemy.x = sim.roomEntryX;
  farEnemy.z = sim.roomEntryZ - 16.0; // > 10.25m (half * 0.5)

  initializeRoomEnemyAggro(sim.enemies, sim.roomEntryX, sim.roomEntryZ, sim.arenaHalfExtent);
  assert.equal(closeEnemy.state, 'chase');
  assert.equal(closeEnemy.aggroed, true);
  assert.equal(farEnemy.state, 'idle');
  assert.equal(farEnemy.aggroed, false);

  const idleInput = {
    moveX: 0,
    moveZ: 0,
    aimDirX: null,
    aimDirZ: null,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  // Step 30 frames while player stays at entry: farEnemy stays idle & does not charge player
  const startFarZ = farEnemy.z;
  for (let i = 0; i < 30; i++) {
    stepWorldSim(sim, idleInput, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  assert.equal(farEnemy.state, 'idle');
  assert.equal(farEnemy.aggroed, false);
  assert.ok(Math.abs(farEnemy.z - startFarZ) < 1.5);

  // Move player within <= 7.8m of farEnemy -> wakes up to chase
  sim.player.x = farEnemy.x;
  sim.player.z = farEnemy.z + 6.5;
  stepWorldSim(sim, idleInput, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(farEnemy.aggroed, true);
  assert.notEqual(farEnemy.state, 'idle');
});

test('camera-relative movement: rotates WASD by cameraYaw and runs forward when bothMouseHeld', () => {
  // At yaw = 0, W (moveZ = -1) moves along -Z
  const forwardZero = computeCameraRelativeMove(0, -1, 0, false);
  assert.ok(Math.abs(forwardZero.mx) < 1e-6);
  assert.ok(forwardZero.mz < -0.99);

  // At yaw = PI / 2 (camera to the +X looking toward -X), W moves toward -X
  const forwardRotated = computeCameraRelativeMove(0, -1, Math.PI / 2, false);
  assert.ok(forwardRotated.mx < -0.99);
  assert.ok(Math.abs(forwardRotated.mz) < 1e-6);

  // Strafe right (moveX = +1) at yaw = PI / 2 moves toward -Z
  const strafeRotated = computeCameraRelativeMove(1, 0, Math.PI / 2, false);
  assert.ok(Math.abs(strafeRotated.mx) < 1e-6);
  assert.ok(strafeRotated.mz < -0.99);

  // Both mouse buttons held runs forward along cameraYaw even without WASD
  const bothMouse = computeCameraRelativeMove(0, 0, Math.PI / 2, true);
  assert.ok(bothMouse.mx < -0.99);
  assert.ok(Math.abs(bothMouse.mz) < 1e-6);
});

test('elemental reactions & combo streak: Thermal Shatter, Superconduct Overload, and 3.6s streak decay', () => {
  const rand = makeRand(9901);
  const base = createCourtyardSim(5, 2, rand);
  const sim = enterDungeonFloor(base, 1, 1, STANDARD_DIFF, RELICS, rand);
  const idle = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    elementalReactions: [],
    lightningArcs: [],
    hitPopups: [],
    impactPoints: [],
  };

  const foe = sim.enemies[0];
  foe.hp = 600;
  foe.maxHp = 600;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 2.4;

  // 1) Frost Nova applies slowTimer, then Ignis Cone triggers Thermal Shatter + increments comboStreak
  sim.player.mana = 100;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'frost_nova' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok((foe.slowTimer ?? 0) > 1.0);
  const streakAfterFrost = sim.player.comboStreak;
  assert.ok(streakAfterFrost >= 1);

  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'ignis_cone' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok(ev.elementalReactions?.some((r) => r.kind === 'shatter'), 'Expected Thermal Shatter reaction');
  assert.ok(ev.hitPopups?.some((p) => p.text.includes('SHATTER!')));
  assert.ok(sim.player.comboStreak > streakAfterFrost);

  // 2) Reverse combo: Burning enemy + Frost Nova -> Thermal Shatter
  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  sim.player.abilityCooldowns.frost_nova = 0;
  foe.slowTimer = 0;
  foe.burnTimer = 2.5;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'frost_nova' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok(ev.elementalReactions?.some((r) => r.kind === 'shatter'), 'Expected reverse Thermal Shatter');

  // 3) Chain Lightning on Burning/Chilled secondary enemy -> Superconduct Overload
  sim.hitstopTimer = 0;
  sim.player.chainLightningReady = true;
  sim.player.attackCooldown = 0;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 1.3;
  const foe2 = sim.enemies[1] ?? { ...foe, id: 'sc_foe_2' };
  if (!sim.enemies[1]) sim.enemies.push(foe2);
  foe2.state = 'chase';
  foe2.hp = 400;
  foe2.maxHp = 400;
  foe2.x = foe.x + 2.2;
  foe2.z = foe.z;
  foe2.burnTimer = 2.0;
  stepWorldSim(sim, { ...idle, attackPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok(ev.elementalReactions?.some((r) => r.kind === 'superconduct'), 'Expected Superconduct reaction');
  assert.ok(ev.hitPopups?.some((p) => p.text.includes('OVERLOAD')));

  // 4) Combo streak resets cleanly after 3.7s without hits
  assert.ok(sim.player.comboStreak >= 3);
  for (let i = 0; i < 230; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  assert.equal(sim.player.comboStreak, 0);
});

test('input: LMB drag (>5px) orbits camera without attacking, quick click triggers attack cleanly', () => {
  const listeners: Record<string, Array<(ev: Record<string, unknown>) => void>> = {};
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevHTMLElement = globalThis.HTMLElement;
  const prevNode = globalThis.Node;

  class MockElement {}
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = MockElement;
  (globalThis as unknown as { Node: unknown }).Node = MockElement;
  (globalThis as unknown as { window: unknown }).window = {
    addEventListener: (type: string, fn: (ev: Record<string, unknown>) => void) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: (type: string, fn: (ev: Record<string, unknown>) => void) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((f) => f !== fn);
    },
  };
  (globalThis as unknown as { document: unknown }).document = {
    activeElement: null,
    pointerLockElement: null,
    visibilityState: 'visible',
    addEventListener: (type: string, fn: (ev: Record<string, unknown>) => void) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: (type: string, fn: (ev: Record<string, unknown>) => void) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((f) => f !== fn);
    },
  };

  try {
    const hub = createInputHub();
    const fire = (type: string, ev: Record<string, unknown>) => {
      for (const fn of listeners[type] ?? []) fn({ preventDefault() {}, target: null, ...ev });
    };

    // Case 1: LMB down -> drag 16px -> LMB up => orbit drag without attack
    fire('mousedown', { button: 0, clientX: 200, clientY: 200 });
    fire('mousemove', { clientX: 216, clientY: 202, movementX: 16, movementY: 2 });
    assert.equal(hub.isOrbitDragging(), true);
    const orb = hub.consumeOrbitDelta();
    assert.equal(orb.dragging, true);
    assert.equal(orb.dx, 16);
    assert.equal(hub.consumeActionJustPressed('attack'), false);
    fire('mouseup', { button: 0, clientX: 216, clientY: 202 });
    assert.equal(hub.consumeActionJustPressed('attack'), false);

    hub.endFrame();

    // Case 2: LMB down -> move 1px -> quick LMB up => attack fires on release
    fire('mousedown', { button: 0, clientX: 200, clientY: 200 });
    fire('mousemove', { clientX: 201, clientY: 200, movementX: 1, movementY: 0 });
    assert.equal(hub.isOrbitDragging(), false);
    fire('mouseup', { button: 0, clientX: 201, clientY: 200 });
    assert.equal(hub.consumeActionJustPressed('attack'), true);
    hub.dispose();
  } finally {
    (globalThis as unknown as { window: unknown }).window = prevWindow;
    (globalThis as unknown as { document: unknown }).document = prevDocument;
    (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = prevHTMLElement;
    (globalThis as unknown as { Node: unknown }).Node = prevNode;
  }
});

test('i18n: target frame, combo streak, riposte, and status debuff keys exist across all 16 languages', () => {
  const keys = [
    'hud_combo_hits',
    'hud_riposte',
    'enemy_slime',
    'enemy_sentinel',
    'enemy_caster',
    'enemy_marauder',
    'affix_volatile',
    'affix_swift',
    'affix_bulwark',
    'status_burn',
    'status_chill',
    'status_poison',
    'status_stun',
  ] as const;
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const key of keys) {
      const val = t(code, key);
      assert.ok(val && val.trim().length > 0, `Missing translation for ${code}.${key}`);
    }
  }
  assert.notEqual(t('ru', 'status_burn'), t('en', 'status_burn'));
  assert.notEqual(t('ru', 'hud_combo_hits'), t('en', 'hud_combo_hits'));
  assert.notEqual(t('ru', 'hud_riposte'), t('en', 'hud_riposte'));
});

test('dungeonSim: cycleTargetEnemyId cycles nearest -> farther -> farthest and wraps while skipping ko', () => {
  const rand = makeRand(42);
  let sim = createCourtyardSim(5, 2, rand);
  sim = enterDungeonFloor(sim, 1, 1, STANDARD_DIFF, RELICS, rand);
  assert.equal(cycleTargetEnemyId([], 0, 0, null), null);

  const base = sim.enemies[0];
  const enemies = [
    { ...base, id: 'far', x: 10, z: 0, state: 'idle' as const },
    { ...base, id: 'ko_enemy', x: 0.5, z: 0, state: 'ko' as const },
    { ...base, id: 'near', x: 2, z: 0, state: 'chase' as const },
    { ...base, id: 'mid', x: 5, z: 0, state: 'chase' as const },
  ];

  // Start with null -> picks nearest living enemy ('near')
  const first = cycleTargetEnemyId(enemies, 0, 0, null);
  assert.equal(first, 'near');
  // Next -> 'mid'
  const second = cycleTargetEnemyId(enemies, 0, 0, first);
  assert.equal(second, 'mid');
  // Next -> 'far'
  const third = cycleTargetEnemyId(enemies, 0, 0, second);
  assert.equal(third, 'far');
  // Wrap around -> 'near'
  const fourth = cycleTargetEnemyId(enemies, 0, 0, third);
  assert.equal(fourth, 'near');

  // Tie-break determinism by id when equidistant
  const tied = [
    { ...base, id: 'e_b', x: 3, z: 0, state: 'chase' as const },
    { ...base, id: 'e_a', x: -3, z: 0, state: 'chase' as const },
  ];
  assert.equal(cycleTargetEnemyId(tied, 0, 0, null), 'e_a');
  assert.equal(cycleTargetEnemyId(tied, 0, 0, 'e_a'), 'e_b');
});

test('dungeonSim: Perfect Dodge triggers Riposte counter window granting +12 MP and guaranteed bonus crit', () => {
  const rand = makeRand(99);
  let sim = createCourtyardSim(5, 2, rand);
  sim = enterDungeonFloor(sim, 1, 1, STANDARD_DIFF, RELICS, rand);

  const foe = sim.enemies.find((e) => e.state !== 'ko')!;
  foe.hp = 500;
  foe.maxHp = 500;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 2.0;
  foe.state = 'windup';
  foe.stateTimer = 0.35;

  sim.player.mana = 50;
  sim.player.dodgeCharges = 2;
  sim.player.counterTimer = 0;

  const idle: Parameters<typeof stepWorldSim>[1] = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    hitPopups: [],
    impactPoints: [],
  };

  stepWorldSim(sim, { ...idle, dodgePressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.dodged, true);
  assert.equal(ev.riposteTriggered, true);
  assert.ok(sim.player.counterTimer > 1.5, 'Expected counterTimer to be armed after perfect dodge');
  assert.ok(sim.player.mana >= 62, 'Expected +12 MP on perfect dodge riposte');

  // Wait for dodge lockout to finish while preserving riposte window, reposition close, then strike
  for (let i = 0; i < 20; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  foe.x = sim.player.x;
  foe.z = sim.player.z - 1.3;
  foe.state = 'chase';
  const hpBeforeStrike = foe.hp;
  stepWorldSim(sim, { ...idle, attackPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok(foe.hp < hpBeforeStrike, 'Expected riposte strike to damage foe');
  assert.equal(sim.player.counterTimer, 0, 'Expected counterTimer to consume after landing riposte');
  assert.ok(ev.hitPopups?.some((p) => p.text.includes('RIPOSTE') && p.crit), 'Expected RIPOSTE crit popup');
});

test('abilities & spells: blink_strike (7) & meteor_call (8) trigger movement/AoE/burn/stun/cooldowns and translate across all languages', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    for (const k of [
      'ability_blink_strike_name',
      'ability_blink_strike_desc',
      'ability_meteor_call_name',
      'ability_meteor_call_desc',
      'kb_ability7',
      'kb_ability8',
    ] as const) {
      assert.ok(t(code, k).trim().length > 0, `Missing translation ${code}.${k}`);
    }
  }
  assert.notEqual(t('ru', 'ability_blink_strike_name'), t('en', 'ability_blink_strike_name'));
  assert.notEqual(t('ru', 'ability_meteor_call_name'), t('en', 'ability_meteor_call_name'));

  const rand = makeRand(7788);
  let sim = createCourtyardSim(5, 2, rand);
  sim = enterDungeonFloor(sim, 1, 1, STANDARD_DIFF, RELICS, rand);

  const idle: Parameters<typeof stepWorldSim>[1] = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
    hitPopups: [],
    impactPoints: [],
  };

  // Place foe ahead for Blink Strike
  const foe = sim.enemies.find((e) => e.state !== 'ko')!;
  foe.hp = 600;
  foe.maxHp = 600;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 4.8;
  const startZ = sim.player.z;
  sim.player.mana = 100;
  sim.player.abilityCooldowns.blink_strike = 0;

  stepWorldSim(sim, { ...idle, abilityTriggered: 'blink_strike' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'blink_strike');
  assert.ok(ev.blinkStrike !== null && ev.blinkStrike !== undefined);
  assert.ok(sim.player.z < startZ - 2.0, 'Expected blink_strike to warp forward');
  assert.ok(foe.hp < 600, 'Expected blink_strike shockwave to damage enemy');
  assert.equal(foe.state, 'stunned');
  assert.ok(sim.player.abilityCooldowns.blink_strike >= 6.0);
  assert.equal(sim.player.mana, 75);

  // Meteor Call ahead
  sim.hitstopTimer = 0;
  sim.player.mana = 100;
  sim.player.abilityCooldowns.meteor_call = 0;
  sim.player.attackCooldown = 0;
  foe.hp = 600;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 3.4;
  stepWorldSim(sim, { ...idle, abilityTriggered: 'meteor_call' }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.abilityCast, 'meteor_call');
  assert.ok(ev.meteorImpact !== null && ev.meteorImpact !== undefined);
  assert.ok(foe.hp < 600, 'Expected meteor_call AoE to damage enemy');
  assert.ok((foe.burnTimer ?? 0) > 3.0, 'Expected meteor_call to apply Burn DoT');
  assert.equal(foe.state, 'stunned');
  assert.ok(sim.player.abilityCooldowns.meteor_call >= 10.0);
  assert.equal(sim.player.mana, 55);
});

test('combat: melee attackCooldown & attackMaxCooldown gate rapid swings cleanly', () => {
  const rand = makeRand(9191);
  let sim = createCourtyardSim(5, 2, rand);
  sim = enterDungeonFloor(sim, 1, 1, STANDARD_DIFF, RELICS, rand);
  const sword = WEAPONS.find((w) => w.id === 'sword')!;
  const hammer = WEAPONS.find((w) => w.id === 'hammer')!;
  assert.ok(sword.cooldown >= 0.35 && hammer.cooldown >= 0.5);

  const idle: Parameters<typeof stepWorldSim>[1] = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  sim.player.attackCooldown = 0;
  stepWorldSim(sim, { ...idle, attackPressed: true }, sword, 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.swungCombo, 0);
  assert.ok(sim.player.attackCooldown > 0.25);
  assert.ok(Math.abs(sim.player.attackMaxCooldown - sword.cooldown) < 0.05);

  // Rapid swing immediately on next tick must be gated by cooldown
  stepWorldSim(sim, { ...idle, attackPressed: true }, sword, 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.swungCombo, -1, 'Expected rapid swing to be blocked while attackCooldown > 0');

  // After advancing past cooldown, next combo step swings cleanly
  for (let i = 0; i < 30; i++) {
    stepWorldSim(sim, idle, sword, 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  }
  assert.equal(sim.player.attackCooldown, 0);
  stepWorldSim(sim, { ...idle, attackPressed: true }, sword, 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.swungCombo, 1);
});

test('architecture: floor biome generation prevents >2 consecutive identical biomes and getRoomGroundY returns multi-level heights', () => {
  for (const seed of [11, 42, 77, 1337, 9001]) {
    for (let floor = 1; floor <= 3; floor++) {
      const rand = makeRand(seed + floor * 17);
      let sim = createCourtyardSim(floor, 1, rand);
      sim = enterDungeonFloor(sim, floor, 1, STANDARD_DIFF, RELICS, rand);
      const map = sim.floorMap!;
      const ordered = map.roomOrder.map((id) => map.rooms[id]);
      let runLen = 1;
      for (let i = 1; i < ordered.length; i++) {
        if (ordered[i].biome === ordered[i - 1].biome) {
          runLen += 1;
        } else {
          runLen = 1;
        }
        assert.ok(
          runLen <= 2,
          `Seed ${seed} floor ${floor} had ${runLen} consecutive ${ordered[i].biome} rooms`,
        );
      }
      const biomes = new Set(ordered.map((r) => r.biome));
      assert.ok(biomes.size >= 2, `Expected multi-biome variety on floor ${floor}`);
    }
  }

  // Elevation profile checks for terraced and bridge layouts
  assert.ok(getRoomGroundY({ biome: 'ruins', layoutKind: 'terraced' }, 0, 0) > 0.5);
  assert.equal(getRoomGroundY({ biome: 'ruins', layoutKind: 'terraced' }, 10, 10), 0);
  assert.ok(getRoomGroundY({ biome: 'fire', layoutKind: 'bridge' }, 0, 0) > 0.3);
  assert.ok(getRoomGroundY({ biome: 'fire', layoutKind: 'bridge' }, 8, 0) < 0);
  assert.equal(getRoomGroundY({ biome: 'ice', layoutKind: 'open' }, 2, 2), 0);
});

test('moves: Coyote Time allows jumping right after stepping off a raised dais and Jump Buffer triggers upon landing', () => {
  const rand = makeRand(515);
  let sim = createCourtyardSim(5, 2, rand);
  sim = enterDungeonFloor(sim, 1, 1, STANDARD_DIFF, RELICS, rand);
  const curRoom = sim.floorMap!.rooms[sim.currentRoomId];
  curRoom.layoutKind = 'terraced';
  curRoom.obstacles = [];

  const idle: Parameters<typeof stepWorldSim>[1] = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  // Stand on the central terraced dais to prime coyoteTimer, then step off onto lower ground
  sim.player.x = 0;
  sim.player.z = 0;
  sim.player.y = 0.54;
  sim.player.vy = 0;
  sim.player.maxJumpCharges = 1;
  sim.player.jumpCharges = 1;
  sim.player.jumpCooldown = 0;
  stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok(sim.player.coyoteTimer > 0.1, 'Expected coyoteTimer primed while grounded on dais');

  // Move horizontally outside dais edge so groundY drops to 0 while player.y is still ~0.54
  sim.player.x = 8.5;
  sim.player.z = 8.5;
  stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.ok(sim.player.y > 0.1 && sim.player.coyoteTimer > 0.05);

  // Jump mid-air right after stepping off dais via Coyote Time (even with single jump charge)
  stepWorldSim(sim, { ...idle, jumpPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.jumped, true, 'Expected Coyote Time to allow jump after leaving ledge');
  assert.ok(sim.player.vy > 5, 'Expected upward jump velocity derived from jumpHeight & gravityScale');

  // Now test Jump Buffer: falling just above ground, press jump -> queued in jumpBufferTimer -> fires on landing
  sim.player.coyoteTimer = 0;
  sim.player.jumpTimer = 0;
  sim.player.jumpCooldown = 0;
  sim.player.jumpCharges = 1;
  sim.player.x = 10;
  sim.player.z = 10;
  sim.player.y = 0.25;
  sim.player.vy = -8.0;
  stepWorldSim(sim, { ...idle, jumpPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.jumped, false, 'Expected jump to buffer rather than fire mid-air when coyoteTimer is 0');
  assert.ok(sim.player.jumpBufferTimer > 0.08);

  let bufferedJumped = false;
  for (let i = 0; i < 6; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
    if (ev.jumped) {
      bufferedJumped = true;
      break;
    }
  }
  assert.equal(bufferedJumped, true, 'Expected buffered jump to trigger automatically upon landing');
});

test('moves: 3-phase attackPhase (windup -> hit -> recovery -> idle) and 0.05s Hit Stop on landed hit', () => {
  const rand = makeRand(626);
  let sim = createCourtyardSim(5, 2, rand);
  sim = enterDungeonFloor(sim, 1, 1, STANDARD_DIFF, RELICS, rand);
  const foe = sim.enemies.find((e) => e.state !== 'ko')!;
  foe.hp = 500;
  foe.maxHp = 500;
  foe.x = sim.player.x;
  foe.z = sim.player.z - 1.3;
  foe.state = 'chase';

  const idle: Parameters<typeof stepWorldSim>[1] = {
    moveX: 0,
    moveZ: 0,
    aimDirX: 0,
    aimDirZ: -1,
    attackPressed: false,
    jumpPressed: false,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };
  const ev: SimEvents = {
    swungCombo: -1,
    jumped: false,
    specialUsed: false,
    enemyHit: false,
    enemyKilled: false,
    appraisalTriggered: false,
    playerHurt: false,
    healed: false,
    pickedUpItem: null,
    chestOpened: false,
    marauderSpawned: false,
    interactTarget: null,
    playerDied: false,
    stepped: false,
  };

  sim.hitstopTimer = 0;
  sim.player.attackCooldown = 0;
  stepWorldSim(sim, { ...idle, attackPressed: true }, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
  assert.equal(ev.enemyHit, true);
  assert.ok(sim.hitstopTimer >= 0.05, 'Expected Hit Stop >= 0.05s on landed melee hit');
  assert.equal(sim.player.attackPhase, 'windup');

  // Clear hitstop, then step until windup -> hit -> recovery -> idle transitions occur
  const seenPhases = new Set<string>([sim.player.attackPhase]);
  for (let i = 0; i < 40; i++) {
    stepWorldSim(sim, idle, WEAPONS[0], 1, STANDARD_DIFF, RELICS, rand, 1 / 60, ev);
    seenPhases.add(sim.player.attackPhase);
  }
  assert.ok(seenPhases.has('windup'));
  assert.ok(seenPhases.has('hit'));
  assert.ok(seenPhases.has('recovery'));
  assert.equal(sim.player.attackPhase, 'idle');
});

test('music: 5 real OGG soundtrack tracks, carousel wrap-around, subdued gain ceiling & 16-lang localization', () => {
  assert.equal(SOUNDTRACK_TRACKS.length, 5);
  const expectedFiles = [
    'Gold.ogg',
    'Gilded Throne.ogg',
    'Ancient Slavic Shadows.ogg',
    'Leshy.ogg',
    'Last Stand.ogg',
  ];
  assert.deepEqual(
    SOUNDTRACK_TRACKS.map((tr) => tr.fileName),
    expectedFiles,
  );
  for (const tr of SOUNDTRACK_TRACKS) {
    assert.ok(tr.src.startsWith('/assets/audio/'));
    assert.ok(tr.src.endsWith('.ogg'));
    for (const { code } of SUPPORTED_LANGUAGES) {
      assert.ok(t(code, tr.titleKey).trim().length > 0, `Missing ${code}.${tr.titleKey}`);
      assert.ok(t(code, tr.moodKey).trim().length > 0, `Missing ${code}.${tr.moodKey}`);
    }
    assert.notEqual(t('ru', tr.titleKey), t('en', tr.titleKey));
  }

  // Carousel wrapping forward & backward
  assert.equal(getNextCarouselIndex(0, 1), 1);
  assert.equal(getNextCarouselIndex(4, 1), 0);
  assert.equal(getNextCarouselIndex(0, -1), 4);
  assert.equal(getNextCarouselIndex(3, -1), 2);

  // Subdued background music ceiling (<= 0.28 at max slider, 0 when muted, ducks on pause & low HP)
  const maxSubdued = computeSubduedMusicGain(1, false, false, false);
  assert.ok(maxSubdued > 0 && maxSubdued <= 0.28, `Expected subdued gain <= 0.28, got ${maxSubdued}`);
  assert.equal(computeSubduedMusicGain(1, true, false, false), 0);
  const pausedGain = computeSubduedMusicGain(0.5, false, true, false);
  const activeGain = computeSubduedMusicGain(0.5, false, false, false);
  assert.ok(pausedGain < activeGain, 'Expected pause to duck background music');
  const lowHpGain = computeSubduedMusicGain(0.5, false, false, true);
  assert.ok(lowHpGain < activeGain, 'Expected low HP mode to duck background music');
});

test('adaptive UI: isMobileDevice classifies touch viewports < 1024px cleanly', () => {
  assert.equal(isMobileDevice(390, true), true);
  assert.equal(isMobileDevice(844, true), true);
  assert.equal(isMobileDevice(1023, true), true);
  assert.equal(isMobileDevice(1024, true), false);
  assert.equal(isMobileDevice(1440, false), false);
  assert.equal(isMobileDevice(800, false), false);
});
