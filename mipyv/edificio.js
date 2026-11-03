// ============================================================
// RELEVAMIENTO DE EDIFICIOS · agua, desagües, canaletas y techos (03/11/2026, pedido de Belén)
// La Dirección pidió saber cómo está la red Trelew en esos 4 temas. Javier y Paulo relevan cada lugar
// (CAPS y dependencias, sin el HMH ni el edificio central del HZT) con preguntas de Sí / No / No se pudo ver,
// fotos por tema y lo que hace falta. Con eso HyS arma el diagnóstico.
// Es SOLO relevamiento: no se arregla nada en el momento. Por seguridad, a los techos no se sube sin escalera
// segura y sin otra persona: si no se puede, se mira desde abajo y se marca «No se pudo ver».
// Se manda por la misma cola que el resto (se guarda sin señal) al servidor MIP (Edificio_MIPyV.gs),
// hoja «relevamiento_edificio» de la planilla MIP; las fotos van a Drive, en la carpeta de fotos de cada lugar.
// ============================================================
const ED_LOCAL_KEY = "mipyv_edificio_local_v1", ED_BORR_KEY = "mipyv_edificio_borrador_v1", ED_CAT_KEY = "mipyv_edificio_cat_v1";
const ED_FUERA = ["HZT", "AMB", "HMH", "HSST"];   // fuera de este relevamiento
const ED_TEMAS = [
  { id: "agua", emo: "💧", t: "Agua", ayuda: "Canillas, caños e inodoros. Los tanques se cargan aparte, en «Tanques y cisternas».", pregs: [
    ["a1", "¿Sale agua en todas las canillas?", "Sí"],
    ["a2", "¿Hay pérdidas de agua (canillas, caños, inodoros, depósitos)?", "No"],
    ["a3", "¿Hay manchas de humedad en paredes por caños que pierden?", "No"],
    ["a4", "¿Los tanques tienen tapa y se puede llegar a ellos sin riesgo?", "Sí"]] },
  { id: "desagues", emo: "🚽", t: "Desagües", ayuda: "Piletas, inodoros, rejillas, cámaras y patio.", pregs: [
    ["d1", "¿Las piletas, inodoros y rejillas desagotan bien?", "Sí"],
    ["d2", "¿Hay olor a cloaca adentro o afuera?", "No"],
    ["d3", "¿Las cámaras de inspección tienen tapa y se pueden abrir?", "Sí"],
    ["d4", "¿Hay raíces, caños rotos o cámaras tapadas?", "No"],
    ["d5", "Cuando llueve, ¿se junta agua en el patio, la entrada o la vereda?", "No"]] },
  { id: "canaletas", emo: "🌧️", t: "Canaletas", ayuda: "Canaletas y bajadas del agua de lluvia.", tiene: "¿El edificio tiene canaletas?", pregs: [
    ["c1", "¿Las canaletas están limpias (sin hojas, barro ni nidos)?", "Sí"],
    ["c2", "¿Las bajadas están enteras y bien sujetas?", "Sí"],
    ["c3", "¿El agua de las bajadas va a un desagüe (y no contra la pared o la vereda)?", "Sí"]] },
  { id: "techos", emo: "🏠", t: "Techos", ayuda: "⚠️ No subir al techo sin escalera segura y sin otra persona. Si no se puede, mirar desde abajo y desde adentro, y marcar «No se pudo ver».", tipo: true, pregs: [
    ["t1", "Adentro: ¿hay goteras o manchas de humedad en techos o cielorrasos?", "No"],
    ["t2", "¿Hay chapas, tejas o membrana sueltas, rotas u oxidadas?", "No"],
    ["t3", "¿Hay ramas o árboles apoyados sobre el techo?", "No"],
    ["t4", "¿Se pudo ver el techo de cerca, sin riesgo?", "Sí"]] }];
const ED_TIPOS_TECHO = ["Chapa", "Losa", "Tejas", "Mixto", "No sé"];
const ED_RESP = ["Sí", "No", "No se pudo ver"];
let ED_CAT = { lugares: {} };   // lo que mandó la planilla: último relevamiento de cada lugar
let ed = { vista: "lugares", lugar: null, form: null, tema: 0, aviso: "" };

const edLeer = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const edGuardarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const edHoy = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const edF = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || "") ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
try { ED_CAT = edLeer(ED_CAT_KEY, ED_CAT); } catch (e) { }

