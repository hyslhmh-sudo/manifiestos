/**
 * SISTEMA HyS · MÓDULO 4 · INVESTIGACIÓN DE SINIESTROS Y ESTADÍSTICAS
 *
 * Libro de siniestros (LIBRO ACCIDENTES DE TRABAJO), hojas nuevas:
 *   INVESTIGACIONES        una fila por siniestro investigado (método, forma, agente, zona, naturaleza, conclusión, nota)
 *   HECHOS                 los hechos del árbol de causas, encadenados (cada uno dice de qué hecho es antecedente)
 *   MEDIDAS                las medidas preventivas, con responsable, plazo y estado
 *   LISTAS_INVESTIGACION   listas desplegables y parámetros (se editan acá, sin tocar código)
 *
 * Método (criterio de Higiene y Seguridad, editable en LISTAS_INVESTIGACION):
 *   Árbol de causas  → baja de más de DIAS_ARBOL días · se repite (misma persona, o mismo servicio y misma forma, en
 *                      MESES_REPETIDO meses) · riesgo biológico · o cuando Higiene y Seguridad lo decide.
 *   Investigación breve → el resto, y los in itinere.
 * El árbol se arma como lista de hechos encadenados: se parte de la lesión y, para cada hecho, se pregunta «¿qué fue
 * necesario para que ocurriera?». Cada hecho es Ocasional (algo distinto de lo habitual) o Permanente (estado habitual),
 * y se clasifica en Individuo, Tarea, Material o Medio de trabajo.
 * Causas: cada hecho (salvo la lesión) se marca Primaria (si se elimina, el accidente no ocurre) o Secundaria.
 * Medidas: en orden de prioridad, con la jerarquía de controles (eliminación, sustitución, ingeniería, administrativa, EPP),
 * responsable, fecha de ejecución, fecha de verificación y quién verifica. Tienen que impedir que el accidente se repita,
 * evitar accidentes parecidos y no sumar carga al trabajador.
 * Comunicación: Res. SRT 905/15, Anexo II, ítems 12 y 17: el resultado de la investigación se comunica «de forma fehaciente
 * al empleador» → nota a la DIRECCIÓN (empleador), por Mesa de Entradas. Por intermedio de la Dirección se proponen las
 * acciones correctivas a los servicios que correspondan y se les solicita el plazo de ejecución de cada una (HyS no fija
 * los plazos: los informa cada servicio; cuando se cargan, la medida pasa a «En curso» y se calcula la verificación). Lleva como anexo el informe de investigación con la estructura del modelo de la SRT (Circular GPyC
 * 001/04): codificación, lugar y tarea, hechos, resumen de causas, medidas con ejecución y verificación, seguimiento,
 * entrevistados y profesional responsable. Sin nombre, DNI ni diagnóstico. Borrador numerado HYSL; nunca se envía sola.
 * Cuando se carga la fecha de Mesa de Entradas, las medidas propuestas pasan a «Comunicada».
 *
 * Estadísticas (período elegido, HZT y HMH juntos o por separado). Denominador: trabajadores activos de la BASE DE
 * TRABAJADORES al día de hoy (no hay histórico de la nómina). Índices (definiciones de la SRT):
 *   Incidencia       = casos AT/EP × 1.000 / trabajadores (sin in itinere; in itinere aparte)
 *   Frecuencia       = casos AT/EP con baja × 1.000.000 / horas trabajadas (estimadas: trabajadores × JORNADA_SEMANAL_HS ×
 *                      semanas del período). Sin jornada cargada, queda «s/d (revisar)».
 *   Pérdida          = días de baja × 1.000 / trabajadores
 *   Duración media   = días de baja / casos con baja
 * Rechazados, inculpables y anulados no cuentan como casos; se informan aparte.
 *
 * Normativa: Ley 19.587 y Dto. 351/79; Ley 24.557, arts. 4 y 31 (prevención y obligaciones del empleador); Res. SRT 905/15,
 * Anexo I pto. 13 (estadísticas) y Anexo II pto. 12 (investigación de los accidentes); Res. SRT 3326/14 (registro de
 * siniestros); Ley 25.326 (los datos de salud no salen en la nota). Ley XXII N.º 50 (Autoseguro Público Provincial).
 * No envía correos. No borra filas: lo que se quita queda «Anulado».
 */

const INV = {
  HOJA: 'INVESTIGACIONES', HECHOS: 'HECHOS', MEDIDAS: 'MEDIDAS', LISTAS: 'LISTAS_INVESTIGACION',
  LOGO_PIE: '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN'   // logo HySL (Drive › SISTEMA HyS › logo-hysl-pie.png)
};
const INV_H = ['ID', 'ID_SINIESTRO', 'NRO_SINIESTRO', 'ESTABLECIMIENTO', 'METODO', 'MOTIVO', 'FECHA_INICIO', 'FECHA_CIERRE', 'LUGAR_EXACTO', 'TAREA',
  'DESCRIPCION', 'FORMA', 'AGENTE_MATERIAL', 'ZONA_CUERPO', 'NATURALEZA_LESION', 'ENTREVISTADOS', 'CONCLUSION', 'NOTA_CODIGO', 'NOTA_DOC', 'ESTADO',
  'INVESTIGO', 'ACTUALIZADO', 'OBSERVACIONES', 'TURNO', 'SUPERVISION', 'MESA_ENTRADAS'];
const HEC_H = ['ID', 'ID_INV', 'ID_SINIESTRO', 'ORDEN', 'HECHO', 'TIPO', 'CATEGORIA', 'ANTECEDENTE_DE', 'ESTADO', 'CARGADO', 'CAUSA'];
const MED_H = ['ID', 'ID_INV', 'ID_SINIESTRO', 'ID_HECHO', 'MEDIDA', 'NIVEL', 'RESPONSABLE', 'PLAZO', 'ESTADO', 'COMUNICADA', 'VERIFICADA', 'OBSERVACIONES', 'CARGADO', 'PRIORIDAD', 'FECHA_VERIFICACION', 'VERIFICA'];

