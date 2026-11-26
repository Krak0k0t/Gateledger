import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export interface PbrLibrary {
  courtyardFloorMat: THREE.MeshStandardMaterial;
  stoneTrimMat: THREE.MeshStandardMaterial;
  cobaltMasonryMat: THREE.MeshStandardMaterial;
  cobaltDarkMat: THREE.MeshStandardMaterial;
  woodMat: THREE.MeshStandardMaterial;
  woodDarkMat: THREE.MeshStandardMaterial;
  terracottaRoofMat: THREE.MeshPhysicalMaterial;
  goldMat: THREE.MeshPhysicalMaterial;
  copperMat: THREE.MeshPhysicalMaterial;
  forgedIronMat: THREE.MeshPhysicalMaterial;
  runnerClothMat: THREE.MeshPhysicalMaterial;
  crimsonClothMat: THREE.MeshPhysicalMaterial;
  obsidianMat: THREE.MeshPhysicalMaterial;
  waterMat: THREE.MeshPhysicalMaterial;
  emberBedMat: THREE.MeshStandardMaterial;
  tealGlowMat: THREE.MeshStandardMaterial;
  crimsonGlowMat: THREE.MeshStandardMaterial;
  emberGlowMat: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
  mossMat: THREE.MeshStandardMaterial;
  waterRippleTex: THREE.CanvasTexture;
  lightBeamTex: THREE.CanvasTexture;
  softShadowTex: THREE.CanvasTexture;
  createStoneFloorMaterial: (
    topHex: string,
    bottomHex: string,
    altHex: string,
    seamRgba: string,
    mossRgba: string,
    repeat?: number,
  ) => THREE.MeshStandardMaterial;
  dispose: () => void;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAniso: number,
  repeatX: number,
  repeatY: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

export function createNormalMapFromBumpCanvas(
  bumpCanvas: HTMLCanvasElement,
  strength: number,
  maxAniso: number,
  repeatX: number,
  repeatY: number,
): THREE.CanvasTexture {
  const w = bumpCanvas.width;
  const h = bumpCanvas.height;
  const srcCtx = bumpCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sampleH = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 3x3 Sobel filter with seamless wrap
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = dy * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return configureTexture(outCanvas, false, maxAniso, repeatX, repeatY);
}

export function createStoneTextureSet(
  topHex: string,
  bottomHex: string,
  altHex: string,
  seamRgba: string,
  mossRgba: string,
  maxAniso: number,
  repeat = 5,
): PbrTextureSet {
  const size = 512;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;

  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;

  const bgGrad = actx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, topHex);
  bgGrad.addColorStop(0.5, altHex);
  bgGrad.addColorStop(1, bottomHex);
  actx.fillStyle = bgGrad;
  actx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#B8B8B8';
  bctx.fillRect(0, 0, size, size);

  rctx.fillStyle = '#C4C4C4';
  rctx.fillRect(0, 0, size, size);

  const rnd = makeRng(4207);
  const rows = 4;
  const cols = 4;
  const step = size / rows;

  for (let r = 0; r < rows; r++) {
    const off = r % 2 === 0 ? 0 : step * 0.5;
    for (let c = -1; c <= cols; c++) {
      const tx = c * step + off;
      const ty = r * step;
      const shadeJitter = (rnd() - 0.5) * 0.14;

      const tileGrad = actx.createLinearGradient(tx, ty, tx + step, ty + step);
      if (shadeJitter >= 0) {
        tileGrad.addColorStop(0, `rgba(255,244,225,${(0.05 + shadeJitter * 0.35).toFixed(3)})`);
        tileGrad.addColorStop(1, 'rgba(6,10,22,0.18)');
      } else {
        tileGrad.addColorStop(0, 'rgba(56,232,216,0.035)');
        tileGrad.addColorStop(1, `rgba(4,8,18,${(0.2 + Math.abs(shadeJitter) * 0.4).toFixed(3)})`);
      }
      actx.fillStyle = tileGrad;
      actx.fillRect(tx + 3, ty + 3, step - 6, step - 6);

      // Chiseled bevel frame in bump & roughness
      const bumpVal = Math.round(182 + (rnd() - 0.5) * 26);
      bctx.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
      bctx.fillRect(tx + 4, ty + 4, step - 8, step - 8);

      bctx.strokeStyle = 'rgba(238,238,238,0.55)';
      bctx.lineWidth = 3;
      bctx.strokeRect(tx + 5, ty + 5, step - 10, step - 10);

      const roughVal = Math.round(186 + (rnd() - 0.5) * 34);
      rctx.fillStyle = `rgb(${roughVal},${roughVal},${roughVal})`;
      rctx.fillRect(tx + 4, ty + 4, step - 8, step - 8);

      // Subtle polished wear center on flagstones
      const wearGrad = rctx.createRadialGradient(
        tx + step * 0.5,
        ty + step * 0.5,
        4,
        tx + step * 0.5,
        ty + step * 0.5,
        step * 0.45,
      );
      wearGrad.addColorStop(0, 'rgba(130,130,130,0.38)');
      wearGrad.addColorStop(1, 'rgba(190,190,190,0)');
      rctx.fillStyle = wearGrad;
      rctx.fillRect(tx + 4, ty + 4, step - 8, step - 8);
    }
  }

  // Stone grain speckles & mineral pits across albedo + bump + roughness
  for (let i = 0; i < 650; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const rad = 0.8 + rnd() * 2.4;
    const bright = rnd() > 0.48;
    actx.fillStyle = bright ? 'rgba(255,250,240,0.05)' : 'rgba(5,8,18,0.18)';
    actx.beginPath();
    actx.arc(px, py, rad, 0, Math.PI * 2);
    actx.fill();

    bctx.fillStyle = bright ? 'rgba(225,225,225,0.22)' : 'rgba(65,65,65,0.26)';
    bctx.beginPath();
    bctx.arc(px, py, rad * 0.9, 0, Math.PI * 2);
    bctx.fill();

    rctx.fillStyle = bright ? 'rgba(235,235,235,0.2)' : 'rgba(120,120,120,0.18)';
    rctx.beginPath();
    rctx.arc(px, py, rad * 1.1, 0, Math.PI * 2);
    rctx.fill();
  }

  // Hairline stone cracks
  actx.lineWidth = 1.4;
  bctx.lineWidth = 2.0;
  for (let i = 0; i < 28; i++) {
    let cx = rnd() * size;
    let cy = rnd() * size;
    actx.strokeStyle = 'rgba(5, 8, 18, 0.45)';
    bctx.strokeStyle = 'rgba(38, 38, 38, 0.62)';
    actx.beginPath();
    bctx.beginPath();
    actx.moveTo(cx, cy);
    bctx.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg++) {
      cx += (rnd() - 0.5) * 28;
      cy += (rnd() - 0.5) * 28;
      actx.lineTo(cx, cy);
      bctx.lineTo(cx, cy);
    }
    actx.stroke();
    bctx.stroke();
  }

  // Soft mossy/damp patina near mortar seams (makes crevices darker & slightly damper/shinier)
  for (let i = 0; i < 38; i++) {
    const mx = Math.floor(rnd() * rows) * step + rnd() * step;
    const my = Math.floor(rnd() * rows) * step + (rnd() - 0.5) * 14;
    const rad = 14 + rnd() * 16;
    const mGrad = actx.createRadialGradient(mx, my, 1, mx, my, rad);
    mGrad.addColorStop(0, mossRgba);
    mGrad.addColorStop(1, 'rgba(0,0,0,0)');
    actx.fillStyle = mGrad;
    actx.beginPath();
    actx.arc(mx, my, rad, 0, Math.PI * 2);
    actx.fill();

    const rGrad = rctx.createRadialGradient(mx, my, 1, mx, my, rad);
    rGrad.addColorStop(0, 'rgba(110,110,110,0.4)');
    rGrad.addColorStop(1, 'rgba(0,0,0,0)');
    rctx.fillStyle = rGrad;
    rctx.beginPath();
    rctx.arc(mx, my, rad, 0, Math.PI * 2);
    rctx.fill();
  }

  // Deep recessed mortar seams
  actx.strokeStyle = seamRgba;
  actx.lineWidth = 4;
  bctx.strokeStyle = '#1E1E1E';
  bctx.lineWidth = 5;
  rctx.strokeStyle = '#686868';
  rctx.lineWidth = 4;
  for (let r = 0; r < rows; r++) {
    const y = r * step;
    for (const c of [actx, bctx, rctx]) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(size, y);
      c.stroke();
    }
    const off = r % 2 === 0 ? 0 : step * 0.5;
    for (let col = 0; col <= cols; col++) {
      const x = (col * step + off) % size;
      for (const c of [actx, bctx, rctx]) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + step);
        c.stroke();
      }
    }
  }

  return {
    map: configureTexture(albedoC, true, maxAniso, repeat, repeat),
    bumpMap: configureTexture(bumpC, false, maxAniso, repeat, repeat),
    normalMap: createNormalMapFromBumpCanvas(bumpC, 2.2, maxAniso, repeat, repeat),
    roughnessMap: configureTexture(roughC, false, maxAniso, repeat, repeat),
  };
}

