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
import { cuentasRepository } from '@/data/repositories/cuentas.repository'
import { useCuentasStore } from '@/stores/cuentas'
import { useSessionStore } from '@/stores/session'
import { useTarjetasStore } from '@/stores/tarjetas'
import type { Cuenta } from '@/types/cuenta'
import type { CuotaConsumo, Tarjeta } from '@/types/tarjeta'

// Paridad con public/js/accounts-crud.js + tarjetas.js.
const session = useSessionStore()
const cuentasStore = useCuentasStore()
const tarjetasStore = useTarjetasStore()
const { formatCurrency } = useCurrency()
const { showToast } = useToast()
const { confirm } = useConfirmDialog()

function usuarioId() {
  return session.usuarioId ?? 1
}

onMounted(async () => {
  await session.init()
  await Promise.all([cuentasStore.refreshGestion(), tarjetasStore.refresh(usuarioId())])
})

watch(() => session.usuarioId, () => {
  cuentasStore.refreshGestion()
  tarjetasStore.refresh(usuarioId())
})

const cuentasGestion = computed(() => cuentasStore.cuentasGestion.data ?? [])
const usuarioOptions = computed<SelectOption[]>(() =>
  session.usuarios.map((u) => ({ value: String(u.id), label: u.nombre })),
)

// --- Alta / edición de cuenta ---
const accountOpen = ref(false)
const accountEditingId = ref<number | null>(null)
const accountForm = reactive({
  usuarioId: '',
  nombre: '',
  alias: '',
  color: '#4CAF50',
  moneda: 'ARS',
})

function openCreateAccount() {
  accountEditingId.value = null
  accountForm.usuarioId = usuarioOptions.value[0]?.value ?? ''
  accountForm.nombre = ''
  accountForm.alias = ''
  accountForm.color = '#4CAF50'
  accountForm.moneda = 'ARS'
  accountOpen.value = true
}

async function openEditAccount(cuenta: Cuenta) {
  const res = await cuentasRepository.obtener(cuenta.cuenta_id)
  if (res.status !== 'ready' || !res.data) {
    showToast(res.error || 'Error al cargar los datos de la cuenta', 'danger')
    return
  }
  const detalle = res.data
  accountEditingId.value = detalle.id
  accountForm.usuarioId = String(detalle.usuario_id)
  accountForm.nombre = detalle.nombre
  accountForm.alias = detalle.alias
  accountForm.color = detalle.color
  accountForm.moneda = detalle.moneda
  accountOpen.value = true
}

async function submitAccount() {
  if (accountEditingId.value) {
    const result = await cuentasStore.actualizar(accountEditingId.value, {
      nombre: accountForm.nombre,
      alias: accountForm.alias,
      color: accountForm.color,
      moneda: accountForm.moneda,
    })
    if (result.status !== 'ready') return showToast(result.error || 'Error al guardar la cuenta', 'danger')
  } else {
    const result = await cuentasStore.crear({
      usuario_id: Number(accountForm.usuarioId),
      nombre: accountForm.nombre,
      alias: accountForm.alias,
      color: accountForm.color,
      moneda: accountForm.moneda,
    })
    if (result.status !== 'ready') return showToast(result.error || 'Error al guardar la cuenta', 'danger')
  }
  accountOpen.value = false
  showToast('Cuenta guardada exitosamente', 'success')
}

async function toggleAccount(cuenta: Cuenta) {
  const isActive = cuenta.activa === 1
  const ok = await confirm({
    title: isActive ? 'Desactivar Cuenta' : 'Activar Cuenta',
    description: isActive
      ? `¿Estás seguro de que deseas desactivar la cuenta "${cuenta.alias}"? La cuenta no aparecerá en los listados generales pero sus datos se conservarán.`
      : `¿Deseas activar nuevamente la cuenta "${cuenta.alias}"?`,
    confirmLabel: isActive ? 'Desactivar' : 'Activar',
    variant: isActive ? 'danger' : 'primary',
  })
  if (!ok) return
  const result = await cuentasStore.toggle(cuenta.cuenta_id)
  if (result.status === 'ready' && result.data) {
    showToast(result.data.message || 'Cuenta actualizada', 'success')
  } else {
    showToast(result.error || 'Error al actualizar el estado de la cuenta', 'danger')
  }
}

// --- Tarjetas ---
const tarjetas = computed(() => tarjetasStore.tarjetas.data ?? [])
const cuentaOptions = computed<SelectOption[]>(() =>
  (cuentasStore.cuentasGestion.data ?? []).map((c) => ({ value: String(c.cuenta_id), label: c.cuenta })),
)
const cuentaOptionsConVacio = computed<SelectOption[]>(() => [
  { value: '', label: '-- Sin cuenta de pago --' },
  ...cuentaOptions.value,
])

function nombreCuentaPago(id: number | null) {
  if (!id) return '—'
  const acc = cuentasGestion.value.find((c) => c.cuenta_id === id)
  return acc ? acc.cuenta : '—'
}

const cardEditingId = ref<number | null>(null)
const cardForm = reactive({ nombre: '', alias: '', cierre: '10', vence: '20', cuentaId: '' })

