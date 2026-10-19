// iPhone Duo — parametric 3D model (mm units, 1 unit = 1 mm)
// Reference dimensions from Apple's published tech specs:
//   open  164.6 x 117.8 x 5.2 mm
//   closed 84.1 x 117.8 x 11.3 mm   (254 g)
// The two panels are 82.3 mm wide; the 1.8 mm difference in the closed width is the hinge spine.

import * as THREE from 'three';
import { toCreasedNormals } from '../vendor/addons/BufferGeometryUtils.js';
import { createInnerTexture, createOuterTexture, createLogoTexture } from './screens.js';

export const SPEC = {
  open: { w: 164.6, h: 117.8, d: 5.2 },
  closed: { w: 84.1, h: 117.8, d: 11.3 },
  halfW: 82.3,
  h: 117.8,
  gap: 0.9,
  weight: 254,
  inner: { w: 157.7, h: 110.9, px: [1878, 2670], ppi: 430, inches: 7.6 },
  outer: { w: 77.2, h: 112.3, px: [1398, 2034], ppi: 460, inches: 5.4 },
  camera: { plateauW: 34.0, plateauH: 22.0, plateauR: 9.6, bump: 1.6, lensD: 11.2, lensGap: 11.4 },
  bezel: { inner: 3.45, outer: 2.55, frameRim: 0.8 },
  colors: {
    starwhite: { name: 'Star White', frame: 0xd9dad6, glass: 0xf1f2ef, plateau: 0xf6f6f3 },
    silver: { name: 'Silver', frame: 0xc2c6ca, glass: 0xe6e9ea, plateau: 0xeaedee },
  },
};

const H = SPEC.h;
const HALF_H = H / 2;
const HALF_W = SPEC.halfW;
const T = SPEC.open.d;
const AXIS_Z = T / 2 + SPEC.gap / 2; // 3.05: fold axis 0.45 mm in front of the glass
const MAX_ANISO = 8;

