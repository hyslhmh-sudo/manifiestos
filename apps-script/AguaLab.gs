/**
 * SISTEMA HyS · 2 · AGUA · MUESTREOS DE LABORATORIO (28/10/2026, pedido de Belén)
 * aguaLab_()          lee el libro «Agua · Tablero de análisis de laboratorio (v0)» (hojas «Tablero Trelew» y «Tablero Rawson»,
 *                     datos desde la fila 9) y devuelve, por establecimiento: último muestreo, último bacteriológico y físico-químico,
 *                     próximo parcial y completo, qué solicitar, fecha límite, aviso y las canillas del último muestreo.
 * aguaLabAcciones_()  pasa los avisos («Urgente», «Vencido · pedir ya», «Pedir ahora») a las acciones abiertas del tablero.
 * Lo usa p_tablero (Tablero.gs) y lo muestra el portal en 2 · Agua › «Muestreos de laboratorio: qué pedir y cuándo».
 *
 * La regla vive en las fórmulas del libro, así se cambia desde Sheets sin tocar el código:
 *   · Parcial (cada 6 meses, celda B2): solo bacteriológico, en las mismas canillas del último muestreo.
 *   · Completo (cada 12 meses, celda D3): bacteriológico + físico-químico, PREVIA limpieza y desinfección de tanques y cisternas,
 *     en la salida del tanque y la canilla más alejada además de las canillas de siempre.
 *   · Si en el último muestreo hubo una muestra NO APTA: limpieza y nuevo muestreo completo en 15 días hábiles.
 *   · Avisa 30 días antes del parcial (F3) y 45 antes del completo (H3), para dar tiempo a la limpieza.
 * Normativa: Dto. 351/79 art. 57 (bacteriológico semestral y físico-químico anual); POE DPSB «Toma de muestra y gestión de
 *   resultados» 10.1 (demanda programada cada 6 meses) y 10.7 (15 días hábiles); POE DPSB «Limpieza y desinfección de tanques»
 *   10.4.e (muestra post limpieza); Nota DPSB 34/26 (no se toman muestras sin limpieza previa de tanques y cisternas).
 * Red Trelew y red Rawson van separadas. El grupo «Otros» (fuera de la red de salud) se muestra pero no genera avisos.
 * No envía correos.
 */
const AGUA_LAB_ID = '1Bd4K-7mfSEiZTRIHrH02GXqr_WdzuEXr7Yh2BZQddIM';   // Drive › MÓDULO 3 · AGUA › INFORMES DE LABORATORIO · Agua

function aguaLab_() {
  const ss = SpreadsheetApp.openById(AGUA_LAB_ID), out = [];
  const f = x => x instanceof Date ? Utilities.formatDate(x, TZ, 'yyyy-MM-dd') : String(x == null ? '' : x).trim();
  [['Tablero Trelew', 'Trelew'], ['Tablero Rawson', 'Rawson']].forEach(([hoja, red]) => {
    const sh = ss.getSheetByName(hoja); if (!sh) return;
    const n = sh.getLastRow() - 8; if (n < 1) return;
    sh.getRange(9, 1, n, 20).getValues().forEach(r => {
      const lugar = f(r[1]); if (!lugar) return;
      out.push({ red: red, grupo: f(r[0]), lugar: lugar, cod: red === 'Rawson' ? 'HSST' : /^HMH/.test(lugar) ? 'HMH' : 'HZT',
        ultimo: f(r[2]), muestras: Number(r[3]) || 0, noAptas: Number(r[4]) || 0, sinConclusion: Number(r[5]) || 0, estado: f(r[7]),
        bact: f(r[11]), fq: f(r[12]), parcial: f(r[13]), completo: f(r[14]), que: f(r[15]), limite: f(r[16]), aviso: f(r[17]),
        desde: f(r[18]), canillas: f(r[19]) });
    });
  });
  return out;
}

function aguaLabAcciones_(lab) {
  return (lab || []).filter(x => x.grupo !== 'Otros' && /urgente|vencido|pedir/i.test(x.aviso)).map(x => ({
    cod: x.cod, origen: 'Agua', vencida: /urgente|vencido/i.test(x.aviso), estado: x.aviso,
    que: (/COMPLETO/.test(x.que) ? 'Pedir muestreo COMPLETO (bacteriológico + físico-químico), antes limpiar tanques y cisternas'
      : /PARCIAL/.test(x.que) ? 'Pedir muestreo PARCIAL de 6 meses (solo bacteriológico)' : x.que),
    donde: x.lugar + ' · red ' + x.red, prioridad: /urgente/i.test(x.aviso) ? 'Alta' : '',
    aCargo: 'HyS (solicitud al DPSB) · establecimiento (limpieza de tanques)', limite: /^\d{4}-/.test(x.limite) ? x.limite : '',
    ref: 'Muestreo de agua', ir: '#agua' }));
}
