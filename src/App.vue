<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import ToastViewport from '@/components/shared/ToastViewport.vue'
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>

    <ConfirmDialog />
    <ToastViewport />
  </div>
</template>
