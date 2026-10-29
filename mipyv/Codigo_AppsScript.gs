/**
 * MIPyV Red HZT — Servidor (Apps Script)
 * Versión del servidor: 2026-10-09b (las otras tareas de HyS no van en el resumen diario)
 * ----------------------------------------------------------------
 * Va PEGADO en la planilla "MIP RED HZT - Base de Datos v2"
 * (Extensiones > Apps Script), reemplazando todo el código anterior.
 *
 * Qué hace:
 *  - doPost(e): recibe cada registro que manda la app (visita, hallazgo,
 *    trabajo nuevo, avance, cierre de trabajo, otra tarea de HyS), guarda las fotos en Drive
 *    y agrega la fila en la hoja que corresponde. Responde { ok: true }
 *    solo si todo quedó guardado; si algo falla responde { ok: false } y
 *    la app vuelve a intentar más tarde.
 *  - doGet(e): devuelve los catálogos y los trabajos abiertos (sin cambios).
 *  - actualizarSeguimientosVencidos(): escribe la lista en la hoja
 *    "seguimientos_vencidos".
 *  - enviarResumenDiario(): una sola vez por día manda lo registrado ese día:
 *    · resumen completo a la Dirección Asociada Administrativa y a HyS;
 *    · a cada establecimiento, solo lo que se hizo en él.
 *    · al Área Externa, solo lo hecho en los CAPS.
 *    Los correos se cargan en la planilla (hoja "configuracion" y columna
 *    mail_aviso de "establecimientos"). Nunca manda dos veces el mismo día.
 *  - enviarRecordatoriosOperarios(): de lunes a viernes a las 19 h, si un
 *    operario con correo (hoja "operarios", columna mail) y con SI en la
 *    columna recordatorio no tiene ningún trabajo registrado ese día, le
 *    recuerda la obligación de registrar.
 *  - instalarActivadores(): crea los tres activadores diarios (sin duplicar).
 *
 * Desde la planilla: menú "MIPyV" > Preparar planilla / Actualizar
 * seguimientos vencidos / Ayuda.
 */

const SHEET_VISITAS = "visitas";
const SHEET_HALLAZGOS = "hallazgos";
const SHEET_TRABAJOS = "trabajos_saneamiento";
const SHEET_AVANCES = "avances_saneamiento";
const SHEET_VENCIDOS = "seguimientos_vencidos";
const SHEET_CONFIG = "configuracion";
const SHEET_TAREAS = "tareas_hys";
const MAIL_RESUMEN_POR_DEFECTO = "belenpellegrini.hys@gmail.com";
const REMITENTE_POR_DEFECTO = "belenpellegrini.hys@gmail.com";
const CLAVES_CONFIG = [
  ["mail_remitente", REMITENTE_POR_DEFECTO, "Dirección desde la que SALEN todos los correos del sistema. Tiene que estar agregada en Gmail como «Enviar como». Si no está, salen desde la cuenta dueña de la planilla con respuesta a esta dirección."],
  ["mail_resumen_diario", MAIL_RESUMEN_POR_DEFECTO, "Correo de HyS que recibe el resumen diario completo. Varios: separados por coma. Vacío = no se envía."],
  ["mail_direccion_administrativa", "s/d", "Correo de la Dirección Asociada Administrativa: recibe SIEMPRE el resumen diario completo. Varios: separados por coma."],
  ["mail_resumen_caps", "s/d", "Correo del Área Externa: recibe el resumen diario de lo hecho en los CAPS (los días en que hubo trabajos en algún CAPS)."],
];

const CARPETA_FOTOS = "MIPyV Red HZT - Fotos"; // carpeta raíz en Drive
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const SEPARADOR_LINKS = " | ";

// Si una visita "Requiere otra visita" no tiene fecha de 2da intervención
// cargada, se considera vencida pasados estos días. Se puede cambiar acá.
const DIAS_SEGUIMIENTO_POR_DEFECTO = 15;

// Columnas que la app manda y que tienen que existir en cada hoja.
// "Preparar planilla" agrega al final las que falten (no borra ni mueve nada).
const COLUMNAS = {
  [SHEET_VISITAS]: [
    "id_visita", "fecha", "id_operario", "operario", "operario_acompanante",
    "id_establecimiento", "establecimiento", "tipo_establecimiento", "sector",
    "id_plaga", "tipo_plaga", "id_producto", "producto", "dosis_aplicada",
    "frecuencia_recomendada", "puntos_criticos", "epp_utilizado", "resultado",
    "observaciones", "protocolo_existente", "hora_inicio", "hora_fin",
    "hora_inicio_acompanante", "hora_fin_acompanante", "foto_url", "revisado_hys",
  ],
  [SHEET_TRABAJOS]: [
    "id_trabajo", "id_establecimiento", "establecimiento", "fecha_inicio",
    "fecha_fin", "estado", "operario_inicio",
  ],
  [SHEET_AVANCES]: [
    "id_avance", "id_trabajo", "fecha", "id_operario", "operario",
    "operario_acompanante", "id_establecimiento", "establecimiento", "tareas",
    "detalle", "notas", "epp_utilizado", "producto_biocida", "dosis_biocida",
    "frecuencia_biocida", "hora_inicio", "hora_fin", "hora_inicio_acompanante",
    "hora_fin_acompanante", "foto_url", "cierre",
  ],
  [SHEET_TAREAS]: [
    "id_tarea", "fecha", "operario", "operario_acompanante", "hora_inicio",
    "hora_fin", "id_establecimiento", "establecimiento", "tipo_tarea", "detalle",
    "hallazgos", "foto_url", "observaciones", "revisado_hys",
  ],
};

// Lista de tipos de tarea de HyS. Se edita en la hoja "configuracion":
// una fila por tipo, con "tipo_tarea" en la columna clave y el nombre en valor.
// Si la hoja no tiene ninguna, se usa esta lista.
const TIPOS_TAREA_POR_DEFECTO = [
  "Control de extintores", "Señalización", "Recorrida de seguridad",
  "Traslado de residuos", "Otra",
];
// En una tarea con varios lugares, los id y nombres van separados así:
const SEPARADOR_LUGARES = " | ";

// Campo que identifica cada registro (para no cargarlo dos veces si la app
// reintenta un envío que en realidad ya había llegado).
const ID_POR_HOJA = {
  [SHEET_VISITAS]: "id_visita",
  [SHEET_HALLAZGOS]: "id_hallazgo",
  [SHEET_TRABAJOS]: "id_trabajo",
  [SHEET_AVANCES]: "id_avance",
  [SHEET_TAREAS]: "id_tarea",
};

