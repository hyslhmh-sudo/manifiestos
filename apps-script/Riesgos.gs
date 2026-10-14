/**
 * SISTEMA HyS · RIESGOS · NTE (Nómina de Trabajadores Expuestos)
 * Formato del Autoseguro Público Provincial Chubut (Res. SRT 37/2010 y 81/2019): toda la dotación, códigos ESOP o «NO EXPUESTO».
 * 1. Catálogo ESOP oficial (Res. SRT 81/2019, Anexo III) en BASE COMÚN › ESOP (editable).
 * 2. Matriz de exposición por puesto en BASE DE TRABAJADORES › MATRIZ_EXPOSICION: una fila por establecimiento + servicio + función,
 *    con los códigos que corresponden (o «NO EXPUESTO»). Si una persona tiene AGENTES_ESOP propio en su ficha, manda lo de la persona.
 *    La columna SUGERENCIA es solo orientativa: los códigos los define Higiene y Seguridad.
 * 3. Controles antes de generar: CUIL, fecha de ingreso, sector, puesto, combinaciones sin definir y códigos inválidos.
 * 4. Genera la planilla en Drive (MÓDULO 4 · PERSONAL Y RAR › NTE › establecimiento; antes, carpeta del establecimiento › NTE), con número HYSL (bloque RIE, tipo NE). Nunca se envía sola.
 * 5. Matriz compartida: si en ESTABLECIMIENTOS la columna MATRIZ_COMPARTIDA de un establecimiento dice otro código (HMH → HZT),
 *    los dos usan la misma matriz y salen en la misma NTE (mismo hospital, personal que rota).
 * 6. Una hoja de NTE por lugar (edificio, CAPS o dispositivo), porque el Autoseguro pide la nómina por establecimiento:
 *    manda el SITIO de la persona (BASE COMÚN › SITIOS › EDIFICIO); si no tiene, el servicio (BASE COMÚN › SERVICIOS_EDIFICIO);
 *    si ninguno alcanza, va al hospital de su hoja y queda marcada en CONTROLES como «sin edificio confirmado».
 */

