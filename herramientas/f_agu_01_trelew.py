# Genera mipyv/F-AGU-01-T.pdf · Registro de limpieza y desinfección de tanque o cisterna · Red Trelew (POE-AGU-001)
# Versión 0 hasta su alta en el sistema (regla de Belén). Uso: python3 herramientas/f_agu_01_trelew.py
# Datos técnicos del POE-AGU-001 v01 (HySL HZT/HMH, vigencia 03/09/2026), con la corrección de Belén del 28/10/2026:
# la desinfección se hace con el 20 % de la capacidad del tanque (no con el tanque lleno ni «20 a 30 cm»), y en esa agua se
# prepara la lavandina 5,5 % (55 g/L) a 110 ppm = 2 mL por litro de agua cargada; contacto mínimo 3 h (recomendado 6 h);
# el cloro residual no lo mide el establecimiento: lo mide el DPSB al tomar la muestra. Cepillo sin detergente, espacio confinado Res. SRT 953/2010, registro Modelo A (Ord. Trelew 12695/17 mod. 13422).
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SALIDA = os.path.join(RAIZ, 'mipyv', 'F-AGU-01-T.pdf')
LOGO = os.path.join(RAIZ, 'desvios', 'logo-hysl.png')
AZUL, GRIS, LINEA, CLARO = HexColor('#0D313F'), HexColor('#4F616B'), HexColor('#9FB0B8'), HexColor('#E8F0F3')
W, H = A4
M = 36  # margen
CODIGO = 'F-AGU-01-T · v0 (10/2026)'
TITULO = 'Registro de limpieza y desinfección de tanque o cisterna · Red Trelew'

c = canvas.Canvas(SALIDA, pagesize=A4)
c.setTitle('F-AGU-01-T · ' + TITULO)
c.setAuthor('Servicio de Higiene y Seguridad Laboral · HZT')
c.setSubject('Según POE-AGU-001 Limpieza y desinfección de tanques y cisternas (HZT/HMH)')
y = 0


def wrap(texto, fuente, tam, ancho):
    out, linea = [], ''
    for p in texto.split(' '):
        prueba = (linea + ' ' + p).strip()
        if c.stringWidth(prueba, fuente, tam) <= ancho:
            linea = prueba
        else:
            out.append(linea); linea = p
    if linea:
        out.append(linea)
    return out


def parrafo(texto, x, ancho, tam=8.5, fuente='Helvetica', color=None, inter=1.25):
    global y
    c.setFont(fuente, tam); c.setFillColor(color or AZUL)
    for l in wrap(texto, fuente, tam, ancho):
        c.drawString(x, y, l); y -= tam * inter


def cabecera(pag):
    global y
    c.setFillColor(AZUL); c.rect(0, H - 64, W, 64, stroke=0, fill=1)
    c.setFillColor(white); c.setFont('Helvetica-Bold', 8)
    c.drawString(M, H - 18, 'SERVICIO DE HIGIENE Y SEGURIDAD LABORAL · HOSPITAL ZONAL TRELEW · RED TRELEW')
    c.drawRightString(W - M, H - 18, CODIGO)
    c.setFont('Helvetica-Bold', 12.5); c.drawString(M, H - 38, TITULO)
    c.setFont('Helvetica', 7.5); c.drawString(M, H - 53, 'Según el POE-AGU-001 «Limpieza y desinfección de tanques y cisternas» (v01, vigencia 03/09/2026) · un formulario por tanque, cada vez que se limpia')
    y = H - 82


def pie(pag, total):
    if os.path.exists(LOGO):
        img = ImageReader(LOGO); iw, ih = img.getSize(); ancho = 300; alto = ancho * ih / iw
        c.drawImage(img, (W - ancho) / 2, 30, ancho, alto, mask='auto')
    c.setFont('Helvetica', 7); c.setFillColor(GRIS)
    c.drawString(M, 18, 'F-AGU-01-T · ' + TITULO + ' · Versión 0: borrador hasta su alta en el sistema')
    c.drawRightString(W - M, 18, 'Página %d de %d' % (pag, total))


