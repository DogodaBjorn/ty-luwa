// De service worker van het beheer. Hij doet met opzet niets.
//
// Waarom hij er dan is: Chrome toont de installatieknop ("App installeren")
// alleen voor een site die een service worker met een fetch-luisteraar heeft.
// Dat is de enige reden. Er wordt hier niets opgeslagen en niets onderschept:
// de fetch-luisteraar roept nooit respondWith() aan, dus elk verzoek gaat
// gewoon naar het netwerk. Beheerdata mag nooit verouderd getoond worden, en
// dat is hier geen belofte maar een eigenschap van deze code — ook over drie
// jaar, als er nog een oude versie van dit bestand in een telefoon draait.
//
// Zodra Chrome de eis laat vallen kan dit bestand weg, samen met de route in
// routes/beheer.js en de registratie in assets/beheer/beheer.js.
//
// Hem wéér weg krijgen uit een telefoon die we niet kunnen bereiken:
// verwijder de route NIET, en doe deze twee dingen samen.
//
// 1. Vervang de inhoud van dit bestand door een worker die zichzelf uitschrijft:
//      self.addEventListener("install", () => self.skipWaiting());
//      self.addEventListener("activate", (e) => e.waitUntil((async () => {
//        await self.registration.unregister();
//        for (const c of await self.clients.matchAll()) c.navigate(c.url);
//      })()));
//
// 2. Vervang in assets/beheer/beheer.js de register()-aanroep door een die
//    alleen nog om een controle vraagt:
//      navigator.serviceWorker.getRegistration("/beheer").then(function (r) {
//        if (r) r.update();
//      });
//
// Die tweede stap is niet optioneel en ook niet omwisselbaar met "gewoon de
// register()-aanroep weghalen": de automatische controle van de browser bij
// een navigatie is niet gegarandeerd (uitgeprobeerd — zonder een expliciete
// update() bleef de oude worker staan), en register() laten staan zou de
// zelf-uitschrijvende worker meteen opnieuw registreren. Laat de route daarna
// nog een seizoen staan: de volgende keer dat Luuk of Wanda het beheer opent,
// is de worker weg.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
