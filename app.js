import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createImageryTexture } from "./esri-imagery.js";
import { ESRI_PUBLIC_API_KEY } from "./config.js";
import { setupBuildingEditor } from "./building-editor.js";

const canvas = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const modeLabel = document.querySelector("#mode");
const positionLabel = document.querySelector("#position");
const overviewButton = document.querySelector("#overview");
const groundButton = document.querySelector("#ground");
const boundaryButton = document.querySelector("#toggle-boundary");
const treesButton = document.querySelector("#toggle-trees");
const imageryButton = document.querySelector("#toggle-imagery");
const imageryDialog = document.querySelector("#imagery-dialog");
const imageryStatus = document.querySelector("#imagery-status");
const imageryKey = document.querySelector("#imagery-key");
const imageryCredit = document.querySelector("#imagery-credit");
const help = document.querySelector("#help");
const crosshair = document.querySelector("#crosshair");
const mobileControls = document.querySelector("#mobile-controls");

const WIDTH = 1000;
const DEPTH = 800;
const COLS = 251;
const ROWS = 201;
const BASE_HEIGHT = 110;
const EASTING_MIN = 612300;
const NORTHING_MAX = 6917500;
const isCoarsePointer = matchMedia("(pointer: coarse)").matches;

const boundaryXZ = [
  [-190.7, -293.1], [170.2, -271.3], [40.1, 1.3], [289.0, 153.5],
  [289.0, 186.5], [186.0, 243.1], [-0.1, 161.6], [-115.3, 113.2],
  [-161.8, 249.9], [-340.6, 178.4], [-282.8, -125.0], [-177.1, -206.1],
  [-177.1, -251.4]
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x93a8aa);
scene.fog = new THREE.FogExp2(0x93a8aa, 0.00115);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.2, 2600);
camera.rotation.order = "YXZ";

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} catch (error) {
  console.error(error);
  loading.querySelector("strong").textContent = "3D-grafik kunde inte startas";
  loading.querySelector("span").textContent = "Aktivera WebGL eller prova en uppdaterad Chrome eller Edge.";
  loading.querySelector(".spinner").remove();
}

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.07;
orbit.minDistance = 25;
orbit.maxDistance = 1450;
orbit.maxPolarAngle = Math.PI * 0.485;

scene.add(new THREE.HemisphereLight(0xd8e7e5, 0x344132, 1.8));
const sun = new THREE.DirectionalLight(0xfff3d7, 2.5);
sun.position.set(-320, 650, -260);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -600;
sun.shadow.camera.right = 600;
sun.shadow.camera.top = 500;
sun.shadow.camera.bottom = -500;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 1300;
scene.add(sun);

let heights;
let terrain;
let originalTerrainTexture;
let originalUV;
let imageryTexture;
let imageryUV;
let boundary;
let forest;
let mode = "overview";
let yaw = Math.PI;
let pitch = -0.05;
const keys = new Set();
const clock = new THREE.Clock();

function heightAt(x, z) {
  if (!heights) return 0;
  const gx = THREE.MathUtils.clamp((x + WIDTH / 2) / WIDTH * (COLS - 1), 0, COLS - 1);
  const gy = THREE.MathUtils.clamp((z + DEPTH / 2) / DEPTH * (ROWS - 1), 0, ROWS - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, COLS - 1);
  const y1 = Math.min(y0 + 1, ROWS - 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const a = heights[y0 * COLS + x0];
  const b = heights[y0 * COLS + x1];
  const c = heights[y1 * COLS + x0];
  const d = heights[y1 * COLS + x1];
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty) - BASE_HEIGHT;
}