// ============================================================
// MENÚ EN LA PLANILLA
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("MIPyV")
    .addItem("Preparar planilla (hojas y columnas)", "prepararPlanilla")
    .addItem("Actualizar seguimientos vencidos", "actualizarSeguimientosVencidos")
    .addItem("Enviar el resumen de hoy ahora", "enviarResumenManual")
    .addItem("Instalar avisos automáticos (activadores)", "instalarActivadores")
    .addItem("Comprobar desde qué correo se envía", "comprobarRemitente")
    .addSeparator()
    .addItem("Ayuda", "mostrarAyuda")
    .addToUi();
}

function mostrarAyuda() {
  const texto = [
    "Listas de la app (operarios, establecimientos, sectores, plagas, productos, dosis_frecuencia): se editan en su hoja. Para que algo no aparezca en la app, poner NO en la columna activo (o Inactivo en estado, en productos). La app toma los cambios la próxima vez que se abre con señal.",
    "",
    "Preparar planilla: crea las hojas que falten y agrega al final las columnas que falten. No borra datos. Usarla después de cada actualización del sistema.",
    "",
    "Actualizar seguimientos vencidos: rehace la hoja \"seguimientos_vencidos\" con las visitas que piden otra visita y ya pasaron la fecha. También se actualiza sola una vez por día si está el activador.",
    "",
    "Fotos: quedan en Drive, carpeta \"" + CARPETA_FOTOS + "\" > establecimiento > fecha. Los enlaces están en la columna foto_url, separados por \" | \".",
    "",
    "Resumen diario por mail (una sola vez por día, al final de la jornada): el resumen completo va a la Dirección Asociada Administrativa y a HyS (correos en la hoja \"configuracion\"); cada establecimiento recibe solo lo que se hizo en él (correo en la columna mail_aviso de \"establecimientos\"). Un correo vacío o \"s/d\" no recibe nada. Desde el menú se puede pedir el de hoy en cualquier momento.",
    "",
    "Otras tareas de Higiene y Seguridad (control de extintores, señalización, etc.): quedan en la hoja \"tareas_hys\" y NO se informan en el resumen diario (solo cuentan para el recordatorio a operarios). Una tarea puede abarcar varios lugares: sus id y nombres van separados por \" | \". En control de extintores, la app muestra los extintores de cada lugar (del módulo 10 del sistema HyS): por cada uno 5 preguntas, 3 fotos (de lejos, la tarjeta y el número de inventario) y un comentario opcional. Si falta un extintor en la lista, se agrega desde la app con todos sus datos y las 3 fotos (obligatorio): queda en la hoja EXTINTORES del módulo 10. La app marca la carga vencida y la que vence en 30 días. También se puede corregir el N.º de puesto y la ubicación de un extintor: queda pendiente de verificar por Belén en el portal. Desde el 29/10/2026 MIPyV no escribe en la planilla de incendio: todo pasa por el Portal HyS (Incendio_MIPyV.gs, propiedad PORTAL_CLAVE), con las mismas reglas que «Mi establecimiento» (N.º de puesto único, inventario sin repetir, plantas, fechas entre 2020 y 2040, dependencias de la Sede ex ADOS). Los lugares se vinculan con codigo_sistema, sitio_sistema y dependencia_sistema de la hoja establecimientos. La lista de tipos de tarea se edita en \"configuracion\": una fila por tipo, con tipo_tarea en la columna clave.",
    "",
    "Recordatorio a operarios: de lunes a viernes a las 19 h, a cada operario con correo en la hoja \"operarios\" (columna mail) y SI en la columna recordatorio que no haya registrado ningún trabajo ese día, le llega un mail recordando que el registro diario es obligatorio. Si trabajó acompañado y cargó el otro, no le llega. Para activarlo o desactivarlo, poner SI o NO en recordatorio.",
    "",
    "Instalar avisos automáticos: crea los activadores diarios (seguimientos 7 h, recordatorio 19 h, resumen 20 h). Se puede usar las veces que haga falta: no los duplica.",
    "",
    "Remitente: todos los correos salen desde la dirección de la clave mail_remitente (hoja \"configuracion\"), hoy belenpellegrini.hys@gmail.com. Con «Comprobar desde qué correo se envía» se ve si está bien configurado.",
    "",
    "revisado_hys: cada registro nuevo entra como \"Sin revisar\". Cambialo a mano cuando lo revises.",
    "",
    "Si la app de los operarios no funciona, se puede cargar una fila a mano en la hoja correspondiente, respetando los encabezados.",
  ].join("\n");
  SpreadsheetApp.getUi().alert("Ayuda — MIPyV Red HZT", texto, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================================
// PREPARAR PLANILLA (reemplaza a setupSaneamientoSheets)
// ============================================================
function prepararPlanilla() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const agregadas = [];
  Object.keys(COLUMNAS).forEach((nombreHoja) => {
    let sh = ss.getSheetByName(nombreHoja);
    if (!sh) {
      sh = ss.insertSheet(nombreHoja);
      sh.appendRow(COLUMNAS[nombreHoja]);
      agregadas.push("Hoja nueva: " + nombreHoja);
      return;
    }
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    const faltan = COLUMNAS[nombreHoja].filter((c) => headers.indexOf(c) === -1);
    if (faltan.length) {
      const desde = headers.filter((h) => h !== "").length === 0 ? 1 : lastCol + 1;
      sh.getRange(1, desde, 1, faltan.length).setValues([faltan]);
      agregadas.push(nombreHoja + ": " + faltan.join(", "));
    }
  });
  // hoja de configuración: agrega las claves que falten, sin tocar las cargadas
  let cfg = ss.getSheetByName(SHEET_CONFIG);
  if (!cfg) {
    cfg = ss.insertSheet(SHEET_CONFIG);
    cfg.getRange(1, 1, 1, 3).setValues([["clave", "valor", "para qué sirve"]]);
    agregadas.push("Hoja nueva: " + SHEET_CONFIG);
  }
  const clavesCargadas = cfg.getDataRange().getValues().map((r) => String(r[0]).trim());
  CLAVES_CONFIG.forEach((c) => {
    if (clavesCargadas.indexOf(c[0]) === -1) { cfg.appendRow(c); agregadas.push("configuracion: " + c[0]); }
  });
  if (clavesCargadas.indexOf("tipo_tarea") === -1) {
    TIPOS_TAREA_POR_DEFECTO.forEach((t) => cfg.appendRow(["tipo_tarea", t, "Tipo de tarea que aparece en la app en «Otra tarea de Higiene y Seguridad». Una fila por tipo. Para sacar uno, borrar la fila."]));
    agregadas.push("configuracion: tipos de tarea de HyS");
  }
  // columna de correo por operario
  const ops = ss.getSheetByName("operarios");
  if (ops) {
    const hOps = ops.getRange(1, 1, 1, ops.getLastColumn()).getValues()[0];
    if (hOps.indexOf("mail") === -1) {
      const col = ops.getLastColumn() + 1;
      ops.getRange(1, col).setValue("mail");
      if (ops.getLastRow() > 1) ops.getRange(2, col, ops.getLastRow() - 1, 1).setValue("s/d");
      agregadas.push("operarios: mail");
    }
    const hOps2 = ops.getRange(1, 1, 1, ops.getLastColumn()).getValues()[0];
    if (hOps2.indexOf("recordatorio") === -1) {
      const col = ops.getLastColumn() + 1;
      ops.getRange(1, col).setValue("recordatorio");
      if (ops.getLastRow() > 1) ops.getRange(2, col, ops.getLastRow() - 1, 1).setValue("NO");
      agregadas.push("operarios: recordatorio");
    }
  }
  // columna de correo por establecimiento
  const est = ss.getSheetByName("establecimientos");
  if (est) {
    const hEst = est.getRange(1, 1, 1, est.getLastColumn()).getValues()[0];
    if (hEst.indexOf("mail_aviso") === -1) {
      const col = est.getLastColumn() + 1;
      est.getRange(1, col).setValue("mail_aviso");
      if (est.getLastRow() > 1) est.getRange(2, col, est.getLastRow() - 1, 1).setValue("s/d");
      agregadas.push("establecimientos: mail_aviso");
    }
  }
  carpetaRaizFotos(); // la crea si no existe
  SpreadsheetApp.getUi().alert(
    "Planilla preparada",
    agregadas.length ? "Se agregó:\n\n" + agregadas.join("\n") : "Estaba todo en orden; no hizo falta agregar nada.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// Se mantiene con el nombre viejo por si quedó anotado en algún lado.
function setupSaneamientoSheets() { prepararPlanilla(); }

// ============================================================
// RECEPCIÓN DE DATOS DESDE LA APP
// ============================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    const tipo = body.tipo; // "visita" | "hallazgo" | "trabajo_nuevo" | "avance" | "cierre_trabajo" | "tarea_hys" | "control_extintor" | "alta_extintor" | "editar_extintor" | "alta_tanque" | "editar_tanque" | "inspeccion_tanque" | "limpieza_tanque"
    const data = body.data || {};

    // Espera hasta 30 s a que termine otro envío, para que no se pisen.
    if (!lock.tryLock(30000)) throw new Error("Servidor ocupado, se reintenta.");

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (tipo === "cierre_trabajo") {
      const encontrado = marcarTrabajoCerrado(ss, data.id_trabajo, data.fecha_fin);
      return respuesta({ ok: true, aviso: encontrado ? "" : "Trabajo no encontrado en la planilla" });
    }
    if (tipo === "editar_extintor") {   // corrección de nombre o ubicación de un extintor → módulo 10 (Incendio_MIPyV.gs)
      const r = guardarEdicionExtintor_(data);
      return respuesta(Object.assign({ ok: true }, r));
    }
    if (tipo === "alta_extintor") {   // extintor agregado desde la app → módulo 10 del sistema HyS (Incendio_MIPyV.gs)
      const r = guardarAltaExtintor_(data);
      return respuesta(Object.assign({ ok: true }, r));
    }
    if (tipo === "control_extintor") {   // control de un extintor → módulo 10 del sistema HyS (Incendio_MIPyV.gs)
      const r = guardarControlExtintor_(data);
      return respuesta(Object.assign({ ok: true }, r));
    }


    if (tipo === "alta_tanque" || tipo === "editar_tanque" || tipo === "inspeccion_tanque" || tipo === "limpieza_tanque") {   // tanques y cisternas de la red Trelew → BASE COMÚN del sistema HyS (Tanques_MIPyV.gs, 28/10/2026)
      const r = guardarTanqueMipyv_(tipo, data);
      return respuesta(Object.assign({ ok: true }, r));
    }
    if (tipo === "cierre_caso" || tipo === "solicitud") {   // cierre de casos y solicitudes a HyS (Casos_Solicitudes_MIPyV.gs, 25/10/2026)
      const r = guardarCasoOSolicitud_(ss, tipo, data);
      return respuesta(Object.assign({ ok: true }, r));
    }

    const nombreHoja = {
      trabajo_nuevo: SHEET_TRABAJOS,
      avance: SHEET_AVANCES,
      hallazgo: SHEET_HALLAZGOS,
      visita: SHEET_VISITAS,
      tarea_hys: SHEET_TAREAS,
    }[tipo];
    if (!nombreHoja) throw new Error("Tipo de registro desconocido: " + tipo);

    const sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) throw new Error("No existe la hoja " + nombreHoja + ". Usar MIPyV > Preparar planilla.");

    // ¿Ya estaba cargado? (la app reintentó un envío que había llegado)
    const campoId = ID_POR_HOJA[nombreHoja];
    if (campoId && data[campoId] && existeId(sheet, campoId, data[campoId])) {
      return respuesta({ ok: true, duplicado: true });
    }

    // Fotos: se guardan en Drive ANTES de escribir la fila.
    const fotos = listaDeFotos(data);
    // (una tarea en varios lugares guarda sus fotos en la carpeta "Varios lugares")
    const datosCarpeta = tipo === "tarea_hys" && String(data.id_establecimiento || "").indexOf(SEPARADOR_LUGARES.trim()) !== -1
      ? Object.assign({}, data, { establecimiento: "Varios lugares" }) : data;
    const links = fotos.length ? guardarFotos(fotos, datosCarpeta, data[campoId] || "registro") : [];

    const fila = Object.assign({}, data);
    if (tipo === "trabajo_nuevo") {
      fila.estado = "Abierto";
      fila.fecha_fin = "";
    }
    if (Array.isArray(fila.tareas)) fila.tareas = fila.tareas.join(", ");
    if (Array.isArray(fila.epp_utilizado)) fila.epp_utilizado = fila.epp_utilizado.join(", ");
    fila.foto_url = links.join(SEPARADOR_LINKS);
    if (tipo === "visita" || tipo === "hallazgo" || tipo === "tarea_hys") fila.revisado_hys = "Sin revisar";

    agregarFila(sheet, fila);

    if (tipo === "visita" && data.id_hallazgo_asociado) {
      marcarHallazgoAtendido(ss, data.id_hallazgo_asociado, data.id_visita);
    }

    return respuesta({ ok: true, fotos: links.length });
  } catch (err) {
    return respuesta({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* sin lock tomado */ }
  }
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Escribe la fila según los encabezados de la hoja. Los campos que no
// tienen columna se ignoran (por ejemplo las fotos en base64).
function agregarFila(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map((h) => {
    if (h === "" || h === "fotos_base64" || h === "foto_base64") return "";
    const v = obj[h];
    if (v === undefined || v === null) return "";
    return v;
  });
  sheet.appendRow(row);
}

function existeId(sheet, campoId, valor) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = headers.indexOf(campoId);
  if (col === -1) return false;
  const ids = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
  const buscado = String(valor);
  return ids.some((r) => String(r[0]) === buscado);
}

// ============================================================
// FOTOS EN DRIVE
// ============================================================
// Acepta el nombre nuevo (fotos_base64, lista) y el viejo (foto_base64).
function listaDeFotos(data) {
  if (Array.isArray(data.fotos_base64)) return data.fotos_base64.filter(Boolean);
  if (data.foto_base64) return [data.foto_base64];
  return [];
}

function carpetaRaizFotos() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("CARPETA_FOTOS_ID");
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (x) { /* la borraron: se crea de nuevo */ }
  }
  const existentes = DriveApp.getFoldersByName(CARPETA_FOTOS);
  const carpeta = existentes.hasNext() ? existentes.next() : DriveApp.createFolder(CARPETA_FOTOS);
  props.setProperty("CARPETA_FOTOS_ID", carpeta.getId());
  return carpeta;
}

