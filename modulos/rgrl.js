// Portal HyS · 6 · Servicios e infraestructura › RGRL y Mediciones (Rgrl.gs) · versión 0 (14/10/2026)
// RGRL: el Relevamiento General de Riesgos Laborales tal cual el Anexo I de la Res. SRT 463/09 (formulario A general, Dto. 351/79):
// datos generales, 161 condiciones a cumplir (Sí · No · No aplica, fecha de regularización, normativa), planillas A, B y C, gremios,
// contratistas y responsable. Uno por establecimiento o sitio; se actualiza una vez al año.
// Mediciones: puesta a tierra (Res. SRT 900/15), iluminación (Res. SRT 84/12), ruido (Res. SRT 85/12) y otras, con vencimiento;
// vencidas o que vencen en 30 días = urgentes; recordatorio por correo los jueves 7 h.
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let RG = null, RGF = null, RGL = { cod: '', est: '' };
const RG_VTO = { vigente: ['Vigente', 'ok'], porvencer: ['Urgente: vence en menos de 30 días', 'er'], vencida: ['Vencida', 'er'], sd: ['Sin fecha', 'gr'] };
const rgChip = (e, f) => { const x = RG_VTO[e] || RG_VTO.sd; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>' + (f ? '<div class="mu peq">' + (e === 'vencida' ? 'venció ' : 'vence ') + fechaTxt(f) + '</div>' : ''); };
const rgNom = c => { const f = (RES && RES.filas || []).find(x => x.cod === c); return f ? f.nombre : c; };
const rgCab = (t, sub, extra) => '<div class="cab"><div><span class="mu peq">6 · Servicios e infraestructura</span><h1>' + t + '</h1>' + (sub ? '<span class="mu peq">' + sub + '</span>' : '') + '</div><div class="filtros">' + (extra || '') + '<button class="btn sec" id="rgAct">Actualizar</button></div></div>';
async function rgCargar(ruta, fresco) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  if (!RG || fresco) { cargando(ruta, 'Leyendo RGRL y mediciones…'); try { RG = await api('p_rgrl_datos', {}, 180000); } catch (e) { return false; }
    if (!RG.ok) { marco(ruta, '<div class="aviso error">' + esc(RG.mensaje || RG.error || 'No se pudo leer.') + ' (¿está instalado Rgrl.gs en el Sistema HyS?)</div>'); RG = null; return false; } }
  return true;
}

