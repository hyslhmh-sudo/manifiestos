// ============================================================
// RELEVAMIENTO DE EDIFICIOS · agua, desagües, canaletas y techos (03/11/2026, pedido de Belén)
// La Dirección pidió saber cómo está la red Trelew en esos 4 temas. Javier y Paulo relevan cada lugar
// (CAPS, dependencias y el edificio central del HZT; sin el HMH) con preguntas de Sí / No / No se pudo ver,
// fotos por tema y lo que hace falta. Con eso HyS arma el diagnóstico.
// Es SOLO relevamiento: no se arregla nada en el momento. Por seguridad, a los techos no se sube sin escalera
// segura y sin otra persona: si no se puede, se mira desde abajo y se marca «No se pudo ver».
// Se manda por la misma cola que el resto (se guarda sin señal) al servidor MIP (Edificio_MIPyV.gs),
// hoja «relevamiento_edificio» de la planilla MIP; las fotos van a Drive, en la carpeta de fotos de cada lugar.
// ============================================================
const ED_LOCAL_KEY = "mipyv_edificio_local_v1", ED_BORR_KEY = "mipyv_edificio_borrador_v1", ED_CAT_KEY = "mipyv_edificio_cat_v1";
const ED_FUERA = ["AMB", "HMH", "HSST"];   // fuera de este relevamiento (03/11/2026: el HZT central SÍ entra, pedido de Belén)
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
// 06/11/2026 (pedido de Belén): que no haga falta pedir aclaraciones. Cada respuesta que muestra un problema pide DÓNDE y QUÉ se ve;
// cada «No se pudo ver» pide QUÉ no se pudo ver y POR QUÉ; cada «urgente», por qué y dónde. Textos vagos («s/n», «no», «-») no se aceptan.
// Y una sección fija de OTROS RIESGOS (gas, electricidad, algo que se puede caer, otro), obligatoria, que marca el lugar como urgente.
const ED_NSV_MOT = ["No hay escalera segura", "Estaba cerrado / sin llave", "Está tapado (cielorraso, mueble, tierra)", "Riesgo para subir o entrar", "Otro motivo"];
const ED_RIESGOS = [
  ["g", "¿Hay olor a gas (adentro o afuera)?", "Ej.: sala de la caldera, al lado del calefactor del consultorio 2; olor fuerte al entrar"],
  ["e", "¿Hay cables, enchufes, tableros o instalaciones eléctricas a la vista, rotos o mojados?", "Ej.: patio de atrás, cable subterráneo con la vaina cortada y con agua alrededor"],
  ["c", "¿Hay algo que se pueda caer (cielorraso, revoque, chapa, vidrio, cartel)?", "Ej.: Enfermería, cielorraso de durlock mojado y abombado sobre la camilla"],
  ["o", "¿Hay otro riesgo para las personas (pozo, piso roto, caño o tapa suelta, puerta rota)?", "Ej.: office de limpieza, pileta partida con bordes filosos"]];
