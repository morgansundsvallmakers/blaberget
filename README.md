# Blåberget – virtuell områdesplanering

En statisk Three.js-prototyp för GitHub Pages. Den visar Blåbergets verkliga
terräng i meter och innehåller både översiktsvy och rörelse på marknivå.

## Data

- Höjdmodell: Lantmäteriet, **Markhöjdmodell Nedladdning**, 1 m upplösning.
- Referenssystem: SWEREF 99 TM (EPSG:3006), höjder i RH 2000.
- Utsnitt: E 612300–613300, N 6916700–6917500.
- Licens för höjddata: CC BY 4.0.
- Terrängen levereras till webbläsaren som ett nedsamplat 251 × 201
  `Float32`-raster. Originaldata publiceras inte i repot.

Den röda gränsen är manuellt digitaliserad från användarens planeringskarta och
är ett visuellt planeringsunderlag, inte en juridiskt gällande gräns.

## Modell

Granmodellen `gran_blaberget_5.glb` används som instansierad vegetation.
Träden utanför den röda gränsen är schematiskt placerade för att visa tät skog;
enskilda placeringar är ännu inte inmätta.

## Lokal visning

Starta en enkel lokal webbserver i repots rot, till exempel:

```powershell
py -m http.server 8080
```

Öppna sedan <http://localhost:8080/>.
