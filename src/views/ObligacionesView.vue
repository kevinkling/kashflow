<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import Select, { type SelectOption } from '@/components/ui/Select.vue'
import Table from '@/components/ui/Table.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useCurrency } from '@/composables/useCurrency'
import { useToast } from '@/composables/useToast'
import { useCuentasStore } from '@/stores/cuentas'
import { useObligacionesStore } from '@/stores/obligaciones'
import { useSessionStore } from '@/stores/session'
import { useTarjetasStore } from '@/stores/tarjetas'
import type { AgendaItem, EstadoInstancia, FrecuenciaCompromiso, TipoCompromiso } from '@/types/obligacion'

// Paridad con public/js/obligaciones.js:
// - El mes inicial de la agenda es el mes calendario SIGUIENTE, no el actual.
// - Al entrar / cambiar de mes: POST /sincronizar-mes y despues GET /agenda. Nunca "Generar mes" manual.
// - El label del mes es clickeable y vuelve al mes siguiente (no al actual del calendario real).

const session = useSessionStore()
const cuentasStore = useCuentasStore()
const tarjetasStore = useTarjetasStore()
const obligacionesStore = useObligacionesStore()
const { formatCurrency } = useCurrency()
const { showToast } = useToast()
const { confirm } = useConfirmDialog()

