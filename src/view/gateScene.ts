import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { BagRelicItem, RelicTemplate } from '../systems/backpack';
import {
  rollBoonChoices,
  type BoonDef,
  type BoonId,
} from '../systems/boons';
import type { BossId } from '../systems/bosses';
import {
  ABILITY_MAP,
  ABILITY_ORDER,
  createInitialAbilityCooldowns,
  type AbilityId,
} from '../systems/abilities';
import type { DungeonMode } from '../systems/expedition';
import {
  applyBoonToSim,
  applyShrineChoice,
  createCourtyardSim,
  cycleTargetEnemyId,
  enterDungeonFloor,
  stepWorldSim,
  type DifficultyPreset,
  type DoorDir,
  type EliteAffix,
  type EnemyKind,
  type FloorAnomalyId,
  type InteractSpotId,
  type RoomType,
  type RunModifiers,
  type ShrineChoiceId,
  type ShrineResolution,
  type SimEvents,
  type SimStepInput,
  type WeaponDef,
  type WorldSimState,
  type WorldZone,
} from '../systems/dungeonSim';
import type { InputAxis, InputHub } from '../core/input';
import type { DynamicAudioEngine } from '../core/music';
import {
  getGraphicsLevel,
  GraphicsLevel,
  setCurrentGraphicsLevel,
  type GraphicsQuality,
} from '../core/settings';
import { markGameReady, pushMetricEvent, type GameMetrics } from '../core/metrics';
import {
  createArticulatedHero,
  createEnemyRig,
  createNpcRig,
  createTaperedCrescentGeometry,
  type EnemyVisualRig,
  type NpcVisualRig,
} from './characterMeshes';
import {
  buildCourtyardWorld,
  buildDungeonWorld,
  createRadialGlowTexture,
  type AnimatedWorldHandle,
} from './worldMeshes';
import {
  createVfxOverlay,
  type AimArcSpec,
  type BossTelegraphSpec,
  type GlowSpriteSpec,
  type NpcHintSpec,
} from './vfxOverlay';

export type ShellMode = 'title' | 'playing' | 'paused' | 'modal' | 'gameover' | 'victory';

export interface MinimapRoomHud {
  id: string;
  gx: number;
  gy: number;
  type: RoomType;
  doors: DoorDir[];
  visited: boolean;
  cleared: boolean;
  isCurrent: boolean;
}

export interface ActiveBossHud {
  bossId: BossId;
  nameKey: string;
  titleKey: string;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  isSubBoss: boolean;
}

export interface TargetEnemyHud {
  id: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  bossNameKey?: string;
  isElite: boolean;
  eliteAffix?: EliteAffix;
  burning: boolean;
  chilled: boolean;
  poisoned: boolean;
  stunned: boolean;
  distanceMeters: number;
  tabLocked: boolean;
}

export interface LiveHudState {
  shellMode: ShellMode;
  zone: WorldZone;
  dungeonMode: DungeonMode;
  floor: number;
  floorAnomaly: FloorAnomalyId;
  hp: number;
  maxHp: number;
  potions: number;
  maxPotions: number;
  specialReadyRatio: number;
  jumpReadyRatio: number;
  jumpCharges: number;
  maxJumpCharges: number;
  mana: number;
  maxMana: number;
  dodgeCharges: number;
  maxDodgeCharges: number;
  dodgeReadyRatio: number;
  blocking: boolean;
  aegisShieldHits: number;
  abilityCooldowns: Record<AbilityId, number>;
  abilityCdRatios: Record<AbilityId, number>;
  chainLightningReady: boolean;
  riposteReady: boolean;
  comboStreak: number;
  targetEnemy: TargetEnemyHud | null;
  nearbyInteract: InteractSpotId | null;
  exitPortalOpen: boolean;
  marauderTimer: number;
  marauderSpawned: boolean;
  appraisalFlash: number;
  muted: boolean;
  gamepadConnected?: boolean;
  minimap: MinimapRoomHud[];
  activeBoss: ActiveBossHud | null;
  activeBoons: BoonId[];
  roomCleared: boolean;
  roomType: RoomType;
}

export interface GateSceneCallbacks {
  onHudUpdate: (hud: LiveHudState) => void;
  onPickupRelic: (item: BagRelicItem) => boolean;
  onEarnGold?: (amount: number) => void;
  onInteractSpot: (spot: InteractSpotId) => void;
  onAltarGildBag?: () => void;
  onOfferBoons?: (choices: BoonDef[]) => void;
  onPlayerDied: () => void;
  onEscapeToggle: () => void;
  onBagToggle: () => void;
  onToggleHideHud?: () => void;
  onMimicExposed?: (stunned: boolean) => void;
  onEnemiesKilled?: (types: string[], killedBossId: BossId | null) => void;
  onElitesKilled?: (count: number) => void;
  onPropSmashed?: (count: number) => void;
  onAppraisalStrike?: () => void;
  onGraphicsDowngrade?: (quality: GraphicsQuality) => void;
}

export interface GateSceneHandle {
  setShellMode: (mode: ShellMode) => void;
  setDifficulty: (diff: DifficultyPreset) => void;
  setWeapon: (weapon: WeaponDef, skillMult: number) => void;
  setPlayerCaps: (maxHp: number, maxPotions: number, refillHp: boolean) => void;
  setRunModifiers: (mods: RunModifiers) => void;
  applyBoon: (boonId: BoonId) => void;
  rerollBoons: () => BoonDef[];
  resolveShrineChoice: (choice: ShrineChoiceId) => ShrineResolution;
  setCourtyardVisuals: (opts: {
    prestigeBanners?: boolean;
    weatherStorm?: boolean;
    bountyHint?: string;
  }) => void;
  setTimeOfDay: (ratio: number) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  triggerStationFx: (station: 'forge' | 'alchemy') => void;
  setSeed: (seed: number) => void;
  enterDungeon: (floor: number, week: number, mode?: DungeonMode) => void;
  returnToCourtyard: (week: number, healFull: boolean) => void;
  resetCourtyard: (maxHp: number, maxPotions: number) => void;
  dispose: () => void;
}

interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ShardParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  life: number;
  maxLife: number;
  size: number;
}

const _axis: InputAxis = { x: 0, z: 0 };
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _lookCurrent = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _dummyMat4 = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyEuler = new THREE.Euler();
const _dummyScale = new THREE.Vector3();
const _tmpColor = new THREE.Color();
const _scratchSky = new THREE.Color();
const _scratchLight = new THREE.Color();

