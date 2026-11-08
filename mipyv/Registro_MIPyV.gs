/**
 * MIPyV Red HZT — «TODO LO CARGADO»: una hoja del libro con todo lo que cargan Javier y Paulo en la app (07/11/2026, pedido de Belén:
 * «trabajos como los relevamientos y todo lo que cargan en la app deben estar en mi libro, para saber qué hicieron»).
 * Va en el mismo proyecto de Apps Script del libro «MIP RED HZT - Base de Datos v2», como archivo aparte.
 * Una fila por cosa cargada, con fecha, horario, operarios, qué hicieron, lugar y un resumen:
 *   plagas (visitas), saneamiento (inicio, avances, cierre), otros trabajos de HyS (incluye el control de extintores, con los
 *   extintores controlados, agregados o corregidos), relevamiento de edificios, tanques y cisternas (alta, relevamiento, limpieza,
 *   corrección), casos cerrados, solicitudes y avisos a HyS, y hallazgos.
 * El detalle completo y las fotos siguen en su hoja de siempre (visitas, avances_saneamiento, tareas_hys, relevamiento_edificio…)
 * o en el sistema HyS (tanques en la BASE COMÚN, extintores en PROTECCIÓN CONTRA INCENDIOS). Esta hoja es para leer: no editar.
 * doPost (Codigo_AppsScript.gs) anota cada envío que llega bien (anotarTodo_). Lo cargado antes del 07/11/2026 se suma con
 * completarTodoLoCargado() (menú MIPyV › «Rearmar TODO LO CARGADO»), que se puede correr las veces que haga falta: arma la hoja de cero.
 * El Portal HyS (3 · Plagas › «Qué hicieron y dónde») lee esta hoja para mostrar lo que no tiene hoja propia en el portal.
 * No envía correos.
 */
const SHEET_TODO = "TODO LO CARGADO";
const TODO_H = ["fecha", "dia", "horario", "operario", "operario_acompanante", "que", "lugar", "resumen", "fotos", "id", "tipo_registro", "recibido"];
const TODO_QUE = {
  visita: "Plagas", avance: "Saneamiento", trabajo_nuevo: "Saneamiento · inicio del trabajo", cierre_trabajo: "Saneamiento · trabajo terminado",
  tarea_hys: "Otros trabajos de HyS", hallazgo: "Hallazgo", relev_edificio: "Relevamiento de edificio",
  alta_tanque: "Tanques · alta y primer relevamiento", inspeccion_tanque: "Tanques · relevamiento de estado", limpieza_tanque: "Tanques · limpieza", editar_tanque: "Tanques · corrección de datos",
  cierre_caso: "Caso de plagas cerrado", solicitud: "Solicitud o aviso a HyS"
};

function todoHoja_(ss) {
  let sh = ss.getSheetByName(SHEET_TODO);
  if (!sh) {
    sh = ss.insertSheet(SHEET_TODO, 0);
    sh.getRange(1, 1, 1, TODO_H.length).setValues([TODO_H]).setFontWeight("bold").setBackground("#EAF3F6");
    sh.setFrozenRows(1); sh.setColumnWidth(6, 230); sh.setColumnWidth(7, 200); sh.setColumnWidth(8, 520);
    sh.getRange("A:A").setNumberFormat("dd/mm/yyyy HH:mm");
  }
  return sh;
}

const todoTxt_ = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const todoHora_ = (v) => v instanceof Date ? String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0") : todoTxt_(v);   // las horas de la hoja vienen como fecha de 1899
function todoFecha_(data) {
  const F = todoTxt_(data.FECHA || data.fecha_relevamiento);
  const f = data.fecha || data.fecha_inicio || data.fecha_fin || data.cargado;
  const d = f instanceof Date ? f : (f ? new Date(f) : null);
  if (d && !isNaN(d)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(F) && Utilities.formatDate(d, ZONA_HORARIA, "yyyy-MM-dd") !== F) return new Date(F + "T12:00:00-03:00");
    return d;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(F) ? new Date(F + "T12:00:00-03:00") : new Date();
}
const todoCorto_ = (s, n) => { s = todoTxt_(s); return s.length > (n || 400) ? s.slice(0, (n || 400) - 1) + "…" : s; };