function subcarpeta(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

// Guarda cada foto en: Fotos > establecimiento > AAAA-MM-DD
// y devuelve la lista de enlaces. Si la foto ya existía (reintento),
// reutiliza el archivo en vez de duplicarlo.
function guardarFotos(fotos, data, idRegistro) {
  const establecimiento = limpiarNombre(data.establecimiento || data.id_establecimiento || "Sin establecimiento");
  const fechaBase = data.fecha || data.fecha_inicio || new Date().toISOString();
  const dia = Utilities.formatDate(new Date(fechaBase), ZONA_HORARIA, "yyyy-MM-dd");
  const carpeta = subcarpeta(subcarpeta(carpetaRaizFotos(), establecimiento), dia);

  return fotos.map((dataUrl, i) => {
    const nombre = idRegistro + "_foto" + (i + 1) + ".jpg";
    const previo = carpeta.getFilesByName(nombre);
    if (previo.hasNext()) return previo.next().getUrl();

    const m = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
    const tipoMime = m ? m[1] : "image/jpeg";
    const base64 = m ? m[2] : String(dataUrl);
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), tipoMime, nombre);
    return carpeta.createFile(blob).getUrl();
  });
}

function limpiarNombre(txt) {
  return String(txt).replace(/[\\/:*?"<>|]/g, "-").trim() || "Sin nombre";
}

// ============================================================
// ACTUALIZACIONES DE ESTADO
// ============================================================
function marcarTrabajoCerrado(ss, idTrabajo, fechaFin) {
  const sheet = ss.getSheetByName(SHEET_TRABAJOS);
  if (!sheet) throw new Error("No existe la hoja " + SHEET_TRABAJOS + ".");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colId = headers.indexOf("id_trabajo");
  const colEstado = headers.indexOf("estado");
  const colFechaFin = headers.indexOf("fecha_fin");
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][colId]) === String(idTrabajo)) {
      sheet.getRange(r + 1, colEstado + 1).setValue("Cerrado");
      sheet.getRange(r + 1, colFechaFin + 1).setValue(fechaFin);
      return true;
    }
  }
  return false; // no está en la planilla (por ejemplo, se perdió antes de este arreglo)
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
    if (String(values[r][colId]) === String(idHallazgo)) {
      sheet.getRange(r + 1, colEstado + 1).setValue("Atendido");
      sheet.getRange(r + 1, colVisita + 1).setValue(idVisita);
      break;
    }
  }
}

