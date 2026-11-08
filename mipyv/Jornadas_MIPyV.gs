/**
 * MIPyV Red HZT — JORNADA DIARIA de Javier y Paulo (08/11/2026, pedido de Belén)
 * «Necesito que lo haga 1 vez al día la sumatoria de horas. Además puede suceder que por trámites personales hayan trabajado
 * 3 h de mañana y 3 de tarde: deberían poder registrar esa pausa y que no se cuenten 9 h.» · «Paulo puede trabajar menos horas que Javier.»
 * Va en el mismo proyecto de Apps Script del libro «MIP RED HZT - Base de Datos v2», como archivo aparte.
 *  - Cada persona carga UNA jornada por día: entrada y salida, y si tuvo una pausa, un segundo tramo (la pausa no suma).
 *  - Hoja JORNADAS (se crea sola): una fila por persona y día. Si se vuelve a cargar el mismo día, queda la más nueva.
 *    «no_trabajo» = Sí: ese día no trabajó con HyS (no suma nada y no se vuelve a pedir).
 *  - La app pide la jornada de cada día anterior en el que la persona figura en un registro (como titular o acompañante)
 *    sin horario propio, desde JOR_DESDE. No deja seguir hasta cargarla (jornada.js). El día de hoy se carga con «Terminar el día».
 *  - Los horarios ya no se piden en cada registro. Los que ya tienen horario (antes del 08/11/2026) se siguen usando.
 *  - El Portal HyS (3 · Plagas › Control de horas) usa la jornada; si no hay, los horarios de los registros. HyS puede cargar
 *    o corregir cualquier jornada desde el portal o directo en esta hoja.
 * No envía correos.
 */
const SHEET_JORNADAS = "JORNADAS";
const JOR_H = ["id_jornada", "fecha", "persona", "entrada1", "salida1", "entrada2", "salida2", "minutos", "horas", "no_trabajo", "cargado_por", "cargado", "nota"];
const JOR_DESDE = "2026-11-01";   // desde acá la app pide las jornadas que falten

function jorHoja_(ss) {
  let sh = ss.getSheetByName(SHEET_JORNADAS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_JORNADAS, 1);
    sh.getRange(1, 1, 1, JOR_H.length).setValues([JOR_H]).setFontWeight("bold").setBackground("#EAF3F6");
    sh.setFrozenRows(1); sh.getRange("B:B").setNumberFormat("@"); sh.getRange("D:G").setNumberFormat("@");
    sh.getRange(1, 4).setNote("Horas en formato 08:00. entrada2 y salida2 solo si hubo una pausa (la pausa no suma).");
    sh.getRange(1, 10).setNote("Sí = ese día no trabajó con HyS: no suma y la app no lo vuelve a pedir.");
  }
  return sh;
}
const jorTxt_ = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const jorNorm_ = (s) => jorTxt_(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function jorHora_(v) {
  if (v instanceof Date) return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0");
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(jorTxt_(v)); return m ? m[1].padStart(2, "0") + ":" + m[2] : "";
}
const jorMin_ = (h) => { const m = /^(\d{2}):(\d{2})$/.exec(h || ""); return m ? +m[1] * 60 + +m[2] : null; };
function jorFecha_(v) { if (v instanceof Date) return Utilities.formatDate(v, ZONA_HORARIA, "yyyy-MM-dd"); return jorTxt_(v).slice(0, 10); }

// Valida y calcula los minutos de una jornada. Devuelve { minutos } o { error }
function jorCalcular_(d) {
  if (/^s[ií]$/i.test(jorTxt_(d.no_trabajo)) || d.no_trabajo === true) return { minutos: 0 };
  const e1 = jorMin_(jorHora_(d.entrada1)), s1 = jorMin_(jorHora_(d.salida1)), e2 = jorMin_(jorHora_(d.entrada2)), s2 = jorMin_(jorHora_(d.salida2));
  if (e1 == null || s1 == null || s1 <= e1) return { error: "La salida tiene que ser después de la entrada." };
  if (e2 == null && s2 == null) return { minutos: s1 - e1 };
  if (e2 == null || s2 == null || s2 <= e2) return { error: "En el segundo tramo, la salida tiene que ser después de la entrada." };
  if (e2 < s1) return { error: "El segundo tramo tiene que empezar después de que terminó el primero." };
  return { minutos: (s1 - e1) + (s2 - e2) };
}

// Guarda (o reemplaza) la jornada de una persona en un día. data: {fecha, persona, entrada1, salida1, entrada2, salida2, no_trabajo, cargado_por, nota}
function guardarJornada_(ss, data) {
  const fecha = jorFecha_(data.fecha), persona = jorTxt_(data.persona);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !persona) throw new Error("Faltan la fecha o la persona de la jornada.");
  const c = jorCalcular_(data); if (c.error) throw new Error(c.error);
  const no = /^s[ií]$/i.test(jorTxt_(data.no_trabajo)) || data.no_trabajo === true;
  const sh = jorHoja_(ss), fila = [jorTxt_(data.id_jornada) || ("J-" + fecha + "-" + jorNorm_(persona).replace(/[^a-z]+/g, "")), fecha, persona,
    no ? "" : jorHora_(data.entrada1), no ? "" : jorHora_(data.salida1), no ? "" : jorHora_(data.entrada2), no ? "" : jorHora_(data.salida2),
    c.minutos, Math.floor(c.minutos / 60) + " h" + (c.minutos % 60 ? " " + String(c.minutos % 60).padStart(2, "0") + " min" : ""), no ? "Sí" : "",
    jorTxt_(data.cargado_por) || persona, new Date(), jorTxt_(data.nota)];
  let fn = 0;
  if (sh.getLastRow() > 1) {
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
    for (let i = v.length - 1; i >= 0; i--) if (jorFecha_(v[i][1]) === fecha && jorNorm_(v[i][2]) === jorNorm_(persona)) { fn = i + 2; break; }
  }
  if (fn) sh.getRange(fn, 1, 1, fila.length).setValues([fila]); else sh.appendRow(fila);
  return { minutos: c.minutos };
}

