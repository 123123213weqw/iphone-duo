import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/GLTFExporter.js';
import { createIPhoneDuo, SPEC } from './model.js';

const viewport = document.getElementById('viewport');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, 1, 1, 4000);
camera.position.set(96, 46, 318);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = false;
controls.minDistance = 150;
controls.maxDistance = 760;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, 0, 0);
controls.autoRotateSpeed = 1.15;

/* ------------------------------------------------------------------ */
/* environment & light                                                 */
/* ------------------------------------------------------------------ */

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.035);
scene.environment = envRT.texture;

const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa4b1, 0.42);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.35);
key.position.set(190, 260, 280);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 80;
key.shadow.camera.far = 900;
key.shadow.camera.left = -220;
key.shadow.camera.right = 220;
key.shadow.camera.top = 220;
key.shadow.camera.bottom = -220;
key.shadow.bias = -0.0006;
key.shadow.normalBias = 0.08;
key.shadow.radius = 3.5;
scene.add(key);

const fill = new THREE.DirectionalLight(0xdfe9ff, 1.05);
fill.position.set(-260, 90, 160);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 1.5);
rim.position.set(-90, 140, -300);
scene.add(rim);

const topLight = new THREE.DirectionalLight(0xfffaf2, 0.62);
topLight.position.set(40, 320, -40);
scene.add(topLight);

/* ------------------------------------------------------------------ */
/* model                                                               */
/* ------------------------------------------------------------------ */

const api = createIPhoneDuo(renderer);
const model = api.root;
model.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = false;
    o.receiveShadow = false;
  }
});
scene.add(model);

