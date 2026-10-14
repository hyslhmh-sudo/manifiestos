/**
 * SISTEMA HyS · MENÚ «Sistema HyS» del libro general (funciona sin GitHub)
 * Todo lo que hace el portal se puede abrir desde acá. El «portal de respaldo» es el mismo portal servido por Google.
 */

const URL_GITHUB = { portal: 'https://hyslhmh-sudo.github.io/manifiestos/portal.html', app: 'https://hyslhmh-sudo.github.io/manifiestos/', diagnostico: 'https://hyslhmh-sudo.github.io/manifiestos/diagnostico.html' };
// Dirección de la implementación en uso (la misma que usan el portal y la aplicación). Si algún día cambia, se corrige acá.
const URL_SISTEMA = 'https://script.google.com/macros/s/AKfycbwEf6wxSyzMPh0vu2qoeMJnBwZHNu6IRJgCnAG1sykyuu5N4N4JEFUd_Ve_0Zlu5nME/exec';
function urlRespaldo_(p) { return URL_SISTEMA + '?p=' + p; }

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Sistema HyS')
    .addItem('Abrir el portal', 'menuPortal')
    .addItem('Abrir el portal de respaldo (sin GitHub)', 'menuPortalRespaldo')
    .addSubMenu(ui.createMenu('Otras páginas sin GitHub (respaldo)')
      .addItem('Mi establecimiento', 'menuAppRespaldo')
      .addItem('Página para referentes', 'menuReferentesRespaldo')
      .addItem('MIPyV · registro de visita', 'menuMipyvRespaldo'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Documentos')
      .addItem('Pedir número de documento', 'menuPedirNumero')
      .addItem('Abrir el registro de documentos', 'menuAbrirRegistro'))
    .addSubMenu(ui.createMenu('Diagnóstico y plan de acción')
      .addItem('Generar informe de diagnóstico', 'menuGenerarInforme')
      .addItem('Abrir los planes de acción', 'menuPlanes')
      .addItem('Abrir la página para referentes', 'menuReferentes'))
    .addSubMenu(ui.createMenu('Riesgos')
      .addItem('NTE · Nómina de trabajadores expuestos (en el portal)', 'menuNTE'))
    .addSubMenu(ui.createMenu('Siniestros')
      .addItem('Abrir el libro de siniestros', 'menuSiniestros')
      .addItem('Recalcular siniestros (estados y días de baja)', 'menuRecalcularSiniestros'))
    .addSubMenu(ui.createMenu('Bandeja de entrada')
      .addItem('Revisar la carpeta 07 BANDEJA DE ENTRADA', 'bandejaRevisarCarpeta')
      .addItem('Aplicar lo aprobado en la hoja BANDEJA', 'bandejaAplicarAprobados')
      .addItem('Abrir la bandeja en el portal', 'menuBandeja')
      .addItem('Generar modelos para completar (en el portal)', 'menuModelos'))
    .addSubMenu(ui.createMenu('Bases y libros')
      .addItem('Pasar a los libros los datos de la BASE COMÚN', 'actualizarLibrosDesdeBaseComun')
      .addItem('Agregar a los libros los sitios nuevos', 'sincronizarSitiosLibros')
      .addItem('Actualizar ahora el portal y el tablero de control', 'actualizarAhoraPortalYTablero')
      .addItem('Actualizar ahora el tablero del diagnóstico', 'actualizarAhoraDiagnostico')
      .addItem('Vincular comités y contactos con la base de personal', 'vincularComitesYContactos')
      .addItem('Traer CUIL, fechas y exposición desde el NTEAR 2026 (a la Bandeja)', 'sincronizarDesdeNTEAR'))
    .addSubMenu(ui.createMenu('Aplicación de manifiestos')
      .addItem('Abrir la aplicación', 'menuApp')
      .addItem('Abrir la aplicación de respaldo (sin GitHub)', 'menuAppRespaldo'))
    .addSeparator()
    .addItem('Ayuda: cómo se usa', 'menuAyuda')
    .addItem('Ayuda: dónde está cada cosa (administración)', 'menuAyudaAdmin')
    .addToUi();
}

