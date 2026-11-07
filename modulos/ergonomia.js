// ------------------------------------------------------------------ 12 · Ergonomía · Protocolo de Ergonomía (Res. SRT 886/15) · versión 0 (07/11/2026)
// Lo carga solo Higiene y Seguridad. Recorre el protocolo en orden: puesto → Planilla 1 (identificación, por tarea) → Planilla 2 de cada
// factor marcado (evaluación inicial, con el resultado calculado según la norma) → evaluación de riesgos (método y nivel 1, 2 o 3) →
// Planilla 3 (medidas generales y específicas) → Planilla 4 (seguimiento). Servidor: Ergonomia.gs › p_ergo…
// Si falta GitHub: libro «ERGONOMÍA · Sistema HyS» (Drive › SISTEMA HyS › MÓDULO 12 · ERGONOMÍA). Datos faltantes: s/d.
let ERG = null;
const ERG_FILTRO = { est: '', sitio: '', estado: '', q: '', max: 120 }, ERG_MF = { est: '', estado: 'abiertas' };
const ERG_GUIA = 'https://claude.ai/artifact/8DNNwjucJwJUCTegYzv87w';
const ERG_PIE = '<div style="margin-top:18px;text-align:center"><img src="https://hyslhmh-sudo.github.io/manifiestos/desvios/logo-hysl.png" alt="Higiene y Seguridad Laboral · Hospitales más seguros para las personas" style="height:46px"></div>';
const ergHoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const ergDias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const ergMas = (f, d) => { const x = new Date(f + 'T12:00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const ergIso = f => { const s = String(f || ''); const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : s.slice(0, 10); };
const ergSd = v => String(v == null || v === '' ? 's/d' : v);

// Factores y preguntas oficiales (Anexo I, Res. SRT 886/15). Las reglas son las mismas que aplica el servidor (Ergonomia.gs › ERGO_REGLAS).
const ERG_F = {
  A: { col: 'A · Levantamiento/descenso', t: 'Levantamiento y/o descenso manual de carga sin transporte', inm: [3],
    p1: ['Levantar y/o bajar manualmente cargas de peso superior a 2 kg y hasta 25 kg.', 'Realizar diariamente y en forma cíclica operaciones de levantamiento / descenso con una frecuencia ≥ 1 por hora o ≤ 360 por hora (si es esporádica, consignar NO).', 'Levantar y/o bajar manualmente cargas de peso superior a 25 kg.'],
    p2: ['Levanta, sostiene y deposita la carga sobrepasando con sus manos 30 cm sobre la altura del hombro.', 'Levanta, sostiene y deposita la carga sobrepasando con sus manos una distancia horizontal mayor de 80 cm desde el punto medio entre los tobillos.', 'Entre la toma y el depósito, gira o inclina la cintura más de 30° a uno u otro lado (o a ambos) desde el plano sagital.', 'Las cargas tienen formas irregulares, son difíciles de asir, se deforman o hay movimiento en su interior.', 'Levanta, sostiene y deposita la carga con un solo brazo.', 'Presenta alguna manifestación temprana de las enfermedades del art. 1.'],
    regla: 'Paso 1 todo NO: tolerable. Alguna SÍ: Paso 2. La 3 en SÍ (más de 25 kg) ya es no tolerable y obliga a pedir mejoras.',
    mirar: 'Pesar las cajas reales (sueros, insumos, bidones de limpieza, bolsas de ropa, ollas); contar levantamientos por hora; medir desde el piso y desde el estante más alto. La movilización de pacientes se marca acá y se evalúa con MAPO.',
    datos: [['peso', 'Peso de la carga (kg, balanza)'], ['frec', 'Levantamientos por hora'], ['alt', 'Altura de toma y depósito (cm)']],
    metodos: ['Tablas LMC (Res. MTEySS 295/03)', 'Ecuación NIOSH', 'IRAM-ISO 11228-1', 'MAPO (movilización de pacientes, ISO/TR 12296)'],
    medidas: ['Ayuda mecánica (grúa, tabla de transferencia, carro)', 'Movilizar entre dos o más personas', 'Límite de peso por bulto en depósito', 'Guardar lo pesado entre la cintura y el hombro', 'Capacitación en movilización segura de pacientes'] },
  B: { col: 'B · Empuje/arrastre', t: 'Empuje y arrastre manual de cargas', inm: [3],
    p1: ['Se realizan diariamente tareas cíclicas, con una frecuencia ≥ 1 movimiento por jornada (si son esporádicas, consignar NO).', 'El trabajador se desplaza empujando y/o arrastrando manualmente un objeto recorriendo una distancia mayor a 60 m.', 'Se empujan o arrastran cíclicamente objetos (bolsones, cajas, muebles, máquinas, etc.) cuyo esfuerzo medido con dinamómetro supera los 34 kgf.'],
    p2: ['Para empujar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro ≥ 12 kgf para hombres o 10 kgf para mujeres.', 'Para arrastrar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro ≥ 10 kgf para hombres o mujeres.', 'Se empuja y/o arrastra con dificultad (superficie despareja, rampas, roturas u obstáculos, ruedas en mal estado, mal diseño del asa, etc.).', 'No puede empujarse o arrastrarse con ambas manos, o el apoyo de las manos queda a una altura incómoda (por encima del pecho o por debajo de la cintura).', 'El esfuerzo inicial se mantiene significativamente una vez en movimiento (atascamiento de ruedas, tirones o falta de deslizamiento uniforme).', 'Empuja o arrastra el objeto rodante asiéndolo con una sola mano.', 'Manifestación temprana.'],
    regla: 'Alguna SÍ en el Paso 1: Paso 2. La 3 en SÍ (más de 34 kgf) ya es no tolerable. La fuerza se mide con dinamómetro, no se estima.',
    mirar: 'Camas y camillas con paciente, carros de comida, de ropa, de residuos y de medicación, sillas de ruedas, cilindros de oxígeno; ruedas y frenos; rampas y desniveles; distancia real del recorrido.',
    datos: [['empuje', 'Fuerza inicial de empuje (kgf, dinamómetro)'], ['arrastre', 'Fuerza inicial de arrastre (kgf)'], ['dist', 'Distancia del recorrido (m)'], ['pob', 'Población (hombres, mujeres o mixta)']],
    metodos: ['Tablas 1 a 4 del Anexo II, Res. SRT 3345/15', 'ISO 11228-2', 'Tablas de Snook y Ciriello'],
    medidas: ['Arreglo o cambio de ruedas y frenos de carros y camas', 'Carros más chicos o de menor carga', 'Eliminar desniveles o rampas del recorrido', 'Asas a la altura entre cintura y pecho', 'Mantenimiento preventivo de carros'] },
  C: { col: 'C · Transporte manual', t: 'Transporte manual de cargas', inm: [5],
    p1: ['Transportar manualmente cargas de peso superior a 2 kg y hasta 25 kg.', 'Se desplaza sosteniendo manualmente la carga una distancia mayor a 1 m.', 'Lo realiza diariamente en forma cíclica (si es esporádica, consignar NO).', 'Transporta cargas a una distancia superior a 20 m.', 'Transporta cargas de peso superior a 25 kg.'],
    p2: ['En condiciones habituales transporta la carga entre 1 y 10 m con una masa acumulada (masa × frecuencia) mayor que 10.000 kg en la jornada.', 'En condiciones habituales transporta la carga entre 10 y 20 m con una masa acumulada mayor que 6.000 kg en la jornada.', 'Las cargas tienen formas irregulares, son difíciles de asir, se deforman o hay movimiento en su interior.', 'Manifestación temprana.'],
    regla: 'Alguna SÍ en el Paso 1: Paso 2. La 5 en SÍ (más de 25 kg) ya es no tolerable. Hacen falta peso (balanza), distancia (cinta) y veces por jornada.',
    mirar: 'Reposición de insumos a mano entre depósito y servicio, bolsas de residuos llevadas a pulso, bandejas, cajas de historias clínicas.',
    datos: [['peso', 'Peso de la carga (kg)'], ['dist', 'Distancia (m)'], ['veces', 'Veces por jornada']],
    metodos: ['Tabla 1 del Anexo I, Res. SRT 3345/15 (masa acumulada)', 'IRAM-ISO 11228-1'],
    medidas: ['Carro para el traslado de insumos', 'Repartir la carga en bultos más livianos', 'Acercar el depósito al lugar de uso', 'Reorganizar la reposición (menos viajes con carro)'] },
  D: { col: 'D · Bipedestación', t: 'Bipedestación',
    p1: ['El puesto se desarrolla de pie, sin posibilidad de sentarse, durante 2 horas seguidas o más.'],
    p2: ['De pie 3 horas seguidas o más, sin posibilidad de sentarse, con escasa deambulación (no más de 100 m por hora).', 'De pie 2 horas seguidas o más, sin sentarse ni desplazarse o con escasa deambulación, levantando y/o transportando cargas de más de 2 kg.', 'Bipedestación prolongada en ambientes donde la temperatura y la humedad superan los límites legales y con actividad física.', 'Manifestación temprana.'],
    regla: 'Paso 1 en NO: tolerable. En SÍ: Paso 2.',
    mirar: 'Quirófano, esterilización, cocina y lavadero (con calor), laboratorio en mesada, portería. Preguntar si hay banqueta o silla y si se usa. Riesgo principal: várices.',
    datos: [['horas', 'Horas seguidas de pie'], ['metros', 'Metros que camina por hora (aprox.)']],
    metodos: ['Pautas del Dto. 49/14'],
    medidas: ['Banco o silla semisentada en el puesto', 'Alfombra antifatiga', 'Pausas para sentarse', 'Rotación entre tareas de pie y sentado'] },
  E: { col: 'E · Movimientos repetitivos', t: 'Movimientos repetitivos de miembros superiores', mejora: [3],
    p1: ['Realizar diariamente una o más tareas con las extremidades superiores durante 4 o más horas de la jornada habitual, en forma cíclica (continuada o alternada).'],
    p2: ['Las extremidades superiores están activas más del 40 % del tiempo total del ciclo de trabajo.', 'En el ciclo se hace un esfuerzo superior a moderado (3 en la escala de Borg) durante más de 6 segundos y más de una vez por minuto.', 'Se hace un esfuerzo superior a 7 en la escala de Borg.', 'Manifestación temprana.'],
    regla: 'Alguna SÍ en el Paso 2: evaluación de riesgos. La 3 en SÍ obliga a implementar mejoras. Si las dos manos difieren, una Planilla 2.E por mano.',
    mirar: 'Digitación en admisión, estadística y facturación; pipeteo; plegado de ropa; preparación de alimentos; instrumental en esterilización; odontología. Preguntar Borg: «Del 0 al 10, ¿cuánta fuerza hace en cada ciclo?».',
    datos: [['horas', 'Horas por jornada con la tarea'], ['activo', '% del ciclo con los brazos activos'], ['borg', 'Esfuerzo (Borg, 0 a 10)'], ['mano', 'Mano evaluada (derecha, izquierda, ambas)']],
    metodos: ['Nivel de Actividad Manual (NAM), Res. MTEySS 295/03', 'Check-list OCRA (ISO 11228-3)', 'Strain Index'],
    medidas: ['Pausas activas', 'Rotación de tareas', 'Herramientas que bajan la fuerza (pipetas electrónicas, tijeras con resorte)', 'Teclado y mouse a la altura del codo', 'Reorganizar el trabajo para dar tiempo de recuperación'] },
  F: { col: 'F · Posturas forzadas', t: 'Posturas forzadas',
    p1: ['Adoptar posturas forzadas en forma habitual durante la jornada, con o sin aplicación de fuerza (no se consideran si son ocasionales).'],
    p2: ['Cuello en extensión, flexión, lateralización y/o rotación.', 'Brazos por encima de los hombros, o con movimientos de supinación, pronación o rotación.', 'Muñecas y manos en flexión, extensión, desviación cubital o radial.', 'Cintura en flexión, extensión, lateralización y/o rotación.', 'Miembros inferiores: trabajo de rodillas o en cuclillas.', 'Manifestación temprana.'],
    regla: 'Paso 1 en NO: tolerable. En SÍ: Paso 2; alguna SÍ: evaluación de riesgos.',
    mirar: 'Inclinación sobre camas bajas o no regulables, higiene de pacientes, curaciones, odontología, microscopía, cirugía prolongada, limpieza bajo camas, puestos con PC (silla sin apoyo lumbar, pantalla baja: se marca en la 4 del Paso 2).',
    datos: [['tiempo', 'Tiempo en la postura (min por hora o % de la jornada)']],
    metodos: ['REBA', 'RULA', 'OWAS', 'ISO 11226'],
    medidas: ['Camas y camillas regulables en altura', 'Silla con apoyo lumbar y regulable', 'Pantalla a la altura de los ojos', 'Elementos de limpieza con mango largo', 'Apoyapiés'] },
  G: { col: 'G · Vibraciones', t: 'Vibraciones', bloques: [{ t: 'Mano-brazo (5 a 1500 Hz)', p1: [1, 2, 3], p2: [1, 2] }, { t: 'Cuerpo entero (1 a 80 Hz)', p1: [4, 5], p2: [3, 4] }],
    p1: ['Mano-brazo: trabajar con herramientas que producen vibraciones (martillo neumático, perforadora, destornilladores, pulidoras, esmeriladoras, otros).', 'Mano-brazo: sujetar piezas con las manos mientras son mecanizadas.', 'Mano-brazo: sujetar palancas, volantes, etc. que transmiten vibraciones.', 'Cuerpo entero: conducir vehículos industriales, camiones, máquinas agrícolas, transporte público y otros.', 'Cuerpo entero: trabajar próximo a maquinarias generadoras de impacto.'],
    p2: ['Mano-brazo: el valor de las vibraciones supera los límites de la Tabla I (vibración segmental mano-brazo) del Anexo V de la Res. MTEySS 295/03.', 'Mano-brazo: manifestación temprana.', 'Cuerpo entero: el valor de las vibraciones supera los límites de vibración de cuerpo entero del Anexo V de la Res. MTEySS 295/03.', 'Cuerpo entero: manifestación temprana.'],
    regla: 'Cada bloque se contesta si tiene alguna SÍ en el Paso 1. El Paso 2 exige medición con instrumental: sin medición no se puede contestar NO.',
    mirar: 'Choferes de ambulancia (cuerpo entero), mantenimiento con amoladora o taladro, odontología con instrumental rotatorio (mano-brazo).',
    datos: [['med', 'Medición (m/s², eje y tiempo de exposición)'], ['equipo', 'Equipo usado']],
    metodos: ['Medición contra el Anexo V, Res. MTEySS 295/03', 'ISO 5349 (mano-brazo)', 'ISO 2631 (cuerpo entero)'],
    medidas: ['Herramientas con sistema antivibración', 'Mantenimiento de herramientas y de la suspensión del vehículo', 'Asientos con amortiguación', 'Limitar el tiempo de exposición'] },
  H: { col: 'H · Confort térmico', t: 'Confort térmico',
    p1: ['En el puesto se perciben temperaturas no confortables para la realización de las tareas.'],
    p2: ['El resultado de la curva de confort de Fanger está fuera de la zona de confort.'],
    regla: 'Se mide temperatura y humedad relativa (termohigrómetro) y se ubica el punto en la curva de Fanger de la planilla.',
    mirar: 'Cocina, lavadero, esterilización (calor); depósitos, portería, recorridas externas y CAPS sin calefacción en invierno (frío).',
    datos: [['temp', 'Temperatura (°C)'], ['hr', 'Humedad relativa (%)'], ['equipo', 'Equipo usado']],
    metodos: ['Curva de Fanger (Planilla 2.H)', 'Res. MTEySS 295/03 (estrés térmico)', 'ISO 7730 (PMV y PPD)'],
    medidas: ['Extracción o ventilación', 'Calefacción', 'Ropa de trabajo adecuada a la temperatura', 'Pausas e hidratación'] },
  I: { col: 'I · Estrés de contacto', t: 'Estrés de contacto',
    p1: ['Mantener apoyada alguna parte del cuerpo ejerciendo presión contra una herramienta, plano de trabajo, máquina o partes y materiales.'],
    p2: ['Mantiene apoyada la muñeca, antebrazo, axila, muslo u otro segmento sobre una superficie aguda o con canto.', 'Usa herramientas de mano o manipula piezas que presionan sobre sus dedos y/o la palma de la mano hábil.', 'Hace movimientos de percusión sobre partes o herramientas.', 'Manifestación temprana.'],
    regla: 'Paso 1 en NO: tolerable. En SÍ: Paso 2; alguna SÍ: evaluación de riesgos.',
    mirar: 'Antebrazo apoyado en el canto de escritorios o mesadas, borde de la silla contra el muslo, tijeras y pinzas en esterilización y cocina, borde de la camilla.',
    datos: [],
    metodos: ['Observación con registro fotográfico'],
    medidas: ['Bordes redondeados o acolchados', 'Apoyamuñecas', 'Herramientas con mango acolchado y largo adecuado'] }
};
const ERG_SINT = ['Cervicales', 'Hombro', 'Mano / muñeca', 'Cintura', 'Zona inguinal', 'Piernas'];
const ERG_GEN = [['GEN_INFORMO', 'Se informó a los trabajadores, supervisores, ingenieros y directivos relacionados con el puesto sobre el riesgo que tiene la tarea de desarrollar trastornos musculoesqueléticos (TME).'],
  ['GEN_CAP_SINTOMAS', 'Se capacitó a los trabajadores y supervisores relacionados con el puesto sobre la identificación de síntomas relacionados con el desarrollo de TME.'],
  ['GEN_CAP_PREVENCION', 'Se capacitó a los trabajadores y supervisores relacionados con el puesto sobre las medidas y/o procedimientos para prevenir el desarrollo de TME.']];

// Mismo cálculo que el servidor (para ver el resultado mientras se contesta)
function ergResultado(f, p1, p2) {
  const g = ERG_F[f], si = v => v === 'Sí', no = v => v === 'No';
  if (g.p1.some((q, i) => !p1[i])) return { r: 'Pendiente', e: 'Faltan respuestas del Paso 1', n: '' };
  if (g.p1.every((q, i) => no(p1[i]))) return { r: 'Tolerable', e: 'Paso 1: el factor no está en las condiciones de la norma', n: '1' };
  if ((g.inm || []).some(q => si(p1[q - 1]))) return { r: 'No tolerable', e: 'Paso 1: no tolerable · implementar mejoras', n: '3' };
  const q2 = ergPreg2(f, p1), v2 = q2.map(q => p2[q - 1] || '');
  if (v2.some(v => !v)) return { r: 'Pendiente', e: 'Faltan respuestas del Paso 2', n: '' };
  if ((g.mejora || []).some(q => q2.indexOf(q) >= 0 && si(p2[q - 1]))) return { r: 'A evaluar', e: 'Paso 2: esfuerzo mayor a 7 (Borg) · implementar mejoras y hacer la evaluación de riesgos', n: '' };
  if (v2.every(no)) return { r: 'Tolerable', e: 'Paso 2: todas NO · se presume tolerable', n: '1' };
  return { r: 'A evaluar', e: 'Paso 2: alguna SÍ · falta la evaluación de riesgos', n: '' };
}
function ergPreg2(f, p1) { const g = ERG_F[f]; if (!g.bloques) return g.p2.map((q, i) => i + 1); return [].concat.apply([], g.bloques.filter(b => b.p1.some(q => p1[q - 1] === 'Sí')).map(b => b.p2)); }
const ergChipR = (r, n) => { const t = r === 'Tolerable' ? 'Nivel 1 · tolerable' : r === 'Moderado' ? 'Nivel 2 · moderado' : r === 'No tolerable' ? 'Nivel 3 · no tolerable' : r === 'A evaluar' ? 'Falta evaluación de riesgos' : r || 'Sin evaluar';
  return '<span class="chip ' + ({ Tolerable: 'ok', Moderado: 'wa', 'No tolerable': 'er', 'A evaluar': 'wa' }[r] || 'gr') + '">' + esc(t) + '</span>'; };

// ------------------------------------------------------------------ Datos
async function ergCargar(fresco) {
  if (ERG && !fresco) return ERG;
  const r = await api('p_ergo', {}, 120000);
  if (!r || !r.ok) throw new Error((r && r.mensaje) || 'No se pudo leer el módulo de ergonomía.');
  ERG = r; ERG.fotos = {}; return ERG;
}
// Resumen de un puesto: tareas vigentes, factores, evaluaciones, peor nivel y lo que falta
function ergResumen(p) {
  const I = ERG.ident.filter(i => i.ID_PUESTO === p.ID_PUESTO && i.ESTADO !== 'Reemplazada'), falta = [];
  let peor = 0, evaluado = false, ultima = '';
  I.forEach(i => { ultima = ergIso(i.FECHA) > ultima ? ergIso(i.FECHA) : ultima;
    Object.keys(ERG_F).forEach(f => { if (i[ERG_F[f].col] !== 'Sí') return; const ev = ergEvalDe(i.ID_IDENT, f);
      if (!ev) falta.push('Planilla 2.' + f + ' · ' + i.TAREA); else if (ev.RESULTADO === 'A evaluar' || ev.RESULTADO === 'Pendiente') falta.push((ev.RESULTADO === 'A evaluar' ? 'Evaluación de riesgos 2.' : 'Completar 2.') + f + ' · ' + i.TAREA);
      if (ev && ev.NIVEL_RIESGO) { evaluado = true; peor = Math.max(peor, Number(ev.NIVEL_RIESGO) || 0); } }); });
  const M = ERG.medidas.filter(m => m.ID_PUESTO === p.ID_PUESTO), hoy = ergHoy();
  const abiertas = M.filter(m => m.ESTADO !== 'Cumplida'), vencidas = abiertas.filter(m => m.FECHA_LIMITE && ergIso(m.FECHA_LIMITE) < hoy);
  const vence = ultima ? ergMas(ultima, 365) : '';
  let estado = !I.length ? 'Sin identificar' : vence && vence < hoy ? 'Rehacer (más de 1 año)' : falta.length ? 'Falta completar' : peor === 3 ? 'Nivel 3' : peor === 2 ? 'Nivel 2' : 'Tolerable';
  return { I: I, falta: falta, peor: peor, evaluado: evaluado, ultima: ultima, vence: vence, M: M, abiertas: abiertas, vencidas: vencidas, estado: estado };
}
const ergEvalDe = (idI, f) => ERG.evals.filter(e => e.ID_IDENT === idI && e.FACTOR === f).sort((a, b) => String(b.ID_EVAL).localeCompare(String(a.ID_EVAL)))[0];
const ergChipE = e => '<span class="chip ' + ({ 'Sin identificar': 'gr', 'Falta completar': 'wa', 'Nivel 3': 'er', 'Nivel 2': 'wa', Tolerable: 'ok', 'Rehacer (más de 1 año)': 'er' }[e] || 'gr') + '">' + esc(e) + '</span>';

// ------------------------------------------------------------------ Fotos (hasta 5 por campo: sacar en el momento o subir)
function ergFotosHtml(k, ya) {
  const L = (ERG.fotos[k] = ERG.fotos[k] || []);
  return '<div class="fotos" id="ergF_' + k + '">' + (ya ? '<a href="' + esc(ya) + '" target="_blank" rel="noopener">Fotos ya guardadas ↗</a>' : '') +
    L.map((u, n) => '<span>Foto ' + (n + 1) + ' <button class="link quitar" data-ergq="' + k + '" data-n="' + n + '" title="Quitar">×</button></span>').join('') +
    (L.length < 5 ? '<label class="btn sec foto">📷 Sacar foto<input type="file" accept="image/*" capture="environment" hidden data-ergf="' + k + '"></label><label class="btn sec foto">Subir del dispositivo<input type="file" accept="image/*" multiple hidden data-ergf="' + k + '"></label>' : '') +
    '<span class="mu peq">' + L.length + ' de 5' + (ya ? ' (las nuevas reemplazan el enlace)' : '') + '</span></div>';
}
function ergFotosActivar(k, ya) {
  const box = $('ergF_' + k); if (!box) return;
  box.querySelectorAll('[data-ergf]').forEach(inp => inp.onchange = async () => {
    const L = ERG.fotos[k]; for (const f of [...inp.files]) { if (L.length >= 5) { toast('Hasta 5 fotos por campo.'); break; } try { L.push(await achicar(f)); } catch (e) { toast(e.message); } }
    box.outerHTML = ergFotosHtml(k, ya); ergFotosActivar(k, ya); });
  box.querySelectorAll('[data-ergq]').forEach(b => b.onclick = () => { ERG.fotos[k].splice(Number(b.dataset.n), 1); box.outerHTML = ergFotosHtml(k, ya); ergFotosActivar(k, ya); });
}

// ------------------------------------------------------------------ Tablero
async function pantallaErgo(fresco) {
  marco('#ergo', '<div class="cab"><div><span class="mu peq">12 · Ergonomía</span><h1>Protocolo de ergonomía · Res. SRT 886/15</h1><span class="mu peq">HZT con sus dependencias y CAPS, HMH y HSST. Versión 0.</span></div>' +
    '<div class="filtros"><button class="btn sec" id="erAct">Actualizar</button><a class="btn sec" href="#ergomed">Medidas y seguimiento</a><a class="btn sec" href="' + ERG_GUIA + '" target="_blank" rel="noopener">Guía (qué se mira) ↗</a><a class="btn sec" id="erLib" href="#" target="_blank" rel="noopener" hidden>Planilla ↗</a></div></div>' +
    '<div id="erBox"><section class="card"><div class="mu">Leyendo los puestos…</div></section></div>');
  $('erAct').onclick = () => pantallaErgo(true);
  try { await ergCargar(fresco); } catch (e) { $('erBox').innerHTML = '<section class="card"><div class="aviso error">' + esc(e.message) + '</div></section>'; return; }
  $('erLib').href = ERG.libro; $('erLib').hidden = false;
  ergPintarTablero();
}
function ergPintarTablero() {
  const F = ERG_FILTRO, P = ERG.puestos.filter(p => p.ESTADO !== 'Baja'), R = new Map(P.map(p => [p.ID_PUESTO, ergResumen(p)]));
  const sitios = Array.from(new Set(P.filter(p => !F.est || p.ESTABLECIMIENTO === F.est).map(p => p.SITIO).filter(Boolean))).sort();
  const q = F.q.toLowerCase();
  const V = P.filter(p => (!F.est || p.ESTABLECIMIENTO === F.est) && (!F.sitio || p.SITIO === F.sitio) && (!F.estado || R.get(p.ID_PUESTO).estado === F.estado || (F.estado === 'Precargado' && /precargado/i.test(p.ESTADO))) &&
    (!q || [p.ID_PUESTO, p.FUNCION, p.SERVICIO, p.SITIO, p.TAREAS_SUGERIDAS].join(' ').toLowerCase().indexOf(q) >= 0));
  const cuenta = f => P.filter(f).length, kpi = (n, t, s, est) => '<button class="kpi2 card" style="text-align:left;cursor:pointer;border:1px solid var(--ln)" data-erk="' + esc(est || '') + '"><span>' + t + '</span><b>' + n + '</b><small>' + s + '</small></button>';
  const medAb = ERG.medidas.filter(m => m.ESTADO !== 'Cumplida'), medVen = medAb.filter(m => m.FECHA_LIMITE && ergIso(m.FECHA_LIMITE) < ergHoy());
  const reev = ERG.medidas.filter(m => m.FECHA_IMPLEMENTACION && !m.FECHA_CIERRE && ergDias(ergHoy(), ergMas(ergIso(m.FECHA_IMPLEMENTACION), 30)) <= 7);
  const estados = ['Sin identificar', 'Falta completar', 'Nivel 3', 'Nivel 2', 'Tolerable', 'Rehacer (más de 1 año)', 'Precargado'];
  $('erBox').innerHTML =
    '<div class="grid g4">' + kpi(P.length, 'Puestos', cuenta(p => /precargado/i.test(p.ESTADO)) + ' precargados (revisar)', 'Precargado') + kpi(cuenta(p => R.get(p.ID_PUESTO).I.length), 'Identificados (Planilla 1)', cuenta(p => !R.get(p.ID_PUESTO).I.length) + ' sin identificar', 'Sin identificar') +
      kpi(cuenta(p => R.get(p.ID_PUESTO).estado === 'Falta completar'), 'Con algo para completar', 'Planilla 2 o evaluación de riesgos', 'Falta completar') + kpi(cuenta(p => R.get(p.ID_PUESTO).peor === 3) + ' · ' + cuenta(p => R.get(p.ID_PUESTO).peor === 2), 'Nivel 3 · nivel 2', 'Medidas inmediatas · medidas correctivas', 'Nivel 3') + '</div>' +
    (medVen.length || reev.length ? '<div class="aviso error peq" style="margin-top:12px">' + (medVen.length ? '<b>' + medVen.length + ' medida(s) vencida(s)</b> de ' + medAb.length + ' abiertas. ' : '') + (reev.length ? '<b>' + reev.length + ' reevaluación(es)</b> para hacer (30 días después de implementar la medida). ' : '') + '<a href="#ergomed">Ver medidas y seguimiento</a></div>' : medAb.length ? '<div class="aviso peq" style="margin-top:12px">' + medAb.length + ' medida(s) abierta(s). <a href="#ergomed">Ver medidas y seguimiento</a></div>' : '') +
    '<details class="card peq" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;color:var(--az)">Cómo se recorre el protocolo y por dónde empezar</summary><ol style="margin:8px 0 0 18px;padding:0;line-height:1.6">' +
      '<li><b>Puesto</b>: revisá los precargados (sitio, servicio y cantidad de trabajadores) o agregá uno nuevo.</li><li><b>Planilla 1</b>: una por tarea (incluí las secundarias, suelen ser las más riesgosas). Marcá los factores que aparecen de forma habitual.</li>' +
      '<li><b>Planilla 2</b>: una por cada factor marcado. El portal te muestra las preguntas oficiales y calcula el resultado.</li><li><b>Evaluación de riesgos</b>: solo si la Planilla 2 no dio tolerable. Método, detalle y nivel 1, 2 o 3.</li>' +
      '<li><b>Planilla 3</b>: las 3 medidas generales (información y capacitación) y las específicas, separando lo que depende de HyS de lo que depende de la institución.</li><li><b>Planilla 4</b>: seguimiento hasta cerrar; reevaluar dentro de los 30 días de implementada la medida. Todo vale un año.</li></ol>' +
      '<p style="margin:8px 0 0">Prioridad (guía SRT): puestos con más quejas, más siniestros por sobreesfuerzo, lesiones graves, ausentismo o rotación. Firma del responsable de Medicina del Trabajo: HZT y HMH no tienen el servicio (depende de la institución).</p></details>' +
    '<section class="card" style="margin-top:12px"><div class="grid g4">' +
      '<label class="f">Establecimiento<select class="c" id="erEst"><option value="">Todos</option>' + ['HZT', 'HMH', 'HSST'].map(e => '<option' + (F.est === e ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></label>' +
      '<label class="f">Sitio<select class="c" id="erSit"><option value="">Todos</option>' + sitios.map(s => '<option' + (F.sitio === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' +
      '<label class="f">Estado<select class="c" id="erEdo"><option value="">Todos</option>' + estados.map(s => '<option' + (F.estado === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' +
      '<label class="f">Buscar<input class="c" id="erQ" type="search" value="' + esc(F.q) + '" placeholder="Función, servicio, ID…"></label></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px"><span class="mu peq">' + V.length + ' puesto(s)</span><button class="btn pri" id="erNuevo">+ Nuevo puesto</button></div></section>' +
    '<section class="card tabla" style="margin-top:12px"><table class="erT"><thead><tr><th>Puesto</th><th>Lugar</th><th>Trab.</th><th>Tareas</th><th>Estado</th><th>Medidas</th></tr></thead><tbody>' +
      V.slice(0, F.max).map(p => { const r = R.get(p.ID_PUESTO);
        return '<tr class="cl" data-erp="' + esc(p.ID_PUESTO) + '"><td data-l="Puesto"><b>' + esc(ergSd(p.FUNCION)) + '</b><div class="mu peq">' + esc(p.ID_PUESTO) + ' · ' + esc(ergSd(p.SERVICIO)) + (/precargado/i.test(p.ESTADO) ? ' · <span style="color:var(--wa)">precargado</span>' : '') + '</div></td>' +
          '<td data-l="Lugar">' + esc(p.ESTABLECIMIENTO) + ' · ' + esc(ergSd(p.SITIO)) + '</td><td data-l="Trabajadores">' + esc(ergSd(p.CANT_TRABAJADORES)) + '</td><td data-l="Tareas">' + r.I.length + '</td>' +
          '<td data-l="Estado">' + ergChipE(r.estado) + (r.vence ? '<div class="mu peq">Vence ' + fechaTxt(r.vence) + '</div>' : '') + '</td><td data-l="Medidas">' + (r.abiertas.length ? r.abiertas.length + ' abiertas' + (r.vencidas.length ? ' · <b style="color:var(--er)">' + r.vencidas.length + ' vencidas</b>' : '') : r.M.length ? 'Cumplidas' : '—') + '</td></tr>'; }).join('') +
    '</tbody></table>' + (V.length > F.max ? '<div style="padding:12px;text-align:center"><button class="btn sec" id="erMas">Mostrar más (' + (V.length - F.max) + ')</button></div>' : '') + '</section>' + ERG_PIE +
    '<style>@media (max-width:760px){.erT thead{display:none}.erT,.erT tbody,.erT tr,.erT td{display:block;width:100%}.erT tr{border-top:1px solid var(--ln);padding:10px 0}.erT td{border:0!important;padding:2px 12px!important}.erT td[data-l]::before{content:attr(data-l) ": ";color:var(--mu);font-weight:600}}</style>';
  const re = () => { F.max = 120; ergPintarTablero(); };
  $('erEst').onchange = e => { F.est = e.target.value; F.sitio = ''; re(); }; $('erSit').onchange = e => { F.sitio = e.target.value; re(); }; $('erEdo').onchange = e => { F.estado = e.target.value; re(); };
  let tq; $('erQ').oninput = e => { clearTimeout(tq); tq = setTimeout(() => { F.q = e.target.value.trim(); re(); setTimeout(() => { const i = $('erQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 350); };
  if ($('erMas')) $('erMas').onclick = () => { F.max += 200; ergPintarTablero(); };
  document.querySelectorAll('[data-erk]').forEach(b => b.onclick = () => { F.estado = b.dataset.erk; re(); });
  document.querySelectorAll('[data-erp]').forEach(tr => tr.onclick = () => location.hash = '#ergop/' + encodeURIComponent(tr.dataset.erp));
  $('erNuevo').onclick = () => ergFormPuesto(null);
}

// ------------------------------------------------------------------ Puesto
function ergFormPuesto(p) {
  const L = ERG.listas, sitios = L.SITIOS.map(s => s.sitio);
  modal(p ? 'Editar puesto ' + p.ID_PUESTO : 'Nuevo puesto', [['ESTABLECIMIENTO', 'Establecimiento', ['HZT', 'HMH', 'HSST']], ['SITIO', 'Sitio (edificio, CAPS o dispositivo)', { lista: sitios }], ['SERVICIO', 'Servicio / área y sector', { lista: Array.from(new Set(ERG.puestos.map(x => x.SERVICIO).filter(s => s && s !== 's/d'))).sort() }],
    ['FUNCION', 'Puesto (como lo nombra la institución)', { lista: Array.from(new Set(ERG.puestos.map(x => x.FUNCION).filter(Boolean))).sort() }], ['CANT_TRABAJADORES', 'N.º de trabajadores (todos los turnos)'], ['FAMILIA', 'Familia de puestos (opcional)'],
    ['ESTADO', 'Estado', L.ESTADO_PUESTO || ['Confirmado', 'Precargado (revisar)', 'Sin relevar', 'Baja']], ['TAREAS_SUGERIDAS', 'Tareas habituales (separadas por «;»)', null, 1], ['OBSERVACIONES', 'Observaciones', null, 1]],
    p ? Object.assign({}, p, { ESTADO: /precargado/i.test(p.ESTADO) ? 'Confirmado' : p.ESTADO }) : { ESTABLECIMIENTO: ERG_FILTRO.est || 'HZT', ESTADO: 'Confirmado' },
    async v => { if (!v.ESTABLECIMIENTO || !v.FUNCION) return 'Completá el establecimiento y el puesto.';
      if (p) v.ID_PUESTO = p.ID_PUESTO; const r = await api('p_ergo_puesto', v); if (!r.ok) return r.mensaje; toast('Puesto ' + r.id + ' guardado.'); await ergCargar(true);
      if (p) pantallaErgoPuesto(p.ID_PUESTO); else location.hash = '#ergop/' + encodeURIComponent(r.id); });
}
async function pantallaErgoPuesto(id) {
  if (!ERG) { cargando('#ergop', 'Leyendo el puesto…'); try { await ergCargar(); } catch (e) { return marco('#ergop', '<div class="aviso error">' + esc(e.message) + '</div>'); } }
  const p = ERG.puestos.find(x => x.ID_PUESTO === id); if (!p) return marco('#ergop', '<div class="aviso error">No encuentro el puesto ' + esc(id) + '. <a href="#ergo">Volver</a></div>');
  const r = ergResumen(p);
  const tareas = r.I.map(i => {
    const fs = Object.keys(ERG_F).map(f => { const marcado = i[ERG_F[f].col] === 'Sí', ev = marcado ? ergEvalDe(i.ID_IDENT, f) : null;
      if (!marcado) return '<div class="erFa off"><b>' + f + '</b><span>' + esc(ERG_F[f].t) + '</span><span class="mu">—</span></div>';
      return '<div class="erFa"><b>' + f + '</b><span>' + esc(ERG_F[f].t) + '</span>' + (ev ? ergChipR(ev.RESULTADO) : '<span class="chip gr">Falta la Planilla 2</span>') +
        '<span class="erAcc"><button class="link" data-ere="' + esc(i.ID_IDENT) + '" data-f="' + f + '">' + (ev ? 'Ver / corregir 2.' + f : 'Completar Planilla 2.' + f) + '</button>' +
        (ev && (ev.RESULTADO === 'A evaluar' || ev.METODO) ? ' · <button class="link" data-err="' + esc(ev.ID_EVAL) + '">' + (ev.METODO ? 'Evaluación de riesgos' : 'Hacer evaluación de riesgos') + '</button>' : '') +
        (ev && /Moderado|No tolerable|A evaluar/.test(ev.RESULTADO) ? ' · <button class="link" data-erm="' + esc(ev.ID_EVAL) + '">+ Medida</button>' : '') + '</span></div>'; }).join('');
    const gen = ERG_GEN.map(g => i[g[0]] || 's/d'), genOk = gen.every(v => v === 'Sí');
    return '<section class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start"><div><h2 style="margin:0">' + esc(i.TAREA) + '</h2><div class="mu peq">' + esc(i.ID_IDENT) + ' · Planilla 1 del ' + fechaTxt(ergIso(i.FECHA)) + ' · ' + esc(ergSd(i.TRABAJADORES_DEL_PUESTO)) + ' trabajador(es) · manifestación temprana: ' + esc(ergSd(i.MANIFESTACION_TEMPRANA)) + (i.UBICACION_SINTOMA ? ' (' + esc(i.UBICACION_SINTOMA) + ')' : '') + (i.FOTOS ? ' · <a href="' + esc(i.FOTOS) + '" target="_blank" rel="noopener">Fotos ↗</a>' : '') + '</div></div>' +
      '<button class="btn sec" data-eri="' + esc(i.ID_IDENT) + '">Editar Planilla 1</button></div><div class="erFs">' + fs + '</div>' +
      '<div class="peq" style="margin-top:8px">Planilla 3 · medidas generales (información y capacitación): ' + (genOk ? '<span class="chip ok">Las 3 cumplidas</span>' : '<span class="chip ' + (gen.some(v => v === 'No') ? 'er' : 'gr') + '">' + gen.filter(v => v === 'Sí').length + ' de 3</span>') + ' <button class="link" data-eri="' + esc(i.ID_IDENT) + '" data-gen="1">Completar</button></div></section>'; }).join('');
  const med = r.M.map(m => { const ven = m.ESTADO !== 'Cumplida' && m.FECHA_LIMITE && ergIso(m.FECHA_LIMITE) < ergHoy();
    return '<div class="item"><div><b>' + esc(m.ID_MEDIDA) + ' · ' + esc(m.DESCRIPCION) + '</b><div class="mu peq">' + esc(m.TIPO) + ' · factor ' + esc(ergSd(m.FACTOR)) + ' · depende de ' + esc(ergSd(m.DEPENDE_DE)) + ' · ' + esc(ergSd(m.PLAZO)) + (m.FECHA_LIMITE ? ' · límite ' + fechaTxt(ergIso(m.FECHA_LIMITE)) : '') + '</div></div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="chip ' + (m.ESTADO === 'Cumplida' ? 'ok' : ven ? 'er' : m.ESTADO === 'En curso' ? 'wa' : 'gr') + '">' + esc(ven ? 'Vencida' : m.ESTADO) + '</span><button class="link" data-ers="' + esc(m.ID_MEDIDA) + '">Seguimiento</button><button class="link" data-erme="' + esc(m.ID_MEDIDA) + '">Editar</button></div></div>'; }).join('');
  marco('#ergop', '<div class="cab"><div><a class="link" href="#ergo">← Ergonomía</a><h1>' + esc(ergSd(p.FUNCION)) + '</h1><span class="mu peq">' + esc(p.ID_PUESTO) + ' · ' + esc(p.ESTABLECIMIENTO) + ' · ' + esc(ergSd(p.SITIO)) + ' · ' + esc(ergSd(p.SERVICIO)) + '</span> ' + ergChipE(r.estado) + '</div>' +
    '<div class="filtros"><button class="btn sec" id="erEdit">Editar puesto</button><button class="btn sec" id="erImp">Imprimir protocolo</button><button class="btn pri" id="erTarea">+ Tarea (Planilla 1)</button></div></div>' +
    (/precargado/i.test(p.ESTADO) ? '<div class="aviso peq">Puesto precargado: revisá sitio, servicio y cantidad de trabajadores (Editar puesto). Al guardar la primera Planilla 1 queda confirmado.</div>' : '') +
    '<section class="card"><dl class="datos"><dt>Trabajadores</dt><dd>' + esc(ergSd(p.CANT_TRABAJADORES)) + '</dd><dt>Tareas sugeridas</dt><dd>' + esc(ergSd(p.TAREAS_SUGERIDAS)) + '</dd><dt>Observaciones</dt><dd>' + esc(ergSd(p.OBSERVACIONES)) + '</dd>' +
      (r.vence ? '<dt>Vigencia</dt><dd>Hasta el ' + fechaTxt(r.vence) + ' (la Planilla 1 vale un año; antes, si cambian tareas, equipos u organización, o aparece una manifestación temprana, una enfermedad profesional o un accidente)</dd>' : '') + '</dl>' +
      (r.falta.length ? '<div class="aviso peq" style="margin-top:10px"><b>Falta:</b> ' + r.falta.map(esc).join(' · ') + '</div>' : '') + '</section>' +
    (tareas || '<section class="card" style="margin-top:12px"><div class="vacio">Todavía no hay Planilla 1. Tocá «+ Tarea (Planilla 1)» y cargá una por cada tarea habitual, incluidas las secundarias.</div></section>') +
    '<section class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h2 style="margin:0">Planillas 3 y 4 · Medidas y seguimiento</h2><button class="btn sec" id="erMedNueva">+ Medida</button></div>' + (med || '<div class="mu peq" style="margin-top:8px">Sin medidas. Se cargan cuando la evaluación da nivel 2 o 3, o si un trabajador tiene molestia o dolor persistente.</div>') + '</section>' + ERG_PIE +
    '<style>.erFs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;margin-top:10px}.erFa{border:1px solid var(--ln);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;font-size:13px}.erFa b{color:var(--az);font-size:15px}.erFa.off{opacity:.55}.erAcc{font-size:12px}</style>');
  $('erEdit').onclick = () => ergFormPuesto(p); $('erTarea').onclick = () => ergFormIdent(p, null); $('erImp').onclick = () => ergImprimir(p);
  $('erMedNueva').onclick = () => ergFormMedida(p, null, null);
  document.querySelectorAll('[data-eri]').forEach(b => b.onclick = () => ergFormIdent(p, ERG.ident.find(i => i.ID_IDENT === b.dataset.eri), !!b.dataset.gen));
  document.querySelectorAll('[data-ere]').forEach(b => b.onclick = () => ergFormEval(p, ERG.ident.find(i => i.ID_IDENT === b.dataset.ere), b.dataset.f));
  document.querySelectorAll('[data-err]').forEach(b => b.onclick = () => ergFormRiesgo(p, ERG.evals.find(e => e.ID_EVAL === b.dataset.err)));
  document.querySelectorAll('[data-erm]').forEach(b => b.onclick = () => ergFormMedida(p, ERG.evals.find(e => e.ID_EVAL === b.dataset.erm), null));
  document.querySelectorAll('[data-erme]').forEach(b => b.onclick = () => { const m = ERG.medidas.find(x => x.ID_MEDIDA === b.dataset.erme); ergFormMedida(p, ERG.evals.find(e => e.ID_EVAL === m.ID_EVAL), m); });
  document.querySelectorAll('[data-ers]').forEach(b => b.onclick = () => ergFormSeg(ERG.medidas.find(x => x.ID_MEDIDA === b.dataset.ers), () => pantallaErgoPuesto(p.ID_PUESTO)));
}

// ------------------------------------------------------------------ Planilla 1 · Identificación (una por tarea)
function ergFormIdent(p, i, irGen) {
  const v = i ? Object.assign({}, i) : { FECHA: ergHoy(), TRABAJADORES_DEL_PUESTO: /^\d+$/.test(p.CANT_TRABAJADORES) ? p.CANT_TRABAJADORES : '', AREA_SECTOR: p.SERVICIO !== 's/d' ? p.SERVICIO : '' };
  const marcados = {}; Object.keys(ERG_F).forEach(f => marcados[f] = i ? i[ERG_F[f].col] === 'Sí' : false);
  const expo = {}; String(v.EXPOSICION || '').split(';').forEach(s => { const m = /^\s*([A-I]):\s*(.*)$/.exec(s); if (m) expo[m[1]] = m[2].trim(); });
  const sint = String(v.UBICACION_SINTOMA || '').split(',').map(s => s.trim()).filter(Boolean);
  const sugTareas = Array.from(new Set(ERG.tareas.filter(t => t.ACTIVA !== 'No').map(t => t.DESCRIPCION).concat(String(p.TAREAS_SUGERIDAS || '').split(/[;|]/).map(s => s.trim())).filter(s => s && s !== 's/d')));
  const sn = (k, val, ops) => '<select class="c" data-ei="' + k + '">' + (ops || ['s/d', 'Sí', 'No']).map(o => '<option' + ((val || 's/d') === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
  ERG.fotos.p1 = [];
  marco('#ergop', '<div class="cab"><div><button class="link" id="eiVolver">← ' + esc(ergSd(p.FUNCION)) + '</button><h1>Planilla 1 · Identificación de factores de riesgo</h1><span class="mu peq">' + esc(p.ID_PUESTO) + ' · ' + esc(p.ESTABLECIMIENTO) + ' · ' + esc(ergSd(p.SITIO)) + (i ? ' · ' + esc(i.ID_IDENT) : ' · tarea nueva') + '</span></div></div>' +
    '<div class="aviso peq">Una Planilla 1 por tarea habitual (también las secundarias). Marcá los factores que aparecen <b>de forma habitual</b> en la jornada; para cada uno marcado vas a completar después su Planilla 2. Si varios puestos son iguales (misma tecnología, mobiliario, métodos y cargas), se evalúa uno como testigo.</div>' +
    '<section class="card" style="margin-top:12px"><h2>Encabezado</h2><div class="grid g4">' +
      '<label class="f">Fecha<input class="c" type="date" data-ei="FECHA" value="' + esc(ergIso(v.FECHA)) + '"></label>' +
      '<label class="f" style="grid-column:span 2">Tarea habitual<input class="c" data-ei="TAREA" list="eiTareas" value="' + esc(v.TAREA || '') + '" autocomplete="off"><datalist id="eiTareas">' + sugTareas.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist><span class="mu peq" id="eiSug"></span></label>' +
      '<label class="f">Área y sector<input class="c" data-ei="AREA_SECTOR" value="' + esc(v.AREA_SECTOR || '') + '"></label>' +
      '<label class="f">N.º de trabajadores (todos los turnos)<input class="c" type="number" min="0" data-ei="TRABAJADORES_DEL_PUESTO" value="' + esc(/^\d+$/.test(v.TRABAJADORES_DEL_PUESTO) ? v.TRABAJADORES_DEL_PUESTO : '') + '"></label>' +
      '<label class="f">Procedimiento de trabajo escrito' + sn('PROCEDIMIENTO_ESCRITO', v.PROCEDIMIENTO_ESCRITO) + '<span class="mu peq">Sí solo si describe actividades, métodos, medios y seguridad.</span></label>' +
      '<label class="f">Capacitación en la tarea' + sn('CAPACITACION', v.CAPACITACION) + '</label>' +
      '<label class="f">Responsable<input class="c" data-ei="RESPONSABLE" value="' + esc(v.RESPONSABLE || 'Belén Pellegrini (HyS)') + '"></label>' +
      '<label class="f" style="grid-column:1/-1">Nombre de los trabajadores (si son muchos, «nómina aparte»)<textarea class="c" data-ei="NOMBRES_TRABAJADORES">' + esc(v.NOMBRES_TRABAJADORES || '') + '</textarea></label></div></section>' +
    '<section class="card" style="margin-top:12px"><h2>Factores de riesgo presentes en la tarea</h2><div class="mu peq">Tocá Sí / No en cada uno. «Sugeridos» sale del catálogo de tareas: es una ayuda, decidí con lo que ves.</div><div class="eiFs">' +
      Object.keys(ERG_F).map(f => '<div class="eiF" data-fac="' + f + '"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>' + f + ' · ' + esc(ERG_F[f].t) + '</b><span class="sino"><button type="button" class="btn ' + (marcados[f] ? 'pri' : 'sec') + '" data-fs="' + f + '" data-v="Sí">Sí</button><button type="button" class="btn ' + (!marcados[f] ? 'pri' : 'sec') + '" data-fs="' + f + '" data-v="No">No</button></span></div>' +
        '<details class="peq"><summary class="mu" style="cursor:pointer">Qué mirar</summary>' + esc(ERG_F[f].mirar) + '</details>' +
        '<label class="f peq" ' + (marcados[f] ? '' : 'hidden') + ' data-fx="' + f + '">Tiempo total de exposición (h por jornada o % de la jornada)<input class="c" data-exp="' + f + '" value="' + esc(expo[f] || '') + '"></label></div>').join('') + '</div></section>' +
    '<section class="card" style="margin-top:12px"><h2>Manifestación temprana</h2><div class="grid g4"><label class="f">¿Hay dolor o molestia habitual, durante o al final de la jornada, asociada a la tarea?' + sn('MANIFESTACION_TEMPRANA', v.MANIFESTACION_TEMPRANA) + '<span class="mu peq">Se pregunta al trabajador; también al supervisor o al delegado.</span></label>' +
      '<div class="f" style="grid-column:span 3">Ubicación del síntoma<div class="multi">' + ERG_SINT.map(s => '<label><input type="checkbox" data-sint value="' + esc(s) + '"' + (sint.indexOf(s) >= 0 ? ' checked' : '') + '> ' + esc(s) + '</label>').join(' ') + '</div></div>' +
      '<label class="f">Frecuencia de la tarea<input class="c" data-ei="FRECUENCIA" value="' + esc(v.FRECUENCIA || '') + '" placeholder="p. ej. 8 veces por turno"></label><label class="f">Duración<input class="c" data-ei="DURACION" value="' + esc(v.DURACION || '') + '" placeholder="p. ej. 3 h por jornada"></label>' +
      '<label class="f" style="grid-column:span 2">Observaciones<textarea class="c" data-ei="OBSERVACIONES">' + esc(v.OBSERVACIONES || '') + '</textarea></label></div>' +
      '<div class="f" style="margin-top:10px">Fotos de la tarea (hasta 5)' + ergFotosHtml('p1', v.FOTOS) + '</div></section>' +
    '<section class="card" style="margin-top:12px" id="eiGen"><h2>Planilla 3 · Medidas preventivas generales</h2><div class="mu peq">Para todos los trabajadores del puesto. Si alguna da NO, hay que implementarla y documentarla (se cumplen con el Módulo 9 · Capacitaciones). Se pueden completar después.</div>' +
      ERG_GEN.map((g, n) => '<div class="item"><span class="peq">' + (n + 1) + '. ' + esc(g[1]) + '</span>' + sn(g[0], v[g[0]]) + '</div>').join('') +
      '<div class="grid g4"><label class="f">Fecha<input class="c" type="date" data-ei="GEN_FECHA" value="' + esc(ergIso(v.GEN_FECHA)) + '"></label><label class="f" style="grid-column:span 3">Observaciones (capacitación, fecha y registro)<input class="c" data-ei="GEN_OBS" value="' + esc(v.GEN_OBS || '') + '"></label></div></section>' +
    '<div class="filtros" style="margin-top:12px;justify-content:flex-end"><button class="btn sec" id="eiCan">Cancelar</button><button class="btn pri" id="eiOk">Guardar Planilla 1</button></div>' + ERG_PIE +
    '<style>.eiFs{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:10px}.eiF{border:1px solid var(--ln);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px}.eiF.si{border-color:var(--az);background:#F4F8FA}.sino{display:flex;gap:4px}.sino .btn{min-height:34px;padding:4px 12px}.multi{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;font-size:14px}</style>');
  const volver = () => pantallaErgoPuesto(p.ID_PUESTO);
  $('eiVolver').onclick = volver; $('eiCan').onclick = volver; ergFotosActivar('p1', v.FOTOS);
  const pintarF = f => { document.querySelectorAll('[data-fs="' + f + '"]').forEach(b => b.className = 'btn ' + ((b.dataset.v === 'Sí') === marcados[f] ? 'pri' : 'sec')); document.querySelector('[data-fac="' + f + '"]').classList.toggle('si', marcados[f]); document.querySelector('[data-fx="' + f + '"]').hidden = !marcados[f]; };
  Object.keys(ERG_F).forEach(pintarF);
  let tocado = !!i; document.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { tocado = true; marcados[b.dataset.fs] = b.dataset.v === 'Sí'; pintarF(b.dataset.fs); });
  const tIn = document.querySelector('[data-ei="TAREA"]');
  const sug = () => { const t = ERG.tareas.find(x => x.DESCRIPCION === tIn.value.trim()); $('eiSug').textContent = t && t.FACTORES_SUGERIDOS ? 'Sugeridos para esta tarea: ' + t.FACTORES_SUGERIDOS : '';
    if (t && !tocado) { String(t.FACTORES_SUGERIDOS || '').split(/[,\s]+/).filter(f => ERG_F[f]).forEach(f => { marcados[f] = true; pintarF(f); }); } };
  tIn.onchange = sug; sug();
  if (irGen) setTimeout(() => $('eiGen').scrollIntoView({ behavior: 'smooth' }), 50);
  $('eiOk').onclick = async () => {
    const x = { ID_PUESTO: p.ID_PUESTO, ID_IDENT: i ? i.ID_IDENT : '' }; document.querySelectorAll('[data-ei]').forEach(el => x[el.dataset.ei] = el.value.trim());
    if (!x.TAREA) return toast('Escribí la tarea.');
    Object.keys(ERG_F).forEach(f => x['F_' + f] = marcados[f] ? 'Sí' : 'No');
    x.EXPOSICION = Object.keys(ERG_F).filter(f => marcados[f]).map(f => { const e = document.querySelector('[data-exp="' + f + '"]').value.trim(); return e ? f + ': ' + e : ''; }).filter(Boolean).join('; ');
    x.UBICACION_SINTOMA = [...document.querySelectorAll('[data-sint]:checked')].map(c => c.value).join(', ');
    x.fotos = ERG.fotos.p1;
    const b = $('eiOk'); b.disabled = true; b.textContent = 'Guardando…';
    try { const r = await api('p_ergo_ident', x, 180000); if (!r.ok) throw new Error(r.mensaje); toast('Planilla 1 guardada (' + r.id + ').'); await ergCargar(true); volver(); }
    catch (e) { toast(e.message || 'No se pudo guardar.'); b.disabled = false; b.textContent = 'Guardar Planilla 1'; }
  };
}

// ------------------------------------------------------------------ Planilla 2 · Evaluación inicial (una por tarea y factor)
function ergFormEval(p, i, f) {
  const g = ERG_F[f], ev = ergEvalDe(i.ID_IDENT, f);
  let R = { p1: [], p2: [], datos: {} }; try { if (ev && ev.RESPUESTAS) R = Object.assign(R, JSON.parse(ev.RESPUESTAS)); } catch (e) {}
  ERG.fotos.p2 = [];
  const fila = (paso, n, txt) => { const val = R['p' + paso][n - 1] || '';
    return '<div class="item epQ" data-q="' + paso + '-' + n + '"><span class="peq"><b>' + n + '.</b> ' + esc(txt) + ((paso === 1 && (g.inm || []).indexOf(n) >= 0) ? ' <span class="chip mini er">SÍ = no tolerable</span>' : (paso === 2 && (g.mejora || []).indexOf(n) >= 0) ? ' <span class="chip mini wa">SÍ = implementar mejoras</span>' : '') + '</span>' +
      '<span class="sino"><button type="button" class="btn ' + (val === 'Sí' ? 'pri' : 'sec') + '" data-pq="' + paso + '" data-n="' + n + '" data-v="Sí">Sí</button><button type="button" class="btn ' + (val === 'No' ? 'pri' : 'sec') + '" data-pq="' + paso + '" data-n="' + n + '" data-v="No">No</button></span></div>'; };
  marco('#ergop', '<div class="cab"><div><button class="link" id="epVolver">← ' + esc(ergSd(p.FUNCION)) + '</button><h1>Planilla 2.' + f + ' · ' + esc(g.t) + '</h1><span class="mu peq">' + esc(i.TAREA) + ' · ' + esc(p.ESTABLECIMIENTO) + ' · ' + esc(ergSd(p.SITIO)) + (ev ? ' · ' + esc(ev.ID_EVAL) : '') + '</span></div></div>' +
    '<div class="aviso peq"><b>Regla:</b> ' + esc(g.regla) + ' Paso 2 todas NO: se presume tolerable (nivel 1); alguna SÍ: hace falta la evaluación de riesgos.<br><b>Qué mirar:</b> ' + esc(g.mirar) + '</div>' +
    (g.datos.length ? '<section class="card" style="margin-top:12px"><h2>Datos medidos (ayuda para contestar)</h2><div class="grid g4">' + g.datos.map(d => '<label class="f">' + esc(d[1]) + '<input class="c" data-ed="' + d[0] + '" value="' + esc(R.datos[d[0]] || '') + '"></label>').join('') + '</div><div class="peq" id="epCalc" style="margin-top:6px"></div>' +
      (f === 'E' ? '<details class="peq" style="margin-top:6px"><summary class="mu" style="cursor:pointer">Escala de Borg</summary>0 ausencia de esfuerzo · 0,5 muy bajo · 1 muy débil · 2 débil · 3 moderado · 4 algo fuerte · 5 y 6 fuerte · 7, 8 y 9 muy fuerte · 10 extremadamente fuerte (máximo que una persona puede aguantar).</details>' : '') + '</section>' : '') +
    '<section class="card" style="margin-top:12px"><h2>Paso 1 · ¿El factor está en las condiciones de la norma?</h2>' + g.p1.map((q, n) => fila(1, n + 1, q)).join('') + '</section>' +
    '<section class="card" style="margin-top:12px" id="epP2"><h2>Paso 2 · Condiciones que agravan</h2>' + g.p2.map((q, n) => fila(2, n + 1, q)).join('') + '</section>' +
    '<section class="card" style="margin-top:12px"><div class="kpi resultado" id="epRes"></div><div class="grid g4" style="margin-top:10px"><label class="f">Fecha<input class="c" type="date" id="epFecha" value="' + esc(ergIso(ev ? ev.FECHA : '') || ergHoy()) + '"></label><label class="f">Responsable<input class="c" id="epResp" value="' + esc(ev ? ev.RESPONSABLE : 'Belén Pellegrini (HyS)') + '"></label>' +
      '<label class="f" style="grid-column:span 2">Observaciones<textarea class="c" id="epObs">' + esc(ev ? ev.OBSERVACIONES : '') + '</textarea></label></div><div class="f" style="margin-top:10px">Fotos de lo que se marcó SÍ (hasta 5)' + ergFotosHtml('p2', ev && ev.FOTOS) + '</div></section>' +
    '<div class="filtros" style="margin-top:12px;justify-content:flex-end"><button class="btn sec" id="epCan">Cancelar</button><button class="btn pri" id="epOk">Guardar Planilla 2.' + f + '</button></div>' + ERG_PIE +
    '<style>.sino{display:flex;gap:4px;flex-shrink:0}.sino .btn{min-height:34px;padding:4px 14px}.epQ.no-aplica{display:none}</style>');
  const volver = () => pantallaErgoPuesto(p.ID_PUESTO);
  $('epVolver').onclick = volver; $('epCan').onclick = volver; ergFotosActivar('p2', ev && ev.FOTOS);
  const calc = () => { const d = {}; document.querySelectorAll('[data-ed]').forEach(el => d[el.dataset.ed] = el.value.trim()); R.datos = d; const c = $('epCalc'); if (!c) return; const num = s => Number(String(s || '').replace(',', '.'));
    if (f === 'C' && num(d.peso) && num(d.veces)) { const m = num(d.peso) * num(d.veces), dist = num(d.dist); c.innerHTML = 'Masa acumulada en la jornada: <b>' + m.toLocaleString('es-AR') + ' kg</b>' + (dist ? ' a ' + dist + ' m → límite ' + (dist <= 10 ? '10.000' : dist <= 20 ? '6.000' : 'ver Tabla 1 de la Res. SRT 3345/15') + ' kg' + ((dist <= 10 && m > 10000) || (dist > 10 && dist <= 20 && m > 6000) ? ' · <b style="color:var(--er)">lo supera</b>' : '') : '') + '. Total diario permitido a mano: 10.000 kg.'; }
    else if (f === 'A' && num(d.peso)) c.innerHTML = num(d.peso) > 25 ? '<b style="color:var(--er)">Más de 25 kg: la 3 del Paso 1 es SÍ (no tolerable).</b>' : num(d.peso) > 2 ? 'Entre 2 y 25 kg: la 1 del Paso 1 es SÍ.' : 'Hasta 2 kg: no aplica.';
    else if (f === 'B' && (num(d.empuje) || num(d.arrastre))) c.innerHTML = 'Empuje: ' + (num(d.empuje) ? num(d.empuje) + ' kgf' + (num(d.empuje) > 34 ? ' · <b style="color:var(--er)">más de 34 kgf: no tolerable</b>' : num(d.empuje) >= 10 ? ' · ≥ 10 kgf (mujeres) / ≥ 12 kgf (hombres): revisar la 1 del Paso 2' : '') : 's/d') + ' · Arrastre: ' + (num(d.arrastre) ? num(d.arrastre) + ' kgf' + (num(d.arrastre) >= 10 ? ' · ≥ 10 kgf: la 2 del Paso 2 es SÍ' : '') : 's/d');
    else if (f === 'E' && d.borg !== undefined && d.borg !== '') c.innerHTML = num(d.borg) > 7 ? '<b style="color:var(--er)">Borg mayor a 7: la 3 del Paso 2 es SÍ.</b>' : num(d.borg) > 3 ? 'Borg mayor a 3: revisá la 2 del Paso 2 (más de 6 s y más de una vez por minuto).' : 'Borg hasta 3.';
    else if (f === 'D' && num(d.horas)) c.innerHTML = num(d.horas) >= 2 ? 'De pie 2 h seguidas o más: la 1 del Paso 1 es SÍ.' : 'Menos de 2 h seguidas de pie: no aplica.';
    else c.innerHTML = ''; };
  const pintar = () => { [1, 2].forEach(paso => document.querySelectorAll('[data-pq="' + paso + '"]').forEach(b => b.className = 'btn ' + (R['p' + paso][b.dataset.n - 1] === b.dataset.v ? 'pri' : 'sec')));
    const res = ergResultado(f, R.p1, R.p2), p1si = R.p1.some(v => v === 'Sí'), inm = (g.inm || []).some(q => R.p1[q - 1] === 'Sí'), q2 = ergPreg2(f, R.p1);
    $('epP2').hidden = !p1si || inm; document.querySelectorAll('#epP2 .epQ').forEach(el => el.classList.toggle('no-aplica', q2.indexOf(Number(el.dataset.q.split('-')[1])) < 0));
    $('epRes').innerHTML = '<span>Resultado</span><b>' + ergChipR(res.r) + '</b><small>' + esc(res.e) + (ev && ev.METODO && res.r === 'A evaluar' ? ' · ya tiene evaluación de riesgos (' + esc(ev.METODO) + ', nivel ' + esc(ev.NIVEL_RIESGO) + '): se conserva' : '') + '</small>'; };
  document.querySelectorAll('[data-pq]').forEach(b => b.onclick = () => { const a = R['p' + b.dataset.pq], n = b.dataset.n - 1; a[n] = a[n] === b.dataset.v ? '' : b.dataset.v; pintar(); });
  document.querySelectorAll('[data-ed]').forEach(el => el.oninput = calc); calc(); pintar();
  $('epOk').onclick = async () => {
    const q2 = ergPreg2(f, R.p1); R.p2 = R.p2.map((v, n) => q2.indexOf(n + 1) >= 0 && R.p1.some(x => x === 'Sí') ? v : '');
    const res = ergResultado(f, R.p1, R.p2);
    if (res.r === 'Pendiente' && !confirm(res.e + '. ¿Guardar igual y completar después?')) return;
    const b = $('epOk'); b.disabled = true; b.textContent = 'Guardando…';
    try { const r = await api('p_ergo_eval', { ID_EVAL: ev ? ev.ID_EVAL : '', ID_IDENT: i.ID_IDENT, FACTOR: f, p1: R.p1, p2: R.p2, datos: R.datos, FECHA: $('epFecha').value, RESPONSABLE: $('epResp').value.trim(), OBSERVACIONES: $('epObs').value.trim(), fotos: ERG.fotos.p2 }, 180000);
      if (!r.ok) throw new Error(r.mensaje); toast('Planilla 2.' + f + ' guardada: ' + r.resultado + '.'); await ergCargar(true);
      if (r.resultado === 'A evaluar' && !(ev && ev.METODO)) { pantallaErgoPuesto(p.ID_PUESTO); ergFormRiesgo(p, ERG.evals.find(e => e.ID_EVAL === r.id)); } else volver(); }
    catch (e) { toast(e.message || 'No se pudo guardar.'); b.disabled = false; b.textContent = 'Guardar Planilla 2.' + f; }
  };
}

// ------------------------------------------------------------------ Evaluación de riesgos (sobre la Planilla 2)
function ergFormRiesgo(p, ev) {
  if (!ev) return; const g = ERG_F[ev.FACTOR]; ERG.fotos.er = [];
  const m = modal('Evaluación de riesgos · 2.' + ev.FACTOR + ' · ' + ev.TAREA, [['FECHA_EVAL_RIESGO', 'Fecha', 'date'], ['METODO', 'Método usado', { lista: g.metodos.concat(['Otro método reconocido']) }],
    ['NIVEL_RIESGO', 'Nivel de riesgo', ['1', '2', '3']], ['EVALUADOR', 'Profesional que evalúa (con formación en ergonomía)'], ['METODO_DETALLE', 'Desarrollo y resultado del método (valores, puntaje, condiciones de la tarea)', null, 1]],
    { FECHA_EVAL_RIESGO: ergIso(ev.FECHA_EVAL_RIESGO) || ergHoy(), METODO: ev.METODO || g.metodos[0], NIVEL_RIESGO: ev.NIVEL_RIESGO || '', EVALUADOR: ev.EVALUADOR || 'Belén Pellegrini (HyS)', METODO_DETALLE: ev.METODO_DETALLE || '' },
    async v => { v.ID_EVAL = ev.ID_EVAL; v.fotos = ERG.fotos.er; const r = await api('p_ergo_riesgo', v, 180000); if (!r.ok) return r.mensaje; toast('Evaluación de riesgos guardada: nivel ' + r.nivel + '.'); await ergCargar(true); pantallaErgoPuesto(p.ID_PUESTO);
      if (r.nivel !== '1') setTimeout(() => ergFormMedida(p, ERG.evals.find(e => e.ID_EVAL === ev.ID_EVAL), null), 300); },
    '<div class="aviso peq"><b>Niveles (Anexo III):</b> 1 tolerable (sin medidas; se repite al año) · 2 moderado (medidas correctivas o preventivas) · 3 no tolerable (medidas inmediatas). Métodos de la norma argentina para este factor: ' + esc(g.metodos[0]) + '. Registrá el método, su desarrollo y el resultado.</div><div class="f">Fotos o planilla del método (hasta 5)' + ergFotosHtml('er', ev.FOTOS_RIESGO) + '</div>');
  ergFotosActivar('er', ev.FOTOS_RIESGO); return m;
}

// ------------------------------------------------------------------ Planilla 3 · Medida específica
function ergFormMedida(p, ev, med) {
  const L = ERG.listas, f = (ev && ev.FACTOR) || (med && med.FACTOR) || '', nivel = ev ? ev.NIVEL_RIESGO : '';
  ERG.fotos.me = [];
  modal(med ? 'Editar medida ' + med.ID_MEDIDA : 'Nueva medida · ' + (ev ? '2.' + f + ' · ' + ev.TAREA : ergSd(p.FUNCION)), [['TIPO', 'Tipo', L.TIPO_MEDIDA || ['Ingeniería', 'Administrativa', 'Organizacional', 'Capacitación', 'Ayuda mecánica / EPP', 'Vigilancia de la salud']],
    ['DEPENDE_DE', 'Depende de', ['HyS', 'Institución']], ['DESCRIPCION', 'Medida (qué se hace)', { lista: f && ERG_F[f] ? ERG_F[f].medidas : [] }], ['PLAZO', 'Plazo', L.PLAZO || ['Actuar ya (30 días)', 'Resolver rápido (90 días)', 'Planificar (180 días)']],
    ['RESPONSABLE', 'Responsable de implementarla'], ['FECHA_ALTA', 'Fecha', 'date'], ['ESTADO', 'Estado', L.ESTADO_MEDIDA || ['Abierta', 'En curso', 'Cumplida']], ['OBSERVACIONES', 'Observaciones (acuerdo, acta)', null, 1]],
    med ? Object.assign({}, med, { FECHA_ALTA: ergIso(med.FECHA_ALTA) }) : { TIPO: 'Ingeniería', DEPENDE_DE: 'Institución', PLAZO: nivel === '3' ? 'Actuar ya (30 días)' : 'Resolver rápido (90 días)', FECHA_ALTA: ergHoy(), ESTADO: 'Abierta' },
    async v => { if (!v.DESCRIPCION) return 'Describí la medida.'; Object.assign(v, { ID_MEDIDA: med ? med.ID_MEDIDA : '', ID_EVAL: ev ? ev.ID_EVAL : '', ID_PUESTO: p.ID_PUESTO, FACTOR: f, fotos: ERG.fotos.me });
      const r = await api('p_ergo_medida', v, 180000); if (!r.ok) return r.mensaje; toast('Medida ' + r.id + ' guardada.'); await ergCargar(true); pantallaErgoPuesto(p.ID_PUESTO); },
    '<div class="aviso peq">Nivel 3: medidas inmediatas (Actuar ya, 30 días). Nivel 2: correctivas o preventivas (90 o 180 días). Los plazos son del Portal; la 886 no fija días. Las específicas se definen con el trabajador del puesto y sus representantes, con acuerdo del responsable del establecimiento (constancia en acta). Ingeniería y ayudas mecánicas suelen depender de la institución; información, capacitación y verificación, de HyS.</div><div class="f">Fotos (hasta 5)' + ergFotosHtml('me', med && med.FOTOS) + '</div>');
  ergFotosActivar('me', med && med.FOTOS);
  const tipo = document.querySelector('#ov [data-k="TIPO"]'), dep = document.querySelector('#ov [data-k="DEPENDE_DE"]');
  if (tipo && !med) tipo.onchange = () => { dep.value = /Capacitación|Vigilancia/.test(tipo.value) ? 'HyS' : 'Institución'; };
}

// ------------------------------------------------------------------ Planilla 4 · Seguimiento
function ergFormSeg(m, despues) {
  if (!m) return; ERG.fotos.se = [];
  const S = ERG.seg.filter(s => s.ID_MEDIDA === m.ID_MEDIDA).sort((a, b) => String(b.ID_SEG).localeCompare(String(a.ID_SEG)));
  modal('Seguimiento · ' + m.ID_MEDIDA, [['FECHA', 'Fecha de la verificación', 'date'], ['ESTADO_MEDIDA', '¿Está implementada?', ['Implementada', 'Parcial', 'No implementada']], ['EFICACIA', '¿Fue eficaz?', ['Eficaz', 'No eficaz', 's/d']],
    ['REEVALUAR', '¿Hay que reevaluar el puesto?', ['Sí', 'No', 's/d']], ['RESPONSABLE', 'Quién verifica'], ['OBSERVACIONES', 'Observaciones', null, 1]],
    { FECHA: ergHoy(), EFICACIA: 's/d', REEVALUAR: 's/d', RESPONSABLE: 'Belén Pellegrini (HyS)' },
    async v => { if (!v.ESTADO_MEDIDA) return 'Indicá si está implementada.'; v.ID_MEDIDA = m.ID_MEDIDA; v.fotos = ERG.fotos.se; const r = await api('p_ergo_seg', v, 180000); if (!r.ok) return r.mensaje; toast('Seguimiento guardado.'); await ergCargar(true); (despues || pantallaErgoMedidas)(); },
    '<div class="peq"><b>' + esc(m.DESCRIPCION) + '</b> · ' + esc(m.TIPO) + ' · depende de ' + esc(ergSd(m.DEPENDE_DE)) + (m.FECHA_LIMITE ? ' · límite ' + fechaTxt(ergIso(m.FECHA_LIMITE)) : '') + '</div>' +
    '<div class="aviso peq">Después de implementar las medidas administrativas y de ingeniería, se reevalúa dentro de los 30 días para confirmar que el nivel bajó a tolerable (nueva Planilla 2 de ese factor). Implementada + eficaz + sin reevaluar = medida cerrada.</div>' +
    (S.length ? '<div class="peq"><b>Anteriores:</b> ' + S.map(s => fechaTxt(ergIso(s.FECHA)) + ' · ' + esc(s.ESTADO_MEDIDA) + ' · ' + esc(s.EFICACIA) + (s.OBSERVACIONES ? ' (' + esc(s.OBSERVACIONES) + ')' : '')).join(' | ') + '</div>' : '') +
    '<div class="f">Fotos de la verificación (hasta 5)' + ergFotosHtml('se', '') + '</div>');
  ergFotosActivar('se', '');
}
async function pantallaErgoMedidas() {
  if (!ERG) { cargando('#ergomed', 'Leyendo las medidas…'); try { await ergCargar(); } catch (e) { return marco('#ergomed', '<div class="aviso error">' + esc(e.message) + '</div>'); } }
  const F = ERG_MF, hoy = ergHoy(), Pm = new Map(ERG.puestos.map(p => [p.ID_PUESTO, p]));
  const ven = m => m.ESTADO !== 'Cumplida' && m.FECHA_LIMITE && ergIso(m.FECHA_LIMITE) < hoy;
  const V = ERG.medidas.filter(m => (!F.est || m.ESTABLECIMIENTO === F.est) && (F.estado === 'todas' || (F.estado === 'abiertas' ? m.ESTADO !== 'Cumplida' : F.estado === 'vencidas' ? ven(m) : F.estado === 'reevaluar' ? (m.FECHA_IMPLEMENTACION && !m.FECHA_CIERRE) : m.ESTADO === 'Cumplida')))
    .sort((a, b) => (ven(b) - ven(a)) || String(ergIso(a.FECHA_LIMITE)).localeCompare(String(ergIso(b.FECHA_LIMITE))));
  marco('#ergomed', '<div class="cab"><div><a class="link" href="#ergo">← Ergonomía</a><h1>Planilla 4 · Medidas y seguimiento</h1><span class="mu peq">Matriz de seguimiento: N.º de medida, puesto, fecha de evaluación, nivel, implementación administrativa y de ingeniería, y cierre.</span></div>' +
    '<div class="filtros"><select class="c" id="emEst"><option value="">Todos</option>' + ['HZT', 'HMH', 'HSST'].map(e => '<option' + (F.est === e ? ' selected' : '') + '>' + e + '</option>').join('') + '</select>' +
    '<select class="c" id="emEdo">' + [['abiertas', 'Abiertas'], ['vencidas', 'Vencidas'], ['reevaluar', 'Implementadas sin cerrar (reevaluar)'], ['cumplidas', 'Cumplidas'], ['todas', 'Todas']].map(o => '<option value="' + o[0] + '"' + (F.estado === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div></div>' +
    '<section class="card tabla"><table class="erT"><thead><tr><th>Medida</th><th>Puesto</th><th>Evaluación · nivel</th><th>Depende de</th><th>Límite</th><th>Implementada</th><th>Cierre</th><th>Estado</th></tr></thead><tbody>' +
    (V.map(m => { const p = Pm.get(m.ID_PUESTO) || {}, ev = ERG.evals.find(e => e.ID_EVAL === m.ID_EVAL) || {}, impl = ergIso(m.FECHA_IMPLEMENTACION), reev = impl && !m.FECHA_CIERRE ? ergMas(impl, 30) : '';
      return '<tr class="cl" data-ems="' + esc(m.ID_MEDIDA) + '"><td data-l="Medida"><b>' + esc(m.ID_MEDIDA) + '</b> · ' + esc(m.DESCRIPCION) + '<div class="mu peq">' + esc(m.TIPO) + ' · factor ' + esc(ergSd(m.FACTOR)) + '</div></td><td data-l="Puesto">' + esc(ergSd(p.FUNCION)) + '<div class="mu peq">' + esc(m.ESTABLECIMIENTO) + ' · ' + esc(ergSd(m.SITIO)) + '</div></td>' +
        '<td data-l="Evaluación">' + (ev.FECHA ? fechaTxt(ergIso(ev.FECHA)) : 's/d') + ' · ' + esc(ergSd(ev.NIVEL_RIESGO)) + '</td><td data-l="Depende de">' + esc(ergSd(m.DEPENDE_DE)) + '</td><td data-l="Límite">' + (m.FECHA_LIMITE ? fechaTxt(ergIso(m.FECHA_LIMITE)) : 's/d') + '</td>' +
        '<td data-l="Implementada">' + (impl ? fechaTxt(impl) + (/Ingeniería|Ayuda/.test(m.TIPO) ? ' (ingeniería)' : ' (administrativa)') : '—') + (reev ? '<div class="peq" style="color:' + (reev < hoy ? 'var(--er)' : 'var(--wa)') + '">Reevaluar antes del ' + fechaTxt(reev) + '</div>' : '') + '</td>' +
        '<td data-l="Cierre">' + (m.FECHA_CIERRE ? fechaTxt(ergIso(m.FECHA_CIERRE)) : '—') + '</td><td data-l="Estado"><span class="chip ' + (m.ESTADO === 'Cumplida' ? 'ok' : ven(m) ? 'er' : m.ESTADO === 'En curso' ? 'wa' : 'gr') + '">' + esc(ven(m) ? 'Vencida' : m.ESTADO) + '</span></td></tr>'; }).join('') || '<tr><td colspan="8" class="vacio">No hay medidas en esta vista.</td></tr>') +
    '</tbody></table></section><p class="mu peq">Tocá una medida para cargar el seguimiento. Si falta GitHub: planilla, hojas MEDIDAS y SEGUIMIENTO.</p>' + ERG_PIE +
    '<style>@media (max-width:760px){.erT thead{display:none}.erT,.erT tbody,.erT tr,.erT td{display:block;width:100%}.erT tr{border-top:1px solid var(--ln);padding:10px 0}.erT td{border:0!important;padding:2px 12px!important}.erT td[data-l]::before{content:attr(data-l) ": ";color:var(--mu);font-weight:600}}</style>');
  $('emEst').onchange = e => { F.est = e.target.value; pantallaErgoMedidas(); }; $('emEdo').onchange = e => { F.estado = e.target.value; pantallaErgoMedidas(); };
  document.querySelectorAll('[data-ems]').forEach(tr => tr.onclick = () => ergFormSeg(ERG.medidas.find(m => m.ID_MEDIDA === tr.dataset.ems)));
}

// ------------------------------------------------------------------ Imprimir el protocolo del puesto (Planillas 1 a 4 con firmas)
function ergImprimir(p) {
  const w = window.open('', '_blank'); if (!w) return toast('El navegador bloqueó la ventana para imprimir.');
  const r = ergResumen(p), raya = '<span style="display:inline-block;min-width:160px;border-bottom:1px solid #999">&nbsp;</span>';
  const enc = '<table><tr><td><b>Razón social:</b> ' + raya + '</td><td><b>CUIT:</b> ' + raya + '</td><td><b>CIIU:</b> ' + raya + '</td></tr><tr><td><b>Establecimiento:</b> ' + esc(p.ESTABLECIMIENTO) + ' · ' + esc(ergSd(p.SITIO)) + '</td><td><b>Dirección:</b> ' + raya + '</td><td><b>Provincia:</b> Chubut</td></tr><tr><td><b>Área y sector:</b> ' + esc(ergSd(p.SERVICIO)) + '</td><td colspan="2"><b>Puesto:</b> ' + esc(ergSd(p.FUNCION)) + ' (' + esc(p.ID_PUESTO) + ') · <b>N.º de trabajadores:</b> ' + esc(ergSd(p.CANT_TRABAJADORES)) + '</td></tr></table>';
  const firmas = '<table class="fir"><tr><td>Firma, aclaración y registro<br>Responsable de Higiene y Seguridad</td><td>Firma, aclaración y registro<br>Responsable de Medicina del Trabajo</td><td>Firma y aclaración<br>Empleador o representante</td></tr></table>';
  const nivelDe = (i, f) => { if (i[ERG_F[f].col] !== 'Sí') return '—'; const ev = ergEvalDe(i.ID_IDENT, f); return ev ? (ev.NIVEL_RIESGO || (ev.RESULTADO === 'A evaluar' ? 'a evaluar' : 's/d')) : 'Planilla 2 pendiente'; };
  const expoDe = (i, f) => { const m = new RegExp('(?:^|;)\\s*' + f + ':\\s*([^;]*)').exec(i.EXPOSICION || ''); return m ? m[1] : ''; };
  let h = '<h1>Protocolo de Ergonomía · Res. SRT 886/15</h1><h2>Planilla 1 · Identificación de factores de riesgo</h2>' + enc;
  for (let k = 0; k < Math.max(1, r.I.length); k += 3) { const T = r.I.slice(k, k + 3);
    h += '<table style="margin-top:8px"><tr><th>Factor de riesgo</th>' + T.map((i, n) => '<th>Tarea ' + (k + n + 1) + ': ' + esc(i.TAREA) + '</th>').join('') + '<th>Tiempo de exposición</th><th>Nivel de riesgo</th></tr>' +
      Object.keys(ERG_F).map(f => '<tr><td>' + f + ' · ' + esc(ERG_F[f].t) + '</td>' + T.map(i => '<td>' + (i[ERG_F[f].col] === 'Sí' ? 'Sí' : '—') + '</td>').join('') + '<td>' + T.map(i => expoDe(i, f)).filter(Boolean).map(esc).join(' / ') + '</td><td>' + T.map(i => nivelDe(i, f)).map(esc).join(' / ') + '</td></tr>').join('') + '</table>' +
      T.map(i => '<p class="pq"><b>' + esc(i.TAREA) + ':</b> procedimiento escrito ' + esc(ergSd(i.PROCEDIMIENTO_ESCRITO)) + ' · capacitación ' + esc(ergSd(i.CAPACITACION)) + ' · manifestación temprana ' + esc(ergSd(i.MANIFESTACION_TEMPRANA)) + (i.UBICACION_SINTOMA ? ' (' + esc(i.UBICACION_SINTOMA) + ')' : '') + ' · trabajadores: ' + esc(i.NOMBRES_TRABAJADORES || 'nómina aparte') + ' · fecha ' + fechaTxt(ergIso(i.FECHA)) + '</p>').join(''); }
  h += firmas;
  r.I.forEach(i => Object.keys(ERG_F).forEach(f => { const ev = i[ERG_F[f].col] === 'Sí' && ergEvalDe(i.ID_IDENT, f); if (!ev) return; let R = { p1: [], p2: [] }; try { R = JSON.parse(ev.RESPUESTAS); } catch (e) {}
    const g = ERG_F[f], q2 = ergPreg2(f, R.p1 || []);
    h += '<div class="salto"></div><h2>Planilla 2.' + f + ' · ' + esc(g.t) + '</h2>' + enc + '<p><b>Tarea:</b> ' + esc(i.TAREA) + ' · <b>Fecha:</b> ' + fechaTxt(ergIso(ev.FECHA)) + '</p>' +
      '<table><tr><th>Paso</th><th>N.º</th><th>Pregunta</th><th>Respuesta</th></tr>' + g.p1.map((q, n) => '<tr><td>1</td><td>' + (n + 1) + '</td><td>' + esc(q) + '</td><td>' + esc((R.p1 || [])[n] || '') + '</td></tr>').join('') +
      g.p2.map((q, n) => '<tr><td>2</td><td>' + (n + 1) + '</td><td>' + esc(q) + '</td><td>' + esc(q2.indexOf(n + 1) >= 0 ? (R.p2 || [])[n] || '' : 'no aplica') + '</td></tr>').join('') + '</table>' +
      '<p><b>Resultado:</b> ' + esc(ev.RESULTADO) + ' · ' + esc(ev.ETAPA || '') + (ev.OBSERVACIONES ? ' · ' + esc(ev.OBSERVACIONES) : '') + '</p>' +
      (ev.METODO ? '<h3>Evaluación de riesgos</h3><p><b>Método:</b> ' + esc(ev.METODO) + ' · <b>Nivel:</b> ' + esc(ev.NIVEL_RIESGO) + ' · <b>Evaluó:</b> ' + esc(ergSd(ev.EVALUADOR)) + ' · <b>Fecha:</b> ' + fechaTxt(ergIso(ev.FECHA_EVAL_RIESGO)) + '</p><p>' + esc(ev.METODO_DETALLE || '') + '</p>' : '') + firmas; }));
  if (r.M.length || r.I.some(i => ERG_GEN.some(g => i[g[0]]))) {
    h += '<div class="salto"></div><h2>Planilla 3 · Medidas correctivas y preventivas</h2>' + enc;
    r.I.forEach(i => { h += '<p><b>Tarea analizada:</b> ' + esc(i.TAREA) + '</p><table><tr><th>Medidas preventivas generales</th><th>Fecha</th><th>Sí / No</th><th>Observaciones</th></tr>' + ERG_GEN.map(g => '<tr><td>' + esc(g[1]) + '</td><td>' + fechaTxt(ergIso(i.GEN_FECHA)) + '</td><td>' + esc(ergSd(i[g[0]])) + '</td><td>' + esc(i.GEN_OBS || '') + '</td></tr>').join('') + '</table>'; });
    h += '<table style="margin-top:8px"><tr><th>N.º</th><th>Medidas correctivas y preventivas específicas</th><th>Tipo</th><th>Depende de</th><th>Observaciones</th></tr>' + r.M.map(m => '<tr><td>' + esc(m.ID_MEDIDA) + '</td><td>' + esc(m.DESCRIPCION) + '</td><td>' + esc(m.TIPO) + '</td><td>' + esc(ergSd(m.DEPENDE_DE)) + '</td><td>' + esc(m.OBSERVACIONES || '') + '</td></tr>').join('') + '</table>' + firmas;
    h += '<div class="salto"></div><h2>Planilla 4 · Matriz de seguimiento de medidas</h2>' + enc + '<table><tr><th>N.º de medida (M.C.P.)</th><th>Puesto</th><th>Fecha de evaluación</th><th>Nivel de riesgo</th><th>Implementación medida administrativa</th><th>Implementación medida de ingeniería</th><th>Fecha de cierre</th></tr>' +
      r.M.map(m => { const ev = ERG.evals.find(e => e.ID_EVAL === m.ID_EVAL) || {}, ing = /Ingeniería|Ayuda/.test(m.TIPO), im = fechaTxt(ergIso(m.FECHA_IMPLEMENTACION));
        return '<tr><td>' + esc(m.ID_MEDIDA) + '</td><td>' + esc(ergSd(p.FUNCION)) + '</td><td>' + fechaTxt(ergIso(ev.FECHA_EVAL_RIESGO || ev.FECHA)) + '</td><td>' + esc(ergSd(ev.NIVEL_RIESGO)) + '</td><td>' + (ing ? '' : im) + '</td><td>' + (ing ? im : '') + '</td><td>' + fechaTxt(ergIso(m.FECHA_CIERRE)) + '</td></tr>'; }).join('') + '</table>' + firmas; }
  w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Ergonomía · ' + esc(p.FUNCION) + '</title><style>body{font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:9.5pt;color:#4D4D4D;margin:22px}h1{color:#0D313F;font-size:15pt}h2{color:#0D313F;font-size:12pt;margin-top:14px}h3{color:#0D313F;font-size:10.5pt}table{border-collapse:collapse;width:100%;margin-top:4px}td,th{border:1px solid #bbb;padding:4px;text-align:left;vertical-align:top}th{background:#0D313F;color:#fff}.fir td{height:70px;vertical-align:bottom;text-align:center;font-size:8.5pt;width:33%}.pq{font-size:8.5pt;margin:4px 0}.salto{page-break-before:always}</style></head><body>' + h +
    '<p style="font-size:8pt;margin-top:14px">Protocolo de Ergonomía (Res. SRT 886/15) · Módulo 12 · versión 0 · Servicio de Higiene y Seguridad Laboral HZT / HMH. Datos faltantes: s/d.</p>' + ERG_PIE + '</body></html>');
  w.document.close();
}