/* ------------------------------------------------------------------ */
/* floor + contact shadow                                              */
/* ------------------------------------------------------------------ */

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(1400, 1400),
  new THREE.ShadowMaterial({ color: 0x243042, opacity: 0.15, transparent: true }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -61.6;
floor.receiveShadow = false;
floor.visible = false;
scene.add(floor);

function softShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  // elliptical falloff that reaches zero exactly at the canvas edges, so the
  // plane's border never shows as a hard edge in the render
  ctx.save();
  ctx.translate(256, 128);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 12, 0, 0, 256);
  g.addColorStop(0, 'rgba(28,38,54,0.5)');
  g.addColorStop(0.45, 'rgba(28,38,54,0.22)');
  g.addColorStop(0.72, 'rgba(28,38,54,0.07)');
  g.addColorStop(1, 'rgba(28,38,54,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-256, -256, 512, 512);
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blob = new THREE.Mesh(
  new THREE.PlaneGeometry(310, 125),
  new THREE.MeshBasicMaterial({
    map: softShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  }),
);
blob.rotation.x = -Math.PI / 2;
blob.position.set(0, -59.15, 4);
scene.add(blob);

/* ------------------------------------------------------------------ */
/* dimensions overlay                                                  */
/* ------------------------------------------------------------------ */

const dimGroup = new THREE.Group();
dimGroup.visible = false;
scene.add(dimGroup);
let dimsVisible = false;
let lastDimUpdate = 0;

const DIM_MAT = new THREE.LineBasicMaterial({ color: 0x202a36, transparent: true, opacity: 0.62 });
const DIM_TICK = new THREE.LineBasicMaterial({ color: 0x202a36, transparent: true, opacity: 0.42 });

function dimLabel(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(17,22,30,0.88)';
  ctx.beginPath();
  const r = 34;
  ctx.moveTo(18 + r, 22);
  ctx.arcTo(494, 22, 494, 106, r);
  ctx.arcTo(494, 106, 18, 106, r);
  ctx.arcTo(18, 106, 18, 22, r);
  ctx.arcTo(18, 22, 494, 22, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4f7fb';
  ctx.font = '600 46px -apple-system, "SF Pro Display", Helvetica, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(58, 14.5, 1);
  return sprite;
}

function line(points, mat = DIM_MAT) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Line(g, mat);
}

function rebuildDims() {
  while (dimGroup.children.length) {
    const ch = dimGroup.children.pop();
    ch.traverse?.((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  }
  const dims = api.getDims();
  const box = api.getOverallBox();
  const x0 = box.min.x;
  const x1 = box.max.x;
  const y0 = box.min.y;
  const y1 = box.max.y;
  const zFront = box.max.z + 3;

  // width
  const wy = box.min.y - 9;
  dimGroup.add(line([[x0, wy, zFront], [x1, wy, zFront]]));
  dimGroup.add(line([[x0, wy - 3.4, zFront], [x0, wy + 3.4, zFront]], DIM_TICK));
  dimGroup.add(line([[x1, wy - 3.4, zFront], [x1, wy + 3.4, zFront]], DIM_TICK));
  const wl = dimLabel(`${mm(dims.w)} mm`);
  wl.position.set((x0 + x1) / 2, wy - 7.5, zFront);
  dimGroup.add(wl);

  // height
  const hx = box.max.x + 10;
  dimGroup.add(line([[hx, y1, zFront], [hx, y0, zFront]]));
  dimGroup.add(line([[hx - 3.4, y1, zFront], [hx + 3.4, y1, zFront]], DIM_TICK));
  dimGroup.add(line([[hx - 3.4, y0, zFront], [hx + 3.4, y0, zFront]], DIM_TICK));
  const hl = dimLabel(`${mm(dims.h)} mm`);
  hl.position.set(hx + 22, (y0 + y1) / 2, zFront);
  dimGroup.add(hl);

  // depth leader
  const z0 = box.min.z;
  const z1 = box.max.z;
  dimGroup.add(line([[x0 - 9, y0 - 2, z0], [x0 - 9, y0 - 2, z1]]));
  const dl = dimLabel(`${mm(dims.d)} mm`);
  dl.scale.set(46, 11.5, 1);
  dl.position.set(x0 - 9, y0 - 12, (z0 + z1) / 2);
  dimGroup.add(dl);
}

function updateDims(force = false) {
  if (!dimsVisible) return;
  const now = performance.now();
  if (!force && now - lastDimUpdate < 160) return;
  lastDimUpdate = now;
  rebuildDims();
}

/* ------------------------------------------------------------------ */
/* interaction                                                         */
/* ------------------------------------------------------------------ */

const foldInput = document.getElementById('fold');
const angleOut = document.getElementById('angle');
const readout = document.getElementById('dimreadout');
// 0.1 mm, half-up (toFixed() truncates 82.35 -> 82.3 because of float error)
const mm = (v) => (Math.round((v + 1e-6) * 10) / 10).toFixed(1);

let foldAnim = null;
let camAnim = null;

function setReadout() {
  const d = api.getDims();
  const deg = api.fold;
  angleOut.innerHTML = `${deg.toFixed(0)}° <small>${deg > 175 ? 'open' : deg < 5 ? 'closed' : 'flex'}</small>`;
  readout.textContent = `${mm(d.w)} × ${mm(d.h)} × ${mm(d.d)} mm`;
}

function setFold(deg, animate = true) {
  const target = THREE.MathUtils.clamp(deg, 0, 180);
  foldInput.value = String(target);
  if (!animate) {
    foldAnim = null;
    api.setFold(target);
    setReadout();
    updateDims(true);
    return;
  }
  foldAnim = { from: api.fold, to: target, t0: performance.now(), dur: 820 };
}

// The phone must always fit the viewport: on a portrait/square window the fixed
// preset distances crop it, so every camera move is clamped to a fit distance.
const FRAME = { halfW: SPEC.open.w / 2, halfH: SPEC.h / 2, margin: 1.08 };
function minCameraDistance() {
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  return Math.max(
    (FRAME.halfW * FRAME.margin) / Math.tan(hHalf),
    (FRAME.halfH * FRAME.margin) / Math.tan(vHalf),
  );
}
// push the camera out along its current direction until the model fits
function enforceFit() {
  const dir = camera.position.clone().sub(controls.target);
  const need = minCameraDistance();
  if (dir.length() < need) {
    camera.position.copy(controls.target).add(dir.setLength(need));
  }
}

function flyTo(pos, target = [0, 0, 0], dur = 950) {
  const to = new THREE.Vector3(...pos);
  to.setLength(Math.max(to.length(), minCameraDistance()));
  camAnim = {
    fromPos: camera.position.clone(),
    toPos: to,
    fromTgt: controls.target.clone(),
    toTgt: new THREE.Vector3(...target),
    t0: performance.now(),
    dur,
  };
}

function presetView(name) {
  if (name === 'front') flyTo([0, 8, api.fold < 5 ? 265 : 330]);
  else if (name === 'back') flyTo([0, 14, api.fold < 5 ? -265 : -330]);
  else flyTo([96, 46, 318]);
}

document.querySelectorAll('[data-pose]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const deg = Number(btn.dataset.pose);
    setFold(deg);
    if (deg < 5) flyTo([58, 26, 255]);
    else flyTo([96, 46, 318]);
    document.querySelectorAll('[data-pose]').forEach((b) => b.classList.toggle('on', b === btn));
  });
});

