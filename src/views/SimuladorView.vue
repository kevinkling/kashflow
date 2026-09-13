<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select, { type SelectOption } from '@/components/ui/Select.vue'
import { useCurrency } from '@/composables/useCurrency'
import { obligacionesRepository } from '@/data/repositories/obligaciones.repository'
import { useSessionStore } from '@/stores/session'
import { useSimuladorStore } from '@/stores/simulador'
import type { AgendaItem } from '@/types/obligacion'

// Paridad con public/js/simulator.js. Horizonte fijo de 6 meses desde el mes calendario actual.
const MESES = 6

const session = useSessionStore()
const store = useSimuladorStore()
const { formatCurrency } = useCurrency()

function usuarioId() {
  return session.usuarioId ?? 1
}
function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function horizonRange(meses = MESES) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const desde = `${y}-${pad2(m)}-01`
  const end = new Date(y, m - 1 + meses, 0)
  const hasta = `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`
  return { desde, hasta }
}

function monthChoices(meses = MESES) {
  const now = new Date()
  const opts: { periodo: string; fecha: string; label: string }[] = []
  for (let i = 0; i < meses; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const periodo = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
    const raw = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    opts.push({ periodo, fecha: `${periodo}-01`, label: raw.charAt(0).toUpperCase() + raw.slice(1) })
  }
  return opts
}

function labelPeriodo(periodo: string) {
  const [y, m] = String(periodo || '').split('-').map(Number)
  if (!y || !m) return periodo || ''
  return new Date(y, m - 1, 1)
    .toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
    .replace('.', '')
}

function tituloInstancia(row: AgendaItem) {
  const desc = (row.descripcion || '').trim().replace(/\s+\d{4}-\d{2}$/, '')
  const nombre = (row.compromiso_nombre || '').trim().replace(/\s+\d{4}-\d{2}$/, '')
  if (desc && nombre && desc.toLowerCase() !== nombre.toLowerCase()) return desc
  return desc || nombre || 'Sin nombre'
}

const monthOptions = computed<SelectOption[]>(() =>
  monthChoices().map((o) => ({ value: o.fecha, label: o.label })),
)

const pendingInstances = ref<AgendaItem[]>([])
const escenarioId = ref('')
const instanciaId = ref('')
const instanciaMonto = ref('')

const libre = reactive({ descripcion: '', monto: '', signo: '-1', fecha: monthChoices()[0]?.fecha ?? '' })
const nuevoEscenarioNombre = ref('')

async function syncHorizon() {
  const now = new Date()
  for (let i = 0; i < MESES; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    await obligacionesRepository.sincronizarMes({ usuario_id: usuarioId(), year: d.getFullYear(), month: d.getMonth() + 1 })
  }
}

async function loadPending() {
  const { desde, hasta } = horizonRange()
  const result = await obligacionesRepository.agenda({ desde, hasta, usuario_id: usuarioId() })
  const rows = (result.status === 'ready' ? result.data : []) ?? []
  pendingInstances.value = rows.filter((r) => r.estado !== 'pagado' && r.estado !== 'cancelado')
  if (!pendingInstances.value.some((r) => String(r.id) === instanciaId.value)) instanciaId.value = ''
  prefijarMonto()
}

const instanciaOptions = computed<SelectOption[]>(() => [
  { value: '', label: pendingInstances.value.length ? 'Elegí un pago' : 'No hay pagos pendientes' },
  ...pendingInstances.value.map((r) => ({
    value: String(r.id),
    label: `${String(r.fecha_vencimiento || '').slice(0, 10)} — ${tituloInstancia(r)} · ${formatCurrency(r.importe_esperado || 0)}`,
  })),
])

function prefijarMonto() {
  const inst = pendingInstances.value.find((r) => String(r.id) === instanciaId.value)
  instanciaMonto.value = inst ? String(inst.importe_esperado || 0) : ''
}
watch(instanciaId, prefijarMonto)

