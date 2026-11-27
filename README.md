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

## Placera observatör / växla kameraläge

Välj **Placera mig** i översikten och klicka på en plats i terrängen.
Den gula markören motsvarar observatören. Välj **Marknivå** för att gå dit
med kameran cirka 1,75 m över marken. När du återgår till **Översikt**
centreras kameran ovanför den aktuella positionen med en lätt sned vinkel.
Efter förflyttning i marknivå följer observatörspositionen med.

Startpunkten sparas lokalt i webbläsaren. Det går att avbryta utplaceringen med Esc. Observatörsmarkören döljs i marknivå.

## 3D-bibliotek

Öppna **Verktyg → 3D-bibliotek** för att importera, förhandsvisa, namnge och ladda ner GLB-modeller. Modellerna lagras lokalt i IndexedDB. Behåll originalfilerna som säkerhetskopior.

Det tidigare byggläget har tagits bort från webbappen. Befintliga lokala sparfiler raderas inte automatiskt.
