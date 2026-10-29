// ============================================================
// EXTINTORES CARGADOS y ENVÍOS QUE NO SE PUDIERON MANDAR — red Trelew sin HMH (29/10/2026, pedido de Belén)
//  · «Extintores cargados»: tabla de consulta de todo lo que está en el sistema HyS (módulo 7 · Protección contra
//    incendios), con filtro por lugar, buscador y colores: rojo carga vencida, amarillo vence en 30 días.
//    Solo se mira: para cargar o corregir se usa «Otra tarea de Higiene y Seguridad» › «Control de extintores».
//  · «No se pudo enviar»: lo que la planilla rechazó, con el motivo en lenguaje claro y tres botones: corregir
//    (los datos del extintor), reintentar o descartar. Lo de extintores que ya no existen se descarta solo y se avisa.
// Los datos salen de los catálogos (Incendio_MIPyV.gs › extintoresParaApp_), que se actualizan con señal.
// ============================================================
const EXT_DESC_KEY = "mipyv_ext_descartados_v1";
const extHoyIso = () => new Date().toISOString().slice(0, 10);
const extEn30 = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const extF = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || "") ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "—";
let extVista = { abierta: false, modo: "tabla", lugar: "", buscar: "", corrigiendo: null };

// ---------- panel que tapa la pantalla (se abre desde el inicio o desde el control de extintores)
const extPanel = document.createElement("div");
extPanel.id = "extPanel";
extPanel.style.cssText = "display:none;position:fixed;inset:0;z-index:60;background:#F4F7F8;overflow:auto;-webkit-overflow-scrolling:touch";
document.body.appendChild(extPanel);
const extCss = document.createElement("style");
extCss.textContent = `
#extPanel .xp-top{position:sticky;top:0;z-index:2;background:var(--azul-humphreys);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
#extPanel .xp-top b{font-size:1.1rem;flex:1}
#extPanel .xp-top button{background:#fff;color:var(--azul-humphreys);border:0;border-radius:12px;padding:10px 14px;font:inherit;font-weight:700}
#extPanel .xp-body{padding:14px 16px 40px;max-width:1100px;margin:0 auto}
#extPanel .xp-fil{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
#extPanel .xp-fil select,#extPanel .xp-fil input{flex:1 1 200px;min-height:46px;border:2px solid var(--gris-borde);border-radius:12px;padding:8px 10px;font:inherit;background:#fff}
#extPanel .xp-cnt{font-size:.9rem;margin:0 0 8px;opacity:.85}
#extPanel .xp-tabla{overflow-x:auto;background:#fff;border-radius:14px;border:1px solid var(--gris-borde)}
#extPanel table{border-collapse:collapse;width:100%;min-width:860px;font-size:.88rem}
#extPanel th{position:sticky;top:0;background:var(--azul-claro);text-align:left;padding:8px;border-bottom:2px solid var(--gris-borde);white-space:nowrap}
#extPanel td{padding:8px;border-bottom:1px solid var(--gris-borde);vertical-align:top}
#extPanel tr.venc td{background:#FBE4E1}
#extPanel tr.porv td{background:#FFF4D6}
#extPanel .xp-ley{font-size:.82rem;margin:8px 0 0;opacity:.8}
#extPanel .xp-item{background:#fff;border:1px solid var(--gris-borde);border-radius:14px;padding:12px 14px;margin:0 0 10px}
#extPanel .xp-item .msg{background:#FBE4E1;color:#7A231B;border-radius:10px;padding:8px 10px;margin:8px 0}
#extPanel .xp-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#extPanel .xp-btns button{min-height:44px;border-radius:12px;border:2px solid var(--azul-humphreys);background:#fff;color:var(--azul-humphreys);font:inherit;font-weight:700;padding:8px 12px}
#extPanel .xp-btns button.pri{background:var(--azul-humphreys);color:#fff}
#extPanel .xp-btns button.no{border-color:var(--rojo-no);color:var(--rojo-no)}
#extPanel .xp-campo{margin:8px 0}
#extPanel .xp-campo label{display:block;font-weight:700;font-size:.9rem;margin-bottom:4px}
#extPanel .xp-campo input{width:100%;min-height:44px;border:2px solid var(--gris-borde);border-radius:10px;padding:8px 10px;font:inherit}
.module-card.ext{background:linear-gradient(135deg,#7A3B2E,#B0563E);}
`;
document.head.appendChild(extCss);
const escE = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function extTablaAbrir(modo) { extVista.abierta = true; extVista.modo = modo || "tabla"; extVista.corrigiendo = null; extPanel.style.display = "block"; extPanel.scrollTop = 0; extRender(); }
function extTablaCerrar() { extVista.abierta = false; extPanel.style.display = "none"; extFallidosAviso(); }
function extTablaRefrescar() { if (extVista.abierta && extVista.modo === "tabla") extRender(); }