const NTE_ESOP_OFICIAL = '40001|ACEITES MINERALES|QUIMICOS|;40002|ACIDO CIANHÍDRICO|QUIMICOS|;40003|ACIDO CLORHÍDRICO|QUIMICOS|;40004|ACIDO FLUORHÍDRICO|QUIMICOS|;40005|ACIDO FOSFÓRICO|QUIMICOS|;40006|ACIDO MERCAPTOPROPIÓNICO|QUIMICOS|;40007|ACIDO NÍTRICO|QUIMICOS|;40008|ACIDO PERCLÓRICO|QUIMICOS|;40009|ACIDO SULFÚRICO|QUIMICOS|;40010|ACRILONITRILO|QUIMICOS|;40011|ALCOHOL BUTÍLICO|QUIMICOS|;40012|ALCOHOL FURFURÍLICO|QUIMICOS|;40013|ALCOHOL ISOPROPÍLICO|QUIMICOS|;40014|ALCOHOL METÍLICO|QUIMICOS|;40015|ALCOHOL PROPÍLICO|QUIMICOS|;40016|ALGODÓN|QUIMICOS|;40017|ALÚMINA CALCINADA|QUIMICOS|;40019|AMINAS AROMÁTICAS Y DERIVADOS|QUIMICOS|;40020|AMONÍACO (GAS)|QUIMICOS|;40021|AMONIOS CUATERNARIOS|QUIMICOS|;40022|ANHÍDRIDO FTÁLICO|QUIMICOS|;40023|ANHÍDRIDO HEXAHIDROFTÁLICO|QUIMICOS|;40024|ANHÍDRIDO HIMICO|QUIMICOS|;40025|ANHÍDRIDO SULFUROSO|QUIMICOS|;40026|ANHÍDRIDOS TRIMELÍTICOS|QUIMICOS|;40027|ANILINA|QUIMICOS|;40028|ANTIBIÓTICOS MACRÓLIDOS|QUIMICOS|;40029|ANTIMONIO|QUIMICOS|;40031|Asbestos (en todas sus formas) y sustancias minerales que contengan asbesto|QUIMICOS|C;40033|AZODICARBONAMIDA|QUIMICOS|;40034|AZÚCARES|QUIMICOS|;40035|Berilio y sus compuestos|QUIMICOS|C;40036|Benceno|QUIMICOS|C;40039|BENZONITRILOS|QUIMICOS|;40040|BROMOXINIL|QUIMICOS|;40041|BROMURO DE METILO|QUIMICOS|;40042|BISULFITOS|QUIMICOS|;40043|Bifenilos policlorados|QUIMICOS|C;40044|Cadmio y sus compuestos|QUIMICOS|C;40045|CAÑAMO|QUIMICOS|;40046|CAOLIN|QUIMICOS|;40047|CARBARIL|QUIMICOS|;40048|CARBÓN MINERAL|QUIMICOS|;40049|CEMENTO|QUIMICOS|;40050|CETONAS|QUIMICOS|;40051|CIANOACRILATOS|QUIMICOS|;40052|CIANUROS|QUIMICOS|;40053|CLORO (GAS)|QUIMICOS|;40054|Bis(clorometil)eter, clorometil metil eter (grado técnico)|QUIMICOS|C;40055|CLOROPLATINATO|QUIMICOS|;40056|CLORPIRIFOS|QUIMICOS|;40057|CLORURO DE METILENO|QUIMICOS|;40058|Cloruro de vinilo|QUIMICOS|C;40059|Carburo de Cobalto|QUIMICOS|;40061|CROMO Y SUS COMPUESTOS|QUIMICOS|;40062|DDT|QUIMICOS|;40063|DERIVADOS DEL FENOL|QUIMICOS|;40064|DERIVADOS DEL PETRÓLEO|QUIMICOS|;40065|DIACRILATOS|QUIMICOS|;40066|DIAZINON|QUIMICOS|;40067|DIAZONIO (SALES DE)|QUIMICOS|;40068|DICICLO HEXIL CARBONIMIDA (CARBODIIMIDA)|QUIMICOS|;40069|1,2-DICLOROETANO|QUIMICOS|;40071|1,2-Dicloropropano|QUIMICOS|C;40072|DICLORVOS|QUIMICOS|;40073|DICLOROETILENO|QUIMICOS|;40074|DIELDRIN|QUIMICOS|;40075|DIISOCIANATO DE HEXAMETILENO|QUIMICOS|;40076|DINITROFENOL Y DERIVADOS|QUIMICOS|;40077|DINITRO ORTO CRESOL|QUIMICOS|;40078|DINOSEB|QUIMICOS|;40079|DIÓXIDO DE NITRÓGENO|QUIMICOS|;40080|DISULFURO DE CARBONO|QUIMICOS|;40081|DITIOCARBAMATOS|QUIMICOS|;40082|DODECIL-AMINO-ETIL-GLICINA|QUIMICOS|;40083|EPICLORHÍDRINA|QUIMICOS|;40084|ESMERIL|QUIMICOS|;40085|ESTIRENO (VINILBENCENO)|QUIMICOS|;40086|ESTRÓGENOS DE SÍNTESIS|QUIMICOS|;40087|ETERES|QUIMICOS|;40088|FENOTIAZINAS|QUIMICOS|;40089|FLUOR (GAS)|QUIMICOS|;40090|FLUOR Y DERIVADOS|QUIMICOS|;40091|FLUORUROS|QUIMICOS|;40092|Formaldehido|QUIMICOS|C;40093|FÓSFORO Y SUS COMPUESTOS|QUIMICOS|;40094|FOSFUROS|QUIMICOS|;40095|FURFURAL|QUIMICOS|;40096|Producción de coque|QUIMICOS|C;40097|GRANITO|QUIMICOS|;40098|HEXA CLORO BENCENO|QUIMICOS|;40099|HEXA CLORO NAFTALENO|QUIMICOS|;40100|N-HEXANO|QUIMICOS|;40101|HIDROCARBUROS AROMÁTICOS POLICÍCLICOS|QUIMICOS|;40102|HIDRÓGENO SELENIADO|QUIMICOS|;40103|HIDRÓGENO SULFURADO|QUIMICOS|;40104|HIDROQUINONA|QUIMICOS|;40105|HIPOCLORITOS ALCALINOS|QUIMICOS|;40106|HIPOPIGMENTANTES DE PIEL|QUIMICOS|;40107|INSECTICIDAS CARBAMATOS|QUIMICOS|;40108|INSECTICIDAS ORGANOFOSFORADOS|QUIMICOS|;40109|ISOCIANATOS ORGÁNICOS|QUIMICOS|;40110|N-ISOPROPIL-N-PARAFENILENDIAMINA|QUIMICOS|;40111|IOXINIL|QUIMICOS|;40112|Lindano|QUIMICOS|C;40113|LINO|QUIMICOS|;40114|MALATHION|QUIMICOS|;40115|MANGANESO|QUIMICOS|;40116|MERCAPTO BENZOTIAZOL|QUIMICOS|;40117|MERCURIO INORGÁNICO|QUIMICOS|;40119|METACRILATO DE BUTILO|QUIMICOS|;40120|METACRILATO DE ETILO|QUIMICOS|;40121|METACRILATO DE METILO|QUIMICOS|;40122|METIL-BUTIL-CETONA|QUIMICOS|;40123|METILENO DIFENIL ISOCIANATO|QUIMICOS|;40124|METOMIL|QUIMICOS|;40125|MICA|QUIMICOS|;40126|MONOCLOROBENCENO|QUIMICOS|;40127|MONOCROTOPHOS|QUIMICOS|;40128|MONÓXIDO DE CARBONO|QUIMICOS|;40129|NIEBLAS Y AEROSOLES DE ÁCIDOS MINERALES|QUIMICOS|;40130|Compuestos de níquel|QUIMICOS|C;40131|NITRATOS ALIFÁTICOS|QUIMICOS|;40132|NITROBENCENO|QUIMICOS|;40134|NITRODERIVADOS AROMÁTICOS|QUIMICOS|;40135|NITROGLICERINA|QUIMICOS|;40136|Óxido de etileno|QUIMICOS|C;40137|OXIDO DE HIERRO|QUIMICOS|;40138|PARA-TERT-BUTIL-CATECOL|QUIMICOS|;40139|PARA-TER-BUTIL-FENOL|QUIMICOS|;40140|PARATHION|QUIMICOS|;40141|PENICILINA Y SUS SALES|QUIMICOS|;40142|Pentaclorofenol|QUIMICOS|C;40143|PENTÓXIDO DE VANADIO|QUIMICOS|;40144|PERSULFATOS ALCALINOS|QUIMICOS|;40145|PLOMO (COMPUESTOS ALQUÍLICOS)|QUIMICOS|;40146|PLOMO (COMPUESTOS INORGÁNICOS)|QUIMICOS|;40147|POLVOS ABRASIVOS|QUIMICOS|;40148|PROPOXUR|QUIMICOS|;40149|RANITIDINA|QUIMICOS|;40150|RESINAS EPOXICAS|QUIMICOS|;40151|SELENIO|QUIMICOS|;40152|SERICINA|QUIMICOS|;40153|Polvo de sílice cristalina, en forma de cuarzo o cristobalita|QUIMICOS|C;40154|SISAL|QUIMICOS|;40155|SULFITOS|QUIMICOS|;40156|SULFURO DE TETRAMETIL TIOURAM|QUIMICOS|;40157|SUSTANCIAS NOCIVAS PARA EL ESMALTE Y LA ESTRUCTURA DE LOS DIENTES|QUIMICOS|;40158|SUSTANCIAS SENSIBILIZANTES DE LA PIEL|QUIMICOS|;40159|SUSTANCIAS SENSIBILIZANTES DEL PULMÓN|QUIMICOS|;40160|SUSTANCIAS SENSIBILIZANTES DE LAS VÍAS RESPIRATORIAS|QUIMICOS|;40161|TALCO|QUIMICOS|;40162|TEFLÓN|QUIMICOS|;40164|TETRACLORURO DE CARBONO|QUIMICOS|;40165|TIOGLICOLATO DE AMONIO|QUIMICOS|;40166|TIOUREA (DERIVADOS)|QUIMICOS|;40167|Carburo de Titanio|QUIMICOS|;40168|TOLUENO|QUIMICOS|;40169|TOLUEN DIISOCIANATO|QUIMICOS|;40170|Orto-Toluidina|QUIMICOS|C;40171|TRIBROMOMETANO|QUIMICOS|;40172|1,1,1-TRICLOROETANO|QUIMICOS|;40173|Tricloroetileno|QUIMICOS|C;40174|TRICLOROMETANO|QUIMICOS|;40175|TRINITROTOLUENO|QUIMICOS|;40176|Carburo de Tungsteno (Wolframio)|QUIMICOS|;40179|XILENO|QUIMICOS|;40180|CEFALOSPORINAS Y SUS DERIVADOS|QUIMICOS|;40181|ENZIMAS DE ORIGEN VEGETAL, ANIMAL O BACTERIANO|QUIMICOS|;40182|SUSTANCIAS IRRITANTES DE LAS VÍAS RESPIRATORIAS|QUIMICOS|;40183|MONOBROMOBENCENO|QUIMICOS|;40184|TRICLOROETANO|QUIMICOS|;40185|ACRILATOS|QUIMICOS|;40186|BENZOQUINONA|QUIMICOS|;40187|DINITROTOLUENO|QUIMICOS|;40188|FENOL|QUIMICOS|;40189|METACRILATOS|QUIMICOS|;40190|DINITROBENCENO|QUIMICOS|;40191|ALCOHOL ISOBUTILICO|QUIMICOS|;40192|HARINAS|QUIMICOS|;40193|TETRACLOROETILENO (PERCLOROETILENO)|QUIMICOS|;40201|Aceites minerales no tratados o medianamente tratados|QUIMICOS|C;40202|Fabricación de Alcohol Isopropílico usando ácidos fuertes|QUIMICOS|C;40203|Alquitrán de hulla|QUIMICOS|C;40204|4-Aminobifenilo|QUIMICOS|C;40206|Producción de auramina|QUIMICOS|C;40207|Bencidina|QUIMICOS|C;40208|Compuestos de cromo (VI)|QUIMICOS|C;40210|Gas Mostaza|QUIMICOS|C;40211|Minería subterránea de la hematita|QUIMICOS|C;40212|Hollín (exposición ocupacional en el barrido de chimeneas)|QUIMICOS|C;40213|Producción de magenta|QUIMICOS|C;40214|2-Naftilamina|QUIMICOS|C;40216|Radón-222 y sus productos de decaimiento|QUIMICOS|C;40218|OTROS AGENTES QUIMICOS (no incluidos en el decreto 658/96 y sus modificatorios)|QUIMICOS|;40219|OTROS AGENTES QUIMICOS FARMACOLOGICOS (no incluidos en el decreto 658/96 y sus modificatorios)|QUIMICOS|;40220|Exposición ocupacional asociada al Proceso Acheson|QUIMICOS|C;40221|1,3-Butadieno|QUIMICOS|C;40222|2,3,4,7,8-Pentaclorodibenzofurano|QUIMICOS|C;40223|2,3,7,8-Tetraclorodibenzo-p-dioxina|QUIMICOS|C;40224|3,4,5,3´,4´-Pentaclorobifenilo (PCB126)|QUIMICOS|C;40225|4,4´-Metilenbis(2-cloroanilina) (MOCA)|QUIMICOS|C;40226|Arsénico y sus compuestos inorgánicos|QUIMICOS|C;40227|Azatioprina|QUIMICOS|C;40228|Benzo [a] Pireno|QUIMICOS|C;40229|Bifenilos Policlorados, como dioxina, con TEF según OMS|QUIMICOS|C;40230|Busulfan|QUIMICOS|C;40231|Ciclofosfamida|QUIMICOS|C;40232|Ciclosporina|QUIMICOS|C;40233|Clorambucil|QUIMICOS|C;40234|Colorantes que se metabolizan a Bencidina|QUIMICOS|C;40235|Destilación de alquitrán de hulla|QUIMICOS|C;40236|Erionita|QUIMICOS|C;40237|Etopósido|QUIMICOS|C;40238|Etopósido en combinación con cisplatino y bleomicina|QUIMICOS|C;40239|Fibras anfíboles de fluoro-edenita|QUIMICOS|C;40240|Fósforo-32, como fosfato|QUIMICOS|C;40241|Gasificación del carbón|QUIMICOS|C;40242|Humo de tabaco, ajeno|QUIMICOS|C;40243|Iodos radiactivos, incluido el Iodo-131|QUIMICOS|C;40244|Melfalán|QUIMICOS|C;40245|Nieblas de ácidos inorgánicos fuertes|QUIMICOS|C;40246|N-Nitrosonornicotina (NNN) y NNK|QUIMICOS|C;40247|Plutonio|QUIMICOS|C;40248|Productos de fisión, incluido el Estroncio-90|QUIMICOS|C;40249|Radio-224 y sus productos de decaimiento|QUIMICOS|C;40250|Radio-226 y sus productos de decaimiento|QUIMICOS|C;40251|Radio-228 y sus productos de decaimiento|QUIMICOS|C;40252|Radionucleidos, emisores de partículas Alfa, internamente depositados|QUIMICOS|C;40253|Radionucleidos, emisores de partículas Beta, internamente depositados|QUIMICOS|C;40254|Torio-232 y sus productos de decaimiento|QUIMICOS|C;40255|Aflatoxinas|QUIMICOS|C;60001|BRUCELLA|BIOLOGICOS|;60002|VIRUS DE LA HEPATITIS A|BIOLOGICOS|;60004|BACILUS ANTHRACIS (carbunclo)|BIOLOGICOS|;60005|MYCOBACTERIUM TUBERCULOSIS|BIOLOGICOS|;60006|LEPTOSPIRA (leptospirosis)|BIOLOGICOS|;60007|CLAMYDIA PSITTACI (psitacosis)|BIOLOGICOS|;60008|HISTOPLASMA CAPSULATUM (histoplasmosis)|BIOLOGICOS|;60009|CESTODES: equinococus granulosus, equinococus multilocularis (HIDATIDOSIS)|BIOLOGICOS|;60010|PLASMODIUM (paludismo)|BIOLOGICOS|;60011|LEISHMANIA DONOVANI CHAGASI (leishmaniasis)|BIOLOGICOS|;60012|VIRUS AMARILICOS (fiebre amarilla)|BIOLOGICOS|;60013|ARBOVIRUS - ADENOVIRUS - VIRUS JUNIN (fiebre hemorrágica argentina)|BIOLOGICOS|;60014|CITOMEGALOVIRUS|BIOLOGICOS|;60015|VIRUS DE LA INMUNODEFICIENCIA HUMANA (HIV)|BIOLOGICOS|;60016|VIRUS DEL HERPES SIMPLE|BIOLOGICOS|;60017|CANDIDA ALBICANS|BIOLOGICOS|;60018|HANTAVIRUS|BIOLOGICOS|;60019|TRYPANOSOMA CRUZI|BIOLOGICOS|;60020|OTROS AGENTES BIOLOGICOS (no incluidos en el decreto 658/96 y sus modificatorios)|BIOLOGICOS|;60021|Virus de la Hepatitis B (infección crónica)|BIOLOGICOS|C;60022|Virus de la Hepatitis C (infección crónica)|BIOLOGICOS|C;60030|OTROS AGENTES BIOLOGICOS BACTERIANOS (no incluidos en el decreto 658/96)|BIOLOGICOS|;60040|OTROS AGENTES BIOLOGICOS VIRALES (no incluidos en el decreto 658/96)|BIOLOGICOS|;60050|OTROS AGENTES BIOLOGICOS MICOLOGICOS (no incluidos en el decreto 658/96)|BIOLOGICOS|;60060|OTROS AGENTES BIOLOGICOS PARASITARIOS (no incluidos en el decreto 658/96)|BIOLOGICOS|;60070|PRIONES|BIOLOGICOS|;80001|CALOR|TERMOHIGROMETRICOS Y OTROS|;80002|PRESION SUPERIOR A LA PRESION ATMOSFERICA ESTANDAR|TERMOHIGROMETRICOS Y OTROS|;80003|PRESION INFERIOR A LA PRESION ATMOSFERICA ESTANDAR|TERMOHIGROMETRICOS Y OTROS|;80004|POSICIONES FORZADAS Y GESTOS REPETITIVOS EN EL TRABAJO I (extremidad superior)|TERMOHIGROMETRICOS Y OTROS|;80005|POSICIONES FORZADAS Y GESTOS REPETITIVOS EN EL TRABAJO II (extremidad inferior)|TERMOHIGROMETRICOS Y OTROS|;80006|SOBRECARGA DEL USO DE LA VOZ|TERMOHIGROMETRICOS Y OTROS|;80007|OTROS AGENTES TERMOHIGROMETRICOS (no incluidos en el decreto 658/96)|TERMOHIGROMETRICOS Y OTROS|;80009|AUMENTO DE LA PRESIÓN INTRAABDOMINAL|TERMOHIGROMETRICOS Y OTROS|;80010|AUMENTO DE LA PRESIÓN VENOSA EN MIEMBROS INFERIORES|TERMOHIGROMETRICOS Y OTROS|;80011|CARGA, POSICIONES FORZADAS Y GESTOS REPETITIVOS DE LA COLUMNA VERTEBRAL LUMBOSACRA|TERMOHIGROMETRICOS Y OTROS|;80020|OTROS AGENTES ERGONOMICOS (no incluidos en el decreto 658/96)|TERMOHIGROMETRICOS Y OTROS|;90001|RUIDO|FISICOS|;90002|Radiaciones ionizantes|FISICOS|C;90003|RADIACIONES INFRARROJAS|FISICOS|;90004|Radiación ultravioleta (100-400 nm: UVA, UVB y UVC)|FISICOS|C;90005|RAYOS LASER|FISICOS|;90006|ILUMINACION INSUFICIENTE|FISICOS|;90007|VIBRACIONES TRANSMITIDAS A LA EXTREMIDAD SUPERIOR POR MAQUINARIAS Y HERRAMIENTAS|FISICOS|;90008|VIBRACIONES DE CUERPO ENTERO|FISICOS|;90009|OTROS AGENTES FISICOS (no incluidos en el decreto 658/96)|FISICOS|;90010|Radiación neutrónica|FISICOS|C;90011|Rayos X y Radiación Gamma|FISICOS|C';
const NTE_MAT_H = ['ESTABLECIMIENTO', 'SERVICIO', 'FUNCION', 'PERSONAS', 'AGENTES_ESOP', 'CRITERIO', 'SUGERENCIA', 'ACTUALIZADO'];
const NTE_TODOS = '(todos los servicios)';
// Sugerencia orientativa (decide Higiene y Seguridad): suma los agentes que corresponden a la función y al servicio
function nteSugerir_(servicio, funcion) {
  // «no médico» no cuenta como médico; las funciones sin contacto con pacientes ni muestras se sugieren NO EXPUESTO
  const fn = String(funcion || '').replace(/no m[eé]dic[oa]s?/ig, ' '), t = fn + ' ' + String(servicio || ''), set = new Set();
  const admin = /administr|contador|cadete|secretar|inform[aá]t|estad[ií]st|tesorer|compras|recursos humanos|gesti[oó]n de la inf|radio ?operador|porter|seguridad|operador.{0,3} de apoyo|comunitari|psic[oó]log|trabaj.{0,6}social|servicio social|fonoaudi|docente|sociol|abogad/i.test(fn);
  if (!admin) {
    if (/enfermer|m[eé]dic|medicina|odont|bioq|laborator|hemoterap|instrument|kinesi|obst[eé]tr|partera|tocogin|pediatr|cirug|cl[ií]nica|anestes|neonat|residencia|vacun|asistente dental|camiller|inmunohemat|hemato|t[eé]cnico en salud|extracc/i.test(fn)) { set.add('60021'); set.add('60022'); }
    if (/mucam|limpieza|maestranza|lavand|roper|pe[oó]n|costurer/i.test(fn)) { set.add('60021'); set.add('60022'); set.add('40105'); }
    if (/rayos|radiolog|im[aá]gen|tomograf|mamograf/i.test(t)) set.add('90011');
    if (/anatom[ií]a patol/i.test(t)) set.add('40092');
    if (/esteriliz|cocin/i.test(t)) set.add('80001');
    if (/mantenimiento|soldad|electric|taller|herrer/i.test(t)) set.add('90001');
  }
  return set.size ? Array.from(set).sort().join(' · ') : (admin ? 'NO EXPUESTO' : '');
}
const nteFuncion_ = o => o.FUNCION || o.FUNCION_DETALLE || 's/d';

