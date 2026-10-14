// Portal HyS · 10 · Protección contra incendios (Incendio.gs) · versión 0 (14/10/2026)
// Inventario de extintores de la red Trelew y del HSST, vencimientos (carga y prueba hidráulica) y control mensual con 3 fotos
// obligatorias (panorámica con el entorno, marbete y N.º de inventario). Alarma: 3 meses sin control.
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let INCT = null, INCD = {}, INCF = { sitio: '', ver: 'todos', q: '' };
const INC_CARGA = { vencida: ['Vencida', 'er'], porvencer: ['Vence pronto', 'wa'], aldia: ['Al día', 'ok'], sd: ['Sin dato', 'gr'] };
const INC_CTRL = { aldia: ['Al día', 'ok'], atrasado: ['Más de 3 meses', 'er'], sin: ['Sin control', 'gr'] };
const incChip = (m, k, extra) => { const x = m[k] || ['s/d', 'gr']; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>' + (extra ? '<div class="mu peq">' + extra + '</div>' : ''); };
const incChipEst = e => '<span class="chip ' + (/^Operativo/.test(e) ? 'ok' : /Baja/.test(e) ? 'gr' : /^s\/d/.test(e || 's/d') ? 'gr' : 'er') + '">' + esc(e || 's/d (revisar)') + '</span>';
const incLink = (u, t) => u ? '<a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + ' ↗</a>' : '';
const incPend = e => /^pendiente/i.test(e.VERIFICACION || '');
const incNom = c => { const f = (RES && RES.filas || []).find(x => x.cod === c); return f ? f.nombre : c; };
function incNoInstalado(hash, r) {
  return marco(hash, '<div class="cab"><div><span class="mu peq">10 · Protección contra incendios</span><h1>Protección contra incendios</h1></div></div><div class="aviso ' + (r && r.instalado === false ? '' : 'error') + '">' + esc((r && (r.mensaje || r.error)) || 'No se pudo leer el módulo.') + '</div>' +
    (r && r.instalado === false ? '<section class="card"><h2>Cómo se instala</h2><ol class="peq"><li>En el editor de Apps Script del «Sistema HyS», elegí la función <b>construirModuloIncendio</b> y tocá «Ejecutar» (una sola vez).</li><li>Después elegí <b>importarExtintoresIncendio</b> y tocá «Ejecutar»: trae los extintores de la planilla «Inventario de Extintores».</li><li>Volvé acá y tocá «Actualizar».</li></ol></section>' : ''));
}

// ------------------------------------------------------------------ Tablero de la red
async function incTablero(fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!INCT || fresco) { cargando('#inc', 'Armando el tablero de incendio…'); try { INCT = await api('p_inc_tablero', { fresco: !!fresco }, 180000); } catch (e) { return; } }
  if (!INCT.ok) { const r = INCT; INCT = null; return incNoInstalado('#inc', r); }
  const T = INCT.totales, kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const grupos = {}; INCT.lugares.forEach(L => (grupos[L.cod] = grupos[L.cod] || []).push(L));
  const fila = L => { const r = L.r, h = '#incest/' + encodeURIComponent(L.cod) + '/' + encodeURIComponent(L.sitio);
    return '<tr class="cl" data-h="' + esc(h) + '"><td><b>' + esc(L.sitio) + '</b>' + (r.paraVerificar ? ' <span class="chip wa mini">' + r.paraVerificar + ' para verificar</span>' : '') + '<div class="mu peq">' + esc(L.tipo || '') + (L.obs ? ' · ' + esc(L.obs) : '') + '</div></td><td class="peq">' + esc(L.responsables || 's/d') + '</td>' +
      '<td>' + (r.total || '<span class="mu">Sin cargar</span>') + '</td>' +
      '<td>' + (r.cargaVencida ? '<span class="chip er">' + r.cargaVencida + '</span>' : r.total ? '<span class="mu">0</span>' : '—') + (r.porVencer ? ' <span class="chip wa mini">' + r.porVencer + ' por vencer</span>' : '') + (r.cargaSd ? ' <span class="chip gr mini">' + r.cargaSd + ' sin dato</span>' : '') + '</td>' +
      '<td>' + (r.conObs ? '<span class="chip er">' + r.conObs + '</span>' : r.total ? '<span class="mu">0</span>' : '—') + '</td>' +
      '<td>' + (L.ultimoControl ? fechaTxt(L.ultimoControl) : '<span class="mu">Nunca</span>') + (r.controlAtrasado ? ' <span class="chip er mini">' + r.controlAtrasado + ' con más de 3 meses</span>' : '') + '</td></tr>'; };
  const at = (INCT.avisos || []).map(a => ['<a class="at" href="' + (a.h || '#incest/' + encodeURIComponent(a.cod) + '/' + encodeURIComponent(a.sitio)) + '"><span class="tag ' + a.nivel + '">' + (a.nivel === 'er' ? 'Urgente' : a.nivel === 'wa' ? 'Pronto' : 'Aviso') + '</span><span><b>' + esc(a.sitio) + ': ' + esc(a.texto) + '</b><small>' + esc(incNom(a.cod)) + '</small></span></a>']);
  marco('#inc', '<div class="cab"><div><span class="mu peq">10 · Protección contra incendios</span><h1>Extintores de la red</h1><span class="mu peq">Inventario, vencimientos y control mensual (3 fotos por extintor). Red Trelew y HSST con sus CAPS · Dto. 351/79, cap. 18 y Anexo VII.</span></div>' +
    '<div class="filtros">' + incLink(INCT.libro, 'Planilla del módulo') + ' ' + incLink(INCT.carpeta, 'Carpeta de fotos') + '<button class="btn sec" id="icAct">Actualizar</button></div></div>' +
    '<div class="tb5">' + kpi('Extintores', T.total, 'en uso (sin contar bajas)') + kpi('Carga vencida', T.cargaVencida, T.porVencer + ' vencen en 30 días', T.cargaVencida ? 'var(--er)' : '') +
    kpi('Con observación', T.conObs, 'sobrecarga, recargar o fuera de servicio', T.conObs ? 'var(--er)' : '') + kpi('Controlados', T.controlAlDia, (T.sinControl + T.controlAtrasado) + ' sin control en los últimos 3 meses', (T.controlAtrasado) ? 'var(--wa)' : '') +
    kpi('Prueba hidráulica', T.pruebaVencida, (T.pruebaPorVencer ? T.pruebaPorVencer + ' vencen en 30 días · ' : '') + T.pruebaSd + ' sin dato (revisar)', T.pruebaVencida ? 'var(--er)' : '') + '</div>' +
    '<div class="tb2"><section class="card tabla" style="min-width:0"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Por lugar</h2><span class="mu peq">Tocá un lugar para ver sus extintores y cargar el control.</span></div><div style="overflow-x:auto"><table><thead><tr><th>Lugar</th><th>Controlan</th><th>Extintores</th><th>Carga vencida</th><th>Con observación</th><th>Último control</th></tr></thead><tbody>' +
    Object.keys(grupos).sort((a, b) => a === 'HMH' ? -1 : b === 'HMH' ? 1 : a.localeCompare(b)).map(c => '<tr><td colspan="6" style="background:var(--pa1);font-weight:700;color:var(--az)">' + esc(incNom(c)) + '</td></tr>' + grupos[c].map(fila).join('')).join('') +
    '</tbody></table></div></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:6px;min-width:0"><h2>Requiere atención</h2>' + (at.length ? at.slice(0, 20).join('') : '<div class="mu">Nada pendiente.</div>') +
    '<p class="mu peq" style="margin-top:8px">Extintores con problemas: un solo correo por día (6 h) con todos, a SOMI y Mantenimiento, y cada 3 días mientras queden sin resolver. <button class="link" id="icResumen">Mandar el correo ahora</button></p><p class="mu peq">Los vencimientos (carga y prueba hidráulica) avisan 30 días antes. El control es mensual; la alarma por falta de control aparece a los 3 meses. Los extintores nunca controlados avisan desde el 14/01/2027 (3 meses después de empezar el módulo).</p></section></div>');
  $('icAct').onclick = () => incTablero(true);
  $('icResumen').onclick = async () => { if (!confirm('¿Mandar ahora el correo con todos los extintores con problemas abiertos?')) return; const r = await api('p_inc_resumen', {}, 180000); toast(r.ok ? (r.enviados && r.enviados.length ? r.enviados.join(' · ') : 'No hay extintores con problemas para avisar.') : (r.mensaje || 'No se pudo mandar.')); };
  document.querySelectorAll('tr.cl[data-h]').forEach(tr => tr.onclick = () => location.hash = tr.dataset.h);
}

