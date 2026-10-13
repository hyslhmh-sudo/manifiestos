// ------------------------------------------------------------------ Portal › 2 · Documentos › Notas (enviadas y recibidas)
// Archivo nuevo (12/10/2026). Solo LEE el libro «DOCUMENTOS · Sistema HyS»: hojas REGISTRO (notas que manda HySL) y RECIBIDAS.
// No escribe nada: crear notas, registrar envío y respuesta y cargar notas recibidas se sigue haciendo en la aplicación de notas
// o desde el menú «HySL Documentos» de la planilla. Si falta GitHub, todo sigue disponible en esas dos hojas.
// Entra por Portal.gs › portalAccion_ (solo con la clave MAESTRA): acción «p_notas».

const NTP_LIBRO_ID = '1OZmvW2-FypFH78tUMrxT_xSGGBtpCckGPAw8MkHyRuw';   // DOCUMENTOS · Sistema HyS
const NTP_FILA_ENCABEZADO = 3;                                        // en REGISTRO y RECIBIDAS los títulos de columna están en la fila 3

function notasPortal_(accion, x) {
  if (accion !== 'p_notas') return { ok: false, mensaje: 'Acción de notas desconocida: ' + accion };
  x = x || {};
  let libro;
  try { libro = SpreadsheetApp.openById(NTP_LIBRO_ID); }
  catch (e) { return { ok: false, mensaje: 'No pude abrir el libro DOCUMENTOS · Sistema HyS. Revisá que exista y que la cuenta tenga acceso.' }; }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const anio = Number(x.anio) || 0;   // 0 = todos los años

  // ---- Enviadas (REGISTRO): solo las filas que son notas; los informes tienen su propio registro en el portal
  const reg = ntpLeer_(libro, 'REGISTRO');
  const enviadas = reg.filas.filter(o => /nota/i.test(o['Tipo'] || '')).map(o => {
    const envio = ntpFecha_(o['Fecha de envío']), vence = ntpFecha_(o['Vence respuesta']), resp = ntpFecha_(o['Fecha de respuesta']);
    const estado = o['Estado'] || (envio ? 'Enviada' : 'Borrador');
    let alerta = '';
    if (/anulad/i.test(estado)) alerta = '';
    else if (!envio) alerta = 'sin_enviar';
    else if (resp || o['Respuesta / resultado']) alerta = 'respondida';
    else if (vence && vence < hoy) alerta = 'vencida';
    else if (vence && (vence - hoy) / 864e5 <= 7) alerta = 'por_vencer';
    else alerta = 'esperando';
    return { fila: o._fila, fecha: o['Fecha'], tipo: o['Tipo'], sitio: o['Sitio'], problematica: o['Problemática'], numero: o['N.º'],
      codigo: o['Código'] || o['Código del sistema'], asunto: o['Asunto'], destinatario: o['Destinatario'], medio: o['Medio de envío'],
      envio: o['Fecha de envío'], vence: o['Vence respuesta'], respuestaFecha: o['Fecha de respuesta'], respuesta: o['Respuesta / resultado'],
      estado: estado, alerta: alerta, modulo: o['Módulo vinculado'], archivo: o['Enlace al archivo'], adjuntos: o['Adjuntos (fotos, respuestas)'],
      observaciones: o['Observaciones'], _anio: ntpAnio_(o['Fecha']) };
  }).filter(n => !anio || n._anio === anio);

  // ---- Recibidas (RECIBIDAS)
  const rec = ntpLeer_(libro, 'RECIBIDAS');
  const recibidas = rec.filas.map(o => {
    const requiere = /^s[ií]/i.test(o['¿Requiere respuesta?'] || ''), vence = ntpFecha_(o['Vence']), estado = o['Estado'] || (requiere ? 'Pendiente' : 'Sin respuesta requerida');
    let alerta = '';
    if (!requiere || /respond|cerrad|archiv|anulad/i.test(estado)) alerta = requiere ? 'respondida' : '';
    else if (vence && vence < hoy) alerta = 'vencida';
    else if (vence && (vence - hoy) / 864e5 <= 7) alerta = 'por_vencer';
    else alerta = 'pendiente';
    return { fila: o._fila, fecha: o['Fecha de recepción'], codigo: o['Código'], remitente: o['Remitente (servicio)'], ref: o['N.º / ref. del remitente'],
      firmante: o['Firmante'], sitio: o['Sitio'], problematica: o['Problemática'], asunto: o['Asunto'], requiere: requiere, vence: o['Vence'],
      estado: estado, alerta: alerta, respondeA: o['Responde a (nota nuestra)'], archivo: o['Archivo'], cargo: o['Cargó'], observaciones: o['Observaciones'],
      _anio: ntpAnio_(o['Fecha de recepción']) };
  }).filter(n => !anio || n._anio === anio);

  const cuenta = (L, a) => L.filter(n => n.alerta === a).length;
  const sitios = Array.from(new Set(enviadas.map(n => n.sitio).concat(recibidas.map(n => n.sitio)).filter(Boolean))).sort();
  const anios = Array.from(new Set(reg.filas.map(o => ntpAnio_(o['Fecha'])).concat(rec.filas.map(o => ntpAnio_(o['Fecha de recepción']))).filter(Boolean))).sort((a, b) => b - a);
  return {
    ok: true, enviadas: enviadas.reverse(), recibidas: recibidas.reverse(), sitios: sitios, anios: anios,
    resumen: { enviadas: enviadas.length, sinEnviar: cuenta(enviadas, 'sin_enviar'), esperando: cuenta(enviadas, 'esperando') + cuenta(enviadas, 'por_vencer'),
      vencidasEnv: cuenta(enviadas, 'vencida'), recibidas: recibidas.length, pendientes: cuenta(recibidas, 'pendiente') + cuenta(recibidas, 'por_vencer'),
      vencidasRec: cuenta(recibidas, 'vencida') },
    avisos: [reg.aviso, rec.aviso].filter(Boolean),
    hojas: { registro: reg.url, recibidas: rec.url, libro: libro.getUrl() }
  };
}