// ------------------------------------------------------------------ Catálogo ESOP
function nteCatalogo_() {
  const bc = pBC_(); let sh = bc.getSheetByName('ESOP');
  if (!sh) {
    sh = bc.insertSheet('ESOP');
    sh.getRange(1, 1).setValue('Códigos ESOP · Listado de agentes de riesgo').setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue('Fuente: Res. SRT 81/2019, Anexo III (el mismo listado que adjunta el Autoseguro Público Provincial). Si la SRT lo actualiza, se corrige acá. CANCERIGENO = agente de la Res. SRT 81/2019 (Registro de Agentes Cancerígenos).').setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, 5).setValues([['ESOP', 'AGENTE', 'TIPO', 'CANCERIGENO_RES_81_19', 'ACTIVO']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    const filas = NTE_ESOP_OFICIAL.split(';').map(s => { const p = s.split('|'); return [p[0], p[1], p[2], p[3] ? 'Sí' : '', 'Sí']; });
    sh.getRange(6, 1, filas.length, 5).setValues(filas); sh.setFrozenRows(5); sh.setColumnWidth(2, 520);
  }
  const m = {}; pTabla_(sh, 5).forEach(r => { if (String(r.v[4]) !== 'No') m[String(r.v[0]).trim()] = { agente: String(r.v[1]), tipo: String(r.v[2]), c: String(r.v[3]) === 'Sí' }; });
  return m;
}

// ------------------------------------------------------------------ Matriz de exposición por puesto
function nteHojaMatriz_() {
  const bt = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('BASE_TRABAJADORES_ID')); let sh = bt.getSheetByName('MATRIZ_EXPOSICION');
  if (!sh) {
    sh = bt.insertSheet('MATRIZ_EXPOSICION');
    sh.getRange(1, 1).setValue('Matriz de exposición por puesto (para la NTE)').setFontSize(16).setFontWeight('bold').setFontColor('#0D313F');
    sh.getRange(2, 1).setValue('Las filas «(todos los servicios)» valen para esa función en todo el establecimiento; una fila con servicio es una excepción y manda sobre la general. AGENTES_ESOP: códigos separados por «·» o la leyenda NO EXPUESTO. SUGERENCIA es solo orientativa: decide Higiene y Seguridad. Si una persona tiene AGENTES_ESOP en su ficha, manda lo de la persona.').setFontStyle('italic').setFontColor('#4F616B');
    sh.getRange(5, 1, 1, NTE_MAT_H.length).setValues([NTE_MAT_H]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0D313F');
    sh.setFrozenRows(5);
  }
  return sh;
}
const nteClave_ = (cod, s, f) => [cod, sinTildes_(s), sinTildes_(f)].join('|');

// Grupo de establecimientos que comparten matriz y NTE (ESTABLECIMIENTOS › MATRIZ_COMPARTIDA). El dueño es el código cuya matriz se usa.
function nteGrupo_(cod) {
  cod = limpio_(cod);
  const sh = pBC_().getSheetByName('ESTABLECIMIENTOS'), H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String), j = H.indexOf('MATRIZ_COMPARTIDA'), duenoDe = {};
  pTabla_(sh, H.length).forEach(r => { const c = limpio_(r.v[0]); if (c) duenoDe[c] = j >= 0 && limpio_(r.v[j]) ? limpio_(r.v[j]) : c; });
  const d = duenoDe[cod] || cod, cods = Object.keys(duenoDe).filter(c => duenoDe[c] === d || c === d);
  if (cods.indexOf(d) < 0) cods.push(d);
  return { duenio: d, codigos: cods.sort((a, b) => a === d ? -1 : b === d ? 1 : a.localeCompare(b)) };
}
function nteActivos_(cod) {
  const sh = bjHojaTrab_(cod), H = bjCabTrab_(sh), g = c => H.indexOf(c);
  return { H: H, filas: pTabla_(sh, H.length).filter(r => !/baja/i.test(String(r.v[g('ESTADO')]))).map(r => { const o = { fila: r.fila, _hoja: cod }; H.forEach((h, j) => o[h] = bjVal_(r.v[j])); return o; }) };
}
const nteActivosGrupo_ = G => G.codigos.reduce((A, c) => A.concat(nteActivos_(c).filas), []);