// Una fila de la hoja para un registro de la app
function todoFila_(tipo, data, links) {
  const d = data || {}, t = todoTxt_, f = todoFecha_(d);
  const lugar = t(d.establecimiento || d.lugar || d.lugar_nombre || d.SITIO || "");
  let res = "";
  if (tipo === "visita") res = [t(d.sector) && "Sector: " + t(d.sector), t(d.tipo_plaga), t(d.producto) && "Producto: " + t(d.producto) + (t(d.dosis_aplicada) ? " (" + t(d.dosis_aplicada) + ")" : ""), t(d.resultado), t(d.observaciones)].filter(Boolean).join(" · ");
  else if (tipo === "avance") res = [t(Array.isArray(d.tareas) ? d.tareas.join(", ") : d.tareas), t(d.detalle), t(d.notas), t(d.producto_biocida) && "Biocida: " + t(d.producto_biocida), t(d.cierre)].filter(Boolean).join(" · ");
  else if (tipo === "trabajo_nuevo") res = "Empezó un trabajo de limpieza y saneamiento";
  else if (tipo === "cierre_trabajo") res = "Trabajo de saneamiento terminado (" + t(d.id_trabajo) + ")";
  else if (tipo === "tarea_hys") res = [t(d.tipo_tarea), t(d.detalle), t(d.hallazgos) && "Hallazgos: " + t(d.hallazgos), t(d.observaciones)].filter(Boolean).join(" · ");
  else if (tipo === "hallazgo") res = [t(d.sector), t(d.tipo_plaga), t(d.descripcion || d.detalle || d.observaciones)].filter(Boolean).join(" · ");
  else if (tipo === "relev_edificio") res = [t(d.parte) || "Todo el edificio", "Prioridad: " + (t(d.prioridad) || "s/d"),
    "Agua: " + (t(d.agua) || "s/d"), "Desagües: " + (t(d.desagues) || "s/d"), "Canaletas: " + (t(d.canaletas) || "s/d"), "Techos: " + (t(d.techos) || "s/d"),
    t(d.otros_riesgos) && !/^s\/d$/i.test(t(d.otros_riesgos)) && "Otros riesgos: " + t(d.otros_riesgos), t(d.observaciones)].filter(Boolean).join(" · ");
  else if (/_tanque$/.test(tipo)) res = [t(d.CODIGO_TANQUE) || t(d.UBICACION), t(d.TIPO), t(d.USO), t(d.CLORO_MG_L) && "Cloro: " + t(d.CLORO_MG_L) + " mg/l",
    tipo === "limpieza_tanque" && t(d.HORA_CORTE) && "Corte " + t(d.HORA_CORTE) + " a " + t(d.HORA_REHABILITACION), t(d.ESTADO), t(d.OBSERVACIONES)].filter(Boolean).join(" · ");
  else if (tipo === "cierre_caso") res = [t(d.tipo_plaga), t(d.resultado_cierre), t(d.motivo), t(d.detalle), t(d.protocolo) && "Caso " + t(d.protocolo)].filter(Boolean).join(" · ");
  else if (tipo === "solicitud") res = [t(d.tipo), t(d.que) && t(d.que) + (t(d.cantidad) ? " (" + t(d.cantidad) + ")" : ""), t(d.detalle)].filter(Boolean).join(" · ");
  const id = t(d.id_visita || d.id_avance || d.id_trabajo || d.id_tarea || d.id_hallazgo || d.id_relev || d.id_alta || d.id_insp || d.id_limpieza || d.id_edit || d.id_cierre || d.id_solicitud);
  return [f, Utilities.formatDate(f, ZONA_HORARIA, "dd/MM/yyyy"), [todoHora_(d.hora_inicio), todoHora_(d.hora_fin)].filter(Boolean).join(" a "), t(d.operario || d.operario_inicio), t(d.operario_acompanante),
    TODO_QUE[tipo] || tipo, lugar, todoCorto_(res, 600), (links || []).join(SEPARADOR_LINKS), id, tipo, new Date()];
}

// Desde doPost: anota un registro que llegó bien. Nunca corta el envío si falla.
function anotarTodo_(ss, tipo, data, links) {
  try {
    if (!TODO_QUE[tipo]) return;
    const sh = todoHoja_(ss || SpreadsheetApp.getActiveSpreadsheet()), fila = todoFila_(tipo, data, links);
    if (fila[9] && sh.getLastRow() > 1 && sh.getRange(2, 10, sh.getLastRow() - 1, 1).createTextFinder(fila[9]).matchEntireCell(true).findNext()) return;   // ya estaba
    sh.appendRow(fila);
  } catch (e) { console.log("TODO LO CARGADO: " + e); }
}

