/**
 * ACCESO CON CONTRASEÑA A LA APP MIP (06/11/2026, pedido de Belén: «hoy cualquiera puede entrar»)
 * Antes, cualquiera con el link entraba, elegía un operario y podía ver y cargar datos. Ahora:
 *  - Cada operario entra con su propia contraseña. Se manejan en la hoja «accesos_app» de esta planilla:
 *      operario_id · nombre · clave · estado (Activo / Baja) · observaciones
 *    Para poner o cambiar una contraseña: escribirla en la columna «clave». La primera vez que alguien entra, la app la
 *    guarda protegida (propiedades del script) y en la celda queda «(guardada)», para que no se vea al abrir la planilla.
 *    Al cambiarla, los celulares que entraron con la anterior tienen que volver a entrar. «Baja» deja afuera a esa persona.
 *  - Belén entra con «Belén Pellegrini (HyS)» y la MISMA clave del Portal HyS (clave MAESTRA de la planilla de claves del
 *    sistema). Si cambia esa clave, se cambia también acá, sin hacer nada más.
 *  - Al entrar, el servidor da un permiso (token) que el celular guarda 180 días: con él se mandan los registros, también
 *    los que quedaron sin señal. Sin permiso válido, el servidor no da datos ni guarda nada (respuesta «sin_acceso»).
 *  - El Portal HyS (Modulo5.gs del Sistema HyS) consulta este servidor con la huella (SHA-256) de la clave MAESTRA.
 *  - 5 contraseñas equivocadas seguidas para un mismo nombre lo bloquean 15 minutos.
 */
const ACC_HOJA_APP = "accesos_app";
const ACC_CLAVES_SISTEMA = "10XGA0pgXzCrqTcRRvXYUS_UeKVjs1LY8Tj0JTwcnnvM";   // planilla de claves del Sistema HyS (fila MAESTRA = clave del Portal HyS)
const ACC_GUARDADA_APP = "(guardada)";
const ACC_DIAS_PERMISO = 180;
const ACC_HYS = { id: "hys", nombre: "Belén Pellegrini (HyS)" };

const accSha_ = (t) => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8).map((b) => ("0" + ((b + 256) % 256).toString(16)).slice(-2)).join("");
const accLimpio_ = (t) => String(t == null ? "" : t).trim();

function accHojaApp_(ss) {
  let sh = ss.getSheetByName(ACC_HOJA_APP);
  if (!sh) {
    sh = ss.insertSheet(ACC_HOJA_APP);
    sh.getRange(1, 1, 1, 5).setValues([["operario_id", "nombre", "clave", "estado", "observaciones"]]).setFontWeight("bold").setBackground("#EAF3F6");
    sh.setFrozenRows(1);
    sh.getRange(1, 3).setNote("Escribí la contraseña nueva acá. Al primer ingreso queda protegida y la celda muestra «(guardada)». Para cambiarla, escribí otra encima.");
    const ops = ss.getSheetByName("operarios");
    const filas = ops && ops.getLastRow() > 1 ? ops.getRange(2, 1, ops.getLastRow() - 1, 2).getValues().filter((r) => r[0]) : [];
    if (filas.length) sh.getRange(2, 1, filas.length, 5).setValues(filas.map((r) => [r[0], r[1], "", "Activo", "Contraseña personal de la app MIP"]));
  }
  return sh;
}

// Operarios con su huella de contraseña. Las contraseñas escritas a mano pasan a las propiedades y la celda queda «(guardada)».
function accOperarios_(ss) {
  const sh = accHojaApp_(ss), P = PropertiesService.getScriptProperties();
  if (sh.getLastRow() < 2) return [];
  const V = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  return V.map((r, i) => {
    const id = accLimpio_(r[0]); if (!id || id === ACC_HYS.id) return null;   // la fila de Belén es solo informativa: entra con la clave del Portal HyS
    let c = accLimpio_(r[2]);
    if (c && c !== ACC_GUARDADA_APP) { P.setProperty("MIP_CLAVE_" + id, accSha_(c)); sh.getRange(i + 2, 3).setValue(ACC_GUARDADA_APP); }
    return { id: id, nombre: accLimpio_(r[1]) || id, huella: P.getProperty("MIP_CLAVE_" + id) || "", activo: /^activ/i.test(accLimpio_(r[3])) };
  }).filter(Boolean);
}

