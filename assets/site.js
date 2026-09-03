// De enige JavaScript op de site. Alles wat je hier ziet is progressive
// enhancement: zonder dit bestand zijn alle pagina's, links en de taalwisselaar
// gewoon bruikbaar.
(function () {
  "use strict";

  // --- mobiel menu -------------------------------------------------------
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.getElementById("mobile-menu");

  if (toggle && menu) {
    var setOpen = function (open) {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", function () {
      setOpen(menu.hidden);
    });

    // Sluiten zodra er ergens buiten geklikt wordt of Escape komt, anders
    // blijft het menu op een telefoon over de pagina heen staan.
    document.addEventListener("click", function (e) {
      if (menu.hidden) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Een link in het menu navigeert weg; het menu hoeft niet open te blijven
    // staan als de browser de pagina uit de bfcache terughaalt.
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
  }

  // --- aanvraagformulier -------------------------------------------------
  // Verzenden is nog niet ingericht; dat wacht op de boekingsadmin. Tot die er
  // is vangt dit de submit af en toont het de melding die in de content staat,
  // in plaats van de pagina te herladen naar niets.
  var form = document.querySelector("[data-request-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (status) {
        status.hidden = false;
        status.setAttribute("role", "status");
        status.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
})();
