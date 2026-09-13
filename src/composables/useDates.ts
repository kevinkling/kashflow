// Paridad con public/js/utils.js -> formatDate, toLocalYMD, parseDate.
function formatDate(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function toLocalYMD(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(dateString: string | Date | null | undefined): Date {
  if (!dateString) {
    // Fecha muy antigua para identificar datos invalidos (paridad con el codigo viejo)
    return new Date('1900-01-01')
  }

  if (dateString instanceof Date) return dateString

  const raw = String(dateString)

  // DD/MM/YYYY HH:mm:ss
  if (raw.includes('/')) {
    const [datePart, timePart] = raw.split(' ')
    const [day, month, year] = datePart.split('/')
    const timeStr = timePart || '00:00:00'
    return new Date(`${year}-${month}-${day}T${timeStr}`)
  }

  // SQLite datetime('now','localtime') -> "YYYY-MM-DD HH:mm:ss"
  const normalized = raw.trim().replace(' ', 'T')
  return new Date(normalized)
}

/** Rango del mes calendario actual [inicio, fin], como YYYY-MM-DD. */
function monthRange(reference: Date = new Date()): { desde: string; hasta: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  return { desde: toLocalYMD(start), hasta: toLocalYMD(end) }
}

export function useDates() {
  return { formatDate, toLocalYMD, parseDate, monthRange }
}
