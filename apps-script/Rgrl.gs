/**
 * SISTEMA HyS · MÓDULO 8 › RGRL Y MEDICIONES (Rgrl.gs) · versión 0 (14/10/2026)
 * Servicio de Higiene y Seguridad Laboral · HZT / HMH
 *
 * 1) RGRL: el Relevamiento General de Riesgos Laborales tal cual el Anexo I de la Res. SRT 463/09 (formulario A general,
 *    Dto. 351/79): datos generales del establecimiento, las 161 condiciones a cumplir (Sí · No · No aplica, fecha de
 *    regularización y normativa vigente), planillas A (agentes cancerígenos, Res. SRT 415/02), B (PCB, Res. SRT 497/03) y
 *    C (sustancias químicas a declarar, Res. SRT 743/03), gremios, contratistas y responsable del formulario.
 *    Uno por establecimiento o sitio (red Trelew y HSST); se actualiza una vez al año. Lo carga Higiene y Seguridad.
 * 2) MEDICIONES con vencimiento: puesta a tierra y continuidad de masas (Res. SRT 900/15), iluminación (Res. SRT 84/12),
 *    ruido (Res. SRT 85/12) y otras. Vencidas o que vencen en 30 días = urgentes en el tablero.
 *    Recordatorio semanal por correo (jueves 7 h) mientras haya alguna vencida o por vencer (pedido de Belén, 14/10/2026).
 *
 * Libro propio «M8 · RGRL y mediciones · Sistema HyS» en la carpeta del módulo 8 (propiedad RGRL_ID); se crea solo la primera vez.
 * Hojas (todo editable a mano): RGRL, RGRL_RESPUESTAS, RGRL_PLANILLAS, MEDICIONES, AYUDA.
 * Portal: acciones «p_rgrl_…» (desde el default de Portal.gs). Correo: prepararAvisosMediciones() crea el disparador semanal.
 * Normativa: Ley 19.587; Dto. 351/79; Res. SRT 463/09 (RGRL); Res. SRT 900/15; Res. SRT 84/12; Res. SRT 85/12; Res. SRT 905/15.
 */
