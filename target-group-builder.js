import * as THREE from "three";

// Måtten är i meter. Detta bibliotek använder avsiktligt förenklade figurer.
export const FIGURES = {
  c50: {name:"C 50",w:.50,h:.45,color:"#202022",shape:"ellipse"},
  b45: {name:"B 45",w:.35,h:.45,color:"#202022",shape:"ellipse"},
  c30: {name:"C 30",w:.30,h:.27,color:"#e87827",shape:"ellipse"},
  yellow: {name:"Gul cirkel (exempel)",w:.30,h:.30,color:"#ebcd16",shape:"ellipse"},
  red: {name:"Röd halvcirkel (exempel)",w:.35,h:.20,color:"#bb3539",shape:"half"},
  blue: {name:"Blå fyrkant (exempel)",w:.30,h:.30,color:"#3473ad",shape:"rect"}
};
const LIBRARY_KEY="blaberget-target-groups-v1";
const MAX_PARTS=30;
const validNum=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
export function validateGroup(raw){
  if(!raw||typeof raw!=="object"||!Array.isArray(raw.parts)||raw.parts.length>MAX_PARTS||raw.parts.length===0)return null;
  const poles=Number(raw.poles);
  if(!Number.isInteger(poles)||poles<1||poles>3)return null;
  const parts=[];
  for(const p of raw.parts){
    if(!p||!FIGURES[p.type]||!validNum(p.x,-2.5,2.5)||!validNum(p.y,.1,2.8)||!validNum(p.angle,-180,180))return null;
    parts.push({type:p.type,x:p.x,y:p.y,angle:p.angle});
  }
  return {poles,parts};
}
export function makeTargetGroup(config){
  const data=validateGroup(config);
  if(!data)throw Error("Ogiltig målgrupp");
  const root=new THREE.Group();
  root.name="Fältmålgrupp";
  const wood=new THREE.MeshStandardMaterial({color:0x997851,roughness:1});
  const upright=new THREE.BoxGeometry(.045,2.45,.055);
  const spacing=.8;
  for(let i=0;i<data.poles;i++){
    const pole=new THREE.Mesh(upright,wood);
    pole.position.set((i-(data.poles-1)/2)*spacing,1.225,-.06);
    pole.castShadow=true;root.add(pole);
  }
  for(const part of data.parts){
    const def=FIGURES[part.type],shape=new THREE.Shape();
    if(def.shape==="ellipse")shape.absellipse(0,0,def.w/2,def.h/2,0,Math.PI*2,false,0);
    else if(def.shape==="half"){
      shape.moveTo(-def.w/2,-def.h/2);
      shape.lineTo(def.w/2,-def.h/2);
      shape.absarc(0,-def.h/2,def.w/2,0,Math.PI,true);
    }else{
      shape.moveTo(-def.w/2,-def.h/2);
      shape.lineTo(def.w/2,-def.h/2);
      shape.lineTo(def.w/2,def.h/2);
      shape.lineTo(-def.w/2,def.h/2);
      shape.closePath();
    }
    const mat=new THREE.MeshStandardMaterial({color:def.color,side:THREE.DoubleSide,roughness:.93});
    const face=new THREE.Mesh(new THREE.ShapeGeometry(shape,40),mat);
    face.position.set(part.x,part.y,.035);
    face.rotation.z=THREE.MathUtils.degToRad(part.angle);
    face.castShadow=true;root.add(face);
  }
  const picker=new THREE.Mesh(new THREE.BoxGeometry(3,2.8,.12),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  picker.position.y=1.35;root.add(picker);
  return root;
}
function library(){
  try{
    const a=JSON.parse(localStorage.getItem(LIBRARY_KEY)||"[]");
    if(!Array.isArray(a))return [];
    return a.filter(x=>typeof x.name==="string"&&validateGroup(x.config)).slice(0,40);
  }catch{return [];}
}
export function setupTargetGroupBuilder({onPlace}){
  const button=document.querySelector("#open-target-builder");
  const dialog=document.querySelector("#target-builder");
  if(!button||!dialog)return;
  const $=id=>dialog.querySelector("#"+id);
  const figure=$("tg-figure"),poles=$("tg-poles"),preview=$("tg-preview"),list=$("tg-parts");
  const x=$("tg-x"),y=$("tg-y"),angle=$("tg-angle"),name=$("tg-name"),saved=$("tg-saved"),message=$("tg-message");
  let data={poles:3,parts:[]},chosen=-1,dragging=false;
  for(const [type,def] of Object.entries(FIGURES)){
    const o=document.createElement("option");o.value=type;o.textContent=def.name;figure.append(o);
  }
  function inform(s){message.textContent=s;}
  function render(){
    poles.value=String(data.poles);
    preview.replaceChildren();
    const ns="http://www.w3.org/2000/svg";
    const el=(tag,attrs,parent=preview)=>{
      const e=document.createElementNS(ns,tag);
      Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));
      parent.append(e);return e;
    };
    el("rect",{x:0,y:0,width:420,height:290,fill:"#e4e9dc"});
    el("line",{x1:0,x2:420,y1:272,y2:272,stroke:"#67745f","stroke-width":2});
    for(let i=0;i<data.poles;i++){
      const px=210+(i-(data.poles-1)/2)*80;
      el("rect",{x:px-4,y:23,width:8,height:250,fill:"#9a7b57",stroke:"#6f553b"});
    }
    data.parts.forEach((p,i)=>{
      const def=FIGURES[p.type],cx=210+p.x*100,cy=272-p.y*100;
      const g=el("g",{transform:`translate(${cx} ${cy}) rotate(${-p.angle})`,"data-index":i,style:"cursor:grab"});
      if(def.shape==="ellipse")el("ellipse",{cx:0,cy:0,rx:def.w*50,ry:def.h*50,fill:def.color},g);
      else if(def.shape==="half")el("path",{d:`M${-def.w*50} ${def.h*50/2} A${def.w*50} ${def.w*50} 0 0 1 ${def.w*50} ${def.h*50/2} Z`,fill:def.color},g);
      else el("rect",{x:-def.w*50,y:-def.h*50,width:def.w*100,height:def.h*100,fill:def.color},g);
      if(i===chosen)el("rect",{x:-def.w*50-5,y:-def.h*50-5,width:def.w*100+10,height:def.h*100+10,fill:"none",stroke:"#ed6e35","stroke-width":2,"stroke-dasharray":"5 3"},g);
      g.addEventListener("pointerdown",e=>{e.stopPropagation();chosen=i;dragging=true;preview.setPointerCapture(e.pointerId);render();});
    });
    list.replaceChildren();
    data.parts.forEach((p,i)=>{
      const b=document.createElement("button");
      b.type="button";b.className=i===chosen?"selected":"";b.textContent=`${i+1}. ${FIGURES[p.type].name}`;
      b.onclick=()=>{chosen=i;render();};list.append(b);
    });
    const p=data.parts[chosen],active=!!p;
    [x,y,angle,$("tg-delete")].forEach(el=>el.disabled=!active);
    if(p){x.value=Math.round(p.x*100);y.value=Math.round(p.y*100);angle.value=p.angle;}
    $("tg-count").textContent=`${data.parts.length} figurer`;
  }
  function updatePart(){
    if(chosen<0)return;
    const p=data.parts[chosen];
    p.x=Number(x.value)/100;p.y=Number(y.value)/100;p.angle=Number(angle.value);
    render();
  }
  [x,y,angle].forEach(a=>a.addEventListener("change",updatePart));
  poles.addEventListener("change",()=>{data.poles=Number(poles.value);render();});
  $("tg-add").onclick=()=>{
    if(data.parts.length>=MAX_PARTS){inform("Högst 30 figurer per målgrupp.");return;}
    data.parts.push({type:figure.value,x:0,y:1.37,angle:0});chosen=data.parts.length-1;render();
  };
  $("tg-delete").onclick=()=>{if(chosen<0)return;data.parts.splice(chosen,1);chosen=Math.min(chosen,data.parts.length-1);render();};
  preview.addEventListener("pointermove",e=>{
    if(!dragging||chosen<0)return;
    const rect=preview.getBoundingClientRect();
    data.parts[chosen].x=Math.round(THREE.MathUtils.clamp(((e.clientX-rect.left)/rect.width*420-210)/100,-2.5,2.5)*100)/100;
    data.parts[chosen].y=Math.round(THREE.MathUtils.clamp((272-(e.clientY-rect.top)/rect.height*290)/100,.1,2.8)*100)/100;
    render();
  });
  preview.addEventListener("pointerup",()=>dragging=false);
  preview.addEventListener("pointercancel",()=>dragging=false);
  function refreshSaved(){
    saved.replaceChildren();const empty=document.createElement("option");empty.value="";empty.textContent="Välj sparad målgrupp";saved.append(empty);
    library().forEach((item,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=item.name;saved.append(o);});
  }
  $("tg-save").onclick=()=>{
    const config=validateGroup(data);
    if(!config){inform("Lägg till minst en figur.");return;}
    const title=name.value.trim().slice(0,60)||"Namnlös målgrupp";
    const all=library();all.push({name:title,config});if(all.length>40)all.shift();
    try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(all));refreshSaved();inform("Målgruppen sparad i den här webbläsaren.");}
    catch{inform("Kunde inte spara målgruppen lokalt.");}
  };
  $("tg-load").onclick=()=>{
    if(saved.value==="")return;
    const item=library()[Number(saved.value)];if(!item)return;
    data=structuredClone(item.config);name.value=item.name;chosen=data.parts.length?0:-1;render();inform("Sparad målgrupp öppnad.");
  };
  $("tg-place").onclick=()=>{
    const config=validateGroup(data);if(!config){inform("Lägg till minst en figur.");return;}
    onPlace(structuredClone(config));dialog.close();
  };
  $("tg-close").onclick=()=>dialog.close();
  button.onclick=()=>{refreshSaved();render();dialog.showModal();};
  data.parts=[{type:"c50",x:-.8,y:1.4,angle:0},{type:"c30",x:0,y:1.4,angle:0},{type:"b45",x:.8,y:1.4,angle:0}];
  chosen=0;render();
}
