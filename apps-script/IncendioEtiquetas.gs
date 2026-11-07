// ------------------------------------------------------------------ 7 · Incendio › Etiquetas QR de extintores (07/11/2026, pedido de Belén)
// Dos etiquetas por extintor, de 5 × 5 cm, en blanco y negro: una va en el cilindro (EXTINTOR) y otra en la chapa baliza (CHAPA BALIZA).
// Las dos llevan lo mismo: nombre completo del lugar, N.º de puesto (cada CAPS numera desde 1), tipo · agente · kg, N.º de inventario,
// planta · sector, la ubicación detallada, el QR y el logo HySL. Hoja A4 de 10 etiquetas (5 pares: a la izquierda el extintor,
// a la derecha su chapa). Belén las imprime; nada se manda por correo.
// Alcance (Belén, 07/11/2026): HMH y CAPS de la red Trelew (SITIOS_INC › TIPO_SITIO = CAPS del HZT). Las del HMH se imprimen después
// de la revisión de ubicaciones (IncendioUbicaciones.gs).
// QR: un link corto a «Mi establecimiento» (?q=HZT-005 el cilindro, ?q=HZT-005-C la chapa). Solo lleva el código: para ver o cargar algo
// hay que entrar con usuario y clave. Corrección de errores M (se lee aunque se raye una parte), con margen blanco alrededor.
// Estado de cada etiqueta: hoja ETIQUETAS_QR (se crea sola) guarda los datos tal como se imprimieron. Se compara con EXTINTORES:
//   · sin fila → «Nueva» (pendiente) · cambió un dato impreso (lugar, N.º, tipo, agente, kg, inventario, planta, sector) → «Cambió» (pendiente)
//   · cambió solo el texto de la ubicación → «Texto viejo» (no es pendiente; se reimprime si Belén quiere) · igual → «Al día».
// Así no hace falta tocar ninguna carga (portal, Mi establecimiento, MIPyV, planilla): el estado sale solo.
// Entra por Incendio.gs › incPortal_ (p_inc_etiq, p_inc_etiq_hoja, p_inc_etiq_marcar). Respaldo sin GitHub: menú Sistema HyS › Incendio.
// Usa QrLib.gs (qrcode-generator 1.4.4, Kazuhiko Arase, licencia MIT).

const INCQ = {
  HOJA: 'ETIQUETAS_QR',
  H: ['ID', 'LUGAR', 'NRO', 'DATOS', 'IMPRESA', 'QUIEN', 'NOTA', 'ACTUALIZADO'],
  URL: 'https://hyslhmh-sudo.github.io/manifiestos/?q=',
  LOGO: 'https://hyslhmh-sudo.github.io/manifiestos/desvios/logo-hysl.png',
  IMP: [['LUGAR', 'Lugar'], ['NRO', 'N.º'], ['TIPO', 'Tipo'], ['AGENTE', 'Agente'], ['KG', 'Kg'], ['INV', 'Inventario'], ['PLANTA', 'Planta'], ['SECTOR', 'Sector']],
  POR_HOJA: 10
};

// ¿Entra en las etiquetas? HMH (edificio) y CAPS del HZT
const incqAlcance_ = s => (s.ESTABLECIMIENTO === 'HMH' && sinTildes_(s.SITIO) === 'hmh') || (s.ESTABLECIMIENTO === 'HZT' && /^caps$/i.test(limpio_(s.TIPO_SITIO)));
function incqLugar_(s, nomEst) {
  if (/^caps$/i.test(limpio_(s.TIPO_SITIO))) return /^caps\b/i.test(s.SITIO) ? s.SITIO : 'CAPS ' + s.SITIO;
  if (sinTildes_(s.SITIO) === sinTildes_(s.ESTABLECIMIENTO)) return nomEst[s.ESTABLECIMIENTO] || s.SITIO;
  return s.SITIO;
}
const incqPlanta_ = p => { p = limpio_(p); return /^única$/i.test(p) ? 'Planta única' : p; };
const incqCodigo_ = id => String(id || '').replace(/^EXT-/i, '');   // EXT-HZT-005 → HZT-005

function incqHoja_() {
  const ss = pInc_(); let sh = ss.getSheetByName(INCQ.HOJA); if (sh) return sh;
  sh = ss.insertSheet(INCQ.HOJA);
  encabezar_(sh, 'Etiquetas QR de extintores', 'Una fila por extintor con etiqueta impresa: los datos tal como salieron en la etiqueta. Si cambian en EXTINTORES, el portal la marca para reimprimir. Lo completa el sistema.', INCQ.H,
    ['EXTINTORES › ID.', 'Lugar impreso.', 'N.º de puesto impreso.', 'Datos impresos (los usa el sistema para comparar; no editar).', 'Día en que se imprimió.', 'Quién la marcó como impresa.', 'Notas (p. ej. «No hacía falta reimprimir»).', 'Última vez que se tocó la fila.']);
  sh.setColumnWidth(4, 360); sh.setColumnWidth(7, 280);
  return sh;
}

