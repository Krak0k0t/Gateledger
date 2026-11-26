import * as THREE from 'three';
import {
  getRoomGroundY,
  type DoorDir,
  type ObstacleDef,
  type RoomBiomeTag,
  type RoomLayoutKind,
  type RoomType,
} from '../systems/dungeonSim';
import type { DungeonMode } from '../systems/expedition';
import { addInkEdges } from './characterMeshes';
import { createPbrLibrary, type PbrLibrary } from './pbrMaterials';

export interface WorldExtraState {
  trapArmed?: boolean[];
  altarUsed?: boolean;
  prestigeBanners?: boolean;
  destructiblesBroken?: boolean[];
  mimicIndices?: boolean[];
  roomCleared?: boolean;
}

export interface ThemeLighting {
  bg: string;
  fog: string;
  keyColor: string;
  keyIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  rimColor: string;
  spotColor: string;
}

export interface AnimatedWorldHandle {
  group: THREE.Group;
  themeLighting?: ThemeLighting;
  update: (
    elapsed: number,
    exitPortalOpen: boolean,
    chestsOpened: boolean[],
    camX?: number,
    camZ?: number,
    extra?: WorldExtraState,
  ) => void;
  dispose?: () => void;
}

export function createRadialGlowTexture(
  innerColor: string,
  midColor: string,
  outerRgba = 'rgba(0,0,0,0)',
  size = 128,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    2,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.42, midColor);
  grad.addColorStop(1, outerRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface SmokeEmitterRig {
  points: THREE.Points;
  update: (elapsed: number) => void;
}

function createSmokeEmitterSystem(
  origins: { x: number; y: number; z: number }[],
  smokeTex: THREE.CanvasTexture,
  tintHex: string,
  perOrigin = 7,
  riseHeight = 2.6,
  size = 0.72,
): SmokeEmitterRig | null {
  if (origins.length === 0) return null;
  const total = origins.length * perOrigin;
  const positions = new Float32Array(total * 3);
  const phases = new Float32Array(total);
  const baseIndices = new Uint16Array(total);
  for (let i = 0; i < total; i++) {
    const oIdx = Math.floor(i / perOrigin);
    baseIndices[i] = oIdx;
    phases[i] = (i % perOrigin) / perOrigin + (oIdx * 0.23) % 1;
    positions[i * 3] = origins[oIdx].x;
    positions[i * 3 + 1] = origins[oIdx].y;
    positions[i * 3 + 2] = origins[oIdx].z;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  geo.setAttribute('position', posAttr);
  const mat = new THREE.PointsMaterial({
    map: smokeTex,
    color: tintHex,
    size,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    update(elapsed: number) {
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < total; i++) {
        const o = origins[baseIndices[i]];
        const p = (elapsed * 0.36 + phases[i]) % 1;
        const sway = Math.sin(elapsed * 1.4 + i * 1.9) * (0.14 + p * 0.38);
        const driftZ = Math.cos(elapsed * 1.1 + i * 1.3) * (0.1 + p * 0.28);
        arr[i * 3] = o.x + sway;
        arr[i * 3 + 1] = o.y + p * riseHeight;
        arr[i * 3 + 2] = o.z + driftZ;
      }
      posAttr.needsUpdate = true;
    },
  };
}

export function createStonePaverTexture(
  topHex: string,
  bottomHex: string,
  altHex: string,
  seamRgba: string,
  mossRgba: string,
  maxAniso: number,
  repeat = 5,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, topHex);
  bgGrad.addColorStop(0.5, altHex);
  bgGrad.addColorStop(1, bottomHex);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  const step = size / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tx = c * step;
      const ty = r * step;
      const tileGrad = ctx.createRadialGradient(
        tx + step * 0.45,
        ty + step * 0.45,
        4,
        tx + step * 0.5,
        ty + step * 0.5,
        step * 0.85,
      );
      if ((r + c) % 2 === 0) {
        tileGrad.addColorStop(0, 'rgba(255,244,220,0.06)');
        tileGrad.addColorStop(1, 'rgba(8,12,26,0.16)');
      } else {
        tileGrad.addColorStop(0, 'rgba(56,232,216,0.04)');
        tileGrad.addColorStop(1, 'rgba(8,12,26,0.22)');
      }
      ctx.fillStyle = tileGrad;
      ctx.fillRect(tx + 2, ty + 2, step - 4, step - 4);
    }
  }

  let s = 1337;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  for (let i = 0; i < 420; i++) {
    const px = rnd() * size;
    const py = rnd() * size;
    const rad = 1 + rnd() * 2.4;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(4,7,18,0.18)';
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(6, 9, 20, 0.42)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    let cx = rnd() * size;
    let cy = rnd() * size;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg++) {
      cx += (rnd() - 0.5) * 26;
      cy += (rnd() - 0.5) * 26;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 34; i++) {
    const mx = Math.floor(rnd() * 4) * step + rnd() * step;
    const my = Math.floor(rnd() * 4) * step + (rnd() - 0.5) * 14;
    const mGrad = ctx.createRadialGradient(mx, my, 1, mx, my, 12 + rnd() * 14);
    mGrad.addColorStop(0, mossRgba);
    mGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = seamRgba;
  ctx.lineWidth = 3;
  for (let r = 0; r < 4; r++) {
    const y = r * step;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    const off = r % 2 === 0 ? 0 : step * 0.5;
    for (let c = 0; c < 5; c++) {
      const x = (c * step + off) % size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + step);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAniso;
  return tex;
}

function addContactShadow(
  parent: THREE.Object3D,
  shadowTex: THREE.CanvasTexture,
  x: number,
  z: number,
  radiusX: number,
  radiusZ = radiusX,
  opacity = 0.52,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.012, z);
  parent.add(mesh);
  return mesh;
}

function addInstancedScatter(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  spots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[],
): THREE.InstancedMesh {
  const inst = new THREE.InstancedMesh(geometry, material, spots.length);
  inst.castShadow = false;
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < spots.length; i++) {
    const sp = spots[i];
    dummy.position.set(sp.x, sp.y, sp.z);
    dummy.rotation.set(0, sp.rotY, 0);
    dummy.scale.set(
      sp.scale * (0.9 + (i % 3) * 0.1),
      sp.scale * (0.82 + (i % 4) * 0.12),
      sp.scale * (0.9 + ((i + 1) % 3) * 0.1),
    );
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    col.set(sp.color);
    inst.setColorAt(i, col);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
  parent.add(inst);
  return inst;
}

function createAmphoraLatheGeometry(scale = 1): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18 * scale, 0.0),
    new THREE.Vector2(0.24 * scale, 0.14 * scale),
    new THREE.Vector2(0.34 * scale, 0.36 * scale),
    new THREE.Vector2(0.29 * scale, 0.56 * scale),
    new THREE.Vector2(0.16 * scale, 0.68 * scale),
    new THREE.Vector2(0.23 * scale, 0.78 * scale),
    new THREE.Vector2(0.2 * scale, 0.8 * scale),
    new THREE.Vector2(0.13 * scale, 0.72 * scale),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

function createDomedChestLidGeometry(w: number, h: number, d: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hd = d * 0.5;
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.quadraticCurveTo(hd, h * 1.35, 0, h * 1.35);
  shape.quadraticCurveTo(-hd, h * 1.35, -hd, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  geo.center();
  return geo;
}

interface ParallaxRig {
  group: THREE.Group;
  update: (elapsed: number, camX: number, camZ: number) => void;
}

function createParallaxBackdrop(
  isDungeon: boolean,
  glowTex: THREE.CanvasTexture,
  pbr: PbrLibrary,
  accentColor: string,
): ParallaxRig {
  const group = new THREE.Group();

  // Layer 1 (Far): Layered rocky cliffs, monolithic arches & ruined aqueduct silhouettes
  const farLayer = new THREE.Group();
  const farMat = new THREE.MeshStandardMaterial({
    color: isDungeon ? '#0C1228' : '#131A35',
    roughness: 0.94,
    metalness: 0.05,
  });
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const radius = 33 + (i % 4) * 4.5;
    const h = 8 + (i % 5) * 3.4;
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1 + (i % 2) * 0.8, 3.6 + (i % 3) * 1.1, h, 6),
      farMat,
    );
    spire.position.set(Math.cos(angle) * radius, h * 0.25 - 6.0, Math.sin(angle) * radius - 3);
    spire.rotation.y = angle * 1.3;
    farLayer.add(spire);

    if (i % 3 === 0) {
      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        isDungeon ? pbr.tealGlowMat : pbr.emberGlowMat,
      );
      beacon.position.set(Math.cos(angle) * (radius - 0.8), h * 0.58 - 5.2, Math.sin(angle) * (radius - 0.8) - 3);
      farLayer.add(beacon);
    }
  }

  // Distant ruined aqueduct bridge silhouette behind north horizon
  for (let a = -3; a <= 3; a++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11, 1.4), farMat);
    pier.position.set(a * 5.2, -3.8, -28);
    farLayer.add(pier);
    if (a < 3) {
      const span = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 1.25), farMat);
      span.position.set(a * 5.2 + 2.6, 1.4, -28);
      farLayer.add(span);
    }
  }
  group.add(farLayer);

  // Layer 2 (Mid-Far): Floating shattered sanctuaries with rune inlays
  const midLayer = new THREE.Group();
  const midMat = pbr.cobaltMasonryMat;
  const runeMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.9,
    roughness: 0.25,
  });

  const floaters: THREE.Group[] = [];
  const coords: [number, number, number][] = [
    [-16.5, -2.6, -14.5],
    [17.0, -1.9, -13.5],
    [-19.0, -3.2, 6.5],
    [19.0, -2.3, 7.5],
    [0, -1.3, -22.0],
  ];
  for (let i = 0; i < coords.length; i++) {
    const [fx, fy, fz] = coords[i];
    const fg = new THREE.Group();
    fg.position.set(fx, fy, fz);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 0), midMat);
    rock.scale.set(1.25, 0.72, 1.05);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 3.2, 8), midMat);
    pillar.position.y = 1.6;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 1.25), pbr.stoneTrimMat);
    cap.position.y = 3.25;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), runeMat);
    orb.position.y = 3.95;
    fg.add(rock, pillar, cap, orb);
    midLayer.add(fg);
    floaters.push(fg);
  }
  group.add(midLayer);

  // Layer 3 (Volumetric mist shelves fading downward into FogExp2)
  const mistMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: isDungeon ? '#1B4B66' : '#283A6B',
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mistRing = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), mistMat);
  mistRing.rotation.x = -Math.PI / 2;
  mistRing.position.set(0, -3.6, -2);
  const lowMist = new THREE.Mesh(new THREE.PlaneGeometry(54, 54), mistMat);
  lowMist.rotation.x = -Math.PI / 2;
  lowMist.position.set(0, -2.2, -3);
  group.add(mistRing, lowMist);

  return {
    group,
    update(elapsed, camX, camZ) {
      farLayer.position.set(camX * 0.45, 0, camZ * 0.45);
      midLayer.position.set(camX * 0.22, 0, camZ * 0.22);
      for (let i = 0; i < floaters.length; i++) {
        floaters[i].position.y = coords[i][1] + Math.sin(elapsed * 0.9 + i * 1.3) * 0.45;
      }
      mistMat.opacity = 0.26 + Math.sin(elapsed * 0.7) * 0.06;
    },
  };
}

