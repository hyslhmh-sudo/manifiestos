/**
 * SISTEMA HyS · 11 · GESTIÓN › REGLAS AUTOMÁTICAS (fase 3 · versión 14.64 · 14/10/2026)
 * Tabla de reglas con su fuente (BASE COMÚN › GES_REGLAS, editable a mano y desde el portal: Gestión › Reglas) y el motor que las aplica.
 * Cada regla dice qué condición de un módulo es un hallazgo, si entra directo al plan (lo grave) o a la bandeja de sugeridos,
 * con qué prioridad, plazo, acción y fuente normativa. En los establecimientos de nivel B todo entra sugerido; sin habilitar, no entra.
 * Un hallazgo por objeto (sitio, tanque, extintor, medición, condición del RGRL): si sigue igual se actualiza el que está abierto;
 * si desaparece del módulo, la acción pasa a «Hecha» (Belén verifica la eficacia) y el sugerido sin confirmar se cierra solo;
 * si vuelve a aparecer después de cerrado, entra uno nuevo. Un descartado no vuelve a entrar.
 * Corre con «Traer de los módulos» y cada mañana con el precalentado (Gestion.gs › gesTraer_). No envía correos.
 * Primera tanda programada: residuos (categoría de generador y acopio, certificados), agua, plagas, incendio e infraestructura
 * (mediciones y respuestas «No» del RGRL). El resto de las reglas del diseño figuran con su fuente como «Por programar».
 */