def seccion(txt):
    global y
    y -= 4
    c.setFillColor(CLARO); c.rect(M, y - 4, W - 2 * M, 15, stroke=0, fill=1)
    c.setFillColor(AZUL); c.setFont('Helvetica-Bold', 9.5); c.drawString(M + 5, y, txt)
    y -= 18


def campos(lista, alto=24):
    """lista de (etiqueta, fracción del ancho) en una fila de casilleros"""
    global y
    x = M; total = W - 2 * M
    c.setStrokeColor(LINEA); c.setLineWidth(0.6)
    for et, fr in lista:
        w = total * fr
        c.rect(x, y - alto + 8, w, alto, stroke=1, fill=0)
        c.setFont('Helvetica', 6.5); c.setFillColor(GRIS); c.drawString(x + 3, y + alto - 24, et)
        x += w
    y -= alto + 2


def caja(x, yy, tam=8):
    c.setStrokeColor(AZUL); c.setLineWidth(0.8); c.rect(x, yy - 1, tam, tam, stroke=1, fill=0)


def opciones(etiqueta, ops, tam=8.5):
    global y
    c.setFont('Helvetica-Bold', tam); c.setFillColor(AZUL); c.drawString(M, y, etiqueta)
    x = M + c.stringWidth(etiqueta, 'Helvetica-Bold', tam) + 8
    c.setFont('Helvetica', tam)
    for o in ops:
        ancho = c.stringWidth(o, 'Helvetica', tam) + 22
        if x + ancho > W - M:
            y -= 13; x = M + 10
        caja(x, y); c.setFillColor(AZUL); c.drawString(x + 12, y, o); x += ancho
    y -= 15


def check(texto, n=None, tam=8.5, extra=None):
    global y
    caja(M + 2, y)
    x = M + 16
    if n is not None:
        c.setFont('Helvetica-Bold', tam); c.setFillColor(AZUL); c.drawString(x, y, str(n) + '.'); x += 14
    lineas = wrap(texto, 'Helvetica', tam, W - M - x)
    c.setFont('Helvetica', tam); c.setFillColor(AZUL)
    for i, l in enumerate(lineas):
        c.drawString(x, y, l); y -= tam * 1.3
    if extra:
        for e in extra:
            c.setFont('Helvetica', tam); c.drawString(x, y, e); y -= tam * 1.45
    y -= 2.5


def linea_llenar(etq, ancho_linea=None):
    global y
    c.setFont('Helvetica', 8.5); c.setFillColor(AZUL); c.drawString(M, y, etq)
    x = M + c.stringWidth(etq, 'Helvetica', 8.5) + 4
    c.setStrokeColor(LINEA); c.line(x, y - 2, ancho_linea or (W - M), y - 2)
    y -= 16


# ------------------------------------------------------------------ Página 1
cabecera(1)
parrafo('Un formulario por tanque o cisterna, cada vez que se limpia. Se completa en el momento, se firma y se saca una foto '
        'en la app MIP › Tanques y cisternas › «Registrar limpieza». El papel firmado se entrega a Higiene y Seguridad. '
        'Si algo no se pudo hacer como dice acá, anotarlo en Observaciones.', M, W - 2 * M, 8.3, color=GRIS)
y -= 2
seccion('1. Tanque o cisterna')
campos([('Lugar (establecimiento, dependencia o CAPS)', 0.46), ('Código en la app MIP (ej.: HZT-T01)', 0.24), ('Capacidad (litros)', 0.30)])
campos([('Ubicación (edificio, sector, techo, nivel)', 0.46), ('Fecha', 0.18), ('Hora de corte', 0.18), ('Hora de rehabilitación', 0.18)])
opciones('Tipo:', ['Tanque elevado', 'Cisterna', 'Tanque de bombeo', 'Otro: ____________'])
seccion('2. Quiénes')
campos([('Ejecutó (nombre y apellido)', 0.34), ('Acompañó', 0.33), ('N.º de inscripción en el Registro Municipal (Ord. 12695/17)', 0.33)])
seccion('3. Antes de empezar: seguridad')
check('Se avisó el corte a los sectores afectados. Si el tanque es el único del lugar, se previó agua alternativa.')
check('Elementos de protección: guantes de nitrilo o PVC, antiparras, ropa impermeable y botas de goma. '
      'Barbijo o protección respiratoria si hay poca ventilación. Hoja de seguridad de la lavandina a mano.')