const escenarioOptions = computed<SelectOption[]>(() =>
  (store.escenarios.data ?? []).map((e) => ({ value: String(e.id), label: e.nombre })),
)

async function loadScenarios(selectId?: number) {
  await store.refreshEscenarios(usuarioId())
  let rows = store.escenarios.data ?? []
  if (!rows.length) {
    const created = await store.crearEscenario({ usuario_id: usuarioId(), nombre: 'Borrador' })
    if (created.status === 'ready' && created.data) {
      await store.refreshEscenarios(usuarioId())
      rows = store.escenarios.data ?? []
      selectId = selectId ?? created.data.id
    }
  }
  const wanted = selectId ? String(selectId) : rows[0] ? String(rows[0].id) : ''
  escenarioId.value = wanted
}

async function refreshSim() {
  if (!escenarioId.value) return
  const id = Number(escenarioId.value)
  await Promise.all([
    store.refreshAjustes(id),
    store.refreshProyeccion(id, { meses: MESES, usuario_id: usuarioId() }),
  ])
}

watch(escenarioId, refreshSim)

async function openSimulator() {
  await syncHorizon()
  await loadPending()
  await loadScenarios()
  await refreshSim()
}

onMounted(async () => {
  await session.init()
  await openSimulator()
})

watch(() => session.usuarioId, openSimulator)

async function crearEscenario() {
  const nombre = nuevoEscenarioNombre.value.trim()
  if (!nombre) return
  const result = await store.crearEscenario({ usuario_id: usuarioId(), nombre })
  if (result.status === 'ready' && result.data) {
    nuevoEscenarioNombre.value = ''
    await loadScenarios(result.data.id)
    await refreshSim()
  }
}

async function aplicarPago(omitir: boolean) {
  if (!escenarioId.value || !instanciaId.value) return
  const inst = pendingInstances.value.find((r) => String(r.id) === instanciaId.value)
  const monto = omitir ? 0 : Number(instanciaMonto.value)
  const tipo = inst && (inst.compromiso_tipo)
  const signo = tipo === 'ingreso' ? 1 : -1
  await store.agregarAjuste(Number(escenarioId.value), {
    tipo: 'instancia',
    instancia_compromiso_id: Number(instanciaId.value),
    descripcion: inst ? tituloInstancia(inst) : undefined,
    fecha_estimada: inst ? String(inst.fecha_vencimiento || '').slice(0, 10) : undefined,
    monto_simulado: monto,
    signo,
  })
}

async function agregarLibre() {
  if (!escenarioId.value) return
  const monto = Number(libre.monto)
  if (!libre.descripcion.trim() || !monto) return
  await store.agregarAjuste(Number(escenarioId.value), {
    tipo: 'libre',
    descripcion: libre.descripcion.trim(),
    fecha_estimada: libre.fecha,
    monto_simulado: monto,
    signo: Number(libre.signo) as 1 | -1,
  })
  libre.descripcion = ''
  libre.monto = ''
}