function resetCardForm() {
  cardEditingId.value = null
  cardForm.nombre = ''
  cardForm.alias = ''
  cardForm.cierre = '10'
  cardForm.vence = '20'
  cardForm.cuentaId = ''
}

function startEditTarjeta(t: Tarjeta) {
  cardEditingId.value = t.id
  cardForm.nombre = t.nombre
  cardForm.alias = t.alias
  cardForm.cierre = String(t.dia_cierre)
  cardForm.vence = String(t.dia_vencimiento)
  cardForm.cuentaId = t.cuenta_pago_id ? String(t.cuenta_pago_id) : ''
}

async function submitCard() {
  const payload = {
    usuario_id: usuarioId(),
    nombre: cardForm.nombre,
    alias: cardForm.alias,
    dia_cierre: Number(cardForm.cierre),
    dia_vencimiento: Number(cardForm.vence),
    cuenta_pago_id: cardForm.cuentaId ? Number(cardForm.cuentaId) : null,
  }
  const result = cardEditingId.value
    ? await tarjetasStore.actualizar(cardEditingId.value, payload)
    : await tarjetasStore.crear(payload)

  if (result.status === 'ready') {
    resetCardForm()
    showToast('Tarjeta guardada', 'success')
  } else {
    showToast(result.error || 'Error al guardar la tarjeta', 'danger')
  }
}

async function archivarTarjeta(t: Tarjeta) {
  const ok = await confirm({
    title: 'Archivar tarjeta',
    description: `¿Archivar la tarjeta "${t.nombre}"? Dejará de aparecer y no se generarán resúmenes nuevos. El historial de obligaciones y pagos se conserva.`,
    confirmLabel: 'Archivar',
    variant: 'danger',
  })
  if (!ok) return
  const result = await tarjetasStore.archivar(t.id)
  if (result.status !== 'ready') showToast(result.error || 'Error al archivar la tarjeta', 'danger')
}

// --- Consumo + resumen ---
const consumoTarjetaId = ref('')
const consumoForm = reactive({ descripcion: '', monto: '', cuotas: '1/1' })
const resumen = ref<{ tarjeta: Tarjeta; periodo: string; totalPendiente: number; cuotas: CuotaConsumo[] } | null>(null)

watch(tarjetas, (list) => {
  if (!consumoTarjetaId.value && list.length) consumoTarjetaId.value = String(list[0].id)
})

async function mostrarResumen(id: string) {
  if (!id) {
    resumen.value = null
    return
  }
  const result = await tarjetasStore.resumenActual(Number(id), { usuario_id: usuarioId() })
  resumen.value = result.status === 'ready' ? result.data : null
}
watch(consumoTarjetaId, mostrarResumen)