// ============================================================
// CATÁLOGOS PARA LA APP
// La app los descarga al abrir (si hay señal) y guarda una copia en el
// celular. Para cambiar una lista, se edita la hoja: no hace falta tocar
// el código. Filas con "NO" en activo/estado no aparecen en la app.
// ============================================================
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const catalogos = ["operarios", "productos", "plagas", "dosis_frecuencia", "establecimientos", "sectores"];
  const out = {};
  catalogos.forEach((name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    out[name] = values.slice(1).filter((r) => r[0] !== "").map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
  });

  const trabajosSheet = ss.getSheetByName(SHEET_TRABAJOS);
  if (trabajosSheet) {
    const values = trabajosSheet.getDataRange().getValues();
    const headers = values[0];
    const colEstado = headers.indexOf("estado");
    out.trabajos_abiertos = values.slice(1)
      .filter((r) => r[0] !== "" && r[colEstado] === "Abierto")
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      });
  }

  // intervenciones MIPyV abiertas — para que cualquier operario pueda
  // "Continuar una abierta" aunque la haya empezado el otro
  out.intervenciones_abiertas = intervencionesMipyv(ss)
    .filter((iv) => iv.abierta)
    .map((iv) => ({
      protocolo: iv.protocolo, alias: iv.alias,
      id_establecimiento: iv.ultima.id_establecimiento, establecimiento: iv.ultima.establecimiento,
      tipo_establecimiento: iv.ultima.tipo_establecimiento, id_plaga: iv.ultima.id_plaga,
      tipo_plaga: iv.ultima.tipo_plaga, sector: iv.ultima.sector, fecha_ultima: iv.ultima.fecha,
    }));

  // tipos de tarea de HyS (solo esa lista de la hoja configuracion: los correos no se publican)
  out.tipos_tarea = tiposTareaHys(ss);
  // casos abiertos (con vencimiento), solicitudes a HyS y cierres recientes (Casos_Solicitudes_MIPyV.gs, 25/10/2026)
  // (las solicitudes y los cierres NO se publican acá: la evaluación la ve solo HyS en el portal)
  try { out.casos = casosParaApp_(ss); } catch (err) { out.casos_error = String(err.message || err); }
  // extintores del módulo 10 del sistema HyS (archivo Incendio_MIPyV.gs)
  try { out.extintores = extintoresParaApp_(ss); } catch (err) { out.extintores_error = String(err.message || err); }
  // cada lugar de MIPyV con su establecimiento, sitio y dependencia del módulo de incendio, y las plantas permitidas (29/10/2026)
  try { out.extintores_lugares = lugaresIncendioParaApp_(ss); } catch (err) { out.extintores_lugares_error = String(err.message || err); }
  // tanques y cisternas de la red Trelew, sin el HMH (archivo Tanques_MIPyV.gs, 28/10/2026)
  try { out.tanques = tanquesParaApp_(ss); } catch (err) { out.tanques_error = String(err.message || err); }


  return respuesta(out);
}

function tiposTareaHys(ss) {
  const sh = ss.getSheetByName(SHEET_CONFIG);
  if (!sh) return TIPOS_TAREA_POR_DEFECTO.slice();
  const lista = sh.getDataRange().getValues().slice(1)
    .filter((r) => String(r[0]).trim() === "tipo_tarea" && String(r[1]).trim() !== "")
    .map((r) => String(r[1]).trim());
  return lista.length ? lista : TIPOS_TAREA_POR_DEFECTO.slice();
}

