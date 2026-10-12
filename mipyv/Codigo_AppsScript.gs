/**
 * MIPyV Red HZT — Backend Apps Script
 * -----------------------------------
 * Este script va PEGADO en el editor de Apps Script de la planilla
 * "MIP RED HZT - Base de Datos v2" (Extensiones > Apps Script).
 *
 * Qué hace:
 *  - doPost(e): recibe cada visita/hallazgo enviado desde la app del
 *    operario y agrega una fila nueva en la hoja correspondiente.
 *  - doGet(e): devuelve los catálogos (productos, plagas, dosis_frecuencia,
 *    establecimientos, sectores) en JSON, para que la app pueda
 *    refrescarlos sin que tengas que tocar el código.
 *
 * Ver GUIA_DESPLIEGUE.md para los pasos de implementación (deploy).
 */

const SHEET_VISITAS = "visitas";
const SHEET_HALLAZGOS = "hallazgos";
const SHEET_TRABAJOS = "trabajos_saneamiento";
const SHEET_AVANCES = "avances_saneamiento";

/**
 * Ejecutar UNA VEZ manualmente desde el editor de Apps Script
 * (seleccionar esta función en el desplegable de arriba > Ejecutar)
 * antes de usar el módulo de Limpieza y Saneamiento. Crea las dos
 * hojas nuevas si todavía no existen, con sus encabezados.
 */
function setupSaneamientoSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(SHEET_TRABAJOS)) {
    const sh = ss.insertSheet(SHEET_TRABAJOS);
    sh.appendRow([
      "id_trabajo", "id_establecimiento", "establecimiento", "fecha_inicio",
      "fecha_fin", "estado", "operario_inicio",
    ]);
  }

  if (!ss.getSheetByName(SHEET_AVANCES)) {
    const sh = ss.insertSheet(SHEET_AVANCES);
    sh.appendRow([
      "id_avance", "id_trabajo", "fecha", "id_operario", "operario",
      "id_establecimiento", "establecimiento", "tareas", "detalle",
      "foto_url", "cierre",
    ]);
  }

  SpreadsheetApp.getUi().alert("Listo: hojas de Saneamiento creadas/verificadas.");
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const tipo = body.tipo; // "visita" | "hallazgo" | "trabajo_nuevo" | "avance" | "cierre_trabajo"
    const data = body.data;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (tipo === "trabajo_nuevo") {
      appendByHeaders(ss, SHEET_TRABAJOS, {
        id_trabajo: data.id_trabajo,
        id_establecimiento: data.id_establecimiento,
        establecimiento: data.establecimiento,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: "",
        estado: "Abierto",
        operario_inicio: data.operario_inicio,
      });
      return okResponse();
    }

    if (tipo === "cierre_trabajo") {
      marcarTrabajoCerrado(ss, data.id_trabajo, data.fecha_fin);
      return okResponse();
    }

    if (tipo === "avance") {
      appendByHeaders(ss, SHEET_AVANCES, {
        id_avance: data.id_avance,
        id_trabajo: data.id_trabajo,
        fecha: data.fecha,
        id_operario: data.id_operario,
        operario: data.operario,
        id_establecimiento: data.id_establecimiento,
        establecimiento: data.establecimiento,
        tareas: Array.isArray(data.tareas) ? data.tareas.join(", ") : data.tareas,
        detalle: data.detalle,
        foto_url: data.foto_base64 ? "adjunta (ver registro original)" : "",
        cierre: data.cierre,
      });
      return okResponse();
    }

    // tipo === "visita" | "hallazgo" (MIPyV)
    const sheetName = tipo === "hallazgo" ? SHEET_HALLAZGOS : SHEET_VISITAS;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("No existe la hoja: " + sheetName);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map((h) => {
      if (h === "epp_utilizado" && Array.isArray(data.epp_utilizado)) {
        return data.epp_utilizado.join(", ");
      }
      if (h === "revisado_hys") return "Sin revisar";
      if (h === "foto_url") return data.foto_base64 ? "adjunta (ver registro original)" : "";
      return data[h] !== undefined ? data[h] : "";
    });

    sheet.appendRow(row);

    if (tipo === "visita" && data.id_hallazgo_asociado) {
      marcarHallazgoAtendido(ss, data.id_hallazgo_asociado, data.id_visita);
    }

    return okResponse();
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function okResponse() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendByHeaders(ss, sheetName, obj) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("No existe la hoja: " + sheetName + " — ejecutá setupSaneamientoSheets() primero.");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map((h) => (obj[h] !== undefined ? obj[h] : ""));
  sheet.appendRow(row);
}