function createTerrain(texture) {
  const positions = new Float32Array(COLS * ROWS * 3);
  const uvs = new Float32Array(COLS * ROWS * 2);
  let p = 0;
  let u = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      positions[p++] = x / (COLS - 1) * WIDTH - WIDTH / 2;
      positions[p++] = heights[y * COLS + x] - BASE_HEIGHT;
      positions[p++] = y / (ROWS - 1) * DEPTH - DEPTH / 2;
      uvs[u++] = x / (COLS - 1);
      uvs[u++] = 1 - y / (ROWS - 1);
    }
  }

  const indices = new Uint32Array((COLS - 1) * (ROWS - 1) * 6);
  let i = 0;
  for (let y = 0; y < ROWS - 1; y += 1) {
    for (let x = 0; x < COLS - 1; x += 1) {
      const a = y * COLS + x;
      const b = a + 1;
      const c = a + COLS;
      const d = c + 1;
      indices[i++] = a; indices[i++] = c; indices[i++] = b;
      indices[i++] = b; indices[i++] = c; indices[i++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createBoundary() {
  const points = [];
  for (let i = 0; i < boundaryXZ.length; i += 1) {
    const from = boundaryXZ[i];
    const to = boundaryXZ[(i + 1) % boundaryXZ.length];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const steps = Math.max(1, Math.ceil(length / 7));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const x = THREE.MathUtils.lerp(from[0], to[0], t);
      const z = THREE.MathUtils.lerp(from[1], to[1], t);
      points.push(new THREE.Vector3(x, heightAt(x, z) + 1.2, z));
    }
  }
  points.push(points[0].clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xff3c31, transparent: true, opacity: .95 });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 4;
  scene.add(line);
  return line;
}

function pointInPolygon(x, z) {
  let inside = false;
  for (let i = 0, j = boundaryXZ.length - 1; i < boundaryXZ.length; j = i++) {
    const [xi, zi] = boundaryXZ[i];
    const [xj, zj] = boundaryXZ[j];
    const crosses = (zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createForest(treeScene) {
  const random = mulberry32(20261121);
  const placements = [];
  const addTrees = (count, wantInside) => {
    let attempts = 0;
    while (placements.length < count && attempts < count * 80) {
      attempts += 1;
      const x = (random() - .5) * 970;
      const z = (random() - .5) * 770;
      if (pointInPolygon(x, z) !== wantInside) continue;
      placements.push({
        x,
        z,
        scale: wantInside ? .75 + random() * .35 : .78 + random() * .55,
        rotation: random() * Math.PI * 2
      });
    }
  };
  addTrees(720, false);
  const outsideCount = placements.length;
  let insideAdded = 0;
  while (insideAdded < 24) {
    const x = (random() - .5) * 700;
    const z = (random() - .5) * 600;
    if (!pointInPolygon(x, z)) continue;
    placements.push({ x, z, scale: .72 + random() * .36, rotation: random() * Math.PI * 2 });
    insideAdded += 1;
  }

  treeScene.updateMatrixWorld(true);
  const group = new THREE.Group();
  const meshes = [];
  treeScene.traverse((child) => {
    if (!child.isMesh) return;
    const material = child.material.clone();
    material.alphaTest = Math.max(material.alphaTest || 0, .35);
    material.transparent = false;
    material.side = THREE.DoubleSide;
    const instances = new THREE.InstancedMesh(child.geometry, material, placements.length);
    instances.castShadow = true;
    instances.receiveShadow = true;
    instances.name = `Instanced ${child.name}`;
    meshes.push({ instances, localMatrix: child.matrixWorld.clone() });
    group.add(instances);
  });

  const baseMatrix = new THREE.Matrix4();
  const finalMatrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  placements.forEach((tree, index) => {
    position.set(tree.x, heightAt(tree.x, tree.z), tree.z);
    quaternion.setFromAxisAngle(yAxis, tree.rotation);
    scale.setScalar(tree.scale);
    baseMatrix.compose(position, quaternion, scale);
    meshes.forEach(({ instances, localMatrix }) => {
      finalMatrix.multiplyMatrices(baseMatrix, localMatrix);
      instances.setMatrixAt(index, finalMatrix);
    });
  });
  meshes.forEach(({ instances }) => {
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
  });
  group.userData = { outsideCount, insideCount: insideAdded };
  scene.add(group);
  return group;
}

function setOverview() {
  mode = "overview";
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  orbit.enabled = true;
  camera.fov = 50;
  camera.updateProjectionMatrix();
  camera.position.set(470, 430, 600);
  orbit.target.set(-25, 42, -5);
  orbit.update();
  overviewButton.classList.add("active");
  groundButton.classList.remove("active");
  crosshair.hidden = true;
  mobileControls.hidden = true;
  modeLabel.textContent = "Översikt";
  positionLabel.textContent = "1 m höjddata · verklig skala";
}

function setGround() {
  mode = "ground";
  orbit.enabled = false;
  camera.fov = 68;
  camera.updateProjectionMatrix();
  camera.position.set(-25, heightAt(-25, 95) + 1.75, 95);
  yaw = Math.PI;
  pitch = -0.04;
  camera.rotation.set(pitch, yaw, 0);
  overviewButton.classList.remove("active");
  groundButton.classList.add("active");
  crosshair.hidden = false;
  mobileControls.hidden = !isCoarsePointer;
  modeLabel.textContent = "Marknivå";
  if (!isCoarsePointer) canvas.requestPointerLock();
}

function updateGround(delta) {
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 18 : 7;
  const forwardAmount = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
  const rightAmount = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  if (forwardAmount || rightAmount) {
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    camera.position.addScaledVector(forward, forwardAmount * speed * delta);
    camera.position.addScaledVector(right, rightAmount * speed * delta);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WIDTH / 2 + 2, WIDTH / 2 - 2);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -DEPTH / 2 + 2, DEPTH / 2 - 2);
  }
  camera.position.y = heightAt(camera.position.x, camera.position.z) + 1.75;
  camera.rotation.set(pitch, yaw, 0);
  const easting = EASTING_MIN + camera.position.x + WIDTH / 2;
  const northing = NORTHING_MAX - (camera.position.z + DEPTH / 2);
  const elevation = camera.position.y - 1.75 + BASE_HEIGHT;
  positionLabel.textContent = `E ${easting.toFixed(0)} · N ${northing.toFixed(0)} · ${elevation.toFixed(1)} m`;
}

// Optional satellite imagery: do not expose a key in the repository or save it locally.
// Switching off restores the original UVs and shaded terrain texture without a reload.
function setImageryVisible(visible) {
  if(!terrain)return;
  const uv=terrain.geometry.getAttribute("uv");
  uv.array.set(visible?imageryUV:originalUV);
  uv.needsUpdate=true;
  terrain.material.map=visible?imageryTexture:originalTerrainTexture;
  terrain.material.needsUpdate=true;
  imageryCredit.hidden=!visible;
  imageryButton.setAttribute("aria-pressed",String(visible));
  imageryButton.classList.toggle("active",visible);
}
imageryButton.addEventListener("click",()=>{
  if(!terrain)return;
  if(imageryCredit.hidden){
    if(imageryTexture){setImageryVisible(true);return;}
    imageryStatus.textContent="";
    imageryDialog.showModal();
  }else setImageryVisible(false);
});
document.querySelector("#imagery-cancel").addEventListener("click",()=>imageryDialog.close());
async function loadImagery(key) {
  if(!terrain||!key)return;
  const button=document.querySelector("#imagery-load");
  button.disabled=true;
  imageryStatus.textContent="Hämtar flygbild...";
  try{
    const result=await createImageryTexture({
      token:key,
      eastingMin:EASTING_MIN,
      northingMin:NORTHING_MAX-DEPTH,
      eastingMax:EASTING_MIN+WIDTH,
      northingMax:NORTHING_MAX,
      renderer,
      onProgress:(completed,total)=>{imageryStatus.textContent=`Hämtar flygbild: ${completed}/${total} bildrutor`;}
    });
    // Match every terrain vertex with its geographic position in SWEREF 99 TM.
    const uvs=new Float32Array(COLS*ROWS*2);
    let i=0;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const east=EASTING_MIN+x/(COLS-1)*WIDTH;
      const north=NORTHING_MAX-y/(ROWS-1)*DEPTH;
      const coords=result.toUV(east,north);
      uvs[i++]=coords[0];uvs[i++]=coords[1];
    }
    imageryTexture=result.texture;
    imageryUV=uvs;
    imageryKey.value=""; // Do not save a manually entered token.
    setImageryVisible(true);
    if(imageryDialog.open)imageryDialog.close();
  }catch(error){
    console.error("Kunde inte hämta Esri World Imagery",error.message);
    imageryStatus.textContent=error.message||"Det gick inte att hämta flygbilderna.";
  }finally{button.disabled=false;}
}
document.querySelector("#imagery-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const key=imageryKey.value.trim();
  if(!key){imageryStatus.textContent="Ange din API-nyckel.";return;}
  await loadImagery(key);
});