const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ */
/* geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rr);
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + h);
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

// panel footprint; sign +1 = right half (B), -1 = left half (A)
// The profile is inset by the bevel size, so the finished (beveled) slab is exactly
// 82.3 x 117.8 mm and its outer face sits on the target silhouette.
function panelShape(sign) {
  const b = 0.495;
  const W = HALF_W - b;
  const HH = HALF_H - b;
  const rO = 10.6 - b; // outer corners
  const rH = 2.0; // hinge-side corners: rounded so the closed phone has no sharp nib
  const s = new THREE.Shape();
  if (sign > 0) {
    s.moveTo(b + rH, -HH);
    s.lineTo(W - rO, -HH);
    s.absarc(W - rO, -HH + rO, rO, -Math.PI / 2, 0, false);
    s.lineTo(W, HH - rO);
    s.absarc(W - rO, HH - rO, rO, 0, Math.PI / 2, false);
    s.lineTo(b + rH, HH);
    s.absarc(b + rH, HH - rH, rH, Math.PI / 2, Math.PI, false);
    s.lineTo(b, -HH + rH);
    s.absarc(b + rH, -HH + rH, rH, Math.PI, Math.PI * 1.5, false);
    s.closePath();
  } else {
    s.moveTo(-b - rH, -HH);
    s.lineTo(-W + rO, -HH);
    s.absarc(-W + rO, -HH + rO, rO, -Math.PI / 2, -Math.PI, true);
    s.lineTo(-W, HH - rO);
    s.absarc(-W + rO, HH - rO, rO, Math.PI, Math.PI / 2, true);
    s.lineTo(-b - rH, HH);
    s.absarc(-b - rH, HH - rH, rH, Math.PI / 2, 0, true);
    s.lineTo(-b, -HH + rH);
    s.absarc(-b - rH, -HH + rH, rH, 0, -Math.PI / 2, true);
    s.closePath();
  }
  return s;
}

function frontAreaShape(sign) {
  // glass / bezel footprint: 0.8 mm titanium rim on free, top and bottom edges
  const rim = 1.05;
  const W = HALF_W - rim;
  const HH = HALF_H - rim;
  const rO = 9.5;
  const rH = 2.0;
  const s = new THREE.Shape();
  if (sign > 0) {
    s.moveTo(rH, -HH);
    s.lineTo(W - rO, -HH);
    s.absarc(W - rO, -HH + rO, rO, -Math.PI / 2, 0, false);
    s.lineTo(W, HH - rO);
    s.absarc(W - rO, HH - rO, rO, 0, Math.PI / 2, false);
    s.lineTo(rH, HH);
    s.absarc(rH, HH - rH, rH, Math.PI / 2, Math.PI, false);
    s.lineTo(0, -HH + rH);
    s.absarc(rH, -HH + rH, rH, Math.PI, Math.PI * 1.5, false);
    s.closePath();
  } else {
    s.moveTo(-rH, -HH);
    s.lineTo(-W + rO, -HH);
    s.absarc(-W + rO, -HH + rO, rO, -Math.PI / 2, -Math.PI, true);
    s.lineTo(-W, HH - rO);
    s.absarc(-W + rO, HH - rO, rO, Math.PI, Math.PI / 2, true);
    s.lineTo(-rH, HH);
    s.absarc(-rH, HH - rH, rH, Math.PI / 2, 0, true);
    s.lineTo(0, -HH + rH);
    s.absarc(-rH, -HH + rH, rH, 0, -Math.PI / 2, true);
    s.closePath();
  }
  return s;
}

function extrude(shape, depth, bevel, segments = 26) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelSegments: 4,
    curveSegments: segments,
    steps: 1,
  });
  return toCreasedNormals(g, 0.62);
}

// Display panes are rounded so their corners never spill over the bezel's
// rounded outline. UVs are rebuilt from the geometry so the screen textures keep
// the same mapping they had as a plain PlaneGeometry.
function remapUV(geo, fn) {
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ...fn(pos.getX(i), pos.getY(i)));
  uv.needsUpdate = true;
  return geo;
}

// one half of the inner display: square at the hinge, rounded at the free edge
function halfDisplayGeometry(w, h, r, sign) {
  const hh = h / 2;
  const s = new THREE.Shape();
  if (sign > 0) {
    s.moveTo(0, -hh);
    s.lineTo(w - r, -hh);
    s.absarc(w - r, -hh + r, r, -Math.PI / 2, 0, false);
    s.lineTo(w, hh - r);
    s.absarc(w - r, hh - r, r, 0, Math.PI / 2, false);
    s.lineTo(0, hh);
  } else {
    s.moveTo(0, -hh);
    s.lineTo(-w + r, -hh);
    s.absarc(-w + r, -hh + r, r, -Math.PI / 2, -Math.PI, true);
    s.lineTo(-w, hh - r);
    s.absarc(-w + r, hh - r, r, Math.PI, Math.PI / 2, true);
    s.lineTo(0, hh);
  }
  s.closePath();
  const geo = new THREE.ShapeGeometry(s, 32);
  // u runs from the hinge (0) to the free edge (1); the left half mirrors in x
  return remapUV(geo, (x, y) => [sign > 0 ? Math.abs(x) / w : 1 - Math.abs(x) / w, (y + hh) / h]);
}

function roundedDisplayGeometry(w, h, r) {
  const geo = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 32);
  return remapUV(geo, (x, y) => [(x + w / 2) / w, (y + h / 2) / h]);
}

function shapePlane(shape, material) {
  const g = new THREE.ShapeGeometry(shape, 32);
  return new THREE.Mesh(g, material);
}

/* ------------------------------------------------------------------ */
/* model                                                               */
/* ------------------------------------------------------------------ */