export function createMasonryTextureSet(
  baseHex: string,
  highlightHex: string,
  seamRgba: string,
  maxAniso: number,
  repeatX = 2,
  repeatY = 2,
): PbrTextureSet {
  const size = 256;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;

  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;
  const rnd = makeRng(9123);

  actx.fillStyle = baseHex;
  actx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#9C9C9C';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#BFBFBF';
  rctx.fillRect(0, 0, size, size);

  const rowH = size / 4;
  const colW = size / 2;
  for (let r = 0; r < 4; r++) {
    const off = r % 2 === 0 ? 0 : colW * 0.5;
    for (let c = -1; c <= 2; c++) {
      const x = c * colW + off;
      const y = r * rowH;
      const g = actx.createLinearGradient(x, y, x, y + rowH);
      g.addColorStop(0, highlightHex);
      g.addColorStop(1, baseHex);
      actx.fillStyle = g;
      actx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      const bv = Math.round(176 + (rnd() - 0.5) * 32);
      bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      const rv = Math.round(182 + (rnd() - 0.5) * 36);
      rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
    }
  }

  for (let i = 0; i < 320; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const rad = 0.8 + rnd() * 1.8;
    actx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.16)';
    actx.fillRect(px, py, rad, rad);
    bctx.fillStyle = rnd() > 0.5 ? 'rgba(235,235,235,0.22)' : 'rgba(60,60,60,0.28)';
    bctx.fillRect(px, py, rad, rad);
  }

  actx.strokeStyle = seamRgba;
  actx.lineWidth = 3;
  bctx.strokeStyle = '#242424';
  bctx.lineWidth = 4;
  for (let r = 0; r < 4; r++) {
    const y = r * rowH;
    actx.beginPath();
    actx.moveTo(0, y);
    actx.lineTo(size, y);
    actx.stroke();
    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(size, y);
    bctx.stroke();
    const off = r % 2 === 0 ? 0 : colW * 0.5;
    for (let c = 0; c <= 2; c++) {
      const x = (c * colW + off) % size;
      actx.beginPath();
      actx.moveTo(x, y);
      actx.lineTo(x, y + rowH);
      actx.stroke();
      bctx.beginPath();
      bctx.moveTo(x, y);
      bctx.lineTo(x, y + rowH);
      bctx.stroke();
    }
  }

  return {
    map: configureTexture(albedoC, true, maxAniso, repeatX, repeatY),
    bumpMap: configureTexture(bumpC, false, maxAniso, repeatX, repeatY),
    normalMap: createNormalMapFromBumpCanvas(bumpC, 2.0, maxAniso, repeatX, repeatY),
    roughnessMap: configureTexture(roughC, false, maxAniso, repeatX, repeatY),
  };
}