async function submitConsumo() {
  if (!consumoTarjetaId.value) {
    showToast('Elegí una tarjeta. Si no hay ninguna, creala arriba.', 'warning')
    return
  }
  const result = await tarjetasStore.registrarConsumo({
    tarjeta_id: Number(consumoTarjetaId.value),
    descripcion: consumoForm.descripcion,
    monto: Number(consumoForm.monto),
    fecha_compra: new Date().toISOString().slice(0, 19).replace('T', ' '),
    cuotas: consumoForm.cuotas,
  })
  if (result.status === 'ready') {
    consumoForm.descripcion = ''
    consumoForm.monto = ''
    showToast('Consumo registrado', 'success')
    await mostrarResumen(consumoTarjetaId.value)
  } else {
    showToast(result.error || 'Error al registrar consumo', 'danger')
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-money text-xl text-foreground">Cuentas</h1>
        <p class="text-sm text-muted">Gestión de cuentas y tarjetas.</p>
      </div>
      <Button @click="openCreateAccount">Nueva cuenta</Button>
    </header>

    <!-- Tabla de cuentas -->
    <Table>
      <thead>
        <tr>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Cuenta</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Alias</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Moneda</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Usuario</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted">Saldo</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Estado</th>
          <th class="border-b border-border bg-surface-muted px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!cuentasGestion.length">
          <td colspan="7" class="border-b border-border px-3 py-8 text-center text-sm text-subtle">No hay cuentas registradas</td>
        </tr>
        <tr v-for="c in cuentasGestion" :key="c.cuenta_id" class="hover:bg-surface-muted/60">
          <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ c.cuenta }}</td>
          <td class="border-b border-border px-3 py-2"><code class="text-xs text-subtle">{{ c.alias }}</code></td>
          <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ c.moneda }}</td>
          <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ c.usuario }}</td>
          <td
            class="font-money border-b border-border px-3 py-2 text-right text-sm"
            :class="Number(c.saldo_actual) >= 0 ? 'text-haber' : 'text-debe'"
          >
            {{ formatCurrency(c.saldo_actual) }}
          </td>
          <td class="border-b border-border px-3 py-2 text-center">
            <Badge :variant="c.activa === 1 ? 'haber' : 'default'">{{ c.activa === 1 ? 'Activa' : 'Inactiva' }}</Badge>
          </td>
          <td class="border-b border-border px-3 py-2 text-center">
            <Button variant="ghost" size="sm" @click="openEditAccount(c)">Editar</Button>
            <Button variant="ghost" size="sm" @click="toggleAccount(c)">{{ c.activa === 1 ? 'Desactivar' : 'Activar' }}</Button>
          </td>
        </tr>
      </tbody>
    </Table>

    <!-- Tabla de tarjetas -->
    <div class="space-y-3">
      <h2 class="text-sm font-semibold text-foreground">Tarjetas</h2>
      <Table>
        <thead>
          <tr>
            <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Nombre</th>
            <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Alias</th>
            <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Cierre</th>
            <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Vencimiento</th>
            <th class="border-b border-border bg-surface-muted px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Cuenta de pago</th>
            <th class="border-b border-border bg-surface-muted px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!tarjetas.length">
            <td colspan="6" class="border-b border-border px-3 py-8 text-center text-sm text-subtle">No hay tarjetas registradas</td>
          </tr>
          <tr v-for="t in tarjetas" :key="t.id" class="hover:bg-surface-muted/60">
            <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ t.nombre }}</td>
            <td class="border-b border-border px-3 py-2"><code class="text-xs text-subtle">{{ t.alias }}</code></td>
            <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ t.dia_cierre }}</td>
            <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ t.dia_vencimiento }}</td>
            <td class="border-b border-border px-3 py-2 text-sm text-foreground">{{ nombreCuentaPago(t.cuenta_pago_id) }}</td>
            <td class="border-b border-border px-3 py-2 text-center">
              <Button variant="ghost" size="sm" @click="startEditTarjeta(t)">Editar</Button>
              <Button variant="ghost" size="sm" @click="archivarTarjeta(t)">Archivar</Button>
            </td>
          </tr>
        </tbody>
      </Table>

      <!-- Form inline tarjeta -->
      <form class="rounded-lg border border-border bg-surface p-4" @submit.prevent="submitCard">
        <h3 class="mb-3 text-sm font-semibold text-foreground">
          {{ cardEditingId ? 'Editando tarjeta' : 'Nueva tarjeta' }}
        </h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input v-model="cardForm.nombre" placeholder="Nombre" required />
          <Input v-model="cardForm.alias" placeholder="Alias" required />
          <Input v-model="cardForm.cierre" type="number" min="1" max="31" placeholder="Día de cierre" />
          <Input v-model="cardForm.vence" type="number" min="1" max="31" placeholder="Día de vencimiento" />
          <Select v-model="cardForm.cuentaId" :options="cuentaOptionsConVacio" />
        </div>
        <div class="mt-3 flex gap-2">
          <Button type="submit" size="sm">{{ cardEditingId ? 'Guardar cambios' : 'Crear tarjeta' }}</Button>
          <Button v-if="cardEditingId" type="button" variant="outline" size="sm" @click="resetCardForm">Cancelar</Button>
        </div>
      </form>
    </div>

    <!-- Consumos -->
    <div class="rounded-lg border border-border bg-surface p-4">
      <h2 class="mb-3 text-sm font-semibold text-foreground">Registrar consumo</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Select v-model="consumoTarjetaId" :options="tarjetas.map((t) => ({ value: String(t.id), label: t.nombre }))" placeholder="Elegí una tarjeta" />
        <Input v-model="consumoForm.descripcion" placeholder="Descripción" />
        <Input v-model="consumoForm.monto" type="number" step="0.01" min="0" placeholder="Monto" />
        <Input v-model="consumoForm.cuotas" placeholder="Cuotas (ej. 1/3)" />
      </div>
      <div class="mt-3 flex justify-end">
        <Button size="sm" @click="submitConsumo">Registrar</Button>
      </div>

      <div v-if="resumen" class="mt-4 border-t border-border pt-4">
        <h3 class="text-sm font-semibold text-foreground">Resumen {{ resumen.tarjeta.nombre }} — {{ resumen.periodo }}</h3>
        <div class="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs text-muted">Total pendiente</p>
            <p class="font-money text-foreground">{{ formatCurrency(resumen.totalPendiente) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Cuotas pendientes</p>
            <p class="font-money text-foreground">{{ resumen.cuotas.length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog cuenta -->
    <Dialog v-model="accountOpen" :title="accountEditingId ? 'Editar cuenta' : 'Nueva cuenta'">
      <form class="space-y-3" @submit.prevent="submitAccount">
        <div v-if="!accountEditingId">
          <label class="mb-1 block text-xs font-medium text-muted">Usuario</label>
          <Select v-model="accountForm.usuarioId" :options="usuarioOptions" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Nombre</label>
          <Input v-model="accountForm.nombre" required />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">Alias</label>
          <Input v-model="accountForm.alias" required />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Color</label>
            <input v-model="accountForm.color" type="color" class="h-10 w-full rounded-md border border-border bg-surface-muted" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">Moneda</label>
            <Select
              v-model="accountForm.moneda"
              :options="[
                { value: 'ARS', label: 'ARS' },
                { value: 'USD', label: 'USD' },
              ]"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="accountOpen = false">Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Dialog>
  </section>
</template>