overviewButton.addEventListener("click", setOverview);
groundButton.addEventListener("click", setGround);
boundaryButton.addEventListener("click", () => {
  boundary.visible = !boundary.visible;
  boundaryButton.setAttribute("aria-pressed", String(boundary.visible));
});
treesButton.addEventListener("click", () => {
  forest.visible = !forest.visible;
  treesButton.setAttribute("aria-pressed", String(forest.visible));
});
document.querySelector("#toggle-help").addEventListener("click", () => { help.hidden = !help.hidden; });
document.querySelector("#close-help").addEventListener("click", () => { help.hidden = true; });

addEventListener("keydown", (event) => keys.add(event.code));
addEventListener("keyup", (event) => keys.delete(event.code));
document.addEventListener("mousemove", (event) => {
  if (mode !== "ground" || document.pointerLockElement !== canvas) return;
  yaw -= event.movementX * .0022;
  pitch -= event.movementY * .002;
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI * .47, Math.PI * .47);
});
canvas.addEventListener("click", () => {
  if (mode === "ground" && !isCoarsePointer && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});

let touchPointer = null;
let lastTouchX = 0;
let lastTouchY = 0;
canvas.addEventListener("pointerdown", (event) => {
  if (mode !== "ground" || !isCoarsePointer) return;
  touchPointer = event.pointerId;
  lastTouchX = event.clientX;
  lastTouchY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (mode !== "ground" || event.pointerId !== touchPointer) return;
  yaw -= (event.clientX - lastTouchX) * .005;
  pitch -= (event.clientY - lastTouchY) * .004;
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI * .47, Math.PI * .47);
  lastTouchX = event.clientX;
  lastTouchY = event.clientY;
});
canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId === touchPointer) touchPointer = null;
});

