/**
 * MIPyV Red HZT — Cierre de casos y solicitudes a Higiene y Seguridad
 * Versión 0 (25/10/2026, pedido de Belén). Va en el mismo proyecto de Apps Script que Código.gs
 * (planilla «MIP RED HZT - Base de Datos v2» › Extensiones › Apps Script).
 *
 * 1) CASOS: un caso es una intervención MIPyV (visitas con el mismo protocolo o marcadas como continuación).
 *    Queda abierto si su última visita dice «Requiere otra visita». Vence en la fecha de 2.ª intervención
 *    o a los DIAS_SEGUIMIENTO_POR_DEFECTO días. Desde 3 días antes (DIAS_POR_VENCER) la app de los operarios
 *    lo muestra como «revisar urgente» y pide indicar el cierre:
 *      · Resuelto
 *      · No resuelto, por: el biocida no hizo efecto / falta de herramientas o insumos (biocidas) / otro (explicar)
 *    El cierre queda en la hoja «cierres_casos» y el caso deja de figurar abierto (si después se carga
 *    otra visita del mismo caso, se vuelve a abrir). Belén también puede cerrar casos desde el Portal HyS.
 * 2) SOLICITUDES A HyS: desde la app, los operarios reiteran pedidos de biocidas (cuál y cuánto), EPP,
 *    piden que se gestione un aviso en un establecimiento (hospital, dependencia o CAPS) o dejan registro de una
 *    novedad, con hasta 5 fotos. No son urgencias: quedan registradas para que HyS las gestione.
 *    Quedan en la hoja «solicitudes» (estado Pendiente). Belén responde desde el Portal HyS y la respuesta
 *    les aparece en la app.
 * No manda correos.
 *
 * Enganches en Código.gs: doPost (tipos «cierre_caso» y «solicitud»), doGet (out.casos, out.solicitudes,
 * out.cierres) e intervencionesMipyv (un caso cerrado no figura abierto).
 */

const SHEET_CIERRES = "cierres_casos";
const SHEET_SOLICITUDES = "solicitudes";
const COLS_CIERRES = ["id_cierre", "fecha", "operario", "protocolo", "alias", "id_ultima_visita", "establecimiento", "tipo_plaga",
  "resultado_cierre", "motivo", "detalle", "foto_url", "origen", "revisado_hys"];
const COLS_SOLICITUDES = ["id_solicitud", "fecha", "operario", "tipo", "id_establecimiento", "establecimiento", "que", "cantidad",
  "detalle", "foto_url", "estado", "respuesta_hys", "fecha_respuesta"];
const DIAS_POR_VENCER = 3;
const MOTIVOS_NO_RESUELTO = ["El biocida no hizo efecto", "Falta de herramientas o insumos (biocidas)", "Otro"];
const TIPOS_SOLICITUD = ["Biocidas", "EPP", "Aviso en un establecimiento", "Novedad", "Aviso en un CAPS", "Novedad importante"];   // los dos últimos: nombres viejos (25/10/2026)

// Crea la hoja si falta y agrega al final las columnas que falten (no borra nada)
function hojaCon_(ss, nombre, cols) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.getRange(1, 1, 1, cols.length).setValues([cols]); sh.setFrozenRows(1); return sh; }
  const lc = Math.max(sh.getLastColumn(), 1), h = sh.getRange(1, 1, 1, lc).getValues()[0];
  const faltan = cols.filter((c) => h.indexOf(c) === -1);
  if (faltan.length) sh.getRange(1, h.filter(String).length ? lc + 1 : 1, 1, faltan.length).setValues([faltan]);
  return sh;
}
function filasComoObjetos_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues(), h = v[0];
  return v.slice(1).filter((r) => r[0] !== "").map((r, i) => {
    const o = { _fila: i + 2 }; h.forEach((k, j) => { if (k) o[k] = r[j] instanceof Date ? r[j].toISOString() : r[j]; }); return o;
  });
}

let CIERRES_CACHE_ = null;
function cierresCasos_(ss) {
  if (!CIERRES_CACHE_) CIERRES_CACHE_ = filasComoObjetos_(ss.getSheetByName(SHEET_CIERRES));
  return CIERRES_CACHE_;
}
// Cierre de un caso: el último registrado DESPUÉS de su última visita (si hubo otra visita después, el caso se reabre)
function cierreDelCaso_(ss, alias, fechaUltima) {
  const set = {}; (alias || []).forEach((a) => { if (a) set[String(a).trim()] = 1; });
  const desde = new Date(fechaUltima).getTime() - 60000;
  const c = cierresCasos_(ss).filter((x) => {
    const ps = [x.protocolo].concat(String(x.alias || "").split(" | ")).concat(x.id_ultima_visita ? ["PENDIENTE-" + x.id_ultima_visita] : []);
    return ps.some((p) => set[String(p).trim()]) && new Date(x.fecha).getTime() >= desde;
  });
  return c.length ? c[c.length - 1] : null;
}

