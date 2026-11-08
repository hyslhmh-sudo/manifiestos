// Portal HyS · 2 · Agua y 3 · Plagas
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Módulo 2 · Agua y módulo 3 · Plagas (toda la red; la misma lectura, dos pantallas)
// ------------------------------------------------------------------ 2 · Agua · Informes de laboratorio (28/10/2026, pedido de Belén)
// PDF de los informes y remitos del laboratorio provincial (DPSB), ordenados en Drive por red y establecimiento, más el tablero en Sheets.
// Red Trelew y red Rawson van siempre separadas. Si cambia una carpeta, se corrige acá (y en index.html › AGUA_INF_MI).
const AGUA_INF = {
  dpsb: 'https://docs.google.com/forms/d/e/1FAIpQLSflMSFiY2bPi-LIN9eiY_hPVkcF1mmy2nAfUnMMM8B7D4U08Q/viewform',   // 02/11/2026: «Solicitud de Muestreo de Agua para Análisis» (Dirección Provincial Una Salud / DPSB)
  tablero: 'https://docs.google.com/spreadsheets/d/1Bd4K-7mfSEiZTRIHrH02GXqr_WdzuEXr7Yh2BZQddIM/edit',
  raiz: 'https://drive.google.com/drive/folders/1nTlxXtSKwlJMIyjsMMucU1T2Jvt3R8Ta',
  trelew: 'https://drive.google.com/drive/folders/1AQq9kXOabvClIEGckl9iU1IDAQQP_r9D',
  rawson: 'https://drive.google.com/drive/folders/1s9UNW9jAwUEZ836yjg6pg9YDE0EBKR0I',
  normativa: 'https://drive.google.com/drive/folders/16IyGjFyAi88I5jjL3AyI7JP0WLG4rinv',
  subir: 'https://drive.google.com/drive/folders/13iS2VTDBs-kEJqV22ajzA-GJhq2mRZdm'
};
// 02/11/2026 · Pedido al DPSB con el formulario ya completo (pedido de Belén). El formulario es del DPSB y no se modifica:
// el portal solo lo abre con las respuestas puestas (enlace «prellenado» de Google Forms) y HyS revisa y toca «Enviar».
// Datos: remitente fijo (pestaña «Formulario DPSB» del libro) + por establecimiento columnas V a Y del Tablero de la red
// + canillas de la columna T (una muestra por canilla, hasta 15). Al tocar el botón se anota la fecha en «Solicitado el» (columna U).
// Si el DPSB cambia el formulario, hay que volver a leer los números de cada pregunta (entry) y corregirlos acá.
const DPSB_F = {
  fecha: 1186279454, inst: 2111870154, cuit: 175538900, dir: 2024677151, loc: 2096231386, resp: 533756049, tel: 875354954, mail: 1239429880,
  // por muestra: [tipo de agua, sitio de extracción, tipo de análisis, quién solicita, comentarios, ¿agregar otra muestra?]
  m: [[549458807, 94448206, 1719214510, 206868652, 2002531151, 721840592], [1418029196, 1330399128, 1453115363, 1279699365, 1801264035, 747745880],
    [1739784811, 1636891823, 518658779, 1865157304, 101644680, 1184098760], [50374443, 350687057, 645573317, 965210028, 1180197474, 2001140488],
    [308426965, 1529038803, 1522451064, 1554352683, 1700542804, 640234800], [2104546687, 196894457, 1753586119, 953416996, 1483272887, 373487179],
    [1939728059, 1224063812, 339244536, 47833572, 33089506, 1896804082], [393017351, 955700379, 1434918971, 477195987, 825334939, 465914831],
    [1704014058, 2043547829, 1226479307, 1734097359, 204570487, 1384172559], [29315234, 1383569377, 86884826, 916558537, 659254430, 1522746475],
    [891508598, 1562747881, 2137797123, 778132243, 1476659551, 1998557600], [1315392370, 1629157604, 292592864, 57290699, 1151016816, 1920854222],
    [1603440026, 784735244, 285837361, 154327405, 75890766, 289742861], [571016040, 1860399489, 1053451175, 1824075450, 301250351, 1195431913],
    [1183228118, 445689542, 1550130179, 1667664809, 1567811567, 0]],
  micro: i => 'Análisis Microbiológico' + ([0, 1, 2, 4].indexOf(i) >= 0 ? '' : '.') + ' C.A.A. (recomendado por normativa cada 6 meses)',   // el DPSB lo escribió con y sin punto
  ambos: 'Ambos - Análisis Microbiológico y Análisis Fisicoquímico'
};
function aglUrl(x) {
  const r = x.rem || {}, f = x.form || {}, p = new URLSearchParams(), v = t => (t && !/^s\/d/i.test(t) ? t : ''), hoy = new Date();
  const fecha = hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);
  const comp = /COMPLETO|URGENTE/.test(x.que);
  let can = String(x.canillas || '').split(' · ').map(c => v(c.trim())).filter(Boolean);
  if (comp) ['Salida del tanque', 'Canilla más alejada'].forEach(c => { if (!can.some(k => k.toLowerCase().indexOf(c.toLowerCase()) >= 0)) can.push(c); });
  if (!can.length) can = [''];
  can = can.slice(0, DPSB_F.m.length);
  p.append('emailAddress', v(r.correo));
  [['fecha', fecha], ['inst', v(f.institucion) || x.lugar], ['cuit', v(r.cuit)], ['dir', v(f.direccion)], ['loc', v(f.localidad)], ['resp', v(r.responsable)], ['tel', v(r.contacto)], ['mail', v(r.correo)]]
    .forEach(([k, val]) => { if (val) p.append('entry.' + DPSB_F[k], val); });
  can.forEach((c, i) => { const e = DPSB_F.m[i];
    p.append('entry.' + e[0], v(f.tipoAgua) || 'Red que pasa por un tanque'); if (c) p.append('entry.' + e[1], c);
    p.append('entry.' + e[2], comp ? DPSB_F.ambos : DPSB_F.micro(i)); p.append('entry.' + e[3], v(r.quien) || 'Secretaría de Salud');
    if (v(r.comentarios)) p.append('entry.' + e[4], r.comentarios);
    if (e[5]) p.append('entry.' + e[5], i < can.length - 1 ? 'Si' : 'No'); });
  return { url: AGUA_INF.dpsb + '?usp=pp_url&' + p.toString().replace(/\+/g, '%20'), fecha: fecha, n: can.length };
}
async function aglPedir(i) {
  let x = AGL.lab[i]; if (!x) return;
  let w = null;
  if (!x.rem || !x.form) {   // datos guardados de antes de esta función: se leen de nuevo antes de abrir el formulario
    w = window.open('about:blank', '_blank'); toast('Leyendo los datos del establecimiento…');
    const red = x.red, lugar = x.lugar;
    try { const t = await api('p_tablero', { fresco: true }, 240000); if (t && t.ok !== false && Array.isArray(t.lab)) { TB = t; LS.set('tab', TB); AGL.lab = t.lab; x = t.lab.find(y => y.red === red && y.lugar === lugar) || x; } } catch (e) {}
  }
  const u = aglUrl(x);
  if (w) w.location.href = u.url; else window.open(u.url, '_blank', 'noopener');
  let r; try { r = await api('p_agl_solicitar', { red: x.red, lugar: x.lugar, fecha: u.fecha }, 60000); } catch (e) { return; }
  if (!r || !r.ok) return toast((r && r.mensaje) || 'No se pudo anotar la fecha: completala en la planilla, columna «Solicitado el».');
  x.solicitado = u.fecha; x.aviso = 'Solicitado el ' + r.fecha + ' · esperando el resultado';
  try { LS.set('tab', TB); } catch (e) {}
  const b = document.getElementById('aglBox'); if (b) b.innerHTML = aglPintar();
  toast('Formulario abierto con ' + u.n + (u.n > 1 ? ' muestras' : ' muestra') + '. Revisalo y tocá «Enviar» (si no aparece completo: «Borrar formulario» y volvé a tocar el botón). Quedó anotado «Solicitado el ' + r.fecha + '».');
}
// Borrador en Gmail (no se envía solo) avisando al establecimiento, y al Área Externa si es CAPS Trelew, que se pidió el muestreo.
// Destinatario: columna Z del Tablero de la red. Texto, asunto, copias y firma: pestaña «Formulario DPSB» del libro.
async function aglAviso(i) {
  const x = AGL.lab[i]; if (!x) return;
  const b = document.getElementById('aglAv' + i); if (b) { b.disabled = true; b.textContent = 'Armando el borrador…'; }
  let r; try { r = await api('p_agl_aviso', { red: x.red, lugar: x.lugar }, 90000); } catch (e) { if (b) { b.disabled = false; b.textContent = '✉ Generar aviso por correo (borrador)'; } return; }
  if (!r || !r.ok) { if (b) { b.disabled = false; b.textContent = '✉ Generar aviso por correo (borrador)'; } return toast((r && r.mensaje) || 'No se pudo armar el borrador.'); }
  if (b) b.outerHTML = '<a class="btn sec" style="margin:2px 0 8px" href="' + esc(r.url) + '" target="_blank" rel="noopener">✉ Abrir el borrador en Gmail ↗</a>';
  toast('Borrador listo en Gmail' + (r.para ? ' para ' + r.para : '') + (r.cc ? ', con copia a ' + r.cc : '') + '. No se envió: revisalo y envialo desde Gmail. ' + (r.aviso || ''));
}
function aguaInfCard() {
  const b = (u, t, pri) => '<a class="btn' + (pri ? '' : ' sec') + '" href="' + u + '" target="_blank" rel="noopener" style="display:inline-block;margin:4px 6px 4px 0">' + t + '</a>';
  return '<section class="card" style="grid-column:1/-1"><h2 style="margin:0 0 6px;font-size:16px">Informes de laboratorio y remitos (PDF)</h2>' +
    '<span class="mu peq" style="display:block;margin-bottom:6px">Los informes del laboratorio provincial y los remitos del Departamento de Saneamiento Básico, por red y por establecimiento. El tablero muestra el último muestreo de cada uno, si está vigente o vencido (cada 6 meses) y el enlace a cada PDF.</span>' +
    b(AGUA_INF.tablero, 'Tablero de análisis ↗', 1) + b(AGUA_INF.trelew, 'Red Trelew ↗') + b(AGUA_INF.rawson, 'Red Rawson ↗') + b(AGUA_INF.normativa, 'Normativa y POE del DPSB ↗') + b(AGUA_INF.subir, 'Subir informes nuevos ↗') +
    '</section>';
}
// ------------------------------------------------------------------ 2 · Agua · Muestreos de laboratorio: tablero (28/10/2026, pedido de Belén: «info rápida y acciones», sin abrir Sheets)
// Datos: TB.lab (Tablero.gs › AguaLab.gs), que lee las fórmulas del libro «Agua · Tablero de análisis de laboratorio».
// Parcial = solo bacteriológico cada 6 meses; completo = bacteriológico + físico-químico cada 12, previa limpieza de tanques y cisternas.
// Las reglas y los días de aviso se cambian en el libro (celdas B2, D3, F3, H3 de cada pestaña Tablero).
// Arriba: contadores (se tocan para filtrar) y accesos directos. Abajo: «Qué hacer ahora», una línea por establecimiento (se toca para ver el detalle), y «Al día».
let AGL = { lab: [], red: '', ver: '' };
function aglSet(k, v) { AGL[k] = AGL[k] === v ? '' : v; const b = document.getElementById('aglBox'); if (b) b.innerHTML = aglPintar(); }
function aglPintar() {
  const fT = v => /^\d{4}-\d{2}-\d{2}/.test(v || '') ? fechaTxt(v) : esc(v || 's/d');
  const est = x => /^solicitado|^muestra tomada/i.test(x.aviso) ? 'sol' : /urgente/i.test(x.aviso) ? 'urg' : /vencido/i.test(x.aviso) ? 'ven' : /pedir/i.test(x.aviso) ? 'aho' : 'ok';   // 02/11/2026: «Solicitado el …» (columna U del libro)
  const orden = { urg: 0, ven: 1, aho: 2, sol: 3, ok: 4 };
  const L = AGL.lab.filter(x => x.grupo !== 'Otros' && (!AGL.red || x.red === AGL.red));
  const cuenta = f => { const t = L.filter(f), r = k => AGL.lab.filter(x => x.grupo !== 'Otros' && x.red === k).filter(f).length; return [t.length, AGL.red ? '' : 'Trelew ' + r('Trelew') + ' · Rawson ' + r('Rawson')]; };
  const kp = (ver, n, t, sub, color, bg) => '<a class="kpi2" role="button" tabindex="0" onclick="aglSet(\'ver\',\'' + ver + '\')" style="cursor:pointer' + (n && bg ? ';background:' + bg : '') + (AGL.ver === ver ? ';outline:3px solid var(--az);outline-offset:-3px' : '') + '"><span>' + t + '</span><b' + (n && color ? ' style="color:' + color + '"' : '') + '>' + n + '</b><small>' + sub + '</small></a>';
  const ya = cuenta(x => /urg|ven/.test(est(x))), ahora = cuenta(x => est(x) === 'aho'), ok = cuenta(x => est(x) === 'ok'),
    noAp = cuenta(x => x.noAptas > 0), sinD = cuenta(x => !/^\d{4}/.test(x.ultimo || ''));
  const kpis = '<div class="tb5" style="margin:4px 0 14px">' +
    kp('ya', ya[0], 'Pedir ya', ya[1] || 'vencidos o con agua no apta', 'var(--er)', 'var(--erbg)') +
    kp('aho', ahora[0], 'Pedir ahora', ahora[1] || 'dentro del plazo de aviso', 'var(--wa)', 'var(--wabg)') +
    kp('ok', ok[0], 'Al día', ok[1] || 'nada que pedir todavía', 'var(--az)', '') +
    kp('noap', noAp[0], 'Con agua NO APTA', 'en el último muestreo', 'var(--er)', 'var(--erbg)') +
    kp('sind', sinD[0], 'Sin informes', 'nunca se cargó un muestreo', 'var(--mu)', '') + '</div>';
  const tab = (v, t) => '<button class="btn ' + (AGL.red === v ? 'pri' : 'sec') + '" onclick="aglSet(\'red\',\'' + v + '\')">' + t + '</button>';
  const filtro = { ya: x => /urg|ven/.test(est(x)), aho: x => est(x) === 'aho', ok: x => est(x) === 'ok', noap: x => x.noAptas > 0, sind: x => !/^\d{4}/.test(x.ultimo || '') }[AGL.ver] || (x => est(x) !== 'ok');
  const lista = L.filter(filtro).sort((a, b) => orden[est(a)] - orden[est(b)] || (a.red === b.red ? 0 : a.red === 'Trelew' ? -1 : 1) || String(a.ultimo).localeCompare(String(b.ultimo)));
  const color = { urg: 'er', ven: 'er', aho: 'wa', sol: 'ok', ok: 'ok' };
  // 02/11/2026: estado de los tanques (BASE COMÚN › RESERVORIOS, sitio de la columna AA del libro)
  const tqOk = x => !!(x.tanques && x.tanques.n && x.tanques.limpios === x.tanques.n);
  // 03/11/2026 (Belén: «no aclara lo que se solicita»): cada establecimiento dice, sin dudas, QUÉ se pide al DPSB (tipo de
  // muestreo y análisis), DÓNDE (canillas), POR QUÉ, el PLAZO y los PASOS en orden (primero limpiar, después pedir).
  const hoyI = new Date().toISOString().slice(0, 10);
  const noApL = x => (x.res || []).filter(m => /no apta/i.test(m.resultado));
  const tipoTxt = comp => comp ? 'muestreo COMPLETO: bacteriológico + físico-químico' : 'muestreo PARCIAL: solo bacteriológico';
  const qTxt = x => {
    const e = est(x), comp = /COMPLETO|URGENTE/.test(x.que), na = noApL(x);
    if (e === 'sol') return 'Pedido el ' + fT(x.solicitado) + ': ' + tipoTxt(comp) + ' · falta que el DPSB tome las muestras';
    if (/URGENTE/.test(x.que)) return '❗ Agua NO APTA' + (na.length ? ' en ' + na.map(m => m.donde).join(', ') : '') + ' (' + fT(x.ultimo) + ') · 1.º repetir la limpieza de tanques' + (tqOk(x) ? ' ✅' : '') + ' y de las griferías afectadas · 2.º pedir muestreo COMPLETO';
    if (comp) return (tqOk(x) ? '✅ Tanques limpios · pedir ' : '1.º limpiar tanques · 2.º pedir ') + tipoTxt(true);
    if (/PARCIAL/.test(x.que)) return 'Pedir ' + tipoTxt(false);
    return 'Al día · próximo: ' + (x.completo && x.parcial && x.completo <= x.parcial ? 'completo' : 'parcial') + ' desde el ' + fT(x.desde);
  };
  const limite = x => est(x) === 'ok' ? '' : /^\d{4}-/.test(x.limite) ? (x.limite >= hoyI ? 'hasta el ' + fT(x.limite) : 'venció el ' + fT(x.limite)) : '';
  const fila = x => {
    const e = est(x), comp = /COMPLETO|URGENTE/.test(x.que), urg = /URGENTE/.test(x.que), i = AGL.lab.indexOf(x), na = noApL(x);
    const cans = (x.canillas && x.canillas !== 's/d' ? x.canillas.split(' · ').map(c => c.trim()).filter(Boolean) : []);
    const donde = (comp ? ['salida del tanque', 'canilla más alejada'] : []).concat(cans.map(c => c + (na.some(m => m.donde === c) ? ' (repetir: dio no apta)' : '')));
    const lim = limite(x), rojo = urg || /limpiar tanques/i.test(qTxt(x));
    const tq = x.tanques && x.tanques.n ? x.tanques : null, limpio = tqOk(x);
    const paso = (ok, t) => '<li style="margin:3px 0">' + (ok === true ? '✅ ' : ok === 'esp' ? '⏳ ' : '⬜ ') + t + '</li>';
    const btnPedir = '<button class="btn ' + (comp && !limpio ? 'sec' : 'pri') + '" style="margin:4px 0" onclick="aglPedir(' + i + ')">📝 ' + (e === 'sol' ? 'Volver a abrir el formulario del DPSB' : 'Pedir el ' + (comp ? 'muestreo COMPLETO' : 'muestreo PARCIAL') + ' al DPSB') + ' ↗</button>';
    const btnAviso = '<button class="btn sec" style="margin:4px 0" id="aglAv' + i + '" onclick="aglAviso(' + i + ')">✉ Avisar al establecimiento (borrador)</button>';
    // 1) Qué se solicita
    const pide = e === 'ok' ? '' : '<div style="border:2px solid ' + (rojo && e !== 'sol' ? 'var(--er)' : 'var(--az)') + ';border-radius:12px;padding:10px 12px;margin:2px 0 10px;background:#fff;color:#0D313F">' +
      '<b style="font-size:14px">' + (e === 'sol' ? 'Qué se le pidió al DPSB (' + fT(x.solicitado) + ')' : 'Qué hay que pedirle al DPSB') + '</b>' +
      '<div style="margin-top:4px"><b>Qué:</b> ' + tipoTxt(comp) + '.</div>' +
      '<div><b>Dónde:</b> ' + (donde.length ? esc(donde.join(' · ')) : 's/d (completar las canillas en la columna T del Tablero)') + '.</div>' +
      '<div><b>Por qué:</b> ' + (urg ? 'el muestreo del ' + fT(x.ultimo) + ' dio NO APTA' + (na.length && na[0].recibido ? ' (resultado cargado el ' + fT(na[0].recibido) + ')' : '') + (na.length ? ' en ' + esc(na.map(m => m.donde + ' (' + (m.detalle && m.detalle !== 's/d' ? m.detalle : m.analisis) + ')').join(', ')) : '') + '. El laboratorio indica limpiar y desinfectar tanques, cisternas y cañerías y volver a muestrear. Regla de HyS para toda la red: se repite la limpieza de tanques y se limpian y desinfectan las griferías afectadas.'
        : comp ? (/^\d{4}-/.test(x.fq || '') ? 'toca el control anual completo (último físico-químico: ' + fT(x.fq) + ').' : 'nunca se hizo un físico-químico' + (/^\d{4}-/.test(x.bact || '') ? ' y el último bacteriológico es del ' + fT(x.bact) + (x.bact < hoyI.slice(0, 4) - 1 + hoyI.slice(4) ? ' (hace más de un año)' : '') : '') + ': corresponde el muestreo completo.')
        : 'toca el control de los 6 meses del muestreo del ' + fT(x.ultimo) + '.') + '</div>' +
      (lim ? '<div><b>Plazo:</b> <span style="color:' + (/venció/.test(lim) ? 'var(--er)' : 'var(--wa)') + ';font-weight:700">' + lim + (urg ? ' (15 días hábiles desde que se cargó el resultado)' : '') + '</span>' + (/venció/.test(lim) && e !== 'sol' ? ': está atrasado, hacerlo cuanto antes.' : '') + '</div>' : '') +
      // 2) Pasos en orden
      '<div style="margin-top:6px"><b>Pasos:</b><ol style="margin:4px 0 0;padding-left:18px">' +
      (comp ? paso(limpio, (urg ? 'Repetir la limpieza y desinfección de ' : 'Limpiar y desinfectar ') + (tq ? (tq.n === 1 ? 'el tanque' : 'los ' + tq.n + ' tanques') : 'tanques y cisternas') + (x.cod === 'HZT' ? ' (Javier y Paulo, con el F-AGU-01-T). ' : ' (la hace el establecimiento y la registra con el formulario de limpieza de tanques). ') +
        (limpio ? 'Hecho: última limpieza ' + fT(tq.ultima) + '.' : tq && tq.antesNoApta ? '<b style="color:var(--er)">Falta: la última limpieza (' + fT(tq.ultima) + ') es anterior al muestreo no apto.</b>' : tq ? '<b style="color:var(--er)">Falta: ' + tq.limpios + ' de ' + tq.n + ' limpios' + (tq.ultima ? ' (última ' + fT(tq.ultima) + ')' : '') + '.</b>' : '<b style="color:var(--er)">Falta: no hay tanques cargados para este lugar.</b>') + ' Sin la limpieza el DPSB no toma la muestra.') : '') +
      (urg ? paso(false, 'Limpiar y desinfectar las griferías afectadas' + (na.length ? ': <b>' + esc(na.map(m => m.donde).join(', ')) + '</b>' : '') + ' (además de los tanques).') : '') +
      paso(e === 'sol' ? true : false, (e === 'sol' ? 'Pedido al DPSB el ' + fT(x.solicitado) + '.' : 'Pedir el ' + (comp ? 'muestreo COMPLETO' : 'muestreo PARCIAL') + ' al DPSB' + (comp && !limpio ? ' <b>después</b> de limpiar' : '') + '.')) +
      paso(e === 'sol' ? 'esp' : false, 'El DPSB toma las muestras (lunes a viernes, 9 a 13 h; puede tardar hasta 10 días). Avisar al establecimiento.') +
      paso(false, 'Cuando llegue el informe, subirlo (⬆ Subir informes nuevos).') + '</ol></div>' +
      '<div style="margin-top:6px">' + btnPedir + ' ' + btnAviso + '</div>' +
      '<small class="mu" style="display:block;margin-top:4px">Si el formulario aparece con campos vacíos o con datos de otro establecimiento, es un borrador sin enviar que guardó Google: abajo de todo tocá «Borrar formulario» y volvé a tocar el botón.</small></div>';
    return '<details class="aglF" style="border-top:1px solid #EEF2F4"><summary style="list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:10px 4px;align-items:center">' +
      '<span><b style="font-size:14.5px">' + esc(x.lugar) + '</b> <span class="mu peq">· red ' + esc(x.red) + '</span><small style="display:block;color:' + (rojo && e !== 'sol' ? 'var(--er)' : '#0D313F') + ';font-weight:' + (rojo && e !== 'sol' ? '700' : '600') + '">' + esc(qTxt(x)) + '</small></span>' +
      '<span style="text-align:right"><span class="chip ' + color[e] + '">' + esc(e === 'sol' ? 'Pedido · esperando' : x.aviso || 's/d') + '</span>' + (lim ? '<small style="display:block;margin-top:3px;font-weight:700;color:' + (/venció/.test(lim) ? 'var(--er)' : 'var(--wa)') + '">' + lim + '</small>' : '') + '</span></summary>' +
      '<div class="mu peq" style="padding:0 4px 12px;line-height:1.55">' + pide +
      // 3) Lo que ya se sabe: último muestreo y resultado de cada muestra
      '<b>Último muestreo:</b> ' + fT(x.ultimo) + (x.muestras ? ' (' + x.muestras + ' muestra' + (x.muestras > 1 ? 's' : '') + (x.noAptas ? ', <b style="color:var(--er)">' + x.noAptas + ' no apta' + (x.noAptas > 1 ? 's' : '') + '</b>' : '') + ')' : '') +
      (x.res && x.res.length ? '<span style="display:block;margin:4px 0 2px">' + x.res.map(m => { const no = /no apta/i.test(m.resultado), sc = /sin conclus/i.test(m.resultado);
        return '<span style="display:block;padding:3px 0">' + (no ? '❌' : sc ? '❔' : '✅') + ' <b>' + esc(m.donde) + '</b> · ' + esc(m.analisis) + ' · <b style="color:' + (no ? 'var(--er)' : sc ? 'var(--wa)' : '#1E6B3A') + '">' + esc(m.resultado) + '</b>' +
          (m.detalle && m.detalle !== 's/d' ? ' <span class="mu">(' + esc(m.detalle) + ')</span>' : '') + ' · <span class="mu">N.º ' + esc(m.nro) + '</span>' + (m.url ? ' · <a href="' + esc(m.url) + '" target="_blank" rel="noopener">Ver informe ↗</a>' : '') + '</span>'; }).join('') + '</span>' : '<br>') +
      (x.sinConclusion ? '<b>' + x.sinConclusion + ' muestra(s) sin conclusión:</b> consultar al DPSB.<br>' : '') +
      (urg ? '<span>Cuando el nuevo muestreo dé apta, se retoma el calendario: parcial cada 6 meses y completo cada 12.</span>'
        : e !== 'ok' && e !== 'sol' && !(/^\d{4}-/.test(x.parcial || '') && x.parcial >= hoyI) ? '<span>Cuando llegue el informe de este muestreo, se arma el calendario: parcial cada 6 meses y completo cada 12.</span>'
        : '<b>Calendario:</b> próximo parcial ' + fT(x.parcial) + ' · próximo completo ' + (/^\d{4}-/.test(x.completo || '') ? fT(x.completo) : 'todavía no hay ninguno hecho') + ' <span class="mu">(último bacteriológico ' + fT(x.bact) + ' · último físico-químico ' + fT(x.fq) + ')</span>') +
      '</div></details>';
  };
  const titulo = { ya: 'Pedir ya', aho: 'Pedir ahora', ok: 'Al día', noap: 'Con agua NO APTA', sind: 'Sin informes' }[AGL.ver] || 'Qué hacer ahora';
  const resto = AGL.ver ? [] : L.filter(x => est(x) === 'ok');
  return kpis + '<div class="tabs" style="margin-bottom:8px">' + tab('', 'Todas las redes') + tab('Trelew', 'Red Trelew') + tab('Rawson', 'Red Rawson') +
    (AGL.ver ? '<button class="link" onclick="aglSet(\'ver\',\'' + AGL.ver + '\')" style="margin-left:6px">Quitar filtro «' + titulo + '»</button>' : '') + '</div>' +
    '<h3 style="margin:10px 0 0;font-size:15px">' + titulo + ' (' + lista.length + ')</h3><span class="mu peq">Tocá un establecimiento para ver canillas, fechas y qué hacer antes.</span>' +
    '<div style="max-height:620px;overflow-y:auto;margin-top:4px">' + (lista.length ? lista.map(fila).join('') : '<div class="mu" style="padding:10px 4px">Nada para mostrar.</div>') + '</div>' +
    (resto.length ? '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Al día (' + resto.length + ') · cuándo pedir el próximo</summary>' + resto.sort((a, b) => String(a.desde).localeCompare(String(b.desde))).map(fila).join('') + '</details>' : '');
}
function aguaLabCard(lab, labError) {
  AGL.lab = Array.isArray(lab) ? lab : [];
  const b = (u, t, pri) => '<a class="btn' + (pri ? ' pri' : ' sec') + '" href="' + u + '" target="_blank" rel="noopener" style="margin:0 6px 6px 0">' + t + '</a>';
  const accesos = '<div style="display:flex;flex-wrap:wrap;margin-top:10px">' + b(AGUA_INF.dpsb, '📝 Pedir muestreo al DPSB (formulario) ↗', 1) + b(AGUA_INF.subir, '⬆ Subir informes nuevos', 1) + b(AGUA_INF.trelew, 'Informes red Trelew ↗') + b(AGUA_INF.rawson, 'Informes red Rawson ↗') +
    b('https://hyslhmh-sudo.github.io/manifiestos/mipyv/F-AGU-01-T.pdf', 'Formulario de limpieza de tanques ↗') + b(AGUA_INF.normativa, 'Normativa y POE del DPSB ↗') + b(AGUA_INF.tablero, 'Planilla (respaldo) ↗') + '</div>';
  const como = '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Cómo pedir cada muestreo</summary><div class="mu peq" style="margin-top:6px;line-height:1.5">' +
    '<b>Muestreo completo</b> (una vez por año; también después de una muestra NO APTA): ' +
    '1) Higiene y Seguridad hace limpiar y desinfectar tanques y cisternas (red Trelew: POE-AGU-001 propio; Javier y Paulo lo registran en la app MIP con la foto del F-AGU-01 firmado). Sin limpieza previa el DPSB no toma la muestra (Nota DPSB 34/26). ' +
    '2) Higiene y Seguridad completa la «Solicitud de Muestreo de Agua para Análisis» (botón «Pedir muestreo al DPSB») pidiendo «Ambos» (microbiológico y fisicoquímico). Una muestra por canilla: al terminar cada una, «¿Desea agregar otra muestra?» Sí. ' +
    '3) Puntos: salida del tanque y canilla más alejada, más las canillas de siempre. 4) La muestra llega al laboratorio refrigerada y dentro de las 24 h.<br>' +
    '<b>Muestreo parcial de 6 meses</b>: solo bacteriológico («Análisis Microbiológico» en el formulario), en las mismas canillas del último muestreo.<br>' +
    '<b>Más rápido</b>: tocá el establecimiento y «Pedir este muestreo al DPSB»: se abre el formulario del DPSB ya completo (remitente, dirección, una muestra por canilla, tipo de análisis y «Secretaría de Salud»). Revisalo, completá lo que falte y tocá «Enviar». El portal anota solo la fecha en «Solicitado el» y el lugar queda «Solicitado, esperando el resultado». Los datos se corrigen en la planilla: pestaña «Formulario DPSB» (CUIT, responsable, contacto, correo) y columnas V a Y del Tablero de cada red (institución, dirección, localidad, tipo de agua).<br>' +
    '<b>Aviso al establecimiento</b>: «✉ Generar aviso por correo (borrador)» deja en Gmail un borrador (no se envía solo) para el correo del establecimiento (columna Z del Tablero) con copia al Área Externa si es un CAPS de la red Trelew, avisando que se pidió el muestreo parcial o completo, los puntos y el pedido de que avisen el día de la toma de muestras. El texto se cambia en la pestaña «Formulario DPSB».<br>' +
    '<b>Si lo pedís con el botón general</b> (formulario en blanco): después anotá la fecha en la planilla, pestaña del Tablero de la red, columna «Solicitado el».<br>' +
    '<b>Si sale NO APTA</b>: limpieza y desinfección y nueva muestra en no más de 15 días hábiles (POE DPSB 10.7).<br>' +
    'Avisos: el parcial aparece para pedir 30 días antes; el completo, 45 días antes (para dar tiempo a la limpieza). ' +
    '<b>Depende de HyS</b>: la limpieza y desinfección de tanques y cisternas, la solicitud al DPSB y el seguimiento. <b>Depende del establecimiento</b>: facilitar el acceso el día del muestreo y las reparaciones que hagan falta.<br>' +
    'Informes nuevos: subirlos a «Subir informes nuevos»; Claude los ordena, los carga y actualiza este tablero.</div></details>';
  const sinDatos = !AGL.lab.length;
  return '<section class="card" style="grid-column:1/-1"><h2 style="margin:0 0 2px;font-size:17px">Muestreos de laboratorio</h2>' +
    '<span class="mu peq" style="display:block">Parcial cada 6 meses (solo bacteriológico) · completo cada 12 (bacteriológico + físico-químico, con limpieza previa de tanques). Dto. 351/79 art. 57 y POE del DPSB. Red Trelew y red Rawson por separado. Tocá un número para filtrar.</span>' +
    (sinDatos ? '<div class="aviso" style="margin-top:10px">' + (labError ? 'No se pudo leer el tablero de análisis: ' + esc(labError) + '. ' : 'Todavía no llegan los datos de los muestreos: tocá «Actualizar» en el Inicio. ') + 'Mientras tanto, el detalle está en la <a href="' + AGUA_INF.tablero + '" target="_blank" rel="noopener">planilla ↗</a>.</div>'
      : '') + accesos + (sinDatos ? '' : '<div id="aglBox" style="margin-top:4px">' + aglPintar() + '</div>') + como + '</section>';
}
async function agua(modo) {
  if (modo === 'plagas') return pantallaPlagas();
  modo = 'agua'; const R = '#' + modo;
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } else { cargando(R, 'Leyendo establecimientos…'); try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  if (!TB) TB = LS.get('tab', null);
  if (!TB || TB.vacio) { cargando(R, 'Leyendo…'); try { TB = await api('p_tablero', {}, 240000); LS.set('tab', TB); } catch (e) { return; } }
  const nom = c => ((RES && RES.filas.find(f => f.cod === c)) || {}).nombre || c, hoy = new Date().toISOString().slice(0, 10);
  const porEst = {}; TB.tanques.forEach(t => { const x = porEst[t.cod] = porEst[t.cod] || { t: 0, ok: 0 }; x.t++; if (t.aldia) x.ok++; });
  const A = FILTRO.area, todos = RES ? RES.filas.filter(f => /^activ/i.test(f.estado) && (!A || f.area === A)) : [], areas = RES ? Array.from(new Set(RES.filas.map(f => f.area))).filter(Boolean).sort() : [];
  const enA = c => !A || (RES && (RES.filas.find(f => f.cod === c) || {}).area === A);
  const listaT = todos.map(f => f.cod).concat(Object.keys(porEst).filter(c => !RES || !RES.filas.some(f => f.cod === c))).sort((a, b) => (porEst[b] ? 1 : 0) - (porEst[a] ? 1 : 0) || nom(a).localeCompare(nom(b), 'es'));
  const conInv = listaT.filter(c => porEst[c]).length;
  const fila = (a, b, c) => '<a class="at" href="' + c + '"><span><b>' + a + '</b><small>' + b + '</small></span></a>';
  const noApta = TB.noApta.filter(a => enA(a.cod)), plagas = TB.plagas.filter(p => enA(p.cod));
  const pe = {}; (TB.puntos || []).filter(p => enA(p.cod)).forEach(p => { const x = pe[p.cod] = pe[p.cod] || { t: 0, aldia: 0, porvencer: 0, vencida: 0, sin: 0, unica: 0 }; x.t++; x[p.estado in x ? p.estado : 'sin']++; });
  const ptoEst = Object.keys(pe).sort((a, b) => nom(a).localeCompare(nom(b), 'es')).map(c => [c, pe[c]]);
  const cuerpo = modo === 'agua'
    ? aguaLabCard(TB.lab, TB.labError) + '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Relevamiento de edificios · red Trelew</h2><span class="mu peq" style="display:block;margin-bottom:8px">Agua, desagües, canaletas y techos de cada lugar, cargados por Javier y Paulo desde la app MIP.</span><a class="btn sec" href="#edif">Ver el relevamiento</a></section>' + '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Agua NO APTA abierta</h2>' + (noApta.length ? noApta.map(a => fila(esc(nom(a.cod)) + ' · ' + esc(a.punto), 'Nueva muestra antes del ' + fechaTxt(a.limite), '#ficha/' + encodeURIComponent(a.cod) + '/agua')).join('') : '<div class="mu">Ninguna.</div>') + '</section>' +
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Tanques por establecimiento</h2><span class="mu peq" style="display:block;margin-bottom:6px">' + conInv + ' de ' + listaT.length + ' habilitados con inventario cargado' + (A ? ' en ' + esc(A) : '') + '.</span><div style="max-height:560px;overflow-y:auto">' + listaT.map(c => fila(esc(nom(c)), porEst[c] ? porEst[c].ok + ' de ' + porEst[c].t + ' con limpieza al día' : '<span style="color:#B4361F;font-weight:700">Sin inventario de tanques cargado · pendiente</span>', '#ficha/' + encodeURIComponent(c) + '/agua')).join('') + '</div><span class="mu peq" style="display:block;margin-top:8px">Solo los establecimientos habilitados en la aplicación; primero los que ya cargaron tanques. Cada uno tiene su propio inventario, por sitio (edificio, dispositivos y CAPS).</span></section>' +
      // Canillas (puntos de muestreo) y su último análisis bacteriológico (cada 6 meses, Dto. 351/79): TB.puntos (Tablero.gs)
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Canillas y análisis por establecimiento</h2>' + ((ptoEst.length || todos.length) ? '<span class="mu peq" style="display:block;margin-bottom:6px">Puntos de muestreo con su análisis bacteriológico (cada 6 meses) y físico-químico (cada 12). Detalle, resultados e informes en la ficha › Agua.</span>' +
        todos.filter(f => !pe[f.cod]).map(f => fila(esc(nom(f.cod)), '<span style="color:#B4361F;font-weight:700">Sin canillas (puntos de muestreo) cargadas · pendiente</span>', '#ficha/' + encodeURIComponent(f.cod) + '/agua')).join('') +
        ptoEst.map(([c, x]) => fila(esc(nom(c)), x.t + (x.t > 1 ? ' canillas' : ' canilla') + ' · ' + [[x.aldia, 'al día'], [x.porvencer, 'por vencer'], [x.vencida, 'vencidas'], [x.sin, 'sin análisis'], [x.unica, 'muestra única']].filter(y => y[0]).map(y => y[0] + ' ' + y[1]).join(' · '), '#ficha/' + encodeURIComponent(c) + '/agua')).join('')
        : '<div class="mu">Ningún establecimiento cargó todavía sus canillas (puntos de muestreo).</div>') + '<a class="btn sec" href="#modelos" id="invModelo" style="margin-top:10px;display:inline-block">Modelo para relevar el inventario de agua</a><a class="btn sec" href="https://drive.google.com/file/d/1dnesnwjfMgHOgayv_NqGjm96-SZ144qf/view" target="_blank" rel="noopener" style="margin:10px 0 0 8px;display:inline-block">Formulario F-AGU-01 de limpieza de tanques</a><span class="mu peq" style="display:block;margin-top:6px">Planilla para completar los tanques, cisternas y canillas de cualquier establecimiento. Al volver se carga desde «Bandeja de entrada». El formulario F-AGU-01 se imprime, se firma y se sube la foto en la ficha del establecimiento › Agua.</span></section>'
    : '<section class="card" id="mipyvBox" style="grid-column:1/-1"><h2 style="margin:0 0 6px;font-size:16px">Registro MIPyV (operarios de la red Trelew)</h2><div class="mu">Leyendo…</div></section>' +
      '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Avisos de los establecimientos (casos abiertos)</h2>' + (plagas.length ? plagas.map(p => fila(esc(nom(p.cod)) + ' · ' + esc(p.plaga), esc(p.caso) + (p.revision ? ' · revisión ' + fechaTxt(p.revision) + (p.revision < hoy ? ' (atrasada)' : '') : ' · sin intervención'), '#ficha/' + encodeURIComponent(p.cod) + '/plagas')).join('') : '<div class="mu">Ninguno.</div>') + '</section>';
  marco(R, '<div class="cab"><div><span class="mu peq">' + (modo === 'agua' ? '2 · Agua' : '3 · Plagas') + '</span><h1>' + (modo === 'agua' ? 'Agua en la red' : 'Plagas en la red') + '</h1><span class="mu peq">' + (modo === 'agua' ? 'Lo cargan los establecimientos desde «Mi establecimiento». Detalle en la ficha de cada uno.' : 'Lo cargan los operarios desde la app MIPyV y los establecimientos desde «Mi establecimiento» (avisos).') + '</span></div>' +
    '<div class="filtros"><label class="f">Área<select class="c" id="agA"><option value="">Toda la provincia</option>' + areas.map(a => '<option' + (a === A ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label></div></div>' +
    '<div class="tb3">' + cuerpo + '</div>');
  $('agA').onchange = e => { FILTRO.area = e.target.value; agua(modo); };
  if ($('invModelo')) $('invModelo').onclick = () => { MOD.tipo = 'INVENTARIO_AGUA'; };
  if (modo === 'plagas') mipyv();
}
// ------------------------------------------------------------------ 3 · Plagas (26/10/2026: tablero con gráficos, fechas y horarios claros)
// Lee el registro MIPyV (Modulo5.gs › p_mipyv): lo cargan los operarios desde su app; acá se ve, se revisa y se cierran casos.
function pantallaPlagas() {
  marco('#plagas', '<div class="cab"><div><span class="mu peq">3 · Plagas</span><h1>Plagas, saneamiento y trabajos de HyS</h1><span class="mu peq">Lo que cargan Javier y Paulo en la app MIP: plagas, saneamiento, otros trabajos de HyS y pedidos. Fechas en hora de Argentina.</span></div>' +
    '<div class="filtros"><a class="btn sec" href="#plghs">Control de horas</a><button class="btn sec" id="mpAct">Actualizar</button><a class="btn sec" id="mpLib" href="#" target="_blank" rel="noopener" hidden>Libro MIPyV ↗</a></div></div>' +
    '<div id="mipyvBox"><section class="card"><div class="mu">Leyendo el registro MIPyV…</div></section></div>' +
    '<style>#mipyvBox .filtros select{max-width:100%}@media (max-width:760px){.mpT thead{display:none}.mpT,.mpT tbody,.mpT tr,.mpT td{display:block;width:100%}.mpT tr{border-top:1px solid var(--ln);padding:10px 0}.mpT td{border:0!important;padding:2px 0!important}.mpT td:empty{display:none}.mpT td[data-l]::before{content:attr(data-l) ": ";color:var(--mu);font-weight:600}#mipyvBox .filtros,#mipyvBox .filtros label.f{width:100%}#mipyvBox .filtros select{width:100%}}</style>');
  $('mpAct').onclick = () => mipyv(true);
  mipyv();
}
let MIPYV = null, MPF = { lugar: '', plaga: '', sinRev: false };
const MP_DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// Fecha legible: acepta 2026-10-21, 2026-10-21T14:05 (hora local) o 2026-10-21T17:05:00.000Z (hora universal → Argentina)
function mpF(s, conHora) {
  const t = String(s || '').trim(); if (!t) return '—';
  let d;
  if (/Z$/.test(t)) d = new Date(t);
  else { const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); if (!m) return esc(t); d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)); if (!m[4]) conHora = false; }
  if (isNaN(d)) return esc(t);
  const dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  return MP_DIAS[d.getDay()] + ' ' + dd + (conHora ? ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' h' : '');
}
// «8:00 a 14:15» → «08:00 a 14:15 · 6,25 h»
function mpHorario(h) {
  const m = String(h || '').match(/(\d{1,2})[:.](\d{2}).*?(\d{1,2})[:.](\d{2})/); if (!m) return '';
  const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4], hs = (b - a) / 60, p = n => String(n).padStart(2, '0');
  return p(m[1]) + ':' + m[2] + ' a ' + p(m[3]) + ':' + m[4] + (hs > 0 ? ' · ' + String(Math.round(hs * 100) / 100).replace('.', ',') + ' h' : '');
}
const mpRes = r => /^resuelto/i.test(r || '') ? '<span class="chip ok mini">Resuelto</span>' : /otra visita/i.test(r || '') ? '<span class="chip wa mini">Pide otra visita</span>' : r ? '<span class="chip gr mini">' + esc(r) + '</span>' : '';
const mpRev = r => /^revisad/i.test(String(r || '')) ? '<span class="chip ok mini" title="' + esc(r) + '">Revisada</span>' : '<span class="chip er mini">Sin revisar</span>';
// Barras verticales por semana (lunes a domingo), apiladas por resultado
function mpSemanas(visitas) {
  const lunes = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const hoy = lunes(new Date()), N = 12, sem = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(hoy); d.setDate(d.getDate() - 7 * i); sem.push({ d: d, r: 0, o: 0, x: 0 }); }
  visitas.forEach(v => { const m = String(v.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return; const l = lunes(new Date(+m[1], +m[2] - 1, +m[3])).getTime(), s = sem.find(z => z.d.getTime() === l); if (!s) return;
    if (/^resuelto/i.test(v.resultado || '')) s.r++; else if (/otra visita/i.test(v.resultado || '')) s.o++; else s.x++; });
  const W = 460, H = 210, x0 = 26, b = 172, max = Math.max(4, ...sem.map(s => s.r + s.o + s.x)), k = 150 / max, paso = (W - x0 - 8) / N, bw = Math.min(30, paso - 12);
  let g = ''; [0, .5, 1].forEach(f => { const v = Math.round(max * f), y = b - v * k; g += '<line x1="' + x0 + '" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#D6DEE2"/><text x="' + (x0 - 6) + '" y="' + (y + 4) + '" font-size="11" fill="#5B6B73" text-anchor="end">' + v + '</text>'; });
  sem.forEach((s, i) => { const x = x0 + 8 + i * paso, t = s.r + s.o + s.x, et = String(s.d.getDate()).padStart(2, '0') + '/' + String(s.d.getMonth() + 1).padStart(2, '0');
    let y = b; const rect = (n, c) => { if (!n) return ''; y -= n * k; return '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + n * k + '" fill="' + c + '"/>'; };
    g += '<g><title>Semana del ' + et + ': ' + t + ' visita(s) · ' + s.r + ' resueltas · ' + s.o + ' piden otra visita' + (s.x ? ' · ' + s.x + ' otras' : '') + '</title>' + rect(s.r, '#5894A7') + rect(s.o, '#0D313F') + rect(s.x, '#B9C7CD') + '</g>' +
      (t ? '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" font-size="11" font-weight="700" fill="#33424A" text-anchor="middle">' + t + '</text>' : '') +
      '<text x="' + (x + bw / 2) + '" y="' + (b + 16) + '" font-size="10.5" fill="#5B6B73" text-anchor="middle">' + et + '</text>'; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Visitas por semana">' + g + '</svg>';
}
const mpTop = (arr, n) => { const c = {}; arr.forEach(x => { if (x) c[x] = (c[x] || 0) + 1; }); return Object.keys(c).map(k => [k, c[k]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, n); };
// «Qué hicieron» (26/10/2026): visitas de plagas y avances de saneamiento agrupados por día, con lugar, horario, tareas y operarios
let MPA = 'semana';
const MP_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mpDia = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const mpYmd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function mpRango(p) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0); const lun = new Date(hoy); lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7)); const mas = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  if (p === 'hoy') return [hoy, hoy, 'Hoy'];
  if (p === 'ayer') return [mas(hoy, -1), mas(hoy, -1), 'Ayer'];
  if (p === 'semana') return [lun, hoy, 'Esta semana (desde el lunes ' + String(lun.getDate()).padStart(2, '0') + '/' + String(lun.getMonth() + 1).padStart(2, '0') + ')'];
  if (p === 'pasada') return [mas(lun, -7), mas(lun, -1), 'Semana pasada (lunes ' + String(mas(lun, -7).getDate()).padStart(2, '0') + '/' + String(mas(lun, -7).getMonth() + 1).padStart(2, '0') + ' a domingo ' + String(mas(lun, -1).getDate()).padStart(2, '0') + '/' + String(mas(lun, -1).getMonth() + 1).padStart(2, '0') + ')'];
  if (p === 'todo') return [new Date(2000, 0, 1), hoy, 'Todo el historial'];
  const mm = String(p).match(/^m:(\d{4})-(\d{2})$/); if (mm) { const d1 = new Date(+mm[1], +mm[2] - 1, 1); return [d1, new Date(+mm[1], +mm[2], 0), MP_MESES[+mm[2] - 1] + ' de ' + mm[1]]; }
  return [mas(hoy, -29), hoy, 'Últimos 30 días'];
}
function mpActividad(V, A, sinAvances, T) {
  T = T || [];
  const box = $('mpHizo'); if (!box) return;
  const [d1, d2, tit] = mpRango(MPA), a = mpYmd(d1), b = mpYmd(d2);
  const items = V.filter(v => v.fecha >= a && v.fecha <= b).map(v => ({ t: 'v', f: v.fecha, o: v, ini: (String(v.horario).match(/(\d{1,2})[:.](\d{2})/) || []).slice(1).join(':') }))
    .concat(A.filter(x => x.fecha >= a && x.fecha <= b).map(x => ({ t: 'a', f: x.fecha, o: x, ini: (String(x.horario).match(/(\d{1,2})[:.](\d{2})/) || []).slice(1).join(':') })))
    .concat(T.filter(x => x.fecha >= a && x.fecha <= b).map(x => ({ t: 't', f: x.fecha, o: x, ini: (String(x.horario).match(/(\d{1,2})[:.](\d{2})/) || []).slice(1).join(':') })))
    .sort((x, y) => y.f.localeCompare(x.f) || String(x.ini).padStart(5, '0').localeCompare(String(y.ini).padStart(5, '0')));
  const dias = {}; items.forEach(i => (dias[i.f] = dias[i.f] || []).push(i));
  const lugares = new Set(items.map(i => i.o.lugar).filter(Boolean)), nV = items.filter(i => i.t === 'v').length, nA = items.filter(i => i.t === 'a').length, nT = items.filter(i => i.t === 't').length;
  const per = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana'], ['pasada', 'Semana pasada'], ['30', 'Últimos 30 días'], ['todo', 'Todo el historial']];
  const meses = Array.from(new Set(V.concat(A, T).map(x => String(x.fecha || '').slice(0, 7)).filter(x => /^\d{4}-\d{2}$/.test(x)))).sort().reverse();
  const cuenta = m => V.concat(A, T).filter(x => String(x.fecha || '').slice(0, 7) === m).length;
  const ultimo = !items.length ? V.concat(A, T).map(x => x.fecha).filter(Boolean).sort().pop() : '';
  const fila = i => { const o = i.o, op = esc(o.operario || '') + (o.acompanante ? ' y ' + esc(o.acompanante) : ''), hr = o.horario ? esc(mpHorario(o.horario) || o.horario) : 'sin horario';
    if (i.t === 'v') return '<div class="at cl" data-hv="' + V.indexOf(o) + '" style="cursor:pointer;align-items:flex-start"><span style="min-width:0"><b>' + esc(o.lugar || '—') + (o.sector ? ' · <span style="font-weight:600">' + esc(o.sector) + '</span>' : '') + '</b>' +
      '<small style="display:block"><span class="chip gr mini">Plagas</span> ' + esc(o.plaga || '—') + (o.producto ? ' · ' + esc(o.producto) : '') + '</small>' + (o.motivo ? '<small class="mu" style="display:block">' + esc(String(o.motivo).slice(0, 220)) + '</small>' : '') +
      '<small class="mu" style="display:block">' + hr + ' · ' + op + '</small></span><span style="flex:none">' + mpRes(o.resultado) + '</span></div>';
    if (i.t === 't') return '<div class="at cl" data-ht="' + T.indexOf(o) + '" style="cursor:pointer;align-items:flex-start"><span style="min-width:0"><b>' + esc(o.lugar || '—') + '</b>' +
      '<small style="display:block"><span class="chip gr mini">' + esc(o.cat || 'Otros trabajos HyS') + '</span> ' + esc(o.tipo || (o.cat ? '' : '—')) + '</small>' + (o.detalle ? '<small class="mu" style="display:block">' + esc(String(o.detalle).slice(0, 220)) + (String(o.detalle).length > 220 ? '…' : '') + '</small>' : '') +
      (o.hallazgos ? '<small style="display:block;color:var(--er)">Hallazgos: ' + esc(String(o.hallazgos).slice(0, 160)) + '</small>' : '') + '<small class="mu" style="display:block">' + hr + ' · ' + op + '</small></span><span style="flex:none">' + (o.otro ? '' : mpRev(o.revisado)) + '</span></div>';
    return '<div class="at cl" data-ha="' + A.indexOf(o) + '" style="cursor:pointer;align-items:flex-start"><span style="min-width:0"><b>' + esc(o.lugar || '—') + '</b>' +
      '<small style="display:block"><span class="chip gr mini">Saneamiento</span> ' + esc(o.tareas || '—') + (o.producto ? ' · ' + esc(o.producto) : '') + '</small>' + (o.detalle ? '<small class="mu" style="display:block">' + esc(String(o.detalle).slice(0, 220)) + (String(o.detalle).length > 220 ? '…' : '') + '</small>' : '') +
      '<small class="mu" style="display:block">' + hr + ' · ' + op + '</small></span><span style="flex:none">' + (/cerr|final|termin/i.test(o.cierre || '') ? '<span class="chip ok mini">Trabajo terminado</span>' : '<span class="chip wa mini">Continúa</span>') + '</span></div>'; };
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><div><h2 style="margin:0 0 2px;font-size:16px">Qué hicieron y dónde</h2><div class="mu peq">' + esc(tit) + ' · todo lo que cargan en la app MIP, día por día: plagas, saneamiento, otros trabajos de HyS, relevamientos de edificios, tanques, casos cerrados y solicitudes. Tocá una fila para ver todo el detalle y las fotos.</div></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' + per.map(p => '<button class="btn ' + (p[0] === MPA ? 'pri' : 'sec') + '" data-mpa="' + p[0] + '" style="padding:6px 10px;font-size:13px">' + p[1] + '</button>').join('') + '<select class="c" id="mpMes" style="padding:6px 8px;font-size:13px;width:auto"><option value="">Elegir un mes…</option>' + meses.map(m => '<option value="m:' + m + '"' + ('m:' + m === MPA ? ' selected' : '') + '>' + MP_MESES[+m.slice(5) - 1] + ' ' + m.slice(0, 4) + ' (' + cuenta(m) + ')</option>').join('') + '</select></div></div>' +
    (items.length ? '<div class="peq" style="margin:4px 0 10px"><b>' + nV + '</b> de plagas · <b>' + nA + '</b> de saneamiento · <b>' + nT + '</b> otros trabajos de HyS, relevamientos, tanques y avisos · <b>' + lugares.size + '</b> lugar(es) · <b>' + Object.keys(dias).length + '</b> día(s) con registros</div>' +
      Object.keys(dias).sort().reverse().map(f => '<h3 style="margin:14px 0 4px;font-size:14px;border-bottom:1px solid var(--ln);padding-bottom:4px">' + mpF(f) + ' <span class="mu peq" style="font-weight:400">· ' + dias[f].length + ' registro(s) · ' + Array.from(new Set(dias[f].map(i => i.o.lugar).filter(Boolean))).map(esc).join(', ') + '</span></h3>' + dias[f].map(fila).join('')).join('')
      : '<div class="mu" style="padding:8px 0">No cargaron registros en este período.' + (ultimo ? ' El último registro es del ' + mpF(ultimo) + '.' : '') + '</div>') +
    (sinAvances ? '<div class="mu peq" style="margin-top:8px">El saneamiento y los otros trabajos de HyS aparecen cuando se implementa la versión nueva del Apps Script.</div>' : '');
  box.querySelectorAll('[data-mpa]').forEach(x => x.onclick = () => { MPA = x.dataset.mpa; mpActividad(V, A, sinAvances, T); });
  const sm = $('mpMes'); if (sm) sm.onchange = () => { if (sm.value) { MPA = sm.value; mpActividad(V, A, sinAvances, T); } };
  box.querySelectorAll('[data-ht]').forEach(x => x.onclick = () => mpTareaVer(T[Number(x.dataset.ht)]));
  box.querySelectorAll('[data-hv]').forEach(x => x.onclick = () => mipyvVer(V[Number(x.dataset.hv)]));
  box.querySelectorAll('[data-ha]').forEach(x => x.onclick = () => mpAvanceVer(A[Number(x.dataset.ha)]));
}
function mpTareaVer(x) {
  const dd = (t, v) => v ? '<dt>' + t + '</dt><dd>' + v + '</dd>' : '';
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Trabajo de HyS"><h2>' + esc(x.cat ? x.cat + (x.tipo ? ' · ' + x.tipo : '') : (x.tipo || 'Trabajo de HyS')) + ' · ' + mpF(x.fecha) + '</h2><dl class="dl">' +
    dd('Lugar', esc(x.lugar || '')) + dd('Operarios', esc(x.operario || '') + (x.acompanante ? ' y ' + esc(x.acompanante) : '') + (x.horario ? ' · ' + esc(mpHorario(x.horario) || x.horario) : '')) +
    dd(x.otro ? 'Resumen' : 'Qué se hizo', esc(x.detalle).replace(/\n/g, '<br>')) + dd('Hallazgos', esc(x.hallazgos).replace(/\n/g, '<br>')) + dd('Observaciones', esc(x.obs).replace(/\n/g, '<br>')) +
    dd('Fotos', (x.fotos || []).map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + ' ↗</a>').join(' · ')) + (x.otro ? dd('Detalle completo', 'En su hoja del libro MIPyV (o en el sistema HyS: tanques en la BASE COMÚN). Todo junto: hoja «TODO LO CARGADO».') : dd('Revisión HyS', esc(x.revisado || 'Sin revisar'))) + '</dl>' +
    '<div class="acciones"><div></div><button class="btn sec" id="mpCer">Cerrar</button></div></div>';
  $('ov').hidden = false; $('mpCer').onclick = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
}
function mpAvanceVer(x) {
  const dd = (t, v) => v ? '<dt>' + t + '</dt><dd>' + v + '</dd>' : '';
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Avance de saneamiento"><h2>Saneamiento del ' + mpF(x.fecha) + ' · ' + esc(x.lugar || '') + '</h2><dl class="dl">' +
    dd('Operarios', esc(x.operario || '') + (x.acompanante ? ' y ' + esc(x.acompanante) : '') + (x.horario ? ' · ' + esc(mpHorario(x.horario) || x.horario) : '')) + dd('Tareas', esc(x.tareas)) + dd('Detalle', esc(x.detalle).replace(/\n/g, '<br>')) +
    dd('Notas', esc(x.notas).replace(/\n/g, '<br>')) + dd('Biocida', esc(x.producto)) + dd('Estado del trabajo', esc(x.cierre)) + dd('Fotos', (x.fotos || []).map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + ' ↗</a>').join(' · ')) + '</dl>' +
    '<div class="acciones"><div></div><button class="btn sec" id="mpCer">Cerrar</button></div></div>';
  $('ov').hidden = false; $('mpCer').onclick = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
}
async function mipyv(fresco) {
  const box = $('mipyvBox'); if (!box) return;
  if (!MIPYV || fresco) { if (fresco) box.insertAdjacentHTML('afterbegin', '<div class="aviso" id="mpLeyendo" style="margin-bottom:12px">Actualizando…</div>');
    try { MIPYV = await api('p_mipyv', { fresco: !!fresco }, 120000); } catch (e) { box.innerHTML = '<section class="card"><div class="aviso error">No se pudo leer el registro MIPyV.</div></section>'; return; } }
  const R = MIPYV; if (!R.ok) { box.innerHTML = '<section class="card"><div class="aviso error">' + esc(R.mensaje || 'Error') + '</div></section>'; return; }
  const lib = $('mpLib'); if (lib && R.libro) { lib.href = R.libro.replace(/#.*$/, '') + '#gid=900001'; lib.hidden = false; }
  const C = Array.isArray(R.casos) ? R.casos.slice().sort((a, b) => a.dias - b.dias) : null, S = R.solicitudes || [], VT = R.visitas || [], h90 = mpYmd(new Date(Date.now() - 90 * 864e5)), V = VT.filter(v => v.fecha >= h90);
  const lugarDe = o => o.lugar || o.establecimiento || (o.cod ? o.cod + (o.sitio ? ' · ' + o.sitio : '') : '');
  const vencidos = C ? C.filter(c => c.dias < 0).length : R.vencidos.length, porVencer = C ? C.filter(c => c.dias >= 0 && c.urgente).length : 0;
  const pend = S.filter(x => x.estado === 'Pendiente').length, sinRev = V.filter(v => !/^revisad/i.test(String(v.revisado))).length;
  const kp = (href, n, t, sub, alerta) => '<a class="kpi2" role="button" tabindex="0" data-ir="' + href.slice(1) + '" style="cursor:pointer' + (alerta && n ? ';background:var(--erbg)' : '') + '"><span>' + t + '</span><b' + (alerta && n ? ' style="color:var(--er)"' : '') + '>' + n + '</b><small>' + sub + '</small></a>';
  const kpis = '<div class="tb5" style="margin-bottom:16px">' +
    kp('#mpCasos', vencidos, 'Casos vencidos', vencidos ? 'pasó la fecha de la 2.ª visita' : 'ninguno vencido', true) +
    kp('#mpCasos', porVencer, 'Casos por vencer', 'vencen en 3 días o menos', false) +
    kp('#mpCasos', C ? C.length : R.abiertas.length, 'Casos abiertos', 'piden otra visita', false) +
    kp('#mpSol', pend, 'Pedidos sin responder', 'biocidas, EPP, herramientas', true) +
    kp('#mpVis', sinRev, 'Visitas sin revisar', 'de los últimos 90 días', false) +
    kp('#mpSan', R.saneamiento.length, 'Saneamiento en curso', 'trabajos sin cerrar', false) + '</div>';
  const graf = (t, sub, cuerpo) => '<section class="card"><h2 style="margin:0 0 2px;font-size:16px">' + t + '</h2><div class="mu peq" style="margin-bottom:10px">' + sub + '</div>' + cuerpo + '</section>';
  const pl = mpTop(V.map(v => v.plaga && !/no corresponde/i.test(v.plaga) ? v.plaga : ''), 8), lu = mpTop(V.map(v => v.lugar), 8);
  const graficos = '<div class="tb3" style="margin-bottom:16px">' +
    graf('Visitas por semana', 'Últimas 12 semanas (cada barra empieza el lunes)', V.length ? mpSemanas(V) + leyenda([['Resueltas', '#5894A7'], ['Piden otra visita', '#0D313F'], ['Otras', '#B9C7CD']]) : '<div class="mu">Sin visitas en los últimos 90 días.</div>') +
    graf('Plagas atendidas', 'Visitas de los últimos 90 días', pl.length ? grHoriz(pl.map(x => [x[0].length > 24 ? x[0].slice(0, 23) + '…' : x[0], x[1], '#0D313F']), pl[0][1]) : '<div class="mu">Sin datos.</div>') +
    graf('Lugares con más visitas', 'Últimos 90 días', lu.length ? grHoriz(lu.map(x => [x[0].length > 24 ? x[0].slice(0, 23) + '…' : x[0], x[1], '#5894A7']), lu[0][1]) : '<div class="mu">Sin datos.</div>') + '</div>';
  const aviso = (R.sinLugar.length ? '<div class="aviso" style="margin-bottom:12px">Lugares de MIPyV sin cruzar con el sistema (completar codigo_sistema en la hoja establecimientos del libro MIPyV): ' + R.sinLugar.map(esc).join(', ') + '.</div>' : '') +
    (R.apiError ? '<div class="aviso" style="margin-bottom:12px">' + esc(R.apiError) + ' Se muestran los datos de las hojas del libro.</div>' : '');
  // Casos abiertos: tabla con semáforo
  const casos = C ? '<section class="card" id="mpCasos" style="margin-bottom:16px"><h2 style="margin:0 0 2px;font-size:16px">Casos abiertos (' + C.length + ')</h2><div class="mu peq" style="margin-bottom:8px">Un caso es una intervención cuya última visita pidió otra visita. Desde 3 días antes de vencer, la app les pide a los operarios que indiquen el cierre.</div>' +
    (C.length ? '<div style="overflow-x:auto"><table class="sinTab mpT" style="width:100%;border-collapse:collapse"><thead><tr><th>Vence</th><th>Lugar · plaga</th><th>Desde</th><th>Última visita</th><th>Visitas</th><th>Protocolo</th><th></th></tr></thead><tbody>' +
      C.map((c, i) => '<tr><td>' + mpChip(c) + '</td><td><b>' + esc(lugarDe(c)) + '</b><div class="peq">' + esc(c.tipo_plaga || '') + '</div>' + (c.resumen ? '<div class="mu peq">' + esc(String(c.resumen).slice(0, 160)) + '</div>' : '') + '</td><td class="peq" data-l="Desde">' + mpF(c.fecha_primera) + '</td><td class="peq" data-l="Última visita">' + mpF(c.fecha_ultima) + '<div class="mu">' + esc(c.operario || '') + '</div></td><td data-l="Visitas">' + (c.visitas || []).length + '</td><td class="peq" data-l="Protocolo">' + (/^PENDIENTE/.test(c.protocolo) ? '<span style="color:var(--er)">Sin n.º</span>' : esc(c.protocolo)) + '</td>' +
        '<td><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sec" data-mpp="' + i + '">N.º de protocolo</button><button class="btn pri" data-mpc="' + i + '">Cerrar caso</button></span></td></tr>').join('') + '</tbody></table></div>' : '<div class="mu">No hay casos abiertos.</div>') + '</section>'
    : '<section class="card" id="mpCasos" style="margin-bottom:16px"><h2 style="margin:0 0 6px;font-size:16px">Intervenciones abiertas (' + R.abiertas.length + ')</h2>' + (R.abiertas.length ? R.abiertas.map(a => '<div class="at"><span><b>' + esc(lugarDe(a)) + ' · ' + esc(a.plaga) + '</b><small>Protocolo ' + esc(a.protocolo) + ' · desde ' + mpF(a.desde) + ' · ' + esc(a.operario) + '</small></span></div>').join('') : '<div class="mu">Ninguna.</div>') +
      (R.vencidos.length ? '<h3 style="margin:12px 0 6px;font-size:14px">Seguimientos vencidos</h3>' + R.vencidos.map(v => '<div class="at"><span><b>' + esc(v.lugar) + ' · ' + esc(v.plaga) + '</b><small>Protocolo ' + esc(v.protocolo) + ' · última visita ' + mpF(v.fecha) + ' · venció ' + mpF(v.vencia) + ' (' + esc(v.dias) + ' días) · ' + esc(v.operario) + '</small></span></div>').join('') : '') + '</section>';
  // Visitas: filtros + tabla
  const lugares = Array.from(new Set(V.map(v => v.lugar).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')), plagasL = Array.from(new Set(V.map(v => v.plaga).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const opt = (arr, sel) => arr.map(x => '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const visitas = '<section class="card" id="mpVis" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><div><h2 style="margin:0 0 2px;font-size:16px">Visitas de los últimos 90 días</h2><div class="mu peq">La más nueva arriba. Tocá una para ver el detalle y las fotos, y marcarla como revisada.</div></div>' +
    '<div class="filtros"><label class="f">Lugar<select class="c" id="mpFL"><option value="">Todos</option>' + opt(lugares, MPF.lugar) + '</select></label><label class="f">Plaga<select class="c" id="mpFP"><option value="">Todas</option>' + opt(plagasL, MPF.plaga) + '</select></label><label style="display:flex;gap:6px;align-items:center;font-size:14px;padding-bottom:8px"><input type="checkbox" id="mpFR"' + (MPF.sinRev ? ' checked' : '') + '> Solo sin revisar</label></div></div><div id="mpTabla"></div></section>';
  const san = R.saneamiento.length ? '<section class="card" id="mpSan" style="margin-bottom:16px"><h2 style="margin:0 0 6px;font-size:16px">Saneamiento en curso (' + R.saneamiento.length + ')</h2>' + R.saneamiento.map(t => '<div class="at"><span><b>' + esc(lugarDe(t)) + '</b><small>Desde ' + mpF(t.desde) + ' · ' + esc(t.operario) + '</small></span></div>').join('') + '</section>' : '<div id="mpSan"></div>';
  box.innerHTML = aviso + kpis + '<section class="card" id="mpHizo" style="margin-bottom:16px"></section>' + graficos + casos + (C ? '<section class="card" id="mpSol" style="margin-bottom:16px">' + mpSolHtml(S).replace('margin:14px 0 6px', 'margin:0 0 6px') + mpCierresHtml(R.cierres || []) + '</section>' : '') + '<section class="card" id="mpSinProd" style="margin-bottom:16px"><div class="mu">Buscando visitas sin producto…</div></section>' + visitas + san +
    '<div class="mu peq">Datos al ' + esc(R.actualizado) + '. Las horas de cada operario por día y por mes están en el libro MIPyV › HORAS (para leer) y en su Tablero.</div>';
  mpSinProd();
  const pintar = () => {
    const F = V.filter(v => (!MPF.lugar || v.lugar === MPF.lugar) && (!MPF.plaga || v.plaga === MPF.plaga) && (!MPF.sinRev || !/^revisad/i.test(String(v.revisado))));
    $('mpTabla').innerHTML = F.length ? '<div style="overflow-x:auto"><table class="sinTab mpT" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha y horario</th><th>Lugar</th><th>Qué se hizo</th><th>Operarios</th><th>Resultado</th><th>HyS</th></tr></thead><tbody>' +
      F.map(v => '<tr class="cl" data-v="' + V.indexOf(v) + '"><td style="white-space:nowrap"><b>' + mpF(v.fecha) + '</b>' + (v.horario ? '<div class="mu peq">' + esc(mpHorario(v.horario) || v.horario) + '</div>' : '<div class="mu peq">sin horario</div>') + (v.protocolo ? '<div class="mu peq">Prot. ' + esc(v.protocolo) + '</div>' : '') + '</td>' +
        '<td><b>' + esc(v.lugar || '') + '</b>' + (v.cod ? '<div class="mu peq">' + esc(v.cod) + '</div>' : '') + '</td><td>' + esc(v.plaga || '—') + '<div class="mu peq">' + esc(String(v.sector || v.motivo || '').slice(0, 110)) + '</div><div class="mu peq">' + esc(v.producto || '') + '</div></td>' +
        '<td class="peq">' + esc(v.operario || '') + (v.acompanante ? '<div class="mu">con ' + esc(v.acompanante) + '</div>' : '') + '</td><td>' + mpRes(v.resultado) + (v.segunda ? '<div class="mu peq">2.ª: ' + mpF(v.segunda) + '</div>' : '') + '</td><td>' + mpRev(v.revisado) + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="mu">' + (V.length ? 'Ninguna visita con esos filtros.' : 'Sin visitas en los últimos 90 días.') + '</div>';
    document.querySelectorAll('#mpTabla tr[data-v]').forEach(tr => tr.onclick = () => mipyvVer(V[Number(tr.dataset.v)]));
  };
  pintar();
  mpActividad(VT, R.avances || [], R.avances === undefined, (R.tareas || []).concat(R.otros || []));   // otros: relevamientos, tanques, casos cerrados, solicitudes… (hoja TODO LO CARGADO, 07/11/2026)
  box.querySelectorAll('[data-ir]').forEach(a => { const ir = () => { if (a.dataset.ir === 'mpVis' && /sin revisar/i.test(a.textContent)) { MPF.sinRev = true; $('mpFR').checked = true; pintar(); }
    const el = $(a.dataset.ir); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    a.onclick = e => { e.preventDefault(); ir(); }; a.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } }; });
  $('mpFL').onchange = e => { MPF.lugar = e.target.value; pintar(); };
  $('mpFP').onchange = e => { MPF.plaga = e.target.value; pintar(); };
  $('mpFR').onchange = e => { MPF.sinRev = e.target.checked; pintar(); };
  box.querySelectorAll('[data-mpc]').forEach(b => b.onclick = () => mpCerrar(C[Number(b.dataset.mpc)]));
  box.querySelectorAll('[data-mpp]').forEach(b => b.onclick = () => mpProtocolo(C[Number(b.dataset.mpp)], V));
  box.querySelectorAll('[data-mps]').forEach(b => b.onclick = () => mpResponder(S.find(x => x.id === b.dataset.mps)));
}
// ---------- Casos, solicitudes y cierres de MIPyV (25/10/2026): los mismos casos que ven Javier y Paulo en la app
const mpChip = c => c.dias < 0 ? '<span class="chip er mini">venció hace ' + (-c.dias) + ' día(s)</span>' : c.dias === 0 ? '<span class="chip er mini">vence hoy</span>' : c.urgente ? '<span class="chip wa mini">vence en ' + c.dias + ' día(s)</span>' : '<span class="chip ok mini">vence ' + mpF(c.vence) + '</span>';
const mpLink = (u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + ' ↗</a>';
function mpCasosHtml(C) {
  return '<h3 style="margin:10px 0 6px;font-size:14px">Casos abiertos (' + C.length + ')</h3><div class="mu peq" style="margin:-2px 0 6px">Un caso es una intervención cuya última visita pidió otra visita. Desde 3 días antes de vencer, la app les pide a los operarios que indiquen el cierre (Resuelto / No resuelto y por qué).</div>' +
    (C.length ? C.map((c, i) => '<div class="at" style="align-items:flex-start"><span><b>' + esc(c.cod ? c.cod + (c.sitio ? ' · ' + c.sitio : '') : c.establecimiento) + ' · ' + esc(c.tipo_plaga || '') + '</b> ' + mpChip(c) +
      '<small style="display:block">' + (/^PENDIENTE/.test(c.protocolo) ? '<span style="color:#B4361F">Sin n.º de protocolo</span>' : 'Protocolo ' + esc(c.protocolo)) + ' · desde ' + fechaTxt(c.fecha_primera) + ' · última visita ' + fechaTxt(c.fecha_ultima) + ' · ' + (c.visitas || []).length + ' visita(s) · ' + esc(c.operario || '') + '</small>' +
      (c.resumen ? '<small class="mu" style="display:block">' + esc(c.resumen) + '</small>' : '') + '</span><span style="display:flex;gap:6px;flex-wrap:wrap;flex:0 0 auto"><button class="btn sec" data-mpp="' + i + '">N.º de protocolo</button><button class="btn pri" data-mpc="' + i + '">Cerrar caso</button></span></div>').join('')
      : '<div class="mu">No hay casos abiertos.</div>');
}
function mpSolHtml(S) {
  const pend = S.filter(x => x.estado === 'Pendiente' || x.estado === 'En gestión'), resto = S.filter(x => pend.indexOf(x) < 0).slice(0, 10);
  const fila = x => '<div class="at" style="align-items:flex-start"><span><b>' + esc(x.tipo) + (x.que ? ' · ' + esc(x.que) : '') + (x.cantidad ? ' · ' + esc(x.cantidad) : '') + '</b> <span class="chip ' + (x.estado === 'Pendiente' ? 'er' : x.estado === 'En gestión' ? 'wa' : 'ok') + ' mini">' + esc(x.estado) + '</span>' +
    '<small style="display:block">' + mpF(x.fecha, true) + ' · ' + esc(x.operario || '') + (x.establecimiento ? ' · ' + esc(x.establecimiento) : '') + '</small>' + (x.detalle ? '<small style="display:block">' + (x.tipo === 'Herramientas' ? '<b>Para qué:</b> ' : '') + esc(x.detalle) + '</small>' : '') +
    (x.fotos && x.fotos.length ? '<small style="display:block">' + x.fotos.map(mpLink).join(' · ') + '</small>' : '') + (x.respuesta ? '<small class="mu" style="display:block">Nota de gestión: ' + esc(x.respuesta) + '</small>' : '') + '</span><button class="btn sec" style="flex:0 0 auto" data-mps="' + esc(x.id) + '">Responder</button></div>';
  return '<h3 style="margin:14px 0 6px;font-size:14px">Solicitudes de los operarios' + (pend.length ? ' (' + pend.length + ' pendiente' + (pend.length > 1 ? 's' : '') + ')' : '') + '</h3>' +
    (S.length ? pend.map(fila).join('') + (resto.length ? '<details style="margin-top:4px"><summary class="mu peq">Ver las ya respondidas (' + resto.length + ')</summary>' + resto.map(fila).join('') + '</details>' : '') : '<div class="mu">Todavía no mandaron solicitudes desde la app.</div>');
}
function mpCierresHtml(K) {
  if (!K.length) return '';
  return '<details style="margin-top:12px"><summary style="font-weight:700;font-size:14px;cursor:pointer">Cierres de casos de los últimos 60 días (' + K.length + ' · ' + K.filter(c => c.resultado === 'No resuelto').length + ' no resueltos)</summary>' +
    K.map(c => '<div class="at"><span><b>' + esc(c.establecimiento || '') + ' · ' + esc(c.tipo_plaga || '') + '</b> <span class="chip ' + (c.resultado === 'Resuelto' ? 'ok' : 'er') + ' mini">' + esc(c.resultado) + '</span>' +
      '<small style="display:block">' + mpF(c.fecha, true) + ' · ' + esc(c.operario || '') + (c.motivo ? ' · ' + esc(c.motivo) : '') + (/^PENDIENTE/.test(c.protocolo) ? '' : ' · protocolo ' + esc(c.protocolo)) + '</small>' + (c.detalle ? '<small style="display:block">' + esc(c.detalle) + '</small>' : '') +
      (c.fotos && c.fotos.length ? '<small style="display:block">' + c.fotos.map(mpLink).join(' · ') + '</small>' : '') + '</span></div>').join('') + '</details>';
}
function mpModal(titulo, cuerpo, okTxt, guardar) {
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '"><h2>' + esc(titulo) + '</h2>' + cuerpo + '<div class="aviso error" id="mpErr" hidden></div><div class="acciones"><div></div><div style="display:flex;gap:8px"><button class="btn sec" id="mpX">Cancelar</button><button class="btn pri" id="mpOk">' + esc(okTxt) + '</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('mpX').onclick = cerrar;
  $('mpOk').onclick = async () => { const b = $('mpOk'), e = $('mpErr'); b.disabled = true; b.textContent = 'Guardando…'; e.hidden = true;
    try { const r = await guardar(); if (!r || !r.ok) throw new Error(r && (r.mensaje || r.error) || 'No se pudo guardar.'); cerrar(); toast('Guardado.'); mipyv(true); }
    catch (err) { b.disabled = false; b.textContent = okTxt; e.textContent = err.message; e.hidden = false; } };
}
function mpCerrar(c) {
  mpModal('Cerrar caso · ' + c.establecimiento + ' · ' + (c.tipo_plaga || ''), '<p class="mu peq" style="margin-top:0">' + (/^PENDIENTE/.test(c.protocolo) ? 'Sin n.º de protocolo' : 'Protocolo ' + esc(c.protocolo)) + ' · última visita ' + mpF(c.fecha_ultima) + ' · ' + esc(c.operario || '') + '. Queda registrado en el libro MIPyV (hoja cierres_casos) a tu nombre; si después se carga otra visita del caso, se vuelve a abrir.</p>' +
    '<label class="f">¿Cómo quedó?<select class="c" id="mpRes"><option value="">Elegí…</option><option>Resuelto</option><option>No resuelto</option></select></label>' +
    '<label class="f" id="mpMotL" hidden>Motivo<select class="c" id="mpMot"><option value="">Elegí…</option><option>El biocida no hizo efecto</option><option>Falta de herramientas o insumos (biocidas)</option><option>Otro</option></select></label>' +
    '<label class="f">Detalle<textarea class="c" id="mpDet" rows="3" placeholder="Obligatorio si el motivo es «Otro»"></textarea></label>', 'Cerrar caso',
    () => api('p_mipyv_cerrar', { protocolo: c.protocolo, alias: c.alias, id_ultima_visita: c.id_ultima_visita, establecimiento: c.establecimiento, tipo_plaga: c.tipo_plaga, resultado_cierre: $('mpRes').value, motivo: $('mpMot').value, detalle: $('mpDet').value }, 120000));
  $('mpRes').onchange = () => { $('mpMotL').hidden = $('mpRes').value !== 'No resuelto'; };
}
function mpProtocolo(c, visitas) {
  const del = visitas.filter(v => v.lugar === c.establecimiento).slice(0, 40), ya = c.visitas || [];
  mpModal('Número de protocolo · ' + c.establecimiento, '<p class="mu peq" style="margin-top:0">Las visitas con el mismo número forman un solo caso: así el sistema sabe que una visita es la continuación de otra. Marcá las visitas que van juntas (aparecen las del mismo lugar de los últimos 90 días).</p>' +
    '<label class="f">N.º de protocolo<input class="c" id="mpProt" value="' + esc(/^PENDIENTE/.test(c.protocolo) ? '' : c.protocolo) + '" placeholder="Ej.: 141/2026"></label>' +
    '<div style="max-height:46vh;overflow:auto;border:1px solid var(--line,#D1D1D1);border-radius:10px;padding:6px 10px">' + del.map(v => '<label style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #EEE"><input type="checkbox" data-id="' + esc(v.id) + '"' + (ya.indexOf(v.id) >= 0 ? ' checked' : '') + '><span><b>' + mpF(v.fecha) + ' · ' + esc(v.plaga || '—') + '</b> <span class="mu peq">' + esc(v.resultado || '') + (v.protocolo ? ' · ' + esc(v.protocolo) : '') + '</span><br><span class="mu peq">' + esc(String(v.obs || v.sector || '').slice(0, 140)) + '</span></span></label>').join('') + '</div>',
    'Guardar', () => api('p_mipyv_protocolo', { protocolo: $('mpProt').value.trim(), ids: Array.from(document.querySelectorAll('#ov [data-id]:checked')).map(x => x.dataset.id) }, 120000));
}
function mpResponder(x) {
  if (!x) return;
  mpModal('Solicitud · ' + x.tipo, '<p style="margin-top:0"><b>' + esc([x.que, x.cantidad].filter(Boolean).join(' · ') || x.tipo) + '</b><br><span class="mu peq">' + mpF(x.fecha, true) + ' · ' + esc(x.operario || '') + (x.establecimiento ? ' · ' + esc(x.establecimiento) : '') + '</span></p>' + (x.detalle ? '<p>' + esc(x.detalle) + '</p>' : '') +
    (x.fotos && x.fotos.length ? '<p class="peq">' + x.fotos.map(mpLink).join(' · ') + '</p>' : '') +
    '<label class="f">Estado<select class="c" id="mpEst">' + ['Pendiente', 'En gestión', 'Atendida', 'No corresponde'].map(e => '<option' + (e === (x.estado === 'Pendiente' ? 'En gestión' : x.estado) ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></label>' +
    '<label class="f">Nota de gestión (solo la ve HyS; los operarios no la ven)<textarea class="c" id="mpResp" rows="3" placeholder="Ej.: pedido a Compras, llega el lunes">' + esc(x.respuesta || '') + '</textarea></label>', 'Guardar',
    () => api('p_mipyv_solicitud', { id: x.id, estado: $('mpEst').value, respuesta: $('mpResp').value }, 120000));
}
// 03/11/2026 (Belén): «una nota interna cada vez que no haya producto». Visitas MIPyV con «No había producto (falta de insumo)»
// que todavía no están en ninguna nota → borrador de nota interna (PlagasSinProducto.gs). El N.º lo asigna Mesa de Entradas.
async function mpSinProd() {
  const box = $('mpSinProd'); if (!box) return;
  let r; try { r = await api('p_psp_listar', {}, 90000); } catch (e) { box.innerHTML = '<div class="mu">No se pudieron leer las visitas sin producto.</div>'; return; }
  if (!r.ok) { box.innerHTML = '<div class="aviso error">' + esc(r.mensaje || 'Error') + '</div>'; return; }
  const V = r.visitas || [], P = V.filter(v => !v.nota), H = V.filter(v => v.nota);
  box.innerHTML = '<h2 style="margin:0 0 4px">Sin producto (falta de insumo) · nota interna</h2><div class="mu peq" style="margin-bottom:10px">Visitas en las que no se pudo tratar la plaga porque no había biocida. Las que todavía no están en ninguna nota vienen marcadas: generá el borrador, revisalo y llevalo a Mesa de Entradas.</div>' +
    (P.length ? '<div style="display:grid;gap:6px;margin-bottom:10px">' + P.map(v => '<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" class="pspV" value="' + esc(v.id) + '" checked><span><b>' + mpF(v.fecha) + '</b> · ' + esc(v.lugar) + ' · ' + esc(v.plaga) + (v.protocolo ? ' <span class="mu peq">(caso ' + esc(v.protocolo) + ')</span>' : '') + '</span></label>').join('') + '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" id="pspEpp" checked> Reiterar que los operarios siguen sin EPP ni ropa de trabajo</label>' +
      '<label class="f" style="max-width:260px;margin-bottom:10px">N.º de nota interna (opcional)<input class="c" id="pspNro" inputmode="numeric" placeholder="Vacío = s/n (lo asigna Mesa de Entradas)"></label>' +
      '<button class="btn pri" id="pspGen">📝 Generar nota interna (borrador)</button> <span id="pspRes" class="peq"></span>'
      : '<div class="chip ok">✅ Todas las visitas sin producto ya están en una nota</div>') +
    (H.length ? '<details style="margin-top:10px"><summary class="mu peq" style="cursor:pointer">Ya incluidas en notas (' + H.length + ')</summary><div class="mu peq" style="margin-top:6px;line-height:1.6">' + H.map(v => mpF(v.fecha) + ' · ' + esc(v.lugar) + ' · ' + esc(v.plaga) + ' → NI ' + esc(v.nota)).join('<br>') + '</div></details>' : '');
  const b = $('pspGen'); if (!b) return;
  b.onclick = async () => {
    const ids = [...document.querySelectorAll('.pspV:checked')].map(i => i.value); if (!ids.length) return toast('Marcá al menos una visita.');
    b.disabled = true; b.textContent = 'Armando la nota…';
    try { const g = await api('p_psp_nota', { ids: ids, epp: $('pspEpp').checked, nro: $('pspNro').value.trim() }, 120000); if (!g.ok) throw new Error(g.mensaje);
      $('pspRes').innerHTML = '✅ Borrador listo: <a href="' + esc(g.url) + '" target="_blank" rel="noopener">abrir la nota ↗</a>' + (g.aviso ? ' · ' + esc(g.aviso) : ''); b.textContent = 'Nota generada'; setTimeout(mpSinProd, 4000); }
    catch (e) { b.disabled = false; b.textContent = '📝 Generar nota interna (borrador)'; toast(e.message || 'No se pudo generar la nota.'); } };
}
function mipyvVer(v) {
  const dd = (t, x) => x ? '<dt>' + t + '</dt><dd>' + x + '</dd>' : '';
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Visita MIPyV"><h2>Visita del ' + mpF(v.fecha) + ' · ' + esc(v.lugar) + '</h2><dl class="dl">' +
    dd('Protocolo', esc(v.protocolo)) + dd('Lugar', esc(v.lugar) + (v.sector ? ' · ' + esc(v.sector) : '')) + dd('Operarios', esc(v.operario) + (v.acompanante ? ' y ' + esc(v.acompanante) : '') + (v.horario ? ' · ' + esc(mpHorario(v.horario) || v.horario) : '')) +
    dd('Qué se hizo', esc(v.motivo)) + dd('Plaga', esc(v.plaga)) + dd('Producto · dosis', esc(v.producto) + (v.dosis ? ' · ' + esc(v.dosis) : '')) + dd('EPP', esc(v.epp)) + dd('Resultado', esc(v.resultado) + (v.segunda ? ' · 2.ª intervención ' + mpF(v.segunda) : '')) +
    dd('Observaciones', esc(v.obs).replace(/\n/g, '<br>')) + dd('Fotos', v.fotos.map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">Foto ' + (i + 1) + ' ↗</a>').join(' · ')) + dd('Revisión HyS', esc(v.revisado || 'Sin revisar')) + '</dl>' +
    '<label class="f" style="margin-top:12px">Nota de revisión (opcional)<input class="c" id="mpNota" placeholder="Ej.: horas extras aprobadas"></label>' +
    '<div class="acciones"><div></div><div style="display:flex;gap:8px"><button class="btn sec" id="mpCer">Cerrar</button><button class="btn pri" id="mpRev">Marcar como revisada</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('mpCer').onclick = cerrar;
  $('mpRev').onclick = async () => { $('mpRev').disabled = true; $('mpRev').textContent = 'Guardando…';
    try { const r = await api('p_mipyv_revisar', { id: v.id, nota: $('mpNota').value }); if (!r.ok) throw new Error(r.mensaje); toast('Visita marcada como revisada.'); cerrar(); mipyv(true); }
    catch (e) { $('mpRev').disabled = false; $('mpRev').textContent = 'Marcar como revisada'; toast(e.message || 'No se pudo guardar.'); } };
}

// ------------------------------------------------------------------ 3 · Control de horas de los operarios (27/10/2026)
// Sale de los horarios que cargan en la app MIP (visitas, saneamiento y otros trabajos de HyS). Si el mismo día hay registros que se superponen,
// las horas se cuentan una sola vez. Las horas de guardia se pagan al 100 %: 1 hora reloj de guardia = 2 horas de guardia.
const HS_CONF = [
  { re: /javier/i, nombre: 'Javier Tramaleo', contrato: 30, guardiaMes: 140, regla: 'Contrato: 30 h semanales + 140 h de guardia por mes. La guardia se computa al 100 %: 140 h de guardia = 70 h reloj. Cada semana (lunes a domingo), las primeras 30 h son de contrato y lo que pasa de 30 h es guardia.' },
  { re: /paulo/i, nombre: 'Paulo Tramaleo', contrato: 0, guardiaMes: null, regla: 'Cumple su contrato en otro lugar; con HyS solo hace guardias. Se cuentan solo las horas que trabaja con HyS (las que carga en la app MIP), todas como guardia al 100 %: 1 h reloj = 2 h de guardia. Sin tope mensual.' }];
let MHS = '';
const hsMin = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
const hsTxt = min => { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') + ' min' : ''); };
const hsHM = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
function hsCalcular(H) {
  const P = {};   // persona → {conf, dias: {fecha: {tramos, lugares, tipos, notas}}, sin: []}
  H.forEach(r => { const c = HS_CONF.find(x => x.re.test(r.persona)), k = c ? c.nombre : r.persona;
    const p = P[k] = P[k] || { nombre: k, conf: c || { nombre: k, contrato: 0, guardiaMes: null, regla: 'Sin regla cargada: se muestran las horas trabajadas.' }, dias: {}, sin: [] };
    const a = hsMin(r.ini), b = hsMin(r.fin);
    if (a == null || b == null || b <= a) { p.sin.push(r); return; }
    const d = p.dias[r.fecha] = p.dias[r.fecha] || { tramos: [], lugares: new Set(), tipos: new Set(), titular: false };
    d.tramos.push([a, b]); if (r.lugar) d.lugares.add(r.lugar); d.tipos.add(String(r.tipo).split(' · ')[0]); if (r.delTitular) d.titular = true; });
  Object.values(P).forEach(p => {
    Object.keys(p.dias).forEach(f => { const d = p.dias[f], t = d.tramos.sort((x, y) => x[0] - y[0]), u = [];
      t.forEach(x => { const l = u[u.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else u.push(x.slice()); });
      d.union = u; d.min = u.reduce((s, x) => s + x[1] - x[0], 0); d.superpuestos = t.length > u.length; });
    // Reparto por semana (lunes a domingo): primero contrato, el resto guardia
    const sem = {};
    Object.keys(p.dias).sort().forEach(f => { const dt = mpDia(f), l = new Date(dt); l.setDate(l.getDate() - ((l.getDay() + 6) % 7)); const k = mpYmd(l), s = sem[k] = sem[k] || { lunes: l, usado: 0 };
      const d = p.dias[f], tope = p.conf.contrato * 60, c = Math.max(0, Math.min(d.min, tope - s.usado)); s.usado += c; d.contrato = c; d.guardia = d.min - c; });
    p.semanas = sem; });
  return P;
}
async function pantallaHoras(fresco) {
  marco('#plghs', '<div class="cab"><div><span class="mu peq">3 · Plagas, saneamiento y trabajos de HyS</span><h1>Control de horas</h1><span class="mu peq">Horas de Javier y Paulo según los horarios que cargan en la app MIP. Si dos registros del mismo día se superponen, esas horas se cuentan una sola vez.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="hsAct">Actualizar</button><a class="btn sec" href="#plagas">Volver a Plagas</a></div></div><div id="hsBox"><section class="card"><div class="mu">Leyendo el registro MIP…</div></section></div>');
  $('hsAct').onclick = () => pantallaHoras(true);
  if (!MIPYV || fresco) { try { MIPYV = await api('p_mipyv', { fresco: !!fresco }, 120000); } catch (e) { $('hsBox').innerHTML = '<section class="card"><div class="aviso error">No se pudo leer el registro MIP.</div></section>'; return; } }
  const R = MIPYV, box = $('hsBox'); if (!box) return;
  if (!R.ok) { box.innerHTML = '<section class="card"><div class="aviso error">' + esc(R.mensaje || 'Error') + '</div></section>'; return; }
  if (!Array.isArray(R.horas)) { box.innerHTML = '<section class="card"><div class="aviso">El control de horas aparece cuando se implementa la versión nueva del Apps Script (Implementar › Administrar las implementaciones › Nueva versión).</div></section>'; return; }
  const P = hsCalcular(R.horas), meses = Array.from(new Set(R.horas.map(r => String(r.fecha).slice(0, 7)).filter(m => /^\d{4}-\d{2}$/.test(m)))).sort().reverse();
  if (!MHS || meses.indexOf(MHS) < 0) MHS = meses.indexOf(mpYmd(new Date()).slice(0, 7)) >= 0 ? mpYmd(new Date()).slice(0, 7) : (meses[0] || mpYmd(new Date()).slice(0, 7));
  const nomMes = m => MP_MESES[+m.slice(5) - 1] + ' de ' + m.slice(0, 4), hoyY = mpYmd(new Date());
  const orden = Object.values(P).sort((a, b) => (HS_CONF.indexOf(a.conf) < 0 ? 9 : HS_CONF.indexOf(a.conf)) - (HS_CONF.indexOf(b.conf) < 0 ? 9 : HS_CONF.indexOf(b.conf)));
  const tarjeta = p => {
    const dm = Object.keys(p.dias).filter(f => f.slice(0, 7) === MHS).sort(), tot = dm.reduce((s, f) => s + p.dias[f].min, 0), con = dm.reduce((s, f) => s + p.dias[f].contrato, 0), gua = dm.reduce((s, f) => s + p.dias[f].guardia, 0);
    const sinM = p.sin.filter(r => String(r.fecha).slice(0, 7) === MHS), c = p.conf;
    const tope = c.guardiaMes ? c.guardiaMes * 30 : null;   // en minutos reloj (140 h guardia = 70 h reloj)
    const barra = tope ? '<div style="margin:6px 0 2px;height:10px;border-radius:6px;background:#E3EBEE;overflow:hidden"><div style="height:100%;width:' + Math.min(100, Math.round(gua / tope * 100)) + '%;background:' + (gua > tope ? 'var(--er)' : '#5894A7') + '"></div></div>' : '';
    const k = (t, v, sub, alerta) => '<div><span class="mu peq">' + t + '</span><div style="font-size:22px;font-weight:700;color:' + (alerta ? 'var(--er)' : 'var(--az)') + '">' + v + '</div><small class="mu">' + sub + '</small></div>';
    const kpis = '<div class="tb3" style="margin:10px 0">' + k('Horas trabajadas', hsTxt(tot), dm.length + ' día(s) con horario en ' + nomMes(MHS)) +
      (c.contrato ? k('De contrato', hsTxt(con), c.contrato + ' h por semana') : '') +
      k('Guardia (horas reloj)', hsTxt(gua), c.contrato ? 'lo que pasa de ' + c.contrato + ' h en la semana' : 'todas sus horas', tope && gua > tope) +
      k(c.contrato ? 'Guardia al 100 %' : 'Guardia a pasar (al 100 %)', hsTxt(gua * 2), tope ? 'de ' + c.guardiaMes + ' h de guardia del mes · ' + (gua * 2 <= c.guardiaMes * 60 ? 'quedan ' + hsTxt(c.guardiaMes * 60 - gua * 2) : 'se pasó por ' + hsTxt(gua * 2 - c.guardiaMes * 60)) : '1 h reloj = 2 h de guardia', tope && gua > tope) + '</div>' + barra;
    // Semanas que tocan el mes
    const sems = Object.keys(p.semanas).filter(l => { const a = mpDia(l), b = new Date(a); b.setDate(b.getDate() + 6); return mpYmd(a).slice(0, 7) <= MHS && mpYmd(b).slice(0, 7) >= MHS; }).sort();
    const tSem = sems.length ? '<h3 style="margin:14px 0 6px;font-size:14px">Por semana (lunes a domingo)</h3><div style="overflow-x:auto"><table class="sinTab mpT" style="width:100%;border-collapse:collapse"><thead><tr><th>Semana</th><th>Días</th><th>Trabajadas</th>' + (c.contrato ? '<th>Contrato (' + c.contrato + ' h)</th>' : '') + '<th>Guardia reloj</th><th>Guardia al 100 %</th></tr></thead><tbody>' +
      sems.map(l => { const a = mpDia(l), b = new Date(a); b.setDate(b.getDate() + 6); const fs = Object.keys(p.dias).filter(f => f >= l && f <= mpYmd(b)), t = fs.reduce((s, f) => s + p.dias[f].min, 0), cc = fs.reduce((s, f) => s + p.dias[f].contrato, 0), g = fs.reduce((s, f) => s + p.dias[f].guardia, 0), cerrada = mpYmd(b) < hoyY;
        return '<tr><td><b>' + mpF(l).slice(4) + '</b> al ' + mpF(mpYmd(b)).slice(4) + (cerrada ? '' : ' <span class="chip gr mini">en curso</span>') + '</td><td data-l="Días">' + fs.length + '</td><td data-l="Trabajadas">' + hsTxt(t) + '</td>' +
          (c.contrato ? '<td data-l="Contrato">' + hsTxt(cc) + (cerrada && cc < c.contrato * 60 ? ' <span class="chip wa mini">faltan ' + hsTxt(c.contrato * 60 - cc) + '</span>' : '') + '</td>' : '') + '<td data-l="Guardia reloj">' + hsTxt(g) + '</td><td data-l="Guardia al 100 %"><b>' + hsTxt(g * 2) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="mu peq" style="margin-top:4px">Las semanas que empiezan o terminan en otro mes se muestran completas; los totales de arriba cuentan solo los días de ' + nomMes(MHS) + '.</div>' : '';
    const tDia = dm.length ? '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;font-size:14px">Día por día (' + dm.length + ')</summary><div style="overflow-x:auto;margin-top:6px"><table class="sinTab mpT" style="width:100%;border-collapse:collapse"><thead><tr><th>Día</th><th>Horario</th><th>Horas</th>' + (c.contrato ? '<th>Contrato</th>' : '') + '<th>Guardia reloj</th><th>Dónde y qué</th></tr></thead><tbody>' +
      dm.slice().reverse().map(f => { const d = p.dias[f]; return '<tr><td style="white-space:nowrap"><b>' + mpF(f) + '</b></td><td data-l="Horario">' + d.union.map(x => hsHM(x[0]) + ' a ' + hsHM(x[1])).join(' y ') + (d.superpuestos ? '<div class="mu peq">registros superpuestos: contados una vez</div>' : '') + (d.titular ? '<div class="mu peq">sin horario propio: se tomó el del titular</div>' : '') + '</td>' +
        '<td data-l="Horas">' + hsTxt(d.min) + '</td>' + (c.contrato ? '<td data-l="Contrato">' + hsTxt(d.contrato) + '</td>' : '') + '<td data-l="Guardia reloj">' + hsTxt(d.guardia) + '</td><td class="peq" data-l="Dónde">' + Array.from(d.lugares).map(esc).join(', ') + '<div class="mu">' + Array.from(d.tipos).map(esc).join(', ') + '</div></td></tr>'; }).join('') + '</tbody></table></div></details>' : '<div class="mu" style="margin-top:8px">Sin horas cargadas en ' + nomMes(MHS) + '.</div>';
    // 08/11/2026: los relevamientos de edificios y de tanques sin horario se pueden completar desde acá («Cargar horario»)
    const tSin = sinM.length ? '<div class="aviso" style="margin-top:10px"><b>' + sinM.length + ' registro(s) de ' + nomMes(MHS) + ' sin horario o con horario incompleto: no se cuentan.</b>' +
      '<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">' + sinM.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map(r => '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span>' + mpF(r.fecha) + ' · ' + esc(r.lugar || '') + ' (' + esc(String(r.tipo).split(' · ')[0]) + ')' + (r.rol === 'Acompañante' ? ' · acompañante' : '') + '</span>' +
        (/^(ED|TQ)/.test(String(r.id || '')) ? '<button class="btn sec" data-hsh="' + esc(r.id) + '" data-hsl="' + esc(mpF(r.fecha) + ' · ' + (r.lugar || '')) + '" style="padding:3px 8px;font-size:12px">Cargar horario</button>' : '<span class="mu peq">(se corrige en la app o en el libro MIPyV)</span>') + '</div>').join('') + '</div></div>' : '';
    return '<section class="card" style="margin-bottom:16px"><h2 style="margin:0 0 2px;font-size:17px">' + esc(p.nombre) + '</h2><div class="mu peq">' + esc(c.regla) + '</div>' + kpis + tSem + tDia + tSin + '</section>';
  };
  box.innerHTML = '<section class="card" style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between"><label class="f" style="margin:0">Mes<select class="c" id="hsMes">' + meses.map(m => '<option value="' + m + '"' + (m === MHS ? ' selected' : '') + '>' + nomMes(m) + '</option>').join('') + '</select></label>' +
    '<button class="btn sec" id="hsImp">Imprimir</button></section>' + (orden.length ? orden.map(tarjeta).join('') : '<section class="card"><div class="mu">Todavía no hay horarios cargados en la app.</div></section>') +
    '<div class="mu peq">Datos al ' + esc(R.actualizado) + '. Las horas salen de «hora de inicio» y «hora de fin» de cada registro de la app; el acompañante usa su propio horario y, si no lo cargó, el del titular.</div>';
  $('hsMes').onchange = e => { MHS = e.target.value; pantallaHoras(); };
  $('hsImp').onclick = () => { document.querySelectorAll('#hsBox details').forEach(d => d.open = true); window.print(); };
  box.querySelectorAll('[data-hsh]').forEach(b => b.onclick = () => {
    $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Cargar horario"><h2>Cargar horario</h2><p class="mu peq">' + esc(b.dataset.hsl) + '. Vale para el operario y su acompañante.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><label class="f">Desde<input class="c" type="time" id="hsIni"></label><label class="f">Hasta<input class="c" type="time" id="hsFin"></label></div>' +
      '<div class="acciones"><button class="btn sec" id="hsNo">Cancelar</button><button class="btn pri" id="hsOk">Guardar</button></div></div>';
    $('ov').hidden = false; const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
    $('hsNo').onclick = cerrar;
    $('hsOk').onclick = async () => { const ini = $('hsIni').value, fin = $('hsFin').value; if (!ini || !fin || fin <= ini) return toast('Poné desde y hasta (hasta, después de desde).');
      $('hsOk').disabled = true; $('hsOk').textContent = 'Guardando…';
      try { const r = await api('p_mipyv_horario', { id: b.dataset.hsh, ini: ini, fin: fin }, 60000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo guardar.'); cerrar(); toast('Horario guardado.'); pantallaHoras(true); }
      catch (e) { $('hsOk').disabled = false; $('hsOk').textContent = 'Guardar'; toast(e.message || 'No se pudo guardar.'); } };
  });
}

// ------------------------------------------------------------------ Relevamiento de edificios · red Trelew (05/11/2026, pedido de Belén)
// Agua, desagües, canaletas y techos de cada lugar: lo cargan Javier y Paulo desde la app MIP (módulo «Edificio»).
// Servidor: Edificios.gs › p_edif (lee la hoja «relevamiento_edificio» del libro MIPyV) y p_edif_revisar.
// Si un lugar se relevó más de una vez (o por partes, como el HZT), se ven todas las filas; arriba, el estado más nuevo de cada lugar.
// Los lugares esperados son los de la app MIP (sin HMH, HSST ni AMB); la Sede ex ADOS es un solo edificio.
const EDIF_LUGARES = [['HZT', 'Hospital Zonal Trelew (edificio central)'], ['ADOL|PROS|VAC|EXADOS|CEXT', 'Sede ex ADOS (Adolescencia, PROSATE, Vacunatorio, Consultorios Externos)'],
  ['CTUT', 'Casa Tutelada'], ['CDIA', 'Centro de Día'], ['CIT', 'CIT'], ['HCAM', 'Hilando Caminos'], ['ISM', 'Internación de Salud Mental'], ['PANAI', 'Pichi Anai'], ['UGD', 'UGD - ex Área Programática'],
  ['CAP-AMA', 'CAPS Amaya'], ['CAP-CON', 'CAPS Constitución'], ['CAP-COR', 'CAPS Corradi (Pascual Daleoso)'], ['CAP-DBO', 'CAPS Don Bosco (Gwenda Williams)'], ['CAP-ETC', 'CAPS Etchepare'], ['CAP-LLO', 'CAPS La Loma'],
  ['CAP-PGA', 'CAPS Planta de Gas'], ['CAP-SMA', 'CAPS San Martín (Ing. Franzetti)'], ['CAP-SAR', 'CAPS Sarmiento'], ['CAP-TFE', 'CAPS Tiro Federal'], ['CAP-VIT', 'CAPS Villa Italia']];
const EDIF_TEMAS = [['agua', '💧 Agua'], ['desagues', '🚿 Desagües'], ['canaletas', '🌧 Canaletas'], ['techos', '🏠 Techos']];
const EDIF_INFORME = 'https://docs.google.com/document/d/1zdFy2BfuuUtELR5DPnlXKKEFEcgjZH6M6RYVusL12uw/edit';
let EDIF = null, EDF = { lugar: '', soloUrg: false };
const edifRg = f => { const t = String(f.otros_riesgos || '').trim(); return t && !/^(no|s\/d)$/i.test(t) ? t : ''; };   // 06/11/2026: otros riesgos (gas, electricidad, caída de objetos)
function edifNivel(t) { t = String(t || ''); return /urgente/i.test(t) ? 'er' : /arreglo/i.test(t) ? 'wa' : /^(bien|no tiene)$/i.test(t.trim()) ? 'ok' : 'nd'; }
function edifChip(t) { const n = edifNivel(t), c = { er: ['#FBE3DE', '#B4361F'], wa: ['#FFF1D6', '#8A5A00'], ok: ['#E3F4E8', '#1E6B3A'], nd: ['#EEF1F3', '#55606A'] }[n];
  return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;background:' + c[0] + ';color:' + c[1] + '">' + esc(t || 's/d') + '</span>'; }
async function pantallaEdificios(fresco) {
  marco('#edif', '<div class="cab"><div><span class="mu peq">2 · Agua · 6 · Infraestructura</span><h1>Relevamiento de edificios · red Trelew</h1><span class="mu peq">Agua, desagües, canaletas y techos de cada lugar. Lo cargan Javier y Paulo desde la app MIP; tocá un lugar para ver lo que hace falta, las fotos y marcarlo como revisado.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="edAct">Actualizar</button><a class="btn sec" id="edLib" href="#" target="_blank" rel="noopener" hidden>Planilla ↗</a><a class="btn sec" href="' + EDIF_INFORME + '" target="_blank" rel="noopener">Informe a la Dirección ↗</a></div></div>' +
    '<div id="edBox"><section class="card"><div class="mu">Leyendo el relevamiento…</div></section></div>' +
    '<style>@media (max-width:760px){.edT thead{display:none}.edT,.edT tbody,.edT tr,.edT td{display:block;width:100%}.edT tr{border-top:1px solid var(--ln);padding:10px 0}.edT td{border:0!important;padding:2px 0!important}.edT td[data-l]::before{content:attr(data-l) ": ";color:var(--mu);font-weight:600}}.edT tr[data-i]{cursor:pointer}.edT tr[data-i]:hover{background:#F4F8FA}.edFotos{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.edFotos img{width:88px;height:88px;object-fit:cover;border-radius:8px;border:1px solid var(--ln)}</style>');
  $('edAct').onclick = () => pantallaEdificios(true);
  if (!EDIF || fresco) { try { EDIF = await api('p_edif', {}, 120000); } catch (e) { $('edBox').innerHTML = '<section class="card"><div class="aviso error">No se pudo leer el relevamiento de edificios.</div></section>'; return; } }
  if (!EDIF || EDIF.ok === false) { $('edBox').innerHTML = '<section class="card"><div class="aviso error">' + esc((EDIF && (EDIF.mensaje || EDIF.error)) || 'No se pudo leer el relevamiento.') + '</div></section>'; return; }
  if (EDIF.libro) { $('edLib').href = EDIF.libro; $('edLib').hidden = false; }
  edifPintar();
}
function edifPintar() {
  const F = EDIF.filas || [], ult = {};
  F.forEach(f => { const g = (EDIF_LUGARES.find(l => l[0].split('|').indexOf(f.lugar_id) >= 0) || [f.lugar_id || f.lugar])[0]; if (!ult[g]) ult[g] = f; });   // F viene del más nuevo al más viejo
  const hechos = EDIF_LUGARES.filter(l => ult[l[0]]), faltan = EDIF_LUGARES.filter(l => !ult[l[0]]);
  const U = Object.values(ult), urg = U.filter(f => /urgente/i.test(f.prioridad) || edifRg(f) || EDIF_TEMAS.some(t => edifNivel(f[t[0]]) === 'er')), arr = U.filter(f => urg.indexOf(f) < 0 && EDIF_TEMAS.some(t => edifNivel(f[t[0]]) === 'wa'));
  const sinRev = F.filter(f => !/^revisado/i.test(f.revisado_hys));
  const kpi = (n, t, col) => '<div class="card" style="padding:12px;text-align:center"><div style="font-size:26px;font-weight:800;color:' + (col || 'inherit') + '">' + n + '</div><div class="mu peq">' + t + '</div></div>';
  const porTema = EDIF_TEMAS.map(t => { const c = { er: 0, wa: 0, ok: 0, nd: 0 }; U.forEach(f => c[edifNivel(f[t[0]])]++); return '<tr><td><b>' + t[1] + '</b></td><td style="color:#B4361F;font-weight:700">' + c.er + '</td><td style="color:#8A5A00;font-weight:700">' + c.wa + '</td><td style="color:#1E6B3A;font-weight:700">' + c.ok + '</td><td class="mu">' + c.nd + '</td></tr>'; }).join('');
  const lugares = Array.from(new Set(F.map(f => f.lugar))).sort((a, b) => a.localeCompare(b, 'es'));
  const ver = F.filter(f => (!EDF.lugar || f.lugar === EDF.lugar) && (!EDF.soloUrg || urg.indexOf(f) >= 0 || /urgente/i.test(f.prioridad)));
  $('edBox').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px">' + kpi(hechos.length + ' de ' + EDIF_LUGARES.length, 'lugares relevados') + kpi(urg.length, 'con algo urgente', urg.length ? '#B4361F' : '') + kpi(arr.length, 'requieren arreglos', arr.length ? '#8A5A00' : '') + kpi(sinRev.length, 'sin revisar por HyS', sinRev.length ? '#21788C' : '') + '</div>' +
    (urg.length ? '<section class="card" style="border-left:4px solid #B4361F"><h2 style="margin:0 0 6px;font-size:16px">Urgente</h2>' + urg.map(f => { const T = EDIF_TEMAS.filter(t => edifNivel(f[t[0]]) === 'er'), q = (edifRg(f) ? '⚠️ ' + edifRg(f) + ' · ' : '') + (T.map(t => f[t[0] + '_falta']).filter(x => x && !/^s\/?n$/i.test(x.trim())).join(' · ') || f.observaciones);
      return '<div style="margin:8px 0;cursor:pointer" data-u="' + F.indexOf(f) + '"><b>' + esc(f.lugar) + '</b> · ' + ((edifRg(f) ? ['⚠️ Otros riesgos'] : []).concat(T.map(t => t[1])).join(', ') || 'marcado urgente') + '<br><span class="mu peq">' + esc(String(q || '').slice(0, 300)) + '</span></div>'; }).join('') + '</section>' : '') +
    '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Por tema (último relevamiento de cada lugar)</h2><table class="tabla" style="width:100%;max-width:520px"><thead><tr><th>Tema</th><th>Urgente</th><th>Arreglo</th><th>Bien</th><th>No se pudo ver / s/d</th></tr></thead><tbody>' + porTema + '</tbody></table></section>' +
    '<section class="card" style="grid-column:1/-1"><h2 style="margin:0 0 6px;font-size:16px">Relevamientos cargados</h2>' +
    '<div class="filtros" style="margin-bottom:8px"><label class="f">Lugar<select class="c" id="edL"><option value="">Todos</option>' + lugares.map(l => '<option' + (l === EDF.lugar ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label><label class="peq" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="edU"' + (EDF.soloUrg ? ' checked' : '') + '> Solo urgentes</label></div>' +
    (ver.length ? '<div style="overflow-x:auto"><table class="tabla edT" style="width:100%"><thead><tr><th>Fecha</th><th>Lugar</th>' + EDIF_TEMAS.map(t => '<th>' + t[1] + '</th>').join('') + '<th>Prioridad</th><th>Revisión HyS</th></tr></thead><tbody>' +
      ver.map(f => '<tr data-i="' + F.indexOf(f) + '"><td data-l="Fecha">' + esc(fechaTxt(f.fecha)) + '</td><td data-l="Lugar"><b>' + esc(f.lugar) + '</b>' + (f.parte && !/^todo el edificio$/i.test(f.parte) ? '<br><span class="mu peq">' + esc(f.parte) + '</span>' : '') + '</td>' +
        EDIF_TEMAS.map(t => '<td data-l="' + t[1] + '">' + edifChip(f[t[0]]) + '</td>').join('') + '<td data-l="Prioridad">' + edifChip(f.prioridad) + '</td><td data-l="Revisión HyS" class="peq">' + esc(f.revisado_hys || 'Sin revisar') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="mu">' + (F.length ? 'Ninguno con ese filtro.' : 'Todavía no hay relevamientos cargados.') + '</div>') + '</section>' +
    '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Faltan relevar (' + faltan.length + ')</h2>' + (faltan.length ? faltan.map(l => '<div style="margin:3px 0">⬜ ' + esc(l[1]) + '</div>').join('') : '<div class="mu">✅ Están todos.</div>') + '<span class="mu peq" style="display:block;margin-top:8px">Los mismos lugares que ven Javier y Paulo en la app MIP (sin HMH). Si un lugar no corresponde, avisame y lo saco de la lista.</span></section>';
  $('edL').onchange = e => { EDF.lugar = e.target.value; edifPintar(); };
  $('edU').onchange = e => { EDF.soloUrg = e.target.checked; edifPintar(); };
  document.querySelectorAll('.edT tr[data-i]').forEach(tr => tr.onclick = () => edifVer(F[+tr.dataset.i]));
  document.querySelectorAll('#edBox [data-u]').forEach(d => d.onclick = () => edifVer(F[+d.dataset.u]));
}
function edifVer(f) {
  const dd = (t, x) => x ? '<dt>' + t + '</dt><dd>' + x + '</dd>' : '', nl = s => esc(s || '').replace(/\n/g, '<br>');
  const fotos = L => L && L.length ? '<div class="edFotos">' + L.map((x, i) => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" title="Foto ' + (i + 1) + '">' + (x.id ? '<img loading="lazy" alt="Foto ' + (i + 1) + '" src="https://drive.google.com/thumbnail?id=' + encodeURIComponent(x.id) + '&sz=w300">' : 'Foto ' + (i + 1) + ' ↗') + '</a>').join('') + '</div>' : '';
  const tema = t => '<div style="border-top:1px solid var(--ln);padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>' + t[1] + (t[0] === 'techos' && f.techo_tipo && f.techo_tipo !== 's/d' ? ' · ' + esc(f.techo_tipo) : '') + '</b>' + edifChip(f[t[0]]) + '</div>' +
    (f[t[0] + '_falta'] && !/^s\/?n$/i.test(f[t[0] + '_falta'].trim()) ? '<div style="margin-top:4px"><span class="mu peq">Qué hace falta:</span> ' + nl(f[t[0] + '_falta']) + '</div>' : '') + fotos(f['fotos_' + t[0]]) + '</div>';
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Relevamiento de edificio" style="max-width:760px"><h2>' + esc(f.lugar) + ' · ' + esc(fechaTxt(f.fecha)) + '</h2><dl class="dl">' +
    dd('Parte relevada', esc(f.parte)) + dd('Operarios', esc(f.operario) + (f.operario_acompanante ? ' y ' + esc(f.operario_acompanante) : '')) + dd('Prioridad', edifChip(f.prioridad)) + '</dl>' +
    (edifRg(f) ? '<div style="border-top:1px solid var(--ln);padding:10px 0;background:#FBE3DE;border-radius:8px;padding:10px"><b style="color:#B4361F">⚠️ Otros riesgos</b><div style="margin-top:4px">' + nl(edifRg(f)).replace(/ \| /g, '<br>') + '</div>' + fotos(f.fotos_riesgos) + '</div>' : '') +
    EDIF_TEMAS.map(tema).join('') +
    (f.observaciones ? '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Observaciones</b><div style="margin-top:4px">' + nl(f.observaciones) + '</div></div>' : '') +
    (f.respuestas ? '<details style="border-top:1px solid var(--ln);padding:10px 0"><summary><b>Todas las respuestas</b></summary><pre style="white-space:pre-wrap;font:inherit;font-size:13px;margin:6px 0 0">' + esc(f.respuestas) + '</pre></details>' : '') +
    '<dl class="dl">' + dd('Revisión HyS', esc(f.revisado_hys || 'Sin revisar')) + '</dl>' +
    '<label class="f" style="margin-top:8px">Nota de revisión (opcional)<input class="c" id="edNota" placeholder="Ej.: pasa al informe; pedir a Mantenimiento"></label>' +
    '<div class="acciones"><div></div><div style="display:flex;gap:8px"><button class="btn sec" id="edCer">Cerrar</button><button class="btn pri" id="edRev">Marcar como revisado</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('edCer').onclick = cerrar;
  $('edRev').onclick = async () => { $('edRev').disabled = true; $('edRev').textContent = 'Guardando…';
    try { const r = await api('p_edif_revisar', { id: f.id_relev, nota: $('edNota').value }, 60000); if (!r.ok) throw new Error(r.mensaje); toast('Relevamiento marcado como revisado.'); cerrar(); pantallaEdificios(true); }
    catch (e) { $('edRev').disabled = false; $('edRev').textContent = 'Marcar como revisado'; toast(e.message || 'No se pudo guardar.'); } };
}