// Listas iniciales (se cambian en la hoja; la clasificación de forma, agente, zona y naturaleza sigue la de la OIT que usa
// la SRT, con los casos propios de un hospital agregados)
const INV_LISTAS = {
  METODO: ['Árbol de causas', 'Investigación breve'],
  MOTIVO: ['Baja de más de 15 días', 'Se repite', 'Riesgo biológico', 'Decisión de HyS', 'In itinere', 'Sin criterio de árbol'],
  ESTADO_INVESTIGACION: ['En curso', 'Cerrada', 'Anulada'],
  FORMA: ['Caída de personas a distinto nivel', 'Caída de personas al mismo nivel', 'Caída de objetos', 'Pisada sobre, choque contra o golpe por objetos',
    'Atrapamiento', 'Esfuerzo excesivo o falso movimiento', 'Movilización de pacientes', 'Pinchazo o corte con elemento cortopunzante',
    'Salpicadura o contacto con fluidos biológicos', 'Exposición a sustancias químicas', 'Exposición a radiaciones', 'Exposición a temperaturas extremas o contacto',
    'Contacto con la corriente eléctrica', 'Agresión o violencia de terceros', 'Mordedura o picadura', 'Accidente de tránsito', 'Otra forma', 's/d (revisar)'],
  AGENTE_MATERIAL: ['Paciente', 'Elemento cortopunzante (aguja, bisturí, lanceta)', 'Fluido o material biológico', 'Camilla, cama, silla de ruedas o carro',
    'Pisos, escaleras, rampas o superficies', 'Mobiliario', 'Equipos e instrumental médico', 'Máquinas y herramientas', 'Productos químicos (limpieza, desinfección, laboratorio)',
    'Gases medicinales o recipientes a presión', 'Instalación eléctrica', 'Equipos de rayos X o fuentes radiactivas', 'Agua, vapor o superficies calientes',
    'Vehículo en la vía pública', 'Persona ajena (familiar, público)', 'Animal', 'Otro agente', 's/d (revisar)'],
  ZONA_CUERPO: ['Cabeza', 'Ojos', 'Cuello', 'Tronco (tórax, abdomen)', 'Espalda y columna', 'Hombro y brazo', 'Codo y antebrazo', 'Mano y muñeca', 'Dedos de la mano',
    'Cadera y muslo', 'Rodilla y pierna', 'Tobillo y pie', 'Ubicaciones múltiples', 'Lesión general (sin zona)', 's/d (revisar)'],
  NATURALEZA_LESION: ['Herida punzante o cortante', 'Contusión o traumatismo superficial', 'Esguince o torcedura', 'Fractura', 'Luxación', 'Lumbalgia o lesión musculoesquelética',
    'Quemadura', 'Exposición a material biológico sin lesión visible', 'Intoxicación', 'Cuerpo extraño', 'Lesiones múltiples', 'Afección psíquica', 'Otra', 's/d (revisar)'],
  TIPO_HECHO: ['Ocasional', 'Permanente'],
  CAUSA_HECHO: ['Primaria', 'Secundaria'],
  TURNO: ['Mañana', 'Tarde', 'Noche', 'Guardia de 24 h', 's/d (revisar)'],
  CATEGORIA_HECHO: ['Individuo', 'Tarea', 'Material', 'Medio de trabajo', 'Organización'],
  NIVEL_MEDIDA: ['Eliminación', 'Sustitución', 'Control de ingeniería', 'Control administrativo', 'Elemento de protección personal'],
  ESTADO_MEDIDA: ['Propuesta', 'Comunicada', 'En curso', 'Cumplida', 'No cumplida', 'Anulada']
};
const INV_PARAM = { DIAS_ARBOL: 15, MESES_REPETIDO: 12, JORNADA_SEMANAL_HS: 's/d (revisar)', DIAS_PLAZO_MEDIDA: 30, DIAS_VERIFICACION: 15, DIAS_RESPUESTA_NOTA: 10 };
const INV_PARAM_AYUDA = {
  DIAS_ARBOL: 'Con más de estos días de baja, el sistema sugiere árbol de causas',
  MESES_REPETIDO: 'Si la persona tuvo otro siniestro en estos meses (o el servicio, con la misma forma), sugiere árbol de causas',
  JORNADA_SEMANAL_HS: 'Horas semanales por trabajador según el CCT de Salud (para estimar las horas trabajadas del índice de frecuencia)',
  DIAS_PLAZO_MEDIDA: 'Sin uso desde la versión 14.2: el plazo de cada medida lo informa el servicio responsable',
  DIAS_VERIFICACION: 'Días después del plazo de ejecución en que HyS verifica la medida (fecha de verificación propuesta)',
  DIAS_RESPUESTA_NOTA: 'Días hábiles que la nota le da a la Dirección para responder la conformidad y las fechas de ejecución'
};

