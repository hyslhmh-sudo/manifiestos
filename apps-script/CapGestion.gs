/**
 * SISTEMA HyS · 9 · CAPACITACIONES › GESTIÓN (etapa 3 de la unificación · 14.71 · 15/10/2026)
 * Pedido de Belén: «quiero pasar todo al portal de HyS». Las secciones del panel viejo que no existían en el portal,
 * ahora sobre el libro único «CAPACITACIONES · Sistema HyS» (CG.LIBRO; encabezados en la fila 5, datos desde la 6):
 *   · Personas y certificados: buscar por DNI, apellido, nombre o correo; ver datos, registros, certificados (PDF),
 *     obligatorias que le faltan e historial; corregir cualquier dato (queda en _HISTORIAL).
 *   · Contactos: resumen de jefaturas (correo, teléfono, último informe) y «Cargar lista de mails»: se pega una lista,
 *     el sistema la cruza por DNI o por nombre, muestra qué cambia y aplica solo lo que se confirma (gana el correo más nuevo).
 *   · Informe por jefatura: PDF + Google Doc con el personal, lo que le falta y los próximos dictados; opcionalmente
 *     deja un BORRADOR en Gmail (desde belenpellegrini.hys@gmail.com) que se revisa y se envía desde la bandeja.
 *   · Informe mensual o a pedido (INF-CAP): Google Doc + PDF con el formato de informe técnico de HySL, numerado en el
 *     registro de documentos (bloque CAP, tipo IT).
 *   · Bandeja de correos: los mensajes del libro (_MENSAJES): los automáticos de la agenda y los borradores. Un borrador
 *     se ve antes de enviarlo; sale solo cuando Belén toca «Enviar» (nunca solo).
 * Entrada: Portal.gs › acciones p_cg_… (clave de Higiene y Seguridad). Respaldo sin portal: el mismo libro, a mano.
 */
const CG = {
  LIBRO: '1Cg8884XTihxQYRc7CE1JPqngTquMpNr5uqQPot4uhGI',   // CAPACITACIONES · Sistema HyS (libro único)
  QUIEN: 'HyS (portal)',
  REMITENTE: 'belenpellegrini.hys@gmail.com',
  NOMBRE_REMITENTE: 'Higiene y Seguridad Laboral · HZT / HMH',
  MODELO: '1MDc2eRXqj37O-nmi5HrYHxXfyuo16E4tIMx8b6NTyOs',    // MODELO · Informe técnico HySL (encabezado HZT/HMH y pie con código y logo)
  LOGO_PIE: '1DnztPPclcsCNA23DDlAF-90Uchf6QdzN',            // logo de HySL («Hospitales más seguros para las personas»)
  AGENDA: 'https://hyslhmh-sudo.github.io/capacitaciones/agenda.html',
  CERTIFICADOS: 'https://hyslhmh-sudo.github.io/capacitaciones/certificados.html',
  GRUPO: 'Red Trelew',
  DIAS_PROXIMOS: 45,
  EDITABLES: ['APELLIDOS', 'NOMBRES', 'CORREO', 'TELEFONO', 'PUBLICO', 'CIUDAD', 'PROVINCIA', 'PAIS', 'PROFESION', 'INSTITUCION', 'ESTABLECIMIENTO', 'SERVICIO', 'FUNCION', 'VINCULO', 'EMPRESA', 'CARRERA', 'REVISAR'],
  PUEDEN_VACIOS: ['EMPRESA', 'CARRERA', 'REVISAR'],
  FIRMA: [['Belén Pellegrini', true], ['Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo', false], ['M.P. LCOHSECH0383', false], ['Servicio de Higiene y Seguridad Laboral', false]],
  CONTACTO: 'Celular: 2804389910 · Correo electrónico: belenpellegrini.hys@gmail.com'
};
let CG_SS_ = null;
const cgLibro_ = () => CG_SS_ || (CG_SS_ = SpreadsheetApp.openById(CG.LIBRO));
const cgTxt_ = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'dd/MM/yyyy') : String(v == null ? '' : v).trim();
const cgDni_ = v => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');
const cgNorm_ = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const cgVacio_ = v => { const s = cgTxt_(v); return !s || /^s\/?d$/i.test(s); };
const cgNum_ = v => { const n = Number(String(v == null ? '' : v).replace('%', '').replace(',', '.').trim()); return isNaN(n) ? 0 : n; };
const cgMil_ = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const cgPct_ = (a, b) => b ? Math.round(100 * a / b) : 0;
const cgMail_ = s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim());
const CG_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Fecha de una celda: Date o texto «d/m/aaaa [h:mm]» (los registros migrados vienen como texto)
function cgFecha_(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  const m = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\D+(\d{1,2}):(\d{2}))?/.exec(String(v || ''));
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), m[4] ? Number(m[4]) : 12, m[5] ? Number(m[5]) : 0) : null;
}
const cgDma_ = d => d ? Utilities.formatDate(d, TZ, 'dd/MM/yyyy') : '';

// Hoja del libro: { sh, H, filas: [{ fila, o }] } (encabezado en la fila 5)
function cgHoja_(nombre) {
  const sh = cgLibro_().getSheetByName(nombre); if (!sh) throw new Error('No encuentro la hoja ' + nombre + ' en el libro CAPACITACIONES.');
  const n = sh.getLastRow() - 5, H = sh.getRange(5, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(h => String(h).trim());
  const v = n > 0 ? sh.getRange(6, 1, n, H.length).getValues() : [];
  return { sh: sh, H: H, filas: v.map((r, i) => { const o = {}; H.forEach((h, j) => { if (h) o[h] = r[j]; }); return { fila: i + 6, o: o }; }).filter(x => String(x.o[H[0]] == null ? '' : x.o[H[0]]).trim() !== '') };
}
function cgSet_(T, fila, campo, valor) { const j = T.H.indexOf(campo); if (j >= 0) T.sh.getRange(fila, j + 1).setValue(valor); return j >= 0; }
function cgHistorial_(filas) {
  if (!filas.length) return; const sh = cgLibro_().getSheetByName('_HISTORIAL'); if (!sh) return;
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, filas.length, H.length).setValues(filas.map(f => H.map(h => f[h] == null ? '' : f[h])));
}
function cgCaps_() { const m = {}; cgHoja_('CATALOGO').filas.forEach(c => { m[cgTxt_(c.o.CODIGO)] = { nombre: cgTxt_(c.o.NOMBRE), estado: cgTxt_(c.o.ESTADO), encuentros: cgNum_(c.o.ENCUENTROS) || 1 }; }); return m; }
function cgCarpeta_(nombre) {
  let raiz; try { raiz = DriveApp.getFileById(CG.LIBRO).getParents().next(); } catch (e) { raiz = DriveApp.getRootFolder(); }
  return carpeta_(carpeta_(raiz, 'INFORMES'), nombre);
}

// ================================================================== PERSONAS Y CERTIFICADOS
function cgBuscar_(x) {
  const crudo = String(x.q || '').trim(), soloNum = /^[\d.\s]+$/.test(crudo), dig = cgDni_(crudo), q = cgNorm_(crudo);
  if (soloNum ? dig.length < 3 : q.length < 3) return { ok: true, lista: [], total: 0 };
  const P = cgHoja_('PERSONAS'), n = {};
  cgHoja_('REGISTROS').filas.forEach(r => { if (!/anulad/i.test(cgTxt_(r.o.ESTADO))) { const d = cgDni_(r.o.DNI); n[d] = (n[d] || 0) + 1; } });
  const palabras = q.split(' ');
  const hall = P.filas.filter(p => {
    if (soloNum) return cgDni_(p.o.DNI).indexOf(dig) === 0;
    const hay = cgNorm_([p.o.APELLIDOS, p.o.NOMBRES, p.o.CORREO, p.o.DNI].join(' '));
    return palabras.every(w => hay.indexOf(w) >= 0);
  });
  return { ok: true, total: hall.length, lista: hall.slice(0, 60).map(p => ({ dni: cgDni_(p.o.DNI), nombre: cgTxt_(p.o.APELLIDOS) + ', ' + cgTxt_(p.o.NOMBRES),
    est: cgTxt_(p.o.ESTABLECIMIENTO), servicio: cgTxt_(p.o.SERVICIO), funcion: cgTxt_(p.o.FUNCION), publico: cgTxt_(p.o.PUBLICO), correo: cgTxt_(p.o.CORREO),
    tel: cgTxt_(p.o.TELEFONO), revisar: /^s[ií]/i.test(cgTxt_(p.o.REVISAR)), registros: n[cgDni_(p.o.DNI)] || 0 })) };
}

function cgListas_(P) {
  const col = k => P.filas.map(p => cgTxt_(p.o[k])).filter(s => s && !/^s\/?d$/i.test(s)).filter((s, i, a) => a.indexOf(s) === i).sort((a, b) => a.localeCompare(b));
  return { publicos: col('PUBLICO'), establecimientos: col('ESTABLECIMIENTO'), instituciones: col('INSTITUCION'), vinculos: col('VINCULO'), empresas: col('EMPRESA'), funciones: col('FUNCION'), servicios: col('SERVICIO') };
}

