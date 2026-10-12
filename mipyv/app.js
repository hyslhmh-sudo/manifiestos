// ============================================================
// ESTADO GENERAL
// ============================================================
let currentModule = null; // "mipyv" | "saneamiento" | "hys"
let currentOperario = null; // { id, nombre }

let stepList = [];
let stepIndex = 0;

let visita = {};
let fotosDataUrls = []; // hasta 5
let intervencion = {}; // { protocolo, esNueva, id_establecimiento, establecimiento, tipo_establecimiento, id_plaga, tipo_plaga }

let trabajo = {};
let avance = {};
let sFotosDataUrls = []; // hasta 5
let operarioAcompanante = null; // nombre del otro operario, o null si trabajó solo/a
let acompananteRespondido = false;
let detalleExtraTextos = {}; // texto extra por cada chip de DETALLE_CHIPS_SANEAMIENTO que lo requiera

function resetVisita() {
  visita = {
    id_visita: "V-" + Date.now(),
    fecha: new Date().toISOString(),
    id_operario: null, operario: null,
    id_establecimiento: null, establecimiento: null, tipo_establecimiento: null,
    sector: null,
    id_plaga: null, tipo_plaga: null,
    id_producto: null, producto: null,
    dosis_aplicada: null, frecuencia_recomendada: null, puntos_criticos: null,
    epp_utilizado: [], // [{nombre, cantidad}]
    resultado: null,
    observaciones: "",
    protocolo_existente: null,
    operario_acompanante: null,
    hora_inicio: null, hora_fin: null,
    hora_inicio_acompanante: null, hora_fin_acompanante: null,
  };
  fotosDataUrls = [];
}

function resetIntervencion() {
  intervencion = { protocolo: null, esNueva: true, id_establecimiento: null, establecimiento: null, tipo_establecimiento: null, id_plaga: null, tipo_plaga: null };
}

function resetSaneamiento() {
  trabajo = { id_trabajo: null, id_establecimiento: null, establecimiento: null, fecha_inicio: null, estado: null, esNuevo: true };
  avance = {
    tareas: [], detalle: "", notas: "",
    epp_utilizado: [], // [{nombre, cantidad}]
    producto_biocida: null, id_producto_biocida: null,
    dosis_biocida: null, frecuencia_biocida: null, puntos_criticos_biocida: null,
  };
  sFotosDataUrls = [];
  detalleExtraTextos = {};
}

// ============================================================
// NAVEGACIÓN
// ============================================================
const screensEl = document.getElementById("screens");
const progressFill = document.getElementById("progressFill");
const progressWrap = document.getElementById("progressWrap");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const bottomBar = document.getElementById("bottomBar");
const brandLabel = document.getElementById("brandLabel");
const homeBtn = document.getElementById("homeBtn");

function goHome() {
  currentModule = null;
  if (hayVersionNueva) { window.location.reload(); return; }
  cargarCatalogosGuardados(); // por si se descargaron listas nuevas mientras cargaba
  document.body.classList.remove("mode-saneamiento", "mode-hys");
  brandLabel.textContent = "Red HZT";
  progressWrap.style.display = "none";
  bottomBar.style.display = "none";
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelector('.screen[data-step="home"]').classList.add("active");
  screensEl.scrollTop = 0;
}
homeBtn.addEventListener("click", goHome);

function enterModule(mod) {
  currentModule = mod;
  resetVisita();
  resetIntervencion();
  resetSaneamiento();
  resetTareaHys();
  operarioAcompanante = null;
  acompananteRespondido = false;
  document.body.classList.remove("mode-saneamiento", "mode-hys");
  if (mod === "hys") {
    document.body.classList.add("mode-hys");
    brandLabel.textContent = "Higiene y Seguridad";
    stepList = ["quien", "acompanante", "h-tipo"];
    reiniciarPantallasHys();
  } else if (mod === "saneamiento") {
    document.body.classList.add("mode-saneamiento");
    brandLabel.textContent = "Saneamiento · Área Externa";
    stepList = ["quien", "acompanante", "s-tipo"];
  } else {
    brandLabel.textContent = "MIPyV · HZT Red";
    stepList = ["quien", "acompanante", "m-tipo"];
  }
  progressWrap.style.display = "block";
  bottomBar.style.display = "flex";
  stepIndex = 0;
  showStep(stepList[0]);
}

document.getElementById("goMipyv").addEventListener("click", () => enterModule("mipyv"));
document.getElementById("goSaneamiento").addEventListener("click", () => enterModule("saneamiento"));
document.getElementById("goHys").addEventListener("click", () => enterModule("hys"));

function showStep(name) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.toggle("active", s.dataset.step === name);
  });
  const pos = stepList.indexOf(name) + 1;
  progressFill.style.width = Math.max(8, (pos / stepList.length) * 100) + "%";
  backBtn.style.visibility = pos <= 1 ? "hidden" : "visible";
  const isSentScreen = name === "m-sent" || name === "s-sent" || name === "h-sent";
  bottomBar.style.display = isSentScreen ? "none" : "flex";
  nextBtn.disabled = !canAdvance(name);
  const isConfirm = name === "m-confirm" || name === "s-confirm" || name === "h-confirm";
  nextBtn.textContent = isConfirm ? "Enviar" : "Siguiente";
  screensEl.scrollTop = 0;

  if (name === "m-confirm") renderResumenMipyv();
  if (name === "s-confirm") renderResumenSaneamiento();
  if (name === "s-cap-continuar") renderTrabajosAbiertos();
  if (name === "m-continuar-lista") renderIntervencionesAbiertas();
  if (name === "m-seguridad") renderSeguridad();
  if (name === "acompanante") actualizarLabelAcompanante();
  if (name === "horario") actualizarPantallaHorario();
  if (name === "m-foto") renderFotoGrid();
  if (name === "s-detalle") renderSFotoGrid();
  if (name === "m-epp") renderEppGrid();
  if (name === "s-epp") renderSEppGrid();
  if (name === "s-seguridad") renderSSeguridad();
  if (name === "h-lugares") renderLugaresHys();
  if (name === "h-extintores") renderExtintores();
  if (name === "h-detalle") prepararDetalleHys();
  if (name === "h-hallazgos") prepararHallazgosHys();
  if (name === "h-confirm") renderResumenHys();
}

function canAdvance(name) {
  switch (name) {
    case "quien": return !!currentOperario;
    case "acompanante": return acompananteRespondido;
    case "horario": return validarHorario();
    case "m-tipo": return false;
    case "m-continuar-lista": return !!intervencion.protocolo;
    case "m-establecimiento": return !!visita.id_establecimiento;
    case "m-sector": return !!visita.sector;
    case "m-plaga": return !!visita.id_plaga;
    case "m-producto": return !!visita.id_producto;
    case "m-epp": return visita.epp_utilizado.length > 0;
    case "m-resultado": return !!visita.resultado;
    case "s-tipo": return false;
    case "s-cap-nuevo": return !!trabajo.id_establecimiento;
    case "s-cap-continuar": return !!trabajo.id_trabajo;
    case "s-producto": return !!avance.id_producto_biocida;
    case "s-tareas": return avance.tareas.length > 0;
    case "s-epp": return avance.epp_utilizado.length > 0;
    case "s-detalle": return validarDetalleSaneamiento();
    case "s-cierre": return !!avance.cierre;
    case "h-tipo": return !!tareaHys.tipo_tarea;
    case "h-lugares": return tareaHys.lugares.length > 0;
    case "h-extintores": return tareaHys.lugares.every(l => extintorCompleto(tareaHys.extintores[l.id]));
    case "h-detalle": return validarDetalleHys();
    default: return true;
  }
}

// La hora de fin tiene que ser posterior a la de inicio (las horas vienen
// como "HH:MM", así que se pueden comparar como texto).
const avisoHorario = document.createElement("div");
avisoHorario.style.cssText = "display:none; margin-top:14px; padding:12px; border-radius:12px; background:#FDECEA; color:#8A1C12; font-weight:600;";
document.querySelector('.screen[data-step="horario"]').appendChild(avisoHorario);

function validarHorario() {
  const errores = [];
  if (horaInicioEl.value && horaFinEl.value && horaFinEl.value <= horaInicioEl.value) {
    errores.push("Tu hora de finalización tiene que ser después de la de inicio.");
  }
  if (pideHorarioAcompanante() && horaInicioAcompEl.value && horaFinAcompEl.value && horaFinAcompEl.value <= horaInicioAcompEl.value) {
    errores.push(`La hora de finalización de ${operarioAcompanante} tiene que ser después de la de inicio.`);
  }
  avisoHorario.textContent = errores.join(" ");
  avisoHorario.style.display = errores.length ? "block" : "none";
  if (errores.length) return false;
  if (!horaInicioEl.value || !horaFinEl.value) return false;
  if (pideHorarioAcompanante() && (!horaInicioAcompEl.value || !horaFinAcompEl.value)) return false;
  return true;
}

function validarDetalleSaneamiento() {
  return detalleSeleccionados
    .filter(txt => CHIPS_CON_DETALLE[txt])
    .every(txt => (detalleExtraTextos[txt] || "").trim().length > 0);
}

function goNext() {
  const current = stepList[stepIndex];
  if (!canAdvance(current)) return;
  if (current === "m-confirm") { sendVisita(); return; }
  if (current === "s-confirm") { sendAvance(); return; }
  if (current === "h-confirm") { sendTareaHys(); return; }
  if (stepIndex < stepList.length - 1) stepIndex++;
  showStep(stepList[stepIndex]);
}
function goBack() {
  if (stepIndex > 0) stepIndex--;
  showStep(stepList[stepIndex]);
}
nextBtn.addEventListener("click", goNext);
backBtn.addEventListener("click", goBack);

// ============================================================
// PASO COMPARTIDO — QUIEN SOS
// ============================================================
const operarioGrid = document.getElementById("operarioGrid");
function renderOperarios() {
operarioGrid.innerHTML = "";
OPERARIOS.forEach(op => {
  const btn = document.createElement("button");
  btn.className = "tile big person-tile";
  btn.innerHTML = `<div class="avatar">${op.inicial}</div><div class="label">${op.nombre}</div>`;
  btn.onclick = () => {
    currentOperario = op;
    visita.id_operario = op.id; visita.operario = op.nombre;
    [...operarioGrid.children].forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
    nextBtn.disabled = false;
    setTimeout(goNext, 180);
  };
  operarioGrid.appendChild(btn);
});
}
renderOperarios();

