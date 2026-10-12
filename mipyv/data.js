// ============================================================
// CONFIGURACIÓN — pegar acá la URL de implementación del Apps Script
// (ver GUIA_DESPLIEGUE.md paso 3)
// ============================================================
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzLLhU4Zgb7EsqmkBTfHc_oLxd6rJRNzfy33IRmRbrHuvJo9FD7EWqaaahROhr_Jucwrg/exec",
};

// ============================================================
// CATÁLOGOS — COPIA DE RESPALDO
// La app lee estas listas de la planilla "MIP RED HZT - Base de Datos v2"
// cada vez que se abre con señal (hojas operarios, establecimientos,
// sectores, plagas, productos y dosis_frecuencia) y guarda una copia en el
// celular. Lo que está acá abajo se usa solo si el celular nunca pudo
// descargar la planilla. Para cambiar una lista, se edita la PLANILLA.
// ============================================================

const OPERARIOS = [
  { id: "javier", nombre: "Javier Tramaleo", inicial: "J" },
  { id: "paulo", nombre: "Paulo Tramaleo", inicial: "P" },
];

const ESTABLECIMIENTOS = [
  { id: "HZT", nombre: "Hospital Zonal Trelew", tipo: "Hospital" },
  { id: "HMH", nombre: "Hospital María Humphreys", tipo: "Hospital" },
  { id: "ADOL", nombre: "Adolescencia", tipo: "Dependencia" },
  { id: "CTUT", nombre: "Casa Tutelada", tipo: "Dependencia" },
  { id: "CDIA", nombre: "Centro de Día", tipo: "Dependencia" },
  { id: "CIT", nombre: "CIT", tipo: "Dependencia" },
  { id: "HCAM", nombre: "Hilando Caminos", tipo: "Dependencia" },
  { id: "ISM", nombre: "Internación de Salud Mental", tipo: "Dependencia" },
  { id: "PANAI", nombre: "Pichi Anai", tipo: "Dependencia" },
  { id: "PROS", nombre: "PROSATE", tipo: "Dependencia" },
  { id: "UGD", nombre: "UGD - Ex APT", tipo: "Dependencia" },
  { id: "VAC", nombre: "Vacunatorio Central", tipo: "Dependencia" },
  { id: "EXADOS", nombre: "Ex Ados", tipo: "Dependencia" },
  { id: "CEXT", nombre: "Consultorios Externos", tipo: "Dependencia" },
  { id: "CAP-AMA", nombre: "CAPS Amaya", tipo: "CAP" },
  { id: "CAP-CON", nombre: "CAPS Constitución", tipo: "CAP" },
  { id: "CAP-COR", nombre: "CAPS Corradi", tipo: "CAP" },
  { id: "CAP-DBO", nombre: "CAPS Don Bosco", tipo: "CAP" },
  { id: "CAP-ETC", nombre: "CAPS Etchepare", tipo: "CAP" },
  { id: "CAP-LLO", nombre: "CAPS La Loma", tipo: "CAP" },
  { id: "CAP-PGA", nombre: "CAPS Planta de Gas", tipo: "CAP" },
  { id: "CAP-SMA", nombre: "CAPS San Martín", tipo: "CAP" },
  { id: "CAP-SAR", nombre: "CAPS Sarmiento", tipo: "CAP" },
  { id: "CAP-TFE", nombre: "CAPS Tiro Federal", tipo: "CAP" },
  { id: "CAP-VIT", nombre: "CAPS Villa Italia", tipo: "CAP" },
];

