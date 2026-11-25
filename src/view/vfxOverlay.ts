import * as THREE from 'three';
import { GraphicsLevel } from '../core/settings';

export interface GlowSpriteSpec {
  x: number;
  y: number;
  z: number;
  color: 'amber' | 'teal' | 'crimson' | 'violet' | 'white';
  radiusPx: number;
  alpha: number;
}

export interface BossTelegraphSpec {
  x: number;
  y: number;
  z: number;
  facing: number;
  range: number;
  progress: number;
}

export interface NpcHintSpec {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
}

export interface AimArcSpec {
  startX: number;
  startY: number;
  startZ: number;
  dirX: number;
  dirZ: number;
  range: number;
  color: string;
  specialReady: boolean;
}

interface TrailNode {
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GhostNode {
  active: boolean;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  color: string;
}

interface LightningNode {
  active: boolean;
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  life: number;
  maxLife: number;
  seed: number;
}

interface SparkNode {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  length: number;
}

interface ShockwaveNode {
  active: boolean;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  color: string;
}

interface SlashStarNode {
  active: boolean;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  color: string;
}

interface FloatingPopup {
  active: boolean;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  crit: boolean;
  life: number;
  maxLife: number;
}

interface AmbientMote {
  nx: number;
  ny: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  kind: 'amber' | 'teal';
}

const _projVec = new THREE.Vector3();
const _projA = { sx: 0, sy: 0, visible: false };
const _projB = { sx: 0, sy: 0, visible: false };

function createCachedGlowSprite(inner: string, mid: string): HTMLCanvasElement {
  const size = 96;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.38, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function computeSafeDpr(w: number, h: number, level: GraphicsLevel): number {
  const raw =
    level === GraphicsLevel.Low
      ? 1
      : Math.min(
          window.devicePixelRatio || 1,
          level === GraphicsLevel.Ultra ? 1.5 : level === GraphicsLevel.High ? 1.25 : 1.1,
        );
  const maxDim = Math.max(w, h);
  if (maxDim * raw > 2560) {
    return Math.max(0.75, 2560 / Math.max(1, maxDim));
  }
  return raw;
}

export interface VfxOverlayHandle {
  setGraphicsLevel: (level: GraphicsLevel) => void;
  resize: (w: number, h: number) => void;
  spawnTrailPoint: (
    x: number,
    y: number,
    z: number,
    color: string,
    size?: number,
    maxLife?: number,
  ) => void;
  spawnGhostAfterimage: (x: number, y: number, z: number, color?: string) => void;
  spawnLightningArc: (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
  ) => void;
  spawnSparks: (
    x: number,
    y: number,
    z: number,
    count: number,
    speed: number,
    color: string,
  ) => void;
  spawnShockwave: (
    x: number,
    y: number,
    z: number,
    maxRadius: number,
    color: string,
    maxLife?: number,
  ) => void;
  spawnSlashStar: (
    x: number,
    y: number,
    z: number,
    color: string,
    heavy?: boolean,
  ) => void;
  spawnPopup: (
    x: number,
    y: number,
    z: number,
    text: string,
    color: string,
    crit?: boolean,
  ) => void;
  triggerHitFlash: (color: string, alpha: number) => void;
  renderFrame: (
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    zone: 'courtyard' | 'dungeon',
    hpRatio: number,
    marauderActive: boolean,
    glows: GlowSpriteSpec[],
    options?: {
      weatherStorm?: boolean;
      bossWindup?: BossTelegraphSpec | null;
      npcHints?: NpcHintSpec[];
      aimArc?: AimArcSpec | null;
      skipBaseVignette?: boolean;
      marauderWarning?: boolean;
    },
  ) => void;
  dispose: () => void;
}

export function createVfxOverlay(container: HTMLElement): VfxOverlayHandle {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '5';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  let currentGraphicsLevel: GraphicsLevel = GraphicsLevel.Ultra;
  let width = Math.max(2, container.clientWidth || window.innerWidth || 1280);
  let height = Math.max(2, container.clientHeight || window.innerHeight || 720);
  let dpr = computeSafeDpr(width, height, currentGraphicsLevel);
  canvas.width = Math.max(2, Math.round(width * dpr));
  canvas.height = Math.max(2, Math.round(height * dpr));

  const glowSprites = {
    amber: createCachedGlowSprite('rgba(255, 224, 150, 0.92)', 'rgba(244, 162, 66, 0.36)'),
    teal: createCachedGlowSprite('rgba(180, 255, 248, 0.9)', 'rgba(56, 232, 216, 0.34)'),
    crimson: createCachedGlowSprite('rgba(255, 165, 185, 0.9)', 'rgba(255, 59, 92, 0.38)'),
    violet: createCachedGlowSprite('rgba(232, 195, 255, 0.88)', 'rgba(168, 85, 247, 0.34)'),
    white: createCachedGlowSprite('rgba(255, 250, 236, 0.95)', 'rgba(244, 185, 66, 0.32)'),
  };

  const vignetteCanvas = document.createElement('canvas');
  const dangerVignetteCanvas = document.createElement('canvas');
  const npcHintWidths = new Map<string, number>();
  const rebuildVignette = () => {
    const vw = Math.max(2, Math.round(width));
    const vh = Math.max(2, Math.round(height));
    vignetteCanvas.width = vw;
    vignetteCanvas.height = vh;
    const vctx = vignetteCanvas.getContext('2d');
    if (vctx) {
      const cx = vw * 0.5;
      const cy = vh * 0.5;
      const rOuter = Math.max(2, Math.hypot(cx, cy));
      const vg = vctx.createRadialGradient(cx, cy, rOuter * 0.4, cx, cy, rOuter);
      vg.addColorStop(0, 'rgba(6, 9, 20, 0)');
      vg.addColorStop(0.68, 'rgba(7, 10, 22, 0.16)');
      vg.addColorStop(1, 'rgba(4, 6, 15, 0.68)');
      vctx.fillStyle = vg;
      vctx.fillRect(0, 0, vw, vh);
    }

    dangerVignetteCanvas.width = vw;
    dangerVignetteCanvas.height = vh;
    const dctx = dangerVignetteCanvas.getContext('2d');
    if (dctx) {
      const cx = vw * 0.5;
      const cy = vh * 0.5;
      const rOut = Math.max(2, Math.hypot(cx, cy));
      const rg = dctx.createRadialGradient(cx, cy, rOut * 0.55, cx, cy, rOut);
      rg.addColorStop(0, 'rgba(230, 57, 70, 0)');
      rg.addColorStop(1, 'rgba(230, 57, 70, 1)');
      dctx.fillStyle = rg;
      dctx.fillRect(0, 0, vw, vh);
    }
  };
  rebuildVignette();

  const TRAIL_POOL = 56;
  const trails: TrailNode[] = Array.from({ length: TRAIL_POOL }, () => ({
    x: 0,
    y: 0,
    z: 0,
    life: 0,
    maxLife: 0.25,
    color: '#38E8D8',
    size: 16,
  }));
  let trailCursor = 0;

  const GHOST_POOL = 18;
  const ghosts: GhostNode[] = Array.from({ length: GHOST_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    life: 0,
    maxLife: 0.28,
    color: '#38E8D8',
  }));
  let ghostCursor = 0;

  const LIGHTNING_POOL = 10;
  const lightnings: LightningNode[] = Array.from({ length: LIGHTNING_POOL }, () => ({
    active: false,
    x1: 0,
    y1: 0,
    z1: 0,
    x2: 0,
    y2: 0,
    z2: 0,
    life: 0,
    maxLife: 0.22,
    seed: 1,
  }));
  let lightningCursor = 0;

  const SPARK_POOL = 64;
  const sparks: SparkNode[] = Array.from({ length: SPARK_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.3,
    color: '#F4B942',
    length: 14,
  }));
  let sparkCursor = 0;