const GREG = {
  HOJA: 'GES_REGLAS',
  H: ['ID', 'MODULO', 'REGLA', 'COMO_SE_DETECTA', 'ENTRA', 'PRIORIDAD', 'PLAZO_DIAS', 'REQUIERE_DIRECCION', 'ACCION', 'FUENTE', 'PARAMETROS', 'ACTIVA', 'MOTOR', 'ULTIMA_REVISION', 'DETECTADOS', 'ACTUALIZADO'],
  ENTRA: ['Directo', 'Sugerido'], MOTOR: ['Programada', 'Por programar']
};
function M_(i) { return GES.MODULOS[i - 1]; }   // se arma al usarse (Gestion.gs puede cargarse después)
// [ID, módulo, regla, cómo se detecta, entra, prioridad, plazo, ¿Dirección?, acción, fuente, parámetros, activa, motor]
function gregSemilla_() { return [
  ['RES-01', M_(1), 'Acopio de residuos biopatogénicos por encima del tiempo máximo de su categoría (generador grande o mediano)',
    'Con los manifiestos de los últimos 12 meses calcula la categoría de cada sitio (promedio de kg por día de Y1; los dm³ se pasan a kg con 0,25 kg/dm³). Compara el tiempo máximo de acopio sin frío (grande: 48 h; mediano: 72 h) con la frecuencia del contrato (BASE COMÚN › SITIOS) y con los intervalos reales entre retiros de los últimos 90 días. Un hallazgo por sitio. No aplica a los sitios con cámara fría.',
    'Directo', 'Actuar ya', 30, 'Sí', 'Ajustar la frecuencia de retiro del contrato al tiempo máximo de acopio, o instalar cámara fría (3 a 8 °C, con grupo electrógeno)',
    'Res. MSN 134/2016, punto 9.6.1 y Tabla N.º 4 (criterio técnico); Código Ambiental de Chubut, Ley XI N.º 35, art. 85 (24 h sin tratamiento adicional)',
    'meses=12; dias=90; kg_dm3=0,25; veces=1; camara_fria=; categoria=', 'Sí', 'Programada'],
  ['RES-02', M_(1), 'Pequeño generador: acopio de más de 30 días o de más de 20 kg',
    'Mismo cálculo que RES-01 para los sitios de menos de 10 kg por día: intervalo entre retiros de más de 30 días o un retiro de más de 20 kg.',
    'Sugerido', 'Resolver rápido', 90, 'No', 'Acordar retiros más frecuentes para no superar 30 días ni 20 kg acopiados', 'Res. MSN 134/2016, punto 9.6.1 y Tabla N.º 4',
    'meses=12; dias=90; kg_dm3=0,25; dias_max=30; kg_max=20', 'Sí', 'Programada'],
  ['RES-03', M_(1), 'Retiros sin certificado de tratamiento o disposición final',
    'Meses de los últimos 12 con retiros y sin certificado cargado en el libro general, salvo el mes anterior (todavía en plazo). Un hallazgo por establecimiento.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Pedir a la empresa los certificados de tratamiento faltantes y cargarlos', 'Ley 24.051 y Dto. 831/93 (certificado de tratamiento y disposición final); contrato con la empresa', '', 'Sí', 'Programada'],
  ['RES-04', M_(1), 'Sin inscripción en el Registro Provincial de Generadores de residuos patogénicos', 'Falta el dato de inscripción por establecimiento.', 'Directo', 'Actuar ya', 30, 'Sí', 'Tramitar la inscripción', 'Código Ambiental de Chubut, Ley XI N.º 35, art. 126', '', 'No', 'Por programar'],
  ['RES-05', M_(1), 'Declaración jurada anual de generador de residuos peligrosos no presentada', 'Falta el registro de presentación de la DDJJ.', 'Directo', 'Actuar ya', 30, 'Sí', 'Presentar la DDJJ', 'Ley XI N.º 35, art. 66; Dto. 1675/93, arts. 15 y 34', '', 'No', 'Por programar'],
  ['RES-06', M_(1), 'Retiro sin manifiesto o manifiesto incompleto', 'Falta cruzar los retiros informados con los manifiestos.', 'Directo', 'Actuar ya', 30, 'No', 'Pedir el manifiesto o completarlo', 'Dto. 1675/93, arts. 12 y 13', '', 'No', 'Por programar'],
  ['RES-07', M_(1), 'Manifiestos de los CAPS sin cargar en 7 días', 'Falta el control de carga por CAPS.', 'Sugerido', 'Resolver rápido', 30, 'No', 'Cargar los manifiestos pendientes', 'PROT-RES-003', '', 'No', 'Por programar'],
  ['RES-08', M_(1), 'Auditoría: retiro interno menos de 2 veces por día, bolsas sin tarjeta o local de acopio inadecuado', 'Hoy entra por el plan de acción de la auditoría.', 'Sugerido', 'Resolver rápido', 90, 'No', 'Corregir lo observado en la auditoría', 'Código Ambiental de Chubut, arts. 84, 86 y 87', '', 'No', 'Por programar'],
  ['AGU-01', M_(2), 'Agua NO APTA', 'Análisis con resultado NO APTA y acción abierta en el módulo de agua (incluye el plazo de 15 días hábiles del módulo).',
    'Directo', 'Actuar ya', 21, 'No', 'Limpiar y desinfectar, y repetir el análisis', 'Dto. 351/79, Anexo I, arts. 57 y 58; Código Alimentario Argentino (CAA), art. 982', '', 'Sí', 'Programada'],
  ['AGU-02', M_(2), 'Análisis de agua vencido hace más de 30 días',
    'Canillas: bacteriológico cada 6 meses; equipos: físico-químico cada 12 meses. Entra si venció hace más días que la tolerancia. Un hallazgo por punto de muestreo.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Tomar la muestra y cargar el análisis', 'Dto. 351/79, Anexo I, art. 57 inc. 3 (bacteriológico semestral y físico-químico anual)', 'tolerancia=30', 'Sí', 'Programada'],
  ['AGU-03', M_(2), 'Limpieza de tanque vencida hace más de 30 días',
    'Próxima limpieza del tanque (o la última más su frecuencia) vencida hace más días que la tolerancia. No cuenta los tanques de riego ni los fuera de servicio. Un hallazgo por tanque.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Limpiar y desinfectar el tanque y cargar el registro',
    'Sin frecuencia legal: Ley 19.587, art. 9 inc. d); Dto. 351/79, Anexo I, art. 58. Frecuencia: proceso provincial (DPSB) y, en el HMH, el plan de trabajo de SOMI', 'tolerancia=30', 'Sí', 'Programada'],
  ['AGU-04', M_(2), 'Tanque sin tapa o con la tapa dañada', 'Campo TAPA del tanque en «No», «Sin tapa», «Rota» o «Dañada». Un hallazgo por tanque.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Colocar o reparar la tapa del tanque', 'Criterio técnico: Ley 19.587, art. 9 inc. d); Res. GMC 80/96 (CAA, cap. II), punto 4.1.3.12.1', '', 'Sí', 'Programada'],
  ['PLA-01', M_(3), 'Revisión de plagas atrasada', 'Caso abierto o pedido de otra visita (registro MIPyV) con la fecha de revisión pasada. Lo abierto en plazo es una alerta del módulo, no un hallazgo.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Hacer la revisión atrasada y cerrar el caso', 'Ley 19.587, art. 9 inc. e) (desinfecciones periódicas); en cocinas, CAA art. 18 y Res. GMC 80/96, punto 5.7.1. Plazo: programa MIPyV o contrato', '', 'Sí', 'Programada'],
  ['PLA-02', M_(3), 'Hallazgo crítico en la visita', 'Falta marcar en la visita qué hallazgo es crítico.', 'Sugerido', 'Actuar ya', 30, 'No', 'Resolver el hallazgo crítico', 'Ley 19.587, art. 9 inc. e)', '', 'No', 'Por programar'],
  ['COC-01', M_(4), 'Carnet de manipulador de alimentos vencido', 'Personal de cocina con el carnet vencido.', 'Sugerido', 'Resolver rápido', 30, 'No', 'Renovar el carnet', 'CAA, art. 21 (Res. Conj. 12/2019): vigencia de 3 años', '', 'No', 'Por programar'],
  ['COC-02', M_(4), 'Punto «No cumple» de Buenas Prácticas de Manufactura', 'Relevamiento de cocina. HACCP es oportunidad de mejora, no hallazgo.', 'Sugerido', 'Resolver rápido', 90, 'No', 'Corregir el punto observado', 'Res. GMC 80/96, incorporada al CAA (BPM obligatorias). HACCP: CAA, art. 18 bis, solo para los productos que indica', '', 'No', 'Por programar'],
  ['RAD-01', M_(5), 'Registro dosimétrico anormal', 'Dosis por encima de los límites.', 'Directo', 'Actuar ya', 30, 'Sí', 'Notificar a la autoridad sanitaria e investigar la exposición', 'Res. SS 273/86 (50 mSv por año y 30 mSv por trimestre); Dto. 6320/68, art. 20 (notificación inmediata)', '', 'No', 'Por programar'],
  ['RAD-02', M_(5), 'Sala o equipo de rayos X sin habilitación', 'Equipo sin habilitación vigente.', 'Sugerido', 'Planificar', 180, 'Sí', 'Tramitar la habilitación', 'Ley 17.557, art. 2; Dto. 6320/68, arts. 6 y 12', '', 'No', 'Por programar'],
  ['RAD-03', M_(5), 'Control dosimétrico del trimestre faltante', 'Falta el informe de dosis del trimestre (el control mensual queda como alerta).', 'Sugerido', 'Resolver rápido', 30, 'No', 'Pedir el informe de dosis', 'Dto. 6320/68, arts. 21, 25 y 26 (informe en períodos que no excedan un trimestre)', '', 'No', 'Por programar'],
  ['RAD-04', M_(5), 'Dosímetro extraviado', 'Dosímetro informado como extraviado.', 'Sugerido', 'Resolver rápido', 30, 'No', 'Reponer el dosímetro', 'Protocolo propio (Dto. 6320/68, art. 25: un dosímetro por persona)', '', 'No', 'Por programar'],
  ['INF-01', M_(6), 'Medición vencida (puesta a tierra, iluminación, ruido y otras)', 'Medición vigente con la fecha de vencimiento pasada (8 › Mediciones). Un hallazgo por medición.',
    'Directo', 'Actuar ya', 30, 'No', 'Hacer la medición y cargarla con su protocolo', 'Res. SRT 900/15 (puesta a tierra), Res. SRT 84/12 (iluminación) y Res. SRT 85/12 (ruido), art. 2 de cada una: validez de 12 meses', '', 'Sí', 'Programada'],
  ['INF-02', M_(6), 'Medición con resultado «No cumple»', 'Medición vigente cuyo resultado es «No cumple». Un hallazgo por medición.',
    'Sugerido', 'Actuar ya', 30, 'Sí', 'Corregir lo que marca el protocolo de la medición y volver a medir', 'La norma de la medición (Res. SRT 900/15, 84/12 u 85/12) y Dto. 351/79', '', 'Sí', 'Programada'],
  ['INF-03', M_(6), 'Respuesta «No» del RGRL', 'Condición respondida «No» en el último RGRL de cada establecimiento o sitio. Fecha límite: la fecha de regularización, si está cargada. Un hallazgo por condición.',
    'Sugerido', 'Planificar', 180, 'No', 'Regularizar la condición', 'Res. SRT 463/09, Anexo I, y la normativa de cada condición; Res. SRT 905/15, Anexo I, punto 2.2', '', 'Sí', 'Programada'],
  ['INC-01', M_(7), 'Extintor fuera de servicio o inaccesible', 'Extintor en estado «Fuera de servicio», o con «No está en su lugar» o «Acceso obstruido» en el último control o en un problema abierto. Un hallazgo por extintor.',
    'Directo', 'Actuar ya', 7, 'No', 'Reponer el extintor o despejar el acceso', 'Dto. 351/79, arts. 176, 184 y 185; Anexo VII, punto 7.1.1 («en lugares accesibles»)', '', 'Sí', 'Programada'],
  ['INC-02', M_(7), 'Extintores con la carga o la prueba hidráulica vencida', 'Inventario de extintores (sin los dados de baja). Un hallazgo por lugar, con la lista de extintores.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Recargar o hacer la prueba hidráulica de los extintores vencidos', 'Dto. 351/79, arts. 176 y 184; frecuencia según IRAM 3517-2; en el HMH, plan de trabajo de SOMI', '', 'Sí', 'Programada'],
  ['INC-03', M_(7), '«No» en la recorrida de seguridad contra incendios', 'Novedad abierta que salió de una recorrida (cada «No» abre una). Un hallazgo por novedad.',
    'Sugerido', 'Resolver rápido', 30, 'No', 'Corregir lo marcado en la recorrida', 'Dto. 351/79, cap. 18 (protección contra incendios: medios de escape, señalización, extintores, detección y alarma)', '', 'Sí', 'Programada'],
  ['INC-04', M_(7), 'Plan de evacuación sin simulacro en el año', 'Falta el registro de simulacros.', 'Sugerido', 'Planificar', 180, 'No', 'Programar el simulacro', 'Dto. 351/79, art. 187 (frecuencia: criterio técnico)', '', 'No', 'Por programar'],
  ['PER-01', M_(8), 'Siniestro con baja o grave', 'Siniestro cargado con baja o como grave.', 'Directo', 'Actuar ya', 30, 'No', 'Investigar el siniestro (árbol de causas)', 'Res. SRT 905/15, Anexo II, punto 12', '', 'No', 'Por programar'],
  ['PER-02', M_(8), 'Siniestro sin investigar a los 20 días', 'Siniestro sin investigación cargada.', 'Sugerido', 'Resolver rápido', 30, 'No', 'Completar la investigación', 'Res. SRT 905/15, Anexo II, punto 12 (20 días: criterio propio)', '', 'No', 'Por programar'],
  ['PER-03', M_(8), 'Trabajador expuesto sin nómina de expuestos (NTE)', 'Expuesto sin NTE en el período.', 'Sugerido', 'Planificar', 180, 'No', 'Completar la NTE', 'Res. SRT 37/10, art. 3 inc. 5; Res. SRT 905/15, Anexo I, punto 2.1 (periodicidad anual según el APPC)', '', 'No', 'Por programar'],
  ['CAP-01', M_(9), 'Capacitación obligatoria no cumplida en el plazo', 'Personal que no hizo una capacitación obligatoria del programa anual.', 'Sugerido', 'Planificar', 180, 'No', 'Programar la capacitación', 'Dto. 351/79, arts. 208 y 211 a 213; Ley 19.587, art. 9 inc. k); Res. SRT 905/15', '', 'No', 'Por programar'],
  ['DOC-01', M_(10), 'Documento vencido o sin revisar en su plazo', 'Documento vigente con la próxima revisión pasada.', 'Sugerido', 'Planificar', 90, 'No', 'Revisar el documento', 'Procedimiento propio de control de documentos', '', 'No', 'Por programar']
]; }

