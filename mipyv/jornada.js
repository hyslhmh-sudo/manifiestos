// ============================================================
// MIPyV · Jornada diaria (08/11/2026, pedido de Belén)
// Una sola carga de horario por persona y por día, con pausa opcional (la pausa no suma). Los horarios ya no se piden en cada
// registro. Al abrir la app, si hay un día anterior con registros y sin jornada, aparece un cartel que no deja seguir hasta
// cargarla (uno por uno). El día de hoy se carga con «🕐 Terminar el día» (inicio). Si carga uno por los dos, la app pregunta
// por el otro: mismo horario, otro horario o no trabajó. Se manda como registro «jornada» (Jornadas_MIPyV.gs › hoja JORNADAS).
// ============================================================
const JOR_SRV_KEY = "mipyv_jornadas_srv", JOR_HECHAS_KEY = "mipyv_jornadas_hechas";
const jorLeer = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
const jorGuardarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const jorNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const jorHoyISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const JOR_DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const jorFechaTxt = (f) => { const d = new Date(f + "T12:00:00"); return JOR_DIAS[d.getDay()] + " " + f.slice(8, 10) + "/" + f.slice(5, 7); };
const jorMin = (h) => { const m = /^(\d{1,2}):(\d{2})$/.exec(h || ""); return m ? +m[1] * 60 + +m[2] : null; };
const jorHs = (m) => Math.floor(m / 60) + " h" + (m % 60 ? " " + String(m % 60).padStart(2, "0") + " min" : "");

function jorYo() {   // la persona que entró con su contraseña (Belén, como HyS, no carga jornada)
  if (typeof accesoEsHys === "function" && accesoEsHys()) return null;
  const a = typeof accesoLeer === "function" ? accesoLeer() : null; if (!a || !a.operario) return null;
  const op = (typeof OPERARIOS !== "undefined" ? OPERARIOS : []).find(o => o.id === a.operario.id);
  return op ? op.nombre : (a.operario.nombre || null);
}
function jorDatos(datos) { if (datos && datos.jornadas && Array.isArray(datos.jornadas.pendientes)) { jorGuardarLS(JOR_SRV_KEY, datos.jornadas); jorRevisar(); } }
const jorHechas = () => jorLeer(JOR_HECHAS_KEY, {});
const jorEsHecha = (f, p) => !!jorHechas()[f + "|" + jorNorm(p)] || ((jorLeer(JOR_SRV_KEY, {}).cargadas || []).some(c => c.fecha === f && jorNorm(c.persona) === jorNorm(p)));
function jorMarcar(f, p) { const h = jorHechas(); h[f + "|" + jorNorm(p)] = Date.now(); Object.keys(h).forEach(k => { if (Date.now() - h[k] > 60 * 864e5) delete h[k]; }); jorGuardarLS(JOR_HECHAS_KEY, h); }
function jorPendientesDe(p) { return ((jorLeer(JOR_SRV_KEY, {}).pendientes) || []).filter(x => jorNorm(x.persona) === jorNorm(p) && !jorEsHecha(x.fecha, x.persona)); }

// Al abrir la app y al volver al inicio: si falta la jornada de un día anterior, el cartel bloquea hasta cargarla
function jorRevisar() {
  if (document.getElementById("jorOverlay")) return;
  if (typeof currentModule !== "undefined" && currentModule) return;   // no interrumpe una carga en curso: aparece al volver al inicio
  const yo = jorYo(); jorPintarHome(); if (!yo) return;
  const p = jorPendientesDe(yo)[0]; if (!p) return;
  const con = (p.con || []).filter(o => !jorEsHecha(p.fecha, o));
  jorAbrir({ fecha: p.fecha, persona: yo, lugares: p.lugares || [], con: con, obligatorio: true, faltan: jorPendientesDe(yo).length });
}

// Botón del inicio: «Terminar el día»
function jorPintarHome() {
  const home = document.querySelector('.screen[data-step="home"]'); if (!home) return;
  let box = document.getElementById("jorHome");
  const yo = jorYo(); if (!yo) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement("div"); box.id = "jorHome"; box.style.cssText = "margin:14px 0 6px"; home.appendChild(box); }
  const hoy = jorHoyISO(), hecha = jorEsHecha(hoy, yo);
  box.innerHTML = `<button type="button" class="ext-agregar" style="border-style:solid">🕐 ${hecha ? "Corregir mi horario de hoy" : "Terminar el día: cargar mi horario"}</button>` +
    `<div class="step-sub" style="margin-top:4px">${hecha ? "Ya cargaste tu horario de hoy. Si cambió, cargalo de nuevo (queda el último)." : "Una vez por día: a qué hora entraste y saliste (y la pausa, si tuviste). Si te olvidás, mañana la app te lo pide al abrir."}</div>`;
  box.querySelector("button").onclick = () => {
    const otros = (typeof OPERARIOS !== "undefined" ? OPERARIOS : []).map(o => o.nombre).filter(n => jorNorm(n) !== jorNorm(yo) && !jorEsHecha(hoy, n));
    jorAbrir({ fecha: hoy, persona: yo, lugares: [], con: otros, obligatorio: false, hoy: true });
  };
}

