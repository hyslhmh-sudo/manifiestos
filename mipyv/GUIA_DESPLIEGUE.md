# MIPyV Red HZT — Guía de despliegue y administración

Versión de la guía: 9 de octubre de 2026 · App 2026.10.09b · Servidor 2026-10-09 · Alcance: Área Trelew (HZT, HMH, dependencias y CAPS)

App de registro de control de plagas y vectores (MIPyV), de limpieza y saneamiento (PROP-HYS-045) y de otras tareas de Higiene y Seguridad (control de extintores, señalización, recorridas, traslado de residuos), para uso de los operarios del Servicio de Higiene y Seguridad desde el celular, con o sin señal.

**Marco normativo.** El registro de las intervenciones de control de plagas y de saneamiento forma parte de las funciones de prevención del Servicio de Higiene y Seguridad en el Trabajo¹ y de las condiciones de higiene de los establecimientos² ³.

---

## 1. Cómo está armado

| Parte | Dónde está | Qué hace |
|---|---|---|
| App | GitHub Pages: `hyslhmh-sudo.github.io/manifiestos/mipyv/` (desde el 12/10/2026; la dirección vieja `belunchyy444-blip.github.io/mipyv-app` redirige acá) | Lo que usan los operarios en el celular. Funciona sin señal. |
| Planilla | «MIP RED HZT - Base de Datos v2» (Drive de belunchyy444) | Guarda todo y tiene las listas que muestra la app. |
| Servidor | Apps Script pegado en la planilla (`Código.gs`) | Recibe los registros, guarda las fotos en Drive y entrega las listas a la app. |
| Fotos | Drive › «MIPyV Red HZT - Fotos» › establecimiento › fecha | Fotos comprimidas (unos 60-200 KB cada una). Los enlaces quedan en la columna `foto_url`, separados por « \| ». |

