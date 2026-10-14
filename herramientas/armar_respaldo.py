#!/usr/bin/env python3
"""Junta portal.html + modulos/*.js en un solo archivo (para web_portal.html del Apps Script) y copia index.html y diagnostico.html
(web_app.html y web_diagnostico.html). Los tres van al proyecto «Sistema HyS» para el respaldo sin GitHub (?p=portal, ?p=app, ?p=diagnostico).
Uso: python3 herramientas/armar_respaldo.py [salida]   (por defecto: apps-script/web_portal.html)"""
import re, sys, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
html = (raiz / 'portal.html').read_text(encoding='utf-8')
def incrustar(m):
    js = (raiz / m.group(1)).read_text(encoding='utf-8')
    if '</script' in js.lower():
        sys.exit('ERROR: ' + m.group(1) + ' contiene </script>')
    return '<script>\n' + js + '</script>'
salida_html, n = re.subn(r'<script src="(modulos/[^"?]+\.js)(?:\?[^"]*)?"></script>', incrustar, html)
salida = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else raiz / 'apps-script' / 'web_portal.html'
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(salida_html, encoding='utf-8')
print(f'{n} módulos incrustados → {salida} ({len(salida_html.encode())} bytes)')
# Copias para el respaldo de Google (mismo contenido): «Mi establecimiento» y la página para referentes
if len(sys.argv) <= 1:
    for origen, destino in (('index.html', 'web_app.html'), ('diagnostico.html', 'web_diagnostico.html')):
        (raiz / 'apps-script' / destino).write_text((raiz / origen).read_text(encoding='utf-8'), encoding='utf-8')
        print(f'{origen} → apps-script/{destino}')
