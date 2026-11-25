export type GraphicsQuality = 'ultra' | 'high' | 'medium' | 'low';

export enum GraphicsLevel {
  Low = 0,
  Medium = 1,
  High = 2,
  Ultra = 3,
}

export interface GraphicsProfile {
  quality: GraphicsQuality;
  level: GraphicsLevel;
  bloomEnabled: boolean;
  shadowsEnabled: boolean;
  particlesEnabled: boolean;
  particleScale: number;
  cardTilt3d: boolean;
  screenShake: boolean;
  aimArc: boolean;
  uiAnimations: boolean;
  complexGradients: boolean;
  dprCap: number;
}

export type KeybindAction =
  | 'attack'
  | 'block'
  | 'jump'
  | 'dodge'
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'ability5'
  | 'ability6'
  | 'heal'
  | 'interact'
  | 'bag'
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight';

export type KeybindMap = Record<KeybindAction, string>;

export const KEYBIND_ACTIONS: KeybindAction[] = [
  'attack',
  'block',
  'jump',
  'dodge',
  'ability1',
  'ability2',
  'ability3',
  'ability4',
  'ability5',
  'ability6',
  'heal',
  'interact',
  'bag',
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
];

export const DEFAULT_KEYBINDS: KeybindMap = {
  attack: 'Mouse0',
  block: 'Mouse2',
  jump: 'Space',
  dodge: 'ShiftLeft',
  ability1: 'Digit1',
  ability2: 'Digit2',
  ability3: 'Digit3',
  ability4: 'Digit4',
  ability5: 'Digit5',
  ability6: 'Digit6',
  heal: 'KeyR',
  interact: 'KeyE',
  bag: 'KeyB',
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
};

export interface GameSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  graphicsQuality: GraphicsQuality;
  showDay1Guide: boolean;
  keybinds: KeybindMap;
}

const SETTINGS_KEY = 'gateledger_settings_v1';

let activeGraphicsLevel: GraphicsLevel = GraphicsLevel.Ultra;

export function isValidBindingCode(code: unknown): code is string {
  if (typeof code !== 'string' || code.length === 0 || code.length > 24) return false;
  if (code === 'Escape' || code === 'PrintScreen' || code === 'ContextMenu') return false;
  if (/^Mouse[0-4]$/.test(code)) return true;
  if (/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-2]))$/.test(code)) return true;
  if (/^Arrow(Up|Down|Left|Right)$/.test(code)) return true;
  return new Set([
    'Space',
    'ShiftLeft',
    'ShiftRight',
    'ControlLeft',
    'ControlRight',
    'AltLeft',
    'AltRight',
    'Tab',
    'Enter',
    'Backspace',
    'Minus',
    'Equal',
    'BracketLeft',
    'BracketRight',
    'Backslash',
    'Semicolon',
    'Quote',
    'Comma',
    'Period',
    'Slash',
    'Backquote',
    'CapsLock',
  ]).has(code);
}

export function normalizeKeybinds(raw: Partial<KeybindMap> | null | undefined): KeybindMap {
  const result: KeybindMap = { ...DEFAULT_KEYBINDS };
  if (!raw || typeof raw !== 'object') return result;
  for (const action of KEYBIND_ACTIONS) {
    const val = raw[action];
    if (isValidBindingCode(val)) {
      result[action] = action === 'bag' && val === 'Tab' ? 'KeyB' : val;
    }
  }
  return result;
}

export function rebindKeyAction(
  current: KeybindMap,
  action: KeybindAction,
  newCode: string,
): KeybindMap {
  if (!isValidBindingCode(newCode)) return current;
  const next: KeybindMap = { ...current };
  const prevCode = next[action];
  if (prevCode === newCode) return next;
  for (const other of KEYBIND_ACTIONS) {
    if (other !== action && next[other] === newCode) {
      next[other] = prevCode;
    }
  }
  next[action] = newCode;
  return next;
}

export function formatKeybindLabel(code: string): string {
  if (code === 'Mouse0') return 'LMB';
  if (code === 'Mouse1') return 'MMB';
  if (code === 'Mouse2') return 'RMB';
  if (code === 'Mouse3') return 'MB4';
  if (code === 'Mouse4') return 'MB5';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPACE';
  if (code === 'ShiftLeft') return 'SHIFT';
  if (code === 'ShiftRight') return 'R-SHF';
  if (code === 'ControlLeft') return 'CTRL';
  if (code === 'ControlRight') return 'R-CTL';
  if (code === 'AltLeft') return 'ALT';
  if (code === 'AltRight') return 'R-ALT';
  if (code === 'Tab') return 'TAB';
  if (code === 'Enter') return 'ENTER';
  if (code === 'Backspace') return 'BKSP';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'Backquote') return '`';
  if (code === 'Minus') return '-';
  if (code === 'Equal') return '=';
  return code.toUpperCase().slice(0, 6);
}