// ============================================================
// PASO COMPARTIDO — ACOMPAÑANTE (trabajó solo o con el otro operario)
// ============================================================
const acompanadoLabel = document.getElementById("acompanadoLabel");
document.getElementById("soloBtn").addEventListener("click", () => {
  operarioAcompanante = null;
  acompananteRespondido = true;
  setTimeout(goNext, 180);
});
document.getElementById("acompanadoBtn").addEventListener("click", () => {
  const otro = OPERARIOS.find(op => op.id !== currentOperario.id);
  operarioAcompanante = otro ? otro.nombre : null;
  acompananteRespondido = true;
  setTimeout(goNext, 180);
});
function actualizarLabelAcompanante() {
  const otro = OPERARIOS.find(op => currentOperario && op.id !== currentOperario.id);
  acompanadoLabel.textContent = "Trabajé con " + (otro ? otro.nombre : "el otro operario");
}

// ============================================================
// PASO COMPARTIDO — HORARIO (hora de inicio/fin, propia y del acompañante)
// ============================================================
const horaInicioEl = document.getElementById("horaInicio");
const horaFinEl = document.getElementById("horaFin");
const horarioAcompananteWrap = document.getElementById("horarioAcompananteWrap");
const horaInicioAcompLabel = document.getElementById("horaInicioAcompLabel");
const horaFinAcompLabel = document.getElementById("horaFinAcompLabel");
const horaInicioAcompEl = document.getElementById("horaInicioAcomp");
const horaFinAcompEl = document.getElementById("horaFinAcomp");

// En "Otra tarea de HyS" no se piden los horarios del acompañante
// (la hoja tareas_hys guarda un solo horario por tarea).
function pideHorarioAcompanante() {
  return !!operarioAcompanante && currentModule !== "hys";
}

function actualizarPantallaHorario() {
  const hayAcompanante = pideHorarioAcompanante();
  horarioAcompananteWrap.style.display = hayAcompanante ? "block" : "none";
  if (hayAcompanante) {
    horaInicioAcompLabel.textContent = `Hora de inicio de ${operarioAcompanante}`;
    horaFinAcompLabel.textContent = `Hora de finalización de ${operarioAcompanante}`;
  }
}

function guardarHorarios(objetivo) {
  objetivo.hora_inicio = horaInicioEl.value || null;
  objetivo.hora_fin = horaFinEl.value || null;
  objetivo.hora_inicio_acompanante = operarioAcompanante ? (horaInicioAcompEl.value || null) : null;
  objetivo.hora_fin_acompanante = operarioAcompanante ? (horaFinAcompEl.value || null) : null;
}

[horaInicioEl, horaFinEl, horaInicioAcompEl, horaFinAcompEl].forEach(el => {
  el.addEventListener("input", () => {
    if (stepList[stepIndex] === "horario") nextBtn.disabled = !canAdvance("horario");
  });
});

// ============================================================
// MIPyV — m-tipo (nueva / continuar)
// ============================================================
document.getElementById("mNuevaBtn").addEventListener("click", () => {
  intervencion.esNueva = true;
  stepList = ["quien", "acompanante", "m-tipo", "m-establecimiento", "m-sector", "m-plaga", "m-producto", "m-seguridad", "m-dosis", "m-epp", "m-resultado", "m-foto", "m-obs", "horario", "m-confirm", "m-sent"];
  stepIndex = stepList.indexOf("m-establecimiento");
  showStep("m-establecimiento");
});
document.getElementById("mContinuarBtn").addEventListener("click", () => {
  intervencion.esNueva = false;
  stepList = ["quien", "acompanante", "m-tipo", "m-continuar-lista", "m-sector", "m-producto", "m-seguridad", "m-dosis", "m-epp", "m-resultado", "m-foto", "m-obs", "horario", "m-confirm", "m-sent"];
  stepIndex = stepList.indexOf("m-continuar-lista");
  showStep("m-continuar-lista");
});

// ============================================================
// MIPyV — m-continuar-lista (intervenciones abiertas, cacheadas localmente)
// ============================================================
const INTERVENCIONES_KEY = "mipyv_intervenciones_abiertas_v1";
function getIntervencionesAbiertas() { return JSON.parse(localStorage.getItem(INTERVENCIONES_KEY) || "[]"); }
function setIntervencionesAbiertas(list) { localStorage.setItem(INTERVENCIONES_KEY, JSON.stringify(list)); }

// Copias de las listas abiertas que manda la planilla (última descarga).
// Se usan también sin señal. A esa lista se le suma lo que este celular
// tiene todavía sin enviar, para que se vea al instante.
const INTERV_PLANILLA_KEY = "mipyv_intervenciones_planilla_v1";
const TRABAJOS_PLANILLA_KEY = "mipyv_trabajos_planilla_v1";
function leerCopia(clave) {
  try { const c = JSON.parse(localStorage.getItem(clave) || "null"); return c && Array.isArray(c.lista) ? c.lista : null; }
  catch (err) { return null; }
}
function guardarCopia(clave, lista) {
  try { localStorage.setItem(clave, JSON.stringify({ fecha: new Date().toISOString(), lista })); } catch (err) { /* sin espacio */ }
}
async function colaSegura() {
  try { return await colaListar(); } catch (err) { return []; }
}

async function intervencionesParaMostrar() {
  const dePlanilla = leerCopia(INTERV_PLANILLA_KEY);
  if (!dePlanilla) return getIntervencionesAbiertas(); // nunca se descargó: lista propia del celular
  const lista = dePlanilla.map(iv => ({ ...iv }));
  const visitasPendientes = (await colaSegura())
    .filter(it => it.tipo === "visita").map(it => it.data)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  visitasPendientes.forEach(v => {
    const clave = v.protocolo_existente || "PENDIENTE-" + v.id_visita;
    const idx = lista.findIndex(iv => iv.protocolo === clave || (iv.alias || []).includes(clave));
    if (v.resultado === "Requiere otra visita") {
      const reg = {
        protocolo: idx >= 0 ? lista[idx].protocolo : clave,
        alias: idx >= 0 ? lista[idx].alias : [clave],
        id_establecimiento: v.id_establecimiento, establecimiento: v.establecimiento,
        tipo_establecimiento: v.tipo_establecimiento, id_plaga: v.id_plaga,
        tipo_plaga: v.tipo_plaga, sector: v.sector,
      };
      if (idx >= 0) lista[idx] = reg; else lista.push(reg);
    } else if (idx >= 0) {
      lista.splice(idx, 1); // se cerró con una visita que todavía no se envió
    }
  });
  return lista;
}

function renderIntervencionesAbiertas() {
  pintarIntervencionesAbiertas(); // muestra lo que ya hay en el celular, sin esperar
  actualizarCatalogosDesdePlanilla().finally(pintarIntervencionesAbiertas);
}

async function pintarIntervencionesAbiertas() {
  const list = await intervencionesParaMostrar();
  const wrap = document.getElementById("intervencionesAbiertasList");
  const msg = document.getElementById("sinIntervencionesMsg");
  wrap.innerHTML = "";
  if (list.length === 0) { msg.style.display = "block"; return; }
  msg.style.display = "none";
  list.forEach(iv => {
    const card = document.createElement("button");
    card.className = "job-card";
    card.innerHTML = `<b>${iv.tipo_plaga} — ${iv.establecimiento}</b><span>Sector: ${iv.sector || "—"} · Protocolo ${iv.protocolo}</span>`;
    card.onclick = () => {
      intervencion.protocolo = iv.protocolo;
      intervencion.id_establecimiento = iv.id_establecimiento;
      intervencion.establecimiento = iv.establecimiento;
      intervencion.tipo_establecimiento = iv.tipo_establecimiento;
      intervencion.id_plaga = iv.id_plaga;
      intervencion.tipo_plaga = iv.tipo_plaga;
      visita.id_establecimiento = iv.id_establecimiento;
      visita.establecimiento = iv.establecimiento;
      visita.tipo_establecimiento = iv.tipo_establecimiento;
      visita.id_plaga = iv.id_plaga;
      visita.tipo_plaga = iv.tipo_plaga;
      visita.protocolo_existente = iv.protocolo;
      [...wrap.children].forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      renderSectores();
      nextBtn.disabled = false;
      setTimeout(goNext, 180);
    };
    wrap.appendChild(card);
  });
}

// ============================================================
// MIPyV — m-establecimiento
// ============================================================
const tipoChips = document.getElementById("tipoChips");
const establecimientoGrid = document.getElementById("establecimientoGrid");
const TIPOS = ["Todos", "Hospital", "Dependencia", "CAP"];
let tipoFiltro = "Todos";

TIPOS.forEach(t => {
  const chip = document.createElement("button");
  chip.className = "chip" + (t === "Todos" ? " active" : "");
  chip.textContent = t === "CAP" ? "CAPS" : t;
  chip.onclick = () => {
    tipoFiltro = t;
    [...tipoChips.children].forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    renderEstablecimientos();
  };
  tipoChips.appendChild(chip);
});

function renderEstablecimientos() {
  establecimientoGrid.innerHTML = "";
  const iconFor = { Hospital: "hospital", Dependencia: "building", CAP: "cap" };
  ESTABLECIMIENTOS.filter(e => tipoFiltro === "Todos" || e.tipo === tipoFiltro).forEach(est => {
    const btn = document.createElement("button");
    btn.className = "tile";
    btn.innerHTML = `${renderIcon(iconFor[est.tipo])}<div class="label">${est.nombre}</div>`;
    if (visita.id_establecimiento === est.id) btn.classList.add("selected");
    btn.onclick = () => {
      visita.id_establecimiento = est.id; visita.establecimiento = est.nombre; visita.tipo_establecimiento = est.tipo;
      intervencion.id_establecimiento = est.id; intervencion.establecimiento = est.nombre; intervencion.tipo_establecimiento = est.tipo;
      [...establecimientoGrid.children].forEach(c => c.classList.remove("selected"));
      btn.classList.add("selected");
      renderSectores();
      nextBtn.disabled = false;
      setTimeout(goNext, 180);
    };
    establecimientoGrid.appendChild(btn);
  });
}
renderEstablecimientos();

// ============================================================
// MIPyV — m-sector
// ============================================================
const sectorGrid = document.getElementById("sectorGrid");
const sectorSub = document.getElementById("sectorSub");
const sectorLibreWrap = document.getElementById("sectorLibreWrap");
const sectorChipsSugeridos = document.getElementById("sectorChipsSugeridos");
const sectorInput = document.getElementById("sectorInput");

