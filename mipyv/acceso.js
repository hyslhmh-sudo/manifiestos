// ============================================================
// INGRESO CON CONTRASEÑA (06/11/2026, pedido de Belén: «hoy cualquiera puede entrar»)
// Cada operario entra con su nombre y su contraseña personal (hoja «accesos_app» de la planilla MIP).
// Belén entra como «Belén Pellegrini (HyS)» con la misma clave del Portal HyS.
// El servidor da un permiso que el celular guarda 180 días; con él se mandan los registros (también los que
// quedaron sin señal). Si el permiso vence o cambia la contraseña, la app vuelve a pedirla y lo cargado NO se pierde.
// La primera vez hace falta señal. «Salir» (arriba) deja el celular sin permiso.
// Servidor: Accesos_MIPyV.gs. Se carga antes de app.js.
// ============================================================
const ACCESO_KEY = "mipyv_acceso_v1";
const ACCESO_HYS = { id: "hys", nombre: "Belén Pellegrini (HyS)" };

function accesoLeer() {
  try { const a = JSON.parse(localStorage.getItem(ACCESO_KEY) || "null"); if (a && a.token && (!a.vence || a.vence > Date.now())) return a; } catch (e) { }
  return null;
}
function accesoToken() { const a = accesoLeer(); return a ? a.token : ""; }
function accesoEsHys() { const a = accesoLeer(); return !!(a && a.operario && a.operario.id === ACCESO_HYS.id); }
function accesoOperarioId() { const a = accesoLeer(); return a && a.operario ? a.operario.id : ""; }
function accesoVencido(msg) {
  try { localStorage.removeItem(ACCESO_KEY); } catch (e) { }
  accesoPantalla(msg || "Tu ingreso venció o cambió tu contraseña: entrá de nuevo. Lo que cargaste queda guardado y se manda después.");
}

function accesoPantalla(msg) {
  if (document.getElementById("accesoOv")) return;
  const ops = (typeof OPERARIOS !== "undefined" ? OPERARIOS : []).concat([ACCESO_HYS]);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ov = document.createElement("div");
  ov.id = "accesoOv";
  ov.innerHTML = `<div class="acc-caja">
      <div class="acc-tit">🔒 Entrar a la app MIP</div>
      <div class="acc-sub">Elegí tu nombre y escribí tu contraseña. Si no la tenés o no te acordás, pedísela a Belén.</div>
      ${msg ? `<div class="acc-aviso">${esc(msg)}</div>` : ""}
      <div class="acc-nombres">${ops.map((o, i) => `<button type="button" class="acc-nom" data-i="${i}">${esc(o.nombre)}</button>`).join("")}</div>
      <label class="acc-lab" for="accClave">Contraseña</label>
      <div class="acc-fila"><input id="accClave" type="password" autocomplete="current-password" inputmode="text" placeholder="Tu contraseña"><button type="button" id="accVer" class="acc-ver">Ver</button></div>
      <div class="acc-err" id="accErr" hidden></div>
      <button type="button" id="accEntrar" class="acc-entrar" disabled>Entrar</button>
      <div class="acc-pie">Hospitales más seguros para las personas · HySL</div>
    </div>`;
  document.body.appendChild(ov);
  let elegido = null;
  const btn = ov.querySelector("#accEntrar"), inp = ov.querySelector("#accClave"), err = ov.querySelector("#accErr");
  const listo = () => { btn.disabled = !(elegido && inp.value.trim()); };
  ov.querySelectorAll(".acc-nom").forEach((b) => b.onclick = () => { elegido = ops[Number(b.dataset.i)]; ov.querySelectorAll(".acc-nom").forEach((x) => x.classList.toggle("on", x === b)); inp.focus(); listo(); });
  inp.oninput = listo;
  inp.onkeydown = (e) => { if (e.key === "Enter" && !btn.disabled) btn.click(); };
  ov.querySelector("#accVer").onclick = () => { inp.type = inp.type === "password" ? "text" : "password"; ov.querySelector("#accVer").textContent = inp.type === "password" ? "Ver" : "Ocultar"; };
  btn.onclick = async () => {
    err.hidden = true;
    if (!navigator.onLine) { err.textContent = "Para entrar hace falta señal (datos o wifi). Después, la app funciona sin señal como siempre."; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = "Verificando…";
    try {
      const r = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ tipo: "login", operario_id: elegido.id, clave: inp.value.trim() }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.mensaje || "No se pudo entrar.");
      localStorage.setItem(ACCESO_KEY, JSON.stringify({ token: d.token, operario: d.operario, desde: new Date().toISOString(), vence: Date.now() + (d.dias || 180) * 864e5 }));
      try { if (d.operario.id !== ACCESO_HYS.id) localStorage.setItem("mipyv_operario_v1", JSON.stringify({ nombre: d.operario.nombre })); } catch (e) { }
      location.reload();
    } catch (e) {
      err.textContent = /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? "No hay conexión con el servidor. Probá de nuevo en un rato." : e.message;
      err.hidden = false; btn.textContent = "Entrar"; listo();
    }
  };
}