// Datos impresos de un extintor (lo que va en la etiqueta)
function incqDatosExt_(e, s, nomEst) {
  return { ID: e.ID, COD: incqCodigo_(e.ID), EST: e.ESTABLECIMIENTO, SITIO: e.SITIO, LUGAR: incqLugar_(s, nomEst), NRO: limpio_(e.NRO_EXTINTOR) || 's/d',
    TIPO: limpio_(e.TIPO) || 's/d', AGENTE: limpio_(e.AGENTE) || 's/d', KG: limpio_(e.CAPACIDAD_KG) || 's/d', INV: limpio_(e.NRO_INVENTARIO) || 's/d',
    PLANTA: incqPlanta_(e.PLANTA) || 's/d', SECTOR: limpio_(e.SECTOR) || 's/d', UBICACION: limpio_(e.UBICACION) };
}

// Todos los extintores del alcance, con el estado de su etiqueta
function incqListar_() {
  const D = incDatos_(), nomEst = {}; pEstablecimientos_().filas.forEach(f => nomEst[limpio_(f.v[0])] = limpio_(f.v[1]));
  const sh = incqHoja_(), reg = {}; pTabla_(sh, INCQ.H.length).forEach(r => { const o = { fila: r.fila }; INCQ.H.forEach((h, i) => o[h] = r.v[i]); reg[limpio_(o.ID)] = o; });
  const lugares = [], ext = [];
  D.sit.filter(incqAlcance_).forEach(s => {
    const l = D.ext.filter(e => e.ID && e.ESTABLECIMIENTO === s.ESTABLECIMIENTO && sinTildes_(e.SITIO) === sinTildes_(s.SITIO) && !/baja/i.test(e.ESTADO || ''))
      .sort((a, b) => (Number(a.NRO_EXTINTOR) || 9999) - (Number(b.NRO_EXTINTOR) || 9999));
    const L = { cod: s.ESTABLECIMIENTO, sitio: s.SITIO, lugar: incqLugar_(s, nomEst), total: l.length, pend: 0, texto: 0, aldia: 0 };
    l.forEach(e => {
      const d = incqDatosExt_(e, s, nomEst), r = reg[e.ID]; let ant = null; try { ant = r && r.DATOS ? JSON.parse(r.DATOS) : null; } catch (x) {}
      let estado = 'nueva', motivo = '';
      if (ant) {
        const dif = INCQ.IMP.filter(k => sinTildes_(ant[k[0]]) !== sinTildes_(d[k[0]])).map(k => k[1] + ': ' + (ant[k[0]] || 's/d') + ' → ' + d[k[0]]);
        if (dif.length) { estado = 'cambio'; motivo = dif.join(' · '); }
        else if (sinTildes_(ant.UBICACION) !== sinTildes_(d.UBICACION)) { estado = 'texto'; motivo = 'Ubicación: ' + (ant.UBICACION || 's/d') + ' → ' + (d.UBICACION || 's/d'); }
        else estado = 'aldia';
      }
      if (estado === 'nueva' || estado === 'cambio') L.pend++; else if (estado === 'texto') L.texto++; else L.aldia++;
      ext.push(Object.assign(d, { estado: estado, motivo: motivo, impresa: r && r.IMPRESA ? incISO_(r.IMPRESA) : '', nota: r ? limpio_(r.NOTA) : '' }));
    });
    lugares.push(L);
  });
  return { ok: true, lugares: lugares, ext: ext, libro: pInc_().getUrl() + '#gid=' + sh.getSheetId() };
}