// Sectores de los hospitales (hoja sectores, aplica_hospital = SI)
const SECTORES_HZT = [
  "Administración","Admisión","Anatomía Patológica",
  "Arancelamiento / Recuperación de Prestaciones","Archivo",
  "Área Externa / Atención Comunitaria","Asesoría Legal","Bacteriología",
  "Bioingeniería / Electromedicina","Camilleros","Cardiología","Central de Esterilización",
  "Centro Obstétrico / Maternidad y Obstetricia","Centro Quirúrgico","Choferes / Ambulancias",
  "Cirugía","Clínica Médica","Clínica Quirúrgica","Cocina","Comité de Bioética",
  "Comité de Calidad y Seguridad del Paciente","Comité de Docencia e Investigación",
  "Comité de Prevención y Control de Infecciones","Compras y Contrataciones",
  "Comunicación Institucional","Consultorios Externos","Cuidados Progresivos",
  "Departamento Contable","Depósito","Diagnóstico por Imágenes","Dirección",
  "Dirección Asociada Administrativa","Dirección Asociada Médica",
  "Dispositivos Comunitarios de Salud Mental","División de Enfermería","Docencia","Ecografía",
  "Escuela Hospitalaria Domiciliaria","Estadística","Farmacia","Fonoaudiología",
  "Gestión de Pacientes","Hemoterapia","Higiene y Seguridad","Informática / Sistemas",
  "Informes / Isla de Informes","Internación de Salud Mental","Internación Pediátrica",
  "Kinesiología / Rehabilitación","Laboratorio","Lactario","Lavadero y Ropería",
  "Maestranza / Servicios Generales","Mamografía","Mantenimiento","Mesa de Entradas","Morgue",
  "Mucamas / Servicios Generales","Nefrología","Neonatología / UCIN","Nutrición y Dietoterapia",
  "Oncología","Patrimonio / Inventario","Pediatría","Personal / Recursos Humanos","Portería",
  "PROSATE","Psicología","Psiquiatría","Registro Civil","Residencias","Salud Mental",
  "Secretaría de Dirección","Seguridad / Vigilancia","Telesalud / Teleconsulta",
  "Terapia Intensiva / UTI Adultos","Terapia Intermedia de Adultos","Terapia Ocupacional",
  "Tesorería","Trabajo Social","Traumatología","UCIP","UMU / Guardia / Emergencias",
  "No corresponde","Otro",
];

// Sectores de dependencias y CAPS (hoja sectores, aplica_dependencias_caps = SI)
const SECTORES_DEPENDENCIAS = [
  "Administración","Admisión","Cocina","Consultorios Externos","Depósito",
  "Dispositivos Comunitarios de Salud Mental","Farmacia","Mantenimiento",
  "Mucamas / Servicios Generales","Portería","Psicología","Salud Mental",
  "Seguridad / Vigilancia","Trabajo Social","No corresponde","Otro",
];

const PLAGAS = [
  { id: "PLA-01", nombre: "Araña de rincón", icono: "spider" },
  { id: "PLA-02", nombre: "Viuda negra", icono: "spider" },
  { id: "PLA-03", nombre: "Cucarachas", icono: "roach" },
  { id: "PLA-04", nombre: "Roedores", icono: "rodent" },
  { id: "PLA-05", nombre: "Moscas", icono: "fly" },
  { id: "PLA-06", nombre: "Mosquitos", icono: "mosquito" },
  { id: "PLA-07", nombre: "Palomas", icono: "pigeon" },
  { id: "PLA-08", nombre: "Piojillo de paloma", icono: "mite" },
  { id: "PLA-09", nombre: "Chinche de cama", icono: "bedbug" },
  { id: "PLA-10", nombre: "Murciélagos", icono: "bat" },
  { id: "PLA-11", nombre: "Tijeretas", icono: "earwig" },
  { id: "PLA-12", nombre: "Hormigas", icono: "ant" },
];

