// ------------------------------------------------------------------ 7 · Incendio › Revisión de ubicaciones del HMH (07/11/2026, pedido de Belén)
// «Mientras reponían extintores asignaron ubicaciones que no son las que yo necesito (HMH). Tengo que ver dónde está cada extintor y
// luego decidir si muevo o no.» Por eso las etiquetas QR del HMH se imprimen después de esta revisión (IncendioEtiquetas.gs).
// Cómo funciona:
//   1. El portal lista los extintores del HMH por planta y sector, con la foto panorámica (dónde quedó cada uno).
//   2. En cada uno, Belén elige «Queda acá» o «Mover a…» (planta, sector, dónde exactamente y, si cambia, el N.º de puesto).
//   3. Con los que hay que mover se arma la lista para SOMI o Mantenimiento (qué extintor, de dónde y a dónde). No se manda por correo:
//      se imprime o se guarda en PDF desde el navegador.
//   4. Cuando lo mueven, «Ya lo movieron» actualiza el extintor (EXTINTORES, con el cambio anotado en CAMBIOS) y la etiqueta queda pendiente.
// Las decisiones quedan en la hoja REVISION_UBIC (se crea sola). Respaldo sin GitHub: en esa hoja se elige ESTADO con la lista, y el menú
// Sistema HyS › Incendio arma la lista para SOMI y aplica los «Movido».
// Entra por Incendio.gs › incPortal_ (p_inc_ubic, p_inc_ubic_guardar, p_inc_ubic_movido, p_inc_ubic_lista).

const INCU = {
  HOJA: 'REVISION_UBIC',
  H: ['ID', 'NRO', 'PLANTA', 'SECTOR', 'UBICACION', 'ESTADO', 'A_NRO', 'A_PLANTA', 'A_SECTOR', 'A_UBICACION', 'NOTA', 'DECIDIDO', 'MOVIDO', 'QUIEN'],
  ESTADOS: ['Queda', 'Mover (pendiente)', 'Movido'],
  EST: 'HMH', SITIO: 'HMH',
  LOGO: 'https://hyslhmh-sudo.github.io/manifiestos/desvios/logo-hysl.png'
};

