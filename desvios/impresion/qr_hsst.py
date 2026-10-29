import io, segno
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor

F = '/root/.fonts/PlusJakartaSans-'
for n, w in [('Regular', '400'), ('SemiBold', '600'), ('Bold', '700'), ('ExtraBold', '800')]:
    import os
    pdfmetrics.registerFont(TTFont('PJS-' + n, F + (w if os.path.exists(F + w + '.ttf') else '700') + '.ttf'))
AZUL, PAT, GRIS, GRIS2 = HexColor('#0D313F'), HexColor('#5894A7'), HexColor('#3D4A52'), HexColor('#6B7780')
LOGO = '/home/claude/manifiestos/desvios/logo-hysl.png'
BASE = 'https://hyslhmh-sudo.github.io/manifiestos/desvios/'

PUNTOS = [
 ("IN-01","Internación","Terapia","Punto de acopio del servicio"),
 ("IN-02","Internación","Clínica Médica","Punto de acopio del servicio"),
 ("IN-03","Internación","Maternidad","Punto de acopio del servicio"),
 ("IN-04","Internación","Pediatría","Punto de acopio del servicio"),
 ("SV-01","Servicios","Consultorios externos","Punto de acopio del servicio"),
 ("SV-02","Servicios","Guardia","Punto de acopio del servicio"),
 ("SV-03","Servicios","Rayos X","Punto de acopio del servicio"),
 ("SV-04","Servicios","Laboratorio","Punto de acopio del servicio"),
 ("SV-05","Servicios","Esterilización","Punto de acopio del servicio"),
 ("SV-06","Servicios","Anatomía Patológica","Punto de acopio del servicio"),
 ("CP-01","CAPS","CAPS Área 12","Todo el CAPS"),
 ("CP-02","CAPS","CAPS Área 16","Todo el CAPS"),
 ("CP-03","CAPS","CAPS Gregorio Mayo","Todo el CAPS"),
 ("CP-04","CAPS","CAPS San Ramón","Todo el CAPS"),
 ("CP-05","CAPS","CAPS Río Chubut","Todo el CAPS"),
 ("CP-06","CAPS","CAPS 490 Norte","Todo el CAPS"),
 ("CP-07","CAPS","CAPS Playa Unión","Todo el CAPS"),
 ("GENERAL","Cualquier lugar","Registro de desvíos","Para cualquier lugar del HSST o de los CAPS"),
]

def qr_img(url):
    b = io.BytesIO(); segno.make(url, error='m').save(b, kind='png', scale=12, border=1, dark='#0D313F'); b.seek(0)
    return ImageReader(b)

def wrap(c, text, font, size, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if c.stringWidth(t, font, size) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

W, H = A4
M = 10 * mm
CW, CH = (W - 2 * M) / 2, (H - 2 * M) / 3
c = canvas.Canvas('/home/claude/manifiestos/desvios/impresion/QR_lugares_desvios_HSST.pdf', pagesize=A4)
c.setTitle('QR · Lugares para registrar desvíos de residuos · HSST'); c.setAuthor('Servicio de Higiene y Seguridad Laboral · HZT / HMH')
logo = ImageReader(LOGO)
for i, (cod, piso, serv, ubi) in enumerate(PUNTOS):
    if i and i % 6 == 0: c.showPage()
    k = i % 6; col, fil = k % 2, k // 2
    x0, y0 = M + col * CW, H - M - (fil + 1) * CH
    pad = 5 * mm
    # recorte
    c.setStrokeColor(HexColor('#B9C3C9')); c.setDash(2, 3); c.setLineWidth(0.5); c.rect(x0, y0, CW, CH); c.setDash()
    # banda superior
    c.setFillColor(AZUL); c.roundRect(x0 + pad, y0 + CH - pad - 13 * mm, CW - 2 * pad, 13 * mm, 2 * mm, stroke=0, fill=1)
    c.setFillColor(HexColor('#FFFFFF')); c.setFont('PJS-ExtraBold', 12.5)
    c.drawString(x0 + pad + 4 * mm, y0 + CH - pad - 6 * mm, 'Desvíos en residuos')
    c.setFont('PJS-Regular', 8.5); c.drawString(x0 + pad + 4 * mm, y0 + CH - pad - 10.5 * mm, 'Registrá lo que ves mal con los residuos')
    c.setFont('PJS-ExtraBold', 15); c.drawRightString(x0 + CW - pad - 4 * mm, y0 + CH - pad - 8.3 * mm, cod)
    # QR
    q = 43 * mm; qx, qy = x0 + pad, y0 + CH - pad - 13 * mm - 3 * mm - q
    url = BASE + '?e=HSST' if cod == 'GENERAL' else BASE + '?e=HSST&p=' + cod
    c.drawImage(qr_img(url), qx, qy, q, q)
    # texto a la derecha
    tx, tw = qx + q + 4 * mm, CW - 2 * pad - q - 4 * mm
    y = qy + q - 4 * mm
    c.setFillColor(GRIS2); c.setFont('PJS-SemiBold', 8.5); c.drawString(tx, y, piso.upper()); y -= 6 * mm
    c.setFillColor(AZUL); c.setFont('PJS-Bold', 11.5)
    for ln in wrap(c, serv, 'PJS-Bold', 11.5, tw): c.drawString(tx, y, ln); y -= 5 * mm
    y -= 1 * mm; c.setFillColor(GRIS)
    for ln in wrap(c, ubi, 'PJS-Regular', 9, tw): c.setFont('PJS-Regular', 9); c.drawString(tx, y, ln); y -= 4.4 * mm
    # instrucciones
    iy = qy - 5 * mm; c.setFillColor(GRIS); c.setFont('PJS-SemiBold', 8.6)
    c.drawString(x0 + pad, iy, '1. Escaneá con la cámara del celular.')
    c.drawString(x0 + pad, iy - 4.4 * mm, '2. Marcá qué viste.  3. Sacá foto y Enviar.')
    c.setFont('PJS-Regular', 7.6); c.setFillColor(GRIS2)
    c.drawString(x0 + pad, iy - 9 * mm, 'Mirá sin tocar. Si te lastimás, avisá ya y andá a la guardia.')
    # logo pie
    lw = CW - 2 * pad - 14 * mm; lh = lw * 81 / 900
    c.drawImage(logo, x0 + (CW - lw) / 2, y0 + 3 * mm, lw, lh, mask='auto')
c.save(); print('ok')