function jorTramosHtml(pref, d) {
  return `<div class="ext-card tq" style="margin:8px 0"><h4 style="margin:0 0 6px">${d.titulo}</h4>
    <div class="ext-preg" style="margin-top:0">Entrada y salida</div>
    <div style="display:flex;gap:8px;align-items:center"><input class="ext-inp" type="time" data-j="${pref}e1" value="${d.e1 || ""}" style="flex:1"><span>a</span><input class="ext-inp" type="time" data-j="${pref}s1" value="${d.s1 || ""}" style="flex:1"></div>
    <label style="display:flex;gap:10px;align-items:center;margin:10px 0 0;font-weight:700"><input type="checkbox" data-j="${pref}pausa" ${d.pausa ? "checked" : ""} style="width:22px;height:22px"> ${d.textoPausa}</label>
    <div data-j="${pref}t2" style="display:${d.pausa ? "block" : "none"}"><div class="step-sub" data-j="${pref}ptxt" style="text-align:center;margin:6px 0"></div>
      <div class="ext-preg" style="margin-top:0">Segundo tramo (después de la pausa)</div>
      <div style="display:flex;gap:8px;align-items:center"><input class="ext-inp" type="time" data-j="${pref}e2" value="${d.e2 || ""}" style="flex:1"><span>a</span><input class="ext-inp" type="time" data-j="${pref}s2" value="${d.s2 || ""}" style="flex:1"></div></div>
    <div data-j="${pref}tot" style="margin-top:10px;background:#EAF1F2;border-radius:12px;padding:8px;text-align:center"></div></div>`;
}
// Lee y valida los tramos de un bloque. Devuelve { ok, e1, s1, e2, s2, min, error }
function jorLeerTramos(box, pref) {
  const v = (k) => (box.querySelector(`[data-j="${pref}${k}"]`) || {}).value || "", pausa = !!(box.querySelector(`[data-j="${pref}pausa"]`) || {}).checked;
  const e1 = v("e1"), s1 = v("s1"), e2 = pausa ? v("e2") : "", s2 = pausa ? v("s2") : "";
  const a = jorMin(e1), b = jorMin(s1), c = jorMin(e2), d = jorMin(s2);
  if (a == null || b == null) return { error: "Falta la hora de entrada o de salida." };
  if (b <= a) return { error: "La salida tiene que ser después de la entrada." };
  if (!pausa) return { ok: true, e1, s1, e2: "", s2: "", min: b - a };
  if (c == null || d == null) return { error: "Falta el segundo tramo (o destildá la pausa)." };
  if (c < b) return { error: "El segundo tramo empieza después de que terminó el primero." };
  if (d <= c) return { error: "En el segundo tramo, la salida tiene que ser después de la entrada." };
  return { ok: true, e1, s1, e2, s2, min: (b - a) + (d - c), pausaTxt: s1 + " a " + e2 };
}

