<script setup lang="ts">
import { RouterLink } from 'vue-router'

import AppNav from '@/components/layout/AppNav.vue'
import SettingsMenu from '@/components/layout/SettingsMenu.vue'

// Paridad con .kf-bar de public/index.html: brand a la izquierda (click -> Inicio),
// tabs + settings a la derecha. Sticky, mobile-first, sin fondo animado.
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-border bg-background/95">
    <div class="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
      <RouterLink
        to="/"
        title="Ir a Inicio"
        aria-label="Ir a Inicio"
        class="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <img src="/icons/icon-mark.png" alt="" class="h-6 w-auto" />
        <span class="font-money text-lg tracking-tight text-foreground">KashFlow</span>
      </RouterLink>

      <div class="ml-auto flex items-center gap-1 overflow-x-auto">
        <AppNav />
        <SettingsMenu />
      </div>
    </div>
  </header>
</template>
