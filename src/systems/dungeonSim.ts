import type { BagRelicItem, RelicEra, RelicTemplate } from './backpack';
import { createRelicInstance } from './backpack';
import { computeBoonEffects, type BoonId } from './boons';
import { getBossForWeek, type BossId, type BossPattern } from './bosses';
import {
  computeFamiliarBonuses,
  computeRiftScaling,
  type DungeonMode,
  type FamiliarId,
} from './expedition';
import {
  ABILITY_MAP,
  ABILITY_ORDER,
  createInitialAbilityCooldowns,
  type AbilityId,
} from './abilities';

export type WorldZone = 'courtyard' | 'dungeon';
export type EnemyKind = 'slime' | 'sentinel' | 'caster' | 'boss' | 'marauder';
export type FloorAnomalyId = 'none' | 'blood_moon' | 'mirror_echo' | 'low_gravity';
export type DoorDir = 'N' | 'S' | 'E' | 'W';
export type RoomType = 'start' | 'combat' | 'treasure' | 'shrine' | 'boss';
export type InteractSpotId =
  | 'gate'
  | 'rift'
  | 'shop'
  | 'forge'
  | 'alchemy'
  | 'exit_portal'
  | 'chest'
  | 'altar'
  | 'secret_chest'
  | 'door_n'
  | 'door_s'
  | 'door_e'
  | 'door_w';

export interface WeaponDef {
  id: string;
  nameKey: string;
  descKey: string;
  damage: number;
  range: number;
  arcDeg: number;
  cooldown: number;
  specialDamage: number;
  specialRange: number;
  specialCooldown: number;
  color: string;
  unlockCost: number;
}

export interface DifficultyPreset {
  id: 'cozy' | 'standard' | 'veteran';
  enemyHpMult: number;
  enemyDmgMult: number;
  telegraphMult: number;
  debtMult: number;
  patienceBonus: number;
  marauderTime: number;
}

export interface RunModifiers {
  maxJumpCharges?: number;
  jumpCooldownMult?: number;
  specialDmgMult?: number;
  specialCooldownMult?: number;
  bountyEra?: RelicEra;
  secretKeyGranted?: boolean;
  pawnDmgBuff?: boolean;
  beltSpeedMult?: number;
  beltSpecialCdMult?: number;
  beltFloorHeal?: number;
  beltAbyssPoison?: boolean;
  beltDmgMult?: number;
  anomalyOverride?: FloorAnomalyId;
  pactEnemyHpMult?: number;
  pactEnemySpeedMult?: number;
  pactMarauderMult?: number;
  weaponDmgMult?: number;
  charterDmgMult?: number;
  pactBonusRarity?: boolean;
  revealMap?: boolean;
  supplyDmgMult?: number;
  supplyCritBonus?: number;
  extraChest?: boolean;
  bonusElite?: boolean;
  goldDropMult?: number;
  eventMarauderMult?: number;
  familiarId?: FamiliarId;
  riftTier?: number;
}

export interface ObstacleDef {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface RuneTrapEntity {
  id: string;
  x: number;
  z: number;
  radius: number;
  cooldown: number;
}

export interface AltarEntity {
  x: number;
  z: number;
  used: boolean;
}

export interface DestructibleEntity {
  id: string;
  kind: 'urn' | 'crystal';
  x: number;
  z: number;
  broken: boolean;
}

export type EliteAffix = 'volatile' | 'swift' | 'bulwark';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'stunned' | 'ko';
  stateTimer: number;
  windupDuration: number;
  attackRange: number;
  hitFlashTimer: number;
  walkPhase: number;
  dealtHitThisSwing: boolean;
  koTimer: number;
  aggroed?: boolean;
  patrolOriginX?: number;
  patrolOriginZ?: number;
  patrolAngle?: number;
  poisonTimer?: number;
  poisonTickTimer?: number;
  burnTimer?: number;
  burnTickTimer?: number;
  slowTimer?: number;
  isMimicGuard?: boolean;
  isElite?: boolean;
  eliteAffix?: EliteAffix;
  bossId?: BossId;
  bossNameKey?: string;
  bossTitleKey?: string;
  bossPhase?: 1 | 2;
  bossPattern?: BossPattern;
  isSubBoss?: boolean;
}

export interface ProjectileEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
  deflected?: boolean;
}

export interface SlashWaveEntity {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  color: string;
  hitIds: string[];
}

export interface ChestEntity {
  id: string;
  x: number;
  z: number;
  opened: boolean;
  isSecret?: boolean;
  isMimic?: boolean;
  mimicRevealed?: boolean;
}

export interface PickupEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  item: BagRelicItem;
  age: number;
}

export interface CourtyardNpc {
  id: string;
  role: 'blacksmith' | 'alchemist' | 'customer' | 'night_guest';
  name: string;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  facing: number;
  walkPhase: number;
  waitTimer: number;
  color: string;
  thoughtHint?: string;
}

export interface SimStepInput {
  moveX: number;
  moveZ: number;
  aimDirX: number | null;
  aimDirZ: number | null;
  cameraYaw?: number;
  steerWithCamera?: boolean;
  bothMouseHeld?: boolean;
  attackPressed: boolean;
  attackHeld?: boolean;
  attackReleased?: boolean;
  jumpPressed: boolean;
  dodgePressed?: boolean;
  blockHeld?: boolean;
  blockPressed?: boolean;
  specialPressed: boolean;
  abilityTriggered?: AbilityId | null;
  interactPressed: boolean;
  healPressed: boolean;
}

export interface SimPopupEvent {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  crit: boolean;
  kind: 'dmg' | 'heal' | 'hurt' | 'appraisal';
}

export interface LightningArcEvent {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
}

export interface SimEvents {
  swungCombo: number; // -1 if none, else 0..2
  jumped: boolean;
  dodged?: boolean;
  riposteTriggered?: boolean;
  blocked?: boolean;
  parried?: boolean;
  specialUsed: boolean;
  abilityCast?: AbilityId | null;
  ignisCone?: { x: number; z: number; facing: number; range: number; angleDeg: number } | null;
  frostNova?: { x: number; z: number; radius: number } | null;
  aegisBurst?: boolean;
  enemyHit: boolean;
  enemyKilled: boolean;
  appraisalTriggered: boolean;
  playerHurt: boolean;
  healed: boolean;
  pickedUpItem: BagRelicItem | null;
  chestOpened: boolean;
  marauderSpawned: boolean;
  interactTarget: InteractSpotId | null;
  playerDied: boolean;
  stepped: boolean;
  deflected?: boolean;
  trapTriggered?: { x: number; z: number } | null;
  altarActivated?: boolean;
  coinsEarned?: number;
  crystalCharged?: boolean;
  mimicAwakened?: boolean;
  mimicStunned?: boolean;
  finisherCombo?: boolean;
  echoTriggered?: boolean;
  roomCleared?: boolean;
  roomTransition?: DoorDir | null;
  boonOffered?: boolean;
  bossPhase2?: boolean;
  emberVaultBlast?: boolean;
  propsSmashed?: number;
  killedEnemyTypes?: string[];
  killedBossId?: BossId | null;
  killedEliteCount?: number;
  volatileBlast?: { x: number; z: number } | null;
  parryTriggered?: boolean;
  lightningArcs?: LightningArcEvent[];
  hitPopups?: SimPopupEvent[];
  chargedStrike?: boolean;
  chargeBecameReady?: boolean;
  slamLanded?: boolean;
  waveLaunched?: boolean;
  elementalReactions?: Array<{ x: number; z: number; kind: 'shatter' | 'superconduct' }>;
  impactPoints?: Array<{ x: number; y: number; z: number; color: string; heavy: boolean }>;
  smashedProps?: Array<{ x: number; z: number; kind: 'urn' | 'crystal' }>;
  familiarBlast?: {
    x1: number;
    y1: number;
    z1: number;
    x2: number;
    y2: number;
    z2: number;
    color: string;
    kind: 'ember' | 'frost';
  } | null;
}

export interface DungeonRoomState {
  id: string;
  gx: number;
  gy: number;
  type: RoomType;
  doors: DoorDir[];
  neighbors: Partial<Record<DoorDir, string>>;
  visited: boolean;
  cleared: boolean;
  boonOfferEligible: boolean;
  boonOffered: boolean;
  hasExitPortal: boolean;
  obstacles: ObstacleDef[];
  enemies: EnemyEntity[];
  chests: ChestEntity[];
  destructibles: DestructibleEntity[];
  runeTraps: RuneTrapEntity[];
  altar: AltarEntity | null;
  pickups: PickupEntity[];
}

export interface DungeonFloorMap {
  rooms: Record<string, DungeonRoomState>;
  roomOrder: string[];
  currentRoomId: string;
  bossRoomId: string;
}

export interface EchoStrikeQueued {
  timer: number;
  x: number;
  z: number;
  facing: number;
  range: number;
  dmg: number;
}

export interface WorldSimState {
  zone: WorldZone;
  dungeonMode: DungeonMode;
  floor: number;
  week: number;
  floorAnomaly: FloorAnomalyId;
  arenaHalfExtent: number;
  roomEntryX: number;
  roomEntryZ: number;
  obstacles: ObstacleDef[];
  player: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    facing: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    potions: number;
    maxPotions: number;
    walkPhase: number;
    lastStepHalf: number;
    jumpTimer: number;
    jumpCooldown: number;
    jumpCharges: number;
    maxJumpCharges: number;
    jumpRechargeTimer: number;
    dodgeTimer: number;
    dodgeCooldown: number;
    dodgeCharges: number;
    maxDodgeCharges: number;
    dodgeRechargeTimer: number;
    blocking: boolean;
    parryWindowTimer: number;
    aegisShieldHits: number;
    aegisShieldTimer: number;
    invulnTimer: number;
    attackCooldown: number;
    attackAnimTimer: number;
    comboStep: number;
    comboResetTimer: number;
    specialCooldown: number;
    specialAnimTimer: number;
    abilityCooldowns: Record<AbilityId, number>;
    activeAbilityId: AbilityId | null;
    squashX: number;
    squashY: number;
    hitFlashTimer: number;
    chainLightningReady: boolean;
    chargeTimer: number;
    chargeReady: boolean;
    attackKind: 'combo' | 'charged' | 'slam' | 'special';
    slamPending: boolean;
    comboStreak: number;
    comboStreakTimer: number;
    counterTimer: number;
  };
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  slashWaves: SlashWaveEntity[];
  chests: ChestEntity[];
  destructibles: DestructibleEntity[];
  echoQueue: EchoStrikeQueued[];
  runeTraps: RuneTrapEntity[];
  altar: AltarEntity | null;
  pickups: PickupEntity[];
  npcs: CourtyardNpc[];
  exitPortalOpen: boolean;
  exitPortalX: number;
  exitPortalZ: number;
  marauderTimer: number;
  marauderSpawned: boolean;
  hitstopTimer: number;
  trauma: number;
  nearbyInteract: InteractSpotId | null;
  uidCounter: number;
  distanceMoved: number;
  killsThisRun: number;
  boonKillCounter: number;
  activeBoons: BoonId[];
  doorTransitionCooldown: number;
  currentRoomId: string;
  floorMap: DungeonFloorMap | null;
  shrineDmgMult: number;
  shrineCritBonus: number;
  propsSmashedTotal: number;
  familiarCooldown: number;
  familiarAngle: number;
  mods: Required<RunModifiers>;
}

const DEFAULT_MODS: Required<RunModifiers> = {
  maxJumpCharges: 1,
  jumpCooldownMult: 1,
  specialDmgMult: 1,
  specialCooldownMult: 1,
  bountyEra: 'astral',
  secretKeyGranted: false,
  pawnDmgBuff: false,
  beltSpeedMult: 1,
  beltSpecialCdMult: 1,
  beltFloorHeal: 0,
  beltAbyssPoison: false,
  beltDmgMult: 1,
  anomalyOverride: 'none',
  pactEnemyHpMult: 1,
  pactEnemySpeedMult: 1,
  pactMarauderMult: 1,
  weaponDmgMult: 1,
  charterDmgMult: 1,
  pactBonusRarity: false,
  revealMap: false,
  supplyDmgMult: 1,
  supplyCritBonus: 0,
  extraChest: false,
  bonusElite: false,
  goldDropMult: 1,
  eventMarauderMult: 1,
  familiarId: 'none',
  riftTier: 1,
};

const COURTYARD_OBSTACLES: ObstacleDef[] = [
  { id: 'gate_l', x: -1.85, z: -6.1, radius: 0.9 },
  { id: 'gate_r', x: 1.85, z: -6.1, radius: 0.9 },
  { id: 'shop_booth', x: -5.4, z: 0.4, radius: 1.8 },
  { id: 'fountain', x: -2.1, z: -2.5, radius: 1.15 },
  { id: 'forge_anvil', x: 5.5, z: -1.4, radius: 1.2 },
  { id: 'alchemy_cart', x: 5.1, z: 3.4, radius: 1.15 },
  { id: 'rift_obelisk', x: -5.2, z: 5.2, radius: 1.05 },
];

export function createCourtyardSim(
  maxHp: number,
  maxPotions: number,
  rand: () => number,
  mods?: RunModifiers,
): WorldSimState {
  const mergedMods: Required<RunModifiers> = { ...DEFAULT_MODS, ...mods };
  return {
    zone: 'courtyard',
    dungeonMode: 'gate',
    floor: 0,
    week: 1,
    floorAnomaly: 'none',
    arenaHalfExtent: 8.8,
    roomEntryX: 0,
    roomEntryZ: 3.6,
    obstacles: COURTYARD_OBSTACLES,
    player: {
      x: 0,
      y: 0,
      z: 3.6,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: Math.PI,
      hp: maxHp,
      maxHp,
      mana: 100,
      maxMana: 100,
      potions: maxPotions,
      maxPotions,
      walkPhase: 0,
      lastStepHalf: 0,
      jumpTimer: 0,
      jumpCooldown: 0,
      jumpCharges: mergedMods.maxJumpCharges,
      maxJumpCharges: mergedMods.maxJumpCharges,
      jumpRechargeTimer: 0,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      dodgeCharges: 2,
      maxDodgeCharges: 2,
      dodgeRechargeTimer: 0,
      blocking: false,
      parryWindowTimer: 0,
      aegisShieldHits: 0,
      aegisShieldTimer: 0,
      invulnTimer: 0,
      attackCooldown: 0,
      attackAnimTimer: 0,
      comboStep: 0,
      comboResetTimer: 0,
      specialCooldown: 0,
      specialAnimTimer: 0,
      abilityCooldowns: createInitialAbilityCooldowns(),
      activeAbilityId: null,
      squashX: 1,
      squashY: 1,
      hitFlashTimer: 0,
      chainLightningReady: false,
      chargeTimer: 0,
      chargeReady: false,
      attackKind: 'combo',
      slamPending: false,
      comboStreak: 0,
      comboStreakTimer: 0,
      counterTimer: 0,
    },
    enemies: [],
    projectiles: [],
    slashWaves: [],
    chests: [],
    destructibles: [],
    echoQueue: [],
    runeTraps: [],
    altar: null,
    pickups: [],
    familiarCooldown: 0.6,
    familiarAngle: 0,
    npcs: [
      {
        id: 'npc_bram',
        role: 'blacksmith',
        name: 'Bram',
        x: 4.3,
        z: -1.2,
        homeX: 4.3,
        homeZ: -1.2,
        targetX: 4.3,
        targetZ: -1.2,
        facing: -Math.PI * 0.4,
        walkPhase: 0,
        waitTimer: 2,
        color: '#C86446',
      },
      {
        id: 'npc_cleo',
        role: 'alchemist',
        name: 'Cleo',
        x: 4.0,
        z: 3.1,
        homeX: 4.0,
        homeZ: 3.1,
        targetX: 4.0,
        targetZ: 3.1,
        facing: -Math.PI * 0.65,
        walkPhase: 0,
        waitTimer: 2,
        color: '#2EC4B6',
      },
      {
        id: 'npc_mira',
        role: 'customer',
        name: 'Mira',
        x: -2.7,
        z: 1.5,
        homeX: -2.7,
        homeZ: 1.5,
        targetX: -2.2 + rand() * 1.5,
        targetZ: 2.2,
        facing: -0.6,
        walkPhase: 0,
        waitTimer: 1.4,
        color: '#F4B942',
        thoughtHint: `Seeking ${mergedMods.bountyEra.toUpperCase()}`,
      },
      {
        id: 'npc_vesper',
        role: 'customer',
        name: 'Vesper',
        x: 1.7,
        z: -2.0,
        homeX: 1.7,
        homeZ: -2.0,
        targetX: 0.35,
        targetZ: -1.6,
        facing: -0.6,
        walkPhase: 0,
        waitTimer: 1.8,
        color: '#233D63',
        thoughtHint: 'Pair 2× Same Era!',
      },
      {
        id: 'npc_night_guest',
        role: 'night_guest',
        name: 'Shade Broker',
        x: 2.4,
        z: -4.2,
        homeX: 2.4,
        homeZ: -4.2,
        targetX: 2.4,
        targetZ: -4.2,
        facing: -0.5,
        walkPhase: 0,
        waitTimer: 3,
        color: '#7C3AED',
        thoughtHint: 'Cursed Relics 1.75×',
      },
    ],
    exitPortalOpen: false,
    exitPortalX: 0,
    exitPortalZ: -5.2,
    marauderTimer: 999,
    marauderSpawned: false,
    hitstopTimer: 0,
    trauma: 0,
    nearbyInteract: null,
    uidCounter: 1,
    distanceMoved: 0,
    killsThisRun: 0,
    boonKillCounter: 0,
    activeBoons: [],
    doorTransitionCooldown: 0,
    currentRoomId: 'courtyard',
    floorMap: null,
    shrineDmgMult: 1,
    shrineCritBonus: 0,
    propsSmashedTotal: 0,
    mods: mergedMods,
  };
}