foldInput.addEventListener('input', () => {
  const v = Number(foldInput.value);
  foldAnim = null;
  api.setFold(v);
  // dragging the slider means the pose is now custom: drop the preset highlight
  document.querySelectorAll('[data-pose]').forEach((b) => b.classList.remove('on'));
  setReadout();
  updateDims();
});

document.getElementById('front').addEventListener('click', () => presetView('front'));
document.getElementById('back').addEventListener('click', () => presetView('back'));
document.getElementById('hero').addEventListener('click', () => presetView('hero'));

let finish = 'starwhite';
document.getElementById('finish').addEventListener('click', (e) => {
  finish = finish === 'starwhite' ? 'silver' : 'starwhite';
  api.setFinish(finish);
  e.currentTarget.textContent = SPEC.colors[finish].name;
  e.currentTarget.classList.toggle('on', finish === 'silver');
});

document.getElementById('dims').addEventListener('click', (e) => {
  dimsVisible = !dimsVisible;
  dimGroup.visible = dimsVisible;
  e.currentTarget.classList.toggle('on', dimsVisible);
  if (dimsVisible) updateDims(true);
});

document.getElementById('spin').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.classList.toggle('on', controls.autoRotate);
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function exportGLB(download = false) {
  const exporter = new GLTFExporter();
  const buffer = await new Promise((resolve, reject) => {
    exporter.parse(model, resolve, reject, {
      binary: true,
      onlyVisible: true,
      maxTextureSize: 2048,
    });
  });
  if (download) {
    const blob = new Blob([buffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iPhone-Duo-${api.fold.toFixed(0)}deg.glb`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('GLB 已导出（当前折叠角度）');
  }
  return buffer;
}

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

document.getElementById('glb').addEventListener('click', () => {
  exportGLB(true).catch((err) => {
    console.error(err);
    showToast('导出失败：' + err.message);
  });
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === '1') setFold(180);
  else if (k === '2') setFold(0);
  else if (k === '3') presetView('back');
  else if (k === 'd') document.getElementById('dims').click();
  else if (k === 'r') document.getElementById('spin').click();
});

/* ------------------------------------------------------------------ */
/* loop                                                                */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  enforceFit();
}
window.addEventListener('resize', resize);
resize();

let firstFrame = true;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (foldAnim) {
    const t = Math.min(1, (performance.now() - foldAnim.t0) / foldAnim.dur);
    const v = foldAnim.from + (foldAnim.to - foldAnim.from) * easeInOut(t);
    api.setFold(v);
    foldInput.value = String(v);
    setReadout();
    if (t >= 1) {
      foldAnim = null;
      api.setFold(Number(foldInput.value));
      setReadout();
      updateDims(true);
    }
  }

  if (camAnim) {
    const t = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
    const e = easeInOut(t);
    camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, e);
    controls.target.lerpVectors(camAnim.fromTgt, camAnim.toTgt, e);
    if (t >= 1) camAnim = null;
  }

  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    loading.classList.add('done');
    window.__duoReady = true;
  }
}
tick();

/* ------------------------------------------------------------------ */
/* automation api                                                      */
/* ------------------------------------------------------------------ */

window.__duo = {
  setFold: (d) => {
    setFold(d, false);
  },
  animateFold: (d) => setFold(d, true),
  setFinish: (f) => {
    finish = f;
    api.setFinish(f);
    const btn = document.getElementById('finish');
    btn.textContent = SPEC.colors[f]?.name || 'Star White';
    btn.classList.toggle('on', f === 'silver');
  },
  setView: (name) => presetView(name),
  flyTo,
  getDims: () => api.getDims(),
  setDims: (v) => {
    dimsVisible = v;
    dimGroup.visible = v;
    document.getElementById('dims').classList.toggle('on', v);
    if (v) updateDims(true);
  },
  setSpin: (v) => {
    controls.autoRotate = v;
    document.getElementById('spin').classList.toggle('on', v);
  },
  exportBase64: async () => bufferToBase64(await exportGLB(false)),
  scene: () => scene,
  camera: () => camera,
  controls: () => controls,
  api,
  ready: true,
};