function jorAbrir(o) {
  const viejo = document.getElementById("jorOverlay"); if (viejo) viejo.remove();
  const ov = document.createElement("div"); ov.id = "jorOverlay";
  ov.style.cssText = "position:fixed;inset:0;z-index:9998;background:#fff;overflow:auto;-webkit-overflow-scrolling:touch;font-family:inherit";
  const resp = {};   // otra persona → "igual" | "otro" | "no"
  const pintar = () => {
    let h = `<div style="background:var(--mod-primary,#0D313F);color:#fff;padding:14px 16px;font-weight:800">🕐 Mi horario · ${jorFechaTxt(o.fecha)}</div><div style="padding:14px 16px 110px;max-width:560px;margin:0 auto">`;
    if (o.obligatorio) h += `<div style="background:#FDE8E2;border:2px solid #C0453A;color:#7A1F14;border-radius:14px;padding:10px 12px;margin-bottom:10px"><b style="display:block;font-size:1.05rem">Falta tu horario del ${jorFechaTxt(o.fecha)}</b>` +
      (o.lugares.length ? "Ese día cargaste trabajos en: " + escX(o.lugares.join(", ")) + ". " : "") + `Para seguir usando la app, cargá a qué hora entraste y saliste.` + (o.faltan > 1 ? ` Después quedan ${o.faltan - 1} día(s) más.` : "") + `</div>`;
    h += `<div class="step-title" style="font-size:1.2rem">${escX(o.persona)}</div>` + jorTramosHtml("y", { titulo: "Tu jornada", textoPausa: "Tuve una pausa (salí y volví)" });
    (o.con || []).forEach((p, i) => {
      h += `<div class="ext-card tq" style="margin-top:14px"><h4 style="margin:0 0 6px">¿${escX(p.split(" ")[0])} trabajó con vos ${o.hoy ? "hoy" : "ese día"}?</h4><div class="ext-opc" data-otro="${i}">` +
        [["igual", "👥 Mismo horario que yo"], ["otro", "🕐 Otro horario"], ["no", "🚫 No trabajó con HyS"]].map(([k, t]) => `<button type="button" class="${resp[p] === k ? "on" : ""}" data-v="${k}">${t}</button>`).join("") + `</div>` +
        (resp[p] === "otro" ? jorTramosHtml("o" + i, { titulo: "Horario de " + escX(p.split(" ")[0]), textoPausa: escX(p.split(" ")[0]) + " tuvo una pausa" }) : "") +
        (o.hoy ? `<div class="step-sub">Si ${escX(p.split(" ")[0])} carga su horario en su celular, elegí «No trabajó» solo si de verdad no trabajó; si no, dejalo para que lo cargue él.</div>` : "") + `</div>`;
    });
    h += `<div id="jorErr" style="color:#B4361F;font-weight:700;margin:10px 0"></div><button type="button" class="ext-listo" id="jorOk">Guardar mi horario</button>` +
      (o.obligatorio ? "" : `<button type="button" class="ext-quitar" id="jorNo" style="margin-top:8px">Cancelar</button>`) + `</div>`;
    ov.innerHTML = h;
    const total = (pref) => { const t = jorLeerTramos(ov, pref), tot = ov.querySelector(`[data-j="${pref}tot"]`), pt = ov.querySelector(`[data-j="${pref}ptxt"]`), t2 = ov.querySelector(`[data-j="${pref}t2"]`);
      if (t2) t2.style.display = ov.querySelector(`[data-j="${pref}pausa"]`).checked ? "block" : "none";
      if (pt) pt.textContent = t.ok && t.pausaTxt ? "Pausa de " + t.pausaTxt + " · no se cuenta" : "La pausa no se cuenta";
      if (tot) tot.innerHTML = t.ok ? `Total trabajado <b style="font-size:1.25rem;display:block">${jorHs(t.min)}</b>` : `<span class="step-sub">${escX(t.error)}</span>`; };
    const prefs = ["y"].concat((o.con || []).map((p, i) => resp[p] === "otro" ? "o" + i : null).filter(Boolean));
    prefs.forEach(pref => { ov.querySelectorAll(`[data-j^="${pref}"]`).forEach(i => { i.oninput = () => total(pref); i.onchange = () => total(pref); }); total(pref); });
    ov.querySelectorAll("[data-otro] button").forEach(b => b.onclick = () => { const vals = {}; prefs.forEach(pref => ["e1", "s1", "e2", "s2"].forEach(k => { const el = ov.querySelector(`[data-j="${pref}${k}"]`); if (el) vals[pref + k] = el.value; }));
      const pz = {}; prefs.forEach(pref => { const el = ov.querySelector(`[data-j="${pref}pausa"]`); if (el) pz[pref] = el.checked; });
      resp[o.con[+b.parentElement.dataset.otro]] = b.dataset.v; pintar();
      Object.keys(vals).forEach(k => { const el = ov.querySelector(`[data-j="${k}"]`); if (el) el.value = vals[k]; });
      Object.keys(pz).forEach(pref => { const el = ov.querySelector(`[data-j="${pref}pausa"]`); if (el) { el.checked = pz[pref]; } }); prefs.forEach(pref => total(pref)); });
    const no = ov.querySelector("#jorNo"); if (no) no.onclick = () => ov.remove();
    ov.querySelector("#jorOk").onclick = async () => {
      const err = (t) => { ov.querySelector("#jorErr").textContent = t; };
      const y = jorLeerTramos(ov, "y"); if (!y.ok) return err(y.error);
      const items = [], base = (p, t, noTrab) => ({ tipo: "jornada", data: { id_jornada: "J-" + o.fecha + "-" + jorNorm(p).replace(/[^a-z]+/g, ""), fecha: o.fecha, persona: p,
        entrada1: noTrab ? "" : t.e1, salida1: noTrab ? "" : t.s1, entrada2: noTrab ? "" : t.e2, salida2: noTrab ? "" : t.s2, no_trabajo: noTrab ? "Sí" : "", cargado_por: o.persona } });
      items.push(base(o.persona, y, false));
      for (let i = 0; i < (o.con || []).length; i++) { const p = o.con[i], r = resp[p];
        if (!r) { if (o.hoy) continue; return err("Contestá si " + p.split(" ")[0] + " trabajó con vos ese día."); }
        if (r === "igual") items.push(base(p, y, false));
        else if (r === "no") items.push(base(p, {}, true));
        else { const t = jorLeerTramos(ov, "o" + i); if (!t.ok) return err(p.split(" ")[0] + ": " + t.error); items.push(base(p, t, false)); } }
      const b = ov.querySelector("#jorOk"); b.disabled = true; b.textContent = "Guardando…";
      if (!(await guardarEnCola(items))) { b.disabled = false; b.textContent = "Guardar mi horario"; return; }
      items.forEach(it => jorMarcar(it.data.fecha, it.data.persona));
      ov.remove(); jorPintarHome();
      try { await updateQueueBadge(); } catch (e) { } if (typeof trySync === "function") trySync();
      setTimeout(jorRevisar, 300);   // el próximo día pendiente, si hay
    };
  };
  pintar(); document.body.appendChild(ov); ov.scrollTop = 0;
}

// Al abrir la app: con los datos guardados del último envío (también sin señal)
setTimeout(jorRevisar, 1200);