function cgPersona_(x) {
  const dni = cgDni_(x.dni), P = cgHoja_('PERSONAS'), p = P.filas.find(z => cgDni_(z.o.DNI) === dni);
  if (!p) return { ok: false, mensaje: 'No encuentro a la persona con DNI ' + dni + ' en el libro.' };
  const caps = cgCaps_(), datos = {};
  P.H.forEach(h => { if (h) datos[h] = cgTxt_(p.o[h]); }); datos.DNI = dni;
  const registros = cgHoja_('REGISTROS').filas.filter(r => cgDni_(r.o.DNI) === dni).map(r => {
    const f = cgFecha_(r.o.FECHA), cod = cgTxt_(r.o.CODIGO);
    return { id: cgTxt_(r.o.ID_REGISTRO), fecha: f ? cgDma_(f) : cgTxt_(r.o.FECHA), orden: f ? f.getTime() : 0, codigo: cod, nombre: (caps[cod] || {}).nombre || cod,
      tipo: cgTxt_(r.o.TIPO), encuentro: cgTxt_(r.o.ENCUENTRO_N), nota: cgTxt_(r.o.NOTA), aprobado: cgTxt_(r.o.APROBADO), vence: cgTxt_(r.o.VENCE),
      origen: cgTxt_(r.o.ORIGEN), certificado: cgTxt_(r.o.ID_CERTIFICADO), estado: cgTxt_(r.o.ESTADO) };
  }).sort((a, b) => b.orden - a.orden);
  const certificados = cgHoja_('CERTIFICADOS').filas.filter(c => cgDni_(c.o.DNI) === dni).map(c => {
    const f = cgFecha_(c.o.FECHA), cod = cgTxt_(c.o.CODIGO);
    return { id: cgTxt_(c.o.ID_CERTIFICADO), fecha: f ? cgDma_(f) : cgTxt_(c.o.FECHA), orden: f ? f.getTime() : 0, codigo: cod, nombre: (caps[cod] || {}).nombre || cod,
      tipo: cgTxt_(c.o.TIPO), horas: cgTxt_(c.o.HORAS), link: cgTxt_(c.o.LINK_PDF), estado: cgTxt_(c.o.ESTADO), encuentro: cgTxt_(c.o.ENCUENTRO_N) };
  }).sort((a, b) => b.orden - a.orden);
  let cumplimiento = null;
  try { const c = cgHoja_('CUMPLIMIENTO_PERSONAS').filas.find(z => cgDni_(z.o.DNI) === dni);
    if (c) cumplimiento = { jefatura: cgTxt_(c.o.JEFATURA_O_SERVICIO), obligatorias: cgNum_(c.o.OBLIGATORIAS), cumplidas: cgNum_(c.o.CUMPLIDAS), pct: cgTxt_(c.o.PCT), falta: cgTxt_(c.o.LE_FALTA) }; } catch (e) {}
  let historial = [];
  try { historial = cgHoja_('_HISTORIAL').filas.filter(h => cgDni_(h.o.ID) === dni && /PERSONAS/i.test(cgTxt_(h.o.HOJA))).slice(-20).reverse()
    .map(h => ({ fecha: h.o.FECHA instanceof Date ? Utilities.formatDate(h.o.FECHA, TZ, 'dd/MM/yyyy HH:mm') : cgTxt_(h.o.FECHA), quien: cgTxt_(h.o.QUIEN), campo: cgTxt_(h.o.CAMPO), antes: cgTxt_(h.o.ANTES), despues: cgTxt_(h.o.DESPUES), motivo: cgTxt_(h.o.MOTIVO) })); } catch (e) {}
  return { ok: true, datos: datos, registros: registros, certificados: certificados, cumplimiento: cumplimiento, historial: historial,
    listas: cgListas_(P), editables: CG.EDITABLES.filter(k => P.H.indexOf(k) >= 0), libro: cgLibro_().getUrl() + '#gid=' + P.sh.getSheetId(), pagina: CG.CERTIFICADOS };
}

