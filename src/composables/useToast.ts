import { reactive } from 'vue'

// Paridad con public/js/journal.js -> showAlert: notificacion fija, auto-dismiss a los 3s.
// Reemplaza el alert Bootstrap por un estado reactivo que un <ToastViewport/> global consume.
export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

const DURATION_MS = 3000

let nextId = 1
const toasts = reactive<Toast[]>([])

function dismiss(id: number) {
  const idx = toasts.findIndex((t) => t.id === id)
  if (idx !== -1) toasts.splice(idx, 1)
}

function showToast(message: string, variant: ToastVariant = 'info') {
  const id = nextId++
  toasts.push({ id, message, variant })
  setTimeout(() => dismiss(id), DURATION_MS)
  return id
}

export function useToast() {
  return {
    toasts,
    showToast,
    dismiss,
  }
}
