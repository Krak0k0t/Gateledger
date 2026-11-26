import { DEFAULT_KEYBINDS, type KeybindAction, type KeybindMap } from './settings';

export interface InputAxis {
  x: number;
  z: number;
}

export type VirtualAction =
  | 'attack'
  | 'block'
  | 'jump'
  | 'dodge'
  | 'special'
  | 'interact'
  | 'heal'
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'ability5'
  | 'ability6'
  | 'ability7'
  | 'ability8';

export interface OrbitDeltaState {
  dx: number;
  dy: number;
  dragging: boolean;
  lmb: boolean;
  rmb: boolean;
}

export interface InputHub {
  setKeybinds(map: KeybindMap): void;
  getKeybinds(): KeybindMap;
  setRebindCaptureMode(active: boolean): void;
  isHeld(code: string): boolean;
  consumeJustPressed(code: string): boolean;
  isActionHeld(action: KeybindAction): boolean;
  consumeActionJustPressed(action: KeybindAction): boolean;
  consumeActionReleased(action: KeybindAction): boolean;
  consumeMouseAttack(): boolean;
  isAttackHeld(): boolean;
  consumeAttackReleased(): boolean;
  consumeMouseJump(): boolean;
  getPointerPos(): { x: number; y: number; active: boolean };
  consumeOrbitDelta(): OrbitDeltaState;
  consumeWheelDelta(): number;
  consumeCanvasClick(): { x: number; y: number } | null;
  setPointerLockAllowed(allowed: boolean): void;
  isOrbitDragging(): boolean;
  getMoveAxis(out: InputAxis): InputAxis;
  setVirtualMove(x: number, z: number): void;
  triggerVirtualAction(action: VirtualAction): void;
  pollGamepad(): void;
  isGamepadConnected(): boolean;
  clear(): void;
  endFrame(): void;
  dispose(): void;
}

