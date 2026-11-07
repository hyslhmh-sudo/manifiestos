// ============================================================
// MIPyV · 📷 Escanear el QR de un extintor (07/11/2026, pedido de Belén)
// Cada extintor tiene dos etiquetas QR (cilindro y chapa baliza) con un link corto: .../manifiestos/?q=HZT-005 (o HZT-005-C).
// En el paso «Extintores» del control, el botón «📷 Escanear el QR» abre la cámara, lee la etiqueta y abre ese extintor
// para controlarlo, sin buscarlo en la lista. Si el extintor es de un lugar que no se eligió en esta tarea, se agrega solo.
// Funciona sin señal: lee el código con la cámara del celular y lo busca en la lista guardada.
// Lector: BarcodeDetector (Android/Chrome) o jsQR (jsqr.js, licencia Apache 2.0) en los demás (iPhone).
// ============================================================
let escStream = null, escCorriendo = false;

function escCodigoAId(txt) {
  const s = String(txt || "").trim();
  const m = /[?&]q=([A-Za-z]+-\d+)(-C)?/i.exec(s) || /^([A-Za-z]+-\d+)(-C)?$/i.exec(s);
  if (!m) return null;
  const p = m[1].toUpperCase().split("-");
  return { id: "EXT-" + p[0] + "-" + p[1], chapa: !!m[2] };
}

function escCerrar() {
  escCorriendo = false;
  if (escStream) { escStream.getTracks().forEach(t => t.stop()); escStream = null; }
  const o = document.getElementById("escOverlay"); if (o) o.remove();
}

async function escanearExtintor() {
  escCerrar();
  const o = document.createElement("div");
  o.id = "escOverlay";
  o.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;color:#fff;font-family:inherit;text-align:center";
  o.innerHTML = '<div style="font-weight:800;font-size:1.1rem">Apuntá la cámara al QR del extintor o de la chapa baliza</div>' +
    '<div style="position:relative;width:min(88vw,420px);aspect-ratio:1;border-radius:16px;overflow:hidden;background:#222">' +
    '<video id="escVideo" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>' +
    '<div style="position:absolute;inset:14%;border:4px solid #FFB109;border-radius:12px"></div></div>' +
    '<div id="escMsg" style="min-height:1.4em;font-size:.95rem">Abriendo la cámara…</div>' +
    '<label style="background:#fff;color:#343A40;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer">📸 Sacar una foto del QR<input id="escFoto" type="file" accept="image/*" capture="environment" style="display:none"></label>' +
    '<button type="button" id="escCerrar" style="background:transparent;color:#fff;border:2px solid #fff;border-radius:12px;padding:10px 18px;font:inherit;font-weight:800">Cancelar</button>';
  document.body.appendChild(o);
  document.getElementById("escCerrar").onclick = escCerrar;
  const msg = t => { const m = document.getElementById("escMsg"); if (m) m.textContent = t; };
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  const det = ("BarcodeDetector" in window) ? (() => { try { return new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) { return null; } })() : null;
  const leer = async (fuente, w, h) => {
    if (det) { try { const r = await det.detect(fuente); if (r && r.length) return r[0].rawValue; } catch (e) {} }
    if (typeof jsQR !== "function" || !w || !h) return null;
    const k = Math.min(1, 640 / Math.max(w, h)); canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
    ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height), r = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    return r ? r.data : null;
  };
  const listo = txt => {
    const c = escCodigoAId(txt);
    if (!c) { msg("Ese QR no es de un extintor del sistema HyS. Probá con otro."); return false; }
    escCerrar(); escAbrirExtintor(c.id, c.chapa); return true;
  };
  // Foto (si la cámara en vivo no anda o el QR está lejos)
  document.getElementById("escFoto").onchange = async ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    msg("Leyendo la foto…");
    const img = new Image(); img.src = URL.createObjectURL(f);
    try { await img.decode(); } catch (e) { msg("No se pudo abrir la foto."); return; }
    const t = await leer(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(img.src);
    if (!t) { msg("No se encontró un QR en la foto. Sacala más cerca y derecha."); return; }
    listo(t);
  };
  // Cámara en vivo
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg("Este celular no deja usar la cámara acá: usá «Sacar una foto del QR»."); return; }
  try { escStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); }
  catch (e) { msg("No se pudo abrir la cámara (¿falta el permiso?). Usá «Sacar una foto del QR»."); return; }
  const v = document.getElementById("escVideo"); if (!v) { escCerrar(); return; }
  v.srcObject = escStream; try { await v.play(); } catch (e) {}
  msg("Buscando el QR…"); escCorriendo = true;
  const ciclo = async () => {
    if (!escCorriendo) return;
    if (v.readyState >= 2) { const t = await leer(v, v.videoWidth, v.videoHeight); if (t && listo(t)) return; }
    setTimeout(ciclo, 250);
  };
  ciclo();
}

// Abre el extintor escaneado en el paso «Extintores» (agrega su lugar a la tarea si hacía falta)
function escAbrirExtintor(id, chapa) {
  const e = EXTINTORES_CAT.find(x => x.id === id);
  if (!e) { alert("El extintor " + id + " no está en la lista guardada en este celular. Puede ser nuevo o estar dado de baja: tocá «Actualizar» en el inicio con señal, o avisá a Higiene y Seguridad."); return; }
  let lugar = tareaHys.lugares.find(l => (e.lugares || []).indexOf(l.id) >= 0);
  if (!lugar) {
    const est = ESTABLECIMIENTOS.find(x => (e.lugares || []).indexOf(x.id) >= 0);
    if (!est) { alert("No se encontró el lugar de este extintor en la lista de la app. Avisá a Higiene y Seguridad."); return; }
    lugar = { id: est.id, nombre: est.nombre, tipo: est.tipo };
    tareaHys.lugares.push(lugar);
    const orden = ESTABLECIMIENTOS.map(x => x.id); tareaHys.lugares.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
  }
  if (!tareaHys.controles[e.id]) tareaHys.controles[e.id] = controlVacio(e);
  extAbierto = e.id; altaAbierta = null;
  renderExtintores();
  setTimeout(() => { const f = document.querySelector(".ext-fila.abierta"); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
}
