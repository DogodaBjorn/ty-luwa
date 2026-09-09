// De enige JavaScript op de site. Alles wat je hier ziet is progressive
// enhancement: zonder dit bestand zijn alle pagina's, links en de taalwisselaar
// gewoon bruikbaar.
(function () {
  "use strict";

  // --- mobiel menu -------------------------------------------------------
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.getElementById("mobile-menu");
  var scrim = document.querySelector("[data-menu-scrim]");
  var iconOpen = toggle && toggle.querySelector("[data-icon-open]");
  var iconClose = toggle && toggle.querySelector("[data-icon-close]");

  if (toggle && menu) {
    var setOpen = function (open) {
      menu.hidden = !open;
      if (scrim) scrim.hidden = !open;
      if (iconOpen) iconOpen.hidden = open;
      if (iconClose) iconClose.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });

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
  // Zonder JavaScript post het formulier gewoon naar /api/aanvraag en komt de
  // melding via de server terug in de pagina. Met JavaScript blijft de pagina
  // staan: de aanvraag gaat via fetch en de melding verschijnt onder het
  // formulier, in de taal van de pagina (de server stuurt de tekst mee).
  var form = document.querySelector("[data-request-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[data-form-submit]");
    var arrival = form.querySelector('[name="arrival"]');
    var departure = form.querySelector('[name="departure"]');
    var nightsOut = form.querySelector("[data-form-nights]");
    var calBlock = document.querySelector("[data-calendar]");

    var showStatus = function (text, kind) {
      if (!status) return;
      status.textContent = text;
      status.className = "form-status is-" + kind;
      status.hidden = false;
      status.setAttribute("role", "status");
      status.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // Niet in het verleden: de datumvelden krijgen vandaag als ondergrens.
    var todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    if (arrival) arrival.min = todayIso;
    if (departure) departure.min = todayIso;

    var nightsBetween = function (a, b) {
      return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
    };
    var updateNights = function () {
      if (!nightsOut || !calBlock) return;
      var a = arrival.value, b = departure.value;
      if (a && b && b > a) {
        var n = nightsBetween(a, b);
        nightsOut.textContent = n === 1
          ? calBlock.getAttribute("data-night")
          : calBlock.getAttribute("data-nights").replace("{n}", n);
      } else {
        nightsOut.textContent = "";
      }
      if (a && departure) departure.min = a > todayIso ? a : todayIso;
    };
    if (arrival) arrival.addEventListener("change", updateNights);
    if (departure) departure.addEventListener("change", updateNights);

    form.addEventListener("submit", function (e) {
      if (!window.fetch || !window.URLSearchParams) return; // gewone post
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (submit) submit.disabled = true;
      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(new FormData(form)).toString(),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          showStatus(data.message, data.ok ? "sent" : "error");
          if (data.ok) {
            form.reset();
            updateNights();
            form.dispatchEvent(new CustomEvent("tl:sent"));
          }
        })
        .catch(function () {
          showStatus(form.getAttribute("data-error-server") || "Error", "error");
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  // --- beschikbaarheidskalender --------------------------------------------
  // De kalender staat al in de pagina (server-side). Dit maakt hem tikbaar:
  // eerste tik is de aankomstdag, tweede tik de vertrekdag, en de datums
  // komen in het formulier. Op een telefoon één maand tegelijk met pijlen.
  if (calBlock && form) {
    var months = [].slice.call(calBlock.querySelectorAll(".cal"));
    var hint = calBlock.querySelector("[data-cal-hint]");
    if (hint) hint.hidden = false;
    var busy = {};
    [].slice.call(calBlock.querySelectorAll(".cal-day.is-busy")).forEach(function (td) {
      busy[td.getAttribute("data-date")] = true;
    });
    var addDay = function (iso, n) {
      return new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
    };
    var freeNights = function (a, b) {
      for (var d = a; d < b; d = addDay(d, 1)) if (busy[d]) return false;
      return true;
    };
    var paint = function () {
      var a = arrival.value, b = departure.value;
      [].slice.call(calBlock.querySelectorAll(".cal-day")).forEach(function (td) {
        var d = td.getAttribute("data-date");
        td.classList.toggle("is-selected", d === a || d === b);
        td.classList.toggle("in-range", Boolean(a && b && d > a && d < b));
      });
    };
    calBlock.addEventListener("click", function (e) {
      var td = e.target.closest(".cal-day");
      if (!td || td.classList.contains("is-past")) return;
      var d = td.getAttribute("data-date");
      var a = arrival.value;
      if (a && !departure.value && d > a && freeNights(a, d)) {
        departure.value = d;
      } else if (!busy[d]) {
        arrival.value = d;
        departure.value = "";
      } else {
        return;
      }
      updateNights();
      paint();
      if (departure.value) {
        var nameField = form.querySelector('[name="name"]');
        if (nameField && window.innerWidth <= 900) form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    arrival.addEventListener("change", paint);
    departure.addEventListener("change", paint);
    form.addEventListener("tl:sent", paint);

    // Eén maand tegelijk op een smal scherm.
    var nav = document.createElement("div");
    nav.className = "cal-nav";
    nav.innerHTML =
      '<button type="button" class="btn btn-secondary" data-cal-prev>\u2039 ' + calBlock.getAttribute("data-prev") + "</button>" +
      '<button type="button" class="btn btn-secondary" data-cal-next>' + calBlock.getAttribute("data-next") + " \u203a</button>";
    calBlock.insertBefore(nav, calBlock.firstChild);
    var current = 0;
    var showMonth = function (i) {
      current = Math.max(0, Math.min(months.length - 1, i));
      months.forEach(function (m, j) { m.classList.toggle("is-shown", j === current); });
      nav.querySelector("[data-cal-prev]").disabled = current === 0;
      nav.querySelector("[data-cal-next]").disabled = current === months.length - 1;
    };
    nav.querySelector("[data-cal-prev]").addEventListener("click", function () { showMonth(current - 1); });
    nav.querySelector("[data-cal-next]").addEventListener("click", function () { showMonth(current + 1); });
    var mq = window.matchMedia("(max-width: 900px)");
    var applyPaging = function () {
      calBlock.classList.toggle("is-paged", mq.matches);
      if (mq.matches) showMonth(current);
    };
    if (mq.addEventListener) mq.addEventListener("change", applyPaging);
    applyPaging();
    paint();
  }

  // --- lightbox ------------------------------------------------------------
  // Foto's in de galerij en de mozaiek zijn links naar het bestand. Met
  // JavaScript opent zo'n link de <dialog> die de build op de pagina zet, met
  // titel en tekst uit de data-attributen van de link. Items met dezelfde
  // data-lightbox-group vormen een reeks: pijlen, pijltjestoetsen en swipen
  // bladeren erdoorheen. showModal() regelt focus-val, Escape en achtergrond.
  var dialog = document.querySelector("[data-lightbox]");
  if (dialog && typeof dialog.showModal === "function") {
    var items = [].slice.call(document.querySelectorAll("[data-lightbox-item]"));
    var inner = dialog.querySelector(".lightbox-inner");
    var figure = dialog.querySelector(".lightbox-figure");
    var captionBox = dialog.querySelector(".lightbox-caption");
    var img = dialog.querySelector("[data-lb-img]");
    var title = dialog.querySelector("[data-lb-title]");
    var caption = dialog.querySelector("[data-lb-caption]");
    var category = dialog.querySelector("[data-lb-category]");
    var counter = dialog.querySelector("[data-lb-counter]");
    var prevBtn = dialog.querySelector("[data-lb-prev]");
    var nextBtn = dialog.querySelector("[data-lb-next]");
    var closeBtn = dialog.querySelector("[data-lb-close]");
    var template = dialog.getAttribute("data-counter-template") || "{n} / {total}";
    var group = [];
    var index = -1;
    var opener = null;

    // Foto en kaart krijgen expliciete maten: zo breed als past, en niet hoger
    // dan het scherm min de tekst eronder. Een staande foto krijgt zo geen
    // brede donkere randen, en een kleine foto (de veranda-frames zijn maar
    // 329px hoog) wordt hooguit 1,6x vergroot in plaats van tot 1100px.
    var fit = function () {
      if (!img.naturalWidth || !dialog.open) return;
      var cs = getComputedStyle(inner);
      var padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      var padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var availW = inner.clientWidth - padX;
      var availH = inner.clientHeight - padY - captionBox.offsetHeight;
      var ratio = img.naturalWidth / img.naturalHeight;
      var w = Math.min(availW, 1100, Math.round(img.naturalWidth * 1.6));
      if (w / ratio > availH) w = Math.min(availW, Math.max(Math.round(availH * ratio), 240));
      img.style.width = w + "px";
      img.style.height = Math.round(w / ratio) + "px";
      figure.style.width = w + "px";
    };

    var preload = function (i) {
      var a = group[(i + group.length) % group.length];
      if (a) new Image().src = a.getAttribute("href");
    };

    var show = function (i) {
      index = (i + group.length) % group.length;
      var a = group[index];
      var pic = a.querySelector("img");
      img.classList.remove("is-loaded");
      img.alt = pic ? pic.alt : "";
      img.src = a.getAttribute("href");
      title.textContent = a.getAttribute("data-title") || "";
      caption.textContent = a.getAttribute("data-caption") || "";
      category.textContent = a.getAttribute("data-category") || "";
      counter.textContent = template
        .replace("{n}", String(index + 1))
        .replace("{total}", String(group.length));
      dialog.classList.toggle("is-single", group.length < 2);
      fit();
      preload(index + 1);
      preload(index - 1);
    };

    img.addEventListener("load", function () {
      // Twee keer: de tekst kan na de eerste breedte anders afbreken.
      fit();
      fit();
      img.classList.add("is-loaded");
    });

    var open = function (a) {
      var g = a.getAttribute("data-lightbox-group");
      group = items.filter(function (x) {
        return x.getAttribute("data-lightbox-group") === g;
      });
      opener = a;
      document.documentElement.classList.add("lightbox-open");
      dialog.showModal();
      show(group.indexOf(a));
      closeBtn.focus();
    };

    items.forEach(function (a) {
      a.addEventListener("click", function (e) {
        // Een klik met modifier of middelste knop wil de foto in een nieuw
        // tabblad; dat blijft gewoon een link.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        open(a);
      });
    });

    prevBtn.addEventListener("click", function () { show(index - 1); });
    nextBtn.addEventListener("click", function () { show(index + 1); });
    closeBtn.addEventListener("click", function () { dialog.close(); });

    // Klik naast de kaart sluit, net als Escape (dat doet de dialog zelf).
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog || e.target === inner) dialog.close();
    });

    dialog.addEventListener("keydown", function (e) {
      if (group.length < 2) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });

    // Swipen op de foto.
    var startX = null, startY = null;
    var stage = dialog.querySelector(".lightbox-stage");
    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      startX = e.clientX; startY = e.clientY;
    });
    stage.addEventListener("pointerup", function (e) {
      if (startX === null || group.length < 2) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? index + 1 : index - 1);
    });
    stage.addEventListener("pointercancel", function () { startX = startY = null; });

    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("lightbox-open");
      img.classList.remove("is-loaded");
      img.removeAttribute("src");
      img.style.width = img.style.height = "";
      figure.style.width = "";
      if (opener) opener.focus();
      opener = null;
    });

    window.addEventListener("resize", fit);
  }
})();
