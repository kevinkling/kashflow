// Paridad con public/js/utils.js -> formatCurrency (es-AR, ARS).
const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})

export function useCurrency() {
  function formatCurrency(amount: number): string {
    return formatter.format(amount)
  }

  return { formatCurrency }
}