// Lee una hoja con los títulos en la fila 3 y devuelve una lista de objetos { título: valor mostrado, _fila }
function ntpLeer_(libro, nombre) {
  const sh = libro.getSheetByName(nombre);
  if (!sh) return { filas: [], url: libro.getUrl(), aviso: 'No está la hoja ' + nombre + ' en DOCUMENTOS · Sistema HyS.' };
  const url = libro.getUrl() + '#gid=' + sh.getSheetId(), ult = sh.getLastRow(), nCol = sh.getLastColumn();
  if (ult <= NTP_FILA_ENCABEZADO || nCol < 1) return { filas: [], url: url, aviso: '' };
  const H = sh.getRange(NTP_FILA_ENCABEZADO, 1, 1, nCol).getDisplayValues()[0].map(h => String(h).replace(/\s+/g, ' ').trim());
  const V = sh.getRange(NTP_FILA_ENCABEZADO + 1, 1, ult - NTP_FILA_ENCABEZADO, nCol).getDisplayValues();
  const filas = V.map((r, i) => { const o = { _fila: NTP_FILA_ENCABEZADO + 1 + i }; H.forEach((h, j) => { if (h) o[h] = String(r[j]).trim(); }); return o; })
    .filter(o => H.some(h => h && o[h]));   // salta filas vacías
  return { filas: filas, url: url, aviso: '' };
}

// «dd/mm/aaaa» (como se ve en la planilla) → Date; vacío o «s/d» → null
function ntpFecha_(t) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(t || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); d.setHours(0, 0, 0, 0); return d;
}
function ntpAnio_(t) { const d = ntpFecha_(t); return d ? d.getFullYear() : 0; }