export function buildCourtyardWorld(
  inkMat: THREE.LineBasicMaterial,
  maxAniso: number,
): AnimatedWorldHandle {
  const group = new THREE.Group();
  const pbr = createPbrLibrary(maxAniso);

  const glowTex = createRadialGlowTexture(
    'rgba(255,255,255,0.9)',
    'rgba(255,255,255,0.28)',
    'rgba(0,0,0,0)',
  );
  const parallax = createParallaxBackdrop(false, glowTex, pbr, '#FFAA4C');
  group.add(parallax.group);

  // Stepped terrace deck with PBR flagstone map + bumpMap + roughnessMap
  const deck = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.32, 18.6), pbr.courtyardFloorMat);
  deck.position.y = -0.16;
  deck.receiveShadow = true;
  addInkEdges(deck, inkMat, 32);
  group.add(deck);

  const underSlab = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.46, 19.6), pbr.stoneTrimMat);
  underSlab.position.y = -0.55;
  underSlab.receiveShadow = true;
  addInkEdges(underSlab, inkMat, 32);
  group.add(underSlab);

  const plinthCornice = new THREE.Mesh(new THREE.BoxGeometry(20.1, 0.22, 20.1), pbr.cobaltMasonryMat);
  plinthCornice.position.y = -0.84;
  group.add(plinthCornice);

  const cliffBase = new THREE.Mesh(
    new THREE.CylinderGeometry(14.8, 11.4, 2.8, 8),
    pbr.cobaltDarkMat,
  );
  cliffBase.rotation.y = Math.PI / 8;
  cliffBase.position.y = -2.3;
  group.add(cliffBase);

  // Perimeter balustrade with carved stone caps & corner iron braziers
  for (const s of [-1, 1]) {
    const cz = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.36, 0.42), pbr.stoneTrimMat);
    cz.position.set(0, 0.18, s * 9.12);
    cz.castShadow = true;
    cz.receiveShadow = true;
    addInkEdges(cz, inkMat, 32);
    group.add(cz);

    const czCap = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.1, 0.52), pbr.cobaltMasonryMat);
    czCap.position.set(0, 0.39, s * 9.12);
    group.add(czCap);

    const cx = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 18.0), pbr.stoneTrimMat);
    cx.position.set(s * 9.12, 0.18, 0);
    cx.castShadow = true;
    cx.receiveShadow = true;
    addInkEdges(cx, inkMat, 32);
    group.add(cx);

    const cxCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 18.2), pbr.cobaltMasonryMat);
    cxCap.position.set(s * 9.12, 0.39, 0);
    group.add(cxCap);
  }

  // Instanced carved stone balustrade posts around courtyard perimeter (1 draw call for 24 posts)
  const balusterSpots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[] = [];
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const off = i * 2.25;
    balusterSpots.push({ x: off, y: 0.56, z: 9.12, scale: 1, rotY: 0, color: '#D6DFEE' });
    balusterSpots.push({ x: off, y: 0.56, z: -9.12, scale: 1, rotY: 0, color: '#D6DFEE' });
    balusterSpots.push({ x: 9.12, y: 0.56, z: off, scale: 1, rotY: 0, color: '#C5D1E6' });
    balusterSpots.push({ x: -9.12, y: 0.56, z: off, scale: 1, rotY: 0, color: '#C5D1E6' });
  }
  addInstancedScatter(group, new THREE.BoxGeometry(0.32, 0.32, 0.32), pbr.stoneTrimMat, balusterSpots);

  // 4 Corner Wrought-Iron Flickering Braziers
  const brazierFlames: THREE.Mesh[] = [];
  for (const [bx, bz] of [
    [-8.95, -8.95],
    [8.95, -8.95],
    [8.95, 8.95],
    [-8.95, 8.95],
  ]) {
    const bg = new THREE.Group();
    bg.position.set(bx, 0, bz);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.86, 0.76), pbr.stoneTrimMat);
    post.position.y = 0.43;
    post.castShadow = true;
    addInkEdges(post, inkMat, 32);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.22, 0.28, 8), pbr.forgedIronMat);
    bowl.position.y = 0.98;
    const coals = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), pbr.emberBedMat);
    coals.scale.set(1, 0.55, 1);
    coals.position.y = 1.08;
    const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), pbr.emberGlowMat);
    flame.scale.set(0.8, 1.6, 0.8);
    flame.position.y = 1.32;
    brazierFlames.push(flame);
    bg.add(post, bowl, coals, flame);
    group.add(bg);
  }

  // Ceremonial indigo-gold woven runner leading to the Ancient Gate
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 7.8), pbr.runnerClothMat);
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.024, -2.45);
  runner.receiveShadow = true;
  group.add(runner);

  for (const sx of [-1.24, 1.24]) {
    const trim = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 7.8), pbr.goldMat);
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(sx, 0.03, -2.45);
    group.add(trim);
  }

  // Towering Monumental Ancient Gate Arch with fluted columns, astrolabe & volumetric light cones
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, -6.2);
  group.add(gateGroup);

  const gBase = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.26, 2.7), pbr.cobaltDarkMat);
  gBase.position.y = 0.13;
  gBase.receiveShadow = true;
  addInkEdges(gBase, inkMat, 32);
  gateGroup.add(gBase);

  const gStep = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 2.1), pbr.stoneTrimMat);
  gStep.position.y = 0.34;
  gStep.receiveShadow = true;
  gateGroup.add(gStep);

  for (const side of [-1, 1]) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.4, 1.24), pbr.stoneTrimMat);
    plinth.position.set(side * 1.9, 0.56, 0);
    plinth.castShadow = true;
    addInkEdges(plinth, inkMat, 32);
    gateGroup.add(plinth);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 3.15, 10), pbr.cobaltMasonryMat);
    pillar.position.set(side * 1.9, 2.3, 0);
    pillar.castShadow = true;
    addInkEdges(pillar, inkMat, 34);
    gateGroup.add(pillar);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.32, 1.28), pbr.stoneTrimMat);
    cap.position.set(side * 1.9, 3.98, 0);
    addInkEdges(cap, inkMat, 32);
    gateGroup.add(cap);

    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.95, 0.12), pbr.tealGlowMat);
    rune.position.set(side * 1.9, 2.25, 0.48);
    gateGroup.add(rune);

    // Side sconce flame on Gate pillars
    const sconceCup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.18, 6), pbr.goldMat);
    sconceCup.position.set(side * 2.55, 2.35, 0.25);
    const sconceOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), pbr.tealGlowMat);
    sconceOrb.position.set(side * 2.55, 2.52, 0.25);
    gateGroup.add(sconceCup, sconceOrb);
  }

  const archShape = new THREE.Shape();
  archShape.moveTo(-2.65, 0);
  archShape.lineTo(2.65, 0);
  archShape.lineTo(2.15, 1.45);
  archShape.lineTo(0, 2.02);
  archShape.lineTo(-2.15, 1.45);
  archShape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, -0.1, 1.38, 0, Math.PI, false);
  archShape.holes.push(hole);

  const archGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 0.92,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.07,
    bevelThickness: 0.07,
  });
  archGeo.center();
  const arch = new THREE.Mesh(archGeo, pbr.cobaltMasonryMat);
  arch.position.set(0, 4.85, 0);
  arch.castShadow = true;
  addInkEdges(arch, inkMat, 34);
  gateGroup.add(arch);

  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), pbr.goldMat);
  keystone.scale.set(0.8, 1.35, 0.8);
  keystone.position.set(0, 4.72, 0.52);
  gateGroup.add(keystone);

  const portalVeilMat = new THREE.MeshBasicMaterial({
    color: '#38E8D8',
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const portalVeil = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 3.45), portalVeilMat);
  portalVeil.position.set(0, 2.15, 0);
  gateGroup.add(portalVeil);

  // Subtle volumetric sanctuary light shaft projecting out of the Ancient Gate
  const gateBeamMat = new THREE.MeshBasicMaterial({
    map: pbr.lightBeamTex,
    color: '#38E8D8',
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const gateBeam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), gateBeamMat);
  gateBeam.rotation.x = -Math.PI * 0.42;
  gateBeam.position.set(0, 1.15, 2.2);
  gateGroup.add(gateBeam);

  const portalHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 5.8),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#38E8D8',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  portalHalo.position.set(0, 2.2, 0.14);
  gateGroup.add(portalHalo);

  const outerAstrolabe = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.06, 10, 36), pbr.goldMat);
  outerAstrolabe.position.set(0, 2.25, 0.12);
  const innerAstrolabe = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.045, 10, 32),
    pbr.tealGlowMat,
  );
  innerAstrolabe.position.set(0, 2.25, 0.12);
  gateGroup.add(outerAstrolabe, innerAstrolabe);

  // Gateledger Shop Pavilion (West) with timber framing, tiled roof, chimney, window, sign & barrels
  const shop = new THREE.Group();
  shop.position.set(-5.6, 0, 0.4);
  group.add(shop);
  addContactShadow(shop, pbr.softShadowTex, -0.3, 0, 2.5, 2.5, 0.46);

  const shopWall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.7, 3.9), pbr.stoneTrimMat);
  shopWall.position.set(-0.35, 1.35, 0);
  shopWall.castShadow = true;
  shopWall.receiveShadow = true;
  addInkEdges(shopWall, inkMat, 32);
  shop.add(shopWall);

  // Timber corner beams
  for (const bx of [-1.72, 1.02]) {
    for (const bz of [-1.92, 1.92]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.74, 0.18), pbr.woodDarkMat);
      beam.position.set(bx, 1.37, bz);
      beam.castShadow = true;
      shop.add(beam);
    }
  }

  // Shingled terracotta roof with clearcoat + stone chimney
  const shopRoof = new THREE.Mesh(new THREE.ConeGeometry(2.82, 1.68, 4), pbr.terracottaRoofMat);
  shopRoof.rotation.y = Math.PI / 4;
  shopRoof.position.set(-0.35, 3.5, 0);
  shopRoof.castShadow = true;
  addInkEdges(shopRoof, inkMat, 32);
  shop.add(shopRoof);

  const roofFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), pbr.goldMat);
  roofFinial.position.set(-0.35, 4.44, 0);
  shop.add(roofFinial);

  const shopChimney = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.55, 0.58), pbr.cobaltMasonryMat);
  shopChimney.position.set(-1.1, 3.88, -1.0);
  shopChimney.castShadow = true;
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.74), pbr.stoneTrimMat);
  chimneyCap.position.set(-1.1, 4.7, -1.0);
  shop.add(shopChimney, chimneyCap);

  // Glowing amber leaded shop window + wooden counter
  const shopWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 1.15), pbr.emberGlowMat);
  shopWindow.position.set(1.06, 1.55, -0.55);
  shop.add(shopWindow);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.95, 3.15), pbr.woodMat);
  counter.position.set(1.38, 0.475, 0);
  counter.castShadow = true;
  counter.receiveShadow = true;
  addInkEdges(counter, inkMat, 32);
  shop.add(counter);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 3.25), pbr.woodDarkMat);
  counterTop.position.set(1.38, 0.98, 0);
  shop.add(counterTop);

  // Shop micro-props: Brass scales/ledger + Crate & Barrel stack with contact shadow
  const ledgerBook = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.52), pbr.crimsonClothMat);
  ledgerBook.position.set(1.42, 1.07, -0.25);
  ledgerBook.rotation.y = 0.18;
  shop.add(ledgerBook);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.72, 10), pbr.woodMat);
  barrel.position.set(1.32, 0.36, 1.95);
  barrel.castShadow = false;
  const barrelBand = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 6, 14), pbr.forgedIronMat);
  barrelBand.rotation.x = Math.PI / 2;
  barrelBand.position.set(1.32, 0.55, 1.95);
  addContactShadow(shop, pbr.softShadowTex, 1.32, 1.95, 0.48, 0.48, 0.5);
  shop.add(barrel, barrelBand);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.62), pbr.woodDarkMat);
  crate.position.set(1.38, 0.28, -2.05);
  crate.rotation.y = 0.28;
  crate.castShadow = false;
  addContactShadow(shop, pbr.softShadowTex, 1.38, -2.05, 0.52, 0.52, 0.5);
  shop.add(crate);

  // Wrought-iron brackets + twin warm hanging shop lanterns + ground light wash
  const lanternArm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.07), pbr.forgedIronMat);
  lanternArm.position.set(1.66, 2.02, 1.15);
  const shopLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), pbr.emberGlowMat);
  shopLantern.position.set(1.94, 1.76, 1.15);
  const lanternArmB = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.07), pbr.forgedIronMat);
  lanternArmB.position.set(1.66, 2.02, -1.15);
  const shopLanternB = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), pbr.emberGlowMat);
  shopLanternB.position.set(1.94, 1.78, -1.15);
  shop.add(lanternArm, shopLantern, lanternArmB, shopLanternB);

  const shopPool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#FF9E44',
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shopPool.rotation.x = -Math.PI / 2;
  shopPool.position.set(1.9, 0.02, 0);
  shop.add(shopPool);

  for (let i = 0; i < 6; i++) {
    const aw = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.08, 0.56),
      i % 2 === 0 ? pbr.crimsonClothMat : pbr.stoneTrimMat,
    );
    aw.position.set(1.42, 2.15, -1.4 + i * 0.56);
    aw.rotation.z = -0.26;
    addInkEdges(aw, inkMat, 32);
    shop.add(aw);
  }

  // Deal Streak 3+ Golden Prestige Banners flanking the shop awning
  const prestigeGroup = new THREE.Group();
  for (const bz of [-1.65, 1.65]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.95, 8), pbr.goldMat);
    pole.position.set(1.9, 1.47, bz);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.44), pbr.goldMat);
    cloth.position.set(1.9, 2.22, bz);
    addInkEdges(cloth, inkMat, 32);
    prestigeGroup.add(pole, cloth);
  }
  prestigeGroup.visible = false;
  shop.add(prestigeGroup);

  // Animated Courtyard Fountain with octagonal carved basin & clearcoat animated ripples
  const fountain = new THREE.Group();
  fountain.position.set(-2.1, 0, -2.5);
  group.add(fountain);
  addContactShadow(fountain, pbr.softShadowTex, 0, 0, 1.45, 1.45, 0.52);

  const fRim = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.24, 0.44, 12), pbr.stoneTrimMat);
  fRim.position.y = 0.22;
  fRim.castShadow = true;
  fRim.receiveShadow = true;
  addInkEdges(fRim, inkMat, 32);
  const fRingCap = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.09, 8, 24), pbr.cobaltMasonryMat);
  fRingCap.rotation.x = Math.PI / 2;
  fRingCap.position.y = 0.45;
  const fWater = new THREE.Mesh(new THREE.CircleGeometry(0.98, 24), pbr.waterMat);
  fWater.rotation.x = -Math.PI / 2;
  fWater.position.y = 0.44;
  const fSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.0, 10), pbr.cobaltMasonryMat);
  fSpire.position.y = 0.68;
  addInkEdges(fSpire, inkMat, 32);
  const fOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), pbr.goldMat);
  fOrb.position.y = 1.38;
  const fGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#38E8D8',
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  fGlow.rotation.x = -Math.PI / 2;
  fGlow.position.y = 0.02;
  fountain.add(fRim, fRingCap, fWater, fSpire, fOrb, fGlow);

  // Bram's Forge Hearth & Horned Anvil (North-East)
  const forge = new THREE.Group();
  forge.position.set(5.6, 0, -1.5);
  group.add(forge);
  addContactShadow(forge, pbr.softShadowTex, 0.1, 0, 1.85, 1.65, 0.5);

  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.85, 1.5), pbr.cobaltMasonryMat);
  hearth.position.set(0.3, 0.925, -0.4);
  hearth.castShadow = true;
  hearth.receiveShadow = true;
  addInkEdges(hearth, inkMat, 32);
  const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 1.66), pbr.forgedIronMat);
  hoodTrim.position.set(0.3, 1.88, -0.4);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 0.95, 8), pbr.stoneTrimMat);
  chimney.position.set(0.3, 2.42, -0.4);
  addInkEdges(chimney, inkMat, 32);
  const chimneyRim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.14, 8), pbr.forgedIronMat);
  chimneyRim.position.set(0.3, 2.94, -0.4);

  // Recessed arched iron furnace opening facing South-West toward hero & Bram
  const furnaceFrame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.26), pbr.forgedIronMat);
  furnaceFrame.position.set(0.05, 0.5, 0.28);
  const fireBed = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.22), pbr.emberBedMat);
  fireBed.position.set(0.05, 0.44, 0.34);

  // Horned anvil on timber stump + quench barrel + weapon rack
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.34, 10), pbr.woodDarkMat);
  stump.position.set(-0.66, 0.17, 0.48);
  const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.36), pbr.forgedIronMat);
  anvilBase.position.set(-0.66, 0.46, 0.48);
  anvilBase.castShadow = true;
  const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 6), pbr.forgedIronMat);
  anvilHorn.rotation.z = Math.PI / 2;
  anvilHorn.position.set(-1.12, 0.5, 0.48);
  const quenchBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.62, 10), pbr.woodMat);
  quenchBarrel.position.set(1.28, 0.31, 0.55);
  quenchBarrel.castShadow = false;
  const quenchWater = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), pbr.waterMat);
  quenchWater.rotation.x = -Math.PI / 2;
  quenchWater.position.set(1.28, 0.63, 0.55);

  const forgeGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#FF7B2E',
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  forgeGlow.rotation.x = -Math.PI / 2;
  forgeGlow.position.set(-0.35, 0.02, 0.3);
  forge.add(
    hearth,
    hoodTrim,
    chimney,
    chimneyRim,
    furnaceFrame,
    fireBed,
    stump,
    anvilBase,
    anvilHorn,
    quenchBarrel,
    quenchWater,
    forgeGlow,
  );

  // Cleo's Alchemy Cart (South-East) with spoked wheels, rear canopy & exposed front glowing flask shelf
  const alchemy = new THREE.Group();
  alchemy.position.set(5.2, 0, 3.4);
  group.add(alchemy);
  addContactShadow(alchemy, pbr.softShadowTex, 0, 0, 1.65, 1.35, 0.48);

  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.82, 1.18), pbr.woodMat);
  cartBody.position.y = 0.56;
  cartBody.castShadow = true;
  addInkEdges(cartBody, inkMat, 32);

  for (const wx of [-0.62, 0.62]) {
    for (const wz of [-0.64, 0.64]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 8, 16), pbr.woodDarkMat);
      wheel.position.set(wx, 0.3, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 8), pbr.forgedIronMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.3, wz);
      alchemy.add(wheel, hub);
    }
  }

  for (const px of [-0.74, 0.74]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 6), pbr.woodDarkMat);
    post.position.set(px, 1.56, -0.46);
    alchemy.add(post);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.78), pbr.runnerClothMat);
  canopy.position.set(0, 2.15, -0.22);
  canopy.rotation.x = -0.22;
  addInkEdges(canopy, inkMat, 32);
  alchemy.add(canopy);

  const alembicPot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pbr.copperMat);
  alembicPot.position.set(-0.48, 1.15, 0.22);
  const alembicNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.32, 8), pbr.copperMat);
  alembicNeck.position.set(-0.48, 1.4, 0.22);
  const potionA = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), pbr.tealGlowMat);
  potionA.position.set(0.02, 1.22, 0.28);
  const potionB = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), pbr.goldMat);
  potionB.position.set(0.46, 1.18, 0.22);
  const potionC = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), pbr.crimsonGlowMat);
  potionC.position.set(0.26, 1.14, -0.26);
  const alchGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 3.8),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#38E8D8',
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  alchGlow.rotation.x = -Math.PI / 2;
  alchGlow.position.y = 0.02;
  alchemy.add(cartBody, alembicPot, alembicNeck, potionA, potionB, potionC, alchGlow);

  // South-West Forgotten Rift Obelisk: carved basalt tiers + crimson rune inlay + fractured crystal monolith
  const riftGroup = new THREE.Group();
  riftGroup.position.set(-5.2, 0, 5.2);
  group.add(riftGroup);
  addContactShadow(riftGroup, pbr.softShadowTex, 0, 0, 1.65, 1.65, 0.55);

  const riftStep = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.38, 0.24, 12), pbr.cobaltMasonryMat);
  riftStep.position.y = 0.12;
  riftStep.receiveShadow = true;
  addInkEdges(riftStep, inkMat, 32);
  const riftPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.96, 0.28, 10), pbr.stoneTrimMat);
  riftPlinth.position.y = 0.36;
  riftPlinth.receiveShadow = true;
  addInkEdges(riftPlinth, inkMat, 32);
  const riftFloorSigil = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1.06, 24),
    new THREE.MeshBasicMaterial({
      color: '#F43F5E',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  riftFloorSigil.rotation.x = -Math.PI / 2;
  riftFloorSigil.position.y = 0.25;

  const riftShardA = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 1.35, 6), pbr.obsidianMat);
  riftShardA.position.set(-0.46, 1.3, -0.08);
  riftShardA.rotation.z = 0.18;
  addInkEdges(riftShardA, inkMat, 32);
  const riftShardB = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, 1.22, 6), pbr.obsidianMat);
  riftShardB.position.set(0.46, 1.24, 0.12);
  riftShardB.rotation.z = -0.18;
  addInkEdges(riftShardB, inkMat, 32);
  const riftCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), pbr.crimsonGlowMat);
  riftCore.position.set(0, 1.5, 0);
  const riftTorus = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 28), pbr.crimsonGlowMat);
  riftTorus.position.set(0, 1.5, 0);
  const riftGlowPool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#F43F5E',
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  riftGlowPool.rotation.x = -Math.PI / 2;
  riftGlowPool.position.y = 0.03;
  riftGroup.add(
    riftStep,
    riftPlinth,
    riftFloorSigil,
    riftShardA,
    riftShardB,
    riftCore,
    riftTorus,
    riftGlowPool,
  );

  // Interactive zone beacons
  const makeBeacon = (x: number, z: number, color: string) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.18, 28),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.035, z);
    group.add(ring);
    return ring;
  };
  const beacons = [
    makeBeacon(0, -4.4, '#38E8D8'),
    makeBeacon(-3.4, 0.4, '#FFAA4C'),
    makeBeacon(4.2, -1.2, '#FF7B2E'),
    makeBeacon(4.0, 3.1, '#38E8D8'),
    makeBeacon(-3.8, 4.4, '#F43F5E'),
  ];

  // Swaying sculpted cypresses in stone planters
  const trees: THREE.Group[] = [];
  for (const [tx, tz] of [
    [-7.6, -7.6],
    [7.6, -7.6],
    [7.6, 7.6],
    [-7.6, 7.6],
  ]) {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    addContactShadow(tree, pbr.softShadowTex, 0, 0, 1.05, 1.05, 0.5);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 0.5, 10), pbr.cobaltMasonryMat);
    pot.position.y = 0.25;
    addInkEdges(pot, inkMat, 32);
    tree.add(pot);
    for (let t = 0; t < 3; t++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.84 - t * 0.18, 0.94, 8), pbr.foliageMat);
      cone.position.y = 0.96 + t * 0.58;
      cone.castShadow = true;
      addInkEdges(cone, inkMat, 32);
      tree.add(cone);
    }
    group.add(tree);
    trees.push(tree);
  }

  // Instanced ground pebbles & moss tufts around terrace perimeter
  const pebbleSpots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[] = [];
  const mossSpots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[] = [];
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const rad = 7.4 + (i % 3) * 0.58;
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad;
    pebbleSpots.push({
      x: px,
      y: 0.04,
      z: pz,
      scale: 0.75 + (i % 4) * 0.15,
      rotY: i * 1.1,
      color: i % 2 === 0 ? '#4A5B88' : '#323F63',
    });
    if (i % 2 === 0) {
      mossSpots.push({
        x: px * 0.94,
        y: 0.03,
        z: pz * 0.94,
        scale: 0.8 + (i % 3) * 0.18,
        rotY: i * 0.8,
        color: i % 4 === 0 ? '#2D7D72' : '#1E5450',
      });
    }
  }
  const pebbleGeo = new THREE.DodecahedronGeometry(0.11, 0);
  const mossGeo = new THREE.ConeGeometry(0.14, 0.18, 5);
  addInstancedScatter(group, pebbleGeo, pbr.stoneTrimMat, pebbleSpots);
  addInstancedScatter(group, mossGeo, pbr.mossMat, mossSpots);

  const smokeTex = createRadialGlowTexture(
    'rgba(220,230,248,0.65)',
    'rgba(165,180,210,0.24)',
    'rgba(0,0,0,0)',
    64,
  );
  const courtyardSmoke = createSmokeEmitterSystem(
    [
      { x: 5.9, y: 3.05, z: -1.9 },
      { x: -8.95, y: 1.45, z: -8.95 },
      { x: 8.95, y: 1.45, z: -8.95 },
      { x: 8.95, y: 1.45, z: 8.95 },
      { x: -8.95, y: 1.45, z: 8.95 },
    ],
    smokeTex,
    '#B8C7E0',
    6,
    2.4,
    0.78,
  );
  if (courtyardSmoke) group.add(courtyardSmoke.points);

  // Distance-LOD list for fine perimeter foliage/brazier LineSegments
  const courtyardLodEntries: { obj: THREE.Object3D; x: number; z: number; maxDistSq: number }[] = [];
  for (const t of trees) {
    t.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        courtyardLodEntries.push({ obj: child, x: t.position.x, z: t.position.z, maxDistSq: 23 * 23 });
      }
    });
  }

  return {
    group,
    update(elapsed, _exitPortalOpen, _chestsOpened, camX = 0, camZ = 0, extra) {
      parallax.update(elapsed, camX, camZ);
      pbr.waterRippleTex.offset.x = (elapsed * 0.04) % 1;
      pbr.waterRippleTex.offset.y = (elapsed * 0.03) % 1;
      courtyardSmoke?.update(elapsed);

      for (let i = 0; i < courtyardLodEntries.length; i++) {
        const entry = courtyardLodEntries[i];
        const dx = entry.x - camX;
        const dz = entry.z - camZ;
        entry.obj.visible = dx * dx + dz * dz <= entry.maxDistSq;
      }

      prestigeGroup.visible = Boolean(extra?.prestigeBanners);
      if (prestigeGroup.visible) {
        prestigeGroup.rotation.z = Math.sin(elapsed * 3.5) * 0.03;
      }
      outerAstrolabe.rotation.z = elapsed * 0.45;
      innerAstrolabe.rotation.z = -elapsed * 0.72;
      portalVeilMat.opacity = 0.4 + Math.sin(elapsed * 2.8) * 0.12;
      gateBeamMat.opacity = 0.2 + Math.sin(elapsed * 2.2) * 0.06;
      portalHalo.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.08);
      fOrb.rotation.y = elapsed * 1.4;
      fOrb.position.y = 1.38 + Math.sin(elapsed * 3.1) * 0.08;
      potionA.rotation.y = elapsed * 1.2;
      potionA.position.y = 1.2 + Math.sin(elapsed * 2.6) * 0.05;
      potionB.rotation.y = -elapsed * 1.0;
      shopLantern.position.y = 1.76 + Math.sin(elapsed * 3.2) * 0.04;
      fireBed.scale.setScalar(1 + Math.sin(elapsed * 9) * 0.05);
      forgeGlow.scale.setScalar(1 + Math.sin(elapsed * 7) * 0.07);
      for (let i = 0; i < brazierFlames.length; i++) {
        brazierFlames[i].scale.set(
          0.8 + Math.sin(elapsed * 8 + i) * 0.1,
          1.45 + Math.sin(elapsed * 11 + i * 2) * 0.28,
          0.8,
        );
        brazierFlames[i].rotation.y = elapsed * 2 + i;
      }
      riftCore.rotation.y = elapsed * 1.65;
      riftCore.position.y = 1.58 + Math.sin(elapsed * 3.0) * 0.12;
      riftTorus.rotation.z = -elapsed * 0.9;
      riftTorus.rotation.x = Math.sin(elapsed * 1.4) * 0.35;
      riftShardA.position.y = 1.6 + Math.sin(elapsed * 2.2 + 0.5) * 0.08;
      riftShardB.position.y = 1.5 + Math.sin(elapsed * 2.2 + 1.8) * 0.08;
      for (let i = 0; i < beacons.length; i++) {
        beacons[i].scale.setScalar(1 + Math.sin(elapsed * 3 + i) * 0.07);
      }
      for (let i = 0; i < trees.length; i++) {
        trees[i].rotation.z = Math.sin(elapsed * 1.35 + i * 1.4) * 0.035;
        trees[i].scale.y = 1 + Math.sin(elapsed * 1.8 + i) * 0.025;
      }
    },
    dispose() {
      smokeTex.dispose();
      pbr.dispose();
    },
  };
}