const SYSTEM_CODES = new Set([
  'Escape',
  'KeyP',
  'KeyM',
  'KeyH',
  'KeyI',
  'Tab',
  'Enter',
  'KeyQ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export function createInputHub(
  canvasContainer?: HTMLElement,
  initialKeybinds: KeybindMap = DEFAULT_KEYBINDS,
): InputHub {
  let keybinds: KeybindMap = { ...initialKeybinds };
  let rebindCaptureMode = false;

  const held = new Set<string>();
  const justPressed = new Set<string>();
  const justReleased = new Set<string>();
  const virtualJustPressed = new Set<KeybindAction>();
  let mouseJumpCompat = false;
  let virtualMoveX = 0;
  let virtualMoveZ = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;
  let gpMoveX = 0;
  let gpMoveZ = 0;
  let gpConnected = false;
  const prevGpButtons = new Set<number>();

  // Orbit / Zoom / Click-vs-Drag state (Mouse_rpg rules)
  let orbitDeltaX = 0;
  let orbitDeltaY = 0;
  let wheelDelta = 0;
  let pressDownX = 0;
  let pressDownY = 0;
  let orbitDragged = false;
  let lmbRawDown = false;
  let rmbRawDown = false;
  let lmbAttackArmed = false;
  let lmbSwingDispatched = false;
  let lmbDownTimeMs = 0;
  let pointerLockAllowed = false;
  let pendingCanvasClick: { x: number; y: number } | null = null;

  const LMB_HOLD_THRESHOLD_MS = 140;

  const releasePointerLockSafe = () => {
    try {
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore pointer lock rejection in sandboxed iframes
    }
  };

  const requestPointerLockSafe = () => {
    if (!pointerLockAllowed || !canvasContainer) return;
    try {
      const target = canvasContainer.querySelector('canvas') ?? canvasContainer;
      if (typeof document !== 'undefined' && !document.pointerLockElement && target.requestPointerLock) {
        const res = target.requestPointerLock() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      }
    } catch {
      // Ignore pointer lock error if unsupported
    }
  };

  const isBoundCode = (code: string): boolean => {
    for (const key in keybinds) {
      if (keybinds[key as KeybindAction] === code) return true;
    }
    return SYSTEM_CODES.has(code);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (rebindCaptureMode) return;
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      document.activeElement instanceof HTMLSelectElement
    ) {
      return;
    }
    if (
      event.code === 'Space' ||
      event.code === 'Tab' ||
      event.code.startsWith('Arrow') ||
      isBoundCode(event.code)
    ) {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
      } else if (event.code === 'Space' || event.code === 'Tab') {
        event.preventDefault();
      }
    }
    if (!held.has(event.code)) {
      justPressed.add(event.code);
    }
    held.add(event.code);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (held.has(event.code)) {
      held.delete(event.code);
      justReleased.add(event.code);
    }
  };

  const isUiTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest('button, input, select, a, [role="dialog"], [data-ui-interactive="true"]'),
    );
  };

  const mouseButtonToCode = (button: number): string => `Mouse${button}`;

  const promoteArmedLmbHoldIfReady = () => {
    if (
      lmbAttackArmed &&
      !orbitDragged &&
      keybinds.attack === 'Mouse0' &&
      performance.now() - lmbDownTimeMs >= LMB_HOLD_THRESHOLD_MS
    ) {
      lmbAttackArmed = false;
      if (!lmbSwingDispatched) {
        lmbSwingDispatched = true;
        justPressed.add('Mouse0');
      }
      held.add('Mouse0');
    }
  };

  const onMouseDown = (event: MouseEvent) => {
    if (rebindCaptureMode) return;
    if (isUiTarget(event.target)) {
      return;
    }
    if (canvasContainer && event.target instanceof Node && !canvasContainer.contains(event.target)) {
      return;
    }
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerActive = true;
    if (event.button > 4) return;
    if (event.button === 0) {
      lmbRawDown = true;
      pressDownX = event.clientX;
      pressDownY = event.clientY;
      orbitDragged = false;
      if (keybinds.attack === 'Mouse0') {
        lmbAttackArmed = true;
        lmbSwingDispatched = false;
        lmbDownTimeMs = performance.now();
        return;
      }
    }
    if (event.button === 2) {
      rmbRawDown = true;
      pressDownX = event.clientX;
      pressDownY = event.clientY;
      orbitDragged = false;
    }
    const code = mouseButtonToCode(event.button);
    if (event.button === 2 || event.button === 1) {
      event.preventDefault();
    }
    if (!held.has(code)) {
      justPressed.add(code);
    }
    held.add(code);
  };

  const onMouseUp = (event: MouseEvent) => {
    if (event.button > 4) return;
    const code = mouseButtonToCode(event.button);
    if (event.button === 0) {
      const wasRawDown = lmbRawDown;
      lmbRawDown = false;
      if (!orbitDragged && wasRawDown) {
        pendingCanvasClick = { x: event.clientX, y: event.clientY };
      }
      if (keybinds.attack === 'Mouse0') {
        if (lmbAttackArmed && !orbitDragged && wasRawDown) {
          lmbAttackArmed = false;
          if (!lmbSwingDispatched) {
            lmbSwingDispatched = true;
            justPressed.add('Mouse0');
          }
        } else {
          lmbAttackArmed = false;
        }
      }
    }
    if (event.button === 2) {
      rmbRawDown = false;
    }
    if (held.has(code)) {
      held.delete(code);
      justReleased.add(code);
    }
    if (!lmbRawDown && !rmbRawDown) {
      orbitDragged = false;
      releasePointerLockSafe();
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    const prevX = pointerX;
    const prevY = pointerY;
    const wasActive = pointerActive;
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerActive = true;

    if (lmbRawDown || rmbRawDown) {
      const rawDx = event.movementX || (wasActive ? event.clientX - prevX : 0);
      const rawDy = event.movementY || (wasActive ? event.clientY - prevY : 0);
      const safeMove = Math.abs(rawDx) < 180 && Math.abs(rawDy) < 180;
      const dx = safeMove ? rawDx : 0;
      const dy = safeMove ? rawDy : 0;
      if (!orbitDragged) {
        const totalDx = event.clientX - pressDownX;
        const totalDy = event.clientY - pressDownY;
        const distSq = totalDx * totalDx + totalDy * totalDy;
        const moveSq = dx * dx + dy * dy;
        if (distSq > 25 || moveSq > 25) {
          orbitDragged = true;
          lmbAttackArmed = false;
          if (keybinds.attack === 'Mouse0') {
            held.delete('Mouse0');
            justPressed.delete('Mouse0');
          }
          // Preserve initial threshold movement so first frame of orbit has zero dead-zone hitch
          orbitDeltaX += event.movementX ? dx : totalDx;
          orbitDeltaY += event.movementY ? dy : totalDy;
          requestPointerLockSafe();
        }
      } else {
        orbitDeltaX += dx;
        orbitDeltaY += dy;
      }
    }
  };

  const onWheel = (event: WheelEvent) => {
    if (rebindCaptureMode) return;
    if (isUiTarget(event.target)) return;
    if (canvasContainer && event.target instanceof Node && !canvasContainer.contains(event.target)) {
      return;
    }
    wheelDelta += Math.max(-240, Math.min(240, event.deltaY));
  };

  const onContextMenu = (event: MouseEvent) => {
    if (isUiTarget(event.target)) {
      return;
    }
    event.preventDefault();
  };

  const clear = () => {
    held.clear();
    justPressed.clear();
    justReleased.clear();
    virtualJustPressed.clear();
    mouseJumpCompat = false;
    virtualMoveX = 0;
    virtualMoveZ = 0;
    orbitDeltaX = 0;
    orbitDeltaY = 0;
    wheelDelta = 0;
    orbitDragged = false;
    lmbRawDown = false;
    rmbRawDown = false;
    lmbAttackArmed = false;
    lmbSwingDispatched = false;
    pendingCanvasClick = null;
    releasePointerLockSafe();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') clear();
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', onVisibilityChange);

  const isActionHeldImpl = (action: KeybindAction): boolean => {
    if (action === 'attack') promoteArmedLmbHoldIfReady();
    return held.has(keybinds[action]);
  };

  const consumeActionJustPressedImpl = (action: KeybindAction): boolean => {
    if (action === 'attack') promoteArmedLmbHoldIfReady();
    if (virtualJustPressed.has(action)) {
      virtualJustPressed.delete(action);
      return true;
    }
    const code = keybinds[action];
    if (justPressed.has(code)) {
      justPressed.delete(code);
      return true;
    }
    return false;
  };

  const consumeActionReleasedImpl = (action: KeybindAction): boolean => {
    const code = keybinds[action];
    if (justReleased.has(code)) {
      justReleased.delete(code);
      return true;
    }
    return false;
  };

  return {
    setKeybinds(map: KeybindMap) {
      keybinds = { ...map };
    },
    getKeybinds() {
      return { ...keybinds };
    },
    setRebindCaptureMode(active: boolean) {
      rebindCaptureMode = active;
      if (active) clear();
    },
    isHeld(code: string) {
      return held.has(code);
    },
    consumeJustPressed(code: string) {
      if (!justPressed.has(code)) return false;
      justPressed.delete(code);
      return true;
    },
    isActionHeld: isActionHeldImpl,
    consumeActionJustPressed: consumeActionJustPressedImpl,
    consumeActionReleased: consumeActionReleasedImpl,
    consumeMouseAttack() {
      return consumeActionJustPressedImpl('attack');
    },
    isAttackHeld() {
      return isActionHeldImpl('attack');
    },
    consumeAttackReleased() {
      return consumeActionReleasedImpl('attack');
    },
    consumeMouseJump() {
      const v = mouseJumpCompat;
      mouseJumpCompat = false;
      return v;
    },
    getPointerPos() {
      return { x: pointerX, y: pointerY, active: pointerActive };
    },
    consumeOrbitDelta() {
      const res: OrbitDeltaState = {
        dx: orbitDeltaX,
        dy: orbitDeltaY,
        dragging: orbitDragged,
        lmb: lmbRawDown,
        rmb: rmbRawDown,
      };
      orbitDeltaX = 0;
      orbitDeltaY = 0;
      return res;
    },
    consumeWheelDelta() {
      const w = wheelDelta;
      wheelDelta = 0;
      return w;
    },
    consumeCanvasClick() {
      const c = pendingCanvasClick;
      pendingCanvasClick = null;
      return c;
    },
    setPointerLockAllowed(allowed: boolean) {
      pointerLockAllowed = allowed;
      if (!allowed) releasePointerLockSafe();
    },
    isOrbitDragging() {
      return orbitDragged;
    },
    getMoveAxis(out: InputAxis) {
      let x = virtualMoveX + gpMoveX;
      let z = virtualMoveZ + gpMoveZ;
      if (held.has(keybinds.moveLeft) || held.has('ArrowLeft')) x -= 1;
      if (held.has(keybinds.moveRight) || held.has('ArrowRight')) x += 1;
      if (held.has(keybinds.moveUp) || held.has('ArrowUp')) z -= 1;
      if (held.has(keybinds.moveDown) || held.has('ArrowDown')) z += 1;
      const lenSq = x * x + z * z;
      if (lenSq > 1) {
        const inv = 1 / Math.sqrt(lenSq);
        x *= inv;
        z *= inv;
      }
      out.x = x;
      out.z = z;
      return out;
    },
    setVirtualMove(x: number, z: number) {
      virtualMoveX = x;
      virtualMoveZ = z;
    },
    triggerVirtualAction(action: VirtualAction) {
      if (action === 'special') {
        virtualJustPressed.add('ability1');
        return;
      }
      virtualJustPressed.add(action);
    },
    pollGamepad() {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      let pad: Gamepad | null = null;
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i]!.connected) {
          pad = pads[i];
          break;
        }
      }
      if (!pad) {
        gpConnected = false;
        gpMoveX = 0;
        gpMoveZ = 0;
        prevGpButtons.clear();
        return;
      }
      gpConnected = true;
      const ax = Math.abs(pad.axes[0] ?? 0) > 0.18 ? pad.axes[0] : 0;
      const az = Math.abs(pad.axes[1] ?? 0) > 0.18 ? pad.axes[1] : 0;
      let dx = ax;
      let dz = az;
      if (pad.buttons[12]?.pressed) dz -= 1; // D-pad Up
      if (pad.buttons[13]?.pressed) dz += 1; // D-pad Down
      if (pad.buttons[14]?.pressed) dx -= 1; // D-pad Left
      if (pad.buttons[15]?.pressed) dx += 1; // D-pad Right
      gpMoveX = Math.max(-1, Math.min(1, dx));
      gpMoveZ = Math.max(-1, Math.min(1, dz));

      const edgePressed = (btnIdx: number): boolean => {
        const down = Boolean(pad!.buttons[btnIdx]?.pressed);
        const was = prevGpButtons.has(btnIdx);
        if (down) prevGpButtons.add(btnIdx);
        else prevGpButtons.delete(btnIdx);
        return down && !was;
      };

      if (edgePressed(0) || edgePressed(7)) virtualJustPressed.add('attack'); // A / RT
      if (edgePressed(1)) virtualJustPressed.add('dodge'); // B -> Dodge
      if (edgePressed(5)) virtualJustPressed.add('jump'); // RB -> Jump
      if (edgePressed(6)) virtualJustPressed.add('block'); // LT -> Block
      if (edgePressed(2) || edgePressed(4)) virtualJustPressed.add('ability1'); // X / LB -> Ability 1
      if (edgePressed(3)) virtualJustPressed.add('interact'); // Y
      if (edgePressed(8)) virtualJustPressed.add('bag'); // Back / Select -> Bag
      if (edgePressed(9)) justPressed.add('Escape'); // Start -> Pause
    },
    isGamepadConnected() {
      return gpConnected;
    },
    clear,
    endFrame() {
      justPressed.clear();
      justReleased.clear();
      virtualJustPressed.clear();
      mouseJumpCompat = false;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
