window.KF = window.KF || {};
KF.store = (function () {
  let usuarioId = 1;
  let accounts = [];
  let readyPromise = null;

  function fillSelect(el, extraOption) {
    if (!el) return;
    const opts = (extraOption || '') + accounts.map(c =>
      `<option value="${c.cuenta_id || c.id}">${c.cuenta || c.nombre}</option>`
    ).join('');
    el.innerHTML = opts;
  }

  function persistUsuario(id) {
    try { localStorage.setItem('kf:usuarioId', String(id)); } catch (err) {}
  }

  function savedUsuarioId() {
    try { return Number(localStorage.getItem('kf:usuarioId')); } catch (err) { return NaN; }
  }

  async function refreshUsers() {
    try {
      const res = await fetch('/api/cuentas/usuarios');
      const users = res.ok ? await res.json() : [];
      const saved = savedUsuarioId();
      if (saved && users.some(u => Number(u.id) === saved)) {
        usuarioId = saved;
      } else if (users.length) {
        usuarioId = users.map(u => Number(u.id)).sort((a, b) => a - b)[0];
        persistUsuario(usuarioId);
      }
    } catch (err) {
      console.error('Error cargando usuarios', err);
    }
    return usuarioId;
  }

  async function refreshAccounts() {
    try {
      const res = await fetch('/api/cuentas');
      if (res.ok) accounts = await res.json();
    } catch (err) {
      console.error('Error refreshing accounts', err);
    }
    return accounts;
  }

  function init() {
    if (!readyPromise) {
      readyPromise = (async () => {
        await refreshUsers();
        await refreshAccounts();
        if (window.KF && KF.emit) KF.emit('kf:store-ready', { usuarioId });
      })();
    }
    return readyPromise;
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    getUsuarioId() { return usuarioId; },
    getAccounts() { return accounts; },
    fillSelect,
    refreshAccounts,
    refreshUsers,
    init
  };
})();
