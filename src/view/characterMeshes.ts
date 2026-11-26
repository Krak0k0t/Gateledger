import * as THREE from 'three';
import type { EnemyEntity, EnemyKind } from '../systems/dungeonSim';
import { WEEKLY_BOSSES, type BossId } from '../systems/bosses';
import { createHeroMaterialTextures } from './pbrMaterials';

export function createTaperedCrescentGeometry(
  innerR: number,
  outerR: number,
  arcRad: number,
  segs = 28,
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const tipR = innerR * 0.24 + outerR * 0.76;

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const a = -arcRad * 0.5 + u * arcRad;
    const taper = Math.pow(Math.sin(u * Math.PI), 0.72);
    const rIn = tipR - (tipR - innerR) * taper;
    const rOut = tipR + (outerR - tipR) * taper;
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    positions.push(sa * rIn, 0, ca * rIn);
    positions.push(sa * rOut, 0, ca * rOut);
    if (i < segs) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export interface ArticulatedHeroRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  cloak: THREE.Mesh;
  weaponGroup: THREE.Group;
  slashArc: THREE.Mesh;
  slashCoreArc: THREE.Mesh;
  contactShadow: THREE.Mesh;
  groundAura: THREE.Mesh;
  selectionRing: THREE.Mesh;
  setWeaponVisual: (weaponId: string) => void;
  updateAnimation: (
    dt: number,
    elapsed: number,
    params: {
      x: number;
      y: number;
      z: number;
      facing: number;
      speedRatio: number;
      walkPhase: number;
      squashX: number;
      squashY: number;
      attackAnimTimer: number;
      specialAnimTimer: number;
      comboStep: number;
      hitFlashTimer: number;
      invulnTimer: number;
      chargeRatio?: number;
      chargeReady?: boolean;
      attackKind?: 'combo' | 'charged' | 'slam' | 'special';
      slamPending?: boolean;
      weaponId?: string;
      blocking?: boolean;
      dodging?: boolean;
      aegisHits?: number;
      lookYaw?: number;
      flourishTimer?: number;
      riposteReady?: boolean;
      groundY?: number;
      vy?: number;
      attackPhase?: 'idle' | 'windup' | 'hit' | 'recovery';
      attackPhaseTimer?: number;
      attackPhaseTotal?: number;
    },
  ) => void;
}

export interface EnemyVisualRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  telegraphRing: THREE.Mesh;
  targetRing: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  primaryMat: THREE.MeshStandardMaterial;
  baseEmissive: THREE.Color;
  contactShadow: THREE.Mesh;
  auraDisc: THREE.Mesh;
  update: (e: EnemyEntity, elapsed: number, isTargeted?: boolean) => void;
}

export interface NpcVisualRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  contactShadow: THREE.Mesh;
  update: (
    x: number,
    z: number,
    facing: number,
    walkPhase: number,
    role: string,
    elapsed: number,
  ) => void;
}

const _edgeGeoCache = new WeakMap<THREE.BufferGeometry, Map<number, THREE.EdgesGeometry>>();

export function addInkEdges(
  mesh: THREE.Mesh,
  lineMat: THREE.LineBasicMaterial,
  thresholdAngle = 30,
): void {
  let byAngle = _edgeGeoCache.get(mesh.geometry);
  if (!byAngle) {
    byAngle = new Map();
    _edgeGeoCache.set(mesh.geometry, byAngle);
  }
  let edges = byAngle.get(thresholdAngle);
  if (!edges) {
    edges = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
    byAngle.set(thresholdAngle, edges);
  }
  const lines = new THREE.LineSegments(edges, lineMat);
  lines.renderOrder = 2;
  mesh.add(lines);
}

function safeComputeTangents<T extends THREE.BufferGeometry>(geo: T): T {
  if (geo.index && geo.attributes.position && geo.attributes.normal && geo.attributes.uv) {
    geo.computeTangents();
  }
  return geo;
}

function createSculptedCloakGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0.28);
  shape.lineTo(0.22, 0.28);
  shape.quadraticCurveTo(0.28, 0.04, 0.34, -0.26);
  shape.quadraticCurveTo(0.14, -0.32, 0, -0.3);
  shape.quadraticCurveTo(-0.14, -0.32, -0.34, -0.26);
  shape.quadraticCurveTo(-0.28, 0.04, -0.22, 0.28);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  return safeComputeTangents(geo);
}

function createBootGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.075, -0.09);
  shape.lineTo(0.075, -0.09);
  shape.quadraticCurveTo(0.088, 0.03, 0.068, 0.14);
  shape.quadraticCurveTo(0, 0.175, -0.068, 0.14);
  shape.quadraticCurveTo(-0.088, 0.03, -0.075, -0.09);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.095,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  return safeComputeTangents(geo);
}

function createChestplateGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.215, 0.225);
  shape.lineTo(-0.1, 0.255);
  shape.quadraticCurveTo(0, 0.195, 0.1, 0.255);
  shape.lineTo(0.215, 0.225);
  shape.quadraticCurveTo(0.245, 0.04, 0.185, -0.185);
  shape.lineTo(0, -0.235);
  shape.lineTo(-0.185, -0.185);
  shape.quadraticCurveTo(-0.245, 0.04, -0.215, 0.225);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.145,
    bevelEnabled: true,
    bevelThickness: 0.038,
    bevelSize: 0.026,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.center();
  return safeComputeTangents(geo);
}

function createSwordBladeGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.046, 0);
  shape.lineTo(0.046, 0);
  shape.lineTo(0.036, 0.72);
  shape.lineTo(0, 0.92);
  shape.lineTo(-0.036, 0.72);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  return safeComputeTangents(geo);
}

function createCurvedSabreGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.026, 0);
  shape.lineTo(0.032, 0);
  shape.quadraticCurveTo(0.068, 0.44, 0.018, 0.84);
  shape.lineTo(-0.018, 0.72);
  shape.quadraticCurveTo(0.018, 0.36, -0.026, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.009,
    bevelSize: 0.007,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.rotateX(Math.PI / 2);
  return safeComputeTangents(geo);
}