const PRODUCTOS = [
  { id: "PRD-01", nombre: "Panic", color: "#7A4A9E", icono: "bottle" },
  { id: "PRD-02", nombre: "Sipertrin", color: "#2E7D9E", icono: "spray" },
  { id: "PRD-03", nombre: "Keeptrin", color: "#3E8E5B", icono: "spray" },
  { id: "PRD-04", nombre: "Tacazo", color: "#C0453A", icono: "bottle" },
  { id: "PRD-05", nombre: "Glacoxan H", color: "#E3A426", icono: "powder" },
  { id: "PRD-06", nombre: "K-Othrina o similar", color: "#4A7A9E", icono: "spray" },
  { id: "PRD-07", nombre: "Huagro Chipre o similar", color: "#5A9E7A", icono: "spray" },
  { id: "PRD-08", nombre: "Aquiles o similar", color: "#8A6F52", icono: "pellet" },
  { id: "PRD-09", nombre: "Geltex o similar (Gel hormiguicida)", color: "#8A5A2E", icono: "pellet" },
  { id: "PRD-10", nombre: "Chemoxane F / FumiXan Pro o similar", color: "#6E4A8A", icono: "spray" },
  { id: "PRD-11", nombre: "Ultra Plus o similar (Biorat pellet)", color: "#0D313F", icono: "pellet" },
  { id: "PRD-12", nombre: "Huagro Rat o similar", color: "#5A5A5A", icono: "pellet" },
  { id: "PRD-13", nombre: "Exclusión física / control físico", color: "#2E9E5B", icono: "shield" },
  { id: "PRD-14", nombre: "Sin aplicación (solo inspección)", color: "#5A6E7A", icono: "generic" },
];

// Catálogo técnico dosis/frecuencia por combinación plaga+producto (editable solo por HyS)
// Corregido con los datos reales del POE 2023 (ver Correccion_Catalogos.gs)
const DOSIS_FRECUENCIA = {
  "PLA-01|PRD-02": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Rincones, grietas, detrás de mobiliario" },
  "PLA-01|PRD-06": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Rincones, grietas, detrás de mobiliario" },
  "PLA-01|PRD-07": { dosis: "20 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Rincones, grietas, detrás de mobiliario" },
  "PLA-02|PRD-02": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Depósitos, exteriores, cañerías, rincones oscuros y secos" },
  "PLA-02|PRD-06": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Depósitos, exteriores, cañerías, rincones oscuros y secos" },
  "PLA-02|PRD-07": { dosis: "20 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Depósitos, exteriores, cañerías, rincones oscuros y secos" },
  "PLA-03|PRD-08": { dosis: "Aplicación puntual en grietas, zócalos, bajo mesadas y sitios estratégicos", frecuencia: "Según necesidad", puntos: "Cocinas, zócalos, desagües, bajo mesadas, motores, grietas" },
  "PLA-04|PRD-01": { dosis: "Colocación en cebaderas y trampas rodenticidas", frecuencia: "Cada 10 días", puntos: "Depósitos, residuos, cañerías, perímetro, accesos" },
  "PLA-04|PRD-11": { dosis: "Colocación en cebaderas y trampas rodenticidas", frecuencia: "Cada 10 días", puntos: "Depósitos, residuos, cañerías, perímetro, accesos" },
  "PLA-04|PRD-12": { dosis: "Colocación en cebaderas y trampas rodenticidas", frecuencia: "Cada 10 días", puntos: "Depósitos, residuos, cañerías, perímetro, accesos" },
  "PLA-05|PRD-02": { dosis: "75-100 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Residuos, patios, cocina, aberturas, lavaderos" },
  "PLA-05|PRD-06": { dosis: "75-100 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Residuos, patios, cocina, aberturas, lavaderos" },
  "PLA-05|PRD-07": { dosis: "10 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Residuos, patios, cocina, aberturas, lavaderos" },
  "PLA-06|PRD-02": { dosis: "75-100 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Patios, desagües, recipientes, áreas húmedas" },
  "PLA-06|PRD-06": { dosis: "75-100 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Patios, desagües, recipientes, áreas húmedas" },
  "PLA-06|PRD-07": { dosis: "10 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Patios, desagües, recipientes, áreas húmedas" },
  "PLA-07|PRD-13": { dosis: "Sellado de ingresos, barreras físicas y saneamiento", frecuencia: "Según necesidad", puntos: "Aleros, techos, cornisas, patios de aire" },
  "PLA-08|PRD-02": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Nidos, techos, cornisas, áreas próximas a palomares" },
  "PLA-08|PRD-06": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Nidos, techos, cornisas, áreas próximas a palomares" },
  "PLA-08|PRD-07": { dosis: "20 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Nidos, techos, cornisas, áreas próximas a palomares" },
  "PLA-09|PRD-10": { dosis: "Aplicación en ambiente cerrado según fabricante y procedimiento", frecuencia: "Según necesidad", puntos: "Camas, colchones, grietas, textiles, áreas de descanso" },
  "PLA-10|PRD-13": { dosis: "Sellado de ingresos y derivación a autoridad competente", frecuencia: "Según necesidad", puntos: "Entretechos, aleros, cámaras técnicas, cielorrasos" },
  "PLA-11|PRD-02": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Patios, bordes, grietas, sectores húmedos" },
  "PLA-11|PRD-06": { dosis: "100-150 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Patios, bordes, grietas, sectores húmedos" },
  "PLA-11|PRD-07": { dosis: "20 ml cada 5 L de agua", frecuencia: "Según necesidad", puntos: "Patios, bordes, grietas, sectores húmedos" },
  "PLA-12|PRD-05": { dosis: "Aplicación puntual en trayectorias, grietas y puntos de ingreso", frecuencia: "Cada 10 días", puntos: "Cocinas, grietas, zócalos, marcos de puertas y puntos de ingreso" },
  "PLA-12|PRD-09": { dosis: "Aplicación puntual en trayectorias, grietas y puntos de ingreso", frecuencia: "Cada 10 días", puntos: "Cocinas, grietas, zócalos, marcos de puertas y puntos de ingreso" },
};
const DOSIS_DEFAULT = { dosis: "Consultar a HyS — combinación sin definir", frecuencia: "Consultar a HyS", puntos: "—" };
// Para productos de la familia "inspeccion" (no se aplicó nada)
const DOSIS_SIN_APLICACION = { dosis: "No aplica — no se usó producto", frecuencia: "—", puntos: "—" };