export function createWoodTextureSet(
  lightHex: string,
  darkHex: string,
  maxAniso: number,
  repeat = 2,
): PbrTextureSet {
  const size = 256;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;

  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;
  const rnd = makeRng(6789);

  const grad = actx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, lightHex);
  grad.addColorStop(0.5, darkHex);
  grad.addColorStop(1, lightHex);
  actx.fillStyle = grad;
  actx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#A8A8A8';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#B8B8B8';
  rctx.fillRect(0, 0, size, size);

  // Longitudinal wood grain streaks
  for (let i = 0; i < 160; i++) {
    const x = rnd() * size;
    const w = 1 + rnd() * 3.5;
    const bright = rnd() > 0.5;
    actx.fillStyle = bright ? 'rgba(255,220,180,0.06)' : 'rgba(22,8,4,0.2)';
    actx.fillRect(x, 0, w, size);
    bctx.fillStyle = bright ? 'rgba(220,220,220,0.25)' : 'rgba(70,70,70,0.32)';
    bctx.fillRect(x, 0, w * 0.8, size);
    rctx.fillStyle = bright ? 'rgba(155,155,155,0.28)' : 'rgba(220,220,220,0.25)';
    rctx.fillRect(x, 0, w, size);
  }

  // Plank seams & iron nail studs
  const planks = 4;
  const pw = size / planks;
  actx.strokeStyle = 'rgba(14,6,3,0.68)';
  actx.lineWidth = 3;
  bctx.strokeStyle = '#222222';
  bctx.lineWidth = 4;
  for (let p = 0; p < planks; p++) {
    const x = p * pw;
    actx.beginPath();
    actx.moveTo(x, 0);
    actx.lineTo(x, size);
    actx.stroke();
    bctx.beginPath();
    bctx.moveTo(x, 0);
    bctx.lineTo(x, size);
    bctx.stroke();

    for (const ny of [24, size - 24]) {
      actx.fillStyle = '#1E2434';
      actx.beginPath();
      actx.arc(x + pw * 0.5, ny, 3.2, 0, Math.PI * 2);
      actx.fill();
      bctx.fillStyle = '#F0F0F0';
      bctx.beginPath();
      bctx.arc(x + pw * 0.5, ny, 3.2, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  return {
    map: configureTexture(albedoC, true, maxAniso, repeat, repeat),
    bumpMap: configureTexture(bumpC, false, maxAniso, repeat, repeat),
    normalMap: createNormalMapFromBumpCanvas(bumpC, 1.8, maxAniso, repeat, repeat),
    roughnessMap: configureTexture(roughC, false, maxAniso, repeat, repeat),
  };
}

export function createRoofTileTextureSet(
  tileHex: string,
  shadowHex: string,
  maxAniso: number,
  repeat = 3,
): PbrTextureSet {
  const size = 256;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;

  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;
  const rnd = makeRng(2468);

  actx.fillStyle = shadowHex;
  actx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#606060';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#9E9E9E';
  rctx.fillRect(0, 0, size, size);

  const rows = 6;
  const cols = 6;
  const rh = size / rows;
  const cw = size / cols;

  for (let r = 0; r < rows; r++) {
    const off = r % 2 === 0 ? 0 : cw * 0.5;
    for (let c = -1; c <= cols; c++) {
      const cx = c * cw + off + cw * 0.5;
      const cy = r * rh + rh * 0.4;
      const rad = cw * 0.54;

      const ag = actx.createRadialGradient(cx, cy - 6, 2, cx, cy, rad);
      ag.addColorStop(0, tileHex);
      ag.addColorStop(1, shadowHex);
      actx.fillStyle = ag;
      actx.beginPath();
      actx.arc(cx, cy, rad, 0, Math.PI);
      actx.lineTo(cx - rad, cy - rh);
      actx.lineTo(cx + rad, cy - rh);
      actx.closePath();
      actx.fill();

      const bg = bctx.createLinearGradient(0, cy - rh, 0, cy + rad);
      bg.addColorStop(0, '#DCDCDC');
      bg.addColorStop(0.85, '#9A9A9A');
      bg.addColorStop(1, '#3A3A3A');
      bctx.fillStyle = bg;
      bctx.beginPath();
      bctx.arc(cx, cy, rad * 0.96, 0, Math.PI);
      bctx.lineTo(cx - rad, cy - rh);
      bctx.lineTo(cx + rad, cy - rh);
      bctx.closePath();
      bctx.fill();

      const rv = Math.round(115 + (rnd() - 0.5) * 40);
      rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rctx.beginPath();
      rctx.arc(cx, cy, rad * 0.9, 0, Math.PI * 2);
      rctx.fill();
    }
  }

  return {
    map: configureTexture(albedoC, true, maxAniso, repeat, repeat),
    bumpMap: configureTexture(bumpC, false, maxAniso, repeat, repeat),
    normalMap: createNormalMapFromBumpCanvas(bumpC, 2.3, maxAniso, repeat, repeat),
    roughnessMap: configureTexture(roughC, false, maxAniso, repeat, repeat),
  };
}

export function createMetalTextureSet(
  baseHex: string,
  highlightHex: string,
  maxAniso: number,
  repeat = 2,
): PbrTextureSet {
  const size = 256;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;

  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;
  const rnd = makeRng(8842);

  const g = actx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, baseHex);
  g.addColorStop(0.5, highlightHex);
  g.addColorStop(1, baseHex);
  actx.fillStyle = g;
  actx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#888888';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#525252';
  rctx.fillRect(0, 0, size, size);

  // Directional brushed grain
  for (let i = 0; i < 240; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 14 + rnd() * 44;
    const bright = rnd() > 0.4;
    actx.strokeStyle = bright ? 'rgba(255,255,255,0.08)' : 'rgba(10,12,20,0.12)';
    actx.lineWidth = 1;
    actx.beginPath();
    actx.moveTo(x, y);
    actx.lineTo(x + len, y + (rnd() - 0.5) * 4);
    actx.stroke();

    bctx.strokeStyle = bright ? 'rgba(200,200,200,0.22)' : 'rgba(70,70,70,0.26)';
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + len, y + (rnd() - 0.5) * 4);
    bctx.stroke();

    rctx.strokeStyle = bright ? 'rgba(130,130,130,0.3)' : 'rgba(55,55,55,0.25)';
    rctx.beginPath();
    rctx.moveTo(x, y);
    rctx.lineTo(x + len, y + (rnd() - 0.5) * 4);
    rctx.stroke();
  }

  // Crisp combat wear micro-scratches & cross-gouges across armor & weapons
  for (let i = 0; i < 95; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const ang = (rnd() - 0.5) * 2.4;
    const len = 7 + rnd() * 24;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;

    actx.strokeStyle = rnd() > 0.35 ? 'rgba(255,255,255,0.16)' : 'rgba(6,8,14,0.24)';
    actx.lineWidth = 0.75 + rnd() * 0.7;
    actx.beginPath();
    actx.moveTo(x, y);
    actx.lineTo(ex, ey);
    actx.stroke();

    // Recessed scratch trough + bright displaced ridge beside it
    bctx.strokeStyle = 'rgba(28,28,28,0.65)';
    bctx.lineWidth = 1.05;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(ex, ey);
    bctx.stroke();

    bctx.strokeStyle = 'rgba(232,232,232,0.38)';
    bctx.lineWidth = 0.7;
    bctx.beginPath();
    bctx.moveTo(x + 0.8, y + 0.8);
    bctx.lineTo(ex + 0.8, ey + 0.8);
    bctx.stroke();

    rctx.strokeStyle = 'rgba(185,185,185,0.45)';
    rctx.lineWidth = 1.1;
    rctx.beginPath();
    rctx.moveTo(x, y);
    rctx.lineTo(ex, ey);
    rctx.stroke();
  }

  return {
    map: configureTexture(albedoC, true, maxAniso, repeat, repeat),
    bumpMap: configureTexture(bumpC, false, maxAniso, repeat, repeat),
    normalMap: createNormalMapFromBumpCanvas(bumpC, 1.9, maxAniso, repeat, repeat),
    roughnessMap: configureTexture(roughC, false, maxAniso, repeat, repeat),
  };
}

