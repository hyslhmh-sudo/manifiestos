/**
 * SISTEMA HyS · PORTAL PÚBLICO (Fase 4 de la separación en módulos)
 * La página https://hyslhmh-sudo.github.io lee la planilla «PORTAL PÚBLICO HyS · contenidos» (SISTEMA HyS), que es pública
 * en modo lector. Todo se edita a mano en esa planilla, incluida la pestaña CAPACITACIONES: solo las jornadas con formulario
 * de inscripción abierto (la página las oculta sola cuando pasa la fecha de cierre o de inicio).
 * Este archivo solo deja la planilla compartida como «cualquier persona con el enlace · lector» y saca la tarea diaria
 * que tenía la primera versión (completaba CAPACITACIONES desde la agenda y el catálogo: ya no hace falta).
 */

const PUB = {
  ID: '1W8OlPk0lPxWjrZ9yGJzbx6iLQsm8NJ7z6xMOw_jE95c'                  // PORTAL PÚBLICO HyS · contenidos
};

// Ejecutar una vez: comparte la planilla como lector público y borra la tarea diaria de la versión anterior.
function instalarPortalPublico() {
  DriveApp.getFileById(PUB.ID).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  let borradas = 0;
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'publicoActualizar').forEach(t => { ScriptApp.deleteTrigger(t); borradas++; });
  Logger.log('Listo: planilla pública en modo lector. Tareas del portal público borradas: ' + borradas + '. Tareas activas: ' +
    ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).join(', ') + '.');
}

// Se conserva vacía por si quedara programada la tarea vieja: no escribe nada.
function publicoActualizar() { Logger.log('Portal público: las capacitaciones se cargan a mano en la planilla; no hay nada que actualizar.'); }