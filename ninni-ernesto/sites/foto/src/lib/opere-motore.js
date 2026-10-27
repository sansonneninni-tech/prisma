/**
 * Motore della pagina Opere (DIREZIONE §6 P2, C8 C10 C14). JavaScript semplice, senza dipendenze.
 * Logica presa da `sites/casa/src/lib/opere-motore.js` e adattata (schede Originali/Stampe, masonry a colonne).
 *
 * Gira due volte:
 * 1. INLINE, subito dopo la pagina (<script is:inline data-astro-rerun>), prima del primo disegno: legge l'URL
 *    (?vista=stampe&colore=rossi,ocra&formato=grandi&prezzo=fino-3500&forma=verticali&stato=disponibili) e mette
 *    schede, griglia e pannello nello stato giusto. Nessun lampo di tutte le card, nessun salto.
 * 2. Dal modulo della pagina (window.GalleriaOpere, `opere-client.ts`), a ogni scelta.
 *
 * Dentro un gruppo le scelte si sommano (OR), fra gruppi si restringono (AND). Conteggi «a faccette»: per ogni voce,
 * quante opere resterebbero scegliendola insieme agli altri filtri attivi. Le vendute stanno sempre in fondo.
 * Masonry (C8): colonna più corta, altezza = data-h (1 / rapporto dell'immagine) + data-dida; a parità la più a
 * sinistra. È la stessa regola di `lib/opere.ts`, che dispone le card sul server a 2 colonne: senza filtri e sotto
 * 1280 px il risultato è identico e niente si muove; da 1280 (3 colonne) si ridispone prima del primo disegno.
 */