// «Salir»: arriba, junto a «Sincronizar»
function accesoBotonSalir() {
  const a = accesoLeer(), sync = document.getElementById("syncBtn");
  if (!a || !sync || document.getElementById("accSalir")) return;
  const b = document.createElement("button");
  b.id = "accSalir"; b.type = "button"; b.className = "acc-salir"; b.title = "Entraste como " + a.operario.nombre + ". Tocá para salir.";
  b.textContent = "👤 " + String(a.operario.nombre).split(" ")[0] + " · Salir";
  b.onclick = async () => {
    let n = 0; try { n = typeof colaContar === "function" ? await colaContar() : 0; } catch (e) { }
    if (!confirm((n ? "Hay " + n + " registro(s) sin enviar: quedan guardados en este celular y se mandan cuando alguien vuelva a entrar.\n\n" : "") + "¿Salir de la app? Para volver a entrar hace falta la contraseña.")) return;
    try { localStorage.removeItem(ACCESO_KEY); } catch (e) { }
    accesoPantalla("Saliste. Para volver a entrar, elegí tu nombre y escribí tu contraseña.");
  };
  sync.parentNode.insertBefore(b, sync);
}

(function () {
  const css = document.createElement("style");
  css.textContent = `
#accesoOv{position:fixed;inset:0;z-index:99999;background:#0D313F;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}
#accesoOv .acc-caja{background:#fff;border-radius:18px;max-width:420px;width:100%;padding:22px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3);font-family:inherit;color:#343A40}
#accesoOv .acc-tit{font-size:1.35rem;font-weight:800;color:#0D313F;margin-bottom:6px}
#accesoOv .acc-sub{font-size:.95rem;color:#5F6B73;margin-bottom:12px}
#accesoOv .acc-aviso{background:#FFF4D6;color:#8A5A00;border-radius:10px;padding:8px 10px;font-size:.9rem;margin-bottom:12px}
#accesoOv .acc-nombres{display:grid;gap:8px;margin-bottom:14px}
#accesoOv .acc-nom{padding:14px;border-radius:12px;border:2px solid #D1D1D1;background:#fff;font:inherit;font-size:1.05rem;font-weight:700;text-align:left;color:#0D313F}
#accesoOv .acc-nom.on{border-color:#5894A7;background:#EAF3F6}
#accesoOv .acc-lab{display:block;font-weight:700;margin-bottom:6px}
#accesoOv .acc-fila{display:flex;gap:8px}
#accesoOv input{flex:1;min-width:0;padding:13px;border-radius:12px;border:2px solid #D1D1D1;font:inherit;font-size:1.1rem}
#accesoOv .acc-ver{padding:0 14px;border-radius:12px;border:2px solid #D1D1D1;background:#fff;font:inherit;font-weight:700}
#accesoOv .acc-err{background:#FBE4E1;color:#7A231B;border-radius:10px;padding:8px 10px;font-size:.92rem;margin-top:10px}
#accesoOv .acc-entrar{width:100%;margin-top:14px;padding:15px;border-radius:14px;border:0;background:#0D313F;color:#fff;font:inherit;font-size:1.1rem;font-weight:800}
#accesoOv .acc-entrar:disabled{opacity:.45}
#accesoOv .acc-pie{text-align:center;font-size:.75rem;color:#5894A7;margin-top:14px}
.acc-salir{background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:999px;padding:6px 10px;font:inherit;font-size:.8rem;font-weight:700;margin-right:6px;white-space:nowrap}`;
  document.head.appendChild(css);
  const arrancar = () => { if (!accesoLeer()) accesoPantalla(); else accesoBotonSalir(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar); else arrancar();
})();