function marcarTrabajoCerrado(ss, idTrabajo, fechaFin) {
  const sheet = ss.getSheetByName(SHEET_TRABAJOS);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colId = headers.indexOf("id_trabajo");
  const colEstado = headers.indexOf("estado");
  const colFechaFin = headers.indexOf("fecha_fin");
  for (let r = 1; r < values.length; r++) {
    if (values[r][colId] === idTrabajo) {
      sheet.getRange(r + 1, colEstado + 1).setValue("Cerrado");
      sheet.getRange(r + 1, colFechaFin + 1).setValue(fechaFin);
      break;
    }
  }
}

function marcarHallazgoAtendido(ss, idHallazgo, idVisita) {
  const sheet = ss.getSheetByName(SHEET_HALLAZGOS);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colId = headers.indexOf("id_hallazgo");
  const colEstado = headers.indexOf("estado");
  const colVisita = headers.indexOf("id_visita_asociada");
  for (let r = 1; r < values.length; r++) {
    if (values[r][colId] === idHallazgo) {
      sheet.getRange(r + 1, colEstado + 1).setValue("Atendido");
      sheet.getRange(r + 1, colVisita + 1).setValue(idVisita);
      break;
    }
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const catalogos = ["productos", "plagas", "dosis_frecuencia", "establecimientos", "sectores"];
  const out = {};
  catalogos.forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    out[name] = values.slice(1).filter(r => r[0] !== "").map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
  });

  // trabajos de saneamiento abiertos — para que el otro operario los vea al elegir "continuar"
  const trabajosSheet = ss.getSheetByName(SHEET_TRABAJOS);
  if (trabajosSheet) {
    const values = trabajosSheet.getDataRange().getValues();
    const headers = values[0];
    const colEstado = headers.indexOf("estado");
    out.trabajos_abiertos = values.slice(1)
      .filter(r => r[0] !== "" && r[colEstado] === "Abierto")
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      });
  }

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Alerta diaria de seguimiento (2da intervención vencida).
 * Configurar como disparador (trigger) diario desde el editor de Apps Script:
 * Triggers > Add trigger > alertaSeguimientoDiaria > Time-driven > Day timer.
 */
function alertaSeguimientoDiaria() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_VISITAS);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colFecha2da = headers.indexOf("fecha_2da_intervencion");
  const colResultado = headers.indexOf("resultado");
  const colEstablecimiento = headers.indexOf("establecimiento");
  const colSector = headers.indexOf("sector");
  const colPlaga = headers.indexOf("tipo_plaga");

  const hoy = new Date();
  const vencidas = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (row[colResultado] !== "Requiere otra visita") continue;
    const fecha2da = row[colFecha2da];
    if (!fecha2da) continue;
    const fechaLimite = new Date(fecha2da);
    if (fechaLimite < hoy) {
      vencidas.push(`${row[colEstablecimiento]} · ${row[colSector]} · ${row[colPlaga]} (vencía ${fecha2da})`);
    }
  }

  if (vencidas.length === 0) return;

  const destinatario = Session.getEffectiveUser().getEmail(); // o reemplazar por el mail de HyS
  MailApp.sendEmail(
    destinatario,
    `MIPyV — ${vencidas.length} seguimiento(s) vencido(s)`,
    "Los siguientes seguimientos de 2da intervención están vencidos:\n\n" + vencidas.join("\n")
  );
}