export interface DungeonWorldOptions {
  week?: number;
  dungeonMode?: DungeonMode;
  roomType?: RoomType;
  biome?: RoomBiomeTag;
  layoutKind?: RoomLayoutKind;
  roomIndex?: number;
  doors?: DoorDir[];
  obstacles?: ObstacleDef[];
  hasExitPortal?: boolean;
  arenaHalfExtent?: number;
}

interface RoomVisualTheme {
  biome: RoomBiomeTag;
  decorKind: 'ice' | 'fire' | 'ruins' | 'vault' | 'citadel';
  floorTop: string;
  floorBot: string;
  seamRgba: string;
  mossRgba: string;
  accent: string;
  trenchColor: string;
  trenchEmissive: string;
  lighting: ThemeLighting;
}

function resolveDungeonRoomTheme(
  roomType: RoomType,
  _roomIndex: number,
  _week: number,
  mode: DungeonMode = 'gate',
  biome: RoomBiomeTag = 'ruins',
): RoomVisualTheme {
  if (roomType === 'boss') {
    return {
      biome,
      decorKind: 'citadel',
      floorTop: mode === 'rift' ? '#2A0E22' : '#2D121A',
      floorBot: '#12060B',
      seamRgba: 'rgba(255,59,92,0.28)',
      mossRgba: 'rgba(180,32,64,0.16)',
      accent: '#FF3B5C',
      trenchColor: '#5C1124',
      trenchEmissive: '#B8143B',
      lighting: {
        bg: '#13050A',
        fog: '#13050A',
        keyColor: '#FFB0BE',
        keyIntensity: 1.85,
        hemiSky: '#7A3048',
        hemiGround: '#1B0912',
        hemiIntensity: 0.72,
        rimColor: '#FF3B5C',
        spotColor: '#FF4D6D',
      },
    };
  }
  if (biome === 'ice') {
    return {
      biome,
      decorKind: 'ice',
      floorTop: roomType === 'treasure' ? '#1B345E' : '#14284E',
      floorBot: '#09142B',
      seamRgba: 'rgba(96, 218, 255, 0.28)',
      mossRgba: 'rgba(56, 232, 216, 0.16)',
      accent: roomType === 'treasure' ? '#60EFFF' : '#38E8D8',
      trenchColor: '#1B5E86',
      trenchEmissive: '#1696C8',
      lighting: {
        bg: '#071124',
        fog: '#071124',
        keyColor: '#BEEBFF',
        keyIntensity: 1.82,
        hemiSky: '#4478B8',
        hemiGround: '#0C1730',
        hemiIntensity: 0.76,
        rimColor: '#38E8D8',
        spotColor: '#5EEAD4',
      },
    };
  }
  if (biome === 'fire') {
    return {
      biome,
      decorKind: 'fire',
      floorTop: roomType === 'treasure' ? '#3B2316' : '#311916',
      floorBot: '#150908',
      seamRgba: 'rgba(255, 118, 56, 0.28)',
      mossRgba: 'rgba(214, 72, 28, 0.16)',
      accent: roomType === 'treasure' ? '#F4B942' : '#FF7B42',
      trenchColor: '#7A200E',
      trenchEmissive: '#D84315',
      lighting: {
        bg: '#150807',
        fog: '#150807',
        keyColor: '#FFD0A6',
        keyIntensity: 1.84,
        hemiSky: '#8A4836',
        hemiGround: '#1D0D0A',
        hemiIntensity: 0.74,
        rimColor: '#FF6E38',
        spotColor: '#FF9E44',
      },
    };
  }
  // 'ruins'
  return {
    biome: 'ruins',
    decorKind: roomType === 'treasure' ? 'vault' : 'ruins',
    floorTop: mode === 'rift' ? '#23173B' : '#172E29',
    floorBot: '#091614',
    seamRgba: 'rgba(52, 211, 153, 0.24)',
    mossRgba: 'rgba(42, 175, 130, 0.24)',
    accent: roomType === 'treasure' ? '#F4B942' : mode === 'rift' ? '#C084FC' : '#2DD4BF',
    trenchColor: '#0F4D46',
    trenchEmissive: '#10786B',
    lighting: {
      bg: mode === 'rift' ? '#11071C' : '#081514',
      fog: mode === 'rift' ? '#11071C' : '#081514',
      keyColor: mode === 'rift' ? '#E4B8FF' : '#C2F7E4',
      keyIntensity: 1.78,
      hemiSky: mode === 'rift' ? '#6D4299' : '#3C7E70',
      hemiGround: '#0D1C1A',
      hemiIntensity: 0.76,
      rimColor: mode === 'rift' ? '#C084FC' : '#2DD4BF',
      spotColor: '#38E8D8',
    },
  };
}