function limiteCaso_(u) {
  let l = u.fecha_2da_intervencion ? new Date(u.fecha_2da_intervencion) : null;
  if (!l || isNaN(l)) { l = new Date(u.fecha); l.setDate(l.getDate() + DIAS_SEGUIMIENTO_POR_DEFECTO); }
  return l;
}
const fechaCorta_ = (d) => Utilities.formatDate(new Date(d), ZONA_HORARIA, "yyyy-MM-dd");

// Casos abiertos, con su vencimiento (dias < 0 = vencido; urgente = vence en DIAS_POR_VENCER días o menos)
function casosParaApp_(ss) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return intervencionesMipyv(ss).filter((iv) => iv.abierta).map((iv) => {
    const u = iv.ultima, lim = limiteCaso_(u); lim.setHours(0, 0, 0, 0);
    const dias = Math.round((lim - hoy) / 86400000);
    return {
      protocolo: iv.protocolo, alias: iv.alias, id_ultima_visita: u.id_visita, visitas: iv.visitas || [],
      id_establecimiento: u.id_establecimiento, establecimiento: u.establecimiento, sector: String(u.sector || "").slice(0, 90),
      tipo_plaga: u.tipo_plaga, fecha_primera: fechaCorta_(iv.primera.fecha), fecha_ultima: fechaCorta_(u.fecha), vence: fechaCorta_(lim),
      dias: dias, urgente: dias <= DIAS_POR_VENCER, operario: u.operario, resumen: String(u.observaciones || "").slice(0, 260),
    };
  }).sort((a, b) => a.dias - b.dias);
}
function solicitudesParaApp_(ss) {
  const desde = Date.now() - 120 * 86400000;
  return filasComoObjetos_(ss.getSheetByName(SHEET_SOLICITUDES)).filter((s) => !s.fecha || new Date(s.fecha).getTime() >= desde || s.estado === "Pendiente")
    .map((s) => ({ id: s.id_solicitud, fila: s._fila, fecha: s.fecha, operario: s.operario, tipo: s.tipo, establecimiento: s.establecimiento, que: s.que, cantidad: s.cantidad,
      detalle: String(s.detalle || "").slice(0, 600), fotos: String(s.foto_url || "").split(/[\s,|]+/).filter((u) => /^https?:/.test(u)), estado: s.estado || "Pendiente",
      respuesta: s.respuesta_hys, fecha_respuesta: s.fecha_respuesta }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}
function cierresRecientes_(ss) {
  const desde = Date.now() - 60 * 86400000;
  return cierresCasos_(ss).filter((c) => new Date(c.fecha).getTime() >= desde).map((c) => ({ id: c.id_cierre, fecha: c.fecha, operario: c.operario, protocolo: c.protocolo,
    establecimiento: c.establecimiento, tipo_plaga: c.tipo_plaga, resultado: c.resultado_cierre, motivo: c.motivo, detalle: String(c.detalle || "").slice(0, 400),
    fotos: String(c.foto_url || "").split(/[\s,|]+/).filter((u) => /^https?:/.test(u)), origen: c.origen, revisado: c.revisado_hys }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

// doPost: tipo «cierre_caso» o «solicitud»
function guardarCasoOSolicitud_(ss, tipo, data) {
  const cierre = tipo === "cierre_caso";
  const sh = hojaCon_(ss, cierre ? SHEET_CIERRES : SHEET_SOLICITUDES, cierre ? COLS_CIERRES : COLS_SOLICITUDES);
  const campoId = cierre ? "id_cierre" : "id_solicitud";
  if (!data[campoId]) throw new Error("Falta " + campoId + ".");
  if (existeId(sh, campoId, data[campoId])) return { duplicado: true };
  if (cierre) {
    if (!/^(Resuelto|No resuelto)$/.test(data.resultado_cierre)) throw new Error("Falta indicar si quedó resuelto.");
    if (data.resultado_cierre === "No resuelto" && MOTIVOS_NO_RESUELTO.indexOf(data.motivo) === -1) throw new Error("Falta el motivo.");
    if (data.motivo === "Otro" && !String(data.detalle || "").trim()) throw new Error("Falta explicar el motivo.");
  } else if (TIPOS_SOLICITUD.indexOf(data.tipo) === -1) throw new Error("Falta el tipo de solicitud.");
  const fotos = listaDeFotos(data).slice(0, 5);
  const carpeta = Object.assign({}, data, { establecimiento: data.establecimiento || (cierre ? "Cierres de casos" : "Solicitudes a HyS") });
  const links = fotos.length ? guardarFotos(fotos, carpeta, data[campoId]) : [];
  const fila = Object.assign({}, data, { foto_url: links.join(SEPARADOR_LINKS) });
  if (Array.isArray(fila.alias)) fila.alias = fila.alias.join(" | ");
  if (cierre) { fila.revisado_hys = "Sin revisar"; fila.origen = fila.origen || "App MIPyV"; }
  else { fila.estado = "Pendiente"; fila.respuesta_hys = ""; fila.fecha_respuesta = ""; }
  agregarFila(sh, fila);
  if (cierre) { CIERRES_CACHE_ = null; try { actualizarSeguimientosVencidos(); } catch (e) { /* se rehace a las 7 h */ } }
  return { fotos: links.length };
}
