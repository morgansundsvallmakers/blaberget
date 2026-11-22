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

## Byggläge (fältboden)

Välj **Byggläge** i översiktsläget. Klicka på **Placera fältbod** och sedan på
terrängen. Klicka på en befintlig bod för att välja den. En vald bod kan flyttas,
roteras 15° åt gången eller tas bort. En kameradragning ska inte placera bodar.

Modellen ligger i `assets/faltboden_forsta_utkast.glb`. Den är ett första utkast
och placeras med markkontakt utifrån höjdmodellen. Terrängen modifieras inte
under byggnaden.

Placeringar sparas i webbläsarens **localStorage**. De är **inte** automatiskt
gemensamma för andra besökare eller enheter. Använd **Exportera JSON** för att
spara och dela en anläggningslayout; **Importera JSON** ersätter nuvarande
lokala layout. Spara gärna en export som säkerhetskopia. Importen accepterar
endast kända objekttyper och begränsat koordinatintervall.

Byggläget är första steget mot fler modeller och fältskyttestationer.

## Fältmål: första tre figurerna

Byggläget har även tre förenklade målfigurer på enkla träställningar.
Välj **C 50 (50 × 45 cm)**, **B 45 (35 × 45 cm)** eller
**C 30 (30 × 27 cm)** i listan, välj **Placera objekt**, klicka på terrängen
och justera placering och rotation som för fältboden.

Måtten kommer från tabellerna i det uppladdade utdraget ur
Svenska Pistolskytteförbundets skjuthandbok (*Fältskyttefigurer*).
Figurerna är **förenklade ellipser**, inte exakta kopior av de
upphovsrättsskyddade målillustrationerna eller en skjutbar
målanläggning. Målens centrum ligger initialt ca 1,37 m över den
lokala markytan; ställningarna är tills vidare schematiska.

Den befintliga lokala sparnyckeln och JSON-formatet (version 1) behålls.
Gamla fältbodsplaceringar ska gå att läsa och JSON kan nu innehålla
både byggnader och mål. Ingen automatisk synkronisering mellan
besökare ingår. Modellen är ett visuellt planeringsunderlag och
ingen kontroll av skjutriktning, kulfång eller säkerhet.

## Placera observatör / växla kameraläge

Välj **Placera mig** i översikten och klicka på en plats i terrängen.
Den gula markören motsvarar observatören. Välj **Marknivå** för att gå dit
med kameran cirka 1,75 m över marken. När du återgår till **Översikt**
centreras kameran ovanför den aktuella positionen med en lätt sned vinkel.
Efter förflyttning i marknivå följer observatörspositionen med.

Startpunkten sparas lokalt i webbläsaren, separat från byggnader och mål.
Det går att avbryta utplaceringen med Esc. **Byggläge** och
**Placera mig** kan inte vara aktiva samtidigt. Observatörsmarkören
döljs i marknivå.

## Fältmålsbyggare (första versionen)

Öppna **Verktyg → Byggläge → Bygg en målgrupp…**. Dialogen har en
framifrånvy av upp till tre stolpar. Välj målfigur, klicka **Lägg till**,
dra figurerna till önskad plats eller ange sidled/centrumhöjd i centimeter
och rotation i grader. Det går att lägga till högst 30 figurer per målgrupp.

Målbyggaren innehåller C 50, B 45 och C 30 samt några **schematiska
exempelfigurer**. De är inte fotografiska texturer eller slutligt
kvalitetssäkrade mått för ytterligare figurer. Varje figur visas som en
plan yta i korrekt angiven fysisk skala. Trästolparna är schematiska.

**Spara målgrupp** lagrar en namngiven komposition i webbläsarens
localStorage. **Öppna sparad** hämtar en sådan komposition igen.
Biblioteket synkroniseras inte mellan enheter.

**Placera målgruppen i terrängen** stänger dialogen och låter dig klicka
på en plats i översiktsläget. Hela gruppen kan sedan väljas, flyttas,
vridas och tas bort som övriga objekt. Placeringar och deras respektive
figurkonfigurationer följer med i befintlig **Exportera JSON** /
**Importera JSON**, fortfarande med version 1. Äldre version 1-filer
med fältbodar eller enskilda mål är fortsatt giltiga. Det namngivna
biblioteket exporteras inte separat; JSON-exporten innehåller endast
de målgrupper som faktiskt placerats i terrängen.

Målgruppen är ett visuellt planeringsobjekt, inte en säkerhetsbedömning
av skjutriktningar eller kulfång.
