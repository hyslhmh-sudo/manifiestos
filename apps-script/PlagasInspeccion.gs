/**
 * SISTEMA HyS · 3 · PLAGAS › INSPECCIÓN DE HyS AL TRABAJO DE LOS OPERARIOS (versión 0, 23/10/2026)
 * Pedido de Belén (23/10/2026): desde «Mi establecimiento», con su perfil de Higiene y Seguridad, inspeccionar el trabajo que hacen los
 * operarios de plagas, y que lo cargado alimente el portal con la misma lógica de siempre (mismas planillas, mismas pantallas).
 * Dónde queda (todo editable en Sheets):
 *   BASE COMÚN › PLAGAS_REGISTROS     una fila por inspección, TIPO «Inspección HyS» (la ven el portal, «Mis registros» y Auditorías por tema)
 *   BASE COMÚN › PLAGAS_INSP_RESP     una fila por punto controlado (ID de la inspección, punto, respuesta, nota)
 *   BASE COMÚN › PLAGAS_INSP_ITEMS    la lista de puntos a controlar (se crea sola; para cambiarla, editar la hoja: ACTIVO = No para dejar de usar uno)
 *   Registro MIPyV › visitas › revisado_hys   si la inspección es sobre una visita de MIPyV, queda «Revisado … · Inspección …» (la misma marca del portal)
 *   Fotos: MÓDULO 5 · PLAGAS › Establecimientos › establecimiento › Inspecciones HyS (hasta 5)
 * Resultado: Conforme (todo Sí o No aplica) · Con observaciones (algún No) · No conforme (algún No en un punto crítico). Cumplimiento = Sí / (Sí + No).
 * Criterio: Ley 19.587 y Dto. 351/79 (higiene de los establecimientos; cap. 17, sustancias peligrosas; cap. 19, EPP; cap. 12, señalización);
 *   residuos de envases y restos de plaguicidas: Ley XI N.º 35 y Ley 24.051; manejo integrado de plagas con saneamiento previo (Módulo 5).
 * Solo con la clave de Higiene y Seguridad. Acciones m_plg_insp_datos y m_plg_insp_guardar (Codigo.gs). No envía correos.
 */

const PINS = {
  HOJA_ITEMS: 'PLAGAS_INSP_ITEMS', HOJA_RESP: 'PLAGAS_INSP_RESP', TIPO: 'Inspección HyS',
  H_ITEMS: ['CODIGO', 'PUNTO', 'AYUDA', 'CRITICO', 'NORMA', 'ACTIVO'],
  H_RESP: ['ID_INSP', 'ESTABLECIMIENTO', 'FECHA', 'CODIGO', 'PUNTO', 'RESPUESTA', 'NOTA', 'CARGADO'],
  RESP: ['Sí', 'No', 'No aplica'],
  ITEMS: [
    ['PI01', 'El operario usa los EPP que indica la hoja de seguridad del producto', 'Guantes, protección respiratoria y ocular, ropa de trabajo según el producto.', 'Sí', 'Dto. 351/79, cap. 19'],
    ['PI02', 'El producto usado es el registrado en la visita y tiene su hoja de seguridad disponible', 'Compará el envase con lo cargado en MIPyV o en el registro de la empresa.', 'Sí', 'Dto. 351/79, cap. 17'],
    ['PI03', 'La dosis y la forma de aplicación siguen la etiqueta del producto', 'Cantidad, dilución y lugares donde se aplicó.', 'Sí', 'Dto. 351/79, cap. 17'],
    ['PI04', 'Se hizo saneamiento previo o control físico, no solo químico', 'Limpieza, retiro de restos, sellado de grietas, trampas.', 'No', 'Manejo integrado de plagas (Módulo 5)'],
    ['PI05', 'El área tratada quedó señalizada y con el acceso restringido el tiempo indicado', 'Cartel visible y sin pacientes ni personal en el área.', 'Sí', 'Dto. 351/79, cap. 12'],
    ['PI06', 'Los cebos y estaciones están identificados, cerrados y fuera del alcance de pacientes y alimentos', 'Numerados, con su rótulo y en el plano o croquis.', 'Sí', 'Dto. 351/79, cap. 17'],
    ['PI07', 'Los envases vacíos y los restos de producto se gestionaron como residuo peligroso', 'No van a la basura común ni al desagüe.', 'Sí', 'Ley XI N.º 35 · Ley 24.051'],
    ['PI08', 'El producto se transporta y guarda cerrado, rotulado y separado de alimentos y medicamentos', 'En su envase original, nunca en botellas de bebida.', 'Sí', 'Dto. 351/79, cap. 17'],
    ['PI09', 'El registro de la visita está completo (sector, plaga, producto, dosis, fotos)', 'Lo cargado en MIPyV o en el registro de la empresa coincide con lo que se ve.', 'No', 'Programa de manejo integrado de plagas'],
    ['PI10', 'El sector quedó limpio y en orden después del trabajo', 'Sin restos de producto, envases ni herramientas.', 'No', 'Dto. 351/79 (higiene de los establecimientos)']
  ]
};