  const SHOCK_POOL = 12;
  const shockwaves: ShockwaveNode[] = Array.from({ length: SHOCK_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    life: 0,
    maxLife: 0.35,
    maxRadius: 90,
    color: '#F4B942',
  }));
  let shockCursor = 0;

  const STAR_POOL = 24;
  const slashStars: SlashStarNode[] = Array.from({ length: STAR_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    life: 0,
    maxLife: 0.22,
    size: 36,
    angle: 0.4,
    color: '#F4B942',
  }));
  let starCursor = 0;

  const POPUP_POOL = 20;
  const popups: FloatingPopup[] = Array.from({ length: POPUP_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    text: '',
    color: '#FFF4DC',
    crit: false,
    life: 0,
    maxLife: 0.8,
  }));
  let popupCursor = 0;

  const motes: AmbientMote[] = Array.from({ length: 28 }, (_, i) => ({
    nx: ((i * 73) % 100) / 100,
    ny: ((i * 41) % 100) / 100,
    vx: (((i % 5) - 2) * 0.008) || 0.004,
    vy: -0.015 - (i % 4) * 0.006,
    size: 10 + (i % 4) * 5,
    phase: i * 0.9,
    kind: i % 3 === 0 ? 'teal' : 'amber',
  }));

  let flashAlpha = 0;
  let flashColor = '#FFF4DC';

  const projectToScreen = (
    x: number,
    y: number,
    z: number,
    camera: THREE.PerspectiveCamera,
    out: { sx: number; sy: number; visible: boolean } = _projA,
  ): { sx: number; sy: number; visible: boolean } => {
    _projVec.set(x, y, z).project(camera);
    if (_projVec.z < -1 || _projVec.z > 1) {
      out.visible = false;
      return out;
    }
    out.sx = (_projVec.x * 0.5 + 0.5) * width;
    out.sy = (-_projVec.y * 0.5 + 0.5) * height;
    out.visible = true;
    return out;
  };

  // --- Heavy Graphics Routines (only called when currentGraphicsLevel >= GraphicsLevel.High) ---

  const drawBloomAndGlare = (camera: THREE.PerspectiveCamera, glows: GlowSpriteSpec[]) => {
    for (let i = 0; i < glows.length; i++) {
      const g = glows[i];
      const pt = projectToScreen(g.x, g.y, g.z, camera);
      if (!pt.visible) continue;
      if (
        pt.sx < -g.radiusPx ||
        pt.sx > width + g.radiusPx ||
        pt.sy < -g.radiusPx ||
        pt.sy > height + g.radiusPx
      ) {
        continue;
      }
      ctx.globalAlpha = currentGraphicsLevel >= GraphicsLevel.Ultra ? g.alpha : g.alpha * 0.72;
      const spr = glowSprites[g.color] ?? glowSprites.teal;
      const r = Math.max(1, g.radiusPx);
      ctx.drawImage(spr, pt.sx - r, pt.sy - r, r * 2, r * 2);
    }
  };

  const drawAmbientMotes = (
    dt: number,
    elapsed: number,
    zone: 'courtyard' | 'dungeon',
    storm: boolean,
  ) => {
    const windMult = storm ? 2.8 : 1.0;
    const count = currentGraphicsLevel >= GraphicsLevel.Ultra ? motes.length : Math.floor(motes.length * 0.45);
    for (let i = 0; i < count; i++) {
      const m = motes[i];
      m.nx = (m.nx + (m.vx + (storm ? 0.035 : 0)) * windMult * dt + 1) % 1;
      m.ny = (m.ny + (storm ? 0.045 : m.vy) * windMult * dt + 1) % 1;
      const mx = m.nx * width + Math.sin(elapsed * 1.4 + m.phase) * 18;
      const my = m.ny * height + Math.cos(elapsed * 1.1 + m.phase) * 6;
      const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 3.1 + m.phase * 1.7);
      const pulse = 0.1 + twinkle * 0.24;
      ctx.globalAlpha = Math.max(0.04, pulse * (storm ? 1.4 : 1));
      const spr =
        zone === 'dungeon' || storm
          ? m.kind === 'teal'
            ? glowSprites.teal
            : glowSprites.violet
          : glowSprites[m.kind];
      ctx.drawImage(spr, mx - m.size, my - m.size, m.size * 2, m.size * 2);
      if (!storm && twinkle > 0.65 && currentGraphicsLevel >= GraphicsLevel.Ultra) {
        ctx.globalAlpha = (twinkle - 0.5) * 1.1;
        ctx.fillStyle = m.kind === 'teal' ? '#A3FFF6' : '#FFF4DC';
        ctx.beginPath();
        ctx.arc(mx, my, 1.5 + (i % 2) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawGhostAfterimages = (dt: number, camera: THREE.PerspectiveCamera) => {
    for (let i = 0; i < GHOST_POOL; i++) {
      const gh = ghosts[i];
      if (!gh.active) continue;
      gh.life -= dt;
      if (gh.life <= 0) {
        gh.active = false;
        continue;
      }
      const t = gh.life / gh.maxLife;
      const pt = projectToScreen(gh.x, gh.y + 0.65, gh.z, camera);
      if (!pt.visible) continue;
      ctx.globalAlpha = t * 0.5;
      ctx.fillStyle = gh.color;
      ctx.beginPath();
      ctx.moveTo(pt.sx, pt.sy - 24 * (0.7 + 0.3 * t));
      ctx.lineTo(pt.sx + 13 * t, pt.sy);
      ctx.lineTo(pt.sx, pt.sy + 18 * (0.7 + 0.3 * t));
      ctx.lineTo(pt.sx - 13 * t, pt.sy);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawTrails = (dt: number, camera: THREE.PerspectiveCamera) => {
    for (let i = 0; i < TRAIL_POOL; i++) {
      const tr = trails[i];
      if (tr.life <= 0) continue;
      tr.life -= dt;
      const t = Math.max(0, tr.life / tr.maxLife);
      const pt = projectToScreen(tr.x, tr.y, tr.z, camera);
      if (!pt.visible) continue;
      ctx.globalAlpha = t * 0.55;
      const r = tr.size * (0.45 + 0.55 * t);
      const spr =
        tr.color === '#FF3B5C' || tr.color === '#E63946'
          ? glowSprites.crimson
          : tr.color === '#F4B942'
            ? glowSprites.amber
            : glowSprites.teal;
      ctx.drawImage(spr, pt.sx - r, pt.sy - r, r * 2, r * 2);
    }
  };

  const drawAimArc = (
    aimArc: AimArcSpec,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
  ) => {
    const segs = currentGraphicsLevel >= GraphicsLevel.Ultra ? 8 : 5;
    const tx = aimArc.startX + aimArc.dirX * aimArc.range;
    const tz = aimArc.startZ + aimArc.dirZ * aimArc.range;
    const startPt = projectToScreen(aimArc.startX, aimArc.startY, aimArc.startZ, camera, _projA);
    const endPt = projectToScreen(tx, 0.14, tz, camera, _projB);
    if (!startPt.visible || !endPt.visible) return;

    ctx.globalAlpha = currentGraphicsLevel >= GraphicsLevel.Ultra ? 0.55 : 0.38;
    ctx.strokeStyle = aimArc.specialReady ? '#F4B942' : aimArc.color;
    ctx.lineWidth = currentGraphicsLevel >= GraphicsLevel.Ultra ? 2.6 : 1.8;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(startPt.sx, startPt.sy);
    for (let s = 1; s <= segs; s++) {
      const f = s / segs;
      const wx = aimArc.startX + (tx - aimArc.startX) * f;
      const wz = aimArc.startZ + (tz - aimArc.startZ) * f;
      const arcLift = Math.sin(f * Math.PI) * 0.42;
      const wy = aimArc.startY * (1 - f) + 0.14 * f + arcLift;
      const p = projectToScreen(wx, wy, wz, camera);
      if (p.visible) ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Reticle ring at aim tip
    const pulse = Math.max(0.5, 1 + Math.sin(elapsed * 6) * 0.12);
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(endPt.sx, endPt.sy, 11 * pulse, 6.5 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (currentGraphicsLevel >= GraphicsLevel.Ultra) {
      ctx.globalAlpha = 0.42;
      const spr = aimArc.specialReady ? glowSprites.amber : glowSprites.teal;
      ctx.drawImage(spr, endPt.sx - 20, endPt.sy - 20, 40, 40);
    }
  };

  const drawLightningArcs = (
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
  ) => {
    ctx.lineCap = 'round';
    for (let i = 0; i < LIGHTNING_POOL; i++) {
      const ln = lightnings[i];
      if (!ln.active) continue;
      ln.life -= dt;
      if (ln.life <= 0) {
        ln.active = false;
        continue;
      }
      const a = projectToScreen(ln.x1, ln.y1, ln.z1, camera, _projA);
      const b = projectToScreen(ln.x2, ln.y2, ln.z2, camera, _projB);
      if (!a.visible || !b.visible) continue;
      const alpha = ln.life / ln.maxLife;
      ctx.globalAlpha = alpha * 0.95;
      ctx.strokeStyle = '#38E8D8';
      ctx.lineWidth = 4.2 * alpha + 1;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      const segs = 5;
      for (let s = 1; s < segs; s++) {
        const f = s / segs;
        const jitter = Math.sin(ln.seed * 0.1 + s * 3.7 + elapsed * 35) * 16;
        ctx.lineTo(
          a.sx + (b.sx - a.sx) * f + jitter,
          a.sy + (b.sy - a.sy) * f - Math.abs(jitter) * 0.4,
        );
      }
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  };

  const drawShockwaves = (dt: number, camera: THREE.PerspectiveCamera) => {
    for (let i = 0; i < SHOCK_POOL; i++) {
      const sw = shockwaves[i];
      if (!sw.active) continue;
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.active = false;
        continue;
      }
      const prog = Math.max(0.01, Math.min(1, 1 - sw.life / Math.max(0.01, sw.maxLife)));
      const pt = projectToScreen(sw.x, sw.y, sw.z, camera);
      if (!pt.visible) continue;
      const rx = Math.max(0.5, sw.maxRadius * prog);
      const ry = Math.max(0.5, rx * 0.58);
      ctx.globalAlpha = Math.max(0, (1 - prog) * 0.78);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1.5, 5 * (1 - prog));
      ctx.beginPath();
      ctx.ellipse(pt.sx, pt.sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawSlashStars = (dt: number, camera: THREE.PerspectiveCamera) => {
    for (let i = 0; i < STAR_POOL; i++) {
      const st = slashStars[i];
      if (!st.active) continue;
      st.life -= dt;
      if (st.life <= 0) {
        st.active = false;
        continue;
      }
      const prog = Math.max(0, Math.min(1, 1 - st.life / Math.max(0.01, st.maxLife)));
      const alpha = 1 - prog;
      const pt = projectToScreen(st.x, st.y, st.z, camera);
      if (!pt.visible) continue;
      const len = st.size * (0.65 + prog * 0.75);
      const thick = Math.max(1.2, (1 - prog) * 5.2);

      ctx.save();
      ctx.translate(pt.sx, pt.sy);
      ctx.rotate(st.angle);
      ctx.globalAlpha = alpha * 0.95;

      // Primary diagonal slash streak + orthogonal cross-cut
      for (let arm = 0; arm < 2; arm++) {
        ctx.save();
        ctx.rotate(arm === 0 ? 0 : Math.PI * 0.48);
        const armLen = arm === 0 ? len * 1.25 : len * 0.85;
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.moveTo(-armLen, 0);
        ctx.lineTo(0, -thick);
        ctx.lineTo(armLen, 0);
        ctx.lineTo(0, thick);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFF9E8';
        ctx.beginPath();
        ctx.moveTo(-armLen * 0.7, 0);
        ctx.lineTo(0, -thick * 0.48);
        ctx.lineTo(armLen * 0.7, 0);
        ctx.lineTo(0, thick * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  };

  const drawSparks = (dt: number, camera: THREE.PerspectiveCamera) => {
    for (let i = 0; i < SPARK_POOL; i++) {
      const sp = sparks[i];
      if (!sp.active) continue;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.active = false;
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      sp.vy -= 8.5 * dt;
      const ptA = projectToScreen(sp.x, Math.max(0.05, sp.y), sp.z, camera, _projA);
      if (!ptA.visible) continue;
      const tailX = sp.x - sp.vx * 0.045;
      const tailY = Math.max(0.05, sp.y - sp.vy * 0.045);
      const tailZ = sp.z - sp.vz * 0.045;
      const ptB = projectToScreen(tailX, tailY, tailZ, camera, _projB);
      const alpha = Math.max(0, sp.life / sp.maxLife);
      ctx.globalAlpha = alpha * 0.92;
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2.4 * alpha + 0.8;
      ctx.beginPath();
      ctx.moveTo(ptA.sx, ptA.sy);
      ctx.lineTo(ptB.visible ? ptB.sx : ptA.sx, ptB.visible ? ptB.sy : ptA.sy);
      ctx.stroke();
    }
  };

  const drawPostVignetteAndFlash = (
    dt: number,
    elapsed: number,
    hpRatio: number,
    marauderActive: boolean,
    bossWindup: BossTelegraphSpec | null,
    skipBaseVignette: boolean,
    marauderWarning: boolean,
  ) => {
    if (width < 2 || height < 2) return;
    if (!skipBaseVignette) {
      ctx.drawImage(vignetteCanvas, 0, 0, width, height);
    }

    if (marauderActive || marauderWarning || hpRatio <= 0.35 || bossWindup) {
      const pulse = Math.max(
        0,
        Math.min(
          0.85,
          bossWindup
            ? 0.22 + bossWindup.progress * 0.14
            : marauderWarning && !marauderActive
              ? 0.16 + Math.abs(Math.sin(elapsed * 7.5)) * 0.14
              : 0.14 + Math.sin(elapsed * 5.2) * 0.07,
        ),
      );
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.drawImage(dangerVignetteCanvas, 0, 0, width, height);
      ctx.restore();
    }

    if (flashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, flashAlpha));
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      flashAlpha = Math.max(0, flashAlpha - dt * 2.8);
    }
  };

  const clearTransientPools = () => {
    for (let i = 0; i < TRAIL_POOL; i++) trails[i].life = 0;
    for (let i = 0; i < GHOST_POOL; i++) ghosts[i].active = false;
    for (let i = 0; i < LIGHTNING_POOL; i++) lightnings[i].active = false;
    for (let i = 0; i < SPARK_POOL; i++) sparks[i].active = false;
    for (let i = 0; i < SHOCK_POOL; i++) shockwaves[i].active = false;
    for (let i = 0; i < STAR_POOL; i++) slashStars[i].active = false;
    flashAlpha = 0;
  };

  return {
    setGraphicsLevel(level: GraphicsLevel) {
      currentGraphicsLevel = level;
      if (level < GraphicsLevel.High) {
        clearTransientPools();
      } else if (level < GraphicsLevel.Ultra) {
        for (let i = 0; i < GHOST_POOL; i++) ghosts[i].active = false;
      }
      dpr = computeSafeDpr(width, height, level);
      canvas.width = Math.max(2, Math.round(width * dpr));
      canvas.height = Math.max(2, Math.round(height * dpr));
    },
    resize(w: number, h: number) {
      width = Math.max(2, w);
      height = Math.max(2, h);
      dpr = computeSafeDpr(width, height, currentGraphicsLevel);
      canvas.width = Math.max(2, Math.round(width * dpr));
      canvas.height = Math.max(2, Math.round(height * dpr));
      rebuildVignette();
    },
    spawnTrailPoint(x, y, z, color, size = 18, maxLife = 0.24) {
      if (currentGraphicsLevel < GraphicsLevel.High) return;
      const tr = trails[trailCursor];
      trailCursor = (trailCursor + 1) % TRAIL_POOL;
      tr.x = x;
      tr.y = y;
      tr.z = z;
      tr.color = color;
      tr.size = size;
      tr.maxLife = maxLife;
      tr.life = maxLife;
    },
    spawnGhostAfterimage(x, y, z, color = '#38E8D8') {
      if (currentGraphicsLevel < GraphicsLevel.Ultra) return;
      const gh = ghosts[ghostCursor];
      ghostCursor = (ghostCursor + 1) % GHOST_POOL;
      gh.active = true;
      gh.x = x;
      gh.y = y;
      gh.z = z;
      gh.maxLife = 0.26;
      gh.life = 0.26;
      gh.color = color;
    },
    spawnLightningArc(x1, y1, z1, x2, y2, z2) {
      if (currentGraphicsLevel < GraphicsLevel.High) return;
      const ln = lightnings[lightningCursor];
      lightningCursor = (lightningCursor + 1) % LIGHTNING_POOL;
      ln.active = true;
      ln.x1 = x1;
      ln.y1 = y1;
      ln.z1 = z1;
      ln.x2 = x2;
      ln.y2 = y2;
      ln.z2 = z2;
      ln.maxLife = 0.24;
      ln.life = 0.24;
      ln.seed = (ln.seed * 1664525 + 1013904223) >>> 0;
    },
    spawnSparks(x, y, z, count, speed, color) {
      if (currentGraphicsLevel < GraphicsLevel.High) return;
      const actualCount =
        currentGraphicsLevel >= GraphicsLevel.Ultra
          ? count
          : Math.max(1, Math.round(count * 0.45));
      for (let i = 0; i < actualCount; i++) {
        const sp = sparks[sparkCursor];
        sparkCursor = (sparkCursor + 1) % SPARK_POOL;
        const ang = (i / Math.max(1, actualCount)) * Math.PI * 2 + i * 1.13;
        const spd = speed * (0.55 + (i % 3) * 0.28);
        sp.active = true;
        sp.x = x;
        sp.y = y;
        sp.z = z;
        sp.vx = Math.cos(ang) * spd;
        sp.vy = 1.6 + (i % 4) * 0.9;
        sp.vz = Math.sin(ang) * spd;
        sp.maxLife = 0.24 + (i % 3) * 0.09;
        sp.life = sp.maxLife;
        sp.color = color;
        sp.length = 12 + (i % 3) * 5;
      }
    },
    spawnShockwave(x, y, z, maxRadius, color, maxLife = 0.34) {
      if (currentGraphicsLevel < GraphicsLevel.High) return;
      const sw = shockwaves[shockCursor];
      shockCursor = (shockCursor + 1) % SHOCK_POOL;
      sw.active = true;
      sw.x = x;
      sw.y = y;
      sw.z = z;
      sw.maxRadius = maxRadius;
      sw.color = color;
      sw.maxLife = maxLife;
      sw.life = maxLife;
    },
    spawnSlashStar(x, y, z, color, heavy = false) {
      if (currentGraphicsLevel < GraphicsLevel.High) return;
      const st = slashStars[starCursor];
      starCursor = (starCursor + 1) % STAR_POOL;
      st.active = true;
      st.x = x;
      st.y = y;
      st.z = z;
      st.maxLife = heavy ? 0.28 : 0.19;
      st.life = st.maxLife;
      st.size = heavy ? 54 : 34;
      st.angle = ((starCursor * 0.71) % Math.PI) - Math.PI * 0.5;
      st.color = color;
    },
    spawnPopup(x, y, z, text, color, crit = false) {
      const p = popups[popupCursor];
      popupCursor = (popupCursor + 1) % POPUP_POOL;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.text = text;
      p.color = color;
      p.crit = crit;
      p.maxLife = crit ? 0.95 : 0.72;
      p.life = p.maxLife;
    },
    triggerHitFlash(color, alpha) {
      if (currentGraphicsLevel < GraphicsLevel.High) return;
      flashColor = color;
      flashAlpha = Math.max(flashAlpha, Math.min(0.45, alpha));
    },
    renderFrame(dt, elapsed, camera, zone, hpRatio, marauderActive, glows, options) {
      if (width < 2 || height < 2 || !Number.isFinite(dt)) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const storm = Boolean(options?.weatherStorm);
      const bossWindup = options?.bossWindup ?? null;
      const npcHints = options?.npcHints;
      const aimArc = options?.aimArc ?? null;

      // 1. Heavy Effects Pass (Bloom, Glare, Sparks, Arcs, Trails, Shockwaves) — ONLY at High+
      if (currentGraphicsLevel >= GraphicsLevel.High) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        drawBloomAndGlare(camera, glows);
        drawAmbientMotes(dt, elapsed, zone, storm);
        if (currentGraphicsLevel >= GraphicsLevel.Ultra) {
          drawGhostAfterimages(dt, camera);
        }
        drawTrails(dt, camera);
        if (aimArc) {
          drawAimArc(aimArc, elapsed, camera);
        }
        drawLightningArcs(dt, elapsed, camera);
        drawShockwaves(dt, camera);
        drawSlashStars(dt, camera);
        drawSparks(dt, camera);

        ctx.restore();
      }

      // Boss Windup Lunge Line (essential gameplay readability across all tiers; wisps only on High+)
      if (bossWindup) {
        const startPt = projectToScreen(bossWindup.x, bossWindup.y + 0.25, bossWindup.z, camera, _projA);
        const ex = bossWindup.x + Math.sin(bossWindup.facing) * bossWindup.range * 1.45;
        const ez = bossWindup.z + Math.cos(bossWindup.facing) * bossWindup.range * 1.45;
        const endPt = projectToScreen(ex, bossWindup.y + 0.25, ez, camera, _projB);
        if (startPt.visible && endPt.visible) {
          ctx.save();
          ctx.globalAlpha = 0.55 + bossWindup.progress * 0.35;
          ctx.strokeStyle = '#FF3B5C';
          ctx.lineWidth = 3 + bossWindup.progress * 5;
          ctx.setLineDash([12, 8]);
          ctx.beginPath();
          ctx.moveTo(startPt.sx, startPt.sy);
          ctx.lineTo(endPt.sx, endPt.sy);
          ctx.stroke();
          ctx.setLineDash([]);

          if (currentGraphicsLevel >= GraphicsLevel.High) {
            ctx.globalCompositeOperation = 'lighter';
            for (let k = 0; k < 6; k++) {
              const ang = (k / 6) * Math.PI * 2 + elapsed * 4.2;
              const pull = (1 - bossWindup.progress) * 2.4;
              const wp = projectToScreen(
                bossWindup.x + Math.cos(ang) * pull,
                0.7,
                bossWindup.z + Math.sin(ang) * pull,
                camera,
              );
              if (wp.visible) {
                ctx.globalAlpha = 0.7;
                ctx.drawImage(glowSprites.crimson, wp.sx - 18, wp.sy - 18, 36, 36);
              }
            }
          }
          ctx.restore();
        }
      }

      // 2. Post-Processing Vignette + Complex Edge Gradient + Flash — ONLY at High+
      if (currentGraphicsLevel >= GraphicsLevel.High) {
        drawPostVignetteAndFlash(
          dt,
          elapsed,
          hpRatio,
          marauderActive,
          bossWindup,
          Boolean(options?.skipBaseVignette),
          Boolean(options?.marauderWarning),
        );
      }

      // 3. Courtyard NPC Thought Hint Bubbles (essential gameplay signifiers)
      if (npcHints && npcHints.length > 0) {
        ctx.save();
        ctx.font = `700 11px 'Plus Jakarta Sans', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const h of npcHints) {
          const bob = currentGraphicsLevel >= GraphicsLevel.Medium ? Math.sin(elapsed * 2.4 + h.x) * 0.06 : 0;
          const pt = projectToScreen(h.x, h.y + bob, h.z, camera);
          if (!pt.visible || pt.sy < 88 || pt.sy > height - 110) continue;
          let tw = npcHintWidths.get(h.text);
          if (tw === undefined) {
            tw = ctx.measureText(h.text).width + 14;
            if (npcHintWidths.size > 48) npcHintWidths.clear();
            npcHintWidths.set(h.text, tw);
          }
          const bx = pt.sx - tw * 0.5;
          const by = pt.sy - 11;
          ctx.fillStyle = currentGraphicsLevel === GraphicsLevel.Low ? '#0B1022' : 'rgba(10, 15, 34, 0.78)';
          ctx.strokeStyle = h.color;
          ctx.lineWidth = 1.2;
          if (currentGraphicsLevel === GraphicsLevel.Low) {
            ctx.fillRect(bx, by, tw, 22);
            ctx.strokeRect(bx, by, tw, 22);
          } else {
            ctx.beginPath();
            traceRoundedRect(ctx, bx, by, tw, 22, 6);
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = '#FFF4DC';
          ctx.fillText(h.text, pt.sx, pt.sy);
        }
        ctx.restore();
      }

      // 4. Floating Combat Text (essential gameplay numbers)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < POPUP_POOL; i++) {
        const p = popups[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const prog = 1 - p.life / p.maxLife;
        const floatY = p.y + prog * 1.15;
        const pt = projectToScreen(p.x, floatY, p.z, camera);
        if (!pt.visible) continue;

        if (currentGraphicsLevel === GraphicsLevel.Low) {
          ctx.font = `700 ${p.crit ? 18 : 15}px sans-serif`;
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, pt.sx, pt.sy);
        } else {
          const popScale = prog < 0.16 ? 0.75 + (prog / 0.16) * 0.52 : 1.27 - (prog - 0.16) * 0.3;
          const alpha = prog > 0.65 ? Math.max(0, (1 - prog) / 0.35) : 1;
          const fontPx = Math.round((p.crit ? 22 : 17) * popScale);
          ctx.globalAlpha = alpha;
          ctx.font = `800 ${fontPx}px 'Plus Jakarta Sans', system-ui, sans-serif`;
          ctx.lineWidth = 4.5;
          ctx.strokeStyle = '#090D1A';
          ctx.strokeText(p.text, pt.sx, pt.sy);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, pt.sx, pt.sy);
        }
      }
      ctx.restore();
    },
    dispose() {
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
