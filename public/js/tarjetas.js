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

let tarjetasCache = [];

function renderMaestro(tarjetas) {
  tarjetasCache = tarjetas;
  fillCardCuentaSelect();
  const tbody = document.getElementById('tarjetasMaestroBody');
  if (!tbody) return;
  if (!tarjetas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
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
      <td class="text-center">
        <button type="button" class="btn btn-sm btn-outline-primary me-1" data-edit-tarjeta="${t.id}" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-delete-tarjeta="${t.id}" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-edit-tarjeta]').forEach(btn => {
    btn.addEventListener('click', () => startEditTarjeta(Number(btn.dataset.editTarjeta)));
  });
  tbody.querySelectorAll('[data-delete-tarjeta]').forEach(btn => {
    btn.addEventListener('click', () => deleteTarjeta(Number(btn.dataset.deleteTarjeta)));
  });
}

function startEditTarjeta(id) {
  const t = tarjetasCache.find(x => Number(x.id) === id);
  if (!t) return;
  document.getElementById('cardId').value = t.id;
  document.getElementById('cardNombre').value = t.nombre;
  document.getElementById('cardAlias').value = t.alias;
  document.getElementById('cardCierre').value = t.dia_cierre;
  document.getElementById('cardVence').value = t.dia_vencimiento;
  const cuentaSel = document.getElementById('cardCuenta');
  if (cuentaSel) cuentaSel.value = t.cuenta_pago_id || '';
  const title = document.getElementById('cardFormTitle');
  if (title) title.textContent = `Editando: ${t.nombre}`;
  const submitBtn = document.getElementById('cardSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-save me-2"></i>Guardar cambios';
  const cancelBtn = document.getElementById('cardCancelEditBtn');
  if (cancelBtn) cancelBtn.style.display = '';
  document.getElementById('cardForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetCardForm() {
  document.getElementById('cardForm').reset();
  document.getElementById('cardId').value = '';
  const title = document.getElementById('cardFormTitle');
  if (title) title.textContent = 'Nueva tarjeta';
  const submitBtn = document.getElementById('cardSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-plus-lg me-2"></i>Crear tarjeta';
  const cancelBtn = document.getElementById('cardCancelEditBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deleteTarjeta(id) {
  const t = tarjetasCache.find(x => Number(x.id) === id);
  const nombre = t ? t.nombre : `#${id}`;
  if (!confirm(`¿Eliminar la tarjeta "${nombre}"? Se eliminarán también sus consumos y resúmenes asociados.`)) return;
  const res = await fetch(`/api/planning/tarjetas/${id}`, { method: 'DELETE' });
  if (res.ok) {
    if (window.KF && KF.emit) KF.emit('kf:tarjetas-changed');
  } else {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Error al eliminar la tarjeta');
  }
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
      const cardId = document.getElementById('cardId').value;
      const payload = {
        usuario_id: usuarioTarjetas(),
        nombre: document.getElementById('cardNombre').value,
        alias: document.getElementById('cardAlias').value,
        dia_cierre: Number(document.getElementById('cardCierre').value),
        dia_vencimiento: Number(document.getElementById('cardVence').value),
        cuenta_pago_id: Number(document.getElementById('cardCuenta').value) || null
      };
      const res = cardId
        ? await fetch(`/api/planning/tarjetas/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/planning/tarjetas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
      if (res.ok) {
        resetCardForm();
        fillCardCuentaSelect();
        if (window.KF && KF.emit) KF.emit('kf:tarjetas-changed');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || (cardId ? 'Error al actualizar tarjeta' : 'Error al crear tarjeta'));
      }
    });
  }

  const cardCancelEditBtn = document.getElementById('cardCancelEditBtn');
  if (cardCancelEditBtn) {
    cardCancelEditBtn.addEventListener('click', resetCardForm);
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
