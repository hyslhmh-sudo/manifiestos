// Portal HyS · 9 · Capacitaciones
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ 9 · Capacitaciones · Tablero
// Lee el libro «CAPACITACIONES · Sistema HyS» a través de su propia aplicación web (CAP_API).
// Si CAP_API está vacía, el menú sigue abriendo el panel y la planilla de siempre.
const CAP_API = 'https://script.google.com/macros/s/AKfycbxXz2AuN9nx5JkiNVI0LFYpEG-0ciYTXH9pN6QnO3SIaIltljCi8sbRB4PwiDx9Jf4Ugw/exec';   // pegá acá la URL de la aplicación web del libro de capacitaciones (termina en /exec)
const NOTA_URL = 'https://script.google.com/macros/s/AKfycbwl5B8cp4Tw_DCLwwZEB06nwOOmAPP59mosZ0yaO17bsQeL1tC4TQ9fuv6eGGrvnK7P/exec';
const SEG_URL = NOTA_URL + '?p=seguimiento';
const REC_URL = NOTA_URL + '?p=recibida';
const ANTE_URL = 'https://docs.google.com/spreadsheets/d/1OZmvW2-FypFH78tUMrxT_xSGGBtpCckGPAw8MkHyRuw/edit#gid=6';
const CAP_LIBRO = 'https://docs.google.com/spreadsheets/d/1Cg8884XTihxQYRc7CE1JPqngTquMpNr5uqQPot4uhGI/edit';
const CAP_PANEL = RESPALDO ? 'https://script.google.com/macros/s/AKfycbwKduTFNC4b6s5OLYcPNCjI1GbgQD2ymFN5yqBK7D1fh1pPRMzS_kpB4khnKqEhu4qYEA/exec' : 'https://hyslhmh-sudo.github.io/capacitaciones/panel.html';   // sin GitHub: la aplicación de Google directa (pide la clave del panel en el link privado)
let CAPT = null, CAPRED = 'Red Trelew', CAPBANDA = '', CAPTODOS = false;
async function capApi(accion, datos, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 120000);
  try {
    let txt = '';
    // Si Google responde una página de error (p. ej. «No se puede abrir el archivo en estos momentos», libro ocupado un instante),
    // se reintenta: las consultas hasta 4 veces; las que guardan, una sola vez (para no duplicar nada). 15/10/2026.
    const veces = /guardar|nuev|alta|anular|emitir|enviar|cerrar|subir|borrar|agregar|aplicar|rehacer|suspend|confirmar|marcar|descartar/i.test(accion) ? 2 : 4;
    for (let intento = 0; intento < veces; intento++) {
      const r = await fetch(CAP_API, { method: 'POST', body: JSON.stringify({ accion: accion, clave: CLAVE, datos: datos || {} }), signal: ctl.signal });
      txt = await r.text();
      if (!/^\s*</.test(txt)) break;
      if (intento < veces - 1) await new Promise(ok => setTimeout(ok, 2000 * (intento + 1)));
    }
    if (/^\s*</.test(txt)) {   // página de error de Google: se muestra su mensaje para saber qué pasó
      const doc = new DOMParser().parseFromString(txt, 'text/html'); doc.querySelectorAll('script,style').forEach(x => x.remove());
      const m = ((doc.body && doc.body.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      throw new Error('El libro de capacitaciones respondió con un error de Google (acción ' + accion + '): ' + (m || 'sin detalle') + '. Mirá en Apps Script › Ejecuciones el último doPost con error.');
    }
    const j = JSON.parse(capPublico(txt));
    if (j.error === 'clave') throw new Error('clave');
    if (!j.ok) throw new Error(j.error || 'error');
    return j;
  } finally { clearTimeout(t); }
}
// Links para compartir (15/10/2026): los de registro (?d=), inscripción (?i=), capacitación (?k=) y código (?c=) salen con la
// dirección pública de GitHub (capacitaciones/?d=…), que abre lo mismo sin la página de aviso de Google. También dentro de los QR
// y de los textos para WhatsApp. Si falta GitHub, la dirección de Google sigue funcionando.
const CAP_PUB = 'https://hyslhmh-sudo.github.io/capacitaciones/';
function capPublico(txt) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  return String(txt)
    .replace(new RegExp(esc(CAP_API) + '\\?(?=[dikc]=)', 'g'), CAP_PUB + '?')
    .replace(new RegExp(esc(encodeURIComponent(CAP_API)) + '%3F(?=[dikc]%3D)', 'gi'), encodeURIComponent(CAP_PUB) + '%3F');
}
function capError(e) {
  const m = e && e.message;
  const txt = m === 'clave' ? 'El libro de capacitaciones no pudo confirmar tu clave con el portal. Salí del portal, volvé a entrar y probá de nuevo.'
    : (e && e.name === 'AbortError') ? 'El libro de capacitaciones tardó demasiado. Probá «Actualizar» en un rato.'
    : 'No se pudo leer el libro de capacitaciones' + (m && m !== 'error' ? ': ' + m : '.') ;
  return '<div class="cab"><div><span class="mu peq">9 · Capacitaciones</span><h1>Tablero de capacitaciones</h1></div></div>' +
    '<div class="aviso error">' + esc(txt) + '</div>' +
    '<section class="card peq">Mientras tanto, todo sigue funcionando como siempre: <a href="' + CAP_LIBRO + '" target="_blank" rel="noopener">libro CAPACITACIONES (hoja TABLERO) ↗</a> · <a href="' + esc(CAP_URL) + '" target="_blank" rel="noopener">catálogo actual ↗</a></section>';
}
async function capTablero(fresco) {
  if (!CAPT) CAPT = LS.get('capt', null);
  if (!CAPT || fresco) {
    if (!CAPT) cargando('#cap', 'Armando el tablero de capacitaciones…'); else toast('Actualizando el tablero de capacitaciones…');
    try { CAPT = await capApi('c_tablero', { fresco: !!fresco }, 180000); LS.set('capt', CAPT); }
    catch (e) { if (!CAPT) return marco('#cap', capError(e)); toast('No se pudo actualizar: se muestran los últimos datos guardados.'); }
    if (location.hash.split('/')[0] !== '#cap') return;
  }
  const T = CAPT, K = T.kpi, hoyM = new Date().toISOString().slice(0, 7);
  const card = (titulo, link, cuerpo) => '<section class="card" style="display:flex;flex-direction:column;gap:10px;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h2 style="margin:0;font-size:16px">' + titulo + '</h2>' + (link ? '<a href="' + link[0] + '"' + (/^http/.test(link[0]) ? ' target="_blank" rel="noopener"' : '') + ' class="peq" style="font-weight:700">' + link[1] + '</a>' : '') + '</div>' + cuerpo + '</section>';
  const kpi = (t, v, s, col, extra) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small>' + (extra || '') + '</div>';
  const colPct = p => p >= 80 ? '#1E6B42' : p >= 50 ? '#B7791F' : '#B4361F';
  const tagPct = p => '<span class="tag ' + (p >= 80 ? 'ok' : p >= 50 ? 'wa' : 'er') + '">' + p + ' %</span>';
  const nAt = T.atencion.filter(a => a.nivel !== 'av').length;
  const meta = '<div style="height:8px;border-radius:999px;background:#EEF2F4;overflow:hidden;margin-top:6px"><i style="display:block;height:100%;width:' + Math.min(100, K.matriz) + '%;background:#5894A7"></i></div>';
  // Semáforo: servicios con al menos MIN personas; los más chicos van aparte (nombres a unificar)
  const MINP = T.semaforo.minPersonas || 3, SS = T.semaforo.servicios.slice().sort((a, b) => (b.prioritario - a.prioritario) || (b.personal - a.personal));
  const SG = SS.filter(s => s.personal >= MINP), SC = SS.filter(s => s.personal < MINP);
  const chips = ['Red Trelew', 'Red Rawson', 'Otro hospital de Chubut'].map(r => '<button class="fchip' + (r === CAPRED ? ' on' : '') + '" data-red="' + esc(r) + '">' + esc(r) + '</button>').join('');
  const BANDAS = [['ok', 'Al día', '80 % o más', s => s.pct >= 80, '#1E6B42'], ['wa', 'En camino', '50 a 79 %', s => s.pct >= 50 && s.pct < 80, '#B7791F'], ['er', 'Bajo', '20 a 49 %', s => s.pct >= 20 && s.pct < 50, '#B4361F'], ['cr', 'Crítico', 'menos de 20 %', s => s.pct < 20, '#7A1F12']];
  const banda = BANDAS.find(b => b[0] === CAPBANDA), LF = banda ? SG.filter(banda[3]) : SG, VIS = CAPTODOS ? LF : LF.slice(0, 8);
  const resumen = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">' + BANDAS.map(b => { const l = SG.filter(b[3]), p = l.reduce((a, s) => a + s.personal, 0), on = CAPBANDA === b[0];
    return '<button class="capBanda" data-b="' + b[0] + '" aria-pressed="' + on + '" style="font:inherit;text-align:left;cursor:pointer;border:1px solid ' + (on ? b[4] : 'var(--ln)') + ';border-left:6px solid ' + b[4] + ';border-radius:10px;padding:8px 10px;background:' + (on ? '#F4F7F8' : '#fff') + ';color:var(--tx)"><span style="display:block;font-size:11.5px;font-weight:800;letter-spacing:.5px;color:' + b[4] + '">' + b[1].toUpperCase() + '</span><b style="font-size:22px;color:var(--az)">' + l.length + '</b> <span class="mu" style="font-size:12px">servicios</span><span class="mu" style="display:block;font-size:12px">' + b[2] + ' · ' + p + ' personas</span></button>'; }).join('') + '</div>';
  const fila = s => '<tr style="border-top:1px solid #EEF2F4"><td style="padding:8px"><b>' + esc(s.servicio) + '</b>' + (s.prioritario ? ' <span style="font-size:10.5px;font-weight:800;color:#B4361F;letter-spacing:.4px">PRIORITARIO</span>' : '') + '</td><td style="padding:8px;text-align:right">' + s.personal + '</td><td style="padding:8px;min-width:110px"><div style="height:10px;border-radius:999px;background:#EEF2F4;overflow:hidden"><i style="display:block;height:100%;width:' + Math.max(1, s.pct) + '%;background:' + colPct(s.pct) + '"></i></div></td><td style="padding:8px;text-align:right">' + tagPct(s.pct) + '</td><td style="padding:8px;text-align:right">' + s.alDia + '</td></tr>';
  const sem = CAPRED !== 'Red Trelew'
    ? '<div class="aviso peq">Todavía sin datos para ' + esc(CAPRED) + '. Este semáforo se arma con el registro nuevo (fase 4), que toma la nómina de cada hospital de la base de trabajadores. Hoy solo la red Trelew tiene la matriz cargada.</div>'
    : resumen +
      '<div class="mu peq">' + (banda ? 'Mostrando: <b>' + banda[1].toLowerCase() + '</b> (' + banda[2] + ') · <button class="link capBanda" data-b="">ver todos los rangos</button>' : 'Tocá un rango para ver solo esos servicios.') + '</div>' +
      (LF.length ? '<div style="overflow-x:auto"><table class="peq" style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left;color:var(--mu);font-size:11.5px;letter-spacing:.5px"><th style="padding:6px 8px">SERVICIO</th><th style="padding:6px 8px;text-align:right">PERSONAL</th><th style="padding:6px 8px">OBLIGATORIAS CUMPLIDAS</th><th style="padding:6px 8px;text-align:right">%</th><th style="padding:6px 8px;text-align:right">AL DÍA</th></tr></thead><tbody>' + VIS.map(fila).join('') + '</tbody></table></div>' : '<div class="mu peq">Ningún servicio en este rango.</div>') +
      (LF.length > 8 ? '<button class="btn sec" id="capTodos" style="align-self:flex-start;min-height:36px;padding:6px 14px">' + (CAPTODOS ? 'Ver menos' : 'Ver los ' + LF.length + ' servicios') + '</button>' : '') +
      (SC.length ? '<details class="peq"><summary style="cursor:pointer;font-weight:700;color:var(--az)">Servicios con 1 o 2 personas: ' + SC.length + ' (nombres a unificar)</summary><div class="mu" style="margin-top:6px;line-height:1.6">' + SC.map(s => esc(s.servicio) + ' (' + s.personal + ')').join(' · ') + '</div></details>' : '') +
      '<span class="mu peq">Servicios con ' + MINP + ' personas o más, prioritarios primero (se eligen en el libro, hoja _LISTAS › SERVICIOS_PRIORITARIOS). Los estudiantes no cuentan.</span>';
  // Requiere atención
  const at = T.atencion.length ? '<div style="display:flex;flex-direction:column">' + T.atencion.map(x => '<div class="at"><span class="tag ' + x.nivel + '">' + ({ er: 'Urgente', wa: 'Pronto', av: 'Aviso' }[x.nivel]) + '</span><span><b>' + esc(x.titulo) + '</b><small>' + esc(x.detalle) + '</small></span></div>').join('') + '</div>' : '<div class="mu">Nada pendiente.</div>';
  // Abiertas
  const abiertas = T.abiertas.length ? '<div style="display:flex;flex-direction:column">' + T.abiertas.map(c => '<div class="item"><span><b style="font-size:14px">' + esc(c.codigo + ' · ' + c.nombre) + '</b><br><small class="mu">' + (c.encuentros > 1 ? c.encuentros + ' encuentros · ' : '') + c.registros + ' registros en 2026</small></span>' +
    (c.link ? '<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sec capCopiar" style="min-height:32px;padding:4px 10px;font-size:12.5px" data-l="' + esc(c.link) + '">Copiar link</button>' + (c.qr ? '<a class="btn sec" style="min-height:32px;padding:4px 10px;font-size:12.5px" href="' + esc(c.qr) + '" target="_blank" rel="noopener">QR ↗</a>' : '') + '</span>' : '<span class="tag gr">sin link</span>') + '</div>').join('') + '</div>' : '<div class="mu">No hay capacitaciones abiertas.</div>';
  // Próximos dictados
  const mesC = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const dict = (T.dictados.length ? '<div style="display:flex;flex-direction:column">' + T.dictados.map(d => '<div class="item" style="justify-content:flex-start;gap:12px"><div style="flex:0 0 56px;background:var(--bg);border:1px solid var(--ln);border-radius:8px;text-align:center;padding:4px 0;line-height:1.1"><b style="display:block;font-size:19px;color:var(--az)">' + d.fecha.slice(8, 10) + '</b><span style="font-size:11px;font-weight:800;color:var(--mu)">' + mesC[Number(d.fecha.slice(5, 7)) - 1] + '</span></div><span style="min-width:0"><b style="font-size:14px">' + esc(d.nombre || 's/d') + '</b><br><small class="mu">' + esc([d.hora, d.modalidad, d.lugar, d.externa ? 'institución externa' + (d.organizador ? ' (' + d.organizador + ')' : '') : ''].filter(Boolean).join(' · ')) + '</small>' +
    (d.abierta === false ? ' <span class="tag wa">Falta abrirla</span>' : d.inscripcion ? ' <span class="tag av">Inscripción' + (d.cupo ? ' · cupo ' + esc(d.cupo) : '') + '</span>' : '') + '</span></div>').join('') + '</div>' : '<div class="mu">No hay dictados agendados.</div>') +
    '<span class="mu peq">' + T.libres14 + ' horario(s) libre(s) para servicios en las próximas dos semanas.</span>';
  // Alcance por público
  const maxP = Math.max(1, ...T.publico.map(p => p[1]));
  const pub = grHoriz(T.publico.map((p, i) => [p[0], p[1], ['#0D313F', '#5894A7', '#8DB4C2', '#B8C4CA'][i]]), maxP) +
    '<span class="mu peq">Hasta septiembre los estudiantes quedaron dentro de «externos» y así se mantienen. Desde octubre cada persona elige su público al registrarse.</span>';
  // Registros por mes (ciclo febrero a enero)
  const M = T.meses, maxM = Math.max(4, ...M.map(m => m.n)), W = 640, Hh = 210, x0 = 36, b = 180, k = 150 / maxM, paso = (W - x0 - 8) / M.length, bw = Math.min(30, paso - 10);
  const nomM = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  let sv = ''; [0, .5, 1].forEach(f => { const v = Math.round(maxM * f), y = b - v * k; sv += '<line x1="' + x0 + '" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#D6DEE2"/><text x="' + (x0 - 8) + '" y="' + (y + 4) + '" font-size="11" fill="#5B6B73" text-anchor="end">' + v + '</text>'; });
  M.forEach((m, i) => { const x = x0 + 6 + i * paso, h = m.n * k, col = m.mes >= hoyM ? '#5894A7' : '#0D313F';
    if (m.n) sv += '<g><title>' + nomM[Number(m.mes.slice(5, 7)) - 1] + ' ' + m.mes.slice(0, 4) + ': ' + m.n + ' registros</title><rect x="' + x + '" y="' + (b - h) + '" width="' + bw + '" height="' + h + '" rx="3" fill="' + col + '"/><text x="' + (x + bw / 2) + '" y="' + (b - h - 5) + '" font-size="11" font-weight="700" fill="#0D313F" text-anchor="middle">' + m.n + '</text></g>';
    sv += '<text x="' + (x + bw / 2) + '" y="' + (b + 18) + '" font-size="11" fill="#5B6B73" text-anchor="middle">' + nomM[Number(m.mes.slice(5, 7)) - 1] + '</text>'; });
  const meses = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="Registros por mes del ciclo">' + sv + '</svg>' +
    leyenda([['Hasta septiembre: histórico, tal como se cargó', '#0D313F'], ['Mes en curso', '#5894A7']]);
  // Participación
  const part = '<div style="overflow-x:auto"><table class="peq" style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left;color:var(--mu);font-size:11.5px;letter-spacing:.5px"><th style="padding:6px 8px">CAPACITACIÓN</th><th style="padding:6px 8px;text-align:right">REGISTROS</th><th style="padding:6px 8px;text-align:right">PERSONAS</th><th style="padding:6px 8px;text-align:right">APROBADOS</th></tr></thead><tbody>' +
    T.participacion.map(p => '<tr style="border-top:1px solid #EEF2F4"><td style="padding:8px">' + esc(p.nombre) + '</td><td style="padding:8px;text-align:right">' + p.registros + '</td><td style="padding:8px;text-align:right">' + p.personas + '</td><td style="padding:8px;text-align:right">' + (p.aprobados ? p.aprobados : '—') + '</td></tr>').join('') +
    '</tbody></table></div><span class="mu peq">«—»: sin evaluación o cargada sin nota antes de octubre (queda como registro histórico).</span>';

  marco('#cap', '<div class="cab"><div><span class="mu peq">9 · Capacitaciones</span><h1>Tablero de capacitaciones</h1><span class="mu peq">Ciclo ' + esc(T.ciclo.nombre) + ' (' + fechaTxt(T.ciclo.desde) + ' al ' + fechaTxt(T.ciclo.hasta) + ') · datos al ' + new Date(T.calculado).toLocaleString('es-AR') + '</span></div>' +
    '<div class="filtros"><a class="btn sec" href="' + CAP_LIBRO + '" target="_blank" rel="noopener">Libro ↗</a><button class="btn sec" id="capAct">Actualizar</button></div></div>' +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">' +
      kpi('Personas capacitadas', K.personas, 'personas distintas') +
      kpi('Registros', K.registros, 'asistencias y evaluaciones') +
      kpi('Aprobación', K.aprobacion + ' %', 'de las evaluaciones rendidas') +
      kpi('Cobertura red Trelew', K.cobertura + ' %', K.personalCon + ' de ' + K.personal + ' con al menos una', colPct(K.cobertura)) +
      kpi('Matriz cumplida', K.matriz + ' %', 'de las obligatorias · meta al ' + fechaTxt(T.ciclo.meta), colPct(K.matriz), meta) +
      kpi('Requiere atención', nAt, 'desde el ' + fechaTxt(T.avisosDesde), nAt ? '#B4361F' : '') + '</div>' +
    '<div class="tb2">' + card('Semáforo por servicio', null, '<div class="cpn" id="capRed" style="gap:6px">' + chips + '</div>' + sem) + card('Requiere atención', null, at) + '</div>' +
    '<div class="tb3" style="grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))">' + card('Capacitaciones abiertas', ['#capcat', 'Catálogo'], abiertas) + card('Próximos dictados', [CAP_LIBRO, 'Agregar en DICTADOS ↗'], dict) + card('Alcance por público', null, pub) + '</div>' +
    '<div class="tb3" style="grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))">' + card('Registros por mes', null, meses) + card('Participación por capacitación', null, part) + '</div>');
  $('capAct').onclick = () => capTablero(true);
  $('capRed').querySelectorAll('button').forEach(x => x.onclick = () => { CAPRED = x.dataset.red; capTablero(); });
  document.querySelectorAll('.capBanda').forEach(x => x.onclick = () => { CAPBANDA = CAPBANDA === x.dataset.b ? '' : x.dataset.b; CAPTODOS = false; capTablero(); });
  if ($('capTodos')) $('capTodos').onclick = () => { CAPTODOS = !CAPTODOS; capTablero(); };
  document.querySelectorAll('.capCopiar').forEach(x => x.onclick = () => { const l = x.dataset.l; (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast('Link copiado.')).catch(() => { window.prompt('Copiá el link:', l); }); });
}

// ------------------------------------------------------------------ 9 · Capacitaciones · Catálogo, alta, dictados, inscriptos y firmantes (fase 5)
// Todo pasa por el libro «CAPACITACIONES · Sistema HyS» (CAP_API). Si el portal falla, lo mismo se hace en el libro (menú Capacitaciones HyS).
let CAPC = null, CAPF = { filtro: 'act', q: '' }, CAPA = null, CAPD = null;
const capNorm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const capVacio = v => { v = String(v == null ? '' : v).trim(); return !v || v === 's/d'; };
const capTit = (t, sub, botones) => '<div class="cab"><div><span class="mu peq">9 · Capacitaciones</span><h1>' + esc(t) + '</h1>' + (sub ? '<span class="mu peq">' + sub + '</span>' : '') + '</div>' + (botones ? '<div class="filtros">' + botones + '</div>' : '') + '</div>';
const capEst = e => '<span class="chip ' + (/^activ/i.test(e) ? 'ok' : /borrador|revisi/i.test(e) ? 'wa' : /cancel|suspend|inactiv|anulad/i.test(e) ? 'er' : 'gr') + '">' + esc(e || 's/d') + '</span>';
const capIco = n => '<span class="ms" aria-hidden="true" style="font-size:22px;vertical-align:-5px">' + esc(capVacio(n) ? 'health_and_safety' : n) + '</span>';
// Galería de íconos: los de la lista ICONOS del libro + una selección de Material Symbols útiles para HyS. Se puede escribir cualquier otro nombre.
const CAP_GALERIA = ['health_and_safety', 'badge', 'coronavirus', 'microbiology', 'masks', 'medical_mask', 'clean_hands', 'sanitizer', 'vaccines', 'syringe', 'bloodtype', 'delete', 'recycling', 'compost', 'eco', 'science', 'biotech', 'experiment', 'labs', 'warning', 'dangerous', 'skull',
  'fire_extinguisher', 'local_fire_department', 'emergency', 'emergency_home', 'directions_run', 'exit_to_app', 'stairs', 'electric_bolt', 'bolt', 'radiology', 'water_drop', 'local_laundry_service', 'dry_cleaning', 'checkroom', 'cleaning_services', 'pest_control', 'restaurant', 'soup_kitchen',
  'medication', 'pill', 'local_hospital', 'medical_services', 'stethoscope', 'build', 'construction', 'engineering', 'handyman', 'accessibility_new', 'elderly', 'wheelchair_pickup', 'airline_seat_flat', 'back_hand', 'personal_injury', 'monitor', 'desk', 'chair',
  'inventory_2', 'warehouse', 'local_shipping', 'propane_tank', 'gas_meter', 'oxygen_saturation', 'ac_unit', 'thermostat', 'air', 'noise_aware', 'hearing', 'visibility', 'light_mode', 'psychology', 'self_improvement', 'groups', 'school', 'menu_book', 'gavel', 'policy', 'verified_user', 'shield'];
const CAP_ICO_TAGS = { fuego: 'fire_extinguisher local_fire_department emergency', incendio: 'fire_extinguisher local_fire_department directions_run exit_to_app', extintor: 'fire_extinguisher', residuo: 'delete recycling compost eco', quimic: 'science biotech experiment labs warning dangerous skull',
  biolog: 'coronavirus microbiology masks clean_hands sanitizer vaccines syringe bloodtype', laboratorio: 'biotech science labs experiment', agua: 'water_drop', lavadero: 'local_laundry_service dry_cleaning checkroom', limpieza: 'cleaning_services clean_hands sanitizer', ergonom: 'accessibility_new chair desk monitor wheelchair_pickup airline_seat_flat back_hand elderly',
  electric: 'electric_bolt bolt', radio: 'radiology', emergencia: 'emergency emergency_home directions_run exit_to_app stairs', evacua: 'directions_run exit_to_app stairs emergency_home', plaga: 'pest_control', cocina: 'restaurant soup_kitchen', medicament: 'medication pill', citostatic: 'medication pill dangerous',
  mantenimiento: 'build construction engineering handyman', gas: 'propane_tank gas_meter oxygen_saturation air', oxigeno: 'oxygen_saturation propane_tank air', ruido: 'noise_aware hearing', clima: 'ac_unit thermostat air', bienes: 'inventory_2 warehouse local_shipping', induccion: 'badge school menu_book', norma: 'gavel policy verified_user shield' };
