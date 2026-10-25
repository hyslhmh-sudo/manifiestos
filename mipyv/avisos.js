// ============================================================
// CASOS PARA REVISAR Y SOLICITUDES A BELÉN (25/10/2026, pedido de Belén)
// - Casos: cuando una intervención está por vencer (3 días o menos) o ya venció, la pantalla de inicio
//   lo muestra en rojo y pide indicar el cierre: Resuelto o No resuelto (el biocida no hizo efecto,
//   faltan herramientas o insumos, u otro motivo que hay que explicar).
// - Solicitudes a Belén: reiterar pedidos de biocidas (cuál y cuánto) o EPP, pedir que se gestione un
//   aviso en un CAPS o informar una novedad importante, con hasta 5 fotos.
// Todo pasa por la misma cola que las visitas: si no hay señal, se guarda y se envía después.
// El servidor (Casos_Solicitudes_MIPyV.gs) manda la lista de casos y de solicitudes junto con los catálogos.
// ============================================================
const AVISOS_KEY = "mipyv_avisos_v1";            // copia de casos y solicitudes que mandó la planilla
const AVISOS_CERRADOS_KEY = "mipyv_casos_cerrados_v1";   // cierres enviados desde este celular (se ocultan al toque)
const AVISOS_YO_KEY = "mipyv_operario_v1";
const MOTIVOS_NR = [
  { id: "El biocida no hizo efecto", emoji: "🧪", t: "El biocida no hizo efecto" },
  { id: "Falta de herramientas o insumos (biocidas)", emoji: "🧰", t: "Faltan herramientas o insumos (biocidas)" },
  { id: "Otro", emoji: "✏️", t: "Otro motivo (explicar)" },
];
const TIPOS_SOL = [
  { id: "Biocidas", emoji: "🧪", t: "Biocidas", sub: "Qué producto y cuánto" },
  { id: "EPP", emoji: "🧤", t: "EPP", sub: "Guantes, barbijo, anteojos, ropa…" },
  { id: "Aviso en un CAPS", emoji: "📢", t: "Aviso en un CAPS", sub: "Que se avise algo en un CAPS" },
  { id: "Novedad importante", emoji: "⚠️", t: "Novedad importante", sub: "Algo que Belén tiene que saber ya" },
];

const avLeer = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const avGuardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio */ } };
const avEsc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const avFecha = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "")); return m ? m[3] + "/" + m[2] : ""; };

// Lo llama actualizarCatalogosDesdePlanilla (app.js) con lo que devolvió la planilla
function avisosDatos(datos) {
  if (!datos || !Array.isArray(datos.casos)) return;
  avGuardar(AVISOS_KEY, { fecha: new Date().toISOString(), casos: datos.casos, solicitudes: Array.isArray(datos.solicitudes) ? datos.solicitudes : [] });
  // los cierres que la planilla ya registró no hace falta seguir ocultándolos a mano
  const abiertos = {}; datos.casos.forEach((c) => (c.alias || [c.protocolo]).forEach((a) => (abiertos[a] = 1)));
  const cer = avLeer(AVISOS_CERRADOS_KEY, {}); Object.keys(cer).forEach((k) => { if (!abiertos[k] || Date.now() - cer[k] > 3 * 864e5) delete cer[k]; }); avGuardar(AVISOS_CERRADOS_KEY, cer);
  avisosPintar();
}
function avisosCasos() {
  const d = avLeer(AVISOS_KEY, { casos: [] }), cer = avLeer(AVISOS_CERRADOS_KEY, {});
  return (d.casos || []).filter((c) => !cer[c.protocolo]);
}
function avisosSolicitudes() { return (avLeer(AVISOS_KEY, { solicitudes: [] }).solicitudes || []); }