// ---------- lugares: un lugar por edificio (la Sede ex ADOS es uno solo, como en la carga de extintores)
function edLugares() {
  const L = typeof EXTINTORES_LUG !== "undefined" ? EXTINTORES_LUG : {}, grupos = {}, est = typeof ESTABLECIMIENTOS !== "undefined" ? ESTABLECIMIENTOS : [];
  Object.keys(L).filter(id => ED_FUERA.indexOf(id) < 0).forEach(id => { const s = L[id].sitio || id; (grupos[s] = grupos[s] || []).push(id); });
  let out = Object.keys(grupos).map(s => ({ id: grupos[s].slice().sort()[0], ids: grupos[s], nombre: grupos[s].length > 1 ? s : ((est.find(e => e.id === grupos[s][0]) || {}).nombre || s) }));
  if (!out.length) out = est.filter(e => ED_FUERA.indexOf(e.id) < 0).map(e => ({ id: e.id, ids: [e.id], nombre: e.nombre }));   // sin catálogo de incendio: la lista fija
  return out.sort((a, b) => (/^CAPS/.test(a.nombre) ? 1 : 0) - (/^CAPS/.test(b.nombre) ? 1 : 0) || a.nombre.localeCompare(b.nombre, "es"));
}
function edUltimo(l) {   // último relevamiento de ese lugar: lo del celular o lo de la planilla
  const loc = edLeer(ED_LOCAL_KEY, {}), c = ED_CAT.lugares || {};
  const cands = l.ids.map(id => c[id]).concat(l.ids.map(id => loc[id])).filter(Boolean);
  return cands.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0] || null;
}
function edPendientes() { return edLugares().filter(l => !edUltimo(l)); }
// lo llama app.js con lo que devolvió la planilla
function edDatos(datos) { if (datos && datos.edificio && datos.edificio.lugares) { ED_CAT = datos.edificio; edGuardarLS(ED_CAT_KEY, ED_CAT); edPintarHome(); } }

// ---------- estado de cada tema
function edEstadoTema(tm, r) {
  if (tm.tiene && r[tm.id + "_tiene"] === "No") return { nivel: "ok", txt: "No tiene" };
  const mal = tm.pregs.filter(([k, , bien]) => r[k] && r[k] !== bien && r[k] !== "No se pudo ver").length;
  const nsv = tm.pregs.filter(([k]) => r[k] === "No se pudo ver").length;
  if (mal) return { nivel: r[tm.id + "_urgente"] === "Sí" ? "er" : "wa", txt: r[tm.id + "_urgente"] === "Sí" ? "Arreglo urgente" : "Requiere arreglo" };
  if (nsv) return { nivel: "nd", txt: "No se pudo ver todo" };
  return { nivel: "ok", txt: "Bien" };
}
function edFaltan(f) {
  const r = f.resp, x = [];
  ED_TEMAS.forEach(tm => {
    if (tm.tiene && !r[tm.id + "_tiene"]) { x.push(tm.t.toLowerCase()); return; }
    if (tm.tiene && r[tm.id + "_tiene"] === "No") return;
    const sin = tm.pregs.filter(([k]) => !r[k]).length + (tm.tipo && !r.techo_tipo ? 1 : 0);
    const e = edEstadoTema(tm, r), urg = (e.nivel === "wa" || e.nivel === "er") && !r[tm.id + "_urgente"];
    if (sin || urg) x.push(tm.t.toLowerCase());
  });
  return x;
}

// ---------- inicio (tarjeta y «Para hacer ahora»)
function edPintarHome() {
  const s = document.querySelector("#goEdificio .mc-sub"); if (!s) return;
  const L = edLugares(), hechos = L.filter(edUltimo).length;
  s.textContent = !L.length ? "Agua, desagües, canaletas y techos" : hechos === L.length ? "✅ Los " + L.length + " lugares relevados" : "❗ Faltan " + (L.length - hechos) + " de " + L.length + " lugares · agua, desagües, canaletas y techos";
}

