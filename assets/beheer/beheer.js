// Beheer: alles werkt zonder dit bestand. Het voegt alleen gemak toe: de
// nachtenteller onder de datumvelden, gastvelden alleen bij verhuurd/optie,
// en een knop die na een tik niet twee keer verstuurt.
(function () {
  "use strict";

  var form = document.querySelector("[data-period-form]");
  if (form) {
    var arrival = form.querySelector('[name="arrival"]');
    var departure = form.querySelector('[name="departure"]');
    var out = form.querySelector("[data-nights]");
    var guest = form.querySelector("[data-guest-fields]");
    var kinds = form.querySelectorAll('[name="kind"]');

    var long = function (iso) {
      var p = iso.split("-").map(Number);
      return new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
        .format(new Date(Date.UTC(p[0], p[1] - 1, p[2])));
    };
    var update = function () {
      var a = arrival.value, b = departure.value;
      if (a && b && b > a) {
        var n = Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
        out.textContent = n + (n === 1 ? " nacht" : " nachten") + ", van " + long(a) + " tot " + long(b);
      } else if (a && b) {
        out.textContent = "Vertrek moet na aankomst liggen.";
      } else {
        out.textContent = "";
      }
      if (a && !b) {
        // Standaard een week: de meeste verblijven zijn van zaterdag tot zaterdag.
        var d = new Date(Date.parse(a) + 7 * 86400000);
        departure.value = d.toISOString().slice(0, 10);
        update();
      }
    };
    arrival.addEventListener("change", update);
    departure.addEventListener("change", update);

    var toggleGuest = function () {
      var checked = form.querySelector('[name="kind"]:checked');
      var show = !checked || checked.value === "rented" || checked.value === "option";
      guest.hidden = !show;
    };
    for (var i = 0; i < kinds.length; i++) kinds[i].addEventListener("change", toggleGuest);
    toggleGuest();
  }

  var forms = document.querySelectorAll("form");
  for (var j = 0; j < forms.length; j++) {
    forms[j].addEventListener("submit", function (e) {
      var btn = e.target.querySelector('button[type="submit"]');
      if (btn) setTimeout(function () { btn.disabled = true; }, 0);
    });
  }
})();

// --- uitleg: telefoon- of laptopplaatjes, en afdrukken ---------------------
// Zonder dit bestand toont de CSS de opname die bij het scherm past; dit maakt
// het een keuze, voor wie op de laptop leest en het op de telefoon nadoet.
(function () {
  "use strict";
  var box = document.querySelector("[data-shot-switch]");
  if (box) {
    var buttons = box.querySelectorAll("button[data-shots]");
    var apply = function (value) {
      if (value) document.documentElement.setAttribute("data-shots", value);
      else document.documentElement.removeAttribute("data-shots");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-shots") === value));
      }
    };
    var stored = null;
    try { stored = localStorage.getItem("tl-shots"); } catch (e) {}
    apply(stored || (window.innerWidth >= 820 ? "lap" : "mob"));
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (e) {
        var value = e.currentTarget.getAttribute("data-shots");
        apply(value);
        try { localStorage.setItem("tl-shots", value); } catch (err) {}
      });
    }
    box.hidden = false;
  }

  var print = document.querySelector("[data-print]");
  if (print) print.addEventListener("click", function () { window.print(); });
})();