// ---------- Pantalla de inicio ----------
function avisosPintar() {
  const box = document.getElementById("avisosHome"); if (!box) return;
  const casos = avisosCasos(), urg = casos.filter((c) => c.urgente);
  const resp = avisosSolicitudes().filter((s) => s.respuesta && s.estado !== "Pendiente").length;
  box.innerHTML = (urg.length
    ? `<button type="button" class="av-urgente" data-av="casos"><span class="av-emo">⚠️</span><span><b>Revisar urgente: ${urg.length} caso${urg.length > 1 ? "s" : ""}</b><small>Tocá para indicar si quedó resuelto</small></span></button>`
    : casos.length ? `<button type="button" class="av-suave" data-av="casos"><span class="av-emo">📋</span><span><b>${casos.length} caso${casos.length > 1 ? "s" : ""} abierto${casos.length > 1 ? "s" : ""}</b><small>Al día. Tocá para verlos o cerrarlos</small></span></button>` : "");
  const sol = document.getElementById("goSolicitudes");
  if (sol) sol.querySelector(".mc-sub").textContent = resp ? "Belén respondió " + resp + " · tocá para ver" : "Biocidas, EPP, avisos en CAPS, novedades";
  box.querySelectorAll("[data-av=casos]").forEach((b) => (b.onclick = () => avCasosLista()));
}

// ---------- Ventana propia (encima de la app) ----------
function avVentana(titulo, html, color) {
  let ov = document.getElementById("avOv");
  if (!ov) { ov = document.createElement("div"); ov.id = "avOv"; document.getElementById("app").appendChild(ov); }
  ov.style.setProperty("--av-c", color || "#0D313F");
  ov.innerHTML = `<div class="av-top"><b>${avEsc(titulo)}</b><button type="button" id="avCerrar" aria-label="Cerrar">✕</button></div><div class="av-cuerpo">${html}</div>`;
  ov.hidden = false; ov.querySelector(".av-cuerpo").scrollTop = 0;
  document.getElementById("avCerrar").onclick = avCerrarVentana;
  return ov;
}
function avCerrarVentana() { const ov = document.getElementById("avOv"); if (ov) { ov.hidden = true; ov.innerHTML = ""; } avisosPintar(); }
const avQuien = () => { const yo = avLeer(AVISOS_YO_KEY, null); return (typeof OPERARIOS !== "undefined" ? OPERARIOS : []).find((o) => yo && o.nombre === yo.nombre) || null; };
function avElegirQuien(sigue) {
  const ops = typeof OPERARIOS !== "undefined" ? OPERARIOS : [];
  const html = `<div class="av-pregunta">¿Quién sos?</div><div class="av-grid">` + ops.map((o, i) => `<button type="button" class="av-tile" data-i="${i}"><span class="av-avatar">${avEsc(o.inicial || o.nombre[0])}</span><span>${avEsc(o.nombre)}</span></button>`).join("") + `</div>`;
  const ov = avVentana("¿Quién sos?", html);
  ov.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { const o = ops[Number(b.dataset.i)]; avGuardar(AVISOS_YO_KEY, { nombre: o.nombre }); sigue(o); }));
}
// fotos: hasta 5 (mismo selector que el resto de la app: cámara o galería)
const avCam = document.createElement("input"); avCam.type = "file"; avCam.accept = "image/*"; avCam.capture = "environment"; avCam.style.display = "none"; document.body.appendChild(avCam);
let avFotosLista = null, avFotosRender = null;
avCam.addEventListener("change", (e) => { const fs = Array.from(e.target.files || []); avCam.value = ""; if (fs.length && avFotosLista) agregarFotos(avFotosLista, fs, avFotosRender); });
function avFotos(cont, lista) {
  avFotosLista = lista;
  avFotosRender = () => {
    cont.innerHTML = lista.map((u, i) => `<div class="foto-slot filled"><img src="${u}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button></div>`).join("") +
      (lista.length < 5 ? `<button type="button" class="foto-slot add"><span>+</span><small>${lista.length}/5</small></button>` : "");
    cont.querySelectorAll(".foto-remove").forEach((b) => (b.onclick = () => { lista.splice(Number(b.dataset.i), 1); avFotosRender(); }));
    const add = cont.querySelector(".add"); if (add) add.onclick = () => elegirOrigenFoto(avCam, true, (fs) => agregarFotos(lista, fs, avFotosRender));
  };
  avFotosRender();
}
async function avEnviar(item, okTxt) {
  const ok = await guardarEnCola([item]);
  if (ok === false) return false;   // guardarEnCola ya avisó
  await updateQueueBadge(); trySync();
  avVentana("Listo", `<div class="av-listo"><div class="av-emo-g">✅</div><p>${avEsc(okTxt)}</p><p class="av-gris">${navigator.onLine ? "Se está enviando." : "Sin señal: queda guardado y se envía solo cuando haya señal."}</p><button type="button" class="av-btn" id="avFin">Volver al inicio</button></div>`);
  document.getElementById("avFin").onclick = avCerrarVentana;
  return true;
}