// ------------------------------------------------------------------ Hoja
function gregHoja_() {
  const bc = pBC_(); let sh = bc.getSheetByName(GREG.HOJA);
  if (!sh) {
    sh = bc.insertSheet(GREG.HOJA);
    encabezar_(sh, 'Gestión · Reglas automáticas de hallazgos', 'Una fila por regla. ENTRA: Directo (al plan) o Sugerido (bandeja). En nivel B todo entra sugerido. ACTIVA = No la apaga. PARAMETROS: clave=valor separados por «;». MOTOR «Por programar»: la regla todavía no la aplica el sistema. ULTIMA_REVISION y DETECTADOS los pone el sistema.', GREG.H);
    lista_(sh, GREG.H.indexOf('MODULO'), 200, GES.MODULOS); lista_(sh, GREG.H.indexOf('ENTRA'), 200, GREG.ENTRA); lista_(sh, GREG.H.indexOf('PRIORIDAD'), 200, GES.PRIORIDADES);
    lista_(sh, GREG.H.indexOf('REQUIERE_DIRECCION'), 200, ['Sí', 'No']); lista_(sh, GREG.H.indexOf('ACTIVA'), 200, ['Sí', 'No']); lista_(sh, GREG.H.indexOf('MOTOR'), 200, GREG.MOTOR);
    [3, 4, 9, 10].forEach(c => sh.setColumnWidth(c, 320));
  }
  // Reglas nuevas del sistema que todavía no están en la hoja (no pisa lo editado)
  const ya = {}, hoy = gesHoy_(); gesLeer_(sh, GREG.H).forEach(o => { ya[o.ID] = 1; });
  const faltan = gregSemilla_().filter(s => !ya[s[0]]).map(s => { const o = {}; GREG.H.slice(0, 13).forEach((h, i) => o[h] = s[i]); o.ACTUALIZADO = hoy; return o; });
  if (faltan.length) gesAgregar_(sh, GREG.H, faltan);
  return sh;
}
// Parámetros «clave=valor; clave=valor» (coma decimal admitida)
function gregParams_(s) {
  const o = {}; String(s || '').split(';').forEach(p => { const k = p.split('='); if (k.length < 2) return; const c = k[0].trim().toLowerCase(), v = k.slice(1).join('=').trim();
    o[c] = /^-?\d+([.,]\d+)?$/.test(v) ? Number(v.replace(',', '.')) : v; });
  return o;
}
function gregLeer_() {
  const L = gesLeer_(gregHoja_(), GREG.H), R = {};
  L.forEach(o => { o.p = gregParams_(o.PARAMETROS); R[o.ID] = o; });
  return { lista: L, R: R };
}
// Guardar desde el portal (solo los campos editables)
function gregGuardar_(x) {
  return conLock_(() => {
    const sh = gregHoja_(), L = gesLeer_(sh, GREG.H), c = L.find(o => o.ID === x.id), d = x.datos || {};
    if (!c) return { ok: false, mensaje: 'No encuentro la regla ' + x.id + '. Actualizá la pantalla.' };
    const ed = ['ENTRA', 'PRIORIDAD', 'PLAZO_DIAS', 'REQUIERE_DIRECCION', 'ACCION', 'FUENTE', 'PARAMETROS', 'ACTIVA', 'REGLA', 'COMO_SE_DETECTA'];
    if (d.ACTIVA === 'Sí' && c.MOTOR !== 'Programada') return { ok: false, mensaje: 'Esta regla todavía no está programada: se puede activar cuando el sistema la aplique.' };
    if (d.ENTRA && GREG.ENTRA.indexOf(d.ENTRA) < 0) return { ok: false, mensaje: 'ENTRA tiene que ser Directo o Sugerido.' };
    if (d.FUENTE != null && !String(d.FUENTE).trim()) return { ok: false, mensaje: 'Toda regla necesita su fuente.' };
    const o = Object.assign({}, c), cam = [];
    ed.forEach(k => { if (d[k] != null && String(d[k]) !== String(c[k])) { cam.push([new Date(), GREG.HOJA, c.ID, k, c[k], d[k], 'Portal HyS']); o[k] = d[k]; } });
    if (!cam.length) return { ok: true, cambios: 0 };
    o.ACTUALIZADO = gesHoy_(); delete o.p; gesEscribir_(sh, GREG.H, c.fila, o); pHistorial_(pBC_(), cam);
    return { ok: true, cambios: cam.length };
  });
}