check('Tanque elevado: escalera segura y arnés con línea de vida si hay riesgo de caída.')
check('Si hay que entrar al tanque o la cisterna (espacio confinado, Res. SRT 953/2010): permiso de trabajo firmado por Higiene y '
      'Seguridad, medición de la atmósfera, arnés con línea de vida y vigía afuera todo el tiempo. Nunca entrar solo.')
opciones('Entrada al tanque o cisterna:', ['No hizo falta entrar', 'Se entró con permiso de trabajo N.º ________'])
seccion('4. Paso 1 · Preparación y limpieza')
check('Cerrar la entrada de agua al tanque.', 1)
check('Vaciar el tanque, dejando solo el agua justa para poder cepillar.', 2)
check('Cerrar las salidas hacia las cañerías del edificio.', 3)
check('Cepillar piso, paredes y tapa con cepillo de cerdas plásticas (nunca de metal). SIN detergente ni ningún otro producto.', 4)
check('Vaciar del todo, sacar el barro y los sedimentos y enjuagar con agua de red.', 5)
seccion('5. Paso 2 · Desinfección con lavandina')
check('Con el tanque vacío y limpio, cargar agua de red SOLO hasta el 20 % de la capacidad (un quinto de la altura). No se llena el tanque.', 6,
      extra=['Cuenta: capacidad ________ litros × 0,2 = ________ litros de agua.'])
check('En esa agua, agregar lavandina concentrada al 5,5 % (55 g de cloro por litro): 2 mL por cada litro de agua cargada (110 ppm).', 7,
      extra=['Cuenta: ________ litros de agua × 2 = ________ mL de lavandina 5,5 %.'])
# tabla de dosis
y -= 1
dosis = [('500 L', '100 L', '200 mL'), ('850 L', '170 L', '340 mL'), ('1.000 L', '200 L', '400 mL'), ('1.100 L', '220 L', '440 mL'), ('2.000 L', '400 L', '800 mL'), ('2.750 L', '550 L', '1.100 mL'), ('5.000 L', '1.000 L', '2.000 mL'), ('10.000 L', '2.000 L', '4.000 mL')]
c.setFont('Helvetica-Bold', 7); c.setFillColor(AZUL); c.drawString(M + 16, y, 'Tanque'); c.drawString(M + 16, y - 12, 'Agua (20 %)'); c.drawString(M + 16, y - 24, 'Lavandina')
x0 = M + 66; cw = (W - M - x0) / len(dosis)
c.setStrokeColor(LINEA); c.setLineWidth(0.5)
for i, (a, b, d) in enumerate(dosis):
    xx = x0 + i * cw
    c.setFillColor(CLARO); c.rect(xx, y - 3, cw, 12, stroke=1, fill=1)
    c.rect(xx, y - 15, cw, 12, stroke=1, fill=0); c.rect(xx, y - 27, cw, 12, stroke=1, fill=0)
    c.setFillColor(AZUL); c.setFont('Helvetica-Bold', 7.5); c.drawCentredString(xx + cw / 2, y, a)
    c.setFont('Helvetica', 7.5); c.drawCentredString(xx + cw / 2, y - 12, b)
    c.setFont('Helvetica-Bold', 7.5); c.drawCentredString(xx + cw / 2, y - 24, d)
c.setFont('Helvetica', 6.5); c.setFillColor(GRIS); c.drawString(M, y - 38, 'Si la lavandina no es al 5,5 %, avisar a Higiene y Seguridad antes de usarla: hay que recalcular la dosis.')
y -= 50
check('Abrir las salidas hacia las canillas hasta que en cada una se sienta olor a cloro; después cerrarlas.', 8)
check('Cerrar la entrada de agua y dejar todo cerrado: mínimo 3 horas, mejor 6 horas.', 9,
      extra=['Desde las ______ h hasta las ______ h · total ______ h.'])
pie(1, 2)
c.showPage()