function accHuellaMaestra_() {
  const c = CacheService.getScriptCache(), k = c.get("mip_maestra"); if (k) return k;
  const v = SpreadsheetApp.openById(ACC_CLAVES_SISTEMA).getSheets()[0].getDataRange().getValues().slice(1).find((r) => accLimpio_(r[1]) === "MAESTRA");
  const h = v && accLimpio_(v[2]) ? accSha_(accLimpio_(v[2]).toLowerCase()) : "";   // el portal no distingue mayúsculas en la maestra
  if (h) c.put("mip_maestra", h, 300);
  return h;
}

// Ingreso: { tipo: "login", operario_id, clave } → { ok, token, operario: { id, nombre } }
function accLogin_(ss, body) {
  const id = accLimpio_(body.operario_id), clave = accLimpio_(body.clave), C = CacheService.getScriptCache(), kb = "mip_bloq_" + id;
  const intentos = Number(C.get(kb) || 0);
  if (intentos >= 5) return { ok: false, error: "bloqueado", mensaje: "Demasiados intentos con contraseña equivocada. Esperá 15 minutos o pedile a Belén que la revise." };
  if (!id || !clave) return { ok: false, error: "datos", mensaje: "Elegí tu nombre y escribí tu contraseña." };
  let quien = null, huella = "";
  if (id === ACC_HYS.id) { huella = accHuellaMaestra_(); if (huella && accSha_(clave.toLowerCase()) === huella) quien = ACC_HYS; }
  else {
    const o = accOperarios_(ss).find((x) => x.id === id);
    if (o && !o.activo) return { ok: false, error: "baja", mensaje: "Tu acceso está dado de baja. Hablá con Belén." };
    if (o && !o.huella) return { ok: false, error: "sin_clave", mensaje: "Todavía no tenés contraseña. Pedísela a Belén." };
    if (o && accSha_(clave) === o.huella) { quien = { id: o.id, nombre: o.nombre }; huella = o.huella; }
  }
  if (!quien) { C.put(kb, String(intentos + 1), 900); return { ok: false, error: "clave", mensaje: "La contraseña no es correcta." }; }
  C.remove(kb);
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
  PropertiesService.getScriptProperties().setProperty("MIP_TOK_" + token, JSON.stringify({ id: quien.id, nombre: quien.nombre, h: huella.slice(0, 16), exp: Date.now() + ACC_DIAS_PERMISO * 864e5 }));
  accLimpiarTokens_();
  return { ok: true, token: token, operario: quien, dias: ACC_DIAS_PERMISO };
}

// Permiso válido → { id, nombre }; si no, null. Se invalida si venció, si cambió la contraseña o si la persona está de baja.
function accPermiso_(ss, token) {
  token = accLimpio_(token); if (!/^[a-f0-9]{40}$/.test(token)) return null;
  const C = CacheService.getScriptCache(), k = "mip_tok_" + token, en = C.get(k); if (en) return JSON.parse(en);
  const raw = PropertiesService.getScriptProperties().getProperty("MIP_TOK_" + token); if (!raw) return null;
  let t; try { t = JSON.parse(raw); } catch (e) { return null; }
  if (!t || t.exp < Date.now()) { PropertiesService.getScriptProperties().deleteProperty("MIP_TOK_" + token); return null; }
  const actual = t.id === ACC_HYS.id ? accHuellaMaestra_() : (() => { const o = accOperarios_(ss).find((x) => x.id === t.id); return o && o.activo ? o.huella : ""; })();
  if (!actual || actual.slice(0, 16) !== t.h) return null;
  const p = { id: t.id, nombre: t.nombre }; C.put(k, JSON.stringify(p), 600);
  return p;
}

// Llamadas del Portal HyS (servidor a servidor): huella de la clave MAESTRA
function accServicioOk_(huella) { const h = accHuellaMaestra_(); return !!h && accLimpio_(huella) === h; }

// Borra los permisos vencidos (para no llenar las propiedades)
function accLimpiarTokens_() {
  const P = PropertiesService.getScriptProperties(), all = P.getProperties(), ahora = Date.now();
  Object.keys(all).filter((k) => k.indexOf("MIP_TOK_") === 0).forEach((k) => { try { if (JSON.parse(all[k]).exp < ahora) P.deleteProperty(k); } catch (e) { P.deleteProperty(k); } });
}

// Para Belén desde el editor: deja afuera a todos los celulares (todos vuelven a poner su contraseña)
function cerrarTodasLasSesiones() {
  const P = PropertiesService.getScriptProperties(), all = P.getProperties();
  Object.keys(all).filter((k) => k.indexOf("MIP_TOK_") === 0).forEach((k) => P.deleteProperty(k));
  Logger.log("Listo: todos los celulares tienen que volver a entrar con su contraseña.");
}