function pad2(n: number) {
  return String(n).padStart(2, '0')
}
function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}
function nextCalendarMonth(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

const initial = nextCalendarMonth()
const viewYear = ref(initial.year)
const viewMonth = ref(initial.month)

function setViewToNextMonth() {
  const next = nextCalendarMonth()
  viewYear.value = next.year
  viewMonth.value = next.month
}
function shiftViewMonth(delta: number) {
  const d = new Date(viewYear.value, viewMonth.value - 1 + delta, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth() + 1
}

const monthLabel = computed(() => {
  const label = new Date(viewYear.value, viewMonth.value - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

function usuarioId() {
  return session.usuarioId ?? 1
}

async function syncAndLoadAgenda() {
  await obligacionesStore.sincronizarMes({ usuario_id: usuarioId(), year: viewYear.value, month: viewMonth.value })
  await loadAgenda()
}

async function loadAgenda() {
  const desde = `${viewYear.value}-${pad2(viewMonth.value)}-01`
  const hasta = `${viewYear.value}-${pad2(viewMonth.value)}-${pad2(lastDayOfMonth(viewYear.value, viewMonth.value))}`
  await obligacionesStore.refreshAgenda({ desde, hasta, usuario_id: usuarioId() })
}

onMounted(async () => {
  await session.init()
  await cuentasStore.refresh()
  await tarjetasStore.refresh(usuarioId())
  await syncAndLoadAgenda()
})

watch(() => session.usuarioId, () => {
  tarjetasStore.refresh(usuarioId())
  syncAndLoadAgenda()
})
watch([viewYear, viewMonth], syncAndLoadAgenda)

const agenda = computed(() => obligacionesStore.agenda.data ?? [])

/** Paridad con esMontoVariable() de obligaciones.js. */
function esMontoVariable(r: AgendaItem): boolean {
  if (r.compromiso_es_variable === 1) return true
  if (r.compromiso_id && r.compromiso_es_variable === 0) return false
  const texto = `${r.compromiso_nombre || ''} ${r.descripcion || ''}`.toLowerCase()
  if (texto.includes('resumen')) return true
  if (!r.compromiso_id) return true
  return false
}

const fijos = computed(() => agenda.value.filter((r) => !esMontoVariable(r)))
const variables = computed(() => agenda.value.filter(esMontoVariable))

function sumImporte(rows: AgendaItem[], pred: (r: AgendaItem) => boolean) {
  return rows.filter(pred).reduce((s, r) => s + (Number(r.importe_esperado) || 0), 0)
}
const abierto = (r: AgendaItem) => r.estado !== 'pagado' && r.estado !== 'cancelado'

const kpis = computed(() => {
  const all = [...fijos.value, ...variables.value]
  return {
    totalMes: sumImporte(all, abierto),
    fijos: sumImporte(fijos.value, abierto),
    variables: sumImporte(variables.value, abierto),
    vencidos: sumImporte(all, (r) => r.estado === 'vencido'),
    pagados: sumImporte(all, (r) => r.estado === 'pagado'),
    pendientes: sumImporte(all, (r) => r.estado === 'pendiente'),
  }
})
const comprometido = computed(() => sumImporte(agenda.value, abierto))

interface TaggedRow {
  r: AgendaItem
  variable: boolean
}
interface GroupEntry {
  kind: 'group'
  id: number
  nombre: string
  items: TaggedRow[]
  fecha: string
}
interface RowEntry {
  kind: 'row'
  item: TaggedRow
  fecha: string
}

const expandedGroups = ref<Set<number>>(new Set())
function toggleGroup(id: number) {
  const next = new Set(expandedGroups.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedGroups.value = next
}

const combinedRows = computed<(RowEntry | GroupEntry)[]>(() => {
  const tagged: TaggedRow[] = [
    ...fijos.value.map((r) => ({ r, variable: false })),
    ...variables.value.map((r) => ({ r, variable: true })),
  ]
  const groups = new Map<number, GroupEntry>()
  const standalone: RowEntry[] = []
  tagged.forEach((item) => {
    const tId = item.r.tarjeta_id
    if (tId) {
      if (!groups.has(tId)) {
        groups.set(tId, { kind: 'group', id: tId, nombre: item.r.tarjeta_nombre || `Tarjeta #${tId}`, items: [], fecha: '' })
      }
      groups.get(tId)!.items.push(item)
    } else {
      standalone.push({ kind: 'row', item, fecha: item.r.fecha_vencimiento })
    }
  })
  const combined: (RowEntry | GroupEntry)[] = [...standalone]
  groups.forEach((group) => {
    group.items.sort((a, b) => String(a.r.fecha_vencimiento).localeCompare(String(b.r.fecha_vencimiento)))
    group.fecha = group.items[0].r.fecha_vencimiento
    combined.push(group)
  })
  combined.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
  return combined
})

function groupTotal(group: GroupEntry) {
  return group.items.reduce((s, it) => s + (Number(it.r.importe_esperado) || 0), 0)
}

/** Paridad con proxTitulo/descripcion de las filas de la agenda: badge de "Cuota N/M". */
function cuotaBadge(r: AgendaItem): string | null {
  if (!r.compromiso_total_cuotas || Number(r.compromiso_total_cuotas) <= 1) return null
  const match = (r.descripcion || r.compromiso_nombre || '').match(/Cuota\s*(\d+)\/(\d+)/i)
  return match ? `Cuota ${match[1]}/${match[2]}` : `Cuota 1/${r.compromiso_total_cuotas}`
}

// --- Selects compartidos ---
const cuentaOptions = computed<SelectOption[]>(() =>
  (cuentasStore.cuentas.data ?? []).map((c) => ({ value: String(c.cuenta_id), label: c.cuenta })),
)
const cuentaOptionsConVacio = computed<SelectOption[]>(() => [
  { value: '', label: '-- Sin especificar --' },
  ...cuentaOptions.value,
])
const tarjetaOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'Seleccionar tarjeta (opcional)' },
  ...(tarjetasStore.tarjetas.data ?? []).map((t) => ({ value: String(t.id), label: `${t.nombre} (${t.alias})` })),
])

// --- Nueva obligación ---
const newOpen = ref(false)
const newForm = reactive({
  kind: 'gasto_fijo' as 'gasto_fijo' | 'compra_cuotas' | 'compra_unica',
  nombre: '',
  tipo: 'egreso' as TipoCompromiso,
  frecuencia: 'mensual' as FrecuenciaCompromiso,
  dia: '10',
  monto: '',
  cuotas: '2',
  tarjetaId: '',
  cuentaId: '',
  esVariable: '0',
})

function openNew() {
  newForm.kind = 'gasto_fijo'
  newForm.nombre = ''
  newForm.tipo = 'egreso'
  newForm.frecuencia = 'mensual'
  newForm.dia = '10'
  newForm.monto = ''
  newForm.cuotas = '2'
  newForm.tarjetaId = ''
  newForm.cuentaId = cuentaOptions.value[0]?.value ?? ''
  newForm.esVariable = '0'
  newOpen.value = true
}

const cuentaOculta = computed(
  () => (newForm.kind === 'compra_cuotas' || newForm.kind === 'compra_unica') && !!newForm.tarjetaId,
)
const importePorCuota = computed(() => {
  const total = Number(newForm.monto) || 0
  const n = newForm.kind === 'compra_unica' ? 1 : Math.max(1, Number(newForm.cuotas) || 1)
  return formatCurrency(+(total / n).toFixed(2))
})

async function submitNew() {
  if (newForm.kind === 'compra_cuotas' || newForm.kind === 'compra_unica') {
    const result = await obligacionesStore.crearCompra({
      usuario_id: usuarioId(),
      nombre: newForm.nombre,
      monto_total: Number(newForm.monto) || 0,
      total_cuotas: newForm.kind === 'compra_unica' ? 1 : Math.max(1, Number(newForm.cuotas) || 1),
      tarjeta_id: newForm.tarjetaId ? Number(newForm.tarjetaId) : null,
      cuenta_sugerida_id: newForm.cuentaId ? Number(newForm.cuentaId) : null,
    })
    if (result.status !== 'ready') return showToast(result.error || 'Error al guardar la compra', 'danger')
    newOpen.value = false
    setViewToNextMonth()
    showToast('Compra registrada', 'success')
  } else {
    const result = await obligacionesStore.crearCompromiso({
      usuario_id: usuarioId(),
      nombre: newForm.nombre,
      tipo: newForm.tipo,
      frecuencia: newForm.frecuencia,
      dia_vencimiento: Number(newForm.dia) || null,
      importe_estimado: Number(newForm.monto) || 0,
      cuenta_sugerida_id: newForm.cuentaId ? Number(newForm.cuentaId) : null,
      es_variable: newForm.esVariable === '1',
    })
    if (result.status !== 'ready') return showToast(result.error || 'Error al guardar la obligación', 'danger')
    newOpen.value = false
    showToast('Obligación creada', 'success')
    await syncAndLoadAgenda()
  }
}

// --- Confirmar pago ---
const payOpen = ref(false)
const payForm = reactive({ instanciaId: 0, monto: '', descripcion: '', cuentaId: '' })

function openPay(r: AgendaItem) {
  payForm.instanciaId = r.id
  payForm.monto = String(r.importe_esperado)
  payForm.descripcion = r.descripcion || r.compromiso_nombre || 'Confirmar pago'
  payForm.cuentaId = cuentaOptions.value[0]?.value ?? ''
  payOpen.value = true
}

async function submitPay() {
  const result = await obligacionesStore.confirmarPago(payForm.instanciaId, {
    cuenta_pago_id: Number(payForm.cuentaId),
    monto_final: Number(payForm.monto),
    descripcion: payForm.descripcion,
  })
  if (result.status === 'ready') {
    payOpen.value = false
    showToast('Pago confirmado', 'success')
  } else {
    showToast(result.error || 'Error al confirmar el pago', 'danger')
  }
}

// --- Editar obligación ---
const editOpen = ref(false)
const editForm = reactive({
  id: 0,
  descripcion: '',
  fecha: '',
  monto: '',
  cuentaId: '',
  estado: 'pendiente' as EstadoInstancia,
  estadoDisabled: false,
  estadoActual: 'pendiente' as EstadoInstancia,
  tieneCompromiso: false,
  tipo: 'egreso' as TipoCompromiso,
  esVariable: '0',
})

function openEdit(r: AgendaItem) {
  const yaPagado = r.estado === 'pagado'
  editForm.id = r.id
  editForm.descripcion = r.descripcion || r.compromiso_nombre || ''
  editForm.fecha = String(r.fecha_vencimiento).slice(0, 10)
  editForm.monto = String(r.importe_esperado)
  editForm.cuentaId = r.cuenta_pago_id ? String(r.cuenta_pago_id) : ''
  editForm.estadoActual = r.estado
  editForm.estado = yaPagado ? 'pendiente' : r.estado
  editForm.estadoDisabled = yaPagado
  editForm.tieneCompromiso = !!r.compromiso_id
  editForm.tipo = r.compromiso_tipo || 'egreso'
  editForm.esVariable = r.compromiso_es_variable ? '1' : '0'
  editOpen.value = true
}

async function submitEditObligacion() {
  const payload: Record<string, unknown> = {
    descripcion: editForm.descripcion,
    fecha_vencimiento: editForm.fecha,
    importe_esperado: Number(editForm.monto),
    cuenta_pago_id: editForm.cuentaId ? Number(editForm.cuentaId) : null,
    estado: editForm.estadoDisabled ? editForm.estadoActual : editForm.estado,
  }
  if (editForm.tieneCompromiso) {
    payload.tipo = editForm.tipo
    payload.es_variable = editForm.esVariable === '1'
  }
  const result = await obligacionesStore.actualizarInstancia(editForm.id, payload)
  if (result.status === 'ready') {
    editOpen.value = false
    showToast('Obligación actualizada', 'success')
  } else {
    showToast(result.error || 'Error al actualizar la obligación', 'danger')
  }
}

async function eliminarDesdeEdit() {
  const ok = await confirm({
    title: 'Eliminar obligación',
    description: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  const result = await obligacionesStore.eliminarInstancia(editForm.id)
  if (result.status === 'ready') {
    editOpen.value = false
    showToast('Obligación eliminada', 'success')
  } else {
    showToast(result.error || 'Error al eliminar la obligación', 'danger')
  }
}

async function eliminarRapido(r: AgendaItem) {
  const ok = await confirm({
    title: 'Eliminar obligación',
    description: `¿Eliminar la obligación "${r.descripcion || r.compromiso_nombre || ''}"? Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  const result = await obligacionesStore.eliminarInstancia(r.id)
  if (result.status !== 'ready') showToast(result.error || 'Error al eliminar la obligación', 'danger')
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-money text-xl text-foreground">Obligaciones</h1>
        <p class="text-sm text-muted">Agenda de compromisos y compras.</p>
      </div>
      <Button @click="openNew">Nueva obligación</Button>
    </header>

    <!-- Navegación de mes -->
    <div class="flex items-center justify-center gap-3">
      <Button variant="ghost" size="icon" @click="shiftViewMonth(-1)">‹</Button>
      <button
        type="button"
        class="font-money text-lg text-foreground"
        title="Volver al mes siguiente"
        @click="setViewToNextMonth"
      >
        {{ monthLabel }}
      </button>
      <Button variant="ghost" size="icon" @click="shiftViewMonth(1)">›</Button>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="text-xs text-muted">A pagar</p>
        <p class="font-money mt-1 text-sm text-foreground">{{ formatCurrency(kpis.totalMes) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="text-xs text-muted">Fijos</p>
        <p class="font-money mt-1 text-sm text-foreground">{{ formatCurrency(kpis.fijos) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="text-xs text-muted">Variables</p>
        <p class="font-money mt-1 text-sm text-foreground">{{ formatCurrency(kpis.variables) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="text-xs text-muted">Vencidos</p>
        <p class="font-money mt-1 text-sm text-debe">{{ formatCurrency(kpis.vencidos) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="text-xs text-muted">Pagados</p>
        <p class="font-money mt-1 text-sm text-haber">{{ formatCurrency(kpis.pagados) }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface p-3">
        <p class="text-xs text-muted">Pendientes</p>
        <p class="font-money mt-1 text-sm text-foreground">{{ formatCurrency(kpis.pendientes) }}</p>
      </div>
    </div>

    <p class="text-sm text-muted">Comprometido: <span class="font-money text-foreground">{{ formatCurrency(comprometido) }}</span></p>

    <!-- Agenda -->
    <Table>
      <thead>
        <tr>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Vencimiento</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Tipo</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Descripción</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted">Importe</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!combinedRows.length">
          <td colspan="5" class="border-b border-border px-3 py-8 text-center text-sm text-subtle">
            No hay obligaciones en este mes.
          </td>
        </tr>
        <template v-for="entry in combinedRows" :key="entry.kind === 'group' ? `g${entry.id}` : `r${entry.item.r.id}`">
          <template v-if="entry.kind === 'group'">
            <tr class="cursor-pointer bg-surface-muted/40" @click="toggleGroup(entry.id)">
              <td colspan="3" class="border-b border-border px-3 py-2 text-sm text-foreground">
                <span class="mr-2">{{ expandedGroups.has(entry.id) ? '▾' : '▸' }}</span>
                <strong>{{ entry.nombre }}</strong>
                <span class="ml-2 text-xs text-subtle">({{ entry.items.length }} {{ entry.items.length === 1 ? 'gasto' : 'gastos' }})</span>
              </td>
              <td class="font-money border-b border-border px-3 py-2 text-right text-sm text-foreground">
                {{ formatCurrency(groupTotal(entry)) }}
              </td>
              <td class="border-b border-border px-3 py-2"></td>
            </tr>
            <template v-if="expandedGroups.has(entry.id)">
              <tr v-for="item in entry.items" :key="item.r.id" class="hover:bg-surface-muted/60">
                <td class="border-b border-border px-3 py-2 text-sm" :class="item.r.estado === 'vencido' ? 'text-debe' : 'text-foreground'">
                  {{ item.r.fecha_vencimiento }}
                </td>
                <td class="border-b border-border px-3 py-2"><Badge :variant="item.variable ? 'info' : 'default'">{{ item.variable ? 'Variable' : 'Fijo' }}</Badge></td>
                <td class="border-b border-border px-3 py-2 text-sm text-foreground">
                  {{ item.r.compromiso_nombre || item.r.descripcion }}
                  <div v-if="cuotaBadge(item.r)" class="text-xs text-subtle">{{ cuotaBadge(item.r) }}</div>
                </td>
                <td class="font-money border-b border-border px-3 py-2 text-right text-sm text-foreground">{{ formatCurrency(item.r.importe_esperado) }}</td>
                <td class="border-b border-border px-3 py-2 text-center">
                  <Button v-if="item.r.estado !== 'pagado'" variant="ghost" size="sm" @click="openPay(item.r)">Pagar</Button>
                  <Button variant="ghost" size="sm" @click="openEdit(item.r)">Editar</Button>
                  <Button variant="ghost" size="sm" @click="eliminarRapido(item.r)">Eliminar</Button>
                </td>
              </tr>
            </template>
          </template>
          <tr v-else class="hover:bg-surface-muted/60">
            <td class="border-b border-border px-3 py-2 text-sm" :class="entry.item.r.estado === 'vencido' ? 'text-debe' : 'text-foreground'">
              {{ entry.item.r.fecha_vencimiento }}
            </td>
            <td class="border-b border-border px-3 py-2"><Badge :variant="entry.item.variable ? 'info' : 'default'">{{ entry.item.variable ? 'Variable' : 'Fijo' }}</Badge></td>
            <td class="border-b border-border px-3 py-2 text-sm text-foreground">
              {{ entry.item.r.compromiso_nombre || entry.item.r.descripcion }}
              <div v-if="cuotaBadge(entry.item.r)" class="text-xs text-subtle">{{ cuotaBadge(entry.item.r) }}</div>
            </td>
            <td class="font-money border-b border-border px-3 py-2 text-right text-sm text-foreground">{{ formatCurrency(entry.item.r.importe_esperado) }}</td>
            <td class="border-b border-border px-3 py-2 text-center">
              <Button v-if="entry.item.r.estado !== 'pagado'" variant="ghost" size="sm" @click="openPay(entry.item.r)">Pagar</Button>
              <Button variant="ghost" size="sm" @click="openEdit(entry.item.r)">Editar</Button>
              <Button variant="ghost" size="sm" @click="eliminarRapido(entry.item.r)">Eliminar</Button>
            </td>
          </tr>
        </template>
      </tbody>
    </Table>

    <!-- Nueva obligación -->
    <Dialog v-model="newOpen" title="Nueva obligación">
      <form class="max-h-[70vh] space-y-3 overflow-y-auto pr-1" @submit.prevent="submitNew">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Tipo de obligación</label>
          <Select
            v-model="newForm.kind"
            :options="[
              { value: 'gasto_fijo', label: 'Gasto fijo' },
              { value: 'compra_cuotas', label: 'Compra en cuotas' },
              { value: 'compra_unica', label: 'Compra única' },
            ]"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <Input v-model="newForm.nombre" required />
        </div>

        <template v-if="newForm.kind === 'gasto_fijo'">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Tipo</label>
            <Select
              v-model="newForm.tipo"
              :options="[
                { value: 'egreso', label: 'Egreso' },
                { value: 'ingreso', label: 'Ingreso' },
              ]"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Frecuencia</label>
              <Select
                v-model="newForm.frecuencia"
                :options="[
                  { value: 'mensual', label: 'Mensual' },
                  { value: 'quincenal', label: 'Quincenal' },
                  { value: 'anual', label: 'Anual' },
                  { value: 'unica', label: 'Única' },
                ]"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">Día de vencimiento</label>
              <Input v-model="newForm.dia" type="number" min="1" max="31" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">¿Monto variable?</label>
            <Select
              v-model="newForm.esVariable"
              :options="[
                { value: '0', label: 'Fijo' },
                { value: '1', label: 'Variable' },
              ]"
            />
          </div>
        </template>

        <template v-else>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Tarjeta (opcional)</label>
            <Select v-model="newForm.tarjetaId" :options="tarjetaOptions" />
          </div>
          <div v-if="newForm.kind === 'compra_cuotas'">
            <label class="mb-1 block text-xs font-medium text-muted">Cantidad de cuotas</label>
            <Input v-model="newForm.cuotas" type="number" min="1" />
          </div>
        </template>

        <div>
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ newForm.kind === 'gasto_fijo' ? 'Importe estimado' : 'Monto total' }}
          </label>
          <Input v-model="newForm.monto" type="number" step="0.01" min="0" />
          <p v-if="newForm.kind !== 'gasto_fijo'" class="mt-1 text-xs text-subtle">
            Importe por cuota: {{ importePorCuota }}
          </p>
        </div>

        <div v-if="!cuentaOculta">
          <label class="mb-1 block text-xs font-medium text-muted">Cuenta sugerida</label>
          <Select v-model="newForm.cuentaId" :options="cuentaOptionsConVacio" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="newOpen = false">Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Dialog>

    <!-- Confirmar pago -->
    <Dialog v-model="payOpen" title="Confirmar pago" :description="payForm.descripcion">
      <form class="space-y-3" @submit.prevent="submitPay">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Cuenta de pago</label>
          <Select v-model="payForm.cuentaId" :options="cuentaOptions" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Monto final</label>
          <Input v-model="payForm.monto" type="number" step="0.01" min="0" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="payOpen = false">Cancelar</Button>
          <Button type="submit" variant="success">Confirmar pago</Button>
        </div>
      </form>
    </Dialog>

    <!-- Editar obligación -->
    <Dialog v-model="editOpen" title="Editar obligación">
      <form class="space-y-3" @submit.prevent="submitEditObligacion">
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Descripción</label>
          <Input v-model="editForm.descripcion" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Fecha de vencimiento</label>
          <Input v-model="editForm.fecha" type="date" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Importe esperado</label>
          <Input v-model="editForm.monto" type="number" step="0.01" min="0" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Cuenta de pago</label>
          <Select v-model="editForm.cuentaId" :options="cuentaOptionsConVacio" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Estado</label>
          <Select
            v-model="editForm.estado"
            :disabled="editForm.estadoDisabled"
            :options="[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'vencido', label: 'Vencido' },
              { value: 'cancelado', label: 'Cancelado' },
            ]"
          />
          <p v-if="editForm.estadoDisabled" class="mt-1 text-xs text-subtle">
            Ya está pagada; para revertirla eliminala y volvé a generarla.
          </p>
        </div>
        <template v-if="editForm.tieneCompromiso">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Tipo</label>
            <Select
              v-model="editForm.tipo"
              :options="[
                { value: 'egreso', label: 'Egreso' },
                { value: 'ingreso', label: 'Ingreso' },
              ]"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">¿Monto variable?</label>
            <Select
              v-model="editForm.esVariable"
              :options="[
                { value: '0', label: 'Fijo' },
                { value: '1', label: 'Variable' },
              ]"
            />
          </div>
        </template>
        <div class="flex justify-between gap-2 pt-2">
          <Button type="button" variant="danger" @click="eliminarDesdeEdit">Eliminar</Button>
          <div class="flex gap-2">
            <Button type="button" variant="outline" @click="editOpen = false">Cancelar</Button>
            <Button type="submit">Guardar cambios</Button>
          </div>
        </div>
      </form>
    </Dialog>
  </section>
</template>
