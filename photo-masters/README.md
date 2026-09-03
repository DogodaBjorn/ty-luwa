# Originele foto's

De onbewerkte foto's van Ty LuWa, zoals ze gemaakt zijn. Deze map wordt **niet**
meegebouwd en komt niet op de website — `scripts/build-site.js` kopieert alleen
`assets/photos/`.

## Waarom ze hier staan

Wat op de site staat (`assets/photos/provisional/`) is een bewerkte versie: er is
persoonlijke rommel uit weggepoetst — schoenen op het terras, een parasolvoet, een
handdoek over de reling, glazen op tafel, tuingereedschap. Terecht voor een verhuursite.

Die bewerking heeft alleen ook de resolutie gekost. Elf van de twaalf zijn kleiner
geworden, ongeveer een kwart in elke richting:

| Bestand | Origineel | Op de site |
|---|---|---|
| bathroom-wide.jpg | 1152×1536 | 864×1184 |
| double-bedroom.jpg | 1152×1536 | 864×1184 |
| exterior-main.jpg | 1536×1152 | 1184×864 |
| garden-terrace.jpg | 1536×1152 | 1184×864 |
| kitchen-overview.jpg | 1152×1536 | 570×1089 |
| living-kitchen-wide.jpg | 1536×1015 | 1248×832 |
| living-overview.jpg | 1536×1152 | 1184×864 |
| separate-toilet.jpg | 1152×1536 | 864×1184 |
| shower.jpg | 1152×1536 | 864×1184 |
| twin-bedroom.jpg | 1152×1536 | 864×1184 |
| walkin-closet.jpg | 1152×1536 | 864×1184 |
| veranda-panorama.jpg | 1536×329 | 2048×512 (opgeschaald) |

De keuken is er het slechtst vanaf gekomen: van staand 1152×1536 naar 570×1089, dus fors
bijgesneden én verkleind. De veranda is juist opgeschaald naar een resolutie die er niet
was, wat hem zacht maakt.

Deze map bestaat zodat het opruimen desgewenst opnieuw kan, op volle resolutie, zonder
afhankelijk te zijn van de git-historie van een andere repository. Precies dat is namelijk
al een keer misgegaan: de broncode van de site stond nergens gecommit en is verloren.

## Herkomst

Uit commit `644654b` van de DoGoDa-repo (`ty-luwa-app/assets/photos/provisional/`), de
versie vóór de retouche in `6c32ba3`.