function incuHoja_() {
  const ss = pInc_(); let sh = ss.getSheetByName(INCU.HOJA); if (sh) return sh;
  sh = ss.insertSheet(INCU.HOJA);
  encabezar_(sh, 'Revisión de ubicaciones de extintores · HMH', 'Una fila por extintor revisado. «Queda»: está donde tiene que estar. «Mover (pendiente)»: hay que llevarlo a donde dicen las columnas A_… «Movido»: ya se movió (el menú Sistema HyS › Incendio › Aplicar los movidos actualiza EXTINTORES).', INCU.H,
    ['EXTINTORES › ID.', 'N.º de puesto al revisar.', 'Planta al revisar.', 'Sector al revisar.', 'Dónde estaba al revisar.', 'Queda · Mover (pendiente) · Movido', 'N.º de puesto nuevo (vacío = el mismo).', 'Planta a la que va.', 'Sector al que va.', 'Dónde exactamente.', 'Para quien lo mueve.', 'Día de la decisión.', 'Día en que se movió.', 'Quién decidió o confirmó.']);
  lista_(sh, 6, 2000, INCU.ESTADOS); [12, 13].forEach(c => sh.getRange(6, c, 2000, 1).setNumberFormat('dd/mm/yyyy'));
  sh.setColumnWidth(5, 240); sh.setColumnWidth(10, 240); sh.setColumnWidth(11, 260);
  return sh;
}
function incuRegistro_() {
  const sh = incuHoja_(), out = {};
  pTabla_(sh, INCU.H.length).forEach(r => { const o = { fila: r.fila }; INCU.H.forEach((h, i) => o[h] = r.v[i] instanceof Date ? incISO_(r.v[i]) : (typeof r.v[i] === 'string' ? r.v[i].trim() : r.v[i])); if (o.ID) out[o.ID] = o; });
  return { sh: sh, reg: out };
}
const incuFoto_ = u => { const m = /\/d\/([\w-]{20,})/.exec(String(u || '')) || /[?&]id=([\w-]{20,})/.exec(String(u || '')); return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w600' : ''; };

function incuListar_() {
  const D = incDatos_(), R = incuRegistro_();
  const ext = D.ext.filter(e => e.ID && e.ESTABLECIMIENTO === INCU.EST && sinTildes_(e.SITIO) === sinTildes_(INCU.SITIO) && !/baja/i.test(e.ESTADO || ''))
    .sort((a, b) => (Number(a.NRO_EXTINTOR) || 9999) - (Number(b.NRO_EXTINTOR) || 9999))
    .map(e => { const r = R.reg[e.ID] || null;
      return { ID: e.ID, NRO: limpio_(e.NRO_EXTINTOR), PLANTA: limpio_(e.PLANTA), SECTOR: limpio_(e.SECTOR), UBICACION: limpio_(e.UBICACION), TIPO: limpio_(e.TIPO), AGENTE: limpio_(e.AGENTE), KG: limpio_(e.CAPACIDAD_KG), INV: limpio_(e.NRO_INVENTARIO),
        foto: incuFoto_(e.FOTO_PANORAMICA), fotoUrl: limpio_(e.FOTO_PANORAMICA),
        rev: r ? { ESTADO: r.ESTADO, A_NRO: limpio_(r.A_NRO), A_PLANTA: limpio_(r.A_PLANTA), A_SECTOR: limpio_(r.A_SECTOR), A_UBICACION: limpio_(r.A_UBICACION), NOTA: limpio_(r.NOTA), DECIDIDO: r.DECIDIDO || '', MOVIDO: r.MOVIDO || '' } : null }; });
  const c = k => ext.filter(e => e.rev && e.rev.ESTADO === k).length;
  return { ok: true, ext: ext, plantas: incPlantas_(INCU.EST), resumen: { total: ext.length, sinRevisar: ext.filter(e => !e.rev).length, quedan: c('Queda'), mover: c('Mover (pendiente)'), movidos: c('Movido') },
    libro: pInc_().getUrl() + '#gid=' + R.sh.getSheetId() };
}

// Decisión: «queda», «mover» (con destino) o «borrar» (vuelve a sin revisar)
function incuGuardar_(x, quien) {
  const D = incDatos_(), e = D.ext.find(z => z.ID === x.id); if (!e) return { ok: false, mensaje: 'Ese extintor ya no está en la lista.' };
  const R = incuRegistro_(), r = R.reg[x.id], hoy = incFecha_(incHoy_());
  if (x.decision === 'borrar') { if (r) R.sh.deleteRow(r.fila); return { ok: true }; }
  if (r && r.ESTADO === 'Movido') return { ok: false, mensaje: 'Ese extintor ya figura como movido.' };
  const v = { ID: e.ID, NRO: limpio_(e.NRO_EXTINTOR), PLANTA: limpio_(e.PLANTA), SECTOR: limpio_(e.SECTOR), UBICACION: limpio_(e.UBICACION), ESTADO: 'Queda', A_NRO: '', A_PLANTA: '', A_SECTOR: '', A_UBICACION: '', NOTA: limpio_(x.nota), DECIDIDO: hoy, MOVIDO: '', QUIEN: quien };
  if (x.decision === 'mover') {
    Object.assign(v, { ESTADO: 'Mover (pendiente)', A_NRO: limpio_(x.a_nro), A_PLANTA: limpio_(x.a_planta), A_SECTOR: limpio_(x.a_sector), A_UBICACION: limpio_(x.a_ubic) });
    if (!v.A_PLANTA || !v.A_SECTOR || !v.A_UBICACION) return { ok: false, mensaje: 'Para mover, completá a qué planta, a qué sector y dónde exactamente.' };
    if (v.A_NRO && !/^\d{1,3}$/.test(v.A_NRO)) return { ok: false, mensaje: 'El N.º de puesto nuevo lleva solo números (hasta 3).' };
  }
  const fila = INCU.H.map(h => v[h]);
  if (r) R.sh.getRange(r.fila, 1, 1, fila.length).setValues([fila]); else R.sh.appendRow(fila);
  return { ok: true };
}

// «Ya lo movieron»: aplica el destino al extintor (queda anotado en CAMBIOS) y la etiqueta pasa a pendiente sola
function incuMovido_(id, quien) {
  const R = incuRegistro_(), r = R.reg[id]; if (!r || r.ESTADO !== 'Mover (pendiente)') return { ok: false, mensaje: 'Ese extintor no está para mover.' };
  const y = { ID: id, ESTABLECIMIENTO: INCU.EST, PLANTA: r.A_PLANTA, SECTOR: r.A_SECTOR, UBICACION: r.A_UBICACION };
  if (limpio_(r.A_NRO)) y.NRO_EXTINTOR = limpio_(r.A_NRO);
  const res = incExtGuardar_(y, quien + ' · revisión de ubicaciones'); if (!res.ok) return res;
  R.sh.getRange(r.fila, INCU.H.indexOf('ESTADO') + 1).setValue('Movido');
  R.sh.getRange(r.fila, INCU.H.indexOf('MOVIDO') + 1).setValue(incFecha_(incHoy_()));
  return { ok: true };
}

// Lista para SOMI o Mantenimiento (HTML para imprimir o guardar en PDF; no se manda por correo)
function incuListaHtml_() {
  const T = incuListar_(), L = T.ext.filter(e => e.rev && e.rev.ESTADO === 'Mover (pendiente)');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const filas = L.map((e, i) => '<tr><td>' + (i + 1) + '</td><td><b>Puesto ' + esc(e.NRO || 's/d') + '</b><br>' + esc([e.TIPO, e.AGENTE, e.KG ? e.KG + ' kg' : ''].filter(Boolean).join(' · ')) + '<br>Inv. ' + esc(e.INV || 's/d') + '</td>' +
    '<td>' + esc(e.PLANTA + ' · ' + e.SECTOR) + '<br><small>' + esc(e.UBICACION) + '</small></td><td><b>' + esc(e.rev.A_PLANTA + ' · ' + e.rev.A_SECTOR) + '</b><br><small>' + esc(e.rev.A_UBICACION) + '</small>' + (e.rev.A_NRO && e.rev.A_NRO !== e.NRO ? '<br><small>Pasa a ser el puesto ' + esc(e.rev.A_NRO) + '</small>' : '') + '</td>' +
    '<td>' + esc(e.rev.NOTA) + '</td><td style="width:22mm"></td></tr>').join('');
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Extintores para mover · HMH</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#222;margin:0}' +
    '.bar{background:#343A40;color:#fff;padding:10px 16px;display:flex;gap:12px;align-items:center}.bar button{font:inherit;font-weight:700;padding:8px 14px;border:0;border-radius:6px;background:#FF682C;color:#fff;cursor:pointer}' +
    '.pag{max-width:190mm;margin:12px auto}h1{font-size:15pt;color:#0D313F;margin:0 0 4px}p{margin:4px 0 10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:5px 6px;vertical-align:top;text-align:left}th{background:#EAF3F6}small{color:#555}' +
    'footer{text-align:center;margin-top:18px}footer img{height:44px}@media print{.bar{display:none}.pag{margin:0;max-width:none}}</style></head><body>' +
    '<div class="bar"><span>' + L.length + (L.length === 1 ? ' extintor para mover' : ' extintores para mover') + '</span><button onclick="window.print()">🖨️ Imprimir o guardar en PDF</button></div><div class="pag">' +
    '<h1>Extintores para cambiar de lugar · Hospital María Humphreys</h1><p>Servicio de Higiene y Seguridad Laboral · ' + incTxt_(incHoy_()) + '. Al terminar cada uno, marcar «Hecho» y avisar a Higiene y Seguridad.</p>' +
    (L.length ? '<table><thead><tr><th>#</th><th>Extintor</th><th>Dónde está</th><th>A dónde va</th><th>Nota</th><th>Hecho</th></tr></thead><tbody>' + filas + '</tbody></table>' : '<p><b>No hay extintores para mover.</b></p>') +
    '<p style="margin-top:12px"><small>Dto. 351/79, Cap. 18 y Anexo VII: los extintores se ubican a la vista, de fácil acceso y señalizados; IRAM 3517-2, punto 3.3.</small></p>' +
    '<footer><img src="' + INCU.LOGO + '" alt="Higiene y Seguridad Laboral · Hospitales más seguros para las personas"></footer></div></body></html>';
  return { ok: true, html: html, n: L.length };
}

// ------------------------------------------------------------------ Respaldo sin GitHub (menú Sistema HyS › Incendio)
function menuUbicLista() {
  const r = incuListaHtml_();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:13px"><p>' + r.n + ' extintor(es) para mover.</p><button onclick="const w=window.open(\'\',\'_blank\');w.document.write(H);w.document.close();">Abrir la lista para imprimir</button><script>const H=' + JSON.stringify(r.html).replace(/<\//g, '<\\/') + ';</script></div>').setWidth(360).setHeight(140), 'Extintores para mover · HMH');
}
function menuUbicAplicar() {
  const R = incuRegistro_(); let n = 0; const err = [];
  Object.keys(R.reg).forEach(id => { const r = R.reg[id]; if (r.ESTADO !== 'Movido' || r.MOVIDO) return;
    R.sh.getRange(r.fila, INCU.H.indexOf('ESTADO') + 1).setValue('Mover (pendiente)');
    const x = incuMovido_(id, 'Belén Pellegrini (planilla)'); if (x.ok) n++; else err.push(id + ': ' + x.mensaje); });
  SpreadsheetApp.getUi().alert(n + ' extintor(es) actualizados en EXTINTORES.' + (err.length ? '\n\nNo se pudo:\n' + err.join('\n') : ''));
}
