function usuarioTarjetas() {
  return (window.KF && KF.store) ? KF.store.getUsuarioId() : 1;
}

function nombreCuentaPago(cuentaPagoId) {
  if (!cuentaPagoId) return '—';
  const accounts = (window.KF && KF.store) ? KF.store.getAccounts() : [];
  const acc = accounts.find(c => Number(c.cuenta_id || c.id) === Number(cuentaPagoId));
  return acc ? (acc.cuenta || acc.nombre) : '—';
}

async function fetchTarjetas() {
  const uid = usuarioTarjetas();
  const res = await fetch(`/api/planning/tarjetas?usuario_id=${uid}`);
  return res.ok ? await res.json() : [];
}

function fillCardCuentaSelect() {
  if (window.KF && KF.store) KF.store.fillSelect(document.getElementById('cardCuenta'));
}

function renderMaestro(tarjetas) {
  fillCardCuentaSelect();
  const tbody = document.getElementById('tarjetasMaestroBody');
  if (!tbody) return;
  if (!tarjetas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1"></i>
          <p class="mt-2 mb-0">No hay tarjetas registradas</p>
        </td>
      </tr>`;
    return;
  }
  tbody.innerHTML = tarjetas.map(t => `
    <tr>
      <td>${t.nombre}</td>
      <td><code>${t.alias}</code></td>
      <td>${t.dia_cierre}</td>
      <td>${t.dia_vencimiento}</td>
      <td>${nombreCuentaPago(t.cuenta_pago_id)}</td>
    </tr>`).join('');
}

async function mostrarResumenTarjeta(id) {
  const detalle = document.getElementById('tarjetaDetalle');
  if (!detalle) return;
  detalle.innerHTML = '<div class="text-muted">Cargando...</div>';
  const uid = usuarioTarjetas();
  const res = await fetch(`/api/planning/tarjetas/${id}/resumen-actual?usuario_id=${uid}`);
  if (!res.ok) {
    detalle.innerHTML = '<div class="text-danger">Error cargando tarjeta</div>';
    return;
  }
  const data = await res.json();
  detalle.innerHTML = `<h6 class="text-white">Resumen ${data.tarjeta.nombre} — ${data.periodo}</h6>
    <div class="row">
      <div class="col"><div class="text-white-50">Total pendiente</div><div class="fw-bold text-white">${formatCurrency(data.totalPendiente)}</div></div>
      <div class="col"><div class="text-white-50">Cuotas pendientes</div><div class="fw-bold text-white">${(data.cuotas || []).length}</div></div>
    </div>`;
}

function renderOperativo(tarjetas) {
  const sel = document.getElementById('consumoTarjeta');
  const prev = sel ? sel.value : '';
  if (sel) {
    if (!tarjetas.length) {
      sel.innerHTML = '<option value="">No hay tarjetas — crealas arriba</option>';
    } else {
      sel.innerHTML = tarjetas.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
      if (prev && tarjetas.some(t => String(t.id) === String(prev))) sel.value = prev;
    }
  }

  const listEl = document.getElementById('tarjetasList');
  if (!listEl) return;
  if (!tarjetas.length) {
    listEl.innerHTML = '<div class="text-white-50">No hay tarjetas. Creá una con el formulario de arriba.</div>';
    const detalle = document.getElementById('tarjetaDetalle');
    if (detalle) detalle.innerHTML = '';
    return;
  }
  listEl.innerHTML = tarjetas.map(t =>
    `<button type="button" class="btn btn-outline-secondary m-1 tarjeta-btn" data-id="${t.id}">${t.nombre}</button>`
  ).join('');
  listEl.querySelectorAll('.tarjeta-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (sel) sel.value = id;
      await mostrarResumenTarjeta(id);
    });
  });
}

async function loadTarjetas() {
  try {
    const tarjetas = await fetchTarjetas();
    renderMaestro(tarjetas);
    renderOperativo(tarjetas);
  } catch (err) {
    console.error('Error cargando tarjetas:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.KF && KF.on) {
    KF.on('kf:view-changed', (e) => {
      const view = e.detail && e.detail.view;
      if (view === 'cuentas') loadTarjetas();
    });
    KF.on('kf:tarjetas-changed', loadTarjetas);
    KF.on('kf:cuentas-changed', () => {
      fillCardCuentaSelect();
      loadTarjetas();
    });
  }

  const cardForm = document.getElementById('cardForm');
  if (cardForm) {
    cardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const res = await fetch('/api/planning/tarjetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioTarjetas(),
          nombre: document.getElementById('cardNombre').value,
          alias: document.getElementById('cardAlias').value,
          dia_cierre: Number(document.getElementById('cardCierre').value),
          dia_vencimiento: Number(document.getElementById('cardVence').value),
          cuenta_pago_id: Number(document.getElementById('cardCuenta').value) || null
        })
      });
      if (res.ok) {
        e.target.reset();
        fillCardCuentaSelect();
        if (window.KF && KF.emit) KF.emit('kf:tarjetas-changed');
      } else alert('Error al crear tarjeta');
    });
  }

  const consumoForm = document.getElementById('consumoForm');
  if (consumoForm) {
    consumoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tarjetaId = Number(document.getElementById('consumoTarjeta').value);
      if (!tarjetaId) {
        alert('Elegí una tarjeta. Si no hay ninguna, creala arriba.');
        return;
      }
      const res = await fetch('/api/planning/consumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarjeta_id: tarjetaId,
          descripcion: document.getElementById('consumoDesc').value,
          monto: Number(document.getElementById('consumoMonto').value),
          fecha_compra: new Date().toISOString().slice(0, 19).replace('T', ' '),
          cuotas: document.getElementById('consumoCuotas').value
        })
      });
      if (res.ok) {
        e.target.reset();
        const sel = document.getElementById('consumoTarjeta');
        if (sel) sel.value = String(tarjetaId);
        if (window.KF && KF.emit) KF.emit('kf:tarjetas-changed');
        await mostrarResumenTarjeta(tarjetaId);
      } else alert('Error al registrar consumo');
    });
  }
});