export function buildDungeonWorld(
  inkMat: THREE.LineBasicMaterial,
  maxAniso: number,
  chestPositions: { x: number; z: number; isSecret?: boolean }[],
  trapPositions: { x: number; z: number }[] = [],
  hasAltar = false,
  destructiblePositions: { x: number; z: number; kind: 'urn' | 'crystal' }[] = [],
  opts: DungeonWorldOptions = {},
): AnimatedWorldHandle {
  const group = new THREE.Group();
  const pbr = createPbrLibrary(maxAniso);

  const roomType = opts.roomType ?? 'combat';
  const biome: RoomBiomeTag = opts.biome ?? 'ruins';
  const layoutKind: RoomLayoutKind = opts.layoutKind ?? 'pillars';
  const roomIndex = opts.roomIndex ?? 0;
  const theme = resolveDungeonRoomTheme(roomType, roomIndex, opts.week ?? 1, opts.dungeonMode ?? 'gate', biome);
  const doors = opts.doors ?? [];
  const obstacles = opts.obstacles ?? [];
  const hasExitPortal = opts.hasExitPortal ?? true;
  const half = opts.arenaHalfExtent ?? 20.5;
  const roomHeightRef = { biome, layoutKind };

  const glowTex = createRadialGlowTexture(
    'rgba(255,255,255,0.9)',
    'rgba(56,232,216,0.28)',
    'rgba(0,0,0,0)',
  );
  const smokeTex = createRadialGlowTexture(
    'rgba(220,230,248,0.6)',
    'rgba(155,170,200,0.22)',
    'rgba(0,0,0,0)',
    64,
  );
  const parallax = createParallaxBackdrop(true, glowTex, pbr, theme.accent);
  group.add(parallax.group);

  const floorMat = pbr.createStoneFloorMaterial(
    theme.floorTop,
    theme.floorBot,
    theme.floorTop,
    theme.seamRgba,
    theme.mossRgba,
    10,
  );
  const accentGlowMat = new THREE.MeshStandardMaterial({
    color: theme.accent,
    emissive: theme.accent,
    emissiveIntensity: 0.85,
    roughness: 0.24,
  });
  const crystalJewelMat = new THREE.MeshPhysicalMaterial({
    color: theme.accent,
    emissive: theme.accent,
    emissiveIntensity: 0.34,
    roughness: 0.14,
    metalness: 0.34,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    iridescence: 0.85,
    transparent: true,
    opacity: 0.94,
  });

  const slabSize = half * 2 + 0.8;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(slabSize, 0.36, slabSize), floorMat);
  slab.position.y = layoutKind === 'bridge' ? -0.36 : -0.18;
  slab.receiveShadow = true;
  addInkEdges(slab, inkMat, 32);
  group.add(slab);

  // Multi-Level Terrain Architecture (Terraced Dais + Ramps OR Elevated Stone Bridge + Biome Trenches)
  if (layoutKind === 'terraced') {
    const lowerStep = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.27, 12.2), pbr.cobaltMasonryMat);
    lowerStep.position.y = 0.135;
    lowerStep.receiveShadow = true;
    addInkEdges(lowerStep, inkMat, 34);

    const upperDais = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.54, 10.8), floorMat);
    upperDais.position.y = 0.27;
    upperDais.receiveShadow = true;
    upperDais.castShadow = true;
    addInkEdges(upperDais, inkMat, 32);

    const daisTrim = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.08, 11.0), pbr.stoneTrimMat);
    daisTrim.position.y = 0.5;
    daisTrim.receiveShadow = true;
    group.add(lowerStep, upperDais, daisTrim);

    // 4 walkable stone ramps connecting courtyard floor to the +0.54m terrace
    const rampLen = Math.hypot(1.6, 0.54);
    const rampPitch = Math.atan2(0.54, 1.6);
    const rampGeo = new THREE.BoxGeometry(4.2, 0.16, rampLen);
    for (const [rx, rz, rotY, tiltSign] of [
      [0, 6.2, 0, -1],
      [0, -6.2, 0, 1],
      [6.2, 0, Math.PI / 2, -1],
      [-6.2, 0, Math.PI / 2, 1],
    ] as const) {
      const ramp = new THREE.Mesh(rampGeo, pbr.stoneTrimMat);
      ramp.position.set(rx, 0.24, rz);
      ramp.rotation.y = rotY;
      ramp.rotation.x = tiltSign * rampPitch;
      ramp.receiveShadow = true;
      addInkEdges(ramp, inkMat, 34);
      group.add(ramp);
    }
  } else if (layoutKind === 'bridge') {
    // Side outer platforms at y = 0 + glowing recessed channels at y = -0.18 + raised center causeway at y = +0.36
    const outerSideGeo = new THREE.BoxGeometry(8.5, 0.36, slabSize);
    for (const sx of [-1, 1]) {
      const sideDeck = new THREE.Mesh(outerSideGeo, floorMat);
      sideDeck.position.set(sx * 16.5, -0.18, 0);
      sideDeck.receiveShadow = true;
      addInkEdges(sideDeck, inkMat, 34);
      group.add(sideDeck);
    }
    // Door approach landing decks at North & South thresholds (y = 0)
    const endApronGeo = new THREE.BoxGeometry(24.0, 0.36, 6.2);
    for (const sz of [-1, 1]) {
      const apron = new THREE.Mesh(endApronGeo, floorMat);
      apron.position.set(0, -0.18, sz * 17.3);
      apron.receiveShadow = true;
      addInkEdges(apron, inkMat, 34);
      group.add(apron);
    }
    // Recessed biome trench glowing strips (frost ice / molten magma / emerald moss water)
    const trenchMat = new THREE.MeshStandardMaterial({
      color: theme.trenchColor,
      emissive: theme.trenchEmissive,
      emissiveIntensity: 0.72,
      roughness: 0.16,
      metalness: 0.22,
    });
    const trenchGeo = new THREE.PlaneGeometry(6.4, 27.6);
    for (const sx of [-1, 1]) {
      const trench = new THREE.Mesh(trenchGeo, trenchMat);
      trench.rotation.x = -Math.PI / 2;
      trench.position.set(sx * 8.1, -0.175, 0);
      group.add(trench);
    }
    // Elevated central stone causeway bridge (y = 0.36)
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.56, 27.6), floorMat);
    bridgeDeck.position.set(0, 0.08, 0);
    bridgeDeck.receiveShadow = true;
    bridgeDeck.castShadow = true;
    addInkEdges(bridgeDeck, inkMat, 32);
    const bridgeCurbGeo = new THREE.BoxGeometry(0.32, 0.14, 27.6);
    for (const sx of [-1, 1]) {
      const bCurb = new THREE.Mesh(bridgeCurbGeo, pbr.stoneTrimMat);
      bCurb.position.set(sx * 3.55, 0.42, 0);
      group.add(bCurb);
    }
    // Sloped North & South bridge approach ramps
    const bRampGeo = new THREE.BoxGeometry(7.2, 0.16, 1.8);
    for (const sz of [-1, 1]) {
      const bRamp = new THREE.Mesh(bRampGeo, pbr.stoneTrimMat);
      bRamp.position.set(0, 0.16, sz * 14.5);
      bRamp.rotation.x = sz * Math.atan2(0.36, 1.4);
      bRamp.receiveShadow = true;
      group.add(bRamp);
    }
    group.add(bridgeDeck);
  }

  // Shared static geometries for repeated dungeon props (cuts draw/dispose overhead & shares EdgesGeometry)
  const curbZGeo = new THREE.BoxGeometry(slabSize + 0.2, 0.34, 0.48);
  const curbXGeo = new THREE.BoxGeometry(0.48, 0.34, slabSize - 0.6);
  const colBaseGeo = new THREE.CylinderGeometry(0.88, 0.98, 0.32, 8);
  const colShaftGeo = new THREE.CylinderGeometry(0.68, 0.78, 2.85, 10);
  const colCapGeo = new THREE.BoxGeometry(1.45, 0.28, 1.45);
  const colBandGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.2, 10);
  const colBezelGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.12, 8);
  const colOctGeo = new THREE.OctahedronGeometry(0.28, 0);
  const shelfFrameGeo = new THREE.BoxGeometry(2.6, 2.75, 0.65);
  const shelfBooksGeo = new THREE.BoxGeometry(2.25, 0.42, 0.48);
  const rackPilGeo = new THREE.BoxGeometry(0.95, 2.9, 0.7);
  const rackBannerGeo = new THREE.BoxGeometry(0.56, 1.45, 0.08);
  const vaultPedGeo = new THREE.BoxGeometry(1.4, 0.72, 0.85);
  const vaultIngotGeo = new THREE.OctahedronGeometry(0.32, 0);
  const brazierStandGeo = new THREE.CylinderGeometry(0.42, 0.54, 0.92, 8);
  const brazierBowlGeo = new THREE.CylinderGeometry(0.46, 0.26, 0.28, 8);
  const brazierCoalGeo = new THREE.SphereGeometry(0.3, 8, 6);
  const brazierFlameGeo = new THREE.OctahedronGeometry(0.22, 0);
  const haloPlaneGeo = new THREE.PlaneGeometry(3.8, 3.8);
  const jambGeo = new THREE.BoxGeometry(0.58, 2.4, 0.72);
  const sconceGeo = new THREE.OctahedronGeometry(0.11, 0);
  const lintelGeo = new THREE.BoxGeometry(3.25, 0.5, 0.84);
  const keystoneGeo = new THREE.OctahedronGeometry(0.2, 0);
  const barGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6);
  const veilGeo = new THREE.PlaneGeometry(1.88, 2.28);
  const padRingGeo = new THREE.RingGeometry(0.65, 1.12, 24);
  const cornerRockGeo = new THREE.DodecahedronGeometry(0.52, 0);
  const cornerCryGeoA = new THREE.ConeGeometry(0.26, 1.05, 6);
  const cornerCryGeoB = new THREE.ConeGeometry(0.26, 1.33, 6);
  const cornerCryGeoC = new THREE.ConeGeometry(0.26, 1.61, 6);
  const beamGeo = new THREE.ConeGeometry(1.9, 6.2, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    map: pbr.lightBeamTex,
    color: theme.accent,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Carved perimeter curb wall & cornice so the enlarged chamber feels grounded & architectural
  const curbPos = half + 0.25;
  for (const s of [-1, 1]) {
    const curbZ = new THREE.Mesh(curbZGeo, pbr.cobaltMasonryMat);
    curbZ.position.set(0, 0.17, s * curbPos);
    curbZ.receiveShadow = true;
    curbZ.castShadow = false;
    group.add(curbZ);

    const curbX = new THREE.Mesh(curbXGeo, pbr.cobaltMasonryMat);
    curbX.position.set(s * curbPos, 0.17, 0);
    curbX.receiveShadow = true;
    curbX.castShadow = false;
    group.add(curbX);
  }

  // Instanced carved stone crenellations / merlons along dungeon perimeter curbs (1 draw call for 24+ blocks)
  const merlonSpots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[] = [];
  const stepDist = Math.max(4.5, (half - 3.5) / 3);
  for (let idx = -3; idx <= 3; idx++) {
    if (idx === 0) continue; // Keep door thresholds wide clear
    const pos = idx * stepDist;
    if (Math.abs(pos) < half - 1.5) {
      merlonSpots.push({ x: pos, y: 0.48, z: -curbPos, scale: 1, rotY: 0, color: '#C8D3E6' });
      merlonSpots.push({ x: pos, y: 0.48, z: curbPos, scale: 1, rotY: 0, color: '#C8D3E6' });
      merlonSpots.push({ x: -curbPos, y: 0.48, z: pos, scale: 1, rotY: Math.PI / 2, color: '#B5C4DC' });
      merlonSpots.push({ x: curbPos, y: 0.48, z: pos, scale: 1, rotY: Math.PI / 2, color: '#B5C4DC' });
    }
  }
  addInstancedScatter(group, new THREE.BoxGeometry(0.95, 0.34, 0.56), pbr.stoneTrimMat, merlonSpots);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(half * 1.62, half * 1.28, 2.6, 8),
    pbr.cobaltDarkMat,
  );
  base.rotation.y = Math.PI / 8;
  base.position.y = -1.65;
  group.add(base);

  // Room Floor Sigil Inlay (elevated flush with center terrain) + Center Volumetric Shaft
  const centerFloorY = getRoomGroundY(roomHeightRef, 0, 0);
  if (roomType === 'boss' || roomType === 'shrine' || roomType === 'treasure' || roomType === 'start') {
    const sigilColor = theme.accent;
    const outerR = roomType === 'boss' ? 4.2 : 3.2;
    const sigilRing = new THREE.Mesh(
      new THREE.RingGeometry(outerR - 0.35, outerR, 36),
      new THREE.MeshBasicMaterial({
        color: sigilColor,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sigilRing.rotation.x = -Math.PI / 2;
    sigilRing.position.y = centerFloorY + 0.025;
    const innerSigil = new THREE.Mesh(
      new THREE.RingGeometry(outerR * 0.52, outerR * 0.58, 24),
      new THREE.MeshBasicMaterial({
        color: sigilColor,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    innerSigil.rotation.x = -Math.PI / 2;
    innerSigil.position.y = centerFloorY + 0.024;
    group.add(sigilRing, innerSigil);

    if (roomType === 'shrine' || roomType === 'boss' || roomType === 'treasure') {
      const centerBeam = new THREE.Mesh(beamGeo, beamMat);
      centerBeam.position.set(0, centerFloorY + 3.1, roomType === 'boss' ? -11.5 : 0);
      group.add(centerBeam);
    }
  }

  // Carved fluted rune columns / bridge piers / ruin monoliths aligned to terrain elevation
  const capCrystals: THREE.Mesh[] = [];
  for (const ob of obstacles) {
    const obY = getRoomGroundY(roomHeightRef, ob.x, ob.z);
    addContactShadow(group, pbr.softShadowTex, ob.x, ob.z, 1.15, 1.15, 0.56);
    const colBase = new THREE.Mesh(colBaseGeo, pbr.stoneTrimMat);
    colBase.position.set(ob.x, obY + 0.16, ob.z);
    colBase.receiveShadow = true;
    addInkEdges(colBase, inkMat, 32);

    const col = new THREE.Mesh(colShaftGeo, pbr.cobaltMasonryMat);
    col.position.set(ob.x, obY + 1.65, ob.z);
    col.castShadow = true;
    col.receiveShadow = true;
    addInkEdges(col, inkMat, 34);

    const colCap = new THREE.Mesh(colCapGeo, pbr.stoneTrimMat);
    colCap.position.set(ob.x, obY + 3.12, ob.z);
    addInkEdges(colCap, inkMat, 32);

    const band = new THREE.Mesh(colBandGeo, accentGlowMat);
    band.position.set(ob.x, obY + 1.72, ob.z);

    const capBezel = new THREE.Mesh(colBezelGeo, pbr.forgedIronMat);
    capBezel.position.set(ob.x, obY + 3.31, ob.z);
    addInkEdges(capBezel, inkMat, 32);

    const cap = new THREE.Mesh(colOctGeo, crystalJewelMat);
    cap.position.set(ob.x, obY + 3.64, ob.z);
    cap.userData.baseY = obY + 3.64;
    addInkEdges(cap, inkMat, 36);
    capCrystals.push(cap);
    group.add(colBase, col, colCap, band, capBezel, cap);
  }

  // Room-Specific Architectural Perimeter Decor (kept out of door paths |coord| >= 5.5)
  const roomFlames: THREE.Mesh[] = [];
  const smokeOrigins: { x: number; y: number; z: number }[] = [];
  const haloSharedMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: theme.accent,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const addDungeonBrazier = (bx: number, bz: number, flameMat: THREE.Material) => {
    const bg = new THREE.Group();
    bg.position.set(bx, 0, bz);
    addContactShadow(bg, pbr.softShadowTex, 0, 0, 0.8, 0.8, 0.45);
    const stand = new THREE.Mesh(brazierStandGeo, pbr.stoneTrimMat);
    stand.position.y = 0.46;
    stand.castShadow = true;
    addInkEdges(stand, inkMat, 32);
    const bowl = new THREE.Mesh(brazierBowlGeo, pbr.forgedIronMat);
    bowl.position.y = 1.04;
    const coals = new THREE.Mesh(brazierCoalGeo, pbr.emberBedMat);
    coals.scale.set(1, 0.55, 1);
    coals.position.y = 1.15;
    const flame = new THREE.Mesh(brazierFlameGeo, flameMat);
    flame.scale.set(0.85, 1.65, 0.85);
    flame.position.y = 1.42;
    roomFlames.push(flame);
    const halo = new THREE.Mesh(haloPlaneGeo, haloSharedMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.03;
    bg.add(stand, bowl, coals, flame, halo);
    group.add(bg);
    smokeOrigins.push({ x: bx, y: 1.6, z: bz });
  };

  const wallEdge = half - 0.85;
  const decorCoords: [number, number, number][] = [
    [-wallEdge, -10.5, Math.PI / 2],
    [-wallEdge, 10.5, Math.PI / 2],
    [wallEdge, -10.5, -Math.PI / 2],
    [wallEdge, 10.5, -Math.PI / 2],
    [-10.5, -wallEdge, 0],
    [10.5, -wallEdge, 0],
  ];

  // Glowing iron wall sconces framing the chamber perimeter for richer ambient color
  const sconceBracketGeo = new THREE.BoxGeometry(0.14, 0.52, 0.22);
  for (const [sx, sz, srot] of decorCoords) {
    const sGroup = new THREE.Group();
    sGroup.position.set(sx * 0.99, 2.2, sz * 0.99);
    sGroup.rotation.y = srot;
    const bracket = new THREE.Mesh(sconceBracketGeo, pbr.forgedIronMat);
    const sconceFlame = new THREE.Mesh(sconceGeo, theme.decorKind === 'citadel' ? pbr.crimsonGlowMat : accentGlowMat);
    sconceFlame.position.set(0, 0.28, 0.16);
    roomFlames.push(sconceFlame);
    sGroup.add(bracket, sconceFlame);
    group.add(sGroup);
  }

  if (theme.decorKind === 'ice') {
    // Glacial Ice Caverns: tall frosted sapphire crystal spires & icy plinths
    const iceSpireGeo = new THREE.ConeGeometry(0.45, 2.45, 6);
    for (let i = 0; i < decorCoords.length; i++) {
      const [dx, dz, rotY] = decorCoords[i];
      const ig = new THREE.Group();
      ig.position.set(dx, 0, dz);
      ig.rotation.y = rotY;
      const baseRock = new THREE.Mesh(cornerRockGeo, pbr.cobaltMasonryMat);
      baseRock.scale.set(1.55, 0.72, 1.35);
      baseRock.position.y = 0.22;
      const spireA = new THREE.Mesh(iceSpireGeo, crystalJewelMat);
      spireA.position.set(-0.22, 1.32, 0);
      spireA.rotation.z = 0.14;
      addInkEdges(spireA, inkMat, 36);
      const spireB = new THREE.Mesh(iceSpireGeo, accentGlowMat);
      spireB.scale.set(0.68, 0.74, 0.68);
      spireB.position.set(0.28, 1.0, 0.12);
      spireB.rotation.z = -0.22;
      ig.add(baseRock, spireA, spireB);
      group.add(ig);
    }
    addDungeonBrazier(-half + 3.0, -half + 3.0, pbr.tealGlowMat);
    addDungeonBrazier(half - 3.0, half - 3.0, pbr.tealGlowMat);
  } else if (theme.decorKind === 'fire' || theme.decorKind === 'citadel') {
    // Molten Volcanic / Citadel Hall: blazing corner iron braziers + obsidian war monoliths
    const bOff = half - 2.6;
    const fMat = theme.decorKind === 'citadel' ? pbr.crimsonGlowMat : pbr.emberGlowMat;
    addDungeonBrazier(-bOff, -bOff, fMat);
    addDungeonBrazier(bOff, -bOff, fMat);
    addDungeonBrazier(-bOff, bOff, fMat);
    addDungeonBrazier(bOff, bOff, fMat);
    for (const [dx, dz, rotY] of decorCoords) {
      const rack = new THREE.Group();
      rack.position.set(dx, 0, dz);
      rack.rotation.y = rotY;
      const pil = new THREE.Mesh(rackPilGeo, pbr.cobaltMasonryMat);
      pil.position.y = 1.45;
      pil.castShadow = true;
      addInkEdges(pil, inkMat, 32);
      const banner = new THREE.Mesh(
        rackBannerGeo,
        theme.decorKind === 'citadel' ? pbr.crimsonGlowMat : pbr.emberGlowMat,
      );
      banner.position.set(0, 1.75, 0.42);
      rack.add(pil, banner);
      group.add(rack);
    }
  } else if (theme.decorKind === 'vault') {
    // Gilded banners & ornate treasury plinths along walls
    for (const [dx, dz, rotY] of decorCoords) {
      const shrineBox = new THREE.Group();
      shrineBox.position.set(dx, 0, dz);
      shrineBox.rotation.y = rotY;
      const ped = new THREE.Mesh(vaultPedGeo, pbr.stoneTrimMat);
      ped.position.y = 0.36;
      addInkEdges(ped, inkMat, 32);
      const ingot = new THREE.Mesh(vaultIngotGeo, pbr.goldMat);
      ingot.position.y = 1.05;
      ingot.userData.baseY = 1.05;
      capCrystals.push(ingot);
      shrineBox.add(ped, ingot);
      group.add(shrineBox);
    }
    addDungeonBrazier(-half + 2.8, -half + 2.8, pbr.emberGlowMat);
    addDungeonBrazier(half - 2.8, half - 2.8, pbr.emberGlowMat);
  } else {
    // Overgrown Ancient Ruins: mossy broken pillars, bookshelves & glowing spore caps
    const mushSpots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[] = [];
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const rad = half - 2.2 - (i % 3) * 1.4;
      mushSpots.push({
        x: Math.cos(ang) * rad,
        y: 0.24,
        z: Math.sin(ang) * rad,
        scale: 0.9 + (i % 4) * 0.25,
        rotY: i * 1.1,
        color: i % 2 === 0 ? '#38E8D8' : '#2DD4BF',
      });
    }
    addInstancedScatter(group, new THREE.ConeGeometry(0.24, 0.34, 7), accentGlowMat, mushSpots);
    for (let i = 0; i < decorCoords.length; i++) {
      const [dx, dz, rotY] = decorCoords[i];
      const ruinGrp = new THREE.Group();
      ruinGrp.position.set(dx, 0, dz);
      ruinGrp.rotation.y = rotY;
      if (i % 2 === 0) {
        const frame = new THREE.Mesh(shelfFrameGeo, pbr.woodDarkMat);
        frame.position.y = 1.38;
        frame.castShadow = true;
        addInkEdges(frame, inkMat, 32);
        const mossCap = new THREE.Mesh(shelfBooksGeo, pbr.mossMat);
        mossCap.position.set(0, 2.75, 0);
        ruinGrp.add(frame, mossCap);
      } else {
        const brokenDrum = new THREE.Mesh(colShaftGeo, pbr.stoneTrimMat);
        brokenDrum.scale.set(0.85, 0.56, 0.85);
        brokenDrum.position.y = 0.8;
        brokenDrum.rotation.z = 0.12;
        addInkEdges(brokenDrum, inkMat, 32);
        const mossTop = new THREE.Mesh(colCapGeo, pbr.mossMat);
        mossTop.scale.set(0.8, 0.45, 0.8);
        mossTop.position.y = 1.62;
        ruinGrp.add(brokenDrum, mossTop);
      }
      group.add(ruinGrp);
    }
    addDungeonBrazier(-half + 3.0, -half + 3.0, pbr.tealGlowMat);
    addDungeonBrazier(half - 3.0, -half + 3.0, pbr.tealGlowMat);
  }

  // Perimeter Threshold Door Archways (N / S / E / W) with iron sconces & portcullis teeth
  const doorVisuals: {
    dir: DoorDir;
    veilMat: THREE.MeshBasicMaterial;
    padMat: THREE.MeshBasicMaterial;
    pad: THREE.Mesh;
    gateBars: THREE.Group;
  }[] = [];
  const dOff = half - 0.35;
  const doorCoordMap: Record<DoorDir, { x: number; z: number; rotY: number }> = {
    N: { x: 0, z: -dOff, rotY: 0 },
    S: { x: 0, z: dOff, rotY: Math.PI },
    E: { x: dOff, z: 0, rotY: -Math.PI / 2 },
    W: { x: -dOff, z: 0, rotY: Math.PI / 2 },
  };
  for (const dir of doors) {
    const dc = doorCoordMap[dir];
    const dg = new THREE.Group();
    dg.position.set(dc.x, 0, dc.z);
    dg.rotation.y = dc.rotY;

    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(jambGeo, pbr.cobaltMasonryMat);
      jamb.position.set(side * 1.2, 1.2, 0);
      jamb.castShadow = true;
      addInkEdges(jamb, inkMat, 32);
      const sconce = new THREE.Mesh(sconceGeo, pbr.emberGlowMat);
      sconce.position.set(side * 1.2, 1.75, 0.44);
      dg.add(jamb, sconce);
    }
    const lintel = new THREE.Mesh(lintelGeo, pbr.stoneTrimMat);
    lintel.position.set(0, 2.55, 0);
    lintel.castShadow = true;
    addInkEdges(lintel, inkMat, 32);
    const doorKeystone = new THREE.Mesh(keystoneGeo, accentGlowMat);
    doorKeystone.position.set(0, 2.55, 0.45);
    dg.add(lintel, doorKeystone);

    const gateBars = new THREE.Group();
    for (let b = -2; b <= 2; b++) {
      const bar = new THREE.Mesh(barGeo, pbr.forgedIronMat);
      bar.position.set(b * 0.36, 1.12, 0);
      gateBars.add(bar);
    }
    dg.add(gateBars);

    const veilMat = new THREE.MeshBasicMaterial({
      color: '#FF3B5C',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const veil = new THREE.Mesh(veilGeo, veilMat);
    veil.position.set(0, 1.15, 0);
    dg.add(veil);

    const padMat = new THREE.MeshBasicMaterial({
      color: '#FF3B5C',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pad = new THREE.Mesh(padRingGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.04, 0.85);
    dg.add(pad);

    group.add(dg);
    doorVisuals.push({ dir, veilMat, padMat, pad, gateBars });
  }

  // Bioluminescent crystal clusters framing outer corners + floor bloom halos
  const clusters: THREE.Group[] = [];
  const kOff = half - 1.1;
  const cornerCrystalGeos = [cornerCryGeoA, cornerCryGeoB, cornerCryGeoC];
  for (const [kx, kz] of [
    [-kOff, -kOff],
    [kOff, -kOff],
    [-kOff, kOff],
    [kOff, kOff],
  ]) {
    const cg = new THREE.Group();
    cg.position.set(kx, 0, kz);
    addContactShadow(cg, pbr.softShadowTex, 0, 0, 1.0, 1.0, 0.5);
    const rockPad = new THREE.Mesh(cornerRockGeo, pbr.stoneTrimMat);
    rockPad.scale.set(1.2, 0.45, 1.2);
    rockPad.position.y = 0.14;
    cg.add(rockPad);
    for (let k = 0; k < 3; k++) {
      const crystal = new THREE.Mesh(cornerCrystalGeos[k], crystalJewelMat);
      crystal.position.set((k - 1) * 0.28, 0.58, (k % 2) * 0.14);
      crystal.rotation.z = (k - 1) * 0.24;
      addInkEdges(crystal, inkMat, 36);
      cg.add(crystal);
    }
    const halo = new THREE.Mesh(haloPlaneGeo, haloSharedMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.03;
    cg.add(halo);
    group.add(cg);
    clusters.push(cg);
  }

  // Instanced corner stone rubble & cracks
  const rubbleSpots: { x: number; y: number; z: number; scale: number; rotY: number; color: string }[] = [];
  const rubBase = half - 3.2;
  for (let i = 0; i < 32; i++) {
    const corner = i % 4;
    const sx = corner === 0 || corner === 2 ? -1 : 1;
    const sz = corner < 2 ? -1 : 1;
    rubbleSpots.push({
      x: sx * (rubBase + (i % 5) * 0.52),
      y: 0.05,
      z: sz * (rubBase - 0.2 + ((i + 2) % 5) * 0.52),
      scale: 0.72 + (i % 4) * 0.18,
      rotY: i * 1.37,
      color: i % 2 === 0 ? '#3A4A72' : '#263150',
    });
  }
  addInstancedScatter(group, new THREE.DodecahedronGeometry(0.14, 0), pbr.stoneTrimMat, rubbleSpots);

  // Interactive Rune Stun Trap Plates
  const trapPadGeo = new THREE.CylinderGeometry(1.06, 1.15, 0.08, 10);
  const trapRingGeo = new THREE.RingGeometry(0.62, 0.92, 20);
  const trapRings: { ring: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  for (const tp of trapPositions) {
    const ty = getRoomGroundY(roomHeightRef, tp.x, tp.z);
    const pad = new THREE.Mesh(trapPadGeo, pbr.cobaltMasonryMat);
    pad.position.set(tp.x, ty + 0.04, tp.z);
    addInkEdges(pad, inkMat, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#38E8D8',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(trapRingGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(tp.x, ty + 0.09, tp.z);
    group.add(pad, ring);
    trapRings.push({ ring, mat: ringMat });
  }

  // Risk Altar (Gild All Pack Relics 2x)
  let altarOrb: THREE.Mesh | null = null;
  let altarHalo: THREE.Mesh | null = null;
  if (hasAltar) {
    const altarGroup = new THREE.Group();
    const altarY = getRoomGroundY(roomHeightRef, 0, -5.6);
    altarGroup.position.set(0, altarY, -5.6);
    addContactShadow(altarGroup, pbr.softShadowTex, 0, 0, 1.35, 1.35, 0.55);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 1.02, 0.92, 8), pbr.cobaltMasonryMat);
    plinth.position.y = 0.46;
    plinth.castShadow = true;
    addInkEdges(plinth, inkMat, 32);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 16), pbr.goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.9;
    altarOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), pbr.goldMat);
    altarOrb.position.y = 1.38;
    altarHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: '#F4B942',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    altarHalo.rotation.x = -Math.PI / 2;
    altarHalo.position.y = 0.03;
    altarGroup.add(plinth, collar, altarOrb, altarHalo);
    group.add(altarGroup);
  }

  // Destructible LatheGeometry Amphora Urns & Faceted Iridescent Crystals
  const urnMat = new THREE.MeshPhysicalMaterial({
    color: '#C25B32',
    roughness: 0.58,
    metalness: 0.06,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: '#22DFD0',
    emissive: '#10A89C',
    emissiveIntensity: 1.15,
    roughness: 0.14,
    metalness: 0.3,
    clearcoat: 1.0,
    iridescence: 0.85,
    iridescenceIOR: 1.5,
  });
  const urnGeo = createAmphoraLatheGeometry(1.0);
  const urnBandGeo = new THREE.TorusGeometry(0.32, 0.025, 6, 14);
  const cryBaseGeo = new THREE.CylinderGeometry(0.34, 0.44, 0.22, 7);
  const cryShardGeo = new THREE.OctahedronGeometry(0.34, 0);
  const destructibleGroups: THREE.Group[] = [];
  for (const dp of destructiblePositions) {
    const dg = new THREE.Group();
    const dpY = getRoomGroundY(roomHeightRef, dp.x, dp.z);
    dg.position.set(dp.x, dpY, dp.z);
    addContactShadow(dg, pbr.softShadowTex, 0, 0, 0.46, 0.46, 0.48);
    if (dp.kind === 'urn') {
      const pot = new THREE.Mesh(urnGeo, urnMat);
      pot.castShadow = false;
      addInkEdges(pot, inkMat, 36);
      const band = new THREE.Mesh(urnBandGeo, pbr.goldMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.42;
      dg.add(pot, band);
    } else {
      const baseRock = new THREE.Mesh(cryBaseGeo, pbr.cobaltMasonryMat);
      baseRock.position.y = 0.11;
      addInkEdges(baseRock, inkMat, 32);
      const shard = new THREE.Mesh(cryShardGeo, crystalMat);
      shard.scale.set(0.75, 1.48, 0.75);
      shard.position.y = 0.64;
      addInkEdges(shard, inkMat, 32);
      dg.add(baseRock, shard);
    }
    group.add(dg);
    destructibleGroups.push(dg);
  }

  // Ornate Domed Treasure Chests with iron/gold straps
  const violetMat = new THREE.MeshPhysicalMaterial({
    color: '#7C3AED',
    emissive: '#5B21B6',
    emissiveIntensity: 0.78,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.65,
  });
  const domedLidGeo = createDomedChestLidGeometry(1.12, 0.26, 0.8);
  const chestBoxGeo = new THREE.BoxGeometry(1.1, 0.56, 0.78);
  const chestTrimGeo = new THREE.BoxGeometry(1.15, 0.1, 0.83);
  const chestLockGeo = new THREE.BoxGeometry(0.18, 0.2, 0.08);
  const chestStrapGeo = new THREE.BoxGeometry(0.14, 0.34, 0.84);
  const chestLids: THREE.Group[] = [];
  for (const ch of chestPositions) {
    const chestGroup = new THREE.Group();
    const chY = getRoomGroundY(roomHeightRef, ch.x, ch.z);
    chestGroup.position.set(ch.x, chY, ch.z);
    addContactShadow(chestGroup, pbr.softShadowTex, 0, 0, 0.82, 0.65, 0.55);

    const bodyMat = ch.isSecret ? violetMat : pbr.woodMat;
    const box = new THREE.Mesh(chestBoxGeo, bodyMat);
    box.position.y = 0.28;
    box.castShadow = true;
    addInkEdges(box, inkMat, 32);

    const trim = new THREE.Mesh(chestTrimGeo, pbr.goldMat);
    trim.position.y = 0.54;
    const lockPlate = new THREE.Mesh(chestLockGeo, pbr.goldMat);
    lockPlate.position.set(0, 0.48, 0.42);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.58, -0.36);
    const lidMesh = new THREE.Mesh(domedLidGeo, bodyMat);
    lidMesh.position.set(0, 0.14, 0.36);
    lidMesh.castShadow = true;
    addInkEdges(lidMesh, inkMat, 34);
    const lidStrap = new THREE.Mesh(chestStrapGeo, pbr.goldMat);
    lidStrap.position.set(0, 0.15, 0.36);
    lidPivot.add(lidMesh, lidStrap);

    chestLids.push(lidPivot);
    chestGroup.add(box, trim, lockPlate, lidPivot);
    group.add(chestGroup);
  }

  // Boss Room Extraction / Descend Gate Portal (aligned with sim.exitPortalZ = -11.5)
  let portalRing: THREE.Mesh | null = null;
  let portalMat: THREE.MeshBasicMaterial | null = null;
  if (hasExitPortal) {
    const exitGroup = new THREE.Group();
    exitGroup.position.set(0, getRoomGroundY(roomHeightRef, 0, -11.5), -11.5);
    addContactShadow(exitGroup, pbr.softShadowTex, 0, 0, 2.2, 2.2, 0.55);
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.15, 0.24, 16), pbr.cobaltMasonryMat);
    dais.position.y = 0.12;
    addInkEdges(dais, inkMat, 32);
    portalMat = new THREE.MeshBasicMaterial({
      color: '#38E8D8',
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), portalMat);
    portalDisc.rotation.x = -Math.PI / 2;
    portalDisc.position.y = 0.26;
    portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.08, 10, 32), pbr.tealGlowMat);
    portalRing.rotation.x = Math.PI / 2;
    portalRing.position.y = 0.27;
    exitGroup.add(dais, portalDisc, portalRing);
    group.add(exitGroup);
  }

  const dungeonSmoke = createSmokeEmitterSystem(smokeOrigins, smokeTex, '#9EB4DA', 6, 2.5, 0.72);
  if (dungeonSmoke) group.add(dungeonSmoke.points);

  // Distance LOD culling list for corner crystal clusters & perimeter ink outlines
  const dungeonLodEntries: { obj: THREE.Object3D; x: number; z: number; maxDistSq: number }[] = [];
  for (const cg of clusters) {
    cg.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        dungeonLodEntries.push({
          obj: child,
          x: cg.position.x,
          z: cg.position.z,
          maxDistSq: 27 * 27,
        });
      }
    });
  }

  return {
    group,
    themeLighting: theme.lighting,
    update(elapsed, exitPortalOpen, chestsOpened, camX = 0, camZ = 0, extra) {
      parallax.update(elapsed, camX, camZ);
      dungeonSmoke?.update(elapsed);
      for (let i = 0; i < dungeonLodEntries.length; i++) {
        const entry = dungeonLodEntries[i];
        const dx = entry.x - camX;
        const dz = entry.z - camZ;
        entry.obj.visible = dx * dx + dz * dz <= entry.maxDistSq;
      }
      for (let i = 0; i < roomFlames.length; i++) {
        roomFlames[i].scale.set(
          0.85 + Math.sin(elapsed * 8 + i) * 0.1,
          1.55 + Math.sin(elapsed * 11 + i * 2) * 0.28,
          0.85,
        );
        roomFlames[i].rotation.y = elapsed * 2.2 + i;
      }
      if (portalRing && portalMat) {
        portalRing.visible = exitPortalOpen;
        portalMat.opacity = exitPortalOpen ? 0.56 + Math.sin(elapsed * 4) * 0.2 : 0.1;
        if (exitPortalOpen) {
          portalRing.position.y = 0.28 + Math.sin(elapsed * 3) * 0.06;
          portalRing.rotation.z = elapsed * 0.8;
        }
      }
      const roomCleared = Boolean(extra?.roomCleared);
      for (let i = 0; i < doorVisuals.length; i++) {
        const dv = doorVisuals[i];
        dv.veilMat.color.set(roomCleared ? '#38E8D8' : '#FF3B5C');
        dv.padMat.color.set(roomCleared ? '#38E8D8' : '#FF3B5C');
        dv.veilMat.opacity = roomCleared
          ? 0.26 + Math.sin(elapsed * 4 + i) * 0.1
          : 0.5 + Math.sin(elapsed * 2.5 + i) * 0.12;
        dv.padMat.opacity = roomCleared ? 0.65 + Math.sin(elapsed * 4.5) * 0.2 : 0.25;
        dv.pad.scale.setScalar(roomCleared ? 1 + Math.sin(elapsed * 4) * 0.08 : 0.85);
        dv.gateBars.position.y = roomCleared ? 1.85 : 0;
        dv.gateBars.visible = !roomCleared;
      }
      for (let i = 0; i < capCrystals.length; i++) {
        const baseY = typeof capCrystals[i].userData.baseY === 'number' ? capCrystals[i].userData.baseY : 3.6;
        capCrystals[i].rotation.y = elapsed * 1.4 + i;
        capCrystals[i].position.y = baseY + Math.sin(elapsed * 2.5 + i) * 0.08;
      }
      for (let i = 0; i < clusters.length; i++) {
        clusters[i].scale.y = 1 + Math.sin(elapsed * 2.2 + i) * 0.05;
      }
      for (let i = 0; i < trapRings.length; i++) {
        const armed = extra?.trapArmed?.[i] ?? true;
        trapRings[i].mat.opacity = armed ? 0.55 + Math.sin(elapsed * 4.2 + i) * 0.25 : 0.12;
        trapRings[i].ring.scale.setScalar(armed ? 1 + Math.sin(elapsed * 3 + i) * 0.07 : 0.82);
      }
      if (altarOrb && altarHalo) {
        const used = Boolean(extra?.altarUsed);
        altarOrb.visible = !used;
        altarHalo.visible = !used;
        if (!used) {
          altarOrb.rotation.y = elapsed * 1.8;
          altarOrb.position.y = 1.38 + Math.sin(elapsed * 3.1) * 0.1;
        }
      }
      for (let i = 0; i < destructibleGroups.length; i++) {
        const broken = extra?.destructiblesBroken?.[i] ?? false;
        destructibleGroups[i].visible = !broken;
        if (!broken && destructiblePositions[i]?.kind === 'crystal') {
          const shard = destructibleGroups[i].children[2];
          if (shard) {
            shard.rotation.y = elapsed * 1.9 + i;
            shard.position.y = 0.64 + Math.sin(elapsed * 3.2 + i) * 0.08;
          }
        }
      }
      for (let i = 0; i < chestLids.length; i++) {
        const opened = chestsOpened[i] ?? false;
        const isMimic = Boolean(extra?.mimicIndices?.[i]) && !opened;
        if (isMimic) {
          chestLids[i].rotation.x = -Math.abs(Math.sin(elapsed * 7.2 + i)) * 0.12;
        } else {
          chestLids[i].rotation.x = opened ? -1.15 : 0;
        }
      }
    },
    dispose() {
      glowTex.dispose();
      smokeTex.dispose();
      pbr.dispose();
    },
  };
}
