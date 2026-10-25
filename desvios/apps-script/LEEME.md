# Desvíos en gestión de residuos · HMH (versión 0)

Proyecto de Apps Script pegado a la planilla «DESVÍOS RESIDUOS HMH · Registro (v0)» (Drive › TRABAJO › DESVÍOS · RESIDUOS HMH).
Proyecto: «Desvíos Residuos HMH v0». App web: ver CONFIG › URL_APP de la planilla.

- `Codigo.gs` (en el editor, `Código.gs`): recibe las cargas, guarda fotos en FOTOS/año-mes, avisa por correo a la secretaría HyS, y entrega los registros a «Mi establecimiento» comprobando la clave con el Sistema HyS (CONFIG › URL_SISTEMA).
- `Carga.html`: la misma página de carga de `desvios/index.html`, para usarla sin GitHub: URL de la app web + `?p=carga`.

Página de carga de los operarios (GitHub): https://hyslhmh-sudo.github.io/manifiestos/desvios/  (con `?p=PB-06` abre con el punto elegido, para los QR).
Consulta: «Mi establecimiento» › 1 · Residuos › Desvíos del recorrido (Star Union), HMH y HZT, módulo Residuos.

## 25/10/2026 · Aviso inmediato a los supervisores de Star Union
- CONFIG › CORREO_SUPERVISOR: Federico Obelar (encargado del servicio, operacioneshmh@starunion.com.ar) y Eduardo Mengozzi (jefe de cuenta / supervisor, emengozzi@starunion.com.ar). Reciben el reporte semanal (lunes 8 h).
- CONFIG › AVISO_SUPERVISORES = Sí: cada desvío les llega también en el momento, sin la evaluación de HyS (gravedad según reglas y origen sugerido). Con «No», solo a la secretaría (CORREO_AVISO).
- En REGISTROS › AVISO_ENVIADO queda el resultado de los dos envíos.