// Nombre del lugar o dependencia de cada extintor (para el filtro): «Sede ex ADOS · Vacunatorio», «Amaya»…
function extLugarTxt(e) { const lg = (e.lugares || []).map(id => EXTINTORES_LUG[id]).find(Boolean); return e.sitio + (lg && lg.deps && lg.deps.length && e.sector ? " · " + e.sector : ""); }

async function extRender() {
  if (!extVista.abierta) return;
  if (extVista.modo === "fallidos") return extRenderFallidos();
  const todos = EXTINTORES_CAT.slice();
  const lugares = Array.from(new Set(todos.map(extLugarTxt))).sort((a, b) => a.localeCompare(b, "es"));
  if (extVista.lugar && lugares.indexOf(extVista.lugar) < 0) extVista.lugar = "";
  const q = extVista.buscar.trim().toLowerCase();
  const L = todos.filter(e => (!extVista.lugar || extLugarTxt(e) === extVista.lugar) && (!q || [e.nro, e.inv, e.sector, e.ubicacion, e.sitio, e.id].join(" ").toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => extLugarTxt(a).localeCompare(extLugarTxt(b), "es") || (Number(a.nro) || 9999) - (Number(b.nro) || 9999));
  const hoy = extHoyIso(), lim = extEn30();
  const venc = L.filter(e => /^\d{4}-/.test(e.vto) && e.vto < hoy).length, porv = L.filter(e => /^\d{4}-/.test(e.vto) && e.vto >= hoy && e.vto <= lim).length;
  const sinCtl = L.filter(e => String(e.ultimo || "").slice(0, 7) !== hoy.slice(0, 7)).length;
  let guardado = ""; try { const g = JSON.parse(localStorage.getItem(CATALOGOS_KEY) || "null"); if (g && g.fecha) guardado = new Date(g.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (x) {}
  extPanel.innerHTML = `<div class="xp-top"><b>🧯 Extintores cargados</b><button type="button" id="xpCerrar">Cerrar</button></div><div class="xp-body">
    <div class="xp-fil"><select id="xpLugar"><option value="">Todos los lugares (${todos.length})</option>${lugares.map(l => `<option value="${escE(l)}"${l === extVista.lugar ? " selected" : ""}>${escE(l)} (${todos.filter(e => extLugarTxt(e) === l).length})</option>`).join("")}</select>
    <input id="xpBuscar" type="search" placeholder="Buscar puesto, inventario, sector…" value="${escE(extVista.buscar)}"></div>
    <div class="xp-cnt"><b>${L.length}</b> extintor(es)${venc ? ` · <b style="color:var(--rojo-no)">${venc} con la carga vencida</b>` : ""}${porv ? ` · <b style="color:#8A5A00">${porv} vencen en 30 días</b>` : ""} · ${sinCtl} sin control este mes${guardado ? ` · lista del ${guardado}` : ""}</div>
    ${L.length ? `<div class="xp-tabla"><table><thead><tr><th>Puesto</th><th>Lugar · sector</th><th>Planta</th><th>Dónde está</th><th>Tipo · agente · kg</th><th>N.º de inventario</th><th>Carga vence</th><th>Último control</th><th>Cargó</th></tr></thead><tbody>
      ${L.map(e => { const cl = /^\d{4}-/.test(e.vto) && e.vto < hoy ? "venc" : /^\d{4}-/.test(e.vto) && e.vto <= lim ? "porv" : "";
        return `<tr class="${cl}"><td><b>${escE(e.nro || "s/d")}</b></td><td>${escE(e.sitio)}${e.sector ? "<br><small>" + escE(e.sector) + "</small>" : ""}</td><td>${escE(e.planta || "s/d")}</td><td>${escE(e.ubicacion || "s/d")}</td>
          <td>${escE([e.tipo, e.agente, e.kg ? e.kg + " kg" : ""].filter(Boolean).join(" · ") || "s/d")}</td><td>${escE(e.inv || "s/d")}</td><td>${extF(e.vto)}${cl === "venc" ? " ⚠️" : cl === "porv" ? " ⏰" : ""}</td>
          <td>${extF(e.ultimo)}${e.resultado ? "<br><small>" + escE(String(e.resultado).replace(/\s*\(MIPyV\)/, "").slice(0, 60)) + "</small>" : ""}</td><td><small>${escE(e.cargo || "s/d")}${e.alta ? "<br>" + escE(e.alta) : ""}${/^pendiente/i.test(e.verificacion) ? "<br>falta verificar (HyS)" : ""}</small></td></tr>`; }).join("")}
    </tbody></table></div>` : `<div class="xp-item">Todavía no hay extintores cargados${extVista.lugar || q ? " con ese filtro" : ""}. Se cargan en «Otra tarea de Higiene y Seguridad» › «Control de extintores» › «Agregar un extintor que no está en la lista».</div>`}
    <div class="xp-ley">Rojo: carga vencida. Amarillo: vence en 30 días. Lo recién cargado aparece cuando se envía y la lista se actualiza con señal.</div>
    <div class="xp-btns"><button type="button" class="pri" id="xpAct">🔄 Actualizar la lista</button></div></div>`;
  extPanel.querySelector("#xpCerrar").onclick = extTablaCerrar;
  extPanel.querySelector("#xpLugar").onchange = (ev) => { extVista.lugar = ev.target.value; extRender(); };
  const bus = extPanel.querySelector("#xpBuscar");
  bus.oninput = (ev) => { extVista.buscar = ev.target.value; clearTimeout(extRender._t); extRender._t = setTimeout(() => { extRender(); const b = extPanel.querySelector("#xpBuscar"); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 350); };
  extPanel.querySelector("#xpAct").onclick = async (ev) => { ev.target.disabled = true; ev.target.textContent = "Actualizando…"; await actualizarCatalogosDesdePlanilla(); try { const g = JSON.parse(localStorage.getItem(CATALOGOS_KEY) || "null"); if (g && g.catalogos) { if (Array.isArray(g.catalogos.extintores)) EXTINTORES_CAT = g.catalogos.extintores; if (g.catalogos.extintores_lugares) EXTINTORES_LUG = g.catalogos.extintores_lugares; } } catch (x) {} extRender(); };
}

// ---------- lo que no se pudo enviar
const EXT_TIPOS = { control_extintor: "Control de extintor", alta_extintor: "Extintor nuevo", editar_extintor: "Corrección de extintor", tarea_hys: "Tarea de Higiene y Seguridad", visita: "Visita MIPyV", hallazgo: "Hallazgo", trabajo_nuevo: "Trabajo de saneamiento", avance: "Avance de saneamiento", cierre_trabajo: "Cierre de trabajo", alta_tanque: "Tanque nuevo", editar_tanque: "Corrección de tanque", inspeccion_tanque: "Relevamiento de tanque", limpieza_tanque: "Limpieza de tanque" };
const EXT_CAMPOS = [["NRO_EXTINTOR", "N.º de puesto (el del cartel, solo números)"], ["NRO_INVENTARIO", "N.º de inventario (la chapita; si no tiene, s/d)"], ["PLANTA", "Planta"], ["SECTOR", "Sector o dependencia"], ["UBICACION", "¿Dónde está exactamente?"], ["VTO_CARGA", "Vencimiento de la carga (aaaa-mm-dd)"], ["PRUEBA_HIDRAULICA_VENCE", "Vencimiento de la prueba hidráulica (aaaa-mm-dd)"]];
function extResumen(it) {
  const d = it.data || {}, e = EXTINTORES_CAT.find(x => x.id === d.ID_EXTINTOR);
  if (it.tipo === "alta_extintor") return (d.lugar_nombre || "") + " · puesto " + (d.NRO_EXTINTOR || "s/d") + " · " + [d.TIPO, d.CAPACIDAD_KG ? d.CAPACIDAD_KG + " kg" : ""].filter(Boolean).join(" ") + " · inventario " + (d.NRO_INVENTARIO || "s/d");
  if (/extintor/.test(it.tipo)) return (e ? (e.nro ? "Puesto " + e.nro + " · " : "") + e.sitio + (e.sector ? " · " + e.sector : "") : "") + " (" + (d.ID_EXTINTOR || "") + ")";
  return d.establecimiento || d.lugar_nombre || d.id_establecimiento || "";
}
function extDescartadoGuardar(item, mensaje) {
  let L = []; try { L = JSON.parse(localStorage.getItem(EXT_DESC_KEY) || "[]"); } catch (x) {}
  L.unshift({ fecha: new Date().toISOString(), tipo: item.tipo, resumen: extResumen(item), mensaje: mensaje || "El extintor ya no está en la lista.", visto: false });
  try { localStorage.setItem(EXT_DESC_KEY, JSON.stringify(L.slice(0, 30))); } catch (x) {}
}
async function extFallidos() { try { return (await colaListar()).filter(it => it.ultimo_error); } catch (x) { return []; } }
async function extFallidosAviso() {
  const box = document.getElementById("extFallidos"); if (!box) return;
  const F = await extFallidos(); let D = []; try { D = JSON.parse(localStorage.getItem(EXT_DESC_KEY) || "[]").filter(d => !d.visto); } catch (x) {}
  if (!F.length && !D.length) { box.style.display = "none"; return; }
  box.style.display = "block";
  box.innerHTML = `<b>⚠️ ${F.length ? F.length + (F.length === 1 ? " registro no se pudo enviar" : " registros no se pudieron enviar") : ""}${F.length && D.length ? " · " : ""}${D.length ? D.length + " descartado(s) solo(s)" : ""}</b><br><span style="font-size:.9rem">Tocá para ver qué pasó y corregirlo.</span>`;
  box.onclick = () => extTablaAbrir("fallidos");
}
async function extRenderFallidos() {
  const F = await extFallidos(); let D = []; try { D = JSON.parse(localStorage.getItem(EXT_DESC_KEY) || "[]"); } catch (x) {}
  const c = extVista.corrigiendo;
  let h = `<div class="xp-top"><b>⚠️ No se pudo enviar</b><button type="button" id="xpCerrar">Cerrar</button></div><div class="xp-body">`;
  if (!F.length) h += `<div class="xp-item">✅ No hay nada trabado: todo lo que quedó en el celular se manda solo cuando hay señal.</div>`;
  else h += `<p class="xp-cnt">La planilla no aceptó estos registros. Leé el motivo: si es un dato mal cargado, tocá «Corregir»; si ya no hace falta, «Descartar».</p>`;
  F.forEach(it => {
    const d = it.data || {}, ext = /extintor/.test(it.tipo), corr = c === it.qid;
    h += `<div class="xp-item"><b>${escE(EXT_TIPOS[it.tipo] || it.tipo)}</b><br><small>${escE(extResumen(it))}${it.agregado ? " · cargado el " + extF(String(it.agregado).slice(0, 10)) : ""}${it.intentos ? " · " + it.intentos + " intento(s)" : ""}</small>
      <div class="msg">${escE(it.ultimo_error)}</div>`;
    if (corr) {
      EXT_CAMPOS.filter(([k]) => k in d || (it.tipo === "alta_extintor" && k !== "PRUEBA_HIDRAULICA_VENCE")).forEach(([k, t]) => {
        h += `<div class="xp-campo"><label>${escE(t)}</label><input data-k="${k}" value="${escE(d[k] || "")}"${k === "NRO_EXTINTOR" ? ' inputmode="numeric" maxlength="3"' : ""}></div>`; });
      h += `<div class="xp-btns"><button type="button" class="pri" data-guardar="${escE(it.qid)}">Guardar y volver a enviar</button><button type="button" data-cancelar="1">Cancelar</button></div>`;
    } else {
      h += `<div class="xp-btns">${ext && it.tipo !== "control_extintor" || it.tipo === "control_extintor" && it.codigo_error === "fecha" ? `<button type="button" class="pri" data-corregir="${escE(it.qid)}">✏️ Corregir</button>` : ""}<button type="button" data-reintentar="1">🔄 Reintentar ahora</button><button type="button" class="no" data-descartar="${escE(it.qid)}">🗑️ Descartar</button></div>`;
    }
    h += `</div>`;
  });
  if (D.length) {
    h += `<h3 style="margin:18px 0 8px">Descartados solos (el extintor ya no estaba en la lista)</h3>`;
    D.slice(0, 10).forEach(x => { h += `<div class="xp-item"><b>${escE(EXT_TIPOS[x.tipo] || x.tipo)}</b><br><small>${escE(x.resumen)} · ${extF(String(x.fecha).slice(0, 10))}</small><div class="msg" style="background:#EAF1F2;color:var(--texto)">${escE(x.mensaje)} Si el extintor sigue en el lugar, cargalo de nuevo con «Agregar un extintor que no está en la lista».</div></div>`; });
    h += `<div class="xp-btns"><button type="button" data-visto="1">Entendido, sacar el aviso</button></div>`;
  }
  h += `</div>`;
  extPanel.innerHTML = h;
  extPanel.querySelector("#xpCerrar").onclick = extTablaCerrar;
  extPanel.querySelectorAll("[data-corregir]").forEach(b => b.onclick = () => { extVista.corrigiendo = Number(b.dataset.corregir) || b.dataset.corregir; extRender(); });
  extPanel.querySelectorAll("[data-cancelar]").forEach(b => b.onclick = () => { extVista.corrigiendo = null; extRender(); });
  extPanel.querySelectorAll("[data-reintentar]").forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = "Enviando…"; await trySync(true); extRender(); });
  extPanel.querySelectorAll("[data-descartar]").forEach(b => b.onclick = async () => {
    if (!confirm("¿Descartar este registro? Se borra del celular y no se manda. No se puede deshacer.")) return;
    await colaBorrar(Number(b.dataset.descartar) || b.dataset.descartar); await updateQueueBadge(); extRender(); });
  extPanel.querySelectorAll("[data-guardar]").forEach(b => b.onclick = async () => {
    const it = F.find(x => String(x.qid) === String(b.dataset.guardar)); if (!it) return;
    extPanel.querySelectorAll("input[data-k]").forEach(i => { it.data[i.dataset.k] = i.value.trim(); });
    const mal = extRevisar(it.data); if (mal.length) { alert("Revisá: " + mal.join("; ") + "."); return; }
    it.ultimo_error = ""; it.codigo_error = ""; await colaActualizar(it); extVista.corrigiendo = null;
    b.disabled = true; b.textContent = "Enviando…"; await trySync(true); extRender(); });
  extPanel.querySelectorAll("[data-visto]").forEach(b => b.onclick = () => {
    try { localStorage.setItem(EXT_DESC_KEY, JSON.stringify(D.map(x => Object.assign(x, { visto: true })))); } catch (x) {}
    extRender(); extFallidosAviso(); });
}

// ---------- botones del inicio
document.getElementById("goExtTabla") && document.getElementById("goExtTabla").addEventListener("click", () => extTablaAbrir("tabla"));
extFallidosAviso();