const edTxtOk = (t) => { const x = String(t || "").trim(); return x.replace(/[\s.,;:\-_/]/g, "").length >= 8 && !/^(s\/?n|sin novedad(es)?|no|nada|ninguno|ok|bien|n\/?a)$/i.test(x); };
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
  let out = Object.keys(grupos).map(s => ({ id: grupos[s].slice().sort()[0], ids: grupos[s], nombre: grupos[s].length > 1 ? s : grupos[s][0] === "HZT" ? "Hospital Zonal Trelew (edificio central)" : ((est.find(e => e.id === grupos[s][0]) || {}).nombre || s) }));
  if (!out.length) out = est.filter(e => ED_FUERA.indexOf(e.id) < 0).map(e => ({ id: e.id, ids: [e.id], nombre: e.nombre }));   // sin catálogo de incendio: la lista fija
  return out.sort((a, b) => (a.id === "HZT" ? -1 : b.id === "HZT" ? 1 : 0) || (/^CAPS/.test(a.nombre) ? 1 : 0) - (/^CAPS/.test(b.nombre) ? 1 : 0) || a.nombre.localeCompare(b.nombre, "es"));
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
function edNorm(f) { f.det = f.det || {}; f.fotos = f.fotos || {}; ["agua", "desagues", "canaletas", "techos", "riesgos"].forEach(t => { f.fotos[t] = f.fotos[t] || []; }); return f; }
// Lo que falta, con el detalle exacto (se muestra en rojo debajo del botón)
function edFaltan(f) {
  edNorm(f); const r = f.resp, d = f.det, x = [];
  if (f.lugar && f.lugar.id === "HZT" && !String(f.parte || "").trim()) x.push("Qué parte del hospital relevaste");
  ED_TEMAS.forEach(tm => {
    const T = tm.emo + " " + tm.t;
    if (tm.tiene && !r[tm.id + "_tiene"]) { x.push(T + ": " + tm.tiene); return; }
    if (tm.tiene && r[tm.id + "_tiene"] === "No") return;
    if (tm.tipo && !r.techo_tipo) x.push(T + ": de qué es el techo");
    let hayMal = false;
    tm.pregs.forEach(([k, p, bien]) => {
      if (!r[k]) { x.push(T + ": contestar «" + p + "»"); return; }
      if (r[k] === "No se pudo ver") {
        if (!r["nsvm_" + k]) x.push(T + ": por qué no se pudo ver «" + p + "»");
        if (!edTxtOk(d["nsv_" + k])) x.push(T + ": qué parte no se pudo ver en «" + p + "»");
      } else if (r[k] !== bien) { hayMal = true; if (!edTxtOk(d[k])) x.push(T + ": dónde y qué se ve en «" + p + "»"); }
    });
    if (hayMal) {
      if (!r[tm.id + "_urgente"]) x.push(T + ": si es urgente o no");
      if (r[tm.id + "_urgente"] === "Sí" && !edTxtOk(d[tm.id + "_urg"])) x.push(T + ": por qué es urgente");
      if (!edTxtOk(f.falta[tm.id])) x.push(T + ": qué hace falta arreglar");
      if (!f.fotos[tm.id].length) x.push(T + ": al menos 1 foto de lo que está mal");
    }
  });
  ED_RIESGOS.forEach(([id, p]) => {
    const k = "rg_" + id;
    if (!r[k]) x.push("⚠️ Otros riesgos: contestar «" + p + "»");
    else if (r[k] === "Sí" && !edTxtOk(d[k])) x.push("⚠️ Otros riesgos: dónde exactamente y qué se ve o se siente en «" + p + "»");
  });
  if (ED_RIESGOS.some(([id]) => r["rg_" + id] === "Sí") && !f.fotos.riesgos.length) x.push("⚠️ Otros riesgos: al menos 1 foto");
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
// 06/11/2026 (Belén: «no me deja elegir sitios y me manda directo a Sarmiento»): al entrar SIEMPRE se ve la lista de lugares.
// Si quedó un relevamiento sin terminar en este celular, se ofrece arriba «Seguir» o «Descartar» (no se abre solo).
function edEntrar() { ed = { vista: "lugares", lugar: null, form: null, tema: 0, aviso: "" }; }
function edBorradorPendiente() { const b = edLeer(ED_BORR_KEY, null); if (!b || !b.form || !b.form.lugar) return null; if (Date.now() - b.guardado > 7 * 864e5) { edBorrarBorrador(); return null; } return b; }
function edRender() {
  const box = edBox(); if (!box) return;
  if (ed.vista === "form" && ed.form) return edRenderForm();
  const L = edLugares(), loc = edLeer(ED_LOCAL_KEY, {});
  const chip = (e) => `<span class="ed-chip ${e.nivel}">${escX(e.txt)}</span>`;
  const bp = edBorradorPendiente();
  box.innerHTML = (ed.aviso ? `<div class="tq-info">${escX(ed.aviso)}</div>` : "") +
    (bp ? `<div class="tq-info" style="border-left:4px solid #B4361F">📝 Quedó un relevamiento <b>sin terminar</b>: <b>${escX(bp.form.lugar.nombre)}</b>${bp.form.parte ? " (" + escX(bp.form.parte) + ")" : ""}, empezado el ${escX(edF(bp.form.FECHA))}.<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="ext-listo" style="margin:0;flex:1" data-b="seguir">Seguir con ese</button><button type="button" class="ext-quitar" style="flex:1" data-b="descartar">Descartarlo</button></div></div>` : "") +
    `<div class="tq-info">Es <b>solo un relevamiento</b>: mirar y contar cómo está cada lugar. Un lugar por vez, con fotos de lo que esté mal. Con esto Belén arma el informe para la Dirección.</div>` +
    L.map(l => { const u = edUltimo(l);
      return `<button type="button" class="ed-lugar" data-l="${escX(l.id)}"><b>${escX(l.nombre)}</b>` +
        (u ? `<small>✅ Relevado el ${escX(edF(u.fecha))}${loc[l.id] && !((ED_CAT.lugares || {})[l.id]) ? " · se envía cuando haya señal" : ""}</small><span class="ed-chips">${ED_TEMAS.map(tm => chip({ nivel: (u.estados || {})[tm.id + "_nivel"] || "nd", txt: tm.emo + " " + ((u.estados || {})[tm.id] || "s/d") })).join("")}</span>`
          : `<small class="er">❗ Falta relevar</small>`) + `</button>`; }).join("");
  box.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { const l = L.find(x => x.id === b.dataset.l);
    if (bp && bp.form.lugar.id !== l.id && !confirm("Tenés sin terminar el relevamiento de " + bp.form.lugar.nombre + ". Si empezás " + l.nombre + ", ese se descarta. ¿Seguir?")) return;
    if (bp && bp.form.lugar.id === l.id) { ed.form = edNorm(bp.form); ed.lugar = l; ed.vista = "form"; ed.aviso = ""; edRender(); screensEl.scrollTop = 0; return; }
    edBorrarBorrador(); edAbrir(l); });
  const bs = box.querySelector('[data-b="seguir"]'); if (bs) bs.onclick = () => { ed.form = edNorm(bp.form); ed.lugar = bp.form.lugar; ed.vista = "form"; ed.aviso = ""; edRender(); screensEl.scrollTop = 0; };
  const bd = box.querySelector('[data-b="descartar"]'); if (bd) bd.onclick = () => { if (!confirm("¿Descartar el relevamiento sin terminar de " + bp.form.lugar.nombre + "? Se borra lo cargado.")) return; edBorrarBorrador(); edRender(); };
}
function edAbrir(l) {
  ed.lugar = l; ed.vista = "form"; ed.aviso = "";
  ed.form = { uid: "ED" + Date.now() + Math.floor(Math.random() * 1000), lugar: l, FECHA: edHoy(), parte: "", resp: {}, det: {}, falta: {}, fotos: { agua: [], desagues: [], canaletas: [], techos: [], riesgos: [] }, obs: "" };
  edRender(); screensEl.scrollTop = 0;
}
function edBorrador() { if (!ed.form) return; if (!edGuardarLS(ED_BORR_KEY, { form: ed.form, guardado: Date.now() })) { const f = Object.assign({}, ed.form, { fotos: { agua: [], desagues: [], canaletas: [], techos: [] } }); edGuardarLS(ED_BORR_KEY, { form: f, guardado: Date.now() }); } }
function edBorrarBorrador() { try { localStorage.removeItem(ED_BORR_KEY); } catch (e) { } }

