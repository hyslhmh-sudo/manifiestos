/**
 * SISTEMA HyS · DIAGNÓSTICO DE RESIDUOS (primer módulo del portal)
 * Libro propio en 01 GENERAL: «DIAGNÓSTICO DE RESIDUOS · Sistema HyS».
 *   ITEMS        catálogo de puntos a evaluar (se puede editar: agregar, desactivar, cambiar peso)
 *   DIAGNOSTICOS una fila por diagnóstico (establecimiento, fecha, modalidad, resultado)
 *   RESPUESTAS   una fila por punto evaluado (por establecimiento o por sitio)
 * Valoración: Cumple = 1 · Parcial = 0,5 · No cumple = 0 · No aplica = no cuenta. Ponderado por PESO.
 * Alcance: todas las corrientes, salvo radiactivos y efluentes.
 * Uso: ejecutar una vez construirDiagnosticoResiduos(). Después todo se maneja desde el portal.
 *
 * Desde la versión 10: DIAGNÓSTICO BASE POR CATEGORÍA (ejecutar una vez instalarDiagnosticoBase()).
 *   Perfil (PRF01 a PRF20, de la hoja DIAG_BASE_PROPUESTA) → al cerrar, completa CATEGORIA_AUDITORIA y MODULOS en la BASE COMÚN.
 *   Relevamiento inicial: es la auditoría «De campo» de la categoría (Auditoria.gs), creada desde el diagnóstico.
 *   Línea 8 (PER) y cierre (CIE) siguen igual. La matriz nacional (MAT) y las secciones de campo B a K quedan con ACTIVO = No:
 *   los diagnósticos ya hechos las conservan y se siguen viendo y calculando igual.
 */

const DIAG_H_ITEMS = ['ID', 'SECCION', 'ITEM', 'AYUDA', 'NIVEL', 'TIPO', 'OPCIONES', 'PESO', 'CRITICO', 'REFERENCIA', 'ACTIVO', 'FOTO', 'URGENCIA', 'IMPORTANCIA', 'META_L8', 'ACCION', 'TIPO_ACCION', 'COSTO', 'DOC_MODELO', 'CONDICION', 'PREVIO', 'MEJORA_SI', 'PUNTAJES'];
const DIAG_H_DIAG = ['ID_DIAG', 'CODIGO', 'FECHA', 'MODALIDAD', 'RELEVADO_POR', 'ENTREVISTADO', 'ESTADO', 'PORCENTAJE', 'CRITICOS_NO_CUMPLE', 'PUNTOS_EVALUADOS', 'OBSERVACIONES', 'ACTUALIZADO', 'MATRIZ_MSN'];
const DIAG_H_RESP = ['ID_DIAG', 'CODIGO', 'SITIO', 'ID_ITEM', 'RESPUESTA', 'VALOR', 'OBSERVACION', 'EVIDENCIA'];
const DIAG_VALOR = { 'Cumple': 1, 'Parcial': 0.5, 'No cumple': 0 };
const DIAG_ESTADOS = ['Borrador', 'Enviado', 'Cerrado', 'Anulado'];

