# MIPyV Red HZT · app de los operarios

Desde el 12/10/2026 la app vive acá: https://hyslhmh-sudo.github.io/manifiestos/mipyv/

- Antes estaba en `belunchyy444-blip.github.io/mipyv-app` (cuenta personal). Esa dirección quedó con `redireccion.js`: si el celular no tiene cargas sin enviar, pasa sola a la dirección nueva; si tiene, sigue funcionando allá hasta enviarlas.
- La planilla («MIP RED HZT - Base de Datos v2») y su Apps Script no cambiaron: la app manda todo a la misma dirección (`data.js` › APPS_SCRIPT_URL).
- Para actualizar la app: cambiar los archivos y subir el número en `version.js` (los celulares bajan la versión nueva solos).
- `Codigo_AppsScript.gs` y `GUIA_DESPLIEGUE.md` son copias de respaldo y de referencia.

## Casos para revisar y solicitudes a Belén (25/10/2026)
- `avisos.js` (app): en el inicio, cuando un caso (intervención que pidió otra visita) vence en 3 días o menos o ya venció, aparece en rojo «Revisar urgente» y se indica el cierre: Resuelto o No resuelto (el biocida no hizo efecto / faltan herramientas o insumos / otro, explicado), con fotos opcionales. Botón «Solicitudes a Belén»: biocidas (cuál y cuánto), EPP, herramientas (pala, pico, escalera, balde… con justificación obligatoria: sin ella no se envía), aviso en un establecimiento o novedad (para dejar registro), hasta 5 fotos. La app no muestra el estado ni la respuesta: la evaluación la ve solo HyS en el portal.
- `Casos_Solicitudes_MIPyV.gs` (va en el Apps Script de la planilla, junto a Código.gs): hojas `cierres_casos` y `solicitudes`; doPost tipos `cierre_caso` y `solicitud`; doGet devuelve solo `casos` (las solicitudes y los cierres los lee el portal directo del libro). En Código.gs: enganche en doPost y doGet, y en intervencionesMipyv un caso con cierre posterior a su última visita no figura abierto (si se carga otra visita, se reabre).
- Portal HyS › 3 · Plagas: casos abiertos con «Cerrar caso» y «N.º de protocolo» (une visitas), solicitudes con «Responder» y cierres de los últimos 60 días.
