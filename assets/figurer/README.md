# Blåberget – figurbibliotek

Alla figurernas SVG-filer ligger nu direkt i **denna mapp**. `figurer.json` är **enda katalogen** som beskriver filerna, måtten, färgerna, varianterna och granskningsstatus.

## Struktur

- `<figur-id>_<farg>_<variant>.svg` – figurvarianter. `kant` har frilagd bakgrund, `skiva` ljus bakgrundsskiva.
- Färger i filnamn: `svart`, `orange`, `gron`, `gul`, `bla`, `flerfarg`.
- Specialmål: `ballongmal_svart_sammansatt.svg` (tre ballonger på **ett** mål) och `stolpskottet_flerfarg_staende.svg`.
- `figurer.json` – maskinläsbart register med samtliga SVG-filnamn; använd `files[]` per figur, inte antag att alla har fem färger och två varianter.

## Vad är granskat?

- **B-triangel 2 grön:** godkänd av användaren.
- **A-triangel 2 orange kant:** godkänd av användaren; övriga färger/varianter är äldre utkast.
- **1/4 Vänster:** godkänd. **1/4 Höger:** spegling av samma grundfigur. **1/4 Rak:** korrigerad och godkänd.
- **Ballongmål:** behöver ritas om; användaren har sett felaktiga konturer. Pappskivan mäter **78 × 45 cm**, men enskilda ballongmått är okända.
- **Stolpskottet:** behöver korrigeras; användaren har påtalat felaktiga proportioner.
- Övriga figurer: arbetsutkast som behöver granskas mot skjuthandboken.

## Viktigt om mått och kvalitet

Måtten kommer från *Svenska Pistolskytteförbundets Skjuthandbok, Del D* där sådana anges. Vissa former är grova approximationer och vissa inre linjer är preliminära; figurerna är för **planeringsvisualisering**, inte godkända måltavlor.

SVG-innehållet har **inte ändrats** vid denna omorganisation: filer har flyttats med oförändrade Git-blobbar. Det innebär att även kända fel är kvar, men de är tydligt markerade i katalogen.

De befintliga bygglägena i `building-editor.js` och `target-group-builder.js` använder fortfarande sina egna enkla former; de använder inte ännu detta SVG-bibliotek. Om appen senare ansluts till biblioteket ska den använda registret och filernas granskningsstatus.