// Agrega a la matriz las combinaciones nuevas del grupo y actualiza la cantidad de personas (no toca los códigos ya cargados)
// Con candado: si el portal pide la matriz dos veces a la vez, la segunda espera y no duplica filas.
function nteMatriz_(cod) { return conLock_(() => nteMatrizSinLock_(cod)); }
function nteMatrizSinLock_(cod) {
  const G = nteGrupo_(cod), d = G.duenio, sh = nteHojaMatriz_(), ex = pTabla_(sh, NTE_MAT_H.length), idx = {}, dup = {};
  ex.forEach(r => { const k = nteClave_(r.v[0], r.v[1], r.v[2]); if (idx[k]) dup[r.fila] = true; else idx[k] = r; });   // si hubiera filas repetidas, vale la primera
  const cuenta = {}; nteActivosGrupo_(G).forEach(o => { const s = o.SERVICIO || 's/d', f = nteFuncion_(o);
    [[s, f], [NTE_TODOS, f]].forEach(([ss, ff]) => { const k = nteClave_(d, ss, ff); (cuenta[k] = cuenta[k] || { s: ss, f: ff, n: 0 }).n++; }); });
  const nuevas = [], hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
  Object.keys(cuenta).forEach(k => { const c = cuenta[k];
    if (idx[k]) { sh.getRange(idx[k].fila, 4).setValue(c.n);
      // mientras Higiene y Seguridad no cargó códigos, la sugerencia de las filas generales se recalcula
      if (c.s === NTE_TODOS && !String(idx[k].v[4] || '').trim()) sh.getRange(idx[k].fila, 7).setValue(nteSugerir_('', c.f)); }
    else nuevas.push([d, c.s, c.f, c.n, '', '', c.s === NTE_TODOS ? nteSugerir_('', c.f) : '', hoy]); });
  ex.filter(r => r.v[0] === d && (dup[r.fila] || !cuenta[nteClave_(r.v[0], r.v[1], r.v[2])])).forEach(r => sh.getRange(r.fila, 4).setValue(0));
  if (nuevas.length) sh.getRange(Math.max(sh.getLastRow(), 5) + 1, 1, nuevas.length, NTE_MAT_H.length).setValues(nuevas);
  return pTabla_(sh, NTE_MAT_H.length).filter(r => r.v[0] === d && !dup[r.fila]).map(r => ({ fila: r.fila, servicio: bjVal_(r.v[1]), funcion: bjVal_(r.v[2]), personas: Number(r.v[3]) || 0, agentes: bjVal_(r.v[4]), criterio: bjVal_(r.v[5]), sugerencia: bjVal_(r.v[6]) }));
}
function nteGuardarMatriz_(x) {
  const cat = nteCatalogo_(), sh = nteHojaMatriz_(), hoy = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'), errores = [], d = nteGrupo_(x.cod).duenio;
  return conLock_(() => { (x.filas || []).forEach(f => {
    const ag = nteNormalizar_(f.agentes); if (ag.invalidos.length) { errores.push(f.servicio + ' · ' + f.funcion + ': código(s) que no están en el listado ESOP: ' + ag.invalidos.join(', ')); return; }
    const r = sh.getRange(f.fila, 1, 1, 3).getValues()[0]; if (String(r[0]) !== String(d)) return;
    sh.getRange(f.fila, 5, 1, 2).setValues([[ag.texto, String(f.criterio || '').trim()]]); sh.getRange(f.fila, 8).setValue(hoy); });
    return errores.length ? { ok: false, mensaje: errores.join(' ') } : { ok: true }; });
  function nteNormalizar_(t) { t = String(t || '').trim(); if (/^no expuest/i.test(t)) return { texto: 'NO EXPUESTO', invalidos: [] };
    const cods = t.split(/[^0-9]+/).filter(Boolean); return { texto: cods.join(' · '), invalidos: cods.filter(c => !cat[c]) }; }
}

