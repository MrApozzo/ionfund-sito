/*
 * Mappa cabine TIM Milano — ION Fund
 * ------------------------------------------------------------------
 * Dati:  file Excel su Google Drive (una riga per cabina)
 * Foto:  una sottocartella per cabina dentro la cartella TIM_FOTOGRAFIE
 * PDF:   cartella TIM_DOSSIER
 * Mappa: Google Maps JavaScript API (progetto Google Cloud "ION Fund Mappe")
 *
 * La pagina carica Google Maps con callback=initMap: tutto parte da lì.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------- CONFIG
  var CONFIG = {
    apiKey: "AIzaSyA-3GdcIXAiUPELD68-RLT2ZknnswkT9o8", // chiave limitata a ionfund.eu
    mapId: "5d81fee060d81de58a30585a", // stile "Cabine TIM - grigio e azzurro"
    xlsxFileId: "1DQRcVE7Yx4U7tlEtUL7A3XUHseq7AXvB", // Output rilievi cabine milano ION.xlsx
    fotoFolderId: "1b_vTZ2qpjAiX_bLt6eAV4SRiWE2X5q0E", // TIM_FOTOGRAFIE
    dossierFolderId: "1ba_liuh7y4esgu-q4A-v3FhcMfjzhmEX", // TIM_DOSSIER
    center: { lat: 45.4636707, lng: 9.1881263 },
    zoom: 13
  };

  // Stato di avanzamento: ordine = priorità crescente (vince l'ultimo che si applica)
  var STATI = {
    assente: { label: "ASSENTE", pin: "img/pin-gray.png" },
    non_rilevato: { label: "NON RILEVATO", pin: "img/pin-red.png" },
    rilevato: { label: "RILEVATO", pin: "img/pin-orange.png" },
    pdf_stato_fatto: { label: "DOSSIER STATO DI FATTO", pin: "img/pin-yellow.png" },
    pdf_stato_progetto: { label: "DOSSIER STATO DI PROGETTO", pin: "img/pin-purple.png" }
  };
  var PIN_SPOSTAMENTO = {
    non_processata: "img/pin_non_processata.png",
    fissa: "img/pin_fissa.png",
    spostata: "img/pin_spostata.png",
    delocalizzata: "img/pin_delocalizzata.png"
  };

  // ----------------------------------------------------------------- STATO
  var map = null;
  var infoWindow = null;
  var rows = []; // righe Excel normalizzate
  var markers = []; // { marker, img, cabina }
  var fotoFiles = []; // { id, name }
  var pdfFiles = []; // { id, name }
  var posizioniSelezionate = false; // false = "Iniziali", true = "Selezionate"
  var vistaPin = "avanzamento"; // icone per stato ("avanzamento") o per spostamento ("spostamento")
  var filtroAttivo = null; // { campo, valore } oppure null
  var searchMarker = null;
  var extraMarker = null; // marker della posizione alternativa aperto da un popup
  var mostraPercentuali = false;

  // --------------------------------------------------------------- UTILITY
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function txt(v) {
    return String(v == null ? "" : v).trim();
  }
  function up(v) {
    return txt(v).toUpperCase();
  }
  function num(v) {
    var n = parseFloat(String(v).replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function escRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function driveFileUrl(id) {
    return "https://drive.google.com/file/d/" + id;
  }
  function driveThumb(id, w) {
    return "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + w;
  }

  // Codice usato nei nomi di foto e PDF: "1, C. GENOVA" -> "1_C_GENOVA"
  function codiceDaIndirizzo(indirizzo) {
    return txt(indirizzo)
      .replace(/ /g, "_")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/'/g, "_")
      .replace(/’/g, "_");
  }

  // I file si chiamano ad es. "G07_2-1_C_GENOVA_A-FOTO_001.jpg": il codice deve
  // essere preceduto da "-" o "_" e seguito da "_" o "-", così "1_V_NOVARA" non
  // coincide con "101_V_NOVARA".
  function fileDellaCabina(files, codice) {
    if (!codice) return [];
    var re = new RegExp("(^|[-_ ])" + escRegExp(codice) + "([-_ .]|$)", "i");
    return files.filter(function (f) {
      return re.test(f.name.trim());
    });
  }

  // ----------------------------------------------------------- GOOGLE DRIVE
  function driveList(query, fields) {
    var out = [];
    function page(token) {
      var url =
        "https://www.googleapis.com/drive/v3/files?pageSize=1000" +
        "&q=" + encodeURIComponent(query) +
        "&fields=" + encodeURIComponent("nextPageToken,files(" + (fields || "id,name") + ")") +
        "&key=" + CONFIG.apiKey +
        (token ? "&pageToken=" + encodeURIComponent(token) : "");
      return fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error("Google Drive " + r.status);
          return r.json();
        })
        .then(function (j) {
          out = out.concat(j.files || []);
          return j.nextPageToken ? page(j.nextPageToken) : out;
        });
    }
    return page(null);
  }

  // Foto: prima le sottocartelle, poi i file di tutte le sottocartelle (a gruppi, non 1 richiesta per cartella)
  function caricaFoto() {
    return driveList("'" + CONFIG.fotoFolderId + "' in parents and trashed = false", "id,name,mimeType").then(function (items) {
      var cartelle = items.filter(function (f) {
        return f.mimeType === "application/vnd.google-apps.folder";
      });
      var sfuse = items.filter(function (f) {
        return /^image\//.test(f.mimeType || "");
      });
      var gruppi = [];
      for (var i = 0; i < cartelle.length; i += 40) gruppi.push(cartelle.slice(i, i + 40));
      return Promise.all(
        gruppi.map(function (g) {
          var q =
            "(" + g.map(function (c) { return "'" + c.id + "' in parents"; }).join(" or ") + ")" +
            " and trashed = false and mimeType contains 'image/'";
          return driveList(q, "id,name");
        })
      ).then(function (liste) {
        return sfuse.concat.apply(sfuse, liste);
      });
    });
  }

  function caricaDossier() {
    return driveList("'" + CONFIG.dossierFolderId + "' in parents and trashed = false", "id,name");
  }

  function caricaExcel() {
    var url = "https://www.googleapis.com/drive/v3/files/" + CONFIG.xlsxFileId + "?alt=media&key=" + CONFIG.apiKey;
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("File Excel non raggiungibile (" + r.status + ")");
        return r.arrayBuffer();
      })
      .then(function (buf) {
        var wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: "" });
      });
  }

  // I dati partono subito, in parallelo al caricamento di Google Maps
  var datiPromise = caricaExcel();
  var fotoPromise = caricaFoto()
    .then(function (f) { fotoFiles = f; })
    .catch(function (e) { console.error("Foto non caricate:", e); });
  var dossierPromise = caricaDossier()
    .then(function (f) { pdfFiles = f; })
    .catch(function (e) { console.error("Dossier non caricati:", e); });

  // ------------------------------------------------------ NORMALIZZAZIONE
  function normalizza(r, i) {
    var stato = "assente";
    if (up(r.Rilievo) === "NON RILEVATO") stato = "non_rilevato";
    if (up(r.Rilievo) === "RILEVATO") stato = "rilevato";
    if (up(r["Dossier stato di fatto"]) === "FATTO") stato = "pdf_stato_fatto";
    if (up(r["Dossier stato di progetto"]) === "FATTO") stato = "pdf_stato_progetto";

    var spostamento = "non_processata";
    if (txt(r["0-10 METRI"])) spostamento = "fissa";
    if (txt(r["10-50 METRI"])) spostamento = "spostata";
    if (txt(r.DELOCALIZZATA)) spostamento = "delocalizzata";

    var nuovaLatTxt = txt(r["Nuova Latitudine"]);
    var nuovaLngTxt = txt(r["Nuova Longitudine"]);

    return {
      id: "cab-" + i,
      raw: r,
      indirizzo: txt(r.Indirizzo),
      codice: codiceDaIndirizzo(r.Indirizzo),
      dataRilievo: txt(r["Data rilievo"]),
      note: txt(r.Note) || "Nessuna nota inserita",
      struttura: up(r.Struttura),
      tipologia: up(r.TIPOLOGIA),
      stato: stato,
      spostamento: spostamento,
      invio1: txt(r["INVIO 1"]) !== "",
      progetto: txt(r["INDIRIZZO STATO DI PROGETTO"]) !== "",
      orig: { lat: num(r.Latitudine), lng: num(r.Longitudine), latTxt: txt(r.Latitudine), lngTxt: txt(r.Longitudine) },
      nuova: {
        vuota: nuovaLatTxt === "" && nuovaLngTxt === "",
        indefinita: up(nuovaLatTxt) === "INDEFINITA" && up(nuovaLngTxt) === "INDEFINITA",
        lat: num(nuovaLatTxt),
        lng: num(nuovaLngTxt),
        latTxt: nuovaLatTxt,
        lngTxt: nuovaLngTxt
      }
    };
  }

  function haCoordinate(p) {
    return p && p.lat !== null && p.lng !== null;
  }
  function stessaPosizione(c) {
    return c.nuova.latTxt === c.orig.latTxt && c.nuova.lngTxt === c.orig.lngTxt;
  }

  // Dove va il pin, cosa mostra il popup e quale posizione alternativa si può visualizzare
  function posizionamento(c) {
    var blocco = function (titolo, lat, lng, attivo, bottone) {
      return (
        '<div class="pos' + (attivo ? " active" : "") + '"><h4>' + titolo + "</h4>" +
        "Latitudine: " + esc(lat) + "<br>Longitudine: " + esc(lng) +
        (bottone ? '<button type="button" class="show_marker">' + bottone + "</button>" : "") +
        "</div>"
      );
    };
    if (!posizioniSelezionate) {
      if (!haCoordinate(c.orig)) return null;
      var ris = { pos: c.orig, alt: null, html: blocco("ORIGINALE:", c.orig.latTxt, c.orig.lngTxt, true) };
      if (!c.nuova.vuota && !stessaPosizione(c)) {
        if (c.nuova.indefinita) {
          ris.html += blocco("DELOCALIZZATA:", "INDEFINITA", "INDEFINITA", false);
        } else if (haCoordinate(c.nuova)) {
          ris.alt = c.nuova;
          ris.html += blocco("DELOCALIZZATA:", c.nuova.latTxt, c.nuova.lngTxt, false, "Visualizza delocalizzata");
        }
      }
      return ris;
    }
    // Posizioni selezionate: solo cabine con una posizione di progetto
    if (c.nuova.vuota) return null;
    if (stessaPosizione(c)) {
      return haCoordinate(c.orig) ? { pos: c.orig, alt: null, html: blocco("ORIGINALE:", c.orig.latTxt, c.orig.lngTxt, true) } : null;
    }
    if (c.nuova.indefinita) {
      return haCoordinate(c.orig)
        ? { pos: c.orig, alt: null, indefinita: true,
            html: blocco("DELOCALIZZATA:", "INDEFINITA", "INDEFINITA", true) + blocco("ORIGINALE:", c.orig.latTxt, c.orig.lngTxt, false) }
        : null;
    }
    if (!haCoordinate(c.nuova)) return null;
    return {
      pos: c.nuova,
      alt: haCoordinate(c.orig) ? c.orig : null,
      html:
        blocco("DELOCALIZZATA:", c.nuova.latTxt, c.nuova.lngTxt, true) +
        blocco("ORIGINALE:", c.orig.latTxt, c.orig.lngTxt, false, haCoordinate(c.orig) ? "Visualizza originale" : null)
    };
  }

  function classeStruttura(c) {
    if (posizioniSelezionate) {
      if (c.tipologia === "SLIM") return { cls: "struttura slim", label: "SLIM" };
      if (c.tipologia === "PLUS") return { cls: "struttura plus", label: "PLUS" };
      return { cls: "struttura", label: c.tipologia || c.struttura };
    }
    if (c.struttura === "CUPOLA") return { cls: "struttura cupola", label: "CUPOLA" };
    if (c.struttura === "CABINA") return { cls: "struttura cabina", label: "CABINA" };
    return { cls: "struttura", label: c.struttura };
  }

  // ----------------------------------------------------------------- MAPPA
  window.initMap = function () {
    var piccolo = window.matchMedia("(max-width: 700px)").matches;
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: CONFIG.zoom,
      center: CONFIG.center,
      mapId: CONFIG.mapId,
      clickableIcons: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: piccolo ? google.maps.MapTypeControlStyle.DROPDOWN_MENU : google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_LEFT
      },
      streetViewControl: true,
      fullscreenControl: true
    });
    infoWindow = new google.maps.InfoWindow({ maxWidth: Math.min(640, window.innerWidth - 40) });
    infoWindow.addListener("closeclick", rimuoviExtraMarker);
    map.addListener("click", function () {
      infoWindow.close();
      rimuoviExtraMarker();
    });

    initRicerca();

    datiPromise
      .then(function (dati) {
        rows = dati.map(normalizza);
        disegnaMarker();
        aggiornaContatori();
        disegnaTabella();
        $("#map").removeClass("loading");
      })
      .catch(function (e) {
        console.error(e);
        $("#map_status").text("Impossibile caricare i dati delle cabine. Riprova più tardi.").addClass("errore").show();
      });
  };

  function initRicerca() {
    var box = document.createElement("div");
    box.id = "search-box-container";
    var ac = new google.maps.places.PlaceAutocompleteElement({ includedRegionCodes: ["it"] });
    ac.id = "search-box";
    ac.setAttribute("placeholder", "Cerca un indirizzo...");
    var rimuovi = document.createElement("button");
    rimuovi.type = "button";
    rimuovi.id = "remove-marker-button";
    rimuovi.textContent = "Rimuovi marker";
    rimuovi.hidden = true;
    box.appendChild(ac);
    box.appendChild(rimuovi);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(box);

    function togli() {
      if (searchMarker) searchMarker.map = null;
      searchMarker = null;
      rimuovi.hidden = true;
    }
    rimuovi.addEventListener("click", togli);
    map.addListener("bounds_changed", function () {
      ac.locationBias = map.getBounds();
    });

    function vaiA(place) {
      if (!place) return;
      place
        .fetchFields({ fields: ["displayName", "formattedAddress", "location", "viewport"] })
        .then(function () {
          if (!place.location) return;
          togli();
          searchMarker = new google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: place.location,
            title: place.formattedAddress || place.displayName || ""
          });
          rimuovi.hidden = false;
          if (place.viewport) map.fitBounds(place.viewport);
          else {
            map.setCenter(place.location);
            map.setZoom(17);
          }
        })
        .catch(function (e) {
          console.error("Ricerca indirizzo non riuscita:", e);
        });
    }
    ac.addEventListener("gmp-select", function (e) {
      if (e.placePrediction) vaiA(e.placePrediction.toPlace());
    });
    ac.addEventListener("gmp-placeselect", function (e) {
      vaiA(e.place); // versioni precedenti dell'API
    });
  }

  function iconaPin(c) {
    return vistaPin === "spostamento" ? PIN_SPOSTAMENTO[c.spostamento] : STATI[c.stato].pin;
  }

  function disegnaMarker() {
    markers.forEach(function (m) { m.marker.map = null; });
    markers = [];
    infoWindow.close();
    rimuoviExtraMarker();

    rows.forEach(function (c) {
      var p = posizionamento(c);
      if (!p) return;
      var img = document.createElement("img");
      img.src = iconaPin(c);
      img.alt = "";
      img.className = "pin " + c.stato + " " + c.spostamento;
      var marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.pos.lat, lng: p.pos.lng },
        content: img,
        title: c.indirizzo,
        gmpClickable: true
      });
      var voce = { marker: marker, img: img, cabina: c, posiz: p };
      marker.addEventListener("gmp-click", function () {
        apriPopup(voce);
      });
      markers.push(voce);
    });
    applicaFiltro();
  }

  function visibile(c) {
    if (!filtroAttivo) return true;
    if (filtroAttivo.campo === "invio1") return c.invio1;
    return c[filtroAttivo.campo] === filtroAttivo.valore;
  }

  function applicaFiltro() {
    markers.forEach(function (m) {
      m.img.src = iconaPin(m.cabina);
      m.marker.map = visibile(m.cabina) ? map : null;
    });
    if (infoWindow) infoWindow.close();
    rimuoviExtraMarker();
  }

  // ----------------------------------------------------------------- POPUP
  function rimuoviExtraMarker() {
    if (extraMarker) extraMarker.map = null;
    extraMarker = null;
  }

  function apriPopup(voce) {
    var c = voce.cabina;
    var p = voce.posiz;
    var s = classeStruttura(c);
    var tabsId = c.id + "-tabs";
    rimuoviExtraMarker();

    var html =
      '<div class="info ' + c.stato + '">' +
      '<div class="info_head"><div>' +
      "<h2>" + esc(c.indirizzo) + "</h2>" +
      '<span class="data_rilievo">Data rilievo: <strong>' + esc(c.dataRilievo || "—") + "</strong></span>" +
      "</div>" +
      (s.label ? '<p class="' + s.cls + '">' + esc(s.label) + "</p>" : "") +
      "</div>" +
      "<h3>Posizione:</h3>" +
      '<div class="posizione">' + p.html + "</div>" +
      '<div id="' + tabsId + '" class="tabs"><ul>' +
      '<li><a href="#' + c.id + '-dossier">Dossier PDF</a></li>' +
      '<li><a href="#' + c.id + '-foto">Foto rilievo</a></li>' +
      '<li><a href="#' + c.id + '-note">Note</a></li></ul>' +
      '<div id="' + c.id + '-dossier" class="pdf_dossier"></div>' +
      '<div id="' + c.id + '-foto" class="foto_rilievo"></div>' +
      '<div id="' + c.id + '-note" class="note"><p>' + esc(c.note) + "</p></div>" +
      "</div>" +
      '<div class="stato"><h3>Stato di avanzamento</h3><p>' + STATI[c.stato].label + "</p>" +
      '<div class="stato_bar"><span></span><span></span><span></span><span></span><span></span></div></div>' +
      "</div>";

    var nodo = document.createElement("div");
    nodo.innerHTML = html;
    var info = nodo.firstElementChild;

    // Dossier PDF
    var $dossier = $(info).find(".pdf_dossier");
    var pdf = fileDellaCabina(pdfFiles, c.codice);
    if (!pdf.length) $dossier.html("<p>Nessun PDF caricato</p>");
    pdf.forEach(function (f) {
      var $c = $('<div class="cont_pdf"></div>');
      $c.append($('<iframe loading="lazy" title="Anteprima dossier"></iframe>').attr("src", driveFileUrl(f.id) + "/preview"));
      var $azioni = $('<div class="azioni_pdf"></div>');
      $azioni.append($('<button type="button" class="view_stato_fatto">Visualizza dossier</button>').on("click", function () {
        apriPdf(f);
      }));
      $azioni.append($('<a class="apri_drive" target="_blank" rel="noopener">Apri in Drive</a>').attr("href", driveFileUrl(f.id) + "/view"));
      $c.append($azioni);
      $dossier.append($c);
    });

    // Foto: miniature leggere, ingrandimento con lightbox
    var $foto = $(info).find(".foto_rilievo");
    var foto = fileDellaCabina(fotoFiles, c.codice).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    if (!foto.length) $foto.html("<p>Nessuna foto caricata</p>");
    foto.forEach(function (f) {
      $foto.append(
        $('<a class="cont_foto"></a>')
          .attr({ href: driveThumb(f.id, 1600), "data-lightbox": c.id, "data-title": f.name })
          .append($('<img loading="lazy">').attr({ src: driveThumb(f.id, 300), alt: f.name }))
      );
    });

    $(info).find(".tabs").tabs({ active: 0 });

    // Contenuto completo prima di aprire, così il popup si dimensiona correttamente
    infoWindow.setContent(info);
    infoWindow.open({ map: map, anchor: voce.marker });

    // Mostra la posizione alternativa (delocalizzata o originale)
    $(info).find(".show_marker").on("click", function () {
      if (!p.alt) return;
      if (!extraMarker) {
        var img = document.createElement("img");
        img.src = voce.img.src;
        img.alt = "";
        img.className = voce.img.className + " new_marker";
        extraMarker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: p.alt.lat, lng: p.alt.lng },
          content: img,
          title: "Posizione alternativa"
        });
      }
      extraMarker.map = map;
      var b = new google.maps.LatLngBounds();
      b.extend({ lat: p.alt.lat, lng: p.alt.lng });
      b.extend({ lat: p.pos.lat, lng: p.pos.lng });
      map.fitBounds(b, 120);
    });
  }

  function apriPdf(f) {
    var $v = $("#pdf_viewer");
    $v.find("iframe").attr("src", driveFileUrl(f.id) + "/preview");
    $v.find(".pdf_titolo").text(f.name);
    $v.find(".apri_drive").attr("href", driveFileUrl(f.id) + "/view");
    $v.prop("hidden", false);
    $("body").addClass("no-scroll");
  }
  function chiudiPdf() {
    var $v = $("#pdf_viewer");
    $v.prop("hidden", true);
    $v.find("iframe").attr("src", "about:blank");
    $("body").removeClass("no-scroll");
  }

  // ------------------------------------------------------------- CONTATORI
  function aggiornaContatori() {
    var base = posizioniSelezionate
      ? rows.filter(function (c) { return c.progetto; })
      : rows;
    var rilievo = function (c) { return up(c.raw.Rilievo); };
    var fatto = function (c) { return up(c.raw["Dossier stato di fatto"]) === "FATTO"; };
    var progetto = function (c) { return up(c.raw["Dossier stato di progetto"]) === "FATTO"; };
    var vuoto = function (c, k) { return txt(c.raw[k]) === ""; };

    var gruppi = {
      assente: base.filter(function (c) {
        return rilievo(c) === "ASSENTE" && vuoto(c, "Dossier stato di fatto") && vuoto(c, "Dossier stato di progetto");
      }).length,
      non_rilevato: base.filter(function (c) { return rilievo(c) === "NON RILEVATO"; }).length,
      rilevato: base.filter(function (c) {
        return rilievo(c) === "RILEVATO" && vuoto(c, "Dossier stato di fatto") && vuoto(c, "Dossier stato di progetto");
      }).length,
      stato_fatto: base.filter(function (c) {
        return (rilievo(c) === "RILEVATO" || rilievo(c) === "ASSENTE") && fatto(c) && !progetto(c);
      }).length,
      stato_progetto: base.filter(function (c) {
        return (rilievo(c) === "RILEVATO" || rilievo(c) === "ASSENTE") && progetto(c);
      }).length
    };
    var n = base.length || 1;
    var totale = 0;
    Object.keys(gruppi).forEach(function (k) {
      totale += gruppi[k];
      var perc = (gruppi[k] / n) * 100;
      var $el = $("#count-" + k);
      $el.css("width", perc + "%")
        .attr("title", STATI[k === "stato_fatto" ? "pdf_stato_fatto" : k === "stato_progetto" ? "pdf_stato_progetto" : k].label + ": " + gruppi[k] + " (" + perc.toFixed(1) + "%)")
        .html("<p>" + (mostraPercentuali ? perc.toFixed(1) + "%" : gruppi[k]) + "</p>")
        .toggleClass("stretto", perc < 6);
    });
    $("#count_tot").html("Totali: <span>" + totale + "</span>");
  }

  // --------------------------------------------------------------- TABELLA
  function disegnaTabella() {
    var base = posizioniSelezionate ? rows.filter(function (c) { return c.progetto; }) : rows;
    if (!base.length) return;
    var colonne = Object.keys(base[0].raw).filter(function (k) { return k.indexOf("__EMPTY") !== 0; });
    var $t = $('<table class="tabella cabine"></table>');
    var $h = $("<tr></tr>");
    colonne.forEach(function (k) { $h.append($("<th></th>").text(k)); });
    $t.append($("<thead></thead>").append($h));
    var $b = $("<tbody></tbody>");
    base.forEach(function (c) {
      var $r = $("<tr></tr>");
      colonne.forEach(function (k) { $r.append($("<td></td>").text(c.raw[k])); });
      $b.append($r);
    });
    $t.append($b);
    $("#table-scroll").empty().append($t);
  }

  // ------------------------------------------------------- INTERFACCIA
  $(function () {
    $("#map").addClass("loading");

    // Menu a fisarmonica dei filtri
    $("#filtra_marker")
      .on("click", "h2", function () {
        $(this).parent().toggleClass("open");
        $(this).attr("aria-expanded", $(this).parent().hasClass("open"));
      })
      .on("keydown", "h2", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          $(this).trigger("click");
        }
      });

    // Filtro avanzamento
    $("#filtra_avanzamento").on("click", "[data-stato]", function () {
      var v = $(this).data("stato");
      vistaPin = "avanzamento";
      filtroAttivo = v === "tutti" ? null : { campo: "stato", valore: v };
      $("#filtra_marker .filtro").removeClass("active");
      $(this).addClass("active");
      applicaFiltro();
    });
    // Filtro spostamento (cambia anche le icone)
    $("#filtra_spostamento").on("click", "[data-spostamento]", function () {
      var v = $(this).data("spostamento");
      vistaPin = "spostamento";
      filtroAttivo = v === "tutti" ? null : { campo: "spostamento", valore: v };
      $("#filtra_marker .filtro").removeClass("active");
      $(this).addClass("active");
      applicaFiltro();
    });
    // Filtro tranche invio
    $("#filtra_tranche_invio").on("click", "[data-invio]", function () {
      var v = $(this).data("invio");
      filtroAttivo = v === "tutti" ? null : { campo: "invio1" };
      $("#filtra_marker .filtro").removeClass("active");
      $(this).addClass("active");
      applicaFiltro();
    });

    // Numeri / percentuali
    $("#choose_count").on("click", "button", function () {
      mostraPercentuali = this.id === "count-perc";
      $("#choose_count button").removeClass("active").attr("aria-pressed", "false");
      $(this).addClass("active").attr("aria-pressed", "true");
      if (rows.length) aggiornaContatori();
    });

    // Posizioni iniziali / selezionate
    $("#show_deloc").on("click", "button", function () {
      var sel = $(this).data("posizioni") === "selezionate";
      if (sel === posizioniSelezionate) return;
      posizioniSelezionate = sel;
      $("#show_deloc button").removeClass("active").attr("aria-pressed", "false");
      $(this).addClass("active").attr("aria-pressed", "true");
      filtroAttivo = null;
      vistaPin = "avanzamento";
      $("#filtra_marker .filtro").removeClass("active");
      $('#filtra_marker [data-stato="tutti"]').addClass("active");
      if (map && rows.length) {
        disegnaMarker();
        aggiornaContatori();
        disegnaTabella();
      }
    });

    // Tabella riassuntiva
    $("#show_table").on("click", function () {
      chiudiMenu();
      document.getElementById("table-container").scrollIntoView({ behavior: "smooth" });
    });

    // Visualizzatore PDF a schermo intero
    $("#pdf_viewer").on("click", ".close_pdf", chiudiPdf);
    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && !$("#pdf_viewer").prop("hidden")) chiudiPdf();
    });

    // Menu laterale su tablet e telefono
    function chiudiMenu() {
      $("body").removeClass("menu-aperto");
      $("#toggle_menu").attr("aria-expanded", "false");
    }
    $("#toggle_menu").on("click", function () {
      var aperto = $("body").toggleClass("menu-aperto").hasClass("menu-aperto");
      $(this).attr("aria-expanded", aperto);
    });
    $("#chiudi_menu, #menu_backdrop").on("click", chiudiMenu);
    $("#filtra_marker").on("click", ".filtro", function () {
      if (window.matchMedia("(max-width: 1024px)").matches) chiudiMenu();
    });

    if (window.lightbox) lightbox.option({ albumLabel: "Foto %1 di %2", wrapAround: true });
  });
})();
