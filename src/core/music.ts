export type MusicTheme = 'courtyard_day' | 'shop_haggle' | 'dungeon_explore' | 'dungeon_boss';

export type SoundtrackTrackId =
  | 'gold'
  | 'gilded_throne'
  | 'ancient_slavic_shadows'
  | 'leshy'
  | 'last_stand';

export interface SoundtrackTrack {
  id: SoundtrackTrackId;
  fileName: string;
  src: string;
  titleKey:
    | 'track_gold_title'
    | 'track_gilded_throne_title'
    | 'track_slavic_shadows_title'
    | 'track_leshy_title'
    | 'track_last_stand_title';
  moodKey:
    | 'track_mood_courtyard'
    | 'track_mood_shop'
    | 'track_mood_ruins'
    | 'track_mood_wilds'
    | 'track_mood_boss';
  themeAffinity: MusicTheme;
}

export const SOUNDTRACK_TRACKS: readonly SoundtrackTrack[] = [
  {
    id: 'gold',
    fileName: 'Gold.ogg',
    src: '/assets/audio/Gold.ogg',
    titleKey: 'track_gold_title',
    moodKey: 'track_mood_courtyard',
    themeAffinity: 'courtyard_day',
  },
  {
    id: 'gilded_throne',
    fileName: 'Gilded Throne.ogg',
    src: '/assets/audio/Gilded%20Throne.ogg',
    titleKey: 'track_gilded_throne_title',
    moodKey: 'track_mood_shop',
    themeAffinity: 'shop_haggle',
  },
  {
    id: 'ancient_slavic_shadows',
    fileName: 'Ancient Slavic Shadows.ogg',
    src: '/assets/audio/Ancient%20Slavic%20Shadows.ogg',
    titleKey: 'track_slavic_shadows_title',
    moodKey: 'track_mood_ruins',
    themeAffinity: 'dungeon_explore',
  },
  {
    id: 'leshy',
    fileName: 'Leshy.ogg',
    src: '/assets/audio/Leshy.ogg',
    titleKey: 'track_leshy_title',
    moodKey: 'track_mood_wilds',
    themeAffinity: 'dungeon_explore',
  },
  {
    id: 'last_stand',
    fileName: 'Last Stand.ogg',
    src: '/assets/audio/Last%20Stand.ogg',
    titleKey: 'track_last_stand_title',
    moodKey: 'track_mood_boss',
    themeAffinity: 'dungeon_boss',
  },
] as const;

export function getNextCarouselIndex(
  currentIndex: number,
  step: 1 | -1,
  total: number = SOUNDTRACK_TRACKS.length,
): number {
  if (total <= 0) return 0;
  return ((currentIndex + step) % total + total) % total;
}

export function computeSubduedMusicGain(
  musicVolume: number,
  muted: boolean,
  paused: boolean,
  lowHpMode: boolean,
): number {
  if (muted) return 0;
  const clamped = Math.min(1, Math.max(0, musicVolume));
  const baseSubduedCeiling = 0.28; // Always keeps background soundtrack gently subdued
  const pauseDuck = paused ? 0.45 : 1.0;
  const lowHpDuck = lowHpMode ? 0.72 : 1.0;
  return Math.min(1, Math.max(0, clamped * baseSubduedCeiling * pauseDuck * lowHpDuck));
}

export interface MusicPlayerState {
  trackIndex: number;
  track: SoundtrackTrack;
  isPlaying: boolean;
  userPaused: boolean;
  muted: boolean;
  musicVolume: number;
  autoplayBlocked: boolean;
}