// ------------------------------------------------------------------ Lugares (edificio, CAPS o dispositivo) de cada persona
const nteEdif_ = t => String(t || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
const NTE_SIN_LUGAR = /^(ambos|seg[uú]n sitio|s\/d)/i;
function nteLugares_(G) {
  const bc = pBC_(), tabla = nombre => { const sh = bc.getSheetByName(nombre); if (!sh) return { H: [], F: [] }; const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(String); return { H: H, F: pTabla_(sh, H.length) }; };
  const S = tabla('SITIOS'), sv = (r, c) => S.H.indexOf(c) >= 0 ? bjVal_(r.v[S.H.indexOf(c)]) : '', sitios = {}, fichas = {};
  S.F.filter(r => G.codigos.indexOf(limpio_(r.v[0])) >= 0).forEach(r => {
    const sitio = sv(r, 'SITIO'), ed = nteEdif_(sv(r, 'EDIFICIO')) || sitio, ficha = { sitio: sitio, edificio: ed, nombre: sv(r, 'NOMBRE_OFICIAL') || sitio, sisa: sv(r, 'CODIGO_SISA'), direccion: sv(r, 'DIRECCION'), telefono: sv(r, 'TELEFONO'), appc: sv(r, 'NRO_ESTAB_APPC'), tipo: sv(r, 'TIPO') };
    sitios[sinTildes_(sitio)] = ficha;
    // ficha del lugar: el sitio que se llama igual que el edificio; si no, el de tipo Edificio; si no, el primero
    const prev = fichas[ed], puntaje = f => (sinTildes_(f.sitio) === sinTildes_(ed) ? 2 : 0) + (/edificio/i.test(f.tipo) ? 1 : 0);
    if (!prev || puntaje(ficha) > puntaje(prev)) fichas[ed] = ficha; });
  const V = tabla('SERVICIOS_EDIFICIO'), serv = {}; V.F.forEach(r => { if (r.v[0]) serv[sinTildes_(r.v[0])] = nteEdif_(r.v[1]); });
  return { sitios: sitios, fichas: fichas, serv: serv };
}
function nteLugarPersona_(o, L) {
  const s = limpio_(o.SITIO);
  if (s) { const r = L.sitios[sinTildes_(s)]; return r ? { lugar: r.edificio, ok: true } : { lugar: o._hoja, ok: false, motivo: 'su SITIO «' + s + '» no está en SITIOS' }; }
  const e = L.serv[sinTildes_(o.SERVICIO || '')] || '';
  if (e && !NTE_SIN_LUGAR.test(e)) return { lugar: e, ok: true };
  const sv = 'servicio «' + (o.SERVICIO || 's/d') + '»';
  return { lugar: o._hoja, ok: false, motivo: /^ambos/i.test(e) ? sv + ' en más de un edificio y la persona no tiene SITIO' : /^seg/i.test(e) ? sv + ' va según SITIO y la persona no tiene SITIO' : sv + ' sin edificio en SERVICIOS_EDIFICIO' };
}
function nteOrdenLugares_(G, nombres) {
  const peso = n => G.codigos.indexOf(n) >= 0 ? G.codigos.indexOf(n) : /^caps/i.test(n) ? 900 : 100;
  return nombres.sort((a, b) => peso(a) - peso(b) || a.localeCompare(b));
}
// Antigüedad en años cumplidos a partir de la fecha de ingreso (dd/MM/aaaa, aaaa-MM-dd o fecha)
function nteAntig_(f) {
  let d = f instanceof Date ? f : null; const t = String(f || '');
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!d && m) d = new Date(+m[3], +m[2] - 1, +m[1]);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!d && m) d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (!d || isNaN(d)) return 's/d';
  const h = new Date(); let a = h.getFullYear() - d.getFullYear(); if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a < 0 ? 's/d' : String(a);
}
const nteFechaTxt_ = f => f instanceof Date ? Utilities.formatDate(f, TZ, 'dd/MM/yyyy') : String(f || '');

