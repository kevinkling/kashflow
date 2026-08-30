document.addEventListener('DOMContentLoaded', () => {
  const scenarioSelect = document.getElementById('scenarioSelect');
  const createBtn = document.getElementById('createScenarioBtn');
  const newScenarioName = document.getElementById('newScenarioName');
  const scenarioControls = document.getElementById('scenarioControls');
  const adjustmentsList = document.getElementById('adjustmentsList');
  const simInstancia = document.getElementById('simInstancia');
  const simInstanciaMonto = document.getElementById('simInstanciaMonto');
  const simAplicarPago = document.getElementById('simAplicarPago');
  const simOmitirPago = document.getElementById('simOmitirPago');
  const simLibreDesc = document.getElementById('simLibreDesc');
  const simLibreMonto = document.getElementById('simLibreMonto');
  const simLibreSign = document.getElementById('simLibreSign');
  const simLibreMes = document.getElementById('simLibreMes');
  const simAddLibre = document.getElementById('simAddLibre');
  const simResult = document.getElementById('simResult');

  const MESES = 6;
  let pendingInstances = [];

  function usuarioId() {
    return (window.KF && KF.store) ? KF.store.getUsuarioId() : 1;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function escenarioId() {
    return scenarioSelect && scenarioSelect.value ? scenarioSelect.value : '';
  }

  function horizonRange(meses = MESES) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const desde = `${y}-${pad2(m)}-01`;
    const end = new Date(y, m - 1 + meses, 0);
    const hasta = `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`;
    return { desde, hasta };
  }

  function monthChoices(meses = MESES) {
    const now = new Date();
    const opts = [];
    for (let i = 0; i < meses; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const periodo = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      const raw = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      opts.push({
        periodo,
        fecha: `${periodo}-01`,
        label: raw.charAt(0).toUpperCase() + raw.slice(1)
      });
    }
    return opts;
  }

  function labelPeriodo(periodo) {
    const [y, m] = String(periodo || '').split('-').map(Number);
    if (!y || !m) return periodo || '';
    return new Date(y, m - 1, 1)
      .toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
      .replace('.', '');
  }

  function tituloInstancia(row) {
    const desc = (row.descripcion || '').trim().replace(/\s+\d{4}-\d{2}$/, '');
    const nombre = (row.compromiso_nombre || '').trim().replace(/\s+\d{4}-\d{2}$/, '');
    if (desc && nombre && desc.toLowerCase() !== nombre.toLowerCase()) return desc;
    return desc || nombre || 'Sin nombre';
  }

  function fillMonthSelect() {
    if (!simLibreMes) return;
    simLibreMes.innerHTML = '';
    monthChoices().forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.fecha;
      o.textContent = opt.label;
      simLibreMes.appendChild(o);
    });
  }

  async function syncHorizon() {
    const now = new Date();
    for (let i = 0; i < MESES; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      await fetch('/api/planning/sincronizar-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioId(),
          year: d.getFullYear(),
          month: d.getMonth() + 1
        })
      }).catch(() => {});
    }
  }

  async function loadPending() {
    if (!simInstancia) return;
    const { desde, hasta } = horizonRange();
    const res = await fetch(`/api/planning/agenda?desde=${desde}&hasta=${hasta}&usuario_id=${usuarioId()}`);
    const rows = res.ok ? await res.json() : [];
    pendingInstances = (rows || []).filter((r) => r.estado !== 'pagado' && r.estado !== 'cancelado');
    const prev = simInstancia.value;
    simInstancia.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = pendingInstances.length ? 'Elegí un pago' : 'No hay pagos pendientes';
    simInstancia.appendChild(blank);
    pendingInstances.forEach((r) => {
      const o = document.createElement('option');
      o.value = r.id;
      o.dataset.monto = String(r.importe_esperado || 0);
      const fecha = String(r.fecha_vencimiento || '').slice(0, 10);
      o.textContent = `${fecha} — ${tituloInstancia(r)} · ${formatCurrency(r.importe_esperado || 0)}`;
      simInstancia.appendChild(o);
    });
    if (prev && pendingInstances.some((r) => String(r.id) === String(prev))) {
      simInstancia.value = prev;
    }
    prefijarMonto();
  }

  function prefijarMonto() {
    if (!simInstancia || !simInstanciaMonto) return;
    const opt = simInstancia.selectedOptions[0];
    if (!opt || !opt.value) {
      simInstanciaMonto.value = '';
      return;
    }
    simInstanciaMonto.value = opt.dataset.monto || '';
  }

  async function crearEscenario(nombre) {
    const res = await fetch('/api/planning/escenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId(), nombre })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  }

  async function loadScenarios(selectId) {
    if (!scenarioSelect) return;
    const res = await fetch(`/api/planning/escenarios?usuario_id=${usuarioId()}`);
    let rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      const id = await crearEscenario('Borrador');
      if (id) {
        const again = await fetch(`/api/planning/escenarios?usuario_id=${usuarioId()}`);
        rows = again.ok ? await again.json() : [];
        selectId = selectId || id;
      }
    }
    scenarioSelect.innerHTML = '';
    rows.forEach((r) => {
      const o = document.createElement('option');
      o.value = r.id;
      o.textContent = r.nombre;
      scenarioSelect.appendChild(o);
    });
    const wanted = selectId ? String(selectId) : (rows[0] ? String(rows[0].id) : '');
    if (wanted) scenarioSelect.value = wanted;
    if (scenarioControls) scenarioControls.style.display = escenarioId() ? '' : 'none';
  }

  function renderAdjustments(rows) {
    adjustmentsList.innerHTML = '';
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'sim-empty';
      empty.textContent = 'Todavía no hay cambios. Elegí un pago o sumá un gasto hipotético.';
      adjustmentsList.appendChild(empty);
      return;
    }
    rows.forEach((a) => {
      const signed = (Number(a.monto_simulado) || 0) * (Number(a.signo) || 1);
      const row = document.createElement('div');
      row.className = 'sim-adjust';

      const text = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'sim-adjust__name';
      const titulo = a.tipo === 'instancia'
        ? (a.compromiso_nombre || a.instancia_descripcion || a.descripcion || `Pago #${a.instancia_compromiso_id}`)
        : (a.descripcion || 'Movimiento hipotético');
      name.textContent = Number(a.monto_simulado) === 0 && a.tipo === 'instancia' ? `${titulo} (omitido)` : titulo;
      const meta = document.createElement('div');
      meta.className = 'sim-adjust__meta';
      meta.textContent = a.tipo === 'instancia'
        ? 'Pago de la agenda'
        : `Extra · ${labelPeriodo(String(a.fecha_estimada || '').slice(0, 7)) || 'este mes'}`;
      text.append(name, meta);

      const amount = document.createElement('div');
      amount.className = 'sim-adjust__amount';
      if (signed < 0) amount.classList.add('is-down');
      if (signed > 0) amount.classList.add('is-up');
      amount.textContent = formatCurrency(signed);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-sm btn-outline-light';
      del.setAttribute('aria-label', 'Quitar ajuste');
      del.innerHTML = '<i class="bi bi-x-lg"></i>';
      del.addEventListener('click', () => quitarAjuste(a.id));

      row.append(text, amount, del);
      adjustmentsList.appendChild(row);
    });
  }

  async function loadAdjustments() {
    const id = escenarioId();
    if (!id) {
      adjustmentsList.innerHTML = '';
      return;
    }
    const res = await fetch(`/api/planning/escenarios/${id}/ajustes`);
    const rows = res.ok ? await res.json() : [];
    renderAdjustments(rows);
  }

  function renderProyeccion(rows) {
    simResult.innerHTML = '';
    if (!rows || !rows.length) {
      const empty = document.createElement('div');
      empty.className = 'sim-empty';
      empty.textContent = 'No se pudo calcular la proyección.';
      simResult.appendChild(empty);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'sim-months';
    rows.forEach((r) => {
      const cell = document.createElement('div');
      cell.className = 'sim-month';
      if (Number(r.saldoSimulado) < 0) cell.classList.add('is-neg');

      const period = document.createElement('div');
      period.className = 'sim-month__period';
      period.textContent = labelPeriodo(r.periodo);

      const saldo = document.createElement('div');
      saldo.className = 'sim-month__saldo';
      saldo.textContent = formatCurrency(r.saldoSimulado);

      const delta = document.createElement('div');
      delta.className = 'sim-month__delta';
      const d = Number(r.delta) || 0;
      if (d === 0) {
        delta.textContent = 'Sin cambios';
      } else {
        delta.textContent = `${d > 0 ? '+' : ''}${formatCurrency(d)} vs base`;
        delta.classList.add(d > 0 ? 'is-up' : 'is-down');
      }

      cell.append(period, saldo, delta);
      grid.appendChild(cell);
    });
    simResult.appendChild(grid);
  }

  async function computeProjection() {
    const id = escenarioId();
    if (!id || !simResult) return;
    const res = await fetch(`/api/planning/escenarios/${id}/saldo-simulado-mensual?meses=${MESES}&usuario_id=${usuarioId()}`);
    if (!res.ok) {
      simResult.innerHTML = '<div class="sim-empty">No se pudo calcular la proyección.</div>';
      return;
    }
    renderProyeccion(await res.json());
  }

  async function refreshSim() {
    await Promise.all([loadAdjustments(), computeProjection()]);
  }

  async function aplicarPago(omitir) {
    const id = escenarioId();
    const instanciaId = simInstancia && simInstancia.value;
    if (!id) return;
    if (!instanciaId) return alert('Elegí un pago de la lista');
    const inst = pendingInstances.find((r) => String(r.id) === String(instanciaId));
    const monto = omitir ? 0 : Number(simInstanciaMonto.value);
    if (!omitir && !(monto >= 0)) return alert('Monto inválido');
    const tipo = inst && (inst.compromiso_tipo || inst.tipo);
    const signo = tipo === 'ingreso' ? 1 : -1;
    const res = await fetch(`/api/planning/escenarios/${id}/ajustes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'instancia',
        instancia_compromiso_id: Number(instanciaId),
        descripcion: inst ? tituloInstancia(inst) : null,
        fecha_estimada: inst ? String(inst.fecha_vencimiento || '').slice(0, 10) : null,
        monto_simulado: monto,
        signo
      })
    });
    if (!res.ok) return alert('No se pudo aplicar el cambio');
    await refreshSim();
  }

  async function agregarLibre() {
    const id = escenarioId();
    if (!id) return;
    const descripcion = simLibreDesc && simLibreDesc.value.trim();
    const monto = Number(simLibreMonto && simLibreMonto.value);
    const signo = Number(simLibreSign && simLibreSign.value) || -1;
    const fecha = simLibreMes && simLibreMes.value;
    if (!descripcion) return alert('Poné una descripción');
    if (!monto) return alert('Monto inválido');
    const res = await fetch(`/api/planning/escenarios/${id}/ajustes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'libre',
        descripcion,
        fecha_estimada: fecha,
        monto_simulado: monto,
        signo
      })
    });
    if (!res.ok) return alert('No se pudo agregar el movimiento');
    simLibreDesc.value = '';
    simLibreMonto.value = '';
    await refreshSim();
  }

  async function quitarAjuste(ajusteId) {
    const id = escenarioId();
    if (!id) return;
    const res = await fetch(`/api/planning/escenarios/${id}/ajustes/${ajusteId}`, { method: 'DELETE' });
    if (!res.ok) return alert('No se pudo quitar el ajuste');
    await refreshSim();
  }

  async function openSimulator() {
    fillMonthSelect();
    await syncHorizon();
    await loadPending();
    await loadScenarios();
    if (escenarioId()) await refreshSim();
  }

  if (window.KF && KF.on) {
    KF.on('kf:view-changed', (e) => {
      if (e.detail && e.detail.view === 'simulador') openSimulator();
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name = newScenarioName.value.trim();
      if (!name) return alert('Nombre requerido');
      const id = await crearEscenario(name);
      if (!id) return alert('No se pudo crear el escenario');
      newScenarioName.value = '';
      await loadScenarios(id);
      await refreshSim();
    });
  }

  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', () => {
      if (scenarioControls) scenarioControls.style.display = escenarioId() ? '' : 'none';
      refreshSim();
    });
  }

  if (simInstancia) simInstancia.addEventListener('change', prefijarMonto);
  if (simAplicarPago) simAplicarPago.addEventListener('click', () => aplicarPago(false));
  if (simOmitirPago) simOmitirPago.addEventListener('click', () => aplicarPago(true));
  if (simAddLibre) simAddLibre.addEventListener('click', agregarLibre);
});
