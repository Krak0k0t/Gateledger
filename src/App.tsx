import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rawContent from './data/gameContent.json';
import { createInputHub, type InputHub, type VirtualAction } from './core/input';
import { initMetrics, pushMetricEvent, type GameMetrics } from './core/metrics';
import { createDynamicAudioEngine, type DynamicAudioEngine } from './core/music';
import { parseSeed, getDailySeed } from './core/rng';
import {
  getGraphicsProfile,
  loadSettings,
  saveSettings,
  type GameSettings,
} from './core/settings';
import {
  isRtlLanguage,
  SUPPORTED_LANGUAGES,
  t,
  type LanguageCode,
  type TranslationKey,
} from './i18n/translations';
import {
  addItemToBag,
  computeBeltPerks,
  createEmptyBag,
  createRelicInstance,
  gildAllBagItems,
  resolveBagExtraction,
  swapBagSlots,
  type BagRelicItem,
  type RelicEra,
  type RelicTemplate,
} from './systems/backpack';
import { computeActiveSynergies, getBoonDef, type BoonDef } from './systems/boons';
import type { BossId } from './systems/bosses';
import {
  advanceContractProgress,
  computeCharterBonuses,
  computePactModifiers,
  createRunContract,
  getNextTalentCost,
  scaleShardsByPact,
  type ContractKind,
  type GuildTalentId,
  type PactId,
  type RunContract,
} from './systems/charter';
import type { DifficultyPreset, InteractSpotId, RunModifiers, WeaponDef } from './systems/dungeonSim';
import {
  createLiveAuction,
  createShopSession,
  fulfillVipOrder,
  raiseLiveAuctionHype,
  resolveNightGuestCursedBuyout,
  spawnNextCustomer,
  submitHaggleOffer,
  TRANSMUTE_COST,
  transmuteRelics,
  type LiveAuctionState,
  type LivePawnContract,
  type ShopSessionState,
} from './systems/economy';
import {
  computeFamiliarBonuses,
  computeRiftScaling,
  computeSupplyBonuses,
  EXPEDITION_SUPPLIES,
  FAMILIARS,
  getDayEventModifiers,
  RIFT_ENTRY_COST,
  rollDayEvent,
  type DayEventDef,
  type DungeonMode,
  type FamiliarId,
  type SupplyId,
} from './systems/expedition';
import {
  ARCHETYPES,
  grantAchievements,
  loadCampaignRecords,
  saveCampaignRecords,
  type AchievementDef,
  type ArchetypeId,
  type CampaignRecords,
} from './systems/meta';
import { createInitialAbilityCooldowns } from './systems/abilities';
import { ActionBarHud } from './ui/ActionBarHud';
import { BackpackModal } from './ui/BackpackModal';
import { BoonModal } from './ui/BoonModal';
import { CharterModal } from './ui/CharterModal';
import { CodexModal } from './ui/CodexModal';
import {
  BoltSparkIcon,
  CalendarAlertIcon,
  CameraEyeIcon,
  CharterSealIcon,
  CheckRuneIcon,
  CodexTomeIcon,
  FlameEmberIcon,
  FullscreenGlyphIcon,
  GamepadTouchIcon,
  GlobeRuneIcon,
  JumpWingIcon,
  PauseGlyphIcon,
  SatchelPackIcon,
  SettingsCogIcon,
  SkullBossIcon,
  SnowflakeGlyphIcon,
  SparkleGlyphIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
  SupplyCompassIcon,
  TrophyCrestIcon,
  WarningTriangleIcon,
} from './ui/CustomIcons';
import { GraphicsQualitySwitch } from './ui/GraphicsQualitySwitch';
import { LanguageModal } from './ui/LanguageModal';
import { LedgerSummaryModal, type LedgerSummaryData } from './ui/LedgerSummaryModal';
import { MinimapHud } from './ui/MinimapHud';
import { SettingsModal } from './ui/SettingsModal';
import { ShopOverlay } from './ui/ShopOverlay';
import { ShrineModal } from './ui/ShrineModal';
import { useCardTilt3D } from './ui/TiltCard';
import { TouchControls } from './ui/TouchControls';
import { TownArtisanModal, type UpgradeDef } from './ui/TownArtisanModal';
import {
  mountGateScene,
  type GateSceneHandle,
  type LiveHudState,
  type ShellMode,
} from './view/gateScene';

interface WeekConfig {
  week: number;
  debtTarget: number;
  daysPerWeek: number;
  eraTrend: RelicEra;
  biomeNameKey: string;
}

interface GameContentData {
  difficulties: Record<'cozy' | 'standard' | 'veteran', DifficultyPreset>;
  weapons: WeaponDef[];
  relics: RelicTemplate[];
  weeks: WeekConfig[];
  upgrades: UpgradeDef[];
}

const CONTENT = rawContent as GameContentData;

type ActiveModal = 'none' | 'bag' | 'shop' | 'forge' | 'alchemy' | 'shrine';

function createStarterStash(): BagRelicItem[] {
  const r1 = CONTENT.relics[0]; // whisper_seal (astral)
  const r2 = CONTENT.relics[1]; // cobalt_shard (astral) -> grants Twin Resonance (+35%) together!
  return [
    createRelicInstance(r1, 'starter_1', false),
    createRelicInstance(r2, 'starter_2', false),
  ];
}

function HeartSealIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true">
      <path
        d="M12 20.6C11.4 20.6 4 15.2 4 9.5C4 6.5 6.3 4.4 9 4.4C10.6 4.4 11.5 5.2 12 6.1C12.5 5.2 13.4 4.4 15 4.4C17.7 4.4 20 6.5 20 9.5C20 15.2 12.6 20.6 12 20.6Z"
        fill={filled ? '#E63946' : '#D5C4A1'}
        stroke="#1A1E2E"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M7.5 8.5C7.5 7.4 8.3 6.6 9.4 6.6"
          stroke="#FFF0D4"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function CoinSealIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#F4B942" stroke="#1A1E2E" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#96442C" strokeWidth="1.4" />
      <path d="M12 8.2V15.8" stroke="#1A1E2E" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TitleLedgerEmblem({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      role="img"
      aria-label={title}
      className="glass-panel flex items-center gap-3.5 px-4 py-3 rounded-xl max-w-[380px]"
    >
      <svg viewBox="0 0 64 74" className="w-12 h-14 shrink-0 drop-shadow-[0_0_10px_rgba(56,232,216,0.45)]" aria-hidden="true">
        <path
          d="M6 70V30C6 15 18 5 32 5C46 5 58 15 58 30V70Z"
          fill="#1B2A4D"
          stroke="#F4B942"
          strokeWidth="2.5"
        />
        <circle
          cx="32"
          cy="36"
          r="13"
          fill="#38E8D8"
          fillOpacity="0.28"
          stroke="#38E8D8"
          strokeWidth="2.2"
        />
        <polygon
          points="32,9 37,15 32,21 27,15"
          fill="#F4B942"
          stroke="#0A0E1E"
          strokeWidth="1.5"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="font-ledger text-xl sm:text-2xl font-bold tracking-wide text-[#FFF4DC] leading-tight drop-shadow-[0_2px_6px_rgba(244,185,66,0.3)]">
          {title}
        </div>
        <div className="h-[1.5px] w-full bg-gradient-to-r from-[#F4B942] via-[#38E8D8] to-transparent my-1.5" />
        <div className="text-[11px] sm:text-xs font-bold text-[#9EB4DA] leading-snug">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

interface TitleArchetypeCardProps {
  title: string;
  perk: string;
  accent: string;
  active: boolean;
  tiltEnabled: boolean;
  onSelect: () => void;
}

function TitleArchetypeCard({
  title,
  perk,
  accent,
  active,
  tiltEnabled,
  onSelect,
}: TitleArchetypeCardProps) {
  const { cardStyle, glareStyle, onMouseMove, onMouseLeave } = useCardTilt3D(tiltEnabled);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={cardStyle}
      className={`relative overflow-hidden cursor-pointer px-2 py-1.5 rounded-lg text-left border transition-all ${
        active
          ? 'bg-[#1D284C] border-[#F4B942] shadow-[0_0_12px_rgba(244,185,66,0.35)]'
          : 'glass-subcard opacity-85 hover:border-[#38E8D8]/60'
      }`}
    >
      {glareStyle && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={glareStyle}
        />
      )}
      <div className="relative z-10 text-[11px] font-bold truncate" style={{ color: accent }}>
        {title}
      </div>
      <div className="relative z-10 text-[9px] font-semibold text-[#9EB4DA] leading-tight mt-0.5">
        {perk}
      </div>
    </button>
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GateSceneHandle | null>(null);
  const inputRef = useRef<InputHub | null>(null);
  const audioRef = useRef<DynamicAudioEngine | null>(null);
  const metricsRef = useRef<GameMetrics | null>(null);

  const initialAutoStart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  // English initial UI language as requested
  const [lang, setLang] = useState<LanguageCode>('en');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showCodexModal, setShowCodexModal] = useState(false);
  const [showCharterModal, setShowCharterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const gfxProfile = getGraphicsProfile(settings.graphicsQuality);
  const [trophyToast, setTrophyToast] = useState<AchievementDef | null>(null);
  const [guideDismissed, setGuideDismissed] = useState(false);

  const [difficultyId, setDifficultyId] = useState<'cozy' | 'standard' | 'veteran'>('standard');
  const [archetypeId, setArchetypeId] = useState<ArchetypeId>('merchant');
  const dailyInfo = useMemo(() => getDailySeed(), []);
  const [isDailyRun, setIsDailyRun] = useState(false);
  const [records, setRecords] = useState<CampaignRecords>(() => loadCampaignRecords());
  const charterBonuses = useMemo(
    () => computeCharterBonuses(records.talentLevels),
    [records.talentLevels],
  );
  const pactMods = useMemo(() => computePactModifiers(records.activePacts), [records.activePacts]);
  const [shellMode, setShellMode] = useState<ShellMode>(initialAutoStart ? 'playing' : 'title');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchOverride, setTouchOverride] = useState<boolean | null>(null);
  const [viewportDims, setViewportDims] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') return { w: 1280, h: 720 };
    return { w: window.innerWidth, h: window.innerHeight };
  });
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900 || navigator.maxTouchPoints > 0;
  });
  const touchEnabled = touchOverride ?? isMobileViewport;
  const showPortraitTip = touchEnabled && viewportDims.w < 600 && viewportDims.h > viewportDims.w * 1.18;

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 900 || navigator.maxTouchPoints > 0);
      setViewportDims({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Campaign Meta State
  const [gold, setGold] = useState(
    () => ARCHETYPES.merchant.startGold + computeCharterBonuses(records.talentLevels).bonusGold,
  );
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);
  const [debtPaid, setDebtPaid] = useState(0);
  const [unlockedWeapons, setUnlockedWeapons] = useState<string[]>(['sword']);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string>('sword');
  const [weaponTiers, setWeaponTiers] = useState<Record<string, number>>({
    sword: 1,
    spear: 1,
    hammer: 1,
    twinblades: 1,
  });
  const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>({
    display_tier: 0,
    forge_temper: 0,
    potion_belt: 0,
  });
  const [bag, setBag] = useState<(BagRelicItem | null)[]>(() => createEmptyBag());
  const bagRef = useRef<(BagRelicItem | null)[]>(bag);
  bagRef.current = bag;
  const [stash, setStash] = useState<BagRelicItem[]>(() => createStarterStash());
  const [shopSession, setShopSession] = useState<ShopSessionState | null>(null);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [bountyEra, setBountyEra] = useState<RelicEra>('astral');
  const [livePawn, setLivePawn] = useState<LivePawnContract | null>(null);
  const [liveAuction, setLiveAuction] = useState<LiveAuctionState | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummaryData | null>(null);
  const [endlessMode, setEndlessMode] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [secretKeyGranted, setSecretKeyGranted] = useState(false);
  const [lastDealStreak, setLastDealStreak] = useState(0);
  const [boonChoices, setBoonChoices] = useState<BoonDef[] | null>(null);
  const [boonRerollsLeft, setBoonRerollsLeft] = useState<number>(
    () => computeCharterBonuses(records.talentLevels).boonRerolls,
  );
  const [runShardsEarned, setRunShardsEarned] = useState<number>(0);
  const [dayEvent, setDayEvent] = useState<DayEventDef>(() => rollDayEvent(1));
  const dayEventMods = useMemo(() => getDayEventModifiers(dayEvent.id), [dayEvent.id]);
  const [ownedSupplies, setOwnedSupplies] = useState<SupplyId[]>([]);
  const [activeRunSupplies, setActiveRunSupplies] = useState<SupplyId[]>([]);
  const activeSupplyBonuses = useMemo(
    () => computeSupplyBonuses(activeRunSupplies),
    [activeRunSupplies],
  );
  const familiarBonuses = useMemo(
    () => computeFamiliarBonuses(records.equippedFamiliar),
    [records.equippedFamiliar],
  );
  const equippedFamiliarDef = useMemo(
    () => FAMILIARS.find((f) => f.id === records.equippedFamiliar) ?? null,
    [records.equippedFamiliar],
  );
  const riftScale = useMemo(() => computeRiftScaling(records.riftClears), [records.riftClears]);
  const contractStepRef = useRef<number>(0);
  const [activeContract, setActiveContract] = useState<RunContract>(() => createRunContract(1, 0));
  const activeContractRef = useRef<RunContract>(activeContract);
  activeContractRef.current = activeContract;
  const runStartMsRef = useRef<number>(Date.now());
  const shopStartGoldRef = useRef<number>(ARCHETYPES.merchant.startGold);

  const [liveHud, setLiveHud] = useState<LiveHudState>({
    shellMode: initialAutoStart ? 'playing' : 'title',
    zone: 'courtyard',
    dungeonMode: 'gate',
    floor: 0,
    floorAnomaly: 'none',
    hp: 5,
    maxHp: 5,
    potions: 2,
    maxPotions: 2,
    specialReadyRatio: 1,
    jumpReadyRatio: 1,
    jumpCharges: 1,
    maxJumpCharges: 1,
    mana: 100,
    maxMana: 100,
    dodgeCharges: 2,
    maxDodgeCharges: 2,
    dodgeReadyRatio: 1,
    blocking: false,
    aegisShieldHits: 0,
    abilityCooldowns: createInitialAbilityCooldowns(),
    abilityCdRatios: createInitialAbilityCooldowns(),
    attackCooldown: 0,
    attackMaxCooldown: 0,
    chainLightningReady: false,
    riposteReady: false,
    comboStreak: 0,
    targetEnemy: null,
    nearbyInteract: null,
    exitPortalOpen: false,
    marauderTimer: 100,
    marauderSpawned: false,
    appraisalFlash: 0,
    muted: false,
    minimap: [],
    activeBoss: null,
    activeBoons: [],
    roomCleared: false,
    roomType: 'start',
  });

  const activeDiff = CONTENT.difficulties[difficultyId];
  const activeArchetype = ARCHETYPES[archetypeId];
  const weekConfig = CONTENT.weeks[Math.min(week - 1, CONTENT.weeks.length - 1)];
  const rawDebtTarget = week <= CONTENT.weeks.length ? weekConfig.debtTarget : 420 + (week - 1) * 180;
  const debtTarget = Math.round(rawDebtTarget * activeDiff.debtMult * pactMods.debtMult);
  const pedestalCount = 2 + (upgradeLevels.display_tier ?? 0);
  const maxHp = 5 + (upgradeLevels.potion_belt ?? 0) + charterBonuses.bonusHp;
  const maxPotions = 2 + (upgradeLevels.potion_belt ?? 0) + charterBonuses.bonusPotions;
  const effectiveMaxPotions = maxPotions + (livePawn?.buffActive ? 1 : 0);
  const skillMult = 1 + (upgradeLevels.forge_temper ?? 0) * 0.25;
  const weaponDmgMult = 1 + ((weaponTiers[equippedWeaponId] ?? 1) - 1) * 0.2;
  const evacuateCost = 45 + week * 15;
  const beltPerks = useMemo(() => computeBeltPerks(bag), [bag]);

  const equippedWeapon = useMemo(
    () => CONTENT.weapons.find((w) => w.id === equippedWeaponId) ?? CONTENT.weapons[0],
    [equippedWeaponId],
  );

  const bagItemCount = useMemo(() => bag.filter(Boolean).length, [bag]);
  const activeSynergies = useMemo(
    () => computeActiveSynergies(liveHud.activeBoons),
    [liveHud.activeBoons],
  );

  const handleRebindCaptureChange = useCallback((capturing: boolean) => {
    inputRef.current?.setRebindCaptureMode(capturing);
  }, []);

  const awardTrophies = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setRecords((prev) => {
      const { updated, newlyUnlocked } = grantAchievements(prev, ids);
      if (newlyUnlocked.length === 0) return prev;
      saveCampaignRecords(updated);
      setTrophyToast(newlyUnlocked[0]);
      audioRef.current?.playAppraisal();
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!trophyToast) return;
    const id = window.setTimeout(() => setTrophyToast(null), 3200);
    return () => clearTimeout(id);
  }, [trophyToast]);

  const unlockRelicsInCodex = useCallback((items: BagRelicItem[]) => {
    if (items.length === 0) return;
    setRecords((prev) => {
      const existing = new Set(prev.discoveredRelicIds);
      let changed = false;
      for (const it of items) {
        if (!existing.has(it.templateId)) {
          existing.add(it.templateId);
          changed = true;
        }
      }
      if (!changed) return prev;
      let next: CampaignRecords = { ...prev, discoveredRelicIds: Array.from(existing) };
      if (existing.size >= 8) {
        const res = grantAchievements(next, ['codex_half']);
        next = res.updated;
        if (res.newlyUnlocked.length > 0) setTrophyToast(res.newlyUnlocked[0]);
      }
      saveCampaignRecords(next);
      return next;
    });
  }, []);

  const recordVictoryMetrics = useCallback(() => {
    const clearSec = Math.max(1, Math.round((Date.now() - runStartMsRef.current) / 1000));
    const victoryShards = scaleShardsByPact(5, pactMods.shardMult);
    setRunShardsEarned((s) => s + victoryShards);
    setRecords((prev) => {
      const nextDaily =
        isDailyRun && !prev.dailyClears.includes(dailyInfo.label)
          ? [...prev.dailyClears, dailyInfo.label]
          : prev.dailyClears;
      const nextDailyHist = isDailyRun
        ? [
            { date: dailyInfo.label, gold, week },
            ...prev.dailyHistory.filter((d) => d.date !== dailyInfo.label),
          ].slice(0, 20)
        : prev.dailyHistory;
      const nextFastest =
        prev.fastestClearSec === null ? clearSec : Math.min(prev.fastestClearSec, clearSec);
      const trophyIds = ['debt_cleared'];
      if (difficultyId === 'veteran') trophyIds.push('gatekeeper_win');
      if (pactMods.heatLevel >= 5) trophyIds.push('heat_5_win');
      const { updated, newlyUnlocked } = grantAchievements(
        {
          ...prev,
          gateShards: prev.gateShards + victoryShards,
          fastestClearSec: nextFastest,
          dailyClears: nextDaily,
          dailyHistory: nextDailyHist,
          totalVictories: prev.totalVictories + 1,
          highestHeatCleared: Math.max(prev.highestHeatCleared, pactMods.heatLevel),
        },
        trophyIds,
      );
      if (newlyUnlocked.length > 0) setTrophyToast(newlyUnlocked[0]);
      saveCampaignRecords(updated);
      return updated;
    });
  }, [dailyInfo.label, difficultyId, gold, isDailyRun, pactMods.heatLevel, pactMods.shardMult, week]);

  useEffect(() => {
    if (gold > records.bestGold) {
      setRecords((prev) => {
        if (gold <= prev.bestGold) return prev;
        const next = { ...prev, bestGold: gold };
        saveCampaignRecords(next);
        return next;
      });
    }
  }, [gold, records.bestGold]);

  // Keep HTML lang attribute synchronized
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Listen to browser fullscreen changes (e.g. Escape / F11)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const flashNotice = useCallback((msg: string) => {
    setNoticeBanner(msg);
  }, []);

  useEffect(() => {
    if (!noticeBanner) return;
    const id = window.setTimeout(() => setNoticeBanner(null), 2600);
    return () => clearTimeout(id);
  }, [noticeBanner]);

  const applyContractProgress = useCallback(
    (kind: ContractKind, amount = 1) => {
      const cur = activeContractRef.current;
      const res = advanceContractProgress(cur, kind, amount);
      if (res.updated.progress === cur.progress) return;
      if (res.justCompleted) {
        const shardsReward = scaleShardsByPact(cur.rewardShards, pactMods.shardMult);
        audioRef.current?.playCashBell();
        setGold((g) => g + cur.rewardGold);
        setRunShardsEarned((s) => s + shardsReward);
        setRecords((prev) => {
          const nextContracts = prev.contractsCompleted + 1;
          let next: CampaignRecords = {
            ...prev,
            gateShards: prev.gateShards + shardsReward,
            contractsCompleted: nextContracts,
          };
          if (nextContracts >= 10) {
            const achRes = grantAchievements(next, ['contract_legend']);
            next = achRes.updated;
            if (achRes.newlyUnlocked.length > 0) setTrophyToast(achRes.newlyUnlocked[0]);
          }
          saveCampaignRecords(next);
          return next;
        });
        contractStepRef.current += 1;
        const nextContract = createRunContract(
          week * 17 + day * 5 + gold,
          contractStepRef.current,
        );
        activeContractRef.current = nextContract;
        setActiveContract(nextContract);
        flashNotice(
          `✓ ${t(lang, cur.nameKey as TranslationKey)}: +${cur.rewardGold}g · +${shardsReward} ◆`,
        );
      } else {
        activeContractRef.current = res.updated;
        setActiveContract(res.updated);
      }
    },
    [day, flashNotice, gold, lang, pactMods.shardMult, week],
  );

  const openShopModal = useCallback(() => {
    let nextStash = stash;
    if (!shopSession) {
      shopStartGoldRef.current = gold;
      setLiveAuction(null);
      const created = createShopSession(stash, pedestalCount, weekConfig.eraTrend, Math.random, {
        initialStreak: lastDealStreak,
        fairBonusMult:
          activeArchetype.fairBonusMult *
          charterBonuses.fairPriceMult *
          dayEventMods.shopFairMult *
          familiarBonuses.shopFairMult,
        bountyEra,
        streakComboBonus: dayEventMods.shopComboBonus,
      });
      nextStash = created.remainingStash;
      setStash(nextStash);
      spawnNextCustomer(
        created.session,
        activeDiff.patienceBonus +
          activeArchetype.patienceBonus +
          dayEventMods.shopPatienceBonus +
          familiarBonuses.shopPatienceBonus,
        Math.random,
      );
      setShopSession(created.session);
    } else if (!shopSession.activeCustomer) {
      const cloned: ShopSessionState = {
        ...shopSession,
        pedestals: [...shopSession.pedestals],
      };
      spawnNextCustomer(
        cloned,
        activeDiff.patienceBonus +
          activeArchetype.patienceBonus +
          dayEventMods.shopPatienceBonus +
          familiarBonuses.shopPatienceBonus,
        Math.random,
      );
      setShopSession(cloned);
    }
    setShopFeedback(null);
    setActiveModal('shop');
    setShellMode('modal');
    sceneRef.current?.setShellMode('modal');
  }, [
    activeArchetype.fairBonusMult,
    activeArchetype.patienceBonus,
    activeDiff.patienceBonus,
    bountyEra,
    charterBonuses.fairPriceMult,
    dayEventMods.shopComboBonus,
    dayEventMods.shopFairMult,
    dayEventMods.shopPatienceBonus,
    familiarBonuses.shopFairMult,
    familiarBonuses.shopPatienceBonus,
    gold,
    lastDealStreak,
    pedestalCount,
    shopSession,
    stash,
    weekConfig.eraTrend,
  ]);

  // Mutable ref holding latest callback logic so WebGL mount stays stable
  const callbacksRef = useRef({
    onPickupRelic: (_item: BagRelicItem): boolean => false,
    onEarnGold: (_amount: number) => {},
    onInteractSpot: (_spot: InteractSpotId) => {},
    onAltarGildBag: () => {},
    onOfferBoons: (_choices: BoonDef[]) => {},
    onPlayerDied: () => {},
    onEscapeToggle: () => {},
    onBagToggle: () => {},
    onToggleHideHud: () => {},
    onMimicExposed: (_stunned: boolean) => {},
    onEnemiesKilled: (_types: string[], _killedBossId: BossId | null) => {},
    onElitesKilled: (_count: number) => {},
    onPropSmashed: (_count: number) => {},
    onAppraisalStrike: () => {},
  });

  callbacksRef.current = {
    onPickupRelic: (item: BagRelicItem) => {
      const nextBag = [...bagRef.current];
      const added = addItemToBag(nextBag, item);
      if (added) {
        bagRef.current = nextBag;
        setBag(nextBag);
        unlockRelicsInCodex([item]);
        if (nextBag[0] && nextBag[1] && nextBag[2]) {
          awardTrophies(['belt_trinity']);
        }
        flashNotice(
          `+ ${item.name}${item.bountySealed ? ' (3× BOUNTY!)' : item.pristine ? ' (2× PRISTINE!)' : ''}`,
        );
      } else {
        flashNotice('Pack is full! Open Pack [B] to rearrange.');
      }
      return added;
    },
    onEarnGold: (amount: number) => {
      setGold((g) => g + amount);
    },
    onToggleHideHud: () => {
      setHudHidden((prev) => !prev);
    },
    onMimicExposed: (stunned: boolean) => {
      if (stunned) {
        awardTrophies(['mimic_busted']);
      }
    },
    onEnemiesKilled: (types: string[], killedBossId: BossId | null) => {
      if (types.length === 0 && !killedBossId) return;
      const bossShards = killedBossId
        ? scaleShardsByPact(liveHud.floor >= 3 ? 3 : 1, pactMods.shardMult)
        : 0;
      if (bossShards > 0) {
        setRunShardsEarned((s) => s + bossShards);
        flashNotice(`+${bossShards} ◆ ${t(lang, 'shards_label')}!`);
      }
      setRecords((prev) => {
        const nextKills = { ...prev.enemyKills };
        for (const kind of types) {
          nextKills[kind] = (nextKills[kind] ?? 0) + 1;
        }
        if (killedBossId) {
          nextKills[killedBossId] = (nextKills[killedBossId] ?? 0) + 1;
        }
        let next: CampaignRecords = {
          ...prev,
          enemyKills: nextKills,
          gateShards: prev.gateShards + bossShards,
        };
        if (killedBossId) {
          const res = grantAchievements(next, ['boss_slayer']);
          next = res.updated;
          if (res.newlyUnlocked.length > 0) setTrophyToast(res.newlyUnlocked[0]);
        }
        saveCampaignRecords(next);
        return next;
      });
      if (types.length > 0) {
        applyContractProgress('slay_enemies', types.length);
      }
    },
    onElitesKilled: (count: number) => {
      if (count <= 0) return;
      const bonusShards = scaleShardsByPact(count, pactMods.shardMult);
      setRunShardsEarned((s) => s + bonusShards);
      flashNotice(`★ Elite Slain! +${bonusShards} ◆`);
      setRecords((prev) => {
        const nextElites = prev.eliteKills + count;
        let next: CampaignRecords = {
          ...prev,
          eliteKills: nextElites,
          gateShards: prev.gateShards + bonusShards,
        };
        if (nextElites >= 5) {
          const achRes = grantAchievements(next, ['elite_slayer']);
          next = achRes.updated;
          if (achRes.newlyUnlocked.length > 0) setTrophyToast(achRes.newlyUnlocked[0]);
        }
        saveCampaignRecords(next);
        return next;
      });
    },
    onPropSmashed: (count: number) => {
      applyContractProgress('smash_props', count);
    },
    onAppraisalStrike: () => {
      applyContractProgress('appraisal_hits', 1);
    },
    onAltarGildBag: () => {
      const nextBag = [...bagRef.current];
      const count = gildAllBagItems(nextBag);
      bagRef.current = nextBag;
      setBag(nextBag);
      flashNotice(
        count > 0
          ? `Altar Blessing! ${count} Pack relics turned Pristine 2×!`
          : 'Altar Sacrifice sealed — fate quickens!',
      );
    },
    onInteractSpot: (spot: InteractSpotId) => {
      const enterExpedition = (mode: DungeonMode) => {
        if (mode === 'rift') {
          if (gold < RIFT_ENTRY_COST) {
            flashNotice(t(lang, 'rift_need_gold', { g: RIFT_ENTRY_COST }));
            return;
          }
          setGold((g) => g - RIFT_ENTRY_COST);
        }
        const runSupplies = [...ownedSupplies];
        setActiveRunSupplies(runSupplies);
        setOwnedSupplies([]);
        const supBonuses = computeSupplyBonuses(runSupplies);
        const troIds: string[] = [];
        if (records.activePacts.length >= 3) troIds.push('pact_3');
        if (runSupplies.length >= 2) troIds.push('supply_master');
        if (troIds.length > 0) awardTrophies(troIds);

        const mods: RunModifiers = {
          maxJumpCharges: activeArchetype.maxJumpCharges,
          jumpCooldownMult: activeArchetype.jumpCooldownMult,
          specialDmgMult: activeArchetype.specialDmgMult * familiarBonuses.specialDmgMult,
          specialCooldownMult: activeArchetype.specialCooldownMult,
          bountyEra,
          secretKeyGranted,
          pawnDmgBuff: Boolean(livePawn?.buffActive),
          beltSpeedMult: beltPerks.speedMult,
          beltSpecialCdMult: beltPerks.specialCdMult,
          beltFloorHeal: beltPerks.floorHeal,
          beltAbyssPoison: beltPerks.abyssPoison,
          beltDmgMult: beltPerks.dmgMult,
          pactEnemyHpMult: pactMods.enemyHpMult,
          pactEnemySpeedMult: pactMods.enemySpeedMult,
          pactMarauderMult: pactMods.marauderTimeMult,
          weaponDmgMult,
          charterDmgMult: charterBonuses.bonusDmgMult,
          pactBonusRarity: pactMods.bonusRarity,
          revealMap: supBonuses.revealMap,
          supplyDmgMult: supBonuses.dmgMult,
          supplyCritBonus: supBonuses.critBonus,
          extraChest: dayEventMods.extraChest,
          bonusElite: dayEventMods.bonusElite,
          goldDropMult: dayEventMods.goldDropMult * familiarBonuses.goldDropMult,
          eventMarauderMult: dayEventMods.marauderTimeMult,
          familiarId: records.equippedFamiliar,
          riftTier: riftScale.tier,
        };
        setBoonRerollsLeft(charterBonuses.boonRerolls + familiarBonuses.boonRerollBonus);
        sceneRef.current?.setRunModifiers(mods);
        if (livePawn?.buffActive) {
          sceneRef.current?.setPlayerCaps(maxHp, effectiveMaxPotions, true);
        }
        sceneRef.current?.enterDungeon(1, week, mode);
        flashNotice(
          mode === 'rift'
            ? `${t(lang, 'rift_banner')} (Bounty: ${bountyEra.toUpperCase()} 3×)`
            : `${t(lang, weekConfig.biomeNameKey as never)} — Floor 1 (Bounty: ${bountyEra.toUpperCase()} 3×)`,
        );
      };

      if (spot === 'gate') {
        enterExpedition('gate');
      } else if (spot === 'rift') {
        enterExpedition('rift');
      } else if (spot === 'shop') {
        openShopModal();
      } else if (spot === 'forge') {
        setActiveModal('forge');
        setShellMode('modal');
        sceneRef.current?.setShellMode('modal');
      } else if (spot === 'alchemy') {
        setActiveModal('alchemy');
        setShellMode('modal');
        sceneRef.current?.setShellMode('modal');
      } else if (spot === 'altar') {
        setActiveModal('shrine');
        setShellMode('modal');
        sceneRef.current?.setShellMode('modal');
      } else if (spot === 'exit_portal') {
        const isRift = liveHud.dungeonMode === 'rift';
        if (!isRift && liveHud.floor < 3) {
          const nextFloor = liveHud.floor + 1;
          sceneRef.current?.enterDungeon(nextFloor, week, 'gate');
          flashNotice(`${t(lang, weekConfig.biomeNameKey as never)} — Floor ${nextFloor}`);
        } else {
          // Floor 3 or Forgotten Rift victory extraction!
          const extracted = resolveBagExtraction(bag, true);
          unlockRelicsInCodex(extracted.savedItems);
          const troList: string[] = [];
          if (extracted.fusedNames.length > 0) troList.push('radiant_fusion');
          if (secretKeyGranted) troList.push('secret_vault');
          if (isRift) {
            troList.push('rift_conqueror');
            const nextRiftClears = records.riftClears + 1;
            if (nextRiftClears >= 3) troList.push('rift_tier_3');
            const riftShards = scaleShardsByPact(1 + riftScale.bonusShards, pactMods.shardMult);
            setRunShardsEarned((s) => s + riftShards);
            setRecords((prev) => {
              const next: CampaignRecords = {
                ...prev,
                riftClears: prev.riftClears + 1,
                gateShards: prev.gateShards + riftShards,
              };
              saveCampaignRecords(next);
              return next;
            });
          }
          if (troList.length > 0) awardTrophies(troList);
          const redeemedItem = livePawn ? [livePawn.item] : [];
          setStash((prev) => [...prev, ...extracted.savedItems, ...redeemedItem]);
          setBag(createEmptyBag());
          setLivePawn(null);
          setSecretKeyGranted(false);
          setActiveRunSupplies([]);
          const eras: RelicEra[] = ['astral', 'hearth', 'abyss', 'forge'];
          setBountyEra(eras[(week + day) % eras.length]);
          sceneRef.current?.returnToCourtyard(week, true);
          setLedgerSummary({
            title: isRift ? t(lang, 'rift_banner') : t(lang, 'loc_dungeon', { f: 3 }),
            goldDelta: 0,
            relicsExtracted: extracted.savedItems.length + redeemedItem.length,
            fusedNames: extracted.fusedNames,
            eraSets: extracted.eraSets,
            beltTags: beltPerks.activeTags,
            debtPaid,
            debtTarget,
          });
          setShellMode('modal');
          sceneRef.current?.setShellMode('modal');
        }
      }
    },
    onOfferBoons: (choices: BoonDef[]) => {
      setBoonChoices(choices);
      setShellMode('modal');
      sceneRef.current?.setShellMode('modal');
    },
    onPlayerDied: () => {
      const extracted = resolveBagExtraction(bag, false, activeSupplyBonuses.extraSavedSlots);
      unlockRelicsInCodex(extracted.savedItems);
      setStash((prev) => [...prev, ...extracted.savedItems]);
      setBag(createEmptyBag());
      setLivePawn(null);
      setSecretKeyGranted(false);
      setActiveRunSupplies([]);
      setBoonChoices(null);
      setActiveModal('none');
      setShellMode('gameover');
      sceneRef.current?.setShellMode('gameover');
      if (metricsRef.current) pushMetricEvent(metricsRef.current, 'player_died');
    },
    onEscapeToggle: () => {
      if (boonChoices) return;
      if (ledgerSummary) {
        setLedgerSummary(null);
        setShellMode('playing');
        sceneRef.current?.setShellMode('playing');
        return;
      }
      if (showCharterModal) {
        setShowCharterModal(false);
        return;
      }
      if (showSettingsModal) {
        setShowSettingsModal(false);
        return;
      }
      if (showCodexModal) {
        setShowCodexModal(false);
        return;
      }
      if (showLangModal) {
        setShowLangModal(false);
        return;
      }
      if (activeModal !== 'none') {
        setActiveModal('none');
        setShellMode('playing');
        sceneRef.current?.setShellMode('playing');
        return;
      }
      if (shellMode === 'playing') {
        setShellMode('paused');
        sceneRef.current?.setShellMode('paused');
      } else if (shellMode === 'paused') {
        setShellMode('playing');
        sceneRef.current?.setShellMode('playing');
      }
    },
    onBagToggle: () => {
      if (activeModal === 'bag') {
        setActiveModal('none');
        setShellMode('playing');
        sceneRef.current?.setShellMode('playing');
      } else if (activeModal === 'none' && shellMode === 'playing') {
        setActiveModal('bag');
        setShellMode('modal');
        sceneRef.current?.setShellMode('modal');
      }
    },
  };

  // Mount Three.js Gate Scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const seed = parseSeed(window.location.search);
    const input = createInputHub(container);
    const audio = createDynamicAudioEngine();
    const metrics = initMetrics(seed);

    inputRef.current = input;
    input.setKeybinds(settings.keybinds);
    audioRef.current = audio;
    metricsRef.current = metrics;
    document.body.dataset.state = initialAutoStart ? 'playing' : 'title';

    const handle = mountGateScene(
      container,
      input,
      audio,
      metrics,
      seed,
      CONTENT.weapons[0],
      CONTENT.difficulties.standard,
      CONTENT.relics,
      {
        onHudUpdate: (nextHud) => setLiveHud(nextHud),
        onPickupRelic: (item) => callbacksRef.current.onPickupRelic(item),
        onEarnGold: (amount) => callbacksRef.current.onEarnGold(amount),
        onInteractSpot: (spot) => callbacksRef.current.onInteractSpot(spot),
        onAltarGildBag: () => callbacksRef.current.onAltarGildBag(),
        onOfferBoons: (choices) => callbacksRef.current.onOfferBoons(choices),
        onPlayerDied: () => callbacksRef.current.onPlayerDied(),
        onEscapeToggle: () => callbacksRef.current.onEscapeToggle(),
        onBagToggle: () => callbacksRef.current.onBagToggle(),
        onToggleHideHud: () => callbacksRef.current.onToggleHideHud(),
        onMimicExposed: (stunned) => callbacksRef.current.onMimicExposed(stunned),
        onEnemiesKilled: (types, killedBossId) =>
          callbacksRef.current.onEnemiesKilled(types, killedBossId),
        onElitesKilled: (count) => callbacksRef.current.onElitesKilled(count),
        onPropSmashed: (count) => callbacksRef.current.onPropSmashed(count),
        onAppraisalStrike: () => callbacksRef.current.onAppraisalStrike(),
        onGraphicsDowngrade: (nextQuality) =>
          setSettings((prev) =>
            prev.graphicsQuality === nextQuality ? prev : { ...prev, graphicsQuality: nextQuality },
          ),
      },
    );
    sceneRef.current = handle;
    audio.setMusicVolume(settings.musicVolume);
    audio.setSfxVolume(settings.sfxVolume);
    handle.setGraphicsQuality(settings.graphicsQuality);
    handle.setPlayerCaps(maxHp, effectiveMaxPotions, true);
    handle.setRunModifiers({
      familiarId: records.equippedFamiliar,
      riftTier: riftScale.tier,
    });

    if (initialAutoStart) {
      handle.setShellMode('playing');
    }

    return () => {
      sceneRef.current = null;
      inputRef.current = null;
      metricsRef.current = null;
      handle.dispose();
      audio.dispose();
      input.dispose();
    };
  }, [initialAutoStart]);

  // Sync Difficulty, Weapon, Player Caps, Run Modifiers, Settings & Courtyard Atmospherics cleanly
  useEffect(() => {
    inputRef.current?.setKeybinds(settings.keybinds);
    audioRef.current?.setMusicVolume(settings.musicVolume);
    audioRef.current?.setSfxVolume(settings.sfxVolume);
    sceneRef.current?.setGraphicsQuality(settings.graphicsQuality);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.gfx = settings.graphicsQuality;
    }
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    sceneRef.current?.setRunModifiers({
      familiarId: records.equippedFamiliar,
      riftTier: riftScale.tier,
    });
  }, [records.equippedFamiliar, riftScale.tier]);

  useEffect(() => {
    sceneRef.current?.setDifficulty(activeDiff);
  }, [activeDiff]);

  useEffect(() => {
    sceneRef.current?.setWeapon(equippedWeapon, skillMult);
  }, [equippedWeapon, skillMult]);

  useEffect(() => {
    sceneRef.current?.setPlayerCaps(maxHp, effectiveMaxPotions, false);
  }, [maxHp, effectiveMaxPotions]);

  useEffect(() => {
    sceneRef.current?.setRunModifiers({
      maxJumpCharges: activeArchetype.maxJumpCharges,
      jumpCooldownMult: activeArchetype.jumpCooldownMult,
      specialDmgMult: activeArchetype.specialDmgMult,
      specialCooldownMult: activeArchetype.specialCooldownMult,
      bountyEra,
      secretKeyGranted,
      pawnDmgBuff: Boolean(livePawn?.buffActive),
      beltSpeedMult: beltPerks.speedMult,
      beltSpecialCdMult: beltPerks.specialCdMult,
      beltFloorHeal: beltPerks.floorHeal,
      beltAbyssPoison: beltPerks.abyssPoison,
      beltDmgMult: beltPerks.dmgMult,
      pactEnemyHpMult: pactMods.enemyHpMult,
      pactEnemySpeedMult: pactMods.enemySpeedMult,
      pactMarauderMult: pactMods.marauderTimeMult,
      weaponDmgMult,
      charterDmgMult: charterBonuses.bonusDmgMult,
      pactBonusRarity: pactMods.bonusRarity,
    });
  }, [
    activeArchetype,
    beltPerks,
    bountyEra,
    charterBonuses.bonusDmgMult,
    livePawn,
    pactMods,
    secretKeyGranted,
    weaponDmgMult,
  ]);

  useEffect(() => {
    const streak = shopSession?.dealStreak ?? lastDealStreak;
    sceneRef.current?.setCourtyardVisuals({
      prestigeBanners: streak >= 3,
      weatherStorm: day >= weekConfig.daysPerWeek,
      bountyHint: `Bounty: ${bountyEra.toUpperCase()} 3×`,
    });
    const dayRatio =
      activeModal === 'shop'
        ? 0.65
        : (day - 1) / Math.max(1, weekConfig.daysPerWeek - 1);
    sceneRef.current?.setTimeOfDay(dayRatio);
  }, [activeModal, bountyEra, day, lastDealStreak, shopSession?.dealStreak, weekConfig.daysPerWeek]);

  const toggleFullscreen = async () => {
    audioRef.current?.unlock();
    audioRef.current?.playUiClick();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Safe fallback inside restricted iframes
      setIsFullscreen((prev) => !prev);
    }
  };

  const resetCampaignState = (targetArch: ArchetypeId = archetypeId, daily = isDailyRun) => {
    const arch = ARCHETYPES[targetArch];
    const startSeed = daily ? dailyInfo.seed : parseSeed(window.location.search);
    const startMaxHp = 5 + charterBonuses.bonusHp;
    const startMaxPotions = 2 + charterBonuses.bonusPotions;
    sceneRef.current?.setSeed(startSeed);
    setGold(arch.startGold + charterBonuses.bonusGold);
    setWeek(1);
    setDay(1);
    setDebtPaid(0);
    setUnlockedWeapons(['sword']);
    setEquippedWeaponId('sword');
    setWeaponTiers({ sword: 1, spear: 1, hammer: 1, twinblades: 1 });
    setUpgradeLevels({ display_tier: 0, forge_temper: 0, potion_belt: 0 });
    setBag(createEmptyBag());
    setStash(createStarterStash());
    setShopSession(null);
    setShopFeedback(null);
    setLivePawn(null);
    setLiveAuction(null);
    setLedgerSummary(null);
    setEndlessMode(false);
    setHudHidden(false);
    setSecretKeyGranted(false);
    setLastDealStreak(0);
    setBoonChoices(null);
    setBoonRerollsLeft(charterBonuses.boonRerolls);
    setRunShardsEarned(0);
    setOwnedSupplies([]);
    setActiveRunSupplies([]);
    setDayEvent(rollDayEvent(startSeed + 1));
    contractStepRef.current = 0;
    const initContract = createRunContract(startSeed, 0);
    activeContractRef.current = initContract;
    setActiveContract(initContract);
    setBountyEra(daily ? (['astral', 'hearth', 'abyss', 'forge'] as RelicEra[])[dailyInfo.seed % 4] : 'astral');
    setActiveModal('none');
    runStartMsRef.current = Date.now();
    sceneRef.current?.setWeapon(CONTENT.weapons[0], 1);
    sceneRef.current?.setRunModifiers({
      maxJumpCharges: arch.maxJumpCharges,
      jumpCooldownMult: arch.jumpCooldownMult,
      specialDmgMult: arch.specialDmgMult * familiarBonuses.specialDmgMult,
      specialCooldownMult: arch.specialCooldownMult,
      bountyEra: 'astral',
      secretKeyGranted: false,
      pawnDmgBuff: false,
      beltSpeedMult: 1,
      beltSpecialCdMult: 1,
      beltFloorHeal: 0,
      beltAbyssPoison: false,
      beltDmgMult: 1,
      pactEnemyHpMult: pactMods.enemyHpMult,
      pactEnemySpeedMult: pactMods.enemySpeedMult,
      pactMarauderMult: pactMods.marauderTimeMult,
      weaponDmgMult: 1,
      charterDmgMult: charterBonuses.bonusDmgMult,
      pactBonusRarity: pactMods.bonusRarity,
      revealMap: false,
      supplyDmgMult: 1,
      supplyCritBonus: 0,
      extraChest: false,
      bonusElite: false,
      goldDropMult: familiarBonuses.goldDropMult,
      eventMarauderMult: 1,
      familiarId: records.equippedFamiliar,
      riftTier: riftScale.tier,
    });
    sceneRef.current?.resetCourtyard(startMaxHp, startMaxPotions);
    if (metricsRef.current) {
      metricsRef.current.completed = false;
      metricsRef.current.distanceMoved = 0;
      metricsRef.current.dodgeCount = 0;
      metricsRef.current.events.length = 0;
    }
  };

  const incrementRunCount = () => {
    setRecords((prev) => {
      const next = { ...prev, totalRuns: prev.totalRuns + 1 };
      saveCampaignRecords(next);
      return next;
    });
  };

  const handleStartCampaign = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    audioRef.current?.unlock();
    audioRef.current?.playUiClick();
    setIsDailyRun(false);
    incrementRunCount();
    resetCampaignState(archetypeId, false);
    setShellMode('playing');
    sceneRef.current?.setDifficulty(activeDiff);
    sceneRef.current?.setShellMode('playing');
  };

  const handleStartDailyRun = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    audioRef.current?.unlock();
    audioRef.current?.playAppraisal();
    setIsDailyRun(true);
    incrementRunCount();
    resetCampaignState(archetypeId, true);
    setShellMode('playing');
    sceneRef.current?.setDifficulty(activeDiff);
    sceneRef.current?.setShellMode('playing');
    flashNotice(`Daily Gate Seed · ${dailyInfo.label}`);
  };

  const handleExitToMainMenu = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    audioRef.current?.playUiClick();
    resetCampaignState(archetypeId, false);
    setIsDailyRun(false);
    setShellMode('title');
    sceneRef.current?.setShellMode('title');
  };

  const handleRestartCampaign = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    audioRef.current?.unlock();
    audioRef.current?.playUiClick();
    incrementRunCount();
    resetCampaignState(archetypeId, isDailyRun);
    setShellMode('playing');
    sceneRef.current?.setShellMode('playing');
  };

  const handlePauseToggle = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    audioRef.current?.unlock();
    audioRef.current?.playUiClick();
    if (shellMode === 'paused') {
      setShellMode('playing');
      sceneRef.current?.setShellMode('playing');
    } else if (shellMode === 'playing') {
      setShellMode('paused');
      sceneRef.current?.setShellMode('paused');
    }
  };

  const handleMuteToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    audioRef.current?.unlock();
    const nextMuted = !(audioRef.current?.isMuted() ?? false);
    audioRef.current?.setMuted(nextMuted);
    setLiveHud((prev) => ({ ...prev, muted: nextMuted }));
  };

  // Shop handlers
  const handleCloseShop = () => {
    audioRef.current?.playUiClick();
    const netDelta = gold - shopStartGoldRef.current;
    if (liveAuction && !liveAuction.walked && liveAuction.settledGold === 0) {
      setStash((prev) => [liveAuction.item, ...prev]);
    }
    setLiveAuction(null);
    if (shopSession) {
      setLastDealStreak(shopSession.dealStreak);
      // Return unsold pedestal relics back to stash cleanly
      const unsold = shopSession.pedestals.filter((p): p is BagRelicItem => p !== null);
      setStash((prev) => [...unsold, ...prev]);
      setShopSession(null);
    }
    setActiveModal('none');

    const closedLabel = t(lang, 'hud_week_day', { w: week, d: day });
    let nextPaidForSummary = debtPaid;
    let nextTargetForSummary = debtTarget;

    // Advance day / check weekly debt
    const nextDay = day + 1;
    if (nextDay > weekConfig.daysPerWeek) {
      if (debtPaid >= debtTarget) {
        if (!endlessMode && week >= CONTENT.weeks.length) {
          recordVictoryMetrics();
          setShellMode('victory');
          sceneRef.current?.setShellMode('victory');
          if (metricsRef.current) {
            metricsRef.current.completed = true;
            pushMetricEvent(metricsRef.current, 'campaign_victory');
          }
          return;
        }
        const nextW = week + 1;
        setWeek(nextW);
        setDay(1);
        setDebtPaid(0);
        nextPaidForSummary = 0;
        if (nextW >= 5) {
          const endlessShards = scaleShardsByPact(1, pactMods.shardMult);
          setRunShardsEarned((s) => s + endlessShards);
          setRecords((prev) => {
            const tro = nextW >= 8 ? ['endless_5', 'endless_8'] : ['endless_5'];
            const res = grantAchievements(
              {
                ...prev,
                gateShards: prev.gateShards + endlessShards,
                highestEndlessWeek: Math.max(prev.highestEndlessWeek, nextW),
              },
              tro,
            );
            if (res.newlyUnlocked.length > 0) setTrophyToast(res.newlyUnlocked[0]);
            saveCampaignRecords(res.updated);
            return res.updated;
          });
        }
        const nextRawTarget =
          nextW <= CONTENT.weeks.length
            ? CONTENT.weeks[nextW - 1].debtTarget
            : 420 + (nextW - 1) * 180;
        nextTargetForSummary = Math.round(nextRawTarget * activeDiff.debtMult * pactMods.debtMult);
        flashNotice(`Week ${nextW} Unlocked! New debt ledger opened.`);
      } else {
        setDay(1);
        flashNotice('Debt deadline missed! Week reset to Day 1.');
      }
      setDayEvent(rollDayEvent((week + 1) * 19 + (isDailyRun ? dailyInfo.seed : 0)));
    } else {
      setDay(nextDay);
      setDayEvent(rollDayEvent(week * 13 + nextDay * 7 + (isDailyRun ? dailyInfo.seed : 0)));
    }

    setLedgerSummary({
      title: closedLabel,
      goldDelta: netDelta,
      relicsExtracted: 0,
      fusedNames: [],
      beltTags: beltPerks.activeTags,
      debtPaid: nextPaidForSummary,
      debtTarget: nextTargetForSummary,
    });
    setShellMode('modal');
    sceneRef.current?.setShellMode('modal');
  };

  const handlePayDebt = (amount: number) => {
    if (amount <= 0 || gold < amount) return;
    audioRef.current?.playCoin();
    const nextPaid = debtPaid + amount;
    setGold((g) => g - amount);
    setDebtPaid(nextPaid);
    if (!endlessMode && nextPaid >= debtTarget && week >= CONTENT.weeks.length) {
      if (shopSession) {
        setLastDealStreak(shopSession.dealStreak);
        const unsold = shopSession.pedestals.filter((p): p is BagRelicItem => p !== null);
        setStash((prev) => [...unsold, ...prev]);
        setShopSession(null);
      }
      setLiveAuction(null);
      recordVictoryMetrics();
      setActiveModal('none');
      setShellMode('victory');
      sceneRef.current?.setShellMode('victory');
      if (metricsRef.current) {
        metricsRef.current.completed = true;
        pushMetricEvent(metricsRef.current, 'campaign_victory');
      }
    }
  };

  const currentLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];
  const isRtl = isRtlLanguage(lang);
  const currentLocLabel =
    liveHud.zone === 'courtyard'
      ? t(lang, 'loc_courtyard')
      : liveHud.dungeonMode === 'rift'
        ? t(lang, 'rift_banner')
        : t(lang, 'loc_dungeon', { f: Math.max(1, liveHud.floor) });

  const interactLabel = useMemo(() => {
    switch (liveHud.nearbyInteract) {
      case 'gate':
        return t(lang, 'interact_gate');
      case 'rift': {
        const base = t(lang, 'interact_rift', { g: RIFT_ENTRY_COST });
        return riftScale.tier > 1 ? `T${riftScale.tier} · ${base}` : base;
      }
      case 'shop':
        return t(lang, 'interact_shop');
      case 'forge':
        return t(lang, 'interact_forge');
      case 'alchemy':
        return t(lang, 'interact_alchemy');
      case 'chest':
        return t(lang, 'interact_chest');
      case 'secret_chest':
        return t(lang, 'interact_secret_chest');
      case 'altar':
        return t(lang, 'interact_altar');
      case 'exit_portal':
        return liveHud.dungeonMode === 'rift' || liveHud.floor >= 3
          ? t(lang, 'interact_extract')
          : t(lang, 'interact_descend', { f: liveHud.floor + 1 });
      case 'door_n':
        return t(lang, 'interact_door_n');
      case 'door_s':
        return t(lang, 'interact_door_s');
      case 'door_e':
        return t(lang, 'interact_door_e');
      case 'door_w':
        return t(lang, 'interact_door_w');
      default:
        return null;
    }
  }, [lang, liveHud.dungeonMode, liveHud.floor, liveHud.nearbyInteract]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070B18]" dir="ltr">
      {/* Isolated WebGL 3D Scene Container */}
      <div
        ref={mountRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* Directional RTL Wrapper strictly for UI Overlays */}
      <div className="pointer-events-none z-10 absolute inset-0" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* TITLE SCREEN */}
        {shellMode === 'title' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Left Title Glassmorphism Cluster */}
              <div
                data-ui-interactive="true"
                className="pointer-events-auto flex flex-col items-start gap-3 max-w-md"
              >
                <TitleLedgerEmblem
                  title={t(lang, 'game_title')}
                  subtitle={t(lang, 'game_subtitle')}
                />

                {/* Archetype Picker */}
                <div className="glass-panel flex flex-col gap-1.5 w-full rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#F4B942]">
                      {t(lang, 'arch_label')}
                    </span>
                    <span className="text-[10px] font-bold text-[#9EB4DA]">
                      {records.bestGold}g · {records.bestStreak}× · {records.dailyClears.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['merchant', 'acrobat', 'smith'] as const).map((aId) => {
                      const def = ARCHETYPES[aId];
                      const active = archetypeId === aId;
                      const titleKey =
                        aId === 'merchant'
                          ? 'arch_merchant'
                          : aId === 'acrobat'
                            ? 'arch_acrobat'
                            : 'arch_smith';
                      const perkKey =
                        aId === 'merchant'
                          ? 'arch_merchant_perk'
                          : aId === 'acrobat'
                            ? 'arch_acrobat_perk'
                            : 'arch_smith_perk';
                      return (
                        <TitleArchetypeCard
                          key={aId}
                          title={t(lang, titleKey)}
                          perk={t(lang, perkKey)}
                          accent={def.accent}
                          active={active}
                          tiltEnabled={gfxProfile.cardTilt3d}
                          onSelect={() => {
                            audioRef.current?.unlock();
                            audioRef.current?.playUiClick();
                            setArchetypeId(aId);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="glass-panel flex flex-col gap-1.5 w-full rounded-xl p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#38E8D8]">
                    {t(lang, 'difficulty_label')}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['cozy', 'standard', 'veteran'] as const).map((dId) => {
                      const active = difficultyId === dId;
                      return (
                        <button
                          key={dId}
                          type="button"
                          onClick={() => {
                            audioRef.current?.unlock();
                            audioRef.current?.playUiClick();
                            setDifficultyId(dId);
                          }}
                          className={`cursor-pointer px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            active
                              ? 'bg-gradient-to-b from-[#49EFE0] to-[#23B7AB] text-[#08121E] border-[#A3FFF6] shadow-[0_0_14px_rgba(56,232,216,0.45)]'
                              : 'glass-subcard text-[#FFF4DC]/80 hover:border-[#F4B942]/60'
                          }`}
                        >
                          {t(
                            lang,
                            dId === 'cozy'
                              ? 'diff_cozy'
                              : dId === 'standard'
                                ? 'diff_standard'
                                : 'diff_veteran',
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Graphics Quality Selector */}
                <div className="glass-panel flex flex-col gap-1.5 w-full p-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F4B942]">
                    <SparkleGlyphIcon className="w-3.5 h-3.5 text-[#38E8D8]" />
                    <span>{t(lang, 'settings_gfx')}</span>
                  </span>
                  <GraphicsQualitySwitch
                    lang={lang}
                    value={settings.graphicsQuality}
                    testIdPrefix="title-gfx"
                    compact
                    onChange={(nextQuality) => {
                      audioRef.current?.unlock();
                      audioRef.current?.playUiClick();
                      setSettings((prev) => ({ ...prev, graphicsQuality: nextQuality }));
                    }}
                  />
                </div>

                {/* Primary Hero CTA + Compact Secondary Actions */}
                <div className="flex flex-col gap-2.5 w-full">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      data-start="true"
                      onClick={handleStartCampaign}
                      className="glass-gold-btn cursor-pointer px-7 py-3.5 font-bold text-base sm:text-lg tracking-wide active:translate-y-0.5 flex items-center gap-2"
                    >
                      <SparkleGlyphIcon className="w-4 h-4 text-[#081022]" />
                      <span>{t(lang, 'enter_courtyard')}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-daily-run"
                      onClick={handleStartDailyRun}
                      className="glass-teal-btn cursor-pointer px-3.5 py-2.5 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5"
                    >
                      <CalendarAlertIcon className="w-4 h-4 text-[#081022]" />
                      <span>
                        {t(lang, 'daily_btn')} ({dailyInfo.label.slice(5)})
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="btn-charter-title"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        setShowCharterModal(true);
                      }}
                      className="glass-btn cursor-pointer px-2.5 py-1.5 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <CharterSealIcon className="w-3.5 h-3.5 text-[#38E8D8]" />
                      <span>{t(lang, 'charter_btn')}</span>
                      <span className="chamfer-badge px-1.5 py-0.5 bg-[#081022] text-[#F4B942] text-[10px] tabular-nums">
                        {records.gateShards}
                      </span>
                      {pactMods.heatLevel > 0 && (
                        <span className="chamfer-badge inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#3B1626] text-[#FF5E3A] text-[10px] tabular-nums">
                          <FlameEmberIcon className="w-3 h-3" />
                          <span>{pactMods.heatLevel}</span>
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      data-testid="btn-codex-title"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        setShowCodexModal(true);
                      }}
                      className="glass-btn cursor-pointer px-2.5 py-1.5 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <CodexTomeIcon className="w-3.5 h-3.5 text-[#F4B942]" />
                      <span>{t(lang, 'codex_btn')}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-language"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        setShowLangModal(true);
                      }}
                      className="glass-btn cursor-pointer px-2.5 py-1.5 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <GlobeRuneIcon className="w-3.5 h-3.5 text-[#38E8D8]" />
                      <span>{currentLangMeta.nativeName}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Top-Right Fullscreen, Settings & Mute Controls on Title */}
              <div data-ui-interactive="true" className="pointer-events-auto flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-settings-title"
                  onClick={() => {
                    audioRef.current?.unlock();
                    audioRef.current?.playUiClick();
                    setShowSettingsModal(true);
                  }}
                  title={t(lang, 'settings_btn')}
                  className="glass-btn cursor-pointer w-10 h-10 flex items-center justify-center font-bold text-[#38E8D8]"
                >
                  <SettingsCogIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  data-testid="btn-fullscreen"
                  onClick={toggleFullscreen}
                  className="glass-btn cursor-pointer px-3 py-2 font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <FullscreenGlyphIcon exit={isFullscreen} className="w-3.5 h-3.5 text-[#38E8D8]" />
                  <span>{t(lang, isFullscreen ? 'fullscreen_exit' : 'fullscreen_enter')}</span>
                </button>
                <button
                  type="button"
                  aria-label="Audio"
                  onClick={handleMuteToggle}
                  className="glass-btn cursor-pointer w-10 h-10 flex items-center justify-center font-bold text-[#F4B942]"
                >
                  {liveHud.muted ? (
                    <SpeakerOffIcon className="w-4 h-4" />
                  ) : (
                    <SpeakerOnIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <p
              className="text-center text-xs sm:text-sm font-bold tracking-wide text-[#FFF4DC]"
              style={{ textShadow: '0 2px 6px #040712, 0 0 12px rgba(56, 232, 216, 0.45)' }}
            >
              {touchEnabled ? t(lang, 'controls_hint_touch') : t(lang, 'controls_hint_desktop')}
            </p>
          </div>
        )}

        {/* HIDE-HUD FLOATING RESTORE BUTTON */}
        {shellMode === 'playing' && hudHidden && (
          <div
            data-ui-interactive="true"
            className="pointer-events-auto absolute top-3 right-3 z-20"
          >
            <button
              type="button"
              data-testid="btn-show-hud"
              onClick={() => setHudHidden(false)}
              title={t(lang, 'hud_show')}
              className="glass-btn cursor-pointer px-2.5 py-1.5 text-xs font-bold opacity-80 hover:opacity-100 inline-flex items-center gap-1.5"
            >
              <CameraEyeIcon className="w-3.5 h-3.5 text-[#38E8D8]" />
              <span>{t(lang, 'hud_show')}</span>
            </button>
          </div>
        )}

        {/* IN-GAME HUD */}
        {shellMode !== 'title' && !hudHidden && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
            {/* Top HUD Row + Top-Anchored Banners */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                {/* Top-Left Glassmorphism Status Strip */}
                <div
                  data-ui-interactive="true"
                  className="glass-panel pointer-events-auto flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-xl"
                >
                  <div className="flex items-center gap-0.5" aria-label={t(lang, 'hud_hp')}>
                    {Array.from({ length: liveHud.maxHp }).map((_, i) => (
                      <HeartSealIcon key={i} filled={i < liveHud.hp} />
                    ))}
                  </div>
                  <div className="h-5 w-px bg-[#F4B942]/25" />
                  <div className="flex items-center gap-1" aria-label={t(lang, 'hud_gold')}>
                    <CoinSealIcon />
                    <span className="tabular-nums font-bold text-base sm:text-lg text-[#F4B942]">
                      {gold}
                    </span>
                  </div>
                  <div className="h-5 w-px bg-[#F4B942]/25" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-bold uppercase text-[#38E8D8]">
                      {endlessMode ? `${t(lang, 'endless_week_badge')} · ` : ''}
                      {t(lang, 'hud_week_day', { w: week, d: day })} · {currentLocLabel}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-[#FF9E44]">
                      {t(lang, 'hud_debt')}: {debtPaid}/{debtTarget}g · Bounty:{' '}
                      <span className="uppercase text-[#38E8D8]">{bountyEra} 3×</span>
                    </span>
                  </div>

                  {beltPerks.activeTags.length > 0 && (
                    <span
                      title={t(lang, 'belt_runes_label')}
                      className="chamfer-badge inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1A2547] text-[#F4B942] text-[10px] font-bold border border-[#F4B942]/45"
                    >
                      <SparkleGlyphIcon className="w-3 h-3" />
                      <span>{beltPerks.activeTags.length} Belt</span>
                    </span>
                  )}

                  {pactMods.heatLevel > 0 && (
                    <span
                      data-testid="hud-pact-badge"
                      className="chamfer-badge inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#3B1626] text-[#FF5E3A] text-[10px] font-bold border border-[#FF5E3A]/60"
                    >
                      <FlameEmberIcon className="w-3 h-3" />
                      <span>{pactMods.heatLevel}/5</span>
                    </span>
                  )}

                  {week > 4 && (
                    <span
                      data-testid="hud-ascension-badge"
                      className="chamfer-badge px-1.5 py-0.5 bg-[#2E1065] text-[#C084FC] text-[10px] font-bold border border-[#C084FC]/55"
                    >
                      {t(lang, 'ascension_badge', { p: (week - 4) * 12 })}
                    </span>
                  )}

                  <span
                    data-testid="hud-day-event"
                    title={t(lang, dayEvent.descKey as TranslationKey)}
                    className="chamfer-badge hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-[#081022] text-[10px] font-bold border"
                    style={{ borderColor: `${dayEvent.accent}70`, color: dayEvent.accent }}
                  >
                    <span>{dayEvent.icon}</span>
                    <span>{t(lang, dayEvent.nameKey as TranslationKey)}</span>
                  </span>

                  {(liveHud.zone === 'courtyard' ? ownedSupplies.length : activeRunSupplies.length) > 0 && (
                    <span
                      data-testid="hud-supplies-badge"
                      title={t(lang, 'supplies_title')}
                      className="chamfer-badge inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#13293D] text-[#F4B942] text-[10px] font-bold border border-[#F4B942]/50"
                    >
                      <SupplyCompassIcon className="w-3 h-3 text-[#38E8D8]" />
                      <span>{liveHud.zone === 'courtyard' ? ownedSupplies.length : activeRunSupplies.length}</span>
                    </span>
                  )}

                  {equippedFamiliarDef && (
                    <span
                      data-testid="hud-familiar-badge"
                      title={`${t(lang, equippedFamiliarDef.nameKey as TranslationKey)} — ${t(lang, equippedFamiliarDef.descKey as TranslationKey)}`}
                      className="chamfer-badge px-1.5 py-0.5 bg-[#081022] text-[10px] font-bold border"
                      style={{
                        borderColor: `${equippedFamiliarDef.accent}75`,
                        color: equippedFamiliarDef.accent,
                      }}
                    >
                      {equippedFamiliarDef.icon}
                    </span>
                  )}

                  <span
                    data-testid="hud-contract-chip"
                    className="chamfer-badge hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#081022] text-[#38E8D8] text-[10px] font-bold border border-[#38E8D8]/40"
                  >
                    <CharterSealIcon className="w-3 h-3 text-[#F4B942]" />
                    <span>{t(lang, activeContract.nameKey as TranslationKey)}</span>
                    <span className="tabular-nums text-[#FFF4DC]">
                      {activeContract.progress}/{activeContract.target}
                    </span>
                    <span className="text-[#F4B942]">
                      (+{activeContract.rewardGold}g · +{scaleShardsByPact(activeContract.rewardShards, pactMods.shardMult)})
                    </span>
                  </span>

                  {liveHud.zone === 'dungeon' && (
                    <>
                      <div className="h-5 w-px bg-[#F4B942]/25" />
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col min-w-[54px]">
                          <span className="text-[9px] font-bold uppercase text-[#38E8D8]">
                            {t(lang, 'hud_special')}
                          </span>
                          <div className="h-1.5 w-full rounded-sm bg-[#090F22] border border-[#38E8D8]/45 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#23B7AB] to-[#38E8D8]"
                              style={{ width: `${Math.round(liveHud.specialReadyRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                        {liveHud.floorAnomaly !== 'none' && (
                          <span
                            data-testid="hud-anomaly-badge"
                            className="chamfer-badge px-1.5 py-0.5 bg-[#5B21B6]/70 text-[#E9D5FF] text-[10px] font-bold border border-[#C084FC]/60"
                          >
                            {t(
                              lang,
                              liveHud.floorAnomaly === 'blood_moon'
                                ? 'anomaly_blood_moon'
                                : liveHud.floorAnomaly === 'mirror_echo'
                                  ? 'anomaly_mirror_echo'
                                  : 'anomaly_low_gravity',
                            )}
                          </span>
                        )}
                        {liveHud.maxJumpCharges > 1 && (
                          <span className="chamfer-badge inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1A2547] text-[#38E8D8] text-[10px] font-bold border border-[#38E8D8]/45">
                            <JumpWingIcon className="w-3 h-3" />
                            <span>{liveHud.jumpCharges}/{liveHud.maxJumpCharges}</span>
                          </span>
                        )}
                        {liveHud.chainLightningReady && (
                          <span className="chamfer-badge inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#38E8D8]/20 text-[#38E8D8] text-[10px] font-bold border border-[#38E8D8]">
                            <BoltSparkIcon className="w-3 h-3" />
                            <span>Chain</span>
                          </span>
                        )}
                        {liveHud.riposteReady && (
                          <span
                            data-testid="hud-riposte-badge"
                            className="chamfer-badge inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#3B1806]/90 text-[#F4B942] text-[10px] font-bold border border-[#F4B942]"
                          >
                            <BoltSparkIcon className="w-3 h-3" />
                            <span>{t(lang, 'hud_riposte')}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => inputRef.current?.triggerVirtualAction('heal')}
                          className="cursor-pointer px-2 py-1 rounded-lg bg-gradient-to-b from-[#FF5470] to-[#BD1F36] text-white text-[10px] font-bold border border-[#FFA6B5]/65 shadow-[0_0_10px_rgba(255,59,92,0.4)]"
                        >
                          {t(lang, 'hud_potion')} ×{liveHud.potions}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Top-Right Compact Controls Strip + Dungeon Minimap & Boons */}
                <div className="flex flex-col items-end gap-2 ml-auto">
                  <div
                    data-ui-interactive="true"
                    className="pointer-events-auto flex items-center gap-1 sm:gap-1.5"
                  >
                    <button
                      type="button"
                      data-testid="btn-pack"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        callbacksRef.current.onBagToggle();
                      }}
                      className="glass-btn cursor-pointer px-2 sm:px-2.5 h-8 sm:h-10 font-bold text-[11px] sm:text-xs inline-flex items-center gap-1.5"
                    >
                      <SatchelPackIcon className="w-3.5 h-3.5 text-[#F4B942]" />
                      <span className="hidden sm:inline">{t(lang, 'hud_bag')}</span>
                      <span>({bagItemCount})</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-codex-hud"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        setShowCodexModal(true);
                      }}
                      title={t(lang, 'codex_btn')}
                      className="glass-btn cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-[#F4B942]"
                    >
                      <CodexTomeIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTouchOverride(!touchEnabled)}
                      title="Touch Controls"
                      className={`cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold ${
                        touchEnabled ? 'glass-teal-btn' : 'glass-btn text-[#38E8D8]'
                      }`}
                    >
                      <GamepadTouchIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      data-testid="btn-hide-hud"
                      onClick={() => setHudHidden(true)}
                      title={t(lang, 'hud_hide')}
                      className="glass-btn cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-[#38E8D8]"
                    >
                      <CameraEyeIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      data-testid="btn-language-hud"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        setShowLangModal(true);
                      }}
                      title={t(lang, 'language_label')}
                      className="glass-btn cursor-pointer px-2 sm:px-2.5 h-8 sm:h-10 font-bold text-[11px] sm:text-xs inline-flex items-center gap-1"
                    >
                      <GlobeRuneIcon className="w-3.5 h-3.5 text-[#38E8D8]" />
                      <span>{lang.toUpperCase()}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-settings-hud"
                      onClick={() => {
                        audioRef.current?.unlock();
                        audioRef.current?.playUiClick();
                        setShowSettingsModal(true);
                      }}
                      title={t(lang, 'settings_btn')}
                      className="glass-btn cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-[#38E8D8]"
                    >
                      <SettingsCogIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      data-testid="btn-fullscreen-hud"
                      onClick={toggleFullscreen}
                      title={t(lang, isFullscreen ? 'fullscreen_exit' : 'fullscreen_enter')}
                      className="glass-btn cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-[#38E8D8]"
                    >
                      <FullscreenGlyphIcon exit={isFullscreen} className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleMuteToggle}
                      title="Mute [M]"
                      className="glass-btn cursor-pointer w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-[#F4B942]"
                    >
                      {liveHud.muted ? (
                        <SpeakerOffIcon className="w-4 h-4" />
                      ) : (
                        <SpeakerOnIcon className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      data-testid="btn-pause"
                      onClick={handlePauseToggle}
                      title={t(lang, 'hud_pause')}
                      className="glass-gold-btn cursor-pointer px-2 sm:px-3 h-8 sm:h-10 font-bold text-[11px] sm:text-xs inline-flex items-center gap-1"
                    >
                      <PauseGlyphIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t(lang, 'hud_pause')}</span>
                    </button>
                  </div>

                  {liveHud.zone === 'dungeon' && (
                    <div className="flex flex-col items-end gap-1.5">
                      <MinimapHud lang={lang} rooms={liveHud.minimap} floor={liveHud.floor} />
                      {(liveHud.activeBoons.length > 0 || activeSynergies.length > 0) && (
                        <div
                          data-testid="hud-active-boons"
                          className="glass-panel pointer-events-none flex flex-wrap justify-end gap-1 px-2 py-1 rounded-lg max-w-[230px]"
                          aria-label={t(lang, 'boons_active_label')}
                        >
                          {activeSynergies.map((syn) => (
                            <span
                              key={syn.id}
                              data-testid={`hud-synergy-${syn.id}`}
                              title={t(lang, syn.descKey as TranslationKey)}
                              className="px-1.5 py-0.5 rounded bg-[#231942] border border-[#F4B942]/75 text-[10px] font-bold flex items-center gap-1 text-[#F4B942]"
                            >
                              <span>{syn.icon}</span>
                              <span className="hidden sm:inline truncate max-w-[90px]">
                                {t(lang, syn.nameKey as TranslationKey)}
                              </span>
                            </span>
                          ))}
                          {liveHud.activeBoons.map((bId) => {
                            const b = getBoonDef(bId);
                            return (
                              <span
                                key={bId}
                                title={t(lang, b.nameKey as TranslationKey)}
                                className="px-1.5 py-0.5 rounded bg-[#0A1024] border text-[10px] font-bold flex items-center gap-1"
                                style={{ borderColor: b.accent, color: b.accent }}
                              >
                                <span>{b.icon}</span>
                                <span className="hidden sm:inline truncate max-w-[82px]">
                                  {t(lang, b.nameKey as TranslationKey)}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Top-Anchored Notification Strip & Boss Health Bar */}
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                {liveHud.zone === 'dungeon' && liveHud.activeBoss && (
                  <div
                    data-testid="boss-health-bar"
                    className="glass-panel w-full max-w-md px-3.5 py-2 rounded-xl border border-[#FF3B5C]/60"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-[#FF4D6D] font-ledger text-sm truncate">
                          <SkullBossIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{t(lang, liveHud.activeBoss.nameKey as TranslationKey)}</span>
                        </span>
                        <span className="hidden sm:inline text-[10px] text-[#9EB4DA] truncate">
                          · {t(lang, liveHud.activeBoss.titleKey as TranslationKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {liveHud.activeBoss.phase === 2 && (
                          <span className="px-1.5 py-0.5 rounded bg-[#BD1F36] text-white text-[9px] font-bold tracking-wider">
                            {t(lang, 'boss_phase_2')}
                          </span>
                        )}
                        <span className="tabular-nums text-[11px] text-[#FFF4DC]">
                          {liveHud.activeBoss.hp}/{liveHud.activeBoss.maxHp}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded bg-[#090F22] border border-[#FF3B5C]/45 overflow-hidden">
                      <div
                        className="h-full transition-[width] duration-100"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, (liveHud.activeBoss.hp / liveHud.activeBoss.maxHp) * 100),
                          )}%`,
                          background:
                            liveHud.activeBoss.phase === 2
                              ? 'linear-gradient(90deg, #FF3B5C, #F4B942)'
                              : 'linear-gradient(90deg, #BD1F36, #FF5E3A)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {liveHud.zone === 'dungeon' &&
                  liveHud.targetEnemy &&
                  (!liveHud.activeBoss || !liveHud.targetEnemy.isBoss) && (
                    <div
                      data-testid="target-enemy-frame"
                      data-target-id={liveHud.targetEnemy.id}
                      data-tab-locked={liveHud.targetEnemy.tabLocked ? 'true' : 'false'}
                      className={`glass-panel w-60 sm:w-72 px-2.5 py-1.5 rounded-xl border ${
                        liveHud.targetEnemy.tabLocked ? 'border-[#F4B942]/80' : 'border-[#FF5E3A]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1 py-px rounded text-[9px] font-bold shrink-0 border ${
                              liveHud.targetEnemy.tabLocked
                                ? 'bg-[#3B1806] border-[#F4B942] text-[#F4B942]'
                                : 'bg-[#090F22]/80 border-[#9EB4DA]/35 text-[#9EB4DA]'
                            }`}
                          >
                            TAB
                          </span>
                          <span className="text-[#FFF4DC] truncate">
                            {liveHud.targetEnemy.bossNameKey
                              ? t(lang, liveHud.targetEnemy.bossNameKey as TranslationKey)
                              : t(lang, `enemy_${liveHud.targetEnemy.kind}` as TranslationKey)}
                          </span>
                          {liveHud.targetEnemy.isElite && liveHud.targetEnemy.eliteAffix && (
                            <span className="px-1 py-px rounded bg-[#3B1806] border border-[#F4B942]/70 text-[9px] text-[#F4B942] uppercase shrink-0">
                              {t(lang, `affix_${liveHud.targetEnemy.eliteAffix}` as TranslationKey)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-[10px]">
                          <span className="text-[#9EB4DA]">
                            {liveHud.targetEnemy.distanceMeters.toFixed(1)}m
                          </span>
                          <span className="text-[#FFF4DC]">
                            {liveHud.targetEnemy.hp}/{liveHud.targetEnemy.maxHp}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded bg-[#090F22] border border-[#FF3B5C]/45 overflow-hidden">
                        <div
                          className="h-full transition-[width] duration-75"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                (liveHud.targetEnemy.hp / liveHud.targetEnemy.maxHp) * 100,
                              ),
                            )}%`,
                            background: liveHud.targetEnemy.isElite
                              ? 'linear-gradient(90deg, #B45309, #F4B942)'
                              : 'linear-gradient(90deg, #9F1239, #FF5E3A)',
                          }}
                        />
                      </div>
                      {(liveHud.targetEnemy.burning ||
                        liveHud.targetEnemy.chilled ||
                        liveHud.targetEnemy.poisoned ||
                        liveHud.targetEnemy.stunned) && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold">
                          {liveHud.targetEnemy.burning && (
                            <span className="chamfer-badge inline-flex items-center gap-0.5 px-1.5 py-px bg-[#431407] border border-[#FF5E3A]/60 text-[#FF8C5A]">
                              <FlameEmberIcon className="w-2.5 h-2.5" />
                              <span>{t(lang, 'status_burn')}</span>
                            </span>
                          )}
                          {liveHud.targetEnemy.chilled && (
                            <span className="chamfer-badge inline-flex items-center gap-0.5 px-1.5 py-px bg-[#083344] border border-[#38E8D8]/60 text-[#38E8D8]">
                              <SnowflakeGlyphIcon className="w-2.5 h-2.5" />
                              <span>{t(lang, 'status_chill')}</span>
                            </span>
                          )}
                          {liveHud.targetEnemy.poisoned && (
                            <span className="chamfer-badge inline-flex items-center gap-0.5 px-1.5 py-px bg-[#2E1065] border border-[#A855F7]/60 text-[#C084FC]">
                              <SkullBossIcon className="w-2.5 h-2.5" />
                              <span>{t(lang, 'status_poison')}</span>
                            </span>
                          )}
                          {liveHud.targetEnemy.stunned && (
                            <span className="chamfer-badge inline-flex items-center gap-0.5 px-1.5 py-px bg-[#422006] border border-[#F4B942]/60 text-[#F4B942]">
                              <BoltSparkIcon className="w-2.5 h-2.5" />
                              <span>{t(lang, 'status_stun')}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {trophyToast && (
                  <div
                    data-testid="trophy-toast"
                    className="glass-gold-btn px-4 py-1.5 font-bold text-xs sm:text-sm flex items-center gap-2"
                  >
                    <TrophyCrestIcon className="w-4 h-4 text-[#081022]" />
                    <span>{t(lang, 'trophy_unlocked')}:</span>
                    <span>{trophyToast.icon} {trophyToast.title}</span>
                  </div>
                )}
                {liveHud.appraisalFlash > 0 && (
                  <div className="glass-gold-btn px-4 py-1.5 font-bold text-sm inline-flex items-center gap-1.5">
                    <SparkleGlyphIcon className="w-3.5 h-3.5 text-[#081022]" />
                    <span>{t(lang, 'appraisal_hit')}</span>
                  </div>
                )}
                {liveHud.zone === 'dungeon' && liveHud.marauderSpawned && (
                  <div className="chamfer-badge inline-flex items-center gap-1.5 px-4 py-1 bg-[#BD1F36]/95 text-white font-bold text-xs tracking-wider border border-[#FF6B81]">
                    <WarningTriangleIcon className="w-3.5 h-3.5" />
                    <span>{t(lang, 'marauder_warning')}</span>
                  </div>
                )}
                {liveHud.zone === 'dungeon' && !liveHud.marauderSpawned && !liveHud.roomCleared && (
                  <div className="glass-panel px-3 py-1 text-[#FFF4DC] text-[11px] font-bold">
                    Shadow Marauder in {liveHud.marauderTimer}s
                  </div>
                )}
                {liveHud.zone === 'dungeon' && liveHud.roomCleared && !liveHud.exitPortalOpen && (
                  <div
                    data-testid="room-cleared-badge"
                    className="glass-panel inline-flex items-center gap-1.5 px-3 py-1 text-[#38E8D8] text-[11px] font-bold border border-[#38E8D8]/50"
                  >
                    <CheckRuneIcon className="w-3.5 h-3.5" />
                    <span>{t(lang, 'room_cleared')}</span>
                  </div>
                )}
                {settings.showDay1Guide &&
                  !guideDismissed &&
                  week === 1 &&
                  day === 1 &&
                  liveHud.zone === 'courtyard' &&
                  shellMode === 'playing' && (
                    <div
                      data-ui-interactive="true"
                      data-testid="guide-day1-chip"
                      className="pointer-events-auto glass-panel px-3 py-1 text-[11px] font-bold text-[#F4B942] flex items-center gap-2"
                    >
                      <SupplyCompassIcon className="w-3.5 h-3.5 text-[#38E8D8]" />
                      <span>{t(lang, 'guide_day1')}</span>
                      <button
                        type="button"
                        onClick={() => setGuideDismissed(true)}
                        className="cursor-pointer text-[#9EB4DA] hover:text-[#FFF4DC]"
                        aria-label={t(lang, 'close')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                {showPortraitTip && (
                  <div className="glass-panel px-3 py-1 text-[10px] font-bold text-[#9EB4DA]">
                    {t(lang, 'rotate_hint')}
                  </div>
                )}
                {noticeBanner && (
                  <div className="glass-panel px-3.5 py-1 rounded-lg text-[#38E8D8] font-bold text-xs">
                    {noticeBanner}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Prompt + Warcraft/Witcher ActionBar HUD */}
            <div className="flex flex-col items-center gap-2">
              {interactLabel && shellMode === 'playing' && (
                <button
                  type="button"
                  data-ui-interactive="true"
                  data-testid="btn-interact-prompt"
                  onClick={() => inputRef.current?.triggerVirtualAction('interact')}
                  className="glass-teal-btn pointer-events-auto cursor-pointer px-5 py-2 rounded-xl font-bold text-sm"
                >
                  {interactLabel}
                </button>
              )}

              {shellMode === 'playing' && (
                <div className={touchEnabled ? 'mb-[132px]' : ''}>
                  <ActionBarHud
                    lang={lang}
                    hud={liveHud}
                    keybinds={settings.keybinds}
                    onTriggerAction={(action) => {
                      audioRef.current?.unlock();
                      inputRef.current?.triggerVirtualAction(action);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOUCH CONTROLS (Tablets / Smartphones / Toggled) */}
        <TouchControls
          lang={lang}
          visible={touchEnabled && shellMode === 'playing'}
          inDungeon={liveHud.zone === 'dungeon'}
          hasInteract={Boolean(liveHud.nearbyInteract)}
          onMoveVector={(x, z) => inputRef.current?.setVirtualMove(x, z)}
          onAction={(action: VirtualAction) => {
            audioRef.current?.unlock();
            inputRef.current?.triggerVirtualAction(action);
          }}
          onOpenBag={() => callbacksRef.current.onBagToggle()}
        />

        {/* BACKPACK MODAL */}
        {activeModal === 'bag' && (
          <BackpackModal
            lang={lang}
            bag={bag}
            inDungeon={liveHud.zone === 'dungeon'}
            evacuateCost={evacuateCost}
            gold={gold}
            tiltEnabled={gfxProfile.cardTilt3d}
            onSwap={(a, b) => {
              audioRef.current?.playUiClick();
              setBag((prev) => {
                const copy = [...prev];
                swapBagSlots(copy, a, b);
                return copy;
              });
            }}
            onEvacuate={() => {
              if (gold < evacuateCost) return;
              audioRef.current?.playCoin();
              const extracted = resolveBagExtraction(bag, true);
              unlockRelicsInCodex(extracted.savedItems);
              const redeemedItem = livePawn ? [livePawn.item] : [];
              setGold((g) => g - evacuateCost);
              setStash((prev) => [...prev, ...extracted.savedItems, ...redeemedItem]);
              setBag(createEmptyBag());
              setLivePawn(null);
              setSecretKeyGranted(false);
              setActiveRunSupplies([]);
              setActiveModal('none');
              setShellMode('playing');
              sceneRef.current?.returnToCourtyard(week, true);
              sceneRef.current?.setShellMode('playing');
              const fuseMsg =
                extracted.fusedNames.length > 0 ? ` · Fused: ${extracted.fusedNames.join(', ')}` : '';
              flashNotice(`Amulet Return! Stashed ${extracted.savedItems.length} relics${fuseMsg}.`);
            }}
            onClose={() => {
              audioRef.current?.playUiClick();
              setActiveModal('none');
              setShellMode('playing');
              sceneRef.current?.setShellMode('playing');
            }}
          />
        )}

        {/* SHOP COUNTER MODAL */}
        {activeModal === 'shop' && shopSession && (
          <ShopOverlay
            lang={lang}
            session={shopSession}
            stash={stash}
            gold={gold}
            debtPaid={debtPaid}
            debtTarget={debtTarget}
            bountyEra={bountyEra}
            livePawn={livePawn}
            liveAuction={liveAuction}
            feedbackMessage={shopFeedback}
            tiltEnabled={gfxProfile.cardTilt3d}
            onPlaceFromStash={(stashIdx, pedIdx) => {
              const chosen = stash[stashIdx];
              if (!chosen) return;
              audioRef.current?.playUiClick();
              setStash((prev) => prev.filter((_, i) => i !== stashIdx));
              setShopSession((prev) => {
                if (!prev) return prev;
                const pedestals = [...prev.pedestals];
                pedestals[pedIdx] = chosen;
                const next = { ...prev, pedestals };
                if (!next.activeCustomer) {
                  spawnNextCustomer(
                    next,
                    activeDiff.patienceBonus + activeArchetype.patienceBonus + dayEventMods.shopPatienceBonus,
                    Math.random,
                  );
                }
                return next;
              });
            }}
            onStockAllEmpty={() => {
              if (!shopSession || stash.length === 0) return;
              const emptyIndices = shopSession.pedestals
                .map((p, idx) => (p === null ? idx : -1))
                .filter((idx) => idx >= 0);
              if (emptyIndices.length === 0) return;
              const count = Math.min(emptyIndices.length, stash.length);
              audioRef.current?.playUiClick();
              const itemsToPlace = stash.slice(0, count);
              setStash((prev) => prev.slice(count));
              setShopSession((prev) => {
                if (!prev) return prev;
                const pedestals = [...prev.pedestals];
                for (let i = 0; i < count; i++) {
                  pedestals[emptyIndices[i]] = itemsToPlace[i];
                }
                const next = { ...prev, pedestals };
                if (!next.activeCustomer) {
                  spawnNextCustomer(
                    next,
                    activeDiff.patienceBonus + activeArchetype.patienceBonus + dayEventMods.shopPatienceBonus,
                    Math.random,
                  );
                }
                return next;
              });
            }}
            onServeNextCustomer={() => {
              audioRef.current?.playUiClick();
              setShopSession((prev) => {
                if (!prev) return prev;
                const next = { ...prev, pedestals: [...prev.pedestals] };
                spawnNextCustomer(
                  next,
                  activeDiff.patienceBonus + activeArchetype.patienceBonus + dayEventMods.shopPatienceBonus,
                  Math.random,
                );
                return next;
              });
              setShopFeedback(null);
            }}
            onSubmitOffer={(price) => {
              if (!shopSession) return;
              const prevFair = shopSession.activeCustomer?.fairPrice ?? price;
              const next: ShopSessionState = {
                ...shopSession,
                pedestals: [...shopSession.pedestals],
                activeCustomer: shopSession.activeCustomer
                  ? { ...shopSession.activeCustomer }
                  : null,
              };
              const res = submitHaggleOffer(next, price);
              if (res.outcome === 'sold') {
                if (res.comboBonus > 0 || price >= prevFair * 1.35) {
                  audioRef.current?.playCashBell();
                } else {
                  audioRef.current?.playCoin();
                }
                setGold((g) => g + res.goldEarned);
                setLastDealStreak(next.dealStreak);
                applyContractProgress('shop_sales', 1);
                setRecords((prev) => {
                  const trophyList = ['first_sale'];
                  if (next.dealStreak >= 3) trophyList.push('streak_3');
                  const { updated, newlyUnlocked } = grantAchievements(
                    {
                      ...prev,
                      bestStreak: Math.max(prev.bestStreak, next.dealStreak),
                      totalSales: prev.totalSales + 1,
                    },
                    trophyList,
                  );
                  if (newlyUnlocked.length > 0) setTrophyToast(newlyUnlocked[0]);
                  saveCampaignRecords(updated);
                  return updated;
                });
                setShopFeedback(
                  `Sold! +${res.goldEarned}g${res.comboBonus > 0 ? ` (+${res.comboBonus}g streak)` : ''}`,
                );
                spawnNextCustomer(
                  next,
                  activeDiff.patienceBonus + activeArchetype.patienceBonus + dayEventMods.shopPatienceBonus,
                  Math.random,
                );
              } else if (res.outcome === 'counter') {
                audioRef.current?.playUiClick();
                setShopFeedback('Too steep! Lower your offer before patience runs out.');
              } else {
                audioRef.current?.playDanger();
                setLastDealStreak(0);
                setShopFeedback('Customer walked away!');
                spawnNextCustomer(
                  next,
                  activeDiff.patienceBonus + activeArchetype.patienceBonus + dayEventMods.shopPatienceBonus,
                  Math.random,
                );
              }
              setShopSession(next);
            }}
            onAcceptPawn={() => {
              if (!shopSession || !shopSession.pawn.active || shopSession.pawn.redeemed) return;
              audioRef.current?.playCoin();
              setGold((g) => g + shopSession.pawn.advanceGold);
              setShopSession((prev) =>
                prev
                  ? {
                      ...prev,
                      pawn: { ...prev.pawn, redeemed: true },
                    }
                  : prev,
              );
              setShopFeedback(`Pawned heirloom for +${shopSession.pawn.advanceGold}g!`);
            }}
            onRedeemPawn={() => {
              if (!shopSession || gold < shopSession.pawn.redeemCost) return;
              audioRef.current?.playCoin();
              setGold((g) => g - shopSession.pawn.redeemCost);
              const bonusRelic = createRelicInstance(
                CONTENT.relics.find((r) => r.era === shopSession.pawn.era) ?? CONTENT.relics[2],
                `pawn_${Date.now()}`,
                true,
              );
              unlockRelicsInCodex([bonusRelic]);
              setStash((prev) => [...prev, bonusRelic]);
              setShopSession((prev) =>
                prev
                  ? {
                      ...prev,
                      pawn: { ...prev.pawn, active: false, redeemed: false },
                    }
                  : prev,
              );
              setShopFeedback(`Redeemed Pristine ${bonusRelic.name}!`);
            }}
            onPledgeStashPawn={(stashIdx) => {
              const target = stash[stashIdx];
              if (!target || livePawn) return;
              audioRef.current?.playAppraisal();
              setStash((prev) => prev.filter((_, i) => i !== stashIdx));
              setLivePawn({ item: target, buffActive: true });
              setShopFeedback(`Pledged ${target.name}: +25% Dmg & +1 Potion next run!`);
            }}
            onBidAuction={() => {
              if (!shopSession || shopSession.auctionTrendWon || gold < 90) return;
              audioRef.current?.playCoin();
              setGold((g) => g - 90);
              setShopSession((prev) =>
                prev ? { ...prev, auctionTrendWon: true } : prev,
              );
              setShopFeedback(`Scarcity Auction Won! +50% on ${shopSession.trendingEra} relics.`);
            }}
            onFulfillVip={() => {
              if (!shopSession) return;
              const nextVip = { ...shopSession.vipOrder };
              const res = fulfillVipOrder(stash, nextVip);
              if (!res.soldItem) return;
              audioRef.current?.playCashBell();
              setStash(res.remainingStash);
              setGold((g) => g + res.goldEarned);
              setShopSession((prev) => (prev ? { ...prev, vipOrder: nextVip } : prev));
              setShopFeedback(`${t(lang, 'vip_order_done')} +${res.goldEarned}g`);
              awardTrophies(['vip_broker']);
            }}
            onStartLiveAuction={() => {
              if (liveAuction) return;
              const idx = stash.findIndex((it) => it.rarity >= 2 || Boolean(it.fused));
              if (idx === -1) return;
              const item = stash[idx];
              audioRef.current?.playUiClick();
              setStash((prev) => prev.filter((_, i) => i !== idx));
              setLiveAuction(createLiveAuction(item));
            }}
            onRaiseAuctionHype={() => {
              if (!liveAuction) return;
              const nextAuc = raiseLiveAuctionHype(liveAuction, Math.random);
              if (nextAuc.walked) {
                audioRef.current?.playDanger();
                setStash((prev) => [nextAuc.item, ...prev]);
                setLiveAuction(null);
                setShopFeedback(t(lang, 'auction_walked'));
              } else {
                audioRef.current?.playAppraisal();
                setLiveAuction(nextAuc);
              }
            }}
            onHammerAuction={() => {
              if (!liveAuction || liveAuction.walked) return;
              audioRef.current?.playCashBell();
              const earned = liveAuction.currentBid;
              setGold((g) => g + earned);
              setLiveAuction(null);
              setShopFeedback(t(lang, 'auction_sold', { g: earned }));
              awardTrophies(['auction_champ']);
            }}
            onUseNightGuest={() => {
              if (!shopSession || shopSession.nightGuestUsed) return;
              audioRef.current?.playAppraisal();
              const rareRelic = createRelicInstance(
                CONTENT.relics[CONTENT.relics.length - 1],
                `night_guest_${Date.now()}`,
                true,
              );
              unlockRelicsInCodex([rareRelic]);
              setStash((prev) => [...prev, rareRelic]);
              setShopSession((prev) =>
                prev ? { ...prev, nightGuestUsed: true } : prev,
              );
              setShopFeedback(`Night Gate Guest gifted Pristine ${rareRelic.name}!`);
            }}
            onSellCursedNightGuest={() => {
              if (!shopSession || shopSession.nightGuestUsed) return;
              const buyout = resolveNightGuestCursedBuyout(stash);
              if (!buyout.soldItem) return;
              audioRef.current?.playCashBell();
              setStash(buyout.remainingStash);
              setGold((g) => g + buyout.goldEarned);
              setShopSession((prev) => (prev ? { ...prev, nightGuestUsed: true } : prev));
              setShopFeedback(`Night Guest bought ${buyout.soldItem.name} for +${buyout.goldEarned}g!`);
            }}
            onClaimSecretKey={() => {
              if (!shopSession || shopSession.nightGuestUsed) return;
              audioRef.current?.playAppraisal();
              setSecretKeyGranted(true);
              setShopSession((prev) =>
                prev ? { ...prev, nightGuestUsed: true, nightGuestKeyGranted: true } : prev,
              );
              setShopFeedback('Secret Vault Key forged! Look for the violet chest inside.');
            }}
            onPayDebt={handlePayDebt}
            onCloseShop={handleCloseShop}
          />
        )}

        {/* ANCIENT DUNGEON SHRINE 3-CHOICE MODAL */}
        {activeModal === 'shrine' && (
          <ShrineModal
            lang={lang}
            playerHp={liveHud.hp}
            playerMaxHp={liveHud.maxHp}
            onChoose={(choice) => {
              const res = sceneRef.current?.resolveShrineChoice(choice);
              if (res && (res.gilded || res.goldGained > 0 || res.healed)) {
                setRecords((prev) => {
                  const nextOfferings = prev.shrineOfferings + 1;
                  let next: CampaignRecords = { ...prev, shrineOfferings: nextOfferings };
                  if (nextOfferings >= 3) {
                    const achRes = grantAchievements(next, ['shrine_devotee']);
                    next = achRes.updated;
                    if (achRes.newlyUnlocked.length > 0) setTrophyToast(achRes.newlyUnlocked[0]);
                  }
                  saveCampaignRecords(next);
                  return next;
                });
                if (res.goldGained > 0) {
                  flashNotice(`🩸 +${res.goldGained}g · +20% DMG · +12% CRIT!`);
                } else if (res.healed) {
                  flashNotice('💠 +2 HP · +1 Potion!');
                }
              }
              setActiveModal('none');
              setShellMode('playing');
              sceneRef.current?.setShellMode('playing');
            }}
            onClose={() => {
              audioRef.current?.playUiClick();
              setActiveModal('none');
              setShellMode('playing');
              sceneRef.current?.setShellMode('playing');
            }}
          />
        )}

        {/* TOWN ARTISAN MODAL (FORGE / ALCHEMY & DEBT) */}
        {(activeModal === 'forge' || activeModal === 'alchemy') && (
          <TownArtisanModal
            lang={lang}
            mode={activeModal}
            gold={gold}
            weapons={CONTENT.weapons}
            unlockedWeapons={unlockedWeapons}
            equippedWeaponId={equippedWeaponId}
            weaponTiers={weaponTiers}
            upgrades={CONTENT.upgrades}
            upgradeLevels={upgradeLevels}
            stash={stash}
            debtPaid={debtPaid}
            debtTarget={debtTarget}
            week={week}
            discountMult={activeModal === 'forge' ? dayEventMods.forgeDiscountMult : 1}
            ownedSupplies={ownedSupplies}
            onBuySupply={(supId) => {
              const def = EXPEDITION_SUPPLIES.find((s) => s.id === supId);
              if (!def || ownedSupplies.includes(supId) || gold < def.cost) return;
              audioRef.current?.playCoin();
              setGold((g) => g - def.cost);
              setOwnedSupplies((prev) => [...prev, supId]);
              sceneRef.current?.triggerStationFx('alchemy');
              flashNotice(`${def.icon} ${t(lang, def.nameKey as TranslationKey)}!`);
            }}
            onUnlockOrEquipWeapon={(wId) => {
              const def = CONTENT.weapons.find((w) => w.id === wId);
              if (!def) return;
              const disc = activeModal === 'forge' ? dayEventMods.forgeDiscountMult : 1;
              const cost = Math.round(def.unlockCost * disc);
              if (unlockedWeapons.includes(wId)) {
                audioRef.current?.playUiClick();
                setEquippedWeaponId(wId);
              } else if (gold >= cost) {
                audioRef.current?.playCoin();
                setGold((g) => g - cost);
                const nextUnlocked = [...unlockedWeapons, wId];
                setUnlockedWeapons(nextUnlocked);
                setEquippedWeaponId(wId);
                sceneRef.current?.triggerStationFx('forge');
                if (nextUnlocked.length >= CONTENT.weapons.length) {
                  awardTrophies(['all_weapons']);
                }
              }
            }}
            onTemperWeapon={(wId) => {
              const curTier = weaponTiers[wId] ?? 1;
              if (curTier >= 3) return;
              const disc = activeModal === 'forge' ? dayEventMods.forgeDiscountMult : 1;
              const cost = Math.round((curTier === 1 ? 140 : 280) * disc);
              if (gold < cost) return;
              const nextTier = curTier + 1;
              audioRef.current?.playAppraisal();
              setGold((g) => g - cost);
              setWeaponTiers((prev) => ({ ...prev, [wId]: nextTier }));
              sceneRef.current?.triggerStationFx('forge');
              if (nextTier >= 3) {
                awardTrophies(['weapon_master']);
              }
            }}
            onPurifyRelic={(stashIdx) => {
              const target = stash[stashIdx];
              if (!target || gold < 95) return;
              if (target.curse !== 'pyre' && target.curse !== 'lock') return;
              audioRef.current?.playAppraisal();
              setGold((g) => g - 95);
              setStash((prev) =>
                prev.map((item, idx) =>
                  idx === stashIdx ? { ...item, curse: 'none', pristine: true } : item,
                ),
              );
              sceneRef.current?.triggerStationFx('alchemy');
              flashNotice(`✦ ${target.name} purified & gilded 2×!`);
            }}
            onTransmuteRelics={(idxA, idxB) => {
              if (gold < TRANSMUTE_COST) return;
              const res = transmuteRelics(stash, idxA, idxB, CONTENT.relics, Math.random);
              if (!res) return;
              audioRef.current?.playAppraisal();
              setGold((g) => g - TRANSMUTE_COST);
              setStash(res.nextStash);
              unlockRelicsInCodex([res.result]);
              sceneRef.current?.triggerStationFx('alchemy');
              flashNotice(
                `⚗ ${res.result.name} ★${res.result.rarity}${res.result.pristine ? ' (2×)' : ''}!`,
              );
            }}
            onBuyUpgrade={(uId) => {
              const def = CONTENT.upgrades.find((u) => u.id === uId);
              if (!def) return;
              const lvl = upgradeLevels[uId] ?? 0;
              if (lvl >= def.maxLevel) return;
              const disc = activeModal === 'forge' ? dayEventMods.forgeDiscountMult : 1;
              const cost = Math.round(def.costs[lvl] * disc);
              if (gold < cost) return;
              audioRef.current?.playCoin();
              setGold((g) => g - cost);
              setUpgradeLevels((prev) => ({ ...prev, [uId]: lvl + 1 }));
              sceneRef.current?.triggerStationFx(activeModal === 'alchemy' ? 'alchemy' : 'forge');
            }}
            onPayDebt={handlePayDebt}
            onClose={() => {
              audioRef.current?.playUiClick();
              setActiveModal('none');
              setShellMode('playing');
              sceneRef.current?.setShellMode('playing');
            }}
          />
        )}

        {/* PAUSE / MAIN MENU DIALOG */}
        {shellMode === 'paused' && activeModal === 'none' && !showLangModal && (
          <div
            data-ui-interactive="true"
            role="dialog"
            aria-modal="true"
            aria-label={t(lang, 'pause_title')}
            className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/82 p-4"
          >
            <div className="glass-panel w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-xl p-5 flex flex-col gap-3">
              <div className="border-b border-[#F4B942]/30 pb-2">
                <h2 className="font-ledger text-3xl font-bold text-[#FFF4DC]">
                  {t(lang, 'pause_title')}
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-[#38E8D8]">
                  {currentLocLabel}
                </p>
              </div>
              <div
                data-testid="build-summary-pause"
                className="glass-subcard rounded-lg p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="uppercase tracking-wider text-[#38E8D8]">
                    {t(lang, 'build_summary_title')}
                  </span>
                  <span className="text-[#F4B942]">
                    {t(lang, equippedWeapon.nameKey as TranslationKey)} T{weaponTiers[equippedWeaponId] ?? 1}
                    {pactMods.heatLevel > 0 ? ` · 🔥${pactMods.heatLevel}/5` : ''}
                  </span>
                </div>
                {(activeSynergies.length > 0 || liveHud.activeBoons.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {activeSynergies.map((syn) => (
                      <span
                        key={syn.id}
                        className="px-1.5 py-0.5 rounded bg-[#231942] border border-[#F4B942]/65 text-[10px] font-bold text-[#F4B942]"
                      >
                        {syn.icon} {t(lang, syn.nameKey as TranslationKey)}
                      </span>
                    ))}
                    {liveHud.activeBoons.map((bId) => {
                      const b = getBoonDef(bId);
                      return (
                        <span
                          key={bId}
                          className="px-1.5 py-0.5 rounded bg-[#0A1024] border text-[10px] font-bold"
                          style={{ borderColor: b.accent, color: b.accent }}
                        >
                          {b.icon} {t(lang, b.nameKey as TranslationKey)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="glass-subcard rounded-lg p-2.5 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F4B942]">
                  ✨ {t(lang, 'settings_gfx')}
                </span>
                <GraphicsQualitySwitch
                  lang={lang}
                  value={settings.graphicsQuality}
                  testIdPrefix="pause-gfx"
                  compact
                  onChange={(nextQuality) => {
                    audioRef.current?.unlock();
                    audioRef.current?.playUiClick();
                    setSettings((prev) => ({ ...prev, graphicsQuality: nextQuality }));
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handlePauseToggle}
                className="glass-gold-btn cursor-pointer w-full py-2.5 px-4 rounded-lg font-bold"
              >
                {t(lang, 'resume')}
              </button>
              <button
                type="button"
                data-testid="btn-charter-pause"
                onClick={() => setShowCharterModal(true)}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-bold flex items-center justify-between"
              >
                <span>📜 {t(lang, 'charter_btn')}</span>
                <span className="text-xs text-[#F4B942] tabular-nums">◆ {records.gateShards}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCodexModal(true)}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-bold"
              >
                📖 {t(lang, 'codex_btn')}
              </button>
              <button
                type="button"
                data-testid="btn-settings-pause"
                onClick={() => setShowSettingsModal(true)}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-bold"
              >
                ⚙ {t(lang, 'settings_btn')}
              </button>
              <button
                type="button"
                onClick={() => setShowLangModal(true)}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-bold"
              >
                🌐 {t(lang, 'language_label')} ({currentLangMeta.nativeName})
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-bold"
              >
                {isFullscreen ? '⤢ ' : '⛶ '}
                {t(lang, isFullscreen ? 'fullscreen_exit' : 'fullscreen_enter')}
              </button>
              <button
                type="button"
                onClick={handleRestartCampaign}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-semibold"
              >
                {t(lang, 'restart_game')}
              </button>
              <button
                type="button"
                data-testid="btn-exit-menu"
                onClick={handleExitToMainMenu}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-semibold text-[#9EB4DA]"
              >
                {t(lang, 'exit_to_menu')}
              </button>
            </div>
          </div>
        )}

        {/* DEFEAT DIALOG */}
        {shellMode === 'gameover' && (
          <div
            data-ui-interactive="true"
            role="dialog"
            aria-modal="true"
            className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/84 p-4"
          >
            <div className="glass-panel w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-xl p-6 flex flex-col gap-4">
              <div className="border-b border-[#FF3B5C]/45 pb-2">
                <h2 className="font-ledger text-2xl font-bold text-[#FF4D6D]">
                  {t(lang, 'defeat_title')}
                </h2>
                <p className="text-xs font-bold text-[#9EB4DA]">
                  Belt Pouch & Vault relics returned safely to your Stash.
                </p>
                <p className="text-xs font-bold text-[#F4B942] mt-1">
                  ◆ +{runShardsEarned} ({t(lang, 'shards_label')}: {records.gateShards})
                </p>
              </div>
              <div className="glass-subcard rounded-lg p-2.5 flex items-center justify-between text-xs font-bold">
                <span className="text-[#9EB4DA]">{t(lang, 'build_summary_title')}</span>
                <span className="text-[#FFF4DC]">
                  {t(lang, equippedWeapon.nameKey as TranslationKey)} T{weaponTiers[equippedWeaponId] ?? 1}
                  {activeSynergies.length > 0 ? ` · ✦${activeSynergies.length}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  sceneRef.current?.returnToCourtyard(week, true);
                  setShellMode('playing');
                  sceneRef.current?.setShellMode('playing');
                }}
                className="glass-gold-btn cursor-pointer w-full py-2.5 px-4 rounded-lg font-bold"
              >
                {t(lang, 'enter_courtyard')}
              </button>
              <button
                type="button"
                onClick={handleExitToMainMenu}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-semibold"
              >
                {t(lang, 'exit_to_menu')}
              </button>
            </div>
          </div>
        )}

        {/* VICTORY DIALOG */}
        {shellMode === 'victory' && (
          <div
            data-ui-interactive="true"
            role="dialog"
            aria-modal="true"
            className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#040712]/84 p-4"
          >
            <div className="glass-panel w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-xl p-6 flex flex-col gap-4">
              <div className="border-b border-[#38E8D8]/45 pb-2">
                <h2 className="font-ledger text-2xl font-bold text-[#FFF4DC]">
                  {t(lang, 'victory_title')}
                </h2>
                <p className="text-xs font-bold text-[#38E8D8]">
                  {t(lang, 'hud_gold')}: {gold}g · Stash Relics: {stash.length}
                </p>
                <p className="text-xs font-bold text-[#F4B942] mt-1">
                  ◆ +{runShardsEarned} ({t(lang, 'shards_label')}: {records.gateShards})
                </p>
              </div>
              <div className="glass-subcard rounded-lg p-2.5 flex flex-col gap-1 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <span className="text-[#9EB4DA]">{t(lang, 'build_summary_title')}</span>
                  <span className="text-[#FFF4DC]">
                    {t(lang, equippedWeapon.nameKey as TranslationKey)} T{weaponTiers[equippedWeaponId] ?? 1}
                    {pactMods.heatLevel > 0 ? ` · 🔥${pactMods.heatLevel}/5` : ''}
                  </span>
                </div>
                {activeSynergies.length > 0 && (
                  <div className="text-[11px] text-[#F4B942]">
                    {activeSynergies.map((s) => `${s.icon} ${t(lang, s.nameKey as TranslationKey)}`).join(' · ')}
                  </div>
                )}
              </div>
              <button
                type="button"
                data-testid="btn-endless-mode"
                onClick={() => {
                  audioRef.current?.playAppraisal();
                  const startEndlessW = CONTENT.weeks.length + 1;
                  setEndlessMode(true);
                  setWeek(startEndlessW);
                  setDay(1);
                  setDebtPaid(0);
                  setRecords((prev) => {
                    const res = grantAchievements(
                      {
                        ...prev,
                        highestEndlessWeek: Math.max(prev.highestEndlessWeek, startEndlessW),
                      },
                      ['endless_5'],
                    );
                    if (res.newlyUnlocked.length > 0) setTrophyToast(res.newlyUnlocked[0]);
                    saveCampaignRecords(res.updated);
                    return res.updated;
                  });
                  setShellMode('playing');
                  sceneRef.current?.setShellMode('playing');
                  flashNotice(`Endless Week ${startEndlessW} Begins!`);
                }}
                className="glass-teal-btn cursor-pointer w-full py-2.5 px-4 rounded-lg font-bold"
              >
                {t(lang, 'endless_btn', { w: CONTENT.weeks.length + 1 })}
              </button>
              <button
                type="button"
                onClick={handleRestartCampaign}
                className="glass-gold-btn cursor-pointer w-full py-2.5 px-4 rounded-lg font-bold"
              >
                {t(lang, 'restart_game')}
              </button>
              <button
                type="button"
                onClick={handleExitToMainMenu}
                className="glass-btn cursor-pointer w-full py-2 px-4 rounded-lg font-semibold"
              >
                {t(lang, 'exit_to_menu')}
              </button>
            </div>
          </div>
        )}

        {/* GATE BOON DRAFTING MODAL (1-of-3) */}
        {boonChoices && boonChoices.length > 0 && (
          <BoonModal
            lang={lang}
            choices={boonChoices}
            ownedBoons={liveHud.activeBoons}
            tiltEnabled={gfxProfile.cardTilt3d}
            rerollsLeft={boonRerollsLeft}
            onReroll={() => {
              if (boonRerollsLeft <= 0) return;
              audioRef.current?.playUiClick();
              const nextChoices = sceneRef.current?.rerollBoons() ?? [];
              if (nextChoices.length > 0) {
                setBoonChoices(nextChoices);
                setBoonRerollsLeft((r) => Math.max(0, r - 1));
              }
            }}
            onSelect={(boon) => {
              audioRef.current?.unlock();
              sceneRef.current?.applyBoon(boon.id);
              setBoonChoices(null);
              setShellMode('playing');
              sceneRef.current?.setShellMode('playing');
              flashNotice(`✦ ${t(lang, boon.nameKey as TranslationKey)}`);
            }}
          />
        )}

        {/* LEDGER SUMMARY MODAL */}
        {ledgerSummary && (
          <LedgerSummaryModal
            lang={lang}
            data={ledgerSummary}
            onContinue={() => {
              audioRef.current?.playUiClick();
              setLedgerSummary(null);
              setShellMode('playing');
              sceneRef.current?.setShellMode('playing');
            }}
          />
        )}

        {/* GUILD CHARTER & GATE PACTS MODAL */}
        {showCharterModal && (
          <CharterModal
            lang={lang}
            gateShards={records.gateShards}
            playerGold={gold}
            talentLevels={records.talentLevels}
            activePacts={records.activePacts}
            unlockedFamiliars={records.unlockedFamiliars}
            equippedFamiliar={records.equippedFamiliar}
            tiltEnabled={gfxProfile.cardTilt3d}
            onUpgradeTalent={(id: GuildTalentId) => {
              const curLvl = records.talentLevels[id] ?? 0;
              const cost = getNextTalentCost(id, curLvl);
              if (cost === null || records.gateShards < cost) return;
              audioRef.current?.playAppraisal();
              const nextLevels = { ...records.talentLevels, [id]: curLvl + 1 };
              const nextBonuses = computeCharterBonuses(nextLevels);
              setRecords((prev) => {
                const { updated, newlyUnlocked } = grantAchievements(
                  {
                    ...prev,
                    gateShards: prev.gateShards - cost,
                    talentLevels: nextLevels,
                  },
                  ['charter_first'],
                );
                if (newlyUnlocked.length > 0) setTrophyToast(newlyUnlocked[0]);
                saveCampaignRecords(updated);
                return updated;
              });
              if (shellMode === 'title') {
                setGold(ARCHETYPES[archetypeId].startGold + nextBonuses.bonusGold);
              }
              setBoonRerollsLeft(nextBonuses.boonRerolls + familiarBonuses.boonRerollBonus);
            }}
            onTogglePact={(id: PactId) => {
              audioRef.current?.playUiClick();
              setRecords((prev) => {
                const exists = prev.activePacts.includes(id);
                const nextPacts = exists
                  ? prev.activePacts.filter((p) => p !== id)
                  : [...prev.activePacts, id];
                const next = { ...prev, activePacts: nextPacts };
                saveCampaignRecords(next);
                return next;
              });
            }}
            onUnlockFamiliar={(id: Exclude<FamiliarId, 'none'>, payWith: 'shards' | 'gold') => {
              const def = FAMILIARS.find((f) => f.id === id);
              if (!def || records.unlockedFamiliars.includes(id)) return;
              if (payWith === 'shards' && records.gateShards < def.shardCost) return;
              if (payWith === 'gold' && gold < def.goldCost) return;
              if (payWith === 'gold') {
                setGold((g) => g - def.goldCost);
              }
              audioRef.current?.playAppraisal();
              setRecords((prev) => {
                const { updated, newlyUnlocked } = grantAchievements(
                  {
                    ...prev,
                    gateShards: payWith === 'shards' ? prev.gateShards - def.shardCost : prev.gateShards,
                    unlockedFamiliars: [...prev.unlockedFamiliars, id],
                    equippedFamiliar: id,
                  },
                  ['familiar_bonded'],
                );
                if (newlyUnlocked.length > 0) setTrophyToast(newlyUnlocked[0]);
                saveCampaignRecords(updated);
                return updated;
              });
              flashNotice(`${def.icon} ${t(lang, def.nameKey as TranslationKey)}!`);
            }}
            onEquipFamiliar={(id: FamiliarId) => {
              audioRef.current?.playUiClick();
              setRecords((prev) => {
                const next: CampaignRecords = { ...prev, equippedFamiliar: id };
                saveCampaignRecords(next);
                return next;
              });
            }}
            onClose={() => setShowCharterModal(false)}
          />
        )}

        {/* RELIC CODEX & RECORDS MODAL */}
        {showCodexModal && (
          <CodexModal
            lang={lang}
            relics={CONTENT.relics}
            records={records}
            onClose={() => setShowCodexModal(false)}
          />
        )}

        {/* SETTINGS & SAVE MODAL */}
        {showSettingsModal && (
          <SettingsModal
            lang={lang}
            settings={settings}
            records={records}
            gamepadConnected={Boolean(liveHud.gamepadConnected)}
            onUpdateSettings={(next) => setSettings(next)}
            onImportRecords={(nextRecs) => {
              saveCampaignRecords(nextRecs);
              setRecords(nextRecs);
            }}
            onRebindCaptureChange={handleRebindCaptureChange}
            onClose={() => {
              inputRef.current?.setRebindCaptureMode(false);
              setShowSettingsModal(false);
            }}
          />
        )}

        {/* 16-LANGUAGE SELECTOR MODAL */}
        {showLangModal && (
          <LanguageModal
            lang={lang}
            onSelect={(nextLang) => {
              audioRef.current?.playUiClick();
              setLang(nextLang);
            }}
            onClose={() => setShowLangModal(false)}
          />
        )}
      </div>
    </div>
  );
}