// Para la app: los días con registros sin horario y sin jornada (por persona), y las jornadas cargadas en los últimos 40 días
function jornadasParaApp_(ss) {
  const hoy = Utilities.formatDate(new Date(), ZONA_HORARIA, "yyyy-MM-dd"), hace40 = Utilities.formatDate(new Date(Date.now() - 40 * 864e5), ZONA_HORARIA, "yyyy-MM-dd");
  const hechas = {}, cargadas = [];
  const shJ = ss.getSheetByName(SHEET_JORNADAS);
  if (shJ && shJ.getLastRow() > 1) shJ.getRange(2, 1, shJ.getLastRow() - 1, JOR_H.length).getValues().forEach(r => {
    const f = jorFecha_(r[1]), p = jorTxt_(r[2]); if (!f || !p) return; hechas[f + "|" + jorNorm_(p)] = true;
    if (f >= hace40) cargadas.push({ fecha: f, persona: p, entrada1: jorHora_(r[3]), salida1: jorHora_(r[4]), entrada2: jorHora_(r[5]), salida2: jorHora_(r[6]), no_trabajo: r[9] === "Sí" }); });
  const dias = {};   // fecha|persona → { fecha, persona, lugares, con, sinHorario }
  const sh = ss.getSheetByName(typeof SHEET_TODO !== "undefined" ? SHEET_TODO : "TODO LO CARGADO");
  if (sh && sh.getLastRow() > 1) {
    const v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), H = v[0].map(h => String(h).trim()), c = (k) => H.indexOf(k);
    v.slice(1).forEach(r => {
      const f = jorFecha_(r[c("fecha")]); if (!f || f < JOR_DESDE || f >= hoy) return;
      const ps = [jorTxt_(r[c("operario")])].concat(jorTxt_(r[c("operario_acompanante")]).split(/\s*[,|]\s*/)).map(jorTxt_).filter(Boolean);
      const sinH = !/\d{1,2}[:.]\d{2}/.test(String(r[c("horario")] || "")), lugar = jorTxt_(r[c("lugar")]);
      ps.forEach(p => { const k = f + "|" + jorNorm_(p), d = dias[k] = dias[k] || { fecha: f, persona: p, lugares: [], con: [], sinHorario: false };
        if (lugar && d.lugares.indexOf(lugar) < 0) d.lugares.push(lugar); if (sinH) d.sinHorario = true;
        ps.filter(o => o !== p).forEach(o => { if (d.con.indexOf(o) < 0) d.con.push(o); }); });
    });
  }
  const pendientes = Object.keys(dias).filter(k => !hechas[k] && dias[k].sinHorario).map(k => dias[k]).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { desde: JOR_DESDE, hoy: hoy, pendientes: pendientes, cargadas: cargadas };
}

// Para revisar desde el editor: muestra en el registro de ejecución los días que falta cargar
function probarJornadas() { const r = jornadasParaApp_(SpreadsheetApp.getActiveSpreadsheet()); console.log(JSON.stringify(r.pendientes.map(p => p.fecha + " " + p.persona + " · " + p.lugares.join(", ") + (p.con.length ? " · con " + p.con.join(", ") : "")), null, 1)); return r; }
