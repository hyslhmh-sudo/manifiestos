/**
 * RELEVAMIENTO DE EDIFICIOS · agua, desagües, canaletas y techos (03/11/2026, pedido de Belén)
 * La Dirección pidió saber cómo está la red Trelew en esos 4 temas. La app MIP (edificio.js) manda un relevamiento
 * por lugar (CAPS, dependencias y el edificio central del HZT, que se puede relevar por partes; sin el HMH). Se guarda en la hoja
 * «relevamiento_edificio» de esta planilla (se crea sola) y las fotos en Drive, en la carpeta de fotos de cada lugar,
 * con el nombre del tema. HyS lo lee para el diagnóstico (informe a la Dirección).
 * Si un lugar se releva dos veces, quedan las dos filas: vale la más nueva.
 */
const SHEET_EDIFICIO = "relevamiento_edificio";
const ED_H = ["id_relev", "fecha_relevamiento", "lugar_id", "lugar", "parte", "operario", "operario_acompanante", "prioridad",
  "agua", "desagues", "canaletas", "techos", "techo_tipo", "agua_falta", "desagues_falta", "canaletas_falta", "techos_falta",
  "fotos_agua", "fotos_desagues", "fotos_canaletas", "fotos_techos", "observaciones", "respuestas", "cargado", "revisado_hys"];

function edHoja_(ss) {
  let sh = ss.getSheetByName(SHEET_EDIFICIO);
  if (!sh) {
    sh = ss.insertSheet(SHEET_EDIFICIO);
    sh.getRange(1, 1, 1, ED_H.length).setValues([ED_H]).setFontWeight("bold").setBackground("#EAF3F6");
    sh.setFrozenRows(1);
    sh.getRange(1, ED_H.indexOf("respuestas") + 1).setNote("Todas las preguntas con su respuesta (Sí / No / No se pudo ver), por tema. Si falta un dato: s/d.");
  }
  // 03/11/2026: columna «parte» (qué parte del edificio se relevó; el HZT se releva por partes)
  const H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  if (H.indexOf("parte") < 0) { sh.insertColumnAfter(H.indexOf("lugar") + 1); sh.getRange(1, H.indexOf("lugar") + 2).setValue("parte").setFontWeight("bold").setBackground("#EAF3F6"); }
  return sh;
}

function guardarRelevEdificio_(ss, data) {
  if (!data.id_relev) throw new Error("Falta el identificador del relevamiento.");
  const sh = edHoja_(ss);
  if (existeId(sh, "id_relev", data.id_relev)) return { duplicado: true };
  const links = {};
  ["agua", "desagues", "canaletas", "techos"].forEach((t) => {
    const fotos = Array.isArray(data["fotos_" + t]) ? data["fotos_" + t].filter(Boolean) : [];
    links[t] = fotos.length ? guardarFotos(fotos, { establecimiento: data.lugar || data.lugar_id, fecha: data.fecha }, data.id_relev + "_" + t).join(SEPARADOR_LINKS) : "";
  });
  const s = (v) => String(v == null ? "" : v).trim();
  agregarFila(sh, {
    id_relev: data.id_relev, fecha_relevamiento: s(data.FECHA) || s(data.fecha).slice(0, 10), lugar_id: s(data.lugar_id), lugar: s(data.lugar), parte: s(data.parte) || "Todo el edificio",
    operario: s(data.operario) || "s/d", operario_acompanante: s(data.operario_acompanante), prioridad: s(data.prioridad) || "s/d",
    agua: s(data.agua) || "s/d", desagues: s(data.desagues) || "s/d", canaletas: s(data.canaletas) || "s/d", techos: s(data.techos) || "s/d", techo_tipo: s(data.techo_tipo) || "s/d",
    agua_falta: s(data.agua_falta), desagues_falta: s(data.desagues_falta), canaletas_falta: s(data.canaletas_falta), techos_falta: s(data.techos_falta),
    fotos_agua: links.agua, fotos_desagues: links.desagues, fotos_canaletas: links.canaletas, fotos_techos: links.techos,
    observaciones: s(data.observaciones), respuestas: s(data.respuestas), cargado: new Date(), revisado_hys: "Sin revisar" });
  return { lugar: data.lugar };
}

// Lo que manda doGet: el último relevamiento de cada lugar (para que la app muestre qué falta relevar)
function edificioParaApp_(ss) {
  const sh = ss.getSheetByName(SHEET_EDIFICIO), out = { lugares: {} };
  if (!sh || sh.getLastRow() < 2) return out;
  const V = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), H = V[0].map(String), c = (k) => H.indexOf(k);
  const nivel = (t) => /urgente/i.test(t) ? "er" : /arreglo/i.test(t) ? "wa" : /no se pudo/i.test(t) ? "nd" : /^(bien|no tiene)$/i.test(t) ? "ok" : "nd";
  V.slice(1).forEach((r) => {
    const id = String(r[c("lugar_id")] || "").trim(); if (!id) return;
    const f = r[c("fecha_relevamiento")] instanceof Date ? Utilities.formatDate(r[c("fecha_relevamiento")], ZONA_HORARIA, "yyyy-MM-dd") : String(r[c("fecha_relevamiento")] || "").slice(0, 10);
    if (out.lugares[id] && out.lugares[id].fecha >= f) return;
    const e = {}; ["agua", "desagues", "canaletas", "techos"].forEach((t) => { e[t] = String(r[c(t)] || "s/d"); e[t + "_nivel"] = nivel(e[t]); });
    out.lugares[id] = { fecha: f, estados: e, prioridad: String(r[c("prioridad")] || "") };
  });
  return out;
}
