// Portal HyS · Hojas para imprimir (Imprimir.gs) · versión 0 (23/10/2026)
// Pedido de Belén: todas las auditorías, diagnósticos, relevamientos, controles y recorridas se pueden imprimir en blanco (para completar en
// papel, armadas según el establecimiento, sus lugares y servicios) y completadas. La hoja en papel se transcribe en la pantalla de cada módulo
// y acá se adjunta la foto (hasta 5) o el PDF de la hoja firmada (BASE COMÚN › HOJAS_FIRMADAS y carpeta del establecimiento › Hojas firmadas).
// Lo mismo está en «Mi establecimiento» › Hojas para imprimir, para cada persona según sus módulos. Se imprime desde el navegador: no crea archivos.
// Se carga desde portal.html (<script src>). Para el portal de respaldo, herramientas/armar_respaldo.py lo junta en un solo archivo.
let IMPP = null, IMPP_EST = '';
const impPNom = c => { const f = (RES && RES.filas || []).find(x => x.cod === c); return f ? f.nombre : c; };

async function impPortalPantalla(a) {
  if (!RES) { const g = LS.get('res', null); if (g) { RES = g; refrescarRes(); } }
  const cod = a || IMPP_EST || '';
  const cab = '<div class="cab"><div><span class="mu peq">Más · Hojas para imprimir</span><h1>Hojas para imprimir</h1><span class="mu peq">Auditorías, diagnósticos, relevamientos, controles de extintores y recorridas: en blanco para completar en papel, o completadas.</span></div>' +
    '<div class="filtros"><label class="f">Establecimiento<select class="c" id="impE">' + selectorEst(cod, false) + '</select></label>' + (cod ? '<button class="btn sec" id="impAct">Actualizar</button>' : '') + '</div></div>';
  if (!cod) { marco('#imprimir', cab + '<section class="card"><p class="mu">Elegí el establecimiento.</p></section>'); return impPEventos(); }
  if (!IMPP || IMPP.est !== cod) {
    cargando('#imprimir', 'Leyendo los módulos de ' + impPNom(cod) + '…');
    try { IMPP = await api('p_imp_opciones', { cod: cod }, 120000); } catch (e) { IMPP = null; if (location.hash.split('/')[0] === '#imprimir') marco('#imprimir', cab + '<div class="aviso error">No se pudo conectar con el sistema. <button class="link" id="impAct">Reintentar</button></div>'); return impPEventos(); }
    if (location.hash.split('/')[0] !== '#imprimir') return;
    if (!IMPP.ok) { const m = IMPP.mensaje || IMPP.error; IMPP = null; return marco('#imprimir', cab + '<div class="aviso error">' + esc(m || 'No se pudo leer.') + ' (¿está instalado Imprimir.gs en el Sistema HyS?)</div>'); }
    if (location.hash.split('/')[0] !== '#imprimir') return;
  }
  IMPP_EST = cod;
  marco('#imprimir', cab + IMPP.temas.map((t, ti) => '<section class="card"><h2>' + esc(t.nombre) + '</h2>' +
    (t.error ? '<div class="aviso error">' + esc(t.error) + '</div>' : !t.instalado ? '<p class="mu">Este módulo todavía no está instalado.</p>' :
      '<div class="filtros" style="align-items:flex-end">' + (t.campos || []).map(c => '<label class="f">' + esc(c.t) + (c.ops.length ? '<select class="c" id="impc_' + ti + '_' + esc(c.k) + '">' + c.ops.map(o => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('') + '</select>' : '<span class="mu peq">Sin opciones cargadas</span>') + '</label>').join('') +
        ((t.campos || []).some(c => !c.ops.length) ? '' : '<button class="btn pri" data-impb="' + ti + '">Imprimir en blanco</button>') + '</div>' + (t.nota ? '<p class="mu peq" style="margin:6px 0 0">' + esc(t.nota) + '</p>' : '') +
      (t.hechas.length ? '<div class="tabla" style="margin-top:12px;overflow-x:auto"><table><thead><tr><th>Completada</th><th>Fecha</th><th>Estado</th><th>Hoja firmada</th><th></th></tr></thead><tbody>' + t.hechas.map((h, hi) =>
        '<tr><td><b>' + esc(h.t) + '</b><div class="mu peq">' + esc(h.id) + '</div></td><td>' + fechaTxt(h.fecha) + '</td><td>' + esc(h.estado) + (h.pct ? ' · ' + esc(h.pct) : '') + '</td><td>' +
        (h.firmada ? '<span class="chip ok">Adjunta ' + fechaTxt(h.firmada.fecha) + '</span>' + (h.firmada.url ? ' <a class="link" href="' + esc(h.firmada.url) + '" target="_blank" rel="noopener">Ver ↗</a>' : '') : '<span class="chip gr">Sin adjuntar</span>') +
        ' <button class="link" data-impf="' + ti + '|' + hi + '">' + (h.firmada ? 'Cambiar' : 'Adjuntar') + '</button></td><td><button class="btn sec" data-imph="' + ti + '|' + hi + '">Imprimir</button></td></tr>').join('') + '</tbody></table></div>' +
        (t.total > t.hechas.length ? '<p class="mu peq">Se muestran las ' + t.hechas.length + ' más nuevas de ' + t.total + '.</p>' : '')
      : '<p class="mu peq" style="margin-top:10px">Todavía no hay ninguna completada.</p>')) + '</section>').join('') +
    '<p class="mu peq">Datos al ' + fechaTxt(IMPP.hoy) + '. Cada hoja lleva el marco normativo, la ayuda y la referencia de cada punto y los recuadros de firma; queda en versión 0 hasta su alta en el sistema.</p>');
  impPEventos();
  document.querySelectorAll('[data-impb]').forEach(b => b.onclick = () => { const ti = Number(b.dataset.impb), t = IMPP.temas[ti], bl = {}; (t.campos || []).forEach(c => { const s = $('impc_' + ti + '_' + c.k); if (s) bl[c.k] = s.value; }); impPAbrir({ cod: IMPP.est, tema: t.k, blanco: bl }, t.nombre + ' · en blanco'); });
  document.querySelectorAll('[data-imph]').forEach(b => b.onclick = () => { const [ti, hi] = b.dataset.imph.split('|').map(Number), t = IMPP.temas[ti], h = t.hechas[hi]; impPAbrir({ cod: IMPP.est, tema: t.k, id: h.id }, h.t); });
  document.querySelectorAll('[data-impf]').forEach(b => b.onclick = () => { const [ti, hi] = b.dataset.impf.split('|').map(Number); impPFirmar(IMPP.temas[ti], IMPP.temas[ti].hechas[hi]); });
}
function impPEventos() {
  const e = $('impE'); if (e) e.onchange = ev => { IMPP = null; location.hash = '#imprimir/' + encodeURIComponent(ev.target.value); };
  const a = $('impAct'); if (a) a.onclick = () => { IMPP = null; impPortalPantalla(IMPP_EST); };
}
// Vista previa en pantalla completa: «Imprimir o guardar PDF» y «Abrir en otra pestaña»
async function impPAbrir(datos, nombre) {
  impPVer('<p><b>Armando la hoja…</b><br><span class="mu">' + esc(nombre || '') + '</span></p>');
  let r; try { r = await apiRed('p_imp_hoja', datos, 120000); } catch (e) { return impPVer('<p class="aviso error">No se pudo conectar con el sistema. Probá de nuevo.</p>'); }
  if (!r || !r.ok) return impPVer('<div class="aviso error">' + esc((r && (r.mensaje || r.error)) || 'No se pudo armar la hoja.') + '</div>');
  if (r.url) return impPVer('<p><b>' + esc(r.titulo || 'Formulario') + '</b><br>Es el formulario oficial: se abre aparte para descargarlo e imprimirlo.</p><a class="btn pri" href="' + esc(r.url) + '" target="_blank" rel="noopener">Abrir el formulario ↗</a>');
  impPVer('', r.html, r.titulo);
}
function impPVer(msg, html, titulo) {
  let d = $('impPV'); if (!d) { d = document.createElement('div'); d.id = 'impPV'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); document.body.appendChild(d); }
  d.style.cssText = 'position:fixed;inset:0;z-index:90;background:#fff;display:flex;flex-direction:column';
  if (impPVer.url) { try { URL.revokeObjectURL(impPVer.url); } catch (e) {} impPVer.url = ''; }
  const cerrar = '<button class="btn sec" id="impPVx">Cerrar</button>';
  if (!html) d.innerHTML = '<div style="padding:28px;max-width:640px;margin:0 auto;width:100%">' + msg + '<div style="margin-top:16px">' + cerrar + '</div></div>';
  else {
    impPVer.url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    d.innerHTML = '<div class="filtros" style="padding:10px 14px;border-bottom:1px solid var(--ln);align-items:center"><b style="flex:1 1 260px">' + esc(titulo || 'Hoja para imprimir') + '</b><button class="btn pri" id="impPVp">Imprimir o guardar PDF</button><a class="btn sec" href="' + impPVer.url + '" target="_blank" rel="noopener">Abrir en otra pestaña ↗</a>' + cerrar + '</div><iframe id="impPVf" title="Vista previa de la hoja" style="flex:1;border:0;width:100%"></iframe>';
    $('impPVf').srcdoc = html;
    $('impPVp').onclick = () => { const f = $('impPVf'); try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(impPVer.url, '_blank'); } };
  }
  $('impPVx').onclick = () => { d.remove(); if (impPVer.url) { try { URL.revokeObjectURL(impPVer.url); } catch (e) {} impPVer.url = ''; } };
}
// Adjuntar la hoja firmada: hasta 5 fotos (se achican) o un PDF
function impPFirmar(t, h) {
  const st = { fotos: [] };
  const pintar = () => {
    $('ov').innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="Adjuntar hoja firmada" style="max-width:560px"><h2>Adjuntar hoja firmada</h2><p class="mu peq">' + esc(t.nombre) + ' · ' + esc(h.t) + ' · ' + fechaTxt(h.fecha) + '</p>' +
      '<p class="peq">Primero cargá las respuestas en la pantalla del módulo. Acá va la foto de la hoja en papel, firmada: hasta 5 fotos (una por página) o un PDF.' + (h.firmada ? ' La que ya estaba queda reemplazada.' : '') + '</p>' +
      (st.fotos.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">' + st.fotos.map((f, i) => '<div style="text-align:center">' + (f.tipo === 'application/pdf' ? '<div class="chip">PDF · ' + esc(f.nombre) + '</div>' : '<img src="' + f.base64 + '" alt="Página ' + (i + 1) + '" style="height:90px;border:1px solid var(--ln);border-radius:6px">') + '<br><button class="link" data-impq="' + i + '">Quitar</button></div>').join('') + '</div>' : '') +
      (st.fotos.length < 5 && !(st.fotos[0] && st.fotos[0].tipo === 'application/pdf') ? '<label class="btn sec" style="cursor:pointer;display:inline-block">' + (st.fotos.length ? 'Agregar fotos' : 'Elegir fotos o un PDF') + '<input type="file" id="impFi" accept="image/*,application/pdf" multiple hidden></label>' : '') +
      '<label class="f" style="margin-top:10px">Observaciones (opcional)<input class="c" id="impFo"></label><div id="impFe" class="aviso error" hidden></div>' +
      '<div class="filtros" style="justify-content:flex-end;margin-top:14px"><button class="btn sec" id="impFx">Cancelar</button><button class="btn pri" id="impFok"' + (st.fotos.length ? '' : ' disabled') + '>Guardar la hoja firmada</button></div></div>';
    $('ov').hidden = false;
    $('impFx').onclick = () => { $('ov').hidden = true; $('ov').innerHTML = ''; };
    document.querySelectorAll('[data-impq]').forEach(b => b.onclick = () => { st.fotos.splice(Number(b.dataset.impq), 1); pintar(); });
    const fi = $('impFi'); if (fi) fi.onchange = async () => {
      const fs = Array.from(fi.files || []), err = m => { const e = $('impFe'); e.textContent = m; e.hidden = false; };
      const pdf = fs.filter(f => f.type === 'application/pdf');
      if (pdf.length) { if (pdf.length > 1 || fs.length > 1 || st.fotos.length) return err('Un PDF va solo: elegí un único PDF o solo fotos.'); if (pdf[0].size > 8 * 1024 * 1024) return err('El PDF pesa más de 8 MB.');
        const rd = new FileReader(); rd.onload = () => { st.fotos = [{ base64: rd.result, tipo: 'application/pdf', nombre: pdf[0].name }]; pintar(); }; rd.readAsDataURL(pdf[0]); return; }
      for (const f of fs.slice(0, 5 - st.fotos.length)) { const x = await impPAchicar(f); if (x) st.fotos.push(x); }
      pintar();
    };
    $('impFok').onclick = async () => {
      const b = $('impFok'); b.disabled = true; b.textContent = 'Guardando…';
      const L = st.fotos.filter(Boolean), archivo = { base64: L[0].base64, tipo: L[0].tipo, nombre: L[0].nombre || '', mas: L.slice(1).map(f => f.base64) };
      let r; try { r = await apiRed('p_imp_firmada', { cod: IMPP.est, tema: t.k, id: h.id, detalle: h.t, obs: $('impFo').value, archivo: archivo }, 240000); } catch (e) { r = { ok: false, mensaje: 'No se pudo conectar con el sistema.' }; }
      if (!r.ok) { b.disabled = false; b.textContent = 'Guardar la hoja firmada'; const e = $('impFe'); e.textContent = r.mensaje || r.error || 'No se pudo guardar.'; e.hidden = false; return; }
      $('ov').hidden = true; $('ov').innerHTML = ''; toast('Hoja firmada guardada.'); IMPP = null; impPortalPantalla(IMPP_EST);
    };
  };
  pintar();
}
function impPAchicar(f) {
  return new Promise(res => { const img = new Image(), u = URL.createObjectURL(f);
    img.onload = () => { const k = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res({ base64: c.toDataURL('image/jpeg', 0.75), tipo: 'image/jpeg', nombre: f.name }); };
    img.onerror = () => { URL.revokeObjectURL(u); res(null); }; img.src = u; });
}