export function createClothTextureSet(
  baseHex: string,
  weaveHex: string,
  maxAniso: number,
  repeat = 4,
): PbrTextureSet {
  const size = 128;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;

  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;

  actx.fillStyle = baseHex;
  actx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#D4D4D4';
  rctx.fillRect(0, 0, size, size);

  actx.strokeStyle = weaveHex;
  actx.lineWidth = 1;
  bctx.strokeStyle = '#C8C8C8';
  bctx.lineWidth = 1.5;
  for (let i = 0; i < size; i += 6) {
    actx.beginPath();
    actx.moveTo(i, 0);
    actx.lineTo(i, size);
    actx.moveTo(0, i);
    actx.lineTo(size, i);
    actx.stroke();

    bctx.beginPath();
    bctx.moveTo(i, 0);
    bctx.lineTo(i, size);
    bctx.moveTo(0, i);
    bctx.lineTo(size, i);
    bctx.stroke();
  }

  return {
    map: configureTexture(albedoC, true, maxAniso, repeat, repeat),
    bumpMap: configureTexture(bumpC, false, maxAniso, repeat, repeat),
    normalMap: createNormalMapFromBumpCanvas(bumpC, 1.5, maxAniso, repeat, repeat),
    roughnessMap: configureTexture(roughC, false, maxAniso, repeat, repeat),
  };
}