// ---------- pantalla del módulo (data-step="e-main")
const edBox = () => document.getElementById("edificioBox");
function edEntrar() { ed = { vista: "lugares", lugar: null, form: null, tema: 0, aviso: "" }; const b = edLeer(ED_BORR_KEY, null); if (b && b.form && Date.now() - b.guardado < 3 * 864e5) { ed.form = b.form; ed.lugar = b.form.lugar; ed.vista = "form"; ed.aviso = "Seguís con el relevamiento que habías empezado."; } }
function edRender() {
  const box = edBox(); if (!box) return;
  if (ed.vista === "form" && ed.form) return edRenderForm();
  const L = edLugares(), loc = edLeer(ED_LOCAL_KEY, {});
  const chip = (e) => `<span class="ed-chip ${e.nivel}">${escX(e.txt)}</span>`;
  box.innerHTML = (ed.aviso ? `<div class="tq-info">${escX(ed.aviso)}</div>` : "") +
    `<div class="tq-info">Es <b>solo un relevamiento</b>: mirar y contar cómo está cada lugar. Un lugar por vez, con fotos de lo que esté mal. Con esto Belén arma el informe para la Dirección.</div>` +
    L.map(l => { const u = edUltimo(l);
      return `<button type="button" class="ed-lugar" data-l="${escX(l.id)}"><b>${escX(l.nombre)}</b>` +
        (u ? `<small>✅ Relevado el ${escX(edF(u.fecha))}${loc[l.id] && !((ED_CAT.lugares || {})[l.id]) ? " · se envía cuando haya señal" : ""}</small><span class="ed-chips">${ED_TEMAS.map(tm => chip({ nivel: (u.estados || {})[tm.id + "_nivel"] || "nd", txt: tm.emo + " " + ((u.estados || {})[tm.id] || "s/d") })).join("")}</span>`
          : `<small class="er">❗ Falta relevar</small>`) + `</button>`; }).join("");
  box.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { const l = L.find(x => x.id === b.dataset.l); edAbrir(l); });
}
function edAbrir(l) {
  ed.lugar = l; ed.vista = "form"; ed.aviso = "";
  ed.form = { uid: "ED" + Date.now() + Math.floor(Math.random() * 1000), lugar: l, FECHA: edHoy(), resp: {}, falta: {}, fotos: { agua: [], desagues: [], canaletas: [], techos: [] }, obs: "" };
  edRender(); screensEl.scrollTop = 0;
}
function edBorrador() { if (!ed.form) return; if (!edGuardarLS(ED_BORR_KEY, { form: ed.form, guardado: Date.now() })) { const f = Object.assign({}, ed.form, { fotos: { agua: [], desagues: [], canaletas: [], techos: [] } }); edGuardarLS(ED_BORR_KEY, { form: f, guardado: Date.now() }); } }
function edBorrarBorrador() { try { localStorage.removeItem(ED_BORR_KEY); } catch (e) { } }

