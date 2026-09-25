/* Script aggiunto a mano (fuori dall'export Webflow), vedi CLAUDE.md.

   Nuova home section: cerchio ION al centro, intorno le categorie di soggetti
   coinvolti nei progetti (10 cerchi bianchi). In alto una "mega pill" con
   alcune tipologie di progetto (PLACEHOLDER, da definire con l'utente) che
   avanza automaticamente o è cliccabile: la pill attiva determina quanto ogni
   categoria è coinvolta, e i cerchi crescono/si avvicinano, si rimpiccioliscono
   /si allontanano, o scompaiono del tutto, con una transizione.

   TUTTO IL CONTENUTO (nomi pill, pesi, codici categoria) è placeholder
   illustrativo: va sostituito con la logica/i dati reali quando definiti. */

(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";

  var CATEGORIES = [
    { id: "comune", code: "A01", label: "Amministrazioni\ncomunali", abbr: "AC" },
    { id: "regione", code: "A02", label: "Enti regionali", abbr: "ER" },
    { id: "stato", code: "A03", label: "Enti statali", abbr: "ES" },
    { id: "trasporti", code: "A04", label: "Enti dei trasporti", abbr: "ET" },
    { id: "soprintendenza", code: "A05", label: "Soprintendenza", abbr: "SO" },
    { id: "partecipate", code: "A06", label: "Aziende partecipate", abbr: "AP" },
    { id: "universita", code: "C01", label: "Università", abbr: "UN" },
    { id: "fondi", code: "B01", label: "Fondi di investimento", abbr: "FI" },
    { id: "privati", code: "B02", label: "Soggetti privati", abbr: "SP" },
    { id: "tenant", code: "B03", label: "Tenant", abbr: "TE" }
  ];

  // Placeholder: tipologie di progetto ed elenco pesi (0 / 0.3 / 0.6 / 1) per
  // categoria; sotto 0.3 (es. 0.08) il pallino diventa molto piccolo.
  // categoria. Da sostituire con le tipologie e la logica reali.
  var PILLS = [
    {
      id: "piano-territorio",
      label: "Piano del territorio",
      weights: { comune: 1, regione: 1, stato: 0.6, soprintendenza: 0.6, universita: 0.3, partecipate: 0.3, trasporti: 0.3, fondi: 0, privati: 0, tenant: 0 },
      caption: {
        headline: "Amministrazioni ed enti pubblici disegnano insieme la trasformazione del territorio",
        dash: "—Chi decide",
        body: "Comuni, regioni ed enti statali guidano la pianificazione, con il supporto di soprintendenza e università nelle fasi di analisi e tutela."
      }
    },
    {
      id: "rigenerazione-urbana",
      label: "Rigenerazione urbana",
      weights: { comune: 0.6, regione: 0.3, stato: 0.3, soprintendenza: 0.3, partecipate: 0.6, privati: 1, fondi: 0.6, universita: 0.3, trasporti: 0.3, tenant: 0 },
      caption: {
        headline: "Pubblico e privato collaborano per restituire valore ai tessuti urbani esistenti",
        dash: "—Chi partecipa",
        body: "Comuni e aziende partecipate lavorano insieme a fondi e soggetti privati per rigenerare aree dismesse o sottoutilizzate."
      }
    },
    {
      id: "infrastrutture-mobilita",
      label: "Infrastrutture e mobilità",
      weights: { trasporti: 1, stato: 0.6, regione: 0.6, comune: 0.6, partecipate: 1, soprintendenza: 0.3, fondi: 0, privati: 0, universita: 0.08, tenant: 0 },
      caption: {
        headline: "Enti dei trasporti e amministrazioni coordinano reti che connettono i territori",
        dash: "—Chi la muove",
        body: "Enti dei trasporti, stato e regioni definiscono le reti; comuni e aziende partecipate ne curano la realizzazione locale."
      }
    },
    {
      id: "real-estate-privato",
      label: "Real estate privato",
      weights: { privati: 1, fondi: 1, tenant: 1, comune: 0.3, partecipate: 0.3, regione: 0, stato: 0, soprintendenza: 0.3, trasporti: 0, universita: 0 },
      caption: {
        headline: "Capitali privati e fondi trasformano immobili in luoghi da vivere",
        dash: "—Chi investe",
        body: "Fondi di investimento, soggetti privati e tenant guidano l'iniziativa, con un dialogo leggero verso comuni e aziende partecipate."
      }
    }
  ];

  // Versione inglese (en/index.html marca la section con data-lang="en"):
  // stessi id/pesi, cambiano solo i testi. Anch'essi placeholder.
  var EN_TEXT = {
    abbr: {
      comune: "MA", regione: "RB", stato: "SB", trasporti: "TA", soprintendenza: "HA",
      partecipate: "PC", universita: "UN", fondi: "IF", privati: "PP", tenant: "TE"
    },
    categories: {
      comune: "Municipal\nadministrations", regione: "Regional bodies", stato: "State bodies",
      trasporti: "Transport authorities", soprintendenza: "Heritage authority",
      partecipate: "Public-owned companies", universita: "University",
      fondi: "Investment funds", privati: "Private parties", tenant: "Tenants"
    },
    pills: {
      "piano-territorio": {
        label: "Territorial planning",
        caption: {
          headline: "Public administrations and bodies shape the transformation of the territory together",
          dash: "—Who decides",
          body: "Municipalities, regions and state bodies lead the planning, supported by the heritage authority and universities during analysis and protection."
        }
      },
      "rigenerazione-urbana": {
        label: "Urban regeneration",
        caption: {
          headline: "Public and private work together to bring value back to existing urban fabric",
          dash: "—Who takes part",
          body: "Municipalities and public-owned companies work with funds and private parties to regenerate disused or underused areas."
        }
      },
      "infrastrutture-mobilita": {
        label: "Infrastructure & mobility",
        caption: {
          headline: "Transport authorities and administrations coordinate networks that connect territories",
          dash: "—Who moves it",
          body: "Transport authorities, the state and regions define the networks; municipalities and public-owned companies handle local delivery."
        }
      },
      "real-estate-privato": {
        label: "Private real estate",
        caption: {
          headline: "Private capital and funds turn buildings into places to live",
          dash: "—Who invests",
          body: "Investment funds, private parties and tenants lead the initiative, with a light dialogue with municipalities and public-owned companies."
        }
      }
    }
  };
  if (document.querySelector('.home-live-section[data-lang="en"]')) {
    CATEGORIES.forEach(function (c) {
      c.label = EN_TEXT.categories[c.id] || c.label;
      c.abbr = EN_TEXT.abbr[c.id] || c.abbr;
    });
    PILLS.forEach(function (p) {
      var t = EN_TEXT.pills[p.id];
      if (t) { p.label = t.label; p.caption = t.caption; }
    });
  }

  var CENTER = { cx: 400, cy: 400 };
  var MAIN_RADIUS = 110;
  var MIN_R = 30;
  var MAX_R = 68;
  var MAX_DIST = 300;
  var MIN_DIST = 150;
  var LABEL_GAP = 18;
  var CIRCLE_GAP = 34;
  var CENTER_GAP = 32;
  var LABEL_LINE_HEIGHT = 18;
  var AUTO_ADVANCE_MS = 5200;
  var REVEAL_DELAY_MS = 500;

  var activeIndex = 0;
  var timer = null;
  var nodeEls = {};
  var pillEls = [];
  var pillHighlight = null;
  var pillNavEl = null;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Raggio del pallino: da MIN_R (peso 0.3 in giù è lineare) a MAX_R; sotto
  // 0.3 scende ancora fino a TINY_R, per i soggetti appena coinvolti.
  var TINY_R = 16;
  function radiusFor(w) {
    var r03 = lerp(MIN_R, MAX_R, 0.3);
    return w < 0.3 ? lerp(TINY_R, r03, w / 0.3) : lerp(MIN_R, MAX_R, w);
  }

  function weightFor(pillIndex, categoryId) {
    var w = PILLS[pillIndex].weights[categoryId];
    return typeof w === "number" ? w : 0;
  }

  // Immagine di un progetto di riferimento dentro il cerchio blu, una per
  // tab (stesso ordine di PILLS). Percorsi risolti rispetto a custom.js,
  // così funzionano anche da en/index.html.
  var SCRIPT_BASE = (document.currentScript && document.currentScript.src) || location.href;
  var MAIN_IMAGES = {
    "piano-territorio": "grafico-animato/piano-territorio-courmayeur.jpg",
    "rigenerazione-urbana": "grafico-animato/rigenerazione-urbana.jpg",
    "infrastrutture-mobilita": "grafico-animato/infrastrutture-mobilita-stazione.jpg",
    "real-estate-privato": "grafico-animato/real-estate-privato.jpg"
  };
  var mainImageEls = [];

  function buildMainCircle(canvas) {
    var main = document.createElementNS(SVG_NS, "circle");
    main.setAttribute("cx", CENTER.cx);
    main.setAttribute("cy", CENTER.cy);
    // Un filo più piccolo dell'immagine: con lo stesso raggio l'antialiasing
    // del bordo lasciava intravedere un sottile anello blu attorno alla foto.
    main.setAttribute("r", MAIN_RADIUS - 1.5);
    main.setAttribute("fill", "#070f75");
    canvas.appendChild(main);

    var defs = document.createElementNS(SVG_NS, "defs");
    var clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", "ion-main-clip");
    var clipCircle = document.createElementNS(SVG_NS, "circle");
    clipCircle.setAttribute("cx", CENTER.cx);
    clipCircle.setAttribute("cy", CENTER.cy);
    clipCircle.setAttribute("r", MAIN_RADIUS);
    clip.appendChild(clipCircle);
    defs.appendChild(clip);
    canvas.appendChild(defs);

    mainImagesGroup = document.createElementNS(SVG_NS, "g");
    canvas.appendChild(mainImagesGroup);

    PILLS.forEach(function (pill) {
      var src = MAIN_IMAGES[pill.id];
      var img = document.createElementNS(SVG_NS, "image");
      if (src) img.setAttribute("href", new URL(src, SCRIPT_BASE).href);
      img.setAttribute("x", CENTER.cx - MAIN_RADIUS);
      img.setAttribute("y", CENTER.cy - MAIN_RADIUS);
      img.setAttribute("width", MAIN_RADIUS * 2);
      img.setAttribute("height", MAIN_RADIUS * 2);
      img.setAttribute("preserveAspectRatio", "xMidYMid slice");
      img.setAttribute("clip-path", "url(#ion-main-clip)");
      img.setAttribute("class", "ion-main-image");
      mainImagesGroup.appendChild(img);
      mainImageEls.push(img);
    });
  }

  // Cambio diretto da un'immagine all'altra, senza passare dal blu: la
  // nuova viene portata in cima al gruppo e sfuma da 0 a 1 SOPRA la
  // vecchia, che resta piena (is-under) finché la nuova non è coperta.
  var mainImagesGroup = null;
  var mainUnderTimer = null;
  function applyMainImage(pillIndex) {
    var next = mainImageEls[pillIndex];
    if (!next || next.classList.contains("is-active")) return;
    var prev = null;
    mainImageEls.forEach(function (img) {
      img.classList.remove("is-under");
      if (img.classList.contains("is-active")) prev = img;
      img.classList.remove("is-active");
    });
    if (prev) prev.classList.add("is-under");
    mainImagesGroup.appendChild(next);
    // forza il reflow così la transizione parte da opacity 0
    next.getBoundingClientRect();
    next.classList.add("is-active");
    clearTimeout(mainUnderTimer);
    mainUnderTimer = setTimeout(function () {
      if (prev) prev.classList.remove("is-under");
    }, 700);
  }

  function buildCategoryNodes(canvas) {
    CATEGORIES.forEach(function (cat, i) {
      var angle = (i / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2;
      // Etichette sempre verso l'esterno: a sinistra del centro puntano a
      // sinistra (altrimenti finirebbero sul cerchio ION), a destra puntano
      // a destra come di default.
      var side = Math.cos(angle) < -0.05 ? "left" : "right";
      var labelX = side === "left" ? -(MIN_R + LABEL_GAP) : MIN_R + LABEL_GAP;

      var g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "ion-cat-node");
      g.style.transform = "translate(" + CENTER.cx + "px," + CENTER.cy + "px)";
      g.style.opacity = "0";

      var circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", "0");
      circle.setAttribute("cy", "0");
      circle.setAttribute("r", MIN_R);
      circle.setAttribute("fill", "rgba(255, 255, 255, 0.72)");
      // Mentre il mouse è sopra un pallino, l'ingrandimento lo fa il CSS
      // (:hover), qui mettiamo solo in pausa l'auto-avanzamento della pill
      // — altrimenti lo schema cambierebbe sotto al cursore mentre lo si
      // sta guardando da vicino. Ripreso al mouseleave.
      circle.addEventListener("mouseenter", function () {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });
      circle.addEventListener("mouseleave", function () {
        restartTimer();
      });
      g.appendChild(circle);

      // Sigla della categoria dentro il pallino (es. FI = Fondi di
      // investimento). Dimensione fissa come le etichette.
      var abbr = document.createElementNS(SVG_NS, "text");
      abbr.setAttribute("x", "0");
      abbr.setAttribute("y", "0");
      abbr.setAttribute("text-anchor", "middle");
      abbr.setAttribute("dominant-baseline", "central");
      abbr.setAttribute("class", "ion-cat-abbr");
      abbr.textContent = cat.abbr || "";
      g.appendChild(abbr);

      var code = document.createElementNS(SVG_NS, "text");
      code.setAttribute("x", labelX);
      code.setAttribute("y", "-5");
      code.setAttribute("text-anchor", side === "left" ? "end" : "start");
      code.setAttribute("class", "ion-cat-code");
      code.textContent = cat.code;
      g.appendChild(code);

      var lines = cat.label.split("\n");
      var text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", labelX);
      text.setAttribute("y", "14");
      text.setAttribute("text-anchor", side === "left" ? "end" : "start");
      text.setAttribute("class", "ion-cat-label");
      lines.forEach(function (line, li) {
        var tspan = document.createElementNS(SVG_NS, "tspan");
        tspan.setAttribute("x", labelX);
        tspan.setAttribute("dy", li === 0 ? "0" : LABEL_LINE_HEIGHT);
        tspan.textContent = line;
        text.appendChild(tspan);
      });
      g.appendChild(text);

      canvas.appendChild(g);
      var longestLine = lines.reduce(function (max, line) {
        return Math.max(max, line.length);
      }, 0);
      var labelWidth = Math.max(longestLine * 8.2, cat.code.length * 7.2);
      var labelLines = lines.length;
      nodeEls[cat.id] = { g: g, circle: circle, code: code, text: text, angle: angle, side: side, labelWidth: labelWidth, labelLines: labelLines };
    });
  }

  // Rilassamento anti-sovrapposizione: parte da una posizione polare (angolo
  // fisso, distanza in base al peso) e sposta i nodi visibili quel tanto che
  // basta per non accavallarsi tra loro, non coprire il cerchio ION centrale,
  // e non finire sotto l'etichetta (codice + nome) di un nodo vicino.
  function resolveCollisions(items) {
    for (var iter = 0; iter < 60; iter++) {
      for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var dxc = a.x - CENTER.cx;
        var dyc = a.y - CENTER.cy;
        var distC = Math.sqrt(dxc * dxc + dyc * dyc) || 0.001;
        var minC = MAIN_RADIUS + a.r + CENTER_GAP;
        if (distC < minC) {
          a.x = CENTER.cx + (dxc / distC) * minC;
          a.y = CENTER.cy + (dyc / distC) * minC;
        }
      }

      for (var i2 = 0; i2 < items.length; i2++) {
        for (var j = i2 + 1; j < items.length; j++) {
          var p = items[i2];
          var q = items[j];
          var dx = q.x - p.x;
          var dy = q.y - p.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          var minDist = p.r + q.r + CIRCLE_GAP;
          if (dist < minDist) {
            var overlap = (minDist - dist) / 2;
            var nx = dx / dist;
            var ny = dy / dist;
            p.x -= nx * overlap;
            p.y -= ny * overlap;
            q.x += nx * overlap;
            q.y += ny * overlap;
          }
        }
      }

      // etichetta (rettangolo a destra o sinistra del cerchio, a seconda del
      // lato) vs. cerchi vicini
      for (var pi = 0; pi < items.length; pi++) {
        var lp = items[pi];
        var rx0, rx1;
        if (lp.side === "left") {
          rx1 = lp.x - lp.r - LABEL_GAP;
          rx0 = rx1 - lp.labelWidth;
        } else {
          rx0 = lp.x + lp.r + LABEL_GAP;
          rx1 = rx0 + lp.labelWidth;
        }
        var ry0 = lp.y - 18;
        var ry1 = lp.y + 24 + (lp.labelLines - 1) * LABEL_LINE_HEIGHT;

        for (var qi = 0; qi < items.length; qi++) {
          if (qi === pi) continue;
          var lq = items[qi];
          var cx = Math.min(Math.max(lq.x, rx0), rx1);
          var cy = Math.min(Math.max(lq.y, ry0), ry1);
          var ldx = lq.x - cx;
          var ldy = lq.y - cy;
          var ldist = Math.sqrt(ldx * ldx + ldy * ldy);
          var need = lq.r + 8;
          if (ldist < need) {
            var lnx, lny;
            if (ldist < 0.01) {
              lnx = lq.x - lp.x || 1;
              lny = lq.y - lp.y || 0;
              var ln = Math.sqrt(lnx * lnx + lny * lny) || 1;
              lnx /= ln;
              lny /= ln;
            } else {
              lnx = ldx / ldist;
              lny = ldy / ldist;
            }
            var lpush = need - ldist;
            lq.x += lnx * lpush;
            lq.y += lny * lpush;
          }
        }
      }
    }
  }

  function applyPill(pillIndex) {
    var visible = [];

    CATEGORIES.forEach(function (cat) {
      var node = nodeEls[cat.id];
      var w = weightFor(pillIndex, cat.id);
      var dist = lerp(MAX_DIST, MIN_DIST, w);
      var r = radiusFor(w);
      var cx = CENTER.cx + Math.cos(node.angle) * dist;
      var cy = CENTER.cy + Math.sin(node.angle) * dist;

      node._w = w;
      node._r = r;

      if (w > 0) {
        visible.push({ node: node, x: cx, y: cy, r: r, labelWidth: node.labelWidth, side: node.side, labelLines: node.labelLines });
      }
    });

    resolveCollisions(visible);

    visible.forEach(function (item) {
      item.node._x = item.x;
      item.node._y = item.y;
    });

    CATEGORIES.forEach(function (cat) {
      var node = nodeEls[cat.id];
      var w = node._w;
      var r = node._r;
      var x = typeof node._x === "number" ? node._x : CENTER.cx + Math.cos(node.angle) * MAX_DIST;
      var y = typeof node._y === "number" ? node._y : CENTER.cy + Math.sin(node.angle) * MAX_DIST;
      var opacity = w <= 0 ? 0 : lerp(0.5, 1, w);

      var labelX = node.side === "left" ? -(r + LABEL_GAP) : r + LABEL_GAP;

      node.g.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      node.g.style.opacity = opacity.toFixed(2);
      // Un pallino a peso 0 è invisibile ma resterebbe comunque "hittable"
      // dal mouse nella sua posizione base: senza questo, ci si potrebbe
      // ritrovare con l'auto-avanzamento in pausa per un hover su
      // qualcosa che non si vede nemmeno.
      node.g.style.pointerEvents = w <= 0 ? "none" : "auto";
      node.circle.setAttribute("r", r.toFixed(1));
      node.code.setAttribute("x", labelX.toFixed(1));
      node.text.setAttribute("x", labelX.toFixed(1));
      for (var ti = 0; ti < node.text.children.length; ti++) {
        node.text.children[ti].setAttribute("x", labelX.toFixed(1));
      }
    });
  }

  function buildPillNav(container) {
    pillNavEl = container;
    pillHighlight = document.createElement("div");
    pillHighlight.className = "ion-pill-highlight";
    container.appendChild(pillHighlight);

    PILLS.forEach(function (pill, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ion-pill-item";
      btn.textContent = pill.label;
      btn.addEventListener("click", function () {
        setActive(i);
        restartTimer();
      });
      container.appendChild(btn);
      pillEls.push(btn);
    });
  }

  function moveHighlight(index) {
    var btn = pillEls[index];
    if (!btn || !pillHighlight) return;
    pillHighlight.style.opacity = "0";
    requestAnimationFrame(function () {
      pillHighlight.style.transform = "translateX(" + btn.offsetLeft + "px)";
      pillHighlight.style.width = btn.offsetWidth + "px";
      pillHighlight.style.opacity = "1";
    });
    // Su mobile la pill-nav scorre in orizzontale (vedi custom.css): quando
    // la pill attiva cambia (click o auto-advance) la portiamo in vista,
    // altrimenti l'utente non si accorge del cambio se è fuori schermo.
    // NB: qui scrolliamo SOLO pillNavEl (scrollLeft), mai btn.scrollIntoView()
    // — quello scrolla il primo antenato scrollabile che trova, che sulla
    // maggior parte dei layout è la pagina intera: causava un piccolo salto
    // di scroll verso l'alto ad ogni avanzamento automatico (ogni 5.2s),
    // non solo quando serviva davvero scorrere la nav in orizzontale.
    if (pillNavEl && pillNavEl.scrollWidth > pillNavEl.clientWidth) {
      var target = btn.offsetLeft - (pillNavEl.clientWidth - btn.offsetWidth) / 2;
      pillNavEl.scrollTo({ left: target, behavior: "smooth" });
    }
  }

  var captionFadeTimer = null;

  function applyCaption(pillIndex) {
    var pill = PILLS[pillIndex];
    var caption = pill.caption;
    var captionEl = document.querySelector(".home-live-caption");
    var tagEl = document.getElementById("ion-caption-tag");
    var indexEl = document.getElementById("ion-caption-index");
    var headlineEl = document.getElementById("ion-caption-headline");
    var dashEl = document.getElementById("ion-caption-dash");
    var bodyEl = document.getElementById("ion-caption-body");
    if (!tagEl || !caption) return;

    // Piccola animazione: dissolvenza in uscita, cambio testo mentre è
    // invisibile, dissolvenza in entrata — invece di uno scatto istantaneo
    // del contenuto. clearTimeout evita che due cambi ravvicinati (click
    // veloci) si sovrappongano e lascino il testo a metà dissolvenza.
    if (captionFadeTimer) clearTimeout(captionFadeTimer);

    function setText() {
      tagEl.textContent = pill.label;
      indexEl.textContent = ("0" + (pillIndex + 1)).slice(-2) + " / " + ("0" + PILLS.length).slice(-2);
      headlineEl.textContent = caption.headline;
      dashEl.textContent = caption.dash;
      bodyEl.textContent = caption.body;
    }

    if (!captionEl) {
      setText();
      return;
    }

    captionEl.style.opacity = "0";
    captionFadeTimer = setTimeout(function () {
      setText();
      captionEl.style.opacity = "1";
      captionFadeTimer = null;
    }, 220);
  }

  function setActive(index) {
    activeIndex = index;
    applyPill(activeIndex);
    applyCaption(activeIndex);
    applyMainImage(activeIndex);
    moveHighlight(index);
    pillEls.forEach(function (el, i) {
      el.classList.toggle("is-active", i === index);
    });
  }

  function restartTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      setActive((activeIndex + 1) % PILLS.length);
    }, AUTO_ADVANCE_MS);
  }

  // Il box del paragrafo deve restare alto uguale a prescindere da quale
  // delle 4 pill è attiva (altrimenti .home-live-content, che è
  // align-items:center, lo ricentra ogni volta che cambia altezza — vedi
  // commento su .home-live-caption in custom.css). Misuriamo l'altezza di
  // tutte e 4 le varianti al caricamento e fissiamo min-height sulla più
  // alta. Ricalcolato anche al resize, perché il wrap del testo cambia con
  // la larghezza disponibile.
  function measureMaxCaptionHeight() {
    var captionEl = document.querySelector(".home-live-caption");
    var tagEl = document.getElementById("ion-caption-tag");
    var indexEl = document.getElementById("ion-caption-index");
    var headlineEl = document.getElementById("ion-caption-headline");
    var dashEl = document.getElementById("ion-caption-dash");
    var bodyEl = document.getElementById("ion-caption-body");
    if (!captionEl || !tagEl) return;

    captionEl.style.minHeight = "0px";
    var max = 0;
    PILLS.forEach(function (pill, i) {
      tagEl.textContent = pill.label;
      indexEl.textContent = ("0" + (i + 1)).slice(-2) + " / " + ("0" + PILLS.length).slice(-2);
      headlineEl.textContent = pill.caption.headline;
      dashEl.textContent = pill.caption.dash;
      bodyEl.textContent = pill.caption.body;
      max = Math.max(max, captionEl.scrollHeight);
    });
    captionEl.style.minHeight = max + "px";
    // la misura lascia nel box il testo dell'ultima pill: ripristina quello
    // della pill attiva (succedeva al resize: tab e testo non coincidevano)
    var active = PILLS[activeIndex];
    tagEl.textContent = active.label;
    indexEl.textContent = ("0" + (activeIndex + 1)).slice(-2) + " / " + ("0" + PILLS.length).slice(-2);
    headlineEl.textContent = active.caption.headline;
    dashEl.textContent = active.caption.dash;
    bodyEl.textContent = active.caption.body;
  }

  function build() {
    var canvas = document.getElementById("ion-canvas");
    var pillNav = document.getElementById("ion-pill-nav");
    if (!canvas || !pillNav) return;

    buildMainCircle(canvas);
    buildCategoryNodes(canvas);
    buildPillNav(pillNav);
    measureMaxCaptionHeight();

    setTimeout(function () {
      pillNav.classList.add("is-visible");
      setActive(0);
      restartTimer();
    }, REVEAL_DELAY_MS);

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      moveHighlight(activeIndex);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measureMaxCaptionHeight, 150);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();