function createWaterRippleCanvas(): HTMLCanvasElement {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#606060';
  ctx.fillRect(0, 0, size, size);

  const rnd = makeRng(3141);
  for (let i = 0; i < 24; i++) {
    const cx = rnd() * size;
    const cy = rnd() * size;
    const maxR = 16 + rnd() * 28;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, maxR);
    g.addColorStop(0, 'rgba(240,240,240,0.45)');
    g.addColorStop(0.45, 'rgba(90,90,90,0.2)');
    g.addColorStop(0.75, 'rgba(210,210,210,0.35)');
    g.addColorStop(1, 'rgba(96,96,96,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function createWaterRippleTexture(maxAniso: number): THREE.CanvasTexture {
  return configureTexture(createWaterRippleCanvas(), false, maxAniso, 2, 2);
}

export function createLightBeamTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const horiz = ctx.createLinearGradient(0, 0, w, 0);
  horiz.addColorStop(0, 'rgba(255,255,255,0)');
  horiz.addColorStop(0.5, 'rgba(255,255,255,1)');
  horiz.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = horiz;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'destination-in';
  const vert = ctx.createLinearGradient(0, 0, 0, h);
  vert.addColorStop(0, 'rgba(255,255,255,0.92)');
  vert.addColorStop(0.45, 'rgba(255,255,255,0.38)');
  vert.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vert;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSoftShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(8, 12, 24, 0.72)');
  g.addColorStop(0.55, 'rgba(8, 12, 24, 0.3)');
  g.addColorStop(1, 'rgba(8, 12, 24, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEmberCoalTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2B0D06';
  ctx.fillRect(0, 0, size, size);
  const rnd = makeRng(7771);
  for (let i = 0; i < 65; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 8 + rnd() * 20;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, '#FFF2B2');
    g.addColorStop(0.42, '#FF7B2E');
    g.addColorStop(1, 'rgba(43,13,6,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return configureTexture(c, true, maxAniso, 1, 1);
}

const _pbrLibraryCache = new Map<number, PbrLibrary>();
const _stoneFloorCache = new Map<string, THREE.MeshStandardMaterial>();
const MAX_STONE_FLOOR_CACHE = 16;

function markCachedPbrMat<T extends THREE.Material>(m: T): T {
  m.userData.cachedPbr = true;
  return m;
}

function markCachedPbrTex<T extends THREE.Texture>(t: T): T {
  t.userData = { ...t.userData, cachedPbr: true };
  return t;
}

export function createPbrLibrary(maxAniso: number): PbrLibrary {
  const cached = _pbrLibraryCache.get(maxAniso);
  if (cached) return cached;

  const trackSet = (set: PbrTextureSet): PbrTextureSet => {
    markCachedPbrTex(set.map);
    markCachedPbrTex(set.bumpMap);
    markCachedPbrTex(set.normalMap);
    markCachedPbrTex(set.roughnessMap);
    return set;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => markCachedPbrTex(t);
  const trackMat = <T extends THREE.Material>(m: T): T => markCachedPbrMat(m);

  const courtyardFloorSet = trackSet(
    createStoneTextureSet(
      '#2E395B',
      '#1A2239',
      '#242E4C',
      'rgba(8,11,22,0.72)',
      'rgba(46,196,182,0.16)',
      maxAniso,
      5,
    ),
  );
  const stoneTrimSet = trackSet(
    createMasonryTextureSet('#3E4D76', '#4E5F8F', 'rgba(10,14,28,0.68)', maxAniso, 3, 2),
  );
  const cobaltMasonrySet = trackSet(
    createMasonryTextureSet('#21335A', '#2D4475', 'rgba(8,12,24,0.72)', maxAniso, 2, 2),
  );
  const woodSet = trackSet(createWoodTextureSet('#8A4326', '#562312', maxAniso, 2));
  const roofTileSet = trackSet(createRoofTileTextureSet('#D46C4A', '#6A2718', maxAniso, 3));
  const goldMetalSet = trackSet(createMetalTextureSet('#D99B26', '#FFE08A', maxAniso, 2));
  const steelMetalSet = trackSet(createMetalTextureSet('#323F5B', '#6A7B9E', maxAniso, 2));
  const clothBlueSet = trackSet(
    createClothTextureSet('#1D325E', 'rgba(255,244,220,0.08)', maxAniso, 4),
  );
  const clothCrimsonSet = trackSet(
    createClothTextureSet('#9E342A', 'rgba(255,220,180,0.08)', maxAniso, 4),
  );

  const waterRippleCanvas = createWaterRippleCanvas();
  const waterRippleTex = trackTex(configureTexture(waterRippleCanvas, false, maxAniso, 2, 2));
  const waterNormalTex = trackTex(
    createNormalMapFromBumpCanvas(waterRippleCanvas, 2.0, maxAniso, 2, 2),
  );
  const lightBeamTex = trackTex(createLightBeamTexture());
  const softShadowTex = trackTex(createSoftShadowTexture());
  const emberCoalTex = trackTex(createEmberCoalTexture(maxAniso));

  const courtyardFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: courtyardFloorSet.map,
      normalMap: courtyardFloorSet.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: courtyardFloorSet.roughnessMap,
      roughness: 0.84,
      metalness: 0.08,
    }),
  );

  const stoneTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneTrimSet.map,
      normalMap: stoneTrimSet.normalMap,
      normalScale: new THREE.Vector2(0.68, 0.68),
      roughnessMap: stoneTrimSet.roughnessMap,
      roughness: 0.78,
      metalness: 0.12,
    }),
  );

  const cobaltMasonryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cobaltMasonrySet.map,
      normalMap: cobaltMasonrySet.normalMap,
      normalScale: new THREE.Vector2(0.72, 0.72),
      roughnessMap: cobaltMasonrySet.roughnessMap,
      roughness: 0.74,
      metalness: 0.18,
    }),
  );

  const cobaltDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#11182F',
      normalMap: cobaltMasonrySet.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.88,
      metalness: 0.14,
    }),
  );

  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodSet.map,
      normalMap: woodSet.normalMap,
      normalScale: new THREE.Vector2(0.68, 0.68),
      roughnessMap: woodSet.roughnessMap,
      roughness: 0.78,
      metalness: 0.05,
    }),
  );

  const woodDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#9C5E46',
      map: woodSet.map,
      normalMap: woodSet.normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: woodSet.roughnessMap,
      roughness: 0.84,
      metalness: 0.06,
    }),
  );

  const terracottaRoofMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: roofTileSet.map,
      normalMap: roofTileSet.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: roofTileSet.roughnessMap,
      roughness: 0.62,
      metalness: 0.06,
      clearcoat: 0.35,
      clearcoatRoughness: 0.42,
    }),
  );

  const goldMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: goldMetalSet.map,
      normalMap: goldMetalSet.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: goldMetalSet.roughnessMap,
      roughness: 0.24,
      metalness: 0.88,
      clearcoat: 0.28,
      clearcoatRoughness: 0.2,
    }),
  );

  const copperMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#D97B48',
      normalMap: goldMetalSet.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: goldMetalSet.roughnessMap,
      roughness: 0.28,
      metalness: 0.86,
      clearcoat: 0.32,
      clearcoatRoughness: 0.22,
    }),
  );

  const forgedIronMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: steelMetalSet.map,
      normalMap: steelMetalSet.normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: steelMetalSet.roughnessMap,
      roughness: 0.42,
      metalness: 0.84,
      clearcoat: 0.16,
      clearcoatRoughness: 0.38,
    }),
  );

  const runnerClothMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: clothBlueSet.map,
      normalMap: clothBlueSet.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: clothBlueSet.roughnessMap,
      roughness: 0.88,
      sheen: 0.85,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#6D8CE0'),
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );

  const crimsonClothMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: clothCrimsonSet.map,
      normalMap: clothCrimsonSet.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: clothCrimsonSet.roughnessMap,
      roughness: 0.84,
      sheen: 0.82,
      sheenRoughness: 0.52,
      sheenColor: new THREE.Color('#FFA88A'),
    }),
  );

  const obsidianMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#190B26',
      normalMap: stoneTrimSet.normalMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.38,
      metalness: 0.36,
      clearcoat: 0.6,
      clearcoatRoughness: 0.22,
      iridescence: 0.55,
      iridescenceIOR: 1.45,
    }),
  );

  const waterMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#20B4B0',
      emissive: '#136B70',
      emissiveIntensity: 0.65,
      normalMap: waterNormalTex,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      iridescence: 0.48,
      iridescenceIOR: 1.33,
    }),
  );

  const emberBedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FF8438',
      map: emberCoalTex,
      emissiveMap: emberCoalTex,
      emissive: '#FF4E14',
      emissiveIntensity: 1.42,
      roughness: 0.58,
    }),
  );

  const tealGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22DFD0',
      emissive: '#10B8AA',
      emissiveIntensity: 1.28,
      roughness: 0.2,
      metalness: 0.18,
    }),
  );

  const crimsonGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E83254',
      emissive: '#BD1036',
      emissiveIntensity: 1.38,
      roughness: 0.2,
      metalness: 0.18,
    }),
  );

  const emberGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFAD5C',
      emissive: '#E85E18',
      emissiveIntensity: 1.44,
      roughness: 0.24,
    }),
  );

  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#1E5A5E',
      normalMap: clothBlueSet.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.8,
      metalness: 0.04,
    }),
  );

  const mossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#246A62',
      roughness: 0.88,
      metalness: 0.02,
    }),
  );

  const createStoneFloorMaterial = (
    topHex: string,
    bottomHex: string,
    altHex: string,
    seamRgba: string,
    mossRgba: string,
    repeat = 6,
  ): THREE.MeshStandardMaterial => {
    const cacheKey = `${topHex}|${bottomHex}|${altHex}|${seamRgba}|${mossRgba}|${repeat}|${maxAniso}`;
    const existing = _stoneFloorCache.get(cacheKey);
    if (existing) {
      // Touch LRU position
      _stoneFloorCache.delete(cacheKey);
      _stoneFloorCache.set(cacheKey, existing);
      return existing;
    }
    const set = trackSet(
      createStoneTextureSet(topHex, bottomHex, altHex, seamRgba, mossRgba, maxAniso, repeat),
    );
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: set.map,
        normalMap: set.normalMap,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: set.roughnessMap,
        roughness: 0.82,
        metalness: 0.12,
      }),
    );
    if (_stoneFloorCache.size >= MAX_STONE_FLOOR_CACHE) {
      const oldestKey = _stoneFloorCache.keys().next().value;
      if (oldestKey) {
        const oldMat = _stoneFloorCache.get(oldestKey);
        _stoneFloorCache.delete(oldestKey);
        if (oldMat) {
          oldMat.map?.dispose();
          oldMat.bumpMap?.dispose();
          oldMat.normalMap?.dispose();
          oldMat.roughnessMap?.dispose();
          oldMat.dispose();
        }
      }
    }
    _stoneFloorCache.set(cacheKey, mat);
    return mat;
  };

  const lib: PbrLibrary = {
    courtyardFloorMat,
    stoneTrimMat,
    cobaltMasonryMat,
    cobaltDarkMat,
    woodMat,
    woodDarkMat,
    terracottaRoofMat,
    goldMat,
    copperMat,
    forgedIronMat,
    runnerClothMat,
    crimsonClothMat,
    obsidianMat,
    waterMat,
    emberBedMat,
    tealGlowMat,
    crimsonGlowMat,
    emberGlowMat,
    foliageMat,
    mossMat,
    waterRippleTex,
    lightBeamTex,
    softShadowTex,
    createStoneFloorMaterial,
    dispose() {
      // Cached library stays warm across zone/room transitions to eliminate stutter
    },
  };
  _pbrLibraryCache.set(maxAniso, lib);
  return lib;
}

