/* Card dei progetti 2026 aggiunte in cima all'elenco di projects.html (IT ed EN).
   Stesso markup delle card Webflow: se c'è la thumb (thumb) si usa l'immagine
   vera, altrimenti il riquadro grigio segnaposto. Il tag deve essere una delle
   categorie del filtro Finsweet (fs-cmsfilter-field="tags"), in IT e in EN.
   Immagini hotel in progetti-hotel/ (nomi come da SPEC-IMMAGINI-PROGETTI-HOTEL.md),
   Smart Campus in progetti-smart-campus/. */
(function () {
  var list = document.querySelector('.collection-list-projects');
  if (!list) return;

  // Percorsi immagini risolti rispetto a questo script (radice del sito),
  // così funzionano sia da projects.html sia da en/projects.html.
  var base = (document.currentScript && document.currentScript.src) || location.href;
  function asset(path) { return new URL(path, base).href; }
  var en = /\/en\//.test(location.pathname);

  // Ordine: l'ultimo della lista finisce in cima. Risultato, dal più nuovo:
  // hotel, Smart Campus, poi le card Webflow (Under the Surface Stadium in testa).
  // Gubbio e Laveno nascosti per ora (le pagine esistono ma non sono linkate).
  var items = [
    { name: 'Smart Campus Genova', nameEn: 'Smart Campus Genoa', href: 'projects/smart-campus-genova.html', tag: 'Placemaking', year: '2026', thumb: 'progetti-smart-campus/smart-campus_thumb.jpg?v=2' },
    { name: 'Orta Conventino Hotel', href: 'projects/hotel-orta-conventino.html', tag: 'Architettura', tagEn: 'Architecture', year: '2026', thumb: 'progetti-hotel/orta-conventino_thumb.jpg?v=3' },
    { name: 'Orta Darsena Hotel', href: 'projects/hotel-orta-darsena.html', tag: 'Architettura', tagEn: 'Architecture', year: '2026', thumb: 'progetti-hotel/orta-darsena_thumb.jpg?v=2' },
    { name: 'Orta Mezzanino Hotel', href: 'projects/hotel-orta-mezzanino.html', tag: 'Architettura', tagEn: 'Architecture', year: '2026', thumb: 'progetti-hotel/orta-mezzanino_thumb.jpg?v=3' },
    { name: 'Bormio Hotel', href: 'projects/hotel-bormio.html', tag: 'Architettura', tagEn: 'Architecture', year: '2026', thumb: 'progetti-hotel/bormio_thumb.jpg?v=4' },
    // nascosto per ora: { name: 'Gubbio Hotel', href: 'projects/hotel-gubbio.html', tag: 'Architettura', tagEn: 'Architecture', year: '2026' },
    // nascosto per ora: { name: 'Laveno Hotel', href: 'projects/hotel-laveno.html', tag: 'Architettura', tagEn: 'Architecture', year: '2026' }
  ];

  items.forEach(function (item) {
    var media = item.thumb
      ? '<div class="wrapper-blue-hover"><div class="blue-hover"></div><img src="' + asset(item.thumb) + '" alt="" loading="lazy" class="project-item-image"/></div>'
      : '<div class="wrapper-blue-hover project-preview-placeholder"><div class="blue-hover"></div><span>Preview</span></div>';
    var li = document.createElement('div');
    li.className = 'collection-item-projects w-dyn-item project-preview-2026';
    li.innerHTML = '<div class="project-div-item"><a href="' + item.href + '" class="link-block w-inline-block">' + media +
      '<div class="project-item-text-container"><div class="project-item-year">' + item.year + '</div>' +
      '<div class="project-item-name">' + (en && item.nameEn ? item.nameEn : item.name) + '</div>' +
      '<div class="project-tag"><div fs-cmsfilter-field="tags" class="text-block">' + (en && item.tagEn ? item.tagEn : item.tag) + '</div></div></div></a></div>';
    list.insertBefore(li, list.firstChild);
  });
})();