# ------------------------------------------------------------------ Página 2
cabecera(2)
seccion('6. Paso 3 · Enjuague y puesta en servicio')
check('Abrir todas las canillas y salidas hasta vaciar el agua con cloro.', 10)
check('Abrir la entrada y dejar las canillas abiertas hasta que el olor y el sabor a cloro sean aceptables.', 11)
check('Tapar bien el tanque o la cisterna (no sirve lona ni nylon).', 12)
parrafo('El cloro residual no lo mide el establecimiento: lo mide el Departamento Provincial de Saneamiento Básico (DPSB) cuando toma la muestra.', M, W - 2 * M, 8, color=GRIS)
y -= 4
seccion('7. Cómo estaba el tanque')
opciones('Tapa:', ['En condiciones', 'Deficiente', 'Sin tapa'])
opciones('Se vio:', ['Fisuras o filtraciones', 'Óxido o deterioro', 'Mucho sedimento', 'Flotante o válvula con fallas',
                     'Ventilación sin malla', 'Insectos o restos de animales', 'Acceso inseguro', 'Nada raro', 'Otro: ____________'])
c.setFont('Helvetica-Bold', 8.5); c.setFillColor(AZUL); c.drawString(M, y, 'Observaciones (lo que no se pudo hacer, arreglos que hacen falta):'); y -= 6
c.setStrokeColor(LINEA)
for i in range(4):
    y -= 16; c.line(M, y, W - M, y)
y -= 14
seccion('8. Análisis de laboratorio después de la limpieza')
parrafo('Lo pide Higiene y Seguridad al DPSB. El muestreo completo (bacteriológico + físico-químico) se toma con el tanque ya limpio, '
        'en la salida del tanque y en la canilla más alejada.', M, W - 2 * M, 8, color=GRIS)
opciones('Muestra:', ['Ya se pidió', 'Pendiente', 'No corresponde esta vez'])
campos([('Fecha de la toma', 0.25), ('Punto de muestreo', 0.45), ('N.º de muestra o de informe del laboratorio', 0.30)])
seccion('9. Firmas')
y -= 26
tercio = (W - 2 * M) / 3
c.setStrokeColor(AZUL)
for i, t in enumerate(['Ejecutó', 'Acompañó', 'Supervisó (HyS)']):
    x = M + i * tercio
    c.line(x + 6, y, x + tercio - 6, y)
    c.setFont('Helvetica', 7.5); c.setFillColor(GRIS); c.drawCentredString(x + tercio / 2, y - 10, t + ' · firma, aclaración y fecha')
y -= 30
seccion('Referencias')
refs = ['POE-AGU-001 «Limpieza y desinfección de tanques y cisternas» HZT/HMH, v01 (Servicio de Higiene y Seguridad Laboral, vigencia 03/09/2026): '
        'método, dosis, tiempo de contacto y elementos de protección de este formulario (desinfección con el 20 % de la capacidad: corrección de HySL del 28/10/2026). Inspección visual de cada tanque cada 3 meses; '
        'se limpia antes de la fecha si hay sedimento, olor o turbidez.',
        'Ordenanza de Trelew N.º 12695/17, modificada por la N.º 13.422 (2022): limpieza y desinfección al menos una vez al año, análisis microbiológico '
        'cada 6 meses, personal inscripto en el Registro Municipal y Libro de Registro (Modelo A del POE). Este formulario es el respaldo de cada fila del Modelo A.',
        'Ley 19.587 y Dto. 351/79, arts. 57 y 58 (análisis bacteriológico semestral y físico-químico anual). CAA art. 982. Res. SRT 953/2010 (espacios confinados) '
        'y Res. MTESS 295/2003 (sustancias químicas).',
        'DPSB · POE de toma de muestra y gestión de resultados (2025-2030): si el resultado es NO APTO, nueva limpieza y nueva muestra en no más de 15 días hábiles.']
for r in refs:
    parrafo('· ' + r, M, W - 2 * M, 7.2, color=GRIS, inter=1.22); y -= 2
pie(2, 2)
c.showPage()
c.save()
print('Listo:', SALIDA)
