/**
 * SISTEMA HyS · MÓDULO 3 · AGUA (Fase 5 de la separación en módulos)
 * Arma la carpeta propia del módulo y MUEVE (no copia) las carpetas «Agua» de cada establecimiento, donde quedan las
 * fotos de las limpiezas de tanques (F-AGU-01) y los informes de laboratorio. Al mover, cada archivo conserva su enlace,
 * así que los registros que ya apuntan a esas fotos siguen abriendo igual.
 *
 *   SISTEMA HyS › MÓDULO 3 · AGUA
 *     ├ Establecimientos     una carpeta por establecimiento, con una subcarpeta por año
 *     └ Respaldo
 *
 * Los registros siguen donde están, en la BASE COMÚN: RESERVORIOS, PUNTOS_MUESTREO, AGUA_LIMPIEZAS, AGUA_ANALISIS,
 * AGUA_NORMATIVA y los POE de cada establecimiento. Los formularios y procesos provinciales están en MÓDULO 2 › Formularios
 * para imprimir, y el POE propio de cada establecimiento en sus «Documentos propios».
 * Se puede ejecutar más de una vez: lo que ya se movió no se vuelve a tocar.
 * Criterio: Dto. 351/79, arts. 57 y 58 (provisión de agua apta y análisis periódicos).
 */

const MOD3 = {
  SIS: '16AIJZcmxG9EBM3-D-J4vRtvruHK9DVrA',          // Drive › TRABAJO › SISTEMA HyS
  NOMBRE: 'MÓDULO 3 · AGUA',
  PROP_EST: 'AGUA_EST_CARPETA'                      // Propiedad del script: carpeta «Establecimientos» del módulo
};

// Carpeta de agua de un establecimiento dentro del módulo (la crea si hace falta).
// Si el módulo todavía no se armó, devuelve null y «Mi establecimiento» sigue usando la carpeta de siempre.
function aguaCarpetaEst_(cod) {
  const id = PropertiesService.getScriptProperties().getProperty(MOD3.PROP_EST); if (!id) return null;
  const vieja = audCarpetaEst_(cod); if (!vieja) return null;
  try { return carpeta_(DriveApp.getFolderById(id), vieja.getName()); } catch (e) { return null; }
}

function moverAModuloAgua() {
  const t0 = Date.now(), p = PropertiesService.getScriptProperties();
  const raiz = carpeta_(DriveApp.getFolderById(MOD3.SIS), MOD3.NOMBRE), est = carpeta_(raiz, 'Establecimientos');
  carpeta_(raiz, 'Respaldo');
  p.setProperty(MOD3.PROP_EST, est.getId());
  // Pasa el contenido de «origen» a «destino»; si ya hay una subcarpeta con el mismo nombre (el año), se juntan. La vacía va a la papelera.
  const volcar = (origen, destino) => {
    const fs = origen.getFiles(); while (fs.hasNext()) fs.next().moveTo(destino);
    const ds = origen.getFolders(); while (ds.hasNext()) { const d = ds.next(), ya = destino.getFoldersByName(d.getName()); if (ya.hasNext()) volcar(d, ya.next()); else d.moveTo(destino); }
    if (!origen.getFiles().hasNext() && !origen.getFolders().hasNext()) origen.setTrashed(true);
  };

  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const cods = pTabla_(sh, H.length).map(r => limpio_(r.v[0])).filter(Boolean);
  let movidos = 0, sinAgua = 0, archivos = 0, cortado = false; const problemas = [];
  for (let i = 0; i < cods.length; i++) {
    if (Date.now() - t0 > 4.5 * 60 * 1000) { cortado = true; break; }
    const vieja = audCarpetaEst_(cods[i]); if (!vieja) continue;
    const it = vieja.getFoldersByName('Agua'); if (!it.hasNext()) { sinAgua++; continue; }
    try {
      const destino = carpeta_(est, vieja.getName());
      while (it.hasNext()) { const a = it.next(); const n = a.getFiles(); while (n.hasNext()) { n.next(); archivos++; } volcar(a, destino); }
      movidos++;
    } catch (e) { problemas.push(cods[i] + ': ' + e.message); }
  }
  CacheService.getScriptCache().removeAll(['p_resumen', 'p_tablero']);
  Logger.log((cortado ? 'Se cortó por tiempo: volvé a ejecutar para seguir. ' : 'Listo. ') + 'Carpetas de agua movidas: ' + movidos +
    ' establecimientos (sin carpeta de agua: ' + sinAgua + ')' + (archivos ? ' · archivos sueltos movidos: ' + archivos : '') +
    '. Carpeta del módulo: ' + raiz.getUrl() + (problemas.length ? ' · Revisar: ' + problemas.join(' | ') : ''));
}