const RGRL_SECCIONES = ["SERVICIO DE HIGIENE Y SEGURIDAD EN EL TRABAJO", "SERVICIO DE MEDICINA DEL TRABAJO", "HERRAMIENTAS", "MÁQUINAS", "ESPACIOS DE TRABAJO", "ERGONOMÍA", "PROTECCIÓN CONTRA INCENDIOS", "ALMACENAJE", "ALMACENAJE DE SUSTANCIAS PELIGROSAS", "SUSTANCIAS PELIGROSAS", "RIESGO ELÉCTRICO", "APARATOS SOMETIDOS A PRESIÓN", "EQUIPOS Y ELEMENTOS DE PROTECCIÓN PERSONAL ( E.P.P.)", "ILUMINACIÓN Y COLOR", "CONDICIONES HIGROTÉRMICAS", "RADIACIONES IONIZANTES", "LÁSERES", "RADIACIONES NO IONIZANTES", "PROVISIÓN DE AGUA", "DESAGÜES INDUSTRIALES", "BAÑOS, VESTUARIOS Y COMEDORES", "APARATOS PARA IZAR, MONTACARGAS Y ASCENSORES", "CAPACITACIÓN", "PRIMEROS AUXILIOS", "VEHÍCULOS", "CONTAMINACIÓN AMBIENTAL", "RUIDOS", "ULTRASONIDOS E INFRASONIDOS", "VIBRACIONES", "UTILIZACIÓN DE GASES", "SOLDADURA", "ESCALERAS", "MANTENIMIENTO PREVENTIVO DE LAS MÁQUINAS, EQUIPOS E INSTALACIONES EN GENERAL", "OTRAS RESOLUCIONES LEGALES RELACIONADAS"];
// [N.º, índice de sección, condición a cumplir, normativa vigente] · Anexo I, Res. SRT 463/09 (Dto. 351/79), texto del formulario
const RGRL_ITEMS = [
  [1, 0, "¿Dispone del Servicio de Higiene y Seguridad?", "Art. 3, Dec. 1338/96"],
  [2, 0, "¿Cumple con las horas profesionales según Decreto 1338/96?", "Dec. 1338/96"],
  [3, 0, "¿Posee documentación actualizada sobre análisis de riesgos y medidas preventivas, en los puestos de trabajo?", "Art. 10, Dec. 1338/96"],
  [4, 1, "¿Dispone del Servicio de Medicina del Trabajo?", "Art. 3, Dec. 1338/96"],
  [5, 1, "¿Posee documentación actualizada sobre acciones tales como de educación sanitaria, socorro, vacunación y estudios de ausentismo por morbilidad?", "Art. 5, Dec. 1338/96"],
  [6, 1, "¿Se realizan los exámenes periódicos?", "Res. 43/97 y 54/98 · Art. 9 a) Ley 19587"],
  [7, 2, "¿Las herramientas están en estado de conservación adecuado?", "Cap.15 Art.110 Dec. 351/79 · Art.9 b) Ley 19587"],
  [8, 2, "¿La empresa provee herramientas aptas y seguras?", "Cap. 15 Arts. 103 y110 Dec. 351/79 · Art.9 b) Ley 19587"],
  [9, 2, "¿Las herramientas corto-punzantes poseen fundas o vainas?", "Cap.15 Art.110 Dec. 351/79 · Art.9 b) Ley 19587"],
  [10, 2, "¿Existe un lugar destinado para la ubicación ordenada de las herramientas?", "Cap.15 Art.110 Dec. 351/79 · Art.9 b) Ley 19587"],
  [11, 2, "¿Las portátiles eléctricas poseen protecciones para evitar riesgos?", "Cap. 15 Arts. 103 y110 Dec. 351/79 · Art.9 b) Ley 19587"],
  [12, 2, "¿Las neumáticas e hidráulicas poseen válvulas de cierre automático al dejar de accionarla?", "Cap. 15 Arts. 103 y110 Dec. 351/79 · Art.9 b) Ley 19587"],
  [13, 3, "¿Tienen todas las máquinas y herramientas, protecciones para evitar riesgos al trabajador?", "Cap. 15 Arts. 103, 104,105, 106,107 y110 Dec. 351/79 · Art.8 b) Ley 19587"],
  [14, 3, "¿Existen dispositivos de parada de emergencia?", "Cap. 15 Arts. 103 y 104 Dec. 351/79 · Art.8 b) Ley 19587"],
  [15, 3, "¿Se han previsto sistema de bloqueo de la máquina para operaciones de mantenimiento?", "Cap. 15 Arts. 108 y 109 Dec. 351/79 · Art.8 b) Ley 19587"],
  [16, 3, "¿Tienen las máquinas eléctricas, sistema de puesta a tierra?", "Cap.14 Anexo VI Pto 3.3.1 Dec. 351/79 · Art.8 b) Ley 19587"],
  [17, 3, "¿Están identificadas conforme a normas IRAM todas las partes de máquinas y equipos que en accionamiento puedan causar daño a los trabajadores?", "Cap. 12 Arts. 77, 78 y 81- Dec. 351/79 · Art. 9 j) Ley 19587"],
  [18, 4, "¿Existe orden y limpieza en los puestos de trabajo?", "Cap. 5 Art. 42 Dec. 351/79 · Art. 8 a) y Art. 9 e) Ley 19587"],
  [19, 4, "¿Existen depósito de residuos en los puestos de trabajo?", "Cap. 5 Art. 42 Dec. 351/79 · Art.8 a) y Art.9 e) Ley 19587"],
  [20, 4, "Tienen las salientes y partes móviles de máq. y/o instalaciones, señalización y protección?", "Cap. 12 Art. 81 Dec. 351/79 · Art. 9 j) Ley 19587"],
  [21, 5, "Se desarrolla un Programa de Ergonomía Integrado para los distintos puestos de trabajo?", "Anexo I Resolución 295/03 · Art. 6 a) Ley 19587"],
  [22, 5, "Se realizan controles de ingeniería a los puestos de trabajo?", "Anexo I Resolución 295/03 · Art. 6 a) Ley 19587"],
  [23, 5, "Se realizan controles administrativos y seguimientos a los puestos de trabajo?", "Anexo I Resolución 295/03 · Art. 6 a) Ley 19587"],
  [24, 6, "¿Existen medios o vías de escape adecuadas en caso de incendio?", "Cap.12 Art. 80 y Cap. 18 Art.172 Dec. 351/79"],
  [25, 6, "¿Cuentan con estudio de carga de fuego?", "Cap.18 Art.183, Dec.351/79"],
  [26, 6, "¿La cantidad de matafuegos es acorde a la carga de fuego?", "Cap.18 Art.175 y 176 Dec. 351/79 · Art. 9 g) Ley 19587"],
  [27, 6, "¿Se registra el control de recargas y/o reparación?", "Cap.18 Art. 183 a 186 Dec.351/79"],
  [28, 6, "¿Se registra el control de prueba hidráulica de carros y/o matafuegos?", "Cap.18 Art.183 a 185, Dec.351/79"],
  [29, 6, "¿Existen sistemas de detección de incendios?", "Cap.18 Art.182, Dec.351/79"],
  [30, 6, "¿Cuentan con habilitación, los carros y/o matafuegos y demás instalac. para extinción?", "Cap. 18, Art.183, Dec 351/79"],
  [31, 6, "¿El depósito de combustibles cumple con la legislación vigente?", "Cap.18 Art.164 a 168 Dec. 351/79"],
  [32, 6, "¿Se acredita la realización periódica de simulacros de evacuación?", "Cap.18 Art.187 Dec. 351/79 · Art. 9 k) Ley 19587"],
  [33, 6, "¿Se disponen de estanterías o elem. equivalentes de material no combustible o metálico?", "Cap.18 Art.169 Dec.351/79 · Art.9 h) Ley 19587"],
  [34, 6, "¿Se separan en forma alternada, las de materiales combustibles con las no combustibles y las que puedan reaccionar entre sí?", "Cap.18 Art.169 Dec.351/79 · Art.9 h) Ley 19587"],
  [35, 7, "¿Se almacenan los productos respetando la distancia mínima de 1m entre la parte superior de las estibas y el techo?", "Cap.18 Art.169 Dec.351/79 · Art.9 h) Ley 19587"],
  [36, 7, "¿Los sistemas de almacenaje permiten una adecuada circulación y son seguros?", "Cap.5 Art. 42 y 43 Dec.351/79 · Art. 8 d) Ley 19587"],
  [37, 7, "¿En los almacenajes a granel, las estibas cuentan con elementos de contención?", "Cap.5 Art. 42 y 43 Dec.351/79 · Art. 8 d) Ley 19587"],
  [38, 8, "¿Se encuentran separados los productos incompatibles?", "Cap. 17 Art.145 Dec. 351/79 · Art. 9 h) Ley 19587"],
  [39, 8, "¿Se identifican los productos riesgosos almacenados?", "Cap. 17 Art.145 Dec. 351/79 · Art. 9 h) y Art.8 d) Ley 19587"],
  [40, 8, "¿Se proveen elementos de protección adecuados al personal ?", "Cap. 17 Art.145 Dec. 351/79 · Art. 8 c) Ley 19587"],
  [41, 8, "¿Existen duchas de emergencia y/o lava ojos en los sectores con productos peligrosos?", "Cap. 5 Art. 42 Dec. 351/79 · Art. 8 b) y 9 i) Ley 19587"],
  [42, 8, "¿En atmósferas inflamables la instalación eléctrica es antiexplosiva?", "Cap. 18 Art. 165,166 y 167, Dec. 351/79"],
  [43, 8, "¿Existe un sistema para control de derrames de productos peligrosos?", "Cap. 17 Art.145 y 148 Dec. 351/79 · Art. 8 a) Ley 19587"],
  [44, 9, "¿Su fabricación y/o manipuleo cumplimenta la legislación vigente?", "Cap. 17 Art. 145 y 147 a 150 Dec. 351/79 · Art. 8 d) Ley 19587"],
  [45, 9, "¿Todas las sustancias que se utilizan poseen su respectivas hojas de seguridad?", "Cap. 17 Art. 145 y 147 a 150 Dec. 351/79 · Art. 8 d) Ley 19587"],
  [46, 9, "¿Las instalaciones y equipos se encuentran protegidos contra el efecto corrosivo de las sustancias empleadas?", "Cap. 17 Art.148 Dec. 351/79 · Art. 8 b) y d) Ley 19587"],
  [47, 9, "¿ Se fabrican, depositan o manipulan sustancias explosivas, teniendo en cuenta lo reglamentado por Fabricaciones Militares ?", "Cap. 17 Art 146 Dec. 351/79 · Art. 8 a), b), c) y d) Ley 19587"],
  [48, 9, "¿Existen dispositivos de alarma acústico y visuales donde se manipulen sustancias infectantes y/o contaminantes?", "Cap. 17 Art. 149 Dec. 351/79 · Art. 8 a) b) y d) Ley 19587"],
  [49, 9, "¿ Se ha señalizado y resguardado la zona o los elementos afectados ante casos de derrame de sustancias corrosivas?", "Cap. 17 Art. 148 Dec. 351/79 · Art. 8 a) b) y d) Ley 19587"],
  [50, 9, "¿Se ha evitado la acumulación de desechos orgánicos en estado de putrefacción, e implementado la desinfección correspondiente?", "Cap. 17 Art. 150 Dec. 351/79 · Art. 9 e) Ley 19587"],
  [51, 9, "¿Se confeccionó un plan de segurid. para casos de emergencia, y se colocó en lugar visible?", "Cap. 17 Art. 145 Dec. 351/79 · Art. 9 j) y k) Ley 19587"],
  [52, 10, "¿Están todos los cableados eléctricos adecuadamente contenidos?", "Cap. 14 Art. 95 y 96 Dec. 351/79 · Art. 9 d) Ley 19587"],
  [53, 10, "¿Los conectores eléctricos se encuentran en buen estado?", "Cap. 14 Art. 95 y 96 Dec. 351/79 · Art. 9 d) Ley 19587"],
  [54, 10, "¿Las instalaciones y equipos eléctricos cumplen con la legislación?", "Cap. 14 Art. 95 y 96 Dec. 351/79 · Art. 9 d) Ley 19587"],
  [55, 10, "¿Las tareas de mantenimiento son efectuadas por personal capacitado y autorizado por la empresa?", "Cap. 14 Art. 98 Dec. 351/79 · Art. 8 d) Ley 19587"],
  [56, 10, "¿Se efectúa y registra los resultados del mantenimiento de las instalaciones, en base a programas confeccionados de acuerdo a normas de seguridad?", "Cap. 14 Art. 98 Dec. 351/79 · Art. 9 d) Ley 19587"],
  [57, 10, "¿Los proyectos de instalaciones y equipos eléctricos de más de 1000 voltios cumplimentan con lo establecido en la legislación vigente y están aprobados por el responsable de Higiene y Seguridad en el rubro de su competencia?", "Cap. 14 Art. 97 Dec. 351/79 · Art. 9 d) Ley 19587"],
  [58, 10, "¿Se adoptan las medidas de seguridad en locales donde se manipule sustancias corrosivas, inflamables y/o explosivas ó de alto riesgo y en locales húmedos ?", "Cap. 14 Art. 99 Dec. 351/79 · Art. 9 d) Ley 19587"],
  [59, 10, "Se han adoptado las medidas para la protección contra riesgos de contactos directos e indirectos?", "Cap. 14 Art. 100 Dec. 351/79 y punto 3.3.2. Anexo VI · Art 8 b) Ley 19587"],
  [60, 10, "¿Se han adoptado medidas para eliminar la electricidad estática en todas las operaciones que pueda producirse?", "Cap. 14 Art. 101 Dec. 351/79 y punto 3.6 Anexo VI · Art 8 b) Ley 19587"],
  [61, 10, "¿Posee instalación para prevenir sobretensiones producidas por descargas atmosféricas (pararrayos)?", "Cap. 14 Art. 102 Dec. 351/79 · Art 8 b) Ley 19587"],
  [62, 10, "¿Poseen las instalaciones tomas a tierra independientes de la instalada para descargas atmosféricas?", "Cap. 14 Art. 102 y Anexo VI, pto. 3.3.1 Dec. 351/79 · Art 8 b) Ley 19587"],
  [63, 10, "¿Las puestas a tierra se verifican periódicamente mediante mediciones?", "Anexo VI pto. 3,1, Dec. 351/79 · Art 8 b) Ley 19587"],
  [64, 11, "¿Se realizan los controles e inspecciones periódicas establecidos en calderas y todo otro aparato sometido a presión?", "Cap. 16 Art. 140 Dec. 351/79 · Art. 9 b) Ley 19587"],
  [65, 11, "¿Se han fijado las instrucciones detalladas con esquemas de la instalación, y los procedimientos operativos?", "Cap. 16 Art. 138 Dec. 351/79 · Art. 9 j) Ley 19587"],
  [66, 11, "¿Se protegen los hornos, calderas, etc., para evitar la acción del calor?", "Cap. 16 Art. 139 Dec. 351/79 · Art. 8 b) Ley 19587"],
  [67, 11, "¿Están los cilindros que contengan gases sometidos a presión adecuadam. almacenados?", "Cap. 16 Art. 142 Dec. 351/79 · Art. 9 b) Ley 19587"],
  [68, 11, "¿Los restantes aparatos sometidos a presión, cuentan con disposit. de protecc. y seguridad?", "Cap. 16 Art. 141 y Art. 143 · Art. 9 b) Ley 19587"],
  [69, 11, "¿Cuenta el operador con la capacitación y/o habilitación pertinente?", "Cap. 16 Art. 138 Dec. 351/79 · Art. 9 k) Ley 19587"],
  [70, 11, "¿Están aislados y convenientemente ventilados los aparatos capaces de producir frío, con posibilidad de desprendimiento de contaminantes?", "Cap. 16 Art. 144 Dec. 351/79 · Art. 8 b) Ley 19587"],
  [71, 12, "¿Se provee a todos los trabajadores, de los elementos de protección personal adecuado, acorde a los riesgos a los que se hallan expuestos?", "Cap.19 Art. 188 a 190 Dec. 351/79 · Art. 8 c) Ley 19587"],
  [72, 12, "¿Existen señalizaciones visibles en los puestos y/o lugares de trabajo sobre la obligatoriedad del uso de los elementos de protección personal?", "Cap. 12 Art. 84 Dec. 351/79 · Art. 9 j) Ley 19587"],
  [73, 12, "¿Se verifica la existencia de registros de entrega de los E.P.P.?", "Art. 28 inc. h) Dto. 170/96"],
  [74, 12, "¿Se realizó un estudio por puesto de trabajo o sector donde se detallen los E.P.P. necesarios?", "Cap. 19, Art. 188, Dec. 351/79"],
  [75, 13, "¿ Se cumple con los requisitos de iluminación establecidos en la legislación vigente?", "Cap. 12 Art. 71 Dec. 351/79 · Art. 8 a) Ley 19587"],
  [76, 13, "¿Se ha instalado un sistema de iluminación de emergencia, en casos necesarios, acorde a los requerimientos de la legislación vigente?", "Cap. 12 Art. 76 Dec. 351/79"],
  [77, 13, "¿Se registran las mediciones en los puestos y/o lugares de trabajo?", "Cap. 12 Art. 73 a 75 Dec. 351/79 y Art. 10 Dec. 1338/96"],
  [78, 13, "¿Los niveles existentes cumplen con la legislación vigente?", "Cap. 12 Art. 73 a 75 Dec. 351/79 · Art. 8 a) Ley 19587"],
  [79, 13, "¿Existe marcación visible de pasillos, circulaciones de tránsito y lugares de cruce donde circulen cargas suspendidas y otros elementos de transporte?", "Cap. 12 Art. 79 Dec. 351/79 · Art. 9 j) Ley 19587"],
  [80, 13, "¿Se encuentran señalizados los caminos de evacuación en caso de peligro e indicadas las salidas normales y de emergencia?", "Cap. 12 Art. 80 y Cap. 18 Art. 172 inc.2 Dec. 351/79 · Art. 9 j) Ley 19587"],
  [81, 13, "¿Se encuentran identificadas las cañerías?", "Cap. 12 Art. 82 Dec. 351/79"],
  [82, 14, "¿Se registran las mediciones en los puestos y/o lugares de trabajo?", "Cap. 8 Art. 60 Dec. 351/79 Anexo III Res. 295/03 y Art. 10 Dec. 1338/96 · Art. 8 inc. a) Ley 19587"],
  [83, 14, "¿El personal sometido a estrés por frío, está protegido adecuadamente?", "Cap. 8 Art. 60 Dec. 351/79 y Anexo III Res. 295/03 · Art. 8 inc. a) Ley 19587"],
  [84, 14, "¿Se adoptaron las correcciones en los puestos y/o lugares de trabajo del personal sometido a estrés por frío?", "Cap. 8 Art. 60 Dec. 351/79 y Anexo III Res. 295/03 · Art. 8 inc. a) Ley 19587"],
  [85, 14, "¿El personal sometido a estrés térmico y tensión térmica, está protegido adecuadamente?", "Cap. 8 Art. 60 Dec. 351/79 y Anexo III Res. 295/03 · Art. 8 inc. a) Ley 19587"],
  [86, 14, "¿Se adoptaron las correcciones en los puestos y/o lugares de trabajo del personal sometido a estrés térmico tensión térmica?", "Cap. 8 Art. 60 inc. 4 Dec. 351/79 · Art. 8 inc. a) Ley 19587"],
  [87, 15, "¿En caso de existir fuentes generadoras de radiaciones ionizantes (Ej. Rayos X en radiografías), los trabajadores y las fuentes cuentan con la autorizac. del organismo competente?", "Cap. 10 Art. 62, Dec. 351/79"],
  [88, 15, "¿Se encuentran habilitados los operadores y los equipos generadores de radiaciones ionizantes ante el organismo competente?", "Cap. 10 Art. 62 Dec. 351/79"],
  [89, 15, "¿Se lleva el control y registro de las dosis individuales?", "Art. 10 - Dto. 1338/96 y Anexo · II, Res. 295/03"],
  [90, 15, "¿Los valores hallados, se encuentran dentro de lo establecido en la normativa vigente?", "Anexo II, Res. 295/03"],
  [91, 16, "¿Se han aplicado las medidas de control a la clase de riesgo?", "Anexo II, Res. 295/03"],
  [92, 16, "¿Las medidas aplicadas cumplen con lo establecido en la normativa vigente?", "Anexo II, Res. 295/03"],
  [93, 17, "¿En caso de existir fuentes generadoras de radiaciones no ionizantes (Ej. Soldadura),que puedan generar daños a los trabajadores, están éstos protegidos?", "Cap. 10 Art. 63 Dec. 351/79 · Art. 8 inc. d) Ley 19587"],
  [94, 17, "¿Se cumple con la normativa vigente para campos magnéticos estáticos?", "Anexo II, Res. 295/03"],
  [95, 17, "¿Se registran las mediciones de radiofrecuencia y/o microondas en los lugares de trabajo?", "Cap. 9 Art. 63 Dec. 351/79, Art. 10- Dec. 1338/96 y Anexo II, Res. 295/03"],
  [96, 17, "¿Se encuentran dentro de lo establecido en la normativa vigente?", "Anexo II, Res. 295/03"],
  [97, 17, "¿En caso de existir radiación infrarroja, se registran las mediciones de la misma?", "Art. 10 - Dec. 1338/96 y Anexo II, Res. 295/03"],
  [98, 17, "¿Los valores hallados, se encuentran dentro de lo establecido en la normativa vigente?", "Anexo II, Res. 295/03"],
  [99, 17, "¿En caso de existir radiación ultravioleta, se registran las mediciones de la misma?", "Art. 10 - Dec. 1338/96 y Anexo II, Res. 295/03"],
  [100, 17, "¿Los valores hallados, se encuentran dentro de lo establecido en la normativa vigente?", "Anexo II, Res. 295/03"],
  [101, 18, "¿Existe provisión de agua potable para el consumo e higiene de los trabajadores?", "Cap. 6 Art. 57 Dec. 351/79 · Art. 8 a) Ley 19587"],
  [102, 18, "¿Se registran los análisis bacteriológico y físico químico del agua de consumo humano con la frecuencia requerida?", "Cap. 6 Art. 57y 58, Dec. 351/79 y Res. MTSS 523/95 · Art. 8 a) Ley 19587"],
  [103, 18, "¿Se ha evitado el consumo humano del agua para uso industrial?", "Cap. 6 Art. 57 Dec. 351/79 · Art. 8 a) Ley 19587"],
  [104, 19, "¿Se recogen y canalizan por conductos, impidiendo su libre escurrimiento?", "Cap. 7 Art. 59 Dec. 351/79"],
  [105, 19, "¿Se ha evitado el contacto de líquidos que puedan reaccionar originando desprendimiento de gases tóxicos ó contaminantes?", "Cap. 7 Art. 59 Dec. 351/79"],
  [106, 19, "¿Son evacuados los efluentes a plantas de tratamiento?", "Cap. 7 Art. 59 Dec. 351/79"],
  [107, 19, "¿Se limpia periódicamente la planta de tratamiento, con las precauciones necesarias de protección para el personal que efectúe estas tareas?", "Cap. 7 Art. 59 Dec. 351/79"],
  [108, 20, "¿Existen baños aptos higiénicamente?", "Cap. 5 Art. 46 a 49 Dec. 351/79"],
  [109, 20, "¿Existen vestuarios aptos higiénicamente y poseen armarios adecuados e individuales?", "Cap. 5 Art. 50 y 51 Dec. 351/79"],
  [110, 20, "¿Existen comedores aptos higiénicamente?", "Cap. 5 Art. 52 Dec. 351/79"],
  [111, 20, "¿La cocina reúne los requisitos establecidos?", "Cap. 5 Art. 53 Dec. 351/79"],
  [112, 20, "¿Los establecimientos temporarios cumplen con las exigencias de la legislación vigente?", "Cap. 5 Art. 56 Dec. 351/79"],
  [113, 21, "¿Se encuentra identificada la carga máxima en dichos equipos?", "Cap. 15 Art. 114 y 122 Dec. 351/79"],
  [114, 21, "¿Poseen parada de máximo nivel de sobrecarga en el sistema de fuerza motriz?", "Cap. 15 Art. 117 Dec. 351/79"],
  [115, 21, "¿Se halla la alimentación eléctrica del equipo en buenas condiciones?", "Cap. 14 Art. 95 y 96 Dec. 351/79 · Art. 9 b) Ley 19587"],
  [116, 21, "¿Tienen los ganchos de izar traba de seguridad?", "Cap. 15 Art 126 Dec. 351/79 · Art. 9 b) Ley 19587"],
  [117, 21, "¿Los elementos auxiliares de elevación se encuentran en buen estado (cadenas, perchas, eslingas, fajas etc.)?", "Cap. 15 Art. 122, 123, 124 y 125, Dec. 351/79"],
  [118, 21, "¿Se registra el mantenimiento preventivo de estos equipos?", "Cap. 15 Art. 116 Dec. 351/79, Art. 10 Dec. 1338/96 · Art. 9 b) Ley 19587"],
  [119, 21, "¿Reciben los operadores instrucción respecto a la operación y uso correcto del equipo de izar?", "Cap. 21 Art. 208 a 210 Dec. 351/79 · Art. 9 k) Ley 19587"],
  [120, 21, "¿Los ascensores y montacargas cumplen los requisitos y condiciones máximas de seguridad en lo relativo a la construcción, instalación y mantenimiento?", "Cap. 15 Art. 137 Dec. 351/79"],
  [121, 21, "¿Los aparatos para izar, aparejos, puentes grúa, transportadores cumplen los requisitos y condiciones máximas de seguridad ?", "Cap. 15 Art. 114 a 132 Dec. 351/79"],
  [122, 22, "¿Se capacita a los trabajadores acerca de los riesgos específicos a los que se encuentren expuestos en su puesto de trabajo?", "Cap. 21 Art. 208 a 210 Dec. 351/79 · Art. 9 k) Ley 19587"],
  [123, 22, "¿Existen programas de capacitación con planificación en forma anual?", "Cap. 21 Art. 211 Dec. 351/79 · Art. 9 k) Ley 19587"],
  [124, 22, "¿Se entrega por escrito al personal las medidas preventivas tendientes a evitar las enfermedades profesionales y accidentes de trabajo?", "Cap. 21 Art. 213 Dec. 351/79, Art. Dec. 1338/96 · Art. 9 k) Ley 19587"],
  [125, 23, "¿Existen botiquines de primeros auxilios acorde a los riesgos existentes?", "Art. 9 i) Ley 19587"],
  [126, 24, "¿Cuentan los vehículos con los elementos de seguridad?", "Cap. 15 Art. 134 Dec. 351/79"],
  [127, 24, "¿Se ha evitado la utilización de vehículos con motor a explosión en lugares con peligro de incendio o explosión, o bien aquellos cuentan con dispositivos de seguridad apropiados para evitar dichos riesgos?", "Cap. 15 Art. 134 Dec. 351/79"],
  [128, 24, "¿Disponen de asientos que neutralicen las vibraciones, tengan respaldo y apoya pies?", "Cap. 15 Art. 134 Dec. 351/79"],
  [129, 24, "¿Son adecuadas las cabinas de protección para las inclemencias del tiempo?", "Art. 8 b) Ley 19587"],
  [130, 24, "¿Son adecuadas las cabinas para proteger del riesgo de vuelco?", "Cap. 15, Art. 103 dec. 351/79 · Art. 8 b) Ley 19587"],
  [131, 24, "¿Están protegidas para los riesgos de desplazamiento de cargas?", "Cap. 15 Art. 134 Dec. 351/79"],
  [132, 24, "¿Poseen los operadores capacitación respecto a los riesgos inherentes al vehículo que conducen?", "Cap. 21 Art. 208 y 209, Dec. 351/79 · Art. 9 k) Ley 19587"],
  [133, 24, "¿Están los vehículos equipados con luces, frenos, dispositivo de aviso acústico-luminosos, espejos, cinturón de seguridad, bocina y matafuegos?", "Cap.15 Art.134 Dec. 351/79"],
  [134, 24, "¿Se cumplen las condiciones que deben reunir los ferrocarriles para el transporte interno?", "Cap.15, Art.136, Dec. 351/79"],
  [135, 25, "¿Se registran las mediciones en los puestos y/o lugares de trabajo?", "Cap. 9 Art. 61 incs. 2 y 3, Dec. 351/79 Anexo IV Res. Art. 10 Dec. 1338/96"],
  [136, 25, "¿Se adoptaron las correcciones en los puestos y/o lugares de trabajo?", "Cap. 9 Art. 61 Dec. 351/79 · Art. 9 c) Ley 19587"],
  [137, 26, "¿Se registran las mediciones de nivel sonoro continuo equivalente en los puestos y/o lugares de trabajo?", "Cap. 13 Art. 85 y 86 Dec. 351/79 Anexo V Res. 295/03 Art.10 Dec. 1338/96"],
  [138, 26, "¿Se adoptaron las correcciones en los puestos y/o lugares de trabajo?", "Cap. 13 Art. 87 Dec. 351/79 Anexo V Res. 295/03 · Art.9 f) Ley 19587"],
  [139, 27, "¿Se registran las mediciones en los puestos y/o lugares de trabajo?", "Cap. 13 Art. 93, Dec. 351/79 Anexo V Res. 295/03 Art. 10 Dec. 1338/96"],
  [140, 27, "¿Se adoptaron las correcciones en los puestos y/o lugares de trabajo?", "Cap. 13 Art. 93, Dec. 351/79 Anexo V Res. 295/03 Art. 10 Dec. 1338/96 · Art.9 f) Ley 19587"],
  [141, 28, "¿Se registran las mediciones en los puestos y/o lugares de trabajo?", "Cap. 13 Art. 94 Dec 351/79 Anexo V Res. 295/03 Art. 10 Dec. 1338/96"],
  [142, 28, "¿Se adoptaron las correcciones en los puestos y/o lugares de trabajo?", "Cap. 13 Art. 94 Dec 351/79 Anexo V Res. 295/03 Art. 10 Dec. 1338/96 · Art.9 f) Ley 19587"],
  [143, 29, "¿Los recipientes con gases se almacenan adecuadamente?", "Cap. 16, Art. 142, Dec. 351/79"],
  [144, 29, "¿Los cilindros de gases son transportados en carretillas adecuadas?", "Cap. 16, Art. 142, Dec. 351/79"],
  [145, 29, "¿Los cilindros de gases almacenados cuentan con el capuchón protector y tienen la válvula cerrada?", "Cap. 16, Art. 142, Dec. 351/79"],
  [146, 29, "¿Los cilindros de oxígeno y acetileno cuentan con válvulas antiretroceso de llama?", "Cap. 17, Art. 153, Dec. 351/79"],
  [147, 30, "¿Existe captación localizada de humos de soldadura?", "Cap. 17, Art. 152 y 157, Dec. 351/79"],
  [148, 30, "¿Se utilizan pantallas para la proyección de partículas y chispas?", "Cap. 17, Art. 152 y 156, Dec. 351/79"],
  [149, 30, "¿Las mangueras, reguladores, manómetros, sopletes y válvulas antirretornos se encuentran en buen estado?", "Cap. 17, Art. 153, Dec. 351/79"],
  [150, 31, "¿Todas las escaleras cumplen con las condiciones de seguridad?", "Anexo VII Punto 3 Dec. 351/79"],
  [151, 31, "¿Todas las plataformas de trabajo y rampas cumplen con las condiciones de seguridad?", "Anexo VII Punto 3.11 .y 3.12. Dec. 351/79"],
  [152, 32, "¿Posee programa de mantenimiento preventivo, en base a razones de riesgos y otras situaciones similares, para máquinas e instalaciones, tales como?:", "Art. 9 b) y d) Ley 19587"],
  [153, 32, "Instalaciones eléctricas", "Cap. 14 Art. 98 Dec. 351/79 · Art. 9 b) y d) Ley 19587"],
  [154, 32, "Aparatos para izar", "Cap. 15 Art. 116 Dec. 351/79 · Art. 9 b) y d) Ley 19587"],
  [155, 32, "Cables de equipos para izar", "Cap. 15 Art. 123 Dec. 351/79 · Art. 9 b) y d) Ley 19587"],
  [156, 32, "Ascensores y Montacargas", "Cap. 15 Art. 137 Dec. 351/79 · Art. 9 b) y d) Ley 19587"],
  [157, 32, "Calderas y recipientes a presión", "Cap. 16 Art. 140 Dec. 351/79 · Art. 9 b) y d) Ley 19587"],
  [158, 32, "¿Cumplimenta dicho programa de mantenimiento preventivo?", "Art. 9 b) y d) Ley 19587"],
  [159, 33, "¿El establecimiento se encuentra comprendido dentro de la Resolución 415/02 Registro de Agentes Cancerígenos?", ""],
  [160, 33, "¿El establecimiento se encuentra comprendido dentro de la Resolución 497/03 Registro de PCBs?", ""],
  [161, 33, "¿El establecimiento se encuentra comprendido dentro de la Resolución 743/03 Registro de Accidentes Mayores?", ""]
];
// Planillas del formulario: A (Res. SRT 415/02), B (Res. SRT 497/03), C (Res. SRT 743/03, con cantidad umbral en toneladas)
const RGRL_PLANILLAS = {
  A: { titulo: "Planilla A · Listado de sustancias y agentes cancerígenos (Resolución SRT 415/02)", lista: [["40204", "4 Aminobifenilo"], ["40201", "Aceites minerales (no tratados o ligeramente tratados)"], ["40202", "Alcohol isopropilico (manufactura por el método de los ácidos fuertes)"], ["40203", "Alquitranes"], ["40031", "Amianto (asbesto)"], ["40030", "Arsenico y sus compuestos"], ["40205", "Asfaltos"], ["40206", "Auramina, manufactura de"], ["40036", "Benceno"], ["40207", "Bencidina"], ["40035", "Berilio y sus compuestos"], ["40214", "Beta naftilamina / 2-naftilamina"], ["40044", "Cadmio y compuestos"], ["40054", "Clorometil metil eter, grado técnico en conjunto con bis (clorometil) eter"], ["40058", "Cloruro de vinilo"], ["40208", "Cromo hexavalente y sus compuestos"], ["40210", "Gas mostaza"], ["40211", "Hematita, minería de profundidad con exposición al radon"], ["40212", "Hollín."], ["40213", "Magenta, manufactura"], ["40130", "Níquel y sus compuestos"], ["40216", "Radon-222 y sus productos de decaimiento"], ["40153", "Sílice (inhalado en forma de cuarzo o cristobalita de origen ocupacional)"], ["40217", "Talco conteniendo fibras asbestiformes"], ["40136", "Óxido de etileno"]] },
  B: { titulo: "Planilla B · Difenilos policlorados (Resolución SRT 497/03)", lista: [["10000", "Aceclor"], ["10001", "Adkarel"], ["10002", "Alc"], ["10003", "Apirolio"], ["10004", "Apirorlio"], ["10005", "Arochlor"], ["10006", "Arochlors"], ["10007", "Aroclor"], ["10008", "Aroclors"], ["10012", "Askael"], ["10013", "Askarel"], ["10014", "Auxol"], ["10015", "Bakola"], ["10016", "Biphenyl, Chlorinated"], ["10017", "Chlophen"], ["10018", "Chloretol"], ["10019", "Chlorextol"], ["10020", "Chlorinated Biphenyl"], ["10021", "Chlorinated Diphenyl"], ["10022", "Chlorinol"], ["10023", "Chlorobiphenyl"], ["10024", "Chlorodiphenyl"], ["10025", "Chlorphen"], ["10026", "Chorextol"], ["10027", "Chorinol"], ["10028", "Chorinol"], ["10029", "Clophen"], ["10030", "Clophenharz"], ["10031", "Cloresil"], ["10032", "Clorinal"], ["10033", "Clorphen"], ["10034", "Decachlorodiphenyl"], ["10035", "Delor"], ["10036", "Delorene"], ["10037", "Diaclor"], ["10038", "Dicolor"], ["10039", "Diconal"], ["10040", "Diphenyl, Chlorinated"], ["10041", "Dk"], ["10042", "Duconal"], ["10043", "Dykanol"], ["10044", "Educarel"], ["10045", "Eec-18"], ["10046", "Elaol"], ["10047", "Electrophenyl"], ["10048", "Elemex"], ["10049", "Elinol"], ["10050", "Eucarel"], ["10051", "Fenchlor"], ["10052", "Fenclor"], ["10053", "Fenocloro"], ["10054", "Gilotherm"], ["10055", "Hydol"], ["10056", "Hyrol"], ["10057", "Hyvol"], ["10058", "Inclor"], ["10059", "Inerteen"], ["10060", "Inertenn"], ["10061", "Kanechlor"], ["10062", "Kaneclor"], ["10063", "Kennechlor"], ["10064", "Kenneclor"], ["10065", "Leromoll"], ["10066", "Magvar"], ["10067", "Mcs 1489"], ["10068", "Montar"], ["10069", "Nepolin"], ["10070", "No-Flamol"], ["10071", "Noflamol"], ["10072", "Non-Flamol"], ["10073", "Olex-Sf-D"], ["10077", "Orophene"], ["10078", "Pcb"], ["10079", "Pcb'S"], ["10080", "Pcbs"], ["10081", "Pheaoclor"], ["10082", "Phenochlor"], ["10083", "Phenoclor"], ["10084", "Plastivar"], ["10085", "Polychlorinated Biphenyl"], ["10086", "Polychlorinated Biphenyls"], ["10087", "Polychlorinated Diphenyl"], ["10088", "Polychlorinated Diphenyls"], ["10089", "Polychlorobiphenyl"], ["10090", "Polychlorodiphenyl"], ["10091", "Prodelec"], ["10092", "Pydraul"], ["10093", "Pyraclor"], ["10094", "Pyralene"], ["10095", "Pyranol"], ["10096", "Pyroclor"], ["10097", "Pyronol"], ["10098", "Saf-T-Kuhl"], ["10099", "Saf-T-Kohl"], ["10100", "Santosol"], ["10101", "Santotherm"], ["10102", "Santothern"], ["10103", "Santovac"], ["10104", "Solvol"], ["10105", "Sorol"], ["10106", "Soval"], ["10107", "Sovol"], ["10108", "Sovtol"], ["10109", "Terphenychlore"], ["10110", "Therminal"], ["10111", "Therminol"], ["10112", "Turbinol"]] },
  C: { titulo: "Planilla C · Sustancias químicas a declarar (Resolución SRT 743/03)", lista: [["40214", "2-Naftilamina y-o sus sales", "0,001"], ["40310", "4,4 Metilen-Bis (2-cloroanilina) y-o sus sales en forma pulverulenta", "0,01"], ["40220", "4. Aminodifenilo y-o sus sales", "0,001"], ["40224", "4-Nitrofenil 1,3-propanosultona.", "0,001"], ["40308", "Acetileno", "5"], ["40003", "Acido clorhídrico (gas licuado)", "25"], ["40145", "Alquilos de plomo", "5"], ["40207", "Bencidina y-o sus sales", "0,001"], ["40315", "Bromo", "20"], ["40053", "Cloro", "10"], ["40221", "Cloruro de dimetil carbamoilo", "0,001"], ["40304", "Compuestos de níquel en forma pulverulenta inhalable (monóxido de níquel, dióxido de níquel, sulfuro)", "1"], ["40317", "Dicloruro de azufre", "1"], ["40314", "Dicloruro de carbonilo (fosgeno)", "0,3"], ["40313", "Diisocianato de tolueno", "10"], ["40222", "Dimetilnitrosamina", "0,001"], ["40054", "Eter bis (clorometílico), clorometil metil eter", "0,001"], ["40322", "Etilenimina", "10"], ["40089", "Fluor", "10"], ["40305", "Formaldehido (concentración >= 90 por 100)", "5"], ["40307", "Gases licuados extremadamente inflamables (incluidos GPL) y gas natural", "50"], ["40306", "Hidrógeno", "5"], ["40311", "Isocianato de metilo", "0,15"], ["40014", "Metanol", "500"], ["40320", "Naftas y otros cortes livianos", "5,000"], ["40321", "Nitrato de amonio", "350"], ["40136", "Óxido de etileno", "5"], ["40309", "Óxido de propileno", "5"], ["40312", "Oxígeno", "200"], ["40301", "Pentóxido de arsénico, acido arsénico (V) y-o sus sales", "1"], ["40319", "Policlorodibenzofuranos y policlorodibenzodioxinas (incluida la TCDD) calculadas en equivalente TCDD (*)", "0,001"], ["40223", "Triamida hexametilfosfórica", "0,001"], ["40303", "Trihidruro de arsénico (arsina)", "0,2"], ["40316", "Trihidruro de fósforo (fosfina)", "0,2"], ["40302", "Trióxido de arsénico, ácido arsénico (III) y-o sus sales", "0,1"], ["40318", "Trióxido de azufre", "15"]] }
};

