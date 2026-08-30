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

function signForTipo(tipo) {
  return tipo === 'ingreso' ? 1 : -1;
}

/**
 * Proyección simulada: saldo real + instancias pendientes (con ajustes) + líneas libres.
 * No muta instancias ni transacciones.
 */
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

module.exports = {
  clampDay,
  fechaVencimientoMensual,
  periodoYYYYMM,
  signForTipo,
  calcularProyeccionSimulada
};
