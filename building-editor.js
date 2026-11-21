import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const STORAGE_KEY = "blaberget-buildings-v1";
const ASSET = "assets/faltboden_forsta_utkast.glb";
const MODEL_ID = "faltbod";
const TARGETS = {
  c50: { label:"C 50", width:0.50, height:0.45, color:0x17191a },
  b45: { label:"B 45", width:0.35, height:0.45, color:0x17191a },
  c30: { label:"C 30", width:0.30, height:0.27, color:0xe87827 }
};
const TYPES = [MODEL_ID, ...Object.keys(TARGETS)];

function createTarget(type) {
  const {label,width,height,color} = TARGETS[type];
  const group = new THREE.Group();
  group.name = `Fältmål ${label}`;
  const wood = new THREE.MeshStandardMaterial({color:0x9b8364,roughness:1});
  const dark = new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:1});
  // The figures are original simplified geometric silhouettes, not images from the handbook.
  // The shape is scaled to the actual dimensions from the supplied target table.
  const shape = new THREE.Shape();
  shape.absellipse(0,0,width/2,height/2,0,Math.PI*2,false,0);
  const figure = new THREE.Mesh(new THREE.ShapeGeometry(shape,40),dark);
  figure.position.set(0,1.37,0.045);
  group.add(figure);
  const beamWidth = Math.max(width+0.16,0.56);
  function woodBox(w,h,d,x,y,z){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;
    group.add(mesh);
  }
  woodBox(0.045,1.55,0.045,-beamWidth/2,0.775,-0.07);
  woodBox(0.045,1.55,0.045,beamWidth/2,0.775,-0.07);
  woodBox(beamWidth+0.06,0.045,0.045,0,1.53,-0.07);
  woodBox(beamWidth+0.06,0.045,0.045,0,0.54,-0.07);
  // Broad, invisible picking surface so small targets remain selectable from the overview.
  const picker=new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(width+0.3,0.9),1.9,0.14),
    new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})
  );
  picker.position.y=1.0;
  group.add(picker);
  return group;
}

