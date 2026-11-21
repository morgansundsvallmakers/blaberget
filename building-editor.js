import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const STORAGE_KEY = "blaberget-buildings-v1";
const ASSET = "assets/faltboden_forsta_utkast.glb";
const MODEL_ID = "faltbod";

export async function setupBuildingEditor({ scene, camera, canvas, terrain, heightAt, setOverview, getMode }) {
  const toggle = document.querySelector("#toggle-build");
  const panel = document.querySelector("#build-panel");
  const status = document.querySelector("#build-status");
  const addButton = document.querySelector("#build-add");
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
  const buildings = [];
  let selected = null;
  let placement = null; // "add" or "move"
  let enabled = false;
  let model = null;

  const setStatus = (message) => { status.textContent = message; };
  const bounded = (v, range) => THREE.MathUtils.clamp(v, -range / 2 + 4, range / 2 - 4);
  const normalize = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(row => row && row.type === MODEL_ID
      && Number.isFinite(row.x) && Number.isFinite(row.z) && Number.isFinite(row.rotation)
      && Math.abs(row.x) <= 500 && Math.abs(row.z) <= 400).slice(0, 200)
      .map(row => ({ type: MODEL_ID, x: row.x, z: row.z, rotation: row.rotation }));
  };
  const entries = () => buildings.map(b => ({type: MODEL_ID, x: b.position.x, z: b.position.z, rotation: b.rotation.y}));
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries())); }
    catch { setStatus("Kunde inte spara lokalt. Använd Exportera JSON."); }
  }
  function updateUI() {
    countLabel.textContent = `${buildings.length} fältbod${buildings.length===1?"":"ar"}`;
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
    const building = model.clone(true);
    building.traverse(obj => {
      if(!obj.isMesh) return;
      obj.material = obj.material.clone(); // selection must not affect shared meshes
      obj.castShadow=true;
      obj.receiveShadow=true;
    });
    building.position.set(entry.x,heightAt(entry.x,entry.z),entry.z);
    building.rotation.y = entry.rotation;
    building.userData.building = true;
    scene.add(building);
    buildings.push(building);
    updateUI();
    return building;
  }
  function setEnabled(value) {
    enabled=value;
    panel.hidden=!enabled;
    toggle.setAttribute("aria-pressed",String(enabled));
    toggle.classList.toggle("active",enabled);
    if(enabled && getMode()!=="overview") setOverview();
    if(!enabled) {placement=null;deselect();}
    updateUI();
  }
  function beginPlacement(action) {
    if(!model){setStatus("Fältboden laddas fortfarande.");return;}
    if(getMode()!=="overview") setOverview();
    placement = placement===action ? null : action;
    setStatus(placement==="add"?"Klicka på terrängen för att placera en fältbod."
      :placement==="move"?"Klicka på en ny plats för den valda fältboden.":"Välj en fältbod eller placera en ny.");
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
        select(makeBuilding({x,z,rotation:0}));
        setStatus("Fältboden placerad. Rotera eller flytta den vid behov.");
      } else if(selected){
        selected.position.set(x,heightAt(x,z),z);
        setStatus("Fältboden flyttad.");
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
      if(obj){select(obj);setStatus("Fältbod vald. Du kan flytta eller rotera den.");return;}
    }
    deselect();
    setStatus("Ingen fältbod vald.");
  });
  canvas.addEventListener("pointercancel",()=>pointerStart=null);
  addButton.addEventListener("click",()=>beginPlacement("add"));
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
    save();updateUI();setStatus("Fältboden borttagen.");
  });
  downloadButton.addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({version:1,objects:entries()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="blaberget-byggnader.json";a.click();
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
      save();setStatus(`Importerade ${valid.length} fältbodar.`);
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
    if(!stored.length)setStatus("Välj Placera fältbod och klicka på terrängen.");
    else setStatus("Tidigare lokalt sparade fältbodar har laddats.");
  }catch(e){
    console.error("Fältboden kunde inte laddas",e);
    setStatus("Kunde inte ladda fältboden från assets/.");addButton.disabled=true;
  }
}