export function createIPhoneDuo(renderer) {
  const root = new THREE.Group();
  root.name = 'iPhoneDuo';

  const materials = makeMaterials();
  const textures = {
    inner: createInnerTexture(renderer),
    outer: createOuterTexture(renderer),
    logo: createLogoTexture(renderer),
  };
  textures.inner.anisotropy = Math.min(MAX_ANISO, renderer.capabilities.getMaxAnisotropy());
  textures.outer.anisotropy = textures.inner.anisotropy;

  const screenMats = makeScreenMaterials(textures);

  // hinge frame at the fold axis; B is fixed, A swings around it
  const hinge = new THREE.Group();
  hinge.position.z = AXIS_Z;
  hinge.name = 'HingeAxis';
  root.add(hinge);

  const contentB = new THREE.Group();
  contentB.position.z = -AXIS_Z;
  contentB.name = 'PanelB';
  hinge.add(contentB);

  const pivotA = new THREE.Group();
  pivotA.name = 'PanelAPivot';
  hinge.add(pivotA);

  const contentA = new THREE.Group();
  contentA.position.z = -AXIS_Z;
  contentA.name = 'PanelA';
  pivotA.add(contentA);

  buildPanel(contentB, +1, materials, textures, screenMats);
  buildPanel(contentA, -1, materials, textures, screenMats);

  const hingePivot = new THREE.Group();
  hingePivot.name = 'HingeCoverPivot';
  hinge.add(hingePivot);
  const hingeCover = new THREE.Mesh(new THREE.BufferGeometry(), materials.frame);
  hingeCover.name = 'HingeCover';
  hingeCover.userData.part = 'body';
  hingePivot.add(hingeCover);

  // state
  let fold = 180; // degrees: 0 closed, 180 flat
  let finish = 'starwhite';
  let dirty = true;

  // The spine is a rounded rail on the hinge-side edge of panel A.  Its
  // cross-section is a rounded rectangle: X = thickness (fixed), Z = depth
  // (11.3 mm closed, 3.4 mm open).  It is not rotated with the panels; it
  // stays on the hinge axis, which keeps it clear of both displays.
  const COVER_CX = 0;
  const COVER_HW = 0.9;
  const COVER_D_CLOSED = 11.26;
  const COVER_D_OPEN = 2.4;
  const COVER_BEVEL = 0.2;

  function buildCover() {
    const shape = roundedRectShape(
      2 * (COVER_HW - COVER_BEVEL),
      COVER_D_CLOSED - 2 * COVER_BEVEL,
      0.5,
    );
    const depth = 96.0;
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: COVER_BEVEL + 0.02,
      bevelSize: COVER_BEVEL,
      bevelSegments: 3,
      curveSegments: 10,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -depth / 2, 0);
    toCreasedNormals(g, 0.6);
    hingeCover.geometry.dispose();
    hingeCover.geometry = g;
    hingeCover.position.set(COVER_CX, 0, 0);
  }
  buildCover();

  function apply() {
    const t = THREE.MathUtils.clamp(fold, 0, 180) / 180;
    const delta = Math.PI * (1 - t);
    pivotA.rotation.y = delta;
    hingePivot.rotation.y = 0;

    const depth = COVER_D_CLOSED + (COVER_D_OPEN - COVER_D_CLOSED) * t;
    hingeCover.scale.z = depth / COVER_D_CLOSED;
    hingeCover.position.z = -AXIS_Z * t;
    // at the closed pose the spine must not break the silhouette: shift it
    // inward by half its width so its outer face is flush with the frame.
    hingeCover.position.x = COVER_CX + COVER_HW * (1 - t);

    // recenter the silhouette as it folds
    root.updateWorldMatrix(true, true);
    root.position.set(0, 0, 0);
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root, true);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    root.position.set(-cx, 0, Number.isFinite(cz) ? -cz : 0);
    dirty = false;
  }

  function setFold(deg) {
    fold = THREE.MathUtils.clamp(deg, 0, 180);
    apply();
  }

  function setFinish(key) {
    const c = SPEC.colors[key] || SPEC.colors.starwhite;
    finish = key;
    materials.frame.color.setHex(c.frame);
    materials.frameDark.color.setHex(c.frame).multiplyScalar(0.82);
    materials.backGlass.color.setHex(c.glass);
    materials.plateau.color.setHex(c.plateau);
    materials.plateau.clearcoat = 0.55;
  }

  function getBodyBox() {
    // body slabs only (excludes camera bump / buttons) for dimension reports
    const box = new THREE.Box3();
    root.updateWorldMatrix(true, true);
    const saved = root.position.clone();
    root.position.set(0, 0, 0);
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (o.isMesh && o.userData.part === 'body') box.expandByObject(o);
    });
    root.position.copy(saved);
    root.updateWorldMatrix(true, true);
    return box;
  }

  function getOverallBox() {
    // silhouette of the body + hinge, ignoring protruding buttons and the camera bump
    const box = new THREE.Box3();
    root.updateWorldMatrix(true, true);
    const saved = root.position.clone();
    root.position.set(0, 0, 0);
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const p = o.userData.part;
      if (p === 'button' || p === 'bump') return;
      box.expandByObject(o);
    });
    root.position.copy(saved);
    root.updateWorldMatrix(true, true);
    return box;
  }

  function getDims() {
    const b = getBodyBox();
    const o = getOverallBox();
    return {
      w: +(b.max.x - b.min.x).toFixed(2),
      h: +(b.max.y - b.min.y).toFixed(2),
      d: +(b.max.z - b.min.z).toFixed(2),
      wAll: +(o.max.x - o.min.x).toFixed(2),
      hAll: +(o.max.y - o.min.y).toFixed(2),
      dAll: +(o.max.z - o.min.z).toFixed(2),
      fold: +fold.toFixed(1),
    };
  }

  apply();
  setFinish('starwhite');

  return {
    root,
    materials,
    textures,
    setFold,
    setFinish,
    getDims,
    getOverallBox,
    get fold() {
      return fold;
    },
    get finish() {
      return finish;
    },
    update() {
      if (dirty) apply();
    },
  };
}