// Catálogo versión 3. Fuentes: Directrices Nacionales GREAS (Res. MSN 134/2016), Matriz Ponderada MSN (sección A, escala 0 a 6),
// MAN-RES-001, POE-RES-001, PTS-RES-001, PTS-LYD-RES-001/002, PROT-RES-001, PROT-BIO-001, POE-CITO-001, guía del referente,
// Línea 8 (plan provincial 2027), Ley 24.051, Ley XI N.º 35, Ley 25.916, Ley 19.587, Res. SRT 905/2015.
// NIVEL: E = establecimiento · S = cada sitio. TIPO: CPN · ESCALA (0 a 6, puntúa) · LISTA · MULTI · NUMERO · TEXTO.
// URGENCIA e IMPORTANCIA (1 a 3) ubican cada problema en la matriz de 4 cuadrantes.
const DIAG_ITEMS_INICIALES = [
  ["GEN01", "0 · Datos del establecimiento", "Corrientes que genera el establecimiento", "Marcá todas, aunque sea en poca cantidad.", "E", "MULTI", "Biopatogénicos|Cortopunzantes|Líquidos biopatogénicos (drenajes, aspiración)|Químicos de laboratorio|Fijador / revelador|Citostáticos|Medicamentos vencidos|Mercurio|Residuos comunes|Reciclables|RAEE|Pilas y tubos fluorescentes|Aceites de cocina", "", "", "", "Sí", "", "", "", ""],
  ["GEN02", "0 · Datos del establecimiento", "Tipo de generador según las directrices nacionales", "Define el tiempo máximo de almacenamiento: pequeño 30 días (máx. 20 kg), mediano 72 h, grande 48 h.", "E", "LISTA", "Pequeño generador (sin internación)|Mediano generador|Gran generador (con internación)", "", "", "GREAS tabla 4", "Sí", "", "", "", ""],
  ["GEN03", "0 · Datos del establecimiento", "Cantidad aproximada de biopatogénicos por mes", "En kg o dm³, según cómo se mida.", "E", "TEXTO", "", "", "", "", "Sí", "", "", "", ""],
  ["GEN04", "0 · Datos del establecimiento", "Empresa transportista y operadora", "", "E", "TEXTO", "", "", "", "", "Sí", "", "", "", ""],
  ["GEN05", "0 · Datos del establecimiento", "Quién manipula y traslada los residuos", "", "E", "LISTA", "Personal de planta|Empresa tercerizada|Ambos", "", "", "", "Sí", "", "", "", ""],
  ["GEN06", "0 · Datos del establecimiento", "Referente de residuos o responsable (nombre y función)", "", "E", "TEXTO", "", "", "", "", "Sí", "", "", "", ""],
  ["GEN07", "0 · Datos del establecimiento", "Número de inscripción como generador", "Si no tiene, dejar vacío.", "E", "TEXTO", "", "", "", "", "Sí", "", "", "", ""],
  ["MAT01", "A · Matriz ponderada nacional (gestión)", "Clasificación de residuos", "Qué corrientes reconoce y separa el establecimiento (no la calidad de la separación).", "E", "ESCALA", "0 · No clasifica|1 · Solo comunes|2 · Comunes y biopatogénicos|3 · + fijador y revelador como químicos|4 · + algunos químicos (vencidos, citostáticos)|5 · Comunes, biopatogénicos y todos los químicos|6 · Todo lo anterior + reciclables", 2, "", "MATRIZ (MSN)", "Sí", "", 1, 3, "M2"],
  ["MAT02", "A · Matriz ponderada nacional (gestión)", "Calidad de la segregación de biopatogénicos", "Recorrer el establecimiento: % de tachos con separación correcta. Respaldar con fotos.", "E", "ESCALA", "0 · No se segrega|2 · Mala (menos del 50 %)|4 · Regular (50 a 80 %)|6 · Buena (más del 80 %)", 3, "Sí", "MATRIZ (MSN) · GREAS 9.6.2", "Sí", "Sí", 3, 3, "M2"],
  ["MAT03", "A · Matriz ponderada nacional (gestión)", "Segregación de químicos peligrosos", "", "E", "ESCALA", "0 · No se segregan|3 · Parcial (algunos químicos)|6 · Total (todas las corrientes químicas)", 2, "", "MATRIZ (MSN)", "Sí", "", 2, 3, "M2"],
  ["MAT04", "A · Matriz ponderada nacional (gestión)", "Indicadores de generación de biopatogénicos", "", "E", "ESCALA", "0 · Sin registro de cantidades|3 · Algunos indicadores|6 · Indicadores sostenidos y comparables", 1, "", "MATRIZ (MSN)", "Sí", "", 1, 2, ""],
  ["MAT05", "A · Matriz ponderada nacional (gestión)", "Cobertura de señalética de residuos", "Segregación, riesgos, depósitos, EPP.", "E", "ESCALA", "0 · No hay|2 · Menos del 50 % de las áreas|4 · Entre 50 y 80 %|6 · Más del 80 %", 1, "", "MATRIZ (MSN) · Res. MSN 1792/14", "Sí", "Sí", 1, 2, ""],
  ["MAT06", "A · Matriz ponderada nacional (gestión)", "Personal a cargo de la gestión de residuos", "", "E", "ESCALA", "0 · Nadie designado|3 · Responsable sin designación formal|6 · Responsable designado formalmente", 2, "", "MATRIZ (MSN) · GREAS (CGIR)", "Sí", "", 1, 3, "M7"],
  ["MAT07", "A · Matriz ponderada nacional (gestión)", "Capacitación del personal en gestión de residuos", "Parciales = solo un sector; sistemáticas = parte de un plan con registro.", "E", "ESCALA", "0 · No hay|1 · Parciales, no sistemáticas, no obligatorias|2 · Generales, no sistemáticas, no obligatorias|3 · Parciales obligatorias o parciales sistemáticas|4 · Generales obligatorias o generales sistemáticas|5 · Parciales, obligatorias y sistemáticas|6 · Generales, obligatorias y sistemáticas", 2, "", "MATRIZ (MSN) · SRT905", "Sí", "", 1, 3, "M6"],
  ["MAT08", "A · Matriz ponderada nacional (gestión)", "Auditorías de control de la gestión", "", "E", "ESCALA", "0 · No se hacen|2 · Recorridas informales sin registro|4 · Recorridas con registro|6 · Auditorías formales con actas", 1, "", "MATRIZ (MSN)", "Sí", "", 1, 2, ""],
  ["MAT09", "A · Matriz ponderada nacional (gestión)", "Documentación legal y trazabilidad", "Inscripción como generador, manifiestos y certificados de tratamiento (biopatogénicos y químicos).", "E", "ESCALA", "0 · No cuenta con documentación|1 · Solo manifiestos de una corriente|2 · Inscripción o certificados|3 · Inscripción + manifiestos o certificados|4 · Inscripción + manifiestos + certificados (una corriente)|5 · Casi completa (falta manifiesto o certificado de una corriente)|6 · Inscripción, manifiestos y certificados de biopatogénicos y químicos", 3, "Sí", "MATRIZ (MSN) · L24051 · LXI35", "Sí", "", 2, 3, ""],
  ["MAT10", "A · Matriz ponderada nacional (gestión)", "Procedimientos escritos de manejo de residuos", "Segregación, EPP, rutas y horarios, transporte, químicos, limpieza de contenedores, auditorías, mercurio, almacenamiento final, controles de salud.", "E", "ESCALA", "0 · Ninguno|2 · Menos del 50 %|4 · Entre 50 y 80 %|6 · Más del 80 %", 2, "", "MATRIZ (MSN) · GREAS · POE marco L8", "Sí", "", 1, 3, "M4"],
  ["MAT11", "A · Matriz ponderada nacional (gestión)", "Libros de registro (generación, capacitación y accidentes)", "", "E", "ESCALA", "0 · Ninguno|2 · Uno|4 · Dos|6 · Los tres", 1, "", "MATRIZ (MSN)", "Sí", "", 1, 2, ""],
  ["MAT12", "A · Matriz ponderada nacional (gestión)", "Rutas de recolección interna", "Preestablecidas en un plano, con horarios.", "E", "ESCALA", "0 · Circuito improvisado|3 · Rutas informales, sin registro|6 · Rutas formales en el manual", 2, "", "MATRIZ (MSN) · POE-RES-001", "Sí", "", 2, 2, ""],
  ["MAT13", "A · Matriz ponderada nacional (gestión)", "Pesaje de los residuos", "", "E", "ESCALA", "0 · Sin balanza|3 · Balanza externa|6 · Balanza propia adecuada", 1, "", "MATRIZ (MSN) · GREAS 9.6.3.3", "Sí", "", 1, 1, ""],
  ["MAT14", "A · Matriz ponderada nacional (gestión)", "Bolsas y descartadores disponibles", "Bolsas que cumplan la norma de la jurisdicción.", "E", "ESCALA", "0 · Sin bolsas ni descartadores|1 · Un solo color, sin descartadores|2 · Rojas y negras sin descartadores, o un color con descartadores|3 · Rojas, negras y amarillas sin descartadores|4 · Rojas y negras con descartadores|5 · Rojas, negras y amarillas con descartadores|6 · Rojas, negras y amarillas, con descartadores rojos y amarillos", 3, "Sí", "MATRIZ (MSN) · GREAS tabla 2", "Sí", "Sí", 3, 3, ""],
  ["MAT15", "A · Matriz ponderada nacional (gestión)", "Contenedores primarios adecuados", "% de puntos de generación con tachos adecuados.", "E", "ESCALA", "0 · No hay|2 · Menos del 50 %|4 · Entre 50 y 80 %|6 · Más del 80 %", 2, "", "MATRIZ (MSN)", "Sí", "Sí", 2, 3, ""],
  ["MAT16", "A · Matriz ponderada nacional (gestión)", "Carros de recolección interna", "", "E", "ESCALA", "0 · No hay carros: acarreo manual|3 · Un mismo carro para todas las corrientes|6 · Carros exclusivos e identificados por corriente", 2, "", "MATRIZ (MSN) · GREAS tabla 5", "Sí", "Sí", 2, 2, ""],
  ["MAT17", "A · Matriz ponderada nacional (gestión)", "Almacenamiento final", "Local exclusivo, externo, restringido, lavable, cerrado e identificado.", "E", "ESCALA", "0 · No hay: a cielo abierto, sobre el piso|1 · Local de comunes o biopatogénicos que no cumple|2 · Local de comunes y biopatogénicos que no cumple|3 · Locales de comunes, biopatogénicos y químicos que no cumplen|4 · Comunes y biopatogénicos que cumplen|5 · Comunes y biopatogénicos que cumplen; químicos no|6 · Comunes, biopatogénicos y químicos que cumplen", 3, "Sí", "MATRIZ (MSN) · GREAS 9.6.3.3", "Sí", "Sí", 3, 3, ""],
  ["MAT18", "A · Matriz ponderada nacional (gestión)", "Tratamiento y disposición final de biopatogénicos", "", "E", "ESCALA", "0 · Sin tratamiento: van al basural o vertedero con los comunes|1 · Vertedero en celda aparte|2 · Celda con encalado o planta no habilitada|3 · Celdas exclusivas en planta habilitada|4 · Planta habilitada, sin registro de operación|5 · Planta habilitada con registro, sin monitoreo|6 · Planta habilitada, con registro, monitoreo y fiscalización", 3, "Sí", "MATRIZ (MSN) · L24051", "Sí", "", 3, 3, ""],
  ["MAT19", "A · Matriz ponderada nacional (gestión)", "Tratamiento y disposición final de químicos", "", "E", "ESCALA", "0 · Sin tratamiento|2 · Planta no habilitada o tecnología deficiente|4 · Planta habilitada, sin registro|5 · Planta habilitada con registro, sin monitoreo|6 · Planta habilitada, con registro, monitoreo y fiscalización", 2, "", "MATRIZ (MSN) · L24051", "Sí", "", 2, 3, ""],
  ["MAT20", "A · Matriz ponderada nacional (gestión)", "Tratamiento y disposición final de residuos comunes", "", "E", "ESCALA", "0 · Quema a cielo abierto|1 · Basural|2 · Vertedero municipal|3 · Vertedero con acceso restringido|4 · Reciclaje + vertedero restringido|5 · Relleno sanitario|6 · Reciclaje + relleno sanitario", 1, "", "MATRIZ (MSN) · Ley 25.916", "Sí", "", 1, 1, ""],
  ["BOL01", "B · Bolsas y colores", "Color de bolsa para biopatogénicos", "", "S", "LISTA", "Roja|Otro color|No hay bolsa diferenciada", "", "", "GREAS tabla 2", "Sí", "Sí", "", "", ""],
  ["BOL02", "B · Bolsas y colores", "Color de bolsa para residuos comunes", "", "S", "LISTA", "Negra|Otro color|No hay bolsa diferenciada", "", "", "GREAS tabla 2", "Sí", "", "", "", ""],
  ["BOL03", "B · Bolsas y colores", "Cómo se separan los químicos", "", "S", "LISTA", "Bolsa amarilla o bidón rotulado|Recipiente rotulado sin color|No se separan|No genera", "", "", "GREAS tabla 2", "Sí", "", "", "", ""],
  ["BOL04", "B · Bolsas y colores", "Espesor de la bolsa roja que se usa", "Chica (40×60) > 60 µm · mediana (60×90) > 80 µm · grande (90×120) > 100 µm.", "S", "LISTA", "Cumple el espesor|No cumple|No se sabe", "", "", "GREAS tabla 3", "Sí", "", "", "", ""],
  ["BOL05", "B · Bolsas y colores", "Colores reglamentarios en todos los puntos (rojo, negro, amarillo)", "", "S", "CPN", "", 3, "Sí", "GREAS tabla 2 · Guía del referente", "Sí", "", 3, 3, ""],
  ["BOL06", "B · Bolsas y colores", "Bolsas cerradas con precinto o doble nudo y rotuladas (servicio y fecha)", "", "S", "CPN", "", 2, "", "GREAS 9.6.3.1", "Sí", "Sí", 2, 2, ""],
  ["BOL07", "B · Bolsas y colores", "Bolsas que no superan 3/4 de su capacidad ni 25 kg", "", "S", "CPN", "", 2, "", "GREAS · POE-RES-001", "Sí", "", 2, 2, ""],
  ["TAC01", "C · Tachos en los sectores (almacenamiento primario)", "Tipo de tachos que se usan", "", "S", "MULTI", "Plástico con tapa y pedal|Plástico con tapa vaivén|Sin tapa|Improvisado (caja, balde, bidón)|Metálico", "", "", "", "Sí", "Sí", "", "", ""],
  ["TAC02", "C · Tachos en los sectores (almacenamiento primario)", "Estado general de los tachos", "", "S", "LISTA", "Bueno|Regular|Malo", "", "", "", "Sí", "Sí", "", "", ""],
  ["TAC03", "C · Tachos en los sectores (almacenamiento primario)", "Tachos con tapa, lavables, sanos y del tamaño adecuado", "", "S", "CPN", "", 2, "", "GREAS 9.6.3.1", "Sí", "", 2, 2, ""],
  ["TAC04", "C · Tachos en los sectores (almacenamiento primario)", "Tachos identificados con la corriente (color o rótulo)", "", "S", "CPN", "", 2, "", "GREAS 9.6.3.1", "Sí", "", 1, 2, ""],
  ["TAC05", "C · Tachos en los sectores (almacenamiento primario)", "Tacho de cada corriente en cada punto de generación", "Enfermería, consultorios, laboratorio, quirófano, etc.", "S", "CPN", "", 2, "", "GREAS", "Sí", "", 2, 3, ""],
  ["TAC06", "C · Tachos en los sectores (almacenamiento primario)", "No se observan corrientes mezcladas", "Mirá al menos 3 sectores. Anotá qué mezcla viste.", "S", "CPN", "", 3, "Sí", "GREAS 9.6.2", "Sí", "Sí", 3, 3, ""],
  ["TAC07", "C · Tachos en los sectores (almacenamiento primario)", "Retiro de los sectores al menos una vez por turno (máximo 24 h)", "", "S", "CPN", "", 2, "", "GREAS 9.6.3.1 · POE-RES-001", "Sí", "", 2, 2, ""],
  ["COR01", "D · Cortopunzantes y líquidos", "Tipo de descartador", "", "S", "LISTA", "Rígido homologado|Botella o bidón improvisado|Caja de cartón|No hay", "", "", "", "Sí", "Sí", "", "", ""],
  ["COR02", "D · Cortopunzantes y líquidos", "Descartadores en todos los puntos de uso, al alcance de la mano", "", "S", "CPN", "", 3, "Sí", "GREAS · PROT-BIO-001", "Sí", "", 3, 3, ""],
  ["COR03", "D · Cortopunzantes y líquidos", "Se cierran a 3/4 y no se reabren ni se vacían", "", "S", "CPN", "", 3, "Sí", "GREAS · Guía del referente", "Sí", "", 3, 3, ""],
  ["COR04", "D · Cortopunzantes y líquidos", "Estables (fijos o en soporte) y rotulados", "", "S", "CPN", "", 1, "", "GREAS", "Sí", "", 2, 1, ""],
  ["COR05", "D · Cortopunzantes y líquidos", "Líquidos biopatogénicos (drenajes, aspiración) en recipientes cerrados y rotulados", "«No aplica» si no se generan.", "S", "CPN", "", 2, "", "GREAS 9.6.3.1", "Sí", "", 2, 2, ""],
  ["LIM01", "E · Limpieza de tachos y carros", "Quién limpia tachos y carros", "", "S", "LISTA", "Personal de planta|Empresa de limpieza|No está definido", "", "", "", "Sí", "", "", "", ""],
  ["LIM02", "E · Limpieza de tachos y carros", "Frecuencia de limpieza de tachos y carros", "Las directrices piden al menos una vez por día.", "S", "LISTA", "Después de cada uso|Una vez por día|Semanal|Sin frecuencia definida", "", "", "GREAS 9.6.4.2.1", "Sí", "", "", "", ""],
  ["LIM03", "E · Limpieza de tachos y carros", "Técnica: detergente, enjuague y desinfección con hipoclorito 1000 ppm", "Anotá el producto y la concentración que usan.", "S", "CPN", "", 2, "", "GREAS · PTS-LYD-RES-001/002", "Sí", "", 2, 2, ""],
  ["LIM04", "E · Limpieza de tachos y carros", "Registro de la limpieza (fecha, responsable, producto)", "", "S", "CPN", "", 1, "", "PTS-LYD-RES-002", "Sí", "", 1, 2, ""],
  ["LIM05", "E · Limpieza de tachos y carros", "Sector exclusivo para lavar contenedores, con agua y desagüe", "No en office de alimentos ni baños de pacientes.", "S", "CPN", "", 2, "", "GREAS 9.6.3.3", "Sí", "Sí", 1, 2, ""],
  ["SEN01", "F · Señalética", "Carteles de segregación junto a los tachos", "", "S", "CPN", "", 2, "", "Res. MSN 1792/14 · GREAS 9.9", "Sí", "Sí", 1, 2, ""],
  ["SEN02", "F · Señalética", "Leyenda «Residuos biopatogénicos – riesgo biológico» con pictograma en carros y depósitos", "", "S", "CPN", "", 2, "", "GREAS 9.6.4.2.1", "Sí", "Sí", 1, 2, ""],
  ["SEN03", "F · Señalética", "Plano de rutas y almacenamientos a la vista", "", "S", "CPN", "", 1, "", "GREAS 9.6.3.2", "Sí", "", 1, 1, ""],
  ["CAR01", "G · Traslado interno", "Cómo se trasladan los residuos", "", "S", "LISTA", "Carro exclusivo por corriente|Un carro para todo|Contenedor tipo balde con ruedas|A mano, sin carro", "", "", "GREAS tabla 5", "Sí", "Sí", "", "", ""],
  ["CAR02", "G · Traslado interno", "Estado del carro o contenedor", "", "S", "LISTA", "Bueno|Regular|Malo|No hay", "", "", "", "Sí", "Sí", "", "", ""],
  ["CAR03", "G · Traslado interno", "Carro con tapa, ruedas en buen estado, lavable y estanco", "", "S", "CPN", "", 2, "", "GREAS 9.6.4", "Sí", "", 2, 2, ""],
  ["CAR04", "G · Traslado interno", "Recorrido de zona limpia a zona sucia, sin cruzar pacientes ni alimentos", "", "S", "CPN", "", 2, "", "POE-RES-001", "Sí", "", 2, 2, ""],
  ["CAR05", "G · Traslado interno", "Bolsas trasladadas cerradas, tomadas del nudo, sin arrastrar ni apretar", "", "S", "CPN", "", 2, "", "PTS-RES-001 · Guía del referente", "Sí", "", 2, 2, ""],
  ["CAR06", "G · Traslado interno", "Kit para derrames en el carro o en el circuito", "", "S", "CPN", "", 1, "", "GREAS · PROT-RES-001", "Sí", "", 2, 1, ""],
  ["CAR07", "G · Traslado interno", "EPP del operario durante el traslado (guantes resistentes, delantal, calzado cerrado)", "", "S", "CPN", "", 3, "Sí", "PTS-RES-001 · SRT905", "Sí", "Sí", 3, 3, ""],
  ["DIN01", "H · Almacenamiento intermedio", "¿Hay almacenamiento intermedio?", "", "S", "LISTA", "Sí|No, se lleva directo al depósito final|No corresponde (sitio chico)", "", "", "GREAS 9.6.3.2", "Sí", "", "", "", ""],
  ["DIN02", "H · Almacenamiento intermedio", "Ubicación y descripción", "", "S", "TEXTO", "", "", "", "", "Sí", "Sí", "", "", ""],
  ["DIN03", "H · Almacenamiento intermedio", "Bajo techo, de fácil limpieza, alejado de pacientes y público", "«No aplica» si no hay almacenamiento intermedio.", "S", "CPN", "", 2, "", "GREAS 9.6.3.2", "Sí", "", 2, 2, ""],
  ["DIN04", "H · Almacenamiento intermedio", "Contenedores con tapa, lisos, con manijas o ruedas", "", "S", "CPN", "", 1, "", "GREAS 9.6.3.2", "Sí", "", 1, 2, ""],
  ["DIN05", "H · Almacenamiento intermedio", "Señalizado y con limpieza registrada", "", "S", "CPN", "", 1, "", "GREAS · PTS-LYD-RES-001", "Sí", "", 1, 1, ""],
  ["DFI01", "I · Almacenamiento final (depósito)", "Tipo de depósito final", "", "S", "LISTA", "Local exclusivo de mampostería|Contenedor cerrado|Jaula o recinto enrejado|A cielo abierto, sin recinto|No hay depósito", "", "", "GREAS 9.6.3.3", "Sí", "Sí", "", "", ""],
  ["DFI02", "I · Almacenamiento final (depósito)", "Exclusivo para residuos, cerrado con llave y con acceso restringido", "", "S", "CPN", "", 3, "Sí", "GREAS 9.6.3.3 · PTS-LYD-RES-002", "Sí", "Sí", 3, 3, ""],
  ["DFI03", "I · Almacenamiento final (depósito)", "Techado, pisos y paredes lisos, lavables e impermeables", "", "S", "CPN", "", 2, "", "GREAS 9.6.3.3", "Sí", "", 2, 2, ""],
  ["DFI04", "I · Almacenamiento final (depósito)", "Ventilación, iluminación y protección contra vectores", "", "S", "CPN", "", 2, "", "GREAS", "Sí", "", 2, 2, ""],
  ["DFI05", "I · Almacenamiento final (depósito)", "Cartel «Almacenamiento final de residuos biopatogénicos – Riesgo biológico – Solo personal autorizado» con teléfono 24 h", "", "S", "CPN", "", 1, "", "GREAS 9.6.3.3", "Sí", "Sí", 1, 2, ""],
  ["DFI06", "I · Almacenamiento final (depósito)", "Bolsas dentro de contenedores (no en el piso ni sobre pallets)", "", "S", "CPN", "", 3, "Sí", "GREAS 9.6.3.3", "Sí", "Sí", 3, 3, ""],
  ["DFI07", "I · Almacenamiento final (depósito)", "Corrientes separadas dentro del depósito (biopatogénicos, químicos, comunes)", "", "S", "CPN", "", 2, "", "GREAS", "Sí", "", 2, 2, ""],
  ["DFI08", "I · Almacenamiento final (depósito)", "Tiempo de permanencia dentro del máximo (48 h, 72 h o 30 días según el generador)", "Si se excede y no hay cámara fría (3 a 8 °C), es no cumple.", "S", "CPN", "", 3, "Sí", "GREAS tabla 4 · PTS-LYD-RES-002", "Sí", "", 3, 3, ""],
  ["DFI09", "I · Almacenamiento final (depósito)", "Punto de agua y desagüe para lavado", "", "S", "CPN", "", 1, "", "GREAS 9.6.3.3", "Sí", "", 1, 2, ""],
  ["DFI10", "I · Almacenamiento final (depósito)", "Acceso adecuado para el vehículo de retiro", "", "S", "CPN", "", 1, "", "GREAS", "Sí", "", 1, 1, ""],
  ["DFI11", "I · Almacenamiento final (depósito)", "Elementos para contener derrames y extintor cercano", "", "S", "CPN", "", 1, "", "PROT-RES-001", "Sí", "", 2, 1, ""],
  ["DFI12", "I · Almacenamiento final (depósito)", "Frecuencia de retiro pactada", "", "S", "LISTA", "Diaria|2 a 3 veces por semana|Semanal|Quincenal|Sin frecuencia pactada", "", "", "", "Sí", "", "", "", ""],
  ["DFI13", "I · Almacenamiento final (depósito)", "Los retiros cumplen la frecuencia pactada", "Verificable con los manifiestos del sistema.", "S", "CPN", "", 2, "", "L24051", "Sí", "", 2, 2, ""],
  ["DFI14", "I · Almacenamiento final (depósito)", "Se controla, firma y archiva el manifiesto en cada retiro", "", "S", "CPN", "", 2, "", "L24051 · PROT-RES-003", "Sí", "", 1, 3, ""],
  ["QUI01", "J · Químicos, citostáticos y medicamentos", "Inventario de residuos químicos que se generan", "Laboratorio, formol, fijador/revelador, xilol, reactivos.", "E", "CPN", "", 2, "", "GREAS 9.6.2.2", "Sí", "", 1, 2, ""],
  ["QUI02", "J · Químicos, citostáticos y medicamentos", "Químicos en recipientes compatibles, cerrados y rotulados (SGA), sin mezclar", "No se tiran a la pileta ni al inodoro.", "E", "CPN", "", 2, "", "GREAS anexo III · SGA", "Sí", "Sí", 2, 2, ""],
  ["QUI03", "J · Químicos, citostáticos y medicamentos", "Medicamentos vencidos o sobrantes devueltos a la Farmacia del hospital", "Solo donde no hay internación (CAPS, puestos, consultorios). Donde hay internación, marcá «No aplica» y respondé el punto siguiente.", "S", "CPN", "", 2, "", "Guía del referente", "Sí", "", 1, 2, ""],
  ["QUI06", "J · Químicos, citostáticos y medicamentos", "Medicamentos vencidos (Y3) separados como residuo químico, guardados aparte y retirados por operador habilitado", "Solo en establecimientos con internación.", "E", "CPN", "", 2, "", "L24051 · GREAS 9.6.2.2", "Sí", "", 1, 2, ""],
  ["QUI04", "J · Químicos, citostáticos y medicamentos", "Citostáticos con contenedor específico rotulado y procedimiento escrito", "«No aplica» si no se preparan ni administran.", "E", "CPN", "", 3, "Sí", "POE-CITO-001 · PROT-CITO-001", "Sí", "", 3, 3, ""],
  ["QUI05", "J · Químicos, citostáticos y medicamentos", "Plan para eliminar el mercurio (termómetros, tensiómetros) y su disposición", "", "E", "CPN", "", 1, "", "Convenio de Minamata · MATRIZ", "Sí", "", 1, 2, ""],
  ["RSU01", "K · Comunes, reciclables y RAEE", "Contenedores de residuos comunes suficientes, con tapa", "", "E", "CPN", "", 1, "", "Ley 25.916", "Sí", "Sí", 1, 1, ""],
  ["RSU02", "K · Comunes, reciclables y RAEE", "Retiro municipal regular de residuos comunes", "", "E", "CPN", "", 1, "", "Ley 25.916", "Sí", "", 2, 1, ""],
  ["RSU03", "K · Comunes, reciclables y RAEE", "Separación de reciclables", "", "E", "CPN", "", 1, "", "MATRIZ", "Sí", "", 1, 1, ""],
  ["RSU04", "K · Comunes, reciclables y RAEE", "RAEE apartados, bajo techo, con circuito de baja y retiro", "", "E", "CPN", "", 1, "", "Programa RAEE · Bienes", "Sí", "Sí", 1, 1, ""],
  ["RSU05", "K · Comunes, reciclables y RAEE", "Pilas, baterías y tubos fluorescentes en recipiente aparte, rotulado", "", "E", "CPN", "", 1, "", "Guía del referente", "Sí", "", 1, 1, ""],
  ["PER01", "L · Personal y bioseguridad (Línea 8)", "EPP provisto en cantidad suficiente y en uso", "", "E", "CPN", "", 3, "Sí", "SRT905 · L19587", "Sí", "Sí", 3, 3, "L8 · EPP"],
  ["PER02", "L · Personal y bioseguridad (Línea 8)", "Vacunación del personal expuesto: hepatitis B y doble adulto", "Se evalúa el programa y la cobertura, no datos de cada persona.", "E", "LISTA", "Cobertura completa|Cobertura parcial|Sin programa|No se sabe", "", "", "L8 meta 5", "Sí", "", 3, 3, "M5"],
  ["PER03", "L · Personal y bioseguridad (Línea 8)", "Programa de vacunación del personal en servicios de riesgo", "", "E", "CPN", "", 3, "Sí", "L8 meta 5", "Sí", "", 3, 3, "M5"],
  ["PER04", "L · Personal y bioseguridad (Línea 8)", "Circuito ante accidente cortopunzante o exposición (atención, profilaxis, denuncia)", "", "E", "CPN", "", 3, "Sí", "PROT-BIO-001 · APPC", "Sí", "", 3, 3, "M4"],
  ["PER05", "L · Personal y bioseguridad (Línea 8)", "POE marco de bioseguridad adoptados (EPP, material biológico, residuos)", "", "E", "LISTA", "Todos|Algunos|Ninguno", "", "", "L8 meta 4", "Sí", "", 1, 3, "M4"],
  ["PER06", "L · Personal y bioseguridad (Línea 8)", "Personal de residuos capacitado en el último año", "En la ruralidad, articulado con el referente del hospital cabecera.", "E", "CPN", "", 2, "", "L8 meta 6 · SRT905", "Sí", "", 1, 3, "M6"],
  ["PER07", "L · Personal y bioseguridad (Línea 8)", "Necesidades de formación del referente", "", "E", "MULTI", "Segregación y corrientes|Químicos y citostáticos|Manifiestos y documentación|Depósito y limpieza|Accidentes y bioseguridad|Ninguna", "", "", "", "Sí", "", "", "", "M7"],
  ["PER08", "L · Personal y bioseguridad (Línea 8)", "Plan de contingencia ante derrames escrito y conocido", "", "E", "CPN", "", 2, "", "PROT-RES-001 · SRT905", "Sí", "", 2, 2, "M4"],
  ["PER09", "L · Personal y bioseguridad (Línea 8)", "Lavamanos con agua, jabón y toallas para el personal de residuos", "", "E", "CPN", "", 1, "", "L19587", "Sí", "", 2, 2, ""],
  ["CIE01", "Z · Cierre", "Principales problemas observados", "Marcá todos los que correspondan.", "E", "MULTI", "Corrientes mezcladas o segregación incorrecta|Faltan bolsas o no son del color o espesor correcto|Faltan descartadores o se usan improvisados|Tachos insuficientes o en mal estado|Sin carro o carro inadecuado|Sin depósito final o depósito inadecuado|Residuos acumulados más tiempo del permitido|Retiro irregular de la empresa|Falta documentación (inscripción, manifiestos, certificados)|Personal sin capacitación|Falta EPP o no se usa|Sin procedimientos escritos|Químicos o citostáticos sin circuito|Sin señalética|Limpieza sin frecuencia ni registro|Personal sin vacunación completa", "", "", "", "Sí", "", "", "", ""],
  ["CIE05", "Z · Cierre", "Otros problemas o detalle", "Lo que no esté en la lista, o ampliar alguno.", "E", "TEXTO", "", "", "", "", "Sí", "", "", "", ""],
  ["CIE02", "Z · Cierre", "Propuestas de mejora", "Marcá todas las que correspondan.", "E", "MULTI", "Capacitar al personal de limpieza y traslado|Capacitar al personal asistencial|Designar formalmente un responsable o referente|Proveer bolsas reglamentarias|Proveer descartadores|Reponer o agregar tachos|Adquirir carro de traslado|Construir o adecuar el depósito final|Colocar señalética|Redactar o adoptar procedimientos (POE)|Regularizar contrato y frecuencia de retiro|Regularizar inscripción, manifiestos y certificados|Proveer EPP|Completar la vacunación del personal|Hacer recorridas o auditorías periódicas", "", "", "", "Sí", "", "", "", ""],
  ["CIE06", "Z · Cierre", "Otras propuestas o detalle", "", "E", "TEXTO", "", "", "", "", "Sí", "", "", "", ""],
  ["CIE03", "Z · Cierre", "Qué necesita el establecimiento (insumos, obras, capacitación)", "", "E", "MULTI", "Bolsas|Descartadores|Tachos|Carros|Depósito final (obra)|Señalética|EPP|Capacitación|Vacunación|Contrato de retiro", "", "", "", "Sí", "", "", "", ""],
  ["CIE04", "Z · Cierre", "Prioridad de intervención según quien releva", "", "E", "LISTA", "Alta|Media|Baja", "", "", "", "Sí", "", "", "", ""]
];

