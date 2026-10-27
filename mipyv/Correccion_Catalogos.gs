/**
 * CORRECCIÓN DE CATÁLOGOS — datos reales del POE 2023 (rescatados de la
 * planilla "MIP RED TRELEW") que no se habían incorporado a la base nueva.
 *
 * Ejecutar UNA VEZ desde el editor de Apps Script:
 * seleccionar "corregirCatalogosMIPyV" en el desplegable de arriba > Ejecutar.
 *
 * Qué hace:
 *  - Vacía y vuelve a escribir por completo las hojas: productos, plagas,
 *    dosis_frecuencia — con los datos reales validados en el POE 2023 y el
 *    historial de intervenciones, en vez de los datos de ejemplo anteriores.
 *  - Corrige el error de tipeo detectado: Brodifacoum 5% → 0,005%
 *    (coincide con la HDS real de Panic y con el estándar de mercado).
 *  - No toca hallazgos, visitas, establecimientos, sectores,
 *    trabajos_saneamiento ni avances_saneamiento.
 */
function corregirCatalogosMIPyV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  escribirProductos(ss);
  escribirPlagas(ss);
  escribirDosisFrecuencia(ss);
  SpreadsheetApp.getUi().alert("Listo: productos, plagas y dosis_frecuencia actualizados con los datos reales del POE 2023.");
}

function limpiarYEscribir(ss, nombreHoja, headers, filas) {
  let sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) sheet = ss.insertSheet(nombreHoja);
  sheet.clear();
  const todo = [headers, ...filas];
  sheet.getRange(1, 1, todo.length, headers.length).setValues(todo);
  sheet.setFrozenRows(1);
}

function escribirProductos(ss) {
  const headers = ["id_producto","nombre_comercial","principio_activo","tipo","uso_objetivo","dosis_voladores","dosis_rastreros","hds_disponible","link_hds","fuente","estado"];
  const filas = [
    ["PRD-01","Panic","Brodifacoum 0,005%","Raticida (anticoagulante)","Roedores","No aplica","Colocación en cebaderas y trampas rodenticidas","SI","Panic fds.pdf","HDS en carpeta","Activo"],
    ["PRD-02","Sipertrin","ß-cipermetrina 50 g/l","Insecticida piretroide","Insectos voladores y rastreros","75-100 ml cada 5 L de agua","100-150 ml cada 5 L de agua","SI","DS-SIPERTRIN.pdf","HDS en carpeta","Activo"],
    ["PRD-03","Keeptrin","Cipermetrina 2% p/v","Insecticida piretroide","Insectos voladores y rastreros","75-100 ml cada 5 L de agua","100-150 ml cada 5 L de agua","SI","Keeptrin-HDS.pdf","HDS en carpeta","Activo"],
    ["PRD-04","Tacazo","Alfacipermetrina 2,92% + flufenoxuron 2,92%","Insecticida piretroide + regulador de crecimiento","Insectos rastreros","No aplica","Según indicación de etiqueta","SI","Tacazo_SDS_GEN_AR_es_4-0.pdf","HDS en carpeta","Activo"],
    ["PRD-05","Glacoxan H","Imidacloprid 0,25%","Hormiguicida (polvo)","Hormigas","No aplica","Aplicación puntual en trayectorias","SI","Glacoxan H.pdf","HDS en carpeta","Activo"],
    ["PRD-06","K-Othrina o similar","Deltametrina 0,75% floable","Insecticida piretroide","Insectos voladores y rastreros","75-100 ml cada 5 L de agua","100-150 ml cada 5 L de agua","NO — sin HDS propia, equivalente a Sipertrin/Keeptrin","","POE 2023","Activo"],
    ["PRD-07","Huagro Chipre o similar","Cipermetrina 25%","Insecticida piretroide","Insectos voladores y rastreros","10 ml cada 5 L de agua","20 ml cada 5 L de agua","NO — sin HDS propia, equivalente a Sipertrin/Keeptrin","","POE 2023","Activo"],
    ["PRD-08","Aquiles o similar","Imidacloprid 2,15%","Cebo en gel","Cucarachas","No aplica","Aplicación puntual en sitios estratégicos","NO — sin HDS propia","","POE 2023","Activo"],
    ["PRD-09","Geltex o similar (Gel hormiguicida)","Imidacloprid 0,03%","Cebo en gel","Hormigas","No aplica","Aplicación puntual en trayectorias y puntos de ingreso","NO — sin HDS propia, equivalente a Glacoxan H","","POE 2023 + uso de campo","Activo"],
    ["PRD-10","Chemoxane F / FumiXan Pro o similar","No especificado en el POE","Fumígeno","Chinches y pulgas","No aplica","Aplicación en ambiente cerrado según fabricante","NO — sin HDS propia","","POE 2023","Activo"],
    ["PRD-11","Ultra Plus o similar (Biorat pellet)","Brodifacoum 0,005% — CORREGIDO (POE decía 5%, error de tipeo)","Rodenticida","Roedores","No aplica","Colocación en cebaderas o puntos protegidos","NO — sin HDS propia, equivalente a Panic","","POE 2023 + uso de campo (corregido)","Activo"],
    ["PRD-12","Huagro Rat o similar","Bromadiolone 0,005%","Rodenticida","Roedores","No aplica","Colocación en cebaderas o puntos protegidos","NO — sin HDS propia","","POE 2023","Activo"],
    ["PRD-13","Exclusión física / control físico","No aplica (no químico)","Control físico","Palomas y murciélagos","No aplica","Sellado de ingresos y barreras físicas","NO — no aplica, no es biocida","","POE 2023","Activo"],
  ];
  limpiarYEscribir(ss, "productos", headers, filas);
}