async function quitarAjuste(ajusteId: number) {
  if (!escenarioId.value) return
  await store.eliminarAjuste(Number(escenarioId.value), ajusteId)
}
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="font-money text-xl text-foreground">Simulador</h1>
      <p class="text-sm text-muted">Proyección de 6 meses con escenarios hipotéticos.</p>
    </header>

    <!-- Escenarios -->
    <div class="rounded-lg border border-border bg-surface p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-[12rem] flex-1">
          <label class="mb-1 block text-xs font-medium text-muted">Escenario</label>
          <Select v-model="escenarioId" :options="escenarioOptions" />
        </div>
        <div class="min-w-[12rem] flex-1">
          <label class="mb-1 block text-xs font-medium text-muted">Crear escenario</label>
          <div class="flex gap-2">
            <Input v-model="nuevoEscenarioNombre" placeholder="Nombre..." />
            <Button variant="outline" @click="crearEscenario">Crear</Button>
          </div>
        </div>
      </div>
    </div>

    <template v-if="escenarioId">
      <!-- Cambiar / omitir pago -->
      <div class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-foreground">Cambiar o quitar un pago</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select v-model="instanciaId" :options="instanciaOptions" class="sm:col-span-2" />
          <Input v-model="instanciaMonto" type="number" step="0.01" min="0" placeholder="Monto" />
        </div>
        <div class="mt-3 flex gap-2">
          <Button size="sm" @click="aplicarPago(false)">Aplicar cambio</Button>
          <Button size="sm" variant="outline" @click="aplicarPago(true)">Omitir pago</Button>
        </div>
      </div>

      <!-- Movimiento hipotético -->
      <div class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-foreground">Movimiento hipotético</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input v-model="libre.descripcion" placeholder="Descripción" class="sm:col-span-2" />
          <Input v-model="libre.monto" type="number" step="0.01" min="0" placeholder="Monto" />
          <Select v-model="libre.signo" :options="[{ value: '-1', label: 'Egreso' }, { value: '1', label: 'Ingreso' }]" />
        </div>
        <div class="mt-3 flex items-end gap-3">
          <div class="min-w-[10rem]">
            <label class="mb-1 block text-xs font-medium text-muted">Mes</label>
            <Select v-model="libre.fecha" :options="monthOptions" />
          </div>
          <Button size="sm" @click="agregarLibre">Agregar</Button>
        </div>
      </div>

      <!-- Ajustes -->
      <div class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-foreground">Ajustes del escenario</h2>
        <p v-if="!store.ajustes.data?.length" class="text-sm text-subtle">
          Todavía no hay cambios. Elegí un pago o sumá un gasto hipotético.
        </p>
        <ul v-else class="divide-y divide-border">
          <li v-for="a in store.ajustes.data" :key="a.id" class="flex items-center justify-between gap-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-foreground">
                {{ a.tipo === 'instancia' ? (a.descripcion || 'Pago de la agenda') : (a.descripcion || 'Movimiento hipotético') }}
                <span v-if="a.tipo === 'instancia' && Number(a.monto_simulado) === 0" class="text-xs text-subtle"> (omitido)</span>
              </p>
              <p class="text-xs text-subtle">
                {{ a.tipo === 'instancia' ? 'Pago de la agenda' : `Extra · ${labelPeriodo(String(a.fecha_estimada || '').slice(0, 7)) || 'este mes'}` }}
              </p>
            </div>
            <span
              class="font-money shrink-0 text-sm"
              :class="(Number(a.monto_simulado) * Number(a.signo)) < 0 ? 'text-debe' : (Number(a.monto_simulado) * Number(a.signo)) > 0 ? 'text-haber' : 'text-foreground'"
            >
              {{ formatCurrency(Number(a.monto_simulado) * Number(a.signo)) }}
            </span>
            <Button variant="ghost" size="sm" @click="quitarAjuste(a.id)">Quitar</Button>
          </li>
        </ul>
      </div>

      <!-- Proyección -->
      <div class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-foreground">Proyección 6 meses</h2>
        <p v-if="!store.proyeccion.data?.length" class="text-sm text-subtle">No se pudo calcular la proyección.</p>
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div
            v-for="r in store.proyeccion.data"
            :key="r.periodo"
            class="rounded-lg border p-3"
            :class="Number(r.saldoSimulado) < 0 ? 'border-debe/40 bg-debe/5' : 'border-border bg-surface-muted'"
          >
            <p class="text-xs text-muted">{{ labelPeriodo(r.periodo) }}</p>
            <p class="font-money mt-1 text-sm" :class="Number(r.saldoSimulado) < 0 ? 'text-debe' : 'text-foreground'">
              {{ formatCurrency(r.saldoSimulado) }}
            </p>
            <p
              class="mt-1 text-xs"
              :class="Number(r.delta) > 0 ? 'text-haber' : Number(r.delta) < 0 ? 'text-debe' : 'text-subtle'"
            >
              {{ Number(r.delta) === 0 ? 'Sin cambios' : `${Number(r.delta) > 0 ? '+' : ''}${formatCurrency(r.delta)} vs base` }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