/* ------------------------------------------------------------------ */
/* panel                                                               */
/* ------------------------------------------------------------------ */

function buildPanel(group, sign, M, TEX, S) {
  const W = HALF_W;

  // ---- body (frame). The glass back is a separate 0.21 mm sheet, so the frame
  // is thinned by that amount to keep the overall 5.2 mm spec.
  const bodyD = T - 1.1 - 0.21;
  const bodyGeo = extrude(panelShape(sign), bodyD, 0.55);
  bodyGeo.translate(0, 0, -bodyD / 2 + 0.105);
  const body = new THREE.Mesh(bodyGeo, M.frame);
  body.name = sign > 0 ? 'BodyB' : 'BodyA';
  body.userData.part = 'body';
  group.add(body);

  // ---- front: black bezel + display half + glass sheen
  const front = frontAreaShape(sign);
  const bezel = shapePlane(front, M.bezel);
  bezel.position.z = T / 2 + 0.14;
  bezel.name = 'FrontBezel';
  group.add(bezel);

  const screenHalf = halfDisplayGeometry(SPEC.inner.w / 2, SPEC.inner.h, 6.0, sign);
  const tex = TEX.inner.clone();
  tex.needsUpdate = true;
  tex.repeat.set(0.5, 1);
  tex.offset.set(sign > 0 ? 0.5 : 0, 0);
  const mat = S.inner.clone();
  mat.map = tex;
  mat.needsUpdate = true;
  const screen = new THREE.Mesh(screenHalf, mat);
  screen.position.set(0, 0, T / 2 + 0.21);
  screen.name = sign > 0 ? 'InnerDisplayR' : 'InnerDisplayL';
  screen.userData.part = 'display';
  group.add(screen);

  const sheen = shapePlane(front, M.screenSheen);
  sheen.position.z = T / 2 + 0.28;
  group.add(sheen);

  // ---- back glass
  const backShape = frontAreaShape(sign);
  const backGeo = extrude(backShape, 0.1, 0.055, 30);
  backGeo.translate(0, 0, -0.1 - 0.055);
  const back = new THREE.Mesh(backGeo, M.backGlass);
  back.position.z = -T / 2 + 0.21; // inner face flush with the thinned frame, outer at -T/2
  back.name = 'BackGlass';
  back.userData.part = 'body';
  group.add(back);

  if (sign < 0) {
    // cover display sits just proud of the back glass, flush with the closed silhouette
    const glassFace = -T / 2;
    const outerShape = roundedRectShape(80.2, 115.6, 9.5);
    const black = new THREE.Mesh(new THREE.ShapeGeometry(outerShape, 32), M.bezel);
    black.position.set(-W / 2, 0, glassFace - 0.14);
    black.rotation.y = Math.PI;
    black.name = 'OuterBezel';
    group.add(black);

    const g = roundedDisplayGeometry(SPEC.outer.w, SPEC.outer.h, 7.0);
    const mat2 = S.outer.clone();
    const m = new THREE.Mesh(g, mat2);
    m.position.set(-W / 2, 0, glassFace - 0.21);
    m.rotation.y = Math.PI;
    m.name = 'OuterDisplay';
    m.userData.part = 'display';
    group.add(m);

    const sheen2 = new THREE.Mesh(new THREE.ShapeGeometry(outerShape, 32), M.screenSheen);
    sheen2.position.set(-W / 2, 0, glassFace - 0.28);
    sheen2.rotation.y = Math.PI;
    group.add(sheen2);
  } else {
    // camera plateau + apple logo on the outside of the right half
    addCameraModule(group, M, TEX, sign);
    addAppleLogo(group, M, TEX);
  }

  addButtons(group, sign, M);
  addEdgeDetails(group, sign, M);
}

/* ------------------------------------------------------------------ */
/* camera                                                              */
/* ------------------------------------------------------------------ */

