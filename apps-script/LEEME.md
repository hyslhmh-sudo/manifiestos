# Copias de respaldo del Apps Script

Copias de respaldo de archivos de los proyectos de Apps Script del Sistema HyS (decisión de Belén, 12/10/2026).
El código que funciona es el del editor de Apps Script; estas copias sirven para recuperar una versión anterior.

- `web_portal.html`: portal armado en un solo archivo con `herramientas/armar_respaldo.py` (se pega en web_portal del proyecto «Sistema HyS»).
- `Portal.gs` (entrada de todas las acciones del portal; copia del 13/10/2026), `DiagModulos.gs`, `Accesos_portal.gs`, `Notas_portal.gs`: proyecto «Sistema HyS» (`Notas_portal.gs`: pantalla Notas enviadas y recibidas del portal, solo lectura; se agregó el 12/10/2026 junto con la acción `p_notas` en Portal.gs). `Radiaciones.gs`: módulo 9 · Radiaciones ionizantes (13/10/2026; acciones `p_rad_…`, despachadas desde el `default:` de Portal.gs; instalar una vez con `construirModuloRadiaciones()`).
- `Codigo.gs` (en el editor se llama `Código.gs`: manifiestos, certificados y configuración de la aplicación) y `Registros.gs` (Mis registros: ver, corregir y anular): proyecto «Sistema HyS», copia del 13/10/2026, versión 14.21 (cantidad tratada en el certificado, columnas I a L de CERTIFICADOS).
- `Modulo8.gs`: proyecto «Módulo 8 · Servicios e Infraestructura».

Estas copias no llevan claves ni contraseñas: las claves van en las propiedades del script o en las planillas.
Detalle en el MANUAL DEL SISTEMA HyS, sección 20.
- `ResiduosTablero.gs` (14.22, 13/10/2026): tablero general de residuos (acción `p_res_tablero`, despachada en Portal.gs). Portal.gs 14.22: libros abiertos una vez por ejecución y resumen de la matriz con el personal guardado aparte (`pResumenTrab_`).
- `ResiduosContratos.gs` (14.23): contratos de residuos (hojas CONTRATOS, CONTRATO_GRUPOS y CONTRATO_ALCANCE del libro general, se crean solas con el contrato Impeesa 2026), frecuencias de retiro (`p_res_frecuencias`) y costos del contrato (`p_res_costos`). Diag.gs y Auditoria.gs (solo en el editor): caché de capacitación, perfiles y lugares (14.22).
