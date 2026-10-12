#!/usr/bin/env python3
"""Mueve bloques del script principal de portal.html a modulos/<nombre>.js.
Uso: separar_modulo.py <nombre> "<título>" "<marcador inicio>" "<marcador fin>" [otro par inicio fin ...]
Cada bloque va desde la línea que empieza con el marcador de inicio hasta la anterior al de fin."""
import sys, pathlib, re
raiz = pathlib.Path(__file__).resolve().parent.parent
nombre, titulo, pares = sys.argv[1], sys.argv[2], sys.argv[3:]
L = (raiz / 'portal.html').read_text(encoding='utf-8').split('\n')
fin_principal = L.index('</script>')
def linea(pref, desde=0):
    for i in range(desde, fin_principal):
        if L[i].startswith(pref): return i
    sys.exit('No encontré: ' + pref)
rangos = []
for a, b in zip(pares[::2], pares[1::2]):
    i = linea(a); rangos.append((i, linea(b, i + 1)))
rangos.sort()
cuerpo = '\n\n'.join('\n'.join(L[i:j]).rstrip() for i, j in rangos) + '\n'
cab = f"// Portal HyS · {titulo}\n// Se carga desde portal.html (<script src>). Para el portal de respaldo de Google, herramientas/armar_respaldo.py lo junta en un solo archivo.\n"
(raiz / 'modulos' / f'{nombre}.js').write_text(cab + cuerpo, encoding='utf-8')
for i, j in reversed(rangos): del L[i:j]
ver = re.search(r'\?v=([^"]+)"', '\n'.join(L)).group(1)
k = next(i for i, l in enumerate(L) if l.startswith('<script src="modulos/'))
L.insert(k, f'<script src="modulos/{nombre}.js?v={ver}"></script>')
(raiz / 'portal.html').write_text('\n'.join(L), encoding='utf-8')
print(nombre, [(i + 1, j) for i, j in rangos], len(cuerpo), 'caracteres')