// ---------- CASOS ----------
function avCasoTxt(c) {
  return c.dias < 0 ? `<span class="av-chip rojo">Venció hace ${-c.dias} día${c.dias === -1 ? "" : "s"}</span>` : c.dias === 0 ? `<span class="av-chip rojo">Vence hoy</span>`
    : c.urgente ? `<span class="av-chip amarillo">Vence en ${c.dias} día${c.dias === 1 ? "" : "s"}</span>` : `<span class="av-chip verde">Vence el ${avFecha(c.vence)}</span>`;
}
function avCasosLista() {
  const casos = avisosCasos();
  const html = casos.length ? `<p class="av-gris">Los casos que pidieron otra visita. Si ya no hace falta volver, indicá cómo quedó.</p>` + casos.map((c, i) =>
    `<button type="button" class="av-caso${c.urgente ? " urg" : ""}" data-i="${i}"><b>${avEsc(c.establecimiento)} · ${avEsc(c.tipo_plaga || "")}</b>${avCasoTxt(c)}<small>Última visita ${avFecha(c.fecha_ultima)} · ${avEsc(c.operario || "")}${/^PENDIENTE/.test(c.protocolo) ? "" : " · Protocolo " + avEsc(c.protocolo)}</small></button>`).join("")
    : `<div class="av-listo"><div class="av-emo-g">👍</div><p>No hay casos abiertos.</p></div>`;
  const ov = avVentana("Casos para revisar", html, "#B4361F");
  ov.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => avCaso(casos[Number(b.dataset.i)])));
}
function avCaso(c) {
  const cierre = { resultado_cierre: null, motivo: null, detalle: "", fotos: [] };
  const paso1 = () => {
    const ov = avVentana("Cerrar el caso", `<div class="av-ficha"><b>${avEsc(c.establecimiento)} · ${avEsc(c.tipo_plaga || "")}</b>${avCasoTxt(c)}<small>Desde ${avFecha(c.fecha_primera)} · última visita ${avFecha(c.fecha_ultima)}</small>${c.resumen ? `<p>${avEsc(c.resumen)}</p>` : ""}</div>
      <div class="av-pregunta">¿Cómo quedó?</div>
      <button type="button" class="av-grande verde" data-r="Resuelto"><span class="av-emo">✅</span><span><b>Resuelto</b><small>Ya no hace falta volver</small></span></button>
      <button type="button" class="av-grande rojo" data-r="No resuelto"><span class="av-emo">❌</span><span><b>No resuelto</b><small>Contá por qué</small></span></button>
      <p class="av-gris">Si todavía vas a volver, no lo cierres: cargá la próxima visita como siempre (MIPyV › Continuar).</p>`, "#B4361F");
    ov.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => { cierre.resultado_cierre = b.dataset.r; cierre.motivo = null; b.dataset.r === "Resuelto" ? paso3() : paso2(); }));
  };
  const paso2 = () => {
    const ov = avVentana("¿Por qué no se resolvió?", `<div class="av-pregunta">¿Por qué no se resolvió?</div>` + MOTIVOS_NR.map((m, i) => `<button type="button" class="av-grande" data-m="${i}"><span class="av-emo">${m.emoji}</span><span><b>${avEsc(m.t)}</b></span></button>`).join("") +
      `<button type="button" class="av-link" id="avAtras">← Volver</button>`, "#B4361F");
    ov.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { cierre.motivo = MOTIVOS_NR[Number(b.dataset.m)].id; paso3(); }));
    document.getElementById("avAtras").onclick = paso1;
  };
  const paso3 = () => {
    const obligatorio = cierre.motivo === "Otro";
    const ov = avVentana(cierre.resultado_cierre, `<div class="av-pregunta">${obligatorio ? "Explicá el motivo" : cierre.resultado_cierre === "Resuelto" ? "¿Algo para agregar? (opcional)" : "Contá qué falta o qué pasó (opcional)"}</div>
      <textarea id="avDet" rows="4" placeholder="${obligatorio ? "Escribí o dictá con el micrófono del teclado" : "Por ejemplo: qué producto o herramienta falta"}">${avEsc(cierre.detalle)}</textarea>
      <div class="av-pregunta" style="margin-top:14px">Fotos (opcional, hasta 5)</div><div class="foto-grid" id="avFot"></div>
      <button type="button" class="av-btn" id="avSig">Seguir</button><button type="button" class="av-link" id="avAtras">← Volver</button>`, "#B4361F");
    avFotos(document.getElementById("avFot"), cierre.fotos);
    document.getElementById("avAtras").onclick = () => (cierre.resultado_cierre === "Resuelto" ? paso1() : paso2());
    document.getElementById("avSig").onclick = () => {
      cierre.detalle = document.getElementById("avDet").value.trim();
      if (obligatorio && cierre.detalle.length < 4) { alert("Explicá el motivo, aunque sea corto."); return; }
      const yo = avQuien(); yo ? paso4(yo) : avElegirQuien(paso4);
    };
  };
  const paso4 = (yo) => {
    const ov = avVentana("Confirmar", `<div class="av-ficha"><b>${avEsc(c.establecimiento)} · ${avEsc(c.tipo_plaga || "")}</b><p><b>${cierre.resultado_cierre === "Resuelto" ? "✅ Resuelto" : "❌ No resuelto"}</b>${cierre.motivo ? " · " + avEsc(cierre.motivo) : ""}</p>${cierre.detalle ? `<p>${avEsc(cierre.detalle)}</p>` : ""}<small>${cierre.fotos.length} foto(s) · lo cierra ${avEsc(yo.nombre)}</small></div>
      <button type="button" class="av-btn" id="avOk">Cerrar el caso</button><button type="button" class="av-link" id="avOtro">No soy ${avEsc(yo.nombre)}</button><button type="button" class="av-link" id="avAtras">← Volver</button>`, "#B4361F");
    document.getElementById("avAtras").onclick = paso3;
    document.getElementById("avOtro").onclick = () => avElegirQuien(paso4);
    document.getElementById("avOk").onclick = async (e) => {
      e.target.disabled = true;
      const data = { id_cierre: "C-" + Date.now(), fecha: new Date().toISOString(), operario: yo.nombre, protocolo: c.protocolo, alias: c.alias || [c.protocolo], id_ultima_visita: c.id_ultima_visita,
        establecimiento: c.establecimiento, tipo_plaga: c.tipo_plaga, resultado_cierre: cierre.resultado_cierre, motivo: cierre.motivo || "", detalle: cierre.detalle, fotos_base64: cierre.fotos.slice(0, 5) };
      const cer = avLeer(AVISOS_CERRADOS_KEY, {}); cer[c.protocolo] = Date.now(); avGuardar(AVISOS_CERRADOS_KEY, cer);
      await avEnviar({ tipo: "cierre_caso", data: data }, "Caso cerrado: " + c.establecimiento + " · " + (c.tipo_plaga || "") + ".");
    };
  };
  paso1();
}

