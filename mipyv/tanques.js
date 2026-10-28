// ============================================================
// TANQUES Y CISTERNAS — red Trelew, sin el HMH (28/10/2026, pedido de Belén)
// Javier y Paulo cargan:
//  · el relevamiento de cada tanque o cisterna (datos + estado + fotos),
//  · el relevamiento de estado cada 3 meses (POE-AGU-001, 10.1),
//  · cada limpieza, con la foto del F-AGU-01-T firmado (el PDF se descarga desde acá para imprimir).
// Se guarda en la BASE COMÚN del sistema HyS (Apps Script › Tanques_MIPyV.gs): RESERVORIOS, AGUA_INSPECCIONES y AGUA_LIMPIEZAS.
// Funciona sin señal: lo cargado queda en la cola y se manda solo. Lo que se está cargando se guarda en el celular
// (fotos incluidas) por si la app se cierra al abrir la cámara.
// ============================================================
let TANQUES_CAT = { lugares: [], tanques: [], hoy: "", meses_inspeccion: 3 };
const TQ_LOCAL_KEY = "mipyv_tanques_local_v1";     // lo cargado en este celular que todavía no volvió de la planilla
// formulario para imprimir: va en la app y anda sin señal; desde el respaldo de Google (?p=mipyv) se abre el de GitHub
const TQ_F1_PDF = /github\.io$|^localhost$/.test(location.hostname) ? "F-AGU-01-T.pdf" : "https://hyslhmh-sudo.github.io/manifiestos/mipyv/F-AGU-01-T.pdf";
const TQ_POE_URL = "https://drive.google.com/file/d/1Shg_2wJYtw8xK6G0_VpbjfxEF7FWckol/view";   // POE-AGU-001 completo (Drive)
const TQ_PREGS = [
  ["FISURAS", "¿Tiene fisuras o pierde agua?", "No"],
  ["OXIDO", "¿Tiene óxido o está deteriorado?", "No"],
  ["SEDIMENTO", "¿Se ve barro o sedimento en el fondo?", "No"],
  ["OLOR_TURBIDEZ", "¿El agua tiene olor raro o se ve turbia?", "No"],
  ["FLOTANTE_OK", "¿El flotante y las válvulas andan bien?", "Sí"],
  ["VENTILACION_MALLA", "¿La ventilación tiene malla?", "Sí"],
  ["INSECTOS", "¿Hay insectos, nidos o restos de animales?", "No"],
  ["ACCESO_SEGURO", "¿Se puede llegar al tanque de forma segura?", "Sí"],
];
const TQ_LIMPIAR = ["SEDIMENTO", "OLOR_TURBIDEZ", "INSECTOS"];
const TQ_OPC = {
  TAPA: ["Sí, en condiciones", "Deficiente", "No tiene"],
  TIPO: ["Tanque elevado", "Cisterna", "Tanque de bombeo", "Otro"],
  USO: ["Consumo humano", "Consumo y reserva de incendio", "Reserva de incendio", "Riego", "Mixto"],
  MATERIAL: ["Plástico", "Fibrocemento", "Hormigón", "Acero inoxidable", "Otro", "No sé"],
  ACCESO: ["Escalera fija", "Escalera móvil", "A nivel", "Espacio confinado", "Otro"],
  MUESTRA_TOMADA: ["Ya se pidió", "Pendiente", "No corresponde esta vez"],
};
let tq = { vista: "lugares", lugar: null, codigo: null, form: null, aviso: "" };