/* Lente d'ingrandimento sulla card "ION Culture and Heritage" (home): lo
   sfondo è il render "matrice" con centinaia di oggetti minuscoli disposti
   in colonne verticali (9000x5062px), troppo piccoli per essere letti alla
   dimensione normale della card. Al passaggio del mouse mostra una lente
   circolare che ingrandisce la porzione sotto il cursore.

   L'immagine è un background-image CSS (background-size: cover) su
   .home-matrice-div, non un <img>: ricalcoliamo a mano la stessa
   matematica del "cover" per allineare la lente a quello che si vede
   sotto il cursore. (Nota: nell'export Webflow esiste già uno script
   jQuery "imagezoomsl" mai completato — cerca "imagezoomsl" in
   index.html — ma punta a un .image-container inesistente ed è comunque
   pensato per un <img>, non per uno sfondo CSS: codice morto, non
   riutilizzabile qui.)

   Attiva solo su dispositivi con mouse reale (hover:hover + pointer:fine):
   su touch non avrebbe senso e mouseenter/mousemove sono inaffidabili.

   ATTENZIONE bug scoperto mentre implementavo questa feature: la card
   .home-matrice-div sta dentro .home-matrice-section, che nel CSS
   condiviso Webflow ha `z-index: -1` (probabile effetto di sovrapposizione
   voluto con la sezione sopra). Effetto collaterale reale nei browser:
   elementFromPoint su qualunque punto della sezione risolve a <body>
   invece che alla card — quindi mouseenter/mousemove/mouseleave (e anche
   :hover CSS) su .home-matrice-div o suoi figli NON scattano MAI, non è
   un problema del nostro script. Verificato con test mirato (Playwright:
   avvicinato a "auto" lo z-index della sola sezione risolveva subito il
   problema). Non abbiamo toccato quello z-index (rischio di rompere
   l'effetto visivo per cui è stato messo, e senza l'utente al PC non
   potevamo verificare a video) — bypassato ascoltando mousemove su
   `document` e calcolando a mano se il cursore è dentro il rettangolo
   della card, invece di appoggiarsi al normale hit-testing del DOM. */