export async function setupBuildingEditor({ scene, camera, canvas, terrain, heightAt, setOverview, getMode }) {
  const toggle = document.querySelector("#toggle-build");
  const panel = document.querySelector("#build-panel");
  const status = document.querySelector("#build-status");
  const addButton = document.querySelector("#build-add");
  const typeSelect = document.querySelector("#build-type");
  const moveButton = document.querySelector("#build-move");
  const leftButton = document.querySelector("#build-left");
  const rightButton = document.querySelector("#build-right");
  const removeButton = document.querySelector("#build-delete");
  const downloadButton = document.querySelector("#build-export");
  const importInput = document.querySelector("#build-import");
  const closeButton = document.querySelector("#build-close");
  const countLabel = document.querySelector("#build-count");
  const loader = new GLTFLoader();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const buildings = []; // Holds fältbodar and target stands.
  let selected = null;
  let placement = null; // "add" or "move"
  let enabled = false;
  let model = null;

  const setStatus = (message) => { status.textContent = message; };
  const bounded = (v, range) => THREE.MathUtils.clamp(v, -range / 2 + 4, range / 2 - 4);
  const normalize = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(row => row && TYPES.includes(row.type)
      && Number.isFinite(row.x) && Number.isFinite(row.z) && Number.isFinite(row.rotation)
      && Math.abs(row.x) <= 500 && Math.abs(row.z) <= 400).slice(0, 200)
      .map(row => ({ type: row.type, x: row.x, z: row.z, rotation: row.rotation }));
  };
  const entries = () => buildings.map(b => ({type: b.userData.assetType, x: b.position.x, z: b.position.z, rotation: b.rotation.y}));
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries())); }
    catch { setStatus("Kunde inte spara lokalt. Använd Exportera JSON."); }
  }
  function updateUI() {
    countLabel.textContent = `${buildings.length} objekt (${buildings.filter(b=>b.userData.assetType===MODEL_ID).length} fältbodar, ${buildings.filter(b=>b.userData.assetType!==MODEL_ID).length} mål)`;
    for (const button of [moveButton,leftButton,rightButton,removeButton]) button.disabled = !selected;
    addButton.classList.toggle("active", placement==="add");
    moveButton.classList.toggle("active", placement==="move");
    canvas.style.cursor = enabled && placement ? "crosshair" : "";
  }
  function deselect() {
    if (selected) selected.traverse(obj => { if (obj.isMesh && obj.material?.emissive) obj.material.emissive.setHex(0x000000); });
    selected=null;
    updateUI();
  }
  function select(building) {
    if(selected === building) return;
    deselect();
    selected=building;
    if(building) building.traverse(obj => {if(obj.isMesh && obj.material?.emissive) obj.material.emissive.setHex(0x191b00);});
    updateUI();
  }
  function makeBuilding(entry) {
    const building = entry.type===MODEL_ID ? model.clone(true) : createTarget(entry.type);
    building.traverse(obj => {
      if(!obj.isMesh) return;
      obj.material = obj.material.clone(); // selection must not affect shared meshes
      obj.castShadow=true;
      obj.receiveShadow=true;
    });
    building.position.set(entry.x,heightAt(entry.x,entry.z),entry.z);
    building.rotation.y = entry.rotation;
    building.userData.building = true;
    building.userData.assetType = entry.type;
    scene.add(building);
    buildings.push(building);
    updateUI();
    return building;
  }
  function setEnabled(value) {
    if(value && document.querySelector("#place-person")?.getAttribute("aria-pressed")==="true")
      document.querySelector("#place-person")?.click();
    enabled=value;
    panel.hidden=!enabled;
    toggle.setAttribute("aria-pressed",String(enabled));
    toggle.classList.toggle("active",enabled);
    if(enabled && getMode()!=="overview") setOverview();
    if(!enabled) {placement=null;deselect();}
    updateUI();
  }
  function beginPlacement(action) {
    if(typeSelect.value===MODEL_ID && !model && action==="add"){setStatus("Fältboden laddas fortfarande.");return;}
    if(getMode()!=="overview") setOverview();
    placement = placement===action ? null : action;
    setStatus(placement==="add"?`Klicka på terrängen för att placera ${typeSelect.options[typeSelect.selectedIndex].text}.`
      :placement==="move"?"Klicka på en ny plats för det valda objektet.":"Välj ett objekt eller placera ett nytt.");
    updateUI();
  }
  function getHits(event, targets) {
    const rect=canvas.getBoundingClientRect();
    mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(mouse,camera);
    return raycaster.intersectObjects(targets,true);
  }
  // A short pointer movement is a click; orbit dragging never places a building.
  let pointerStart = null;
  canvas.addEventListener("pointerdown",e => {
    if(!enabled || getMode()!=="overview")return;
    pointerStart={x:e.clientX,y:e.clientY,id:e.pointerId};
  });
  canvas.addEventListener("pointerup",e => {
    if(!enabled || getMode()!=="overview" || !pointerStart || e.pointerId!==pointerStart.id)return;
    const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
    pointerStart=null;
    if(Math.hypot(dx,dy)>6)return;
    if(placement){
      const hit=getHits(e,[terrain])[0];
      if(!hit){setStatus("Klicka inom terrängmodellen.");return;}
      const x=bounded(hit.point.x,1000), z=bounded(hit.point.z,800);
      if(placement==="add"){
        const type=typeSelect.value;
        select(makeBuilding({type,x,z,rotation:0}));
        setStatus("Objektet placerat. Rotera eller flytta det vid behov.");
      } else if(selected){
        selected.position.set(x,heightAt(x,z),z);
        setStatus("Objektet flyttat.");
      }
      placement=null;
      save();
      updateUI();
      return;
    }
    const hits=getHits(e,buildings);
    if(hits.length){
      let obj=hits[0].object;
      while(obj && !obj.userData.building)obj=obj.parent;
      if(obj){select(obj);setStatus("Objekt valt. Du kan flytta eller rotera det.");return;}
    }
    deselect();
    setStatus("Inget objekt valt.");
  });
  canvas.addEventListener("pointercancel",()=>pointerStart=null);
  addButton.addEventListener("click",()=>beginPlacement("add"));
  typeSelect.addEventListener("change",()=>{if(placement==="add"){placement=null;updateUI();} });
  moveButton.addEventListener("click",()=>beginPlacement("move"));
  for(const [button, angle] of [[leftButton,-15],[rightButton,15]]){
    button.addEventListener("click",()=>{
      if(!selected)return;
      selected.rotation.y+=THREE.MathUtils.degToRad(angle);
      save();setStatus(`Rotering: ${Math.round(THREE.MathUtils.radToDeg(selected.rotation.y))}°.`);
    });
  }
  removeButton.addEventListener("click",()=>{
    if(!selected)return;
    const index=buildings.indexOf(selected);
    scene.remove(selected);
    buildings.splice(index,1);
    selected=null;placement=null;
    save();updateUI();setStatus("Objektet borttaget.");
  });
  downloadButton.addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({version:1,objects:entries()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="blaberget-objekt.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setStatus("JSON-filen sparas på din enhet.");
  });
  importInput.addEventListener("change",async()=>{
    const file=importInput.files?.[0];
    if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(data.version!==1 || !Array.isArray(data.objects))throw Error("Ogiltigt filformat");
      const valid=normalize(data.objects);
      if(valid.length!==data.objects.length)throw Error("Filen innehåller ogiltiga objekt");
      // Import replaces the current building layout to avoid accidental duplicates.
      for(const building of buildings)scene.remove(building);
      buildings.length=0;selected=null;placement=null;
      valid.forEach(makeBuilding);
      save();setStatus(`Importerade ${valid.length} objekt.`);
    }catch(e){setStatus(`Import misslyckades: ${e.message}`);}
    finally{importInput.value="";updateUI();}
  });
  toggle.addEventListener("click",()=>setEnabled(!enabled));
  closeButton.addEventListener("click",()=>setEnabled(false));
  addEventListener("keydown",e=>{
    if(e.code==="Escape" && enabled && placement){
      placement=null;setStatus("Placering avbruten.");updateUI();
    }
  });
  updateUI();
  try{
    const loaded=await loader.loadAsync(ASSET);
    model=loaded.scene;
    model.name="Fältbod";
    let stored=[];
    try{stored=normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));}
    catch {setStatus("Lokalt sparad byggdata kunde inte läsas.");}
    stored.forEach(makeBuilding);
    updateUI();
    if(!stored.length)setStatus("Välj en objekttyp och klicka på Placera objekt.");
    else setStatus("Tidigare lokalt sparade objekt har laddats.");
  }catch(e){
    console.error("Fältboden kunde inte laddas",e);
    setStatus("Fältboden kunde inte laddas; måltyperna finns fortfarande tillgängliga.");
  }
}