// QR en SVG (margen blanco de 2 módulos; la etiqueta deja más blanco alrededor)
function incqQrSvg_(texto) {
  const q = qrcode(0, 'M'); q.addData(texto); q.make();
  const n = q.getModuleCount(), m = 2; let p = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += 'M' + (c + m) + ',' + (r + m) + 'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * m) + ' ' + (n + 2 * m) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + p + '" fill="#000"/></svg>';
}
const incqEsc_ = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Hoja A4 lista para imprimir (HTML completo). ids: extintores en el orden en que van; cada uno da 2 etiquetas (cilindro y chapa).
function incqHojaHtml_(ids) {
  const T = incqListar_(), por = {}; T.ext.forEach(e => por[e.ID] = e);
  const L = (ids || []).map(i => por[i]).filter(Boolean);
  if (!L.length) return { ok: false, mensaje: 'Elegí al menos un extintor.' };
  const kg = v => /^s\/d/.test(v) ? 'kg s/d' : String(v).replace('.', ',') + '\u00a0kg';
  const lab = (e, cual, cod) => '<div class="lab"><div class="lug">' + incqEsc_(e.LUGAR) + '</div><div class="mid">' + incqQrSvg_(INCQ.URL + cod) +
    '<div class="dat"><div class="cual">' + cual + '</div><div class="num">N.º\u00a0' + incqEsc_(e.NRO) + '</div><div class="t">' + incqEsc_(e.TIPO + ' · ' + e.AGENTE) + '</div><div class="t">' + kg(e.KG) + '</div><div class="i">Inv. ' + incqEsc_(e.INV) + '</div></div></div>' +
    '<div class="ub"><b>' + incqEsc_(e.PLANTA + ' · ' + e.SECTOR) + '</b>' + (e.UBICACION ? '<br>' + incqEsc_(e.UBICACION) : '') + '</div><img class="logo" src="' + INCQ.LOGO + '" alt=""></div>';
  const pares = L.map(e => lab(e, 'EXTINTOR', e.COD) + lab(e, 'CHAPA BALIZA', e.COD + '-C'));
  const hojas = []; for (let i = 0; i < pares.length; i += INCQ.POR_HOJA / 2) hojas.push('<div class="a4">' + pares.slice(i, i + INCQ.POR_HOJA / 2).join('') + '</div>');
  const css = '@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#eee}' +
    '.bar{position:sticky;top:0;background:#343A40;color:#fff;padding:10px 16px;font-size:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;z-index:2}.bar button{font:inherit;font-weight:700;padding:8px 14px;border:0;border-radius:6px;background:#FF682C;color:#fff;cursor:pointer}' +
    '.a4{width:210mm;height:297mm;margin:10px auto;background:#fff;padding:12mm 0;display:grid;grid-template-columns:repeat(2,50mm);grid-template-rows:repeat(5,50mm);column-gap:25mm;row-gap:7mm;justify-content:center;align-content:start;page-break-after:always;break-after:page}' +
    '.lab{width:50mm;height:50mm;border:0.3mm dashed #777;padding:2mm 2.5mm 1.2mm;display:flex;flex-direction:column;overflow:hidden}' +
    '.lug{font-size:8pt;font-weight:700;text-align:center;border-bottom:0.3mm solid #000;padding-bottom:0.8mm;line-height:1.1}' +
    '.mid{display:flex;gap:1.5mm;align-items:center;margin:1.2mm 0 1mm}.mid svg{width:23mm;height:23mm;flex:none}' +
    '.dat{display:flex;flex-direction:column;line-height:1.15;min-width:0}.cual{font-size:6.5pt;font-weight:700;letter-spacing:.3px}.num{font-size:15pt;font-weight:700;line-height:1.05}.t{font-size:7pt;font-weight:700;white-space:nowrap}.i{font-size:7pt}' +
    '.ub{font-size:6.5pt;line-height:1.2;text-align:center;max-height:10.5mm;overflow:hidden}.ub b{font-size:7pt}.logo{width:38mm;margin:auto auto 0;filter:grayscale(1)}' +
    '@media print{body{background:#fff}.bar{display:none}.a4{margin:0}}';
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas QR · extintores</title><style>' + css + '</style></head><body>' +
    '<div class="bar"><span>' + L.length + (L.length > 1 ? ' extintores' : ' extintor') + ' · ' + (L.length * 2) + ' etiquetas · ' + hojas.length + (hojas.length > 1 ? ' hojas A4' : ' hoja A4') + '. Imprimí al 100 % (tamaño real), sin «Ajustar a la página».</span><button onclick="window.print()">🖨️ Imprimir</button></div>' +
    hojas.join('') + '</body></html>';
  return { ok: true, html: html, n: L.length };
}