export type ShrineChoiceId = 'gild' | 'blood' | 'mend';

export interface ShrineResolution {
  applied: boolean;
  gilded: boolean;
  goldGained: number;
  healed: boolean;
}

export function applyShrineChoice(sim: WorldSimState, choice: ShrineChoiceId): ShrineResolution {
  if (!sim.altar || sim.altar.used) {
    return { applied: false, gilded: false, goldGained: 0, healed: false };
  }
  const p = sim.player;
  if (choice === 'gild') {
    sim.altar.used = true;
    if (p.maxHp > 2) {
      p.maxHp -= 1;
      p.hp = Math.min(p.hp, p.maxHp);
    } else {
      sim.marauderTimer = Math.max(8, sim.marauderTimer - 25);
    }
    sim.trauma = Math.min(1, sim.trauma + 0.45);
    return { applied: true, gilded: true, goldGained: 0, healed: false };
  }
  if (choice === 'blood') {
    if (p.hp <= 1) return { applied: false, gilded: false, goldGained: 0, healed: false };
    sim.altar.used = true;
    p.hp -= 1;
    sim.shrineDmgMult = Number((sim.shrineDmgMult + 0.2).toFixed(2));
    sim.shrineCritBonus = Number((sim.shrineCritBonus + 0.12).toFixed(2));
    sim.trauma = Math.min(1, sim.trauma + 0.35);
    return { applied: true, gilded: false, goldGained: 65, healed: false };
  }
  sim.altar.used = true;
  p.hp = Math.min(p.maxHp, p.hp + 2);
  p.potions = Math.min(p.maxPotions, p.potions + 1);
  return { applied: true, gilded: false, goldGained: 0, healed: true };
}

export function applyBoonToSim(sim: WorldSimState, boonId: BoonId): void {
  if (!sim.activeBoons.includes(boonId)) {
    sim.activeBoons = [...sim.activeBoons, boonId];
  }
  if (boonId === 'aegis_vitality') {
    sim.player.maxHp += 1;
    sim.player.hp = Math.min(sim.player.maxHp, sim.player.hp + 1);
    sim.player.maxPotions += 1;
    sim.player.potions = Math.min(sim.player.maxPotions, sim.player.potions + 1);
  }
}

const DOOR_DELTAS: Record<DoorDir, { dx: number; dy: number; opp: DoorDir }> = {
  N: { dx: 0, dy: -1, opp: 'S' },
  S: { dx: 0, dy: 1, opp: 'N' },
  E: { dx: 1, dy: 0, opp: 'W' },
  W: { dx: -1, dy: 0, opp: 'E' },
};

export const DOOR_POSITIONS: Record<DoorDir, { x: number; z: number; spawnX: number; spawnZ: number; facing: number }> = {
  N: { x: 0, z: -19.3, spawnX: 0, spawnZ: -16.4, facing: 0 },
  S: { x: 0, z: 19.3, spawnX: 0, spawnZ: 16.4, facing: Math.PI },
  E: { x: 19.3, z: 0, spawnX: 16.4, spawnZ: 0, facing: -Math.PI / 2 },
  W: { x: -19.3, z: 0, spawnX: -16.4, spawnZ: 0, facing: Math.PI / 2 },
};

export interface CameraRelativeMoveResult {
  mx: number;
  mz: number;
  isBackpedal: boolean;
  hasInput: boolean;
}

export function computeCameraRelativeMove(
  moveX: number,
  moveZ: number,
  cameraYaw: number,
  bothMouseHeld = false,
): CameraRelativeMoveResult {
  let rawX = moveX;
  let rawZ = bothMouseHeld ? -1 : moveZ;
  const lenSq = rawX * rawX + rawZ * rawZ;
  if (lenSq <= 1e-5) {
    return { mx: 0, mz: 0, isBackpedal: false, hasInput: false };
  }
  if (lenSq > 1) {
    const inv = 1 / Math.sqrt(lenSq);
    rawX *= inv;
    rawZ *= inv;
  }
  const isBackpedal = rawZ > 0.25 && Math.abs(rawX) < 0.85 && !bothMouseHeld;
  // Camera sits at (+sin(yaw)*dist, y, +cos(yaw)*dist), so screen-forward (-Z input) = (-sin(yaw), -cos(yaw)),
  // and screen-right (+X input) = (+cos(yaw), -sin(yaw)).
  const fwdX = -Math.sin(cameraYaw);
  const fwdZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);
  const fwdAmount = -rawZ;
  return {
    mx: rawX * rightX + fwdAmount * fwdX,
    mz: rawX * rightZ + fwdAmount * fwdZ,
    isBackpedal,
    hasInput: true,
  };
}

export function initializeRoomEnemyAggro(
  enemies: EnemyEntity[],
  entryX: number,
  entryZ: number,
  arenaHalfExtent: number,
): void {
  const quarterRoom = arenaHalfExtent * 0.5;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.state === 'ko' || e.kind === 'marauder') {
      e.aggroed = true;
      continue;
    }
    const distFromEntry = Math.hypot(e.x - entryX, e.z - entryZ);
    if (distFromEntry > quarterRoom) {
      e.aggroed = false;
      e.state = 'idle';
      e.patrolOriginX = e.x;
      e.patrolOriginZ = e.z;
      e.patrolAngle = (i * 2.17) % (Math.PI * 2);
    } else {
      e.aggroed = true;
      if (e.state === 'idle') e.state = 'chase';
    }
  }
}

export function cycleTargetEnemyId(
  enemies: EnemyEntity[],
  playerX: number,
  playerZ: number,
  currentTargetId: string | null,
): string | null {
  const living = enemies.filter((e) => e.state !== 'ko');
  if (living.length === 0) return null;
  living.sort((a, b) => {
    const da = (a.x - playerX) * (a.x - playerX) + (a.z - playerZ) * (a.z - playerZ);
    const db = (b.x - playerX) * (b.x - playerX) + (b.z - playerZ) * (b.z - playerZ);
    if (Math.abs(da - db) > 1e-6) return da - db;
    return a.id.localeCompare(b.id);
  });
  if (!currentTargetId) return living[0].id;
  const idx = living.findIndex((e) => e.id === currentTargetId);
  if (idx === -1) return living[0].id;
  return living[(idx + 1) % living.length].id;
}

export function getEndlessScale(week: number): number {
  return week > 4 ? 1 + (week - 4) * 0.12 : 1;
}

function createEnemyInstance(
  id: string,
  kind: EnemyKind,
  x: number,
  z: number,
  week: number,
  floor: number,
  difficulty: DifficultyPreset,
  bloodSpeedMult: number,
  rand: () => number,
  isSubBoss = false,
  hpScale = 1,
  speedScale = 1,
  eliteAffix?: EliteAffix,
): EnemyEntity {
  if (kind === 'boss') {
    const bossDef = getBossForWeek(week);
    const scaleMult = isSubBoss ? 0.52 + floor * 0.1 : 1.0 + Math.max(0, week - 1) * 0.18;
    const hp = Math.round(bossDef.baseHp * scaleMult * difficulty.enemyHpMult * hpScale);
    return {
      id,
      kind: 'boss',
      x,
      y: 0,
      z,
      vx: 0,
      vz: 0,
      facing: 0,
      hp,
      maxHp: hp,
      radius: isSubBoss ? 0.85 : 1.02,
      speed: bossDef.speed * (isSubBoss ? 0.92 : 1.0) * bloodSpeedMult * speedScale,
      damage: Math.max(1, Math.round(bossDef.damage * difficulty.enemyDmgMult)),
      state: 'chase',
      stateTimer: 0.9,
      windupDuration: bossDef.windupDuration * difficulty.telegraphMult,
      attackRange: bossDef.attackRange,
      hitFlashTimer: 0,
      walkPhase: 0,
      dealtHitThisSwing: false,
      koTimer: 0,
      bossId: bossDef.id,
      bossNameKey: bossDef.nameKey,
      bossTitleKey: bossDef.titleKey,
      bossPhase: 1,
      bossPattern: bossDef.pattern,
      isSubBoss,
    };
  }
  const isElite = Boolean(eliteAffix);
  const hpBase =
    kind === 'sentinel'
      ? 85 + week * 16 + floor * 8
      : kind === 'caster'
        ? 56 + week * 12 + floor * 6
        : 52 + week * 10 + floor * 5;
  const eliteHpMult = isElite ? 1.55 : 1.0;
  const eliteSpdMult = eliteAffix === 'swift' ? 1.32 : isElite ? 1.12 : 1.0;
  const hp = Math.round(hpBase * difficulty.enemyHpMult * hpScale * eliteHpMult);
  return {
    id,
    kind,
    x,
    y: 0,
    z,
    vx: 0,
    vz: 0,
    facing: 0,
    hp,
    maxHp: hp,
    radius: (kind === 'sentinel' ? 0.65 : 0.5) * (isElite ? 1.16 : 1.0),
    speed:
      (kind === 'slime' ? 3.2 : kind === 'sentinel' ? 2.0 : 2.15) *
      bloodSpeedMult *
      speedScale *
      eliteSpdMult,
    damage: Math.max(1, Math.round(1 * difficulty.enemyDmgMult)),
    state: 'chase',
    stateTimer: 0.7 + rand() * 0.7,
    windupDuration:
      (kind === 'sentinel' ? 0.68 : 0.55) *
      difficulty.telegraphMult *
      (eliteAffix === 'swift' ? 0.8 : 1.0),
    attackRange: kind === 'caster' ? 6.8 : kind === 'sentinel' ? 2.15 : 1.75,
    hitFlashTimer: 0,
    walkPhase: rand() * Math.PI * 2,
    dealtHitThisSwing: false,
    koTimer: 0,
    isElite,
    eliteAffix,
  };
}

