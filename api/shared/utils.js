function logMovimiento(tipo, banco, descripcion, monto, banco_destino = null) {
  const etiqueta = tipo.toUpperCase();
  const data = { tipo, banco, descripcion, monto };
  if (banco_destino) data.banco_destino = banco_destino;
  console.log(`[${etiqueta}]`, data);
}

function calcularPorcentajeRedondeado(monto, porcentaje, multiplo = 1000) {
  const valor = monto * porcentaje;
  return Math.ceil(valor / multiplo) * multiplo;
}

function formatDateToDDMMYYYY(dateString) {
  const [date, time] = dateString.split(" ");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} ${time}`;
}

function getFormattedDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = { logMovimiento, calcularPorcentajeRedondeado, formatDateToDDMMYYYY, getFormattedDate };