(function () {
  // any-hover/any-pointer (non hover/pointer): sui portatili con schermo
  // touch il puntatore "principale" risulta touch anche se c'è un touchpad o
  // un mouse, e la lente non si attivava.
  if (!window.matchMedia || !window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches) return;

  var container = document.querySelector(".home-matrice-div");
  if (!container) return;

  // Risolto rispetto a custom.js (radice del sito), non alla pagina: così
  // funziona anche da en/index.html.
  var IMAGE_URL = new URL("cdn.prod.website-files.com/67af2a5a6dd95e39e5dac4c5/67d84c8baa9853c02db55e84_aad147660b67da1c35dbefce602466c3_MATR - Render matrice V0.jpeg", (document.currentScript && document.currentScript.src) || location.href).href;
  var IMAGE_W = 9000;
  var IMAGE_H = 5062;
  var ZOOM = 3.2;
  var LENS = 220;

  var lens = document.createElement("div");
  lens.className = "ion-matrice-lens";
  lens.style.width = LENS + "px";
  lens.style.height = LENS + "px";
  lens.style.backgroundImage = "url('" + IMAGE_URL + "')";
  document.body.appendChild(lens);

  var inside = false;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function update(e) {
    var rect = container.getBoundingClientRect();
    var isInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

    if (isInside !== inside) {
      inside = isInside;
      lens.style.opacity = inside ? "1" : "0";
      document.body.classList.toggle("ion-matrice-hover", inside);
    }
    if (!inside) return;

    // Stessa logica di "background-size: cover" + "background-position: 50%
    // 50%" della regola CSS: l'immagine scala in base al lato più
    // stringente per riempire il box, poi viene centrata sull'asse che
    // eccede (e quindi viene "tagliato").
    var containerRatio = rect.width / rect.height;
    var imageRatio = IMAGE_W / IMAGE_H;
    var coverScale = containerRatio > imageRatio ? rect.width / IMAGE_W : rect.height / IMAGE_H;
    var renderedW = IMAGE_W * coverScale;
    var renderedH = IMAGE_H * coverScale;
    var offsetX = (rect.width - renderedW) / 2;
    var offsetY = (rect.height - renderedH) / 2;

    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    var bgW = renderedW * ZOOM;
    var bgH = renderedH * ZOOM;
    var bgX = clamp(-((x - offsetX) * ZOOM) + LENS / 2, -(bgW - LENS), 0);
    var bgY = clamp(-((y - offsetY) * ZOOM) + LENS / 2, -(bgH - LENS), 0);

    lens.style.left = e.clientX + "px";
    lens.style.top = e.clientY + "px";
    lens.style.backgroundSize = bgW + "px " + bgH + "px";
    lens.style.backgroundPosition = bgX + "px " + bgY + "px";
  }

  document.addEventListener("mousemove", update);
})();

