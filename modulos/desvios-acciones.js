// ------------------------------------------------------------------ 1 · Residuos › Desvíos: acciones y seguimiento (DesviosAcciones.gs, versión 0, 22/10/2026)
// Lo que registran los operarios de Star Union en el recorrido de retiro del HMH: cada desvío lleva una acción de HyS
// (nota al servicio, a Servicios Generales, a la jefatura, a Star Union, pedido de contenedores, capacitación, seguimiento,
// solo registro…) y se cierra cuando se verifica en el lugar que se corrigió. Las notas salen como BORRADOR en el registro de notas.
let DAC = null, DACF = { vista: 'actuar', q: '', sel: {} };
async function desvAcc(fresco) {
  if (!DAC || fresco) { cargando('#desvacc', 'Leyendo los desvíos del recorrido…'); try { DAC = await api('p_desv_listar', fresco ? { fresco: true } : {}, 120000); } catch (e) { return; } }
  const cab = '<div class="cab"><div><span class="mu peq"><a class="link" href="#res">1 · Residuos</a></span><h1>Desvíos: acciones y seguimiento</h1>' +
    '<span class="mu peq">Lo que registran los operarios de Star Union en el recorrido del HMH. Cada desvío lleva una acción tuya y se cierra cuando se verifica en el lugar que se corrigió.</span></div>';
  if (!DAC.ok) { const r = DAC; DAC = null; return marco('#desvacc', cab + '</div><div class="aviso error">' + esc((r && (r.mensaje || r.error)) || 'No se pudo leer.') + '</div>'); }
  const E = DAC.estados, L = DAC.desvios, R = DAC.resumen, F = DACF, q = F.q.toLowerCase();
  const enVista = d => F.vista === 'actuar' ? d.ESTADO === E.SIN : F.vista === 'seguimiento' ? d.ESTADO === E.SEG : F.vista === 'confirmar' ? d.ESTADO === E.OPER :
    F.vista === 'escalar' ? !!d.escalar : F.vista === 'cerrados' ? /^Cerrado/.test(d.ESTADO) : true;
  const vis = L.filter(d => enVista(d) && (!q || [d.ID, d.TIPOS, d.SERVICIO, d.UBICACION, d.DESCRIPCION, d.CAUSA, d.OPERARIO].join(' ').toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => (b.vencido - a.vencido) || String(a.VENCE || '9999').localeCompare(String(b.VENCE || '9999')) || String(b.FECHA).localeCompare(String(a.FECHA)));
  Object.keys(F.sel).forEach(k => { if (!vis.some(d => d.ID === k)) delete F.sel[k]; });
  const nSel = Object.keys(F.sel).length;
  const kpi = (v, t, n, s, col) => '<a class="kpi2" href="#" data-dv="' + v + '"' + (F.vista === v ? ' style="outline:2px solid var(--az)"' : '') + '><span>' + t + '</span><b' + (col && n ? ' style="color:' + col + '"' : '') + '>' + n + '</b><small>' + s + '</small></a>';
  const sugerida = d => /infectocontagiosa/i.test(d.AISLAMIENTO) ? 'Solo registro (no era un error)' : /^No había lugar/.test(d.CAUSA) ? 'Pedido de contenedores' : d.escalar ? 'Nota a mi jefe' : '';
  const peligroso = d => /biopat|cortopun|químic|medicam|ampoll/i.test(d.RESIDUO) || /cortopun/i.test(d.TIPOS) || d.LESION === 'Sí';
  const lk = (u, t) => '<a class="link" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + ' ↗</a>';
  const fila = d => {
    const abierto = !/^Cerrado/.test(d.ESTADO), sug = abierto && d.ESTADO === E.SIN ? sugerida(d) : '';
    const estado = d.ESTADO === E.SIN ? (d.vencido ? '<span class="tag er">Sin acción · vencido</span>' : '<span class="tag wa">Sin acción</span>')
      : d.ESTADO === E.SEG ? (d.vencido ? '<span class="tag er">Verificar · vencido</span>' : '<span class="tag">En seguimiento</span>')
      : d.ESTADO === E.OPER ? '<span class="tag wa">Operario: corregido</span>' : '<span class="tag ok">' + esc(d.ESTADO) + '</span>';
    return '<tr><td>' + (abierto ? '<input type="checkbox" data-sel="' + esc(d.ID) + '"' + (F.sel[d.ID] ? ' checked' : '') + ' aria-label="Marcar ' + esc(d.ID) + '">' : '') + '</td>' +
      '<td style="white-space:nowrap"><b>' + esc(d.ID) + '</b><div class="mu peq">' + fechaTxt(d.FECHA) + (d.HORA ? ' · ' + esc(d.HORA) : '') + '</div></td>' +
      '<td><b>' + esc(d.TIPOS) + '</b>' + (peligroso(d) ? ' <span class="tag er">Peligroso</span>' : '') + (/^No había lugar/.test(d.CAUSA) ? ' <span class="tag wa">Faltan contenedores</span>' : '') +
        (/infectocontagiosa/i.test(d.AISLAMIENTO) ? ' <span class="tag wa">Aislamiento infectocontagioso</span>' : '') + (d.escalar ? ' <span class="tag er" title="' + esc(d.escalar) + '">Evaluar escalar</span>' : '') +
        '<div class="mu peq">' + esc(d.RESIDUO || '') + ' · Gravedad: ' + esc(d.GRAVEDAD) + (d.GRAVEDAD_HYS ? ' (HyS)' : '') + '</div></td>' +
      '<td class="peq">' + esc([d.PISO, d.SERVICIO].filter(Boolean).join(' · ')) + '<div class="mu">' + esc(d.UBICACION + (d.DETALLE_UBICACION ? ' · ' + d.DETALLE_UBICACION : '')) + '</div></td>' +
      '<td class="peq" style="max-width:300px">' + esc(d.DESCRIPCION || '') + (d.CAUSA ? '<div><b>Por qué:</b> ' + esc(d.CAUSA) + (d.CONTENEDORES ? ' (' + esc(d.CONTENEDORES) + ')' : '') + '</div>' : '') +
        (d.AISLAMIENTO ? '<div><b>¿Aislamiento?</b> ' + esc(d.AISLAMIENTO) + '</div>' : '') + (d.FOTOS.length ? '<div>' + d.FOTOS.map((u, i) => lk(u, 'Foto ' + (i + 1))).join(' · ') + '</div>' : '') +
        '<div class="mu">' + esc(d.OPERARIO || '') + '</div></td>' +
      '<td class="peq">' + estado + (d.VENCE ? '<div class="mu">Vence: ' + fechaTxt(d.VENCE) + '</div>' : '') +
        d.ACCIONES.map(a => '<div>' + esc(fechaTxt(a.fecha) + ' · ' + a.tipo) + (a.destinatario && a.destinatario !== a.tipo ? ' · ' + esc(a.destinatario) : '') + (a.url ? ' · ' + lk(a.url, a.nota || 'Nota') : '') + '</div>').join('') +
        (d.ULTIMO_SEGUIMIENTO ? '<div class="mu">Verificación: ' + esc(d.ULTIMO_SEGUIMIENTO) + '</div>' : '') + (sug ? '<div class="mu">Sugerido: ' + esc(sug) + '</div>' : '') + '</td>' +
      '<td><div style="display:flex;flex-direction:column;gap:6px;min-width:96px">' + (d.ESTADO === E.OPER ? '<button class="btn pri peq" data-conf="' + esc(d.ID) + '">Confirmar</button> <button class="btn sec peq" data-noconf="' + esc(d.ID) + '">No</button>'
        : abierto ? '<button class="btn sec peq" data-uno="' + esc(d.ID) + '">Acción</button> <button class="btn sec peq" data-ver="' + esc(d.ID) + '">Verificar</button>' : '') +
        ' <button class="btn sec peq" data-cla="' + esc(d.ID) + '" title="Gravedad y origen según HyS">Clasificar</button></div></td></tr>';
  };
  marco('#desvacc', cab + '<div class="filtros"><a class="btn sec" href="' + esc(DAC.planilla) + '" target="_blank" rel="noopener">Planilla ↗</a><button class="btn sec" id="dvAct">Actualizar</button></div></div>' +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
      kpi('actuar', 'PARA ACTUAR', R.sinAccion, 'sin acción tuya' + (R.vencidos ? ' · ' + R.vencidos + ' vencidos en total' : ''), '#B4361F') +
      kpi('seguimiento', 'EN SEGUIMIENTO', R.seguimiento, 'verificar en el lugar') + kpi('confirmar', 'A CONFIRMAR', R.confirmar, 'los operarios dicen que se corrigió', '#8A5200') +
      kpi('escalar', 'EVALUAR ESCALAR', R.escalar, 'se repiten o persisten', '#B4361F') + kpi('cerrados', 'CERRADOS', R.cerrados, 'corregidos o sin acción') + kpi('todos', 'TODOS', L.length, 'registrados') + '</div>' +
    '<div class="filtros" style="margin:12px 0;align-items:flex-end"><label class="f">Buscar<input class="c" id="dvQ" value="' + esc(F.q) + '" placeholder="Código, servicio, palabra"></label>' +
      '<button class="btn pri" id="dvAcc"' + (nSel ? '' : ' disabled') + '>Tomar acción con los marcados (' + nSel + ')</button>' +
      '<button class="btn sec" id="dvVer"' + (nSel ? '' : ' disabled') + '>Verificar los marcados</button></div>' +
    '<section class="card tabla"><div style="overflow-x:auto"><table><thead><tr><th><input type="checkbox" id="dvTodos" aria-label="Marcar todos"></th><th>Registro</th><th>Desvío</th><th>Lugar</th><th>Detalle</th><th>Gestión</th><th></th></tr></thead><tbody>' +
      (vis.length ? vis.map(fila).join('') : '<tr><td colspan="7" class="mu">No hay desvíos en esta vista.</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">Plazos según la gravedad (hoja PLAZOS de la planilla): para tomar la acción, desde que se registró; para verificar, desde la acción. Las notas salen como <b>borrador</b> en «Notas enviadas y recibidas»: revisalas y envialas vos. ' +
      'Melani y los operarios también verifican (lo de los operarios queda «A confirmar»). Si un lugar acumula desvíos o uno persiste, aparece «Evaluar escalar».</p>');
  const re = () => { const y = window.scrollY; desvAcc(); window.scrollTo(0, y); };
  $('dvAct').onclick = () => { DAC = null; desvAcc(true); };
  document.querySelectorAll('[data-dv]').forEach(a => a.onclick = e => { e.preventDefault(); F.vista = a.dataset.dv; F.sel = {}; desvAcc(); });
  $('dvQ').onchange = () => { F.q = $('dvQ').value.trim(); re(); };
  document.querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { if (c.checked) F.sel[c.dataset.sel] = 1; else delete F.sel[c.dataset.sel]; re(); });
  $('dvTodos').onchange = () => { vis.filter(d => !/^Cerrado/.test(d.ESTADO)).forEach(d => { if ($('dvTodos').checked) F.sel[d.ID] = 1; else delete F.sel[d.ID]; }); re(); };
  $('dvAcc').onclick = () => desvAccModal(Object.keys(F.sel));
  $('dvVer').onclick = () => desvVerModal(Object.keys(F.sel));
  document.querySelectorAll('[data-uno]').forEach(b => b.onclick = () => desvAccModal([b.dataset.uno]));
  document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => desvVerModal([b.dataset.ver]));
  document.querySelectorAll('[data-conf],[data-noconf]').forEach(b => b.onclick = async () => {
    const si = !!b.dataset.conf, id = b.dataset.conf || b.dataset.noconf; b.disabled = true;
    const r = await api('p_desv_confirmar', { id: id, confirmar: si }, 120000);
    if (!r.ok) { b.disabled = false; return toast(r.mensaje || 'No se pudo guardar.'); }
    toast(si ? 'Confirmado: desvío cerrado.' : 'Vuelve a seguimiento.'); DAC = null; TB = null; desvAcc(true); });
  document.querySelectorAll('[data-cla]').forEach(b => b.onclick = () => { const d = L.find(x => x.ID === b.dataset.cla);
    modal('Clasificar ' + d.ID, [['gravedad', 'Gravedad según HyS', ['Baja', 'Media', 'Alta', 'Crítica']], ['origen', 'Origen según HyS', { lista: ['Servicio generador', 'Circuito de retiro (Star Union)', 'Faltan contenedores (capacidad del punto)', 'Estado o reposición del contenedor', 'Frecuencia de retiro interno', 'Disposición en el servicio', 'No era un desvío'] }]],
      { gravedad: d.GRAVEDAD_HYS, origen: d.ORIGEN_HYS || d.ORIGEN_SUGERIDO }, async out => {
        const r = await api('p_desv_clasificar', { id: d.ID, gravedad: out.gravedad, origen: out.origen }, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
        toast('Clasificación guardada.'); DAC = null; desvAcc(true); return ''; },
      '<p class="mu peq" style="margin:0">La gravedad define los plazos. Si no la clasificás, se usa la del operario.</p>'); });
}

// Tomar una acción con uno o varios desvíos
function desvAccModal(ids) {
  if (!ids.length) return;
  const L = DAC.desvios.filter(d => ids.indexOf(d.ID) >= 0), T = DAC.tipos, servicios = Array.from(new Set(L.map(d => d.SERVICIO)));
  const m = modal('Acción · ' + ids.length + ' desvío(s)', [
    ['tipo', 'Qué hacés', T.map(t => t.tipo)],
    ['destinatario', 'Destinatario (de la lista de notas)', { lista: servicios.concat(DAC.destinatarios) }],
    ['nro', 'N.º de nota («Próximo», «s/n» o un número)', { lista: ['Próximo', 's/n'] }],
    ['asunto', 'Asunto (si queda vacío, lo arma el sistema)'],
    ['fundamento', 'Fundamento normativo en la nota', ['Sí', 'No']],
    ['motivo', '«Me dirijo a usted… a fin de…»', null, 1],
    ['pedido', 'Qué se solicita (un punto por línea)', null, 1],
    ['detalle', 'Detalle o fecha prevista (queda en ACCIONES)', null, 1]
  ], { fundamento: 'Sí' }, async out => {
    const t = T.find(x => x.tipo === out.tipo); if (!t) return 'Elegí qué hacés.';
    const r = await api('p_desv_accion', { ids: ids, tipo: out.tipo, destinatario: out.destinatario, nro: out.nro, asunto: out.asunto, fundamento: out.fundamento !== 'No',
      motivo: out.motivo, pedido: String(out.pedido || '').split('\n').map(s => s.trim()).filter(Boolean).join(' | '), detalle: out.detalle }, 240000);
    if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    DAC = null; TB = null; DACF.sel = {};
    const notas = r.hechas.filter(h => h.nota);
    await desvAcc(true);
    if (notas.length) setTimeout(() => { const v = modal('Listo', [], {}, async () => '', '<p>Se guardó la acción. ' + (notas.length > 1 ? 'Borradores' : 'Borrador') + ' de nota (revisalo y envialo vos):</p><ul>' +
      notas.map(h => '<li><a class="link" href="' + esc(h.nota.url) + '" target="_blank" rel="noopener">' + esc(h.nota.codigo + ' · ' + h.destinatario) + ' ↗</a> <span class="mu peq">(' + esc(h.desvios.join(', ')) + ')</span>' + (h.nota.aviso ? '<div class="aviso error">' + esc(h.nota.aviso) + '</div>' : '') + '</li>').join('') + '</ul>');
      $('mOk').textContent = 'Cerrar'; $('mOk').onclick = v.cerrar; $('mCan').hidden = true; }, 50);
    else toast('Acción guardada.');
    return '';
  }, '<p class="mu peq" style="margin:0">' + esc(L.map(d => d.ID + ' · ' + d.SERVICIO).join(' · ')) + '</p><div id="dvAyuda" class="mu peq"></div>');
  const sel = document.querySelector('#ov [data-k="tipo"]'), set = (k, v) => { const e = document.querySelector('#ov [data-k="' + k + '"]'); if (e) e.value = v || ''; };
  const caja = k => document.querySelector('#ov [data-k="' + k + '"]').closest('label');
  const mostrar = () => { const t = T.find(x => x.tipo === sel.value) || {};
    ['destinatario', 'nro', 'asunto', 'fundamento', 'motivo', 'pedido'].forEach(k => caja(k).hidden = !t.nota);
    caja('destinatario').hidden = !t.nota && !/servicio/i.test(t.destinatario || '');
    set('destinatario', /\(servicio del lugar\)/i.test(t.destinatario || '') ? (servicios.length === 1 ? servicios[0] : '') : t.destinatario);
    set('nro', t.numero || 'Próximo'); set('motivo', t.motivo); set('pedido', String(t.pedido || '').split('|').map(s => s.trim()).filter(Boolean).join('\n'));
    $('dvAyuda').textContent = (t.ayuda || '') + (/\(servicio del lugar\)/i.test(t.destinatario || '') && servicios.length > 1 ? ' Marcaste desvíos de ' + servicios.length + ' servicios: si dejás el destinatario vacío, se arma una nota por servicio.' : ''); };
  sel.onchange = mostrar;
  const sug = L.length === 1 ? (/infectocontagiosa/i.test(L[0].AISLAMIENTO) ? 'Solo registro (no era un error)' : /^No había lugar/.test(L[0].CAUSA) ? 'Pedido de contenedores' : L[0].escalar ? 'Nota a mi jefe' : '') : '';
  if (sug && T.some(t => t.tipo === sug)) sel.value = sug;
  mostrar();
}

// Verificación en el lugar: corregido (cierra) o persiste (sigue en seguimiento)
function desvVerModal(ids) {
  if (!ids.length) return;
  modal('Verificación en el lugar · ' + ids.length + ' desvío(s)', [['resultado', '¿Cómo estaba?', ['Corregido', 'Persiste']], ['obs', 'Observaciones (opcional)', null, 1]], {}, async out => {
    if (!out.resultado) return 'Elegí si se corrigió o si persiste.';
    const r = await api('p_desv_seguimiento', { ids: ids, resultado: out.resultado, obs: out.obs }, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    DAC = null; TB = null; DACF.sel = {}; toast(out.resultado === 'Corregido' ? 'Cerrado como corregido.' : 'Sigue en seguimiento.'); desvAcc(true); return '';
  }, '<p class="mu peq" style="margin:0">' + esc(ids.join(', ')) + '. «Corregido» cierra el desvío. «Persiste» lo deja en seguimiento con un plazo nuevo y sugiere escalar.</p>');
}
