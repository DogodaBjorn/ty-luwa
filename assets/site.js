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