const RGRL = {
  CARPETA_M8: '1_2lcPXz9MVwHufCbsRy5KAO-IA5Q0PYW',   // MÓDULO 8 · SERVICIOS E INFRAESTRUCTURA
  P_LIBRO: 'RGRL_ID', VIGENCIA_MESES: 12, AVISO_DIAS: 30,
  REMITENTE: 'belenpellegrini.hys@gmail.com', CORREO_DEFECTO: 'belenpellegrini.hys@gmail.com', HORA_AVISO: 7,
  H_REL: ['ID', 'ESTABLECIMIENTO', 'LUGAR', 'FECHA', 'VENCE', 'ESTADO', 'N_ESTABLECIMIENTO', 'EMPRESA', 'CUIT', 'ACTIVIDAD_REV3', 'DOMICILIO', 'CP', 'LOCALIDAD', 'PROVINCIA',
    'TRABAJADORES', 'SUPERFICIE_M2', 'GREMIOS', 'CONTRATISTAS', 'RESPONSABLE', 'CUIL_RESPONSABLE', 'CARGO_RESPONSABLE', 'TITULO_MATRICULA', 'OBSERVACIONES', 'ARCHIVO', 'CARGADO_POR', 'ACTUALIZADO'],
  H_RESP: ['ID_RGRL', 'ESTABLECIMIENTO', 'LUGAR', 'N', 'SECCION', 'CONDICION', 'RESPUESTA', 'FECHA_REGULARIZACION', 'NORMATIVA', 'OBSERVACION', 'ACTUALIZADO'],
  H_PLA: ['ID_RGRL', 'ESTABLECIMIENTO', 'LUGAR', 'PLANILLA', 'CODIGO', 'SUSTANCIA', 'SI', 'ACTUALIZADO'],
  H_MED: ['ID', 'ESTABLECIMIENTO', 'LUGAR', 'TIPO', 'NORMA', 'FECHA_MEDICION', 'VENCE', 'PROFESIONAL', 'RESULTADO', 'ARCHIVO', 'ESTADO', 'AVISAR_A', 'OBSERVACIONES', 'CARGADO_POR', 'ACTUALIZADO'],
  // [tipo, norma, meses de vigencia por defecto] · se pueden cambiar en cada medición
  TIPOS_MED: [['Puesta a tierra y continuidad de masas', 'Res. SRT 900/15 · Dto. 351/79, Anexo VI, pto. 3.1', 12], ['Iluminación', 'Res. SRT 84/12 · Dto. 351/79, cap. 12', 12],
    ['Ruido', 'Res. SRT 85/12 · Dto. 351/79, cap. 13', 12], ['Pararrayos', 'Dto. 351/79, art. 102', 12], ['Carga térmica', 'Dto. 351/79, cap. 8 · Res. SRT 295/03', 12], ['Otra', '', 12]],
  RESULTADOS: ['Cumple', 'No cumple', 'Cumple con observaciones', 's/d (revisar)'],
  ESTADOS_REL: ['Borrador', 'Completo', 'Presentado'], ESTADOS_MED: ['Vigente', 'Reemplazada', 'Anulada']
};