// ---------- SOLICITUDES A BELÉN ----------
function avSolicitudes() {
  const mias = avisosSolicitudes();
  const est = (s) => s.estado === "Pendiente" ? `<span class="av-chip amarillo">Pendiente</span>` : s.estado === "Atendida" ? `<span class="av-chip verde">Atendida</span>` : `<span class="av-chip gris">${avEsc(s.estado)}</span>`;
  const html = `<button type="button" class="av-grande" id="avNueva"><span class="av-emo">✉️</span><span><b>Nueva solicitud a Belén</b><small>Biocidas, EPP, aviso en un CAPS o novedad importante</small></span></button>` +
    (mias.length ? `<div class="av-pregunta" style="margin-top:18px">Las últimas solicitudes</div>` + mias.slice(0, 25).map((s) => `<div class="av-caso"><b>${avEsc(TIPOS_SOL.find((t) => t.id === s.tipo)?.emoji || "✉️")} ${avEsc(s.tipo)}${s.que ? " · " + avEsc(s.que) : ""}${s.cantidad ? " · " + avEsc(s.cantidad) : ""}</b>${est(s)}<small>${avFecha(s.fecha)} · ${avEsc(s.operario || "")}${s.establecimiento ? " · " + avEsc(s.establecimiento) : ""}</small>${s.respuesta ? `<p class="av-resp">💬 Belén: ${avEsc(s.respuesta)}</p>` : ""}</div>`).join("") : "");
  const ov = avVentana("Solicitudes a Belén", html, "#5B4A8A");
  document.getElementById("avNueva").onclick = () => { const yo = avQuien(); yo ? avSolTipo(yo) : avElegirQuien(avSolTipo); };
}
function avSolTipo(yo) {
  const ov = avVentana("¿Qué necesitás?", `<div class="av-pregunta">¿Qué necesitás?</div>` + TIPOS_SOL.map((t, i) => `<button type="button" class="av-grande" data-t="${i}"><span class="av-emo">${t.emoji}</span><span><b>${avEsc(t.t)}</b><small>${avEsc(t.sub)}</small></span></button>`).join("") +
    `<button type="button" class="av-link" id="avOtro">No soy ${avEsc(yo.nombre)}</button>`, "#5B4A8A");
  ov.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => avSolForm(yo, TIPOS_SOL[Number(b.dataset.t)])));
  document.getElementById("avOtro").onclick = () => avElegirQuien(avSolTipo);
}
function avSolForm(yo, tipo) {
  const s = { que: "", cantidad: "", lugar: "", detalle: "", fotos: [] };
  const prods = (typeof PRODUCTOS !== "undefined" ? PRODUCTOS : []).filter((p) => !/^(PRD-1[345])$/.test(p.id)).map((p) => p.nombre);
  const epps = (typeof EPP !== "undefined" ? EPP : []).map((e) => e.nombre).concat(["Ropa de trabajo", "Otro"]);
  const lugares = (typeof ESTABLECIMIENTOS !== "undefined" ? ESTABLECIMIENTOS : []).filter((e) => tipo.id === "Aviso en un CAPS" ? e.tipo === "CAP" : true);
  const chips = (lista) => `<div class="chip-row">` + lista.map((x) => `<button type="button" class="chip" data-q="${avEsc(x)}">${avEsc(x)}</button>`).join("") + `</div>`;
  const campos = tipo.id === "Biocidas" ? `<div class="av-pregunta">¿Qué producto?</div>${chips(prods.concat(["Otro"]))}<input id="avQue" placeholder="Producto (si no está en la lista)"><div class="av-pregunta">¿Cuánto?</div><input id="avCant" placeholder="Ej.: 2 litros, 3 jeringas, 1 caja">`
    : tipo.id === "EPP" ? `<div class="av-pregunta">¿Qué necesitás?</div>${chips(epps)}<input id="avQue" placeholder="Qué (si no está en la lista)"><div class="av-pregunta">¿Cuánto? (cantidad y talle si corresponde)</div><input id="avCant" placeholder="Ej.: 2 pares de guantes, talle L">`
    : tipo.id === "Aviso en un CAPS" ? `<div class="av-pregunta">¿En qué CAPS?</div><select id="avLugar"><option value="">Elegí el CAPS</option>${lugares.map((e) => `<option value="${avEsc(e.id)}">${avEsc(e.nombre)}</option>`).join("")}</select><div class="av-pregunta">¿Qué hay que avisar?</div>`
    : `<div class="av-pregunta">¿Dónde? (opcional)</div><select id="avLugar"><option value="">—</option>${lugares.map((e) => `<option value="${avEsc(e.id)}">${avEsc(e.nombre)}</option>`).join("")}</select><div class="av-pregunta">¿Qué pasó?</div>`;
  const ov = avVentana(tipo.t, `${campos}<textarea id="avDet" rows="4" placeholder="Escribí o dictá con el micrófono del teclado"></textarea>
    <div class="av-pregunta" style="margin-top:14px">Fotos (opcional, hasta 5)</div><div class="foto-grid" id="avFot"></div>
    <button type="button" class="av-btn" id="avOk">Enviar a Belén</button><button type="button" class="av-link" id="avAtras">← Volver</button>`, "#5B4A8A");
  avFotos(document.getElementById("avFot"), s.fotos);
  ov.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { ov.querySelectorAll("[data-q]").forEach((x) => x.classList.toggle("active", x === b)); const q = document.getElementById("avQue"); if (q) q.value = b.dataset.q === "Otro" ? "" : b.dataset.q; if (q && b.dataset.q === "Otro") q.focus(); }));
  document.getElementById("avAtras").onclick = () => avSolTipo(yo);
  document.getElementById("avOk").onclick = async (e) => {
    const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    s.que = v("avQue"); s.cantidad = v("avCant"); s.detalle = v("avDet"); const idL = v("avLugar");
    const lug = lugares.find((x) => x.id === idL);
    if ((tipo.id === "Biocidas" || tipo.id === "EPP") && !s.que) { alert("Indicá qué necesitás."); return; }
    if ((tipo.id === "Biocidas" || tipo.id === "EPP") && !s.cantidad) { alert("Indicá cuánto necesitás."); return; }
    if (tipo.id === "Aviso en un CAPS" && !lug) { alert("Elegí el CAPS."); return; }
    if ((tipo.id === "Aviso en un CAPS" || tipo.id === "Novedad importante") && s.detalle.length < 4) { alert("Contá qué pasó o qué hay que avisar."); return; }
    e.target.disabled = true;
    await avEnviar({ tipo: "solicitud", data: { id_solicitud: "S-" + Date.now(), fecha: new Date().toISOString(), operario: yo.nombre, tipo: tipo.id, id_establecimiento: lug ? lug.id : "", establecimiento: lug ? lug.nombre : "",
      que: s.que, cantidad: s.cantidad, detalle: s.detalle, fotos_base64: s.fotos.slice(0, 5) } }, "Solicitud enviada a Belén: " + tipo.t + (s.que ? " · " + s.que : "") + ".");
  };
}