function escribirPlagas(ss) {
  const headers = ["id_plaga","nombre_plaga","clasificacion_sanitaria","importancia_sanitaria","implica_eno","evento_asociado","mantenimiento_habitual","limpieza_posterior","cuidados_cebos_trampas","que_no_hacer","cuando_avisar_hys","epp_obligatorio"];
  const filas = [
    ["PLA-01","Araña de rincón","Arácnido","Mordedura con veneno citotóxico que puede producir lesiones cutáneas graves y necrosis","Sí","Loxoscelismo","Mantener orden, limpieza y revisión de grietas, rincones y mobiliario","Realizar limpieza habitual sin remover el producto hasta cumplido el tiempo de seguridad","Evitar contacto con superficies tratadas hasta ventilación","No introducir la mano en grietas ni detrás de muebles sin revisión","Si se observan ejemplares, telas o actividad compatible","Guantes, máscara, antiparras"],
    ["PLA-02","Viuda negra","Arácnido","Mordedura neurotóxica con compromiso sistémico","Sí","Latrodectismo","Mantener limpieza de depósitos, exteriores y sectores secos","Realizar limpieza respetando tiempo de seguridad","No limpiar inmediatamente superficies tratadas","No tocar arañas ni elementos sin revisión","Ante hallazgo de ejemplares o telas","Guantes, máscara, antiparras"],
    ["PLA-03","Cucarachas","Insecto rastrero","Vector mecánico de bacterias y contaminación de alimentos","No","No aplica","Mantener limpieza estricta y control de humedad","Limpiar evitando remover producto aplicado","No mojar ni limpiar directamente sobre el punto tratado","No aplicar detergentes sobre el producto ni dejar alimentos expuestos","Si reaparecen insectos o actividad nocturna","Guantes"],
    ["PLA-04","Roedores","Mamífero sinantrópico","Riesgo de zoonosis y contaminación","Evaluar según situación epidemiológica","Hantavirus / Leptospirosis","Mantener orden, eliminar refugios y sellar accesos","Limpiar sin mover cebaderas ni trampas","No tocar cebos ni desplazarlos","No tocar cebos. No manipular roedores muertos sin EPP","Ante heces, ruidos, roeduras o ejemplares","Guantes + protección respiratoria (según evaluación de riesgo biológico)"],
    ["PLA-05","Moscas","Insecto volador","Vector mecánico de bacterias","No","No aplica","Mantener residuos cerrados y limpieza frecuente","Limpiar luego de ventilación","Evitar limpiar inmediatamente superficies tratadas","No ingresar sin ventilación ni dejar residuos expuestos","Si persiste actividad","Guantes, máscara"],
    ["PLA-06","Mosquitos","Insecto volador","Vector de enfermedades por picadura","Sí","Dengue / Zika / Chikungunya","Evitar agua estancada","Limpiar luego de ventilación","No lavar inmediatamente superficies tratadas","No dejar recipientes con agua","Si se detectan criaderos","Guantes, máscara, antiparras"],
    ["PLA-07","Palomas","Ave urbana","Riesgo respiratorio por excretas","Evaluar según situación epidemiológica","Histoplasmosis / Criptococosis","Mantener limpieza y evitar nidificación","Limpieza húmeda con protección respiratoria","No retirar dispositivos de control","No barrer en seco ni retirar nidos sin evaluación","Ante acumulación de heces o nidos","Guantes, protección respiratoria"],
    ["PLA-08","Piojillo de paloma","Ectoparásito","Dermatitis por infestación","No","Dermatitis por ectoparásitos","Control de nidos y limpieza","Limpieza húmeda posterior","Evitar contacto con zonas infestadas","No manipular sin protección","Ante reaparición","Guantes, máscara"],
    ["PLA-09","Chinche de cama","Insecto rastrero","Infestación en áreas de descanso","No","Dermatitis","Mantener limpieza de textiles","Ventilar antes de limpiar","Respetar tiempo de seguridad","No manipular colchones recién tratados","Ante picaduras o manchas","Guantes, máscara, antiparras"],
    ["PLA-10","Murciélagos","Quiróptero","Riesgo de rabia ante contacto","Sí (condicionado a exposición)","Rabia / APR","Mantener cerramientos","Limpieza con humectación y protección respiratoria","No manipular ejemplares","No capturar ni bloquear salidas","Ante presencia o contacto","Guantes, máscara con filtro"],
    ["PLA-11","Tijeretas","Insecto rastrero","Asociadas a humedad","No","No aplica","Control de humedad y limpieza","Limpieza normal","Evitar contacto con superficies tratadas","No manipular sin protección","Si reaparecen","Guantes, gafas"],
    ["PLA-12","Hormigas","Insecto rastrero","Contaminación indirecta de alimentos","No","No aplica","Mantener limpieza y control de trayectorias","Limpiar sin remover producto","No mojar puntos tratados","No aplicar agua o desinfectantes sobre el producto","Si reaparecen trayectorias","Guantes, máscara"],
  ];
  limpiarYEscribir(ss, "plagas", headers, filas);
}