function renderSectores() {
  const esHZT = visita.tipo_establecimiento === "Hospital";
  sectorGrid.style.display = esHZT ? "grid" : "none";
  sectorLibreWrap.style.display = esHZT ? "none" : "block";

  if (esHZT) {
    sectorSub.textContent = "Elegí dónde interviniste";
    sectorGrid.innerHTML = "";
    SECTORES_HZT.forEach(sec => {
      const btn = document.createElement("button");
      btn.className = "tile";
      btn.style.minHeight = "84px";
      btn.innerHTML = `<div class="label">${sec}</div>`;
      if (visita.sector === sec) btn.classList.add("selected");
      btn.onclick = () => {
        visita.sector = sec;
        [...sectorGrid.children].forEach(c => c.classList.remove("selected"));
        btn.classList.add("selected");
        nextBtn.disabled = false;
        setTimeout(goNext, 180);
      };
      sectorGrid.appendChild(btn);
    });
  } else {
    sectorSub.textContent = "Cada CAP es distinto — tocá un sector frecuente o escribilo";
    sectorInput.value = visita.sector || "";
    sectorChipsSugeridos.innerHTML = "";
    SECTORES_DEPENDENCIAS.forEach(sec => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = sec;
      if (visita.sector === sec) chip.classList.add("active");
      chip.onclick = () => {
        [...sectorChipsSugeridos.children].forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        sectorInput.value = sec;
        visita.sector = sec;
        nextBtn.disabled = false;
        setTimeout(goNext, 180);
      };
      sectorChipsSugeridos.appendChild(chip);
    });
  }
}

sectorInput.addEventListener("input", () => {
  visita.sector = sectorInput.value.trim();
  nextBtn.disabled = !canAdvance("m-sector");
  [...sectorChipsSugeridos.children].forEach(c => c.classList.toggle("active", c.textContent === visita.sector));
});

// ============================================================
// MIPyV — m-plaga
// ============================================================
const plagaGrid = document.getElementById("plagaGrid");
function renderPlagas() {
plagaGrid.innerHTML = "";
PLAGAS.forEach(pl => {
  const btn = document.createElement("button");
  btn.className = "tile";
  btn.innerHTML = `${renderIcon(pl.icono)}<div class="label">${pl.nombre}</div>`;
  btn.onclick = () => {
    visita.id_plaga = pl.id; visita.tipo_plaga = pl.nombre;
    intervencion.id_plaga = pl.id; intervencion.tipo_plaga = pl.nombre;
    [...plagaGrid.children].forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
    nextBtn.disabled = false;
    setTimeout(goNext, 180);
  };
  plagaGrid.appendChild(btn);
});
}
renderPlagas();

// ============================================================
// MIPyV — m-producto
// ============================================================
const productoGrid = document.getElementById("productoGrid");
function renderProductos() {
productoGrid.innerHTML = "";
PRODUCTOS.forEach(pr => {
  const btn = document.createElement("button");
  btn.className = "tile";
  btn.innerHTML = `${renderIcon(pr.icono, null, pr.color)}<div class="label">${pr.nombre}</div>`;
  btn.onclick = () => {
    visita.id_producto = pr.id; visita.producto = pr.nombre;
    [...productoGrid.children].forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
    applyDosisFrecuencia();
    nextBtn.disabled = false;
    setTimeout(goNext, 180);
  };
  productoGrid.appendChild(btn);
});
}
renderProductos();

// Dosis según plaga + producto. Si el producto es "sin aplicación"
// (familia inspeccion en la hoja productos), no se busca dosis.
function dosisPara(idPlaga, idProducto) {
  const familias = FAMILIA_PRODUCTO[idProducto] || [];
  if (familias.includes("inspeccion")) return DOSIS_SIN_APLICACION;
  if (idPlaga) return DOSIS_FRECUENCIA[`${idPlaga}|${idProducto}`] || DOSIS_DEFAULT;
  // saneamiento: cualquier plaga que use este producto
  const combo = Object.keys(DOSIS_FRECUENCIA).find(k => k.endsWith("|" + idProducto));
  return combo ? DOSIS_FRECUENCIA[combo] : DOSIS_DEFAULT;
}

function applyDosisFrecuencia() {
  const d = dosisPara(visita.id_plaga, visita.id_producto);
  visita.dosis_aplicada = d.dosis;
  visita.frecuencia_recomendada = d.frecuencia;
  visita.puntos_criticos = d.puntos;
  document.getElementById("dosisTxt").textContent = d.dosis;
  document.getElementById("frecTxt").textContent = d.frecuencia;
  document.getElementById("puntosTxt").textContent = d.puntos;
}

// ============================================================
// MIPyV — m-seguridad (recomendaciones según producto)
// ============================================================
function renderSeguridad() {
  const familias = FAMILIA_PRODUCTO[visita.id_producto] || ["general"];
  const wrap = document.getElementById("seguridadCards");
  wrap.innerHTML = familias.map(key => {
    const f = RECOMENDACIONES_SEGURIDAD[key];
    if (!f) return "";
    return `<div class="seg-card"><h4>${f.titulo}</h4><ul>${f.items.map(i => `<li>${i}</li>`).join("")}</ul></div>`;
  }).join("");
}

// ============================================================
// MIPyV — m-epp / SANEAMIENTO — s-epp (con cantidad, ambos comparten lógica)
// ============================================================
const eppGrid = document.getElementById("eppGrid");
const sEppGrid = document.getElementById("sEppGrid");

// arma una grilla de EPP con stepper de cantidad; "getLista"/"setLista" leen y
// escriben el arreglo [{nombre, cantidad}] correspondiente (visita o avance)
function construirEppGrid(container, getLista, setLista) {
  container.innerHTML = "";
  const listaActual = getLista();
  EPP.forEach(item => {
    const existente = listaActual.find(x => x.nombre === item.nombre);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile epp-tile" + (existente ? " selected" : "");
    btn.innerHTML = `
      <div class="epp-check"></div>
      ${renderIcon(item.icono)}
      <div class="label">${item.nombre}</div>
      <div class="epp-qty">
        <button type="button" class="epp-menos">−</button>
        <span class="epp-cant">${existente ? existente.cantidad : 1}</span>
        <button type="button" class="epp-mas">+</button>
      </div>`;
    btn.addEventListener("click", (e) => {
      if (e.target.closest(".epp-qty")) return; // no togglear si tocó +/-
      btn.classList.toggle("selected");
      let lista = getLista();
      if (btn.classList.contains("selected")) {
        if (!lista.some(x => x.nombre === item.nombre)) lista = [...lista, { nombre: item.nombre, cantidad: 1 }];
      } else {
        lista = lista.filter(x => x.nombre !== item.nombre);
      }
      setLista(lista);
      nextBtn.disabled = !canAdvance(stepList[stepIndex]);
    });
    btn.querySelector(".epp-mas").addEventListener("click", (e) => {
      e.stopPropagation();
      cambiarCantidadEpp(item.nombre, 1, getLista, setLista, btn);
    });
    btn.querySelector(".epp-menos").addEventListener("click", (e) => {
      e.stopPropagation();
      cambiarCantidadEpp(item.nombre, -1, getLista, setLista, btn);
    });
    container.appendChild(btn);
  });
}

function cambiarCantidadEpp(nombre, delta, getLista, setLista, btn) {
  let lista = getLista();
  const idx = lista.findIndex(x => x.nombre === nombre);
  if (idx === -1) return;
  const nuevaCantidad = Math.max(1, lista[idx].cantidad + delta);
  lista = lista.map((x, i) => (i === idx ? { ...x, cantidad: nuevaCantidad } : x));
  setLista(lista);
  btn.querySelector(".epp-cant").textContent = nuevaCantidad;
}

function renderEppGrid() {
  construirEppGrid(eppGrid, () => visita.epp_utilizado, (lista) => { visita.epp_utilizado = lista; });
}
function renderSEppGrid() {
  construirEppGrid(sEppGrid, () => avance.epp_utilizado, (lista) => { avance.epp_utilizado = lista; });
}

// ============================================================
// MIPyV — m-resultado
// ============================================================
document.querySelectorAll('[data-resultado]').forEach(btn => {
  btn.onclick = () => {
    visita.resultado = btn.dataset.resultado;
    document.querySelectorAll('[data-resultado]').forEach(b => b.style.outline = "none");
    btn.style.outline = "4px solid #0D313F";
    nextBtn.disabled = false;
    setTimeout(goNext, 200);
  };
});

// ============================================================
// MIPyV — m-foto (hasta 5 fotos)
// ============================================================
const fotoGrid = document.getElementById("fotoGrid");
const photoInput = document.getElementById("photoInput");
function renderFotoGrid() {
  fotoGrid.innerHTML = "";
  fotosDataUrls.forEach((url, i) => {
    const box = document.createElement("div");
    box.className = "foto-slot filled";
    box.innerHTML = `<img src="${url}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button>`;
    fotoGrid.appendChild(box);
  });
  if (fotosDataUrls.length < 5) {
    const addBox = document.createElement("button");
    addBox.type = "button";
    addBox.className = "foto-slot add";
    addBox.innerHTML = `<span>+</span><small>${fotosDataUrls.length}/5</small>`;
    addBox.onclick = () => photoInput.click();
    fotoGrid.appendChild(addBox);
  }
  fotoGrid.querySelectorAll(".foto-remove").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      fotosDataUrls.splice(Number(btn.dataset.i), 1);
      renderFotoGrid();
    };
  });
}
photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  photoInput.value = "";
  if (!file) return;
  try {
    fotosDataUrls.push(await comprimirFoto(file));
    renderFotoGrid();
  } catch (err) {
    alert("No se pudo cargar la foto. Probá sacarla de nuevo.");
  }
});

// ============================================================
// COMPRESIÓN DE FOTOS — lado mayor 1280 px, JPEG calidad 0,7
// (una foto de 3-6 MB queda en unos 200 KB)
// ============================================================
const FOTO_LADO_MAX = 1280;
const FOTO_CALIDAD = 0.7;

function comprimirFoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(1, FOTO_LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * escala);
        const h = Math.round(img.naturalHeight * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; // fondo blanco por si la imagen trae transparencia
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", FOTO_CALIDAD));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen ilegible")); };
    img.src = url;
  });
}

// ============================================================
// MIPyV — m-obs (chips + notas de texto libre)
// ============================================================
const obsChips = document.getElementById("obsChips");
const notasOperador = document.getElementById("notasOperador");
let obsSeleccionadas = [];
OBSERVACIONES_CHIPS.forEach(txt => {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.textContent = txt;
  chip.onclick = () => {
    chip.classList.toggle("active");
    if (chip.classList.contains("active")) obsSeleccionadas.push(txt);
    else obsSeleccionadas = obsSeleccionadas.filter(x => x !== txt);
    actualizarObservaciones();
  };
  obsChips.appendChild(chip);
});
notasOperador.addEventListener("input", actualizarObservaciones);
function actualizarObservaciones() {
  const partes = [...obsSeleccionadas];
  if (notasOperador.value.trim()) partes.push(notasOperador.value.trim());
  visita.observaciones = partes.join(" · ");
}