function edRenderForm() {
  const f = ed.form, r = f.resp, box = edBox();
  const opc = (campo, vals, act) => `<div class="ext-opc" data-campo="${campo}">${vals.map(v => `<button type="button" class="${act === v ? "on" : ""}" data-valor="${escX(v)}">${escX(v)}</button>`).join("")}</div>`;
  let h = `<button type="button" class="ext-quitar tq-volver" data-f="cancelar">← Volver a los lugares</button>
    <div class="step-title" style="font-size:1.25rem">${escX(f.lugar.nombre)}</div>
    <div class="ext-preg">Fecha del relevamiento</div><input class="ext-inp" type="date" data-dato="FECHA" value="${escX(f.FECHA)}" max="${edHoy()}">`;
  ED_TEMAS.forEach(tm => {
    const e = edEstadoTema(tm, r), sinTener = tm.tiene && r[tm.id + "_tiene"] === "No", malo = e.nivel === "wa" || e.nivel === "er";
    h += `<div class="ext-card tq"><h4>${tm.emo} ${tm.t}</h4><div class="step-sub">${escX(tm.ayuda)}</div>`;
    if (tm.tiene) h += `<div class="ext-preg">${tm.tiene}</div>` + opc(tm.id + "_tiene", ["Sí", "No"], r[tm.id + "_tiene"]);
    if (!tm.tiene || r[tm.id + "_tiene"] === "Sí") {
      if (tm.tipo) h += `<div class="ext-preg">¿De qué es el techo?</div>` + opc("techo_tipo", ED_TIPOS_TECHO, r.techo_tipo);
      tm.pregs.forEach(([k, p, bien]) => {
        const mal = r[k] && r[k] !== bien && r[k] !== "No se pudo ver";
        h += `<div class="ext-preg">${escX(p)}</div>` + opc(k, ED_RESP, r[k]) + (mal ? `<small class="ext-vto wa">⚠️ Sacale una foto y contá abajo qué hace falta</small>` : "");
      });
      if (malo || r[tm.id + "_urgente"]) h += `<div class="ext-preg">¿Es urgente? (riesgo de inundación, de que se caiga algo o de quedarse sin agua)</div>` + opc(tm.id + "_urgente", ["Sí", "No"], r[tm.id + "_urgente"]);
      h += `<div class="ext-preg">¿Qué hace falta? ${malo ? "" : "(opcional)"}</div><textarea class="ext-com" rows="2" data-falta="${tm.id}" placeholder="Ej.: cambiar 2 metros de caño, limpiar la canaleta del frente…">${escX(f.falta[tm.id] || "")}</textarea>
        <div class="ext-preg">Fotos de ${tm.t.toLowerCase()} · hasta 5${malo ? " (sacale foto a lo que está mal)" : " (opcional)"}</div><div class="foto-grid" data-fotos="${tm.id}"></div>`;
    }
    h += (sinTener ? "" : `<div style="margin-top:8px"><span class="ed-chip ${e.nivel}">${tm.emo} ${escX(e.txt)}</span></div>`) + `</div>`;
  });
  const faltan = edFaltan(f);
  h += `<div class="ext-preg">Observaciones generales (opcional)</div><textarea class="ext-com" rows="3" data-dato="obs" placeholder="Lo que quieras contar del lugar">${escX(f.obs)}</textarea>
    <button type="button" class="ext-listo" data-f="guardar"${faltan.length ? " disabled" : ""}>${faltan.length ? "Falta completar: " + escX(faltan.join(", ")) : "Listo, guardar el relevamiento"}</button>`;
  box.innerHTML = h;
  ED_TEMAS.forEach(tm => edPintarFotos(tm.id));
  box.querySelectorAll("[data-dato]").forEach(i => { i.oninput = () => { if (i.dataset.dato === "FECHA") f.FECHA = i.value; else f.obs = i.value; edBorrador(); }; });
  box.querySelectorAll("[data-falta]").forEach(i => { i.oninput = () => { f.falta[i.dataset.falta] = i.value; edBorrador(); }; });
  box.querySelectorAll(".ext-opc[data-campo] button").forEach(b => b.onclick = () => {
    const k = b.parentElement.dataset.campo; r[k] = b.dataset.valor; edBorrador(); const y = screensEl.scrollTop; edRenderForm(); screensEl.scrollTop = y;
  });
  box.querySelector('[data-f="cancelar"]').onclick = () => { if (Object.keys(r).length && !confirm("¿Salir? Lo cargado queda guardado en el celular para seguir después.")) return; edBorrador(); ed.vista = "lugares"; ed.form = null; edRender(); };
  box.querySelector('[data-f="guardar"]').onclick = edGuardar;
}

// fotos por tema (hasta 5; mismo selector cámara / galería que el resto de la app)
const edFotoInput = document.createElement("input");
edFotoInput.type = "file"; edFotoInput.accept = "image/*"; edFotoInput.setAttribute("capture", "environment"); edFotoInput.style.display = "none";
document.body.appendChild(edFotoInput);
let edFotoTema = null;
edFotoInput.addEventListener("change", (e) => { const fs = Array.from(e.target.files || []); edFotoInput.value = ""; if (fs.length && ed.form && edFotoTema) { const t = edFotoTema; agregarFotos(ed.form.fotos[t], fs, () => { edPintarFotos(t); edBorrador(); }); } });
function edPintarFotos(t) {
  const g = edBox().querySelector(`[data-fotos="${t}"]`); if (!g || !ed.form) return;
  const F = ed.form.fotos[t];
  g.innerHTML = F.map((u, i) => `<div class="foto-slot filled"><img src="${u}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button></div>`).join("") +
    (F.length < 5 ? `<button type="button" class="foto-slot add"><span>+</span><small>${F.length}/5</small></button>` : "");
  g.querySelectorAll(".foto-remove").forEach(b => b.onclick = (e) => { e.stopPropagation(); F.splice(Number(b.dataset.i), 1); edPintarFotos(t); edBorrador(); });
  const add = g.querySelector(".foto-slot.add");
  if (add) add.onclick = () => { edFotoTema = t; edBorrador(); elegirOrigenFoto(edFotoInput, true, fs => agregarFotos(F, fs, () => { edPintarFotos(t); edBorrador(); })); };
}