// Recomendaciones de seguridad por familia de producto — se muestran al operario
// después de elegir el producto, antes de ver la dosis. Basadas en HDS + historial real.
const RECOMENDACIONES_SEGURIDAD = {
  piretroide: {
    titulo: "Piretroides (voladores/rastreros)",
    items: [
      "Ventilar el ambiente 30-60 min antes de que vuelva a entrar alguien",
      "No aplicar con pacientes, personal o alimentos expuestos en el sector",
      "Usar guantes, barbijo y anteojos durante toda la aplicación",
      "No aplicar cerca de desagües hacia el exterior",
    ],
  },
  gel: {
    titulo: "Cebos en gel (hormigas, cucarachas)",
    items: [
      "No aplicar cerca de alimentos ni utensilios de cocina",
      "Aplicar preferentemente al finalizar las tareas de cocina",
      "Revisar si hay reinfestación a las 72 horas",
      "Mantener fuera del alcance de niños y mascotas",
    ],
  },
  rodenticida: {
    titulo: "Rodenticidas (roedores)",
    items: [
      "No tocar los cebos sin guantes",
      "Señalizar bien los puntos donde se colocó cebo",
      "No dejar cebo cerca de alimentos ni al alcance de mascotas",
      "Ante ingestión accidental: CIATOX 0800-333-0160",
    ],
  },
  fumigeno: {
    titulo: "Fumígeno (chinches de cama)",
    items: [
      "Orden de inspección: baño → cocina → comedor → dormitorio",
      "No sacudir textiles: embolsar en el lugar y cerrar",
      "Ambiente cerrado, puertas internas abiertas, activar y retirarse de inmediato",
      "Ventilar 6-8 horas mínimo antes de limpiar o reingresar",
      "Revisar de nuevo a las 24-72 horas: si persiste, avisar a HyS",
    ],
  },
  fisico: {
    titulo: "Control físico (sin biocida)",
    items: [
      "No se aplican venenos ni biocidas en esta intervención",
      "Usar guantes, protección respiratoria, calzado de seguridad y mameluco",
      "Retirar nidos o excretas con precaución, evitando dispersión",
    ],
  },
  inspeccion: {
    titulo: "Inspección sin producto",
    items: [
      "No se aplica ningún producto en esta visita",
      "Usar guantes y barbijo si hay que mover muebles, cajas o revisar rincones",
      "Anotar en observaciones qué se vio y qué hace falta (producto, reparación, limpieza)",
    ],
  },
  general: {
    titulo: "Cuidados generales",
    items: [
      "No comer, beber ni fumar durante la aplicación",
      "Lavarse las manos bien después de manipular el producto",
      "Guardar el envase cerrado, en lugar fresco y seco",
      "Ante síntomas de intoxicación: CIATOX 0800-333-0160",
    ],
  },
};