export interface HeroMaterialTextures {
  leather: PbrTextureSet;
  steel: PbrTextureSet;
  darkSteel: PbrTextureSet;
  velvet: PbrTextureSet;
  clothBlue: PbrTextureSet;
  gambeson: PbrTextureSet;
  gold: PbrTextureSet;
  skinBump: THREE.CanvasTexture;
  skinNormal: THREE.CanvasTexture;
}

function createHeroLeatherTextureSet(maxAniso: number): PbrTextureSet {
  const size = 256;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;
  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;
  const rnd = makeRng(5193);

  const grad = actx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#5B281B');
  grad.addColorStop(0.5, '#481D13');
  grad.addColorStop(1, '#3B160E');
  actx.fillStyle = grad;
  actx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#9E9E9E';
  rctx.fillRect(0, 0, size, size);

  // Fine hide grain & weathered creases
  for (let i = 0; i < 650; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const rx = 1 + rnd() * 2.8;
    const ry = 0.8 + rnd() * 2.2;
    const bright = rnd() > 0.48;
    actx.fillStyle = bright ? 'rgba(138,76,48,0.16)' : 'rgba(20,7,4,0.22)';
    actx.beginPath();
    actx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    actx.fill();

    bctx.fillStyle = bright ? 'rgba(190,190,190,0.24)' : 'rgba(65,65,65,0.26)';
    bctx.beginPath();
    bctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    bctx.fill();

    rctx.fillStyle = bright ? 'rgba(135,135,135,0.22)' : 'rgba(180,180,180,0.2)';
    rctx.beginPath();
    rctx.arc(x, y, rx, 0, Math.PI * 2);
    rctx.fill();
  }

  // Scuff micro-scratches on weathered straps
  for (let i = 0; i < 45; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const ang = (rnd() - 0.5) * 2.2;
    const len = 8 + rnd() * 20;
    actx.strokeStyle = 'rgba(165, 110, 74, 0.22)';
    actx.lineWidth = 0.9;
    actx.beginPath();
    actx.moveTo(x, y);
    actx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    actx.stroke();

    bctx.strokeStyle = 'rgba(40,40,40,0.5)';
    bctx.lineWidth = 1.0;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    bctx.stroke();
  }

  // Saddle-stitched border seams
  actx.strokeStyle = 'rgba(222,182,118,0.48)';
  bctx.strokeStyle = 'rgba(232,232,232,0.58)';
  actx.lineWidth = 1.4;
  bctx.lineWidth = 1.6;
  actx.setLineDash([5, 4]);
  bctx.setLineDash([5, 4]);
  for (const offset of [10, size - 10]) {
    actx.beginPath();
    actx.moveTo(0, offset);
    actx.lineTo(size, offset);
    actx.stroke();
    bctx.beginPath();
    bctx.moveTo(0, offset);
    bctx.lineTo(size, offset);
    bctx.stroke();
  }
  actx.setLineDash([]);
  bctx.setLineDash([]);

  return {
    map: markCachedPbrTex(configureTexture(albedoC, true, maxAniso, 2, 2)),
    bumpMap: markCachedPbrTex(configureTexture(bumpC, false, maxAniso, 2, 2)),
    normalMap: markCachedPbrTex(createNormalMapFromBumpCanvas(bumpC, 1.85, maxAniso, 2, 2)),
    roughnessMap: markCachedPbrTex(configureTexture(roughC, false, maxAniso, 2, 2)),
  };
}