function escribirDosisFrecuencia(ss) {
  const headers = ["id_plaga","nombre_plaga","id_producto","nombre_producto","dosis_estandar","frecuencia_estandar","puntos_criticos_sugeridos"];
  const filas = [
    ["PLA-01","Araña de rincón","PRD-02","Sipertrin","100-150 ml cada 5 L de agua","Según necesidad","Rincones, grietas, detrás de mobiliario"],
    ["PLA-02","Viuda negra","PRD-02","Sipertrin","100-150 ml cada 5 L de agua","Según necesidad","Depósitos, exteriores, cañerías, rincones oscuros y secos"],
    ["PLA-03","Cucarachas","PRD-08","Aquiles o similar","Aplicación puntual en grietas, zócalos, bajo mesadas y sitios estratégicos","Según necesidad","Cocinas, zócalos, desagües, bajo mesadas, motores, grietas"],
    ["PLA-04","Roedores","PRD-01","Panic","Colocación en cebaderas y trampas rodenticidas","Cada 10 días","Depósitos, residuos, cañerías, perímetro, accesos"],
    ["PLA-05","Moscas","PRD-02","Sipertrin","75-100 ml cada 5 L de agua","Según necesidad","Residuos, patios, cocina, aberturas, lavaderos"],
    ["PLA-06","Mosquitos","PRD-02","Sipertrin","75-100 ml cada 5 L de agua","Según necesidad","Patios, desagües, recipientes, áreas húmedas"],
    ["PLA-07","Palomas","PRD-13","Exclusión física / control físico","Sellado de ingresos, barreras físicas y saneamiento","Según necesidad","Aleros, techos, cornisas, patios de aire"],
    ["PLA-08","Piojillo de paloma","PRD-02","Sipertrin","100-150 ml cada 5 L de agua","Según necesidad","Nidos, techos, cornisas, áreas próximas a palomares"],
    ["PLA-09","Chinche de cama","PRD-10","Chemoxane F / FumiXan Pro o similar","Aplicación en ambiente cerrado según fabricante y procedimiento","Según necesidad","Camas, colchones, grietas, textiles, áreas de descanso"],
    ["PLA-10","Murciélagos","PRD-13","Exclusión física / control físico","Sellado de ingresos y derivación a autoridad competente","Según necesidad","Entretechos, aleros, cámaras técnicas, cielorrasos"],
    ["PLA-11","Tijeretas","PRD-02","Sipertrin","100-150 ml cada 5 L de agua","Según necesidad","Patios, bordes, grietas, sectores húmedos"],
    ["PLA-12","Hormigas","PRD-05","Glacoxan H","Aplicación puntual en trayectorias, grietas y puntos de ingreso","Cada 10 días","Cocinas, grietas, zócalos, marcos de puertas y puntos de ingreso"],
  ];
  limpiarYEscribir(ss, "dosis_frecuencia", headers, filas);
}