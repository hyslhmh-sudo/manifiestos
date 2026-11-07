// Portal HyS · 7 · Incendio › Etiquetas QR de extintores (IncendioEtiquetas.gs) · versión 0 (07/11/2026, pedido de Belén)
// Recuadro del tablero de incendio: dos etiquetas por extintor (cilindro y chapa baliza), 5 × 5 cm, blanco y negro, 10 por hoja A4.
// Alcance: HMH y CAPS de la red Trelew. Estado de cada etiqueta (lo calcula el sistema comparando con lo impreso):
//   Nueva / Cambió (pendientes) · Texto viejo (solo cambió la ubicación: se reimprime si querés) · Al día.
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let INCQT = null, INCQS = '', INCQSEL = null;
const INCQ_EST = { nueva: ['Nueva', 'er'], cambio: ['Cambió', 'er'], texto: ['Texto viejo', 'wa'], aldia: ['Al día', 'ok'] };
const incqClave = L => L.cod + '|' + L.sitio;

async function incqPintar(idCaja, fresco) {
  const caja = $(idCaja); if (!caja) return;
  if (!INCQT || fresco) { caja.innerHTML = '<span class="mu peq">Buscando etiquetas para imprimir…</span>'; try { INCQT = await api('p_inc_etiq', {}, 120000); } catch (e) { caja.innerHTML = ''; return; } }
  if (!$(idCaja)) return;
  if (!INCQT.ok) { caja.innerHTML = '<span class="mu peq">' + esc(INCQT.mensaje || INCQT.error || 'No se pudieron leer las etiquetas.') + '</span>'; return; }
  const LL = INCQT.lugares.filter(L => L.total).sort((a, b) => (a.cod === 'HMH') - (b.cod === 'HMH') || a.lugar.localeCompare(b.lugar));
  const pendTot = LL.reduce((s, L) => s + L.pend, 0);
  if (!INCQS || !LL.some(L => incqClave(L) === INCQS)) { const p = LL.find(L => L.pend && L.cod !== 'HMH') || LL.find(L => L.total) || LL[0]; INCQS = p ? incqClave(p) : ''; INCQSEL = null; }
  const L = LL.find(x => incqClave(x) === INCQS), E = L ? INCQT.ext.filter(e => e.EST === L.cod && e.SITIO === L.sitio) : [];
  if (!INCQSEL) INCQSEL = new Set(E.filter(e => e.estado === 'nueva' || e.estado === 'cambio').map(e => e.ID));
  const chip = e => { const x = INCQ_EST[e.estado] || ['s/d', 'gr']; return '<span class="chip ' + x[1] + ' mini">' + x[0] + '</span>'; };
  const sub = e => [e.estado === 'aldia' || e.estado === 'texto' ? (e.impresa ? 'Impresa el ' + fechaTxt(e.impresa) : '') : '', e.motivo, e.nota].filter(Boolean).join(' · ');
  caja.innerHTML = '<h2>🏷️ Etiquetas QR para imprimir</h2>' +
    '<span class="mu peq">Dos por extintor (una para el cilindro y otra para la chapa baliza), de 5 × 5 cm, 10 por hoja A4. HMH y CAPS de Trelew (aparecen los lugares que tienen extintores cargados). ' +
    (pendTot ? '<b>' + pendTot + (pendTot > 1 ? ' extintores pendientes' : ' extintor pendiente') + '</b> (nuevos o con datos cambiados).' : 'No hay etiquetas pendientes.') + ' ' +
    '<a class="link" href="' + esc(INCQT.libro) + '" target="_blank" rel="noopener">Planilla ETIQUETAS_QR ↗</a></span>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:10px 0"><label class="f">Lugar<select class="c" id="iqLugar">' +
    LL.map(x => '<option value="' + esc(incqClave(x)) + '"' + (incqClave(x) === INCQS ? ' selected' : '') + '>' + esc(x.lugar) + ' · ' + x.total + ' extintor(es)' + (x.pend ? ' · ' + x.pend + ' pendiente(s)' : '') + (x.texto ? ' · ' + x.texto + ' texto viejo' : '') + '</option>').join('') + '</select></label>' +
    '<button class="btn sec" id="iqPend">Tildar pendientes</button><button class="btn sec" id="iqTodas">Tildar todas</button><button class="btn sec" id="iqNada">Destildar</button></div>' +
    (L && L.cod === 'HMH' ? '<div class="aviso">HMH: conviene imprimir después de la revisión de ubicaciones, para no pegar dos veces.</div>' : '') +
    (E.length ? '<div style="max-height:360px;overflow:auto;border:1px solid var(--ln);border-radius:8px">' + E.map(e =>
      '<label class="at" style="align-items:flex-start;cursor:pointer;margin:0;border-radius:0"><input type="checkbox" data-iq="' + esc(e.ID) + '"' + (INCQSEL.has(e.ID) ? ' checked' : '') + ' style="margin-top:4px">' +
      '<span style="flex:1"><b>N.º ' + esc(e.NRO) + '</b> · ' + esc(e.TIPO + ' · ' + e.AGENTE + ' · ' + e.KG + ' kg') + ' · inv. ' + esc(e.INV) +
      '<br><small class="mu">' + esc(e.PLANTA + ' · ' + e.SECTOR + (e.UBICACION ? ' · ' + e.UBICACION : '')) + '</small>' + (sub(e) ? '<br><small>' + esc(sub(e)) + '</small>' : '') + '</span>' + chip(e) + '</label>').join('') + '</div>'
      : '<div class="mu peq">Este lugar no tiene extintores cargados.</div>') +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn pri" id="iqHoja">🖨️ Armar hoja (<span id="iqN">' + INCQSEL.size + '</span>)</button>' +
    '<button class="btn sec" id="iqListo">✅ Ya las imprimí</button><button class="btn sec" id="iqNo">No hace falta reimprimir</button></div>' +
    '<p class="mu peq" style="margin-top:6px">Imprimí al 100 % (tamaño real). Al escanear el QR se abre el extintor en «Mi establecimiento» (con usuario y clave). Si cambia solo el texto de la ubicación, queda como «Texto viejo» y no hace falta reimprimir.</p>';
  const sel = () => Array.from(INCQSEL), cuenta = () => { const n = $('iqN'); if (n) n.textContent = INCQSEL.size; };
  caja.querySelectorAll('[data-iq]').forEach(c => c.onchange = () => { c.checked ? INCQSEL.add(c.dataset.iq) : INCQSEL.delete(c.dataset.iq); cuenta(); });
  $('iqLugar').onchange = ev => { INCQS = ev.target.value; INCQSEL = null; incqPintar(idCaja); };
  const tildar = f => { INCQSEL = new Set(E.filter(f).map(e => e.ID)); incqPintar(idCaja); };
  $('iqPend').onclick = () => tildar(e => e.estado === 'nueva' || e.estado === 'cambio');
  $('iqTodas').onclick = () => tildar(() => true);
  $('iqNada').onclick = () => tildar(() => false);
  $('iqHoja').onclick = async () => {
    if (!INCQSEL.size) return toast('Tildá al menos un extintor.');
    const w = window.open('', '_blank'); if (!w) return toast('El navegador bloqueó la ventana nueva: permití las ventanas emergentes para este sitio.');
    w.document.write('<p style="font-family:Arial;padding:20px">Armando las etiquetas…</p>');
    try { const r = await api('p_inc_etiq_hoja', { ids: sel() }, 120000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo armar la hoja.');
      w.document.open(); w.document.write(r.html); w.document.close(); }
    catch (e) { w.close(); toast(e.message || 'No se pudo armar la hoja.'); }
  };
  const marcar = async (accion, b) => {
    if (!INCQSEL.size) return toast('Tildá al menos un extintor.');
    if (accion === 'nohace' && !confirm('¿Dejar estas etiquetas como están, sin reimprimir? Se toman los datos actuales como los impresos.')) return;
    const t0 = b.textContent; b.disabled = true; b.textContent = 'Guardando…';
    try { const r = await api('p_inc_etiq_marcar', { ids: sel(), accion: accion }, 120000); if (!r.ok) throw new Error(r.mensaje || 'No se pudo guardar.');
      toast(accion === 'nohace' ? 'Listo: ' + r.n + ' sin reimprimir.' : 'Listo: ' + r.n + (r.n > 1 ? ' extintores marcados' : ' extintor marcado') + ' como impresos.'); INCQSEL = null; incqPintar(idCaja, true); }
    catch (e) { b.disabled = false; b.textContent = t0; toast(e.message || 'No se pudo guardar.'); }
  };
  $('iqListo').onclick = ev => marcar('impresa', ev.target);
  $('iqNo').onclick = ev => marcar('nohace', ev.target);
}