// ---------- Inicio ----------
(function avisosIniciar() {
  const st = document.createElement("style");
  st.textContent = `
#avisosHome:empty{display:none}#avisosHome{margin:0 0 14px}
.av-urgente,.av-suave,.av-grande,.av-caso,.av-tile{width:100%;border:none;font-family:inherit;text-align:left;display:flex;gap:14px;align-items:center;border-radius:18px;padding:16px;margin:0 0 12px;cursor:pointer}
.av-urgente{background:#B4361F;color:#fff;animation:avLatido 1.6s ease-in-out infinite}.av-suave{background:#EAF1F2;color:#0D313F}
@keyframes avLatido{0%,100%{box-shadow:0 0 0 0 rgba(180,54,31,.5)}50%{box-shadow:0 0 0 8px rgba(180,54,31,0)}}
.av-urgente b,.av-suave b,.av-grande b{display:block;font-size:1.08rem}.av-urgente small,.av-suave small,.av-grande small{display:block;font-size:.85rem;opacity:.9;font-weight:600}
.av-emo{font-size:2.1rem;line-height:1;flex:0 0 auto}.av-emo-g{font-size:3.4rem;text-align:center}
#avOv{position:absolute;inset:0;background:#fff;z-index:50;display:flex;flex-direction:column}#avOv[hidden]{display:none}
.av-top{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:var(--av-c);color:#fff;font-size:1.05rem}
.av-top button{background:rgba(255,255,255,.18);border:0;color:#fff;font-size:1.2rem;width:40px;height:40px;border-radius:50%}
.av-cuerpo{flex:1;overflow-y:auto;padding:18px;-webkit-overflow-scrolling:touch}
.av-pregunta{font-size:1.15rem;font-weight:800;color:var(--av-c);margin:4px 0 10px}
.av-grande{background:#F4F7F8;border:2px solid #D8E1E3;color:#1A1A1A}.av-grande.verde{background:#E8F5EC;border-color:#2E9E5B}.av-grande.rojo{background:#FBEAE7;border-color:#C0453A}
.av-caso{flex-direction:column;align-items:flex-start;gap:4px;background:#F4F7F8;border:2px solid #D8E1E3}.av-caso.urg{border-color:#C0453A;background:#FBEAE7}.av-caso small{color:#4F616B}
.av-chip{display:inline-block;align-self:flex-start;border-radius:999px;padding:3px 10px;font-size:.8rem;font-weight:800}.av-chip.rojo{background:#C0453A;color:#fff}.av-chip.amarillo{background:#E3A426;color:#1A1A1A}.av-chip.verde{background:#2E9E5B;color:#fff}.av-chip.gris{background:#D8E1E3}
.av-ficha{background:#F4F7F8;border-radius:16px;padding:14px;margin:0 0 16px;display:flex;flex-direction:column;gap:6px}.av-ficha p{margin:4px 0 0}.av-ficha small{color:#4F616B}
.av-btn{width:100%;border:0;border-radius:16px;padding:16px;font-family:inherit;font-weight:800;font-size:1.05rem;background:var(--av-c);color:#fff;margin-top:16px}.av-btn:disabled{opacity:.5}
.av-link{display:block;width:100%;background:none;border:0;color:#4F616B;font-family:inherit;font-weight:700;font-size:.95rem;padding:12px;margin-top:4px}
.av-gris{color:#4F616B;font-size:.9rem}.av-listo{text-align:center;padding-top:20px}.av-resp{margin:6px 0 0;background:#fff;border-radius:10px;padding:8px}
.av-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.av-tile{flex-direction:column;justify-content:center;background:#F4F7F8;border:2px solid #D8E1E3;min-height:130px;font-weight:800}
.av-avatar{width:60px;height:60px;border-radius:50%;background:#5894A7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800}
#avOv textarea,#avOv input,#avOv select{width:100%;font-family:inherit;font-size:1rem;padding:12px;border:2px solid #D8E1E3;border-radius:12px;margin:0 0 10px}
.module-card.solicitudes{background:linear-gradient(135deg,#5B4A8A,#7E6BAE)}`;
  document.head.appendChild(st);
  const home = document.querySelector('.screen[data-step="home"]');
  if (home && !document.getElementById("avisosHome")) {
    const box = document.createElement("div"); box.id = "avisosHome"; home.insertBefore(box, home.querySelector(".module-card"));
    const card = document.createElement("button"); card.type = "button"; card.className = "module-card solicitudes"; card.id = "goSolicitudes";
    card.innerHTML = `<span class="mc-emoji">✉️</span><div><div class="mc-title">Solicitudes a Belén</div><div class="mc-sub">Biocidas, EPP, avisos en CAPS, novedades</div></div>`;
    const ver = document.getElementById("appVersion"); home.insertBefore(card, ver);
    card.onclick = avSolicitudes;
  }
  avisosPintar();
})();