// ------------------------------------------------------------------ Motor: detección (solo lee; Gestion.gs › gesTraer_ escribe)
// Devuelve { det: [{ regla, cod, sitio, clave, desc, accion?, limite?, fuente?, origen?, ref?, estado?, recurso? }], ok: { regla: true si leyó su fuente }, errores: [] }
function gregDetectar_(RG, fresco) {
  const out = { det: [], ok: {}, errores: [] }, hoy = gesHoy_(), act = id => RG[id] && RG[id].ACTIVA === 'Sí' && RG[id].MOTOR === 'Programada';
  const corre = (ids, nombre, fn) => { if (!ids.some(act)) return; try { fn(); ids.forEach(id => out.ok[id] = true); } catch (e) { out.errores.push(nombre + ': ' + e.message); } };
  const push = o => { if (act(o.regla)) out.det.push(o); };
  const dias = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  const txt = f => f ? String(f).slice(0, 10).split('-').reverse().join('/') : 's/d';
  const sumaD = (f, d) => { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return Utilities.formatDate(x, TZ, 'yyyy-MM-dd'); };

  // 1 · Residuos: categoría de generador y acopio (RES-01, RES-02)
  corre(['RES-01', 'RES-02'], 'Residuos (categoría y acopio)', () => {
    const p = Object.assign({ meses: 12, dias: 90, kg_dm3: 0.25, veces: 1, dias_max: 30, kg_max: 20 }, (RG['RES-01'] || {}).p || {});
    const p2 = Object.assign({ dias_max: 30, kg_max: 20 }, (RG['RES-02'] || {}).p || {});
    const frio = String(p.camara_fria || '').split(',').map(sinTildes_).filter(String);
    const forz = {}; String(p.categoria || '').split(',').forEach(s => { const k = s.split(':'); if (k.length === 2) forz[sinTildes_(k[0])] = sinTildes_(k[1]); });
    const porNombre = {}; pEstablecimientos_().filas.forEach(f => { const c = limpio_(f.v[0]); if (c) porNombre[sinTildes_(f.v[1])] = c; });
    const frec = {}; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => frec[limpio_(r.v[0]) + '|' + sinTildes_(r.v[1])] = limpio_(r.v[6])); } catch (e) {}
    const desde = (() => { const d = new Date(); d.setMonth(d.getMonth() - p.meses); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); })(), desdeV = sumaD(hoy, -p.dias);
    const gm = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('MANIFIESTOS'), n = gm.getLastRow() - 5, S = {};
    if (n > 0) gm.getRange(6, 1, n, 11).getValues().forEach(r => {
      if (!/Y1/.test(String(r[7]))) return; const cod = porNombre[sinTildes_(r[0])]; if (!cod) return;
      const f = resFecha_(r[3]); if (!f || f < desde || f > hoy) return;
      const uni = sinTildes_(r[10]), cant = Number(String(r[9]).replace(',', '.')) || 0, kg = /^kg/.test(uni) ? cant : cant * p.kg_dm3;
      const sitio = limpio_(r[1]) || cod, k = cod + '|' + sitio, s = S[k] = S[k] || { cod: cod, sitio: sitio, kg: 0, primero: f, fechas: {} };
      s.kg += kg; if (f < s.primero) s.primero = f; s.fechas[f] = (s.fechas[f] || 0) + kg;
    });
    // Intervalo máximo según el contrato (días entre retiros)
    const contrato = fr => { const t = sinTildes_(fr); return !t || /^s\/d/.test(t) ? null : /diari/.test(t) ? (/sab/.test(t) ? 2 : /vier|lun a vie/.test(t) ? 3 : 1) : /3 dias/.test(t) ? 3 : /2 dias/.test(t) ? 4 : /seman/.test(t) ? 7 : /quinc/.test(t) ? 15 : /mensu/.test(t) ? 30 : null; };
    Object.keys(S).forEach(k => {
      const s = S[k], F = Object.keys(s.fechas).sort(), periodo = Math.max(1, Math.min(dias(desde, hoy), dias(s.primero, hoy) + 1)), prov = dias(s.primero, hoy) + 1 < dias(desde, hoy) - 31;
      const prom = s.kg / periodo, f0 = forz[sinTildes_(s.sitio)];
      const cat = f0 ? (/grand/.test(f0) ? 'Grande' : /median/.test(f0) ? 'Mediano' : 'Pequeño') : prom > 50 ? 'Grande' : prom >= 10 ? 'Mediano' : 'Pequeño';
      if (frio.indexOf(sinTildes_(s.sitio)) >= 0) return;
      const fr = frec[s.cod + '|' + sinTildes_(s.sitio)] || '', ic = contrato(fr), catTxt = 'generador ' + cat.toLowerCase() + (f0 ? ' (corregido a mano)' : '') + ': promedio de ' + prom.toFixed(1).replace('.', ',') + ' kg por día de biopatogénicos (Y1)' + (prov ? ' con menos de 12 meses de datos (categoría provisoria)' : ' en los últimos ' + p.meses + ' meses');
      const gaps = []; F.filter(f => f >= sumaD(desdeV, -40)).forEach((f, i, A) => { if (i && f >= desdeV) gaps.push({ a: A[i - 1], b: f, d: dias(A[i - 1], f) }); });
      if (cat !== 'Pequeño') {
        const max = cat === 'Grande' ? 2 : 3, horas = max * 24, malos = gaps.filter(g => g.d > max), peor = malos.slice().sort((a, b) => b.d - a.d)[0];
        const porContrato = ic != null && ic > max;
        if (!porContrato && malos.length < (p.veces || 1)) return;
        push({ regla: 'RES-01', cod: s.cod, sitio: s.sitio, clave: 'REG|RES-01|' + s.cod + '|' + s.sitio,
          desc: s.sitio + ': ' + catTxt + '. Tiempo máximo de acopio sin frío: ' + horas + ' h.' + (porContrato ? ' La frecuencia del contrato (' + fr + ') permite hasta ' + ic + ' días entre retiros.' : '') +
            (malos.length ? ' En los últimos ' + p.dias + ' días hubo ' + malos.length + ' intervalo(s) de más de ' + horas + ' h entre retiros (el mayor, ' + peor.d + ' días: del ' + txt(peor.a) + ' al ' + txt(peor.b) + ').' : '') + ' Sin cámara fría.',
          ref: 'Manifiestos ' + txt(desde) + ' a ' + txt(hoy), origen: 'Regla automática' });
      } else {
        const largos = gaps.filter(g => g.d > p2.dias_max), pesados = F.filter(f => f >= desdeV && s.fechas[f] > p2.kg_max);
        if (!largos.length && !pesados.length) return;
        push({ regla: 'RES-02', cod: s.cod, sitio: s.sitio, clave: 'REG|RES-02|' + s.cod + '|' + s.sitio,
          desc: s.sitio + ': ' + catTxt + '.' + (largos.length ? ' ' + largos.length + ' intervalo(s) de más de ' + p2.dias_max + ' días entre retiros (el mayor, ' + largos.sort((a, b) => b.d - a.d)[0].d + ' días).' : '') +
            (pesados.length ? ' ' + pesados.length + ' retiro(s) de más de ' + p2.kg_max + ' kg (el mayor, ' + Math.max.apply(null, pesados.map(f => s.fechas[f])).toFixed(0) + ' kg el ' + txt(pesados[0]) + ').' : ''),
          ref: 'Manifiestos de los últimos ' + p.dias + ' días', origen: 'Regla automática' });
      }
    });
  });

  // 1 · Residuos: certificados faltantes (RES-03)
  corre(['RES-03'], 'Residuos (certificados)', () => {
    const T = resTablero_(!!fresco); if (!T || T.ok === false) throw new Error('no se pudo leer el tablero de residuos');
    const mes = m => { const k = m.split('-'); return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(k[1]) - 1] + ' ' + k[0]; };
    (T.establecimientos || []).forEach(e => { const L = (e.sinCert || []).filter(s => s.nivel === 'er'); if (!L.length) return;
      push({ regla: 'RES-03', cod: e.cod, sitio: '', clave: 'REG|RES-03|' + e.cod, desc: 'Retiros sin certificado de tratamiento cargado: ' + L.map(s => mes(s.mes)).join(', ') + '.', ref: 'Libro general › CERTIFICADOS', origen: 'Regla automática' }); });
  });

  // 2 · Agua NO APTA y 3 · Plagas atrasadas (lo que junta el tablero; claves de la fase 2)
  corre(['AGU-01', 'PLA-01'], 'Agua NO APTA y plagas', () => {
    const T = tbTablero_(!!fresco); if (!T || T.ok === false || !(T.acciones || []).length) throw new Error('no se pudo leer el tablero');
    T.acciones.forEach(a => {
      if (a.origen === 'Agua') push({ regla: 'AGU-01', cod: a.cod, sitio: a.donde, clave: 'AGUA|' + a.cod + '|' + a.ref + '|' + a.limite, desc: 'Agua NO APTA en el punto ' + (a.ref || 's/d'), limite: a.limite, ref: a.ref, origen: 'Análisis de agua', estado: 'En curso', recurso: 'Gestión' });
      else if (/^Plagas/.test(a.origen) && a.vencida) push({ regla: 'PLA-01', cod: a.cod, sitio: a.donde, clave: (a.origen === 'Plagas' ? 'PLAGAS|' : 'MIPYV|') + a.cod + '|' + a.ref, desc: 'Revisión atrasada (desde ' + a.limite + '): ' + a.que, accion: 'Hacer la revisión atrasada y cerrar el caso: ' + a.que, ref: a.ref, origen: 'Caso de plagas', estado: 'En curso', recurso: 'Gestión' });
    });
  });

  // 2 · Agua: análisis y limpieza vencidos, tanque sin tapa (AGU-02, AGU-03, AGU-04)
  corre(['AGU-02', 'AGU-03', 'AGU-04'], 'Agua (análisis, limpieza y tapas)', () => {
    const tol2 = ((RG['AGU-02'] || {}).p || {}).tolerancia || 30, tol3 = ((RG['AGU-03'] || {}).p || {}).tolerancia || 30, lim2 = sumaD(hoy, -tol2), lim3 = sumaD(hoy, -tol3);
    miLeer_('PUNTOS_MUESTREO').filter(regVivo_).filter(x => !/fuera|[uú]nica/i.test(x.ESTADO)).forEach(x => {
      const eq = /equipo|solo f[ií]sico/i.test(x.ESTADO), v = eq ? (x.ULTIMO_FISICOQUIMICO ? miSumarMeses_(x.ULTIMO_FISICOQUIMICO, 12) : '') : x.ULTIMO_BACTERIOLOGICO ? miSumarMeses_(x.ULTIMO_BACTERIOLOGICO, 6) : '';
      if (!v || v >= lim2) return;
      push({ regla: 'AGU-02', cod: x.ESTABLECIMIENTO, sitio: x.SITIO || x.UBICACION, clave: 'REG|AGU-02|' + x.ESTABLECIMIENTO + '|' + x.CODIGO_PUNTO,
        desc: 'Punto ' + x.CODIGO_PUNTO + (x.UBICACION ? ' (' + x.UBICACION + ')' : '') + ': análisis ' + (eq ? 'físico-químico' : 'bacteriológico') + ' vencido el ' + txt(v) + ' (último: ' + txt(eq ? x.ULTIMO_FISICOQUIMICO : x.ULTIMO_BACTERIOLOGICO) + ').', ref: x.CODIGO_PUNTO, origen: 'Análisis de agua' });
    });
    miLeer_('RESERVORIOS').filter(regVivo_).filter(t => !/fuera/i.test(t.ESTADO) && !/riego/i.test(t.USO)).forEach(t => {
      const pr = t.PROXIMA_LIMPIEZA || (t.ULTIMA_LIMPIEZA ? miSumarMeses_(t.ULTIMA_LIMPIEZA, t.FRECUENCIA_LIMPIEZA_MESES || 12) : '');
      if (pr && pr < lim3) push({ regla: 'AGU-03', cod: t.ESTABLECIMIENTO, sitio: t.SITIO || t.UBICACION, clave: 'REG|AGU-03|' + t.ESTABLECIMIENTO + '|' + t.CODIGO_TANQUE,
        desc: 'Tanque ' + t.CODIGO_TANQUE + (t.UBICACION ? ' (' + t.UBICACION + ')' : '') + ': limpieza vencida el ' + txt(pr) + ' (última: ' + txt(t.ULTIMA_LIMPIEZA) + ').', ref: t.CODIGO_TANQUE, origen: 'Relevamiento' });
      if (/^(no\b|sin|rota|da[nñ]ad|falta)/i.test(String(t.TAPA || '').trim())) push({ regla: 'AGU-04', cod: t.ESTABLECIMIENTO, sitio: t.SITIO || t.UBICACION, clave: 'REG|AGU-04|' + t.ESTABLECIMIENTO + '|' + t.CODIGO_TANQUE,
        desc: 'Tanque ' + t.CODIGO_TANQUE + (t.UBICACION ? ' (' + t.UBICACION + ')' : '') + ': tapa «' + t.TAPA + '».', ref: t.CODIGO_TANQUE, origen: 'Relevamiento' });
    });
  });

  // 7 · Incendio (INC-01, INC-02, INC-03)
  corre(['INC-01', 'INC-02'], 'Incendio (extintores)', () => {
    const E = incLeer_('EXTINTORES', INC.H_EXT).filter(e => e.ID && !/baja/i.test(e.ESTADO || '')), ult = {}, fal = {};
    try { incLeer_('CONTROLES', INC.H_CON).forEach(c => { if (!c.ID_EXTINTOR || /anulad/i.test(c.ESTADO || '')) return; const f = incISO_(c.FECHA); if (!ult[c.ID_EXTINTOR] || f >= ult[c.ID_EXTINTOR].f) ult[c.ID_EXTINTOR] = { f: f, c: c }; }); } catch (e) {}
    incFallasAbiertas_().forEach(f => { fal[f.ID_EXTINTOR] = (fal[f.ID_EXTINTOR] ? fal[f.ID_EXTINTOR] + ' · ' : '') + (f.PROBLEMAS || ''); });
    const grupos = {}, nom = e => 'extintor ' + (e.NRO_EXTINTOR || e.ID) + (e.SECTOR || e.UBICACION ? ' (' + [e.PLANTA ? 'planta ' + String(e.PLANTA).toLowerCase() : '', e.SECTOR, e.UBICACION].filter(String).join(', ') + ')' : '');
    E.forEach(e => {
      const cod = limpio_(e.ESTABLECIMIENTO), sitio = limpio_(e.SITIO) || cod, u = ult[e.ID], pr = [];
      if (/fuera de servicio/i.test(e.ESTADO || '')) pr.push('fuera de servicio');
      if (u && u.c.EN_LUGAR === 'No') pr.push('no estaba en su lugar en el control del ' + txt(u.f));
      if (u && u.c.ACCESO_LIBRE === 'No') pr.push('acceso obstruido en el control del ' + txt(u.f));
      const fa = fal[e.ID] || ''; if (/no est[aá] en su lugar/i.test(fa) && !pr.some(x => /lugar/.test(x))) pr.push('no está en su lugar (problema abierto)'); if (/acceso obstruido/i.test(fa) && !pr.some(x => /acceso/.test(x))) pr.push('acceso obstruido (problema abierto)');
      if (pr.length) push({ regla: 'INC-01', cod: cod, sitio: sitio, clave: 'REG|INC-01|' + e.ID, desc: sitio + ', ' + nom(e) + ': ' + pr.join('; ') + '.', ref: e.ID, origen: 'Relevamiento' });
      const v = incISO_(e.VTO_CARGA), ph = incISO_(e.PRUEBA_HIDRAULICA_VENCE), q = [];
      if (v && v < hoy) q.push('carga vencida el ' + txt(v)); if (ph && ph < hoy) q.push('prueba hidráulica vencida el ' + txt(ph));
      if (q.length) (grupos[cod + '|' + sitio] = grupos[cod + '|' + sitio] || { cod: cod, sitio: sitio, l: [] }).l.push(nom(e) + ': ' + q.join(' y '));
    });
    Object.keys(grupos).forEach(k => { const g = grupos[k];
      push({ regla: 'INC-02', cod: g.cod, sitio: g.sitio, clave: 'REG|INC-02|' + k, desc: g.sitio + ': ' + g.l.length + ' extintor(es) vencido(s). ' + g.l.slice(0, 15).join(' · ') + (g.l.length > 15 ? ' · y ' + (g.l.length - 15) + ' más' : '') + '.', ref: 'Inventario de extintores', origen: 'Relevamiento' }); });
  });
  corre(['INC-03'], 'Incendio (recorridas)', () => {
    incLeer_('NOVEDADES_INC', INC_SRV.H_NOV).filter(x => x.ID && !/^resuel/i.test(x.ESTADO || '') && (/recorrida/i.test(x.ORIGEN || '') || x.ID_RECORRIDA)).forEach(x => {
      push({ regla: 'INC-03', cod: limpio_(x.ESTABLECIMIENTO), sitio: x.SECTOR, clave: 'REG|INC-03|' + x.ID, desc: (x.SECTOR ? x.SECTOR + ': ' : '') + (x.TIPO || 'Novedad') + (x.DETALLE ? ' — ' + x.DETALLE : '') + ' (recorrida del ' + txt(incISO_(x.FECHA)) + ').', ref: x.ID, origen: 'Recorrida' }); });
  });

  // 6 · Infraestructura: mediciones y RGRL (INF-01, INF-02, INF-03)
  corre(['INF-01', 'INF-02'], 'Mediciones', () => {
    rgrlMedVigentes_().forEach(m => {
      if (m.estado === 'vencida') push({ regla: 'INF-01', cod: m.cod, sitio: m.lugar, clave: 'REG|INF-01|' + m.id, desc: m.tipo + ' en ' + m.lugar + ': vencida el ' + txt(m.vence) + ' (medición del ' + txt(m.fecha) + ').', ref: m.id, origen: 'Relevamiento', fuente: m.norma });
      if (/^no cumple/i.test(m.resultado || '')) push({ regla: 'INF-02', cod: m.cod, sitio: m.lugar, clave: 'REG|INF-02|' + m.id, desc: m.tipo + ' en ' + m.lugar + ': resultado «No cumple» (medición del ' + txt(m.fecha) + ')' + (m.obs ? '. ' + m.obs : '') + '.', ref: m.id, origen: 'Relevamiento', fuente: m.norma });
    });
  });
  corre(['INF-03'], 'RGRL', () => {
    const U = rgrlResumen_(), ids = {}; U.forEach(u => ids[u.id] = u);
    rgrlLeer_('RGRL_RESPUESTAS', RGRL.H_RESP).filter(o => ids[o.ID_RGRL] && o.RESPUESTA === 'No').forEach(o => { const u = ids[o.ID_RGRL];
      push({ regla: 'INF-03', cod: u.cod, sitio: u.lugar, clave: 'REG|INF-03|' + u.cod + '|' + u.lugar + '|' + o.N, desc: 'RGRL ' + u.lugar + ', condición ' + o.N + ' (' + o.SECCION.toLowerCase() + '): ' + o.CONDICION + ' → No.' + (o.OBSERVACION ? ' ' + o.OBSERVACION : ''),
        accion: 'Regularizar: ' + o.CONDICION.replace(/^¿|\?$/g, ''), limite: o.FECHA_REGULARIZACION || '', ref: u.id + ' · cond. ' + o.N, origen: 'RGRL', fuente: o.NORMATIVA }); });
  });
  return out;
}