function capIconos() { const s = []; ((CAPC && CAPC.listas && CAPC.listas.iconos) || []).concat(CAP_GALERIA).forEach(n => { n = String(n).trim(); if (n && s.indexOf(n) < 0) s.push(n); }); return s; }
// Selector con vista previa: se usa en el alta y al editar. El valor queda en un campo oculto data-k="ICONO".
function capPicker(id, actual) {
  actual = capVacio(actual) ? 'health_and_safety' : actual;
  return '<div class="f" style="grid-column:1/-1;display:flex;flex-direction:column;gap:8px"><span style="font-size:12px;color:var(--mu);font-weight:600">Ícono del certificado <span style="font-weight:500">(así se ve en la banda azul del certificado)</span></span>' +
    '<div style="display:flex;gap:12px;align-items:center"><span class="icoSel" id="' + id + 'P"><span class="ms" aria-hidden="true">' + esc(actual) + '</span></span><div><b id="' + id + 'N">' + esc(actual) + '</b><div class="mu peq">Tocá uno de la galería, buscá por tema (fuego, químico, residuos, ergonomía…) o escribí el nombre de cualquier ícono de Material Symbols.</div></div></div>' +
    '<input class="c" id="' + id + 'Q" placeholder="Buscar: fuego, químico, agua… o escribir un nombre"><div class="icoGrid" id="' + id + 'G"></div><input type="hidden" data-k="ICONO" id="' + id + '" value="' + esc(actual) + '"></div>';
}
function capPickerActivar(id, alCambiar) {
  const pintar = () => {
    const q = capNorm($(id + 'Q').value.trim()), act = $(id).value;
    let l = capIconos();
    if (q) { const t = Object.keys(CAP_ICO_TAGS).filter(k => q.indexOf(k) >= 0 || k.indexOf(q) >= 0).map(k => CAP_ICO_TAGS[k]).join(' ').split(' ').filter(Boolean); l = l.filter(n => n.indexOf(q.replace(/\s+/g, '_')) >= 0 || t.indexOf(n) >= 0); }
    const libre = q && !l.length && /^[a-z0-9_]+$/.test(q.replace(/\s+/g, '_')) ? q.replace(/\s+/g, '_') : '';   // nombre escrito a mano: se muestra para ver si existe
    $(id + 'G').innerHTML = (libre ? '<button type="button" class="icoT' + (libre === act ? ' on' : '') + '" data-n="' + esc(libre) + '"><span class="ms" aria-hidden="true">' + esc(libre) + '</span>usar «' + esc(libre) + '»</button>' : '') +
      l.map(n => '<button type="button" class="icoT' + (n === act ? ' on' : '') + '" data-n="' + esc(n) + '" title="' + esc(n) + '"><span class="ms" aria-hidden="true">' + esc(n) + '</span>' + esc(n) + '</button>').join('') || '<span class="mu peq">Nada con ese nombre.</span>';
    $(id + 'G').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { $(id).value = b.dataset.n; $(id + 'P').innerHTML = '<span class="ms" aria-hidden="true">' + esc(b.dataset.n) + '</span>'; $(id + 'N').textContent = b.dataset.n; pintar(); if (alCambiar) alCambiar(b.dataset.n); });
  };
  $(id + 'Q').oninput = pintar; $(id + 'Q').onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); }; pintar();
}
function capMsg(e) {
  const m = e && e.message;
  return m === 'sinurl' ? 'Falta conectar el libro de capacitaciones (constante CAP_API).' : m === 'clave' ? 'El libro de capacitaciones no pudo confirmar tu clave. Salí del portal y volvé a entrar.'
    : (e && e.name === 'AbortError') ? 'El libro de capacitaciones tardó demasiado. Probá de nuevo en un rato.' : (m && m !== 'error' ? m : 'No se pudo completar.');
}
const capFalla = (ruta, t, e) => marco(ruta, capTit(t) + '<div class="aviso error">' + esc(capMsg(e)) + '</div><section class="card peq">Mientras tanto, todo se puede hacer en el <a href="' + CAP_LIBRO + '" target="_blank" rel="noopener">libro CAPACITACIONES ↗</a> (menú Capacitaciones HyS › Completar filas cargadas a mano).</section>');
async function capCopiar(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg || 'Copiado.'); } catch (e) { prompt('Copiá el texto:', t); } }
async function capCargar(fresco) { if (!CAPC || fresco) CAPC = await capApi('c_catalogo', {}); return CAPC; }
async function capHacer(accion, datos, boton, txt) {
  const t0 = boton ? boton.textContent : ''; if (boton) { boton.disabled = true; boton.textContent = txt || 'Guardando…'; }
  try { return await capApi(accion, datos); }
  catch (e) { toast(capMsg(e)); return null; }
  finally { if (boton) { boton.disabled = false; boton.textContent = t0; } }
}
function capModalMotivo(titulo, texto, ok) {
  const m = modal(titulo, [['motivo', 'Motivo (queda en el historial)', '', 1]], {}, async v => { if (!v.motivo.trim()) return 'Escribí el motivo.'; return await ok(v.motivo.trim()); }, texto ? '<p class="mu peq" style="margin:0">' + esc(texto) + '</p>' : '');
  return m;
}

