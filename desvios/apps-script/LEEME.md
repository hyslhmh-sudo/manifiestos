# Desvíos en gestión de residuos · HMH (versión 0)

Proyecto de Apps Script pegado a la planilla «DESVÍOS RESIDUOS HMH · Registro (v0)» (Drive › TRABAJO › DESVÍOS · RESIDUOS HMH).
Proyecto: «Desvíos Residuos HMH v0». App web: ver CONFIG › URL_APP de la planilla.

- `Codigo.gs` (en el editor, `Código.gs`): recibe las cargas, guarda fotos en FOTOS/año-mes, avisa por correo a la secretaría HyS, y entrega los registros a «Mi establecimiento» comprobando la clave con el Sistema HyS (CONFIG › URL_SISTEMA).
- `Carga.html`: la misma página de carga de `desvios/index.html`, para usarla sin GitHub: URL de la app web + `?p=carga`.

Página de carga de los operarios (GitHub): https://hyslhmh-sudo.github.io/manifiestos/desvios/  (con `?p=PB-06` abre con el punto elegido, para los QR).
Consulta: «Mi establecimiento» › 1 · Residuos › Desvíos del recorrido (Star Union), HMH y HZT, módulo Residuos.
