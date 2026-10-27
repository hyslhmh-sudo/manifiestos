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
  if (typeof avisosPintar === "function") avisosPintar();
  borradorMostrarAviso();
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
  if (currentModule === "hys" && name !== "h-sent") borradorProgramar();
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
    case "h-extintores": return extintoresListo();
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
// FOTOS: sacarla en el momento o elegirla del teléfono (pedido de Belén, 23/10/2026)
// Hasta 5 fotos por pantalla (las 3 fotos de cada extintor, una por casillero).
// ============================================================
const galeriaInput = document.createElement("input");
galeriaInput.type = "file"; galeriaInput.accept = "image/*"; galeriaInput.style.display = "none";
document.body.appendChild(galeriaInput);
let galeriaCb = null;
galeriaInput.addEventListener("change", (e) => { const fs = Array.from(e.target.files || []); galeriaInput.value = ""; if (fs.length && galeriaCb) galeriaCb(fs); });
function elegirOrigenFoto(camInput, varias, cb) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999";
  ov.innerHTML = `<div style="background:#fff;width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:18px 16px 22px;display:grid;gap:12px">
    <button type="button" data-o="cam" style="font-size:20px;padding:18px;border-radius:12px;border:2px solid #0D313F;background:#0D313F;color:#fff">📷 Sacar foto ahora</button>
    <button type="button" data-o="gal" style="font-size:20px;padding:18px;border-radius:12px;border:2px solid #0D313F;background:#fff;color:#0D313F">🖼️ Elegir del teléfono</button>
    <button type="button" data-o="no" style="font-size:16px;padding:10px;border:0;background:none;color:#4F616B">Cancelar</button></div>`;
  ov.addEventListener("click", (e) => {
    const b = e.target.closest("[data-o]"); if (!b && e.target !== ov) return; ov.remove(); if (!b) return;
    if (b.dataset.o === "cam") camInput.click();
    else if (b.dataset.o === "gal") { galeriaInput.multiple = !!varias; galeriaCb = cb; galeriaInput.click(); }
  });
  document.body.appendChild(ov);
}
// Agrega a la lista las fotos elegidas (comprimidas), sin pasar de 5
async function agregarFotos(lista, files, render) {
  let error = false, sobra = false;
  for (const f of files) { if (lista.length >= 5) { sobra = true; break; } try { lista.push(await comprimirFoto(f)); } catch (err) { error = true; } }
  render();
  if (sobra) alert("Se cargaron 5 fotos, que es el máximo.");
  else if (error) alert(AVISO_FOTO_FALLO);
}

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
    addBox.onclick = () => elegirOrigenFoto(photoInput, true, fs => agregarFotos(fotosDataUrls, fs, renderFotoGrid));
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
photoInput.addEventListener("change", (e) => {
  const fs = Array.from(e.target.files || []);
  photoInput.value = "";
  if (fs.length) agregarFotos(fotosDataUrls, fs, renderFotoGrid);
});

// ============================================================
// COMPRESIÓN DE FOTOS — lado mayor 1280 px, JPEG calidad 0,7
// (una foto de 3-6 MB queda en unos 200 KB)
// ============================================================
const FOTO_LADO_MAX = 1280;
const FOTO_CALIDAD = 0.7;

