/* Script aggiunto a mano (fuori dall'export Webflow), vedi CLAUDE.md.

   Menu laterale di "Chi siamo" (Network, IONers, Davide Bruno, Partnership,
   Premi): nell'export i link puntano tutti a "#" e le sezioni hanno tutte
   id="section-1". Qui ogni voce viene abbinata, in ordine, alla sezione
   corrispondente: al clic la pagina scorre fino alla sezione, e mentre si
   scorre la voce della sezione visibile diventa bold (classe "is-active"). */

(function () {
  var links = document.querySelectorAll(".chisiamo-link-menu");
  var sections = document.querySelectorAll(".chisiamo-section-scroll, .chisiamo-section-2-scroll");
  var n = Math.min(links.length, sections.length);
  if (!n) return;

  var HEADER = 90; // header fisso (il menu è sticky a top: 75px) + margine

  function slug(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function scrollToSection(section, smooth) {
    var top = section.getBoundingClientRect().top + window.pageYOffset - HEADER;
    window.scrollTo({ top: top, behavior: smooth ? "smooth" : "auto" });
  }

  // Gli id delle sezioni (tutti "section-1") NON vanno cambiati: il CSS di
  // Webflow li usa per posizionarle nella griglia (#section-1.w-node-...).
  // L'ancora (#network, #ioners...) è gestita solo qui.
  var byHash = {};
  for (var i = 0; i < n; i++) {
    (function (link, section) {
      var hash = "#" + (slug(link.textContent) || "sezione-" + (i + 1));
      byHash[hash] = section;
      link.setAttribute("href", hash);
      link.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation(); // niente smooth scroll di Webflow
        scrollToSection(section, true);
        if (history.replaceState) history.replaceState(null, "", hash);
      });
    })(links[i], sections[i]);
  }
  if (byHash[location.hash]) {
    window.addEventListener("load", function () { scrollToSection(byHash[location.hash], false); });
  }

  // È attiva l'ultima sezione che ha superato il 40% dello schermo (se due
  // sezioni iniziano alla stessa altezza, lo diventano entrambe).
  var current = "";
  function update() {
    var line = window.innerHeight * 0.4;
    var tops = [], rowTop = null;
    for (var i = 0; i < n; i++) {
      tops[i] = sections[i].getBoundingClientRect().top;
      if (tops[i] <= line && (rowTop === null || tops[i] > rowTop)) rowTop = tops[i];
    }
    // In fondo alla pagina l'ultima riga potrebbe non arrivare alla linea.
    var atBottom = window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2;
    if (atBottom && tops[n - 1] < window.innerHeight) rowTop = tops[n - 1];
    var state = "";
    for (var j = 0; j < n; j++) state += rowTop !== null && Math.abs(tops[j] - rowTop) < 5 ? "1" : "0";
    if (state === current) return;
    current = state;
    for (var k = 0; k < n; k++) links[k].classList.toggle("is-active", state[k] === "1");
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