(function (g) {
  var VISTE = ['originali', 'stampe'];
  var GRUPPI = { originali: ['colore', 'formato', 'prezzo'], stampe: ['colore', 'forma'] };
  var TUTTI = ['colore', 'formato', 'prezzo', 'forma'];

  function vuoto(vista) {
    return { vista: vista || 'originali', colore: new Set(), formato: new Set(), prezzo: new Set(), forma: new Set(), stato: 'tutte' };
  }

  /** Toglie i filtri che la scheda corrente non ha (es. «Grandi» passando a Stampe). Il colore resta. */
  function normalizza(s) {
    TUTTI.forEach(function (k) { if (GRUPPI[s.vista].indexOf(k) < 0) s[k].clear(); });
    if (s.vista !== 'originali') s.stato = 'tutte';
    return s;
  }

  function leggiUrl(search) {
    var p = new URLSearchParams(search || '');
    var s = vuoto(p.get('vista') === 'stampe' ? 'stampe' : 'originali');
    TUTTI.forEach(function (k) {
      (p.get(k) || '').split(',').forEach(function (v) { v = v.trim(); if (v) s[k].add(v); });
    });
    if (p.get('stato') === 'disponibili') s.stato = 'disponibili';
    return normalizza(s);
  }

  /** Query dell'URL: solo ciò che non è il default, in ordine fisso (link stabili e condivisibili). */
  function query(s) {
    var p = new URLSearchParams();
    if (s.vista !== 'originali') p.set('vista', s.vista);
    GRUPPI[s.vista].forEach(function (k) { if (s[k].size) p.set(k, Array.from(s[k]).join(',')); });
    if (s.stato !== 'tutte') p.set('stato', s.stato);
    var q = p.toString().replace(/%2C/g, ',');
    return q ? '?' + q : '';
  }

  function attivi(s) {
    var n = 0;
    GRUPPI[s.vista].forEach(function (k) { n += s[k].size; });
    return n + (s.stato !== 'tutte' ? 1 : 0);
  }

  function dati(el) {
    var d = el.dataset;
    return {
      el: el, id: d.id,
      colore: (d.colore || '').split(' ').filter(Boolean),
      formato: d.formato ? [d.formato] : [],
      prezzo: d.prezzo ? [d.prezzo] : [],
      forma: d.forma ? [d.forma] : [],
      venduta: d.stato === 'sold',
      ordine: Number(d.ordine || 0),
      h: Number(d.h || 1),
    };
  }

  function passa(c, s, salta) {
    var gruppi = GRUPPI[s.vista];
    for (var i = 0; i < gruppi.length; i++) {
      var k = gruppi[i];
      if (k === salta || !s[k].size) continue;
      var ok = false;
      for (var j = 0; j < c[k].length; j++) if (s[k].has(c[k][j])) { ok = true; break; }
      if (!ok) return false;
    }
    if (salta !== 'stato' && s.stato === 'disponibili' && c.venduta) return false;
    return true;
  }

  /** Testo con il numero: chiave_0 / chiave_1 se ci sono, altrimenti chiave con {n}. */
  function testo(T, chiave, n) {
    var k = n === 0 && T[chiave + '_0'] ? chiave + '_0' : n === 1 && T[chiave + '_1'] ? chiave + '_1' : chiave;
    return String(T[k] || '').replace('{n}', String(n));
  }

  function colonneN() {
    return g.matchMedia && g.matchMedia('(min-width: 1280px)').matches ? 3 : 2;
  }

  /** Dispone le card visibili nelle colonne (la più corta), le altre nascoste in fondo all'ultima. */
  function disponi(griglia, visibili, nascoste, dida) {
    var n = colonneN();
    var cols = Array.prototype.slice.call(griglia.children).filter(function (el) { return el.classList.contains('mas__col'); });
    while (cols.length < n) { var c = document.createElement('div'); c.className = 'mas__col'; griglia.appendChild(c); cols.push(c); }
    var altezze = cols.map(function () { return 0; });
    var mappa = visibili.map(function (card) {
      var k = 0;
      for (var i = 1; i < n; i++) if (altezze[i] < altezze[k] - 1e-9) k = i;
      altezze[k] += card.h + dida;
      return k;
    });
    visibili.forEach(function (card, i) {
      card.el.hidden = false;
      var col = cols[mappa[i]];
      // appendChild solo se serve: niente spostamenti inutili (immagini in caricamento, fuoco)
      if (card.el.parentNode !== col || card.el.previousElementSibling !== (col.__ultimo || null)) col.appendChild(card.el);
      col.__ultimo = card.el;
    });
    var ultima = cols[n - 1];
    nascoste.forEach(function (card) { card.el.hidden = true; ultima.appendChild(card.el); });
    // colonne in più (da 3 a 2): le loro card sono già state spostate; si tolgono vuote
    cols.slice(n).forEach(function (c) { while (c.firstChild) ultima.appendChild(c.firstChild); c.remove(); });
    cols.forEach(function (c) { c.__ultimo = null; });
    griglia.setAttribute('data-colonne', String(n));
  }

  /** Applica lo stato alla pagina. Restituisce il numero di card visibili. */
  function applica(root, s) {
    normalizza(s);
    var T = JSON.parse(root.getAttribute('data-testi') || '{}');
    var dida = Number(root.getAttribute('data-dida') || 0.35);
    var unita = s.vista === 'stampe' ? '_stampe' : '';

    // 1. schede e pannelli
    root.setAttribute('data-vista', s.vista);
    root.querySelectorAll('[data-scheda]').forEach(function (b) {
      var sel = b.getAttribute('data-valore') === s.vista;
      b.setAttribute('aria-selected', sel ? 'true' : 'false');
      b.tabIndex = sel ? 0 : -1;
    });
    var pannello = null;
    root.querySelectorAll('[data-pannello]').forEach(function (p) {
      var sel = p.getAttribute('data-pannello') === s.vista;
      p.hidden = !sel;
      if (sel) pannello = p;
    });
    if (!pannello) return 0;

    // 2. chi resta, in che ordine (vendute in fondo), e colonne
    var griglia = pannello.querySelector('[data-griglia]');
    var carte = Array.prototype.map.call(griglia.querySelectorAll('[data-card]'), dati);
    var visibili = carte.filter(function (c) { return passa(c, s); }).sort(function (a, b) {
      return (a.venduta === b.venduta ? 0 : a.venduta ? 1 : -1) || a.ordine - b.ordine;
    });
    var nascoste = carte.filter(function (c) { return visibili.indexOf(c) < 0; }).sort(function (a, b) { return a.ordine - b.ordine; });
    disponi(griglia, visibili, nascoste, dida);

    // 3. voci dei filtri: gruppi della scheda, stato premuto, conteggi a faccette
    root.querySelectorAll('[data-gruppo-box]').forEach(function (box) {
      box.hidden = (box.getAttribute('data-viste') || '').split(' ').indexOf(s.vista) < 0;
    });
    root.querySelectorAll('[data-opzione]').forEach(function (o) {
      var gruppo = o.getAttribute('data-gruppo');
      var valore = o.getAttribute('data-valore');
      var scelto, n;
      if (gruppo === 'stato') {
        scelto = s.stato === valore;
        n = carte.filter(function (c) { return passa(c, s, 'stato') && !c.venduta; }).length;
      } else {
        if (GRUPPI[s.vista].indexOf(gruppo) < 0) return;
        scelto = s[gruppo].has(valore);
        n = carte.filter(function (c) { return passa(c, s, gruppo) && c[gruppo].indexOf(valore) > -1; }).length;
      }
      o.setAttribute('aria-pressed', scelto ? 'true' : 'false');
      // (0): si vede ma non si sceglie; se è già scelta resta attiva per poterla togliere
      o.disabled = n === 0 && !scelto;
      var conto = o.querySelector('[data-conto]');
      if (conto) conto.textContent = String(n);
    });

    // 4. filtri attivi in riga (× per togliere) + numero di risultati
    var na = attivi(s);
    var nv = visibili.length;
    root.querySelectorAll('[data-chips]').forEach(function (box) {
      var lista = box.querySelector('[data-chips-lista]');
      lista.replaceChildren();
      GRUPPI[s.vista].concat(['stato']).forEach(function (gruppo) {
        var valori = gruppo === 'stato' ? (s.stato !== 'tutte' ? [s.stato] : []) : Array.from(s[gruppo]);
        valori.forEach(function (v) {
          var o = root.querySelector('[data-opzione][data-gruppo="' + gruppo + '"][data-valore="' + v + '"]');
          if (!o) return;
          var nome = o.getAttribute('data-label');
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'attivi__x';
          b.setAttribute('data-chip', '');
          b.setAttribute('data-gruppo', gruppo);
          b.setAttribute('data-valore', v);
          b.setAttribute('aria-label', String(T.togli || '').replace('{nome}', nome));
          var t = document.createElement('span'); t.textContent = nome; b.appendChild(t);
          var x = document.createElement('span'); x.setAttribute('aria-hidden', 'true'); x.className = 'attivi__per'; x.textContent = '×'; b.appendChild(x);
          var li = document.createElement('li'); li.appendChild(b);
          lista.appendChild(li);
        });
      });
      box.hidden = na === 0;
    });

    // 5. testi e stati
    root.querySelectorAll('[data-totale]').forEach(function (el) { el.textContent = testo(T, 'conteggio' + unita, nv); });
    root.querySelectorAll('[data-filtri-n]').forEach(function (el) { el.textContent = na ? String(T.filtra_n || '').replace('{n}', String(na)) : T.filtra; });
    root.querySelectorAll('[data-mostra]').forEach(function (el) { el.textContent = testo(T, 'mostra' + unita, nv); });
    root.querySelectorAll('[data-azzera]').forEach(function (el) { el.disabled = na === 0; });
    root.querySelectorAll('[data-vuoto]').forEach(function (el) { el.hidden = nv > 0; });
    root.querySelectorAll('[data-vuoto-testo]').forEach(function (el) { el.textContent = T['vuoto' + unita] || T.vuoto; });
    root.toggleAttribute('data-nessuna', nv === 0);
    return nv;
  }

  g.GalleriaOpere = { VISTE: VISTE, GRUPPI: GRUPPI, vuoto: vuoto, leggiUrl: leggiUrl, query: query, attivi: attivi, applica: applica, normalizza: normalizza };

  // avvio inline: lo script sta subito dopo [data-opere]
  var root = document.querySelector('[data-opere]');
  if (root) {
    try { applica(root, leggiUrl(location.search)); } catch (e) { root.setAttribute('data-errore', ''); }
  }
})(window);
