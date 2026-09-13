import { reactive } from 'vue'

// Reemplaza #confirmationModal (Bootstrap) del index.html viejo por un estado reactivo
// que un unico <ConfirmDialog/> global (montado en App.vue) consume.
interface ConfirmOptions {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Variante visual del boton de confirmar; 'danger' para acciones destructivas. */
  variant?: 'primary' | 'danger'
}

interface ConfirmState extends Required<ConfirmOptions> {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  open: false,
  title: 'Confirmar',
  description: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'primary',
  resolve: null,
})

function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  state.title = options.title ?? 'Confirmar'
  state.description = options.description ?? ''
  state.confirmLabel = options.confirmLabel ?? 'Confirmar'
  state.cancelLabel = options.cancelLabel ?? 'Cancelar'
  state.variant = options.variant ?? 'primary'
  state.open = true

  return new Promise<boolean>((resolve) => {
    state.resolve = resolve
  })
}

function resolveWith(value: boolean) {
  state.open = false
  state.resolve?.(value)
  state.resolve = null
}

export function useConfirmDialog() {
  return {
    state,
    confirm,
    accept: () => resolveWith(true),
    cancel: () => resolveWith(false),
  }
}