// ---------- guardar (a la cola: se manda solo con señal)
async function edGuardar() {
  const f = ed.form, r = f.resp; if (edFaltan(f).length) return;
  const estados = {}, textos = [];
  ED_TEMAS.forEach(tm => {
    const e = edEstadoTema(tm, r); estados[tm.id] = e.txt; estados[tm.id + "_nivel"] = e.nivel;
    textos.push(tm.t.toUpperCase() + (tm.tiene ? " · tiene: " + r[tm.id + "_tiene"] : "") + (tm.tipo && r.techo_tipo ? " · tipo: " + r.techo_tipo : "") +
      (tm.tiene && r[tm.id + "_tiene"] === "No" ? "" : tm.pregs.map(([k, p]) => "\n  " + p + " → " + r[k]).join("") + (r[tm.id + "_urgente"] ? "\n  ¿Urgente? → " + r[tm.id + "_urgente"] : "")));
  });
  const urg = ED_TEMAS.some(tm => estados[tm.id + "_nivel"] === "er"), arr = ED_TEMAS.some(tm => estados[tm.id + "_nivel"] === "wa");
  const data = { id_relev: f.uid, fecha: new Date().toISOString(), FECHA: f.FECHA, lugar_id: f.lugar.id, lugar: f.lugar.nombre, establecimiento: f.lugar.nombre,
    operario: currentOperario ? currentOperario.nombre : "", operario_acompanante: operarioAcompanante || "",
    agua: estados.agua, desagues: estados.desagues, canaletas: estados.canaletas, techos: estados.techos, techo_tipo: r.techo_tipo || "",
    prioridad: urg ? "Urgente" : arr ? "Requiere arreglos" : "Sin problemas a la vista", respuestas: textos.join("\n"),
    agua_falta: (f.falta.agua || "").trim(), desagues_falta: (f.falta.desagues || "").trim(), canaletas_falta: (f.falta.canaletas || "").trim(), techos_falta: (f.falta.techos || "").trim(),
    observaciones: f.obs.trim(), fotos_agua: f.fotos.agua.slice(), fotos_desagues: f.fotos.desagues.slice(), fotos_canaletas: f.fotos.canaletas.slice(), fotos_techos: f.fotos.techos.slice() };
  const btn = edBox().querySelector('[data-f="guardar"]'); if (btn) btn.disabled = true;
  if (!(await guardarEnCola([{ tipo: "relev_edificio", data: data }]))) { if (btn) btn.disabled = false; return; }
  const loc = edLeer(ED_LOCAL_KEY, {}); loc[f.lugar.id] = { fecha: f.FECHA, estados: estados }; edGuardarLS(ED_LOCAL_KEY, loc);
  edBorrarBorrador();
  ed.aviso = "Relevamiento de " + f.lugar.nombre + " guardado" + (navigator.onLine ? " · se está enviando." : " · se envía solo cuando haya señal.");
  ed.form = null; ed.vista = "lugares"; edRender(); screensEl.scrollTop = 0; edPintarHome();
if (typeof avisosPintar === "function") avisosPintar();   // «Para hacer ahora» ya con los lugares que faltan relevar
  try { await updateQueueBadge(); } catch (e) { } trySync();
}

// estilos propios
const edCss = document.createElement("style");
edCss.textContent = `
.module-card.edificio{background:linear-gradient(135deg,#5B4636,#8A6A4F);}
body.mode-edificio{--mod-primary:#5B4636;--mod-accent:#8A6A4F;--mod-claro:#F4EEE8;}
.ed-lugar{display:block;width:100%;text-align:left;background:#fff;border:2px solid var(--gris-borde);border-radius:14px;padding:12px 14px;margin:0 0 10px;font-family:inherit;font-size:1rem;color:var(--texto)}
.ed-lugar small{display:block;margin-top:2px;font-weight:600}
.ed-lugar small.er{color:var(--rojo-no)}
.ed-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ed-chip{display:inline-block;border-radius:999px;padding:3px 9px;font-size:.8rem;font-weight:700;background:#EEF2F4;color:#0D313F}
.ed-chip.ok{background:#E3F4E8;color:#1E6B3A}.ed-chip.wa{background:#FFF4D6;color:#8A5A00}.ed-chip.er{background:#FBE4E1;color:#7A231B}.ed-chip.nd{background:#EEF2F4;color:#55626A}
`;
document.head.appendChild(edCss);
document.getElementById("goEdificio") && document.getElementById("goEdificio").addEventListener("click", () => enterModule("edificio"));
edPintarHome();
if (typeof avisosPintar === "function") avisosPintar();   // «Para hacer ahora» ya con los lugares que faltan relevar
