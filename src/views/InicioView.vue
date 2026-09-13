<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import Badge from '@/components/ui/Badge.vue'
import { dashboardRepository } from '@/data/repositories/dashboard.repository'
import { useSessionStore } from '@/stores/session'
import { useCuentasStore } from '@/stores/cuentas'
import { useMovimientosStore } from '@/stores/movimientos'
import type { AgendaItem } from '@/types/obligacion'
import type { ResumenFinanciero } from '@/types/dashboard'
import { useCurrency } from '@/composables/useCurrency'
import { useDates } from '@/composables/useDates'

// Paridad con public/js/dashboard.js. Vue Router remonta este componente al volver
// a '/' (sin keep-alive), asi que "recargar al volver a la ruta" sale gratis.
const session = useSessionStore()
const cuentas = useCuentasStore()
const movimientos = useMovimientosStore()
const { formatCurrency } = useCurrency()
const { monthRange } = useDates()

const resumen = ref<ResumenFinanciero | null>(null)
const cargando = ref(false)
const error = ref<string | null>(null)

async function cargar() {
  if (!session.usuarioId) return
  cargando.value = true
  const { desde, hasta } = monthRange()
  const result = await dashboardRepository.resumenFinanciero({
    usuario_id: session.usuarioId,
    desde,
    hasta,
  })
  cargando.value = false
  if (result.status === 'ready') {
    resumen.value = result.data
    error.value = null
  } else {
    error.value = result.error
  }
}

onMounted(async () => {
  await session.init()
  await cargar()
})

// Recargar al cambiar usuario, y cuando movimientos/cuentas se invaliden desde otra vista.
watch(() => session.usuarioId, cargar)
watch(() => movimientos.movimientos.updatedAt, cargar)
watch(() => cuentas.cuentas.updatedAt, cargar)

const disponibleReal = computed(() => resumen.value?.disponibleReal ?? 0)

const kpis = computed(() => [
  { label: 'Ingresos', value: resumen.value?.ingresosPeriodo ?? 0, tone: 'haber' as const },
  { label: 'Gastado', value: resumen.value?.gastadoPeriodo ?? 0, tone: 'debe' as const },
  { label: 'Comprometido', value: resumen.value?.comprometido ?? 0, tone: 'info' as const },
  { label: 'Disponible', value: resumen.value?.disponibleReal ?? 0, tone: 'primary' as const },
])

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fechaCorta(valor: string): string {
  const iso = String(valor || '').slice(0, 10)
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')} ${MESES_CORTOS[m - 1]}`
}

/** Paridad con proxTitulo() de dashboard.js: nombre del compromiso sin el sufijo "YYYY-MM". */
function proxTitulo(p: AgendaItem): string {
  const titulo = (p.compromiso_nombre || p.descripcion || 'Sin nombre').trim()
  return titulo.replace(/\s+\d{4}-\d{2}$/, '')
}

/** Paridad con proxMeta() de dashboard.js: descripcion real, alias de cuenta, o "Cuota N/M". */
function proxMeta(p: AgendaItem): string {
  const titulo = proxTitulo(p)
  const tituloLc = titulo.toLowerCase()
  const descLimpio = (p.descripcion || '').trim().replace(/\s+\d{4}-\d{2}$/, '')
  if (descLimpio && descLimpio.toLowerCase() !== tituloLc && !tituloLc.includes(descLimpio.toLowerCase())) {
    return descLimpio
  }
  const cuenta = (p.cuenta_alias || '').trim()
  if (cuenta && !tituloLc.includes(cuenta.toLowerCase())) return cuenta
  const totalCuotas = Number(p.compromiso_total_cuotas)
  if (totalCuotas > 1) {
    const match = `${p.descripcion || ''} ${p.compromiso_nombre || ''}`.match(/Cuota\s*(\d+)\/(\d+)/i)
    return match ? `Cuota ${match[1]}/${match[2]}` : `Cuota 1/${totalCuotas}`
  }
  return ''
}
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="font-money text-xl text-foreground">Inicio</h1>
      <p class="text-sm text-muted">¿Cómo estoy? — mes calendario actual.</p>
    </header>

    <div
      v-if="error"
      class="rounded-lg border border-debe/40 bg-debe/10 p-4 text-sm text-debe"
    >
      {{ error }}
    </div>

    <template v-else>
      <!-- Disponible real -->
      <div class="rounded-lg border border-border bg-surface p-6">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Disponible real</p>
        <p
          class="font-money mt-1 text-3xl"
          :class="disponibleReal < 0 ? 'text-debe' : 'text-foreground'"
        >
          {{ formatCurrency(disponibleReal) }}
        </p>
      </div>

      <!-- 4 KPIs -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="kpi in kpis" :key="kpi.label" class="rounded-lg border border-border bg-surface p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ kpi.label }}</p>
          <p
            class="font-money mt-1 text-lg"
            :class="{
              'text-haber': kpi.tone === 'haber',
              'text-debe': kpi.tone === 'debe',
              'text-info': kpi.tone === 'info',
              'text-primary': kpi.tone === 'primary',
            }"
          >
            {{ formatCurrency(kpi.value) }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Próximos compromisos -->
        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 text-sm font-semibold text-foreground">Próximos compromisos</h2>
          <p v-if="!resumen?.proximosCompromisos.length" class="text-sm text-subtle">
            No hay compromisos próximos
          </p>
          <ul v-else class="divide-y divide-border">
            <li
              v-for="p in resumen.proximosCompromisos"
              :key="p.id"
              class="flex items-center gap-3 py-2"
            >
              <time class="w-14 shrink-0 text-xs text-muted" :datetime="p.fecha_vencimiento">
                {{ fechaCorta(p.fecha_vencimiento) }}
              </time>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-foreground" :title="proxTitulo(p)">{{ proxTitulo(p) }}</p>
                <p v-if="proxMeta(p)" class="truncate text-xs text-subtle">{{ proxMeta(p) }}</p>
              </div>
              <p class="font-money shrink-0 text-sm text-foreground">{{ formatCurrency(p.importe_esperado || 0) }}</p>
              <Badge v-if="p.estado === 'vencido'" variant="debe" class="shrink-0">Vencido</Badge>
            </li>
          </ul>
        </div>

        <!-- Gastos por categoría -->
        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 text-sm font-semibold text-foreground">Gastos por categoría (este mes)</h2>
          <p v-if="!resumen?.gastosPorCategoria.length" class="text-sm text-subtle">
            Sin gastos categorizados este mes
          </p>
          <ul v-else class="divide-y divide-border">
            <li
              v-for="c in resumen.gastosPorCategoria"
              :key="c.categoria"
              class="flex items-center justify-between py-2 text-sm"
            >
              <span class="text-foreground">{{ c.categoria }}</span>
              <span class="font-money text-foreground">{{ formatCurrency(c.total || 0) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>