document.querySelectorAll(".mobile-controls button").forEach((button) => {
  const key = button.dataset.key;
  const press = (event) => { event.preventDefault(); keys.add(key); };
  const release = (event) => { event.preventDefault(); keys.delete(key); };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

addEventListener("resize", () => {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
});

async function init() {
  try {
    const [heightResponse, texture, tree] = await Promise.all([
      fetch("assets/terrain-height.bin").then((response) => {
        if (!response.ok) throw new Error("Kunde inte läsa höjddata");
        return response.arrayBuffer();
      }),
      new THREE.TextureLoader().loadAsync("assets/terrain-color.jpg"),
      new GLTFLoader().loadAsync("assets/gran_blaberget_5.glb")
    ]);
    heights = new Float32Array(heightResponse);
    if (heights.length !== COLS * ROWS) throw new Error("Höjddata har fel storlek");
    terrain = createTerrain(texture);
    originalTerrainTexture = texture;
    originalUV = terrain.geometry.getAttribute("uv").array.slice();
    boundary = createBoundary();
    forest = createForest(tree.scene);
    setOverview();
    // The building editor is separate from the terrain and can be extended with more assets.
    setupBuildingEditor({ scene, camera, canvas, terrain, heightAt, setOverview, getMode:()=>mode });
    loading.classList.add("done");
    animate();
    // A configured public key starts imagery automatically for visitors.
    // The existing Flygfoto dialog remains available if loading fails.
    if(ESRI_PUBLIC_API_KEY.trim()){
      loadImagery(ESRI_PUBLIC_API_KEY.trim()).catch(error=>console.warn("Flygfoto kunde inte visas",error));
    }
  } catch (error) {
    console.error(error);
    loading.querySelector("strong").textContent = "Terrängen kunde inte laddas";
    loading.querySelector("span").textContent = error.message;
    loading.querySelector(".spinner").remove();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  if (mode === "overview") orbit.update();
  else updateGround(delta);
  renderer.render(scene, camera);
}

if (renderer) init();