function abrirUrl_(url, titulo) {
  const h = HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;font-size:14px">Abriendo… Si no se abre solo, <a href="' + url + '" target="_blank">tocá acá</a>.</div>' +
    '<script>window.open(' + JSON.stringify(url) + ', "_blank"); setTimeout(function(){ google.script.host.close(); }, 1500);</script>').setWidth(360).setHeight(90);
  SpreadsheetApp.getUi().showModalDialog(h, titulo || 'Abrir');
}
function menuPortal() { abrirUrl_(URL_GITHUB.portal, 'Portal HyS'); }
function menuPortalRespaldo() { abrirUrl_(urlRespaldo_('portal'), 'Portal de respaldo'); }
function menuAppRespaldo() { abrirUrl_(urlRespaldo_('app'), 'Mi establecimiento (respaldo)'); }
function menuReferentesRespaldo() { abrirUrl_(urlRespaldo_('diagnostico'), 'Página para referentes (respaldo)'); }
function menuMipyvRespaldo() { abrirUrl_(urlRespaldo_('mipyv'), 'MIPyV (respaldo)'); }
function menuPlanes() { abrirUrl_(urlRespaldo_('portal') + '#plan', 'Planes de acción'); }
function menuReferentes() { abrirUrl_(URL_GITHUB.diagnostico, 'Página para referentes'); }
function menuBandeja() { abrirUrl_(urlRespaldo_('portal') + '#bandeja', 'Bandeja de entrada'); }
function menuModelos() { abrirUrl_(urlRespaldo_('portal') + '#modelos', 'Modelos para completar'); }
function menuNTE() { abrirUrl_(urlRespaldo_('portal') + '#nte', 'NTE'); }
function menuApp() { abrirUrl_(URL_GITHUB.app, 'Aplicación de manifiestos'); }
function menuAppRespaldo() { abrirUrl_(urlRespaldo_('app'), 'Aplicación de respaldo'); }
function menuSiniestros() { const ss = typeof accLibro_ === 'function' ? accLibro_() : null; if (!ss) return SpreadsheetApp.getUi().alert('El libro de siniestros no está armado.'); abrirUrl_(ss.getUrl(), 'Libro de siniestros'); }
function menuRecalcularSiniestros() { SpreadsheetApp.getUi().alert(typeof accRecalcularTodo === 'function' ? accRecalcularTodo() : 'Falta Modulo4.gs.'); }

