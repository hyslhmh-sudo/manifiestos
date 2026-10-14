// Portal HyS · Trabajadores e importación de la base de Personal
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// ------------------------------------------------------------------ Trabajadores
async function trabajadores(cod) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } else { cargando('#trab'); try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  TRAB.cod = cod || TRAB.cod || '';
  const pintar = () => {
    const D = TRAB.datos;
    marco('#trab', '<div class="cab"><div><span class="mu peq">8 · Personal y RAR</span><h1>Personas</h1></div>' +
      '<div class="filtros"><label class="f">Establecimiento<select class="c" id="tEst">' + selectorEst(TRAB.cod || '*', true, true) + '</select></label>' +
      '<label class="f">Buscar por CUIL, DNI, apellido, función o servicio<input class="c" id="tQ" value="' + esc(TRAB.q) + '" style="min-width:260px"></label><button class="btn sec" id="tBus">Buscar</button>' +
      (TRAB.cod && TRAB.cod !== '*' ? '<button class="btn pri" id="tNuevo">Agregar trabajador</button>' : '') + '<a class="btn sec" href="#importar">Importar base de Personal</a></div></div>' +
      (!D ? '<div class="card vacio">Elegí un establecimiento o buscá en todos.</div>' : D.aviso ? '<div class="aviso">' + esc(D.aviso) + '</div>' :
      '<p class="mu peq" style="margin:0">' + D.total + ' persona(s)' + (D.total > D.filas.length ? ' · se muestran ' + D.filas.length : '') + '. Tocá una fila para ver o editar.</p>' +
      '<section class="card tabla"><table><thead><tr><th>CUIL</th><th>DNI</th><th>Apellido y nombre</th>' + (TRAB.cod === '*' ? '<th>Establecimiento</th>' : '') + '<th>Sitio</th><th>Función</th><th>Servicio</th><th>Vínculo</th><th>Estado</th></tr></thead><tbody>' +
      D.filas.map((f, i) => '<tr class="cl" data-i="' + i + '"><td class="peq">' + esc(f.v[0]) + '</td><td>' + esc(f.v[1]) + '</td><td><b>' + esc(f.v[2]) + '</b>, ' + esc(f.v[3]) + (f.v[17] === 'Sí' ? ' <span class="chip wa">Revisar</span>' : '') + '</td>' + (TRAB.cod === '*' ? '<td>' + esc(f.hoja) + '</td>' : '') +
        '<td class="peq">' + esc(f.v[4]) + '</td><td class="peq">' + esc(f.v[5]) + '</td><td class="peq">' + esc(f.v[7]) + '</td><td class="peq">' + esc(f.v[8]) + '</td><td><span class="chip ' + (!f.v[19] || f.v[19] === 'Activo' ? 'ok' : /^(Baja|Traslado)/.test(f.v[19]) ? 'gr' : 'wa') + '">' + esc(f.v[19] || 'Activo') + '</span></td></tr>').join('') +
      '</tbody></table>' + (D.filas.length ? '' : '<div class="vacio">Nadie coincide con la búsqueda.</div>') + '</section>'));
    $('tEst').onchange = e => { location.hash = '#trab/' + encodeURIComponent(e.target.value); };
    const buscar = () => { TRAB.q = $('tQ').value.trim(); cargar(); };
    $('tBus').onclick = buscar; $('tQ').onkeydown = e => { if (e.key === 'Enter') buscar(); };
    if ($('tNuevo')) $('tNuevo').onclick = () => fichaTrab(null);
    document.querySelectorAll('tr.cl').forEach(tr => tr.onclick = () => fichaTrab(TRAB.datos.filas[tr.dataset.i]));
  };
  const cargar = async () => {
    if (!TRAB.cod) { TRAB.datos = null; return pintar(); }
    cargando('#trab', 'Buscando…');
    try { TRAB.datos = await api('p_trab', { cod: TRAB.cod, q: TRAB.q }); } catch (e) { return; }
    pintar();
  };
  if (cod !== undefined && (TRAB.datos == null || TRAB.datos._cod !== TRAB.cod)) { await cargar(); if (TRAB.datos) TRAB.datos._cod = TRAB.cod; } else pintar();
}
function fichaTrab(f) {
  const v = {}; TRAB_COLS.forEach((c, i) => v[c] = f ? f.v[i] : ''); if (!f) v.ESTADO = 'Activo';
  Object.assign(v, f && f.extra || {});
  const hoja = f ? f.hoja : TRAB.cod, trelew = ['HZT', 'HMH'].indexOf(hoja) >= 0;
  const campos = [['CUIL', 'CUIL'], ['DNI', 'DNI'], ['APELLIDOS', 'Apellidos'], ['NOMBRES', 'Nombres'], ['SITIO', 'Sitio (CAPS o dispositivo)']].concat(trelew ? [['EDIFICIOS', 'Edificios donde trabaja (red Trelew)', ['Solo HZT', 'Solo HMH', 'HZT y HMH', 'Sede ex ADOS', 'HZT y Sede ex ADOS', 'HMH y Sede ex ADOS', 'HZT, HMH y Sede ex ADOS', 'Otro (ver observación)']]] : []).concat([['FUNCION', 'Función'], ['FUNCION_DETALLE', 'Detalle de la función'], ['SERVICIO', 'Servicio'],
    ['VINCULO', 'Vínculo', ['Planta', 'Contratado', 'Residente', 'Tercerizado', 'Otro']], ['EMPRESA', 'Empresa (tercerizados)'], ['CARGO_CONDUCCION', 'Cargo de conducción'], ['EMAIL', 'Correo'], ['TELEFONO', 'Teléfono'],
    ['EN_NTEAR', 'En NTEAR', ['Sí', 'No']], ['ESTADO', 'Estado', ['Activo', 'Licencia', 'No figura en la última base', 'Revisar']], ['REVISAR', 'Revisar', ['Sí', 'No']], ['OBS_PUESTO', 'Observación de puesto (ej. guardias en otro edificio, días u horarios)', null, 1], ['MOTIVO_REVISION', 'Motivo de revisión', null, 1]]);
  const info = f ? '<p class="mu peq" style="margin:0">Hoja ' + esc(hoja) + ', fila ' + f.fila + ' · Fuentes: ' + esc(v.FUENTES || 's/d') + ' · Alta: ' + fechaTxt(v.FECHA_ALTA) + (v.ULTIMA_CONFIRMACION ? ' · Última confirmación: ' + esc(v.ULTIMA_CONFIRMACION) : '') + '</p>' : '';
  const m = modal(f ? v.APELLIDOS + ', ' + v.NOMBRES : 'Nuevo trabajador · ' + hoja, campos, v, async nuevos => {
    if (nuevos.REVISAR === 'No') nuevos.REVISAR = '';
    const datos = Object.assign({}, v, nuevos);
    const r = await api('p_trab_guardar', { cod: hoja, fila: f ? f.fila : null, datos: datos });
    if (!r.ok) return r.mensaje || 'No se pudo guardar.';
    toast((f ? (r.cambios ? 'Guardado: ' + r.cambios + ' cambio(s).' : 'Sin cambios.') : 'Trabajador agregado.') + (r.comite ? ' · ' + r.comite : '')); FICHAS = {}; TRAB.datos = null; trabajadores(TRAB.cod); return '';
  }, info);
  if (f) {
    const box = document.createElement('div'); box.className = 'card'; box.style.cssText = 'padding:12px 14px;background:var(--bg)'; box.innerHTML = '<b>Capacitaciones</b><p class="mu peq" style="margin:4px 0 0">Buscando…</p>';
    document.querySelector('#ov .acciones').before(box);
    api('p_caps', { dni: v.DNI }).then(r => {
      const L = (r && r.caps) || [];
      box.innerHTML = '<b>Capacitaciones (' + L.length + ')</b>' + (L.length ? '<div class="tabla" style="margin-top:6px"><table><thead><tr><th>Fecha</th><th>Capacitación</th><th>Resultado</th><th>Vence</th><th></th></tr></thead><tbody>' +
        L.map(c => '<tr><td class="peq">' + esc(fechaTxt(c.fecha)) + '</td><td class="peq">' + esc(c.tema) + '<div class="mu" style="font-size:11px">' + esc(c.fuente + (c.tipo ? ' · ' + c.tipo : '')) + '</div></td><td class="peq">' + esc(c.aprobo || '—') + (c.nota ? ' · ' + esc(c.nota) : '') + '</td><td class="peq">' + esc(fechaTxt(c.vence)) + '</td><td class="peq">' + (c.link ? '<a href="' + esc(c.link) + '" target="_blank" rel="noopener">' + (c.cert ? esc(c.cert) : 'Ver') + '</a>' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="mu peq" style="margin:4px 0 0">Sin capacitaciones registradas con este DNI.</p>');
    }).catch(() => { box.innerHTML = '<b>Capacitaciones</b><p class="mu peq">No se pudieron consultar.</p>'; });    const box4 = document.createElement('div'); box4.className = 'card'; box4.style.cssText = 'padding:12px 14px;background:var(--bg)'; box4.innerHTML = '<b>Siniestros y exposición</b><p class="mu peq" style="margin:4px 0 0">Buscando…</p>';
    box.after(box4);
    api('p_sin_persona', { dni: v.DNI, hoja: hoja }, 120000).then(r => {
      const S = (r && r.siniestros) || [];
      box4.innerHTML = '<b>Siniestros (' + S.length + ')</b>' + (S.length ? '<div class="tabla" style="margin-top:6px"><table><thead><tr><th>Fecha</th><th>N.º CH · tipo</th><th>Diagnóstico</th><th>Estado</th><th>Días</th></tr></thead><tbody>' +
        S.map(s => '<tr><td class="peq">' + fechaTxt(s.fecha) + '</td><td class="peq"><a href="#sin/' + encodeURIComponent(s.id) + '">' + esc(s.nro) + '</a><div class="mu" style="font-size:11px">' + esc(s.tipo) + ' · ' + esc(s.est) + '</div></td><td class="peq">' + esc(s.cie10) + '</td><td class="peq">' + esc(s.estado) + '</td><td class="peq">' + (s.dias || 0) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="mu peq" style="margin:4px 0 0">Sin siniestros registrados con este DNI.</p>') +
        '<b style="display:block;margin-top:12px">Exposición según la NTE</b><div style="margin-top:4px">' + sinExpoTxt(r && r.exposicion, null) + '</div>';
      box4.querySelectorAll('a[href^="#sin/"]').forEach(x => x.addEventListener('click', () => { $('ov').hidden = true; $('ov').innerHTML = ''; }));
    }).catch(() => { box4.innerHTML = '<b>Siniestros y exposición</b><p class="mu peq">No se pudieron consultar.</p>'; });
  }
  if (f && !/^(Baja|Traslado)/.test(v.ESTADO)) {
    m.extra.innerHTML = '<button class="btn peligro" id="tBaja">Dar de baja</button><button class="btn sec" id="tTras">Traslado</button>';
    $('tBaja').onclick = async () => { if (!confirm('¿Dar de baja a ' + v.APELLIDOS + ', ' + v.NOMBRES + '? La fila no se borra: queda con estado «Baja».')) return;
      const r = await api('p_trab_guardar', { cod: hoja, fila: f.fila, accion: 'baja' }); if (r.ok) { toast('Baja registrada.'); m.cerrar(); TRAB.datos = null; FICHAS = {}; trabajadores(TRAB.cod); } else toast(r.mensaje); };
    $('tTras').onclick = () => {
      m.extra.innerHTML = '<label class="f">Trasladar a<select class="c" id="tDest">' + selectorEst('', true) + '</select></label><button class="btn pri" id="tTrasOk" style="align-self:flex-end">Confirmar traslado</button>';
      $('tTrasOk').onclick = async () => { const dest = $('tDest').value; if (!dest) return;
        const r = await api('p_trab_guardar', { cod: hoja, fila: f.fila, accion: 'traslado', destino: dest }); if (r.ok) { toast('Traslado registrado.'); m.cerrar(); TRAB.datos = null; FICHAS = {}; trabajadores(TRAB.cod); } else toast(r.mensaje); };
    };
  }
}


// ------------------------------------------------------------------ Importar base de Personal
const IMP_CAMPOS = [['DNI', 'DNI', ['dni', 'documento', 'nro documento', 'n documento', 'nro doc', 'doc', 'num doc']], ['CUIL', 'CUIL', ['cuil', 'cuit']],
  ['APELLIDOS', 'Apellido(s)', ['apellido', 'apellidos']], ['NOMBRES', 'Nombre(s)', ['nombre', 'nombres']],
  ['APYNOM', 'Apellido y nombre (juntos)', ['apellido y nombre', 'apellido y nombres', 'apellidos y nombres', 'nombre y apellido', 'agente', 'apellido/s y nombre/s']],
  ['ESTABLECIMIENTO', 'Establecimiento', ['establecimiento', 'hospital', 'institucion', 'efector', 'unidad']], ['SITIO', 'Sitio (CAPS o dispositivo)', ['sitio', 'lugar de trabajo', 'lugar', 'dependencia', 'caps']],
  ['FUNCION', 'Función', ['funcion', 'cargo', 'puesto', 'profesion']], ['SERVICIO', 'Servicio', ['servicio', 'sector', 'area', 'departamento', 'oficina fisica', 'oficina', 'lugar fisico']],
  ['VINCULO', 'Vínculo', ['vinculo', 'situacion de revista', 'revista', 'modalidad', 'tipo de contrato']], ['EMPRESA', 'Empresa', ['empresa']],
  ['CARGO_CONDUCCION', 'Cargo de conducción', ['jefatura', 'cargo de conduccion', 'conduccion']], ['EMAIL', 'Correo', ['email', 'e-mail', 'mail', 'correo']], ['TELEFONO', 'Teléfono', ['telefono', 'celular', 'tel']], ['MOTIVO', 'Motivo de revisión (solo altas)', ['motivo', 'motivo de revision', 'revisar']]];
let IMP = null;
// «De Los Santos Beatriz» → [De Los Santos, Beatriz] · «Borges De Los Santos Macarena» → [Borges De Los Santos, Macarena] · si no, la primera palabra es el apellido
const PARTICULAS = ['de', 'del', 'della', 'do', 'di', 'da', 'dos', 'van', 'von', 'los', 'las', 'la', 'san'];
function separarNombre(t) {
  const p = String(t).trim().split(/\s+/), es = w => PARTICULAS.indexOf(String(w).toLowerCase()) >= 0; let i = 1;
  if (es(p[0])) { while (i < p.length - 1 && es(p[i])) i++; i++; }
  else if (p.length > 2 && es(p[1])) { i = 2; while (i < p.length - 1 && es(p[i])) i++; i++; }
  return [p.slice(0, i).join(' '), p.slice(i).join(' ')];
}
const normH = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[°º.:#]/g, ' ').replace(/\s+/g, ' ').trim();
function cargarXLSX() { return window.XLSX ? Promise.resolve() : new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel. Revisá la conexión.')); document.head.appendChild(s); }); }
async function importar() {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; } else { cargando('#importar'); try { RES = await api('p_resumen', {}, 240000); LS.set('res', RES); } catch (e) { return; } } }
  IMP = { paso: 1, cod: TRAB.cod && TRAB.cod !== '*' ? TRAB.cod : '', ntear: false };
  pasoImp();
}
function pasoImp() {
  const P = IMP; let h = '<div class="cab"><div><span class="mu peq">8 · Personal y RAR</span><h1>Importar una base</h1></div></div>' +
    '<p class="mu" style="margin:0">El sistema compara por DNI: agrega a quien no está, actualiza lo que cambió y marca a quien ya no figura. <b>Nunca borra.</b> Antes de escribir, muestra todo para que lo revises.</p>';
  if (P.paso === 1) {
    h += '<section class="card" style="display:flex;flex-direction:column;gap:14px"><h2>1 · Archivo y establecimiento</h2>' +
      '<label class="f">Archivo de Excel o CSV<input class="c" type="file" id="iArch" accept=".xlsx,.xls,.csv"></label>' +
      '<label class="f">¿De qué establecimiento es la base?<select class="c" id="iEst"><option value="">Elegí…</option><option value="*COL"' + (P.cod === '*COL' ? ' selected' : '') + '>Varios: según una columna del archivo</option>' + selectorEst(P.cod, false).replace('<option value="">Elegí…</option>', '') + '</select></label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="iNtear"' + (P.ntear ? ' checked' : '') + '> Es la nómina NTEAR (marca «En NTEAR: Sí» a quienes figuran)</label>' +
      '<div class="aviso error" id="iErr" hidden></div><div><button class="btn pri" id="iSig">Leer el archivo</button></div></section>';
    marco('#importar', h);
    $('iSig').onclick = async () => {
      const f = $('iArch').files[0], cod = $('iEst').value, err = m => { $('iErr').textContent = m; $('iErr').hidden = false; };
      if (!f) return err('Elegí el archivo.'); if (!cod) return err('Elegí el establecimiento.');
      P.cod = cod; P.ntear = $('iNtear').checked; P.origen = f.name.replace(/\.[^.]+$/, '');
      $('iSig').disabled = true; $('iSig').textContent = 'Leyendo…';
      try {
        await cargarXLSX();
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
        const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
        // Fila de encabezados: la primera (de las 15 primeras) que tenga al menos 2 nombres reconocibles
        let hi = 0, mejor = 0;
        filas.slice(0, 15).forEach((r, i) => { const n = r.filter(c => IMP_CAMPOS.some(k => k[2].indexOf(normH(c)) >= 0)).length; if (n > mejor) { mejor = n; hi = i; } });
        P.encab = filas[hi].map(c => String(c).trim()); P.datos = filas.slice(hi + 1).filter(r => r.some(c => String(c).trim() !== ''));
        P.mapa = {};
        const orden = ['APYNOM'].concat(IMP_CAMPOS.map(c => c[0]).filter(k => k !== 'APYNOM'));
        orden.map(k => IMP_CAMPOS.find(c => c[0] === k)).forEach(([k, , sin]) => { let j = P.encab.findIndex(c => sin.indexOf(normH(c)) >= 0); if (j < 0) j = P.encab.findIndex(c => sin.some(s => s.length > 3 && normH(c).indexOf(s) >= 0)); if (j >= 0 && !Object.values(P.mapa).includes(j)) P.mapa[k] = j; });
        if (P.mapa.APYNOM != null && (P.mapa.APELLIDOS === P.mapa.APYNOM || P.mapa.NOMBRES === P.mapa.APYNOM)) { delete P.mapa.APELLIDOS; delete P.mapa.NOMBRES; }
        P.paso = 2; pasoImp();
      } catch (e) { $('iSig').disabled = false; $('iSig').textContent = 'Leer el archivo'; err(e.message || 'No se pudo leer el archivo.'); }
    };
    return;
  }
  if (P.paso === 2) {
    const opc = sel => '<option value="">— No está en el archivo —</option>' + P.encab.map((c, j) => '<option value="' + j + '"' + (sel === j ? ' selected' : '') + '>' + esc(c || 'Columna ' + (j + 1)) + '</option>').join('');
    h += '<section class="card" style="display:flex;flex-direction:column;gap:14px"><h2>2 · Columnas del archivo</h2><p class="mu peq" style="margin:0">' + P.datos.length + ' fila(s) en «' + esc(P.origen) + '». Revisá qué columna corresponde a cada dato. DNI y apellido son obligatorios.</p>' +
      '<div class="grid g3">' + IMP_CAMPOS.filter(c => c[0] !== 'ESTABLECIMIENTO' || P.cod === '*COL').map(([k, l]) => '<label class="f">' + esc(l) + '<select class="c" data-m="' + k + '">' + opc(P.mapa[k]) + '</select></label>').join('') + '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="iPar"' + (P.parentesis !== false ? ' checked' : '') + '> Si el servicio trae algo entre paréntesis, tomarlo como función (ej.: «SERVICIOS GENERALES (MUCAMA)» → servicio Servicios Generales, función Mucama)</label>' +
      '<label class="f">Nombre de la base (queda en el registro)<input class="c" id="iOrig" value="' + esc(P.origen) + '"></label>' +
      '<div class="tabla" style="border:1px solid var(--ln);border-radius:8px"><table><thead><tr>' + P.encab.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + P.datos.slice(0, 5).map(r => '<tr>' + P.encab.map((c, j) => '<td class="peq">' + esc(r[j]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="aviso error" id="iErr" hidden></div><div style="display:flex;gap:10px"><button class="btn sec" id="iAtr">Volver</button><button class="btn pri" id="iSig">Revisar cambios</button></div></section>';
    marco('#importar', h);
    $('iAtr').onclick = () => { P.paso = 1; pasoImp(); };
    $('iSig').onclick = async () => {
      document.querySelectorAll('[data-m]').forEach(s => { if (s.value === '') delete P.mapa[s.dataset.m]; else P.mapa[s.dataset.m] = Number(s.value); });
      P.origen = $('iOrig').value.trim() || P.origen;
      P.parentesis = $('iPar').checked;
      const err = m => { $('iErr').textContent = m; $('iErr').hidden = false; };
      if (P.mapa.DNI == null) return err('Elegí la columna del DNI.');
      if (P.mapa.APELLIDOS == null && P.mapa.APYNOM == null) return err('Elegí la columna del apellido (o de apellido y nombre juntos).');
      if (P.cod === '*COL' && P.mapa.ESTABLECIMIENTO == null) return err('Elegí la columna del establecimiento.');
      P.filas = P.datos.map(r => { const o = {}; Object.keys(P.mapa).forEach(k => o[k] = String(r[P.mapa[k]] == null ? '' : r[P.mapa[k]]).trim());
        if (o.APYNOM && !o.APELLIDOS) { const t = o.APYNOM; if (t.indexOf(',') >= 0) { o.APELLIDOS = t.split(',')[0].trim(); o.NOMBRES = t.split(',').slice(1).join(',').trim(); } else { const sp = separarNombre(t); o.APELLIDOS = sp[0]; o.NOMBRES = sp[1]; o._junto = '1'; } }
        if (P.parentesis !== false && o.SERVICIO) { const MAP = { 'SERV. GRALES': 'SERVICIOS GENERALES', 'S. MENTAL': 'SALUD MENTAL', 'MACAMA': 'MUCAMA' }; let sv = o.SERVICIO; Object.keys(MAP).forEach(k => sv = sv.split(k).join(MAP[k]));
          const m = sv.match(/^(.*?)\s*\((.*?)\)\s*$/); if (m) { sv = m[1]; if (!o.FUNCION) o.FUNCION = m[2]; } o.SERVICIO = sv.trim(); }
        delete o.APYNOM; return o; });
      $('iSig').disabled = true; $('iSig').textContent = 'Comparando…';
      try { P.previa = await api('p_imp_previa', { cod: P.cod, filas: P.filas, origen: P.origen, ntear: P.ntear }); } catch (e) { $('iSig').disabled = false; $('iSig').textContent = 'Revisar cambios'; return; }
      if (!P.previa.ok) return err(P.previa.mensaje || 'No se pudo comparar.');
      P.paso = 3; pasoImp();
    };
    return;
  }
  if (P.paso === 3) {
    const R = P.previa, D = R.detalle;
    const bloque = (k, titulo, desc, n, cols, fila, opcion) => '<details class="card" style="padding:14px 18px"' + (n && n <= 30 ? ' open' : '') + '><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:center"><span><b>' + titulo + '</b> <span class="mu peq">' + desc + '</span></span><span style="display:flex;gap:12px;align-items:center">' +
      (opcion ? '<label class="peq" style="display:flex;gap:6px;align-items:center" onclick="event.stopPropagation()"><input type="checkbox" data-op="' + opcion + '"' + (n && opcion !== 'noFiguran' ? ' checked' : n ? '' : ' disabled') + '> Aplicar</label>' : '') + '<span class="chip ' + (n ? 'pa' : 'gr') + '">' + n + '</span></span></summary>' +
      (n ? '<div class="tabla" style="margin-top:10px"><table><thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + D[k].map(o => '<tr>' + fila(o).map(c => '<td class="peq">' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>' + (n > D[k].length ? '<p class="mu peq">Se muestran ' + D[k].length + ' de ' + n + '.</p>' : '') + '</div>' : '') + '</details>';
    h += '<section style="display:flex;flex-direction:column;gap:10px"><h2>3 · Revisá antes de aplicar</h2><p class="mu peq" style="margin:0">«' + esc(P.origen) + '» · ' + P.filas.length + ' fila(s) · establecimiento(s): ' + esc(R.establecimientos.join(', ') || '—') + ' · sin cambios: ' + R.iguales + '</p>' +
      bloque('altas', 'Altas', 'Personas nuevas que se agregan', R.altas, ['DNI', 'Apellido y nombre', 'Va a'], o => [esc(o.dni), esc(o.nombre), esc(o.hacia)], 'altas') +
      bloque('mover', 'Salen de SIN_ASIGNAR', 'Estaban sin establecimiento y pasan al que indica la base', R.mover, ['DNI', 'Apellido y nombre', 'Va a'], o => [esc(o.dni), esc(o.nombre), esc(o.hacia)], 'mover') +
      bloque('cambios', 'Datos que cambian', 'El dato anterior queda en el HISTORIAL', R.cambios, ['DNI', 'Persona', 'Cambios'], o => [esc(o.dni), esc(o.nombre), o.dif.map(d => '<b>' + esc(d.campo) + '</b>: ' + esc(d.antes || '—') + ' → ' + esc(d.despues)).join('<br>')], 'cambios') +
      bloque('reaparecen', 'Vuelven a figurar', 'Estaban marcadas como «No figura» o «Revisar» y pasan a Activo', R.reaparecen, ['DNI', 'Persona', 'Hoja'], o => [esc(o.dni), esc(o.nombre), esc(o.hoja)], 'reaparecen') +
      bloque('noFiguran', 'No figuran en esta base', 'Activos en la hoja que no aparecen en el archivo. Marcá «Aplicar» solo si la base es COMPLETA (nómina total); si es un listado parcial, dejalo sin marcar', R.noFiguran, ['DNI', 'Persona', 'Función', 'Hoja'], o => [esc(o.dni), esc(o.nombre), esc(o.funcion), esc(o.hoja)], 'noFiguran') +
      bloque('conflictos', 'Están en otro establecimiento', 'No se cambian: si corresponde, hacé el traslado desde la ficha', R.conflictos, ['DNI', 'Persona', 'Hoy en', 'La base dice'], o => [esc(o.dni), esc(o.nombre), esc(o.en), esc(o.archivo)], null) +
      bloque('errores', 'Filas con error', 'No se importan (salvo CUIL inválido: se importa sin CUIL)', R.errores, ['Fila', 'Persona', 'Motivo'], o => [o.n, esc(o.nombre), esc(o.motivo)], null) +
      '<div style="display:flex;gap:10px;margin-top:6px"><button class="btn sec" id="iAtr">Volver</button><button class="btn pri" id="iApl">Aplicar los cambios marcados</button></div></section>';
    marco('#importar', h);
    $('iAtr').onclick = () => { P.paso = 2; pasoImp(); };
    $('iApl').onclick = async () => {
      const op = {}; document.querySelectorAll('[data-op]').forEach(c => op[c.dataset.op] = c.checked);
      if (!confirm('¿Aplicar los cambios marcados en la base de trabajadores? Queda todo registrado en IMPORTACIONES e HISTORIAL.')) return;
      $('iApl').disabled = true; $('iApl').textContent = 'Aplicando…';
      try { P.final = await api('p_imp_aplicar', { cod: P.cod, filas: P.filas, origen: P.origen, ntear: P.ntear, opciones: op }); } catch (e) { $('iApl').disabled = false; $('iApl').textContent = 'Aplicar los cambios marcados'; return; }
      if (!P.final.ok) { toast(P.final.mensaje || 'No se pudo aplicar.'); $('iApl').disabled = false; $('iApl').textContent = 'Aplicar los cambios marcados'; return; }
      P.op = op; P.paso = 4; FICHAS = {}; TRAB.datos = null; pasoImp();
    };
    return;
  }
  const F = P.final, op = P.op;
  h += '<section class="card"><h2>Listo</h2><p>Se importó «' + esc(P.origen) + '».</p><dl class="datos">' +
    '<dt>Altas</dt><dd>' + (op.altas ? F.altas : 0) + '</dd><dt>Salieron de SIN_ASIGNAR</dt><dd>' + (op.mover ? F.mover : 0) + '</dd><dt>Personas con datos actualizados</dt><dd>' + (op.cambios ? F.cambios : 0) + '</dd><dt>Marcadas «No figura en la última base»</dt><dd>' + (op.noFiguran ? F.noFiguran : 0) + '</dd><dt>En otro establecimiento (sin cambios)</dt><dd>' + F.conflictos + '</dd><dt>Filas con error</dt><dd>' + F.errores + '</dd></dl>' +
    '<p class="mu peq">Quedó registrado en las hojas IMPORTACIONES e HISTORIAL de la base de trabajadores.</p><div style="display:flex;gap:10px"><a class="btn pri" href="#trab/' + encodeURIComponent(P.cod === '*COL' ? '*' : P.cod) + '">Ver trabajadores</a><button class="btn sec" id="iOtra">Importar otra base</button></div></section>';
  marco('#importar', h);
  $('iOtra').onclick = () => importar();
}