// Corregir datos de una persona (cualquier campo editable; cada cambio queda en _HISTORIAL)
function cgPersonaGuardar_(x) {
  return conLock_(() => {
    const dni = cgDni_(x.dni), P = cgHoja_('PERSONAS'), p = P.filas.find(z => cgDni_(z.o.DNI) === dni);
    if (!p) return { ok: false, mensaje: 'No encuentro a la persona con DNI ' + dni + '. Actualizá la pantalla.' };
    const d = x.datos || {}, ahora = new Date(), hist = [], motivo = String(x.motivo || '').trim() || 'Corrección desde el portal';
    for (let i = 0; i < CG.EDITABLES.length; i++) {
      const k = CG.EDITABLES[i], j = P.H.indexOf(k); if (j < 0 || d[k] == null) continue;
      let nuevo = String(d[k]).trim(); if (!nuevo && CG.PUEDEN_VACIOS.indexOf(k) < 0) nuevo = 's/d';
      if (k === 'CORREO' && nuevo !== 's/d') { nuevo = nuevo.toLowerCase(); if (!cgMail_(nuevo)) return { ok: false, mensaje: 'El correo «' + nuevo + '» no tiene un formato válido.' }; }
      if ((k === 'APELLIDOS' || k === 'NOMBRES') && nuevo === 's/d') return { ok: false, mensaje: 'Apellidos y nombres no pueden quedar vacíos.' };
      const antes = cgTxt_(p.o[k]);
      if (nuevo !== antes) { P.sh.getRange(p.fila, j + 1).setValue(nuevo); hist.push({ FECHA: ahora, QUIEN: CG.QUIEN, HOJA: 'PERSONAS', ID: dni, CAMPO: k, ANTES: antes, DESPUES: nuevo, MOTIVO: motivo }); }
    }
    if (hist.length) { cgSet_(P, p.fila, 'ULTIMA_ACTUALIZACION', Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy')); cgHistorial_(hist); }
    return { ok: true, cambios: hist.length };
  });
}

// ================================================================== CONTACTOS: jefaturas y carga de mails
function cgContactos_() {
  const J = cgHoja_('JEFATURAS'), P = cgHoja_('PERSONAS');
  let cump = {}; try { cgHoja_('CUMPLIMIENTO').filas.filter(r => cgTxt_(r.o.GRUPO) === CG.GRUPO).forEach(r => { cump[cgNorm_(r.o.JEFATURA_O_SERVICIO)] = { personal: cgNum_(r.o.PERSONAL), pct: cgTxt_(r.o.PCT) }; }); } catch (e) {}
  const jef = J.filas.map(j => { const k = cgNorm_(j.o.JEFATURA), c = cump[k] || {};
    const correo = [j.o.CORREO_SERVICIO, j.o.CORREO_RESPONSABLE].map(cgTxt_).find(s => !cgVacio_(s)) || '';
    return { jefatura: cgTxt_(j.o.JEFATURA), est: cgTxt_(j.o.ESTABLECIMIENTO), responsable: cgVacio_(j.o.RESPONSABLE) ? '' : cgTxt_(j.o.RESPONSABLE), correo: correo,
      tel: cgVacio_(j.o.TEL_INTERNO) ? '' : cgTxt_(j.o.TEL_INTERNO), personal: c.personal || 0, pct: c.pct || '', ultimo: cgTxt_(j.o.ULTIMO_INFORME), link: cgTxt_(j.o.LINK_INFORME), prioritaria: /^s/i.test(cgTxt_(j.o.PRIORITARIA)) };
  }).sort((a, b) => b.personal - a.personal || a.jefatura.localeCompare(b.jefatura));
  const sinCorreo = P.filas.filter(p => cgVacio_(p.o.CORREO)).length, sinTel = P.filas.filter(p => cgVacio_(p.o.TELEFONO)).length;
  return { ok: true, jefaturas: jef, personas: P.filas.length, sinCorreo: sinCorreo, sinTel: sinTel, jefSinCorreo: jef.filter(j => !j.correo).length };
}

// Lista de mails pegada: cada línea con un correo y un DNI (o apellido y nombre). Devuelve qué cambiaría; no escribe nada.
function cgMailsPrevia_(x) {
  const P = cgHoja_('PERSONAS'), porDni = {}, porMail = {};
  P.filas.forEach(p => { porDni[cgDni_(p.o.DNI)] = p; const m = cgTxt_(p.o.CORREO).toLowerCase(); if (!cgVacio_(m)) porMail[m] = p; });
  const lineas = String(x.texto || '').split(/\r?\n/).map(s => s.trim()).filter(String).slice(0, 1500);
  const out = lineas.map(l => {
    const mail = ((l.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '').toLowerCase();
    const dniTxt = (l.replace(/(\d)[.\s](?=\d{3}\b)/g, '$1').match(/\b\d{7,9}\b/) || [])[0];
    if (!mail) return { linea: l, estado: 'Sin correo en la línea' };
    let p = dniTxt ? porDni[cgDni_(dniTxt)] : null, via = p ? 'DNI' : '';
    if (!p) {
      const nombre = cgNorm_(l.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, ' ').replace(/[<>;,\t"()|:]/g, ' '));
      if (nombre.length >= 5) {
        const cand = P.filas.filter(q => { const a = cgNorm_(q.o.APELLIDOS), n1 = cgNorm_(q.o.NOMBRES).split(' ')[0]; return a.length > 1 && n1 && (' ' + nombre + ' ').indexOf(' ' + a + ' ') >= 0 && (' ' + nombre + ' ').indexOf(' ' + n1 + ' ') >= 0; });
        if (cand.length === 1) { p = cand[0]; via = 'nombre'; }
        else if (cand.length > 1) return { linea: l, correo: mail, estado: 'Hay ' + cand.length + ' personas con ese nombre: agregá el DNI en la línea' };
      }
    }
    if (!p) return { linea: l, correo: mail, estado: 'No encontré a la persona' + (dniTxt ? ' (DNI ' + dniTxt + ')' : '') };
    const actual = cgTxt_(p.o.CORREO), otro = porMail[mail];
    return { linea: l, dni: cgDni_(p.o.DNI), persona: cgTxt_(p.o.APELLIDOS) + ', ' + cgTxt_(p.o.NOMBRES), via: via, correo: mail, actual: cgVacio_(actual) ? '' : actual,
      estado: actual.toLowerCase() === mail ? 'Igual' : cgVacio_(actual) ? 'Nuevo' : 'Reemplaza', aviso: otro && cgDni_(otro.o.DNI) !== cgDni_(p.o.DNI) ? 'Ese correo ya lo tiene ' + cgTxt_(otro.o.APELLIDOS) + ', ' + cgTxt_(otro.o.NOMBRES) + ' (DNI ' + cgDni_(otro.o.DNI) + ')' : '' };
  });
  return { ok: true, lista: out };
}
function cgMailsAplicar_(x) {
  return conLock_(() => {
    const P = cgHoja_('PERSONAS'), j = P.H.indexOf('CORREO'), ahora = new Date(), hist = [], fecha = Utilities.formatDate(ahora, TZ, 'dd/MM/yyyy');
    (x.items || []).forEach(it => {
      const dni = cgDni_(it.dni), mail = String(it.correo || '').trim().toLowerCase(), p = P.filas.find(z => cgDni_(z.o.DNI) === dni);
      if (!p || !cgMail_(mail) || j < 0) return; const antes = cgTxt_(p.o.CORREO); if (antes.toLowerCase() === mail) return;
      P.sh.getRange(p.fila, j + 1).setValue(mail); cgSet_(P, p.fila, 'ULTIMA_ACTUALIZACION', fecha); p.o.CORREO = mail;
      hist.push({ FECHA: ahora, QUIEN: x.quien || CG.QUIEN, HOJA: 'PERSONAS', ID: dni, CAMPO: 'CORREO', ANTES: antes, DESPUES: mail, MOTIVO: String(x.motivo || '').trim() || 'Lista de mails cargada desde el portal' });
    });
    cgHistorial_(hist);
    return { ok: true, n: hist.length };
  });
}

// ================================================================== INFORME POR JEFATURA
function cgMeta_() {
  try { const t = String(cgLibro_().getSheetByName('CUMPLIMIENTO').getRange('A3').getDisplayValue()); const m = /meta (\d{2}\/\d{2}\/\d{4})/.exec(t), c = /calculado (\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)/.exec(t);
    return { meta: m ? m[1] : '31/01/' + (new Date().getFullYear() + 1), calculado: c ? c[1] : '', resumen: t }; } catch (e) { return { meta: '', calculado: '', resumen: '' }; }
}
function cgPersonalJefatura_(jef) {
  const k = cgNorm_(jef);
  return cgHoja_('CUMPLIMIENTO_PERSONAS').filas.filter(r => { const j = cgNorm_(r.o.JEFATURA_O_SERVICIO); return (j === k || j.indexOf(k + ' · ') === 0) && (!r.o.GRUPO || cgTxt_(r.o.GRUPO) === CG.GRUPO); })
    .map(r => ({ dni: cgDni_(r.o.DNI), nombre: cgTxt_(r.o.APELLIDOS) + ', ' + cgTxt_(r.o.NOMBRES), est: cgTxt_(r.o.ESTABLECIMIENTO), servicio: cgTxt_(r.o.SERVICIO), funcion: cgTxt_(r.o.FUNCION),
      obl: cgNum_(r.o.OBLIGATORIAS), cum: cgNum_(r.o.CUMPLIDAS), falta: cgTxt_(r.o.LE_FALTA) }))
    .sort((a, b) => (a.obl ? a.cum / a.obl : 1) - (b.obl ? b.cum / b.obl : 1) || a.nombre.localeCompare(b.nombre));
}
function cgProximos_(personal) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0); const hasta = new Date(hoy.getTime() + CG.DIAS_PROXIMOS * 864e5), caps = cgCaps_();
  let D = []; try { D = cgHoja_('DICTADOS').filas; } catch (e) { return []; }
  return D.map(d => ({ f: cgFecha_(d.o.FECHA), cod: cgTxt_(d.o.CODIGO), d: d.o })).filter(d => d.f && d.f >= hoy && d.f <= hasta && !/cancel|suspend/i.test(cgTxt_(d.d.ESTADO)))
    .sort((a, b) => a.f - b.f).map(d => {
      const nombre = (caps[d.cod] || {}).nombre || d.cod, nn = cgNorm_(nombre);
      const n = personal.filter(p => cgNorm_(p.falta).split(' · ').some(f => f && (nn.indexOf(f) >= 0 || f.indexOf(nn) >= 0))).length;
      return { fecha: cgDma_(d.f), hora: cgTxt_(d.d.HORA_INICIO), nombre: nombre, codigo: d.cod, encuentro: cgTxt_(d.d.ENCUENTRO_N), modalidad: cgTxt_(d.d.MODALIDAD), lugar: cgTxt_(d.d.LUGAR), personas: n };
    }).filter(d => d.personas > 0);
}
function cgEsc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function cgHtmlJefatura_(j, personal, proximos, meta, logo) {
  const AZ = '#0D313F', CE = '#5894A7', CL = '#E3EEF2', esc = cgEsc_;
  const obl = personal.reduce((a, r) => a + r.obl, 0), cum = personal.reduce((a, r) => a + r.cum, 0), aldia = personal.filter(r => r.obl && r.cum >= r.obl).length;
  const td = 'style="padding:6px 8px;border-bottom:1px solid ' + CL + ';font-size:12.5px;vertical-align:top"', th = 'style="padding:6px 8px;background:' + AZ + ';color:#fff;font-size:12px;text-align:left"';
  const dot = r => { const f = r.obl - r.cum, c = !r.obl || f <= 0 ? '#2E8B57' : f <= 2 ? '#E0A100' : '#C0392B'; return '<span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:' + c + ';margin-right:6px"></span>'; };
  const filas = personal.map(r => '<tr><td ' + td + '>' + dot(r) + esc(r.nombre) + '</td><td ' + td + '>' + esc(r.funcion) + '</td><td ' + td + ' align="center"><b>' + (r.obl ? cgPct_(r.cum, r.obl) + ' %' : '—') + '</b></td><td ' + td + '>' + esc(r.falta || '—') + '</td></tr>').join('');
  const dict = proximos.length
    ? '<table cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th ' + th + '>Fecha</th><th ' + th + '>Capacitación</th><th ' + th + '>Modalidad y lugar</th><th ' + th + '>Personas de su servicio a las que les falta</th></tr>' +
      proximos.map(d => '<tr><td ' + td + '>' + esc(d.fecha + (d.hora ? ' ' + d.hora : '')) + '</td><td ' + td + '>' + esc(d.nombre) + (d.encuentro && d.encuentro !== '1' ? ' (encuentro ' + esc(d.encuentro) + ')' : '') + '</td><td ' + td + '>' + esc([d.modalidad, d.lugar].filter(s => s && !/^s\/d$/i.test(s)).join(' · ')) + '</td><td ' + td + '>' + d.personas + '</td></tr>').join('') + '</table>'
    : '<p style="font-size:13px">No hay dictados programados en los próximos ' + CG.DIAS_PROXIMOS + ' días de las capacitaciones que le faltan a su personal. Desde la agenda puede reservar un horario para capacitar al servicio.</p>';
  const resp = j.responsable ? 'Estimado/a ' + esc(j.responsable) + ':' : 'Estimada jefatura:';
  return '<div style="font-family:Arial,sans-serif;color:' + AZ + ';max-width:760px">' +
    '<div style="border-left:6px solid ' + CE + ';padding:4px 12px;margin-bottom:16px"><div style="font-size:12px;color:' + CE + ';font-weight:bold">SERVICIO DE HIGIENE Y SEGURIDAD LABORAL · HZT / HMH</div>' +
    '<div style="font-size:20px;font-weight:bold">Capacitación del personal · ' + esc(j.jefatura) + '</div><div style="font-size:12px;color:#5B6B73">' + CG_MES[new Date().getMonth()].replace(/^./, c => c.toUpperCase()) + ' ' + new Date().getFullYear() + '</div></div>' +
    '<p style="font-size:14px">' + resp + '</p>' +
    '<p style="font-size:14px">Le compartimos la situación del personal de su servicio respecto de las capacitaciones en Higiene y Seguridad que le corresponden según los riesgos de sus tareas. El objetivo es ayudarle a organizar la asistencia.</p>' +
    '<table cellspacing="0" style="border-collapse:collapse;margin:8px 0 16px"><tr>' +
    '<td style="background:' + AZ + ';color:#fff;padding:10px 16px;font-size:13px">Personal<br><b style="font-size:20px">' + personal.length + '</b></td>' +
    '<td style="background:' + CE + ';color:#fff;padding:10px 16px;font-size:13px">Obligatorias al día<br><b style="font-size:20px">' + cgPct_(cum, obl) + ' %</b></td>' +
    '<td style="background:' + CL + ';padding:10px 16px;font-size:13px">Personas con todo al día<br><b style="font-size:20px">' + aldia + '</b></td></tr></table>' +
    (meta ? '<div style="background:' + AZ + ';color:#fff;padding:10px 14px;font-size:14px;margin:6px 0 14px">Las capacitaciones obligatorias deben completarse antes del <b>' + esc(meta) + '</b>.</div>' : '') +
    '<p style="font-size:14px">Para elegir un horario y capacitar al servicio en su lugar de trabajo puede usar la agenda compartida: <a href="' + CG.AGENDA + '" style="color:' + CE + ';font-weight:bold">' + CG.AGENDA + '</a>. Cada persona descarga sus certificados con su DNI en <a href="' + CG.CERTIFICADOS + '" style="color:' + CE + '">' + CG.CERTIFICADOS + '</a>.</p>' +
    '<h3 style="font-size:15px;margin:18px 0 6px">Personal y capacitaciones pendientes</h3>' +
    '<p style="font-size:12px;color:#5B6B73;margin:0 0 6px">Verde: al día · Amarillo: le faltan 1 o 2 · Rojo: le faltan 3 o más</p>' +
    '<table cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th ' + th + '>Persona</th><th ' + th + '>Función</th><th ' + th + '>Al día</th><th ' + th + '>Le falta</th></tr>' + filas + '</table>' +
    '<h3 style="font-size:15px;margin:18px 0 6px">Próximos dictados</h3>' + dict +
    '<p style="font-size:13px;margin-top:16px">Le proponemos acordar un cronograma de asistencia por turnos, para que el personal pueda capacitarse dentro del horario de trabajo sin afectar la atención, tal como lo prevé el artículo 10, inciso d), de la Ley 19.587. La capacitación en prevención de riesgos laborales es un derecho de las personas que trabajan y una obligación del establecimiento (Decreto 351/79, art. 208).</p>' +
    '<p style="font-size:13px">Si algún dato del personal no es correcto (servicio, función o agentes que ya no pertenecen al servicio), le pedimos que se comunique con este Servicio para actualizarlo.</p>' +
    '<p style="font-size:13px;margin-top:18px"><b>Belén Pellegrini</b><br>Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo<br>Servicio de Higiene y Seguridad Laboral · HZT / HMH<br>' + CG.REMITENTE + '</p>' +
    (logo ? '<p style="text-align:center;margin-top:18px"><img src="' + logo + '" alt="HySL · Hospitales más seguros para las personas" style="width:220px"></p>' : '') +
    '</div>';
}

// Genera el informe de una jefatura (PDF + Google Doc). x.borrador: además deja un borrador en Gmail para revisar y enviar desde la bandeja.
function cgInfJefatura_(x) {
  const J = cgHoja_('JEFATURAS'), jr = J.filas.find(z => cgNorm_(z.o.JEFATURA) === cgNorm_(x.jefatura));
  if (!jr) return { ok: false, mensaje: 'No encuentro la jefatura «' + x.jefatura + '».' };
  const j = { jefatura: cgTxt_(jr.o.JEFATURA), responsable: cgVacio_(jr.o.RESPONSABLE) ? '' : cgTxt_(jr.o.RESPONSABLE) };
  const personal = cgPersonalJefatura_(j.jefatura);
  if (!personal.length) return { ok: false, mensaje: 'No hay personal asignado a «' + j.jefatura + '» en el cumplimiento. Revisá los servicios que abarca (Jefaturas) y recalculá el cumplimiento.' };
  const meta = cgMeta_().meta, proximos = cgProximos_(personal);
  let logoBlob = null; try { logoBlob = DriveApp.getFileById(CG.LOGO_PIE).getBlob(); } catch (e) {}
  const logoData = logoBlob ? 'data:' + logoBlob.getContentType() + ';base64,' + Utilities.base64Encode(logoBlob.getBytes()) : '';
  const html = cgHtmlJefatura_(j, personal, proximos, meta, logoData);
  const sello = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), nombre = 'INF-CAP-JEF · ' + j.jefatura + ' · ' + sello, carpeta = cgCarpeta_('JEFATURAS');
  const pdf = carpeta.createFile(HtmlService.createHtmlOutput(html).getAs('application/pdf').setName(nombre + '.pdf'));
  let docUrl = '';
  try {
    const tmp = carpeta.createFile(Utilities.newBlob(html, 'text/html', nombre + '.html'));
    const res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + tmp.getId() + '/copy', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify({ name: nombre, mimeType: 'application/vnd.google-apps.document', parents: [carpeta.getId()] }) });
    if (res.getResponseCode() === 200) docUrl = 'https://docs.google.com/document/d/' + JSON.parse(res.getContentText()).id + '/edit';
    tmp.setTrashed(true);
  } catch (e) { Logger.log('Doc editable: ' + e); }
  cgSet_(J, jr.fila, 'ULTIMO_INFORME', Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy')); cgSet_(J, jr.fila, 'LINK_INFORME', pdf.getUrl());
  const out = { ok: true, pdf: pdf.getUrl(), doc: docUrl, carpeta: carpeta.getUrl(), personal: personal.length, proximos: proximos.length };
  if (x.borrador) {
    const para = [jr.o.CORREO_SERVICIO, jr.o.CORREO_RESPONSABLE].map(cgTxt_).filter(s => !cgVacio_(s) && cgMail_(s));
    if (!para.length) { out.aviso = 'La jefatura no tiene correo cargado: el informe quedó en Drive, pero no se preparó el borrador.'; return out; }
    const asunto = 'Capacitación del personal · ' + j.jefatura + (meta ? ' · fecha límite ' + meta : '');
    const htmlMail = cgHtmlJefatura_(j, personal, proximos, meta, logoBlob ? 'cid:logo' : '');
    out.borrador = cgBorrador_({ para: para[0], cc: para.slice(1).join(','), asunto: asunto, html: htmlMail, adjuntos: [pdf.getBlob()], logo: logoBlob, tipo: 'Informe por jefatura', ref: j.jefatura });
  }
  return out;
}

// ================================================================== BANDEJA DE CORREOS (_MENSAJES)
function cgMensajes_() {
  const T = cgHoja_('_MENSAJES');
  if (T.H.indexOf('ID_BORRADOR') < 0) { T.sh.getRange(5, T.H.length + 1).setValue('ID_BORRADOR').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F'); return cgHoja_('_MENSAJES'); }
  return T;
}
function cgRemitente_() { try { const al = GmailApp.getAliases().map(a => a.toLowerCase()); return al.indexOf(CG.REMITENTE.toLowerCase()) >= 0 || Session.getEffectiveUser().getEmail().toLowerCase() === CG.REMITENTE ? CG.REMITENTE : ''; } catch (e) { return ''; } }
// Deja un borrador en Gmail (no lo envía) y lo anota en _MENSAJES con ESTADO «Borrador»
function cgBorrador_(m) {
  const desde = cgRemitente_(), op = { htmlBody: m.html, name: CG.NOMBRE_REMITENTE };
  if (desde) op.from = desde; else op.replyTo = CG.REMITENTE;
  if (m.cc) op.cc = m.cc; if (m.adjuntos) op.attachments = m.adjuntos; if (m.logo) op.inlineImages = { logo: m.logo };
  const texto = String(m.html).replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|div|tr|h3)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n');
  const dr = GmailApp.createDraft(m.para, m.asunto, texto, op);
  const T = cgMensajes_(), id = 'MSG-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  const fila = { ID_MENSAJE: id, FECHA: new Date(), TIPO: m.tipo || 'Correo', CANAL: 'Correo', DESTINATARIOS: [m.para, m.cc].filter(String).join(', '), ID_DICTADO: '', CODIGO: m.ref || '', ASUNTO: m.asunto, ESTADO: 'Borrador', QUIEN: CG.QUIEN, ID_BORRADOR: dr.getId() };
  T.sh.getRange(Math.max(T.sh.getLastRow(), 5) + 1, 1, 1, T.H.length).setValues([T.H.map(h => fila[h] == null ? '' : fila[h])]);
  return { id: id, desde: desde || Session.getEffectiveUser().getEmail(), aviso: desde ? '' : 'Gmail no tiene configurado «Enviar como» ' + CG.REMITENTE + ': el borrador sale de la cuenta del sistema, con respuesta a ' + CG.REMITENTE + '.' };
}
function cgCorreos_() {
  const T = cgMensajes_(), est = {};
  const lista = T.filas.map(r => { const f = r.o.FECHA instanceof Date ? r.o.FECHA : cgFecha_(r.o.FECHA), e = cgTxt_(r.o.ESTADO) || 's/d'; est[e] = (est[e] || 0) + 1;
    return { fila: r.fila, id: cgTxt_(r.o.ID_MENSAJE), fecha: f ? Utilities.formatDate(f, TZ, 'dd/MM/yyyy HH:mm') : cgTxt_(r.o.FECHA), orden: f ? f.getTime() : 0, tipo: cgTxt_(r.o.TIPO), canal: cgTxt_(r.o.CANAL),
      para: cgTxt_(r.o.DESTINATARIOS), codigo: cgTxt_(r.o.CODIGO), asunto: cgTxt_(r.o.ASUNTO), estado: e, quien: cgTxt_(r.o.QUIEN), borrador: !!cgTxt_(r.o.ID_BORRADOR) }; })
    .sort((a, b) => b.orden - a.orden).slice(0, 200);
  return { ok: true, lista: lista, estados: est, remitente: cgRemitente_() || '', gmail: 'https://mail.google.com/mail/u/0/#drafts', libro: cgLibro_().getUrl() + '#gid=' + T.sh.getSheetId() };
}
function cgMsgBuscar_(id) { const T = cgMensajes_(), r = T.filas.find(z => cgTxt_(z.o.ID_MENSAJE) === String(id)); return { T: T, r: r }; }
function cgCorreoVer_(x) {
  const q = cgMsgBuscar_(x.id); if (!q.r) return { ok: false, mensaje: 'No encuentro el mensaje.' };
  const idB = cgTxt_(q.r.o.ID_BORRADOR); if (!idB) return { ok: false, mensaje: 'Este mensaje no tiene un borrador asociado (los automáticos de la agenda ya salieron).' };
  let dr; try { dr = GmailApp.getDraft(idB); } catch (e) { return { ok: false, mensaje: 'El borrador ya no está en Gmail (¿se envió o se borró desde Gmail?).' }; }
  const m = dr.getMessage();
  return { ok: true, para: m.getTo(), cc: m.getCc(), desde: m.getFrom(), asunto: m.getSubject(), html: m.getBody(), adjuntos: m.getAttachments().map(a => a.getName()) };
}
function cgCorreoEnviar_(x) {
  return conLock_(() => {
    const q = cgMsgBuscar_(x.id); if (!q.r) return { ok: false, mensaje: 'No encuentro el mensaje.' };
    if (cgTxt_(q.r.o.ESTADO) !== 'Borrador') return { ok: false, mensaje: 'Este mensaje ya está ' + cgTxt_(q.r.o.ESTADO).toLowerCase() + '.' };
    let dr; try { dr = GmailApp.getDraft(cgTxt_(q.r.o.ID_BORRADOR)); } catch (e) { return { ok: false, mensaje: 'El borrador ya no está en Gmail.' }; }
    dr.send(); cgSet_(q.T, q.r.fila, 'ESTADO', 'Enviado'); cgSet_(q.T, q.r.fila, 'QUIEN', CG.QUIEN + ' · enviado ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'));
    return { ok: true };
  });
}
function cgCorreoDescartar_(x) {
  return conLock_(() => {
    const q = cgMsgBuscar_(x.id); if (!q.r) return { ok: false, mensaje: 'No encuentro el mensaje.' };
    if (cgTxt_(q.r.o.ESTADO) !== 'Borrador') return { ok: false, mensaje: 'Solo se descartan borradores.' };
    try { GmailApp.getDraft(cgTxt_(q.r.o.ID_BORRADOR)).deleteDraft(); } catch (e) {}
    cgSet_(q.T, q.r.fila, 'ESTADO', 'Descartado'); return { ok: true };
  });
}

