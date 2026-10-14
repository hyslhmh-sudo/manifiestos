// Portal HyS · 4 · Siniestros (lista, investigación y estadísticas)
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Módulo 8 · Siniestros (Modulo4.gs): toda la red, solo lectura. Se cargan y corrigen desde «Mi establecimiento».
let SINP = null, SINPF = { est: '', estado: 'Abiertos', tipo: '', q: '' };
const sinChip = e => '<span class="chip ' + (e === 'En ILT' || e === 'Denunciado' ? 'wa' : e === 'Rechazado' || e === 'Inculpable' ? 'er' : 'ok') + '">' + esc(e) + '</span>';
const sinLinksP = (L, t) => (L || []).map((u, i) => '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + t + (L.length > 1 ? ' ' + (i + 1) : '') + ' ↗</a>').join(' · ');
async function sinPortal(id, fresco) {
  if (!SINP || fresco) { cargando('#sin', 'Leyendo siniestros…'); try { const r = await api('p_sin_lista', {}, 120000); if (!r.ok) return marco('#sin', '<div class="card aviso error">' + esc(r.mensaje || 'No se pudo leer.') + '</div>'); SINP = r; } catch (e) { return; } }
  if (id) return sinPortalVer(id);
  const F = SINPF, anio = SINP.hoy.slice(0, 4), L = SINP.lista, q = F.q.toLowerCase();
  const V = L.filter(s => (!F.est || s.est === F.est) && (!F.tipo || s.tipo === F.tipo) && (F.estado === 'Todos' || (F.estado === 'Abiertos' ? s.abierto || s.avisos.length : s.estado === F.estado)) && (!q || (s.nombre + ' ' + s.dni + ' ' + s.nro + ' ' + s.servicio).toLowerCase().indexOf(q) >= 0));
  const delAnio = L.filter(s => s.fecha.slice(0, 4) === anio), ests = Array.from(new Set(L.map(s => s.est))).sort();
  const kpi = (t, n, sub) => '<div class="kpi2"><span>' + t + '</span><b>' + n + '</b><small>' + sub + '</small></div>';
  const sel = (id, ops, val) => '<select class="c" id="' + id + '">' + ops.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  marco('#sin', '<div class="cab"><div><span class="mu peq">8 · Personal y RAR</span><h1>Siniestros</h1><span class="mu peq">Los cargan Personal y la secretaría desde «Mi establecimiento». Acá se ven todos, con diagnóstico y exposición.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="sinAct">Actualizar</button><a class="btn sec" href="' + esc(SINP.libro) + '" target="_blank" rel="noopener">Libro de siniestros ↗</a></div></div>' +
    '<div class="tb5">' + kpi('Siniestros ' + anio, delAnio.length, delAnio.filter(s => s.tipo === 'In itinere').length + ' in itinere · ' + delAnio.filter(s => s.tipo === 'Enfermedad profesional').length + ' enf. profesional') +
      kpi('En ILT hoy', L.filter(s => s.estado === 'En ILT').length, 'abiertos con baja') + kpi('Días de baja ' + anio, delAnio.reduce((a, s) => a + (Number(s.dias) || 0), 0), 'suma de los siniestros del año') +
      kpi('Investigación pendiente', L.filter(s => s.estadoHys === 'Pendiente de análisis').length, L.filter(s => s.avisos.length).length + ' con avisos') + '</div>' +
    '<section class="card" style="margin-top:16px"><div class="filtros" style="margin-bottom:10px">' +
      '<label class="f">Establecimiento' + sel('sfE', [['', 'Todos']].concat(ests.map(e => [e, e])), F.est) + '</label>' +
      '<label class="f">Estado' + sel('sfS', [['Abiertos', 'Abiertos y con avisos'], ['Todos', 'Todos'], ['En ILT', 'En ILT'], ['Denunciado', 'Denunciado'], ['De alta', 'De alta'], ['Sin baja', 'Sin baja'], ['Rechazado', 'Rechazado'], ['Inculpable', 'Inculpable'], ['Cerrado', 'Cerrado']], F.estado) + '</label>' +
      '<label class="f">Tipo' + sel('sfT', [['', 'Todos'], ['En el lugar de trabajo', 'En el lugar de trabajo'], ['In itinere', 'In itinere'], ['Enfermedad profesional', 'Enfermedad profesional']], F.tipo) + '</label>' +
      '<label class="f" style="flex:1 1 200px">Buscar<input class="c" id="sfQ" value="' + esc(F.q) + '" placeholder="Apellido, DNI, CH o servicio"></label></div>' +
    (V.length ? '<div style="overflow-x:auto"><table class="sinTab" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha</th><th>Persona</th><th>Lugar</th><th>Tipo</th><th>Estado</th><th>Días</th><th>Avisos</th></tr></thead><tbody>' +
      V.map(s => '<tr class="cl" data-id="' + esc(s.id) + '"><td>' + fechaTxt(s.fecha) + '<div class="mu peq">' + esc(s.nro) + '</div></td><td><b>' + esc(s.nombre) + '</b><div class="mu peq">' + esc(s.servicio) + ' · ' + esc(s.funcion) + '</div></td><td>' + esc(s.est) + '<div class="mu peq">' + esc(s.sitio) + '</div></td><td>' + esc(s.tipo) + '</td><td>' + sinChip(s.estado) + (s.estadoHys === 'Pendiente de análisis' ? '<div class="mu peq">Investigación pendiente</div>' : '') + '</td><td>' + (s.dias || 0) + '</td><td class="peq">' + s.avisos.map(esc).join('<br>') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="mu">No hay siniestros con esos filtros.</div>') + '</section>');
  $('sinAct').onclick = () => sinPortal('', true);
  $('sfE').onchange = e => { SINPF.est = e.target.value; sinPortal(); }; $('sfS').onchange = e => { SINPF.estado = e.target.value; sinPortal(); }; $('sfT').onchange = e => { SINPF.tipo = e.target.value; sinPortal(); };
  $('sfQ').onchange = e => { SINPF.q = e.target.value.trim(); sinPortal(); };
  document.querySelectorAll('.sinTab tr.cl').forEach(tr => tr.onclick = () => { location.hash = '#sin/' + encodeURIComponent(tr.dataset.id); });
}
function sinPortalVer(id) {
  const s = SINP.lista.find(x => x.id === id); if (!s) { location.hash = '#sin'; return; }
  const dd = (t, v) => '<dt>' + t + '</dt><dd>' + (v === '' || v == null ? '<span class="mu">s/d</span>' : v) + '</dd>';
  marco('#sin', '<div class="cab"><div><a class="mu peq" href="#sin">‹ Siniestros</a><h1>' + esc(s.nombre) + '</h1><span class="mu peq">' + esc(s.nro) + ' · ' + esc(s.tipo) + ' · ' + fechaTxt(s.fecha) + ' · ' + esc(s.est) + ' · ' + esc(s.sitio) + '</span></div>' +
    '<div class="filtros">' + sinChip(s.estado) + '<span class="chip gr">' + (s.dias || 0) + ' días de baja</span><span class="chip gr">' + esc(s.estadoHys === 'Analizado' ? 'Investigación cerrada' : 'Investigación pendiente') + '</span><a class="btn pri" href="#inv/' + encodeURIComponent(s.id) + '">Investigación</a></div></div>' +
    (s.avisos.length ? '<div class="aviso" style="margin-bottom:14px">' + s.avisos.map(esc).join(' · ') + '</div>' : '') +
    '<div class="tb3"><section class="card"><h2 style="margin:0 0 10px;font-size:16px">Denuncia</h2><dl class="dl">' +
      dd('N.º de siniestro', esc(s.nro) + (s.viene ? ' (viene de ' + esc(s.viene) + ')' : '')) + dd('Fecha y hora', fechaTxt(s.fecha) + (s.hora && !/s\/d/.test(s.hora) ? ' · ' + esc(s.hora) : '')) + dd('Tipo', esc(s.tipo)) + dd('Lugar de trabajo', esc(s.est) + ' · ' + esc(s.sitio)) +
      dd('El hospital se enteró', fechaTxt(s.conoce)) + dd('Denuncia al Autoseguro', fechaTxt(s.denuncia) + ' · en plazo: ' + esc(s.plazo || 's/d')) + dd('Copia al trabajador', esc(s.copia)) +
      dd('Archivos', sinLinksP(s.archivos, 'Denuncia')) + dd('Cargó', esc(s.cargo) + ' · ' + esc(String(s.cargado).slice(0, 16))) + (s.obs ? dd('Observaciones', esc(s.obs)) : '') + '</dl></section>' +
    '<section class="card"><h2 style="margin:0 0 10px;font-size:16px">Persona y diagnóstico</h2><dl class="dl">' +
      dd('DNI', esc(s.dni) + ' · <a href="#buscar/' + encodeURIComponent(s.dni) + '">ver ficha</a>') + dd('Servicio · función', esc(s.servicio) + ' · ' + esc(s.funcion)) + dd('Ingreso', fechaTxt(s.ingreso)) + dd('En la base', esc(s.enBase)) +
      dd('CIE 10', esc(s.cie10)) + dd('Diagnóstico de certeza', esc(s.diagnostico)) + '</dl>' +
      '<h3 style="margin:16px 0 6px;font-size:14px">Exposición según la NTE</h3><div id="sinExpo" class="mu peq">Buscando…</div></section></div>' +
    '<section class="card" style="margin-top:16px"><h2 style="margin:0 0 10px;font-size:16px">Novedades</h2>' + (s.novedades.length ? '<div style="overflow-x:auto"><table class="sinTab" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha</th><th>Novedad</th><th>Comprobantes</th><th>Observaciones</th><th>Cargó</th></tr></thead><tbody>' +
      s.novedades.map(n => '<tr><td>' + fechaTxt(n.fecha) + '</td><td><b>' + esc(n.novedad) + '</b></td><td>' + (sinLinksP(n.urls, 'Ver') || '—') + '</td><td class="peq">' + esc(n.obs || '') + '</td><td class="peq">' + esc(n.cargo || '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="mu">Todavía sin novedades.</div>') + '</section>');
  api('p_sin_expo', { dni: s.dni, hoja: s.est }, 120000).then(r => { const box = $('sinExpo'); if (box) box.innerHTML = sinExpoTxt(r && r.exposicion, s); }).catch(() => { const box = $('sinExpo'); if (box) box.textContent = 'No se pudo consultar.'; });
}
// Exposición de la persona (NTE) y, si es una enfermedad profesional, el control de que el agente esté declarado
function sinExpoTxt(x, s) {
  if (!x) return '<span class="mu">No está en la base de trabajadores, o no se pudo consultar.</span>';
  const base = esc(x.servicio || 's/d') + ' · ' + esc(x.funcion || 's/d') + (x.propio ? ' · definida en su ficha' : ' · según la matriz');
  if (x.estado === 'sin definir') return '<span class="chip wa">Sin definir en la matriz</span><div class="mu peq" style="margin-top:4px">' + base + '. Completala en NTE › matriz.</div>';
  if (x.estado === 'no expuesto') return '<span class="chip gr">No expuesto</span><div class="mu peq" style="margin-top:4px">' + base + '</div>' + (s && s.tipo === 'Enfermedad profesional' ? '<div class="aviso error" style="margin-top:8px">Enfermedad profesional en una persona declarada NO EXPUESTA: revisar la NTE de su puesto.</div>' : '');
  return '<div class="mu peq" style="margin-bottom:4px">' + base + '</div>' + x.agentes.map(a => '<div class="peq"><b>' + esc(a.cod) + '</b> ' + esc(a.agente) + '</div>').join('') +
    (s && s.tipo === 'Enfermedad profesional' ? '<div class="aviso" style="margin-top:8px">Enfermedad profesional: verificá que el agente que la causó esté entre los declarados. Si no está, hay que actualizar la NTE.</div>' : '');
}

// ------------------------------------------------------------------ Investigación de un siniestro (Investigacion.gs): árbol de causas o breve, medidas y nota
let INVD = null, INVN = 0;
const invOpt = (L, v, vacio) => (vacio !== undefined ? '<option value="">' + esc(vacio) + '</option>' : '') + (L || []).map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + (v && (L || []).indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '');
async function invForm(id) {
  cargando('#sin', 'Abriendo la investigación…');
  let r; try { r = await api('p_inv_abrir', { id: id }, 120000); } catch (e) { return; }
  if (!r.ok) return marco('#sin', '<div class="cab"><div><a class="mu peq" href="#sin/' + encodeURIComponent(id) + '">‹ Siniestro</a><h1>Investigación</h1></div></div><div class="card aviso error">' + esc(r.mensaje || 'No se pudo abrir.') + '</div>');
  invCargar(r); invPintar();
}
function invCargar(r) {
  INVD = r; INVN = 0;
  const i = r.inv || {};
  INVD.v = { METODO: i.METODO || r.criterio.metodo, MOTIVO: i.MOTIVO || r.criterio.motivo, FECHA_INICIO: String(i.FECHA_INICIO || r.hoy).slice(0, 10), LUGAR_EXACTO: i.LUGAR_EXACTO || '', TAREA: i.TAREA || '',
    DESCRIPCION: i.DESCRIPCION || '', FORMA: i.FORMA || '', AGENTE_MATERIAL: i.AGENTE_MATERIAL || '', ZONA_CUERPO: i.ZONA_CUERPO || '', NATURALEZA_LESION: i.NATURALEZA_LESION || '',
    ENTREVISTADOS: i.ENTREVISTADOS || '', CONCLUSION: i.CONCLUSION || '', ESTADO: i.ESTADO || 'En curso', OBSERVACIONES: i.OBSERVACIONES || '',
    TURNO: i.TURNO || '', SUPERVISION: i.SUPERVISION || '', MESA_ENTRADAS: String(i.MESA_ENTRADAS || '').slice(0, 10) };
  INVD.h = (r.hechos || []).map(h => ({ ID: h.ID, HECHO: h.HECHO, TIPO: h.TIPO, CATEGORIA: h.CATEGORIA, CAUSA: h.CAUSA || '', ANTECEDENTE_DE: String(h.ANTECEDENTE_DE || '').split(/[,;\s]+/)[0] || '' }));
  if (!INVD.h.length) INVD.h = [{ ID: 'n' + (++INVN), HECHO: '', TIPO: 'Ocasional', CATEGORIA: 'Individuo', CAUSA: '', ANTECEDENTE_DE: '' }];
  INVD.m = (r.medidas || []).map(m => ({ ID: m.ID, MEDIDA: m.MEDIDA, NIVEL: m.NIVEL, RESPONSABLE: /s\/d/.test(m.RESPONSABLE) ? '' : m.RESPONSABLE, PLAZO: String(m.PLAZO || '').slice(0, 10), ESTADO: m.ESTADO, ID_HECHO: m.ID_HECHO || '', COMUNICADA: m.COMUNICADA || '',
    PRIORIDAD: m.PRIORIDAD || '', FECHA_VERIFICACION: String(m.FECHA_VERIFICACION || '').slice(0, 10), VERIFICA: m.VERIFICA || '', VERIFICADA: m.VERIFICADA || '' }))
    .sort((a, b) => (Number(a.PRIORIDAD) || 99) - (Number(b.PRIORIDAD) || 99));
}
// Lee lo escrito en pantalla antes de volver a dibujar (para no perder nada al agregar o quitar filas)
function invLeer() {
  if (!INVD || !$('invForm')) return;
  Object.keys(INVD.v).forEach(k => { const el = $('iv_' + k); if (el) INVD.v[k] = el.value; });
  INVD.h.forEach((h, i) => ['HECHO', 'TIPO', 'CATEGORIA', 'CAUSA', 'ANTECEDENTE_DE'].forEach(k => { const el = $('ih_' + i + '_' + k); if (el) h[k] = el.value; }));
  INVD.m.forEach((m, i) => ['PRIORIDAD', 'MEDIDA', 'NIVEL', 'RESPONSABLE', 'PLAZO', 'FECHA_VERIFICACION', 'VERIFICA', 'VERIFICADA', 'ESTADO', 'ID_HECHO'].forEach(k => { const el = $('im_' + i + '_' + k); if (el) m[k] = el.value; }));
}
function invArbolHtml(H) {
  const hijos = {}, raices = [], num = {}; H.forEach((h, i) => num[h.ID] = 'H' + (i + 1));
  H.forEach(h => { if (!h.ANTECEDENTE_DE || !num[h.ANTECEDENTE_DE]) raices.push(h); else (hijos[h.ANTECEDENTE_DE] = hijos[h.ANTECEDENTE_DE] || []).push(h); });
  const out = [], ir = (h, n, cam) => { out.push('<div style="margin-left:' + (n * 22) + 'px;padding:3px 0;font-size:13px">' + (n ? '<span class="mu">└ </span>' : '') + '<b>' + num[h.ID] + '</b> ' + esc(h.HECHO || '(sin texto)') +
    ' <span class="chip ' + (h.TIPO === 'Permanente' ? 'gr' : 'wa') + '" style="font-size:11px">' + esc(h.TIPO || '') + '</span> <span class="mu peq">' + esc(h.CATEGORIA || '') + (n && h.CAUSA ? ' · causa ' + esc(h.CAUSA.toLowerCase()) : '') + '</span></div>');
    (hijos[h.ID] || []).forEach(c => { if (cam.indexOf(c.ID) < 0) ir(c, n + 1, cam.concat(c.ID)); }); };
  raices.forEach(r => ir(r, 0, [r.ID]));
  return out.join('') + (raices.length > 1 ? '<div class="aviso" style="margin-top:8px">Hay ' + raices.length + ' hechos sin «antecedente de»: el árbol tiene que terminar en un solo hecho, la lesión. Revisá a qué hecho lleva cada uno.</div>' : '');
}
function invPintar() {
  const r = INVD, s = r.siniestro, L = r.listas, v = r.v, c = r.criterio, arbol = /rbol/.test(v.METODO);
  const fila = (t, html, ancho) => '<label class="f" style="flex:1 1 ' + (ancho || 220) + 'px">' + t + html + '</label>';
  const inp = (k, t, ancho, tipo) => fila(t, '<input class="c" id="iv_' + k + '" type="' + (tipo || 'text') + '" value="' + esc(v[k]) + '">', ancho);
  const sel = (k, t, lista, ancho, vacio) => fila(t, '<select class="c" id="iv_' + k + '">' + invOpt(lista, v[k], vacio) + '</select>', ancho);
  const area = (k, t, ph) => '<label class="f" style="flex:1 1 100%">' + t + '<textarea class="c" id="iv_' + k + '" rows="3" placeholder="' + esc(ph || '') + '">' + esc(v[k]) + '</textarea></label>';
  const labelH = (h, i) => 'H' + (i + 1) + (h.HECHO ? ' · ' + String(h.HECHO).slice(0, 40) : '');
  const hechosHtml = r.h.map((h, i) => '<div class="card" style="padding:10px;margin-bottom:8px"><div class="filtros" style="align-items:flex-end">' +
    '<b style="min-width:34px;color:var(--az)">H' + (i + 1) + '</b>' +
    '<label class="f" style="flex:3 1 260px">' + (i === 0 ? 'Hecho (el primero es la lesión)' : 'Hecho') + '<input class="c" id="ih_' + i + '_HECHO" value="' + esc(h.HECHO) + '" placeholder="' + (i === 0 ? 'Ej.: se pinchó el dedo índice con una aguja usada' : 'Ej.: el descartador estaba lleno') + '"></label>' +
    '<label class="f" style="flex:1 1 120px">Tipo<select class="c" id="ih_' + i + '_TIPO">' + invOpt(L.TIPO_HECHO, h.TIPO) + '</select></label>' +
    '<label class="f" style="flex:1 1 140px">Categoría<select class="c" id="ih_' + i + '_CATEGORIA">' + invOpt(L.CATEGORIA_HECHO, h.CATEGORIA) + '</select></label>' +
    (i ? '<label class="f" style="flex:1 1 130px">Causa<select class="c" id="ih_' + i + '_CAUSA"><option value="">—</option>' + invOpt(L.CAUSA_HECHO || ['Primaria', 'Secundaria'], h.CAUSA) + '</select></label>' : '') +
    '<label class="f" style="flex:2 1 200px">Es antecedente de<select class="c" id="ih_' + i + '_ANTECEDENTE_DE"><option value="">— (es la lesión)</option>' + r.h.map((o, j) => j === i ? '' : '<option value="' + esc(o.ID) + '"' + (o.ID === h.ANTECEDENTE_DE ? ' selected' : '') + '>' + esc(labelH(o, j)) + '</option>').join('') + '</select></label>' +
    '<button class="btn sec" data-qh="' + i + '" title="Quitar este hecho">✕</button></div></div>').join('');
  const medidasHtml = r.m.map((m, i) => '<div class="card" style="padding:10px;margin-bottom:8px"><div class="filtros" style="align-items:flex-end">' +
    '<label class="f" style="flex:0 1 80px">Prioridad<input class="c" type="number" min="1" id="im_' + i + '_PRIORIDAD" value="' + esc(m.PRIORIDAD || i + 1) + '"></label>' +
    '<label class="f" style="flex:3 1 260px">Medida<input class="c" id="im_' + i + '_MEDIDA" value="' + esc(m.MEDIDA) + '" placeholder="Ej.: cambiar los descartadores cuando llegan a 3/4"></label>' +
    '<label class="f" style="flex:1 1 170px">Tipo de control<select class="c" id="im_' + i + '_NIVEL">' + invOpt(L.NIVEL_MEDIDA, m.NIVEL, 'Elegir') + '</select></label>' +
    '<label class="f" style="flex:1 1 170px">Servicio responsable<input class="c" id="im_' + i + '_RESPONSABLE" value="' + esc(m.RESPONSABLE) + '" placeholder="' + esc(s.servicio || 'Servicio') + '"></label>' +
    '<label class="f" style="flex:0 1 170px">Plazo que informó el servicio<input class="c" type="date" id="im_' + i + '_PLAZO" value="' + esc(m.PLAZO) + '"></label>' +
    '<label class="f" style="flex:0 1 150px">Verificación<input class="c" type="date" id="im_' + i + '_FECHA_VERIFICACION" value="' + esc(m.FECHA_VERIFICACION) + '"></label>' +
    '<label class="f" style="flex:1 1 160px">Verifica<input class="c" id="im_' + i + '_VERIFICA" value="' + esc(m.VERIFICA) + '" placeholder="Higiene y Seguridad Laboral"></label>' +
    '<label class="f" style="flex:2 1 220px">Verificación realizada<input class="c" id="im_' + i + '_VERIFICADA" value="' + esc(m.VERIFICADA) + '" placeholder="Fecha y resultado, cuando se verifique"></label>' +
    '<label class="f" style="flex:0 1 140px">Estado<select class="c" id="im_' + i + '_ESTADO">' + invOpt(L.ESTADO_MEDIDA.filter(e => e !== 'Anulada'), m.ESTADO || 'Propuesta') + '</select></label>' +
    '<label class="f" style="flex:1 1 170px">Ataca al hecho<select class="c" id="im_' + i + '_ID_HECHO"><option value="">—</option>' + r.h.map((o, j) => '<option value="' + esc(o.ID) + '"' + (o.ID === m.ID_HECHO ? ' selected' : '') + '>' + esc(labelH(o, j)) + '</option>').join('') + '</select></label>' +
    '<button class="btn sec" data-qm="' + i + '" title="Quitar esta medida">✕</button></div>' + (m.COMUNICADA ? '<div class="mu peq" style="margin-top:4px">' + esc(m.COMUNICADA) + '</div>' : '') + '</div>').join('');
  const otros = r.otros.length ? '<div class="mu peq" style="margin-top:8px">Otros siniestros relacionados: ' + r.otros.map(o => '<a href="#sin/' + encodeURIComponent(o.id) + '">' + esc(o.nro) + '</a> (' + fechaTxt(o.fecha) + ', ' + (o.mismaPersona ? 'misma persona' : 'mismo servicio') + ')').join(' · ') + '</div>' : '';
  marco('#sin', '<div class="cab"><div><a class="mu peq" href="#sin/' + encodeURIComponent(s.id) + '">‹ ' + esc(s.nombre) + '</a><h1>Investigación</h1><span class="mu peq">' + esc(s.nro) + ' · ' + esc(s.tipo) + ' · ' + fechaTxt(s.fecha) + ' · ' + esc(s.est) + ' · ' + esc(s.sitio) + ' · ' + esc(s.servicio) + ' · ' + (s.dias || 0) + ' días de baja</span></div>' +
    '<div class="filtros">' + (r.inv && r.inv.NOTA_DOC ? '<a class="btn sec" href="' + esc(r.inv.NOTA_DOC) + '" target="_blank" rel="noopener">Nota (' + esc(String(r.inv.NOTA_CODIGO).toLowerCase()) + ') ↗</a>' : '') + '<span class="chip ' + (v.ESTADO === 'Cerrada' ? 'ok' : 'wa') + '">' + esc(r.inv ? v.ESTADO : 'Sin empezar') + '</span></div></div>' +
    '<div id="invForm">' +
    '<section class="card"><h2 style="margin:0 0 6px;font-size:16px">Método</h2><div class="aviso" style="margin-bottom:10px"><b>El sistema sugiere: ' + esc(c.metodo) + '.</b> ' + c.motivos.map(esc).join(' · ') + '</div>' +
      '<div class="filtros">' + sel('METODO', 'Método', L.METODO) + sel('MOTIVO', 'Motivo', L.MOTIVO) + inp('FECHA_INICIO', 'Inicio', 150, 'date') + sel('ESTADO', 'Estado', L.ESTADO_INVESTIGACION.filter(e => e !== 'Anulada'), 150) +
      inp('SUPERVISION', 'Supervisión que participó (cargo o nombre)', 320) + '</div>' + otros + '</section>' +
    '<section class="card" style="margin-top:14px"><h2 style="margin:0 0 6px;font-size:16px">Qué pasó</h2><div class="filtros">' +
      inp('LUGAR_EXACTO', 'Lugar exacto', 260) + inp('TAREA', 'Tarea que realizaba', 260) + sel('TURNO', 'Turno', L.TURNO || ['Mañana', 'Tarde', 'Noche', 'Guardia de 24 h'], 160, 'Elegir') + area('DESCRIPCION', 'Descripción breve (la escribe HyS; sale en la nota)', 'Qué estaba haciendo, qué pasó y cómo. Sin datos de salud.') +
      sel('FORMA', 'Forma', L.FORMA, 240, 'Elegir') + sel('AGENTE_MATERIAL', 'Agente material', L.AGENTE_MATERIAL, 240, 'Elegir') + sel('ZONA_CUERPO', 'Zona del cuerpo', L.ZONA_CUERPO, 200, 'Elegir') + sel('NATURALEZA_LESION', 'Naturaleza de la lesión', L.NATURALEZA_LESION, 220, 'Elegir') +
      inp('ENTREVISTADOS', 'Personas entrevistadas (cargo o función)', 400) + '</div></section>' +
    '<section class="card" style="margin-top:14px"><h2 style="margin:0 0 4px;font-size:16px">' + (arbol ? 'Árbol de causas' : 'Causas') + '</h2><p class="mu peq" style="margin:0 0 10px">' +
      (arbol ? 'Empezá por la lesión (H1). Para cada hecho preguntá «¿qué fue necesario para que pasara?» y cargá cada respuesta como hecho nuevo, eligiendo de cuál es antecedente. Ocasional: algo distinto de lo habitual. Permanente: así es siempre. Causa primaria: si se elimina, el siniestro no ocurre; las demás, secundarias.' : 'Cargá la lesión y las causas que encontraste; cada causa es antecedente de la lesión o de otra causa.') + '</p>' +
      hechosHtml + '<button class="btn sec" id="invMasH">+ Hecho</button>' +
      '<div style="margin-top:12px;border-top:1px solid #EEF2F4;padding-top:10px"><span class="mu peq">Cómo queda</span>' + invArbolHtml(r.h) + '</div></section>' +
    '<section class="card" style="margin-top:14px"><h2 style="margin:0 0 4px;font-size:16px">Medidas</h2><p class="mu peq" style="margin:0 0 10px">En orden de prioridad. Tienen que impedir que se repita, evitar siniestros parecidos y no sumar carga al trabajador. Primero eliminar o sustituir el peligro; después ingeniería, controles administrativos y, al final, EPP. El plazo no lo fija HyS: lo informa cada servicio por intermedio de la Dirección. Cuando lo cargues, la medida pasa a «En curso» y el sistema propone la verificación ' + esc(r.param.DIAS_VERIFICACION || 15) + ' días después.</p>' +
      medidasHtml + '<button class="btn sec" id="invMasM">+ Medida</button></section>' +
    '<section class="card" style="margin-top:14px"><h2 style="margin:0 0 4px;font-size:16px">Nota a la Dirección</h2><p class="mu peq" style="margin:0 0 10px">Se informa a la Dirección (empleador; Res. SRT 905/15, Anexo II, ítems 12 y 17) y, por su intermedio, se proponen las acciones a los servicios que correspondan y se les piden los plazos. Lleva el informe de investigación como anexo. Cuando la ingreses por Mesa de Entradas, cargá la fecha y guardá: las medidas propuestas pasan a «Comunicada».</p><div class="filtros">' +
      (r.inv && r.inv.NOTA_CODIGO ? '<span class="chip gr">Nota (' + esc(String(r.inv.NOTA_CODIGO).toLowerCase()) + ')</span>' : '<span class="mu peq">Todavía sin nota.</span>') + inp('MESA_ENTRADAS', 'Ingresó por Mesa de Entradas el', 200, 'date') + '</div></section>' +
    '<section class="card" style="margin-top:14px"><div class="filtros">' + area('CONCLUSION', 'Conclusión', 'Qué explica el siniestro y qué hay que cambiar') + area('OBSERVACIONES', 'Observaciones internas (no salen en la nota)', '') + '</div></section>' +
    '</div><div class="filtros" style="margin-top:14px;justify-content:flex-end"><a class="btn sec" href="#sin/' + encodeURIComponent(s.id) + '">Volver</a><button class="btn sec" id="invNota">Guardar y armar la nota</button><button class="btn pri" id="invGuardar">Guardar</button></div>');
  $('invMasH').onclick = () => { invLeer(); INVD.h.push({ ID: 'n' + (++INVN), HECHO: '', TIPO: 'Ocasional', CATEGORIA: 'Individuo', CAUSA: '', ANTECEDENTE_DE: INVD.h.length ? INVD.h[INVD.h.length - 1].ID : '' }); invPintar(); };
  $('invMasM').onclick = () => { invLeer(); INVD.m.push({ ID: 'n' + (++INVN), PRIORIDAD: INVD.m.length + 1, MEDIDA: '', NIVEL: '', RESPONSABLE: '', PLAZO: '', FECHA_VERIFICACION: '', VERIFICA: '', VERIFICADA: '', ESTADO: 'Propuesta', ID_HECHO: '' }); invPintar(); };
  document.querySelectorAll('[data-qh]').forEach(b => b.onclick = () => { invLeer(); const i = Number(b.dataset.qh), id = INVD.h[i].ID; INVD.h.splice(i, 1); INVD.h.forEach(h => { if (h.ANTECEDENTE_DE === id) h.ANTECEDENTE_DE = ''; }); INVD.m.forEach(m => { if (m.ID_HECHO === id) m.ID_HECHO = ''; }); invPintar(); });
  document.querySelectorAll('[data-qm]').forEach(b => b.onclick = () => { invLeer(); INVD.m.splice(Number(b.dataset.qm), 1); invPintar(); });
  $('iv_METODO').onchange = () => { invLeer(); invPintar(); };
  $('invGuardar').onclick = () => invGuardar(false);
  $('invNota').onclick = () => invGuardar(true);
}
async function invGuardar(nota) {
  invLeer();
  const s = INVD.siniestro, h = INVD.h.filter(x => String(x.HECHO || '').trim()), m = INVD.m.filter(x => String(x.MEDIDA || '').trim());
  if (INVD.v.ESTADO === 'Cerrada' && !h.length) return toast('Para cerrar la investigación cargá al menos la lesión y una causa.');
  if (nota && !m.length) return toast('La nota comunica medidas: cargá al menos una.');
  const bG = $('invGuardar'), bN = $('invNota'); bG.disabled = bN.disabled = true; (nota ? bN : bG).textContent = 'Guardando…';
  try {
    const r = await api('p_inv_guardar', { id: s.id, inv: INVD.v, hechos: h, medidas: m }, 120000);
    if (!r.ok) { toast(r.mensaje || 'No se pudo guardar.'); bG.disabled = bN.disabled = false; bG.textContent = 'Guardar'; bN.textContent = 'Guardar y armar la nota'; return; }
    SINP = null; invCargar(r);
    if (!nota) { invPintar(); return toast('Investigación guardada.'); }
    invPintar(); $('invNota').disabled = $('invGuardar').disabled = true; $('invNota').textContent = 'Armando la nota…';
    const n = await api('p_inv_nota', { id: s.id }, 240000);
    if (!n.ok) { toast(n.mensaje || 'No se pudo armar la nota.'); return invPintar(); }
    const r2 = await api('p_inv_abrir', { id: s.id }, 120000); if (r2.ok) invCargar(r2); invPintar();
    abrirOv('<h2 style="margin-top:0">Nota a la Dirección (borrador' + (n.revision ? ' · Rev. ' + n.revision : '') + ')</h2><p class="mu peq">Sin número: el N.º de nota interna lo da Mesa de Entradas al ingresarla; cargalo en el pie y en «Nota a la Dirección».</p><p>Quedó como borrador en MÓDULO 4 › Accidentes › ' + esc(s.est) + ' › año › Notas de medidas: la nota a la Dirección y, en hoja aparte, el informe de investigación. Revisala, completá lo que diga «s/d (revisar)», firmala e ingresala por Mesa de Entradas. Después cargá esa fecha en «Nota a la Dirección» y guardá; cuando cada servicio informe su plazo, cargalo en la medida.</p>' +
      '<div class="filtros"><a class="btn pri" href="' + esc(n.doc) + '" target="_blank" rel="noopener">Abrir la nota ↗</a><a class="btn sec" href="' + esc(n.pdf) + '" target="_blank" rel="noopener">PDF ↗</a><button class="btn sec" id="ovCerrar">Cerrar</button></div>');
  } catch (e) { try { invPintar(); } catch (er) {} }
}
function abrirOv(html) { const o = $('ov'); o.innerHTML = '<div class="panel" role="dialog" aria-modal="true">' + html + '</div>'; o.hidden = false; const c = $('ovCerrar'); if (c) c.onclick = () => { o.hidden = true; o.innerHTML = ''; }; }

// ------------------------------------------------------------------ Estadísticas de siniestros (Investigacion.gs)
let SEST = { per: 'anio', est: '', desde: '', hasta: '', r: null };
function sestPeriodo(p) {
  const h = new Date(), y = h.getFullYear(), m = h.getMonth(), iso = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), t = Math.floor(m / 3);
  if (p === 'anio') return [y + '-01-01', iso(h)];
  if (p === 'anioAnt') return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
  if (p === 'trim') return [iso(new Date(y, t * 3, 1)), iso(h)];
  if (p === 'trimAnt') { const a = t ? y : y - 1, tt = t ? t - 1 : 3; return [iso(new Date(a, tt * 3, 1)), iso(new Date(a, tt * 3 + 3, 0))]; }
  return [SEST.desde || y + '-01-01', SEST.hasta || iso(h)];
}
async function sinEst(fresco) {
  const [d, h] = sestPeriodo(SEST.per); SEST.desde = d; SEST.hasta = h;
  if (fresco || !SEST.r || SEST.r.desde !== d || SEST.r.hasta !== h || SEST.r._est !== SEST.est) {
    cargando('#sinest', 'Calculando…');
    try { const r = await api('p_sin_est', { desde: d, hasta: h, est: SEST.est }, 180000); if (!r.ok) return marco('#sinest', '<div class="card aviso error">' + esc(r.mensaje || 'No se pudo calcular.') + '</div>'); r._est = SEST.est; SEST.r = r; } catch (e) { return; }
  }
  const r = SEST.r, T = r.totales, I = r.indices, nf = v => v == null ? '<span class="mu" style="font-size:14px">s/d (revisar)</span>' : String(v).replace('.', ',');
  const kpi = (t, n, sub) => '<div class="kpi2"><span>' + t + '</span><b>' + n + '</b><small>' + sub + '</small></div>';
  const barras = (t, filas) => { const max = Math.max(1, ...filas.map(f => f[1])); return '<section class="card"><h3 style="margin:0 0 8px;font-size:14px">' + t + '</h3>' + (filas.length ? filas.slice(0, 12).map(f => '<div style="display:grid;grid-template-columns:minmax(120px,1.2fr) 2fr 34px;gap:8px;align-items:center;font-size:12.5px;margin:3px 0"><span>' + esc(f[0]) + '</span><span style="background:#EEF4F6;border-radius:4px;height:12px"><span style="display:block;height:12px;border-radius:4px;background:' + (/Sin investigar|s\/d/.test(f[0]) ? '#B9CED6' : '#5894A7') + ';width:' + Math.round(f[1] * 100 / max) + '%"></span></span><b style="text-align:right">' + f[1] + '</b></div>').join('') : '<div class="mu peq">Sin datos.</div>') + '</section>'; };
  const sel = (id, ops, val) => '<select class="c" id="' + id + '">' + ops.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
  const ests = Object.keys(r.trabajadores.por || {});
  marco('#sinest', '<div class="cab"><div><span class="mu peq">8 · Personal y RAR</span><h1>Estadísticas de siniestros</h1><span class="mu peq">' + fechaTxt(r.desde) + ' a ' + fechaTxt(r.hasta) + ' · ' + esc(r.ests.join(' y ')) + ' · ' + r.trabajadores.total + ' trabajadores</span></div>' +
    '<div class="filtros"><label class="f">Período' + sel('seP', [['anio', 'Este año'], ['trim', 'Trimestre actual'], ['trimAnt', 'Trimestre anterior'], ['anioAnt', 'Año anterior'], ['otro', 'Otras fechas']], SEST.per) + '</label>' +
      (SEST.per === 'otro' ? '<label class="f">Desde<input class="c" type="date" id="seD" value="' + esc(SEST.desde) + '"></label><label class="f">Hasta<input class="c" type="date" id="seH" value="' + esc(SEST.hasta) + '"></label>' : '') +
      '<label class="f">Establecimiento' + sel('seE', [['', 'Todos']].concat((SEST.est ? [SEST.est] : ests).map(e => [e, e])), SEST.est) + '</label><button class="btn sec" id="seAct">Actualizar</button></div></div>' +
    '<div class="tb5">' + kpi('Accidentes y enf. profesionales', T.atep, T.at + (T.at === 1 ? ' accidente · ' : ' accidentes · ') + T.ep + (T.ep === 1 ? ' enf. profesional · ' : ' enf. profesionales · ') + T.conBaja + ' con baja') + kpi('In itinere', T.itinere, T.diasItinere + ' días de baja (aparte)') +
      kpi('Días de baja (AT/EP)', T.diasBaja, T.enIlt + ' siguen en ILT') + kpi('Investigados', T.investigados + ' de ' + T.casos, T.cerrados + ' cerradas · ' + T.arbol + ' con árbol de causas') + '</div>' +
    '<div class="tb5" style="margin-top:14px">' + kpi('Índice de incidencia', nf(I.incidencia), 'casos AT/EP cada 1.000 trabajadores') + kpi('Índice de frecuencia', nf(I.frecuencia), 'casos con baja por millón de horas' + (r.horas ? ' (≈ ' + r.horas.toLocaleString('es-AR') + ' h)' : '')) +
      kpi('Índice de pérdida', nf(I.perdida), 'días de baja cada 1.000 trabajadores') + kpi('Duración media', nf(I.duracionMedia), 'días por caso con baja') + '</div>' +
    '<div class="tb3" style="margin-top:14px">' + barras('Forma', r.por.forma) + barras('Agente material', r.por.agente) + barras('Zona del cuerpo', r.por.zona) + barras('Naturaleza de la lesión', r.por.naturaleza) +
      barras('Servicio', r.por.servicio) + barras('Función', r.por.funcion) + barras('Lugar', r.por.sitio) + barras('Mes', r.por.mes) + barras('Día de la semana', r.por.dia) + barras('Franja horaria', r.por.franja) + barras('Antigüedad', r.por.antiguedad) + barras('Tipo', r.por.tipo) + '</div>' +
    '<section class="card" style="margin-top:14px"><h3 style="margin:0 0 8px;font-size:14px">Medidas</h3><div class="mu peq" style="margin-bottom:8px">' + r.medidas.total + ' propuestas · ' + r.medidas.cumplidas + ' cumplidas · <b style="color:' + (r.medidas.vencidas ? '#B3261E' : 'inherit') + '">' + r.medidas.vencidas + ' vencidas</b></div>' +
      (r.medidas.pendientes.length ? r.medidas.pendientes.map(m => '<div class="peq" style="margin:3px 0"><a href="#inv/' + encodeURIComponent(m.id) + '">' + esc(m.medida) + '</a> · ' + esc(m.responsable) + ' · venció el ' + fechaTxt(m.plazo) + ' · ' + esc(m.estado) + '</div>').join('') : '') + '</section>' +
    '<section class="card" style="margin-top:14px"><h3 style="margin:0 0 8px;font-size:14px">Siniestros del período (' + r.lista.length + ')</h3>' + (r.lista.length ? '<div style="overflow-x:auto"><table class="sinTab" style="width:100%;border-collapse:collapse"><thead><tr><th>Fecha</th><th>N.º</th><th>Tipo</th><th>Lugar · servicio</th><th>Estado</th><th>Días</th><th>Investigación</th></tr></thead><tbody>' +
      r.lista.map(s => '<tr class="cl" data-id="' + esc(s.id) + '"><td>' + fechaTxt(s.fecha) + '</td><td>' + esc(s.nro) + '</td><td>' + esc(s.tipo) + '</td><td>' + esc(s.est) + '<div class="mu peq">' + esc(s.servicio) + '</div></td><td>' + sinChip(s.estado) + '</td><td>' + (s.dias || 0) + '</td><td class="peq">' + esc(s.inv) + (s.metodo ? '<div class="mu">' + esc(s.metodo) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="mu">No hay siniestros en el período.</div>') + '</section>' +
    '<div class="mu peq" style="margin-top:12px">' + r.notas.map(esc).join('<br>') + '</div>');
  $('seP').onchange = e => { SEST.per = e.target.value; sinEst(); };
  $('seE').onchange = e => { SEST.est = e.target.value; sinEst(); };
  $('seAct').onclick = () => { if (SEST.per === 'otro') { SEST.desde = ($('seD') || {}).value || SEST.desde; SEST.hasta = ($('seH') || {}).value || SEST.hasta; } sinEst(true); };
  document.querySelectorAll('#main .sinTab tr.cl').forEach(tr => tr.onclick = () => { location.hash = '#sin/' + encodeURIComponent(tr.dataset.id); });
}
