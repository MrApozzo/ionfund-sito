/*
 * Adattatore Google Maps -> Leaflet + OpenStreetMap
 * ------------------------------------------------------------
 * La mappa originale usa Google Maps JavaScript API, che dal 2025 non si
 * carica più perché il progetto Google Cloud non ha la fatturazione attiva
 * (BillingNotEnabledMapError).
 *
 * Questo file imita le poche parti di "google.maps" usate da
 * mappa_google-ionfund-min.js (Map, LatLng, LatLngBounds,
 * marker.AdvancedMarkerElement, InfoWindow, event, places.SearchBox,
 * ControlPosition) sopra Leaflet, così lo script originale funziona senza
 * modifiche. La chiave Google resta usata solo per leggere i dati da Google
 * Drive, che non richiede fatturazione.
 *
 * Per tornare a Google Maps: riattivare la fatturazione sul progetto Google
 * Cloud, rimettere lo <script> di maps.googleapis.com nell'HTML e togliere
 * Leaflet e questo file.
 */
(function () {
  if (typeof L === "undefined") {
    console.error("Leaflet non caricato: la mappa non può essere disegnata.");
    return;
  }

  var currentLeafletMap = null;

  function toLatLng(pos) {
    if (!pos) return null;
    if (pos instanceof LatLng) return pos;
    if (typeof pos.lat === "function") return new LatLng(pos.lat(), pos.lng());
    return new LatLng(pos.lat, pos.lng);
  }

  function LatLng(lat, lng) {
    this._lat = parseFloat(String(lat).replace(",", "."));
    this._lng = parseFloat(String(lng).replace(",", "."));
  }
  LatLng.prototype.lat = function () { return this._lat; };
  LatLng.prototype.lng = function () { return this._lng; };
  LatLng.prototype.toLeaflet = function () { return L.latLng(this._lat, this._lng); };
  LatLng.prototype.isValid = function () { return isFinite(this._lat) && isFinite(this._lng); };

  function LatLngBounds(sw, ne) {
    this._b = L.latLngBounds([]);
    if (sw) this.extend(sw);
    if (ne) this.extend(ne);
  }
  LatLngBounds.prototype.extend = function (p) {
    var ll = toLatLng(p);
    if (ll && ll.isValid()) this._b.extend(ll.toLeaflet());
    return this;
  };
  LatLngBounds.prototype.toLeaflet = function () { return this._b; };

  // Gestione eventi minimale, con la stessa forma di google.maps.event
  function addEvt(obj, name, fn) {
    obj.__listeners = obj.__listeners || {};
    (obj.__listeners[name] = obj.__listeners[name] || []).push(fn);
    return { remove: function () {
      var a = obj.__listeners[name]; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    } };
  }
  function fireEvt(obj, name, arg) {
    var a = (obj.__listeners && obj.__listeners[name]) || [];
    a.slice().forEach(function (fn) { fn.call(obj, arg); });
  }

  var ControlPosition = { TOP_LEFT: "topleft", TOP: "topleft", TOP_RIGHT: "topright", LEFT_TOP: "topleft" };

  function Map(div, opts) {
    var self = this;
    opts = opts || {};
    // initMap() viene richiamata quando si passa da posizioni "Iniziali" a "Selezionate":
    // Google sostituiva la mappa, qui rimuoviamo quella precedente.
    if (currentLeafletMap) { currentLeafletMap.remove(); currentLeafletMap = null; }
    div.innerHTML = "";
    var c = toLatLng(opts.center) || new LatLng(45.4642, 9.19);
    this._map = L.map(div, {
      center: c.toLeaflet(),
      zoom: opts.zoom || 13,
      scrollWheelZoom: opts.scrollwheel !== false,
      zoomControl: true
    });
    currentLeafletMap = this._map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: "abc",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(this._map);

    // Simula map.controls[ControlPosition.X].push(element)
    this.controls = {};
    Object.keys(ControlPosition).forEach(function (k) {
      var pos = ControlPosition[k];
      if (self.controls[pos]) return;
      self.controls[pos] = { push: function (el) {
        var Ctl = L.Control.extend({ onAdd: function () {
          L.DomEvent.disableClickPropagation(el);
          L.DomEvent.disableScrollPropagation(el);
          return el;
        } });
        new Ctl({ position: pos }).addTo(self._map);
      } };
    });

    this._map.on("moveend zoomend", function () { fireEvt(self, "bounds_changed"); });
  }
  Map.prototype.addListener = function (name, fn) { return addEvt(this, name, fn); };
  Map.prototype.getBounds = function () {
    var b = this._map.getBounds(); var r = new LatLngBounds(); r._b = b; return r;
  };
  Map.prototype.fitBounds = function (b) {
    var lb = b instanceof LatLngBounds ? b.toLeaflet() : b;
    if (lb && lb.isValid && lb.isValid()) this._map.fitBounds(lb, { padding: [40, 40], maxZoom: 18 });
  };
  Map.prototype.setCenter = function (p) { this._map.panTo(toLatLng(p).toLeaflet()); };
  Map.prototype.setZoom = function (z) { this._map.setZoom(z); };
  Map.prototype.getZoom = function () { return this._map.getZoom(); };

  // Marker: il contenuto è l'<img> del pin creato dallo script originale (30x30, punta in basso al centro)
  function AdvancedMarkerElement(opts) {
    var self = this;
    opts = opts || {};
    this.position = toLatLng(opts.position);
    this.title = opts.title || "";
    this.content = opts.content || null;
    var icon;
    if (this.content) {
      this.content.style.display = "block";
      icon = L.divIcon({ html: this.content, className: "gm-shim-pin", iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
    } else {
      icon = L.divIcon({ html: '<img src="img/small_pin_icon.png" alt="">', className: "gm-shim-pin gm-shim-search", iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
    }
    this._valid = this.position && this.position.isValid();
    this._lm = L.marker(this._valid ? this.position.toLeaflet() : [0, 0], { icon: icon, title: this.title, riseOnHover: true });
    this._lm.on("click", function () { fireEvt(self, "click"); });
    this._lm.on("add", function () {
      // L.divIcon con un elemento DOM lo ricrea: ricolleghiamo "content" al nodo reale
      var img = self._lm.getElement() && self._lm.getElement().querySelector("img");
      if (img && self.content && img !== self.content) self.content = img;
    });
    this._map = null;
    if (opts.map) this.setMap(opts.map);
  }
  AdvancedMarkerElement.prototype.setMap = function (map) {
    if (this._map === map) return;
    if (this._map) this._map._map.removeLayer(this._lm);
    this._map = map || null;
    if (map && this._valid) this._lm.addTo(map._map);
  };
  Object.defineProperty(AdvancedMarkerElement.prototype, "map", {
    get: function () { return this._map; },
    set: function (m) { this.setMap(m); }
  });
  AdvancedMarkerElement.prototype.addListener = function (name, fn) { return addEvt(this, name, fn); };

  // InfoWindow -> popup Leaflet. Emette "domready" e "closeclick" come Google.
  function InfoWindow(opts) {
    var self = this;
    this._content = (opts && opts.content) || "";
    this._popup = L.popup({ maxWidth: 640, minWidth: Math.min(460, window.innerWidth - 60), maxHeight: Math.round(window.innerHeight * 0.7), autoPanPadding: [30, 30], className: "gm-shim-infowindow" });
    this._popup.on("remove", function () { fireEvt(self, "closeclick"); });
  }
  InfoWindow.prototype.setContent = function (c) { this._content = c; };
  InfoWindow.prototype.open = function (map, anchor) {
    var self = this;
    if (map && map.map) { anchor = map.anchor || anchor; map = map.map; }
    var where = anchor && anchor._lm ? anchor._lm.getLatLng() : map._map.getCenter();
    // Contenuto come nodo DOM (non stringa): così update() ridimensiona il popup
    // senza riscrivere l'HTML e cancellare schede, PDF e foto aggiunti in "domready".
    var node = this._content;
    if (typeof node === "string") {
      var wrap = document.createElement("div");
      wrap.innerHTML = node;
      node = wrap.childElementCount === 1 ? wrap.firstElementChild : wrap;
    }
    this._popup.setLatLng(where).setContent(node).openOn(map._map);
    setTimeout(function () { fireEvt(self, "domready"); self._popup.update(); }, 0);
  };
  InfoWindow.prototype.close = function () { this._popup.remove(); };

  // Ricerca indirizzi: sostituisce places.SearchBox con il geocoder gratuito Nominatim (OpenStreetMap)
  function SearchBox(input) {
    var self = this;
    this._input = input;
    this._places = [];
    this._bounds = null;
    input.setAttribute("title", "Scrivi un indirizzo e premi Invio");
    input.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&accept-language=it&q=" + encodeURIComponent(q);
      if (self._bounds) {
        var b = self._bounds.toLeaflet();
        url += "&viewbox=" + [b.getWest(), b.getNorth(), b.getEast(), b.getSouth()].join(",");
      }
      input.disabled = true;
      fetch(url, { headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          self._places = (res || []).map(function (p) {
            var loc = new LatLng(p.lat, p.lon);
            var vp = null;
            if (p.boundingbox) vp = new LatLngBounds(new LatLng(p.boundingbox[0], p.boundingbox[2]), new LatLng(p.boundingbox[1], p.boundingbox[3]));
            return { name: p.display_name, geometry: { location: loc, viewport: vp } };
          });
          if (!self._places.length) { input.classList.add("gm-shim-notfound"); setTimeout(function () { input.classList.remove("gm-shim-notfound"); }, 1500); }
          fireEvt(self, "places_changed");
        })
        .catch(function (e) { console.error("Ricerca indirizzo non riuscita:", e); })
        .then(function () { input.disabled = false; input.focus(); });
    });
  }
  SearchBox.prototype.getPlaces = function () { return this._places; };
  SearchBox.prototype.setBounds = function (b) { this._bounds = b; };
  SearchBox.prototype.addListener = function (name, fn) { return addEvt(this, name, fn); };

  window.google = window.google || {};
  window.google.maps = {
    Map: Map,
    LatLng: LatLng,
    LatLngBounds: LatLngBounds,
    InfoWindow: InfoWindow,
    ControlPosition: ControlPosition,
    marker: { AdvancedMarkerElement: AdvancedMarkerElement },
    places: { SearchBox: SearchBox },
    event: {
      addListener: function (obj, name, fn) {
        return obj.addListener ? obj.addListener(name, fn) : addEvt(obj, name, fn);
      }
    }
  };

  // Stili per pin, popup e campo di ricerca (equivalenti a quelli .gm-style di stile.css)
  var css = document.createElement("style");
  css.textContent = [
    ".gm-shim-pin{background:none;border:none}",
    ".gm-shim-pin img{width:30px;height:30px;display:block}",
    ".gm-shim-infowindow .leaflet-popup-content-wrapper{background:#f5f5f5;border-radius:10px;padding:10px}",
    ".gm-shim-infowindow .leaflet-popup-content{margin:10px 14px;font-size:inherit;line-height:inherit;width:auto!important}",
    ".gm-shim-infowindow .leaflet-popup-tip{background:#f5f5f5}",
    ".gm-shim-infowindow a.leaflet-popup-close-button{width:44px;height:44px;font:32px/40px Tahoma,Verdana,sans-serif;color:#333}",
    "#map .leaflet-tile-pane{filter:grayscale(.85) brightness(1.04) contrast(.92)}",
    "#search-box-container{margin-top:10px!important;margin-left:0!important}",
    "#search-box.gm-shim-notfound{border-color:#e5172b;box-shadow:0 0 0 2px rgba(229,23,43,.25)}",
    "@media (max-width:700px){#search-box{width:calc(100vw - 190px)}}"
  ].join("\n");
  document.head.appendChild(css);

  // Avvio: Google Maps chiamava initMap tramite il parametro callback dello script
  function start() { if (typeof window.initMap === "function") window.initMap(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
