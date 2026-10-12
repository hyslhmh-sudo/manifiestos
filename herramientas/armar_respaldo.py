#!/usr/bin/env python3
"""Junta portal.html + modulos/*.js en un solo archivo (para web_portal.html del Apps Script).
Uso: python3 herramientas/armar_respaldo.py [salida]   (por defecto: dist/web_portal.html)"""
import re, sys, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
html = (raiz / 'portal.html').read_text(encoding='utf-8')
def incrustar(m):
    js = (raiz / m.group(1)).read_text(encoding='utf-8')
    if '</script' in js.lower():
        sys.exit('ERROR: ' + m.group(1) + ' contiene </script>')
    return '<script>\n' + js + '</script>'
salida_html, n = re.subn(r'<script src="(modulos/[^"?]+\.js)(?:\?[^"]*)?"></script>', incrustar, html)
salida = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else raiz / 'dist' / 'web_portal.html'
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(salida_html, encoding='utf-8')
print(f'{n} módulos incrustados → {salida} ({len(salida_html.encode())} bytes)')