// Mapea cada producto a su(s) familia(s) de recomendaciones de seguridad
const FAMILIA_PRODUCTO = {
  "PRD-01": ["rodenticida", "general"],
  "PRD-02": ["piretroide", "general"],
  "PRD-03": ["piretroide", "general"],
  "PRD-04": ["piretroide", "general"],
  "PRD-05": ["gel", "general"],
  "PRD-06": ["piretroide", "general"],
  "PRD-07": ["piretroide", "general"],
  "PRD-08": ["gel", "general"],
  "PRD-09": ["gel", "general"],
  "PRD-10": ["fumigeno", "general"],
  "PRD-11": ["rodenticida", "general"],
  "PRD-12": ["rodenticida", "general"],
  "PRD-13": ["fisico"],
  "PRD-14": ["inspeccion", "general"],
};

const EPP = [
  { id: "guantes", nombre: "Guantes", icono: "gloves" },
  { id: "barbijo", nombre: "Barbijo / respirador", icono: "mask" },
  { id: "anteojos", nombre: "Anteojos", icono: "goggles" },
  { id: "botas", nombre: "Botas", icono: "boots" },
  { id: "mameluco", nombre: "Mameluco", icono: "coverall" },
  { id: "cofia", nombre: "Cofia", icono: "cap_epp" },
  { id: "cubrezapatos", nombre: "Cubrezapatos", icono: "shoe_covers" },
];

const OBSERVACIONES_CHIPS = [
  "Sin novedad",
  "Mucho tránsito de personal",
  "Personal o pacientes presentes durante la intervención",
  "Zona de difícil acceso",
  "Alimentos expuestos",
  "Agua estancada / humedad",
  "Residuos sin disposición correcta",
  "Puntos de acceso nuevos (grietas/aberturas)",
  "Requiere seguimiento",
  "Falta de limpieza en el sector",
  "Se recomienda sellado de aberturas",
  "Reinfestación detectada",
];

// ============================================================
// MÓDULO: LIMPIEZA Y SANEAMIENTO (PROP-HYS-045 — Área Externa HZT)
// ============================================================

// Solo los 11 CAPs del Área Externa (alcance de la propuesta)
const CAPS_SANEAMIENTO = ESTABLECIMIENTOS.filter(e => e.tipo === "CAP");

const TAREAS_SANEAMIENTO = [
  { id: "predios", nombre: "Limpieza de predios", icono: "yard" },
  { id: "insecticida", nombre: "Saneamiento con insecticida doméstico", icono: "spray" },
  { id: "canerias", nombre: "Desobstrucción de cañerías", icono: "pipe" },
  { id: "tanques", nombre: "Limpieza de tanques de agua", icono: "tank" },
  { id: "roedores", nombre: "Control de roedores / sellado", icono: "rodent" },
  { id: "pluviales", nombre: "Desagües pluviales", icono: "drain" },
];