// ------------------------------------------------------------------ Ayuda (panel lateral). Se amplía en la etapa de Ayuda.
const AYUDA_USO = [
  ['Para empezar', 'Todo se maneja desde el <b>portal</b>. Si GitHub no funciona, usá <b>Sistema HyS › Abrir el portal de respaldo</b>: es el mismo portal, con otro enlace.'],
  ['Diagnóstico de un establecimiento', 'Portal › Diagnóstico de residuos › elegí el establecimiento. Primero la pestaña <b>Establecimiento</b> (los puntos marcados «Primero»), después cada lugar. Guardá de a partes. Al terminar, <b>Cerrar diagnóstico</b>.'],
  ['Informe', 'Con el diagnóstico cerrado: <b>Generar informe</b>. Se crea el documento, el PDF, el número HYSL y el plan de acción. Para corregir algo, <b>Generar nueva revisión</b> (no empieces un diagnóstico nuevo).'],
  ['Envío', '<b>Copiar correo</b> y pegarlo en tu correo con el PDF adjunto. El sistema nunca envía correos solo. Después, en Plan de acción, <b>Marcar como enviado</b> con la fecha.'],
  ['Respuesta de la Dirección', 'Plan de acción › el informe › cargá responsable y fecha prevista de cada recomendación › <b>Guardar cambios</b>. «Cumplida» necesita evidencia; «Descartada», el motivo.'],
  ['Modelos y bandeja', 'Documental › <b>Modelos para completar</b>: generás la planilla prellenada y la mandás. Cuando vuelve: Documental › <b>Bandeja de entrada</b> › subir el archivo (o dejarlo en Drive › 07 BANDEJA DE ENTRADA). El sistema muestra qué cambiaría y vos aprobás.'],
  ['NTE (nómina de expuestos)', 'Riesgos › <b>NTE</b> › elegí el establecimiento. 1) Revisá los datos que faltan (CUIL, ingreso, puesto). 2) Completá la matriz de exposición: códigos ESOP por servicio y función, o NO EXPUESTO (la sugerencia es orientativa). 3) Generar la NTE: planilla con el formato del Autoseguro, para firmar y enviar a dgautoseguro@gmail.com. Se renueva cada 12 meses y ante altas, bajas o cambios de puesto.'],
  ['Números de documento', 'Para notas o actas hechas fuera del sistema: Documental › Registro de documentos HYSL › <b>Pedir número</b>. Un número mal pedido no se borra: se anula con motivo.']
];
const AYUDA_ADMIN = [
  ['Datos de establecimientos y sitios', 'BASE COMÚN › ESTABLECIMIENTOS y SITIOS (con el código REFES). Después de cambiar algo: <b>Sistema HyS › Bases y libros › Pasar a los libros los datos de la BASE COMÚN</b>.'],
  ['Contactos y correos', 'BASE COMÚN › CONTACTOS.'],
  ['Trabajadores', 'BASE DE TRABAJADORES (una hoja por establecimiento). Es la única fuente de personas: direcciones, jefaturas (CARGO_CONDUCCION) y comités (COMITES) son datos de cada persona. Al cargar un responsable en la ficha del establecimiento se vincula solo; para lo ya cargado: Sistema HyS › Bases y libros › Vincular comités y contactos. CUIL, fechas y exposición del NTEAR 2026: Bases y libros › Traer desde el NTEAR (queda en la Bandeja para aprobar).'],
  ['Puntos del diagnóstico', 'DIAGNÓSTICO › ITEMS: texto, peso, crítico, referencia normativa, recomendación (ACCION), tipo, costo, CONDICION (cuándo se pregunta), PREVIO (va primero) y MEJORA_SI (qué respuestas generan mejora). Para no usar un punto: ACTIVO = No.'],
  ['Textos y datos de los informes', 'BASE COMÚN › CONFIG_INFORMES (firma, cargo, contacto, plazos, plantilla), NORMATIVA, TIPOS_ACCION, TEXTOS_SITUACION y REGLAS_REDACCION.'],
  ['Plantilla del informe', 'Documento «PLANTILLA · Informe HYSL (no borrar)» en la carpeta SISTEMA HyS. Solo se edita el pie.'],
  ['Registro de documentos y plan de acción', 'Libro general › REGISTRO_DOCUMENTOS · DIAGNÓSTICO › PLAN_ACCION.'],
  ['Modelos y bandeja', 'Drive › SISTEMA HyS › 06 MODELOS PARA COMPLETAR (lo generado, por establecimiento) y 07 BANDEJA DE ENTRADA (lo recibido; después pasa a Procesados o Con errores). Registro: libro general › BANDEJA.'],
  ['NTE y códigos ESOP', 'BASE COMÚN › ESOP (listado oficial, Res. SRT 81/2019 Anexo III; editable) · BASE DE TRABAJADORES › MATRIZ_EXPOSICION (códigos por servicio y función; si una persona tiene AGENTES_ESOP propio, manda lo de la persona) · NTE generadas: carpeta del establecimiento › NTE. Datos del encabezado opcionales en CONFIG_INFORMES: NTE_ORGANISMO, NTE_CUIT, NTE_CIIU, NTE_ACTIVIDAD, NTE_CORREO_APPC.'],
  ['Errores del sistema', 'Libro general › ERRORES_SISTEMA (qué falló y cuándo).'],
  ['Código', 'Extensiones › Apps Script (proyecto «Sistema HyS»). Después de cambiar código: Implementar › Administrar implementaciones › ✏️ › Nueva versión.']
];
function ayudaHtml_(titulo, items) {
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;font-size:13px;color:#1D2B31;line-height:1.45"><h3 style="color:#0D313F;margin:4px 0 10px">' + titulo + '</h3>' +
    items.map(i => '<div style="margin:0 0 12px"><b style="color:#0D313F">' + i[0] + '</b><div>' + i[1] + '</div></div>').join('') + '</div>').setTitle(titulo);
}
function menuAyuda() { SpreadsheetApp.getUi().showSidebar(ayudaHtml_('Ayuda · cómo se usa', AYUDA_USO)); }
function menuAyudaAdmin() { SpreadsheetApp.getUi().showSidebar(ayudaHtml_('Ayuda · dónde está cada cosa', AYUDA_ADMIN)); }