// Marcar como impresas (guarda los datos tal como salieron) o «No hace falta reimprimir» (actualiza los datos sin cambiar la fecha)
function incqMarcar_(ids, accion, quien) {
  const T = incqListar_(), por = {}; T.ext.forEach(e => por[e.ID] = e);
  const sh = incqHoja_(), filas = {}; pTabla_(sh, 1).forEach(r => filas[limpio_(r.v[0])] = r.fila);
  const hoy = incHoy_(); let n = 0;
  (ids || []).forEach(id => { const e = por[id]; if (!e) return;
    const datos = JSON.stringify({ LUGAR: e.LUGAR, NRO: e.NRO, TIPO: e.TIPO, AGENTE: e.AGENTE, KG: e.KG, INV: e.INV, PLANTA: e.PLANTA, SECTOR: e.SECTOR, UBICACION: e.UBICACION });
    const f = filas[id], antes = f ? sh.getRange(f, 1, 1, INCQ.H.length).getValues()[0] : null;
    const fila = accion === 'nohace' && antes
      ? [id, e.LUGAR, e.NRO, datos, antes[4], antes[5], 'No hacía falta reimprimir (' + incTxt_(hoy) + ', ' + quien + ')' + (e.motivo ? ': ' + e.motivo : ''), incFecha_(hoy)]
      : [id, e.LUGAR, e.NRO, datos, incFecha_(hoy), quien, '', incFecha_(hoy)];
    if (f) sh.getRange(f, 1, 1, fila.length).setValues([fila]); else { sh.appendRow(fila); filas[id] = sh.getLastRow(); }
    n++; });
  sh.getRange(6, 5, Math.max(sh.getLastRow() - 5, 1), 1).setNumberFormat('dd/mm/yyyy'); sh.getRange(6, 8, Math.max(sh.getLastRow() - 5, 1), 1).setNumberFormat('dd/mm/yyyy');
  return { ok: true, n: n };
}

// ------------------------------------------------------------------ Respaldo sin GitHub: menú Sistema HyS › Incendio › Etiquetas QR para imprimir
function menuEtiquetasQR() {
  const T = incqListar_();
  const fila = (L, i) => '<tr><td><b>' + incqEsc_(L.lugar) + '</b><br><small>' + L.total + ' extintor(es) · ' + L.pend + ' pendiente(s)' + (L.texto ? ' · ' + L.texto + ' con texto viejo' : '') + '</small><div id="r' + i + '"></div></td>' +
    '<td style="white-space:nowrap"><button ' + (L.pend ? '' : 'disabled ') + 'onclick="hoja(' + i + ',\'pend\',this)">Pendientes</button> <button ' + (L.total ? '' : 'disabled ') + 'onclick="hoja(' + i + ',\'todas\',this)">Todas</button></td></tr>';
  const html = '<div style="font-family:Arial,sans-serif;font-size:13px"><p>Hoja A4 de 10 etiquetas de 5 × 5 cm (cilindro + chapa baliza de cada extintor). Se abre en otra ventana para imprimir. Después de pegarlas, tocá «Ya las imprimí».</p>' +
    '<table style="border-collapse:collapse;width:100%">' + T.lugares.map(fila).join('') + '</table>' +
    '<script>const L=' + JSON.stringify(T.lugares.map(L => ({ cod: L.cod, sitio: L.sitio, ids: T.ext.filter(e => e.EST === L.cod && e.SITIO === L.sitio).map(e => [e.ID, e.estado]) }))) + ';' +
    'function hoja(i,modo,b){const ids=L[i].ids.filter(x=>modo==="todas"||x[1]==="nueva"||x[1]==="cambio").map(x=>x[0]);b.disabled=true;' +
    'google.script.run.withSuccessHandler(function(r){b.disabled=false;if(!r.ok){alert(r.mensaje);return;}const w=window.open("","_blank");if(!w){alert("El navegador bloqueó la ventana: permití las ventanas emergentes.");return;}w.document.open();w.document.write(r.html);w.document.close();' +
    'document.getElementById("r"+i).innerHTML="<button onclick=\'marcar("+i+",\\""+modo+"\\",this)\'>✅ Ya las imprimí</button>";}).withFailureHandler(function(e){b.disabled=false;alert(e.message);}).incqHojaMenu(ids);}' +
    'function marcar(i,modo,b){const ids=L[i].ids.filter(x=>modo==="todas"||x[1]==="nueva"||x[1]==="cambio").map(x=>x[0]);b.disabled=true;b.textContent="Guardando…";google.script.run.withSuccessHandler(function(r){b.textContent="Listo: "+r.n+" marcada(s)";}).withFailureHandler(function(e){b.disabled=false;alert(e.message);}).incqMarcarMenu(ids);}' +
    '</script><style>td{border-bottom:1px solid #ddd;padding:6px;vertical-align:top}button{padding:6px 10px;cursor:pointer}</style></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(560), 'Etiquetas QR para imprimir');
}
function incqHojaMenu(ids) { return incqHojaHtml_(ids); }
function incqMarcarMenu(ids) { return conLock_(() => incqMarcar_(ids, 'impresa', 'Belén Pellegrini (planilla)')); }