// ------------------------------------------------------------------ CONSTRUCCIÓN (una vez)
function construirDiagnosticoResiduos() {
  const ss = nuevoLibro_('DIAGNÓSTICO DE RESIDUOS · Sistema HyS', 'DIAG_RES_ID'); if (!ss) return;
  const it = ss.getSheets()[0].setName('ITEMS');
  encabezar_(it, 'Puntos del diagnóstico de residuos', 'Catálogo editable: para dejar de usar un punto, poné ACTIVO = No (no lo borres). NIVEL E = establecimiento, S = cada sitio. PESO 1 a 3.', DIAG_H_ITEMS,
    ['Código fijo del punto.', 'Sección.', 'Lo que se evalúa.', 'Ayuda que ve quien completa.', 'E: una vez por establecimiento · S: por cada sitio.', 'CPN: Cumple/Parcial/No cumple/No aplica · LISTA · MULTI · NUMERO · TEXTO.', 'Opciones separadas por «|».', '1 a 3.', 'Sí: si no cumple, se marca como crítico.', 'Norma o documento de referencia.', 'Sí / No.', 'Sí: permite agregar fotos.', '1 a 3: cuánto apura resolverlo.', '1 a 3: cuánto pesa en la gestión.', 'Meta de la Línea 8 a la que aporta.']);
  it.getRange(6, 1, DIAG_ITEMS_INICIALES.length, DIAG_H_ITEMS.length).setValues(DIAG_ITEMS_INICIALES.map(r => r.concat(Array(DIAG_H_ITEMS.length).fill("")).slice(0, DIAG_H_ITEMS.length)));
  it.setFrozenColumns(3); it.setColumnWidth(3, 420); it.setColumnWidth(4, 300);
  lista_(it, 4, 300, ['E', 'S']); lista_(it, 5, 300, ['CPN', 'ESCALA', 'LISTA', 'MULTI', 'NUMERO', 'TEXTO']); lista_(it, 10, 300, ['Sí', 'No']); lista_(it, 11, 300, ['Sí', '']);
  proteger_(it, [it.getRange('A1:O5'), it.getRange(6, 1, 300, 1)], 'Encabezados y códigos');

  const dg = ss.insertSheet('DIAGNOSTICOS');
  encabezar_(dg, 'Diagnósticos', 'Una fila por diagnóstico. Se completa desde el portal o al importar un libro de la red.', DIAG_H_DIAG, null, [7, 8, 9, 11]);
  lista_(dg, 3, 500, ['Visita', 'Entrevista', 'Referente (en línea)', 'Libro de la red']); lista_(dg, 6, 500, DIAG_ESTADOS);
  const rp = ss.insertSheet('RESPUESTAS');
  encabezar_(rp, 'Respuestas', 'Una fila por punto evaluado. SITIO vacío = punto del establecimiento.', DIAG_H_RESP);
  lista_(rp, 4, 5000, ['Cumple', 'Parcial', 'No cumple', 'No aplica']);
  const ini = ss.insertSheet('INICIO', 0);
  ini.getRange('A1').setValue('DIAGNÓSTICO DE RESIDUOS · Sistema HyS').setFontSize(18).setFontWeight('bold').setFontColor(BASES.AZUL);
  ini.getRange('A2:A6').setValues([['Todas las corrientes, salvo radiactivos y efluentes. Se completa desde el portal (visita o entrevista) o con el libro que se envía a la red.'],
    ['Valoración: Cumple = 1 · Parcial = 0,5 · No cumple = 0 · No aplica no cuenta. Ponderado por PESO. Resultado en porcentaje.'],
    ['Puntos críticos (CRITICO = Sí): si no se cumplen, aparecen destacados aunque el porcentaje sea alto.'],
    ['Hojas: ITEMS (catálogo editable), DIAGNOSTICOS (uno por fila), RESPUESTAS (un punto por fila).'],
    ['Nunca borres filas: para anular un diagnóstico, cambiá su ESTADO a «Anulado».']]).setWrap(true);
  ini.setColumnWidth(1, 900);
  ss.setActiveSheet(ini);
  Logger.log('DIAGNÓSTICO DE RESIDUOS creado: ' + ss.getUrl() + ' · ' + DIAG_ITEMS_INICIALES.length + ' puntos.');
}