// ================================================================== INFORME MENSUAL O A PEDIDO (INF-CAP)
// x.mes = 'aaaa-mm' (informe mensual de ese mes) · x.mes vacío = a pedido (acumulado del ciclo hasta hoy) · x.prueba = sin número
function cgDatosInforme_(x) {
  const caps = cgCaps_(), pub = {}, hoy = new Date();
  cgHoja_('PERSONAS').filas.forEach(p => { pub[cgDni_(p.o.DNI)] = cgTxt_(p.o.PUBLICO) || 's/d'; });
  const regs = cgHoja_('REGISTROS').filas.filter(r => !/anulad/i.test(cgTxt_(r.o.ESTADO))).map(r => ({ dni: cgDni_(r.o.DNI), cod: cgTxt_(r.o.CODIGO), f: cgFecha_(r.o.FECHA),
    tipo: cgTxt_(r.o.TIPO), aprob: /^s/i.test(cgTxt_(r.o.APROBADO)) })).filter(r => r.f);
  const mes = x.mes ? new Date(Number(x.mes.slice(0, 4)), Number(x.mes.slice(5, 7)) - 1, 1) : null;
  const ref = mes || hoy, cicloIni = new Date(ref.getMonth() === 0 ? ref.getFullYear() - 1 : ref.getFullYear(), 1, 1);
  const finMes = m => new Date(m.getFullYear(), m.getMonth() + 1, 1);
  const resumen = (ini, fin) => {
    const f = regs.filter(r => r.f >= ini && r.f < fin), porCap = {}, porPub = {};
    f.forEach(r => { const k = r.cod; porCap[k] = porCap[k] || { fechas: {}, dni: {} }; porCap[k].fechas[Utilities.formatDate(r.f, TZ, 'dd/MM')] = 1; porCap[k].dni[r.dni] = 1; });
    const dnis = {}; f.forEach(r => dnis[r.dni] = 1); Object.keys(dnis).forEach(d => { const p = pub[d] || 's/d'; porPub[p] = (porPub[p] || 0) + 1; });
    return { registros: f.length, personas: Object.keys(dnis).length, actividades: Object.keys(f.reduce((a, r) => { a[r.cod + '|' + Utilities.formatDate(r.f, TZ, 'yyyy-MM-dd')] = 1; return a; }, {})).length,
      aprobaciones: f.filter(r => r.aprob).length,
      detalle: Object.keys(porCap).map(k => [(caps[k] || {}).nombre || k, Object.keys(porCap[k].fechas).sort((a, b) => a.slice(3) + a.slice(0, 2) < b.slice(3) + b.slice(0, 2) ? -1 : 1).join(', '), Object.keys(porCap[k].dni).length]).sort((a, b) => b[2] - a[2]),
      porPublico: Object.keys(porPub).map(k => [k, porPub[k]]).sort((a, b) => b[1] - a[1]) };
  };
  const out = { hoy: hoy, mes: mes, cicloIni: cicloIni };
  if (mes) { out.actual = resumen(mes, finMes(mes)); const ant = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); out.anterior = resumen(ant, mes); out.mesAnterior = ant; }
  out.ciclo = resumen(cicloIni, mes ? finMes(mes) : new Date(hoy.getTime() + 864e5));
  // Registros por mes del ciclo
  out.meses = []; for (let m = new Date(cicloIni); m < (mes ? finMes(mes) : finMes(hoy)); m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) { const r = resumen(m, finMes(m)); out.meses.push([CG_MES[m.getMonth()] + ' ' + m.getFullYear(), r.registros, r.personas]); }
  // Cumplimiento de la matriz (red Trelew: HZT y HMH)
  try {
    const CP = cgHoja_('CUMPLIMIENTO_PERSONAS').filas.filter(r => !r.o.GRUPO || cgTxt_(r.o.GRUPO) === CG.GRUPO);
    const porEst = {}; let obl = 0, cum = 0, aldia = 0, nada = 0;
    CP.forEach(r => { const o = cgNum_(r.o.OBLIGATORIAS), c = cgNum_(r.o.CUMPLIDAS), e = cgTxt_(r.o.ESTABLECIMIENTO) || 's/d'; obl += o; cum += c; if (o && c >= o) aldia++; if (o && !c) nada++;
      porEst[e] = porEst[e] || { p: 0, o: 0, c: 0 }; porEst[e].p++; porEst[e].o += o; porEst[e].c += c; });
    const C = cgHoja_('CUMPLIMIENTO').filas.filter(r => !r.o.GRUPO || cgTxt_(r.o.GRUPO) === CG.GRUPO).map(r => ({ n: cgTxt_(r.o.JEFATURA_O_SERVICIO), p: cgNum_(r.o.PERSONAL), o: cgNum_(r.o.OBLIGATORIAS), c: cgNum_(r.o.CUMPLIDAS),
      fuego: cgNum_(r.o.INCENDIO_COMPLETO), alguna: cgNum_(r.o.CON_ALGUNA_CAPACITACION), ext: cgNum_(r.o.EXTINTORES), seg: cgNum_(r.o.SEGURIDAD_HUMANA), eva: cgNum_(r.o.EVACUACION) }));
    const personal = C.reduce((a, s) => a + s.p, 0), alguna = C.reduce((a, s) => a + s.alguna, 0), fuego = C.reduce((a, s) => a + s.fuego, 0);
    out.matriz = { personas: CP.length, obl: obl, cum: cum, aldia: aldia, nada: nada, estab: Object.keys(porEst).sort().map(k => Object.assign({ n: k }, porEst[k])),
      servicios: C, personal: personal, alguna: alguna, fuego: fuego, sinFuego: C.filter(s => s.p && !s.ext && !s.seg && !s.eva), nunca: C.filter(s => s.p && !s.alguna) };
  } catch (e) { out.matriz = null; }
  out.meta = cgMeta_();
  return out;
}