function pinsHoja_(nombre, H, titulo, ayuda, filas) {
  const bc = pBC_(); let sh = bc.getSheetByName(nombre);
  if (!sh) {
    sh = bc.insertSheet(nombre);
    sh.getRange(1, 1).setValue(titulo).setFontSize(14).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue(ayuda).setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5);
    if (filas && filas.length) sh.getRange(6, 1, filas.length, H.length).setValues(filas);
  }
  return sh;
}
const pinsItemsHoja_ = () => pinsHoja_(PINS.HOJA_ITEMS, PINS.H_ITEMS, 'Inspección de plagas · puntos a controlar',
  'Lista que usa «Mi establecimiento» › 3 · Plagas › Inspección del trabajo de los operarios. Se puede cambiar el texto, agregar filas o poner ACTIVO = No. CRITICO = Sí: un «No» deja la inspección «No conforme». No borres filas.',
  PINS.ITEMS.map(i => i.concat(['Sí'])));
const pinsRespHoja_ = () => pinsHoja_(PINS.HOJA_RESP, PINS.H_RESP, 'Inspección de plagas · respuestas', 'Una fila por punto controlado en cada inspección. El resumen de cada inspección está en PLAGAS_REGISTROS (TIPO «Inspección HyS»).');
const pinsLeer_ = (sh, H) => pTabla_(sh, H.length).map(r => { const o = { fila: r.fila }; H.forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : limpio_(r.v[i])); return o; });
function pinsItems_() { return pinsLeer_(pinsItemsHoja_(), PINS.H_ITEMS).filter(i => i.CODIGO && i.PUNTO && i.ACTIVO !== 'No'); }

// Datos para la pantalla: puntos, visitas de MIPyV del establecimiento (últimos 120 días) e inspecciones anteriores
function plgInspDatos_(cod) {
  let visitas = [], aviso = '';
  try { visitas = typeof plagMipyv_ === 'function' ? plagMipyv_(120).visitas.filter(v => v.cod === cod).slice(0, 40).map(v => ({ id: v.id, fecha: v.fecha, sitio: v.sitio, lugar: v.lugar, sector: v.sector,
    operario: [v.operario, v.acompanante].filter(Boolean).join(' y '), plaga: v.plaga, producto: v.producto, dosis: v.dosis, epp: v.epp, resultado: v.resultado, protocolo: v.protocolo, revisado: v.revisado || '' })) : []; }
  catch (e) { aviso = 'No se pudo leer el registro MIPyV (' + e.message + '). Se puede inspeccionar igual, sin elegir visita.'; }
  const ant = miLeer_('PLAGAS_REGISTROS').filter(r => limpio_(r.ESTABLECIMIENTO) === cod && r.TIPO === PINS.TIPO && regVivo_(r)).sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA))).slice(0, 15)
    .map(r => ({ id: r.ID, fecha: r.FECHA, sector: r.SECTOR, resultado: r.RESULTADO, quien: r.CARGO }));
  let sitios = []; try { sitios = miSitios_(cod); } catch (e) {}
  return { ok: true, items: pinsItems_().map(i => ({ codigo: i.CODIGO, punto: i.PUNTO, ayuda: i.AYUDA, critico: i.CRITICO === 'Sí', norma: i.NORMA })), visitas: visitas, anteriores: ant, sitios: sitios, aviso: aviso };
}