// ---------- Catálogo
async function capCatalogo(fresco) {
  if (!CAPC || fresco) { cargando('#capcat', 'Leyendo el catálogo…'); try { await capCargar(true); } catch (e) { return capFalla('#capcat', 'Catálogo', e); } }
  if (location.hash.split('/')[0] !== '#capcat') return;
  const q = capNorm(CAPF.q);
  const L = CAPC.lista.filter(c => (CAPF.filtro === 'todas' || !/inactiv|anulad/i.test(c.estado)) && (!q || capNorm(c.codigo + ' ' + c.nombre).indexOf(q) >= 0));
  const ev = c => c.evaluacion === null ? '<span class="mu">No lleva</span>' : c.evaluacion === 'falta' ? '<span class="chip er">Falta cargarla</span>'
    : esc(c.evaluacion.porIntento || c.evaluacion.preguntas) + ' de ' + esc(c.evaluacion.preguntas) + ' · ' + esc(c.evaluacion.nota) + ' %' + (c.evaluacion.sorteo ? '' : ' · <span class="mu">sin sorteo</span>');
  const dic = c => c.siempre ? '<span class="chip pa">Siempre abierta</span>' : !c.dictado ? '<span class="mu">Sin dictado</span>' : c.dictado.estado === 'abierto' ? '<span class="chip ok">Abierto hasta ' + esc(c.dictado.cierra) + '</span>' : '<span class="chip pa">Próximo ' + esc(c.dictado.abre) + '</span>';
  const sub = c => [c.tipo && c.tipo !== 's/d' ? c.tipo : '', c.encuentros > 1 ? c.encuentros + ' encuentros' : '', !capVacio(c.carga) ? c.carga + ' h' : '', c.inscripcion ? 'con inscripción' : ''].filter(Boolean).join(' · ');
  const falt = c => c.faltan && c.faltan.length ? ' <span class="chip wa" title="' + esc('Falta: ' + c.faltan.join(', ')) + '">Faltan ' + c.faltan.length + '</span>' : '';
  marco('#capcat', capTit('Catálogo', CAPC.lista.length + ' capacitaciones, programas y jornadas · tocá una para abrir su ficha', '<a class="btn pri" href="#capalta">+ Nueva capacitación</a><a class="btn sec" href="#capdic">Dictados</a><a class="btn sec" href="#capfir">Firmantes</a><button class="btn sec" id="ccAct">Actualizar</button>') +
    '<div class="filtros"><div class="cpn"><button class="fchip' + (CAPF.filtro === 'act' ? ' on' : '') + '" data-f="act">Activas y borradores</button><button class="fchip' + (CAPF.filtro === 'todas' ? ' on' : '') + '" data-f="todas">Todas</button></div>' +
    '<label class="f">Buscar<input class="c" id="ccQ" value="' + esc(CAPF.q) + '" placeholder="Nombre o código" style="min-width:240px"></label></div>' +
    (!L.length ? '<div class="card vacio">No hay capacitaciones con ese filtro.</div>' :
    '<section class="card tabla soloEsc"><table><thead><tr><th></th><th>Código</th><th>Capacitación</th><th>Registro</th><th>Evaluación</th><th>Dictado</th><th>Estado</th></tr></thead><tbody>' +
    L.map(c => '<tr class="cl" data-c="' + esc(c.codigo) + '"><td>' + capIco(c.icono) + '</td><td style="white-space:nowrap"><b>' + esc(c.codigo) + '</b></td><td><b>' + esc(c.nombre) + '</b><div class="mu peq">' + esc(sub(c)) + '</div></td><td>' + esc(c.registro) + '</td><td>' + ev(c) + '</td><td>' + dic(c) + '</td><td style="white-space:nowrap">' + capEst(c.estado) + falt(c) + '</td></tr>').join('') +
    '</tbody></table></section><div class="tarjetas">' + L.map(c => '<a class="tarj" href="#capficha/' + encodeURIComponent(c.codigo) + '"><div style="display:flex;gap:10px;align-items:center">' + capIco(c.icono) + '<b>' + esc(c.nombre) + '</b></div><span class="mu peq">' + esc(c.codigo) + ' · ' + esc(c.registro) + (sub(c) ? ' · ' + esc(sub(c)) : '') + '</span><span>' + capEst(c.estado) + falt(c) + ' ' + dic(c) + '</span></a>').join('') + '</div>'));
  document.querySelectorAll('tr.cl[data-c]').forEach(r => r.onclick = () => location.hash = '#capficha/' + encodeURIComponent(r.dataset.c));
  document.querySelectorAll('.fchip[data-f]').forEach(b => b.onclick = () => { CAPF.filtro = b.dataset.f; capCatalogo(); });
  $('ccQ').oninput = () => { CAPF.q = $('ccQ').value; clearTimeout(capCatalogo.t); capCatalogo.t = setTimeout(() => { capCatalogo(); const i = $('ccQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
  $('ccAct').onclick = () => capCatalogo(true);
}

// ---------- Ficha de una capacitación
async function capFichaVer(cod) {
  cargando('#capcat', 'Abriendo la ficha…');
  let F; try { F = await capApi('c_cap', { codigo: cod }); await capCargar(); } catch (e) { return capFalla('#capcat', 'Ficha', e); }
  if (location.hash.split('/')[0] !== '#capficha') return;
  const c = F.cap, ev = F.evaluaciones.find(x => x.id === F.evaluacionEnUso), lleva = /evaluaci/i.test(c.REGISTRO), activa = /^activ/i.test(c.ESTADO);
  const dd = (t, v) => '<dt>' + esc(t) + '</dt><dd>' + (capVacio(v) ? '<span class="mu">s/d</span>' : esc(v)) + '</dd>';
  const firm = String(c.FIRMANTES || '').split(/[,;]\s*/).map(id => { const f = (CAPC.firmantes || []).find(x => x.id === id); return f ? f.nombre : id; }).join(' · ');
  const qr = F.link ? 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=' + encodeURIComponent(F.link) : '';
  marco('#capcat', '<div><a href="#capcat" class="peq">← Catálogo</a></div>' +
    capTit(c.NOMBRE, esc(c.CODIGO) + ' · versión ' + esc(c.VERSION) + ' · ' + capEst(c.ESTADO),
      '<button class="btn sec" id="cfEdit">Editar datos</button>' + (activa ? '<button class="btn sec" id="cfBorr">Pasar a borrador</button><button class="btn peligro" id="cfInac">Inactivar</button>' : '<button class="btn pri" id="cfAct">Activar</button>') +
      '<a class="btn pri" href="#capdicnuevo/' + encodeURIComponent(c.CODIGO) + '">Nuevo dictado</a>') +
    (F.faltan.length ? '<div class="aviso">Para activarla falta: <b>' + esc(F.faltan.join(', ')) + '</b>.</div>' : '') +
    '<div class="tb2"><section class="card" style="display:flex;flex-direction:column;gap:12px"><h2>' + capIco(c.ICONO) + ' Datos</h2><dl class="dl">' +
      dd('Tipo', c.TIPO_ACTIVIDAD) + dd('Categoría', c.CATEGORIA) + dd('Eje', c.EJE) + dd('Destinatarios', c.DESTINATARIOS) + dd('Cómo se registra', c.REGISTRO) +
      (Number(c.ENCUENTROS) > 1 ? dd('Encuentros', c.ENCUENTROS) + dd('Asistencia mínima', c.ASISTENCIA_MINIMA) : '') + dd('Carga horaria', capVacio(c.CARGA_HORARIA) ? '' : c.CARGA_HORARIA + ' h') + dd('Vencimiento', c.VENCE) +
      dd('Siempre abierta', c.SIEMPRE_ABIERTA) + dd('Inscripción previa', c.INSCRIPCION_PREVIA) + '<dt>Ícono del certificado</dt><dd style="display:flex;gap:10px;align-items:center"><span class="icoSel" style="width:44px;height:44px;flex-basis:44px"><span class="ms" aria-hidden="true" style="font-size:28px">' + esc(capVacio(c.ICONO) ? 'health_and_safety' : c.ICONO) + '</span></span>' + esc(capVacio(c.ICONO) ? 'health_and_safety (por defecto)' : c.ICONO) + ' <button class="link" id="cfIco">Cambiar</button></dd>' + '<dt>Firmantes</dt><dd>' + esc(firm || 's/d') + ' · <a href="#capfir">ver firmantes</a></dd>' + dd('Base legal', c.BASE_LEGAL) + '</dl></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Link permanente</h2>' + (F.link ? '<span class="peq" style="overflow-wrap:anywhere">' + esc(F.link) + '</span><div class="cpn"><button class="btn sec" id="cfCop">Copiar link</button><a class="btn sec" href="' + esc(qr) + '" target="_blank" rel="noopener">Abrir QR ↗</a></div>' +
      '<img src="' + esc(qr) + '" alt="QR del link permanente" style="width:160px;height:160px;border:1px solid var(--ln);border-radius:8px">' : '<span class="mu">Sin link todavía.</span>') +
      '<span class="mu peq">El link permanente sirve para las siempre abiertas. Para una clase, usá el link del dictado (abre a la hora y cierra a las 48 h).</span></section></div>' +
    (lleva ? '<section class="card" style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center"><h2>Evaluación</h2><div class="cpn">' +
      (ev ? '<button class="btn sec" id="cfAgr">Agregar preguntas</button>' : '') + '<button class="btn ' + (ev ? 'sec' : 'pri') + '" id="cfNueva">' + (ev ? 'Evaluación nueva (reemplaza)' : 'Cargar la evaluación') + '</button></div></div>' +
      (ev ? '<div class="mu peq">' + esc(ev.id) + ' · ' + esc(ev.preguntas) + ' preguntas en el banco · estado ' + esc(ev.estado) + '</div><div class="filtros">' +
        '<label class="f">Preguntas por intento<input class="c" id="evPI" type="number" min="1" value="' + esc(ev.porIntento || '') + '" style="width:120px"></label>' +
        '<label class="f">Nota mínima %<input class="c" id="evNo" type="number" min="1" max="100" value="' + esc(String(ev.nota || '').replace('%', '')) + '" style="width:120px"></label>' +
        '<label class="f">Intentos<input class="c" id="evIn" type="number" min="1" value="' + esc(ev.intentos || 3) + '" style="width:100px"></label>' +
        '<label class="f">Sortear preguntas y opciones<select class="c" id="evSo"><option' + (/^s/i.test(ev.sorteo) ? ' selected' : '') + '>Sí</option><option' + (/^s/i.test(ev.sorteo) ? '' : ' selected') + '>No</option></select></label>' +
        '<button class="btn pri" id="evGuar">Guardar cambios</button></div>' : '<div class="aviso">Esta capacitación se registra con evaluación y todavía no tiene una cargada.</div>') +
      (F.evaluaciones.filter(x => x.id !== F.evaluacionEnUso).length ? '<details><summary class="peq">Otras evaluaciones (' + F.evaluaciones.filter(x => x.id !== F.evaluacionEnUso).length + ')</summary><ul class="peq">' + F.evaluaciones.filter(x => x.id !== F.evaluacionEnUso).map(x => '<li>' + esc(x.id) + ' · ' + esc(x.tipo) + ' · ' + esc(x.preguntas) + ' preguntas · ' + esc(x.estado) + '</li>').join('') + '</ul></details>' : '') +
      '</section>' : '') +
    '<section class="card tabla"><div style="padding:14px 18px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h2>Dictados</h2><a class="btn sec" href="#capdicnuevo/' + encodeURIComponent(c.CODIGO) + '">Nuevo dictado</a></div>' +
      (F.dictados.length ? '<table><thead><tr><th>Fecha</th><th>Encuentro</th><th>Modalidad y lugar</th><th>Registro abre · cierra</th><th>Estado</th></tr></thead><tbody>' +
        F.dictados.slice().reverse().map(d => '<tr class="cl" data-d="' + esc(d.id) + '"><td>' + esc(d.fecha) + ' ' + esc(d.hora || '') + '</td><td>' + esc(Number(c.ENCUENTROS) > 1 ? d.encuentro + ' de ' + c.ENCUENTROS : '—') + '</td><td>' + esc(d.modalidad) + (capVacio(d.lugar) || /virtual/i.test(d.lugar) ? '' : ' · ' + esc(d.lugar)) + '</td><td class="peq">' + esc(d.abre) + ' · ' + esc(d.cierra) + '</td><td>' + capEst(d.estado) + (d.linkInscripcion ? ' <span class="chip pa">Inscripción</span>' : '') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="vacio">Todavía no tiene dictados.</div>') + '</section>' +
    (F.versiones.length ? '<section class="card peq"><h2 style="margin-bottom:6px">Versiones</h2>' + F.versiones.map(v => '<div>Versión ' + esc(v.VERSION) + ' · desde ' + esc(v.DESDE) + (v.HASTA ? ' hasta ' + esc(v.HASTA) : '') + ' · ' + esc(v.QUE_CAMBIO) + '</div>').join('') + '</section>' : ''));
  document.querySelectorAll('tr.cl[data-d]').forEach(r => r.onclick = () => location.hash = '#capins/' + encodeURIComponent(r.dataset.d));
  if ($('cfCop')) $('cfCop').onclick = () => capCopiar(F.link, 'Link copiado.');
  $('cfEdit').onclick = () => capEditar(c);
  $('cfIco').onclick = () => { modal('Ícono del certificado · ' + c.CODIGO, [], {}, async out => { try { await capApi('c_cap_guardar', { CODIGO: c.CODIGO, ICONO: out.ICONO }); toast('Ícono guardado.'); CAPC = null; capFichaVer(c.CODIGO); } catch (e) { return capMsg(e); } }, capPicker('icoF', c.ICONO)); capPickerActivar('icoF'); };
  if ($('cfAct')) $('cfAct').onclick = async () => { const r = await capHacer('c_cap_estado', { codigo: c.CODIGO, estado: 'Activa' }, $('cfAct'), 'Activando…'); if (r) { toast('Capacitación activa.'); CAPC = null; capFichaVer(c.CODIGO); } };
  const cambiarEstado = (estado, texto) => capModalMotivo(estado === 'Borrador' ? 'Pasar a borrador' : 'Inactivar', texto, async motivo => { try { await capApi('c_cap_estado', { codigo: c.CODIGO, estado: estado, motivo: motivo }); toast('Estado cambiado.'); CAPC = null; capFichaVer(c.CODIGO); } catch (e) { return capMsg(e); } });
  if ($('cfBorr')) $('cfBorr').onclick = () => cambiarEstado('Borrador', 'El registro deja de abrir hasta que la vuelvas a activar. No se borra nada.');
  if ($('cfInac')) $('cfInac').onclick = () => cambiarEstado('Inactiva', 'Deja de mostrarse en «Activas y borradores». Sus registros y certificados siguen valiendo.');
  if ($('evGuar')) $('evGuar').onclick = async () => { const r = await capHacer('c_eval_guardar', { codigo: c.CODIGO, idEvaluacion: ev.id, porIntento: $('evPI').value, nota: $('evNo').value, intentos: $('evIn').value, sorteo: $('evSo').value === 'Sí', preguntas: [] }, $('evGuar')); if (r) { if (r.control && !r.control.ok) toast(r.control.errores[0]); else { toast('Evaluación guardada.'); CAPC = null; } } };
  if ($('cfAgr')) $('cfAgr').onclick = () => capEvalModal(c, ev.id);
  if ($('cfNueva')) $('cfNueva').onclick = () => capEvalModal(c, '');
}
// Opciones de una lista sin perder el valor actual aunque no esté en la lista
const capOps = (lista, actual) => { const o = (lista || []).slice(); if (!capVacio(actual) && o.indexOf(actual) < 0) o.unshift(actual); return o; };
function capEditar(c) {
  const L = CAPC.listas, campos = [['NOMBRE', 'Nombre', '', 1], ['TIPO_ACTIVIDAD', 'Tipo', capOps(L.tipos, c.TIPO_ACTIVIDAD)], ['CATEGORIA', 'Categoría', capOps(L.categorias, c.CATEGORIA)], ['EJE', 'Eje', capOps(L.ejes, c.EJE)],
    ['REGISTRO', 'Cómo se registra', capOps(L.registro, c.REGISTRO)], ['ENCUENTROS', 'Encuentros'], ['CARGA_HORARIA', 'Carga horaria total (h)'], ['ASISTENCIA_MINIMA', 'Asistencia mínima (programas)'],
    ['VENCE', 'Vencimiento', capOps(['Anual', 'No vence'], c.VENCE)], ['SIEMPRE_ABIERTA', 'Siempre abierta', ['Sí', 'No']], ['INSCRIPCION_PREVIA', 'Inscripción previa', ['Sí', 'No']],
    ['FRECUENCIA_SUGERIDA', 'Frecuencia sugerida'], ['DESTINATARIOS', 'Destinatarios', '', 1], ['OBJETIVOS', 'Objetivos', '', 1], ['CONTENIDOS', 'Contenidos', '', 1], ['MATERIALES', 'Materiales', '', 1], ['BASE_LEGAL', 'Base legal', '', 1]];
  const v = {}; campos.forEach(k => v[k[0]] = capVacio(c[k[0]]) ? '' : c[k[0]]);
  modal('Editar ' + c.CODIGO, campos, v, async out => {
    const d = Object.assign({ CODIGO: c.CODIGO }, out);
    if ($('cfNV').checked) { d.nuevaVersion = true; d.queCambio = $('cfQC').value.trim(); if (!d.queCambio) return 'Contá en una línea qué cambió en la versión nueva.'; }
    try { const r = await capApi('c_cap_guardar', d); toast(r.cambios.length ? 'Guardado: ' + r.cambios.length + ' cambio(s).' : 'No había cambios.'); CAPC = null; capFichaVer(c.CODIGO); } catch (e) { return capMsg(e); }
  }, capPicker('icoE', c.ICONO) +
    '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="cfNV"> Es una versión nueva (cambió el contenido)</label><label class="f">Qué cambió<input class="c" id="cfQC" placeholder="Ej.: se sumó el módulo de FDS"></label>');
  capPickerActivar('icoE');
}

// ---------- Editor de preguntas: banco, planilla o de a una
let PREG = null;
function pregEditor(cont, codigo) {
  PREG = { modo: 'banco', lista: [], banco: null, sel: {}, codigo: codigo, todas: false, q: '' };
  const pintar = () => {
    const tab = (m, t) => '<button type="button" class="fchip' + (PREG.modo === m ? ' on' : '') + '" data-m="' + m + '">' + t + '</button>';
    let h = '<div class="cpn">' + tab('banco', 'Elegir del banco') + tab('subir', 'Subir planilla o Excel') + tab('una', 'Cargar de a una') + '</div>';
    if (PREG.modo === 'banco') {
      h += '<div class="filtros"><label class="f">Buscar en el banco<input class="c" id="pbQ" value="' + esc(PREG.q) + '" style="min-width:240px"></label><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="pbTodas"' + (PREG.todas ? ' checked' : '') + '> Ver el banco de todas las capacitaciones</label></div>';
      if (!PREG.banco) h += '<div class="cargando">Leyendo el banco…</div>';
      else {
        const q = capNorm(PREG.q), B = PREG.banco.filter(b => !q || capNorm(b.pregunta + ' ' + b.tema).indexOf(q) >= 0);
        h += !B.length ? '<div class="vacio">No hay preguntas en el banco' + (PREG.todas ? '' : ' de esta capacitación') + '.</div>' : '<div style="max-height:340px;overflow-y:auto;border:1px solid var(--ln);border-radius:8px">' + B.map(b => '<label style="display:flex;gap:10px;padding:9px 12px;border-top:1px solid #EEF2F4;font-size:13.5px;cursor:pointer"><input type="checkbox" data-b="' + esc(b.id) + '"' + (PREG.sel[b.id] ? ' checked' : '') + '><span><b style="font-weight:600">' + esc(b.pregunta) + '</b><br><span class="mu">' + esc(b.tema || 's/d') + ' · ' + esc(b.codigo || '') + ' · en ' + b.evaluaciones.length + ' evaluación(es)' + (b.usar ? '' : ' · fuera de uso') + '</span></span></label>').join('') + '</div>';
      }
    } else if (PREG.modo === 'subir') {
      h += '<label class="f">Planilla (Excel, CSV o la hoja exportada)<input class="c" type="file" id="psF" accept=".xlsx,.xls,.csv,.tsv,.txt"></label>' +
        '<label class="f">o pegá las filas copiadas de Sheets o Excel<textarea class="c" id="psT" style="min-height:110px" placeholder="Columnas: PREGUNTA · A · B · C · D · (E) · CORRECTA · FUNDAMENTO · TEMA. Con o sin fila de encabezados."></textarea></label>' +
        '<div class="cpn"><button class="btn sec" type="button" id="psLeer">Leer preguntas</button></div>';
    } else {
      h += '<div class="campos" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><label class="f" style="grid-column:1/-1">Pregunta<textarea class="c" id="p1Q"></textarea></label>' +
        ['A', 'B', 'C', 'D', 'E'].map(l => '<label class="f">Opción ' + l + (l > 'B' ? ' (optativa)' : '') + '<input class="c" id="p1o' + l + '"></label>').join('') +
        '<label class="f">Correcta<select class="c" id="p1Cor"><option></option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select></label>' +
        '<label class="f" style="grid-column:1/-1">Fundamento (lo ve quien aprueba)<textarea class="c" id="p1F"></textarea></label><label class="f" style="grid-column:1/-1">Tema (se sugiere repasar a quien no aprueba)<input class="c" id="p1T"></label></div>' +
        '<div class="cpn"><button class="btn sec" type="button" id="p1Add">Agregar a la lista</button></div>';
    }
    const nSel = Object.keys(PREG.sel).filter(k => PREG.sel[k]).length;
    h += '<div class="peq"><b>' + (PREG.lista.length + nSel) + ' pregunta(s) para guardar</b>' + (nSel ? ' · ' + nSel + ' del banco' : '') + (PREG.lista.length ? ' · ' + PREG.lista.length + ' nuevas' : '') + '</div>';
    if (PREG.lista.length) h += '<div style="max-height:220px;overflow-y:auto;border:1px solid var(--ln);border-radius:8px">' + PREG.lista.map((p, j) => '<div style="display:flex;gap:10px;justify-content:space-between;padding:8px 12px;border-top:1px solid #EEF2F4;font-size:13px"><span><b style="font-weight:600">' + (j + 1) + '. ' + esc(p.PREGUNTA) + '</b><br><span class="mu">Correcta: ' + esc(p.CORRECTA || '¿?') + ' · ' + esc(p.TEMA || 'sin tema') + '</span></span><button type="button" class="link" data-q="' + j + '">Quitar</button></div>').join('') + '</div>';
    h += '<div id="pCtl"></div>';
    cont.innerHTML = h;
    cont.querySelectorAll('.fchip[data-m]').forEach(b => b.onclick = () => { PREG.modo = b.dataset.m; pintar(); if (PREG.modo === 'banco') traerBanco(); });
    cont.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { PREG.lista.splice(Number(b.dataset.q), 1); pintar(); });
    if ($('pbQ')) $('pbQ').oninput = () => { PREG.q = $('pbQ').value; clearTimeout(pintar.t); pintar.t = setTimeout(() => { pintar(); const i = $('pbQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    if ($('pbTodas')) $('pbTodas').onchange = () => { PREG.todas = $('pbTodas').checked; PREG.banco = null; pintar(); traerBanco(); };
    cont.querySelectorAll('[data-b]').forEach(x => x.onchange = () => { PREG.sel[x.dataset.b] = x.checked; pintar(); });
    if ($('psLeer')) $('psLeer').onclick = leer;
    if ($('p1Add')) $('p1Add').onclick = () => {
      const p = { PREGUNTA: $('p1Q').value.trim() };
      ['A', 'B', 'C', 'D', 'E'].forEach(l => p['OPCION_' + l] = $('p1o' + l).value.trim());
      p.CORRECTA = $('p1Cor').value; p.FUNDAMENTO = $('p1F').value.trim(); p.TEMA = $('p1T').value.trim();
      if (!p.PREGUNTA || !p.OPCION_A || !p.OPCION_B || !p.CORRECTA) return toast('Completá la pregunta, al menos dos opciones y la correcta.');
      if (!p['OPCION_' + p.CORRECTA]) return toast('La opción correcta (' + p.CORRECTA + ') está vacía.');
      PREG.lista.push(p); toast('Pregunta agregada (' + PREG.lista.length + ').'); pintar();
    };
  };
  const traerBanco = async () => { try { const r = await capApi('c_banco', { codigo: PREG.todas ? '' : PREG.codigo }); PREG.banco = r.lista; } catch (e) { PREG.banco = []; toast(capMsg(e)); } if (PREG.modo === 'banco') pintar(); };
  const leer = async () => {
    let texto = $('psT').value;
    const f = $('psF').files[0];
    if (f) {
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        if (!window.XLSX) { toast('Abriendo el lector de Excel…'); await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); }).catch(() => toast('No se pudo abrir el lector de Excel: guardalo como CSV o pegá las filas.')); }
        if (!window.XLSX) return;
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
        texto = filas.map(r => r.map(c => String(c).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
      } else { texto = await f.text(); if (!/\t/.test(texto) && /;|,/.test(texto)) { const sep = (texto.split(/\r?\n/)[0].match(/;/g) || []).length > (texto.split(/\r?\n/)[0].match(/,/g) || []).length ? ';' : ','; texto = texto.split(/\r?\n/).map(l => capCsv(l, sep).join('\t')).join('\n'); } }
    }
    if (!texto.trim()) return toast('Elegí un archivo o pegá las filas.');
    const r = await capHacer('c_preg_leer', { texto: texto }, $('psLeer'), 'Leyendo…'); if (!r) return;
    PREG.lista = PREG.lista.concat(r.preguntas); toast(r.preguntas.length + ' pregunta(s) leídas.'); pintar();
  };
  pintar(); traerBanco();
  return {
    datos: () => ({ preguntas: PREG.lista, desdeBanco: Object.keys(PREG.sel).filter(k => PREG.sel[k]) }),
    pregBanco: () => (PREG.banco || []).filter(b => PREG.sel[b.id]).map(b => { const o = { PREGUNTA: b.pregunta, CORRECTA: b.correcta, FUNDAMENTO: b.fundamento, TEMA: b.tema, ID_PREGUNTA: b.id }; b.opciones.forEach((t, j) => o['OPCION_' + 'ABCDE'[j]] = t); return o; }),
    control: r => { const c = $('pCtl'); if (!c) return; c.innerHTML = !r ? '' : '<div class="aviso' + (r.ok ? '' : ' error') + '" style="display:flex;flex-direction:column;gap:4px"><b>' + (r.ok ? 'Control OK: ' + r.total + ' preguntas' : 'Hay que revisar antes de guardar') + '</b>' +
      r.errores.map(x => '<span>✗ ' + esc(x) + '</span>').join('') + r.avisos.map(x => '<span class="mu">• ' + esc(x) + '</span>').join('') + '</div>'; }
  };
}
function capCsv(l, sep) { const out = []; let c = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === sep) { out.push(c); c = ''; } else c += ch; } out.push(c); return out; }
// Parámetros + editor + control + guardar (sirve para el alta y para la ficha)
function capEvalBloque(cont, cap, idEvaluacion, alTerminar) {
  cont.innerHTML = (idEvaluacion ? '<div class="aviso peq">Se suman preguntas a ' + esc(idEvaluacion) + '. Las que ya están no se repiten.</div>' :
    '<div class="filtros"><label class="f">Tipo<select class="c" id="ebTipo"><option>Final</option><option>Diagnóstica</option></select></label>' +
    '<label class="f">Para qué público<select class="c" id="ebPub">' + ['Todos'].concat(CAPC.listas.publicos || []).map(p => '<option>' + esc(p) + '</option>').join('') + '</select></label>' +
    '<label class="f">Preguntas por intento<input class="c" type="number" id="ebPI" value="10" min="1" style="width:110px"></label><label class="f">Nota mínima %<input class="c" type="number" id="ebNo" value="70" min="1" max="100" style="width:110px"></label>' +
    '<label class="f">Intentos<input class="c" type="number" id="ebIn" value="3" min="1" style="width:90px"></label><label class="f">Sortear preguntas y opciones<select class="c" id="ebSo"><option>Sí</option><option>No</option></select></label></div>') +
    '<div id="ebEd" style="display:flex;flex-direction:column;gap:12px"></div><div class="cpn"><button class="btn sec" type="button" id="ebCtl">Controlar</button><button class="btn pri" type="button" id="ebGu">Guardar evaluación</button></div>';
  const ed = pregEditor($('ebEd'), cap.CODIGO || cap.codigo);
  const params = () => idEvaluacion ? { idEvaluacion: idEvaluacion } : { tipo: $('ebTipo').value, publico: $('ebPub').value, porIntento: $('ebPI').value, nota: $('ebNo').value, intentos: $('ebIn').value, sorteo: $('ebSo').value === 'Sí', reemplazar: true };
  $('ebCtl').onclick = async () => { const d = ed.datos(); const r = await capHacer('c_preg_control', { preguntas: ed.pregBanco().concat(d.preguntas), porIntento: idEvaluacion ? 0 : $('ebPI').value, codigo: cap.CODIGO || cap.codigo }, $('ebCtl'), 'Controlando…'); if (r || r === null) ed.control(r); };
  $('ebGu').onclick = async () => {
    const d = ed.datos(); if (!d.preguntas.length && !d.desdeBanco.length) return toast('Elegí del banco, subí una planilla o cargá preguntas.');
    let r; try { $('ebGu').disabled = true; r = await capApi('c_eval_guardar', Object.assign({ codigo: cap.CODIGO || cap.codigo }, params(), d)); }
    catch (e) { $('ebGu').disabled = false; const m = capMsg(e); toast(m); return; }
    $('ebGu').disabled = false; if (r.control) ed.control(r.control);
    toast('Evaluación ' + r.id + ' guardada: ' + r.agregadas + ' pregunta(s) nuevas' + (r.reutilizadas ? ', ' + r.reutilizadas + ' del banco' : '') + '.'); CAPC = null; alTerminar && alTerminar(r);
  };
}
function capEvalModal(cap, idEvaluacion) {
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Evaluación"><div style="display:flex;justify-content:space-between;gap:10px"><h2>' + (idEvaluacion ? 'Agregar preguntas' : 'Evaluación nueva') + ' · ' + esc(cap.CODIGO) + '</h2><button class="link" id="emCer">Cerrar</button></div><div id="emCont" style="display:flex;flex-direction:column;gap:12px"></div></div>';
  $('ov').hidden = false; $('emCer').onclick = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  capEvalBloque($('emCont'), cap, idEvaluacion, () => { $('ov').hidden = true; $('ov').innerHTML = ''; capFichaVer(cap.CODIGO); });
}

// ---------- Alta en 4 pasos
async function capAlta() {
  if (!CAPC) { cargando('#capcat', 'Preparando el alta…'); try { await capCargar(); } catch (e) { return capFalla('#capcat', 'Nueva capacitación', e); } }
  if (!CAPA) CAPA = { paso: 1, d: { TIPO_ACTIVIDAD: 'Capacitación', VENCE: 'Anual', SIEMPRE_ABIERTA: 'No', INSCRIPCION_PREVIA: 'No', ICONO: 'health_and_safety', ENCUENTROS: '1' }, cod: '' };
  const L = CAPC.listas, d = CAPA.d, paso = CAPA.paso;
  const pasos = ['Datos', 'Cómo se registra', 'Evaluación', 'Publicación'].map((t, j) => '<div style="flex:1;min-width:120px;border-top:5px solid ' + (j + 1 <= paso ? 'var(--pa)' : 'var(--gr)') + ';padding-top:6px"><b class="peq">' + (j + 1) + ' · ' + t + '</b></div>').join('');
  const sel = (k, t, lista) => '<label class="f">' + t + '<select class="c" data-k="' + k + '"><option value=""></option>' + capOps(lista, d[k]).map(o => '<option' + (o === d[k] ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></label>';
  const inp = (k, t, tipo, ancho) => '<label class="f"' + (ancho ? ' style="grid-column:1/-1"' : '') + '>' + t + (tipo === 'area' ? '<textarea class="c" data-k="' + k + '">' + esc(d[k] || '') + '</textarea>' : '<input class="c" data-k="' + k + '"' + (tipo ? ' type="' + tipo + '"' : '') + ' value="' + esc(d[k] || '') + '">') + '</label>';
  let h = '<div><a href="#capcat" class="peq">← Catálogo</a></div>' + capTit(CAPA.cod ? 'Alta · ' + CAPA.cod : 'Nueva capacitación', 'Se guarda como borrador en el paso 2. No se puede activar si falta algo: el sistema dice qué.') + '<div style="display:flex;gap:10px;flex-wrap:wrap">' + pasos + '</div><section class="card" style="display:flex;flex-direction:column;gap:14px" id="altaCard">';
  if (paso === 1) {
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' + inp('NOMBRE', 'Nombre', '', 1) + sel('TIPO_ACTIVIDAD', 'Tipo', L.tipos) + sel('CATEGORIA', 'Categoría', L.categorias) + sel('EJE', 'Eje', L.ejes) +
      inp('CARGA_HORARIA', 'Carga horaria total (h)') + sel('VENCE', 'Vencimiento', ['Anual', 'No vence']) + sel('SIEMPRE_ABIERTA', 'Siempre abierta (autoasistida)', ['No', 'Sí']) + sel('INSCRIPCION_PREVIA', 'Inscripción previa', ['No', 'Sí']) +
      inp('DESTINATARIOS', 'Destinatarios', 'area', 1) + inp('OBJETIVOS', 'Objetivos', 'area', 1) + inp('CONTENIDOS', 'Contenidos', 'area', 1) + inp('BASE_LEGAL', 'Base legal', 'area', 1) + '</div>' +
      '<div style="display:grid">' + capPicker('icoA', d.ICONO) + '</div>' +
      '<div class="cpn"><button class="btn pri" id="a1">Seguir</button></div>';
  } else if (paso === 2) {
    const op = (v, t, x) => '<button type="button" class="tarj" data-reg="' + esc(v) + '" style="text-align:left;cursor:pointer;border-width:' + (d.REGISTRO === v ? '2px;border-color:var(--az)' : '1px') + '"><b>' + t + '</b><span class="mu peq">' + x + '</span></button>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' + op('Asistencia', 'Asistencia', 'Un encuentro sin examen: constancia de asistencia.') + op('Evaluación', 'Evaluación', 'Un encuentro con examen: certificado de aprobación.') + op('Encuentros + evaluación', 'Programa de varios encuentros', 'Constancia por encuentro y, al final, aprobación o participación.') + '</div>' +
      (/encuentro/i.test(d.REGISTRO) ? '<div class="filtros">' + inp('ENCUENTROS', 'Cantidad de encuentros', 'number') + inp('ASISTENCIA_MINIMA', 'Asistencia mínima (encuentros)', 'number') + '</div>' : '') +
      '<div class="cpn"><button class="btn sec" id="aV">Volver</button><button class="btn pri" id="a2">' + (CAPA.cod ? 'Guardar y seguir' : 'Guardar borrador y seguir') + '</button></div>';
  } else if (paso === 3) {
    h += '<div id="altaEval" style="display:flex;flex-direction:column;gap:12px"></div><div class="cpn"><button class="btn sec" id="aV">Volver</button><button class="btn sec" id="aSaltar">Seguir sin evaluación (queda en borrador)</button></div>';
  } else {
    h += '<div id="altaPub" class="cargando">Revisando qué falta…</div>';
  }
  h += '</section>';
  marco('#capcat', h);
  const leerCampos = () => document.querySelectorAll('#altaCard [data-k]').forEach(e => d[e.dataset.k] = e.value);
  if ($('aV')) $('aV').onclick = () => { leerCampos(); CAPA.paso--; capAlta(); };
  if (paso === 1) {
    capPickerActivar('icoA', n => d.ICONO = n);
    $('a1').onclick = () => { leerCampos(); if (!d.NOMBRE.trim()) return toast('Falta el nombre.'); if (CAPC.lista.some(x => !CAPA.cod && capNorm(x.nombre) === capNorm(d.NOMBRE))) return toast('Ya hay una capacitación con ese nombre.'); CAPA.paso = 2; capAlta(); };
  } else if (paso === 2) {
    document.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { leerCampos(); d.REGISTRO = b.dataset.reg; if (/encuentro/i.test(d.REGISTRO) && Number(d.ENCUENTROS) < 2) d.ENCUENTROS = '2'; if (!/encuentro/i.test(d.REGISTRO)) d.ENCUENTROS = '1'; if (/encuentro/i.test(d.REGISTRO)) d.TIPO_ACTIVIDAD = 'Programa'; capAlta(); });
    $('a2').onclick = async () => {
      leerCampos(); if (!d.REGISTRO) return toast('Elegí cómo se registra.');
      const r = await capHacer('c_cap_guardar', Object.assign({}, d, CAPA.cod ? { CODIGO: CAPA.cod } : {}), $('a2')); if (!r) return;
      CAPA.cod = r.codigo || CAPA.cod; CAPC = null; await capCargar(true).catch(() => {});
      CAPA.paso = /evaluaci/i.test(d.REGISTRO) ? 3 : 4; capAlta();
    };
  } else if (paso === 3) {
    capEvalBloque($('altaEval'), { CODIGO: CAPA.cod }, '', () => { CAPA.paso = 4; capAlta(); });
    $('aSaltar').onclick = () => { CAPA.paso = 4; capAlta(); };
  } else {
    let F; try { F = await capApi('c_cap', { codigo: CAPA.cod }); } catch (e) { $('altaPub').textContent = capMsg(e); return; }
    $('altaPub').className = ''; $('altaPub').style.cssText = 'display:flex;flex-direction:column;gap:12px';
    $('altaPub').innerHTML = (F.faltan.length ? '<div class="aviso">Para activarla falta: <b>' + esc(F.faltan.join(', ')) + '</b>. Queda en borrador; lo completás desde su ficha.</div>' : '<div class="aviso">Está completa. Activala para que el registro pueda abrir.</div>') +
      '<div class="cpn">' + (F.faltan.length ? '' : '<button class="btn pri" id="aAct">Activar ahora</button>') + '<a class="btn sec" href="#capficha/' + encodeURIComponent(CAPA.cod) + '">Ir a la ficha</a><a class="btn sec" href="#capdicnuevo/' + encodeURIComponent(CAPA.cod) + '">Crear el primer dictado</a></div>';
    const cod = CAPA.cod; CAPA = null;
    if ($('aAct')) $('aAct').onclick = async () => { const r = await capHacer('c_cap_estado', { codigo: cod, estado: 'Activa' }, $('aAct'), 'Activando…'); if (r) { toast('Activa.'); CAPC = null; location.hash = '#capficha/' + encodeURIComponent(cod); } };
  }
}

// ---------- Dictados
async function capDictados() {
  cargando('#capdic', 'Leyendo los dictados…');
  let r; try { r = await capApi('c_dictados', { dias: 60 }); } catch (e) { return capFalla('#capdic', 'Dictados', e); }
  if (location.hash.split('/')[0] !== '#capdic') return;
  const chip = x => /abierto/i.test(x.ahora) ? 'ok' : /próximo/i.test(x.ahora) ? 'pa' : /cancel|suspend/i.test(x.ahora) ? 'er' : 'gr';
  marco('#capdic', capTit('Dictados', 'Últimos 60 días y próximos. El link de registro abre a la hora de la clase y cierra solo a las 48 h.', '<a class="btn pri" href="#capdicnuevo">+ Nuevo dictado</a><a class="btn sec" href="#capcat">Catálogo</a><a class="btn sec" href="#capfir">Firmantes</a>') +
    (!r.lista.length ? '<div class="card vacio">No hay dictados recientes ni próximos.</div>' :
    '<section class="card tabla soloEsc"><table><thead><tr><th>Fecha</th><th>Capacitación</th><th>Modalidad y lugar</th><th>Estado</th><th>Inscriptos</th><th>Asistentes</th><th>Compartir</th></tr></thead><tbody>' +
    r.lista.map((x, j) => '<tr class="cl" data-d="' + esc(x.id) + '"><td style="white-space:nowrap">' + esc(x.fecha) + ' ' + esc(x.hora || '') + '</td><td><b>' + esc(x.nombre) + '</b><div class="mu peq">' + esc(x.codigo) + (Number(x.encuentro) > 1 || /programa/i.test(x.nombre) ? ' · encuentro ' + esc(x.encuentro) : '') + '</div></td><td>' + esc(x.modalidad) + (capVacio(x.lugar) || /virtual/i.test(x.lugar) ? '' : ' · ' + esc(x.lugar)) + '</td>' +
      '<td><span class="chip ' + chip(x) + '">' + esc(x.ahora) + '</span></td><td>' + (x.linkInscripcion ? esc(x.inscriptos) + (capVacio(x.cupo) || /sin/i.test(x.cupo) ? '' : ' / ' + esc(x.cupo)) : '<span class="mu">—</span>') + '</td><td>' + esc(x.asistentes) + '</td>' +
      '<td style="white-space:nowrap"><button class="link" data-cop="' + j + '">Link</button> · <button class="link" data-wa="' + j + '">WhatsApp</button> · <a class="link" href="' + esc(x.qr) + '" target="_blank" rel="noopener">QR</a></td></tr>').join('') + '</tbody></table></section>' +
    '<div class="tarjetas">' + r.lista.map(x => '<a class="tarj" href="#capins/' + encodeURIComponent(x.id) + '"><b>' + esc(x.fecha) + ' ' + esc(x.hora || '') + ' · ' + esc(x.nombre) + '</b><span class="mu peq">' + esc(x.modalidad) + ' · inscriptos ' + esc(x.inscriptos) + ' · asistentes ' + esc(x.asistentes) + '</span><span><span class="chip ' + chip(x) + '">' + esc(x.ahora) + '</span></span></a>').join('') + '</div>'));
  document.querySelectorAll('tr.cl[data-d]').forEach(tr => tr.onclick = e => { if (e.target.closest('button,a')) return; location.hash = '#capins/' + encodeURIComponent(tr.dataset.d); });
  document.querySelectorAll('[data-cop]').forEach(b => b.onclick = () => capCopiar(r.lista[b.dataset.cop].link, 'Link de registro copiado.'));
  document.querySelectorAll('[data-wa]').forEach(b => b.onclick = () => capCopiar(r.lista[b.dataset.wa].whatsapp, 'Texto para WhatsApp copiado.'));
}
async function capDictadoNuevo(cod) {
  if (!CAPC) { cargando('#capdic', 'Preparando…'); try { await capCargar(); } catch (e) { return capFalla('#capdic', 'Nuevo dictado', e); } }
  const L = CAPC.listas, caps = CAPC.lista.filter(c => !/inactiv|anulad/i.test(c.estado)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  CAPD = { cod: cod || '', modalidad: 'Presencial', servicios: [], q: '', dis: [], fir: [] };
  const firm = (CAPC.firmantes || []).filter(f => f.vigente && f.id !== 'FIR-001');
  marco('#capdic', '<div><a href="#capdic" class="peq">← Dictados</a></div>' + capTit('Nuevo dictado', 'El link y el QR se abren a la hora de la clase y se cierran solos a las 48 h. Fuera de ese plazo, solo vos agregás asistentes.') +
    '<section class="card" style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' +
    '<label class="f" style="grid-column:1/-1">Capacitación<select class="c" id="ndCap"><option value="">Elegí…</option>' + caps.map(c => '<option value="' + esc(c.codigo) + '"' + (c.codigo === CAPD.cod ? ' selected' : '') + '>' + esc(c.nombre) + ' (' + esc(c.codigo) + (/^activ/i.test(c.estado) ? '' : ' · ' + esc(c.estado)) + ')</option>').join('') + '</select></label>' +
    '<label class="f" id="ndEncL" hidden>Encuentro<select class="c" id="ndEnc"></select></label>' +
    '<label class="f">Fecha<input class="c" type="date" id="ndF"></label><label class="f">Hora de inicio<input class="c" type="time" id="ndH"></label><label class="f">Hora de fin<input class="c" type="time" id="ndHF"></label></div>' +
    '<div><span class="peq" style="font-weight:700">Modalidad</span><div class="cpn" id="ndMod" style="margin-top:6px">' + ['Presencial', 'Virtual', 'Híbrida'].map(m => '<button type="button" class="fchip' + (m === 'Presencial' ? ' on' : '') + '" data-m="' + m + '">' + m + '</button>').join('') + '</div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px" id="ndLugBox"><label class="f">Lugar<select class="c" id="ndLug"><option value="">Elegí…</option>' + (L.lugares || []).filter(x => !/^virtual$/i.test(x.lugar)).map(x => '<option value="' + esc(x.lugar) + '">' + esc(x.lugar) + (capVacio(x.capacidad) ? '' : ' (' + esc(x.capacidad) + ')') + '</option>').join('') + '</select></label>' +
    '<label class="f">Cupo presencial <span class="mu">(vacío = capacidad del lugar)</span><input class="c" type="number" id="ndCupo" min="1"></label></div>' +
    '<div><span class="peq" style="font-weight:700">Servicios destinatarios</span> <span class="mu peq" id="ndSerN">Todos</span><div class="filtros" style="margin-top:6px"><input class="c" id="ndSerQ" placeholder="Buscar servicio…" style="min-width:220px"><button type="button" class="link" id="ndSerT">Todos (limpiar)</button></div><div class="cpn" id="ndSer" style="margin-top:8px;max-height:160px;overflow-y:auto"></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px"><label class="f">Organizador<input class="c" id="ndOrg" value="Higiene y Seguridad"></label>' +
    '<label class="f">Institución educativa <span class="mu">(si es para estudiantes)</span><select class="c" id="ndIns"><option value="">Ninguna</option>' + (L.instituciones || []).map(i => '<option>' + esc(i) + '</option>').join('') + '<option value="Otra">Otra…</option></select></label><label class="f" id="ndInsXL" hidden>¿Cuál?<input class="c" id="ndInsX"></label></div>' +
    '<div><span class="peq" style="font-weight:700">Disertantes invitados</span> <span class="mu peq">(hasta 3; vos ya estás)</span><div id="ndDis" style="display:flex;flex-direction:column;gap:8px;margin-top:6px"></div><button type="button" class="btn sec" id="ndDisA" style="margin-top:8px">+ Agregar disertante</button></div>' +
    '<div><span class="peq" style="font-weight:700">Firmas del certificado</span> <span class="mu peq" id="ndFirN"></span><div class="multi" style="margin-top:6px"><label><input type="checkbox" checked disabled> Belén Pellegrini (siempre, a la derecha)</label>' + firm.map(f => '<label><input type="checkbox" data-fir="' + esc(f.id) + '"> ' + esc(f.nombre) + (capVacio(f.organismo) ? '' : ' · ' + esc(f.organismo)) + (f.firma ? '' : ' <span class="mu">(sin firma cargada)</span>') + '</label>').join('') + '</div>' + '<a class="peq" href="#capfir" target="_blank" rel="noopener">+ Cargar o editar firmantes (se abre aparte; después recargá esta pantalla)</a>' + (firm.length ? '' : '<div class="mu peq">Todavía no hay otros firmantes cargados.</div>') + '</div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="ndInsc"> Lleva inscripción previa (link de inscripción con consulta previa; cierra al empezar la clase o al llenarse el cupo)</label>' +
    '<label class="f">Observaciones<textarea class="c" id="ndObs"></textarea></label>' +
    '<div class="cpn"><button class="btn pri" id="ndGu">Crear dictado</button><a class="btn sec" href="#capdic">Cancelar</a></div></section><div id="ndRes"></div>');
  const capSel = () => CAPC.lista.find(c => c.codigo === $('ndCap').value);
  const alCambiarCap = () => { const c = capSel(); $('ndEncL').hidden = !c || c.encuentros < 2; if (c && c.encuentros > 1) $('ndEnc').innerHTML = Array.from({ length: c.encuentros }, (_, j) => '<option value="' + (j + 1) + '">' + (j + 1) + ' de ' + c.encuentros + '</option>').join(''); $('ndInsc').checked = !!(c && c.inscripcion); };
  $('ndCap').onchange = alCambiarCap; alCambiarCap();
  document.querySelectorAll('#ndMod [data-m]').forEach(b => b.onclick = () => { CAPD.modalidad = b.dataset.m; document.querySelectorAll('#ndMod [data-m]').forEach(x => x.classList.toggle('on', x === b)); $('ndLugBox').hidden = CAPD.modalidad === 'Virtual'; });
  const servicios = () => { const q = capNorm(CAPD.q); $('ndSer').innerHTML = (L.servicios || []).slice().sort((a, b) => a.localeCompare(b)).filter(s => !q || capNorm(s).indexOf(q) >= 0).map(s => '<button type="button" class="fchip' + (CAPD.servicios.indexOf(s) >= 0 ? ' on' : '') + '" data-s="' + esc(s) + '">' + esc(s) + '</button>').join('');
    $('ndSerN').textContent = CAPD.servicios.length ? CAPD.servicios.length + ' elegido(s): ' + CAPD.servicios.join(', ') : 'Todos';
    $('ndSer').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s = b.dataset.s, k = CAPD.servicios.indexOf(s); if (k >= 0) CAPD.servicios.splice(k, 1); else CAPD.servicios.push(s); servicios(); }); };
  $('ndSerQ').oninput = () => { CAPD.q = $('ndSerQ').value; servicios(); }; $('ndSerT').onclick = () => { CAPD.servicios = []; servicios(); }; servicios();
  $('ndIns').onchange = () => { $('ndInsXL').hidden = $('ndIns').value !== 'Otra'; };
  const dis = () => { $('ndDis').innerHTML = CAPD.dis.map((x, j) => '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;align-items:end;border:1px solid var(--ln);border-radius:10px;padding:10px"><label class="f">Nombre<input class="c" data-dn="' + j + '" value="' + esc(x.nombre) + '"></label><label class="f">Profesión, servicio o institución<input class="c" data-dd="' + j + '" value="' + esc(x.detalle) + '"></label>' +
      '<label class="f">DNI <span class="mu">(va en su constancia)</span><input class="c" data-dx="' + j + '" inputmode="numeric" value="' + esc(x.dni || '') + '"></label><label class="f">Correo <span class="mu">(optativo)</span><input class="c" data-dc="' + j + '" type="email" value="' + esc(x.correo || '') + '"></label>' +
      '<label class="f">En la constancia<select class="c" data-dt="' + j + '"><option value="">disertante invitada/o</option><option value="a"' + (x.trato === 'a' ? ' selected' : '') + '>disertante invitada</option><option value="o"' + (x.trato === 'o' ? ' selected' : '') + '>disertante invitado</option></select></label><button type="button" class="link" data-dq="' + j + '">Quitar</button></div>').join('');
    $('ndDisA').hidden = CAPD.dis.length >= 3;
    $('ndDis').querySelectorAll('[data-dn]').forEach(i => i.oninput = () => CAPD.dis[i.dataset.dn].nombre = i.value);
    $('ndDis').querySelectorAll('[data-dd]').forEach(i => i.oninput = () => CAPD.dis[i.dataset.dd].detalle = i.value);
    $('ndDis').querySelectorAll('[data-dx]').forEach(i => i.oninput = () => CAPD.dis[i.dataset.dx].dni = i.value);
    $('ndDis').querySelectorAll('[data-dc]').forEach(i => i.oninput = () => CAPD.dis[i.dataset.dc].correo = i.value);
    $('ndDis').querySelectorAll('[data-dt]').forEach(i => i.onchange = () => CAPD.dis[i.dataset.dt].trato = i.value);
    $('ndDis').querySelectorAll('[data-dq]').forEach(b => b.onclick = () => { CAPD.dis.splice(Number(b.dataset.dq), 1); dis(); }); };
  $('ndDisA').onclick = () => { if (CAPD.dis.length < 3) { CAPD.dis.push({ nombre: '', detalle: '', dni: '', correo: '', trato: '' }); dis(); } }; dis();
  const firmas = () => { const n = document.querySelectorAll('[data-fir]:checked').length; $('ndFirN').textContent = 'Firmas: ' + (n + 1) + ' de 4'; document.querySelectorAll('[data-fir]').forEach(x => { if (!x.checked) x.disabled = n >= 3; }); };
  document.querySelectorAll('[data-fir]').forEach(x => x.onchange = firmas); firmas();
  $('ndGu').onclick = async () => {
    const c = capSel(); if (!c) return toast('Elegí la capacitación.');
    const ins = $('ndIns').value === 'Otra' ? $('ndInsX').value.trim() : $('ndIns').value;
    const d = { codigo: c.codigo, encuentro: $('ndEnc').value || 1, fecha: $('ndF').value, hora: $('ndH').value, horaFin: $('ndHF').value, modalidad: CAPD.modalidad, lugar: $('ndLug').value, cupo: $('ndCupo').value,
      servicios: CAPD.servicios, organizador: $('ndOrg').value.trim(), institucion: ins, disertantes: CAPD.dis.filter(x => x.nombre.trim()), firmantes: Array.from(document.querySelectorAll('[data-fir]:checked')).map(x => x.dataset.fir), inscripcion: $('ndInsc').checked, observaciones: $('ndObs').value.trim() };
    if (!d.fecha || !d.hora) return toast('Falta la fecha o la hora.');
    if (d.modalidad !== 'Virtual' && !d.lugar) return toast('Elegí el lugar.');
    const r = await capHacer('c_dictado_guardar', d, $('ndGu'), 'Creando…'); if (!r) return;
    capDictadoListo(r, c);
  };
}
function capDictadoListo(r, c) {
  const wa = 'https://wa.me/?text=' + encodeURIComponent(r.whatsapp);
  marco('#capdic', '<div><a href="#capdic" class="peq">← Dictados</a></div>' + capTit('Dictado creado', esc(c.nombre) + ' · ' + esc(r.fecha) + ' ' + esc(r.hora) + ' · ' + esc(r.modalidad)) +
    (r.aviso ? '<div class="aviso error">' + esc(r.aviso) + '</div>' : '') +
    '<div class="tb2"><section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Registro de asistencia</h2><span class="mu peq">Abre el ' + esc(r.abre) + ' y cierra el ' + esc(r.cierra) + '.</span><span class="peq" style="overflow-wrap:anywhere">' + esc(r.link) + '</span>' +
      '<div class="cpn"><button class="btn sec" id="dlCop">Copiar link</button><a class="btn sec" href="' + esc(r.qr) + '" target="_blank" rel="noopener">Abrir QR para descargar ↗</a></div><img src="' + esc(r.qr) + '" alt="QR del registro" style="width:180px;height:180px;border:1px solid var(--ln);border-radius:8px"></section>' +
    (r.linkInscripcion ? '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Inscripción previa</h2><span class="mu peq">Cierra el ' + esc(r.cierreInscripcion) + ' o al llenarse el cupo (' + esc(r.cupo) + ').</span><span class="peq" style="overflow-wrap:anywhere">' + esc(r.linkInscripcion) + '</span><div class="cpn"><button class="btn sec" id="dlCopI">Copiar link</button><a class="btn sec" href="' + esc(r.qrInscripcion) + '" target="_blank" rel="noopener">Abrir QR ↗</a></div><img src="' + esc(r.qrInscripcion) + '" alt="QR de la inscripción" style="width:180px;height:180px;border:1px solid var(--ln);border-radius:8px"></section>' : '') + '</div>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Texto para WhatsApp</h2><textarea class="c" id="dlWa" style="min-height:170px">' + esc(r.whatsapp) + '</textarea><div class="cpn"><button class="btn sec" id="dlCopW">Copiar texto</button><a class="btn pri" href="' + esc(wa) + '" target="_blank" rel="noopener">Abrir WhatsApp ↗</a><a class="btn sec" href="#capins/' + encodeURIComponent(r.id) + '">Ver el dictado</a></div></section>');
  $('dlCop').onclick = () => capCopiar(r.link, 'Link de registro copiado.');
  if ($('dlCopI')) $('dlCopI').onclick = () => capCopiar(r.linkInscripcion, 'Link de inscripción copiado.');
  $('dlCopW').onclick = () => capCopiar($('dlWa').value, 'Texto copiado.');
}

// ---------- Un dictado: inscriptos, asistencia y acciones
async function capInscriptos(id) {
  cargando('#capdic', 'Leyendo el dictado…');
  let r; try { r = await capApi('c_inscriptos', { id: id }); await capCargar().catch(() => {}); } catch (e) { return capFalla('#capdic', 'Dictado', e); }
  if (location.hash.split('/')[0] !== '#capins') return;
  const D = r.dictado, R = r.resumen, cancelado = /cancel|suspend/i.test(D.estado);
  const capN = ((CAPC && CAPC.lista) || []).find(c => c.codigo === D.codigo), nomFir = String(D.firmantes || '').split(/[,;]\s*/).map(x => { const f = ((CAPC && CAPC.firmantes) || []).find(y => y.id === x); return f ? f.nombre : x; }).join(' · ');
  const kp = (t, v, s) => '<div class="kpi2"><span>' + t + '</span><b>' + v + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>';
  const asis = a => '<span class="chip ' + (a === 'Vino' ? 'ok' : a === 'No vino' ? 'er' : a === 'Avisó que no asiste' ? 'gr' : 'pa') + '">' + esc(a) + '</span>';
  marco('#capdic', '<div><a href="#capdic" class="peq">← Dictados</a></div>' +
    capTit(capN ? capN.nombre : D.codigo, esc(D.fecha + ' ' + (D.hora || '')) + ' · ' + esc(D.codigo) + (capN && capN.encuentros > 1 ? ' · encuentro ' + esc(D.encuentro) + ' de ' + capN.encuentros : '') + ' · ' + esc(D.modalidad) + (capVacio(D.lugar) || /virtual/i.test(D.lugar) ? '' : ' · ' + esc(D.lugar)) + ' · registro ' + esc(D.abre) + ' a ' + esc(D.cierra) + ' · ' + capEst(D.estado),
      '<button class="btn sec" id="diCop">Copiar link de registro</button>' + (D.linkInscripcion ? '<button class="btn sec" id="diCopI">Copiar link de inscripción</button>' : '') + '<button class="btn sec" id="diAgr">Agregar asistente</button>' + (cancelado ? '' : '<button class="btn peligro" id="diCan">Suspender o cancelar</button>')) +
    '<div class="tb5">' + (D.linkInscripcion ? kp('Inscriptos', R.activos, capVacio(R.cupo) || /sin/i.test(R.cupo) ? 'sin cupo' : R.presenciales + ' presenciales de ' + R.cupo) + kp('Vinieron', R.vinieron, 'de los inscriptos') + kp('Avisaron que no', R.anuladas) + kp('Consultas', R.consultasPendientes, 'pendientes') : '') + kp('Sin inscripción', r.sinInscripcion.length, 'vinieron igual') + '</div>' +
    (D.linkInscripcion ? '<section class="card tabla"><div style="padding:14px 18px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h2>Inscriptos</h2>' + (r.correos ? '<button class="btn sec" id="diMails">Copiar correos</button>' : '') + '</div>' +
      (!r.lista.length ? '<div class="vacio">Todavía no hay inscriptos.</div>' : '<table><thead><tr><th>Persona</th><th>Público</th><th>Modalidad</th><th>Consulta previa</th><th>Asistencia</th><th></th></tr></thead><tbody>' +
      r.lista.map((x, j) => '<tr><td><b>' + esc(x.nombre) + '</b><div class="mu peq">' + esc(x.doc) + '</div></td><td>' + esc(x.publico) + '<div class="mu peq">' + esc(x.detalle) + '</div></td><td>' + esc(x.modalidad) + '</td>' +
        '<td style="max-width:320px">' + (x.consulta ? esc(x.consulta) + '<div>' + (/pendiente/i.test(x.estadoConsulta) ? '<button class="link" data-resp="' + j + '">Marcar respondida</button>' : '<span class="mu peq">' + esc(x.estadoConsulta) + '</span>') + '</div>' : '<span class="mu">—</span>') + '</td>' +
        '<td>' + asis(x.asistencia) + (x.estado === 'Anulada' ? '<div class="mu peq">Anuló: ' + esc(x.anuladaPor) + (x.motivo ? ' · ' + esc(x.motivo) : '') + '</div>' : '') + '</td><td>' + (x.estado === 'Anulada' ? '' : '<button class="link" data-anu="' + j + '">Anular</button>') + '</td></tr>').join('') + '</tbody></table>') + '</section>' : '') +
    (r.sinInscripcion.length ? '<section class="card"><h2 style="margin-bottom:8px">Vinieron sin inscribirse</h2>' + r.sinInscripcion.map(x => '<div class="item"><span><b>' + esc(x.nombre) + '</b> <span class="mu peq">' + esc(x.doc) + '</span></span><span class="mu peq">' + esc(x.detalle) + '</span></div>').join('') + '</section>' : '') +
    (!D.linkInscripcion ? '<section class="card peq mu">Este dictado no tiene inscripción previa. Las asistencias están en el libro, hoja REGISTROS (ID_DICTADO ' + esc(D.id) + ').</section>' : '') +
    '<section class="card" id="diCert"><h2>Certificados y constancias</h2><div class="mu peq" style="margin-top:6px">Leyendo los certificados…</div></section>' +
    '<section class="card peq"><dl class="dl"><dt>Disertantes</dt><dd>' + esc(D.disertantes) + '</dd><dt>Servicios</dt><dd>' + esc(D.servicios) + '</dd><dt>Institución</dt><dd>' + esc(D.institucion) + '</dd><dt>Firmas</dt><dd>' + esc(nomFir) + '</dd><dt>Observaciones</dt><dd>' + esc(D.observaciones) + '</dd></dl></section>');
  $('diCop').onclick = () => capCopiar(D.link, 'Link de registro copiado.');
  if ($('diCopI')) $('diCopI').onclick = () => capCopiar(D.linkInscripcion, 'Link de inscripción copiado.');
  if ($('diMails')) $('diMails').onclick = () => capCopiar(r.correos, 'Correos copiados: pegalos en «CCO» de tu correo (belenpellegrini.hys@gmail.com).');
  document.querySelectorAll('[data-resp]').forEach(b => b.onclick = async () => { const x = r.lista[b.dataset.resp]; const ok = await capHacer('c_insc_consulta', { id: x.id, estado: 'Respondida' }, b, '…'); if (ok) capInscriptos(id); });
  document.querySelectorAll('[data-anu]').forEach(b => b.onclick = () => { const x = r.lista[b.dataset.anu]; capModalMotivo('Anular la inscripción de ' + x.nombre, 'El lugar queda libre. La fila no se borra: queda como anulada con el motivo.', async m => { try { await capApi('c_insc_anular', { id: x.id, motivo: m }); toast('Inscripción anulada.'); capInscriptos(id); } catch (e) { return capMsg(e); } }); });
  $('diAgr').onclick = () => modal('Agregar asistente · ' + D.codigo, [['doc', 'DNI'], ['motivo', 'Motivo', '', 1]], { motivo: 'Agregado fuera de la ventana de 48 h' }, async v => { if (!v.doc.trim()) return 'Escribí el DNI.'; try { const x = await capApi('c_asistente_agregar', { idDictado: D.id, doc: v.doc, motivo: v.motivo }); toast(x.mensaje); capInscriptos(id); } catch (e) { return capMsg(e); } }, '<p class="mu peq" style="margin:0">Si la persona no está en PERSONAS ni en la base de trabajadores, cargala por CARGA_MANUAL en el libro.</p>');
  if ($('diCan')) $('diCan').onclick = () => { const m = modal('Suspender o cancelar el dictado', [['estado', 'Estado', ['Suspendido', 'Cancelado']], ['motivo', 'Motivo (queda en el historial)', '', 1]], { estado: 'Suspendido' }, async v => { if (!v.estado || !v.motivo.trim()) return 'Elegí el estado y escribí el motivo.'; try { await capApi('c_dictado_estado', { id: D.id, estado: v.estado, motivo: v.motivo.trim() }); toast('Dictado ' + v.estado.toLowerCase() + '.'); capInscriptos(id); } catch (e) { return capMsg(e); } }, '<p class="mu peq" style="margin:0">El link de registro y el de inscripción dejan de funcionar. Avisá a los inscriptos (podés copiar los correos).</p>'); };
  capCertsDictado(D);
}

// ---------- Certificados de un dictado (fase 6)
async function capCertsDictado(D) {
  const box = $('diCert'); if (!box) return;
  let r; try { r = await capApi('c_certs_dictado', { id: D.id }); } catch (e) { box.innerHTML = '<h2>Certificados y constancias</h2><div class="aviso error" style="margin-top:8px">' + esc(capMsg(e)) + '</div>'; return; }
  if (!$('diCert')) return;
  const vivos = r.lista.filter(c => !/anulad/i.test(c.estado));
  const chipE = e => '<span class="chip ' + (/anulad/i.test(e) ? 'er' : 'ok') + '">' + esc(e) + '</span>';
  const pdfBtn = (c, j) => /anulad/i.test(c.estado) ? '' : '<button class="link" data-cpdf="' + j + '">PDF</button> · <button class="link" data-creh="' + j + '">Rehacer</button> · <button class="link" data-canu="' + j + '">Anular</button>';
  box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h2>Certificados y constancias</h2><div class="cpn">' +
      (vivos.length ? '<button class="btn sec" id="ceLote">PDF con todos (' + vivos.length + ')</button>' : '') +
      (r.programa ? '<button class="btn ' + (r.ultimo && !r.cerrado ? 'pri' : 'sec') + '" id="ceCerrar">' + (r.cerrado ? 'Revisar cierre del programa' : 'Cerrar programa') + '</button>' : '') + '</div></div>' +
    '<p class="mu peq" style="margin:6px 0 10px">Cada persona puede descargar el suyo al registrarse o desde «Mis certificados». El PDF se arma la primera vez que alguien lo abre.' + (r.programa ? ' Programa: la constancia de cada encuentro sale sola; la aprobación (asistencia mínima + evaluación final) o la participación salen al cerrar el programa' + (r.cerrado ? ' (cerrado el ' + esc(r.cerrado) + ')' : '') + '.' : '') + '</p>' +
    (!r.lista.length ? '<div class="vacio">Todavía no hay certificados de este dictado.</div>' : '<div class="tabla" style="overflow-x:auto"><table><thead><tr><th>Persona</th><th>Tipo</th><th>Código</th><th>Estado</th><th></th></tr></thead><tbody>' +
      r.lista.map((c, j) => '<tr><td><b>' + esc(c.nombre) + '</b><div class="mu peq">' + esc(c.dni) + '</div></td><td>' + esc(c.tipo) + '</td><td class="peq">' + esc(c.codigo) + '</td><td>' + chipE(c.estado) + (c.motivo ? '<div class="mu peq">' + esc(c.motivo) + '</div>' : '') + '</td><td class="peq" style="white-space:nowrap">' + pdfBtn(c, j) + '</td></tr>').join('') + '</tbody></table></div>') +
    '<h3 style="margin:16px 0 6px;font-size:15px">Disertantes invitados <span class="mu peq" style="font-weight:500">(hasta 3 · constancia sin vencimiento)</span></h3>' +
    (r.disertantes.length ? r.disertantes.map((x, j) => '<div class="item"><span><b>' + esc(x.nombre) + '</b> <span class="mu peq">' + esc(x.detalle || '') + '</span><div class="mu peq">' + (x.dni ? 'DNI ' + esc(x.dni) : '<span style="color:var(--er)">Falta el DNI</span>') + (x.correo ? ' · ' + esc(x.correo) : '') + '</div></span><span class="cpn"><button class="link" data-ded="' + j + '">Editar</button>' +
      (x.codigo ? '<span class="chip ok">' + esc(x.codigo) + '</span><button class="link" data-dpdf="' + j + '">PDF</button>' : '<button class="btn sec" data-dem="' + j + '">Emitir constancia</button>') + '</span></div>').join('') : '<div class="mu peq">Sin disertantes invitados.</div>') +
    (r.disertantes.length < 3 ? '<button class="btn sec" id="ceDisN" style="margin-top:8px">+ Agregar disertante</button>' : '');
  const abrirPdf = (b, url) => { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Abrir PDF ↗'; b.replaceWith(a); };
  const pdf = async (b, codigo) => { const x = await capHacer('c_cert_pdf', { codigo: codigo }, b, 'Armando…'); if (x) abrirPdf(b, x.url); };
  box.querySelectorAll('[data-cpdf]').forEach(b => b.onclick = () => pdf(b, r.lista[b.dataset.cpdf].codigo));
  box.querySelectorAll('[data-creh]').forEach(b => b.onclick = async () => { const c = r.lista[b.dataset.creh]; const x = await capHacer('c_cert_regenerar', { codigo: c.codigo }, b, 'Rehaciendo…'); if (x) { toast('PDF rehecho con los datos actuales (el anterior va a la papelera de Drive).'); abrirPdf(b, x.url); } });
  box.querySelectorAll('[data-canu]').forEach(b => b.onclick = () => { const c = r.lista[b.dataset.canu]; capModalMotivo('Anular ' + c.codigo + ' · ' + c.nombre, 'La fila no se borra: queda anulada con el motivo y la verificación por QR lo muestra como anulado.', async m => { try { await capApi('c_cert_anular', { codigo: c.codigo, motivo: m }); toast('Certificado anulado.'); capCertsDictado(D); } catch (e) { return capMsg(e); } }); });
  if ($('ceLote')) $('ceLote').onclick = async () => { const b = $('ceLote'); b.disabled = true; b.textContent = 'Armando ' + vivos.length + ' (puede tardar unos minutos)…';
    try { const x = await capApi('c_lote_pdf', { id: D.id }, 330000); toast(x.cantidad + ' certificados en un PDF.'); abrirPdf(b, x.url); } catch (e) { toast(capMsg(e)); b.disabled = false; b.textContent = 'PDF con todos (' + vivos.length + ')'; } };
  const disModal = (x, j) => modal(x ? 'Disertante · ' + x.nombre : 'Nuevo disertante', [['nombre', 'Nombre (como va en la constancia)'], ['detalle', 'Profesión, servicio o institución'], ['dni', 'DNI'], ['correo', 'Correo (optativo)'], ['trato', 'En la constancia', ['disertante invitada', 'disertante invitado', 'disertante invitada/o']]],
    x ? { nombre: x.nombre, detalle: x.detalle, dni: x.dni, correo: x.correo, trato: x.trato === 'a' ? 'disertante invitada' : x.trato === 'o' ? 'disertante invitado' : 'disertante invitada/o' } : { trato: 'disertante invitada/o' },
    async v => { if (!v.nombre.trim()) return 'Escribí el nombre.'; try { await capApi('c_disertante_guardar', Object.assign({ id: D.id }, x ? { idx: j } : { nuevo: true }, { nombre: v.nombre, detalle: v.detalle, dni: v.dni, correo: v.correo, trato: /invitada$/.test(v.trato) ? 'a' : /invitado$/.test(v.trato) ? 'o' : '' })); toast('Disertante guardado.'); capCertsDictado(D); } catch (e) { return capMsg(e); } });
  box.querySelectorAll('[data-ded]').forEach(b => b.onclick = () => disModal(r.disertantes[b.dataset.ded], Number(b.dataset.ded)));
  if ($('ceDisN')) $('ceDisN').onclick = () => disModal(null);
  box.querySelectorAll('[data-dem]').forEach(b => b.onclick = async () => { const x = await capHacer('c_disertante_emitir', { id: D.id, idx: Number(b.dataset.dem) }, b, 'Emitiendo…'); if (x) { toast('Constancia ' + x.codigo + '.'); capCertsDictado(D); } });
  box.querySelectorAll('[data-dpdf]').forEach(b => b.onclick = () => pdf(b, r.disertantes[b.dataset.dpdf].codigo));
  if ($('ceCerrar')) $('ceCerrar').onclick = () => capCerrarPrograma(D, '');
}
async function capCerrarPrograma(D, desde) {
  let v; try { v = await capApi('c_programa_preview', { id: D.id, desde: desde }); } catch (e) { return toast(capMsg(e)); }
  const res = x => x.yaEmitido ? '<span class="chip ok">Emitido · ' + esc(x.yaEmitido) + '</span>' : x.resultado === 'prog' ? '<span class="chip pa">Aprobación</span>' : x.resultado === 'part' ? '<span class="chip wa">Participación</span>' : '<span class="chip gr">—</span>';
  const m = modal('Cerrar programa · ' + D.codigo, [['desde', 'Contar asistencias desde', 'date']], { desde: v.desdeIso },
    async o => { if (!v.aprobacion && !v.participacion) return 'No hay certificados nuevos para emitir.'; try { const x = await capApi('c_programa_cerrar', { id: D.id, desde: o.desde }); toast('Emitidos: ' + x.aprobacion + ' de aprobación y ' + x.participacion + ' de participación.'); capCertsDictado(D); } catch (e) { return capMsg(e); } },
    '<p class="peq" style="margin:0">Asistencia mínima: <b>' + v.minimo + ' de ' + v.total + '</b> encuentros' + (v.minimoEstimado ? ' (75 %, porque la ficha no la tiene cargada)' : '') + ' + evaluación final aprobada → <b>certificado de aprobación</b>. Si no llega → <b>constancia de participación</b>. Cuenta lo registrado del ' + esc(v.desde) + ' al ' + esc(v.hasta) + ', también en el sistema actual.</p>' +
    '<p class="peq" style="margin:0"><b>' + v.aprobacion + '</b> aprobación · <b>' + v.participacion + '</b> participación · ' + v.yaEmitidos + ' ya emitidos</p>' +
    '<div style="max-height:300px;overflow:auto;border:1px solid var(--ln);border-radius:8px"><table class="peq" style="width:100%"><thead><tr><th>Persona</th><th>Encuentros</th><th>Final</th><th></th></tr></thead><tbody>' +
    v.lista.map(x => '<tr><td>' + esc(x.nombre) + '<div class="mu">' + esc(x.dni) + '</div></td><td>' + x.asistidos + ' de ' + v.total + '</td><td>' + (x.nota === null ? '—' : esc(x.nota) + ' %') + '</td><td>' + res(x) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<button type="button" class="link" id="cpRecalc" style="align-self:flex-start">Recalcular con la fecha elegida</button>');
  $('mOk').textContent = 'Emitir ' + (v.aprobacion + v.participacion);
  $('cpRecalc').onclick = () => { const f = document.querySelector('#ov [data-k="desde"]').value; m.cerrar(); capCerrarPrograma(D, f); };
}

// ---------- Firmantes
async function capFirmantes() {
  cargando('#capfir', 'Leyendo los firmantes…');
  let r; try { r = await capApi('c_firmantes', {}); } catch (e) { return capFalla('#capfir', 'Firmantes', e); }
  if (location.hash.split('/')[0] !== '#capfir') return;
  marco('#capfir', capTit('Firmantes', 'Quienes firman o avalan los certificados. Hasta 4 firmas por certificado; la tuya va siempre a la derecha.', '<button class="btn pri" id="fiNuevo">+ Nuevo firmante</button>') +
    '<div class="tb3">' + r.lista.map((f, j) => '<section class="card" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h2>' + esc(f.nombre) + '</h2>' + (f.vigente ? '<span class="chip ok">Vigente</span>' : '<span class="chip gr">No vigente</span>') + '</div>' +
      '<span class="mu peq">' + esc([f.titulo, f.cargo, f.organismo].filter(x => !capVacio(x)).join(' · ')) + '</span>' +
      '<div class="peq" style="white-space:pre-line;border:1px dashed var(--ln);border-radius:8px;padding:8px 10px"><b>Sello:</b> ' + esc(capVacio(f.aclaracion) ? 's/d' : f.aclaracion) + '</div>' +
      '<span class="peq">' + (f.firma ? '<span class="chip ok">Firma cargada</span> <a href="' + esc(f.firma) + '" target="_blank" rel="noopener">ver ↗</a>' : '<span class="chip wa">Firma pendiente de carga</span>') + (f.sello ? ' · <a href="' + esc(f.sello) + '" target="_blank" rel="noopener">sello ↗</a>' : '') + '</span>' +
      '<div><button class="btn sec" data-ed="' + j + '">Editar</button></div></section>').join('') + '</div>');
  $('fiNuevo').onclick = () => capFirmanteModal(null);
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => capFirmanteModal(r.lista[b.dataset.ed]));
}
function capFirmanteModal(f) {
  const v = f ? { NOMBRE: f.nombre, TITULO: f.titulo, CARGO: f.cargo, ORGANISMO: f.organismo, MATRICULA: f.matricula, TIPO: f.tipo, CORREO: f.correo, TELEFONO: f.telefono, ACLARACION: f.aclaracion, VIGENTE: f.vigente ? 'Sí' : 'No' } : { VIGENTE: 'Sí', TIPO: 'Aval' };
  Object.keys(v).forEach(k => { if (capVacio(v[k])) v[k] = ''; });
  const archivo = id => new Promise(ok => { const x = $(id).files[0]; if (!x) return ok(null); if (x.size > 2 * 1024 * 1024) { toast('La imagen pesa más de 2 MB.'); return ok(null); } const fr = new FileReader(); fr.onload = () => ok({ tipo: x.type, b64: fr.result }); fr.readAsDataURL(x); });
  modal(f ? 'Editar firmante · ' + f.id : 'Nuevo firmante', [['NOMBRE', 'Nombre (como va en la firma)'], ['TITULO', 'Título'], ['CARGO', 'Cargo'], ['ORGANISMO', 'Organismo o institución'], ['MATRICULA', 'Matrícula'], ['TIPO', 'Tipo', capOps(['HyS', 'Aval', 'Disertante', 'Institución educativa'], v.TIPO)],
    ['CORREO', 'Correo'], ['TELEFONO', 'Teléfono'], ['VIGENTE', 'Vigente', ['Sí', 'No']], ['ACLARACION', 'Aclaración del sello (hasta 3 renglones)', '', 1]], v, async out => {
    const lineas = out.ACLARACION.split(/\n/).length; if (lineas > 3 || out.ACLARACION.length > 150) return 'La aclaración tiene que entrar en 3 renglones (hasta 150 letras).';
    const d = Object.assign({}, out, { vigente: out.VIGENTE !== 'No' }); delete d.VIGENTE; if (f) d.ID_FIRMANTE = f.id;
    const fi = await archivo('fiF'), se = await archivo('fiS'); if (fi) d.firma = fi; if (se) d.sello = se;
    try { await capApi('c_firmante_guardar', d, 180000); toast('Firmante guardado.'); CAPC = null; capFirmantes(); } catch (e) { return capMsg(e); }
  }, '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><label class="f">Imagen de la firma (PNG con fondo transparente, o JPG)<input class="c" type="file" id="fiF" accept="image/png,image/jpeg"></label><label class="f">Imagen del sello (optativa)<input class="c" type="file" id="fiS" accept="image/png,image/jpeg"></label></div>' +
    '<p class="mu peq" style="margin:0">Las imágenes se guardan en Drive › carpeta FIRMAS, junto al libro. Mientras no haya imagen, el certificado lleva la línea y la aclaración.</p>');
}

// ---------- Fase 7: agenda, cumplimiento, matriz y jefaturas (libro CAPACITACIONES · Agenda_codigo.gs)
const CAP_AGENDA_WEB = RESPALDO ? CAP_API + '?a=1' : 'https://hyslhmh-sudo.github.io/capacitaciones/agenda.html';   // la página de GitHub solo envuelve a la de Google
const CAP_EST_TURNO = { Libre: 'gr', Pendiente: 'wa', Reservado: 'ok', 'Clase abierta': 'pa', Realizado: 'ok', Suspendido: 'er', Cancelado: 'er', 'No se presentó': 'er', 'Sin uso': 'gr', Anulado: 'gr' };
let CAPAG = { desde: '' }, CAPCU = { grupo: '', filtro: 'todos', q: '' }, CAPMT = null;
const capChipT = e => '<span class="chip ' + (CAP_EST_TURNO[e] || 'gr') + '">' + esc(e || 's/d') + '</span>';
const capIsoMas = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const capHoyIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
// Ventana propia (para contenidos que no son un formulario simple)
function capVentana(titulo, html, botones) {
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '"><h2>' + esc(titulo) + '</h2><div class="aviso error" id="vErr" hidden></div><div id="vCuerpo" style="display:flex;flex-direction:column;gap:12px">' + html + '</div>' +
    '<div class="acciones" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div class="cpn" id="vIzq"></div><div class="cpn"><button class="btn sec" id="vCer">Cerrar</button>' + (botones || '') + '</div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('vCer').onclick = cerrar;
  return { cerrar: cerrar, error: t => { $('vErr').textContent = t || ''; $('vErr').hidden = !t; } };
}

// ---------- Agenda
async function capAgenda(desde) {
  if (desde) CAPAG.desde = desde;
  cargando('#capag', 'Leyendo la agenda…');
  let r; try { r = await capApi('c_ag_semana', { desde: CAPAG.desde }); } catch (e) { return capFalla('#capag', 'Agenda', e); }
  if (location.hash.split('/')[0] !== '#capag') return;
  CAPAG.r = r; CAPAG.desde = r.desde;
  const K = r.kpi, kp = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const dias = []; for (let i = 0; i < 7; i++) dias.push(capIsoMas(r.desde, i));
  const nomDia = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const tarjeta = t => '<button class="agT" data-t="' + esc(t.id) + '" style="border-left-color:var(--' + ({ ok: 'ok', wa: 'wa', er: 'er', pa: 'pa', gr: 'ln' }[CAP_EST_TURNO[t.estado] || 'gr']) + ')"><b>' + esc(t.hora + (t.horaFin ? '–' + t.horaFin : '')) + '</b>' +
    (t.estado === 'Libre' ? '<span class="mu">Libre</span>' : t.corto || t.codigo ? '<span>' + esc(t.corto || t.codigo) + '</span>' : '') +
    (t.jefatura ? '<small>' + esc(t.jefatura) + '</small>' : t.estado === 'Clase abierta' || (t.tipo === 'Clase abierta' && t.estado === 'Realizado') ? '<small>Clase abierta · ' + t.inscriptos + ' anotado(s)</small>' : '') + (t.estado !== 'Libre' ? capChipT(t.estado) : '') + '</button>';
  const filaP = (t, acc) => '<tr><td><b>' + esc(t.dia + ' ' + t.hora) + '</b><div class="mu peq">' + esc(t.lugar) + '</div></td><td>' + esc(t.jefatura || (t.tipo === 'Clase abierta' ? 'Clase abierta' : '—')) + '<div class="mu peq">' + esc([t.pedidoPor, t.cargo].filter(x => x && x !== 's/d').join(' · ')) + '</div></td><td>' + esc(t.corto || t.codigo) + '</td><td>' + acc + '</td></tr>';
  marco('#capag', capTit('Agenda', 'Horarios para servicios y clases abiertas · franjas: ' + esc(r.franjasTexto || 'sin franjas') + ' · <a href="' + CAP_AGENDA_WEB + '" target="_blank" rel="noopener">agenda pública ↗</a>',
      '<button class="btn pri" id="agAbr">+ Abrir horarios</button><button class="btn sec" id="agCla">+ Clase abierta</button><button class="btn sec" id="agFra">Franjas</button><button class="btn sec" id="agTxt">Texto de la semana</button><button class="btn sec" id="agMsg">Correos enviados</button><button class="btn sec" id="agLnk">Copiar link de la agenda</button>') +
    (!r.envioOk ? '<div class="aviso error">Los correos de la agenda no salen: falta «Enviar como» belenpellegrini.hys@gmail.com en el Gmail de la cuenta del libro. Las reservas se guardan igual.</div>' : !r.disparador ? '<div class="aviso">Los recordatorios automáticos (7, 2 y 1 día antes) todavía no están activos. <button class="btn pri" id="agRec" style="margin-left:8px">Activar recordatorios</button></div>' : '') +
    '<div class="tb5">' + kp('Horarios ofrecidos', K.ofrecidos, 'próximas 2 semanas') + kp('Reservados por servicios', K.reservados, 'de ' + K.ofrecidos + ' para servicios') + kp('Clases abiertas', K.clases, K.anotados + ' persona(s) anotada(s)') +
      kp('Para confirmar', K.pendientes, 'pedidos pendientes', K.pendientes ? 'var(--wa)' : '') + kp('No se presentaron', K.ausencias, 'este mes', K.ausencias ? 'var(--er)' : '') + '</div>' +
    (r.pendientes.length ? '<section class="card tabla"><div style="padding:14px 18px"><h2>Pedidos para confirmar</h2><span class="mu peq">Reservas con menos de 48 h de anticipación o pedidas por alguien que no está en JEFATURAS.</span></div><table><thead><tr><th>Cuándo</th><th>Servicio y quién pide</th><th>Capacitación</th><th></th></tr></thead><tbody>' +
      r.pendientes.map(t => filaP(t, '<div class="cpn"><button class="btn pri" data-conf="' + esc(t.id) + '">Confirmar</button><button class="btn sec" data-rech="' + esc(t.id) + '">No confirmar</button></div>')).join('') + '</tbody></table></section>' : '') +
    (r.sinMarcar.length ? '<section class="card tabla"><div style="padding:14px 18px"><h2>¿Se dieron?</h2><span class="mu peq">Horarios que ya pasaron y no tienen asistencias registradas. Marcá qué pasó (queda para el informe).</span></div><table><thead><tr><th>Cuándo</th><th>Servicio</th><th>Capacitación</th><th></th></tr></thead><tbody>' +
      r.sinMarcar.map(t => filaP(t, '<div class="cpn"><button class="btn sec" data-mk="Realizado" data-id="' + esc(t.id) + '">Se dio</button><button class="btn sec" data-mk="No se presentó" data-id="' + esc(t.id) + '">No se presentó</button><button class="btn sec" data-mk="Suspendido" data-id="' + esc(t.id) + '">Suspendido</button></div>')).join('') + '</tbody></table></section>' : '') +
    '<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><button class="btn sec" id="agAnt">← Semana anterior</button><h2>Semana del ' + fechaTxt(r.desde).slice(0, 5) + ' al ' + fechaTxt(r.hasta) + '</h2><div class="cpn"><button class="btn sec" id="agHoy">Hoy</button><button class="btn sec" id="agSig">Semana siguiente →</button></div></div>' +
    '<div class="agSem">' + dias.map((d, i) => { const l = r.turnos.filter(t => t.fecha === d); return '<div class="agDia' + (d === capHoyIso() ? ' hoy' : '') + '"><div class="agCab">' + nomDia[i] + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7) + '</div>' + (l.length ? l.map(tarjeta).join('') : '<div class="mu peq" style="padding:6px 2px">—</div>') + '</div>'; }).join('') + '</div>' +
    '<p class="mu peq" style="margin:10px 0 0">Tocá un horario para ver el detalle y cambiarlo. Nunca se borra: se cambia el estado con su motivo. Si el portal falla: libro CAPACITACIONES, hoja AGENDA.</p></section>');
  $('agAnt').onclick = () => { location.hash = '#capag/' + capIsoMas(r.desde, -7); };
  $('agSig').onclick = () => { location.hash = '#capag/' + capIsoMas(r.desde, 7); };
  $('agHoy').onclick = () => { CAPAG.desde = ''; location.hash === '#capag' ? capAgenda() : location.hash = '#capag'; };
  $('agAbr').onclick = () => capAbrirHorarios(r);
  $('agCla').onclick = () => capClaseAbierta(r, null);
  $('agFra').onclick = () => capFranjas(r);
  $('agTxt').onclick = capTextoSemana;
  $('agMsg').onclick = capMensajes;
  $('agLnk').onclick = () => capCopiar(CAP_AGENDA_WEB, 'Link de la agenda copiado: sirve para personas y jefaturas.');
  if ($('agRec')) $('agRec').onclick = async () => { const x = await capHacer('c_ag_recordatorios', {}, $('agRec'), 'Activando…'); if (x) { toast(x.mensaje); capAgenda(); } };
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => capTurno(r.turnos.find(t => t.id === b.dataset.t), r));
  document.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => capConfirmar(r.pendientes.find(t => t.id === b.dataset.conf)));
  document.querySelectorAll('[data-rech]').forEach(b => b.onclick = () => { const t = r.pendientes.find(x => x.id === b.dataset.rech); capModalMotivo('No confirmar · ' + t.jefatura, 'El horario vuelve a quedar libre y se avisa por correo a quien lo pidió.', async m => { try { const x = await capApi('c_ag_confirmar', { id: t.id, decision: 'rechazar', motivo: m }); toast(x.mensaje); capAgenda(); } catch (e) { return capMsg(e); } }); });
  document.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => capEstadoTurno({ id: b.dataset.id }, b.dataset.mk, false));
}
function capConfirmar(t) {
  const v = capVentana('Confirmar el pedido', '<dl class="dl"><dt>Servicio</dt><dd>' + esc(t.jefatura) + '</dd><dt>Pidió</dt><dd>' + esc((t.pedidoPor || 's/d') + (t.cargo ? ' (' + t.cargo + ')' : '') + ' · DNI ' + (t.pedidoDni || 's/d')) + '</dd><dt>Cuándo</dt><dd>' + esc(t.dia + ' ' + t.hora + '–' + t.horaFin) + '</dd><dt>Capacitación</dt><dd>' + esc(t.nombre || t.codigo) + '</dd><dt>Avisos a</dt><dd>' + esc(t.correo || 's/d') + '</dd></dl>' +
    '<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="vSumar" checked> <span>Habilitar a esta persona para reservar por <b>' + esc(t.jefatura) + '</b> (queda en JEFATURAS, columna OTROS_DNI). Destildalo si no corresponde.</span></label>' +
    '<p class="mu peq" style="margin:0">Al confirmar se crea el dictado con su QR de registro y se avisa por correo.</p>', '<button class="btn pri" id="vOk">Confirmar</button>');
  $('vOk').onclick = async () => { const x = await capHacer('c_ag_confirmar', { id: t.id, decision: 'confirmar', sumarDni: $('vSumar').checked }, $('vOk'), 'Confirmando…'); if (x) { v.cerrar(); toast(x.mensaje); capAgenda(); } };
}
function capTurno(t, r) {
  const ins = t.inscriptos, futuro = !t.pasado;
  const dl = '<dl class="dl"><dt>Estado</dt><dd>' + capChipT(t.estado) + (t.motivo ? ' <span class="mu peq">' + esc(t.motivo) + '</span>' : '') + '</dd><dt>Cuándo</dt><dd>' + esc(t.dia + ' · ' + t.hora + (t.horaFin ? ' a ' + t.horaFin : '') + ' h') + '</dd><dt>Dónde</dt><dd>' + esc((t.lugar || 's/d') + (t.modalidad && t.modalidad !== 'Presencial' ? ' · ' + t.modalidad : '')) + '</dd>' +
    (t.codigo ? '<dt>Capacitación</dt><dd>' + esc(t.codigo + ' · ' + t.nombre) + '</dd>' : '') +
    (t.jefatura ? '<dt>Servicio</dt><dd>' + esc(t.jefatura) + '</dd><dt>Pidió</dt><dd>' + esc((t.pedidoPor || 's/d') + (t.cargo && t.cargo !== 's/d' ? ' (' + t.cargo + ')' : '') + (t.fechaPedido ? ' · ' + t.fechaPedido : '')) + '</dd><dt>Avisos a</dt><dd>' + esc(t.correo || 's/d') + '</dd>' : '') +
    (t.tipo === 'Clase abierta' ? '<dt>Anotados</dt><dd>' + ins + (t.cupo ? ' de ' + esc(t.cupo) : '') + '</dd><dt>En el portal público</dt><dd>' + esc(t.publicado || 'No') + '</dd>' : '') +
    (t.idDictado ? '<dt>Asistencias</dt><dd>' + t.asistentes + ' · <a href="#capins/' + encodeURIComponent(t.idDictado) + '">ver el dictado y su QR</a></dd>' : '') +
    (t.confirmadoPor ? '<dt>Confirmado</dt><dd>' + esc(t.confirmadoPor) + '</dd>' : '') + (t.recordatorios ? '<dt>Recordatorios</dt><dd>' + esc(t.recordatorios) + '</dd>' : '') +
    (t.observaciones && t.observaciones !== 's/d' ? '<dt>Observaciones</dt><dd>' + esc(t.observaciones) + '</dd>' : '') + '<dt>Código</dt><dd class="mu">' + esc(t.id) + (t.origen ? ' · ' + esc(t.origen) : '') + '</dd></dl>';
  let bot = '';
  if (t.estado === 'Libre' && futuro) bot = '<button class="btn sec" id="vAnu">Anular el horario</button><button class="btn pri" id="vCla">Hacer clase abierta</button>';
  if (t.estado === 'Pendiente') bot = '<button class="btn pri" id="vConf">Confirmar…</button>';
  if ((t.estado === 'Reservado' || t.estado === 'Clase abierta') && futuro) bot = '<button class="btn peligro" id="vSus">Suspender</button>' + (t.estado === 'Clase abierta' ? '<button class="btn sec" id="vLnk">Copiar link de esta clase</button>' : '');
  if ((t.estado === 'Reservado' || t.estado === 'Clase abierta') && !futuro) bot = '<button class="btn sec" data-k2="No se presentó">No se presentó</button><button class="btn sec" data-k2="Suspendido">Suspendido</button><button class="btn pri" data-k2="Realizado">Se dio</button>';
  const v = capVentana(t.tipo === 'Clase abierta' ? 'Clase abierta' : 'Horario para servicios', dl, bot);
  if ($('vCla')) $('vCla').onclick = () => { v.cerrar(); capClaseAbierta(r, t); };
  if ($('vConf')) $('vConf').onclick = () => { v.cerrar(); capConfirmar(t); };
  if ($('vAnu')) $('vAnu').onclick = () => { v.cerrar(); capEstadoTurno(t, 'Anulado', false); };
  if ($('vSus')) $('vSus').onclick = () => { v.cerrar(); capEstadoTurno(t, 'Suspendido', true); };
  if ($('vLnk')) $('vLnk').onclick = () => capCopiar(CAP_AGENDA_WEB + '?t=' + encodeURIComponent(t.id), 'Link de la clase copiado.');
  document.querySelectorAll('#ov [data-k2]').forEach(b => b.onclick = () => { v.cerrar(); capEstadoTurno(t, b.dataset.k2, false); });
}
function capEstadoTurno(t, estado, avisa) {
  const sinMotivo = estado === 'Realizado';
  const campos = sinMotivo ? [] : [['motivo', 'Motivo (queda en el historial y en el informe)', '', 1]];
  if (avisa) campos.push(['avisar', 'Avisar por correo a ' + (t.estado === 'Clase abierta' ? 'las personas anotadas' : 'la jefatura'), ['Sí', 'No']], ['liberar', 'Volver a ofrecer el horario a otros servicios', ['Sí', 'No']]);
  const ok = async v => { if (!sinMotivo && !String(v.motivo || '').trim()) return 'Escribí el motivo.'; try { const x = await capApi('c_ag_estado', { id: t.id, estado: estado, motivo: v.motivo || '', avisar: v.avisar !== 'No', liberar: v.liberar === 'Sí' }); toast(x.mensaje); capAgenda(); } catch (e) { return capMsg(e); } };
  if (sinMotivo) return ok({});
  modal(estado + ' · ' + (t.dia ? t.dia + ' ' + t.hora : t.id), campos, { avisar: 'Sí', liberar: 'No' }, ok, '<p class="mu peq" style="margin:0">La fila no se borra: cambia el estado y queda el motivo.</p>');
}
function capAbrirHorarios(r) {
  const hoy = capHoyIso();
  modal('Abrir horarios para servicios', [['desde', 'Desde', 'date'], ['hasta', 'Hasta', 'date'], ['duracion', 'Duración de cada horario', ['60 minutos', '90 minutos', '120 minutos']], ['saltear', 'Días que no (feriados, licencias): fechas separadas por coma, dd/mm/aaaa', '', 1]],
    { desde: hoy, hasta: capIsoMas(hoy, 27), duracion: '90 minutos' },
    async v => { try { const x = await capApi('c_ag_abrir', { desde: v.desde, hasta: v.hasta, duracion: parseInt(v.duracion, 10) || 90, saltear: v.saltear }); toast(x.mensaje); capAgenda(); } catch (e) { return capMsg(e); } },
    '<p class="mu peq" style="margin:0">Se crean solo dentro de tus franjas (' + esc(r.franjasTexto || 'sin franjas') + ') y sin superponerse con lo que ya está. Las jefaturas los ven en la agenda pública.</p>');
}
function capClaseAbierta(r, t) {
  const caps = r.capacitaciones.map(c => c.codigo + ' · ' + c.nombre), lug = (r.lugares || []).map(l => l.lugar);
  const campos = [['cap', 'Capacitación', caps]].concat(t ? [] : [['fecha', 'Fecha', 'date'], ['hora', 'Hora de inicio (hh:mm)'], ['horaFin', 'Hora de fin (hh:mm)']]).concat([['modalidad', 'Modalidad', ['Presencial', 'Virtual', 'Híbrida']], ['lugar', 'Lugar', lug.concat(['En el servicio'])], ['cupo', 'Cupo (vacío = capacidad del lugar)'], ['publicar', 'Publicar en el portal público', ['Sí', 'No']]]);
  modal(t ? 'Clase abierta · ' + t.dia + ' ' + t.hora : 'Nueva clase abierta', campos, { modalidad: 'Presencial', publicar: 'Sí', lugar: t && t.lugar !== 'En el servicio' ? t.lugar : '' },
    async v => {
      if (!v.cap) return 'Elegí la capacitación.';
      if (!t && (!v.fecha || !/^\d{1,2}:\d{2}$/.test(v.hora))) return 'Completá la fecha y la hora (hh:mm).';
      if (v.modalidad !== 'Virtual' && !v.lugar) return 'Elegí el lugar.';
      try { const x = await capApi('c_ag_clase', { id: t ? t.id : '', codigo: v.cap.split(' · ')[0], fecha: v.fecha, hora: v.hora, horaFin: v.horaFin, modalidad: v.modalidad, lugar: v.lugar, cupo: v.cupo, publicar: v.publicar !== 'No' });
        toast(x.mensaje); capAgenda(); setTimeout(() => capTextoSemana(x.whatsapp), 400); } catch (e) { return capMsg(e); }
    }, '<p class="mu peq" style="margin:0">Cualquier persona se anota con DNI y correo desde la agenda pública; le llegan la confirmación y los recordatorios. Se crea el dictado con su QR de registro. Fuera de tus franjas también se puede: queda anotado.</p>');
}
function capFranjas(r) {
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const lista = (r.franjas || []).map(f => ({ dia: f.diaTxt, desde: f.desde, hasta: f.hasta, lugar: f.lugar }));
  const pintar = () => { $('frL').innerHTML = lista.map((f, i) => '<div class="frF"><select class="c" data-i="' + i + '" data-c="dia">' + DIAS.map(d => '<option' + (d === f.dia ? ' selected' : '') + '>' + d + '</option>').join('') + '</select><input class="c" type="time" data-i="' + i + '" data-c="desde" value="' + esc(f.desde) + '"><input class="c" type="time" data-i="' + i + '" data-c="hasta" value="' + esc(f.hasta) + '"><input class="c" data-i="' + i + '" data-c="lugar" value="' + esc(f.lugar) + '"><button class="link" data-q="' + i + '">Quitar</button></div>').join('') || '<span class="mu peq">Sin franjas.</span>';
    $('frL').querySelectorAll('[data-c]').forEach(el => el.onchange = () => { lista[el.dataset.i][el.dataset.c] = el.value; });
    $('frL').querySelectorAll('[data-q]').forEach(b => b.onclick = () => { lista.splice(Number(b.dataset.q), 1); pintar(); }); };
  const v = capVentana('Franjas semanales', '<p class="mu peq" style="margin:0">Días y horas en que ofrecés capacitaciones a los servicios. Los horarios ya abiertos no cambian; las franjas que quites quedan como «no vigentes» en la hoja FRANJAS.</p><div class="frF mu peq" style="font-weight:700"><span>Día</span><span>Desde</span><span>Hasta</span><span>Lugar</span><span></span></div><div id="frL" class="col"></div><button class="btn sec" id="frN">+ Agregar franja</button>', '<button class="btn pri" id="frOk">Guardar</button>');
  pintar();
  $('frN').onclick = () => { lista.push({ dia: 'Lunes', desde: '09:00', hasta: '12:00', lugar: 'En el servicio' }); pintar(); };
  $('frOk').onclick = async () => { const x = await capHacer('c_ag_franjas', { franjas: lista }, $('frOk')); if (x) { v.cerrar(); toast('Franjas guardadas: ' + x.texto); capAgenda(); } };
}
async function capTextoSemana(texto) {
  let t = typeof texto === 'string' ? texto : '', qr = '';
  if (!t) { try { const x = await capApi('c_ag_whatsapp', {}); t = x.texto; qr = x.qr; } catch (e) { return toast(capMsg(e)); } }
  const v = capVentana('Texto de la semana', '<span class="mu peq">Para WhatsApp o grupos: clases abiertas de los próximos 8 días con el link de la agenda.</span><textarea class="c" id="txS" style="min-height:260px;font-family:inherit">' + esc(t) + '</textarea>' +
    (qr ? '<div style="display:flex;gap:12px;align-items:center"><img src="' + esc(qr) + '" alt="QR de la agenda" style="width:110px;height:110px;border:1px solid var(--ln);border-radius:8px"><span class="mu peq">QR de la agenda: sirve para la cartelera. El cartel imprimible de la semana llega con el paso de difusión.</span></div>' : ''),
    '<button class="btn pri" id="txC">Copiar</button>');
  $('txC').onclick = () => capCopiar($('txS').value, 'Texto copiado: pegalo en WhatsApp.');
}
async function capMensajes() {
  let r; try { r = await capApi('c_ag_mensajes', {}); } catch (e) { return toast(capMsg(e)); }
  capVentana('Correos de la agenda', '<span class="mu peq">Los últimos 60. Salen solos desde belenpellegrini.hys@gmail.com: confirmaciones, recordatorios 7, 2 y 1 día antes y avisos de suspensión. Todo queda en la hoja _MENSAJES.</span>' +
    (r.lista.length ? '<div class="tabla" style="max-height:420px;overflow:auto"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Para</th><th>Asunto</th><th>Estado</th></tr></thead><tbody>' + r.lista.map(m => '<tr><td class="peq">' + esc(m.fecha) + '</td><td class="peq">' + esc(m.tipo) + '</td><td class="peq">' + esc(m.para) + '</td><td class="peq">' + esc(m.asunto) + '</td><td>' + '<span class="chip ' + (/^enviado/i.test(m.estado) ? 'ok' : 'er') + '">' + esc(m.estado) + '</span></td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Todavía no salió ningún correo.</div>'));
}

// ---------- Cumplimiento
async function capCumplimiento(fresco) {
  if (!CAPCU.t || fresco || CAPCU.t.grupo !== (CAPCU.grupo || CAPCU.t.grupo)) {
    cargando('#capcump', fresco ? 'Recalculando con la base de trabajadores, la matriz y los registros (puede tardar un minuto)…' : 'Leyendo el cumplimiento…');
    try { CAPCU.t = await capApi('c_cumplimiento', { fresco: !!fresco, grupo: CAPCU.grupo }, 240000); } catch (e) { return capFalla('#capcump', 'Cumplimiento', e); }
  }
  if (location.hash.split('/')[0] !== '#capcump') return;
  const T = CAPCU.t, K = T.kpi;
  const kp = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const colP = p => p >= 80 ? 'var(--ok)' : p >= 40 ? 'var(--wa)' : 'var(--er)';
  const barra = p => '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:60px;height:8px;border-radius:99px;background:#EEF2F4;overflow:hidden"><i style="display:block;height:100%;width:' + Math.min(100, p) + '%;background:' + colP(p) + '"></i></div><b style="min-width:38px">' + p + ' %</b></div>';
  const fuego = f => !f.req ? '<span class="mu">—</span>' : [['ext', 'Ext.'], ['seg', 'S. h.'], ['eva', 'Evac.']].map(x => '<span class="chip mini ' + (f[x[0]] >= f.req ? 'ok' : f[x[0]] ? 'wa' : 'er') + '" title="' + x[1] + ': ' + f[x[0]] + ' de ' + f.req + '">' + x[1] + ' ' + f[x[0]] + '/' + f.req + '</span>').join(' ');
  const q = capNorm(CAPCU.q), F = CAPCU.filtro;
  const lista = T.servicios.filter(s => (F === 'todos' || (F === 'prio' && s.prioritario) || (F === 'fuego' && s.sinIncendio) || (F === 'nunca' && s.nunca) || (F === 'sinj' && s.sinJefatura)) && (!q || capNorm(s.servicio).indexOf(q) >= 0));
  const sel = (v, t) => '<option value="' + v + '"' + (F === v ? ' selected' : '') + '>' + t + '</option>';
  marco('#capcump', capTit('Cumplimiento', esc(T.grupo) + ' · ' + K.personal + ' personas de la base de trabajadores · obligatorias según la MATRIZ · calculado el ' + new Date(T.calculado).toLocaleString('es-AR'),
      (T.grupos && T.grupos.length > 1 ? '<label class="f">Grupo<select class="c" id="cuG">' + T.grupos.map(g => '<option' + (g === T.grupo ? ' selected' : '') + '>' + esc(g) + '</option>').join('') + '</select></label>' : '') +
      '<a class="btn sec" href="#capmat">Matriz</a><a class="btn sec" href="#capjef">Jefaturas</a><button class="btn sec" id="cuAct">Recalcular</button>') +
    '<div class="tb5">' + kp('Meta ' + fechaTxt(K.meta), K.diasMeta, 'días para que todo el personal tenga sus obligatorias') + kp('Obligatorias cumplidas', K.pct + ' %', K.porEst.map(e => e.codigo + ' ' + e.pct + ' %').join(' · '), colP(K.pct)) +
      kp('Sin nada de incendio', K.sinIncendio, 'servicios (' + K.personasSinIncendio + ' personas): ni extintores, ni seguridad humana, ni evacuación', K.sinIncendio ? 'var(--er)' : '') + kp('Nunca se capacitaron', K.nunca, 'servicios sin ningún registro', K.nunca ? 'var(--er)' : '') + kp('Personas al día', K.alDia, 'con todas sus obligatorias vigentes') + '</div>' +
    (T.jefaturasSinDatos ? '<div class="aviso">' + T.jefaturasSinDatos + ' jefatura(s) tienen responsable pero no su DNI: sin DNI no pueden reservar directo. <a href="#capjef">Completar en Jefaturas</a></div>' : '') +
    '<section class="card tabla"><div style="padding:14px 18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:flex-end"><div><h2>Cumplimiento por servicio</h2><span class="mu peq">De peor a mejor. «Incendio»: extintores, seguridad humana y evacuación; se ofrecen en ese orden y para el cumplimiento alcanza con tener las tres.</span></div>' +
      '<div class="filtros"><label class="f">Mostrar<select class="c" id="cuF">' + sel('todos', 'Todos') + sel('prio', 'Prioritarios') + sel('fuego', 'Sin nada de incendio') + sel('nunca', 'Nunca se capacitaron') + sel('sinj', 'Sin jefatura cargada') + '</select></label><label class="f">Buscar<input class="c" id="cuQ" value="' + esc(CAPCU.q) + '"></label></div></div>' +
      '<table><thead><tr><th>Servicio</th><th>Personal</th><th style="min-width:150px">Obligatorias</th><th>Incendio</th><th>Agenda</th><th>Sugerida</th></tr></thead><tbody>' +
      (lista.length ? lista.map(s => '<tr class="cl" data-s="' + esc(s.servicio) + '"><td><b>' + esc(s.servicio) + '</b>' + (s.prioritario ? ' <span class="chip mini pa">Prioritario</span>' : '') + (s.sinJefatura ? ' <span class="chip mini gr">Sin jefatura</span>' : '') + (s.nunca ? ' <span class="chip mini er">Nunca</span>' : '') + '<div class="mu peq">' + esc(s.establecimientos) + '</div></td>' +
        '<td>' + s.personal + '</td><td>' + barra(s.pct) + '<div class="mu peq">' + s.cumplidas + ' de ' + s.obligatorias + ' · al día ' + s.alDia + '</div></td><td>' + fuego(s.fuego) + '</td>' +
        '<td class="peq">' + (s.proxima ? '<b>' + esc(s.proxima.fecha + ' ' + s.proxima.hora) + '</b><div class="mu">' + esc(s.proxima.codigo) + ' · ' + esc(s.proxima.estado) + '</div>' : s.ausencias ? '<span style="color:var(--er)">' + s.ausencias + ' ausencia(s)</span>' : '<span class="mu">Sin reservas</span>') + '</td>' +
        '<td class="peq">' + (s.sugeridas.length ? esc(s.sugeridas[0].corto) + '<div class="mu">' + s.sugeridas[0].elegibles + ' persona(s)</div>' : '<span class="mu">—</span>') + '</td></tr>').join('') : '<tr><td colspan="6"><div class="vacio">Nada con ese filtro.</div></td></tr>') + '</tbody></table></section>' +
    '<p class="mu peq">Si el portal falla: libro CAPACITACIONES, hojas CUMPLIMIENTO y CUMPLIMIENTO_PERSONAS (menú Capacitaciones HyS › Cumplimiento: recalcular ahora).</p>');
  $('cuAct').onclick = () => capCumplimiento(true);
  if ($('cuG')) $('cuG').onchange = e => { CAPCU.grupo = e.target.value; CAPCU.t = null; capCumplimiento(); };
  $('cuF').onchange = e => { CAPCU.filtro = e.target.value; capCumplimiento(); };
  $('cuQ').oninput = e => { CAPCU.q = e.target.value; clearTimeout(capCumplimiento.t); capCumplimiento.t = setTimeout(() => { capCumplimiento(); const i = $('cuQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
  document.querySelectorAll('tr.cl[data-s]').forEach(tr => tr.onclick = () => location.hash = '#capserv/' + encodeURIComponent(tr.dataset.s));
}
async function capServicio(nombre) {
  cargando('#capcump', 'Leyendo el servicio…');
  let r; try { r = await capApi('c_cump_servicio', { servicio: nombre, grupo: CAPCU.grupo }, 120000); } catch (e) { return capFalla('#capcump', nombre, e); }
  if (location.hash.split('/')[0] !== '#capserv') return;
  const s = r.servicio, J = r.jefatura, caps = r.caps;
  const kp = (t, v, sub, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + sub + '</small></div>';
  const faltan = Object.keys(s.faltan).map(c => ({ c: c, n: s.faltan[c], e: (s.elegibles || {})[c] || 0 })).sort((a, b) => b.n - a.n);
  marco('#capcump', '<div><a href="#capcump" class="peq">← Cumplimiento</a></div>' + capTit(s.servicio, esc(s.establecimientos) + ' · ' + s.personal + ' personas', '<a class="btn sec" href="' + CAP_AGENDA_WEB + '" target="_blank" rel="noopener">Agenda pública ↗</a>') +
    '<div class="tb5">' + kp('Obligatorias', s.pct + ' %', s.cumplidas + ' de ' + s.obligatorias, s.pct >= 80 ? 'var(--ok)' : s.pct >= 40 ? 'var(--wa)' : 'var(--er)') + kp('Al día', s.alDia, 'de ' + s.personal + ' personas') +
      kp('Extintores', s.fuego.ext + ' / ' + s.fuego.req, '1.° de la secuencia') + kp('Seguridad humana', s.fuego.seg + ' / ' + s.fuego.req, '2.°') + kp('Evacuación', s.fuego.eva + ' / ' + s.fuego.req, '3.°') + '</div>' +
    '<div class="grid g2"><section class="card"><h2>Lo que conviene dictar primero</h2><p class="mu peq" style="margin:4px 0 8px">Lo que más falta y se puede tomar ya (la secuencia de incendio, en orden). Es lo que ve la jefatura en la agenda.</p>' +
      (s.sugeridas.length ? s.sugeridas.slice(0, 6).map((x, i) => '<div class="item"><span><b>' + (i + 1) + '. ' + esc(x.nombre) + '</b><div class="mu peq">' + esc(x.codigo) + (x.reservada ? ' · reservada el ' + esc(x.reservada) : '') + '</div></span><span class="chip ' + (i === 0 ? 'pa' : 'gr') + '">' + x.elegibles + ' persona(s)</span></div>').join('') : '<div class="mu">Nada pendiente.</div>') + '</section>' +
    '<section class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h2>Jefatura</h2>' + (J ? '<button class="btn sec" id="svJ">Editar</button>' : '<a class="btn sec" href="#capjef">Cargar jefatura</a>') + '</div>' +
      (J ? '<dl class="dl" style="margin-top:8px"><dt>Responsable</dt><dd>' + esc(J.responsable) + (J.cargo && J.cargo !== 's/d' ? ' · ' + esc(J.cargo) : '') + '</dd><dt>DNI</dt><dd>' + (J.dni ? esc(J.dni) : '<span style="color:var(--er)">Falta: sin DNI no puede reservar directo</span>') + '</dd><dt>Coordinación o A/C</dt><dd>' + esc(J.otros || '—') + '</dd><dt>Avisos a</dt><dd>' + esc(J.correoServicio || J.correo || 'Sin correo cargado') + '</dd><dt>Servicios que abarca</dt><dd>' + esc(J.servicios) + '</dd>' + (J.ultimoInforme ? '<dt>Último informe</dt><dd>' + esc(J.ultimoInforme) + (J.link ? ' · <a href="' + esc(J.link) + '" target="_blank" rel="noopener">PDF ↗</a>' : '') + '</dd>' : '') + '</dl>'
        : '<p class="mu peq">Este servicio no tiene jefatura cargada: sus personas cuentan para el cumplimiento, pero nadie puede reservar por el servicio hasta cargarla.</p>') + '</section></div>' +
    '<section class="card tabla"><div style="padding:14px 18px"><h2>Qué falta, por capacitación</h2></div><table><thead><tr><th>Capacitación</th><th>Les falta</th><th>Pueden tomarla ya</th></tr></thead><tbody>' +
      (faltan.length ? faltan.map(x => '<tr><td><b>' + esc((caps[x.c] || {}).nombre || x.c) + '</b><div class="mu peq">' + esc(x.c) + '</div></td><td>' + x.n + '</td><td>' + x.e + (x.e < x.n ? ' <span class="mu peq">(el resto primero hace la anterior de la secuencia)</span>' : '') + '</td></tr>').join('') : '<tr><td colspan="3"><div class="vacio">Nada pendiente.</div></td></tr>') + '</tbody></table></section>' +
    '<section class="card tabla"><div style="padding:14px 18px"><h2>Personas</h2><span class="mu peq">Los datos de cada persona se corrigen en la base de trabajadores.</span></div><table><thead><tr><th>Persona</th><th>Función</th><th>Obligatorias</th><th>Le falta</th></tr></thead><tbody>' +
      s.personas.sort((a, b) => a.pct - b.pct || a.ape.localeCompare(b.ape)).map(p => '<tr><td><b>' + esc(p.ape + ', ' + p.nom) + '</b><div class="mu peq">' + esc(p.dni + ' · ' + p.est) + '</div></td><td class="peq">' + esc(p.funcion) + '</td><td><b>' + p.pct + ' %</b> <span class="mu peq">' + p.ok + '/' + p.obl + '</span></td><td class="peq">' + esc(p.falta.join(' · ') || '—') + '</td></tr>').join('') + '</tbody></table></section>');
  if ($('svJ')) $('svJ').onclick = () => capJefaturaModal(Object.assign({}, J, { original: J.jefatura }), () => capServicio(nombre));
}

// ---------- Jefaturas
async function capJefaturas() {
  cargando('#capcump', 'Leyendo las jefaturas…');
  let r; try { r = await capApi('c_jefaturas', {}); } catch (e) { return capFalla('#capcump', 'Jefaturas', e); }
  if (location.hash.split('/')[0] !== '#capjef') return;
  CAPCU.cargos = r.cargos;
  const lista = r.lista;
  marco('#capcump', '<div><a href="#capcump" class="peq">← Cumplimiento</a></div>' + capTit('Jefaturas', 'Quién reserva por cada servicio. Pueden reservar el DNI del responsable y los de coordinación o A/C. Los avisos van al correo del servicio o, si no hay, al del responsable.', '<button class="btn pri" id="jfN">+ Nueva jefatura</button>') +
    '<section class="card tabla"><table><thead><tr><th>Jefatura</th><th>Responsable</th><th>DNI</th><th>Coordinación o A/C</th><th>Avisos a</th><th>Servicios</th></tr></thead><tbody>' +
    lista.map((j, i) => '<tr class="cl" data-j="' + i + '"><td><b>' + esc(j.jefatura) + '</b><div class="mu peq">' + esc([j.tipo, j.establecimiento].filter(x => x && x !== 's/d').join(' · ')) + '</div></td><td>' + esc(j.responsable) + '<div class="mu peq">' + esc(j.cargo && j.cargo !== 's/d' ? j.cargo : '') + '</div></td>' +
      '<td>' + (j.dni ? esc(j.dni) : '<span class="chip mini wa">Falta</span>') + '</td><td class="peq">' + esc(j.otros || '—') + '</td><td class="peq">' + esc(j.correoServicio || j.correo || '—') + '</td><td class="peq">' + esc(j.servicios) + '</td></tr>').join('') + '</tbody></table></section>' +
    '<p class="mu peq">Si el portal falla: libro CAPACITACIONES, hoja JEFATURAS.</p>');
  $('jfN').onclick = () => capJefaturaModal({}, capJefaturas);
  document.querySelectorAll('tr.cl[data-j]').forEach(tr => tr.onclick = () => { const j = lista[tr.dataset.j]; capJefaturaModal(Object.assign({}, j, { original: j.jefatura }), capJefaturas); });
}
function capJefaturaModal(j, despues) {
  const cargos = CAPCU.cargos || ['Jefe/a', 'Coordinador/a', 'A cargo (A/C)'];
  modal(j.original ? 'Jefatura · ' + j.original : 'Nueva jefatura', [['jefatura', 'Nombre de la jefatura o servicio'], ['servicios', 'Servicios que abarca (separados por punto y coma, como en la base)'], ['establecimiento', 'Establecimiento (vacío = HZT y HMH)', ['', 'HZT', 'HMH', 'HSST']], ['responsable', 'Responsable (Apellido, Nombre)'],
      ['cargo', 'Cargo', cargos.concat(cargos.indexOf(j.cargo) < 0 && j.cargo && j.cargo !== 's/d' ? [j.cargo] : [])], ['dni', 'DNI del responsable'], ['otros', 'DNI de coordinación o A/C (separados por punto y coma)'], ['correo', 'Correo del responsable'], ['correoServicio', 'Correo del servicio (los avisos van acá primero)'],
      ['tel', 'Teléfono interno'], ['ubicacion', 'Ubicación'], ['prioritaria', 'Prioritaria', ['No', 'Sí']], ['motivo', 'Motivo del cambio (queda en el historial)', '', 1]],
    Object.assign({ prioritaria: /^s/i.test(j.prioritaria || '') ? 'Sí' : 'No' }, j),
    async v => { if (!v.jefatura.trim()) return 'Escribí el nombre.'; try { await capApi('c_jefatura_guardar', Object.assign({}, v, { original: j.original || '', prioritaria: v.prioritaria === 'Sí' })); toast('Jefatura guardada.'); CAPCU.t = null; despues(); } catch (e) { return capMsg(e); } });
}

// ---------- Matriz
async function capMatriz() {
  cargando('#capmat', 'Leyendo la matriz…');
  try { CAPMT = await capApi('c_matriz', {}, 120000); } catch (e) { return capFalla('#capmat', 'Matriz', e); }
  if (location.hash.split('/')[0] !== '#capmat') return;
  const R = CAPMT.reglas, grupos = {};
  R.forEach((x, i) => { (grupos[x.codigo] = grupos[x.codigo] || []).push(Object.assign({ i: i }, x)); });
  const lst = s => capVacio(s) ? '<span class="mu">Todas</span>' : esc(String(s).split(/\s*;\s*/).join(' · '));
  marco('#capmat', capTit('Matriz de capacitación', 'Qué capacitación corresponde a quién. Alcanza con cumplir la función o el servicio, salvo que diga «ambas». O = obligatoria · R = recomendada. Solo cuentan las capacitaciones activas del catálogo.', '<button class="btn pri" id="mtN">+ Agregar regla</button><a class="btn sec" href="#capcump">Cumplimiento</a>') +
    '<section class="card tabla"><table><thead><tr><th>Capacitación</th><th>Subgrupo</th><th>Funciones</th><th>Servicios</th><th>Tipo</th><th>Personas</th></tr></thead><tbody>' +
    Object.keys(grupos).sort().map(c => grupos[c].map((x, k) => '<tr class="cl" data-r="' + x.i + '" style="' + (x.activa ? '' : 'opacity:.55') + '">' + (k === 0 ? '<td rowspan="' + grupos[c].length + '" style="vertical-align:top;background:#fff"><b>' + esc(x.nombre) + '</b><div class="mu peq">' + esc(c) + (/^activ/i.test(x.estadoCap) ? '' : ' · <span style="color:var(--wa)">' + esc(x.estadoCap) + ': no cuenta todavía</span>') + '</div></td>' : '') +
      '<td>' + esc(x.subgrupo) + (x.activa ? '' : ' <span class="chip mini gr">Inactiva</span>') + (x.observacion ? '<div class="mu peq">' + esc(x.observacion) + '</div>' : '') + '</td><td class="peq">' + lst(x.funciones) + '</td><td class="peq">' + lst(x.servicios) + (x.ambas ? ' <span class="chip mini wa">Ambas</span>' : '') + '</td>' +
      '<td><span class="chip ' + (x.tipo === 'O' ? 'pa' : 'gr') + '">' + x.tipo + '</span></td><td>' + x.personas + '</td></tr>').join('')).join('') + '</tbody></table></section>' +
    '<p class="mu peq">Cada cambio pide motivo y queda en el historial. Para dejar de usar una regla se desactiva (no se borra). Si el portal falla: libro CAPACITACIONES, hoja MATRIZ.</p>');
  $('mtN').onclick = () => capReglaModal(null);
  document.querySelectorAll('tr.cl[data-r]').forEach(tr => tr.onclick = () => capReglaModal(R[tr.dataset.r]));
}
function capReglaModal(x) {
  const M = CAPMT, sel = { f: x && !capVacio(x.funciones) ? String(x.funciones).split(/\s*;\s*/).filter(Boolean) : [], s: x && !capVacio(x.servicios) ? String(x.servicios).split(/\s*;\s*/).filter(Boolean) : [] };
  const fichas = k => (sel[k].length ? sel[k].map((n, i) => '<span class="chip pa">' + esc(n) + ' <button class="link" data-x="' + k + i + '" aria-label="Quitar ' + esc(n) + '">✕</button></span>').join(' ') : '<span class="mu peq">Todas</span>');
  const v = capVentana(x ? 'Regla · ' + x.codigo : 'Nueva regla',
    '<label class="f">Capacitación<select class="c" id="rgC">' + M.caps.map(c => '<option value="' + esc(c.codigo) + '"' + (x && x.codigo === c.codigo ? ' selected' : '') + '>' + esc(c.codigo + ' · ' + c.nombre) + (/^activ/i.test(c.estado) ? '' : ' (' + c.estado + ')') + '</option>').join('') + '</select></label>' +
    '<label class="f">Subgrupo (a quién apunta, en palabras)<input class="c" id="rgS" value="' + esc(x ? (capVacio(x.subgrupo) ? '' : x.subgrupo) : '') + '"></label>' +
    '<div class="f"><span>Funciones</span><div id="rgFl"></div><input class="c" id="rgFi" list="rgFd" placeholder="Escribí o elegí una función y Enter"><datalist id="rgFd">' + M.funciones.map(f => '<option value="' + esc(f) + '">').join('') + '</datalist></div>' +
    '<div class="f"><span>Servicios (también empresas: SOMI, MAREM…)</span><div id="rgSl"></div><input class="c" id="rgSi" list="rgSd" placeholder="Escribí o elegí un servicio y Enter"><datalist id="rgSd">' + M.servicios.map(f => '<option value="' + esc(f) + '">').join('') + '</datalist></div>' +
    '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rgA"' + (x && x.ambas ? ' checked' : '') + '> Solo si cumple ambas (la función y el servicio)</label>' +
    '<div class="fila" style="display:flex;gap:12px;flex-wrap:wrap"><label class="f">Tipo<select class="c" id="rgT"><option value="O"' + (!x || x.tipo === 'O' ? ' selected' : '') + '>Obligatoria</option><option value="R"' + (x && x.tipo === 'R' ? ' selected' : '') + '>Recomendada</option></select></label>' +
    '<label class="f">Estado<select class="c" id="rgE"><option value="1">Activa</option><option value="0"' + (x && !x.activa ? ' selected' : '') + '>Inactiva (no se borra)</option></select></label></div>' +
    '<label class="f">Observación<input class="c" id="rgO" value="' + esc(x ? x.observacion || '' : '') + '"></label>' +
    '<div class="aviso" id="rgI">Calculando a cuántas personas afecta…</div>' +
    '<label class="f">Motivo del cambio (queda en el historial)<textarea class="c" id="rgM"></textarea></label>', '<button class="btn pri" id="rgOk">Guardar</button>');
  const impacto = async () => { $('rgI').textContent = 'Calculando a cuántas personas afecta…'; try { const r = await capApi('c_matriz_impacto', { funciones: sel.f, servicios: sel.s, ambas: $('rgA').checked }); if ($('rgI')) $('rgI').innerHTML = 'Afecta a <b>' + r.personas + (r.personas === 1 ? ' persona' : ' personas') + '</b> (' + Object.keys(r.porEst).map(e => e + ' ' + r.porEst[e]).join(' · ') + ') de ' + r.servicios + ' servicio(s).'; } catch (e) { if ($('rgI')) $('rgI').textContent = capMsg(e); } };
  const pintar = () => { $('rgFl').innerHTML = fichas('f'); $('rgSl').innerHTML = fichas('s');
    document.querySelectorAll('#ov [data-x]').forEach(b => b.onclick = () => { const k = b.dataset.x[0], i = Number(b.dataset.x.slice(1)); sel[k].splice(i, 1); pintar(); impacto(); }); };
  const agregar = (k, el) => { const val = el.value.trim(); if (val && sel[k].indexOf(val) < 0) { sel[k].push(val); pintar(); impacto(); } el.value = ''; };
  $('rgFi').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); agregar('f', $('rgFi')); } }; $('rgFi').onchange = () => agregar('f', $('rgFi'));
  $('rgSi').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); agregar('s', $('rgSi')); } }; $('rgSi').onchange = () => agregar('s', $('rgSi'));
  $('rgA').onchange = impacto;
  pintar(); impacto();
  $('rgOk').onclick = async () => {
    if (!$('rgM').value.trim()) return v.error('Escribí el motivo del cambio.');
    const r = await capHacer('c_matriz_guardar', { id: x ? x.id : '', codigo: $('rgC').value, subgrupo: $('rgS').value, funciones: sel.f, servicios: sel.s, ambas: $('rgA').checked, tipo: $('rgT').value, activa: $('rgE').value === '1', observacion: $('rgO').value, motivo: $('rgM').value.trim() }, $('rgOk'));
    if (r) { v.cerrar(); toast(r.mensaje); CAPCU.t = null; capMatriz(); }
  };
}

// ------------------------------------------------------------------ Para validar (14.67)
// Lo que carga la secretaría en la base de capacitaciones y espera a HyS: altas nuevas, cambios propuestos y avisos.
// Lo lee y lo escribe el Sistema HyS (CapValidar.gs, acciones p_cv_…), no el panel viejo.
let CAPV = null;
async function capValidar(fresco) {
  if (!CAPV || fresco) { cargando('#capval', 'Leyendo lo que espera validación…'); try { CAPV = await api('p_cv_datos', {}, 120000); } catch (e) { return; } }
  if (!CAPV.ok) return marco('#capval', capTit('Para validar') + '<div class="aviso error">' + esc(CAPV.mensaje || CAPV.error || 'No se pudo leer.') + (/desconocida/i.test(CAPV.mensaje || CAPV.error || '') ? ' Falta instalar CapValidar.gs en el Sistema HyS.' : '') + '</div>');
  const V = CAPV, L = V.listas, n = V.altas.length + V.propuestas.length;
  const fila = (t, s, btns) => '<div class="item" style="align-items:flex-start"><span style="min-width:0"><b style="font-size:14px">' + t + '</b><br><small class="mu">' + s + '</small></span><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + btns + '</span></div>';
  const b = (cls, data, txt) => '<button class="btn ' + cls + '" style="min-height:32px;padding:4px 12px;font-size:12.5px" ' + data + '>' + txt + '</button>';
  marco('#capval', capTit('Para validar', 'Lo que cargó la secretaría desde Mi establecimiento y espera tu revisión. Al validar se actualiza el libro CAPACITACIONES y queda en su hoja _HISTORIAL.', '<a class="btn sec" href="' + esc(V.libro) + '" target="_blank" rel="noopener">Abrir el libro ↗</a>') +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><div class="kpi2"><span>Altas nuevas</span><b' + (V.altas.length ? ' style="color:#B4361F"' : '') + '>' + V.altas.length + '</b><small>personas para revisar</small></div>' +
      '<div class="kpi2"><span>Cambios propuestos</span><b' + (V.propuestas.length ? ' style="color:#B4361F"' : '') + '>' + V.propuestas.length + '</b><small>aprobar o rechazar</small></div><div class="kpi2"><span>Otros avisos</span><b>' + V.avisos.length + '</b><small>sin marcar como revisados</small></div></div>' +
    '<section class="card" style="margin-top:12px"><h2 style="margin:0 0 6px;font-size:16px">Altas nuevas</h2>' + (V.altas.length ? '<div style="display:flex;flex-direction:column">' + V.altas.map(a =>
      fila(esc(a.APELLIDOS + ', ' + a.NOMBRES) + ' <span class="mu">· DNI ' + esc(a.DNI) + '</span>', esc([a.PROFESION && a.PROFESION !== 's/d' ? a.PROFESION : a.FUNCION, a.INSTITUCION, a.EMPRESA].filter(x => x && x !== 's/d').join(' · ')) + '<br>' + esc(a.ORIGEN_DE_DATOS || 'Para revisar') + (a.FUNCION === 'Otra' ? ' · <b style="color:#8A5200">función «Otra»: conviene corregirla</b>' : ''),
        b('pri', 'data-va="' + esc(a.DNI) + '"', 'Revisar y validar'))).join('') + '</div>' : '<div class="mu">No hay altas para validar.</div>') + '</section>' +
    '<section class="card" style="margin-top:12px"><h2 style="margin:0 0 6px;font-size:16px">Cambios propuestos</h2>' + (V.propuestas.length ? '<div style="display:flex;flex-direction:column">' + V.propuestas.map(p =>
      fila(esc(p.persona) + ' <span class="mu">· DNI ' + esc(p.dni) + '</span>', esc(p.campo) + ': «' + esc(p.actual || 'vacío') + '» → <b>«' + esc(p.propuesto) + '»</b> · ' + esc(p.fecha) + (p.quien ? ' · ' + esc(p.quien) : '') + (p.motivo ? ' · ' + esc(p.motivo) : '') + (p.enBase ? '' : ' · <b style="color:#B4361F">la persona no está en la base</b>'),
        b('pri', 'data-pa="' + esc(p.id) + '"', 'Aprobar') + b('sec', 'data-pr="' + esc(p.id) + '"', 'Rechazar'))).join('') + '</div>' : '<div class="mu">No hay cambios para aprobar.</div>') + '</section>' +
    '<section class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h2 style="margin:0 0 6px;font-size:16px">Otros avisos</h2>' + (V.avisos.length ? b('sec', 'id="cvTodos"', 'Marcar todos como revisados') : '') + '</div>' +
      (V.avisos.length ? '<details class="peq"><summary style="cursor:pointer;font-weight:700;color:var(--az)">Ver los ' + V.avisos.length + ' avisos (funciones «Otra», servicios o establecimientos fuera del catálogo, altas desde la web)</summary><div style="display:flex;flex-direction:column;margin-top:6px">' + V.avisos.map(v =>
        fila(esc(v.tipo) + ' · ' + esc(v.persona), esc(v.fecha) + (v.detalle ? ' · ' + esc(v.detalle) : ''), b('sec', 'data-av="' + v.fila + '"', 'Revisado'))).join('') + '</div></details>' : '<div class="mu">No hay avisos sin revisar.</div>') + '</section>' +
    '<p class="mu peq">Si el portal no anda: en el libro CAPACITACIONES, CAMBIOS_PROPUESTOS › ESTADO (Aprobada o Rechazada), PERSONAS › REVISAR = No y _AVISOS › ESTADO = Resuelto.</p>');
  const op = (arr, v) => (v && arr.indexOf(v) < 0 ? [v] : []).concat(arr);
  document.querySelectorAll('[data-va]').forEach(x => x.onclick = () => { const a = V.altas.find(z => z.DNI === x.dataset.va);
    modal('Validar alta · ' + a.APELLIDOS + ', ' + a.NOMBRES, [['APELLIDOS', 'Apellidos'], ['NOMBRES', 'Nombres'], ['FUNCION', 'Función', op(L.funciones, a.FUNCION)], ['PROFESION', 'Función y detalle (como se ve en la ficha)'], ['SERVICIO', 'Servicio', op(L.servicios, a.SERVICIO)],
      ['INSTITUCION', 'Institución', op(L.instituciones, a.INSTITUCION)], ['ESTABLECIMIENTO', 'Establecimiento (sigla)', op(L.establecimientos, a.ESTABLECIMIENTO)], ['VINCULO', 'Vínculo', op(L.vinculos, a.VINCULO)], ['EMPRESA', 'Empresa (si es tercerizado)', op([''].concat(L.empresas), a.EMPRESA)], ['CORREO', 'Correo'], ['TELEFONO', 'Teléfono'], ['PUBLICO', 'Público', op(L.publicos, a.PUBLICO)]], a, async o => {
      if (!o.APELLIDOS || !o.NOMBRES || !o.FUNCION || (!o.ESTABLECIMIENTO && !o.INSTITUCION)) return 'Completá apellidos, nombres, función e institución o establecimiento.';
      const r = await api('p_cv_alta', { dni: a.DNI, datos: o }, 90000); if (!r.ok) return r.mensaje || 'No se pudo validar.';
      toast('Validada' + (r.cambios ? ' con ' + r.cambios + ' corrección(es)' : '') + '.'); capValidar(true); return ''; },
      '<p class="mu peq" style="margin:8px 0 0">DNI ' + esc(a.DNI) + ' · ' + esc(a.ORIGEN_DE_DATOS || '') + '. Corregí lo que haga falta y tocá Guardar: queda validada (REVISAR = No) y sus avisos, resueltos.</p>'); });
  document.querySelectorAll('[data-pa]').forEach(x => x.onclick = async () => { x.disabled = true; const r = await api('p_cv_propuesta', { id: x.dataset.pa, decision: 'aprobar' }, 90000).catch(() => null); if (!r || !r.ok) { x.disabled = false; return toast((r && r.mensaje) || 'No se pudo aprobar.'); } toast('Aprobada: ya está en la base.'); capValidar(true); });
  document.querySelectorAll('[data-pr]').forEach(x => x.onclick = () => modal('Rechazar el cambio', [['motivo', 'Motivo', null, 1]], {}, async o => {
    if (!o.motivo) return 'Escribí el motivo.'; const r = await api('p_cv_propuesta', { id: x.dataset.pr, decision: 'rechazar', motivo: o.motivo }, 90000); if (!r.ok) return r.mensaje || 'No se pudo.'; toast('Rechazada.'); capValidar(true); return ''; }));
  document.querySelectorAll('[data-av]').forEach(x => x.onclick = async () => { x.disabled = true; const r = await api('p_cv_avisos', { filas: [Number(x.dataset.av)] }, 90000).catch(() => null); if (!r || !r.ok) { x.disabled = false; return toast('No se pudo.'); } x.closest('.item').remove(); });
  if ($('cvTodos')) $('cvTodos').onclick = async () => { $('cvTodos').disabled = true; const r = await api('p_cv_avisos', { filas: V.avisos.map(v => v.fila) }, 120000).catch(() => null); if (!r || !r.ok) { $('cvTodos').disabled = false; return toast('No se pudo.'); } toast(r.n + ' aviso(s) marcados como revisados.'); capValidar(true); };
}
// Aviso arriba del tablero de capacitaciones si hay algo para validar (se consulta cada 5 minutos como máximo)
let CAPV_N = null, CAPV_T = 0;
async function capAvisoValidar(activo) {
  if (activo !== '#cap') return; const h0 = location.hash;
  if (CAPV_N == null || Date.now() - CAPV_T > 300000) { try { const r = await api('p_cv_cuenta', {}, 60000); if (!r || !r.ok) return; CAPV_N = r; CAPV_T = Date.now(); } catch (e) { return; } }
  const m = $('main'), n = CAPV_N.altas + CAPV_N.propuestas; if (!m || !n || location.hash !== h0 || m.querySelector('#cvBanda') || m.querySelector('.cargando')) return;
  const d = document.createElement('a'); d.id = 'cvBanda'; d.href = '#capval'; d.className = 'aviso'; d.style.cssText = 'display:block;margin:0 0 12px;font-weight:700;text-decoration:none';
  d.textContent = 'Para validar: ' + (CAPV_N.altas ? CAPV_N.altas + ' alta(s) nueva(s)' : '') + (CAPV_N.altas && CAPV_N.propuestas ? ' y ' : '') + (CAPV_N.propuestas ? CAPV_N.propuestas + ' cambio(s) propuesto(s)' : '') + ' de la secretaría. Tocá para revisar →';
  const cab = m.querySelector('.cab'); if (cab) cab.after(d); else m.prepend(d);
}

// ------------------------------------------------------------------ 9 · Capacitaciones · Gestión (14.71): lo que estaba en el panel viejo, ahora en el portal
// Backend: Sistema HyS › CapGestion.gs (acciones p_cg_…), sobre el libro único CAPACITACIONES · Sistema HyS.
let CAPP = { q: '', r: null }, CAPCT = null, CAPML = null, CAPCO = { estado: '' };
const capChip = (t, c) => '<span class="chip mini ' + c + '">' + esc(t) + '</span>';
const capKp = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
const capLnk = (u, t) => u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + ' ↗</a>' : '';
const capSinInstalar = (ruta, t, r) => marco(ruta, capTit(t) + '<div class="aviso error">' + esc((r && (r.mensaje || r.error)) || 'No se pudo leer.') + (/desconocida|instalar/i.test((r && (r.mensaje || r.error)) || '') ? ' Falta instalar CapGestion.gs en el Sistema HyS.' : '') + '</div>');

// ---------- Personas y certificados
async function capPersonas() {
  marco('#capper', capTit('Personas y certificados', 'Buscá por DNI, apellido, nombre o correo. Desde la ficha ves sus registros, certificados y lo que le falta, y corregís cualquier dato (queda en el historial).', '<a class="btn sec" href="' + CAP_LIBRO + '" target="_blank" rel="noopener">Libro ↗</a>') +
    '<section class="card"><div class="filtros"><label class="f" style="flex:1;min-width:240px">Buscar<input class="c" id="ppQ" placeholder="DNI, apellido, nombre o correo" value="' + esc(CAPP.q) + '" autocomplete="off"></label></div><div id="ppRes" style="margin-top:10px"></div></section>' +
    '<p class="mu peq">Si el portal falla: libro CAPACITACIONES, hojas PERSONAS, REGISTROS y CERTIFICADOS.</p>');
  const pintar = r => {
    if (!$('ppRes')) return;
    if (!r) return $('ppRes').innerHTML = '<div class="mu peq">Escribí al menos 3 letras o números.</div>';
    if (!r.ok) return $('ppRes').innerHTML = '<div class="aviso error">' + esc(r.mensaje || r.error || 'No se pudo buscar.') + '</div>';
    $('ppRes').innerHTML = !r.lista.length ? '<div class="vacio">Sin resultados.</div>' : '<div class="mu peq" style="margin-bottom:6px">' + r.total + ' persona(s)' + (r.total > r.lista.length ? ' · se muestran ' + r.lista.length + ': afiná la búsqueda' : '') + '</div><div class="tabla"><table><thead><tr><th>Persona</th><th>Dónde trabaja</th><th>Contacto</th><th>Registros</th></tr></thead><tbody>' +
      r.lista.map(p => '<tr class="cl" data-p="' + esc(p.dni) + '"><td><b>' + esc(p.nombre) + '</b>' + (p.revisar ? ' ' + capChip('Revisar', 'wa') : '') + '<div class="mu peq">DNI ' + esc(p.dni) + ' · ' + esc(p.publico) + '</div></td><td class="peq">' + esc([p.est, p.servicio, p.funcion].filter(x => !capVacio(x)).join(' · ') || '—') + '</td>' +
        '<td class="peq">' + (capVacio(p.correo) ? '<span style="color:var(--er)">Sin correo</span>' : esc(p.correo)) + '<div class="mu">' + (capVacio(p.tel) ? 'Sin teléfono' : esc(p.tel)) + '</div></td><td>' + p.registros + '</td></tr>').join('') + '</tbody></table></div>';
    document.querySelectorAll('tr.cl[data-p]').forEach(tr => tr.onclick = () => location.hash = '#capper/' + tr.dataset.p);
  };
  const buscar = async () => { const q = $('ppQ').value.trim(); CAPP.q = q; const n = q.replace(/[.\s]/g, ''); if ((/^\d+$/.test(n) ? n.length : capNorm(q).length) < 3) { CAPP.r = null; return pintar(null); }
    $('ppRes').innerHTML = '<div class="mu peq">Buscando…</div>'; let r; try { r = await api('p_cg_buscar', { q: q }, 90000); } catch (e) { return; } if ($('ppQ') && $('ppQ').value.trim() === q) { CAPP.r = r; pintar(r); } };
  $('ppQ').oninput = () => { clearTimeout(capPersonas.t); capPersonas.t = setTimeout(buscar, 450); };
  $('ppQ').focus(); if (CAPP.q && CAPP.r) pintar(CAPP.r); else pintar(null);
}
async function capPersona(dni, fresco) {
  cargando('#capper', 'Leyendo la ficha…');
  let r; try { r = await api('p_cg_persona', { dni: dni, fresco: !!fresco }, 120000); } catch (e) { return; }
  if (location.hash.split('/')[0] !== '#capper') return;
  if (!r.ok) return capSinInstalar('#capper', 'Persona', r);
  const D = r.datos, C = r.cumplimiento, nom = D.APELLIDOS + ', ' + D.NOMBRES, vig = r.certificados.filter(c => !/anul|reempl/i.test(c.estado));
  const fila = (k, v) => '<dt>' + esc(k) + '</dt><dd>' + (capVacio(v) ? '<span class="mu">s/d</span>' : esc(v)) + '</dd>';
  marco('#capper', '<div><a href="#capper" class="peq">← Personas</a></div>' + capTit(nom, esc('DNI ' + D.DNI + ' · ' + [D.ESTABLECIMIENTO, D.SERVICIO, D.FUNCION].filter(x => !capVacio(x)).join(' · ')),
      '<button class="btn pri" id="pfEd">Corregir datos</button><a class="btn sec" href="' + esc(r.pagina) + '" target="_blank" rel="noopener">Página de certificados ↗</a>') +
    '<div class="tb5">' + capKp('Registros', r.registros.length, 'asistencias y evaluaciones') + capKp('Certificados', vig.length, 'vigentes en el sistema') +
      (C ? capKp('Obligatorias', C.cumplidas + ' / ' + C.obligatorias, C.pct + ' al día', C.obligatorias && C.cumplidas >= C.obligatorias ? 'var(--ok)' : C.cumplidas ? 'var(--wa)' : 'var(--er)') : capKp('Obligatorias', '—', 'no está en la base de trabajadores de HZT y HMH')) +
      capKp('Revisar', /^s[ií]/i.test(D.REVISAR) ? 'Sí' : 'No', /^s[ií]/i.test(D.REVISAR) ? 'datos a controlar' : 'datos controlados', /^s[ií]/i.test(D.REVISAR) ? 'var(--wa)' : '') + '</div>' +
    '<div class="grid g2"><section class="card"><h2>Datos</h2><dl class="dl" style="margin-top:8px">' + fila('Correo', D.CORREO) + fila('Teléfono', D.TELEFONO) + fila('Público', D.PUBLICO) + fila('Institución', D.INSTITUCION) + fila('Servicio', D.SERVICIO) + fila('Función', D.PROFESION || D.FUNCION) +
      fila('Vínculo', D.VINCULO) + (capVacio(D.EMPRESA) ? '' : fila('Empresa', D.EMPRESA)) + (capVacio(D.CARRERA) ? '' : fila('Carrera', D.CARRERA)) + fila('Origen del dato', D.ORIGEN_DE_DATOS) + fila('Última actualización', D.ULTIMA_ACTUALIZACION) + '</dl></section>' +
    '<section class="card"><h2>Lo que le falta</h2>' + (C ? '<p class="mu peq" style="margin:4px 0 8px">Según la matriz para su función y servicio (' + esc(C.jefatura) + ').</p>' + (capVacio(C.falta) ? '<div style="color:var(--ok);font-weight:700">Tiene todas sus obligatorias.</div>' : C.falta.split(' · ').map(f => '<div class="item"><span>' + esc(f) + '</span></div>').join(''))
      : '<p class="mu peq">No figura en la base de trabajadores de HZT y HMH (externos, tercerizados, estudiantes u otros establecimientos): no tiene obligatorias calculadas.</p>') + '</section></div>' +
    '<section class="card tabla"><div style="padding:14px 18px"><h2>Certificados</h2></div>' + (r.certificados.length ? '<table><thead><tr><th>Fecha</th><th>Capacitación</th><th>Tipo</th><th>Horas</th><th>Documento</th><th>Estado</th></tr></thead><tbody>' +
      r.certificados.map(c => '<tr><td>' + esc(c.fecha) + '</td><td><b>' + esc(c.nombre) + '</b><div class="mu peq">' + esc(c.codigo) + (c.encuentro && c.encuentro !== 's/d' ? ' · encuentro ' + esc(c.encuentro) : '') + ' · ' + esc(c.id) + '</div></td><td class="peq">' + esc(c.tipo) + '</td><td>' + esc(c.horas) + '</td><td>' + (capLnk(c.link, 'PDF') || '<span class="mu">Sin PDF</span>') + '</td><td>' + capChip(c.estado || 's/d', /v[aá]lido/i.test(c.estado) ? 'ok' : /anul/i.test(c.estado) ? 'er' : 'gr') + '</td></tr>').join('') + '</tbody></table>' : '<div class="vacio">Sin certificados.</div>') + '</section>' +
    '<section class="card tabla"><div style="padding:14px 18px"><h2>Registros</h2></div>' + (r.registros.length ? '<table><thead><tr><th>Fecha</th><th>Capacitación</th><th>Tipo</th><th>Nota</th><th>Vence</th><th>Origen</th></tr></thead><tbody>' +
      r.registros.map(x => '<tr><td>' + esc(x.fecha) + '</td><td><b>' + esc(x.nombre) + '</b><div class="mu peq">' + esc(x.codigo) + (x.encuentro ? ' · encuentro ' + esc(x.encuentro) : '') + (/anul/i.test(x.estado) ? ' · <b style="color:var(--er)">anulado</b>' : '') + '</div></td><td class="peq">' + esc(x.tipo) + '</td><td>' + esc(x.nota ? x.nota + (x.aprobado ? ' (' + x.aprobado + ')' : '') : '—') + '</td><td class="peq">' + esc(x.vence || '—') + '</td><td class="peq">' + esc(x.origen) + '</td></tr>').join('') + '</tbody></table>' : '<div class="vacio">Sin registros.</div>') + '</section>' +
    (r.historial.length ? '<details class="card peq"><summary style="cursor:pointer;font-weight:700">Historial de cambios (' + r.historial.length + ')</summary>' + r.historial.map(h => '<div class="item"><span><b>' + esc(h.campo) + '</b>: «' + esc(h.antes || 'vacío') + '» → «' + esc(h.despues) + '»<div class="mu">' + esc(h.fecha + ' · ' + h.quien + (h.motivo ? ' · ' + h.motivo : '')) + '</div></span></div>').join('') + '</details>' : ''));
  $('pfEd').onclick = () => {
    const L = r.listas, op = (arr, v) => (v && arr.indexOf(v) < 0 ? [v] : []).concat(arr);
    const NOM = { APELLIDOS: 'Apellidos', NOMBRES: 'Nombres', CORREO: 'Correo', TELEFONO: 'Teléfono', PUBLICO: ['Público', L.publicos], CIUDAD: 'Ciudad', PROVINCIA: 'Provincia', PAIS: 'País', PROFESION: 'Función y detalle (como se ve en la ficha)',
      INSTITUCION: ['Institución', L.instituciones], ESTABLECIMIENTO: ['Establecimiento (sigla)', L.establecimientos], SERVICIO: ['Servicio', L.servicios], FUNCION: ['Función', L.funciones], VINCULO: ['Vínculo', L.vinculos], EMPRESA: ['Empresa (si es tercerizado)', [''].concat(L.empresas)], CARRERA: 'Carrera (estudiantes)', REVISAR: ['Revisar', ['No', 'Sí']] };
    const campos = r.editables.map(k => { const n = NOM[k] || k; return Array.isArray(n) ? [k, n[0], op(n[1], D[k])] : [k, n]; }).concat([['motivo', 'Motivo del cambio (queda en el historial)', '', 1]]);
    modal('Corregir datos · ' + nom, campos, D, async o => {
      const motivo = o.motivo; delete o.motivo;
      const res = await api('p_cg_persona_guardar', { dni: D.DNI, datos: o, motivo: motivo }, 90000); if (!res.ok) return res.mensaje || 'No se pudo guardar.';
      toast(res.cambios ? res.cambios + ' dato(s) corregido(s).' : 'No había cambios.'); capPersona(D.DNI, true); return '';
    }, '<p class="mu peq" style="margin:8px 0 0">Servicio, función e institución del personal de HZT y HMH vienen de la base de trabajadores: si los cambiás acá, corregilos también allá para que el cumplimiento los tome.</p>');
  };
}

// ---------- Contactos y carga de mails
async function capContactos(fresco) {
  if (!CAPCT || fresco) { cargando('#capcont', 'Leyendo jefaturas y contactos…'); try { CAPCT = await api('p_cg_contactos', { fresco: !!fresco }, 120000); } catch (e) { return; } }
  if (location.hash.split('/')[0] !== '#capcont') return;
  if (!CAPCT.ok) return capSinInstalar('#capcont', 'Contactos', CAPCT);
  const T = CAPCT;
  marco('#capcont', capTit('Contactos y mails', 'Correos y teléfonos del personal y de cada jefatura. Pegá una lista de mails: el sistema la cruza por DNI o por nombre, te muestra qué cambia y aplica solo lo que confirmás.', '<a class="btn sec" href="#capjef">Editar jefaturas</a><button class="btn sec" id="ctAct">Actualizar</button>') +
    '<div class="tb5">' + capKp('Personas', T.personas, 'en el libro') + capKp('Sin correo', T.sinCorreo, 'personas', T.sinCorreo ? 'var(--wa)' : '') + capKp('Sin teléfono', T.sinTel, 'personas') + capKp('Jefaturas sin correo', T.jefSinCorreo, 'de ' + T.jefaturas.length, T.jefSinCorreo ? 'var(--er)' : '') + '</div>' +
    '<section class="card"><h2>Cargar lista de mails</h2><p class="mu peq" style="margin:4px 0 8px">Una persona por línea, con su correo y su DNI (o apellido y nombre). Sirve lo que copies de una planilla o de un correo. Si la persona ya tenía otro correo, gana el de la lista (el más nuevo).</p>' +
      '<textarea class="c" id="mlTxt" rows="6" style="width:100%" placeholder="30123456  perez.juan@gmail.com&#10;Gómez, Ana; ana.gomez@hotmail.com"></textarea><div class="cpn" style="margin-top:8px"><button class="btn pri" id="mlPrev">Revisar la lista</button></div><div id="mlRes" style="margin-top:10px"></div></section>' +
    '<section class="card tabla"><div style="padding:14px 18px"><h2>Jefaturas</h2><span class="mu peq">De mayor a menor personal. Los avisos e informes van al correo del servicio o, si no hay, al del responsable.</span></div><table><thead><tr><th>Jefatura</th><th>Responsable</th><th>Correo</th><th>Personal</th><th>Cumplimiento</th><th>Último informe</th></tr></thead><tbody>' +
      T.jefaturas.map(j => '<tr><td><b>' + esc(j.jefatura) + '</b>' + (j.prioritaria ? ' ' + capChip('Prioritaria', 'pa') : '') + '<div class="mu peq">' + esc([j.est, j.tel ? 'int. ' + j.tel : ''].filter(Boolean).join(' · ')) + '</div></td><td class="peq">' + esc(j.responsable || '—') + '</td>' +
        '<td class="peq">' + (j.correo ? esc(j.correo) : capChip('Falta', 'er')) + '</td><td>' + (j.personal || '—') + '</td><td>' + esc(j.pct || '—') + '</td><td class="peq">' + (j.ultimo ? (j.link ? capLnk(j.link, j.ultimo) : esc(j.ultimo)) : '—') + '</td></tr>').join('') + '</tbody></table></section>' +
    '<p class="mu peq">Si el portal falla: libro CAPACITACIONES, hojas PERSONAS (columna CORREO) y JEFATURAS.</p>');
  $('ctAct').onclick = () => capContactos(true);
  $('mlPrev').onclick = async () => {
    const txt = $('mlTxt').value.trim(); if (!txt) return toast('Pegá la lista primero.');
    $('mlPrev').disabled = true; $('mlRes').innerHTML = '<div class="mu peq">Cruzando con el libro…</div>';
    let r; try { r = await api('p_cg_mails_previa', { texto: txt }, 120000); } catch (e) { $('mlPrev').disabled = false; return; } $('mlPrev').disabled = false;
    if (!r.ok) return $('mlRes').innerHTML = '<div class="aviso error">' + esc(r.mensaje || 'No se pudo leer la lista.') + '</div>';
    CAPML = r.lista; const cambia = CAPML.filter(x => x.estado === 'Nuevo' || x.estado === 'Reemplaza');
    const col = e => e === 'Nuevo' ? 'ok' : e === 'Reemplaza' ? 'wa' : e === 'Igual' ? 'gr' : 'er';
    $('mlRes').innerHTML = '<div class="mu peq" style="margin-bottom:6px">' + CAPML.length + ' línea(s): ' + cambia.length + ' para cargar · ' + CAPML.filter(x => x.estado === 'Igual').length + ' ya estaban · ' + CAPML.filter(x => !x.dni).length + ' sin persona.</div>' +
      '<div class="tabla"><table><thead><tr><th></th><th>Línea</th><th>Persona</th><th>Correo actual → nuevo</th><th>Estado</th></tr></thead><tbody>' + CAPML.map((x, i) => '<tr><td>' + (x.estado === 'Nuevo' || x.estado === 'Reemplaza' ? '<input type="checkbox" data-ml="' + i + '"' + (x.aviso ? '' : ' checked') + '>' : '') + '</td><td class="peq">' + esc(x.linea) + '</td>' +
        '<td class="peq">' + (x.dni ? '<b>' + esc(x.persona) + '</b><div class="mu">DNI ' + esc(x.dni) + ' · por ' + esc(x.via) + '</div>' : '—') + '</td><td class="peq">' + (x.dni ? esc(x.actual || 'vacío') + ' → <b>' + esc(x.correo) + '</b>' : esc(x.correo || '')) + (x.aviso ? '<div style="color:var(--er)">' + esc(x.aviso) + '</div>' : '') + '</td><td>' + capChip(x.estado, col(x.estado)) + '</td></tr>').join('') + '</tbody></table></div>' +
      (cambia.length ? '<div class="cpn" style="margin-top:8px"><button class="btn pri" id="mlAp">Cargar los marcados</button></div>' : '');
    if ($('mlAp')) $('mlAp').onclick = async () => {
      const items = Array.from(document.querySelectorAll('[data-ml]:checked')).map(c => CAPML[c.dataset.ml]).map(x => ({ dni: x.dni, correo: x.correo })); if (!items.length) return toast('No hay nada marcado.');
      $('mlAp').disabled = true; let a; try { a = await api('p_cg_mails_aplicar', { items: items }, 120000); } catch (e) { $('mlAp').disabled = false; return; }
      if (!a.ok) { $('mlAp').disabled = false; return toast(a.mensaje || 'No se pudo cargar.'); }
      toast(a.n + ' correo(s) cargado(s).'); $('mlTxt').value = ''; capContactos(true);
    };
  };
}

// ---------- Informes (mensual o a pedido · por jefatura)
async function capInformes() {
  cargando('#capinf', 'Preparando los informes…');
  let op, ct; try { [op, ct] = await Promise.all([api('p_cg_informe_op', {}, 90000), CAPCT && CAPCT.ok ? CAPCT : api('p_cg_contactos', {}, 120000)]); } catch (e) { return; }
  if (location.hash.split('/')[0] !== '#capinf') return;
  if (!op.ok) return capSinInstalar('#capinf', 'Informes', op);
  CAPCT = ct; const jefs = (ct.jefaturas || []).filter(j => j.personal > 0);
  marco('#capinf', capTit('Informes de capacitación', 'Se generan como Google Doc (versión 0, para revisar) y PDF, con el formato de informe técnico de HySL. Nada se envía solo.') +
    '<div class="grid g2"><section class="card"><h2>Informe mensual o a pedido</h2><p class="mu peq" style="margin:4px 0 10px">Actividad del mes comparada con el anterior, acumulado del ciclo, cumplimiento de la matriz por establecimiento y servicio, y recomendaciones. Lleva número del registro de documentos (CAP · IT).</p>' +
      '<div style="display:grid;gap:10px"><label class="f">Período<select class="c" id="inMes">' + op.meses.map((m, i) => '<option value="' + esc(m.valor) + '"' + (i === 1 ? ' selected' : '') + '>Mensual · ' + esc(m.texto) + '</option>').join('') + '<option value="">A pedido · acumulado del ciclo hasta hoy</option></select></label>' +
      '<label class="f">Destinatario<input class="c" id="inDes" placeholder="Ej.: Dr. Paulo Taurelli"></label><label class="f">Cargo<input class="c" id="inCar" placeholder="Ej.: Director del HZT y del HMH"></label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="inPru"> Prueba (sin pedir número, para revisar el formato)</label><div class="cpn"><button class="btn pri" id="inGen">Generar informe</button></div><div id="inRes"></div></div></section>' +
    '<section class="card"><h2>Informe por jefatura</h2><p class="mu peq" style="margin:4px 0 10px">Para cada jefatura: su personal, el porcentaje al día, lo que le falta a cada persona y los próximos dictados que le sirven. Queda en Drive (PDF y Doc) y en la hoja JEFATURAS.</p>' +
      '<div style="display:grid;gap:10px"><label class="f">Jefatura<select class="c" id="ijJef"><option value="">Elegí…</option>' + jefs.map(j => '<option value="' + esc(j.jefatura) + '">' + esc(j.jefatura) + ' · ' + j.personal + ' personas' + (j.correo ? '' : ' · sin correo') + '</option>').join('') + '</select></label>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" id="ijBor" style="margin-top:3px"> Preparar el correo para la jefatura como borrador (no se envía: lo revisás y lo enviás desde la Bandeja de correos)</label>' +
      '<div class="cpn"><button class="btn pri" id="ijGen">Generar informe</button><a class="btn sec" href="#capcorreo">Bandeja de correos</a></div><div id="ijRes"></div></div></section></div>' +
    '<section class="card tabla"><div style="padding:14px 18px"><h2>Informes anteriores</h2><span class="mu peq">Los últimos del registro de documentos (bloque Capacitación).</span></div>' + (op.previos.length ? '<table><thead><tr><th>Código</th><th>Fecha</th><th>Asunto</th><th>Documentos</th><th>Estado</th></tr></thead><tbody>' +
      op.previos.map(p => '<tr><td><b>' + esc(p.codigo) + '</b></td><td>' + esc(p.fecha) + '</td><td class="peq">' + esc(p.asunto) + '</td><td class="peq">' + [capLnk(p.doc, 'Doc'), capLnk(p.pdf, 'PDF')].filter(Boolean).join(' · ') + '</td><td>' + esc(p.estado) + '</td></tr>').join('') + '</tbody></table>' : '<div class="vacio">Todavía no hay informes generados desde el portal.</div>') + '</section>');
  const res = (id, r) => $(id).innerHTML = r.ok ? '<div class="aviso" style="background:#E9F5EE;border-color:#BFE3CC">Listo' + (r.codigo ? ': <b>' + esc(r.codigo) + '</b>' : '') + '. ' + [capLnk(r.doc, 'Google Doc'), capLnk(r.pdf, 'PDF'), capLnk(r.carpeta, 'Carpeta')].filter(Boolean).join(' · ') +
    (r.borrador ? '<br>Borrador de correo preparado: <a href="#capcorreo">revisalo y envialo desde la Bandeja</a>.' + (r.borrador.aviso ? ' ' + esc(r.borrador.aviso) : '') : '') + (r.aviso ? '<br>' + esc(r.aviso) : '') + (r.notasAlPie === false ? '<br>Las notas al pie quedaron como marcas [[NOTA]]: revisalas.' : '') + '</div>' : '<div class="aviso error">' + esc(r.mensaje || r.error || 'No se pudo generar.') + '</div>';
  $('inGen').onclick = async () => { $('inGen').disabled = true; $('inRes').innerHTML = '<div class="mu peq">Generando el informe (puede tardar un minuto)…</div>';
    let r; try { r = await api('p_cg_informe', { mes: $('inMes').value, destinatario: $('inDes').value.trim(), cargo: $('inCar').value.trim(), prueba: $('inPru').checked }, 300000); } catch (e) { $('inGen').disabled = false; $('inRes').innerHTML = ''; return; }
    $('inGen').disabled = false; res('inRes', r); };
  $('ijGen').onclick = async () => { const j = $('ijJef').value; if (!j) return toast('Elegí la jefatura.'); $('ijGen').disabled = true; $('ijRes').innerHTML = '<div class="mu peq">Generando…</div>';
    let r; try { r = await api('p_cg_inf_jefatura', { jefatura: j, borrador: $('ijBor').checked }, 240000); } catch (e) { $('ijGen').disabled = false; $('ijRes').innerHTML = ''; return; }
    $('ijGen').disabled = false; res('ijRes', r); if (r.ok) CAPCT = null; };
}

// ---------- Bandeja de correos
async function capCorreos(fresco) {
  cargando('#capcorreo', 'Leyendo la bandeja…');
  let r; try { r = await api('p_cg_correos', { fresco: !!fresco }, 120000); } catch (e) { return; }
  if (location.hash.split('/')[0] !== '#capcorreo') return;
  if (!r.ok) return capSinInstalar('#capcorreo', 'Bandeja de correos', r);
  const E = r.estados, F = CAPCO.estado, lista = r.lista.filter(m => !F || m.estado === F);
  const col = e => /borrador/i.test(e) ? 'wa' : /envi/i.test(e) ? 'ok' : /descart|error/i.test(e) ? 'er' : 'gr';
  marco('#capcorreo', capTit('Bandeja de correos', 'Los correos del sistema de capacitaciones. Solo salen solos los de la agenda (confirmación, recordatorios y suspensión). Todo lo demás queda como borrador: lo ves acá y sale cuando tocás «Enviar».',
      '<a class="btn sec" href="' + esc(r.gmail) + '" target="_blank" rel="noopener">Borradores en Gmail ↗</a><a class="btn sec" href="' + esc(r.libro) + '" target="_blank" rel="noopener">Hoja _MENSAJES ↗</a><button class="btn sec" id="coAct">Actualizar</button>') +
    (r.remitente ? '' : '<div class="aviso">Gmail de la cuenta del sistema no tiene «Enviar como» ' + esc('belenpellegrini.hys@gmail.com') + ': los borradores salen de esa cuenta con respuesta a tu correo de HyS.</div>') +
    '<div class="tb5">' + capKp('Para revisar', E.Borrador || 0, 'borradores', E.Borrador ? 'var(--wa)' : '') + Object.keys(E).filter(k => k !== 'Borrador').slice(0, 4).map(k => capKp(esc(k), E[k], 'mensajes')).join('') + '</div>' +
    '<section class="card tabla"><div style="padding:14px 18px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end"><h2>Mensajes</h2><label class="f">Mostrar<select class="c" id="coF"><option value="">Todos</option>' + Object.keys(E).map(k => '<option' + (k === F ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select></label></div>' +
    (lista.length ? '<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Para</th><th>Asunto</th><th>Estado</th><th></th></tr></thead><tbody>' + lista.map((m, i) => '<tr><td class="peq">' + esc(m.fecha) + '</td><td class="peq">' + esc(m.tipo) + '</td><td class="peq">' + esc(m.para) + '</td><td>' + esc(m.asunto) + (m.codigo ? '<div class="mu peq">' + esc(m.codigo) + '</div>' : '') + '</td><td>' + capChip(m.estado, col(m.estado)) + '</td>' +
      '<td>' + (m.estado === 'Borrador' && m.borrador ? '<button class="btn pri" style="min-height:32px;padding:4px 12px;font-size:12.5px" data-co="' + esc(m.id) + '">Ver y enviar</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : '<div class="vacio">No hay mensajes' + (F ? ' con ese estado' : '') + '.</div>') + '</section>');
  $('coAct').onclick = () => capCorreos(true);
  $('coF').onchange = e => { CAPCO.estado = e.target.value; capCorreos(); };
  document.querySelectorAll('[data-co]').forEach(b => b.onclick = async () => {
    b.disabled = true; let v; try { v = await api('p_cg_correo_ver', { id: b.dataset.co }, 90000); } catch (e) { b.disabled = false; return; } b.disabled = false;
    if (!v.ok) return toast(v.mensaje || 'No se pudo abrir el borrador.');
    const w = capVentana('Revisar antes de enviar', '<dl class="dl"><dt>De</dt><dd>' + esc(v.desde) + '</dd><dt>Para</dt><dd>' + esc(v.para) + '</dd>' + (v.cc ? '<dt>CC</dt><dd>' + esc(v.cc) + '</dd>' : '') + '<dt>Asunto</dt><dd>' + esc(v.asunto) + '</dd>' + (v.adjuntos.length ? '<dt>Adjuntos</dt><dd>' + esc(v.adjuntos.join(', ')) + '</dd>' : '') + '</dl>' +
      '<iframe id="coPrev" style="width:100%;height:50vh;border:1px solid var(--ln);border-radius:8px;background:#fff" sandbox=""></iframe><p class="mu peq" style="margin:0">Si querés cambiar algo, editalo en Gmail (Borradores) y volvé a abrirlo acá antes de enviar.</p>',
      '<button class="btn sec" id="coDes">Descartar</button><button class="btn pri" id="coEnv">Enviar</button>');
    $('coPrev').srcdoc = v.html;
    $('coEnv').onclick = async () => { $('coEnv').disabled = true; $('coEnv').textContent = 'Enviando…'; let s; try { s = await api('p_cg_correo_enviar', { id: b.dataset.co }, 90000); } catch (e) { $('coEnv').disabled = false; $('coEnv').textContent = 'Enviar'; return; }
      if (!s.ok) { $('coEnv').disabled = false; $('coEnv').textContent = 'Enviar'; return w.error(s.mensaje || 'No se pudo enviar.'); } w.cerrar(); toast('Enviado.'); capCorreos(true); };
    $('coDes').onclick = async () => { if (!confirm('¿Descartar este borrador? Se borra de Gmail y queda como «Descartado».')) return; let s; try { s = await api('p_cg_correo_descartar', { id: b.dataset.co }, 90000); } catch (e) { return; }
      if (!s.ok) return w.error(s.mensaje || 'No se pudo descartar.'); w.cerrar(); toast('Descartado.'); capCorreos(true); };
  });
}