function cgInformeOpciones_() {
  const hoy = new Date(), meses = [];
  for (let i = 0; i < 12; i++) { const m = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1); meses.push({ valor: Utilities.formatDate(m, TZ, 'yyyy-MM'), texto: CG_MES[m.getMonth()] + ' ' + m.getFullYear() + (i === 0 ? ' (en curso)' : '') }); }
  let previos = [];
  try { previos = docRegistro_({}).filas.filter(f => String(f.v[4]) === 'CAP').slice(0, 12).map(f => ({ codigo: f.v[0], fecha: f.v[8], asunto: f.v[9], doc: f.v[12], pdf: f.v[13], estado: f.v[14] })); } catch (e) {}
  return { ok: true, meses: meses, previos: previos };
}

function cgInforme_(x) {
  x = x || {};
  const D = cgDatosInforme_(x), mes = D.mes, M = cgMil_, MZ = D.matriz, hoyTxt = cgDma_(D.hoy);
  const periodoTxt = mes ? CG_MES[mes.getMonth()] + ' de ' + mes.getFullYear() : 'ciclo ' + D.cicloIni.getFullYear() + ' (desde el 1 de febrero) hasta el ' + hoyTxt;
  const tipo = mes ? 'mensual' : 'a pedido';
  const asunto = 'Capacitación del personal en Higiene y Seguridad · informe ' + tipo + ' · ' + periodoTxt;
  const n = x.prueba ? { ok: true, codigo: 'PRUEBA-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmm') } : docNumero_({ est: 'RED', bloque: 'CAP', tipo: 'IT', asunto: asunto, origen: 'Sistema', idOrigen: mes ? 'mes ' + Utilities.formatDate(mes, TZ, 'yyyy-MM') : 'a pedido ' + hoyTxt, pedidoPor: Session.getActiveUser().getEmail() });
  if (!n.ok) return n;
  const codigo = n.codigo, titulo = codigo + ' · Capacitación del personal · ' + (mes ? 'Mensual ' + periodoTxt : 'A pedido ' + hoyTxt), carpeta = cgCarpeta_(mes ? 'MENSUALES' : 'A PEDIDO');
  const notas = [], yaNota = {}, nota = (k, t) => { if (yaNota[k]) return '[[NOTA' + yaNota[k] + ']]'; notas.push(t); yaNota[k] = notas.length; return '[[NOTA' + notas.length + ']]'; };
  let doc;
  try {
    let deModelo = true;
    try { doc = DocumentApp.openById(DriveApp.getFileById(CG.MODELO).makeCopy(titulo, carpeta).getId()); doc.getBody().clear(); }
    catch (e) { deModelo = false; doc = DocumentApp.create(titulo); DriveApp.getFileById(doc.getId()).moveTo(carpeta); }
    const b = doc.getBody(); b.setPageWidth(595.3).setPageHeight(841.9).setMarginTop(56).setMarginBottom(56).setMarginLeft(62).setMarginRight(57);
    const AT = DocumentApp.Attribute, IZQ = DocumentApp.HorizontalAlignment.LEFT, COL = { AZUL: INF2.AZUL, ACENTO: INF2.PATA, TEXTO: INF2.TEXTO };
    const estilo = o => { const a = {}; a[AT.FONT_FAMILY] = INF2.FUENTE; a[AT.FONT_SIZE] = o.tam || 10.5; a[AT.FOREGROUND_COLOR] = o.color || COL.TEXTO; a[AT.BOLD] = !!o.neg; a[AT.ITALIC] = !!o.it; return a; };
    const P_ = (t, o) => { o = o || {}; const p = b.appendParagraph(t || ''); if (o.h) p.setHeading(o.h); p.setAttributes(estilo(o)); p.setAlignment(o.izq ? IZQ : DocumentApp.HorizontalAlignment.JUSTIFY); p.setLineSpacing(o.inter || 1.5); p.setSpacingAfter(o.desp == null ? 6 : o.desp); p.setSpacingBefore(o.antes || 0); return p; };
    const G = t => P_(t, { it: true, color: COL.ACENTO, tam: 9.5 });
    const H1 = t => P_(t, { h: DocumentApp.ParagraphHeading.HEADING1, tam: 14, neg: true, color: COL.AZUL, izq: true, desp: 8, antes: 6, inter: 1.15 });
    const H2 = t => P_(t, { h: DocumentApp.ParagraphHeading.HEADING2, tam: 11.5, neg: true, color: COL.AZUL, izq: true, desp: 4, antes: 6, inter: 1.15 });
    const TAB = (filas, anchos) => infTabla2_(b, filas, anchos);
    const COMP = nota('comp', 'Ley N.º 19.587 de Higiene y Seguridad en el Trabajo y Decreto N.º 351/79; Resolución SRT N.º 905/2015, Anexo I (funciones del Servicio de Higiene y Seguridad en el Trabajo).');
    const OBLIG = nota('oblig', 'Ley N.º 19.587, art. 9, inc. k) (obligación del empleador de promover la capacitación del personal en higiene y seguridad) y art. 10, inc. d) (obligación del trabajador de asistir a los cursos que se dicten durante las horas de labor).');
    const D351 = nota('d351', 'Decreto N.º 351/79, Capítulo 21: art. 208 (capacitar al personal según los riesgos generales y específicos de sus tareas), art. 209 (modalidades) y art. 210 (todos los sectores y niveles del establecimiento).');
    const APPC = nota('appc', 'Ley XXII N.º 50 de la Provincia del Chubut (Autoseguro Público Provincial).');
    const A = D.actual, B = D.anterior, C = D.ciclo, MESA = mes ? CG_MES[mes.getMonth()] : '', MESB = mes ? CG_MES[D.mesAnterior.getMonth()] : '';
    const cobertura = MZ && MZ.personal ? cgPct_(MZ.alguna, MZ.personal) : null, cumpl = MZ && MZ.obl ? cgPct_(MZ.cum, MZ.obl) : null;

    // ---------------- PORTADA
    const enc = b.getParagraphs()[0]; enc.setText('Hospital Zonal Trelew «Dr. Adolfo Margara» · Hospital María Humphreys'); enc.setAttributes(estilo({ tam: 11, neg: true, color: COL.AZUL })); enc.setAlignment(IZQ);
    P_('Servicio de Higiene y Seguridad Laboral', { color: COL.ACENTO, izq: true, desp: 70 });
    P_('INFORME TÉCNICO', { tam: 9, neg: true, color: COL.ACENTO, izq: true, desp: 4, inter: 1.1 });
    P_('Capacitación del personal en Higiene y Seguridad', { tam: 24, neg: true, color: COL.AZUL, izq: true, desp: 4, inter: 1.1 });
    P_('Informe ' + tipo + ' · ' + periodoTxt, { tam: 13, color: COL.ACENTO, izq: true, desp: 36, inter: 1.2 });
    TAB([['Informe N.º', codigo], ['Período', mes ? periodoTxt + ' · acumulado del ciclo al ' + cgDma_(new Date(Math.min(D.hoy, new Date(mes.getFullYear(), mes.getMonth() + 1, 0)))) : periodoTxt],
      ['Alcance', 'Personal del Hospital Zonal Trelew y del Hospital María Humphreys (base de trabajadores) y participantes de otros establecimientos e instituciones'],
      ['Destinatario', [x.destinatario, x.cargo].filter(Boolean).join(' · ') || 's/d (revisar)'], ['Fecha del informe', hoyTxt],
      ['Elaboró', 'Belén Pellegrini · Licenciada en Higiene, Seguridad y Medio Ambiente del Trabajo, M.P. LCOHSECH0383']], [150, 320]);
    G('Borrador generado por el sistema HyS (versión 0). Los textos en color e itálica son guía: revisarlos y borrarlos antes de firmar.' + (deModelo ? '' : ' Números de página: Insertar › Números de página.'));
    b.appendPageBreak();
    // ---------------- ÍNDICE
    H1('Índice'); G('Para tener el índice con números de página: Insertar › Índice, y borrar esta lista.');
    ['Resumen ejecutivo', '1. Presentación', '2. Método de trabajo', '3. Descripción de los hechos', '4. Análisis de los datos', '5. Conclusión', '6. Recomendaciones'].forEach(t => P_(t, { izq: true, desp: 0, inter: 1.3 }));
    b.appendPageBreak();

    // ---------------- RESUMEN EJECUTIVO
    H1('Resumen ejecutivo');
    P_((mes ? 'En ' + periodoTxt + ' se registraron ' + M(A.registros) + ' participaciones de ' + M(A.personas) + ' personas en ' + M(A.actividades) + ' actividades de capacitación (' + (A.registros >= B.registros ? 'más' : 'menos') + ' que en ' + MESB + ', con ' + M(B.registros) + ' participaciones). ' : '') +
      'En lo que va del ciclo se capacitó a ' + M(C.personas) + ' personas en ' + M(C.registros) + ' participaciones. ' +
      (cobertura != null ? 'Del personal de HZT y HMH (' + M(MZ.personal) + ' personas de la base de trabajadores), el ' + cobertura + ' % tiene al menos una capacitación registrada y se cumplió el ' + cumpl + ' % de las capacitaciones obligatorias que les corresponden según su puesto; ' + M(MZ.aldia) + ' personas tienen todas sus obligatorias al día.' : ''));
    P_(MZ ? 'La brecha principal está en las capacitaciones comunes a todo el personal: ' + MZ.sinFuego.length + ' servicios no tienen a nadie capacitado en protección contra incendios y ' + MZ.nunca.length + ' servicios no registran ninguna capacitación. ' +
      (D.meta.meta ? 'Para alcanzar la meta del ' + D.meta.meta + ' se requiere organizar la asistencia por servicio con cada jefatura, dentro del horario de trabajo.' : '') : 'El cálculo de cumplimiento de la matriz no está disponible: recalcularlo en el portal (9 · Capacitaciones › Cumplimiento) y volver a generar el informe.');
    G('Revisar: uno o dos párrafos en prosa; debe leerse en un minuto.');

    // ---------------- 1. PRESENTACIÓN
    H1('1. Presentación');
    P_('El presente informe se elabora desde el Servicio de Higiene y Seguridad Laboral, en el marco de sus funciones' + COMP + ', a fin de poner en conocimiento de ' + (x.destinatario || 'la superioridad') + ' la actividad de capacitación del ' + (mes ? 'mes de ' + periodoTxt : 'ciclo en curso') + ' y el grado de cumplimiento de la capacitación obligatoria del personal.');
    P_('La capacitación en prevención de riesgos laborales es una obligación del establecimiento y un derecho de las personas que trabajan' + OBLIG + '. Debe brindarse según los riesgos de cada tarea, a todos los sectores y niveles, y planificarse en forma anual' + D351 + '. El personal propio, además, es el público por el que corresponde informar ante el Autoseguro Público Provincial' + APPC + '.');

    // ---------------- 2. MÉTODO
    H1('2. Método de trabajo');
    P_('Los datos se tomaron del libro de capacitaciones del Sistema HyS: los registros de asistencia y de evaluaciones aprobadas (hoja REGISTROS), las personas (hoja PERSONAS) y el cálculo de cumplimiento por servicio y por persona' + (D.meta.calculado ? ', actualizado el ' + D.meta.calculado : '') + ', que cruza la base de trabajadores de HZT y HMH con la matriz de capacitación por función y servicio.');
    P_('Cada persona se cuenta una sola vez por DNI. El ciclo de capacitación va del 1 de febrero al 31 de enero. Se cuentan los registros válidos (no anulados); en los programas de varios encuentros, para el cumplimiento cuenta la aprobación del programa. La cobertura es la proporción de personas con al menos una capacitación; el cumplimiento de la matriz es la proporción de capacitaciones obligatorias realizadas sobre las que corresponden a cada persona.');
    P_('Limitaciones: el informe refleja lo registrado en el sistema. Una asistencia que no se registró no aparece, y los datos laborales (servicio y función) dependen de la base de trabajadores.');

    // ---------------- 3. HECHOS
    H1('3. Descripción de los hechos');
    let s3 = 0;
    if (mes) {
      H2('3.' + (++s3) + ' Actividad del mes');
      const v = (a, c) => (a - c > 0 ? '+' : '') + M(a - c);
      TAB([['Indicador', MESA.replace(/^./, c => c.toUpperCase()), MESB.replace(/^./, c => c.toUpperCase()), 'Variación'],
        ['Actividades dictadas (capacitación y fecha)', M(A.actividades), M(B.actividades), v(A.actividades, B.actividades)],
        ['Participaciones registradas', M(A.registros), M(B.registros), v(A.registros, B.registros)],
        ['Personas capacitadas', M(A.personas), M(B.personas), v(A.personas, B.personas)],
        ['Aprobaciones de evaluación', M(A.aprobaciones), M(B.aprobaciones), v(A.aprobaciones, B.aprobaciones)]], [220, 80, 80, 80]);
      H2('3.' + (++s3) + ' Capacitaciones del mes');
      if (A.detalle.length) TAB([['Capacitación', 'Fechas', 'Personas']].concat(A.detalle), [260, 140, 60]); else P_('No se registraron capacitaciones durante el mes.');
    }
    H2('3.' + (++s3) + ' Acumulado del ciclo');
    TAB([['Indicador', 'Valor'], ['Participaciones registradas', M(C.registros)], ['Personas capacitadas (únicas)', M(C.personas)], ['Actividades dictadas', M(C.actividades)], ['Aprobaciones de evaluación', M(C.aprobaciones)]], [320, 140]);
    if (C.porPublico.length) { P_('Personas capacitadas según el público:', { desp: 2 }); TAB([['Público', 'Personas']].concat(C.porPublico.map(r => [r[0], M(r[1])])), [320, 140]); }
    if (D.meses.length > 1) { H2('3.' + (++s3) + ' Participaciones por mes'); TAB([['Mes', 'Participaciones', 'Personas']].concat(D.meses.map(r => [r[0], M(r[1]), M(r[2])])), [220, 120, 120]); }

    // ---------------- 4. ANÁLISIS
    H1('4. Análisis de los datos');
    if (MZ) {
      H2('4.1 Cumplimiento de la matriz de capacitación');
      TAB([['Indicador', 'Valor'], ['Personas de HZT y HMH alcanzadas por la matriz', M(MZ.personas)], ['Capacitaciones obligatorias requeridas (suma)', M(MZ.obl)], ['Capacitaciones obligatorias cumplidas', M(MZ.cum)],
        ['Cumplimiento de la matriz', cumpl + ' %'], ['Personas con al menos una capacitación (cobertura)', M(MZ.alguna) + ' de ' + M(MZ.personal) + ' (' + cobertura + ' %)'],
        ['Personas con todas sus obligatorias', M(MZ.aldia)], ['Personas sin ninguna obligatoria cumplida', M(MZ.nada)]], [320, 140]);
      if (MZ.estab.length) TAB([['Establecimiento', 'Personal', 'Obligatorias', 'Cumplidas', 'Cumplimiento']].concat(MZ.estab.map(e => [e.n, M(e.p), M(e.o), M(e.c), cgPct_(e.c, e.o) + ' %'])), [150, 75, 80, 75, 80]);
      const bajos = MZ.servicios.filter(s => s.p >= 10 && s.o).sort((a, b) => a.c / a.o - b.c / b.o).slice(0, 12);
      if (bajos.length) { H2('4.2 Servicios con menor cumplimiento (10 personas o más)'); TAB([['Servicio', 'Personal', 'Obligatorias', 'Cumplidas', 'Cumplimiento']].concat(bajos.map(s => [s.n, M(s.p), M(s.o), M(s.c), cgPct_(s.c, s.o) + ' %'])), [170, 70, 75, 70, 75]); }
      H2('4.3 Protección contra incendios');
      P_('La secuencia de incendio (uso de extintores, seguridad humana y evacuación) es común a todo el personal. ' + M(MZ.fuego) + ' de ' + M(MZ.personal) + ' personas (' + cgPct_(MZ.fuego, MZ.personal) + ' %) la tienen completa, y ' + MZ.sinFuego.length + ' servicios no tienen a nadie capacitado en ninguna de las tres.' +
        (MZ.sinFuego.length ? ' Los de mayor dotación son: ' + MZ.sinFuego.slice().sort((a, b) => b.p - a.p).slice(0, 6).map(s => s.n + ' (' + s.p + ')').join(', ') + '.' : ''));
      P_('El cumplimiento de la matriz es el indicador que responde de manera directa a la exigencia de capacitar según los riesgos de cada tarea' + D351 + '. Con el ' + cumpl + ' % actual, las capacitaciones comunes a todo el personal (inducción, protección contra incendios, bioseguridad y residuos) siguen siendo la prioridad.');
    } else P_('El cálculo de cumplimiento no está disponible al momento del informe.');

    // ---------------- 5. CONCLUSIÓN
    H1('5. Conclusión');
    P_(MZ ? 'La obligación de capacitar a todo el personal según los riesgos de sus tareas se cumple en forma parcial: el ' + cumpl + ' % de las capacitaciones obligatorias está realizado y ' + M(MZ.personal - MZ.alguna) + ' personas de la base no registran ninguna capacitación. ' +
      (mes ? 'La actividad de ' + MESA + ' (' + M(A.personas) + ' personas) ' + (A.personas >= B.personas ? 'sostiene o mejora' : 'es menor que') + ' la del mes anterior.' : '') : 'No se pudo calcular el cumplimiento de la matriz para este informe.');
    G('Completar o ajustar: qué significa este resultado para los servicios y qué cambió respecto del informe anterior.');

    // ---------------- 6. RECOMENDACIONES
    H1('6. Recomendaciones');
    const rec = [];
    if (MZ && MZ.nunca.length) rec.push('Acordar con las jefaturas de los ' + MZ.nunca.length + ' servicios sin ninguna capacitación un turno de capacitación en el servicio, empezando por los de mayor dotación.');
    if (MZ && MZ.sinFuego.length) rec.push('Priorizar la secuencia de protección contra incendios (extintores, seguridad humana y evacuación) en los servicios sin personal capacitado.');
    rec.push('Enviar a cada jefatura el informe de su personal, con lo que le falta a cada persona y los próximos dictados, y relevar los horarios posibles dentro de la jornada laboral.');
    rec.push('Mantener actualizada la base de trabajadores (servicio y función), ya que de ella depende el cálculo de las capacitaciones obligatorias de cada persona.');
    rec.forEach((t, i) => P_((i + 1) + '. ' + t));
    G('Revisar las recomendaciones: agregar responsables y plazos según el destinatario.');

    // ---------------- CIERRE Y FIRMA
    P_('Quedo a disposición por cualquier consulta, requerimiento o ampliación de lo informado.', { antes: 14 });
    P_(CG.CONTACTO, { izq: true, desp: 30 });
    CG.FIRMA.forEach(f => P_(f[0], { neg: f[1], color: f[1] ? COL.AZUL : COL.TEXTO, tam: f[1] ? 10.5 : 9.5, izq: true, desp: 0, inter: 1.2 }));

    // ---------------- PIE
    if (deModelo) { try { doc.getFooter().replaceText('\\{\\{CODIGO\\}\\}', codigo); } catch (e) {} }
    else try { const pie = doc.addFooter(), p0 = pie.getParagraphs()[0]; p0.setText(codigo); p0.setAttributes(estilo({ tam: 7.5, color: COL.ACENTO })); p0.setAlignment(IZQ);
      const pl = pie.appendParagraph(''); pl.setAlignment(DocumentApp.HorizontalAlignment.CENTER); const img = pl.appendInlineImage(DriveApp.getFileById(CG.LOGO_PIE).getBlob()), w = 260; img.setHeight(Math.round(img.getHeight() * w / img.getWidth())); img.setWidth(w); } catch (e) {}
    doc.saveAndClose();
  } catch (err) { try { if (doc) DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} throw err; }
  const notasOk = infNotas_(doc.getId(), notas);
  const pdf = carpeta.createFile(DriveApp.getFileById(doc.getId()).getAs('application/pdf')).setName(titulo + '.pdf');
  if (!x.prueba) docActualizar_({ codigo: codigo, documento: doc.getUrl(), pdf: pdf.getUrl(), estado: 'Emitido' });
  return { ok: true, codigo: codigo, doc: doc.getUrl(), pdf: pdf.getUrl(), carpeta: carpeta.getUrl(), notasAlPie: notasOk };
}