// ============================================================
// INTERVENCIONES MIPyV
// Agrupa las visitas que son parte de la misma intervención:
//  - las que comparten el número de protocolo (columna protocolo, si HyS lo
//    cargó a mano), y
//  - las que la app marcó como continuación (columna protocolo_existente).
// La intervención está abierta si su última visita dice "Requiere otra visita".
// ============================================================
function intervencionesMipyv(ss) {
  const sheet = ss.getSheetByName(SHEET_VISITAS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const visitas = values.slice(1)
    .filter((r) => r[headers.indexOf("id_visita")] !== "")
    .map((r) => {
      const o = {};
      headers.forEach((h, i) => (o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]));
      return o;
    });

  // unión de grupos
  const padre = {};
  const raiz = (k) => { while (padre[k] && padre[k] !== k) k = padre[k]; return k; };
  const unir = (a, b) => {
    if (!padre[a]) padre[a] = a;
    if (!padre[b]) padre[b] = b;
    const ra = raiz(a), rb = raiz(b);
    if (ra !== rb) padre[rb] = ra;
  };
  const claveRef = (txt) => {
    const t = String(txt || "").trim();
    if (!t) return "";
    return t.indexOf("PENDIENTE-") === 0 ? "ID:" + t.slice(10) : "P:" + t;
  };
  visitas.forEach((v) => {
    const id = "ID:" + v.id_visita;
    unir(id, id);
    if (String(v.protocolo || "").trim()) unir(id, "P:" + String(v.protocolo).trim());
    const ref = claveRef(v.protocolo_existente);
    if (ref) unir(id, ref);
  });

  const grupos = {};
  visitas.forEach((v) => {
    const r = raiz("ID:" + v.id_visita);
    (grupos[r] = grupos[r] || []).push(v);
  });

  return Object.keys(grupos).map((k) => {
    const lista = grupos[k].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const ultima = lista[lista.length - 1];
    const conProtocolo = lista.find((v) => String(v.protocolo || "").trim());
    const protocolo = conProtocolo ? String(conProtocolo.protocolo).trim() : "PENDIENTE-" + lista[0].id_visita;
    const alias = [];
    lista.forEach((v) => {
      alias.push("PENDIENTE-" + v.id_visita);
      if (String(v.protocolo || "").trim()) alias.push(String(v.protocolo).trim());
      if (String(v.protocolo_existente || "").trim()) alias.push(String(v.protocolo_existente).trim());
    });
    return {
      protocolo: protocolo,
      alias: alias.filter((x, i) => alias.indexOf(x) === i),
      primera: lista[0],
      visitas: lista.map((v) => v.id_visita),
      ultima: ultima,
      // un caso cerrado desde la app o el portal (hoja cierres_casos) no figura abierto, salvo que tenga una visita posterior
      abierta: ultima.resultado === "Requiere otra visita" && !(typeof cierreDelCaso_ === "function" && cierreDelCaso_(ss, alias, ultima.fecha)),
    };
  });
}

// ============================================================
// SEGUIMIENTOS VENCIDOS (reemplaza al aviso por mail)
// Activador sugerido: una vez por día (ver guía). No manda correos.
// ============================================================
function actualizarSeguimientosVencidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoy = new Date();
  const salida = [];
  intervencionesMipyv(ss).forEach((iv) => {
    if (!iv.abierta) return;
    const u = iv.ultima;
    let limite = u.fecha_2da_intervencion ? new Date(u.fecha_2da_intervencion) : null;
    if (!limite || isNaN(limite)) {
      limite = new Date(u.fecha);
      limite.setDate(limite.getDate() + DIAS_SEGUIMIENTO_POR_DEFECTO);
    }
    if (limite >= hoy) return;
    const dias = Math.floor((hoy - limite) / 86400000);
    salida.push([
      u.id_visita, Utilities.formatDate(new Date(u.fecha), ZONA_HORARIA, "yyyy-MM-dd"),
      u.establecimiento, u.sector, u.tipo_plaga, u.operario, iv.protocolo,
      Utilities.formatDate(limite, ZONA_HORARIA, "yyyy-MM-dd"), dias,
    ]);
  });
  salida.sort((a, b) => b[8] - a[8]); // los más atrasados primero

  let sh = ss.getSheetByName(SHEET_VENCIDOS);
  if (!sh) sh = ss.insertSheet(SHEET_VENCIDOS);
  sh.clearContents();
  sh.getRange(1, 1, 1, 9).setValues([[
    "id_ultima_visita", "fecha_ultima_visita", "establecimiento", "sector", "tipo_plaga",
    "operario", "protocolo", "vencia", "dias_vencido",
  ]]);
  if (salida.length) sh.getRange(2, 1, salida.length, 9).setValues(salida);
  sh.getRange(1, 11).setValue("Actualizado: " + Utilities.formatDate(hoy, ZONA_HORARIA, "dd/MM/yyyy HH:mm"));
  sh.getRange(2, 11).setValue("Intervenciones cuya última visita pidió otra visita y pasó el plazo (" +
    DIAS_SEGUIMIENTO_POR_DEFECTO + " días si no hay fecha de 2da intervención).");
}

// ============================================================
// RESUMEN DIARIO POR MAIL — una sola vez por día
// Activador: enviarResumenDiario, diario, de 20 a 21 h.
//  · Resumen completo  → Dirección Asociada Administrativa + HyS.
//  · Cada establecimiento con trabajos ese día → solo lo suyo, al correo
//    de la columna mail_aviso de la hoja establecimientos.
// Si el activador corre más de una vez el mismo día, no manda nada nuevo.
// ============================================================
function enviarResumenDiario() {
  const hoy = Utilities.formatDate(new Date(), ZONA_HORARIA, "yyyy-MM-dd");
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("ULTIMO_RESUMEN") === hoy) return; // ya se mandó hoy
  armarYEnviarResumen(hoy);
  props.setProperty("ULTIMO_RESUMEN", hoy);
}

// Desde el menú: manda el de hoy aunque ya se haya enviado.
function enviarResumenManual() {
  const hoy = Utilities.formatDate(new Date(), ZONA_HORARIA, "yyyy-MM-dd");
  const n = armarYEnviarResumen(hoy);
  SpreadsheetApp.getUi().alert(n ? "Se enviaron " + n + " correo(s)." : "No se envió nada: revisar los correos en la hoja \"configuracion\".");
}

// Limpia una lista de correos: saca vacíos, "s/d" y lo que no parece un mail.
function correosValidos(txt) {
  return String(txt || "").split(/[,;\s]+/).map((x) => x.trim())
    .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
}

// ============================================================
// ENVÍO DE CORREOS — todos salen desde la dirección de "mail_remitente"
// ============================================================
function remitenteConfigurado() {
  const r = correosValidos(valorConfig("mail_remitente"));
  return r.length ? r[0] : REMITENTE_POR_DEFECTO;
}

