<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import Select, { type SelectOption } from '@/components/ui/Select.vue'
import Table from '@/components/ui/Table.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useContrastColor } from '@/composables/useContrastColor'
import { useCurrency } from '@/composables/useCurrency'
import { useDates } from '@/composables/useDates'
import { useToast } from '@/composables/useToast'
import { categoriasRepository } from '@/data/repositories/categorias.repository'
import { useCuentasStore } from '@/stores/cuentas'
import { useMovimientosStore } from '@/stores/movimientos'
import { useSessionStore } from '@/stores/session'
import type { Categoria } from '@/types/categoria'
import type { Movimiento } from '@/types/movimiento'

// Paridad con public/js/journal.js + accounts.js:
// - Filtro de fechas por defecto NO es "mes actual": ultimo dia del mes anterior -> anteultimo del actual.
// - Top 3 cuentas sale de /api/cuentas (cuentasStore), nunca de las transacciones.
// - Transferencia interna va por POST /api/transferencias (movimientosStore.transferir), no por dos movimientos.

const cuentasStore = useCuentasStore()
const movimientosStore = useMovimientosStore()
const session = useSessionStore()
const { formatCurrency } = useCurrency()
const { formatDate, toLocalYMD, parseDate } = useDates()
const { getContrastTextColor } = useContrastColor()
const { showToast } = useToast()
const { confirm } = useConfirmDialog()

const categorias = ref<Categoria[]>([])
const dateFrom = ref('')
const dateTo = ref('')
const searchTerm = ref('')
const selectedAccount = ref<number | null>(null)
const allAccountsOpen = ref(false)

function initializeDateFilters() {
  const now = new Date()
  const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const secondToLastDayOfCurrentMonth = new Date(lastDayOfCurrentMonth)
  secondToLastDayOfCurrentMonth.setDate(lastDayOfCurrentMonth.getDate() - 1)
  dateFrom.value = toLocalYMD(lastDayOfPreviousMonth)
  dateTo.value = toLocalYMD(secondToLastDayOfCurrentMonth)
}

onMounted(async () => {
  initializeDateFilters()
  await session.init()
  await Promise.all([movimientosStore.refresh(), cuentasStore.refresh(), cargarCategorias()])
})

async function cargarCategorias() {
  const result = await categoriasRepository.listar()
  if (result.status === 'ready' && result.data) categorias.value = result.data
}

watch(() => session.usuarioId, () => {
  movimientosStore.refresh()
  cuentasStore.refresh()
})

const cuentas = computed(() => cuentasStore.cuentas.data ?? [])
const cuentaOptions = computed<SelectOption[]>(() =>
  cuentas.value.map((c) => ({ value: String(c.cuenta_id), label: c.cuenta })),
)
const categoriaOptions = computed<SelectOption[]>(() => [
  { value: '', label: '-- Categoría --' },
  ...categorias.value.map((cat) => ({ value: String(cat.id), label: `${cat.icono || ''} ${cat.nombre}`.trim() })),
])

const totalBalanceReal = computed(() =>
  cuentas.value.reduce((sum, c) => sum + (Number(c.saldo_actual) || 0), 0),
)

interface TxRow extends Movimiento {
  date: Date
}