// ================================================================== ENTRADA DESDE EL PORTAL
// ================================================================== PARTICIPANTES DE UNA CAPACITACIÓN (15/10/2026)
// Todos los que la hicieron (link permanente, dictados o historial migrado), una fila por persona: último registro,
// cuántos registros y encuentros, mejor nota, si aprobó, vigencia y certificados. Solo lee.
function cgParticipantes_(x) {
  const cod = cgTxt_(x.codigo); if (!cod) return { ok: false, mensaje: 'Falta el código de la capacitación.' };
  const caps = cgCaps_(), cap = caps[cod] || {}, por = {};
  cgHoja_('REGISTROS').filas.forEach(r => {
    if (cgTxt_(r.o.CODIGO) !== cod || /anulad/i.test(cgTxt_(r.o.ESTADO))) return;
    const dni = cgDni_(r.o.DNI); if (!dni) return;
    const f = cgFecha_(r.o.FECHA), v = cgFecha_(r.o.VENCE), nota = cgNum_(r.o.NOTA);
    const p = por[dni] || (por[dni] = { dni: dni, registros: 0, encuentros: {}, ultima: null, primera: null, nota: '', aprobo: false, vence: null, tipos: {}, origenes: {}, certs: [], anios: {} });
    p.registros++; if (cgTxt_(r.o.ENCUENTRO_N)) p.encuentros[cgTxt_(r.o.ENCUENTRO_N)] = 1;
    if (f) { if (!p.ultima || f > p.ultima) p.ultima = f; if (!p.primera || f < p.primera) p.primera = f; p.anios[f.getFullYear()] = 1; }
    if (cgTxt_(r.o.NOTA) && (p.nota === '' || nota > p.nota)) p.nota = nota;
    if (/^s[ií]/i.test(cgTxt_(r.o.APROBADO))) p.aprobo = true;
    if (v && (!p.vence || v > p.vence)) p.vence = v;
    if (cgTxt_(r.o.TIPO)) p.tipos[cgTxt_(r.o.TIPO)] = 1;
    if (cgTxt_(r.o.ORIGEN)) p.origenes[cgTxt_(r.o.ORIGEN)] = 1;
    if (!cgVacio_(r.o.ID_CERTIFICADO)) p.certs.push(cgTxt_(r.o.ID_CERTIFICADO));
  });
  const links = {};
  cgHoja_('CERTIFICADOS').filas.forEach(c => { if (cgTxt_(c.o.CODIGO) === cod && por[cgDni_(c.o.DNI)]) links[cgTxt_(c.o.ID_CERTIFICADO)] = { link: cgTxt_(c.o.LINK_PDF), estado: cgTxt_(c.o.ESTADO) }; });
  const P = {}; cgHoja_('PERSONAS').filas.forEach(z => { const d = cgDni_(z.o.DNI); if (por[d]) P[d] = z.o; });
  const hoy = new Date(), lista = Object.keys(por).map(d => {
    const p = por[d], o = P[d] || {};
    return { dni: d, nombre: o.APELLIDOS ? cgTxt_(o.APELLIDOS) + ', ' + cgTxt_(o.NOMBRES) : 's/d (no está en PERSONAS)', correo: cgVacio_(o.CORREO) ? '' : cgTxt_(o.CORREO),
      publico: cgTxt_(o.PUBLICO) || 's/d', est: cgTxt_(o.ESTABLECIMIENTO) || 's/d', servicio: cgTxt_(o.SERVICIO) || 's/d', funcion: cgTxt_(o.FUNCION) || 's/d',
      institucion: cgTxt_(o.INSTITUCION), fecha: cgDma_(p.ultima), primera: cgDma_(p.primera), orden: p.ultima ? p.ultima.getTime() : 0, anios: Object.keys(p.anios),
      registros: p.registros, encuentros: Object.keys(p.encuentros).length, nota: p.nota === '' ? '' : String(p.nota), aprobo: p.aprobo, tipo: Object.keys(p.tipos).join(' · '),
      origen: Object.keys(p.origenes).join(' · '), vence: cgDma_(p.vence), vigente: !p.vence || p.vence >= hoy,
      certificados: p.certs.filter((c, i, a) => a.indexOf(c) === i).map(c => ({ id: c, link: (links[c] || {}).link || '', estado: (links[c] || {}).estado || '', ver: CG.CERTIFICADOS + '?v=' + encodeURIComponent(c) })) };
  }).sort((a, b) => b.orden - a.orden);
  return { ok: true, codigo: cod, nombre: cap.nombre || cod, encuentros: cap.encuentros || 1, total: lista.length, lista: lista };
}