// Recibe lo mismo que MailApp.sendEmail({to, subject, body, htmlBody, name}).
// Si la dirección remitente está habilitada en Gmail («Enviar como»), sale desde ella.
// Si no, sale desde la cuenta dueña de la planilla y las respuestas van a la remitente.
function enviarCorreo(o) {
  const remitente = remitenteConfigurado();
  const propia = Session.getEffectiveUser().getEmail();
  const opciones = { htmlBody: o.htmlBody, name: o.name || "MIPyV Red HZT" };
  if (remitente.toLowerCase() !== String(propia).toLowerCase()) {
    const alias = GmailApp.getAliases().map((a) => a.toLowerCase());
    if (alias.indexOf(remitente.toLowerCase()) !== -1) {
      opciones.from = remitente;
    } else {
      opciones.replyTo = remitente;
      Logger.log("Aviso: " + remitente + " no está en «Enviar como» de " + propia + ". El correo sale desde " + propia + ".");
    }
  }
  GmailApp.sendEmail(o.to, o.subject, o.body || "", opciones);
}

// Menú: muestra desde qué dirección van a salir los correos (no envía nada).
function comprobarRemitente() {
  const remitente = remitenteConfigurado();
  const propia = Session.getEffectiveUser().getEmail();
  const alias = GmailApp.getAliases();
  const ok = remitente.toLowerCase() === String(propia).toLowerCase() ||
    alias.map((a) => a.toLowerCase()).indexOf(remitente.toLowerCase()) !== -1;
  const texto = ok
    ? "Correcto. Los correos van a salir desde: " + remitente
    : "Los correos van a salir desde " + propia + " (con respuesta a " + remitente + "), porque " + remitente +
      " no está en Gmail › Configuración › Cuentas › «Enviar correo como». Direcciones habilitadas: " + (alias.join(", ") || "ninguna");
  Logger.log(texto);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(texto, "MIPyV · Remitente", 15); } catch (e) {}
  return texto;
}

function valorConfig(clave) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sh) return clave === "mail_resumen_diario" ? MAIL_RESUMEN_POR_DEFECTO : "";
  const filas = sh.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (String(filas[i][0]).trim() === clave) return String(filas[i][1] || "").trim();
  }
  return clave === "mail_resumen_diario" ? MAIL_RESUMEN_POR_DEFECTO : "";
}

function correosPorEstablecimiento(ss) {
  const sh = ss.getSheetByName("establecimientos");
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  const v = sh.getDataRange().getValues();
  const cId = v[0].indexOf("id_establecimiento"), cMail = v[0].indexOf("mail_aviso");
  if (cId === -1 || cMail === -1) return out;
  v.slice(1).forEach((r) => { out[String(r[cId])] = correosValidos(r[cMail]); });
  return out;
}

function tiposPorEstablecimiento(ss) {
  const sh = ss.getSheetByName("establecimientos");
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  const v = sh.getDataRange().getValues();
  const cId = v[0].indexOf("id_establecimiento"), cTipo = v[0].indexOf("tipo");
  v.slice(1).forEach((r) => { out[String(r[cId])] = String(r[cTipo] || ""); });
  return out;
}

function filasDelDia(ss, nombreHoja, dia) {
  const sh = ss.getSheetByName(nombreHoja);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const h = values[0];
  return values.slice(1).map((r) => {
    const o = {};
    h.forEach((k, i) => (o[k] = r[i]));
    return o;
  }).filter((o) => {
    if (!o.fecha) return false;
    const f = new Date(o.fecha);
    return !isNaN(f) && Utilities.formatDate(f, ZONA_HORARIA, "yyyy-MM-dd") === dia;
  });
}

// Devuelve cuántos correos mandó.
// Los ids de lugar de una tarea de HyS (puede tener varios, separados por " | ").
function lugaresDe(o) {
  const ids = String(o.id_establecimiento || "").split("|").map((x) => x.trim()).filter(Boolean);
  const nombres = String(o.establecimiento || "").split("|").map((x) => x.trim());
  return ids.map((id, i) => ({ id: id, nombre: nombres[i] || id }));
}