// ------------------------------------------------------------------ Controles y estado
function nteRevisar_(x) {
  const cod = limpio_(x.cod), E = est_(cod); if (!E) return { ok: false, mensaje: 'Elegí el establecimiento.' };
  const G = nteGrupo_(cod), d = G.duenio, cat = nteCatalogo_(), mat = nteMatriz_(cod), mm = {}; mat.forEach(m => mm[nteClave_(d, m.servicio, m.funcion)] = m);
  const A = nteActivosGrupo_(G), L = nteLugares_(G), P = { sinCuil: [], sinIngreso: [], sinSector: [], invalidos: [], sinLugar: [], variosEdificios: [], edificioDistinto: [], obsPuesto: [] }, porLugar = {}; let expuestos = 0;
  A.forEach(o => { const quien = (o.APELLIDOS + ' ' + o.NOMBRES).trim(), lu = nteLugarPersona_(o, L);
    if (String(o.CUIL).replace(/\D/g, '').length !== 11) P.sinCuil.push(quien); if (!o.FECHA_INGRESO) P.sinIngreso.push(quien); if (!o.SERVICIO || !(o.FUNCION_DETALLE || o.FUNCION)) P.sinSector.push(quien);
    if (!lu.ok) P.sinLugar.push(quien + ' (' + lu.motivo + ' → NTE de ' + lu.lugar + ')');
    // Ficha personal: EDIFICIOS (dónde trabaja en la red Trelew) y OBS_PUESTO (guardias en otro edificio, horarios)
    const ed = String(o.EDIFICIOS || '').trim(), obs = String(o.OBS_PUESTO || '').trim(), conObs = obs ? ' · ' + obs : '';
    if (ed && /( y |,|otro)/i.test(ed)) P.variosEdificios.push(quien + ' · ' + ed + conObs + ' → NTE de ' + lu.lugar);
    else if (ed) { const b = ed.replace(/^solo\s+/i, ''); if (sinTildes_(String(lu.lugar)).toLowerCase().indexOf(sinTildes_(b).toLowerCase()) < 0) P.edificioDistinto.push(quien + ' · declara ' + b + ', la NTE lo ubica en ' + lu.lugar + conObs); else if (obs) P.obsPuesto.push(quien + conObs); }
    else if (obs) P.obsPuesto.push(quien + conObs);
    const pl = porLugar[lu.lugar] = porLugar[lu.lugar] || { lugar: lu.lugar, total: 0, expuestos: 0 }; pl.total++;
    const ag = nteAgentes_(o, mm, d); if (ag.length && ag[0] !== 'NO EXPUESTO') { expuestos++; pl.expuestos++; ag.forEach(c => { if (!cat[c]) P.invalidos.push(quien + ' (' + c + ')'); }); } });
  const sinDefinir = A.filter(o => !nteAgentes_(o, mm, d).length);
  const props = PropertiesService.getScriptProperties(), ult = JSON.parse(props.getProperty('NTE_' + docCodEst_(d)) || 'null');
  const firma = nteFirma_(A), desact = ult ? (ult.firma !== firma ? 'Hubo altas, bajas o cambios de sector o puesto desde la última NTE.' : (new Date() - new Date(ult.fecha)) > 365 * 864e5 ? 'Pasaron más de 12 meses desde la última NTE.' : '') : 'Todavía no se generó ninguna NTE de este establecimiento.';
  const lugares = nteOrdenLugares_(G, Object.keys(porLugar)).map(k => porLugar[k]);
  const nombre = G.codigos.length > 1 ? G.codigos.map(c => (est_(c) || { nombre: c }).nombre).join(' + ') : E.nombre;
  return { ok: true, cod: cod, duenio: d, grupo: G.codigos, nombre: nombre, total: A.length, expuestos: expuestos, matriz: mat, sinDefinir: sinDefinir.length, todos: NTE_TODOS, controles: P, lugares: lugares, ultima: ult, aviso: desact };
}
function nteAgentes_(o, mm, cod) {
  const propio = String(o.AGENTES_ESOP || '').trim(); if (propio) return /^no expuest/i.test(propio) ? ['NO EXPUESTO'] : propio.split(/[^0-9]+/).filter(Boolean);
  const m0 = mm[nteClave_(cod, o.SERVICIO || 's/d', nteFuncion_(o))], m = m0 && m0.agentes ? m0 : mm[nteClave_(cod, NTE_TODOS, nteFuncion_(o))]; if (!m || !m.agentes) return [];
  return /^no expuest/i.test(m.agentes) ? ['NO EXPUESTO'] : m.agentes.split(/[^0-9]+/).filter(Boolean);
}
function nteFirma_(A) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, A.map(o => [String(o.DNI), sinTildes_(o.SERVICIO), sinTildes_(o.FUNCION_DETALLE || o.FUNCION), sinTildes_(o.SITIO)].join('|')).sort().join(';'))); }

