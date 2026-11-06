// ------------------------------------------------------------------ 6 · Servicios e infraestructura › Relevamiento de CAPS · red Trelew (06/11/2026)
// Lo carga la secretaría desde «Mi establecimiento» (F-INF-01, versión 0). Acá se ve como tablero: lo marcado en cada CAPS,
// la comparación entre CAPS, el detalle con fotos y «Marcar como revisado». Servidor: RelevCaps.gs › p_rcaps y p_rcaps_revisar.
// Es lo que se vio y lo que contó el personal (sin evaluación técnica). Datos faltantes: s/d. Si falta GitHub: libro «M6 · Relevamiento de CAPS».
let RCP = null, RCF = { soloVig: true };
const rcSi = v => /^sí$/i.test(String(v || '').trim()), rcNo = v => /^no$/i.test(String(v || '').trim());
const rcSd = v => String(v == null || v === '' ? 's/d' : v);
const rcChip = (t, n) => { const c = { er: ['#FBE3DE', '#B4361F'], wa: ['#FFF1D6', '#8A5A00'], ok: ['#E3F4E8', '#1E6B3A'], nd: ['#EEF1F3', '#55606A'] }[n || 'nd'];
  return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;background:' + c[0] + ';color:' + c[1] + '">' + esc(t) + '</span>'; };
// Lo marcado en un relevamiento (solo datos cargados, sin calificar): [nivel, texto]
function rcMarcas(r) {
  const M = [], L = r.locales || [];
  L.filter(l => rcSi(l.CERRADURA_ROTA)).forEach(l => M.push(['er', 'Cerradura rota · ' + l.NOMBRE + ': ' + rcSd(l.CERRADURA_CUAL)]));
  L.filter(l => rcSi(l.VIDRIO_ROTO)).forEach(l => M.push(['er', 'Vidrio roto · ' + l.NOMBRE + ': ' + rcSd(l.VIDRIO_CUAL)]));
  L.filter(l => l.FUNCION === 'Baño').forEach(l => { const f = [rcNo(l.BANO_INODORO) ? 'inodoro no funciona' : '', rcNo(l.BANO_LAVATORIO) ? 'lavatorio no funciona' : '', rcNo(l.BANO_JABON) ? 'sin jabón' : '', rcNo(l.BANO_TOALLAS) ? 'sin toallas' : '', rcNo(l.BANO_BARRAS) ? 'sin barras de apoyo' : ''].filter(Boolean);
    if (f.length) M.push([/inodoro|lavatorio/.test(f.join()) ? 'er' : 'wa', l.NOMBRE + ': ' + f.join(', ')]); });
  const st = L.reduce((a, l) => a + (Number(l.TACHOS_SIN_TAPA) || 0), 0); if (st) M.push(['wa', st + ' tacho(s) sin tapa']);
  L.filter(l => /malo/i.test(l.ESTADO_GENERAL)).forEach(l => M.push(['wa', 'Estado malo · ' + l.NOMBRE]));
  if (r.DEPOSITO === 'No') M.push(['er', 'Sin depósito de residuos · los guardan en: ' + rcSd(r.DEPOSITO_DONDE)]);
  if (/comparte/i.test(r.DEPOSITO_COMPARTE)) M.push(['er', 'Depósito de residuos: ' + r.DEPOSITO_COMPARTE.toLowerCase() + (r.DEPOSITO_COMPARTE_CUAL ? ' (' + r.DEPOSITO_COMPARTE_CUAL + ')' : '')]);
  if (rcNo(r.DEPOSITO_LLAVE)) M.push(['wa', 'Depósito de residuos sin llave']);
  if (rcNo(r.BOLSA_ROJA)) M.push(['wa', 'No usan bolsa roja']);
  if (rcNo(r.LIBRO_ACTAS)) M.push(['wa', 'Sin libro de actas para los manifiestos']);
  if (rcNo(r.CARRO)) M.push(['wa', 'La mucama no tiene carro']); else if (/malo/i.test(r.CARRO_ESTADO)) M.push(['wa', 'Carro en mal estado']);
  if (rcSi(r.ESCALONES) && rcNo(r.RAMPA)) M.push(['wa', 'Escalones en la entrada y sin rampa']);
  if (rcSi(r.RAMPA) && rcNo(r.RAMPA_BARANDA)) M.push(['wa', 'Rampa sin baranda']);
  if (rcSi(r.CALORAMAS) && /nadie|no sabe|s\/d|^$/i.test(String(r.CALORAMAS_QUIEN || '') + '|' + String(r.CALORAMAS_ULTIMA || '')) ) M.push(['wa', 'Caloramas: limpieza ' + rcSd(r.CALORAMAS_QUIEN) + ' · última: ' + rcSd(r.CALORAMAS_ULTIMA)]);
  if (rcSi(r.CALDERA) && !rcSi(r.CALDERA_CONSTANCIA)) M.push(['wa', 'Caldera sin constancia de mantenimiento (' + rcSd(r.CALDERA_QUIEN) + ' · último: ' + rcSd(r.CALDERA_ULTIMA) + ')']);
  if (r.COORD_HABLO === 'No') M.push(['nd', 'No se habló con el coordinador: ' + rcSd(r.COORD_MOTIVO)]);
  const npv = [r.NO_PUDO_VER].concat(L.map(l => l.NO_PUDO_VER ? l.NOMBRE + ' · ' + l.NO_PUDO_VER : '')).filter(Boolean).join(' | ');
  if (npv) M.push(['nd', 'No se pudo ver: ' + npv]);
  return M;
}
async function pantallaRelevCaps(fresco) {
  marco('#rcaps', '<div class="cab"><div><span class="mu peq">6 · Servicios e infraestructura</span><h1>Relevamiento de CAPS · red Trelew</h1><span class="mu peq">Lo carga la secretaría desde «Mi establecimiento» (F-INF-01, versión 0): locales, tachos, cerraduras y vidrios, baños, acceso, residuos y lo que cuenta el coordinador. Es lo que se vio, sin evaluación técnica. Tocá un CAPS para ver el detalle y las fotos.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="rcAct">Actualizar</button><a class="btn sec" id="rcLib" href="#" target="_blank" rel="noopener" hidden>Planilla ↗</a><a class="btn sec" id="rcFot" href="#" target="_blank" rel="noopener" hidden>Fotos ↗</a></div></div>' +
    '<div id="rcBox"><section class="card"><div class="mu">Leyendo los relevamientos…</div></section></div>' +
    '<style>@media (max-width:760px){.rcT thead{display:none}.rcT,.rcT tbody,.rcT tr,.rcT td{display:block;width:100%}.rcT tr{border-top:1px solid var(--ln);padding:10px 0}.rcT td{border:0!important;padding:2px 0!important}.rcT td[data-l]::before{content:attr(data-l) ": ";color:var(--mu);font-weight:600}}.rcT tr[data-i]{cursor:pointer}.rcT tr[data-i]:hover{background:#F4F8FA}</style>');
  $('rcAct').onclick = () => pantallaRelevCaps(true);
  if (!RCP || fresco) { try { RCP = await api('p_rcaps', {}, 120000); } catch (e) { $('rcBox').innerHTML = '<section class="card"><div class="aviso error">No se pudieron leer los relevamientos de CAPS.</div></section>'; return; } }
  if (!RCP || RCP.ok === false) { $('rcBox').innerHTML = '<section class="card"><div class="aviso error">' + esc((RCP && (RCP.mensaje || RCP.error)) || 'No se pudieron leer los relevamientos.') + '</div></section>'; return; }
  if (RCP.libro) { $('rcLib').href = RCP.libro; $('rcLib').hidden = false; }
  if (RCP.carpeta) { $('rcFot').href = RCP.carpeta; $('rcFot').hidden = false; }
  rcPintar();
}
function rcPintar() {
  const R = RCP.rels || [], vig = R.filter(r => r.ESTADO === 'Vigente'), hechos = RCP.caps.filter(c => vig.some(r => r.CAPS === c)), faltan = RCP.caps.filter(c => hechos.indexOf(c) < 0);
  const kpi = (n, t, col) => '<div class="card" style="padding:12px;text-align:center"><div style="font-size:26px;font-weight:800;color:' + (col || 'inherit') + '">' + n + '</div><div class="mu peq">' + t + '</div></div>';
  const suma = f => vig.reduce((a, r) => a + f(r), 0), L = r => r.locales || [];
  const cerr = suma(r => L(r).filter(l => rcSi(l.CERRADURA_ROTA)).length), vid = suma(r => L(r).filter(l => rcSi(l.VIDRIO_ROTO)).length), st = suma(r => Number(r.TACHOS_SIN_TAPA) || 0);
  const depMal = vig.filter(r => r.DEPOSITO === 'No' || /comparte/i.test(r.DEPOSITO_COMPARTE)).length, sinRev = vig.filter(r => !/^revisado/i.test(r.REVISADO_HYS)).length;
  const ver = RCF.soloVig ? vig : R;
  const fila = r => { const l = L(r), cons = l.filter(x => /^consultorio|enfermer|vacunatorio/i.test(x.FUNCION)).length, ban = l.filter(x => x.FUNCION === 'Baño'), banMal = ban.filter(x => rcNo(x.BANO_INODORO) || rcNo(x.BANO_LAVATORIO) || /malo/i.test(x.ESTADO_GENERAL)).length, m = rcMarcas(r);
    return '<tr data-i="' + R.indexOf(r) + '"><td data-l="CAPS"><b>' + esc(r.CAPS) + '</b>' + (r.ESTADO !== 'Vigente' ? '<br><span class="mu peq">' + esc(r.ESTADO) + '</span>' : '') + '</td><td data-l="Fecha">' + esc(fechaTxt(r.FECHA)) + '</td>' +
      '<td data-l="Locales">' + esc(rcSd(r.N_LOCALES)) + '<span class="mu peq"> · ' + cons + ' de atención</span></td><td data-l="Baños">' + ban.length + (banMal ? ' ' + rcChip(banMal + ' con problema', 'er') : '') + '</td>' +
      '<td data-l="Tachos">' + esc(rcSd(r.TACHOS_TOTAL)) + (Number(r.TACHOS_SIN_TAPA) ? ' ' + rcChip(r.TACHOS_SIN_TAPA + ' sin tapa', 'wa') : '') + '</td>' +
      '<td data-l="Depósito">' + (r.DEPOSITO === 'No' ? rcChip('No hay', 'er') : /comparte/i.test(r.DEPOSITO_COMPARTE) ? rcChip('Compartido', 'er') : r.DEPOSITO === 'Sí' ? rcChip('Exclusivo', 'ok') : rcChip('s/d')) + '</td>' +
      '<td data-l="Retiro" class="peq">' + esc(rcSd(r.RETIRO)) + (r.RETIRO_PUERTA ? '<br><span class="mu">' + esc(r.RETIRO_PUERTA === 'Otra' ? r.RETIRO_PUERTA_CUAL : r.RETIRO_PUERTA) + '</span>' : '') + '</td>' +
      '<td data-l="Marcas">' + (m.filter(x => x[0] === 'er').length ? rcChip(m.filter(x => x[0] === 'er').length + ' importantes', 'er') + ' ' : '') + (m.filter(x => x[0] === 'wa').length ? rcChip(m.filter(x => x[0] === 'wa').length + ' a mirar', 'wa') : '') + (!m.length ? rcChip('Sin marcas', 'ok') : '') + '</td>' +
      '<td data-l="Revisión HyS" class="peq">' + esc(r.REVISADO_HYS || 'Sin revisar') + '</td></tr>'; };
  $('rcBox').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px">' + kpi(hechos.length + ' de ' + RCP.caps.length, 'CAPS relevados') + kpi(cerr, 'cerraduras rotas', cerr ? '#B4361F' : '') + kpi(vid, 'vidrios rotos', vid ? '#B4361F' : '') +
      kpi(st, 'tachos sin tapa', st ? '#8A5A00' : '') + kpi(depMal, 'sin depósito exclusivo', depMal ? '#B4361F' : '') + kpi(sinRev, 'sin revisar por HyS', sinRev ? '#21788C' : '') + '</div>' +
    (vig.length ? '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Lo marcado en cada CAPS (último relevamiento)</h2><span class="mu peq" style="display:block;margin-bottom:6px">En rojo, lo importante; en amarillo, lo que conviene mirar; en gris, lo que no se pudo ver o preguntar. Tocá el CAPS para ver el detalle.</span>' +
      vig.map(r => { const m = rcMarcas(r); return '<div style="margin:10px 0;cursor:pointer" data-u="' + R.indexOf(r) + '"><b>' + esc(r.CAPS) + '</b> <span class="mu peq">· ' + esc(fechaTxt(r.FECHA)) + '</span>' +
        (m.length ? '<ul style="margin:4px 0 0 18px;padding:0">' + m.map(x => '<li style="color:' + { er: '#B4361F', wa: '#8A5A00', nd: '#55606A' }[x[0]] + '">' + esc(x[1]) + '</li>').join('') + '</ul>' : '<div class="mu peq">Sin marcas.</div>') + '</div>'; }).join('') + '</section>' : '') +
    '<section class="card" style="grid-column:1/-1"><h2 style="margin:0 0 6px;font-size:16px">Comparación entre CAPS</h2>' +
    '<label class="peq" style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><input type="checkbox" id="rcV"' + (RCF.soloVig ? ' checked' : '') + '> Solo el último de cada CAPS</label>' +
    (ver.length ? '<div style="overflow-x:auto"><table class="tabla rcT" style="width:100%"><thead><tr><th>CAPS</th><th>Fecha</th><th>Locales</th><th>Baños</th><th>Tachos</th><th>Depósito</th><th>Retiro de residuos</th><th>Marcas</th><th>Revisión HyS</th></tr></thead><tbody>' + ver.map(fila).join('') + '</tbody></table></div>'
      : '<div class="mu">Todavía no hay relevamientos cargados.</div>') + '</section>' +
    '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Faltan relevar (' + faltan.length + ')</h2>' + (faltan.length ? faltan.map(c => '<div style="margin:3px 0">⬜ ' + esc(c) + '</div>').join('') : '<div class="mu">✅ Están todos.</div>') +
    '<span class="mu peq" style="display:block;margin-top:8px">La lista de CAPS sale de la hoja CAPS del libro (se puede agregar o corregir).</span></section>';
  $('rcV').onchange = e => { RCF.soloVig = e.target.checked; rcPintar(); };
  document.querySelectorAll('.rcT tr[data-i], #rcBox [data-u]').forEach(el => el.onclick = () => rcVer(R[+(el.dataset.i || el.dataset.u)]));
}
function rcVer(r) {
  const dd = (t, x) => '<dt>' + t + '</dt><dd>' + (x || 's/d') + '</dd>', nl = s => esc(s || '').replace(/\n/g, '<br>'), lk = (u, t) => u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + t + ' ↗</a>' : '';
  const L = r.locales || [], m = rcMarcas(r);
  const fotos = [['Entrada', r.FOTO_ENTRADA], ['Libro de actas', r.FOTO_LIBRO], ['Depósito', r.FOTO_DEPOSITO], ['Puerta de residuos', r.FOTO_PUERTA], ['Constancia de caldera', r.FOTO_CONSTANCIA]].filter(f => f[1]);
  $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Relevamiento de CAPS" style="max-width:900px"><h2>' + esc(r.CAPS) + ' · ' + esc(fechaTxt(r.FECHA)) + '</h2>' +
    '<dl class="dl">' + dd('Relevó', esc(r.CARGADO_POR)) + dd('Acompañó', esc(r.ACOMPANO)) + dd('Coordinador', esc(r.COORDINADOR) + (r.COORD_TEL && r.COORD_TEL !== 's/d' ? ' · ' + esc(r.COORD_TEL) : '')) + dd('Horario', esc(r.HORARIO)) + '</dl>' +
    (m.length ? '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Lo marcado</b><ul style="margin:4px 0 0 18px;padding:0">' + m.map(x => '<li style="color:' + { er: '#B4361F', wa: '#8A5A00', nd: '#55606A' }[x[0]] + '">' + esc(x[1]) + '</li>').join('') + '</ul></div>' : '') +
    '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Acceso</b><dl class="dl">' + dd('Escalones', esc(r.ESCALONES)) + dd('Rampa', esc(r.RAMPA) + (r.RAMPA === 'Sí' ? ' · baranda: ' + esc(rcSd(r.RAMPA_BARANDA)) : '')) + '</dl></div>' +
    '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Residuos</b><dl class="dl">' + dd('Bolsa roja', esc(r.BOLSA_ROJA)) + dd('Bolsa amarilla', esc(r.BOLSA_AMARILLA)) + dd('Libro de actas', esc(r.LIBRO_ACTAS)) +
      dd('Depósito', r.DEPOSITO === 'Sí' ? esc(r.DEPOSITO_COMPARTE) + (r.DEPOSITO_COMPARTE_CUAL ? ' (' + esc(r.DEPOSITO_COMPARTE_CUAL) + ')' : '') + ' · llave: ' + esc(rcSd(r.DEPOSITO_LLAVE)) : r.DEPOSITO === 'No' ? 'No hay · los guardan en: ' + esc(rcSd(r.DEPOSITO_DONDE)) : '') +
      dd('Carro de la mucama', esc(r.CARRO) + (r.CARRO_ESTADO ? ' · ' + esc(r.CARRO_ESTADO) : '')) + dd('Retiro', esc(r.RETIRO)) + dd('Puerta', esc(r.RETIRO_PUERTA === 'Otra' ? r.RETIRO_PUERTA_CUAL : r.RETIRO_PUERTA)) + '</dl></div>' +
    '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Coordinador</b>' + (r.COORD_HABLO === 'No' ? '<div class="mu">No se habló: ' + esc(rcSd(r.COORD_MOTIVO)) + '</div>' : '<dl class="dl">' +
      dd('Caloramas', esc(r.CALORAMAS) + (r.CALORAMAS === 'Sí' ? ' · limpia: ' + esc(rcSd(r.CALORAMAS_QUIEN)) + ' · última: ' + esc(rcSd(r.CALORAMAS_ULTIMA)) : '')) +
      dd('Caldera', esc(r.CALDERA) + (r.CALDERA === 'Sí' ? ' · mantenimiento: ' + esc(rcSd(r.CALDERA_QUIEN)) + ' · último: ' + esc(rcSd(r.CALDERA_ULTIMA)) + ' · constancia: ' + esc(rcSd(r.CALDERA_CONSTANCIA)) : '')) +
      (r.COORD_OTROS ? dd('Otros problemas', nl(r.COORD_OTROS)) : '') + '</dl>') + '</div>' +
    '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Locales (' + L.length + ')</b><div style="overflow-x:auto"><table class="tabla" style="width:100%;margin-top:6px"><thead><tr><th>#</th><th>Local</th><th>Tachos</th><th>Cerradura</th><th>Vidrio</th><th>Baño</th><th>Estado</th><th>Fotos</th></tr></thead><tbody>' +
      L.map(l => '<tr><td>' + esc(l.N) + '</td><td><b>' + esc(l.NOMBRE) + '</b><br><span class="mu peq">' + esc(l.FUNCION === 'Otro' ? 'Otro: ' + l.FUNCION_OTRA : l.FUNCION) + '</span>' + (l.OBSERVACIONES ? '<br><span class="peq">' + nl(l.OBSERVACIONES) + '</span>' : '') + (l.NO_PUDO_VER ? '<br><span class="peq mu">No se pudo ver: ' + esc(l.NO_PUDO_VER) + '</span>' : '') + '</td>' +
        '<td class="peq">' + esc(l.TACHOS_DETALLE) + '</td><td class="peq">' + (rcSi(l.CERRADURA_ROTA) ? rcChip('Rota', 'er') + ' ' + esc(l.CERRADURA_CUAL) : esc(l.CERRADURA_ROTA)) + '</td><td class="peq">' + (rcSi(l.VIDRIO_ROTO) ? rcChip('Roto', 'er') + ' ' + esc(l.VIDRIO_CUAL) : esc(l.VIDRIO_ROTO)) + '</td>' +
        '<td class="peq">' + (l.FUNCION === 'Baño' ? esc(l.BANO_PARA) + '<br>inodoro: ' + esc(rcSd(l.BANO_INODORO)) + ' · lavatorio: ' + esc(rcSd(l.BANO_LAVATORIO)) + '<br>jabón: ' + esc(rcSd(l.BANO_JABON)) + ' · toallas: ' + esc(rcSd(l.BANO_TOALLAS)) + (l.BANO_BARRAS ? ' · barras: ' + esc(l.BANO_BARRAS) : '') : '') + '</td>' +
        '<td>' + rcChip(rcSd(l.ESTADO_GENERAL), /malo/i.test(l.ESTADO_GENERAL) ? 'er' : /regular/i.test(l.ESTADO_GENERAL) ? 'wa' : /bueno/i.test(l.ESTADO_GENERAL) ? 'ok' : 'nd') + '</td><td>' + lk(l.FOTOS, 'Ver') + '</td></tr>').join('') + '</tbody></table></div></div>' +
    (fotos.length ? '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Otras fotos</b><div style="margin-top:4px">' + fotos.map(f => lk(f[1], f[0])).join(' · ') + '</div></div>' : '') +
    (r.OBSERVACIONES ? '<div style="border-top:1px solid var(--ln);padding:10px 0"><b>Observaciones generales</b><div style="margin-top:4px">' + nl(r.OBSERVACIONES) + '</div></div>' : '') +
    '<dl class="dl">' + dd('Revisión HyS', esc(r.REVISADO_HYS || 'Sin revisar')) + '</dl>' +
    '<label class="f" style="margin-top:8px">Nota de revisión (opcional)<input class="c" id="rcNota" placeholder="Ej.: pasa al informe; pedir a Mantenimiento"></label>' +
    '<div class="acciones"><div><button class="btn sec" id="rcImp">Imprimir</button></div><div style="display:flex;gap:8px"><button class="btn sec" id="rcCer">Cerrar</button><button class="btn pri" id="rcRev">Marcar como revisado</button></div></div></div>';
  $('ov').hidden = false;
  const cerrar = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
  $('rcCer').onclick = cerrar;
  $('rcImp').onclick = () => { const w = window.open('', '_blank'); if (!w) return toast('El navegador bloqueó la ventana para imprimir.');
    w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Relevamiento ' + esc(r.CAPS) + '</title><style>body{font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:10pt;color:#4D4D4D;margin:24px}h2{color:#0D313F}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px;text-align:left;vertical-align:top}dt{font-weight:700;color:#0D313F}dd{margin:0 0 4px 0}a{color:#5894A7}</style></head><body>' + $('ov').querySelector('.modal').innerHTML.replace(/<label class="f"[\s\S]*$/, '') + '<p style="font-size:8pt">F-INF-01 · versión 0 · Servicio de Higiene y Seguridad Laboral HZT / HMH · Ley 19.587, Decreto 351/79 y Res. SRT 905/2015</p></body></html>');
    w.document.close(); w.focus(); w.print(); };
  $('rcRev').onclick = async () => { $('rcRev').disabled = true; $('rcRev').textContent = 'Guardando…';
    try { const x = await api('p_rcaps_revisar', { id: r.ID, nota: $('rcNota').value }, 60000); if (!x.ok) throw new Error(x.mensaje); toast('Relevamiento marcado como revisado.'); cerrar(); pantallaRelevCaps(true); }
    catch (e) { $('rcRev').disabled = false; $('rcRev').textContent = 'Marcar como revisado'; toast(e.message || 'No se pudo guardar.'); } };
}