function armarYEnviarResumen(dia) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const visitas = filasDelDia(ss, SHEET_VISITAS, dia);
  const avances = filasDelDia(ss, SHEET_AVANCES, dia);
  // Las "otras tareas de HyS" NO se informan en el resumen (decisión de HyS):
  // solo se usan para no marcar como "sin registros" a quien sí trabajó.
  const tareasDelDia = filasDelDia(ss, SHEET_TAREAS, dia);
  const tareas = [];
  const fechaTxt = Utilities.formatDate(new Date(dia + "T12:00:00"), ZONA_HORARIA, "dd/MM/yyyy");
  const total = (v, a, t) => v.length + a.length + t.length;
  let enviados = 0;

  // quiénes no registraron nada hoy (solo para el resumen completo)
  const presentes = {};
  visitas.concat(avances, tareasDelDia).forEach((o) => {
    if (o.operario) presentes[o.operario] = true;
    if (o.operario_acompanante) presentes[o.operario_acompanante] = true;
  });
  const opSheet = ss.getSheetByName("operarios");
  const activos = opSheet ? opSheet.getDataRange().getValues().slice(1)
    .filter((r) => String(r[3] || "").toUpperCase().indexOf("SI") === 0).map((r) => String(r[1])) : [];
  const sinRegistro = activos.filter((n) => !presentes[n]);
  const vencidasSh = ss.getSheetByName(SHEET_VENCIDOS);
  const vencidas = vencidasSh ? Math.max(0, vencidasSh.getLastRow() - 1) : 0;

  // 1) resumen completo: Dirección Asociada Administrativa + HyS (siempre, aunque no haya registros)
  const completos = correosValidos(valorConfig("mail_direccion_administrativa"))
    .concat(correosValidos(valorConfig("mail_resumen_diario")))
    .filter((x, i, a) => a.indexOf(x) === i);
  if (completos.length) {
    enviarCorreo({
      to: completos.join(","),
      subject: "MIPyV · " + fechaTxt + " · " + total(visitas, avances, tareas) + " registro(s)" +
        (sinRegistro.length ? " · sin registros: " + sinRegistro.join(", ") : ""),
      htmlBody: htmlResumen(ss, visitas, avances, tareas, "Registros del " + fechaTxt + " · todos los establecimientos", sinRegistro, vencidas, true),
      body: "MIPyV Red HZT · registros del " + fechaTxt + ": " + visitas.length + " visita(s), " + avances.length +
        " avance(s) de saneamiento." + (sinRegistro.length ? " Sin registros hoy: " + sinRegistro.join(", ") + "." : ""),
      name: "MIPyV Red HZT",
    });
    enviados++;
  }

  // 1b) Área Externa: solo lo hecho en los CAPS (solo si hubo trabajos en algún CAPS)
  const tipos = tiposPorEstablecimiento(ss);
  const idEsCaps = (id) => tipos[String(id)] === "CAP" || /^CAP-/.test(String(id || ""));
  const esCaps = (o) => idEsCaps(o.id_establecimiento);
  const vCaps = visitas.filter(esCaps), aCaps = avances.filter(esCaps);
  const tCaps = tareas.filter((t) => lugaresDe(t).some((l) => idEsCaps(l.id)));
  const paraCaps = correosValidos(valorConfig("mail_resumen_caps")).filter((x) => completos.indexOf(x) === -1);
  if (paraCaps.length && total(vCaps, aCaps, tCaps)) {
    enviarCorreo({
      to: paraCaps.join(","),
      subject: "MIPyV · CAPS · " + fechaTxt + " · " + total(vCaps, aCaps, tCaps) + " registro(s)",
      htmlBody: htmlResumen(ss, vCaps, aCaps, tCaps, "Trabajos en los CAPS del " + fechaTxt, [], 0, true),
      body: "MIPyV Red HZT · trabajos en los CAPS del " + fechaTxt + ": " + vCaps.length + " visita(s) y " + aCaps.length + " avance(s).",
      name: "MIPyV Red HZT",
    });
    enviados++;
  }

  // 2) a cada establecimiento, solo lo suyo (solo si hubo trabajos ahí)
  const correos = correosPorEstablecimiento(ss);
  const porLugar = {};
  const grupo = (id, nombre) => (porLugar[id] = porLugar[id] || { v: [], a: [], t: [], nombre: nombre });
  visitas.forEach((v) => grupo(String(v.id_establecimiento || ""), v.establecimiento).v.push(v));
  avances.forEach((a) => grupo(String(a.id_establecimiento || ""), a.establecimiento).a.push(a));
  tareas.forEach((t) => lugaresDe(t).forEach((l) => grupo(l.id, l.nombre).t.push(t)));
  Object.keys(porLugar).forEach((id) => {
    const destinos = (correos[id] || []).filter((x) => completos.indexOf(x) === -1);
    if (!destinos.length) return;
    const g = porLugar[id];
    enviarCorreo({
      to: destinos.join(","),
      subject: "MIPyV · " + g.nombre + " · " + fechaTxt,
      htmlBody: htmlResumen(ss, g.v, g.a, g.t, g.nombre + " · trabajos del " + fechaTxt, [], 0, false),
      body: "Trabajos de control de plagas y saneamiento realizados hoy en " + g.nombre + ": " +
        g.v.length + " visita(s) y " + g.a.length + " avance(s).",
      name: "MIPyV Red HZT",
    });
    enviados++;
  });
  return enviados;
}