// Pasa el libro ya creado al catálogo vigente (versión 2, operativo). Los diagnósticos guardados no se tocan.
function actualizarCatalogoDiagnostico() {
  const it = pDG_().getSheetByName('ITEMS');
  if (String(it.getRange(5, 16).getValue()) === 'ACCION') { Logger.log('No se ejecutó: el catálogo de la hoja ITEMS ya es la versión vigente y tiene acciones y costos cargados. Los cambios se hacen directamente en la hoja.'); return; }
  const viejos = pTabla_(it, 1).map(r => r.v[0]);
  const nuevos = DIAG_ITEMS_INICIALES.map(r => r[0]);
  it.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(p => p.remove());
  encabezar_(it, 'Puntos del diagnóstico de residuos', 'Catálogo editable: para dejar de usar un punto, poné ACTIVO = No (no lo borres). NIVEL E = establecimiento, S = cada sitio. PESO 1 a 3. FOTO = Sí permite agregar fotos.', DIAG_H_ITEMS);
  it.getRange(6, 1, Math.max(it.getMaxRows() - 5, 1), DIAG_H_ITEMS.length).clearContent();
  it.getRange(6, 1, DIAG_ITEMS_INICIALES.length, DIAG_H_ITEMS.length).setValues(DIAG_ITEMS_INICIALES.map(r => r.concat(Array(DIAG_H_ITEMS.length).fill("")).slice(0, DIAG_H_ITEMS.length)));
  // Puntos viejos que ya no están: quedan al final, inactivos (por si algún diagnóstico los usó)
  const fuera = viejos.filter(v => v && nuevos.indexOf(v) < 0).map(v => [v, 'Puntos anteriores', '(punto de la versión anterior)', '', 'E', 'CPN', '', 1, '', '', 'No', '', '', '', '']);
  if (fuera.length) it.getRange(6 + DIAG_ITEMS_INICIALES.length, 1, fuera.length, DIAG_H_ITEMS.length).setValues(fuera);
  lista_(it, 4, 300, ['E', 'S']); lista_(it, 5, 300, ['CPN', 'ESCALA', 'LISTA', 'MULTI', 'NUMERO', 'TEXTO']); lista_(it, 10, 300, ['Sí', 'No']); lista_(it, 11, 300, ['Sí', '']);
  proteger_(it, [it.getRange('A1:O5'), it.getRange(6, 1, 300, 1)], 'Encabezados y códigos');
  const dg = pDG_().getSheetByName('DIAGNOSTICOS'); dg.getRange(5, 13).setValue('MATRIZ_MSN').setFontWeight('bold').setFontColor('#FFFFFF').setBackground(BASES.AZUL); lista_(dg, 3, 500, ['Visita', 'Entrevista', 'Referente (en línea)', 'Libro de la red']); lista_(dg, 6, 500, DIAG_ESTADOS);
  Logger.log('Catálogo actualizado: ' + DIAG_ITEMS_INICIALES.length + ' puntos.');
}

