import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const dialog=$('model-library'), list=$('ml-list'), status=$('ml-status');
const loader=new GLTFLoader();
let dbPromise, previewCleanup, generation=0, entries=[], busy=false;
const say=message=>{status.textContent=message;};
function database(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open('blaberget-general-models',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('models',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Stäng andra flikar och försök igen.'));
  }).catch(err=>{dbPromise=null;throw err;});
  return dbPromise;
}
async function store(mode, action){
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('models',mode);
    const req=action(tx.objectStore('models'));
    tx.oncomplete=()=>resolve(req.result);
    tx.onerror=()=>reject(tx.error||req.error);
    tx.onabort=()=>reject(tx.error||new Error('Lagringen avbröts.'));
  });
}
export const modelLibrary={
  list:()=>store('readonly',s=>s.getAll()),
  get:id=>store('readonly',s=>s.get(id)),
  save:record=>store('readwrite',s=>s.put(record)),
  remove:id=>store('readwrite',s=>s.delete(id))
};
function disposeScene(root){
  const geometries=new Set(), materials=new Set(), textures=new Set();
  root.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m)continue;materials.add(m);
      for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
    }
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});
}
function validate(buffer){
  if(buffer.byteLength<20)throw new Error('Ogiltig GLB-fil.');
  const v=new DataView(buffer);
  if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength||v.getUint32(16,true)!==0x4e4f534a||20+v.getUint32(12,true)>buffer.byteLength)throw new Error('Ogiltig GLB 2.0-fil.');
  const j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,v.getUint32(12,true))));
  if([...(j.buffers||[]),...(j.images||[])].some(x=>x.uri&&!x.uri.startsWith('data:')))throw new Error('Modellen måste vara fristående, utan externa filer.');
}
async function parse(buffer){validate(buffer);return loader.parseAsync(buffer,'');}
function clearPreview(){generation++;previewCleanup?.();previewCleanup=null;$('ml-preview').replaceChildren();}
function selected(){return entries.find(e=>e.id===list.value);}
function controls(){
  const e=selected();for(const id of ['ml-name','ml-rename','ml-download','ml-delete'])$(id).disabled=busy||!e;
  $('ml-files').disabled=busy;
}
async function show(){
  clearPreview();const token=generation,e=selected();$('ml-name').value=e?.name||'';controls();
  if(!e||!dialog.open)return;
  let root, renderer, orbit, observer, frame;
  try{
    const gltf=await parse(await e.blob.arrayBuffer());root=gltf.scene;
    if(token!==generation||!dialog.open){disposeScene(root);return;}
    const host=$('ml-preview'), scene=new THREE.Scene();scene.background=new THREE.Color('#101e18');
    const box=new THREE.Box3().setFromObject(root), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
    if(box.isEmpty()||!Number.isFinite(size.length()))throw new Error('Modellen saknar synlig geometri.');
    const extent=Math.max(size.x,size.y,size.z,0.00001);
    const group=new THREE.Group();group.add(root);root.position.sub(center);group.scale.setScalar(1/extent);scene.add(group);
    const camera=new THREE.PerspectiveCamera(40,1,.001,100);camera.position.set(1.5,1,1.7);
    renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
    orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
    scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,5,4);scene.add(light);
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();observer=new ResizeObserver(resize);observer.observe(host);
    const render=()=>{orbit.update();renderer.render(scene,camera);frame=requestAnimationFrame(render);};render();
    previewCleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();orbit.dispose();renderer.dispose();renderer.domElement.remove();disposeScene(root);};
  }catch(err){cancelAnimationFrame(frame);observer?.disconnect();orbit?.dispose();renderer?.dispose();renderer?.domElement.remove();if(root)disposeScene(root);if(token===generation)say('Förhandsvisning: '+err.message);}
}
async function refresh(id){
  entries=(await modelLibrary.list()).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  list.replaceChildren(...entries.map(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.name;return o;}));
  if(entries.some(e=>e.id===id))list.value=id;else if(entries.length)list.selectedIndex=0;
  await show();
}
async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch(err){say(err.message||String(err));}finally{busy=false;controls();}}
async function importFiles(files){
  await run(async()=>{
    let count=0,last,errors=[];
    for(const file of files){
      try{
        if(!/\.glb$/i.test(file.name)||file.size>50*1024*1024)throw new Error('Välj en GLB-fil på högst 50 MB.');
        const gltf=await parse(await file.arrayBuffer());disposeScene(gltf.scene);
        last=crypto.randomUUID();await modelLibrary.save({id:last,name:file.name.replace(/\.glb$/i,''),blob:file,created:Date.now()});count++;
      }catch(err){errors.push(file.name+': '+err.message);}
    }
    await refresh(last);say(count+' importerade. '+errors.join(' '));
  });
}
$('open-model-library').addEventListener('click',()=>{if(dialog.open)return;dialog.showModal();run(async()=>{await refresh();say(entries.length+' sparade modeller.');});});
$('ml-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',clearPreview);
list.addEventListener('change',()=>{say('');show();});
$('ml-files').addEventListener('change',e=>{const files=[...e.target.files];e.target.value='';importFiles(files);});
const drop=$('ml-drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');importFiles([...e.dataTransfer.files]);});
$('ml-rename').addEventListener('click',()=>run(async()=>{const e=selected(),name=$('ml-name').value.trim();if(!e||!name)throw new Error('Ange ett namn.');await modelLibrary.save({...e,name});await refresh(e.id);say('Namnet har sparats.');}));
$('ml-delete').addEventListener('click',()=>{const e=selected();if(e&&confirm('Ta bort '+e.name+' från det lokala biblioteket?'))run(async()=>{await modelLibrary.remove(e.id);await refresh();say('Modellen har tagits bort.');});});
$('ml-download').addEventListener('click',()=>{const e=selected();if(!e)return;const url=URL.createObjectURL(e.blob),a=document.createElement('a');a.href=url;a.download=e.name.replace(/[\\/:*?"<>|]/g,'_')+'.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
