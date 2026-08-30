document.addEventListener('DOMContentLoaded', () => {
  function usuarioId() {
    return (window.KF && KF.store) ? KF.store.getUsuarioId() : 1;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function lastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  const nowInit = new Date();
  let viewYear = nowInit.getFullYear();
  let viewMonth = nowInit.getMonth() + 1;

  function monthRange() {
    const desde = `${viewYear}-${pad2(viewMonth)}-01`;
    const hasta = `${viewYear}-${pad2(viewMonth)}-${pad2(lastDayOfMonth(viewYear, viewMonth))}`;
    return { desde, hasta, year: viewYear, month: viewMonth };
  }

  function monthLabel() {
    const label = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric'
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function shiftViewMonth(delta) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth() + 1;
  }

  function updateAgendaMonthLabel() {
    const el = document.getElementById('agendaMonthLabel');
    if (el) el.textContent = monthLabel();
  }

  function esMontoVariable(r) {
    const texto = `${r.compromiso_nombre || ''} ${r.descripcion || ''}`.toLowerCase();
    if (texto.includes('resumen')) return true;
    if (!r.compromiso_id) return true;
    return false;
  }

  function fillAccountSelects() {
    if (!window.KF || !KF.store) return;
    KF.store.fillSelect(document.getElementById('cmCuenta'));
    KF.store.fillSelect(document.getElementById('confirmCuenta'));
  }

  async function fillTarjetaSelects() {
    try {
      const res = await fetch(`/api/planning/tarjetas?usuario_id=${usuarioId()}`);
      const list = res.ok ? await res.json() : [];
      const sel = document.getElementById('cmTarjeta');
      if (!sel) return;
      sel.innerHTML = '<option value=\"\">Seleccionar tarjeta (opcional)</option>';
      list.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.nombre} (${t.alias})`;
        sel.appendChild(opt);
      });
    } catch (e) {
      console.warn('No se pudieron cargar tarjetas', e);
    }
  }

  function bindPayButtons(root) {
    if (!root) return;
    root.querySelectorAll('[data-confirm]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('confirmInstanciaId').value = btn.dataset.confirm;
        document.getElementById('confirmMonto').value = btn.dataset.monto;
        document.getElementById('confirmPayLabel').textContent = btn.dataset.desc || 'Confirmar pago';
        fillAccountSelects();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmPayModal')).show();
      });
    });
  }

  function renderObligacionesGrid(tbody, fijos, variables) {
    if (!tbody) return;
    tbody.innerHTML = '';
    const tagged = fijos.map(r => ({ r, variable: false }))
      .concat(variables.map(r => ({ r, variable: true })))
      .sort((a, b) => String(a.r.fecha_vencimiento).localeCompare(String(b.r.fecha_vencimiento)));
    if (!tagged.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted px-3 py-3">No hay obligaciones en este mes.</td></tr>';
      return;
    }
    tagged.forEach(({ r, variable }) => {
      const tr = document.createElement('tr');
      tr.className = variable ? 'obl-row obl-row--variable' : 'obl-row obl-row--fijo';
      const pagado = r.estado === 'pagado';
      const money = typeof formatCurrency === 'function'
        ? formatCurrency(r.importe_esperado)
        : `$${Number(r.importe_esperado).toLocaleString('es-AR')}`;
      const tipoLabel = variable ? 'Variable' : 'Fijo';
      const tipoClass = variable ? 'obl-tipo obl-tipo--variable' : 'obl-tipo obl-tipo--fijo';
      const fechaClass = r.estado === 'vencido' ? 'text-danger' : '';
      const toggleClass = pagado ? 'btn-outline-success' : (r.estado === 'vencido' ? 'btn-outline-danger' : 'btn-outline-success');
      const toggleIcon = pagado ? 'bi-toggle-on' : 'bi-toggle-off';
      const toggleTitle = pagado ? 'Pagado' : (r.estado === 'vencido' ? 'Vencido — marcar como pagado' : 'Marcar como pagado');
      const confirmAttrs = pagado
        ? ''
        : ` data-confirm="${r.id}" data-monto="${r.importe_esperado}" data-desc="${(r.descripcion || '').replace(/"/g, '&quot;')}"`;
      // Construir descripción y badge de cuota si aplica
      const nombre = r.compromiso_nombre || r.descripcion || '';
      let descripcionHtml = nombre;
      if (r.compromiso_total_cuotas && Number(r.compromiso_total_cuotas) > 1) {
        const match = (r.descripcion || r.compromiso_nombre || '').match(/Cuota\s*(\d+)\/(\d+)/i);
        const cuotaText = match ? `Cuota ${match[1]}/${match[2]}` : `Cuota 1/${r.compromiso_total_cuotas}`;
        descripcionHtml = `<div>${nombre}</div><small class="text-white-50">${cuotaText}</small>`;
      }

      tr.innerHTML = `
        <td class="${fechaClass}">${r.fecha_vencimiento}</td>
        <td><span class="${tipoClass}">${tipoLabel}</span></td>
        <td>${descripcionHtml}</td>
        <td>${money}</td>
        <td class="text-center">
          <button type="button" class="btn btn-sm ${toggleClass}"${confirmAttrs} title="${toggleTitle}" ${pagado ? 'disabled' : ''}>
            <i class="bi ${toggleIcon}"></i>
          </button>
        </td>
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
    updateAgendaMonthLabel();
    const { desde, hasta } = monthRange();
    const res = await fetch(`/api/planning/agenda?desde=${desde}&hasta=${hasta}&usuario_id=${usuarioId()}`);
    const rows = res.ok ? await res.json() : [];
    const fijos = rows.filter(r => !esMontoVariable(r));
    const variables = rows.filter(esMontoVariable);
    const comprometido = rows.filter(r => r.estado !== 'pagado' && r.estado !== 'cancelado').reduce((s, r) => s + (Number(r.importe_esperado) || 0), 0);
    const cb = document.getElementById('comprometidoBreakdown');
    if (cb) cb.textContent = formatCurrency(comprometido);
    renderObligacionesGrid(document.getElementById('obligacionesTableBody'), fijos, variables);
    updateObligacionesKpis(fijos, variables);
  }

  async function syncAndLoadAgenda() {
    const { year, month } = monthRange();
    await fetch('/api/planning/sincronizar-mes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId(), year, month })
    }).catch(() => {});
    await loadAgenda();
  }

  if (window.KF && KF.on) {
    KF.on('kf:view-changed', (e) => {
      if (e.detail && e.detail.view === 'obligaciones') {
        fillAccountSelects();
        fillTarjetaSelects();
        // Ocultar el botón manual y sincronizar el mes automáticamente antes de cargar la agenda
        const genBtn = document.getElementById('generateInstancesBtn');
        if (genBtn) genBtn.style.display = 'none';
        syncAndLoadAgenda();
      }
    });
    KF.on('kf:cuentas-changed', fillAccountSelects);
  }

  // Control del modal: mostrar/ocultar campos según tipo de compromiso (gasto fijo / compra)
  const cmKind = document.getElementById('cmKind');
  const cmCuotasWrap = document.getElementById('cmCuotasWrap');
  const cmCuotas = document.getElementById('cmCuotas');
  const cmMonto = document.getElementById('cmMonto');
  const cmImportePorCuota = document.getElementById('cmImportePorCuota');
  const cmTarjeta = document.getElementById('cmTarjeta');
  const cmFreqEl = document.getElementById('cmFreq');
  const cmDiaEl = document.getElementById('cmDia');

  function updateCuotaInfo() {
    if (!cmMonto || !cmCuotas || !cmImportePorCuota) return;
    const total = Number(cmMonto.value) || 0;
    const n = Math.max(1, Number(cmCuotas.value) || 1);
    const per = +(total / n).toFixed(2);
    cmImportePorCuota.textContent = typeof formatCurrency === 'function' ? formatCurrency(per) : `$${per}`;
  }

  if (cmKind) {
    cmKind.addEventListener('change', () => {
      const kind = cmKind.value;
      if (kind === 'compra_cuotas') {
        cmCuotasWrap.style.display = '';
        cmFreqEl.style.display = 'none';
        cmDiaEl.style.display = 'none';
      } else if (kind === 'compra_unica') {
        cmCuotasWrap.style.display = '';
        cmCuotas.value = 1;
        cmFreqEl.style.display = 'none';
        cmDiaEl.style.display = 'none';
      } else { // gasto_fijo
        cmCuotasWrap.style.display = 'none';
        cmCuotas.value = '';
        cmFreqEl.style.display = '';
        cmDiaEl.style.display = '';
      }
      updateCuotaInfo();
    });
  }

  if (cmMonto) cmMonto.addEventListener('input', updateCuotaInfo);
  if (cmCuotas) cmCuotas.addEventListener('input', updateCuotaInfo);
  // llenar selects cuando se abre el modal
  const commitmentModalEl = document.getElementById('commitmentModal');
  if (commitmentModalEl) {
    commitmentModalEl.addEventListener('show.bs.modal', () => {
      fillAccountSelects();
      fillTarjetaSelects();
      if (cmKind) cmKind.dispatchEvent(new Event('change'));
    });
  }
  const agendaPrevBtn = document.getElementById('agendaPrevMonth');
  const agendaNextBtn = document.getElementById('agendaNextMonth');
  if (agendaPrevBtn) {
    agendaPrevBtn.addEventListener('click', () => {
      shiftViewMonth(-1);
      syncAndLoadAgenda();
    });
  }
  if (agendaNextBtn) {
    agendaNextBtn.addEventListener('click', () => {
      shiftViewMonth(1);
      syncAndLoadAgenda();
    });
  }
  updateAgendaMonthLabel();

  const agendaMonthLabelEl = document.getElementById('agendaMonthLabel');
  if (agendaMonthLabelEl) {
    agendaMonthLabelEl.style.cursor = 'pointer';
    agendaMonthLabelEl.title = 'Volver al mes actual';
    agendaMonthLabelEl.addEventListener('click', () => {
      const now = new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth() + 1;
      syncAndLoadAgenda();
    });
  }

  const generateBtn = document.getElementById('generateInstancesBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const { year, month } = monthRange();
      await fetch('/api/planning/instancias/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuarioId(), year, month })
      });
      await loadAgenda();
      if (window.KF && KF.emit) KF.emit('kf:obligaciones-changed');
    });
  }

  const saveCommitmentBtn = document.getElementById('saveCommitmentBtn');
  if (saveCommitmentBtn) {
    saveCommitmentBtn.addEventListener('click', async () => {
      const kind = (cmKind && cmKind.value) || 'gasto_fijo';
      const nombre = document.getElementById('cmNombre').value;
      const tipo = document.getElementById('cmTipo').value;
      const cuentaId = Number(document.getElementById('cmCuenta').value) || null;
      if (kind === 'compra_cuotas' || kind === 'compra_unica') {
        const monto_total = Number(document.getElementById('cmMonto').value) || 0;
        const total_cuotas = kind === 'compra_unica' ? 1 : Math.max(1, Number(document.getElementById('cmCuotas').value) || 1);
        const tarjeta_id = Number((cmTarjeta && cmTarjeta.value) || null) || null;
        const res = await fetch('/api/planning/compromisos/compra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: usuarioId(),
            nombre,
            monto_total,
            total_cuotas,
            tarjeta_id,
            cuenta_sugerida_id: cuentaId
          })
        });
        if (res.ok) {
          bootstrap.Modal.getOrCreateInstance(document.getElementById('commitmentModal')).hide();
          document.getElementById('commitmentForm').reset();
          const now = new Date();
          viewYear = now.getFullYear();
          viewMonth = now.getMonth() + 1;
          shiftViewMonth(1);
          await loadAgenda();
          if (window.KF && KF.emit) KF.emit('kf:obligaciones-changed');
        } else {
          alert('Error al guardar la compra');
        }
      } else {
        const body = {
          usuario_id: usuarioId(),
          nombre,
          tipo,
          frecuencia: document.getElementById('cmFreq').value,
          dia_vencimiento: Number(document.getElementById('cmDia').value) || null,
          importe_estimado: Number(document.getElementById('cmMonto').value),
          cuenta_sugerida_id: cuentaId
        };
        const res = await fetch('/api/planning/compromisos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          bootstrap.Modal.getOrCreateInstance(document.getElementById('commitmentModal')).hide();
          document.getElementById('commitmentForm').reset();
          await syncAndLoadAgenda();
          if (window.KF && KF.emit) KF.emit('kf:obligaciones-changed');
        } else {
          alert('Error al guardar la obligación');
        }
      }
    });
  }

  const confirmPayBtn = document.getElementById('confirmPayBtn');
  if (confirmPayBtn) {
    confirmPayBtn.addEventListener('click', async () => {
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
        if (window.KF && KF.emit) {
          KF.emit('kf:movimientos-changed');
          KF.emit('kf:obligaciones-changed');
        }
      } else {
        alert('Error al confirmar pago');
      }
    });
  }
});
