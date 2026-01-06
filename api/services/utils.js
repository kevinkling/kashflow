function logMovimiento(tipo, banco, descripcion, monto, banco_destino = null) {
  const etiqueta = tipo.toUpperCase();

  const data = { tipo, banco, descripcion, monto };
  if (banco_destino) data.banco_destino = banco_destino;

  console.log(`[${etiqueta}]`, data);
}

/**
 * Calcula un porcentaje de un número y lo redondea hacia arriba
 * al múltiplo más cercano especificado.
 *
 * @param {number} num - El número base sobre el cual calcular el porcentaje.
 * @param {number} porcentaje - El porcentaje a calcular (ej. 0.2 para 20%).
 * @param {number} [multiplo=1000] - El múltiplo al cual redondear hacia arriba.
 *                                   Por defecto es 1000.
 * @returns {number} - El valor del porcentaje redondeado hacia arriba
 *                     al múltiplo especificado.
 *
 * @example
 * calcularPorcentajeRedondeado(1123456, 0.2);
 * // Devuelve: 225000
 *
 * @example
 * calcularPorcentajeRedondeado(1436853, 0.15, 100);
 * // Devuelve: 216100
 */
function calcularPorcentajeRedondeado(monto, porcentaje, multiplo = 1000) {
  const valor = monto * porcentaje;
  return Math.ceil(valor / multiplo) * multiplo;
}

function formatDateToDDMMYYYY(dateString) {
  const [date, time] = dateString.split(" "); // Divide fecha y hora
  const [year, month, day] = date.split("-"); // Divide año, mes y día
  return `${day}/${month}/${year} ${time}`; // Devuelve en formato DD/MM/YYYY HH:MM:SS
}

/**
 * Genera una fecha y hora formateada en el formato `DD/MM/YYYY HH:MM:SS`.
 *
 * @param {Date} [date=new Date()] - La fecha que se desea formatear. Si no se proporciona,
 *                                   se utiliza la fecha y hora actual.
 * @returns {string} - La fecha y hora formateada como una cadena en el formato `DD/MM/YYYY HH:MM:SS`.
 *
 * @example
 * // Usando la fecha actual
 * const fechaActual = getFormattedDate();
 * console.log(fechaActual); // "08/08/2025 14:30:45"
 *
 * @example
 * // Usando una fecha específica
 * const fechaEspecifica = new Date("2025-08-08T14:30:45");
 * console.log(getFormattedDate(fechaEspecifica)); // "08/08/2025 14:30:45"
 */
function getFormattedDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Mes (0-11) + 1
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`; // Formato: DD/MM/YYYY HH:MM:SS
}

module.exports = { logMovimiento, calcularPorcentajeRedondeado, formatDateToDDMMYYYY, getFormattedDate };