function cgPortal_(accion, x) {
  x = x || {};
  switch (accion) {
    case 'p_cg_buscar': return cgBuscar_(x);
    case 'p_cg_participantes': return cgParticipantes_(x);
    case 'p_cg_persona': return cgPersona_(x);
    case 'p_cg_persona_guardar': return cgPersonaGuardar_(x);
    case 'p_cg_contactos': return cgContactos_();
    case 'p_cg_mails_previa': return cgMailsPrevia_(x);
    case 'p_cg_mails_aplicar': return cgMailsAplicar_(x);
    case 'p_cg_inf_jefatura': return cgInfJefatura_(x);
    case 'p_cg_informe_op': return cgInformeOpciones_();
    case 'p_cg_informe': return cgInforme_(x);
    case 'p_cg_correos': return cgCorreos_();
    case 'p_cg_correo_ver': return cgCorreoVer_(x);
    case 'p_cg_correo_enviar': return cgCorreoEnviar_(x);
    case 'p_cg_correo_descartar': return cgCorreoDescartar_(x);
  }
  return { ok: false, mensaje: 'Acción desconocida: ' + accion };
}

// Pruebas desde el editor (solo leen)
function probarCapGestion() {
  Logger.log(JSON.stringify(cgBuscar_({ q: 'pellegrini' })).slice(0, 500));
  const c = cgContactos_(); Logger.log('Jefaturas: ' + c.jefaturas.length + ' · personas sin correo: ' + c.sinCorreo);
  const d = cgDatosInforme_({ mes: Utilities.formatDate(new Date(), TZ, 'yyyy-MM') }); Logger.log('Mes: ' + d.actual.registros + ' registros · ciclo: ' + d.ciclo.personas + ' personas · matriz: ' + (d.matriz ? d.matriz.cum + '/' + d.matriz.obl : 's/d'));
  Logger.log('Remitente: ' + (cgRemitente_() || 'sin alias'));
}
function probarInformeCapacitacion() { Logger.log(JSON.stringify(cgInforme_({ mes: Utilities.formatDate(new Date(), TZ, 'yyyy-MM'), prueba: true }))); }