function createHeroGambesonTextureSet(maxAniso: number): PbrTextureSet {
  const size = 256;
  const albedoC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  albedoC.width = bumpC.width = roughC.width = size;
  albedoC.height = bumpC.height = roughC.height = size;
  const actx = albedoC.getContext('2d')!;
  const bctx = bumpC.getContext('2d')!;
  const rctx = roughC.getContext('2d')!;

  actx.fillStyle = '#1D2E57';
  actx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#B8B8B8';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#BFBFBF';
  rctx.fillRect(0, 0, size, size);

  // Diamond quilted padded doublet pattern
  const step = 32;
  for (let y = -size; y < size * 2; y += step) {
    actx.strokeStyle = 'rgba(8, 14, 34, 0.56)';
    actx.lineWidth = 2.2;
    bctx.strokeStyle = 'rgba(42, 42, 42, 0.78)';
    bctx.lineWidth = 3.2;
    rctx.strokeStyle = 'rgba(165, 165, 165, 0.6)';
    rctx.lineWidth = 2.6;

    actx.beginPath();
    actx.moveTo(0, y);
    actx.lineTo(size, y + size);
    actx.moveTo(size, y);
    actx.lineTo(0, y + size);
    actx.stroke();

    bctx.beginPath();
    bctx.moveTo(0, y);
    bctx.lineTo(size, y + size);
    bctx.moveTo(size, y);
    bctx.lineTo(0, y + size);
    bctx.stroke();

    rctx.beginPath();
    rctx.moveTo(0, y);
    rctx.lineTo(size, y + size);
    rctx.moveTo(size, y);
    rctx.lineTo(0, y + size);
    rctx.stroke();
  }

  // Soft linen thread crosshatch
  actx.strokeStyle = 'rgba(148, 184, 245, 0.08)';
  actx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    actx.beginPath();
    actx.moveTo(i, 0);
    actx.lineTo(i, size);
    actx.moveTo(0, i);
    actx.lineTo(size, i);
    actx.stroke();
  }

  return {
    map: markCachedPbrTex(configureTexture(albedoC, true, maxAniso, 2, 2)),
    bumpMap: markCachedPbrTex(configureTexture(bumpC, false, maxAniso, 2, 2)),
    normalMap: markCachedPbrTex(createNormalMapFromBumpCanvas(bumpC, 1.9, maxAniso, 2, 2)),
    roughnessMap: markCachedPbrTex(configureTexture(roughC, false, maxAniso, 2, 2)),
  };
}