function createIgnisFanGeometry(radius: number, halfAngleRad: number, segments = 18): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = -halfAngleRad + (i / segments) * (halfAngleRad * 2);
    const a1 = -halfAngleRad + ((i + 1) / segments) * (halfAngleRad * 2);
    positions.push(
      0, 0, 0,
      Math.sin(a0) * radius, 0, Math.cos(a0) * radius,
      Math.sin(a1) * radius, 0, Math.cos(a1) * radius,
    );
    uvs.push(0.5, 0, i / segments, 1, (i + 1) / segments, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function detectSoftwareWebGL(): boolean {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) ?? '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(20, 27, 45, 0.8)');
  grad.addColorStop(0.55, 'rgba(20, 27, 45, 0.35)');
  grad.addColorStop(1, 'rgba(20, 27, 45, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mountGateScene(
  container: HTMLElement,
  input: InputHub,
  audio: DynamicAudioEngine,
  metrics: GameMetrics,
  seed: number,
  initialWeapon: WeaponDef,
  initialDiff: DifficultyPreset,
  relicPool: RelicTemplate[],
  callbacks: GateSceneCallbacks,
): GateSceneHandle {
  const CinematicGradeShader = {
    uniforms: {
      tDiffuse: { value: null },
      uVignette: { value: 0.36 },
      uAbOffset: { value: 0.0011 },
      uWarmth: { value: 0.045 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uVignette;
      uniform float uAbOffset;
      uniform float uWarmth;
      varying vec2 vUv;
      void main() {
        vec2 centered = vUv - 0.5;
        float dist = length(centered);
        vec2 dir = dist > 0.0001 ? centered / dist : vec2(0.0);
        float shift = uAbOffset * smoothstep(0.28, 0.78, dist);
        float r = texture2D(tDiffuse, vUv + dir * shift).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - dir * shift).b;
        vec3 col = vec3(r, g, b);
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        // Subtle split-tone: cool indigo shadows, warm golden highlights
        vec3 shadowTint = vec3(0.95, 0.98, 1.06);
        vec3 highTint = vec3(1.04, 1.01, 0.96);
        col *= mix(shadowTint, highTint, smoothstep(0.15, 0.85, luma) + uWarmth);
        float vig = 1.0 - smoothstep(0.44, 0.94, dist * 1.15) * uVignette;
        col *= vig;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  };

  const isSoftwareGl = detectSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const width = Math.max(2, container.clientWidth || window.innerWidth || 1280);
  const height = Math.max(2, container.clientHeight || window.innerHeight || 720);
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const courtyardBg = new THREE.Color('#0A0E1E');
  const dungeonBg = new THREE.Color('#070B18');
  const riftBg = new THREE.Color('#140514');
  scene.background = courtyardBg.clone();
  const activeFog = new THREE.FogExp2('#0A0E1E', 0.0175);
  scene.fog = activeFog;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.2, 95);

  // Cohesive Dark Fantasy AAA Lighting Rig: Sky/Ground Fill + Warm Key + Cool Rim + Sanctuary Spot + Dynamic PointLights
  const hemiLight = new THREE.HemisphereLight('#5674C4', '#161020', 0.86);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight('#FFE4C0', 2.3);
  keyLight.position.set(11, 17, 10);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -16;
  keyLight.shadow.camera.right = 16;
  keyLight.shadow.camera.top = 16;
  keyLight.shadow.camera.bottom = -16;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 55;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.024;
  scene.add(keyLight);
  scene.add(keyLight.target);

  const rimLight = new THREE.DirectionalLight('#5A8DFF', 0.95);
  rimLight.position.set(-10, 9.5, -12);
  scene.add(rimLight);

  const gateSpotLight = new THREE.SpotLight('#38E8D8', 6.5, 18, Math.PI / 4, 0.6, 1.3);
  gateSpotLight.position.set(0, 7.2, -3.5);
  gateSpotLight.target.position.set(0, 0, -6.2);
  scene.add(gateSpotLight);
  scene.add(gateSpotLight.target);

  const heroLanternLight = new THREE.PointLight('#FFA64D', 2.25, 7.6, 1.65);
  scene.add(heroLanternLight);

  const gateAccentLight = new THREE.PointLight('#38E8D8', 4.4, 14, 1.35);
  gateAccentLight.position.set(0, 2.8, -5.6);
  scene.add(gateAccentLight);

  const forgeEmberLight = new THREE.PointLight('#FF7B42', 2.8, 10.5, 1.5);
  forgeEmberLight.position.set(5.5, 2.1, -1.4);
  scene.add(forgeEmberLight);

  const shopWarmLight = new THREE.PointLight('#F4B942', 2.4, 9.5, 1.55);
  shopWarmLight.position.set(-4.0, 2.2, 0.6);
  scene.add(shopWarmLight);

  const riftGlowLight = new THREE.PointLight('#F43F5E', 2.4, 9.5, 1.55);
  riftGlowLight.position.set(-5.2, 2.0, 5.2);
  scene.add(riftGlowLight);

  const combatFlashLight = new THREE.PointLight('#FFF4DC', 0, 12, 1.35);
  scene.add(combatFlashLight);
  let combatFlashPower = 0;
  let fovKick = 0;

  // Hardware GPU Post-Processing Pipeline (skipped on SwiftShader software GL to keep renders fast)
  let composerTarget: THREE.WebGLRenderTarget | null = null;
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  if (!isSoftwareGl) {
    const dpr = renderer.getPixelRatio();
    composerTarget = new THREE.WebGLRenderTarget(
      Math.max(2, Math.floor(width * dpr)),
      Math.max(2, Math.floor(height * dpr)),
      {
        type: THREE.HalfFloatType,
        samples: 2,
      },
    );
    composer = new EffectComposer(renderer, composerTarget);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.42, 0.48, 0.86);
    composer.addPass(bloomPass);
    composer.addPass(new ShaderPass(CinematicGradeShader));
    composer.addPass(new OutputPass());
  }

  const inkMat = new THREE.LineBasicMaterial({
    color: '#0D1220',
    transparent: true,
    opacity: 0.46,
  });
  const shadowTex = createContactShadowTexture();
  const glowTex = createRadialGlowTexture(
    'rgba(255,255,255,0.95)',
    'rgba(255,255,255,0.38)',
    'rgba(255,255,255,0)',
    128,
  );
  const vfxOverlay = createVfxOverlay(container);
  const glowSpecs: GlowSpriteSpec[] = [];
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  let rngState = (seed || 1337) >>> 0;
  const rand = () => {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // State
  let shellMode: ShellMode = 'title';
  let currentGraphicsLevel: GraphicsLevel = GraphicsLevel.Ultra;
  let activeWeapon = initialWeapon;
  let activeSkillMult = 1.0;
  let activeDiff = initialDiff;
  let activeRunMods: RunModifiers = {};
  let prestigeBanners = false;
  let weatherStorm = false;
  let timeOfDayRatio = 0.25;
  let bountyHintText = '';
  let sim: WorldSimState = createCourtyardSim(5, 2, rand, activeRunMods);
  let appraisalFlash = 0;
  let cameraYaw = 0;
  let cameraPitch = 0.84;
  let cameraDistDungeon = 21.5;
  let cameraDistCourtyard = 17.2;
  let heroFlourishTimer = 0;
  let targetedEnemyId: string | null = null;
  let tabLockedEnemyId: string | null = null;

  const _dawnSky = new THREE.Color('#0E1630');
  const _duskSky = new THREE.Color('#19122E');
  const _midnightSky = new THREE.Color('#070A18');
  const _dawnLight = new THREE.Color('#FFF0CC');
  const _duskLight = new THREE.Color('#FFB980');
  const _midnightLight = new THREE.Color('#9EB8FF');

  const applyCourtyardAtmosphere = () => {
    if (sim.zone !== 'courtyard') return;
    const bgCol = scene.background instanceof THREE.Color ? scene.background : new THREE.Color();
    if (scene.background !== bgCol) scene.background = bgCol;
    if (weatherStorm) {
      bgCol.set('#16112C');
      activeFog.color.set('#16112C');
      keyLight.color.set('#C8B8FF');
      keyLight.intensity = 1.85;
      return;
    }
    const r = Math.max(0, Math.min(1, timeOfDayRatio));
    if (r < 0.5) {
      _scratchSky.copy(_dawnSky).lerp(_duskSky, r * 2);
      _scratchLight.copy(_dawnLight).lerp(_duskLight, r * 2);
    } else {
      _scratchSky.copy(_duskSky).lerp(_midnightSky, (r - 0.5) * 2);
      _scratchLight.copy(_duskLight).lerp(_midnightLight, (r - 0.5) * 2);
    }
    bgCol.copy(_scratchSky);
    activeFog.color.copy(_scratchSky);
    keyLight.color.copy(_scratchLight);
    keyLight.intensity = 2.32 - r * 0.42;
  };

  // Build Hero
  const heroRig = createArticulatedHero(inkMat, shadowTex, glowTex, maxAniso);
  heroRig.setWeaponVisual(activeWeapon.id);
  scene.add(heroRig.root);

  // Build Courtyard & Dungeon Worlds
  const courtyardWorld: AnimatedWorldHandle = buildCourtyardWorld(inkMat, maxAniso);
  scene.add(courtyardWorld.group);
  let dungeonWorld: AnimatedWorldHandle | null = null;

  // Dynamic Visual Maps
  const enemyRigs = new Map<string, EnemyVisualRig>();
  const npcRigs = new Map<string, NpcVisualRig>();
  const projMeshes = new Map<string, THREE.Group>();
  const waveMeshes = new Map<string, THREE.Group>();
  const pickupMeshes = new Map<string, THREE.Group>();

  const projGeo = new THREE.OctahedronGeometry(0.28, 0);
  const projEnemyMat = new THREE.MeshBasicMaterial({ color: '#FF3B5C' });
  const projDeflectMat = new THREE.MeshBasicMaterial({ color: '#38E8D8' });
  const projGlowGeo = new THREE.PlaneGeometry(1.35, 1.35);
  const projGlowEnemyMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: '#FF3B5C',
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const projGlowDeflectMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: '#38E8D8',
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const waveArcGeo = createTaperedCrescentGeometry(0.62, 1.52, Math.PI * 0.94, 26);
  const waveCoreGeo = createTaperedCrescentGeometry(0.98, 1.36, Math.PI * 0.72, 22);
  const pickupGeo = new THREE.OctahedronGeometry(0.32, 0);
  const pickupShadowGeo = new THREE.CircleGeometry(0.45, 16);
  const pickupShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const pickupMatCache = new Map<string, THREE.MeshPhysicalMaterial>();
  const getPickupMaterial = (colorHex: string, pristine: boolean) => {
    const key = `${colorHex}|${pristine ? 1 : 0}`;
    let mat = pickupMatCache.get(key);
    if (!mat) {
      mat = new THREE.MeshPhysicalMaterial({
        color: colorHex,
        emissive: pristine ? '#F4B942' : colorHex,
        emissiveIntensity: pristine ? 1.85 : 1.05,
        roughness: 0.14,
        metalness: 0.4,
        clearcoat: 1.0,
        iridescence: 0.75,
      });
      mat.userData.cachedPbr = true;
      pickupMatCache.set(key, mat);
    }
    return mat;
  };

  // Pooled 3D transient spell effects (Ignis Fire Cone + Frost Nova / Shatter Expanding Rings)
  const ignisFanGeo = createIgnisFanGeometry(6.3, (72 * Math.PI) / 360, 18);
  const spellRingGeo = new THREE.RingGeometry(0.62, 1.0, 32);
  spellRingGeo.rotateX(-Math.PI / 2);
  interface PooledSpellFx {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    life: number;
    maxLife: number;
    maxScale: number;
    kind: 'cone' | 'ring';
  }
  const SPELL_POOL_SIZE = 8;
  const spellPool: PooledSpellFx[] = Array.from({ length: SPELL_POOL_SIZE }, (_, idx) => {
    const isCone = idx < 2;
    const mat = new THREE.MeshBasicMaterial({
      color: isCone ? '#FF5E3A' : '#38E8D8',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(isCone ? ignisFanGeo : spellRingGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh,
      mat,
      active: false,
      life: 0,
      maxLife: 0.35,
      maxScale: 1,
      kind: isCone ? 'cone' : 'ring',
    };
  });
  const spawnSpellCone3D = (x: number, z: number, facing: number) => {
    const slot = spellPool.find((s) => s.kind === 'cone' && !s.active) ?? spellPool[0];
    slot.active = true;
    slot.maxLife = 0.34;
    slot.life = slot.maxLife;
    slot.maxScale = 1.05;
    slot.mat.color.set('#FF5E3A');
    slot.mat.opacity = 0.65;
    slot.mesh.position.set(x, 0.24, z);
    slot.mesh.rotation.set(0, facing, 0);
    slot.mesh.scale.setScalar(0.28);
    slot.mesh.visible = true;
  };
  const spawnSpellRing3D = (x: number, z: number, radius: number, colorHex: string) => {
    const slot =
      spellPool.find((s) => s.kind === 'ring' && !s.active) ??
      spellPool.find((s) => s.kind === 'ring')!;
    slot.active = true;
    slot.maxLife = 0.4;
    slot.life = slot.maxLife;
    slot.maxScale = radius;
    slot.mat.color.set(colorHex);
    slot.mat.opacity = 0.72;
    slot.mesh.position.set(x, 0.18, z);
    slot.mesh.rotation.set(0, 0, 0);
    slot.mesh.scale.setScalar(0.5);
    slot.mesh.visible = true;
  };

  // Zero-GC Burst Particle Pool
  const POOL_SIZE = 48;
  const particles: BurstParticle[] = Array.from({ length: POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.4,
    size: 0.14,
  }));
  let particleCursor = 0;
  const particleMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.14, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    POOL_SIZE,
  );
  particleMesh.frustumCulled = false;
  // Pre-seed instanceColor & matrices before renderer.compile so USE_INSTANCING_COLOR compiles upfront
  _tmpColor.set('#ffffff');
  _dummyPos.set(0, -15, 0);
  _dummyScale.setScalar(0.0001);
  _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
  for (let i = 0; i < POOL_SIZE; i++) {
    particleMesh.setMatrixAt(i, _dummyMat4);
    particleMesh.setColorAt(i, _tmpColor);
  }
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  scene.add(particleMesh);

  // Zero-GC 3D Pooled Shard Shatter InstancedMesh (urns & crystals)
  const SHARD_POOL = 36;
  const shards: ShardParticle[] = Array.from({ length: SHARD_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    vrx: 0,
    vry: 0,
    life: 0,
    maxLife: 0.7,
    size: 1,
  }));
  let shardCursor = 0;
  const shardMesh = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(0.16, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.22 }),
    SHARD_POOL,
  );
  shardMesh.frustumCulled = false;
  shardMesh.castShadow = !isSoftwareGl;
  _tmpColor.set('#C25B32');
  _dummyPos.set(0, -15, 0);
  _dummyScale.setScalar(0.0001);
  _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
  for (let i = 0; i < SHARD_POOL; i++) {
    shardMesh.setMatrixAt(i, _dummyMat4);
    shardMesh.setColorAt(i, _tmpColor);
  }
  shardMesh.instanceMatrix.needsUpdate = true;
  if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
  scene.add(shardMesh);

  // Stage 9: Floating 3D Guild Familiar companion
  const familiarGroup = new THREE.Group();
  const familiarCoreGeo = new THREE.OctahedronGeometry(0.22, 0);
  const familiarCoreMat = new THREE.MeshStandardMaterial({
    color: '#FF5E3A',
    emissive: '#FF5E3A',
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.2,
  });
  const familiarCore = new THREE.Mesh(familiarCoreGeo, familiarCoreMat);
  const familiarRingGeo = new THREE.TorusGeometry(0.32, 0.032, 8, 20);
  const familiarRingMat = new THREE.MeshBasicMaterial({ color: '#FFF4DC' });
  const familiarRing = new THREE.Mesh(familiarRingGeo, familiarRingMat);
  familiarRing.rotation.x = Math.PI * 0.42;
  familiarGroup.add(familiarCore, familiarRing);
  familiarGroup.visible = false;
  scene.add(familiarGroup);

  // 3D Ambient Dust & Ember Motes (28 instances with zero-GC per-frame drift)
  const MOTE_COUNT = 28;
  const moteGeo = new THREE.OctahedronGeometry(0.055, 0);
  const moteMat = new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const moteMesh = new THREE.InstancedMesh(moteGeo, moteMat, MOTE_COUNT);
  moteMesh.frustumCulled = false;
  for (let i = 0; i < MOTE_COUNT; i++) {
    _tmpColor.set(i % 3 === 0 ? '#56F2E2' : '#FFC675');
    _dummyPos.set(((i * 3.7) % 16) - 8, 0.6 + (i % 5) * 0.48, ((i * 5.3) % 16) - 8);
    _dummyScale.setScalar(0.8);
    _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
    moteMesh.setMatrixAt(i, _dummyMat4);
    moteMesh.setColorAt(i, _tmpColor);
  }
  moteMesh.instanceMatrix.needsUpdate = true;
  if (moteMesh.instanceColor) moteMesh.instanceColor.needsUpdate = true;
  scene.add(moteMesh);

  const sharedGeos = new Set<THREE.BufferGeometry>([
    projGeo,
    projGlowGeo,
    waveArcGeo,
    waveCoreGeo,
    pickupGeo,
    pickupShadowGeo,
    ignisFanGeo,
    spellRingGeo,
    familiarCoreGeo,
    familiarRingGeo,
    moteGeo,
  ]);
  const sharedMats = new Set<THREE.Material>([
    inkMat,
    projEnemyMat,
    projDeflectMat,
    projGlowEnemyMat,
    projGlowDeflectMat,
    pickupShadowMat,
    familiarCoreMat,
    familiarRingMat,
    moteMat,
    ...spellPool.map((s) => s.mat),
  ]);
  const sharedTex = new Set<THREE.Texture>([shadowTex, glowTex, envTexture]);

  const disposeObjectTree = (root: THREE.Object3D) => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    root.traverse((obj) => {
      const geo = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (geo && !sharedGeos.has(geo)) geometries.add(geo);
      const matProp = (obj as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (!matProp) return;
      const matList = Array.isArray(matProp) ? matProp : [matProp];
      for (const m of matList) {
        if (!m || sharedMats.has(m) || m.userData?.cachedPbr) continue;
        materials.add(m);
        const std = m as THREE.MeshStandardMaterial;
        if (std.map && !sharedTex.has(std.map) && !std.map.userData?.cachedPbr) textures.add(std.map);
        if (std.bumpMap && !sharedTex.has(std.bumpMap) && !std.bumpMap.userData?.cachedPbr) textures.add(std.bumpMap);
        if (std.roughnessMap && !sharedTex.has(std.roughnessMap) && !std.roughnessMap.userData?.cachedPbr) textures.add(std.roughnessMap);
        if (std.emissiveMap && !sharedTex.has(std.emissiveMap) && !std.emissiveMap.userData?.cachedPbr) textures.add(std.emissiveMap);
      }
    });
    for (const t of textures) t.dispose();
    for (const m of materials) m.dispose();
    for (const g of geometries) g.dispose();
  };

  const spawnBurst = (
    x: number,
    y: number,
    z: number,
    count: number,
    speed: number,
    hexColor: string,
  ) => {
    if (currentGraphicsLevel < GraphicsLevel.High) return;
    const actualCount =
      currentGraphicsLevel >= GraphicsLevel.Ultra ? count : Math.max(1, Math.round(count * 0.45));
    _tmpColor.set(hexColor);
    for (let i = 0; i < actualCount; i++) {
      const pt = particles[particleCursor];
      const idx = particleCursor;
      particleCursor = (particleCursor + 1) % POOL_SIZE;
      const a = rand() * Math.PI * 2;
      const spd = (0.35 + rand() * 0.75) * speed;
      pt.active = true;
      pt.x = x + (rand() - 0.5) * 0.3;
      pt.y = y + rand() * 0.25;
      pt.z = z + (rand() - 0.5) * 0.3;
      pt.vx = Math.cos(a) * spd;
      pt.vy = 1.4 + rand() * 2.2;
      pt.vz = Math.sin(a) * spd;
      pt.maxLife = 0.28 + rand() * 0.25;
      pt.life = pt.maxLife;
      pt.size = 0.65 + rand() * 0.85;
      particleMesh.setColorAt(idx, _tmpColor);
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnShards = (x: number, z: number, kind: 'urn' | 'crystal') => {
    if (currentGraphicsLevel < GraphicsLevel.High) return;
    const count = currentGraphicsLevel >= GraphicsLevel.Ultra ? 8 : 5;
    _tmpColor.set(kind === 'crystal' ? '#56F2E2' : '#C25B32');
    for (let i = 0; i < count; i++) {
      const sh = shards[shardCursor];
      const idx = shardCursor;
      shardCursor = (shardCursor + 1) % SHARD_POOL;
      const ang = (i / count) * Math.PI * 2 + rand() * 0.5;
      const spd = 2.0 + rand() * 2.6;
      sh.active = true;
      sh.x = x + (rand() - 0.5) * 0.25;
      sh.y = 0.28 + rand() * 0.35;
      sh.z = z + (rand() - 0.5) * 0.25;
      sh.vx = Math.cos(ang) * spd;
      sh.vy = 3.2 + rand() * 2.5;
      sh.vz = Math.sin(ang) * spd;
      sh.rx = rand() * Math.PI;
      sh.ry = rand() * Math.PI;
      sh.rz = rand() * Math.PI;
      sh.vrx = (rand() - 0.5) * 14;
      sh.vry = (rand() - 0.5) * 14;
      sh.maxLife = 0.65 + rand() * 0.3;
      sh.life = sh.maxLife;
      sh.size = 0.75 + rand() * 0.55;
      shardMesh.setColorAt(idx, _tmpColor);
    }
    if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
  };

  const clearDynamicMeshes = () => {
    for (const rig of enemyRigs.values()) {
      scene.remove(rig.root);
      disposeObjectTree(rig.root);
    }
    enemyRigs.clear();
    for (const rig of npcRigs.values()) {
      scene.remove(rig.root);
      disposeObjectTree(rig.root);
    }
    npcRigs.clear();
    for (const m of projMeshes.values()) {
      scene.remove(m);
      disposeObjectTree(m);
    }
    projMeshes.clear();
    for (const m of waveMeshes.values()) {
      scene.remove(m);
      disposeObjectTree(m);
    }
    waveMeshes.clear();
    for (const m of pickupMeshes.values()) {
      scene.remove(m);
      disposeObjectTree(m);
    }
    pickupMeshes.clear();
  };

  const syncZoneScene = () => {
    clearDynamicMeshes();
    if (sim.zone === 'courtyard') {
      courtyardWorld.group.visible = true;
      if (dungeonWorld) {
        scene.remove(dungeonWorld.group);
        dungeonWorld.dispose?.();
        disposeObjectTree(dungeonWorld.group);
        dungeonWorld = null;
      }
      applyCourtyardAtmosphere();
      activeFog.density = currentGraphicsLevel === GraphicsLevel.Low ? 0.0015 : 0.0175;
      hemiLight.color.set('#5674C4');
      hemiLight.groundColor.set('#161020');
      hemiLight.intensity = 0.86;
      rimLight.color.set('#5A8DFF');
      gateSpotLight.color.set('#38E8D8');
      gateSpotLight.position.set(0, 7.2, -3.5);
      gateSpotLight.target.position.set(0, 0, -6.2);
      gateSpotLight.visible = currentGraphicsLevel >= GraphicsLevel.High;
      forgeEmberLight.visible = currentGraphicsLevel >= GraphicsLevel.High;
      shopWarmLight.visible = currentGraphicsLevel >= GraphicsLevel.High;
      riftGlowLight.visible = currentGraphicsLevel >= GraphicsLevel.High;
      audio.setTheme('courtyard_day');
      audio.setLowHpMode(false);
    } else {
      courtyardWorld.group.visible = false;
      if (dungeonWorld) {
        scene.remove(dungeonWorld.group);
        dungeonWorld.dispose?.();
        disposeObjectTree(dungeonWorld.group);
      }
      const curRoom = sim.floorMap ? sim.floorMap.rooms[sim.currentRoomId] : null;
      const roomIndex = sim.floorMap ? Math.max(0, sim.floorMap.roomOrder.indexOf(sim.currentRoomId)) : 0;
      dungeonWorld = buildDungeonWorld(
        inkMat,
        maxAniso,
        sim.chests,
        sim.runeTraps,
        Boolean(sim.altar),
        sim.destructibles,
        {
          week: sim.week,
          dungeonMode: sim.dungeonMode,
          roomType: curRoom?.type ?? 'combat',
          roomIndex,
          doors: curRoom?.doors ?? [],
          obstacles: sim.obstacles,
          hasExitPortal: curRoom ? curRoom.hasExitPortal : true,
          arenaHalfExtent: sim.arenaHalfExtent,
        },
      );
      scene.add(dungeonWorld.group);
      const tl = dungeonWorld.themeLighting;
      const bgCol = scene.background instanceof THREE.Color ? scene.background : new THREE.Color();
      if (scene.background !== bgCol) scene.background = bgCol;
      if (tl) {
        bgCol.set(tl.bg);
        activeFog.color.set(tl.fog);
        keyLight.color.set(tl.keyColor);
        keyLight.intensity = tl.keyIntensity;
        hemiLight.color.set(tl.hemiSky);
        hemiLight.groundColor.set(tl.hemiGround);
        hemiLight.intensity = tl.hemiIntensity;
        rimLight.color.set(tl.rimColor);
        gateSpotLight.color.set(tl.spotColor);
      } else {
        const dBg = sim.dungeonMode === 'rift' ? riftBg : dungeonBg;
        bgCol.copy(dBg);
        activeFog.color.copy(dBg);
        keyLight.color.set(sim.dungeonMode === 'rift' ? '#FF9EB8' : '#9EBFFF');
        keyLight.intensity = 1.72;
        hemiLight.intensity = 0.68;
        rimLight.color.set(sim.dungeonMode === 'rift' ? '#F43F5E' : '#38E8D8');
        gateSpotLight.color.set(curRoom?.type === 'boss' ? '#FF4D6D' : '#38E8D8');
      }
      activeFog.density = currentGraphicsLevel === GraphicsLevel.Low ? 0.0015 : 0.0175;
      gateSpotLight.position.set(0, 8.5, 0);
      gateSpotLight.target.position.set(0, 0, -1.5);
      gateSpotLight.visible = currentGraphicsLevel >= GraphicsLevel.High;
      forgeEmberLight.visible = false;
      shopWarmLight.visible = false;
      riftGlowLight.visible = false;
      const inBossRoom = curRoom?.type === 'boss';
      audio.setTheme(
        sim.dungeonMode === 'rift' || inBossRoom || sim.floor === 3 || sim.marauderSpawned
          ? 'dungeon_boss'
          : 'dungeon_explore',
      );
    }
  };

  const stepEvents: SimEvents = {
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
    deflected: false,
    trapTriggered: null,
    altarActivated: false,
    coinsEarned: 0,
    crystalCharged: false,
    mimicAwakened: false,
    finisherCombo: false,
    echoTriggered: false,
    roomCleared: false,
    roomTransition: null,
    boonOffered: false,
    bossPhase2: false,
    emberVaultBlast: false,
    killedEliteCount: 0,
    volatileBlast: null,
    parryTriggered: false,
    chargedStrike: false,
    chargeBecameReady: false,
    slamLanded: false,
    waveLaunched: false,
    dodged: false,
    riposteTriggered: false,
    blocked: false,
    parried: false,
    abilityCast: null,
    ignisCone: null,
    frostNova: null,
    aegisBurst: false,
    elementalReactions: [],
    impactPoints: [],
    lightningArcs: [],
    hitPopups: [],
    smashedProps: [],
  };
  const stepInput: SimStepInput = {
    moveX: 0,
    moveZ: 0,
    aimDirX: null,
    aimDirZ: null,
    cameraYaw: 0,
    steerWithCamera: false,
    bothMouseHeld: false,
    attackPressed: false,
    attackHeld: false,
    attackReleased: false,
    jumpPressed: false,
    dodgePressed: false,
    blockHeld: false,
    blockPressed: false,
    abilityTriggered: null,
    specialPressed: false,
    interactPressed: false,
    healPressed: false,
  };

  let elapsed = 0;
  let hudAccum = 0;
  let lastInteract: InteractSpotId | null = null;
  let lastHp = sim.player.hp;
  let lastZone: WorldZone = sim.zone;
  let lastRoomId = sim.currentRoomId;
  let lastRoomCleared = false;
  let lastBossHp = -1;
  let lastBoonCount = 0;
  let lastBlocking = false;
  let lastDodgeCharges = sim.player.dodgeCharges;
  let lastAegisHits = 0;
  let lastComboStreak = 0;
  let lastTargetedId: string | null = null;
  let lastTargetedHp = -1;
  let lastRiposteReady = false;
  let lastHudIdleSig = '';
  const _cachedGroundHit: {
    dx: number | null;
    dz: number | null;
    hitX: number | null;
    hitZ: number | null;
  } = { dx: null, dz: null, hitX: null, hitZ: null };

  // Initial camera setup
  camera.position.set(0, 14.2, 16.2);
  _lookCurrent.set(0, 1.3, -1.6);
  camera.lookAt(_lookCurrent);
  if (!isSoftwareGl) renderer.compile(scene, camera);

  const pushHud = (force = false) => {
    if (!force && hudAccum < 0.1) return;
    hudAccum = 0;
    const curRoom = sim.floorMap ? sim.floorMap.rooms[sim.currentRoomId] : null;
    const minimap: MinimapRoomHud[] =
      sim.zone === 'dungeon' && sim.floorMap
        ? sim.floorMap.roomOrder.map((rid) => {
            const r = sim.floorMap!.rooms[rid];
            return {
              id: r.id,
              gx: r.gx,
              gy: r.gy,
              type: r.type,
              doors: r.doors,
              visited: r.visited,
              cleared: r.cleared,
              isCurrent: r.id === sim.currentRoomId,
            };
          })
        : [];
    const bossEnt =
      sim.zone === 'dungeon'
        ? sim.enemies.find((e) => e.kind === 'boss' && e.state !== 'ko')
        : undefined;
    const activeBoss: ActiveBossHud | null =
      bossEnt && bossEnt.bossId && bossEnt.bossNameKey && bossEnt.bossTitleKey
        ? {
            bossId: bossEnt.bossId,
            nameKey: bossEnt.bossNameKey,
            titleKey: bossEnt.bossTitleKey,
            hp: Math.max(0, Math.ceil(bossEnt.hp)),
            maxHp: Math.max(1, Math.ceil(bossEnt.maxHp)),
            phase: bossEnt.bossPhase ?? 1,
            isSubBoss: Boolean(bossEnt.isSubBoss),
          }
        : null;

    const targetEnt =
      sim.zone === 'dungeon' && targetedEnemyId
        ? sim.enemies.find((e) => e.id === targetedEnemyId && e.state !== 'ko')
        : undefined;
    const targetEnemy: TargetEnemyHud | null = targetEnt
      ? {
          id: targetEnt.id,
          kind: targetEnt.kind,
          hp: Math.max(0, Math.ceil(targetEnt.hp)),
          maxHp: Math.max(1, Math.ceil(targetEnt.maxHp)),
          isBoss: targetEnt.kind === 'boss',
          bossNameKey: targetEnt.bossNameKey,
          isElite: Boolean(targetEnt.isElite),
          eliteAffix: targetEnt.eliteAffix,
          burning: (targetEnt.burnTimer ?? 0) > 0.05,
          chilled: (targetEnt.slowTimer ?? 0) > 0.05,
          poisoned: (targetEnt.poisonTimer ?? 0) > 0.05,
          stunned: targetEnt.state === 'stunned',
          distanceMeters: Math.hypot(targetEnt.x - sim.player.x, targetEnt.z - sim.player.z),
          tabLocked: Boolean(tabLockedEnemyId && targetEnt.id === tabLockedEnemyId),
        }
      : null;

    const abilityCooldowns = { ...createInitialAbilityCooldowns(), ...sim.player.abilityCooldowns };
    const abilityCdRatios = { ...createInitialAbilityCooldowns() };
    for (const aid of ABILITY_ORDER) {
      const def = ABILITY_MAP[aid];
      const maxCd =
        aid === 'whirlwind'
          ? Math.max(def.cooldown, activeWeapon.specialCooldown) *
            (sim.mods.specialCooldownMult || 1) *
            (sim.mods.beltSpecialCdMult || 1)
          : def.cooldown * (sim.mods.specialCooldownMult || 1);
      abilityCdRatios[aid] = maxCd > 0 ? Math.max(0, Math.min(1, abilityCooldowns[aid] / maxCd)) : 0;
    }

    const riposteReady = (sim.player.counterTimer ?? 0) > 0.05;
    const manaFloor = Math.floor(sim.player.mana);
    const cdSig = ABILITY_ORDER.map((aid) => abilityCooldowns[aid].toFixed(1)).join(',');
    const hudSig = `${shellMode}|${sim.zone}|${sim.floor}|${sim.player.hp}|${manaFloor}|${sim.player.potions}|${sim.player.dodgeCharges}|${sim.player.jumpCharges}|${sim.player.comboStreak}|${Math.ceil(sim.marauderTimer)}|${sim.exitPortalOpen ? 1 : 0}|${targetEnemy ? `${targetEnemy.id}:${targetEnemy.hp}:${targetEnemy.tabLocked ? 1 : 0}:${Math.round(targetEnemy.distanceMeters * 2)}:${targetEnemy.burning ? 1 : 0}${targetEnemy.chilled ? 1 : 0}${targetEnemy.poisoned ? 1 : 0}${targetEnemy.stunned ? 1 : 0}` : '-'}|${cdSig}|${sim.player.chainLightningReady ? 1 : 0}|${riposteReady ? 1 : 0}|${appraisalFlash > 0 ? appraisalFlash.toFixed(1) : '0'}`;
    if (!force && hudSig === lastHudIdleSig) return;
    lastHudIdleSig = hudSig;

    callbacks.onHudUpdate({
      shellMode,
      zone: sim.zone,
      dungeonMode: sim.dungeonMode,
      floor: sim.floor,
      floorAnomaly: sim.floorAnomaly,
      hp: sim.player.hp,
      maxHp: sim.player.maxHp,
      potions: sim.player.potions,
      maxPotions: sim.player.maxPotions,
      specialReadyRatio:
        activeWeapon.specialCooldown > 0
          ? Math.max(
              0,
              1 -
                sim.player.specialCooldown /
                  (activeWeapon.specialCooldown *
                    (sim.mods.specialCooldownMult || 1) *
                    (sim.mods.beltSpecialCdMult || 1)),
            )
          : 1,
      jumpReadyRatio: Math.max(0, 1 - sim.player.jumpCooldown / 0.52),
      jumpCharges: sim.player.jumpCharges,
      maxJumpCharges: sim.player.maxJumpCharges,
      mana: manaFloor,
      maxMana: sim.player.maxMana,
      dodgeCharges: sim.player.dodgeCharges,
      maxDodgeCharges: sim.player.maxDodgeCharges,
      dodgeReadyRatio:
        sim.player.dodgeCharges < sim.player.maxDodgeCharges
          ? Math.max(0, Math.min(1, 1 - sim.player.dodgeRechargeTimer / 1.35))
          : 1,
      blocking: sim.player.blocking,
      aegisShieldHits: sim.player.aegisShieldHits,
      abilityCooldowns,
      abilityCdRatios,
      chainLightningReady: sim.player.chainLightningReady,
      riposteReady,
      comboStreak: sim.player.comboStreak,
      targetEnemy,
      nearbyInteract: sim.nearbyInteract,
      exitPortalOpen: sim.exitPortalOpen,
      marauderTimer: Math.ceil(sim.marauderTimer),
      marauderSpawned: sim.marauderSpawned,
      appraisalFlash,
      muted: audio.isMuted(),
      gamepadConnected: input.isGamepadConnected(),
      minimap,
      activeBoss,
      activeBoons: sim.activeBoons,
      roomCleared: Boolean(curRoom?.cleared),
      roomType: curRoom?.type ?? 'start',
    });
  };

  const computeGroundHit = (): {
    dx: number | null;
    dz: number | null;
    hitX: number | null;
    hitZ: number | null;
  } => {
    const ptr = input.getPointerPos();
    if (!ptr.active) return { dx: null, dz: null, hitX: null, hitZ: null };
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { dx: null, dz: null, hitX: null, hitZ: null };
    _ndc.x = ((ptr.x - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((ptr.y - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_ndc, camera);
    if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
      const dx = _hitPoint.x - sim.player.x;
      const dz = _hitPoint.z - sim.player.z;
      const len = Math.hypot(dx, dz);
      return {
        dx: len > 0.2 ? dx / len : null,
        dz: len > 0.2 ? dz / len : null,
        hitX: _hitPoint.x,
        hitZ: _hitPoint.z,
      };
    }
    return { dx: null, dz: null, hitX: null, hitZ: null };
  };

  const computeMouseAim = (): { dx: number | null; dz: number | null } => {
    const g = computeGroundHit();
    return { dx: g.dx, dz: g.dz };
  };

  const syncVisualEntities = (dt: number) => {
    const highOrBetter = currentGraphicsLevel >= GraphicsLevel.High;
    const speedRatio = Math.min(1, Math.hypot(sim.player.vx, sim.player.vz) / 6.0);
    const groundHit = computeGroundHit();
    _cachedGroundHit.dx = groundHit.dx;
    _cachedGroundHit.dz = groundHit.dz;
    _cachedGroundHit.hitX = groundHit.hitX;
    _cachedGroundHit.hitZ = groundHit.hitZ;

    // Pick TAB-locked or hovered/nearest living enemy for WC3 selection highlight
    targetedEnemyId = null;
    if (sim.zone === 'dungeon') {
      if (tabLockedEnemyId) {
        const locked = sim.enemies.find((e) => e.id === tabLockedEnemyId && e.state !== 'ko');
        if (locked) {
          targetedEnemyId = locked.id;
        } else {
          tabLockedEnemyId = null;
        }
      }
      if (!targetedEnemyId) {
        let bestDist = Infinity;
        for (const e of sim.enemies) {
          if (e.state === 'ko') continue;
          if (groundHit.hitX !== null && groundHit.hitZ !== null) {
            const dCursor = Math.hypot(e.x - groundHit.hitX, e.z - groundHit.hitZ);
            if (dCursor < 3.6 && dCursor < bestDist) {
              bestDist = dCursor;
              targetedEnemyId = e.id;
            }
          }
        }
      }
      if (!targetedEnemyId) {
        let bestHeroDist = 9.0;
        for (const e of sim.enemies) {
          if (e.state === 'ko' || e.state === 'idle') continue;
          const dHero = Math.hypot(e.x - sim.player.x, e.z - sim.player.z);
          if (dHero < bestHeroDist) {
            bestHeroDist = dHero;
            targetedEnemyId = e.id;
          }
        }
      }
    } else {
      tabLockedEnemyId = null;
    }

    let lookYaw = 0;
    if (groundHit.dx !== null && groundHit.dz !== null && shellMode === 'playing') {
      const aimAngle = Math.atan2(groundHit.dx, groundHit.dz);
      let diff = aimAngle - sim.player.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      lookYaw = diff;
    }

    heroRig.contactShadow.visible = highOrBetter;
    heroRig.groundAura.visible = highOrBetter;
    heroRig.updateAnimation(dt, elapsed, {
      x: sim.player.x,
      y: sim.player.y,
      z: sim.player.z,
      facing: sim.player.facing,
      speedRatio,
      walkPhase: sim.player.walkPhase,
      squashX: sim.player.squashX,
      squashY: sim.player.squashY,
      attackAnimTimer: sim.player.attackAnimTimer,
      specialAnimTimer: sim.player.specialAnimTimer,
      comboStep: sim.player.comboStep,
      hitFlashTimer: sim.player.hitFlashTimer,
      invulnTimer: sim.player.invulnTimer,
      chargeRatio: Math.min(1, sim.player.chargeTimer / 0.36),
      chargeReady: sim.player.chargeReady,
      attackKind: sim.player.attackKind,
      slamPending: sim.player.slamPending,
      weaponId: activeWeapon.id,
      blocking: sim.player.blocking,
      dodging: sim.player.dodgeTimer > 0,
      aegisHits: sim.player.aegisShieldHits,
      lookYaw,
      flourishTimer: heroFlourishTimer,
      riposteReady: (sim.player.counterTimer ?? 0) > 0.05,
    });
    heroLanternLight.position.set(
      sim.player.x - Math.cos(sim.player.facing) * 0.3,
      1.0 + sim.player.y,
      sim.player.z + Math.sin(sim.player.facing) * 0.3,
    );
    heroLanternLight.intensity =
      2.18 + Math.sin(elapsed * 7.4) * 0.16 + Math.cos(elapsed * 13.1) * 0.08;

    if (combatFlashPower > 0.02) {
      combatFlashPower = Math.max(0, combatFlashPower - dt * 6.5);
      combatFlashLight.intensity = combatFlashPower * 8.5;
    } else {
      combatFlashLight.intensity = 0;
    }

    if (highOrBetter && sim.player.chargeTimer > 0.08) {
      const ang = elapsed * 10;
      vfxOverlay.spawnTrailPoint(
        sim.player.x + Math.cos(ang) * 0.72,
        sim.player.y + 0.68,
        sim.player.z + Math.sin(ang) * 0.72,
        sim.player.chargeReady ? '#F4B942' : activeWeapon.color,
        sim.player.chargeReady ? 22 : 14,
        0.18,
      );
    }
    if (
      highOrBetter &&
      shellMode === 'playing' &&
      (sim.player.attackAnimTimer > 0 || sim.player.specialAnimTimer > 0)
    ) {
      const swProg =
        sim.player.specialAnimTimer > 0
          ? (0.45 - sim.player.specialAnimTimer) * 14
          : (0.28 - sim.player.attackAnimTimer) * 11 * (sim.player.comboStep % 2 === 0 ? 1 : -1);
      const tipAng = sim.player.facing + swProg;
      const tipR = Math.min(2.1, activeWeapon.range * 0.62);
      vfxOverlay.spawnTrailPoint(
        sim.player.x + Math.sin(tipAng) * tipR,
        sim.player.y + 0.88,
        sim.player.z + Math.cos(tipAng) * tipR,
        sim.player.specialAnimTimer > 0 || (sim.player.counterTimer ?? 0) > 0.05
          ? '#F4B942'
          : activeWeapon.color,
        sim.player.specialAnimTimer > 0 ? 24 : 16,
        0.15,
      );
    }

    // Texel-snapped dynamic shadow frustum following hero for crisp, shimmer-free shadows
    if (keyLight.castShadow) {
      const snap = 0.25;
      const sx = Math.round(sim.player.x / snap) * snap;
      const sz = Math.round(sim.player.z / snap) * snap;
      keyLight.target.position.set(sx, 0, sz);
      keyLight.position.set(sx + 11, 17, sz + 10);
    }

    if (sim.zone === 'courtyard') {
      forgeEmberLight.intensity = 2.75 + Math.sin(elapsed * 9.5) * 0.42 + Math.cos(elapsed * 14.3) * 0.22;
      shopWarmLight.intensity = 2.35 + Math.sin(elapsed * 3.8) * 0.16;
      riftGlowLight.intensity = 2.35 + Math.sin(elapsed * 4.5) * 0.3;
    }

    if (highOrBetter) {
      moteMesh.visible = true;
      if (shellMode !== 'paused') {
        for (let i = 0; i < MOTE_COUNT; i++) {
          const angle = elapsed * 0.25 + i * 0.85;
          const px = ((i * 3.7 + Math.sin(angle) * 1.4) % 16) - 8;
          const py = 0.45 + ((i * 0.37 + elapsed * 0.18) % 2.8);
          const pz = ((i * 5.3 + Math.cos(angle * 0.8) * 1.4) % 16) - 8;
          const pulse = 0.55 + 0.45 * Math.sin(elapsed * 2.8 + i * 1.7);
          _dummyPos.set(px, py, pz);
          _dummyScale.setScalar(pulse);
          _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
          moteMesh.setMatrixAt(i, _dummyMat4);
        }
        moteMesh.instanceMatrix.needsUpdate = true;
      }
    } else {
      moteMesh.visible = false;
    }

    const famId = sim.mods.familiarId;
    if (famId && famId !== 'none') {
      familiarGroup.visible = true;
      const fx = sim.player.x + Math.cos(sim.familiarAngle) * 0.85;
      const fz = sim.player.z + Math.sin(sim.familiarAngle) * 0.85;
      const fy = sim.player.y + 1.35 + Math.sin(elapsed * 4.2) * 0.12;
      familiarGroup.position.set(fx, fy, fz);
      familiarCore.rotation.y = elapsed * 2.6;
      familiarRing.rotation.z = -elapsed * 1.9;
      const famCol =
        famId === 'ember_wisp'
          ? '#FF5E3A'
          : famId === 'aether_owl'
            ? '#38E8D8'
            : '#F4B942';
      familiarCoreMat.color.set(famCol);
      familiarCoreMat.emissive.set(famCol);
      familiarRingMat.color.set(famCol);
    } else {
      familiarGroup.visible = false;
    }

    const npcHints: NpcHintSpec[] = [];
    if (sim.zone === 'courtyard') {
      courtyardWorld.update(elapsed, false, [], camera.position.x, camera.position.z, {
        prestigeBanners,
      });
      for (const npc of sim.npcs) {
        let rig = npcRigs.get(npc.id);
        if (!rig) {
          rig = createNpcRig(npc.color, npc.role, inkMat, shadowTex, glowTex);
          npcRigs.set(npc.id, rig);
          scene.add(rig.root);
        }
        rig.contactShadow.visible = highOrBetter;
        rig.update(npc.x, npc.z, npc.facing, npc.walkPhase, npc.role, elapsed);
        if (shellMode === 'playing' && (npc.thoughtHint || (npc.id === 'npc_mira' && bountyHintText))) {
          npcHints.push({
            x: npc.x,
            y: 1.75,
            z: npc.z,
            text: npc.id === 'npc_mira' && bountyHintText ? bountyHintText : (npc.thoughtHint ?? ''),
            color: npc.role === 'night_guest' ? '#A855F7' : '#F4B942',
          });
        }
      }
    } else if (dungeonWorld) {
      const curRoom = sim.floorMap ? sim.floorMap.rooms[sim.currentRoomId] : null;
      dungeonWorld.update(
        elapsed,
        sim.exitPortalOpen,
        sim.chests.map((c) => c.opened),
        camera.position.x,
        camera.position.z,
        {
          trapArmed: sim.runeTraps.map((t) => t.cooldown <= 0),
          altarUsed: Boolean(sim.altar?.used),
          destructiblesBroken: sim.destructibles.map((d) => d.broken),
          mimicIndices: sim.chests.map((c) => Boolean(c.isMimic && !c.mimicRevealed)),
          roomCleared: Boolean(curRoom?.cleared),
        },
      );

      // Sync enemies
      const seenEnemies = new Set<string>();
      for (const e of sim.enemies) {
        seenEnemies.add(e.id);
        let rig = enemyRigs.get(e.id);
        if (!rig) {
          rig = createEnemyRig(e.kind, inkMat, shadowTex, glowTex, e.bossId);
          enemyRigs.set(e.id, rig);
          scene.add(rig.root);
        }
        rig.contactShadow.visible = highOrBetter;
        rig.auraDisc.visible = highOrBetter;
        rig.update(e, elapsed, e.id === targetedEnemyId);
      }
      for (const [id, rig] of enemyRigs.entries()) {
        if (!seenEnemies.has(id)) {
          scene.remove(rig.root);
          disposeObjectTree(rig.root);
          enemyRigs.delete(id);
        }
      }

      // Sync projectiles with shared additive glow halo + deflected cyan shift + trailing sparks (High+)
      const seenProj = new Set<string>();
      for (const pr of sim.projectiles) {
        seenProj.add(pr.id);
        let g = projMeshes.get(pr.id);
        if (!g) {
          g = new THREE.Group();
          const core = new THREE.Mesh(projGeo, pr.deflected ? projDeflectMat : projEnemyMat);
          const halo = new THREE.Mesh(
            projGlowGeo,
            pr.deflected ? projGlowDeflectMat : projGlowEnemyMat,
          );
          halo.rotation.x = -Math.PI / 2;
          halo.position.y = -0.62;
          g.add(core, halo);
          projMeshes.set(pr.id, g);
          scene.add(g);
        }
        const coreMesh = g.children[0] as THREE.Mesh;
        const haloMesh = g.children[1] as THREE.Mesh;
        const targetCoreMat = pr.deflected ? projDeflectMat : projEnemyMat;
        const targetHaloMat = pr.deflected ? projGlowDeflectMat : projGlowEnemyMat;
        if (coreMesh.material !== targetCoreMat) coreMesh.material = targetCoreMat;
        if (haloMesh.material !== targetHaloMat) haloMesh.material = targetHaloMat;
        haloMesh.visible = highOrBetter;
        g.position.set(pr.x, pr.y, pr.z);
        coreMesh.rotation.y = elapsed * 8;
        if (highOrBetter) {
          vfxOverlay.spawnTrailPoint(
            pr.x,
            pr.y,
            pr.z,
            pr.deflected ? '#38E8D8' : '#FF3B5C',
            pr.deflected ? 20 : 16,
            0.16,
          );
        }
      }
      for (const [id, g] of projMeshes.entries()) {
        if (!seenProj.has(id)) {
          scene.remove(g);
          disposeObjectTree(g);
          projMeshes.delete(id);
        }
      }

      // Sync piercing 3D Slash Waves
      const seenWaves = new Set<string>();
      for (const wv of sim.slashWaves) {
        seenWaves.add(wv.id);
        let wg = waveMeshes.get(wv.id);
        if (!wg) {
          wg = new THREE.Group();
          const outer = new THREE.Mesh(
            waveArcGeo,
            new THREE.MeshBasicMaterial({
              color: wv.color,
              transparent: true,
              opacity: 0.9,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              depthWrite: false,
            }),
          );
          const core = new THREE.Mesh(
            waveCoreGeo,
            new THREE.MeshBasicMaterial({
              color: '#FFF4DC',
              transparent: true,
              opacity: 0.95,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              depthWrite: false,
            }),
          );
          core.position.y = 0.04;
          wg.add(outer, core);
          waveMeshes.set(wv.id, wg);
          scene.add(wg);
        }
        const lifeRatio = Math.max(0.05, wv.life / wv.maxLife);
        wg.position.set(wv.x, 0.72, wv.z);
        wg.rotation.y = wv.facing;
        wg.scale.setScalar(0.95 + (1 - lifeRatio) * 0.45);
        ((wg.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          Math.min(0.92, lifeRatio * 1.4);
        ((wg.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
          Math.min(0.95, lifeRatio * 1.5);
        if (highOrBetter) {
          vfxOverlay.spawnTrailPoint(wv.x, 0.72, wv.z, wv.color, 28, 0.16);
        }
      }
      for (const [id, wg] of waveMeshes.entries()) {
        if (!seenWaves.has(id)) {
          scene.remove(wg);
          for (const child of wg.children) {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
          waveMeshes.delete(id);
        }
      }

      // Sync pickups with soft shadow & cached physical iridescent crystal core
      const seenPickups = new Set<string>();
      for (const pk of sim.pickups) {
        seenPickups.add(pk.id);
        let g = pickupMeshes.get(pk.id);
        if (!g) {
          g = new THREE.Group();
          const gem = new THREE.Mesh(
            pickupGeo,
            getPickupMaterial(pk.item.color, Boolean(pk.item.pristine)),
          );
          const shadow = new THREE.Mesh(pickupShadowGeo, pickupShadowMat);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = 0.015;
          g.add(gem, shadow);
          pickupMeshes.set(pk.id, g);
          scene.add(g);
        }
        g.children[1].visible = highOrBetter;
        const bobY = pk.y + Math.sin(elapsed * 4 + pk.age) * 0.14;
        g.position.set(pk.x, 0, pk.z);
        g.children[0].position.y = bobY;
        g.children[0].rotation.y = elapsed * 2.5;
      }
      for (const [id, g] of pickupMeshes.entries()) {
        if (!seenPickups.has(id)) {
          scene.remove(g);
          pickupMeshes.delete(id);
        }
      }
    }

    // Update pooled 3D transient spell effects (Ignis Fire Cone + Frost Nova / Shatter Rings)
    for (let i = 0; i < spellPool.length; i++) {
      const sp = spellPool[i];
      if (!sp.active) continue;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      const prog = 1 - sp.life / sp.maxLife;
      if (sp.kind === 'cone') {
        sp.mesh.scale.setScalar(0.28 + prog * (sp.maxScale - 0.28));
        sp.mat.opacity = Math.max(0, (1 - prog) * 0.65);
      } else {
        sp.mesh.scale.setScalar(0.5 + prog * (sp.maxScale - 0.5));
        sp.mat.opacity = Math.max(0, (1 - prog) * 0.72);
      }
    }

    // Update burst particles (ONLY at High+)
    if (highOrBetter) {
      particleMesh.visible = true;
      for (let i = 0; i < POOL_SIZE; i++) {
        const pt = particles[i];
        if (!pt.active) {
          _dummyScale.setScalar(0.0001);
          _dummyPos.set(0, -15, 0);
          _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
          particleMesh.setMatrixAt(i, _dummyMat4);
          continue;
        }
        pt.life -= dt;
        if (pt.life <= 0) {
          pt.active = false;
          _dummyScale.setScalar(0.0001);
          _dummyPos.set(0, -15, 0);
          _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
          particleMesh.setMatrixAt(i, _dummyMat4);
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z += pt.vz * dt;
        pt.vy -= 5.2 * dt;
        const ratio = pt.life / pt.maxLife;
        _dummyPos.set(pt.x, Math.max(0.06, pt.y), pt.z);
        _dummyScale.setScalar(pt.size * ratio);
        _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
        particleMesh.setMatrixAt(i, _dummyMat4);
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      shardMesh.visible = true;
      for (let i = 0; i < SHARD_POOL; i++) {
        const sh = shards[i];
        if (!sh.active) {
          _dummyScale.setScalar(0.0001);
          _dummyPos.set(0, -15, 0);
          _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
          shardMesh.setMatrixAt(i, _dummyMat4);
          continue;
        }
        sh.life -= dt;
        if (sh.life <= 0) {
          sh.active = false;
          _dummyScale.setScalar(0.0001);
          _dummyPos.set(0, -15, 0);
          _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
          shardMesh.setMatrixAt(i, _dummyMat4);
          continue;
        }
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.z += sh.vz * dt;
        sh.vy -= 12.5 * dt;
        if (sh.y < 0.08) {
          sh.y = 0.08;
          sh.vy = Math.abs(sh.vy) * 0.42;
          sh.vx *= 0.72;
          sh.vz *= 0.72;
        }
        sh.rx += sh.vrx * dt;
        sh.ry += sh.vry * dt;
        const ratio = Math.min(1, (sh.life / sh.maxLife) * 1.4);
        _dummyPos.set(sh.x, sh.y, sh.z);
        _dummyEuler.set(sh.rx, sh.ry, sh.rz);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.setScalar(sh.size * ratio);
        _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
        shardMesh.setMatrixAt(i, _dummyMat4);
      }
      _dummyQuat.set(0, 0, 0, 1);
      shardMesh.instanceMatrix.needsUpdate = true;

      // Hero motion trails + Ghost Afterimages during dodge roll / jump / special dash
      if (sim.player.jumpTimer > 0 || sim.player.specialAnimTimer > 0) {
        vfxOverlay.spawnTrailPoint(
          sim.player.x,
          sim.player.y + 0.65,
          sim.player.z,
          sim.player.specialAnimTimer > 0 ? '#F4B942' : '#38E8D8',
          26,
          0.24,
        );
        if (sim.player.jumpTimer > 0 && currentGraphicsLevel >= GraphicsLevel.Ultra) {
          vfxOverlay.spawnGhostAfterimage(
            sim.player.x,
            sim.player.y,
            sim.player.z,
            sim.player.chainLightningReady ? '#F4B942' : '#38E8D8',
          );
        }
      }

      // Collect additive Bloom sprite locations for Canvas 2D post-processing
      glowSpecs.length = 0;
      glowSpecs.push({
        x: sim.player.x,
        y: sim.player.y + 0.85,
        z: sim.player.z,
        color: sim.player.specialAnimTimer > 0 ? 'amber' : 'teal',
        radiusPx: 72,
        alpha: 0.42,
      });
      glowSpecs.push({
        x: 0,
        y: 2.2,
        z: -6.0,
        color: 'teal',
        radiusPx: 118,
        alpha: 0.56,
      });
      if (sim.zone === 'courtyard') {
        glowSpecs.push(
          { x: 5.5, y: 1.4, z: -1.4, color: 'amber', radiusPx: 92, alpha: 0.52 },
          { x: -3.5, y: 2.1, z: 0.6, color: 'amber', radiusPx: 76, alpha: 0.44 },
          { x: 5.1, y: 1.1, z: 3.4, color: 'teal', radiusPx: 68, alpha: 0.42 },
        );
      } else {
        for (const e of sim.enemies) {
          if (e.state === 'ko') continue;
          glowSpecs.push({
            x: e.x,
            y: 0.8,
            z: e.z,
            color:
              e.kind === 'caster'
                ? 'violet'
                : e.kind === 'marauder' || e.state === 'windup'
                  ? 'crimson'
                  : e.kind === 'boss'
                    ? 'amber'
                    : 'teal',
            radiusPx: e.kind === 'boss' ? 96 : 60,
            alpha: e.state === 'windup' ? 0.62 : 0.36,
          });
        }
        for (const pr of sim.projectiles) {
          glowSpecs.push({
            x: pr.x,
            y: pr.y,
            z: pr.z,
            color: 'crimson',
            radiusPx: 48,
            alpha: 0.68,
          });
        }
        for (const pk of sim.pickups) {
          glowSpecs.push({
            x: pk.x,
            y: pk.y + 0.25,
            z: pk.z,
            color: pk.item.pristine ? 'amber' : 'teal',
            radiusPx: pk.item.pristine ? 54 : 38,
            alpha: 0.55,
          });
        }
        for (const dest of sim.destructibles) {
          if (dest.broken || dest.kind !== 'crystal') continue;
          glowSpecs.push({
            x: dest.x,
            y: 0.7,
            z: dest.z,
            color: 'teal',
            radiusPx: 46,
            alpha: 0.42,
          });
        }
      }
    } else {
      particleMesh.visible = false;
      shardMesh.visible = false;
      glowSpecs.length = 0;
    }

    // Camera follow + Spherical Orbit + trauma shake (High+ only)
    const damp = 1 - Math.exp(-9.0 * dt);
    if (shellMode === 'title') {
      const angle = elapsed * 0.22;
      _camGoal.set(Math.sin(angle) * 4.5, 13.6, 15.8 + Math.cos(angle) * 1.4);
      _lookGoal.set(0, 1.35, -1.6);
    } else {
      const shake = highOrBetter
        ? sim.trauma * sim.trauma * (currentGraphicsLevel >= GraphicsLevel.Ultra ? 0.55 : 0.32)
        : 0;
      const sx = shake > 0.004 ? (rand() - 0.5) * shake : 0;
      const sy = shake > 0.004 ? (rand() - 0.5) * shake : 0;
      const dist = sim.zone === 'dungeon' ? cameraDistDungeon : cameraDistCourtyard;
      const horiz = dist * Math.cos(cameraPitch);
      const offsetX = Math.sin(cameraYaw) * horiz;
      const offsetY = dist * Math.sin(cameraPitch);
      const offsetZ = Math.cos(cameraYaw) * horiz;
      _camGoal.set(sim.player.x + offsetX + sx, sim.player.y + offsetY + sy, sim.player.z + offsetZ);
      _lookGoal.set(sim.player.x, sim.player.y + 0.9, sim.player.z);
    }
    camera.position.lerp(_camGoal, damp);
    _lookCurrent.lerp(_lookGoal, damp);
    camera.lookAt(_lookCurrent);
    if (Math.abs(fovKick) > 0.02) {
      fovKick *= Math.exp(-11 * dt);
      const baseFov = computeAspectFov(currentWidth, currentHeight);
      camera.fov = baseFov + fovKick;
      camera.updateProjectionMatrix();
    } else if (fovKick !== 0) {
      fovKick = 0;
      camera.fov = computeAspectFov(currentWidth, currentHeight);
      camera.updateProjectionMatrix();
    }
    return { npcHints };
  };

  syncZoneScene();
  syncVisualEntities(0.016);
  renderer.render(scene, camera);
  markGameReady();

  const computeAspectFov = (w: number, h: number) => {
    const aspect = w / Math.max(1, h);
    return aspect < 0.9 ? Math.min(54, 36 + (0.9 - aspect) * 32) : 36;
  };
  camera.fov = computeAspectFov(width, height);
  camera.updateProjectionMatrix();

  const computeSafeRendererDpr = (w: number, h: number, level: GraphicsLevel) => {
    if (isSoftwareGl) return 1;
    const raw = window.devicePixelRatio || 1;
    const cap =
      level === GraphicsLevel.Low
        ? 1
        : level === GraphicsLevel.Medium
          ? 1.1
          : level === GraphicsLevel.High
            ? 1.35
            : 1.5;
    let chosen = Math.min(raw, cap);
    const maxDim = Math.max(w, h);
    if (maxDim * chosen > 2560) {
      chosen = Math.max(0.75, 2560 / Math.max(1, maxDim));
    }
    return chosen;
  };

  let currentWidth = width;
  let currentHeight = height;

  const onResize = () => {
    const rawW = container.clientWidth || window.innerWidth;
    const rawH = container.clientHeight || window.innerHeight;
    if (rawW < 2 || rawH < 2) return;
    currentWidth = rawW;
    currentHeight = rawH;
    camera.aspect = rawW / rawH;
    camera.fov = computeAspectFov(rawW, rawH);
    camera.updateProjectionMatrix();
    const safeDpr = computeSafeRendererDpr(rawW, rawH, currentGraphicsLevel);
    renderer.setPixelRatio(safeDpr);
    renderer.setSize(rawW, rawH, false);
    if (composer) {
      composer.setPixelRatio(safeDpr);
      composer.setSize(rawW, rawH);
    }
    vfxOverlay.resize(rawW, rawH);
    const useComposer = Boolean(composer) && !isSoftwareGl && currentGraphicsLevel >= GraphicsLevel.High;
    if (!contextLost) {
      if (useComposer) {
        composer!.render();
      } else {
        renderer.render(scene, camera);
      }
    }
  };
  const resizeObs = new ResizeObserver(onResize);
  resizeObs.observe(container);
  window.addEventListener('resize', onResize);

  const FIXED_STEP = 1 / 60;
  let acc = 0;
  let lastNow = performance.now();
  let frameId = 0;
  let disposed = false;
  let contextLost = false;
  let consecutiveRenderErrors = 0;
  let loggedRenderError = false;

  const applyQualityInternal = (quality: GraphicsQuality) => {
    const level = getGraphicsLevel(quality);
    currentGraphicsLevel = level;
    setCurrentGraphicsLevel(quality);
    vfxOverlay.setGraphicsLevel(level);

    const safeDpr = computeSafeRendererDpr(currentWidth, currentHeight, level);
    renderer.setPixelRatio(safeDpr);
    if (composer) {
      composer.setPixelRatio(safeDpr);
      composer.setSize(currentWidth, currentHeight);
    }
    if (bloomPass) {
      bloomPass.strength = level >= GraphicsLevel.Ultra ? 0.42 : 0.26;
    }

    const enableShadows = !isSoftwareGl && level >= GraphicsLevel.High;
    keyLight.castShadow = enableShadows;
    renderer.shadowMap.autoUpdate = enableShadows;
    if (enableShadows) {
      renderer.shadowMap.needsUpdate = true;
    }

    // Toggle environment & FogExp2 smoothly via intensity/density rather than nullifying (avoids mid-frame shader recompile crashes)
    scene.environmentIntensity = level === GraphicsLevel.Low ? 0 : 0.95;
    activeFog.density =
      level === GraphicsLevel.Low ? 0.0015 : sim.zone === 'courtyard' ? 0.0175 : 0.022;
    if (sim.zone === 'courtyard') applyCourtyardAtmosphere();
    else activeFog.color.copy(sim.dungeonMode === 'rift' ? riftBg : dungeonBg);

    heroLanternLight.visible = level >= GraphicsLevel.Medium;
    gateAccentLight.visible = level >= GraphicsLevel.High;
    gateSpotLight.visible = level >= GraphicsLevel.High;
    forgeEmberLight.visible = sim.zone === 'courtyard' && level >= GraphicsLevel.High;
    shopWarmLight.visible = sim.zone === 'courtyard' && level >= GraphicsLevel.High;
    riftGlowLight.visible = sim.zone === 'courtyard' && level >= GraphicsLevel.High;
    particleMesh.visible = level >= GraphicsLevel.High;
    shardMesh.visible = level >= GraphicsLevel.High;
    moteMesh.visible = level >= GraphicsLevel.High;

    if (level < GraphicsLevel.High) {
      for (let i = 0; i < POOL_SIZE; i++) particles[i].active = false;
      for (let i = 0; i < SHARD_POOL; i++) shards[i].active = false;
      glowSpecs.length = 0;
    }
  };

  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
  };
  const onContextRestored = () => {
    contextLost = false;
    consecutiveRenderErrors = 0;
    if (currentGraphicsLevel >= GraphicsLevel.High) {
      applyQualityInternal('medium');
      callbacks.onGraphicsDowngrade?.('medium');
    }
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  const afterDraw = (cb: () => void) => {
    const gl = renderer.getContext() as WebGL2RenderingContext | null;
    if (!gl || (typeof gl.isContextLost === 'function' && gl.isContextLost())) {
      frameId = window.setTimeout(cb, 20);
      return;
    }
    const sync = typeof gl.fenceSync === 'function' ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (!sync) {
      frameId = window.setTimeout(cb, 20);
      return;
    }
    gl.flush();
    const poll = () => {
      if (disposed) {
        gl.deleteSync(sync);
        return;
      }
      const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (st === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 20);
      }
    };
    frameId = window.setTimeout(poll, 5);
  };

  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    const rawDt = Math.max(0.001, (now - lastNow) / 1000);
    lastNow = now;
    const dt = Math.min(rawDt, isSoftwareGl ? 0.25 : 0.05);

    input.pollGamepad();

    if (input.consumeJustPressed('KeyM')) {
      audio.unlock();
      audio.setMuted(!audio.isMuted());
      pushHud(true);
    }

    if (shellMode === 'playing' && input.consumeJustPressed('KeyH')) {
      callbacks.onToggleHideHud?.();
    }

    if (shellMode === 'playing' || shellMode === 'paused' || shellMode === 'modal') {
      if (input.consumeJustPressed('Escape') || input.consumeJustPressed('KeyP')) {
        audio.unlock();
        callbacks.onEscapeToggle();
      }
      if (
        shellMode === 'playing' &&
        (input.consumeActionJustPressed('bag') || input.consumeJustPressed('KeyI'))
      ) {
        audio.unlock();
        callbacks.onBagToggle();
      }
    }

    if (shellMode !== 'paused') {
      elapsed += dt;
      heroFlourishTimer = Math.max(0, heroFlourishTimer - dt);
    }
    appraisalFlash = Math.max(0, appraisalFlash - dt);

    if (shellMode === 'title') {
      const clickPt = input.consumeCanvasClick();
      if (clickPt) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          _ndc.x = ((clickPt.x - rect.left) / rect.width) * 2 - 1;
          _ndc.y = -((clickPt.y - rect.top) / rect.height) * 2 + 1;
          _raycaster.setFromCamera(_ndc, camera);
          if (_raycaster.intersectObject(heroRig.root, true).length > 0) {
            heroFlourishTimer = 0.55;
            audio.unlock();
            audio.playBlock(true);
            spawnBurst(sim.player.x, 1.0, sim.player.z, 12, 3.2, '#F4B942');
            vfxOverlay.spawnSparks(sim.player.x, 1.0, sim.player.z, 10, 4.5, '#F4B942');
          }
        }
      }
      input.consumeOrbitDelta();
      input.consumeWheelDelta();
    } else if (shellMode === 'playing') {
      const orb = input.consumeOrbitDelta();
      const wheel = input.consumeWheelDelta();
      input.consumeCanvasClick();

      if (orb.dragging) {
        cameraYaw -= orb.dx * 0.0055;
        cameraPitch = Math.max(0.38, Math.min(1.28, cameraPitch + orb.dy * 0.0045));
      }
      if (wheel !== 0) {
        const zoomStep = wheel * 0.012;
        if (sim.zone === 'dungeon') {
          cameraDistDungeon = Math.max(11.0, Math.min(30.0, cameraDistDungeon + zoomStep));
        } else {
          cameraDistCourtyard = Math.max(5.5, Math.min(26.0, cameraDistCourtyard + zoomStep));
        }
      }

      if (input.consumeJustPressed('Tab') && sim.zone === 'dungeon') {
        const nextId = cycleTargetEnemyId(
          sim.enemies,
          sim.player.x,
          sim.player.z,
          tabLockedEnemyId ?? targetedEnemyId,
        );
        tabLockedEnemyId = nextId;
        targetedEnemyId = nextId;
        audio.unlock();
        audio.playUiClick();
        if (nextId) {
          const lockedEnt = sim.enemies.find((e) => e.id === nextId);
          if (lockedEnt) {
            vfxOverlay.spawnShockwave(lockedEnt.x, 0.16, lockedEnt.z, 72, '#F4B942', 0.28);
          }
        }
        pushHud(true);
      }

      input.getMoveAxis(_axis);
      const attackPressed = input.consumeActionJustPressed('attack');
      const attackHeld = input.isActionHeld('attack');
      const attackReleased = input.consumeActionReleased('attack');
      const jumpPressed = input.consumeActionJustPressed('jump');
      const dodgePressed = input.consumeActionJustPressed('dodge');
      const blockPressed = input.consumeActionJustPressed('block');
      const blockHeld = input.isActionHeld('block');
      const interactPressed = input.consumeActionJustPressed('interact');
      const healPressed = input.consumeActionJustPressed('heal');

      const steerWithCamera = orb.rmb;
      const bothMouseHeld = orb.lmb && orb.rmb;

      let abilityTriggered: AbilityId | null = null;
      const abilityActionKeys = [
        'ability1',
        'ability2',
        'ability3',
        'ability4',
        'ability5',
        'ability6',
      ] as const;
      for (let ai = 0; ai < abilityActionKeys.length; ai++) {
        if (input.consumeActionJustPressed(abilityActionKeys[ai])) {
          abilityTriggered = ABILITY_ORDER[ai];
          break;
        }
      }

      if (
        attackPressed ||
        attackReleased ||
        jumpPressed ||
        dodgePressed ||
        blockPressed ||
        abilityTriggered !== null ||
        interactPressed ||
        healPressed ||
        _axis.x !== 0 ||
        _axis.z !== 0
      ) {
        audio.unlock();
      }

      let aim =
        !(orb.dragging && !orb.rmb) &&
        (attackPressed ||
          attackReleased ||
          jumpPressed ||
          dodgePressed ||
          blockHeld ||
          abilityTriggered !== null)
          ? computeMouseAim()
          : { dx: null, dz: null };
      if (aim.dx === null && aim.dz === null && tabLockedEnemyId && sim.zone === 'dungeon') {
        const lockedEnt = sim.enemies.find((e) => e.id === tabLockedEnemyId && e.state !== 'ko');
        if (lockedEnt) {
          const ldx = lockedEnt.x - sim.player.x;
          const ldz = lockedEnt.z - sim.player.z;
          const len = Math.hypot(ldx, ldz);
          if (len > 0.2) aim = { dx: ldx / len, dz: ldz / len };
        }
      }
      stepInput.moveX = _axis.x;
      stepInput.moveZ = _axis.z;
      stepInput.aimDirX = aim.dx;
      stepInput.aimDirZ = aim.dz;
      stepInput.cameraYaw = cameraYaw;
      stepInput.steerWithCamera = steerWithCamera;
      stepInput.bothMouseHeld = bothMouseHeld;
      stepInput.attackPressed = attackPressed;
      stepInput.attackHeld = attackHeld;
      stepInput.attackReleased = attackReleased;
      stepInput.jumpPressed = jumpPressed;
      stepInput.dodgePressed = dodgePressed;
      stepInput.blockHeld = blockHeld;
      stepInput.blockPressed = blockPressed;
      stepInput.abilityTriggered = abilityTriggered;
      stepInput.specialPressed = abilityTriggered === 'whirlwind';
      stepInput.interactPressed = interactPressed;
      stepInput.healPressed = healPressed;

      acc += dt;
      let first = true;
      while (acc >= FIXED_STEP) {
        stepWorldSim(
          sim,
          first
            ? stepInput
            : {
                moveX: _axis.x,
                moveZ: _axis.z,
                aimDirX: null,
                aimDirZ: null,
                cameraYaw,
                steerWithCamera,
                bothMouseHeld,
                attackPressed: false,
                attackHeld,
                attackReleased: false,
                jumpPressed: false,
                dodgePressed: false,
                blockHeld,
                blockPressed: false,
                abilityTriggered: null,
                specialPressed: false,
                interactPressed: false,
                healPressed: false,
              },
          activeWeapon,
          activeSkillMult,
          activeDiff,
          relicPool,
          rand,
          FIXED_STEP,
          stepEvents,
        );
        first = false;
        acc -= FIXED_STEP;

        if (stepEvents.stepped) {
          audio.playStep(rand());
          spawnBurst(sim.player.x, 0.1, sim.player.z, 2, 1.2, '#EDE0C8');
        }
        if (stepEvents.dodged) {
          audio.playDodge();
          spawnBurst(sim.player.x, 0.25, sim.player.z, 10, 3.4, '#38E8D8');
          vfxOverlay.spawnGhostAfterimage(sim.player.x, sim.player.y, sim.player.z, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.12, sim.player.z, 52, '#38E8D8', 0.26);
          metrics.dodgeCount += 1;
          pushMetricEvent(metrics, 'dodge');
        }
        if (stepEvents.riposteTriggered) {
          audio.playAppraisal();
          combatFlashLight.color.set('#F4B942');
          combatFlashLight.position.set(sim.player.x, 1.35, sim.player.z);
          combatFlashPower = 0.95;
          spawnBurst(sim.player.x, 0.85, sim.player.z, 12, 3.8, '#F4B942');
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 108, '#F4B942', 0.34);
          vfxOverlay.spawnSparks(sim.player.x, 0.85, sim.player.z, 10, 5.0, '#FFF4DC');
        }
        if (stepEvents.blocked) {
          audio.playBlock(false);
          spawnBurst(sim.player.x, 0.85, sim.player.z, 8, 2.8, '#9EB4DA');
          vfxOverlay.spawnShockwave(sim.player.x, 0.35, sim.player.z, 62, '#9EB4DA', 0.24);
        }
        if (stepEvents.parried) {
          audio.playBlock(true);
          fovKick = -1.8;
          combatFlashLight.color.set('#38E8D8');
          combatFlashLight.position.set(sim.player.x, 1.3, sim.player.z);
          combatFlashPower = 0.9;
          spawnBurst(sim.player.x, 0.95, sim.player.z, 14, 4.2, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 112, '#38E8D8', 0.36);
        }
        if (stepEvents.ignisCone) {
          audio.playSpellCast('fire');
          fovKick = -1.6;
          combatFlashLight.color.set('#FF5E3A');
          combatFlashLight.position.set(sim.player.x, 1.3, sim.player.z);
          combatFlashPower = 1.0;
          const ic = stepEvents.ignisCone;
          spawnSpellCone3D(ic.x, ic.z, ic.facing);
          for (let f = 0; f < 5; f++) {
            const ang = ic.facing + (f - 2) * 0.22;
            const fx = ic.x + Math.sin(ang) * (1.8 + f * 0.65);
            const fz = ic.z + Math.cos(ang) * (1.8 + f * 0.65);
            spawnBurst(fx, 0.65, fz, 6, 3.6, f % 2 === 0 ? '#FF5E3A' : '#F4B942');
            vfxOverlay.spawnSparks(fx, 0.6, fz, 5, 4.5, '#FF7B42');
          }
          vfxOverlay.spawnShockwave(
            ic.x + Math.sin(ic.facing) * 2.2,
            0.2,
            ic.z + Math.cos(ic.facing) * 2.2,
            116,
            '#FF5E3A',
            0.34,
          );
        }
        if (stepEvents.frostNova) {
          audio.playSpellCast('frost');
          fovKick = -1.9;
          combatFlashLight.color.set('#38E8D8');
          combatFlashLight.position.set(sim.player.x, 1.4, sim.player.z);
          combatFlashPower = 1.0;
          spawnSpellRing3D(stepEvents.frostNova.x, stepEvents.frostNova.z, stepEvents.frostNova.radius, '#38E8D8');
          spawnBurst(sim.player.x, 0.45, sim.player.z, 18, 5.2, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.2, sim.player.z, 180, '#38E8D8', 0.44);
          vfxOverlay.spawnSparks(sim.player.x, 0.65, sim.player.z, 16, 6.2, '#A3FFF6');
        }
        if (stepEvents.elementalReactions && stepEvents.elementalReactions.length > 0) {
          audio.playAppraisal();
          for (const er of stepEvents.elementalReactions) {
            const rxCol = er.kind === 'shatter' ? '#F4B942' : '#A855F7';
            spawnSpellRing3D(er.x, er.z, 3.6, rxCol);
            spawnBurst(er.x, 0.65, er.z, 14, 4.8, rxCol);
            vfxOverlay.spawnShockwave(er.x, 0.22, er.z, 148, rxCol, 0.4);
            vfxOverlay.spawnSlashStar(er.x, 0.7, er.z, rxCol, true);
            combatFlashLight.color.set(rxCol);
            combatFlashLight.position.set(er.x, 1.2, er.z);
            combatFlashPower = 1.0;
          }
        }
        if (stepEvents.aegisBurst) {
          audio.playSpellCast('aegis');
          combatFlashLight.color.set('#F4B942');
          combatFlashLight.position.set(sim.player.x, 1.3, sim.player.z);
          combatFlashPower = 0.85;
          spawnBurst(sim.player.x, 0.8, sim.player.z, 14, 3.8, '#F4B942');
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 126, '#F4B942', 0.36);
        }
        if (stepEvents.abilityCast === 'blade_volley') {
          audio.playSpellCast('whirl');
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 88, '#F4B942', 0.3);
        }
        if (stepEvents.jumped) {
          audio.playJump();
          spawnBurst(sim.player.x, 0.15, sim.player.z, 8, 2.5, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.08, sim.player.z, 54, '#38E8D8', 0.28);
          vfxOverlay.spawnSparks(sim.player.x, 0.2, sim.player.z, 7, 3.6, '#38E8D8');
          metrics.dodgeCount += 1;
          pushMetricEvent(metrics, 'jump');
        }
        if (stepEvents.chargeBecameReady) {
          audio.playChargeReady();
          vfxOverlay.spawnShockwave(sim.player.x, 0.18, sim.player.z, 64, '#F4B942', 0.26);
          vfxOverlay.spawnSparks(sim.player.x, 0.75, sim.player.z, 8, 3.8, '#FFF4DC');
        }
        if (stepEvents.swungCombo >= 0) {
          audio.playSwing(stepEvents.swungCombo);
          if (stepEvents.swungCombo === 2) {
            vfxOverlay.spawnGhostAfterimage(sim.player.x, sim.player.y, sim.player.z, activeWeapon.color);
          }
        }
        if (stepEvents.chargedStrike) {
          audio.playSwing(3);
          audio.playSlam();
          fovKick = -2.4;
          combatFlashLight.color.set('#F4B942');
          combatFlashLight.position.set(sim.player.x, 1.35, sim.player.z);
          combatFlashPower = 1.0;
          spawnBurst(sim.player.x, 0.75, sim.player.z, 14, 4.0, '#F4B942');
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 120, '#F4B942', 0.4);
          vfxOverlay.spawnGhostAfterimage(sim.player.x, sim.player.y, sim.player.z, '#F4B942');
          vfxOverlay.spawnPopup(sim.player.x, 1.8, sim.player.z, '⚡ CHARGED ART!', '#F4B942', true);
        }
        if (stepEvents.slamLanded) {
          audio.playSlam();
          fovKick = -2.6;
          combatFlashLight.color.set('#FF9E44');
          combatFlashLight.position.set(sim.player.x, 1.1, sim.player.z);
          combatFlashPower = 1.0;
          spawnBurst(sim.player.x, 0.25, sim.player.z, 18, 4.6, '#F4B942');
          vfxOverlay.spawnSlashStar(sim.player.x, 0.65, sim.player.z, '#F4B942', true);
          vfxOverlay.spawnShockwave(sim.player.x, 0.15, sim.player.z, 134, '#F4B942', 0.42);
          vfxOverlay.spawnShockwave(sim.player.x, 0.2, sim.player.z, 174, '#FFF4DC', 0.34);
          vfxOverlay.spawnSparks(sim.player.x, 0.35, sim.player.z, 14, 6.2, '#FF9E44');
          vfxOverlay.spawnPopup(sim.player.x, 1.7, sim.player.z, '☄ METEOR SLAM!', '#F4B942', true);
        }
        if (stepEvents.specialUsed) {
          audio.playSwing(3);
          fovKick = -2.0;
          combatFlashLight.color.set(activeWeapon.color);
          combatFlashLight.position.set(sim.player.x, 1.3, sim.player.z);
          combatFlashPower = 0.9;
          spawnBurst(sim.player.x, 0.7, sim.player.z, 10, 3.2, activeWeapon.color);
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 92, '#F4B942', 0.36);
          vfxOverlay.spawnSparks(sim.player.x, 0.7, sim.player.z, 10, 5.4, '#F4B942');
          vfxOverlay.spawnGhostAfterimage(sim.player.x, sim.player.y, sim.player.z, activeWeapon.color);
        }
        if (stepEvents.appraisalTriggered) {
          audio.playAppraisal();
          appraisalFlash = 1.6;
          fovKick = -2.6;
          combatFlashLight.color.set('#F4B942');
          combatFlashLight.position.set(sim.player.x, 1.35, sim.player.z);
          combatFlashPower = 1.0;
          spawnBurst(sim.player.x, 0.9, sim.player.z, 16, 4.2, '#F4B942');
          vfxOverlay.triggerHitFlash('#F4B942', 0.24);
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 130, '#F4B942', 0.45);
          pushMetricEvent(metrics, 'appraisal_strike');
        } else if (stepEvents.enemyHit) {
          audio.playHit(Boolean(stepEvents.specialUsed || stepEvents.chargedStrike || stepEvents.finisherCombo));
          const hx = sim.player.x + Math.sin(sim.player.facing);
          const hz = sim.player.z + Math.cos(sim.player.facing);
          spawnBurst(hx, 0.7, hz, 7, 2.8, '#FFF4DC');
          vfxOverlay.spawnSparks(hx, 0.7, hz, 9, 5.2, '#FF9E44');
          fovKick = Math.min(fovKick, stepEvents.finisherCombo ? -1.6 : -0.85);
        }
        if (stepEvents.impactPoints && stepEvents.impactPoints.length > 0) {
          for (const ip of stepEvents.impactPoints) {
            vfxOverlay.spawnSlashStar(ip.x, ip.y, ip.z, ip.color, ip.heavy);
            vfxOverlay.spawnSparks(ip.x, ip.y, ip.z, ip.heavy ? 12 : 6, ip.heavy ? 6.0 : 4.2, ip.color);
            if (ip.heavy) {
              vfxOverlay.spawnShockwave(ip.x, 0.2, ip.z, 68, ip.color, 0.28);
              combatFlashLight.color.set(ip.color);
              combatFlashLight.position.set(ip.x, ip.y + 0.4, ip.z);
              combatFlashPower = Math.max(combatFlashPower, 0.85);
            }
          }
        }
        if (stepEvents.hitPopups && stepEvents.hitPopups.length > 0) {
          for (const pop of stepEvents.hitPopups) {
            vfxOverlay.spawnPopup(pop.x, pop.y, pop.z, pop.text, pop.color, pop.crit);
          }
        }
        if (stepEvents.enemyKilled) {
          audio.playHit(true);
          sim.trauma = Math.min(1, sim.trauma + 0.32);
          vfxOverlay.triggerHitFlash('#FFF4DC', 0.14);
          pushMetricEvent(metrics, 'enemy_killed');
          if (stepEvents.killedEnemyTypes && stepEvents.killedEnemyTypes.length > 0) {
            callbacks.onEnemiesKilled?.(
              [...stepEvents.killedEnemyTypes],
              stepEvents.killedBossId ?? null,
            );
          }
          if (stepEvents.killedEliteCount && stepEvents.killedEliteCount > 0) {
            callbacks.onElitesKilled?.(stepEvents.killedEliteCount);
          }
        }
        if (stepEvents.volatileBlast) {
          audio.playDanger();
          sim.trauma = Math.min(1, sim.trauma + 0.35);
          const { x: vx, z: vz } = stepEvents.volatileBlast;
          spawnBurst(vx, 0.45, vz, 14, 4.2, '#FF5E3A');
          vfxOverlay.spawnShockwave(vx, 0.25, vz, 128, '#FF5E3A', 0.4);
          vfxOverlay.spawnSparks(vx, 0.55, vz, 12, 5.4, '#FF9E44');
        }
        if (stepEvents.parryTriggered) {
          audio.playDeflect();
          spawnBurst(sim.player.x, 0.85, sim.player.z, 10, 3.6, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 92, '#38E8D8', 0.32);
        }
        if (stepEvents.appraisalTriggered) {
          callbacks.onAppraisalStrike?.();
        }
        if (stepEvents.smashedProps && stepEvents.smashedProps.length > 0) {
          for (const sp of stepEvents.smashedProps) {
            spawnShards(sp.x, sp.z, sp.kind);
            spawnBurst(sp.x, 0.45, sp.z, 8, 3.0, sp.kind === 'crystal' ? '#38E8D8' : '#C25B32');
            vfxOverlay.spawnSparks(sp.x, 0.45, sp.z, 8, 4.4, sp.kind === 'crystal' ? '#56F2E2' : '#F4B942');
          }
        }
        if (stepEvents.propsSmashed && stepEvents.propsSmashed > 0) {
          callbacks.onPropSmashed?.(stepEvents.propsSmashed);
        }
        if (stepEvents.playerHurt) {
          audio.playHit(true);
          spawnBurst(sim.player.x, 0.7, sim.player.z, 10, 3.0, '#FF3B5C');
          vfxOverlay.triggerHitFlash('#FF3B5C', 0.28);
          vfxOverlay.spawnShockwave(sim.player.x, 0.2, sim.player.z, 76, '#FF3B5C', 0.32);
        }
        if (stepEvents.healed) {
          audio.playCoin();
          spawnBurst(sim.player.x, 0.8, sim.player.z, 10, 2.4, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.2, sim.player.z, 68, '#38E8D8', 0.35);
        }
        if (stepEvents.chestOpened) {
          audio.playCoin();
          spawnBurst(sim.player.x, 0.8, sim.player.z, 14, 3.2, '#F4B942');
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 95, '#F4B942', 0.38);
          vfxOverlay.spawnPopup(sim.player.x, 1.6, sim.player.z, 'RELIC CHEST!', '#F4B942', true);
        }
        if (stepEvents.pickedUpItem) {
          const added = callbacks.onPickupRelic(stepEvents.pickedUpItem);
          if (added) {
            audio.playCoin();
            spawnBurst(sim.player.x, 0.7, sim.player.z, 8, 2.2, '#F4B942');
            vfxOverlay.spawnPopup(
              sim.player.x,
              1.45,
              sim.player.z,
              stepEvents.pickedUpItem.pristine ? '★ PRISTINE 2×!' : `+ ${stepEvents.pickedUpItem.name}`,
              '#F4B942',
              stepEvents.pickedUpItem.pristine,
            );
          }
        }
        if (stepEvents.deflected) {
          audio.playDeflect();
          spawnBurst(sim.player.x, 0.9, sim.player.z, 9, 3.6, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.4, sim.player.z, 76, '#38E8D8', 0.28);
        }
        if (stepEvents.lightningArcs && stepEvents.lightningArcs.length > 0) {
          audio.playLightning();
          for (const arc of stepEvents.lightningArcs) {
            vfxOverlay.spawnLightningArc(arc.x1, arc.y1, arc.z1, arc.x2, arc.y2, arc.z2);
            vfxOverlay.spawnSparks(arc.x2, arc.y2, arc.z2, 8, 5.2, '#38E8D8');
          }
        }
        if (stepEvents.familiarBlast) {
          const fb = stepEvents.familiarBlast;
          vfxOverlay.spawnLightningArc(fb.x1, fb.y1, fb.z1, fb.x2, fb.y2, fb.z2);
          vfxOverlay.spawnSparks(fb.x2, fb.y2, fb.z2, 8, 4.8, fb.color);
          if (fb.kind === 'frost') {
            vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 110, fb.color, 0.35);
          }
        }
        if (stepEvents.trapTriggered) {
          audio.playTrap();
          const { x: tx, z: tz } = stepEvents.trapTriggered;
          spawnBurst(tx, 0.35, tz, 14, 3.5, '#38E8D8');
          vfxOverlay.spawnShockwave(tx, 0.15, tz, 118, '#38E8D8', 0.42);
        }
        if (stepEvents.altarActivated) {
          audio.playAppraisal();
          vfxOverlay.triggerHitFlash('#F4B942', 0.3);
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 130, '#F4B942', 0.48);
          callbacks.onAltarGildBag?.();
        }
        if (stepEvents.coinsEarned && stepEvents.coinsEarned > 0) {
          audio.playCoin();
          spawnBurst(sim.player.x, 0.6, sim.player.z, 8, 2.6, '#F4B942');
          callbacks.onEarnGold?.(stepEvents.coinsEarned);
        }
        if (stepEvents.crystalCharged) {
          audio.playDeflect();
          spawnBurst(sim.player.x, 0.7, sim.player.z, 10, 3.0, '#38E8D8');
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 84, '#38E8D8', 0.34);
        }
        if (stepEvents.mimicAwakened) {
          audio.playDanger();
          vfxOverlay.triggerHitFlash(stepEvents.mimicStunned ? '#F4B942' : '#FF3B5C', 0.25);
          vfxOverlay.spawnPopup(
            sim.player.x,
            1.75,
            sim.player.z,
            stepEvents.mimicStunned ? '✦ MIMIC!' : '⚠ MIMIC!',
            stepEvents.mimicStunned ? '#F4B942' : '#FF3B5C',
            true,
          );
          callbacks.onMimicExposed?.(Boolean(stepEvents.mimicStunned));
        }
        if (stepEvents.finisherCombo) {
          audio.playHit(true);
          vfxOverlay.spawnShockwave(
            sim.player.x + Math.sin(sim.player.facing) * 0.9,
            0.25,
            sim.player.z + Math.cos(sim.player.facing) * 0.9,
            78,
            '#FF9E44',
            0.28,
          );
        }
        if (stepEvents.echoTriggered) {
          audio.playSwing(2);
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 98, '#A855F7', 0.34);
          vfxOverlay.spawnSparks(sim.player.x, 0.65, sim.player.z, 8, 4.6, '#C084FC');
        }
        if (stepEvents.emberVaultBlast) {
          audio.playHit(true);
          spawnBurst(sim.player.x, 0.45, sim.player.z, 12, 3.8, '#FF7B42');
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 102, '#FF7B42', 0.32);
          vfxOverlay.spawnSparks(sim.player.x, 0.5, sim.player.z, 10, 5.0, '#FF7B42');
        }
        if (stepEvents.bossPhase2) {
          audio.playDanger();
          vfxOverlay.triggerHitFlash('#FF5E3A', 0.35);
          vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 150, '#FF5E3A', 0.5);
        }
        if (stepEvents.roomCleared) {
          audio.playDeflect();
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 125, '#38E8D8', 0.42);
        }
        if (stepEvents.boonOffered && callbacks.onOfferBoons) {
          const choices = rollBoonChoices(sim.activeBoons, rand, 3);
          callbacks.onOfferBoons(choices);
          break;
        }
        if (stepEvents.roomTransition) {
          tabLockedEnemyId = null;
          syncZoneScene();
          audio.playDeflect();
          vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 95, '#38E8D8', 0.35);
          pushHud(true);
          break;
        }
        if (stepEvents.marauderSpawned) {
          audio.playDanger();
          audio.setTheme('dungeon_boss');
          vfxOverlay.triggerHitFlash('#FF3B5C', 0.32);
          vfxOverlay.spawnPopup(sim.player.x, 2.0, sim.player.z, 'SHADOW MARAUDER!', '#FF3B5C', true);
          pushMetricEvent(metrics, 'marauder_spawned');
        }
        if (stepEvents.interactTarget) {
          audio.playUiClick();
          callbacks.onInteractSpot(stepEvents.interactTarget);
          break;
        }
        if (stepEvents.playerDied) {
          audio.playDanger();
          callbacks.onPlayerDied();
          break;
        }
      }

      audio.setLowHpMode(sim.zone === 'dungeon' && sim.player.hp <= 1);
      const marauderWarn =
        sim.zone === 'dungeon' && !sim.marauderSpawned && sim.marauderTimer <= 10;
      audio.setTensionPulse(marauderWarn);
      metrics.distanceMoved = Number(sim.distanceMoved.toFixed(2));
      metrics.playerX = Number(sim.player.x.toFixed(2));
      metrics.playerZ = Number(sim.player.z.toFixed(2));
    } else {
      audio.setTensionPulse(false);
    }

    input.endFrame();
    const { npcHints } = syncVisualEntities(dt);

    hudAccum += dt;
    const curRoomCleared = Boolean(
      sim.floorMap && sim.floorMap.rooms[sim.currentRoomId]?.cleared,
    );
    const bossEnt =
      sim.zone === 'dungeon'
        ? sim.enemies.find((e) => e.kind === 'boss' && e.state !== 'ko')
        : undefined;
    const curBossHp = bossEnt ? Math.ceil(bossEnt.hp) : -1;
    const curTargeted =
      sim.zone === 'dungeon' && targetedEnemyId
        ? sim.enemies.find((e) => e.id === targetedEnemyId && e.state !== 'ko')
        : undefined;
    const curTargetHp = curTargeted ? Math.ceil(curTargeted.hp) : -1;
    const curRiposteReady = (sim.player.counterTimer ?? 0) > 0.05;
    if (
      sim.nearbyInteract !== lastInteract ||
      sim.player.hp !== lastHp ||
      sim.zone !== lastZone ||
      sim.currentRoomId !== lastRoomId ||
      curRoomCleared !== lastRoomCleared ||
      curBossHp !== lastBossHp ||
      sim.activeBoons.length !== lastBoonCount ||
      sim.player.blocking !== lastBlocking ||
      sim.player.dodgeCharges !== lastDodgeCharges ||
      sim.player.aegisShieldHits !== lastAegisHits ||
      sim.player.comboStreak !== lastComboStreak ||
      targetedEnemyId !== lastTargetedId ||
      curTargetHp !== lastTargetedHp ||
      curRiposteReady !== lastRiposteReady ||
      appraisalFlash > 1.4
    ) {
      lastInteract = sim.nearbyInteract;
      lastHp = sim.player.hp;
      lastZone = sim.zone;
      lastRoomId = sim.currentRoomId;
      lastRoomCleared = curRoomCleared;
      lastBossHp = curBossHp;
      lastBoonCount = sim.activeBoons.length;
      lastBlocking = sim.player.blocking;
      lastDodgeCharges = sim.player.dodgeCharges;
      lastAegisHits = sim.player.aegisShieldHits;
      lastComboStreak = sim.player.comboStreak;
      lastTargetedId = targetedEnemyId;
      lastTargetedHp = curTargetHp;
      lastRiposteReady = curRiposteReady;
      pushHud(true);
    } else {
      pushHud(false);
    }

    // Active Boss windup telegraph overlay info
    let bossWindup: BossTelegraphSpec | null = null;
    if (sim.zone === 'dungeon') {
      for (const e of sim.enemies) {
        if ((e.kind === 'boss' || e.kind === 'marauder') && e.state === 'windup') {
          bossWindup = {
            x: e.x,
            y: e.y,
            z: e.z,
            facing: e.facing,
            range: e.attackRange,
            progress: Math.min(1, 1 - Math.max(0, e.stateTimer / e.windupDuration)),
          };
          break;
        }
      }
    }

    let aimArc: AimArcSpec | null = null;
    if (currentGraphicsLevel >= GraphicsLevel.High && shellMode === 'playing') {
      const dx = _cachedGroundHit.dx ?? Math.sin(sim.player.facing);
      const dz = _cachedGroundHit.dz ?? Math.cos(sim.player.facing);
      aimArc = {
        startX: sim.player.x,
        startY: sim.player.y + 0.55,
        startZ: sim.player.z,
        dirX: dx,
        dirZ: dz,
        range: activeWeapon.range,
        color: activeWeapon.color || '#38E8D8',
        specialReady: sim.player.specialCooldown <= 0,
      };
    }

    try {
      if (keyLight.castShadow) {
        renderer.shadowMap.autoUpdate = shellMode === 'playing' || shellMode === 'title';
      }
      const useComposer = Boolean(composer) && !isSoftwareGl && currentGraphicsLevel >= GraphicsLevel.High;
      if (!contextLost) {
        if (useComposer) {
          composer!.render();
        } else {
          renderer.render(scene, camera);
        }
      }
      const marauderWarnRender =
        shellMode === 'playing' &&
        sim.zone === 'dungeon' &&
        !sim.marauderSpawned &&
        sim.marauderTimer <= 10;
      vfxOverlay.renderFrame(
        dt,
        elapsed,
        camera,
        sim.zone,
        sim.player.hp / Math.max(1, sim.player.maxHp),
        sim.marauderSpawned,
        glowSpecs,
        {
          weatherStorm: sim.zone === 'courtyard' && weatherStorm,
          bossWindup,
          npcHints,
          aimArc,
          skipBaseVignette: useComposer,
          marauderWarning: marauderWarnRender,
        },
      );
      consecutiveRenderErrors = 0;
    } catch (err) {
      consecutiveRenderErrors += 1;
      if (!loggedRenderError) {
        loggedRenderError = true;
        console.warn('Gateledger render fallback triggered:', err);
      }
      if (consecutiveRenderErrors >= 2 && currentGraphicsLevel > GraphicsLevel.Low) {
        const nextTier: GraphicsQuality =
          currentGraphicsLevel >= GraphicsLevel.High ? 'medium' : 'low';
        applyQualityInternal(nextTier);
        callbacks.onGraphicsDowngrade?.(nextTier);
        consecutiveRenderErrors = 0;
      }
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  };

  if (isSoftwareGl) frameId = window.setTimeout(tick, 16);
  else frameId = requestAnimationFrame(tick);

  return {
    setShellMode(mode: ShellMode) {
      shellMode = mode;
      input.setPointerLockAllowed(mode === 'playing');
      document.body.dataset.state = mode === 'modal' ? 'playing' : mode;
      metrics.state = mode;
      audio.setPaused(mode === 'paused');
      if (mode === 'modal') {
        audio.setTheme('shop_haggle');
      } else if (sim.zone === 'courtyard') {
        audio.setTheme('courtyard_day');
      } else {
        audio.setTheme(sim.floor === 3 || sim.marauderSpawned ? 'dungeon_boss' : 'dungeon_explore');
      }
      pushHud(true);
    },
    setDifficulty(diff: DifficultyPreset) {
      activeDiff = diff;
    },
    setWeapon(weapon: WeaponDef, skillMult: number) {
      activeWeapon = weapon;
      activeSkillMult = skillMult;
      heroRig.setWeaponVisual(weapon.id);
    },
    setPlayerCaps(maxHp: number, maxPotions: number, refillHp: boolean) {
      sim.player.maxHp = maxHp;
      sim.player.maxPotions = maxPotions;
      if (refillHp) {
        sim.player.hp = maxHp;
        sim.player.potions = maxPotions;
      } else {
        sim.player.hp = Math.min(maxHp, sim.player.hp);
        sim.player.potions = Math.min(maxPotions, sim.player.potions);
      }
      pushHud(true);
    },
    setRunModifiers(mods: RunModifiers) {
      activeRunMods = { ...mods };
      sim.mods = { ...sim.mods, ...mods };
      if (typeof mods.maxJumpCharges === 'number') {
        sim.player.maxJumpCharges = mods.maxJumpCharges;
        sim.player.jumpCharges = mods.maxJumpCharges;
      }
      pushHud(true);
    },
    applyBoon(boonId: BoonId) {
      applyBoonToSim(sim, boonId);
      audio.playAppraisal();
      spawnBurst(sim.player.x, 0.85, sim.player.z, 14, 3.6, '#38E8D8');
      vfxOverlay.spawnShockwave(sim.player.x, 0.25, sim.player.z, 115, '#38E8D8', 0.4);
      pushHud(true);
    },
    rerollBoons() {
      audio.playUiClick();
      return rollBoonChoices(sim.activeBoons, rand, 3);
    },
    resolveShrineChoice(choice: ShrineChoiceId) {
      const res = applyShrineChoice(sim, choice);
      if (res.gilded) {
        audio.playAppraisal();
        vfxOverlay.triggerHitFlash('#F4B942', 0.3);
        spawnBurst(sim.player.x, 0.9, sim.player.z, 14, 3.6, '#F4B942');
        vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 130, '#F4B942', 0.48);
        callbacks.onAltarGildBag?.();
      } else if (res.goldGained > 0) {
        audio.playDanger();
        vfxOverlay.triggerHitFlash('#FF4D6D', 0.28);
        spawnBurst(sim.player.x, 0.9, sim.player.z, 14, 3.8, '#FF4D6D');
        vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 125, '#FF4D6D', 0.45);
        vfxOverlay.spawnPopup(sim.player.x, 1.8, sim.player.z, `+${res.goldGained}g · BLOOD PACT!`, '#FF4D6D', true);
        callbacks.onEarnGold?.(res.goldGained);
      } else if (res.healed) {
        audio.playCoin();
        vfxOverlay.triggerHitFlash('#38E8D8', 0.25);
        spawnBurst(sim.player.x, 0.9, sim.player.z, 14, 3.4, '#38E8D8');
        vfxOverlay.spawnShockwave(sim.player.x, 0.3, sim.player.z, 120, '#38E8D8', 0.45);
        vfxOverlay.spawnPopup(sim.player.x, 1.8, sim.player.z, '+2 HP · +1 POTION', '#38E8D8', true);
      }
      pushHud(true);
      return res;
    },
    setCourtyardVisuals(opts) {
      if (typeof opts.prestigeBanners === 'boolean') prestigeBanners = opts.prestigeBanners;
      if (typeof opts.weatherStorm === 'boolean') {
        weatherStorm = opts.weatherStorm;
        applyCourtyardAtmosphere();
      }
      if (typeof opts.bountyHint === 'string') bountyHintText = opts.bountyHint;
    },
    setTimeOfDay(ratio: number) {
      timeOfDayRatio = ratio;
      applyCourtyardAtmosphere();
    },
    setGraphicsQuality(quality: GraphicsQuality) {
      applyQualityInternal(quality);
    },
    triggerStationFx(station: 'forge' | 'alchemy') {
      const sx = station === 'forge' ? 5.1 : 5.0;
      const sz = station === 'forge' ? -1.1 : 3.2;
      const col = station === 'forge' ? '#FF9E44' : '#38E8D8';
      spawnBurst(sx, 0.95, sz, 16, 3.8, col);
      vfxOverlay.spawnSparks(sx, 0.95, sz, 16, 5.2, col);
      vfxOverlay.spawnShockwave(sx, 0.2, sz, 88, col, 0.4);
    },
    setSeed(nextSeed: number) {
      rngState = (nextSeed || 1337) >>> 0;
      metrics.seed = rngState;
    },
    enterDungeon(floor: number, week: number, mode: DungeonMode = 'gate') {
      tabLockedEnemyId = null;
      sim = enterDungeonFloor(sim, floor, week, activeDiff, relicPool, rand, activeRunMods, mode);
      syncZoneScene();
      pushHud(true);
    },
    returnToCourtyard(week: number, healFull: boolean) {
      tabLockedEnemyId = null;
      const prevHp = sim.player.hp;
      const maxHp = sim.player.maxHp;
      const maxPotions = sim.player.maxPotions;
      sim = createCourtyardSim(maxHp, maxPotions, rand, activeRunMods);
      sim.week = week;
      sim.player.hp = healFull ? maxHp : Math.max(1, prevHp);
      syncZoneScene();
      pushHud(true);
    },
    resetCourtyard(maxHp: number, maxPotions: number) {
      tabLockedEnemyId = null;
      sim = createCourtyardSim(maxHp, maxPotions, rand, activeRunMods);
      syncZoneScene();
      pushHud(true);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      clearDynamicMeshes();
      courtyardWorld.dispose?.();
      dungeonWorld?.dispose?.();
      disposeObjectTree(scene);
      for (const g of sharedGeos) g.dispose();
      for (const m of sharedMats) m.dispose();
      for (const m of pickupMatCache.values()) m.dispose();
      pickupMatCache.clear();
      shadowTex.dispose();
      glowTex.dispose();
      envTexture.dispose();
      composer?.dispose();
      composerTarget?.dispose();
      vfxOverlay.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