// ------------------------------------------------------------------ Libro (se crea solo la primera vez)
let RGRL_SS_ = null;   // libro abierto una vez por ejecución
function rgrlLibro_() {
  if (RGRL_SS_) return RGRL_SS_;
  const p = PropertiesService.getScriptProperties(); let id = p.getProperty(RGRL.P_LIBRO), ss = null;
  if (id) { try { if (!DriveApp.getFileById(id).isTrashed()) ss = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!ss) {
    ss = SpreadsheetApp.create('M8 · RGRL y mediciones · Sistema HyS'); ss.setSpreadsheetTimeZone(TZ); ss.setSpreadsheetLocale('es_AR');
    p.setProperty(RGRL.P_LIBRO, ss.getId()); try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(RGRL.CARPETA_M8)); } catch (e) {}
  }
  const hoja = (n, fn) => { if (!ss.getSheetByName(n)) fn(ss.insertSheet(n)); };
  hoja('RGRL', sh => { encabezar_(sh, 'RGRL · Relevamiento General de Riesgos Laborales (Res. SRT 463/09, Anexo I)', 'Uno por establecimiento o sitio y por año. VENCE = FECHA + 12 meses (se actualiza anualmente). Las respuestas están en RGRL_RESPUESTAS y las planillas A, B y C en RGRL_PLANILLAS. No borrar filas.', RGRL.H_REL);
    lista_(sh, 5, 500, RGRL.ESTADOS_REL); sh.getRange(6, 4, 500, 2).setNumberFormat('dd/mm/yyyy'); });
  hoja('RGRL_RESPUESTAS', sh => { encabezar_(sh, 'RGRL · Estado de cumplimiento (161 condiciones a cumplir)', 'Una fila por condición y por relevamiento. RESPUESTA: Sí · No · No aplica. Si es «No», FECHA_REGULARIZACION.', RGRL.H_RESP);
    lista_(sh, 6, 20000, ['Sí', 'No', 'No aplica']); sh.getRange(6, 8, 20000, 1).setNumberFormat('dd/mm/yyyy'); });
  hoja('RGRL_PLANILLAS', sh => encabezar_(sh, 'RGRL · Planillas A, B y C', 'Solo las sustancias marcadas con «Sí» (A: Res. SRT 415/02 · B: Res. SRT 497/03 · C: Res. SRT 743/03).', RGRL.H_PLA));
  hoja('MEDICIONES', sh => { encabezar_(sh, 'Mediciones con vencimiento (puesta a tierra, iluminación, ruido…)', 'Una fila por medición. VENCE = fecha de la medición + vigencia. Vencida o que vence en 30 días = urgente en el tablero y en el recordatorio de los jueves 7 h. AVISAR_A: correos separados por coma. Cuando se carga una nueva del mismo tipo y lugar, la anterior queda «Reemplazada».', RGRL.H_MED);
    lista_(sh, 3, 1000, RGRL.TIPOS_MED.map(t => t[0])); lista_(sh, 8, 1000, RGRL.RESULTADOS); lista_(sh, 10, 1000, RGRL.ESTADOS_MED); sh.getRange(6, 6, 1000, 2).setNumberFormat('dd/mm/yyyy'); });
  hoja('AYUDA', sh => { sh.getRange(1, 1, 6, 1).setValues([['AYUDA · RGRL y mediciones'], ['RGRL: se carga desde el portal (8 · Servicios e infraestructura › RGRL). También se puede completar a mano en RGRL y RGRL_RESPUESTAS.'],
    ['Mediciones: portal › 8 · Servicios e infraestructura › Mediciones. Cada medición nueva reemplaza a la anterior del mismo tipo y lugar.'], ['Recordatorio por correo: los jueves a las 7 h, mientras haya mediciones vencidas o que vencen en 30 días (función recordarMediciones; disparador con prepararAvisosMediciones).'],
    ['Normativa: Ley 19.587; Dto. 351/79; Res. SRT 463/09; Res. SRT 900/15; Res. SRT 84/12; Res. SRT 85/12.'], ['No se borran filas: lo que no va queda «Anulada».']]); sh.getRange(1, 1).setFontWeight('bold').setFontSize(14).setFontColor('#0D313F'); sh.setColumnWidth(1, 900); });
  const h1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1'); if (h1 && ss.getSheets().length > 1) ss.deleteSheet(h1);
  RGRL_SS_ = ss; return ss;
}
function rgrlLeer_(hoja, H) {
  const sh = rgrlLibro_().getSheetByName(hoja), n = sh.getLastRow() - 5; if (n < 1) return [];
  return sh.getRange(6, 1, n, H.length).getValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => o[h] = r[j] instanceof Date ? Utilities.formatDate(r[j], TZ, 'yyyy-MM-dd') : String(r[j] == null ? '' : r[j]).trim()); return o; }).filter(o => o[H[0]]);
}
function rgrlFilas_(hoja, H, objs) { if (!objs.length) return; const sh = rgrlLibro_().getSheetByName(hoja); sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, objs.length, H.length).setValues(objs.map(o => H.map(h => o[h] == null ? '' : o[h]))); }
function rgrlPoner_(hoja, H, fila, o) { const sh = rgrlLibro_().getSheetByName(hoja); sh.getRange(fila, 1, 1, H.length).setValues([H.map(h => o[h] == null ? '' : o[h])]); }
const rgrlHoy_ = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const rgrlISO_ = v => { if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, TZ, 'yyyy-MM-dd'); const s = String(v || '').trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; };
const rgrlFecha_ = v => { const s = rgrlISO_(v); return s ? new Date(s + 'T12:00:00') : ''; };
const rgrlMeses_ = (f, m) => { const s = rgrlISO_(f); if (!s) return ''; const d = new Date(s + 'T12:00:00'); d.setMonth(d.getMonth() + (Number(m) || 12)); return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };
const rgrlDias_ = f => { const s = rgrlISO_(f); return s ? Math.round((new Date(s + 'T12:00:00') - new Date(rgrlHoy_() + 'T12:00:00')) / 864e5) : null; };
const rgrlTxt_ = f => { const s = rgrlISO_(f); return s ? s.split('-').reverse().join('/') : 's/d'; };
const rgrlId_ = (pre, cod) => pre + '-' + String(cod).replace(/\s+/g, '').toUpperCase().slice(0, 6) + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 4).toUpperCase();
// Sitios del establecimiento (BASE COMÚN › SITIOS) para elegir el lugar del RGRL o de la medición
function rgrlLugares_(cod) {
  const out = []; try { pTabla_(pBC_().getSheetByName('SITIOS'), 7).forEach(r => { if (limpio_(r.v[0]) === cod && limpio_(r.v[1]) && out.indexOf(limpio_(r.v[1])) < 0) out.push(limpio_(r.v[1])); }); } catch (e) {}
  if (out.indexOf(cod) < 0) out.unshift(cod); return out;
}
// Estado de una medición vigente según su vencimiento
const rgrlEstadoVto_ = vence => { const d = rgrlDias_(vence); return d == null ? 'sd' : d < 0 ? 'vencida' : d <= RGRL.AVISO_DIAS ? 'porvencer' : 'vigente'; };