function createSkinMicroBumpMaps(maxAniso: number): {
  bump: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const rnd = makeRng(9021);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(165,165,165,0.22)' : 'rgba(92,92,92,0.24)';
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, 0.6 + rnd() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    bump: markCachedPbrTex(configureTexture(c, false, maxAniso, 2, 2)),
    normal: markCachedPbrTex(createNormalMapFromBumpCanvas(c, 1.1, maxAniso, 2, 2)),
  };
}

const _heroTexCache = new Map<number, HeroMaterialTextures>();

export function createHeroMaterialTextures(maxAniso = 4): HeroMaterialTextures {
  const key = Math.max(1, maxAniso);
  const existing = _heroTexCache.get(key);
  if (existing) return existing;

  const trackSet = (set: PbrTextureSet): PbrTextureSet => {
    markCachedPbrTex(set.map);
    markCachedPbrTex(set.bumpMap);
    markCachedPbrTex(set.normalMap);
    markCachedPbrTex(set.roughnessMap);
    return set;
  };
  const skin = createSkinMicroBumpMaps(key);

  const textures: HeroMaterialTextures = {
    leather: createHeroLeatherTextureSet(key),
    steel: trackSet(createMetalTextureSet('#9AA8BF', '#F0F5FF', key, 2)),
    darkSteel: trackSet(createMetalTextureSet('#2A3348', '#526282', key, 2)),
    velvet: trackSet(createClothTextureSet('#9D2F27', '#6E1813', key, 3)),
    clothBlue: trackSet(createClothTextureSet('#24396B', 'rgba(255,244,220,0.09)', key, 3)),
    gambeson: createHeroGambesonTextureSet(key),
    gold: trackSet(createMetalTextureSet('#D49622', '#FFE89E', key, 2)),
    skinBump: skin.bump,
    skinNormal: skin.normal,
  };
  _heroTexCache.set(key, textures);
  return textures;
}