function htmlResumen(ss, visitas, avances, tareas, titulo, sinRegistro, vencidas, completo) {
  const esc = (t) => String(t === undefined || t === null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const quien = (o) => o.operario + (o.operario_acompanante ? " con " + o.operario_acompanante : "");
  const horario = (o) => (o.hora_inicio || "s/d") + " a " + (o.hora_fin || "s/d");
  const fotos = (o) => {
    const links = o.foto_url ? String(o.foto_url).split("|").map((x) => x.trim()).filter(Boolean) : [];
    return links.map((u, i) => '<a href="' + esc(u) + '">foto ' + (i + 1) + "</a>").join(" ") || "—";
  };
  const td = 'style="border:1px solid #D5DEE2;padding:6px;vertical-align:top;"';
  const th = 'style="border:1px solid #D5DEE2;padding:6px;background:#0D313F;color:#fff;text-align:left;"';
  let html = '<div style="font-family:Arial,sans-serif;color:#3A4A52;font-size:14px;">';
  html += "<p><b>MIPyV Red HZT · " + esc(titulo) + "</b></p>";
  html += "<p>Visitas de control de plagas: <b>" + visitas.length + "</b> · Avances de limpieza y saneamiento: <b>" + avances.length + "</b>" +
    (tareas.length ? " · Otras tareas de Higiene y Seguridad: <b>" + tareas.length + "</b>" : "") + "</p>";
  if (sinRegistro.length) html += '<p style="color:#8A1C12;">Sin registros hoy: <b>' + esc(sinRegistro.join(", ")) + "</b></p>";
  if (visitas.length) {
    html += '<p><b>Control de plagas</b></p><table style="border-collapse:collapse;"><tr><th ' + th + ">Operario</th>" +
      (completo ? "<th " + th + ">Lugar</th>" : "") + "<th " + th + ">Sector</th><th " + th + ">Plaga · producto</th><th " + th +
      ">Resultado</th><th " + th + ">Horario</th><th " + th + ">Fotos</th></tr>";
    visitas.forEach((v) => {
      html += "<tr><td " + td + ">" + esc(quien(v)) + "</td>" + (completo ? "<td " + td + ">" + esc(v.establecimiento) + "</td>" : "") +
        "<td " + td + ">" + esc(v.sector || "—") + "</td><td " + td + ">" + esc(v.tipo_plaga) + " · " + esc(v.producto) +
        "</td><td " + td + ">" + esc(v.resultado) + "</td><td " + td + ">" + esc(horario(v)) + "</td><td " + td + ">" + fotos(v) + "</td></tr>";
    });
    html += "</table>";
  }
  if (avances.length) {
    html += '<p><b>Limpieza y saneamiento</b></p><table style="border-collapse:collapse;"><tr><th ' + th + ">Operario</th>" +
      (completo ? "<th " + th + ">CAPS</th>" : "") + "<th " + th + ">Tareas</th><th " + th + ">Detalle</th><th " + th +
      ">Cierre</th><th " + th + ">Horario</th><th " + th + ">Fotos</th></tr>";
    avances.forEach((a) => {
      html += "<tr><td " + td + ">" + esc(quien(a)) + "</td>" + (completo ? "<td " + td + ">" + esc(a.establecimiento) + "</td>" : "") +
        "<td " + td + ">" + esc(a.tareas) + "</td><td " + td + ">" + esc(a.detalle || "—") + "</td><td " + td + ">" +
        (a.cierre === "terminado" ? "Terminado" : "Continúa") + "</td><td " + td + ">" + esc(horario(a)) + "</td><td " + td + ">" + fotos(a) + "</td></tr>";
    });
    html += "</table>";
  }
  if (tareas.length) {
    html += '<p><b>Otras tareas de Higiene y Seguridad</b></p><table style="border-collapse:collapse;"><tr><th ' + th + ">Operario</th>" +
      "<th " + th + ">Tarea</th>" + (completo ? "<th " + th + ">Lugares</th>" : "") + "<th " + th + ">Detalle</th><th " + th +
      ">Hallazgos</th><th " + th + ">Horario</th><th " + th + ">Fotos</th></tr>";
    tareas.forEach((t) => {
      const hallazgo = String(t.hallazgos || "").trim();
      html += "<tr><td " + td + ">" + esc(quien(t)) + "</td><td " + td + ">" + esc(t.tipo_tarea) + "</td>" +
        (completo ? "<td " + td + ">" + esc(String(t.establecimiento || "").split("|").map((x) => x.trim()).join(", ")) + "</td>" : "") +
        "<td " + td + ">" + esc(t.detalle || "—").replace(/\n/g, "<br>") + "</td><td " + td + ">" +
        (hallazgo ? '<span style="color:#8A1C12;">' + esc(hallazgo).replace(/\n/g, "<br>") + "</span>" : "—") +
        "</td><td " + td + ">" + esc(horario(t)) + "</td><td " + td + ">" + fotos(t) + "</td></tr>";
    });
    html += "</table>";
  }
  if (!visitas.length && !avances.length && !tareas.length) html += "<p>No se registró ningún trabajo hoy.</p>";
  if (completo && vencidas) html += "<p>Seguimientos vencidos pendientes: <b>" + vencidas + "</b> (hoja seguimientos_vencidos).</p>";
  if (completo) html += '<p><a href="' + ss.getUrl() + '">Abrir la planilla</a></p>';
  html += '<p style="font-size:12px;color:#5894A7;">Servicio de Higiene y Seguridad Laboral · HMH / HZT · Mensaje diario del registro MIPyV · HySL — Hospitales más seguros para las personas</p></div>';
  return html;
}

// ============================================================
// RECORDATORIO A OPERARIOS — lunes a viernes, 19 h
// Si un operario con correo no tiene ningún trabajo registrado hoy
// (ni como quien cargó ni como acompañante), le llega un recordatorio.
// Una sola vez por día por operario.
// ============================================================
function enviarRecordatoriosOperarios() {
  const ahora = new Date();
  const diaSemana = Number(Utilities.formatDate(ahora, ZONA_HORARIA, "u")); // 1 = lunes … 7 = domingo
  if (diaSemana > 5) return;
  const hoy = Utilities.formatDate(ahora, ZONA_HORARIA, "yyyy-MM-dd");
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const opSheet = ss.getSheetByName("operarios");
  if (!opSheet || opSheet.getLastRow() < 2) return;
  const v = opSheet.getDataRange().getValues();
  const h = v[0];
  const cNom = h.indexOf("nombre"), cAct = h.indexOf("activo"), cMail = h.indexOf("mail"), cRec = h.indexOf("recordatorio");
  if (cMail === -1) return;

  const registros = filasDelDia(ss, SHEET_VISITAS, hoy)
    .concat(filasDelDia(ss, SHEET_AVANCES, hoy), filasDelDia(ss, SHEET_TAREAS, hoy));
  const conRegistro = {};
  registros.forEach((o) => {
    if (o.operario) conRegistro[String(o.operario)] = true;
    if (o.operario_acompanante) conRegistro[String(o.operario_acompanante)] = true;
  });
  const fechaTxt = Utilities.formatDate(ahora, ZONA_HORARIA, "dd/MM/yyyy");
  const app = "https://belunchyy444-blip.github.io/mipyv-app/";

  v.slice(1).forEach((r) => {
    const nombre = String(r[cNom] || "").trim();
    if (!nombre || String(r[cAct] || "").toUpperCase().indexOf("SI") !== 0) return;
    if (cRec === -1 || String(r[cRec] || "").trim().toUpperCase().indexOf("SI") !== 0) return; // sin recordatorio activo
    const mails = correosValidos(r[cMail]);
    if (!mails.length || conRegistro[nombre]) return;
    const clave = "RECORDATORIO_" + nombre + "_" + hoy;
    if (props.getProperty(clave)) return; // ya se le mandó hoy
    const primerNombre = nombre.split(" ")[0];
    const texto = [
      primerNombre + ":",
      "",
      "Hoy, " + fechaTxt + ", no figura ningún trabajo registrado a su nombre en la aplicación MIPyV.",
      "",
      "Le recordamos que el 7 de octubre de 2026 se le notificó por nota que es obligatorio registrar cada trabajo de control de plagas y de limpieza y saneamiento el mismo día, antes de retirarse del establecimiento.",
      "",
      "Si hoy realizó algún trabajo, regístrelo ahora en: " + app,
      "Si trabajó acompañado y el registro lo cargó su compañero, no tiene que hacer nada.",
      "",
      "Servicio de Higiene y Seguridad Laboral · HMH / HZT",
    ].join("\n");
    const html = '<div style="font-family:Arial,sans-serif;color:#3A4A52;font-size:15px;line-height:1.5;">' +
      "<p>" + primerNombre + ":</p>" +
      "<p>Hoy, <b>" + fechaTxt + "</b>, no figura ningún trabajo registrado a su nombre en la aplicación MIPyV.</p>" +
      "<p>Le recordamos que el <b>7 de octubre de 2026</b> se le notificó por nota que es <b>obligatorio registrar cada trabajo</b> de control de plagas y de limpieza y saneamiento <b>el mismo día, antes de retirarse del establecimiento</b>.</p>" +
      '<p>Si hoy realizó algún trabajo, regístrelo ahora: <a href="' + app + '">abrir la aplicación MIPyV</a>.</p>' +
      "<p>Si trabajó acompañado y el registro lo cargó su compañero, no tiene que hacer nada.</p>" +
      '<p style="font-size:12px;color:#5894A7;">Servicio de Higiene y Seguridad Laboral · HMH / HZT · HySL — Hospitales más seguros para las personas</p></div>';
    enviarCorreo({ to: mails.join(","), subject: "MIPyV · Hoy no hay trabajos registrados a su nombre", body: texto, htmlBody: html, name: "MIPyV Red HZT" });
    props.setProperty(clave, "1");
  });
}

// ============================================================
// ACTIVADORES — crea los tres activadores diarios sin duplicarlos
// ============================================================
function instalarActivadores() {
  const funciones = {
    actualizarSeguimientosVencidos: 7,
    enviarRecordatoriosOperarios: 19,
    enviarResumenDiario: 20,
  };
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (funciones.hasOwnProperty(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  Object.keys(funciones).forEach((f) => {
    ScriptApp.newTrigger(f).timeBased().atHour(funciones[f]).everyDays(1).inTimezone(ZONA_HORARIA).create();
  });
  // Aviso que no frena la ejecución (un cartel con "Aceptar" se queda esperando
  // si la función se corre desde el editor).
  const msg = "Activadores instalados: seguimientos 7 h, recordatorio a operarios 19 h (lunes a viernes), resumen diario 20 h.";
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, "MIPyV", 8); } catch (e) { /* sin planilla abierta */ }
}