// Prefijos de clave de cada regla (para cerrar lo que ya no aparece)
const GREG_PREFIJOS = { 'AGU-01': ['AGUA|'], 'PLA-01': ['PLAGAS|', 'MIPYV|'] };
const gregPrefijos_ = id => GREG_PREFIJOS[id] || ['REG|' + id + '|'];

// Escribe en GES_REGLAS la última revisión y cuántos detectó cada regla
function gregAnotar_(RGL, cuenta, ok) {
  try {
    const sh = gregHoja_(), ahora = gesAhora_(), c1 = GREG.H.indexOf('ULTIMA_REVISION') + 1;
    RGL.forEach(r => { if (!ok[r.ID]) return; sh.getRange(r.fila, c1, 1, 2).setValues([[ahora, cuenta[r.ID] || 0]]); });
  } catch (e) {}
}

// Para el portal: la tabla de reglas con cuántos hallazgos abiertos tiene cada una
function gregDatos_() {
  const RG = gregLeer_(), H = gesLeer_(gesHal_(), GES.H_HAL), A = gesLeer_(gesAcc_(), GES.H_ACC), ab = {};
  const abiertaA = {}; A.forEach(a => { if (GES.ABIERTOS.indexOf(a.ESTADO) >= 0 || a.ESTADO === 'Pendiente de recursos') abiertaA[a.HALLAZGO] = 1; });
  H.forEach(h => { const id = Object.keys(RG.R).find(k => gregPrefijos_(k).some(p => String(h.CLAVE).indexOf(p) === 0)); if (!id) return;
    const o = ab[id] = ab[id] || { abiertos: 0, sugeridos: 0 }; if (h.ESTADO === 'Sugerido') o.sugeridos++; else if (abiertaA[h.ID]) o.abiertos++; });
  return { ok: true, reglas: RG.lista.map(r => { delete r.p; return Object.assign(r, ab[r.ID] || { abiertos: 0, sugeridos: 0 }); }), listas: { modulos: GES.MODULOS, entra: GREG.ENTRA, prioridades: GES.PRIORIDADES } };
}

// Prueba desde el editor: qué detectaría cada regla, sin escribir nada en el plan
function probarReglas() {
  const RG = gregLeer_().R, D = gregDetectar_(RG, false), c = {};
  D.det.forEach(d => c[d.regla] = (c[d.regla] || 0) + 1);
  Logger.log(JSON.stringify(c) + (D.errores.length ? ' · errores: ' + D.errores.join(' · ') : ''));
  D.det.slice(0, 40).forEach(d => Logger.log(d.regla + ' · ' + d.cod + ' · ' + d.desc));
}