function addCameraModule(group, M, TEX) {
  const C = SPEC.camera;
  const cx = 61.0;
  const cy = 42.75;
  const zBack = -T / 2;

  const pb = 0.405;
  const shape = roundedRectShape(C.plateauW - 2 * pb, C.plateauH - 2 * pb, C.plateauR - pb);
  const g = extrude(shape, 0.7, 0.45, 48);
  g.translate(0, 0, -(0.7 + 0.45));
  const plateau = new THREE.Mesh(g, M.plateau);
  plateau.position.set(cx, cy, zBack);
  plateau.name = 'CameraPlateau';
  plateau.userData.part = 'bump';
  group.add(plateau);

  const faceZ = zBack - C.bump;

  // two lenses sit toward the free edge; flash + mic toward the hinge (as in Apple's renders)
  const lensPositions = [
    [71.4, cy],
    [60.0, cy],
  ];
  lensPositions.forEach(([x, y], i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.55, 20, 72), M.frame);
    ring.position.set(x, y, faceZ - 0.12);
    ring.name = `LensRing${i}`;
    ring.userData.part = 'bump';
    group.add(ring);

    const bevel = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.15, 12, 72), M.lensBarrel);
    bevel.position.set(x, y, faceZ - 0.22);
    bevel.userData.part = 'bump';
    group.add(bevel);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(4.55, 4.55, 0.75, 72), M.lensBarrel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, y, faceZ - 0.42);
    barrel.userData.part = 'bump';
    group.add(barrel);

    const glass = new THREE.Mesh(new THREE.CircleGeometry(4.2, 72), M.lensGlass);
    glass.position.set(x, y, faceZ - 0.8);
    glass.rotation.y = Math.PI;
    glass.name = `LensGlass${i}`;
    glass.userData.part = 'bump';
    group.add(glass);

    const coat = new THREE.Mesh(new THREE.RingGeometry(1.5, 3.1, 72), M.lensCoat);
    coat.position.set(x, y, faceZ - 0.808);
    coat.rotation.y = Math.PI;
    coat.userData.part = 'bump';
    group.add(coat);

    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), M.lensInner);
    inner.position.set(x, y, faceZ - 0.816);
    inner.rotation.y = Math.PI;
    inner.userData.part = 'bump';
    group.add(inner);

    const spark = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), M.spark);
    spark.position.set(x - 1.1, y + 1.2, faceZ - 0.824);
    spark.rotation.y = Math.PI;
    spark.userData.part = 'bump';
    group.add(spark);
  });

  // flash + mic slot
  const flashRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.22, 10, 44), M.frame);
  flashRing.position.set(49.0, 39.4, faceZ - 0.08);
  flashRing.userData.part = 'bump';
  group.add(flashRing);
  const flash = new THREE.Mesh(new THREE.CircleGeometry(1.6, 44), M.flash);
  flash.position.set(49.0, 39.4, faceZ - 0.28);
  flash.rotation.y = Math.PI;
  flash.userData.part = 'bump';
  group.add(flash);

  const micShape = roundedRectShape(2.8, 1.3, 0.6);
  const mic = new THREE.Mesh(new THREE.ShapeGeometry(micShape, 16), M.mic);
  mic.position.set(49.0, 46.6, faceZ - 0.02);
  mic.rotation.y = Math.PI;
  mic.userData.part = 'bump';
  group.add(mic);
}

function addAppleLogo(group, M, TEX) {
  const mat = new THREE.MeshBasicMaterial({
    map: TEX.logo,
    transparent: true,
    opacity: 0.9,
    color: 0xf4f4f1,
    depthWrite: false,
    toneMapped: false,
  });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 15.5), mat);
  logo.position.set(41.15, -4.0, -T / 2 - 0.012);
  logo.rotation.y = Math.PI;
  logo.name = 'AppleLogo';
  group.add(logo);
}

/* ------------------------------------------------------------------ */
/* buttons & edge details                                              */
/* ------------------------------------------------------------------ */

function capsuleButton(len, r, flatten, mat) {
  const g = new THREE.CapsuleGeometry(r, Math.max(1, len - r * 2), 6, 20);
  g.scale(flatten, 1, 1);
  return new THREE.Mesh(g, mat);
}

