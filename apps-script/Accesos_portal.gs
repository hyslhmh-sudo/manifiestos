
// ------------------------------------------------------------------ Portal › Accesos (pantalla «Accesos» del portal de gestión)
// Solo con la clave MAESTRA (entra por Portal.gs › portalAccion_, acciones p_acc_…). Lee y escribe BASE COMÚN › ACCESOS,
// la misma hoja de siempre: todo se puede seguir haciendo a mano en la planilla.
function accPortal_(accion, x) {
  const bc = pBC_(), sh = bc.getSheetByName('ACCESOS');
  if (!sh) return { ok: false, mensaje: 'No está la hoja ACCESOS en BASE COMÚN.' };
  const H = sh.getRange(5, 1, 1, sh.getLastColumn()).getValues()[0].map(accTxt_), col = h => H.indexOf(h);
  const CAMPOS = ['DNI', 'APELLIDO_Y_NOMBRE', 'CORREO', 'ROL', 'ESTABLECIMIENTOS', 'MODULOS', 'ESTADO', 'OBSERVACIONES'];
  const filas = () => {
    const n = sh.getLastRow() - 5; if (n < 1) return [];
    return sh.getRange(6, 1, n, H.length).getDisplayValues().map((r, i) => { const o = { fila: 6 + i }; H.forEach((h, j) => { if (h) o[h] = accTxt_(r[j]); }); return o; })
      .filter(o => o.APELLIDO_Y_NOMBRE || o.DNI);
  };
  const limpiar = () => CacheService.getScriptCache().remove('accesos');
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  const nueva = () => Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join('') + '-' + String(1000 + Math.floor(Math.random() * 9000));

  if (accion === 'p_acc_listar') {
    const L = bc.getSheetByName('LISTAS'), listas = {};
    if (L) { const v = L.getDataRange().getDisplayValues(), h = v[0].map(accTxt_);
      ['ESTABLECIMIENTOS', 'MODULOS', 'ROL', 'ESTADO'].forEach(k => { const j = h.indexOf('ACCESOS_' + k); listas[k] = j < 0 ? [] : v.slice(1).map(r => accTxt_(r[j])).filter(Boolean); }); }
    const F = filas().map(o => { const c = o.CLAVE || '';
      o.CLAVE = esMaestra_(c) || /maestra/i.test(c) ? '(clave maestra)' : accClaveReal_(c) ? c : ''; return o; });
    return { ok: true, filas: F, listas: listas, modulos: ACC_MODULOS, soloPersonal: ACC_SOLO_PERSONAL,
      hoja: bc.getUrl() + '#gid=' + sh.getSheetId() };
  }

  if (accion === 'p_acc_guardar') return conLock_(() => {
    const d = x.datos || {}, dni = accDni_(d.DNI), fila = Number(x.fila) || 0;
    if (!accTxt_(d.APELLIDO_Y_NOMBRE)) return { ok: false, mensaje: 'Falta el apellido y nombre.' };
    if (fila && (fila < 6 || fila > sh.getLastRow())) return { ok: false, mensaje: 'No encontré esa fila en ACCESOS. Actualizá la pantalla.' };
    if (dni) { const otra = filas().find(o => accDni_(o.DNI) === dni && o.fila !== fila);
      if (otra) return { ok: false, mensaje: 'Ese DNI ya está cargado (fila ' + otra.fila + ': ' + otra.APELLIDO_Y_NOMBRE + ').' }; }
    if (/^activ/i.test(accTxt_(d.ESTADO)) && !dni) return { ok: false, mensaje: 'Para dejarla Activa hace falta el DNI (con el DNI y su clave entra).' };
    const f = fila || Math.max(sh.getLastRow() + 1, 6);
    CAMPOS.forEach(k => {
      const j = col(k); if (j < 0 || !(k in d)) return;
      let v = k === 'DNI' ? dni : accTxt_(d[k]);
      if (!v && k !== 'OBSERVACIONES') v = 's/d (revisar)';
      sh.getRange(f, j + 1).setValue(v);
    });
    if (!fila && col('DESDE') >= 0) sh.getRange(f, col('DESDE') + 1).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    limpiar();
    return { ok: true, fila: f };
  });

  if (accion === 'p_acc_clave') return conLock_(() => {
    const fila = Number(x.fila), jC = col('CLAVE');
    if (jC < 0) return { ok: false, mensaje: 'Falta la columna CLAVE en ACCESOS.' };
    if (!(fila >= 6 && fila <= sh.getLastRow())) return { ok: false, mensaje: 'No encontré esa fila en ACCESOS. Actualizá la pantalla.' };
    const actual = accTxt_(sh.getRange(fila, jC + 1).getDisplayValue());
    if (esMaestra_(actual) || /maestra/i.test(actual)) return { ok: false, mensaje: 'Esa persona usa la clave maestra: no se cambia desde acá.' };
    const k = nueva(); sh.getRange(fila, jC + 1).setValue(k); limpiar();
    return { ok: true, clave: k };
  });

  return { ok: false, mensaje: 'Acción desconocida.' };
}