export interface DynamicAudioEngine {
  unlock(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setMusicVolume(vol: number): void;
  setSfxVolume(vol: number): void;
  setTheme(theme: MusicTheme): void;
  setPaused(paused: boolean): void;
  setLowHpMode(active: boolean): void;
  setTensionPulse(active: boolean): void;
  getMusicState(): MusicPlayerState;
  subscribeMusicState(cb: (state: MusicPlayerState) => void): () => void;
  nextTrack(): void;
  prevTrack(): void;
  selectTrack(idOrIndex: SoundtrackTrackId | number): void;
  toggleMusicPlayback(): void;
  playStep(rand: number): void;
  playJump(): void;
  playSwing(comboIdx: number): void;
  playChargeReady(): void;
  playSlam(): void;
  playHit(heavy: boolean): void;
  playAppraisal(): void;
  playDeflect(): void;
  playLightning(): void;
  playTrap(): void;
  playCashBell(): void;
  playCoin(): void;
  playUiClick(): void;
  playDanger(): void;
  playDodge(): void;
  playBlock(parry: boolean): void;
  playSpellCast(kind: 'fire' | 'frost' | 'aegis' | 'whirl'): void;
  dispose(): void;
}

export function createDynamicAudioEngine(): DynamicAudioEngine {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let sfxGain: GainNode | null = null;
  let muted = false;
  let musicVol = 0.35;
  let sfxVol = 0.85;
  let paused = false;
  let lowHpMode = false;
  let tensionPulse = false;

  // Real OGG Carousel BGM Player (replaces synthesized music)
  let trackIndex = 0;
  let userPaused = false;
  let isPlaying = false;
  let autoplayBlocked = false;
  let disposed = false;
  let tensionTimerId: number | null = null;
  const listeners = new Set<(state: MusicPlayerState) => void>();

  const buildSnapshot = (): MusicPlayerState => ({
    trackIndex,
    track: SOUNDTRACK_TRACKS[trackIndex] ?? SOUNDTRACK_TRACKS[0],
    isPlaying,
    userPaused,
    muted,
    musicVolume: musicVol,
    autoplayBlocked,
  });

  const emitMusicState = () => {
    const snap = buildSnapshot();
    listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch {
        // Ignore subscriber UI error
      }
    });
  };

  const bgmAudio: HTMLAudioElement | null =
    typeof window !== 'undefined' && typeof Audio !== 'undefined' ? new Audio() : null;

  const syncBgmVolume = () => {
    if (!bgmAudio) return;
    bgmAudio.volume = computeSubduedMusicGain(musicVol, muted, paused, lowHpMode);
  };

  const attemptPlayBgm = () => {
    if (!bgmAudio || disposed || userPaused) return;
    syncBgmVolume();
    if (!bgmAudio.src) {
      bgmAudio.src = SOUNDTRACK_TRACKS[trackIndex].src;
    }
    try {
      const playPromise = bgmAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (disposed) return;
            isPlaying = !bgmAudio.paused;
            autoplayBlocked = false;
            emitMusicState();
          })
          .catch(() => {
            if (disposed) return;
            isPlaying = false;
            autoplayBlocked = true;
            emitMusicState();
          });
      } else {
        isPlaying = !bgmAudio.paused;
        autoplayBlocked = false;
        emitMusicState();
      }
    } catch {
      isPlaying = false;
      autoplayBlocked = true;
      emitMusicState();
    }
  };

  const loadAndPlayTrack = (nextIdx: number, forcePlay = false) => {
    trackIndex = ((nextIdx % SOUNDTRACK_TRACKS.length) + SOUNDTRACK_TRACKS.length) % SOUNDTRACK_TRACKS.length;
    if (forcePlay) {
      userPaused = false;
    }
    if (!bgmAudio) {
      emitMusicState();
      return;
    }
    bgmAudio.pause();
    bgmAudio.src = SOUNDTRACK_TRACKS[trackIndex].src;
    bgmAudio.currentTime = 0;
    syncBgmVolume();
    emitMusicState();
    if (!userPaused) {
      attemptPlayBgm();
    }
  };

  const onBgmEnded = () => {
    if (disposed || userPaused) return;
    loadAndPlayTrack(getNextCarouselIndex(trackIndex, 1), false);
  };

  const onBgmPlay = () => {
    isPlaying = true;
    autoplayBlocked = false;
    emitMusicState();
  };

  const onBgmPause = () => {
    isPlaying = false;
    emitMusicState();
  };

  const onFirstInteraction = () => {
    if (disposed) return;
    ensureAudio();
    if (!userPaused && bgmAudio && bgmAudio.paused) {
      attemptPlayBgm();
    }
  };

  if (bgmAudio) {
    bgmAudio.preload = 'auto';
    bgmAudio.loop = false; // Handled via carousel 'ended' event
    bgmAudio.src = SOUNDTRACK_TRACKS[0].src;
    syncBgmVolume();
    bgmAudio.addEventListener('ended', onBgmEnded);
    bgmAudio.addEventListener('play', onBgmPlay);
    bgmAudio.addEventListener('pause', onBgmPause);
    // Start softly in background automatically on load
    attemptPlayBgm();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onFirstInteraction, { passive: true });
    window.addEventListener('keydown', onFirstInteraction, { passive: true });
  }

  const ensureAudio = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : 0.8;
        masterGain.connect(ctx.destination);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = sfxVol;
        sfxGain.connect(masterGain);
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const playVoice = (
    target: AudioNode,
    freq: number,
    endFreq: number,
    duration: number,
    peak: number,
    type: OscillatorType,
    attack = 0.015,
  ) => {
    if (!ctx || ctx.state !== 'running' || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(32, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(target);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  };

  // Subtle low-HP / Marauder SFX heartbeat cue (SFX channel only, never synthesized music)
  const scheduleTensionCue = () => {
    if (disposed) return;
    tensionTimerId = window.setTimeout(() => {
      if ((lowHpMode || tensionPulse) && !muted && !paused && sfxGain) {
        playVoice(sfxGain, tensionPulse ? 88 : 76, 42, 0.14, tensionPulse ? 0.12 : 0.1, 'sine', 0.01);
      }
      scheduleTensionCue();
    }, 640);
  };
  if (typeof window !== 'undefined') {
    scheduleTensionCue();
  }

  return {
    unlock() {
      ensureAudio();
      if (!userPaused && bgmAudio && bgmAudio.paused) {
        attemptPlayBgm();
      }
    },
    setMuted(next: boolean) {
      muted = next;
      if (masterGain && ctx) {
        masterGain.gain.setValueAtTime(muted ? 0 : 0.8, ctx.currentTime);
      }
      syncBgmVolume();
      emitMusicState();
    },
    isMuted() {
      return muted;
    },
    setMusicVolume(vol: number) {
      musicVol = Math.min(1, Math.max(0, vol));
      syncBgmVolume();
      emitMusicState();
    },
    setSfxVolume(vol: number) {
      sfxVol = Math.min(1, Math.max(0, vol));
      if (sfxGain && ctx) {
        sfxGain.gain.setTargetAtTime(sfxVol, ctx.currentTime, 0.05);
      }
    },
    setTheme(_theme: MusicTheme) {
      // Carousel mode flows smoothly across the 5 OGG compositions without interrupting active tracks.
      syncBgmVolume();
    },
    setPaused(p: boolean) {
      paused = p;
      syncBgmVolume();
    },
    setLowHpMode(active: boolean) {
      if (lowHpMode === active) return;
      lowHpMode = active;
      syncBgmVolume();
    },
    setTensionPulse(active: boolean) {
      tensionPulse = active;
    },
    getMusicState() {
      return buildSnapshot();
    },
    subscribeMusicState(cb) {
      listeners.add(cb);
      cb(buildSnapshot());
      return () => {
        listeners.delete(cb);
      };
    },
    nextTrack() {
      loadAndPlayTrack(getNextCarouselIndex(trackIndex, 1), true);
    },
    prevTrack() {
      loadAndPlayTrack(getNextCarouselIndex(trackIndex, -1), true);
    },
    selectTrack(idOrIndex: SoundtrackTrackId | number) {
      const idx =
        typeof idOrIndex === 'number'
          ? idOrIndex
          : SOUNDTRACK_TRACKS.findIndex((tr) => tr.id === idOrIndex);
      if (idx >= 0) {
        loadAndPlayTrack(idx, true);
      }
    },
    toggleMusicPlayback() {
      if (!bgmAudio) return;
      if (userPaused || bgmAudio.paused) {
        userPaused = false;
        attemptPlayBgm();
      } else {
        userPaused = true;
        bgmAudio.pause();
        isPlaying = false;
        emitMusicState();
      }
    },
    playStep(rand: number) {
      if (!sfxGain) return;
      const base = 145 * (0.92 + rand * 0.16);
      playVoice(sfxGain, base, base * 0.65, 0.055, 0.04, 'triangle', 0.008);
    },
    playJump() {
      if (!sfxGain) return;
      playVoice(sfxGain, 220, 440, 0.16, 0.09, 'sine', 0.01);
    },
    playSwing(comboIdx: number) {
      if (!sfxGain) return;
      const start = 280 + comboIdx * 75;
      const dur = comboIdx >= 2 ? 0.19 : 0.12;
      playVoice(sfxGain, start, 105, dur, comboIdx >= 2 ? 0.12 : 0.09, 'triangle', 0.006);
      if (comboIdx >= 2) {
        playVoice(sfxGain, 660 + comboIdx * 90, 290, 0.21, 0.08, 'sine', 0.01);
      }
    },
    playChargeReady() {
      if (!sfxGain) return;
      playVoice(sfxGain, 784, 1174.66, 0.16, 0.11, 'sine', 0.006);
      window.setTimeout(() => {
        if (sfxGain) playVoice(sfxGain, 1174.66, 1567.98, 0.2, 0.09, 'triangle', 0.008);
      }, 55);
    },
    playSlam() {
      if (!sfxGain) return;
      playVoice(sfxGain, 145, 42, 0.28, 0.22, 'sawtooth', 0.004);
      playVoice(sfxGain, 260, 70, 0.2, 0.14, 'triangle', 0.004);
    },
    playHit(heavy: boolean) {
      if (!sfxGain) return;
      playVoice(
        sfxGain,
        heavy ? 180 : 250,
        62,
        heavy ? 0.18 : 0.1,
        heavy ? 0.18 : 0.11,
        heavy ? 'sawtooth' : 'square',
        0.005,
      );
    },
    playAppraisal() {
      if (!sfxGain) return;
      playVoice(sfxGain, 587.33, 880, 0.22, 0.14, 'sine', 0.01);
      window.setTimeout(() => {
        if (sfxGain) playVoice(sfxGain, 880, 1174.66, 0.26, 0.14, 'triangle', 0.01);
      }, 75);
    },
    playDeflect() {
      if (!sfxGain) return;
      playVoice(sfxGain, 740, 1480, 0.15, 0.13, 'triangle', 0.004);
    },
    playLightning() {
      if (!sfxGain) return;
      playVoice(sfxGain, 1120, 320, 0.19, 0.11, 'sawtooth', 0.005);
    },
    playTrap() {
      if (!sfxGain) return;
      playVoice(sfxGain, 330, 660, 0.22, 0.13, 'square', 0.01);
    },
    playCashBell() {
      if (!sfxGain) return;
      playVoice(sfxGain, 1318.51, 1567.98, 0.22, 0.12, 'sine', 0.004);
      window.setTimeout(() => {
        if (sfxGain) playVoice(sfxGain, 1760, 2093, 0.26, 0.1, 'sine', 0.005);
      }, 65);
    },
    playCoin() {
      if (!sfxGain) return;
      playVoice(sfxGain, 987.77, 1318.51, 0.14, 0.1, 'sine', 0.006);
    },
    playUiClick() {
      if (!sfxGain) return;
      playVoice(sfxGain, 440, 587.33, 0.07, 0.06, 'triangle', 0.005);
    },
    playDanger() {
      if (!sfxGain) return;
      playVoice(sfxGain, 196, 130, 0.28, 0.14, 'sawtooth', 0.02);
    },
    playDodge() {
      if (!sfxGain) return;
      playVoice(sfxGain, 320, 140, 0.14, 0.09, 'triangle', 0.005);
    },
    playBlock(parry: boolean) {
      if (!sfxGain) return;
      if (parry) {
        playVoice(sfxGain, 660, 1320, 0.16, 0.14, 'triangle', 0.004);
        playVoice(sfxGain, 988, 1760, 0.18, 0.1, 'sine', 0.008);
      } else {
        playVoice(sfxGain, 240, 110, 0.11, 0.11, 'square', 0.004);
      }
    },
    playSpellCast(kind: 'fire' | 'frost' | 'aegis' | 'whirl') {
      if (!sfxGain) return;
      if (kind === 'fire') {
        playVoice(sfxGain, 220, 95, 0.28, 0.15, 'sawtooth', 0.012);
        playVoice(sfxGain, 440, 210, 0.24, 0.09, 'triangle', 0.01);
      } else if (kind === 'frost') {
        playVoice(sfxGain, 880, 1760, 0.24, 0.12, 'sine', 0.008);
        playVoice(sfxGain, 520, 260, 0.22, 0.11, 'triangle', 0.006);
      } else if (kind === 'aegis') {
        playVoice(sfxGain, 392, 587.33, 0.26, 0.13, 'sine', 0.01);
        playVoice(sfxGain, 784, 1046.5, 0.22, 0.08, 'triangle', 0.012);
      } else {
        playVoice(sfxGain, 360, 120, 0.24, 0.13, 'sawtooth', 0.006);
      }
    },
    dispose() {
      disposed = true;
      if (tensionTimerId !== null) clearTimeout(tensionTimerId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
      }
      if (bgmAudio) {
        bgmAudio.removeEventListener('ended', onBgmEnded);
        bgmAudio.removeEventListener('play', onBgmPlay);
        bgmAudio.removeEventListener('pause', onBgmPause);
        bgmAudio.pause();
        bgmAudio.src = '';
      }
      listeners.clear();
      if (ctx) {
        void ctx.close().catch(() => {});
        ctx = null;
      }
    },
  };
}