// ------------------------------------------------------------------ PORTAL
let P_DG_ = null;   // el libro se abre una sola vez por ejecución (14.22)
const pDG_ = () => P_DG_ || (P_DG_ = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID')));
function pDiagItems_(todos) {   // todos = true: incluye los inactivos (para leer diagnósticos viejos)
  const sh = pDG_().getSheetByName('ITEMS');
  return pTabla_(sh, DIAG_H_ITEMS.length).map(r => { const o = {}; DIAG_H_ITEMS.forEach((h, i) => o[h] = r.v[i]); return o; }).filter(o => o.ID && (todos || o.ACTIVO !== 'No'));
}
function pDiagLista_() {   // último diagnóstico de cada establecimiento
  const sh = pDG_().getSheetByName('DIAGNOSTICOS'), m = {};
  pTabla_(sh, DIAG_H_DIAG.length).forEach(r => {
    const o = {}; DIAG_H_DIAG.forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : r.v[i]);
    if (o.ESTADO === 'Anulado') return;
    const prev = m[o.CODIGO]; if (!prev || String(o.FECHA) >= String(prev.FECHA)) m[o.CODIGO] = o;
  });
  return m;
}
function pDiagAbrir_(cod, id) {
  cod = limpio_(cod);
  const dg = pDG_(), todosItems = pDiagItems_(true), lista = pTabla_(dg.getSheetByName('DIAGNOSTICOS'), DIAG_H_DIAG.length)
    .map(r => { const o = { fila: r.fila }; DIAG_H_DIAG.forEach((h, i) => o[h] = r.v[i] instanceof Date ? pFecha_(r.v[i]) : r.v[i]); return o; })
    .filter(o => o.CODIGO === cod && o.ESTADO !== 'Anulado').sort((a, b) => String(b.FECHA).localeCompare(String(a.FECHA)));
  const actual = id ? lista.find(o => o.ID_DIAG === id) : lista.find(o => o.ESTADO === 'Borrador' || o.ESTADO === 'Enviado');   // abierto: en curso o enviado para revisar
  const previo = lista.find(o => o.ESTADO === 'Cerrado' && (!actual || o.ID_DIAG !== actual.ID_DIAG));
  const resp = {}, rp = dg.getSheetByName('RESPUESTAS');
  const quiero = [actual && actual.ID_DIAG, previo && previo.ID_DIAG].filter(Boolean);
  if (quiero.length) pTabla_(rp, DIAG_H_RESP.length).forEach(r => { if (quiero.indexOf(r.v[0]) >= 0) (resp[r.v[0]] = resp[r.v[0]] || []).push({ sitio: r.v[2], item: r.v[3], resp: r.v[4], valor: r.v[5], obs: r.v[6], fotos: String(r.v[7] || '').split(' | ').filter(Boolean) }); });
  // Puntos: los activos, más los inactivos que tengan respuestas en el diagnóstico abierto o en el anterior (diagnósticos viejos)
  const usados = {}; Object.keys(resp).forEach(k => resp[k].forEach(r => usados[r.item] = true));
  const items = todosItems.filter(i => i.ACTIVO !== 'No' || usados[i.ID]);
  // Sitios provinciales del establecimiento (edificio, CAPS, dispositivos)
  const sit = pTabla_(pBC_().getSheetByName('SITIOS'), 13).filter(r => limpio_(r.v[0]) === cod && !/municipal/i.test(limpio_(r.v[9])) && !/no genera/i.test(limpio_(r.v[12]))).map(r => ({ sitio: r.v[1], oficial: r.v[2], tipo: r.v[4] }));
  let capacitacion = null; try { capacitacion = pDiagCapacitacion_(cod); } catch (e) {}
  let sugerencias = {}; try { sugerencias = diagSugerencias_(cod); } catch (e) {}
  return { ok: true, cod: cod, items: items, sugerencias: sugerencias, sitios: sit, capacitacion: capacitacion, actual: actual || null, respuestas: actual ? (resp[actual.ID_DIAG] || []) : [], previo: previo || null, respuestasPrevio: previo ? (resp[previo.ID_DIAG] || []) : [], historial: lista.map(o => ({ id: o.ID_DIAG, fecha: o.FECHA, estado: o.ESTADO, pct: o.PORCENTAJE, criticos: o.CRITICOS_NO_CUMPLE, modalidad: o.MODALIDAD })) };
}
// Puntaje por opción (ITEMS › PUNTAJES): «1|0.5|0|-» alineado con OPCIONES («-» no puntúa, p. ej. «No se sabe») · PROP: proporción de lo marcado
function pDiagPts_(it, val) {
const ops = String(it.OPCIONES || '').split('|'); val = String(val || ''); if (!val) return null;
if (it.PUNTAJES === 'PROP') { const sel = val.split('|').filter(Boolean); if (sel.indexOf('No se sabe') >= 0) return null; const base = ops.filter(o => !/^(Ninguno|No se sabe)$/.test(o)); return base.length ? sel.filter(s => base.indexOf(s) >= 0).length / base.length : null; }
const k = ops.indexOf(val), p = k < 0 ? '' : String(it.PUNTAJES).split('|')[k], n = Number(String(p).replace(',', '.'));
return p === '' || p === '-' || isNaN(n) ? null : n;
}
const pNivel_ = v => { const m = /^\s*(\d)/.exec(String(v || '')); return m ? Number(m[1]) : null; };
// Valor de un punto entre 0 y 1 (o null si no puntúa): CPN 1 / 0,5 / 0 · ESCALA nivel/6
function pDiagValor_(it, r) {
  if (!it || !r) return null;
if (it.PUNTAJES) return pDiagPts_(it, r.valor || r.resp);
  if (it.TIPO === 'CPN') return r.resp in DIAG_VALOR ? DIAG_VALOR[r.resp] : null;
  if (it.TIPO === 'ESCALA') { const n = pNivel_(r.valor); return n == null ? null : n / 6; }
  return null;
}
// ------------------------------------------------------------------ REGLAS DEL DIAGNÓSTICO (las mismas en el portal, la página de referentes y el informe)
// CONDICION (hoja ITEMS): «ID ~ A|B» (la respuesta incluye A o B) · «ID = X» · «ID != X». Varias se separan con «;» (deben cumplirse todas).
// Si el punto de referencia es del establecimiento (NIVEL E), se mira la pestaña Establecimiento; si es de sitio, el mismo sitio.
function diagAplica_(it, respuestas, sitio, porId) {
  const cond = String(it && it.CONDICION || '').trim(); if (!cond) return true;
  return cond.split(';').every(c => {
    // «LUGAR ~ Tanque|Cisterna»: solo en los lugares con alguna palabra que empiece así («LUGAR !~ …»: en los demás)
    const L = /^\s*LUGAR\s*(!~|~)\s*(.+?)\s*$/i.exec(c);
    if (L) { const pal = String(sitio || '').toLowerCase().split(/[^a-z0-9áéíóúüñ]+/), hit = L[2].split('|').some(o => { o = o.trim().toLowerCase(); return o && pal.some(w => w.indexOf(o) === 0); }); return L[1] === '~' ? hit : !hit; }
    const m = /^\s*([A-Z]{3}\d{2})\s*(~|!=|=)\s*(.+?)\s*$/.exec(c); if (!m) return true;
    const ref = porId[m[1]], s = ref && ref.NIVEL === 'S' ? (sitio || '') : '';
    const r = respuestas.find(x => x.item === m[1] && (x.sitio || '') === s), v = r ? String(r.valor || r.resp || '') : '';
    if (m[2] === '~') return m[3].split('|').some(o => v.split('|').indexOf(o.trim()) >= 0);
    if (m[2] === '=') return v === m[3];
    return v !== m[3];
  });
}
const DIAG_OBLIG = /^(CPN|ESCALA|LISTA)$/;
// Faltantes: lo previo (antes de los sitios) y lo obligatorio para cerrar o enviar
function diagFaltantes_(items, respuestas, sitios) {
  const porId = {}; items.forEach(i => porId[i.ID] = i);
  const tiene = (id, s) => respuestas.some(r => r.item === id && (r.sitio || '') === (s || '') && (r.resp || r.valor));
  const previo = items.filter(i => i.PREVIO === 'Sí' && i.NIVEL !== 'S' && !tiene(i.ID, '')).map(i => i.ITEM);
  const estab = items.filter(i => i.NIVEL !== 'S' && (DIAG_OBLIG.test(i.TIPO) || i.PREVIO === 'Sí') && diagAplica_(i, respuestas, '', porId) && !tiene(i.ID, '')).map(i => i.ITEM);
  const conSitio = (sitios || []).filter(s => respuestas.some(r => (r.sitio || '') === s && (r.resp || r.valor)));
  return { previo: previo, estab: estab, sitios: conSitio.length };
}

