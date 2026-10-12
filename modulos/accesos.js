// Portal HyS · Accesos por persona (DNI y clave personal)
// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.
// Lee y escribe BASE COMÚN › ACCESOS (Accesos.gs › accPortal_). Todo se puede seguir haciendo a mano en la hoja.
let ACCPD = null;
const ACCPF = { q: '', estado: '' };
const accpDni = v => String(v || '').replace(/\D/g, '');
const accpLista = v => String(v || '').split(/[,;·]+/).map(s => s.trim()).filter(Boolean);
const accpMensaje = p => 'Hola. Ya tenés tu acceso personal al Sistema HyS.\n' +
  'Entrá a «Mi establecimiento»: ' + APP_URL + '\n' +
  'DNI: ' + accpDni(p.DNI) + '\nClave: ' + p.CLAVE + '\n' +
  'Con el mismo DNI y la misma clave entrás también a la página de diagnóstico. Ves solo lo que te corresponde: ' + (p.MODULOS || '') + ' (' + (p.ESTABLECIMIENTOS || '') + ').\n' +
  'La clave es personal: no la compartas. Cualquier consulta, a Higiene y Seguridad Laboral.';

async function accesosPantalla(fresco) {
  if (!ACCPD || fresco) {
    cargando('#accesos', 'Leyendo los accesos…');
    try { ACCPD = await api('p_acc_listar', {}, 120000); } catch (e) { return; }
  }
  if (!ACCPD.ok) return marco('#accesos', '<div class="cab"><div><span class="mu peq">Gestión</span><h1>Accesos por persona</h1></div></div><div class="aviso error">' +
    esc(ACCPD.mensaje || ACCPD.error || 'No se pudieron leer los accesos.') + '</div>' +
    (/desconocida/i.test(ACCPD.error || ACCPD.mensaje || '') ? '<section class="card peq">Falta publicar la versión del sistema que trae esta pantalla. Mientras tanto, los accesos se manejan en BASE COMÚN › ACCESOS.</section>' : ''));
  const D = ACCPD, F = ACCPF, todas = D.filas;
  const est = p => /^activ/i.test(p.ESTADO) ? 'Activo' : /^baja/i.test(p.ESTADO) ? 'Baja' : 'Pendiente';
  const listo = p => est(p) === 'Activo' && !!p.CLAVE && !!accpDni(p.DNI);
  const chip = p => listo(p) ? '<span class="chip ok">Activo</span>' : est(p) === 'Activo' ? '<span class="chip wa">Activo sin clave</span>' : est(p) === 'Baja' ? '<span class="chip gr">Baja</span>' : '<span class="chip pa">Pendiente</span>';
  const vis = todas.filter(p => (!F.estado || est(p) === F.estado) && (!F.q || (p.APELLIDO_Y_NOMBRE + ' ' + p.DNI + ' ' + p.ROL + ' ' + p.ESTABLECIMIENTOS + ' ' + p.MODULOS).toLowerCase().indexOf(F.q.toLowerCase()) >= 0));
  const kpi = (t, v, s, col) => '<div class="kpi2"><span>' + t + '</span><b' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</b><small>' + s + '</small></div>';
  const nAct = todas.filter(listo).length, nSinClave = todas.filter(p => est(p) === 'Activo' && !listo(p)).length,
    nPend = todas.filter(p => est(p) === 'Pendiente').length, nSinDni = todas.filter(p => est(p) !== 'Baja' && !accpDni(p.DNI)).length;
  // Módulos que en cada establecimiento ya pasaron a clave personal (la clave común deja de verlos: regla de Accesos.gs)
  const porEst = {};
  todas.filter(listo).forEach(p => { if (/toda/i.test(p.ESTABLECIMIENTOS)) return;
    const mods = /(^|,)\s*todos\s*(,|$)/i.test(p.MODULOS) ? D.modulos : accpLista(p.MODULOS);
    accpLista(p.ESTABLECIMIENTOS).forEach(c => { porEst[c] = porEst[c] || {}; mods.forEach(m => porEst[c][m] = true); }); });
  const hab = D.habilitados || null, comunes = D.modulos.filter(m => (D.soloPersonal || []).indexOf(m) < 0 && (!hab || hab[m]));   // solo los habilitados hoy (HABILITACION)
  const filaClave = p => p.CLAVE === '(clave maestra)' ? '<span class="mu peq">Clave maestra</span>'
    : p.CLAVE ? '<span class="accpK" data-f="' + p.fila + '"><code>••••••••</code></span> <button class="btn sec peq" data-ver="' + p.fila + '">Ver</button> <button class="btn sec peq" data-msj="' + p.fila + '">Copiar mensaje</button> <button class="btn sec peq" data-gen="' + p.fila + '">Nueva</button>'
    : (est(p) === 'Activo' && accpDni(p.DNI) ? '<button class="btn pri peq" data-gen="' + p.fila + '">Generar clave</button>' : '<span class="mu peq">' + (accpDni(p.DNI) ? 'Al activarla' : 'Falta el DNI') + '</span>');
  marco('#accesos', '<div class="cab"><div><span class="mu peq">Gestión</span><h1>Accesos por persona</h1><span class="mu peq">Cada persona entra a «Mi establecimiento» y a la página de diagnóstico con su DNI y su clave, y ve solo sus establecimientos y módulos. Los datos están en BASE COMÚN › ACCESOS.</span></div>' +
    '<div class="filtros"><button class="btn pri" id="apNueva">Nueva persona</button><button class="btn sec" id="apAct">Actualizar</button><a class="btn sec" href="' + esc(D.hoja || '#') + '" target="_blank" rel="noopener">Abrir la hoja ↗</a></div></div>' +
    '<div class="tb5" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
      kpi('Con acceso personal', nAct, 'activas, con DNI y clave', nAct ? '#0D4A63' : '') + kpi('Activas sin clave', nSinClave, 'tocá «Generar clave»', nSinClave ? '#8A5200' : '') +
      kpi('Pendientes', nPend, 'todavía no entran') + kpi('Sin DNI', nSinDni, 'completar para activar', nSinDni ? '#B4361F' : '') + '</div>' +
    '<div class="filtros" style="margin:12px 0"><label class="f">Buscar<input class="c" id="apQ" value="' + esc(F.q) + '" placeholder="Nombre, DNI, establecimiento o módulo"></label>' +
      '<label class="f">Estado<select class="c" id="apE"><option value="">Todos</option>' + ['Activo', 'Pendiente', 'Baja'].map(e => '<option' + (F.estado === e ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></label></div>' +
    '<section class="card tabla"><table><thead><tr><th>Persona</th><th>DNI</th><th>Establecimientos</th><th>Módulos</th><th>Estado</th><th>Clave</th></tr></thead><tbody>' +
      (vis.length ? vis.map(p => '<tr class="cl" data-fila="' + p.fila + '"><td><b>' + esc(p.APELLIDO_Y_NOMBRE || 's/d') + '</b><div class="mu peq">' + esc(p.ROL || '') + '</div></td><td>' + (accpDni(p.DNI) ? esc(accpDni(p.DNI)) : '<span class="mu">s/d (revisar)</span>') + '</td>' +
        '<td class="peq">' + esc(p.ESTABLECIMIENTOS || 's/d') + '</td><td class="peq">' + esc(p.MODULOS || 's/d') + '</td><td>' + chip(p) + '</td><td class="peq" style="white-space:nowrap">' + filaClave(p) + '</td></tr>').join('')
        : '<tr><td colspan="6" class="mu">No hay personas con estos filtros.</td></tr>') + '</tbody></table></section>' +
    '<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2 style="margin:0;font-size:16px">Clave común de cada establecimiento</h2>' +
      '<span class="mu peq">Cuando en un establecimiento hay alguien activo con clave propia para un módulo, la clave común de ese establecimiento deja de ver ese módulo. Las personas con «Toda la red» no cuentan.</span>' +
      (Object.keys(porEst).length ? '<table><thead><tr><th>Establecimiento</th><th>Con clave personal</th><th>Siguen con la clave común</th></tr></thead><tbody>' +
        Object.keys(porEst).sort().map(c => { const pers = Object.keys(porEst[c]).filter(m => comunes.indexOf(m) >= 0), resto = comunes.filter(m => !porEst[c][m]);
          return '<tr><td><b>' + esc(c) + '</b></td><td class="peq">' + esc(pers.join(', ') || '—') + '</td><td class="peq">' + (resto.length ? esc(resto.join(', ')) : '<span class="chip ok">Ninguno: solo claves personales</span>') + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<span class="peq">Todavía ningún establecimiento tiene módulos con clave personal: todos entran con su clave común.</span>') + '</section>' + accpCalendario(D));
  $('apAct').onclick = () => accesosPantalla(true);
  $('apNueva').onclick = () => accpEditar(null);
  $('apQ').onchange = e => { ACCPF.q = e.target.value.trim(); accesosPantalla(); };
  $('apE').onchange = e => { ACCPF.estado = e.target.value; accesosPantalla(); };
  const deFila = f => todas.find(p => String(p.fila) === String(f));
  document.querySelectorAll('tr.cl[data-fila]').forEach(tr => tr.onclick = e => { if (e.target.closest('button')) return; accpEditar(deFila(tr.dataset.fila)); });
  document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { const k = document.querySelector('.accpK[data-f="' + b.dataset.ver + '"] code'), p = deFila(b.dataset.ver);
    const oculta = k.textContent.indexOf('•') === 0; k.textContent = oculta ? p.CLAVE : '••••••••'; b.textContent = oculta ? 'Ocultar' : 'Ver'; });
  document.querySelectorAll('[data-msj]').forEach(b => b.onclick = async () => { const t = accpMensaje(deFila(b.dataset.msj));
    try { await navigator.clipboard.writeText(t); toast('Mensaje copiado: pegalo en el chat o el correo de esa persona.'); } catch (e) { prompt('Copiá el mensaje:', t); } });
  document.querySelectorAll('[data-gen]').forEach(b => b.onclick = () => accpClave(deFila(b.dataset.gen)));
}

function accpClave(p) {
  const tiene = !!p.CLAVE;
  const m = modal(tiene ? 'Clave nueva para ' + p.APELLIDO_Y_NOMBRE : 'Generar clave para ' + p.APELLIDO_Y_NOMBRE, [], {}, async () => {
    try { const r = await api('p_acc_clave', { fila: p.fila }, 60000); if (!r.ok) return r.mensaje || 'No se pudo generar la clave.';
      p.CLAVE = r.clave; toast('Clave generada. Usá «Copiar mensaje» para pasársela.'); setTimeout(() => accesosPantalla(), 0); }
    catch (e) { return 'No se pudo conectar con el sistema.'; }
  }, '<p class="peq">' + (tiene ? 'La clave actual deja de funcionar enseguida (en hasta 5 minutos en «Mi establecimiento»). Avisale a la persona la nueva.' : 'El sistema arma una clave al azar (tres letras y cuatro números) y la guarda en ACCESOS › CLAVE.') + '</p>');
  $('mOk').textContent = tiene ? 'Cambiar la clave' : 'Generar';
  return m;
}

function accpEditar(p) {
  const D = ACCPD, v = p ? Object.assign({}, p) : { ESTADO: 'Pendiente' };
  if (v.DNI && !accpDni(v.DNI)) v.DNI = '';
  const ests = Array.from(new Set((D.listas.ESTABLECIMIENTOS || []).concat(RES && RES.filas ? RES.filas.map(f => f.cod) : []))).filter(c => !/toda/i.test(c));
  const selE = accpLista(v.ESTABLECIMIENTOS), toda = /toda/i.test(v.ESTABLECIMIENTOS || ''), selM = /(^|,)\s*todos\s*(,|$)/i.test(v.MODULOS || '') ? ['Todos'] : accpLista(v.MODULOS);
  const caja = (grupo, val, on) => '<label style="display:inline-flex;gap:4px;align-items:center;margin:2px 10px 2px 0"><input type="checkbox" data-g="' + grupo + '" value="' + esc(val) + '"' + (on ? ' checked' : '') + '>' + esc(val) + '</label>';
  const extra = '<div class="f ancho" style="margin-top:8px"><b class="peq">Establecimientos</b><div>' + caja('E', 'Toda la red', toda) + ests.map(c => caja('E', c, !toda && selE.indexOf(c) >= 0)).join('') + '</div></div>' +
    '<div class="f ancho" style="margin-top:8px"><b class="peq">Módulos que puede cargar</b><div>' + caja('M', 'Todos', selM[0] === 'Todos') + D.modulos.map(m => caja('M', m, selM[0] !== 'Todos' && selM.some(s => s.toLowerCase().slice(0, 5) === m.toLowerCase().slice(0, 5)))).join('') + '</div>' +
    '<span class="mu peq">' + (D.soloPersonal || []).join(', ') + ': solo con clave personal (nunca con la clave común).</span></div>';
  const campos = [['APELLIDO_Y_NOMBRE', 'Apellido y nombre'], ['DNI', 'DNI (solo números)'], ['CORREO', 'Correo'], ['ROL', 'Rol', D.listas.ROL && D.listas.ROL.length ? D.listas.ROL : null],
    ['ESTADO', 'Estado', D.listas.ESTADO && D.listas.ESTADO.length ? D.listas.ESTADO : ['Activo', 'Pendiente', 'Baja']], ['OBSERVACIONES', 'Observaciones', null, 1]];
  modal(p ? 'Editar acceso · ' + (p.APELLIDO_Y_NOMBRE || '') : 'Nueva persona', campos, v, async out => {
    const marc = g => Array.from(document.querySelectorAll('#ov input[data-g="' + g + '"]:checked')).map(i => i.value);
    const E = marc('E'), M = marc('M');
    out.ESTABLECIMIENTOS = E.indexOf('Toda la red') >= 0 ? 'Toda la red' : E.join(', ');
    out.MODULOS = M.indexOf('Todos') >= 0 ? 'Todos' : M.join(', ');
    if (!out.APELLIDO_Y_NOMBRE.trim()) return 'Falta el apellido y nombre.';
    if (out.DNI && !/^\d{7,9}$/.test(accpDni(out.DNI))) return 'El DNI tiene que tener entre 7 y 9 números.';
    if (/^activ/i.test(out.ESTADO) && (!E.length || !M.length)) return 'Para dejarla Activa marcá al menos un establecimiento y un módulo.';
    try { const r = await api('p_acc_guardar', { fila: p ? p.fila : 0, datos: out }, 60000); if (!r.ok) return r.mensaje || 'No se pudo guardar.';
      toast(p ? 'Cambios guardados en ACCESOS.' : 'Persona agregada en ACCESOS (fila ' + r.fila + ').'); setTimeout(() => accesosPantalla(true), 0); }
    catch (e) { return 'No se pudo conectar con el sistema.'; }
  }, extra);
}
// Habilitación progresiva (12/10/2026): desde qué fecha la clave común ve cada módulo (BASE COMÚN › HABILITACION)
function accpCalendario(D) {
  const L = D.habilitacion, hab = D.habilitados || {}, fF = s => s ? s.split('-').reverse().join('/') : '';
  const cab = '<section class="card" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between"><h2 style="margin:0;font-size:16px">Habilitación progresiva para referentes</h2>' +
    (D.hojaHab ? '<a class="btn sec peq" href="' + esc(D.hojaHab) + '" target="_blank" rel="noopener">Cambiar fechas en la hoja ↗</a>' : '') + '</div>' +
    '<span class="mu peq">Desde qué fecha cada módulo se ve con la clave común del establecimiento. Lo marcado para cada persona en sus módulos se respeta siempre (excepciones). Higiene y Seguridad ve todo siempre. Un cambio de fecha tarda hasta 5 minutos en verse.</span>';
  if (!L) return cab + '<span class="peq">No está la hoja HABILITACION en la BASE COMÚN: todos los módulos están habilitados para la clave común.</span></section>';
  return cab + '<table><thead><tr><th>Módulo</th><th>Desde</th><th>Hoy</th><th>Observaciones</th></tr></thead><tbody>' +
    L.map(o => '<tr><td><b>' + esc(o.modulo) + '</b></td><td>' + (o.desde ? esc(fF(o.desde)) : '<span class="mu">Sin fecha</span>') + '</td><td>' +
      ((D.soloPersonal || []).indexOf(o.modulo) >= 0 ? '<span class="chip">Solo clave personal</span>' : hab[o.modulo] ? '<span class="chip ok">Habilitado</span>' : '<span class="chip">Todavía no</span>') +
      '</td><td class="peq">' + esc(o.obs || '') + '</td></tr>').join('') + '</tbody></table></section>';
}