// ------------------------------------------------------------------ RGRL
function rgrlGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), lugar = limpio_(x.LUGAR) || cod; if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' };
  const fecha = rgrlISO_(x.FECHA) || rgrlHoy_(), L = rgrlLeer_('RGRL', RGRL.H_REL), antes = x.ID ? L.find(r => r.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró el relevamiento: actualizá la lista.' };
  const r = {}; RGRL.H_REL.forEach(h => r[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  r.ID = antes ? antes.ID : rgrlId_('RGRL', cod); r.ESTABLECIMIENTO = cod; r.LUGAR = lugar; r.FECHA = rgrlFecha_(fecha); r.VENCE = rgrlFecha_(rgrlMeses_(fecha, RGRL.VIGENCIA_MESES));
  if (RGRL.ESTADOS_REL.indexOf(r.ESTADO) < 0) r.ESTADO = 'Borrador'; r.CARGADO_POR = limpio_(quien) || 'Portal'; r.ACTUALIZADO = new Date();
  if (antes) rgrlPoner_('RGRL', RGRL.H_REL, antes.fila, r); else rgrlFilas_('RGRL', RGRL.H_REL, [r]);
  // Respuestas: 161 filas por relevamiento (una por condición, en orden); se reescriben de una vez
  if (x.respuestas) {
    const filas = RGRL_ITEMS.map(it => { const a = x.respuestas[it[0]] || {}, rr = /^(Sí|No|No aplica)$/.test(a.r || '') ? a.r : '';
      return { ID_RGRL: r.ID, ESTABLECIMIENTO: cod, LUGAR: lugar, N: it[0], SECCION: RGRL_SECCIONES[it[1]], CONDICION: it[2], RESPUESTA: rr, FECHA_REGULARIZACION: rr === 'No' ? rgrlFecha_(a.f) : '', NORMATIVA: it[3], OBSERVACION: limpio_(a.o), ACTUALIZADO: new Date() }; });
    const prev = rgrlLeer_('RGRL_RESPUESTAS', RGRL.H_RESP).filter(o => o.ID_RGRL === r.ID);
    const seguidas = prev.length === filas.length && prev.every((o, i) => o.fila === prev[0].fila + i && Number(o.N) === RGRL_ITEMS[i][0]);
    if (seguidas) rgrlLibro_().getSheetByName('RGRL_RESPUESTAS').getRange(prev[0].fila, 1, filas.length, RGRL.H_RESP.length).setValues(filas.map(o => RGRL.H_RESP.map(h => o[h] == null ? '' : o[h])));
    else if (!prev.length) rgrlFilas_('RGRL_RESPUESTAS', RGRL.H_RESP, filas);
    else { const porN = {}; prev.forEach(o => porN[o.N] = o); const nuevas = [];   // filas editadas a mano: una por una
      filas.forEach(o => { if (porN[o.N]) rgrlPoner_('RGRL_RESPUESTAS', RGRL.H_RESP, porN[o.N].fila, o); else nuevas.push(o); }); rgrlFilas_('RGRL_RESPUESTAS', RGRL.H_RESP, nuevas); }
  }
  if (x.planillas) {
    const sh = rgrlLibro_().getSheetByName('RGRL_PLANILLAS'), P = rgrlLeer_('RGRL_PLANILLAS', RGRL.H_PLA), ya = {};
    P.filter(o => o.ID_RGRL === r.ID).forEach(o => { ya[o.PLANILLA + '|' + o.CODIGO] = o; });
    const nuevas = [];
    ['A', 'B', 'C'].forEach(k => RGRL_PLANILLAS[k].lista.forEach(s => { const marc = (x.planillas[k] || []).indexOf(s[0]) >= 0, prev = ya[k + '|' + s[0]];
      if (marc && !prev) nuevas.push({ ID_RGRL: r.ID, ESTABLECIMIENTO: cod, LUGAR: lugar, PLANILLA: k, CODIGO: s[0], SUSTANCIA: s[1], SI: 'Sí', ACTUALIZADO: new Date() });
      else if (prev && (prev.SI === 'Sí') !== marc) sh.getRange(prev.fila, 7, 1, 2).setValues([[marc ? 'Sí' : 'No', new Date()]]); }));
    rgrlFilas_('RGRL_PLANILLAS', RGRL.H_PLA, nuevas);
  }
  CacheService.getScriptCache().remove('p_tablero');
  return { ok: true, id: r.ID, vence: rgrlISO_(r.VENCE) };
}
function rgrlDetalle_(id) {
  const r = rgrlLeer_('RGRL', RGRL.H_REL).find(o => o.ID === id); if (!r) return { ok: false, mensaje: 'No se encontró el relevamiento.' };
  const resp = {}; rgrlLeer_('RGRL_RESPUESTAS', RGRL.H_RESP).filter(o => o.ID_RGRL === id && o.RESPUESTA).forEach(o => resp[o.N] = { r: o.RESPUESTA, f: o.FECHA_REGULARIZACION, o: o.OBSERVACION });
  const pla = { A: [], B: [], C: [] }; rgrlLeer_('RGRL_PLANILLAS', RGRL.H_PLA).filter(o => o.ID_RGRL === id && o.SI === 'Sí').forEach(o => { if (pla[o.PLANILLA]) pla[o.PLANILLA].push(o.CODIGO); });
  return { ok: true, rgrl: r, respuestas: resp, planillas: pla };
}

// ------------------------------------------------------------------ MEDICIONES
function rgrlMedGuardar_(x, quien) {
  const cod = limpio_(x.ESTABLECIMIENTO), lugar = limpio_(x.LUGAR) || cod, tipo = limpio_(x.TIPO);
  if (!cod) return { ok: false, mensaje: 'Falta el establecimiento.' }; if (!tipo) return { ok: false, mensaje: 'Elegí el tipo de medición.' };
  const L = rgrlLeer_('MEDICIONES', RGRL.H_MED), antes = x.ID ? L.find(m => m.ID === x.ID) : null;
  if (x.ID && !antes) return { ok: false, mensaje: 'No se encontró la medición: actualizá la lista.' };
  const def = RGRL.TIPOS_MED.find(t => t[0] === tipo) || ['', '', 12];
  const m = {}; RGRL.H_MED.forEach(h => m[h] = x[h] != null ? x[h] : antes ? antes[h] : '');
  m.ID = antes ? antes.ID : rgrlId_('MED', cod); m.ESTABLECIMIENTO = cod; m.LUGAR = lugar; m.TIPO = tipo; m.NORMA = limpio_(m.NORMA) || def[1];
  const vence = rgrlISO_(x.VENCE) || (rgrlISO_(x.FECHA_MEDICION) ? rgrlMeses_(x.FECHA_MEDICION, x.MESES || def[2]) : '');
  if (!vence) return { ok: false, mensaje: 'Falta la fecha de la medición o la de vencimiento.' };
  m.FECHA_MEDICION = rgrlFecha_(m.FECHA_MEDICION); m.VENCE = rgrlFecha_(vence);
  if (RGRL.ESTADOS_MED.indexOf(m.ESTADO) < 0) m.ESTADO = 'Vigente'; if (!limpio_(m.AVISAR_A)) m.AVISAR_A = RGRL.CORREO_DEFECTO;
  if (x.archivo && x.archivo.base64) { try { const dir = carpeta_(carpeta_(DriveApp.getFolderById(RGRL.CARPETA_M8), 'MEDICIONES'), cod);
    const f = dir.createFile(Utilities.newBlob(Utilities.base64Decode(String(x.archivo.base64).replace(/^data:[^,]+,/, '')), x.archivo.tipo || 'application/pdf', (tipo + ' ' + lugar + ' ' + rgrlISO_(m.FECHA_MEDICION || new Date())).replace(/[^\w.\- ]+/g, '_') + (/pdf/.test(x.archivo.tipo || 'pdf') ? '.pdf' : '.jpg')));
    m.ARCHIVO = f.getUrl(); } catch (e) { return { ok: false, mensaje: 'No se pudo guardar el archivo: ' + e.message }; } }
  m.CARGADO_POR = limpio_(quien) || 'Portal'; m.ACTUALIZADO = new Date();
  if (antes) rgrlPoner_('MEDICIONES', RGRL.H_MED, antes.fila, m);
  else {   // la nueva reemplaza a la vigente del mismo tipo y lugar
    L.filter(o => o.ESTABLECIMIENTO === cod && o.LUGAR === lugar && o.TIPO === tipo && o.ESTADO === 'Vigente').forEach(o => { o.ESTADO = 'Reemplazada'; o.ACTUALIZADO = new Date(); ['FECHA_MEDICION', 'VENCE'].forEach(k => o[k] = rgrlFecha_(o[k])); rgrlPoner_('MEDICIONES', RGRL.H_MED, o.fila, o); });
    rgrlFilas_('MEDICIONES', RGRL.H_MED, [m]);
  }
  CacheService.getScriptCache().remove('p_tablero');
  return { ok: true, id: m.ID, vence: vence, estado: rgrlEstadoVto_(vence) };
}
// Mediciones vigentes con su estado, para el tablero (Tablero.gs › mediciones) y el correo
function rgrlMedVigentes_() {
  let L = []; try { L = rgrlLeer_('MEDICIONES', RGRL.H_MED); } catch (e) { return []; }
  return L.filter(m => m.ESTADO === 'Vigente').map(m => ({ id: m.ID, cod: m.ESTABLECIMIENTO, lugar: m.LUGAR, tipo: m.TIPO, norma: m.NORMA, fecha: m.FECHA_MEDICION, vence: m.VENCE, dias: rgrlDias_(m.VENCE), estado: rgrlEstadoVto_(m.VENCE), avisar: m.AVISAR_A, resultado: m.RESULTADO, archivo: m.ARCHIVO, obs: m.OBSERVACIONES }));
}
// RGRL: último por establecimiento y lugar, con su vencimiento (para el tablero)
function rgrlResumen_() {
  let L = []; try { L = rgrlLeer_('RGRL', RGRL.H_REL); } catch (e) { return []; }
  const ult = {}; L.forEach(r => { const k = r.ESTABLECIMIENTO + '|' + r.LUGAR; if (!ult[k] || r.FECHA > ult[k].FECHA) ult[k] = r; });
  let R = []; try { R = rgrlLeer_('RGRL_RESPUESTAS', RGRL.H_RESP); } catch (e) {}
  return Object.keys(ult).map(k => { const r = ult[k], resp = R.filter(o => o.ID_RGRL === r.ID && o.RESPUESTA);
    return { id: r.ID, cod: r.ESTABLECIMIENTO, lugar: r.LUGAR, fecha: r.FECHA, vence: r.VENCE, estadoVto: rgrlEstadoVto_(r.VENCE), estado: r.ESTADO, contestadas: resp.length, no: resp.filter(o => o.RESPUESTA === 'No').length,
      noVencidas: resp.filter(o => o.RESPUESTA === 'No' && o.FECHA_REGULARIZACION && o.FECHA_REGULARIZACION < rgrlHoy_()).length }; });
}

// ------------------------------------------------------------------ PORTAL (clave de Higiene y Seguridad): acciones «p_rgrl_…»
function rgrlPortal_(accion, x) {
  const quien = x.quien || 'Higiene y Seguridad (portal)';
  switch (accion) {
    case 'p_rgrl_datos': {
      const L = rgrlLeer_('RGRL', RGRL.H_REL).map(r => Object.assign(r, { estadoVto: rgrlEstadoVto_(r.VENCE) }));
      return { ok: true, hoy: rgrlHoy_(), rgrl: L, resumen: rgrlResumen_(), mediciones: rgrlLeer_('MEDICIONES', RGRL.H_MED).map(m => Object.assign(m, { estadoVto: m.ESTADO === 'Vigente' ? rgrlEstadoVto_(m.VENCE) : '' })),
        libro: rgrlLibro_().getUrl(), secciones: RGRL_SECCIONES, items: RGRL_ITEMS, planillas: RGRL_PLANILLAS, tiposMed: RGRL.TIPOS_MED, resultados: RGRL.RESULTADOS, estadosRel: RGRL.ESTADOS_REL, estadosMed: RGRL.ESTADOS_MED,
        correoDefecto: RGRL.CORREO_DEFECTO, avisoDias: RGRL.AVISO_DIAS };
    }
    case 'p_rgrl_lugares': return { ok: true, lugares: rgrlLugares_(limpio_(x.cod)) };
    case 'p_rgrl_detalle': return rgrlDetalle_(x.id);
    case 'p_rgrl_guardar': return conLock_(() => rgrlGuardar_(x, quien));
    case 'p_rgrl_med_guardar': return conLock_(() => rgrlMedGuardar_(x, quien));
    case 'p_rgrl_med_correo': return { ok: true, resultado: recordarMediciones(!!x.enviar) };
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ------------------------------------------------------------------ RECORDATORIO SEMANAL (jueves 7 h)
// Un correo por grupo de destinatarios (AVISAR_A) con las mediciones vencidas o que vencen en 30 días. Sin pendientes, no envía nada.
// enviar = false (vista previa desde el portal): devuelve el texto sin mandar.
function recordarMediciones(enviar) {
  if (enviar === undefined || (enviar && typeof enviar === 'object')) enviar = true;   // desde el disparador
  const V = rgrlMedVigentes_().filter(m => m.estado === 'vencida' || m.estado === 'porvencer' || m.estado === 'sd');
  if (!V.length) return 'Sin mediciones vencidas ni por vencer: no se envía nada.';
  const nom = {}; try { pEstablecimientos_().filas.forEach(r => nom[limpio_(r.v[0])] = r.v[1]); } catch (e) {}
  const grupos = {}; V.forEach(m => { const k = String(m.avisar || RGRL.CORREO_DEFECTO).split(/[,;\s]+/).filter(s => /@/.test(s)).map(s => s.toLowerCase()).sort().join(','); (grupos[k] = grupos[k] || []).push(m); });
  const esc_ = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const out = [];
  Object.keys(grupos).forEach(para => {
    const L = grupos[para].sort((a, b) => (a.dias == null ? -1e9 : a.dias) - (b.dias == null ? -1e9 : b.dias)), venc = L.filter(m => m.estado === 'vencida').length;
    const asunto = 'Recordatorio · ' + (venc ? venc + (venc > 1 ? ' mediciones vencidas' : ' medición vencida') : '') + (venc && L.length > venc ? ' y ' : '') + (L.length > venc ? (L.length - venc) + ' por vencer' : '') + ' (' + Array.from(new Set(L.map(m => m.cod))).join(', ') + ')';
    const linea = m => m.tipo + ' · ' + (nom[m.cod] || m.cod) + (m.lugar && m.lugar !== m.cod ? ' (' + m.lugar + ')' : '') + ': ' + (m.estado === 'vencida' ? 'venció el ' + rgrlTxt_(m.vence) + ' (hace ' + (-m.dias) + ' días)' : m.estado === 'porvencer' ? 'vence el ' + rgrlTxt_(m.vence) + (m.dias === 0 ? ' (hoy)' : ' (en ' + m.dias + ' días)') : 'sin fecha de vencimiento');
    const saludo = 'Buenos días:', motivo = 'Les escribo para recordarles las mediciones que están vencidas o que vencen en los próximos ' + RGRL.AVISO_DIAS + ' días:',
      pedido = 'Les pido, por favor, coordinar la medición y enviarme el protocolo firmado por el profesional, así lo cargo en el registro. Este recordatorio se repite los jueves hasta que la medición nueva quede cargada.',
      cierre = 'Quedo a disposición por cualquier consulta.', firma = 'Saludos cordiales,\nServicio de Higiene y Seguridad Laboral · HZT / HMH',
      norma = 'Normativa: ' + Array.from(new Set(L.filter(m => m.norma).map(m => m.tipo + ' (' + m.norma + ')'))).join('; ') + '. Ley 19.587 y Dto. 351/79.';
    const texto = saludo + '\n\n' + motivo + '\n\n' + L.map(m => '- ' + linea(m)).join('\n') + '\n\n' + pedido + '\n\n' + cierre + '\n\n' + firma + '\n\n' + norma;
    const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#33434C;max-width:720px"><p>' + esc_(saludo) + '</p><p>' + esc_(motivo) + '</p><ul>' + L.map(m => '<li style="margin:4px 0"><b>' + esc_(m.tipo) + '</b> · ' + esc_(nom[m.cod] || m.cod) + (m.lugar && m.lugar !== m.cod ? ' (' + esc_(m.lugar) + ')' : '') + ': ' +
      (m.estado === 'vencida' ? '<b style="color:#B4361F">venció el ' + rgrlTxt_(m.vence) + '</b>' : m.estado === 'porvencer' ? '<b style="color:#B7791F">vence el ' + rgrlTxt_(m.vence) + '</b>' : 'sin fecha de vencimiento') + (m.archivo ? ' · <a href="' + esc_(m.archivo) + '">última medición</a>' : '') + '</li>').join('') + '</ul><p>' + esc_(pedido) + '</p><p>' + esc_(cierre) + '</p><p>Saludos cordiales,<br>Servicio de Higiene y Seguridad Laboral · HZT / HMH</p>' +
      '<p style="color:#4F616B;font-size:12px">' + esc_(norma) + '</p><p><img src="cid:logo" alt="HySL · Hospitales más seguros para las personas" style="width:220px"></p></div>';
    if (!enviar) { out.push('Para: ' + para + '\nAsunto: ' + asunto + '\n\n' + texto); return; }
    try {
      const op = { htmlBody: html, name: 'Higiene y Seguridad Laboral · HZT / HMH' };
      try { op.inlineImages = { logo: DriveApp.getFileById(DGM_LOGO_PIE).getBlob() }; } catch (x) { op.htmlBody = html.replace(/<p><img[^>]*><\/p>/, ''); }
      const propia = String(Session.getEffectiveUser().getEmail()).toLowerCase();
      if (RGRL.REMITENTE.toLowerCase() !== propia) { if (GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(RGRL.REMITENTE.toLowerCase()) >= 0) op.from = RGRL.REMITENTE; else op.replyTo = RGRL.REMITENTE; }
      GmailApp.sendEmail(para, asunto, texto, op); out.push('Enviado a ' + para + ': ' + asunto);
    } catch (err) { out.push('No se pudo enviar a ' + para + ': ' + (err.message || err)); }
  });
  Logger.log(out.join('\n\n')); return out.join('\n\n');
}
// Ejecutar una vez desde el editor: crea el libro (si falta) y el disparador de los jueves a las 7 h
function prepararAvisosMediciones() {
  rgrlLibro_();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'recordarMediciones').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('recordarMediciones').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(RGRL.HORA_AVISO).nearMinute(0).create();
  const t = 'Listo: libro ' + rgrlLibro_().getUrl() + ' y recordatorio de mediciones los jueves a las ' + RGRL.HORA_AVISO + ' h.'; Logger.log(t); return t;
}