function pDiagCalcular_(items, respuestas) {
  const porId = {}; items.forEach(i => porId[i.ID] = i);
  respuestas = respuestas.filter(r => porId[r.item] && diagAplica_(porId[r.item], respuestas, r.sitio, porId));
  let suma = 0, pesos = 0, criticos = 0, n = 0, msn = 0, nmsn = 0; const secciones = {};
  respuestas.forEach(r => {
    const it = porId[r.item], v = pDiagValor_(it, r); if (v == null) return;
    const w = Number(it.PESO) || 1;
    suma += w * v; pesos += w; n++;
    const s = secciones[it.SECCION] = secciones[it.SECCION] || { suma: 0, pesos: 0 }; s.suma += w * v; s.pesos += w;
    if (it.CRITICO === 'Sí' && v <= 1 / 3) criticos++;
    if (it.TIPO === 'ESCALA') { msn += v * 6; nmsn++; }
  });
  const pct = pesos ? Math.round(1000 * suma / pesos) / 10 : '';
  const porSeccion = {}; Object.keys(secciones).forEach(k => porSeccion[k] = Math.round(1000 * secciones[k].suma / secciones[k].pesos) / 10);
  return { pct: pct, criticos: criticos, n: n, porSeccion: porSeccion, msn: nmsn ? Math.round(10 * msn / nmsn) / 10 : '' };
}
function pDiagGuardar_(x, red) {
  const dg = pDG_(), sh = dg.getSheetByName('DIAGNOSTICOS'), rp = dg.getSheetByName('RESPUESTAS'), hoy = new Date(), c = x.cabecera || {}, cod = limpio_(x.cod);
  const resp = (x.respuestas || []).filter(r => r.item && (r.resp || r.valor || r.obs)), usados = {}; resp.forEach(r => usados[r.item] = true);
  const items = pDiagItems_(true).filter(i => i.ACTIVO !== 'No' || usados[i.ID]);
  const calc = pDiagCalcular_(items, resp);
  let id = limpio_(x.id), fila = null;
  if (id) { const f = pTabla_(sh, 7).find(r => r.v[0] === id); if (f) { fila = f.fila; if (red && /^(Enviado|Cerrado)$/.test(f.v[6])) return { ok: false, mensaje: 'Este diagnóstico ya fue enviado a Higiene y Seguridad: no se puede modificar.' }; } }
  let estado = x.estado || (x.cerrar ? 'Cerrado' : 'Borrador'); if (DIAG_ESTADOS.indexOf(estado) < 0) estado = 'Borrador';
  if (red && estado === 'Cerrado') estado = 'Enviado';
  if (estado === 'Cerrado' || estado === 'Enviado') {
    const sitios = pTabla_(pBC_().getSheetByName('SITIOS'), 13).filter(r => limpio_(r.v[0]) === cod && !/municipal/i.test(limpio_(r.v[9])) && !/no genera/i.test(limpio_(r.v[12]))).map(r => r.v[1]);
    const f = diagFaltantes_(items, resp, sitios);
    if (f.estab.length) return { ok: false, mensaje: 'Falta completar en la pestaña Establecimiento ' + f.estab.length + ' punto(s), por ejemplo: «' + f.estab.slice(0, 3).join('», «') + '».' };
    if (!f.sitios && items.some(i => i.NIVEL === 'S')) return { ok: false, mensaje: 'Falta relevar al menos un lugar (el edificio, un CAPS o un dispositivo).' };
  }
  if (!fila) { id = 'DR-' + cod.replace(/\s+/g, '').toUpperCase().slice(0, 8) + '-' + Utilities.formatDate(hoy, TZ, 'yyyyMMdd-HHmmss'); }
  const cab = [id, cod, c.FECHA || Utilities.formatDate(hoy, TZ, 'yyyy-MM-dd'), c.MODALIDAD || 'Visita', c.RELEVADO_POR || 'Belén Pellegrini', c.ENTREVISTADO || '', estado, calc.pct, calc.criticos, calc.n, c.OBSERVACIONES || '', hoy, calc.msn];
  if (fila) sh.getRange(fila, 1, 1, cab.length).setValues([cab]);
  else sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, 1, cab.length).setValues([cab]);
  // Respuestas: se reemplazan las del diagnóstico (quedan en un bloque al final)
  const todas = pTabla_(rp, 1).filter(r => r.v[0] === id).map(r => r.fila).sort((a, b) => a - b);
  if (todas.length && todas[todas.length - 1] - todas[0] + 1 === todas.length) rp.deleteRows(todas[0], todas.length);   // bloque continuo: de una vez
  else todas.reverse().forEach(f => rp.deleteRow(f));
  if (resp.length) rp.getRange(Math.max(rp.getLastRow(), 5) + 1, 1, resp.length, DIAG_H_RESP.length).setValues(resp.map(r => [id, cod, r.sitio || '', r.item, r.resp || '', r.valor || '', r.obs || '', (r.fotos || []).join(' | ')]));
  CacheService.getScriptCache().removeAll(['p_resumen', 'diag_tablero']);
  // Al cerrar: el perfil completa la categoría y los módulos del establecimiento en la BASE COMÚN
  let perfil = null; if (estado === 'Cerrado') { try { perfil = diagPerfilABase_(cod, resp); } catch (e) { perfil = { error: String(e.message || e) }; } }
  return { ok: true, id: id, pct: calc.pct, criticos: calc.criticos, n: calc.n, porSeccion: calc.porSeccion, msn: calc.msn, estado: cab[6], perfil: perfil };
}

// ------------------------------------------------------------------ FOTOS
// Se guardan en la carpeta del establecimiento › «Diagnóstico de residuos» › ID del diagnóstico.
function pDiagFoto_(x) {
  const E = est_(limpio_(x.cod)); if (!E || !E.carpeta) return { ok: false, mensaje: 'El establecimiento no tiene carpeta.' };
  if (!x.id) return { ok: false, mensaje: 'Guardá el borrador antes de agregar fotos.' };
  const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(String(x.dataUrl || '')); if (!m) return { ok: false, mensaje: 'La foto no es válida.' };
  const raiz = carpeta_(carpeta_(DriveApp.getFolderById(E.carpeta), 'Diagnóstico de residuos'), x.id);
  const nombre = [(x.sitio || x.cod), x.item, Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss')].join(' - ').replace(/[^\w\-.áéíóúñÁÉÍÓÚÑ ]/g, '_') + '.jpg';
  const f = raiz.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre));
  return { ok: true, url: f.getUrl() };
}

