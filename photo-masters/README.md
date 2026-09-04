# Originele foto's

De onbewerkte foto's van Ty LuWa, zoals ze gemaakt zijn. Deze map wordt **niet**
meegebouwd en komt niet op de website — `scripts/build-site.js` kopieert alleen
`assets/photos/`.

## Waarom ze hier staan

Wat op de site staat (`assets/photos/provisional/`) is een bewerkte versie op de volle
resolutie van deze originelen. De bewerking is in september 2026 opnieuw gedaan, omdat de
eerste retouche (de versie uit de DoGoDa-repo) elf van de twaalf foto's een kwart had
verkleind, de keuken fors had bijgesneden en de veranda had opgeschaald.

Hoe de huidige versie is gemaakt staat in de README van de repo onder "Foto's". Kort: het
1536px-origineel is de basis; alleen binnen de contouren van weggehaalde rommel zijn de
pixels van de eerste retouche gebruikt, uitgelijnd en licht verscherpt. Drie foto's zijn
bijgesneden in plaats van bewerkt. Het veranda-panorama is als strook van 4,7:1 nergens
bruikbaar; de site toont er twee frames van, uit het bewerkte panorama gesneden
(`DERIVED` in `scripts/retouch-photos.py`).

| Bestand | Origineel | Op de site | Wat er gebeurd is |
|---|---|---|---|
| bathroom-wide.jpg | 1152×1536 | 1152×1536 | tas en etui uit de kast, tandenborstel |
| double-bedroom.jpg | 1152×1536 | 1152×1536 | kleding van het bed, knuffels van de plank |
| exterior-main.jpg | 1536×1152 | 1536×1152 | handdoek, trui, schoenen, parasol, tafelspullen, gereedschap |
| garden-terrace.jpg | 1536×1152 | 1536×1085 | trui, kom, handdoek, tafelspullen; onderrand met schoenen weggesneden |
| kitchen-overview.jpg | 1152×1536 | 682×1065 | alleen bijgesneden: stoel met tas links en slippers onderin eruit |
| living-kitchen-wide.jpg | 1536×1015 | 976×800 | alleen bijgesneden: volle eettafel eruit |
| living-overview.jpg | 1536×1152 | 1536×1152 | eettafel leeggemaakt |
| separate-toilet.jpg | 1152×1536 | 1152×1536 | bezem, fles op de vensterbank, wc-rol; schoonmaakflessen staan er nog |
| shower.jpg | 1152×1536 | 1152×1536 | flessen uit het mandje |
| twin-bedroom.jpg | 1152×1536 | 1152×1536 | schoenen, tas, plankspullen, kleding |
| walkin-closet.jpg | 1152×1536 | 1152×1010 | alleen bijgesneden: stapel op de vloer eruit; kleren hangen er nog |
| veranda-panorama.jpg | 1536×329 | 1536×329 | tas onder de tafel; volle breedte behouden, maar wordt zelf niet getoond |
| ↳ veranda-left.jpg | uit panorama | 670×329 | uitsnede x 120–790: de eetkant met de grote tafel |
| ↳ veranda-right.jpg | uit panorama | 510×329 | uitsnede x 600–1110: de tuinkant met de stoelen; de donkere deuropening rechts valt weg |

Deze map bestaat zodat een bewerking altijd opnieuw kan, zonder afhankelijk te zijn van
de git-historie van een andere repository. Precies dat is namelijk al een keer misgegaan:
de broncode van de site stond nergens gecommit en is verloren.

## Herkomst

Uit commit `644654b` van de DoGoDa-repo (`ty-luwa-app/assets/photos/provisional/`), de
versie vóór de retouche in `6c32ba3`.