// ------------------------------------------------------------------ Armado (ejecutar una vez; se puede repetir)
function armarInvestigacionSiniestros() {
  const ss = accLibro_(); if (!ss) return Logger.log('Falta el libro de siniestros: ejecutá armarModuloPersonal y actualizarLibroSiniestros.');
  const AZ = '#0D313F', CEL = '#5894A7', log = [];
  const cab = (sh, H, titulo, ayuda) => {
    sh.getRange(1, 1).setValue(titulo).setFontSize(14).setFontWeight('bold').setFontColor(AZ);
    sh.getRange(2, 1).setValue(ayuda).setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, H.length).setValues([H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground(AZ);
    sh.setFrozenRows(5);
  };
  const nueva = (nombre, H, titulo, ayuda) => { let sh = ss.getSheetByName(nombre); if (sh) { log.push(nombre + ': ya estaba'); return { sh: sh, nueva: false }; }
    sh = ss.insertSheet(nombre); cab(sh, H, titulo, ayuda); log.push(nombre + ': creada'); return { sh: sh, nueva: true }; };

  // Listas y parámetros
  const L = nueva(INV.LISTAS, Object.keys(INV_LISTAS).concat(['', 'PARAMETRO', 'VALOR', 'PARA QUÉ SIRVE']), 'Listas y parámetros de la investigación',
    'Cada columna es una lista desplegable de INVESTIGACIONES, HECHOS y MEDIDAS. Se puede agregar o cambiar un valor al final de la columna. Los parámetros (a la derecha) se cambian sin tocar código.');
  if (L.nueva) {
    const ks = Object.keys(INV_LISTAS), n = Math.max.apply(null, ks.map(k => INV_LISTAS[k].length));
    L.sh.getRange(6, 1, n, ks.length).setValues(Array.from({ length: n }, (_, i) => ks.map(k => INV_LISTAS[k][i] || '')));
    const pk = Object.keys(INV_PARAM), c0 = ks.length + 2;
    L.sh.getRange(6, c0, pk.length, 3).setValues(pk.map(k => [k, INV_PARAM[k], INV_PARAM_AYUDA[k]]));
    L.sh.getRange(5, ks.length + 1).setBackground('#FFFFFF');
    L.sh.getRange(6, c0 + 1, pk.length, 1).setBackground('#EEF4F6');
    L.sh.setColumnWidths(1, ks.length, 190); L.sh.setColumnWidth(c0, 190); L.sh.setColumnWidth(c0 + 2, 520);
  }
  else invCompletarListas_(L.sh, log);
  CacheService.getScriptCache().remove('inv_listas');
  const lst = invListas_(ss);
  const lista = (sh, H, col, vals) => sh.getRange(6, H.indexOf(col) + 1, 3000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(true).build());

  const I = nueva(INV.HOJA, INV_H, 'Investigaciones de siniestros',
    'Una fila por siniestro investigado. Se carga desde el panel (4 · Personal y RAR › Siniestros › Investigar) o acá. No borrar filas: una investigación equivocada se marca «Anulada» en ESTADO.');
  if (I.nueva) { lista(I.sh, INV_H, 'METODO', lst.METODO); lista(I.sh, INV_H, 'MOTIVO', lst.MOTIVO); lista(I.sh, INV_H, 'ESTADO', lst.ESTADO_INVESTIGACION);
    ['FORMA', 'AGENTE_MATERIAL', 'ZONA_CUERPO', 'NATURALEZA_LESION'].forEach(c => lista(I.sh, INV_H, c, lst[c]));
    I.sh.getRange(6, INV_H.indexOf('NRO_SINIESTRO') + 1, 3000, 1).setNumberFormat('@'); }
  const Hh = nueva(INV.HECHOS, HEC_H, 'Hechos del árbol de causas',
    'Un hecho por fila. ANTECEDENTE_DE: el ID del hecho que este provocó (vacío = la lesión, que es el final del árbol). TIPO: Ocasional (distinto de lo habitual) o Permanente (estado habitual). No borrar filas: ESTADO = Anulado.');
  if (Hh.nueva) { lista(Hh.sh, HEC_H, 'TIPO', lst.TIPO_HECHO); lista(Hh.sh, HEC_H, 'CATEGORIA', lst.CATEGORIA_HECHO); lista(Hh.sh, HEC_H, 'ESTADO', ['Vigente', 'Anulado']); }
  const M = nueva(INV.MEDIDAS, MED_H, 'Medidas preventivas',
    'Una medida por fila, con su nivel en la jerarquía de controles, responsable, plazo y estado. COMUNICADA: número de la nota y fecha. VERIFICADA: fecha y resultado de la verificación de HyS. No borrar filas: ESTADO = Anulada.');
  if (M.nueva) { lista(M.sh, MED_H, 'NIVEL', lst.NIVEL_MEDIDA); lista(M.sh, MED_H, 'ESTADO', lst.ESTADO_MEDIDA); }
  // Columnas nuevas (versión 14.1) al final de cada hoja, con sus listas
  invColumnas_(I.sh, INV_H); invColumnas_(Hh.sh, HEC_H); invColumnas_(M.sh, MED_H);
  const HI = invCab_(I.sh), HHc = invCab_(Hh.sh), HM = invCab_(M.sh);
  lista(I.sh, HI, 'TURNO', lst.TURNO); lista(Hh.sh, HHc, 'CAUSA', lst.CAUSA_HECHO);
  HM.forEach((h, j) => { if (h === 'FECHA_VERIFICACION') M.sh.getRange(6, j + 1, 3000, 1).setNumberFormat('dd/MM/yyyy'); });
  HI.forEach((h, j) => { if (h === 'MESA_ENTRADAS') I.sh.getRange(6, j + 1, 3000, 1).setNumberFormat('dd/MM/yyyy'); });

  // INICIO: dos líneas más de ayuda
  const ini = ss.getSheetByName('INICIO');
  if (ini && String(ini.getRange(16, 1).getValue()).indexOf('Investigación') < 0) {
    ini.getRange(16, 1, 3, 1).setValues([['Investigación (Higiene y Seguridad)'],
      ['INVESTIGACIONES, HECHOS y MEDIDAS: las carga Higiene y Seguridad desde el panel. Árbol de causas cuando la baja supera 15 días, se repite o hay riesgo biológico; investigación breve en el resto y en los in itinere. Las medidas se comunican con una nota (Google Docs) que arma el sistema como borrador.'],
      ['LISTAS_INVESTIGACION: listas desplegables y parámetros (días para el árbol, meses para «se repite», jornada semanal del CCT para el índice de frecuencia).']]);
    ini.getRange(16, 1).setFontWeight('bold').setFontColor(AZ); ini.getRange(16, 1, 3, 1).setWrap(true);
  }
  CacheService.getScriptCache().remove('inv_listas');
  Logger.log('Listo. ' + log.join(' · ') + '. Completá JORNADA_SEMANAL_HS en ' + INV.LISTAS + ' (horas semanales del CCT de Salud) para el índice de frecuencia. Libro: ' + ss.getUrl());
}

// Columnas que faltan en una hoja (se agregan al final, sin mover nada) y encabezados reales
function invColumnas_(sh, H) {
  const R = invCab_(sh);
  H.forEach(h => { if (R.indexOf(h) < 0) { if (R.length + 1 > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(5, R.length + 1).setValue(h).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F'); R.push(h); } });
  return R;
}
const invCab_ = sh => sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
// Listas y parámetros nuevos en una LISTAS_INVESTIGACION que ya existía (no toca lo que ya está)
function invCompletarListas_(sh, log) {
  let H = invCab_(sh);
  const jP = H.indexOf('PARAMETRO');
  Object.keys(INV_LISTAS).forEach(k => { if (H.indexOf(k) >= 0) return;
    const col = jP >= 0 ? jP : H.length;   // las listas nuevas van antes del bloque de parámetros
    sh.insertColumnBefore(col + 1); sh.getRange(5, col + 1).setValue(k).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.getRange(6, col + 1, INV_LISTAS[k].length, 1).setValues(INV_LISTAS[k].map(v => [v])); sh.setColumnWidth(col + 1, 190);
    log.push(k + ': lista agregada'); H = invCab_(sh); });
  H = invCab_(sh); const p = H.indexOf('PARAMETRO'), v = p >= 0 && sh.getLastRow() >= 6 ? sh.getRange(6, p + 1, sh.getLastRow() - 5, 1).getValues().map(r => String(r[0]).trim()) : [];
  if (p >= 0) Object.keys(INV_PARAM).forEach(k => { if (v.indexOf(k) >= 0) return;
    const fila = 6 + v.filter(Boolean).length; sh.getRange(fila, p + 1, 1, 3).setValues([[k, INV_PARAM[k], INV_PARAM_AYUDA[k]]]); v.push(k); log.push(k + ': parámetro agregado'); });
}

// ------------------------------------------------------------------ Listas y parámetros
function invListas_(ss) {
  const c = CacheService.getScriptCache(), ya = c.get('inv_listas'); if (ya) return JSON.parse(ya);
  const out = JSON.parse(JSON.stringify(INV_LISTAS)), P = Object.assign({}, INV_PARAM);
  const sh = (ss || accLibro_()).getSheetByName(INV.LISTAS);
  if (sh && sh.getLastRow() >= 6) {
    const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim()), v = sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues();
    H.forEach((h, j) => { if (INV_LISTAS[h]) { const l = v.map(r => String(r[j]).trim()).filter(Boolean); if (l.length) out[h] = l; } });
    const jP = H.indexOf('PARAMETRO'), jV = H.indexOf('VALOR');
    if (jP >= 0 && jV >= 0) v.forEach(r => { const k = String(r[jP]).trim(); if (k in P && String(r[jV]).trim() !== '') P[k] = r[jV]; });
  }
  out._param = P;
  try { c.put('inv_listas', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
const invNum_ = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) || String(v).trim() === '' ? null : n; };
function invHoja_(ss, nombre) { const sh = ss.getSheetByName(nombre); if (!sh) throw new Error('Falta la hoja ' + nombre + ': ejecutá armarInvestigacionSiniestros.'); return sh; }

// ------------------------------------------------------------------ Criterio: árbol de causas o investigación breve
// s: siniestro (fila de SINIESTROS) · todos: todos los siniestros · inv: investigación ya cargada (para forma y agente)
function invCriterio_(s, todos, inv, P) {
  const motivos = [], tipo = String(s.TIPO), fecha = accIso_(s.FECHA_ACCIDENTE), dias = Number(s.DIAS_BAJA) || 0;
  const dArbol = invNum_(P.DIAS_ARBOL) || 15, meses = invNum_(P.MESES_REPETIDO) || 12;
  if (dias > dArbol) motivos.push('Baja de más de ' + dArbol + ' días (lleva ' + dias + ')');
  const txt = [s.CIE10, s.DIAGNOSTICO, inv && inv.FORMA, inv && inv.AGENTE_MATERIAL, inv && inv.NATURALEZA_LESION].join(' ');
  if (/^\s*(W46|Z20|Z57\.8)/i.test(String(s.CIE10 || '')) || /pinchazo|cortopunzante|aguja|salpicadura|biol[oó]gic|fluido|hepatitis|VIH|HIV|tubercul/i.test(txt)) motivos.push('Riesgo biológico');
  const desde = fecha ? new Date(fecha + 'T12:00:00') : null; if (desde) desde.setMonth(desde.getMonth() - meses);
  const lim = desde ? Utilities.formatDate(desde, TZ, 'yyyy-MM-dd') : '';
  const previos = todos.filter(o => o.ID !== s.ID && o.ESTADO_HYS !== 'Anulado' && accIso_(o.FECHA_ACCIDENTE) <= fecha && accIso_(o.FECHA_ACCIDENTE) >= lim);
  const mismaPersona = previos.filter(o => String(o.DNI) === String(s.DNI) && String(s.DNI));
  if (mismaPersona.length) motivos.push('La persona tuvo otro siniestro en los últimos ' + meses + ' meses (' + mismaPersona.map(o => o.NRO_SINIESTRO).join(', ') + ')');
  if (inv && inv.FORMA && !/s\/d/.test(inv.FORMA)) {
    const formas = invFormas_();
    const mismoServ = previos.filter(o => String(o.SERVICIO) === String(s.SERVICIO) && String(s.SERVICIO) && !/s\/d/i.test(String(s.SERVICIO)) && formas[o.ID] === inv.FORMA);
    if (mismoServ.length) motivos.push('Se repite en el servicio con la misma forma (' + mismoServ.map(o => o.NRO_SINIESTRO).join(', ') + ')');
  }
  const arbol = motivos.length > 0;
  if (/itinere/i.test(tipo) && !arbol) return { metodo: 'Investigación breve', motivo: 'In itinere', motivos: ['In itinere: investigación breve'] };
  return { metodo: arbol ? 'Árbol de causas' : 'Investigación breve', motivo: !arbol ? 'Sin criterio de árbol' : /^Baja/.test(motivos[0]) ? 'Baja de más de 15 días' : /biol/.test(motivos[0]) ? 'Riesgo biológico' : 'Se repite',
    motivos: motivos.length ? motivos : ['Sin baja larga, sin repetición y sin riesgo biológico: investigación breve'] };
}
function invFormas_() {   // forma de cada siniestro ya investigado
  const ss = accLibro_(), sh = ss.getSheetByName(INV.HOJA), out = {}; if (!sh) return out;
  accLeer_(sh).filter(r => r.ESTADO !== 'Anulada').forEach(r => out[r.ID_SINIESTRO] = String(r.FORMA || ''));
  return out;
}

// ------------------------------------------------------------------ Panel: abrir la investigación de un siniestro (p_inv_abrir)
function invAbrir_(x) {
  const ss = accLibro_(); if (!ss) return { ok: false, mensaje: 'El libro de siniestros no está armado.' };
  if (!ss.getSheetByName(INV.HOJA)) return { ok: false, mensaje: 'Falta armar la investigación: ejecutá armarInvestigacionSiniestros en Apps Script.' };
  const todos = accLeer_(accHoja_(ss)), s = todos.find(r => r.ID === x.id); if (!s) return { ok: false, mensaje: 'No se encontró el siniestro.' };
  const L = invListas_(ss), P = L._param;
  const inv = accLeer_(invHoja_(ss, INV.HOJA)).find(r => r.ID_SINIESTRO === s.ID && r.ESTADO !== 'Anulada') || null;
  const hechos = inv ? accLeer_(invHoja_(ss, INV.HECHOS)).filter(h => h.ID_INV === inv.ID && h.ESTADO !== 'Anulado').sort((a, b) => Number(a.ORDEN) - Number(b.ORDEN)) : [];
  const medidas = inv ? accLeer_(invHoja_(ss, INV.MEDIDAS)).filter(m => m.ID_INV === inv.ID && m.ESTADO !== 'Anulada') : [];
  const crit = invCriterio_(s, todos, inv, P);
  const otros = todos.filter(o => o.ID !== s.ID && o.ESTADO_HYS !== 'Anulado' && ((String(o.DNI) === String(s.DNI) && String(s.DNI)) || (String(o.SERVICIO) === String(s.SERVICIO) && String(s.SERVICIO) && !/s\/d/i.test(String(s.SERVICIO)))))
    .map(o => ({ id: o.ID, nro: o.NRO_SINIESTRO, fecha: accIso_(o.FECHA_ACCIDENTE), tipo: o.TIPO, mismaPersona: String(o.DNI) === String(s.DNI) })).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12);
  const limpia = o => { if (!o) return null; const r = {}; Object.keys(o).forEach(k => { if (k !== '_fila') r[k] = o[k]; }); return r; };
  return { ok: true, siniestro: { id: s.ID, nro: s.NRO_SINIESTRO, tipo: s.TIPO, fecha: accIso_(s.FECHA_ACCIDENTE), hora: s.HORA, est: s.ESTABLECIMIENTO, sitio: s.SITIO, nombre: s.APELLIDO_Y_NOMBRE,
      servicio: s.SERVICIO, funcion: s.FUNCION, dias: s.DIAS_BAJA, estado: s.ESTADO, estadoHys: s.ESTADO_HYS },
    criterio: crit, inv: limpia(inv), hechos: hechos.map(limpia), medidas: medidas.map(limpia), otros: otros, listas: L, param: P, hoy: accHoy_() };
}

// ------------------------------------------------------------------ Panel: guardar (p_inv_guardar)
// x: { id (siniestro), inv: {...}, hechos: [{ID?, HECHO, TIPO, CATEGORIA, ANTECEDENTE_DE (ID o «n» de un hecho nuevo)}], medidas: [{ID?, ...}] }
// Lo que estaba y ya no viene queda Anulado. Los hechos nuevos llegan con ID «n1», «n2»… y el sistema les pone el definitivo.
function invGuardar_(x) {
  return conLock_(() => {
    const ss = accLibro_(), S = accHoja_(ss), s = accLeer_(S).find(r => r.ID === x.id); if (!s) return { ok: false, mensaje: 'No se encontró el siniestro.' };
    const I = invHoja_(ss, INV.HOJA), HH = invHoja_(ss, INV.HECHOS), MM = invHoja_(ss, INV.MEDIDAS), ahora = accAhora_(), y = x.inv || {};
    const quien = 'Higiene y Seguridad', estado = /^Cerrad/.test(String(y.ESTADO)) ? 'Cerrada' : 'En curso';
    let inv = accLeer_(I).find(r => r.ID_SINIESTRO === s.ID && r.ESTADO !== 'Anulada');
    const idInv = inv ? inv.ID : 'INV-' + s.ID;
    const datos = { ID: idInv, ID_SINIESTRO: s.ID, NRO_SINIESTRO: s.NRO_SINIESTRO, ESTABLECIMIENTO: s.ESTABLECIMIENTO, METODO: y.METODO || '', MOTIVO: y.MOTIVO || '',
      FECHA_INICIO: y.FECHA_INICIO || (inv && inv.FECHA_INICIO) || accHoy_(), FECHA_CIERRE: estado === 'Cerrada' ? (y.FECHA_CIERRE || (inv && inv.FECHA_CIERRE) || accHoy_()) : '',
      LUGAR_EXACTO: y.LUGAR_EXACTO || '', TAREA: y.TAREA || '', DESCRIPCION: y.DESCRIPCION || '', FORMA: y.FORMA || '', AGENTE_MATERIAL: y.AGENTE_MATERIAL || '',
      ZONA_CUERPO: y.ZONA_CUERPO || '', NATURALEZA_LESION: y.NATURALEZA_LESION || '', ENTREVISTADOS: y.ENTREVISTADOS || '', CONCLUSION: y.CONCLUSION || '',
      NOTA_CODIGO: inv ? inv.NOTA_CODIGO : '', NOTA_DOC: inv ? inv.NOTA_DOC : '', ESTADO: estado, INVESTIGO: y.INVESTIGO || (inv && inv.INVESTIGO) || 'Belén Pellegrini',
      ACTUALIZADO: ahora, OBSERVACIONES: y.OBSERVACIONES || (inv && inv.OBSERVACIONES) || '', TURNO: y.TURNO || '', SUPERVISION: y.SUPERVISION || '',
      MESA_ENTRADAS: y.MESA_ENTRADAS || '' };
    invPoner_(I, INV_H, inv ? inv._fila : 0, datos);

    // Hechos: los nuevos reciben ID definitivo; las referencias «n…» se traducen
    const viejosH = accLeer_(HH).filter(h => h.ID_INV === idInv && h.ESTADO !== 'Anulado');
    let n = accLeer_(HH).filter(h => h.ID_INV === idInv).length;
    const mapa = {};
    (x.hechos || []).forEach(h => { if (!h.ID || /^n\d+$/.test(h.ID)) { n++; mapa[h.ID || ('n' + n)] = idInv + '-H' + ('0' + n).slice(-2); } else mapa[h.ID] = h.ID; });
    const vienen = {};
    (x.hechos || []).forEach((h, i) => {
      const id = mapa[h.ID || ''] || h.ID; vienen[id] = true;
      const ant = String(h.ANTECEDENTE_DE || '').split(/[,;\s]+/).filter(Boolean).map(a => mapa[a] || a).join(', ');
      const ya = viejosH.find(v => v.ID === id);
      invPoner_(HH, HEC_H, ya ? ya._fila : 0, { ID: id, ID_INV: idInv, ID_SINIESTRO: s.ID, ORDEN: i + 1, HECHO: String(h.HECHO || '').trim(), TIPO: h.TIPO || '', CATEGORIA: h.CATEGORIA || '',
        ANTECEDENTE_DE: ant, ESTADO: 'Vigente', CARGADO: ya ? ya.CARGADO : ahora, CAUSA: ant ? (h.CAUSA || '') : '' });
    });
    viejosH.filter(v => !vienen[v.ID]).forEach(v => accCelda_(HH, v._fila, 'ESTADO', 'Anulado'));

    // Medidas
    const P = invListas_(ss)._param, plazoDef = invNum_(P.DIAS_PLAZO_MEDIDA) || 30, verifDef = invNum_(P.DIAS_VERIFICACION) || 15;
    const mesa = String(y.MESA_ENTRADAS || '').slice(0, 10), notaCod = inv && inv.NOTA_CODIGO;
    const serv0 = s.SERVICIO && !/s\/d/i.test(String(s.SERVICIO)) ? String(s.SERVICIO) : 's/d (revisar)';
    const viejasM = accLeer_(MM).filter(m => m.ID_INV === idInv && m.ESTADO !== 'Anulada');
    let k = accLeer_(MM).filter(m => m.ID_INV === idInv).length;
    const vienenM = {};
    (x.medidas || []).filter(m => String(m.MEDIDA || '').trim()).forEach(m => {
      let id = m.ID; if (!id || /^n\d+$/.test(id)) { k++; id = idInv + '-M' + ('0' + k).slice(-2); }
      vienenM[id] = true;
      const ya = viejasM.find(v => v.ID === id);
      // El plazo lo informa el servicio responsable (por intermedio de la Dirección); con el plazo, se propone la verificación
      const plazo = String(m.PLAZO || '').slice(0, 10);
      let verif = String(m.FECHA_VERIFICACION || '').slice(0, 10); if (!verif && plazo) { const d = new Date(plazo + 'T12:00:00'); d.setDate(d.getDate() + verifDef); verif = Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
      // Con la nota ingresada por Mesa de Entradas, las medidas propuestas quedan comunicadas; con el plazo del servicio, en curso
      let est = m.ESTADO || 'Propuesta', com = m.COMUNICADA || (ya ? ya.COMUNICADA : '');
      if (mesa && notaCod && est === 'Propuesta') { est = 'Comunicada'; com = 'Nota ' + notaCod + ' · Mesa de Entradas ' + accFTxt_(mesa); }
      if (plazo && est === 'Comunicada' && !(ya && accIso_(ya.PLAZO))) est = 'En curso';
      invPoner_(MM, MED_H, ya ? ya._fila : 0, { ID: id, ID_INV: idInv, ID_SINIESTRO: s.ID, ID_HECHO: mapa[m.ID_HECHO] || m.ID_HECHO || '', MEDIDA: String(m.MEDIDA).trim(), NIVEL: m.NIVEL || '',
        RESPONSABLE: m.RESPONSABLE || serv0, PLAZO: plazo, ESTADO: est, COMUNICADA: com, VERIFICADA: m.VERIFICADA || (ya ? ya.VERIFICADA : ''),
        OBSERVACIONES: m.OBSERVACIONES || '', CARGADO: ya ? ya.CARGADO : ahora, PRIORIDAD: Number(m.PRIORIDAD) || '', FECHA_VERIFICACION: verif, VERIFICA: m.VERIFICA || 'Higiene y Seguridad Laboral' });
    });
    viejasM.filter(v => !vienenM[v.ID]).forEach(v => accCelda_(MM, v._fila, 'ESTADO', 'Anulada'));
    // La nota pasa a «Emitido» en el registro de documentos cuando entra por Mesa de Entradas
    if (mesa && notaCod && (!inv || String(inv.MESA_ENTRADAS || '').slice(0, 10) !== mesa)) try { docActualizar_({ codigo: notaCod, estado: 'Emitido', motivo: 'Mesa de Entradas ' + accFTxt_(mesa) }); } catch (e) {}

    // El siniestro queda «Analizado» cuando la investigación se cierra
    accCelda_(S, s._fila, 'ESTADO_HYS', estado === 'Cerrada' ? 'Analizado' : 'Pendiente de análisis');
    CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero']);
    return Object.assign(invAbrir_({ id: s.ID }), { guardado: true });
  });
}
// Escribe una fila por nombre de columna (fila 0 = nueva, al final)
function invPoner_(sh, H, fila, o) {
  if (!fila) return accEscribir_(sh, H, o);
  const R = invColumnas_(sh, H), act = sh.getRange(fila, 1, 1, R.length).getValues()[0];
  sh.getRange(fila, 1, 1, R.length).setValues([R.map((h, j) => h in o ? (o[h] == null ? '' : o[h]) : act[j])]);
}

// ------------------------------------------------------------------ Árbol: hechos ordenados desde la lesión hacia atrás
// Devuelve [{ nivel, h }] para mostrar con sangrías. Un hecho que es antecedente de varios aparece bajo cada uno.
function invArbol_(hechos) {
  const hijos = {}, raices = [];
  hechos.forEach(h => { const ant = String(h.ANTECEDENTE_DE || '').split(/[,;\s]+/).filter(Boolean);
    if (!ant.length) raices.push(h); else ant.forEach(a => (hijos[a] = hijos[a] || []).push(h)); });
  const out = [], visto = {};
  const ir = (h, nivel, camino) => { out.push({ nivel: nivel, h: h }); visto[h.ID] = true;
    (hijos[h.ID] || []).forEach(c => { if (camino.indexOf(c.ID) < 0) ir(c, nivel + 1, camino.concat(c.ID)); }); };
  raices.forEach(r => ir(r, 0, [r.ID]));
  hechos.filter(h => !visto[h.ID]).forEach(h => out.push({ nivel: 0, h: h, suelto: true }));   // sin conexión con la lesión: revisar
  return out;
}

// ------------------------------------------------------------------ Nota de medidas (Google Docs, borrador) (p_inv_nota)
// Va a la Dirección (empleador; Res. SRT 905/15, Anexo II, ítems 12 y 17): por su intermedio se proponen las acciones a los
// servicios y se les piden los plazos. Lleva como anexo el informe de investigación. No lleva nombre, DNI ni diagnóstico (Ley 25.326).
function invNota_(x) {
  const ss = accLibro_(), todos = accLeer_(accHoja_(ss)), s = todos.find(r => r.ID === x.id); if (!s) return { ok: false, mensaje: 'No se encontró el siniestro.' };
  const I = invHoja_(ss, INV.HOJA), inv = accLeer_(I).find(r => r.ID_SINIESTRO === s.ID && r.ESTADO !== 'Anulada');
  if (!inv) return { ok: false, mensaje: 'Primero guardá la investigación.' };
  const hechos = accLeer_(invHoja_(ss, INV.HECHOS)).filter(h => h.ID_INV === inv.ID && h.ESTADO !== 'Anulado').sort((a, b) => Number(a.ORDEN) - Number(b.ORDEN));
  const MM = invHoja_(ss, INV.MEDIDAS), medidas = accLeer_(MM).filter(m => m.ID_INV === inv.ID && m.ESTADO !== 'Anulada');
  if (!medidas.length) return { ok: false, mensaje: 'La nota comunica medidas: cargá al menos una.' };
  const cfg = infConfig_(), C = cfg.C, hoy = accHoyTxt_(), est = String(s.ESTABLECIMIENTO || 'HZT');

  // Sin número del sistema (12/10/2026): las notas las numera el hospital (Mesa de Entradas). Si ya hubo una nota, esta es una revisión.
  const revM = /Rev\. (\d+)/.exec(String(inv.NOTA_CODIGO || '')), revision = inv.NOTA_DOC ? (revM ? Number(revM[1]) + 1 : 1) : 0, anioN = accHoy_().slice(0, 4);
  const codigo = 'Borrador' + (revision ? ' · Rev. ' + revision : ''), nroNota = 'Nota interna N.º ______ / ' + anioN;

  const base = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty(MOD4.P_FOTOS)), vieja = audCarpetaEst_(miGrupo_(est).dueno) || audCarpetaEst_(est);
  const carpeta = carpeta_(carpeta_(carpeta_(base, vieja ? vieja.getName() : est), String(accIso_(s.FECHA_ACCIDENTE)).slice(0, 4) || accHoy_().slice(0, 4)), 'Notas de medidas');
  const titulo = 'Nota · Investigación y medidas · ' + s.NRO_SINIESTRO + (revision ? ' · Rev. ' + revision : '');
  const doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta);
  const b = doc.getBody(); b.clear();
  b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(60).setMarginBottom(70).setMarginLeft(62).setMarginRight(57);
  const at = {}; at[DocumentApp.Attribute.FONT_FAMILY] = INF2.FUENTE; at[DocumentApp.Attribute.FONT_SIZE] = 10.5; at[DocumentApp.Attribute.FOREGROUND_COLOR] = INF2.TEXTO; b.setAttributes(at);
  const P = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); infEst_(p, o.tam || 10.5, o.color || INF2.TEXTO, o.neg);
    p.setAlignment(o.izq ? DocumentApp.HorizontalAlignment.LEFT : o.der ? DocumentApp.HorizontalAlignment.RIGHT : DocumentApp.HorizontalAlignment.JUSTIFY).setLineSpacing(o.inter || 1.5).setSpacingAfter(o.desp == null ? 6 : o.desp).setSpacingBefore(o.antes || 0); return p; };
  const H3 = t => { const p = b.appendParagraph(t); p.setHeading(DocumentApp.ParagraphHeading.HEADING3); infEst_(p, 11, INF2.AZUL, true); p.setSpacingBefore(12).setSpacingAfter(4).setLineSpacing(1.15); return p; };

  // Encabezado y pie (logo HySL centrado y número de documento)
  const enc = doc.addHeader(), pe = enc.getChild(0).asParagraph();
  pe.setText('SERVICIO DE HIGIENE Y SEGURIDAD LABORAL · ' + (C.ENCABEZADO_LINEA2 || 'HOSPITAL ZONAL TRELEW Y HOSPITAL MARÍA HUMPHREYS')); infEst_(pe, 7.5, INF2.PATA, true);
  const pie = doc.addFooter(), pp = pie.getChild(0).asParagraph(); pp.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  try { const im = pp.appendInlineImage(DriveApp.getFileById(INV.LOGO_PIE).getBlob()), w = 360; im.setHeight(Math.round(im.getHeight() * w / im.getWidth())).setWidth(w); } catch (e) {}
  infEst_(pie.appendParagraph(nroNota).setAlignment(DocumentApp.HorizontalAlignment.LEFT), 7.5, INF2.PATA, false);
  infEst_(pie.appendParagraph('Servicio de Higiene y Seguridad Laboral').setAlignment(DocumentApp.HorizontalAlignment.LEFT), 7.5, INF2.PATA, false);

  // ---------------- NOTA A LA DIRECCIÓN (empleador), con copia a la supervisión
  const meds = medidas.slice().sort((a, b) => (Number(a.PRIORIDAD) || 99) - (Number(b.PRIORIDAD) || 99));
  const causas = hechos.filter(h => String(h.ANTECEDENTE_DE || '').trim());
  const prim = causas.filter(h => h.CAUSA === 'Primaria'), sec = causas.filter(h => h.CAUSA !== 'Primaria');
  const lugar = inv.LUGAR_EXACTO || s.SITIO || 's/d (revisar)', serv = s.SERVICIO && !/s\/d/i.test(s.SERVICIO) ? s.SERVICIO : 's/d (revisar)';
  const diasResp = invNum_(invListas_(ss)._param.DIAS_RESPUESTA_NOTA) || 10;
  const vineta = (txt, nivel, neg) => { const li = b.appendListItem(txt); li.setNestingLevel(nivel || 0).setGlyphType(DocumentApp.GlyphType.BULLET); infEst_(li, 10, INF2.TEXTO, !!neg); li.setLineSpacing(1.3).setSpacingAfter(2); return li; };
  P('Trelew, ' + hoy, { der: true, desp: 10 });
  P(nroNota.toUpperCase() + (revision ? ' · Rev. ' + revision : ''), { tam: 9, color: INF2.PATA, neg: true, izq: true, desp: 8, inter: 1.1 });
  P('A: ' + (C.DESTINO_DIRECCION || 'Dirección del Hospital Zonal Trelew «Dr. Adolfo Margara» y del Hospital María Humphreys'), { izq: true, desp: 0, inter: 1.3 });
  P('', { desp: 4 });
  P('Ref.: resultado de la investigación del siniestro ' + s.NRO_SINIESTRO + ' del ' + accFTxt_(accIso_(s.FECHA_ACCIDENTE)) + ' y medidas preventivas', { neg: true, color: INF2.AZUL, izq: true, desp: 10, inter: 1.3 });
  P('Me dirijo a la Dirección para informar el resultado de la investigación del siniestro de referencia, ocurrido en ' + lugar + ' (' + est + '), conforme a la Res. SRT 905/15, Anexo II, ítems 12 y 17, que establecen que el resultado de las investigaciones y las medidas a realizar se comuniquen de forma fehaciente al empleador. La investigación se realizó por el método ' + (/rbol/.test(inv.METODO) ? 'del árbol de causas' : 'de investigación breve') +
    ', con la participación de ' + (inv.SUPERVISION || 'la supervisión del servicio (s/d, revisar)') + '. El método no busca responsables individuales: identifica las condiciones que hicieron posible el siniestro para corregirlas.');
  P(prim.length ? 'Se determinaron las siguientes causas principales (si se eliminan, el siniestro no se produce):' : 'Se identificaron las siguientes causas:');
  (prim.length ? prim : causas).forEach(h => vineta(h.HECHO));
  if (!causas.length) P('s/d (revisar)');
  P('Para evitar que el siniestro se repita y que ocurran otros parecidos, por su intermedio se proponen las siguientes acciones correctivas a los servicios que correspondan, en orden de prioridad:', { antes: 6 });
  infTabla2_(b, [['N.º', 'Acción correctiva', 'Tipo de control', 'Servicio responsable']].concat(meds.map((m, k) => [String(m.PRIORIDAD || k + 1), m.MEDIDA, m.NIVEL || 's/d', m.RESPONSABLE || serv])), [30, 250, 96, 100]);
  P('Se solicita a la Dirección que remita estas acciones a cada servicio responsable y que, por su intermedio, cada uno informe a Higiene y Seguridad Laboral, dentro de los ' + diasResp + ' días hábiles, el plazo de ejecución de cada acción o, si alguna no pudiera realizarse, la alternativa que propone. Con esos plazos, Higiene y Seguridad Laboral verificará el cumplimiento.');
  P('Se adjunta el informe de la investigación. No incluye nombre, documento ni diagnóstico de la persona, por tratarse de datos de salud (Ley 25.326, art. 7).', { tam: 9.5 });
  P('Quedo a disposición por cualquier consulta o requerimiento. Celular ' + (C.CELULAR || '2804389910') + ' · ' + (C.CORREO || 'belenpellegrini.hys@gmail.com') + '.', { antes: 4 });
  P(C.FIRMA_NOMBRE || 'Belén Pellegrini', { neg: true, color: INF2.AZUL, izq: true, desp: 0, inter: 1.2, antes: 24 });
  P(C.FIRMA_CARGO || 'Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo · MP LCOHSECH0383', { tam: 9, izq: true, desp: 0, inter: 1.2 });
  P('Servicio de Higiene y Seguridad Laboral', { tam: 9, izq: true, inter: 1.2 });

  // ---------------- ANEXO: INFORME DE INVESTIGACIÓN (estructura del modelo de la SRT, Circular GPyC 001/04)
  b.appendPageBreak();
  P('ANEXO · ' + nroNota.toUpperCase(), { tam: 8.5, color: INF2.PATA, neg: true, izq: true, desp: 2, inter: 1.1 });
  P('Informe de investigación del siniestro ' + s.NRO_SINIESTRO, { tam: 16, color: INF2.AZUL, neg: true, izq: true, desp: 4, inter: 1.1 });
  P('Estructura del informe de investigación de la SRT (Circular GPyC 001/04). Res. SRT 905/15, Anexo II, ítem 12.', { tam: 8.5, color: INF2.GRIS_TXT, izq: true, desp: 8, inter: 1.2 });
  const ant = (() => { const i0 = accIso_(s.FECHA_INGRESO), f0 = accIso_(s.FECHA_ACCIDENTE); if (!i0 || !f0) return 's/d'; const a = accDias_(i0, f0) / 365.25; return a < 1 ? 'menos de 1 año' : Math.floor(a) + ' año(s)'; })();
  const hora = String(s.HORA || '').replace(/^s\/d.*/, '');
  H3('1. Datos del siniestro');
  infTabla2_(b, [['Dato', 'Detalle'], ['N.º de siniestro', s.NRO_SINIESTRO + (s.VIENE_DE ? ' (viene de ' + s.VIENE_DE + ')' : '')], ['Tipo', s.TIPO || 's/d'],
    ['Fecha y hora', accFTxt_(accIso_(s.FECHA_ACCIDENTE)) + (hora ? ' · ' + hora : '')], ['Turno', inv.TURNO || 's/d (revisar)'], ['Establecimiento y lugar', est + ' · ' + (s.SITIO || 's/d') + ' · ' + lugar],
    ['Servicio y función', serv + ' · ' + (s.FUNCION || 's/d')], ['Antigüedad en el hospital', ant], ['Días de baja a la fecha', String(Number(s.DIAS_BAJA) || 0)], ['Estado del siniestro', s.ESTADO || 's/d']], [150, 326]);
  H3('2. Codificación');
  infTabla2_(b, [['Variable', 'Código'], ['Forma del accidente', inv.FORMA || 's/d (revisar)'], ['Agente material', inv.AGENTE_MATERIAL || 's/d (revisar)'], ['Zona del cuerpo', inv.ZONA_CUERPO || 's/d (revisar)'], ['Naturaleza de la lesión', inv.NATURALEZA_LESION || 's/d (revisar)']], [150, 326]);
  H3('3. Tarea y descripción');
  P('Tarea que se realizaba: ' + (inv.TAREA || 's/d (revisar)') + '.');
  P(inv.DESCRIPCION || 's/d (revisar)');
  H3('4. Hechos ' + (/rbol/.test(inv.METODO) ? '(árbol de causas)' : ''));
  if (hechos.length) {
    invArbol_(hechos).forEach(a => { const h = a.h;
      vineta(h.HECHO + ' — ' + [h.TIPO && h.TIPO.toLowerCase(), h.CATEGORIA && h.CATEGORIA.toLowerCase(), a.nivel ? (h.CAUSA ? 'causa ' + h.CAUSA.toLowerCase() : '') : 'lesión'].filter(Boolean).join(', '), Math.min(a.nivel, 8), a.nivel === 0); });
    P('El primer hecho es la lesión; debajo de cada hecho figuran los que fueron necesarios para que ocurriera. Ocasional: distinto de lo habitual. Permanente: estado habitual del trabajo.', { tam: 8.5, color: INF2.GRIS_TXT, izq: true, antes: 4 });
  } else P('s/d (revisar)');
  H3('5. Resumen de causas');
  P('Primarias (si se eliminan, el siniestro no se produce):', { neg: true, desp: 2 }); (prim.length ? prim : [{ HECHO: 's/d (revisar)' }]).forEach(h => vineta(h.HECHO));
  P('Secundarias:', { neg: true, desp: 2, antes: 4 }); (sec.length ? sec : [{ HECHO: 'No se identificaron.' }]).forEach(h => vineta(h.HECHO + (h.CAUSA ? '' : ' (sin clasificar)')));
  H3('6. Medidas correctivas y preventivas');
  infTabla2_(b, [['N.º', 'Acción correctiva', 'Control', 'Servicio', 'Plazo', 'Verificación', 'Verifica']].concat(meds.map((m, k) => [String(m.PRIORIDAD || k + 1), m.MEDIDA, m.NIVEL || 's/d', m.RESPONSABLE || serv,
    accFTxt_(accIso_(m.PLAZO)) || 'A informar por el servicio', accFTxt_(accIso_(m.FECHA_VERIFICACION)) || 'Según plazo', m.VERIFICA || 'HyS'])), [24, 150, 66, 76, 54, 50, 56]);
  P('Criterios: impedir que el siniestro se repita, evitar siniestros parecidos en otros puestos y servicios, que la medida perdure y que no sume carga al trabajador. Orden de preferencia: eliminación, sustitución, control de ingeniería, control administrativo y, al final, elementos de protección personal (Dto. 351/79, cap. 19).', { tam: 9 });
  H3('7. Seguimiento de las medidas');
  infTabla2_(b, [['N.º', 'Medida', 'Estado', 'Comunicación', 'Verificación realizada']].concat(meds.map((m, k) => [String(m.PRIORIDAD || k + 1), m.MEDIDA, m.ESTADO || 'Propuesta', m.COMUNICADA ? String(m.COMUNICADA).replace(/ \(borrador.*\)$/, '') : 'Pendiente', m.VERIFICADA || 'Pendiente'])), [24, 180, 70, 110, 92]);
  if (inv.CONCLUSION) { H3('8. Conclusión'); P(inv.CONCLUSION); }
  H3((inv.CONCLUSION ? '9' : '8') + '. Método, participantes y entrevistados');
  infTabla2_(b, [['Dato', 'Detalle'], ['Método', (inv.METODO || 's/d') + (inv.MOTIVO ? ' (' + inv.MOTIVO + ')' : '')], ['Inicio de la investigación', accFTxt_(accIso_(inv.FECHA_INICIO)) || 's/d'],
    ['Supervisión que participó', inv.SUPERVISION || 's/d (revisar)'], ['Personas entrevistadas', inv.ENTREVISTADOS || 's/d (revisar)'], ['Investigó', inv.INVESTIGO || 'Belén Pellegrini']], [150, 326]);
  H3((inv.CONCLUSION ? '10' : '9') + '. Profesional responsable');
  P((C.FIRMA_NOMBRE || 'Belén Pellegrini') + ' · ' + (C.FIRMA_CARGO || 'Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo · MP LCOHSECH0383'), { izq: true, desp: 2 });
  P('Fecha: ' + hoy + '                Firma: ______________________________', { izq: true, antes: 18 });
  doc.saveAndClose();
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(titulo + '.pdf');

  // Queda anotada en la investigación y en cada medida («Comunicada» se pone sola al cargar la fecha de Mesa de Entradas)
  accCelda_(I, inv._fila, 'NOTA_CODIGO', codigo); accCelda_(I, inv._fila, 'NOTA_DOC', doc.getUrl());
  medidas.forEach(m => accCelda_(MM, m._fila, 'COMUNICADA', 'Nota (borrador ' + hoy + ')'));
  return { ok: true, codigo: codigo, revision: revision, doc: doc.getUrl(), pdf: pdf.getUrl() };
}

// ------------------------------------------------------------------ Estadísticas (p_sin_est)
// x: { desde, hasta (aaaa-mm-dd), est ('' = todos los habilitados) }
function invEstadisticas_(x) {
  const ss = accLibro_(); if (!ss) return { ok: false, mensaje: 'El libro de siniestros no está armado.' };
  const hoy = accHoy_(), desde = x.desde || hoy.slice(0, 4) + '-01-01', hasta = x.hasta || hoy, L = invListas_(ss), P = L._param;
  const todos = accLeer_(accHoja_(ss)).filter(s => s.ESTADO_HYS !== 'Anulado');
  const N = ss.getSheetByName('NOVEDADES'), nov = N ? accLeer_(N).filter(n => n.ESTADO !== 'Anulada') : [];
  const invs = ss.getSheetByName(INV.HOJA) ? accLeer_(ss.getSheetByName(INV.HOJA)).filter(r => r.ESTADO !== 'Anulada') : [];
  const meds = ss.getSheetByName(INV.MEDIDAS) ? accLeer_(ss.getSheetByName(INV.MEDIDAS)).filter(r => r.ESTADO !== 'Anulada') : [];
  const invDe = {}; invs.forEach(i => invDe[i.ID_SINIESTRO] = i);
  const ests = x.est ? [x.est] : Array.from(new Set(todos.map(s => String(s.ESTABLECIMIENTO)))).filter(Boolean).sort();
  const enPer = todos.filter(s => { const f = accIso_(s.FECHA_ACCIDENTE); return f >= desde && f <= hasta && ests.indexOf(String(s.ESTABLECIMIENTO)) >= 0; }).map(s => {
    const sim = accSimular_(nov.filter(n => n.ID_SINIESTRO === s.ID), hoy), estado = sim.ok ? sim.estado : String(s.ESTADO || 'Denunciado');
    const conBaja = nov.some(n => n.ID_SINIESTRO === s.ID && /Inicio de ILT|Reingreso/.test(n.NOVEDAD));
    const i = invDe[s.ID] || {};
    return { s: s, estado: estado, dias: sim.ok ? sim.dias : (Number(s.DIAS_BAJA) || 0), conBaja: conBaja, inv: i };
  });
  const excluido = r => ['Rechazado', 'Inculpable'].indexOf(r.estado) >= 0;
  const casos = enPer.filter(r => !excluido(r)), atep = casos.filter(r => !/itinere/i.test(r.s.TIPO)), itin = casos.filter(r => /itinere/i.test(r.s.TIPO));
  const atepBaja = atep.filter(r => r.conBaja), diasAtep = atep.reduce((a, r) => a + r.dias, 0);

  // Denominador: trabajadores activos (o con licencia) de la BASE DE TRABAJADORES, al día de hoy
  const trab = invTrabajadores_(ests);
  const dPer = Math.max(1, accDias_(desde, hasta) + 1), semanas = dPer / 7, jornada = invNum_(P.JORNADA_SEMANAL_HS);
  const horas = jornada && trab.total ? Math.round(trab.total * jornada * semanas) : null;
  const r2 = v => v == null ? null : Math.round(v * 100) / 100;
  const indices = {
    incidencia: trab.total ? r2(atep.length * 1000 / trab.total) : null,
    incidenciaItinere: trab.total ? r2(itin.length * 1000 / trab.total) : null,
    frecuencia: horas ? r2(atepBaja.length * 1e6 / horas) : null,
    perdida: trab.total ? r2(diasAtep * 1000 / trab.total) : null,
    duracionMedia: atepBaja.length ? r2(diasAtep / atepBaja.length) : null
  };
  const cuenta = (lista, fn) => { const m = {}; lista.forEach(r => { const k = fn(r) || 's/d'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(k => [k, m[k]]).sort((a, b) => b[1] - a[1]); };
  const sinInv = r => r.inv.ID ? '' : 'Sin investigar';
  const dia = r => { const f = accIso_(r.s.FECHA_ACCIDENTE); return f ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(f + 'T12:00:00').getDay()] : ''; };
  const franja = r => { const m = /(\d{1,2})[:.](\d{2})/.exec(String(r.s.HORA || '')); if (!m) return 's/d'; const h = Number(m[1]); return h < 6 ? '00 a 06 h' : h < 12 ? '06 a 12 h' : h < 18 ? '12 a 18 h' : '18 a 24 h'; };
  const antig = r => { const i = accIso_(r.s.FECHA_INGRESO), f = accIso_(r.s.FECHA_ACCIDENTE); if (!i || !f) return 's/d'; const a = accDias_(i, f) / 365.25; return a < 1 ? 'Menos de 1 año' : a < 5 ? '1 a 5 años' : a < 10 ? '5 a 10 años' : 'Más de 10 años'; };
  const mes = r => accIso_(r.s.FECHA_ACCIDENTE).slice(0, 7);
  const idsPer = {}; enPer.forEach(r => idsPer[r.s.ID] = true);
  const medPer = meds.filter(m => idsPer[m.ID_SINIESTRO]);
  const vencida = m => ['Cumplida', 'No cumplida'].indexOf(String(m.ESTADO)) < 0 && accIso_(m.PLAZO) && accIso_(m.PLAZO) < hoy;
  return { ok: true, desde: desde, hasta: hasta, ests: ests, hoy: hoy,
    totales: { notificados: enPer.length, casos: casos.length, atep: atep.length, at: atep.filter(r => !/enfermedad/i.test(r.s.TIPO)).length, ep: atep.filter(r => /enfermedad/i.test(r.s.TIPO)).length,
      itinere: itin.length, conBaja: atepBaja.length, sinBaja: atep.length - atepBaja.length, diasBaja: diasAtep, diasItinere: itin.reduce((a, r) => a + r.dias, 0),
      rechazados: enPer.filter(r => r.estado === 'Rechazado').length, inculpables: enPer.filter(r => r.estado === 'Inculpable').length, enIlt: casos.filter(r => r.estado === 'En ILT').length,
      investigados: casos.filter(r => r.inv.ID).length, cerrados: casos.filter(r => r.inv.ESTADO === 'Cerrada').length, arbol: casos.filter(r => /rbol/.test(r.inv.METODO || '')).length },
    trabajadores: trab, horas: horas, jornada: jornada, semanas: Math.round(semanas * 10) / 10, indices: indices,
    por: {
      tipo: cuenta(casos, r => r.s.TIPO), establecimiento: cuenta(casos, r => r.s.ESTABLECIMIENTO), sitio: cuenta(casos, r => r.s.SITIO), servicio: cuenta(casos, r => r.s.SERVICIO), funcion: cuenta(casos, r => r.s.FUNCION),
      forma: cuenta(atep, r => r.inv.FORMA || sinInv(r)), agente: cuenta(atep, r => r.inv.AGENTE_MATERIAL || sinInv(r)), zona: cuenta(atep, r => r.inv.ZONA_CUERPO || sinInv(r)),
      naturaleza: cuenta(atep, r => r.inv.NATURALEZA_LESION || sinInv(r)), dia: cuenta(casos, dia), franja: cuenta(casos, franja), antiguedad: cuenta(casos, antig), mes: cuenta(casos, mes).sort((a, b) => a[0].localeCompare(b[0]))
    },
    medidas: { total: medPer.length, cumplidas: medPer.filter(m => m.ESTADO === 'Cumplida').length, vencidas: medPer.filter(vencida).length,
      porNivel: cuenta(medPer.map(m => ({ s: {}, inv: {}, m: m })), r => r.m.NIVEL), pendientes: medPer.filter(vencida).map(m => ({ id: m.ID_SINIESTRO, medida: m.MEDIDA, responsable: m.RESPONSABLE, plazo: accIso_(m.PLAZO), estado: m.ESTADO })) },
    lista: enPer.map(r => ({ id: r.s.ID, nro: r.s.NRO_SINIESTRO, fecha: accIso_(r.s.FECHA_ACCIDENTE), tipo: r.s.TIPO, est: r.s.ESTABLECIMIENTO, servicio: r.s.SERVICIO, estado: r.estado, dias: r.dias,
      metodo: r.inv.METODO || '', inv: r.inv.ESTADO || 'Sin investigar' })).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    notas: ['Trabajadores: activos y con licencia en la BASE DE TRABAJADORES al ' + accFTxt_(hoy) + ' (no hay histórico de la nómina).',
      'Rechazados e inculpables no cuentan como casos. In itinere se informa aparte y no entra en los índices de AT/EP.',
      'Días de baja: los de los siniestros ocurridos en el período, contados hasta hoy si la baja sigue abierta.',
      horas ? 'Horas trabajadas estimadas: trabajadores × ' + jornada + ' h semanales × ' + (Math.round(semanas * 10) / 10) + ' semanas.' : 'Índice de frecuencia: falta la jornada semanal (LISTAS_INVESTIGACION › JORNADA_SEMANAL_HS).',
      'Base: Res. SRT 905/15, Anexo I pto. 13; definiciones de los índices de la SRT.'] };
}
// Trabajadores activos (o con licencia) por establecimiento, en la BASE DE TRABAJADORES
function invTrabajadores_(ests) {
  const c = CacheService.getScriptCache(), k = 'inv_trab_' + ests.join('_'), ya = c.get(k); if (ya) return JSON.parse(ya);
  const bt = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')), por = {}; let total = 0;
  ests.forEach(e => { const sh = bt.getSheetByName(e); if (!sh || sh.getLastRow() < 6) { por[e] = 0; return; }
    const H = bjCabTrab_(sh), jD = H.indexOf('DNI'), jE = H.indexOf('ESTADO');
    const n = sh.getRange(6, 1, sh.getLastRow() - 5, H.length).getValues().filter(r => String(r[jD]).trim() && (jE < 0 || /^(activo|licencia|)$/i.test(String(r[jE]).trim()))).length;
    por[e] = n; total += n; });
  const out = { total: total, por: por };
  try { c.put(k, JSON.stringify(out), 1800); } catch (e) {}
  return out;
}