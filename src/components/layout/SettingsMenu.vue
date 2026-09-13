<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { computed } from 'vue'

import Select from '@/components/ui/Select.vue'
import Switch from '@/components/ui/Switch.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import { useSessionStore } from '@/stores/session'
import { useThemeStore } from '@/stores/theme'

// Paridad con el dropdown #settings-button de public/index.html: selector de usuario
// + modo nocturno. El toggle "Fondo animado" (particles.js) se elimina sin reemplazo.
const session = useSessionStore()
const theme = useThemeStore()

const usuarioOptions = computed(() =>
  session.usuarios.map((u) => ({ value: String(u.id), label: u.nombre || `Usuario ${u.id}` })),
)

const usuarioValue = computed({
  get: () => (session.usuarioId != null ? String(session.usuarioId) : ''),
  set: (value: string) => session.setUsuario(value),
})

const darkMode = computed({
  get: () => theme.isDark,
  set: (value: boolean) => theme.apply(value ? 'dark' : 'light'),
})
</script>

<template>
  <DropdownMenu align="end">
    <template #trigger>
      <button
        type="button"
        title="Configuración"
        aria-label="Configuración"
        class="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Settings class="h-4 w-4" />
      </button>
    </template>

    <div class="w-64 space-y-3 p-2">
      <div class="space-y-1">
        <span class="text-xs font-medium text-muted">Usuario</span>
        <Select v-model="usuarioValue" :options="usuarioOptions" placeholder="Sin usuarios" />
      </div>

      <div class="flex items-center justify-between rounded-md px-1 py-1.5 text-sm text-foreground">
        <span>Modo nocturno</span>
        <Switch v-model="darkMode" />
      </div>
    </div>
  </DropdownMenu>
</template>