export function generateDungeonFloorMap(
  floor: number,
  week: number,
  difficulty: DifficultyPreset,
  relicPool: RelicTemplate[],
  rand: () => number,
  mergedMods: Required<RunModifiers>,
  bloodSpeedMult: number,
  uidStart: number,
  mode: DungeonMode = 'gate',
): { map: DungeonFloorMap; nextUid: number } {
  let uidCounter = uidStart;
  const targetCount = mode === 'rift' ? 4 : floor === 1 ? 5 : floor === 2 ? 6 : 7;
  const coordKey = (gx: number, gy: number) => `${gx},${gy}`;

  interface DraftNode {
    id: string;
    gx: number;
    gy: number;
    dist: number;
    neighbors: Partial<Record<DoorDir, string>>;
  }

  const grid = new Map<string, DraftNode>();
  const nodes: DraftNode[] = [];
  const startNode: DraftNode = { id: 'r_0_0', gx: 0, gy: 0, dist: 0, neighbors: {} };
  grid.set(coordKey(0, 0), startNode);
  nodes.push(startNode);

  if (mode === 'rift') {
    const chain: { id: string; gx: number; gy: number; dist: number; from: DraftNode; dir: DoorDir }[] = [];
    const rCombat: DraftNode = { id: 'r_0_-1', gx: 0, gy: -1, dist: 1, neighbors: {} };
    const rTreasure: DraftNode = { id: 'r_0_-2', gx: 0, gy: -2, dist: 2, neighbors: {} };
    const rBoss: DraftNode = { id: 'r_0_-3', gx: 0, gy: -3, dist: 3, neighbors: {} };
    chain.push(
      { id: rCombat.id, gx: 0, gy: -1, dist: 1, from: startNode, dir: 'N' },
      { id: rTreasure.id, gx: 0, gy: -2, dist: 2, from: rCombat, dir: 'N' },
      { id: rBoss.id, gx: 0, gy: -3, dist: 3, from: rTreasure, dir: 'N' },
    );
    const created = [rCombat, rTreasure, rBoss];
    for (let i = 0; i < chain.length; i++) {
      const c = chain[i];
      const n = created[i];
      c.from.neighbors[c.dir] = n.id;
      n.neighbors[DOOR_DELTAS[c.dir].opp] = c.from.id;
      grid.set(coordKey(n.gx, n.gy), n);
      nodes.push(n);
    }
  } else {
    const dirs: DoorDir[] = ['N', 'E', 'W', 'S'];
    let guard = 0;
    while (nodes.length < targetCount && guard < 160) {
      guard += 1;
      const base = nodes[Math.floor(rand() * nodes.length)];
      const dir = dirs[Math.floor(rand() * dirs.length)];
      const delta = DOOR_DELTAS[dir];
      const nx = base.gx + delta.dx;
      const ny = base.gy + delta.dy;
      const k = coordKey(nx, ny);
      if (grid.has(k)) continue;
      const nextNode: DraftNode = {
        id: `r_${nx}_${ny}`,
        gx: nx,
        gy: ny,
        dist: base.dist + 1,
        neighbors: {},
      };
      base.neighbors[dir] = nextNode.id;
      nextNode.neighbors[delta.opp] = base.id;
      grid.set(k, nextNode);
      nodes.push(nextNode);
    }
  }

  // Assign room types deterministically from topology
  const nonStart = nodes.filter((n) => n.id !== startNode.id);
  nonStart.sort((a, b) => b.dist - a.dist);
  const bossNode = nonStart[0] ?? startNode;

  // Pick a dead-end (or second farthest) for treasure, and another for shrine
  const remaining = nonStart.filter((n) => n.id !== bossNode.id);
  const deadEnds = remaining.filter((n) => Object.keys(n.neighbors).length === 1);
  const treasureNode =
    mode === 'rift' ? nodes[2] : (deadEnds[0] ?? remaining[0] ?? null);
  const shrineNode =
    mode === 'rift' ? null : (remaining.find((n) => n.id !== treasureNode?.id) ?? null);

  const rooms: Record<string, DungeonRoomState> = {};
  const roomOrder: string[] = [];
  const kinds: EnemyKind[] = ['slime', 'sentinel', 'caster'];

  for (let idx = 0; idx < nodes.length; idx++) {
    const node = nodes[idx];
    const type: RoomType =
      node.id === startNode.id
        ? 'start'
        : node.id === bossNode.id
          ? 'boss'
          : node.id === treasureNode?.id
            ? 'treasure'
            : node.id === shrineNode?.id
              ? 'shrine'
              : 'combat';

    const roomDoors = (Object.keys(node.neighbors) as DoorDir[]);

    const obstacles: ObstacleDef[] =
      type === 'boss'
        ? [
            { id: `${node.id}_col_nw`, x: -10.4, z: -8.2, radius: 0.95 },
            { id: `${node.id}_col_ne`, x: 10.4, z: -8.2, radius: 0.95 },
            { id: `${node.id}_col_sw`, x: -10.4, z: 8.2, radius: 0.95 },
            { id: `${node.id}_col_se`, x: 10.4, z: 8.2, radius: 0.95 },
          ]
        : type === 'combat' && idx % 2 === 1
          ? [
              { id: `${node.id}_ob_l`, x: -7.2, z: 0, radius: 1.0 },
              { id: `${node.id}_ob_r`, x: 7.2, z: 0, radius: 1.0 },
            ]
          : [
              { id: `${node.id}_col_nw`, x: -8.2, z: -6.4, radius: 0.95 },
              { id: `${node.id}_col_ne`, x: 8.2, z: -6.4, radius: 0.95 },
              { id: `${node.id}_col_sw`, x: -8.2, z: 6.4, radius: 0.95 },
              { id: `${node.id}_col_se`, x: 8.2, z: 6.4, radius: 0.95 },
            ];

    const enemies: EnemyEntity[] = [];
    const endlessHp = getEndlessScale(week);
    const endlessSpd = week > 4 ? 1 + (week - 4) * 0.06 : 1;
    const riftScale =
      mode === 'rift'
        ? computeRiftScaling(Math.max(0, (mergedMods.riftTier ?? 1) - 1))
        : null;
    const hpScale =
      mergedMods.pactEnemyHpMult * endlessHp * (riftScale ? riftScale.enemyHpMult : 1);
    const spdScale =
      mergedMods.pactEnemySpeedMult * endlessSpd * (riftScale ? riftScale.enemySpeedMult : 1);
    if (type === 'start') {
      const startCoords: [number, number][] = [
        [0, -10.4],
        [-10.8, -2.5],
        [10.8, -2.5],
      ];
      for (let i = 0; i < 3; i++) {
        const knd = kinds[i % kinds.length];
        const [sx, sz] = startCoords[i];
        enemies.push(
          createEnemyInstance(
            `${node.id}_e_${i}`,
            knd,
            sx + (rand() - 0.5) * 0.4,
            sz + (rand() - 0.5) * 0.4,
            week,
            floor,
            difficulty,
            bloodSpeedMult,
            rand,
            false,
            hpScale,
            spdScale,
          ),
        );
      }
    } else if (type === 'boss') {
      const isSub = mode === 'rift' ? false : floor < 3;
      enemies.push(
        createEnemyInstance(
          `${node.id}_boss`,
          'boss',
          0,
          -4.5,
          week,
          floor,
          difficulty,
          bloodSpeedMult,
          rand,
          isSub,
          hpScale * (mode === 'rift' ? 1.12 : 1.0),
          spdScale,
        ),
      );
      const escortCount = mode === 'rift' || floor === 3 ? 2 : 1;
      for (let i = 0; i < escortCount; i++) {
        const ex = i === 0 ? -8.8 : 8.8;
        enemies.push(
          createEnemyInstance(
            `${node.id}_esc_${i}`,
            i === 0 ? 'slime' : 'caster',
            ex,
            -5.2,
            week,
            floor,
            difficulty,
            bloodSpeedMult,
            rand,
            false,
            hpScale,
            spdScale,
          ),
        );
      }
    } else {
      const eliteEligible =
        mode === 'rift' ||
        mergedMods.bonusElite ||
        floor >= 2 ||
        week >= 2 ||
        mergedMods.pactEnemyHpMult > 1 ||
        mergedMods.pactEnemySpeedMult > 1;
      const affixes: EliteAffix[] = ['volatile', 'swift', 'bulwark'];
      const roomAffix = affixes[(idx + floor + week) % affixes.length];
      if (type === 'treasure') {
        enemies.push(
          createEnemyInstance(
            `${node.id}_e_0`,
            'sentinel',
            0,
            -5.5,
            week,
            floor,
            difficulty,
            bloodSpeedMult,
            rand,
            false,
            hpScale,
            spdScale,
            eliteEligible ? roomAffix : undefined,
          ),
          createEnemyInstance(`${node.id}_e_1`, 'caster', 6.8, -4.2, week, floor, difficulty, bloodSpeedMult, rand, false, hpScale, spdScale),
        );
      } else if (type === 'shrine') {
        enemies.push(
          createEnemyInstance(`${node.id}_e_0`, 'sentinel', 0, -3.6, week, floor, difficulty, bloodSpeedMult, rand, false, hpScale, spdScale),
        );
      } else {
        const cnt = mode === 'rift' ? 4 : 3 + (floor >= 2 ? 1 : 0);
        const cCoords: [number, number][] = [
          [0, -8.8],
          [-9.8, 0.5],
          [9.8, 0.5],
          [0, 5.2],
        ];
        for (let i = 0; i < cnt; i++) {
          const [cx, cz] = cCoords[i % cCoords.length];
          enemies.push(
            createEnemyInstance(
              `${node.id}_e_${i}`,
              kinds[(i + idx) % kinds.length],
              cx + (rand() - 0.5) * 0.6,
              cz + (rand() - 0.5) * 0.6,
              week,
              floor,
              difficulty,
              bloodSpeedMult,
              rand,
              false,
              hpScale,
              spdScale,
              eliteEligible && i === 0 ? roomAffix : undefined,
            ),
          );
        }
      }
    }

    const chests: ChestEntity[] = [];
    if (type === 'start') {
      const mimicOnSecond = (mode === 'rift' || floor >= 2) && rand() < 0.65;
      chests.push(
        { id: `${node.id}_ch_1`, x: -14.2, z: -12.4, opened: false },
        { id: `${node.id}_ch_2`, x: 14.2, z: -12.4, opened: false, isMimic: mimicOnSecond },
      );
      if (mergedMods.secretKeyGranted) {
        chests.push({ id: `${node.id}_ch_secret`, x: -14.2, z: 12.2, opened: false, isSecret: true });
      }
      if (mergedMods.extraChest) {
        chests.push({ id: `${node.id}_ch_event`, x: 14.2, z: 12.2, opened: false });
      }
    } else if (type === 'treasure') {
      chests.push(
        { id: `${node.id}_ch_1`, x: -4.4, z: -9.2, opened: false },
        { id: `${node.id}_ch_2`, x: 4.4, z: -9.2, opened: false, isSecret: mode === 'rift' || floor >= 2 },
      );
    } else if (type === 'combat' && idx % 2 === 0) {
      chests.push({
        id: `${node.id}_ch_1`,
        x: 12.4,
        z: -11.4,
        opened: false,
        isMimic: (mode === 'rift' || floor >= 2) && rand() < 0.45,
      });
    }

    const destructibles: DestructibleEntity[] =
      type === 'start'
        ? [
            { id: `${node.id}_d1`, kind: 'urn', x: -14.5, z: 5.2, broken: false },
            { id: `${node.id}_d2`, kind: 'crystal', x: 14.5, z: 5.2, broken: false },
            { id: `${node.id}_d3`, kind: 'urn', x: -11.2, z: 13.4, broken: false },
            { id: `${node.id}_d4`, kind: 'crystal', x: 11.2, z: 13.4, broken: false },
          ]
        : [
            { id: `${node.id}_d1`, kind: 'urn', x: -13.2, z: -10.2, broken: false },
            { id: `${node.id}_d2`, kind: 'crystal', x: 13.2, z: 10.2, broken: false },
          ];

    const runeTraps: RuneTrapEntity[] =
      type === 'start' || type === 'combat'
        ? [
            { id: `${node.id}_tw`, x: -5.6, z: -2.4, radius: 1.1, cooldown: 0 },
            { id: `${node.id}_te`, x: 5.6, z: -2.4, radius: 1.1, cooldown: 0 },
          ]
        : [];

    const altar: AltarEntity | null =
      (type === 'start' && floor === 2) || (type === 'shrine' && floor !== 2)
        ? { x: 0, z: -8.5, used: false }
        : null;

    const pickups: PickupEntity[] = [];
    if (type === 'start') {
      const sampleRelic = relicPool[Math.floor(rand() * relicPool.length)];
      const uid = `rel_${++uidCounter}`;
      pickups.push({
        id: uid,
        x: 0,
        y: 0.35,
        z: 10.2,
        item: createRelicInstance(sampleRelic, uid, false),
        age: 0,
      });
    }

    rooms[node.id] = {
      id: node.id,
      gx: node.gx,
      gy: node.gy,
      type,
      doors: roomDoors,
      neighbors: node.neighbors,
      visited: mergedMods.revealMap || node.id === startNode.id,
      cleared: false,
      boonOfferEligible: type === 'start' || type === 'shrine',
      boonOffered: false,
      hasExitPortal: type === 'boss',
      obstacles,
      enemies,
      chests,
      destructibles,
      runeTraps,
      altar,
      pickups,
    };
    roomOrder.push(node.id);
  }

  return {
    map: {
      rooms,
      roomOrder,
      currentRoomId: startNode.id,
      bossRoomId: bossNode.id,
    },
    nextUid: uidCounter,
  };
}

export function transitionDungeonRoom(
  sim: WorldSimState,
  dir: DoorDir,
): boolean {
  if (!sim.floorMap) return false;
  const curRoom = sim.floorMap.rooms[sim.currentRoomId];
  if (!curRoom || !curRoom.cleared) return false;
  const nextId = curRoom.neighbors[dir];
  if (!nextId) return false;
  const nextRoom = sim.floorMap.rooms[nextId];
  if (!nextRoom) return false;

  // Save current room state
  curRoom.enemies = sim.enemies.filter((e) => e.state !== 'ko' && e.kind !== 'marauder');
  curRoom.chests = sim.chests;
  curRoom.destructibles = sim.destructibles;
  curRoom.runeTraps = sim.runeTraps;
  curRoom.altar = sim.altar;
  curRoom.pickups = sim.pickups;

  // Switch active room
  nextRoom.visited = true;
  sim.floorMap.currentRoomId = nextRoom.id;
  sim.currentRoomId = nextRoom.id;
  sim.obstacles = nextRoom.obstacles;
  sim.enemies = nextRoom.enemies;
  sim.chests = nextRoom.chests;
  sim.destructibles = nextRoom.destructibles;
  sim.runeTraps = nextRoom.runeTraps;
  sim.altar = nextRoom.altar;
  sim.pickups = nextRoom.pickups;
  sim.projectiles = [];
  sim.slashWaves = [];
  sim.echoQueue = [];
  sim.nearbyInteract = null;
  sim.exitPortalOpen = nextRoom.hasExitPortal && nextRoom.cleared;
  sim.exitPortalX = 0;
  sim.exitPortalZ = -11.5;

  const opp = DOOR_DELTAS[dir].opp;
  const entry = DOOR_POSITIONS[opp];
  sim.roomEntryX = entry.spawnX;
  sim.roomEntryZ = entry.spawnZ;
  sim.player.x = entry.spawnX;
  sim.player.y = 0;
  sim.player.z = entry.spawnZ;
  sim.player.vx = 0;
  sim.player.vz = 0;
  sim.player.facing = entry.facing;
  sim.player.invulnTimer = 0.65;
  sim.doorTransitionCooldown = 0.65;
  initializeRoomEnemyAggro(sim.enemies, entry.spawnX, entry.spawnZ, sim.arenaHalfExtent);

  return true;
}

export function enterDungeonFloor(
  prev: WorldSimState,
  floor: number,
  week: number,
  difficulty: DifficultyPreset,
  relicPool: RelicTemplate[],
  rand: () => number,
  modsOverride?: RunModifiers,
  mode: DungeonMode = 'gate',
): WorldSimState {
  const half = 20.5;
  const mergedMods: Required<RunModifiers> = { ...prev.mods, ...modsOverride };

  const anomalies: FloorAnomalyId[] = ['blood_moon', 'mirror_echo', 'low_gravity'];
  const floorAnomaly: FloorAnomalyId =
    mergedMods.anomalyOverride && mergedMods.anomalyOverride !== 'none'
      ? mergedMods.anomalyOverride
      : mode === 'rift' || floor >= 2
        ? anomalies[Math.floor(rand() * anomalies.length)]
        : 'none';
  const bloodSpeedMult = floorAnomaly === 'blood_moon' ? 1.18 : 1.0;

  const { map, nextUid } = generateDungeonFloorMap(
    floor,
    week,
    difficulty,
    relicPool,
    rand,
    mergedMods,
    bloodSpeedMult,
    prev.uidCounter + 1,
    mode,
  );
  const startRoom = map.rooms[map.currentRoomId];
  const entryX = 0;
  const entryZ = 16.4;
  initializeRoomEnemyAggro(startRoom.enemies, entryX, entryZ, half);
  const descendHeal = floor > 1 ? mergedMods.beltFloorHeal : 0;

  return {
    ...prev,
    zone: 'dungeon',
    dungeonMode: mode,
    floor,
    week,
    floorAnomaly,
    arenaHalfExtent: half,
    roomEntryX: entryX,
    roomEntryZ: entryZ,
    obstacles: startRoom.obstacles,
    player: {
      ...prev.player,
      hp: Math.min(prev.player.maxHp, prev.player.hp + descendHeal),
      mana: prev.player.maxMana,
      x: entryX,
      y: 0,
      z: entryZ,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: Math.PI,
      jumpTimer: 0,
      jumpCharges: mergedMods.maxJumpCharges,
      maxJumpCharges: mergedMods.maxJumpCharges,
      jumpRechargeTimer: 0,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      dodgeCharges: 2,
      maxDodgeCharges: 2,
      dodgeRechargeTimer: 0,
      blocking: false,
      parryWindowTimer: 0,
      aegisShieldHits: 0,
      aegisShieldTimer: 0,
      attackCooldown: 0,
      specialCooldown: 0,
      abilityCooldowns: createInitialAbilityCooldowns(),
      activeAbilityId: null,
      invulnTimer: 0.6,
      chargeTimer: 0,
      chargeReady: false,
      attackKind: 'combo',
      slamPending: false,
      comboStreak: 0,
      comboStreakTimer: 0,
      counterTimer: 0,
    },
    enemies: startRoom.enemies,
    projectiles: [],
    slashWaves: [],
    chests: startRoom.chests,
    destructibles: startRoom.destructibles,
    echoQueue: [],
    runeTraps: startRoom.runeTraps,
    altar: startRoom.altar,
    pickups: startRoom.pickups,
    npcs: [],
    exitPortalOpen: false,
    exitPortalX: 0,
    exitPortalZ: -11.5,
    marauderTimer: Math.max(
      25,
      Math.round(
        difficulty.marauderTime *
          mergedMods.pactMarauderMult *
          mergedMods.eventMarauderMult *
          (mode === 'rift' ? 0.78 : 1.0),
      ),
    ),
    marauderSpawned: false,
    hitstopTimer: 0,
    trauma: 0,
    nearbyInteract: null,
    uidCounter: nextUid + 1,
    doorTransitionCooldown: 0.65,
    currentRoomId: startRoom.id,
    floorMap: map,
    familiarCooldown: 0.6,
    familiarAngle: prev.familiarAngle ?? 0,
    mods: mergedMods,
  };
}

function normalizeAngleDelta(target: number, current: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function pushOutFromObstacles(
  ent: { x: number; z: number },
  radius: number,
  obstacles: ObstacleDef[],
  limit: number,
): void {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const dx = ent.x - o.x;
    const dz = ent.z - o.z;
    const minDist = radius + o.radius;
    const dSq = dx * dx + dz * dz;
    if (dSq < minDist * minDist) {
      const d = Math.sqrt(dSq);
      if (d > 1e-5) {
        ent.x += (dx / d) * (minDist - d);
        ent.z += (dz / d) * (minDist - d);
      } else {
        ent.z += minDist;
      }
    }
  }
  if (ent.x < -limit) ent.x = -limit;
  else if (ent.x > limit) ent.x = limit;
  if (ent.z < -limit) ent.z = -limit;
  else if (ent.z > limit) ent.z = limit;
}