// ------------------------------------------------------------------ RGRL: lista
async function rgrlLista(a) {
  if (a) return rgrlForm(a);
  if (!await rgCargar('#rgrl')) return;
  const L = RG.rgrl.slice().sort((x, y) => (rgNom(x.ESTABLECIMIENTO) + x.LUGAR).localeCompare(rgNom(y.ESTABLECIMIENTO) + y.LUGAR) || String(y.FECHA).localeCompare(String(x.FECHA)));
  const n161 = RG.items.length, res = {}; RG.resumen.forEach(r => res[r.id] = r);
  marco('#rgrl', rgCab('RGRL · Relevamiento General de Riesgos Laborales', 'Formulario del Anexo I de la Res. SRT 463/09 (Dto. 351/79): uno por establecimiento o sitio, con carácter de declaración jurada; se actualiza una vez al año.', '<a class="link" href="' + esc(RG.libro) + '" target="_blank" rel="noopener">Planilla ↗</a>') +
    '<section class="card"><h2>Nuevo relevamiento</h2><div class="filtros"><label class="f">Establecimiento<select class="c" id="rgE">' + selectorEst(RGL.est, false) + '</select></label><label class="f">Lugar (edificio, CAPS, sede…)<select class="c" id="rgL"><option value="">Elegí primero el establecimiento</option></select></label><button class="btn pri" id="rgN">Empezar</button></div>' +
    '<p class="mu peq" style="margin:8px 0 0">Si ya hay uno de ese lugar, conviene abrirlo y «Copiar para este año»: trae las respuestas del anterior para revisarlas.</p></section>' +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Relevamientos cargados (' + L.length + ')</h2></div><div style="overflow-x:auto"><table><thead><tr><th>Establecimiento y lugar</th><th>Fecha</th><th>Vigencia</th><th>Estado</th><th>Contestadas</th><th>«No»</th></tr></thead><tbody>' +
    (L.length ? L.map(r => { const s = res[r.ID]; return '<tr class="cl" data-id="' + esc(r.ID) + '"><td><b>' + esc(rgNom(r.ESTABLECIMIENTO)) + '</b><div class="mu peq">' + esc(r.LUGAR) + '</div></td><td>' + fechaTxt(r.FECHA) + '</td><td>' + rgChip(r.estadoVto, r.VENCE) + '</td><td>' + esc(r.ESTADO) + '</td><td>' + (s ? s.contestadas : '—') + ' de ' + n161 + '</td><td>' + (s && s.no ? '<span class="chip ' + (s.noVencidas ? 'er' : 'wa') + '">' + s.no + (s.noVencidas ? ' · ' + s.noVencidas + ' con fecha vencida' : '') + '</span>' : '—') + '</td></tr>'; }).join('')
      : '<tr><td colspan="6" class="mu">Todavía no hay relevamientos. Elegí el establecimiento y el lugar arriba.</td></tr>') + '</tbody></table></div></section>' +
    '<p class="mu peq">Res. SRT 463/09, Anexo I: el relevamiento se completa en todos sus campos para cada establecimiento y se actualiza anualmente. Las condiciones en «No» llevan fecha de regularización y pasan al plan de acción.</p>');
  $('rgAct').onclick = () => { RG = null; rgrlLista(); };
  const lugares = async cod => { const s = $('rgL'); s.innerHTML = '<option>Leyendo…</option>'; try { const r = await api('p_rgrl_lugares', { cod: cod }); s.innerHTML = (r.lugares || [cod]).map(l => '<option>' + esc(l) + '</option>').join(''); } catch (e) { s.innerHTML = '<option>' + esc(cod) + '</option>'; } };
  $('rgE').onchange = e => { RGL.est = e.target.value; if (RGL.est) lugares(RGL.est); };
  if (RGL.est) lugares(RGL.est);
  $('rgN').onclick = () => { const cod = $('rgE').value, lug = $('rgL').value; if (!cod) return toast('Elegí el establecimiento.');
    RGF = { nuevo: true, d: { ESTABLECIMIENTO: cod, LUGAR: lug || cod, FECHA: new Date().toISOString().slice(0, 10), ESTADO: 'Borrador', PROVINCIA: 'Chubut', EMPRESA: rgNom(cod) }, r: {}, p: { A: [], B: [], C: [] } }; location.hash = '#rgrl/nuevo'; };
  document.querySelectorAll('tr.cl[data-id]').forEach(tr => tr.onclick = () => location.hash = '#rgrl/' + encodeURIComponent(tr.dataset.id));
}