// ------------------------------------------------------------------ Generar la NTE (formato del Autoseguro): una hoja por lugar
function nteGenerar_(x) {
  const R = nteRevisar_(x); if (!R.ok) return R;
  if (R.sinDefinir && !x.forzar) return { ok: false, mensaje: 'Hay ' + R.sinDefinir + ' persona(s) cuya función no tiene códigos definidos en la matriz. Completala (o marcá NO EXPUESTO) antes de generar.' };
  const G = nteGrupo_(R.cod), d = G.duenio, E = est_(d), cfg = configInformes_(), mat = {}; R.matriz.forEach(m => mat[nteClave_(d, m.servicio, m.funcion)] = m);
  const shE = pBC_().getSheetByName('ESTABLECIMIENTOS'), HE = shE.getRange(5, 1, 1, shE.getLastColumn()).getValues()[0].map(String), rE = pTabla_(shE, HE.length).find(r => limpio_(r.v[0]) === d), e = k => rE && HE.indexOf(k) >= 0 ? bjVal_(rE.v[HE.indexOf(k)]) : '';
  DOC_TIPOS.NE = 'Nómina de trabajadores expuestos (NTE)';
  const num = docNumero_({ est: d, bloque: 'RIE', tipo: 'NE', asunto: 'NTE · ' + R.nombre, origen: 'NTE' }); if (!num.ok) return num;
  const L = nteLugares_(G), grupos = {};
  nteActivosGrupo_(G).forEach(o => { const lu = nteLugarPersona_(o, L); (grupos[lu.lugar] = grupos[lu.lugar] || []).push(o); });
  const orden = nteOrdenLugares_(G, Object.keys(grupos));
  const ss = SpreadsheetApp.create(num.codigo + ' · NTE · ' + R.nombre + ' · ' + Utilities.formatDate(new Date(), TZ, 'dd-MM-yyyy')), primera = ss.getSheets()[0];
  const AZ = '#0D313F', GR = '#3A4950', hojas = [];
  orden.forEach((lugar, i) => {
    const A = grupos[lugar].sort((a, b) => (a.SERVICIO + a.APELLIDOS).localeCompare(b.SERVICIO + b.APELLIDOS)), F = L.fichas[lugar] || {};
    // columnas de códigos ESOP: como mínimo 8 (formato del Autoseguro); si alguien tiene más, se agregan las que hagan falta
    const AG = A.map(o => nteAgentes_(o, mat, d)), NCOD = Math.max(8, ...AG.map(g => g.length)), NC = 8 + NCOD;
    const sh = i === 0 ? primera.setName(('NTE · ' + lugar).slice(0, 99)) : ss.insertSheet(('NTE · ' + lugar).slice(0, 99));
    sh.getRange(1, 1, 1, NC).merge().setValue('NÓMINA DE PERSONAL EXPUESTO').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center').setFontColor(AZ);
    sh.getRange(2, 1, 1, NC).merge().setValue(num.codigo + ' · Res. SRT 37/2010 y 81/2019 · Autoseguro Público Provincial Chubut').setFontSize(8).setHorizontalAlignment('center').setFontColor('#5F7480');
    sh.getRange(4, 1, 1, NC).merge().setValue('DATOS DE LA EMPRESA').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#000000');
    const estab = [F.appc ? 'Estab. N.º ' + F.appc : '', F.nombre || lugar, F.sisa && F.sisa !== 's/d' ? 'SISA ' + F.sisa : ''].filter(Boolean).join(' · ');
    const dat = [['Razón social / Organismo', cfg.NTE_ORGANISMO || 'Ministerio de Salud de la Provincia del Chubut', 'C.U.I.T.', cfg.NTE_CUIT || 's/d'],
      ['Establecimiento (n.º y nombre)', estab + (G.codigos.indexOf(lugar) < 0 ? ' (depende del ' + E.nombre + ')' : ''), 'C.I.I.U.', cfg.NTE_CIIU || 's/d'],
      ['Actividad', cfg.NTE_ACTIVIDAD || 'Servicios de atención de la salud humana', 'Cant. de trabajadores del establecimiento', String(A.length)],
      ['Dirección', (F.direccion && F.direccion !== 's/d' ? F.direccion : e('DIRECCION')) || 's/d', 'Localidad', e('LOCALIDAD') || 's/d'],
      ['Provincia', 'Chubut', 'Teléfono / fax · E-mail', [F.telefono && F.telefono !== 's/d' ? F.telefono : e('TELEFONOS'), cfg.NTE_EMAIL_ESTABLECIMIENTO].filter(Boolean).join(' · ') || 's/d']];
    dat.forEach((dd, k) => { const f = 5 + k; sh.getRange(f, 1, 1, 2).merge(); sh.getRange(f, 3, 1, 6).merge(); sh.getRange(f, 9, 1, 3).merge(); sh.getRange(f, 12, 1, NC - 11).merge();
      sh.getRange(f, 1).setValue(dd[0]).setFontWeight('bold'); sh.getRange(f, 3).setValue(dd[1]); sh.getRange(f, 9).setValue(dd[2]).setFontWeight('bold'); sh.getRange(f, 12).setValue(dd[3]); });
    const cab = ['C.U.I.L.', 'Nombre y apellido', 'Fecha de ingreso a la empresa', 'Antigüedad (años)', 'Fecha de inicio de la exposición', 'Fecha de finalización de la exposición', 'Sector de trabajo', 'Puesto de trabajo', 'Identificación de riesgos según código ESOP'].concat(Array(NCOD - 1).fill(''));
    sh.getRange(11, 1, 1, NC).setValues([cab]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#000000').setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center'); sh.getRange(11, 9, 1, NCOD).merge();
    let expL = 0;
    const filas = A.map((o, n) => { const ag = AG[n], c = String(o.CUIL).replace(/\D/g, ''), cuil = c.length === 11 ? c.slice(0, 2) + '-' + c.slice(2, 10) + '-' + c.slice(10) : 's/d';
      const exp = ag.length && ag[0] !== 'NO EXPUESTO', cods = exp ? ag : ['NO EXPUESTO']; if (exp) expL++;
      return [cuil, (o.APELLIDOS + ' ' + o.NOMBRES).trim(), nteFechaTxt_(o.FECHA_INGRESO) || 's/d', nteAntig_(o.FECHA_INGRESO), exp ? (nteFechaTxt_(o.FECHA_INICIO_EXP || o.FECHA_INGRESO) || 's/d') : '', exp ? nteFechaTxt_(o.FECHA_FIN_EXP) : '', o.SERVICIO || 's/d', o.FUNCION_DETALLE || o.FUNCION || 's/d'].concat(cods, Array(NCOD - cods.length).fill('')); });
    if (filas.length) { const rg = sh.getRange(12, 1, filas.length, NC); rg.setNumberFormat('@').setValues(filas).setFontSize(8).setFontColor(GR).setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID); sh.getRange(12, 4, filas.length, 1).setHorizontalAlignment('center'); sh.getRange(12, 9, filas.length, NCOD).setHorizontalAlignment('center'); }
    const ff = 12 + filas.length + 3;
    sh.getRange(ff, 10, 1, 7).setValues([['________________________', '', '', '________________', '', '', '']]); sh.getRange(ff + 1, 10, 1, 7).setValues([['Firma del responsable', '', '', 'D.N.I.', '', '', '']]).setFontSize(8);
    sh.getRange(ff + 3, 10, 1, 7).setValues([['________________________', '', '', '________________', '', '________________', '']]); sh.getRange(ff + 4, 10, 1, 7).setValues([['Aclaración', '', '', 'Cargo en el Organismo / Establecimiento', '', 'Fecha', '']]).setFontSize(8);
    [120, 220, 90, 70, 90, 90, 160, 150].forEach((w, k) => sh.setColumnWidth(k + 1, w)); for (let k = 9; k <= NC; k++) sh.setColumnWidth(k, 62);
    sh.getRange(1, 1, ff + 5, NC).setFontFamily('Arial'); sh.setFrozenRows(11);
    hojas.push({ lugar: lugar, total: A.length, expuestos: expL, gid: sh.getSheetId() });
  });
  // Hoja de controles (no se presenta: es para revisar antes de firmar)
  const ch = ss.insertSheet('CONTROLES (no presentar)'), P = R.controles, lin = [['Control', 'Cantidad', 'Detalle']].concat([['Personas sin CUIL válido', P.sinCuil.length, P.sinCuil.join(' · ')], ['Sin fecha de ingreso', P.sinIngreso.length, P.sinIngreso.join(' · ')], ['Sin sector o puesto', P.sinSector.length, P.sinSector.join(' · ')], ['Códigos ESOP que no están en el listado', P.invalidos.length, P.invalidos.join(' · ')], ['Personas sin códigos definidos en la matriz', R.sinDefinir, 'Figuran como NO EXPUESTO hasta que se definan'], ['Sin edificio confirmado', P.sinLugar.length, P.sinLugar.join(' · ')], ['Trabajan en más de un edificio (figuran en el lugar indicado)', P.variosEdificios.length, P.variosEdificios.join(' · ')], ['Edificio de la ficha distinto del lugar de la NTE', P.edificioDistinto.length, P.edificioDistinto.join(' · ')], ['Otras observaciones de puesto', P.obsPuesto.length, P.obsPuesto.join(' · ')], ['', '', ''], ['Lugar (una hoja por lugar)', 'Personas', 'Expuestas']].concat(hojas.map(h => [h.lugar, h.total, h.expuestos])));
  ch.getRange(1, 1, lin.length, 3).setValues(lin.map(r => r.map(v => String(v).slice(0, 45000)))); ch.getRange(1, 1, 1, 3).setFontWeight('bold'); ch.getRange(8, 1, 1, 3).setFontWeight('bold'); ch.setColumnWidth(1, 300); ch.setColumnWidth(3, 800);
  // La NTE va a la carpeta del establecimiento (02 ESTABLECIMIENTOS), no a la del módulo de residuos
  // Va a MÓDULO 4 · PERSONAL Y RAR › NTE (Modulo4.gs); si el módulo no está armado, a la carpeta del establecimiento › NTE
  const carpeta = (typeof nteCarpetaEst_ === 'function' && nteCarpetaEst_(d)) || carpeta_(audCarpetaEst_(d) || DriveApp.getFolderById(E.carpeta), 'NTE'); DriveApp.getFileById(ss.getId()).moveTo(carpeta);
  const base = 'https://docs.google.com/spreadsheets/d/' + ss.getId(), xlsx = base + '/export?format=xlsx', pdfDe = gid => base + '/export?format=pdf&portrait=false&size=A4&fitw=true&gridlines=false&gid=' + gid;
  hojas.forEach(h => h.pdf = pdfDe(h.gid));
  docActualizar_({ codigo: num.codigo, documento: ss.getUrl(), estado: 'Emitido' });
  PropertiesService.getScriptProperties().setProperty('NTE_' + docCodEst_(d), JSON.stringify({ fecha: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), firma: nteFirma_(nteActivosGrupo_(G)), codigo: num.codigo, url: ss.getUrl() }));
  const para = cfg.NTE_CORREO_APPC || 'dgautoseguro@gmail.com', correo = { para: para, copia: 'Para: ' + para, asunto: 'Nómina de Trabajadores Expuestos (NTE) · ' + R.nombre + ' · ' + num.codigo,
    cuerpo: 'Estimados:\n\nSe remite la Nómina de Trabajadores Expuestos (NTE) del ' + R.nombre + ', firmada por la autoridad del establecimiento en carácter de declaración jurada, conforme a la Res. SRT 37/2010 y la Res. SRT 81/2019.\n\nSe presenta una nómina por establecimiento:\n' + hojas.map(h => '· ' + h.lugar + ': ' + h.total + ' personas, ' + h.expuestos + ' con exposición a agentes de riesgo').join('\n') + '\n\nCada nómina comprende la totalidad de la dotación del lugar; quienes no tienen exposición figuran como «NO EXPUESTO».\n\nQuedamos a disposición por cualquier consulta.\n\nSaludos cordiales.' };
  return { ok: true, codigo: num.codigo, url: ss.getUrl(), xlsx: xlsx, pdf: hojas.length ? hojas[0].pdf : xlsx, lugares: hojas, total: R.total, expuestos: R.expuestos, controles: { sinCuil: P.sinCuil.length, sinIngreso: P.sinIngreso.length, sinSector: P.sinSector.length, invalidos: P.invalidos.length + P.sinLugar.length }, correo: correo };
}