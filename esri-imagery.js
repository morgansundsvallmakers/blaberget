// Optional World Imagery experiment. Tiles are fetched only on demand
// and rendered as a temporary texture in this browser session.
import * as THREE from "three";
import proj4 from "https://cdn.jsdelivr.net/npm/proj4@2.12.1/+esm";

const SWEREF99TM = "+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs";
const WORLD = 40075016.68557849;
const ZOOM = 16; // Conservative first test: about 1 m/pixel at this latitude
const TILE_SIZE = 256;
const WORLD_IMAGERY = "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile";
const ATTRIBUTION = "Flygbild: Esri, Maxar, Earthstar Geographics och GIS User Community";

function tilePosition(easting, northing) {
  const [mx, my] = proj4(SWEREF99TM, "EPSG:3857", [easting, northing]);
  const side = 2 ** ZOOM;
  return [(mx / WORLD + .5) * side, (.5 - my / WORLD) * side];
}

export async function createImageryTexture({token, eastingMin, northingMin, eastingMax, northingMax, renderer, onProgress}) {
  if (!token || !token.trim()) throw new Error("API-nyckeln saknas.");
  const corners = [
    tilePosition(eastingMin,northingMin),tilePosition(eastingMin,northingMax),
    tilePosition(eastingMax,northingMin),tilePosition(eastingMax,northingMax)
  ];
  const minX = Math.floor(Math.min(...corners.map(p=>p[0])));
  const maxX = Math.floor(Math.max(...corners.map(p=>p[0])));
  const minY = Math.floor(Math.min(...corners.map(p=>p[1])));
  const maxY = Math.floor(Math.max(...corners.map(p=>p[1])));
  const cols = maxX-minX+1, rows=maxY-minY+1;
  const total = cols*rows;
  if (total>80) throw new Error("För många bildrutor för det här testet.");
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width=cols*TILE_SIZE;
  textureCanvas.height=rows*TILE_SIZE;
  const context=textureCanvas.getContext("2d",{alpha:false});
  if (!context) throw new Error("Kunde inte skapa bildtextur.");
  const tiles=[];
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)tiles.push({x,y});
  let completed=0, next=0;
  // Small concurrency limit to avoid overwhelming the service or mobile browser.
  async function worker() {
    while(next<tiles.length) {
      const {x,y}=tiles[next++];
      const url=`${WORLD_IMAGERY}/${ZOOM}/${y}/${x}`;
      const response=await fetch(url,{
        headers:{"X-Esri-Authorization":`Bearer ${token.trim()}`},
        cache:"no-store"
      });
      if(!response.ok){
        if(response.status===401||response.status===403)
          throw new Error("Esri nekade åtkomst (401/403). Kontrollera nyckel, behörighet och webbplatsbegränsning.");
        throw new Error(`Esri svarade HTTP ${response.status}.`);
      }
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      context.drawImage(bitmap,(x-minX)*TILE_SIZE,(y-minY)*TILE_SIZE,TILE_SIZE,TILE_SIZE);
      bitmap.close?.();
      onProgress?.(++completed,total);
    }
  }
  await Promise.all(Array.from({length:Math.min(5,total)},worker));
  const texture=new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  const toUV=(east,north)=>{
    const [tx,ty]=tilePosition(east,north);
    return [(tx-minX)/cols,1-(ty-minY)/rows];
  };
  return {texture,toUV,attribution:ATTRIBUTION,total};
}