const DETALLE_CHIPS_SANEAMIENTO = [
  "Sin novedad",
  "Se retiraron residuos / escombros",
  "Agua estancada eliminada",
  "Obstrucción resuelta",
  "Tanque limpio y desinfectado",
  "Poda realizada",
  "Sellado de aberturas realizado",
  "Requiere mantenimiento (reportado)",
  "Cebaderos revisados",
  "Se relevaron nuevos puntos críticos",
  "Acceso restringido durante la tarea",
  "Queda pendiente para otro día",
];

// Chips que, al activarse, piden un detalle extra en un cuadro de texto aparte
const CHIPS_CON_DETALLE = {
  "Se relevaron nuevos puntos críticos": "¿Cuáles y por qué son un punto crítico?",
  "Requiere mantenimiento (reportado)": "¿Qué requiere mantenimiento y por qué?",
  "Queda pendiente para otro día": "¿Qué queda pendiente por hacer?",
};

// ============================================================
// OTRAS TAREAS DE HIGIENE Y SEGURIDAD
// La lista real se edita en la planilla (hoja configuracion, filas
// "tipo_tarea"). Esta es la de respaldo si nunca se pudo descargar.
// ============================================================
const TIPOS_TAREA_HYS = [
  "Control de extintores", "Señalización", "Recorrida de seguridad",
  "Traslado de residuos", "Otra",
];
// Dibujo de cada tarea, según una palabra de su nombre (si no coincide, 📋)
const EMOJI_TAREA_HYS = [
  ["extintor", "🧯"], ["señal", "⚠️"], ["recorrida", "🚶"],
  ["residuo", "🗑️"], ["otra", "✏️"],
];