// ============================================================
// MIPyV — m-confirm (resumen)
// ============================================================
function renderResumenMipyv() {
  guardarHorarios(visita);
  const rows = [
    ["Operario", visita.operario],
    ["Establecimiento", visita.establecimiento],
    ["Sector", visita.sector],
    ["Plaga", visita.tipo_plaga],
    ["Producto", visita.producto],
    ["Resultado", visita.resultado],
    ["Horario", (visita.hora_inicio || "—") + " a " + (visita.hora_fin || "—")],
  ];
  if (operarioAcompanante) rows.splice(1, 0, ["Trabajó junto con", operarioAcompanante]);
  if (visita.protocolo_existente) rows.splice(1, 0, ["Protocolo", visita.protocolo_existente + " (continuación)"]);
  document.getElementById("summaryList").innerHTML = rows.map(([k, v]) => `
    <div class="summary-card">
      ${renderIcon("generic", 34)}
      <div class="txt"><b>${k}</b><span>${v || "—"}</span></div>
    </div>`).join("");
}

// ============================================================
// SANEAMIENTO — s-tipo (nuevo / continuar)
// ============================================================
document.getElementById("sNuevoBtn").addEventListener("click", () => {
  trabajo.esNuevo = true;
  stepList = ["quien", "acompanante", "s-tipo", "s-cap-nuevo", "s-tareas", "s-epp", "s-detalle", "horario", "s-cierre", "s-confirm", "s-sent"];
  stepIndex = stepList.indexOf("s-cap-nuevo");
  showStep("s-cap-nuevo");
});
document.getElementById("sContinuarBtn").addEventListener("click", () => {
  trabajo.esNuevo = false;
  stepList = ["quien", "acompanante", "s-tipo", "s-cap-continuar", "s-tareas", "s-epp", "s-detalle", "horario", "s-cierre", "s-confirm", "s-sent"];
  stepIndex = stepList.indexOf("s-cap-continuar");
  showStep("s-cap-continuar");
});

// ============================================================
// SANEAMIENTO — s-cap-nuevo
// ============================================================
const capGridNuevo = document.getElementById("capGridNuevo");
function renderCapsNuevo() {
capGridNuevo.innerHTML = "";
CAPS_SANEAMIENTO.forEach(cap => {
  const btn = document.createElement("button");
  btn.className = "tile";
  btn.innerHTML = `${renderIcon("cap")}<div class="label">${cap.nombre}</div>`;
  btn.onclick = () => {
    trabajo.id_trabajo = "T-" + Date.now();
    trabajo.id_establecimiento = cap.id;
    trabajo.establecimiento = cap.nombre;
    trabajo.fecha_inicio = new Date().toISOString();
    trabajo.estado = "Abierto";
    [...capGridNuevo.children].forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
    nextBtn.disabled = false;
    setTimeout(goNext, 180);
  };
  capGridNuevo.appendChild(btn);
});
}
renderCapsNuevo();

// ============================================================
// SANEAMIENTO — s-cap-continuar
// ============================================================
const TRABAJOS_KEY = "mipyv_trabajos_abiertos_v1";
function getTrabajosAbiertos() { return JSON.parse(localStorage.getItem(TRABAJOS_KEY) || "[]"); }
function setTrabajosAbiertos(list) { localStorage.setItem(TRABAJOS_KEY, JSON.stringify(list)); }

async function trabajosParaMostrar() {
  const dePlanilla = leerCopia(TRABAJOS_PLANILLA_KEY);
  if (!dePlanilla) return getTrabajosAbiertos(); // nunca se descargó: lista propia del celular
  const lista = dePlanilla.map(t => ({ ...t }));
  (await colaSegura()).forEach(it => {
    const id = it.data && it.data.id_trabajo;
    if (it.tipo === "trabajo_nuevo" && !lista.some(t => t.id_trabajo === id)) {
      lista.push({ id_trabajo: id, id_establecimiento: it.data.id_establecimiento, establecimiento: it.data.establecimiento, fecha_inicio: it.data.fecha_inicio, estado: "Abierto" });
    }
    if (it.tipo === "cierre_trabajo") {
      const idx = lista.findIndex(t => t.id_trabajo === id);
      if (idx >= 0) lista.splice(idx, 1);
    }
  });
  return lista;
}

function renderTrabajosAbiertos() {
  pintarTrabajosAbiertos(); // muestra lo que ya hay en el celular, sin esperar
  actualizarCatalogosDesdePlanilla().finally(pintarTrabajosAbiertos);
}

async function pintarTrabajosAbiertos() {
  const list = await trabajosParaMostrar();
  const wrap = document.getElementById("trabajosAbiertosList");
  const msg = document.getElementById("sinTrabajosMsg");
  wrap.innerHTML = "";
  if (list.length === 0) { msg.style.display = "block"; return; }
  msg.style.display = "none";
  list.forEach(t => {
    const card = document.createElement("button");
    card.className = "job-card";
    const fecha = new Date(t.fecha_inicio).toLocaleDateString("es-AR");
    card.innerHTML = `<b>${t.establecimiento}</b><span>Iniciado ${fecha}</span>`;
    card.onclick = () => {
      trabajo = { ...t, esNuevo: false };
      [...wrap.children].forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      nextBtn.disabled = false;
      setTimeout(goNext, 180);
    };
    wrap.appendChild(card);
  });
}

// ============================================================
// SANEAMIENTO — s-producto / s-seguridad / s-dosis (biocida, opcional)
// ============================================================
const sProductoGrid = document.getElementById("sProductoGrid");
function renderSProductos() {
sProductoGrid.innerHTML = "";
PRODUCTOS.forEach(pr => {
  const btn = document.createElement("button");
  btn.className = "tile";
  btn.innerHTML = `${renderIcon(pr.icono, null, pr.color)}<div class="label">${pr.nombre}</div>`;
  btn.onclick = () => {
    avance.id_producto_biocida = pr.id; avance.producto_biocida = pr.nombre;
    [...sProductoGrid.children].forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
    applyDosisFrecuenciaSaneamiento();
    nextBtn.disabled = false;
    setTimeout(goNext, 180);
  };
  sProductoGrid.appendChild(btn);
});
}
renderSProductos();

function applyDosisFrecuenciaSaneamiento() {
  // usa la misma tabla de dosis, buscando cualquier plaga que use este producto
  const d = dosisPara(null, avance.id_producto_biocida);
  avance.dosis_biocida = d.dosis;
  avance.frecuencia_biocida = d.frecuencia;
  avance.puntos_criticos_biocida = d.puntos;
  document.getElementById("sDosisTxt").textContent = d.dosis;
  document.getElementById("sFrecTxt").textContent = d.frecuencia;
}

function renderSSeguridad() {
  const familias = FAMILIA_PRODUCTO[avance.id_producto_biocida] || ["general"];
  const wrap = document.getElementById("sSeguridadCards");
  wrap.innerHTML = familias.map(key => {
    const f = RECOMENDACIONES_SEGURIDAD[key];
    if (!f) return "";
    return `<div class="seg-card"><h4>${f.titulo}</h4><ul>${f.items.map(i => `<li>${i}</li>`).join("")}</ul></div>`;
  }).join("");
}

// ============================================================
// SANEAMIENTO — s-tareas
// ============================================================
const tareasGrid = document.getElementById("tareasGrid");
const NOMBRE_TAREA_INSECTICIDA = "Saneamiento con insecticida doméstico";
TAREAS_SANEAMIENTO.forEach(t => {
  const btn = document.createElement("button");
  btn.className = "tile multi";
  btn.innerHTML = `<div class="epp-check"></div>${renderIcon(t.icono)}<div class="label">${t.nombre}</div>`;
  btn.onclick = () => {
    btn.classList.toggle("selected");
    if (btn.classList.contains("selected")) avance.tareas.push(t.nombre);
    else avance.tareas = avance.tareas.filter(x => x !== t.nombre);
    actualizarPasosBiocidaSaneamiento();
    nextBtn.disabled = !canAdvance("s-tareas");
  };
  tareasGrid.appendChild(btn);
});

// Inserta o saca los pasos de producto/seguridad/dosis del biocida, según
// si se marcó la tarea de insecticida. Se llama cada vez que cambian las tareas.
function actualizarPasosBiocidaSaneamiento() {
  const pasosBiocida = ["s-producto", "s-seguridad", "s-dosis"];
  const yaEstan = pasosBiocida.every(p => stepList.includes(p));
  const necesitaBiocida = avance.tareas.includes(NOMBRE_TAREA_INSECTICIDA);
  const idxEpp = stepList.indexOf("s-epp");
  if (necesitaBiocida && !yaEstan) {
    stepList.splice(idxEpp, 0, ...pasosBiocida);
  } else if (!necesitaBiocida && yaEstan) {
    stepList = stepList.filter(p => !pasosBiocida.includes(p));
  }
}

// ============================================================
// SANEAMIENTO — s-detalle (chips + foto)
// ============================================================
const detalleChips = document.getElementById("detalleChips");
const detalleExtra = document.getElementById("detalleExtra");
let detalleSeleccionados = [];
DETALLE_CHIPS_SANEAMIENTO.forEach(txt => {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.textContent = CHIPS_CON_DETALLE[txt] ? txt + " ❓" : txt;
  chip.onclick = () => {
    chip.classList.toggle("active");
    if (chip.classList.contains("active")) detalleSeleccionados.push(txt);
    else {
      detalleSeleccionados = detalleSeleccionados.filter(x => x !== txt);
      delete detalleExtraTextos[txt];
    }
    actualizarDetalleTexto();
    renderDetalleExtra();
    nextBtn.disabled = !canAdvance("s-detalle");
  };
  detalleChips.appendChild(chip);
});

function renderDetalleExtra() {
  detalleExtra.innerHTML = "";
  detalleSeleccionados.filter(txt => CHIPS_CON_DETALLE[txt]).forEach(txt => {
    const box = document.createElement("div");
    box.className = "detalle-extra-box";
    box.innerHTML = `
      <div class="lbl-extra">${CHIPS_CON_DETALLE[txt]}</div>
      <textarea placeholder="Escribí acá...">${detalleExtraTextos[txt] || ""}</textarea>`;
    box.querySelector("textarea").addEventListener("input", (e) => {
      detalleExtraTextos[txt] = e.target.value;
      actualizarDetalleTexto();
      nextBtn.disabled = !canAdvance("s-detalle");
    });
    detalleExtra.appendChild(box);
  });
}

