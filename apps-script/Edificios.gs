/**
 * RELEVAMIENTO DE EDIFICIOS · red Trelew (05/11/2026, pedido de Belén: «en Portal HyS no me sale esta info»)
 * Agua, desagües, canaletas y techos de cada lugar, cargados por Javier y Paulo desde la app MIP (edificio.js).
 * Se guardan en el libro MIPyV, hoja «relevamiento_edificio» (Edificio_MIPyV.gs del proyecto MIP). Acá solo se leen
 * para el portal (pantalla #edif) y se marca «revisado_hys». Si falta GitHub: se ve y se edita directo en esa hoja.
 * Usa plagMipyvLibro_() de Modulo5.gs (mismo libro MIPyV).
 */
const EDIF_HOJA = 'relevamiento_edificio';

function edifPortal_(accion, x) {
  if (typeof plagMipyvLibro_ !== 'function') return { ok: false, mensaje: 'Falta instalar Modulo5.gs.' };
  if (accion === 'p_edif') return edifLista_();
  if (accion === 'p_edif_revisar') return conLock_(() => edifRevisar_(x));
  return { ok: false, mensaje: 'Acción desconocida: ' + accion };
}

function edifLista_() {
  const ss = plagMipyvLibro_(), sh = ss.getSheetByName(EDIF_HOJA);
  const out = { ok: true, filas: [], libro: ss.getUrl() + '#gid=' + (sh ? sh.getSheetId() : 0) };
  if (!sh || sh.getLastRow() < 2) return out;
  const V = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), H = V[0].map(h => String(h).trim()), c = k => H.indexOf(k);
  const txt = (r, k) => { const j = c(k); if (j < 0) return ''; const v = r[j]; return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm') : String(v == null ? '' : v).trim(); };
  const fotos = s => String(s || '').split(/\s*\|\s*/).map(u => u.trim()).filter(Boolean).map(u => { const m = u.match(/\/d\/([\w-]+)/) || u.match(/id=([\w-]+)/); return { url: u, id: m ? m[1] : '' }; });
  V.slice(1).forEach((r, i) => {
    if (!txt(r, 'id_relev') && !txt(r, 'lugar')) return;
    const f = { fila: i + 2 };
    ['id_relev', 'lugar_id', 'lugar', 'parte', 'operario', 'operario_acompanante', 'prioridad', 'agua', 'desagues', 'canaletas', 'techos', 'techo_tipo',
      'agua_falta', 'desagues_falta', 'canaletas_falta', 'techos_falta', 'observaciones', 'respuestas', 'cargado', 'revisado_hys', 'otros_riesgos'].forEach(k => { f[k] = txt(r, k); });
    f.fecha = txt(r, 'fecha_relevamiento').slice(0, 10);
    ['agua', 'desagues', 'canaletas', 'techos', 'riesgos'].forEach(t => { f['fotos_' + t] = fotos(txt(r, 'fotos_' + t)); });
    out.filas.push(f);
  });
  out.filas.sort((a, b) => (b.fecha + b.cargado).localeCompare(a.fecha + a.cargado));
  return out;
}

function edifRevisar_(x) {
  const sh = plagMipyvLibro_().getSheetByName(EDIF_HOJA); if (!sh) return { ok: false, mensaje: 'No está la hoja ' + EDIF_HOJA + ' en el libro MIPyV.' };
  const H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim()), jI = H.indexOf('id_relev'), jR = H.indexOf('revisado_hys');
  if (jI < 0 || jR < 0) return { ok: false, mensaje: 'Faltan las columnas id_relev o revisado_hys.' };
  const cel = sh.getRange(2, jI + 1, Math.max(1, sh.getLastRow() - 1), 1).createTextFinder(String(x.id || '')).matchEntireCell(true).findNext();
  if (!cel) return { ok: false, mensaje: 'No se encontró el relevamiento.' };
  const nota = String(x.nota || '').trim();
  sh.getRange(cel.getRow(), jR + 1).setValue('Revisado ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy') + (nota ? ': ' + nota : ''));
  return { ok: true };
}