export function stepWorldSim(
  sim: WorldSimState,
  input: SimStepInput,
  weapon: WeaponDef,
  skillMult: number,
  difficulty: DifficultyPreset,
  relicPool: RelicTemplate[],
  rand: () => number,
  dt: number,
  out: SimEvents,
): void {
  out.swungCombo = -1;
  out.jumped = false;
  out.specialUsed = false;
  out.enemyHit = false;
  out.enemyKilled = false;
  out.appraisalTriggered = false;
  out.playerHurt = false;
  out.healed = false;
  out.pickedUpItem = null;
  out.chestOpened = false;
  out.marauderSpawned = false;
  out.interactTarget = null;
  out.playerDied = false;
  out.stepped = false;
  out.deflected = false;
  out.trapTriggered = null;
  out.altarActivated = false;
  out.coinsEarned = 0;
  out.crystalCharged = false;
  out.mimicAwakened = false;
  out.mimicStunned = false;
  out.finisherCombo = false;
  out.echoTriggered = false;
  out.roomCleared = false;
  out.roomTransition = null;
  out.boonOffered = false;
  out.bossPhase2 = false;
  out.emberVaultBlast = false;
  out.propsSmashed = 0;
  out.killedBossId = null;
  out.killedEliteCount = 0;
  out.volatileBlast = null;
  out.parryTriggered = false;
  out.chargedStrike = false;
  out.chargeBecameReady = false;
  out.slamLanded = false;
  out.waveLaunched = false;
  out.dodged = false;
  out.riposteTriggered = false;
  out.blocked = false;
  out.parried = false;
  out.abilityCast = null;
  out.ignisCone = null;
  out.frostNova = null;
  out.aegisBurst = false;
  if (out.impactPoints) out.impactPoints.length = 0;
  else out.impactPoints = [];
  if (out.elementalReactions) out.elementalReactions.length = 0;
  else out.elementalReactions = [];
  if (out.smashedProps) out.smashedProps.length = 0;
  else out.smashedProps = [];
  out.familiarBlast = null;
  if (out.killedEnemyTypes) out.killedEnemyTypes.length = 0;
  else out.killedEnemyTypes = [];
  if (out.lightningArcs) out.lightningArcs.length = 0;
  if (out.hitPopups) out.hitPopups.length = 0;

  const famFx = computeFamiliarBonuses(sim.mods.familiarId);
  sim.familiarAngle = (sim.familiarAngle + dt * 2.2) % (Math.PI * 2);

  sim.trauma = Math.max(0, sim.trauma - dt * 1.9);

  if (sim.hitstopTimer > 0) {
    sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
    return;
  }

  const p = sim.player;
  const limit = sim.arenaHalfExtent - 0.75;
  const boonFx = computeBoonEffects(sim.activeBoons);
  const fullHpMult = p.hp >= p.maxHp ? boonFx.fullHpDmgMult : 1.0;
  const effectiveSkillMult =
    skillMult *
    (sim.mods.pawnDmgBuff ? 1.25 : 1.0) *
    sim.mods.beltDmgMult *
    sim.mods.weaponDmgMult *
    sim.mods.charterDmgMult *
    sim.mods.supplyDmgMult *
    sim.shrineDmgMult *
    fullHpMult;
  const totalGoldDropMult =
    boonFx.goldDropMult * sim.mods.goldDropMult * famFx.goldDropMult;
  sim.doorTransitionCooldown = Math.max(0, sim.doorTransitionCooldown - dt);

  // Cooldowns, Mana regen, Dodge charges, Aegis & Ability timers
  if (sim.zone === 'courtyard') {
    p.mana = p.maxMana;
  } else {
    p.mana = Math.min(p.maxMana, p.mana + 7.5 * dt);
  }
  p.jumpCooldown = Math.max(0, p.jumpCooldown - dt);
  if (p.jumpCharges < p.maxJumpCharges) {
    p.jumpRechargeTimer -= dt;
    if (p.jumpRechargeTimer <= 0) {
      p.jumpCharges += 1;
      p.jumpRechargeTimer = 0.75 * sim.mods.jumpCooldownMult;
    }
  }
  p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
  p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
  if (p.dodgeCharges < p.maxDodgeCharges) {
    p.dodgeRechargeTimer -= dt;
    if (p.dodgeRechargeTimer <= 0) {
      p.dodgeCharges += 1;
      p.dodgeRechargeTimer = 1.35 * sim.mods.jumpCooldownMult;
    }
  }
  p.parryWindowTimer = Math.max(0, p.parryWindowTimer - dt);
  if (p.aegisShieldTimer > 0) {
    p.aegisShieldTimer = Math.max(0, p.aegisShieldTimer - dt);
    if (p.aegisShieldTimer <= 0) p.aegisShieldHits = 0;
  }
  for (const aid of ABILITY_ORDER) {
    if (p.abilityCooldowns[aid] > 0) {
      p.abilityCooldowns[aid] = Math.max(0, p.abilityCooldowns[aid] - dt);
    }
  }
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.attackAnimTimer = Math.max(0, p.attackAnimTimer - dt);
  p.comboResetTimer = Math.max(0, p.comboResetTimer - dt);
  p.specialCooldown = Math.max(0, p.specialCooldown - dt);
  p.specialAnimTimer = Math.max(0, p.specialAnimTimer - dt);
  if (p.specialAnimTimer <= 0) p.activeAbilityId = null;
  p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
  if (p.comboResetTimer <= 0) p.comboStep = 0;
  if (p.comboStreakTimer > 0) {
    p.comboStreakTimer = Math.max(0, p.comboStreakTimer - dt);
    if (p.comboStreakTimer <= 0) p.comboStreak = 0;
  }
  p.counterTimer = Math.max(0, (p.counterTimer || 0) - dt);

  if (sim.zone === 'dungeon' && input.attackHeld) {
    const prevReady = p.chargeReady;
    p.chargeTimer = Math.min(0.44, p.chargeTimer + dt);
    if (p.chargeTimer >= 0.36 && !prevReady) {
      p.chargeReady = true;
      out.chargeBecameReady = true;
    }
  } else if (!input.attackHeld && !input.attackReleased) {
    p.chargeTimer = Math.max(0, p.chargeTimer - dt * 3.5);
    if (p.chargeTimer <= 0.05) p.chargeReady = false;
  }

  // Potion heal
  if (input.healPressed && p.potions > 0 && p.hp < p.maxHp) {
    p.potions -= 1;
    p.hp = Math.min(p.maxHp, p.hp + 2);
    p.squashX = 0.88;
    p.squashY = 1.15;
    out.healed = true;
    out.hitPopups?.push({
      x: p.x,
      y: p.y + 1.4,
      z: p.z,
      text: '+2 HP',
      color: '#38E8D8',
      crit: false,
      kind: 'heal',
    });
  }

  // Camera-relative Movement & Strafing (Mouse_rpg)
  const camYaw = input.cameraYaw ?? 0;
  const relMove = computeCameraRelativeMove(
    input.moveX,
    input.moveZ,
    camYaw,
    Boolean(input.bothMouseHeld),
  );
  const mx = relMove.mx;
  const mz = relMove.mz;
  const mLenSq = relMove.hasInput ? 1 : 0;

  const wakeEnemy = (e: EnemyEntity) => {
    e.aggroed = true;
    if (e.state === 'idle') {
      e.state = 'chase';
      e.stateTimer = 0.25;
    }
  };

  // Dodge Roll (Shift) — rapid directional evade with i-frames
  const lowGrav = sim.floorAnomaly === 'low_gravity';
  const canDodge = p.dodgeCharges > 0 && p.dodgeTimer <= 0 && p.dodgeCooldown <= 0;
  if (input.dodgePressed && canDodge) {
    p.dodgeCharges -= 1;
    p.dodgeRechargeTimer = 1.35 * sim.mods.jumpCooldownMult;
    p.dodgeTimer = 0.32;
    p.dodgeCooldown = 0.38;
    p.blocking = false;
    p.invulnTimer = Math.max(p.invulnTimer, 0.36);
    let dx = mx;
    let dz = mz;
    if (dx === 0 && dz === 0) {
      if (input.aimDirX !== null && input.aimDirZ !== null) {
        dx = input.aimDirX;
        dz = input.aimDirZ;
      } else {
        dx = Math.sin(p.facing);
        dz = Math.cos(p.facing);
      }
    }
    p.vx = dx * 14.8;
    p.vz = dz * 14.8;
    p.facing = Math.atan2(dx, dz);
    p.squashX = 1.28;
    p.squashY = 0.72;
    out.dodged = true;
    if (sim.zone === 'dungeon') {
      let perfectEvade = false;
      for (let i = 0; i < sim.enemies.length; i++) {
        const en = sim.enemies[i];
        if (en.state === 'ko') continue;
        if (
          (en.state === 'windup' || en.state === 'attack') &&
          Math.hypot(en.x - p.x, en.z - p.z) <= Math.max(3.8, en.attackRange + 1.1)
        ) {
          perfectEvade = true;
          break;
        }
      }
      if (!perfectEvade) {
        for (let i = 0; i < sim.projectiles.length; i++) {
          const pr = sim.projectiles[i];
          if (!pr.deflected && Math.hypot(pr.x - p.x, pr.z - p.z) <= 2.1) {
            perfectEvade = true;
            break;
          }
        }
      }
      if (perfectEvade) {
        p.counterTimer = 1.9;
        p.mana = Math.min(p.maxMana, p.mana + 12);
        out.riposteTriggered = true;
        sim.hitstopTimer = Math.max(sim.hitstopTimer, 0.04);
        out.hitPopups?.push({
          x: p.x,
          y: p.y + 1.65,
          z: p.z,
          text: '⚡ RIPOSTE! +12 MP',
          color: '#F4B942',
          crit: true,
          kind: 'appraisal',
        });
      }
    }
  }

  // Shield Block & Timed Parry Window (Right-Click / Guard)
  if (sim.zone === 'dungeon') {
    if (input.blockPressed && p.dodgeTimer <= 0) {
      p.parryWindowTimer = 0.28;
    }
    p.blocking =
      Boolean(input.blockHeld) &&
      p.dodgeTimer <= 0 &&
      p.specialAnimTimer <= 0 &&
      p.attackAnimTimer <= 0 &&
      p.y <= 0.12;
    if (p.blocking && input.aimDirX !== null && input.aimDirZ !== null && !input.steerWithCamera) {
      p.facing = Math.atan2(input.aimDirX, input.aimDirZ);
    }
  } else {
    p.blocking = false;
  }

  // Heroic Vertical Jump / Vault (Space)
  const canJump =
    p.jumpCharges > 0 && p.jumpTimer <= 0 && (p.maxJumpCharges > 1 || p.jumpCooldown <= 0);
  if (input.jumpPressed && canJump && p.dodgeTimer <= 0) {
    p.jumpCharges -= 1;
    p.jumpRechargeTimer = 0.75 * sim.mods.jumpCooldownMult;
    p.jumpTimer = 0.34;
    p.jumpCooldown = 0.52 * sim.mods.jumpCooldownMult;
    p.blocking = false;
    p.invulnTimer = Math.max(p.invulnTimer, 0.34);
    p.vy = 7.4 * (lowGrav ? 1.25 : 1.0);
    let dx = mx;
    let dz = mz;
    if (dx !== 0 || dz !== 0) {
      const dashSpeed = 8.4 * (lowGrav ? 1.2 : 1.0);
      p.vx = dx * dashSpeed;
      p.vz = dz * dashSpeed;
      if (!input.steerWithCamera) {
        p.facing = Math.atan2(dx, dz);
      }
    } else if (input.aimDirX !== null && input.aimDirZ !== null) {
      p.facing = Math.atan2(input.aimDirX, input.aimDirZ);
      p.vx = input.aimDirX * 3.4;
      p.vz = input.aimDirZ * 3.4;
    } else {
      p.vx *= 0.45;
      p.vz *= 0.45;
    }
    p.squashX = 0.82;
    p.squashY = 1.24;
    out.jumped = true;

    if (sim.zone === 'dungeon' && boonFx.emberVault) {
      out.emberVaultBlast = true;
      for (const e of sim.enemies) {
        if (e.state === 'ko') continue;
        const edx = e.x - p.x;
        const edz = e.z - p.z;
        const ed = Math.hypot(edx, edz);
        if (ed <= 2.65 + boonFx.emberRadiusBonus + e.radius) {
          const blastDmg = Math.round(24 * effectiveSkillMult * boonFx.emberBlastMult);
          e.hp -= blastDmg;
          e.hitFlashTimer = 0.14;
          wakeEnemy(e);
          if (ed > 0.05) {
            e.vx += (edx / ed) * 4.2;
            e.vz += (edz / ed) * 4.2;
          }
          out.enemyHit = true;
          out.hitPopups?.push({
            x: e.x,
            y: 1.45,
            z: e.z,
            text: `🔥 -${blastDmg}`,
            color: '#FF7B42',
            crit: true,
            kind: 'dmg',
          });
          if (e.hp <= 0) {
            e.hp = 0;
            e.state = 'ko';
            e.koTimer = 0.42;
            out.enemyKilled = true;
            sim.killsThisRun += 1;
            out.killedEnemyTypes?.push(e.kind);
            if (e.kind === 'boss' && e.bossId) out.killedBossId = e.bossId;
          }
        }
      }
    }
  }

  // Vertical jump & Aerial Meteor Plunge Slam physics
  if (p.y > 0 || p.vy > 0) {
    p.vy -= (lowGrav ? 19.5 : 26.0) * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.squashX = p.slamPending ? 1.38 : 1.2;
      p.squashY = p.slamPending ? 0.68 : 0.82;
      if (p.slamPending) {
        p.slamPending = false;
        p.attackKind = 'slam';
        p.specialAnimTimer = 0.28;
        p.attackCooldown = 0.22;
        out.slamLanded = true;
        sim.trauma = Math.min(1, sim.trauma + 0.52);
        sim.hitstopTimer = 0.095;
        const slamRadius = Math.max(2.65, weapon.range * 1.12) * boonFx.rangeMult;
        const slamDmg = Math.round(weapon.damage * 1.45 * effectiveSkillMult * boonFx.primaryDmgMult);
        for (let i = 0; i < sim.destructibles.length; i++) {
          const dest = sim.destructibles[i];
          if (!dest.broken && Math.hypot(dest.x - p.x, dest.z - p.z) <= slamRadius) {
            dest.broken = true;
            out.propsSmashed = (out.propsSmashed ?? 0) + 1;
            out.smashedProps?.push({ x: dest.x, z: dest.z, kind: dest.kind });
            sim.propsSmashedTotal += 1;
          }
        }
        for (let i = 0; i < sim.enemies.length; i++) {
          const e = sim.enemies[i];
          if (e.state === 'ko') continue;
          const dx = e.x - p.x;
          const dz = e.z - p.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= slamRadius + e.radius) {
            e.hp -= slamDmg;
            e.hitFlashTimer = 0.16;
            e.aggroed = true;
            e.state = 'stunned';
            e.stateTimer = Math.max(e.stateTimer, 0.75);
            if (dist > 0.05) {
              e.vx += (dx / dist) * 5.2;
              e.vz += (dz / dist) * 5.2;
            }
            out.enemyHit = true;
            out.impactPoints?.push({ x: e.x, y: 0.9, z: e.z, color: '#F4B942', heavy: true });
            out.hitPopups?.push({
              x: e.x,
              y: e.kind === 'boss' ? 1.9 : 1.45,
              z: e.z,
              text: `☄ SLAM -${slamDmg}!`,
              color: '#F4B942',
              crit: true,
              kind: 'appraisal',
            });
            if (e.hp <= 0) {
              e.hp = 0;
              e.state = 'ko';
              e.koTimer = 0.42;
              out.enemyKilled = true;
              sim.killsThisRun += 1;
              sim.boonKillCounter += 1;
              out.killedEnemyTypes?.push(e.kind);
              if (e.kind === 'boss' && e.bossId) out.killedBossId = e.bossId;
            }
          }
        }
      }
    }
  }

  if (p.dodgeTimer > 0) {
    // Hold momentum during Dodge Roll
    p.vx *= Math.exp(-2.8 * dt);
    p.vz *= Math.exp(-2.8 * dt);
  } else if (p.jumpTimer > 0) {
    p.jumpTimer = Math.max(0, p.jumpTimer - dt);
  } else {
    const blockMult = p.blocking ? 0.48 : 1.0;
    const backpedalMult = relMove.isBackpedal && input.steerWithCamera ? 0.68 : 1.0;
    const moveSpeed = 6.0 * sim.mods.beltSpeedMult * blockMult * backpedalMult;
    const blend = 1 - Math.exp(-24 * dt);
    p.vx += (mx * moveSpeed - p.vx) * blend;
    p.vz += (mz * moveSpeed - p.vz) * blend;
    if (input.steerWithCamera) {
      const camForwardFacing = Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));
      p.facing += normalizeAngleDelta(camForwardFacing, p.facing) * (1 - Math.exp(-18 * dt));
    } else if (mLenSq > 1e-4 && !p.blocking) {
      const targetFacing = Math.atan2(mx, mz);
      p.facing += normalizeAngleDelta(targetFacing, p.facing) * (1 - Math.exp(-15 * dt));
    }
  }

  const prevX = p.x;
  const prevZ = p.z;
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  pushOutFromObstacles(p, 0.5, sim.obstacles, limit);
  const moved = Math.hypot(p.x - prevX, p.z - prevZ);
  sim.distanceMoved += moved;

  if (p.y <= 0.02 && moved > 1e-4) {
    p.walkPhase += moved * 4.6;
    const half = Math.floor(p.walkPhase / Math.PI);
    if (half !== p.lastStepHalf) {
      p.lastStepHalf = half;
      out.stepped = true;
    }
  }

  const relax = 1 - Math.exp(-13 * dt);
  p.squashX += (1 - p.squashX) * relax;
  p.squashY += (1 - p.squashY) * relax;

  let applyIncomingPlayerHit!: (
    dmg: number,
    ax: number,
    az: number,
    attacker?: EnemyEntity,
    proj?: ProjectileEntity,
  ) => boolean;

  const dropRelicFromKill = (
    e: EnemyEntity,
    appraisal: boolean,
  ) => {
    out.enemyKilled = true;
    sim.killsThisRun += 1;
    sim.boonKillCounter += 1;
    out.killedEnemyTypes?.push(e.kind);
    if (e.kind === 'boss' && e.bossId) {
      out.killedBossId = e.bossId;
    }

    if (boonFx.vampireLedger && sim.boonKillCounter % boonFx.vampireEveryNKills === 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      out.healed = true;
      out.hitPopups?.push({
        x: p.x,
        y: p.y + 1.5,
        z: p.z,
        text: '+1 HP 🩸',
        color: '#FF4D6D',
        crit: false,
        kind: 'heal',
      });
    }

    if (boonFx.killGoldBonus > 0) {
      out.coinsEarned = (out.coinsEarned ?? 0) + Math.round(boonFx.killGoldBonus * totalGoldDropMult);
    }

    if (boonFx.gildedGreed && (e.kind === 'boss' || e.kind === 'sentinel' || e.isMimicGuard)) {
      const bonusG = Math.round((e.kind === 'boss' ? 28 : 12) * totalGoldDropMult);
      out.coinsEarned = (out.coinsEarned ?? 0) + bonusG;
      out.hitPopups?.push({
        x: e.x,
        y: 1.6,
        z: e.z,
        text: `+${bonusG}g`,
        color: '#F4B942',
        crit: false,
        kind: 'appraisal',
      });
    }

    if (e.isElite) {
      out.killedEliteCount = (out.killedEliteCount ?? 0) + 1;
      const eliteGold = Math.round(16 * totalGoldDropMult) + famFx.scarabChestGold;
      out.coinsEarned = (out.coinsEarned ?? 0) + eliteGold;
      out.hitPopups?.push({
        x: e.x,
        y: 1.85,
        z: e.z,
        text: famFx.scarabChestGold > 0 ? `👑 ELITE +1◆ +${famFx.scarabChestGold}g` : `👑 ELITE +1◆`,
        color: '#F4B942',
        crit: true,
        kind: 'appraisal',
      });
      if (e.eliteAffix === 'volatile') {
        out.volatileBlast = { x: e.x, z: e.z };
        if (Math.hypot(p.x - e.x, p.z - e.z) <= 2.45) {
          applyIncomingPlayerHit(1, e.x, e.z);
        }
      }
    }

    // Matching Guild Bounty via Appraisal Strike grants a 3× Bounty Seal!
    const bountyMatch =
      appraisal && relicPool.some((r) => r.era === sim.mods.bountyEra);
    const riftRarePool = relicPool.filter(
      (r) => r.rarity >= 2 && (r.era === 'abyss' || r.curse !== 'none'),
    );
    const pool = bountyMatch
      ? relicPool.filter((r) => r.era === sim.mods.bountyEra)
      : sim.dungeonMode === 'rift' && riftRarePool.length > 0 && rand() < 0.45
        ? riftRarePool
        : sim.dungeonMode === 'rift' || e.kind === 'boss' || e.isElite || sim.mods.pactBonusRarity
          ? relicPool.filter((r) => r.rarity >= 2)
          : relicPool;
    const tpl = pool[Math.floor(rand() * pool.length)] ?? relicPool[0];
    const uid = `rel_${++sim.uidCounter}`;
    const bloodPristine = sim.floorAnomaly === 'blood_moon' && rand() < 0.45;
    const riftPristineBonus =
      sim.dungeonMode === 'rift'
        ? computeRiftScaling(Math.max(0, sim.mods.riftTier - 1)).pristineBonus
        : 0;
    const riftPristine =
      sim.dungeonMode === 'rift' && rand() < Math.min(0.85, 0.45 + riftPristineBonus);
    const relic = createRelicInstance(
      tpl,
      uid,
      appraisal ||
        e.kind === 'boss' ||
        Boolean(e.isElite) ||
        e.isMimicGuard ||
        bloodPristine ||
        riftPristine,
      bountyMatch,
    );
    const popAngle = rand() * Math.PI * 2;
    const popSpeed = 2.6 + rand() * 1.8;
    sim.pickups.push({
      id: uid,
      x: e.x,
      y: 0.52,
      z: e.z,
      vx: Math.cos(popAngle) * popSpeed,
      vy: 4.4 + rand() * 1.4,
      vz: Math.sin(popAngle) * popSpeed,
      item: relic,
      age: 0,
    });
    if (bountyMatch) {
      out.hitPopups?.push({
        x: e.x,
        y: 1.9,
        z: e.z,
        text: '★ 3× BOUNTY!',
        color: '#38E8D8',
        crit: true,
        kind: 'appraisal',
      });
    }
  };

  applyIncomingPlayerHit = (
    dmg: number,
    ax: number,
    az: number,
    attacker?: EnemyEntity,
    proj?: ProjectileEntity,
  ): boolean => {
    if (p.invulnTimer > 0 || p.y >= 0.6) return false;
    const fdx = ax - p.x;
    const fdz = az - p.z;
    const fLen = Math.hypot(fdx, fdz);
    const dot =
      fLen > 0.05
        ? (fdx / fLen) * Math.sin(p.facing) + (fdz / fLen) * Math.cos(p.facing)
        : 1;

    if (p.blocking && dot >= -0.28) {
      const isParry = p.parryWindowTimer > 0;
      if (isParry) {
        p.parryWindowTimer = 0;
        p.invulnTimer = Math.max(p.invulnTimer, 0.45);
        p.mana = Math.min(p.maxMana, p.mana + 20);
        p.chainLightningReady = true;
        out.parried = true;
        out.parryTriggered = true;
        p.comboStreak = Math.min(99, (p.comboStreak || 0) + 1);
        p.comboStreakTimer = 3.6;
        sim.hitstopTimer = 0.055;
        sim.trauma = Math.min(1, sim.trauma + 0.36);
        if (attacker && attacker.state !== 'ko') {
          attacker.state = 'stunned';
          attacker.stateTimer = 1.5;
          attacker.hitFlashTimer = 0.2;
          if (fLen > 0.05) {
            attacker.vx += (fdx / fLen) * 5.2;
            attacker.vz += (fdz / fLen) * 5.2;
          }
        }
        if (proj) {
          proj.deflected = true;
          proj.color = '#38E8D8';
          proj.damage = Math.max(36, Math.round(weapon.damage * 2.0 * effectiveSkillMult));
          proj.life = 2.2;
          const dirX = fLen > 0.05 ? fdx / fLen : Math.sin(p.facing);
          const dirZ = fLen > 0.05 ? fdz / fLen : Math.cos(p.facing);
          proj.vx = dirX * 14.5;
          proj.vz = dirZ * 14.5;
        }
        out.hitPopups?.push({
          x: p.x,
          y: p.y + 1.55,
          z: p.z,
          text: '✦ PARRY! +20 MP',
          color: '#38E8D8',
          crit: true,
          kind: 'appraisal',
        });
        return false;
      }

      p.invulnTimer = Math.max(p.invulnTimer, 0.24);
      p.mana = Math.max(0, p.mana - 5);
      out.blocked = true;
      sim.trauma = Math.min(1, sim.trauma + 0.16);
      if (attacker && attacker.state !== 'ko' && fLen > 0.05) {
        attacker.vx += (fdx / fLen) * 3.6;
        attacker.vz += (fdz / fLen) * 3.6;
      }
      out.hitPopups?.push({
        x: p.x,
        y: p.y + 1.45,
        z: p.z,
        text: '🛡 BLOCK',
        color: '#9EB4DA',
        crit: false,
        kind: 'heal',
      });
      return true;
    }

    if (p.aegisShieldHits > 0) {
      p.aegisShieldHits -= 1;
      if (p.aegisShieldHits <= 0) p.aegisShieldTimer = 0;
      p.invulnTimer = Math.max(p.invulnTimer, 0.48);
      out.aegisBurst = true;
      sim.trauma = Math.min(1, sim.trauma + 0.32);
      const shockDmg = Math.max(16, Math.round(weapon.damage * 0.9 * effectiveSkillMult));
      for (const e of sim.enemies) {
        if (e.state === 'ko') continue;
        const edx = e.x - p.x;
        const edz = e.z - p.z;
        const ed = Math.hypot(edx, edz);
        if (ed <= 3.6 + e.radius) {
          e.hp -= shockDmg;
          e.hitFlashTimer = 0.14;
          if (ed > 0.05) {
            e.vx += (edx / ed) * 5.5;
            e.vz += (edz / ed) * 5.5;
          }
          if (e.hp <= 0) {
            e.hp = 0;
            e.state = 'ko';
            e.koTimer = 0.42;
            dropRelicFromKill(e, false);
          }
        }
      }
      out.hitPopups?.push({
        x: p.x,
        y: p.y + 1.55,
        z: p.z,
        text: '◈ AEGIS!',
        color: '#F4B942',
        crit: true,
        kind: 'appraisal',
      });
      return true;
    }

    p.hp = Math.max(0, p.hp - dmg);
    p.invulnTimer = 0.75;
    p.hitFlashTimer = 0.2;
    sim.trauma = Math.min(1, sim.trauma + 0.5);
    out.playerHurt = true;
    out.hitPopups?.push({
      x: p.x,
      y: p.y + 1.4,
      z: p.z,
      text: `-${dmg}`,
      color: '#FF4D6D',
      crit: true,
      kind: 'hurt',
    });
    if (p.hp <= 0) out.playerDied = true;
    return true;
  };

  const spawnMimicFromChest = (ch: ChestEntity, stunned: boolean) => {
    ch.opened = true;
    ch.mimicRevealed = true;
    const mHp = Math.round((115 + sim.week * 22) * difficulty.enemyHpMult);
    sim.enemies.push({
      id: `mimic_${++sim.uidCounter}`,
      kind: 'sentinel',
      x: ch.x,
      y: 0,
      z: ch.z + 0.35,
      vx: 0,
      vz: 0,
      facing: 0,
      hp: mHp,
      maxHp: mHp,
      radius: 0.72,
      speed: 2.8,
      damage: Math.max(1, Math.round(1 * difficulty.enemyDmgMult)),
      state: stunned ? 'stunned' : 'windup',
      stateTimer: stunned ? 2.8 : 0.48,
      windupDuration: 0.55,
      attackRange: 2.1,
      hitFlashTimer: 0.2,
      walkPhase: 0,
      dealtHitThisSwing: false,
      koTimer: 0,
      isMimicGuard: true,
    });
    out.mimicAwakened = true;
    if (stunned) out.mimicStunned = true;
    sim.trauma = Math.min(1, sim.trauma + 0.42);
    out.hitPopups?.push({
      x: ch.x,
      y: 1.65,
      z: ch.z,
      text: stunned ? '✦ MIMIC EXPOSED!' : '⚠ MIMIC!',
      color: stunned ? '#F4B942' : '#FF3B5C',
      crit: true,
      kind: stunned ? 'appraisal' : 'hurt',
    });
  };

  // Combat actions (in dungeon)
  const performStrike = (isSpecial: boolean, isCharged = false) => {
    if (input.aimDirX !== null && input.aimDirZ !== null) {
      p.facing = Math.atan2(input.aimDirX, input.aimDirZ);
    }
    const dirX = Math.sin(p.facing);
    const dirZ = Math.cos(p.facing);
    const isFinisher = !isSpecial && !isCharged && p.comboStep === 2;
    const rangeBase = isSpecial ? weapon.specialRange : weapon.range;
    const range =
      rangeBase *
      boonFx.rangeMult *
      (isCharged ? (weapon.id === 'hammer' ? 1.55 : weapon.id === 'spear' ? 1.45 : 1.28) : isFinisher ? 1.14 : 1.0);
    const minCos =
      isSpecial || isCharged || isFinisher
        ? isFinisher && !isSpecial && !isCharged
          ? -0.55
          : -1.0
        : Math.cos(((weapon.arcDeg * 0.5) * Math.PI) / 180);
    const specMult = isSpecial
      ? sim.mods.specialDmgMult * boonFx.specialDmgMult
      : isCharged
        ? boonFx.primaryDmgMult * 1.95
        : boonFx.primaryDmgMult;
    const rawDamage = Math.round(
      (isSpecial ? weapon.specialDamage : weapon.damage * (1 + p.comboStep * 0.18)) *
        effectiveSkillMult *
        specMult,
    );

    if (isSpecial) {
      const surge = weapon.id === 'spear' ? 9.5 : 4.8;
      p.vx += dirX * surge;
      p.vz += dirZ * surge;
    } else if (isCharged) {
      const surge = weapon.id === 'spear' ? 15.5 : weapon.id === 'twinblades' ? 9.0 : 5.5;
      p.vx += dirX * surge;
      p.vz += dirZ * surge;
      if (weapon.id === 'spear' || weapon.id === 'twinblades') {
        p.invulnTimer = Math.max(p.invulnTimer, 0.28);
      }
    } else {
      const stepImpulse = isFinisher ? 5.6 : 3.2;
      p.vx += dirX * stepImpulse;
      p.vz += dirZ * stepImpulse;
    }

    // Launch piercing 3D Slash Wave on Sword/Twinblades Charged Art or [Q] Special
    if ((isCharged || isSpecial) && (weapon.id === 'sword' || weapon.id === 'twinblades')) {
      sim.uidCounter += 1;
      sim.slashWaves.push({
        id: `wave_${sim.uidCounter}`,
        x: p.x + dirX * 0.85,
        z: p.z + dirZ * 0.85,
        vx: dirX * 14.5,
        vz: dirZ * 14.5,
        facing: p.facing,
        radius: isCharged ? 1.35 : 1.18,
        damage: Math.max(22, Math.round(weapon.damage * (isCharged ? 1.55 : 1.25) * effectiveSkillMult)),
        life: 0.72,
        maxLife: 0.72,
        color: isCharged ? '#F4B942' : weapon.color,
        hitIds: [],
      });
      out.waveLaunched = true;
    }

    // 1. Deflect incoming enemy projectiles cleanly -> empowers Chain Lightning!
    for (let i = 0; i < sim.projectiles.length; i++) {
      const pr = sim.projectiles[i];
      if (pr.deflected) continue;
      const distP = Math.hypot(pr.x - p.x, pr.z - p.z);
      if (distP <= range + 0.65) {
        pr.deflected = true;
        pr.color = '#38E8D8';
        pr.damage = Math.max(32, Math.round(weapon.damage * 1.35 * effectiveSkillMult));
        pr.life = 2.2;
        // Aim back at nearest living enemy, or along player facing
        let bestEnemy: EnemyEntity | null = null;
        let bestD = Infinity;
        for (const e of sim.enemies) {
          if (e.state === 'ko') continue;
          const de = Math.hypot(e.x - pr.x, e.z - pr.z);
          if (de < bestD) {
            bestD = de;
            bestEnemy = e;
          }
        }
        const tx = bestEnemy ? (bestEnemy.x - pr.x) / Math.max(0.1, bestD) : dirX;
        const tz = bestEnemy ? (bestEnemy.z - pr.z) / Math.max(0.1, bestD) : dirZ;
        pr.vx = tx * 12.5;
        pr.vz = tz * 12.5;
        p.chainLightningReady = true;
        out.deflected = true;
        sim.trauma = Math.min(1, sim.trauma + 0.28);
        out.hitPopups?.push({
          x: pr.x,
          y: 1.25,
          z: pr.z,
          text: '⚡ DEFLECT!',
          color: '#38E8D8',
          crit: true,
          kind: 'appraisal',
        });
      }
    }

    // 1b. Smash Destructible Urns & Crystals!
    for (let i = 0; i < sim.destructibles.length; i++) {
      const dest = sim.destructibles[i];
      if (dest.broken) continue;
      if (Math.hypot(dest.x - p.x, dest.z - p.z) <= range + 0.75) {
        dest.broken = true;
        out.propsSmashed = (out.propsSmashed ?? 0) + 1;
        out.smashedProps?.push({ x: dest.x, z: dest.z, kind: dest.kind });
        sim.propsSmashedTotal += 1;
        sim.trauma = Math.min(1, sim.trauma + 0.16);
        if (
          boonFx.windfallHealEveryN > 0 &&
          sim.propsSmashedTotal % boonFx.windfallHealEveryN === 0 &&
          p.hp < p.maxHp
        ) {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          out.healed = true;
          out.hitPopups?.push({
            x: p.x,
            y: p.y + 1.5,
            z: p.z,
            text: '+1 HP 🏺',
            color: '#38E8D8',
            crit: false,
            kind: 'heal',
          });
        }
        if (dest.kind === 'urn') {
          const baseCoins =
            8 + Math.floor(rand() * 8) + (boonFx.gildedGreed ? 8 : 0) + boonFx.windfallPropGold;
          const coins = Math.round(baseCoins * totalGoldDropMult);
          out.coinsEarned = (out.coinsEarned ?? 0) + coins;
          out.hitPopups?.push({
            x: dest.x,
            y: 1.15,
            z: dest.z,
            text: `+${coins}g`,
            color: '#F4B942',
            crit: false,
            kind: 'appraisal',
          });
        } else {
          if (boonFx.windfallPropGold > 0) {
            out.coinsEarned =
              (out.coinsEarned ?? 0) + Math.round(boonFx.windfallPropGold * totalGoldDropMult);
          }
          p.specialCooldown = Math.max(0, p.specialCooldown - 1.2);
          out.crystalCharged = true;
          out.hitPopups?.push({
            x: dest.x,
            y: 1.15,
            z: dest.z,
            text: '-1.2s [Q]',
            color: '#38E8D8',
            crit: true,
            kind: 'heal',
          });
        }
      }
    }

    // 1c. [Q] Special Strike reveals & stuns un-opened Mimic Chests!
    if (isSpecial) {
      for (const ch of sim.chests) {
        if (!ch.opened && ch.isMimic && !ch.mimicRevealed) {
          if (Math.hypot(ch.x - p.x, ch.z - p.z) <= range + 0.9) {
            spawnMimicFromChest(ch, true);
          }
        }
      }
    }

    // 2. Strike enemies
    let dischargedChain = false;
    if (isFinisher) out.finisherCombo = true;
    const baseWeaponCrit =
      weapon.id === 'twinblades'
        ? 0.22
        : weapon.id === 'spear'
          ? 0.16
          : weapon.id === 'hammer'
            ? 0.14
            : 0.12;
    const totalCritChance = Math.min(
      0.85,
      baseWeaponCrit +
        boonFx.critChanceBonus +
        sim.shrineCritBonus +
        sim.mods.supplyCritBonus +
        Math.min(0.15, (p.comboStreak || 0) * 0.01),
    );

    const riposteActive = (p.counterTimer || 0) > 0;
    let riposteConsumed = false;
    for (let i = 0; i < sim.enemies.length; i++) {
      const e = sim.enemies[i];
      if (e.state === 'ko') continue;
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range + e.radius) continue;
      if (dist > 0.25) {
        const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
        if (dot < minCos) continue;
      }

      out.enemyHit = true;
      if (riposteActive) riposteConsumed = true;
      p.comboStreak = Math.min(99, (p.comboStreak || 0) + 1);
      p.comboStreakTimer = 3.6;
      p.mana = Math.min(p.maxMana, p.mana + (isSpecial ? 6 : 12));
      const wasTelegraphing = e.state === 'windup';
      const appraisal = isSpecial && wasTelegraphing;
      const stunBonus = e.state === 'stunned' ? 1.4 : 1.0;
      const eliteOrBossMult = e.isElite || e.kind === 'boss' ? boonFx.eliteBossDmgMult : 1.0;
      const bulwarkMult =
        e.isElite && e.eliteAffix === 'bulwark' && !isSpecial && !isFinisher ? 0.72 : 1.0;
      const canCrit = !isSpecial || boonFx.eliteBossDmgMult > 1.0 || riposteActive;
      const isCrit = riposteActive || (canCrit && rand() < totalCritChance);
      const critMult = isCrit ? boonFx.critDmgMult : 1.0;
      const riposteMult = riposteActive ? 1.35 : 1.0;
      const parryBonus = boonFx.wardensParry && wasTelegraphing ? 15 : 0;
      if (boonFx.wardensParry && wasTelegraphing) {
        p.specialCooldown = Math.max(0, p.specialCooldown - 0.9);
        out.parryTriggered = true;
      }
      const finalDamage =
        Math.round(
          rawDamage *
            (appraisal ? 1.45 : 1.0) *
            stunBonus *
            eliteOrBossMult *
            bulwarkMult *
            critMult *
            riposteMult,
        ) + parryBonus;
      e.hp -= finalDamage;
      e.hitFlashTimer = 0.14;
      wakeEnemy(e);
      if (isCharged && (weapon.id === 'hammer' || weapon.id === 'spear')) {
        e.state = 'stunned';
        e.stateTimer = Math.max(e.stateTimer, 0.85);
      }
      if (boonFx.frostSigil) {
        e.slowTimer = 2.4;
      }
      if (sim.mods.beltAbyssPoison) {
        e.poisonTimer = 2.8;
        e.poisonTickTimer = e.poisonTickTimer ?? 0.65;
      }
      out.impactPoints?.push({
        x: e.x,
        y: e.kind === 'boss' ? 1.25 : 0.85,
        z: e.z,
        color: appraisal || isCrit || isCharged || riposteActive ? '#F4B942' : weapon.color,
        heavy: isSpecial || isCharged || isFinisher || isCrit || riposteActive,
      });
      out.hitPopups?.push({
        x: e.x,
        y: e.kind === 'boss' ? 1.9 : 1.3,
        z: e.z,
        text: riposteActive
          ? `⚡ RIPOSTE -${finalDamage}!`
          : appraisal
            ? `✦ -${finalDamage}!`
            : isCharged
              ? `⚡ -${finalDamage}!`
              : isCrit
                ? `CRIT -${finalDamage}!`
                : isFinisher
                  ? `★ -${finalDamage}`
                  : `-${finalDamage}`,
        color: appraisal || isCrit || isCharged || riposteActive ? '#F4B942' : isSpecial || isFinisher ? '#FF9E44' : '#FFF4DC',
        crit: appraisal || isCrit || isSpecial || isCharged || isFinisher || stunBonus > 1,
        kind: appraisal || riposteActive ? 'appraisal' : 'dmg',
      });
      if (dist > 0.05) {
        const kb = isSpecial || isCharged || isFinisher || riposteActive ? 4.4 : 2.3;
        e.vx += (dx / dist) * kb;
        e.vz += (dz / dist) * kb;
      }

      if (appraisal) {
        out.appraisalTriggered = true;
        e.state = 'recover';
        e.stateTimer = 0.6;
        sim.hitstopTimer = 0.11;
        sim.trauma = Math.min(1, sim.trauma + 0.55);
      } else if (isCharged || isSpecial || isFinisher || isCrit) {
        sim.hitstopTimer = isCharged ? 0.105 : 0.085;
        sim.trauma = Math.min(1, sim.trauma + (isCharged ? 0.5 : 0.35));
      }

      // Chain Lightning discharge on deflected-charged strike OR Storm Combo Boon (3rd hit)
      const stormTrigger = boonFx.stormCombo && isFinisher;
      if ((p.chainLightningReady || stormTrigger) && !dischargedChain) {
        dischargedChain = true;
        if (p.chainLightningReady) p.chainLightningReady = false;
        let arcsFired = 0;
        for (let j = 0; j < sim.enemies.length && arcsFired < boonFx.chainTargets; j++) {
          const other = sim.enemies[j];
          if (other === e || other.state === 'ko') continue;
          const chainDist = Math.hypot(other.x - e.x, other.z - e.z);
          if (chainDist <= 5.5) {
            arcsFired += 1;
            const chilledMult = (other.slowTimer ?? 0) > 0 ? boonFx.chainDmgMult : 1.0;
            const hasElemState = (other.slowTimer ?? 0) > 0 || (other.burnTimer ?? 0) > 0;
            const overloadMult = hasElemState ? 1.35 : 1.0;
            const arcDmg = Math.max(
              18,
              Math.round(weapon.damage * 0.95 * effectiveSkillMult * chilledMult * overloadMult),
            );
            other.hp -= arcDmg;
            other.hitFlashTimer = 0.14;
            wakeEnemy(other);
            if (hasElemState) {
              out.elementalReactions?.push({ x: other.x, z: other.z, kind: 'superconduct' });
            }
            out.lightningArcs?.push({
              x1: e.x,
              y1: 0.9,
              z1: e.z,
              x2: other.x,
              y2: 0.9,
              z2: other.z,
            });
            out.hitPopups?.push({
              x: other.x,
              y: 1.45,
              z: other.z,
              text: hasElemState ? `⚡ OVERLOAD -${arcDmg}!` : `⚡ -${arcDmg}`,
              color: hasElemState ? '#F4B942' : '#38E8D8',
              crit: true,
              kind: 'appraisal',
            });
            if (other.hp <= 0) {
              other.hp = 0;
              other.state = 'ko';
              other.koTimer = 0.42;
              dropRelicFromKill(other, false);
            }
          }
        }
      }

      if (e.hp <= 0) {
        e.hp = 0;
        e.state = 'ko';
        e.koTimer = 0.42;
        dropRelicFromKill(e, appraisal);
      }
    }
    if (riposteConsumed) {
      p.counterTimer = 0;
    }
  };

  const executeAbility = (abilityId: AbilityId): boolean => {
    const def = ABILITY_MAP[abilityId];
    if (!def) return false;
    const curCd =
      abilityId === 'whirlwind'
        ? Math.max(p.abilityCooldowns.whirlwind, p.specialCooldown)
        : p.abilityCooldowns[abilityId];
    if (curCd > 0) return false;
    if (p.mana < def.manaCost) {
      out.hitPopups?.push({
        x: p.x,
        y: p.y + 1.5,
        z: p.z,
        text: 'LOW MANA',
        color: '#60A5FA',
        crit: false,
        kind: 'dmg',
      });
      return false;
    }
    if (input.aimDirX !== null && input.aimDirZ !== null) {
      p.facing = Math.atan2(input.aimDirX, input.aimDirZ);
    }
    p.mana -= def.manaCost;
    const baseCd =
      abilityId === 'whirlwind'
        ? Math.max(def.cooldown, weapon.specialCooldown) *
          sim.mods.specialCooldownMult *
          sim.mods.beltSpecialCdMult *
          boonFx.specialCdMult
        : def.cooldown * sim.mods.specialCooldownMult;
    p.abilityCooldowns[abilityId] = baseCd;
    if (abilityId === 'whirlwind') {
      p.specialCooldown = baseCd;
    }
    p.activeAbilityId = abilityId;
    out.abilityCast = abilityId;

    const dirX = Math.sin(p.facing);
    const dirZ = Math.cos(p.facing);

    if (abilityId === 'whirlwind') {
      p.specialAnimTimer = 0.34;
      p.attackCooldown = 0.28;
      p.attackKind = 'special';
      p.squashX = 1.24;
      p.squashY = 0.82;
      p.chargeTimer = 0;
      p.chargeReady = false;
      out.specialUsed = true;
      performStrike(true, false);
      if (sim.floorAnomaly === 'mirror_echo' || boonFx.echoBlade) {
        sim.echoQueue.push({
          timer: 0.38,
          x: p.x,
          z: p.z,
          facing: p.facing,
          range: weapon.specialRange * boonFx.rangeMult,
          dmg: Math.max(
            15,
            Math.round(
              weapon.specialDamage *
                effectiveSkillMult *
                sim.mods.specialDmgMult *
                boonFx.specialDmgMult *
                boonFx.echoDmgRatio,
            ),
          ),
        });
      }
      return true;
    }

    if (abilityId === 'leap_slam') {
      const lx = mx !== 0 || mz !== 0 ? mx : dirX;
      const lz = mx !== 0 || mz !== 0 ? mz : dirZ;
      p.facing = Math.atan2(lx, lz);
      p.vy = 8.6 * (lowGrav ? 1.22 : 1.0);
      p.vx = lx * 14.2;
      p.vz = lz * 14.2;
      p.jumpTimer = 0.36;
      p.invulnTimer = Math.max(p.invulnTimer, 0.45);
      p.slamPending = true;
      p.attackKind = 'slam';
      p.squashX = 0.78;
      p.squashY = 1.28;
      out.jumped = true;
      sim.trauma = Math.min(1, sim.trauma + 0.24);
      return true;
    }

    if (abilityId === 'blade_volley') {
      p.attackAnimTimer = 0.28;
      p.attackCooldown = 0.25;
      p.comboStep = 2;
      p.squashX = 1.18;
      p.squashY = 0.86;
      const waveDmg = Math.max(24, Math.round(weapon.damage * 1.15 * effectiveSkillMult));
      for (const offset of [-0.31, 0, 0.31]) {
        const ang = p.facing + offset;
        const bx = Math.sin(ang);
        const bz = Math.cos(ang);
        sim.uidCounter += 1;
        sim.slashWaves.push({
          id: `wave_${sim.uidCounter}`,
          x: p.x + bx * 0.85,
          z: p.z + bz * 0.85,
          vx: bx * 16.0,
          vz: bz * 16.0,
          facing: ang,
          radius: 1.25,
          damage: waveDmg,
          life: 0.8,
          maxLife: 0.8,
          color: '#F4B942',
          hitIds: [],
        });
      }
      out.waveLaunched = true;
      return true;
    }

    if (abilityId === 'ignis_cone') {
      const coneRange = 6.6;
      const minDot = Math.cos((36 * Math.PI) / 180);
      const dmg = Math.max(28, Math.round(weapon.damage * 1.35 * effectiveSkillMult));
      p.attackAnimTimer = 0.24;
      p.attackCooldown = 0.24;
      p.squashX = 1.16;
      p.squashY = 0.88;
      sim.trauma = Math.min(1, sim.trauma + 0.36);
      out.ignisCone = { x: p.x, z: p.z, facing: p.facing, range: coneRange, angleDeg: 72 };
      for (const dest of sim.destructibles) {
        if (!dest.broken && Math.hypot(dest.x - p.x, dest.z - p.z) <= coneRange) {
          dest.broken = true;
          out.propsSmashed = (out.propsSmashed ?? 0) + 1;
          out.smashedProps?.push({ x: dest.x, z: dest.z, kind: dest.kind });
          sim.propsSmashedTotal += 1;
        }
      }
      for (let pi = sim.projectiles.length - 1; pi >= 0; pi--) {
        const pr = sim.projectiles[pi];
        if (!pr.deflected && Math.hypot(pr.x - p.x, pr.z - p.z) <= coneRange) {
          sim.projectiles.splice(pi, 1);
        }
      }
      for (const e of sim.enemies) {
        if (e.state === 'ko') continue;
        const edx = e.x - p.x;
        const edz = e.z - p.z;
        const ed = Math.hypot(edx, edz);
        if (ed > coneRange + e.radius) continue;
        if (ed > 0.25 && (edx / ed) * dirX + (edz / ed) * dirZ < minDot) continue;
        const hadFrost = (e.slowTimer ?? 0) > 0;
        const shatterDmg = hadFrost ? Math.round(weapon.damage * 1.45 * effectiveSkillMult) : 0;
        if (hadFrost) {
          e.slowTimer = 0;
          e.state = 'stunned';
          e.stateTimer = Math.max(e.stateTimer, 0.9);
          out.elementalReactions?.push({ x: e.x, z: e.z, kind: 'shatter' });
        }
        e.hp -= dmg + shatterDmg;
        e.hitFlashTimer = 0.16;
        e.burnTimer = 3.2;
        e.burnTickTimer = 0.45;
        wakeEnemy(e);
        if (ed > 0.05) {
          e.vx += (edx / ed) * 4.8;
          e.vz += (edz / ed) * 4.8;
        }
        out.enemyHit = true;
        p.comboStreak = Math.min(99, (p.comboStreak || 0) + 1);
        p.comboStreakTimer = 3.6;
        out.impactPoints?.push({ x: e.x, y: 0.9, z: e.z, color: hadFrost ? '#F4B942' : '#FF5E3A', heavy: true });
        out.hitPopups?.push({
          x: e.x,
          y: 1.5,
          z: e.z,
          text: hadFrost ? `🔥❄ SHATTER! -${dmg + shatterDmg}` : `🔥 -${dmg}`,
          color: hadFrost ? '#F4B942' : '#FF5E3A',
          crit: true,
          kind: hadFrost ? 'appraisal' : 'dmg',
        });
        if (e.hp <= 0) {
          e.hp = 0;
          e.state = 'ko';
          e.koTimer = 0.42;
          dropRelicFromKill(e, false);
        }
      }
      return true;
    }

    if (abilityId === 'aegis_ward') {
      p.aegisShieldHits = 2;
      p.aegisShieldTimer = 7.5;
      p.invulnTimer = Math.max(p.invulnTimer, 0.38);
      p.squashX = 1.2;
      p.squashY = 0.85;
      out.aegisBurst = true;
      sim.trauma = Math.min(1, sim.trauma + 0.26);
      const pulseDmg = Math.max(14, Math.round(weapon.damage * 0.65 * effectiveSkillMult));
      for (let pi = sim.projectiles.length - 1; pi >= 0; pi--) {
        if (!sim.projectiles[pi].deflected && Math.hypot(sim.projectiles[pi].x - p.x, sim.projectiles[pi].z - p.z) <= 3.6) {
          sim.projectiles.splice(pi, 1);
        }
      }
      for (const e of sim.enemies) {
        if (e.state === 'ko') continue;
        const edx = e.x - p.x;
        const edz = e.z - p.z;
        const ed = Math.hypot(edx, edz);
        if (ed <= 3.4 + e.radius) {
          e.hp -= pulseDmg;
          e.hitFlashTimer = 0.14;
          wakeEnemy(e);
          if (ed > 0.05) {
            e.vx += (edx / ed) * 5.8;
            e.vz += (edz / ed) * 5.8;
          }
          out.enemyHit = true;
          out.hitPopups?.push({
            x: e.x,
            y: 1.4,
            z: e.z,
            text: `🛡 -${pulseDmg}`,
            color: '#F4B942',
            crit: false,
            kind: 'appraisal',
          });
          if (e.hp <= 0) {
            e.hp = 0;
            e.state = 'ko';
            e.koTimer = 0.42;
            dropRelicFromKill(e, false);
          }
        }
      }
      return true;
    }

    // frost_nova
    const novaR = 5.4;
    const frostDmg = Math.max(26, Math.round(weapon.damage * 1.25 * effectiveSkillMult));
    p.squashX = 1.25;
    p.squashY = 0.8;
    sim.trauma = Math.min(1, sim.trauma + 0.4);
    sim.hitstopTimer = 0.088;
    out.frostNova = { x: p.x, z: p.z, radius: novaR };
    for (const dest of sim.destructibles) {
      if (!dest.broken && Math.hypot(dest.x - p.x, dest.z - p.z) <= novaR) {
        dest.broken = true;
        out.propsSmashed = (out.propsSmashed ?? 0) + 1;
        out.smashedProps?.push({ x: dest.x, z: dest.z, kind: dest.kind });
        sim.propsSmashedTotal += 1;
      }
    }
    for (let pi = sim.projectiles.length - 1; pi >= 0; pi--) {
      if (!sim.projectiles[pi].deflected && Math.hypot(sim.projectiles[pi].x - p.x, sim.projectiles[pi].z - p.z) <= 4.4) {
        sim.projectiles.splice(pi, 1);
      }
    }
    for (const e of sim.enemies) {
      if (e.state === 'ko') continue;
      const edx = e.x - p.x;
      const edz = e.z - p.z;
      const ed = Math.hypot(edx, edz);
      if (ed <= novaR + e.radius) {
        const hadBurn = (e.burnTimer ?? 0) > 0;
        const shatterDmg = hadBurn ? Math.round(weapon.damage * 1.45 * effectiveSkillMult) : 0;
        if (hadBurn) {
          e.burnTimer = 0;
          out.elementalReactions?.push({ x: e.x, z: e.z, kind: 'shatter' });
        }
        e.hp -= frostDmg + shatterDmg;
        e.hitFlashTimer = 0.18;
        e.slowTimer = 4.2;
        e.aggroed = true;
        e.state = 'stunned';
        e.stateTimer = Math.max(e.stateTimer, hadBurn ? 1.15 : 0.75);
        out.enemyHit = true;
        p.comboStreak = Math.min(99, (p.comboStreak || 0) + 1);
        p.comboStreakTimer = 3.6;
        out.impactPoints?.push({ x: e.x, y: 0.9, z: e.z, color: hadBurn ? '#F4B942' : '#38E8D8', heavy: true });
        out.hitPopups?.push({
          x: e.x,
          y: 1.5,
          z: e.z,
          text: hadBurn ? `🔥❄ SHATTER! -${frostDmg + shatterDmg}` : `❄ -${frostDmg}`,
          color: hadBurn ? '#F4B942' : '#38E8D8',
          crit: true,
          kind: 'appraisal',
        });
        if (e.hp <= 0) {
          e.hp = 0;
          e.state = 'ko';
          e.koTimer = 0.42;
          dropRelicFromKill(e, false);
        }
      }
    }
    return true;
  };

  if (sim.zone === 'dungeon') {
    const requestedAbility = input.abilityTriggered ?? (input.specialPressed ? 'whirlwind' : null);
    if (requestedAbility && executeAbility(requestedAbility)) {
      // Ability executed cleanly
    } else if (input.attackReleased && p.chargeReady && p.attackCooldown <= 0) {
      p.chargeTimer = 0;
      p.chargeReady = false;
      p.attackCooldown = Math.max(0.28, weapon.cooldown * 1.1);
      p.specialAnimTimer = 0.34;
      p.attackKind = 'charged';
      p.squashX = 1.26;
      p.squashY = 0.8;
      out.chargedStrike = true;
      out.swungCombo = 2;
      performStrike(false, true);
    } else if (input.attackPressed && p.y > 0.45 && !p.slamPending) {
      p.slamPending = true;
      p.attackKind = 'slam';
      p.vy = Math.min(p.vy, -17.5);
      p.squashX = 0.78;
      p.squashY = 1.26;
      out.swungCombo = 2;
    } else if (input.attackPressed && p.attackCooldown <= 0) {
      p.attackCooldown = weapon.cooldown;
      p.attackAnimTimer = p.comboStep === 2 ? 0.3 : 0.22;
      p.comboResetTimer = 0.88;
      p.attackKind = 'combo';
      p.squashX = p.comboStep === 2 ? 1.22 : 1.1;
      p.squashY = p.comboStep === 2 ? 0.82 : 0.92;
      out.swungCombo = p.comboStep;
      performStrike(false, false);
      p.comboStep = (p.comboStep + 1) % 3;
    }

    // Update piercing Slash Waves
    for (let w = sim.slashWaves.length - 1; w >= 0; w--) {
      const wave = sim.slashWaves[w];
      wave.life -= dt;
      wave.x += wave.vx * dt;
      wave.z += wave.vz * dt;
      if (wave.life <= 0 || Math.abs(wave.x) > limit + 0.5 || Math.abs(wave.z) > limit + 0.5) {
        sim.slashWaves.splice(w, 1);
        continue;
      }
      for (let dIdx = 0; dIdx < sim.destructibles.length; dIdx++) {
        const dest = sim.destructibles[dIdx];
        if (!dest.broken && Math.hypot(dest.x - wave.x, dest.z - wave.z) <= wave.radius + 0.5) {
          dest.broken = true;
          out.propsSmashed = (out.propsSmashed ?? 0) + 1;
          out.smashedProps?.push({ x: dest.x, z: dest.z, kind: dest.kind });
          sim.propsSmashedTotal += 1;
        }
      }
      for (let eIdx = 0; eIdx < sim.enemies.length; eIdx++) {
        const e = sim.enemies[eIdx];
        if (e.state === 'ko' || wave.hitIds.includes(e.id)) continue;
        if (Math.hypot(e.x - wave.x, e.z - wave.z) <= wave.radius + e.radius) {
          wave.hitIds.push(e.id);
          e.hp -= wave.damage;
          e.hitFlashTimer = 0.14;
          wakeEnemy(e);
          out.enemyHit = true;
          p.comboStreak = Math.min(99, (p.comboStreak || 0) + 1);
          p.comboStreakTimer = 3.6;
          out.impactPoints?.push({ x: e.x, y: 0.9, z: e.z, color: wave.color, heavy: true });
          out.hitPopups?.push({
            x: e.x,
            y: e.kind === 'boss' ? 1.9 : 1.35,
            z: e.z,
            text: `✦ -${wave.damage}`,
            color: wave.color,
            crit: true,
            kind: 'dmg',
          });
          if (e.hp <= 0) {
            e.hp = 0;
            e.state = 'ko';
            e.koTimer = 0.42;
            dropRelicFromKill(e, false);
          }
        }
      }
    }

    // Mirror Echo Anomaly delayed phantom strike
    for (let i = sim.echoQueue.length - 1; i >= 0; i--) {
      const echo = sim.echoQueue[i];
      echo.timer -= dt;
      if (echo.timer <= 0) {
        sim.echoQueue.splice(i, 1);
        out.echoTriggered = true;
        for (const e of sim.enemies) {
          if (e.state === 'ko') continue;
          if (Math.hypot(e.x - echo.x, e.z - echo.z) <= echo.range + e.radius) {
            e.hp -= echo.dmg;
            e.hitFlashTimer = 0.14;
            wakeEnemy(e);
            out.enemyHit = true;
            out.hitPopups?.push({
              x: e.x,
              y: 1.5,
              z: e.z,
              text: `◈ -${echo.dmg}`,
              color: '#38E8D8',
              crit: true,
              kind: 'appraisal',
            });
            if (e.hp <= 0) {
              e.hp = 0;
              e.state = 'ko';
              e.koTimer = 0.42;
              dropRelicFromKill(e, false);
            }
          }
        }
      }
    }

    // Rune Trap Plates -> stun nearby enemies including Marauder & Boss!
    for (let t = 0; t < sim.runeTraps.length; t++) {
      const trap = sim.runeTraps[t];
      if (trap.cooldown > 0) {
        trap.cooldown = Math.max(0, trap.cooldown - dt);
        continue;
      }
      const enemyStepped = sim.enemies.some(
        (e) => e.state !== 'ko' && Math.hypot(e.x - trap.x, e.z - trap.z) <= trap.radius + 0.15,
      );
      if (enemyStepped) {
        trap.cooldown = 18;
        out.trapTriggered = { x: trap.x, z: trap.z };
        sim.trauma = Math.min(1, sim.trauma + 0.38);
        for (const e of sim.enemies) {
          if (e.state === 'ko') continue;
          if (Math.hypot(e.x - trap.x, e.z - trap.z) <= 2.9) {
            e.state = 'stunned';
            e.stateTimer = 2.8;
            e.vx = 0;
            e.vz = 0;
            e.hitFlashTimer = 0.18;
            out.hitPopups?.push({
              x: e.x,
              y: 1.65,
              z: e.z,
              text: 'STUNNED!',
              color: '#38E8D8',
              crit: true,
              kind: 'appraisal',
            });
          }
        }
      }
    }

    const curRoom = sim.floorMap ? sim.floorMap.rooms[sim.currentRoomId] : null;
    const roomClearedAlready = Boolean(curRoom?.cleared);

    // Marauder timer escalation (ticks only while current room has active fight)
    if (!sim.marauderSpawned && !sim.exitPortalOpen && !roomClearedAlready) {
      sim.marauderTimer = Math.max(0, sim.marauderTimer - dt);
      if (sim.marauderTimer <= 0) {
        sim.marauderSpawned = true;
        out.marauderSpawned = true;
        const mHp = Math.round((190 + sim.week * 40) * difficulty.enemyHpMult);
        sim.enemies.push({
          id: `marauder_${sim.floor}`,
          kind: 'marauder',
          x: 0,
          y: 0,
          z: 16.0,
          vx: 0,
          vz: 0,
          facing: Math.PI,
          hp: mHp,
          maxHp: mHp,
          radius: 0.65,
          speed: 4.5,
          damage: 2,
          state: 'chase',
          stateTimer: 0.4,
          windupDuration: 0.42,
          attackRange: 1.95,
          hitFlashTimer: 0,
          walkPhase: 0,
          dealtHitThisSwing: false,
          koTimer: 0,
          aggroed: true,
        });
      }
    }

    // Update enemies
    let livingNonMarauder = 0;
    for (let i = sim.enemies.length - 1; i >= 0; i--) {
      const e = sim.enemies[i];
      e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      if (e.slowTimer && e.slowTimer > 0) {
        e.slowTimer = Math.max(0, e.slowTimer - dt);
      }

      if (e.state === 'ko') {
        e.koTimer -= dt;
        e.x += e.vx * dt;
        e.z += e.vz * dt;
        e.vx *= Math.exp(-8 * dt);
        e.vz *= Math.exp(-8 * dt);
        if (e.koTimer <= 0) {
          sim.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.kind !== 'marauder') livingNonMarauder += 1;

      // Multi-phase Boss Phase II escalation at <= 50% HP
      if (e.kind === 'boss' && (e.bossPhase ?? 1) === 1 && e.hp <= e.maxHp * 0.5) {
        e.bossPhase = 2;
        e.speed *= 1.22;
        e.windupDuration = Math.max(0.36, e.windupDuration * 0.8);
        sim.trauma = Math.min(1, sim.trauma + 0.62);
        sim.hitstopTimer = 0.085;
        out.bossPhase2 = true;
        out.hitPopups?.push({
          x: e.x,
          y: 2.2,
          z: e.z,
          text: '★ PHASE II!',
          color: '#FF5E3A',
          crit: true,
          kind: 'appraisal',
        });
        if (e.bossPattern === 'summon' && sim.enemies.filter((m) => m.kind !== 'boss' && m.state !== 'ko').length < 2) {
          sim.enemies.push(
            createEnemyInstance(
              `boss_min_${++sim.uidCounter}`,
              'slime',
              Math.max(-16.5, Math.min(16.5, e.x + (rand() > 0.5 ? 2.6 : -2.6))),
              Math.max(-16.5, Math.min(16.5, e.z + 1.5)),
              sim.week,
              sim.floor,
              difficulty,
              1.05,
              rand,
            ),
          );
        }
      }

      // Ignis Fire Burn DoT
      if (e.burnTimer && e.burnTimer > 0) {
        e.burnTimer = Math.max(0, e.burnTimer - dt);
        e.burnTickTimer = (e.burnTickTimer ?? 0.55) - dt;
        if (e.burnTickTimer <= 0) {
          e.burnTickTimer = 0.55;
          const burnDmg = Math.max(7, Math.round(weapon.damage * 0.28 * effectiveSkillMult));
          e.hp -= burnDmg;
          e.hitFlashTimer = 0.08;
          out.hitPopups?.push({
            x: e.x,
            y: 1.4,
            z: e.z,
            text: `🔥 -${burnDmg}`,
            color: '#FF7B42',
            crit: false,
            kind: 'dmg',
          });
          if (e.hp <= 0) {
            e.hp = 0;
            e.state = 'ko';
            e.koTimer = 0.42;
            dropRelicFromKill(e, false);
            continue;
          }
        }
      }

      // Abyssal Poison Belt Rune DoT
      if (e.poisonTimer && e.poisonTimer > 0) {
        e.poisonTimer = Math.max(0, e.poisonTimer - dt);
        e.poisonTickTimer = (e.poisonTickTimer ?? 0.65) - dt;
        if (e.poisonTickTimer <= 0) {
          e.poisonTickTimer = 0.65;
          e.hp -= 5;
          e.hitFlashTimer = 0.08;
          out.hitPopups?.push({
            x: e.x,
            y: 1.35,
            z: e.z,
            text: '-5 ☠',
            color: '#A855F7',
            crit: false,
            kind: 'dmg',
          });
          if (e.hp <= 0) {
            e.hp = 0;
            e.state = 'ko';
            e.koTimer = 0.42;
            dropRelicFromKill(e, false);
            continue;
          }
        }
      }

      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const dist = Math.hypot(dx, dz);
      const dirX = dist > 1e-4 ? dx / dist : 0;
      const dirZ = dist > 1e-4 ? dz / dist : 1;
      const slowMult = e.slowTimer && e.slowTimer > 0 ? 0.62 : 1.0;

      e.stateTimer -= dt;

      if (e.state === 'idle') {
        if (e.kind === 'marauder' || dist <= 7.8) {
          wakeEnemy(e);
        } else {
          // Local idle patrol around spawn point — distant NPCs (> 1/4 room from entry) do NOT auto-attack
          const ox = e.patrolOriginX ?? e.x;
          const oz = e.patrolOriginZ ?? e.z;
          e.patrolAngle = (e.patrolAngle ?? 0) + dt * 0.85;
          const tx = ox + Math.cos(e.patrolAngle) * 1.4;
          const tz = oz + Math.sin(e.patrolAngle) * 1.4;
          const pdx = tx - e.x;
          const pdz = tz - e.z;
          const pDist = Math.hypot(pdx, pdz);
          if (pDist > 0.08) {
            const patrolSpd = e.speed * 0.35;
            e.vx += ((pdx / pDist) * patrolSpd - e.vx) * (1 - Math.exp(-5 * dt));
            e.vz += ((pdz / pDist) * patrolSpd - e.vz) * (1 - Math.exp(-5 * dt));
            e.facing = Math.atan2(pdx, pdz);
            e.walkPhase += Math.hypot(e.vx, e.vz) * dt * 3.5;
          } else {
            e.vx *= Math.exp(-6 * dt);
            e.vz *= Math.exp(-6 * dt);
          }
        }
      } else if (e.state === 'stunned') {
        e.vx *= Math.exp(-12 * dt);
        e.vz *= Math.exp(-12 * dt);
        if (e.stateTimer <= 0) {
          e.state = 'chase';
          e.stateTimer = 0.5;
        }
      } else if (e.state === 'chase') {
        e.facing = Math.atan2(dirX, dirZ);
        if (e.kind === 'caster') {
          const desired = dist < 4.2 ? -1 : dist > e.attackRange ? 1 : 0;
          e.vx += (dirX * e.speed * slowMult * desired - e.vx) * (1 - Math.exp(-8 * dt));
          e.vz += (dirZ * e.speed * slowMult * desired - e.vz) * (1 - Math.exp(-8 * dt));
        } else {
          e.vx += (dirX * e.speed * slowMult - e.vx) * (1 - Math.exp(-8 * dt));
          e.vz += (dirZ * e.speed * slowMult - e.vz) * (1 - Math.exp(-8 * dt));
        }
        e.walkPhase += Math.hypot(e.vx, e.vz) * dt * 4;

        if (dist <= e.attackRange && e.stateTimer <= 0) {
          e.state = 'windup';
          e.stateTimer = e.windupDuration;
          e.dealtHitThisSwing = false;
          e.vx *= 0.25;
          e.vz *= 0.25;
        }
      } else if (e.state === 'windup') {
        e.vx *= Math.exp(-10 * dt);
        e.vz *= Math.exp(-10 * dt);
        e.facing = Math.atan2(dirX, dirZ);
        if (e.stateTimer <= 0) {
          e.state = 'attack';
          e.stateTimer = 0.24;
          if (e.kind === 'caster') {
            sim.projectiles.push({
              id: `proj_${++sim.uidCounter}`,
              x: e.x + dirX * 0.6,
              y: 0.75,
              z: e.z + dirZ * 0.6,
              vx: dirX * 7.8,
              vz: dirZ * 7.8,
              radius: 0.34,
              damage: e.damage,
              life: 2.6,
              color: '#E63946',
              deflected: false,
            });
          } else if (e.kind === 'boss') {
            const p2 = e.bossPhase === 2;
            const pattern = e.bossPattern ?? 'nova';
            const baseAngle = Math.atan2(dirX, dirZ);
            const fireBolt = (ang: number, spd: number, col: string) => {
              const bx = Math.sin(ang);
              const bz = Math.cos(ang);
              sim.projectiles.push({
                id: `proj_${++sim.uidCounter}`,
                x: e.x + bx * 0.8,
                y: 0.85,
                z: e.z + bz * 0.8,
                vx: bx * spd,
                vz: bz * spd,
                radius: 0.36,
                damage: 1,
                life: 2.8,
                color: col,
                deflected: false,
              });
            };
            if (pattern === 'nova') {
              const count = p2 ? 8 : 3;
              const spread = p2 ? Math.PI * 2 : 0.75;
              for (let k = 0; k < count; k++) {
                const ang = p2
                  ? baseAngle + (k / count) * spread
                  : baseAngle + (k - 1) * (spread * 0.5);
                fireBolt(ang, 7.6, '#38E8D8');
              }
              e.vx = dirX * 8.2;
              e.vz = dirZ * 8.2;
            } else if (pattern === 'slam') {
              e.vx = dirX * 6.8;
              e.vz = dirZ * 6.8;
              if (p2) {
                for (let k = 0; k < 4; k++) {
                  fireBolt(baseAngle + Math.PI * 0.25 + k * (Math.PI / 2), 7.2, '#F4B942');
                }
              }
            } else if (pattern === 'summon') {
              const count = p2 ? 5 : 2;
              for (let k = 0; k < count; k++) {
                const offset = (k - (count - 1) * 0.5) * 0.34;
                fireBolt(baseAngle + offset, 7.9, '#C084FC');
              }
            } else {
              // 'charge' Overlord
              const dashSpd = p2 ? 12.6 : 10.2;
              e.vx = dirX * dashSpd;
              e.vz = dirZ * dashSpd;
              if (p2) {
                for (let k = 0; k < 6; k++) {
                  fireBolt(baseAngle + (k / 6) * Math.PI * 2, 7.5, '#FF5E3A');
                }
              }
            }
          } else {
            e.vx = dirX * (e.kind === 'slime' ? 8.5 : 5.5);
            e.vz = dirZ * (e.kind === 'slime' ? 8.5 : 5.5);
          }
        }
      } else if (e.state === 'attack') {
        const meleeReach =
          e.kind === 'boss' && e.bossPattern === 'slam' && e.bossPhase === 2
            ? e.attackRange + 0.85
            : e.attackRange + 0.45;
        if (e.kind !== 'caster' && !e.dealtHitThisSwing && dist <= meleeReach) {
          e.dealtHitThisSwing = true;
          applyIncomingPlayerHit(e.damage, e.x, e.z, e);
        }
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = e.kind === 'boss' && e.bossPhase === 2 ? 0.38 : 0.55;
        }
      } else if (e.state === 'recover') {
        e.vx *= Math.exp(-9 * dt);
        e.vz *= Math.exp(-9 * dt);
        if (e.stateTimer <= 0) {
          e.state = 'chase';
          e.stateTimer = (e.kind === 'boss' && e.bossPhase === 2 ? 0.38 : 0.6) + rand() * 0.4;
        }
      }

      e.x += e.vx * dt;
      e.z += e.vz * dt;
      pushOutFromObstacles(e, e.radius, sim.obstacles, limit);
    }

    if (livingNonMarauder === 0) {
      if (curRoom && !curRoom.cleared) {
        curRoom.cleared = true;
        out.roomCleared = true;
        if (curRoom.boonOfferEligible && !curRoom.boonOffered) {
          curRoom.boonOffered = true;
          out.boonOffered = true;
        }
      }
      if ((!curRoom || curRoom.hasExitPortal) && !sim.exitPortalOpen) {
        sim.exitPortalOpen = true;
      }
    }

    // Projectiles (enemy or player-deflected!)
    for (let i = sim.projectiles.length - 1; i >= 0; i--) {
      const pr = sim.projectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.z += pr.vz * dt;
      if (
        pr.life <= 0 ||
        Math.abs(pr.x) > sim.arenaHalfExtent ||
        Math.abs(pr.z) > sim.arenaHalfExtent
      ) {
        sim.projectiles.splice(i, 1);
        continue;
      }

      if (pr.deflected) {
        let hitEnemy = false;
        for (const e of sim.enemies) {
          if (e.state === 'ko') continue;
          if (Math.hypot(pr.x - e.x, pr.z - e.z) <= pr.radius + e.radius + 0.15) {
            e.hp -= pr.damage;
            e.hitFlashTimer = 0.14;
            wakeEnemy(e);
            out.enemyHit = true;
            out.hitPopups?.push({
              x: e.x,
              y: 1.4,
              z: e.z,
              text: `⚡ -${pr.damage}`,
              color: '#38E8D8',
              crit: true,
              kind: 'appraisal',
            });
            if (e.hp <= 0) {
              e.hp = 0;
              e.state = 'ko';
              e.koTimer = 0.42;
              dropRelicFromKill(e, true);
            }
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) {
          sim.projectiles.splice(i, 1);
        }
        continue;
      }

      const d = Math.hypot(pr.x - p.x, pr.z - p.z);
      if (d <= pr.radius + 0.42 && p.invulnTimer <= 0 && p.y < 0.6) {
        const prevDeflected = pr.deflected;
        applyIncomingPlayerHit(pr.damage, pr.x, pr.z, undefined, pr);
        if (!pr.deflected || prevDeflected) {
          sim.projectiles.splice(i, 1);
        }
      }
    }

    // Guild Familiar Companion combat & aura pulse
    if (famFx.id !== 'none') {
      sim.familiarCooldown = Math.max(0, sim.familiarCooldown - dt);
      const fx = p.x + Math.cos(sim.familiarAngle) * 0.85;
      const fz = p.z + Math.sin(sim.familiarAngle) * 0.85;
      if (famFx.emberBoltInterval > 0 && sim.familiarCooldown <= 0) {
        let nearest: EnemyEntity | null = null;
        let nearestD = 6.5;
        for (let i = 0; i < sim.enemies.length; i++) {
          const e = sim.enemies[i];
          if (e.state === 'ko' || e.aggroed === false) continue;
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d <= nearestD) {
            nearestD = d;
            nearest = e;
          }
        }
        if (nearest) {
          sim.familiarCooldown = famFx.emberBoltInterval;
          const boltDmg = famFx.emberBoltBaseDmg + sim.floor * 3;
          nearest.hp -= boltDmg;
          nearest.hitFlashTimer = 0.14;
          wakeEnemy(nearest);
          out.familiarBlast = {
            x1: fx,
            y1: p.y + 1.35,
            z1: fz,
            x2: nearest.x,
            y2: 0.9,
            z2: nearest.z,
            color: '#FF5E3A',
            kind: 'ember',
          };
          out.hitPopups?.push({
            x: nearest.x,
            y: 1.5,
            z: nearest.z,
            text: `🔥 -${boltDmg}`,
            color: '#FF9E44',
            crit: true,
            kind: 'dmg',
          });
          if (nearest.hp <= 0) {
            nearest.hp = 0;
            nearest.state = 'ko';
            nearest.koTimer = 0.42;
            dropRelicFromKill(nearest, false);
          }
        }
      } else if (famFx.frostPulseInterval > 0 && sim.familiarCooldown <= 0) {
        let hitTarget: EnemyEntity | null = null;
        for (let i = 0; i < sim.enemies.length; i++) {
          const e = sim.enemies[i];
          if (e.state === 'ko' || e.aggroed === false) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) <= 4.6) {
            e.slowTimer = Math.max(e.slowTimer ?? 0, 2.0);
            if (!hitTarget) hitTarget = e;
          }
        }
        if (hitTarget) {
          sim.familiarCooldown = famFx.frostPulseInterval;
          out.familiarBlast = {
            x1: fx,
            y1: p.y + 1.35,
            z1: fz,
            x2: hitTarget.x,
            y2: 0.9,
            z2: hitTarget.z,
            color: '#38E8D8',
            kind: 'frost',
          };
          out.hitPopups?.push({
            x: hitTarget.x,
            y: 1.45,
            z: hitTarget.z,
            text: '❄ CHILL',
            color: '#38E8D8',
            crit: false,
            kind: 'heal',
          });
        }
      }
    }

    // Pickups outward bounce physics + wide magnetic pull & collect
    const magnetRange = 4.4 + famFx.pickupMagnetBonus;
    for (let i = sim.pickups.length - 1; i >= 0; i--) {
      const pk = sim.pickups[i];
      pk.age += dt;
      if (pk.vx !== undefined && pk.vz !== undefined) {
        pk.x += pk.vx * dt;
        pk.z += pk.vz * dt;
        pk.vx *= Math.exp(-6.5 * dt);
        pk.vz *= Math.exp(-6.5 * dt);
      }
      if (pk.vy !== undefined) {
        pk.vy -= 14.5 * dt;
        pk.y += pk.vy * dt;
        if (pk.y <= 0.36) {
          pk.y = 0.36;
          if (Math.abs(pk.vy) > 1.2) {
            pk.vy = Math.abs(pk.vy) * 0.42;
          } else {
            pk.vy = 0;
          }
        }
      }
      const dx = p.x - pk.x;
      const dz = p.z - pk.z;
      const d = Math.hypot(dx, dz);
      if (d < magnetRange && d > 0.1 && pk.age > 0.25) {
        const pull = 7.8 + Math.max(0, magnetRange - d) * 1.4;
        pk.x += (dx / d) * pull * dt;
        pk.z += (dz / d) * pull * dt;
      }
      if (d < 0.88) {
        out.pickedUpItem = pk.item;
        sim.pickups.splice(i, 1);
        break;
      }
    }

    // Nearby chests, Floor 2 Altar, or open exit portal
    let nearSpot: InteractSpotId | null = null;
    for (let i = 0; i < sim.chests.length; i++) {
      const ch = sim.chests[i];
      if (!ch.opened && Math.hypot(p.x - ch.x, p.z - ch.z) < 1.9) {
        nearSpot = ch.isSecret ? 'secret_chest' : 'chest';
        if (input.interactPressed) {
          if (ch.isMimic && !ch.mimicRevealed) {
            spawnMimicFromChest(ch, false);
          } else {
            ch.opened = true;
            out.chestOpened = true;
            if (famFx.scarabChestGold > 0) {
              out.coinsEarned = (out.coinsEarned ?? 0) + famFx.scarabChestGold;
              out.hitPopups?.push({
                x: ch.x,
                y: 1.45,
                z: ch.z,
                text: `+${famFx.scarabChestGold}g 🪲`,
                color: '#F4B942',
                crit: true,
                kind: 'appraisal',
              });
            }
            const pool = ch.isSecret
              ? relicPool.filter((r) => r.rarity >= 3)
              : relicPool;
            for (let k = 0; k < 2; k++) {
              const tpl = pool[Math.floor(rand() * pool.length)] ?? relicPool[0];
              const uid = `rel_${++sim.uidCounter}`;
              sim.pickups.push({
                id: uid,
                x: ch.x + (k === 0 ? -0.45 : 0.45),
                y: 0.58,
                z: ch.z + 0.55,
                vx: (k === 0 ? -2.2 : 2.2),
                vy: 4.2,
                vz: 2.1,
                item: createRelicInstance(tpl, uid, Boolean(ch.isSecret)),
                age: 0,
              });
            }
          }
        }
        break;
      }
    }

    if (!nearSpot && sim.altar && !sim.altar.used) {
      if (Math.hypot(p.x - sim.altar.x, p.z - sim.altar.z) < 2.15) {
        nearSpot = 'altar';
        if (input.interactPressed) {
          out.interactTarget = 'altar';
        }
      }
    }

    if (!nearSpot && sim.exitPortalOpen) {
      if (Math.hypot(p.x - sim.exitPortalX, p.z - sim.exitPortalZ) < 2.2) {
        nearSpot = 'exit_portal';
        if (input.interactPressed) {
          out.interactTarget = 'exit_portal';
        }
      }
    }

    // Room Doors (unlocked once curRoom.cleared === true)
    if (curRoom && curRoom.cleared) {
      for (let dIdx = 0; dIdx < curRoom.doors.length; dIdx++) {
        const dir = curRoom.doors[dIdx];
        const doorPos = DOOR_POSITIONS[dir];
        const distDoor = Math.hypot(p.x - doorPos.x, p.z - doorPos.z);
        if (!nearSpot && distDoor < 2.25) {
          nearSpot =
            dir === 'N'
              ? 'door_n'
              : dir === 'S'
                ? 'door_s'
                : dir === 'E'
                  ? 'door_e'
                  : 'door_w';
        }
        const walkThrough = sim.doorTransitionCooldown <= 0 && distDoor < 1.25;
        const pressThrough = input.interactPressed && distDoor < 2.25;
        if (walkThrough || pressThrough) {
          if (transitionDungeonRoom(sim, dir)) {
            out.roomTransition = dir;
            nearSpot = null;
          }
          break;
        }
      }
    }
    sim.nearbyInteract = nearSpot;
  } else {
    // Courtyard NPC wandering & zone triggers
    for (let i = 0; i < sim.npcs.length; i++) {
      const npc = sim.npcs[i];
      if (npc.role === 'customer') {
        const dx = npc.targetX - npc.x;
        const dz = npc.targetZ - npc.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const step = 1.45 * dt;
          npc.x += (dx / d) * step;
          npc.z += (dz / d) * step;
          npc.facing = Math.atan2(dx, dz);
          npc.walkPhase += step * 4;
        } else {
          npc.waitTimer -= dt;
          if (npc.waitTimer <= 0) {
            npc.waitTimer = 1.8 + rand() * 2.4;
            npc.targetX = npc.homeX + (rand() - 0.5) * 3.2;
            npc.targetZ = npc.homeZ + (rand() - 0.5) * 2.4;
          }
        }
      } else {
        npc.walkPhase += dt * 2.8;
      }
    }

    let spot: InteractSpotId | null = null;
    if (Math.hypot(p.x - 0, p.z - -5.0) < 2.4) spot = 'gate';
    else if (Math.hypot(p.x - -3.5, p.z - 0.5) < 2.5) spot = 'shop';
    else if (Math.hypot(p.x - 4.3, p.z - -1.2) < 2.5) spot = 'forge';
    else if (Math.hypot(p.x - 4.0, p.z - 3.1) < 2.5) spot = 'alchemy';
    else if (Math.hypot(p.x - -3.8, p.z - 4.4) < 2.3) spot = 'rift';

    sim.nearbyInteract = spot;
    if (spot && input.interactPressed) {
      out.interactTarget = spot;
    }
  }
}