function actualizarDetalleTexto() {
  const partes = detalleSeleccionados.map(txt => {
    const extra = detalleExtraTextos[txt];
    return extra ? `${txt}: ${extra}` : txt;
  });
  avance.detalle = partes.join(" · ");
}

const sPhotoInput = document.getElementById("sPhotoInput");
const sFotoGrid = document.getElementById("sFotoGrid");
function renderSFotoGrid() {
  sFotoGrid.innerHTML = "";
  sFotosDataUrls.forEach((url, i) => {
    const box = document.createElement("div");
    box.className = "foto-slot filled";
    box.innerHTML = `<img src="${url}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button>`;
    sFotoGrid.appendChild(box);
  });
  if (sFotosDataUrls.length < 5) {
    const addBox = document.createElement("button");
    addBox.type = "button";
    addBox.className = "foto-slot add";
    addBox.innerHTML = `<span>+</span><small>${sFotosDataUrls.length}/5</small>`;
    addBox.onclick = () => sPhotoInput.click();
    sFotoGrid.appendChild(addBox);
  }
  sFotoGrid.querySelectorAll(".foto-remove").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      sFotosDataUrls.splice(Number(btn.dataset.i), 1);
      renderSFotoGrid();
    };
  });
}
sPhotoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  sPhotoInput.value = "";
  if (!file) return;
  try {
    sFotosDataUrls.push(await comprimirFoto(file));
    renderSFotoGrid();
  } catch (err) {
    alert("No se pudo cargar la foto. Probá sacarla de nuevo.");
  }
});

const notasSaneamiento = document.getElementById("notasSaneamiento");
notasSaneamiento.addEventListener("input", () => {
  avance.notas = notasSaneamiento.value.trim();
});

// ============================================================
// SANEAMIENTO — s-cierre
// ============================================================
document.querySelectorAll('[data-cierre]').forEach(btn => {
  btn.onclick = () => {
    avance.cierre = btn.dataset.cierre;
    document.querySelectorAll('[data-cierre]').forEach(b => b.style.outline = "none");
    btn.style.outline = "4px solid #2E5233";
    nextBtn.disabled = false;
    setTimeout(goNext, 200);
  };
});

// ============================================================
// SANEAMIENTO — s-confirm
// ============================================================
function renderResumenSaneamiento() {
  guardarHorarios(avance);
  const rows = [
    ["Operario", currentOperario ? currentOperario.nombre : "—"],
    ["CAP", trabajo.establecimiento],
    ["Tareas de hoy", avance.tareas.join(", ") || "—"],
    ["Horario", (avance.hora_inicio || "—") + " a " + (avance.hora_fin || "—")],
    ["Cierre", avance.cierre === "terminado" ? "Trabajo terminado" : "Continúa otro día"],
  ];
  if (operarioAcompanante) rows.splice(1, 0, ["Trabajó junto con", operarioAcompanante]);
  document.getElementById("sSummaryList").innerHTML = rows.map(([k, v]) => `
    <div class="summary-card">
      ${renderIcon("generic", 34)}
      <div class="txt"><b>${k}</b><span>${v || "—"}</span></div>
    </div>`).join("");
}

// ============================================================
// COLA OFFLINE + ENVÍO — MIPyV
// ============================================================
// La cola vive en IndexedDB (mucho más espacio que localStorage, que se
// llenaba con una sola foto). Cada registro queda guardado hasta que el
// servidor responde ok: true.
const QUEUE_KEY = "mipyv_queue_v1"; // cola vieja en localStorage (se migra sola)
const COLA_DB = "mipyv_db";
const COLA_STORE = "cola";

function abrirColaDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("sin IndexedDB")); return; }
    const req = indexedDB.open(COLA_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(COLA_STORE)) {
        db.createObjectStore(COLA_STORE, { keyPath: "qid", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function colaTx(modo, accion) {
  const db = await abrirColaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COLA_STORE, modo);
    const store = tx.objectStore(COLA_STORE);
    let resultado;
    accion(store, (r) => { resultado = r; });
    tx.oncomplete = () => { db.close(); resolve(resultado); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

// Agrega uno o varios registros al final de la cola, en orden.
async function colaAgregar(items) {
  await colaTx("readwrite", (store) => {
    items.forEach(it => store.add({ ...it, intentos: 0, ultimo_error: "", agregado: new Date().toISOString() }));
  });
  updateQueueBadge();
}
function colaListar() {
  return colaTx("readonly", (store, set) => {
    const req = store.getAll();
    req.onsuccess = () => set(req.result || []);
  });
}
function colaBorrar(qid) {
  return colaTx("readwrite", (store) => { store.delete(qid); });
}
function colaActualizar(item) {
  return colaTx("readwrite", (store) => { store.put(item); });
}
async function colaContar() {
  try {
    return await colaTx("readonly", (store, set) => {
      const req = store.count();
      req.onsuccess = () => set(req.result);
    });
  } catch (err) { return 0; }
}

// Pasa a IndexedDB lo que haya quedado en la cola vieja de localStorage.
async function migrarColaVieja() {
  let vieja = [];
  try { vieja = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (err) { vieja = []; }
  if (!vieja.length) return;
  await colaAgregar(vieja);
  localStorage.removeItem(QUEUE_KEY);
}

async function guardarEnCola(items) {
  try {
    await colaAgregar(items);
    return true;
  } catch (err) {
    alert("No se pudo guardar el registro en el celular. No cierres la app y avisale a Belén.");
    return false;
  }
}

async function sendVisita() {
  guardarHorarios(visita);
  const eppTexto = visita.epp_utilizado.map(x => `${x.nombre} x${x.cantidad}`).join(", ");
  const record = { ...visita, epp_utilizado: eppTexto, fotos_base64: fotosDataUrls, operario_acompanante: operarioAcompanante };
  nextBtn.disabled = true;
  const guardado = await guardarEnCola([{ tipo: "visita", data: record }]);
  nextBtn.disabled = false;
  if (!guardado) return;

  // actualizar cache local de intervenciones abiertas
  let abiertas = getIntervencionesAbiertas();
  if (visita.resultado === "Resuelto" || visita.resultado === "No se pudo acceder al sector") {
    if (visita.protocolo_existente) {
      abiertas = abiertas.filter(iv => iv.protocolo !== visita.protocolo_existente);
    }
  } else if (visita.resultado === "Requiere otra visita") {
    const protocoloClave = visita.protocolo_existente || "PENDIENTE-" + visita.id_visita;
    const existente = abiertas.findIndex(iv => iv.protocolo === protocoloClave);
    const registro = {
      protocolo: protocoloClave,
      id_establecimiento: visita.id_establecimiento,
      establecimiento: visita.establecimiento,
      tipo_establecimiento: visita.tipo_establecimiento,
      id_plaga: visita.id_plaga,
      tipo_plaga: visita.tipo_plaga,
      sector: visita.sector,
    };
    if (existente >= 0) abiertas[existente] = registro; else abiertas.push(registro);
  }
  setIntervencionesAbiertas(abiertas);

  document.getElementById("sentSub").textContent = navigator.onLine
    ? "Visita registrada — sincronizando…"
    : "Visita guardada en el celular — se enviará cuando haya señal";
  stepIndex = stepList.length - 1;
  showStep("m-sent");
  trySync();
}

document.getElementById("newVisitBtn").addEventListener("click", () => {
  resetVisita();
  renderFotoGrid();
  obsSeleccionadas = [];
  notasOperador.value = "";
  horaInicioEl.value = ""; horaFinEl.value = "";
  horaInicioAcompEl.value = ""; horaFinAcompEl.value = "";
  [...obsChips.children].forEach(c => c.classList.remove("active"));
  [...establecimientoGrid.children].forEach(c => c.classList.remove("selected"));
  document.querySelectorAll('[data-resultado]').forEach(b => b.style.outline = "none");
  enterModule("mipyv");
});

// ============================================================
// COLA OFFLINE + ENVÍO — SANEAMIENTO
// ============================================================
async function sendAvance() {
  guardarHorarios(avance);
  const eppTexto = avance.epp_utilizado.map(x => `${x.nombre} x${x.cantidad}`).join(", ");
  const record = {
    id_avance: "A-" + Date.now(),
    id_trabajo: trabajo.id_trabajo,
    fecha: new Date().toISOString(),
    id_operario: currentOperario.id,
    operario: currentOperario.nombre,
    id_establecimiento: trabajo.id_establecimiento,
    establecimiento: trabajo.establecimiento,
    tareas: avance.tareas,
    detalle: avance.detalle,
    notas: avance.notas || "",
    epp_utilizado: eppTexto,
    producto_biocida: avance.producto_biocida || "",
    dosis_biocida: avance.dosis_biocida || "",
    frecuencia_biocida: avance.frecuencia_biocida || "",
    fotos_base64: sFotosDataUrls,
    cierre: avance.cierre,
    operario_acompanante: operarioAcompanante,
    hora_inicio: avance.hora_inicio,
    hora_fin: avance.hora_fin,
    hora_inicio_acompanante: avance.hora_inicio_acompanante,
    hora_fin_acompanante: avance.hora_fin_acompanante,
  };

  const q = [];
  if (trabajo.esNuevo) {
    const { esNuevo, ...datosTrabajo } = trabajo;
    q.push({ tipo: "trabajo_nuevo", data: { ...datosTrabajo, operario_inicio: currentOperario.nombre } });
  }
  q.push({ tipo: "avance", data: record });
  if (avance.cierre === "terminado") {
    q.push({ tipo: "cierre_trabajo", data: { id_trabajo: trabajo.id_trabajo, fecha_fin: new Date().toISOString() } });
  }

  nextBtn.disabled = true;
  const guardado = await guardarEnCola(q);
  nextBtn.disabled = false;
  if (!guardado) return;

  let abiertos = getTrabajosAbiertos();
  if (avance.cierre === "terminado") {
    abiertos = abiertos.filter(t => t.id_trabajo !== trabajo.id_trabajo);
  } else {
    const idx = abiertos.findIndex(t => t.id_trabajo === trabajo.id_trabajo);
    const trabajoParaCache = { id_trabajo: trabajo.id_trabajo, id_establecimiento: trabajo.id_establecimiento, establecimiento: trabajo.establecimiento, fecha_inicio: trabajo.fecha_inicio, estado: "Abierto" };
    if (idx >= 0) abiertos[idx] = trabajoParaCache; else abiertos.push(trabajoParaCache);
  }
  setTrabajosAbiertos(abiertos);

  document.getElementById("sSentSub").textContent = navigator.onLine
    ? "Avance registrado — sincronizando…"
    : "Avance guardado en el celular — se enviará cuando haya señal";
  stepIndex = stepList.length - 1;
  showStep("s-sent");
  trySync();
}

document.getElementById("sNewBtn").addEventListener("click", () => {
  resetSaneamiento();
  renderSFotoGrid();
  notasSaneamiento.value = "";
  horaInicioEl.value = ""; horaFinEl.value = "";
  horaInicioAcompEl.value = ""; horaFinAcompEl.value = "";
  detalleSeleccionados = [];
  detalleExtra.innerHTML = "";
  [...detalleChips.children].forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".tile.multi").forEach(c => c.classList.remove("selected"));
  [...sProductoGrid.children].forEach(c => c.classList.remove("selected"));
  document.querySelectorAll('[data-cierre]').forEach(b => b.style.outline = "none");
  [...capGridNuevo.children].forEach(c => c.classList.remove("selected"));
  enterModule("saneamiento");
});


// ============================================================
// OTRAS TAREAS DE HIGIENE Y SEGURIDAD (hoja tareas_hys)
// Pasos: tipo de tarea → lugares (uno o varios) → [extintores, solo en
// "Control de extintores"] → qué hiciste + fotos → hallazgos y
// observaciones → horario → confirmar. No pide plaga ni producto.
// ============================================================
let tareaHys = {};
let hFotosDataUrls = []; // hasta 5

function resetTareaHys() {
  tareaHys = { tipo_tarea: null, lugares: [], extintores: {}, detalle: "", hallazgos: "", observaciones: "" };
  hFotosDataUrls = [];
}
resetTareaHys();

const esTareaExtintores = (tipo) => /extintor|matafuego/i.test(tipo || "");
const esTareaOtra = (tipo) => /^otra\b/i.test(String(tipo || "").trim());
function emojiTarea(nombre) {
  const n = String(nombre || "").toLowerCase();
  const par = EMOJI_TAREA_HYS.find(([clave]) => n.includes(clave));
  return par ? par[1] : "📋";
}

// --- h-tipo
const tipoTareaGrid = document.getElementById("tipoTareaGrid");
function renderTiposTarea() {
  tipoTareaGrid.innerHTML = "";
  TIPOS_TAREA_HYS.forEach(nombre => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile" + (tareaHys.tipo_tarea === nombre ? " selected" : "");
    btn.innerHTML = `<div class="emoji">${emojiTarea(nombre)}</div><div class="label">${nombre}</div>`;
    btn.onclick = () => {
      tareaHys.tipo_tarea = nombre;
      armarPasosHys();
      [...tipoTareaGrid.children].forEach(c => c.classList.remove("selected"));
      btn.classList.add("selected");
      nextBtn.disabled = false;
      setTimeout(goNext, 180);
    };
    tipoTareaGrid.appendChild(btn);
  });
}
renderTiposTarea();

function armarPasosHys() {
  stepList = ["quien", "acompanante", "h-tipo", "h-lugares"];
  if (esTareaExtintores(tareaHys.tipo_tarea)) stepList.push("h-extintores");
  stepList.push("h-detalle", "h-hallazgos", "horario", "h-confirm", "h-sent");
  stepIndex = stepList.indexOf("h-tipo");
}

// --- h-lugares (varios a la vez)
const hTipoChips = document.getElementById("hTipoChips");
const hLugarGrid = document.getElementById("hLugarGrid");
const hLugaresCuenta = document.getElementById("hLugaresCuenta");
let hTipoFiltro = "Todos";
TIPOS.forEach(t => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip" + (t === "Todos" ? " active" : "");
  chip.textContent = t === "CAP" ? "CAPS" : t;
  chip.onclick = () => {
    hTipoFiltro = t;
    [...hTipoChips.children].forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    renderLugaresHys();
  };
  hTipoChips.appendChild(chip);
});

// Al empezar una tarea nueva: filtro de lugares en "Todos" y nada marcado.
function reiniciarPantallasHys() {
  hTipoFiltro = "Todos";
  [...hTipoChips.children].forEach((c, i) => c.classList.toggle("active", i === 0));
  renderTiposTarea();
}

function renderLugaresHys() {
  hLugarGrid.innerHTML = "";
  const iconFor = { Hospital: "hospital", Dependencia: "building", CAP: "cap" };
  ESTABLECIMIENTOS.filter(e => hTipoFiltro === "Todos" || e.tipo === hTipoFiltro).forEach(est => {
    const btn = document.createElement("button");
    btn.type = "button";
    const marcado = tareaHys.lugares.some(l => l.id === est.id);
    btn.className = "tile multi" + (marcado ? " selected" : "");
    btn.innerHTML = `<div class="epp-check"></div>${renderIcon(iconFor[est.tipo])}<div class="label">${est.nombre}</div>`;
    btn.onclick = () => {
      if (tareaHys.lugares.some(l => l.id === est.id)) {
        tareaHys.lugares = tareaHys.lugares.filter(l => l.id !== est.id);
        btn.classList.remove("selected");
      } else {
        tareaHys.lugares.push({ id: est.id, nombre: est.nombre, tipo: est.tipo });
        btn.classList.add("selected");
      }
      // mismo orden que la lista de establecimientos
      const orden = ESTABLECIMIENTOS.map(e => e.id);
      tareaHys.lugares.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
      actualizarCuentaLugares();
      nextBtn.disabled = !canAdvance("h-lugares");
    };
    hLugarGrid.appendChild(btn);
  });
  actualizarCuentaLugares();
}
function actualizarCuentaLugares() {
  const n = tareaHys.lugares.length;
  hLugaresCuenta.textContent = n === 0 ? "" : n === 1 ? "Elegiste 1 lugar: " + tareaHys.lugares[0].nombre
    : `Elegiste ${n} lugares: ` + tareaHys.lugares.map(l => l.nombre).join(", ");
}

// --- h-extintores (una tarjeta por lugar)
const extintoresList = document.getElementById("extintoresList");
const PREGUNTAS_EXTINTOR = [
  ["chapa", "¿Tiene chapa baliza?"],
  ["colgado", "¿Está colgado en su lugar?"],
  ["accesible", "¿Se puede agarrar fácil? (nada adelante)"],
];
function extintorVacio() { return { chapa: null, colgado: null, accesible: null, vencimiento: "", sinFecha: false }; }
function extintorCompleto(x) {
  return !!x && x.chapa !== null && x.colgado !== null && x.accesible !== null && (x.sinFecha || !!x.vencimiento);
}
function mesTexto(v) { // "2027-03" → "03/2027"
  const m = String(v || "").match(/^(\d{4})-(\d{2})$/);
  return m ? m[2] + "/" + m[1] : "";
}

function renderExtintores() {
  // conservar lo ya contestado y sumar los lugares nuevos
  const nuevos = {};
  tareaHys.lugares.forEach(l => { nuevos[l.id] = tareaHys.extintores[l.id] || extintorVacio(); });
  tareaHys.extintores = nuevos;
  extintoresList.innerHTML = "";
  tareaHys.lugares.forEach(l => {
    const x = tareaHys.extintores[l.id];
    const card = document.createElement("div");
    card.className = "ext-card" + (extintorCompleto(x) ? " completo" : "");
    let html = `<h4>🧯 ${l.nombre}</h4>`;
    PREGUNTAS_EXTINTOR.forEach(([campo, pregunta]) => {
      html += `<div class="ext-preg">${pregunta}</div>
        <div class="sino" data-campo="${campo}">
          <button type="button" class="si${x[campo] === true ? " on" : ""}" data-valor="si">Sí</button>
          <button type="button" class="no${x[campo] === false ? " on" : ""}" data-valor="no">No</button>
        </div>`;
    });
    html += `<div class="ext-preg">Vencimiento de la carga (mes y año)</div>
      <input type="month" value="${x.vencimiento || ""}" ${x.sinFecha ? "disabled" : ""}>
      <button type="button" class="chip ext-sinfecha${x.sinFecha ? " active" : ""}">No se puede leer</button>`;
    card.innerHTML = html;
    card.querySelectorAll(".sino").forEach(grupo => {
      grupo.querySelectorAll("button").forEach(b => {
        b.onclick = () => {
          x[grupo.dataset.campo] = b.dataset.valor === "si";
          grupo.querySelectorAll("button").forEach(o => o.classList.remove("on"));
          b.classList.add("on");
          refrescarTarjeta();
        };
      });
    });
    const inputMes = card.querySelector('input[type=month]');
    inputMes.addEventListener("input", () => { x.vencimiento = inputMes.value; refrescarTarjeta(); });
    const btnSinFecha = card.querySelector(".ext-sinfecha");
    btnSinFecha.onclick = () => {
      x.sinFecha = !x.sinFecha;
      btnSinFecha.classList.toggle("active", x.sinFecha);
      inputMes.disabled = x.sinFecha;
      if (x.sinFecha) { x.vencimiento = ""; inputMes.value = ""; }
      refrescarTarjeta();
    };
    function refrescarTarjeta() {
      card.classList.toggle("completo", extintorCompleto(x));
      nextBtn.disabled = !canAdvance("h-extintores");
    }
    extintoresList.appendChild(card);
  });
}

// Texto del control de extintores: una línea por lugar (va a "detalle")
// y lo que está mal (va a "hallazgos").
function textoExtintores() {
  const sn = (v) => v === true ? "Sí" : v === false ? "No" : "s/d";
  const hoy = new Date();
  const mesActual = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
  const lineas = [], problemas = [];
  tareaHys.lugares.forEach(l => {
    const x = tareaHys.extintores[l.id] || extintorVacio();
    const venc = x.sinFecha ? "no se puede leer" : (mesTexto(x.vencimiento) || "s/d");
    lineas.push(`${l.nombre}: chapa baliza ${sn(x.chapa)} · colgado ${sn(x.colgado)} · accesible ${sn(x.accesible)} · vencimiento de la carga ${venc}`);
    const mal = [];
    if (x.chapa === false) mal.push("sin chapa baliza");
    if (x.colgado === false) mal.push("no está colgado");
    if (x.accesible === false) mal.push("no está accesible");
    if (x.sinFecha) mal.push("no se puede leer el vencimiento de la carga");
    else if (x.vencimiento && x.vencimiento < mesActual) mal.push("carga vencida (" + mesTexto(x.vencimiento) + ")");
    else if (x.vencimiento && x.vencimiento === mesActual) mal.push("la carga vence este mes (" + mesTexto(x.vencimiento) + ")");
    if (mal.length) problemas.push(`${l.nombre}: ${mal.join("; ")}`);
  });
  return { lineas, problemas };
}

// --- h-detalle (qué hiciste + fotos)
const hDetalle = document.getElementById("hDetalle");
const hDetalleSub = document.getElementById("hDetalleSub");
const hDetalleAviso = document.getElementById("hDetalleAviso");
// En control de extintores lo escrito es opcional (ya está todo contestado).
// En las demás tareas hay que escribir qué se hizo.
function detalleObligatorioHys() { return !esTareaExtintores(tareaHys.tipo_tarea); }
function validarDetalleHys() {
  const ok = !detalleObligatorioHys() || tareaHys.detalle.trim().length > 0;
  hDetalleAviso.style.display = ok || !hDetalle.dataset.tocado ? "none" : "block";
  return ok;
}
function prepararDetalleHys() {
  hDetalle.value = tareaHys.detalle;
  delete hDetalle.dataset.tocado;
  hDetalleAviso.style.display = "none";
  if (esTareaExtintores(tareaHys.tipo_tarea)) {
    hDetalleSub.textContent = "Opcional — si querés contar algo más, escribilo acá";
    hDetalle.placeholder = "Ej.: se cambió de lugar un extintor, se avisó a mantenimiento...";
  } else if (esTareaOtra(tareaHys.tipo_tarea)) {
    hDetalleSub.textContent = "Obligatorio — escribí qué tarea hiciste";
    hDetalle.placeholder = "Ej.: se armó el sector para la capacitación...";
  } else {
    hDetalleSub.textContent = "Obligatorio — contalo con tus palabras";
    hDetalle.placeholder = "Escribí acá qué hiciste...";
  }
  renderHFotoGrid();
  nextBtn.disabled = !canAdvance("h-detalle");
}
hDetalle.addEventListener("input", () => {
  tareaHys.detalle = hDetalle.value;
  hDetalle.dataset.tocado = "1";
  nextBtn.disabled = !canAdvance("h-detalle");
});

const hFotoGrid = document.getElementById("hFotoGrid");
const hPhotoInput = document.getElementById("hPhotoInput");
function renderHFotoGrid() {
  hFotoGrid.innerHTML = "";
  hFotosDataUrls.forEach((url, i) => {
    const box = document.createElement("div");
    box.className = "foto-slot filled";
    box.innerHTML = `<img src="${url}" alt="foto ${i + 1}"><button type="button" class="foto-remove" data-i="${i}">×</button>`;
    hFotoGrid.appendChild(box);
  });
  if (hFotosDataUrls.length < 5) {
    const addBox = document.createElement("button");
    addBox.type = "button";
    addBox.className = "foto-slot add";
    addBox.innerHTML = `<span>+</span><small>${hFotosDataUrls.length}/5</small>`;
    addBox.onclick = () => hPhotoInput.click();
    hFotoGrid.appendChild(addBox);
  }
  hFotoGrid.querySelectorAll(".foto-remove").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      hFotosDataUrls.splice(Number(btn.dataset.i), 1);
      renderHFotoGrid();
    };
  });
}
hPhotoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  hPhotoInput.value = "";
  if (!file) return;
  try {
    hFotosDataUrls.push(await comprimirFoto(file));
    renderHFotoGrid();
  } catch (err) {
    alert("No se pudo cargar la foto. Probá sacarla de nuevo.");
  }
});

