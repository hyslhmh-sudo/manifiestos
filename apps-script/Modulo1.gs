/**
 * SISTEMA HyS · MÓDULO 1 · RESIDUOS (Fase 2 de la separación en módulos)
 * Arma la carpeta propia del módulo y MUEVE (no copia) lo de residuos de cada establecimiento. Al mover, los archivos y
 * carpetas conservan su enlace y su ID, así que nada se pierde ni cambia de dirección.
 *
 *   SISTEMA HyS › MÓDULO 1 · RESIDUOS
 *     ├ Libros              · LIBRO DIAGNÓSTICO DE RESIDUOS
 *     ├ Catálogos           · (para más adelante)
 *     ├ Establecimientos    · una carpeta por establecimiento: libro de manifiestos, Fotos manifiestos, Fotos certificados,
 *     │                       Escaneados, Diagnóstico de residuos, Auditorías, Informes (con Evidencias) y DDJJ RRPP
 *     ├ Informes de la red
 *     └ Respaldo
 *
 * En 02 ESTABLECIMIENTOS queda lo que no es de residuos: NTE, Agua, Plagas, Documentos propios.
 * La hoja LIBROS del libro general pasa a apuntar a la carpeta nueva (columna Carpeta); la anterior queda anotada en la nota
 * de esa celda. El libro general sigue en 01 GENERAL porque guarda el código y el registro de documentos de todo el sistema.
 * Se puede ejecutar más de una vez: lo que ya se movió no se vuelve a tocar.
 */

const MOD1 = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',
  NOMBRE: 'MÓDULO 1 · RESIDUOS',
  SUB: ['Libros', 'Catálogos', 'Establecimientos', 'Informes de la red', 'Respaldo'],
  RESIDUOS: ['Fotos manifiestos', 'Fotos certificados', 'Escaneados', 'Diagnóstico de residuos', 'Auditorías', 'Informes', 'DDJJ RRPP']
};

function moverAModuloResiduos() {
  const t0 = Date.now(), raiz = carpeta_(DriveApp.getFolderById(MOD1.SIS), MOD1.NOMBRE), sub = {};
  MOD1.SUB.forEach(n => sub[n] = carpeta_(raiz, n));
  const enCarpeta = (f, carpeta) => { const it = f.getParents(); while (it.hasNext()) if (it.next().getId() === carpeta.getId()) return true; return false; };
  // Si en el destino ya hay una carpeta con el mismo nombre, se pasa su contenido y la vacía queda en la papelera
  const mover = (origen, destinoPadre) => {
    const ya = destinoPadre.getFoldersByName(origen.getName());
    if (!ya.hasNext()) { origen.moveTo(destinoPadre); return; }
    const dest = ya.next();
    const fs = origen.getFiles(); while (fs.hasNext()) fs.next().moveTo(dest);
    const ds = origen.getFolders(); while (ds.hasNext()) mover(ds.next(), dest);
    if (!origen.getFiles().hasNext() && !origen.getFolders().hasNext()) origen.setTrashed(true);
  };

  // 1. Libro de diagnóstico
  let diag = '';
  try { const id = PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID'); if (id) { const f = DriveApp.getFileById(id); if (!enCarpeta(f, sub.Libros)) { f.moveTo(sub.Libros); diag = 'movido'; } else diag = 'ya estaba'; } }
  catch (e) { diag = 'no se pudo mover (' + e.message + ')'; }

  // 2. Un establecimiento por vez
  const sh = SpreadsheetApp.openById(CFG.GENERAL).getSheetByName('LIBROS'), n = sh.getLastRow() - 1, v = n > 0 ? sh.getRange(2, 1, n, 5).getValues() : [];
  let listos = 0, yaEstaban = 0, cortado = false; const problemas = [];
  for (let i = 0; i < v.length; i++) {
    if (Date.now() - t0 > 4.5 * 60 * 1000) { cortado = true; break; }
    const cod = String(v[i][0]).trim(), libroId = String(v[i][3]).trim(), carpetaId = String(v[i][4]).trim(); if (!cod || !carpetaId) continue;
    try {
      const vieja = DriveApp.getFolderById(carpetaId);
      if (enCarpeta(vieja, sub.Establecimientos)) { yaEstaban++; continue; }   // ya es la carpeta del módulo
      const nueva = carpeta_(sub.Establecimientos, vieja.getName());
      if (libroId) { try { const L = DriveApp.getFileById(libroId); if (enCarpeta(L, vieja)) L.moveTo(nueva); } catch (e) { problemas.push(cod + ': libro (' + e.message + ')'); } }
      MOD1.RESIDUOS.forEach(nombre => { const it = vieja.getFoldersByName(nombre); while (it.hasNext()) mover(it.next(), nueva); });
      const celda = sh.getRange(2 + i, 5); celda.setValue(nueva.getId()).setNote('Antes (02 ESTABLECIMIENTOS): ' + carpetaId + ' · movido el ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'));
      listos++;
    } catch (e) { problemas.push(cod + ': ' + e.message); }
  }
  CacheService.getScriptCache().removeAll(['libros', 'p_resumen', 'p_tablero']);
  Logger.log((cortado ? 'Se cortó por tiempo: volvé a ejecutar para seguir. ' : 'Listo. ') + 'Establecimientos movidos: ' + listos + ' · ya estaban: ' + yaEstaban +
    ' · libro de diagnóstico: ' + diag + '. Carpeta del módulo: ' + raiz.getUrl() + (problemas.length ? ' · Revisar: ' + problemas.join(' | ') : ''));
}