Archivos del repositorio `mipyv-app`: `index.html`, `version.js`, `app.js`, `data.js`, `icons.js`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`, `Codigo_AppsScript.gs` (copia de respaldo del servidor) y esta guía.

**Correos automáticos:** solo los que figuran en la sección 5 bis (resumen diario y recordatorio a operarios). Los seguimientos vencidos quedan en una hoja de la planilla.

---

## 2. Qué hay en la planilla

| Hoja | Para qué | ¿Se edita a mano? |
|---|---|---|
| `visitas` | Una fila por cada visita MIPyV. | Solo la columna `revisado_hys` y, si corresponde, `protocolo`. |
| `trabajos_saneamiento` | Un trabajo de saneamiento por CAP (puede durar varios días). | Solo para corregir. |
| `avances_saneamiento` | Un avance por cada día de trabajo. | Solo para corregir. |
| `tareas_hys` | Una fila por cada «Otra tarea de Higiene y Seguridad». Si la tarea abarcó varios lugares, `id_establecimiento` y `establecimiento` los llevan separados por « \| ». En control de extintores, `detalle` tiene una línea por lugar (chapa baliza, colgado, accesible y vencimiento de la carga) y lo que está mal pasa solo a `hallazgos`. | Solo la columna `revisado_hys`. |
| `hallazgos` | Avisos de plagas reportados por el personal (la app todavía no los usa). | Sí. |
| `seguimientos_vencidos` | Intervenciones cuya última visita pidió otra visita y pasó el plazo. Se rehace sola todos los días. | No. |
| `operarios` | Quiénes aparecen en «¿Quién sos?», su correo (`mail`) y si reciben el recordatorio de las 19 h (`recordatorio`: SI/NO). | Sí. |
| `establecimientos` | Lugares que aparecen en la app, con su código de la BASE COMÚN del sistema HyS y el correo que recibe su parte del resumen (`mail_aviso`). | Sí. |
| `sectores` | Sectores de hospitales y de dependencias/CAPS. | Sí. |
| `plagas`, `productos`, `dosis_frecuencia` | Catálogo técnico. Solo HyS. | Sí. |
| `configuracion` | Correos que reciben el resumen diario (HyS, Dirección Asociada Administrativa, Área Externa) la dirección desde la que salen todos los correos (`mail_remitente`) y la lista de tipos de tarea de HyS (una fila por tipo, con `tipo_tarea` en la columna clave). | Sí. |
| `LEEME` | Descripción de las hojas. | Sí. |

**Para agregar o sacar algo de la app** (un operario, un CAP, un producto, una dosis, un tipo de tarea de HyS): se edita la hoja. Para que algo deje de aparecer, se pone **NO** en la columna `activo` (o **Inactivo** en `estado`, en productos). La app toma los cambios la próxima vez que se abre con señal. No hace falta tocar el código.

**Protocolo.** Si se carga a mano un número de protocolo (por ejemplo `139/2026`) en la columna `protocolo` de una visita, todas las visitas con ese número se toman como una misma intervención. Las visitas que la app marca como continuación (columna `protocolo_existente`) también se agrupan solas.

**Establecimientos que faltan en la BASE COMÚN:** Adolescencia, Casa Tutelada, CIT, Hilando Caminos, Pichi Anai, UGD - Ex APT y Vacunatorio Central. Están marcados en la columna `en_base_comun`. Cuando se carguen en el sistema HyS, completar `codigo_sistema`, `sitio_sistema`, `nombre_oficial` y `codigo_sisa`.

**Menú «MIPyV» de la planilla** (aparece al abrirla):
- *Preparar planilla*: crea hojas y columnas que falten. No borra nada. Usarlo después de cada actualización del servidor.
- *Actualizar seguimientos vencidos*: rehace esa hoja en el momento.
- *Enviar el resumen de hoy ahora*: manda el resumen del día a todos sus destinatarios (son correos reales).
- *Instalar avisos automáticos*: crea los tres activadores. Usarlo solo si se borraron; no los duplica. Si se ejecuta desde el editor, no muestra cartel: el aviso sale en la planilla.
- *Comprobar desde qué correo se envía*: muestra si los correos van a salir desde `mail_remitente`. No envía nada.
- *Ayuda*: explicación breve de todo lo anterior.

---

## 3. Cómo actualizar la app (GitHub)

1. Subir el o los archivos que cambiaron: **Add file → Upload files → Commit changes**.
2. Subir también **`version.js`** con el número nuevo (año.mes.día y una letra si hay más de un cambio el mismo día, por ejemplo `2026.10.07b`).
3. Listo. **`sw.js` no se toca más.** Los celulares descargan la versión nueva solos y se recargan cuando vuelven a la pantalla de inicio. Puede tardar hasta 15 minutos.

Para saber qué versión tiene cada celular: está escrita abajo en la pantalla de inicio y en la ayuda «?».

## 4. Cómo actualizar el servidor (Apps Script)

1. En la planilla: **Extensiones → Apps Script**.
2. Abrir `Código.gs`, borrar todo y pegar el contenido de **`Codigo_AppsScript.gs`** (el archivo que termina en **.gs**). La primera línea tiene que decir `MIPyV Red HZT — Servidor (Apps Script)`.
3. Guardar.
4. **Implementar → Gestionar implementaciones →** lápiz ✏️ **→ Versión: Nueva versión → Implementar.** No usar «Nueva implementación»: cambia la dirección y la app deja de enviar.
5. Si se agregaron columnas, en la planilla: **MIPyV → Preparar planilla**.
6. Comprobar: abrir la dirección del servidor en el navegador. Tiene que aparecer un texto que empieza con `{"operarios":`.

El archivo `Correccion_Catalogos.gs` que está en el mismo proyecto **no se vuelve a ejecutar**: borra y reescribe las hojas `productos`, `plagas` y `dosis_frecuencia`.

**Activadores** (ícono del reloj en el editor): tiene que haber tres, uno de cada uno.

| Función | Cuándo |
|---|---|
| `actualizarSeguimientosVencidos` | todos los días, 7 h |
| `enviarRecordatoriosOperarios` | lunes a viernes, 19 h |
| `enviarResumenDiario` | todos los días, 20 h |

---

## 5. Cómo funcionan los envíos

- Cada registro se guarda primero en el celular y después se envía. Se borra del celular **solo** cuando la planilla confirma que lo guardó.
- Si no hay señal o la planilla no responde, queda como «N sin enviar» y se reintenta solo: al volver la señal, al abrir la app y cada 5 minutos. También se puede tocar **Sincronizar**.
- Si un envío llega dos veces, la planilla lo reconoce y no lo duplica.
- Las listas «Continuar una abierta» y «Continuar un trabajo abierto» vienen de la planilla. El celular guarda la última que descargó para usarla sin señal y le suma lo que todavía no envió.
- **Importante para los operarios:** no borrar la app ni los datos del navegador mientras haya registros «sin enviar».

---

## 5 bis. Correos automáticos (una sola vez por día)

**Resumen diario (20 h):**

| Dónde fue la intervención | Reciben |
|---|---|
| En un CAPS | Dirección Asociada Administrativa (Cdor. Domínguez) + HyS + Área Externa (F. Funes) + el correo de ese CAPS (si una tarea abarcó varios CAPS, le llega a cada uno) |
| En el HZT u otro lugar que no es CAPS | Dirección Asociada Administrativa + HyS |

El resumen incluye las tres cosas: visitas de plagas, avances de saneamiento y otras tareas de HyS. La Dirección Asociada Administrativa y HyS reciben el resumen completo todos los días, aunque no haya registros; el asunto avisa qué operario no registró nada. Área Externa y cada CAPS reciben solo los días en que hubo trabajos ahí. Los correos se cambian en la planilla: hoja `configuracion` y columna `mail_aviso` de `establecimientos` («s/d» = no recibe).

**Recordatorio a operarios (lunes a viernes, 19 h):** al operario con `recordatorio` = SI que no tenga ningún trabajo registrado ese día (plagas, saneamiento u otra tarea de HyS; ni como quien cargó ni como acompañante) le llega un mail recordando la nota del 7/10/2026 sobre el registro obligatorio, con el enlace a la app. Hoy está activo solo para Javier Tramaleo. Llega también los feriados y los días sin trabajo: si hace falta, poner NO ese día.

**Remitente:** todos los correos salen desde **belenpellegrini.hys@gmail.com** (clave `mail_remitente` de la hoja `configuracion`). Esa dirección tiene que estar en Gmail › Configuración › Cuentas › «Enviar correo como» de la cuenta dueña de la planilla. Si no está, salen desde la cuenta dueña con respuesta a la de HyS. Después de pegar una versión nueva del servidor que pida permisos, ejecutar una vez `comprobarRemitente` desde el editor para autorizarlos.

Ningún correo se repite: aunque un activador corra dos veces, cada envío sale una sola vez por día.

---

## 6. Plan B: si falla GitHub

- La app sigue funcionando en los celulares donde ya estaba abierta, porque queda guardada en el teléfono.
- Si no se puede abrir, las visitas y avances se cargan a mano en la hoja correspondiente de la planilla, respetando los encabezados. Para que no se dupliquen, usar un identificador propio, por ejemplo `V-MANUAL-20261007-1`.
- Las listas (operarios, lugares, productos, dosis) se siguen editando en la planilla como siempre.

---

## 7. Problemas frecuentes

| Qué pasa | Causa | Qué hacer |
|---|---|---|
| El servidor muestra `ReferenceError: document is not defined` | En `Código.gs` se pegó `app.js` en lugar del servidor. | Repetir el paso 4 con el archivo `.gs`. |
| Quedan registros «sin enviar» aunque hay señal | La planilla rechazó el registro. | Tocar «?» en el inicio: muestra el motivo. |
| Un cambio en la planilla no aparece en la app | La app todavía no se abrió con señal. | Volver al inicio y esperar unos segundos, o cerrar y abrir la app. |
| La dosis dice «Consultar a HyS» | Esa combinación de plaga y producto no está en `dosis_frecuencia`. | Agregar la fila si corresponde. |
| Una versión nueva no aparece en el celular | Todavía no se descargó. | Esperar 15 minutos en la pantalla de inicio, o cerrar y abrir la app. |

---

## 8. Pendiente para más adelante

- Vincular una visita con un hallazgo de la hoja `hallazgos` (hoy la app no tiene ese paso, por eso la marca «Atendido» no se activa).
- Avances de saneamiento de agosto y septiembre que apuntan a trabajos que nunca llegaron a la planilla (se perdieron con el envío anterior): revisar si hace falta reconstruirlos a mano.

---

¹ Ley N.° 19.587 de Higiene y Seguridad en el Trabajo y Decreto Reglamentario N.° 351/79.
² Decreto N.° 351/79, condiciones de higiene en los ambientes laborales.
³ Resolución SRT N.° 905/2015, funciones de los Servicios de Higiene y Seguridad en el Trabajo.

*Servicio de Higiene y Seguridad · HySL — Hospitales más seguros para las personas*