function addButtons(group, sign, M) {
  const x = sign * (HALF_W - 0.35);
  const conf = sign > 0
    ? [
        { y: 24, len: 16, kind: 'power' },
        { y: -12, len: 11, kind: 'camera' },
      ]
    : [
        { y: 38, len: 8.5, kind: 'action' },
        { y: 21, len: 12, kind: 'volume' },
        { y: 6, len: 12, kind: 'volume' },
      ];

  conf.forEach((b, i) => {
    if (b.kind === 'camera') {
      // flat sapphire-covered Camera Control
      const shape = roundedRectShape(11.2, 2.6, 1.25);
      const g = extrude(shape, 0.35, 0.14, 16);
      // shape x -> world Y, shape y -> world Z, extrusion z -> world X
      g.applyMatrix4(new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 0),
      ));
      const mesh = new THREE.Mesh(g, M.cameraButton);
      mesh.position.set(x + sign * 0.18, b.y, 0);
      mesh.name = `CameraControl${sign}`;
      mesh.userData.part = 'button';
      group.add(mesh);
      return;
    }
    const mesh = capsuleButton(b.len, 1.45, 0.42, M.frame);
    mesh.position.set(x, b.y, 0);
    mesh.name = `${b.kind}${sign}${i}`;
    mesh.userData.part = 'button';
    group.add(mesh);
  });
}

function addEdgeDetails(group, sign, M) {
  const yEdge = sign > 0 ? -HALF_H : HALF_H;
  const z = 0;

  if (sign > 0) {
    // USB-C
    const port = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 2.7), M.port);
    port.rotation.x = Math.PI / 2;
    port.position.set(44, -HALF_H - 0.02, 0);
    port.name = 'USBC';
    group.add(port);

    // speaker + mic holes along the bottom (right half)
    [20, 27.5, 35, 62, 69.5, 77].forEach((x) => {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), M.port);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, -HALF_H - 0.02, 0);
      group.add(hole);
    });
  } else {
    // earpiece slit on the top of the cover half
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.1), M.port);
    slit.rotation.x = Math.PI / 2;
    slit.position.set(-41.15, HALF_H + 0.02, 0);
    group.add(slit);

    // bottom speaker holes
    [-72, -64.5, -57, -49.5].forEach((x) => {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), M.port);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(x, -HALF_H - 0.02, 0);
      group.add(hole);
    });
  }

  // antenna lines: thin dark bands wrapped over the outer long edge
  const ax = sign * (HALF_W + 0.001);
  [-49.5, -8, 49.5].forEach((yy) => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, T * 0.98), M.antenna);
    band.position.set(ax, yy, 0);
    group.add(band);
  });
}

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

function makeMaterials() {
  const frame = new THREE.MeshPhysicalMaterial({
    color: 0xd9dad6,
    metalness: 1,
    roughness: 0.44,
    envMapIntensity: 0.8,
    clearcoat: 0.05,
    clearcoatRoughness: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const frameDark = frame.clone();
  frameDark.color.setHex(0xb9bab6);

  const backGlass = new THREE.MeshPhysicalMaterial({
    color: 0xf1f2ef,
    metalness: 0.0,
    roughness: 0.40,
    clearcoat: 0.5,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.7,
  });

  const plateau = backGlass.clone();
  plateau.roughness = 0.36;
  plateau.clearcoat = 0.7;
  plateau.envMapIntensity = 0.9;

  const bezel = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.3, metalness: 0.2 });
  const screenSheen = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.032,
    clearcoat: 0.7,
    clearcoatRoughness: 0.05,
    envMapIntensity: 0.55,
    depthWrite: false,
  });
  const lensBarrel = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.35, metalness: 0.6 });
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x05060a,
    metalness: 0.4,
    roughness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.4,
  });
  const lensCoat = new THREE.MeshBasicMaterial({
    color: 0x3a2b6b,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const lensInner = new THREE.MeshPhysicalMaterial({
    color: 0x010104,
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 1,
    envMapIntensity: 1.2,
  });
  const spark = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.7 });
  const flash = new THREE.MeshStandardMaterial({
    color: 0xfff3d2,
    roughness: 0.25,
    emissive: 0xffe7b0,
    emissiveIntensity: 0.28,
  });
  const mic = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6 });
  const port = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.55 });
  const antenna = new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.35, metalness: 0.8 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.5, metalness: 0.6 });
  const cameraButton = new THREE.MeshPhysicalMaterial({
    color: 0x2f2f33,
    metalness: 0.2,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });

  return {
    frame, frameDark, backGlass, plateau, bezel, screenSheen, lensBarrel, lensGlass,
    lensCoat, lensInner, spark, flash, mic, port, antenna, seam, cameraButton,
  };
}

function makeScreenMaterials(TEX) {
  const inner = new THREE.MeshBasicMaterial({
    map: TEX.inner,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  const outer = new THREE.MeshBasicMaterial({
    map: TEX.outer,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  return { inner, outer };
}