// ============================================================
// AYUDA — texto simple por pantalla, para el botón "?"
// ============================================================
const AYUDA_TEXTOS = {
  home: "Tocá el cuadro de lo que vas a cargar: MIPyV si es por plagas (bichos, roedores, palomas); Limpieza y Saneamiento si es trabajo en los CAPS (predios, cañerías, tanques); u Otra tarea de Higiene y Seguridad para todo lo demás (extintores, carteles, recorridas, llevar residuos). Si no hay señal, cargá igual: queda guardado en el celular y se manda solo cuando vuelve la señal.",
  quien: "Tocá tu nombre en la lista.",
  acompanante: "Si hoy trabajaste solo/a, tocá esa opción. Si estuviste con el otro operario, tocá la otra — así queda registrado que fueron los dos.",
  horario: "Tocá para elegir la hora en que empezaste y la hora en que terminaste. Si trabajaste con el otro operario, también sus horarios.",
  "m-tipo": "¿Es un problema nuevo? Tocá \"Intervención nueva\". ¿Ya viniste antes por esta misma plaga? Tocá \"Continuar una abierta\".",
  "m-continuar-lista": "Tocá la intervención que corresponde a lo que estás por hacer ahora.",
  "m-establecimiento": "Tocá el lugar donde estás ahora.",
  "m-sector": "Tocá el sector donde interviniste. Si es un CAP, tocá el que más se parezca o escribilo.",
  "m-plaga": "Tocá la imagen de la plaga que viste.",
  "m-producto": "Tocá la imagen del producto que usaste. Si no usaste ninguno (solo revisaste), tocá «Sin aplicación (solo inspección)».",
  "m-seguridad": "Leé los cuidados de este producto antes de aplicarlo. Después tocá \"Siguiente\".",
  "m-dosis": "Esta es la dosis correcta, ya viene puesta. No hace falta que hagas nada, solo tocá \"Siguiente\".",
  "m-epp": "Tocá todos los elementos de protección que usaste (podés tocar varios). Después ajustá la cantidad con los botones + y -.",
  "m-resultado": "Tocá cómo quedó la situación.",
  "m-foto": "Tocá el recuadro con el + para sacar una foto. Podés sacar hasta 5. Para borrar una, tocá la X. Si no hace falta foto, tocá \"Siguiente\".",
  "m-obs": "Si querés, tocá algún cartelito o escribí una nota. No es obligatorio, podés tocar \"Siguiente\" igual.",
  "m-confirm": "Revisá los datos. Si algo está mal, volvé con la flecha ←. Si está todo bien, tocá \"Enviar\".",
  "m-sent": "Listo, la visita quedó guardada. Si arriba dice \"sin enviar\", no pasa nada: se manda sola cuando haya señal. No borres la app ni los datos del navegador mientras haya registros sin enviar.",
  "s-tipo": "¿Empezás hoy? Tocá \"Iniciar trabajo nuevo\". ¿Ya venías con este trabajo? Tocá \"Continuar un trabajo abierto\".",
  "s-cap-nuevo": "Tocá el CAP donde estás.",
  "s-cap-continuar": "Tocá el trabajo que vas a seguir.",
  "s-tareas": "Tocá todas las tareas que hiciste hoy (podés tocar varias).",
  "s-producto": "Tocá la imagen del producto que usaste. Si no usaste ninguno, tocá «Sin aplicación (solo inspección)».",
  "s-seguridad": "Leé los cuidados de este producto antes de aplicarlo. Después tocá \"Siguiente\".",
  "s-dosis": "Esta es la dosis correcta, ya viene puesta. No hace falta que hagas nada, solo tocá \"Siguiente\".",
  "s-epp": "Tocá todos los elementos de protección que usaste. Después ajustá la cantidad con los botones + y -.",
  "s-detalle": "Tocá los cartelitos que correspondan. Si tocás uno con ❓, escribí abajo qué pasó (es obligatorio). Podés sacar hasta 5 fotos con el recuadro +.",
  "s-cierre": "¿Vas a seguir otro día en este CAP? Tocá \"Continúa otro día\". ¿Ya terminaste? Tocá \"Terminado\".",
  "s-confirm": "Revisá los datos. Si algo está mal, volvé con la flecha ←. Si está todo bien, tocá \"Enviar\".",
  "h-tipo": "Tocá la tarea que hiciste. Si no está en la lista, tocá «Otra» y después escribí qué hiciste.",
  "h-lugares": "Tocá todos los lugares donde hiciste esta tarea. Podés tocar varios: se marcan con un tilde ✓. Para sacar uno, tocalo de nuevo. Arriba podés filtrar por Hospital, Dependencia o CAPS.",
  "h-extintores": "En cada lugar, mirá el extintor y tocá Sí o No en cada pregunta. Chapa baliza: el cartel rojo y blanco de la pared que marca dónde está. Colgado: que esté en su soporte, no en el piso. Fácil de agarrar: que no haya nada adelante. Vencimiento: la fecha de la tarjeta o etiqueta de la carga. Si no se puede leer, tocá «No se puede leer».",
  "h-detalle": "Escribí con tus palabras qué hiciste. Podés sacar hasta 5 fotos con el recuadro +.",
  "h-hallazgos": "Si viste algo mal, escribilo. Si está todo bien, dejalo vacío y tocá \"Siguiente\". Lo que salió mal en los extintores ya está anotado solo.",
  "h-confirm": "Revisá los datos. Si algo está mal, volvé con la flecha ←. Si está todo bien, tocá \"Enviar\".",
  "h-sent": "Listo, la tarea quedó guardada. Si arriba dice \"sin enviar\", no pasa nada: se manda sola cuando haya señal. No borres la app ni los datos del navegador mientras haya registros sin enviar.",
  "s-sent": "Listo, el avance quedó guardado. Si arriba dice \"sin enviar\", no pasa nada: se manda solo cuando haya señal. No borres la app ni los datos del navegador mientras haya registros sin enviar.",
};