// --- h-hallazgos (problemas + observaciones, los dos opcionales)
const hHallazgos = document.getElementById("hHallazgos");
const hObservaciones = document.getElementById("hObservaciones");
const hAutoHallazgos = document.getElementById("hAutoHallazgos");
function prepararHallazgosHys() {
  hHallazgos.value = tareaHys.hallazgos;
  hObservaciones.value = tareaHys.observaciones;
  const auto = esTareaExtintores(tareaHys.tipo_tarea) ? textoExtintores().problemas : [];
  hAutoHallazgos.style.display = auto.length ? "block" : "none";
  hAutoHallazgos.textContent = auto.length ? "Ya quedó anotado:\n" + auto.join("\n") : "";
}
hHallazgos.addEventListener("input", () => { tareaHys.hallazgos = hHallazgos.value; });
hObservaciones.addEventListener("input", () => { tareaHys.observaciones = hObservaciones.value; });

// Arma el registro tal como va a la hoja tareas_hys.
function registroTareaHys() {
  const ext = esTareaExtintores(tareaHys.tipo_tarea) ? textoExtintores() : { lineas: [], problemas: [] };
  const detalle = ext.lineas.concat(tareaHys.detalle.trim() ? [tareaHys.detalle.trim()] : []).join("\n");
  const hallazgos = ext.problemas.concat(tareaHys.hallazgos.trim() ? [tareaHys.hallazgos.trim()] : []).join("\n");
  return {
    id_tarea: tareaHys.id_tarea || ("H-" + Date.now()),
    fecha: new Date().toISOString(),
    id_operario: currentOperario ? currentOperario.id : "",
    operario: currentOperario ? currentOperario.nombre : "",
    operario_acompanante: operarioAcompanante || "",
    hora_inicio: horaInicioEl.value || "",
    hora_fin: horaFinEl.value || "",
    id_establecimiento: tareaHys.lugares.map(l => l.id).join(" | "),
    establecimiento: tareaHys.lugares.map(l => l.nombre).join(" | "),
    tipo_tarea: tareaHys.tipo_tarea,
    detalle,
    hallazgos,
    observaciones: tareaHys.observaciones.trim(),
    fotos_base64: hFotosDataUrls,
  };
}

// --- h-confirm
function renderResumenHys() {
  const r = registroTareaHys();
  const rows = [
    ["Operario", r.operario],
    ["Tarea", r.tipo_tarea],
    ["Lugares", tareaHys.lugares.map(l => l.nombre).join(", ")],
    ["Qué hiciste", r.detalle || "—"],
    ["Problemas", r.hallazgos || "Ninguno"],
    ["Fotos", hFotosDataUrls.length ? hFotosDataUrls.length + " foto(s)" : "Sin fotos"],
    ["Horario", (r.hora_inicio || "—") + " a " + (r.hora_fin || "—")],
  ];
  if (operarioAcompanante) rows.splice(1, 0, ["Trabajó junto con", operarioAcompanante]);
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  document.getElementById("hSummaryList").innerHTML = rows.map(([k, v]) => `
    <div class="summary-card">
      ${renderIcon("generic", 34)}
      <div class="txt"><b>${k}</b><span>${esc(v || "—")}</span></div>
    </div>`).join("");
}

// --- envío
async function sendTareaHys() {
  const record = registroTareaHys();
  nextBtn.disabled = true;
  const guardado = await guardarEnCola([{ tipo: "tarea_hys", data: record }]);
  nextBtn.disabled = false;
  if (!guardado) return;
  document.getElementById("hSentSub").textContent = navigator.onLine
    ? "Tarea registrada — sincronizando…"
    : "Tarea guardada en el celular — se enviará cuando haya señal";
  stepIndex = stepList.length - 1;
  showStep("h-sent");
  trySync();
}

document.getElementById("hNewBtn").addEventListener("click", () => {
  resetTareaHys();
  hDetalle.value = ""; hHallazgos.value = ""; hObservaciones.value = "";
  horaInicioEl.value = ""; horaFinEl.value = "";
  horaInicioAcompEl.value = ""; horaFinAcompEl.value = "";
  renderTiposTarea();
  enterModule("hys");
});

// ============================================================
// SINCRONIZACIÓN
// ============================================================
async function updateQueueBadge() {
  const n = await colaContar();
  const badge = document.getElementById("queueBadge");
  if (n > 0) { badge.textContent = n + " sin enviar"; badge.classList.add("show"); }
  else { badge.classList.remove("show"); }
}

// Envía un registro y devuelve la respuesta del servidor ({ ok, error }).
// Si no hay red o el servidor no contesta, lanza un error.
async function enviarRegistro(item) {
  const { qid, intentos, ultimo_error, agregado, ...paraEnviar } = item;
  const ctrl = new AbortController();
  const corte = setTimeout(() => ctrl.abort(), 90000); // 90 s máximo por registro
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(paraEnviar),
      signal: ctrl.signal,
    });
    const texto = await res.text();
    try { return JSON.parse(texto); }
    catch (err) { return { ok: false, error: "Respuesta no válida del servidor" }; }
  } finally {
    clearTimeout(corte);
  }
}

let sincronizando = false;
// manual = true cuando el operario toca "Sincronizar" (muestra aviso aunque no haya nada)
async function trySync(manual) {
  if (sincronizando) return;
  if (!navigator.onLine) { await updateQueueBadge(); return; }
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PEGAR_ACA")) return;

  let cola;
  try { cola = await colaListar(); } catch (err) { return; }
  if (cola.length === 0) { if (manual) showSyncFeedback("Ya está todo sincronizado"); return; }

  sincronizando = true;
  const syncBtn = document.getElementById("syncBtn");
  const originalLabel = syncBtn.textContent;
  syncBtn.textContent = "Enviando…";

  let enviados = 0;
  let sinRed = false;
  // Si falla algo de un trabajo de saneamiento, lo que sigue de ese mismo
  // trabajo espera (para que el cierre no llegue antes que el inicio).
  const trabajosTrabados = new Set();

  for (const item of cola) {
    const idTrabajo = item.data && item.data.id_trabajo;
    if (idTrabajo && trabajosTrabados.has(idTrabajo)) continue;
    try {
      const resp = await enviarRegistro(item);
      if (resp && resp.ok === true) {
        await colaBorrar(item.qid);
        enviados++;
      } else {
        item.intentos = (item.intentos || 0) + 1;
        item.ultimo_error = (resp && resp.error) || "Error desconocido";
        await colaActualizar(item);
        if (idTrabajo) trabajosTrabados.add(idTrabajo);
      }
    } catch (err) {
      // sin señal real o el servidor no contestó: se corta y se reintenta después
      console.warn("Sin conexión o sin respuesta del servidor; se reintenta después.", err);
      sinRed = true;
      break;
    }
    await updateQueueBadge();
  }

  syncBtn.textContent = originalLabel;
  sincronizando = false;
  const quedan = await colaContar();
  if (enviados > 0) actualizarCatalogosDesdePlanilla(); // refrescar listas abiertas
  if (quedan === 0) showSyncFeedback(`Listo — se enviaron ${enviados} registro(s)`);
  else if (sinRed) showSyncFeedback(`Sin señal — quedan ${quedan} pendientes, se reintenta solo`);
  else showSyncFeedback(`Quedan ${quedan} pendientes — se reintenta más tarde`);
}

