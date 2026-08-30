const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function monthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const last = new Date(year, month, 0).getDate();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    desde: `${year}-${pad(month)}-01`,
    hasta: `${year}-${pad(month)}-${pad(last)}`,
    year,
    month
  };
}

function fechaIso(valor) {
  return String(valor || '').slice(0, 10);
}

function formatFechaCorta(valor) {
  const iso = fechaIso(valor);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, '0')} ${MESES_CORTOS[m - 1]}`;
}

function proxTitulo(p) {
  const titulo = (p.compromiso_nombre || p.descripcion || 'Sin nombre').trim();
  return titulo.replace(/\s+\d{4}-\d{2}$/, '');
}

function proxMeta(p) {
  const titulo = proxTitulo(p);
  const tituloLc = titulo.toLowerCase();
  const descLimpio = (p.descripcion || '').trim().replace(/\s+\d{4}-\d{2}$/, '');
  if (descLimpio && descLimpio.toLowerCase() !== tituloLc && !tituloLc.includes(descLimpio.toLowerCase())) {
    return descLimpio;
  }
  const cuenta = (p.cuenta_alias || '').trim();
  if (cuenta && !tituloLc.includes(cuenta.toLowerCase())) return cuenta;
  const totalCuotas = Number(p.compromiso_total_cuotas);
  if (totalCuotas > 1) {
    const match = `${p.descripcion || ''} ${p.compromiso_nombre || ''}`.match(/Cuota\s*(\d+)\/(\d+)/i);
    return match ? `Cuota ${match[1]}/${match[2]}` : `Cuota 1/${totalCuotas}`;
  }
  return '';
}

function renderProxItem(p) {
  const li = document.createElement('li');
  li.className = 'dash-prox__row';
  if (p.estado === 'vencido') li.classList.add('is-overdue');

  const date = document.createElement('time');
  date.className = 'dash-prox__date';
  date.dateTime = fechaIso(p.fecha_vencimiento);
  date.textContent = formatFechaCorta(p.fecha_vencimiento);

  const name = document.createElement('div');
  name.className = 'dash-prox__name';
  name.textContent = proxTitulo(p);
  name.title = name.textContent;

  const amount = document.createElement('div');
  amount.className = 'dash-prox__amount';
  amount.textContent = formatCurrency(p.importe_esperado || 0);

  const meta = document.createElement('div');
  meta.className = 'dash-prox__meta';
  meta.textContent = proxMeta(p);

  const status = document.createElement('div');
  status.className = 'dash-prox__status';
  if (p.estado === 'vencido') {
    const badge = document.createElement('span');
    badge.className = 'dash-prox__badge';
    badge.textContent = 'Vencido';
    status.appendChild(badge);
  }

  li.append(date, name, amount, meta, status);
  return li;
}

async function loadDashboard() {
  try {
    const { desde, hasta } = monthRange();
    const usuarioId = (window.KF && KF.store) ? KF.store.getUsuarioId() : 1;
    const res = await fetch(`/api/planning/resumen-financiero?usuario_id=${usuarioId}&desde=${desde}&hasta=${hasta}`);
    if (!res.ok) return;
    const data = await res.json();
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCurrency(value);
    };
    set('dashboardDisponible', data.disponibleReal || 0);
    set('dashboardIngresos', data.ingresosPeriodo || 0);
    set('dashboardGastado', data.gastadoPeriodo || 0);
    set('dashboardComprometido', data.comprometido || 0);
    set('dashboardDisponibleResumen', data.disponibleReal || 0);

    const proxEl = document.getElementById('dashboardProximos');
    if (proxEl) {
      proxEl.innerHTML = '';
      const items = data.proximosCompromisos || [];
      if (!items.length) {
        const empty = document.createElement('li');
        empty.className = 'dash-prox__empty';
        empty.textContent = 'No hay compromisos próximos';
        proxEl.appendChild(empty);
      } else {
        items.forEach(p => proxEl.appendChild(renderProxItem(p)));
      }
    }

    const catEl = document.getElementById('dashboardCategorias');
    if (catEl) {
      catEl.innerHTML = '';
      const cats = data.gastosPorCategoria || [];
      if (!cats.length) {
        catEl.innerHTML = '<li class="list-group-item bg-dark text-white-50">Sin gastos categorizados este mes</li>';
      } else {
        cats.forEach(c => {
          const li = document.createElement('li');
          li.className = 'list-group-item bg-dark text-white d-flex justify-content-between align-items-center';
          li.innerHTML = `<div>${c.categoria}</div><div>${formatCurrency(c.total || 0)}</div>`;
          catEl.appendChild(li);
        });
      }
    }
  } catch (err) {
    console.error('Error cargando dashboard:', err);
  }
}

if (window.KF && KF.on) {
  KF.on('kf:store-ready', loadDashboard);
  KF.on('kf:view-changed', (e) => {
    if (e.detail && e.detail.view === 'inicio') loadDashboard();
  });
  KF.on('kf:movimientos-changed', loadDashboard);
  KF.on('kf:obligaciones-changed', loadDashboard);
  KF.on('kf:cuentas-changed', loadDashboard);
}