/* Card "ION Culture and Heritage" su touch: lo sfondo (render "matrice"
   9000x5062, background-size: cover) su telefono è molto più largo dello
   schermo e se ne vede solo la fascia centrale. Trascinando in orizzontale
   con un dito l'immagine scorre di lato (fino ai suoi bordi, con un po' di
   inerzia al rilascio); in verticale non succede niente di speciale: la
   pagina scorre come sempre, perché l'immagine è già alta al 100%.

   Come per la lente sopra, la card non riceve eventi (z-index: -1 sulla
   sezione nel CSS Webflow): ascoltiamo i tocchi su document e controlliamo
   a mano se partono dentro il rettangolo della card. */
(function () {
  var container = document.querySelector(".home-matrice-div");
  if (!container || !("ontouchstart" in window)) return;

  var IMAGE_W = 9000;
  var IMAGE_H = 5062;
  var LOCK = 8;         // px prima di decidere se il gesto è orizzontale o verticale
  var FRICTION = 0.94;  // inerzia al rilascio (per frame)

  var offset = null;    // background-position-x in px (null = centrata, come da CSS)
  var start = null, mode = null, lastX = 0, lastT = 0, velocity = 0, raf = 0;

  function limits() {
    var rect = container.getBoundingClientRect();
    var scale = Math.max(rect.width / IMAGE_W, rect.height / IMAGE_H);
    return { min: Math.min(0, rect.width - IMAGE_W * scale), rect: rect };
  }

  function apply(x) {
    var min = limits().min;
    offset = Math.min(0, Math.max(min, x));
    container.style.backgroundPosition = offset + "px 50%";
    return offset;
  }

  function current() {
    return offset === null ? limits().min / 2 : offset;
  }

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { start = null; return; }
    var t = e.touches[0], r = container.getBoundingClientRect();
    if (t.clientX < r.left || t.clientX > r.right || t.clientY < r.top || t.clientY > r.bottom) { start = null; return; }
    cancelAnimationFrame(raf);
    start = { x: t.clientX, y: t.clientY, offset: current() };
    mode = null; lastX = t.clientX; lastT = e.timeStamp; velocity = 0;
  }, { passive: true });

  document.addEventListener("touchmove", function (e) {
    if (!start || e.touches.length !== 1) return;
    var t = e.touches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (!mode) {
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
      mode = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (mode !== "x") return;
    e.preventDefault(); // gesto orizzontale sulla card: niente scroll della pagina
    apply(start.offset + dx);
    var dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (t.clientX - lastX) / dt * 16; // px per frame
    lastX = t.clientX; lastT = e.timeStamp;
  }, { passive: false });

  function end() {
    if (mode === "x" && Math.abs(velocity) > 0.5) {
      (function glide() {
        velocity *= FRICTION;
        var before = offset;
        if (apply(offset + velocity) === before || Math.abs(velocity) < 0.3) return;
        raf = requestAnimationFrame(glide);
      })();
    }
    start = null; mode = null;
  }
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);

  // Al cambio di orientamento/dimensione la posizione resta nei limiti.
  window.addEventListener("resize", function () { if (offset !== null) apply(offset); });
})();