// ------------------------------------------------------------------ RGRL: formulario
async function rgrlForm(id) {
  if (!await rgCargar('#rgrl')) return;
  if (id === 'nuevo') { if (!RGF || !RGF.nuevo) { location.hash = '#rgrl'; return; } }
  else if (!RGF || RGF.id !== id) { cargando('#rgrl', 'Abriendo el relevamiento…'); let D; try { D = await api('p_rgrl_detalle', { id: id }, 120000); } catch (e) { return; }
    if (!D.ok) return marco('#rgrl', '<div class="aviso error">' + esc(D.mensaje || 'No se encontró.') + '</div>'); RGF = { id: id, d: D.rgrl, r: D.respuestas, p: D.planillas }; }
  const F = RGF, d = F.d, it = RG.items, sec = RG.secciones, n = Object.keys(F.r).filter(k => F.r[k] && F.r[k].r).length;
  const inp = (k, t, tipo) => '<label class="f">' + esc(t) + '<input class="c" data-g="' + k + '"' + (tipo ? ' type="' + tipo + '"' : '') + ' value="' + esc(tipo === 'date' ? String(d[k] || '').slice(0, 10) : (d[k] || '')) + '"></label>';
  const fila = x => { const a = F.r[x[0]] || {}, b = v => '<button type="button" class="btn ' + (a.r === v ? (v === 'No' ? 'pri" style="background:var(--er);border-color:var(--er)' : 'pri') : 'sec') + '" data-rn="' + x[0] + '" data-rv="' + v + '" style="min-height:30px;padding:4px 10px">' + v + '</button>';
    return '<div class="rg-it" id="rgi' + x[0] + '" style="border-top:1px solid var(--ln);padding:10px 0;display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px"><b style="color:var(--az2,#5894A7)">' + x[0] + '</b><div><div>' + esc(x[2]) + '</div><div class="mu peq">' + esc(x[3] || '') + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center">' + b('Sí') + b('No') + b('No aplica') +
      (a.r === 'No' ? '<label class="peq">Fecha de regularización <input class="c" type="date" data-rf="' + x[0] + '" value="' + esc(String(a.f || '').slice(0, 10)) + '" style="min-height:30px"></label>' : '') +
      '<input class="c" data-ro="' + x[0] + '" placeholder="Observación (opcional)" value="' + esc(a.o || '') + '" style="min-height:30px;flex:1;min-width:160px"></div></div></div>'; };
  const cuerpoSec = sec.map((s, i) => { const L = it.filter(x => x[1] === i), c = L.filter(x => F.r[x[0]] && F.r[x[0]].r).length, no = L.filter(x => F.r[x[0]] && F.r[x[0]].r === 'No').length;
    return '<details class="card" style="padding:12px 16px"' + (F.abierta === i ? ' open' : '') + ' data-sec="' + i + '"><summary style="cursor:pointer;font-weight:700">' + esc(s.charAt(0) + s.slice(1).toLowerCase()) + ' <span class="mu peq">· ' + L[0][0] + ' a ' + L[L.length - 1][0] + ' · ' + c + ' de ' + L.length + (no ? ' · <span style="color:var(--er)">' + no + ' «No»</span>' : '') + '</span></summary>' + L.map(fila).join('') + '</details>'; }).join('');
  const pla = k => { const P = RG.planillas[k]; return '<details class="card" style="padding:12px 16px"><summary style="cursor:pointer;font-weight:700">' + esc(P.titulo) + ' <span class="mu peq">· ' + (F.p[k] || []).length + ' marcada(s)</span></summary><p class="mu peq">Marcar en caso afirmativo.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:4px 12px">' +
    P.lista.map(s => '<label class="peq" style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" data-pk="' + k + '" value="' + esc(s[0]) + '"' + ((F.p[k] || []).indexOf(s[0]) >= 0 ? ' checked' : '') + '><span><b>' + esc(s[0]) + '</b> ' + esc(s[1]) + (s[2] ? ' <span class="mu">(umbral ' + esc(s[2]) + ' t)</span>' : '') + '</span></label>').join('') + '</div></details>'; };
  marco('#rgrl', '<div class="cab"><div><span class="mu peq"><a class="link" href="#rgrl">RGRL</a> › ' + esc(d.ESTABLECIMIENTO) + '</span><h1>' + esc(rgNom(d.ESTABLECIMIENTO)) + (d.LUGAR && d.LUGAR !== d.ESTABLECIMIENTO ? ' · ' + esc(d.LUGAR) : '') + '</h1><span class="mu peq">Anexo I, Res. SRT 463/09 · formulario A general (Dto. 351/79) · ' + n + ' de ' + it.length + ' condiciones contestadas</span></div>' +
    '<div class="filtros">' + (F.id ? '<button class="btn sec" id="rgCopia">Copiar para este año</button>' : '') + '<button class="btn sec" id="rgVolver">Volver</button></div></div>' +
    '<section class="card"><h2>Datos generales del establecimiento</h2><div class="campos">' + inp('FECHA', 'Fecha del relevamiento', 'date') + '<label class="f">Estado<select class="c" data-g="ESTADO">' + RG.estadosRel.map(e => '<option' + (e === d.ESTADO ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></label>' +
    inp('N_ESTABLECIMIENTO', 'N.º de establecimiento') + inp('EMPRESA', 'Nombre de la empresa') + inp('CUIT', 'CUIT / CUIP N.º') + inp('ACTIVIDAD_REV3', 'Actividad económica (Rev. 3)') + inp('DOMICILIO', 'Domicilio completo') + inp('CP', 'C.P. / C.P.A.') + inp('LOCALIDAD', 'Localidad') + inp('PROVINCIA', 'Provincia') + inp('TRABAJADORES', 'Cantidad de trabajadores', 'number') + inp('SUPERFICIE_M2', 'Superficie del establecimiento (m²)', 'number') + '</div></section>' +
    '<h2 style="margin:18px 0 8px">Estado de cumplimiento de la normativa vigente (Dto. 351/79)</h2><p class="mu peq" style="margin-top:0">Tocá Sí, No o No aplica en cada condición; tocá de nuevo para borrar. Con «No», cargá la fecha de regularización.</p>' + cuerpoSec +
    '<h2 style="margin:18px 0 8px">Planillas</h2>' + pla('A') + pla('B') + pla('C') +
    '<section class="card"><h2>Gremios, contratistas y responsable del formulario</h2><div class="campos">' + inp('GREMIOS', 'Delegados gremiales: N.º de legajo y nombre del gremio') + inp('CONTRATISTAS', 'CUIT de contratistas (separados por coma)') + inp('RESPONSABLE', 'Profesional o responsable: nombre y apellido') + inp('CUIL_RESPONSABLE', 'CUIT / CUIL / CUIP') + inp('CARGO_RESPONSABLE', 'Cargo (H · M · R), representación y propio o contratado') + inp('TITULO_MATRICULA', 'Título habilitante, N.º de matrícula y entidad') +
    '<label class="f ancho">Observaciones<textarea class="c" data-g="OBSERVACIONES">' + esc(d.OBSERVACIONES || '') + '</textarea></label></div><p class="mu peq">Declaración jurada: el responsable firmante declara que los datos consignados son correctos y completos (Res. SRT 463/09, Anexo I).</p></section>' +
    '<div class="barra-acc" style="position:sticky;bottom:0;background:var(--bg,#fff);padding:10px 0;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid var(--ln)"><span class="mu peq" id="rgMsg" style="margin-right:auto;align-self:center"></span><button class="btn sec" id="rgGuardar">Guardar</button><button class="btn pri" id="rgCompleto">Guardar como completo</button></div>');
  const leer = () => { document.querySelectorAll('[data-g]').forEach(el => d[el.dataset.g] = el.value); document.querySelectorAll('[data-rf]').forEach(el => { const k = el.dataset.rf; if (F.r[k]) F.r[k].f = el.value; });
    document.querySelectorAll('[data-ro]').forEach(el => { const k = el.dataset.ro; if (el.value || F.r[k]) { F.r[k] = F.r[k] || {}; F.r[k].o = el.value; } });
    ['A', 'B', 'C'].forEach(k => F.p[k] = Array.from(document.querySelectorAll('[data-pk="' + k + '"]:checked')).map(c => c.value)); };
  document.querySelectorAll('details[data-sec]').forEach(dt => dt.ontoggle = () => { if (dt.open) F.abierta = +dt.dataset.sec; });
  document.querySelectorAll('[data-rn]').forEach(b => b.onclick = () => { leer(); const k = b.dataset.rn, v = b.dataset.rv; F.r[k] = F.r[k] || {}; F.r[k].r = F.r[k].r === v ? '' : v; const y = window.scrollY; rgrlForm(id); window.scrollTo(0, y); });
  $('rgVolver').onclick = () => { location.hash = '#rgrl'; };
  if ($('rgCopia')) $('rgCopia').onclick = () => { leer(); RGF = { nuevo: true, d: Object.assign({}, d, { ID: '', FECHA: new Date().toISOString().slice(0, 10), ESTADO: 'Borrador' }), r: JSON.parse(JSON.stringify(F.r)), p: JSON.parse(JSON.stringify(F.p)) }; location.hash = '#rgrl/nuevo'; toast('Copia lista: revisá las respuestas y guardá.'); };
  const guardar = async estado => { leer(); if (estado) d.ESTADO = estado;
    const sinFecha = Object.keys(F.r).filter(k => F.r[k].r === 'No' && !F.r[k].f); if (estado === 'Completo' && sinFecha.length) return toast('Falta la fecha de regularización en ' + sinFecha.length + ' condición(es) en «No»: ' + sinFecha.slice(0, 8).join(', ') + (sinFecha.length > 8 ? '…' : '') + '.');
    const msg = $('rgMsg'); msg.textContent = 'Guardando…'; document.querySelectorAll('#rgGuardar,#rgCompleto').forEach(b => b.disabled = true);
    try { const r = await api('p_rgrl_guardar', Object.assign({}, d, { ID: F.id || '', respuestas: F.r, planillas: F.p }), 180000);
      if (!r.ok) { msg.textContent = r.mensaje || 'No se pudo guardar.'; document.querySelectorAll('#rgGuardar,#rgCompleto').forEach(b => b.disabled = false); return; }
      toast('Relevamiento guardado. Vence el ' + fechaTxt(r.vence) + '.'); RG = null; RGF = null; location.hash = '#rgrl/' + encodeURIComponent(r.id); if (F.id === r.id) rgrlForm(r.id);
    } catch (e) { msg.textContent = 'No se pudo conectar. Probá de nuevo.'; document.querySelectorAll('#rgGuardar,#rgCompleto').forEach(b => b.disabled = false); } };
  $('rgGuardar').onclick = () => guardar('');
  $('rgCompleto').onclick = () => guardar('Completo');
}

// ------------------------------------------------------------------ Mediciones (puesta a tierra, iluminación, ruido…)
async function medicionesPantalla() {
  if (!await rgCargar('#medic')) return;
  const V = RG.mediciones.filter(m => m.ESTADO === 'Vigente').sort((a, b) => String(a.VENCE).localeCompare(String(b.VENCE)));
  const urg = V.filter(m => m.estadoVto === 'vencida' || m.estadoVto === 'porvencer'), hist = RG.mediciones.filter(m => m.ESTADO !== 'Vigente');
  const fila = m => '<tr class="cl" data-med="' + esc(m.ID) + '"><td><b>' + esc(m.TIPO) + '</b><div class="mu peq">' + esc(m.NORMA || '') + '</div></td><td>' + esc(rgNom(m.ESTABLECIMIENTO)) + (m.LUGAR && m.LUGAR !== m.ESTABLECIMIENTO ? '<div class="mu peq">' + esc(m.LUGAR) + '</div>' : '') + '</td><td>' + fechaTxt(m.FECHA_MEDICION) + '</td><td>' + (m.ESTADO === 'Vigente' ? rgChip(m.estadoVto, m.VENCE) : '<span class="chip gr">' + esc(m.ESTADO) + '</span>') + '</td><td class="peq">' + esc(m.RESULTADO || '') + (m.PROFESIONAL ? '<div class="mu">' + esc(m.PROFESIONAL) + '</div>' : '') + '</td><td>' + (m.ARCHIVO ? '<a class="link" href="' + esc(m.ARCHIVO) + '" target="_blank" rel="noopener">Protocolo ↗</a>' : '<span class="mu">—</span>') + '</td><td class="peq">' + esc(m.AVISAR_A || '') + '</td></tr>';
  const cab = '<thead><tr><th>Medición</th><th>Establecimiento</th><th>Fecha</th><th>Vigencia</th><th>Resultado</th><th>Archivo</th><th>Recordatorio a</th></tr></thead>';
  marco('#medic', rgCab('Mediciones con vencimiento', 'Puesta a tierra y continuidad de masas (Res. SRT 900/15), iluminación (Res. SRT 84/12), ruido (Res. SRT 85/12) y otras. Vencidas o que vencen en ' + RG.avisoDias + ' días = urgentes; recordatorio por correo los jueves a las 7 h.', '<button class="btn sec" id="mdPrev">Ver el recordatorio</button><button class="btn pri" id="mdNueva">Cargar medición</button>') +
    (urg.length ? '<section class="card" style="border-left:4px solid var(--er)"><h2>Urgentes (' + urg.length + ')</h2>' + urg.map(m => '<a class="at" href="#medic" data-med="' + esc(m.ID) + '"><span class="tag er">' + (m.estadoVto === 'vencida' ? 'Vencida' : 'Urgente') + '</span><span><b>' + esc(m.TIPO) + ' · ' + esc(rgNom(m.ESTABLECIMIENTO)) + '</b><small>' + (m.estadoVto === 'vencida' ? 'Venció el ' : 'Vence el ') + fechaTxt(m.VENCE) + ' · cargá la medición nueva cuando esté el protocolo</small></span></a>').join('') + '</section>' : '') +
    '<section class="card tabla"><div style="padding:14px 18px;border-bottom:1px solid var(--ln)"><h2>Vigentes (' + V.length + ')</h2></div><div style="overflow-x:auto"><table>' + cab + '<tbody>' + (V.length ? V.map(fila).join('') : '<tr><td colspan="7" class="mu">Todavía no hay mediciones cargadas.</td></tr>') + '</tbody></table></div></section>' +
    (hist.length ? '<details class="card"><summary style="cursor:pointer;font-weight:700">Anteriores y anuladas (' + hist.length + ')</summary><div style="overflow-x:auto"><table>' + cab + '<tbody>' + hist.map(fila).join('') + '</tbody></table></div></details>' : '') +
    '<p class="mu peq">Al cargar una medición nueva del mismo tipo y lugar, la anterior queda «Reemplazada» y el recordatorio deja de salir. Todo se puede corregir también en la planilla (hoja MEDICIONES): <a class="link" href="' + esc(RG.libro) + '" target="_blank" rel="noopener">abrir ↗</a>.</p>');
  $('rgAct').onclick = () => { RG = null; medicionesPantalla(); };
  $('mdNueva').onclick = () => medForm(null);
  $('mdPrev').onclick = async () => { toast('Armando la vista previa…'); try { const r = await api('p_rgrl_med_correo', { enviar: false }, 120000);
    modal('Recordatorio de los jueves (vista previa)', [], {}, async () => '', '<pre style="white-space:pre-wrap;font:inherit;font-size:13px;background:#F4F7F8;padding:12px;border-radius:10px;max-height:60vh;overflow:auto">' + esc(r.resultado || '') + '</pre><p class="mu peq">No se envía nada desde acá: sale solo los jueves a las 7 h mientras haya mediciones vencidas o que vencen en ' + RG.avisoDias + ' días.</p>'); } catch (e) {} };
  document.querySelectorAll('[data-med]').forEach(el => el.onclick = e => { e.preventDefault(); medForm(RG.mediciones.find(m => m.ID === el.dataset.med)); });
}
function medForm(m) {
  const tipos = RG.tiposMed.map(t => t[0]), v = Object.assign({ TIPO: tipos[0], AVISAR_A: RG.correoDefecto, ESTADO: 'Vigente', ESTABLECIMIENTO: RGL.est || '' }, m || {}), arch = {};
  modal(m ? 'Medición · ' + m.TIPO : 'Cargar medición', [['ESTABLECIMIENTO', 'Establecimiento (código)', (RES ? RES.filas : []).map(f => f.cod)], ['LUGAR', 'Lugar (edificio, CAPS, sede…; vacío = todo el establecimiento)'], ['TIPO', 'Tipo de medición', tipos],
    ['FECHA_MEDICION', 'Fecha de la medición', 'date'], ['VENCE', 'Vence (vacío = fecha + 12 meses)', 'date'], ['PROFESIONAL', 'Profesional que firma el protocolo'], ['RESULTADO', 'Resultado', RG.resultados],
    ['AVISAR_A', 'Recordatorio de los jueves a (correos separados por coma)'], ['ESTADO', 'Estado', RG.estadosMed], ['OBSERVACIONES', 'Observaciones', null, 1]], v,
    async out => {
      if (!out.ESTABLECIMIENTO) return 'Elegí el establecimiento.'; if (!out.FECHA_MEDICION && !out.VENCE) return 'Cargá la fecha de la medición o la de vencimiento.';
      const datos = Object.assign({ ID: m ? m.ID : '' }, out); if (arch.prot) datos.archivo = { base64: arch.prot, tipo: (arch.prot.match(/^data:([^;]+)/) || [])[1] || 'application/pdf' };
      const r = await api('p_rgrl_med_guardar', datos, 120000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      toast('Medición guardada. Vence el ' + fechaTxt(r.vence) + (r.estado === 'vencida' ? ' (vencida).' : r.estado === 'porvencer' ? ' (vence pronto).' : '.')); RG = null; medicionesPantalla(); return '';
    }, radSubir('prot', 'Protocolo de medición (PDF o foto)', m && m.ARCHIVO) + '<p class="mu peq" style="margin:0">Puesta a tierra: protocolo de medición de puesta a tierra y continuidad de las masas, firmado por profesional habilitado (Res. SRT 900/15), una vez al año como mínimo.</p>');
  radInputs(arch);
}
