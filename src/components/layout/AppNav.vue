<script setup lang="ts">
import { BookText, Calculator, Gauge, Landmark, Receipt } from '@lucide/vue'
import { RouterLink } from 'vue-router'

// Paridad con public/js/core/nav.js: mismas 5 pestañas, mismo orden e iconografia
// (bi-speedometer2 -> Gauge, bi-journal-text -> BookText, bi-receipt -> Receipt,
// bi-calculator -> Calculator, bi-bank -> Landmark).
const tabs = [
  { to: '/', label: 'Inicio', icon: Gauge, title: 'Inicio - ¿Cómo estoy?' },
  { to: '/movimientos', label: 'Movimientos', icon: BookText, title: 'Registro del día a día' },
  { to: '/obligaciones', label: 'Obligaciones', icon: Receipt, title: 'Obligaciones' },
  { to: '/simulador', label: 'Simulador', icon: Calculator, title: 'Simulador' },
  { to: '/cuentas', label: 'Cuentas', icon: Landmark, title: 'Cuentas y tarjetas' },
] as const
</script>

<template>
  <nav class="flex items-center gap-1 overflow-x-auto">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :title="tab.title"
      class="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      active-class="!bg-primary/10 !text-foreground ring-1 ring-inset ring-primary/35"
      exact-active-class="!bg-primary/10 !text-foreground ring-1 ring-inset ring-primary/35"
    >
      <component :is="tab.icon" class="h-4 w-4 shrink-0" />
      <span class="hidden sm:inline">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>