const tqHoy = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const tqFecha = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || "") ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "—";
function tqMas(iso, meses) { if (!/^\d{4}-\d{2}-\d{2}/.test(iso || "")) return ""; const d = new Date(iso.slice(0, 10) + "T12:00:00"); d.setMonth(d.getMonth() + meses); return d.toISOString().slice(0, 10); }
const tqDias = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || "") ? Math.round((new Date(iso.slice(0, 10) + "T12:00:00") - new Date(tqHoy() + "T12:00:00")) / 864e5) : null;
const tqNum = (v) => { const n = Number(String(v == null ? "" : v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
const tqComa = (n) => String(Math.round(n * 100) / 100).replace(".", ",");

// ---------- datos: lo que vino de la planilla + lo cargado en este celular
function tqLocal() { try { return JSON.parse(localStorage.getItem(TQ_LOCAL_KEY) || "null") || { tanques: {}, altas: [] }; } catch (e) { return { tanques: {}, altas: [] }; } }
function tqLocalGuardar(l) { try { localStorage.setItem(TQ_LOCAL_KEY, JSON.stringify(l)); } catch (e) { /* sin espacio */ } }
function tqTanques() {
  const L = tqLocal();
  const lista = (TANQUES_CAT.tanques || []).map(t => {
    const o = Object.assign({}, t), x = L.tanques[t.codigo] || {};
    ["ultima_insp", "ultima_limpieza"].forEach(k => { if (x[k] && (!o[k] || x[k] > o[k])) { o[k] = x[k]; if (k === "ultima_insp") o.resultado_insp = x.resultado_insp; if (k === "ultima_limpieza") o.proxima_limpieza = x.proxima_limpieza; } });
    ["ubicacion", "tipo", "uso", "capacidad", "material", "acceso", "tapa"].forEach(k => { if (x[k]) o[k] = x[k]; });
    if (x.fuera) o.fuera = true;
    return o;
  }).filter(t => !t.fuera);
  L.altas.forEach(a => lista.push({ codigo: "", uid: a.uid, pendiente: true, lugares: [a.lugar_id], ubicacion: a.UBICACION, tipo: a.TIPO, uso: a.USO, capacidad: a.CAPACIDAD_L, tapa: a.TAPA, acceso: a.ACCESO, ultima_insp: a.FECHA, resultado_insp: a.resultado, ultima_limpieza: a.ULTIMA_LIMPIEZA || "" }));
  return lista;
}
const tqDe = (idLugar) => tqTanques().filter(t => (t.lugares || []).indexOf(idLugar) >= 0);

// Estado de un tanque: avisos [{nivel: "er"|"wa"|"ok", txt}]
function tqEstado(t) {
  const av = [], uso = String(t.uso || "");
  if (t.pendiente) av.push({ nivel: "wa", txt: "Recién cargado: se envía con señal y después tiene código" });
  const pi = t.ultima_insp ? tqMas(t.ultima_insp, TANQUES_CAT.meses_inspeccion || 3) : "", di = tqDias(pi);
  if (!t.ultima_insp) av.push({ nivel: "er", txt: "Falta el primer relevamiento de estado" });
  else if (di < 0) av.push({ nivel: "er", txt: "Relevamiento vencido (tocaba el " + tqFecha(pi) + ")" });
  else if (di <= 15) av.push({ nivel: "wa", txt: "Relevamiento: toca el " + tqFecha(pi) });
  if (!/riego/i.test(uso)) {
    const pl = t.proxima_limpieza || (t.ultima_limpieza ? tqMas(t.ultima_limpieza, 12) : ""), dl = tqDias(pl);
    if (!t.ultima_limpieza) av.push({ nivel: "er", txt: "Sin limpieza registrada" });
    else if (dl < 0) av.push({ nivel: "er", txt: "Limpieza vencida (tocaba el " + tqFecha(pl) + ")" });
    else if (dl <= 30) av.push({ nivel: "wa", txt: "Limpieza: toca el " + tqFecha(pl) });
    if (/limpieza/i.test(t.resultado_insp || "") && t.ultima_insp && (!t.ultima_limpieza || t.ultima_limpieza < t.ultima_insp)) av.push({ nivel: "er", txt: "El último relevamiento pide limpiarlo" });
  }
  if (/reparaci/i.test(t.resultado_insp || "")) av.push({ nivel: "wa", txt: "Necesita una reparación (lo ve Higiene y Seguridad)" });
  if (!av.length) av.push({ nivel: "ok", txt: "Al día · limpieza " + tqFecha(t.ultima_limpieza) + " · relevamiento " + tqFecha(t.ultima_insp) });
  return av;
}
const tqPeor = (avs) => avs.some(a => a.nivel === "er") ? "er" : avs.some(a => a.nivel === "wa") ? "wa" : "ok";

// ---------- catálogo (lo llama app.js › aplicarCatalogos y actualizarCatalogosDesdePlanilla)
async function tqAplicarCatalogo(c) {
  if (!c || !Array.isArray(c.tanques)) return;
  TANQUES_CAT = c;
  // las altas que ya salieron de la cola están en la planilla: se sacan de la copia local
  try {
    const cola = await colaListar(), enCola = new Set(cola.filter(it => it.tipo === "alta_tanque").map(it => it.data && it.data.id_alta));
    const L = tqLocal(); L.altas = L.altas.filter(a => enCola.has(a.uid)); tqLocalGuardar(L);
  } catch (e) { /* sin cola: se deja como está */ }
  tqPintarHome();
  if (currentModule === "tanques" && !tq.form) tqRender();
}

// ---------- inicio: tarjeta del módulo con los avisos
function tqPintarHome() {
  const sub = document.getElementById("tqHomeSub"); if (!sub) return;
  const T = tqTanques(), n = T.length;
  if (!n) { sub.textContent = (TANQUES_CAT.lugares || []).length ? "Relevamiento y limpieza · red Trelew" : "Relevamiento y limpieza · tocá Sincronizar con señal"; return; }
  const er = T.filter(t => tqPeor(tqEstado(t)) === "er").length;
  sub.textContent = n + (n === 1 ? " cargado" : " cargados") + (er ? " · " + er + " con algo vencido" : " · todo al día");
}

// ---------- pantalla principal (data-step="t-main")
const tqBox = () => document.getElementById("tanquesBox");
function tqRender() {
  const box = tqBox(); if (!box) return;
  if (tq.form) return tqRenderForm();
  if (tq.vista === "poe") return tqRenderPoe();
  if (tq.vista === "lugar" && tq.lugar) return tqRenderLugar();
  tqRenderLugares();
}
function tqBotonesDoc() {
  return `<div class="tq-docs"><a class="ext-editar tq-doc" href="${TQ_F1_PDF}" download="F-AGU-01-T Limpieza de tanque.pdf" target="_blank" rel="noopener">📄 Descargar el F-AGU-01-T para imprimir (PDF)</a>
    <button type="button" class="ext-editar tq-doc" data-tq="poe">📘 Cómo se limpia un tanque (nuestro protocolo)</button></div>`;
}
function tqAvisoHtml() { if (!tq.aviso) return ""; const a = tq.aviso; tq.aviso = ""; return `<div class="tq-ok">${escX(a)}</div>`; }
function tqRenderLugares() {
  const box = tqBox(), L = TANQUES_CAT.lugares || [];
  let h = tqAvisoHtml() + tqBotonesDoc();
  if (!L.length) h += `<div class="ext-card"><div class="ext-preg">Todavía no se descargó la lista de lugares.</div><div class="step-sub">Tocá «Sincronizar» arriba, con señal, y volvé a entrar.</div></div>`;
  h += `<div class="step-sub" style="margin:6px 0 8px">Elegí el lugar</div>`;
  L.forEach(l => {
    const T = tqDe(l.id), avs = T.map(t => tqPeor(tqEstado(t))), er = avs.filter(x => x === "er").length, wa = avs.filter(x => x === "wa").length;
    const txt = !T.length ? "Sin tanques cargados · tocá para agregarlos" : T.length + (T.length === 1 ? " tanque o cisterna" : " tanques o cisternas") + (er ? " · ⚠️ " + er + " con algo vencido" : wa ? " · ⏰ " + wa + " por vencer" : " · todo al día");
    h += `<button type="button" class="ext-fila${T.length && !er && !wa ? " ok" : ""}" data-lugar="${escX(l.id)}"><span class="ext-ico">${!T.length ? "➕" : er ? "⚠️" : wa ? "⏰" : "✅"}</span><span class="ext-txt"><b>${escX(l.nombre)}</b><small>${escX(txt)}</small></span></button>`;
  });
  box.innerHTML = h;
  box.querySelectorAll("[data-lugar]").forEach(b => b.onclick = () => { tq.vista = "lugar"; tq.lugar = L.find(x => x.id === b.dataset.lugar); tqRender(); screensEl.scrollTop = 0; });
  tqBind(box);
}
function tqRenderLugar() {
  const box = tqBox(), l = tq.lugar, T = tqDe(l.id);
  let h = `<button type="button" class="ext-quitar tq-volver" data-tq="volver">← Volver a los lugares</button>` + tqAvisoHtml() +
    `<div class="step-title" style="font-size:1.25rem">${escX(l.nombre)}</div><div class="step-sub">Tocá un tanque para el relevamiento de estado, registrar una limpieza o corregir sus datos.</div>`;
  if (!T.length) h += `<div class="ext-card"><div class="ext-preg">No hay tanques ni cisternas cargados en este lugar.</div><div class="step-sub">Agregá cada uno con el botón de abajo: datos, cómo está y una foto.</div></div>`;
  T.forEach(t => {
    const avs = tqEstado(t), peor = tqPeor(avs), abierto = !t.pendiente && tq.codigo === t.codigo;
    h += `<button type="button" class="ext-fila${peor === "ok" ? " ok" : ""}${abierto ? " abierta" : ""}${t.pendiente ? " nuevo" : ""}" data-cod="${escX(t.codigo)}"${t.pendiente ? " disabled" : ""}>
      <span class="ext-ico">${/cisterna/i.test(t.tipo) ? "🛢️" : "💧"}</span><span class="ext-txt"><b>${escX(t.codigo || "Nuevo")} · ${escX(t.tipo || "s/d")}${t.capacidad ? " · " + escX(Number(t.capacidad) ? Number(t.capacidad).toLocaleString("es-AR") + " L" : t.capacidad) : ""}</b>
      <small>${escX(t.ubicacion || "s/d")}</small>${avs.map(a => `<small class="ext-vto ${a.nivel === "ok" ? "" : a.nivel}">${a.nivel === "er" ? "⚠️ " : a.nivel === "wa" ? "⏰ " : "✅ "}${escX(a.txt)}</small>`).join("")}</span></button>`;
    if (abierto) h += `<div class="ext-panel"><button type="button" class="ext-listo" data-accion="insp">🔍 Relevamiento de estado (cada 3 meses)</button>
      <button type="button" class="ext-listo tq-azul" data-accion="limp">🧽 Registrar una limpieza (foto del F-AGU-01-T)</button>
      <button type="button" class="ext-editar" data-accion="edit">✏️ Corregir los datos de este tanque</button>
      <div class="step-sub" style="margin-top:8px">Última limpieza: ${tqFecha(t.ultima_limpieza)} · último relevamiento: ${tqFecha(t.ultima_insp)}${t.resultado_insp ? " (" + escX(t.resultado_insp) + ")" : ""} · tapa: ${escX(t.tapa || "s/d")} · acceso: ${escX(t.acceso || "s/d")}</div></div>`;
  });
  h += `<button type="button" class="ext-agregar" data-tq="alta">➕ Agregar un tanque o cisterna</button>` + tqBotonesDoc();
  box.innerHTML = h;
  box.querySelectorAll("[data-cod]").forEach(b => b.onclick = () => { if (!b.dataset.cod) return; tq.codigo = tq.codigo === b.dataset.cod ? null : b.dataset.cod; tqRender(); });
  box.querySelectorAll("[data-accion]").forEach(b => b.onclick = () => tqAbrirForm(b.dataset.accion, tqTanques().find(t => t.codigo === tq.codigo)));
  tqBind(box);
}
function tqBind(box) {
  box.querySelectorAll("[data-tq]").forEach(b => b.onclick = () => {
    const a = b.dataset.tq;
    if (a === "poe") { tq.vistaAntes = tq.vista; tq.vista = "poe"; tqRender(); screensEl.scrollTop = 0; }
    else if (a === "volver") { tq.vista = tq.vista === "poe" ? (tq.vistaAntes || "lugares") : "lugares"; if (tq.vista === "lugares") tq.codigo = null; tqRender(); screensEl.scrollTop = 0; }
    else if (a === "alta") tqAbrirForm("alta", null);
  });
}

// ---------- protocolo resumido (anda sin señal)
function tqRenderPoe() {
  const pasos = [
    ["Antes", ["Avisar el corte a los sectores. Si es el único tanque del lugar, prever agua.", "Guantes de nitrilo o PVC, antiparras, ropa impermeable y botas. Tanque alto: escalera segura y arnés.", "Si hay que meterse adentro (espacio confinado): permiso firmado por Higiene y Seguridad, medir el aire, arnés con línea de vida y alguien afuera mirando todo el tiempo. Nunca solo."]],
    ["Paso 1 · Limpieza", ["Cerrar la entrada de agua.", "Vaciar dejando 20 a 30 cm de agua.", "Cerrar las salidas a las cañerías.", "Cepillar piso, paredes y tapa con cepillo de cerdas plásticas. SIN detergente.", "Vaciar del todo y sacar el barro."]],
    ["Paso 2 · Desinfección", ["Empezar a llenar con agua de red.", "Agregar lavandina al 5,5 %: 2 litros cada 1.000 litros de tanque (tanque de 1.100 L → 2,2 L; de 2.750 L → 5,5 L).", "Abrir las canillas hasta sentir olor a cloro en cada una y cerrarlas.", "Cerrar la entrada y dejar todo cerrado mínimo 3 horas (mejor 6)."]],
    ["Paso 3 · Enjuague", ["Abrir todas las canillas hasta vaciar el agua con cloro.", "Abrir la entrada y dejar correr hasta que el olor y el sabor a cloro sean aceptables.", "Tapar bien el tanque (no sirve lona ni nylon).", "Medir el cloro en la canilla más alejada: tiene que dar entre 0,2 y 2 mg/L.", "Completar y firmar el F-AGU-01-T y sacarle una foto acá, en «Registrar una limpieza»."]],
    ["Cada 3 meses", ["Mirar cada tanque y cargar el «Relevamiento de estado». Si hay barro, olor, agua turbia, bichos o el cloro no da, se limpia aunque no toque."]],
  ];
  tqBox().innerHTML = `<button type="button" class="ext-quitar tq-volver" data-tq="volver">← Volver</button>
    <div class="step-title" style="font-size:1.25rem">Cómo se limpia un tanque</div><div class="step-sub">Resumen de nuestro protocolo POE-AGU-001 (Higiene y Seguridad HZT/HMH). El detalle está en el F-AGU-01-T.</div>` +
    pasos.map(([t, l]) => `<div class="ext-card"><h4>${t}</h4><ol class="tq-ol">${l.map(x => "<li>" + escX(x) + "</li>").join("")}</ol></div>`).join("") +
    tqBotonesDoc().replace(/<button[^]*?<\/button>/, "") +
    `<a class="ext-editar tq-doc" href="${TQ_POE_URL}" target="_blank" rel="noopener">📘 Ver el POE-AGU-001 completo (necesita señal)</a>`;
  tqBind(tqBox());
}

// ---------- formularios
function tqFormVacio(accion, t) {
  const f = { accion: accion, codigo: t ? t.codigo : "", lugar: tq.lugar, uid: "TQ" + Date.now() + Math.floor(Math.random() * 1000), FECHA: tqHoy(), datos: {}, fotos: [], obs: "" };
  if (accion === "alta" || accion === "insp") { TQ_PREGS.forEach(([k]) => f.datos[k] = null); f.datos.TAPA = accion === "insp" && t ? (TQ_OPC.TAPA.indexOf(t.tapa) >= 0 ? t.tapa : null) : null; f.datos.CLORO_MG_L = ""; }
  if (accion === "alta") Object.assign(f.datos, { UBICACION: "", TIPO: null, USO: "Consumo humano", CAPACIDAD_L: "", MATERIAL: null, ACCESO: null, ULTIMA_LIMPIEZA: "" });
  if (accion === "limp") Object.assign(f.datos, { HORA_CORTE: "", HORA_REHABILITACION: "", HORAS_CERRADO: "", VOLUMEN_L: "", CLORO_PPM: "", TAPA: t && TQ_OPC.TAPA.indexOf(t.tapa) >= 0 ? t.tapa : null, MUESTRA_TOMADA: null, capacidad: t ? t.capacidad : "" });
  if (accion === "edit") Object.assign(f.datos, { UBICACION: t.ubicacion || "", TIPO: t.tipo || null, USO: t.uso || null, CAPACIDAD_L: t.capacidad || "", MATERIAL: t.material || null, ACCESO: t.acceso || null, FUERA: false });
  return f;
}
function tqAbrirForm(accion, t) { tq.form = tqFormVacio(accion, t); tqBorradorGuardar(); tqRender(); screensEl.scrollTop = 0; }
const TQ_TITULO = { alta: "Agregar un tanque o cisterna", insp: "Relevamiento de estado", limp: "Registrar una limpieza", edit: "Corregir los datos" };

function tqFaltan(f) {
  const d = f.datos, x = [];
  if (f.accion === "alta" || f.accion === "edit") {
    if (!String(d.UBICACION || "").trim()) x.push("dónde está");
    if (!d.TIPO) x.push("tipo"); if (!d.USO) x.push("uso");
    if (!tqNum(d.CAPACIDAD_L)) x.push("capacidad"); if (!d.ACCESO) x.push("acceso");
  }
  if (f.accion === "alta" || f.accion === "insp") {
    if (!d.TAPA) x.push("tapa");
    const sin = TQ_PREGS.filter(([k]) => !d[k]).length; if (sin) x.push(sin === 1 ? "1 pregunta" : sin + " preguntas");
    if (!f.fotos.length) x.push("una foto");
  }
  if (f.accion === "limp") {
    if (!d.HORAS_CERRADO) x.push("horas cerrado"); if (!String(d.CLORO_PPM || "").trim()) x.push("cloro medido");
    if (!d.TAPA) x.push("tapa"); if (!f.fotos.length) x.push("la foto del F-AGU-01-T firmado");
  }
  if (!f.FECHA) x.push("fecha");
  return x;
}
function tqOpc(campo, valores, actual) { return `<div class="ext-opc" data-campo="${campo}">${valores.map(v => `<button type="button" class="${actual === v ? "on" : ""}" data-valor="${escX(v)}">${escX(v)}</button>`).join("")}</div>`; }
function tqRenderForm() {
  const f = tq.form, d = f.datos, box = tqBox(), t = tqTanques().find(x => x.codigo === f.codigo);
  let h = `<button type="button" class="ext-quitar tq-volver" data-f="cancelar">← Cancelar</button>
    <div class="step-title" style="font-size:1.25rem">${TQ_TITULO[f.accion]}</div>
    <div class="step-sub">${escX(f.lugar ? f.lugar.nombre : "")}${t ? " · " + escX(t.codigo) + " · " + escX(t.ubicacion || "") : ""}</div><div class="ext-card tq">`;
  h += `<div class="ext-preg">Fecha</div><input class="ext-inp" type="date" data-dato="FECHA" value="${escX(f.FECHA)}" max="${tqHoy()}">`;
  if (f.accion === "alta" || f.accion === "edit") {
    h += `<div class="ext-preg">¿Dónde está exactamente?</div><input class="ext-inp" data-dato="UBICACION" value="${escX(d.UBICACION)}" placeholder="Ej.: techo del edificio principal, patio del fondo">
      <div class="ext-preg">Tipo</div>${tqOpc("TIPO", TQ_OPC.TIPO, d.TIPO)}
      <div class="ext-preg">¿Para qué se usa el agua?</div>${tqOpc("USO", TQ_OPC.USO, d.USO)}
      <div class="ext-preg">Capacidad (litros)</div><input class="ext-inp" inputmode="numeric" data-dato="CAPACIDAD_L" value="${escX(d.CAPACIDAD_L)}" placeholder="Ej.: 1100 (si no se sabe, el número del tanque o aproximado)">
      <div class="ext-preg">Material (si se sabe)</div>${tqOpc("MATERIAL", TQ_OPC.MATERIAL, d.MATERIAL)}
      <div class="ext-preg">¿Cómo se llega?</div>${tqOpc("ACCESO", TQ_OPC.ACCESO, d.ACCESO)}`;
    if (f.accion === "alta") h += `<div class="ext-preg">Última limpieza (si se sabe)</div><input class="ext-inp" type="date" data-dato="ULTIMA_LIMPIEZA" value="${escX(d.ULTIMA_LIMPIEZA)}" max="${tqHoy()}">`;
    if (f.accion === "edit") h += `<label class="ext-chk"><input type="checkbox" data-dato="FUERA"${d.FUERA ? " checked" : ""}> Este tanque ya no se usa (fuera de uso)</label>`;
  }
  if (f.accion === "alta" || f.accion === "insp") {
    h += `<h4 style="margin-top:16px">${f.accion === "alta" ? "¿Cómo está?" : "Mirá el tanque y contestá"}</h4><div class="ext-preg">¿Cómo está la tapa?</div>${tqOpc("TAPA", TQ_OPC.TAPA, d.TAPA)}`;
    TQ_PREGS.forEach(([k, preg, bien]) => {
      const mal = d[k] && d[k] !== bien;
      h += `<div class="ext-preg">${preg}</div><div class="sino tq-sino" data-campo="${k}"><button type="button" class="${d[k] === "Sí" ? "on" : ""}" data-valor="Sí">Sí</button><button type="button" class="${d[k] === "No" ? "on" : ""}" data-valor="No">No</button></div>` +
        (mal ? `<small class="ext-vto ${TQ_LIMPIAR.indexOf(k) >= 0 ? "er" : "wa"}">${TQ_LIMPIAR.indexOf(k) >= 0 ? "⚠️ Hay que limpiarlo aunque no toque" : "⚠️ Necesita arreglo: anotalo en Observaciones"}</small>` : "");
    });
    h += `<div class="ext-preg">Cloro en la canilla (mg/L) · solo si tenés el medidor</div><input class="ext-inp" inputmode="decimal" data-dato="CLORO_MG_L" value="${escX(d.CLORO_MG_L)}" placeholder="Ej.: 0,4">`;
    const cl = tqNum(d.CLORO_MG_L); if (String(d.CLORO_MG_L).trim() !== "" && cl !== null && (cl < 0.2 || cl > 2)) h += `<small class="ext-vto er">⚠️ Fuera de rango (0,2 a 2): hay que limpiarlo</small>`;
  }
  if (f.accion === "limp") {
    const cap = tqNum(d.capacidad), lav = cap ? cap / 1000 * 2 : null;
    h += `<div class="tq-info">Usá el F-AGU-01-T impreso y seguí los pasos. Lavandina al 5,5 %: <b>2 litros cada 1.000 litros</b>${lav ? ` → para este tanque de ${cap.toLocaleString("es-AR")} L: <b>${tqComa(lav)} litros</b>` : ""}.</div>
      <div class="tq-dos"><div><div class="ext-preg">Hora de corte</div><input class="ext-inp" type="time" data-dato="HORA_CORTE" value="${escX(d.HORA_CORTE)}"></div>
      <div><div class="ext-preg">Hora en que volvió el agua</div><input class="ext-inp" type="time" data-dato="HORA_REHABILITACION" value="${escX(d.HORA_REHABILITACION)}"></div></div>
      <div class="ext-preg">¿Cuántas horas quedó cerrado con la lavandina?</div>${tqOpc("HORAS_CERRADO", ["3", "4", "5", "6", "Más de 6"], d.HORAS_CERRADO)}
      <div class="ext-preg">Litros de lavandina que usaste</div><input class="ext-inp" inputmode="decimal" data-dato="VOLUMEN_L" value="${escX(d.VOLUMEN_L)}" placeholder="${lav ? "Ej.: " + tqComa(lav) : "Ej.: 2,2"}">
      <div class="ext-preg">Cloro en la canilla más alejada (mg/L)</div><input class="ext-inp" inputmode="decimal" data-dato="CLORO_PPM" value="${escX(d.CLORO_PPM)}" placeholder="Tiene que dar entre 0,2 y 2">`;
    const cl = tqNum(d.CLORO_PPM); if (String(d.CLORO_PPM).trim() !== "" && cl !== null && (cl < 0.2 || cl > 2)) h += `<small class="ext-vto er">⚠️ Fuera de rango: seguí enjuagando y volvé a medir antes de habilitar el agua</small>`;
    h += `<div class="ext-preg">¿Cómo quedó la tapa?</div>${tqOpc("TAPA", TQ_OPC.TAPA, d.TAPA)}
      <div class="ext-preg">Análisis de laboratorio (lo pide Higiene y Seguridad)</div>${tqOpc("MUESTRA_TOMADA", TQ_OPC.MUESTRA_TOMADA, d.MUESTRA_TOMADA)}`;
  }
  if (f.accion !== "edit") {
    const tit = f.accion === "limp" ? "Foto del F-AGU-01-T completo y firmado (las 2 hojas)" : "Fotos del tanque (de afuera y, si se puede, de adentro)";
    h += `<div class="ext-preg" style="margin-top:16px">${tit} · hasta 5</div><div class="foto-grid" id="tqFotoGrid"></div>`;
  }
  h += `<div class="ext-preg" style="margin-top:16px">Observaciones${f.accion === "edit" ? "" : " (opcional)"}</div><textarea class="ext-com" rows="3" data-dato="obs" placeholder="${f.accion === "limp" ? "Lo que no se pudo hacer, arreglos que hacen falta…" : "Lo que quieras contar"}">${escX(f.obs)}</textarea>`;
  const faltan = tqFaltan(f);
  h += `<button type="button" class="ext-listo" data-f="guardar"${faltan.length ? " disabled" : ""}>${faltan.length ? "Falta: " + escX(faltan.join(", ")) : "Listo, guardar"}</button></div>`;
  box.innerHTML = h;
  if (f.accion !== "edit") tqPintarFotos();
  // eventos
  box.querySelectorAll("[data-dato]").forEach(i => {
    const k = i.dataset.dato, poner = () => { const v = i.type === "checkbox" ? i.checked : i.value; if (k === "FECHA") f.FECHA = v; else if (k === "obs") f.obs = v; else d[k] = v; };
    i.oninput = () => { poner(); tqBorradorProgramar(); tqActualizarBoton(); };
    i.onchange = () => { poner(); tqBorradorGuardar(); tqActualizarBoton(); if (/CLORO/.test(k)) { const y = screensEl.scrollTop; tqRenderForm(); screensEl.scrollTop = y; } };   // aviso de cloro fuera de rango
  });
  box.querySelectorAll(".ext-opc[data-campo] button, .sino[data-campo] button").forEach(b => b.onclick = () => {
    const k = b.parentElement.dataset.campo; d[k] = d[k] === b.dataset.valor && b.parentElement.classList.contains("ext-opc") && ["MATERIAL", "MUESTRA_TOMADA"].indexOf(k) >= 0 ? null : b.dataset.valor;
    tqBorradorGuardar(); const y = screensEl.scrollTop; tqRenderForm(); screensEl.scrollTop = y;
  });
  box.querySelector('[data-f="cancelar"]').onclick = () => { if (tqEmpezado(f) && !confirm("¿Salir sin guardar? Se borra lo que cargaste en este formulario.")) return; tq.form = null; tqBorradorBorrar(); tqRender(); };
  box.querySelector('[data-f="guardar"]').onclick = tqGuardar;
}
function tqActualizarBoton() { const b = tqBox().querySelector('[data-f="guardar"]'); if (!b) return; const x = tqFaltan(tq.form); b.disabled = !!x.length; b.textContent = x.length ? "Falta: " + x.join(", ") : "Listo, guardar"; }
function tqEmpezado(f) { return !!f && (f.fotos.length > 0 || !!f.obs.trim() || f.accion === "edit" || TQ_PREGS.some(([k]) => f.datos[k]) || !!String(f.datos.UBICACION || f.datos.HORAS_CERRADO || f.datos.CLORO_PPM || "").trim()); }

// fotos (hasta 5; usa la compresión y el selector cámara / galería de app.js)
const tqFotoInput = document.createElement("input");
tqFotoInput.type = "file"; tqFotoInput.accept = "image/*"; tqFotoInput.setAttribute("capture", "environment"); tqFotoInput.style.display = "none";
document.body.appendChild(tqFotoInput);
tqFotoInput.addEventListener("change", (e) => { const fs = Array.from(e.target.files || []); tqFotoInput.value = ""; if (fs.length && tq.form) agregarFotos(tq.form.fotos, fs, () => { tqPintarFotos(); tqActualizarBoton(); tqBorradorGuardar(); }); });
function tqPintarFotos() {
  const g = document.getElementById("tqFotoGrid"); if (!g || !tq.form) return;
  const F = tq.form.fotos;
  g.innerHTML = F.map((u, i) => `<div class="foto-slot filled"><img src="${u}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button></div>`).join("") +
    (F.length < 5 ? `<button type="button" class="foto-slot add"><span>+</span><small>${F.length}/5</small></button>` : "");
  g.querySelectorAll(".foto-remove").forEach(b => b.onclick = (e) => { e.stopPropagation(); F.splice(Number(b.dataset.i), 1); tqPintarFotos(); tqActualizarBoton(); tqBorradorGuardar(); });
  const add = g.querySelector(".foto-slot.add");
  if (add) add.onclick = () => { tqBorradorGuardar(); elegirOrigenFoto(tqFotoInput, true, fs => agregarFotos(F, fs, () => { tqPintarFotos(); tqActualizarBoton(); tqBorradorGuardar(); })); };
}

// ---------- guardar: a la cola (se manda solo con señal)
async function tqGuardar() {
  const f = tq.form, d = f.datos; if (tqFaltan(f).length) return;
  const base = { operario: currentOperario ? currentOperario.nombre : "", id_operario: currentOperario ? currentOperario.id : "", operario_acompanante: operarioAcompanante || "",
    fecha: new Date().toISOString(), FECHA: f.FECHA, OBSERVACIONES: f.obs.trim(), lugar_id: f.lugar ? f.lugar.id : "", lugar_nombre: f.lugar ? f.lugar.nombre : "" };
  const preg = {}; TQ_PREGS.forEach(([k]) => preg[k] = d[k]);
  let item;
  if (f.accion === "alta") item = { tipo: "alta_tanque", data: Object.assign(base, preg, { id_alta: f.uid, UBICACION: d.UBICACION.trim(), TIPO: d.TIPO, USO: d.USO, CAPACIDAD_L: String(tqNum(d.CAPACIDAD_L)), MATERIAL: d.MATERIAL && d.MATERIAL !== "No sé" ? d.MATERIAL : "", ACCESO: d.ACCESO, TAPA: d.TAPA, CLORO_MG_L: d.CLORO_MG_L, ULTIMA_LIMPIEZA: d.ULTIMA_LIMPIEZA, fotos_base64: f.fotos.slice() }) };
  if (f.accion === "insp") item = { tipo: "inspeccion_tanque", data: Object.assign(base, preg, { id_insp: f.uid, CODIGO_TANQUE: f.codigo, TAPA: d.TAPA, CLORO_MG_L: d.CLORO_MG_L, fotos_base64: f.fotos.slice() }) };
  if (f.accion === "limp") item = { tipo: "limpieza_tanque", data: Object.assign(base, { id_limpieza: f.uid, CODIGO_TANQUE: f.codigo, HORA_CORTE: d.HORA_CORTE, HORA_REHABILITACION: d.HORA_REHABILITACION, HORAS_CERRADO: d.HORAS_CERRADO, VOLUMEN_L: d.VOLUMEN_L, CLORO_PPM: d.CLORO_PPM, TAPA: d.TAPA, MUESTRA_TOMADA: d.MUESTRA_TOMADA || "", fotos_base64: f.fotos.slice() }) };
  if (f.accion === "edit") item = { tipo: "editar_tanque", data: Object.assign(base, { id_edit: f.uid, CODIGO_TANQUE: f.codigo, UBICACION: d.UBICACION.trim(), TIPO: d.TIPO, USO: d.USO, CAPACIDAD_L: String(tqNum(d.CAPACIDAD_L)), MATERIAL: d.MATERIAL && d.MATERIAL !== "No sé" ? d.MATERIAL : "", ACCESO: d.ACCESO, ESTADO: d.FUERA ? "Fuera de uso" : "" }) };
  const btn = tqBox().querySelector('[data-f="guardar"]'); if (btn) btn.disabled = true;
  if (!(await guardarEnCola([item]))) { if (btn) btn.disabled = false; return; }
  // lo cargado se ve enseguida en la lista, aunque no haya señal
  const L = tqLocal(), resultado = f.accion === "alta" || f.accion === "insp" ? tqResultado(d) : "";
  if (f.accion === "alta") L.altas.push({ uid: f.uid, lugar_id: base.lugar_id, UBICACION: d.UBICACION.trim(), TIPO: d.TIPO, USO: d.USO, CAPACIDAD_L: String(tqNum(d.CAPACIDAD_L)), TAPA: d.TAPA, ACCESO: d.ACCESO, FECHA: f.FECHA, resultado: resultado, ULTIMA_LIMPIEZA: d.ULTIMA_LIMPIEZA });
  else {
    const x = L.tanques[f.codigo] = L.tanques[f.codigo] || {};
    if (f.accion === "insp") { x.ultima_insp = f.FECHA; x.resultado_insp = resultado; x.tapa = d.TAPA; }
    if (f.accion === "limp") { x.ultima_limpieza = f.FECHA; x.proxima_limpieza = tqMas(f.FECHA, 12); x.tapa = d.TAPA; }
    if (f.accion === "edit") { Object.assign(x, { ubicacion: d.UBICACION.trim(), tipo: d.TIPO, uso: d.USO, capacidad: String(tqNum(d.CAPACIDAD_L)), material: d.MATERIAL || "", acceso: d.ACCESO }); if (d.FUERA) x.fuera = true; }
  }
  tqLocalGuardar(L);
  await tqBorradorBorrar();
  tq.aviso = (f.accion === "alta" ? "Tanque agregado" : f.accion === "insp" ? "Relevamiento guardado" + (resultado !== "Conforme" ? ": " + resultado.toLowerCase() : ": conforme") : f.accion === "limp" ? "Limpieza guardada" : "Corrección guardada") +
    (navigator.onLine ? " · se está enviando." : " · se envía sola cuando haya señal.");
  tq.form = null; tq.vista = "lugar"; tq.codigo = null; tqRender(); screensEl.scrollTop = 0; tqPintarHome();
  trySync();
}
function tqResultado(d) {
  const lim = TQ_LIMPIAR.some(k => d[k] === "Sí") || (String(d.CLORO_MG_L || "").trim() !== "" && tqNum(d.CLORO_MG_L) !== null && (tqNum(d.CLORO_MG_L) < 0.2 || tqNum(d.CLORO_MG_L) > 2));
  const rep = d.TAPA !== "Sí, en condiciones" || TQ_PREGS.some(([k, , bien]) => TQ_LIMPIAR.indexOf(k) < 0 && d[k] !== bien);
  return lim && rep ? "Requiere limpieza y reparación" : lim ? "Requiere limpieza" : rep ? "Requiere reparación" : "Conforme";
}

// ---------- borrador: lo que se está cargando queda en el celular (fotos incluidas), por si la app se cierra con la cámara
const TQB_DB = "mipyv_tanques_borrador", TQB_ST = "b";
function tqbAbrir() { return new Promise((res, rej) => { if (!("indexedDB" in window)) return rej(new Error("sin IndexedDB")); const r = indexedDB.open(TQB_DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(TQB_ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tqbTx(modo, fn) { const db = await tqbAbrir(); return new Promise((res, rej) => { const tx = db.transaction(TQB_ST, modo), st = tx.objectStore(TQB_ST); let out; fn(st, v => out = v); tx.oncomplete = () => { db.close(); res(out); }; tx.onerror = () => { db.close(); rej(tx.error); }; }); }
let tqbTimer = null;
function tqBorradorProgramar() { clearTimeout(tqbTimer); tqbTimer = setTimeout(tqBorradorGuardar, 500); }
async function tqBorradorGuardar() {
  if (!tq.form) return;
  try { await tqbTx("readwrite", st => st.put({ form: tq.form, operario: currentOperario, acompanante: operarioAcompanante, guardado: Date.now() }, "form")); } catch (e) { /* sin IndexedDB */ }
}
async function tqBorradorBorrar() { try { await tqbTx("readwrite", st => st.delete("form")); } catch (e) { } tqPintarHome(); tqAvisoHome(); }
async function tqBorradorLeer() { try { const b = await tqbTx("readonly", (st, set) => { const r = st.get("form"); r.onsuccess = () => set(r.result); }); if (b && Date.now() - b.guardado > 3 * 864e5) { await tqBorradorBorrar(); return null; } return b || null; } catch (e) { return null; } }
// aviso en el inicio para seguir con un formulario a medias
async function tqAvisoHome() {
  const av = document.getElementById("tqBorradorAviso"); if (!av) return;
  const b = currentModule ? null : await tqBorradorLeer();
  if (!b) { av.style.display = "none"; return; }
  av.innerHTML = `<div style="font-weight:700;margin-bottom:6px">⏸️ Tenés un formulario de tanques sin terminar</div><div style="margin-bottom:10px">${escX(TQ_TITULO[b.form.accion] || "")} · ${escX(b.form.lugar ? b.form.lugar.nombre : "")}${b.form.codigo ? " · " + escX(b.form.codigo) : ""}${b.form.fotos.length ? " · " + b.form.fotos.length + " foto(s)" : ""}</div>
    <button type="button" data-b="seguir" style="width:100%;font-size:17px;padding:12px;border-radius:12px;border:0;background:#0D313F;color:#fff;margin-bottom:8px">Seguir con el formulario</button>
    <button type="button" data-b="descartar" style="width:100%;font-size:15px;padding:9px;border-radius:12px;border:1px solid #8A6D00;background:#fff;color:#3B2F00">Descartarlo</button>`;
  av.querySelector('[data-b="seguir"]').onclick = () => {
    av.style.display = "none";
    currentOperario = b.operario || currentOperario; operarioAcompanante = b.acompanante || null; acompananteRespondido = true;
    enterModule("tanques"); stepIndex = stepList.indexOf("t-main"); tq.form = b.form; tq.lugar = b.form.lugar; tq.vista = "lugar"; tq.codigo = b.form.codigo || null; showStep("t-main");
  };
  av.querySelector('[data-b="descartar"]').onclick = async () => { if (!confirm("¿Descartar el formulario sin terminar? Se borra lo cargado, fotos incluidas.")) return; await tqBorradorBorrar(); };
  av.style.display = "block";
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && currentModule === "tanques") tqBorradorGuardar(); });
window.addEventListener("pagehide", () => { if (currentModule === "tanques") tqBorradorGuardar(); });

// ---------- entrada al módulo (app.js › enterModule y showStep)
function tqEntrar() { tq = { vista: "lugares", lugar: null, codigo: null, form: null, aviso: "" }; }

// al cargar: copia guardada del catálogo
try { const g = JSON.parse(localStorage.getItem("mipyv_catalogos_v1") || "null"); if (g && g.catalogos && g.catalogos.tanques) TANQUES_CAT = g.catalogos.tanques; } catch (e) { }
tqPintarHome();
tqAvisoHome();