// ------------------------------------------------------------------ Extintores de un establecimiento (o de un lugar)
async function incEst(a, fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  const [cod, sitio] = String(a || '').split('/').map(decodeURIComponent);
  if (!cod) return location.hash = '#inc';
  if (sitio !== undefined) INCF.sitio = sitio || '';
  if (!INCD[cod] || fresco) { cargando('#incest', 'Abriendo los extintores de ' + incNom(cod) + '…'); try { INCD[cod] = await api('p_inc_detalle', { cod: cod }, 180000); } catch (e) { return; } }
  const D = INCD[cod]; if (!D.ok) { delete INCD[cod]; return incNoInstalado('#incest', D); }
  const q = sinTildesJs(INCF.q), L = D.extintores.filter(e => (!INCF.sitio || e.SITIO === INCF.sitio) && (INCF.ver === 'todos' || (INCF.ver === 'vencida' && e.est.carga === 'vencida') || (INCF.ver === 'verificar' && incPend(e)) || (INCF.ver === 'falla' && e.falla) || (INCF.ver === 'porvencer' && (e.est.carga === 'porvencer' || e.est.prueba === 'porvencer')) || (INCF.ver === 'obs' && e.est.conObs) || (INCF.ver === 'sinctl' && e.est.control !== 'aldia') || (INCF.ver === 'baja' && e.est.baja))
    && (!q || sinTildesJs([e.ID, e.NRO_EXTINTOR, e.NRO_INVENTARIO, e.SECTOR, e.UBICACION, e.PLANTA].join(' ')).indexOf(q) >= 0));
  const ult = id => D.controles.find(c => c.ID_EXTINTOR === id);
  const fila = e => { const c = ult(e.ID), i = D.extintores.indexOf(e);
    return '<tr><td><b>' + esc(e.NRO_EXTINTOR ? 'N.º ' + e.NRO_EXTINTOR : e.ID) + '</b><div class="mu peq">' + esc(e.ID) + (INCF.sitio ? '' : ' · ' + esc(e.SITIO)) + '</div></td>' +
      '<td>' + esc([e.PLANTA ? 'Planta ' + e.PLANTA.toLowerCase() : '', e.SECTOR].filter(Boolean).join(' · ')) + '<div class="mu peq">' + esc(e.UBICACION || '') + '</div></td>' +
      '<td>' + esc([e.TIPO, e.AGENTE].filter(Boolean).join(' · ') || 's/d') + '<div class="mu peq">' + esc(e.CAPACIDAD_KG ? e.CAPACIDAD_KG + ' kg' : '') + '</div></td>' +
      '<td class="peq">' + esc(e.NRO_INVENTARIO || 's/d') + '</td>' +
      '<td>' + incChip(INC_CARGA, e.est.carga, e.VTO_CARGA ? fechaTxt(e.VTO_CARGA) : '') + '</td>' +
      '<td>' + incChip(INC_CARGA, INC_CARGA[e.est.prueba] ? e.est.prueba : 'sd', /^\d{4}-/.test(e.PRUEBA_HIDRAULICA_VENCE || '') ? fechaTxt(e.PRUEBA_HIDRAULICA_VENCE) : '') + '</td>' +
      '<td>' + incChipEst(e.ESTADO) + '</td>' +
      '<td>' + incChip(INC_CTRL, e.est.control, e.ULTIMO_CONTROL ? fechaTxt(e.ULTIMO_CONTROL) + (e.RESULTADO_CONTROL ? ' · ' + esc(e.RESULTADO_CONTROL) : '') : '') +
        (c || e.FOTO_PANORAMICA ? '<div class="peq">' + [incLink(e.FOTO_PANORAMICA, 'Panorámica'), incLink(e.FOTO_MARBETE, 'Marbete'), incLink(e.FOTO_INVENTARIO, 'Inventario')].filter(Boolean).join(' · ') + '</div>' : '') + '</td>' +
      '<td class="peq" style="max-width:260px">' + esc(e.OBSERVACIONES || '') + (e.CAMBIOS ? '<div class="mu peq" style="margin-top:4px;white-space:pre-line" title="' + esc(e.CAMBIOS) + '"><b>Último cambio:</b> ' + esc(String(e.CAMBIOS).split('\n')[0]) + '</div>' : '') + '</td>' +
      '<td style="white-space:nowrap">' + (e.falla ? '<span class="chip er" title="' + esc(e.falla.PROBLEMAS || '') + '">Problema abierto desde ' + fechaTxt(e.falla.FECHA) + '</span><div class="mu peq" style="white-space:normal;max-width:220px">' + esc(e.falla.PROBLEMAS || '') + ' · ' + (e.falla.AVISOS || 0) + ' correo(s)</div><button class="btn pri" data-resol="' + i + '" style="margin:4px 0">Marcar resuelto</button><br>' : '') + (incPend(e) ? '<span class="chip wa">Para verificar</span><br><button class="btn pri" data-verif="' + esc(e.ID) + '" style="margin:4px 0">Verificar</button><br>' : '') +
        '<button class="btn pri" data-ctl="' + i + '">Control</button> <button class="btn sec" data-edit="' + i + '">Editar</button></td></tr>'; };
  const pend = L.filter(incPend);
  const ver = [['todos', 'Todos'], ['falla', 'Con problema abierto'], ['verificar', 'Para verificar'], ['vencida', 'Carga vencida'], ['porvencer', 'Vence en 30 días'], ['obs', 'Con observación'], ['sinctl', 'Sin control reciente'], ['baja', 'De baja']];
  marco('#incest', '<div class="cab"><div><span class="mu peq"><a class="link" href="#inc">10 · Protección contra incendios</a> › ' + esc(cod) + '</span><h1>' + esc(INCF.sitio || incNom(cod)) + '</h1><span class="mu peq">' +
    L.length + ' extintor(es) en la lista · ' + D.extintores.filter(e => e.est.carga === 'vencida' && (!INCF.sitio || e.SITIO === INCF.sitio)).length + ' con la carga vencida · controlan: ' + esc(((D.sitios.find(s => s.SITIO === INCF.sitio) || D.sitios[0] || {}).RESPONSABLES_CONTROL) || 's/d') + '</span></div>' +
    '<div class="filtros"><label class="f">Lugar<select class="c" id="icSit"><option value="">Todos los lugares</option>' + D.sitios.map(s => '<option' + (s.SITIO === INCF.sitio ? ' selected' : '') + '>' + esc(s.SITIO) + '</option>').join('') + '</select></label>' +
    '<label class="f">Ver<select class="c" id="icVer">' + ver.map(v => '<option value="' + v[0] + '"' + (v[0] === INCF.ver ? ' selected' : '') + '>' + v[1] + '</option>').join('') + '</select></label>' +
    '<label class="f">Buscar<input class="c" id="icQ" value="' + esc(INCF.q) + '" placeholder="N.º, inventario, sector"></label>' +
    (pend.length ? '<button class="btn pri" id="icVerTodo">Verificar los ' + pend.length + ' pendientes</button>' : '') + '<button class="btn sec" id="icNuevo">Agregar extintor</button><button class="btn sec" id="icAct">Actualizar</button></div></div>' +
    (pend.length ? '<div class="aviso">' + pend.length + (pend.length > 1 ? ' extintores fueron agregados o cambiados' : ' extintor fue agregado o cambiado') + ' desde la aplicación o MIPyV (nombre, lugar, planta, sector o ubicación). Revisalos: «Verificar» si está bien, o «Editar» para corregir (al guardar desde acá queda verificado).</div>' : '') +
    '<section class="card tabla"><div style="overflow-x:auto"><table><thead><tr><th>Extintor</th><th>Ubicación</th><th>Tipo</th><th>N.º inventario</th><th>Carga</th><th>Prueba hidráulica</th><th>Estado</th><th>Último control</th><th>Observaciones</th><th></th></tr></thead><tbody>' +
    (L.length ? L.map(fila).join('') : '<tr><td colspan="10" class="mu">' + (D.extintores.length ? 'Ningún extintor coincide con el filtro.' : 'Todavía no hay extintores cargados en este lugar. Usá «Agregar extintor».') + '</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">Control: 5 verificaciones y 3 fotos obligatorias (panorámica con el entorno, marbete y N.º de inventario). Todo se puede corregir también en la planilla del módulo.</p>');
  const recargar = () => incEst(encodeURIComponent(cod));
  $('icSit').onchange = e => { INCF.sitio = e.target.value; location.hash = '#incest/' + encodeURIComponent(cod) + '/' + encodeURIComponent(INCF.sitio); };
  $('icVer').onchange = e => { INCF.ver = e.target.value; recargar(); };
  $('icQ').onchange = e => { INCF.q = e.target.value; recargar(); };
  $('icAct').onclick = () => incEst(encodeURIComponent(cod), true);
  $('icNuevo').onclick = () => incExtForm(D, null);
  const verificar = async ids => { const r = await api('p_inc_verificar', { ids: ids }, 120000); if (!r.ok) return toast(r.mensaje || 'No se pudo verificar.'); incRecargar(D, r.verificados + (r.verificados === 1 ? ' extintor verificado.' : ' extintores verificados.')); };
  if ($('icVerTodo')) $('icVerTodo').onclick = () => verificar(pend.map(e => e.ID));
  document.querySelectorAll('[data-resol]').forEach(b => b.onclick = () => { const e = D.extintores[+b.dataset.resol];
    modal('Problema resuelto · ' + (e.NRO_EXTINTOR ? 'N.º ' + e.NRO_EXTINTOR : e.ID), [['RESOLUCION', 'Qué se hizo (opcional)', null, 1]], {}, async out => {
      const r = await api('p_inc_resolver', { ID_EXTINTOR: e.ID, RESOLUCION: out.RESOLUCION || '' }, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      incRecargar(D, 'Problema marcado como resuelto.' + (r.aviso ? ' ' + r.aviso : '')); return '';
    }, '<p class="mu peq" style="margin:0">Problemas: ' + esc(e.falla.PROBLEMAS || '') + '. Detectado el ' + fechaTxt(e.falla.FECHA) + ' por ' + esc(e.falla.DETECTO || 's/d') + '. Al marcarlo resuelto deja de ir en el correo y el cierre se avisa en el próximo correo.</p>'); });
  document.querySelectorAll('[data-verif]').forEach(b => b.onclick = () => { b.disabled = true; verificar([b.dataset.verif]); });
  document.querySelectorAll('[data-ctl]').forEach(b => b.onclick = () => incControlForm(D, D.extintores[+b.dataset.ctl]));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => incExtForm(D, D.extintores[+b.dataset.edit]));
}
function incRecargar(D, msg) { if (msg) toast(msg); INCT = null; TB = null; delete INCD[D.cod]; incEst(encodeURIComponent(D.cod), true); }

// ---------- Alta o corrección de un extintor. En el alta todo es obligatorio, también las 3 fotos (pedido de Belén 14/10/2026).
function incExtForm(D, e) {
  const L = D.listas, iso = v => /^\d{4}-\d{2}-\d{2}/.test(v || '') ? v.slice(0, 10) : '', fotos = {};
  const v = Object.assign({ ESTABLECIMIENTO: D.cod, SITIO: INCF.sitio || (D.sitios[0] || {}).SITIO, ESTADO: 'Operativo', PRUEBA_HIDRAULICA_VENCE: '' }, e || {});
  v.VTO_CARGA = iso(v.VTO_CARGA); const phTxt = /^s\/d/i.test(v.PRUEBA_HIDRAULICA_VENCE || ''); v.PRUEBA_HIDRAULICA_VENCE = iso(v.PRUEBA_HIDRAULICA_VENCE);
  modal(e ? 'Extintor ' + (e.NRO_EXTINTOR ? 'N.º ' + e.NRO_EXTINTOR : e.ID) : 'Agregar extintor', [['SITIO', 'Lugar', D.sitios.map(s => s.SITIO)], ['NRO_EXTINTOR', 'Nombre o N.º del extintor'], ['NRO_CHAPA', 'N.º de chapa'], ['PLANTA', 'Planta', L.plantas],
    ['SECTOR', 'Sector o servicio'], ['UBICACION', 'Ubicación (detalle)'], ['TIPO', 'Tipo', L.tipos], ['AGENTE', 'Agente extintor', L.agentes], ['CAPACIDAD_KG', 'Capacidad (kg)'], ['NRO_INVENTARIO', 'N.º de inventario'],
    ['VTO_CARGA', 'Vencimiento de la carga', 'date'], ['PRUEBA_HIDRAULICA_VENCE', 'Vencimiento de la prueba hidráulica', 'date'], ['ESTADO', 'Estado', L.estados], ['OBSERVACIONES', 'Observaciones', null, 1]], v,
    async out => {
      if (!out.SITIO) return 'Elegí el lugar.'; if (!out.TIPO) return 'Elegí el tipo de extintor.';
      if (!e) { const faltan = (L.requeridos || []).filter(r => !String(out[r[0]] || '').trim()).map(r => r[1]); if (faltan.length) return 'Falta completar: ' + faltan.join(', ') + '.';
        const sinF = L.fotos.filter(f => !fotos[f[0]]).map(f => f[1]); if (sinF.length) return 'Faltan las fotos: ' + sinF.join(', ') + '. Para agregar un extintor son obligatorias las 3.'; }
      if (!out.PRUEBA_HIDRAULICA_VENCE) out.PRUEBA_HIDRAULICA_VENCE = 's/d (revisar)';
      const r = await api('p_inc_ext_guardar', Object.assign({ ID: e ? e.ID : '', ESTABLECIMIENTO: D.cod, fotos: fotos }, out), 180000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      incRecargar(D, (e ? 'Extintor actualizado.' : 'Extintor agregado (' + r.id + ').') + (r.aviso ? ' Correo: ' + r.aviso : '')); return '';
    }, (e && e.CAMBIOS ? '<div class="card" style="margin:12px 0;padding:10px 14px"><b>Cambios anteriores</b><div class="mu peq" style="white-space:pre-line;max-height:140px;overflow:auto">' + esc(e.CAMBIOS) + '</div></div>' : '') +
      (e && incPend(e) ? '<p class="mu peq" style="margin:0 0 8px">Está pendiente de verificar: al guardar desde acá queda verificado.</p>' : '') +
      incFotosHtml(L, e ? 'Fotos (opcional: solo para reemplazar las que tiene)' : '3 fotos obligatorias') +
      '<p class="mu peq" style="margin:0">' + (e ? '' : 'Para agregar un extintor todos los datos son obligatorios (si no tiene N.º de inventario, escribí «s/d»). ') +
      (phTxt || !e ? 'Prueba hidráulica: si no la sabés, dejala vacía y queda «s/d (revisar)».' : '') + '</p>');
  incFotosOnchange(fotos);
}
// Entradas de las 3 fotos (panorámica con el entorno, marbete y N.º de inventario), para el alta y para el control
function incFotosHtml(L, titulo) {
  return '<div class="card" style="margin:12px 0;padding:12px 14px;background:var(--pa1)"><b>' + esc(titulo) + '</b><div class="campos" style="margin-top:8px">' +
    L.fotos.map(f => '<label class="f">' + esc(f[1]) + '<input class="c" type="file" accept="image/*" capture="environment" data-incfoto="' + f[0] + '"><span class="mu peq" id="if_' + f[0] + '">' + esc(f[2]) + '</span></label>').join('') + '</div></div>';
}
function incFotosOnchange(fotos) {
  document.querySelectorAll('#ov [data-incfoto]').forEach(inp => inp.onchange = async () => { const f = inp.files[0], k = inp.dataset.incfoto, msg = $('if_' + k); if (!f) return;
    try { if (!/^image\//.test(f.type)) throw new Error('Tiene que ser una foto.'); fotos[k] = await achicar(f); msg.textContent = 'Lista: ' + f.name; msg.style.color = 'var(--ok)'; } catch (x) { delete fotos[k]; msg.textContent = x.message || 'No se pudo leer la foto.'; msg.style.color = 'var(--er)'; } });
}

// ---------- Control mensual con 3 fotos obligatorias
function incControlForm(D, e) {
  const L = D.listas, fotos = {}, hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const campos = [['FECHA', 'Fecha del control', 'date']].concat(L.chequeos.map(c => [c[0], c[1], ['Sí', 'No']]), [['ESTADO', 'Estado del extintor (si cambió)', L.estados], ['VTO_CARGA', 'Vencimiento de la carga (tarjeta) · obligatorio', 'date'], ['PRUEBA_HIDRAULICA_VENCE', 'Vencimiento de la prueba hidráulica (si figura)', 'date'], ['OBSERVACIONES', 'Observaciones', null, 1]]);
  const extra = (L.problemas ? '<div class="card" style="margin:12px 0;padding:12px 14px"><b>¿Tiene algún problema?</b> <span class="mu peq">Marcá todos los que correspondan; si no tiene ninguno, no marques nada.' + (e.ESTABLECIMIENTO === 'HMH' ? ' En el HMH, si hay un problema o alguna verificación da «No», se avisa por correo a SOMI y a Mantenimiento.' : '') + '</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:4px 12px;margin-top:8px">' +
    L.problemas.map(p => '<label class="peq" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-incprob value="' + esc(p) + '">' + esc(p) + '</label>').join('') + '</div></div>' : '') + incFotosHtml(L, '3 fotos obligatorias') +
    '<p class="mu peq" style="margin:0">' + esc([e.ID, e.SITIO, e.SECTOR, e.UBICACION].filter(Boolean).join(' · ')) + ' · carga ' + (e.VTO_CARGA ? 'hasta ' + fechaTxt(e.VTO_CARGA) : 'sin dato') + '. Revisá los vencimientos contra la tarjeta y corregilos si no coinciden. Si alguna verificación da «No» o la carga está vencida, el control queda «Con observaciones» (y en el HMH se avisa por correo).</p>';
  modal('Control · ' + (e.NRO_EXTINTOR ? 'extintor N.º ' + e.NRO_EXTINTOR : e.ID), campos, { FECHA: hoy, VTO_CARGA: /^\d{4}-/.test(e.VTO_CARGA || '') ? e.VTO_CARGA.slice(0, 10) : '', PRUEBA_HIDRAULICA_VENCE: /^\d{4}-/.test(e.PRUEBA_HIDRAULICA_VENCE || '') ? e.PRUEBA_HIDRAULICA_VENCE.slice(0, 10) : '' }, async out => {
    if (!out.VTO_CARGA) return 'Completá el vencimiento de la carga (está en la tarjeta del extintor).';
    const faltan = L.chequeos.filter(c => !out[c[0]]).map(c => c[1]); if (faltan.length) return 'Falta responder: ' + faltan.join(', ') + '.';
    const sinF = L.fotos.filter(f => !fotos[f[0]]).map(f => f[1]); if (sinF.length) return 'Faltan las fotos: ' + sinF.join(', ') + '. Son obligatorias las 3.';
    const datos = Object.assign({ ID_EXTINTOR: e.ID, fotos: fotos, PROBLEMAS: Array.from(document.querySelectorAll('#ov [data-incprob]:checked')).map(x => x.value) }, out); if (!datos.ESTADO) delete datos.ESTADO; if (!datos.PRUEBA_HIDRAULICA_VENCE) delete datos.PRUEBA_HIDRAULICA_VENCE;
    const r = await api('p_inc_control', datos, 180000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    incRecargar(D, 'Control guardado: ' + r.resultado + '.' + (r.aviso ? ' Correo: ' + r.aviso : '')); return '';
  }, extra);
  incFotosOnchange(fotos);
}

// ------------------------------------------------------------------ Novedades y recorridas de seguridad (IncendioServicios.gs)
// Lo que informa Seguridad (MAREM) y el resto: recorridas con puntos en «No» (con foto) y novedades. HyS las ve y las marca resueltas.
let INCNP = null;
async function incNovPortal(fresco) {
  if (!INCNP || fresco) { cargando('#incnov', 'Leyendo las novedades…'); try { INCNP = await api('p_inc_novedades', {}, 120000); } catch (e) { return; } }
  if (!INCNP.ok) { const r = INCNP; INCNP = null; return incNoInstalado('#incnov', r); }
  const fila = (n, ab) => '<tr><td style="white-space:nowrap">' + fechaTxt(n.FECHA) + (n.HORA ? '<div class="mu peq">' + esc(n.HORA) + '</div>' : '') + '</td><td><b>' + esc(n.TIPO) + '</b><div class="mu peq">' + esc(n.ORIGEN || '') + (n.ID_EXTINTOR ? ' · ' + esc(n.ID_EXTINTOR) : '') + '</div></td>' +
    '<td>' + esc(n.ESTABLECIMIENTO) + ' · ' + esc(n.SECTOR) + '</td><td class="peq" style="max-width:280px">' + esc(n.DETALLE || '') + (n.FOTO ? '<div>' + incLink(n.FOTO, 'Foto') + '</div>' : '') + '</td><td class="peq">' + esc(n.QUIEN || '') + '</td>' +
    '<td>' + (ab ? '<button class="btn pri" data-nres="' + esc(n.ID) + '">Resuelta</button>' : '<span class="chip ok">Resuelta</span><div class="mu peq">' + fechaTxt(n.RESUELTO) + (n.RESOLUCION ? ' · ' + esc(n.RESOLUCION) : '') + (n.RESUELTO_POR ? ' · ' + esc(n.RESUELTO_POR) : '') + '</div>') + '</td></tr>';
  const tabla = (L, ab) => '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Qué</th><th>Dónde</th><th>Detalle</th><th>Quién</th><th></th></tr></thead><tbody>' + L.map(n => fila(n, ab)).join('') + '</tbody></table></div>';
  marco('#incnov', '<div class="cab"><div><span class="mu peq"><a class="link" href="#inc">10 · Protección contra incendios</a></span><h1>Novedades y recorridas</h1><span class="mu peq">Recorridas de seguridad y novedades (principio de incendio, alarma, uso de un extintor, salidas obstruidas…). Se avisan por correo solo a Higiene y Seguridad.</span></div>' +
    '<div class="filtros">' + incLink(INCNP.libro, 'Planilla del módulo') + '<button class="btn sec" id="inAct">Actualizar</button></div></div>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Abiertas (' + INCNP.abiertas.length + ')</h2></div>' + (INCNP.abiertas.length ? tabla(INCNP.abiertas, true) : '<p class="mu" style="padding:14px 18px">No hay novedades abiertas.</p>') + '</section>' +
    (INCNP.recorridas.length ? '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Últimas recorridas</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Sector</th><th>Resultado</th><th>Puntos en «No»</th><th>Quién</th></tr></thead><tbody>' +
      INCNP.recorridas.map(r => '<tr><td>' + fechaTxt(r.FECHA) + ' ' + esc(r.HORA || '') + '</td><td>' + esc(r.ESTABLECIMIENTO) + ' · ' + esc(r.SECTOR) + '</td><td><span class="chip ' + (/sin/i.test(r.RESULTADO) ? 'ok' : 'wa') + '">' + esc(r.RESULTADO) + '</span></td><td class="peq">' + esc(r.PUNTOS_NO || '—') + '</td><td class="peq">' + esc(r.QUIEN || '') + '</td></tr>').join('') + '</tbody></table></div></section>' : '') +
    (INCNP.resueltas.length ? '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Resueltas</h2></div>' + tabla(INCNP.resueltas, false) + '</section>' : ''));
  $('inAct').onclick = () => incNovPortal(true);
  document.querySelectorAll('[data-nres]').forEach(b => b.onclick = () => { const n = INCNP.abiertas.find(x => x.ID === b.dataset.nres);
    modal('Novedad resuelta · ' + n.TIPO, [['RESOLUCION', 'Qué se hizo (opcional)', null, 1]], {}, async out => { const r = await api('p_inc_nov_resolver', { ID: n.ID, RESOLUCION: out.RESOLUCION || '' }, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      INCNP = null; INCT = null; TB = null; toast('Novedad marcada como resuelta.'); incNovPortal(true); return ''; }, '<p class="mu peq" style="margin:0">' + esc(n.SECTOR + ' · ' + (n.DETALLE || '')) + '</p>'); });
}