// ------------------------------------------------------------------ ACCESO DE LOS REFERENTES (página diagnostico.html)
// Con la clave del establecimiento: ven y completan solo el diagnóstico de su establecimiento.
// Pueden guardar las veces que quieran y, al terminar, «Enviar a Higiene y Seguridad». Belén lo revisa y lo cierra en el portal.
function diagRed_(d) {
  const x = d.datos || {}; x.cod = d.est;
  if (!PropertiesService.getScriptProperties().getProperty('DIAG_RES_ID')) return { ok: false, mensaje: 'El diagnóstico todavía no está habilitado.' };
  if (d.accion === 'd_abrir') { const r = pDiagAbrir_(d.est, ''); r.nombre = est_(d.est).nombre; delete r.previo; delete r.respuestasPrevio; return r; }
  if (d.accion === 'd_guardar') { if (!x.cabecera) x.cabecera = {}; x.cabecera.MODALIDAD = 'Referente (en línea)'; return conLock_(() => pDiagGuardar_(x, true)); }
  if (d.accion === 'd_foto') return pDiagFoto_(x);
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ TABLERO · MATRIZ DE 4 CUADRANTES
// Hallazgo: CPN «No cumple» (gravedad 1) o «Parcial» (0,5); ESCALA con nivel 3 o menos (gravedad 1 − nivel/6).
// Urgente: URGENCIA 3, o 2 con gravedad completa. Importante: IMPORTANCIA 3, o 2 con gravedad completa.
// Q1 Actuar ya (urgente e importante) · Q2 Planificar (importante) · Q3 Resolver rápido (urgente) · Q4 Monitorear.
function pDiagCuadrante_(it, grav) {
  const u = Number(it.URGENCIA) || 1, i = Number(it.IMPORTANCIA) || 1;
  const urg = u >= 3 || (u === 2 && grav >= 1), imp = i >= 3 || (i === 2 && grav >= 1);
  return urg && imp ? 'Q1' : imp ? 'Q2' : urg ? 'Q3' : 'Q4';
}
function pDiagTablero_() {
  const c = CacheService.getScriptCache(), k = c.get('diag_tablero'); if (k) return JSON.parse(k);
  const dg = pDG_(), items = pDiagItems_(true), porId = {}; items.forEach(i => porId[i.ID] = i);
  const ult = pDiagLista_(), ids = {}; Object.keys(ult).forEach(cod => ids[ult[cod].ID_DIAG] = cod);
  const E = pEstablecimientos_(), nombres = {}, areas = {}; E.filas.forEach(f => { nombres[limpio_(f.v[0])] = f.v[1]; areas[limpio_(f.v[0])] = f.v[4]; });
  const hall = [], porEst = {}, l8 = { poe: {}, vacuna: {}, capac: {}, formacion: {} }, cierre = {};
  pTabla_(dg.getSheetByName('RESPUESTAS'), DIAG_H_RESP.length).forEach(r => {
    const cod = ids[r.v[0]]; if (!cod) return;
    const it = porId[r.v[3]]; if (!it) return;
    const resp = { resp: r.v[4], valor: r.v[5] };
    // Línea 8
    if (it.ID === 'PER05') l8.poe[cod] = r.v[5];
    if (it.ID === 'PER02') l8.vacuna[cod] = r.v[5];
    if (it.ID === 'PER06') l8.capac[cod] = r.v[4];
    if (it.ID === 'PER07') String(r.v[5] || '').split('|').filter(Boolean).forEach(x => l8.formacion[x] = (l8.formacion[x] || 0) + 1);
    if (/^CIE0[123]$/.test(it.ID)) { const m = cierre[it.ID] = cierre[it.ID] || {}; String(r.v[5] || '').split('|').filter(Boolean).forEach(x => m[x] = (m[x] || 0) + 1); }
    const v = pDiagValor_(it, resp); if (v == null) return;
    const grav = it.TIPO === 'CPN' ? (resp.resp === 'No cumple' ? 1 : resp.resp === 'Parcial' ? 0.5 : 0) : it.TIPO === 'ESCALA' ? (pNivel_(resp.valor) <= 3 ? 1 - v : 0) : 1 - v;
    if (!grav) return;
    const q = pDiagCuadrante_(it, grav >= 1 || (it.TIPO === 'ESCALA' && pNivel_(resp.valor) <= 2) ? 1 : grav);
    hall.push({ cod: cod, sitio: r.v[2], id: it.ID, item: it.ITEM, seccion: it.SECCION, resp: it.TIPO === 'CPN' ? r.v[4] : r.v[5], obs: r.v[6], fotos: String(r.v[7] || '').split(' | ').filter(Boolean), q: q, grav: grav, critico: it.CRITICO === 'Sí', meta: it.META_L8 });
    const p = porEst[cod] = porEst[cod] || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }; p[q]++;
  });
  const est = Object.keys(ult).map(cod => ({ cod: cod, nombre: nombres[cod] || cod, area: areas[cod] || '', fecha: ult[cod].FECHA, estado: ult[cod].ESTADO, pct: ult[cod].PORCENTAJE, msn: ult[cod].MATRIZ_MSN, criticos: ult[cod].CRITICOS_NO_CUMPLE, q: porEst[cod] || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } }));
  const n = est.length, cuenta = (m, f) => Object.keys(m).filter(k => f(m[k])).length;
  // Meta 6 con el registro de capacitaciones (todos los establecimientos, no solo los diagnosticados)
  let regAct = 0, regCap = 0, regLim = 0, regLimCap = 0;
  try { const bt = pBT_(); E.filas.forEach(f => { const r = pDiagCapacitacion_(limpio_(f.v[0]), bt); if (!r) return; regAct += r.activos; regCap += r.capacitados; regLim += r.limpieza; regLimCap += r.limpiezaCap; const e = est.find(x => x.cod === limpio_(f.v[0])); if (e) e.cap = r; }); } catch (e) {}
  const out = { ok: true, establecimientos: est, hallazgos: hall, totalEstablecimientos: E.filas.length, cierre: cierre,
    l8: { evaluados: n, poeTodos: cuenta(l8.poe, v => v === 'Todos'), poeResp: Object.keys(l8.poe).length, vacunaCompleta: cuenta(l8.vacuna, v => v === 'Cobertura completa'), vacunaResp: Object.keys(l8.vacuna).length,
      capacitados: cuenta(l8.capac, v => v === 'Cumple'), capacResp: Object.keys(l8.capac).length, formacion: l8.formacion,
      registro: { activos: regAct, capacitados: regCap, limpieza: regLim, limpiezaCap: regLimCap } },
    actualizado: new Date().toISOString() };
  try { c.put('diag_tablero', JSON.stringify(out), 1800); } catch (e) {}
  return out;
}
// Tablero también en la planilla (para trabajar sin portal): hojas TABLERO y HALLAZGOS del libro del diagnóstico
function generarTableroDiagnostico() {
  CacheService.getScriptCache().remove('diag_tablero');
  const T = pDiagTablero_(), ss = pDG_(), Q = { Q1: 'Actuar ya', Q2: 'Planificar', Q3: 'Resolver rápido', Q4: 'Monitorear' };
  let t = ss.getSheetByName('TABLERO'); if (!t) t = ss.insertSheet('TABLERO', 1);
  encabezar_(t, 'Tablero del diagnóstico de residuos', 'Último diagnóstico de cada establecimiento. Se actualiza solo cada 30 minutos. Cuadrantes: Q1 actuar ya · Q2 planificar · Q3 resolver rápido · Q4 monitorear.',
    ['CODIGO', 'ESTABLECIMIENTO', 'AREA', 'FECHA', 'ESTADO', 'RESULTADO_%', 'MATRIZ_MSN_0_6', 'CRITICOS', 'Q1_ACTUAR_YA', 'Q2_PLANIFICAR', 'Q3_RESOLVER_RAPIDO', 'Q4_MONITOREAR']);
  const filas = T.establecimientos.sort((a, b) => b.q.Q1 - a.q.Q1 || (a.pct || 0) - (b.pct || 0)).map(e => [e.cod, e.nombre, e.area, e.fecha, e.estado, e.pct, e.msn, e.criticos, e.q.Q1, e.q.Q2, e.q.Q3, e.q.Q4]);
  if (filas.length) t.getRange(6, 1, filas.length, 12).setValues(filas);
  let h = ss.getSheetByName('HALLAZGOS'); if (!h) h = ss.insertSheet('HALLAZGOS', 2);
  encabezar_(h, 'Hallazgos', 'Un problema por fila, ordenados por cuadrante. Usá el filtro para ver un establecimiento.', ['CUADRANTE', 'PRIORIDAD', 'CODIGO', 'SITIO', 'SECCION', 'PUNTO', 'RESPUESTA', 'OBSERVACION', 'CRITICO', 'META_L8', 'FOTOS']);
  const hs = T.hallazgos.sort((a, b) => a.q.localeCompare(b.q) || b.grav - a.grav).map(x => [x.q, Q[x.q], x.cod, x.sitio, x.seccion, x.item, x.resp, x.obs, x.critico ? 'Sí' : '', x.meta, x.fotos.join(' | ')]);
  if (hs.length) h.getRange(6, 1, hs.length, 11).setValues(hs);
  if (!h.getFilter() && hs.length) h.getRange(5, 1, hs.length + 1, 11).createFilter();
  Logger.log('Tablero: ' + filas.length + ' establecimientos, ' + hs.length + ' hallazgos.');
}