export function createArticulatedHero(
  inkMat: THREE.LineBasicMaterial,
  shadowTex: THREE.CanvasTexture,
  glowTex?: THREE.CanvasTexture,
  maxAniso = 4,
): ArticulatedHeroRig {
  const root = new THREE.Group();
  const texSet = createHeroMaterialTextures(maxAniso);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 28),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(1.06, 0.88, 1);
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  const groundAura = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 2.05),
    new THREE.MeshBasicMaterial({
      map: glowTex ?? shadowTex,
      color: '#38E8D8',
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  groundAura.rotation.x = -Math.PI / 2;
  groundAura.position.y = 0.02;
  root.add(groundAura);

  const selectionRingMat = new THREE.MeshBasicMaterial({
    color: '#38E8D8',
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.78, 36), selectionRingMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.028;
  root.add(selectionRing);

  // Cinematic Physical PBR Materials with Procedural Normal Maps & Micro-Scratches
  const gambesonMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.gambeson.map,
    normalMap: texSet.gambeson.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: texSet.gambeson.roughnessMap,
    roughness: 0.74,
    metalness: 0.08,
    sheen: 0.65,
    sheenRoughness: 0.52,
    sheenColor: new THREE.Color('#6F92EC'),
    emissive: '#0B1633',
    emissiveIntensity: 0.12,
  });
  const velvetMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.velvet.map,
    normalMap: texSet.velvet.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: texSet.velvet.roughnessMap,
    roughness: 0.82,
    metalness: 0.04,
    sheen: 0.95,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color('#FF9F88'),
    side: THREE.DoubleSide,
  });
  const leatherMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.leather.map,
    normalMap: texSet.leather.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: texSet.leather.roughnessMap,
    roughness: 0.64,
    metalness: 0.08,
    clearcoat: 0.16,
    clearcoatRoughness: 0.42,
  });
  const darkLeatherMat = new THREE.MeshPhysicalMaterial({
    color: '#2D130D',
    normalMap: texSet.leather.normalMap,
    normalScale: new THREE.Vector2(0.68, 0.68),
    roughnessMap: texSet.leather.roughnessMap,
    roughness: 0.6,
    metalness: 0.1,
    clearcoat: 0.18,
  });
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: '#E6BDA0',
    normalMap: texSet.skinNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.56,
    metalness: 0.02,
    sheen: 0.25,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color('#FFD9C4'),
  });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: '#1C1720',
    roughness: 0.62,
    metalness: 0.08,
    sheen: 0.45,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#474258'),
  });
  const beardMat = new THREE.MeshStandardMaterial({
    color: '#251F2B',
    roughness: 0.84,
    metalness: 0.04,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: '#B87B6C',
    roughness: 0.52,
    metalness: 0.02,
  });
  const ivoryMat = new THREE.MeshStandardMaterial({
    color: '#F6EAD5',
    roughness: 0.45,
    emissive: '#FFF4DC',
    emissiveIntensity: 0.38,
  });
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.gold.map,
    normalMap: texSet.gold.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: texSet.gold.roughnessMap,
    emissive: '#7E490E',
    emissiveIntensity: 0.22,
    roughness: 0.2,
    metalness: 0.94,
    clearcoat: 0.4,
    clearcoatRoughness: 0.16,
    anisotropy: 0.65,
  });
  const steelMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.steel.map,
    normalMap: texSet.steel.normalMap,
    normalScale: new THREE.Vector2(0.82, 0.82),
    roughnessMap: texSet.steel.roughnessMap,
    emissive: '#1D334F',
    emissiveIntensity: 0.12,
    roughness: 0.2,
    metalness: 0.94,
    clearcoat: 0.52,
    clearcoatRoughness: 0.15,
    anisotropy: 0.72,
  });
  const darkSteelMat = new THREE.MeshPhysicalMaterial({
    color: '#4E5B74',
    map: texSet.steel.map,
    normalMap: texSet.steel.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: texSet.steel.roughnessMap,
    roughness: 0.32,
    metalness: 0.88,
    clearcoat: 0.34,
    clearcoatRoughness: 0.22,
  });
  const chainmailMat = new THREE.MeshPhysicalMaterial({
    color: '#63738E',
    map: texSet.steel.map,
    normalMap: texSet.steel.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: texSet.steel.roughnessMap,
    roughness: 0.36,
    metalness: 0.86,
    clearcoat: 0.22,
  });
  const tealGlowMat = new THREE.MeshPhysicalMaterial({
    color: '#56F5E4',
    emissive: '#38E8D8',
    emissiveIntensity: 1.32,
    roughness: 0.15,
    metalness: 0.2,
    clearcoat: 0.9,
  });
  const lanternGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#FFEBB8',
    emissive: '#FF9A2E',
    emissiveIntensity: 1.48,
    roughness: 0.12,
    clearcoat: 1.0,
  });
  const rubySealMat = new THREE.MeshPhysicalMaterial({
    color: '#C8223A',
    emissive: '#7A0E22',
    emissiveIntensity: 0.42,
    roughness: 0.22,
    clearcoat: 0.8,
  });

  // Stepped Stone & Engraved Gold Plinth
  const plinthPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.61, 0),
    new THREE.Vector2(0.58, 0.048),
    new THREE.Vector2(0.53, 0.056),
    new THREE.Vector2(0.51, 0.105),
    new THREE.Vector2(0, 0.105),
  ];
  const tokenDisc = new THREE.Mesh(
    safeComputeTangents(new THREE.LatheGeometry(plinthPts, 28)),
    darkSteelMat,
  );
  tokenDisc.castShadow = true;
  tokenDisc.receiveShadow = true;
  addInkEdges(tokenDisc, inkMat, 46);
  root.add(tokenDisc);

  const tokenRim = new THREE.Mesh(new THREE.TorusGeometry(0.525, 0.026, 10, 32), goldMat);
  tokenRim.rotation.x = Math.PI / 2;
  tokenRim.position.y = 0.098;
  root.add(tokenRim);

  for (let r = 0; r < 4; r++) {
    const ang = (r * Math.PI) / 2 + Math.PI / 4;
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), tealGlowMat);
    rune.scale.set(1.1, 0.45, 0.8);
    rune.position.set(Math.cos(ang) * 0.54, 0.068, Math.sin(ang) * 0.54);
    rune.rotation.y = -ang;
    root.add(rune);
  }

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.11;
  root.add(bodyPivot);

  // Two-Segment Articulated Legs (Thigh -> Knee Poleyn -> Shin Pivot -> Boot, Steel Sabaton & Spurs)
  const thighGeo = safeComputeTangents(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.058, -0.22),
        new THREE.Vector2(0.072, -0.1),
        new THREE.Vector2(0.088, 0.0),
        new THREE.Vector2(0.078, 0.06),
        new THREE.Vector2(0, 0.06),
      ],
      16,
    ),
  );
  const shinGeo = safeComputeTangents(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.058, -0.2),
        new THREE.Vector2(0.072, -0.1),
        new THREE.Vector2(0.078, -0.02),
        new THREE.Vector2(0.064, 0.02),
        new THREE.Vector2(0, 0.02),
      ],
      16,
    ),
  );
  const bootGeo = createBootGeometry();

  const makeLeg = (offsetX: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(offsetX, 0.44, 0);

    const thighMesh = new THREE.Mesh(thighGeo, gambesonMat);
    thighMesh.castShadow = true;
    legGroup.add(thighMesh);

    const thighStrap = new THREE.Mesh(new THREE.TorusGeometry(0.079, 0.012, 8, 16), leatherMat);
    thighStrap.rotation.x = Math.PI / 2;
    thighStrap.position.y = -0.08;
    legGroup.add(thighStrap);

    // Steel Knee Poleyn + Brass Trim
    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), steelMat);
    kneeCap.scale.set(0.95, 1.05, 0.88);
    kneeCap.position.set(0, -0.21, 0.038);
    kneeCap.castShadow = true;
    const kneeRivet = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), goldMat);
    kneeRivet.position.set(offsetX > 0 ? 0.048 : -0.048, -0.21, 0.042);
    legGroup.add(kneeCap, kneeRivet);

    // Right thigh throwing dagger sheath
    if (offsetX > 0) {
      const daggerSheath = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 6), darkLeatherMat);
      daggerSheath.rotation.x = Math.PI;
      daggerSheath.rotation.z = -0.18;
      daggerSheath.position.set(0.082, -0.08, 0.01);
      daggerSheath.castShadow = true;
      const daggerHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.055, 6), goldMat);
      daggerHilt.position.set(0.095, 0.01, 0.01);
      legGroup.add(daggerSheath, daggerHilt);
    }

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.22, 0);
    legGroup.add(shinPivot);

    const bootShaft = new THREE.Mesh(shinGeo, leatherMat);
    bootShaft.castShadow = true;
    const shinGreave = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.16, 10, 1, false, -0.8, 1.6), steelMat);
    shinGreave.position.set(0, -0.1, 0.014);
    shinGreave.castShadow = true;
    const bootCuff = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.015, 8, 16), darkLeatherMat);
    bootCuff.rotation.x = Math.PI / 2;
    bootCuff.position.y = -0.02;
    const bootBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.028, 0.018), goldMat);
    bootBuckle.position.set(offsetX > 0 ? 0.058 : -0.058, -0.1, 0.038);

    const footMesh = new THREE.Mesh(bootGeo, darkLeatherMat);
    footMesh.position.set(0, -0.19, 0.045);
    footMesh.castShadow = true;

    const heelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.042, 0.075), darkLeatherMat);
    heelMesh.position.set(0, -0.225, -0.04);
    heelMesh.castShadow = true;
    const spurBand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.025), goldMat);
    spurBand.position.set(0, -0.185, -0.078);
    const spurRowel = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), goldMat);
    spurRowel.position.set(0, -0.185, -0.102);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), darkSteelMat);
    toeCap.scale.set(1.0, 0.68, 1.25);
    toeCap.position.set(0, -0.195, 0.125);
    toeCap.castShadow = true;

    shinPivot.add(bootShaft, shinGreave, bootCuff, bootBuckle, footMesh, heelMesh, spurBand, spurRowel, toeCap);
    bodyPivot.add(legGroup);
    return { legGroup, shinPivot };
  };
  const leftLegRig = makeLeg(-0.135);
  const rightLegRig = makeLeg(0.135);
  const leftLeg = leftLegRig.legGroup;
  const rightLeg = rightLegRig.legGroup;
  const leftShin = leftLegRig.shinPivot;
  const rightShin = rightLegRig.shinPivot;

  // Anatomical Quilted Gambeson Torso + Chainmail Hauberk Underlay + High-Relief Fluted Half-Plate Cuirass & Backplate
  const torsoPts = [
    new THREE.Vector2(0.0, -0.34),
    new THREE.Vector2(0.245, -0.32),
    new THREE.Vector2(0.225, -0.16),
    new THREE.Vector2(0.205, -0.02),
    new THREE.Vector2(0.255, 0.15),
    new THREE.Vector2(0.22, 0.27),
    new THREE.Vector2(0.12, 0.31),
    new THREE.Vector2(0.0, 0.31),
  ];
  const torso: THREE.Mesh = new THREE.Mesh(
    safeComputeTangents(new THREE.LatheGeometry(torsoPts, 22)),
    gambesonMat,
  );
  torso.position.y = 0.69;
  torso.scale.set(1.08, 1.0, 0.82);
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Visible Chainmail Skirt Hem + Chainmail Collar Underlay
  const chainSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.265, 0.17, 20, 1, true), chainmailMat);
  chainSkirt.position.y = 0.415;
  chainSkirt.scale.set(1.08, 1.0, 0.84);
  chainSkirt.castShadow = true;
  const chainCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.165, 0.08, 16), chainmailMat);
  chainCollar.position.set(0, 1.025, 0.01);
  bodyPivot.add(chainSkirt, chainCollar);

  // Sculpted High-Relief Half-Plate Cuirass Breastplate & Backplate
  const breastplateGeo = createChestplateGeometry();
  const breastplate: THREE.Mesh = new THREE.Mesh(breastplateGeo, darkSteelMat);
  breastplate.position.set(0, 0.76, 0.085);
  breastplate.castShadow = true;
  const backplate = new THREE.Mesh(breastplateGeo, darkSteelMat);
  backplate.position.set(0, 0.76, -0.075);
  backplate.scale.set(0.96, 0.94, 0.85);
  backplate.castShadow = true;
  bodyPivot.add(breastplate, backplate);

  // Fluted Cuirass Ribs + Pectoral Gold Trim + Guild Gate Crest
  for (const sx of [-1, 1]) {
    const fluting = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.23, 0.032), steelMat);
    fluting.position.set(sx * 0.095, 0.75, 0.162);
    fluting.rotation.z = sx * -0.14;
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.09, 0.19), leatherMat);
    strap.position.set(sx * 0.13, 0.975, 0.005);
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), goldMat);
    rivet.position.set(sx * 0.13, 0.955, 0.105);
    bodyPivot.add(fluting, strap, rivet);
  }
  const sternumRidge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.32, 0.04), goldMat);
  sternumRidge.position.set(0, 0.76, 0.18);
  const crestFrame = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 8, 16), goldMat);
  crestFrame.position.set(0, 0.82, 0.195);
  const crestGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), tealGlowMat);
  crestGem.scale.set(0.85, 1.15, 0.6);
  crestGem.position.set(0, 0.82, 0.205);
  bodyPivot.add(sternumRidge, crestFrame, crestGem);

  // Armored Gorget Collar
  const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.185, 0.085, 16), steelMat);
  gorget.position.set(0, 0.99, 0.01);
  gorget.castShadow = true;
  const gorgetTrim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 20), goldMat);
  gorgetTrim.rotation.x = Math.PI / 2;
  gorgetTrim.position.set(0, 0.965, 0.01);
  bodyPivot.add(gorget, gorgetTrim);

  // Heavy Studded Waist Belt + Ornate Buckle + Articulated Brigandine Tassets
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.238, 0.095, 18), leatherMat);
  belt.position.y = 0.5;
  belt.scale.set(1.08, 1.0, 0.85);
  belt.castShadow = true;
  const buckleOuter = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.095, 0.048), goldMat);
  buckleOuter.position.set(0, 0.5, 0.21);
  const buckleGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 0), tealGlowMat);
  buckleGem.position.set(0, 0.5, 0.235);
  bodyPivot.add(belt, buckleOuter, buckleGem);

  const tassetPivotLeft = new THREE.Group();
  tassetPivotLeft.position.set(-0.15, 0.47, 0.15);
  const tassetMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.032), darkLeatherMat);
  tassetMeshL.position.y = -0.09;
  tassetMeshL.castShadow = true;
  const tassetTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.026, 0.036), goldMat);
  tassetTrimL.position.y = -0.175;
  tassetPivotLeft.add(tassetMeshL, tassetTrimL);
  tassetPivotLeft.rotation.z = 0.12;
  tassetPivotLeft.rotation.x = -0.12;

  const tassetPivotRight = new THREE.Group();
  tassetPivotRight.position.set(0.15, 0.47, 0.15);
  const tassetMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.032), darkLeatherMat);
  tassetMeshR.position.y = -0.09;
  tassetMeshR.castShadow = true;
  const tassetTrimR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.026, 0.036), goldMat);
  tassetTrimR.position.y = -0.175;
  tassetPivotRight.add(tassetMeshR, tassetTrimR);
  tassetPivotRight.rotation.z = -0.12;
  tassetPivotRight.rotation.x = -0.12;
  bodyPivot.add(tassetPivotLeft, tassetPivotRight);

  // Diagonal Leather Baldric Cross-Strap + Brass Clasp + Twin Throwing Knife Hilts
  const baldricCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.96, 0.14),
    new THREE.Vector3(0.02, 0.74, 0.215),
    new THREE.Vector3(-0.22, 0.51, 0.11),
    new THREE.Vector3(-0.2, 0.54, -0.18),
    new THREE.Vector3(0.14, 0.94, -0.16),
  ]);
  const baldric = new THREE.Mesh(
    safeComputeTangents(new THREE.TubeGeometry(baldricCurve, 24, 0.028, 8, true)),
    leatherMat,
  );
  baldric.castShadow = true;
  const baldricClasp = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 10), goldMat);
  baldricClasp.rotation.x = Math.PI / 2;
  baldricClasp.position.set(0.1, 0.85, 0.19);
  bodyPivot.add(baldric, baldricClasp);
  for (let k = 0; k < 2; k++) {
    const knifeSheath = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.09, 0.018), darkLeatherMat);
    knifeSheath.position.set(-0.07 - k * 0.05, 0.66 - k * 0.05, 0.205 - k * 0.018);
    knifeSheath.rotation.z = 0.75;
    const knifePommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.016, 0), steelMat);
    knifePommel.position.set(-0.035 - k * 0.05, 0.695 - k * 0.05, 0.21 - k * 0.018);
    bodyPivot.add(knifeSheath, knifePommel);
  }

  // Hip Adventurer Gear: Swinging Brass Oil Lantern (left hip) + Alchemist Flask & Scroll Tube (right hip)
  const lanternPivot = new THREE.Group();
  lanternPivot.position.set(-0.26, 0.47, 0.07);
  const lanternRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 12), goldMat);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.056, 0.048, 6), goldMat);
  lanternCap.position.y = -0.045;
  const lanternCore = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.075, 6), lanternGlassMat);
  lanternCore.position.y = -0.095;
  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.026, 6), goldMat);
  lanternBase.position.y = -0.142;
  lanternPivot.add(lanternRing, lanternCap, lanternCore, lanternBase);
  bodyPivot.add(lanternPivot);

  // Right hip Alchemist Vial + Scroll Case + Leather Satchel Pouch
  const pouchMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.08), leatherMat);
  pouchMesh.position.set(0.25, 0.44, 0.04);
  const pouchFlap = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.05, 0.086), darkLeatherMat);
  pouchFlap.position.set(0.25, 0.48, 0.042);
  const pouchButton = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), goldMat);
  pouchButton.position.set(0.25, 0.46, 0.088);

  const flaskGlass = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), tealGlowMat);
  flaskGlass.scale.set(0.9, 1.15, 0.9);
  flaskGlass.position.set(0.23, 0.42, -0.08);
  const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.04, 8), goldMat);
  flaskNeck.position.set(0.23, 0.47, -0.08);

  const scrollTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 10), darkLeatherMat);
  scrollTube.rotation.z = 0.65;
  scrollTube.rotation.y = 0.28;
  scrollTube.position.set(0.16, 0.48, -0.19);
  const scrollSeal = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), rubySealMat);
  scrollSeal.position.set(0.23, 0.54, -0.2);
  bodyPivot.add(pouchMesh, pouchFlap, pouchButton, flaskGlass, flaskNeck, scrollTube, scrollSeal);

  // Two-Stage Dynamic Flowing Velvet Cloak + Fur Shoulder Mantle
  const shoulderMantle = new THREE.Mesh(
    new THREE.TorusGeometry(0.235, 0.055, 8, 18, Math.PI * 1.2),
    darkLeatherMat,
  );
  shoulderMantle.rotation.x = Math.PI / 2 + 0.18;
  shoulderMantle.rotation.z = -Math.PI * 0.1;
  shoulderMantle.position.set(0, 0.96, -0.04);
  bodyPivot.add(shoulderMantle);

  const cloakGeo = createSculptedCloakGeometry();
  const cloak = new THREE.Mesh(cloakGeo, velvetMat);
  cloak.position.set(0, 0.72, -0.21);
  cloak.rotation.x = 0.14;
  cloak.castShadow = true;
  bodyPivot.add(cloak);

  const cloakTrim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.035, 0.042), goldMat);
  cloakTrim.position.set(0, -0.27, 0);
  cloak.add(cloakTrim);

  const cloakLowerPivot = new THREE.Group();
  cloakLowerPivot.position.set(0, -0.27, 0);
  const cloakLower = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.032), velvetMat);
  cloakLower.position.set(0, -0.14, 0);
  cloakLower.castShadow = true;
  const cloakHemGold = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.032, 0.038), goldMat);
  cloakHemGold.position.set(0, -0.275, 0);
  cloakLowerPivot.add(cloakLower, cloakHemGold);
  cloak.add(cloakLowerPivot);

  // Expedition Leather Pack + Rolled Crimson Bedroll + Brass Astrolabe Compass + Hovering Return Amulet
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.17), leatherMat);
  pack.position.set(0, 0.74, -0.29);
  pack.castShadow = true;
  const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.11, 0.185), darkLeatherMat);
  packFlap.position.set(0, 0.84, -0.295);
  packFlap.castShadow = true;
  const packBuckleL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.025), goldMat);
  packBuckleL.position.set(-0.09, 0.78, -0.388);
  const packBuckleR = packBuckleL.clone();
  packBuckleR.position.x = 0.09;
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.36, 12), velvetMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 0.94, -0.29);
  bedroll.castShadow = true;
  const astrolabeRing = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.011, 6, 16), goldMat);
  astrolabeRing.position.set(-0.14, 0.68, -0.385);
  bodyPivot.add(pack, packFlap, packBuckleL, packBuckleR, bedroll, astrolabeRing);

  const amuletGroup = new THREE.Group();
  amuletGroup.position.set(0.15, 0.84, -0.41);
  const amuletCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 0), tealGlowMat);
  const amuletBezel = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.012, 6, 16), goldMat);
  amuletGroup.add(amuletCore, amuletBezel);
  bodyPivot.add(amuletGroup);

  // Realistic Sculpted Head, Facial Planes, Trimmed Beard & Broad-Brim Plumed Hat
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.07, 0.01);
  bodyPivot.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.092, 0.11, 12), skinMat);
  neck.position.y = -0.02;
  headGroup.add(neck);

  // Cranium + Contoured Jaw + Cheekbones + Nose Bridge + Lips + Ears
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.175, 20, 18), skinMat);
  cranium.scale.set(0.94, 1.08, 1.02);
  cranium.position.y = 0.11;
  cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.082, 0.12, 12), skinMat);
  jaw.scale.set(0.95, 1, 0.98);
  jaw.position.set(0, 0.025, 0.025);
  jaw.castShadow = true;
  headGroup.add(jaw);

  // Cheekbone planes, brow ridge & lips
  for (const cx of [-0.078, 0.078]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), skinMat);
    cheek.scale.set(0.9, 0.65, 0.72);
    cheek.position.set(cx, 0.086, 0.142);
    headGroup.add(cheek);
  }
  const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.026, 0.045), skinMat);
  browRidge.position.set(0, 0.148, 0.156);
  const lipsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.016, 0.024), lipMat);
  lipsMesh.position.set(0, 0.044, 0.156);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.075, 6), skinMat);
  nose.rotation.x = Math.PI * 0.36;
  nose.position.set(0, 0.095, 0.178);
  headGroup.add(browRidge, lipsMesh, nose);

  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), skinMat);
    ear.scale.set(0.45, 0.95, 0.72);
    ear.position.set(sx * 0.162, 0.1, -0.01);
    headGroup.add(ear);
  }

  // Multi-Lock Swept Hair & Trimmed Beard / Goatee
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.184, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
    hairMat,
  );
  hairBack.position.set(0, 0.12, -0.028);
  hairBack.rotation.x = -0.25;
  hairBack.castShadow = true;
  const hairLeft = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.15, 0.135), hairMat);
  hairLeft.position.set(-0.144, 0.09, -0.02);
  hairLeft.rotation.z = 0.1;
  hairLeft.castShadow = true;
  const hairRight = hairLeft.clone();
  hairRight.position.x = 0.144;
  hairRight.rotation.z = -0.1;
  headGroup.add(hairBack, hairLeft, hairRight);
  for (let lock = -1; lock <= 1; lock++) {
    const napeLock = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.15, 6), hairMat);
    napeLock.rotation.x = Math.PI * 0.88;
    napeLock.position.set(lock * 0.065, 0.015, -0.145);
    napeLock.castShadow = true;
    headGroup.add(napeLock);
  }
  const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.088, 7), beardMat);
  goatee.rotation.x = Math.PI * 0.94;
  goatee.position.set(0, -0.015, 0.128);
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.014, 0.022), beardMat);
  mustache.position.set(0, 0.056, 0.156);
  headGroup.add(goatee, mustache);

  // Expressive Eyes, Brows & Cheek Scar
  const scleraMat = new THREE.MeshBasicMaterial({ color: '#F5EFE6' });
  const irisMat = new THREE.MeshBasicMaterial({ color: '#1E3A5F' });
  const eyeSparkMat = new THREE.MeshBasicMaterial({ color: '#4EF5E4' });
  for (const ex of [-0.056, 0.056]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), scleraMat);
    sclera.scale.set(1.1, 0.75, 0.55);
    sclera.position.set(ex, 0.125, 0.155);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), irisMat);
    iris.position.set(ex, 0.125, 0.166);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), eyeSparkMat);
    glint.position.set(ex, 0.128, 0.175);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.014, 0.022), hairMat);
    brow.position.set(ex, 0.158, 0.162);
    brow.rotation.z = ex < 0 ? -0.14 : 0.14;
    headGroup.add(sclera, iris, glint, brow);
  }
  const scar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.055, 0.012), rubySealMat);
  scar.position.set(-0.072, 0.072, 0.155);
  scar.rotation.z = 0.35;
  headGroup.add(scar);

  // Iconic Broad-Brim Cavalier Hat with Engraved Crown Welt & Dual-Tone Arched Plume
  const hatBrimPts = [
    new THREE.Vector2(0.14, 0.01),
    new THREE.Vector2(0.24, 0.0),
    new THREE.Vector2(0.36, -0.022),
    new THREE.Vector2(0.42, 0.012),
    new THREE.Vector2(0.41, 0.028),
    new THREE.Vector2(0.22, 0.022),
    new THREE.Vector2(0.14, 0.03),
  ];
  const hatBrim = new THREE.Mesh(
    safeComputeTangents(new THREE.LatheGeometry(hatBrimPts, 30)),
    darkLeatherMat,
  );
  hatBrim.position.y = 0.21;
  hatBrim.rotation.x = -0.06;
  hatBrim.castShadow = true;
  headGroup.add(hatBrim);

  const crownPts = [
    new THREE.Vector2(0.178, 0),
    new THREE.Vector2(0.168, 0.08),
    new THREE.Vector2(0.142, 0.18),
    new THREE.Vector2(0.095, 0.26),
    new THREE.Vector2(0, 0.28),
  ];
  const hatCrown = new THREE.Mesh(
    safeComputeTangents(new THREE.LatheGeometry(crownPts, 22)),
    leatherMat,
  );
  hatCrown.position.y = 0.225;
  hatCrown.rotation.x = -0.06;
  hatCrown.castShadow = true;
  headGroup.add(hatCrown);

  const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.022, 8, 24), goldMat);
  hatBand.rotation.x = Math.PI / 2 - 0.06;
  hatBand.position.y = 0.248;
  const hatClasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 0), tealGlowMat);
  hatClasp.position.set(0.155, 0.25, 0.08);
  headGroup.add(hatBand, hatClasp);

  const plumePivot = new THREE.Group();
  plumePivot.position.set(0.15, 0.26, -0.02);
  const plumeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.07, 0.14, -0.06),
    new THREE.Vector3(0.11, 0.25, -0.18),
    new THREE.Vector3(0.08, 0.28, -0.32),
  ]);
  const plumeStem = new THREE.Mesh(new THREE.TubeGeometry(plumeCurve, 14, 0.012, 6, false), ivoryMat);
  plumeStem.castShadow = true;
  const plumeVane = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.28, 7), tealGlowMat);
  plumeVane.scale.set(0.45, 1, 1.25);
  plumeVane.position.set(0.075, 0.18, -0.16);
  plumeVane.rotation.set(-0.95, 0.15, -0.35);
  plumeVane.castShadow = true;
  const plumeBaseFeather = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 7), velvetMat);
  plumeBaseFeather.scale.set(0.55, 1, 1.15);
  plumeBaseFeather.position.set(0.055, 0.12, -0.09);
  plumeBaseFeather.rotation.set(-0.78, 0.12, -0.28);
  plumeBaseFeather.castShadow = true;
  plumePivot.add(plumeStem, plumeBaseFeather, plumeVane);
  headGroup.add(plumePivot);

  // Two-Segment Articulated Arms + 3-Lame Brass-Riveted Pauldrons + Vambrace Gauntlets + Embossed Buckler
  const makePauldron = (side: number) => {
    const pGroup = new THREE.Group();
    const upperLame = new THREE.Mesh(
      new THREE.SphereGeometry(0.124, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      steelMat,
    );
    upperLame.scale.set(1.12, 0.85, 1.08);
    upperLame.castShadow = true;
    const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.015, 8, 18), goldMat);
    goldTrim.rotation.x = Math.PI / 2;
    const midLame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.114, 0.045, 14),
      darkSteelMat,
    );
    midLame.position.y = -0.036;
    midLame.castShadow = true;
    const lowerLame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.094, 0.102, 0.045, 14),
      steelMat,
    );
    lowerLame.position.y = -0.072;
    lowerLame.castShadow = true;
    pGroup.add(upperLame, goldTrim, midLame, lowerLame);
    for (let r = -1; r <= 1; r++) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), goldMat);
      rivet.position.set(side * 0.108, -0.025, r * 0.048);
      pGroup.add(rivet);
    }
    pGroup.rotation.z = side * -0.22;
    return pGroup;
  };

  const upperArmGeo = new THREE.CylinderGeometry(0.064, 0.054, 0.22, 12);
  const forearmGeo = new THREE.CylinderGeometry(0.056, 0.044, 0.21, 12);

  const makeArm = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.305, 0.92, 0);

    const pauldron = makePauldron(side);
    armGroup.add(pauldron);

    const upperSleeve = new THREE.Mesh(upperArmGeo, gambesonMat);
    upperSleeve.position.y = -0.12;
    upperSleeve.castShadow = true;
    armGroup.add(upperSleeve);

    const elbowCouter = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), steelMat);
    elbowCouter.position.set(side * 0.015, -0.23, -0.02);
    elbowCouter.castShadow = true;
    armGroup.add(elbowCouter);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.23, 0);
    armGroup.add(forearmPivot);

    const bracer = new THREE.Mesh(forearmGeo, leatherMat);
    bracer.position.y = -0.105;
    bracer.castShadow = true;
    const vambracePlate = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.14, 0.068), steelMat);
    vambracePlate.position.set(side * 0.012, -0.11, 0.02);
    vambracePlate.castShadow = true;
    const cuffGold = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.011, 6, 14), goldMat);
    cuffGold.rotation.x = Math.PI / 2;
    cuffGold.position.y = -0.19;

    const handMesh = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 8), darkLeatherMat);
    handMesh.scale.set(0.9, 1.05, 1.05);
    handMesh.position.set(0, -0.225, 0.015);
    handMesh.castShadow = true;
    const gauntletPlate = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.052, 0.036), steelMat);
    gauntletPlate.position.set(side * 0.01, -0.222, 0.038);
    gauntletPlate.castShadow = true;
    const knuckleRidge = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.016, 0.022), goldMat);
    knuckleRidge.position.set(side * 0.01, -0.244, 0.044);

    forearmPivot.add(bracer, vambracePlate, cuffGold, handMesh, gauntletPlate, knuckleRidge);
    bodyPivot.add(armGroup);
    return { armGroup, forearmPivot };
  };

  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);
  const leftArm = leftArmRig.armGroup;
  const leftForearm = leftArmRig.forearmPivot;
  const rightArm = rightArmRig.armGroup;
  const rightForearm = rightArmRig.forearmPivot;

  // Ornate Embossed Buckler Shield on Left Forearm
  const bucklerGroup = new THREE.Group();
  bucklerGroup.position.set(-0.075, -0.14, 0.06);
  bucklerGroup.rotation.z = Math.PI / 2;
  bucklerGroup.rotation.y = 0.25;
  const bucklerDish = new THREE.Mesh(
    safeComputeTangents(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0.055),
          new THREE.Vector2(0.08, 0.042),
          new THREE.Vector2(0.22, 0.01),
          new THREE.Vector2(0.245, 0.0),
          new THREE.Vector2(0.245, -0.025),
          new THREE.Vector2(0, -0.01),
        ],
        24,
      ),
    ),
    darkSteelMat,
  );
  bucklerDish.castShadow = true;
  const bucklerRim = new THREE.Mesh(new THREE.TorusGeometry(0.238, 0.02, 8, 26), goldMat);
  bucklerRim.rotation.x = Math.PI / 2;
  bucklerRim.castShadow = true;
  const bucklerBoss = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), tealGlowMat);
  bucklerBoss.scale.set(1, 0.65, 1);
  bucklerBoss.position.y = 0.042;
  const bucklerBossCollar = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 16), goldMat);
  bucklerBossCollar.rotation.x = Math.PI / 2;
  bucklerBossCollar.position.y = 0.042;
  bucklerGroup.add(bucklerDish, bucklerRim, bucklerBoss, bucklerBossCollar);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), goldMat);
    rivet.position.set(Math.cos(a) * 0.185, 0.022, Math.sin(a) * 0.185);
    bucklerGroup.add(rivet);
  }
  leftForearm.add(bucklerGroup);

  const astralCrystalMat = new THREE.MeshPhysicalMaterial({
    color: '#C084FC',
    emissive: '#9333EA',
    emissiveIntensity: 0.9,
    roughness: 0.14,
    metalness: 0.5,
    clearcoat: 1.0,
    iridescence: 0.85,
  });

  const curvedSabreGeo = createCurvedSabreGeometry();
  const offhandTwinblade = new THREE.Group();
  offhandTwinblade.position.set(0, -0.22, 0.05);
  const offGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), leatherMat);
  offGrip.rotation.x = Math.PI / 2;
  const offGuard = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 12, Math.PI), goldMat);
  offGuard.rotation.x = Math.PI / 2;
  offGuard.position.z = 0.06;
  const offBlade = new THREE.Mesh(curvedSabreGeo, astralCrystalMat);
  offBlade.position.z = 0.05;
  addInkEdges(offBlade, inkMat, 46);
  offhandTwinblade.add(offGrip, offGuard, offBlade);
  offhandTwinblade.visible = false;
  leftForearm.add(offhandTwinblade);

  // Right Hand Weapon Mount
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.225, 0.05);
  rightForearm.add(weaponGroup);

  // 1. Museum-Grade Gateblade Longsword
  const swordModel = new THREE.Group();
  const sPommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), goldMat);
  sPommel.position.z = -0.15;
  const sGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.17, 10), leatherMat);
  sGrip.rotation.x = Math.PI / 2;
  sGrip.position.z = -0.06;
  const sCrossguard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.045), goldMat);
  sCrossguard.position.z = 0.03;
  for (const gx of [-0.14, 0.14]) {
    const quillon = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.07, 6), goldMat);
    quillon.rotation.z = gx < 0 ? 1.15 : -1.15;
    quillon.position.set(gx, 0, 0.05);
    swordModel.add(quillon);
  }
  const sGuardGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), tealGlowMat);
  sGuardGem.position.set(0, 0.024, 0.032);
  const sBlade = new THREE.Mesh(createSwordBladeGeometry(), steelMat);
  sBlade.position.set(0, 0.01, 0.04);
  sBlade.castShadow = true;
  addInkEdges(sBlade, inkMat, 46);
  const sFuller = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.026, 0.56), tealGlowMat);
  sFuller.position.set(0, 0.0, 0.36);
  swordModel.add(sPommel, sGrip, sCrossguard, sGuardGem, sBlade, sFuller);

  // 2. Winged Astral Halberd Pike
  const spearModel = new THREE.Group();
  const pShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.56, 10), leatherMat);
  pShaft.rotation.x = Math.PI / 2;
  pShaft.position.z = 0.44;
  pShaft.castShadow = true;
  const pCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 0.12, 10), goldMat);
  pCollar.rotation.x = Math.PI / 2;
  pCollar.position.z = 1.08;
  const pTip = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.4, 4), steelMat);
  pTip.rotation.x = Math.PI / 2;
  pTip.position.z = 1.32;
  pTip.castShadow = true;
  const pWing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 12, Math.PI), goldMat);
  pWing.rotation.y = Math.PI / 2;
  pWing.position.set(0, 0, 1.12);
  const pTassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), velvetMat);
  pTassel.position.set(0, -0.09, 1.04);
  addInkEdges(pTip, inkMat, 46);
  spearModel.add(pShaft, pCollar, pTip, pWing, pTassel);

  // 3. Flanged Titan Ledgerhammer
  const hammerModel = new THREE.Group();
  const hShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 1.08, 10), leatherMat);
  hShaft.rotation.x = Math.PI / 2;
  hShaft.position.z = 0.4;
  hShaft.castShadow = true;
  const hHead = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.44, 8), darkSteelMat);
  hHead.rotation.z = Math.PI / 2;
  hHead.position.z = 0.88;
  hHead.castShadow = true;
  const hBand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.22), goldMat);
  hBand.position.z = 0.88;
  const hCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), lanternGlassMat);
  hCore.position.set(0, 0.11, 0.88);
  const hSpike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), steelMat);
  hSpike.rotation.x = Math.PI / 2;
  hSpike.position.z = 1.04;
  addInkEdges(hHead, inkMat, 46);
  hammerModel.add(hShaft, hHead, hBand, hCore, hSpike);

  // 4. Astral Twinblade Mainhand
  const twinbladesModel = new THREE.Group();
  const tGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), leatherMat);
  tGrip.rotation.x = Math.PI / 2;
  const tHilt = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 12, Math.PI), goldMat);
  tHilt.rotation.x = Math.PI / 2;
  tHilt.position.z = 0.06;
  const tBlade = new THREE.Mesh(curvedSabreGeo, astralCrystalMat);
  tBlade.position.z = 0.05;
  tBlade.castShadow = true;
  addInkEdges(tBlade, inkMat, 46);
  twinbladesModel.add(tGrip, tHilt, tBlade);

  weaponGroup.add(swordModel, spearModel, hammerModel, twinbladesModel);
  spearModel.visible = false;
  hammerModel.visible = false;
  twinbladesModel.visible = false;

  // Multi-plane 3D Additive Slash Ribbons + Finisher Slam Halo + Charge Rune Sigil
  const slashPivot = new THREE.Group();
  slashPivot.position.y = 0.8;
  root.add(slashPivot);

  const slashGeo = createTaperedCrescentGeometry(0.68, 2.28, Math.PI * 1.08, 30);
  const slashMat = new THREE.MeshBasicMaterial({
    color: '#38E8D8',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashPivot.add(slashArc);

  const slashCoreGeo = createTaperedCrescentGeometry(1.16, 1.88, Math.PI * 0.88, 26);
  const slashCoreMat = new THREE.MeshBasicMaterial({
    color: '#FFF4DC',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slashCoreArc = new THREE.Mesh(slashCoreGeo, slashCoreMat);
  slashCoreArc.position.y = 0.03;
  slashPivot.add(slashCoreArc);

  const slashCrossGeo = createTaperedCrescentGeometry(0.84, 2.12, Math.PI * 1.14, 28);
  const slashCrossMat = new THREE.MeshBasicMaterial({
    color: '#F4B942',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slashCrossArc = new THREE.Mesh(slashCrossGeo, slashCrossMat);
  slashCrossArc.rotation.z = 0.52;
  slashPivot.add(slashCrossArc);

  const slamRingMat = new THREE.MeshBasicMaterial({
    color: '#F4B942',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slamRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.08, 32), slamRingMat);
  slamRing.rotation.x = -Math.PI / 2;
  slamRing.position.y = 0.08;
  root.add(slamRing);

  const slamShockMat = new THREE.MeshBasicMaterial({
    color: '#FFF4DC',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slamShockRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.16, 32), slamShockMat);
  slamShockRing.rotation.x = -Math.PI / 2;
  slamShockRing.position.y = 0.14;
  root.add(slamShockRing);

  const chargeRingMat = new THREE.MeshBasicMaterial({
    color: '#38E8D8',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const chargeRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.08, 28), chargeRingMat);
  chargeRing.rotation.x = -Math.PI / 2;
  chargeRing.position.y = 0.08;
  root.add(chargeRing);

  const chargeInnerMat = new THREE.MeshBasicMaterial({
    color: '#F4B942',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const chargeInnerRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 8), chargeInnerMat);
  chargeInnerRing.rotation.x = -Math.PI / 2;
  chargeInnerRing.position.y = 0.56;
  root.add(chargeInnerRing);

  // Frontal Shield Block Barrier
  const blockWardMat = new THREE.MeshBasicMaterial({
    color: '#38E8D8',
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const blockWardMesh = new THREE.Mesh(new THREE.CircleGeometry(0.64, 8), blockWardMat);
  blockWardMesh.position.set(0, 0.74, 0.56);
  const blockWardRim = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.65, 8),
    new THREE.MeshBasicMaterial({
      color: '#F4B942',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  blockWardMesh.add(blockWardRim);
  blockWardMesh.visible = false;
  bodyPivot.add(blockWardMesh);

  // Quen / Aegis Ward Rune Dome
  const aegisDomeGroup = new THREE.Group();
  aegisDomeGroup.position.y = 0.82;
  const aegisShellMat = new THREE.MeshBasicMaterial({
    color: '#F4B942',
    transparent: true,
    opacity: 0.22,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aegisShell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.98, 1), aegisShellMat);
  const aegisTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.032, 6, 28),
    new THREE.MeshBasicMaterial({
      color: '#38E8D8',
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  aegisTorus.rotation.x = Math.PI / 2;
  aegisDomeGroup.add(aegisShell, aegisTorus);
  aegisDomeGroup.visible = false;
  root.add(aegisDomeGroup);

  let activeWpnColor = '#38E8D8';

  return {
    root,
    bodyPivot,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cloak,
    weaponGroup,
    slashArc,
    slashCoreArc,
    contactShadow,
    groundAura,
    selectionRing,
    setWeaponVisual(weaponId: string) {
      swordModel.visible = weaponId === 'sword';
      spearModel.visible = weaponId === 'spear';
      hammerModel.visible = weaponId === 'hammer';
      twinbladesModel.visible = weaponId === 'twinblades';
      offhandTwinblade.visible = weaponId === 'twinblades';
      bucklerGroup.visible = weaponId !== 'twinblades';
      if (weaponId === 'spear') activeWpnColor = '#F4B942';
      else if (weaponId === 'hammer') activeWpnColor = '#FF7B42';
      else if (weaponId === 'twinblades') activeWpnColor = '#C084FC';
      else activeWpnColor = '#38E8D8';
      slashMat.color.set(activeWpnColor);
    },
    updateAnimation(_dt, elapsed, p) {
      const gy = p.groundY ?? 0;
      const airY = Math.max(0, p.y - gy);
      const vy = p.vy ?? 0;
      root.position.set(p.x, gy, p.z);
      const idleBreath = p.speedRatio < 0.08 && airY <= 0.02 ? Math.sin(elapsed * 2.6) * 0.02 : 0;
      bodyPivot.position.y =
        0.11 +
        airY +
        (airY <= 0.02 ? Math.abs(Math.sin(p.walkPhase)) * 0.065 * p.speedRatio : 0) +
        idleBreath;
      bodyPivot.rotation.y = p.facing;
      bodyPivot.rotation.x = airY > 0.05 ? THREE.MathUtils.clamp(-vy * 0.022, -0.14, 0.18) : 0;
      bodyPivot.rotation.z = 0;
      bodyPivot.scale.set(
        p.squashX * (1 - idleBreath * 0.5),
        p.squashY * (1 + idleBreath * 0.9),
        p.squashX * (1 - idleBreath * 0.5),
      );

      const shadowScale = Math.max(0.48, 1 - airY * 0.28);
      contactShadow.scale.set(1.06 * shadowScale, 0.88 * shadowScale, 1);
      (contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.66 * shadowScale;

      (groundAura.material as THREE.MeshBasicMaterial).opacity =
        p.riposteReady ? 0.48 : p.specialAnimTimer > 0 ? 0.55 : 0.2 + Math.sin(elapsed * 3.2) * 0.05;
      selectionRingMat.color.set(p.riposteReady ? '#F4B942' : '#38E8D8');
      selectionRingMat.opacity =
        p.riposteReady ? 0.88 : p.specialAnimTimer > 0 ? 0.85 : 0.44 + Math.sin(elapsed * 3.6) * 0.14;

      // Two-segment articulated leg & knee flexion kinematics + velocity-responsive flight pose
      const swing = Math.sin(p.walkPhase) * 0.58 * p.speedRatio;
      if (airY > 0.05) {
        const riseBlend = THREE.MathUtils.clamp(vy / 7.5, -1, 1);
        leftLeg.rotation.x = 0.48 + riseBlend * 0.18;
        leftShin.rotation.x = -0.82 - Math.max(0, riseBlend) * 0.18;
        rightLeg.rotation.x = -0.32 - riseBlend * 0.12;
        rightShin.rotation.x = -0.46;
      } else {
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftShin.rotation.x = Math.max(-0.85, Math.min(0.05, -Math.abs(Math.cos(p.walkPhase)) * 0.52 * p.speedRatio));
        rightShin.rotation.x = Math.max(-0.85, Math.min(0.05, -Math.abs(Math.sin(p.walkPhase)) * 0.52 * p.speedRatio));
      }

      // Natural two-segment arm stride + shield stance
      leftArm.rotation.x = airY > 0.05 ? -0.45 : -swing * 0.62 - 0.12;
      leftArm.rotation.y = 0.14;
      leftArm.rotation.z = airY > 0.05 ? -0.22 : -0.06;
      leftForearm.rotation.x = -0.35 - p.speedRatio * 0.28;
      rightForearm.rotation.x = -0.32 - p.speedRatio * 0.22;

      // Secondary physics: swinging lantern, two-stage flowing cloak, plume & spinning amulet
      lanternPivot.rotation.x = 0.16 * p.speedRatio + Math.sin(elapsed * 4.4) * (0.06 + 0.14 * p.speedRatio);
      lanternPivot.rotation.z = Math.cos(elapsed * 3.8) * (0.04 + 0.1 * p.speedRatio);
      lanternGlassMat.emissiveIntensity = 1.42 + Math.sin(elapsed * 11) * 0.18;

      const airBillow = Math.min(0.55, airY * 0.28 + Math.max(0, -vy) * 0.03);
      cloak.rotation.x = 0.12 + p.speedRatio * 0.28 + airBillow + Math.sin(elapsed * 4.6) * 0.04;
      cloakLowerPivot.rotation.x = 0.08 + p.speedRatio * 0.22 + airBillow * 0.55 + Math.sin(elapsed * 5.2 - 0.9) * 0.07;

      tassetPivotLeft.rotation.x = -0.1 - Math.max(0, leftLeg.rotation.x) * 0.45;
      tassetPivotRight.rotation.x = -0.1 - Math.max(0, rightLeg.rotation.x) * 0.45;

      const lookYaw = Math.max(-0.62, Math.min(0.62, p.lookYaw ?? 0));
      headGroup.rotation.y = lookYaw + Math.sin(elapsed * 1.4) * 0.035;
      plumePivot.rotation.x = Math.sin(elapsed * 4.5) * 0.05 + p.speedRatio * 0.14 + airBillow * 0.25;
      amuletGroup.rotation.y = elapsed * 2.4;

      if ((p.aegisHits ?? 0) > 0) {
        aegisDomeGroup.visible = true;
        aegisDomeGroup.position.y = 0.82 + airY;
        aegisShell.rotation.y = elapsed * 1.4;
        aegisTorus.rotation.z = -elapsed * 2.2;
        aegisShellMat.opacity = 0.2 + Math.sin(elapsed * 7) * 0.07;
      } else {
        aegisDomeGroup.visible = false;
      }

      const chargeRatio = p.chargeRatio ?? 0;
      if (chargeRatio > 0.06) {
        chargeRing.visible = true;
        chargeInnerRing.visible = true;
        const pulse = p.chargeReady ? 1 + Math.sin(elapsed * 22) * 0.12 : 0.78 + chargeRatio * 0.42;
        chargeRing.scale.setScalar(pulse);
        chargeRing.rotation.z = elapsed * (p.chargeReady ? 6.5 : 2.8);
        chargeRingMat.color.set(p.chargeReady ? '#F4B942' : activeWpnColor);
        chargeRingMat.opacity = p.chargeReady ? 0.92 : 0.34 + chargeRatio * 0.45;
        chargeInnerRing.scale.setScalar(0.68 + chargeRatio * 0.55);
        chargeInnerRing.rotation.z = -elapsed * 5.2;
        chargeInnerMat.color.set(p.chargeReady ? '#FFF4DC' : '#F4B942');
        chargeInnerMat.opacity = p.chargeReady ? 0.88 : 0.25 + chargeRatio * 0.45;
      } else {
        chargeRing.visible = false;
        chargeRingMat.opacity = 0;
        chargeInnerRing.visible = false;
        chargeInnerMat.opacity = 0;
      }

      slashCrossMat.opacity = 0;
      slamRingMat.opacity = 0;
      slamShockMat.opacity = 0;
      slashPivot.position.y = 0.8 + airY;
      slashPivot.rotation.set(0, p.facing, 0);
      blockWardMesh.visible = false;

      if (p.dodging) {
        bodyPivot.rotation.x = 0.58;
        bodyPivot.position.y -= 0.09;
        leftArm.rotation.x = 0.72;
        rightArm.rotation.x = 0.72;
        leftForearm.rotation.x = -0.9;
        rightForearm.rotation.x = -0.9;
        cloak.rotation.x = 0.68;
        slashMat.opacity = 0;
        slashCoreMat.opacity = 0;
      } else if (p.slamPending) {
        bodyPivot.rotation.x = 0.48;
        rightArm.rotation.x = -2.25;
        rightArm.rotation.y = 0.2;
        rightForearm.rotation.x = -0.2;
        leftArm.rotation.x = -1.1;
        slashMat.opacity = 0;
        slashCoreMat.opacity = 0;
      } else if (p.specialAnimTimer > 0) {
        const t = Math.min(1, p.specialAnimTimer / 0.34);
        const prog = 1 - t;
        const isSlam = p.attackKind === 'slam';
        const isCharged = p.attackKind === 'charged';
        if (isSlam) {
          bodyPivot.rotation.x = 0.34 * t;
          rightArm.rotation.x = -0.35 + prog * 1.25;
          rightArm.rotation.y = 0;
          slamRing.scale.setScalar(0.8 + prog * 2.5);
          slamRingMat.color.set('#F4B942');
          slamRingMat.opacity = Math.min(0.95, t * 1.45);
          slamShockRing.scale.setScalar(0.9 + prog * 3.1);
          slamShockMat.opacity = Math.min(0.88, t * 1.3);
          slashMat.opacity = 0;
          slashCoreMat.opacity = 0;
        } else {
          bodyPivot.rotation.y = p.facing + prog * Math.PI * 2;
          bodyPivot.rotation.x = 0.18 * t;
          rightArm.rotation.x = -1.18;
          rightArm.rotation.y = -1.4 + prog * 3.8;
          rightForearm.rotation.x = -0.15;
          leftArm.rotation.x = -0.95;
          leftArm.rotation.y = 0.9 - prog * 2.2;
          cloak.rotation.x = 0.45 + prog * 0.25;
          slashPivot.rotation.z = isCharged ? 0.22 : -0.22;
          slashArc.rotation.y = -0.65 + prog * 1.3;
          slashArc.scale.setScalar(isCharged ? 1.48 : 1.36);
          slashMat.color.set(isCharged ? '#F4B942' : activeWpnColor);
          slashMat.opacity = Math.min(0.94, t * 1.25);
          slashCoreArc.rotation.y = slashArc.rotation.y;
          slashCoreArc.scale.setScalar(isCharged ? 1.48 : 1.36);
          slashCoreMat.opacity = Math.min(0.92, t * 1.25);
          slashCrossArc.rotation.y = -slashArc.rotation.y + 0.55;
          slashCrossArc.scale.setScalar(isCharged ? 1.42 : 1.28);
          slashCrossMat.color.set(isCharged ? '#38E8D8' : '#F4B942');
          slashCrossMat.opacity = Math.min(0.78, t * 1.08);
          slamRing.scale.setScalar(0.75 + prog * 1.95);
          slamRingMat.color.set(isCharged ? '#F4B942' : activeWpnColor);
          slamRingMat.opacity = Math.min(0.68, t * 0.95);
        }
      } else if (p.attackAnimTimer > 0) {
        const swungStep = (p.comboStep + 2) % 3;
        const maxDur = swungStep === 2 ? 0.34 : 0.26;
        const phase = p.attackPhase ?? 'hit';
        const phaseTotal = Math.max(0.01, p.attackPhaseTotal ?? maxDur);
        const phaseProg = 1 - Math.max(0, Math.min(1, (p.attackPhaseTimer ?? p.attackAnimTimer) / phaseTotal));
        const t = Math.min(1, p.attackAnimTimer / maxDur);
        const prog = 1 - t;
        const dir = swungStep === 1 ? -1 : 1;

        if (phase === 'windup') {
          // 1. WindUp: coil torso back, raise weapon arm & compress stance cleanly
          const easeWind = Math.sin(phaseProg * Math.PI * 0.5);
          bodyPivot.position.y -= 0.045 * easeWind;
          bodyPivot.rotation.y = p.facing - dir * 0.32 * easeWind;
          bodyPivot.rotation.x = -0.14 * easeWind;
          bodyPivot.rotation.z = -dir * 0.1 * easeWind;
          rightArm.rotation.x = -0.35 - 1.32 * easeWind;
          rightArm.rotation.y = dir * 1.38 * easeWind;
          rightForearm.rotation.x = -0.45 * easeWind;
          leftArm.rotation.x = -0.65 * easeWind;
          leftArm.rotation.y = 0.42 * easeWind;
          slashMat.opacity = 0;
          slashCoreMat.opacity = 0;
        } else if (phase === 'recovery') {
          // 3. Recovery: follow-through deceleration back toward combat stance
          const easeOut = 1 - phaseProg;
          bodyPivot.rotation.y = p.facing + dir * 0.22 * easeOut;
          bodyPivot.rotation.x = 0.08 * easeOut;
          rightArm.rotation.x = -0.25 - 0.58 * easeOut;
          rightArm.rotation.y = -dir * 1.15 * easeOut;
          rightForearm.rotation.x = -0.28;
          slashPivot.rotation.z = dir * -0.44;
          slashArc.rotation.y = dir * (0.45 + phaseProg * 0.35);
          slashArc.scale.setScalar(swungStep === 2 ? 1.28 : 1.12);
          slashMat.color.set(swungStep === 2 ? '#FF9E44' : activeWpnColor);
          slashMat.opacity = Math.max(0, 0.42 * easeOut);
          slashCoreMat.opacity = Math.max(0, 0.34 * easeOut);
        } else if (swungStep === 2) {
          // 2. Hit (Finisher): explosive 360 cleave or titan slam
          if (p.weaponId === 'hammer') {
            bodyPivot.rotation.x = 0.28 * (1 - phaseProg * 0.4);
            rightArm.rotation.x = -2.1 + phaseProg * 2.85;
            rightArm.rotation.y = 0;
            rightForearm.rotation.x = -0.12;
            slamRing.scale.setScalar(0.75 + phaseProg * 1.85);
            slamRingMat.color.set('#FF7B42');
            slamRingMat.opacity = Math.min(0.92, (1 - phaseProg * 0.4) * 1.1);
          } else {
            bodyPivot.rotation.y = p.facing + phaseProg * Math.PI * 2;
            bodyPivot.rotation.x = 0.16;
            rightArm.rotation.x = -1.15;
            rightArm.rotation.y = -1.2 + phaseProg * 3.2;
            rightForearm.rotation.x = -0.14;
            slamRing.scale.setScalar(0.7 + phaseProg * 1.65);
            slamRingMat.color.set('#F4B942');
            slamRingMat.opacity = Math.min(0.76, (1 - phaseProg * 0.4) * 0.95);
          }
          slashPivot.rotation.z = 0.16;
          slashArc.rotation.y = -0.9 + phaseProg * 1.85;
          slashArc.scale.setScalar(1.3);
          slashMat.color.set('#FF9E44');
          slashMat.opacity = 0.92;
          slashCoreArc.rotation.y = slashArc.rotation.y;
          slashCoreArc.scale.setScalar(1.3);
          slashCoreMat.opacity = 0.88;
          slashCrossArc.rotation.y = -slashArc.rotation.y + 0.7;
          slashCrossArc.scale.setScalar(1.2);
          slashCrossMat.color.set(activeWpnColor);
          slashCrossMat.opacity = 0.75;
        } else {
          // 2. Hit (Standard Arc): crisp snap across impact cone
          const hitSnap = Math.sin(Math.min(1, phaseProg * 1.15) * Math.PI * 0.5);
          bodyPivot.rotation.y = p.facing + dir * (-0.28 + hitSnap * 0.64);
          bodyPivot.rotation.x = swungStep === 0 ? 0.14 : -0.06;
          bodyPivot.rotation.z = dir * 0.12;
          rightArm.rotation.x = swungStep === 0 ? -1.15 : -0.92;
          rightArm.rotation.y = dir * (1.32 - hitSnap * 2.65);
          rightForearm.rotation.x = -0.18;
          if (p.weaponId === 'twinblades') {
            leftArm.rotation.x = -1.02;
            leftArm.rotation.y = -dir * (1.15 - hitSnap * 2.25);
            leftForearm.rotation.x = -0.18;
          }
          slashPivot.rotation.z = dir * -0.44;
          slashArc.rotation.y = dir * (-0.65 + (phase === 'hit' ? phaseProg : prog) * 1.25);
          slashArc.scale.setScalar(1.14);
          slashMat.color.set(activeWpnColor);
          slashMat.opacity = Math.min(0.92, Math.max(0.55, t * 1.22));
          slashCoreArc.rotation.y = slashArc.rotation.y;
          slashCoreArc.scale.setScalar(1.14);
          slashCoreMat.opacity = Math.min(0.86, Math.max(0.5, t * 1.15));
          if (p.weaponId === 'twinblades' || swungStep === 1) {
            slashCrossArc.rotation.y = slashArc.rotation.y + (swungStep === 1 ? -0.35 : 0.45);
            slashCrossArc.scale.setScalar(1.04);
            slashCrossMat.color.set(swungStep === 1 ? '#F4B942' : activeWpnColor);
            slashCrossMat.opacity = 0.62;
          }
        }
      } else if (p.blocking) {
        bodyPivot.rotation.x = 0.09;
        leftArm.rotation.x = -1.08;
        leftArm.rotation.y = 0.85;
        leftArm.rotation.z = -0.28;
        leftForearm.rotation.x = -0.45;
        rightArm.rotation.x = -0.52;
        rightArm.rotation.y = -0.25;
        blockWardMesh.visible = true;
        blockWardMat.opacity = 0.36 + Math.sin(elapsed * 9) * 0.1;
        blockWardMesh.scale.setScalar(0.96 + Math.sin(elapsed * 7) * 0.05);
        slashMat.opacity = 0;
        slashCoreMat.opacity = 0;
      } else if ((p.flourishTimer ?? 0) > 0) {
        const fRatio = Math.min(1, (p.flourishTimer ?? 0) / 0.55);
        const fWave = Math.sin((1 - fRatio) * Math.PI);
        bodyPivot.rotation.x = -0.1 * fWave;
        rightArm.rotation.x = -0.2 - 1.75 * fWave;
        rightArm.rotation.y = 0.35 * fWave;
        leftArm.rotation.x = -0.75 * fWave;
        leftArm.rotation.y = 0.4 * fWave;
        slashPivot.rotation.z = 0.24;
        slashArc.rotation.y = -0.5 + (1 - fRatio) * 1.1;
        slashArc.scale.setScalar(1.05);
        slashMat.color.set('#F4B942');
        slashMat.opacity = 0.55 * fWave;
        slashCoreMat.opacity = 0.45 * fWave;
      } else {
        rightArm.rotation.x = chargeRatio > 0.05 ? -0.82 - chargeRatio * 0.82 : swing * 0.55 - 0.16;
        rightArm.rotation.y = chargeRatio > 0.05 ? 0.65 * chargeRatio : -0.08;
        slashMat.opacity = 0;
        slashCoreMat.opacity = 0;
      }

      if (p.hitFlashTimer > 0) {
        torso.material = ivoryMat;
        breastplate.material = ivoryMat;
      } else {
        torso.material = gambesonMat;
        breastplate.material = darkSteelMat;
      }
      if (p.riposteReady) {
        const rp = 0.5 + 0.5 * Math.sin(elapsed * 18);
        goldMat.emissive.set('#F4B942');
        goldMat.emissiveIntensity = 0.45 + rp * 0.55;
      } else {
        goldMat.emissive.set('#7E490E');
        goldMat.emissiveIntensity = 0.26;
      }
      if (p.invulnTimer > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 24);
        gambesonMat.emissive.set('#38E8D8');
        gambesonMat.emissiveIntensity = 0.16 + pulse * 0.28;
      } else {
        gambesonMat.emissive.set('#0B1633');
        gambesonMat.emissiveIntensity = 0.12;
      }
      bodyPivot.visible = true;
    },
  };
}

function createTowerShieldGeometry(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, hh * 0.85);
  shape.lineTo(-hw * 0.55, hh);
  shape.lineTo(hw * 0.55, hh);
  shape.lineTo(hw, hh * 0.85);
  shape.lineTo(hw * 0.92, -hh * 0.25);
  shape.lineTo(0, -hh);
  shape.lineTo(-hw * 0.92, -hh * 0.25);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: depth * 0.35,
    bevelSegments: 2,
    steps: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

function createCurvedBladeGeometry(length: number, width: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width * 0.85, length * 0.42, width * 0.22, length);
  shape.quadraticCurveTo(-width * 0.15, length * 0.55, -width * 0.2, 0.04);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: depth * 0.35,
    bevelSegments: 1,
    steps: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

function createWingFinGeometry(span: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(span, height * 0.52);
  shape.lineTo(span * 0.72, -height * 0.24);
  shape.lineTo(span * 0.36, -height * 0.12);
  shape.lineTo(span * 0.2, -height * 0.55);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.25,
    bevelSize: depth * 0.25,
    bevelSegments: 1,
    steps: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

export function createEnemyRig(
  kind: EnemyKind,
  inkMat: THREE.LineBasicMaterial,
  shadowTex?: THREE.CanvasTexture,
  glowTex?: THREE.CanvasTexture,
  bossId?: BossId,
  maxAniso = 4,
): EnemyVisualRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const entityTex = createHeroMaterialTextures(maxAniso);

  const bossDef =
    kind === 'boss' && bossId ? WEEKLY_BOSSES.find((b) => b.id === bossId) : undefined;

  const shadowRadius = kind === 'boss' ? 1.18 : kind === 'sentinel' ? 0.76 : 0.62;
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(shadowRadius, 22),
    new THREE.MeshBasicMaterial({
      map: shadowTex ?? null,
      color: shadowTex ? '#ffffff' : '#090D1A',
      transparent: true,
      opacity: shadowTex ? 0.64 : 0.44,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(1.12, 0.86, 1);
  contactShadow.position.y = 0.014;
  root.add(contactShadow);

  const colorMap: Record<EnemyKind, string> = {
    slime: '#1FB8A8',
    sentinel: '#1B2A4D',
    caster: '#4A2080',
    boss: bossDef?.bodyColor ?? '#8C2F14',
    marauder: '#121526',
  };
  const auraColorMap: Record<EnemyKind, string> = {
    slime: '#38E8D8',
    sentinel: '#F4B942',
    caster: '#C084FC',
    boss: bossDef?.accentColor ?? '#FF7B42',
    marauder: '#FF3B5C',
  };

  const auraDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowRadius * 2.9, shadowRadius * 2.9),
    new THREE.MeshBasicMaterial({
      map: glowTex ?? shadowTex ?? null,
      color: auraColorMap[kind],
      transparent: true,
      opacity: kind === 'boss' || kind === 'marauder' ? 0.36 : 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  auraDisc.rotation.x = -Math.PI / 2;
  auraDisc.position.y = 0.022;
  root.add(auraDisc);

  // AAA Physical Materials with procedural normalMaps & micro-scratches
  const primaryMat: THREE.MeshPhysicalMaterial =
    kind === 'slime'
      ? new THREE.MeshPhysicalMaterial({
          color: colorMap[kind],
          normalMap: entityTex.skinNormal,
          normalScale: new THREE.Vector2(0.38, 0.38),
          roughness: 0.1,
          metalness: 0.04,
          clearcoat: 1.0,
          clearcoatRoughness: 0.06,
          iridescence: 0.65,
          iridescenceIOR: 1.42,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          emissive: '#0C524C',
          emissiveIntensity: 0.22,
        })
      : kind === 'caster' || kind === 'marauder'
        ? new THREE.MeshPhysicalMaterial({
            color: colorMap[kind],
            normalMap: entityTex.velvet.normalMap,
            normalScale: new THREE.Vector2(0.62, 0.62),
            roughnessMap: entityTex.velvet.roughnessMap,
            roughness: 0.82,
            metalness: 0.08,
            sheen: 0.85,
            sheenRoughness: 0.55,
            sheenColor: new THREE.Color(kind === 'caster' ? '#C084FC' : '#F43F5E'),
            emissive: kind === 'marauder' ? '#6E0F2A' : '#3B157A',
            emissiveIntensity: kind === 'marauder' ? 0.55 : 0.36,
          })
        : new THREE.MeshPhysicalMaterial({
            color: colorMap[kind],
            normalMap: entityTex.steel.normalMap,
            normalScale: new THREE.Vector2(0.78, 0.78),
            roughnessMap: entityTex.steel.roughnessMap,
            roughness: 0.38,
            metalness: 0.62,
            clearcoat: 0.36,
            clearcoatRoughness: 0.24,
            anisotropy: 0.48,
            emissive: kind === 'boss' && bossDef ? bossDef.emissiveColor : '#090F20',
            emissiveIntensity: kind === 'boss' ? 0.42 : 0.2,
          });
  const baseEmissive = primaryMat.emissive.clone();
  const baseEmissiveInt = primaryMat.emissiveIntensity;

  const darkArmorMat = new THREE.MeshPhysicalMaterial({
    color: kind === 'boss' ? '#17131D' : kind === 'caster' ? '#1E1535' : '#101829',
    normalMap: entityTex.darkSteel.normalMap,
    normalScale: new THREE.Vector2(0.68, 0.68),
    roughnessMap: entityTex.darkSteel.roughnessMap,
    roughness: 0.44,
    metalness: 0.64,
    clearcoat: 0.22,
  });
  const trimMat = new THREE.MeshPhysicalMaterial({
    color: bossDef?.accentColor ?? (kind === 'caster' ? '#D4A853' : kind === 'marauder' ? '#94A3B8' : '#F4B942'),
    normalMap: entityTex.gold.normalMap,
    normalScale: new THREE.Vector2(0.58, 0.58),
    roughnessMap: entityTex.gold.roughnessMap,
    emissive: bossDef?.emissiveColor ?? (kind === 'caster' ? '#7E22CE' : '#7A4610'),
    emissiveIntensity: 0.4,
    roughness: 0.22,
    metalness: 0.88,
    clearcoat: 0.35,
    anisotropy: 0.52,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: '#E2D7BF',
    normalMap: entityTex.skinNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.72,
    metalness: 0.04,
  });
  const eyeGlowMat = new THREE.MeshBasicMaterial({
    color:
      kind === 'slime'
        ? '#FFF7D6'
        : kind === 'caster'
          ? '#E879F9'
          : kind === 'sentinel'
            ? '#FF9E3D'
            : (bossDef?.accentColor ?? '#FF3B5C'),
  });
  const arcaneMat = new THREE.MeshPhysicalMaterial({
    color: kind === 'slime' ? '#7EF9EC' : kind === 'caster' ? '#C084FC' : (bossDef?.accentColor ?? '#FF4D6D'),
    emissive: kind === 'slime' ? '#38E8D8' : kind === 'caster' ? '#A855F7' : (bossDef?.emissiveColor ?? '#FF2E54'),
    emissiveIntensity: 1.45,
    roughness: 0.14,
    metalness: 0.35,
    clearcoat: 1.0,
    iridescence: 0.7,
  });

  let leftLegPivot: THREE.Group | null = null;
  let rightLegPivot: THREE.Group | null = null;
  let leftArmPivot: THREE.Group | null = null;
  let rightArmPivot: THREE.Group | null = null;
  let headGroup: THREE.Group | null = null;
  let coreSpinMesh: THREE.Object3D | null = null;
  let haloSpinMesh: THREE.Object3D | null = null;
  let orbitGroup: THREE.Group | null = null;
  const secondaryMeshes: THREE.Object3D[] = [];

  if (kind === 'slime') {
    const baseSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 0.16, 14), primaryMat);
    baseSkirt.position.y = 0.08;
    baseSkirt.renderOrder = 2;
    bodyGroup.add(baseSkirt);

    const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), primaryMat);
    dome.scale.set(1.12, 0.88, 1.08);
    dome.position.y = 0.38;
    dome.castShadow = true;
    dome.renderOrder = 2;
    bodyGroup.add(dome);

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + 0.3;
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), primaryMat);
      lobe.scale.set(1.25, 0.72, 1.05);
      lobe.position.set(Math.cos(ang) * 0.44, 0.13, Math.sin(ang) * 0.44);
      lobe.renderOrder = 2;
      bodyGroup.add(lobe);
      secondaryMeshes.push(lobe);
    }

    // Inner suspended golden-teal Relic Core + skull inclusion + spinning ring
    const innerGroup = new THREE.Group();
    innerGroup.position.set(0, 0.4, 0);
    const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), arcaneMat);
    coreCrystal.scale.set(0.95, 1.25, 0.95);
    addInkEdges(coreCrystal, inkMat, 32);
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.032, 6, 14), trimMat);
    coreRing.rotation.x = Math.PI / 3;
    const floatingBone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), boneMat);
    floatingBone.position.set(-0.18, -0.08, 0.1);
    innerGroup.add(coreCrystal, coreRing, floatingBone);
    bodyGroup.add(innerGroup);
    coreSpinMesh = innerGroup;

    for (let k = 0; k < 3; k++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.26, 5), arcaneMat);
      spike.position.set((k - 1) * 0.16, 0.78 - Math.abs(k - 1) * 0.08, -0.08 - Math.abs(k - 1) * 0.06);
      spike.rotation.z = (1 - k) * 0.32;
      spike.rotation.x = -0.22;
      addInkEdges(spike, inkMat, 32);
      bodyGroup.add(spike);
    }

    for (const sx of [-0.17, 0.17]) {
      const socket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.08), darkArmorMat);
      socket.position.set(sx, 0.48, 0.51);
      socket.rotation.z = sx < 0 ? -0.24 : 0.24;
      socket.renderOrder = 3;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), eyeGlowMat);
      eye.position.set(sx, 0.46, 0.55);
      eye.renderOrder = 3;
      bodyGroup.add(socket, eye);
    }
  } else if (kind === 'sentinel') {
    const makeSentinelLeg = (ox: number) => {
      const piv = new THREE.Group();
      piv.position.set(ox, 0.42, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.24, 6), darkArmorMat);
      thigh.position.y = -0.1;
      addInkEdges(thigh, inkMat, 32);
      const greave = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.26, 0.25), primaryMat);
      greave.position.set(0, -0.29, 0.02);
      greave.castShadow = true;
      addInkEdges(greave, inkMat, 32);
      const kneeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.08), trimMat);
      kneeTrim.position.set(0, -0.18, 0.12);
      piv.add(thigh, greave, kneeTrim);
      bodyGroup.add(piv);
      return piv;
    };
    leftLegPivot = makeSentinelLeg(-0.2);
    rightLegPivot = makeSentinelLeg(0.2);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.34, 0.18, 8), darkArmorMat);
    waist.position.y = 0.48;
    addInkEdges(waist, inkMat, 32);
    const beltBuckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), trimMat);
    beltBuckle.position.set(0, 0.5, 0.32);
    bodyGroup.add(waist, beltBuckle);

    for (const sx of [-0.3, 0.3]) {
      const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.32), trimMat);
      tasset.position.set(sx, 0.4, 0.02);
      tasset.rotation.z = sx < 0 ? 0.22 : -0.22;
      addInkEdges(tasset, inkMat, 32);
      bodyGroup.add(tasset);
    }

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.3, 0.56, 8), primaryMat);
    chest.scale.set(1.12, 1, 0.88);
    chest.position.y = 0.82;
    chest.castShadow = true;
    addInkEdges(chest, inkMat, 32);
    const breastPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.14), trimMat);
    breastPlate.position.set(0, 0.86, 0.28);
    addInkEdges(breastPlate, inkMat, 32);
    const gorget = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 6, 12), trimMat);
    gorget.rotation.x = Math.PI / 2;
    gorget.position.y = 1.1;
    const chestRune = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), eyeGlowMat);
    chestRune.position.set(0, 0.87, 0.36);
    bodyGroup.add(chest, breastPlate, gorget, chestRune);

    const head = new THREE.Group();
    head.position.set(0, 1.24, 0.02);
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.34, 8), primaryMat);
    helm.castShadow = true;
    addInkEdges(helm, inkMat, 32);
    const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.16), darkArmorMat);
    faceplate.position.set(0, -0.02, 0.14);
    addInkEdges(faceplate, inkMat, 32);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.07), eyeGlowMat);
    visor.position.set(0, 0.02, 0.22);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.36), trimMat);
    crest.position.set(0, 0.23, -0.03);
    addInkEdges(crest, inkMat, 32);
    head.add(helm, faceplate, visor, crest);
    for (const sx of [-0.22, 0.22]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 5), trimMat);
      horn.position.set(sx, 0.16, 0.02);
      horn.rotation.z = sx < 0 ? 0.55 : -0.55;
      addInkEdges(horn, inkMat, 32);
      head.add(horn);
    }
    bodyGroup.add(head);
    headGroup = head;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.46, 0.98, 0);
    const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.34), trimMat);
    lPauldron.rotation.z = 0.22;
    addInkEdges(lPauldron, inkMat, 32);
    const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.18), darkArmorMat);
    lForearm.position.set(-0.04, -0.22, 0.08);
    addInkEdges(lForearm, inkMat, 32);
    const shieldGeo = createTowerShieldGeometry(0.56, 0.84, 0.08);
    const shieldMesh = new THREE.Mesh(shieldGeo, primaryMat);
    shieldMesh.position.set(-0.14, -0.26, 0.26);
    shieldMesh.rotation.y = -0.32;
    shieldMesh.castShadow = true;
    addInkEdges(shieldMesh, inkMat, 34);
    const shieldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.12), trimMat);
    shieldTrim.position.copy(shieldMesh.position);
    shieldTrim.rotation.y = shieldMesh.rotation.y;
    const shieldBoss = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), eyeGlowMat);
    shieldBoss.position.set(-0.18, -0.24, 0.33);
    leftArm.add(lPauldron, lForearm, shieldMesh, shieldTrim, shieldBoss);
    bodyGroup.add(leftArm);
    leftArmPivot = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(0.46, 0.98, 0);
    const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.34), trimMat);
    rPauldron.rotation.z = -0.22;
    addInkEdges(rPauldron, inkMat, 32);
    const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.18), darkArmorMat);
    rForearm.position.set(0.04, -0.22, 0.1);
    addInkEdges(rForearm, inkMat, 32);
    const halberdGroup = new THREE.Group();
    halberdGroup.position.set(0.08, -0.28, 0.22);
    halberdGroup.rotation.x = 0.38;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 1.38, 6), darkArmorMat);
    shaft.position.y = 0.28;
    addInkEdges(shaft, inkMat, 32);
    const axeBlade = new THREE.Mesh(createCurvedBladeGeometry(0.46, 0.26, 0.045), trimMat);
    axeBlade.position.set(0, 0.68, 0.04);
    axeBlade.rotation.y = Math.PI / 2;
    addInkEdges(axeBlade, inkMat, 32);
    const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.34, 4), eyeGlowMat);
    spearTip.position.y = 1.08;
    addInkEdges(spearTip, inkMat, 32);
    halberdGroup.add(shaft, axeBlade, spearTip);
    rightArm.add(rPauldron, rForearm, halberdGroup);
    bodyGroup.add(rightArm);
    rightArmPivot = rightArm;
  } else if (kind === 'caster') {
    const robeSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.48, 0.72, 10), primaryMat);
    robeSkirt.position.y = 0.42;
    robeSkirt.castShadow = true;
    addInkEdges(robeSkirt, inkMat, 32);
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.14, 10), trimMat);
    sash.position.y = 0.74;
    addInkEdges(sash, inkMat, 32);
    const chestRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.23, 0.44, 10), darkArmorMat);
    chestRobe.position.y = 0.98;
    addInkEdges(chestRobe, inkMat, 32);
    bodyGroup.add(robeSkirt, sash, chestRobe);

    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.05), trimMat);
      ribbon.position.set(Math.cos(ang) * 0.36, 0.28, Math.sin(ang) * 0.36);
      ribbon.rotation.y = -ang;
      ribbon.rotation.x = 0.25;
      addInkEdges(ribbon, inkMat, 32);
      bodyGroup.add(ribbon);
      secondaryMeshes.push(ribbon);
    }

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.18, 7, 1, true), trimMat);
    collar.position.set(0, 1.16, -0.04);
    addInkEdges(collar, inkMat, 32);
    bodyGroup.add(collar);

    const head = new THREE.Group();
    head.position.set(0, 1.32, 0.02);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.52, 8), primaryMat);
    hood.position.set(0, 0.1, -0.04);
    hood.rotation.x = -0.18;
    addInkEdges(hood, inkMat, 32);
    const faceShadow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), darkArmorMat);
    faceShadow.position.set(0, -0.02, 0.08);
    head.add(hood, faceShadow);
    for (const sx of [-0.065, 0.065]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), eyeGlowMat);
      eye.position.set(sx, -0.01, 0.22);
      head.add(eye);
    }
    const hoodGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), arcaneMat);
    hoodGem.position.set(0, 0.16, 0.21);
    head.add(hoodGem);
    bodyGroup.add(head);
    headGroup = head;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.36, 1.08, 0.04);
    const lSleeve = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 6), primaryMat);
    lSleeve.position.set(-0.04, -0.16, 0.08);
    lSleeve.rotation.x = -0.5;
    addInkEdges(lSleeve, inkMat, 32);
    const sealGroup = new THREE.Group();
    sealGroup.position.set(-0.08, -0.12, 0.38);
    const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.026, 6, 16), arcaneMat);
    const sealCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), eyeGlowMat);
    sealGroup.add(sealRing, sealCore);
    leftArm.add(lSleeve, sealGroup);
    bodyGroup.add(leftArm);
    leftArmPivot = leftArm;
    coreSpinMesh = sealGroup;

    const rightArm = new THREE.Group();
    rightArm.position.set(0.36, 1.08, 0.04);
    const rSleeve = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 6), primaryMat);
    rSleeve.position.set(0.04, -0.16, 0.08);
    rSleeve.rotation.x = -0.45;
    addInkEdges(rSleeve, inkMat, 32);
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.12, -0.14, 0.24);
    staffGroup.rotation.x = 0.18;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 1.48, 6), darkArmorMat);
    rod.position.y = 0.06;
    addInkEdges(rod, inkMat, 32);
    const staffCrown = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 6, 12), trimMat);
    staffCrown.position.y = 0.86;
    const staffCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), eyeGlowMat);
    staffCrystal.position.y = 0.86;
    staffGroup.add(rod, staffCrown, staffCrystal);
    rightArm.add(rSleeve, staffGroup);
    bodyGroup.add(rightArm);
    rightArmPivot = rightArm;

    const halo = new THREE.Group();
    halo.position.set(0, 1.46, -0.16);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.036, 6, 18), trimMat);
    halo.add(haloRing);
    for (let m = 0; m < 3; m++) {
      const a = (m / 3) * Math.PI * 2;
      const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), arcaneMat);
      mote.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0);
      halo.add(mote);
    }
    bodyGroup.add(halo);
    haloSpinMesh = halo;
  } else if (kind === 'boss') {
    const makeBossLeg = (ox: number) => {
      const piv = new THREE.Group();
      piv.position.set(ox, 0.65, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.36, 7), darkArmorMat);
      thigh.position.y = -0.16;
      addInkEdges(thigh, inkMat, 32);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.4), primaryMat);
      shin.position.set(0, -0.44, 0.04);
      shin.castShadow = true;
      addInkEdges(shin, inkMat, 32);
      const kneeGuard = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), trimMat);
      kneeGuard.position.set(0, -0.26, 0.22);
      piv.add(thigh, shin, kneeGuard);
      bodyGroup.add(piv);
      return piv;
    };
    leftLegPivot = makeBossLeg(-0.36);
    rightLegPivot = makeBossLeg(0.36);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.3, 8), darkArmorMat);
    waist.position.y = 0.72;
    addInkEdges(waist, inkMat, 32);
    const frontTabard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.1), trimMat);
    frontTabard.position.set(0, 0.52, 0.44);
    frontTabard.rotation.x = -0.1;
    addInkEdges(frontTabard, inkMat, 32);
    bodyGroup.add(waist, frontTabard);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.48, 0.82, 10), primaryMat);
    chest.scale.set(1.18, 1, 0.86);
    chest.position.y = 1.24;
    chest.castShadow = true;
    addInkEdges(chest, inkMat, 32);
    const ribArmor = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.48, 0.22), darkArmorMat);
    ribArmor.position.set(0, 1.3, 0.44);
    addInkEdges(ribArmor, inkMat, 32);
    const riftCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), arcaneMat);
    riftCore.position.set(0, 1.3, 0.56);
    addInkEdges(riftCore, inkMat, 32);
    bodyGroup.add(chest, ribArmor, riftCore);
    coreSpinMesh = riftCore;

    const head = new THREE.Group();
    head.position.set(0, 1.84, 0.04);
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.44, 8), darkArmorMat);
    helm.castShadow = true;
    addInkEdges(helm, inkMat, 32);
    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 6, 14), trimMat);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.y = 0.14;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.12), eyeGlowMat);
    visor.position.set(0, 0.01, 0.28);
    head.add(helm, crownBand, visor);
    bodyGroup.add(head);
    headGroup = head;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.84, 1.48, 0);
    const lPauldron = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), trimMat);
    lPauldron.scale.set(1.15, 0.9, 1.15);
    addInkEdges(lPauldron, inkMat, 34);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.68, 0.28), primaryMat);
    lArmMesh.position.set(-0.04, -0.4, 0.06);
    lArmMesh.castShadow = true;
    addInkEdges(lArmMesh, inkMat, 32);
    const lGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.34), darkArmorMat);
    lGauntlet.position.set(-0.04, -0.74, 0.14);
    addInkEdges(lGauntlet, inkMat, 32);
    leftArm.add(lPauldron, lArmMesh, lGauntlet);
    bodyGroup.add(leftArm);
    leftArmPivot = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(0.84, 1.48, 0);
    const rPauldron = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), trimMat);
    rPauldron.scale.set(1.15, 0.9, 1.15);
    addInkEdges(rPauldron, inkMat, 34);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.68, 0.28), primaryMat);
    rArmMesh.position.set(0.04, -0.4, 0.06);
    rArmMesh.castShadow = true;
    addInkEdges(rArmMesh, inkMat, 32);
    const rGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.34), darkArmorMat);
    rGauntlet.position.set(0.04, -0.74, 0.14);
    addInkEdges(rGauntlet, inkMat, 32);
    rightArm.add(rPauldron, rArmMesh, rGauntlet);
    bodyGroup.add(rightArm);
    rightArmPivot = rightArm;

    const backHalo = new THREE.Group();
    backHalo.position.set(0, 1.56, -0.38);
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.055, 8, 24), trimMat);
    backHalo.add(crownRing);
    bodyGroup.add(backHalo);
    haloSpinMesh = backHalo;

    if (bossId === 'whisper_warden') {
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(createWingFinGeometry(0.95, 1.25, 0.07), trimMat);
        wing.position.set(sx * 0.42, 1.48, -0.32);
        wing.scale.x = sx;
        wing.rotation.y = sx * -0.25;
        addInkEdges(wing, inkMat, 32);
        bodyGroup.add(wing);
        secondaryMeshes.push(wing);
      }
      const glaiveShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 2.1, 6), darkArmorMat);
      glaiveShaft.position.set(0.06, -0.62, 0.42);
      glaiveShaft.rotation.x = Math.PI / 2 - 0.35;
      addInkEdges(glaiveShaft, inkMat, 32);
      const glaiveBlade = new THREE.Mesh(createCurvedBladeGeometry(0.75, 0.24, 0.05), arcaneMat);
      glaiveBlade.position.set(0.06, -0.26, 1.22);
      glaiveBlade.rotation.set(Math.PI / 2 - 0.35, Math.PI / 2, 0);
      addInkEdges(glaiveBlade, inkMat, 32);
      rightArm.add(glaiveShaft, glaiveBlade);
    } else if (bossId === 'sunstone_colossus') {
      for (const sx of [-0.34, 0.34]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.56, 6), trimMat);
        horn.position.set(sx, 0.34, 0.04);
        horn.rotation.z = sx < 0 ? 0.46 : -0.46;
        addInkEdges(horn, inkMat, 32);
        head.add(horn);
      }
      const hammerHaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.75, 6), darkArmorMat);
      hammerHaft.position.set(0.06, -0.65, 0.44);
      hammerHaft.rotation.x = Math.PI / 2 - 0.25;
      addInkEdges(hammerHaft, inkMat, 32);
      const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.86), trimMat);
      hammerHead.position.set(0.06, -0.42, 1.18);
      addInkEdges(hammerHead, inkMat, 32);
      const hammerCore = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.42), eyeGlowMat);
      hammerCore.position.copy(hammerHead.position);
      rightArm.add(hammerHaft, hammerHead, hammerCore);
    } else if (bossId === 'obsidian_archon') {
      const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), arcaneMat);
      spire.scale.set(0.75, 1.75, 0.75);
      spire.position.set(0, 0.62, 0);
      addInkEdges(spire, inkMat, 32);
      head.add(spire);

      const orbGrp = new THREE.Group();
      orbGrp.position.y = 1.36;
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2;
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), eyeGlowMat);
        shard.scale.set(0.75, 1.45, 0.75);
        shard.position.set(Math.cos(ang) * 1.18, Math.sin(k * 1.3) * 0.18, Math.sin(ang) * 1.18);
        addInkEdges(shard, inkMat, 32);
        orbGrp.add(shard);
      }
      bodyGroup.add(orbGrp);
      orbitGroup = orbGrp;

      const scepter = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 1.65, 6), darkArmorMat);
      scepter.position.set(0.06, -0.58, 0.38);
      scepter.rotation.x = Math.PI / 2 - 0.3;
      const scepterGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), eyeGlowMat);
      scepterGem.position.set(0.06, -0.3, 1.05);
      rightArm.add(scepter, scepterGem);
    } else {
      for (const sx of [-0.36, 0.36]) {
        const bladeHorn = new THREE.Mesh(createCurvedBladeGeometry(0.68, 0.16, 0.05), eyeGlowMat);
        bladeHorn.position.set(sx * 0.7, 0.16, 0.02);
        bladeHorn.rotation.z = sx < 0 ? 0.36 : -0.36;
        addInkEdges(bladeHorn, inkMat, 32);
        head.add(bladeHorn);
      }
      for (const [arm, sx] of [[leftArm, -1], [rightArm, 1]] as const) {
        const swordHilt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), trimMat);
        swordHilt.position.set(sx * 0.05, -0.74, 0.28);
        const blade = new THREE.Mesh(createCurvedBladeGeometry(1.15, 0.18, 0.045), arcaneMat);
        blade.position.set(sx * 0.05, -0.7, 0.34);
        blade.rotation.set(Math.PI / 2 - 0.2, 0, sx * 0.08);
        addInkEdges(blade, inkMat, 32);
        arm.add(swordHilt, blade);
      }
    }
  } else {
    const torsoCloak = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.15, 8), primaryMat);
    torsoCloak.position.y = 0.72;
    torsoCloak.castShadow = true;
    addInkEdges(torsoCloak, inkMat, 32);
    const chestHarness = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.28), darkArmorMat);
    chestHarness.position.set(0, 1.02, 0.06);
    addInkEdges(chestHarness, inkMat, 32);
    const voidHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), eyeGlowMat);
    voidHeart.position.set(0, 1.02, 0.22);
    bodyGroup.add(torsoCloak, chestHarness, voidHeart);

    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(createWingFinGeometry(0.68, 0.85, 0.05), darkArmorMat);
      wing.position.set(sx * 0.18, 1.14, -0.18);
      wing.scale.x = sx;
      wing.rotation.y = sx * -0.35;
      addInkEdges(wing, inkMat, 32);
      bodyGroup.add(wing);
      secondaryMeshes.push(wing);
    }

    const head = new THREE.Group();
    head.position.set(0, 1.42, 0.04);
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 7), primaryMat);
    cowl.position.set(0, 0.08, -0.04);
    cowl.rotation.x = -0.22;
    addInkEdges(cowl, inkMat, 32);
    const skullMask = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), boneMat);
    skullMask.position.set(0, -0.02, 0.1);
    addInkEdges(skullMask, inkMat, 32);
    head.add(cowl, skullMask);
    for (const sx of [-0.075, 0.075]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), eyeGlowMat);
      eye.position.set(sx, -0.01, 0.24);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 5), trimMat);
      horn.position.set(sx * 2.1, 0.14, -0.02);
      horn.rotation.z = sx < 0 ? 0.55 : -0.55;
      addInkEdges(horn, inkMat, 32);
      head.add(eye, horn);
    }
    bodyGroup.add(head);
    headGroup = head;

    for (const [isLeft, sx] of [[true, -1], [false, 1]] as const) {
      const arm = new THREE.Group();
      arm.position.set(sx * 0.38, 1.12, 0.02);
      const pauldron = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 5), trimMat);
      pauldron.rotation.z = sx * -0.8;
      addInkEdges(pauldron, inkMat, 32);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), darkArmorMat);
      forearm.position.set(sx * 0.05, -0.18, 0.12);
      forearm.rotation.x = -0.5;
      addInkEdges(forearm, inkMat, 32);
      const scythe = new THREE.Mesh(createCurvedBladeGeometry(0.76, 0.16, 0.035), arcaneMat);
      scythe.position.set(sx * 0.08, -0.24, 0.28);
      scythe.rotation.set(Math.PI / 2 - 0.15, sx * 0.2, sx * -0.25);
      addInkEdges(scythe, inkMat, 32);
      arm.add(pauldron, forearm, scythe);
      bodyGroup.add(arm);
      if (isLeft) leftArmPivot = arm;
      else rightArmPivot = arm;
    }

    const voidRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 6, 18), arcaneMat);
    voidRing.position.set(0, 1.18, -0.24);
    bodyGroup.add(voidRing);
    haloSpinMesh = voidRing;
  }

  const telegraphMat = new THREE.MeshBasicMaterial({
    color: '#FF3B5C',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.0, 28), telegraphMat);
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.03;
  root.add(telegraphRing);

  const targetRingMat = new THREE.MeshBasicMaterial({
    color: '#F4B942',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const targetRing = new THREE.Mesh(
    new THREE.RingGeometry(shadowRadius * 0.96, shadowRadius * 1.18, 28),
    targetRingMat,
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.y = 0.028;
  const targetInnerMat = new THREE.MeshBasicMaterial({
    color: '#FF3B5C',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const targetInner = new THREE.Mesh(
    new THREE.RingGeometry(shadowRadius * 0.68, shadowRadius * 0.84, 4),
    targetInnerMat,
  );
  targetRing.add(targetInner);
  root.add(targetRing);

  // Capture per-rig non-ink materials and LineSegments so KO fade never mutates shared inkMat
  const fadeMats = [
    { mat: primaryMat, baseOp: primaryMat.opacity, baseTrans: primaryMat.transparent },
    { mat: darkArmorMat, baseOp: darkArmorMat.opacity, baseTrans: darkArmorMat.transparent },
    { mat: trimMat, baseOp: trimMat.opacity, baseTrans: trimMat.transparent },
    { mat: boneMat, baseOp: boneMat.opacity, baseTrans: boneMat.transparent },
    { mat: eyeGlowMat, baseOp: eyeGlowMat.opacity, baseTrans: eyeGlowMat.transparent },
    { mat: arcaneMat, baseOp: arcaneMat.opacity, baseTrans: arcaneMat.transparent },
  ];
  const inkLines: THREE.LineSegments[] = [];
  // Ensure all primary solid enemy/boss meshes cast clean ground shadows
  bodyGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material !== eyeGlowMat) {
      obj.castShadow = true;
    }
    if (obj instanceof THREE.LineSegments) {
      inkLines.push(obj);
    }
  });

  const hpW = kind === 'boss' ? 1.65 : 0.92;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(hpW, 0.12),
    new THREE.MeshBasicMaterial({ color: '#0A0E1B', side: THREE.DoubleSide }),
  );
  const hpY = kind === 'boss' ? 2.65 : kind === 'slime' ? 1.45 : 1.95;
  hpBarBg.position.set(0, hpY, 0);
  hpBarBg.rotation.x = -Math.PI / 5;
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(hpW - 0.06, 0.08),
    new THREE.MeshBasicMaterial({ color: '#FF3B5C', side: THREE.DoubleSide }),
  );
  hpBarFill.position.z = 0.01;
  hpBarBg.add(hpBarFill);

  const eliteHaloMat = new THREE.MeshPhysicalMaterial({
    color: '#F4B942',
    emissive: '#FF5E3A',
    emissiveIntensity: 0.95,
    roughness: 0.18,
    metalness: 0.85,
    clearcoat: 0.4,
  });
  const eliteHalo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 8, 20), eliteHaloMat);
  eliteHalo.rotation.x = Math.PI / 2;
  eliteHalo.position.y = hpY - 0.16;
  eliteHalo.visible = false;
  root.add(eliteHalo);

  return {
    root,
    bodyGroup,
    telegraphRing,
    targetRing,
    hpBarBg,
    hpBarFill,
    primaryMat,
    baseEmissive,
    contactShadow,
    auraDisc,
    update(e, elapsed, isTargeted = false) {
      root.position.set(e.x, e.y, e.z);
      bodyGroup.rotation.y = e.facing;
      const eliteScale = e.isElite ? 1.15 : 1.0;

      if (e.state === 'ko') {
        const t = Math.min(1, Math.max(0, 1 - e.koTimer / 0.42));
        bodyGroup.rotation.x = t * (Math.PI / 2);
        bodyGroup.position.y = Math.max(-0.15, -t * 0.15);
        bodyGroup.scale.setScalar(eliteScale * (1 - t * 0.15));
        contactShadow.scale.setScalar(Math.max(0.24, 1 - t * 0.72));
        (auraDisc.material as THREE.MeshBasicMaterial).opacity = 0;
        telegraphMat.opacity = 0;
        targetRingMat.opacity = 0;
        targetInnerMat.opacity = 0;
        hpBarBg.visible = false;
        eliteHalo.visible = false;
        for (let i = 0; i < inkLines.length; i++) inkLines[i].visible = false;
        const alphaScale = Math.max(0, 1 - t);
        for (let i = 0; i < fadeMats.length; i++) {
          const fm = fadeMats[i];
          fm.mat.transparent = true;
          fm.mat.opacity = fm.baseOp * alphaScale;
        }
        return;
      }

      for (let i = 0; i < inkLines.length; i++) inkLines[i].visible = true;
      for (let i = 0; i < fadeMats.length; i++) {
        const fm = fadeMats[i];
        fm.mat.transparent = fm.baseTrans;
        fm.mat.opacity = fm.baseOp;
      }

      bodyGroup.rotation.x = 0;
      eliteHalo.visible = Boolean(e.isElite);
      if (e.isElite) {
        if (e.eliteAffix === 'swift') {
          eliteHaloMat.color.set('#38E8D8');
          eliteHaloMat.emissive.set('#0EA5E9');
        } else if (e.eliteAffix === 'bulwark') {
          eliteHaloMat.color.set('#F4B942');
          eliteHaloMat.emissive.set('#D97706');
        } else {
          eliteHaloMat.color.set('#FF5E3A');
          eliteHaloMat.emissive.set('#DC2626');
        }
        eliteHalo.rotation.z = elapsed * 2.1;
        eliteHalo.position.y = hpY - 0.16 + Math.sin(elapsed * 4) * 0.05;
      }

      const windupProg =
        e.state === 'windup' ? 1 - Math.max(0, e.stateTimer / Math.max(0.01, e.windupDuration)) : 0;
      const isIdle = e.state === 'idle';
      const isWindup = e.state === 'windup';
      const isAttack = e.state === 'attack';
      const isPhase2 = e.kind === 'boss' && e.bossPhase === 2;
      const spinSpeed = isPhase2 ? 3.8 : isWindup ? 4.4 : isIdle ? 0.85 : 1.5;

      const breath = Math.sin(elapsed * (isIdle ? 2.2 : 3.6) + e.walkPhase * 0.5) * 0.04;
      if (e.kind === 'slime') {
        const squash = isWindup
          ? -0.22 * windupProg
          : isAttack
            ? 0.24
            : Math.sin(elapsed * (isIdle ? 3.2 : 5.2) + e.walkPhase) * (isIdle ? 0.06 : 0.09);
        bodyGroup.scale.set(
          (1 - squash * 0.65) * eliteScale,
          (1 + squash) * eliteScale,
          (1 - squash * 0.65) * eliteScale,
        );
        bodyGroup.position.y = isAttack ? 0.22 : Math.max(0, Math.sin(e.walkPhase) * (isIdle ? 0.08 : 0.14));
      } else {
        bodyGroup.scale.set(
          (1 - breath * 0.5) * eliteScale,
          (1 + breath) * eliteScale,
          (1 - breath * 0.5) * eliteScale,
        );
        bodyGroup.position.y =
          e.kind === 'caster' || e.kind === 'marauder'
            ? 0.18 + Math.sin(elapsed * 4 + e.walkPhase) * 0.1
            : Math.abs(Math.sin(e.walkPhase)) * (isIdle ? 0.04 : 0.08);
      }

      const stride = Math.sin(e.walkPhase) * (isIdle ? 0.3 : 0.55);
      if (leftLegPivot && rightLegPivot) {
        leftLegPivot.rotation.x = isWindup ? -0.18 : stride;
        rightLegPivot.rotation.x = isWindup ? 0.18 : -stride;
      }

      if (leftArmPivot && rightArmPivot) {
        if (e.kind === 'sentinel') {
          leftArmPivot.rotation.x = isWindup ? -0.35 : -0.15 + stride * 0.25;
          leftArmPivot.rotation.y = isWindup ? 0.35 : 0;
          rightArmPivot.rotation.x = isWindup
            ? -1.25 * windupProg
            : isAttack
              ? 0.95
              : -stride * 0.35;
        } else if (e.kind === 'caster') {
          leftArmPivot.rotation.x = isWindup ? -0.85 - windupProg * 0.45 : -0.35 + Math.sin(elapsed * 3) * 0.1;
          rightArmPivot.rotation.x = isWindup ? -0.95 - windupProg * 0.4 : isAttack ? 0.55 : -0.25 + Math.cos(elapsed * 3) * 0.1;
        } else if (e.kind === 'marauder') {
          leftArmPivot.rotation.x = isWindup ? -1.1 * windupProg : isAttack ? 0.85 : -0.25;
          leftArmPivot.rotation.z = isWindup ? -0.45 * windupProg : isAttack ? 0.38 : -0.12;
          rightArmPivot.rotation.x = isWindup ? -1.1 * windupProg : isAttack ? 0.85 : -0.25;
          rightArmPivot.rotation.z = isWindup ? 0.45 * windupProg : isAttack ? -0.38 : 0.12;
        } else if (e.kind === 'boss') {
          leftArmPivot.rotation.x = isWindup ? -1.05 * windupProg : isAttack ? 0.8 : -stride * 0.4;
          rightArmPivot.rotation.x = isWindup ? -1.35 * windupProg : isAttack ? 1.05 : stride * 0.4;
        }
      }

      if (headGroup) {
        headGroup.rotation.y = isIdle
          ? Math.sin(elapsed * 1.1 + e.x * 0.4) * 0.22
          : Math.sin(elapsed * 1.8) * 0.08;
        headGroup.rotation.x = isWindup ? -0.15 * windupProg : isAttack ? 0.18 : 0;
      }

      if (coreSpinMesh) {
        coreSpinMesh.rotation.y = elapsed * spinSpeed;
        coreSpinMesh.rotation.x = elapsed * (spinSpeed * 0.55);
      }

      if (haloSpinMesh) {
        haloSpinMesh.rotation.z = elapsed * (isPhase2 ? 3.2 : 1.4);
      }

      if (orbitGroup) {
        orbitGroup.rotation.y = elapsed * (isPhase2 ? 2.8 : 1.35);
      }

      if (secondaryMeshes.length > 0) {
        for (let i = 0; i < secondaryMeshes.length; i++) {
          const m = secondaryMeshes[i];
          if (e.kind === 'slime') {
            const p = Math.sin(elapsed * 5 + i * 1.4);
            m.scale.set(1.2 + p * 0.14, 0.72 - p * 0.08, 1.05 + p * 0.14);
          } else {
            m.rotation.z = Math.sin(elapsed * 4.5 + i * 1.1) * 0.12;
          }
        }
      }

      const sScale = Math.max(0.72, 1 - bodyGroup.position.y * 0.35);
      contactShadow.scale.set(1.12 * sScale, 0.86 * sScale, 1);
      const auraMat = auraDisc.material as THREE.MeshBasicMaterial;
      auraDisc.scale.setScalar(
        isPhase2 ? 1.32 + Math.sin(elapsed * 8) * 0.1 : e.isElite ? 1.24 : 1,
      );
      auraMat.opacity =
        isWindup
          ? 0.48
          : isPhase2
            ? 0.56 + Math.sin(elapsed * 7) * 0.14
            : isIdle
              ? 0.12
              : e.kind === 'boss' || e.kind === 'marauder'
                ? 0.34 + Math.sin(elapsed * 4) * 0.08
                : 0.22;

      if (isTargeted) {
        targetRingMat.color.set('#F4B942');
        targetRingMat.opacity = 0.82 + Math.sin(elapsed * 7) * 0.14;
        targetInnerMat.color.set('#FF3B5C');
        targetInnerMat.opacity = 0.72 + Math.cos(elapsed * 7) * 0.16;
        targetRing.rotation.z = elapsed * 2.2;
        targetInner.rotation.z = -elapsed * 4.4;
        targetRing.scale.setScalar(1.06 + Math.sin(elapsed * 6) * 0.05);
      } else if (isWindup) {
        targetRingMat.color.set('#FF3B5C');
        targetRingMat.opacity = 0.48;
        targetInnerMat.opacity = 0;
        targetRing.scale.setScalar(1);
      } else if (isIdle) {
        targetRingMat.color.set('#64748B');
        targetRingMat.opacity = 0.22;
        targetInnerMat.opacity = 0;
        targetRing.scale.setScalar(1);
      } else {
        targetRingMat.opacity = 0;
        targetInnerMat.opacity = 0;
      }

      if (e.hitFlashTimer > 0) {
        const recoil = Math.min(1, e.hitFlashTimer / 0.14);
        primaryMat.emissive.set('#FFF4DC');
        primaryMat.emissiveIntensity = 2.1;
        bodyGroup.rotation.x = -0.34 * recoil;
        bodyGroup.scale.set(
          (1 - 0.16 * recoil) * eliteScale,
          (1 + 0.22 * recoil) * eliteScale,
          (1 - 0.16 * recoil) * eliteScale,
        );
      } else if (e.state === 'stunned') {
        primaryMat.emissive.set('#38E8D8');
        primaryMat.emissiveIntensity = 1.15 + Math.sin(elapsed * 18) * 0.45;
        bodyGroup.rotation.z = Math.sin(elapsed * 20) * 0.18;
      } else if (isWindup) {
        primaryMat.emissive.set('#FF3B5C');
        primaryMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 26) * 0.4;
        bodyGroup.rotation.z = 0;
      } else if ((e.slowTimer ?? 0) > 0 && (e.burnTimer ?? 0) > 0) {
        primaryMat.emissive.set('#F4B942');
        primaryMat.emissiveIntensity = 1.05 + Math.sin(elapsed * 16) * 0.35;
        bodyGroup.rotation.z = 0;
      } else if ((e.burnTimer ?? 0) > 0) {
        primaryMat.emissive.set('#FF5E3A');
        primaryMat.emissiveIntensity = 0.85 + Math.sin(elapsed * 14) * 0.25;
        bodyGroup.rotation.z = 0;
      } else if ((e.slowTimer ?? 0) > 0) {
        primaryMat.emissive.set('#38BDF8');
        primaryMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 9) * 0.2;
        bodyGroup.rotation.z = 0;
      } else if ((e.poisonTimer ?? 0) > 0) {
        primaryMat.emissive.set('#A855F7');
        primaryMat.emissiveIntensity = 0.65 + Math.sin(elapsed * 8) * 0.18;
        bodyGroup.rotation.z = 0;
      } else if (isPhase2) {
        primaryMat.emissive.set('#FF5E3A');
        primaryMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 10) * 0.25;
        bodyGroup.rotation.z = 0;
      } else {
        primaryMat.emissive.copy(baseEmissive);
        primaryMat.emissiveIntensity = baseEmissiveInt;
        bodyGroup.rotation.z = 0;
      }

      if (isWindup) {
        const rad = e.kind === 'caster' ? 1.15 : e.attackRange;
        telegraphRing.scale.setScalar(rad * (0.45 + windupProg * 0.55));
        telegraphMat.opacity = 0.5 + windupProg * 0.45;
      } else {
        telegraphMat.opacity = 0;
      }

      const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
      hpBarBg.visible = ratio < 1 || (!isIdle && (e.kind === 'boss' || Boolean(e.isElite)));
      hpBarFill.scale.x = Math.max(0.01, ratio);
      hpBarFill.position.x = -(1 - ratio) * ((hpW - 0.06) * 0.5);
    },
  };
}