function showSyncFeedback(msg) {
  const badge = document.getElementById("queueBadge");
  badge.textContent = msg;
  badge.classList.add("show");
  setTimeout(() => { updateQueueBadge(); }, 2500);
}

document.getElementById("syncBtn").addEventListener("click", () => trySync(true));
window.addEventListener("online", () => { setNetDot(true); trySync(); });
window.addEventListener("offline", () => setNetDot(false));

function setNetDot(online) {
  document.getElementById("netDot").classList.toggle("offline", !online);
}

// ============================================================
// AYUDA — botón "?" con explicación simple de la pantalla actual
// ============================================================
async function showHelp() {
  const pasoActual = currentModule ? stepList[stepIndex] : "home";
  const texto = AYUDA_TEXTOS[pasoActual] || "Tocá las imágenes grandes para avanzar. Si tenés dudas, preguntale a Belén.";
  const helpText = document.getElementById("helpText");
  helpText.textContent = texto;
  // pie de la ayuda: versión y, en el inicio, el estado de lo pendiente
  const pie = document.createElement("div");
  pie.style.cssText = "margin-top:14px; font-size:.8rem; opacity:.7;";
  let detalle = "Versión " + APP_VERSION;
  if (pasoActual === "home") {
    try {
      const cola = await colaListar();
      if (cola.length) {
        detalle += ` · ${cola.length} registro(s) sin enviar`;
        const conError = cola.find(it => it.ultimo_error);
        if (conError) detalle += ` · último aviso de la planilla: ${conError.ultimo_error}`;
      } else {
        detalle += " · todo enviado";
      }
    } catch (err) { /* sin datos de la cola */ }
  }
  detalle += " · Si algo no anda, avisale a Belén.";
  pie.textContent = detalle;
  helpText.appendChild(pie);
  document.getElementById("helpOverlay").classList.add("show");
}
function hideHelp() {
  document.getElementById("helpOverlay").classList.remove("show");
}
document.getElementById("helpBtn").addEventListener("click", showHelp);
document.getElementById("helpCloseBtn").addEventListener("click", hideHelp);
document.getElementById("helpOverlay").addEventListener("click", (e) => {
  if (e.target.id === "helpOverlay") hideHelp();
});

// ============================================================
// CATÁLOGOS DESDE LA PLANILLA
// Al abrir con señal, la app descarga de la planilla las listas
// (operarios, establecimientos, sectores, plagas, productos, dosis) y
// guarda una copia en el celular. Sin señal usa esa copia; si nunca pudo
// descargar, usa las listas de respaldo de data.js.
// ============================================================
const CATALOGOS_KEY = "mipyv_catalogos_v1";

const esSi = (v) => String(v || "").trim().toUpperCase().startsWith("SI");
const texto = (v) => String(v === undefined || v === null ? "" : v).trim();

function reemplazarLista(lista, nuevos) {
  if (!Array.isArray(nuevos) || nuevos.length === 0) return false; // nunca vaciar una lista
  lista.length = 0;
  nuevos.forEach(x => lista.push(x));
  return true;
}
function reemplazarObjeto(obj, nuevo) {
  if (!nuevo || Object.keys(nuevo).length === 0) return false;
  Object.keys(obj).forEach(k => delete obj[k]);
  Object.assign(obj, nuevo);
  return true;
}

// Convierte lo que devuelve la planilla al formato que usa la app.
function convertirCatalogos(d) {
  const out = {};
  if (Array.isArray(d.operarios)) {
    out.operarios = d.operarios
      .filter(r => texto(r.id_operario) && esSi(r.activo))
      .map(r => ({ id: texto(r.id_operario), nombre: texto(r.nombre), inicial: texto(r.inicial) || texto(r.nombre).charAt(0) }));
  }
  if (Array.isArray(d.establecimientos)) {
    out.establecimientos = d.establecimientos
      .filter(r => texto(r.id_establecimiento) && esSi(r.activo))
      .map(r => ({ id: texto(r.id_establecimiento), nombre: texto(r.nombre), tipo: texto(r.tipo) }));
  }
  if (Array.isArray(d.sectores)) {
    out.sectores_hospital = d.sectores.filter(r => texto(r.nombre_sector) && esSi(r.aplica_hospital)).map(r => texto(r.nombre_sector));
    out.sectores_dependencias = d.sectores.filter(r => texto(r.nombre_sector) && esSi(r.aplica_dependencias_caps)).map(r => texto(r.nombre_sector));
  }
  if (Array.isArray(d.plagas)) {
    out.plagas = d.plagas
      .filter(r => texto(r.id_plaga))
      .map(r => ({ id: texto(r.id_plaga), nombre: texto(r.nombre_plaga), icono: texto(r.icono) || "bug" }));
  }
  if (Array.isArray(d.productos)) {
    const activos = d.productos.filter(r => texto(r.id_producto) && !/^(inactivo|no)\b/i.test(texto(r.estado)));
    out.productos = activos.map(r => ({
      id: texto(r.id_producto), nombre: texto(r.nombre_comercial),
      color: texto(r.color) || "#5894A7", icono: texto(r.icono) || "bottle",
    }));
    out.familias = {};
    activos.forEach(r => {
      const fam = texto(r.familia_seguridad).split(",").map(x => x.trim()).filter(Boolean);
      out.familias[texto(r.id_producto)] = fam.length ? fam : ["general"];
    });
  }
  if (Array.isArray(d.tipos_tarea)) {
    out.tipos_tarea = d.tipos_tarea.map(texto).filter(Boolean);
  }
  if (Array.isArray(d.dosis_frecuencia)) {
    out.dosis = {};
    d.dosis_frecuencia.forEach(r => {
      if (!texto(r.id_plaga) || !texto(r.id_producto)) return;
      out.dosis[`${texto(r.id_plaga)}|${texto(r.id_producto)}`] = {
        dosis: texto(r.dosis_estandar) || DOSIS_DEFAULT.dosis,
        frecuencia: texto(r.frecuencia_estandar) || DOSIS_DEFAULT.frecuencia,
        puntos: texto(r.puntos_criticos_sugeridos) || "—",
      };
    });
  }
  return out;
}

function aplicarCatalogos(c) {
  if (!c) return;
  reemplazarLista(OPERARIOS, c.operarios);
  reemplazarLista(ESTABLECIMIENTOS, c.establecimientos);
  reemplazarLista(SECTORES_HZT, c.sectores_hospital);
  reemplazarLista(SECTORES_DEPENDENCIAS, c.sectores_dependencias);
  reemplazarLista(PLAGAS, c.plagas);
  reemplazarLista(PRODUCTOS, c.productos);
  reemplazarObjeto(FAMILIA_PRODUCTO, c.familias);
  reemplazarObjeto(DOSIS_FRECUENCIA, c.dosis);
  reemplazarLista(CAPS_SANEAMIENTO, ESTABLECIMIENTOS.filter(e => e.tipo === "CAP"));
  reemplazarLista(TIPOS_TAREA_HYS, c.tipos_tarea);
  // volver a dibujar las grillas con las listas nuevas
  renderOperarios();
  renderEstablecimientos();
  renderPlagas();
  renderProductos();
  renderSProductos();
  renderCapsNuevo();
  renderTiposTarea();
}

function cargarCatalogosGuardados() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CATALOGOS_KEY) || "null");
    if (guardado && guardado.catalogos) aplicarCatalogos(guardado.catalogos);
  } catch (err) {
    console.warn("No se pudo leer la copia de catálogos del celular.", err);
  }
}

// Solo actualiza las pantallas si el operario está en el inicio,
// para no cambiarle la lista mientras está cargando una visita.
async function actualizarCatalogosDesdePlanilla() {
  if (!navigator.onLine) return;
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PEGAR_ACA")) return;
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, { method: "GET" });
    const datos = await res.json();
    const catalogos = convertirCatalogos(datos);
    try {
      localStorage.setItem(CATALOGOS_KEY, JSON.stringify({ fecha: new Date().toISOString(), catalogos }));
    } catch (err) { /* sin espacio: se sigue con lo que hay */ }
    // listas de trabajos e intervenciones abiertas: la planilla manda
    if (Array.isArray(datos.trabajos_abiertos)) guardarCopia(TRABAJOS_PLANILLA_KEY, datos.trabajos_abiertos);
    if (Array.isArray(datos.intervenciones_abiertas)) guardarCopia(INTERV_PLANILLA_KEY, datos.intervenciones_abiertas);
    if (!currentModule) aplicarCatalogos(catalogos);
  } catch (err) {
    console.warn("No se pudieron descargar los catálogos de la planilla; se usa la copia del celular.", err);
  }
}

// ============================================================
// INIT
// ============================================================
document.getElementById("iconBug").innerHTML = renderIcon("bug");
document.getElementById("iconBroom").innerHTML = renderIcon("broom");
document.getElementById("iconNuevo").innerHTML = renderIcon("calendar_new");
document.getElementById("iconContinuar").innerHTML = renderIcon("calendar_continue");
document.getElementById("iconNuevaMipyv").innerHTML = renderIcon("calendar_new");
document.getElementById("iconContinuarMipyv").innerHTML = renderIcon("calendar_continue");

setNetDot(navigator.onLine);
cargarCatalogosGuardados();
actualizarCatalogosDesdePlanilla();
migrarColaVieja()
  .catch(err => console.warn("No se pudo migrar la cola vieja.", err))
  .finally(() => { updateQueueBadge(); trySync(); });
// reintento automático cada 5 minutos mientras la app esté abierta
setInterval(() => trySync(), 5 * 60 * 1000);
progressWrap.style.display = "none";
bottomBar.style.display = "none";

document.getElementById("appVersion").textContent = "Versión " + APP_VERSION;

// ============================================================
// ACTUALIZACIÓN AUTOMÁTICA
// El celular revisa si hay versión nueva cada vez que se abre la app.
// Si la hay, la descarga y se recarga sola, pero solo en la pantalla de
// inicio, para no cortar a nadie a mitad de una carga.
// ============================================================
let hayVersionNueva = false;
function recargarSiCorresponde() {
  if (hayVersionNueva && !currentModule) window.location.reload();
}
if ("serviceWorker" in navigator) {
  const yaTeniaVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then(reg => reg.update())
    .catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!yaTeniaVersion) return; // primera instalación: no hace falta recargar
    hayVersionNueva = true;
    recargarSiCorresponde();
  });
}