function plgInspGuardar_(cod, x, quien) {
  const items = pinsItems_(), R = {}; (x.respuestas || []).forEach(r => { if (r && r.codigo) R[r.codigo] = r; });
  const faltan = items.filter(i => !R[i.CODIGO] || PINS.RESP.indexOf(R[i.CODIGO].respuesta) < 0);
  if (faltan.length) return { ok: false, mensaje: 'Falta contestar ' + faltan.length + ' punto(s), por ejemplo: «' + faltan[0].PUNTO + '».' };
  const sinNota = items.filter(i => R[i.CODIGO].respuesta === 'No' && !limpio_(R[i.CODIGO].nota));
  if (sinNota.length) return { ok: false, mensaje: 'Cada «No» necesita una nota que diga qué se vio: falta en «' + sinNota[0].PUNTO + '».' };
  if (!limpio_(x.SECTOR)) return { ok: false, mensaje: 'Falta el sector inspeccionado.' };
  if (!limpio_(x.OPERARIO)) return { ok: false, mensaje: 'Falta quién hizo el trabajo (operario o empresa).' };
  const si = items.filter(i => R[i.CODIGO].respuesta === 'Sí').length, no = items.filter(i => R[i.CODIGO].respuesta === 'No');
  const critNo = no.filter(i => i.CRITICO === 'Sí'), pct = si + no.length ? Math.round(1000 * si / (si + no.length)) / 10 : '';
  const resultado = critNo.length ? 'No conforme' : no.length ? 'Con observaciones' : 'Conforme';
  const L = miLeer_('PLAGAS_REGISTROS'), id = miId_('INSP', cod, L.filter(r => r.TIPO === PINS.TIPO), 'ID'), fecha = x.FECHA || miHoy_();
  const url = x.archivo && x.archivo.base64 ? miArchivo_(cod, 'Plagas', 'Inspecciones HyS', Object.assign({ nombre: 'Inspeccion_' + id }, x.archivo)) : '';
  const visita = limpio_(x.VISITA);
  miAgregar_('PLAGAS_REGISTROS', { ID: id, CASO: limpio_(x.CASO), FECHA: fecha, TIPO: PINS.TIPO, ESTABLECIMIENTO: cod, SITIO: limpio_(x.SITIO), SECTOR: limpio_(x.SECTOR),
    ACCIONES: 'Control del trabajo de ' + limpio_(x.OPERARIO) + (visita ? ' · visita MIPyV ' + visita : '') + (limpio_(x.PRODUCTO) ? ' · producto: ' + limpio_(x.PRODUCTO) : ''),
    QUIMICO: limpio_(x.PRODUCTO) ? 'Sí' : 'No', PRODUCTO: limpio_(x.PRODUCTO), RESULTADO: resultado + (pct !== '' ? ' · ' + String(pct).replace('.', ',') + ' %' : ''),
    DECISION: no.map(i => i.CODIGO).join(', '), PROXIMA_REVISION: '', ARCHIVO: url, CARGO: quien, CARGADO: miHoy_(),
    OBSERVACIONES: [limpio_(x.OBSERVACIONES), no.length ? 'No cumple: ' + no.map(i => i.CODIGO + ' (' + limpio_(R[i.CODIGO].nota) + ')').join('; ') : ''].filter(Boolean).join(' · ') });
  const sh = pinsRespHoja_(), hoy = new Date();
  sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, items.length, PINS.H_RESP.length).setValues(items.map(i => [id, cod, fecha, i.CODIGO, i.PUNTO, R[i.CODIGO].respuesta, limpio_(R[i.CODIGO].nota), hoy]));
  let marca = '';
  if (visita && typeof plagRevisar_ === 'function') { try { const r = plagRevisar_({ id: visita, nota: 'Inspección ' + id + ' · ' + resultado + (no.length ? ' (' + no.map(i => i.CODIGO).join(', ') + ')' : '') }); marca = r.ok ? 'La visita quedó marcada como revisada en el portal.' : (r.mensaje || ''); } catch (e) { marca = 'No se pudo marcar la visita en MIPyV: ' + e.message; } }
  try { if (typeof pcBump_ === 'function') pcBump_(); CacheService.getScriptCache().remove('mipyv'); } catch (e) {}
  return { ok: true, id: id, resultado: resultado, pct: pct, marca: marca };
}

// Entrada desde Codigo.gs (solo clave de Higiene y Seguridad)
function plgInspRed_(d, acc) {
  if (!acc || !acc.maestra) return { ok: false, error: 'permiso', mensaje: 'La inspección de plagas la carga Higiene y Seguridad.' };
  const cod = limpio_(d.est), x = d.datos || {};
  if (d.accion === 'm_plg_insp_datos') return plgInspDatos_(cod);
  if (d.accion === 'm_plg_insp_guardar') return conLock_(() => plgInspGuardar_(cod, x, limpio_(x.quien) || 'Higiene y Seguridad'));
  return { ok: false, error: 'Acción desconocida.' };
}

// Prueba desde el editor (solo lee): puntos y visitas del HMH
function probarInspeccionPlagas() { const r = plgInspDatos_('HMH'); Logger.log(JSON.stringify({ puntos: r.items.length, visitas: r.visitas.length, anteriores: r.anteriores.length, aviso: r.aviso })); }