export function createNpcRig(
  color: string,
  role: string,
  inkMat: THREE.LineBasicMaterial,
  shadowTex?: THREE.CanvasTexture,
  glowTex?: THREE.CanvasTexture,
  maxAniso = 4,
): NpcVisualRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const texSet = createHeroMaterialTextures(maxAniso);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.68, 22),
    new THREE.MeshBasicMaterial({
      map: shadowTex ?? null,
      color: shadowTex ? '#ffffff' : '#090D1A',
      transparent: true,
      opacity: shadowTex ? 0.62 : 0.42,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(1.08, 0.86, 1);
  contactShadow.position.y = 0.014;
  root.add(contactShadow);

  if (role === 'blacksmith' || role === 'alchemist' || role === 'night_guest') {
    const npcAura = new THREE.Mesh(
      new THREE.PlaneGeometry(1.86, 1.86),
      new THREE.MeshBasicMaterial({
        map: glowTex ?? shadowTex ?? null,
        color:
          role === 'blacksmith'
            ? '#FF9E44'
            : role === 'night_guest'
              ? '#A855F7'
              : '#38E8D8',
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    npcAura.rotation.x = -Math.PI / 2;
    npcAura.position.y = 0.02;
    root.add(npcAura);
  }

  // Detailed MeshPhysicalMaterial palette with procedural normalMaps & micro-scratches
  const tunicMat = new THREE.MeshPhysicalMaterial({
    color,
    normalMap: texSet.gambeson.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: texSet.gambeson.roughnessMap,
    roughness: 0.78,
    metalness: 0.08,
    sheen: 0.85,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#F3E6D0'),
  });
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: role === 'night_guest' ? '#2A233A' : '#E7C0A2',
    normalMap: texSet.skinNormal,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.58,
    metalness: 0.02,
    sheen: 0.25,
    sheenColor: new THREE.Color('#FFD9C4'),
  });
  const trimMat = new THREE.MeshPhysicalMaterial({
    color: role === 'night_guest' ? '#131022' : '#1E2C4D',
    normalMap: texSet.clothBlue.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.72,
    metalness: 0.14,
    sheen: 0.45,
    sheenColor: new THREE.Color('#6F8CD9'),
  });
  const leatherApronMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.leather.map,
    normalMap: texSet.leather.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: texSet.leather.roughnessMap,
    roughness: 0.62,
    metalness: 0.08,
    clearcoat: 0.16,
  });
  const darkLeatherMat = new THREE.MeshPhysicalMaterial({
    color: '#2B120C',
    normalMap: texSet.leather.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughness: 0.58,
    metalness: 0.12,
    clearcoat: 0.18,
  });
  const brassMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.gold.map,
    normalMap: texSet.gold.normalMap,
    normalScale: new THREE.Vector2(0.58, 0.58),
    roughnessMap: texSet.gold.roughnessMap,
    roughness: 0.24,
    metalness: 0.9,
    clearcoat: 0.34,
    anisotropy: 0.52,
  });
  const steelMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    map: texSet.steel.map,
    normalMap: texSet.steel.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: texSet.steel.roughnessMap,
    roughness: 0.26,
    metalness: 0.9,
    clearcoat: 0.42,
    anisotropy: 0.6,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: role === 'blacksmith' ? '#3B2318' : role === 'alchemist' ? '#4E2A3A' : '#261D2C',
    roughness: 0.78,
  });

  // Carved stone & brass plinth disc
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.085, 20), trimMat);
  baseDisc.position.y = 0.042;
  baseDisc.receiveShadow = true;
  baseDisc.castShadow = true;
  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.018, 6, 22), brassMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = 0.082;
  root.add(baseDisc, baseRim);

  // Articulated Booted Legs
  const bootGeo = createBootGeometry();
  const makeNpcLeg = (ox: number) => {
    const leg = new THREE.Group();
    leg.position.set(ox, 0.38, 0);
    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.24, 10), trimMat);
    trouser.position.y = -0.09;
    trouser.castShadow = true;
    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.18, 10), darkLeatherMat);
    bootShaft.position.y = -0.24;
    bootShaft.castShadow = true;
    const foot = new THREE.Mesh(bootGeo, darkLeatherMat);
    foot.scale.set(0.84, 0.82, 0.84);
    foot.position.set(0, -0.34, 0.035);
    foot.castShadow = true;
    leg.add(trouser, bootShaft, foot);
    return leg;
  };
  const leftLeg = makeNpcLeg(-0.115);
  const rightLeg = makeNpcLeg(0.115);

  // Contoured Lathe Torso + Waist Sash/Belt + Brass Buckle + Shoulder Mantle
  const npcTorsoPts = [
    new THREE.Vector2(0.0, -0.28),
    new THREE.Vector2(0.22, -0.26),
    new THREE.Vector2(0.195, -0.08),
    new THREE.Vector2(0.23, 0.14),
    new THREE.Vector2(0.185, 0.24),
    new THREE.Vector2(0.0, 0.25),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(npcTorsoPts, 16), tunicMat);
  torso.scale.set(1.06, 1.0, 0.84);
  torso.position.y = 0.64;
  torso.castShadow = true;
  addInkEdges(torso, inkMat, 36);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.215, 0.075, 16), darkLeatherMat);
  belt.scale.set(1.06, 1.0, 0.86);
  belt.position.y = 0.47;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.074, 0.038), brassMat);
  buckle.position.set(0, 0.47, 0.182);
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.042, 8, 16), trimMat);
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 0.87, 0);

  // Sculpted Anatomical Head + Face Features
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.02, 0.01);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.084, 0.09, 10), skinMat);
  neck.position.y = -0.04;
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14), skinMat);
  cranium.scale.set(0.95, 1.06, 1.0);
  cranium.position.y = 0.07;
  cranium.castShadow = true;
  addInkEdges(cranium, inkMat, 40);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.065, 6), skinMat);
  nose.rotation.x = Math.PI * 0.36;
  nose.position.set(0, 0.06, 0.164);
  headGroup.add(neck, cranium, nose);

  if (role !== 'night_guest') {
    const scleraMat = new THREE.MeshBasicMaterial({ color: '#F7F1E5' });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#1F2D4A' });
    for (const ex of [-0.052, 0.052]) {
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 8), scleraMat);
      sclera.scale.set(1.05, 0.72, 0.55);
      sclera.position.set(ex, 0.085, 0.144);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), pupilMat);
      pupil.position.set(ex, 0.085, 0.154);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.014, 0.02), hairMat);
      brow.position.set(ex, 0.116, 0.15);
      headGroup.add(sclera, pupil, brow);
    }
  }

  // Two-part Articulated Arms + Hands
  const makeNpcArm = (ox: number) => {
    const arm = new THREE.Group();
    arm.position.set(ox, 0.82, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), tunicMat);
    shoulder.castShadow = true;
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.18, 10), tunicMat);
    upper.position.y = -0.1;
    upper.castShadow = true;
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.04, 0.17, 10),
      role === 'blacksmith' ? skinMat : leatherApronMat,
    );
    forearm.position.y = -0.25;
    forearm.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), skinMat);
    hand.position.y = -0.35;
    arm.add(shoulder, upper, forearm, hand);
    return arm;
  };
  const leftArm = makeNpcArm(-0.275);
  const rightArm = makeNpcArm(0.275);

  if (role === 'blacksmith') {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.16, 7), hairMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.02, 0.11);
    const bandana = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.09, 14), leatherApronMat);
    bandana.position.set(0, 0.13, 0);
    headGroup.add(beard, bandana);

    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.08), leatherApronMat);
    apron.position.set(0, 0.52, 0.19);
    apron.castShadow = true;
    const apronStrapL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.04), darkLeatherMat);
    apronStrapL.position.set(-0.11, 0.79, 0.175);
    const apronStrapR = apronStrapL.clone();
    apronStrapR.position.x = 0.11;
    bodyGroup.add(apron, apronStrapL, apronStrapR);

    const forgeHammer = new THREE.Group();
    forgeHammer.position.set(0, -0.35, 0.1);
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.46, 8), darkLeatherMat);
    haft.rotation.x = Math.PI / 2;
    haft.position.z = 0.12;
    const headIron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.28), steelMat);
    headIron.position.z = 0.32;
    headIron.castShadow = true;
    const glowingFace = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.11, 0.04),
      new THREE.MeshStandardMaterial({
        color: '#FF9E44',
        emissive: '#FF5E3A',
        emissiveIntensity: 1.8,
      }),
    );
    glowingFace.position.z = 0.46;
    forgeHammer.add(haft, headIron, glowingFace);
    rightArm.add(forgeHammer);
  } else if (role === 'alchemist') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.34, 10), tunicMat);
    hood.position.set(0, 0.19, -0.02);
    hood.rotation.x = -0.18;
    hood.castShadow = true;
    const goggleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.08), brassMat);
    goggleBridge.position.set(0, 0.11, 0.155);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: '#56F5E4',
      emissive: '#2EC4B6',
      emissiveIntensity: 0.75,
      roughness: 0.08,
      clearcoat: 1.0,
    });
    for (const gx of [-0.06, 0.06]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.045, 10), brassMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(gx, 0.11, 0.175);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.052, 10), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(gx, 0.11, 0.176);
      headGroup.add(rim, lens);
    }
    headGroup.add(hood, goggleBridge);

    const satchelVial = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.11, 8), lensMat);
    satchelVial.position.set(-0.22, 0.44, 0.09);
    bodyGroup.add(satchelVial);

    const flaskGroup = new THREE.Group();
    flaskGroup.position.set(0, -0.36, 0.08);
    const flaskBulb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 1),
      new THREE.MeshPhysicalMaterial({
        color: '#38E8D8',
        emissive: '#22D3EE',
        emissiveIntensity: 1.65,
        roughness: 0.1,
        clearcoat: 1.0,
        iridescence: 0.85,
      }),
    );
    const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.08, 8), brassMat);
    flaskNeck.position.y = 0.1;
    flaskGroup.add(flaskBulb, flaskNeck);
    rightArm.add(flaskGroup);
  } else if (role === 'night_guest') {
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.44, 8), trimMat);
    cowl.position.set(0, 0.2, -0.03);
    cowl.rotation.x = -0.22;
    cowl.castShadow = true;
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), brassMat);
    mask.position.set(0, 0.07, 0.135);
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: '#E879F9' });
    for (const gx of [-0.048, 0.048]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeGlowMat);
      eye.position.set(gx, 0.09, 0.178);
      headGroup.add(eye);
    }
    headGroup.add(cowl, mask);

    const lantern = new THREE.Group();
    lantern.position.set(0, -0.38, 0.12);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.18, 6, 1, true), brassMat);
    const soulGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.075, 0),
      new THREE.MeshStandardMaterial({
        color: '#D8B4FE',
        emissive: '#A855F7',
        emissiveIntensity: 2.0,
      }),
    );
    lantern.add(cage, soulGem);
    rightArm.add(lantern);
  } else {
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.172, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairMat,
    );
    hairCap.position.set(0, 0.085, -0.015);
    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 14), leatherApronMat);
    capBrim.position.set(0, 0.17, 0);
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 12), leatherApronMat);
    capCrown.position.set(0, 0.23, 0);
    capCrown.castShadow = true;
    const capFeather = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 6), brassMat);
    capFeather.position.set(0.14, 0.27, -0.02);
    capFeather.rotation.z = -0.45;
    headGroup.add(hairCap, capBrim, capCrown, capFeather);

    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.12), leatherApronMat);
    satchel.position.set(0, 0.56, -0.22);
    satchel.castShadow = true;
    const satchelClasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), brassMat);
    satchelClasp.position.set(0, 0.56, -0.285);
    bodyGroup.add(satchel, satchelClasp);
  }

  bodyGroup.add(leftLeg, rightLeg, torso, belt, buckle, collarRing, headGroup, leftArm, rightArm);

  return {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    contactShadow,
    update(x, z, facing, walkPhase, npcRole, elapsed) {
      root.position.set(x, 0, z);
      bodyGroup.rotation.y = facing;
      const breath = Math.sin(elapsed * 2.5 + x) * 0.024;
      bodyGroup.scale.set(1 - breath * 0.5, 1 + breath, 1 - breath * 0.5);
      headGroup.rotation.y = Math.sin(elapsed * 1.4 + x) * 0.12;
      if (npcRole === 'blacksmith') {
        rightArm.rotation.x = -0.58 + Math.sin(elapsed * 5.2) * 0.62;
        leftArm.rotation.x = -0.25 + Math.cos(elapsed * 2.6) * 0.1;
        bodyGroup.position.y = 0.08 + Math.abs(Math.sin(elapsed * 2.6)) * 0.03;
      } else if (npcRole === 'alchemist') {
        rightArm.rotation.x = -0.35 + Math.sin(elapsed * 2.5) * 0.15;
        leftArm.rotation.x = -0.15 + Math.sin(elapsed * 2.0) * 0.08;
        bodyGroup.position.y = 0.08 + Math.sin(elapsed * 2) * 0.03;
      } else {
        const swing = Math.sin(walkPhase) * 0.45;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.6;
        rightArm.rotation.x = swing * 0.6;
        bodyGroup.position.y = 0.08 + Math.abs(Math.sin(walkPhase)) * 0.04;
      }
    },
  };
}
