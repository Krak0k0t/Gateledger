export type MusicTheme = 'courtyard_day' | 'shop_haggle' | 'dungeon_explore' | 'dungeon_boss';

interface NoteStep {
  bass: number | null;
  arp: number | null;
  lead: number | null;
}

const SCALES: Record<MusicTheme, { tempoMs: number; steps: NoteStep[] }> = {
  courtyard_day: {
    tempoMs: 360,
    steps: [
      { bass: 146.83, arp: 293.66, lead: 587.33 },
      { bass: null, arp: 349.23, lead: null },
      { bass: null, arp: 440.0, lead: 659.25 },
      { bass: null, arp: 523.25, lead: null },
      { bass: 130.81, arp: 261.63, lead: 523.25 },
      { bass: null, arp: 329.63, lead: null },
      { bass: null, arp: 392.0, lead: 440.0 },
      { bass: null, arp: 493.88, lead: null },
      { bass: 116.54, arp: 233.08, lead: 466.16 },
      { bass: null, arp: 293.66, lead: null },
      { bass: null, arp: 349.23, lead: 523.25 },
      { bass: null, arp: 440.0, lead: 587.33 },
      { bass: 130.81, arp: 261.63, lead: 523.25 },
      { bass: null, arp: 329.63, lead: 493.88 },
      { bass: null, arp: 392.0, lead: 440.0 },
      { bass: null, arp: 440.0, lead: null },
    ],
  },
  shop_haggle: {
    tempoMs: 280,
    steps: [
      { bass: 196.0, arp: 392.0, lead: 783.99 },
      { bass: null, arp: 493.88, lead: null },
      { bass: null, arp: 587.33, lead: 659.25 },
      { bass: 164.81, arp: 329.63, lead: 783.99 },
      { bass: null, arp: 493.88, lead: 880.0 },
      { bass: null, arp: 587.33, lead: null },
      { bass: 174.61, arp: 349.23, lead: 698.46 },
      { bass: null, arp: 440.0, lead: 659.25 },
      { bass: null, arp: 523.25, lead: 587.33 },
      { bass: 146.83, arp: 293.66, lead: 587.33 },
      { bass: null, arp: 392.0, lead: 659.25 },
      { bass: null, arp: 493.88, lead: null },
    ],
  },
  dungeon_explore: {
    tempoMs: 410,
    steps: [
      { bass: 110.0, arp: 220.0, lead: 659.25 },
      { bass: null, arp: 261.63, lead: null },
      { bass: null, arp: 329.63, lead: null },
      { bass: null, arp: 311.13, lead: 587.33 },
      { bass: 98.0, arp: 196.0, lead: null },
      { bass: null, arp: 246.94, lead: 523.25 },
      { bass: null, arp: 293.66, lead: null },
      { bass: null, arp: 329.63, lead: 493.88 },
      { bass: 87.31, arp: 174.61, lead: 440.0 },
      { bass: null, arp: 220.0, lead: null },
      { bass: null, arp: 261.63, lead: 523.25 },
      { bass: null, arp: 329.63, lead: null },
    ],
  },
  dungeon_boss: {
    tempoMs: 195,
    steps: [
      { bass: 110.0, arp: 220.0, lead: 659.25 },
      { bass: 110.0, arp: 261.63, lead: null },
      { bass: 110.0, arp: 329.63, lead: 698.46 },
      { bass: null, arp: 261.63, lead: 659.25 },
      { bass: 103.83, arp: 207.65, lead: 587.33 },
      { bass: 103.83, arp: 246.94, lead: null },
      { bass: 98.0, arp: 196.0, lead: 523.25 },
      { bass: null, arp: 246.94, lead: 587.33 },
    ],
  },
};

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
  let musicGain: GainNode | null = null;
  let sfxGain: GainNode | null = null;
  let musicFilter: BiquadFilterNode | null = null;
  let muted = false;
  let musicVol = 0.75;
  let sfxVol = 0.85;
  let paused = false;
  let lowHpMode = false;
  let tensionPulse = false;
  let activeTheme: MusicTheme = 'courtyard_day';
  let stepIndex = 0;
  let timerId: number | null = null;

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

        musicFilter = ctx.createBiquadFilter();
        musicFilter.type = 'lowpass';
        musicFilter.frequency.value = lowHpMode ? 900 : 14000;
        musicFilter.connect(masterGain);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.28 * musicVol;
        musicGain.connect(musicFilter);
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

  const scheduleNextBeat = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    const pattern = SCALES[activeTheme];
    const tempoMs =
      (lowHpMode || tensionPulse) && activeTheme !== 'courtyard_day'
        ? Math.round(pattern.tempoMs * 0.82)
        : pattern.tempoMs;
    timerId = window.setTimeout(() => {
      if (ctx && ctx.state === 'running' && musicGain && !muted && !paused) {
        const step = pattern.steps[stepIndex % pattern.steps.length];
        stepIndex += 1;
        const durSec = (tempoMs / 1000) * 1.35;
        if (step.bass) {
          playVoice(
            musicGain,
            step.bass,
            step.bass,
            durSec * 1.4,
            activeTheme === 'dungeon_boss' ? 0.22 : 0.16,
            activeTheme === 'dungeon_explore' || activeTheme === 'dungeon_boss'
              ? 'sawtooth'
              : 'triangle',
            0.03,
          );
        }
        if (step.arp) {
          playVoice(
            musicGain,
            step.arp,
            step.arp,
            durSec * 0.9,
            0.09,
            activeTheme === 'shop_haggle' ? 'sine' : 'triangle',
            0.012,
          );
        }
        if (step.lead) {
          playVoice(
            musicGain,
            step.lead,
            step.lead,
            durSec * 1.6,
            0.08,
            activeTheme === 'dungeon_boss' ? 'square' : 'sine',
            0.025,
          );
        }
        // Subtle low-HP or Marauder tension heartbeat pulse on even beats
        if ((lowHpMode || tensionPulse) && stepIndex % 2 === 0 && sfxGain) {
          playVoice(sfxGain, tensionPulse ? 88 : 76, 42, 0.15, tensionPulse ? 0.14 : 0.12, 'sine', 0.01);
        }
      }
      scheduleNextBeat();
    }, tempoMs);
  };

  scheduleNextBeat();

  return {
    unlock() {
      ensureAudio();
    },
    setMuted(next: boolean) {
      muted = next;
      if (masterGain && ctx) {
        masterGain.gain.setValueAtTime(muted ? 0 : 0.8, ctx.currentTime);
      }
    },
    isMuted() {
      return muted;
    },
    setMusicVolume(vol: number) {
      musicVol = Math.min(1, Math.max(0, vol));
      if (musicGain && ctx) {
        musicGain.gain.setTargetAtTime(0.28 * musicVol, ctx.currentTime, 0.05);
      }
    },
    setSfxVolume(vol: number) {
      sfxVol = Math.min(1, Math.max(0, vol));
      if (sfxGain && ctx) {
        sfxGain.gain.setTargetAtTime(sfxVol, ctx.currentTime, 0.05);
      }
    },
    setTheme(theme: MusicTheme) {
      if (activeTheme !== theme) {
        activeTheme = theme;
        stepIndex = 0;
      }
    },
    setPaused(p: boolean) {
      paused = p;
    },
    setLowHpMode(active: boolean) {
      if (lowHpMode === active) return;
      lowHpMode = active;
      if (musicFilter && ctx) {
        musicFilter.frequency.setTargetAtTime(active ? 920 : 14000, ctx.currentTime, 0.18);
      }
    },
    setTensionPulse(active: boolean) {
      tensionPulse = active;
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
      if (timerId !== null) clearTimeout(timerId);
      if (ctx) {
        void ctx.close().catch(() => {});
        ctx = null;
      }
    },
  };
}