// Arma la hoja de cero con todo lo que hay en el libro (y los tanques cargados desde la app en la BASE COMÚN)
function completarTodoLoCargado() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), filas = [];
  const leer = (nombre) => { const sh = ss.getSheetByName(nombre); if (!sh || sh.getLastRow() < 2) return [];
    const v = sh.getDataRange().getValues(), H = v[0].map(h => String(h).trim()); return v.slice(1).filter(r => String(r[0]).trim() !== "").map(r => { const o = {}; H.forEach((h, i) => { if (h) o[h] = r[i]; }); return o; }); };
  const fotos = (o) => String(o.foto_url || "").split(/[\s,|]+/).filter(u => /^https?:/.test(u));
  leer(SHEET_VISITAS).forEach(o => filas.push(todoFila_("visita", o, fotos(o))));
  leer(SHEET_TRABAJOS).forEach(o => { filas.push(todoFila_("trabajo_nuevo", Object.assign({}, o, { fecha: o.fecha_inicio, operario: o.operario_inicio }), []));
    if (/cerrad/i.test(o.estado) && o.fecha_fin) filas.push(todoFila_("cierre_trabajo", Object.assign({}, o, { fecha: o.fecha_fin, operario: "", id_trabajo: o.id_trabajo + "-fin" }), [])); });
  leer(SHEET_AVANCES).forEach(o => filas.push(todoFila_("avance", o, fotos(o))));
  leer(SHEET_TAREAS).forEach(o => filas.push(todoFila_("tarea_hys", o, fotos(o))));
  leer(SHEET_HALLAZGOS).forEach(o => filas.push(todoFila_("hallazgo", o, fotos(o))));
  leer(typeof SHEET_EDIFICIO !== "undefined" ? SHEET_EDIFICIO : "relevamiento_edificio").forEach(o => filas.push(todoFila_("relev_edificio", Object.assign({}, o, { FECHA: o.fecha_relevamiento instanceof Date ? Utilities.formatDate(o.fecha_relevamiento, ZONA_HORARIA, "yyyy-MM-dd") : o.fecha_relevamiento, fecha: o.cargado }),
    ["fotos_agua", "fotos_desagues", "fotos_canaletas", "fotos_techos", "fotos_riesgos"].map(k => String(o[k] || "")).join(" ").split(/[\s,|]+/).filter(u => /^https?:/.test(u)))));
  leer(typeof SHEET_CIERRES !== "undefined" ? SHEET_CIERRES : "cierres_casos").forEach(o => filas.push(todoFila_("cierre_caso", o, fotos(o))));
  leer(typeof SHEET_SOLICITUDES !== "undefined" ? SHEET_SOLICITUDES : "solicitudes").forEach(o => filas.push(todoFila_("solicitud", o, fotos(o))));
  // Tanques y cisternas cargados desde la app (BASE COMÚN · Sistema HyS: AGUA_INSPECCIONES y AGUA_LIMPIEZAS, QUIEN «… · MIPyV»)
  try {
    const bc = SpreadsheetApp.openById(TQ_BC_ID);
    [["AGUA_INSPECCIONES", "inspeccion_tanque"], ["AGUA_LIMPIEZAS", "limpieza_tanque"]].forEach(([hoja, tipo]) => {
      const sh = bc.getSheetByName(hoja); if (!sh || sh.getLastRow() < 6) return;
      const v = sh.getRange(5, 1, sh.getLastRow() - 4, sh.getLastColumn()).getValues(), H = v[0].map(h => String(h).trim());
      v.slice(1).forEach(r => { const o = {}; H.forEach((h, i) => { if (h) o[h] = r[i]; });
        const q = String(o.QUIEN || o.CARGO || o.RESPONSABLE || ""); if (!/mipyv/i.test(q)) return;
        const op = q.replace(/\s*·\s*MIPyV.*$/i, ""), m = /^(.*?)\s*\(con (.*)\)\s*$/.exec(op);
        filas.push(todoFila_(tipo, Object.assign({}, o, { fecha: o.CARGADO || o.FECHA, FECHA: o.FECHA instanceof Date ? Utilities.formatDate(o.FECHA, ZONA_HORARIA, "yyyy-MM-dd") : String(o.FECHA || "").slice(0, 10),
          operario: m ? m[1] : op, operario_acompanante: m ? m[2] : "", lugar: [o.ESTABLECIMIENTO, o.SITIO].filter(Boolean).join(" · "), id_insp: o.ID || "" }),
          String(o.FOTOS || o.ARCHIVO || "").split(/[\s,|]+/).filter(u => /^https?:/.test(u)))); });
    });
  } catch (e) { console.log("Tanques: " + e); }
  filas.sort((a, b) => a[0] - b[0]);
  const sh = todoHoja_(ss);
  // Horarios cargados a mano (portal › Control de horas › «Cargar horario») o que solo están en esta hoja (tanques): se conservan (08/11/2026)
  if (sh.getLastRow() > 1) { const prev = {}; sh.getRange(2, 1, sh.getLastRow() - 1, TODO_H.length).getValues().forEach(r => { if (r[9] && r[2]) prev[String(r[9])] = r[2]; });
    filas.forEach(f => { if (!f[2] && prev[f[9]]) f[2] = prev[f[9]]; }); }
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, TODO_H.length).clearContent();
  if (filas.length) sh.getRange(2, 1, filas.length, TODO_H.length).setValues(filas);
  sh.getRange("A:A").setNumberFormat("dd/mm/yyyy HH:mm"); sh.getRange("L:L").setNumberFormat("dd/mm/yyyy HH:mm");
  try { SpreadsheetApp.getUi().alert("TODO LO CARGADO: " + filas.length + " registros."); } catch (e) {}
  return filas.length;
}
