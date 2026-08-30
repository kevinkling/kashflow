// simulator.js - UI for scenarios simulator
document.addEventListener('DOMContentLoaded', () => {
  const simBtn = document.getElementById('simulator-button');
  const scenarioSelect = document.getElementById('scenarioSelect');
  const createBtn = document.getElementById('createScenarioBtn');
  const newScenarioName = document.getElementById('newScenarioName');
  const scenarioControls = document.getElementById('scenarioControls');
  const adjustmentsList = document.getElementById('adjustmentsList');
  const addAdjustBtn = document.getElementById('addAdjustBtn');
  const adjustType = document.getElementById('adjustType');
  const adjustRef = document.getElementById('adjustRef');
  const adjustAmount = document.getElementById('adjustAmount');
  const adjustSign = document.getElementById('adjustSign');
  const computeSimBtn = document.getElementById('computeSimBtn');
  const simResult = document.getElementById('simResult');

  simBtn.addEventListener('click', () => {
    if (typeof showAppView === 'function') showAppView('simulador');
    loadScenarios();
  });

  createBtn.addEventListener('click', async () => {
    const name = newScenarioName.value.trim();
    if (!name) return alert('Nombre requerido');
    const body = { usuario_id: 1, nombre: name };
    const res = await fetch('/api/planning/escenarios', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (res.ok) {
      newScenarioName.value = '';
      await loadScenarios();
    } else {
      alert('Error creando escenario');
    }
  });

  scenarioSelect.addEventListener('change', () => {
    const id = scenarioSelect.value;
    if (!id) { scenarioControls.style.display='none'; return; }
    scenarioControls.style.display = '';
    loadAdjustments(id);
  });

  addAdjustBtn.addEventListener('click', async () => {
    const escenarioId = scenarioSelect.value;
    if (!escenarioId) return alert('Seleccioná un escenario');
    const tipo = adjustType.value;
    const instancia_compromiso_id = tipo === 'instancia' ? Number(adjustRef.value) || null : null;
    const descripcion = tipo === 'libre' ? adjustRef.value : null;
    const monto_simulado = Number(adjustAmount.value);
    const signo = Number(adjustSign.value);
    if (!monto_simulado) return alert('Monto inválido');
    const body = { tipo, instancia_compromiso_id, descripcion, monto_simulado, signo };
    const res = await fetch(`/api/planning/escenarios/${escenarioId}/ajustes`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (res.ok) {
      adjustRef.value=''; adjustAmount.value='';
      loadAdjustments(escenarioId);
    } else {
      alert('Error agregando ajuste');
    }
  });

  computeSimBtn.addEventListener('click', async () => {
    const escenarioId = scenarioSelect.value;
    if (!escenarioId) return alert('Seleccioná un escenario');
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const hasta = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];
    const res = await fetch(`/api/planning/escenarios/${escenarioId}/saldo-simulado?desde=${desde}&hasta=${hasta}`);
    if (res.ok) {
      const data = await res.json();
      simResult.innerText = `Saldo real: ${formatCurrency(data.saldoReal)} • Impacto esperado: ${formatCurrency(data.expectedTotal)} • Líneas libres: ${formatCurrency(data.lineasLibresTotal)} → Saldo simulado: ${formatCurrency(data.saldoSimulado)}`;
    } else {
      alert('Error calculando saldo simulado');
    }
  });

  async function loadScenarios() {
    scenarioSelect.innerHTML = '';
    const res = await fetch('/api/planning/escenarios?usuario_id=1');
    if (!res.ok) return;
    const rows = await res.json();
    const opt = document.createElement('option'); opt.value=''; opt.textContent='-- seleccionar --'; scenarioSelect.appendChild(opt);
    rows.forEach(r => {
      const o = document.createElement('option'); o.value = r.id; o.textContent = `${r.nombre} (${r.fecha_creacion.split('T')[0]})`; scenarioSelect.appendChild(o);
    });
  }

  async function loadAdjustments(escenarioId) {
    adjustmentsList.innerHTML = 'Cargando...';
    const res = await fetch(`/api/planning/escenarios/${escenarioId}/ajustes`);
    if (!res.ok) { adjustmentsList.innerHTML='Error'; return; }
    const rows = await res.json();
    adjustmentsList.innerHTML = '';
    if (rows.length === 0) adjustmentsList.innerHTML = '<div class="text-muted">No hay ajustes</div>';
    rows.forEach(a => {
      const div = document.createElement('div');
      div.className = 'mb-2 text-white';
      div.textContent = `[${a.tipo}] ${a.descripcion || ('Inst#'+a.instancia_compromiso_id)} : ${formatCurrency(a.monto_simulado * (a.signo||1))}`;
      adjustmentsList.appendChild(div);
    });
  }

  function formatCurrency(v) {
    return '$' + Number(v || 0).toLocaleString('es-AR', {minimumFractionDigits:2});
  }

});