// Primero intenta con createImageBitmap (usa menos memoria y respeta la
// orientación de la foto); si el celular no lo tiene, usa el método anterior.
// Si el resultado sale vacío (pasa en celulares con poca memoria), avisa.
async function comprimirFoto(file) {
  if (!file) throw new Error("sin archivo");
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      try { return dibujarComprimida(bmp, bmp.width, bmp.height); }
      finally { if (bmp.close) bmp.close(); }
    } catch (err) { /* sigue con el método anterior */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try { resolve(dibujarComprimida(img, img.naturalWidth, img.naturalHeight)); }
      catch (err) { reject(err); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen ilegible")); };
    img.src = url;
  });
}
function dibujarComprimida(fuente, ancho, alto) {
  if (!ancho || !alto) throw new Error("imagen sin tamaño");
  const escala = Math.min(1, FOTO_LADO_MAX / Math.max(ancho, alto));
  const w = Math.max(1, Math.round(ancho * escala));
  const h = Math.max(1, Math.round(alto * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // fondo blanco por si la imagen trae transparencia
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(fuente, 0, 0, w, h);
  const url = canvas.toDataURL("image/jpeg", FOTO_CALIDAD);
  canvas.width = canvas.height = 0; // libera memoria enseguida
  if (!url || url.length < 1000) throw new Error("la foto salió vacía");
  return url;
}
const AVISO_FOTO_FALLO = "No se pudo cargar la foto.\n\nProbá así: sacala con la cámara común del celular y después, en la app, tocá el casillero y elegí «🖼️ Elegir del teléfono».";

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
    addBox.onclick = () => elegirOrigenFoto(sPhotoInput, true, fs => agregarFotos(sFotosDataUrls, fs, renderSFotoGrid));
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
sPhotoInput.addEventListener("change", (e) => {
  const fs = Array.from(e.target.files || []);
  sPhotoInput.value = "";
  if (fs.length) agregarFotos(sFotosDataUrls, fs, renderSFotoGrid);
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
let extAbierto = null;      // id del extintor que se está controlando (control de extintores)
let altaAbierta = null;     // uid del extintor nuevo que se está cargando
let tareaHys = {};
let hFotosDataUrls = []; // hasta 5

function resetTareaHys() {
  tareaHys = { tipo_tarea: null, lugares: [], controles: {}, altas: [], ediciones: {}, detalle: "", hallazgos: "", observaciones: "" };
  extAbierto = null; altaAbierta = null;
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

// --- h-extintores: control mensual de cada extintor (módulo 10 del sistema HyS)
// La lista sale del inventario del sistema HyS (la manda el servidor con los catálogos).
// Cada extintor: 5 preguntas Sí/No y 3 fotos obligatorias. Se manda al sistema HyS
// (planilla PROTECCIÓN CONTRA INCENDIOS) como registros «control_extintor».
const escX = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
let EXTINTORES_CAT = [];   // [{id, lugares:[id_establecimiento], nro, planta, sector, ubicacion, tipo, kg, inv, vto, ultimo}]
const extintoresList = document.getElementById("extintoresList");
const PREGUNTAS_EXTINTOR = [
  ["EN_LUGAR", "¿Está en su lugar?"],
  ["ACCESO_LIBRE", "¿Se puede agarrar fácil? (nada adelante)"],
  ["MANOMETRO", "¿La aguja está en verde?"],
  ["PRECINTO", "¿Tiene el precinto (el seguro)?"],
  ["SENALIZACION", "¿Tiene el cartel?"],
];
const FOTOS_EXTINTOR = [
  ["FOTO_PANORAMICA", "📷", "1. Foto de lejos", "Que se vea el extintor y todo alrededor"],
  ["FOTO_MARBETE", "🏷️", "2. Foto de la tarjeta", "La tarjeta con la fecha, que se lea"],
  ["FOTO_INVENTARIO", "🔢", "3. Foto del número", "La chapita con el número de inventario"],
];
let extFotoDestino = null;  // [id, campo] de la foto que se está sacando
const extFotoInput = document.createElement("input");
extFotoInput.type = "file"; extFotoInput.accept = "image/*"; extFotoInput.setAttribute("capture", "environment"); extFotoInput.style.display = "none";
document.body.appendChild(extFotoInput);
extFotoInput.addEventListener("change", (e) => { const file = e.target.files[0]; extFotoInput.value = ""; extFotoPoner(file); });
async function extFotoPoner(file) {
  if (!file || !extFotoDestino) return;
  try {
    const foto = await comprimirFoto(file);
    if (extFotoDestino[0] === "alta") { const a = tareaHys.altas.find(x => x.uid === extFotoDestino[1]); if (a) a.fotos[extFotoDestino[2]] = foto; }
    else { const [id, campo] = extFotoDestino; tareaHys.controles[id].fotos[campo] = foto; }
    renderExtintores();
    borradorGuardar();
  }
  catch (err) { alert(AVISO_FOTO_FALLO); }
}
function controlVacio(e) { const r = {}; PREGUNTAS_EXTINTOR.forEach(([k]) => r[k] = null); const f = {}; FOTOS_EXTINTOR.forEach(([k]) => f[k] = "");
  const iso = (v) => /^\d{4}-\d{2}-\d{2}/.test(v || "") ? v.slice(0, 10) : "";
  return { resp: r, fotos: f, obs: "", vto: iso(e && e.vto), ph: iso(e && e.ph), noSeLee: false }; }
// Completo: 5 respuestas, 3 fotos y el vencimiento de la carga (o «No se lee»)
function controlCompleto(c) { return !!c && PREGUNTAS_EXTINTOR.every(([k]) => c.resp[k] !== null) && FOTOS_EXTINTOR.every(([k]) => !!c.fotos[k]) && (!!c.vto || !!c.noSeLee); }
function controlEmpezado(c) { return !!c && (PREGUNTAS_EXTINTOR.some(([k]) => c.resp[k] !== null) || FOTOS_EXTINTOR.some(([k]) => !!c.fotos[k])); }
const extintoresDe = (idLugar) => EXTINTORES_CAT.filter(e => (e.lugares || []).indexOf(idLugar) >= 0);
function extNombre(e) { const ed = tareaHys.ediciones && tareaHys.ediciones[e.id], nro = ed ? ed.NRO_EXTINTOR : e.nro; return (nro ? "N.º " + nro : e.id) + " · " + [e.tipo, e.kg ? e.kg + " kg" : ""].filter(Boolean).join(" "); }
function extintoresListo() {
  const cs = Object.keys(tareaHys.controles).map(k => tareaHys.controles[k]);
  if (cs.some(c => controlEmpezado(c) && !controlCompleto(c))) return false;   // uno a medias
  if (tareaHys.altas.some(a => !altaCompleta(a))) return false;                // un extintor nuevo a medias
  const hayCatalogo = tareaHys.lugares.some(l => extintoresDe(l.id).length);
  return cs.some(controlCompleto) || tareaHys.altas.length > 0 || Object.keys(tareaHys.ediciones).length > 0 || !hayCatalogo;
}
function renderExtintores() {
  extintoresList.innerHTML = "";
  const mes = new Date().toISOString().slice(0, 7);
  tareaHys.lugares.forEach(l => {
    const lista = extintoresDe(l.id);
    const card = document.createElement("div");
    card.className = "ext-card";
    const hechos = lista.filter(e => controlCompleto(tareaHys.controles[e.id])).length;
    let html = `<h4>🧯 ${l.nombre}</h4>`;
    if (!lista.length) html += `<div class="ext-preg">No hay extintores cargados para este lugar. Si hay alguno, agregalo con el botón de abajo.</div>`;
    else html += `<div class="step-sub" style="margin:0 0 8px">Controlaste ${hechos} de ${lista.length}. Tocá cada extintor.</div>`;
    card.innerHTML = html;
    lista.forEach(e => {
      const c = tareaHys.controles[e.id], ok = controlCompleto(c), yaMes = String(e.ultimo || "").slice(0, 7) === mes;
      const fila = document.createElement("button");
      fila.type = "button";
      fila.className = "ext-fila" + (ok ? " ok" : "") + (extAbierto === e.id ? " abierta" : "");
      fila.innerHTML = `<span class="ext-ico">${ok ? "✅" : yaMes ? "☑️" : "🧯"}</span><span class="ext-txt"><b>${extNombre(e)}</b><small>${escX(tareaHys.ediciones[e.id] ? [tareaHys.ediciones[e.id].SECTOR, tareaHys.ediciones[e.id].UBICACION].filter(Boolean).join(" · ") : [e.sector, e.ubicacion].filter(Boolean).join(" · ")) || "&nbsp;"}</small>${tareaHys.ediciones[e.id] ? '<small class="ext-vto wa">✏️ Corregido (lo verifica Higiene y Seguridad)</small>' : ""}${avisoVto(e)}${yaMes && !ok ? "<small>Ya controlado este mes</small>" : ""}</span>`;
      fila.onclick = () => { extAbierto = extAbierto === e.id ? null : e.id; altaAbierta = null; if (!tareaHys.controles[e.id]) tareaHys.controles[e.id] = controlVacio(e); renderExtintores(); };
      card.appendChild(fila);
      if (extAbierto === e.id) card.appendChild(panelControl(e, l));
    });
    // Extintores nuevos de este lugar (los que no estaban en la lista)
    tareaHys.altas.filter(a => a.lugar.id === l.id).forEach(a => {
      const ok = altaCompleta(a), fila = document.createElement("button");
      fila.type = "button";
      fila.className = "ext-fila nuevo" + (ok ? " ok" : "") + (altaAbierta === a.uid ? " abierta" : "");
      fila.innerHTML = `<span class="ext-ico">${ok ? "✅" : "➕"}</span><span class="ext-txt"><b>Extintor nuevo${a.datos.TIPO ? " · " + escX(a.datos.TIPO) : ""}${a.datos.CAPACIDAD_KG ? " " + escX(a.datos.CAPACIDAD_KG) + " kg" : ""}</b><small>${escX([a.datos.SECTOR, a.datos.UBICACION].filter(Boolean).join(" · ")) || "Completá los datos y sacá las 3 fotos"}</small></span>`;
      fila.onclick = () => { altaAbierta = altaAbierta === a.uid ? null : a.uid; extAbierto = null; renderExtintores(); };
      card.appendChild(fila);
      if (altaAbierta === a.uid) card.appendChild(panelAlta(a));
    });
    const mas = document.createElement("button");
    mas.type = "button"; mas.className = "ext-agregar";
    mas.innerHTML = "➕ Agregar un extintor que no está en la lista";
    mas.onclick = () => { const a = altaVacia(l); tareaHys.altas.push(a); altaAbierta = a.uid; extAbierto = null; renderExtintores(); };
    card.appendChild(mas);
    extintoresList.appendChild(card);
  });
  nextBtn.disabled = !canAdvance("h-extintores");
}
function panelControl(e, l) {
  const c = tareaHys.controles[e.id];
  const panel = document.createElement("div");
  panel.className = "ext-panel";
  const ed = tareaHys.ediciones[e.id];
  let html = `<button type="button" class="ext-editar">✏️ ${ed ? "Corrección guardada · tocá para cambiarla" : "Corregir el nombre o dónde está"}</button>`;
  if (c.editando) {
    const v = ed || { NRO_EXTINTOR: e.nro || "", lugar_id: l.id, PLANTA: e.planta || "", SECTOR: e.sector || "", UBICACION: e.ubicacion || "" };
    c.borrador = c.borrador || Object.assign({}, v);
    const b = c.borrador;
    html += `<div class="ext-edicion"><div class="ext-preg">Nombre o N.º del extintor</div><input class="ext-inp" data-ed="NRO_EXTINTOR" value="${escX(b.NRO_EXTINTOR)}" placeholder="Ej.: 12, o Extintor del office">
      <div class="ext-preg">¿En qué lugar está?</div><select class="ext-inp" data-ed="lugar_id">${ESTABLECIMIENTOS.map(x => `<option value="${escX(x.id)}"${x.id === b.lugar_id ? " selected" : ""}>${escX(x.nombre)}</option>`).join("")}</select>
      <div class="ext-preg">Planta</div><div class="ext-opc" data-ed="PLANTA">${["Baja", "Alta", "Subsuelo", "Única"].map(x => `<button type="button" class="${b.PLANTA === x ? "on" : ""}" data-valor="${x}">${x}</button>`).join("")}</div>
      <div class="ext-preg">Sector o servicio</div><input class="ext-inp" data-ed="SECTOR" value="${escX(b.SECTOR)}">
      <div class="ext-preg">¿Dónde está exactamente?</div><input class="ext-inp" data-ed="UBICACION" value="${escX(b.UBICACION)}">
      <button type="button" class="ext-listo ext-ed-ok">Guardar la corrección</button><button type="button" class="ext-quitar ext-ed-no">${ed ? "Deshacer la corrección" : "Cancelar"}</button></div>`;
  }
  PREGUNTAS_EXTINTOR.forEach(([k, preg]) => {
    html += `<div class="ext-preg">${preg}</div><div class="sino" data-campo="${k}">
      <button type="button" class="si${c.resp[k] === "Sí" ? " on" : ""}" data-valor="Sí">Sí</button>
      <button type="button" class="no${c.resp[k] === "No" ? " on" : ""}" data-valor="No">No</button></div>`;
  });
  html += `<div class="ext-preg" style="margin-top:16px">Sacá las 3 fotos</div><div class="ext-fotos">`;
  FOTOS_EXTINTOR.forEach(([k, ico, tit, ayuda]) => {
    html += c.fotos[k]
      ? `<button type="button" class="ext-foto lista" data-foto="${k}"><img src="${c.fotos[k]}" alt="${tit}"><b>${tit}</b><small>Lista · tocá para sacarla de nuevo</small></button>`
      : `<button type="button" class="ext-foto" data-foto="${k}"><span class="ext-foto-ico">${ico}</span><b>${tit}</b><small>${ayuda}</small></button>`;
  });
  html += `</div><div class="ext-preg" style="margin-top:16px">¿Hasta cuándo dura la carga? (mirá la tarjeta)</div>
    <input class="ext-inp ext-vto-inp" type="date" value="${escX(c.vto)}"${c.noSeLee ? " disabled" : ""}>
    <label class="ext-chk"><input type="checkbox" class="ext-nose"${c.noSeLee ? " checked" : ""}> La tarjeta no se lee o no tiene</label>
    <div class="ext-preg">¿Hasta cuándo vale la prueba hidráulica? (si figura)</div>
    <input class="ext-inp ext-ph-inp" type="date" value="${escX(c.ph)}">
    <div class="ext-preg" style="margin-top:16px">Comentario (opcional)</div><textarea class="ext-com" rows="2" placeholder="Algo que quieras contar de este extintor">${escX(c.obs || "")}</textarea>`;
  html += `<button type="button" class="ext-listo"${controlCompleto(c) ? "" : " disabled"}>${controlCompleto(c) ? "Listo, guardar este extintor" : "Contestá todo, poné el vencimiento y sacá las 3 fotos"}</button>`;
  panel.innerHTML = html;
  panel.querySelector(".ext-com").oninput = (ev) => { c.obs = ev.target.value; };
  const actListo = () => { const b = panel.querySelector(".ext-listo:not(.ext-ed-ok)"), ok = controlCompleto(c); b.disabled = !ok; b.textContent = ok ? "Listo, guardar este extintor" : "Contestá todo, poné el vencimiento y sacá las 3 fotos"; nextBtn.disabled = !canAdvance("h-extintores"); };
  panel.querySelector(".ext-vto-inp").onchange = panel.querySelector(".ext-vto-inp").oninput = (ev) => { c.vto = ev.target.value; actListo(); };
  panel.querySelector(".ext-ph-inp").onchange = panel.querySelector(".ext-ph-inp").oninput = (ev) => { c.ph = ev.target.value; };
  panel.querySelector(".ext-nose").onchange = (ev) => { c.noSeLee = ev.target.checked; renderExtintores(); };
  panel.querySelectorAll(".sino").forEach(grupo => grupo.querySelectorAll("button").forEach(b => {
    b.onclick = () => { c.resp[grupo.dataset.campo] = b.dataset.valor; renderExtintores(); };
  }));
  panel.querySelectorAll("[data-foto]").forEach(b => { b.onclick = () => { extFotoDestino = [e.id, b.dataset.foto]; elegirOrigenFoto(extFotoInput, false, fs => extFotoPoner(fs[0])); }; });
  panel.querySelector(".ext-listo:not(.ext-ed-ok)").onclick = () => { if (controlCompleto(c)) { extAbierto = null; renderExtintores(); } };
  // Corrección del nombre y la ubicación (queda pendiente de verificar por Higiene y Seguridad)
  panel.querySelector(".ext-editar").onclick = () => { c.editando = !c.editando; c.borrador = null; renderExtintores(); };
  if (c.editando) {
    const b = c.borrador;
    panel.querySelectorAll("input[data-ed], select[data-ed]").forEach(i => { i.oninput = i.onchange = () => { b[i.dataset.ed] = i.value; }; });
    panel.querySelectorAll(".ext-opc[data-ed] button").forEach(x => { x.onclick = () => { b.PLANTA = x.dataset.valor; renderExtintores(); }; });
    panel.querySelector(".ext-ed-ok").onclick = () => {
      if (!String(b.SECTOR || "").trim() || !String(b.UBICACION || "").trim()) { alert("El sector y dónde está no pueden quedar vacíos."); return; }
      const lug = ESTABLECIMIENTOS.find(x => x.id === b.lugar_id);
      tareaHys.ediciones[e.id] = Object.assign({}, b, { lugar_nombre: lug ? lug.nombre : b.lugar_id });
      c.editando = false; c.borrador = null; renderExtintores();
    };
    panel.querySelector(".ext-ed-no").onclick = () => { delete tareaHys.ediciones[e.id]; c.editando = false; c.borrador = null; renderExtintores(); };
  }
  return panel;
}

// Aviso de vencimiento de la carga en la fila del extintor (vencida, o 30 días antes)
function avisoVto(e) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(e.vto || "")) return "";
  const hoy = new Date().toISOString().slice(0, 10), lim = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), f = e.vto.slice(8, 10) + "/" + e.vto.slice(5, 7) + "/" + e.vto.slice(0, 4);
  if (e.vto < hoy) return `<small class="ext-vto er">⚠️ Carga vencida (${f})</small>`;
  if (e.vto <= lim) return `<small class="ext-vto wa">⏰ La carga vence el ${f}</small>`;
  return "";
}

// --- Agregar un extintor que no está en la lista: todos los datos y las 3 fotos son obligatorios.
// Se manda al sistema HyS (módulo 10, hoja EXTINTORES) como registro «alta_extintor».
const CAMPOS_ALTA = [
  ["PLANTA", "¿En qué planta está?", "botones", ["Baja", "Alta", "Subsuelo", "Única"]],
  ["SECTOR", "Sector o servicio", "texto", "Ej.: Guardia, sala de espera"],
  ["UBICACION", "¿Dónde está exactamente?", "texto", "Ej.: en la pared, al lado de la puerta"],
  ["TIPO", "Tipo (está escrito en el extintor)", "botones", ["ABC", "BC", "K", "Otro"]],
  ["AGENTE", "¿Qué tiene adentro?", "botones", ["PQS", "CO2", "Agua", "AFFF (espuma)", "HCFC 123", "Acetato de potasio"]],
  ["CAPACIDAD_KG", "¿De cuántos kilos?", "numero", "Ej.: 5"],
  ["NRO_INVENTARIO", "N.º de inventario (la chapita)", "texto", "Si no tiene, escribí s/d"],
  ["VTO_CARGA", "¿Hasta cuándo dura la carga? (está en la tarjeta)", "fecha", ""],
  ["NRO_EXTINTOR", "N.º del extintor (opcional)", "texto", "Si tiene un número pintado o en un cartel", true],
];
let altaN = 0;
function altaVacia(l) { const d = {}; CAMPOS_ALTA.forEach(([k]) => d[k] = ""); const f = {}; FOTOS_EXTINTOR.forEach(([k]) => f[k] = ""); return { uid: "A" + (++altaN) + "-" + Date.now(), lugar: { id: l.id, nombre: l.nombre }, datos: d, fotos: f, obs: "" }; }
function altaCompleta(a) { return CAMPOS_ALTA.every(([k, , , , opc]) => opc || String(a.datos[k] || "").trim()) && FOTOS_EXTINTOR.every(([k]) => !!a.fotos[k]); }
function panelAlta(a) {
  const panel = document.createElement("div");
  panel.className = "ext-panel";
  let html = `<div class="step-sub" style="margin:8px 0 0">Completá todo y sacá las 3 fotos. Es obligatorio.</div>`;
  CAMPOS_ALTA.forEach(([k, tit, tipo, x]) => {
    html += `<div class="ext-preg">${tit}</div>`;
    if (tipo === "botones") html += `<div class="ext-opc" data-campo="${k}">` + x.map(v => `<button type="button" class="${a.datos[k] === v ? "on" : ""}" data-valor="${v}">${v}</button>`).join("") + `</div>`;
    else html += `<input class="ext-inp" data-campo="${k}" type="${tipo === "fecha" ? "date" : tipo === "numero" ? "number" : "text"}"${tipo === "numero" ? ' inputmode="decimal" step="any"' : ""} value="${escX(a.datos[k] || "")}" placeholder="${escX(x || "")}">`;
  });
  html += `<div class="ext-preg" style="margin-top:16px">Sacá las 3 fotos</div><div class="ext-fotos">`;
  FOTOS_EXTINTOR.forEach(([k, ico, tit, ayuda]) => {
    html += a.fotos[k]
      ? `<button type="button" class="ext-foto lista" data-foto="${k}"><img src="${a.fotos[k]}" alt="${tit}"><b>${tit}</b><small>Lista · tocá para sacarla de nuevo</small></button>`
      : `<button type="button" class="ext-foto" data-foto="${k}"><span class="ext-foto-ico">${ico}</span><b>${tit}</b><small>${ayuda}</small></button>`;
  });
  html += `</div><div class="ext-preg" style="margin-top:16px">Comentario (opcional)</div><textarea class="ext-com" rows="2" placeholder="Algo que quieras contar de este extintor">${escX(a.obs || "")}</textarea>`;
  html += `<button type="button" class="ext-listo"${altaCompleta(a) ? "" : " disabled"}>${altaCompleta(a) ? "Listo, guardar este extintor nuevo" : "Completá todo y sacá las 3 fotos"}</button>`;
  html += `<button type="button" class="ext-quitar">Quitar este extintor nuevo</button>`;
  panel.innerHTML = html;
  const boton = panel.querySelector(".ext-listo");
  const actualizar = () => { const ok = altaCompleta(a); boton.disabled = !ok; boton.textContent = ok ? "Listo, guardar este extintor nuevo" : "Completá todo y sacá las 3 fotos"; nextBtn.disabled = !canAdvance("h-extintores"); };
  panel.querySelectorAll(".ext-opc").forEach(g => g.querySelectorAll("button").forEach(b => { b.onclick = () => { a.datos[g.dataset.campo] = b.dataset.valor; renderExtintores(); }; }));
  panel.querySelectorAll(".ext-inp").forEach(inp => { inp.oninput = () => { a.datos[inp.dataset.campo] = inp.value; actualizar(); }; });
  panel.querySelector(".ext-com").oninput = (ev) => { a.obs = ev.target.value; };
  panel.querySelectorAll("[data-foto]").forEach(b => { b.onclick = () => { extFotoDestino = ["alta", a.uid, b.dataset.foto]; elegirOrigenFoto(extFotoInput, false, fs => extFotoPoner(fs[0])); }; });
  boton.onclick = () => { if (altaCompleta(a)) { altaAbierta = null; renderExtintores(); } };
  panel.querySelector(".ext-quitar").onclick = () => { if (confirm("¿Quitar este extintor nuevo? Se borra lo que cargaste.")) { tareaHys.altas = tareaHys.altas.filter(x => x !== a); altaAbierta = null; renderExtintores(); } };
  return panel;
}
function altaNombre(a) { return "Nuevo · " + [a.datos.TIPO, a.datos.AGENTE, a.datos.CAPACIDAD_KG ? a.datos.CAPACIDAD_KG + " kg" : ""].filter(Boolean).join(" ") + " · " + [a.datos.SECTOR, a.datos.UBICACION].filter(Boolean).join(", ") + " · inventario " + a.datos.NRO_INVENTARIO; }

// Texto del control de extintores: una línea por extintor controlado (va a "detalle")
// y lo que está mal (va a "hallazgos").
function textoExtintores() {
  const lineas = [], problemas = [];
  tareaHys.lugares.forEach(l => {
    extintoresDe(l.id).forEach(e => {
      const c = tareaHys.controles[e.id]; if (!controlCompleto(c)) return;
      const fx = (v) => v ? v.split("-").reverse().join("/") : "";
      lineas.push(`${l.nombre} · ${extNombre(e)} (${e.id}): ` + PREGUNTAS_EXTINTOR.map(([k, p]) => p.replace(/[¿?]/g, "").replace(/ \(.*\)/, "") + " " + c.resp[k]).join(" · ") + " · carga hasta " + (c.noSeLee ? "no se lee" : fx(c.vto)) + (c.ph ? " · prueba hidráulica hasta " + fx(c.ph) : "") + " · 3 fotos" + (c.obs && c.obs.trim() ? " · Comentario: " + c.obs.trim() : ""));
      const hoyIso = new Date().toISOString().slice(0, 10);
      if (!c.noSeLee && c.vto && c.vto < hoyIso) problemas.push(`${l.nombre} · ${extNombre(e)}: carga vencida (${fx(c.vto)})`);
      if (c.noSeLee) problemas.push(`${l.nombre} · ${extNombre(e)}: la tarjeta no se lee o no tiene`);
      const mal = PREGUNTAS_EXTINTOR.filter(([k]) => c.resp[k] === "No").map(([, p]) => "No: " + p.replace(/[¿?]/g, "").replace(/ \(.*\)/, "").toLowerCase());
      if (mal.length) problemas.push(`${l.nombre} · ${extNombre(e)}: ${mal.join("; ")}`);
    });
    extintoresDe(l.id).forEach(e => { const ed = tareaHys.ediciones[e.id]; if (!ed) return;
      lineas.push(`${l.nombre} · ${e.id}: corrección de nombre o ubicación → ` + [ed.NRO_EXTINTOR ? "N.º " + ed.NRO_EXTINTOR : "", ed.lugar_nombre, ed.PLANTA ? "planta " + ed.PLANTA.toLowerCase() : "", ed.SECTOR, ed.UBICACION].filter(Boolean).join(" · "));
    });
    tareaHys.altas.filter(a => a.lugar.id === l.id && altaCompleta(a)).forEach(a => {
      lineas.push(`${l.nombre} · ${altaNombre(a)}: agregado al inventario con 3 fotos` + (a.obs && a.obs.trim() ? " · Comentario: " + a.obs.trim() : ""));
    });
  });
  return { lineas, problemas };
}
// Registros para el sistema HyS (uno por extintor controlado)
function registrosControlExtintores(idTarea) {
  const out = [];
  Object.keys(tareaHys.controles).forEach((id, i) => {
    const c = tareaHys.controles[id]; if (!controlCompleto(c)) return;
    const d = { id_control: idTarea + "-E" + (i + 1), id_tarea: idTarea, ID_EXTINTOR: id, fecha: new Date().toISOString(),
      operario: currentOperario ? currentOperario.nombre : "", operario_acompanante: operarioAcompanante || "",
      fotos_base64: FOTOS_EXTINTOR.map(([k]) => c.fotos[k]), OBSERVACIONES: (c.obs || "").trim(),
      VTO_CARGA: c.noSeLee ? "s/d (no se lee)" : c.vto, PRUEBA_HIDRAULICA_VENCE: c.ph || "" };
    PREGUNTAS_EXTINTOR.forEach(([k]) => d[k] = c.resp[k]);
    out.push({ tipo: "control_extintor", data: d });
  });
  return out;
}
// Registros de las correcciones de nombre o ubicación (una por extintor)
function registrosEdicionExtintores(idTarea) {
  return Object.keys(tareaHys.ediciones).map((id, i) => {
    const ed = tareaHys.ediciones[id];
    return { tipo: "editar_extintor", data: { id_edit: idTarea + "-C" + (i + 1), id_tarea: idTarea, ID_EXTINTOR: id, NRO_EXTINTOR: ed.NRO_EXTINTOR, PLANTA: ed.PLANTA, SECTOR: ed.SECTOR, UBICACION: ed.UBICACION,
      lugar_id: ed.lugar_id, lugar_nombre: ed.lugar_nombre, fecha: new Date().toISOString(), operario: currentOperario ? currentOperario.nombre : "", operario_acompanante: operarioAcompanante || "" } };
  });
}
// Registros de los extintores agregados (uno por extintor nuevo)
function registrosAltaExtintores(idTarea) {
  return tareaHys.altas.filter(altaCompleta).map((a, i) => {
    const d = Object.assign({ id_alta: idTarea + "-A" + (i + 1), id_tarea: idTarea, lugar_id: a.lugar.id, lugar_nombre: a.lugar.nombre, fecha: new Date().toISOString(),
      operario: currentOperario ? currentOperario.nombre : "", operario_acompanante: operarioAcompanante || "",
      fotos_base64: FOTOS_EXTINTOR.map(([k]) => a.fotos[k]), OBSERVACIONES: (a.obs || "").trim() }, a.datos);
    return { tipo: "alta_extintor", data: d };
  });
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
    addBox.onclick = () => elegirOrigenFoto(hPhotoInput, true, fs => agregarFotos(hFotosDataUrls, fs, renderHFotoGrid));
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
hPhotoInput.addEventListener("change", (e) => {
  const fs = Array.from(e.target.files || []);
  hPhotoInput.value = "";
  if (fs.length) agregarFotos(hFotosDataUrls, fs, renderHFotoGrid);
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
    id_tarea: tareaHys.id_tarea || (tareaHys.id_tarea = "H-" + Date.now()),
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
  if (esTareaExtintores(r.tipo_tarea)) rows.splice(3, 0, ["Extintores controlados", Object.keys(tareaHys.controles).filter(k => controlCompleto(tareaHys.controles[k])).length + " (cada uno con 3 fotos)"]);
  if (esTareaExtintores(r.tipo_tarea) && Object.keys(tareaHys.ediciones).length) rows.splice(4, 0, ["Extintores corregidos", Object.keys(tareaHys.ediciones).length + " (nombre o ubicación)"]);
  if (esTareaExtintores(r.tipo_tarea) && tareaHys.altas.length) rows.splice(4, 0, ["Extintores agregados", tareaHys.altas.filter(altaCompleta).length + " (con sus datos y 3 fotos)"]);
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
  const controles = esTareaExtintores(tareaHys.tipo_tarea) ? registrosAltaExtintores(record.id_tarea).concat(registrosEdicionExtintores(record.id_tarea), registrosControlExtintores(record.id_tarea)) : [];
  const guardado = await guardarEnCola(controles.concat([{ tipo: "tarea_hys", data: record }]));
  nextBtn.disabled = false;
  if (!guardado) return;
  borradorBorrar();
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
// BORRADOR DE LA TAREA DE HIGIENE Y SEGURIDAD (27/10/2026)
// En muchos Android, al abrir la cámara el navegador cierra la app para
// liberar memoria y la vuelve a abrir al regresar: se perdía todo lo cargado
// (por eso «no cargaba la foto» en el control de extintores).
// Ahora cada respuesta y cada foto quedan guardadas en el celular al momento.
// Si la app se cierra, al volver ofrece «Seguir con la tarea que estabas
// haciendo» y aparece todo como estaba, fotos incluidas.
// Se borra solo cuando la tarea se envía o el operario la descarta.
// Dura 3 días; después se descarta sola.
// ============================================================
var BORRADOR_DB = "mipyv_borrador", BORRADOR_STORE = "b", BORRADOR_ID = "hys";
var BORRADOR_DIAS = 3;
var borradorTimer = null;

function borradorAbrir() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("sin IndexedDB")); return; }
    const req = indexedDB.open(BORRADOR_DB, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(BORRADOR_STORE)) db.createObjectStore(BORRADOR_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function borradorTx(modo, accion) {
  const db = await borradorAbrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BORRADOR_STORE, modo), st = tx.objectStore(BORRADOR_STORE);
    let r; accion(st, (v) => { r = v; });
    tx.oncomplete = () => { db.close(); resolve(r); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
// Se guarda solo si hay una tarea de Higiene y Seguridad con tipo elegido.
function borradorFoto() {
  if (currentModule !== "hys" || !tareaHys.tipo_tarea) return null;
  const paso = stepList[stepIndex];
  if (!paso || paso === "h-sent") return null;
  return {
    guardado: new Date().toISOString(), version: APP_VERSION, paso,
    operario: currentOperario, acompanante: operarioAcompanante, acompananteRespondido,
    tarea: tareaHys, extAbierto, altaAbierta, fotos: hFotosDataUrls,
    horas: [horaInicioEl.value, horaFinEl.value, horaInicioAcompEl.value, horaFinAcompEl.value],
  };
}
async function borradorGuardar() {
  clearTimeout(borradorTimer); borradorTimer = null;
  const b = borradorFoto(); if (!b) return;
  try { await borradorTx("readwrite", (st) => st.put(JSON.parse(JSON.stringify(b)), BORRADOR_ID)); }
  catch (err) { console.warn("No se pudo guardar el borrador en el celular.", err); }
}
function borradorProgramar() { clearTimeout(borradorTimer); borradorTimer = setTimeout(borradorGuardar, 600); }
async function borradorLeer() {
  try {
    const b = await borradorTx("readonly", (st, set) => { const r = st.get(BORRADOR_ID); r.onsuccess = () => set(r.result || null); });
    if (!b || !b.tarea) return null;
    if (Date.now() - new Date(b.guardado).getTime() > BORRADOR_DIAS * 864e5) { borradorBorrar(); return null; }
    return b;
  } catch (err) { return null; }
}
async function borradorBorrar() {
  clearTimeout(borradorTimer); borradorTimer = null;
  try { await borradorTx("readwrite", (st) => st.delete(BORRADOR_ID)); } catch (err) { /* nada */ }
}

// Vuelve a dejar la tarea exactamente donde estaba.
function borradorRestaurar(b) {
  enterModule("hys");
  currentOperario = b.operario || null;
  operarioAcompanante = b.acompanante || null;
  acompananteRespondido = !!b.acompananteRespondido;
  tareaHys = Object.assign({ tipo_tarea: null, lugares: [], controles: {}, altas: [], ediciones: {}, detalle: "", hallazgos: "", observaciones: "" }, b.tarea);
  extAbierto = b.extAbierto || null;
  altaAbierta = b.altaAbierta || null;
  hFotosDataUrls = Array.isArray(b.fotos) ? b.fotos : [];
  const h = b.horas || [];
  horaInicioEl.value = h[0] || ""; horaFinEl.value = h[1] || "";
  horaInicioAcompEl.value = h[2] || ""; horaFinAcompEl.value = h[3] || "";
  hDetalle.value = tareaHys.detalle || ""; hHallazgos.value = tareaHys.hallazgos || ""; hObservaciones.value = tareaHys.observaciones || "";
  // el número de los extintores nuevos sigue desde el último que había
  (tareaHys.altas || []).forEach(a => { const n = parseInt(String(a.uid || "").replace(/^A/, ""), 10); if (n > altaN) altaN = n; });
  renderTiposTarea();
  armarPasosHys();
  const paso = stepList.indexOf(b.paso) >= 0 ? b.paso : "h-lugares";
  // si no quedó cargado quién trabajó, se empieza por ahí
  stepIndex = currentOperario ? stepList.indexOf(paso) : 0;
  showStep(stepList[stepIndex]);
}

// Aviso en la pantalla de inicio
const borradorAviso = document.createElement("div");
borradorAviso.style.cssText = "display:none;margin:0 0 16px;padding:14px;border-radius:14px;background:#FFF4D6;border:2px solid #E0A800;color:#3B2F00";
document.querySelector('.screen[data-step="home"]').prepend(borradorAviso);
async function borradorMostrarAviso() {
  const b = await borradorLeer();
  if (!b || currentModule) { borradorAviso.style.display = "none"; return; }
  const t = b.tarea || {}, f = new Date(b.guardado);
  const cuando = f.toLocaleDateString("es-AR") + " " + f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  let nFotos = (b.fotos || []).length;
  Object.values(t.controles || {}).forEach(c => { nFotos += Object.values(c.fotos || {}).filter(Boolean).length; });
  (t.altas || []).forEach(a => { nFotos += Object.values(a.fotos || {}).filter(Boolean).length; });
  const lugares = (t.lugares || []).map(l => l.nombre).join(", ");
  borradorAviso.innerHTML = `<div style="font-weight:700;font-size:18px;margin-bottom:6px">⏸️ Tenés una tarea sin terminar</div>
    <div style="margin-bottom:12px">${escX(t.tipo_tarea || "")}${lugares ? " · " + escX(lugares) : ""}<br><small>Guardada el ${escX(cuando)}${nFotos ? " · " + nFotos + " foto(s)" : ""}</small></div>
    <button type="button" data-b="seguir" style="width:100%;font-size:18px;padding:14px;border-radius:12px;border:0;background:#0D313F;color:#fff;margin-bottom:8px">Seguir con la tarea que estabas haciendo</button>
    <button type="button" data-b="descartar" style="width:100%;font-size:15px;padding:10px;border-radius:12px;border:1px solid #8A6D00;background:#fff;color:#3B2F00">Descartarla</button>`;
  borradorAviso.querySelector('[data-b="seguir"]').onclick = () => { borradorAviso.style.display = "none"; borradorRestaurar(b); };
  borradorAviso.querySelector('[data-b="descartar"]').onclick = async () => {
    if (!confirm("¿Descartar la tarea sin terminar? Se borra lo que cargaste, fotos incluidas.")) return;
    await borradorBorrar(); borradorAviso.style.display = "none";
  };
  borradorAviso.style.display = "block";
}

// Guardar mientras se escribe o se contesta, y siempre antes de que la app
// quede en segundo plano (por ejemplo, al abrir la cámara).
document.getElementById("screens").addEventListener("input", () => { if (currentModule === "hys") borradorProgramar(); });
document.getElementById("screens").addEventListener("click", () => { if (currentModule === "hys") borradorProgramar(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && currentModule === "hys") borradorGuardar(); });
window.addEventListener("pagehide", () => { if (currentModule === "hys") borradorGuardar(); });

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
  if (Array.isArray(d.extintores)) out.extintores = d.extintores;
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
  if (Array.isArray(c.extintores)) EXTINTORES_CAT = c.extintores;
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
    if (typeof avisosDatos === "function") avisosDatos(datos);   // casos por vencer y solicitudes (avisos.js)
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
borradorMostrarAviso();

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
