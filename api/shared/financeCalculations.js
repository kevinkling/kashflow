function clampDay(year, month, day) {
  const last = new Date(year, month, 0).getDate();
  const n = Number(day);
  if (!n || n < 1) return last;
  return Math.min(n, last);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fechaVencimientoMensual(year, month, dia) {
  const d = clampDay(year, month, dia);
  return `${year}-${pad2(month)}-${pad2(d)}`;
}

function periodoYYYYMM(year, month) {
  return `${year}-${pad2(month)}`;
}

function rangoMesLocal(year, month) {
  const last = new Date(year, month, 0).getDate();
  return {
    desde: `${year}-${pad2(month)}-01`,
    hasta: `${year}-${pad2(month)}-${pad2(last)}`
  };
}

function fechaLocalISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function filtrarAjustesPorPeriodo(ajustes, periodo, { incluirSinFecha = false } = {}) {
  return (ajustes || []).filter((a) => {
    if (a.tipo === 'instancia') return true;
    const f = a.fecha_estimada ? String(a.fecha_estimada).slice(0, 7) : '';
    if (f) return f === periodo;
    return incluirSinFecha;
  });
}

function signForTipo(tipo) {
  return tipo === 'ingreso' ? 1 : -1;
}

function calcularProyeccionSimulada({ saldoReal, instancias, ajustes }) {
  const ajustesPorInst = {};
  let lineasLibresTotal = 0;
  for (const a of ajustes || []) {
    if (a.tipo === 'instancia' && a.instancia_compromiso_id) {
      ajustesPorInst[a.instancia_compromiso_id] = a;
    } else if (a.tipo === 'libre') {
      lineasLibresTotal += (Number(a.monto_simulado) || 0) * (Number(a.signo) || 1);
    }
  }
  let expectedTotal = 0;
  for (const ic of instancias || []) {
    if (ic.estado === 'pagado' || ic.estado === 'cancelado') continue;
    const tipo = ic.compromiso_tipo || ic.tipo || 'egreso';
    const sign = signForTipo(tipo);
    const ajuste = ajustesPorInst[ic.id];
    if (ajuste) {
      expectedTotal += (Number(ajuste.monto_simulado) || 0) * (Number(ajuste.signo) || sign);
    } else {
      expectedTotal += (Number(ic.importe_esperado) || 0) * sign;
    }
  }
  const saldo = Number(saldoReal) || 0;
  return {
    saldoReal: saldo,
    expectedTotal,
    lineasLibresTotal,
    saldoSimulado: saldo + expectedTotal + lineasLibresTotal
  };
}

function estadoEfectivo(instancia) {
  if (!instancia) return null;
  const est = (instancia.estado || '').toString();
  if (est === 'pagado' || est === 'cancelado') return est;
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const v = instancia.fecha_vencimiento ? new Date(String(instancia.fecha_vencimiento)) : null;
  if (!v) return est || 'pendiente';
  v.setHours(0,0,0,0);
  if (v < hoy) return 'vencido';
  return 'pendiente';
}

function calcularComprometido({ instancias = [], cuotas = [] } = {}) {
  let total = 0;
  for (const ic of instancias || []) {
    const ef = estadoEfectivo(ic);
    if (ef === 'pagado' || ef === 'cancelado') continue;
    const tipo = (ic.compromiso_tipo || ic.tipo || 'egreso').toString();
    if (tipo === 'ingreso') continue;
    total += Number(ic.importe_esperado || 0);
  }
  for (const c of cuotas || []) {
    if (!c.instancia_resumen_id) {
      total += Number(c.monto_cuota || 0);
    }
  }
  return total;
}

function calcularCronogramaCuotas(consumo, tarjeta) {
  if (!consumo || !consumo.cuotas) return [];
  const parts = String(consumo.cuotas).split('/').map(s => Number(s));
  if (parts.length !== 2) return [];
  const numeroActual = parts[0] || 1;
  const total = parts[1] || 1;
  const monto = Number(consumo.monto || 0);
  const monto_cuota = +(monto / total).toFixed(2);
  const compra = consumo.fecha_compra ? new Date(String(consumo.fecha_compra)) : new Date();
  const cronograma = [];
  for (let i = 1; i <= total; i++) {
    const cuotaIndex = i;
    const fechaEstim = new Date(compra.getFullYear(), compra.getMonth() + (i - 1), 15);
    if (tarjeta && Number(tarjeta.dia_vencimiento)) {
      const d = Number(tarjeta.dia_vencimiento);
      const year = fechaEstim.getFullYear();
      const month = fechaEstim.getMonth() + 1;
      const day = Math.min(d, new Date(year, month, 0).getDate());
      const fechaStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      cronograma.push({
        consumo_id: consumo.id,
        numero_cuota: cuotaIndex,
        total_cuotas: total,
        monto_cuota,
        periodo: `${fechaEstim.getFullYear()}-${String(fechaEstim.getMonth()+1).padStart(2,'0')}`,
        fecha_vencimiento_estimada: fechaStr
      });
    } else {
      cronograma.push({
        consumo_id: consumo.id,
        numero_cuota: cuotaIndex,
        total_cuotas: total,
        monto_cuota,
        periodo: `${fechaEstim.getFullYear()}-${String(fechaEstim.getMonth()+1).padStart(2,'0')}`,
        fecha_vencimiento_estimada: `${fechaEstim.getFullYear()}-${String(fechaEstim.getMonth()+1).padStart(2,'0')}-15`
      });
    }
  }
  return cronograma;
}

module.exports = {
  clampDay,
  fechaVencimientoMensual,
  periodoYYYYMM,
  rangoMesLocal,
  fechaLocalISO,
  filtrarAjustesPorPeriodo,
  signForTipo,
  calcularProyeccionSimulada,
  estadoEfectivo,
  calcularComprometido,
  calcularCronogramaCuotas
};

