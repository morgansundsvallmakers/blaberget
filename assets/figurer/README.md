# Figurbibliotek – första utkastet

Här finns **60 skalbara SVG-filer**: sex figurtyper × fem färger × två varianter.

## Figurer och verkliga mått

| Figur | Bredd | Höjd | Skjuthandbokens grupp |
| --- | ---: | ---: | ---: |
| C 30 | 30 cm | 27 cm | 7 |
| C 20 | 20 cm | 18 cm | 10 |
| L 1 | 19 cm | 45 cm | 9 |
| L 2 | 30 cm | 70 cm | 7 |
| A-triangel 2 | 39 cm | 29 cm | 8 |
| Diamanten | 29.5 cm | 21 cm | 9 |

Källan för figurernas beteckningar och mått är användarens utdrag av
*Svenska Pistolskytteförbundets skjuthandbok, Del D: Fältskyttefigurer*
(sidorna 100–109). Färgpaletten är ungefärligt hämtad från en bifogad
referensbild med svart, orange, grön, gul och blå figur.

## Varianter

- `*_kant.svg` – transparent bakgrund och smal ljus kontur kring figurformen.
- `*_skiva.svg` – figuren på en **fyrsidig, ljus bakgrundsskiva**.
  Skivan har än så länge en **illustrativ marginal på 4 cm**, och är inte
  avsedd att återge en officiell skivstorlek.
- Den färgade figurens verkliga bredd och höjd finns i `figurer.json`.
  Använd dem vid 3D-skalning; **skivans SVG-storlek är större än själva figuren**.

Filerna innehåller schematiska, egna vektortolkningar utifrån formerna
i PDF och användarens fotografier, **inte exakta officiella målillustrationer**.
Inre ringar och facettdetaljer är förenklade. Bilderna är för
**visualisering och planering**, inte för att skriva ut eller tillverka
godkända tävlingsmål.

## Användning i Blåberget

SVG går att använda direkt som textur i Three.js eller rasterisera till PNG.
Målbyggaren kan läsa dimensioner, färgval och filnamn ur `figurer.json`.
Ingenting i den befintliga appen ändras av detta första bibliotek.

Exempel: `c30_gron_kant.svg`, `diamanten_bla_skiva.svg`.

Senare kan man lägga till noggrannare konturer, korrekta ringar, valfri
skivstorlek och rotation utan att ändra figurernas definierade mått.

### Rättning: C-figurer (24 november 2026)

C 20 och C 30 är cirklar med **rak avkapad nederkant**, inte ellipser.
Den cirkulära delen har diametern 20 respektive 30 cm och kapas 2 respektive
3 cm från cirkelns nedersta punkt, vilket ger totalhöjden 18 respektive 27 cm.
Detta gäller alla tio SVG-varianter per figur. De inre ringarna är fortfarande
schematiska och ska granskas mot skjuthandboken.