const transactions = computed<TxRow[]>(() => {
  const raw = movimientosStore.movimientos.data ?? []
  return raw
    .map((item) => ({ ...item, date: parseDate(item.fecha) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
})

const hasActiveFilter = computed(
  () => !!(selectedAccount.value || dateFrom.value || dateTo.value || searchTerm.value),
)

const filteredTransactions = computed(() => {
  const search = searchTerm.value.toLowerCase()
  return transactions.value.filter((t) => {
    const ymd = toLocalYMD(t.date)
    if (dateFrom.value && ymd < dateFrom.value) return false
    if (dateTo.value && ymd > dateTo.value) return false
    if (search && !t.descripcion.toLowerCase().includes(search)) return false
    if (selectedAccount.value && t.account_id !== selectedAccount.value) return false
    return true
  })
})

const selectedAccountInfo = computed(() => {
  if (!selectedAccount.value) return null
  return cuentas.value.find((c) => c.cuenta_id === selectedAccount.value) ?? null
})

function filterByAccount(accountId: number | null) {
  selectedAccount.value = accountId
  allAccountsOpen.value = false
}

const indicators = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const totalBalance = selectedAccount.value
    ? transactions.value.filter((t) => t.account_id === selectedAccount.value).reduce((s, t) => s + t.monto, 0)
    : totalBalanceReal.value

  const set = hasActiveFilter.value ? filteredTransactions.value : transactions.value
  const monthTx = set.filter((t) => t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear)
  const monthlyIncome = monthTx.filter((t) => t.debeHaber === 'debe').reduce((s, t) => s + Math.abs(t.monto), 0)
  const monthlyExpenses = monthTx.filter((t) => t.debeHaber === 'haber').reduce((s, t) => s + Math.abs(t.monto), 0)

  return { totalBalance, monthlyIncome, monthlyExpenses }
})

// --- Alta rápida ---
const quickMove = reactive({
  tipo: 'haber' as 'haber' | 'debe' | 'transferencia',
  monto: '',
  descripcion: '',
  categoriaId: '',
  cuentaId: '',
  cuentaDestinoId: '',
})

function restoreLastQuickMove() {
  try {
    const lastAccount = localStorage.getItem('kf:lastAccount')
    const lastCategory = localStorage.getItem('kf:lastCategory')
    if (lastAccount) quickMove.cuentaId = lastAccount
    if (lastCategory) quickMove.categoriaId = lastCategory
  } catch {
    /* noop */
  }
}

watch(cuentaOptions, (opts) => {
  if (!quickMove.cuentaId && opts.length) quickMove.cuentaId = opts[0].value
  if (!quickMove.cuentaDestinoId && opts.length) quickMove.cuentaDestinoId = opts[0].value
  restoreLastQuickMove()
}, { immediate: true })

async function submitQuickMove() {
  const cuentaId = Number(quickMove.cuentaId)
  const monto = Number(quickMove.monto)
  if (!cuentaId || !(monto > 0)) {
    showToast('Ingresá un monto válido', 'warning')
    return
  }

  try {
    localStorage.setItem('kf:lastAccount', String(cuentaId))
    if (quickMove.categoriaId) localStorage.setItem('kf:lastCategory', String(quickMove.categoriaId))
  } catch {
    /* noop */
  }

  if (quickMove.tipo === 'transferencia') {
    const cuentaDestinoId = Number(quickMove.cuentaDestinoId)
    if (!cuentaDestinoId || cuentaDestinoId === cuentaId) {
      showToast('Seleccioná una cuenta destino distinta de la de origen', 'warning')
      return
    }
    const result = await movimientosStore.transferir({
      cuenta_origen_id: cuentaId,
      cuenta_destino_id: cuentaDestinoId,
      monto,
      descripcion: quickMove.descripcion || 'Transferencia',
    })
    if (result.status !== 'ready') {
      showToast(result.error || 'Error al registrar la transferencia', 'danger')
      return
    }
  } else {
    const result = await movimientosStore.crear({
      cuenta_id: cuentaId,
      tipo: quickMove.tipo,
      monto,
      descripcion: quickMove.descripcion || (quickMove.tipo === 'debe' ? 'Ingreso' : 'Gasto'),
      categoria_id: quickMove.categoriaId ? Number(quickMove.categoriaId) : null,
    })
    if (result.status !== 'ready') {
      showToast(result.error || 'Error al registrar el movimiento', 'danger')
      return
    }
  }

  quickMove.monto = ''
  quickMove.descripcion = ''
  quickMove.tipo = 'haber'

  const today = toLocalYMD(new Date())
  if (dateTo.value && today > dateTo.value) dateTo.value = today
  if (dateFrom.value && today < dateFrom.value) dateFrom.value = today

  showToast('Movimiento registrado', 'success')
}

// --- Edición ---
const editOpen = ref(false)
const editForm = reactive({
  id: 0,
  fecha: '',
  monto: '',
  descripcion: '',
  tipo: 'haber' as 'haber' | 'debe' | 'transferencia',
  cuentaId: '',
  cuentaDestinoId: '',
  categoriaId: '',
})

function openEdit(t: TxRow) {
  const esTransfer = !!t.transferencia_id
  editForm.id = t.id
  editForm.fecha = toLocalYMD(t.date)
  editForm.monto = String(Math.abs(t.monto))
  editForm.descripcion = t.descripcion || ''
  editForm.tipo = esTransfer ? 'transferencia' : t.debeHaber
  editForm.cuentaId = String(esTransfer ? t.cuenta_origen_id || t.account_id : t.account_id)
  editForm.cuentaDestinoId = t.cuenta_destino_id ? String(t.cuenta_destino_id) : ''
  editForm.categoriaId = t.categoria_id ? String(t.categoria_id) : ''
  editOpen.value = true
}

async function submitEdit() {
  const cuentaId = Number(editForm.cuentaId)
  const cuentaDestinoId = editForm.cuentaDestinoId ? Number(editForm.cuentaDestinoId) : null
  const monto = Number(editForm.monto)

  if (editForm.tipo === 'transferencia' && (!cuentaDestinoId || cuentaDestinoId === cuentaId)) {
    showToast('Seleccioná una cuenta destino distinta de la de origen', 'warning')
    return
  }

  const descripcion =
    editForm.descripcion.trim() ||
    (editForm.tipo === 'debe' ? 'Ingreso' : editForm.tipo === 'transferencia' ? 'Transferencia' : 'Gasto')

  const result = await movimientosStore.actualizar(editForm.id, {
    cuenta_id: cuentaId,
    tipo: editForm.tipo,
    monto,
    descripcion,
    categoria_id: editForm.categoriaId ? Number(editForm.categoriaId) : null,
    fecha: editForm.fecha,
    ...(editForm.tipo === 'transferencia' ? { cuenta_destino_id: cuentaDestinoId! } : {}),
  })

  if (result.status === 'ready') {
    editOpen.value = false
    showToast('Movimiento actualizado', 'success')
  } else {
    showToast(result.error || 'Error al actualizar el movimiento', 'danger')
  }
}

async function eliminar(t: TxRow) {
  const ok = await confirm({
    title: 'Eliminar movimiento',
    description: `¿Estás seguro de que deseas eliminar "${t.descripcion}"? Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  const result = await movimientosStore.eliminar(t.id)
  if (result.status === 'ready') {
    showToast('Movimiento eliminado', 'success')
  } else {
    showToast(result.error || 'Error al eliminar el movimiento', 'danger')
  }
}

function amountSign(t: TxRow) {
  return t.debeHaber === 'debe' ? '+' : '−'
}
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="font-money text-xl text-foreground">Movimientos</h1>
      <p class="text-sm text-muted">El libro diario de la plata.</p>
    </header>

    <!-- Filtros -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">Desde</label>
        <Input v-model="dateFrom" type="date" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">Hasta</label>
        <Input v-model="dateTo" type="date" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">Buscar</label>
        <Input v-model="searchTerm" placeholder="Descripción..." />
      </div>
    </div>

    <div v-if="selectedAccountInfo" class="flex items-center gap-2">
      <span
        class="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium"
        :style="{
          backgroundColor: selectedAccountInfo.color,
          color: getContrastTextColor(selectedAccountInfo.color),
        }"
      >
        Filtrando por: {{ selectedAccountInfo.cuenta }}
        <button type="button" class="opacity-80 hover:opacity-100" @click="filterByAccount(null)">✕</button>
      </span>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-border bg-surface p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Saldo total</p>
        <p class="font-money mt-1 text-lg" :class="indicators.totalBalance < 0 ? 'text-debe' : 'text-foreground'">
          {{ formatCurrency(indicators.totalBalance) }}
        </p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Ingresos del mes</p>
        <p class="font-money mt-1 text-lg text-haber">{{ formatCurrency(indicators.monthlyIncome) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Gastos del mes</p>
        <p class="font-money mt-1 text-lg text-debe">{{ formatCurrency(indicators.monthlyExpenses) }}</p>
      </div>
    </div>

    <!-- Top cuentas -->
    <div class="rounded-lg border border-border bg-surface p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-foreground">Cuentas</h2>
        <Button variant="ghost" size="sm" @click="allAccountsOpen = true">Ver todos</Button>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          v-for="c in cuentas.slice(0, 3)"
          :key="c.cuenta_id"
          type="button"
          class="rounded-lg border border-border bg-surface-muted p-3 text-center transition hover:border-primary/50"
          @click="filterByAccount(c.cuenta_id)"
        >
          <span
            class="inline-block rounded-md px-2 py-0.5 text-xs font-medium"
            :style="{ backgroundColor: c.color, color: getContrastTextColor(c.color) }"
          >
            {{ c.cuenta }}
          </span>
          <p class="font-money mt-2" :class="Number(c.saldo_actual) >= 0 ? 'text-haber' : 'text-debe'">
            {{ formatCurrency(c.saldo_actual) }}
          </p>
        </button>
      </div>
    </div>

    <!-- Alta rápida -->
    <form class="rounded-lg border border-border bg-surface p-4" @submit.prevent="submitQuickMove">
      <h2 class="mb-3 text-sm font-semibold text-foreground">Alta rápida</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Tipo</label>
          <Select
            v-model="quickMove.tipo"
            :options="[
              { value: 'haber', label: 'Egreso' },
              { value: 'debe', label: 'Ingreso' },
              { value: 'transferencia', label: 'Transferencia interna' },
            ]"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Monto</label>
          <Input v-model="quickMove.monto" type="number" step="0.01" min="0" placeholder="0,00" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <Input v-model="quickMove.descripcion" placeholder="Descripción" />
        </div>
        <div v-if="quickMove.tipo !== 'transferencia'">
          <label class="mb-1 block text-xs font-medium text-muted">Categoría</label>
          <Select v-model="quickMove.categoriaId" :options="categoriaOptions" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">{{
            quickMove.tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta'
          }}</label>
          <Select v-model="quickMove.cuentaId" :options="cuentaOptions" />
        </div>
        <div v-if="quickMove.tipo === 'transferencia'">
          <label class="mb-1 block text-xs font-medium text-muted">Cuenta destino</label>
          <Select v-model="quickMove.cuentaDestinoId" :options="cuentaOptions" />
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <Button type="submit">Registrar</Button>
      </div>
    </form>

    <!-- Tabla -->
    <Table>
      <thead>
        <tr>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Fecha</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Descripción</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Cuenta</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted">Monto</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!filteredTransactions.length">
          <td colspan="5" class="border-b border-border px-3 py-8 text-center text-sm text-subtle">
            No hay transacciones para mostrar
          </td>
        </tr>
        <tr v-for="t in filteredTransactions" :key="t.id" class="hover:bg-surface-muted/60">
          <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ formatDate(t.date) }}</td>
          <td class="border-b border-border px-3 py-2 text-sm text-foreground">
            {{ t.descripcion }}<span v-if="t.banco_destino" class="text-subtle"> → {{ t.banco_destino }}</span>
          </td>
          <td class="border-b border-border px-3 py-2">
            <span
              class="inline-block rounded-md px-2 py-0.5 text-xs font-medium"
              :style="{ backgroundColor: t.banco_color || '#6c757d', color: getContrastTextColor(t.banco_color || '#6c757d') }"
            >
              {{ t.banco_nombre || t.banco || 'Sin cuenta' }}
            </span>
          </td>
          <td
            class="font-money border-b border-border px-3 py-2 text-right"
            :class="t.debeHaber === 'debe' ? 'text-haber' : 'text-debe'"
          >
            {{ amountSign(t) }} {{ formatCurrency(Math.abs(t.monto)) }}
          </td>
          <td class="border-b border-border px-3 py-2 text-center">
            <Button variant="ghost" size="sm" @click="openEdit(t)">Editar</Button>
            <Button variant="ghost" size="sm" @click="eliminar(t)">Eliminar</Button>
          </td>
        </tr>
      </tbody>
    </Table>

    <!-- Modal todas las cuentas -->
    <Dialog v-model="allAccountsOpen" title="Todas las cuentas">
      <div class="max-h-96 space-y-1 overflow-y-auto">
        <button
          v-for="c in cuentas"
          :key="c.cuenta_id"
          type="button"
          class="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-surface-muted"
          @click="filterByAccount(c.cuenta_id)"
        >
          <span
            class="inline-block rounded-md px-2 py-0.5 text-xs font-medium"
            :style="{ backgroundColor: c.color, color: getContrastTextColor(c.color) }"
          >
            {{ c.cuenta }}
          </span>
          <span class="font-money text-sm" :class="Number(c.saldo_actual) >= 0 ? 'text-haber' : 'text-debe'">
            {{ formatCurrency(c.saldo_actual) }}
          </span>
        </button>
      </div>
    </Dialog>

    <!-- Modal editar movimiento -->
    <Dialog v-model="editOpen" title="Editar movimiento">
      <form class="space-y-3" @submit.prevent="submitEdit">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Tipo</label>
          <Select
            v-model="editForm.tipo"
            :options="[
              { value: 'haber', label: 'Egreso' },
              { value: 'debe', label: 'Ingreso' },
              { value: 'transferencia', label: 'Transferencia interna' },
            ]"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Fecha</label>
          <Input v-model="editForm.fecha" type="date" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Monto</label>
          <Input v-model="editForm.monto" type="number" step="0.01" min="0" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <Input v-model="editForm.descripcion" />
        </div>
        <div v-if="editForm.tipo !== 'transferencia'">
          <label class="mb-1 block text-xs font-medium text-muted">Categoría</label>
          <Select v-model="editForm.categoriaId" :options="categoriaOptions" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">{{
            editForm.tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta'
          }}</label>
          <Select v-model="editForm.cuentaId" :options="cuentaOptions" />
        </div>
        <div v-if="editForm.tipo === 'transferencia'">
          <label class="mb-1 block text-xs font-medium text-muted">Cuenta destino</label>
          <Select v-model="editForm.cuentaDestinoId" :options="cuentaOptions" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="editOpen = false">Cancelar</Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </Dialog>
  </section>
</template>
