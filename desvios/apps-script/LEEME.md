# Desvíos en gestión de residuos · HMH (versión 0)

Proyecto de Apps Script pegado a la planilla «DESVÍOS RESIDUOS HMH · Registro (v0)» (Drive › TRABAJO › DESVÍOS · RESIDUOS HMH).
Proyecto: «Desvíos Residuos HMH v0». App web: ver CONFIG › URL_APP de la planilla.

- `Codigo.gs` (en el editor, `Código.gs`): recibe las cargas, guarda fotos en FOTOS/año-mes, avisa por correo a la secretaría HyS, y entrega los registros a «Mi establecimiento» comprobando la clave con el Sistema HyS (CONFIG › URL_SISTEMA).
- `Carga.html`: la misma página de carga de `desvios/index.html`, para usarla sin GitHub: URL de la app web + `?p=carga`.

Página de carga de los operarios (GitHub): https://hyslhmh-sudo.github.io/manifiestos/desvios/  (con `?p=PB-06` abre con el punto elegido, para los QR).
Consulta: «Mi establecimiento» › 1 · Residuos › Desvíos del recorrido (Star Union), HMH y HZT, módulo Residuos.

## 25/10/2026 · Aviso inmediato a los supervisores de Star Union
- CONFIG › CORREO_SUPERVISOR: los dos supervisores de Star Union (encargado del servicio y jefe de cuenta; sus correos están solo en la hoja CONFIG). Reciben el reporte semanal (lunes 8 h).
- CONFIG › AVISO_SUPERVISORES = Sí: cada desvío les llega también en el momento, sin la evaluación de HyS (gravedad según reglas y origen sugerido). Con «No», solo a la secretaría (CORREO_AVISO).
- En REGISTROS › AVISO_ENVIADO queda el resultado de los dos envíos.

## 29/10/2026 · HSST (Rawson)
- Planilla propia «DESVÍOS RESIDUOS HSST · Registro (v0)» (HSST › DESVÍOS · RESIDUOS HSST), con su Apps Script (copia de este): `Codigo_HSST.gs` y `Carga_HSST.html` (en el editor, `Código.gs` y `Carga.html`).
- App web: https://script.google.com/macros/s/AKfycbyvDGN5cYxmXFkr-5wIjHRM2INyscCYUADiXKw2qTcE0yOTpdfMXdgFAJx5O2LFlqk-qA/exec
- Página de carga: https://hyslhmh-sudo.github.io/manifiestos/desvios/?e=HSST (QR: `&p=CÓDIGO`). Carga solo el referente (Guillermo Funez) y HyS. Sin correos ni reporte semanal.
- «Mi establecimiento» (HSST) › 1 · Residuos › «Cargar un desvío» y «Mis desvíos».
- Guía y QR: `impresion/guia_hsst.py` y `impresion/qr_hsst.py`.