export function getGraphicsLevel(quality: GraphicsQuality): GraphicsLevel {
  switch (quality) {
    case 'ultra':
      return GraphicsLevel.Ultra;
    case 'high':
      return GraphicsLevel.High;
    case 'medium':
      return GraphicsLevel.Medium;
    case 'low':
      return GraphicsLevel.Low;
  }
}

export function getCurrentGraphicsLevel(): GraphicsLevel {
  return activeGraphicsLevel;
}

export function setCurrentGraphicsLevel(quality: GraphicsQuality): GraphicsLevel {
  activeGraphicsLevel = getGraphicsLevel(quality);
  return activeGraphicsLevel;
}

export function getGraphicsProfile(quality: GraphicsQuality): GraphicsProfile {
  const level = getGraphicsLevel(quality);
  switch (level) {
    case GraphicsLevel.Ultra:
      return {
        quality: 'ultra',
        level,
        bloomEnabled: true,
        shadowsEnabled: true,
        particlesEnabled: true,
        particleScale: 1,
        cardTilt3d: true,
        screenShake: true,
        aimArc: true,
        uiAnimations: true,
        complexGradients: true,
        dprCap: 2,
      };
    case GraphicsLevel.High:
      return {
        quality: 'high',
        level,
        bloomEnabled: true,
        shadowsEnabled: true,
        particlesEnabled: true,
        particleScale: 0.45,
        cardTilt3d: false,
        screenShake: true,
        aimArc: true,
        uiAnimations: true,
        complexGradients: true,
        dprCap: 1.5,
      };
    case GraphicsLevel.Medium:
      return {
        quality: 'medium',
        level,
        bloomEnabled: false,
        shadowsEnabled: false,
        particlesEnabled: false,
        particleScale: 0,
        cardTilt3d: false,
        screenShake: false,
        aimArc: false,
        uiAnimations: true,
        complexGradients: true,
        dprCap: 1.1,
      };
    case GraphicsLevel.Low:
    default:
      return {
        quality: 'low',
        level: GraphicsLevel.Low,
        bloomEnabled: false,
        shadowsEnabled: false,
        particlesEnabled: false,
        particleScale: 0,
        cardTilt3d: false,
        screenShake: false,
        aimArc: false,
        uiAnimations: false,
        complexGradients: false,
        dprCap: 1,
      };
  }
}

export function createDefaultSettings(): GameSettings {
  return {
    musicVolume: 0.75,
    sfxVolume: 0.85,
    graphicsQuality: 'ultra',
    showDay1Guide: true,
    keybinds: { ...DEFAULT_KEYBINDS },
  };
}

export function normalizeSettings(raw: Partial<GameSettings> | null | undefined): GameSettings {
  const def = createDefaultSettings();
  if (!raw) return def;
  const clamp01 = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  const rawQuality = raw.graphicsQuality as string | undefined;
  let gq: GraphicsQuality = def.graphicsQuality;
  if (
    rawQuality === 'ultra' ||
    rawQuality === 'high' ||
    rawQuality === 'medium' ||
    rawQuality === 'low'
  ) {
    gq = rawQuality;
  } else if (rawQuality === 'eco') {
    gq = 'low';
  }
  return {
    musicVolume: clamp01(raw.musicVolume, def.musicVolume),
    sfxVolume: clamp01(raw.sfxVolume, def.sfxVolume),
    graphicsQuality: gq,
    showDay1Guide: typeof raw.showDay1Guide === 'boolean' ? raw.showDay1Guide : def.showDay1Guide,
    keybinds: normalizeKeybinds(raw.keybinds),
  };
}

export function loadSettings(): GameSettings {
  if (typeof localStorage === 'undefined') return createDefaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return createDefaultSettings();
    const normalized = normalizeSettings(JSON.parse(raw) as Partial<GameSettings>);
    setCurrentGraphicsLevel(normalized.graphicsQuality);
    return normalized;
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: GameSettings): void {
  const normalized = normalizeSettings(settings);
  setCurrentGraphicsLevel(normalized.graphicsQuality);
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}
