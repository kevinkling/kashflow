document.addEventListener('DOMContentLoaded', () => {
  const viewIds = {
    movimientos: 'view-movimientos',
    obligaciones: 'view-obligaciones',
    simulador: 'view-simulador'
  };
  const navButtons = {
    movimientos: document.getElementById('movimientos-button'),
    obligaciones: document.getElementById('planning-button'),
    simulador: document.getElementById('simulator-button')
  };
  window.showAppView = function showAppView(name) {
    Object.entries(viewIds).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = key === name ? '' : 'none';
    });
    Object.entries(navButtons).forEach(([key, btn]) => {
      if (!btn) return;
      btn.classList.toggle('is-on', key === name);
    });
  };

  let usuarioId = 1;
  let accounts = [];

  async function loadUsersAndAccounts() {
    const [usersRes, accRes] = await Promise.all([
      fetch('/api/cuentas/usuarios'),
      fetch('/api/cuentas')
    ]);
    const users = usersRes.ok ? await usersRes.json() : [];
    if (users.length) usuarioId = users[0].id;
    accounts = accRes.ok ? await accRes.json() : [];
    fillAccountSelects();
  }

  function fillAccountSelects() {
    const ids = ['qmCuenta', 'cmCuenta', 'cardCuenta', 'confirmCuenta'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = accounts.map(c =>
        `<option value="${c.cuenta_id || c.id}">${c.cuenta || c.nombre}</option>`
      ).join('');
    });
  }

  function monthRange() {
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { desde, hasta, year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  function esMontoVariable(r) {
    const texto = `${r.compromiso_nombre || ''} ${r.descripcion || ''}`.toLowerCase();
    if (texto.includes('resumen')) return true;
    if (!r.compromiso_id) return true;
    return false;
  }

  function bindPayButtons(root) {
    root.querySelectorAll('[data-confirm]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('confirmInstanciaId').value = btn.dataset.confirm;
        document.getElementById('confirmMonto').value = btn.dataset.monto;
        document.getElementById('confirmPayLabel').textContent = btn.dataset.desc || 'Confirmar pago';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmPayModal')).show();
      });
    });
  }

  function renderObligacionesRows(tbody, rows, emptyText) {
    tbody.innerHTML = '';
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted px-3 py-3">${emptyText}</td></tr>`;
      return;
    }
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const estadoClass = r.estado === 'pagado' ? 'text-success' : (r.estado === 'pendiente' ? 'text-warning' : 'text-danger');
      const money = typeof formatCurrency === 'function'
        ? formatCurrency(r.importe_esperado)
        : `$${Number(r.importe_esperado).toLocaleString('es-AR')}`;
      tr.innerHTML = `
        <td>${r.fecha_vencimiento}</td>
        <td>${r.compromiso_nombre || r.descripcion}</td>
        <td>${money}</td>
        <td class="${estadoClass}">${r.estado}</td>
        <td>${r.estado === 'pagado' ? '' : `<button class="btn btn-sm btn-outline-success" data-confirm="${r.id}" data-monto="${r.importe_esperado}" data-desc="${r.descripcion}">Pagar</button>`}</td>
      `;
      tbody.appendChild(tr);
    });
    bindPayButtons(tbody);
  }

  function sumImporte(rows, pred) {
    return rows.filter(pred).reduce((s, r) => s + (Number(r.importe_esperado) || 0), 0);
  }

  function updateObligacionesKpis(fijos, variables) {
    const all = fijos.concat(variables);
    const abierto = (r) => r.estado !== 'pagado' && r.estado !== 'cancelado';
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCurrency(value);
    };
    set('oblTotalMes', sumImporte(all, abierto));
    set('oblTotalFijos', sumImporte(fijos, abierto));
    set('oblTotalVariables', sumImporte(variables, abierto));
    set('oblTotalVencidos', sumImporte(all, (r) => r.estado === 'vencido'));
    set('oblTotalPagados', sumImporte(all, (r) => r.estado === 'pagado'));
    set('oblTotalPendientes', sumImporte(all, (r) => r.estado === 'pendiente'));
  }

  async function loadAgenda() {
    const { desde, hasta } = monthRange();
    const res = await fetch(`/api/planning/agenda?desde=${desde}&hasta=${hasta}`);
    const rows = res.ok ? await res.json() : [];
    const fijos = rows.filter(r => !esMontoVariable(r));
    const variables = rows.filter(esMontoVariable);
    renderObligacionesRows(
      document.getElementById('fijosTableBody'),
      fijos,
      'No hay montos fijos este mes. Generá el mes o creá una obligación.'
    );
    renderObligacionesRows(
      document.getElementById('variablesTableBody'),
      variables,
      'No hay resúmenes ni cargos variables este mes.'
    );
    updateObligacionesKpis(fijos, variables);
  }

  async function loadCards() {
    const res = await fetch(`/api/planning/tarjetas?usuario_id=${usuarioId}`);
    const rows = res.ok ? await res.json() : [];
    const sel = document.getElementById('consumoTarjeta');
    sel.innerHTML = rows.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  }

  navButtons.movimientos.addEventListener('click', () => {
    showAppView('movimientos');
  });

  navButtons.obligaciones.addEventListener('click', async () => {
    showAppView('obligaciones');
    await loadUsersAndAccounts();
    await loadAgenda();
    await loadCards();
  });

  loadUsersAndAccounts();

  document.getElementById('generateInstancesBtn').addEventListener('click', async () => {
    const { year, month } = monthRange();
    await fetch('/api/planning/instancias/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, year, month })
    });
    await loadAgenda();
  });

  document.getElementById('saveCommitmentBtn').addEventListener('click', async () => {
    const body = {
      usuario_id: usuarioId,
      nombre: document.getElementById('cmNombre').value,
      tipo: document.getElementById('cmTipo').value,
      frecuencia: document.getElementById('cmFreq').value,
      dia_vencimiento: Number(document.getElementById('cmDia').value) || null,
      importe_estimado: Number(document.getElementById('cmMonto').value),
      cuenta_sugerida_id: Number(document.getElementById('cmCuenta').value) || null
    };
    const res = await fetch('/api/planning/compromisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('commitmentModal')).hide();
      document.getElementById('commitmentForm').reset();
      await loadAgenda();
    } else {
      alert('Error al guardar la obligación');
    }
  });

  document.getElementById('confirmPayBtn').addEventListener('click', async () => {
    const id = document.getElementById('confirmInstanciaId').value;
    const res = await fetch(`/api/planning/instancias/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuenta_pago_id: Number(document.getElementById('confirmCuenta').value),
        monto_final: Number(document.getElementById('confirmMonto').value),
        descripcion: document.getElementById('confirmPayLabel').textContent
      })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('confirmPayModal')).hide();
      await loadAgenda();
      if (typeof loadTransactions === 'function') loadTransactions();
    } else {
      alert('Error al confirmar pago');
    }
  });

  document.getElementById('quickMoveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuenta_id: Number(document.getElementById('qmCuenta').value),
        tipo: document.getElementById('qmTipo').value,
        monto: Number(document.getElementById('qmMonto').value),
        descripcion: document.getElementById('qmDesc').value
      })
    });
    if (res.ok) {
      e.target.reset();
      if (typeof loadTransactions === 'function') loadTransactions();
    } else alert('Error al registrar movimiento');
  });

  document.getElementById('cardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/planning/tarjetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: usuarioId,
        nombre: document.getElementById('cardNombre').value,
        alias: document.getElementById('cardAlias').value,
        dia_cierre: Number(document.getElementById('cardCierre').value),
        dia_vencimiento: Number(document.getElementById('cardVence').value),
        cuenta_pago_id: Number(document.getElementById('cardCuenta').value) || null
      })
    });
    if (res.ok) {
      e.target.reset();
      await loadCards();
    } else alert('Error al crear tarjeta');
  });

  document.getElementById('consumoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/planning/consumos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tarjeta_id: Number(document.getElementById('consumoTarjeta').value),
        descripcion: document.getElementById('consumoDesc').value,
        monto: Number(document.getElementById('consumoMonto').value),
        fecha_compra: new Date().toISOString().slice(0, 19).replace('T', ' '),
        cuotas: document.getElementById('consumoCuotas').value
      })
    });
    if (res.ok) e.target.reset();
    else alert('Error al registrar consumo');
  });
});