// ------------------------------------------------------------------ CAPACITACIÓN EN RESIDUOS (cruce con el registro de capacitaciones)
// Personal activo del establecimiento (base de trabajadores) con al menos una capacitación de residuos en los últimos 12 meses.
// Se cuenta aparte el personal de limpieza, maestranza y servicios generales (quienes manipulan los residuos).
const DIAG_TEMA_RES = /residuo|descarte|cortopunz|biopatog|manifiesto/i;
const DIAG_LIMPIEZA = /maestranz|limpieza|mucam|servicios generales|ordenanza|camiller|lavader/i;
function pFechaISO_(f) {
  const s = String(f || ''); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return s.slice(0, 10);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
function pDiagCapResiduos_() {   // DNI → fecha de la última capacitación de residuos (en caché 6 h)
  const c = CacheService.getScriptCache(), k = c.get('caps_res'); if (k) return JSON.parse(k);
  const m = {};
  pCapsLeer_().forEach(x => {
    if (!x.dni || !DIAG_TEMA_RES.test(x.tema)) return;
    if (/^no$/i.test(x.aprobo)) return;   // evaluaciones desaprobadas no cuentan
    const f = pFechaISO_(x.fecha); if (!m[x.dni] || f > m[x.dni]) m[x.dni] = f || '0000-00-00';
  });
  try { c.put('caps_res', JSON.stringify(m), 21600); } catch (e) {}
  return m;
}
// Capacitación del personal del establecimiento: se guarda 3 horas (14.22); cambia con el cruce nocturno de capacitaciones
function pDiagCapacitacion_(cod, bt) {
  if (bt) return pDiagCapacitacionCalc_(cod, bt);
  const c = CacheService.getScriptCache(), k = 'diag_cap_' + limpio_(cod); try { const v = c.get(k); if (v) return JSON.parse(v); } catch (e) {}
  const o = pDiagCapacitacionCalc_(cod); try { c.put(k, JSON.stringify(o), 10800); } catch (e) {} return o;
}
function pDiagCapacitacionCalc_(cod, bt) {
  const sh = (bt || pBT_()).getSheetByName(limpio_(cod)); if (!sh) return null;
  const cap = pDiagCapResiduos_(), desde = Utilities.formatDate(new Date(Date.now() - 365 * 864e5), TZ, 'yyyy-MM-dd');
  const act = pFilasTrab_(sh).map(f => f.v).filter(v => v[19] === 'Activo' || v[19] === '');
  const ok = v => { const f = cap[pDni_(v[1])]; return !!f && f >= desde; };
  const lim = act.filter(v => DIAG_LIMPIEZA.test([v[5], v[6], v[7]].join(' ')));
  const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : '';
  const res = { activos: act.length, capacitados: act.filter(ok).length, limpieza: lim.length, limpiezaCap: lim.filter(ok).length, alguna: act.filter(v => cap[pDni_(v[1])]).length };
  res.pct = pct(res.capacitados, res.activos); res.pctLimpieza = pct(res.limpiezaCap, res.limpieza);
  // Sugerencia para el punto PER06 (personal de residuos capacitado en el último año)
  const base = res.limpieza ? res.pctLimpieza : res.pct;
  res.sugerencia = base === '' ? '' : base >= 70 ? 'Cumple' : base > 0 ? 'Parcial' : 'No cumple';
  return res;
}


// ------------------------------------------------------------------ DIAGNÓSTICO BASE POR CATEGORÍA (versión 10)
const DIAG_CAT_TXT = { 1: '1 · Puesto sanitario', 2: '2 · Ambulatorio (CAPS y dispositivos)', 3: '3 · Hospital rural', 4: '4 · Hospital subzonal', 5: '5 · Hospital zonal o regional' };
const DIAG_SERV_MOD = { 'Internación': 'INT', 'Quirófano': 'QX', 'Sala de partos': 'QX', 'Laboratorio': 'LAB', 'Anatomía patológica': 'AP', 'Oncología o citostáticos': 'CIT', 'Odontología': 'ODO', 'Rayos con revelado químico': 'RX' };

// Respuesta sugerida para la categoría (PRF01), desde la BASE COMÚN o la tipología REFES
function diagSugerencias_(cod) {
  const P = audPerfiles_(cod).Establecimiento; return { PRF01: DIAG_CAT_TXT[P.cat] || '' };
}

// Perfil cerrado → ESTABLECIMIENTOS › CATEGORIA_AUDITORIA y MODULOS (y una línea en el HISTORIAL)
function diagPerfilABase_(cod, resp) {
  const v = id => { const r = resp.find(x => x.item === id && !(x.sitio || '')); return r ? String(r.valor || r.resp || '').trim() : ''; };
  if (!v('PRF01')) return null;   // diagnóstico sin perfil (versión anterior): no toca nada
  if (typeof audCacheRenovar_ === 'function') audCacheRenovar_();   // el perfil cambia: se renuevan los perfiles guardados (14.22)
  let cat = parseInt(v('PRF01'), 10) || 2;
  const habil = v('PRF02'), uso = v('PRF03');
  if (cat >= 3 && habil !== '' && Number(habil) === 0) cat = 2;   // sin camas habilitadas: ambulatorio
  const m = {};
  v('PRF04').split('|').forEach(s => { if (DIAG_SERV_MOD[s.trim()]) m[DIAG_SERV_MOD[s.trim()]] = 1; });
  if (cat >= 3 && (uso === '' || Number(uso) > 0)) m.INT = 1; else delete m.INT;
  if (/^(Local exclusivo|Contenedor exterior)/.test(v('PRF08'))) m.DEP = 1;
  if (v('PRF09') === 'Sí') m.FRIO = 1;
  if (/^Más de/.test(v('PRF13'))) m.TRAS = 1;
  if (v('PRF14') && !/^Ninguna$/.test(v('PRF14'))) m.EXT = 1;
  if (/^El propio/.test(v('PRF15')) || /^Propia/.test(v('LEG01'))) m.GEN = 1;
if (resp.some(x => x.item === 'ACO09' && /^(Depósito exclusivo|Contenedor exterior)/.test(String(x.valor || x.resp || '')))) m.DEP = 1; // línea de base (por lugar)
  const mods = AUD_MODS.filter(k => m[k]).join(', ') || 'Ninguno';
  const ss = pBC_(), sh = ss.getSheetByName('ESTABLECIMIENTOS');
  let H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  ['CATEGORIA_AUDITORIA', 'MODULOS'].forEach(c => { if (H.indexOf(c) < 0) { sh.getRange(5, H.length + 1).setValue(c); H.push(c); } });
  const f = pTabla_(sh, 1).find(r => limpio_(r.v[0]) === limpio_(cod)); if (!f) return { categoria: cat, modulos: mods, aviso: 'No encontré el establecimiento en ESTABLECIMIENTOS.' };
  const cC = sh.getRange(f.fila, H.indexOf('CATEGORIA_AUDITORIA') + 1), cM = sh.getRange(f.fila, H.indexOf('MODULOS') + 1), antes = cC.getValue() + ' · ' + cM.getValue();
  cC.setValue(cat); cM.setValue(mods);
  try { pHistorial_(ss, [[new Date(), 'ESTABLECIMIENTOS', limpio_(cod), 'CATEGORIA_AUDITORIA · MODULOS', antes, cat + ' · ' + mods, 'Diagnóstico base']]); } catch (e) {}
  const aviso = /otro establecimiento/i.test(v('PRF08') + ' ' + v('PRF12') + ' ' + resp.filter(x => x.item === 'ACO10').map(x => x.valor || '').join(' ')) ? 'Los residuos se llevan a otro establecimiento: está prohibido (G7, no conformidad mayor). Solo retira la empresa habilitada, en el lugar.' : '';
  return { categoria: cat, modulos: mods, aviso: aviso };
}

// Relevamiento inicial: crea la auditoría «De campo» de la categoría, con todos los lugares y todos los ejes
function diagRelevamientoInicial_(x) {
  // Una auditoría por lugar. Solo los lugares propios del establecimiento (HMH no toma los CAPS del HZT aunque compartan matriz).
  // Se puede pedir de nuevo sin duplicar: saltea los lugares que ya tienen su auditoría de este diagnóstico, y corta antes del límite de tiempo.
  const cod = limpio_(x.cod), P = audPerfiles_(cod), G = nteGrupo_(cod), t0 = Date.now(), marca = x.idDiag ? 'Relevamiento inicial del diagnóstico ' + x.idDiag : '';
  const duenoDe = l => l === 'Establecimiento' ? cod : (P[l] && P[l].cod) || G.duenio;
  const sh = audHojaA_(), hechas = {}, ids = [];
  if (marca) audLeer_(sh, AUD_H).filter(a => a.ESTABLECIMIENTO === cod && a.OBSERVACIONES === marca).forEach(a => { hechas[a.LUGARES] = 1; ids.push(a.ID_AUD); });
  const faltan = audLugares_(cod).filter(l => duenoDe(l) === cod && !hechas[l]);
  let puntos = 0, err = null, n = 0;
  for (const l of faltan) {
    if (Date.now() - t0 > 80000) break;
    const r = audCrear_({ cod: cod, tipo: 'De campo', origen: 'Diagnóstico base', lugares: [l], ejes: [], soloCorta: false,
      fecha: x.fecha || audHoy_(), auditor: x.auditor || 'Belén Pellegrini', auditados: x.auditados || '', modalidad: x.modalidad || 'Presencial' });
    if (!r.ok) { err = r; break; }
    n++; ids.push(r.id); puntos += r.puntos || 0;
    if (marca) { const A = audLeer_(sh, AUD_H).find(a => a.ID_AUD === r.id); if (A) audSet_(sh, A.fila, { OBSERVACIONES: marca }); }
  }
  if (!ids.length) return err || { ok: false, mensaje: 'No hay lugares para relevar.' };
  const resto = faltan.length - n;
  return { ok: true, id: ids[0], ids: ids, puntos: puntos, pendientes: resto,
    mensaje: err ? err.mensaje : resto ? 'Faltan ' + resto + ' lugares: volvé a pedir el relevamiento inicial para completarlos.' : '' };
}

// Instalación (una vez): agrega a ITEMS el perfil de DIAG_BASE_PROPUESTA y deja inactivas la matriz nacional (MAT) y las secciones de campo B a K.
// No borra nada. Los diagnósticos ya hechos se siguen viendo con sus puntos.
function instalarDiagnosticoBase() {
  const dg = pDG_(), it = dg.getSheetByName('ITEMS'), pr = dg.getSheetByName('DIAG_BASE_PROPUESTA');
  if (!pr) { Logger.log('No encontré la hoja DIAG_BASE_PROPUESTA.'); return; }
  const HP = pr.getRange(5, 1, 1, pr.getLastColumn()).getValues()[0].map(String), g = (r, c) => audF_(r.v[HP.indexOf(c)]);
  const ex = {}; pTabla_(it, DIAG_H_ITEMS.length).forEach(r => ex[String(r.v[0])] = { fila: r.fila, nivel: r.v[4] });
  const cond345 = 'PRF01 ~ ' + [3, 4, 5].map(c => DIAG_CAT_TXT[c]).join('|');
  const nuevas = [];
  pTabla_(pr, HP.length).forEach(r => {
    const id = g(r, 'ID'), orig = g(r, 'ORIGEN'); if (!/^PRF\d\d$/.test(id) || ex[id]) return;
    if (orig && ex[orig] && ex[orig].nivel !== 'S') return;   // ya existe con otro código (GEN, PER): se usa el existente
    const cats = g(r, 'CATEGORIAS').replace(/^'/, ''), o = { ID: id, SECCION: '0 · Datos del establecimiento', ITEM: g(r, 'ITEM'), AYUDA: g(r, 'AYUDA'), NIVEL: 'E', TIPO: g(r, 'TIPO'),
      OPCIONES: g(r, 'OPCIONES'), REFERENCIA: g(r, 'REFERENCIA'), ACTIVO: 'Sí', CONDICION: cats === '3,4,5' ? cond345 : '', PREVIO: id === 'PRF01' ? 'Sí' : '' };
    nuevas.push(DIAG_H_ITEMS.map(h => o[h] == null ? '' : o[h]));
  });
  if (nuevas.length) it.getRange(Math.max(it.getLastRow(), 5) + 1, 1, nuevas.length, DIAG_H_ITEMS.length).setValues(nuevas);
  // Inactivos: matriz nacional y secciones de campo (pasan a la auditoría de la categoría)
  const jA = DIAG_H_ITEMS.indexOf('ACTIVO') + 1; let n = 0;
  pTabla_(it, DIAG_H_ITEMS.length).forEach(r => { if (/^(MAT|BOL|TAC|COR|LIM|SEN|CAR|DIN|DFI|QUI|RSU)\d\d$/.test(String(r.v[0])) && r.v[jA - 1] !== 'No') { it.getRange(r.fila, jA).setValue('No'); n++; } });
  const g2 = ex.GEN02; if (g2) it.getRange(g2.fila, DIAG_H_ITEMS.indexOf('AYUDA') + 1).setValue('Define el tiempo que se precarga en la observación de acopio de la auditoría: pequeño 30 días (máx. 20 kg), mediano 72 h, grande 48 h. A confirmar con el anexo oficial de la Res. MSN 134/2016.');
  CacheService.getScriptCache().removeAll(['p_resumen', 'diag_tablero']);
  const msg = 'Perfil agregado: ' + nuevas.length + ' puntos · puntos que pasan a inactivos: ' + n + '.';
  Logger.log(msg); return msg;
}