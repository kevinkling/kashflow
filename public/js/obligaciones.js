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

  function nextCalendarMonth(from = new Date()) {
    const d = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  function setViewToNextMonth() {
    const next = nextCalendarMonth();
    viewYear = next.year;
    viewMonth = next.month;
  }

  const initialMonth = nextCalendarMonth();
  let viewYear = initialMonth.year;
  let viewMonth = initialMonth.month;

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
    // Prioridad: elección explícita del usuario al crear la obligación
    if (r.compromiso_es_variable === 1 || r.compromiso_es_variable === true) return true;
    if (r.compromiso_id && (r.compromiso_es_variable === 0 || r.compromiso_es_variable === false)) return false;
    // Fallback heurístico para compromisos sin el campo (datos viejos) o sin compromiso asociado
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
    root.querySelectorAll('[data-edit-obligacion]').forEach(btn => {
      btn.addEventListener('click', () => openEditObligacion(Number(btn.dataset.editObligacion)));
    });
    root.querySelectorAll('[data-delete-obligacion]').forEach(btn => {
      btn.addEventListener('click', () => deleteObligacion(Number(btn.dataset.deleteObligacion)));
    });
  }

  let agendaRowsCache = [];

  function openEditObligacion(id) {
    const r = agendaRowsCache.find(x => Number(x.id) === id);
    if (!r) return;
    document.getElementById('eoId').value = r.id;
    document.getElementById('eoDesc').value = r.descripcion || r.compromiso_nombre || '';
    document.getElementById('eoFecha').value = String(r.fecha_vencimiento).slice(0, 10);
    document.getElementById('eoMonto').value = r.importe_esperado;
    const eoEstadoEl = document.getElementById('eoEstado');
    if (eoEstadoEl) {
      const yaPagado = r.estado === 'pagado';
      eoEstadoEl.dataset.actualEstado = r.estado;
      eoEstadoEl.value = yaPagado ? 'pendiente' : r.estado;
      eoEstadoEl.disabled = yaPagado;
      eoEstadoEl.title = yaPagado ? 'Ya está pagada; para revertirla eliminala y volvé a generarla.' : '';
    }
    const eoCuentaEl = document.getElementById('eoCuenta');
    if (eoCuentaEl) {
      const accounts = (window.KF && KF.store) ? KF.store.getAccounts() : [];
      eoCuentaEl.innerHTML = '<option value="">-- Sin especificar --</option>' + accounts.map(c =>
        `<option value="${c.cuenta_id || c.id}">${c.cuenta || c.nombre}</option>`
      ).join('');
      eoCuentaEl.value = r.cuenta_pago_id ? String(r.cuenta_pago_id) : '';
    }
    // Tipo (egreso/ingreso) y Fijo/Variable son atributos del compromiso: solo aplican si hay uno asociado
    const eoTipoWrap = document.getElementById('eoTipoWrap');
    const eoVariableWrap = document.getElementById('eoVariableWrap');
    const tieneCompromiso = !!r.compromiso_id;
    if (eoTipoWrap) eoTipoWrap.style.display = tieneCompromiso ? '' : 'none';
    if (eoVariableWrap) eoVariableWrap.style.display = tieneCompromiso ? '' : 'none';
    if (tieneCompromiso) {
      const eoTipoEl = document.getElementById('eoTipo');
      if (eoTipoEl) eoTipoEl.value = r.compromiso_tipo || 'egreso';
      const variableRadio = document.getElementById(r.compromiso_es_variable ? 'eoVariableSi' : 'eoVariableNo');
      if (variableRadio) variableRadio.checked = true;
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('editObligacionModal')).show();
  }

  async function deleteObligacion(id) {
    const r = agendaRowsCache.find(x => Number(x.id) === id);
    const desc = r ? (r.descripcion || r.compromiso_nombre || '') : `#${id}`;
    if (!confirm(`¿Eliminar la obligación "${desc}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/planning/instancias/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await syncAndLoadAgenda();
      if (window.KF && KF.emit) KF.emit('kf:obligaciones-changed');
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Error al eliminar la obligación');
    }
  }

  function buildObligacionRow(r, variable) {
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

    tr.dataset.instanciaId = r.id;
    tr.innerHTML = `
      <td class="${fechaClass}">${r.fecha_vencimiento}</td>
      <td><span class="${tipoClass}">${tipoLabel}</span></td>
      <td>${descripcionHtml}</td>
      <td>${money}</td>
      <td class="text-center text-nowrap">
        <button type="button" class="btn btn-sm ${toggleClass}"${confirmAttrs} title="${toggleTitle}" ${pagado ? 'disabled' : ''}>
          <i class="bi ${toggleIcon}"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-light ms-1" data-edit-obligacion="${r.id}" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger ms-1" data-delete-obligacion="${r.id}" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    return tr;
  }

  function buildTarjetaGroupHeader(group) {
    const tr = document.createElement('tr');
    tr.className = 'obl-row obl-row--group';
    tr.style.cursor = 'pointer';
    const total = group.items.reduce((s, it) => s + (Number(it.r.importe_esperado) || 0), 0);
    const money = typeof formatCurrency === 'function' ? formatCurrency(total) : `$${total.toLocaleString('es-AR')}`;
    const count = group.items.length;
    tr.innerHTML = `
      <td colspan="3">
        <i class="bi bi-chevron-right obl-group-caret me-2"></i>
        <i class="bi bi-credit-card me-1"></i>
        <strong>${group.nombre}</strong>
        <span class="text-white-50 ms-2">(${count} ${count === 1 ? 'gasto' : 'gastos'})</span>
      </td>
      <td>${money}</td>
      <td></td>
    `;
    tr.addEventListener('click', () => {
      const expanded = tr.classList.toggle('expanded');
      const caret = tr.querySelector('.obl-group-caret');
      if (caret) caret.className = expanded ? 'bi bi-chevron-down obl-group-caret me-2' : 'bi bi-chevron-right obl-group-caret me-2';
      tbodyRef.querySelectorAll(`tr.obl-group-row[data-group-id="${group.id}"]`).forEach(row => {
        row.style.display = expanded ? '' : 'none';
      });
    });
    return tr;
  }

  let tbodyRef = null;

  function renderObligacionesGrid(tbody, fijos, variables) {
    if (!tbody) return;
    tbodyRef = tbody;
    tbody.innerHTML = '';
    const tagged = fijos.map(r => ({ r, variable: false }))
      .concat(variables.map(r => ({ r, variable: true })));
    if (!tagged.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted px-3 py-3">No hay obligaciones en este mes.</td></tr>';
      return;
    }

    // Agrupar por tarjeta (cuando la instancia u su compromiso tienen tarjeta_id)
    const groups = new Map();
    const standalone = [];
    tagged.forEach(item => {
      const tId = item.r.tarjeta_id;
      if (tId) {
        if (!groups.has(tId)) {
          groups.set(tId, { id: tId, nombre: item.r.tarjeta_nombre || `Tarjeta #${tId}`, items: [] });
        }
        groups.get(tId).items.push(item);
      } else {
        standalone.push(item);
      }
    });

    const combined = standalone.map(item => ({ kind: 'row', item, fecha: item.r.fecha_vencimiento }));
    groups.forEach(group => {
      group.items.sort((a, b) => String(a.r.fecha_vencimiento).localeCompare(String(b.r.fecha_vencimiento)));
      combined.push({ kind: 'group', group, fecha: group.items[0].r.fecha_vencimiento });
    });
    combined.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

    combined.forEach(entry => {
      if (entry.kind === 'row') {
        tbody.appendChild(buildObligacionRow(entry.item.r, entry.item.variable));
      } else {
        tbody.appendChild(buildTarjetaGroupHeader(entry.group));
        entry.group.items.forEach(item => {
          const tr = buildObligacionRow(item.r, item.variable);
          tr.classList.add('obl-group-row');
          tr.dataset.groupId = entry.group.id;
          tr.style.display = 'none';
          tbody.appendChild(tr);
        });
      }
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
    agendaRowsCache = rows;
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
  const cmVariableWrap = document.getElementById('cmVariableWrap');
  const cmCuentaWrap = document.getElementById('cmCuentaWrap');
  const cmCuentaEl = document.getElementById('cmCuenta');

  function updateCuentaVisibility() {
    if (!cmCuentaWrap || !cmKind) return;
    const isCompra = cmKind.value === 'compra_cuotas' || cmKind.value === 'compra_unica';
    const tieneTarjeta = isCompra && cmTarjeta && cmTarjeta.value;
    cmCuentaWrap.style.display = tieneTarjeta ? 'none' : '';
    if (cmCuentaEl) {
      if (tieneTarjeta) cmCuentaEl.removeAttribute('required');
    }
  }

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
        if (cmVariableWrap) cmVariableWrap.style.display = 'none';
      } else if (kind === 'compra_unica') {
        cmCuotasWrap.style.display = '';
        cmCuotas.value = 1;
        cmFreqEl.style.display = 'none';
        cmDiaEl.style.display = 'none';
        if (cmVariableWrap) cmVariableWrap.style.display = 'none';
      } else { // gasto_fijo
        cmCuotasWrap.style.display = 'none';
        cmCuotas.value = '';
        cmFreqEl.style.display = '';
        cmDiaEl.style.display = '';
        if (cmVariableWrap) cmVariableWrap.style.display = '';
      }
      updateCuotaInfo();
      updateCuentaVisibility();
    });
  }

  if (cmTarjeta) cmTarjeta.addEventListener('change', updateCuentaVisibility);
  if (cmMonto) cmMonto.addEventListener('input', updateCuotaInfo);
  if (cmCuotas) cmCuotas.addEventListener('input', updateCuotaInfo);
  // llenar selects cuando se abre el modal
  const commitmentModalEl = document.getElementById('commitmentModal');
  if (commitmentModalEl) {
    commitmentModalEl.addEventListener('show.bs.modal', () => {
      fillAccountSelects();
      fillTarjetaSelects();
      if (cmKind) cmKind.dispatchEvent(new Event('change'));
      updateCuentaVisibility();
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
    agendaMonthLabelEl.title = 'Volver al mes siguiente';
    agendaMonthLabelEl.addEventListener('click', () => {
      setViewToNextMonth();
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
          setViewToNextMonth();
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
          cuenta_sugerida_id: cuentaId,
          es_variable: (() => { const el = document.querySelector('input[name="cmVariable"]:checked'); return el ? Number(el.value) : 0; })()
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

  const editObligacionForm = document.getElementById('editObligacionForm');
  if (editObligacionForm) {
    editObligacionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('eoId').value;
      const eoTipoWrapVisible = document.getElementById('eoTipoWrap').style.display !== 'none';
      const eoVariableRadio = document.querySelector('input[name="eoVariable"]:checked');
      const eoEstadoEl = document.getElementById('eoEstado');
      const payload = {
        descripcion: document.getElementById('eoDesc').value,
        fecha_vencimiento: document.getElementById('eoFecha').value,
        importe_esperado: Number(document.getElementById('eoMonto').value),
        cuenta_pago_id: Number(document.getElementById('eoCuenta').value) || null,
        estado: eoEstadoEl.disabled ? eoEstadoEl.dataset.actualEstado : eoEstadoEl.value
      };
      if (eoTipoWrapVisible) {
        payload.tipo = document.getElementById('eoTipo').value;
        payload.es_variable = eoVariableRadio ? Number(eoVariableRadio.value) : 0;
      }
      const res = await fetch(`/api/planning/instancias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('editObligacionModal')).hide();
        await syncAndLoadAgenda();
        if (window.KF && KF.emit) KF.emit('kf:obligaciones-changed');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error al actualizar la obligación');
      }
    });
  }

  const eoDeleteBtn = document.getElementById('eoDeleteBtn');
  if (eoDeleteBtn) {
    eoDeleteBtn.addEventListener('click', async () => {
      const id = document.getElementById('eoId').value;
      if (!id) return;
      if (!confirm('¿Eliminar esta obligación? Esta acción no se puede deshacer.')) return;
      const res = await fetch(`/api/planning/instancias/${id}`, { method: 'DELETE' });
      if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('editObligacionModal')).hide();
        await syncAndLoadAgenda();
        if (window.KF && KF.emit) KF.emit('kf:obligaciones-changed');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error al eliminar la obligación');
      }
    });
  }
});
