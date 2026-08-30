window.KF = window.KF || {};
KF.nav = (function () {
  const viewIds = {
    inicio: 'view-inicio',
    movimientos: 'view-movimientos',
    obligaciones: 'view-obligaciones',
    simulador: 'view-simulador',
    cuentas: 'view-cuentas'
  };

  const buttonIds = {
    inicio: 'inicio-button',
    movimientos: 'movimientos-button',
    obligaciones: 'obligaciones-button',
    simulador: 'simulador-button',
    cuentas: 'cuentas-button'
  };

  function show(name) {
    Object.entries(viewIds).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = key === name ? '' : 'none';
    });
    Object.entries(buttonIds).forEach(([key, id]) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('is-on', key === name);
    });
    if (window.KF && KF.emit) KF.emit('kf:view-changed', { view: name });
  }

  document.addEventListener('DOMContentLoaded', () => {
    Object.entries(buttonIds).forEach(([key, id]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        show(key);
      });
    });
  });

  return { show };
})();