function edRenderForm() {
  const f = edNorm(ed.form), r = f.resp, d = f.det, box = edBox();
  const det = (k, ph, lab) => `<div class="ed-det"><div class="ext-preg ed-req">${lab}</div><textarea class="ext-com${edTxtOk(d[k]) ? "" : " ed-falta"}" rows="2" data-det="${k}" placeholder="${escX(ph)}">${escX(d[k] || "")}</textarea></div>`;
  const opc = (campo, vals, act) => `<div class="ext-opc" data-campo="${campo}">${vals.map(v => `<button type="button" class="${act === v ? "on" : ""}" data-valor="${escX(v)}">${escX(v)}</button>`).join("")}</div>`;
  let h = `<button type="button" class="ext-quitar tq-volver" data-f="cancelar">← Volver a los lugares</button>
    <div class="step-title" style="font-size:1.25rem">${escX(f.lugar.nombre)}</div>
    <div class="ext-preg">Fecha del relevamiento</div><input class="ext-inp" type="date" data-dato="FECHA" value="${escX(f.FECHA)}" max="${edHoy()}">
    <div class="tq-info">Escribí todo como si Belén no hubiera estado ahí: <b>dónde</b> (qué ambiente o sector), <b>qué</b> se ve y <b>qué</b> hace falta. Si algo no se pudo ver, decí qué parte y por qué. «s/n», «no» o «-» no se aceptan.</div>
    <div class="ext-preg">¿Qué parte del edificio relevaste? ${f.lugar.id === "HZT" ? "(obligatorio)" : "(si es todo, dejalo vacío)"}</div><input class="ext-inp" data-dato="parte" value="${escX(f.parte || "")}" placeholder="${f.lugar.id === "HZT" ? "Ej.: planta baja ala norte, guardia, terraza del 2.º piso…" : "Todo el edificio"}">
    ${f.lugar.id === "HZT" ? `<div class="step-sub">El hospital es grande: se puede relevar por partes, cargando un relevamiento por cada parte.</div>` : ""}`;
  ED_TEMAS.forEach(tm => {
    const e = edEstadoTema(tm, r), sinTener = tm.tiene && r[tm.id + "_tiene"] === "No", malo = e.nivel === "wa" || e.nivel === "er";
    h += `<div class="ext-card tq"><h4>${tm.emo} ${tm.t}</h4><div class="step-sub">${escX(tm.ayuda)}</div>`;
    if (tm.tiene) h += `<div class="ext-preg">${tm.tiene}</div>` + opc(tm.id + "_tiene", ["Sí", "No"], r[tm.id + "_tiene"]);
    if (!tm.tiene || r[tm.id + "_tiene"] === "Sí") {
      if (tm.tipo) h += `<div class="ext-preg">¿De qué es el techo?</div>` + opc("techo_tipo", ED_TIPOS_TECHO, r.techo_tipo);
      tm.pregs.forEach(([k, p, bien]) => {
        const mal = r[k] && r[k] !== bien && r[k] !== "No se pudo ver";
        h += `<div class="ext-preg">${escX(p)}</div>` + opc(k, ED_RESP, r[k]) +
          (mal ? det(k, "Ej.: Enfermería, canilla de la pileta: pierde por el vástago", "¿Dónde y qué se ve? (ambiente o sector + lo que está mal)") : "") +
          (r[k] === "No se pudo ver" ? `<div class="ed-det"><div class="ext-preg ed-req">¿Por qué no se pudo ver?</div>` + opc("nsvm_" + k, ED_NSV_MOT, r["nsvm_" + k]) + `</div>` +
            det("nsv_" + k, "Ej.: los tanques del techo del frente; no hay escalera segura", "¿Qué parte no se pudo ver?") : "");
      });
      if (malo || r[tm.id + "_urgente"]) h += `<div class="ext-preg">¿Es urgente? (riesgo de inundación, de que se caiga algo, de quedarse sin agua o de que el agua toque la electricidad)</div>` + opc(tm.id + "_urgente", ["Sí", "No"], r[tm.id + "_urgente"]) +
        (r[tm.id + "_urgente"] === "Sí" ? det(tm.id + "_urg", "Ej.: la gotera cae sobre la camilla de Enfermería y el cielorraso está abombado", "¿Por qué es urgente y dónde?") : "");
      h += `<div class="ext-preg${malo ? " ed-req" : ""}">¿Qué hace falta arreglar? ${malo ? "" : "(opcional)"}</div><textarea class="ext-com${malo && !edTxtOk(f.falta[tm.id]) ? " ed-falta" : ""}" rows="2" data-falta="${tm.id}" placeholder="Ej.: cambiar 2 metros de caño de la pileta de Enfermería, limpiar la canaleta del frente…">${escX(f.falta[tm.id] || "")}</textarea>
        <div class="ext-preg${malo ? " ed-req" : ""}">Fotos de ${tm.t.toLowerCase()} · hasta 5${malo ? " (al menos 1 de lo que está mal)" : " (opcional)"}</div><div class="foto-grid" data-fotos="${tm.id}"></div>`;
    }
    h += (sinTener ? "" : `<div style="margin-top:8px"><span class="ed-chip ${e.nivel}">${tm.emo} ${escX(e.txt)}</span></div>`) + `</div>`;
  });
  const hayRg = ED_RIESGOS.some(([id]) => r["rg_" + id] === "Sí");
  h += `<div class="ext-card tq" style="border-color:#B4361F"><h4>⚠️ Otros riesgos (contestar siempre)</h4><div class="step-sub">Aunque no sean de agua, desagües, canaletas o techos. Si hay <b>olor a gas</b>: no prender ni apagar luces ni aparatos, abrir puertas y ventanas, avisar ya al responsable del lugar y a Belén.</div>` +
    ED_RIESGOS.map(([id, p, ph]) => `<div class="ext-preg">${escX(p)}</div>` + opc("rg_" + id, ["Sí", "No"], r["rg_" + id]) + (r["rg_" + id] === "Sí" ? det("rg_" + id, ph, "¿Dónde exactamente y qué se ve, se siente o se huele?") : "")).join("") +
    (hayRg ? `<div class="ext-preg ed-req">Fotos del riesgo · hasta 5 (al menos 1)</div><div class="foto-grid" data-fotos="riesgos"></div><small class="ext-vto er">Queda marcado como URGENTE.</small>` : "") + `</div>`;
  const faltan = edFaltan(f);
  h += `<div class="ext-preg">Observaciones generales (opcional)</div><textarea class="ext-com" rows="3" data-dato="obs" placeholder="Lo que quieras contar del lugar">${escX(f.obs)}</textarea>
    <button type="button" class="ext-listo" data-f="guardar"${faltan.length ? " disabled" : ""}>${faltan.length ? "Falta completar (" + faltan.length + ")" : "Listo, guardar el relevamiento"}</button>` +
    (faltan.length ? `<div class="ed-faltan"><b>Para poder guardar falta:</b><ul>${faltan.map(t => `<li>${escX(t)}</li>`).join("")}</ul></div>` : "");
  box.innerHTML = h;
  ED_TEMAS.forEach(tm => edPintarFotos(tm.id)); edPintarFotos("riesgos");
  const refrescarFaltan = () => { const fl = edFaltan(f), bt = box.querySelector('[data-f="guardar"]'), lst = box.querySelector(".ed-faltan");
    bt.disabled = !!fl.length; bt.textContent = fl.length ? "Falta completar (" + fl.length + ")" : "Listo, guardar el relevamiento";
    if (lst) lst.outerHTML = fl.length ? `<div class="ed-faltan"><b>Para poder guardar falta:</b><ul>${fl.map(t => `<li>${escX(t)}</li>`).join("")}</ul></div>` : "";
    else if (fl.length) bt.insertAdjacentHTML("afterend", `<div class="ed-faltan"><b>Para poder guardar falta:</b><ul>${fl.map(t => `<li>${escX(t)}</li>`).join("")}</ul></div>`); };
  box.querySelectorAll("[data-det]").forEach(i => { i.oninput = () => { d[i.dataset.det] = i.value; i.classList.toggle("ed-falta", !edTxtOk(i.value)); edBorrador(); refrescarFaltan(); }; });
  box.querySelectorAll("[data-dato]").forEach(i => { i.oninput = () => { if (i.dataset.dato === "FECHA") f.FECHA = i.value; else if (i.dataset.dato === "parte") f.parte = i.value; else f.obs = i.value; edBorrador(); }; });
  box.querySelectorAll("[data-falta]").forEach(i => { i.oninput = () => { f.falta[i.dataset.falta] = i.value; if (i.classList.contains("ed-falta") || !edTxtOk(i.value)) i.classList.toggle("ed-falta", !edTxtOk(i.value)); edBorrador(); refrescarFaltan(); }; });
  box.querySelectorAll("[data-dato]").forEach(i => { const o = i.oninput; i.oninput = () => { o(); refrescarFaltan(); }; });
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
const edFotosCambio = (t) => { edPintarFotos(t); edBorrador(); const y = screensEl.scrollTop; if (ed.vista === "form" && ed.form) { edRenderForm(); screensEl.scrollTop = y; } };
edFotoInput.addEventListener("change", (e) => { const fs = Array.from(e.target.files || []); edFotoInput.value = ""; if (fs.length && ed.form && edFotoTema) { const t = edFotoTema; agregarFotos(ed.form.fotos[t], fs, () => edFotosCambio(t)); } });
function edPintarFotos(t) {
  const g = edBox().querySelector(`[data-fotos="${t}"]`); if (!g || !ed.form) return;
  const F = edNorm(ed.form).fotos[t];
  g.innerHTML = F.map((u, i) => `<div class="foto-slot filled"><img src="${u}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button></div>`).join("") +
    (F.length < 5 ? `<button type="button" class="foto-slot add"><span>+</span><small>${F.length}/5</small></button>` : "");
  g.querySelectorAll(".foto-remove").forEach(b => b.onclick = (e) => { e.stopPropagation(); F.splice(Number(b.dataset.i), 1); edFotosCambio(t); });
  const add = g.querySelector(".foto-slot.add");
  if (add) add.onclick = () => { edFotoTema = t; edBorrador(); elegirOrigenFoto(edFotoInput, true, fs => agregarFotos(F, fs, () => edFotosCambio(t))); };
}

// ---------- guardar (a la cola: se manda solo con señal)
async function edGuardar() {
  const f = edNorm(ed.form), r = f.resp, d = f.det; if (edFaltan(f).length) return;
  const lin = (k, p, bien) => "\n  " + p + " → " + r[k] + (r[k] === "No se pudo ver" ? " · por qué: " + (r["nsvm_" + k] || "s/d") + " · qué parte: " + (d["nsv_" + k] || "s/d").trim() : r[k] !== bien ? " · dónde y qué: " + (d[k] || "s/d").trim() : "");
  const estados = {}, textos = [];
  ED_TEMAS.forEach(tm => {
    const e = edEstadoTema(tm, r); estados[tm.id] = e.txt; estados[tm.id + "_nivel"] = e.nivel;
    textos.push(tm.t.toUpperCase() + (tm.tiene ? " · tiene: " + r[tm.id + "_tiene"] : "") + (tm.tipo && r.techo_tipo ? " · tipo: " + r.techo_tipo : "") +
      (tm.tiene && r[tm.id + "_tiene"] === "No" ? "" : tm.pregs.map(([k, p, bien]) => lin(k, p, bien)).join("") + (r[tm.id + "_urgente"] ? "\n  ¿Urgente? → " + r[tm.id + "_urgente"] + (r[tm.id + "_urgente"] === "Sí" ? " · por qué: " + (d[tm.id + "_urg"] || "s/d").trim() : "") : "")));
  });
  const rg = ED_RIESGOS.filter(([id]) => r["rg_" + id] === "Sí");
  textos.push("OTROS RIESGOS" + ED_RIESGOS.map(([id, p]) => "\n  " + p + " → " + (r["rg_" + id] || "s/d") + (r["rg_" + id] === "Sí" ? " · dónde y qué: " + (d["rg_" + id] || "s/d").trim() : "")).join(""));
  const otros = rg.map(([id, p]) => p.replace(/^¿Hay |\?$/g, "").replace(/ \(.*\)$/, "") + ": " + (d["rg_" + id] || "").trim()).join(" | ");
  const urg = !!rg.length || ED_TEMAS.some(tm => estados[tm.id + "_nivel"] === "er"), arr = ED_TEMAS.some(tm => estados[tm.id + "_nivel"] === "wa");
  const data = { id_relev: f.uid, fecha: new Date().toISOString(), FECHA: f.FECHA, lugar_id: f.lugar.id, lugar: f.lugar.nombre, establecimiento: f.lugar.nombre, parte: (f.parte || "").trim() || "Todo el edificio",
    operario: currentOperario ? currentOperario.nombre : "", operario_acompanante: operarioAcompanante || "",
    agua: estados.agua, desagues: estados.desagues, canaletas: estados.canaletas, techos: estados.techos, techo_tipo: r.techo_tipo || "",
    prioridad: urg ? "Urgente" : arr ? "Requiere arreglos" : "Sin problemas a la vista", respuestas: textos.join("\n"),
    agua_falta: (f.falta.agua || "").trim(), desagues_falta: (f.falta.desagues || "").trim(), canaletas_falta: (f.falta.canaletas || "").trim(), techos_falta: (f.falta.techos || "").trim(),
    observaciones: f.obs.trim(), fotos_agua: f.fotos.agua.slice(), fotos_desagues: f.fotos.desagues.slice(), fotos_canaletas: f.fotos.canaletas.slice(), fotos_techos: f.fotos.techos.slice(),
    otros_riesgos: otros || "No", fotos_riesgos: f.fotos.riesgos.slice() };
  const btn = edBox().querySelector('[data-f="guardar"]'); if (btn) btn.disabled = true;
  if (!(await guardarEnCola([{ tipo: "relev_edificio", data: data }]))) { if (btn) btn.disabled = false; return; }
  const loc = edLeer(ED_LOCAL_KEY, {}); loc[f.lugar.id] = { fecha: f.FECHA, estados: estados }; edGuardarLS(ED_LOCAL_KEY, loc);
  edBorrarBorrador();
  ed.aviso = "Relevamiento de " + f.lugar.nombre + ((f.parte || "").trim() ? " (" + f.parte.trim() + ")" : "") + " guardado" + (navigator.onLine ? " · se está enviando." : " · se envía solo cuando haya señal.");
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
.ed-det{margin:6px 0 4px 12px;padding-left:10px;border-left:3px solid var(--mod-accent,#8A6A4F)}
.ed-req::after{content:" *";color:var(--rojo-no,#B4361F);font-weight:800}
.ext-com.ed-falta{border-color:var(--rojo-no,#B4361F)!important;background:#FFF7F6}
.ed-faltan{margin:10px 0 4px;padding:10px 12px;border-radius:12px;background:#FBE4E1;color:#7A231B;font-size:.92rem}.ed-faltan ul{margin:6px 0 0 18px;padding:0}.ed-faltan li{margin:2px 0}
.ed-chip.ok{background:#E3F4E8;color:#1E6B3A}.ed-chip.wa{background:#FFF4D6;color:#8A5A00}.ed-chip.er{background:#FBE4E1;color:#7A231B}.ed-chip.nd{background:#EEF2F4;color:#55626A}
`;
document.head.appendChild(edCss);
document.getElementById("goEdificio") && document.getElementById("goEdificio").addEventListener("click", () => enterModule("edificio"));
edPintarHome();
if (typeof avisosPintar === "function") avisosPintar();   // «Para hacer ahora» ya con los lugares que faltan relevar
